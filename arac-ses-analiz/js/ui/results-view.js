import { $, esc, percent, setNotice } from "./dom.js";
import { CONFIG } from "../config.js";
import { FAULT_BY_ID, LOCATIONS, URGENCY } from "../data/faults.js";
import { CONDITION_LABEL } from "../data/conditions.js";
import { ANSWERS, QUESTIONS } from "../data/questions.js";
import { nextQuestions } from "../engine/diagnose.js";
import { highlightLocation } from "./car-diagram.js";
import { vehicleLine } from "./share.js";

let selectedId = null;

function selectFault(id) {
  selectedId = id;
  for (const card of $("faultList").children) {
    const on = card.dataset.id === id;
    card.classList.toggle("sel", on);
    card.querySelector(".fault-head").setAttribute("aria-expanded", String(on));
    card.querySelector(".fault-body").hidden = !on;
  }
  $("locLabel").textContent = highlightLocation($("carDiagram"), FAULT_BY_ID[id].loc);
}

function renderHead(result, state) {
  const top = result.groups[0], conf = result.confidence;
  $("groupName").textContent = top.label;
  $("groupPct").textContent = percent(top.prob);
  $("confBadge").textContent = conf.label;
  $("confBadge").className = "badge " + conf.level;

  const conds = [...state.conditions].map(c => CONDITION_LABEL[c]);
  $("summaryLine").textContent = vehicleLine(state.vehicle) + (conds.length ? " · " + conds.join(", ") : "");

  if (conf.level === "good") { setNotice($("confNote"), ""); return; }
  const reasons = conf.reasons.map(r => `<li>${esc(r)}</li>`).join("");
  const lead = conf.level === "low"
    ? "Bu sonuç kesin değil. Aşağıdaki soruları cevaplayın, daha iyi bir kayıt alın ya da ikinci görüş isteyin."
    : "Sonuç yol gösterici ama kesin değil.";
  setNotice($("confNote"), `${lead}${reasons ? `<ul>${reasons}</ul>` : ""}`, conf.level === "low" ? "bad" : "warn");
}

function renderQuestions(result, state) {
  const open = nextQuestions(result.ranked, state.answers, CONFIG.questionsPerRound);
  const answered = QUESTIONS.filter(q => state.answers[q.id]).length;
  $("questionsCard").hidden = !open.length && !answered;
  $("questions").innerHTML = open.length
    ? open.map(q => `
      <div class="question" data-q="${q.id}">
        <p>${esc(q.text)}</p>
        <div class="answers">${ANSWERS.map(([v, l]) => `<button class="btn small" data-answer="${v}">${l}</button>`).join("")}</div>
      </div>`).join("")
    : `<p class="hint">Sorulacak başka ayırt edici soru kalmadı.</p>`;
  $("answeredRow").hidden = !answered;
  $("answeredLine").textContent = `${answered} soru cevaplandı.`;
}

function renderFaults(result) {
  const shown = result.ranked.slice(0, CONFIG.resultsShown);
  $("faultList").innerHTML = shown.map((r, i) => {
    const f = r.fault;
    return `
    <div class="fault" data-id="${f.id}">
      <button class="fault-head" aria-expanded="false">
        <div class="fault-top"><span class="fault-name">${i + 1}. ${esc(f.name)}</span><span class="pct">${percent(r.prob)}</span></div>
        <div class="bar"><i style="width:${(r.prob / shown[0].prob * 100).toFixed(1)}%"></i></div>
        <div class="meta"><span>${esc(LOCATIONS[f.loc].label)}</span><span class="urg u${f.urg}">${URGENCY[f.urg]}</span></div>
      </button>
      <div class="fault-body" hidden>
        <p>${esc(f.desc)}</p>
        <p><b>Ne yapmalı:</b> ${esc(f.tip)}</p>
        ${r.notes.map(n => `<div class="model-note">${esc(n)}</div>`).join("")}
        <div class="row"><button class="btn small" data-play="${f.id}">Bu arızanın örnek sesini dinle</button></div>
      </div>
    </div>`;
  }).join("");
  selectFault(shown.some(r => r.fault.id === selectedId) ? selectedId : shown[0].fault.id);
}

function renderTech(F) {
  const rows = [
    ["Baskın ton", `${Math.round(F.peakHz)} Hz`],
    ["Spektral merkez", `${Math.round(F.centroid)} Hz`],
    ["Tonluluk (ıslık/uğultu)", percent(F.tonal)],
    ["Darbelilik (vuruntu)", percent(F.imp)],
    ["Ritim", F.rate ? `${F.rate.toFixed(1)} /sn (${percent(F.periodicity)} düzenli)` : "belirgin değil"],
    ["Bas / orta / tiz", F.bands.map(percent).join(" / ")],
    ["Süre", `${F.dur.toFixed(1)} sn`]
  ];
  $("tech").innerHTML = rows.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join("");
}

/** Sonuç adımının tamamını çizer. `fresh` yeni bir analizse seçim sıfırlanır. */
export function renderResults(result, state, { fresh = false } = {}) {
  if (fresh) selectedId = null;
  renderHead(result, state);
  renderQuestions(result, state);
  renderFaults(result);
  renderTech(state.features);
  $("downloadBtn").href = state.recording.url;
  $("downloadBtn").download = "arac-sesi";
}

/**
 * Sonuç adımındaki tıklamaları bağlar.
 * @param {{onAnswer: (questionId: string, answer: string) => void, onResetAnswers: () => void, onPlayExample: (faultId: string) => void}} handlers
 */
export function initResultsView({ onAnswer, onResetAnswers, onPlayExample }) {
  $("faultList").addEventListener("click", e => {
    const play = e.target.closest("[data-play]");
    if (play) { onPlayExample(play.dataset.play); return; }
    const head = e.target.closest(".fault-head");
    if (head) selectFault(head.parentElement.dataset.id);
  });
  $("questions").addEventListener("click", e => {
    const btn = e.target.closest("[data-answer]");
    if (btn) onAnswer(btn.closest(".question").dataset.q, btn.dataset.answer);
  });
  $("resetAnswersBtn").addEventListener("click", onResetAnswers);
}
