import { $, accentGradient, cssVar, esc, fitCanvas } from "./dom.js";
import { icon } from "./icons.js";
import { explainTop } from "../engine/explain.js";
import { MIN_LOCATE_RANGE_DB } from "../audio/locate.js";
import { GUIDED_TESTS } from "../engine/compare.js";

/** Videonun verilen saniyesindeki kareyi resim olarak alır (alınamazsa null). */
export function grabFrame(url, t, width = 480) {
  return new Promise(resolve => {
    const v = document.createElement("video");
    let done = false;
    const finish = val => { if (!done) { done = true; v.removeAttribute("src"); v.load(); resolve(val); } };
    const timer = setTimeout(() => finish(null), 5000);
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.addEventListener("error", () => { clearTimeout(timer); finish(null); });
    v.addEventListener("loadeddata", () => { v.currentTime = Math.min(t, Math.max(0, (v.duration || t) - 0.05)); });
    v.addEventListener("seeked", () => {
      clearTimeout(timer);
      try {
        const c = document.createElement("canvas");
        c.width = width; c.height = Math.round(width * (v.videoHeight / v.videoWidth || 1.78));
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        finish(c.toDataURL("image/jpeg", 0.82));
      } catch { finish(null); }
    });
    v.src = url;
  });
}

function drawChart(canvas, loc) {
  const { g, w, h } = fitCanvas(canvas);
  g.clearRect(0, 0, w, h);
  const pts = loc.points, t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const lo = loc.low.db, hi = loc.peak.db, pad = 6;
  const X = t => pad + (t - t0) / (t1 - t0 || 1) * (w - 2 * pad);
  const Y = db => h - pad - (db - lo) / (hi - lo || 1) * (h - 2 * pad);
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(X(p.t), Y(p.db)) : g.moveTo(X(p.t), Y(p.db))));
  g.lineWidth = 2.5; g.strokeStyle = accentGradient(g, w); g.lineJoin = "round"; g.stroke();
  g.lineTo(X(t1), h); g.lineTo(X(t0), h); g.closePath();
  g.globalAlpha = 0.14; g.fillStyle = cssVar("--accent"); g.fill(); g.globalAlpha = 1;
  g.beginPath(); g.arc(X(loc.peak.t), Y(loc.peak.db), 5, 0, Math.PI * 2);
  g.fillStyle = cssVar("--accent"); g.fill();
  g.lineWidth = 2; g.strokeStyle = cssVar("--surface"); g.stroke();
}

let renderToken = 0;

/** "Neden bu sonuç?" kartı: gerekçeler ve (videoysa) sesin en güçlü olduğu an. */
export async function renderEvidence(result, state) {
  const measured = {};
  for (const t of GUIDED_TESTS) if (state.measured[t.id]?.answer !== "unknown" && state.measured[t.id]) measured[t.question] = state.measured[t.id].text;
  const reasons = explainTop(result.ranked[0], { features: state.features, conditions: [...state.conditions], answers: state.answers, measured, codes: state.codes });
  if (result.learned?.faults.includes(result.ranked[0].fault.id)) reasons.push(result.learned.text);
  $("reasons").innerHTML = reasons.map(r => `<li>${icon("check")}<span>${esc(r)}</span></li>`).join("");

  const loc = state.locate, rec = state.recording;
  const token = ++renderToken;
  $("locate").hidden = true;
  $("locHint").hidden = true;
  if (!rec.isVideo) {
    $("locHint").hidden = false;
    $("locHint").textContent = "İpucu: Telefonu motorun ya da tekerleğin çevresinde yavaşça gezdirerek video çekerseniz, sesin en güçlü olduğu yeri görüntüyle gösteririz.";
    return;
  }
  if (!loc || loc.range < MIN_LOCATE_RANGE_DB) {
    $("locHint").hidden = false;
    $("locHint").textContent = "Ses video boyunca benzer güçte duyuluyor; telefonun konumundan sesin yeri çıkarılamadı. Telefonu kaynağa daha çok yaklaştırıp uzaklaştırarak yeniden çekebilirsiniz.";
    return;
  }
  if (state.locateFrame?.url !== rec.url) {
    state.locateFrame = { url: rec.url, src: await grabFrame(rec.url, loc.peak.t) };
    if (token !== renderToken) return;
  }
  $("locate").hidden = false;
  const frame = state.locateFrame.src;
  $("locFrame").hidden = !frame;
  if (frame) $("locFrame").src = frame;
  $("locTag").textContent = `${Math.round(loc.peak.t)}. sn`;
  $("locText").innerHTML = `Ses, videonun <b>${Math.round(loc.peak.t)}. saniyesinde</b>, telefon görüntüdeki bölgedeyken en güçlü; en zayıf olduğu ana göre <b>${Math.round(loc.range)} dB</b> daha yüksek. Sesin kaynağı büyük ihtimalle bu karedeki parçaya yakın.`;
  drawChart($("locChart"), loc);
}
