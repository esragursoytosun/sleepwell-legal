/**
 * Arıza başına kullanıcı yönlendirmesi.
 *  - checks: kullanıcının kendi başına, güvenle yapabileceği basit kontroller
 *  - ask:    ustaya söylenecek / istenecek teşhis adımları (doğru parçanın bulunması için)
 *  - flags:  bu arızada sık görülen gereksiz işlem ya da abartma kalıpları
 *  - parts:  bu arızanın onarımında normalde geçen kalemler (PARTS anahtarları); teklif kontrolünde kullanılır
 */

/** Her serviste söylenecek genel kurallar. */
export const GENERAL_ASK = [
  "Onayım olmadan hiçbir parça değiştirmeyin; önce teşhisi ve fiyatı söyleyin.",
  "Parça ve işçiliği ayrı ayrı, yazılı olarak verin.",
  "Takılacak parçanın orijinal mi muadil mi olduğunu belirtin.",
  "Değişen eski parçayı görmek ve geri almak istiyorum."
];

/** Her arızada geçerli kırmızı bayraklar. */
export const GENERAL_FLAGS = [
  "“Bırak, bakalım” deyip teşhis ve fiyat vermemek.",
  "İş başlamadan ön ödeme istemek.",
  "“Hazır açılmışken” sesle ilgisi olmayan birçok parçayı birlikte önermek.",
  "Değişen eski parçayı göstermemek ya da geri vermemek."
];

