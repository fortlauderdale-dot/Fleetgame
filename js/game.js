// game.js — City Fleet Manager main module.
// Scene + simulation + economy + events + raccoons + UI. No build step, no saves, no mercy.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { asphaltTexture, sandTexture, grassTexture, waterTexture, preferFile } from './textures.js';
import { BUILDERS, buildRaccoon } from './vehicles.js';
import { buildGarage, buildFuelCanopy, buildPalm, buildDumpster, buildLightPole, buildAdminTrailer, buildGate, buildFence } from './props.js';

/* ============================== DATA ============================== */
const TYPES = {
  pickup:     { label: 'Utility Pickup',  dept: 'Public Works',    price: 38000,  fph: 2,   wph: 0.5,  sph: 6,  gal: 0.35 },
  sedan:      { label: 'Inspector Sedan', dept: 'Streets',      price: 26000,  fph: 1, wph: 0.35, sph: 4,  gal: 0.25 },
  sweeper:    { label: 'Street Sweeper',  dept: 'Stormwater',      price: 120000, fph: 4,   wph: 0.8,  sph: 14, gal: 0.7 },
  sanitation: { label: 'Garbage Truck',dept: 'Sanitation',   price: 180000, fph: 5,  wph: 0.9,  sph: 20, gal: 0.9 },
  tractor:    { label: 'Beach Tractor',   dept: 'Beach', price: 95000,  fph: 3,   wph: 1.0,  sph: 12, gal: 0.6 },
  bucket:     { label: 'Bucket Truck',    dept: 'Public Works',    price: 145000, fph: 3,   wph: 0.6,  sph: 15, gal: 0.7 },
  pump:       { label: 'Vac Truck',      dept: 'Stormwater',   price: 160000, fph: 2,   wph: 0.7,  sph: 14, gal: 0.8 },
  evvan:      { label: 'Electric Van',    dept: 'Public Works',    price: 52000,  fph: 2,   wph: 0.3,  sph: 8,  gal: 0, ev: true, needs: 'evcharger' },
};
const DEPTS = {
  'Sanitation':   { base: 24, station: 4 },
  'Streets':      { base: 18, station: 3 },
  'Public Works':    { base: 16, station: 2 },
  'Beach': { base: 12, station: 1 },
  'Stormwater':   { base: 6,  station: 3 },
};
const PREFIX = { pickup: 'UT', sedan: 'IN', sweeper: 'SW', sanitation: 'SN', tractor: 'BT', bucket: 'BK', pump: 'PT', evvan: 'EV' };
const SHIFT_START = { sanitation: 4, tractor: 4, pickup: 6, bucket: 6, evvan: 6, sedan: 8, sweeper: 8, pump: 8 };
const SHIFT_HOURS = 12;
const UPGRADES = {
  bay3:     { label: 'Third Garage Bay',      price: 150000, desc: 'One more vehicle serviced at a time.' },
  bay4:     { label: 'Fourth Garage Bay',     price: 250000, desc: 'A proper shop at last.', needs: 'bay3' },
  quicklift:{ label: 'Quick-Lift Hydraulics', price: 120000, desc: 'Garage work finishes 35% faster.' },
  evcharger:{ label: 'EV Charging Station',   price: 90000,  desc: 'Unlocks electric vans. Charging is nearly free.' },
  latches:  { label: 'Raccoon-Proof Latches', price: 15000,  desc: 'Raids drop sharply. The raccoons will take this personally.' },
  barriers: { label: 'Flood Barriers',        price: 60000,  desc: 'Storm and flood damage to the yard is halved.' },
};
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
/* ============================== LIFETIME (persists across shifts) ============================== */
const LIFETIME_KEY = 'fleetgame-lifetime-v1';
const SAVE_KEY = 'fleetgame-save-v1';
function loadLifetime() {
  try { const raw = localStorage.getItem(LIFETIME_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return { bestDay: 0, bestRating: 0, totalService: 0, totalRaidsFoiled: 0, gamesPlayed: 0, badges: [] };
}
let LIFE = loadLifetime();
function saveLifetime() { try { localStorage.setItem(LIFETIME_KEY, JSON.stringify(LIFE)); } catch (e) {} }
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

const MILESTONES = [
  { id: 'day7',   check: () => S.day >= 7,              text: 'One week on the job. The gravel lot has never looked better.' },
  { id: 'day30',  check: () => S.day >= 30,              text: 'Thirty days survived. Council is starting to trust you.' },
  { id: 'day60',  check: () => S.day >= 60,              text: 'Sixty days in. You basically run this city now.' },
  { id: 'svc5k',  check: () => S.serviceTotal >= 5000,   text: '5,000 service points delivered. The city noticed.' },
  { id: 'svc20k', check: () => S.serviceTotal >= 20000,  text: '20,000 service points delivered. Legendary numbers.' },
  { id: 'raid10', check: () => S.raidsFoiled >= 10,      text: 'Ten raccoon raids foiled. They fear the yard now.' },
];
function checkMilestones() {
  for (const m of MILESTONES) {
    if (S._hit.has(m.id)) continue;
    if (m.check()) {
      S._hit.add(m.id);
      if (!LIFE.badges.includes(m.id)) { LIFE.badges.push(m.id); saveLifetime(); }
      toast(m.text, '');
      log(`Milestone: ${m.text}`);
      confettiBurst(); sfxMilestone();
    }
  }
}

/* ============================== STATE ============================== */
const S = {
  budget: 2847500,
  minutes: 6 * 60, // day starts 06:00
  day: 1,
  speed: 1,
  vehicles: [],
  nextNum: {},
  stations: [
    { name: 'Fleet Yard',    res: 3800, cap: 5000, auto: false },
    { name: 'Beach HQ',     res: 2600, cap: 4000, auto: false },
    { name: '38th Street',  res: 3100, cap: 4000, auto: false },
    { name: 'Plant A',    res: 1900, cap: 4000, auto: false },
    { name: 'Executive Airport',res: 3400, cap: 4000, auto: false },
  ],
  sat: {}, demand: {},
  bays: 2, upgrades: {},
  event: null, nextEventDay: 3,
  raccoon: null, raidsFoiled: 0, raidsLost: 0,
  serviceTotal: 0, bailouts: 0, over: false,
  log: [], _hit: new Set(),
};
for (const d in DEPTS) { S.sat[d] = 70; S.demand[d] = DEPTS[d].base; }

/* ============================== SCENE ============================== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd7e0, 140, 320);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 600);
camera.position.set(58, 52, 74);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -2);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minDistance = 18; controls.maxDistance = 190;

const hemi = new THREE.HemisphereLight(0xcfe8ef, 0x6b6250, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
scene.add(sun);

const skyDay = new THREE.Color(0x9fd7e0), skyDusk = new THREE.Color(0xe8955c),
      skyNight = new THREE.Color(0x101a2a), skyStorm = new THREE.Color(0x4a545c);

// ground layers
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
  new THREE.MeshStandardMaterial({ map: grassTexture(20), roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
scene.add(ground);

const yard = new THREE.Mesh(new THREE.PlaneGeometry(150, 100),
  new THREE.MeshStandardMaterial({ map: asphaltTexture(10), roughness: 0.95 }));
yard.rotation.x = -Math.PI / 2; yard.receiveShadow = true;
scene.add(yard);
preferFile('asphalt', yard.material.map).then(t => { yard.material.map = t; yard.material.needsUpdate = true; });

const beach = new THREE.Mesh(new THREE.PlaneGeometry(400, 22),
  new THREE.MeshStandardMaterial({ map: sandTexture(14), roughness: 1 }));
beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.02, 61);
scene.add(beach);
preferFile('sand', beach.material.map).then(t => { beach.material.map = t; beach.material.needsUpdate = true; });

const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 70),
  new THREE.MeshStandardMaterial({ map: waterTexture(10), roughness: 0.35, metalness: 0.2 }));
water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, 105);
scene.add(water);
preferFile('water', water.material.map).then(t => { water.material.map = t; water.material.needsUpdate = true; });

// parking slot markings
const slotMat = new THREE.MeshBasicMaterial({ color: 0xe8e4da, transparent: true, opacity: 0.55 });
const SLOTS = [];
for (const row of [-20, -6, 8, 22]) for (let i = 0; i < 10; i++) {
  const x = -46 + i * 8;
  SLOTS.push({ x, z: row, taken: null });
  const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 6), slotMat);
  line1.rotation.x = -Math.PI / 2; line1.position.set(x - 3.4, 0.03, row);
  const line2 = line1.clone(); line2.position.x = x + 3.4;
  scene.add(line1, line2);
}

// props
const garageG = new THREE.Group(); scene.add(garageG);
let garageMesh = null;
function rebuildGarage() {
  if (garageMesh) garageG.remove(garageMesh);
  garageMesh = buildGarage(S.bays);
  garageMesh.position.set(-40, 0, -38);
  garageMesh.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  garageG.add(garageMesh);
}
rebuildGarage();
const BAY_POS = () => { // service spots in front of garage bays
  const W = 10 + S.bays * 8, out = [];
  for (let i = 0; i < S.bays; i++) out.push({ x: -40 - W / 2 + 9 + i * 8, z: -26 });
  return out;
};

const canopy = buildFuelCanopy(); canopy.position.set(38, 0, -34);
canopy.traverse(o => { if (o.isMesh) o.castShadow = true; });
scene.add(canopy);
const FUEL_SPOTS = [-3.2, 0, 3.2].map(x => ({ x: 38 + x, z: -30, taken: null }));

const trailer = buildAdminTrailer(); trailer.position.set(56, 0, -40); scene.add(trailer);
const gate = buildGate(); gate.position.set(70, 0, 20); gate.rotation.y = Math.PI / 2; scene.add(gate);
const dumpster = buildDumpster(); dumpster.position.set(-64, 0, 40); dumpster.rotation.y = 0.5; scene.add(dumpster);

const poles = [];
for (const [x, z] of [[-68, -44], [68, -44], [-68, 44], [30, 44], [0, -2]]) {
  const p = buildLightPole(); p.position.set(x, 0, z); p.rotation.y = Math.random() * 6;
  scene.add(p); poles.push(p);
}
for (let i = 0; i < 14; i++) {
  const palm = buildPalm(6 + Math.random() * 3);
  const side = i % 2 ? 1 : -1;
  palm.position.set(-80 + Math.random() * 160, 0, 50 + Math.random() * 4);
  if (i > 9) palm.position.set(side * (78 + Math.random() * 6), 0, -40 + Math.random() * 70);
  palm.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(palm);
}
const fenceN = buildFence(150); fenceN.position.set(0, 0, -49); scene.add(fenceN);
const fenceW = buildFence(98); fenceW.rotation.y = Math.PI / 2; fenceW.position.set(-74, 0, 0); scene.add(fenceW);
const fenceS = buildFence(150); fenceS.position.set(0, 0, 49); scene.add(fenceS);

// selection ring
const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 32),
  new THREE.MeshBasicMaterial({ color: 0xff6b2c, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.visible = false;
scene.add(ring);

// rain
const rainGeo = new THREE.BufferGeometry();
const rainN = 900, rainPos = new Float32Array(rainN * 3);
for (let i = 0; i < rainN; i++) rainPos.set([(Math.random() - .5) * 180, Math.random() * 60, (Math.random() - .5) * 130], i * 3);
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfe4ec, size: 0.35, transparent: true, opacity: 0.7 }));
rain.visible = false; scene.add(rain);

/* ============================== VEHICLES ============================== */
const GATE_OUT = new THREE.Vector3(84, 0, 20);
const LANE_Z = 20;
let vidSeq = 1;

function freeSlot() { return SLOTS.find(s => !s.taken) || null; }
const TYPE_ORDER = Object.keys(TYPES);
function typeHomeIndex(type) {
  const idx = TYPE_ORDER.indexOf(type);
  return Math.round((idx + 0.5) / TYPE_ORDER.length * (SLOTS.length - 1));
}
function freeSlotForType(type) {
  const sameTypeIdx = S.vehicles
    .filter(v => v.type === type && v.slot)
    .map(v => SLOTS.indexOf(v.slot))
    .filter(i => i >= 0);
  const target = sameTypeIdx.length ? sameTypeIdx[0] : typeHomeIndex(type);
  let best = null, bestDist = Infinity;
  SLOTS.forEach((s, i) => {
    if (s.taken) return;
    const d = Math.abs(i - target);
    if (d < bestDist) { bestDist = d; best = s; }
  });
  return best;
}

function makeVehicle(type, opts = {}) {
  const t = TYPES[type];
  S.nextNum[type] = (S.nextNum[type] || 0) + 1;
  const mesh = BUILDERS[type]();
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const v = {
    id: vidSeq++, type, name: `${t.label} ${S.nextNum[type]}`,
    dept: t.dept, fuel: opts.fuel ?? 100, cond: opts.cond ?? 100, age: opts.age ?? 0,
    status: 'parked', mesh, slot: null, path: null, hidden: false, workLeft: 0, spot: null,
  };
  mesh.userData.vid = v.id;
  scene.add(mesh);
  S.vehicles.push(v);
  return v;
}
function parkAt(v, slot, snap = false) {
  slot.taken = v.id; v.slot = slot;
  if (snap) { v.mesh.position.set(slot.x, 0, slot.z); v.mesh.rotation.y = Math.PI / 2; }
}
function setPath(v, pts, onArrive) {
  v.path = { pts: pts.map(p => new THREE.Vector3(p.x, 0, p.z ?? p.y ?? 0)), i: 0, onArrive };
}
function laneRoute(from, to) { // travel via the main lane at z=LANE_Z
  return [{ x: from.x, z: LANE_Z }, { x: to.x, z: LANE_Z }, { x: to.x, z: to.z }];
}
function releaseSlot(v) { if (v.slot) { v.slot.taken = null; v.slot = null; } }
function releaseSpot(v) { if (v.spot) { v.spot.taken = null; v.spot = null; } }
/* ============================== SAVE / LOAD ============================== */
function serializeVehicle(v) {
  return { type: v.type, name: v.name, dept: v.dept, fuel: v.fuel, cond: v.cond, age: v.age, status: v.status, workLeft: v.workLeft || 0 };
}
function saveGame() {
  try {
    const data = {
      v: 1, budget: S.budget, minutes: S.minutes, day: S.day,
      bays: S.bays, upgrades: S.upgrades,
      stations: S.stations.map(st => ({ res: st.res, auto: st.auto, tanker: st._tanker ?? null })),
      sat: S.sat, demand: S.demand,
      event: S.event ? { kind: S.event.kind, name: S.event.name, desc: S.event.desc, left: S.event.left, mult: S.event.mult || null, banner: S.event.banner || '' } : null,
      nextEventDay: S.nextEventDay,
      raidsFoiled: S.raidsFoiled, raidsLost: S.raidsLost,
      serviceTotal: S.serviceTotal, bailouts: S.bailouts,
      vehicles: S.vehicles.map(serializeVehicle),
      log: S.log.slice(-20), hit: Array.from(S._hit),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable — fail silently */ }
}
function loadGame() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!data) return false;
  for (const v of S.vehicles) scene.remove(v.mesh);
  S.vehicles = [];
  for (const s of SLOTS) s.taken = null;
  for (const s of FUEL_SPOTS) s.taken = null;

  S.budget = data.budget; S.minutes = data.minutes; S.day = data.day;
  S.bays = data.bays; rebuildGarage(); S.upgrades = data.upgrades || {};
  data.stations.forEach((st, i) => {
    S.stations[i].res = st.res; S.stations[i].auto = st.auto;
    if (st.tanker != null) S.stations[i]._tanker = st.tanker; else delete S.stations[i]._tanker;
  });
  S.sat = data.sat; S.demand = data.demand;
  S.event = data.event ? { ...data.event } : null;
  if (S.event) {
    const b = $('eventBanner');
    b.className = S.event.banner === 'watch' ? 'watch' : '';
    b.style.display = 'block';
    $('evTitle').textContent = S.event.name; $('evDesc').textContent = S.event.desc;
    if (S.event.kind === 'storm') rain.visible = true;
  }
  S.nextEventDay = data.nextEventDay;
  S.raidsFoiled = data.raidsFoiled; S.raidsLost = data.raidsLost;
  S.serviceTotal = data.serviceTotal; S.bailouts = data.bailouts;
  S.log = data.log || []; S._hit = new Set(data.hit || []);

  const RESOLVE = { arriving: 'parked', toFuel: 'fueling', toMaint: 'maint', toPark: 'parked', inbound: 'parked' };
  for (const sv of data.vehicles) {
    const v = makeVehicle(sv.type, { fuel: sv.fuel, cond: sv.cond, age: sv.age });
    v.name = sv.name;
    v.workLeft = sv.workLeft || 0;
    const st = RESOLVE[sv.status] || sv.status;
    if (st === 'deployed' || st === 'returning') {
      v.status = st; v.hidden = true; v.mesh.visible = false;
    } else if (st === 'fueling') {
      const spot = FUEL_SPOTS.find(s => !s.taken);
      if (spot) { spot.taken = v.id; v.spot = spot; v.mesh.position.set(spot.x, 0, spot.z); v.mesh.rotation.y = Math.PI / 2; v.status = 'fueling'; }
      else { const slot = freeSlotForType(v.type); if (slot) parkAt(v, slot, true); v.status = 'parked'; }
    } else if (st === 'maint') {
      const bays = BAY_POS();
      const spot = bays[S.vehicles.filter(x => x.status === 'maint').length % bays.length];
      v.mesh.position.set(spot.x, 0, spot.z); v.mesh.rotation.y = Math.PI / 2; v.status = 'maint';
    } else {
      const slot = freeSlotForType(v.type);
      if (slot) parkAt(v, slot, true);
      v.status = st === 'down' ? 'down' : 'parked';
    }
  }
  return true;
}

// starting fleet: 12 units, mixed condition — the yard you inherited
const START = [
  ['sanitation', 82, 64], ['sanitation', 55, 41], ['sanitation', 90, 78],
  ['sweeper', 70, 58], ['sweeper', 44, 37],
  ['pickup', 95, 88], ['pickup', 62, 52], ['pickup', 30, 26],
  ['tractor', 77, 61], ['tractor', 51, 33],
  ['bucket', 85, 70], ['sedan', 98, 92],
];
for (const [type, fuel, cond] of START) {
  const v = makeVehicle(type, { fuel, cond, age: 2 + Math.random() * 6 });
  parkAt(v, freeSlotForType(type), true);
}

/* ============================== UI HELPERS ============================== */
const $ = (id) => document.getElementById(id);

/* -- sound + confetti (synthesized, no audio files needed) -- */
let actx = null;
function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  if (!actx) return;
  const osc = actx.createOscillator(), gain = actx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, actx.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, actx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + start + dur);
  osc.connect(gain); gain.connect(actx.destination);
  osc.start(actx.currentTime + start); osc.stop(actx.currentTime + start + dur + 0.05);
}
function sfxSputter() { // engine dying / ran out of gas in the field
  ensureAudio(); if (!actx) return;
  const notes = [180, 140, 160, 110, 90, 65];
  let t = 0;
  notes.forEach((f, i) => { tone(f, t, 0.09, 'sawtooth', 0.16); t += 0.09 + (i % 2 ? 0.05 : 0.02); });
}
function sfxHorn() { // light double-beep when the pumps are full
  ensureAudio(); if (!actx) return;
  tone(520, 0, 0.14, 'square', 0.14);
  tone(520, 0.2, 0.14, 'square', 0.14);
}
function sfxMilestone() { // little ascending chime for achievements
  ensureAudio(); if (!actx) return;
  tone(523.25, 0, 0.15, 'triangle', 0.2);
  tone(659.25, 0.12, 0.15, 'triangle', 0.2);
  tone(783.99, 0.24, 0.25, 'triangle', 0.22);
}
function confettiBurst() {
  const colors = ['#ff6b2c', '#17948f', '#f5b301', '#efe3cb', '#3fae5c'];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${44 + Math.random() * 12}%;top:-10px;width:7px;height:10px;
      background:${colors[i % colors.length]};opacity:.9;z-index:60;border-radius:2px;pointer-events:none;`;
    document.body.appendChild(el);
    const dx = (Math.random() - 0.5) * 240, dur = 1100 + Math.random() * 700;
    el.animate([
      { transform: `rotate(${Math.random() * 360}deg)`, top: '-10px', opacity: 1 },
      { transform: `translate(${dx}px, 100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: dur, easing: 'ease-in' });
    setTimeout(() => el.remove(), dur + 50);
  }
}

