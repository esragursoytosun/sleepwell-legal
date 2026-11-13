import test from "node:test";
import assert from "node:assert/strict";
import { FAULTS, GROUPS, LOCATIONS, URGENCY } from "../js/data/faults.js";
import { QUESTIONS } from "../js/data/questions.js";
import { KNOWN_ISSUES } from "../js/data/known-issues.js";
import { CONDITIONS } from "../js/data/conditions.js";
import { BRANDS } from "../js/data/vehicles.js";
import { SYNTH } from "../js/audio/synth.js";

const ids = new Set(FAULTS.map(f => f.id));
const conditionIds = new Set(CONDITIONS.map(c => c[0]));

test("arıza kimlikleri benzersizdir", () => {
  assert.equal(ids.size, FAULTS.length);
});

test("her arızanın grubu, konumu, aciliyeti, örnek sesi ve geçerli durumları vardır", () => {
  for (const f of FAULTS) {
    assert.ok(GROUPS[f.group], `${f.id}: grup`);
    assert.ok(LOCATIONS[f.loc], `${f.id}: konum`);
    assert.ok(URGENCY[f.urg], `${f.id}: aciliyet`);
    assert.equal(typeof SYNTH[f.id], "function", `${f.id}: örnek ses`);
    for (const c of Object.keys(f.c)) assert.ok(conditionIds.has(c), `${f.id}: durum ${c}`);
    assert.ok(f.p.f[0] < f.p.f[1], `${f.id}: frekans aralığı`);
  }
});

test("soruların etkileri var olan arıza ya da gruplara işaret eder", () => {
  for (const q of QUESTIONS) {
    for (const side of ["yes", "no"]) {
      for (const key of Object.keys(q[side])) {
        const ok = key.startsWith("@") ? GROUPS[key.slice(1)] : ids.has(key);
        assert.ok(ok, `${q.id}.${side}: ${key}`);
      }
    }
  }
});

test("bilinen sorunlar var olan arıza, marka ve modellere işaret eder", () => {
  for (const k of KNOWN_ISSUES) {
    assert.ok(ids.has(k.fault), k.fault);
    for (const [brand, models] of Object.entries(k.match)) {
      assert.ok(BRANDS[brand], brand);
      for (const m of models) assert.ok(BRANDS[brand].includes(m), `${brand} ${m}`);
    }
  }
});

test("her konumun üç boyutlu sahnede karşılığı vardır", async () => {
  const src = await (await import("node:fs/promises")).readFile(new URL("../js/ui/car3d.js", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("const LOC3D = {"), src.indexOf("// ---------------------------------------------------------------- yardımcılar"));
  for (const key of Object.keys(LOCATIONS)) assert.ok(new RegExp(`\\b${key}: \\{`).test(block), key);
});

test("gövde tipi: bilinen modeller doğru, bilinmeyenler hatchback", async () => {
  const { bodyTypeOf, BODY_LABEL } = await import("../js/data/vehicles.js");
  assert.equal(bodyTypeOf("Volkswagen", "T-Roc"), "suv");
  assert.equal(bodyTypeOf("Fiat", "Egea"), "sedan");
  assert.equal(bodyTypeOf("Ford", "Courier"), "van");
  assert.equal(bodyTypeOf("Renault", "Clio"), "hatchback");
  assert.equal(bodyTypeOf("", ""), "hatchback");
  for (const type of ["hatchback", "sedan", "suv", "van"]) assert.ok(BODY_LABEL[type]);
});

test("her modelin ölçüsü var ve makul aralıkta", async () => {
  const { dimensionsOf } = await import("../js/data/dimensions.js");
  for (const [brand, models] of Object.entries(BRANDS)) {
    if (brand === "Diğer") continue;
    for (const model of models) {
      const d = dimensionsOf(brand, model);
      assert.ok(d, `${brand} ${model}`);
      assert.ok(d.length > 3.4 && d.length < 5.1, `${brand} ${model} uzunluk`);
      assert.ok(d.height > 1.35 && d.height < 1.95, `${brand} ${model} yükseklik`);
      assert.ok(d.wheelbase > 2.3 && d.wheelbase < 3.0 && d.wheelbase < d.length, `${brand} ${model} dingil`);
    }
  }
  assert.equal(dimensionsOf("Diğer", "Diğer"), null);
});
