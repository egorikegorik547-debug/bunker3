// @ts-nocheck
import * as THREE from 'three';

/* ============================================================
   Жилая комната убежища №17: верстак, кровать, стол, стеллаж, шлюз.
   Модуль полностью самодостаточен: строит сцену-группу и возвращает API.
   Оси: X — запад→восток, Z — север→юг, Y — вверх.
   ============================================================ */

export const ROOM = { W: 11, D: 9, H: 3.3 };

const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

/* ---------- Текстуры ---------- */
function mkTex(w, h, draw, rx = 1, ry = 1, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
  return t;
}
function rep(tex, rx, ry) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; }
function speckle(x, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
function planks(x, w, h, rows, base, jitter = 14, seams = true) {
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const j = (Math.random() - 0.5) * jitter * 2;
    x.fillStyle = `rgb(${base[0] + j | 0},${base[1] + j * 0.8 | 0},${base[2] + j * 0.6 | 0})`;
    x.fillRect(0, r * rh, w, rh);
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,230,200'},${0.05 + Math.random() * 0.08})`;
      x.lineWidth = 1;
      const yy = r * rh + Math.random() * rh;
      x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(w * 0.3, yy + rnd(-2, 2), w * 0.7, yy + rnd(-2, 2), w, yy + rnd(-1, 1)); x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, r * rh, w, 2);
    if (seams) { const sx = Math.random() * w; x.fillRect(sx, r * rh, 2, rh); }
  }
}

