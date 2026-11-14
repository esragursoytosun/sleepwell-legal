/**
 * Öğrenen modelleri eğitir ve js/data/learned-models.js dosyasını üretir.
 *
 * Kullanım:
 *   node scripts/train-learned.mjs <kaggle-veri-seti-klasörü> <normal-rölanti-kayıtları-klasörü>
 *
 *  - 1. klasör: "Car Diagnostics Dataset" (Kaggle). Etiket = dosyanın klasör adı; parçalar 1,5 sn.
 *  - 2. klasör: "Sounds of Vehicle Internal Combustion Engines" (Zenodo 18777405). Kayıt başına en çok 3 pencere.
 * Sınama: bloklu 5 katlı çapraz doğrulama. Kaggle parçaları dosya sırasına göre ardışık bloklara ayrılır
 * (aynı kaynaktan kesilmiş komşu parçalar eğitim ve sınamaya birlikte düşmesin); normal araç kayıtları kayıt
 * bazında ayrılır. Ses dosyaları hiçbir yere kopyalanmaz; yalnızca katsayılar yazılır. Ek paket gerekmez.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { extractFeatures } from "../js/audio/features.js";
import { decodeWav } from "./measure-dataset.mjs";
import { featureVector, LEARNED_THRESHOLD } from "../js/engine/learned.js";

const [kaggleDir, normalDir] = process.argv.slice(2);
if (!kaggleDir || !normalDir) { console.error("Kullanım: node scripts/train-learned.mjs <kaggle-klasörü> <normal-rölanti-klasörü>"); process.exit(1); }

const WINDOW = 1.5;
const IDLE = { normal_engine_idle: 0, serpentine_belt: 1, power_steering: 1, low_oil: 2 };
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
  rows.push({ src: "kaggle", label, group: `${label}#${+(basename(p).match(/(\d+)\.wav$/i) || [0, 0])[1]}`, x: featureVector(extractFeatures(samples, sr)) });
}
for (const p of wavs(normalDir)) {
  const { samples, sr } = decodeWav(readFileSync(p)), n = Math.round(WINDOW * sr);
  for (let s = 0, k = 0; s + n <= samples.length && k < 3; s += n, k++) {
    rows.push({ src: "normal", label: "normal_engine_idle", group: `normal#${basename(p)}`, x: featureVector(extractFeatures(samples.subarray(s, s + n), sr)) });
  }
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
    if (g[0].src === "kaggle") groups.sort((a, b) => +a.split("#")[1] - +b.split("#")[1]);
    const fold = new Map(groups.map((id, i) => [id, Math.floor(i * 5 / groups.length)]));
    for (const r of g) r.fold = fold.get(r.group);
  }
  for (let f = 0; f < 5; f++) {
    const train = set.filter(r => r.fold !== f), M = fit(train.map(r => r.x), train.map(r => map[r.label]), K);
    for (const r of set) if (r.fold === f) r.p = predict(M, r.x);
  }
}

const idleRows = rows.filter(r => r.label in IDLE), brakeRows = rows.filter(r => r.label in BRAKE);
crossValidate(idleRows, IDLE, 3);
crossValidate(brakeRows, BRAKE, 2);
const hit = r => r.p[1] >= LEARNED_THRESHOLD;
const perCar = {};
for (const r of idleRows) if (r.src === "normal") (perCar[r.group] ||= []).push(r.p[1]);
const cars = Object.values(perCar);
const idleFaults = idleRows.filter(r => IDLE[r.label] === 1);
const measured = {
  idle: { normalCars: cars.length, falseAlarms: cars.filter(v => v.reduce((a, b) => a + b) / v.length >= LEARNED_THRESHOLD).length, faultClips: idleFaults.length, caught: idleFaults.filter(hit).length },
  brake: { normalClips: brakeRows.filter(r => r.label === "normal_brakes").length, falseAlarms: brakeRows.filter(r => r.label === "normal_brakes" && hit(r)).length,
    faultClips: brakeRows.filter(r => r.label === "worn_out_brakes").length, caught: brakeRows.filter(r => r.label === "worn_out_brakes" && hit(r)).length }
};
console.log("Sınama (eğitimde görülmeyen kayıtlar, eşik " + LEARNED_THRESHOLD + "):", JSON.stringify(measured, null, 1));

const list = a => "[" + a.map(v => +v.toFixed(4)).join(", ") + "]";
const model = M => `{\n    mu: ${list(M.mu)},\n    sd: ${list(M.sd)},\n    W: [\n${M.W.map(w => "      " + list(w)).join(",\n")}\n    ]\n  }`;
const pair = o => "{ " + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(", ") + " }";
const idle = fit(idleRows.map(r => r.x), idleRows.map(r => IDLE[r.label]), 3), brake = fit(brakeRows.map(r => r.x), brakeRows.map(r => BRAKE[r.label]), 2);
writeFileSync(new URL("../js/data/learned-models.js", import.meta.url), `/**
 * Etiketli ses örneklerinden öğrenilmiş iki küçük model (lojistik regresyon, 10 ses özelliği, 1,5 sn pencereler).
 * Bu dosya scripts/train-learned.mjs ile üretilir; elle değiştirmeyin.
 * Kaynaklar, ölçülen başarı ve lisans durumu: docs/ogrenen-model.md
 *
 * Eğitim verisi:
 *  - "Car Diagnostics Dataset" (Kaggle; lisansı "Unknown" olarak belirtilmiş): 1,5 sn parçalar.
 *  - Gerçek araçların normal rölanti kayıtları (Zenodo 18777405, CC BY 4.0): kayıt başına en çok 3 pencere.
 * Uygulamada ses dosyası yoktur; yalnızca aşağıdaki katsayılar bulunur.
 */
export const LEARNED = {
  trainedAt: "${new Date().toISOString().slice(0, 10)}",
  windowSeconds: ${WINDOW},
  /** Rölanti: sınıflar [normal, kayış tarafı (kayış + direksiyon pompası), yağ azlığı]. Yalnızca "kayış tarafı" kullanılır. */
  idle: ${model(idle)},
  /** Fren: sınıflar [normal fren, aşınmış fren]. */
  brake: ${model(brake)},
  /** Eğitimde görülmeyen kayıtlarla ölçülen sonuçlar (bloklu çapraz doğrulama, eşik ${LEARNED_THRESHOLD}). */
  measured: {
    idle: ${pair(measured.idle)},
    brake: ${pair(measured.brake)}
  }
};
`);
console.log("js/data/learned-models.js yazıldı.");
