import { $, esc, setNotice } from "./dom.js";
import { icon } from "./icons.js";
import { actionPlan, isStale } from "../engine/advice.js";
import { GROUPS } from "../data/faults.js";

const tl = n => Math.round(n).toLocaleString("tr-TR") + " TL";
let lastPlan = null;

function renderPrices(plan, vehicle) {
  if (!plan.hasPrices) {
    $("planPrices").innerHTML = `<p class="hint">Bu araç ve iş için doğrulanmış fiyat bilgisi henüz toplanıyor. Uydurma rakam göstermiyoruz. En az iki ustadan, parça ve işçiliği ayrı yazılmış teklif alın ve aşağıdaki <b>teklif kontrolüne</b> girin.</p>`;
    return;
  }
  const rows = plan.parts.filter(p => p.price).map(p => {
    const pr = p.price;
    const labor = pr.laborMin != null ? `${tl(pr.laborMin)} – ${tl(pr.laborMax)}` : "—";
    return `<tr><td>${esc(p.label)}${pr.kind && pr.kind !== "*" ? ` <span class="hint">(${esc(pr.kind)})</span>` : ""}</td><td>${tl(pr.partMin)} – ${tl(pr.partMax)}</td><td>${labor}</td></tr>`;
  }).join("");
  const stale = plan.parts.some(p => p.price && isStale(p.price));
  $("planPrices").innerHTML = `
    <table class="price-table"><thead><tr><th>Kalem</th><th>Parça</th><th>İşçilik</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="hint">${vehicle.brand ? esc(`${vehicle.brand} ${vehicle.model}`) + " için" : "Genel"} aralıklar; kaynak: anlaşmalı usta ve kullanıcı faturaları.${stale ? " Bazı fiyatlar 6 aydan eski; güncel fiyat daha yüksek olabilir." : ""}</p>`;
}

function renderMechanics(plan, vehicle) {
  const box = $("planMechanics");
  if (plan.mechanics.length) {
    box.innerHTML = plan.mechanics.slice(0, 3).map(m => {
      const kept = m.stats.jobs ? Math.round(m.stats.keptQuote / m.stats.jobs * 100) : null;
      return `
      <div class="mech">
        <span class="mech-ic">${icon("user")}</span>
        <div class="mech-main">
          <b>${esc(m.name)}</b>
          <span class="hint">${esc(m.district || m.city)} · ${m.groups.map(g => esc(GROUPS[g])).join(", ")}</span>
          ${kept != null ? `<span class="hint">${m.stats.jobs} iş · teklifine sadık kaldığı iş: %${kept}</span>` : ""}
        </div>
        <button class="btn small" data-mech="${esc(m.id)}">${icon("chat")} Gönder</button>
      </div>`;
    }).join("");
    return;
  }
  const lead = vehicle.city
    ? `${esc(vehicle.city)} için bu iş alanında henüz doğrulanmış ustamız yok.`
    : "Şehrinizi seçerseniz bölgenizdeki doğrulanmış ustaları gösteririz.";
  box.innerHTML = `<p class="hint">${lead} Bu arada sonucu ve kaydı güvendiğiniz bir ustaya gönderip ikinci görüş alabilirsiniz.</p>
    <button class="btn small" data-second-opinion>${icon("chat")} İkinci görüş al</button>`;
}

/** "Ne yapmalısınız?" kartını en olası arızaya göre çizer. */
export function renderPlan(result, state) {
  const plan = actionPlan(result.ranked[0], { vehicle: state.vehicle, confidence: result.confidence });
  lastPlan = plan;
  $("planFor").textContent = `En olası arızaya göre: ${plan.fault.name}`;
  $("planUrgency").className = "urgency u" + plan.urgency.level;
  $("planUrgency").innerHTML = `${icon(plan.urgency.level >= 3 ? "alert" : "clock")}<div><b>${esc(plan.urgency.title)}</b><span>${esc(plan.urgency.text)}</span></div>`;

  if (plan.warranty) setNotice($("planWarranty"), `<b>Garanti:</b> ${esc(plan.warranty.text)}`, plan.warranty.level === "likely" ? "ok" : "");
  else setNotice($("planWarranty"), "");
  setNotice($("planUncertain"), plan.uncertain
    ? "Tahmin henüz net değil; bu adımlar en olası arızaya göre. Soruları cevaplayın ya da parçayı değiştirtmeden önce ikinci görüş alın."
    : "", "warn");

  $("planChecksSec").hidden = !plan.checks.length;
  $("planChecks").innerHTML = plan.checks.map(c => `<li>${esc(c)}</li>`).join("");
  $("planAsk").innerHTML = plan.ask.map(a => `<li>${esc(a)}</li>`).join("");
  $("planFlags").innerHTML = plan.flags.map(f => `<li>${esc(f)}</li>`).join("");
  renderPrices(plan, state.vehicle);
  renderMechanics(plan, state.vehicle);
  return plan;
}

/** Ustaya söylenecekler listesinin düz metni. */
export function askText() {
  if (!lastPlan) return "";
  return ["Ustaya söyleyeceklerim:", ...lastPlan.ask.map((a, i) => `${i + 1}. ${a}`)].join("\n");
}

export const currentPlan = () => lastPlan;
