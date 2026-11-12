/**
 * Doğrulanmış (güvenilir) ustalar. Bir usta ancak docs/usta-agi.md'deki kabul adımlarını tamamladıktan
 * ve çalışma kurallarını kabul ettikten sonra eklenir. Ücret karşılığı sıralama yapılmaz.
 *
 * Kayıt biçimi:
 * {
 *   id: "u001",
 *   name: "Usta / işletme adı",
 *   city: "İstanbul",
 *   district: "Ümraniye",
 *   whatsapp: "905xxxxxxxxx",          // ülke koduyla, yalnızca rakam
 *   groups: ["alt_takim", "fren"],     // GROUPS anahtarları: uzman olduğu bölgeler
 *   brands: ["*"],                     // "*" = tüm markalar
 *   verifiedAt: "2026-11-12",          // kabul adımlarının tamamlandığı tarih
 *   stats: { jobs: 0, keptQuote: 0 }   // tamamlanan iş ve teklifine sadık kaldığı iş sayısı
 * }
 */
export const MECHANICS = [];