const toastBox = $('alerts');
function toast(msg, cls = '') {
  const d = document.createElement('div');
  d.className = 'toast ' + cls; d.textContent = msg;
  toastBox.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity .5s'; }, 4200);
  setTimeout(() => d.remove(), 4800);
  while (toastBox.children.length > 4) toastBox.firstChild.remove();
}
function log(msg) {
  S.log.push(msg);
  if (S.log.length > 40) S.log.shift();
}
let tickerIdx = 0;
setInterval(() => {
  if (!started || !S.log.length) return;
  tickerIdx = (tickerIdx + 1) % S.log.length;
  $('tkText').innerHTML = '<b>DISPATCH:</b> ' + S.log[S.log.length - 1 - (tickerIdx % Math.min(5, S.log.length))];
}, 6000);

function spend(n, why, cls = 'money') {
  S.budget -= n;
  if (why) toast(`${money(-n)} — ${why}`, n > 0 ? '' : cls);
}

/* ============================== ACTIONS ============================== */
function deploy(v) {
  if (v.status !== 'parked') return;
  if (v.fuel < 8) { toast(`${v.name} is running on fumes. Refuel first.`, 'warn'); return; }
  v.status = 'deployed'; v._ranDry = false; v._shiftTimer = 0;
  const from = { x: v.mesh.position.x, z: v.mesh.position.z };
  releaseSlot(v);
  setPath(v, [...laneRoute(from, { x: GATE_OUT.x, z: GATE_OUT.z })], () => { v.hidden = true; v.mesh.visible = false; });
  log(`${v.name} rolled out for ${v.dept}.`);
  refreshUI();
}
function deployAll() {
  const eligible = S.vehicles.filter(v => v.status === 'parked' && v.fuel >= 8);
  if (!eligible.length) { toast('Nothing parked and fueled enough to deploy.', 'warn'); return; }
  eligible.forEach(deploy);
  toast(`Deployed ${eligible.length} vehicle${eligible.length > 1 ? 's' : ''}.`, '');
}
function recall(v) {
  if (v.status !== 'deployed') return;
  if (!v.hidden) {
    // still visibly on its way out — turn it around now instead of waiting for the round trip
    const slot = freeSlotForType(v.type);
    if (slot) {
      parkAt(v, slot);
      v.status = 'toPark';
      setPath(v, laneRoute({ x: v.mesh.position.x, z: v.mesh.position.z }, slot), () => { v.status = 'parked'; refreshUI(); });
    } else {
      v.status = 'waitingSlot';
    }
    log(`${v.name} turned around before leaving the yard.`);
  } else {
    v.status = 'returning';
  }
  refreshUI();
}
function arriveHome(v, dest, nextStatus, onDone) {
  v.hidden = false; v.mesh.visible = true;
  v.mesh.position.set(GATE_OUT.x, 0, GATE_OUT.z);
  setPath(v, laneRoute({ x: GATE_OUT.x, z: GATE_OUT.z }, dest), () => { v.status = nextStatus; onDone && onDone(); refreshUI(); });
}
function sendRefuel(v) {
  if (v.status !== 'parked' || v.fuel > 95) return;
  const t = TYPES[v.type];
  if (t.ev) {
    if (!S.upgrades.evcharger) { toast('No EV charger installed yet.', 'warn'); return; }
    v.status = 'fueling'; v.workLeft = 90; refreshUI(); return; // charges in place
  }
  const spot = FUEL_SPOTS.find(s => !s.taken);
  if (!spot) { toast('All fuel pumps busy.', 'warn'); sfxHorn(); return; }
  const yardStn = S.stations[0];
  const need = (100 - v.fuel) * t.gal;
  if (yardStn.res < need) { toast('Yard Main reserve too low. Order a tanker.', 'bad'); return; }
  spot.taken = v.id; v.spot = spot;
  const from = { x: v.mesh.position.x, z: v.mesh.position.z };
  releaseSlot(v);
  v.status = 'toFuel';
  setPath(v, laneRoute(from, spot), () => { v.status = 'fueling'; v.workLeft = 60; refreshUI(); });
  refreshUI();
}
function recallAll() {
  const out = S.vehicles.filter(v => v.status === 'deployed');
  if (!out.length) { toast('Nothing currently deployed.', 'warn'); return; }
  out.forEach(recall);
  toast(`Recalled ${out.length} vehicle${out.length > 1 ? 's' : ''}.`, '');
  log('All units recalled to the yard.');
}
function sendGarage(v) {
  if (v.status !== 'parked' && v.status !== 'down') return;
  const bays = BAY_POS();
  const busy = S.vehicles.filter(x => x.status === 'maint').length;
  if (busy >= S.bays) { toast('All garage bays occupied.', 'warn'); return; }
  const spot = bays[busy % bays.length];
  const repair = v.status === 'down' || v.cond <= 5;
  const t = TYPES[v.type];
  const cost = repair ? Math.round(t.price * 0.045) : Math.round(t.price * 0.008);
  if (S.budget < cost) { toast('Not enough budget for that work order.', 'bad'); return; }
  spend(cost, `${repair ? 'Repair' : 'Service'} — ${v.name}`);
  const from = { x: v.mesh.position.x, z: v.mesh.position.z };
  releaseSlot(v);
  v.status = 'toMaint'; v._maint = { repair };
  let dur = (repair ? 16 : 5) * 60;
  if (S.upgrades.quicklift) dur *= 0.65;
  setPath(v, laneRoute(from, spot), () => { v.status = 'maint'; v.workLeft = dur; refreshUI(); });
  refreshUI();
}
function sellVehicle(v) {
  if (v.status !== 'parked' && v.status !== 'down') return;
  const t = TYPES[v.type];
  let val = t.price * (0.15 + 0.55 * (v.cond / 100) * Math.max(0.3, 1 - v.age / 20));
  if (S.event?.kind === 'scrap') val *= 1.2;
  val = Math.round(val);
  spend(-val, `Sold ${v.name}`);
  releaseSlot(v); releaseSpot(v);
  scene.remove(v.mesh);
  S.vehicles = S.vehicles.filter(x => x !== v);
  if (selected === v) select(null);
  log(`${v.name} sold at auction for ${money(val)}.`);
  refreshUI();
}
function buyVehicle(type) {
  const t = TYPES[type];
  if (t.needs && !S.upgrades[t.needs]) { toast('Requires the EV Charging Station upgrade.', 'warn'); return; }
  if (S.budget < t.price) { toast('Not enough budget.', 'bad'); return; }
  const slot = freeSlotForType(type);
  if (!slot) { toast('Yard is full. Sell something first.', 'warn'); return; }
  spend(t.price, `Purchased ${t.label}`);
  const v = makeVehicle(type);
  v.mesh.position.set(GATE_OUT.x, 0, GATE_OUT.z);
  parkAt(v, slot);
  v.status = 'arriving';
  setPath(v, laneRoute({ x: GATE_OUT.x, z: GATE_OUT.z }, slot), () => { v.status = 'parked'; refreshUI(); });
  log(`Factory-fresh ${t.label} delivered: ${v.name}.`);
  refreshUI();
}
function orderTanker(i) {
  const st = S.stations[i];
  const cost = 9000;
  if (S.budget < cost) { toast('Not enough budget for a tanker.', 'bad'); return; }
  if (st._tanker) { toast('Tanker already en route to ' + st.name + '.', 'warn'); return; }
  spend(cost, `Tanker → ${st.name}`);
  st._tanker = 6 * 60;
  log(`Fuel tanker dispatched to ${st.name}. ETA six hours.`);
  refreshUI();
}
function buyUpgrade(key) {
  const u = UPGRADES[key];
  if (S.upgrades[key]) return;
  if (u.needs && !S.upgrades[u.needs]) { toast(`Requires ${UPGRADES[u.needs].label} first.`, 'warn'); return; }
  if (S.budget < u.price) { toast('Not enough budget.', 'bad'); return; }
  spend(u.price, u.label);
  S.upgrades[key] = true;
  if (key === 'bay3') { S.bays = 3; rebuildGarage(); }
  if (key === 'bay4') { S.bays = 4; rebuildGarage(); }
  log(`${u.label} installed.`);
  if (key === 'latches') log('The dumpster raccoons held what appeared to be a planning meeting.');
  refreshUI();
}

