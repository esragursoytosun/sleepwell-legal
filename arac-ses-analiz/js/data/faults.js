/**
 * Arıza kataloğu.
 *
 * Her arıza için:
 *  - group : sonuçta "en olası bölge" hesabında kullanılan üst grup
 *  - loc   : araç çiziminde işaretlenecek konum (LOCATIONS anahtarı)
 *  - urg   : aciliyet (1 düşük … 4 acil)
 *  - ice   : true ise yalnızca içten yanmalı motorlu araçlarda görülür
 *  - p     : ses profili → f: karakteristik frekans aralığı (Hz), feat: karşılaştırılacak ölçüm
 *            ("peak" baskın ton, "centroid" spektral merkez), tonal / imp: beklenen tonluluk ve
 *            darbelilik (0..1), rhythm: beklenen tekrar hızı aralığı (Hz), null (sürekli ses) ya da
 *            "irregular" (yol kaynaklı düzensiz vuruntu; düzenli ritim bu arızayı güçlü biçimde dışlar)
 *  - c     : her sürüş durumunun bu arızaya ne kadar işaret ettiği (yazılmayanlar 0,8 sayılır)
 */

export const GROUPS = {
  motor: "Motor",
  yardimci: "Motor önü yardımcı aksamlar",
  fren: "Fren sistemi",
  alt_takim: "Alt takım (süspansiyon ve direksiyon)",
  aktarma: "Aktarma ve tekerlek"
};

export const URGENCY = {
  1: "Düşük aciliyet",
  2: "Orta aciliyet",
  3: "Yüksek aciliyet",
  4: "Acil – aracı kullanmayın"
};

/** Konumlar: 200x400'lük üstten araç çiziminde işaret noktaları (ön taraf yukarıda). */
export const LOCATIONS = {
  motor_on: { label: "Motorun ön tarafı (kayış / yardımcı aksamlar)", pts: [[100, 42]] },
  alternator: { label: "Motor önü – alternatör", pts: [[128, 52]] },
  pompa: { label: "Motor önü – direksiyon pompası", pts: [[72, 52]] },
  klima: { label: "Motor önü – klima kompresörü", pts: [[82, 108]] },
  motor_ust: { label: "Motor üstü (supap kapağı)", pts: [[100, 80]] },
  motor_alt: { label: "Motor bloğu / krank (alt)", pts: [[100, 92]] },
  motor_yan: { label: "Motor yanı (zincir/triger tarafı)", pts: [[132, 84]] },
  motor: { label: "Motor (ateşleme sistemi)", pts: [[86, 74], [114, 74]] },
  turbo: { label: "Turbo (egzoz manifoldu yanı)", pts: [[72, 94]] },
  egzoz: { label: "Egzoz hattı (manifolddan arkaya)", pts: [[116, 124], [118, 230]], exhaust: true },
  on_teker: { label: "Ön tekerlekler (fren)", pts: [[33, 91], [167, 91]] },
  teker: { label: "Tekerlek göbekleri (rulman)", pts: [[33, 91], [167, 91], [33, 305], [167, 305]] },
  aks: { label: "Ön akslar (tekerlek iç tarafı)", pts: [[54, 96], [146, 96]] },
  sanziman: { label: "Şanzıman / diferansiyel", pts: [[100, 140]] },
  rotil: { label: "Ön tekerlek alt mafsalları (rotil)", pts: [[48, 102], [152, 102]] },
  rot_basi: { label: "Direksiyon rot başları (ön tekerleklerin arkası)", pts: [[52, 112], [148, 112]] },
  z_rot: { label: "Viraj demiri askı rotları (ön)", pts: [[58, 70], [142, 70]] },
  viraj_lastik: { label: "Viraj demiri burçları (ön alt, ortaya yakın)", pts: [[80, 116], [120, 116]] },
  amortisor_kafa: { label: "Ön amortisör kuleleri (üst bağlantı)", pts: [[52, 80], [148, 80]] },
  salincak: { label: "Ön salıncak burçları", pts: [[64, 104], [136, 104]] }
};

