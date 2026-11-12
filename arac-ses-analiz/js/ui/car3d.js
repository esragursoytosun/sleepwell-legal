/**
 * Üç boyutlu "röntgen" araç: saydam gövde, içinde motor, kayış, egzoz, frenler ve ön takım parçaları.
 * Arızanın olası yeri ışıklı noktayla ve ilgili parçanın renklenmesiyle gösterilir; araç sürüklenerek döndürülür.
 * WebGL kullanılamıyorsa `createCar3D` null döner ve çağıran taraf iki boyutlu çizime düşer.
 */
import * as THREE from "../../vendor/three.module.min.js";
import { reduceMotion } from "./animate.js";

// Sahne renkleri (sahne her iki temada da koyudur; değerler css/app.css içindeki --stage-* ile aynıdır)
const LINE = 0x4fe3d4, SIGNAL = 0xffb52e, TIRE = 0x061016;

// Ölçüler (metre): x ileri (+ön), y yukarı, z yana
const AXLE = 1.32, WHEEL_R = 0.34, TRACK = 0.74, HALF_W = 0.8;

/**
 * Konum anahtarı (data/faults.js LOCATIONS) → ışıklı noktalar ve renklenecek parçalar.
 * @type {Record<string, {pts: number[][], parts: string[]}>}
 */
const LOC3D = {
  motor_on: { pts: [[1.42, 0.72, 0.58]], parts: ["belt"] },
  alternator: { pts: [[1.64, 0.9, 0.58]], parts: ["alternator"] },
  pompa: { pts: [[1.2, 0.88, 0.58]], parts: ["pump"] },
  klima: { pts: [[1.62, 0.5, 0.58]], parts: ["ac"] },
  motor_ust: { pts: [[1.42, 1.06, 0.05]], parts: ["valveCover"] },
  motor_alt: { pts: [[1.42, 0.5, 0.05]], parts: ["engine"] },
  motor_yan: { pts: [[1.42, 0.74, -0.5]], parts: ["chainCover"] },
  motor: { pts: [[1.42, 1.0, 0.05]], parts: ["engine", "valveCover"] },
  turbo: { pts: [[1.8, 0.74, -0.2]], parts: ["turbo"] },
  egzoz: { pts: [[0.55, 0.3, 0.2], [-1.5, 0.36, 0.3]], parts: ["exhaust"] },
  on_teker: { pts: [[AXLE, WHEEL_R, 0.86], [AXLE, WHEEL_R, -0.86]], parts: ["frontBrakes"] },
  teker: { pts: [[AXLE, WHEEL_R, 0.86], [AXLE, WHEEL_R, -0.86], [-AXLE, WHEEL_R, 0.86], [-AXLE, WHEEL_R, -0.86]], parts: ["hubs"] },
  aks: { pts: [[AXLE, WHEEL_R, 0.42], [AXLE, WHEEL_R, -0.42]], parts: ["axles"] },
  sanziman: { pts: [[0.98, 0.55, -0.1]], parts: ["gearbox"] },
  rotil: { pts: [[AXLE, 0.22, 0.68], [AXLE, 0.22, -0.68]], parts: ["ballJoints"] },
  rot_basi: { pts: [[1.1, 0.4, 0.7], [1.1, 0.4, -0.7]], parts: ["tieRods"] },
  z_rot: { pts: [[1.52, 0.46, 0.6], [1.52, 0.46, -0.6]], parts: ["links"] },
  viraj_lastik: { pts: [[1.56, 0.3, 0.3], [1.56, 0.3, -0.3]], parts: ["swayBar"] },
  amortisor_kafa: { pts: [[AXLE, 1.02, 0.64], [AXLE, 1.02, -0.64]], parts: ["struts"] },
  salincak: { pts: [[1.2, 0.26, 0.48], [1.2, 0.26, -0.48]], parts: ["controlArms"] }
};

// ---------------------------------------------------------------- yardımcılar
function glowTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner); grad.addColorStop(0.25, outer); grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function ringTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.strokeStyle = "#ffb52e"; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
  return new THREE.CanvasTexture(c);
}

