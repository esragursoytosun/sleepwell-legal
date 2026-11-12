import { icon } from "./icons.js";

/** Küçük DOM yardımcıları. */
export const $ = id => document.getElementById(id);

/** HTML'e güvenle gömmek için metni kaçışlar. */
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const NOTICE_ICON = { ok: "check", warn: "alert", bad: "alert", "": "info" };

/** Bir bildirim kutusunu gösterir ya da (metin boşsa) gizler. */
export function setNotice(el, html, kind = "") {
  el.hidden = !html;
  el.className = "notice" + (kind ? " " + kind : "");
  el.innerHTML = html ? `${icon(NOTICE_ICON[kind] || "info")}<div>${html}</div>` : "";
}

export const percent = p => "%" + Math.round(p * 100);

/** Tuvali ekrandaki boyutuna ve piksel yoğunluğuna uydurur; çizim bağlamını CSS pikseli ölçeğinde döndürür. */
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
  const h = canvas.clientHeight || 96;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}

/** Okunan CSS değişkeni (renk). */
export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Tuval için soldan sağa vurgu degradesi. */
export function accentGradient(g, w) {
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, cssVar("--accent-2"));
  grad.addColorStop(1, cssVar("--accent-3"));
  return grad;
}