export const FAULTS = [
  // ------------------------------------------------------------------ yardımcı aksamlar
  { id: "kayis", name: "V-kayış / gergi bilyası gıcırtısı", group: "yardimci", loc: "motor_on", urg: 2, ice: true,
    desc: "Kayış kaydığında veya gergi zayıfladığında tiz, sürekli bir gıcırtı çıkar; soğukta ve yük binince (klima, direksiyon) artar.",
    tip: "Kayışta çatlak/parlama ve gergi bilyası kontrol edilmeli. Kayış koparsa şarj ve hidrolik destek kesilir.",
    p: { f: [1500, 5000], feat: "peak", tonal: .55, imp: .15, rhythm: null },
    c: { soguk: 1.7, rolanti: 1.3, klima: 1.6, direksiyon: 1.4, hizlanma: 1.2, fren: .45, tumsek: .5, hiz: .6 } },
  { id: "alternator", name: "Alternatör rulmanı / vınlama", group: "yardimci", loc: "alternator", urg: 2, ice: true,
    desc: "Devirle birlikte inceliği artan, ince ve sürekli bir vınlama. Elektrik yükü artınca (far, klima) değişebilir.",
    tip: "Şarj voltajı ölçtürülmeli (rölantide yaklaşık 13,8–14,6 V). Rulman sesi genelde ilerler.",
    p: { f: [800, 4500], feat: "peak", tonal: .8, imp: .1, rhythm: null },
    c: { hizlanma: 1.5, rolanti: 1.2, klima: 1.3, fren: .4, tumsek: .4, direksiyon: .7 } },
  { id: "pompa", name: "Hidrolik direksiyon pompası uğultusu", group: "yardimci", loc: "pompa", urg: 2, ice: true,
    desc: "Direksiyonu çevirdikçe artan orta-tiz bir inleme/uğultu. Genellikle hidrolik yağ azlığı ya da pompa aşınması.",
    tip: "Hidrolik yağ seviyesi ve kaçak kontrol edilmeli. (Elektrikli direksiyonlu araçlarda bu pompa yoktur.)",
    p: { f: [300, 1300], feat: "peak", tonal: .7, imp: .1, rhythm: null },
    c: { direksiyon: 2.8, rolanti: 1.2, soguk: 1.3, fren: .5, tumsek: .5, hiz: .6 } },
  { id: "klima", name: "Klima kompresörü / kavrama sesi", group: "yardimci", loc: "klima", urg: 1,
    desc: "Klima açılınca başlayan uğultu, tıkırtı veya şıkırtı. Kompresör kavraması ya da rulmanı.",
    tip: "Klimayı kapatınca ses kesiliyorsa kompresör ve kavrama kontrol edilmeli.",
    p: { f: [400, 2500], feat: "peak", tonal: .45, imp: .35, rhythm: [8, 20] },
    c: { klima: 4.0, rolanti: 1.1, fren: .4, tumsek: .4, direksiyon: .5, hiz: .5, vites: .5 } },

  // ------------------------------------------------------------------ motor
  { id: "biyel", name: "Biyel / krank yatağı vuruntusu", group: "motor", loc: "motor_alt", urg: 4, ice: true,
    desc: "Motorun alt kısmından gelen, devirle hızlanan derin ve tok “tak-tak” vuruntu. Gaz verince belirginleşir.",
    tip: "Ciddi motor arızası riski. Motoru zorlamayın, yağ seviyesini kontrol edip hemen servise başvurun.",
    p: { f: [80, 900], feat: "centroid", tonal: .1, imp: .85, rhythm: [8, 33] },
    c: { hizlanma: 1.7, rolanti: 1.2, soguk: .9, hiz: 1.0, fren: .4, direksiyon: .5, tumsek: .5, klima: .6 } },
  { id: "supap", name: "Supap / hidrolik itici tıkırtısı", group: "motor", loc: "motor_ust", urg: 2, ice: true,
    desc: "Motorun üstünden gelen, dikiş makinesine benzeyen hafif ve tiz “tık-tık-tık”. Soğukta belirgin, ısınınca azalabilir.",
    tip: "Yağ seviyesi/viskozitesi kontrol edilmeli; supap ayarı veya hidrolik iticiler değerlendirilmeli.",
    p: { f: [1500, 7000], feat: "centroid", tonal: .2, imp: .85, rhythm: [4, 16] },
    c: { soguk: 1.9, rolanti: 1.6, hizlanma: 1.0, fren: .4, tumsek: .4, direksiyon: .5, hiz: .7 } },
  { id: "zincir", name: "Eksantrik zinciri / triger gerdirici sesi", group: "motor", loc: "motor_yan", urg: 3, ice: true,
    desc: "Özellikle ilk çalıştırmada birkaç saniye süren metalik şıkırtı/zırıltı. Zincir esnemesi veya gerdirici arızası.",
    tip: "İhmal edilirse zincir atlayıp motor hasarına yol açabilir. Servis, zincir esnemesini ölçmeli.",
    p: { f: [800, 4500], feat: "centroid", tonal: .2, imp: .6, rhythm: [10, 33] },
    c: { soguk: 2.6, rolanti: 1.3, hizlanma: 1.0, fren: .4, tumsek: .4, direksiyon: .5, hiz: .6 } },
  { id: "egzoz", name: "Egzoz kaçağı / manifold sızıntısı", group: "motor", loc: "egzoz", urg: 2, ice: true,
    desc: "Motor ateşlemesiyle aynı ritimde “puf-puf” ya da tıkırtılı ses; gaz verince yükselir, soğukta daha belirgindir.",
    tip: "Egzoz gazı kabine girebilir (karbonmonoksit riski). Conta, manifold ve bağlantılar kontrol edilmeli.",
    p: { f: [150, 1500], feat: "centroid", tonal: .1, imp: .6, rhythm: [14, 33] },
    c: { soguk: 1.6, hizlanma: 1.8, rolanti: 1.2, fren: .4, direksiyon: .4, tumsek: .7 } },
  { id: "turbo", name: "Turbo ıslığı / turbo mili boşluğu", group: "motor", loc: "turbo", urg: 3, ice: true,
    desc: "Gaz verince yükselen “siren” gibi tiz ıslık. Turbo mil boşluğu veya hava hattı kaçağı olabilir.",
    tip: "Turbo hortumları ve intercooler kaçağı kontrol edilmeli; turbo milinde boşluk varsa yağ yakma başlayabilir.",
    p: { f: [3000, 11000], feat: "peak", tonal: .75, imp: .1, rhythm: null },
    c: { hizlanma: 2.8, hiz: 1.2, rolanti: .5, fren: .3, soguk: .7, direksiyon: .4, tumsek: .4 } },
  { id: "tekleme", name: "Ateşleme teklemesi (buji / bobin)", group: "motor", loc: "motor", urg: 2, ice: true,
    desc: "Motor sesi düzensiz; rölantide sarsıntı ve “pıt-pıt” şeklinde atlayan ritim. Gaz verince takılma.",
    tip: "Bujiler, ateşleme bobinleri ve enjektörler kontrol edilmeli; arıza lambası yanıyorsa kod okutulmalı.",
    p: { f: [40, 450], feat: "centroid", tonal: .4, imp: .5, rhythm: [3, 33] },
    c: { rolanti: 1.9, hizlanma: 1.5, soguk: 1.3, fren: .4, tumsek: .4, direksiyon: .4, hiz: .8 } },

  // ------------------------------------------------------------------ fren
  { id: "fren_balata", name: "Fren balatası aşınması (gıcırtı)", group: "fren", loc: "on_teker", urg: 3,
    desc: "Balata aşınma uyarı sacı diske sürtünce çok tiz bir ötme/gıcırtı yapar; genellikle fren yapınca başlar.",
    tip: "Balatalar ölçtürülmeli. Uzun süre ihmal edilirse disk de zarar görür.",
    p: { f: [3000, 11000], feat: "peak", tonal: .8, imp: .1, rhythm: null },
    c: { fren: 3.2, hiz: .8, rolanti: .3, soguk: .7, hizlanma: .5, klima: .4, direksiyon: .6 } },
  { id: "fren_disk", name: "Fren diski – metal metale sürtünme", group: "fren", loc: "on_teker", urg: 4,
    desc: "Balata tamamen bitince metal disk üzerine sürtünür: kaba bir hırıltı/öğütme sesi, tekerlek dönüşüyle ritmik.",
    tip: "Aracı kullanmayın veya çok kısa mesafede servise götürün; fren mesafesi ciddi uzar.",
    p: { f: [400, 3000], feat: "centroid", tonal: .12, imp: .3, rhythm: [3, 14] },
    c: { fren: 3.2, hiz: 1.2, rolanti: .25, soguk: .6, klima: .4, hizlanma: .6 } },

  // ------------------------------------------------------------------ aktarma ve tekerlek
  { id: "rulman", name: "Teker rulmanı arızası (uğultu)", group: "aktarma", loc: "teker", urg: 3,
    desc: "Hız arttıkça yükselen, “vuuuv-vuuuv” şeklinde dalgalanan alçak bir uğultu. Virajda bir tarafa yüklenince değişir.",
    tip: "Virajda ses artıyor/azalıyorsa yük binen taraftaki rulman şüphelidir. Servis kontrolü gerekir.",
    p: { f: [70, 450], feat: "peak", tonal: .5, imp: .1, rhythm: [0.8, 4] },
    c: { hiz: 2.8, direksiyon: 1.4, rolanti: .2, soguk: .6, fren: .8, klima: .4, vites: .7 } },
  { id: "aks", name: "Aks kafası (homokinetik mafsal) tıkırtısı", group: "aktarma", loc: "aks", urg: 3,
    desc: "Direksiyon tam kırıkken hareket edince gelen ritmik “tık-tık-tık”. Körük yırtılınca mafsal aşınır.",
    tip: "Aks körükleri ve mafsallar kontrol edilmeli. Aks koparsa araç hareket edemez.",
    p: { f: [700, 4000], feat: "centroid", tonal: .15, imp: .85, rhythm: [1.5, 5.5] },
    c: { direksiyon: 3.2, hizlanma: 1.4, hiz: .9, rolanti: .2, soguk: .6, fren: .6, klima: .4, tumsek: .5 } },
  { id: "sanziman", name: "Şanzıman / diferansiyel uğultusu", group: "aktarma", loc: "sanziman", urg: 3,
    desc: "Hızla birlikte inceliği değişen dişli uğultusu; vites değişiminde veya belirli viteslerde artar.",
    tip: "Şanzıman yağı seviyesi/durumu kontrol edilmeli. Otomatik şanzımanlarda silkeleme de varsa yazılım/kavrama kontrolü.",
    p: { f: [250, 1500], feat: "peak", tonal: .65, imp: .15, rhythm: null },
    c: { hiz: 2.0, vites: 2.4, hizlanma: 1.4, rolanti: .4, fren: .6, tumsek: .5, soguk: .8 } },

  // ------------------------------------------------------------------ alt takım
  { id: "rotil", name: "Rotil (alt mafsal) boşluğu", group: "alt_takim", loc: "rotil", urg: 3,
    desc: "Tümsek ve çukurlarda ön taraftan gelen tok “tak tak” vuruntu; ilerlediğinde direksiyon çevirirken gıcırtı da yapabilir.",
    tip: "Rotil boşluğu liftte levyeyle kontrol edilir. İleri derecede aşınmış rotil yerinden çıkabilir; ertelenmemeli.",
    p: { f: [80, 600], feat: "centroid", tonal: .1, imp: .9, rhythm: "irregular" },
    c: { tumsek: 3.0, direksiyon: 1.5, fren: 1.0, rolanti: .15, soguk: .6, klima: .4, hizlanma: .6, vites: .5 } },
  { id: "rot_basi", name: "Rot başı / rot mili boşluğu", group: "alt_takim", loc: "rot_basi", urg: 3,
    desc: "Direksiyonu çevirirken ya da bozuk yolda gelen kısa “tık/tak” sesi; direksiyonda boşluk ve titreme eşlik edebilir.",
    tip: "Rot başı ve rot mili boşluğu kontrol edilmeli; değişimden sonra rot ayarı yapılmalıdır.",
    p: { f: [200, 1500], feat: "centroid", tonal: .1, imp: .85, rhythm: "irregular" },
    c: { tumsek: 2.2, direksiyon: 2.2, fren: .8, rolanti: .2, soguk: .6, klima: .4, hizlanma: .6, vites: .5 } },
  { id: "z_rot", name: "Z rot (viraj demiri askı rotu) tıkırtısı", group: "alt_takim", loc: "z_rot", urg: 2,
    desc: "Bozuk yolda düşük hızda gelen ince ve hızlı “tıkır tıkır” ses. Alt takımın en sık değişen parçalarındandır.",
    tip: "Z rotlar elle sallanarak kolayca kontrol edilir; genellikle uygun maliyetli bir değişimdir.",
    p: { f: [400, 3000], feat: "centroid", tonal: .1, imp: .85, rhythm: "irregular" },
    c: { tumsek: 3.2, direksiyon: 1.1, fren: .6, rolanti: .15, soguk: .6, klima: .4, hizlanma: .6, vites: .5 } },
  { id: "viraj_lastik", name: "Viraj demiri lastiği (burç) sesi", group: "alt_takim", loc: "viraj_lastik", urg: 2,
    desc: "Kasis ve bozuk yolda düşük hızda gelen “lok lok” ya da lastik gıcırtısı gibi ses; soğuk havada artabilir.",
    tip: "Burçlar sertleşmiş ya da boşalmışsa değiştirilir; genellikle uygun maliyetlidir.",
    p: { f: [80, 700], feat: "centroid", tonal: .15, imp: .8, rhythm: "irregular" },
    c: { tumsek: 3.0, soguk: 1.2, direksiyon: 1.0, fren: .6, rolanti: .15, klima: .4, hizlanma: .6, vites: .5 } },
  { id: "amortisor_kafa", name: "Amortisör kafası / takozu sesi", group: "alt_takim", loc: "amortisor_kafa", urg: 2,
    desc: "Direksiyonu çevirirken (özellikle araç dururken) “gırt” sesi ya da tümsekte üstten gelen tok vuruntu.",
    tip: "Amortisör takozu ve rulmanı kontrol edilmeli; çoğunlukla çift olarak değiştirilir.",
    p: { f: [50, 450], feat: "centroid", tonal: .1, imp: .85, rhythm: "irregular" },
    c: { tumsek: 2.4, direksiyon: 2.4, fren: .7, rolanti: .3, soguk: .7, klima: .4, hizlanma: .6, vites: .5 } },
  { id: "salincak", name: "Salıncak burcu boşluğu", group: "alt_takim", loc: "salincak", urg: 2,
    desc: "Fren yaparken ya da kalkışta tek bir tok “tak”; tümseklerde boğuk vuruntu. Lastiklerde düzensiz aşınma yapabilir.",
    tip: "Burçlarda yırtılma/boşluk liftte kontrol edilir; burç ya da komple salıncak değişimi gerekebilir.",
    p: { f: [50, 400], feat: "centroid", tonal: .1, imp: .9, rhythm: "irregular" },
    c: { tumsek: 2.2, fren: 2.0, hizlanma: 1.5, direksiyon: 1.0, rolanti: .15, soguk: .6, klima: .4, vites: .8 } }
];

export const FAULT_BY_ID = Object.fromEntries(FAULTS.map(f => [f.id, f]));
