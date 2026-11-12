/** Marka → model listesi (Türkiye'de yaygın araçlar). */
export const BRANDS = {
  "Audi": ["A3", "A4", "A6", "Q3", "Q5"],
  "BMW": ["1 Serisi", "3 Serisi", "5 Serisi", "X1", "X3"],
  "Citroën": ["C3", "C4", "C-Elysée", "C5 Aircross", "Berlingo"],
  "Dacia": ["Sandero", "Logan", "Duster", "Jogger"],
  "Fiat": ["Egea", "Linea", "Doblo", "Fiorino", "Punto", "Palio"],
  "Ford": ["Focus", "Fiesta", "Kuga", "Puma", "Courier", "Connect"],
  "Honda": ["Civic", "City", "Jazz", "CR-V", "HR-V"],
  "Hyundai": ["i10", "i20", "i30", "Accent Blue", "Elantra", "Bayon", "Tucson"],
  "Kia": ["Picanto", "Rio", "Ceed", "Stonic", "Sportage"],
  "Mercedes-Benz": ["A Serisi", "C Serisi", "E Serisi", "CLA", "GLA"],
  "Nissan": ["Micra", "Juke", "Qashqai"],
  "Opel": ["Corsa", "Astra", "Insignia", "Mokka", "Crossland"],
  "Peugeot": ["208", "2008", "301", "308", "3008", "508"],
  "Renault": ["Clio", "Symbol", "Taliant", "Megane", "Fluence", "Captur", "Kadjar"],
  "Seat": ["Ibiza", "Leon", "Arona", "Ateca"],
  "Skoda": ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq"],
  "Tesla": ["Model 3", "Model Y"],
  "Togg": ["T10X"],
  "Toyota": ["Yaris", "Corolla", "Auris", "C-HR", "RAV4"],
  "Volkswagen": ["Polo", "Golf", "Jetta", "Passat", "Tiguan", "T-Roc", "Caddy"],
  "Diğer": ["Diğer"]
};

/** Yalnızca elektrikli araç üreten markalar. */
export const EV_BRANDS = ["Tesla", "Togg"];

export const FUELS = [
  ["benzin", "Benzin"], ["dizel", "Dizel"], ["lpg", "Benzin + LPG"],
  ["hibrit", "Hibrit"], ["elektrik", "Elektrik"]
];

/** Türkiye'nin 81 ili (doğrulanmış usta eşleştirmesi için). */
export const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum",
  "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Şırnak", "Sivas",
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

/** Gövde tipleri (üç boyutlu araç görünümü için). Listede olmayan modeller hatchback sayılır. */
export const BODY_LABEL = { hatchback: "Hatchback", sedan: "Sedan", suv: "SUV", van: "Hafif ticari" };

const BODY_MODELS = {
  sedan: {
    "Audi": ["A4", "A6"], "BMW": ["3 Serisi", "5 Serisi"], "Citroën": ["C-Elysée"], "Dacia": ["Logan"],
    "Fiat": ["Egea", "Linea"], "Honda": ["Civic", "City"], "Hyundai": ["Accent Blue", "Elantra"],
    "Mercedes-Benz": ["C Serisi", "E Serisi", "CLA"], "Opel": ["Insignia"], "Peugeot": ["301", "508"],
    "Renault": ["Symbol", "Taliant", "Megane", "Fluence"], "Skoda": ["Octavia", "Superb"], "Tesla": ["Model 3"],
    "Toyota": ["Corolla"], "Volkswagen": ["Jetta", "Passat"]
  },
  suv: {
    "Audi": ["Q3", "Q5"], "BMW": ["X1", "X3"], "Citroën": ["C5 Aircross"], "Dacia": ["Duster", "Jogger"],
    "Ford": ["Kuga", "Puma"], "Honda": ["CR-V", "HR-V"], "Hyundai": ["Bayon", "Tucson"], "Kia": ["Stonic", "Sportage"],
    "Mercedes-Benz": ["GLA"], "Nissan": ["Juke", "Qashqai"], "Opel": ["Mokka", "Crossland"], "Peugeot": ["2008", "3008"],
    "Renault": ["Captur", "Kadjar"], "Seat": ["Arona", "Ateca"], "Skoda": ["Kamiq", "Karoq"], "Tesla": ["Model Y"],
    "Togg": ["T10X"], "Toyota": ["C-HR", "RAV4"], "Volkswagen": ["Tiguan", "T-Roc"]
  },
  van: {
    "Citroën": ["Berlingo"], "Fiat": ["Doblo", "Fiorino"], "Ford": ["Courier", "Connect"], "Volkswagen": ["Caddy"]
  }
};

/** Marka ve modele göre gövde tipi. */
export function bodyTypeOf(brand, model) {
  for (const [type, brands] of Object.entries(BODY_MODELS)) {
    if ((brands[brand] || []).includes(model)) return type;
  }
  return "hatchback";
}
