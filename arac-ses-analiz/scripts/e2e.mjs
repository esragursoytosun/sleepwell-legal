/**
 * Uçtan uca duman testi: uygulamayı gerçek bir tarayıcıda açar ve ana akışı dener.
 * Çalıştırma: `npm run test:e2e` (Playwright ve Chromium kurulu olmalıdır).
 * İsteğe bağlı: SCREENSHOT_DIR ortam değişkeni verilirse ekran görüntüleri oraya yazılır.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createStaticServer } from "./serve.mjs";

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
  await page.click("#step-0 [data-next]");
  await page.click('.chip[data-id="tumsek"]');
  await page.click("#step-1 [data-next]");
  await page.selectOption("#demo", "z_rot");
  await analyze(page);
  assert.match(await page.textContent("#groupName"), /Alt takım/);
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
  await page.click("#faultList .fault:nth-child(2) .fault-head");
  assert.notEqual(await page.textContent("#locLabel"), loc1);
  await shot(page, "5-sorular-masaustu");
  await page.click("#resetAnswersBtn");
  await page.waitForTimeout(300);
  assert.equal(await page.isHidden("#answeredRow"), true);

  // Yeni analiz kayıt adımına döner ve kaydı temizler
  await page.click("#restartBtn");
  assert.equal(await visibleStep(page), 2);
  assert.equal(await page.isDisabled("#analyzeBtn"), true);
  await page.close();

  assert.deepEqual(errors, [], "tarayıcı hatası olmamalı");
  console.log("E2E: tüm senaryolar geçti");
} finally {
  await browser.close();
  server.close();
}
