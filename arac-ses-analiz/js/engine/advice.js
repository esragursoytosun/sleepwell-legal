/**
 * "Ne yapmalısınız?" — aciliyet, garanti durumu, kendi kontroller, ustaya söylenecekler, kırmızı bayraklar,
 * fiyat bilgisi ve uygun ustalar. Saf modüldür; testlerde doğrudan kullanılır.
 */
import { GENERAL_ASK, GENERAL_FLAGS, GUIDANCE } from "../data/guidance.js";
import { PARTS } from "../data/parts.js";
import { PRICES } from "../data/prices.js";
import { MECHANICS } from "../data/mechanics.js";

export const URGENCY_PLAN = {
  1: { title: "Acele yok", text: "Bir sonraki bakımda ustaya söylemeniz yeterli." },
  2: { title: "Birkaç hafta içinde baktırın", text: "Ses artarsa ya da yeni bir belirti eklenirse beklemeyin." },
  3: { title: "Bu hafta baktırın", text: "Uzun yola çıkmadan önce kontrol ettirin." },
  4: { title: "Aracı kullanmayın", text: "En yakın servise çok kısa mesafede gidin ya da çekici çağırın." }
};

/**
 * Model yılına göre garanti ihtimali. Garanti süresi markaya göre değişir; kesin bilgi garanti belgesindedir.
 * @returns {null | {level: "likely"|"check", text: string}}
 */
export function warrantyStatus(vehicle, today = new Date()) {
  if (!vehicle.year) return null;
  const age = today.getFullYear() - vehicle.year;
  if (age < 0) return null;
  if (age <= 1) {
    return { level: "likely", text: "Aracınız büyük ihtimalle üretici garantisinde. Önce yetkili servise gidin; garanti kapsamındaki bir arıza için ücret ödemeniz gerekmez. Özel servise müdahale ettirmek garantiyi tartışmalı hâle getirebilir." };
  }
  if (age <= 4) {
    return { level: "check", text: "Bazı markalar 3–5 yıl ya da uzatılmış garanti veriyor. Garanti belgenizi kontrol edin; garantideyse önce yetkili servise gidin." };
  }
  return null;
}

/** Bir parça için araca en uygun fiyat kaydı (yoksa null). Daha özel eşleşme önceliklidir. */
export function findPrice(partId, vehicle, prices = PRICES) {
  const score = p =>
    (p.brand === vehicle.brand ? 2 : p.brand === "*" ? 0 : -99) +
    (p.model === vehicle.model ? 2 : p.model === "*" ? 0 : -99) +
    (vehicle.city && p.city === vehicle.city ? 1 : p.city === "*" || !p.city ? 0 : -0.5);
  return prices.filter(p => p.part === partId && score(p) >= 0).sort((a, b) => score(b) - score(a))[0] || null;
}

/** Fiyat kaydı 6 aydan eski mi? */
export const isStale = (price, today = new Date()) =>
  !price.updated || (today - new Date(price.updated)) / 864e5 > 183;

/** Arızaya ve şehre uygun doğrulanmış ustalar. */
export function findMechanics(fault, vehicle, mechanics = MECHANICS) {
  if (!vehicle.city) return [];
  return mechanics
    .filter(m => m.city === vehicle.city && m.groups.includes(fault.group) &&
      (m.brands.includes("*") || m.brands.includes(vehicle.brand)))
    .sort((a, b) => (b.stats.keptQuote / (b.stats.jobs || 1)) - (a.stats.keptQuote / (a.stats.jobs || 1)) || b.stats.jobs - a.stats.jobs);
}

/**
 * En olası arıza için eylem planı.
 * @param {{fault: object}} entry diagnose() sonucundaki ilk sıradaki kayıt
 */
export function actionPlan(entry, { vehicle, confidence, today = new Date(), prices = PRICES, mechanics = MECHANICS }) {
  const fault = entry.fault;
  const g = GUIDANCE[fault.id];
  const parts = g.parts.map(id => ({ id, label: PARTS[id].label, price: findPrice(id, vehicle, prices) }));
  return {
    fault,
    urgency: { level: fault.urg, ...URGENCY_PLAN[fault.urg] },
    warranty: warrantyStatus(vehicle, today),
    uncertain: confidence.level === "low",
    checks: g.checks,
    ask: [...g.ask, ...GENERAL_ASK],
    flags: [...g.flags, ...GENERAL_FLAGS],
    parts,
    hasPrices: parts.some(p => p.price),
    mechanics: findMechanics(fault, vehicle, mechanics)
  };
}
