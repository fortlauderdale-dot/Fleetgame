// roguelite.js — Fleet Manager: Roguelite Run mode.
// A light layer on top of the existing sim: discrete timed levels, pass/fail
// scoring, and a permanent meta-upgrade shop between runs. Reuses the live
// simulation (deploy, recall, fuel, garage, events) — never touches the
// endless-mode save slot or its title screen.
import {
  S, TYPES, DEPTS, UPGRADES,
  makeVehicle, parkAt, freeSlotForType, rebuildGarage,
  startEvent, beginPlay, refreshUI, toast, log, money, MODE,
} from './game.js';

const META_KEY = 'fleetgame-roguelite-meta-v1';
const DEPT_KEYS = Object.keys(DEPTS);

function loadMeta() {
  try { const raw = localStorage.getItem(META_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return { reputation: 0, bestLevel: 0, runsPlayed: 0, owned: { budget: 0, fuel: false, latches: false, bays: false } };
}
let META = loadMeta();
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) {} }

const UNLOCKS = [
  { id: 'budget',  label: 'Head Start Budget',   desc: '+$50,000 starting budget (stacks up to 3x).', cost: 40, max: 3 },
  { id: 'fuel',    label: 'Fuel Reserve Boost',   desc: 'Fleet Yard starts completely full.',          cost: 30, max: 1 },
  { id: 'latches', label: 'Raccoon-Proof Start',  desc: 'Begin every run with raccoon-proof latches.', cost: 35, max: 1 },
  { id: 'bays',    label: 'Veteran Crew',         desc: 'Begin every run with a third garage bay.',    cost: 60, max: 1 },
];

/* ---------- run + level state ---------- */
let RUN = null;
let LVL = null;

function levelDef(n) {
  const deptCount = Math.min(2 + Math.floor((n - 1) / 2), DEPT_KEYS.length);
  const shuffled = [...DEPT_KEYS].sort(() => Math.random() - 0.5);
  const active = shuffled.slice(0, deptCount);
  const target = Math.min(85, 55 + n * 3);
  const duration = 45; // real seconds — fixed on purpose, difficulty scales via depts/target/events
  const eventChance = Math.min(0.85, 0.15 + n * 0.08);
  return { n, active, target, duration, eventChance };
}

const LEVEL_EVENTS = [
  () => ({ kind: 'potholes',   name: 'Pothole Season', hours: 6, desc: 'Streets crews are swamped.',        mult: { Streets: 2.2 } }),
  () => ({ kind: 'trashsurge', name: 'Trash Surge',    hours: 6, desc: 'Sanitation demand spikes.',          mult: { Sanitation: 2.2 } }),
  () => ({ kind: 'seaweed',    name: 'Seaweed Bloom',  hours: 6, desc: 'Beach crews need everything.',       mult: { Beach: 2.4 } }),
  () => ({ kind: 'sewer',      name: 'Sewer Line Break', hours: 6, desc: 'Public Works is stretched thin.',  mult: { 'Public Works': 2.4 } }),
  () => ({ kind: 'flood',      name: 'Flash Flooding', hours: 6, desc: 'Stormwater is drowning in demand.',  mult: { Stormwater: 2.6 } }),
];

/* ---------- DOM (built once) ---------- */
let overlay, overlayBody, hud, hudBar, hudText;
function buildDomOnce() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'rogueOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:55;display:none;align-items:center;justify-content:center;background:#000000b3';
  overlay.innerHTML = `<div class="wo" style="width:min(460px,92vw)"><div class="wo-stripe"></div><div class="wo-body" id="rogueBody"></div></div>`;
  document.body.appendChild(overlay);
  overlayBody = overlay.querySelector('#rogueBody');

  hud = document.createElement('div');
  hud.id = 'rogueHud';
  hud.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:22;display:none;'
    + 'background:#181d22f0;border:1px solid var(--line);border-radius:6px;padding:8px 16px;'
    + 'font-family:var(--mono);font-size:12px;color:var(--ink);text-align:center;min-width:260px';
  hud.innerHTML = `<div id="rogueHudText" style="margin-bottom:5px"></div>
    <div style="height:6px;background:#12161a;border-radius:3px;overflow:hidden">
      <i id="rogueHudBar" style="display:block;height:100%;width:100%;background:var(--teal)"></i>
    </div>`;
  document.body.appendChild(hud);
  hudBar = hud.querySelector('#rogueHudBar');
  hudText = hud.querySelector('#rogueHudText');
}
function showModal(html) { overlayBody.innerHTML = html; overlay.style.display = 'flex'; }
function hideModal() { overlay.style.display = 'none'; }

