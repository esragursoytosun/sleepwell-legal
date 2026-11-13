import { fft } from "./fft.js";

const hzToMel = hz => 2595 * Math.log10(1 + hz / 700);
const melToHz = mel => 700 * (10 ** (mel / 2595) - 1);

/**
 * Sesin tını özeti: mel ölçekli kepstral katsayıların (MFCC) kayıt boyunca ortalaması ve değişkenliği.
 * Elle seçilmiş özelliklerden (ton, darbe, ritim) daha zengindir; eğitilmiş modeller için kullanılır.
 * Teşhis kurallarında kullanılmaz.
 *
 * @param {Float32Array} samples mono örnekler
 * @param {number} sr örnekleme hızı
 * @param {{coefficients?: number, filters?: number, maxHz?: number}} [opts]
 * @returns {{mean: number[], std: number[]}} her katsayı için ortalama ve standart sapma
 */
export function mfccSummary(samples, sr, { coefficients = 13, filters = 26, maxHz = 8000 } = {}) {
  const N = 2048, hop = 1024, half = N / 2, top = Math.min(maxHz, sr / 2);
  // üçgen mel süzgeçleri
  const edges = Array.from({ length: filters + 2 }, (_, i) => melToHz(hzToMel(40) + (hzToMel(top) - hzToMel(40)) * i / (filters + 1)) / (sr / N));
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const re = new Float64Array(N), im = new Float64Array(N);
  const sum = new Float64Array(coefficients), sumSq = new Float64Array(coefficients);
  let frames = 0;
  for (let s = 0; s + N <= samples.length || s === 0; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = (samples[s + i] || 0) * win[i]; im[i] = 0; }
    fft(re, im);
    const logE = new Float64Array(filters);
    for (let m = 0; m < filters; m++) {
      const lo = edges[m], mid = edges[m + 1], hi = edges[m + 2];
      let e = 0;
      for (let k = Math.ceil(lo); k <= Math.min(half - 1, Math.floor(hi)); k++) {
        const w = k <= mid ? (k - lo) / (mid - lo || 1) : (hi - k) / (hi - mid || 1);
        e += w * (re[k] * re[k] + im[k] * im[k]);
      }
      logE[m] = Math.log(e + 1e-10);
    }
    for (let c = 0; c < coefficients; c++) {                        // DCT-II
      let v = 0;
      for (let m = 0; m < filters; m++) v += logE[m] * Math.cos(Math.PI * c * (m + 0.5) / filters);
      sum[c] += v; sumSq[c] += v * v;
    }
    frames++;
    if (s + hop + N > samples.length) break;
  }
  const mean = Array.from(sum, v => v / frames);
  return { mean, std: mean.map((m, c) => Math.sqrt(Math.max(0, sumSq[c] / frames - m * m))) };
}
