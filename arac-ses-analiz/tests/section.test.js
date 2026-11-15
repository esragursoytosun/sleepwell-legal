import test from "node:test";
import assert from "node:assert/strict";
import { steadySection, sliceSection } from "../js/audio/section.js";

const sr = 8000;
function build(parts) {
  const out = new Float32Array(parts.reduce((n, [sec]) => n + Math.round(sec * sr), 0));
  let i = 0, seed = 1;
  for (const [sec, amp] of parts) for (let e = i + Math.round(sec * sr); i < e; i++) { seed = (seed * 16807) % 2147483647; out[i] = amp * (seed / 1073741823.5 - 1); }
  return out;
}

test("düzenli kayıt kırpılmaz", () => {
  const s = steadySection(build([[10, 0.05]]), sr);
  assert.deepEqual(s, { from: 0, to: 10, trimmed: false });
});

test("baştaki ses, aradaki sessizlik ve sondaki yüksek jenerik dışarıda kalır", () => {
  const x = build([[1, 0.2], [1.5, 0.001], [8, 0.05], [1.5, 0.8], [3, 0]]);
  const s = steadySection(x, sr);
  assert.ok(s.trimmed);
  assert.ok(Math.abs(s.from - 2.5) <= 0.5 && Math.abs(s.to - 10.5) <= 0.5, JSON.stringify(s));
  assert.equal(sliceSection(x, sr, s).length, Math.round((s.to - s.from) * sr));
});

test("kısa kayıt ve tümü sessiz kayıt olduğu gibi kullanılır", () => {
  assert.equal(steadySection(build([[3, 0.05]]), sr).trimmed, false);
  assert.equal(steadySection(new Float32Array(sr * 10), sr).trimmed, false);
});

test("düzenli bölüm çok kısaysa kaydın tamamı kullanılır", () => {
  assert.equal(steadySection(build([[2, 0.05], [2, 0.9], [2, 0.002], [2, 0.3]]), sr).trimmed, false);
});
