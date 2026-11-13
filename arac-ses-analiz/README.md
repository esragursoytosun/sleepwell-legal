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
   - **Ölçerek netleştirme:** motor bölmesi seslerinde kullanıcı 5 saniyelik test kayıtları yapar (gaz vererek,
     klimayı değiştirerek, elektrik yükü vererek). Uygulama test kaydını ilk kayıtla karşılaştırır ve ilgili soruyu
     kendisi cevaplar: ton devirle inceliyor mu, değişiklik sesi etkiliyor mu?
   - **Normal sesle karşılaştırma:** rölantide alınan kayıt, 319 gerçek aracın normal rölanti sesinden çıkarılan
     aralıkla karşılaştırılır. Aralıktaysa "normal rölanti sesine benziyor" denir ve arıza listesine güven düşürülür;
     dışındaysa neyin farklı olduğu yazılır.
   - **Sesle ayırt edilebilirlik:** yalnızca referans ölçümlerde iyi ayrışan arızalar (balata, Z rot, aks, rulman)
     yalın gösterilir; diğerlerinde "sesle ayırt etmek zor" notu çıkar.
   - **Arıza kodu:** servis ya da OBD cihazının okuduğu kodlar (ör. P0301) girilir; kodun işaret ettiği sistem
     olasılıklara ve gerekçeye yansır. Tanınmayan kodlar açıkça belirtilir.
   - **Önceki hâliyle karşılaştırma:** araç sağlamken alınan kayıt referans olarak saklanır; sonraki kayıtlarda
     yeni bir ton, artan vuruntu ya da değişen ritim ölçülür. Kayıt referansa benziyorsa bu açıkça söylenir.
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

- **Üç boyutlu araç:** saydam "röntgen" gövde içinde motor, kayış, egzoz, frenler ve ön takım parçaları görünür.
  Arızanın olası yeri ışıkla işaretlenir, araç o parçaya döner ve sürüklenerek döndürülebilir. Gövde, seçilen modelin
  tipine (hatchback, sedan, SUV, hafif ticari) ve yaklaşık gerçek ölçülerine (uzunluk, yükseklik, dingil mesafesi)
  göre çizilir. Bu bir oran benzerliğidir; markaya özgü tasarım hatları yoktur. WebGL yoksa iki boyutlu çizim gösterilir.
- **Kullanıcının araç fotoğrafı:** isteğe bağlı eklenir, sahnede ve sonuçta görünür. Küçültülerek yalnızca cihazda
  saklanır; hiçbir yere gönderilmez.
- **Derli toplu sonuç ekranı:** araç ve sonuç özeti üstte sabit kalır; ayrıntılar beş sekmeye bölünür
  (Özet, Ne yapmalı, Netleştir, Teklif, Paylaş).
- **Renk ve yazı:** mürekkep mavisi yüzeyler, kehribar vurgu, camgöbeği ölçüm çizgileri; Barlow ve Barlow Condensed.
  Açık ve koyu tema cihaz ayarını izler; 3B sahne iki temada da koyudur.
- **Animasyonlar:** adım ve sekme geçişleri, tarama çizgisi, dönen tekerlekler, ses düzeyine tepki veren kayıt düğmesi,
  dolan gösterge, sayarak artan yüzdeler, yer değiştiren arıza kartları. "Hareketi azalt" tercihinde kapanır.

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
    normal-idle.js      Normal rölanti sesinin aralığı (319 gerçek araçtan)
    vehicles.js         Marka ve modeller
    conditions.js       Sürüş durumları
    dimensions.js       Modellerin yaklaşık dış ölçüleri (3B araç oranları için)
    guidance.js         Arıza başına kontroller, ustaya söylenecekler, kırmızı bayraklar
    parts.js            Teklif/fatura kalemleri
    obd.js              OBD arıza kodu aileleri ve işaret ettikleri arızalar
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
    compare.js          Yönlendirmeli test: iki kaydın karşılaştırılması
    baseline.js         Aracın referans (sağlam) kaydıyla karşılaştırma
    normal.js           Normal rölanti sesiyle karşılaştırma
  ui/                 Ekran modülleri (form, kayıt, sonuç, çizim, paylaşım)
    car3d.js            Üç boyutlu "röntgen" araç sahnesi (WebGL yoksa iki boyutlu çizime düşülür)
    tabs.js             Sonuç ekranındaki sekmeler
    photo.js            Kullanıcının araç fotoğrafı (cihazda saklanır)
    icons.js            Çizgi ikonları
    animate.js          Sayaç ve animasyon yardımcıları
    waveform.js         Dalga ve canlı spektrum çizimi
