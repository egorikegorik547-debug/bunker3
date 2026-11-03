// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEX, signTex, zoneSignMat } from './bunkerTextures';
import { ZONES } from './data';

/* ============================================================
   Реквизит, настенный декор, светильники и шлюз сети бункеров.
   Локальные координаты: z=0 — поверхность стены, z>0 — внутрь комнаты.
   ============================================================ */

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- Материалы (кэш → потом склеиваются) ---------- */
const mc = {};
export const S = (c, r = 0.8, m = 0.1) => mc[`s${c}_${r}_${m}`] || (mc[`s${c}_${r}_${m}`] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
export const B = c => mc['b' + c] || (mc['b' + c] = new THREE.MeshBasicMaterial({ color: c }));
export const TM = (map, r = 0.85, m = 0.05, tint = 0xffffff) => {
  const k = `t${map.uuid}_${r}_${m}_${tint}`;
  return mc[k] || (mc[k] = new THREE.MeshStandardMaterial({ map, roughness: r, metalness: m, color: tint }));
};
const GL = (c, o = 0.4) => mc[`g${c}_${o}`] || (mc[`g${c}_${o}`] = new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: o, roughness: 0.1, metalness: 0.1 }));
const EM = (c, col, i = 0.9) => mc[`e${c}_${col}_${i}`] || (mc[`e${c}_${col}_${i}`] = new THREE.MeshStandardMaterial({ color: c, emissive: col, emissiveIntensity: i, roughness: 0.6 }));

/* ---------- Примитивы ---------- */
const mb = (g, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
const cyl = (g, rt, rb, h, mat, x, y, z, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
const cylX = (g, r, len, mat, x, y, z) => { const m = cyl(g, r, r, len, mat, x, y, z); m.rotation.z = Math.PI / 2; return m; };
const cylZ = (g, r, len, mat, x, y, z) => { const m = cyl(g, r, r, len, mat, x, y, z); m.rotation.x = Math.PI / 2; return m; };
const sph = (g, r, mat, x, y, z, ws = 14, hs = 10) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); m.position.set(x, y, z); g.add(m); return m; };
const pl = (g, w, h, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); g.add(m); return m; };
const tor = (g, r, t, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 20), mat); m.position.set(x, y, z); g.add(m); return m; };

const steel = () => S(0x5d646a, 0.5, 0.7), dsteel = () => S(0x2c3034, 0.6, 0.6);

function chair(g, x, z, ry) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  const wood = TM(TEX.wood, 0.8), dw = TM(TEX.darkWood, 0.85);
  mb(c, 0.46, 0.05, 0.46, wood, 0, 0.46, 0); mb(c, 0.46, 0.44, 0.04, wood, 0, 0.72, -0.21);
  for (const [dx, dz] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) mb(c, 0.04, 0.44, 0.04, dw, dx, 0.22, dz);
  mb(c, 0.4, 0.03, 0.4, S(pick([0x7a2e2a, 0x2e4a6a, 0x4a5a2e]), 1, 0), 0, 0.5, 0);
}
function plant(g, x, z, s = 1) {
  cyl(g, 0.12 * s, 0.09 * s, 0.2 * s, S(0x9a5a3a, 0.9, 0), x, 0.1 * s, z);
  cyl(g, 0.11 * s, 0.11 * s, 0.02, S(0x2a1a0e, 1, 0), x, 0.2 * s, z);
  for (let i = 0; i < 9; i++) {
    const lf = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.5 * s, 6), S(pick([0x3f8a3a, 0x4a9a44, 0x2f7a34]), 0.7, 0));
    lf.position.set(x + Math.sin(i * 0.7) * 0.08 * s, 0.45 * s, z + Math.cos(i * 0.7) * 0.08 * s);
    lf.rotation.set(Math.cos(i * 0.7) * 0.6, 0, -Math.sin(i * 0.7) * 0.6); g.add(lf);
  }
}
function mug(g, x, y, z, c) { cyl(g, 0.045, 0.04, 0.09, S(c, 0.4, 0.1), x, y + 0.045, z); cyl(g, 0.038, 0.038, 0.005, S(0x2a1608, 0.2), x, y + 0.09, z); }
function can(g, x, y, z, c) { cyl(g, 0.045, 0.045, 0.11, S(c, 0.45, 0.5), x, y + 0.055, z, 12); }

