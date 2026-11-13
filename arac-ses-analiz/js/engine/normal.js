/**
 * Kayıt, normal rölanti seslerinin aralığında mı? Gerçek araç kayıtlarından çıkarılan aralıkla karşılaştırır.
 * Saf modüldür; testlerde doğrudan kullanılır.
 */
import { NORMAL_IDLE } from "../data/normal-idle.js";

const DRIVING = ["hiz", "fren", "direksiyon", "tumsek", "vites", "hizlanma"];
const hzText = hz => (Math.round(hz / 10) * 10).toLocaleString("tr-TR") + " Hz";

/** Karşılaştırma yalnızca araç dururken alınmış motor kayıtlarında anlamlıdır. */
export function idleComparable(conditions, fuel) {
  return fuel !== "elektrik" && conditions.includes("rolanti") && !conditions.some(c => DRIVING.includes(c));
}

/**
 * @returns {null | {inside: boolean, deviations: string[], recordings: number}}
 *   null: karşılaştırma bu kayıt için anlamlı değil.
 */
export function idleNormality(F, { conditions = [], fuel = "benzin" } = {}) {
  if (!idleComparable(conditions, fuel)) return null;
  const range = NORMAL_IDLE.ranges[fuel === "dizel" ? "dizel" : "benzin"];
  const deviations = [];
  if (F.toneHz) {
    deviations.push(`Kayıt boyunca süren bir ton var (${hzText(F.toneHz)}). ${NORMAL_IDLE.recordings} normal aracın yalnızca ${NORMAL_IDLE.withTone}'ünde böyle bir ton ölçüldü.`);
  } else if (F.tonal > range.tonal[1]) deviations.push("Ses, normal rölantiye göre daha tonlu (ıslık ya da uğultu gibi).");
  if (F.imp > range.imp[1]) deviations.push("Vuruntu/tıkırtı, normal rölanti aralığının üstünde.");
  const lc = Math.log2(F.centroid || 1);
  if (lc > range.logCentroid[1]) deviations.push("Ses, normal rölantiye göre belirgin şekilde daha tiz.");
  else if (lc < range.logCentroid[0]) deviations.push("Ses, normal rölantiye göre belirgin şekilde daha kalın.");
  if (F.bands[0] > range.low[1]) deviations.push("Sesin kalın (bas) kısmı normalden güçlü.");
  else if (F.bands[2] > range.high[1]) deviations.push("Sesin ince (tiz) kısmı normalden güçlü.");
  return { inside: deviations.length === 0, deviations, recordings: NORMAL_IDLE.recordings };
}