function buildTextures() {
  const T = {};
  T.wall = mkTex(512, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h * 0.62);
    g.addColorStop(0, '#6f695c'); g.addColorStop(1, '#948c79');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 9000, 0.1);
    for (let i = 0; i < 7; i++) {
      const px = Math.random() * w, ww = 14 + Math.random() * 40, hh = 80 + Math.random() * 200;
      const gg = x.createLinearGradient(0, 0, 0, hh); gg.addColorStop(0, 'rgba(40,28,15,.28)'); gg.addColorStop(1, 'rgba(40,28,15,0)');
      x.fillStyle = gg; x.fillRect(px, 0, ww, hh);
    }
    const py = h * 0.62;
    x.fillStyle = '#2f4639'; x.fillRect(0, py, w, h - py);
    for (let i = 0; i < w; i += 64) {
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(i, py, 3, h - py);
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(i + 3, py, 2, h - py);
    }
    speckle(x, w, h, 4000, 0.1);
    x.fillStyle = '#d3c8a8'; x.fillRect(0, py - 8, w, 8);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, py, w, 5);
    x.fillStyle = '#1b1613'; x.fillRect(0, h - 22, w, 22);
  });
  T.floor = mkTex(512, 512, (x, w, h) => { planks(x, w, h, 18, [96, 70, 46], 16); speckle(x, w, h, 5000, 0.08); });
  T.ceil = mkTex(256, 256, (x, w, h) => {
    x.fillStyle = '#2a2723'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, 0.1);
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3;
    for (let i = 0; i <= w; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  });
  T.wood = mkTex(256, 256, (x, w, h) => { planks(x, w, h, 5, [128, 92, 58], 12); speckle(x, w, h, 2500, 0.07); });
  T.darkWood = mkTex(256, 256, (x, w, h) => { planks(x, w, h, 4, [78, 56, 38], 10); speckle(x, w, h, 2500, 0.08); });
  T.rug = mkTex(512, 384, (x, w, h) => {
    x.fillStyle = '#6a2a26'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#d9c79c'; x.lineWidth = 8; x.strokeRect(14, 14, w - 28, h - 28);
    x.strokeStyle = '#2b3a4a'; x.lineWidth = 14; x.strokeRect(34, 34, w - 68, h - 68);
    x.strokeStyle = '#c99a4a'; x.lineWidth = 3; x.strokeRect(56, 56, w - 112, h - 112);
    for (let i = 0; i < 5; i++) {
      const cx = w / 2 + (i - 2) * 80, cy = h / 2;
      x.fillStyle = i % 2 ? '#c99a4a' : '#d9c79c';
      x.beginPath(); x.moveTo(cx, cy - 56); x.lineTo(cx + 36, cy); x.lineTo(cx, cy + 56); x.lineTo(cx - 36, cy); x.closePath(); x.fill();
      x.fillStyle = '#2b3a4a';
      x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 16, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 16, cy); x.closePath(); x.fill();
    }
    speckle(x, w, h, 9000, 0.14);
    x.fillStyle = '#d9c79c';
    for (let i = 0; i < w; i += 6) { x.fillRect(i, 0, 2, 9); x.fillRect(i, h - 9, 2, 9); }
  }, 1, 1, false);
  T.blanket = mkTex(256, 256, (x, w, h) => {
    x.fillStyle = '#566240'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < h; i += 32) { x.fillStyle = i % 64 ? '#3f4a2e' : '#7c7a4c'; x.fillRect(0, i, w, 8); }
    speckle(x, w, h, 5000, 0.18);
  });
  T.sheet = mkTex(128, 128, (x, w, h) => {
    x.fillStyle = '#b8bcc0'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 16) { x.fillStyle = 'rgba(70,90,120,.35)'; x.fillRect(i, 0, 5, h); }
    speckle(x, w, h, 2000, 0.12);
  });
  T.paper = mkTex(512, 340, (x, w, h) => {
    x.fillStyle = '#d8ccaa'; x.fillRect(0, 0, w, h); speckle(x, w, h, 6000, 0.12);
    x.strokeStyle = 'rgba(60,50,30,.16)'; x.lineWidth = 1;
    for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    for (let i = 0; i < h; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    // сеть коридоров
    x.strokeStyle = '#2d2a22'; x.lineWidth = 4; x.lineCap = 'round';
    const nodes = [];
    for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 4; gy++) nodes.push([70 + gx * 74 + rnd(-10, 10), 62 + gy * 72 + rnd(-8, 8)]);
    for (let i = 0; i < nodes.length; i++) {
      const gx = Math.floor(i / 4), gy = i % 4;
      if (gy < 3 && Math.random() < 0.8) { x.beginPath(); x.moveTo(...nodes[i]); x.lineTo(...nodes[i + 1]); x.stroke(); }
      if (gx < 5 && Math.random() < 0.7) { x.beginPath(); x.moveTo(...nodes[i]); x.lineTo(...nodes[i + 4]); x.stroke(); }
    }
    x.fillStyle = '#2d2a22';
    for (const n of nodes) { x.fillRect(n[0] - 6, n[1] - 6, 12, 12); }
    x.fillStyle = '#c0392b';
    for (let i = 0; i < 9; i++) {
      const n = nodes[(Math.random() * nodes.length) | 0];
      x.strokeStyle = '#c0392b'; x.lineWidth = 4;
      x.beginPath(); x.moveTo(n[0] - 12, n[1] - 12); x.lineTo(n[0] + 12, n[1] + 12); x.moveTo(n[0] + 12, n[1] - 12); x.lineTo(n[0] - 12, n[1] + 12); x.stroke();
    }
    const home = nodes[0];
    x.fillStyle = '#2f9e5d'; x.beginPath(); x.arc(home[0], home[1], 13, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.fillText('17', home[0], home[1] + 5);
    x.fillStyle = '#2d2a22'; x.font = 'bold 22px sans-serif'; x.textAlign = 'left'; x.fillText('СЕТЬ БУНКЕРОВ', 16, 30);
    x.font = 'bold 16px sans-serif'; x.fillStyle = '#6b5a3a';
    ['Б', 'В', 'Д', 'К', 'М', 'Т'].forEach((l, i) => x.fillText(l, 66 + i * 74, h - 12));
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 6; x.strokeRect(0, 0, w, h);
  }, 1, 1, false);
  T.kids = mkTex(256, 256, (x, w, h) => {
    x.fillStyle = '#efe6cf'; x.fillRect(0, 0, w, h); speckle(x, w, h, 2500, 0.1);
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#d4a017'; x.lineWidth = 10; x.beginPath(); x.arc(212, 40, 18, 0, TAU); x.stroke();
    x.strokeStyle = '#5b8f3a'; x.lineWidth = 8; x.beginPath(); x.moveTo(0, 214); x.lineTo(256, 208); x.stroke();
    x.strokeStyle = '#a63d2f'; x.lineWidth = 7; x.strokeRect(34, 120, 74, 80);
    x.beginPath(); x.moveTo(26, 124); x.lineTo(71, 80); x.lineTo(116, 124); x.stroke();
    x.strokeStyle = '#2f5fa8'; x.lineWidth = 6;
    [[150, 200], [176, 200], [202, 200]].forEach(([px, py], i) => {
      const s = i === 1 ? 0.7 : 1;
      x.beginPath(); x.arc(px, py - 62 * s, 11 * s, 0, TAU); x.moveTo(px, py - 51 * s); x.lineTo(px, py - 20 * s);
      x.moveTo(px - 16 * s, py - 42 * s); x.lineTo(px + 16 * s, py - 42 * s); x.moveTo(px, py - 20 * s); x.lineTo(px - 11 * s, py); x.moveTo(px, py - 20 * s); x.lineTo(px + 11 * s, py); x.stroke();
    });
    x.fillStyle = '#2d2a22'; x.font = 'bold 20px sans-serif'; x.fillText('МЫ ДОМА', 26, 36);
  }, 1, 1, false);
  T.peg = mkTex(1024, 360, (x, w, h) => {
    x.fillStyle = '#5a4630'; x.fillRect(0, 0, w, h); speckle(x, w, h, 12000, 0.1);
    x.fillStyle = 'rgba(0,0,0,.55)';
    for (let i = 14; i < w; i += 28) for (let j = 14; j < h; j += 28) { x.beginPath(); x.arc(i, j, 2.4, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(235,225,200,.8)'; x.lineWidth = 5; x.lineCap = 'round'; x.lineJoin = 'round';
    const hook = (px, py) => { x.fillStyle = '#222'; x.beginPath(); x.arc(px, py, 5, 0, TAU); x.fill(); };
    // молоток
    hook(90, 60); x.beginPath(); x.moveTo(90, 60); x.lineTo(90, 270); x.stroke(); x.strokeRect(60, 40, 60, 28);
    // ключи
    for (let i = 0; i < 4; i++) { const px = 200 + i * 50; hook(px, 50); x.beginPath(); x.moveTo(px, 50); x.lineTo(px, 230 - i * 14); x.stroke(); x.beginPath(); x.arc(px, 248 - i * 14, 16 - i, 0, TAU); x.stroke(); }
    // пила
    hook(470, 50); x.beginPath(); x.moveTo(430, 70); x.lineTo(560, 70); x.lineTo(560, 100); x.lineTo(430, 150); x.closePath(); x.stroke();
    // плоскогубцы
    hook(680, 50); x.beginPath(); x.moveTo(660, 70); x.lineTo(700, 70); x.lineTo(690, 190); x.moveTo(700, 70); x.lineTo(660, 190); x.stroke();
    // отвёртки
    for (let i = 0; i < 3; i++) { const px = 790 + i * 40; hook(px, 60); x.beginPath(); x.moveTo(px, 60); x.lineTo(px, 200); x.stroke(); x.strokeRect(px - 9, 200, 18, 60); }
    // рулетка
    x.beginPath(); x.arc(960, 120, 40, 0, TAU); x.stroke();
  }, 1, 1, false);
  T.hazard = mkTex(256, 64, (x, w, h) => {
    x.fillStyle = '#d9a920'; x.fillRect(0, 0, w, h); x.fillStyle = '#17140f';
    for (let i = -h; i < w + h; i += 40) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + 20, h); x.lineTo(i + 20 + h, 0); x.lineTo(i + h, 0); x.closePath(); x.fill(); }
    speckle(x, w, h, 900, 0.2);
  });
  T.sign = mkTex(512, 128, (x, w, h) => {
    x.fillStyle = '#0c2216'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#4ade80'; x.lineWidth = 5; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = '#4ade80'; x.font = 'bold 50px sans-serif'; x.textAlign = 'center';
    x.fillText('ШЛЮЗ №17', w / 2, 62);
    x.font = 'bold 24px sans-serif'; x.fillStyle = '#9bf0b9'; x.fillText('ВЫХОД В СЕТЬ БУНКЕРОВ  ►', w / 2, 102);
    speckle(x, w, h, 800, 0.2);
  }, 1, 1, false);
  T.crossMed = mkTex(64, 64, (x, w, h) => {
    x.fillStyle = '#e9ece8'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c0392b'; x.fillRect(24, 10, 16, 44); x.fillRect(10, 24, 44, 16);
  }, 1, 1, false);
  T.ammo = mkTex(128, 64, (x, w, h) => {
    x.fillStyle = '#4a5a37'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#e8d77a'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('9 MM', w / 2, 30);
    x.fillRect(14, 40, w - 28, 4);
  }, 1, 1, false);
  T.clock = mkTex(128, 128, (x, w, h) => {
    x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
    x.fillStyle = '#ece6d2'; x.beginPath(); x.arc(64, 64, 56, 0, TAU); x.fill();
    x.fillStyle = '#222';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.fillRect(64 + Math.sin(a) * 46 - 2, 64 - Math.cos(a) * 46 - 2, 4, i % 3 ? 4 : 8); }
  }, 1, 1, false);
  return T;
}

