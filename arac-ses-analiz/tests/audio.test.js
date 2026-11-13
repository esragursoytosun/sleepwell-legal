import test from "node:test";
import assert from "node:assert/strict";
import { extractFeatures } from "../js/audio/features.js";
import { checkQuality } from "../js/audio/quality.js";
import { strengthOverTime } from "../js/audio/locate.js";
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

/** Motor gürültüsü + düzenli tıkırtı içinde zayıf ama sürekli bir ton (gerçek kayıtlardaki gibi). */
function buriedTone(seconds, toneAmp, ramp = false) {
  let seed = 1;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  return Float32Array.from({ length: SR * seconds }, (_, i) => {
    const t = i / SR;
    const tick = (t * 12.5) % 1 < 0.02 ? 0.6 * Math.sin(2 * Math.PI * 900 * t) : 0;
    const amp = ramp ? toneAmp * (t < seconds / 2 ? 0.35 : 1) : toneAmp;
    return 0.25 * rnd() + tick + amp * Math.sin(2 * Math.PI * 2100 * t);
  });
}

test("kalıcı ton: gürültü ve tıkırtı altındaki sabit ton bulunur", () => {
  const F = extractFeatures(buriedTone(8, 0.05), SR);
  assert.ok(Math.abs(F.toneHz - 2100) < 15, `toneHz=${F.toneHz}`);
  assert.ok(F.tonePersistence > 0.8);
  assert.ok(F.tonal > 0.5);
});

test("kalıcı ton: tonsuz gürültüde ton uydurulmaz", () => {
  const F = extractFeatures(buriedTone(8, 0), SR);
  assert.equal(F.toneHz, 0);
});

test("konum: sesin güçlendiği an bulunur", () => {
  const x = buriedTone(10, 0.05, true);
  const F = extractFeatures(x, SR);
  const s = strengthOverTime(x, SR, F);
  assert.equal(s.kind, "tone");
  assert.ok(s.peak.t > 5, `peak.t=${s.peak.t}`);
  assert.ok(s.range > 8, `range=${s.range}`);
});

test("konum: çok kısa kayıtta ölçüm yapılmaz", () => {
  assert.equal(strengthOverTime(sine(1000, 0.2), SR, extractFeatures(sine(1000, 0.2), SR)), null);
});

test("WAV çözücü: 16 bit tek kanal ve iki kanallı dosyalar doğru okunur", async () => {
  const { decodeWav } = await import("../scripts/measure-dataset.mjs");
  const { encodeWav } = await import("../js/audio/wav.js");
  const x = sine(440, 1, 0.5);
  const mono = decodeWav(Buffer.from(await encodeWav(x, SR).arrayBuffer()));
  assert.equal(mono.sr, SR);
  assert.equal(mono.samples.length, x.length);
  assert.ok(Math.abs(mono.samples[1000] - x[1000]) < 1e-3);
  // iki kanal: başlığı elle kur (sol = ton, sağ = sessizlik) → mono ortalaması yarı genlik
  const n = 1000, buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(32000, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(16384, 44 + i * 4);
  const stereo = decodeWav(buf);
  assert.equal(stereo.sr, 8000);
  assert.equal(stereo.samples.length, n);
  assert.ok(Math.abs(stereo.samples[10] - 0.25) < 1e-3);
  assert.throws(() => decodeWav(Buffer.from("bu bir wav değil, düz metin")), /WAV değil/);
});

test("MFCC özeti: sonlu değerler üretir ve farklı tınıları ayırır", async () => {
  const { mfccSummary } = await import("../js/audio/mfcc.js");
  const low = mfccSummary(sine(200, 2), SR), high = mfccSummary(sine(4000, 2), SR);
  assert.equal(low.mean.length, 13);
  assert.ok([...low.mean, ...low.std, ...high.mean].every(Number.isFinite));
  const distance = low.mean.reduce((s, v, i) => s + (v - high.mean[i]) ** 2, 0);
  assert.ok(distance > 10, `mesafe ${distance}`);
  const again = mfccSummary(sine(200, 2), SR);
  assert.deepEqual(again.mean, low.mean);
  assert.ok(mfccSummary(sine(200, 0.01), SR).mean.every(Number.isFinite));   // çok kısa kayıt
});
