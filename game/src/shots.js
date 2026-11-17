// HALCYON BAY — shots.js
// One job: stage the four screenshot scenes from the URL (?shot=...).
// Each shot puts several systems on screen at once — chase + heli + stars +
// mission strip + day chip + ticker, garage panel, driving at speed, and the
// title screen.
// Debug hooks (used ONLY by the screenshot tool, documented here):
//   ?shot=chase&stars=4&day=2&mins=1087   — stars/day/clock overrides
//   ?shot=foot&day=1&mins=624            — garage scene (panel opens)
//   ?shot=drive&day=2&mins=1215
//   ?shot=start
// mins = minutes since midnight (1087 = 18:07). seed is accepted and ignored
// (the city is deterministic; traffic/peds are seeded by the city builder).
// Returns the shot name, or null for normal play.
import { MISSION_LIST } from './missions.js';
import { makeCar } from './vehicles.js';

export function shotFromUrl() {
  const q = new URLSearchParams(location.search);
  return q.get('shot');
}

function shotParams() {
  const q = new URLSearchParams(location.search);
  const n = (k, d) => {
    const v = parseInt(q.get(k), 10);
    return Number.isFinite(v) ? v : d;
  };
  return { stars: n('stars', null), day: n('day', null), mins: n('mins', null) };
}

