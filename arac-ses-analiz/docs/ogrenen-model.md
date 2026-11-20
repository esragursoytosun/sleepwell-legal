# Öğrenen model

Kural tabanlı teşhisin yanında, etiketli gerçek kayıtlardan öğrenilmiş iki küçük model çalışır. Modeller
teşhisin yerine geçmez: yalnızca eğitildikleri durumda devreye girer ve bir arızanın ağırlığını en çok
2,5 kat artırabilir. Model bir kaydı hiçbir zaman "sağlam" diye aklamaz; yalnızca şüpheyi güçlendirir.

| Model | Ne zaman çalışır | Neyi destekler |
|---|---|---|
| Kayış tarafı | "Rölantide" seçiliyken (sürüş belirtisi seçilmemişse) | V-kayış / gergi, alternatör, direksiyon pompası |
| Supap | "Rölantide" seçiliyken (sürüş belirtisi seçilmemişse) | Supap / hidrolik itici tıkırtısı |
| Fren | "Fren yaparken" seçiliyken | Balata aşınması, disk sürtünmesi |

Kayıt 1,5 saniyelik pencerelere bölünür, her pencere için benzerlik hesaplanır ve ortalaması alınır.
Ortalama eşiğin altındaysa (kayış ve fren 0,7; supap 0,6) model görüş bildirmez. Hesap tümüyle tarayıcıda yapılır; ses hiçbir yere gönderilmez.

## Ölçülen başarı (eğitimde görülmeyen kayıtlarla)

`npm run train -- <kaggle-klasörü> <normal-rölanti-klasörü> <telefon-kayıtları-klasörü>` her çalıştırmada bu
sayıları yeniden ölçer ve `js/data/learned-models.js` içine yazar (bloklu çapraz doğrulama, kayıt düzeyinde).

| Model | Yanlış alarm | Yakalanan arıza |
|---|---|---|
| Kayış tarafı | 664 normal kayıtta 8 (%1) | 304 arızalı kayıttan 133 (%44) |
| Supap | 664 normal kayıtta 0 | 68 arızalı kayıttan 30 (%44) |
| Fren | 77 normal fren kaydında 2 | 76 aşınmış fren kaydından 60 |

### Bağımsız kaynakla sınama (2026-11-14)

Kayış modelinin ilk sürümü yalnızca Kaggle ve Zenodo verisiyle eğitilmişti. Sonradan bulunan, **hiç görmediği**
telefon kayıtlarıyla (Hugging Face veri seti, 321 kayıt, 7 farklı araç modeli) sınandı:

- 59 kayış arızası kaydının 51'ini yakaladı.
- 83 sağlam motor kaydının hiçbirinde yanlış alarm vermedi; 111 tekleme kaydının 1'inde, 68 supap kaydının
  0'ında "kayış" dedi.

Bu, modelin yalnızca tek bir veri setinin kayıt koşullarını ezberlemediğini gösteren ilk kanıttır. Bu veri
seti sonra eğitime katıldığı için artık bağımsız sınama verisi değildir; elimizdeki bağımsız örnek yine
gerçek vakalardır (T-Roc: kayış tarafı, doğru).

### Bilinen sınırlar — dürüst not

- Supap örneklerinin tamamı tek bir veri setinden geliyor; supap modeli başka kaynakla sınanmadı.
- Normal araç kayıtları eğitime katılmadan önce ilk denenen model 889 normal pencerenin 731'inde yanlış alarm
  veriyordu. Başka telefonlarla ve başka ortamlarda yanlış alarm oranı buradaki ölçümden yüksek çıkabilir.
  Bu yüzden modelin etkisi sınırlı tutulur.
- Denenip **kullanılmayanlar:** tekleme (111 kaydın hiçbirini güvenli eşikte yakalayamadı; bu ses özellikleriyle
  ayırt edilemiyor), "yağ azlığı" sınıfı (tanımadığı sesleri bu sınıfa atıyordu), direksiyon pompasını kayıştan
  ayırma, marş/akü/ateşleme modelleri (%65 civarı), MFCC tabanlı modeller (kaynaklar arası daha kötü genelledi).
- Gerçek vakalar (`tests/cases`) biriktikçe model bu vakalarla yeniden sınanmalı ve eğitilmelidir.

## Yeni bir sesi öğretmek

Depodaki vakalar (`tests/cases`) ve referans sesler (`tests/reference`) `windows` alanı taşıyorsa —
kaydın 1,5 sn'lik pencerelerinin ölçümleri — `npm run train` onları kendiliğinden eğitime katar. Tek bir
video yüzlerce örnek arasında küçük bir ağırlık taşır; modelin bir sesi güvenle tanıması için aynı türden
çok sayıda kayıt gerekir.

## Veri kaynakları ve lisans durumu

| Kaynak | Ne için | Lisans |
|---|---|---|
| Car Diagnostics Dataset (Kaggle) | Arızalı ve normal örnekler | **"Unknown" (belirtilmemiş)**; veri seti sayfası kayıtların stok ses sitelerinden ve video platformlarından derlendiğini söylüyor |
| Sounds of Vehicle Internal Combustion Engines (Zenodo 18777405) | Normal rölanti kayıtları | CC BY 4.0 |
| RashmiKarunarathne/MyDataSet (Hugging Face) | Telefonla kaydedilmiş sağlam, kayış, tekleme ve supap örnekleri | **Belirtilmemiş** (veri seti sayfasında lisans yok) |

Depoda ve uygulamada **ses dosyası yoktur**; yalnızca ölçümlerden öğrenilmiş katsayılar bulunur.

> **Ticarileşmeden önce yapılacak:** Kaggle ve Hugging Face veri setlerinin lisansı belirsizdir. Proje sahibi, uygulama şu an
> ticari olmadığı için bu veriyle eğitilmiş modelin kullanılmasına karar vermiştir (2026-11-14). Uygulama
> ücretli hale gelmeden ya da mağazada yayımlanmadan önce bu model ya lisansı açık verilerle (kendi
> kullanıcı vakalarımız, OtoMobile vb.) yeniden eğitilmeli ya da veri seti sahiplerinden yazılı izin alınmalıdır.
> Modeli kapatmak için `js/engine/learned.js` içindeki `learnedOpinion` işlevinin `null` döndürmesi yeterlidir.
