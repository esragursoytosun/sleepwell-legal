import { SYNTH } from "../js/audio/synth.js";
import { extractFeatures } from "../js/audio/features.js";

export const SR = 44100;
const cache = new Map();

/** Bir arızanın örnek sesinden çıkarılan özellikler (testler arasında önbelleğe alınır). */
export function featuresOf(faultId) {
  if (!cache.has(faultId)) cache.set(faultId, extractFeatures(SYNTH[faultId](SR, 6), SR));
  return cache.get(faultId);
}

/** Arızaya güçlü biçimde işaret eden sürüş durumları (çarpanı ≥ 2 olanlar). */
export const strongConditions = fault => Object.entries(fault.c).filter(([, w]) => w >= 2).map(([k]) => k);
