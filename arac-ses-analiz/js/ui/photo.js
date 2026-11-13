import { $ } from "./dom.js";

const STORAGE_KEY = "arac-ses-analiz:photo";
const MAX_SIDE = 720;

/** Fotoğrafı küçültüp JPEG veri adresine çevirir (cihazda saklanabilecek boyut). */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

function show(src) {
  for (const id of ["photoThumb", "heroPhoto", "resultPhoto"]) {
    const el = $(id);
    el.hidden = !src;
    if (src) el.src = src; else el.removeAttribute("src");
  }
  $("photoRemove").hidden = !src;
  $("photoLabel").textContent = src ? "Fotoğrafı değiştir" : "Aracımın fotoğrafını ekle";
}

/** Kullanıcının kendi araç fotoğrafı: yalnızca bu cihazda saklanır, hiçbir yere gönderilmez. */
export function initPhoto() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* saklama kapalı */ }
  show(saved);

  $("carPhoto").addEventListener("change", async e => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const src = await shrink(file);
      show(src);
      $("photoHint").textContent = "İsteğe bağlı. Fotoğraf yalnızca bu cihazda kalır.";
      try { localStorage.setItem(STORAGE_KEY, src); } catch { /* saklanamadı: bu oturumda yine görünür */ }
    } catch {
      $("photoHint").textContent = "Bu dosya açılamadı. JPEG ya da PNG bir fotoğraf deneyin.";
    }
  });
  $("photoRemove").addEventListener("click", () => {
    show(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* yok */ }
  });
}
