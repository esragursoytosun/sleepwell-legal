import { $, esc, percent, setNotice } from "./dom.js";
import { CONFIG } from "../config.js";
import { FAULT_BY_ID, LOCATIONS, URGENCY } from "../data/faults.js";
import { CONDITION_LABEL } from "../data/conditions.js";
import { ANSWERS, QUESTIONS } from "../data/questions.js";
import { nextQuestions } from "../engine/diagnose.js";
import { highlightLocation } from "./car-diagram.js";
import { GROUP_ICON, icon } from "./icons.js";
import { countUp, reflow } from "./animate.js";
import { vehicleLine } from "./share.js";

const GAUGE = 326.73; // 2π·52
const CONF_ICON = { low: "alert", mid: "info", good: "shield" };
let selectedId = null;
let lastGroupProb = 0;

function selectFault(id) {
  selectedId = id;
  for (const card of $("faultList").children) {
    const on = card.dataset.id === id;
    card.classList.toggle("sel", on);
    card.querySelector(".fault-head").setAttribute("aria-expanded", String(on));
  }
  highlightLocation($("carDiagram"), $("locLabel"), FAULT_BY_ID[id].loc);
}

function renderHead(result, state, fresh) {
  const top = result.groups[0], conf = result.confidence;
  $("groupName").textContent = top.label;
  countUp($("groupPct"), fresh ? 0 : lastGroupProb * 100, top.prob * 100, { duration: 1100 });
  const fill = $("gaugeFill");
  if (fresh) { fill.style.transition = "none"; fill.style.strokeDashoffset = String(GAUGE); reflow(fill); fill.style.transition = ""; }
  fill.style.strokeDashoffset = String(GAUGE * (1 - top.prob));
  lastGroupProb = top.prob;

  $("confBadge").className = "badge " + conf.level;
  $("confBadge").innerHTML = `${icon(CONF_ICON[conf.level])}${conf.label}`;
  $("groupChips").innerHTML = result.groups.slice(1, 4).filter(g => g.prob >= 0.01)
    .map(g => `<span class="gchip">${icon(GROUP_ICON[g.id])}${esc(g.label)} <b>${percent(g.prob)}</b></span>`).join("");

  const conds = [...state.conditions].map(c => CONDITION_LABEL[c]);
  $("summaryLine").textContent = vehicleLine(state.vehicle) + (conds.length ? " · " + conds.join(", ") : "");

  renderNormal(result.normal);
  if (conf.level === "good") { setNotice($("confNote"), ""); return; }
  const reasons = conf.reasons.map(r => `<li>${esc(r)}</li>`).join("");
  const lead = conf.level === "low"
    ? "Aşağıdaki arıza listesi kesin değil. “Netleştir” sekmesindeki soruları cevaplayın, daha iyi bir kayıt alın ya da ikinci görüş isteyin."
    : "Sonuç yol gösterici ama kesin değil. Soruları cevaplamak tahmini netleştirir.";
  setNotice($("confNote"), `${lead}${reasons ? `<ul>${reasons}</ul>` : ""}`, conf.level === "low" ? "bad" : "warn");
}

/** Rölanti kaydının, gerçek araçların normal rölanti sesleriyle karşılaştırması. */
function renderNormal(normal) {
  if (!normal) { setNotice($("normalNote"), ""); return; }
  if (normal.inside) {
    setNotice($("normalNote"), `<b>Bu kayıt normal rölanti sesine benziyor.</b> ${normal.recordings} gerçek aracın rölanti kaydıyla karşılaştırdık; belirgin bir arıza sesi ölçülmedi. Bu, arıza olmadığını kanıtlamaz: sesi siz duyuyorsanız aşağıdaki soruları cevaplayın ya da kaydı bir ustaya dinletin.`, "ok");
  } else {
    setNotice($("normalNote"), `<b>Kayıt, normal rölanti seslerinden ayrılıyor</b> (${normal.recordings} gerçek araçla karşılaştırıldı):<ul>${normal.deviations.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`, "warn");
  }
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
  $("answeredLine").textContent = answered ? `${answered} soru cevaplandı` : "";
}

