# Öğrenen model

Kural tabanlı teşhisin yanında, etiketli gerçek kayıtlardan öğrenilmiş iki küçük model çalışır. Modeller
teşhisin yerine geçmez: yalnızca eğitildikleri durumda devreye girer ve bir arızanın ağırlığını en çok
2,5 kat artırabilir. Model bir kaydı hiçbir zaman "sağlam" diye aklamaz; yalnızca şüpheyi güçlendirir.

| Model | Ne zaman çalışır | Neyi destekler |
|---|---|---|
| Kayış tarafı | "Rölantide" seçiliyken (sürüş belirtisi seçilmemişse) | V-kayış / gergi, alternatör, direksiyon pompası |
| Fren | "Fren yaparken" seçiliyken | Balata aşınması, disk sürtünmesi |

Kayıt 1,5 saniyelik pencerelere bölünür, her pencere için benzerlik hesaplanır ve ortalaması alınır.
Ortalama 0,7'nin altındaysa model görüş bildirmez. Hesap tümüyle tarayıcıda yapılır; ses hiçbir yere gönderilmez.

## Ölçülen başarı (eğitimde görülmeyen kayıtlarla)

`npm run train -- <kaggle-klasörü> <normal-rölanti-klasörü>` her çalıştırmada bu sayıları yeniden ölçer ve `js/data/learned-models.js` içine yazar.

- **Kayış tarafı:** 318 normal aracın 10'unda yanlış alarm (%3). 245 arızalı parçanın 95'i yakalandı (%39).
  Gerçek vakamızda (T-Roc, kayış tarafı sesi) model %78 benzerlikle doğru tarafı gösterdi.
- **Fren:** 77 normal fren kaydının 2'sinde yanlış alarm; 76 aşınmış fren kaydının 60'ı yakalandı.

### Bilinen sınırlar — dürüst not

- Arızalı örneklerin tamamı tek bir veri setinden geliyor. Model, arızanın sesiyle birlikte o veri setinin
  kayıt koşullarını da öğrenmiş olabilir. Normal araç kayıtları eğitime katılmadan önce ilk denenen model 889 normal
  pencerenin 731'inde yanlış alarm veriyordu; katıldıktan sonra %3'e indi. Başka telefonlarla alınan kayıtlarda
  yanlış alarm oranı bu ölçümden yüksek çıkabilir. Bu yüzden modelin etkisi sınırlı tutulur.
- Denenip **kullanılmayanlar:** "yağ azlığı" sınıfı (tanımadığı her sesi bu sınıfa atıyordu), direksiyon
  pompasını kayıştan ayırma (güvenli eşikte hiç yakalayamadı), marş/akü/ateşleme modelleri (%65 civarı),
  MFCC tabanlı modeller (kaynaklar arası daha kötü genelledi).
- Gerçek vakalar (`tests/cases`) biriktikçe model bu vakalarla yeniden sınanmalı ve eğitilmelidir.

## Veri kaynakları ve lisans durumu

| Kaynak | Ne için | Lisans |
|---|---|---|
| Car Diagnostics Dataset (Kaggle) | Arızalı ve normal örnekler | **"Unknown" (belirtilmemiş)**; veri seti sayfası kayıtların stok ses sitelerinden ve video platformlarından derlendiğini söylüyor |
| Sounds of Vehicle Internal Combustion Engines (Zenodo 18777405) | Normal rölanti kayıtları | CC BY 4.0 |

Depoda ve uygulamada **ses dosyası yoktur**; yalnızca ölçümlerden öğrenilmiş katsayılar bulunur.

> **Ticarileşmeden önce yapılacak:** Kaggle veri setinin lisansı belirsizdir. Proje sahibi, uygulama şu an
> ticari olmadığı için bu veriyle eğitilmiş modelin kullanılmasına karar vermiştir (2026-11-14). Uygulama
> ücretli hale gelmeden ya da mağazada yayımlanmadan önce bu model ya lisansı açık verilerle (kendi
> kullanıcı vakalarımız, OtoMobile vb.) yeniden eğitilmeli ya da veri seti sahibinden yazılı izin alınmalıdır.
> Modeli kapatmak için `js/engine/learned.js` içindeki `learnedOpinion` işlevinin `null` döndürmesi yeterlidir.