/* ---------- Мебель и оборудование ---------- */
export const PROPS = {
  bunk(g) {
    const fr = S(0x3b3f44, 0.55, 0.7), matt = TM(TEX.sheet, 0.95, 0);
    for (const sx of [-0.97, 0.97]) for (const sz of [0.06, 0.84]) mb(g, 0.07, 1.95, 0.07, fr, sx, 0.975, sz);
    [[0.45, TM(TEX.blanket, 1, 0)], [1.4, TM(TEX.blanket2, 1, 0)]].forEach(([y, bl]) => {
      mb(g, 1.94, 0.06, 0.82, fr, 0, y - 0.06, 0.45);
      mb(g, 1.86, 0.12, 0.76, matt, 0, y, 0.45);
      const pil = sph(g, 0.24, S(0xcfc7b4, 1, 0), -0.68, y + 0.1, 0.45); pil.scale.set(1.1, 0.42, 0.8);
      mb(g, 1.1, 0.07, 0.78, bl, 0.35, y + 0.08, 0.45);
    });
    mb(g, 1.9, 0.05, 0.04, fr, 0, 1.78, 0.87);
    for (const lx of [0.4, 0.7]) mb(g, 0.05, 1.45, 0.05, fr, lx, 0.78, 0.9);
    for (let k = 0; k < 5; k++) mb(g, 0.3, 0.04, 0.04, fr, 0.55, 0.3 + k * 0.28, 0.9);
    if (Math.random() < 0.4) { // мишка на нижней койке
      const b = new THREE.Group(); b.position.set(0.7, 0.58, 0.6); b.rotation.y = rnd(-1, 1); g.add(b);
      const fur = S(0x9a6b3d, 1, 0); sph(b, 0.09, fur, 0, 0.05, 0); sph(b, 0.065, fur, 0, 0.17, 0); sph(b, 0.025, fur, -0.05, 0.23, 0); sph(b, 0.025, fur, 0.05, 0.23, 0);
    }
    return { w: 2.0, d: 0.95 };
  },
  table(g) {
    const wood = TM(TEX.wood, 0.8), dw = TM(TEX.darkWood, 0.85);
    mb(g, 1.8, 0.06, 0.9, wood, 0, 0.77, 0.5); mb(g, 1.7, 0.1, 0.8, dw, 0, 0.69, 0.5);
    for (const sx of [-0.8, 0.8]) for (const sz of [0.15, 0.85]) mb(g, 0.07, 0.72, 0.07, dw, sx, 0.36, sz);
    chair(g, -0.45, 1.4, Math.PI); chair(g, 0.5, 1.45, Math.PI - 0.2);
    if (Math.random() < 0.7) mug(g, rnd(-0.6, 0.6), 0.8, 0.4, pick([0xe8e4d8, 0x4b78a8, 0xa84b4b]));
    if (Math.random() < 0.5) can(g, rnd(-0.6, 0.6), 0.8, 0.7, pick([0xb54b2a, 0x7a8f3a, 0xc79a2a]));
    if (Math.random() < 0.4) pl(g, 0.5, 0.34, TM(TEX.paper, 0.9, 0), rnd(-0.3, 0.3), 0.802, 0.5, rnd(-0.5, 0.5), -Math.PI / 2);
    if (Math.random() < 0.35) { cyl(g, 0.012, 0.012, 0.1, S(0xe8dcc0, 0.8, 0), 0.5, 0.85, 0.45); sph(g, 0.012, B(0xffc060), 0.5, 0.91, 0.45, 6, 4); }
    return { w: 1.8, d: 1.7 };
  },
  barrel(g) {
    const c = pick([0x5a2f22, 0x2d4a52, 0x4a4a2a, 0x375a78, 0x3a3a3a]);
    cyl(g, 0.3, 0.3, 0.9, S(c, 0.55, 0.5), 0, 0.45, 0.38, 18);
    for (const y of [0.22, 0.45, 0.68]) cyl(g, 0.31, 0.31, 0.035, S(0x222222, 0.5, 0.6), 0, y, 0.38, 18);
    cyl(g, 0.27, 0.27, 0.02, S(0x1c1c1c, 0.6, 0.5), 0, 0.91, 0.38, 18);
    if (Math.random() < 0.6) pl(g, 0.26, 0.26, TM(TEX.warn, 0.7, 0), 0, 0.5, 0.685);
    return { w: 0.7, d: 0.7 };
  },
  cables(g) {
    mb(g, 2.3, 0.05, 0.28, S(0x303338, 0.6, 0.6), 0, 0.1, 0.16);
    for (let k = 0; k < 5; k++) cylX(g, 0.04, 2.2, S(pick([0x1c1c1c, 0x5a1e1e, 0x1e3a5a, 0x4a4a1e, 0x1e4a2e]), 0.8, 0.1), 0, 0.15 + (k % 3) * 0.05, 0.08 + k * 0.045);
    mb(g, 0.05, 0.3, 0.05, steel(), -1.1, 0.15, 0.3); mb(g, 0.05, 0.3, 0.05, steel(), 1.1, 0.15, 0.3);
    mb(g, 0.4, 0.32, 0.12, S(0x4a5258, 0.5, 0.6), 0.6, 0.45, 0.07); sph(g, 0.02, B(0x40ff80), 0.6, 0.55, 0.14, 6, 4);
    return { w: 2.3, d: 0.3, noCol: false };
  },
  bed(g) {
    const fr = S(0x8a9298, 0.5, 0.6);
    for (const sx of [-0.9, 0.9]) for (const sz of [0.1, 0.9]) mb(g, 0.05, 0.32, 0.05, fr, sx, 0.16, sz);
    mb(g, 1.9, 0.06, 0.85, fr, 0, 0.34, 0.5);
    mb(g, 1.8, 0.14, 0.8, TM(TEX.sheet, 0.9, 0, 0xffffff), 0, 0.44, 0.5);
    const pil = sph(g, 0.24, S(0xeef2f2, 0.9, 0), -0.65, 0.58, 0.5); pil.scale.set(1.1, 0.4, 0.9);
    mb(g, 1.0, 0.06, 0.82, S(Math.random() < 0.5 ? 0x9ab6c0 : 0x9a4a4a, 0.9, 0), 0.45, 0.53, 0.5);
    if (Math.random() < 0.5) mb(g, 0.5, 0.01, 0.4, S(0x5a0a0a, 0.5, 0), 0.2, 0.565, 0.5);
    mb(g, 0.06, 0.6, 0.85, fr, 0.95, 0.6, 0.5);
    // монитор на стойке
    cyl(g, 0.015, 0.015, 1.3, steel(), -1.1, 0.65, 0.3); cyl(g, 0.2, 0.22, 0.03, dsteel(), -1.1, 0.02, 0.3);
    mb(g, 0.36, 0.26, 0.08, S(0x1d2124, 0.5, 0.4), -1.1, 1.3, 0.3);
    pl(g, 0.3, 0.19, new THREE.MeshBasicMaterial({ map: TEX.ecg }), -1.1, 1.3, 0.345);
    return { w: 2.4, d: 1.0 };
  },
  iv(g) {
    cyl(g, 0.02, 0.02, 1.8, S(0xb8c0c4, 0.3, 0.8), 0, 0.9, 0.3);
    cyl(g, 0.22, 0.24, 0.04, S(0x6a7075, 0.4, 0.7), 0, 0.02, 0.3);
    for (const a of [0, 2.1, 4.2]) sph(g, 0.03, dsteel(), Math.sin(a) * 0.2, 0.03, 0.3 + Math.cos(a) * 0.2, 8, 6);
    mb(g, 0.04, 0.04, 0.3, steel(), 0, 1.78, 0.3); 
    mb(g, 0.14, 0.22, 0.04, GL(0xaad8e8, 0.7), 0.08, 1.66, 0.3); mb(g, 0.14, 0.12, 0.035, S(0xc8e8f0, 0.3, 0), 0.08, 1.62, 0.3);
    cyl(g, 0.006, 0.006, 0.9, S(0xaad8e8, 0.3, 0), 0.08, 1.15, 0.3, 5);
    return { w: 0.5, d: 0.5 };
  },
  shelf(g) {
    const fr = S(0x44494e, 0.6, 0.6), wood = TM(TEX.wood, 0.85);
    for (const sx of [-1.08, 1.08]) for (const sz of [0.04, 0.56]) mb(g, 0.05, 2.1, 0.05, fr, sx, 1.05, sz);
    mb(g, 2.2, 0.8, 0.02, S(0x2a2d30, 0.8, 0.3), 0, 1.0, 0.01);
    for (const y of [0.3, 0.8, 1.3, 1.8]) {
      mb(g, 2.2, 0.04, 0.6, wood, 0, y, 0.3);
      let x = -1.0;
      while (x < 0.9) {
        const r = Math.random();
        if (r < 0.35) { const w = rnd(0.25, 0.55), h = rnd(0.2, 0.4); mb(g, w, h, rnd(0.3, 0.45), TM(TEX.crate, 0.9, 0), x + w / 2, y + 0.02 + h / 2, 0.3); x += w + 0.05; }
        else if (r < 0.55) { for (let k = 0; k < 3; k++) can(g, x + 0.06 + k * 0.1, y + 0.02, 0.2 + (k % 2) * 0.12, pick([0xb54b2a, 0x7a8f3a, 0xa8a8a0, 0xc79a2a])); x += 0.38; }
        else if (r < 0.7) { const w = rnd(0.3, 0.5), h = rnd(0.2, 0.32); mb(g, w, h, 0.35, TM(TEX.ammoCrate, 0.7, 0.1), x + w / 2, y + 0.02 + h / 2, 0.3); x += w + 0.05; }
        else if (r < 0.8) { mb(g, 0.3, 0.26, 0.3, S(pick([0x8a6b45, 0x6b5436, 0x59606b]), 0.9, 0), x + 0.15, y + 0.15, 0.3); x += 0.35; }
        else x += 0.3;
      }
    }
    return { w: 2.2, d: 0.62 };
  },
  crates(g) {
    const wd = TM(TEX.crate, 0.85, 0), dk = S(0x2e2216, 0.8, 0);
    mb(g, 1.2, 0.9, 0.9, wd, -0.1, 0.45, 0.5).rotation.y = 0.04;
    mb(g, 0.8, 0.7, 0.7, TM(TEX.crate, 0.85, 0, 0xd8d0c0), 0.45, 1.25, 0.45).rotation.y = -0.1;
    mb(g, 0.7, 0.6, 0.6, TM(TEX.ammoCrate, 0.7, 0.1), 0.55, 0.3, 1.0);
    mb(g, 0.4, 0.3, 0.4, wd, -0.7, 1.05, 0.4);
    mb(g, 1.24, 0.05, 0.94, dk, -0.1, 0.02, 0.5);
    return { w: 1.5, d: 1.3 };
  },
  rack(g) {
    const body = S(0x1d2024, 0.5, 0.7);
    for (const sx of [-0.45, 0.45]) {
      mb(g, 0.8, 2.1, 0.9, body, sx, 1.05, 0.45);
      mb(g, 0.74, 1.95, 0.02, S(0x0e1012, 0.4, 0.6), sx, 1.05, 0.91);
      for (let k = 0; k < 11; k++) {
        mb(g, 0.52, 0.045, 0.012, S(0x30353a, 0.5, 0.6), sx, 0.25 + k * 0.16, 0.92);
        for (let l = 0; l < 4; l++) sph(g, 0.012, B(pick([0x40a0ff, 0x40ff80, 0x40ff80, 0xff5030, 0x40a0ff, 0x222222])), sx - 0.2 + l * 0.04 + rnd(0, 0.05), 0.25 + k * 0.16, 0.93, 6, 4);
      }
      mb(g, 0.6, 0.18, 0.012, S(0x0a0b0c), sx, 1.98, 0.92);
      mb(g, 0.5, 0.1, 0.02, EM(0x103060, 0x2a6cff, 0.8), sx, 1.98, 0.93);
    }
    mb(g, 1.8, 0.04, 0.4, dsteel(), 0, 2.12, 0.3);
    return { w: 1.7, d: 0.95 };
  },
  generator(g) {
    mb(g, 2.1, 0.2, 1.15, S(0x222426, 0.6, 0.7), 0, 0.1, 0.6);
    mb(g, 2.0, 1.1, 1.0, S(0x39503d, 0.5, 0.5), 0, 0.75, 0.6);
    cylX(g, 0.14, 1.2, S(0x6a6e72, 0.4, 0.8), -0.2, 1.43, 0.6);
    cyl(g, 0.12, 0.12, 0.8, S(0x2b2d2f, 0.5, 0.8), 0.7, 1.65, 0.5); cyl(g, 0.16, 0.16, 0.06, S(0x2b2d2f), 0.7, 2.05, 0.5);
    for (let k = 0; k < 6; k++) mb(g, 0.7, 0.03, 0.01, S(0x141414), -0.5, 0.5 + k * 0.1, 1.105);
    mb(g, 0.35, 0.3, 0.02, S(0x1c1c1c, 0.4, 0.5), 0.55, 0.95, 1.105);
    sph(g, 0.03, B(0xff8a30), 0.46, 1.0, 1.12, 8, 6); sph(g, 0.03, B(0x40ff80), 0.64, 1.0, 1.12, 8, 6);
    pl(g, 0.3, 0.18, TM(TEX.hazard, 0.7, 0), 0.55, 0.78, 1.112);
    cyl(g, 0.05, 0.05, 0.9, S(0x5b4636, 0.6, 0.5), -0.9, 1.5, 0.3); cyl(g, 0.05, 0.05, 0.9, S(0x5b4636, 0.6, 0.5), -0.75, 1.5, 0.3);
    cylZ(g, 0.12, 0.3, S(0xb8a050, 0.4, 0.7), -0.7, 0.6, 1.2);
    return { w: 2.1, d: 1.2 };
  },
  gunrack(g) {
    mb(g, 2.0, 1.2, 0.05, TM(TEX.darkWood, 0.9, 0), 0, 1.4, 0.03);
    for (let k = 0; k < 5; k++) {
      if (Math.random() < 0.2) continue;
      const x = -0.8 + k * 0.4;
      mb(g, 0.05, 1.05, 0.05, S(0x15171a, 0.4, 0.8), x, 1.45, 0.1); mb(g, 0.07, 0.34, 0.07, S(0x4a3a2a, 0.8, 0.1), x, 0.95, 0.1);
      mb(g, 0.04, 0.2, 0.04, S(0x15171a, 0.4, 0.8), x, 1.15, 0.14);
    }
    mb(g, 2.0, 0.06, 0.3, S(0x2b2f33, 0.6, 0.6), 0, 0.62, 0.15);
    mb(g, 2.0, 0.6, 0.34, TM(TEX.ammoCrate, 0.8, 0.2), 0, 0.3, 0.17);
    mb(g, 2.05, 0.04, 0.38, S(0x1e2418, 0.8, 0.3), 0, 0.62, 0.17);
    return { w: 2.0, d: 0.4 };
  },
  sofa(g) {
    const fab = S(pick([0x5a4a38, 0x3d4a5a, 0x4a5a3d]), 1, 0), dk = S(0x2a2218, 0.9, 0);
    mb(g, 2.0, 0.28, 0.9, fab, 0, 0.3, 0.5); mb(g, 2.0, 0.55, 0.22, fab, 0, 0.6, 0.12);
    for (const sx of [-0.95, 0.95]) mb(g, 0.12, 0.5, 0.9, fab, sx, 0.4, 0.5);
    for (const sx of [-0.45, 0.45]) { const c = mb(g, 0.84, 0.16, 0.7, fab, sx, 0.52, 0.55); c.rotation.x = -0.04; }
    for (const sx of [-0.9, 0.9]) for (const sz of [0.1, 0.9]) mb(g, 0.06, 0.1, 0.06, dk, sx, 0.05, sz);
    mb(g, 0.4, 0.34, 0.12, S(0xa04a3a, 1, 0), -0.6, 0.8, 0.25).rotation.set(-0.2, 0.2, 0.15);
    return { w: 2.1, d: 0.95 };
  },
  bookcase(g) {
    const wood = TM(TEX.darkWood, 0.85, 0);
    mb(g, 0.05, 2.1, 0.36, wood, -0.6, 1.05, 0.2); mb(g, 0.05, 2.1, 0.36, wood, 0.6, 1.05, 0.2); mb(g, 1.25, 2.1, 0.02, S(0x2a1e12), 0, 1.05, 0.02);
    for (const y of [0.05, 0.5, 0.95, 1.4, 1.85]) mb(g, 1.25, 0.04, 0.36, wood, 0, y, 0.2);
    for (const y of [0.07, 0.52, 0.97, 1.42]) {
      let x = -0.56;
      while (x < 0.5) { if (Math.random() < 0.2) { x += 0.15; continue; } const w = rnd(0.03, 0.06), h = rnd(0.24, 0.38); mb(g, w, h, 0.24, S(pick([0x7a2e2a, 0x2e4a6a, 0x4a5a2e, 0xa08a4a, 0x3a3a3a, 0x6a4a2a]), 0.9, 0), x + w / 2, y + h / 2, 0.2); x += w + 0.005; }
    }
    return { w: 1.3, d: 0.4 };
  },
  lockers(g) {
    for (let i = 0; i < 3; i++) {
      const x = -0.65 + i * 0.65, c = pick([0x3f5a4c, 0x4a5a6a, 0x5a5a4a]);
      mb(g, 0.62, 1.9, 0.5, S(c, 0.5, 0.6), x, 0.95, 0.27);
      mb(g, 0.01, 1.8, 0.01, S(0x0e1010), x + 0.31, 0.95, 0.53);
      for (let k = 0; k < 5; k++) mb(g, 0.4, 0.02, 0.01, S(0x0a0c0c), x, 1.6 + k * 0.04, 0.526);
      mb(g, 0.04, 0.14, 0.03, S(0xb8bec2, 0.3, 0.8), x + 0.2, 1.0, 0.54);
      if (Math.random() < 0.5) pl(g, 0.12, 0.08, TM(TEX.paper, 0.9, 0), x, 1.35, 0.531);
    }
    return { w: 1.95, d: 0.55 };
  },
  counter(g) {
    const st = S(0xb0b6ba, 0.35, 0.8);
    mb(g, 2.4, 0.86, 0.7, S(0x3d4a44, 0.6, 0.4), 0, 0.43, 0.45);
    mb(g, 2.44, 0.06, 0.76, st, 0, 0.89, 0.45);
    for (let k = 0; k < 4; k++) mb(g, 0.5, 0.5, 0.02, S(0x4a5a52, 0.5, 0.4), -0.9 + k * 0.6, 0.45, 0.81);
    cyl(g, 0.17, 0.15, 0.22, st, -0.7, 1.04, 0.45, 18); cyl(g, 0.16, 0.16, 0.02, S(0x222222), -0.7, 1.15, 0.45, 18);
    cyl(g, 0.2, 0.18, 0.28, S(0x7a8f3a, 0.4, 0.5), -0.1, 1.07, 0.45, 18);
    for (let k = 0; k < 3; k++) mb(g, 0.4, 0.015, 0.3, st, 0.6 + k * 0.01, 0.93 + k * 0.025, 0.4);
    mug(g, 1.0, 0.92, 0.6, 0xe8e4d8); mug(g, 1.08, 0.92, 0.35, 0xb54b2a);
    mb(g, 0.7, 0.05, 0.3, S(0x2c3034, 0.5, 0.6), 0, 1.6, 0.18);
    for (let k = 0; k < 4; k++) cyl(g, 0.012, 0.012, 0.3, steel(), -0.25 + k * 0.17, 1.45, 0.18, 6);
    return { w: 2.4, d: 0.85 };
  },
  desk(g) {
    const dw = TM(TEX.darkWood, 0.8, 0.05);
    mb(g, 1.6, 0.05, 0.75, dw, 0, 0.74, 0.42); for (const sx of [-0.75, 0.75]) mb(g, 0.05, 0.72, 0.7, S(0x2c3034, 0.6, 0.6), sx, 0.36, 0.42);
    mb(g, 1.45, 0.3, 0.02, S(0x2c3034, 0.6, 0.5), 0, 0.55, 0.1);
    for (const sx of [-0.4, 0.3]) {
      mb(g, 0.5, 0.34, 0.04, S(0x151719, 0.4, 0.5), sx, 1.0, 0.3);
      pl(g, 0.44, 0.28, new THREE.MeshBasicMaterial({ map: TEX.screen }), sx, 1.0, 0.322);
      cyl(g, 0.03, 0.05, 0.12, dsteel(), sx, 0.82, 0.3);
    }
    mb(g, 0.42, 0.015, 0.14, S(0x1c1f22, 0.5, 0.4), -0.1, 0.77, 0.6);
    chair(g, 0.1, 1.2, Math.PI);
    mb(g, 0.3, 0.2, 0.25, S(0x4a5258, 0.5, 0.6), 0.65, 0.84, 0.3); sph(g, 0.015, B(0x40ff80), 0.65, 0.9, 0.43, 6, 4);
    return { w: 1.7, d: 1.5 };
  },
  workbench(g) {
    const dw = TM(TEX.darkWood, 0.85, 0.05);
    pl(g, 2.0, 0.78, TM(TEX.peg, 0.9, 0), 0, 1.7, 0.012);
    mb(g, 2.2, 0.07, 0.75, dw, 0, 0.93, 0.4);
    for (const sx of [-1.05, 1.05]) for (const sz of [0.08, 0.72]) mb(g, 0.07, 0.9, 0.07, steel(), sx, 0.45, sz);
    mb(g, 2.1, 0.04, 0.65, dw, 0, 0.28, 0.4);
    mb(g, 0.2, 0.1, 0.2, S(0x2f3f4f, 0.5, 0.6), -0.8, 1.02, 0.4); mb(g, 0.2, 0.1, 0.06, S(0x2f3f4f, 0.5, 0.6), -0.8, 1.1, 0.32);
    mb(g, 0.5, 0.18, 0.3, S(0x8a2f22, 0.6, 0.3), 0.3, 1.07, 0.35); mb(g, 0.52, 0.02, 0.32, steel(), 0.3, 1.17, 0.35);
    mb(g, 0.34, 0.02, 0.04, steel(), -0.2, 0.975, 0.55).rotation.y = 0.3;
    cylX(g, 0.012, 0.3, S(0x7b4b26, 0.8, 0), 0.7, 0.98, 0.55);
    for (let i = 0; i < 3; i++) cyl(g, 0.025, 0.025, 0.1, S(i ? 0x2f6fb0 : 0xb08a2f, 0.4, 0.5), 0.85 + i * 0.07, 1.02, 0.6);
    mb(g, 0.5, 0.2, 0.4, TM(TEX.crate, 0.9, 0), -0.5, 0.4, 0.4); cyl(g, 0.1, 0.1, 0.2, S(0x335f7a, 0.6, 0.4), 0.5, 0.4, 0.4);
    const lamp = new THREE.Group(); lamp.position.set(0.9, 0.97, 0.15); g.add(lamp);
    cyl(lamp, 0.08, 0.1, 0.03, dsteel(), 0, 0.015, 0);
    cyl(lamp, 0.012, 0.012, 0.5, steel(), 0, 0.28, 0).rotation.z = -0.2;
    const hd = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xc4752c, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide })); hd.position.set(-0.1, 0.52, 0.02); hd.rotation.z = Math.PI + 0.1; lamp.add(hd);
    sph(lamp, 0.04, B(0xfff0cf), -0.1, 0.48, 0.02, 8, 6);
    return { w: 2.2, d: 0.8 };
  },
  pallet(g) {
    const wd = TM(TEX.wood, 0.9, 0), cb = S(0x8a6a44, 0.95, 0);
    for (let i = 0; i < 3; i++) mb(g, 1.2, 0.08, 0.12, wd, 0, 0.04, 0.2 + i * 0.35);
    for (let i = 0; i < 5; i++) mb(g, 0.1, 0.02, 1.0, wd, -0.5 + i * 0.25, 0.1, 0.55);
    for (let l = 0; l < 2; l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      if (l && Math.random() < 0.3) continue;
      const bx = mb(g, 0.55, 0.4, 0.45, Math.random() < 0.5 ? cb : TM(TEX.crate, 0.9, 0), -0.28 + i * 0.58, 0.31 + l * 0.41, 0.3 + j * 0.5); bx.rotation.y = rnd(-0.06, 0.06);
      mb(g, 0.56, 0.04, 0.12, S(0xd8c8a0, 0.9, 0), -0.28 + i * 0.58, 0.51 + l * 0.41, 0.3 + j * 0.5);
    }
    return { w: 1.3, d: 1.1 };
  },
  sink(g) {
    const wh = S(0xdfe5e5, 0.3, 0.1);
    mb(g, 1.3, 0.8, 0.5, S(0xc6cfcb, 0.5, 0.2), 0, 0.4, 0.28);
    mb(g, 1.34, 0.05, 0.54, wh, 0, 0.83, 0.28); mb(g, 0.5, 0.03, 0.36, S(0x9aa4a6, 0.2, 0.7), -0.25, 0.86, 0.3);
    cyl(g, 0.015, 0.015, 0.25, steel(), -0.25, 0.97, 0.08); mb(g, 0.015, 0.015, 0.14, steel(), -0.25, 1.09, 0.14);
    mb(g, 0.6, 0.8, 0.03, S(0xb8d4d8, 0.05, 0.9), 0, 1.5, 0.02); mb(g, 0.64, 0.84, 0.01, S(0x20282a, 0.5, 0.4), 0, 1.5, 0.012);
    mb(g, 0.01, 0.6, 0.01, S(0x1a1a1a), 0.32, 0.4, 0.54); 
    return { w: 1.4, d: 0.58 };
  },
  stove(g) {
    const st = S(0xa0a6aa, 0.35, 0.8);
    mb(g, 1.3, 0.88, 0.7, S(0x8a9094, 0.4, 0.7), 0, 0.44, 0.4); mb(g, 1.0, 0.45, 0.02, S(0x1a1c1e, 0.3, 0.5), 0, 0.4, 0.752);
    for (let i = 0; i < 4; i++) cyl(g, 0.12, 0.12, 0.015, S(0x1a1a1a, 0.6, 0.6), -0.3 + (i % 2) * 0.6, 0.9, 0.25 + Math.floor(i / 2) * 0.35);
    for (let i = 0; i < 4; i++) cylZ(g, 0.025, 0.04, S(0x222222), -0.45 + i * 0.3, 0.8, 0.77);
    cyl(g, 0.17, 0.17, 0.24, st, -0.3, 1.03, 0.25, 18); cyl(g, 0.12, 0.12, 0.12, st, 0.3, 0.98, 0.6, 18);
    mb(g, 1.3, 0.25, 0.7, S(0x6a7075, 0.4, 0.8), 0, 2.0, 0.4); mb(g, 0.4, 0.8, 0.4, S(0x6a7075, 0.4, 0.8), 0, 2.6, 0.2);
    return { w: 1.3, d: 0.75 };
  },
  plant(g) { plant(g, 0, 0.35, 1.2); return { w: 0.5, d: 0.5 }; },
  medcart(g) {
    const st = S(0xb8c0c4, 0.3, 0.8);
    mb(g, 0.7, 0.04, 0.45, st, 0, 0.86, 0.35); mb(g, 0.7, 0.04, 0.45, st, 0, 0.42, 0.35);
    for (const [x, z] of [[-0.33, 0.15], [0.33, 0.15], [-0.33, 0.55], [0.33, 0.55]]) { cyl(g, 0.012, 0.012, 0.85, st, x, 0.43, z, 6); sph(g, 0.04, dsteel(), x, 0.04, z, 8, 6); }
    mb(g, 0.3, 0.14, 0.2, TM(TEX.crossMed, 0.5, 0.1), -0.15, 0.95, 0.3); can(g, 0.2, 0.88, 0.3, 0xa8c8c0);
    mb(g, 0.4, 0.08, 0.24, S(0xcfd6d6, 0.4, 0.2), 0.05, 0.47, 0.35); 
    return { w: 0.8, d: 0.6 };
  }
};

