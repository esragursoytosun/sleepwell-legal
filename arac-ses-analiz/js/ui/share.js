import { CONFIG } from "../config.js";
import { CONDITION_LABEL } from "../data/conditions.js";
import { QUESTIONS } from "../data/questions.js";
import { FUELS } from "../data/vehicles.js";
import { percent } from "./dom.js";

const FUEL_LABEL = Object.fromEntries(FUELS);

/** Araç bilgisini tek satırda özetler. */
export function vehicleLine(v) {
  if (!v.brand) return "Araç bilgisi girilmedi";
  const parts = [`${v.brand} ${v.model}${v.year ? ` (${v.year})` : ""}`, FUEL_LABEL[v.fuel]];
  if (v.km) parts.push(v.km.toLocaleString("tr-TR") + " km");
  if (v.city) parts.push(v.city);
  return parts.join(" · ");
}

/** Ustaya gönderilecek düz metin özeti. */
export function buildSummary(state, result) {
  const lines = [`${CONFIG.appName} – ikinci görüş talebi`, "", "Araç: " + vehicleLine(state.vehicle)];
  if (state.conditions.size) lines.push("Ses ne zaman çıkıyor: " + [...state.conditions].map(c => CONDITION_LABEL[c]).join(", "));
  const answered = QUESTIONS.filter(q => state.answers[q.id] === "yes" || state.answers[q.id] === "no");
  if (answered.length) {
    lines.push("", "Cevaplanan sorular:");
    for (const q of answered) lines.push(`- ${q.text} ${state.answers[q.id] === "yes" ? "Evet" : "Hayır"}`);
  }
  if (state.codes?.length) lines.push("", "Arıza kodları: " + state.codes.join(", "));
  lines.push("", `Uygulamanın tahmini (${result.confidence.label.toLowerCase()}):`);
  lines.push(`Bölge: ${result.groups[0].label} ${percent(result.groups[0].prob)}`);
  result.ranked.slice(0, 3).forEach((r, i) => lines.push(`${i + 1}) ${r.fault.name} ${percent(r.prob)}`));
  lines.push("", "Not: Bu bir ön tahmindir, kesin teşhis değildir. Ses kaydı ektedir.");
  return lines.join("\n");
}

function recordingFile(recording) {
  const type = recording.blob.type || "audio/wav";
  const ext = type.includes("wav") ? "wav" : type.includes("mp4") || type.includes("aac") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  return new File([recording.blob], "arac-sesi." + ext, { type });
}

/**
 * Özeti ve kaydı paylaşır.
 * Cihaz dosya paylaşımını destekliyorsa paylaşım menüsü açılır (WhatsApp vb.);
 * desteklemiyorsa WhatsApp'ta hazır mesaj açılır ve kaydın elle eklenmesi gerekir.
 * @returns {Promise<"shared"|"whatsapp"|"cancelled">}
 */
export async function shareSecondOpinion(state, result) {
  const text = buildSummary(state, result);
  const file = recordingFile(state.recording);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: CONFIG.appName, text, files: [file] });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }
  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return "whatsapp";
}

export async function copySummary(state, result) {
  await navigator.clipboard.writeText(buildSummary(state, result));
}
