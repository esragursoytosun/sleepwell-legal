import { fft } from "./fft.js";

const clamp01 = v => Math.max(0, Math.min(1, v));

/** Kalıcı ton aranan aralık (Hz). Altı, motorun kendi ateşleme harmoniklerine karışır. */
const TONE_MIN_HZ = 500, TONE_MAX_HZ = 9000;
/** Bir frekansın o karede "ton" sayılması için çevresinden kaç kat güçlü olması gerekir (~12 dB). */
const TONE_PROMINENCE = 4;
/** Kalıcı ton sayılması için kayıttaki karelerin en az ne kadarında görünmesi gerekir. */
const TONE_MIN_PERSISTENCE = 0.55;

/**
 * @typedef {Object} Features
 * @property {number} dur          Analiz edilen süre (sn)
 * @property {number} rms          Ortalama ses düzeyi
 * @property {number} peakHz       En belirgin tonun frekansı (Hz)
 * @property {number} tonal        Tonluluk 0..1 (ıslık/uğultu → 1, gürültü/takırtı → 0)
 * @property {number} toneHz       Kayıt boyunca süren sabit ton varsa frekansı (Hz), yoksa 0
 * @property {number} tonePersistence Bu tonun görüldüğü karelerin oranı 0..1
 * @property {number} centroid     Güç ağırlıklı spektral merkez (Hz)
 * @property {number} imp          Darbelilik 0..1 (vuruntu/tıkırtı → 1)
 * @property {number} periodicity  Ritmin düzenliliği 0..1
 * @property {number} rate         Tekrar hızı (1/sn); ritim yoksa 0
 * @property {number[]} bands      Enerji payları: [bas <250 Hz, orta, tiz >2 kHz]
 */

/**
 * Ses örneklerinden teşhiste kullanılan özellikleri çıkarır.
 * @param {Float32Array} input mono örnekler (-1..1)
 * @param {number} sr örnekleme hızı (Hz)
 * @param {number} [maxSeconds=12]
 * @returns {Features}
 */