/* ---------- Настенный декор (без коллизий, не заслоняет мебель) ---------- */
const frame = (g, w, h, y, tex, x = 0, tilt = 0) => {
  const f = mb(g, w + 0.06, h + 0.06, 0.03, S(0x20150d, 0.7, 0), x, y, 0.016); f.rotation.z = tilt;
  const p = pl(g, w, h, TM(tex, 0.8, 0), x, y, 0.034); p.rotation.z = tilt;
};
export const WALL_DECOR = {
  extinguisher(g) {
    cyl(g, 0.085, 0.085, 0.45, S(0xb02a22, 0.4, 0.4), 0, 0.85, 0.13, 14); sph(g, 0.085, S(0xb02a22, 0.4, 0.4), 0, 1.075, 0.13, 12, 6);
    cyl(g, 0.025, 0.025, 0.1, dsteel(), 0, 1.17, 0.13, 8); mb(g, 0.1, 0.03, 0.08, dsteel(), 0.04, 1.2, 0.13);
    mb(g, 0.04, 0.03, 0.16, S(0x15171a), 0, 0.98, 0.1); mb(g, 0.04, 0.03, 0.16, S(0x15171a), 0, 0.72, 0.1);
    cyl(g, 0.088, 0.088, 0.1, S(0xefe9d4, 0.8, 0), 0, 0.85, 0.13, 14);
    mb(g, 0.34, 0.34, 0.02, S(0xd02a22, 0.6, 0), 0, 1.7, 0.012); mb(g, 0.1, 0.24, 0.005, B(0xffffff), 0, 1.7, 0.024);
    return { w: 0.4 };
  },
  vent(g) {
    mb(g, 0.9, 0.55, 0.05, S(0x2c3034, 0.5, 0.6), 0, 2.3, 0.03);
    for (let k = 0; k < 7; k++) mb(g, 0.8, 0.025, 0.04, S(0x0c0d0e, 0.6, 0.4), 0, 2.1 + k * 0.065, 0.06).rotation.x = 0.4;
    for (const [x, y] of [[-0.4, 2.55], [0.4, 2.55], [-0.4, 2.05], [0.4, 2.05]]) cyl(g, 0.015, 0.015, 0.02, steel(), x, y, 0.06, 6).rotation.x = Math.PI / 2;
    return { w: 1.0 };
  },
  fusebox(g) {
    mb(g, 0.55, 0.75, 0.16, S(0x4a5258, 0.5, 0.6), 0, 1.6, 0.09); mb(g, 0.5, 0.7, 0.02, S(0x3a4046, 0.5, 0.6), 0, 1.6, 0.18);
    for (let k = 0; k < 4; k++) sph(g, 0.02, B(pick([0x40ff80, 0xff5030, 0xffc040, 0x40ff80])), -0.15 + k * 0.1, 1.85, 0.2, 6, 4);
    mb(g, 0.1, 0.18, 0.04, S(0xb02a22, 0.5, 0.4), 0, 1.5, 0.21);
    mb(g, 0.35, 0.18, 0.005, TM(TEX.warn, 0.7, 0), 0, 1.3, 0.19); 
    cyl(g, 0.03, 0.03, 1.1, S(0x6b4a34, 0.6, 0.5), 0, 2.75, 0.06, 8); cyl(g, 0.03, 0.03, 0.9, S(0x3c5a6b, 0.6, 0.5), 0.1, 0.45, 0.06, 8);
    return { w: 0.7 };
  },
  clock(g) {
    pl(g, 0.46, 0.46, new THREE.MeshStandardMaterial({ map: TEX.clock, roughness: 0.4, transparent: true }), 0, 2.4, 0.03);
    cyl(g, 0.24, 0.24, 0.03, dsteel(), 0, 2.4, 0.016, 20).rotation.x = Math.PI / 2;
    return { w: 0.5 };
  },
  kidsPoster(g) {
    for (let i = 0; i < 3; i++) frame(g, 0.4, 0.4, 1.6 + (i % 2) * 0.35, TEX.kids, (i - 1) * 0.55, rnd(-0.1, 0.1));
    return { w: 1.5 };
  },
  mapPoster(g) { frame(g, 1.1, 0.74, 1.8, TEX.paper); return { w: 1.2 }; },
  zoneSign(g, zone) {
    mb(g, 1.14, 0.34, 0.03, S(0x15171a), 0, 2.4, 0.016); pl(g, 1.1, 0.28, zoneSignMat(zone), 0, 2.4, 0.034);
    return { w: 1.2 };
  },
  crossSign(g) { mb(g, 0.55, 0.55, 0.03, S(0xd8dcd8, 0.5, 0), 0, 1.9, 0.016); pl(g, 0.5, 0.5, TM(TEX.crossMed, 0.5, 0), 0, 1.9, 0.034); return { w: 0.6 }; },
  noticeBoard(g) { mb(g, 1.1, 0.7, 0.03, S(0x3a2814), 0, 1.7, 0.016); pl(g, 1.04, 0.64, TM(TEX.notice, 0.9, 0), 0, 1.7, 0.034); return { w: 1.2 }; },
  menuBoard(g) { mb(g, 1.3, 0.84, 0.03, S(0x20150d), 0, 1.75, 0.016); pl(g, 1.24, 0.78, TM(TEX.menu, 0.9, 0), 0, 1.75, 0.034); return { w: 1.4 }; },
  medChart(g) { mb(g, 1.1, 0.7, 0.03, S(0x9aa4a6, 0.4, 0.4), 0, 1.75, 0.016); pl(g, 1.04, 0.64, TM(TEX.chart, 0.6, 0), 0, 1.75, 0.034); return { w: 1.2 }; },
  screen(g) {
    mb(g, 1.2, 0.8, 0.08, S(0x15171a, 0.4, 0.5), 0, 1.9, 0.05); pl(g, 1.12, 0.7, new THREE.MeshBasicMaterial({ map: TEX.screen }), 0, 1.9, 0.092);
    mb(g, 1.3, 0.04, 0.2, dsteel(), 0, 1.4, 0.1); sph(g, 0.02, B(0x40ff80), 0.55, 1.5, 0.092, 6, 4);
    return { w: 1.4 };
  },
  warningSign(g) {
    pl(g, 0.5, 0.5, TM(TEX.warn, 0.7, 0), 0, 1.9, 0.02); mb(g, 0.52, 0.52, 0.015, S(0x20201a), 0, 1.9, 0.008);
    return { w: 0.6 };
  },
  hazardBand(g) {
    const t = hazT(); pl(g, 2.8, 0.2, TM(t, 0.6, 0.1), 0, 0.9, 0.012);
    return { w: 2.9 };
  },
  pipeRun(g) {
    const cu = S(0x6b4a34, 0.6, 0.5), bl = S(0x3c5a6b, 0.5, 0.5), rd = S(0x8a2a22, 0.5, 0.5);
    cylX(g, 0.07, 5.0, cu, 0, 2.62, 0.14); cylX(g, 0.05, 5.0, bl, 0, 2.8, 0.12); cylX(g, 0.04, 5.0, rd, 0, 2.45, 0.11);
    for (const x of [-2.2, -0.8, 0.8, 2.2]) { mb(g, 0.06, 0.55, 0.03, dsteel(), x, 2.62, 0.04); }
    for (const x of [-1.5, 0, 1.5]) cylX(g, 0.09, 0.07, dsteel(), x, 2.62, 0.14);
    const vw = tor(g, 0.1, 0.014, S(0xa8201a, 0.4, 0.6), 0.3, 2.62, 0.25); cylZ(g, 0.015, 0.2, steel(), 0.3, 2.62, 0.2);
    return { w: 5.0 };
  },
  conduit(g) {
    const m = S(0x3c4a52, 0.5, 0.6);
    cyl(g, 0.045, 0.045, 3.4, m, 0, 1.7, 0.07, 10);
    for (const y of [0.3, 1.2, 2.1, 3.0]) mb(g, 0.12, 0.05, 0.05, dsteel(), 0, y, 0.05);
    mb(g, 0.22, 0.22, 0.12, dsteel(), 0, 1.5, 0.12); sph(g, 0.02, B(0xffc040), 0, 1.5, 0.19, 6, 4);
    return { w: 0.3 };
  },
  sconce(g) {
    mb(g, 0.16, 0.3, 0.1, dsteel(), 0, 2.0, 0.06); mb(g, 0.1, 0.22, 0.03, B(0xffd9a0), 0, 2.0, 0.12);
    return { w: 0.3 };
  },
  garland(g) {
    const cols = [0xffd27a, 0xff8a5a, 0x9be8ff, 0xffa8d0, 0xa8ff9b];
    for (let s = 0; s < 2; s++) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector3(-2.6 + s * 2.6 + u * 2.6, 2.85 - Math.sin(u * Math.PI) * 0.3, 0.05)); }
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x151515 })); ln.userData.keep = true; g.add(ln);
      for (let i = 1; i < 12; i++) sph(g, 0.035, B(cols[(i + s) % cols.length]), pts[i].x, pts[i].y - 0.04, 0.05, 8, 6);
    }
    return { w: 5.2 };
  },
  wallShelf(g) {
    mb(g, 1.0, 0.04, 0.22, TM(TEX.darkWood, 0.8, 0), 0, 1.55, 0.12);
    mb(g, 0.04, 0.14, 0.12, dsteel(), -0.4, 1.47, 0.07); mb(g, 0.04, 0.14, 0.12, dsteel(), 0.4, 1.47, 0.07);
    mb(g, 0.14, 0.18, 0.02, S(0x20150d), -0.3, 1.66, 0.1); pl(g, 0.1, 0.14, TM(TEX.kids, 0.6, 0), -0.3, 1.66, 0.112);
    cyl(g, 0.05, 0.04, 0.12, S(0x6b8f9a, 0.3, 0.1), 0.1, 1.63, 0.12); mug(g, 0.35, 1.57, 0.12, 0xb54b2a);
    return { w: 1.1 };
  }
};
export const ZONE_DECOR = {
  corridor: ['pipeRun', 'fusebox', 'vent', 'extinguisher', 'conduit', 'hazardBand', 'warningSign', 'zoneSign'],
  living: ['kidsPoster', 'clock', 'garland', 'wallShelf', 'mapPoster', 'sconce', 'kidsPoster'],
  medbay: ['crossSign', 'medChart', 'clock', 'vent', 'sconce', 'extinguisher', 'crossSign'],
  canteen: ['menuBoard', 'clock', 'wallShelf', 'vent', 'extinguisher', 'pipeRun', 'menuBoard'],
  warehouse: ['warningSign', 'hazardBand', 'pipeRun', 'fusebox', 'extinguisher', 'noticeBoard', 'conduit'],
  server: ['screen', 'vent', 'fusebox', 'conduit', 'warningSign', 'screen', 'pipeRun'],
  generator: ['pipeRun', 'warningSign', 'fusebox', 'conduit', 'hazardBand', 'vent', 'extinguisher', 'pipeRun'],
  armory: ['mapPoster', 'warningSign', 'noticeBoard', 'extinguisher', 'hazardBand', 'fusebox'],
  vault: ['warningSign', 'sconce', 'hazardBand', 'sconce'],
  airlock: []
};
let _hz = null;
function hazT() { if (!_hz) { _hz = TEX.hazard.clone(); _hz.needsUpdate = true; _hz.repeat.set(3, 1); } return _hz; }
let _hz2 = null;
function hazT2() { if (!_hz2) { _hz2 = TEX.hazard.clone(); _hz2.needsUpdate = true; _hz2.repeat.set(2, 1); } return _hz2; }