/* ============================== SIMULATION ============================== */
function fieldStation(dept) { return S.stations[DEPTS[dept].station]; }
const MAYOR_LINES = [
  'The Mayor stopped by the yard and shook Drew\'s hand. Chris got a photo. It\'s already framed.',
  'City Hall put out a press release praising Fleet Services by name. Chelsy printed it out.',
  'The Mayor mentioned the fleet rating in a council meeting. Unprompted. Very on brand for a good week.',
];
const ROAST_LINES = [
  'The Sun-Sentinel ran a piece titled "City Fleet in Disarray." Anthony is not reading it out loud again.',
  'A city commissioner asked "what exactly is Fleet Services doing" in a public meeting. Rough.',
  'The paper printed a photo of a broken-down sweeper. It was not a flattering angle.',
];
const TEAM_LINES = [
'Chris says one of the lifts may need repair soon. This is the third time he\'s said that this week.',
  'Anthony found a raccoon paw print on a work order. It\'s on the wall now.',
  'Jen color-coded the maintenance schedule. Nobody asked her to. Everyone is grateful.',
  'Chelsy answered four phone calls in a row about the fuel island. Same energy each time.',
  'Chris is convinced one of the pickups has "a personality." He won\'t elaborate.',
  'Anthony reorganized the parts shelf alphabetically. Glen at Mancon is thrilled. Everyone else is lost.',
  'Jen caught a budget error nobody else saw. Third time this month.',
  'Chelsy put a "Beware of Raccoons" sign near the dumpster. It has not helped.',
  'Drew stared at the fleet dashboard for a full minute before remembering what he was doing.',
  'Chris named the oldest sanitation truck "Steve." Steve is not doing great.',
  'Anthony swears the bucket truck arm squeaks in a specific key. Nobody can confirm.',
  'Jen filed the raccoon incident reports under "wildlife." There is now a wildlife folder.',
  'Chelsy brought donuts. Morale, unlike the fleet budget, is briefly at 100%.',
  'Drew double-checked the numbers twice, then trusted Jen\'s math the first time anyway.',
  'Anthony told a mechanic joke nobody laughed at. He told it again anyway.',
  'Anthony spotted a raccoon "casing" the fuel canopy. His words.',
  'Jen scheduled next week\'s maintenance before this week\'s was even done.',
  'Chelsy answered the phone "Fleet Services, we\'re doing our best" by accident. It stuck.',
  'Police called to say the car wash is down again. They caused it.',
  'Police hit the gate again. Second time this week.',
  'JJ from Moss came by to ask if we could move our vehicles.',
  'Edgar microwaved fish in the break room again. Drew banned him.',
  'Chris asked for a raise and settled for a fishing lure. Somehow this feels like a win for him.',
  'Chelsy\'s "quick question" turned into a 45 minute conversation about her neighbor\'s fence.',
  'Drew opened his email to 40 unread messages. He clicked "Mark all as read."',
  'Anthony made a short joke about Derek. Drew gave him "the look." Anthony has built up a tolerance to The Look.',
];
  function maybeTeamLine() {
  if (Math.random() < 0.05) log(TEAM_LINES[(Math.random() * TEAM_LINES.length) | 0]);
}
function yardWentDry() {
  if (S._yardDry) return; // already alerted — banner stays up, no repeat toast/sound
  S._yardDry = true;
  toast('Yard Main ran dry. Refueling is stalled until it\'s resupplied.', 'bad');
  sfxHorn();
  $('fuelBanner').style.display = 'block';
  log('Yard Main ran dry. Pumps are stalled until a tanker arrives.');
}
function checkYardRecovered() {
  if (S._yardDry && S.stations[0].res > 0) {
    S._yardDry = false;
    $('fuelBanner').style.display = 'none';
    toast('Yard Main is back online.', '');
    log('Yard Main resupplied. Pumps are running again.');
  }
}
function hourTick() {
  const stormy = S.event?.kind === 'storm';
  const hourOfDay = Math.floor(S.minutes / 60) % 24;
  for (const v of S.vehicles) {
    const t = TYPES[v.type];
    if (v.status === 'deployed' || v.status === 'returning') {
      // fuel burn (field station keeps them topped between yard fills; dry station = worse burn)
      const st = fieldStation(v.dept);
      let burn = t.fph;
      if (!t.ev) {
        if (st.res > t.fph * t.gal * 2) st.res -= t.fph * t.gal * 0.5;
        else burn *= 1.6;
      }
      v.fuel = Math.max(1, v.fuel - burn);
      let wear = t.wph * (stormy ? 4 : (S.event?.kind === 'heat' ? 1.6 : 1));
      v.cond = Math.max(0, v.cond - wear);
      let pts = t.sph * (v.cond > 50 ? 1 : 0.7);
      if (S.event?.kind === 'flood' && v.dept === 'Stormwater') pts *= 3;
      S.serviceTotal += pts; LIFE.totalService += pts;
      v._pts = pts;
      if (v.status === 'deployed') {
        v._shiftTimer = (v._shiftTimer || 0) + 1;
        if (v._shiftTimer >= SHIFT_HOURS) {
          v.status = 'returning';
          log(`${v.name}'s shift ended. Heading home for the day.`);
        }
      }
      if (v.fuel <= 1) {
        if (!v._ranDry) {
          v._ranDry = true; v.status = 'returning';
          log(`${v.name} is running on fumes. Heading home to refuel.`); sfxSputter();
        }
      } else {
        const ageFactor = 1 + Math.max(0, v.age - 6) * 0.06;
        if (v.cond < 25 && Math.random() < (25 - v.cond) * 0.007 * ageFactor) {
          v.status = 'returning'; v._breaking = true;
          log(`${v.name} is making a sound Chris described as "expensive."`);
        }
      }
      if (stormy && Math.random() < (S.upgrades.barriers ? 0.02 : 0.045)) {
        v.cond = Math.max(0, v.cond - 25);
        toast(`${v.name} took storm damage in the field!`, 'bad');
      }
    } else {
      v._pts = 0;
      if (v.status === 'parked' && SHIFT_START[v.type] === hourOfDay && v.fuel >= 8) deploy(v);
    }
    v.age += 1 / (24 * 365);
  }
  // satisfaction drift
  // satisfaction drift
  for (const d in DEPTS) {
    const supply = S.vehicles.filter(v => v.dept === d && (v.status === 'deployed')).reduce((a, v) => a + (v._pts || 0), 0);
    let demand = S.demand[d];
    if (S.event) {
      const m = S.event.mult?.[d]; if (m) demand *= m;
    }
    const coverage = demand > 0 ? Math.min(1.4, supply / demand) : 1;
    const target = Math.max(8, Math.min(100, coverage * 82));
    S.sat[d] += (target - S.sat[d]) * 0.06;
  }
  // stations: passive city drain + tankers + auto resupply
  for (const st of S.stations) {
    if (st._tanker !== undefined) { /* handled per-minute */ }
    if (st.auto && st.res < st.cap * 0.25 && !st._tanker && S.budget > 12000) {
      S.budget -= 10350;
      st._tanker = 6 * 60;
      log(`Auto-resupply tanker rolling to ${st.name} (${money(10350)}).`);
    }
  }
  if (stormy) for (const st of S.stations) st.res = Math.max(0, st.res - 40); // generators
}
function dayTick() {
  for (const d in DEPTS) S.demand[d] = Math.round(DEPTS[d].base * (0.75 + Math.random() * 0.55));
  spend(2400, null); // payroll & utilities, silent
  log(`Day ${S.day}. Payroll and utilities cleared (${money(2400)}).`);
  const avgRating = Object.values(S.sat).reduce((a, b) => a + b, 0) / 5;
  if (avgRating > LIFE.bestRating) LIFE.bestRating = avgRating;
  if (S.day > LIFE.bestDay) LIFE.bestDay = S.day;
  if (S.day % 7 === 0) {
    const alloc = Math.round(90000 * (0.4 + avgRating / 100));
    spend(-alloc, `Weekly city allocation (fleet rating ${Math.round(avgRating)}%)`);
    log(`Council wired the weekly allocation: ${money(alloc)}.`);
    if (avgRating >= 85) {
      toast('The Mayor gave Fleet Services a public shoutout this week.', 'money');
      log(MAYOR_LINES[(Math.random() * MAYOR_LINES.length) | 0]);
    } else if (avgRating <= 30) {
      toast('The paper ran a piece on Fleet Services. Not a kind one.', 'bad');
      log(ROAST_LINES[(Math.random() * ROAST_LINES.length) | 0]);
    }
  }
  checkMilestones();
  saveLifetime();
  saveGame();
  // event scheduling
  if (!S.event && S.day >= S.nextEventDay) scheduleEvent();
  // budget trouble
  if (S.budget < -150000) return gameOver();
  if (S.budget < -50000 && !S._warned) {
    S._warned = true;
    toast('The city auditor has "questions." Budget deep in the red.', 'bad');
  }
  if (S.budget > -50000) S._warned = false;
}
/* ============================== EVENTS ============================== */
function scheduleEvent() {
  const roll = Math.random();
  if (roll < 0.3) startEvent({ kind: 'watch', name: 'Hurricane Watch', hours: 30,
    desc: 'Hurricane Dolores inbound. Recall and fuel the fleet before landfall.', banner: 'watch' });
  else if (roll < 0.45) startEvent({ kind: 'flood', name: 'King Tide Flooding', hours: 18,
    desc: 'Streets underwater downtown. Stormwater needs everything with a pump.',
    mult: { 'Stormwater': 4, 'Streets': 1.6 } });
  else if (roll < 0.62) startEvent({ kind: 'parade', name: 'Beachfront Parade', hours: 12,
    desc: 'A1A parade today. Streets and Beach on double duty. Bonus for full coverage.',
    mult: { 'Streets': 2, 'Beach': 2 } });
  else if (roll < 0.8) startEvent({ kind: 'heat', name: 'Heat Wave', hours: 24,
    desc: 'A/C compressors screaming citywide. Deployed vehicles wear 60% faster.' });
  else startEvent({ kind: 'scrap', name: 'Scrap Prices Spike', hours: 24,
    desc: 'Auction values up 20% today. Good day to offload the junkers.' });
}
function startEvent(ev) {
  S.event = ev; S.event.left = ev.hours * 60;
  const b = $('eventBanner');
  b.className = ev.banner === 'watch' ? 'watch' : '';
  b.style.display = 'block';
  $('evTitle').textContent = ev.name;
  $('evDesc').textContent = ev.desc;
  toast(`City event: ${ev.name}`, 'warn');
  log(`${ev.name} — ${ev.desc}`);
}
function endEvent() {
  const ev = S.event;
  if (ev.kind === 'watch') {
    // storm hits
    startEvent({ kind: 'storm', name: 'Hurricane Dolores', hours: 12,
      desc: 'Landfall. Anything still deployed is taking a beating.', banner: '' });
    rain.visible = true;
    return;
  }
  if (ev.kind === 'storm') {
    rain.visible = false;
    // yard damage to low-condition parked vehicles
    for (const v of S.vehicles) {
      if (!['deployed', 'returning'].includes(v.status) && v.cond < 45 && Math.random() < (S.upgrades.barriers ? 0.2 : 0.4)) {
        v.status = 'down'; v.cond = Math.max(0, v.cond - 20);
        toast(`${v.name} damaged in the storm.`, 'bad');
      }
    }
    startEvent({ kind: 'flood', name: 'Post-Storm Flooding', hours: 24,
      desc: 'Dolores left half the city underwater. Vac Trucks earn triple service.',
      mult: { 'Stormwater': 6, 'Streets': 2 } });
    return;
  }
  if (ev.kind === 'parade') {
    const cov = ['Streets', 'Beach'].every(d => S.sat[d] > 62);
    if (cov) { spend(-15000, 'Parade support bonus'); log('Mayor personally thanked Fleet Services. In public. On camera.'); }
    else log('Parade wrapped. The marching band had to detour around a stalled sweeper.');
  }
  $('eventBanner').style.display = 'none';
  S.event = null;
  S.nextEventDay = S.day + 2 + Math.floor(Math.random() * 3);
}

