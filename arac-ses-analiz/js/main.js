/** Uygulamanın giriş noktası: modülleri başlatır ve adımlar arası akışı yönetir. */
import { CONFIG } from "./config.js";
import { state, loadVehicle } from "./state.js";
import { extractFeatures } from "./audio/features.js";
import { SYNTH } from "./audio/synth.js";
import { playSamples, stopPlayback } from "./audio/context.js";
import { diagnose } from "./engine/diagnose.js";
import { $, setNotice } from "./ui/dom.js";
import { hydrateIcons } from "./ui/icons.js";
import { wait } from "./ui/animate.js";
import { drawWaveform } from "./ui/waveform.js";
import { initWizard, showStep } from "./ui/wizard.js";
import { initVehicleForm } from "./ui/vehicle-form.js";
import { initConditions } from "./ui/conditions-view.js";
import { initRecordView, resetRecordView, redrawViz } from "./ui/record-view.js";
import { renderCarDiagram, scanCar, setCarBody } from "./ui/car-diagram.js";
import { initTabs, showTab } from "./ui/tabs.js";
import { BODY_LABEL, bodyTypeOf } from "./data/vehicles.js";
import { dimensionsOf } from "./data/dimensions.js";
import { initPhoto } from "./ui/photo.js";
import { initObdView, renderObd } from "./ui/obd-view.js";
import { initBaselineView, renderBaseline } from "./ui/baseline-view.js";
import { createCar3D } from "./ui/car3d.js";
import { initResultsView, renderResults } from "./ui/results-view.js";
import { copySummary, shareSecondOpinion } from "./ui/share.js";
import { strengthOverTime } from "./audio/locate.js";
import { askText, renderPlan } from "./ui/plan-view.js";
import { renderEvidence } from "./ui/evidence-view.js";
import { initQuoteView, renderQuote, resetQuote } from "./ui/quote-view.js";
import { initFeedbackView, resetFeedback } from "./ui/feedback-view.js";
import { MECHANICS } from "./data/mechanics.js";
import { initGuidedView, renderGuided } from "./ui/guided-view.js";
import { buildSummary } from "./ui/share.js";

let result = null;

function runDiagnosis({ fresh = false } = {}) {
  result = diagnose({
    features: state.features,
    conditions: [...state.conditions],
    vehicle: state.vehicle,
    answers: state.answers,
    quality: state.recording.quality.level,
    codes: state.codes
  });
  renderResults(result, state, { fresh });
  renderGuided(result, state);
  // "Netleştir" sekmesi: açık soru varsa işaret konur
  $("tabDot").hidden = $("questions").querySelectorAll(".question").length === 0;
  renderObd(state);
  renderBaseline(state);
  renderPlan(result, state);
  renderEvidence(result, state);
  renderQuote(result);
}

/** Analiz: tarama animasyonu gösterilirken hesap yapılır, sonra sonuç adımına geçilir. */
async function analyze() {
  if (!state.recording || $("analyzeBtn").disabled) return;
  $("analyzeBtn").disabled = true;
  const overlay = $("analyzing"), steps = [...$("anSteps").children];
  steps.forEach(li => li.className = "");
  overlay.hidden = false;
  drawWaveform($("scanViz"), state.recording.samples);

  const { samples, sr } = state.recording;
  for (let i = 0; i < steps.length; i++) {
    steps[i].className = "active";
    await wait(i === 0 ? 120 : 380);
    if (i === 0) {
      state.features = extractFeatures(samples, sr, CONFIG.analysisSeconds);
      state.locate = strengthOverTime(samples, sr, state.features);
    }
    steps[i].className = "done";
  }
  state.answers = {};
  state.measured = {};
  state.codes = [];
  setNotice($("shareStatus"), "");
  resetQuote();
  resetFeedback();
  await wait(250);
  overlay.hidden = true;
  $("analyzeBtn").disabled = false;
  showStep(3);
  showTab("ozet");
  runDiagnosis({ fresh: true });
  scanCar();
}

function stopAllAudio() {
  stopPlayback();
  $("player").pause();
}

