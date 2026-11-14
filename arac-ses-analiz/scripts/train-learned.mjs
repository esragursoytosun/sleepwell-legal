/**
 * Öğrenen modelleri eğitir ve js/data/learned-models.js dosyasını üretir.
 *
 * Kullanım:
 *   node scripts/train-learned.mjs <kaggle-klasörü> <normal-rölanti-klasörü> <telefon-kayıtları-klasörü>
 *
 *  - 1. klasör: "Car Diagnostics Dataset" (Kaggle). Etiket = dosyanın klasör adı; parçalar 1,5 sn.
 *  - 2. klasör: "Sounds of Vehicle Internal Combustion Engines" (Zenodo 18777405). Kayıt başına en çok 3 pencere.
 *  - 3. klasör: telefonla kaydedilmiş motor sesleri (Hugging Face, RashmiKarunarathne/MyDataSet).
 *    Etiket = dosya adının başı (healthy, belt_issue, misfire, tappet_issue). Kayıt başına en çok 4 pencere.
 * Sınama: bloklu 5 katlı çapraz doğrulama. Kaggle parçaları dosya sırasına göre ardışık bloklara ayrılır
 * (aynı kaynaktan kesilmiş komşu parçalar eğitim ve sınamaya birlikte düşmesin); normal araç kayıtları kayıt
 * bazında ayrılır. Ses dosyaları hiçbir yere kopyalanmaz; yalnızca katsayılar yazılır. Ek paket gerekmez.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { extractFeatures } from "../js/audio/features.js";
import { decodeWav } from "./measure-dataset.mjs";
import { featureVector, LEARNED_THRESHOLD } from "../js/engine/learned.js";

const [kaggleDir, normalDir, phoneDir] = process.argv.slice(2);
if (!kaggleDir || !normalDir || !phoneDir) { console.error("Kullanım: node scripts/train-learned.mjs <kaggle-klasörü> <normal-rölanti-klasörü> <telefon-kayıtları-klasörü>"); process.exit(1); }

const WINDOW = 1.5;
/** Rölanti sınıfları: 0 normal, 1 kayış tarafı, 2 yağ azlığı, 3 tekleme, 4 supap. Yalnızca 1 ve 4 uygulamada kullanılır. */
const IDLE = { normal_engine_idle: 0, healthy: 0, serpentine_belt: 1, power_steering: 1, belt_issue: 1, low_oil: 2, misfire: 3, tappet_issue: 4 };
const IDLE_CLASSES = 5, BELT = 1, VALVE = 4;
const BRAKE = { normal_brakes: 0, worn_out_brakes: 1 };

function* wavs(dir) {
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* wavs(p); else if (/\.wav$/i.test(n)) yield p;
  }
}

const rows = [];
for (const p of wavs(kaggleDir)) {
  const label = basename(dirname(p));
  if (!(label in IDLE) && !(label in BRAKE)) continue;
  const { samples, sr } = decodeWav(readFileSync(p));
  const order = +(basename(p).match(/(\d+)\.wav$/i) || [0, 0])[1];
  rows.push({ src: "kaggle", label, group: `${label}#${order}`, order, x: featureVector(extractFeatures(samples, sr)) });
}
const windowsOf = (samples, sr, max) => {
  const n = Math.round(WINDOW * sr), out = [];
  for (let s = 0; s + n <= samples.length && out.length < max; s += n) out.push(featureVector(extractFeatures(samples.subarray(s, s + n), sr)));
  return out;
};
for (const p of wavs(normalDir)) {
  const { samples, sr } = decodeWav(readFileSync(p));
  for (const x of windowsOf(samples, sr, 3)) rows.push({ src: "normal", label: "normal_engine_idle", group: `normal#${basename(p)}`, order: 0, x });
}
for (const p of wavs(phoneDir)) {
  const m = basename(p).match(/^(.*?)_?(\d+)\.wav$/i);
  if (!m || !(m[1] in IDLE)) continue;
  const { samples, sr } = decodeWav(readFileSync(p));
  for (const x of windowsOf(samples, sr, 4)) rows.push({ src: "phone", label: m[1], group: `phone#${basename(p)}`, order: +m[2], x });
}

