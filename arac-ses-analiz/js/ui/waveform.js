import { accentGradient, cssVar, fitCanvas } from "./dom.js";

const BAR = 3, GAP = 2;

function roundBar(g, x, y, w, h) {
  const r = Math.min(w / 2, h / 2);
  g.beginPath();
  g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h);
  g.fill();
}

/** Kaydın dalga biçimini (simetrik çubuklar) çizer. `progress` 0..1 verilirse o noktaya kadar vurgulu çizilir. */
export function drawWaveform(canvas, samples) {
  const { g, w, h } = fitCanvas(canvas);
  g.clearRect(0, 0, w, h);
  const cols = Math.max(1, Math.floor(w / (BAR + GAP)));
  const per = Math.max(1, Math.floor(samples.length / cols));
  const peaks = [];
  let max = 1e-6;
  for (let c = 0; c < cols; c++) {
    let p = 0;
    for (let i = c * per, end = Math.min(samples.length, i + per); i < end; i += 4) p = Math.max(p, Math.abs(samples[i]));
    peaks.push(p);
    max = Math.max(max, p);
  }
  g.fillStyle = accentGradient(g, w);
  const mid = h / 2;
  peaks.forEach((p, c) => {
    const bh = Math.max(2, (p / max) * (h - 28));
    roundBar(g, c * (BAR + GAP), mid - bh / 2 + 6, BAR, bh);
  });
}

/** Kayıt yokken gösterilen sakin taban çizgisi. */
export function drawIdle(canvas) {
  const { g, w, h } = fitCanvas(canvas);
  g.clearRect(0, 0, w, h);
  g.fillStyle = cssVar("--border");
  const cols = Math.floor(w / (BAR + GAP));
  for (let c = 0; c < cols; c++) {
    const bh = 2 + 4 * Math.abs(Math.sin(c * 0.35)) * Math.abs(Math.cos(c * 0.11));
    roundBar(g, c * (BAR + GAP), h / 2 - bh / 2 + 6, BAR, bh);
  }
}

/**
 * Mikrofondan canlı spektrum çizer (logaritmik, simetrik). Durdurmak için dönen fonksiyonu çağırın.
 * `onLevel(0..1)` her karede ses düzeyini bildirir.
 */
export function liveSpectrum(canvas, analyser, onLevel) {
  const freq = new Uint8Array(analyser.frequencyBinCount);
  const time = new Uint8Array(analyser.fftSize);
  const binHz = analyser.context.sampleRate / analyser.fftSize;
  let smooth = [], raf = 0;
  const loop = () => {
    const { g, w, h } = fitCanvas(canvas);
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(time);
    let s = 0;
    for (const v of time) s += ((v - 128) / 128) ** 2;
    onLevel?.(Math.min(1, Math.sqrt(s / time.length) * 4));

    const cols = Math.floor(w / (BAR + GAP));
    if (smooth.length !== cols) smooth = new Array(cols).fill(0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = accentGradient(g, w);
    const mid = h / 2 + 6;
    for (let c = 0; c < cols; c++) {
      const hz = 40 * Math.pow(300, c / cols);               // 40 Hz – 12 kHz
      const v = freq[Math.min(freq.length - 1, Math.round(hz / binHz))] / 255;
      smooth[c] += (v - smooth[c]) * 0.35;
      const bh = Math.max(2, smooth[c] * (h - 28));
      roundBar(g, c * (BAR + GAP), mid - bh / 2, BAR, bh);
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => cancelAnimationFrame(raf);
}
