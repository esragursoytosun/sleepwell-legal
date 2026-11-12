import { $ } from "./dom.js";

/** Sonuç ekranındaki sekmeler: aynı anda tek bölüm görünür, böylece sayfa kısa kalır. */
export function showTab(id, { scroll = false } = {}) {
  for (const tab of $("tabs").querySelectorAll(".tab")) {
    const on = tab.dataset.tab === id;
    tab.classList.toggle("on", on);
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    const panel = $("panel-" + tab.dataset.tab);
    panel.hidden = !on;
    if (on) { panel.classList.remove("enter"); void panel.offsetWidth; panel.classList.add("enter"); }
  }
  if (scroll) $("tabs").scrollIntoView({ behavior: "smooth", block: "start" });
  document.dispatchEvent(new CustomEvent("tabchange", { detail: id }));
}

export function initTabs() {
  const bar = $("tabs");
  bar.addEventListener("click", e => {
    const tab = e.target.closest(".tab");
    if (tab) showTab(tab.dataset.tab);
  });
  bar.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const tabs = [...bar.querySelectorAll(".tab")];
    const i = tabs.findIndex(t => t.classList.contains("on"));
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    showTab(next.dataset.tab);
    next.focus();
  });
  showTab("ozet");
}
