import test from "node:test";
import assert from "node:assert/strict";
import { diagnose } from "../js/engine/diagnose.js";
import { loadCases } from "./cases.js";

for (const c of loadCases()) {
  test(`gerçek vaka ${c.id}: beklenen bölge ve arızalar`, () => {
    const res = diagnose({ features: c.features, conditions: c.conditions, vehicle: c.vehicle, answers: c.answers });
    assert.equal(res.groups[0].id, c.expect.group, `bölge: ${res.groups[0].id}`);
    if (c.expect.anyOfTop3) {
      const top3 = res.ranked.slice(0, 3).map(r => r.fault.id);
      assert.ok(c.expect.anyOfTop3.some(id => top3.includes(id)), `ilk 3: ${top3.join(", ")}`);
    }
  });
}
