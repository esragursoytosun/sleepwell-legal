import { $ } from "./dom.js";

const STEP_COUNT = 4;
let current = 0;

/** Verilen adımı gösterir, adım göstergesini günceller ve başlığa odaklanır. */
export function showStep(n, { focus = true } = {}) {
  current = Math.max(0, Math.min(STEP_COUNT - 1, n));
  for (let i = 0; i < STEP_COUNT; i++) $("step-" + i).hidden = i !== current;
  for (const li of $("stepper").children) {
    const i = Number(li.dataset.step);
    li.classList.toggle("current", i === current);
    li.classList.toggle("done", i < current);
    if (i === current) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  }
  if (focus) {
    $("h-" + current).focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export const currentStep = () => current;

/** "Devam" ve "Geri" düğmelerini bağlar. */
export function initWizard() {
  document.addEventListener("click", e => {
    if (e.target.closest("[data-next]")) showStep(current + 1);
    else if (e.target.closest("[data-back]")) showStep(current - 1);
  });
  showStep(0, { focus: false });
}
