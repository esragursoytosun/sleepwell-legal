/** Sesin ortaya çıktığı durumlar: [kimlik, etiket]. */
export const CONDITIONS = [
  ["rolanti", "Rölantide (araç dururken)"],
  ["soguk", "Soğuk çalıştırmada"],
  ["hizlanma", "Gaza basınca / hızlanırken"],
  ["hiz", "Hız arttıkça (yolda)"],
  ["fren", "Fren yaparken"],
  ["direksiyon", "Direksiyonu çevirince"],
  ["tumsek", "Tümsek / bozuk yolda"],
  ["vites", "Vites değişiminde"],
  ["klima", "Klima açıkken"]
];
export const CONDITION_LABEL = Object.fromEntries(CONDITIONS);
