# Araç Ses Teşhisi

Aracın sesinden olası arızayı, aracın neresinden geldiğini ve olasılığını tahmin eden web uygulaması.
Amaç, sürücünün servise bilgili gitmesidir. Sonuç bir **ön tahmindir**, kesin teşhis değildir.

## Ne yapar

1. **Araç:** marka, model, yıl, yakıt, kilometre ve şehir alınır (tarayıcıda saklanır).
2. **Belirti:** sesin ne zaman çıktığı seçilir.
3. **Kayıt:** mikrofonla kayıt yapılır ya da ses/video dosyası yüklenir. Kayıt kalitesi denetlenir
   (çok kısa, çok sessiz ya da patlayan kayıtlar için uyarı verilir).
4. **Sonuç:**
   - En olası bölge ve arızalar, yüzdeleri ve araç çiziminde yerleri.
   - **Ne yapmalısınız?** Aciliyet, garanti uyarısı (yeni araçlarda yetkili servis), kendi yapabileceğiniz kontroller,
     ustaya söylenecekler, kazık işareti olabilecek durumlar, makul fiyat (veri varsa) ve bölgedeki doğrulanmış ustalar.
   - **Neden bu sonuç?** Sesin ölçülen özellikleri ve destekleyen belirtiler. Video yüklenmişse sesin en güçlü olduğu
     an ve o anın karesi gösterilir; telefon kaynağa yaklaştıkça ses güçlendiği için bu kare sesin yerini gösterir.
   - Takip soruları benzer ses çıkaran parçaları ayırır.
   - **Teklif kontrolü:** ustanın teklifindeki kalemler teşhisle karşılaştırılır; sesle ilgisiz pahalı kalemler uyarılır.
   - **Sonuç ne oldu?** Servisten sonra gerçek sonuç kaydedilir ve isterse ekibe gönderilir (doğruluk ölçümü için).

Kayıtlar cihazdan dışarı çıkmaz; yalnızca kullanıcı paylaşırsa gönderilir. Sunucu yoktur.

## Çalıştırma

Kurulum gerekmez (Node.js 20+ yeterlidir, bağımlılık yoktur).

```bash
npm start          # http://localhost:8080
npm test           # birim testleri
npm run test:e2e   # tarayıcıda uçtan uca test (Playwright ve Chromium gerekir)
npm run evaluate   # gerçek vakalarda doğruluk ölçümü
```

Mikrofon yalnızca `https://` adreslerinde ya da `localhost`ta çalışır. `index.html` dosyasını doğrudan
açmak (`file://`) çalışmaz; `npm start` kullanın.

## Yayınlama

Uygulama tamamen statik dosyalardan oluşur; derleme adımı yoktur. Klasör, HTTPS sunan herhangi bir statik
barındırmaya (GitHub Pages, Netlify, Cloudflare Pages) olduğu gibi yüklenebilir.

## Ayarlar

`js/config.js`:

| Ayar | Açıklama |
|---|---|
| `whatsappNumber` | "İkinci görüş al" mesajının gideceği numara (ülke koduyla, yalnızca rakam). Boşsa kullanıcı kişiyi kendisi seçer. |
| `maxRecordSeconds` | En uzun kayıt süresi |
| `questionsPerRound` | Aynı anda gösterilen takip sorusu sayısı |
| `resultsShown` | Listelenen arıza sayısı |

## Tasarım

Açık ve koyu tema (cihaz ayarını izler). Adım geçişleri, kayıt sırasında ses düzeyine tepki veren düğme ve süre
halkası, canlı spektrum, analiz sırasında tarama animasyonu, dolan olasılık göstergesi, sayarak artan yüzdeler ve
cevap verildikçe yer değiştiren arıza kartları vardır. "Hareketi azalt" tercihinde animasyonlar kapanır.

## Klasör yapısı

