import test from "node:test";
import assert from "node:assert/strict";
import { extractFeatures } from "../js/audio/features.js";
import { signatureLevel } from "../js/audio/locate.js";
import { GUIDED_TESTS, compareChange, compareSpeed, guidedApplies } from "../js/engine/compare.js";
import { QUESTIONS } from "../js/data/questions.js";
import { diagnose } from "../js/engine/diagnose.js";
import { featuresOf, SR } from "./helpers.js";

/** Motor gürültüsü içinde sabit bir ton (toneAmp 0 ise yalnızca gürültü). */
function engineWithTone(hz, toneAmp, seconds = 5, seed = 1) {
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  return Float32Array.from({ length: SR * seconds }, (_, i) => 0.2 * rnd() + toneAmp * Math.sin(2 * Math.PI * hz * i / SR));
}
const feat = x => extractFeatures(x, SR);

test("her yönlendirmeli test var olan bir soruyu cevaplar", () => {
  for (const t of GUIDED_TESTS) assert.ok(QUESTIONS.some(q => q.id === t.question), t.id);
});

test("devir: ton gazla inceliyorsa 'evet', aynı kalıyorsa 'hayır'", () => {
  const base = feat(engineWithTone(2100, 0.08));
  assert.equal(compareSpeed(base, feat(engineWithTone(2750, 0.08, 5, 7))).answer, "yes");
  assert.equal(compareSpeed(base, feat(engineWithTone(2105, 0.08, 5, 7))).answer, "no");
});

test("devir: vuruntu hızlanıyorsa 'evet'; ölçülemiyorsa 'bilinmiyor'", () => {
  const base = featuresOf("biyel");
  assert.equal(compareSpeed(base, { ...base, rate: base.rate * 1.6 }).answer, "yes");
  assert.equal(compareSpeed(base, { ...base, rate: base.rate * 1.02 }).answer, "no");
  assert.equal(compareSpeed(feat(engineWithTone(2100, 0)), feat(engineWithTone(2100, 0, 5, 7))).answer, "unknown");
});

test("değişim: ton kaybolunca 'evet', aynı kalınca 'hayır'", () => {
  const baseX = engineWithTone(2100, 0.08), base = feat(baseX);
  const level = x => signatureLevel(x, SR, base);
  assert.equal(level(baseX).kind, "tone");
  assert.equal(compareChange(level(baseX), level(engineWithTone(2100, 0, 5, 7))).answer, "yes");
  assert.equal(compareChange(level(baseX), level(engineWithTone(2100, 0.08, 5, 7))).answer, "no");
  assert.equal(compareChange(level(baseX), null).answer, "unknown");
  // Yalnızca arka plan gürültüsü arttı (ton aynı): ses değişmiş sayılmaz
  const noisier = engineWithTone(2100, 0.08, 5, 7).map((v, i) => v + 0.6 * Math.sin(i * 12.9898) * Math.cos(i * 78.233));
  assert.notEqual(compareChange(level(baseX), level(noisier)).answer, "yes");
  // Yalnızca telefon uzaklaştı (her şey birlikte kısıldı): ses değişmiş sayılmaz
  assert.notEqual(compareChange(level(baseX), level(baseX.map(v => v * 0.3))).answer, "yes");
});

test("yönlendirmeli test yalnızca motor bölmesi seslerinde ve içten yanmalı araçlarda önerilir", () => {
  const motor = diagnose({ features: featuresOf("alternator"), conditions: ["rolanti"] });
  const chassis = diagnose({ features: featuresOf("rotil"), conditions: ["tumsek"] });
  assert.equal(guidedApplies(motor, { fuel: "benzin" }), true);
  assert.equal(guidedApplies(motor, { fuel: "elektrik" }), false);
  assert.equal(guidedApplies(chassis, { fuel: "benzin" }), false);
});

test("ölçülen cevaplar alternatör ile kayışı ayırır", () => {
  const base = { features: featuresOf("alternator"), conditions: ["rolanti"] };
  const withLoad = diagnose({ ...base, answers: { devir: "yes", klima_kapat: "no", elektrik_yuku: "yes" } });
  assert.equal(withLoad.ranked[0].fault.id, "alternator");
  const noLoad = diagnose({ ...base, answers: { devir: "yes", klima_kapat: "no", elektrik_yuku: "no" } });
  const p = r => r.ranked.find(e => e.fault.id === "alternator").prob;
  assert.ok(p(noLoad) < p(withLoad) / 2);
});
