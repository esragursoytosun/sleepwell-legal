/**
 * Uçtan uca duman testi: uygulamayı gerçek bir tarayıcıda açar ve ana akışı dener.
 * Çalıştırma: `npm run test:e2e` (Playwright ve Chromium kurulu olmalıdır).
 * İsteğe bağlı: SCREENSHOT_DIR ortam değişkeni verilirse ekran görüntüleri oraya yazılır.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createStaticServer } from "./serve.mjs";
import { encodeWav } from "../js/audio/wav.js";

const { chromium } = createRequire(import.meta.url)("playwright");
const shotDir = process.env.SCREENSHOT_DIR;

const server = createStaticServer().listen(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const errors = [];

async function newPage(viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { window.__opened = []; window.open = url => { window.__opened.push(url); return null; }; });
  await page.goto(base);
  return page;
}
const shot = async (page, name) => { if (shotDir) await page.screenshot({ path: join(shotDir, name + ".png"), fullPage: true }); };
/** Analiz düğmesine basar, tarama animasyonunun bitip sonuç adımının açılmasını bekler. */
async function analyze(page) {
  await page.click("#analyzeBtn");
  await page.waitForSelector("#step-3:not([hidden])");
  await page.waitForTimeout(1300); // giriş animasyonları ve sayaçlar
}
/** Bir soruyu cevaplar ve soru listesinin yenilenmesini bekler. */
async function answer(page, selector, value) {
  const q = page.locator(selector).first();
  const id = await q.getAttribute("data-q");
  await q.locator(`[data-answer="${value}"]`).click();
  await page.waitForSelector(`.question[data-q="${id}"]`, { state: "detached" });
  await page.waitForTimeout(1000); // kartların yer değiştirmesi ve sayaçlar
}
/** Test için WAV dosyası: gürültü içinde sabit ton (toneAmp 0 ise yalnızca gürültü). */
async function wavFile(name, hz, toneAmp, seconds = 5) {
  let seed = 3;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const x = Float32Array.from({ length: 44100 * seconds }, (_, i) => 0.05 * rnd() + toneAmp * Math.sin(2 * Math.PI * hz * i / 44100));
  return { name, mimeType: "audio/wav", buffer: Buffer.from(await encodeWav(x, 44100).arrayBuffer()) };
}
/** Sonuç ekranında bir sekmeyi açar. */
const tab = (page, id) => page.click(`.tab[data-tab="${id}"]`);
const hiddenAttr = (page, sel) => page.evaluate(q => document.querySelector(q).hidden, sel);
const visibleStep = page => page.evaluate(() => [...document.querySelectorAll(".step")].findIndex(s => !s.hidden));

