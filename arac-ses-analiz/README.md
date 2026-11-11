# Araç Ses Teşhisi

Aracın sesinden olası arızayı, aracın neresinden geldiğini ve olasılığını tahmin eden web uygulaması.
Amaç, sürücünün servise bilgili gitmesidir. Sonuç bir **ön tahmindir**, kesin teşhis değildir.

## Ne yapar

1. **Araç:** marka, model, yıl, yakıt ve kilometre alınır (tarayıcıda saklanır).
2. **Belirti:** sesin ne zaman çıktığı seçilir.
3. **Kayıt:** mikrofonla kayıt yapılır ya da ses/video dosyası yüklenir. Kayıt kalitesi denetlenir
   (çok kısa, çok sessiz ya da patlayan kayıtlar için uyarı verilir).
4. **Sonuç:** en olası bölge, olası arızalar ve yüzdeleri, araç çiziminde konum, aciliyet ve öneri gösterilir.
   Takip soruları benzer ses çıkaran parçaları ayırır. Özet ve kayıt "İkinci görüş al" ile paylaşılır.

Kayıtlar cihazdan dışarı çıkmaz; yalnızca kullanıcı paylaşırsa gönderilir. Sunucu yoktur.

## Çalıştırma

Kurulum gerekmez (Node.js 20+ yeterlidir, bağımlılık yoktur).

```bash
npm start          # http://localhost:8080
npm test           # birim testleri
npm run test:e2e   # tarayıcıda uçtan uca test (Playwright ve Chromium gerekir)
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
  audio/              Ses işleme
    features.js         Özellik çıkarımı (ton, darbe, ritim, spektrum)
    quality.js          Kayıt kalitesi denetimi
    synth.js            Yapay örnek arıza sesleri
    recorder.js         Mikrofon kaydı ve dosya çözme (tarayıcı)
    context.js          Ses çalma (tarayıcı)
    fft.js, wav.js      Yardımcılar
  engine/diagnose.js  Teşhis motoru: olasılıklar, bölge, güven, soru seçimi
  ui/                 Ekran modülleri (form, kayıt, sonuç, çizim, paylaşım)
    icons.js            Çizgi ikonları
    animate.js          Sayaç ve animasyon yardımcıları
    waveform.js         Dalga ve canlı spektrum çizimi
tests/                Birim testleri (node:test)
scripts/              Geliştirme sunucusu ve uçtan uca test
```

`data/`, `audio/features.js`, `audio/quality.js`, `audio/synth.js` ve `engine/` tarayıcıya bağlı değildir;
Node.js'te doğrudan test edilir.

## İçerik ekleme

- **Yeni arıza:** `js/data/faults.js` içine kayıt, `js/audio/synth.js` içine aynı kimlikle örnek ses eklenir.
- **Yeni takip sorusu:** `js/data/questions.js` içine eklenir; motor, adayları en çok ayıran soruları kendisi seçer.
- **Modele özgü sorun:** `js/data/known-issues.js` içine eklenir.

`npm test` veri tutarlılığını (eksik konum, tanımsız arıza kimliği vb.) denetler.

## Teşhis nasıl hesaplanır

Her arıza için: `ses benzerliği × sürüş durumları × araç bilgisi × soru cevapları` çarpılır ve olasılığa çevrilir.
Ses benzerliği; frekans, tonluluk, darbelilik ve ritmin arızanın profiline uyumundan gelir.

## Bilinen sınırlar

- Ses profilleri elle yazılmış kurallardır. Doğruluk yalnızca **yapay örnek seslerle** sınanmıştır; gerçek
  kayıtlardaki isabet henüz ölçülmemiştir.
- Alt takım parçaları (rotil, rot başı, Z rot vb.) sesle birbirinden güvenilir biçimde ayrılamaz; ayrımı
  takip soruları yapar. Kesin tespit için aracın liftte kontrolü gerekir.
- Arızanın sol/sağ tarafı tek kayıttan belirlenemez.
- Videolardan yalnızca ses kullanılır; görüntü analizi yoktur.
