/** Uygulamanın giriş noktası: modülleri başlatır ve adımlar arası akışı yönetir. */
import { CONFIG } from "./config.js";
import { state, loadVehicle } from "./state.js";
import { extractFeatures } from "./audio/features.js";
import { SYNTH } from "./audio/synth.js";
import { playSamples, stopPlayback } from "./audio/context.js";
import { diagnose } from "./engine/diagnose.js";
import { $, setNotice } from "./ui/dom.js";
import { initWizard, showStep } from "./ui/wizard.js";
import { initVehicleForm } from "./ui/vehicle-form.js";
import { initConditions } from "./ui/conditions-view.js";
import { initRecordView, resetRecordView } from "./ui/record-view.js";
import { renderCarDiagram } from "./ui/car-diagram.js";
import { initResultsView, renderResults } from "./ui/results-view.js";
import { copySummary, shareSecondOpinion } from "./ui/share.js";

let result = null;

function runDiagnosis({ fresh = false } = {}) {
  result = diagnose({
    features: state.features,
    conditions: [...state.conditions],
    vehicle: state.vehicle,
    answers: state.answers,
    quality: state.recording.quality.level
  });
  renderResults(result, state, { fresh });
}

function analyze() {
  if (!state.recording) return;
  const { samples, sr } = state.recording;
  state.features = extractFeatures(samples, sr, CONFIG.analysisSeconds);
  state.answers = {};
  setNotice($("shareStatus"), "");
  runDiagnosis({ fresh: true });
  showStep(3);
}

function stopAllAudio() {
  stopPlayback();
  $("player").pause();
}

function init() {
  loadVehicle();
  initWizard();
  initVehicleForm();
  initConditions();
  initRecordView();
  renderCarDiagram($("carDiagram"));
  initResultsView({
    onAnswer(questionId, answer) { state.answers[questionId] = answer; runDiagnosis(); },
    onResetAnswers() { state.answers = {}; runDiagnosis(); },
    onPlayExample(faultId) { stopAllAudio(); playSamples(SYNTH[faultId](44100, 5), 44100); }
  });

  $("analyzeBtn").addEventListener("click", analyze);
  $("playMineBtn").addEventListener("click", () => { stopAllAudio(); $("player").currentTime = 0; $("player").play(); });
  $("stopBtn").addEventListener("click", stopAllAudio);
  $("restartBtn").addEventListener("click", () => { stopAllAudio(); resetRecordView(); showStep(2); });

  $("shareBtn").addEventListener("click", async () => {
    const outcome = await shareSecondOpinion(state, result);
    if (outcome === "whatsapp") {
      setNotice($("shareStatus"), "WhatsApp'ta hazır mesaj açıldı. Ses kaydını eklemek için önce “Kaydı indir”e dokunun, sonra dosyayı sohbete ekleyin.");
    } else if (outcome === "shared") {
      setNotice($("shareStatus"), "Özet ve ses kaydı paylaşıldı.", "ok");
    }
  });
  $("copyBtn").addEventListener("click", async () => {
    try {
      await copySummary(state, result);
      setNotice($("shareStatus"), "Özet panoya kopyalandı.", "ok");
    } catch {
      setNotice($("shareStatus"), "Özet kopyalanamadı. Tarayıcı pano iznini kontrol edin.", "bad");
    }
  });
}

init();
