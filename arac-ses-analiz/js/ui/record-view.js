import { $, esc, setNotice } from "./dom.js";
import { CONFIG } from "../config.js";
import { FAULTS, FAULT_BY_ID } from "../data/faults.js";
import { SYNTH } from "../audio/synth.js";
import { encodeWav } from "../audio/wav.js";
import { checkQuality } from "../audio/quality.js";
import { recordingSupported, startRecording, decodeToMono } from "../audio/recorder.js";
import { stopPlayback } from "../audio/context.js";
import { state } from "../state.js";

let active = null;      // süren kayıt
let timer = null;
let raf = null;

/** Yeni kaydı duruma yazar, oynatıcıyı ve kalite bildirimini günceller. */
function setRecording(samples, sr, blob, label) {
  if (state.recording) URL.revokeObjectURL(state.recording.url);
  const quality = checkQuality(samples, sr, { minSeconds: CONFIG.minRecordSeconds });
  state.recording = { samples, sr, blob, url: URL.createObjectURL(blob), label, quality };
  state.answers = {};

  $("recording").hidden = false;
  $("recLabel").textContent = `${label} · ${(samples.length / sr).toFixed(1)} sn`;
  $("player").src = state.recording.url;
  $("analyzeBtn").disabled = quality.level === "bad";

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

function drawSpectrum(analyser) {
  const canvas = $("viz"), g = canvas.getContext("2d");
  const data = new Uint8Array(analyser.frequencyBinCount);
  const color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const bars = 120, binHz = analyser.context.sampleRate / analyser.fftSize;
  const loop = () => {
    analyser.getByteFrequencyData(data);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = color;
    for (let i = 0; i < bars; i++) {
      const hz = 40 * Math.pow(300, i / bars);                       // 40 Hz – 12 kHz, logaritmik
      const k = Math.min(data.length - 1, Math.round(hz / binHz));
      const h = data[k] / 255 * canvas.height;
      g.fillRect(i * canvas.width / bars, canvas.height - h, canvas.width / bars - 2, h);
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
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
    setNotice($("recStatus"), "Mikrofon izni verilmedi. Tarayıcı ayarlarından bu site için mikrofona izin verin.", "bad");
    return;
  }
  setNotice($("recStatus"), "");
  $("recBtn").classList.add("on");
  drawSpectrum(active.analyser);
  const started = Date.now();
  const tick = () => {
    const s = (Date.now() - started) / 1000;
    $("recText").textContent = `Kaydediliyor… ${Math.floor(s)} sn`;
    $("recSub").textContent = s < 5 ? "En az 5 saniye kaydedin" : "Durdurmak için dokunun";
    if (s >= CONFIG.maxRecordSeconds) active?.stop();
  };
  tick();
  timer = setInterval(tick, 250);

  const blob = await active.done;
  clearInterval(timer);
  cancelAnimationFrame(raf);
  active = null;
  $("recBtn").classList.remove("on");
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
}

/** Kaydı ve kayıt adımındaki göstergeleri temizler. */
export function resetRecordView() {
  if (state.recording) URL.revokeObjectURL(state.recording.url);
  state.recording = null;
  $("recording").hidden = true;
  $("player").removeAttribute("src");
  $("analyzeBtn").disabled = true;
  $("recText").textContent = "Kayda başlamak için dokunun";
  setNotice($("recStatus"), "");
}