try {
  // --- Senaryo 1: bilinen model sorunu olan araç, soğuk çalıştırmada zincir sesi
  let page = await newPage();
  assert.equal(await visibleStep(page), 0);
  await page.selectOption("#brand", "Peugeot");
  await page.selectOption("#model", "208");
  await page.fill("#year", "2018");
  await page.locator("#year").blur();
  await shot(page, "1-arac");
  await page.click("#step-0 [data-next]");
  await page.click('.chip[data-id="soguk"]');
  await shot(page, "2-belirti");
  await page.click("#step-1 [data-next]");
  assert.equal(await page.isDisabled("#analyzeBtn"), true, "kayıt yokken analiz kapalı olmalı");
  await page.selectOption("#demo", "zincir");
  assert.equal(await page.isDisabled("#analyzeBtn"), false);
  assert.match(await page.textContent("#recStatus"), /uygun/);
  await shot(page, "3-kayit");
  await analyze(page);
  assert.equal(await visibleStep(page), 3);
  assert.equal(await page.textContent("#groupName"), "Motor");
  assert.match(await page.textContent(".fault.sel .fault-name"), /zincir/i);
  assert.match(await page.textContent(".fault.sel .model-note"), /PureTech/);
  assert.match(await page.textContent("#summaryLine"), /Peugeot 208 \(2018\)/);
  await shot(page, "4-sonuc");

  // Ne yapmalısınız: aciliyet, ustaya söylenecekler, kırmızı bayraklar; 2018 model için kesin garanti iddiası yok
  assert.match(await page.textContent("#planFor"), /zincir/i);
  assert.match(await page.textContent("#planUrgency"), /Bu hafta baktırın/);
  assert.match(await page.textContent("#planAsk"), /Onayım olmadan/);
  assert.match(await page.textContent("#planFlags"), /ön ödeme/);
  assert.match(await page.textContent("#planPrices"), /toplanıyor/);
  assert.equal(await hiddenAttr(page, "#planWarranty"), true);
  // Neden bu sonuç: gerekçe var; ses kaydı video olmadığı için konum yerine ipucu
  assert.ok(await page.locator("#reasons li").count() >= 1);
  assert.match(await page.textContent("#reasons"), /Soğuk çalıştırmada/);
  assert.equal(await hiddenAttr(page, "#locate"), true);
  assert.match(await page.textContent("#locHint"), /video çekerseniz/);

  // Teklif kontrolü: ilgili kalem + ilgisiz pahalı kalem → ikinci görüş
  assert.equal(await page.isDisabled("#quoteCheckBtn"), true);
  // Sekmeler: aynı anda tek bölüm görünür
  assert.equal(await page.isVisible("#faultList"), true);
  assert.equal(await page.isVisible("#quoteCard"), false);
  await tab(page, "teklif");
  assert.equal(await page.isVisible("#faultList"), false);
  await page.click('#quoteRelated .pchip[data-part="triger_seti"]');
  await page.click(".more-parts summary");
  await page.click('#quoteOther .pchip[data-part="sanziman"]');
  await page.click("#quoteCheckBtn");
  assert.match(await page.textContent("#quoteVerdict"), /ikinci görüş/);
  assert.match(await page.textContent(".qi.unrelated"), /Şanzıman/);
  await shot(page, "4b-teklif");

  // Sonuç bildirme: kaydedilir, gönder düğmesi açılır
  assert.equal(await page.isDisabled("#fbSendBtn"), true);
  await tab(page, "paylas");
  await page.selectOption("#fbPart", "triger_seti");
  await page.selectOption("#fbResolved", "yes");
  await page.fill("#fbPaid", "9000");
  await page.click("#fbSaveBtn");
  assert.match(await page.textContent("#fbStatus"), /Kaydedildi/);
  assert.equal(await page.isDisabled("#fbSendBtn"), false);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("arac-ses-analiz:cases")));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].outcome.part, "triger_seti");
  assert.equal(saved[0].prediction[0].fault, "zincir");

  // Paylaşım: dosya paylaşımı yoksa WhatsApp'a hazır mesaj açılır
  await page.click("#shareBtn");
  const opened = await page.evaluate(() => window.__opened);
  assert.equal(opened.length, 1);
  assert.match(decodeURIComponent(opened[0]), /^https:\/\/wa\.me\/\?text=.*Peugeot 208.*zinciri/s);
  assert.match(await page.textContent("#shareStatus"), /Kaydı indir/);

  // Araç bilgisi sayfa yenilenince korunur
  await page.reload();
  assert.equal(await page.inputValue("#brand"), "Peugeot");
  assert.equal(await page.inputValue("#model"), "208");
  assert.equal(await page.inputValue("#year"), "2018");
  await page.close();

  // --- Senaryo 2: alt takım takırtısı; sorular parçayı netleştirir
  page = await newPage({ width: 1100, height: 900 });
  // Yeni model araç: garanti uyarısı
  await page.selectOption("#brand", "Fiat");
  await page.selectOption("#model", "Egea");
  assert.match(await page.textContent("#heroBody"), /Fiat Egea · Sedan/);
  await page.selectOption("#model", "Doblo");
  assert.match(await page.textContent("#heroBody"), /Hafif ticari/);
  await page.selectOption("#model", "Egea");
  await page.fill("#year", String(new Date().getFullYear()));
  await page.locator("#year").blur();
  await page.click("#step-0 [data-next]");
  await page.click('.chip[data-id="tumsek"]');
  await page.click("#step-1 [data-next]");
  await page.selectOption("#demo", "z_rot");
  await analyze(page);
  assert.match(await page.textContent("#groupName"), /Alt takım/);
  assert.match(await page.textContent("#planWarranty"), /garantisinde/);
  assert.match(await page.textContent("#planMechanics"), /Şehrinizi seçerseniz/);
  assert.equal(await hiddenAttr(page, "#guidedCard"), true);
  assert.equal(await hiddenAttr(page, "#tabDot"), false);
  await tab(page, "netlestir");
  assert.equal(await page.locator(".question").count(), 3);
  const before = await page.textContent("#faultList");
  for (let round = 0; round < 6 && await page.locator('.question[data-q="ince_tikirti"]').count() === 0; round++) {
    await answer(page, ".question", "unknown");
  }
  await answer(page, '.question[data-q="ince_tikirti"]', "yes");
  assert.notEqual(await page.textContent("#faultList"), before);
  assert.match(await page.textContent("#faultList .fault:first-child .fault-name"), /Z rot/);
  assert.match(await page.textContent("#answeredLine"), /soru cevaplandı/);
  // Başka bir arızayı seçince çizimdeki konum değişir
  const loc1 = await page.textContent("#locLabel");
  await tab(page, "ozet");
  await page.click("#faultList .fault:nth-child(2) .fault-head");
  assert.notEqual(await page.textContent("#locLabel"), loc1);
  await shot(page, "5-sorular-masaustu");
  await tab(page, "netlestir");
  await page.click("#resetAnswersBtn");
  await page.waitForTimeout(300);
  assert.equal(await hiddenAttr(page, "#answeredRow"), true);

  // Yeni analiz kayıt adımına döner ve kaydı temizler
  await tab(page, "paylas");
  await page.click("#restartBtn");
  assert.equal(await visibleStep(page), 2);
  assert.equal(await page.isDisabled("#analyzeBtn"), true);
  await page.close();

  // --- Senaryo 3: yönlendirmeli test; ölçüm soruları cevaplar ve alternatörü öne çıkarır
  page = await newPage();
  await page.click("#step-0 [data-next]");
  await page.click('.chip[data-id="rolanti"]');
  await page.click("#step-1 [data-next]");
  await page.selectOption("#demo", "alternator");
  await analyze(page);
  assert.equal(await hiddenAttr(page, "#guidedCard"), false);
  await tab(page, "netlestir");
  assert.equal(await page.locator(".gtest").count(), 3);
  // Gaz verince ton inceliyor → "devir" sorusu ölçülerek cevaplanır
  await page.setInputFiles('.gtest[data-test="gaz"] [data-test-file]', await wavFile("gaz.wav", 2750, 0.3));
  await page.waitForSelector('.gtest[data-test="gaz"] .gtest-result.measured');
  assert.match(await page.textContent('.gtest[data-test="gaz"] .gtest-result'), /inceldi/);
  assert.equal(await page.locator('.question[data-q="devir"]').count(), 0);
  // Elektrik yüküyle ton kayboluyor → ses yüke bağlı → alternatör
  await page.setInputFiles('.gtest[data-test="elektrik"] [data-test-file]', await wavFile("yuk.wav", 2100, 0));
  await page.waitForSelector('.gtest[data-test="elektrik"] .gtest-result.measured');
  await page.waitForTimeout(1200);
  assert.match(await page.textContent("#faultList .fault:first-child .fault-name"), /Alternatör/);
  assert.match(await page.textContent("#reasons"), /Yaptığınız testte ölçüldü/);
  await shot(page, "6-yonlendirmeli-test");
  await page.close();
  // Alt takım sesinde yönlendirmeli test önerilmez (senaryo 2'de denetlendi)

  assert.deepEqual(errors, [], "tarayıcı hatası olmamalı");
  console.log("E2E: tüm senaryolar geçti");
} finally {
  await browser.close();
  server.close();
}
