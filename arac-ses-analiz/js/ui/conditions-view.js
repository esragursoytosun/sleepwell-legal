import { $ } from "./dom.js";
import { CONDITIONS } from "../data/conditions.js";
import { state } from "../state.js";

/** Belirti (sürüş durumu) seçim düğmelerini oluşturur. */
export function initConditions() {
  const box = $("conditions");
  box.innerHTML = CONDITIONS
    .map(([id, label]) => `<button type="button" class="chip" aria-pressed="false" data-id="${id}">${label}</button>`)
    .join("");
  box.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const on = chip.getAttribute("aria-pressed") !== "true";
    chip.setAttribute("aria-pressed", String(on));
    if (on) state.conditions.add(chip.dataset.id); else state.conditions.delete(chip.dataset.id);
  });
}
