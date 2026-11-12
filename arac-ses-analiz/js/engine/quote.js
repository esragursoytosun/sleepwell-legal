/**
 * Ustanın teklifini (ya da faturasını) teşhisle karşılaştırır.
 * Saf modüldür; testlerde doğrudan kullanılır.
 */
import { GUIDANCE } from "../data/guidance.js";
import { PARTS } from "../data/parts.js";
import { PRICES } from "../data/prices.js";
import { findPrice } from "./advice.js";

/** Teşhisle ilişkili sayılan arızalar: ilk üç ve olasılığı %10'u geçen diğerleri. */
function relatedFaults(ranked) {
  return ranked.filter((r, i) => i < 3 || r.prob >= 0.1);
}

/**
 * @param {string[]} partIds teklifte geçen kalemler (PARTS anahtarları)
 * @param {number} total teklifin toplam tutarı (TL), bilinmiyorsa 0
 * @param {object[]} ranked diagnose().ranked
 * @param {object} vehicle
 * @returns {{items: {id: string, label: string, status: "related"|"routine"|"unrelated"}[],
 *            flags: {level: "info"|"warn"|"bad", text: string}[],
 *            price: null | {min: number, max: number, complete: boolean},
 *            verdict: "ok"|"ask"|"second_opinion"}}
 */
export function checkQuote(partIds, total, ranked, vehicle, prices = PRICES) {
  const related = relatedFaults(ranked);
  const relatedParts = new Set(related.flatMap(r => GUIDANCE[r.fault.id].parts));
  const items = partIds.map(id => ({
    id,
    label: PARTS[id].label,
    status: relatedParts.has(id) ? "related" : PARTS[id].routine ? "routine" : "unrelated"
  }));

  const flags = [];
  const unrelated = items.filter(i => i.status === "unrelated");
  const costlyUnrelated = unrelated.filter(i => PARTS[i.id].costly);
  if (costlyUnrelated.length) {
    flags.push({ level: "bad", text: `Teklifte sesle ilişkisi görünmeyen pahalı kalem var: ${costlyUnrelated.map(i => i.label).join(", ")}. Neden gerektiğini sorun ve ikinci görüş alın.` });
  }
  if (unrelated.length >= 2) {
    flags.push({ level: "warn", text: `Teklifteki ${unrelated.length} kalemin bu sesle ilişkisi görünmüyor. Her birinin neden değiştiğini tek tek sorun.` });
  } else if (unrelated.length === 1 && !costlyUnrelated.length) {
    flags.push({ level: "info", text: `“${unrelated[0].label}” bu sesle doğrudan ilişkili görünmüyor; ayrı bir sorun için önerilmiş olabilir, nedenini sorun.` });
  }
  if (items.length && !items.some(i => i.status === "related")) {
    flags.push({ level: "info", text: `Teklifte bu sesle ilişkili görünen bir kalem yok (en olası: ${ranked[0].fault.name.toLowerCase()}). Ustanın teşhisi farklı olabilir; nasıl teşhis ettiğini sorun.` });
  }

  // Fiyat: yalnızca gerçek fiyat verisi varsa karşılaştırılır.
  let price = null;
  const found = partIds.map(id => findPrice(id, vehicle, prices));
  if (found.some(Boolean)) {
    const sum = (key1, key2) => found.reduce((s, p) => s + (p ? (p[key1] || 0) + (p[key2] || 0) : 0), 0);
    price = { min: sum("partMin", "laborMin"), max: sum("partMax", "laborMax"), complete: found.every(Boolean) };
    if (total && price.complete && total > price.max * 1.3) {
      flags.push({ level: "warn", text: "Toplam tutar, bu kalemler için bildiğimiz fiyat aralığının belirgin şekilde üstünde. Başka bir ustadan da teklif alın." });
    }
  }

  const verdict = flags.some(f => f.level === "bad") ? "second_opinion" : flags.some(f => f.level === "warn") ? "ask" : "ok";
  return { items, flags, price, verdict };
}
