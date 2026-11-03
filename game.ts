// @ts-nocheck
import * as THREE from 'three';
import './game.css';
import { createHubRoom } from './hubRoom';
import { NOTES, HUB_LINES, SECTORS, ITEMS, HEAL, STASH_KEYS, LABELS, CONT, ZONES, UPS, CRAFT } from './data';
import { TEX, wallTex, floorTex, ceilTex, bloodTex, zoneSignMat, zoneFloorMat, zoneMarkMat } from './bunkerTextures';
import { PROPS, WALL_DECOR, ZONE_DECOR, wallStripes, addFixture, ceilingDecor, buildAirlockDoor, containerMat, createDust, bakeStatic } from './bunkerProps';

export function startGame() {
/* ====================== УТИЛИТЫ ====================== */
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const show = (id, on = true) => $(id).classList.toggle('off', !on);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const turn = (cur, tgt, rate) => { const d = ((tgt - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return cur + clamp(d, -rate, rate); };

/* ====================== СОХРАНЕНИЕ ====================== */
const DEF_SAVE = { day: 1, food: 3, meds: 1, band: 2, scrap: 4, ammo: 16, batt: 1, up: { light: 0, hp: 0, stam: 0, boots: 0, bag: 0 }, notes: [], kills: 0, sorties: 0, deaths: 0 };
let save = loadSave();
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem('bunker-save-v1'));
    if (s) { const d = JSON.parse(JSON.stringify(DEF_SAVE)); Object.assign(d, s); d.up = Object.assign({}, DEF_SAVE.up, s.up || {}); return d; }
  } catch (e) {}
  return null;
}
function store() { try { localStorage.setItem('bunker-save-v1', JSON.stringify(save)); } catch (e) {} }

/* ====================== ИНВЕНТАРЬ: СПИСКИ СЛОТОВ ====================== */
// Список — плотный массив стеков {id, n, ref}. cap — число ячеек.
function addTo(list, cap, id, n, ref) {
  const max = ITEMS[id].max;
  if (max > 1) for (const s of list) {
    if (s.id === id && s.n < max) { const t = Math.min(max - s.n, n); s.n += t; n -= t; if (!n) return 0; }
  }
  while (n > 0 && list.length < cap) { const t = Math.min(max, n); list.push({ id, n: t, ref }); n -= t; }
  return n; // сколько не влезло
}
const countIn = (list, id) => list.reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
function removeFrom(list, id, n) {
  for (let i = list.length - 1; i >= 0 && n > 0; i--) {
    const s = list[i]; if (s.id !== id) continue;
    const t = Math.min(s.n, n); s.n -= t; n -= t; if (s.n <= 0) list.splice(i, 1);
  }
  return n;
}
function moveStack(from, to, toCap, idx, amount) {
  const it = from[idx]; if (!it) return 0;
  amount = Math.min(amount, it.n);
  const left = addTo(to, toCap, it.id, amount, it.ref), moved = amount - left;
  if (moved > 0) { it.n -= moved; if (it.n <= 0) from.splice(idx, 1); }
  return moved;
}

/* ====================== THREE: СЦЕНА ====================== */
const CELL = 6, WALL_H = 3.4, WALL_T = 0.5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);
const dom = renderer.domElement;

const scene = new THREE.Scene();
const FOG_COL = 0x07090b, FOG_DENS = 0.046;
scene.background = new THREE.Color(FOG_COL);
scene.fog = new THREE.FogExp2(FOG_COL, FOG_DENS);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 90);
camera.rotation.order = 'YXZ';
scene.add(camera);
const AMB_COL = 0x93a6b8, AMB_INT = 1.45;
const ambient = new THREE.AmbientLight(AMB_COL, AMB_INT);
scene.add(ambient);

const spot = new THREE.SpotLight(0xfff0d6, 170, 34, 0.5, 0.75, 2);
spot.position.set(0.12, -0.1, 0);
camera.add(spot); camera.add(spot.target); spot.target.position.set(0, 0, -5);
spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0006; spot.shadow.normalBias = 0.03; spot.shadow.camera.near = 0.2; spot.shadow.camera.far = 34;
const gunLight = new THREE.PointLight(0xffc27a, 0, 12, 2);
gunLight.position.set(0, 0, -0.8); camera.add(gunLight);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

/* ---------- Материалы уровня (текстуры — в bunkerTextures.ts) ---------- */
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0.02 });
const debrisMat = new THREE.MeshStandardMaterial({ color: 0x5a5851, roughness: 1 });
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.6, metalness: 0.5 });
const ribMat = new THREE.MeshStandardMaterial({ color: 0x1d2023, roughness: 0.8, metalness: 0.4 });
const trimMat = new THREE.MeshStandardMaterial({ map: TEX.hazard, roughness: 0.6, metalness: 0.2 });
const bloodMat = new THREE.MeshStandardMaterial({ map: bloodTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.4 });

/* ---------- Сборщик геометрии ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.u = []; this.i = []; }
  box(cx, cy, cz, sx, sy, sz, us = 0.25, vs = us, v0 = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const F = [
      { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]], w: sz, h: sy },
      { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]], w: sz, h: sy },
      { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]], w: sx, h: sz },
      { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]], w: sx, h: sz },
      { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]], w: sx, h: sy },
      { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]], w: sx, h: sy }
    ];
    for (const f of F) {
      const b = this.p.length / 3;
      const uv = [[0, v0], [f.w * us, v0], [f.w * us, v0 + f.h * vs], [0, v0 + f.h * vs]];
      for (let k = 0; k < 4; k++) {
        this.p.push(cx + f.v[k][0], cy + f.v[k][1], cz + f.v[k][2]);
        this.n.push(...f.n); this.u.push(...uv[k]);
      }
      this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.i);
    return g;
  }
}

/* ---------- Вьюмодель (пистолет и труба) ---------- */
const vm = new THREE.Group();
const vmMat = c => new THREE.MeshBasicMaterial({ color: c, fog: false });
const pistol = new THREE.Group();
function vmBox(par, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vmMat(c)); m.position.set(x, y, z); par.add(m); return m; }
vmBox(pistol, .055, .06, .3, 0x3a3f45, 0, 0, -.15);
vmBox(pistol, .05, .035, .3, 0x23272b, 0, -.04, -.15);
const grip = vmBox(pistol, .05, .14, .065, 0x2b2f33, 0, -.1, -.02); grip.rotation.x = 0.25;
const muzzle = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .95, fog: false, side: THREE.DoubleSide }));
muzzle.position.set(0, 0.01, -.4); muzzle.visible = false; pistol.add(muzzle);
const pipe = new THREE.Group();
const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(.022, .026, .85, 8), vmMat(0x6f685c));
pipeMesh.position.y = .35; pipe.add(pipeMesh); pipe.visible = false;
vm.add(pistol, pipe); vm.position.set(.22, -.2, -.45);
camera.add(vm);

/* ====================== АУДИО ====================== */
let AC = null, master = null, noiseBuf = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.85; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    [[47, 'sine', .05], [50.4, 'sine', .05], [95.5, 'triangle', .012]].forEach(([f, t, v]) => {
      const o = AC.createOscillator(); o.type = t; o.frequency.value = f;
      const g = AC.createGain(); g.gain.value = v; o.connect(g); g.connect(master); o.start();
    });
  } catch (e) { AC = null; }
}
function outNode(node, pan) {
  if (AC.createStereoPanner && pan) { const p = AC.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); p.connect(master); }
  else node.connect(master);
}
function tone(f, dur, type = 'sine', vol = 0.1, slide = 0, pan = 0) {
  if (!AC) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); outNode(g, pan); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, lp = 2000, pan = 0) {
  if (!AC) return;
  const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); f.frequency.exponentialRampToValueAtTime(Math.max(80, lp / 5), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); outNode(g, pan); s.start(t, Math.random() * 0.5, dur + 0.05);
}
function growl(dist, pan, big = 1) {
  if (!AC) return;
  const v = clamp(1 - dist / 32, 0, 1) * 0.26; if (v < 0.01) return;
  const t = AC.currentTime, d = rand(0.6, 1.1);
  const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(rand(75, 105) / big, t); o.frequency.exponentialRampToValueAtTime(48 / big, t + d);
  const lfo = AC.createOscillator(); lfo.frequency.value = rand(14, 26); const lg = AC.createGain(); lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(f); f.connect(g); outNode(g, pan); o.start(t); lfo.start(t); o.stop(t + d + .05); lfo.stop(t + d + .05);
}
const sfx = {
  shot() { noise(0.28, 0.55, 5000); tone(140, 0.18, 'square', 0.25, -90); },
  empty() { tone(1300, 0.04, 'square', 0.05); },
  reload() { tone(300, .06, 'square', .06); setTimeout(() => tone(520, .06, 'square', .06), 600); },
  swing() { noise(0.18, 0.12, 2500); },
  thud() { noise(0.12, 0.3, 700); tone(90, .12, 'sine', .25, -40); },
  hit() { tone(220, .06, 'square', .08, -80); },
  hurt() { noise(0.25, 0.4, 900); tone(80, 0.3, 'sawtooth', 0.2, -30); },
  pick() { tone(620, .08, 'triangle', .1); setTimeout(() => tone(880, .1, 'triangle', .1), 70); },
  heal() { tone(440, .25, 'sine', .12, 220); },
  open() { noise(0.25, 0.14, 1200); tone(180, .15, 'square', .05, -60); },
  click() { tone(900, .03, 'square', .04); },
  door() { noise(0.7, 0.2, 1500); tone(70, .6, 'sawtooth', .1, -20); },
  step(v) { noise(0.07, v, 600); },
  heart(v) { tone(55, .14, 'sine', v); setTimeout(() => tone(48, .16, 'sine', v * .8), 170); }
};

/* ====================== СОСТОЯНИЕ ИГРЫ ====================== */
let state = 'menu';       // menu | hub | sortie | result
let running = false, locked = false, fallback = false, lockErrors = 0;
let lv = null, lvGroup = null, time = 0;
let invOpen = false, invCont = null, invSel = null, invNote = null;
const keys = {};
const player = {
  x: 3, z: 3, yaw: 0, pitch: 0, vx: 0, vz: 0, hp: 100, maxHp: 100, stam: 100, maxStam: 100, exhausted: false,
  batt: 100, battDur: 150, flash: true, crouch: false, eye: 1.65, bobT: 0, stepT: 0, burst: 0, noise: 2, shake: 0,
  mag: 8, reloadT: 0, gunCD: 0, meleeCD: 0, swingT: 0, kick: 0, flashT: 0, bag: [], bagCap: 8, loot: {}, hasKey: false, vault: false,
  prog: 0, boots: 0, heartT: 0, kills: 0, hurtFlash: 0
};
const bagCount = id => countIn(player.bag, id);
const bagAdd = (id, n, ref) => addTo(player.bag, player.bagCap, id, n, ref);
const bagRemove = (id, n) => removeFrom(player.bag, id, n);
function invChanged() { player.hasKey = bagCount('key') > 0; if (invOpen) renderInv(); }

const MT = {
  walker: { name: 'Бродяга', hp: 60, walk: 1.1, chase: 2.7, dmg: 14, scale: 1, sight: 13, hear: 1, range: 1.5, cd: 1.1, hunch: 0.5, skin: 0x93a08c, clothes: [0xb4561d, 0x2f4f7f, 0xbdbdae, 0x3d5a3a], arm: -1.1, big: 1 },
  runner: { name: 'Бегун', hp: 36, walk: 1.7, chase: 4.7, dmg: 10, scale: 0.93, sight: 15, hear: 1.2, range: 1.4, cd: 0.8, hunch: 0.85, skin: 0x7f8a85, clothes: [0x30343b, 0x5a2d2d], arm: -0.5, big: 1.3 },
  brute: { name: 'Громила', hp: 170, walk: 0.9, chase: 2.35, dmg: 30, scale: 1.45, sight: 11, hear: 0.8, range: 1.9, cd: 1.6, hunch: 0.3, skin: 0x8d8878, clothes: [0x44484f, 0x6b5a2a], arm: -0.9, big: 0.6 }
};

/* ====================== ГЕНЕРАЦИЯ УРОВНЯ ====================== */
const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];
function canGo(x, z, d) {
  const N = lv.N;
  if (d === 0) return z > 0 && !lv.H[z][x];
  if (d === 1) return x < N - 1 && !lv.V[z][x + 1];
  if (d === 2) return z < N - 1 && !lv.H[z + 1][x];
  return x > 0 && !lv.V[z][x];
}
const cellOf = v => clamp(Math.floor(v / CELL), 0, lv.N - 1);
function bfsDist(sx, sz) {
  const N = lv.N, dist = new Array(N * N).fill(-1); dist[sz * N + sx] = 0; const q = [[sx, sz]];
  for (let h = 0; h < q.length; h++) {
    const [x, z] = q[h];
    for (let d = 0; d < 4; d++) if (canGo(x, z, d)) {
      const nx = x + DX[d], nz = z + DZ[d];
      if (dist[nz * N + nx] < 0) { dist[nz * N + nx] = dist[z * N + x] + 1; q.push([nx, nz]); }
    }
  }
  return dist;
}
function bfsNext(sx, sz, tx, tz) {
  const N = lv.N, prev = new Int16Array(N * N).fill(-1), s = sz * N + sx; prev[s] = s;
  const q = [s];
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % N, z = (c / N) | 0;
    if (x === tx && z === tz) break;
    for (let d = 0; d < 4; d++) if (canGo(x, z, d)) {
      const n = (z + DZ[d]) * N + x + DX[d];
      if (prev[n] < 0) { prev[n] = c; q.push(n); }
    }
  }
  let c = tz * N + tx; if (prev[c] < 0) return null;
  while (prev[c] !== s) c = prev[c];
  return [c % N, (c / N) | 0];
}