function init() {
  hydrateIcons();
  loadVehicle();
  initWizard();
  initVehicleForm();
  initConditions();
  initRecordView();
  renderCarDiagram($("carDiagram"));
  initTabs();
  initPhoto();
  // Açılıştaki ve sonuçtaki araç, seçilen modelin gövde tipine bürünür
  const hero = createCar3D($("heroStage"), { mode: "hero" });
  if (!hero) $("heroStage").classList.add("flat");
  const syncBody = () => {
    const v = state.vehicle, type = v.brand ? bodyTypeOf(v.brand, v.model) : "hatchback";
    const dims = dimensionsOf(v.brand, v.model);
    hero?.setBody(type, dims);
    setCarBody(type, dims);
    const size = dims ? ` · ${dims.length.toFixed(2).replace(".", ",")} m` : "";
    $("heroBody").textContent = v.brand && v.brand !== "Diğer" ? `${v.brand} ${v.model} · ${BODY_LABEL[type]}${size}` : "Aracınızı seçin";
  };
  for (const id of ["brand", "model"]) $(id).addEventListener("change", syncBody);
  syncBody();
  // Tuval yalnızca görünürken doğru ölçülür; kayıt adımına her girişte yeniden çizilir.
  document.addEventListener("stepchange", e => { if (e.detail === 2) redrawViz(); });
  initResultsView({
    onAnswer(questionId, answer) { state.answers[questionId] = answer; runDiagnosis(); },
    onResetAnswers() { state.answers = {}; state.measured = {}; runDiagnosis(); },
    onPlayExample(faultId) { stopAllAudio(); playSamples(SYNTH[faultId](44100, 5), 44100); }
  });

  initGuidedView(() => state, (questionId, answer) => { state.answers[questionId] = answer; runDiagnosis(); }, () => renderGuided(result, state));
  initObdView(() => state, () => runDiagnosis());
  initBaselineView(() => state);
  initQuoteView(() => ({ result, vehicle: state.vehicle }));
  initFeedbackView(() => ({ state, result }));

  $("analyzeBtn").addEventListener("click", analyze);
  $("copyAskBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(askText());
      $("copyAskBtn").lastChild.textContent = " Kopyalandı";
    } catch {
      $("copyAskBtn").lastChild.textContent = " Kopyalanamadı";
    }
    setTimeout(() => { $("copyAskBtn").lastChild.textContent = " Listeyi kopyala"; }, 2000);
  });
  $("planMechanics").addEventListener("click", e => {
    if (e.target.closest("[data-second-opinion]")) { showTab("paylas", { scroll: true }); $("shareBtn").click(); return; }
    const btn = e.target.closest("[data-mech]");
    const m = btn && MECHANICS.find(x => x.id === btn.dataset.mech);
    if (m) window.open(`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(buildSummary(state, result))}`, "_blank", "noopener");
  });
  $("playMineBtn").addEventListener("click", () => { stopAllAudio(); $("player").currentTime = 0; $("player").play(); });
  $("stopBtn").addEventListener("click", stopAllAudio);
  $("restartBtn").addEventListener("click", () => { stopAllAudio(); showStep(2); resetRecordView(); });

  $("shareBtn").addEventListener("click", async () => {
    const outcome = await shareSecondOpinion(state, result);
    if (outcome === "whatsapp") {
      setNotice($("shareStatus"), "WhatsApp'ta hazır mesaj açıldı. Ses kaydını eklemek için önce “Kaydı indir”e dokunun, sonra dosyayı sohbete ekleyin.");
    } else if (outcome === "shared") {
      setNotice($("shareStatus"), "Özet ve ses kaydı paylaşıldı.", "ok");
    }
  });
  // Claude'da yayınlanan sürümde düz indirme bağlantısı çalışmaz; varsa platformun indirme izni kullanılır.
  $("downloadBtn").addEventListener("click", async e => {
    if (!window.claude?.use || !state.recording) return;
    e.preventDefault();
    const downloads = await window.claude.use("downloads");
    if (!downloads) {
      setNotice($("shareStatus"), "Bu görünümde dosya indirilemiyor.", "warn");
      return;
    }
    const type = state.recording.blob.type;
    const ext = type.includes("webm") ? "webm" : type.includes("mp4") ? "mp4" : null;
    if (!ext) {
      setNotice($("shareStatus"), "Bu kayıt türü burada indirilemiyor. Kendi kaydınızı ya da yüklediğiniz dosyayı indirebilirsiniz.", "warn");
      return;
    }
    try {
      await downloads.save({ filename: "arac-sesi." + ext, data: state.recording.blob });
      setNotice($("shareStatus"), "Kayıt indirildi.", "ok");
    } catch (err) {
      if (err?.code !== "declined") setNotice($("shareStatus"), "Kayıt indirilemedi.", "bad");
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
