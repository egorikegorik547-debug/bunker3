// @ts-nocheck
import * as THREE from 'three';
import { ZONES } from './data';

/* ============================================================
   Процедурные текстуры сети бункеров — в том же стиле, что и убежище:
   окрашенные панели, плинтусы, потёки, плитка, дерево, металл.
   ============================================================ */

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export function mkTex(w, h, draw, repeat = true, aniso = 8) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  else t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
export function speckle(x, w, h, n, a) {
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
function stains(x, w, h, n, rgb, aMax, rMin = 10, rMax = 40) {
  for (let i = 0; i < n; i++) {
    const px = Math.random() * w, py = Math.random() * h, r = rnd(rMin, rMax);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${rgb},${rnd(aMax * 0.4, aMax)})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.beginPath(); x.ellipse(px, py, r, r * rnd(0.5, 1), rnd(0, 3), 0, TAU); x.fill();
  }
}

/* ---------- Основные поверхности ---------- */
export const wallTex = mkTex(512, 512, (x, w, h) => {
  // верх: бетон, крашенный в холодный серо-зелёный
  const g = x.createLinearGradient(0, 0, 0, h * 0.62);
  g.addColorStop(0, '#5d625d'); g.addColorStop(1, '#8a8d82');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  speckle(x, w, h, 9000, 0.1);
  stains(x, w, h * 0.62, 10, '30,26,20', 0.16, 20, 70);
  // потёки сверху
  for (let i = 0; i < 9; i++) {
    const px = Math.random() * w, ww = 10 + Math.random() * 38, hh = 80 + Math.random() * 220;
    const gg = x.createLinearGradient(0, 0, 0, hh); gg.addColorStop(0, 'rgba(34,24,14,.34)'); gg.addColorStop(1, 'rgba(34,24,14,0)');
    x.fillStyle = gg; x.fillRect(px, 0, ww, hh);
  }
  // ржавые подтёки
  for (let i = 0; i < 4; i++) {
    const px = Math.random() * w, hh = 60 + Math.random() * 120;
    const gg = x.createLinearGradient(0, h * 0.1, 0, h * 0.1 + hh); gg.addColorStop(0, 'rgba(120,60,22,.3)'); gg.addColorStop(1, 'rgba(120,60,22,0)');
    x.fillStyle = gg; x.fillRect(px, h * 0.1, 3 + Math.random() * 5, hh);
  }
  // стыки бетонных плит + болты (период 256 → стыкуется)
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, 0, 3, h * 0.62); x.fillRect(256, 0, 3, h * 0.62);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(3, 0, 2, h * 0.62); x.fillRect(259, 0, 2, h * 0.62);
  x.fillStyle = 'rgba(0,0,0,.4)';
  for (let y = 30; y < h * 0.6; y += 54) for (const bx of [12, 268]) { x.beginPath(); x.arc(bx, y, 2.6, 0, TAU); x.fill(); }
  // трещина
  x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1.5; x.beginPath();
  let cx = rnd(60, 200), cy = 20; x.moveTo(cx, cy);
  for (let i = 0; i < 12; i++) { cx += rnd(-12, 12); cy += rnd(10, 18); x.lineTo(cx, cy); }
  x.stroke();
  // копоть под потолком
  const gs = x.createLinearGradient(0, 0, 0, h * 0.22); gs.addColorStop(0, 'rgba(0,0,0,.42)'); gs.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gs; x.fillRect(0, 0, w, h * 0.22);
  // нижняя панель (цоколь)
  const py = h * 0.62;
  x.fillStyle = '#2b3f3c'; x.fillRect(0, py, w, h - py);
  for (let i = 0; i < w; i += 64) {
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(i, py, 3, h - py);
    x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(i + 3, py, 2, h - py);
  }
  speckle(x, w, h, 4500, 0.12);
  // царапины на панелях
  x.strokeStyle = 'rgba(200,210,190,.1)'; x.lineWidth = 1;
  for (let i = 0; i < 26; i++) { const sx = Math.random() * w, sy = py + 20 + Math.random() * (h - py - 50); x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + rnd(-26, 26), sy + rnd(-10, 10)); x.stroke(); }
  stains(x, w, h - py, 6, '0,0,0', 0.22, 10, 36);
  // тёплая «кремовая» линия и тень
  x.fillStyle = '#c9c19f'; x.fillRect(0, py - 8, w, 8);
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, py, w, 5);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, py - 8, w, 2);
  // плинтус
  x.fillStyle = '#15120f'; x.fillRect(0, h - 24, w, 24);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, h - 24, w, 2);
}, true, 8);