function disposeLevel() {
  if (!lvGroup) return;
  scene.remove(lvGroup);
  lvGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  lvGroup = null;
}

/* ---------- Зоны ---------- */
function assignZones(N, farI) {
  const zone = new Array(N * N).fill('corridor');
  const pool = []; for (let i = 1; i < N * N; i++) if (i !== farI) pool.push(i);
  shuffle(pool);
  const base = ['living', 'medbay', 'canteen', 'warehouse', 'server', 'generator', 'armory', 'corridor', 'corridor'];
  const types = shuffle(base.slice());
  const k = Math.min(pool.length, Math.max(7, Math.round(N * N / 7)));
  const seeds = [];
  for (let s = 0; s < k; s++) seeds.push({ x: pool[s] % N, z: (pool[s] / N) | 0, t: s < types.length ? types[s] : pick(base), w: rand(0.85, 1.2) });
  for (let i = 0; i < N * N; i++) {
    const cx = i % N, cz = (i / N) | 0; let best = 1e9, bt = 'corridor';
    for (const s of seeds) { const d = Math.hypot(s.x - cx, s.z - cz) * s.w; if (d < best) { best = d; bt = s.t; } }
    zone[i] = bt;
  }
  zone[0] = 'airlock'; zone[farI] = 'vault';
  return zone;
}
const zoneAt = (x, z) => lv.zone[cellOf(z) * lv.N + cellOf(x)];

/* ---------- Материалы и примитивы для реквизита ---------- */
const matCache = {};
const sm = (c, r = 0.8, m = 0.2) => matCache[`${c}_${r}_${m}`] || (matCache[`${c}_${r}_${m}`] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }));
const bm = c => matCache['b' + c] || (matCache['b' + c] = new THREE.MeshBasicMaterial({ color: c }));
function mb(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), mat); m.position.set(x, y, z); g.add(m); return m; }

const PROP_SIDE_LIMIT = 1.1;
function placeProp(name, cx, cz, side) {
  const g = new THREE.Group(), info = PROPS[name](g);
  const inx = -DX[side], inz = -DZ[side], th = Math.atan2(inx, inz);
  const px = (cx + 0.5) * CELL + DX[side] * (CELL / 2 - WALL_T / 2), pz = (cz + 0.5) * CELL + DZ[side] * (CELL / 2 - WALL_T / 2);
  const range = Math.max(0, PROP_SIDE_LIMIT - info.w / 2), a = rand(-range, range);
  g.position.set(px + a * Math.cos(th), 0, pz - a * Math.sin(th)); g.rotation.y = th;
  lvGroup.add(g); lv.propSides.add((cz * lv.N + cx) * 4 + side);
  const wx = inz !== 0 ? info.w : info.d, wz = inz !== 0 ? info.d : info.w;
  const ccx = g.position.x + inx * info.d / 2, ccz = g.position.z + inz * info.d / 2;
  lv.cols.push({ minX: ccx - wx / 2, maxX: ccx + wx / 2, minZ: ccz - wz / 2, maxZ: ccz + wz / 2 });
}
function placeProps() {
  const N = lv.N;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = z * N + x; if (i === 0) continue;
    const zone = ZONES[lv.zone[i]];
    if (!zone.props.length || Math.random() > zone.pc) continue;
    const sides = shuffle([0, 1, 2, 3].filter(d => !canGo(x, z, d)));
    const n = Math.random() < 0.4 ? 2 : 1;
    for (let s = 0; s < Math.min(n, sides.length); s++) placeProp(pick(zone.props), x, z, sides[s]);
  }
}
function placeDecor() {
  const N = lv.N;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = z * N + x; if (i === 0) continue;
    const zk = lv.zone[i], list = ZONE_DECOR[zk]; if (!list || !list.length) continue;
    const sides = shuffle([0, 1, 2, 3].filter(d => !canGo(x, z, d) && !lv.propSides.has(i * 4 + d)));
    let n = 0;
    for (const d of sides) {
      if (n >= 2 || Math.random() > 0.68) continue; n++;
      const g = new THREE.Group(), name = pick(list), info = WALL_DECOR[name](g, zk);
      const inx = -DX[d], inz = -DZ[d], th = Math.atan2(inx, inz);
      const px = (x + 0.5) * CELL + DX[d] * (CELL / 2 - WALL_T / 2), pz = (z + 0.5) * CELL + DZ[d] * (CELL / 2 - WALL_T / 2);
      const range = Math.max(0, (CELL - WALL_T) / 2 - info.w / 2 - 0.25), a = rand(-range, range);
      g.position.set(px + a * Math.cos(th), 0, pz - a * Math.sin(th)); g.rotation.y = th;
      lvGroup.add(g);
    }
  }
}
function buildZoneFloors() {
  const N = lv.N, by = {};
  for (let i = 0; i < N * N; i++) { const t = lv.zone[i]; if (t === 'corridor') continue; (by[t] = by[t] || []).push(i); }
  const mk = (list, y, tile, mat) => {
    const pos = [], uv = [], nor = [], idx = [];
    for (const i of list) {
      const x0 = (i % N) * CELL, z0 = ((i / N) | 0) * CELL, b = pos.length / 3;
      pos.push(x0, y, z0, x0 + CELL, y, z0, x0 + CELL, y, z0 + CELL, x0, y, z0 + CELL);
      const ux = x0 / CELL * tile, uz = z0 / CELL * tile;
      uv.push(ux, uz, ux + tile, uz, ux + tile, uz + tile, ux, uz + tile); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.keep = true; lvGroup.add(m);
  };
  for (const t of Object.keys(by)) {
    mk(by[t], 0.01, 2, zoneFloorMat(t));
    const mm = zoneMarkMat(t); if (mm) { const g = new THREE.Group(); mk(by[t].map(i => i), 0.016, 1, mm); }
  }
}

/* ---------- Лут ---------- */
function unreadNote() {
  const un = NOTES.map((_, i) => i).filter(i => !save.notes.includes(i) && !lv.notePlaced.has(i));
  if (!un.length) return -1;
  const n = pick(un); lv.notePlaced.add(n); return n;
}
function lootAmt(id, zk) {
  switch (id) {
    case 'food': return ri(1, zk === 'canteen' ? 3 : 2);
    case 'scrap': return ri(1, zk === 'warehouse' || zk === 'generator' ? 5 : 3);
    case 'ammo': return ri(2, zk === 'armory' ? 8 : 5);
    case 'band': return ri(1, 2);
    default: return 1;
  }
}
function rollLoot(zk, cap) {
  const w = Object.keys(ZONES[zk].loot).length ? ZONES[zk].loot : ZONES.corridor.loot, ids = Object.keys(w), tot = ids.reduce((a, k) => a + w[k], 0);
  const items = [], n = ri(1, 2) + (Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    let r = Math.random() * tot, id = ids[0];
    for (const k of ids) { r -= w[k]; if (r <= 0) { id = k; break; } }
    addTo(items, cap, id, lootAmt(id, zk));
  }
  if (Math.random() < 0.16 && items.length < cap) { const nt = unreadNote(); if (nt >= 0) items.push({ id: 'note', n: 1, ref: nt }); }
  return items;
}
function rollCorpse() {
  const items = [];
  if (Math.random() < 0.55) { const id = pick(['scrap', 'scrap', 'ammo', 'food', 'band', 'batt']); addTo(items, 3, id, lootAmt(id, 'corridor')); }
  if (Math.random() < 0.22) { const id = pick(['ammo', 'band', 'scrap']); addTo(items, 3, id, lootAmt(id, 'corridor')); }
  return items;
}

function makeContainer(kind, cx, cz) {
  const def = CONT[kind], D = def.d;
  const sx = Math.random() < 0.5 ? -1 : 1, sz = Math.random() < 0.5 ? -1 : 1;
  const x = (cx + 0.5) * CELL + (CELL / 2 - D[0] / 2 - 0.45) * sx, z = (cz + 0.5) * CELL + (CELL / 2 - D[2] / 2 - 0.45) * sz;
  const m = new THREE.Mesh(new THREE.BoxGeometry(D[0], D[1], D[2]), containerMat(kind, def.color));
  m.position.set(x, D[1] / 2, z); lvGroup.add(m);
  // детали фасада (лицом к центру клетки)
  const fz = -sz, fy = z + fz * (D[2] / 2 + 0.012), dark = sm(0x101214, .5, .5), steel = sm(0xaab0b4, .3, .8);
  const add = (w, h, d, mat, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(px, py, pz); lvGroup.add(o); };
  if (kind === 'locker' || kind === 'medcab' || kind === 'fridge') {
    add(0.02, D[1] * 0.92, 0.02, dark, x, D[1] / 2, fy);
    add(0.03, kind === 'fridge' ? 0.5 : 0.14, 0.04, steel, x + 0.1, D[1] * 0.55, fy + fz * 0.02);
    if (kind === 'locker') for (let k = 0; k < 4; k++) add(D[0] * .5, 0.02, 0.01, dark, x - D[0] * .22, D[1] * 0.82 + k * 0.03, fy);
    if (kind === 'fridge') add(D[0] * .96, 0.02, 0.02, dark, x, D[1] * 0.68, fy);
  }
  if (kind === 'medcab') { add(0.32, 0.09, 0.012, bm(0xd02828), x - 0.2, D[1] * 0.78, fy + fz * 0.006); add(0.09, 0.32, 0.012, bm(0xd02828), x - 0.2, D[1] * 0.78, fy + fz * 0.006); }
  if (kind === 'cabinet') for (let k = 0; k < 3; k++) { add(D[0] * .86, 0.015, 0.012, dark, x, D[1] * (0.22 + k * 0.28), fy); add(0.2, 0.04, 0.03, steel, x, D[1] * (0.34 + k * 0.28), fy + fz * 0.014); }
  if (kind === 'crate' || kind === 'toolbox') {
    add(D[0] * 1.02, 0.08, D[2] * 1.02, sm(new THREE.Color(def.color).multiplyScalar(0.7).getHex(), .8, .3), x, D[1] - 0.04, z);
    add(D[0] * .96, 0.07, 0.012, dark, x, D[1] * .3, fy); add(D[0] * .96, 0.07, 0.012, dark, x, D[1] * .75, fy);
    if (kind === 'toolbox') add(0.35, 0.05, 0.02, bm(0xe8c040), x, D[1] * .5, fy + fz * .01);
  }
  if (kind === 'weapon') {
    add(D[0] * 1.02, 0.07, D[2] * 1.02, sm(0x2b3524, .8, .3), x, D[1] - 0.035, z);
    add(0.5, 0.1, 0.012, bm(0xe8c040), x, D[1] * .55, fy);
    add(0.1, 0.06, 0.05, steel, x - 0.45, D[1] * .8, fy + fz * 0.02); add(0.1, 0.06, 0.05, steel, x + 0.45, D[1] * .8, fy + fz * 0.02);
  }
  if (kind === 'vault') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 20), sm(0xd0a040, .3, .8)); ring.position.set(x, D[1] * .52, fy + fz * .03); lvGroup.add(ring);
    for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.05), sm(0xd0a040, .3, .8)); sp.position.set(x, D[1] * .52, fy + fz * .03); sp.rotation.z = k * Math.PI / 4; lvGroup.add(sp); }
    add(D[0] * 1.04, 0.1, D[2] * 1.04, sm(0x4a3810, .6, .6), x, 0.05, z);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: kind === 'vault' ? 0xffb020 : 0xff7a1a }));
  led.position.set(x, D[1] + 0.12, z); lvGroup.add(led);
  const hx = D[0] / 2 + 0.05, hz = D[2] / 2 + 0.05;
  lv.cols.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz });
  return { kind: 'box', ckind: kind, name: def.name, cap: def.cap, x, z, searched: false, items: [], mesh: m, led, time: def.time, vault: false, corpse: false };
}
function updateLed(c) {
  if (!c.led) return;
  const col = !c.searched ? (c.vault ? (player.hasKey ? 0x40ff80 : 0xffb020) : (c.corpse ? 0xffcc40 : 0xff7a1a)) : (c.items.length ? 0x35c26a : 0x222222);
  c.led.material.color.setHex(col);
}
function makeCorpse(m) {
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffcc40 }));
  led.position.set(m.x, 0.45, m.z); lvGroup.add(led);
  const c = { kind: 'box', ckind: 'corpse', name: 'Тело: ' + m.cfg.name, cap: 3, x: m.x, z: m.z, searched: false, items: rollCorpse(), mesh: null, led, time: 1.0, vault: false, corpse: true };
  lv.items.push(c);
}

