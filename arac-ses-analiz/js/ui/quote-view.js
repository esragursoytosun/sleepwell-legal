import { $, esc, setNotice } from "./dom.js";
import { icon } from "./icons.js";
import { PARTS } from "../data/parts.js";
import { GUIDANCE } from "../data/guidance.js";
import { checkQuote } from "../engine/quote.js";

const selected = new Set();
const VERDICT = {
  ok: ["ok", "Teklif teşhisle uyumlu görünüyor."],
  ask: ["warn", "Bazı kalemleri ustaya sorun."],
  second_opinion: ["bad", "Parçaları değiştirtmeden önce ikinci görüş alın."]
};
const STATUS = { related: "Bu sesle ilgili", routine: "Bakım kalemi", unrelated: "Sesle ilişkisi görünmüyor" };

const chip = id => `<button type="button" class="pchip" aria-pressed="${selected.has(id)}" data-part="${id}">${esc(PARTS[id].label)}</button>`;

/** Kalem seçimini teşhise göre (ilgili olanlar önde) yeniden çizer. */
export function renderQuote(result) {
  const related = [...new Set(result.ranked.slice(0, 3).flatMap(r => GUIDANCE[r.fault.id].parts))];
  $("quoteRelated").innerHTML = related.map(chip).join("");
  $("quoteOther").innerHTML = Object.keys(PARTS).filter(id => !related.includes(id)).map(chip).join("");
  $("quoteCheckBtn").disabled = !selected.size;
}

export function resetQuote() {
  selected.clear();
  $("quoteTotal").value = "";
  $("quoteResult").innerHTML = "";
}

/** @param {() => {result: object, vehicle: object}} getContext */
export function initQuoteView(getContext) {
  for (const box of [$("quoteRelated"), $("quoteOther")]) {
    box.addEventListener("click", e => {
      const b = e.target.closest(".pchip");
      if (!b) return;
      const on = !selected.has(b.dataset.part);
      if (on) selected.add(b.dataset.part); else selected.delete(b.dataset.part);
      b.setAttribute("aria-pressed", String(on));
      $("quoteCheckBtn").disabled = !selected.size;
    });
  }
  $("quoteCheckBtn").addEventListener("click", () => {
    const { result, vehicle } = getContext();
    const total = parseInt($("quoteTotal").value, 10) || 0;
    const r = checkQuote([...selected], total, result.ranked, vehicle);
    const [kind, title] = VERDICT[r.verdict];
    const items = r.items.map(i => `<li class="qi ${i.status}">${icon(i.status === "unrelated" ? "alert" : "check")}<span>${esc(i.label)}</span><em>${STATUS[i.status]}</em></li>`).join("");
    const price = r.price
      ? `<p class="hint">Bilinen fiyat aralığı: ${r.price.min.toLocaleString("tr-TR")} – ${r.price.max.toLocaleString("tr-TR")} TL${r.price.complete ? "" : " (bazı kalemler için veri yok)"}.</p>`
      : `<p class="hint">Bu kalemler için doğrulanmış fiyat verisi henüz yok; tutarı yorumlamıyoruz. Bir başka ustadan da yazılı teklif almak en güvenli karşılaştırmadır.</p>`;
    $("quoteResult").innerHTML = `<div class="notice ${kind}" id="quoteVerdict"></div><ul class="quote-items">${items}</ul><div id="quoteFlags"></div>${price}`;
    setNotice($("quoteVerdict"), `<b>${title}</b>`, kind);
    $("quoteFlags").innerHTML = r.flags.map(f => `<div class="notice ${f.level === "bad" ? "bad" : f.level === "warn" ? "warn" : ""}">${icon(f.level === "info" ? "info" : "alert")}<div>${esc(f.text)}</div></div>`).join("");
  });
}
