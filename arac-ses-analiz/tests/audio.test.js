import test from "node:test";
import assert from "node:assert/strict";
import { extractFeatures } from "../js/audio/features.js";
import { checkQuality } from "../js/audio/quality.js";
import { featuresOf, SR } from "./helpers.js";

const sine = (hz, seconds, amp = 0.5) =>
  Float32Array.from({ length: SR * seconds }, (_, i) => amp * Math.sin(2 * Math.PI * hz * i / SR));

test("saf ton: baskın frekans doğru bulunur, tonluluk yüksek, darbelilik düşük", () => {
  const F = extractFeatures(sine(1000, 4), SR);
  assert.ok(Math.abs(F.peakHz - 1000) < 15, `peakHz=${F.peakHz}`);
  assert.ok(F.tonal > 0.9);
  assert.ok(F.imp < 0.1);
  assert.equal(F.dur, 4);
});

test("vuruntulu ses: darbelilik yüksek ve ritim hızı doğru", () => {
  const F = featuresOf("biyel"); // saniyede 13 vuruş
  assert.ok(F.imp > 0.8, `imp=${F.imp}`);
  assert.ok(Math.abs(F.rate - 13) < 1.5, `rate=${F.rate}`);
});

test("düzensiz takırtı: ritim bulunmaz", () => {
  assert.equal(featuresOf("rotil").rate, 0);
});

test("kalite: iyi kayıt sorunsuz", () => {
  assert.equal(checkQuality(sine(500, 6, 0.3), SR).level, "ok");
});

test("kalite: sessiz, kısa ve patlayan kayıtlar yakalanır", () => {
  assert.equal(checkQuality(new Float32Array(SR * 5), SR).level, "bad");
  assert.equal(checkQuality(sine(500, 0.5), SR).level, "bad");
  assert.deepEqual(checkQuality(sine(500, 2, 0.3), SR).issues.map(i => i.code), ["short"]);
  assert.deepEqual(checkQuality(sine(500, 6, 0.002), SR).issues.map(i => i.code), ["quiet"]);
  const loud = sine(500, 6, 3).map(v => Math.max(-1, Math.min(1, v)));
  assert.ok(checkQuality(loud, SR).issues.some(i => i.code === "clipping"));
});