/* ---------- Цветные полосы зон вдоль стен ---------- */
const stripeMats = {};
const stripeMat = c => stripeMats[c] || (stripeMats[c] = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.55), emissive: new THREE.Color(c), emissiveIntensity: 0.28, roughness: 0.5, metalness: 0.3 }));
export function wallStripes(g, lv, CELL, T) {
  const N = lv.N, L = CELL - T;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = z * N + x; if (i === 0) continue;
    const mat = stripeMat(ZONES[lv.zone[i]].color), cx = (x + 0.5) * CELL, cz = (z + 0.5) * CELL;
    const y = 1.29, h = 0.07, d = 0.025;
    if (lv.H[z][x]) mb(g, L, h, d, mat, cx, y, z * CELL + T / 2 + d / 2);
    if (lv.H[z + 1][x]) mb(g, L, h, d, mat, cx, y, (z + 1) * CELL - T / 2 - d / 2);
    if (lv.V[z][x]) mb(g, d, h, L, mat, x * CELL + T / 2 + d / 2, y, cz);
    if (lv.V[z][x + 1]) mb(g, d, h, L, mat, (x + 1) * CELL - T / 2 - d / 2, y, cz);
  }
}

/* ---------- Светильники ---------- */
const KIND_BY_ZONE = { living: 'dome', canteen: 'dome', vault: 'dome', medbay: 'panel', server: 'panel', warehouse: 'cage', generator: 'cage', armory: 'tube', corridor: 'tube' };
export function addFixture(g, zone, red, x, z, H, color, mode) {
  const kind = red ? 'cage' : (KIND_BY_ZONE[zone] || 'tube'), dk = dsteel();
  const em = mode === 'dead' ? B(0x1b1c1e) : mode === 'bad' ? new THREE.MeshBasicMaterial({ color }) : B(color);
  let e, y = H - 0.55;
  if (kind === 'tube') {
    mb(g, 1.0, 0.08, 0.34, dk, x, H - 0.28, z); e = mb(g, 0.9, 0.03, 0.26, em, x, H - 0.34, z);
    mb(g, 0.06, 0.1, 0.36, dk, x - 0.5, H - 0.28, z); mb(g, 0.06, 0.1, 0.36, dk, x + 0.5, H - 0.28, z);
  } else if (kind === 'panel') {
    mb(g, 1.0, 0.08, 1.0, dk, x, H - 0.26, z); e = mb(g, 0.86, 0.02, 0.86, em, x, H - 0.31, z);
  } else if (kind === 'dome') {
    cyl(g, 0.012, 0.012, 0.5, dk, x, H - 0.25, z, 6); cyl(g, 0.1, 0.3, 0.2, S(0x3f5f4c, 0.45, 0.6), x, H - 0.62, z, 20); e = sph(g, 0.1, em, x, H - 0.74, z, 12, 8); y = H - 0.95;
  } else {
    mb(g, 0.6, 0.14, 0.6, dk, x, H - 0.3, z); e = mb(g, 0.46, 0.03, 0.46, em, x, H - 0.38, z);
    for (const sx of [-0.27, 0.27]) for (const sz of [-0.27, 0.27]) mb(g, 0.03, 0.2, 0.03, dk, x + sx, H - 0.42, z + sz);
    mb(g, 0.57, 0.025, 0.025, dk, x, H - 0.52, z - 0.27); mb(g, 0.57, 0.025, 0.025, dk, x, H - 0.52, z + 0.27);
    mb(g, 0.025, 0.025, 0.57, dk, x - 0.27, H - 0.52, z); mb(g, 0.025, 0.025, 0.57, dk, x + 0.27, H - 0.52, z);
    y = H - 0.65;
  }
  if (mode === 'bad') e.userData.keep = true;
  return { mesh: e, y };
}