/* ============================== RACCOONS ============================== */
const RC_LINES_STEAL = [
  'Raccoon made off with the pump 3 snack drawer AND eighty gallons. Impressive, honestly.',
  'Security footage shows a raccoon operating the fuel nozzle with both hands. Reviewing hiring policy.',
  'The raccoons got into Yard Main again. One left a tiny muddy handprint on the invoice.',
  'A raccoon siphoned fuel into what appears to be a juice box. Losses logged.',
];
const RC_LINES_SHOO = [
  'Raccoon shooed off the lot. It chittered something that sounded like "this isn\'t over."',
  'Intruder repelled. Recovered supplies include one granola bar (bitten) and a fuel cap.',
  'Raccoon escorted off premises. It filed what we believe was a formal complaint.',
];
function maybeSpawnRaccoon() {
  if (S.raccoon || S.over) return;
  const h = Math.floor(S.minutes / 60) % 24;
  const night = h >= 21 || h < 5;
  if (!night) return;
  const base = S.upgrades.latches ? 0.09 : 0.32;
  if (Math.random() > base) return;
  const crew = Math.random() < 0.14;
  const count = crew ? 3 : 1;
  const group = new THREE.Group();
  const members = [];
  for (let i = 0; i < count; i++) {
    const r = buildRaccoon(crew && i === 0);
    r.position.set(i * 1.4 - (count - 1) * 0.7, 0, (i % 2) * 1.2);
    group.add(r); members.push(r);
  }
  group.position.copy(dumpster.position);
  scene.add(group);
  // pick target: fuel canopy or a random parked vehicle
  const parked = S.vehicles.filter(v => v.status === 'parked');
  const target = (Math.random() < 0.5 || !parked.length)
    ? new THREE.Vector3(38, 0, -30)
    : parked[(Math.random() * parked.length) | 0].mesh.position.clone();
  S.raccoon = { group, members, crew, phase: 'in', t: 0, from: dumpster.position.clone(), to: target,
    dur: (S.upgrades.latches ? 15 : 10) + Math.random() * 4 };
  if (crew) { toast('Heist crew on the lot. Three raccoons. One has a hat.', 'warn'); log('THREE raccoons spotted moving in formation. The one in front has a little hat.'); }
  else toast('A raccoon is sneaking across the yard. Tap it!', 'warn');
}
function raccoonSteal() {
  const r = S.raccoon;
  const mult = r.crew ? 3 : 1;
  const loss = Math.round((400 + Math.random() * 500) * mult);
  S.budget -= loss;
  S.stations[0].res = Math.max(0, S.stations[0].res - 60 * mult);
  S.raidsLost++;
  toast(`Raccoon raid: ${money(-loss)} and fuel gone.`, 'bad');
  log(RC_LINES_STEAL[(Math.random() * RC_LINES_STEAL.length) | 0]);
  refreshUI();
}
function raccoonShoo() {
  const r = S.raccoon;
  const gain = r.crew ? 900 : 250;
  spend(-gain, 'Recovered supplies');
  S.raidsFoiled++;
  log(RC_LINES_SHOO[(Math.random() * RC_LINES_SHOO.length) | 0]);
  if (S.raidsFoiled === 5) { spend(-5000, 'Council "Vigilance Award"'); log('Council issued a Vigilance Award for raccoon deterrence. There was a small plaque.'); }
  r.phase = 'flee'; r.t = 0;
  r.from = r.group.position.clone();
  r.to = dumpster.position.clone();
  r.dur = 3.5;
  refreshUI();
}
function updateRaccoon(dt) {
  const r = S.raccoon;
  if (!r) { if (S.speed > 0) maybeCheckRaccoonTimer(dt); return; }
  if (S.speed === 0) return;
  r.t += dt;
  const legs = (m) => { const b = Math.sin(performance.now() / 60) * 0.25; m.userData.legs.forEach((l, i) => l.rotation.x = i % 2 ? b : -b); };
  r.members.forEach(legs);
  if (r.phase === 'in' || r.phase === 'flee' || r.phase === 'out') {
    const k = Math.min(1, r.t / r.dur);
    r.group.position.lerpVectors(r.from, r.to, k);
    r.group.position.y = Math.abs(Math.sin(r.t * 9)) * 0.12;
    r.group.rotation.y = Math.atan2(-(r.to.z - r.from.z), r.to.x - r.from.x);
    if (k >= 1) {
      if (r.phase === 'in') { r.phase = 'steal'; r.t = 0; }
      else { scene.remove(r.group); S.raccoon = null; }
    }
  } else if (r.phase === 'steal') {
    r.group.rotation.y += dt * 1.5;
    r.group.position.y = Math.abs(Math.sin(r.t * 14)) * 0.1;
    if (r.t > 3) {
      raccoonSteal();
      r.phase = 'out'; r.t = 0;
      r.from = r.group.position.clone(); r.to = dumpster.position.clone(); r.dur = 5;
    }
  }
}
let rcTimer = 0;
function maybeCheckRaccoonTimer(dt) {
  rcTimer += dt;
  if (rcTimer > 20) { rcTimer = 0; maybeSpawnRaccoon(); }
}