function buildLevel() {
  disposeLevel();
  lvGroup = new THREE.Group(); scene.add(lvGroup);
  const N = Math.min(12, 7 + Math.floor((save.day - 1) / 2));
  const H = Array.from({ length: N + 1 }, () => Array(N).fill(true));
  const V = Array.from({ length: N }, () => Array(N + 1).fill(true));
  const vis = Array.from({ length: N }, () => Array(N).fill(false));
  const st = [[0, 0]]; vis[0][0] = true;
  while (st.length) {
    const [x, z] = st[st.length - 1], nb = [];
    if (x > 0 && !vis[z][x - 1]) nb.push([x - 1, z]);
    if (x < N - 1 && !vis[z][x + 1]) nb.push([x + 1, z]);
    if (z > 0 && !vis[z - 1][x]) nb.push([x, z - 1]);
    if (z < N - 1 && !vis[z + 1][x]) nb.push([x, z + 1]);
    if (!nb.length) { st.pop(); continue; }
    const [nx, nz] = pick(nb);
    if (nx < x) V[z][x] = false; else if (nx > x) V[z][x + 1] = false; else if (nz < z) H[z][x] = false; else H[z + 1][x] = false;
    vis[nz][nx] = true; st.push([nx, nz]);
  }
  for (let i = 0; i < N * N * 0.3; i++) {
    if (Math.random() < 0.5) H[ri(1, N - 1)][ri(0, N - 1)] = false; else V[ri(0, N - 1)][ri(1, N - 1)] = false;
  }
  for (let i = 0; i < Math.floor(N / 2); i++) {
    const w = ri(2, 3), h = ri(2, 3), x = ri(0, N - w), z = ri(0, N - h);
    if (x === 0 && z === 0) continue;
    for (let dz = 0; dz < h; dz++) for (let dx = 1; dx < w; dx++) V[z + dz][x + dx] = false;
    for (let dz = 1; dz < h; dz++) for (let dx = 0; dx < w; dx++) H[z + dz][x + dx] = false;
  }

  lv = { N, H, V, walls: [], cols: [], items: [], monsters: [], lamps: [], pool: [], propSides: new Set(), parts: [], zone: [], curZone: '', notePlaced: new Set(), exp: Array.from({ length: N }, () => Array(N).fill(false)), time: 0, spawnT: 75, ambT: 12, vx: 0, vz: 0 };

  const dist = bfsDist(0, 0);
  let far = 0, farI = 1;
  dist.forEach((d, i) => { if (d > far) { far = d; farI = i; } });
  lv.vx = farI % N; lv.vz = Math.floor(farI / N);
  lv.zone = assignZones(N, farI);

  // Стены
  const wg = new Geo(), trim = new Geo(), signs = [];
  const addBoxWall = (x0, x1, z0, z1) => {
    wg.box((x0 + x1) / 2, WALL_H / 2, (z0 + z1) / 2, x1 - x0, WALL_H, z1 - z0, 1 / 3.3, 1 / WALL_H);
    const b = { minX: x0, maxX: x1, minZ: z0, maxZ: z1 };
    lv.walls.push(b); lv.cols.push(b);
  };
  for (let z = 0; z <= N; z++) for (let x = 0; x < N; x++) if (H[z][x]) addBoxWall(x * CELL - WALL_T / 2, (x + 1) * CELL + WALL_T / 2, z * CELL - WALL_T / 2, z * CELL + WALL_T / 2);
  for (let z = 0; z < N; z++) for (let x = 0; x <= N; x++) if (V[z][x]) addBoxWall(x * CELL - WALL_T / 2, x * CELL + WALL_T / 2, z * CELL - WALL_T / 2, (z + 1) * CELL + WALL_T / 2);

  // Гермопроёмы между зонами: стойки, перемычка, жёлтая окантовка, табличка
  const T = WALL_T, PW = 1.6, LH = 0.7, zn = (x, z) => lv.zone[z * N + x];
  for (let z = 1; z < N; z++) for (let x = 0; x < N; x++) {
    if (H[z][x]) continue;
    const a = zn(x, z - 1), b = zn(x, z); if (a === b) continue;
    const x0 = x * CELL, x1 = x0 + CELL, zc = z * CELL, mx = (x0 + x1) / 2;
    addBoxWall(x0 - T / 2, x0 + PW, zc - T / 2, zc + T / 2); addBoxWall(x1 - PW, x1 + T / 2, zc - T / 2, zc + T / 2);
    wg.box(mx, WALL_H - LH / 2, zc, CELL - 2 * PW, LH, T, 1 / 3.3, 1 / WALL_H, (WALL_H - LH) / WALL_H);
    trim.box(mx, WALL_H - LH - 0.03, zc, CELL - 2 * PW, 0.06, T + 0.08, 0.8, 1 / 0.06);
    signs.push({ x: mx, z: zc + T / 2 + 0.012, ry: 0, t: a }); signs.push({ x: mx, z: zc - T / 2 - 0.012, ry: Math.PI, t: b });
  }
  for (let z = 0; z < N; z++) for (let x = 1; x < N; x++) {
    if (V[z][x]) continue;
    const a = zn(x - 1, z), b = zn(x, z); if (a === b) continue;
    const xc = x * CELL, z0 = z * CELL, z1 = z0 + CELL, mz = (z0 + z1) / 2;
    addBoxWall(xc - T / 2, xc + T / 2, z0 - T / 2, z0 + PW); addBoxWall(xc - T / 2, xc + T / 2, z1 - PW, z1 + T / 2);
    wg.box(xc, WALL_H - LH / 2, mz, T, LH, CELL - 2 * PW, 1 / 3.3, 1 / WALL_H, (WALL_H - LH) / WALL_H);
    trim.box(xc, WALL_H - LH - 0.03, mz, T + 0.08, 0.06, CELL - 2 * PW, 0.8, 1 / 0.06);
    signs.push({ x: xc + T / 2 + 0.012, z: mz, ry: Math.PI / 2, t: a }); signs.push({ x: xc - T / 2 - 0.012, z: mz, ry: -Math.PI / 2, t: b });
  }
  const wallMesh = new THREE.Mesh(wg.build(), wallMat); wallMesh.userData.keep = true; wallMesh.castShadow = wallMesh.receiveShadow = true; lvGroup.add(wallMesh);
  const trimMesh = new THREE.Mesh(trim.build(), trimMat); trimMesh.userData.keep = true; trimMesh.receiveShadow = true; lvGroup.add(trimMesh);
  for (const s of signs) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), zoneSignMat(s.t));
    m.position.set(s.x, WALL_H - LH / 2, s.z); m.rotation.y = s.ry; lvGroup.add(m);
  }

  // Пол и потолок
  const S = N * CELL;
  const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set(S / 4, S / 4);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.55, metalness: 0.12 }));
  fl.receiveShadow = true; fl.userData.keep = true;
  fl.rotation.x = -Math.PI / 2; fl.position.set(S / 2, 0, S / 2); lvGroup.add(fl);
  const ct = ceilTex.clone(); ct.needsUpdate = true; ct.repeat.set(S / 4, S / 4);
  const cl = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.95 }));
  cl.userData.keep = true;
  cl.rotation.x = Math.PI / 2; cl.position.set(S / 2, WALL_H, S / 2); lvGroup.add(cl);
  buildZoneFloors();
  // потолочные балки
  const ribs = new Geo();
  for (let i = 0; i <= N; i++) { ribs.box(S / 2, WALL_H - 0.12, i * CELL, S, 0.24, 0.32); ribs.box(i * CELL, WALL_H - 0.12, S / 2, 0.32, 0.24, S); }
  { const rm = new THREE.Mesh(ribs.build(), ribMat); rm.userData.keep = true; rm.castShadow = true; rm.receiveShadow = true; lvGroup.add(rm); }

  // Светильники: плафон есть в каждой клетке, горит лишь часть. Настоящий свет выдаётся пулом ближайших ламп.
  const cellsIdx = [];
  for (let i = 1; i < N * N; i++) if (i !== farI) cellsIdx.push(i);
  shuffle(cellsIdx);
  const nLit = Math.max(8, Math.round(N * N * 0.3));
  const litArr = cellsIdx.slice(0, nLit - 1); litArr.push(farI);
  const lit = new Set(litArr);
  for (let i = 1; i < N * N; i++) {
    const cx = (i % N + 0.5) * CELL, cz = (Math.floor(i / N) + 0.5) * CELL, zk = lv.zone[i];
    if (lit.has(i)) {
      const red = litArr.indexOf(i) < 3, lc = red ? 0xff2a18 : ZONES[zk].lamp, bad = !red && i !== farI && Math.random() < 0.4;
      const fx = addFixture(lvGroup, zk, red, cx, cz, WALL_H, red ? 0xff3a22 : lc, bad ? 'bad' : 'lit');
      lv.lamps.push({ x: cx, z: cz, y: fx.y, color: lc, base: red ? 30 : (i === farI ? 42 : 38), red, bad, ph: rand(0, 6), mesh: fx.mesh });
    } else addFixture(lvGroup, zk, false, cx, cz, WALL_H, 0, 'dead');
  }
  addFixture(lvGroup, 'corridor', false, CELL / 2, CELL / 2, WALL_H, 0xc8ffd8, 'lit');
  lv.pool = [];
  for (let k = 0; k < 8; k++) { const L = new THREE.PointLight(0xffffff, 0, 15, 2); L.position.set(0, WALL_H - 0.5, 0); lvGroup.add(L); lv.pool.push({ L, lamp: null, f: 0 }); }
  lvGroup.add(new THREE.HemisphereLight(0xcfe0f0, 0x3a2e24, 0.55));
  lv.dust = createDust(lvGroup);
  // Шлюз убежища (в стиле самого убежища)
  lv.door = buildAirlockDoor(lvGroup, CELL, WALL_T);
  lv.items.push({ kind: 'door', x: 1.2, z: CELL / 2, time: 0.7 });
  // Цветные полосы зон, потолочные короба
  wallStripes(lvGroup, lv, CELL, WALL_T);
  ceilingDecor(lvGroup, lv, CELL, WALL_H);

  // Трубы и мусор
  for (let i = 0; i < N * 2; i++) {
    const cx = ri(0, N - 1), cz = ri(0, N - 1), alongX = Math.random() < 0.5;
    const big = lv.zone[cz * N + cx] === 'generator';
    const m = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.2 : 0.11, big ? 0.2 : 0.11, CELL, 8), big ? sm(0x6a2a1c, .7, .5) : pipeMat);
    m.position.set((cx + 0.5) * CELL + (alongX ? 0 : rand(-2.4, 2.4)), WALL_H - 0.5, (cz + 0.5) * CELL + (alongX ? rand(-2.4, 2.4) : 0));
    if (alongX) m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
    lvGroup.add(m);
  }
  const deb = new Geo();
  for (let i = 0; i < N * N * 2; i++) { const s = rand(0.2, 0.55); deb.box(rand(1, S - 1), s / 2, rand(1, S - 1), s, s, s * rand(.6, 1.3), 0.5); }
  { const dm = new THREE.Mesh(deb.build(), debrisMat); dm.userData.keep = true; dm.castShadow = dm.receiveShadow = true; lvGroup.add(dm); }
  for (let i = 0; i < N * 2; i++) addDecal(rand(1, S - 1), rand(1, S - 1), rand(1.2, 3));

  // Реквизит и настенный декор по зонам
  placeProps();
  placeDecor();

  // Контейнеры (у каждого — собственный инвентарь)
  const free = [];
  for (let i = 1; i < N * N; i++) if (i !== farI) free.push(i);
  shuffle(free);
  const nBoxes = Math.min(free.length, 10 + Math.floor(N * 1.5));
  const keyCandidates = free.slice(0, nBoxes).filter(i => dist[i] > far * 0.35);
  const keyCell = keyCandidates.length ? pick(keyCandidates) : free[0];
  for (let k = 0; k < nBoxes; k++) {
    const i = free[k], zk = lv.zone[i];
    const c = makeContainer(pick(ZONES[zk].cont), i % N, Math.floor(i / N));
    c.items = rollLoot(zk, c.cap);
    if (i === keyCell) { c.items.unshift({ id: 'key', n: 1 }); if (c.items.length > c.cap) c.items.length = c.cap; }
    else if (Math.random() < 0.1) c.items = [];
    lv.items.push(c);
  }
  const vault = makeContainer('vault', lv.vx, lv.vz);
  vault.vault = true;
  addTo(vault.items, vault.cap, 'scrap', ri(7, 11)); addTo(vault.items, vault.cap, 'meds', 2); addTo(vault.items, vault.cap, 'band', 2);
  addTo(vault.items, vault.cap, 'ammo', ri(8, 12)); addTo(vault.items, vault.cap, 'batt', 2); addTo(vault.items, vault.cap, 'food', 2);
  const nt = unreadNote(); if (nt >= 0) vault.items.push({ id: 'note', n: 1, ref: nt });
  lv.items.push(vault);
  for (const c of lv.items) if (c.kind === 'box') updateLed(c);

  // Склеиваем статику в крупные меши (быстрее рендер, особенно с тенями)
  bakeStatic(lvGroup, CELL * 3);

  // Монстры
  const mcount = Math.min(10, 3 + Math.floor(save.day * 0.8) + Math.floor(N / 4));
  const spawnCells = [];
  for (let i = 1; i < N * N; i++) if (dist[i] >= 4) spawnCells.push(i);
  for (let k = 0; k < mcount && spawnCells.length; k++) {
    const i = spawnCells.splice(Math.floor(Math.random() * spawnCells.length), 1)[0];
    spawnMonster(pickType(), (i % N + 0.5) * CELL + rand(-1.5, 1.5), (Math.floor(i / N) + 0.5) * CELL + rand(-1.5, 1.5));
  }
}
function pickType() {
  const d = save.day, r = Math.random();
  if (d >= 5 && r < 0.2) return 'brute';
  if (d >= 3 && r < 0.5) return 'runner';
  return 'walker';
}
function addDecal(x, z, s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), bloodMat);
  m.rotation.x = -Math.PI / 2; m.rotation.z = rand(0, 6.28); m.position.set(x, 0.025 + Math.random() * 0.005, z);
  lvGroup.add(m);
}

