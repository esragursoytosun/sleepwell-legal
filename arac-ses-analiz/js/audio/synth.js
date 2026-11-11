/**
 * Her arıza için yapay (sentetik) örnek ses üretir.
 * Kullanım: sonuç ekranındaki "örnek sesi dinle" düğmesi, "örnek sesle dene" seçeneği ve otomatik testler.
 * Gerçek kayıt değildir; arızanın tipik ses karakterini (ton, ritim, darbe) taklit eder.
 */

/** Tekrarlanabilir rastgele sayı üreteci (0..1). */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function bandpass(f, q, sr) {
  const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

function lowpass(f, sr) {
  const a = Math.exp(-2 * Math.PI * f / sr);
  let y = 0;
  return x => (y = (1 - a) * x + a * y);
}

/** Rölantideki motorun arka plan uğultusu. */
function engineBed(x, sr, level, rpm = 780, seed = 7) {
  const r = rng(seed), fire = rpm / 60 * 2, lp = lowpass(300, sr);
  const phase = Array.from({ length: 12 }, () => r() * 6.28);
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    let s = 0;
    for (let k = 1; k <= 12; k++) s += Math.sin(2 * Math.PI * fire * k / 2 * t + phase[k - 1]) / k;
    x[i] += level * (0.6 * s + 2.5 * lp(r() * 2 - 1));
  }
}

/** Yoldaki genel uğultu. */
function roadNoise(x, sr, level, seed = 3) {
  const r = rng(seed), lp = lowpass(500, sr);
  for (let i = 0; i < x.length; i++) x[i] += level * 3 * lp(r() * 2 - 1);
}

/** Verilen anlara kısa darbeler ekler; `fn(t)` darbenin dalga biçimidir. */
function impulses(x, sr, times, fn) {
  for (const t0 of times) {
    const i0 = Math.floor(t0 * sr);
    for (let j = 0; j < sr * 0.15 && i0 + j < x.length; j++) x[i0 + j] += fn(j / sr);
  }
}

function periodic(rate, dur, jitter, r, skip = null) {
  const out = [];
  let k = 0;
  for (let t = 0.05; t < dur; t += 1 / rate, k++) {
    if (!skip || !skip(k)) out.push(t + (r() - .5) * jitter / rate);
  }
  return out;
}

function irregular(dur, minGap, extraGap, r) {
  const out = [];
  for (let t = 0.1; t < dur; t += minGap + r() * extraGap) out.push(t);
  return out;
}

function normalize(x) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m ? 0.85 / m : 1;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

function tone(x, sr, f, amp, o = {}) {
  let ph = 0;
  const dur = x.length / sr;
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    const fi = f * (1 + (o.vib || 0) * Math.sin(2 * Math.PI * (o.vibHz || 5) * t)) * (1 + (o.sweep || 0) * t / dur);
    ph += 2 * Math.PI * fi / sr;
    const am = o.am ? 1 - o.am + o.am * (0.5 + 0.5 * Math.sin(2 * Math.PI * o.amHz * t)) : 1;
    x[i] += amp * am * (Math.sin(ph) + (o.h2 || 0) * Math.sin(2 * ph));
  }
}

/** Alt takım vuruntusu: yol gürültüsü üzerine düzensiz, sönümlenen darbeler. */
function knocks(sr, d, { seed, f1, f2, decay, minGap, extraGap }) {
  const x = new Float32Array(sr * d), r = rng(seed);
  roadNoise(x, sr, .06, seed + 1);
  const times = irregular(d, minGap, extraGap, r);
  impulses(x, sr, times, t => Math.exp(-t / decay) *
    (Math.sin(2 * Math.PI * f1 * t) + .6 * Math.sin(2 * Math.PI * f2 * t) + .3 * (r() - .5)));
  return normalize(x);
}