/* ---------- Потолок: короба, кабельные лотки, спринклеры ---------- */
export function ceilingDecor(g, lv, CELL, H) {
  const N = lv.N, duct = TM(TEX.metal, 0.5, 0.6, 0x8a9096), dk = dsteel();
  for (let i = 1; i < N * N; i++) {
    const cx = (i % N + 0.5) * CELL, cz = (Math.floor(i / N) + 0.5) * CELL, r = Math.random(), alongX = Math.random() < 0.5, sg = Math.random() < 0.5 ? -1 : 1;
    const off = (r < 0.28 ? 1.95 : 1.3) * sg;
    const ax = alongX ? cx : cx + off, az = alongX ? cz + off : cz;
    if (r < 0.28) {
      mb(g, alongX ? CELL - 0.3 : 0.5, 0.38, alongX ? 0.5 : CELL - 0.3, duct, ax, H - 0.66, az);
      for (const t of [-1.6, 0, 1.6]) mb(g, alongX ? 0.08 : 0.58, 0.46, alongX ? 0.58 : 0.08, dk, alongX ? cx + t : ax, H - 0.66, alongX ? az : cz + t);
    } else if (r < 0.55) {
      mb(g, alongX ? CELL - 0.3 : 0.4, 0.04, alongX ? 0.4 : CELL - 0.3, dk, ax, H - 0.4, az);
      for (let k = 0; k < 4; k++) {
        const c = S(pick([0x1c1c1c, 0x5a1e1e, 0x1e3a5a, 0x4a4a1e, 0x1e4a2e]), 0.8, 0.1), o = -0.14 + k * 0.095;
        if (alongX) cylX(g, 0.025, CELL - 0.4, c, ax, H - 0.35, az + o); else cylZ(g, 0.025, CELL - 0.4, c, ax + o, H - 0.35, az);
      }
    }
    if (Math.random() < 0.25) { const sx = cx + rnd(-2, 2), sz = cz + rnd(-2, 2); cyl(g, 0.02, 0.02, 0.15, steel(), sx, H - 0.2, sz, 6); sph(g, 0.03, S(0xa02a22, 0.5, 0.3), sx, H - 0.3, sz, 8, 6); }
  }
}

