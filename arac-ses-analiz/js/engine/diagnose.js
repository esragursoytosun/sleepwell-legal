/**
 * Teşhis motoru: ses özellikleri + sürüş durumları + araç bilgisi + takip sorusu cevapları
 * → sıralı arıza olasılıkları, bölge (grup) olasılıkları ve güven düzeyi.
 *
 * Bu modül saftır (tarayıcıya ya da ekrana bağlı değildir); testlerde doğrudan kullanılır.
 */
import { FAULTS, GROUPS } from "../data/faults.js";
import { KNOWN_ISSUES } from "../data/known-issues.js";
import { QUESTIONS } from "../data/questions.js";

const HIGH_KM_WEAR = ["rulman", "aks", "biyel", "zincir", "sanziman",
  "rotil", "rot_basi", "z_rot", "viraj_lastik", "amortisor_kafa", "salincak"];
const VERY_HIGH_KM_WEAR = ["biyel", "zincir", "turbo"];

/** Değer aralığın içindeyse 1; dışındaysa oktav cinsinden uzaklığa göre azalan puan. */
function rangeMatch(value, [lo, hi], width = 0.6) {
  if (value <= 0) return 0;
  if (value >= lo && value <= hi) return 1;
  const d = value < lo ? Math.log2(lo / value) : Math.log2(value / hi);
  return Math.exp(-d * d / (2 * width * width));
}

/** Sesin bir arıza profiline benzerliği (0..1). */
export function audioScore(F, p) {
  const freq = rangeMatch(p.feat === "peak" ? F.peakHz : F.centroid, p.f);
  const tonal = 1 - Math.abs(F.tonal - p.tonal);
  const imp = 1 - Math.abs(F.imp - p.imp);
  let rhythm;
  if (p.rhythm === "irregular") rhythm = 1 - F.periodicity;
  else if (p.rhythm) rhythm = 0.25 + 0.75 * F.periodicity * rangeMatch(F.rate, p.rhythm, 0.5);
  else rhythm = 1 - 0.7 * F.periodicity * F.imp;
  // Düzenli ritimli bir ses, yol kaynaklı düzensiz vuruntu olamaz: bu durumda puan ayrıca kırpılır.
  const penalty = p.rhythm === "irregular" ? 1 - 0.6 * F.periodicity : 1;
  return (0.35 * freq + 0.2 * tonal + 0.25 * imp + 0.2 * rhythm) * penalty;
}

/** Seçilen sürüş durumlarının arızaya etkisi (çarpan). */
function conditionFactor(fault, conditions) {
  let x = 1;
  for (const c of conditions) x *= fault.c[c] ?? 0.8;
  return x;
}

/**
 * Araç bilgisinin arızaya etkisi.
 * @returns {{x: number, notes: string[]}}
 */
export function vehiclePrior(fault, v) {
  let x = 1;
  const notes = [];
  if (v.fuel === "elektrik" && fault.ice) x *= 0.03;
  if (v.fuel === "dizel" && fault.id === "turbo") x *= 1.3;
  if (v.fuel === "dizel" && fault.id === "tekleme") x *= 0.7;
  if (v.fuel === "lpg" && fault.id === "supap") {
    x *= 1.4;
    notes.push("LPG kullanımında supap ve supap yuvası aşınması daha sık görülür; supap ayarı periyodik yapılmalıdır.");
  }
  if (v.year >= 2015 && fault.id === "pompa") x *= 0.5; // yeni araçların çoğu elektrikli direksiyonludur
  if (v.km >= 150000 && HIGH_KM_WEAR.includes(fault.id)) x *= 1.25;
  if (v.km >= 250000 && VERY_HIGH_KM_WEAR.includes(fault.id)) x *= 1.2;

  for (const k of KNOWN_ISSUES) {
    if (k.fault !== fault.id || !(k.match[v.brand] || []).includes(v.model)) continue;
    if (k.fuel && !k.fuel.includes(v.fuel)) continue;
    if (v.year && (v.year < k.years[0] || v.year > k.years[1])) continue;
    x *= v.year ? k.x : 1 + (k.x - 1) / 2;
    notes.push(`${v.brand} ${v.model}: ${k.note}` + (v.year ? "" : " (Model yılı girilirse bu bilgi daha isabetli kullanılır.)"));
  }
  return { x, notes };
}

