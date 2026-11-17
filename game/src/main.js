// HALCYON BAY — main.js
// One job: the game itself. State, loop, player control, carjacking,
// collisions, camera, rendering, menus and the save — everything wired up.
import { WORLD, PLAYER, CAR, MONEY, STORY, CONTROLS, DAY, GARAGE, SAFEHOUSE, TICKER, REPUTATION } from './config.js';
import { buildCity, drawCity } from './city.js';
import { makeCar, spawnTraffic, updateTraffic, updatePlayerCar, drawCar, nearestRoadPoint, upgradeCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, drawPedestrian } from './pedestrians.js';
import { createWanted, addWanted, updateWanted, addDistrictHeat, decayDistrictHeat, hottestDistrict, drawHelicopter } from './police.js';
import { createMissions, startMission, updateMissions, missionMarker, MISSION_LIST, RACE_LOOP, fmtTime, memoryLine, reputationFor } from './missions.js';
import { createCombat, playerAttack, updateCombat, drawCombat } from './combat.js';
import { createHud, updateHud, showToast, showBanner } from './hud.js';
import { createInput } from './input.js';
import { loadSave, writeSave, clearSave, normaliseSave } from './save.js';
import { createAudio } from './audio.js';
import { shotFromUrl, stageShot } from './shots.js';

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));
// Debug hook for scripted play-tests (and the screenshot tool): the live
// game state. Harmless in production — read-only unless a test drives it.
window.__game = null;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const rawSave = loadSave();
const save = normaliseSave(rawSave);
const city = buildCity();

function garageFromSave(sv) {
  // Rebuild the garage collection from save data (plain objects -> cars).
  if (sv?.garage && Array.isArray(sv.garage.owned) && sv.garage.owned.length) {
    return {
      owned: sv.garage.owned.map((o) => {
        const c = makeCar(GARAGE.x, GARAGE.y + 120, 0, { color: o.color, name: o.name });
        c.engineLvl = o.engineLvl || 0; c.armorLvl = o.armorLvl || 0;
        c.maxHp = o.maxHp || 100; c.hp = o.hp ?? c.maxHp;
        return c;
      }),
    };
  }
  return null;
}

const s = {
  state: 'title', started: false, time: 0,
  money: save.money,
  raceBest: save.raceBest || 0,
  day: { day: save.day, mins: save.clockMins }, // 3-day clock: Day 1 08:00
  heat: save.heat || {},                         // per-district heat 0..100
  tickerLine: '', tickerTimer: 8,
  garageOpen: false,
  player: {
    x: 850, y: 1050, angle: -Math.PI / 2, health: PLAYER.maxHealth,
    inCar: false, car: makeCar(850, 1050, 0, { isPlayer: true, color: '#d94f3d', name: 'Comet' }),
    rammed: 0,
  },
  city, wanted: createWanted(),
  missions: createMissions(save),
  combat: createCombat(),
  traffic: [], peds: [],
  cam: { x: 0, y: 0, w: 1280, h: 720, zoom: 1, shake: 0 },
  view: { w: 1280, h: 720 },
  district: { name: 'OLD TOWN', note: '' },
  audio: createAudio(),
  input: createInput(),
  hud: null,
  parked: [],
  saveTimer: 0, regenTimer: 0, autosaveNote: false,
};
s.combat.hasPistol = !!save?.hasPistol;
s.combat.ammo = s.combat.hasPistol ? 24 : 0;
s.player.car.x = 900; s.player.car.y = 1150;
// Garage: the player's own collection. A loaded save restores its cars and
// the player drives the first of them; a fresh game starts with the Comet.
const savedGarage = garageFromSave(save);
s.garage = savedGarage || { owned: [s.player.car] };
if (savedGarage) {
  s.player.car = s.garage.owned[0];
  s.player.car.x = 900; s.player.car.y = 1150; s.player.car.isPlayer = true;
}

// Parked cars the player can steal (plus all traffic cars are stealable).
const PARKED_SPOTS = [
  [950, 500, 0, '#3d7dd9', 'Voyager'], [2050, 500, 0, '#e8c33a', 'Comet'],
  [2850, 1250, Math.PI / 2, '#7a4fd9', 'Stallion'], [1250, 2050, 0, '#2fae6e', 'Dune'],
  [3250, 2050, Math.PI / 2, '#e8e4d8', 'Meridian'], [850, 2350, 0, '#d97a3d', 'Falcon'],
];
for (const [x, y, a, color, name] of PARKED_SPOTS) {
  const c = makeCar(x, y, a, { color, name });
  c.target = null; s.parked.push(c);
}

s.traffic = spawnTraffic(city, 16, s.player);
s.peds = spawnPedestrians(city, 26, s.player);
s.hud = createHud();
window.__game = s;