/* ====================== КОЛЛИЗИИ И ЛУЧИ ====================== */
function resolve(pos, r) {
  for (let it = 0; it < 2; it++) for (const b of lv.cols) {
    if (pos.x + r < b.minX || pos.x - r > b.maxX || pos.z + r < b.minZ || pos.z - r > b.maxZ) continue;
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX)), cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), p = r - d; pos.x += dx / d * p; pos.z += dz / d * p; }
    else {
      const l = pos.x - b.minX, rr = b.maxX - pos.x, t = pos.z - b.minZ, bt = b.maxZ - pos.z, m = Math.min(l, rr, t, bt);
      if (m === l) pos.x = b.minX - r; else if (m === rr) pos.x = b.maxX + r; else if (m === t) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
    }
  }
}
function rayBox(ox, oz, dx, dz, b, maxT) {
  let t0 = 0, t1 = maxT;
  if (Math.abs(dx) < 1e-9) { if (ox < b.minX || ox > b.maxX) return Infinity; }
  else { let a = (b.minX - ox) / dx, c = (b.maxX - ox) / dx; if (a > c) { const t = a; a = c; c = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); }
  if (Math.abs(dz) < 1e-9) { if (oz < b.minZ || oz > b.maxZ) return Infinity; }
  else { let a = (b.minZ - oz) / dz, c = (b.maxZ - oz) / dz; if (a > c) { const t = a; a = c; c = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, c); }
  return t0 > t1 ? Infinity : t0;
}
function losClear(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  if (L < 0.01) return true;
  const ux = dx / L, uz = dz / L;
  for (const b of lv.walls) if (rayBox(ax, az, ux, uz, b, L) < L) return false;
  return true;
}
function rayCols(ox, oz, ux, uz, maxT) {
  let best = Infinity;
  for (const b of lv.cols) { const t = rayBox(ox, oz, ux, uz, b, maxT); if (t < best) best = t; }
  return best;
}
function raySphere(o, d, c, r) {
  const lx = c[0] - o.x, ly = c[1] - o.y, lz = c[2] - o.z, tca = lx * d.x + ly * d.y + lz * d.z;
  if (tca < 0) return null;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return null;
  return tca - Math.sqrt(r * r - d2);
}

/* ====================== МОНСТРЫ ====================== */
function bx(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function buildMonster(type) {
  const c = MT[type], g = new THREE.Group(); g.rotation.order = 'YXZ';
  const skin = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.85 });
  const flesh = new THREE.MeshStandardMaterial({ color: 0x5c2a2a, roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({ color: pick(c.clothes), roughness: 0.95 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x25272c, roughness: 0.95 });
  const white = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const mkLeg = x => { const l = new THREE.Group(); l.position.set(x, 0.85, 0); l.add(bx(0.2, 0.85, 0.22, pants, 0, -0.42, 0)); l.add(bx(0.22, 0.1, 0.32, flesh, 0, -0.85, 0.05)); g.add(l); return l; };
  const legL = mkLeg(-0.15), legR = mkLeg(0.15);
  const upper = new THREE.Group(); upper.position.set(0, 0.85, 0); g.add(upper);
  upper.add(bx(0.56, 0.72, 0.32, cloth, 0, 0.38, 0));
  upper.add(bx(0.3, 0.3, 0.02, flesh, 0.1, 0.4, 0.17));
  upper.add(bx(0.13, 0.09, 0.01, white, -0.14, 0.56, 0.165));
  const head = new THREE.Group(); head.position.set(0, 0.85, 0.06); upper.add(head);
  head.add(bx(0.26, 0.3, 0.28, skin, 0, 0.12, 0));
  head.add(bx(0.2, 0.09, 0.2, flesh, 0, -0.06, 0.05));
  head.add(bx(0.05, 0.035, 0.02, eyeMat, -0.07, 0.16, 0.145));
  head.add(bx(0.05, 0.035, 0.02, eyeMat, 0.07, 0.16, 0.145));
  if (Math.random() < 0.4) {
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.6 }));
    hat.position.set(0, 0.24, 0); head.add(hat);
  }
  const mkArm = x => {
    const a = new THREE.Group(); a.position.set(x, 0.68, 0);
    a.add(bx(0.15, 0.42, 0.15, cloth, 0, -0.2, 0)); a.add(bx(0.12, 0.55, 0.12, skin, 0, -0.65, 0)); a.add(bx(0.14, 0.16, 0.14, skin, 0, -0.98, 0));
    upper.add(a); return a;
  };
  const armL = mkArm(-0.37), armR = mkArm(0.37);
  if (type === 'brute') upper.scale.x = 1.35;
  g.scale.setScalar(c.scale);
  g.userData = { legL, legR, armL, armR, upper, head, eyeMat };
  return g;
}
function spawnMonster(type, x, z) {
  const mesh = buildMonster(type); mesh.traverse(o => { if (o.isMesh) o.castShadow = true; }); lvGroup.add(mesh);
  const c = MT[type];
  const m = { type, cfg: c, mesh, x, z, yaw: rand(0, 6.28), hp: c.hp, state: 'wander', wt: null, pause: rand(0, 2), cd: 0, stun: 0, lost: 0, lx: 0, lz: 0, tx: 0, tz: 0, arrived: false, wait: 0, phase: rand(0, 6), swing: 0, dead: false, fall: 0, pathT: 0, next: null, pcell: -1, off: rand(0, 6), groanT: rand(5, 12), wtT: 0, hx: 0, hz: 1 };
  lv.monsters.push(m); mesh.position.set(x, 0, z);
  return m;
}
function spheres(m) {
  const s = m.cfg.scale;
  return [{ c: [m.x, 1.55 * s, m.z], r: 0.26 * s, head: true }, { c: [m.x, 1.12 * s, m.z], r: 0.4 * s }, { c: [m.x, 0.6 * s, m.z], r: 0.32 * s }];
}
function alertNear(m) {
  for (const o of lv.monsters) {
    if (o === m || o.dead || o.state === 'chase') continue;
    if (Math.hypot(o.x - m.x, o.z - m.z) < 16) { o.state = 'investigate'; o.tx = player.x; o.tz = player.z; o.arrived = false; }
  }
}
function stepToward(m, gx, gz, speed, dt) {
  const mc = cellOf(m.x), mz = cellOf(m.z), tc = cellOf(gx), tz = cellOf(gz);
  let px = gx, pz = gz;
  if (mc !== tc || mz !== tz) {
    m.pathT -= dt; const key = mc * 64 + mz;
    if (m.pathT <= 0 || m.pcell !== key) { m.next = bfsNext(mc, mz, tc, tz); m.pathT = 0.4; m.pcell = key; }
    if (m.next) { px = (m.next[0] + 0.5) * CELL; pz = (m.next[1] + 0.5) * CELL; }
  }
  const dx = px - m.x, dz = pz - m.z, d = Math.hypot(dx, dz);
  if (d < 0.02) return 0;
  const step = Math.min(d, speed * dt), ox = m.x, oz = m.z;
  m.x += dx / d * step; m.z += dz / d * step; resolve(m, 0.42);
  m.hx = dx / d; m.hz = dz / d;
  return Math.hypot(m.x - ox, m.z - oz);
}
function updateMonster(m, dt) {
  const cfg = m.cfg, p = player, ud = m.mesh.userData;
  if (m.dead) {
    m.fall = Math.min(1, m.fall + dt * 2.2);
    m.mesh.rotation.x = -m.fall * 1.5; m.mesh.position.y = 0.12 * m.fall; return;
  }
  m.cd = Math.max(0, m.cd - dt); m.stun = Math.max(0, m.stun - dt);
  const dx = p.x - m.x, dz = p.z - m.z, dist = Math.hypot(dx, dz);
  let los = null; const getLos = () => (los === null ? (los = losClear(m.x, m.z, p.x, p.z)) : los);
  let sees = false;
  const sr = cfg.sight * (p.flash ? 1 : 0.45) * (p.crouch ? 0.7 : 1);
  if (dist < sr) {
    const dot = (dx * Math.sin(m.yaw) + dz * Math.cos(m.yaw)) / (dist || 1);
    if ((dot > 0.1 || dist < 3.5) && getLos()) sees = true;
  }
  const hearR = p.noise * cfg.hear * (dist < 45 && getLos() ? 1 : 0.55);
  if (sees) {
    if (m.state !== 'chase') { m.state = 'chase'; growl(dist, clamp(Math.sin(Math.atan2(m.x - p.x, m.z - p.z) - p.yaw) * -1, -1, 1), cfg.big); alertNear(m); }
    m.lost = 0; m.lx = p.x; m.lz = p.z;
  } else if (m.state === 'chase') {
    m.lost += dt;
    if (m.lost > 4 || Math.hypot(m.lx - m.x, m.lz - m.z) < 1) { if (m.lost > 1.5) { m.state = 'investigate'; m.tx = m.lx; m.tz = m.lz; m.arrived = false; } }
  } else if (dist < hearR) {
    if (m.state !== 'investigate' || Math.hypot(m.tx - p.x, m.tz - p.z) > 3) { m.state = 'investigate'; m.tx = p.x; m.tz = p.z; m.arrived = false; }
  }

  let speed = 0, gx = m.x, gz = m.z;
  if (m.stun > 0) speed = 0;
  else if (m.state === 'chase') {
    gx = sees ? p.x : m.lx; gz = sees ? p.z : m.lz; speed = cfg.chase;
    if (sees && dist < cfg.range * 0.85) speed = 0;
  } else if (m.state === 'investigate') {
    gx = m.tx; gz = m.tz;
    if (Math.hypot(gx - m.x, gz - m.z) < 1.5) {
      if (!m.arrived) { m.arrived = true; m.wait = rand(2, 4); }
      m.wait -= dt;
      if (m.wait <= 0) { m.state = 'wander'; m.wt = null; m.pause = 0; }
    } else speed = cfg.walk * 1.6;
  } else {
    if (m.pause > 0) m.pause -= dt;
    else {
      m.wtT += dt;
      if (!m.wt || m.wtT > 16) {
        const cx = clamp(cellOf(m.x) + ri(-4, 4), 0, lv.N - 1), cz = clamp(cellOf(m.z) + ri(-4, 4), 0, lv.N - 1);
        m.wt = { x: (cx + 0.5) * CELL + rand(-1.5, 1.5), z: (cz + 0.5) * CELL + rand(-1.5, 1.5) }; m.wtT = 0;
      }
      gx = m.wt.x; gz = m.wt.z; speed = cfg.walk;
      if (Math.hypot(gx - m.x, gz - m.z) < 1.3) { m.wt = null; m.pause = rand(0.5, 3.5); speed = 0; }
    }
  }
  let moved = 0;
  if (speed > 0) moved = stepToward(m, gx, gz, speed, dt);
  for (const o of lv.monsters) {
    if (o === m || o.dead) continue;
    const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz);
    if (od < 0.9 && od > 0.001) { m.x += ox / od * (0.9 - od) * 0.5; m.z += oz / od * (0.9 - od) * 0.5; }
  }
  if (m.state === 'chase' && sees) m.yaw = turn(m.yaw, Math.atan2(dx, dz), dt * 6);
  else if (moved > 0) m.yaw = turn(m.yaw, Math.atan2(m.hx, m.hz), dt * 4);

  if (sees && dist < cfg.range && m.cd <= 0 && m.swing <= 0 && m.stun <= 0) { m.swing = 0.4; m.cd = cfg.cd; }
  if (m.swing > 0) {
    m.swing -= dt;
    if (m.swing <= 0 && Math.hypot(p.x - m.x, p.z - m.z) < cfg.range + 0.6) hurtPlayer(cfg.dmg * rand(0.8, 1.2));
  }
  m.groanT -= dt;
  if (m.groanT <= 0) {
    m.groanT = m.state === 'chase' ? rand(2.5, 5) : rand(9, 18);
    const ang = Math.atan2(m.x - p.x, m.z - p.z) - p.yaw;
    growl(dist, clamp(-Math.sin(ang), -1, 1), cfg.big);
  }
  m.phase += moved * 2.6;
  const amp = clamp(moved / dt / 2.6, 0, 1);
  ud.legL.rotation.x = Math.sin(m.phase) * 0.8 * amp;
  ud.legR.rotation.x = -Math.sin(m.phase) * 0.8 * amp;
  const chase = m.state === 'chase';
  ud.upper.rotation.x = cfg.hunch + (chase ? 0.15 : 0);
  let ax = (chase ? cfg.arm : -0.3) + Math.sin(time * 1.5 + m.off) * 0.08;
  if (m.swing > 0) { const t = 1 - m.swing / 0.4; ax = -2.0 + t * 2.4; }
  ud.armL.rotation.x = ax + Math.sin(m.phase + Math.PI) * 0.4 * amp;
  ud.armR.rotation.x = ax - Math.sin(m.phase + Math.PI) * 0.4 * amp;
  ud.armL.rotation.z = 0.1; ud.armR.rotation.z = -0.1;
  ud.head.rotation.y = chase ? 0 : Math.sin(time * 0.7 + m.off) * 0.4;
  ud.head.rotation.z = Math.sin(time * 3.1 + m.off) * 0.1;
  m.mesh.position.set(m.x, Math.abs(Math.sin(m.phase)) * 0.05 * amp, m.z);
  m.mesh.rotation.y = m.yaw;
}