const lineMat = (opacity, color = LINE) => new THREE.LineBasicMaterial({ color, transparent: true, opacity });
const fillMat = (opacity, color = LINE) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

/** Dolgu + kenar çizgisi olan parça. */
function part(geometry, { fill = 0.14, edge = 0.55, angle = 25 } = {}) {
  const mesh = new THREE.Mesh(geometry, fillMat(fill));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, angle), lineMat(edge)));
  return mesh;
}
const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };
const axisZ = geo => geo.rotateX(Math.PI / 2);
const axisX = geo => geo.rotateZ(Math.PI / 2);
const cyl = (r, h, seg = 20) => new THREE.CylinderGeometry(r, r, h, seg);
/** Aynı parçayı sağ ve sol tarafa (±z) yerleştirir. */
function mirrored(make) {
  const g = new THREE.Group();
  g.add(make(1), make(-1));
  return g;
}

// ---------------------------------------------------------------- araç
function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.1, 0.4);
  s.lineTo(-2.15, 0.72);
  s.quadraticCurveTo(-2.14, 1.0, -1.98, 1.1);          // arka
  s.quadraticCurveTo(-1.8, 1.42, -1.25, 1.46);         // bagaj camı
  s.quadraticCurveTo(-0.4, 1.5, 0.2, 1.43);            // tavan
  s.quadraticCurveTo(0.6, 1.3, 0.98, 1.04);            // ön cam
  s.quadraticCurveTo(1.6, 0.98, 1.95, 0.86);           // kaput
  s.quadraticCurveTo(2.14, 0.78, 2.15, 0.6);           // burun
  s.lineTo(2.12, 0.4);
  s.lineTo(AXLE + 0.43, 0.34);
  s.absarc(AXLE, 0.34, 0.43, 0, Math.PI, false);       // ön çamurluk
  s.lineTo(-AXLE + 0.43, 0.34);
  s.absarc(-AXLE, 0.34, 0.43, 0, Math.PI, false);      // arka çamurluk
  s.lineTo(-2.1, 0.4);
  return s;
}

function bodyGeometry(shape) {
  const s = shape;
  const geo = new THREE.ExtrudeGeometry(s, { depth: HALF_W * 2 - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 14 });
  geo.translate(0, 0, -(HALF_W - 0.08));
  return geo;
}

/** Yan silüet çizgileri: iki yanda belirgin, ortada soluk. */
function profileLines(shape) {
  const pts = shape.getPoints(18);
  const g = new THREE.Group();
  for (const [z, o] of [[HALF_W, 0.95], [-HALF_W, 0.95], [0, 0.22]]) {
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, z))), lineMat(o)));
  }
  return g;
}

function windowLines() {
  const pts = [[-1.62, 1.04], [-1.5, 1.3], [-1.05, 1.39], [-0.3, 1.42], [0.2, 1.37], [0.86, 1.05], [-1.62, 1.04]];
  const pillar = [[-0.42, 1.05], [-0.4, 1.41]];
  const g = new THREE.Group();
  for (const side of [1, -1]) {
    const z = side * (HALF_W + 0.005);
    const mk = p => new THREE.BufferGeometry().setFromPoints(p.map(([x, y]) => new THREE.Vector3(x, y, z)));
    g.add(new THREE.Line(mk(pts), lineMat(0.6)), new THREE.Line(mk(pillar), lineMat(0.45)));
  }
  return g;
}

function wheel(x, side) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(axisZ(cyl(WHEEL_R, 0.22, 36)), new THREE.MeshBasicMaterial({ color: TIRE, transparent: true, opacity: 0.82 }));
  g.add(tire);
  for (const [r, o] of [[WHEEL_R, 0.9], [0.22, 0.55], [0.07, 0.6]]) {
    for (const dz of [0.112, -0.112]) {
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.Path().absarc(0, 0, r, 0, Math.PI * 2).getPoints(48)), lineMat(o));
      ring.position.z = dz;
      g.add(ring);
    }
  }
  const spokes = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    spokes.push(new THREE.Vector3(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.112 * side), new THREE.Vector3(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.112 * side));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spokes), lineMat(0.5)));
  return at(g, x, WHEEL_R, side * TRACK);
}