/* ============================== GAME OVER ============================== */
function gameOver() {
  if (S.bailouts === 0) {
    S.bailouts = 1;
    S.budget += 200000;
    for (const d in S.sat) S.sat[d] = Math.max(10, S.sat[d] - 20);
    toast('Emergency council bailout: +$200,000. Fleet rating took the hit.', 'bad');
    log('Council bailed out Fleet Services. The meeting was described as "tense."');
    return;
  }
  S.over = true; S.speed = 0;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  const div = document.createElement('div');
  div.id = 'title';
  div.innerHTML = `<div class="wo"><div class="wo-stripe"></div><div class="wo-body">
    <div class="wo-eyebrow">City of Fort Lauderdale · Termination Notice</div>
   <h1>Fleet <em>Desynchronized</em></h1>
    <div class="wo-sub">The county absorbed the fleet. A raccoon was seen driving SW-1 away.</div>
    <div class="wo-fields">
      <div><b>Days survived:</b> ${S.day}</div><div><b>Service delivered:</b> ${Math.round(S.serviceTotal).toLocaleString()} pts</div>
      <div><b>Raids foiled:</b> ${S.raidsFoiled}</div><div><b>Raids lost:</b> ${S.raidsLost}</div>
      <div><b>Best day ever:</b> ${LIFE.bestDay}</div><div><b>Top fleet rating:</b> ${Math.round(LIFE.bestRating)}%</div>
    </div>
    <button class="wo-btn" onclick="location.reload()">Try Again</button>
  </div></div>`;
  document.body.appendChild(div);
}

