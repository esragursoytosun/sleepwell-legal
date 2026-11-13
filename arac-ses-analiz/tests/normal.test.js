import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { idleComparable, idleNormality } from "../js/engine/normal.js";
import { diagnose } from "../js/engine/diagnose.js";
import { loadCases } from "./cases.js";

const normal = JSON.parse(readFileSync(new URL("./normal/rolanti.json", import.meta.url), "utf8")).recordings;
const idle = fuel => ({ conditions: ["rolanti"], fuel });

test("gerçek normal rölanti kayıtlarının büyük çoğunluğu normal aralıkta bulunur", () => {
  const inside = normal.filter(r => idleNormality(r.features, idle(r.fuel)).inside).length;
  assert.ok(inside / normal.length >= 0.85, `${inside}/${normal.length}`);
});

test("kalıcı ton dedektörü normal araçlarda nadiren ton bulur", () => {
  const withTone = normal.filter(r => r.features.toneHz).length;
  assert.ok(withTone / normal.length <= 0.02, `${withTone}/${normal.length}`);
});

test("normal kayıtlarda uygulama 'iyi' güvenle arıza göstermez", () => {
  const confident = normal.filter(r => diagnose({ features: r.features, conditions: ["rolanti"], vehicle: { fuel: r.fuel } }).confidence.level === "good").length;
  assert.ok(confident / normal.length <= 0.03, `${confident}/${normal.length}`);
});

test("gerçek arıza vakası (kalıcı tonlu) normal aralığın dışında kalır", () => {
  const troc = loadCases().find(c => c.id === "2026-11-troc-kayis-tarafi");
  const n = idleNormality(troc.features, idle("benzin"));
  assert.equal(n.inside, false);
  assert.ok(n.deviations[0].includes("ton"));
  assert.notEqual(diagnose({ features: troc.features, conditions: troc.conditions, vehicle: troc.vehicle }).confidence.level, "low");
});

test("karşılaştırma yalnızca araç dururken alınmış motor kayıtlarında yapılır", () => {
  assert.equal(idleComparable(["rolanti"], "benzin"), true);
  assert.equal(idleComparable(["rolanti", "soguk"], "dizel"), true);
  assert.equal(idleComparable(["rolanti", "tumsek"], "benzin"), false);
  assert.equal(idleComparable(["fren"], "benzin"), false);
  assert.equal(idleComparable([], "benzin"), false);
  assert.equal(idleComparable(["rolanti"], "elektrik"), false);
  assert.equal(idleNormality(normal[0].features, { conditions: ["tumsek"], fuel: "benzin" }), null);
});

test("kullanıcı ek bilgi verince 'normal aralıkta' olması güveni tek başına düşürmez", () => {
  const r = normal.find(x => idleNormality(x.features, idle(x.fuel)).inside);
  const plain = diagnose({ features: r.features, conditions: ["rolanti"], vehicle: { fuel: r.fuel } });
  assert.equal(plain.confidence.level, "low");
  assert.ok(plain.confidence.reasons[0].includes("normal rölanti"));
  const coded = diagnose({ features: r.features, conditions: ["rolanti"], vehicle: { fuel: r.fuel }, codes: ["P0301"] });
  assert.ok(!coded.confidence.reasons.some(x => x.includes("normal rölanti seslerinin aralığında")));
});