export function extractFeatures(input, sr, maxSeconds = 12) {
  const n = Math.min(input.length, Math.floor(sr * maxSeconds));
  let mean = 0;
  for (let i = 0; i < n; i++) mean += input[i];
  mean /= n || 1;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = input[i] - mean;

  // --- Spektrum: her karede en belirgin ton (kayan tonları da yakalar) + ortalama güç spektrumu
  const N = 4096, hop = 2048, half = N / 2;
  const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(half);
  const power = new Float64Array(half), cum = new Float64Array(half + 1);
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const binHz = sr / N, kLo = Math.ceil(60 / binHz), kHi = Math.min(Math.floor(12000 / binHz), half - 32);
  const peaks = [];
  // Kalıcı ton: her karede belirgin tepe olan frekanslar sayılır (gerçek kayıtta gürültü altında kalan sabit ıslık/vınlama).
  const tLo = Math.ceil(TONE_MIN_HZ / binHz), tHi = Math.min(Math.floor(TONE_MAX_HZ / binHz), half - 32);
  const toneHits = new Uint16Array(half);
  let frames = 0;
  for (let s = 0; ; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = (x[s + i] || 0) * win[i]; im[i] = 0; }
    fft(re, im);
    let frameMax = 1e-12;
    for (let k = 0; k < half; k++) {
      mag[k] = Math.hypot(re[k], im[k]);
      power[k] += mag[k] * mag[k];
      cum[k + 1] = cum[k] + mag[k];
      if (k >= kLo && k <= kHi) frameMax = Math.max(frameMax, mag[k]);
    }
    let best = null;
    for (let k = kLo; k <= kHi; k++) {
      if (mag[k] < mag[k - 1] || mag[k] < mag[k + 1]) continue;
      const a = Math.max(1, k - 30), b = Math.min(half - 1, k + 30);
      const local = (cum[b + 1] - cum[a] - (cum[k + 3] - cum[k - 2])) / (b - a + 1 - 5);
      const prom = mag[k] / (local + 1e-12);
      const score = Math.log(prom) + 0.5 * Math.log(mag[k] / frameMax);
      if (!best || score > best.score) best = { score, k, prom };
    }
    if (best) peaks.push(best);
    for (let k = tLo; k <= tHi; k++) {
      if (mag[k] < mag[k - 1] || mag[k] < mag[k + 1]) continue;
      const a = k - 30, b = k + 30;
      const local = (cum[b + 1] - cum[a] - (cum[k + 3] - cum[k - 2])) / (b - a + 1 - 5);
      if (mag[k] >= TONE_PROMINENCE * local) toneHits[k]++;
    }
    frames++;
    if (s + hop + N > n) break;
  }
  const proms = peaks.map(p => p.prom).sort((a, b) => a - b);
  const medProm = proms[proms.length >> 1] || 1;
  const tonalFreqs = peaks.filter(p => p.prom >= medProm).map(p => p.k * binHz).sort((a, b) => a - b);
  let peakHz = tonalFreqs[tonalFreqs.length >> 1] || 0;
  let tonal = clamp01((Math.log10(medProm) - 0.7) / 0.9);

  // Kalıcı tonu seç: komşu kutularla (frekans kayması) birlikte en çok karede görünen frekans
  let toneK = 0, toneCount = 0;
  for (let k = tLo; k <= tHi; k++) {
    const c = Math.max(toneHits[k - 1], toneHits[k], toneHits[k + 1]);
    if (c > toneCount || (c === toneCount && c > 0 && power[k] > power[toneK])) { toneCount = c; toneK = k; }
  }
  let peakK = toneK;
  for (let k = toneK - 1; k <= toneK + 1; k++) if (toneHits[k] > toneHits[peakK]) peakK = k;
  const tonePersistence = frames ? toneCount / frames : 0;
  const toneHz = tonePersistence >= TONE_MIN_PERSISTENCE ? peakK * binHz : 0;
  if (toneHz) {
    peakHz = toneHz;
    tonal = Math.max(tonal, clamp01((tonePersistence - 0.35) / 0.45));
  }

  let num = 0, den = 0, eLow = 0, eMid = 0, eHigh = 0;
  for (let k = kLo; k <= kHi; k++) {
    const f = k * binHz, p = power[k];
    num += f * p; den += p;
    if (f < 250) eLow += p; else if (f < 2000) eMid += p; else eHigh += p;
  }
  const eTot = eLow + eMid + eHigh || 1;

  // --- 10 ms'lik RMS zarfı: darbelilik ve ritim
  const w = Math.max(1, Math.round(sr * 0.01)), envRate = sr / w, env = [];
  for (let s = 0; s + w <= n; s += w) {
    let e = 0;
    for (let i = s; i < s + w; i++) e += x[i] * x[i];
    env.push(Math.sqrt(e / w));
  }
  const sorted = [...env].sort((a, b) => a - b);
  const pct = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] || 0;
  const imp = clamp01((pct(.95) / (pct(.5) + 1e-9) - 1.3) / 3);

  const smooth = env.map((v, i) => 0.25 * (env[i - 1] ?? v) + 0.5 * v + 0.25 * (env[i + 1] ?? v));
  const envMean = smooth.reduce((a, b) => a + b, 0) / (smooth.length || 1);
  const e0 = smooth.map(v => v - envMean);
  let r0 = 0;
  for (const v of e0) r0 += v * v;
  const minLag = 3, maxLag = Math.min(Math.floor(envRate * 1.25), Math.floor(env.length / 2));
  const acf = [];
  let rMax = 0;
  for (let L = minLag; L <= maxLag; L++) {
    let r = 0;
    for (let i = 0; i + L < e0.length; i++) r += e0[i] * e0[i + L];
    r = r0 ? r / r0 * (e0.length / (e0.length - L)) : 0;
    acf[L] = r; rMax = Math.max(rMax, r);
  }
  let lag = 0;
  for (let L = minLag + 1; L < maxLag; L++) {
    if (acf[L] >= acf[L - 1] && acf[L] >= acf[L + 1] && acf[L] >= 0.7 * rMax) { lag = L; break; }
  }

  let rms = 0;
  for (let i = 0; i < n; i++) rms += x[i] * x[i];
  rms = Math.sqrt(rms / (n || 1));

  return {
    dur: n / sr, rms, peakHz, tonal, toneHz, tonePersistence,
    centroid: den ? num / den : 0,
    imp,
    periodicity: lag ? clamp01(rMax) : 0,
    rate: lag ? envRate / lag : 0,
    bands: [eLow / eTot, eMid / eTot, eHigh / eTot]
  };
}
