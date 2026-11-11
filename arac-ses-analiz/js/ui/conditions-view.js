import { $ } from "./dom.js";
import { CONDITIONS } from "../data/conditions.js";
import { CONDITION_ICON, icon } from "./icons.js";
import { state } from "../state.js";

/** Belirti (sürüş durumu) seçim kartlarını oluşturur. */
export function initConditions() {
  const box = $("conditions");
  box.innerHTML = CONDITIONS.map(([id, label]) => `
    <button type="button" class="chip" aria-pressed="false" data-id="${id}">
      <span class="c-ic">${icon(CONDITION_ICON[id])}</span>
      <span>${label}</span>
      <span class="c-check">${icon("check")}</span>
    </button>`).join("");
  box.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const on = chip.getAttribute("aria-pressed") !== "true";
    chip.setAttribute("aria-pressed", String(on));
    if (on) state.conditions.add(chip.dataset.id); else state.conditions.delete(chip.dataset.id);
  });
}