/** Arıza kimliği → (örnekleme hızı, süre) alıp Float32Array döndüren üreteç. */
export const SYNTH = {
  kayis(sr, d) {
    const x = new Float32Array(sr * d);
    engineBed(x, sr, .06);
    tone(x, sr, 2600, .5, { vib: .03, vibHz: 7, h2: .3, am: .3, amHz: 1.3 });
    return normalize(x);
  },
  alternator(sr, d) {
    const x = new Float32Array(sr * d);
    engineBed(x, sr, .06);
    tone(x, sr, 2100, .4, { h2: .2, vib: .003, vibHz: 3 });
    return normalize(x);
  },
  pompa(sr, d) {
    const x = new Float32Array(sr * d);
    engineBed(x, sr, .06);
    tone(x, sr, 680, .5, { h2: .35, vib: .02, vibHz: .7, am: .25, amHz: .5 });
    return normalize(x);
  },
  klima(sr, d) {
    const x = new Float32Array(sr * d), r = rng(37), bp = bandpass(1500, 2, sr);
    engineBed(x, sr, .06);
    tone(x, sr, 950, .25, { am: .4, amHz: 1 });
    impulses(x, sr, periodic(13, d, .1, r), t => .6 * Math.exp(-t / .007) * bp(r() * 2 - 1) * 3);
    return normalize(x);
  },
  biyel(sr, d) {
    const x = new Float32Array(sr * d), r = rng(5);
    engineBed(x, sr, .05);
    impulses(x, sr, periodic(13, d, .03, r), t => Math.exp(-t / .014) *
      (Math.sin(2 * Math.PI * 320 * t) + .5 * Math.sin(2 * Math.PI * 640 * t) + .3 * (r() - .5)));
    return normalize(x);
  },
  supap(sr, d) {
    const x = new Float32Array(sr * d), r = rng(9);
    engineBed(x, sr, .05);
    impulses(x, sr, periodic(6.5, d, .02, r), t => .8 * Math.exp(-t / .0035) *
      (Math.sin(2 * Math.PI * 3600 * t) + .6 * (r() - .5)));
    return normalize(x);
  },
  zincir(sr, d) {
    const x = new Float32Array(sr * d), r = rng(13), bp = bandpass(2200, 1.2, sr);
    engineBed(x, sr, .05);
    impulses(x, sr, periodic(21, d, .25, r), t => (0.5 + r()) * Math.exp(-t / .006) *
      (bp(r() * 2 - 1) * 3 + .5 * Math.sin(2 * Math.PI * 1800 * t)));
    return normalize(x);
  },
  egzoz(sr, d) {
    const x = new Float32Array(sr * d), r = rng(17), bp = bandpass(650, 1, sr);
    engineBed(x, sr, .04);
    impulses(x, sr, periodic(26, d, .05, r), t => Math.exp(-t / .011) * bp(r() * 2 - 1) * 4);
    return normalize(x);
  },
  turbo(sr, d) {
    const x = new Float32Array(sr * d), r = rng(29), bp = bandpass(6000, 1.5, sr);
    engineBed(x, sr, .08, 1800);
    tone(x, sr, 4200, .45, { sweep: .6 });
    for (let i = 0; i < x.length; i++) x[i] += .15 * bp(r() * 2 - 1);
    return normalize(x);
  },
  tekleme(sr, d) {
    const x = new Float32Array(sr * d), r = rng(31), lp = lowpass(400, sr);
    impulses(x, sr, periodic(26, d, .05, r, k => k % 4 === 2 || r() < .12), t => Math.exp(-t / .018) *
      (Math.sin(2 * Math.PI * 85 * t) + .6 * lp(r() - .5)));
    return normalize(x);
  },
  fren_balata(sr, d) {
    const x = new Float32Array(sr * d);
    roadNoise(x, sr, .05);
    tone(x, sr, 6200, .45, { vib: .004, vibHz: 4, am: .5, amHz: .6 });
    return normalize(x);
  },
  fren_disk(sr, d) {
    const x = new Float32Array(sr * d), r = rng(11), bp = bandpass(1300, .7, sr);
    roadNoise(x, sr, .05);
    for (let i = 0; i < x.length; i++) {
      const m = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 6 * i / sr), 3);
      x[i] += 1.4 * (0.25 + m) * bp(r() * 2 - 1);
    }
    return normalize(x);
  },
  rulman(sr, d) {
    const x = new Float32Array(sr * d);
    roadNoise(x, sr, .06);
    tone(x, sr, 190, .5, { h2: .4, am: .7, amHz: 1.6, sweep: .1 });
    return normalize(x);
  },
  aks(sr, d) {
    const x = new Float32Array(sr * d), r = rng(19);
    roadNoise(x, sr, .05);
    impulses(x, sr, periodic(4, d, .04, r), t => Math.exp(-t / .008) *
      (Math.sin(2 * Math.PI * 1900 * t) + .7 * (r() - .5)));
    return normalize(x);
  },
  sanziman(sr, d) {
    const x = new Float32Array(sr * d);
    roadNoise(x, sr, .06);
    tone(x, sr, 720, .45, { h2: .25, sweep: .25, vib: .002, vibHz: 9 });
    return normalize(x);
  },
  rotil: (sr, d) => knocks(sr, d, { seed: 23, f1: 150, f2: 380, decay: .035, minGap: .2, extraGap: .9 }),
  rot_basi: (sr, d) => knocks(sr, d, { seed: 41, f1: 420, f2: 900, decay: .016, minGap: .2, extraGap: .8 }),
  z_rot: (sr, d) => knocks(sr, d, { seed: 43, f1: 900, f2: 1900, decay: .009, minGap: .08, extraGap: .35 }),
  viraj_lastik: (sr, d) => knocks(sr, d, { seed: 47, f1: 180, f2: 420, decay: .03, minGap: .3, extraGap: .9 }),
  amortisor_kafa: (sr, d) => knocks(sr, d, { seed: 53, f1: 100, f2: 240, decay: .05, minGap: .35, extraGap: 1.0 }),
  salincak: (sr, d) => knocks(sr, d, { seed: 59, f1: 90, f2: 200, decay: .06, minGap: .8, extraGap: 1.2 })
};