export const floorTex = mkTex(512, 512, (x, w, h) => {
  const T = 4, s = w / T;
  for (let i = 0; i < T; i++) for (let j = 0; j < T; j++) {
    const v = rnd(-7, 7);
    x.fillStyle = `rgb(${52 + v | 0},${57 + v | 0},${60 + v | 0})`; x.fillRect(i * s, j * s, s, s);
    const gg = x.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
    gg.addColorStop(0, 'rgba(255,255,255,.05)'); gg.addColorStop(1, 'rgba(0,0,0,.1)');
    x.fillStyle = gg; x.fillRect(i * s, j * s, s, s);
  }
  speckle(x, w, h, 9000, 0.1);
  stains(x, w, h, 5, '12,10,8', 0.35, 14, 44);
  stains(x, w, h, 4, '110,55,20', 0.18, 10, 28);
  // царапины от колёс и ног
  x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1;
  for (let i = 0; i < 34; i++) { const sx = Math.random() * w, sy = Math.random() * h; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + rnd(-40, 40), sy + rnd(-40, 40)); x.stroke(); }
  // швы плит
  x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = 4;
  for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1;
  for (let i = 3; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
});

export const ceilTex = mkTex(256, 256, (x, w, h) => {
  x.fillStyle = '#23262a'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, 0.1);
  stains(x, w, h, 4, '0,0,0', 0.4, 20, 60);
  x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 4;
  for (let i = 0; i <= w; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.07)';
  for (const a of [10, 118, 138, 246]) for (const b of [10, 118, 138, 246]) { x.beginPath(); x.arc(a, b, 2, 0, TAU); x.fill(); }
});

export const bloodTex = mkTex(128, 128, (x) => {
  for (let i = 0; i < 14; i++) {
    const r = 6 + Math.random() * 26, px = 64 + (Math.random() - .5) * 60, py = 64 + (Math.random() - .5) * 60;
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(90,5,5,.9)'); g.addColorStop(1, 'rgba(60,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
}, false);

/* Табличка над шлюзом убежища (вид со стороны бункеров) */
export const signTex = mkTex(512, 128, (x, w, h) => {
  x.fillStyle = '#0c2216'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#4ade80'; x.lineWidth = 5; x.strokeRect(6, 6, w - 12, h - 12);
  x.fillStyle = '#4ade80'; x.font = 'bold 50px sans-serif'; x.textAlign = 'center';
  x.fillText('УБЕЖИЩЕ №17', w / 2, 62);
  x.font = 'bold 24px sans-serif'; x.fillStyle = '#9bf0b9'; x.fillText('◄  ШЛЮЗ ВОЗВРАТА  ДОМОЙ', w / 2, 102);
  speckle(x, w, h, 800, 0.2);
}, false);

/* ---------- Таблички зон над проёмами ---------- */
const zoneSignMats = {};
export function zoneSignMat(type) {
  if (zoneSignMats[type]) return zoneSignMats[type];
  const z = ZONES[type];
  const t = mkTex(320, 80, (x, w, h) => {
    x.fillStyle = '#0b0f0e'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = z.color; x.fillRect(0, 0, 14, h);
    x.strokeStyle = z.color; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6);
    x.globalAlpha = 0.35; x.lineWidth = 1; x.strokeRect(9, 9, w - 18, h - 18); x.globalAlpha = 1;
    let fs = 38; x.textAlign = 'center'; x.textBaseline = 'middle';
    do { x.font = `bold ${fs}px sans-serif`; fs -= 2; } while (x.measureText(z.name.toUpperCase()).width > w - 50 && fs > 14);
    x.fillStyle = z.color; x.fillText(z.name.toUpperCase(), w / 2 + 6, h / 2 + 2);
    x.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 0; y < h; y += 3) x.fillRect(14, y, w - 14, 1);
    x.fillStyle = 'rgba(0,0,0,.6)'; for (const [bx, by] of [[24, 12], [w - 12, 12], [24, h - 12], [w - 12, h - 12]]) { x.beginPath(); x.arc(bx, by, 2.5, 0, TAU); x.fill(); }
  }, false);
  return (zoneSignMats[type] = new THREE.MeshBasicMaterial({ map: t }));
}