tests/                Birim testleri (node:test)
  cases/              Gerçek vakalar (yalnızca ölçülen ses özellikleri; ses/görüntü saklanmaz)
  reference/          Sosyal medya derlemelerinden doğrulanmamış referans sesler (özellikler)
  normal/             319 gerçek aracın normal rölanti kaydı (özellikler; CC BY 4.0 kaynaklı)
scripts/              Geliştirme sunucusu, uçtan uca test, doğruluk ölçümü
vendor/               three.js 0.160.0 (MIT lisanslı; 3B sahne için, kurulum gerektirmesin diye depoda tutulur)
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

## Ölçüm

`npm run evaluate` üç bölüm raporlar. Bugünkü sonuçlar:

| Bölüm | Sonuç |
|---|---|
| Gerçek vakalar (sonucu bilinen) | 1 vaka; bölge doğru |
| Referans sesler (sosyal medya derlemeleri, doğrulanmamış, 44 ses) | Yalnızca sesle: bölge 20/44, doğru parça ilk üçte 10/37. Tipik belirtilerle: bölge 30/37, ilk üçte 22/37 |
| Normal araçlar (319 gerçek rölanti kaydı) | 283'üne "normal rölanti sesine benziyor" denir; 4'ünde kalıcı ton bulunur; 4'ünde "iyi" güvenle arıza gösterilir |

Normal araç verisi: Ciric, D. ve Milivojčević, M. (2024), *Sounds of Vehicle Internal Combustion Engines*, Zenodo
kayıt 18777405, CC BY 4.0. Depoda ses dosyaları değil, yalnızca ölçülen özellikler tutulur (`tests/normal/`).

## Bilinen sınırlar

- Ses profilleri elle yazılmış kurallardır ve yalnızca sesle parça düzeyinde isabet düşüktür (bkz. Ölçüm).
  Sonucu bilinen gerçek vaka sayısı 1'dir; doğruluk oranı, yeterli vaka birikmeden uygulamada gösterilmez.
- Normal rölanti aralığı, aracın dışından (otopark girişinde) alınmış kayıtlardan çıkarılmıştır; kaput açıkken
  motora yakın tutulan telefonla birebir aynı koşul değildir. Arıza seslerinin bir kısmı da bu aralığa düşer
  (referans seslerin 44'te 16'sı); bu yüzden "normal" bir hüküm değil, göstergedir.
- Alt takım parçaları (rotil, rot başı, Z rot vb.) sesle birbirinden güvenilir biçimde ayrılamaz; ayrımı
  takip soruları yapar. Kesin tespit için aracın liftte kontrolü gerekir.
- Arızanın sol/sağ tarafı tek kayıttan belirlenemez.
- Yönlendirmeli test yalnızca araç dururken yapılabilen motor bölmesi testlerini kapsar; alt takım ve fren için
  (sürüş gerektirdiğinden) sorular kullanılır. Karşılaştırma eşikleri yapay seslerle ayarlandı; gerçek kayıtlarla
  doğrulanmadı.
- Videodaki görüntü yalnızca sesin en güçlü olduğu anı göstermek için kullanılır; parçaların görüntüden
  tanınması yoktur.
- Fiyat ve usta verisi henüz boştur; gerçek veri gelene kadar uygulama fiyat yorumu yapmaz.