/* ====================== БОЙ ====================== */
function hurtPlayer(d) {
  const p = player;
  p.hp -= d; p.shake = Math.max(p.shake, 1.2); p.burst = Math.max(p.burst, 14); p.hurtFlash = 1;
  sfx.hurt(); $('dmg').style.transition = 'none'; $('dmg').style.opacity = 0.9;
  requestAnimationFrame(() => { $('dmg').style.transition = 'opacity .5s'; $('dmg').style.opacity = 0; });
  p.prog = 0;
  if (p.hp <= 0) { p.hp = 0; endSortie('dead'); }
}
function spawnParts(x, y, z, n, color, speed, life) {
  for (let i = 0; i < n; i++) {
    let pt = lv.parts.find(q => q.life <= 0);
    if (!pt) {
      if (lv.parts.length > 90) break;
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mat);
      lvGroup.add(mesh); pt = { mesh, mat, vx: 0, vy: 0, vz: 0, life: 0 }; lv.parts.push(pt);
    }
    pt.mat.color.setHex(color); pt.mesh.visible = true; pt.mesh.position.set(x, y, z);
    pt.vx = rand(-1, 1) * speed; pt.vy = rand(0, 1) * speed; pt.vz = rand(-1, 1) * speed; pt.life = life * rand(0.6, 1);
  }
}
function updateParts(dt) {
  for (const q of lv.parts) {
    if (q.life <= 0) continue;
    q.life -= dt; q.vy -= 9 * dt;
    q.mesh.position.x += q.vx * dt; q.mesh.position.y += q.vy * dt; q.mesh.position.z += q.vz * dt;
    if (q.mesh.position.y < 0.03) { q.mesh.position.y = 0.03; q.vx = q.vy = q.vz = 0; }
    if (q.life <= 0) q.mesh.visible = false;
  }
}
function hurtMonster(m, dmg, hx, hy, hz) {
  m.hp -= dmg;
  spawnParts(hx, hy, hz, 10, 0x7a0e0e, 2.5, 0.8);
  sfx.hit(); $('cross').classList.add('hit'); setTimeout(() => $('cross').classList.remove('hit'), 120);
  if (m.hp <= 0) {
    m.dead = true; m.mesh.userData.eyeMat.color.setHex(0x000000);
    player.kills++; save.kills++; addDecal(m.x, m.z, 2.6); makeCorpse(m);
    toast('Бывший убит: ' + m.cfg.name, 'good'); sfx.thud();
  } else {
    m.stun = 0.18;
    if (m.state !== 'chase') { m.state = 'chase'; m.lost = 0; m.lx = player.x; m.lz = player.z; alertNear(m); }
  }
}
const _dir = new THREE.Vector3();
function shoot() {
  const p = player;
  if (p.gunCD > 0 || p.reloadT > 0 || p.swingT > 0) return;
  if (p.mag <= 0) {
    p.gunCD = 0.3; sfx.empty();
    if (bagCount('ammo') > 0) reload(); else toast('Патронов нет! Бейте трубой (ПКМ)', 'bad');
    return;
  }
  p.mag--; p.gunCD = 0.32; p.burst = Math.max(p.burst, 42); p.kick = 1; p.flashT = 0.06; p.shake = Math.max(p.shake, 0.25);
  p.pitch += 0.018; sfx.shot();
  camera.getWorldDirection(_dir);
  const sp = p.crouch ? 0.004 : 0.012;
  _dir.x += rand(-sp, sp); _dir.y += rand(-sp, sp); _dir.z += rand(-sp, sp); _dir.normalize();
  const o = camera.position;
  let best = Infinity, hm = null, head = false;
  for (const m of lv.monsters) {
    if (m.dead) continue;
    for (const s of spheres(m)) { const t = raySphere(o, _dir, s.c, s.r); if (t !== null && t < best) { best = t; hm = m; head = !!s.head; } }
  }
  const hc = Math.hypot(_dir.x, _dir.z) || 1e-6;
  const wd = rayCols(o.x, o.z, _dir.x / hc, _dir.z / hc, 70) / hc;
  if (hm && best < wd) hurtMonster(hm, head ? 95 : 34, o.x + _dir.x * best, o.y + _dir.y * best, o.z + _dir.z * best);
  else if (wd < 70) spawnParts(o.x + _dir.x * wd, o.y + _dir.y * wd, o.z + _dir.z * wd, 5, 0xffcf80, 2, 0.35);
  if (p.mag === 0 && bagCount('ammo') > 0) toast('Магазин пуст — R', 'info');
}
function reload() {
  const p = player;
  if (p.reloadT > 0 || p.mag >= 8 || bagCount('ammo') <= 0) return false;
  p.reloadT = 1.3; sfx.reload(); return true;
}
function melee() {
  const p = player;
  if (p.meleeCD > 0 || p.reloadT > 0) return;
  p.meleeCD = 0.6; p.swingT = 0.32; p.burst = Math.max(p.burst, 12); sfx.swing();
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  for (const m of lv.monsters) {
    if (m.dead) continue;
    const dx = m.x - p.x, dz = m.z - p.z, d = Math.hypot(dx, dz);
    if (d < 2.2 * Math.max(1, m.cfg.scale * 0.8) && (dx * fx + dz * fz) / (d || 1) > 0.45 && losClear(p.x, p.z, m.x, m.z)) {
      hurtMonster(m, 26, m.x, 1.2, m.z); m.stun = 0.4;
      m.x += fx * 0.7; m.z += fz * 0.7; resolve(m, 0.42);
      p.shake = Math.max(p.shake, 0.4); break;
    }
  }
}
function applyHeal(id) {
  const p = player;
  p.hp = Math.min(p.maxHp, p.hp + HEAL[id]); sfx.heal();
  toast(`${ITEMS[id].name}: +${HEAL[id]} здоровья`, 'good');
}
function heal() {
  const p = player;
  if (p.hp >= p.maxHp) { toast('Здоровье полное', 'info'); return; }
  const miss = p.maxHp - p.hp, b = bagCount('band'), m = bagCount('meds');
  let id = null;
  if (b > 0 && (miss <= 30 || m === 0)) id = 'band'; else if (m > 0) id = 'meds';
  if (!id) { toast('Нет аптечек и бинтов', 'bad'); return; }
  bagRemove(id, 1); applyHeal(id); invChanged();
}
function toggleFlash() {
  const p = player;
  if (!p.flash && p.batt <= 0 && bagCount('batt') <= 0) { toast('Нет батарей', 'bad'); return; }
  p.flash = !p.flash; sfx.empty();
  if (p.flash && p.batt <= 0) swapBattery();
}
function swapBattery() {
  const p = player;
  if (bagCount('batt') > 0) { bagRemove('batt', 1); p.batt = 100; toast('Батарея фонаря заменена', 'info'); invChanged(); return true; }
  return false;
}

/* ====================== ИНТЕРФЕЙС ВНУТРИ ИГРЫ ====================== */
function toast(msg, cls = 'info') {
  const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = msg;
  const box = $('toasts'); box.appendChild(d);
  while (box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => d.remove(), 3800);
}
let noteTimer = 0;
function showNote(i) {
  $('noteTitle').textContent = '📄 ' + NOTES[i][0]; $('noteText').textContent = NOTES[i][1];
  show('noteBox'); clearTimeout(noteTimer); noteTimer = setTimeout(() => show('noteBox', false), 12000);
}
function recordNote(i) {
  if (!save.notes.includes(i)) { save.notes.push(i); store(); }
  invNote = i; showNote(i);
}
function objective() {
  const p = player;
  if (p.vault) return '◆ ЦЕЛЬ: вернитесь к шлюзу убежища (зелёная метка)';
  if (!p.hasKey) return '◆ ЦЕЛЬ: найдите карту доступа к хранилищу (💳 лежит в одном из контейнеров)';
  return '◆ ЦЕЛЬ: откройте хранилище (янтарная метка на карте)';
}
const mini = $('mini'), mc = mini.getContext('2d');
function drawMini() {
  const S = mini.width, N = lv.N, sc = S / (N * CELL), cs = CELL * sc;
  const ex = (x, z) => x >= 0 && z >= 0 && x < N && z < N && lv.exp[z][x];
  mc.clearRect(0, 0, S, S); mc.fillStyle = 'rgba(0,0,0,.65)'; mc.fillRect(0, 0, S, S);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (lv.exp[z][x]) {
    mc.fillStyle = ZONES[lv.zone[z * N + x]].color + '4d'; mc.fillRect(x * cs, z * cs, cs, cs);
  }
  mc.strokeStyle = 'rgba(190,210,220,.9)'; mc.lineWidth = 1.5; mc.beginPath();
  for (let z = 0; z <= N; z++) for (let x = 0; x < N; x++) if (lv.H[z][x] && (ex(x, z) || ex(x, z - 1))) { mc.moveTo(x * cs, z * cs); mc.lineTo((x + 1) * cs, z * cs); }
  for (let z = 0; z < N; z++) for (let x = 0; x <= N; x++) if (lv.V[z][x] && (ex(x, z) || ex(x - 1, z))) { mc.moveTo(x * cs, z * cs); mc.lineTo(x * cs, (z + 1) * cs); }
  mc.stroke();
  for (const it of lv.items) {
    if (it.kind !== 'box' || it.corpse || it.vault || !ex(cellOf(it.x), cellOf(it.z))) continue;
    mc.fillStyle = it.searched ? (it.items.length ? '#35c26a' : '#666') : '#ff9a3a'; mc.fillRect(it.x * sc - 1.5, it.z * sc - 1.5, 3, 3);
  }
  mc.fillStyle = '#4ade80'; mc.fillRect(0, (CELL / 2 - 1.5) * sc, 4, 3 * sc);
  if (player.hasKey || ex(lv.vx, lv.vz)) {
    const vx = (lv.vx + 0.5) * cs, vz = (lv.vz + 0.5) * cs;
    mc.fillStyle = player.vault ? '#777' : '#ffb020'; mc.beginPath();
    mc.moveTo(vx, vz - 6); mc.lineTo(vx + 6, vz); mc.lineTo(vx, vz + 6); mc.lineTo(vx - 6, vz); mc.fill();
  }
  mc.save(); mc.translate(player.x * sc, player.z * sc); mc.rotate(-player.yaw);
  mc.fillStyle = '#fff'; mc.beginPath(); mc.moveTo(0, -6); mc.lineTo(4.5, 5); mc.lineTo(-4.5, 5); mc.closePath(); mc.fill(); mc.restore();
}
const el = { hp: $('hpBar'), st: $('stBar'), bt: $('btBar'), nz: $('noiseBar') };
function updateHUD() {
  const p = player;
  el.hp.style.width = (p.hp / p.maxHp * 100) + '%'; $('hpTxt').textContent = Math.ceil(p.hp);
  el.st.style.width = (p.stam / p.maxStam * 100) + '%'; el.st.style.background = p.exhausted ? '#a05030' : '#e0b83d';
  el.bt.style.width = (p.flash || p.batt > 0 ? p.batt : 0) + '%'; el.bt.style.opacity = p.flash ? 1 : 0.45;
  el.nz.style.width = clamp(p.noise / 42 * 100, 4, 100) + '%';
  el.nz.style.background = p.noise > 25 ? '#ff5a4a' : p.noise > 10 ? '#f0c14a' : '#8fe3a0';
  $('magTxt').textContent = p.reloadT > 0 ? '…' : p.mag; $('ammoTxt').textContent = bagCount('ammo');
  $('invTxt').textContent = `🍞${bagCount('food')}  💊${bagCount('meds')}  🩹${bagCount('band')}  🔩${bagCount('scrap')}  🔋${bagCount('batt')}${p.hasKey ? '  💳' : ''}  · 🎒${p.bag.length}/${p.bagCap}`;
  $('objective').textContent = objective();
  const zk = lv.curZone && ZONES[lv.curZone];
  $('zoneInfo').innerHTML = zk ? `<span class="zonedot" style="background:${zk.color}"></span>${zk.name}` : '';
  const t = Math.floor(lv.time);
  $('sortieInfo').textContent = `Вылазка №${save.sorties + 1} · ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')} · бывших вокруг: ${lv.monsters.filter(m => !m.dead).length}`;
}