/* ---------- Шлюз возврата в убежище (в стиле убежища) ---------- */
export function buildAirlockDoor(parent, CELL, T) {
  const g = new THREE.Group(); g.position.set(T / 2, 0, CELL / 2); g.rotation.y = Math.PI / 2; parent.add(g);
  const hz = TM(hazT2(), 0.6, 0.2), ds = dsteel(), st = steel(), gold = S(0xa8a090, 0.4, 0.7);
  mb(g, 2.1, 0.2, 0.3, hz, 0, 2.5, 0.15); mb(g, 0.2, 2.5, 0.3, hz, -1.0, 1.25, 0.15); mb(g, 0.2, 2.5, 0.3, hz, 1.0, 1.25, 0.15);
  mb(g, 1.8, 2.4, 0.14, S(0x4d5a52, 0.5, 0.65), 0, 1.2, 0.1);
  for (let i = 0; i < 3; i++) mb(g, 1.7, 0.05, 0.03, ds, 0, 0.5 + i * 0.7, 0.19);
  mb(g, 0.05, 2.35, 0.03, ds, 0, 1.2, 0.19);
  for (let i = 0; i < 12; i++) cylZ(g, 0.025, 0.03, st, -0.82 + (i % 6) * 0.328, i < 6 ? 2.28 : 0.14, 0.2);
  const wheel = new THREE.Group(); wheel.position.set(-0.35, 1.2, 0.25); g.add(wheel);
  tor(wheel, 0.22, 0.025, gold, 0, 0, 0);
  for (let i = 0; i < 4; i++) mb(wheel, 0.44, 0.03, 0.03, gold, 0, 0, 0).rotation.z = i * Math.PI / 4;
  cylZ(wheel, 0.05, 0.06, gold, 0, 0, 0);
  pl(g, 2.0, 0.5, new THREE.MeshBasicMaterial({ map: signTex }), 0, 2.95, 0.03);
  mb(g, 2.1, 0.55, 0.02, S(0x0a0f0c), 0, 2.95, 0.012);
  mb(g, 0.14, 0.14, 0.05, S(0x1a1a1a), 0.62, 1.55, 0.2);
  const lamp = sph(g, 0.045, new THREE.MeshBasicMaterial({ color: 0x4aff8a }), 0.62, 1.55, 0.24); lamp.userData.keep = true;
  mb(g, 2.1, 0.06, 0.06, B(0x4dff91), 0, 2.68, 0.33);
  pl(g, 2.4, 0.5, TM(hazT(), 0.7, 0), 0, 0.014, 0.95, 0, -Math.PI / 2);
  const light = new THREE.PointLight(0x55ff99, 24, 14, 2); light.position.set(0, 2.5, 1.6); g.add(light);
  return { lamp, light };
}

