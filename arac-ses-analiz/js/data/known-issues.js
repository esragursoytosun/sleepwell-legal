/**
 * Belirli model/yıl/yakıt kombinasyonlarında yaygın olarak bildirilen sorunlar.
 * Eşleşen kayıt, ilgili arızanın olasılığını `x` katsayısıyla artırır ve sonuçta not olarak gösterilir.
 */
const VAG = {
  "Volkswagen": ["Polo", "Golf", "Jetta", "Passat", "Tiguan", "Caddy"],
  "Audi": ["A3", "A4"],
  "Skoda": ["Fabia", "Octavia", "Superb"],
  "Seat": ["Ibiza", "Leon"]
};

export const KNOWN_ISSUES = [
  { match: VAG, years: [2008, 2014], fuel: ["benzin", "lpg"], fault: "zincir", x: 1.9,
    note: "1.2 / 1.4 TSI (EA111) motorlarda zincir esnemesi ve gerdirici sorunları sık bildirilmiştir; özellikle soğuk çalıştırmada şıkırtı." },
  { match: { ...VAG, "Volkswagen": [...VAG.Volkswagen, "T-Roc"], "Skoda": [...VAG.Skoda, "Scala", "Kamiq", "Karoq"], "Seat": [...VAG.Seat, "Arona", "Ateca"] },
    years: [2009, 2021], fault: "sanziman", x: 1.5,
    note: "7 ileri kuru kavramalı DSG (DQ200) donanımlı araçlarda kalkış/vites geçişinde silkeleme ve takırtı şikâyetleri yaygındır." },
  { match: { "Ford": ["Focus", "Fiesta"] }, years: [2011, 2018], fuel: ["benzin", "lpg"], fault: "sanziman", x: 1.6,
    note: "PowerShift (DPS6) otomatik şanzımanlarda kavrama titremesi ve vites geçiş sorunları geniş çapta bildirilmiştir." },
  { match: { "Peugeot": ["208", "2008", "301", "308", "3008", "508"], "Citroën": ["C3", "C4", "C-Elysée", "C5 Aircross", "Berlingo"], "Opel": ["Corsa", "Mokka", "Crossland", "Astra"] },
    years: [2014, 2025], fuel: ["benzin", "lpg", "hibrit"], fault: "zincir", x: 1.6,
    note: "1.2 PureTech motorlarda yağ içinde çalışan triger kayışının erken bozulması (ve parçaların yağ hattını tıkaması) sık bildirilen bir sorundur." },
  { match: { "Peugeot": ["308", "3008", "508"], "Citroën": ["C4"] }, years: [2007, 2015], fuel: ["benzin", "lpg"], fault: "zincir", x: 1.4,
    note: "1.6 THP motorlarda zincir gerdirici/esneme kaynaklı soğuk çalıştırma şıkırtısı bilinen bir sorundur." },
  { match: { "BMW": ["1 Serisi", "3 Serisi", "5 Serisi", "X1", "X3"] }, years: [2007, 2016], fault: "zincir", x: 1.8,
    note: "N47 (dizel) ve N20 (benzinli) motorlarda zincir kılavuzu/zincir esnemesi kaynaklı ses ve hasar vakaları bilinmektedir." },
  { match: { "Mercedes-Benz": ["C Serisi", "E Serisi"] }, years: [2002, 2012], fuel: ["benzin", "lpg"], fault: "zincir", x: 1.6,
    note: "M271 (1.8 kompresör/turbo) motorlarda zincir esnemesi ve dişli aşınması sık bildirilmiştir." },
  { match: { "Renault": ["Clio", "Symbol", "Megane", "Fluence", "Captur", "Kadjar"], "Dacia": ["Sandero", "Logan", "Duster"], "Nissan": ["Micra", "Juke", "Qashqai"] },
    years: [2005, 2018], fuel: ["dizel"], fault: "biyel", x: 1.4,
    note: "1.5 dCi (K9K) motorlarda, özellikle uzun yağ değişim aralığıyla kullanılmış araçlarda biyel yatağı aşınması bildirilmektedir." },
  { match: { "Renault": ["Clio", "Megane", "Captur", "Kadjar"], "Dacia": ["Duster"] }, years: [2012, 2017], fuel: ["benzin", "lpg"], fault: "zincir", x: 1.3,
    note: "1.2 TCe (H5Ft) motorlarda yağ eksiltme ve buna bağlı zincir/gerdirici sorunları bildirilmiştir." },
  { match: { "Hyundai": ["Tucson", "Elantra"], "Kia": ["Sportage"] }, years: [2011, 2019], fuel: ["benzin", "lpg"], fault: "biyel", x: 1.3,
    note: "Aracınızda 2.0 / 2.4 GDI (Theta II) motor varsa, bu motor ailesinde biyel yatağı arızası nedeniyle geri çağırmalar yapılmıştır." }
];