export const GUIDANCE = {
  kayis: {
    checks: [
      "Motor çalışırken klimayı açıp kapatın; gıcırtı klima açıkken artıyorsa kayış yük altında kayıyor olabilir.",
      "Motor kapalıyken kayışa bakın: çatlak, parlama ya da yıpranma var mı?"
    ],
    ask: [
      "Sesin kayıştan mı, gergi/avara bilyasından mı geldiğini ayırın; kayış sökülüyken bilyaları elle çevirerek kontrol edin.",
      "Kayış gerginliğini ve gergi bilyasını kontrol edin."
    ],
    flags: ["Yalnızca kayış sesi için alternatör ya da su pompası değişimi önerilirse gerekçesini sorun."],
    parts: ["kayis", "bilya"]
  },
  alternator: {
    checks: [
      "Rölantide farları, klimayı ve arka cam ısıtmasını açın; ses belirgin değişiyorsa alternatör ihtimali artar.",
      "Gösterge panelinde akü/şarj uyarı lambası yanıyor mu?"
    ],
    ask: [
      "Rölantide şarj voltajını ölçün (yaklaşık 13,8–14,6 V olmalı).",
      "Sesin alternatörden mi bilyadan mı geldiğini steteskop ya da uzun tornavidayla ayrı ayrı dinleyin."
    ],
    flags: [
      "Voltaj normal ve ses bilyadan geliyorsa alternatör değişimi gerekmeyebilir.",
      "Alternatör tamiri (rulman, regülatör) çoğu zaman komple değişimden ucuzdur; seçenekleri sorun."
    ],
    parts: ["alternator", "bilya", "kayis"]
  },
  pompa: {
    checks: [
      "Motor kapalı ve soğukken hidrolik direksiyon yağı seviyesine bakın.",
      "Pompa altında ya da hortumlarda yağ kaçağı var mı?"
    ],
    ask: ["Önce yağ seviyesi ve kaçak kontrol edilsin; yağ eksikse kaçağın yeri bulunsun."],
    flags: [
      "Yağ eksikliğinden gelen ses için doğrudan pompa değişimi önerilirse önce yağ tamamlanıp ses tekrar dinlensin.",
      "Aracınızda elektrikli direksiyon varsa hidrolik pompa yoktur."
    ],
    parts: ["direksiyon_pompasi", "hidrolik_yag"]
  },
  klima: {
    checks: ["Klimayı açıp kapatın; ses yalnızca klima açıkken mi oluyor?"],
    ask: [
      "Kompresör kavraması ve rulmanı ayrı ayrı kontrol edilsin.",
      "Gaz basıncı ölçülsün; eksikse kaçak testi yapılsın."
    ],
    flags: [
      "Kavrama ya da rulman arızasında komple kompresör değişimi tek seçenek olmayabilir; sorun.",
      "Kaçak testi yapılmadan tekrar tekrar gaz doldurulması önerilirse dikkat."
    ],
    parts: ["klima_kompresoru", "klima_gazi"]
  },
  biyel: {
    checks: ["Motor yağı seviyesini kontrol edin; çok düşükse motoru çalıştırmayın."],
    ask: [
      "Yağ basıncı ölçülsün.",
      "Vuruntunun yeri (motorun altı mı üstü mü) steteskopla belirlensin; enjektör ve supap sesinden ayrılsın."
    ],
    flags: [
      "Motor revizyonu ya da motor değişimi büyük bir karar; mutlaka ikinci görüş alın.",
      "Yağ basıncı ölçülmeden ve sesin yeri ayrılmadan “motor gitmiş” denirse başka bir ustaya da dinletin."
    ],
    parts: ["motor_revizyon", "motor_yagi"]
  },
  supap: {
    checks: [
      "Motor yağı seviyesini kontrol edin; yağ eksikliği tıkırtıyı artırır.",
      "Ses motor ısındıktan sonra azalıyor mu?"
    ],
    ask: [
      "Yağ seviyesi ve yağın durumu kontrol edilsin.",
      "Supap ayarı ve hidrolik iticiler değerlendirilsin (LPG'li araçlarda supap ayarı periyodik yapılmalı)."
    ],
    flags: ["Direkt enjeksiyonlu motorlarda hafif ve düzenli tıkırtı normal olabilir; ses değişmediyse gereksiz işlem yaptırmayın."],
    parts: ["supap_itici", "motor_yagi"]
  },
  zincir: {
    checks: ["Ses yalnızca soğuk çalıştırmada, ilk birkaç saniye mi sürüyor?"],
    ask: [
      "Zincir esnemesi ölçülsün; birçok motorda bu, kapak açılmadan arıza tespit cihazıyla yapılabilir.",
      "Gerdirici ve kılavuzlar da kontrol edilsin."
    ],
    flags: [
      "Triger seti büyük bir iştir; parça ve işçiliği ayrı ayrı yazılı isteyin.",
      "Esneme ölçülmeden doğrudan set değişimi önerilirse ölçüm sonucunu sorun."
    ],
    parts: ["triger_seti", "motor_yagi"]
  },
  egzoz: {
    checks: [
      "Motor soğukken egzoz manifoldu ve borular boyunca “puf puf” sesini dinleyin.",
      "Kabinde egzoz kokusu varsa camları açın ve hemen kontrol ettirin."
    ],
    ask: ["Kaçağın yeri bulunsun: manifold contası mı, boru bağlantısı mı, susturucu mu?"],
    flags: ["Conta ya da kelepçe kaçağı için komple egzoz sistemi değişimi önerilirse gerekçesini sorun."],
    parts: ["egzoz_conta", "egzoz_parca"]
  },
  turbo: {
    checks: ["Turbo hortumlarında ve bağlantılarında yağlanma ya da gevşeklik var mı?"],
    ask: [
      "Önce hava hortumları ve intercooler kaçağı kontrol edilsin.",
      "Turbo mil boşluğu ölçülsün."
    ],
    flags: [
      "Hortum kaçağı için turbo değişimi önerilirse ikinci görüş alın.",
      "Turbo değişimi pahalıdır; yeni, revizyonlu ve orijinal seçeneklerini ayrı ayrı sorun."
    ],
    parts: ["turbo", "turbo_hortum"]
  },
  tekleme: {
    checks: ["Motor arıza lambası yanıyor mu?"],
    ask: [
      "Arıza kodları okunsun; hangi silindirde tekleme olduğu belirlensin.",
      "Bobinler silindirler arasında yer değiştirilerek arızalı parça doğrulansın."
    ],
    flags: ["Tek bir bobin arızası için bütün bobinlerin değişmesi gerekmez; bujiler bakım zamanındaysa birlikte değişebilir."],
    parts: ["buji", "bobin", "enjektor"]
  },
  fren_balata: {
    checks: ["Jant aralığından balata görünüyorsa kalınlığına bakın; birkaç milimetreye inmişse değişim zamanı gelmiştir."],
    ask: ["Balata kalınlığı ölçülsün ve disk yüzeyi kontrol edilsin."],
    flags: ["Disk kalınlığı sınırın üstündeyse ve yüzeyde derin çizik yoksa disk değişimi şart olmayabilir; ölçümü sorun."],
    parts: ["fren_balatasi", "fren_diski"]
  },
  fren_disk: {
    checks: ["Fren pedalında titreme ya da fren mesafesinde uzama var mı? Varsa aracı kullanmayın."],
    ask: ["Balata ve disk kalınlığı ölçülsün."],
    flags: ["Bu durumda disk ve balatanın birlikte değişmesi normaldir; kaliper değişimi önerilirse gerekçesini sorun."],
    parts: ["fren_balatasi", "fren_diski", "kaliper"]
  },
  rulman: {
    checks: ["Düz yolda giderken hafifçe sağa ve sola yönelin: sola dönerken ses artıyorsa genelde sağ, sağa dönerken artıyorsa sol taraftaki rulman şüphelidir."],
    ask: ["Araç kaldırılıp tekerlekler elle döndürülerek ve sallanarak kontrol edilsin; hangi tekerlek olduğu gösterilsin."],
    flags: ["Tek rulman arızasında dört rulmanın birden değişmesi gerekmez."],
    parts: ["teker_rulmani"]
  },
  aks: {
    checks: ["Ön tekerleklerin arkasındaki aks körüklerinde yırtık ya da gres sızıntısı var mı?"],
    ask: ["Hangi tarafın ve dış mı iç mafsal mı olduğu belirlensin."],
    flags: ["Çoğu durumda yalnızca mafsal (aks kafası) değişir; komple aks şart olmayabilir, seçenekleri sorun."],
    parts: ["aks_kafasi", "aks_korugu", "aks_komple"]
  },
  sanziman: {
    checks: ["Ses belirli bir viteste mi, yoksa hızla birlikte mi değişiyor?"],
    ask: [
      "Şanzıman yağı seviyesi ve durumu kontrol edilsin.",
      "Otomatik şanzımanda arıza kodları ve yazılım güncellemesi kontrol edilsin."
    ],
    flags: [
      "Şanzıman revizyonu ya da değişimi büyük bir karar; mutlaka ikinci görüş ve yazılı teklif alın.",
      "Ses teker rulmanından da gelebilir; önce o ihtimal dışlansın."
    ],
    parts: ["sanziman", "sanziman_yagi", "debriyaj"]
  },
  rotil: {
    checks: ["Ön lastiklerde iç ya da dış kenarda düzensiz aşınma var mı?"],
    ask: ["Araç liftte kaldırılıp levyeyle boşluk kontrol edilsin; hangi tarafın bozuk olduğu gösterilsin."],
    flags: ["Tek rotil arızasında alt takımın tamamının değişmesi gerekmez; her parçanın neden değiştiğini tek tek sorun."],
    parts: ["rotil", "salincak", "rot_ayari"]
  },
  rot_basi: {
    checks: ["Direksiyonda boşluk ya da titreme hissediyor musunuz?"],
    ask: [
      "Rot başı ve rot mili boşluğu liftte gösterilsin.",
      "Değişimden sonra rot ayarı yapılsın."
    ],
    flags: ["Rot başı değişiminden sonra rot ayarı gerekir; bu ek ücret normaldir."],
    parts: ["rot_basi", "rot_mili", "rot_ayari"]
  },
  z_rot: {
    checks: [],
    ask: ["Z rotlar elle sallanarak kontrol edilsin; boşluklu olan gösterilsin."],
    flags: ["Z rot sesi için amortisör ya da salıncak değişimi önerilirse gerekçesini sorun."],
    parts: ["z_rot"]
  },
  viraj_lastik: {
    checks: [],
    ask: ["Viraj demiri burçları kontrol edilsin; sertleşmiş ya da boşalmış olanlar gösterilsin."],
    flags: ["Burç sesi için komple viraj demiri ya da salıncak değişimi önerilirse gerekçesini sorun."],
    parts: ["viraj_lastigi"]
  },
  amortisor_kafa: {
    checks: ["Araç dururken direksiyonu sağa sola çevirin; üst taraftan “gırt” sesi geliyor mu?"],
    ask: ["Amortisör takozu, rulmanı ve amortisörün kendisi ayrı ayrı kontrol edilsin."],
    flags: ["Yalnızca takoz/rulman sesi için amortisör değişimi önerilirse amortisörde kaçak ya da zayıflık olup olmadığını sorun."],
    parts: ["amortisor_takozu", "amortisor"]
  },
  salincak: {
    checks: ["Fren yaparken direksiyon bir tarafa çekiyor mu?"],
    ask: ["Salıncak burçları liftte kontrol edilsin; yırtık ya da boşluk gösterilsin."],
    flags: ["Bazı araçlarda yalnızca burç değişir, bazılarında komple salıncak; seçenekleri ve fiyat farkını sorun."],
    parts: ["salincak", "salincak_burcu", "rot_ayari"]
  }
};
