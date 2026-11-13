import { $, esc, setNotice } from "./dom.js";
import { compareToBaseline, vehicleKey } from "../engine/baseline.js";

const STORAGE_KEY = "arac-ses-analiz:baselines";
const round = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v)));

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function save(all) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

/** Aracın referans (sağlam) kaydıyla karşılaştırmayı gösterir ya da referans saklamayı önerir. */
export function renderBaseline(state) {
  const key = vehicleKey(state.vehicle), base = key ? load()[key] : null;
  $("baselineBox").hidden = !key;
  if (!key) return;
  $("baselineSave").hidden = !!base;
  $("baselineClear").hidden = !base;
  if (!base) {
    $("baselineText").textContent = "Aracınız sağlamken bir kayıt saklarsanız, sonraki kayıtlarda neyin değiştiğini ölçeriz. Bu kayıt sağlam hâliyse referans olarak saklayın.";
    setNotice($("baselineResult"), "");
    return;
  }
  const cmp = compareToBaseline(base.features, state.features);
  $("baselineText").textContent = `Referans kayıt: ${base.date}. Karşılaştırma, kayıtlar aynı yerden ve aynı durumda (ör. rölantide) alındıysa anlamlıdır.`;
  setNotice($("baselineResult"), `<ul>${cmp.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`, cmp.verdict === "same" ? "ok" : "warn");
}

/** @param {() => object} getState */
export function initBaselineView(getState) {
  $("baselineSave").addEventListener("click", () => {
    const state = getState(), all = load();
    all[vehicleKey(state.vehicle)] = { date: new Date().toISOString().slice(0, 10), features: round(state.features) };
    if (!save(all)) $("baselineText").textContent = "Bu cihazda saklanamadı (tarayıcı saklamaya izin vermiyor).";
    else renderBaseline(state);
  });
  $("baselineClear").addEventListener("click", () => {
    const state = getState(), all = load();
    delete all[vehicleKey(state.vehicle)];
    save(all);
    renderBaseline(state);
  });
}