/** Bir sorunun verilen cevabının arızaya etkisi (çarpan). Arızaya özel değer, grup değerinden önceliklidir. */
export function answerFactor(question, answer, fault) {
  const effects = question[answer];
  if (!effects) return 1;
  return effects[fault.id] ?? effects["@" + fault.group] ?? 1;
}

/**
 * @param {Object} input
 * @param {import("../audio/features.js").Features} input.features
 * @param {string[]} [input.conditions]
 * @param {{brand?: string, model?: string, fuel?: string, year?: number, km?: number}} [input.vehicle]
 * @param {Record<string, "yes"|"no"|"unknown">} [input.answers]
 * @param {"ok"|"warn"|"bad"} [input.quality]
 */
export function diagnose({ features, conditions = [], vehicle = {}, answers = {}, quality = "ok" }) {
  const v = { brand: "", model: "", fuel: "benzin", year: 0, km: 0, ...vehicle };
  const answered = QUESTIONS.filter(q => answers[q.id] === "yes" || answers[q.id] === "no");

  const ranked = FAULTS.map(fault => {
    const audio = audioScore(features, fault.p);
    const prior = vehiclePrior(fault, v);
    let weight = Math.exp(7 * audio) * conditionFactor(fault, conditions) * prior.x;
    for (const q of answered) weight *= answerFactor(q, answers[q.id], fault);
    return { fault, audio, weight, notes: prior.notes, prob: 0 };
  });
  const total = ranked.reduce((s, r) => s + r.weight, 0) || 1;
  for (const r of ranked) r.prob = r.weight / total;
  ranked.sort((a, b) => b.prob - a.prob);

  const groups = Object.entries(GROUPS)
    .map(([id, label]) => ({ id, label, prob: ranked.filter(r => r.fault.group === id).reduce((s, r) => s + r.prob, 0) }))
    .sort((a, b) => b.prob - a.prob);

  return { ranked, groups, confidence: confidence({ ranked, groups, quality, features, conditions, answered }) };
}

/** Sonuca ne kadar güvenilebileceğini ve nedenini belirler. */
function confidence({ ranked, groups, quality, features, conditions, answered }) {
  const reasons = [];
  if (quality !== "ok") reasons.push("Kayıt kalitesi düşük.");
  if (features.dur < 4) reasons.push("Kayıt kısa.");
  if (!conditions.length && !answered.length) reasons.push("Sesin ne zaman çıktığı belirtilmedi.");
  if (groups[0].prob < 0.45) reasons.push("Ses birden fazla bölgeye benziyor.");
  else if (ranked[0].prob < 0.35) reasons.push("Aynı bölgedeki birkaç parça benzer ses çıkarıyor.");

  let level;
  if (quality === "bad" || groups[0].prob < 0.45) level = "low";
  else if (quality === "ok" && groups[0].prob >= 0.7 && ranked[0].prob >= 0.4 && features.dur >= 4) level = "good";
  else level = "mid";
  return { level, label: { low: "Güven: düşük", mid: "Güven: orta", good: "Güven: iyi" }[level], reasons };
}

/**
 * Adaylar arasında en çok ayrım yapacak, henüz cevaplanmamış soruları seçer.
 * Ölçüt: "evet" cevabının olasılıkları ne kadar yeniden sıralayacağı (olasılık ağırlıklı varyans).
 */
export function nextQuestions(ranked, answers = {}, max = 3) {
  const scored = [];
  for (const q of QUESTIONS) {
    if (answers[q.id]) continue;
    let mean = 0;
    const logs = ranked.map(r => Math.log(answerFactor(q, "yes", r.fault)));
    ranked.forEach((r, i) => { mean += r.prob * logs[i]; });
    let variance = 0;
    ranked.forEach((r, i) => { variance += r.prob * (logs[i] - mean) ** 2; });
    if (variance > 0.02) scored.push({ q, variance });
  }
  return scored.sort((a, b) => b.variance - a.variance).slice(0, max).map(s => s.q);
}
