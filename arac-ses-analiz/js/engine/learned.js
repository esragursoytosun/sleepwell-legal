/**
 * Öğrenen model: etiketli gerçek kayıtlardan çıkarılmış katsayılarla, kaydın "kayış tarafı" ya da
 * "aşınmış fren" sesine ne kadar benzediğini ölçer. Kural tabanlı teşhisin yerine geçmez; yalnızca
 * sınırlı bir çarpanla destekler ve yalnızca eğitildiği durumda (rölanti / fren) kullanılır.
 * Saf modüldür; testlerde doğrudan kullanılır. Ayrıntı: docs/ogrenen-model.md
 */
import { LEARNED } from "../data/learned-models.js";
import { extractFeatures } from "../audio/features.js";
import { idleComparable } from "./normal.js";

/** Bu olasılığın altında model görüş bildirmez (yanlış alarmı düşük tutmak için). */
export const LEARNED_THRESHOLD = 0.7;
/** Modelin bir arızanın ağırlığını en çok kaç kat artırabileceği. */
export const LEARNED_MAX_BOOST = 2.5;
const MAX_WINDOWS = 12;

/** Kaydı 1,5 sn'lik pencerelere bölüp her birinin ses özelliklerini ölçer. */
export function windowFeatures(samples, sr, max = MAX_WINDOWS) {
  const n = Math.round(LEARNED.windowSeconds * sr), out = [];
  for (let s = 0; s + n <= samples.length && out.length < max; s += n) out.push(extractFeatures(samples.subarray(s, s + n), sr));
  return out;
}

/** Modelin girdi vektörü (eğitimdekiyle aynı sıra). */
export function featureVector(F) {
  return [Math.log2(Math.max(50, F.centroid)), F.tonal, F.imp, F.periodicity, Math.min(F.rate || 0, 33) / 33,
    F.bands[0], F.bands[1], F.bands[2], Math.log2(Math.max(50, F.peakHz || 50)), F.tonePersistence || 0];
}

function probabilities(model, F) {
  const z = featureVector(F).map((v, j) => (v - model.mu[j]) / model.sd[j]);
  const s = model.W.map(w => w.reduce((a, v, j) => a + v * (j < z.length ? z[j] : 1), 0));
  const m = Math.max(...s), e = s.map(v => Math.exp(v - m)), t = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / t);
}

const meanClass = (model, windows, k) => windows.reduce((a, F) => a + probabilities(model, F)[k], 0) / windows.length;

/**
 * @param {import("../audio/features.js").Features[]} windows 1,5 sn'lik pencerelerin özellikleri
 * @returns {null | {kind: "yardimci"|"fren", p: number, boost: number, faults: string[], text: string}}
 *   null: model bu kayıt için görüş bildirmiyor (durum uygun değil ya da benzerlik eşiğin altında).
 */
export function learnedOpinion(windows, { conditions = [], fuel = "benzin" } = {}) {
  if (!windows?.length) return null;
  let kind, p, faults, text;
  if (conditions.includes("fren")) {
    kind = "fren"; p = meanClass(LEARNED.brake, windows, 1); faults = ["fren_balata", "fren_disk"];
    const m = LEARNED.measured.brake;
    text = `Öğrenen model: kayıt, etiketli aşınmış fren seslerine %${Math.round(p * 100)} benziyor. (Sınama: ${m.faultClips} aşınmış fren kaydından ${m.caught} tanesi yakalandı; ${m.normalClips} normal fren kaydında ${m.falseAlarms} yanlış alarm.)`;
  } else if (idleComparable(conditions, fuel)) {
    kind = "yardimci"; p = meanClass(LEARNED.idle, windows, 1); faults = ["kayis", "pompa", "alternator"];
    const m = LEARNED.measured.idle;
    text = `Öğrenen model: kayıt, etiketli kayış/pompa tarafı seslerine %${Math.round(p * 100)} benziyor. (Sınama: ${m.normalCars} normal araçta ${m.falseAlarms} yanlış alarm; arızalı kayıtların yaklaşık %${Math.round(m.caught / m.faultClips * 10) * 10}'ı yakalandı.)`;
  } else return null;
  if (p < LEARNED_THRESHOLD) return null;
  const boost = 1 + (LEARNED_MAX_BOOST - 1) * (p - LEARNED_THRESHOLD) / (1 - LEARNED_THRESHOLD);
  return { kind, p, boost, faults, text };
}