/* ---------- Полы зон: бесшовная основа (на 3 м) + маркировка (на клетку) ---------- */
const BASE = {
  airlock(x, w, h) {
    x.fillStyle = '#1f3d33'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, 0.1);
    stains(x, w, h, 3, '0,0,0', 0.25, 20, 50);
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3;
    for (let i = 0; i <= w; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.fillStyle = 'rgba(120,255,170,.06)'; x.fillRect(0, 0, w, h);
  },
  living(x, w, h) { planks(x, w, h, 14, [96, 70, 46], 16); speckle(x, w, h, 4000, 0.08); },
  medbay(x, w, h) {
    const s = w / 8;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = rnd(-8, 8); x.fillStyle = `rgb(${204 + v | 0},${220 + v | 0},${222 + v | 0})`; x.fillRect(i * s, j * s, s, s); }
    speckle(x, w, h, 3500, 0.07);
    x.strokeStyle = 'rgba(70,100,108,.7)'; x.lineWidth = 2;
    for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    stains(x, w, h, 3, '90,40,30', 0.14, 14, 30);
  },
  canteen(x, w, h) {
    const s = w / 8;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#dedbc6' : '#25282a'; x.fillRect(i * s, j * s, s, s); }
    speckle(x, w, h, 4000, 0.1); stains(x, w, h, 3, '40,25,10', 0.2, 14, 36);
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 1.5;
    for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  },
  warehouse(x, w, h) {
    x.fillStyle = '#4a4943'; x.fillRect(0, 0, w, h); speckle(x, w, h, 9000, 0.12);
    stains(x, w, h, 6, '10,8,6', 0.35, 16, 50); stains(x, w, h, 3, '120,70,20', 0.16, 12, 30);
    x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2;
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(0, i * 85 + 20); x.lineTo(w, i * 85 + 20 + rnd(-6, 6)); x.stroke(); }
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 6;
    for (let i = 0; i < 4; i++) { const y = rnd(10, h - 10); x.beginPath(); x.moveTo(rnd(0, 60), y); x.bezierCurveTo(100, y + 20, 160, y - 20, w, y + 8); x.stroke(); }
  },
  server(x, w, h) {
    const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.fillStyle = '#1b2538'; x.fillRect(i * s, j * s, s, s);
      x.fillStyle = 'rgba(8,14,26,.8)';
      for (let a = 10; a < s - 6; a += 10) for (let b = 10; b < s - 6; b += 10) { x.beginPath(); x.arc(i * s + a, j * s + b, 2.1, 0, TAU); x.fill(); }
    }
    speckle(x, w, h, 3500, 0.08);
    x.strokeStyle = 'rgba(100,170,255,.35)'; x.lineWidth = 2;
    for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  },
  generator(x, w, h) {
    x.fillStyle = '#2f3234'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 16) for (let j = 0; j < h; j += 16) {
      const o = ((i + j) / 16) % 2 ? 1 : -1; x.save(); x.translate(i + 8, j + 8); x.rotate(o * Math.PI / 4);
      x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(-5, -1.5, 10, 3); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-5, 1.5, 10, 1.5); x.restore();
    }
    speckle(x, w, h, 4000, 0.1); stains(x, w, h, 4, '0,0,0', 0.4, 14, 40); stains(x, w, h, 3, '100,50,16', 0.2, 10, 24);
  },
  armory(x, w, h) {
    x.fillStyle = '#2a3322'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3;
    for (let i = -h; i < w + h; i += 14) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); x.beginPath(); x.moveTo(i + h, 0); x.lineTo(i, h); x.stroke(); }
    speckle(x, w, h, 5000, 0.12);
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3;
    for (let i = 0; i <= w; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  },
  vault(x, w, h) {
    const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = rnd(-6, 6); x.fillStyle = `rgb(${40 + v | 0},${34 + v | 0},${26 + v | 0})`; x.fillRect(i * s, j * s, s, s); }
    speckle(x, w, h, 6000, 0.1);
    x.strokeStyle = 'rgba(220,170,60,.6)'; x.lineWidth = 3;
    for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.strokeStyle = 'rgba(220,170,60,.25)'; x.lineWidth = 1;
    for (let i = 8; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  }
};
const SURF = { airlock: [0.45, 0.2], living: [0.8, 0.02], medbay: [0.35, 0.05], canteen: [0.45, 0.05], warehouse: [0.9, 0.1], server: [0.4, 0.3], generator: [0.45, 0.6], armory: [0.8, 0.1], vault: [0.3, 0.3] };
const zoneFloorMats = {};
export function zoneFloorMat(type) {
  if (zoneFloorMats[type]) return zoneFloorMats[type];
  const t = mkTex(256, 256, BASE[type]);
  const [r, m] = SURF[type];
  return (zoneFloorMats[type] = new THREE.MeshStandardMaterial({ map: t, roughness: r, metalness: m, polygonOffset: true, polygonOffsetFactor: -1 }));
}
const MARK = {
  airlock(x, w, h) {
    x.strokeStyle = 'rgba(120,255,170,.75)'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = 'rgba(160,255,200,.6)'; x.beginPath(); x.moveTo(64, 28); x.lineTo(96, 70); x.lineTo(76, 70); x.lineTo(76, 100); x.lineTo(52, 100); x.lineTo(52, 70); x.lineTo(32, 70); x.fill();
  },
  living(x, w, h) {
    x.fillStyle = '#6a2a26'; x.fillRect(12, 20, w - 24, h - 40);
    x.strokeStyle = '#d9c79c'; x.lineWidth = 3; x.strokeRect(15, 23, w - 30, h - 46);
    x.strokeStyle = '#2b3a4a'; x.lineWidth = 5; x.strokeRect(24, 32, w - 48, h - 64);
    x.strokeStyle = '#c99a4a'; x.lineWidth = 1.5; x.strokeRect(34, 42, w - 68, h - 84);
    for (let i = 0; i < 3; i++) { const cx = w / 2 + (i - 1) * 22, cy = h / 2; x.fillStyle = i % 2 ? '#c99a4a' : '#d9c79c'; x.beginPath(); x.moveTo(cx, cy - 15); x.lineTo(cx + 10, cy); x.lineTo(cx, cy + 15); x.lineTo(cx - 10, cy); x.closePath(); x.fill(); }
    x.fillStyle = '#d9c79c'; for (let i = 12; i < w - 12; i += 4) { x.fillRect(i, 16, 1.5, 4); x.fillRect(i, h - 20, 1.5, 4); }
    speckle(x, w, h, 900, 0.14);
  },
  medbay(x, w, h) {
    x.fillStyle = 'rgba(200,40,40,.55)'; x.fillRect(54, 34, 20, 60); x.fillRect(34, 54, 60, 20);
  },
  warehouse(x, w, h) {
    x.strokeStyle = 'rgba(235,185,35,.9)'; x.lineWidth = 5; x.strokeRect(8, 8, w - 16, h - 16);
    x.setLineDash([14, 12]); x.strokeStyle = 'rgba(235,185,35,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 14); x.lineTo(64, 114); x.stroke(); x.setLineDash([]);
  },
  generator(x, w, h) {
    x.save(); x.beginPath(); x.rect(0, 0, w, h); x.rect(14, 14, w - 28, h - 28); x.clip('evenodd');
    x.fillStyle = 'rgba(240,190,30,.88)'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(20,20,20,.9)'; x.lineWidth = 9;
    for (let i = -h; i < w + h; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); }
    x.restore();
  },
  server(x, w, h) { x.strokeStyle = 'rgba(110,190,255,.6)'; x.lineWidth = 3; x.strokeRect(2, 2, w - 4, h - 4); },
  armory(x, w, h) { x.strokeStyle = 'rgba(190,210,110,.55)'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12); },
  vault(x, w, h) { for (const r of [56, 42, 28]) { x.strokeStyle = 'rgba(255,200,80,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, r, 0, 7); x.stroke(); } }
};
const zoneMarkMats = {};
export function zoneMarkMat(type) {
  if (!MARK[type]) return null;
  if (zoneMarkMats[type]) return zoneMarkMats[type];
  const t = mkTex(128, 128, MARK[type], false);
  return (zoneMarkMats[type] = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: 0.7 }));
}

