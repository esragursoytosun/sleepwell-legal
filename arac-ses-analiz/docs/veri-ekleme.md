# Veri ekleme rehberi

Uygulamanın doğruluğu ve kullanıcıyı koruma gücü üç tür gerçek veriden gelir. Hiçbirine tahmini ya da uydurma
veri eklenmez; her kaydın bir kaynağı olur.

## 1. Gerçek vakalar (doğruluk ölçümü)

Kullanıcı videosu ya da ses kaydı + sonradan öğrenilen gerçek sonuç = bir vaka.

- Dosya: `tests/cases/<tarih>-<kısa-ad>.json` (örnek: `2026-11-troc-kayis-tarafi.json`)
- **Ses ve görüntü saklanmaz**; yalnızca uygulamanın ölçtüğü ses özellikleri (`features`) saklanır.
  Uygulamadaki "Sonuç ne oldu?" → "Ekibimize gönder" aynı biçimde bir kayıt üretir.
- `expect.group`: arızanın bölgesi (zorunlu)
- `expect.fault`: kesin arıza biliniyorsa (ör. servis faturasından) arıza kimliği
- `expect.anyOfTop3`: kesin değilse olası arızalar

Ölçüm: `npm run evaluate` her vaka için sonucu ve toplam doğruluğu yazar. `npm test` her vakanın beklentiyi
karşıladığını denetler; bir değişiklik gerçek bir vakayı bozarsa test başarısız olur.

### İyi bir vaka için kayıt önerileri

- 10–30 saniyelik video; telefonu sesin olduğu bölgede yavaşça gezdirin (konum tespiti için).
- Önce rölantide, sonra gaz vererek kaydedin.
- Araç bilgisi: marka, model, yıl, yakıt, km.
- Servis sonrası: hangi parça değişti, ses geçti mi, fatura tutarı.

## 2. Fiyatlar

- Dosya: `js/data/prices.js` (alanların açıklaması dosyanın başında)
- Kaynak: anlaşmalı ustaların ve parçacıların yazılı fiyatı ya da kullanıcı faturaları
- Her kayda `source` ve `updated` yazılır. 6 aydan eski fiyatlar arayüzde "eski olabilir" uyarısıyla gösterilir.
- Mümkünse aynı kalem için hem orijinal hem muadil kaydı girin.

## 3. Güvenilir ustalar

- Dosya: `js/data/mechanics.js`
- Ekleme koşulları: `docs/usta-agi.md` → "Ağa kabul"
- `stats` her tamamlanan işten sonra güncellenir.

Eklemelerden sonra `npm test` çalıştırın; tanımsız parça ya da bölge kimliği varsa testler yakalar.

## 4. Sosyal medyadan referans sesler

TikTok, Instagram ve YouTube'daki "bu arıza böyle ses çıkarır" videoları ses profillerini ayarlamak için yol
göstericidir, ama etiketleri doğrulanmamıştır ve sesler çoğu zaman kurgulanmıştır.

- Dosya: `tests/reference/<ad>.json`; her ses parçası için arıza kimliği ve ölçülen özellikler.
- **Ses ve görüntü saklanmaz, uygulamada gösterilmez.** Yalnızca ölçümler tutulur.
- `npm run evaluate` bu sesleri ayrı bir bölümde raporlar; **doğruluk oranına katılmaz** ve testleri bağlamaz.
- Tek bir videoya göre profil değiştirilmez. Aynı arıza için birkaç bağımsız kaynak aynı şeyi gösterdiğinde
  ya da bilinen bir gerçekle örtüştüğünde değiştirilir (ör. fren ötmesinin frekans aralığı).
