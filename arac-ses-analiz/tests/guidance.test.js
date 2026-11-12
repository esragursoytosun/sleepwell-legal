import test from "node:test";
import assert from "node:assert/strict";
import { FAULTS, FAULT_BY_ID } from "../js/data/faults.js";
import { GUIDANCE } from "../js/data/guidance.js";
import { PARTS } from "../js/data/parts.js";
import { actionPlan, findMechanics, findPrice, warrantyStatus } from "../js/engine/advice.js";
import { checkQuote } from "../js/engine/quote.js";
import { describeSound, explainTop } from "../js/engine/explain.js";
import { diagnose } from "../js/engine/diagnose.js";
import { featuresOf } from "./helpers.js";

test("her arızanın yönlendirmesi var ve parçaları katalogda", () => {
  for (const f of FAULTS) {
    const g = GUIDANCE[f.id];
    assert.ok(g, f.id);
    assert.ok(g.ask.length && g.flags.length && g.parts.length, `${f.id}: boş alan`);
    for (const p of g.parts) assert.ok(PARTS[p], `${f.id}: ${p}`);
  }
});

test("garanti: yeni araç, birkaç yaşında araç, eski araç", () => {
  const now = new Date("2026-11-12");
  assert.equal(warrantyStatus({ year: 2025 }, now).level, "likely");
  assert.equal(warrantyStatus({ year: 2023 }, now).level, "check");
  assert.equal(warrantyStatus({ year: 2015 }, now), null);
  assert.equal(warrantyStatus({ year: 0 }, now), null);
});

test("eylem planı: aciliyet, genel kurallar ve kırmızı bayraklar eklenir", () => {
  const res = diagnose({ features: featuresOf("fren_disk"), conditions: ["fren"] });
  const plan = actionPlan(res.ranked[0], { vehicle: { year: 2015 }, confidence: res.confidence });
  assert.equal(plan.fault.id, "fren_disk");
  assert.equal(plan.urgency.level, 4);
  assert.ok(plan.ask.some(a => a.includes("Onayım olmadan")));
  assert.ok(plan.flags.some(f => f.includes("ön ödeme")));
  assert.equal(plan.hasPrices, false);
});

test("fiyat: en özel eşleşme seçilir, başka model eşleşmez", () => {
  const prices = [
    { part: "bilya", brand: "*", model: "*", partMin: 1, partMax: 2, city: "*", updated: "2026-11-01" },
    { part: "bilya", brand: "Volkswagen", model: "T-Roc", partMin: 3, partMax: 4, city: "*", updated: "2026-11-01" },
    { part: "bilya", brand: "Volkswagen", model: "Polo", partMin: 5, partMax: 6, city: "*", updated: "2026-11-01" }
  ];
  assert.equal(findPrice("bilya", { brand: "Volkswagen", model: "T-Roc" }, prices).partMin, 3);
  assert.equal(findPrice("bilya", { brand: "Fiat", model: "Egea" }, prices).partMin, 1);
  assert.equal(findPrice("kayis", { brand: "Fiat", model: "Egea" }, prices), null);
});

test("ustalar: şehir, uzmanlık ve marka eşleşir; teklife sadık olan önde", () => {
  const ms = [
    { id: "a", city: "İzmir", groups: ["alt_takim"], brands: ["*"], stats: { jobs: 10, keptQuote: 6 } },
    { id: "b", city: "İzmir", groups: ["alt_takim"], brands: ["*"], stats: { jobs: 10, keptQuote: 10 } },
    { id: "c", city: "İzmir", groups: ["fren"], brands: ["*"], stats: { jobs: 10, keptQuote: 10 } },
    { id: "d", city: "Ankara", groups: ["alt_takim"], brands: ["*"], stats: { jobs: 10, keptQuote: 10 } },
    { id: "e", city: "İzmir", groups: ["alt_takim"], brands: ["Toyota"], stats: { jobs: 10, keptQuote: 10 } }
  ];
  const found = findMechanics(FAULT_BY_ID.rotil, { city: "İzmir", brand: "Fiat" }, ms).map(m => m.id);
  assert.deepEqual(found, ["b", "a"]);
  assert.deepEqual(findMechanics(FAULT_BY_ID.rotil, { city: "", brand: "Fiat" }, ms), []);
});

test("teklif kontrolü: ilgili kalemler sorunsuz, ilgisiz pahalı kalem ikinci görüş ister", () => {
  const res = diagnose({ features: featuresOf("kayis"), conditions: ["soguk", "klima"] });
  const ok = checkQuote(["kayis", "bilya"], 0, res.ranked, {});
  assert.equal(ok.verdict, "ok");
  assert.ok(ok.items.every(i => i.status === "related"));

  const bad = checkQuote(["kayis", "turbo", "amortisor"], 0, res.ranked, {});
  assert.equal(bad.verdict, "second_opinion");
  assert.deepEqual(bad.items.filter(i => i.status === "unrelated").map(i => i.id), ["turbo", "amortisor"]);

  const routine = checkQuote(["kayis", "motor_yagi"], 0, res.ranked, {});
  assert.equal(routine.items.find(i => i.id === "motor_yagi").status, "routine");
  assert.equal(routine.verdict, "ok");
});

test("teklif kontrolü: fiyat verisi varsa yüksek toplam uyarılır, yoksa fiyat yorumu yapılmaz", () => {
  const res = diagnose({ features: featuresOf("kayis"), conditions: ["soguk"] });
  const prices = [{ part: "kayis", brand: "*", model: "*", city: "*", partMin: 500, partMax: 800, laborMin: 300, laborMax: 500, updated: "2026-11-01" }];
  const high = checkQuote(["kayis"], 4000, res.ranked, {}, prices);
  assert.deepEqual(high.price, { min: 800, max: 1300, complete: true });
  assert.equal(high.verdict, "ask");
  assert.equal(checkQuote(["kayis"], 4000, res.ranked, {}, []).price, null);
});

test("açıklama: sesin karakteri ve destekleyen belirtiler yazılır", () => {
  assert.ok(describeSound(featuresOf("biyel")).some(s => s.includes("saniyede yaklaşık 13")));
  assert.ok(describeSound(featuresOf("rotil")).some(s => s.includes("düzensiz")));
  const res = diagnose({ features: featuresOf("fren_balata"), conditions: ["fren"], answers: { fren_pedal: "yes" } });
  const why = explainTop(res.ranked[0], { features: featuresOf("fren_balata"), conditions: ["fren"], answers: { fren_pedal: "yes" } });
  assert.ok(why.some(s => s.includes("Fren yaparken")));
  assert.ok(why.some(s => s.includes("fren pedalına")));
});

test("fiyat ve usta kayıtları geçerli kimlikler kullanır", async () => {
  const { PRICES } = await import("../js/data/prices.js");
  const { MECHANICS } = await import("../js/data/mechanics.js");
  const { GROUPS } = await import("../js/data/faults.js");
  for (const p of PRICES) {
    assert.ok(PARTS[p.part], `fiyat: ${p.part}`);
    assert.ok(p.source && p.updated, `fiyat ${p.part}: kaynak ve tarih zorunlu`);
    assert.ok(p.partMin <= p.partMax, `fiyat ${p.part}: aralık`);
  }
  for (const m of MECHANICS) {
    assert.ok(m.id && m.name && m.city && m.whatsapp && m.verifiedAt, `usta ${m.id}: eksik alan`);
    for (const g of m.groups) assert.ok(GROUPS[g], `usta ${m.id}: ${g}`);
  }
});