/* ============================== UI RENDER ============================== */
let selected = null;
let sideMode = 'city';
function select(v) {
  selected = v;
  if (v) { sideMode = 'vehicle'; openPanel('sidePanel'); }
  refreshUI();
}
function openPanel(id) { $(id).classList.add('open'); }
function closePanel(id) { $(id).classList.remove('open'); }
document.querySelectorAll('.x').forEach(b => b.onclick = () => closePanel(b.dataset.close));

const STATUS_LABEL = { parked: 'Parked', deployed: 'In service', returning: 'Returning', toFuel: 'To pumps',
  fueling: 'Fueling', toMaint: 'To garage', maint: 'In garage', down: 'Out of service', arriving: 'Arriving',
  inbound: 'Returning', toPark: 'Parking', waitingSlot: 'Waiting for space' };
const STATUS_CLS = { parked: 't-parked', deployed: 't-deployed', returning: 't-deployed', toFuel: 't-fueling',
  fueling: 't-fueling', toMaint: 't-queued', maint: 't-maint', down: 't-down', arriving: 't-parked',
  inbound: 't-deployed', toPark: 't-parked', waitingSlot: 't-queued' };

function refreshHUD() {
  const b = $('budget');
  b.textContent = money(S.budget);
  b.classList.toggle('bad', S.budget < 0);
  const op = S.vehicles.filter(v => v.status !== 'down').length;
  $('fleetCt').textContent = `${op}/${S.vehicles.length}`;
  const avg = S.vehicles.length ? S.vehicles.reduce((a, v) => a + v.fuel, 0) / S.vehicles.length : 0;
  $('fuelAvg').textContent = Math.round(avg) + '%';
  const h = Math.floor(S.minutes / 60) % 24, m = Math.floor(S.minutes % 60);
  $('clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  $('dateLab').textContent = `Day ${S.day}`;
}
function bar(cls, val, lowAt) {
  return `<div class="bar ${cls} ${val < lowAt ? 'low' : ''}"><i style="width:${Math.max(2, val)}%"></i></div>`;
}
function refreshFleet() {
  const el = $('fleetList');
  el.innerHTML = S.vehicles.map(v => `
    <div class="v-item" data-v="${v.id}" style="padding:8px 9px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="nm">${v.name}</span>
        <span class="tag ${STATUS_CLS[v.status]}">${STATUS_LABEL[v.status]}</span>
      </div>
      <div class="st" style="color:var(--dim)">${v.dept}</div>
      <div class="bars">${bar('b-fuel', v.fuel, 25)}${bar('b-cond', v.cond, 30)}</div>
    </div>`).join('');
  el.querySelectorAll('.v-item').forEach(d => d.onclick = () => {
    const v = S.vehicles.find(x => x.id == d.dataset.v);
    select(v);
  });
}
function sideVehicle(v) {
  const t = TYPES[v.type];
  const busyBays = S.vehicles.filter(x => x.status === 'maint').length;
  const canFuel = v.status === 'parked' && v.fuel <= 95;
  const canGarage = (v.status === 'parked' || v.status === 'down') && busyBays < S.bays;
  let val = Math.round(t.price * (0.15 + 0.55 * (v.cond / 100) * Math.max(0.3, 1 - v.age / 20)) * (S.event?.kind === 'scrap' ? 1.2 : 1));
  return `
    <div class="kv"><span>Unit</span><b>${v.name}</b></div>
    <div class="kv"><span>Department</span><b>${v.dept}</b></div>
    <div class="kv"><span>Status</span><b>${STATUS_LABEL[v.status]}</b></div>
    <div class="kv"><span>${t.ev ? 'Charge' : 'Fuel'}</span><b>${Math.round(v.fuel)}%</b></div>
    <div class="kv"><span>Condition</span><b class="${v.cond < 30 ? 'bad' : v.cond < 60 ? 'warn' : 'good'}">${Math.round(v.cond)}%</b></div>
    <div class="kv"><span>Age</span><b>${v.age.toFixed(1)} yrs</b></div>
    <div class="kv"><span>Auction value</span><b class="price">${money(val)}</b></div>
    ${v.age > 8 ? `<div class="note warn">Aging unit — breakdown risk climbs faster once condition drops.</div>` : ''}
    <div class="btnrow">
      ${v.status === 'parked' ? `<button class="abtn pri" data-act="deploy">Deploy</button>` : ''}
      ${['deployed'].includes(v.status) ? `<button class="abtn pri" data-act="recall">Recall</button>` : ''}
      <button class="abtn teal" data-act="fuel" ${canFuel ? '' : 'disabled'}>${t.ev ? 'Charge' : 'Refuel'}</button>
      <button class="abtn" data-act="garage" ${canGarage ? '' : 'disabled'}>${v.status === 'down' || v.cond <= 5 ? 'Repair' : 'Service'}</button>
      <button class="abtn" data-act="sell" ${['parked', 'down'].includes(v.status) ? '' : 'disabled'}>Sell</button>
    </div>
    <div class="note">${v.status === 'down' ? 'This unit is out of service and needs a repair work order.' :
      v.cond < 30 ? 'Condition is getting risky. Breakdowns start below 25%.' :
      'Deployed units earn service for their department and burn fuel and condition.'}</div>`;
}
function sideShop() {
  return Object.entries(TYPES).map(([k, t]) => {
    const locked = t.needs && !S.upgrades[t.needs];
    return `<div class="shop-item">
      <div style="display:flex;justify-content:space-between"><b>${t.label}</b><span class="price">${money(t.price)}</span></div>
      <div class="note" style="margin:4px 0">${t.dept} · ${t.sph} svc/hr · ${t.ev ? 'electric' : t.fph + '%/hr fuel'}</div>
      <button class="abtn ${locked ? '' : 'pri'}" data-buy="${k}" ${locked ? 'disabled' : ''} style="width:100%">
        ${locked ? 'Needs EV Charger' : 'Purchase'}</button>
    </div>`;
  }).join('');
}
function sideFuel() {
  return `<div class="note">Deployed units draw from their department's field station. Yard refuels use Yard Main. Tankers deliver 3,000 gal for ${money(9000)}, six hour ETA. Auto-resupply reorders at 25% for ${money(10350)}.</div>` +
    S.stations.map((st, i) => `
    <div class="stn">
      <div style="display:flex;justify-content:space-between"><b>${st.name}</b>
      <span class="${st.res < st.cap * 0.25 ? 'bad' : st.res < st.cap * 0.5 ? 'warn' : 'good'}">${Math.round(st.res).toLocaleString()} / ${st.cap.toLocaleString()} gal</span></div>
      ${bar('b-fuel', st.res / st.cap * 100, 25)}
      <div class="btnrow" style="margin-bottom:0">
        <button class="abtn teal" data-tanker="${i}" ${st._tanker ? 'disabled' : ''}>${st._tanker ? 'Tanker ' + Math.ceil(st._tanker / 60) + 'h out' : 'Order tanker'}</button>
        <button class="abtn ${st.auto ? 'pri' : ''}" data-auto="${i}">Auto: ${st.auto ? 'On' : 'Off'}</button>
      </div>
    </div>`).join('');
}
function sideGarage() {
  const busy = S.vehicles.filter(v => v.status === 'maint');
  return `<div class="kv"><span>Bays</span><b>${busy.length} of ${S.bays} in use</b></div>
    ${busy.map(v => `<div class="kv"><span>${v.name} ${v._maint?.repair ? 'repair' : 'service'}</span><b>${Math.ceil(v.workLeft / 60)}h left</b></div>`).join('') || '<div class="note">Bays are empty. Suspiciously quiet.</div>'}
    <div class="note" style="margin-top:12px">Facility upgrades</div>
    ${Object.entries(UPGRADES).map(([k, u]) => `
      <div class="upg">
        <div style="display:flex;justify-content:space-between"><b>${u.label}</b>
        <span class="price">${S.upgrades[k] ? 'Installed' : money(u.price)}</span></div>
        <div class="note" style="margin:4px 0">${u.desc}</div>
        ${S.upgrades[k] ? '' : `<button class="abtn pri" data-upg="${k}" style="width:100%">Install</button>`}
      </div>`).join('')}`;
}
function sideLog() {
  if (!S.log.length) return '<div class="note">Nothing logged yet.</div>';
  return S.log.slice().reverse().map(line => `<div class="kv" style="border-bottom:1px dashed #3a434c66">${line}</div>`).join('');
}function sideCity() {
  const avg = Object.values(S.sat).reduce((a, b) => a + b, 0) / 5;
  return `<div class="kv"><span>Overall fleet rating</span><b class="${avg < 40 ? 'bad' : avg < 65 ? 'warn' : 'good'}">${Math.round(avg)}%</b></div>
    <div class="note">Weekly allocation scales with the rating. Keep departments covered by deploying their vehicles.</div>
    ${Object.keys(DEPTS).map(d => {
      const deployed = S.vehicles.filter(v => v.dept === d && v.status === 'deployed').length;
      const owned = S.vehicles.filter(v => v.dept === d).length;
      const m = S.event?.mult?.[d];
      return `<div class="satwrap sat">
        <div style="display:flex;justify-content:space-between">
          <b>${d}${m ? ` <span class="warn">×${m} demand</span>` : ''}</b>
          <span>${deployed}/${owned} out · ${Math.round(S.sat[d])}%</span></div>
        ${bar('', S.sat[d], 35)}
      </div>`;
    }).join('')}
    <div class="kv" style="margin-top:10px"><span>Total service delivered</span><b>${Math.round(S.serviceTotal).toLocaleString()} pts</b></div>
  <div class="kv"><span>Raccoon raids foiled / lost</span><b>${S.raidsFoiled} / ${S.raidsLost}</b></div>
    <div class="note" style="margin-top:14px">Career record</div>
    <div class="kv"><span>Top Fleet Rating (all-time)</span><b class="good">${Math.round(LIFE.bestRating)}%</b></div>
    <div class="kv"><span>Best day survived</span><b>${LIFE.bestDay}</b></div>
    <div class="kv"><span>Lifetime service delivered</span><b>${Math.round(LIFE.totalService).toLocaleString()} pts</b></div>
    <div class="kv"><span>Shifts worked</span><b>${LIFE.gamesPlayed}</b></div>
    ${LIFE.badges.length ? `<div class="note" style="margin-top:10px">Milestones earned: ${LIFE.badges.length}</div>` : ''}`;
}
function refreshSide() {
  const titles = { vehicle: 'Vehicle', shop: 'Dealership', fuel: 'Fuel Stations', garage: 'Garage', city: 'City Status', log: 'Dispatch Log' };
  $('sideTitle').textContent = titles[sideMode];
  const body = $('sideBody');
  if (sideMode === 'vehicle') body.innerHTML = selected ? sideVehicle(selected) : '<div class="note">Tap a vehicle in the yard or the roster.</div>';
  if (sideMode === 'shop') body.innerHTML = sideShop();
  if (sideMode === 'fuel') body.innerHTML = sideFuel();
  if (sideMode === 'garage') body.innerHTML = sideGarage();
  if (sideMode === 'city') body.innerHTML = sideCity();
  if (sideMode === 'log') body.innerHTML = sideLog();
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const v = selected; if (!v) return;
    ({ deploy, recall, fuel: sendRefuel, garage: sendGarage, sell: sellVehicle })[b.dataset.act](v);
  });
  body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyVehicle(b.dataset.buy));
  body.querySelectorAll('[data-tanker]').forEach(b => b.onclick = () => orderTanker(+b.dataset.tanker));
  body.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { S.stations[+b.dataset.auto].auto = !S.stations[+b.dataset.auto].auto; refreshUI(); });
  body.querySelectorAll('[data-upg]').forEach(b => b.onclick = () => buyUpgrade(b.dataset.upg));
}
let uiDirty = true;
function refreshUI() { uiDirty = true; }
function refreshEventCountdown() {
  const el = $('evCountdown');
  if (!el) return;
  if (!S.event) { el.textContent = ''; return; }
  const h = Math.floor(S.event.left / 60), m = Math.floor(S.event.left % 60);
  const verb = S.event.kind === 'watch' ? 'until landfall' : 'remaining';
  el.textContent = `${h}h ${m}m ${verb}`;
}
function doRefresh() {
  refreshHUD(); refreshFleet(); refreshSide(); refreshEventCountdown();
  ring.visible = !!(selected && selected.mesh.visible);
  if (ring.visible) ring.position.set(selected.mesh.position.x, 0.06, selected.mesh.position.z);
  uiDirty = false;
}

