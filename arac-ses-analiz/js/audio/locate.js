import { fft } from "./fft.js";

/**
 * Sesin kayıt boyunca ne kadar güçlü olduğunu ölçer.
 * Videoda telefon motorun etrafında gezdirildiğinde, sesin en güçlü olduğu an kaynağa en yakın olunan andır.
 *
 * - Kayıtta kalıcı bir ton varsa (`features.toneHz`), o tonun çevresine göre kaç dB baskın olduğu ölçülür.
 *   Böylece motorun genel gürültüsü değil, şikâyet edilen ses izlenir.
 * - Yoksa sesin karakteristik bandındaki (spektral merkez çevresi) enerji ölçülür.
 *
 * @param {Float32Array} samples mono örnekler
 * @param {number} sr örnekleme hızı
 * @param {import("./features.js").Features} features
 * @param {{step?: number}} [opts] ölçüm aralığı (sn)
 * @returns {null | {kind: "tone"|"band", hz: number, points: {t: number, db: number}[], peak: {t: number, db: number}, low: {t: number, db: number}, range: number}}
 *   `range`: en güçlü ve en zayıf an arasındaki fark (dB). Küçükse ses her yerde aynı duyuluyordur ve konum çıkarılamaz.
 */
export function strengthOverTime(samples, sr, features, { step = 0.5 } = {}) {
  const N = 8192;
  const hop = Math.round(sr * step);
  if (samples.length < N + hop * 3) return null;

  const kind = features.toneHz ? "tone" : "band";
  const hz = features.toneHz || features.centroid;
  if (!hz) return null;
  const binHz = sr / N;
  const tone = [Math.floor(hz * 0.985 / binHz), Math.ceil(hz * 1.015 / binHz)];
  const around = [Math.floor(hz * 0.85 / binHz), Math.ceil(hz * 1.15 / binHz)];
  const band = [Math.max(1, Math.floor(hz / 1.6 / binHz)), Math.min(N / 2 - 1, Math.ceil(hz * 1.6 / binHz))];

  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const re = new Float64Array(N), im = new Float64Array(N);
  const points = [];
  for (let s = 0; s + N <= samples.length; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = samples[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    let db;
    if (kind === "tone") {
      let peak = 0, sum = 0, count = 0;
      for (let k = around[0]; k <= around[1]; k++) {
        const m = Math.hypot(re[k], im[k]);
        if (k >= tone[0] && k <= tone[1]) peak = Math.max(peak, m);
        else { sum += m; count++; }
      }
      db = 20 * Math.log10((peak + 1e-12) / (sum / (count || 1) + 1e-12));
    } else {
      let e = 0;
      for (let k = band[0]; k <= band[1]; k++) e += re[k] * re[k] + im[k] * im[k];
      db = 10 * Math.log10(e + 1e-20);
    }
    points.push({ t: (s + N / 2) / sr, db });
  }
  if (kind === "band") {
    const sorted = points.map(p => p.db).sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    for (const p of points) p.db -= median;
  }

  // Tek ölçümdeki sıçramalara takılmamak için komşu ölçümlerle yumuşatılır.
  const smooth = points.map((p, i) => ({
    t: p.t,
    db: (points[Math.max(0, i - 1)].db + 2 * p.db + points[Math.min(points.length - 1, i + 1)].db) / 4
  }));
  const peak = smooth.reduce((a, b) => (b.db > a.db ? b : a));
  const low = smooth.reduce((a, b) => (b.db < a.db ? b : a));
  return { kind, hz, points: smooth, peak, low, range: peak.db - low.db };
}

/** Konum çıkarılabilmesi için en güçlü ve en zayıf an arasında gereken en küçük fark (dB). */
export const MIN_LOCATE_RANGE_DB = 8;
