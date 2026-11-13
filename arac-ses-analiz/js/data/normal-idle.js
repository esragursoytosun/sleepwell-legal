/**
 * Normal rölanti sesinin aralığı: 319 gerçek aracın rölanti kaydından ölçülmüştür (182 dizel, 137 benzinli).
 * Her özellik için kayıtların ortadaki %95'inin kapsadığı aralık verilir.
 *
 * Kaynak: Ciric, D. ve Milivojčević, M. (2024). "Sounds of Vehicle Internal Combustion Engines". Zenodo,
 * kayıt 18777405. Lisans: CC BY 4.0. Ses dosyaları uygulamada yer almaz; yalnızca bu istatistikler kullanılır.
 *
 * Sınır: kayıtlar bir otopark girişinde, aracın dışından alınmıştır; kaput açıkken motora yakın tutulan bir
 * telefonun kaydıyla birebir aynı koşul değildir. Bu yüzden sonuç bir gösterge olarak sunulur, hüküm olarak değil.
 */
export const NORMAL_IDLE = {
  recordings: 319,
  /** Normal kayıtlar içinde kalıcı ton ölçülenlerin sayısı. */
  withTone: 4,
  ranges: {
    dizel: { tonal: [0, 0.342], imp: [0, 0.665], logCentroid: [9.047, 11.776], low: [0.117, 0.814], high: [0.088, 0.706] },
    benzin: { tonal: [0, 0.531], imp: [0, 1], logCentroid: [8.567, 11.963], low: [0.081, 0.89], high: [0.051, 0.783] }
  }
};