export function stageShot(s, name) {
  const P = s.player;
  const qp = shotParams();
  if (name === 'start') {
    s.state = 'title';
    return;
  }
  s.state = 'playing';
  s.started = true;
  s.shotCruise = false;
  s.shotGarage = false;
  s.cruiseLoop = false;
  s.tickerTimer = 8; // keep the staged ticker line on screen for the shot
  if (qp.day) s.day.day = Math.max(1, Math.min(3, qp.day));
  if (qp.mins) s.day.mins = qp.mins;
  if (name === 'chase') {
    // Cover: police chase downtown, 4 stars, helicopter overhead with its
    // spotlight on Rico, mission 3/12 live, day chip, ticker, vehicle HUD.
    P.x = 1250; P.y = 850; P.angle = 0;
    P.inCar = true;
    P.car.x = 1250; P.car.y = 850; P.car.angle = 0; P.car.speed = 420;
    P.car.color = '#d94f3d'; P.car.name = 'Meridian';
    P.car.hp = 82; P.car.maxHp = 100; P.car.engineLvl = 1;
    s.money = 2340; P.health = 82;
    s.day.day = qp.day || 2; s.day.mins = qp.mins || 18 * 60 + 7; // DAY 2 · 18:07
    s.shotCruise = true;
    s.wanted.stars = qp.stars || 4;
    s.wanted.copCars = [];
    for (let i = 0; i < 3; i++) {
      const c = { x: 1080 - i * 110, y: 850 + (i % 2 ? 34 : -34), angle: 0, speed: 380, isCop: true, color: '#1d2a3a', name: 'Interceptor', w: 46, h: 22, brakeLight: false, dead: false, id: 900 + i, traffic: false, hp: 100, maxHp: 100, engineLvl: 0, armorLvl: 0,
        callsign: ['PELICAN 1', 'KESTREL 2', 'FALCON 3'][i], officer: ['R. Doyle', 'T. Marsh', 'K. Voss'][i] };
      s.wanted.copCars.push(c);
    }
    s.wanted.copFoot = [];
    // Helicopter already overhead, spotlight locked on Rico. Staged at
    // orbit angle -0.35 so the (now much larger) airframe sits up-right of
    // the player car, mid-frame — not at the screen edge.
    s.wanted.heli = { angle: -0.35, x: P.x + 220, y: P.y - 160, spotX: P.x, spotY: P.y, fade: 1, lit: true, callsign: 'HELI 2-7' };
    s.wanted.heliDelay = 99;
    // District heat: Downtown is hot from the job, Harbor still remembers.
    s.heat = { DOWNTOWN: 62, HARBOR: 41 };
    s.tickerLine = 'HPD DISPATCH: helicopter 2-7 is overhead, spotlight on the suspect. Do not lose visual.';
    s.missions.active = { def: MISSION_LIST[2], step: 0, holdT: 0, timeLeft: 211, startedAt: Date.now() };
    // Mission 3 live means m1+m2 are done — so the pistol (m1's unlock) is
    // equipped and the rep chip reads 2/12 honestly.
    s.missions.completed = new Set(['m1', 'm2']);
    s.combat.hasPistol = true; s.combat.weapon = 'pistol'; s.combat.ammo = 24;
    // Extra traffic + pedestrians in frame for a living city.
    s.traffic.push({ x: 1650, y: 500, angle: Math.PI, speed: 120, color: '#3d7dd9', name: 'Voyager', w: 46, h: 22, brakeLight: false, dead: false, id: 950, traffic: true, target: null, wait: 0, hp: 100, maxHp: 100, engineLvl: 0, armorLvl: 0 });
    s.traffic.push({ x: 1250, y: 850, angle: 0, speed: 110, color: '#e8c33a', name: 'Falcon', w: 46, h: 22, brakeLight: false, dead: false, id: 951, traffic: true, target: null, wait: 0, hp: 100, maxHp: 100, engineLvl: 0, armorLvl: 0 });
    for (let i = 0; i < 4; i++) {
      s.peds.push({ x: 1450 + i * 60, y: 760 + (i % 2) * 180, angle: 0, speed: 40, shirt: '#e86a6a', skin: '#f2c89b', state: 'panic', panic: 2, down: 0, pause: 0, wander: 0, fleeFast: true, lookingUp: true });
    }
  } else if (name === 'foot') {
    // On foot at Rico's Garage (Palm Hills): the MY CARS panel is open —
    // three owned cars, upgrades, wallet. The garage is the shot's subject.
    P.x = 2050; P.y = 2110; P.angle = -Math.PI / 2; P.inCar = false; P.health = 100;
    s.money = 1480; s.wanted.stars = 0;
    s.day.day = qp.day || 1; s.day.mins = qp.mins || 10 * 60 + 24; // DAY 1 · 10:24
    s.tickerLine = 'OLD SAL: "A wheelman with a garage is a businessman, kid. A wheelman without one is a thief."';
    const comet = makeCar(2050, 2110, 0, { color: '#d94f3d', name: 'Comet' });
    comet.engineLvl = 2; comet.armorLvl = 1; comet.hp = 150; comet.maxHp = 150;
    const meridian = makeCar(2010, 2200, 0, { color: '#e8e4d8', name: 'Meridian' });
    meridian.engineLvl = 1; meridian.hp = 88; meridian.maxHp = 100;
    const stallion = makeCar(2090, 2200, 0, { color: '#7a4fd9', name: 'Stallion' });
    stallion.armorLvl = 2; stallion.maxHp = 200; stallion.hp = 200;
    s.garage.owned = [comet, meridian, stallion];
    s.player.car = comet;
    s.missions.active = null;
    s.missions.completed = new Set(['m1']);
    // m1 done => pistol unlocked, equipped on foot.
    s.combat.hasPistol = true; s.combat.weapon = 'pistol'; s.combat.ammo = 24;
    s.shotGarage = true; // main.js opens the panel after staging
    for (let i = 0; i < 3; i++) {
      s.peds.push({ x: 1900 + i * 70, y: 1980, angle: Math.PI / 2, speed: 40, shirt: ['#6aa8e8', '#e8c33a', '#7ac47a'][i], skin: '#f2c89b', state: 'walk', panic: 0, down: 0, pause: 0, wander: 0 });
    }
  } else if (name === 'drive') {
    // At speed east along the y=1650 straight — long run, buildings both
    // sides, beach ahead. Moderate speed so the (slow SwiftShader) camera
    // stays centred on the car instead of lagging to the screen edge.
    // Staged at x=2300, not 2450: the cruise covers up to ~180 units in the
    // 10 freeze frames, and 2450 + 180 crosses PALM HILLS's east edge
    // (x=2600) into the no-district gap, where the HUD reads HALCYON BAY.
    P.x = 2300; P.y = 1650; P.angle = 0;
    P.inCar = true;
    P.car.x = 2300; P.car.y = 1650; P.car.angle = 0; P.car.speed = 360;
    P.car.color = '#e8c33a'; P.car.name = 'Comet';
    P.car.engineLvl = 0; P.car.hp = 100; P.car.maxHp = 100;
    s.money = 1120; P.health = 100; s.wanted.stars = qp.stars || 1;
    s.day.day = qp.day || 2; s.day.mins = qp.mins || 20 * 60 + 15; // DAY 2 · 20:15
    s.tickerLine = 'MARA: "Three days, Rico. That\'s all the window we\'ve got before the heat settles."';
    s.shotCruise = true;
    s.cruiseLoop = true; s.cruiseWp = 2; // loop the Strip: (2850,1650) first
    s.missions.active = { def: MISSION_LIST[7], step: 1, holdT: 0, timeLeft: 118, startedAt: Date.now() };
    // Mission 8 live means m1–m7 are done — pistol equipped, rep 7/12.
    s.missions.completed = new Set(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']);
    s.combat.hasPistol = true; s.combat.weapon = 'pistol'; s.combat.ammo = 24;
    s.traffic.push({ x: 2850, y: 1650, angle: 0, speed: 150, color: '#3d7dd9', name: 'Titan', w: 46, h: 22, brakeLight: false, dead: false, id: 953, traffic: true, target: null, wait: 0, hp: 100, maxHp: 100, engineLvl: 0, armorLvl: 0 });
  }
  // Center the camera on the player immediately so the first frame is right.
  s.cam.x = P.x - s.view.w / 2;
  s.cam.y = P.y - s.view.h / 2;
}
