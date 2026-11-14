/**
 * Etiketli ses örneklerinden öğrenilmiş iki küçük model (lojistik regresyon, 10 ses özelliği, 1,5 sn pencereler).
 * Bu dosya scripts/train-learned.mjs ile üretilir; elle değiştirmeyin.
 * Kaynaklar, ölçülen başarı ve lisans durumu: docs/ogrenen-model.md
 *
 * Eğitim verisi:
 *  - "Car Diagnostics Dataset" (Kaggle; lisansı "Unknown" olarak belirtilmiş): 1,5 sn parçalar.
 *  - Gerçek araçların normal rölanti kayıtları (Zenodo 18777405, CC BY 4.0): kayıt başına en çok 3 pencere.
 *  - Telefonla kaydedilmiş motor sesleri (Hugging Face, RashmiKarunarathne/MyDataSet; lisans belirtilmemiş).
 * Uygulamada ses dosyası yoktur; yalnızca aşağıdaki katsayılar bulunur.
 */
export const LEARNED = {
  trainedAt: "2026-11-14",
  windowSeconds: 1.5,
  /** Rölanti: sınıflar [normal, kayış tarafı, yağ azlığı, tekleme, supap]. Yalnızca "kayış tarafı" ve "supap" kullanılır. */
  idle: {
    mu: [10.8831, 0.0861, 0.1295, 0.5077, 0.281, 0.2688, 0.3324, 0.3987, 8.4477, 0.1465],
    sd: [1.0002, 0.1675, 0.1946, 0.2942, 0.23, 0.2436, 0.2099, 0.2469, 2.0097, 0.1236],
    W: [
      [0.084, -0.1855, -0.6106, -0.5608, 0.5112, 0.4298, -0.2472, -0.2138, 0.0019, 0.2208, 0.7168],
      [-0.8506, 0.3482, -0.1576, -0.3193, -0.1, -0.1654, -1.0907, 1.0904, 0.3817, 0.5285, -0.0035],
      [-0.34, 0.5064, 0.6524, -0.1228, 0.3753, 0.0904, 0.2488, -0.3007, -0.1313, 0.2234, 0.2496],
      [0.914, -0.1247, -0.3605, 0.2002, -0.2868, 0.1701, 0.2187, -0.3537, -0.2925, -0.0006, 0.4575],
      [0.1926, -0.5444, 0.4762, 0.8028, -0.4997, -0.525, 0.8704, -0.2221, 0.0402, -0.972, -1.4204]
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
    belt: { normal: 664, falseAlarms: 8, faulty: 304, caught: 133 },
    valve: { normal: 664, falseAlarms: 0, faulty: 68, caught: 30 },
    brake: { normal: 77, falseAlarms: 2, faulty: 76, caught: 60 }
  }
};
