/** Uygulamanın oturum durumu. Araç bilgisi tarayıcıda saklanır; kayıtlar saklanmaz. */
const STORAGE_KEY = "arac-ses-analiz:vehicle";

export const state = {
  vehicle: { brand: "", model: "", fuel: "benzin", year: 0, km: 0, city: "" },
  conditions: new Set(),
  /** @type {null | {samples: Float32Array, sr: number, blob: Blob, url: string, label: string, isVideo: boolean, quality: {level: string, issues: object[]}}} */
  recording: null,
  features: null,
  /** Sesin zaman içindeki gücü (audio/locate.js) */
  locate: null,
  answers: {},
  /** Yönlendirmeli testlerde ölçülen sonuçlar: test kimliği → {answer, text} */
  measured: {}
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