/** Arıza kartları. Yeni analizde sırayla belirir; güncellemede kartlar yeni sıralarına kayar (FLIP). */
function renderFaults(result, fresh) {
  const list = $("faultList");
  const before = new Map();
  if (!fresh) {
    for (const card of list.children) {
      before.set(card.dataset.id, { top: card.getBoundingClientRect().top, prob: Number(card.dataset.prob) });
    }
  }

  const shown = result.ranked.slice(0, CONFIG.resultsShown);
  const maxProb = shown[0].prob;
  list.classList.toggle("intro", fresh);
  list.innerHTML = shown.map((r, i) => {
    const f = r.fault, old = before.get(f.id);
    const startWidth = old ? (old.prob / maxProb * 100).toFixed(1) : 0;
    return `
    <div class="fault u${f.urg}" data-id="${f.id}" data-prob="${r.prob}" style="--i:${i}">
      <button class="fault-head" aria-expanded="false">
        <span class="f-ic">${icon(GROUP_ICON[f.group])}</span>
        <span class="f-main">
          <span class="fault-top"><span class="fault-name">${i + 1}. ${esc(f.name)}</span><span class="pct">${percent(old ? old.prob : 0)}</span></span>
          <span class="bar"><i style="width:${startWidth}%" data-w="${(r.prob / maxProb * 100).toFixed(1)}"></i></span>
          <span class="meta"><span>${esc(LOCATIONS[f.loc].label)}</span><span class="urg">${URGENCY[f.urg]}</span>${f.byEar ? "" : `<span class="ear">Sesle ayırt etmek zor</span>`}</span>
        </span>
        <span class="chev">${icon("chevron")}</span>
      </button>
      <div class="fault-body"><div class="fb-inner"><div class="fb-content">
        <p>${esc(f.desc)}</p>
        <p><b>Ne yapmalı:</b> ${esc(f.tip)}</p>
        ${f.byEar ? "" : `<p class="ear-note">Bu arıza, benzer parçalardan yalnızca sesle güvenilir biçimde ayrılamıyor. Yüzde yol göstericidir; “Netleştir” sekmesindeki sorular ve ustanın kontrolü belirleyicidir.</p>`}
        ${r.notes.map(n => `<div class="model-note">${icon("info")}<span>${esc(n)}</span></div>`).join("")}
        <div class="row"><button class="btn small" data-play="${f.id}">${icon("speaker")} Örnek sesi dinle</button></div>
      </div></div></div>
    </div>`;
  }).join("");

  const cards = [...list.children];
  // FLIP: eski konumdan yenisine kaydır
  for (const card of cards) {
    const old = before.get(card.dataset.id);
    if (!old) continue;
    const dy = old.top - card.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) { card.style.transition = "none"; card.style.transform = `translateY(${dy}px)`; }
  }
  reflow(list);
  cards.forEach((card, i) => {
    card.style.transition = "";
    card.style.transform = "";
    const bar = card.querySelector(".bar i");
    const delay = fresh ? 150 + i * 70 : 0;
    setTimeout(() => { bar.style.width = bar.dataset.w + "%"; }, delay);
    const old = before.get(card.dataset.id);
    setTimeout(() => countUp(card.querySelector(".pct"), old ? old.prob * 100 : 0, Number(card.dataset.prob) * 100), delay);
  });

  selectFault(shown.some(r => r.fault.id === selectedId) ? selectedId : shown[0].fault.id);
}

/** Sahnedeki ses çubukları: kaydın gerçek dalga biçiminden. */
function renderStageBars(samples) {
  const n = 30, per = Math.floor(samples.length / n), peaks = [];
  let max = 1e-6;
  for (let c = 0; c < n; c++) {
    let p = 0;
    for (let i = c * per, end = i + per; i < end; i += 8) p = Math.max(p, Math.abs(samples[i]));
    peaks.push(p); max = Math.max(max, p);
  }
  $("stageBars").innerHTML = peaks.map((p, i) => `<i style="--h:${Math.max(0.12, p / max).toFixed(2)};--d:${(i * 0.06).toFixed(2)}s"></i>`).join("");
}

function renderTech(F) {
  const rows = [
    ["Baskın ton", `${Math.round(F.peakHz)} Hz`],
    ["Spektral merkez", `${Math.round(F.centroid)} Hz`],
    ["Tonluluk (ıslık/uğultu)", percent(F.tonal)],
    ["Darbelilik (vuruntu)", percent(F.imp)],
    ["Ritim", F.rate ? `${F.rate.toFixed(1)} /sn · ${percent(F.periodicity)} düzenli` : "belirgin değil"],
    ["Bas / orta / tiz", F.bands.map(percent).join(" / ")],
    ["Süre", `${F.dur.toFixed(1)} sn`]
  ];
  $("tech").innerHTML = rows.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join("");
}

/** Sonuç adımının tamamını çizer. `fresh` yeni bir analizse animasyonlar baştan oynar. */
export function renderResults(result, state, { fresh = false } = {}) {
  if (fresh) { selectedId = null; renderStageBars(state.recording.samples); }
  renderHead(result, state, fresh);
  renderQuestions(result, state);
  renderFaults(result, fresh);
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
    const q = btn?.closest(".question");
    if (!q || q.classList.contains("leaving")) return;
    btn.classList.add("chosen");
    q.classList.add("leaving");
    setTimeout(() => onAnswer(q.dataset.q, btn.dataset.answer), 220);
  });
  $("resetAnswersBtn").addEventListener("click", onResetAnswers);
}
