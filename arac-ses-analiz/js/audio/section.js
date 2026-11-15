/**
 * Kaydın "düzenli" bölümünü bulur: ses düzeyinin en uzun süre benzer kaldığı kesintisiz parça.
 * Araç dururken alınan motor kayıtlarında, baştaki konuşma, sondaki kapı sesi, gaz verme ya da
 * videoya sonradan eklenmiş müzik/jenerik gibi kısımlar ölçümü bozar; bunlar dışarıda bırakılır.
 * Yolda alınan kayıtlarda kullanılmaz: orada aranan ses zaten ara ara gelen vuruntulardır.
 * Saf modüldür; testlerde doğrudan kullanılır.
 */
const FRAME_SECONDS = 0.25;
/** Düzenli bölümde ses düzeyi, bölümün tipik düzeyinden en çok bu kadar sapabilir. */
const TOLERANCE_DB = 8;
/** Bundan kısa bir düzenli bölüm bulunursa kaydın tamamı kullanılır. */
const MIN_SECONDS = 3;
/** Düzeyi en yüksek andan bu kadar düşük kareler sessizlik sayılır. */
const SILENCE_BELOW_PEAK_DB = 45;

/**
 * @returns {{from: number, to: number, trimmed: boolean}} saniye cinsinden bölüm; `trimmed` kayıt kırpıldıysa true
 */
export function steadySection(samples, sr) {
  const total = samples.length / sr, whole = { from: 0, to: total, trimmed: false };
  const n = Math.round(FRAME_SECONDS * sr), count = Math.floor(samples.length / n);
  if (count * FRAME_SECONDS < MIN_SECONDS * 1.5) return whole;
  const db = new Float64Array(count);
  for (let f = 0; f < count; f++) {
    let s = 0;
    for (let i = f * n, e = i + n; i < e; i++) s += samples[i] * samples[i];
    db[f] = 10 * Math.log10(s / n + 1e-12);
  }
  const peak = Math.max(...db), audible = [...db].filter(v => v > peak - SILENCE_BELOW_PEAK_DB).sort((a, b) => a - b);
  if (!audible.length) return whole;
  const level = audible[audible.length >> 1];
  // Tipik düzeye yakın karelerin en uzun kesintisiz dizisi (tek karelik sapmalar hoş görülür).
  let best = [0, 0], start = -1, misses = 0;
  for (let f = 0; f <= count; f++) {
    const ok = f < count && Math.abs(db[f] - level) <= TOLERANCE_DB;
    if (ok) { if (start < 0) start = f; misses = 0; continue; }
    if (start >= 0 && f < count && ++misses <= 1) continue;
    if (start >= 0) {
      const end = f - misses + (f === count ? misses : 0);
      if (end - start > best[1] - best[0]) best = [start, end];
    }
    start = -1; misses = 0;
  }
  const from = best[0] * FRAME_SECONDS, to = best[1] * FRAME_SECONDS;
  if (to - from < MIN_SECONDS || total - (to - from) < 0.5) return whole;
  return { from, to, trimmed: true };
}

/** Bölümün örneklerini verir (kopyalamaz). */
export function sliceSection(samples, sr, section) {
  return samples.subarray(Math.round(section.from * sr), Math.round(section.to * sr));
}
