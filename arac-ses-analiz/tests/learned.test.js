import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnose } from "../js/engine/diagnose.js";
import { learnedOpinion, windowFeatures, featureVector, LEARNED_MAX_BOOST } from "../js/engine/learned.js";
import { LEARNED } from "../js/data/learned-models.js";

const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url)));
const trocCase = read("./cases/2026-11-troc-kayis-tarafi.json");
const troc = trocCase.windows;
const normals = read("./normal/rolanti.json").recordings;

test("model katsayıları özellik vektörüyle aynı boyutta", () => {
  const d = featureVector(troc[0]).length;
  for (const m of [LEARNED.idle, LEARNED.brake]) {
    assert.equal(m.mu.length, d); assert.equal(m.sd.length, d);
    for (const w of m.W) assert.equal(w.length, d + 1);
  }
});

test("gerçek vaka (T-Roc, kayış tarafı): model rölantide kayış tarafını destekler", () => {
  const op = learnedOpinion(troc, { conditions: ["rolanti"], fuel: "benzin" });
  assert.ok(op && op.kind === "yardimci" && op.p >= 0.7);
  assert.ok(op.boost > 1 && op.boost <= LEARNED_MAX_BOOST);
  const base = diagnose({ features: trocCase.features, conditions: trocCase.conditions, vehicle: trocCase.vehicle });
  const withModel = diagnose({ features: trocCase.features, conditions: trocCase.conditions, vehicle: trocCase.vehicle, windows: troc });
  const g = r => r.groups.find(x => x.id === "yardimci").prob;
  assert.ok(g(withModel) >= g(base));
  assert.equal(withModel.groups[0].id, "yardimci");
});

test("model yalnızca eğitildiği durumda görüş bildirir", () => {
  assert.equal(learnedOpinion(troc, { conditions: ["hiz"] }), null);
  assert.equal(learnedOpinion(troc, { conditions: ["rolanti", "tumsek"] }), null);
  assert.equal(learnedOpinion(troc, { conditions: ["rolanti"], fuel: "elektrik" }), null);
  assert.equal(learnedOpinion(null, { conditions: ["rolanti"] }), null);
  assert.equal(learnedOpinion([], { conditions: ["rolanti"] }), null);
  assert.equal(diagnose({ features: trocCase.features }).learned, null);
});

test("normal rölanti kayıtlarında yanlış alarm düşük kalır", () => {
  // Kayıtların tümü üzerinde ölçülen özelliklerle (tek pencere gibi) kaba sınama: %10'un altında olmalı.
  const alarms = normals.filter(r => learnedOpinion([r.features], { conditions: ["rolanti"], fuel: r.fuel })).length;
  assert.ok(alarms / normals.length < 0.1, `${alarms}/${normals.length}`);
});

test("pencereleme: 1,5 sn'lik parçalar, en çok 12", () => {
  const sr = 22050, x = new Float32Array(sr * 4);
  for (let i = 0; i < x.length; i++) x[i] = Math.sin(i * 0.2) * 0.3;
  assert.equal(windowFeatures(x, sr).length, 2);
  assert.equal(windowFeatures(new Float32Array(sr * 40), sr).length, 12);
  assert.equal(windowFeatures(new Float32Array(sr), sr).length, 0);
});