// ---------- helpers ----------
function nearestStealable(maxDist = 70) {
  let best = null, bd = maxDist;
  const all = [...s.parked, ...s.traffic, ...s.wanted.copCars];
  for (const c of all) {
    if (c.dead) continue;
    const d = Math.hypot(c.x - s.player.x, c.y - s.player.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// Staged-shot autopilot: steer the car around the Sunset Strip race loop
// (RACE_LOOP) so a screenshot cruise never runs to a world edge.
function cruiseInput(car) {
  const wp = RACE_LOOP[s.cruiseWp || 0];
  const dx = wp.x - car.x, dy = wp.y - car.y;
  if (Math.hypot(dx, dy) < 140) s.cruiseWp = ((s.cruiseWp || 0) + 1) % RACE_LOOP.length;
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { up: true, down: false, left: diff < -0.08, right: diff > 0.08, handbrake: false };
}

function stealCar(car) {
  const wasParked = s.parked.includes(car);
  const wasTraffic = s.traffic.includes(car);
  const wasCop = s.wanted.copCars.includes(car);
  if (wasParked) s.parked = s.parked.filter((c) => c !== car);
  if (wasTraffic) s.traffic = s.traffic.filter((c) => c !== car);
  if (wasCop) s.wanted.copCars = s.wanted.copCars.filter((c) => c !== car);
  s.player.car = car;
  car.isPlayer = true; car.traffic = false; car.isCop = false;
  s.player.inCar = true;
  // Mark the theft for a live steal step: missions.js only counts a steal
  // that happens after the mission started.
  if (s.missions.active) {
    const a = s.missions.active;
    if (a.def.steps[a.step] && a.def.steps[a.step].stealCar) a.stoleCar = true;
  }
  s.player.x = car.x; s.player.y = car.y;
  addWanted(s.wanted, 1, 'Grand theft auto');
  crimeHeat(12);
  showToast(s.hud, `Stole the ${car.name}! +1 ★ — the heat is on`, 3);
  s.audio.pickup();
  s.audio.siren(true);
}

function exitCar() {
  const car = s.player.car;
  const side = car.angle + Math.PI / 2;
  s.player.x = car.x + Math.cos(side) * 44;
  s.player.y = car.y + Math.sin(side) * 44;
  s.player.angle = car.angle;
  s.player.inCar = false;
  car.speed = 0;
  if (!s.parked.includes(car)) s.parked.push(car);
}

function damagePlayer(n, cause) {
  s.player.health -= n;
  s.cam.shake = Math.max(s.cam.shake, 8);
  if (s.player.health <= 0) {
    s.player.health = 0;
    if (cause === 'busted') enterBusted();
    else enterWasted();
  }
}

function enterBusted() {
  s.state = 'busted';
  const fine = Math.min(s.money, MONEY.bustedFine);
  s.money -= fine;
  s.wanted.stars = 0; s.wanted.copCars = []; s.wanted.copFoot = [];
  s.audio.siren(false);
  document.getElementById('end-title').textContent = 'BUSTED';
  document.getElementById('end-sub').textContent = `The Halcyon PD took $${fine} and your freedom for a night. Rico walks out at dawn — the city still owes him.`;
  document.getElementById('end-screen').style.display = 'flex';
  writeSave(s);
}

function enterWasted() {
  s.state = 'wasted';
  const fee = Math.min(s.money, MONEY.wastedFee);
  s.money -= fee;
  s.wanted.stars = 0; s.wanted.copCars = []; s.wanted.copFoot = [];
  s.audio.siren(false);
  document.getElementById('end-title').textContent = 'WASTED';
  document.getElementById('end-sub').textContent = `Rico wakes up in St. Marina Hospital, $${fee} lighter. The Bay doesn't wait — neither does he.`;
  document.getElementById('end-screen').style.display = 'flex';
  writeSave(s);
}

function respawn() {
  document.getElementById('end-screen').style.display = 'none';
  if (s.player.inCar) { s.parked.push(s.player.car); s.player.inCar = false; }
  s.player.x = 850; s.player.y = 1650; s.player.angle = 0;
  s.player.health = PLAYER.maxHealth;
  s.state = 'playing';
  showToast(s.hud, 'Back on the streets of Halcyon Bay.', 3);
}

// ---------- day clock, radio ticker, sleep, garage ----------
function fmtClock(mins) {
  const m = Math.floor(mins);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function crimeHeat(n) {
  addDistrictHeat(s.heat, s.district.name, n);
  const hot = hottestDistrict(s.heat);
  if (hot && hot.value >= 50 && hot.name === s.district.name) {
    showToast(s.hud, `${hot.name} is hot — the PD remembers this district.`, 3);
  }
}

function pickTicker() {
  // Dispatch when the heat is on; otherwise Mara / Old Sal — and the city
  // remembers finished jobs in their lines.
  let pool;
  if (s.wanted.stars >= 3) pool = TICKER.dispatch;
  else if (s.wanted.stars > 0) pool = Math.random() < 0.5 ? TICKER.dispatch : TICKER.mara;
  else pool = Math.random() < 0.5 ? TICKER.mara : TICKER.sal;
  let line = pool[Math.floor(Math.random() * pool.length)];
  const mem = memoryLine(s.missions);
  if (mem && Math.random() < 0.35) line = `MARA: "${mem}"`;
  s.tickerLine = line;
}

function sleepAtSafehouse() {
  if (s.day.day >= DAY.days) { showToast(s.hud, 'Final day — no more sleep. Finish the King of Halcyon job.', 3); return; }
  const done = [...s.missions.completed].length;
  s.day.day++;
  s.day.mins = DAY.startMins;
  // Sleep cools the city: heat halves, stars clear, health restored.
  for (const k of Object.keys(s.heat)) s.heat[k] = Math.floor(s.heat[k] / 2);
  s.wanted.stars = 0; s.wanted.copCars = []; s.wanted.copFoot = []; s.wanted.heli = null;
  s.player.health = PLAYER.maxHealth;
  s.audio.siren(false);
  const mem = memoryLine(s.missions);
  document.getElementById('day-card-title').textContent = `DAY ${s.day.day}`;
  document.getElementById('day-card-sub').textContent =
    `Rico sleeps at the Palm Hills safehouse. ${done}/12 jobs done — Day ${s.day.day} brings jobs ${s.day.day === 2 ? '5–8' : '9–12'}.` +
    (mem ? ` ${mem}` : ' The city is quiet. For now.');
  document.getElementById('day-overlay').style.display = 'flex';
  s.state = 'sleeping';
  s.audio.sting();
  writeSave(s);
  setTimeout(() => {
    document.getElementById('day-overlay').style.display = 'none';
    if (s.state === 'sleeping') s.state = 'playing';
    const i = s.missions.nextIndex(s.day.day);
    if (i >= 0) showBanner(s.hud, MISSION_LIST[i].title, `${MISSION_LIST[i].giver}: ${MISSION_LIST[i].brief}`, 6);
  }, 2600);
}

function renderGaragePanel() {
  const car = s.player.car;
  document.getElementById('garage-money').textContent = `Wallet: $${Math.floor(s.money).toLocaleString('en-US')} · Active: ${car.name} (Engine Lv${car.engineLvl} · Armour Lv${car.armorLvl} · ${Math.round(car.hp / car.maxHp * 100)}% HP)`;
  const list = document.getElementById('garage-cars');
  list.innerHTML = '';
  s.garage.owned.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'garage-car' + (c === car ? ' active' : '');
    d.innerHTML = `<div class="nm">${c.name.toUpperCase()}</div><div class="meta">Engine Lv${c.engineLvl} · Armour Lv${c.armorLvl} · ${Math.round(c.hp / c.maxHp * 100)}% HP</div><div class="meta">${c === car ? '● IN USE — click to keep' : 'Click to drive this car'}</div>`;
    d.addEventListener('click', () => switchGarageCar(i));
    list.appendChild(d);
  });
  const ups = document.getElementById('garage-upgrades');
  ups.innerHTML = '';
  for (const [kind, u] of Object.entries(GARAGE.upgrades)) {
    const lvl = kind === 'engine' ? car.engineLvl : kind === 'armor' ? car.armorLvl : (car.paintLvl || 0);
    const maxed = lvl >= u.max;
    const d = document.createElement('div');
    d.className = 'upg';
    d.innerHTML = `<div class="nm">${u.name}</div><div class="lv">Lv ${lvl}/${u.max} — ${u.desc}</div>`;
    const b = document.createElement('button');
    b.className = 'btn' + (maxed ? ' ghost' : '');
    b.textContent = maxed ? 'MAXED' : `Buy — $${u.price}`;
    b.disabled = maxed;
    b.addEventListener('click', () => buyUpgrade(kind));
    d.appendChild(b);
    ups.appendChild(d);
  }
  document.getElementById('btn-garage-store').style.display = s.player.inCar ? '' : 'none';
}

function openGarage() {
  renderGaragePanel();
  document.getElementById('garage-overlay').style.display = 'flex';
  s.garageOpen = true;
  s.state = 'garage';
}

function closeGarage() {
  document.getElementById('garage-overlay').style.display = 'none';
  s.garageOpen = false;
  if (s.state === 'garage') s.state = 'playing';
}

function switchGarageCar(i) {
  const next = s.garage.owned[i];
  if (!next || next === s.player.car) return;
  if (s.player.inCar) {
    const old = s.player.car;
    old.x = GARAGE.x - 40; old.y = GARAGE.y + 120; old.speed = 0;
    if (!s.parked.includes(old)) s.parked.push(old);
  }
  s.player.car = next;
  next.x = GARAGE.x; next.y = GARAGE.y + 60; next.angle = 0; next.speed = 0;
  next.isPlayer = true;
  s.player.inCar = true;
  s.player.x = next.x; s.player.y = next.y; s.player.angle = 0;
  s.audio.pickup();
  showToast(s.hud, `Now driving the ${next.name} — Engine Lv${next.engineLvl}, Armour Lv${next.armorLvl}.`, 3);
  renderGaragePanel();
}

function storeCurrentCar() {
  if (!s.player.inCar) return;
  const car = s.player.car;
  car.hp = car.maxHp; // the garage repairs what it stores, free
  car.speed = 0;
  if (!s.garage.owned.includes(car)) s.garage.owned.push(car);
  s.player.inCar = false;
  s.player.x = GARAGE.x; s.player.y = GARAGE.y + 60;
  if (!s.parked.includes(car)) s.parked.push(car);
  s.audio.clank();
  showToast(s.hud, `${car.name} stored at Rico's Garage — repaired to ${car.maxHp} HP.`, 3);
  writeSave(s);
  renderGaragePanel();
}

function buyUpgrade(kind) {
  const u = GARAGE.upgrades[kind];
  const car = s.player.car;
  const lvl = kind === 'engine' ? car.engineLvl : kind === 'armor' ? car.armorLvl : (car.paintLvl || 0);
  if (lvl >= u.max) { showToast(s.hud, `${u.name} is already maxed.`, 2); return; }
  if (s.money < u.price) { showToast(s.hud, `Not enough cash — ${u.name} costs $${u.price}.`, 2.5); return; }
  const charged = upgradeCar(car, kind);
  if (!charged) return;
  s.money -= charged;
  s.audio.clank();
  showToast(s.hud, `${u.name} upgraded on the ${car.name} — $${charged}.`, 3);
  writeSave(s);
  renderGaragePanel();
}

function startGame(fresh) {
  if (fresh) {
    clearSave();
    s.money = MONEY.start;
    s.missions = createMissions(null);
    s.combat = createCombat();
    s.wanted = createWanted();
    s.day = { day: 1, mins: DAY.startMins };
    s.heat = {};
    s.garage = { owned: [s.player.car] };
    s.player.car = makeCar(850, 1050, 0, { isPlayer: true, color: '#d94f3d', name: 'Comet' });
    s.player.car.x = 900; s.player.car.y = 1150;
    s.garage.owned = [s.player.car];
    s.player.health = PLAYER.maxHealth;
  }
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  s.state = 'playing';
  s.started = true;
  s.audio.ensure();
  if (!s.missions.active && s.missions.nextIndex() >= 0) {
    showBanner(s.hud, 'HALCYON BAY', STORY.intro, 6);
  }
}

// ---------- per-frame update ----------
function update(dt) {
  const P = s.player, inp = s.input;
  s.time += dt;

  if (inp.consume('KeyP') || inp.consume('Escape')) {
    if (s.state === 'garage') closeGarage();
    else if (s.state === 'playing') { s.state = 'paused'; document.getElementById('pause-screen').style.display = 'flex'; }
    else if (s.state === 'paused') { s.state = 'playing'; document.getElementById('pause-screen').style.display = 'none'; }
  }
  if (s.state === 'garage' && inp.consume('KeyB')) closeGarage();
  if (inp.consume('KeyM')) { s.audio.muted = !s.audio.muted; showToast(s.hud, s.audio.muted ? 'Sound muted' : 'Sound on', 1.5); }
  if (s.state !== 'playing') return;

  // --- day clock, district heat decay, radio ticker ---
  s.day.mins += dt * DAY.minsPerSec;
  if (s.day.mins >= DAY.endMins) {
    s.day.mins = DAY.endMins;
    if (!s.lateWarned) { s.lateWarned = true; showToast(s.hud, 'Late — 23:00. Sleep at the Palm Hills safehouse (N) to start the next day.', 5); }
  } else s.lateWarned = false;
  decayDistrictHeat(s.heat, dt);
  s.tickerTimer -= dt;
  if (s.tickerTimer <= 0) { pickTicker(); s.tickerTimer = 8; }
  // Garage (B) + sleep (N) — only near the right place.
  if (inp.consume('KeyB')) {
    if (Math.hypot(P.x - GARAGE.x, P.y - GARAGE.y) < GARAGE.radius) openGarage();
    else showToast(s.hud, "Rico's Garage is in Palm Hills — green G on the minimap.", 2.5);
  }
  if (inp.consume('KeyN')) {
    if (Math.hypot(P.x - SAFEHOUSE.x, P.y - SAFEHOUSE.y) < SAFEHOUSE.radius) sleepAtSafehouse();
    else showToast(s.hud, 'Sleep at the Palm Hills safehouse — gold ⌂ on the minimap.', 2.5);
  }

  // --- on foot ---
  if (!P.inCar) {
    const mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const my = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const moving = mx !== 0 || my !== 0;
    const speed = inp.handbrake ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (moving) {
      const a = Math.atan2(my, mx);
      P.angle = a;
      const nx = P.x + Math.cos(a) * speed * dt;
      const ny = P.y + Math.sin(a) * speed * dt;
      const hit = city.collideCircle(nx, ny, PLAYER.radius);
      if (!hit) { P.x = nx; P.y = ny; }
      else { P.x = nx + hit.x; P.y = ny + hit.y; }
      P.x = Math.max(30, Math.min(WORLD.w - 30, P.x));
      P.y = Math.max(30, Math.min(WORLD.h - 30, P.y));
    }
    // Enter a car.
    if (inp.consume('KeyE')) {
      const car = nearestStealable();
      if (car) stealCar(car);
      else showToast(s.hud, 'No car close enough — find one on the road.', 2);
    }
    // Combat.
    if (inp.consume('KeyF') || inp.mouse.clicked) {
      const evs = playerAttack(s.combat, P, s.peds, s.wanted.copFoot, s.traffic, s.time);
      for (const e of evs) {
        if (e.type === 'hitPed') { addWanted(s.wanted, 1, 'Assault'); crimeHeat(6); s.audio.punch(); }
        if (e.type === 'hitCop') { addWanted(s.wanted, 2, 'Assaulting an officer'); crimeHeat(10); s.audio.punch(); }
        if (e.type === 'shot') { addWanted(s.wanted, 1, 'Shots fired'); crimeHeat(8); s.audio.shot(); }
      }
    }
    if (inp.consume('KeyG')) {
      if (s.combat.hasPistol) {
        s.combat.weapon = s.combat.weapon === 'fists' ? 'pistol' : 'fists';
        showToast(s.hud, `Weapon: ${s.combat.weapon.toUpperCase()}`, 1.5);
      } else showToast(s.hud, 'No pistol yet — finish mission 1 for Mara.', 2);
    }
    // Race start at the Strip, courier start at the market.
    if (inp.consume('KeyR') && !s.missions.race) {
      if (Math.hypot(P.x - 2050, P.y - 500) < 120 || P.inCar) {
        s.missions.race = { cp: 0, startTime: Date.now(), best: s.raceBest };
        showToast(s.hud, 'STREET RACE — hit every checkpoint, beat the clock!', 3);
      } else showToast(s.hud, 'Races start at the Sunset Strip (north marker).', 2.5);
    }
    if (inp.consume('KeyC') && !s.missions.courier) {
      if (Math.hypot(P.x - 850, P.y - 1450) < 140) {
        const to = city.nodes[Math.floor(Math.random() * city.nodes.length)];
        s.missions.courier = { to, timeLeft: 60, pay: 80 + Math.floor(Math.random() * 120) };
        showToast(s.hud, `COURIER — deliver to the marker in 60s for $${s.missions.courier.pay}!`, 3);
      } else showToast(s.hud, 'Courier jobs start at the Old Town market.', 2.5);
    }
  } else {
    // --- driving ---
    // Staged screenshots keep the throttle down. The drive shot loops the
    // Sunset Strip race loop forever (never runs to a world edge during a
    // slow SwiftShader screenshot); the chase shot cruises straight.
    const driveInput = s.shotCruise
      ? (s.cruiseLoop ? cruiseInput(P.car) : { ...inp, up: true, down: false, left: false, right: false, handbrake: false })
      : inp;
    const speed = updatePlayerCar(P.car, driveInput, dt);
    P.x = P.car.x; P.y = P.car.y; P.angle = P.car.angle;
    s.audio.engine(Math.abs(P.car.speed) / CAR.maxSpeed);
    // Building collision: bounce + scrape damage at speed (car HP too).
    const hit = city.collideCircle(P.car.x, P.car.y, CAR.radius);
    if (hit) {
      P.car.x += hit.x; P.car.y += hit.y;
      if (Math.abs(P.car.speed) > 240) {
        P.health -= 4; P.car.hp = Math.max(5, P.car.hp - 6);
        s.cam.shake = 10; s.audio.punch();
        if (P.car.hp <= 10) showToast(s.hud, `${P.car.name} is wrecked — take it to Rico's Garage (B).`, 3);
      }
      P.car.speed *= -0.25;
    }
    // Hit a pedestrian with the car.
    for (const p of s.peds) {
      if (p.down > 0) continue;
      if (Math.hypot(p.x - P.car.x, p.y - P.car.y) < 30 && Math.abs(P.car.speed) > 60) {
        p.down = 5;
        addWanted(s.wanted, 1, 'Hit and run');
        crimeHeat(8);
        showToast(s.hud, 'You hit a pedestrian! +1 ★', 2.5);
        s.audio.punch();
      }
    }
    // Cop ram damage.
    if (P.rammed > 0.4) { damagePlayer(6, 'ram'); P.car.hp = Math.max(5, P.car.hp - 2); P.rammed = 0; }
    // Exit car.
    if (inp.consume('KeyE')) exitCar();
    if (inp.consume('KeyF')) s.audio.tone(440, 0.15, 'square', 0.08);
  }

  // Mission auto-start on the marker (only jobs whose day has arrived).
  // Works on foot AND in a car — driving to the gold marker must start the
  // job. (Steal steps still need a real theft after the start: see stoleCar.)
  if (!s.missions.active && !s.missions.race && !s.missions.courier) {
    const i = s.missions.nextIndex(s.day.day);
    if (i >= 0) {
      const step = MISSION_LIST[i].steps[0];
      if (Math.hypot(P.x - step.x, P.y - step.y) < step.radius + 10) {
        const def = startMission(s.missions, i);
        showBanner(s.hud, def.title, `${def.giver}: ${def.brief}`, 6);
        s.audio.sting();
        if (def.startStars) { s.wanted.stars = def.startStars; s.audio.siren(true); }
      }
    }
  }

  // Traffic + pedestrians. The helicopter spotlight scatters pedestrians too.
  const danger = P.inCar && Math.abs(P.car.speed) > 200
    ? { x: P.x, y: P.y, r: 130 }
    : (s.combat.weapon === 'pistol' && s.combat.cooldown > 0.1 ? { x: P.x, y: P.y, r: 160 } : null);
  const heliDanger = s.wanted.heli
    ? { x: s.wanted.heli.spotX, y: s.wanted.heli.spotY, r: 120, heli: true }
    : null;
  updateTraffic(s.traffic, city, dt, P, danger);
  updatePedestrians(s.peds, city, dt, danger || heliDanger);
  updatePedestrians(s.wanted.copFoot, city, dt, null);
  updateCombat(s.combat, dt, s.peds, s.wanted.copFoot, s.traffic, (kind) => {
    if (kind === 'hitPed') { addWanted(s.wanted, 1, 'Shooting'); crimeHeat(6); }
    if (kind === 'hitCop') { addWanted(s.wanted, 2, 'Shooting an officer'); crimeHeat(10); }
  });

  // Police + wanted.
  const seen = updateWanted(s.wanted, dt, P, P.inCar, city);
  s.audio.siren(s.wanted.stars > 0);
  s.audio.rotor(!!s.wanted.heli);
  if (s.wanted.bustedTimer > 0) { s.wanted.bustedTimer = 0; damagePlayer(999, 'busted'); }

  // Missions.
  const events = updateMissions(s.missions, P, dt, {
    wantedStars: s.wanted.stars,
    onStealCar: () => { addWanted(s.wanted, 2, 'Grand theft auto'); },
  });
  for (const e of events) {
    if (e.type === 'step') { s.audio.pickup(); showToast(s.hud, 'Objective updated — check the gold marker.', 2.5); }
    if (e.type === 'complete') {
      s.money += e.reward;
      if (e.def.unlock === 'pistol') { s.combat.hasPistol = true; s.combat.ammo = 24; showToast(s.hud, `Mission complete! +$${e.reward} — Mara gave you a PISTOL (G to switch).`, 5); }
      else showToast(s.hud, `Mission complete! +$${e.reward}`, 4);
      showBanner(s.hud, 'JOB DONE', `${e.def.title} — $${e.reward} in the pocket.`, 4);
      s.audio.sting();
      writeSave(s);
    }
    if (e.type === 'fail') { s.audio.fail(); showToast(s.hud, `Mission failed: ${e.reason}`, 4); }
    if (e.type === 'raceDone') {
      const pay = 200 + (e.best ? 150 : 0);
      s.money += pay;
      if (e.best) s.raceBest = e.time;
      showBanner(s.hud, 'RACE WON', `${fmtTime(e.time)}${e.best ? ' — new best!' : ''} +$${pay}`, 4);
      s.audio.sting(); writeSave(s);
    }
    if (e.type === 'courierDone') { s.money += e.pay; showToast(s.hud, `Delivery done! +$${e.pay}`, 3); s.audio.sting(); writeSave(s); }
    if (e.type === 'courierFail') { s.audio.fail(); showToast(s.hud, 'Courier failed — too slow.', 3); }
  }

  // Sun-shells.
  for (const c of city.coins) {
    if (!c.taken && Math.hypot(P.x - c.x, P.y - c.y) < 34) {
      c.taken = true; s.missions.shells++; s.money += 50;
      showToast(s.hud, `Sun-shell ${s.missions.shells}/12 — +$50`, 2);
      s.audio.pickup(); writeSave(s);
    }
  }

  // Health regen when calm.
  if (s.wanted.stars === 0 && P.health < PLAYER.maxHealth) {
    s.regenTimer += dt;
    if (s.regenTimer > 1) { s.regenTimer = 0; P.health = Math.min(PLAYER.maxHealth, P.health + 2); }
  }
  // Autosave.
  s.saveTimer += dt;
  if (s.saveTimer > 15) { s.saveTimer = 0; writeSave(s); }

  s.district = city.districtAt(P.x, P.y);
  updateHud(s.hud, s, dt);
  inp.endFrame();
}

// ---------- rendering ----------
function drawPlayer(ctx, P, time) {
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.fillStyle = 'rgba(40,30,20,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 4, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(P.angle + Math.PI / 2);
  const bob = Math.sin(time * 10) * 1.5;
  ctx.strokeStyle = '#1d2a3a'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-4 + bob, 11); ctx.moveTo(4, 4); ctx.lineTo(4 - bob, 11); ctx.stroke();
  // Rico: teal jacket, dark jeans, cap.
  ctx.fillStyle = '#0e7490';
  ctx.beginPath(); ctx.roundRect(-8, -7, 16, 14, 6); ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(0, -12, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.beginPath(); ctx.arc(0, -14, 6.5, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(-6.5, -15, 13, 3);
  if (s.combat.weapon === 'pistol') {
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -2, 10, 4);
  }
  ctx.restore();
}

function drawMarkerBeacon(ctx, mk, time) {
  if (!mk) return;
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.translate(mk.x, mk.y);
  ctx.fillStyle = mk.color + '44';
  ctx.beginPath(); ctx.ellipse(0, 0, 46 * pulse, 46 * pulse, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = mk.color; ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.arc(0, 0, 40 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // Beacon beam.
  const grad = ctx.createLinearGradient(0, -160, 0, 0);
  grad.addColorStop(0, mk.color + '00');
  grad.addColorStop(1, mk.color + 'aa');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -160); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mk.color;
  ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(12, -6); ctx.lineTo(0, 2); ctx.lineTo(-12, -6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function render() {
  const w = canvas.width, h = canvas.height;
  s.view.w = w; s.view.h = h;
  const P = s.player;
  // Camera follows with smoothing + shake.
  const tx = P.x - w / 2, ty = P.y - h / 2;
  s.cam.x += (tx - s.cam.x) * 0.12;
  s.cam.y += (ty - s.cam.y) * 0.12;
  s.cam.x = Math.max(-80, Math.min(WORLD.w - w + 80, s.cam.x));
  s.cam.y = Math.max(-80, Math.min(WORLD.h - h + 80, s.cam.y));
  const shx = s.cam.shake > 0 ? (Math.random() - 0.5) * s.cam.shake : 0;
  const shy = s.cam.shake > 0 ? (Math.random() - 0.5) * s.cam.shake : 0;
  s.cam.shake = Math.max(0, s.cam.shake - 0.6);
  ctx.save();
  ctx.translate(-s.cam.x + shx, -s.cam.y + shy);
  const camBox = { x: s.cam.x - 60, y: s.cam.y - 60, w: w + 120, h: h + 120 };
  drawCity(ctx, city, camBox);
  drawMarkerBeacon(ctx, missionMarker(s.missions), s.time);
  for (const c of s.parked) drawCar(ctx, c);
  for (const c of s.traffic) drawCar(ctx, c);
  for (const c of s.wanted.copCars) drawCar(ctx, c);
  drawHelicopter(ctx, s.wanted, s.time);
  for (const p of s.peds) drawPedestrian(ctx, p, s.time);
  for (const o of s.wanted.copFoot) drawPedestrian(ctx, o, s.time);
  if (P.inCar) drawCar(ctx, P.car);
  else drawPlayer(ctx, P, s.time);
  drawCombat(ctx, s.combat, P);
  ctx.restore();

  // Warm sun wash + vignette (sun-soaked look).
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(255,214,140,0.10)');
  wash.addColorStop(1, 'rgba(255,160,80,0.05)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,10,0,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // Low-health red pulse.
  if (P.health < 30 && s.state === 'playing') {
    ctx.fillStyle = `rgba(200,0,0,${0.12 + Math.sin(s.time * 6) * 0.06})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// ---------- loop ----------
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try {
    // update() also runs in 'garage' state: its top handles the keyboard
    // close (B / P / Esc). Without this, opening the garage with B left the
    // game frozen — B could never close it again (only a mouse click could).
    if (s.state === 'playing' || s.state === 'paused' || s.state === 'garage') update(dt);
    if (s.state !== 'title') render();
    // Staged shots: signal ready + freeze after 10 rendered frames.
    if (s.shotFrames != null) {
      s.shotFrames++;
      if (s.shotFrames >= 10) {
        window.__shotReady = true;
        if (!s.shotGarage) s.state = 'paused';
        s.shotFrames = null;
      }
    }
  } catch (err) {
    window.__errors.push(String(err && err.message || err));
  }
  requestAnimationFrame(frame);
}

// ---------- menus ----------
function wireMenus() {
  document.getElementById('btn-start').addEventListener('click', () => startGame(false));
  document.getElementById('btn-new').addEventListener('click', () => startGame(true));
  document.getElementById('btn-resume').addEventListener('click', () => {
    s.state = 'playing';
    document.getElementById('pause-screen').style.display = 'none';
  });
  document.getElementById('btn-quit-title').addEventListener('click', () => {
    s.state = 'title';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('title-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
  });
  document.getElementById('btn-continue').addEventListener('click', respawn);
  document.getElementById('title-screen').addEventListener('click', (e) => {
    if (e.target.id === 'title-screen') startGame(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      if (s.state === 'title') startGame(false);
      else if (s.state === 'busted' || s.state === 'wasted') respawn();
    }
  });
  document.getElementById('btn-garage-close').addEventListener('click', closeGarage);
  document.getElementById('btn-garage-store').addEventListener('click', storeCurrentCar);
  // Fill the save line + controls list on the title screen.
  const saveLine = document.getElementById('save-line');
  const doneCount = (save.missionsDone || []).length;
  if (rawSave) {
    saveLine.textContent = `Saved progress: $${save.money ?? 0} · ${doneCount}/12 jobs done · Day ${save.day || 1} · ${save.shells || 0}/12 shells · saved ${new Date(save.savedAt || Date.now()).toLocaleDateString()}`;
  } else {
    saveLine.textContent = 'No saved game yet — a fresh start in Halcyon Bay.';
  }
  // Most-wanted poster: reputation rank + the city remembers.
  const poster = document.getElementById('wanted-poster');
  if (poster) {
    const rank = reputationFor({ completed: new Set(save.missionsDone || []) });
    const mem = memoryLine({ completed: new Set(save.missionsDone || []) });
    poster.textContent = `★ WANTED: RICO VEGA — ${rank} · ${doneCount}/12 jobs ★` + (mem ? ` — ${mem}` : '');
  }
  // Pause screen poster, refreshed every time the game pauses.
  const pausePoster = document.getElementById('pause-wanted-poster');
  const refreshPause = () => {
    const rank = reputationFor(s.missions);
    const mem = memoryLine(s.missions);
    if (pausePoster) pausePoster.textContent = `★ WANTED: RICO VEGA — ${rank} · ${s.missions.completed.size}/12 jobs ★`;
    const ml = document.getElementById('memory-line');
    if (ml) ml.textContent = mem || 'The city hasn\'t noticed Rico Vega yet.';
  };
  document.getElementById('pause-screen').addEventListener('click', refreshPause);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyP' || e.code === 'Escape') setTimeout(refreshPause, 0); });
  const cl = document.getElementById('controls-list');
  cl.innerHTML = CONTROLS.map(([k, v]) => `<div><b>${k}</b> — ${v}</div>`).join('');
}

// ---------- boot ----------
wireMenus();
const shot = shotFromUrl();
if (shot === 'start') {
  // Title screen shot: leave the title visible, hide the HUD, render nothing.
  document.getElementById('hud').style.display = 'none';
  setTimeout(() => { window.__shotReady = true; }, 800);
} else if (shot) {
  // Staged screenshot: skip the title, set the scene, then signal ready.
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  stageShot(s, shot);
  if (s.shotGarage) openGarage(); // foot shot: the MY CARS panel is the subject
  updateHud(s.hud, s, 0);
  // Freeze the scene once a few frames have rendered: under slow SwiftShader
  // a screenshot takes tens of seconds, and a cruising car would drive to a
  // world edge (or U-turn into a building) while it captures. Paused state
  // keeps rendering but stops the simulation, so the frame is exactly the
  // staged composition. Frame-counted (not setTimeout): headless Chrome
  // throttles background timers, which made __shotReady flaky; rAF is the
  // game's own heartbeat. The 20s timer is only a fallback.
  s.shotFrames = 0;
  setTimeout(() => { if (window.__shotReady !== true) { window.__shotReady = true; if (!s.shotGarage) s.state = 'paused'; } }, 20000);
} else {
  setTimeout(() => { window.__shotReady = true; }, 600);
}
requestAnimationFrame(frame);
