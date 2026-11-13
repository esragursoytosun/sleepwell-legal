import { $, esc } from "./dom.js";
import { icon } from "./icons.js";
import { lookupCode, parseCodes } from "../data/obd.js";

/** Girilen arıza kodlarını ve anlamlarını listeler. */
export function renderObd(state) {
  $("obdList").innerHTML = state.codes.map(code => {
    const rule = lookupCode(code);
    return `<li class="${rule ? "known" : "unknown"}">${icon(rule ? "check" : "info")}<b>${esc(code)}</b><span>${rule ? esc(rule.label) : "Bu kodu tanımıyoruz; ustaya ya da servise gösterin."}</span></li>`;
  }).join("");
  $("obdClear").hidden = !state.codes.length;
}

/**
 * @param {() => object} getState
 * @param {() => void} onChange kodlar değişince teşhisin yeniden hesaplanması için
 */
export function initObdView(getState, onChange) {
  const apply = () => {
    const state = getState();
    const codes = parseCodes($("obdInput").value);
    if (!codes.length) {
      $("obdHint").textContent = "Geçerli bir kod bulunamadı. Kodlar bir harf ve dört haneden oluşur (ör. P0301).";
      return;
    }
    $("obdHint").textContent = "Kod, sesin kaynağını doğrudan göstermez; sorunun kaydedildiği sistemi gösterir.";
    state.codes = [...new Set([...state.codes, ...codes])];
    $("obdInput").value = "";
    onChange();
  };
  $("obdApply").addEventListener("click", apply);
  $("obdInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
  $("obdClear").addEventListener("click", () => { getState().codes = []; onChange(); });
}
