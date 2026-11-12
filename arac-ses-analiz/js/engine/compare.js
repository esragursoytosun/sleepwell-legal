/**
 * Yönlendirmeli test: ana kayıt ile test kaydını karşılaştırıp bir takip sorusunu ölçerek cevaplar.
 * Saf modüldür; testlerde doğrudan kullanılır.
 */
const hzText = hz => (Math.round(hz / 10) * 10).toLocaleString("tr-TR") + " Hz";

/** Kullanıcının yapacağı testler. `question`: ölçümün cevapladığı takip sorusu. */
export const GUIDED_TESTS = [
  { id: "gaz", question: "devir", type: "speed", title: "Gaz vererek",
    text: "Vites boşta (ya da P'de) iken gaza hafifçe basın, devri yaklaşık 2.000'de sabit tutun ve telefonu ilk kayıttaki yerde tutun." },
  { id: "klima", question: "klima_kapat", type: "change", title: "Klimayı değiştirerek",
    text: "Klima açıksa kapatın, kapalıysa açın. Telefonu ilk kayıttaki yerde tutun." },
  { id: "elektrik", question: "elektrik_yuku", type: "change", title: "Elektrik yükü vererek",
    text: "Farları ve arka cam ısıtmasını açın. Telefonu ilk kayıttaki yerde tutun." }
];

/**
 * Ses motor devriyle birlikte değişiyor mu? Tonun frekansına, ton yoksa vuruntunun hızına bakılır.
 * @returns {{answer: "yes"|"no"|"unknown", text: string}}
 */
export function compareSpeed(base, test) {
  if (base.toneHz && test.toneHz) {
    const ratio = test.toneHz / base.toneHz;
    if (ratio >= 1.08) return { answer: "yes", text: `Ton devirle birlikte inceldi (${hzText(base.toneHz)} → ${hzText(test.toneHz)}). Ses, motorla birlikte dönen bir parçadan geliyor.` };
    if (ratio > 0.97 && ratio < 1.03) return { answer: "no", text: `Ton devirle değişmedi (${hzText(base.toneHz)}). Ses motor devrine bağlı görünmüyor.` };
  }
  if (base.rate && test.rate && base.periodicity >= 0.5 && test.periodicity >= 0.5) {
    const ratio = test.rate / base.rate;
    if (ratio >= 1.2) return { answer: "yes", text: `Vuruntu devirle hızlandı (saniyede ${Math.round(base.rate)} → ${Math.round(test.rate)}). Ses motorun dönüşüne bağlı.` };
    if (ratio > 0.92 && ratio < 1.08) return { answer: "no", text: "Vuruntunun hızı devirle değişmedi. Ses motor devrine bağlı görünmüyor." };
  }
  return { answer: "unknown", text: "Bu kayıttan net bir fark ölçülemedi. Devri sabit tutarak yeniden deneyebilir ya da soruyu kendiniz cevaplayabilirsiniz." };
}

/**
 * Bir şey değiştirildiğinde (klima, elektrik yükü) şikâyet edilen ses belirgin şekilde değişti mi?
 * @param {{kind: string, db: number}|null} baseLevel ana kayıttaki imza düzeyi (audio/locate.js signatureLevel)
 * @param {{kind: string, db: number}|null} testLevel test kaydındaki imza düzeyi
 * @returns {{answer: "yes"|"no"|"unknown", text: string}}
 */
export function compareChange(baseLevel, testLevel) {
  if (!baseLevel || !testLevel) return { answer: "unknown", text: "Kayıt karşılaştırma için çok kısa. Yaklaşık 5 saniye kaydedin." };
  const yes = d => ({ answer: "yes", text: `Ses belirgin şekilde ${d < 0 ? "azaldı" : "arttı"} (${Math.round(Math.abs(d))} dB). Bu değişiklik sesi etkiliyor.` });
  const no = { answer: "no", text: "Ses neredeyse aynı kaldı. Bu değişiklik sesi etkilemiyor." };
  const unsure = d => ({ answer: "unknown", text: `Küçük bir fark var (${Math.round(Math.abs(d))} dB) ama kesin değil. Telefonu aynı yerde tutarak yeniden deneyebilirsiniz.` });

  if (baseLevel.kind === "tone" && baseLevel.abs != null && testLevel.abs != null) {
    // Tonun baskınlığı arka plan gürültüsüyle, kendi düzeyi telefonun mesafesiyle değişebilir.
    // Gerçek bir değişim sayılması için ikisi de aynı yönde belirgin değişmelidir.
    const prom = testLevel.db - baseLevel.db, abs = testLevel.abs - baseLevel.abs;
    if (Math.abs(prom) >= 6 && Math.abs(abs) >= 6 && Math.sign(prom) === Math.sign(abs)) return yes(Math.abs(prom) < Math.abs(abs) ? prom : abs);
    if (Math.abs(prom) <= 3 || Math.abs(abs) <= 3) return no;
    return unsure(Math.abs(prom) < Math.abs(abs) ? prom : abs);
  }
  // Bant enerjisi telefonun mesafesinden etkilenir; bu yüzden eşiği yüksektir.
  const diff = testLevel.db - baseLevel.db;
  if (Math.abs(diff) >= 9) return yes(diff);
  if (Math.abs(diff) <= 4) return no;
  return unsure(diff);
}

/** Yönlendirmeli test bu sonuç için anlamlı mı? (Motor bölmesindeki sesler; elektrikli araç hariç.) */
export function guidedApplies(result, vehicle) {
  if (vehicle.fuel === "elektrik") return false;
  const prob = id => result.groups.find(g => g.id === id)?.prob || 0;
  return prob("motor") + prob("yardimci") >= 0.5;
}