/** İç parçalar: ad → nesne. Adlar LOC3D.parts ile eşleşir. */
function buildParts() {
  const p = {};
  p.engine = at(part(new THREE.BoxGeometry(0.62, 0.5, 0.9)), 1.42, 0.72, 0.05);
  p.valveCover = at(part(new THREE.BoxGeometry(0.5, 0.08, 0.8)), 1.42, 1.01, 0.05);
  p.chainCover = at(part(new THREE.BoxGeometry(0.5, 0.46, 0.07)), 1.42, 0.74, -0.44);
  p.gearbox = at(part(new THREE.BoxGeometry(0.42, 0.34, 0.6)), 0.98, 0.55, -0.1);
  p.turbo = at(part(axisX(cyl(0.1, 0.16))), 1.8, 0.74, -0.2);

  const belt = new THREE.TorusGeometry(0.2, 0.016, 8, 40);
  belt.scale(1, 1.35, 1);
  p.belt = at(part(belt, { fill: 0.5, edge: 0 }), 1.42, 0.72, 0.54);
  p.alternator = at(part(axisZ(cyl(0.11, 0.16))), 1.64, 0.9, 0.5);
  p.pump = at(part(axisZ(cyl(0.09, 0.14))), 1.2, 0.88, 0.5);
  p.ac = at(part(axisZ(cyl(0.1, 0.18))), 1.62, 0.5, 0.5);

  const pipe = new THREE.CatmullRomCurve3([[1.08, 0.5, 0.15], [0.6, 0.3, 0.2], [-0.8, 0.3, 0.2], [-1.6, 0.36, 0.3], [-2.1, 0.42, 0.45]].map(v => new THREE.Vector3(...v)));
  p.exhaust = new THREE.Group();
  p.exhaust.add(new THREE.Mesh(new THREE.TubeGeometry(pipe, 60, 0.032, 8), fillMat(0.4)), at(part(axisX(cyl(0.1, 0.5))), -1.5, 0.36, 0.3));

  p.frontBrakes = mirrored(s => at(part(axisZ(cyl(0.2, 0.03, 32)), { fill: 0.3 }), AXLE, WHEEL_R, s * 0.62));
  p.hubs = new THREE.Group();
  for (const x of [AXLE, -AXLE]) for (const s of [1, -1]) p.hubs.add(at(part(axisZ(cyl(0.075, 0.1)), { fill: 0.35 }), x, WHEEL_R, s * 0.6));
  p.axles = mirrored(s => at(part(axisZ(cyl(0.028, 0.5, 10)), { fill: 0.4, edge: 0.3 }), AXLE, WHEEL_R, s * 0.32));
  p.struts = mirrored(s => {
    const g = new THREE.Group();
    g.add(at(part(cyl(0.04, 0.5, 12), { fill: 0.3 }), 0, 0.7, 0), at(part(cyl(0.09, 0.04, 20), { fill: 0.4 }), 0, 0.98, 0));
    const coil = [];
    for (let i = 0; i <= 80; i++) { const t = i / 80; coil.push(new THREE.Vector3(Math.cos(t * 44) * 0.075, 0.5 + t * 0.44, Math.sin(t * 44) * 0.075)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(coil), lineMat(0.6)));
    return at(g, AXLE, 0, s * 0.64);
  });
  p.controlArms = mirrored(s => at(part(new THREE.BoxGeometry(0.46, 0.03, 0.3)), 1.22, 0.26, s * 0.5));
  p.ballJoints = mirrored(s => at(part(new THREE.SphereGeometry(0.05, 14, 10), { fill: 0.5, edge: 0 }), AXLE, 0.24, s * 0.68));
  p.tieRods = mirrored(s => {
    const g = new THREE.Group();
    g.add(at(part(axisZ(cyl(0.016, 0.46, 8)), { fill: 0.45, edge: 0 }), 0, 0, -s * 0.23), part(new THREE.SphereGeometry(0.04, 12, 8), { fill: 0.5, edge: 0 }));
    return at(g, 1.1, 0.4, s * 0.7);
  });
  p.swayBar = at(part(axisZ(cyl(0.018, 1.24, 8)), { fill: 0.45, edge: 0 }), 1.56, 0.3, 0);
  p.links = mirrored(s => at(part(cyl(0.015, 0.32, 8), { fill: 0.45, edge: 0 }), 1.54, 0.46, s * 0.6));
  return p;
}

