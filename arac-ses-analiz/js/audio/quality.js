/**
 * Kaydın analiz için yeterli olup olmadığını denetler.
 * @param {Float32Array} x mono örnekler
 * @param {number} sr örnekleme hızı
 * @param {{minSeconds?: number}} [opts]
 * @returns {{level: "ok"|"warn"|"bad", issues: {code: string, text: string}[]}}
 *   "bad": analiz yapılmamalı, kayıt yenilenmeli · "warn": analiz yapılır ama güven düşer
 */
export function checkQuality(x, sr, { minSeconds = 3 } = {}) {
  const issues = [];
  const dur = x.length / sr;
  let sum = 0, clipped = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    sum += a * a;
    if (a >= 0.985) clipped++;
  }
  const rms = Math.sqrt(sum / (x.length || 1));
  const clipRatio = clipped / (x.length || 1);

  let level = "ok";
  const add = (lvl, code, text) => {
    issues.push({ code, text });
    if (lvl === "bad" || level === "ok") level = lvl;
  };

  if (dur < 1) add("bad", "too_short", "Kayıt çok kısa. En az 5 saniye kaydedin.");
  else if (dur < minSeconds) add("warn", "short", `Kayıt kısa (${dur.toFixed(1)} sn). 5–10 saniyelik kayıt daha isabetli sonuç verir.`);

  if (rms < 0.0008) add("bad", "silent", "Kayıtta neredeyse hiç ses yok. Mikrofon iznini ve telefonun konumunu kontrol edin.");
  else if (rms < 0.004) add("warn", "quiet", "Kayıt oldukça sessiz. Telefonu sesin geldiği yere yaklaştırın.");

  if (clipRatio > 0.02) add("warn", "clipping", "Ses çok yüksek kaydedilmiş (patlama var). Telefonu biraz uzaklaştırın.");

  return { level, issues };
}