// tabs
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  const t = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  if (t === 'fleet') {
    const p = $('fleetPanel');
    p.classList.toggle('open');
    if (innerWidth < 820) closePanel('sidePanel');
  } else {
    sideMode = t;
    openPanel('sidePanel');
    if (innerWidth < 820) closePanel('fleetPanel');
    refreshUI();
  }
});
document.querySelectorAll('#speedCtl button').forEach(b => b.onclick = () => {
  S.speed = +b.dataset.sp;
  document.querySelectorAll('#speedCtl button').forEach(x => x.classList.toggle('on', x === b));
});
$('deployAllBtn').onclick = deployAll;
$('recallAllBtn').onclick = recallAll;

/* ============================== INPUT (raycast select) ============================== */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 8) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  // raccoon first — generous hit area
  if (S.raccoon) {
    const hitR = ray.intersectObjects(S.raccoon.group.children, true);
    if (hitR.length || S.raccoon.group.position.distanceTo(rayGroundPoint()) < 4.5) {
      if (S.raccoon.phase === 'in' || S.raccoon.phase === 'steal') { raccoonShoo(); return; }
    }
  }
  const hits = ray.intersectObjects(S.vehicles.filter(v => v.mesh.visible).map(v => v.mesh), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && o.userData.vid === undefined) o = o.parent;
    if (o) { select(S.vehicles.find(v => v.id === o.userData.vid)); return; }
  }
  select(null);
});
function rayGroundPoint() {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const p = new THREE.Vector3();
  const hit = ray.ray.intersectPlane(plane, p);
  return hit || new THREE.Vector3(1e6, 0, 1e6);
}

