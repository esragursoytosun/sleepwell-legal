/** Animasyon yardımcıları. Kullanıcı "hareketi azalt" tercih ettiyse animasyonlar kısalır. */
export const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const wait = ms => new Promise(r => setTimeout(r, reduceMotion() ? Math.min(ms, 40) : ms));

const easeOut = t => 1 - Math.pow(1 - t, 3);

/** Bir sayıyı `from`'dan `to`'ya sayarak yazar. */
export function countUp(el, from, to, { duration = 900, format = v => "%" + Math.round(v) } = {}) {
  if (el._raf) cancelAnimationFrame(el._raf);
  if (reduceMotion() || from === to) { el.textContent = format(to); return; }
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = format(from + (to - from) * easeOut(t));
    if (t < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

/** Elemanın stilinin hesaplanmasını zorlar; ardından yapılan değişiklik geçiş animasyonuyla uygulanır. */
export const reflow = el => void el.offsetWidth;