/* ====================== ИНВЕНТАРЬ: ИНТЕРФЕЙС ====================== */
const itemName = s => (s.id === 'note' ? NOTES[s.ref][0] : ITEMS[s.id].name);
function slotsHTML(list, cap, side) {
  let h = '';
  for (let i = 0; i < cap; i++) {
    const s = list[i];
    if (!s) { h += '<div class="slot empty"></div>'; continue; }
    const d = ITEMS[s.id], sel = invSel && invSel.side === side && invSel.idx === i;
    h += `<div class="slot ${sel ? 'sel' : ''} ${s.id === 'key' ? 'key' : ''}" data-slot="1" data-side="${side}" data-idx="${i}" title="${itemName(s)}">
      <span class="ic">${d.icon}</span>${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}<span class="nm">${itemName(s)}</span></div>`;
  }
  return h;
}
function renderInv() {
  const p = player, c = invCont;
  $('invTitle').textContent = c ? `🗄 ${c.name}` : '🎒 Инвентарь';
  $('bagCnt').textContent = `${p.bag.length} / ${p.bagCap} ячеек`;
  $('invBag').innerHTML = slotsHTML(p.bag, p.bagCap, 'bag');
  show('btnTakeAll', !!c && c.items.length > 0);
  if (c) {
    $('rightTitle').textContent = `🗄 ${c.name} · ${c.items.length}/${c.cap}`;
    $('invRight').innerHTML = `<div class="slots">${slotsHTML(c.items, c.cap, 'cont')}</div>`;
  } else {
    $('rightTitle').textContent = '🧍 Снаряжение';
    const zk = ZONES[lv.curZone] || ZONES.corridor;
    $('invRight').innerHTML = `
      <div class="stat"><span>❤ Здоровье</span><b>${Math.ceil(p.hp)} / ${p.maxHp}</b></div>
      <div class="stat"><span>⚡ Выносливость</span><b>${Math.round(p.stam)} / ${Math.round(p.maxStam)}</b></div>
      <div class="stat"><span>🔫 Пистолет 9 мм</span><b>${p.mag} / 8 + ${bagCount('ammo')}</b></div>
      <div class="stat"><span>🔧 Труба</span><b>ПКМ / V</b></div>
      <div class="stat"><span>🔦 Фонарь</span><b>${Math.round(p.batt)}% · ${p.flash ? 'вкл' : 'выкл'}</b></div>
      <div class="stat"><span>💳 Карта доступа</span><b>${p.vault ? 'использована' : p.hasKey ? 'есть' : 'нет'}</b></div>
      <div class="stat"><span>☠ Убито за вылазку</span><b>${p.kills}</b></div>
      <div class="stat"><span>📍 Местоположение</span><b style="color:${zk.color}">${zk.name}</b></div>
      <div class="text-xs text-white/50 mt-3">Подойдите к ящику, шкафу или телу и нажмите <kbd>E</kbd> — откроется содержимое. Игра на паузе, пока открыт инвентарь.</div>`;
  }
  // подробности
  let sel = null;
  if (invSel) { const list = invSel.side === 'bag' ? p.bag : (c ? c.items : null); sel = list && list[invSel.idx]; if (!sel) invSel = null; }
  let html;
  if (!sel) {
    html = invNote !== null
      ? `<div class="font-bold text-amber-200 mb-1">📄 ${NOTES[invNote][0]}</div><div class="text-white/85 leading-relaxed">${NOTES[invNote][1]}</div><div class="text-xs text-white/45 mt-2">Записка добавлена в дневник.</div>`
      : '<div class="text-white/50">Выберите предмет, чтобы увидеть описание и действия. Двойной клик — быстрое действие (использовать / переложить).</div>';
  } else {
    const d = ITEMS[sel.id], btn = [];
    if (invSel.side === 'bag') {
      if (d.use) btn.push(`<button class="btn sm main" data-act="use">${d.use}</button>`);
      if (c) { btn.push(`<button class="btn sm" data-act="move">⇨ Положить${sel.n > 1 ? ' всё' : ''}</button>`); if (sel.n > 1) btn.push('<button class="btn sm" data-act="move1">⇨ Положить 1</button>'); }
      if (sel.id !== 'key') btn.push('<button class="btn sm danger" data-act="drop">🗑 Выбросить</button>');
    } else {
      btn.push(`<button class="btn sm main" data-act="move">${sel.id === 'note' ? '📖 Прочитать' : '⇦ Взять' + (sel.n > 1 ? ' всё' : '')}</button>`);
      if (sel.n > 1) btn.push('<button class="btn sm" data-act="move1">⇦ Взять 1</button>');
    }
    html = `<div class="flex gap-3 items-start"><div class="text-4xl">${d.icon}</div><div class="flex-1">
      <div class="font-bold">${itemName(sel)}${sel.n > 1 ? ` <span class="text-white/60">×${sel.n}</span>` : ''}${sel.n > 1 || d.max > 1 ? `<span class="text-white/40 text-xs"> · стек до ${d.max}</span>` : ''}</div>
      <div class="text-white/65 text-xs my-1">${d.desc}</div><div class="flex flex-wrap gap-2 mt-2">${btn.join('')}</div></div></div>`;
  }
  $('invDetail').innerHTML = html;
}
function openInventory(cont) {
  if (state !== 'sortie' || invOpen) return;
  running = false; invOpen = true; invCont = cont || null; invSel = null; invNote = null;
  Object.keys(keys).forEach(k => keys[k] = false);
  player.prog = 0; show('prompt', false);
  if (document.pointerLockElement) document.exitPointerLock();
  if (cont) { sfx.open(); }
  show('scr-inv'); renderInv();
}
function closeInventory() {
  if (!invOpen) return;
  invOpen = false; invCont = null; invSel = null; show('scr-inv', false);
  if (state === 'sortie') resumeGame();
}
function takeFromCont(idx, amount) {
  const p = player, c = invCont, s = c && c.items[idx]; if (!s) return;
  if (s.id === 'note') { recordNote(s.ref); c.items.splice(idx, 1); invSel = null; sfx.pick(); updateLed(c); invChanged(); return; }
  const id = s.id, moved = moveStack(c.items, p.bag, p.bagCap, idx, amount || s.n);
  if (!moved) { toast('Рюкзак полон — освободите ячейку', 'bad'); return; }
  p.loot[id] = (p.loot[id] || 0) + moved;
  if (id === 'key') { toast('Карта доступа получена', 'good'); }
  sfx.pick(); updateLed(c);
  if (!c.items[idx] || c.items[idx].id !== id) invSel = null;
  invChanged();
}
function storeToCont(idx, amount) {
  const p = player, c = invCont, s = p.bag[idx]; if (!s || !c) return;
  const id = s.id, moved = moveStack(p.bag, c.items, c.cap, idx, amount || s.n);
  if (!moved) { toast('В контейнере нет места', 'bad'); return; }
  sfx.click(); updateLed(c);
  if (!p.bag[idx] || p.bag[idx].id !== id) invSel = null;
  invChanged();
}
function useBagItem(idx) {
  const p = player, s = p.bag[idx]; if (!s) return;
  const id = s.id;
  if (id === 'food' || id === 'meds' || id === 'band') {
    if (p.hp >= p.maxHp) { toast('Здоровье полное', 'info'); return; }
    bagRemove(id, 1); applyHeal(id);
  } else if (id === 'batt') {
    if (p.batt > 90) { toast('Фонарь ещё заряжен', 'info'); return; }
    bagRemove(id, 1); p.batt = 100; p.flash = true; toast('Батарея фонаря заменена', 'good'); sfx.pick();
  } else if (id === 'ammo') {
    if (p.mag >= 8) { toast('Магазин полон', 'info'); return; }
    reload(); toast('Перезарядка…', 'info'); closeInventory(); return;
  } else return;
  if (!p.bag[idx] || p.bag[idx].id !== id) invSel = null;
  invChanged();
}
function invAction(act) {
  const p = player;
  if (act === 'close') return closeInventory();
  if (act === 'takeall') {
    if (!invCont) return;
    for (let i = 0; i < invCont.items.length;) {
      const before = invCont.items.length;
      takeFromCont(i, 0);
      if (invCont.items.length >= before) i++;   // стек остался (не влез) — идём дальше
    }
    invSel = null; renderInv(); return;
  }
  if (!invSel) return;
  const { side, idx } = invSel;
  if (act === 'use') useBagItem(idx);
  else if (act === 'drop') { const s = p.bag[idx]; if (s && s.id !== 'key') { p.bag.splice(idx, 1); invSel = null; sfx.click(); toast('Выброшено: ' + itemName(s), 'info'); invChanged(); } }
  else if (act === 'move') { if (side === 'cont') takeFromCont(idx, 0); else storeToCont(idx, 0); }
  else if (act === 'move1') { if (side === 'cont') takeFromCont(idx, 1); else storeToCont(idx, 1); }
  renderInv();
}
$('scr-inv').addEventListener('click', e => {
  const s = e.target.closest('[data-slot]');
  if (s) { invSel = { side: s.dataset.side, idx: +s.dataset.idx }; sfx.click(); renderInv(); return; }
  const b = e.target.closest('[data-act]'); if (b) invAction(b.dataset.act);
});
$('scr-inv').addEventListener('dblclick', e => {
  const s = e.target.closest('[data-slot]'); if (!s) return;
  invSel = { side: s.dataset.side, idx: +s.dataset.idx };
  if (s.dataset.side === 'cont') invAction('move');
  else if (invCont) invAction('move');
  else invAction('use');
});

/* ---------- Освещение: пул ближайших ламп, мерцание, шлюз ---------- */
function updateLamps(dt, t) {
  const p = player, ls = lv.lamps, pool = lv.pool;
  for (const l of ls) l.d = (l.x - p.x) ** 2 + (l.z - p.z) ** 2;
  const want = ls.slice().sort((a, b) => a.d - b.d).slice(0, pool.length), wset = new Set(want);
  for (const s of pool) if (s.lamp && !wset.has(s.lamp)) { s.f -= dt * 3; if (s.f <= 0) { s.f = 0; s.lamp = null; } }
  for (const l of want) if (!pool.some(s => s.lamp === l)) {
    const s = pool.find(q => !q.lamp);
    if (s) { s.lamp = l; s.f = 0; s.L.color.setHex(l.color); s.L.position.set(l.x, l.y, l.z); }
  }
  for (const s of pool) {
    const l = s.lamp; if (!l) { s.L.intensity = 0; continue; }
    if (wset.has(l)) s.f = Math.min(1, s.f + dt * 3);
    let k = 1;
    if (l.red) k = 0.45 + 0.55 * Math.abs(Math.sin(t * 2.2 + l.ph));
    else if (l.bad) { k = Math.random() < 0.06 ? 0.1 : (Math.sin(t * 30 + l.ph) > 0.97 ? 0.3 : 1); l.mesh.material.color.setHex(k < 0.5 ? 0x2a2a2a : l.color); }
    s.L.intensity = l.base * k * s.f;
  }
  const pulse = 0.65 + 0.35 * Math.sin(t * 2.4);
  lv.door.light.intensity = 14 + 16 * pulse; lv.door.lamp.scale.setScalar(0.8 + 0.3 * pulse);
  lv.dust.update(t, p.x, p.z);
}

/* ====================== ГЛАВНОЕ ОБНОВЛЕНИЕ ====================== */
function nearestItem() {
  const p = player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  let best = null, bd = 2.6;
  for (const it of lv.items) {
    const dx = it.x - p.x, dz = it.z - p.z, d = Math.hypot(dx, dz);
    const lim = it.kind === 'door' ? 3.2 : bd;
    if (d < lim && (d < 1.2 || (dx * fx + dz * fz) / d > 0.35) && d < bd + (it.kind === 'door' ? 0.6 : 0)) { best = it; bd = d; }
  }
  return best;
}
function update(dt) {
  const p = player; time += dt; lv.time += dt;
  if (keys.ArrowLeft) p.yaw += 2 * dt; if (keys.ArrowRight) p.yaw -= 2 * dt;
  if (keys.ArrowUp) p.pitch = clamp(p.pitch + 1.5 * dt, -1.4, 1.4); if (keys.ArrowDown) p.pitch = clamp(p.pitch - 1.5 * dt, -1.4, 1.4);
  p.crouch = !!keys.KeyC;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const moving = f !== 0 || s !== 0;
  const wantSprint = (keys.ShiftLeft || keys.ShiftRight) && moving && !p.crouch;
  if (p.exhausted && p.stam > 30) p.exhausted = false;
  const sprinting = wantSprint && !p.exhausted && p.stam > 0;
  const sp = p.crouch ? 1.9 : sprinting ? 6.2 : 3.7;
  let tx = 0, tz = 0;
  if (moving) {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    tx = fx * f + rx * s; tz = fz * f + rz * s; const l = Math.hypot(tx, tz); tx = tx / l * sp; tz = tz / l * sp;
  }
  const k = Math.min(1, dt * 9); p.vx += (tx - p.vx) * k; p.vz += (tz - p.vz) * k;
  p.x += p.vx * dt; p.z += p.vz * dt; resolve(p, 0.38);
  const spd = Math.hypot(p.vx, p.vz);
  if (sprinting) { p.stam -= 26 * dt; if (p.stam <= 0) { p.stam = 0; p.exhausted = true; toast('Вы выдохлись!', 'bad'); } }
  else p.stam = Math.min(p.maxStam, p.stam + (moving ? 15 : 24) * dt);

  const base = moving ? (p.crouch ? 4 : sprinting ? 17 : 9) : 2;
  p.burst = Math.max(0, p.burst - 55 * dt);
  const noiseMul = 1 - 0.15 * p.boots;
  p.noise = Math.max(base * noiseMul, p.burst * (1 - 0.05 * p.boots));
  if (spd > 0.5) {
    p.stepT -= dt * spd;
    if (p.stepT <= 0) { p.stepT = 1.9; sfx.step(p.crouch ? 0.012 : sprinting ? 0.1 : 0.05); }
  }
  if (p.flash) {
    p.batt -= dt * 100 / p.battDur;
    if (p.batt <= 0) { p.batt = 0; if (!swapBattery()) { p.flash = false; toast('Фонарь разрядился!', 'bad'); } }
  }
  const flick = p.flash ? (p.batt < 20 ? (Math.random() < 0.15 ? 0.2 : 0.75) : 1) : 0;
  spot.intensity = 170 * flick;
  p.gunCD = Math.max(0, p.gunCD - dt); p.meleeCD = Math.max(0, p.meleeCD - dt); p.swingT = Math.max(0, p.swingT - dt);
  p.kick = Math.max(0, p.kick - dt * 7); p.flashT = Math.max(0, p.flashT - dt);
  if (p.reloadT > 0) {
    p.reloadT -= dt;
    if (p.reloadT <= 0) { const n = Math.min(8 - p.mag, bagCount('ammo')); p.mag += n; bagRemove('ammo', n); invChanged(); }
  }
  gunLight.intensity = p.flashT > 0 ? 70 : 0; muzzle.visible = p.flashT > 0;

  p.eye += ((p.crouch ? 1.05 : 1.65) - p.eye) * Math.min(1, dt * 8);
  p.bobT += spd * dt * 2.2;
  const bob = Math.sin(p.bobT) * 0.035 * Math.min(1, spd / 3.7);
  let shx = 0, shy = 0;
  if (p.shake > 0) { shx = rand(-1, 1) * p.shake * 0.05; shy = rand(-1, 1) * p.shake * 0.05; p.shake = Math.max(0, p.shake - dt * 2.5); }
  camera.position.set(p.x + shx, p.eye + bob + shy, p.z);
  camera.rotation.set(p.pitch, p.yaw, 0);
  const swingP = p.swingT > 0 ? 1 - p.swingT / 0.32 : 0;
  pistol.visible = p.swingT <= 0; pipe.visible = p.swingT > 0;
  if (p.swingT > 0) { pipe.position.set(0.05, -0.1, 0); pipe.rotation.set(-0.4 - Math.sin(swingP * Math.PI) * 1.2, 0.3 - swingP * 0.9, -0.6 + swingP * 1.2); }
  const rl = p.reloadT > 0 ? Math.sin((1 - p.reloadT / 1.3) * Math.PI) : 0;
  vm.position.set(0.22 + Math.sin(p.bobT * 0.5) * 0.008, -0.2 + Math.abs(Math.sin(p.bobT)) * 0.008 - rl * 0.18, -0.45 + p.kick * 0.07);
  vm.rotation.x = p.kick * 0.22 + rl * 0.5;

  // разведка карты и зона
  const cx = cellOf(p.x), cz = cellOf(p.z);
  lv.exp[cz][cx] = true;
  for (let d = 0; d < 4; d++) if (canGo(cx, cz, d)) lv.exp[cz + DZ[d]][cx + DX[d]] = true;
  const zk = lv.zone[cz * lv.N + cx];
  if (zk !== lv.curZone) { lv.curZone = zk; toast('📍 ' + ZONES[zk].name, 'info'); }

  // взаимодействие
  const it = nearestItem();
  const holding = keys.KeyE;
  if (it) {
    let txt, canHold = true;
    if (it.kind === 'door') txt = 'E (держать) — вернуться в убежище' + (p.vault ? ' (вылазка выполнена)' : '');
    else if (it.searched) { txt = `E — открыть: ${it.name} (${it.items.length ? it.items.length + ' предм.' : 'пусто'})`; canHold = false; }
    else if (it.vault && !p.hasKey) { txt = 'Хранилище заперто. Нужна карта доступа 💳'; canHold = false; }
    else txt = it.vault ? 'E (держать) — вскрыть хранилище картой' : `E (держать) — ${it.corpse ? 'обыскать' : 'обыскать'}: ${it.name}`;
    $('promptText').textContent = txt; show('prompt');
    if (holding && canHold) {
      p.prog += dt / it.time; p.burst = Math.max(p.burst, it.vault ? 14 : 8);
      if (p.prog >= 1) {
        p.prog = 0;
        if (it.kind === 'door') { sfx.door(); endSortie('return'); return; }
        it.searched = true;
        if (it.vault) { bagRemove('key', 1); invChanged(); p.vault = true; toast('Хранилище вскрыто! Карта использована', 'good'); }
        updateLed(it); openInventory(it); return;
      }
    } else p.prog = Math.max(0, p.prog - dt * 2);
    $('promptBar').style.width = (p.prog * 100) + '%';
  } else { show('prompt', false); p.prog = 0; }
  for (const c of lv.items) if (c.kind === 'box' && c.vault && !c.searched) updateLed(c);

  let danger = 0;
  for (const m of lv.monsters) {
    updateMonster(m, dt);
    if (!m.dead && m.state === 'chase') danger = Math.max(danger, clamp(1 - Math.hypot(m.x - p.x, m.z - p.z) / 16, 0, 1));
  }
  $('danger').style.opacity = danger * 0.7;
  p.heartT -= dt;
  if (danger > 0.25 && p.heartT <= 0) { p.heartT = 1.15 - danger * 0.65; sfx.heart(0.3 + danger * 0.5); }
  lv.spawnT -= dt;
  const alive = lv.monsters.filter(m => !m.dead).length;
  if (lv.spawnT <= 0) {
    lv.spawnT = 75;
    if (alive < 12) {
      for (let tries = 0; tries < 20; tries++) {
        const x = (ri(0, lv.N - 1) + 0.5) * CELL, z = (ri(0, lv.N - 1) + 0.5) * CELL;
        if (Math.hypot(x - p.x, z - p.z) > 22 && !losClear(x, z, p.x, p.z)) {
          const m = spawnMonster(pickType(), x, z); m.state = 'investigate'; m.tx = p.x; m.tz = p.z; m.arrived = false;
          toast('Где-то хлопнула гермодверь...', 'bad'); break;
        }
      }
    }
  }
  updateLamps(dt, time);
  lv.ambT -= dt;
  if (lv.ambT <= 0) {
    lv.ambT = rand(12, 28); const pan = rand(-1, 1);
    if (Math.random() < 0.5) { tone(rand(120, 220), 0.9, 'square', 0.04, -40, pan); noise(0.5, 0.05, 800, pan); }
    else growl(rand(22, 30), pan, 1.2);
  }
  updateParts(dt);
  if (Math.floor(time * 5) !== Math.floor((time - dt) * 5)) drawMini();
  updateHUD();
}

