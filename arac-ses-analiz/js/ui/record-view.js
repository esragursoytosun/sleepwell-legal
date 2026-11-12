import { $, esc, setNotice } from "./dom.js";
import { CONFIG } from "../config.js";
import { FAULTS, FAULT_BY_ID } from "../data/faults.js";
import { SYNTH } from "../audio/synth.js";
import { encodeWav } from "../audio/wav.js";
import { checkQuality } from "../audio/quality.js";
import { recordingSupported, startRecording, decodeToMono } from "../audio/recorder.js";
import { stopPlayback } from "../audio/context.js";
import { drawIdle, drawWaveform, liveSpectrum } from "./waveform.js";
import { state } from "../state.js";

const RING = 351.86; // 2π·56
let active = null;     // süren kayıt
let timer = null;
let stopViz = null;

const mmss = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function setRing(progress) {
  $("recRing").style.strokeDashoffset = String(RING * (1 - Math.max(0, Math.min(1, progress))));
}

/** Görselleştirme alanını mevcut duruma göre yeniden çizer. */
export function redrawViz() {
  if (active) return;
  if (state.recording) { $("vizLabel").textContent = "Kaydınız"; drawWaveform($("viz"), state.recording.samples); }
  else { $("vizLabel").textContent = "Ses"; drawIdle($("viz")); }
}

/** Yeni kaydı duruma yazar, oynatıcıyı, görseli ve kalite bildirimini günceller. */
function setRecording(samples, sr, blob, label) {
  if (state.recording) URL.revokeObjectURL(state.recording.url);
  const quality = checkQuality(samples, sr, { minSeconds: CONFIG.minRecordSeconds });
  state.recording = { samples, sr, blob, url: URL.createObjectURL(blob), label, quality, isVideo: (blob.type || "").startsWith("video/") };
  state.answers = {};

  $("recording").hidden = false;
  $("recLabel").textContent = `${label} · ${(samples.length / sr).toFixed(1)} sn`;
  $("player").src = state.recording.url;
  $("analyzeBtn").disabled = quality.level === "bad";
  $("recTime").textContent = mmss(samples.length / sr);
  setRing(Math.min(1, samples.length / sr / CONFIG.maxRecordSeconds));
  redrawViz();

  if (quality.level === "ok") {
    setNotice($("recStatus"), "Kayıt uygun görünüyor. Analiz edebilirsiniz.", "ok");
  } else {
    const list = quality.issues.map(i => `<li>${esc(i.text)}</li>`).join("");
    const lead = quality.level === "bad" ? "Bu kayıt analiz için yeterli değil; lütfen yeniden kaydedin." : "Analiz yapılabilir, ancak daha iyi bir kayıt sonucu güçlendirir.";
    setNotice($("recStatus"), `${lead}<ul>${list}</ul>`, quality.level);
  }
}

async function loadBlob(blob, label) {
  setNotice($("recStatus"), "Ses çözümleniyor…");
  try {
    const { samples, sr } = await decodeToMono(blob);
    setRecording(samples, sr, blob, label);
  } catch {
    setNotice($("recStatus"), "Bu dosya çözümlenemedi. Farklı bir dosya ya da yeni bir kayıt deneyin.", "bad");
  }
}

async function toggleRecording() {
  if (active) { active.stop(); return; }
  stopPlayback();
  $("player").pause();
  if (!recordingSupported()) {
    setNotice($("recStatus"), "Bu tarayıcı mikrofon kaydını desteklemiyor. Dosya yüklemeyi deneyin.", "bad");
    return;
  }
  try {
    active = await startRecording();
  } catch {
    setNotice($("recStatus"), "Mikrofona erişilemedi. Tarayıcı ayarlarından bu site için mikrofona izin verin ya da telefonda çektiğiniz bir ses/video dosyasını “Dosya yükle” ile ekleyin.", "bad");
    return;
  }
  setNotice($("recStatus"), "");
  $("recBtn").classList.add("on");
  $("recWrap").classList.add("on");
  $("vizLabel").textContent = "Canlı";
  stopViz = liveSpectrum($("viz"), active.analyser, level => $("recWrap").style.setProperty("--level", level.toFixed(3)));

  const started = Date.now();
  const tick = () => {
    const s = (Date.now() - started) / 1000;
    $("recTime").textContent = mmss(s);
    setRing(s / CONFIG.maxRecordSeconds);
    $("recText").textContent = "Kaydediliyor…";
    $("recSub").textContent = s < 5 ? "En az 5 saniye kaydedin" : "Durdurmak için dokunun";
    if (s >= CONFIG.maxRecordSeconds) active?.stop();
  };
  tick();
  timer = setInterval(tick, 200);

  const blob = await active.done;
  clearInterval(timer);
  stopViz?.();
  active = null;
  $("recBtn").classList.remove("on");
  $("recWrap").classList.remove("on");
  $("recWrap").style.setProperty("--level", "0");
  $("recText").textContent = "Yeniden kaydetmek için dokunun";
  $("recSub").textContent = `En fazla ${CONFIG.maxRecordSeconds} saniye`;
  await loadBlob(blob, "Sizin kaydınız");
}

/** Kayıt adımını hazırlar. */
export function initRecordView() {
  $("recSub").textContent = `En fazla ${CONFIG.maxRecordSeconds} saniye`;
  $("demo").innerHTML = `<option value="">Örnek arıza sesiyle dene…</option>` +
    FAULTS.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join("");

  $("recBtn").addEventListener("click", toggleRecording);
  $("file").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadBlob(file, file.name);
    e.target.value = "";
  });
  $("demo").addEventListener("change", e => {
    const id = e.target.value;
    if (!id) return;
    const sr = 44100, samples = SYNTH[id](sr, 6);
    setRecording(samples, sr, encodeWav(samples, sr), `Örnek ses (yapay): ${FAULT_BY_ID[id].name}`);
    e.target.value = "";
  });
  window.addEventListener("resize", redrawViz);
}

/** Kaydı ve kayıt adımındaki göstergeleri temizler. */
export function resetRecordView() {
  if (state.recording) URL.revokeObjectURL(state.recording.url);
  state.recording = null;
  $("recording").hidden = true;
  $("player").removeAttribute("src");
  $("analyzeBtn").disabled = true;
  $("recText").textContent = "Kayda başlamak için dokunun";
  $("recTime").textContent = "00:00";
  setRing(0);
  setNotice($("recStatus"), "");
  redrawViz();
}
