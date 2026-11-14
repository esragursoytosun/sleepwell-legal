/**
 * Öğrenen model: etiketli gerçek kayıtlardan çıkarılmış katsayılarla, kaydın "kayış tarafı" ya da
 * "aşınmış fren" sesine ne kadar benzediğini ölçer. Kural tabanlı teşhisin yerine geçmez; yalnızca
 * sınırlı bir çarpanla destekler ve yalnızca eğitildiği durumda (rölanti / fren) kullanılır.
 * Saf modüldür; testlerde doğrudan kullanılır. Ayrıntı: docs/ogrenen-model.md
 */
import { LEARNED } from "../data/learned-models.js";
import { extractFeatures } from "../audio/features.js";
import { idleComparable } from "./normal.js";

/** Bu benzerliğin altında model görüş bildirmez (yanlış alarmı düşük tutmak için). */
export const LEARNED_THRESHOLD = { belt: 0.7, valve: 0.6, brake: 0.7 };
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

const sample = m => `(Sınama: ${m.normal} normal kayıtta ${m.falseAlarms} yanlış alarm; ${m.faulty} arızalı kayıttan ${m.caught} tanesi yakalandı.)`;
const IDLE_BELT = 1, IDLE_VALVE = 4;

/**
 * @param {import("../audio/features.js").Features[]} windows 1,5 sn'lik pencerelerin özellikleri
 * @returns {null | {kind: "kayis"|"supap"|"fren", p: number, boost: number, faults: string[], text: string}}
 *   null: model bu kayıt için görüş bildirmiyor (durum uygun değil ya da benzerlik eşiğin altında).
 */
export function learnedOpinion(windows, { conditions = [], fuel = "benzin" } = {}) {
  if (!windows?.length) return null;
  const M = LEARNED.measured;
  let options;
  if (conditions.includes("fren")) {
    options = [{ kind: "fren", p: meanClass(LEARNED.brake, windows, 1), threshold: LEARNED_THRESHOLD.brake, faults: ["fren_balata", "fren_disk"], what: "aşınmış fren", m: M.brake }];
  } else if (idleComparable(conditions, fuel)) {
    options = [
      { kind: "kayis", p: meanClass(LEARNED.idle, windows, IDLE_BELT), threshold: LEARNED_THRESHOLD.belt, faults: ["kayis", "pompa", "alternator"], what: "kayış/pompa tarafı", m: M.belt },
      { kind: "supap", p: meanClass(LEARNED.idle, windows, IDLE_VALVE), threshold: LEARNED_THRESHOLD.valve, faults: ["supap"], what: "supap tıkırtısı", m: M.valve }
    ];
  } else return null;
  const o = options.filter(x => x.p >= x.threshold).sort((a, b) => b.p - a.p)[0];
  if (!o) return null;
  const boost = 1 + (LEARNED_MAX_BOOST - 1) * (o.p - o.threshold) / (1 - o.threshold);
  return { kind: o.kind, p: o.p, boost, faults: o.faults, text: `Öğrenen model: kayıt, etiketli ${o.what} seslerine %${Math.round(o.p * 100)} benziyor. ${sample(o.m)}` };
}
