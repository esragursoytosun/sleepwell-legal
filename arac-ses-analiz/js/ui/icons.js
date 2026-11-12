/** Çizgi ikonları (24x24, currentColor). */
const P = {
  wave: '<path d="M3 12h1.5M7 8v8M11 4.5v15M15 8v8M19 10.5v3M21.5 12H21"/>',
  car: '<path d="M3.5 13.5 5.4 8.3A2 2 0 0 1 7.3 7h9.4a2 2 0 0 1 1.9 1.3l1.9 5.2"/><rect x="2.5" y="13" width="19" height="5" rx="1.6"/><path d="M5.5 18v2M18.5 18v2"/><circle cx="7" cy="15.5" r=".6"/><circle cx="17" cy="15.5" r=".6"/>',
  mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 15 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  chat: '<path d="M4 20.5 5.4 16.6A8.5 8.5 0 1 1 8.6 19.4z"/><path d="M8.8 9.2c.3 2.9 2.6 5.3 5.6 5.7l1.1-1.3-1.8-1-1 .8a4.4 4.4 0 0 1-2.4-2.4l.8-1-1-1.8z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  refresh: '<path d="M20 11.5A8 8 0 1 0 17.7 17"/><path d="M20.5 5v6.5H14"/>',
  speaker: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
  alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
  shield: '<path d="M12 3 19.5 6v5.6c0 4.6-3.2 7.9-7.5 9.4-4.3-1.5-7.5-4.8-7.5-9.4V6z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/>',
  pin: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  receipt: '<path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.4z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 8.5c-.6-.6-1.5-1-2.5-1-1.7 0-3 1-3 2.2 0 3 6 1.6 6 4.6 0 1.2-1.3 2.2-3 2.2-1.1 0-2-.4-2.6-1M12 6v1.5M12 16.5V18"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  // gruplar
  engine: '<path d="M3 10v5M3 12.5h2.5M5.5 9h2.5V7h7v2h2l2 3h1.5v4H19l-2 2.5H8.5L6.5 16H5.5z"/><path d="M10 7V5h3v2"/>',
  belt: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="16" r="3"/><path d="m4.9 10.2 10 8M9.1 5.8l10 8"/>',
  brake: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.8"/><path d="M12 5.5v.1M18.5 12h-.1M12 18.5v-.1M5.5 12h.1"/><path d="M16.8 4.6a8.6 8.6 0 0 1 2.6 3.1"/>',
  spring: '<path d="M12 2.5v2.5M12 19v2.5"/><path d="m7 5.5 10 2.2-10 2.2 10 2.2-10 2.2 10 2.2-10 2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  // sürüş durumları
  gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16-3.5-4.5"/><circle cx="12" cy="16" r="1"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  bolt: '<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z"/>',
  road: '<path d="M8.5 3 4 21M15.5 3 20 21M12 4.5v2.5M12 10.5v3M12 17v2.5"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M3.3 10.5h6.5M14.2 10.5h6.5M12 14.2V21"/>',
  bump: '<path d="M2 18h4.5c2.3 0 3-7 5.5-7s3.2 7 5.5 7H22"/>',
  shift: '<circle cx="6" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="18" cy="5" r="1.6"/><circle cx="6" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><path d="M6 6.6v10.8M12 6.6v10.8M18 6.6V12H6"/>',
  fan: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2c-.3-3.6.6-6.7 3-6.7 2.2 0 2.2 3.5-1.6 6.5M13.8 12c3.6-.3 6.7.6 6.7 3 0 2.2-3.5 2.2-6.5-1.6M12 13.8c.3 3.6-.6 6.7-3 6.7-2.2 0-2.2-3.5 1.6-6.5M10.2 12c-3.6.3-6.7-.6-6.7-3 0-2.2 3.5-2.2 6.5 1.6"/>'
};

/** İkon SVG metni döndürür. */
export function icon(name, cls = "") {
  return `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
}

/** HTML'deki `data-icon="ad"` öğelerini ikonla doldurur. */
export function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll("[data-icon]")) el.innerHTML = icon(el.dataset.icon);
}

export const GROUP_ICON = { motor: "engine", yardimci: "belt", fren: "brake", alt_takim: "spring", aktarma: "gear" };
export const CONDITION_ICON = {
  rolanti: "gauge", soguk: "snow", hizlanma: "bolt", hiz: "road", fren: "brake",
  direksiyon: "wheel", tumsek: "bump", vites: "shift", klima: "fan"
};
