import { fft } from "./fft.js";

/** Ham ölçüm: ton için çevresine göre baskınlık (dB), bant için mutlak enerji (dB). */
function rawLevels(samples, sr, kind, hz, step) {
  const N = 8192, hop = Math.round(sr * step), binHz = sr / N;
  const tone = [Math.floor(hz * 0.985 / binHz), Math.ceil(hz * 1.015 / binHz)];
  const around = [Math.floor(hz * 0.85 / binHz), Math.ceil(hz * 1.15 / binHz)];
  const band = [Math.max(1, Math.floor(hz / 1.6 / binHz)), Math.min(N / 2 - 1, Math.ceil(hz * 1.6 / binHz))];
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const re = new Float64Array(N), im = new Float64Array(N);
  const points = [];
  for (let s = 0; s + N <= samples.length; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = samples[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    let db, abs = null;
    if (kind === "tone") {
      let peak = 0, sum = 0, count = 0;
      for (let k = around[0]; k <= around[1]; k++) {
        const m = Math.hypot(re[k], im[k]);
        if (k >= tone[0] && k <= tone[1]) peak = Math.max(peak, m);
        else { sum += m; count++; }
      }
      db = 20 * Math.log10((peak + 1e-12) / (sum / (count || 1) + 1e-12));
      abs = 20 * Math.log10(peak / N + 1e-12);
    } else {
      let e = 0;
      for (let k = band[0]; k <= band[1]; k++) e += re[k] * re[k] + im[k] * im[k];
      db = 10 * Math.log10(e / (N * N) + 1e-20);
    }
    points.push({ t: (s + N / 2) / sr, db, abs });
  }
  return points;
}

const median = values => [...values].sort((a, b) => a - b)[values.length >> 1];

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
  const kind = features.toneHz ? "tone" : "band";
  const hz = features.toneHz || features.centroid;
  if (!hz || samples.length < 8192 + Math.round(sr * step) * 3) return null;
  const points = rawLevels(samples, sr, kind, hz, step);
  if (kind === "band") {
    const mid = median(points.map(p => p.db));
    for (const p of points) p.db -= mid;
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

/**
 * Bir kayıtta, ana kaydın "imzası" olan sesin tipik düzeyi (dB).
 * Ana kayıtta kalıcı ton varsa o tonun baskınlığı, yoksa sesin karakteristik bandındaki enerji ölçülür.
 * İki kaydı karşılaştırmak için kullanılır (ör. klima açık / kapalı).
 * Ton için iki ölçü döner: `db` çevresine göre baskınlık (telefon mesafesinden etkilenmez, arka plan gürültüsünden
 * etkilenir) ve `abs` tonun kendi düzeyi (gürültüden etkilenmez, mesafeden etkilenir).
 * @returns {null | {kind: "tone"|"band", db: number, abs: number|null}}
 */
export function signatureLevel(samples, sr, baseFeatures) {
  const kind = baseFeatures.toneHz ? "tone" : "band";
  const hz = baseFeatures.toneHz || baseFeatures.centroid;
  if (!hz || samples.length < 8192) return null;
  const points = rawLevels(samples, sr, kind, hz, 0.25);
  if (!points.length) return null;
  return { kind, db: median(points.map(p => p.db)), abs: kind === "tone" ? median(points.map(p => p.abs)) : null };
}

/** Konum çıkarılabilmesi için en güçlü ve en zayıf an arasında gereken en küçük fark (dB). */
export const MIN_LOCATE_RANGE_DB = 8;