function softmax(W, z) {
  const s = W.map(w => w.reduce((a, v, j) => a + v * (j < z.length ? z[j] : 1), 0));
  const m = Math.max(...s), e = s.map(v => Math.exp(v - m)), t = e.reduce((a, b) => a + b);
  return e.map(v => v / t);
}

/** Sınıf ağırlıklı, L2 düzenlemeli çok sınıflı lojistik regresyon (toplu gradyan inişi). */
function fit(X, y, K, { l2 = 1e-2, iters = 800, lr = 0.5 } = {}) {
  const d = X[0].length, mu = Array(d).fill(0), sd = Array(d).fill(0);
  for (const x of X) x.forEach((v, j) => { mu[j] += v / X.length; });
  for (const x of X) x.forEach((v, j) => { sd[j] += (v - mu[j]) ** 2 / X.length; });
  sd.forEach((v, j) => { sd[j] = Math.sqrt(v) || 1; });
  const Z = X.map(x => x.map((v, j) => (v - mu[j]) / sd[j]));
  const count = Array(K).fill(0); y.forEach(c => count[c]++);
  const cw = count.map(c => X.length / (K * c));
  const W = Array.from({ length: K }, () => Array(d + 1).fill(0));
  for (let it = 0; it < iters; it++) {
    const G = W.map(w => w.map(() => 0)); let tw = 0;
    Z.forEach((z, i) => {
      const p = softmax(W, z), w = cw[y[i]]; tw += w;
      for (let k = 0; k < K; k++) { const e = (p[k] - (y[i] === k ? 1 : 0)) * w; for (let j = 0; j < d; j++) G[k][j] += e * z[j]; G[k][d] += e; }
    });
    for (let k = 0; k < K; k++) for (let j = 0; j <= d; j++) W[k][j] -= lr * (G[k][j] / tw + (j < d ? l2 * W[k][j] : 0));
  }
  return { mu, sd, W };
}
const predict = (M, x) => softmax(M.W, x.map((v, j) => (v - M.mu[j]) / M.sd[j]));

/** Bloklu çapraz doğrulama: her satıra, eğitimde görülmediği kattan gelen olasılığı yazar. */
function crossValidate(set, map, K) {
  const byLabel = {};
  for (const r of set) (byLabel[r.src + r.label] ||= []).push(r);
  for (const g of Object.values(byLabel)) {
    const groups = [...new Set(g.map(r => r.group))];
    const order = new Map(g.map(r => [r.group, r.order]));
    groups.sort((a, b) => order.get(a) - order.get(b));
    const fold = new Map(groups.map((id, i) => [id, Math.floor(i * 5 / groups.length)]));
    for (const r of g) r.fold = fold.get(r.group);
  }
  for (let f = 0; f < 5; f++) {
    const train = set.filter(r => r.fold !== f), M = fit(train.map(r => r.x), train.map(r => map[r.label]), K);
    for (const r of set) if (r.fold === f) r.p = predict(M, r.x);
  }
}

const idleRows = rows.filter(r => r.label in IDLE), brakeRows = rows.filter(r => r.label in BRAKE);
crossValidate(idleRows, IDLE, IDLE_CLASSES);
crossValidate(brakeRows, BRAKE, 2);

