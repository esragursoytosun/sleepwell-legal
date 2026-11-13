/**
 * Etiketli bir ses veri setini ölçer: her WAV dosyasından uygulamanın kullandığı ses özelliklerini çıkarır
 * ve küçük bir JSON dosyasına yazar. Ses dosyaları hiçbir yere gönderilmez; yalnızca ölçümler yazılır.
 *
 * Kullanım:
 *   node scripts/measure-dataset.mjs <veri-seti-klasörü> [çıktı.json]
 *
 * Etiket, dosyanın bulunduğu klasörün adıdır (ör. ".../idle state/serpentine_belt/a.wav" → "serpentine_belt");
 * bir üst klasör de "durum" olarak kaydedilir (ör. "idle state"). Kurulum ya da ek paket gerekmez (Node.js 20+).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { extractFeatures } from "../js/audio/features.js";
import { checkQuality } from "../js/audio/quality.js";
import { mfccSummary } from "../js/audio/mfcc.js";

/** WAV dosyasını mono örneklere çevirir (PCM 8/16/24/32 bit ve 32/64 bit kayan nokta). */
export function decodeWav(buf) {
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WAVE") throw new Error("WAV değil");
  let fmt = null, data = null;
  for (let p = 12; p + 8 <= buf.length;) {
    const id = buf.toString("latin1", p, p + 4), size = buf.readUInt32LE(p + 4), start = p + 8;
    if (id === "fmt ") {
      let format = buf.readUInt16LE(start);
      if (format === 0xfffe && size >= 26) format = buf.readUInt16LE(start + 24);   // WAVE_FORMAT_EXTENSIBLE
      fmt = { format, channels: buf.readUInt16LE(start + 2), sr: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) };
    } else if (id === "data") {
      data = buf.subarray(start, Math.min(buf.length, start + size));
    }
    p = start + size + (size & 1);
  }
  if (!fmt || !data) throw new Error("fmt ya da data bölümü yok");
  const { format, channels, sr, bits } = fmt, bytes = bits >> 3, frames = Math.floor(data.length / (bytes * channels));
  const read =
    format === 3 ? (bits === 32 ? o => data.readFloatLE(o) : o => data.readDoubleLE(o))
    : format === 1 ? (bits === 8 ? o => (data[o] - 128) / 128
      : bits === 16 ? o => data.readInt16LE(o) / 32768
      : bits === 24 ? o => data.readIntLE(o, 3) / 8388608
      : o => data.readInt32LE(o) / 2147483648)
    : null;
  if (!read) throw new Error(`desteklenmeyen WAV biçimi (${format})`);
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += read((i * channels + c) * bytes);
    out[i] = s / channels;
  }
  return { samples: out, sr };
}

function* wavFiles(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* wavFiles(path);
    else if (/\.wav$/i.test(name)) yield path;
  }
}

const round = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v)));

/** Klasördeki tüm WAV dosyalarını ölçer. */
export function measureDataset(root) {
  const recordings = [], skipped = [];
  for (const path of wavFiles(root)) {
    try {
      const { samples, sr } = decodeWav(readFileSync(path));
      recordings.push({
        file: basename(path),
        label: basename(dirname(path)),
        state: basename(dirname(dirname(path))),
        quality: checkQuality(samples, sr).level,
        features: round(extractFeatures(samples, sr, 20)),
        mfcc: round(mfccSummary(samples, sr))
      });
    } catch (err) {
      skipped.push(`${path}: ${err.message}`);
    }
  }
  return { recordings, skipped };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [root, out = "veri-seti-olcumleri.json"] = process.argv.slice(2);
  if (!root) { console.error("Kullanım: node scripts/measure-dataset.mjs <veri-seti-klasörü> [çıktı.json]"); process.exit(1); }
  const { recordings, skipped } = measureDataset(root);
  writeFileSync(out, JSON.stringify({ version: 2, measuredAt: new Date().toISOString().slice(0, 10), root: basename(resolve(root)), recordings }) + "\n");
  const counts = {};
  for (const r of recordings) counts[`${r.state} / ${r.label}`] = (counts[`${r.state} / ${r.label}`] || 0) + 1;
  for (const [k, n] of Object.entries(counts)) console.log(String(n).padStart(5), k);
  console.log(`${recordings.length} kayıt ölçüldü → ${out}` + (skipped.length ? ` · ${skipped.length} dosya atlandı` : ""));
  for (const s of skipped.slice(0, 5)) console.log("  atlandı:", s);
}