function setSpeedButtons(enabled) {
  document.querySelectorAll('#speedCtl button').forEach(b => {
    b.disabled = !enabled;
    b.style.opacity = enabled ? '' : '0.35';
    b.style.pointerEvents = enabled ? '' : 'none';
  });
}
function setSpeed(v) {
  S.speed = v;
  document.querySelectorAll('#speedCtl button').forEach(b => b.classList.toggle('on', +b.dataset.sp === v));
}

/* ---------- meta menu ---------- */
function renderMetaMenu() {
  const rows = UNLOCKS.map(u => {
    const count = u.id === 'budget' ? META.owned.budget : (META.owned[u.id] ? 1 : 0);
    const maxed = count >= u.max;
    const stackNote = u.max > 1 ? ` (${count}/${u.max})` : (count ? ' — Owned' : '');
    return `<div class="shop-item">
      <div style="display:flex;justify-content:space-between"><b>${u.label}${stackNote}</b>
      <span class="price">${maxed ? '' : u.cost + ' rep'}</span></div>
      <div class="note" style="margin:4px 0">${u.desc}</div>
      ${maxed ? '' : `<button class="abtn pri" data-unlock="${u.id}" style="width:100%" ${META.reputation < u.cost ? 'disabled' : ''}>Unlock</button>`}
    </div>`;
  }).join('');
  showModal(`
    <div class="wo-eyebrow">Roguelite Mode</div>
    <h1 style="font-size:34px">Fleet <em>Reserves</em></h1>
    <div class="wo-sub">Reputation: <b style="color:var(--yellow)">${META.reputation}</b> &middot; Best level: ${META.bestLevel} &middot; Runs played: ${META.runsPlayed}</div>
    <div style="max-height:40vh;overflow-y:auto;margin:14px 0">${rows}</div>
    <button class="wo-btn" id="rogueBeginRun">Start Run</button>
  `);
  overlayBody.querySelectorAll('[data-unlock]').forEach(b => b.onclick = () => {
    const u = UNLOCKS.find(x => x.id === b.dataset.unlock);
    if (META.reputation < u.cost) return;
    META.reputation -= u.cost;
    if (u.id === 'budget') META.owned.budget = Math.min(u.max, META.owned.budget + 1);
    else META.owned[u.id] = true;
    saveMeta();
    renderMetaMenu();
  });
  overlayBody.querySelector('#rogueBeginRun').onclick = startRun;
}

export function openMetaMenu() {
  buildDomOnce();
  META = loadMeta();
  renderMetaMenu();
}

/* ---------- run lifecycle ---------- */
function startRun() {
  MODE.roguelite = true;
  RUN = { level: 1 };

  for (const v of [...S.vehicles]) {
    if (v.slot) v.slot.taken = null;
    if (v.spot) v.spot.taken = null;
    if (v.mesh && v.mesh.parent) v.mesh.parent.remove(v.mesh);
  }
  S.vehicles.length = 0;

  S.day = 1; S.minutes = 6 * 60; S.event = null; S.nextEventDay = 999;
  S.serviceTotal = 0; S.raidsFoiled = 0; S.raidsLost = 0; S.bailouts = 0; S.over = false;
  S.log = []; S.missions = []; S._hit = new Set();
  for (const d of DEPT_KEYS) { S.sat[d] = 65; S.demand[d] = DEPTS[d].base; }

  S.upgrades = {};
  if (META.owned.latches) S.upgrades.latches = true;
  S.bays = META.owned.bays ? 3 : 2;
  rebuildGarage();

  S.budget = 300000 + META.owned.budget * 50000;
  S.stations[0].res = META.owned.fuel ? S.stations[0].cap : 7600;

  const START = [
    ['sanitation', 82, 64], ['sweeper', 70, 58], ['pickup', 95, 88], ['tractor', 77, 61],
    ['bucket', 85, 70], ['sedan', 98, 92], ['pump', 60, 45],
  ];
  for (const [type, fuel, cond] of START) {
    const v = makeVehicle(type, { fuel, cond, age: 2 + Math.random() * 6 });
    parkAt(v, freeSlotForType(type), true);
  }

  beginPlay();
  S.missions = [];
  hideModal();
  showLevelIntro(1);
}

function showLevelIntro(n) {
  setSpeed(0);
  hud.style.display = 'none';
  const def = levelDef(n);
  LVL = { ...def, tickSum: {}, tickCount: 0, elapsed: 0 };
  for (const d of def.active) LVL.tickSum[d] = 0;

  showModal(`
    <div class="wo-eyebrow">Level ${n}</div>
    <h1 style="font-size:34px">Shift <em>Objective</em></h1>
    <div class="wo-sub">Keep these departments running for ${def.duration} seconds:</div>
    <div style="margin:12px 0">${def.active.map(d => `<div class="kv"><span>${d}</span><b>Target ${def.target}%+</b></div>`).join('')}</div>
    <div class="note">Score is your average satisfaction across these departments while the clock runs. Watch for a mid-shift event, it'll force you to reallocate.</div>
    <button class="wo-btn" id="rogueStartLevel">Deploy & Start</button>
  `);
  overlayBody.querySelector('#rogueStartLevel').onclick = runLevel;
}

