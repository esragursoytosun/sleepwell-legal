import { LOCATIONS } from "../data/faults.js";

/** Aracın üstten görünümü; arızanın olası yeri işaretlenir. */
export function renderCarDiagram(container) {
  const markers = Object.entries(LOCATIONS).map(([key, loc]) => loc.pts.map(([x, y]) =>
    `<circle class="mk-ring" data-loc="${key}" cx="${x}" cy="${y}" r="9"/><circle class="mk" data-loc="${key}" cx="${x}" cy="${y}" r="6"/>`
  ).join("")).join("");

  container.innerHTML = `
    <svg viewBox="0 0 200 400" role="img" aria-label="Aracın üstten görünümü; arızanın olası yeri işaretli">
      <text x="100" y="12" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">ÖN</text>
      <rect x="22" y="62" width="22" height="58" rx="6" fill="var(--car-line)"/>
      <rect x="156" y="62" width="22" height="58" rx="6" fill="var(--car-line)"/>
      <rect x="22" y="276" width="22" height="58" rx="6" fill="var(--car-line)"/>
      <rect x="156" y="276" width="22" height="58" rx="6" fill="var(--car-line)"/>
      <rect x="38" y="20" width="124" height="364" rx="46" fill="var(--car)" stroke="var(--car-line)" stroke-width="2"/>
      <rect x="58" y="32" width="84" height="104" rx="10" fill="none" stroke="var(--car-line)" stroke-dasharray="4 3"/>
      <text x="100" y="128" text-anchor="middle" font-size="9" fill="var(--muted)">motor bölmesi</text>
      <path d="M54 150 Q100 136 146 150 L140 178 Q100 168 60 178 Z" fill="var(--car-line)" opacity=".5"/>
      <rect x="60" y="186" width="80" height="120" rx="12" fill="none" stroke="var(--car-line)" opacity=".6"/>
      <path d="M60 330 Q100 340 140 330 L144 350 Q100 362 56 350 Z" fill="var(--car-line)" opacity=".5"/>
      <path class="exhaust" d="M112 112 L118 140 L118 300 L124 386" fill="none" stroke="var(--car-line)" stroke-width="2" stroke-dasharray="5 4"/>
      ${markers}
    </svg>`;
}

/** Verilen konumu çizimde vurgular ve konum adını döndürür. */
export function highlightLocation(container, key) {
  for (const c of container.querySelectorAll("[data-loc]")) c.classList.toggle("on", c.dataset.loc === key);
  container.querySelector(".exhaust").classList.toggle("on", !!LOCATIONS[key].exhaust);
  return LOCATIONS[key].label;
}