/* ---------- Материалы контейнеров ---------- */
export function containerMat(kind, color) {
  const k = 'c' + kind;
  if (mc[k]) return mc[k];
  if (kind === 'crate') return (mc[k] = TM(TEX.crate, 0.85, 0.05));
  if (kind === 'weapon') return (mc[k] = TM(TEX.ammoCrate, 0.7, 0.2));
  if (kind === 'vault') return (mc[k] = new THREE.MeshStandardMaterial({ map: TEX.metal, color, roughness: 0.35, metalness: 0.7 }));
  return (mc[k] = new THREE.MeshStandardMaterial({ map: TEX.metal, color, roughness: 0.5, metalness: 0.55 }));
}

/* ---------- Пыль в лучах ---------- */
export function createDust(parent) {
  const N = 260, R = 9;
  const g = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { p[i * 3] = rnd(-R, R); p[i * 3 + 1] = rnd(0.2, 3.2); p[i * 3 + 2] = rnd(-R, R); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe6bd, size: 0.028, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.frustumCulled = false; pts.userData.keep = true; parent.add(pts);
  return {
    update(t, cx, cz) {
      const a = g.attributes.position.array;
      for (let i = 0; i < N; i++) {
        a[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.0015 + 0.0006;
        a[i * 3] += Math.cos(t * 0.2 + i * 1.7) * 0.0012; a[i * 3 + 2] += Math.sin(t * 0.17 + i * 1.3) * 0.0012;
        if (a[i * 3 + 1] > 3.25) a[i * 3 + 1] = 0.2;
        while (a[i * 3] - cx > R) a[i * 3] -= 2 * R; while (a[i * 3] - cx < -R) a[i * 3] += 2 * R;
        while (a[i * 3 + 2] - cz > R) a[i * 3 + 2] -= 2 * R; while (a[i * 3 + 2] - cz < -R) a[i * 3 + 2] += 2 * R;
      }
      g.attributes.position.needsUpdate = true;
    },
    reset(cx, cz) { const a = g.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3] = cx + rnd(-R, R); a[i * 3 + 2] = cz + rnd(-R, R); } g.attributes.position.needsUpdate = true; }
  };
}

