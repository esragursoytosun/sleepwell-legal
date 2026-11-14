/**
 * Etiketli ses örneklerinden öğrenilmiş iki küçük model (lojistik regresyon, 10 ses özelliği, 1,5 sn pencereler).
 * Bu dosya scripts/train-learned.mjs ile üretilir; elle değiştirmeyin.
 * Kaynaklar, ölçülen başarı ve lisans durumu: docs/ogrenen-model.md
 *
 * Eğitim verisi:
 *  - "Car Diagnostics Dataset" (Kaggle; lisansı "Unknown" olarak belirtilmiş): 1,5 sn parçalar.
 *  - Gerçek araçların normal rölanti kayıtları (Zenodo 18777405, CC BY 4.0): kayıt başına en çok 3 pencere.
 * Uygulamada ses dosyası yoktur; yalnızca aşağıdaki katsayılar bulunur.
 */
export const LEARNED = {
  trainedAt: "2026-11-14",
  windowSeconds: 1.5,
  /** Rölanti: sınıflar [normal, kayış tarafı (kayış + direksiyon pompası), yağ azlığı]. Yalnızca "kayış tarafı" kullanılır. */
  idle: {
    mu: [10.6327, 0.1162, 0.1176, 0.4501, 0.3215, 0.3879, 0.2445, 0.3676, 8.0239, 0.1536],
    sd: [1.1531, 0.196, 0.1839, 0.2815, 0.2666, 0.2528, 0.1585, 0.2432, 2.1241, 0.1479],
    W: [
      [0.6377, -0.3078, -0.3029, -0.2232, 0.3739, 0.3785, -0.126, -0.3113, -0.0973, -0.1551, 0.4247],
      [-0.7826, -0.0004, -0.1643, -0.176, -0.2013, -0.4458, -0.4264, 0.7412, 0.2114, 0.3598, -0.062],
      [0.1449, 0.3081, 0.4671, 0.3993, -0.1726, 0.0674, 0.5524, -0.4299, -0.1142, -0.2046, -0.3627]
    ]
  },
  /** Fren: sınıflar [normal fren, aşınmış fren]. */
  brake: {
    mu: [10.0766, 0.2311, 0.2843, 0.3392, 0.2282, 0.3288, 0.4764, 0.1949, 9.3928, 0.1359],
    sd: [1.2726, 0.3651, 0.3108, 0.3186, 0.2346, 0.2619, 0.2943, 0.2723, 2.3372, 0.1226],
    W: [
      [-0.208, -0.337, 0.029, 0.2054, -0.2103, -0.101, 0.1291, -0.0424, -0.8325, -0.4948, -0.2878],
      [0.208, 0.337, -0.029, -0.2054, 0.2103, 0.101, -0.1291, 0.0424, 0.8325, 0.4948, 0.2878]
    ]
  },
  /** Eğitimde görülmeyen kayıtlarla ölçülen sonuçlar (bloklu çapraz doğrulama, eşik 0.7). */
  measured: {
    idle: { normalCars: 318, falseAlarms: 10, faultClips: 245, caught: 95 },
    brake: { normalClips: 77, falseAlarms: 2, faultClips: 76, caught: 60 }
  }
};