/* ====================== ВЫЛАЗКА: СТАРТ / КОНЕЦ ====================== */
function startSortie() {
  const fed = save.food > 0; if (fed) save.food--;
  const p = player, up = save.up;
  p.maxHp = 100 + 20 * up.hp; if (!fed) p.maxHp = Math.round(p.maxHp * 0.65);
  p.hp = p.maxHp; p.maxStam = 100 * (1 + 0.25 * up.stam); p.stam = p.maxStam; p.exhausted = false;
  p.battDur = 150 * (1 + 0.3 * up.light); p.batt = 100; p.flash = true; p.boots = up.boots;
  const meds = Math.min(save.meds, 2), band = Math.min(save.band, 2), batt = Math.min(save.batt, 2), ammo = Math.min(save.ammo, 24);
  save.meds -= meds; save.band -= band; save.batt -= batt; save.ammo -= ammo; store();
  p.mag = Math.min(8, ammo);
  p.bagCap = 8 + 2 * up.bag; p.bag = [];
  bagAdd('meds', meds); bagAdd('band', band); bagAdd('batt', batt); bagAdd('ammo', ammo - p.mag);
  p.loot = {}; p.hasKey = false; p.vault = false; p.kills = 0;
  p.vx = p.vz = 0; p.noise = 2; p.burst = 0; p.reloadT = 0; p.prog = 0; p.shake = 0;
  invOpen = false; invCont = null; invSel = null; invNote = null; show('scr-inv', false);
  leaveHubScene();
  buildLevel();
  p.x = CELL / 2; p.z = CELL / 2; p.yaw = -Math.PI / 2; p.pitch = 0;
  lv.exp[0][0] = true; lv.curZone = 'airlock'; lv.dust.reset(p.x, p.z);
  state = 'sortie'; running = false;
  hideHubUI(); show('scr-menu', false); show('scr-result', false);
  show('hud'); show('vig'); show('prompt', false); show('noteBox', false);
  $('toasts').innerHTML = '';
  const sector = pick(SECTORS) + '-' + ri(2, 29);
  openLock(`Вылазка №${save.sorties + 1}`,
    `Сеть бункеров, сектор ${sector}. Коридоры разделены гермопроёмами на зоны: жилые блоки, медпункты, склады, серверные… В каждой — своя добыча. Найдите 💳 карту доступа, откройте хранилище и вернитесь к зелёному шлюзу. <b>Tab</b> — инвентарь, <b>E</b> — обыск.` +
    (fed ? '' : ' <br><span style="color:#ff8c80">Вы голодны: здоровье снижено.</span>'), 'Начать вылазку');
  if (save.day === 1) setTimeout(() => { if (state === 'sortie') toast('Подсказка: красться (C) — тише, бег (Shift) — слышно далеко', 'info'); }, 4000);
  camera.position.set(p.x, p.eye, p.z); camera.rotation.set(0, p.yaw, 0);
  drawMini(); updateHUD();
}
function endSortie(kind) {
  const p = player;
  running = false; state = 'result'; invOpen = false; show('scr-inv', false);
  if (document.pointerLockElement) document.exitPointerLock();
  show('lockHint'); show('scr-lock', false); show('hud', false); show('vig', false);
  $('danger').style.opacity = 0;
  let title, emoji, html = '';
  const carried = {};
  for (const s of p.bag) if (STASH_KEYS.includes(s.id)) carried[s.id] = (carried[s.id] || 0) + s.n;
  if (p.mag > 0) carried.ammo = (carried.ammo || 0) + p.mag;
  const fmt = o => Object.entries(o).filter(([, n]) => n > 0).map(([k, n]) => `${LABELS[k]} ×${n}`).join(' · ') || 'ничего';
  if (kind === 'return') {
    for (const k of STASH_KEYS) save[k] += carried[k] || 0;
    title = 'Вы вернулись!'; emoji = '🚪';
    html = `<p>Шлюз захлопнулся за спиной. Остальные встретили вас молча — и с надеждой.</p>
      <p class="mt-3">Найдено за вылазку: <b>${fmt(p.loot)}</b></p>
      <p>Сдано на склад: <b>${fmt(carried)}</b></p>
      <p>Убито бывших: <b>${p.kills}</b></p>
      <p>${p.vault ? '✅ Хранилище вскрыто.' : '❌ Хранилище осталось закрытым.'}</p>`;
  } else if (kind === 'dead') {
    save.deaths++; title = 'Вы погибли'; emoji = '💀';
    html = `<p>Бывшие нашли вас в темноте. Товарищи вытащили тело через шлюз, но всё снаряжение и добыча потеряны.</p>
      <p class="mt-3">Потеряно: <b>${fmt(carried)}</b></p><p>Убито бывших: <b>${p.kills}</b></p>`;
  } else {
    title = 'Вылазка прервана'; emoji = '🏃';
    html = `<p>Вы бросили вылазку и добрались до шлюза. Всё, что несли с собой, осталось в коридорах.</p>`;
  }
  save.day++; save.sorties++; store();
  $('resEmoji').textContent = emoji; $('resTitle').textContent = title; $('resBody').innerHTML = html;
  show('scr-result');
}

/* ====================== ЭКРАНЫ ====================== */
function openLock(title, text, btn) {
  $('lockTitle').textContent = title; $('lockText').innerHTML = text; $('btnLockGo').textContent = btn;
  $('lockHint').textContent = ''; show('scr-lock');
}
function pauseGame() {
  if (state !== 'sortie' || !running) return;
  running = false; Object.keys(keys).forEach(k => keys[k] = false);
  openLock('Пауза', 'Бывшие тоже замерли — но только пока вы не вернётесь.', 'Продолжить');
  if (document.pointerLockElement) document.exitPointerLock();
}
function resumeGame() {
  initAudio();
  if (fallback) { running = true; show('scr-lock', false); return; }
  try { const r = dom.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { fallback = true; running = true; show('scr-lock', false); }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === dom;
  if (state === 'hub') { if (locked) lockErrors = 0; else if (hubMode === 'walk' && !fallback) hubPause(); return; }
  if (locked) { lockErrors = 0; running = true; show('scr-lock', false); }
  else if (running && state === 'sortie') pauseGame();
});
document.addEventListener('pointerlockerror', () => {
  lockErrors++;
  if (state === 'hub') { if (lockErrors >= 2) { fallback = true; hubSetMode('walk'); show('scr-hubpause', false); } else hubPause(); return; }
  if (state !== 'sortie' || invOpen) return;
  if (lockErrors >= 2) { fallback = true; running = true; show('scr-lock', false); toast('Захват мыши недоступен: используйте мышь/стрелки для обзора', 'info'); }
  else {
    if ($('scr-lock').classList.contains('off')) openLock('Пауза', 'Нажмите «Продолжить», чтобы вернуться в игру.', 'Продолжить');
    $('lockHint').textContent = 'Не удалось захватить мышь. Нажмите ещё раз через секунду.';
  }
});
$('btnLockGo').onclick = resumeGame;
$('btnLockQuit').onclick = () => { if (state === 'sortie') endSortie('abandon'); };
addEventListener('blur', () => pauseGame());

/* ====================== УБЕЖИЩЕ: 3D-КОМНАТА ====================== */
let hub = null, hubMode = 'pause', hubNear = null, hubStation = null;
const hp = { x: 5.5, z: 7.3, yaw: 0, pitch: 0, vx: 0, vz: 0, bobT: 0, stepT: 0 };
const REST_LINES = [
  'Матрас пахнет сыростью и хозяйственным мылом. Где-то за стеной тихо гудит генератор — этот звук уже стал колыбельной. Ты закрываешь глаза и считаешь шаги до шлюза. Девяносто три.',
  'Над головой мигает гирлянда, которую сделали дети. Ты вспоминаешь коридоры сети и стараешься не вспоминать, как светились глаза в темноте. Получается плохо, но ты всё равно засыпаешь.',
  'Медведь на подушке смотрит на тебя пластиковыми глазами. Кто-то из малышей оставил его «охранять». Ты усмехаешься и обещаешь вернуться с вылазки с консервами.',
  'Часы на стене тикают ровно. Единственный звук в убежище, который не вызывает тревоги. Ты отдыхаешь — ровно столько, сколько позволяет совесть.',
  'Сон приходит быстро и без снов. Это лучшее, что можно получить в мире, где за дверью бродят Бывшие. Утром — снова за шлюз.',
  'Ты слышишь, как Матвей за стеной разговаривает с радио. Оно отвечает шипением. Старик говорит, что это «почти как человек». Ты накрываешься одеялом с головой.'
];
const PROMPTS = {
  bench: 'Верстак — мастерская и улучшения',
  bed: 'Кровать — отдохнуть',
  table: 'Стол — записи и сводка',
  shelf: 'Стеллаж — запасы убежища',
  door: 'Шлюз — выйти на вылазку'
};
const STATION_TITLES = { bench: '🛠 Верстак', bed: '🛏 Кровать', table: '📖 Стол — записи и сводка', shelf: '📦 Стеллаж — запасы убежища' };