/* ============================== MAIN LOOP ============================== */
let started = false;
let last = performance.now(), minuteAcc = 0, hourAcc = 0, uiAcc = 0;
const MIN_PER_SEC = 10;

function simMinute() {
  S.minutes += 1;
  hourAcc += 1;
  if (hourAcc >= 60) { hourAcc = 0; hourTick(); maybeTeamLine(); checkYardRecovered(); refreshUI(); }
  if (S.minutes >= 24 * 60) { S.minutes -= 24 * 60; S.day++; dayTick(); refreshUI(); }
  if (S.event) { S.event.left -= 1; if (S.event.left <= 0) endEvent(); }
  for (const st of S.stations) if (st._tanker !== undefined) {
    st._tanker -= 1;
    if (st._tanker <= 0) { delete st._tanker; st.res = Math.min(st.cap, st.res + 3000); log(`Tanker topped off ${st.name}.`); checkYardRecovered(); refreshUI(); }
  }
  // returning vehicles come home
  for (const v of S.vehicles) {
   try {
    if (v.status === 'returning' && v.hidden) {
      v._returnTimer = (v._returnTimer || 0) + 1;
      if (Math.random() < 0.12 || v._returnTimer > 20) {
        const slot = freeSlotForType(v.type);
        if (slot) {
          v._returnTimer = 0;
          parkAt(v, slot);
          const breaking = v._breaking; v._breaking = false;
          arriveHome(v, slot, breaking ? 'down' : 'parked', () => {
            if (breaking) { S.budget -= 800; toast(`${v.name} limped in. Tow assist ${money(-800)}.`, 'bad'); }
          });
          v.status = 'inbound';
        }
      }
    }
    if (v.status === 'fueling') {
      v.workLeft -= 1;
      const t = TYPES[v.type];
      if (!t.ev) {
        const add = 100 / 60;
        const gal = add * t.gal;
        if (S.stations[0].res >= gal) { S.stations[0].res -= gal; v.fuel = Math.min(100, v.fuel + add); }
        else { v.workLeft = 0; yardWentDry(); }
      } else v.fuel = Math.min(100, v.fuel + 100 / 90);
      if (v.workLeft <= 0 || v.fuel >= 100) {
        v.fuel = Math.min(100, v.fuel);
        releaseSpot(v);
        const slot = freeSlotForType(v.type);
        if (slot) { parkAt(v, slot); v.status = 'toPark'; setPath(v, laneRoute({ x: v.mesh.position.x, z: v.mesh.position.z }, slot), () => { v.status = 'parked'; refreshUI(); }); }
        else v.status = 'waitingSlot';
        refreshUI();
      }
    }
    if (v.status === 'waitingSlot') {
      const slot = freeSlotForType(v.type);
      if (slot) { parkAt(v, slot); v.status = 'toPark'; setPath(v, laneRoute({ x: v.mesh.position.x, z: v.mesh.position.z }, slot), () => { v.status = 'parked'; refreshUI(); }); refreshUI(); }
    }
    if (v.status === 'maint') {
      v.workLeft -= 1;
      if (v.workLeft <= 0) {
        v.cond = 100;
        const slot = freeSlotForType(v.type);
        if (slot) { parkAt(v, slot); v.status = 'toPark'; setPath(v, laneRoute({ x: v.mesh.position.x, z: v.mesh.position.z }, slot), () => { v.status = 'parked'; refreshUI(); }); }
        else v.status = 'waitingSlot';
        log(`${v.name} back to 100%. Smells like fresh degreaser.`);
        refreshUI();
      }
    }
   } catch (err) {
     console.error('simMinute error on vehicle', v?.name, err);
   }
  }
}

function updateMovement(dt) {
  const spd = 11 * Math.max(1, S.speed * 0.8);
  for (const v of S.vehicles) {
    if (!v.path || !v.mesh.visible) continue;
    const p = v.path;
    const target = p.pts[p.i];
    const pos = v.mesh.position;
    const dir = new THREE.Vector3().subVectors(target, pos); dir.y = 0;
    const dist = dir.length();
    if (dist < 0.4) {
      p.i++;
      if (p.i >= p.pts.length) { const cb = p.onArrive; v.path = null; v.mesh.rotation.y = Math.PI / 2; cb && cb(); continue; }
      continue;
    }
    dir.normalize();
    const step = Math.min(dist, spd * dt * (S.speed === 0 ? 0 : 1));
    pos.addScaledVector(dir, step);
    const targetRot = Math.atan2(-dir.z, dir.x);
    v.mesh.rotation.y += ((targetRot - v.mesh.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 8);
    if (v.mesh.userData.wheels) v.mesh.userData.wheels.forEach(w => w.children.forEach(c => c.rotation.z -= step * 1.6));
    if (v.mesh.userData.brushes) v.mesh.userData.brushes.forEach(b => b.rotation.y += dt * 8);
  }
}

function updateSky() {
  const h = (S.minutes / 60) % 24;
  let sky, sunI, hemiI, night = 0;
  if (h >= 6.5 && h < 18) { sky = skyDay; sunI = 1.6; hemiI = 0.85; }
  else if (h >= 18 && h < 20) { const k = (h - 18) / 2; sky = skyDay.clone().lerp(skyDusk, k); sunI = 1.4 - k; hemiI = 0.8 - k * 0.4; night = k * 0.5; }
  else if (h >= 20 || h < 5) { sky = skyNight; sunI = 0.12; hemiI = 0.28; night = 1; }
  else { const k = (h - 5) / 1.5; sky = skyNight.clone().lerp(skyDay, k); sunI = 0.12 + k * 1.4; hemiI = 0.28 + k * 0.55; night = 1 - k; }
  if (S.event?.kind === 'storm') { sky = skyStorm; sunI = 0.35; }
  scene.background = sky;
  scene.fog.color = sky;
  sun.intensity = sunI; hemi.intensity = hemiI;
  for (const p of poles) {
    p.userData.light.intensity = night * 14;
    p.userData.bulb.material.emissiveIntensity = night * 1.4;
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.06, (now - last) / 1000);
  last = now;
  controls.update();
  if (started && !S.over) {
    minuteAcc += dt * MIN_PER_SEC * S.speed;
    let guard = 0;
    while (minuteAcc >= 1 && guard++ < 200) { minuteAcc -= 1; simMinute(); }
    updateMovement(dt);
    updateRaccoon(dt);
    updateSky();
    if (rain.visible) {
      const arr = rain.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) { arr[i] -= dt * 40; if (arr[i] < 0) arr[i] = 60; }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    water.material.map.offset.x += dt * 0.01;
    uiAcc += dt;
    if (uiDirty || uiAcc > 1.5) { uiAcc = 0; doRefresh(); }
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============================== START ============================== */
function beginPlay() {
  $('title').classList.add('hide');
  started = true;
  $('hud').style.display = 'flex';
  $('ticker').style.display = 'block';
  $('tabs').style.display = 'flex';
  if (innerWidth >= 820) { openPanel('fleetPanel'); sideMode = 'city'; openPanel('sidePanel'); }
  refreshUI();
}
$('startBtn').onclick = () => {
  ensureAudio();
  LIFE.gamesPlayed++; saveLifetime();
  beginPlay();
  log('Shift started. Twelve units on the lot, half of them held together with hope.');
  log('Anthony says the sweeper "sounds haunted." Noted.');
  toast('Welcome, boss. Deploy vehicles to cover departments. Watch the fuel.', '');
};
if (hasSave()) {
  const cbtn = document.createElement('button');
  cbtn.className = 'wo-btn'; cbtn.style.marginTop = '8px'; cbtn.style.background = 'var(--teal)';
  cbtn.textContent = 'Continue Shift';
  cbtn.onclick = () => {
    ensureAudio();
    loadGame();
    beginPlay();
    log('Picked up right where you left off.');
    toast('Shift resumed.', '');
  };
  $('startBtn').insertAdjacentElement('afterend', cbtn);
}
addEventListener('beforeunload', () => { if (started && !S.over) saveGame(); });
$('deployAllBtn').onclick = deployAll;
