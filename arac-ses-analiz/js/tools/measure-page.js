/**
 * Veri seti ölçer (tarayıcı sürümü): seçilen klasördeki ses dosyalarını ölçer ve ölçümleri JSON olarak verir.
 * scripts/measure-dataset.mjs ile aynı çıktıyı üretir; kurulum gerektirmez.
 */
import { extractFeatures } from "../audio/features.js";
import { checkQuality } from "../audio/quality.js";
import { mfccSummary } from "../audio/mfcc.js";

const $ = id => document.getElementById(id);
const AUDIO = /\.(wav|mp3|m4a|ogg|flac|aac|webm)$/i;
const round = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v)));
let result = null;

async function decode(ctx, file) {
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
  const samples = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < samples.length; i++) samples[i] += ch[i] / buffer.numberOfChannels;
  }
  return { samples, sr: buffer.sampleRate };
}

$("folder").addEventListener("change", async e => {
  const files = [...e.target.files].filter(f => AUDIO.test(f.name));
  $("save").disabled = true;
  if (!files.length) { $("status").textContent = "Bu klasörde ses dosyası bulunamadı. Doğru klasörü seçtiğinizden emin olun."; return; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const recordings = [], counts = {};
  let skipped = 0, root = "";
  for (let i = 0; i < files.length; i++) {
    const parts = (files[i].webkitRelativePath || files[i].name).split("/");
    root = parts[0];
    const label = parts.at(-2) || "", state = parts.at(-3) || "";
    try {
      const { samples, sr } = await decode(ctx, files[i]);
      recordings.push({ file: parts.at(-1), label, state, quality: checkQuality(samples, sr).level,
        features: round(extractFeatures(samples, sr, 20)), mfcc: round(mfccSummary(samples, sr)) });
      const key = state ? `${state} / ${label}` : label;
      counts[key] = (counts[key] || 0) + 1;
    } catch { skipped++; }
    if (i % 5 === 0 || i === files.length - 1) {
      $("status").textContent = `Ölçülüyor: ${i + 1} / ${files.length}`;
      $("bar").style.width = `${((i + 1) / files.length * 100).toFixed(1)}%`;
      await new Promise(r => setTimeout(r));
    }
  }
  ctx.close();
  result = { version: 2, measuredAt: new Date().toISOString().slice(0, 10), root, recordings };
  $("status").textContent = `${recordings.length} kayıt ölçüldü` + (skipped ? `, ${skipped} dosya okunamadı` : "") + ". Sonuç dosyasını kaydedin.";
  $("counts").innerHTML = Object.entries(counts).map(([k, n]) => `<tr><td>${k.replace(/[&<>]/g, "")}</td><td>${n}</td></tr>`).join("");
  $("save").disabled = !recordings.length;
});

$("save").addEventListener("click", async () => {
  const text = JSON.stringify(result) + "\n", note = $("saveNote");
  const say = (msg, kind) => { note.hidden = false; note.className = "notice " + kind; note.textContent = msg; };
  const downloads = window.claude?.use ? await window.claude.use("downloads") : null;
  if (downloads) {
    try { await downloads.save({ filename: "veri-seti-olcumleri.json", data: text }); say("Kaydedildi. Bu dosyayı sohbete yükleyin.", "ok"); }
    catch (err) { if (err?.code !== "declined") say("Kaydedilemedi. Sayfayı yeniden açıp tekrar deneyin.", "bad"); }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = "veri-seti-olcumleri.json";
  a.click();
  say("Dosya indirildi: veri-seti-olcumleri.json. Bu dosyayı sohbete yükleyin.", "ok");
});