function hideHubUI() {
  show('hubhud', false); show('scr-hubpause', false); show('scr-station', false);
  $('hfade').style.opacity = 0;
}
function hubSetMode(m) {
  hubMode = m; show('hcross', m === 'walk');
  if (m !== 'walk') { Object.keys(keys).forEach(k => keys[k] = false); show('hPrompt', false); }
}
function enterHubScene() {
  if (!hub) hub = createHubRoom();
  disposeLevel();
  scene.add(hub.group);
  scene.background = new THREE.Color(0x080605); scene.fog = null;
  ambient.color.set(0xffe2bd); ambient.intensity = 1.4;
  vm.visible = false; spot.visible = false; gunLight.visible = false;
  hub.refresh(save);
  const s = hub.spawn; hp.x = s.x; hp.z = s.z; hp.yaw = s.yaw; hp.pitch = s.pitch; hp.vx = hp.vz = 0;
  camera.position.set(hp.x, 1.65, hp.z); camera.rotation.set(hp.pitch, hp.yaw, 0);
}
function leaveHubScene() {
  if (hub) scene.remove(hub.group);
  scene.background = new THREE.Color(FOG_COL); scene.fog = new THREE.FogExp2(FOG_COL, FOG_DENS);
  ambient.color.set(AMB_COL); ambient.intensity = AMB_INT;
  vm.visible = true; spot.visible = true; gunLight.visible = true;
}
function renderHubHud() {
  $('hubDay').textContent = save.day; $('hSort').textContent = save.sorties; $('hKills').textContent = save.kills; $('hDeaths').textContent = save.deaths;
  $('hubChips').innerHTML = STASH_KEYS.map(k => `<span class="chip" title="${LABELS[k]}">${ITEMS[k].icon} <b>${save[k]}</b></span>`).join('');
}
function hubResume() {
  initAudio();
  show('scr-hubpause', false); show('scr-station', false);
  hubSetMode('walk');
  if (fallback) return;
  try { const r = dom.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { fallback = true; }
}
function hubPause() {
  if (state !== 'hub' || hubMode === 'busy') return;
  hubSetMode('pause');
  $('hpDay').textContent = save.day;
  $('hubText').textContent = HUB_LINES[Math.min(HUB_LINES.length - 1, Math.floor((save.day - 1) / 2))];
  show('scr-hubpause');
}

/* ---------- Панели станций ---------- */
const upCard = k => {
  const u = UPS[k], l = save.up[k], maxed = l >= u.max, cost = u.cost(l);
  const pips = Array.from({ length: u.max }, (_, i) => `<span class="pip ${i < l ? 'on' : ''}"></span>`).join('');
  return `<div class="up"><div class="flex justify-between items-center"><b class="text-sm">${u.name}</b><span>${pips}</span></div>
    <div class="text-xs text-white/55 my-1">${u.desc}</div>
    <button class="btn sm" data-act="up" data-id="${k}" ${maxed || save.scrap < cost ? 'disabled' : ''}>${maxed ? 'Максимум' : 'Улучшить · ' + cost + ' 🔩'}</button></div>`;
};
function stationHTML(id) {
  if (id === 'bench') {
    const craft = CRAFT.map(c => `<button class="btn sm" style="width:100%" data-act="craft" data-id="${c.id}" ${save.scrap < c.cost ? 'disabled' : ''}>${c.name}</button>`).join('');
    return `<div class="grid md:grid-cols-2 gap-4">
      <div><div class="chip mb-3">🔩 Металлолом: <b>${save.scrap}</b></div>
        <h3 class="font-bold mb-2 text-sm text-emerald-300">🛠 Мастерская</h3><div class="space-y-2">${craft}</div>
        <p class="text-xs text-white/45 mt-3">Металлолом приносят с вылазок. Из него выходят патроны, бинты, аптечки и батареи.</p></div>
      <div><h3 class="font-bold mb-2 text-sm text-emerald-300">⬆ Улучшения</h3><div class="space-y-2" style="max-height:60vh;overflow:auto">${Object.keys(UPS).map(upCard).join('')}</div></div></div>`;
  }
  if (id === 'table') {
    const jr = save.notes.length
      ? save.notes.map(i => `<div class="noteitem" data-act="note" data-id="${i}">📄 ${NOTES[i][0]}</div>`).join('')
      : '<div class="text-white/45 text-sm">Пока пусто. Записки найдутся в ящиках и хранилищах. Всего их ' + NOTES.length + '.</div>';
    return `<div class="grid md:grid-cols-2 gap-4">
      <div><h3 class="font-bold mb-2 text-sm text-emerald-300">📻 Сводка дня ${save.day}</h3>
        <p class="text-sm text-white/80 leading-relaxed">${HUB_LINES[Math.min(HUB_LINES.length - 1, Math.floor((save.day - 1) / 2))]}</p></div>
      <div><h3 class="font-bold mb-2 text-sm text-emerald-300">📖 Дневник находок <span class="text-white/50 text-xs">(${save.notes.length} / ${NOTES.length})</span></h3>
        <div style="max-height:11rem;overflow:auto">${jr}</div>
        <div id="stNote" class="text-sm text-white/80 mt-2 leading-relaxed"></div></div></div>`;
  }
  if (id === 'shelf') {
    const cap = 8 + 2 * save.up.bag;
    return `<div class="grid md:grid-cols-2 gap-4">
      <div>${STASH_KEYS.map(k => `<div class="stat"><span>${LABELS[k]}</span><b>${save[k]}</b></div>`).join('')}</div>
      <div class="text-sm">${save.food > 0
        ? `<span class="text-white/60">Рацион: −1 🍞 перед вылазкой. С собой: до 2 аптечек, 2 бинтов, 2 батарей и 24 патронов.</span>`
        : `<span style="color:#ff8c80">Еды нет! Вы выйдете голодным: −35% к здоровью.</span>`}
        <div class="text-white/60 mt-2">🎒 Рюкзак: <b>${cap}</b> ячеек.</div>
        <p class="text-xs text-white/45 mt-3">Банки, аптечки, патроны и батареи на полках соответствуют вашим запасам.</p></div></div>`;
  }
  if (id === 'bed') {
    return `<div class="grid md:grid-cols-2 gap-4">
      <div>
        <div class="stat"><span>День</span><b>${save.day}</b></div>
        <div class="stat"><span>Вылазок</span><b>${save.sorties}</b></div>
        <div class="stat"><span>Убито бывших</span><b>${save.kills}</b></div>
        <div class="stat"><span>Потерь</span><b>${save.deaths}</b></div>
        <button class="btn main mt-4" data-act="rest">😴 Прилечь и отдохнуть</button></div>
      <div><div id="stRest" class="rest-text">Узкая кровать у стены. Единственное место в убежище, где можно ненадолго забыть о коридорах.</div></div></div>`;
  }
  return '';
}
function renderStation() { if (hubStation) $('stBody').innerHTML = stationHTML(hubStation); }
function openStation(id) {
  hubStation = id; hubSetMode('panel');
  if (document.pointerLockElement) document.exitPointerLock();
  $('stTitle').textContent = STATION_TITLES[id]; renderStation();
  show('scr-station'); sfx.open();
}
function closeStation() {
  if (hubMode !== 'panel') return;
  hubStation = null; show('scr-station', false); hubResume();
}
$('stClose').onclick = closeStation;
$('scr-station').addEventListener('click', e => {
  if (e.target === $('scr-station')) { closeStation(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  let changed = false;
  if (act === 'craft') {
    const c = CRAFT.find(x => x.id === id);
    if (save.scrap >= c.cost) { save.scrap -= c.cost; for (const k in c.give) save[k] += c.give[k]; changed = true; sfx.pick(); }
  } else if (act === 'up') {
    const u = UPS[id], l = save.up[id], cost = u.cost(l);
    if (l < u.max && save.scrap >= cost) { save.scrap -= cost; save.up[id]++; changed = true; sfx.heal(); }
  } else if (act === 'note') {
    $('stNote').innerHTML = `<b class="text-amber-200">${NOTES[id][0]}</b><br>${NOTES[id][1]}`; sfx.click();
  } else if (act === 'rest') {
    const f = $('hfade'); f.style.opacity = 1; sfx.heal();
    setTimeout(() => { const r = $('stRest'); if (r) r.textContent = pick(REST_LINES); f.style.opacity = 0; }, 900);
  }
  if (changed) { store(); renderStation(); hub.refresh(save); renderHubHud(); }
});

/* ---------- Взаимодействие, ввод, обновление ---------- */
function hubInteract() {
  if (hubMode !== 'walk' || !hubNear) return;
  if (hubNear.id === 'door') {
    hubSetMode('busy'); initAudio(); sfx.door();
    if (document.pointerLockElement) document.exitPointerLock();
    const f = $('hfade'); f.style.opacity = 1;
    setTimeout(() => { if (state !== 'hub') return; startSortie(); f.style.opacity = 0; }, 850);
    return;
  }
  openStation(hubNear.id);
}
function hubKey(e) {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (hubMode === 'panel') { if (e.code === 'Escape' || e.code === 'KeyE') closeStation(); return; }
  if (hubMode !== 'walk') return;
  keys[e.code] = true;
  if (e.code === 'KeyE') hubInteract();
  else if (e.code === 'Escape' && fallback) hubPause();
}
function updateHub(dt) {
  time += dt; const p = hp;
  let spd = 0;
  if (hubMode === 'walk') {
    if (keys.ArrowLeft) p.yaw += 2 * dt; if (keys.ArrowRight) p.yaw -= 2 * dt;
    if (keys.ArrowUp) p.pitch = clamp(p.pitch + 1.5 * dt, -1.4, 1.4); if (keys.ArrowDown) p.pitch = clamp(p.pitch - 1.5 * dt, -1.4, 1.4);
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const sp = (keys.ShiftLeft || keys.ShiftRight) ? 4.6 : 2.9;
    let tx = 0, tz = 0;
    if (f || s) {
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
      tx = fx * f + rx * s; tz = fz * f + rz * s; const l = Math.hypot(tx, tz); tx = tx / l * sp; tz = tz / l * sp;
    }
    const k = Math.min(1, dt * 9); p.vx += (tx - p.vx) * k; p.vz += (tz - p.vz) * k;
  } else { const k = Math.min(1, dt * 9); p.vx -= p.vx * k; p.vz -= p.vz * k; }
  p.x += p.vx * dt; p.z += p.vz * dt; hub.collide(p, 0.34);
  spd = Math.hypot(p.vx, p.vz);
  if (spd > 0.5) { p.stepT -= dt * spd; if (p.stepT <= 0) { p.stepT = 1.9; sfx.step(0.03); } }
  p.bobT += spd * dt * 2.2;
  const bob = Math.sin(p.bobT) * 0.03 * Math.min(1, spd / 2.9);
  camera.position.set(p.x, 1.65 + bob, p.z); camera.rotation.set(p.pitch, p.yaw, 0);

  let near = null;
  if (hubMode === 'walk') {
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); let bd = 1e9;
    for (const st of hub.stations) {
      const d = Math.hypot(st.x - p.x, st.z - p.z); if (d >= st.reach) continue;
      const mx = st.marker[0] - p.x, mz = st.marker[2] - p.z, md = Math.hypot(mx, mz) || 1;
      if ((md < 1.1 || (mx * fx + mz * fz) / md > 0.35) && d < bd) { near = st; bd = d; }
    }
  }
  hubNear = near;
  if (near) {
    let txt = PROMPTS[near.id];
    if (near.id === 'door' && save.food <= 0) txt += ' (без еды!)';
    $('hPromptText').textContent = txt;
    $('hPrompt').firstElementChild.classList.toggle('go', near.id === 'door');
    show('hPrompt');
  } else show('hPrompt', false);
  hub.update(time, dt, near ? near.id : null);
}

function goHub() {
  state = 'hub'; running = false; invOpen = false;
  show('scr-menu', false); show('scr-result', false); show('scr-lock', false); show('scr-inv', false); show('hud', false); show('vig', false);
  $('danger').style.opacity = 0; $('dmg').style.opacity = 0;
  if (document.pointerLockElement) document.exitPointerLock();
  enterHubScene();
  hideHubUI(); show('hubhud'); renderHubHud();
  hubStation = null; hubSetMode('pause'); hubPause();
}
function goMenu() {
  state = 'menu'; hideHubUI(); show('scr-result', false); show('scr-menu');
  if (document.pointerLockElement) document.exitPointerLock();
  show('btnContinue', !!save);
}

$('btnContinue').onclick = () => { initAudio(); goHub(); };
$('btnNew').onclick = () => {
  if (save && !confirm('Начать заново? Текущее сохранение будет удалено.')) return;
  save = JSON.parse(JSON.stringify(DEF_SAVE)); store(); initAudio(); goHub();
};
$('btnHelp').onclick = () => $('helpBox').classList.toggle('off');
$('hubMenu').onclick = goMenu;
$('hubEnter').onclick = hubResume;
$('btnResult').onclick = goHub;

/* ====================== ВВОД ====================== */
addEventListener('keydown', e => {
  if (state === 'hub') { hubKey(e); return; }
  if (state !== 'sortie') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (invOpen) {
    if (e.code === 'Escape' || e.code === 'Tab' || e.code === 'KeyI') closeInventory();
    return;
  }
  keys[e.code] = true;
  if (!running) return;
  if (e.code === 'Tab' || e.code === 'KeyI') openInventory(null);
  else if (e.code === 'KeyE') { const it = nearestItem(); if (it && it.kind === 'box' && it.searched) openInventory(it); }
  else if (e.code === 'KeyF') toggleFlash();
  else if (e.code === 'KeyR') reload();
  else if (e.code === 'KeyH') heal();
  else if (e.code === 'KeyV') melee();
  else if (e.code === 'Escape' && fallback) pauseGame();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('mousemove', e => {
  if (state === 'hub') {
    if (hubMode !== 'walk' || !(locked || fallback)) return;
    hp.yaw -= (e.movementX || 0) * 0.0022; hp.pitch = clamp(hp.pitch - (e.movementY || 0) * 0.0022, -1.4, 1.4);
    return;
  }
  if (state !== 'sortie' || !running || !(locked || fallback)) return;
  const p = player;
  p.yaw -= (e.movementX || 0) * 0.0022; p.pitch = clamp(p.pitch - (e.movementY || 0) * 0.0022, -1.45, 1.45);
});
addEventListener('mousedown', e => {
  if (state !== 'sortie' || !running) return;
  if (e.button === 0) shoot(); else if (e.button === 2) melee();
});
addEventListener('contextmenu', e => e.preventDefault());

/* ====================== ЦИКЛ ====================== */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'hub') { updateHub(dt); renderer.render(scene, camera); return; }
  if (state !== 'sortie' || !lv) return;
  if (running) update(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

show('btnContinue', !!save);
}
