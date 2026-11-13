/**
 * "Neden bu sonuç?" — en olası arıza için, kullanıcının anlayacağı dilde gerekçeler üretir.
 * Saf modüldür; testlerde doğrudan kullanılır.
 */
import { CONDITION_LABEL } from "../data/conditions.js";
import { QUESTIONS } from "../data/questions.js";
import { answerFactor } from "./diagnose.js";
import { lookupCode } from "../data/obd.js";

const round10 = hz => Math.round(hz / 10) * 10;
const hzText = hz => round10(hz).toLocaleString("tr-TR") + " Hz";

/** Sesin kendisine dair gözlemler (arızadan bağımsız). */
export function describeSound(F) {
  const out = [];
  if (F.toneHz) {
    out.push(`Kayıt boyunca yaklaşık ${hzText(F.toneHz)} civarında sabit bir ton var (kaydın %${Math.round(F.tonePersistence * 100)}'inde). Bu, ıslık ya da vınlama gibi duyulur.`);
  } else if (F.tonal >= 0.6) {
    out.push(`Ses tonlu: ıslık ya da uğultu karakterinde (yaklaşık ${hzText(F.peakHz)}).`);
  }
  if (F.imp >= 0.6) {
    out.push(F.rate
      ? `Ses darbeli ve düzenli: saniyede yaklaşık ${Math.round(F.rate)} kez tekrarlıyor.`
      : "Ses düzensiz aralıklarla gelen darbelerden oluşuyor (takırtı, vuruntu).");
  } else if (!F.toneHz && F.tonal < 0.35 && F.imp < 0.4) {
    out.push("Ses hışırtı ya da sürtünme gibi; belirgin bir tonu ya da darbesi yok.");
  }
  if (F.centroid < 500) out.push("Ses ağırlıklı olarak kalın (bas) frekanslarda.");
  else if (F.centroid > 2500 && !F.toneHz) out.push("Ses ağırlıklı olarak ince (tiz) frekanslarda.");
  return out;
}

/**
 * En olası arızayı destekleyen gerekçeler.
 * `measured`: soru kimliği → yönlendirmeli testte ölçülen sonucun metni.
 * @returns {string[]}
 */
export function explainTop(entry, { features, conditions = [], answers = {}, measured = {}, codes = [] }) {
  const fault = entry.fault;
  const out = describeSound(features);

  const supporting = conditions.filter(c => (fault.c[c] ?? 0.8) >= 1.5).map(c => `“${CONDITION_LABEL[c]}”`);
  if (supporting.length) out.push(`Seçtiğiniz ${supporting.join(", ")} belirtisi bu arızayla uyumlu.`);

  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!(a === "yes" || a === "no") || answerFactor(q, a, fault) < 1.5) continue;
    if (measured[q.id]) out.push(`Yaptığınız testte ölçüldü: ${measured[q.id]}`);
    else {
      out.push(`“${q.text}” sorusuna “${a === "yes" ? "Evet" : "Hayır"}” dediniz; bu, bu arızayı destekliyor.`);
    }
  }
  for (const code of codes) {
    const rule = lookupCode(code);
    if (rule && (rule.effects[fault.id] ?? 1) >= 1.5) out.push(`Girdiğiniz ${code} kodu (${rule.label.toLowerCase()}) bu arızayı destekliyor.`);
  }
  if (entry.notes.length) out.push("Aracınızın modelinde bu tür bir sorun sık bildirilmiş (ayrıntı arıza kartında).");
  return out;
}