```
index.html            Sayfa iskeleti (4 adım)
css/app.css           Stiller (açık ve koyu tema)
js/
  main.js             Giriş noktası; adımlar arası akış
  config.js           Ayarlar
  state.js            Oturum durumu, araç bilgisinin saklanması
  data/               İçerik: yalnızca veri, kod yok
    faults.js           Arızalar, gruplar, konumlar, ses profilleri
    questions.js        Takip soruları ve etkileri
    known-issues.js     Modele özgü sık bildirilen sorunlar
    vehicles.js         Marka ve modeller
    conditions.js       Sürüş durumları
    guidance.js         Arıza başına kontroller, ustaya söylenecekler, kırmızı bayraklar
    parts.js            Teklif/fatura kalemleri
    prices.js           Doğrulanmış fiyat aralıkları (gerçek veri gelene kadar boş)
    mechanics.js        Doğrulanmış ustalar (kabul sürecinden geçenler; şimdilik boş)
  audio/              Ses işleme
    features.js         Özellik çıkarımı (ton, darbe, ritim, spektrum)
    quality.js          Kayıt kalitesi denetimi
    locate.js           Sesin zaman içindeki gücü (videodan konum)
    synth.js            Yapay örnek arıza sesleri
    recorder.js         Mikrofon kaydı ve dosya çözme (tarayıcı)
    context.js          Ses çalma (tarayıcı)
    fft.js, wav.js      Yardımcılar
  engine/
    diagnose.js         Teşhis motoru: olasılıklar, bölge, güven, soru seçimi
    explain.js          "Neden bu sonuç?" gerekçeleri
    advice.js           Eylem planı: aciliyet, garanti, fiyat, usta eşleştirme
    quote.js            Teklif kontrolü
  ui/                 Ekran modülleri (form, kayıt, sonuç, çizim, paylaşım)
    icons.js            Çizgi ikonları
    animate.js          Sayaç ve animasyon yardımcıları
    waveform.js         Dalga ve canlı spektrum çizimi
tests/                Birim testleri (node:test)
  cases/              Gerçek vakalar (yalnızca ölçülen ses özellikleri; ses/görüntü saklanmaz)
scripts/              Geliştirme sunucusu, uçtan uca test, doğruluk ölçümü
docs/
  usta-agi.md         Güvenilir usta ağına kabul, çalışma kuralları, puanlama, denetim
  veri-ekleme.md      Gerçek vaka, fiyat ve usta ekleme rehberi
```

`data/`, `audio/features.js`, `audio/quality.js`, `audio/synth.js` ve `engine/` tarayıcıya bağlı değildir;
Node.js'te doğrudan test edilir.

## İçerik ekleme

- **Yeni arıza:** `js/data/faults.js` içine kayıt, `js/audio/synth.js` içine aynı kimlikle örnek ses eklenir.
- **Yeni takip sorusu:** `js/data/questions.js` içine eklenir; motor, adayları en çok ayıran soruları kendisi seçer.
- **Modele özgü sorun:** `js/data/known-issues.js` içine eklenir.
- **Gerçek vaka, fiyat, usta:** `docs/veri-ekleme.md`

`npm test` veri tutarlılığını (eksik konum, tanımsız arıza kimliği vb.) denetler.

## Teşhis nasıl hesaplanır

Her arıza için: `ses benzerliği × sürüş durumları × araç bilgisi × soru cevapları` çarpılır ve olasılığa çevrilir.
Ses benzerliği; frekans, tonluluk, darbelilik ve ritmin arızanın profiline uyumundan gelir.
Kayıt boyunca süren sabit bir ton (ıslık, vınlama) ayrıca aranır; bulunursa tonlu arızalar o tona göre
değerlendirilir. Böylece motorun normal tıkırtısı, gerçek kayıtlarda tonun kaynağını gölgelemez.

## Bilinen sınırlar

- Ses profilleri elle yazılmış kurallardır. Gerçek kayıtlarla ölçüm yeni başladı (`npm run evaluate`);
  bugün 1 gerçek vaka var. Doğruluk oranı, yeterli vaka birikmeden uygulamada gösterilmez.
- Alt takım parçaları (rotil, rot başı, Z rot vb.) sesle birbirinden güvenilir biçimde ayrılamaz; ayrımı
  takip soruları yapar. Kesin tespit için aracın liftte kontrolü gerekir.
- Arızanın sol/sağ tarafı tek kayıttan belirlenemez.
- Videodaki görüntü yalnızca sesin en güçlü olduğu anı göstermek için kullanılır; parçaların görüntüden
  tanınması yoktur.
- Fiyat ve usta verisi henüz boştur; gerçek veri gelene kadar uygulama fiyat yorumu yapmaz.
