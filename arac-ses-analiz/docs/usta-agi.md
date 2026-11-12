# Güvenilir usta ağı: kabul ve çalışma kuralları

Uygulama bir ustayı "güvenilir" diye gösteriyorsa, bu bir iddia değil, aşağıdaki kurallarla ölçülen bir durumdur.
Kullanıcının güveni bu kurallara bağlıdır; hiçbir kural para karşılığında esnetilmez.

## 1. Ağa kabul

Bir usta ancak şu adımların hepsi tamamlanınca `js/data/mechanics.js` dosyasına eklenir:

1. **Kimlik ve işletme:** vergi levhası, açık adres, işletmenin fotoğrafı.
2. **Referans:** en az 3 müşteriyle kısa görüşme (telefonla yeterli).
3. **Deneme işleri:** ilk 3 iş ekip tarafından izlenir: teklif, fatura ve değişen parça fotoğrafı karşılaştırılır.
4. **Kuralların kabulü:** aşağıdaki çalışma kuralları imzalı olarak kabul edilir.

Kabul tarihi `verifiedAt` alanına yazılır.

## 2. Çalışma kuralları

1. **Önce teşhis, sonra fiyat, sonra onay.** Kullanıcının onayı olmadan hiçbir parça değiştirilmez.
2. **Yazılı teklif:** parça ve işçilik ayrı ayrı; parçanın orijinal mi muadil mi olduğu belirtilir.
3. **Teklife sadakat:** fatura, teklifi aşamaz. Ek iş çıkarsa iş durdurulur, ek iş fotoğrafla gösterilip kullanıcıdan
   onay alınır.
4. **Eski parça:** değişen her parça kullanıcıya gösterilir ve isterse geri verilir; fotoğrafı kayda eklenir.
5. **Ön ödeme yok:** iş başlamadan ödeme istenmez (sipariş usulü özel parça hariç; bu durumda yazılı bilgi verilir).
6. **Garanti:** aracın üretici garantisinde olduğu anlaşılırsa kullanıcı yetkili servise yönlendirilir.

## 3. Puanlama

Her tamamlanan iş için `stats` güncellenir:

- `jobs`: tamamlanan iş sayısı
- `keptQuote`: faturanın teklifi aşmadığı iş sayısı

Uygulama ustaları **teklife sadakat oranına** (`keptQuote / jobs`), sonra iş sayısına göre sıralar.
Ücretli öne çıkarma yoktur.

## 4. Denetim

- **Gizli müşteri:** her usta yılda en az bir kez, arızası bilinen bir araçla habersiz denetlenir.
  Teşhis ve fiyat kayda geçer.
- **Şikâyet:** kullanıcı "teklif ile fatura farklı" ya da "gereksiz parça değişti" bildirirse ekip iki iş günü içinde
  iki tarafla görüşür.

## 5. Ağdan çıkarma

Aşağıdakilerden biri olursa usta ağdan çıkarılır:

- Onaysız parça değişimi
- Faturanın teklifi açıklamasız aşması (bir kez uyarı, tekrarında çıkarma)
- Gizli müşteri denetiminde gereksiz parça önerisi
- Teklife sadakat oranının %80'in altına düşmesi (en az 10 işten sonra)
