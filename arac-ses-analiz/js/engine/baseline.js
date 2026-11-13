/**
 * Aynı aracın daha önce (sağlamken) alınmış kaydıyla karşılaştırma.
 * "Bu ses hep var mıydı, yoksa yeni mi?" sorusunu ölçerek cevaplar. Saf modüldür.
 */
const hzText = hz => (Math.round(hz / 10) * 10).toLocaleString("tr-TR") + " Hz";

/** Referans kayıtların saklandığı anahtar: aynı araç = aynı marka, model ve yıl. */
export const vehicleKey = v => (v.brand ? `${v.brand}|${v.model}|${v.year || ""}` : "");

/**
 * @param {import("../audio/features.js").Features} base referans (sağlam) kaydın özellikleri
 * @param {import("../audio/features.js").Features} cur şimdiki kaydın özellikleri
 * @returns {{verdict: "same"|"changed", notes: string[]}}
 */
export function compareToBaseline(base, cur) {
  const notes = [];
  let changed = false;

  const sameTone = base.toneHz && cur.toneHz && Math.abs(cur.toneHz / base.toneHz - 1) < 0.04;
  if (cur.toneHz && sameTone) {
    notes.push(`Kayıttaki ton (${hzText(cur.toneHz)}) referans kaydınızda da vardı; aracınızın normal çalışma sesi olabilir.`);
  } else if (cur.toneHz) {
    notes.push(`Referans kaydınızda olmayan yeni bir ton var (${hzText(cur.toneHz)}).`);
    changed = true;
  } else if (base.toneHz) {
    notes.push(`Referans kaydınızdaki ton (${hzText(base.toneHz)}) bu kayıtta yok.`);
  }

  const impDiff = cur.imp - base.imp;
  if (impDiff >= 0.25) { notes.push("Vuruntu/tıkırtı referansa göre belirgin şekilde artmış."); changed = true; }
  else if (Math.abs(impDiff) < 0.12 && cur.imp >= 0.3) notes.push("Vuruntu/tıkırtı düzeyi referans kaydınızla aynı.");

  if (base.rate && cur.rate && cur.periodicity >= 0.5 && Math.abs(cur.rate / base.rate - 1) > 0.25 && cur.imp >= 0.4) {
    notes.push(`Vuruntunun ritmi değişmiş (saniyede ${Math.round(base.rate)} → ${Math.round(cur.rate)}).`);
    changed = true;
  }

  const bandShift = Math.max(...cur.bands.map((b, i) => Math.abs(b - base.bands[i])));
  if (bandShift >= 0.25) {
    const i = cur.bands.map((b, k) => b - base.bands[k]).reduce((best, d, k, arr) => (d > arr[best] ? k : best), 0);
    notes.push(`Sesin ${["kalın (bas)", "orta", "ince (tiz)"][i]} kısmı referansa göre güçlenmiş.`);
    changed = true;
  }

  if (!changed) notes.unshift("Bu kayıt, aracınızın referans kaydına çok benziyor; belirgin bir değişiklik ölçülmedi.");
  return { verdict: changed ? "changed" : "same", notes };
}
