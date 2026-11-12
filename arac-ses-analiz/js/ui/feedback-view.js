import { $, setNotice } from "./dom.js";
import { CONFIG } from "../config.js";
import { PARTS } from "../data/parts.js";

const STORAGE_KEY = "arac-ses-analiz:cases";
const round = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v)));
let lastRecord = null;

function savedCases() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

/** Vaka kaydı: kişisel veri içermez; ses/görüntü yerine yalnızca ölçülen ses özellikleri vardır. */
function buildRecord(state, result) {
  return {
    date: new Date().toISOString().slice(0, 10),
    vehicle: { ...state.vehicle },
    conditions: [...state.conditions],
    answers: { ...state.answers },
    prediction: result.ranked.slice(0, 3).map(r => ({ fault: r.fault.id, prob: +r.prob.toFixed(3) })),
    outcome: {
      part: $("fbPart").value || null,
      resolved: $("fbResolved").value || null,
      paidTL: parseInt($("fbPaid").value, 10) || null,
      keptQuote: $("fbKept").value || null
    },
    features: round(state.features)
  };
}

export function resetFeedback() {
  for (const id of ["fbPart", "fbResolved", "fbKept"]) $(id).value = "";
  $("fbPaid").value = "";
  $("fbSendBtn").disabled = true;
  setNotice($("fbStatus"), "");
  lastRecord = null;
}

/** @param {() => {state: object, result: object}} getContext */
export function initFeedbackView(getContext) {
  $("fbPart").innerHTML = `<option value="">Seçin…</option>` +
    Object.entries(PARTS).map(([id, p]) => `<option value="${id}">${p.label}</option>`).join("") +
    `<option value="hicbiri">Bir şey yapılmadı, ses kendiliğinden geçti</option><option value="bilinmiyor">Bilmiyorum</option>`;

  $("fbSaveBtn").addEventListener("click", () => {
    if (!$("fbPart").value && !$("fbResolved").value) {
      setNotice($("fbStatus"), "En azından ne yapıldığını ya da sesin geçip geçmediğini seçin.", "warn");
      return;
    }
    const { state, result } = getContext();
    lastRecord = buildRecord(state, result);
    try {
      const all = savedCases();
      all.push(lastRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(-50)));
      setNotice($("fbStatus"), `Kaydedildi (bu cihazda ${Math.min(all.length, 50)} kayıt). Bize gönderirseniz uygulamanın doğruluğunu ölçmekte kullanırız; kişisel bilgi ve ses kaydı gönderilmez.`, "ok");
    } catch {
      setNotice($("fbStatus"), "Bu cihazda kaydedilemedi, ama bize gönderebilirsiniz.", "warn");
    }
    $("fbSendBtn").disabled = false;
  });

  $("fbSendBtn").addEventListener("click", async () => {
    if (!lastRecord) return;
    const text = "Araç Ses Teşhisi – vaka sonucu\n" + JSON.stringify(lastRecord);
    if (CONFIG.whatsappNumber) {
      window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice($("fbStatus"), "Vaka metni panoya kopyalandı; ekibimize iletebilirsiniz.", "ok");
    } catch {
      setNotice($("fbStatus"), "Kopyalanamadı. Tarayıcı pano iznini kontrol edin.", "bad");
    }
  });
}