/* ---------- Склейка статики: сотни мелких мешей → десятки draw call'ов ---------- */
export function bakeStatic(root, chunk) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), victims = [];
  const walk = o => {
    if (o.userData.keep) return;
    if (o.isMesh && o.material && !Array.isArray(o.material) && o.geometry && o.geometry.index) {
      const mat = o.material, type = o.geometry.type;
      const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
      geo.clearGroups();
      geo.computeBoundingBox();
      const c = geo.boundingBox.getCenter(new THREE.Vector3());
      const cast = !mat.transparent && !mat.isMeshBasicMaterial && type !== 'PlaneGeometry';
      const key = `${mat.uuid}|${cast ? 1 : 0}|${Math.floor(c.x / chunk)}|${Math.floor(c.z / chunk)}`;
      let b = buckets.get(key); if (!b) buckets.set(key, b = { mat, cast, geos: [], meshes: [] });
      b.geos.push(geo); b.meshes.push(o);
    }
    for (const ch of o.children) walk(ch);
  };
  walk(root);
  for (const b of buckets.values()) {
    if (b.geos.length < 2) { b.geos.forEach(g => g.dispose()); b.meshes[0].castShadow = b.cast; b.meshes[0].receiveShadow = !!b.mat.isMeshStandardMaterial; continue; }
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach(g => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast; m.receiveShadow = !!b.mat.isMeshStandardMaterial;
    root.add(m);
    victims.push(...b.meshes);
  }
  for (const v of victims) { v.geometry.dispose(); if (v.parent) v.parent.remove(v); }
}
