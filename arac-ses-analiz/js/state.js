/** Uygulamanın oturum durumu. Araç bilgisi tarayıcıda saklanır; kayıtlar saklanmaz. */
const STORAGE_KEY = "arac-ses-analiz:vehicle";

export const state = {
  vehicle: { brand: "", model: "", fuel: "benzin", year: 0, km: 0 },
  conditions: new Set(),
  /** @type {null | {samples: Float32Array, sr: number, blob: Blob, url: string, label: string, quality: {level: string, issues: object[]}}} */
  recording: null,
  features: null,
  answers: {}
};

export function loadVehicle() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") Object.assign(state.vehicle, saved);
  } catch { /* gizli pencere ya da bozuk kayıt: varsayılanlarla devam */ }
}

export function saveVehicle() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.vehicle)); } catch { /* saklanamadıysa sorun değil */ }
}