/* ---------- Комната ---------- */
export function createHubRoom() {
  const { W, D, H } = ROOM;
  const T = buildTextures();
  const group = new THREE.Group();
  const colliders = [];
  const stations = [];
  const markers = [];
  const animated = {};

  const matCache = {};
  const S = (c, r = 0.8, m = 0.1) => matCache[`${c}_${r}_${m}`] || (matCache[`${c}_${r}_${m}`] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
  const B = c => matCache['b' + c] || (matCache['b' + c] = new THREE.MeshBasicMaterial({ color: c, fog: false }));
  const TM = (map, r = 0.85, m = 0.05, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: r, metalness: m, ...extra });

  const box = (w, h, d, mat, x, y, z, p = group) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
  const cyl = (rt, rb, h, mat, x, y, z, p = group, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); p.add(m); return m; };
  const cylX = (r, len, mat, x, y, z, p = group) => { const m = cyl(r, r, len, mat, x, y, z, p); m.rotation.z = Math.PI / 2; return m; };
  const cylZ = (r, len, mat, x, y, z, p = group) => { const m = cyl(r, r, len, mat, x, y, z, p); m.rotation.x = Math.PI / 2; return m; };
  const sph = (r, mat, x, y, z, p = group, ws = 16, hs = 12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); m.position.set(x, y, z); p.add(m); return m; };
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0, p = group) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); p.add(m); return m; };
  const solid = (cx, cz, w, d) => colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });

  const wood = TM(T.wood, 0.8), darkWood = TM(T.darkWood, 0.85);
  const steel = S(0x5d646a, 0.5, 0.7), darkSteel = S(0x2c3034, 0.6, 0.6);
  const paint = c => S(c, 0.7, 0.15);

  /* ===== Оболочка ===== */
  const floor = plane(W, D, TM(rep(T.floor, W / 3, D / 3), 0.78), W / 2, 0, D / 2, 0, -Math.PI / 2);
  plane(W, D, TM(rep(T.ceil, W / 2, D / 2), 0.95), W / 2, H, D / 2, 0, Math.PI / 2);
  const wallMat = len => TM(rep(T.wall, len / 3.3, 1), 0.92);
  plane(W, H, wallMat(W), W / 2, H / 2, 0);                         // север
  plane(W, H, wallMat(W), W / 2, H / 2, D, Math.PI);                // юг
  plane(D, H, wallMat(D), 0, H / 2, D / 2, Math.PI / 2);            // запад
  plane(D, H, wallMat(D), W, H / 2, D / 2, -Math.PI / 2);           // восток

  // потолочные балки и трубы
  for (const bx of [1.6, 5.5, 9.4]) box(0.28, 0.3, D, S(0x1d1b19, 0.9, 0.2), bx, H - 0.15, D / 2);
  for (const pz of [0.35, D - 0.35]) {
    cylX(0.07, W, S(0x6b4a34, 0.6, 0.5), W / 2, H - 0.3, pz);
    for (let i = 1; i < 6; i++) cylX(0.085, 0.07, darkSteel, i * 1.8, H - 0.3, pz);
  }
  cylX(0.045, W, S(0x3c5a6b, 0.5, 0.5), W / 2, H - 0.22, 0.62);
  // плинтус
  box(W, 0.1, 0.05, S(0x15110e), W / 2, 0.05, 0.03);
  box(W, 0.1, 0.05, S(0x15110e), W / 2, 0.05, D - 0.03);
  box(0.05, 0.1, D, S(0x15110e), 0.03, 0.05, D / 2);
  box(0.05, 0.1, D, S(0x15110e), W - 0.03, 0.05, D / 2);

  /* ===== Освещение ===== */
  group.add(new THREE.HemisphereLight(0xffe6c0, 0x3a2a1c, 0.9));
  const lights = {};
  // центральная лампа
  const ceilLamp = (x, z, intensity, color = 0xffe2b8) => {
    box(0.5, 0.06, 0.18, darkSteel, x, H - 0.33, z);
    box(0.44, 0.03, 0.12, B(0xfff2d6), x, H - 0.37, z);
    const L = new THREE.PointLight(color, intensity, 15, 2); L.position.set(x, H - 0.6, z); group.add(L); return L;
  };
  lights.c1 = ceilLamp(3.2, 3.0, 11);
  lights.c2 = ceilLamp(5.5, 6.2, 8);
  lights.c3 = ceilLamp(9.0, 2.6, 4, 0xffd0a0);

  /* ===== ВЕРСТАК (север, x 2.3..4.9) ===== */
  {
    const g = new THREE.Group(); group.add(g);
    const bx = 3.6, bz = 0.43;
    // пегборд
    plane(2.6, 0.9, TM(T.peg, 0.9), bx, 1.95, 0.045, 0, 0, g);
    box(2.66, 0.05, 0.05, S(0x241a12), bx, 2.42, 0.04, g); box(2.66, 0.05, 0.05, S(0x241a12), bx, 1.48, 0.04, g);
    // столешница
    box(2.6, 0.08, 0.82, darkWood, bx, 0.93, bz, g);
    box(2.6, 0.03, 0.04, steel, bx, 0.975, 0.84, g);
    // каркас
    for (const dx of [-1.25, 1.25]) { box(0.07, 0.9, 0.07, steel, bx + dx, 0.45, 0.07, g); box(0.07, 0.9, 0.07, steel, bx + dx, 0.45, 0.78, g); }
    box(2.5, 0.04, 0.7, darkWood, bx, 0.28, bz, g);
    box(2.5, 0.05, 0.05, steel, bx, 0.6, 0.78, g);
    // тумба с ящиками
    box(0.8, 0.82, 0.74, paint(0x3d5a48), bx + 0.8, 0.45, bz, g);
    for (let i = 0; i < 3; i++) {
      box(0.74, 0.24, 0.03, paint(0x486a55), bx + 0.8, 0.14 + i * 0.27, 0.82, g);
      box(0.22, 0.03, 0.03, steel, bx + 0.8, 0.14 + i * 0.27 + 0.05, 0.85, g);
    }
    // тиски
    box(0.2, 0.1, 0.2, S(0x2f3f4f, 0.5, 0.6), bx - 1.0, 1.02, 0.4, g);
    box(0.2, 0.1, 0.06, S(0x2f3f4f, 0.5, 0.6), bx - 1.0, 1.1, 0.32, g);
    cylX(0.015, 0.3, steel, bx - 1.0, 1.04, 0.62, g); sph(0.03, steel, bx - 1.0 - 0.17, 1.04, 0.62, g);
    // «наковальня» из рельса
    box(0.3, 0.12, 0.14, S(0x25292d, 0.5, 0.8), bx + 0.45, 1.03, 0.5, g);
    box(0.5, 0.05, 0.16, S(0x25292d, 0.5, 0.8), bx + 0.45, 1.115, 0.5, g);
    // инструменты на столе
    cyl(0.012, 0.012, 0.32, S(0x7b4b26, 0.8, 0), bx - 0.4, 0.99, 0.62, g).rotation.z = Math.PI / 2;
    box(0.1, 0.05, 0.05, steel, bx - 0.55, 0.99, 0.62, g);
    box(0.28, 0.02, 0.04, steel, bx - 0.2, 0.975, 0.7, g).rotation.y = 0.3;
    // самодельный приёмник с платой
    box(0.34, 0.12, 0.2, paint(0x44484c), bx - 0.5, 1.03, 0.25, g);
    box(0.26, 0.012, 0.14, S(0x1c6b3a, 0.5, 0.2), bx - 0.5, 1.1, 0.25, g);
    for (let i = 0; i < 4; i++) box(0.03, 0.025, 0.03, S(0xcfcf6a, 0.4, 0.5), bx - 0.58 + i * 0.05, 1.12, 0.25 + (i % 2) * 0.04, g);
    cyl(0.005, 0.005, 0.5, steel, bx - 0.38, 1.35, 0.2, g).rotation.z = -0.1;
    // банка с винтиками
    const jar = cyl(0.06, 0.06, 0.13, new THREE.MeshStandardMaterial({ color: 0xa8c8c0, transparent: true, opacity: 0.4, roughness: 0.1 }), bx + 0.05, 1.03, 0.68, g);
    cyl(0.05, 0.05, 0.06, S(0x8a8a8a, 0.4, 0.8), bx + 0.05, 0.99, 0.68, g);
    cyl(0.062, 0.062, 0.02, S(0x9a3030), bx + 0.05, 1.105, 0.68, g);
    // аккумуляторы
    for (let i = 0; i < 3; i++) cyl(0.025, 0.025, 0.1, S(i ? 0x2f6fb0 : 0xb08a2f, 0.4, 0.5), bx + 1.1 + i * 0.07, 0.01 + 1.02, 0.72, g);
    // нижняя полка: ящики и инструментальный ящик
    box(0.5, 0.18, 0.3, paint(0x8a2f22), bx - 0.8, 0.39, 0.45, g);
    box(0.52, 0.02, 0.32, steel, bx - 0.8, 0.49, 0.45, g);
    box(0.4, 0.22, 0.4, wood, bx - 0.15, 0.4, 0.45, g);
    cyl(0.1, 0.1, 0.2, S(0x335f7a, 0.6, 0.4), bx + 0.4, 0.4, 0.45, g);
    // куча металлолома (видимость по складу)
    const scrapMat = [S(0x6a5a46, 0.8, 0.5), S(0x4a4f55, 0.6, 0.7), S(0x7a4a2a, 0.8, 0.5), S(0x3a3d40, 0.6, 0.6)];
    animated.scrap = [];
    for (let i = 0; i < 12; i++) {
      const m = box(rnd(0.06, 0.14), rnd(0.02, 0.06), rnd(0.05, 0.12), scrapMat[i % 4], bx + 0.95 + (i % 4) * 0.1 - 0.15 + rnd(-.02, .02), 1.0 + Math.floor(i / 6) * 0.035 + 0.01, 0.2 + (Math.floor(i / 2) % 3) * 0.1, g);
      m.rotation.set(rnd(-.2, .2), rnd(0, 3), rnd(-.2, .2));
      animated.scrap.push(m);
    }
    // лампа на шарнире
    const lamp = new THREE.Group(); lamp.position.set(bx - 1.15, 0.97, 0.18); g.add(lamp);
    cyl(0.08, 0.1, 0.03, darkSteel, 0, 0.015, 0, lamp);
    const a1 = cyl(0.012, 0.012, 0.6, steel, 0, 0.33, 0, lamp); a1.rotation.z = -0.18;
    const a2 = cyl(0.012, 0.012, 0.5, steel, 0.25, 0.7, 0, lamp); a2.rotation.z = 1.2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.17, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xc4752c, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }));
    head.position.set(0.5, 0.72, 0.02); head.rotation.z = Math.PI + 0.1; lamp.add(head);
    sph(0.045, B(0xfff0cf), 0.5, 0.66, 0.02, lamp);
    const spot = new THREE.SpotLight(0xffe3b8, 22, 7, 0.95, 0.7, 2);
    spot.position.set(bx - 1.15 + 0.5, 0.97 + 0.66, 0.2); spot.target.position.set(bx + 0.1, 0.95, 0.5);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005; spot.shadow.normalBias = 0.02;
    group.add(spot); group.add(spot.target); lights.bench = spot;
    // табурет
    const st = new THREE.Group(); st.position.set(3.0, 0, 1.45); group.add(st);
    cyl(0.2, 0.2, 0.05, wood, 0, 0.58, 0, st);
    for (const [dx, dz] of [[-.13, -.13], [.13, -.13], [-.13, .13], [.13, .13]]) cyl(0.02, 0.025, 0.56, darkSteel, dx, 0.28, dz, st, 8);
    solid(3.0, 1.45, 0.4, 0.4);
    solid(bx, 0.43, 2.7, 0.9);
    stations.push({ id: 'bench', label: 'Верстак', x: bx, z: 1.0, reach: 2.4, marker: [bx, 2.72, 0.5] });
  }

  /* ===== КРОВАТЬ (СВ угол) ===== */
  {
    const g = new THREE.Group(); group.add(g);
    const cx = 10.0, z0 = 0.05, len = 2.15, wd = 1.05;
    const frameM = S(0x30363b, 0.55, 0.7);
    // изголовье и изножье
    box(wd + 0.1, 0.9, 0.05, frameM, cx, 0.65, z0 + 0.03, g);
    for (let i = 0; i < 6; i++) box(0.02, 0.5, 0.02, frameM, cx - 0.45 + i * 0.18, 0.88, z0 + 0.03, g);
    box(wd + 0.1, 0.5, 0.05, frameM, cx, 0.45, z0 + len, g);
    for (const dx of [-wd / 2, wd / 2]) box(0.05, 0.08, len, frameM, cx + dx, 0.32, z0 + len / 2, g);
    // матрас
    box(wd - 0.02, 0.2, len - 0.1, TM(T.sheet, 0.95), cx, 0.45, z0 + len / 2, g);
    box(wd - 0.02, 0.04, len - 0.1, S(0x222527), cx, 0.31, z0 + len / 2, g);
    // одеяло
    const bl = box(wd + 0.04, 0.09, 1.3, TM(T.blanket, 1), cx, 0.6, z0 + len - 0.75, g);
    bl.rotation.z = 0.01;
    box(wd + 0.05, 0.04, 0.28, TM(T.blanket, 1), cx, 0.66, z0 + len - 1.35, g);
    // подушка
    const pil = sph(0.3, S(0xcfc7b4, 1, 0), cx, 0.64, z0 + 0.4, g); pil.scale.set(1.05, 0.34, 0.75);
    // плюшевый медведь
    const bear = new THREE.Group(); bear.position.set(cx + 0.25, 0.72, z0 + 0.85); bear.rotation.y = -0.6; g.add(bear);
    const fur = S(0x9a6b3d, 1, 0);
    sph(0.09, fur, 0, 0, 0, bear); sph(0.065, fur, 0, 0.12, 0, bear); sph(0.025, fur, -0.05, 0.18, 0, bear); sph(0.025, fur, 0.05, 0.18, 0, bear);
    sph(0.012, S(0x111111), -0.02, 0.13, 0.058, bear); sph(0.012, S(0x111111), 0.02, 0.13, 0.058, bear);
    // тумбочка
    const nx = 8.65, nz = 0.34;
    box(0.55, 0.55, 0.45, darkWood, nx, 0.28, nz, g);
    box(0.5, 0.2, 0.02, S(0x5b4330), nx, 0.4, nz + 0.23, g); sph(0.02, steel, nx, 0.4, nz + 0.25, g, 8, 6);
    box(0.5, 0.2, 0.02, S(0x5b4330), nx, 0.16, nz + 0.23, g); sph(0.02, steel, nx, 0.16, nz + 0.25, g, 8, 6);
    // лампа на тумбочке
    cyl(0.07, 0.08, 0.03, S(0x2a2a2a), nx - 0.1, 0.58, nz, g);
    cyl(0.012, 0.012, 0.2, steel, nx - 0.1, 0.69, nz, g);
    const shade = cyl(0.07, 0.13, 0.16, new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa24a, emissiveIntensity: 0.85, roughness: 1, side: THREE.DoubleSide }), nx - 0.1, 0.84, nz, g);
    lights.bed = new THREE.PointLight(0xffa860, 7, 7, 2); lights.bed.position.set(nx - 0.1, 0.9, nz + 0.1); group.add(lights.bed);
    // будильник, книга, рамка
    box(0.12, 0.09, 0.05, S(0x7a2a2a, 0.5, 0.3), nx + 0.12, 0.61, nz + 0.05, g);
    box(0.09, 0.05, 0.005, B(0x9bff9b), nx + 0.12, 0.62, nz + 0.078, g);
    box(0.2, 0.04, 0.14, S(0x35506b), nx + 0.1, 0.59, nz - 0.1, g).rotation.y = 0.4;
    const fr = box(0.13, 0.17, 0.02, S(0x20150d), nx + 0.2, 0.67, nz - 0.12, g); fr.rotation.set(-0.15, -0.3, 0);
    plane(0.1, 0.13, TM(T.kids, 0.6), nx + 0.2 + 0.0, 0.67, nz - 0.108, -0.3, -0.15, g);
    // коврик у кровати
    plane(1.0, 1.5, TM(rep(T.blanket, 1.5, 2), 1), cx - 1.3, 0.011, 1.4, 0, -Math.PI / 2, g).rotation.z = 0.2;
    solid(cx, z0 + len / 2, wd + 0.15, len);
    solid(nx, nz, 0.6, 0.5);
    stations.push({ id: 'bed', label: 'Кровать', x: cx - 0.4, z: 1.3, reach: 2.4, marker: [cx, 1.45, z0 + 1.1] });
  }

  /* ===== СТОЛ (восток, центр) ===== */
  {
    const g = new THREE.Group(); group.add(g);
    const tx = 8.0, tz = 5.0;
    // ковёр
    plane(3.6, 2.7, TM(T.rug, 1, 0), tx - 0.1, 0.012, tz, 0, -Math.PI / 2, g);
    // стол
    box(1.05, 0.06, 1.95, wood, tx, 0.77, tz, g);
    box(1.0, 0.1, 1.9, darkWood, tx, 0.69, tz, g);
    for (const [dx, dz] of [[-.45, -.9], [.45, -.9], [-.45, .9], [.45, .9]]) box(0.07, 0.72, 0.07, darkWood, tx + dx, 0.36, tz + dz, g);
    solid(tx, tz, 1.15, 2.05);
    // стулья
    const chair = (x, z, ry) => {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
      box(0.46, 0.05, 0.46, wood, 0, 0.46, 0, c); box(0.46, 0.46, 0.04, wood, 0, 0.74, -0.21, c);
      for (const [dx, dz] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) box(0.04, 0.44, 0.04, darkWood, dx, 0.22, dz, c);
      box(0.4, 0.02, 0.4, S(0x7a2e2a, 1, 0), 0, 0.495, 0, c);
      solid(x, z, 0.5, 0.5);
    };
    chair(7.0, 4.45, Math.PI / 2); chair(7.05, 5.55, Math.PI / 2 + 0.2); chair(9.0, 5.0, -Math.PI / 2 - 0.15);
    // карта на столе
    plane(0.72, 0.48, TM(T.paper, 0.9, 0), tx - 0.05, 0.802, tz - 0.55, 0.15, -Math.PI / 2, g);
    // дневник (интерактивный предмет)
    const jr = new THREE.Group(); jr.position.set(tx - 0.12, 0.81, tz + 0.5); jr.rotation.y = -0.4; g.add(jr);
    box(0.24, 0.03, 0.32, S(0x2e4a3a, 0.8, 0.1), 0, 0, 0, jr);
    box(0.22, 0.02, 0.3, S(0xe6dcc0, 1, 0), 0.005, 0.005, 0, jr);
    box(0.012, 0.034, 0.32, S(0x20332a), -0.115, 0, 0, jr);
    // ручка
    cyl(0.006, 0.006, 0.14, S(0x111111), 0.2, 0.02, 0.05, jr).rotation.z = Math.PI / 2;
    // кружки
    const mug = (x, z, c) => { cyl(0.045, 0.04, 0.09, S(c, 0.4, 0.1), x, 0.845, z, g); cyl(0.038, 0.038, 0.005, S(0x2a1608, 0.2), x, 0.89, z, g); };
    mug(tx + 0.28, tz + 0.2, 0xe8e4d8); mug(tx + 0.3, tz - 0.15, 0x4b78a8);
    // консервы и ложка
    cyl(0.05, 0.05, 0.1, S(0xa0a39c, 0.4, 0.8), tx + 0.18, 0.85, tz + 0.65, g);
    cyl(0.051, 0.051, 0.04, S(0xb54b2a, 0.6, 0.2), tx + 0.18, 0.85, tz + 0.65, g);
    // радио с мигающим диодом
    const radio = new THREE.Group(); radio.position.set(tx + 0.25, 0.8, tz + 0.85); radio.rotation.y = 0.5; g.add(radio);
    box(0.3, 0.16, 0.12, paint(0x6b6a5c), 0, 0.08, 0, radio);
    box(0.12, 0.08, 0.005, S(0x1d2a22, 0.3, 0.1), -0.06, 0.09, 0.062, radio);
    cyl(0.025, 0.025, 0.01, S(0x222222), 0.08, 0.09, 0.062, radio).rotation.x = Math.PI / 2;
    animated.led = sph(0.012, new THREE.MeshBasicMaterial({ color: 0xff3a2a }), 0.12, 0.13, 0.062, radio);
    cyl(0.004, 0.004, 0.4, steel, 0.12, 0.35, -0.03, radio).rotation.z = -0.25;
    // горшок с растением
    cyl(0.07, 0.055, 0.1, S(0x9a5a3a, 0.9, 0), tx + 0.3, 0.85, tz - 0.8, g);
    for (let i = 0; i < 7; i++) {
      const lf = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 6), S(0x3f8a3a, 0.7, 0));
      lf.position.set(tx + 0.3 + Math.sin(i * 0.9) * 0.05, 1.0, tz - 0.8 + Math.cos(i * 0.9) * 0.05);
      lf.rotation.set(Math.cos(i * 0.9) * 0.5, 0, -Math.sin(i * 0.9) * 0.5); g.add(lf);
    }
    // подвесная лампа (качается)
    const hang = new THREE.Group(); hang.position.set(tx, H, tz); group.add(hang); animated.hang = hang;
    cyl(0.008, 0.008, 1.3, S(0x0d0d0d), 0, -0.65, 0, hang, 6);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f5f4c, roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide }));
    dome.position.y = -1.35; hang.add(dome);
    sph(0.07, B(0xfff2cf), 0, -1.4, 0, hang);
    const tl = new THREE.PointLight(0xffd29a, 5, 12, 2); tl.position.set(0, -1.45, 0); tl.castShadow = true;
    tl.shadow.mapSize.set(512, 512); tl.shadow.bias = -0.002; tl.shadow.normalBias = 0.03; tl.shadow.camera.near = 0.15;
    hang.add(tl); lights.table = tl;
    dome.castShadow = false;
    // доска с картой и детскими рисунками
    box(2.2, 1.3, 0.04, S(0x5a4026, 0.8, 0), W - 0.03, 1.7, 5.0, g);
    plane(2.05, 1.15, TM(T.paper, 0.95, 0), W - 0.055, 1.7, 5.0, -Math.PI / 2, 0, g);
    for (let i = 0; i < 3; i++) {
      const p = plane(0.42, 0.42, TM(T.kids, 0.95, 0), W - 0.03, 1.5 + (i % 2) * 0.45, 6.5 + i * 0.5, -Math.PI / 2, 0, g);
      p.rotation.z = rnd(-0.12, 0.12);
    }
    stations.push({ id: 'table', label: 'Стол', x: tx - 0.6, z: tz, reach: 2.5, marker: [tx, 1.42, tz + 0.1] });
  }

  /* ===== СТЕЛЛАЖ СО ЗАПАСАМИ (запад) ===== */
  {
    const g = new THREE.Group(); group.add(g);
    const sx = 0.3, z0 = 3.3, z1 = 5.9, zc = (z0 + z1) / 2;
    const shM = S(0x49545c, 0.55, 0.65);
    for (const z of [z0, zc, z1]) for (const dx of [0.05, 0.52]) box(0.05, 2.25, 0.05, shM, dx, 1.12, z, g);
    const levels = [0.25, 0.85, 1.4, 1.95];
    for (const y of levels) box(0.52, 0.04, z1 - z0 + 0.1, wood, sx + 0.02, y, zc, g);
    // уровень 1: канистры и ящики
    for (let i = 0; i < 3; i++) {
      const jc = box(0.22, 0.3, 0.14, S(i === 1 ? 0x2f5f8a : 0x7a8a3a, 0.5, 0.2), 0.3, 0.42, 3.5 + i * 0.22, g);
      box(0.06, 0.05, 0.05, S(0x222222), 0.3, 0.6, 3.5 + i * 0.22 + 0.04, g);
    }
    box(0.4, 0.28, 0.6, wood, 0.32, 0.41, 5.2, g); box(0.4, 0.28, 0.5, wood, 0.32, 0.41, 5.7, g).rotation.y = 0.05;
    // уровень 2: консервы (еда)
    animated.cans = [];
    const canCols = [0xb54b2a, 0x7a8f3a, 0xa8a8a0, 0xc79a2a];
    for (let i = 0; i < 14; i++) {
      const row = Math.floor(i / 7), col = i % 7;
      const cm = cyl(0.045, 0.045, 0.11, S(canCols[i % 4], 0.45, 0.5), 0.2 + row * 0.2, 0.93, 3.45 + col * 0.36 + (row ? 0.12 : 0), g, 12);
      animated.cans.push(cm);
    }
    // уровень 3: медикаменты
    animated.meds = []; animated.bands = [];
    for (let i = 0; i < 4; i++) {
      const mb = box(0.2, 0.14, 0.26, TM(T.crossMed, 0.5, 0.1), 0.3, 1.49, 3.55 + i * 0.32, g);
      animated.meds.push(mb);
    }
    for (let i = 0; i < 6; i++) {
      const bd = cyl(0.04, 0.04, 0.05, S(0xeee8da, 1, 0), 0.38, 1.445, 4.9 + (i % 3) * 0.14, g, 14); bd.position.y += Math.floor(i / 3) * 0.055;
      animated.bands.push(bd);
    }
    // уровень 4: патроны и батареи
    animated.ammo = []; animated.batts = [];
    for (let i = 0; i < 4; i++) animated.ammo.push(box(0.2, 0.12, 0.3, TM(T.ammo, 0.6, 0.1), 0.3, 2.01, 3.5 + i * 0.34, g));
    for (let i = 0; i < 3; i++) animated.batts.push(box(0.14, 0.16, 0.2, S(0x2d6fb0, 0.4, 0.4), 0.3, 2.03, 5.0 + i * 0.25, g));
    // люминесцентная лампа
    box(0.12, 0.05, 1.5, S(0x303030), 0.55, H - 0.35, zc, g);
    box(0.08, 0.03, 1.4, B(0xe8f3ff), 0.55, H - 0.39, zc, g);
    lights.shelf = new THREE.PointLight(0xdfeaff, 7, 8, 2); lights.shelf.position.set(0.9, H - 0.6, zc); group.add(lights.shelf);
    solid(0.3, zc, 0.62, z1 - z0 + 0.1);
    stations.push({ id: 'shelf', label: 'Склад', x: 0.9, z: zc, reach: 2.7, marker: [0.7, 2.5, zc] });
  }

  /* ===== ШЛЮЗ (юг) ===== */
  {
    const g = new THREE.Group(); group.add(g);
    const dx = 5.5, z = D;
    const hz = TM(rep(T.hazard, 2, 1), 0.6, 0.2);
    box(2.1, 0.2, 0.3, hz, dx, 2.5, z - 0.15, g);
    box(0.2, 2.5, 0.3, hz, dx - 1.0, 1.25, z - 0.15, g); box(0.2, 2.5, 0.3, hz, dx + 1.0, 1.25, z - 0.15, g);
    box(1.8, 2.4, 0.12, S(0x4d5a52, 0.5, 0.65), dx, 1.2, z - 0.1, g);
    for (let i = 0; i < 3; i++) box(1.7, 0.05, 0.03, darkSteel, dx, 0.5 + i * 0.7, z - 0.17, g);
    box(0.05, 2.35, 0.03, darkSteel, dx, 1.2, z - 0.17, g);
    // болты
    for (let i = 0; i < 12; i++) { const a = i / 12; cyl(0.025, 0.025, 0.03, steel, dx - 0.82 + (i % 6) * 0.328, i < 6 ? 2.28 : 0.14, z - 0.17, g, 8).rotation.x = Math.PI / 2; }
    // штурвал
    const wheel = new THREE.Group(); wheel.position.set(dx - 0.35, 1.2, z - 0.22); g.add(wheel);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), S(0xa8a090, 0.4, 0.7)); wheel.add(tor);
    for (let i = 0; i < 4; i++) { const sp = box(0.44, 0.03, 0.03, S(0xa8a090, 0.4, 0.7), 0, 0, 0, wheel); sp.rotation.z = i * Math.PI / 4; }
    cyl(0.05, 0.05, 0.06, S(0xa8a090, 0.4, 0.7), 0, 0, 0, wheel).rotation.x = Math.PI / 2;
    // индикатор и табличка
    plane(2.0, 0.5, TM(T.sign, 0.5, 0.1), dx, 2.85, z - 0.03, Math.PI, 0, g);
    box(0.14, 0.14, 0.05, S(0x1a1a1a), dx + 0.62, 1.55, z - 0.19, g);
    animated.doorLamp = sph(0.045, B(0x4aff8a), dx + 0.62, 1.55, z - 0.22, g);
    lights.door = new THREE.PointLight(0x4aff8a, 5, 6, 2); lights.door.position.set(dx + 0.62, 1.6, z - 0.6); group.add(lights.door);
    // полосы на полу
    plane(2.4, 0.5, TM(rep(T.hazard, 3, 1), 0.7, 0), dx, 0.014, z - 0.9, 0, -Math.PI / 2, g);
    solid(dx, z - 0.12, 2.4, 0.4);
    stations.push({ id: 'door', label: 'Шлюз', x: dx, z: z - 0.4, reach: 2.8, marker: [dx, 3.05, z - 0.3] });
  }

  /* ===== Декор: часы, календарь, ящики, генератор, гирлянда ===== */
  {
    // часы
    const ck = new THREE.Group(); ck.position.set(7.2, 2.35, 0.04); group.add(ck);
    plane(0.46, 0.46, new THREE.MeshStandardMaterial({ map: T.clock, roughness: 0.4, transparent: true }), 0, 0, 0, 0, 0, ck);
    animated.hourH = new THREE.Group(); animated.minH = new THREE.Group(); animated.secH = new THREE.Group();
    for (const [h, len, w, c] of [[animated.hourH, 0.11, 0.014, 0x111111], [animated.minH, 0.17, 0.01, 0x111111], [animated.secH, 0.19, 0.005, 0xb02a2a]]) {
      box(w, len, 0.004, B(c), 0, len / 2, 0.006, h); ck.add(h);
    }
    // календарь с номером дня
    const cal = document.createElement('canvas'); cal.width = 128; cal.height = 160; animated.calCtx = cal.getContext('2d');
    animated.calTex = new THREE.CanvasTexture(cal); animated.calTex.colorSpace = THREE.SRGBColorSpace;
    plane(0.34, 0.42, new THREE.MeshStandardMaterial({ map: animated.calTex, roughness: 0.9 }), 6.3, 1.75, 0.035);
    // полка с рамкой
    box(0.9, 0.04, 0.2, darkWood, 6.7, 1.25, 0.12);
    box(0.14, 0.18, 0.02, S(0x20150d), 6.4, 1.36, 0.1); plane(0.1, 0.14, TM(T.kids, 0.6), 6.4, 1.36, 0.112);
    cyl(0.05, 0.04, 0.12, S(0x6b8f9a, 0.3, 0.1), 7.0, 1.33, 0.12);

    // ящики и бочка (юго-запад)
    const crate = (x, y, z, s, ry) => { const c = box(s, s, s, wood, x, y, z); c.rotation.y = ry; box(s + 0.02, 0.05, s + 0.02, darkWood, x, y - s / 2 + 0.03, z).rotation.y = ry; box(s + 0.02, 0.05, s + 0.02, darkWood, x, y + s / 2 - 0.03, z).rotation.y = ry; };
    crate(0.7, 0.4, 8.2, 0.8, 0.1); crate(1.6, 0.3, 8.3, 0.6, -0.2); crate(0.8, 1.05, 8.2, 0.55, 0.5);
    solid(1.1, 8.25, 2.0, 0.9);
    cyl(0.3, 0.3, 0.9, S(0x375a78, 0.5, 0.5), 2.6, 0.45, 8.45); cyl(0.31, 0.31, 0.03, darkSteel, 2.6, 0.7, 8.45); cyl(0.31, 0.31, 0.03, darkSteel, 2.6, 0.2, 8.45);
    solid(2.6, 8.45, 0.65, 0.65);

    // генератор (юго-восток)
    const gen = new THREE.Group(); gen.position.set(9.9, 0, 8.1); group.add(gen);
    box(1.4, 0.9, 0.9, paint(0x39503d), 0, 0.55, 0, gen);
    box(1.5, 0.1, 1.0, darkSteel, 0, 0.05, 0, gen);
    for (let i = 0; i < 6; i++) box(0.9, 0.025, 0.02, S(0x1a1a1a), -0.1, 0.35 + i * 0.1, -0.46, gen);
    for (let i = 0; i < 5; i++) box(0.9, 0.025, 0.02, S(0x1a1a1a), -0.1, 0.35 + i * 0.1, 0.46, gen);
    box(0.3, 0.3, 0.02, S(0x222222), 0.42, 0.7, -0.46, gen);
    cylX(0.1, 0.9, steel, -0.2, 1.15, 0, gen);
    cylZ(0.07, 0.6, steel, 0.5, 1.1, 0, gen);
    animated.genLed = sph(0.02, B(0x4aff8a), 0.42, 0.85, -0.47, gen);
    plane(0.34, 0.2, TM(T.hazard, 0.7, 0), 0.5, 0.5, 0.465, 0, 0, gen);
    solid(9.9, 8.1, 1.5, 1.0);

    // гирлянда над кроватью и столом (восточная стена)
    const pts = [];
    const colors = [0xffd27a, 0xff8a5a, 0x9be8ff, 0xffa8d0, 0xa8ff9b];
    const runs = [[0.5, 2.5], [2.5, 4.5]];
    let n = 0;
    for (const [za, zb] of runs) {
      const seg = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; const z = za + (zb - za) * u; const y = 2.75 - Math.sin(u * Math.PI) * 0.3; seg.push(new THREE.Vector3(W - 0.06, y, z)); }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x151515 })));
      for (let i = 1; i < 12; i++) { sph(0.035, B(colors[n++ % colors.length]), seg[i].x, seg[i].y - 0.04, seg[i].z, group, 8, 6); }
    }
    lights.string = new THREE.PointLight(0xffb070, 3, 6, 2); lights.string.position.set(W - 0.5, 2.5, 2.5); group.add(lights.string);
  }

  /* ===== Пыль в лучах света ===== */
  const DUST = 160;
  const dg = new THREE.BufferGeometry(); const dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dp[i * 3] = rnd(0.5, W - 0.5); dp[i * 3 + 1] = rnd(0.3, H - 0.3); dp[i * 3 + 2] = rnd(0.5, D - 0.5); }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe6bd, size: 0.025, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
  dust.frustumCulled = false; group.add(dust);

  /* ===== Маркеры интерактивных объектов ===== */
  for (const s of stations) {
    const col = s.id === 'door' ? 0x4aff8a : 0xffc24a;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true, opacity: 0.9 }));
    m.position.set(...s.marker); m.userData.y0 = s.marker[1]; m.userData.id = s.id; group.add(m); markers.push(m);
    const halo = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: col, fog: false, wireframe: true, transparent: true, opacity: 0.45 }));
    m.add(halo);
  }

  /* ===== Тени ===== */
  group.traverse(o => {
    if (!o.isMesh) return;
    const std = o.material && o.material.isMeshStandardMaterial;
    const thin = o.geometry && o.geometry.type === 'PlaneGeometry';
    o.receiveShadow = !!std;
    o.castShadow = !!std && !thin && !(o.material.transparent);
  });
  floor.receiveShadow = true;

  /* ===== API ===== */
  function drawCalendar(day) {
    const x = animated.calCtx;
    x.fillStyle = '#efe9d6'; x.fillRect(0, 0, 128, 160);
    x.fillStyle = '#a63d2f'; x.fillRect(0, 0, 128, 38);
    x.fillStyle = '#fff'; x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillText('ДЕНЬ', 64, 27);
    x.fillStyle = '#222'; x.font = 'bold 64px sans-serif'; x.fillText(String(day), 64, 104);
    x.font = '14px sans-serif'; x.fillStyle = '#555'; x.fillText('убежище №17', 64, 140);
    animated.calTex.needsUpdate = true;
  }
  function refresh(save) {
    const set = (arr, n) => arr.forEach((m, i) => { m.visible = i < n; });
    set(animated.scrap, Math.min(12, save.scrap));
    set(animated.cans, Math.min(14, save.food));
    set(animated.meds, Math.min(4, save.meds));
    set(animated.bands, Math.min(6, save.band));
    set(animated.ammo, Math.min(4, Math.ceil(save.ammo / 6)));
    set(animated.batts, Math.min(3, save.batt));
    drawCalendar(save.day);
  }
  function update(t, dt, near) {
    animated.hang.rotation.z = Math.sin(t * 0.8) * 0.025; animated.hang.rotation.x = Math.sin(t * 0.63 + 1) * 0.018;
    lights.table.intensity = 5 * (Math.random() < 0.012 ? 0.8 : 1);
    animated.led.visible = Math.sin(t * 3.1) > -0.2;
    animated.genLed.visible = Math.sin(t * 1.3) > -0.7;
    const pulse = 0.65 + 0.35 * Math.sin(t * 2.4);
    lights.door.intensity = 3 + 3 * pulse; animated.doorLamp.scale.setScalar(0.8 + 0.3 * pulse);
    for (const m of markers) {
      m.position.y = m.userData.y0 + Math.sin(t * 2 + m.position.x) * 0.04;
      m.rotation.y = t * 1.2;
      const s = near === m.userData.id ? 1.6 : 1;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * Math.min(1, dt * 8));
    }
    const d = new Date(); const sec = d.getSeconds() + d.getMilliseconds() / 1000;
    animated.secH.rotation.z = -sec / 60 * TAU; animated.minH.rotation.z = -(d.getMinutes() + sec / 60) / 60 * TAU; animated.hourH.rotation.z = -((d.getHours() % 12) + d.getMinutes() / 60) / 12 * TAU;
    const pa = dust.geometry.attributes.position;
    for (let i = 0; i < DUST; i++) {
      pa.array[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0015 + 0.0008;
      pa.array[i * 3] += Math.cos(t * 0.2 + i * 1.7) * 0.0012;
      if (pa.array[i * 3 + 1] > H - 0.2) pa.array[i * 3 + 1] = 0.3;
    }
    pa.needsUpdate = true;
  }
  function collide(p, r) {
    p.x = Math.max(r + 0.12, Math.min(W - r - 0.12, p.x));
    p.z = Math.max(r + 0.12, Math.min(D - r - 0.12, p.z));
    for (const b of colliders) {
      const cx = Math.max(b.x0, Math.min(b.x1, p.x)), cz = Math.max(b.z0, Math.min(b.z1, p.z));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else {
        const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z, m = Math.min(l, rr, t, bt);
        if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r;
      }
    }
  }
  return { group, stations, collide, update, refresh, spawn: { x: 5.5, z: D - 1.7, yaw: 0, pitch: 0 } };
}
