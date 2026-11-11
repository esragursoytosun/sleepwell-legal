import test from "node:test";
import assert from "node:assert/strict";
import { FAULTS, FAULT_BY_ID } from "../js/data/faults.js";
import { QUESTIONS } from "../js/data/questions.js";
import { diagnose, nextQuestions, vehiclePrior } from "../js/engine/diagnose.js";
import { featuresOf, strongConditions } from "./helpers.js";

const rankOf = (res, id) => res.ranked.findIndex(r => r.fault.id === id) + 1;

test("olasılıklar 1'e toplanır", () => {
  const res = diagnose({ features: featuresOf("kayis") });
  assert.ok(Math.abs(res.ranked.reduce((s, r) => s + r.prob, 0) - 1) < 1e-9);
  assert.ok(Math.abs(res.groups.reduce((s, g) => s + g.prob, 0) - 1) < 1e-9);
});

test("örnek ses + belirgin durumlar: doğru bölge ilk sırada", () => {
  for (const f of FAULTS) {
    const res = diagnose({ features: featuresOf(f.id), conditions: strongConditions(f) });
    assert.equal(res.groups[0].id, f.group, `${f.id}: bölge ${res.groups[0].id} çıktı`);
  }
});

test("örnek ses + belirgin durumlar: arıza ilk 3'te", () => {
  for (const f of FAULTS) {
    const res = diagnose({ features: featuresOf(f.id), conditions: strongConditions(f) });
    assert.ok(rankOf(res, f.id) <= 3, `${f.id}: sıra ${rankOf(res, f.id)}`);
  }
});

test("takip soruları doğru cevaplanınca arıza ilk sıraya çıkar", () => {
  for (const f of FAULTS) {
    const answers = {};
    for (const q of QUESTIONS) {
      const yes = q.yes[f.id] ?? q.yes["@" + f.group] ?? 1;
      const no = q.no[f.id] ?? q.no["@" + f.group] ?? 1;
      if (yes > 1.2 && yes > no) answers[q.id] = "yes";
      else if (no > 1.2 || yes < 0.8) answers[q.id] = "no";
    }
    const res = diagnose({ features: featuresOf(f.id), conditions: strongConditions(f), answers });
    assert.equal(res.ranked[0].fault.id, f.id, `${f.id}: ilk sırada ${res.ranked[0].fault.id}`);
  }
});

test("'bilmiyorum' cevabı sonucu değiştirmez", () => {
  const base = diagnose({ features: featuresOf("rotil"), conditions: ["tumsek"] });
  const same = diagnose({ features: featuresOf("rotil"), conditions: ["tumsek"], answers: { devir: "unknown" } });
  assert.equal(base.ranked[0].prob, same.ranked[0].prob);
});

test("elektrikli araçta motor arızaları elenir", () => {
  const probOf = fuel => diagnose({ features: featuresOf("biyel"), vehicle: { fuel } })
    .ranked.find(r => r.fault.id === "biyel").prob;
  assert.ok(probOf("elektrik") < probOf("benzin") / 5);
  const ev = diagnose({ features: featuresOf("biyel"), vehicle: { fuel: "elektrik" } });
  assert.ok(!ev.ranked[0].fault.ice, "ilk sırada motor arızası olmamalı");
});

test("modele özgü bilinen sorun olasılığı artırır ve not ekler", () => {
  const zincir = FAULT_BY_ID.zincir;
  const hit = vehiclePrior(zincir, { brand: "Peugeot", model: "208", fuel: "benzin", year: 2018, km: 0 });
  assert.ok(hit.x > 1.5);
  assert.equal(hit.notes.length, 1);
  const miss = vehiclePrior(zincir, { brand: "Peugeot", model: "208", fuel: "dizel", year: 2018, km: 0 });
  assert.equal(miss.x, 1);
});

test("alt takım belirsizken sorular alt takım parçalarını ayırmaya yöneliktir", () => {
  const res = diagnose({ features: featuresOf("rotil"), conditions: ["tumsek"] });
  const qs = nextQuestions(res.ranked, {}, 3);
  assert.equal(qs.length, 3);
  const touchesChassis = q => Object.keys({ ...q.yes, ...q.no }).some(k => k === "@alt_takim" || FAULT_BY_ID[k]?.group === "alt_takim");
  assert.ok(qs.every(touchesChassis));
  assert.ok(!nextQuestions(res.ranked, { [qs[0].id]: "no" }, 3).some(q => q.id === qs[0].id));
});

test("kötü kayıt kalitesi güveni düşürür", () => {
  const res = diagnose({ features: featuresOf("fren_balata"), conditions: ["fren"], quality: "bad" });
  assert.equal(res.confidence.level, "low");
});
