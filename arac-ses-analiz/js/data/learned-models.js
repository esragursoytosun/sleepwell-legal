/**
 * Etiketli ses örneklerinden öğrenilmiş iki küçük model (lojistik regresyon, 10 ses özelliği, 1,5 sn pencereler).
 * Bu dosya scripts/train-learned.mjs ile üretilir; elle değiştirmeyin.
 * Kaynaklar, ölçülen başarı ve lisans durumu: docs/ogrenen-model.md
 *
 * Eğitim verisi:
 *  - "Car Diagnostics Dataset" (Kaggle; lisansı "Unknown" olarak belirtilmiş): 1,5 sn parçalar.
 *  - Gerçek araçların normal rölanti kayıtları (Zenodo 18777405, CC BY 4.0): kayıt başına en çok 3 pencere.
 *  - Telefonla kaydedilmiş motor sesleri (Hugging Face, RashmiKarunarathne/MyDataSet; lisans belirtilmemiş).
 *  - Depodaki vakalar ve referans sesler (tests/cases, tests/reference; yalnızca ölçülen pencereler).
 * Uygulamada ses dosyası yoktur; yalnızca aşağıdaki katsayılar bulunur.
 */
export const LEARNED = {
  trainedAt: "2026-11-20",
  windowSeconds: 1.5,
  /** Rölanti: sınıflar [normal, kayış tarafı, yağ azlığı, tekleme, supap]. Yalnızca "kayış tarafı" ve "supap" kullanılır. */
  idle: {
    mu: [10.8876, 0.0883, 0.1295, 0.5083, 0.2807, 0.2676, 0.3325, 0.3999, 8.4641, 0.1494],
    sd: [0.9978, 0.1725, 0.194, 0.2933, 0.2295, 0.2432, 0.2092, 0.2465, 2.0129, 0.1294],
    W: [
      [0.0713, -0.1899, -0.6085, -0.5601, 0.5061, 0.4238, -0.2553, -0.2014, 0.0008, 0.2137, 0.7065],
      [-0.8079, 0.3356, -0.1682, -0.3107, -0.1031, -0.1629, -1.0634, 1.0635, 0.3768, 0.591, 0.044],
      [-0.3429, 0.5236, 0.6554, -0.1252, 0.3778, 0.0917, 0.2471, -0.3003, -0.1296, 0.2264, 0.2433],
      [0.8901, -0.129, -0.3555, 0.1951, -0.2848, 0.1689, 0.207, -0.3424, -0.2888, -0.0276, 0.4474],
      [0.1894, -0.5402, 0.4768, 0.8009, -0.496, -0.5216, 0.8646, -0.2193, 0.0409, -1.0034, -1.4412]
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
  /** Eğitimde görülmeyen kayıtlarla ölçülen sonuçlar (bloklu çapraz doğrulama, kayıt düzeyinde). */
  measured: {
    belt: { normal: 664, falseAlarms: 8, faulty: 306, caught: 137 },
    valve: { normal: 664, falseAlarms: 0, faulty: 68, caught: 30 },
    brake: { normal: 77, falseAlarms: 2, faulty: 76, caught: 60 }
  }
};
