/** Uygulama ayarları. Yayına almadan önce buradaki değerleri gözden geçirin. */
export const CONFIG = {
  appName: "Araç Ses Teşhisi",
  /** "İkinci görüş al" mesajlarının gideceği WhatsApp numarası, ülke koduyla ve yalnızca rakam (ör. "905321234567").
   *  Boş bırakılırsa kullanıcı kişiyi WhatsApp'ta kendisi seçer. */
  whatsappNumber: "",
  maxRecordSeconds: 15,
  minRecordSeconds: 3,
  /** Analizde kullanılan en uzun süre (saniye). */
  analysisSeconds: 12,
  /** Aynı anda gösterilecek takip sorusu sayısı. */
  questionsPerRound: 3,
  /** Sonuç listesinde gösterilecek arıza sayısı. */
  resultsShown: 5
};
