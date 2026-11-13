/**
 * OBD-II arıza kodu aileleri ve işaret ettikleri arızalar.
 * Kod, sesin kaynağını doğrudan göstermez; hangi sistemde sorun kaydedildiğini gösterir.
 * `effects`: arıza kimliği → olasılık çarpanı.
 */
export const OBD_RULES = [
  { from: "P0010", to: "P0025", label: "Eksantrik zamanlaması / değişken supap zamanlaması", effects: { zincir: 3 } },
  { from: "P0130", to: "P0167", label: "Oksijen sensörü", effects: { egzoz: 1.5 } },
  { from: "P0171", to: "P0175", label: "Yakıt karışımı (fakir/zengin)", effects: { egzoz: 1.4, turbo: 1.3, tekleme: 1.3 } },
  { from: "P0200", to: "P0212", label: "Enjektör devresi", effects: { tekleme: 2.5 } },
  { from: "P0234", to: "P0249", label: "Turbo basıncı", effects: { turbo: 4 } },
  { from: "P0299", to: "P0299", label: "Turbo basıncı düşük", effects: { turbo: 4 } },
  { from: "P0300", to: "P0312", label: "Ateşleme teklemesi", effects: { tekleme: 4 } },
  { from: "P0325", to: "P0334", label: "Vuruntu sensörü", effects: { biyel: 1.6 } },
  { from: "P0340", to: "P0349", label: "Eksantrik konum sensörü", effects: { zincir: 1.8 } },
  { from: "P0350", to: "P0362", label: "Ateşleme bobini devresi", effects: { tekleme: 3.5 } },
  { from: "P0420", to: "P0434", label: "Katalitik konvertör verimi", effects: { egzoz: 1.6 } },
  { from: "P0500", to: "P0503", label: "Araç hız sensörü", effects: { rulman: 1.4 } },
  { from: "P0520", to: "P0524", label: "Motor yağ basıncı", effects: { biyel: 2.5, supap: 2, zincir: 1.5 } },
  { from: "P0530", to: "P0534", label: "Klima basınç sensörü", effects: { klima: 3.5 } },
  { from: "P0550", to: "P0554", label: "Hidrolik direksiyon basıncı", effects: { pompa: 3.5 } },
  { from: "P0560", to: "P0563", label: "Sistem voltajı", effects: { alternator: 3.5, kayis: 1.5 } },
  { from: "P0620", to: "P0626", label: "Alternatör kontrol devresi", effects: { alternator: 4 } },
  { from: "P0645", to: "P0647", label: "Klima kavrama rölesi", effects: { klima: 3.5 } },
  { from: "P0700", to: "P0899", label: "Şanzıman", effects: { sanziman: 3.5 } },
  { from: "C0031", to: "C0052", label: "Tekerlek hız sensörü", effects: { rulman: 1.8 } }
];

const CODE = /\b([PCBU])\s?([0-9A-F]{4})\b/gi;

/** Serbest metinden arıza kodlarını ayıklar (ör. "p0301, P0420" → ["P0301", "P0420"]). */
export function parseCodes(text) {
  const out = [];
  for (const m of String(text || "").matchAll(CODE)) {
    const code = (m[1] + m[2]).toUpperCase();
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

const value = code => parseInt(code.slice(1), 16);

/** Kodun ait olduğu aile ya da tanınmıyorsa null. */
export function lookupCode(code) {
  return OBD_RULES.find(r => r.from[0] === code[0] && value(code) >= value(r.from) && value(code) <= value(r.to)) || null;
}
