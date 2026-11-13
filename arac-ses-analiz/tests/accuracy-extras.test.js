import test from "node:test";
import assert from "node:assert/strict";
import { OBD_RULES, lookupCode, parseCodes } from "../js/data/obd.js";
import { FAULT_BY_ID } from "../js/data/faults.js";
import { diagnose } from "../js/engine/diagnose.js";
import { explainTop } from "../js/engine/explain.js";
import { compareToBaseline, vehicleKey } from "../js/engine/baseline.js";
import { featuresOf } from "./helpers.js";

test("arıza kodları: metinden ayıklanır, aileler var olan arızalara işaret eder", () => {
  assert.deepEqual(parseCodes("p0301, P0420 ve p 0301; abc U0100"), ["P0301", "P0420", "U0100"]);
  assert.deepEqual(parseCodes("kod yok"), []);
  for (const r of OBD_RULES) for (const id of Object.keys(r.effects)) assert.ok(FAULT_BY_ID[id], `${r.from}: ${id}`);
  assert.equal(lookupCode("P0303").label, "Ateşleme teklemesi");
  assert.equal(lookupCode("P0741").label, "Şanzıman");
  assert.equal(lookupCode("U0100"), null);
});

test("arıza kodu olasılığı değiştirir ve gerekçede görünür", () => {
  const F = featuresOf("supap");                     // tıkırtı: tek başına tekleme sanılmaz
  const base = diagnose({ features: F, conditions: ["rolanti"] });
  const coded = diagnose({ features: F, conditions: ["rolanti"], codes: ["P0302"] });
  const p = r => r.ranked.find(e => e.fault.id === "tekleme").prob;
  assert.ok(p(coded) > p(base) * 2);
  const top = coded.ranked.find(e => e.fault.id === "tekleme");
  assert.ok(explainTop(top, { features: F, codes: ["P0302"] }).some(s => s.includes("P0302")));
  // tanınmayan kod sonucu değiştirmez
  assert.equal(diagnose({ features: F, codes: ["U0100"] }).ranked[0].prob, diagnose({ features: F }).ranked[0].prob);
});

test("belirgin imzası olmayan seste güven 'iyi' olmaz ve nedeni yazılır", () => {
  const F = { ...featuresOf("fren_balata"), toneHz: 0, tonal: 0.1, imp: 0.05 };
  const res = diagnose({ features: F, conditions: ["fren"] });
  assert.notEqual(res.confidence.level, "good");
  assert.ok(res.confidence.reasons.some(r => r.includes("normal çalışma sesi")));
});

test("referans karşılaştırması: aynı ses 'aynı', yeni ton ve artan vuruntu 'değişmiş'", () => {
  const healthy = { ...featuresOf("alternator"), toneHz: 0, tonal: 0.1 };
  assert.equal(compareToBaseline(featuresOf("alternator"), featuresOf("alternator")).verdict, "same");
  const tone = compareToBaseline(healthy, featuresOf("alternator"));
  assert.equal(tone.verdict, "changed");
  assert.ok(tone.notes.some(n => n.includes("yeni bir ton")));
  const knock = compareToBaseline({ ...featuresOf("biyel"), imp: 0.2 }, featuresOf("biyel"));
  assert.equal(knock.verdict, "changed");
  assert.ok(knock.notes.some(n => n.includes("artmış")));
});

test("referans anahtarı araca özgüdür", () => {
  assert.equal(vehicleKey({ brand: "Fiat", model: "Egea", year: 2017 }), "Fiat|Egea|2017");
  assert.equal(vehicleKey({ brand: "" }), "");
});
