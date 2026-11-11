/** Küçük DOM yardımcıları. */
export const $ = id => document.getElementById(id);

/** HTML'e güvenle gömmek için metni kaçışlar. */
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Bir bildirim kutusunu gösterir ya da (metin boşsa) gizler. */
export function setNotice(el, html, kind = "") {
  el.hidden = !html;
  el.className = "notice" + (kind ? " " + kind : "");
  el.innerHTML = html || "";
}

export const percent = p => "%" + Math.round(p * 100);