/** Kayıt düzeyinde sonuç: pencerelerin ortalaması (uygulamadaki hesapla aynı). */
function recordings(set) {
  const rec = new Map();
  for (const r of set) {
    if (!rec.has(r.group)) rec.set(r.group, { label: r.label, ps: [] });
    rec.get(r.group).ps.push(r.p);
  }
  return [...rec.values()].map(g => ({ label: g.label, p: g.ps[0].map((_, k) => g.ps.reduce((a, p) => a + p[k], 0) / g.ps.length) }));
}
const count = (list, test) => list.filter(test).length;
const idleRecs = recordings(idleRows), brakeRecs = recordings(brakeRows);
const normals = idleRecs.filter(r => IDLE[r.label] === 0), belts = idleRecs.filter(r => IDLE[r.label] === BELT), valves = idleRecs.filter(r => IDLE[r.label] === VALVE);
const measured = {
  belt: { normal: normals.length, falseAlarms: count(normals, r => r.p[BELT] >= LEARNED_THRESHOLD.belt), faulty: belts.length, caught: count(belts, r => r.p[BELT] >= LEARNED_THRESHOLD.belt) },
  valve: { normal: normals.length, falseAlarms: count(normals, r => r.p[VALVE] >= LEARNED_THRESHOLD.valve), faulty: valves.length, caught: count(valves, r => r.p[VALVE] >= LEARNED_THRESHOLD.valve) },
  brake: { normal: count(brakeRecs, r => r.label === "normal_brakes"), falseAlarms: count(brakeRecs, r => r.label === "normal_brakes" && r.p[1] >= LEARNED_THRESHOLD.brake),
    faulty: count(brakeRecs, r => r.label === "worn_out_brakes"), caught: count(brakeRecs, r => r.label === "worn_out_brakes" && r.p[1] >= LEARNED_THRESHOLD.brake) }
};
console.log("Sınama (eğitimde görülmeyen kayıtlar):", JSON.stringify(measured, null, 1));

const list = a => "[" + a.map(v => +v.toFixed(4)).join(", ") + "]";
const model = M => `{\n    mu: ${list(M.mu)},\n    sd: ${list(M.sd)},\n    W: [\n${M.W.map(w => "      " + list(w)).join(",\n")}\n    ]\n  }`;
const pair = o => "{ " + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(", ") + " }";
const idle = fit(idleRows.map(r => r.x), idleRows.map(r => IDLE[r.label]), IDLE_CLASSES), brake = fit(brakeRows.map(r => r.x), brakeRows.map(r => BRAKE[r.label]), 2);
writeFileSync(new URL("../js/data/learned-models.js", import.meta.url), `/**
 * Etiketli ses örneklerinden öğrenilmiş iki küçük model (lojistik regresyon, 10 ses özelliği, 1,5 sn pencereler).
 * Bu dosya scripts/train-learned.mjs ile üretilir; elle değiştirmeyin.
 * Kaynaklar, ölçülen başarı ve lisans durumu: docs/ogrenen-model.md
 *
 * Eğitim verisi:
 *  - "Car Diagnostics Dataset" (Kaggle; lisansı "Unknown" olarak belirtilmiş): 1,5 sn parçalar.
 *  - Gerçek araçların normal rölanti kayıtları (Zenodo 18777405, CC BY 4.0): kayıt başına en çok 3 pencere.
 *  - Telefonla kaydedilmiş motor sesleri (Hugging Face, RashmiKarunarathne/MyDataSet; lisans belirtilmemiş).
 * Uygulamada ses dosyası yoktur; yalnızca aşağıdaki katsayılar bulunur.
 */
export const LEARNED = {
  trainedAt: "${new Date().toISOString().slice(0, 10)}",
  windowSeconds: ${WINDOW},
  /** Rölanti: sınıflar [normal, kayış tarafı, yağ azlığı, tekleme, supap]. Yalnızca "kayış tarafı" ve "supap" kullanılır. */
  idle: ${model(idle)},
  /** Fren: sınıflar [normal fren, aşınmış fren]. */
  brake: ${model(brake)},
  /** Eğitimde görülmeyen kayıtlarla ölçülen sonuçlar (bloklu çapraz doğrulama, kayıt düzeyinde). */
  measured: {
    belt: ${pair(measured.belt)},
    valve: ${pair(measured.valve)},
    brake: ${pair(measured.brake)}
  }
};
`);
console.log("js/data/learned-models.js yazıldı.");