function runLevel() {
  hideModal();
  hud.style.display = 'block';
  setSpeedButtons(false);
  setSpeed(3);

  const startMs = performance.now();
  let eventFired = false;
  const eventAt = 0.3 + Math.random() * 0.4;

  const timer = setInterval(() => {
    if (S.over) { clearInterval(timer); return; }
    const elapsed = (performance.now() - startMs) / 1000;
    LVL.elapsed = elapsed;

    for (const d of LVL.active) LVL.tickSum[d] += S.sat[d];
    LVL.tickCount++;

    const pct = Math.min(1, elapsed / LVL.duration);
    hudBar.style.width = `${pct * 100}%`;
    const left = Math.max(0, Math.ceil(LVL.duration - elapsed));
    hudText.textContent = `LEVEL ${LVL.n} · Covering ${LVL.active.join(', ')} · Target ${LVL.target}% · ${left}s left`;

    if (!eventFired && !S.event && pct >= eventAt && Math.random() < LVL.eventChance * 0.15) {
      eventFired = true;
      const build = LEVEL_EVENTS[(Math.random() * LEVEL_EVENTS.length) | 0];
      startEvent(build());
    }

    if (S.budget < -50000) {
      clearInterval(timer);
      endLevel(false, 'Budget collapsed mid-shift.');
      return;
    }
    if (elapsed >= LVL.duration) {
      clearInterval(timer);
      const avg = LVL.active.reduce((a, d) => a + LVL.tickSum[d] / LVL.tickCount, 0) / LVL.active.length;
      endLevel(avg >= LVL.target, null, avg);
    }
  }, 400);
}

function endLevel(passed, forcedReason, avg) {
  setSpeed(0);
  setSpeedButtons(true);
  hud.style.display = 'none';

  if (forcedReason) {
    const repEarned = Math.max(0, Math.floor((RUN.level - 1) * 3));
    META.reputation += repEarned; META.runsPlayed++;
    META.bestLevel = Math.max(META.bestLevel, RUN.level - 1);
    saveMeta(); MODE.roguelite = false;
    showModal(`
      <div class="wo-eyebrow">Run Over</div>
      <h1 style="font-size:34px">Fleet <em>Grounded</em></h1>
      <div class="wo-sub">${forcedReason} Made it to level ${RUN.level}.</div>
      <div class="note">Reputation banked: ${repEarned}</div>
      <button class="wo-btn" id="rogueBackToMenu">Back to Reserves</button>
    `);
    overlayBody.querySelector('#rogueBackToMenu').onclick = openMetaMenu;
    return;
  }

  if (passed) {
    const over = Math.max(0, avg - LVL.target);
    const bonus = over >= 15 ? 1.5 : 1;
    const repEarned = Math.round((10 + RUN.level * 4) * bonus);
    META.reputation += repEarned;
    META.bestLevel = Math.max(META.bestLevel, RUN.level);
    saveMeta();
    RUN.level++;
    showModal(`
      <div class="wo-eyebrow">Level Cleared</div>
      <h1 style="font-size:34px">Nice <em>Work</em></h1>
      <div class="wo-sub">Average coverage: ${Math.round(avg)}% (target was ${LVL.target}%)</div>
      <div class="note">Reputation earned: ${repEarned}</div>
      <button class="wo-btn" id="rogueNextLevel">Next Level</button>
    `);
    overlayBody.querySelector('#rogueNextLevel').onclick = () => showLevelIntro(RUN.level);
  } else {
    const repEarned = Math.floor(avg / 10);
    META.reputation += repEarned; META.runsPlayed++;
    META.bestLevel = Math.max(META.bestLevel, RUN.level - 1);
    saveMeta(); MODE.roguelite = false;
    showModal(`
      <div class="wo-eyebrow">Run Over</div>
      <h1 style="font-size:34px">Fleet <em>Grounded</em></h1>
      <div class="wo-sub">Averaged ${Math.round(avg)}%, needed ${LVL.target}%. Made it to level ${RUN.level}.</div>
      <div class="note">Reputation banked: ${repEarned}</div>
      <button class="wo-btn" id="rogueBackToMenu">Back to Reserves</button>
    `);
    overlayBody.querySelector('#rogueBackToMenu').onclick = openMetaMenu;
  }
}

/* ---------- wire up the title screen button ---------- */
buildDomOnce();
const rogueBtn = document.getElementById('rogueBtn');
if (rogueBtn) rogueBtn.onclick = () => {
  document.getElementById('title').classList.add('hide');
  openMetaMenu();
};