/* ---------- Текстуры реквизита ---------- */
export const TEX = {};
const L = (k, f) => Object.defineProperty(TEX, k, { get() { const v = f(); Object.defineProperty(TEX, k, { value: v }); return v; }, configurable: true });
L('wood', () => mkTex(256, 256, (x, w, h) => { planks(x, w, h, 5, [128, 92, 58], 12); speckle(x, w, h, 2500, 0.07); }));
L('darkWood', () => mkTex(256, 256, (x, w, h) => { planks(x, w, h, 4, [78, 56, 38], 10); speckle(x, w, h, 2500, 0.08); }));
L('crate', () => mkTex(256, 256, (x, w, h) => {
  planks(x, w, h, 6, [118, 90, 58], 14, false);
  x.fillStyle = 'rgba(40,28,16,.85)'; x.fillRect(0, 0, 22, h); x.fillRect(w - 22, 0, 22, h);
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(22, 20); x.lineTo(w - 22, h - 20); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.6)'; for (const y of [20, h - 20]) for (const xx of [11, w - 11]) { x.beginPath(); x.arc(xx, y, 3, 0, TAU); x.fill(); }
  speckle(x, w, h, 3000, 0.1);
}));
L('metal', () => mkTex(128, 128, (x, w, h) => {
  x.fillStyle = '#c4c8c8'; x.fillRect(0, 0, w, h); speckle(x, w, h, 2500, 0.12);
  x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = 1; for (let i = 0; i < h; i += 3) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 12; i++) { const sx = Math.random() * w, sy = Math.random() * h; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + rnd(-30, 30), sy + rnd(-8, 8)); x.stroke(); }
  stains(x, w, h, 3, '90,50,20', 0.22, 8, 20);
}));
L('ammoCrate', () => mkTex(256, 128, (x, w, h) => {
  x.fillStyle = '#3f4a30'; x.fillRect(0, 0, w, h); speckle(x, w, h, 3500, 0.14);
  x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = '#e8d77a'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('9 MM', w / 2, 56); x.font = 'bold 18px sans-serif'; x.fillText('БОЕПРИПАСЫ', w / 2, 88);
  x.fillRect(24, 100, w - 48, 4);
}));
L('blanket', () => mkTex(256, 256, (x, w, h) => {
  x.fillStyle = '#566240'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < h; i += 32) { x.fillStyle = i % 64 ? '#3f4a2e' : '#7c7a4c'; x.fillRect(0, i, w, 8); }
  speckle(x, w, h, 5000, 0.18);
}));
L('blanket2', () => mkTex(256, 256, (x, w, h) => {
  x.fillStyle = '#6b3a32'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < h; i += 32) { x.fillStyle = i % 64 ? '#4e2a24' : '#b9a27a'; x.fillRect(0, i, w, 6); }
  for (let i = 0; i < w; i += 32) { x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(i, 0, 6, h); }
  speckle(x, w, h, 5000, 0.18);
}));
L('sheet', () => mkTex(128, 128, (x, w, h) => {
  x.fillStyle = '#b8bcc0'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 16) { x.fillStyle = 'rgba(70,90,120,.35)'; x.fillRect(i, 0, 5, h); }
  speckle(x, w, h, 2000, 0.12);
}));
L('paper', () => mkTex(512, 340, (x, w, h) => {
  x.fillStyle = '#d8ccaa'; x.fillRect(0, 0, w, h); speckle(x, w, h, 6000, 0.12);
  x.strokeStyle = 'rgba(60,50,30,.16)'; x.lineWidth = 1;
  for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  for (let i = 0; i < h; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
  x.strokeStyle = '#2d2a22'; x.lineWidth = 4; x.lineCap = 'round';
  const nodes = [];
  for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 4; gy++) nodes.push([70 + gx * 74 + rnd(-10, 10), 62 + gy * 72 + rnd(-8, 8)]);
  for (let i = 0; i < nodes.length; i++) {
    const gx = Math.floor(i / 4), gy = i % 4;
    if (gy < 3 && Math.random() < 0.8) { x.beginPath(); x.moveTo(...nodes[i]); x.lineTo(...nodes[i + 1]); x.stroke(); }
    if (gx < 5 && Math.random() < 0.7) { x.beginPath(); x.moveTo(...nodes[i]); x.lineTo(...nodes[i + 4]); x.stroke(); }
  }
  x.fillStyle = '#2d2a22'; for (const n of nodes) x.fillRect(n[0] - 6, n[1] - 6, 12, 12);
  x.strokeStyle = '#c0392b'; for (let i = 0; i < 7; i++) { const n = nodes[(Math.random() * nodes.length) | 0]; x.beginPath(); x.moveTo(n[0] - 12, n[1] - 12); x.lineTo(n[0] + 12, n[1] + 12); x.moveTo(n[0] + 12, n[1] - 12); x.lineTo(n[0] - 12, n[1] + 12); x.stroke(); }
  x.fillStyle = '#2f9e5d'; x.beginPath(); x.arc(nodes[0][0], nodes[0][1], 13, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.fillText('17', nodes[0][0], nodes[0][1] + 5);
  x.fillStyle = '#2d2a22'; x.font = 'bold 22px sans-serif'; x.textAlign = 'left'; x.fillText('СЕТЬ БУНКЕРОВ', 16, 30);
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 6; x.strokeRect(0, 0, w, h);
}, false));
L('kids', () => mkTex(256, 256, (x, w, h) => {
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
}, false));
L('hazard', () => mkTex(256, 64, (x, w, h) => {
  x.fillStyle = '#d9a920'; x.fillRect(0, 0, w, h); x.fillStyle = '#17140f';
  for (let i = -h; i < w + h; i += 40) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + 20, h); x.lineTo(i + 20 + h, 0); x.lineTo(i + h, 0); x.closePath(); x.fill(); }
  speckle(x, w, h, 900, 0.2);
}));
L('crossMed', () => mkTex(64, 64, (x) => { x.fillStyle = '#e9ece8'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#c0392b'; x.fillRect(24, 10, 16, 44); x.fillRect(10, 24, 44, 16); }, false));
L('clock', () => mkTex(128, 128, (x) => {
  x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(64, 64, 62, 0, TAU); x.fill();
  x.fillStyle = '#ece6d2'; x.beginPath(); x.arc(64, 64, 56, 0, TAU); x.fill(); x.fillStyle = '#222';
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; x.fillRect(64 + Math.sin(a) * 46 - 2, 64 - Math.cos(a) * 46 - 2, 4, i % 3 ? 4 : 8); }
  x.strokeStyle = '#111'; x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.sin(2.1) * 28, 64 - Math.cos(2.1) * 28); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.sin(5.3) * 42, 64 - Math.cos(5.3) * 42); x.stroke();
}, false));
L('warn', () => mkTex(128, 128, (x, w, h) => {
  x.fillStyle = '#1b1b16'; x.fillRect(0, 0, w, h); x.fillStyle = '#e6b422'; x.beginPath(); x.moveTo(64, 8); x.lineTo(122, 112); x.lineTo(6, 112); x.closePath(); x.fill();
  x.strokeStyle = '#17140f'; x.lineWidth = 8; x.lineJoin = 'round'; x.stroke();
  x.fillStyle = '#17140f'; x.fillRect(58, 42, 12, 38); x.beginPath(); x.arc(64, 92, 7, 0, TAU); x.fill();
}, false));
L('screen', () => mkTex(256, 160, (x, w, h) => {
  x.fillStyle = '#04140c'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#3dff8a'; x.font = 'bold 13px monospace';
  const lines = ['> СИСТЕМА ЖИЗНЕОБЕСПЕЧЕНИЯ', '> ШЛЮЗ 17: ЗАКРЫТ', '> СЕКТОР Б: НЕТ СВЯЗИ', '> ПИТАНИЕ: РЕЗЕРВ 41%', '> ЗАРАЖЕНИЕ: ВОДА ВТ.КОНТ.', '> ВЫЖИВШИХ: ???', '> ПОВТОРИТЬ ЗАПРОС? _'];
  lines.forEach((l, i) => x.fillText(l, 10, 22 + i * 19));
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
}, false));
L('ecg', () => mkTex(128, 80, (x, w, h) => {
  x.fillStyle = '#031208'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#4aff8a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 44);
  for (let i = 0; i < 3; i++) { const o = i * 42; x.lineTo(o + 10, 44); x.lineTo(o + 14, 40); x.lineTo(o + 18, 44); x.lineTo(o + 22, 44); x.lineTo(o + 25, 14); x.lineTo(o + 29, 62); x.lineTo(o + 32, 44); x.lineTo(o + 42, 44); }
  x.stroke();
  x.fillStyle = '#4aff8a'; x.font = 'bold 12px monospace'; x.fillText('HR 71', 6, 14);
}, false));
L('menu', () => mkTex(256, 160, (x, w, h) => {
  x.fillStyle = '#233a2e'; x.fillRect(0, 0, w, h); speckle(x, w, h, 2500, 0.1);
  x.strokeStyle = '#7a5a34'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = '#efe9d4'; x.textAlign = 'center'; x.font = 'bold 26px sans-serif'; x.fillText('МЕНЮ', w / 2, 40);
  x.font = '16px sans-serif'; x.textAlign = 'left';
  ['Гречка с тушёнкой', 'Сухари ....... 2', 'Компот ........ 1', 'Суп из банки'].forEach((l, i) => x.fillText(l, 22, 70 + i * 26));
}, false));
L('chart', () => mkTex(256, 160, (x, w, h) => {
  x.fillStyle = '#e9ecea'; x.fillRect(0, 0, w, h); speckle(x, w, h, 1500, 0.08);
  x.strokeStyle = '#2f6f78'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12);
  x.fillStyle = '#2f6f78'; x.font = 'bold 16px sans-serif'; x.fillText('ТЕМПЕРАТУРА / ДЕНЬ', 16, 28);
  x.beginPath(); x.moveTo(16, 120);
  for (let i = 0; i < 10; i++) x.lineTo(16 + i * 24, 110 - Math.pow(i, 1.4) * 4 + rnd(-8, 8));
  x.stroke();
  x.strokeStyle = '#c0392b'; x.beginPath(); x.moveTo(16, 60); x.lineTo(w - 16, 60); x.stroke();
}, false));
L('notice', () => mkTex(256, 160, (x, w, h) => {
  x.fillStyle = '#7a5a38'; x.fillRect(0, 0, w, h); speckle(x, w, h, 6000, 0.14);
  x.strokeStyle = '#3a2814'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
  for (let i = 0; i < 5; i++) {
    const px = 18 + i * 46 + rnd(-4, 4), py = 18 + rnd(0, 40), ww = 36, hh = 48 + rnd(0, 30);
    x.save(); x.translate(px + ww / 2, py + hh / 2); x.rotate(rnd(-0.1, 0.1));
    x.fillStyle = ['#efe6cf', '#e0d7a8', '#d6e0e0'][i % 3]; x.fillRect(-ww / 2, -hh / 2, ww, hh);
    x.fillStyle = 'rgba(40,30,20,.55)'; for (let l = 0; l < 5; l++) x.fillRect(-ww / 2 + 4, -hh / 2 + 10 + l * 7, ww - 8 - rnd(0, 10), 2);
    x.fillStyle = '#b02a2a'; x.beginPath(); x.arc(0, -hh / 2 + 4, 2.5, 0, TAU); x.fill(); x.restore();
  }
}, false));
L('peg', () => mkTex(512, 200, (x, w, h) => {
  x.fillStyle = '#5a4630'; x.fillRect(0, 0, w, h); speckle(x, w, h, 7000, 0.1);
  x.fillStyle = 'rgba(0,0,0,.55)';
  for (let i = 14; i < w; i += 28) for (let j = 14; j < h; j += 28) { x.beginPath(); x.arc(i, j, 2.4, 0, TAU); x.fill(); }
  x.strokeStyle = 'rgba(235,225,200,.8)'; x.lineWidth = 4; x.lineCap = 'round';
  x.beginPath(); x.moveTo(60, 30); x.lineTo(60, 150); x.stroke(); x.strokeRect(40, 22, 40, 18);
  for (let i = 0; i < 4; i++) { const px = 130 + i * 36; x.beginPath(); x.moveTo(px, 30); x.lineTo(px, 120 - i * 10); x.stroke(); x.beginPath(); x.arc(px, 134 - i * 10, 12 - i, 0, TAU); x.stroke(); }
  x.beginPath(); x.moveTo(300, 40); x.lineTo(400, 40); x.lineTo(400, 62); x.lineTo(300, 100); x.closePath(); x.stroke();
  x.beginPath(); x.arc(450, 70, 28, 0, TAU); x.stroke();
}, false));
