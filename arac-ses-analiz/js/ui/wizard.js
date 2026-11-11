import { $ } from "./dom.js";

const STEP_COUNT = 4;
let current = 0;

/** Verilen adımı yön animasyonuyla gösterir, ilerleme çubuğunu günceller ve başlığa odaklanır. */
export function showStep(n, { focus = true } = {}) {
  const next = Math.max(0, Math.min(STEP_COUNT - 1, n));
  const dir = next >= current ? "enter-fwd" : "enter-back";
  current = next;
  for (let i = 0; i < STEP_COUNT; i++) {
    const el = $("step-" + i);
    el.hidden = i !== current;
    el.classList.remove("enter-fwd", "enter-back");
    if (i === current) { void el.offsetWidth; el.classList.add(dir); }
  }
  for (const li of $("stepper").children) {
    const i = Number(li.dataset.step);
    li.classList.toggle("current", i === current);
    li.classList.toggle("done", i < current);
    if (i === current) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  }
  $("trackFill").style.setProperty("--p", current / (STEP_COUNT - 1));
  document.dispatchEvent(new CustomEvent("stepchange", { detail: current }));
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
