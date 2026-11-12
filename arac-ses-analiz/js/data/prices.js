/**
 * Fiyat aralıkları (TL). Yalnızca gerçek kaynaktan gelen veri eklenir: anlaşmalı ustaların ve parçacıların
 * verdiği fiyatlar ya da kullanıcıların paylaştığı faturalar. Tahmini/uydurma rakam eklenmez.
 *
 * Kayıt biçimi:
 * {
 *   part: "bilya",            // PARTS anahtarı
 *   brand: "Volkswagen",      // "*" = tüm markalar
 *   model: "T-Roc",           // "*" = markanın tüm modelleri
 *   kind: "orijinal",         // "orijinal" | "muadil" | "*"
 *   partMin: 0, partMax: 0,   // parça fiyatı aralığı (TL)
 *   laborHours: 0,            // tipik işçilik süresi (saat), bilinmiyorsa null
 *   laborMin: 0, laborMax: 0, // işçilik ücreti aralığı (TL), bilinmiyorsa null
 *   city: "İstanbul",         // "*" = tüm şehirler
 *   source: "Anlaşmalı usta: ...", // verinin kaynağı
 *   updated: "2026-11-12"     // son güncelleme tarihi
 * }
 * Fiyatlar hızla değiştiği için `updated` 6 aydan eskiyse arayüz bunu belirtir.
 */
export const PRICES = [];
