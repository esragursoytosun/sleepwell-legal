import { $, esc, setNotice } from "./dom.js";
import { icon } from "./icons.js";
import { CONFIG } from "../config.js";
import { extractFeatures } from "../audio/features.js";
import { checkQuality } from "../audio/quality.js";
import { signatureLevel } from "../audio/locate.js";
import { recordingSupported, startRecording, decodeToMono } from "../audio/recorder.js";
import { GUIDED_TESTS, compareChange, compareSpeed, guidedApplies } from "../engine/compare.js";

const TEST_SECONDS = 5;
let busy = false;

/** Test kaydını ana kayıtla karşılaştırır. */
function measure(test, samples, sr, state) {
  const quality = checkQuality(samples, sr, { minSeconds: 2 });
  if (quality.level === "bad") return { answer: "unknown", text: quality.issues[0].text };
  if (test.type === "speed") return compareSpeed(state.features, extractFeatures(samples, sr, CONFIG.analysisSeconds));
  const base = state.recording;
  return compareChange(signatureLevel(base.samples, base.sr, state.features), signatureLevel(samples, sr, state.features));
}

/** Yönlendirmeli test kartını çizer. Motor bölmesi dışındaki seslerde gizlenir. */
export function renderGuided(result, state) {
  const show = guidedApplies(result, state.vehicle) || Object.keys(state.measured).length > 0;
  $("guidedCard").hidden = !show;
  if (!show) return;
  setNotice($("guidedSafety"), "Testleri araç dururken, el freni çekili ve açık alanda yapın. Dönen parçalara ve sıcak yüzeylere yaklaşmayın.", "warn");
  $("guidedTests").innerHTML = GUIDED_TESTS.map(t => {
    const m = state.measured[t.id];
    const result = m ? `<div class="gtest-result${m.answer !== "unknown" ? " measured" : ""}">${icon(m.answer !== "unknown" ? "check" : "info")}<span>${esc(m.text)}</span></div>` : "";
    return `
    <div class="gtest" data-test="${t.id}">
      <div><b>${esc(t.title)}</b><p>${esc(t.text)}</p></div>
      <div class="gtest-actions">
        <button class="btn small" data-test-record>${icon("mic")} <span>${m ? "Yeniden kaydet" : "Kaydet"}</span></button>
        <label class="btn small">${icon("upload")} Dosya<input type="file" accept="audio/*,video/*" data-test-file hidden></label>
      </div>
      ${result}
    </div>`;
  }).join("");
}

/**
 * @param {() => object} getState
 * @param {(questionId: string, answer: "yes"|"no") => void} onMeasured ölçüm bir soruyu cevapladığında çağrılır
 * @param {() => void} onChange ölçüm sonuçsuz kaldığında kartın yeniden çizilmesi için
 */
export function initGuidedView(getState, onMeasured, onChange) {
  const box = $("guidedTests");

  async function process(test, blob) {
    const state = getState();
    let outcome;
    try {
      const { samples, sr } = await decodeToMono(blob);
      outcome = measure(test, samples, sr, state);
    } catch {
      outcome = { answer: "unknown", text: "Bu kayıt çözümlenemedi. Yeniden deneyin." };
    }
    state.measured[test.id] = outcome;
    if (outcome.answer === "unknown") onChange();
    else onMeasured(test.question, outcome.answer);
  }

  box.addEventListener("click", async e => {
    const btn = e.target.closest("[data-test-record]");
    if (!btn || busy) return;
    const test = GUIDED_TESTS.find(t => t.id === btn.closest(".gtest").dataset.test);
    const state = getState();
    if (!recordingSupported()) {
      state.measured[test.id] = { answer: "unknown", text: "Bu tarayıcı mikrofon kaydını desteklemiyor. “Dosya” ile bir kayıt yükleyin." };
      onChange();
      return;
    }
    let rec;
    try { rec = await startRecording(); } catch {
      state.measured[test.id] = { answer: "unknown", text: "Mikrofona erişilemedi. İzin verin ya da “Dosya” ile bir kayıt yükleyin." };
      onChange();
      return;
    }
    busy = true;
    btn.classList.add("recording");
    const label = btn.querySelector("span");
    const started = Date.now();
    const timer = setInterval(() => {
      const left = TEST_SECONDS - (Date.now() - started) / 1000;
      label.textContent = `Kaydediliyor… ${Math.max(0, Math.ceil(left))}`;
      if (left <= 0) rec.stop();
    }, 200);
    const blob = await rec.done;
    clearInterval(timer);
    busy = false;
    await process(test, blob);
  });

  box.addEventListener("change", async e => {
    const input = e.target.closest("[data-test-file]");
    const file = input?.files[0];
    if (!file) return;
    const test = GUIDED_TESTS.find(t => t.id === input.closest(".gtest").dataset.test);
    await process(test, file);
  });
}