/** Bir nesnenin altındaki tüm malzemeleri gezer. */
function eachMaterial(obj, fn) {
  obj.traverse(o => { if (o.material) fn(o.material, o); });
}

// ---------------------------------------------------------------- sahne
/**
 * @param {HTMLElement} container sahnenin çizileceği kutu (boyutu CSS'ten gelir)
 * @param {{mode?: "hero"|"result"}} [opts] "hero": sürekli döner ve tarama yapar; "result": seçilen konuma döner
 * @returns {null | {focus: (key: string) => void, scan: () => void, dispose: () => void}}
 */
export function createCar3D(container, { mode = "result" } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = "car3d-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Aracın üç boyutlu görünümü; arızanın olası yeri ışıkla işaretli");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const car = new THREE.Group();
  scene.add(car);

  // zemin
  const grid = new THREE.PolarGridHelper(3.4, 16, 6, 72, LINE, LINE);
  grid.material.transparent = true; grid.material.opacity = 0.16;
  scene.add(grid);
  const floorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(79,227,212,.55)", "rgba(79,227,212,.16)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  floorGlow.scale.set(7.5, 2.6, 1); floorGlow.position.y = 0.02;
  scene.add(floorGlow);

  // gövde
  const shape = bodyShape(), bodyGeo = bodyGeometry(shape);
  car.add(new THREE.Mesh(bodyGeo, fillMat(0.07)));
  car.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo, 30), lineMat(0.35)));
  car.add(profileLines(shape));
  car.add(windowLines());
  for (const x of [AXLE, -AXLE]) for (const s of [1, -1]) car.add(wheel(x, s));

  const parts = buildParts();
  for (const obj of Object.values(parts)) {
    car.add(obj);
    eachMaterial(obj, m => { m.userData.base = { color: m.color.getHex(), opacity: m.opacity }; });
  }

  // tarama düzlemi
  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), new THREE.MeshBasicMaterial({ color: LINE, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  scanPlane.rotation.y = Math.PI / 2; scanPlane.position.y = 0.85;
  const scanEdge = new THREE.LineSegments(new THREE.EdgesGeometry(scanPlane.geometry), lineMat(0));
  scanPlane.add(scanEdge);
  car.add(scanPlane);
  let scanStart = -1;

  // ışıklı noktalar
  const glowMap = glowTexture("rgba(255,236,190,1)", "rgba(255,181,46,.7)"), ringMap = ringTexture();
  const spots = new THREE.Group();
  car.add(spots);
  let activeParts = [];

  // kamera durumu
  // Başlangıç açısı: ön-yan (tam önden bakış aracı kısa gösterir)
  const HOME = -1.05;
  let yaw = HOME, yawTarget = HOME, drag = 0, dragTarget = 0, lastInteract = -1e9;
  const look = new THREE.Vector3(0, 0.62, 0), lookTarget = look.clone();
  let dist = 6.6, distTarget = 6.6;

  function focus(key) {
    const loc = LOC3D[key];
    if (!loc) return;
    for (const obj of activeParts) eachMaterial(obj, m => { m.color.setHex(m.userData.base.color); m.opacity = m.userData.base.opacity; });
    activeParts = loc.parts.map(n => parts[n]).filter(Boolean);
    for (const obj of activeParts) eachMaterial(obj, m => { m.color.setHex(SIGNAL); });

    spots.clear();
    const mean = new THREE.Vector3();
    for (const [x, y, z] of loc.pts) {
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringMap, transparent: true, depthTest: false, depthWrite: false }));
      core.position.set(x, y, z); ring.position.set(x, y, z);
      core.renderOrder = ring.renderOrder = 10;
      spots.add(core, ring);
      mean.add(new THREE.Vector3(x, y, z));
    }
    mean.divideScalar(loc.pts.length);
    // Kamera, noktanın bulunduğu tarafa geçer; iki yanda simetrik noktalar için ön-yan açı kullanılır.
    const side = Math.abs(mean.z) > 0.05 ? Math.sign(mean.z) : -1;
    const angle = Math.atan2(1, mean.x * 0.6 + 0.4);          // 0 = tam önden, π = tam arkadan
    yawTarget = side * Math.min(2.25, Math.max(0.95, angle)); // her zaman yandan bir açı
    lookTarget.set(mean.x * 0.45, 0.62, 0);
    distTarget = 5.9;
    dragTarget = 0;
  }

  function scan() { scanStart = performance.now(); }

  // etkileşim: sürükleyerek döndürme
  let pointerX = null;
  canvas.addEventListener("pointerdown", e => { pointerX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add("grabbing"); });
  canvas.addEventListener("pointermove", e => {
    if (pointerX === null) return;
    dragTarget -= (e.clientX - pointerX) * 0.012;
    pointerX = e.clientX;
    lastInteract = performance.now();
  });
  const release = () => { pointerX = null; canvas.classList.remove("grabbing"); };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // boyut
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let visible = true, raf = 0, disposed = false, lastFrame = performance.now();
  const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0.01 });
  io.observe(container);

  const still = reduceMotion();
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!visible || !container.clientWidth) return;
    const t = now / 1000;
    // Geçişler kare hızından bağımsızdır: yavaş cihazda da aynı sürede tamamlanır.
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    const ease = rate => 1 - Math.exp(-dt * rate);

    // kamera
    const idle = now - lastInteract > 3500;
    if (idle && pointerX === null) dragTarget *= 1 - ease(2);
    drag += (dragTarget - drag) * ease(9);
    if (mode === "hero" && !still) yawTarget = HOME + Math.sin(t * 0.28) * 0.75;
    const sway = still || mode === "hero" ? 0 : Math.sin(t * 0.45) * 0.22;
    yaw += ((yawTarget + sway) - yaw) * (mode === "hero" ? 1 : ease(3));
    look.lerp(lookTarget, ease(3));
    dist += (distTarget - dist) * ease(3);
    // Dar sahnede araç kadraja sığsın diye kamera uzaklaşır.
    const a = yaw + drag, fit = Math.max(1, 1.55 / camera.aspect);
    camera.position.set(look.x + Math.cos(a) * dist * fit, 2.15 * fit, Math.sin(a) * dist * fit);
    camera.lookAt(look);

    // ışıklı noktalar ve etkin parçalar
    const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 4);
    spots.children.forEach((s, i) => {
      if (i % 2 === 0) { s.scale.setScalar(0.42 + 0.1 * pulse); }
      else { const k = still ? 0.5 : (t * 0.8 + i * 0.13) % 1; s.scale.setScalar(0.25 + 0.75 * k); s.material.opacity = 0.9 * (1 - k); }
    });
    for (const obj of activeParts) eachMaterial(obj, (m, o) => { m.opacity = (o.isLine || o.isLineSegments ? 0.85 : 0.55) + 0.3 * pulse; });

    // tarama
    if (mode === "hero" && !still && scanStart < 0) scanStart = now;
    if (scanStart >= 0) {
      const k = (now - scanStart) / 2600;
      if (k >= 1) {
        scanPlane.material.opacity = scanEdge.material.opacity = 0;
        scanStart = mode === "hero" && !still ? now + 2200 : -1;
      } else if (k >= 0) {
        scanPlane.position.x = -2.3 + 4.6 * k;
        const fade = Math.sin(Math.PI * k);
        scanPlane.material.opacity = 0.16 * fade; scanEdge.material.opacity = 0.9 * fade;
      }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect();
    renderer.dispose();
    canvas.remove();
  }
  return { focus, scan, dispose };
}

/** LOCATIONS'taki her konumun üç boyutlu karşılığı var mı? (testler için) */
export const LOC3D_KEYS = Object.keys(LOC3D);
