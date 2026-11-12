import { LOCATIONS } from "../data/faults.js";
import { icon } from "./icons.js";
import { createCar3D } from "./car3d.js";

let car3d = null;

/**
 * Araç görünümünü hazırlar: mümkünse üç boyutlu sahne, WebGL yoksa üstten iki boyutlu çizim.
 * @param {HTMLElement} container iki boyutlu çizimin yazılacağı öğe; üç boyutlu sahne onun üst öğesine (sahneye) çizilir
 */
export function renderCarDiagram(container) {
  const stage = container.parentElement;
  car3d = createCar3D(stage, { mode: "result" });
  if (car3d) { container.hidden = true; return; }
  stage.classList.add("flat");
  renderFlat(container);
}

/** Yeni bir analizde sahnede tarama animasyonu oynatır. */
export function scanCar() { car3d?.scan(); }

/** Aracın üstten görünümü; arızanın olası yeri işaretlenir. */
function renderFlat(container) {
  const markers = Object.entries(LOCATIONS).map(([key, loc]) => loc.pts.map(([x, y]) =>
    `<circle class="mk-ring" data-loc="${key}" cx="${x}" cy="${y}" r="8"/><circle class="mk" data-loc="${key}" cx="${x}" cy="${y}" r="5.5"/>`
  ).join("")).join("");

  container.innerHTML = `
    <svg viewBox="0 0 200 400" role="img" aria-label="Aracın üstten görünümü; arızanın olası yeri işaretli">
      <defs>
        <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style="stop-color:var(--car-2)"/><stop offset=".5" style="stop-color:var(--car)"/><stop offset="1" style="stop-color:var(--car-2)"/>
        </linearGradient>
        <linearGradient id="carGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color:var(--car-line);stop-opacity:.75"/><stop offset="1" style="stop-color:var(--car-line);stop-opacity:.35"/>
        </linearGradient>
      </defs>
      <text x="100" y="11" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="2" fill="var(--faint)">ÖN</text>
      <g fill="var(--wheel)" stroke="var(--car-line)" stroke-width="1">
        <rect x="22" y="62" width="22" height="58" rx="7"/><rect x="156" y="62" width="22" height="58" rx="7"/>
        <rect x="22" y="276" width="22" height="58" rx="7"/><rect x="156" y="276" width="22" height="58" rx="7"/>
      </g>
      <rect x="38" y="20" width="124" height="364" rx="48" fill="url(#carBody)" stroke="var(--car-line)" stroke-width="1.5"/>
      <rect x="58" y="32" width="84" height="104" rx="12" fill="none" stroke="var(--car-line)" stroke-dasharray="3 4" opacity=".8"/>
      <text x="100" y="127" text-anchor="middle" font-size="8.5" font-weight="600" fill="var(--faint)">motor bölmesi</text>
      <path d="M54 150 Q100 134 146 150 L139 180 Q100 169 61 180 Z" fill="url(#carGlass)"/>
      <rect x="62" y="188" width="76" height="116" rx="14" fill="none" stroke="var(--car-line)" opacity=".5"/>
      <path d="M61 330 Q100 341 139 330 L144 352 Q100 364 56 352 Z" fill="url(#carGlass)"/>
      <path class="exhaust" d="M112 112 L118 140 L118 300 L124 386" fill="none" stroke="var(--car-line)" stroke-width="2" stroke-dasharray="4 4"/>
      ${markers}
    </svg>`;
}

/** Verilen konumu çizimde vurgular ve konum etiketini yazar. */
export function highlightLocation(container, labelEl, key) {
  if (car3d) car3d.focus(key);
  else {
    for (const c of container.querySelectorAll("[data-loc]")) c.classList.toggle("on", c.dataset.loc === key);
    container.querySelector(".exhaust").classList.toggle("on", !!LOCATIONS[key].exhaust);
  }
  labelEl.innerHTML = `${icon("pin")}<span>${LOCATIONS[key].label}</span>`;
  labelEl.style.animation = "none";
  void labelEl.offsetWidth;
  labelEl.style.animation = "";
}
