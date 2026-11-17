// HALCYON BAY — vehicles.js
// One job: cars. Player driving physics, traffic AI that follows the road
// graph, carjacking, and drawing every car on screen.
import { WORLD, CAR, ROADS_V, ROADS_H } from './config.js';

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8c33a', '#7a4fd9', '#2fae6e', '#e8e4d8', '#22262e', '#d97a3d', '#4fd9c9', '#c94f9e'];
const CAR_NAMES = ['Comet', 'Stallion', 'Voyager', 'Dune', 'Falcon', 'Meridian', 'Corsair', 'Breeze', 'Titan', 'Lumen'];

let nextId = 1;

export function makeCar(x, y, angle, opts = {}) {
  const color = opts.color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  return {
    id: nextId++, x, y, angle, speed: 0,
    color, name: opts.name || CAR_NAMES[Math.floor(Math.random() * CAR_NAMES.length)],
    isCop: !!opts.isCop, isPlayer: !!opts.isPlayer, traffic: !!opts.traffic,
    target: null, wait: 0, dead: false, honk: 0, brakeLight: false,
    w: 46, h: 22,
    // Garage systems: every car carries its own HP + upgrade levels.
    hp: 100, maxHp: 100, engineLvl: opts.engineLvl || 0, armorLvl: opts.armorLvl || 0,
  };
}

// Garage upgrades, applied to one car. Engine raises top speed (+12%/level),
// armour raises max HP (+50/level, and heals the new headroom), paint cycles
// the colour. Returns the price charged, or 0 when maxed out.
export function upgradeCar(car, kind) {
  if (kind === 'engine' && car.engineLvl < 3) { car.engineLvl++; return 400; }
  if (kind === 'armor' && car.armorLvl < 3) {
    car.armorLvl++; car.maxHp = 100 + car.armorLvl * 50; car.hp = car.maxHp; return 350;
  }
  if (kind === 'paint') {
    if ((car.paintLvl || 0) >= 5) return 0;
    car.paintLvl = (car.paintLvl || 0) + 1;
    const i = CAR_COLORS.indexOf(car.color);
    car.color = CAR_COLORS[(i + 1 + Math.floor(Math.random() * 3)) % CAR_COLORS.length];
    return 150;
  }
  return 0;
}

export function carTopSpeed(car) {
  return CAR.maxSpeed * (1 + 0.12 * (car.engineLvl || 0));
}

export function nearestRoadPoint(x, y) {
  let best = null, bd = 1e9;
  for (const rx of ROADS_V) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y, axis: 'v' }; } }
  for (const ry of ROADS_H) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry, axis: 'h' }; } }
  return best;
}

export function spawnTraffic(city, count, avoid) {
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard++ < count * 40) {
    const node = city.nodes[Math.floor(Math.random() * city.nodes.length)];
    const lane = 18;
    const vertical = Math.random() < 0.5;
    const x = node.x + (vertical ? (Math.random() < 0.5 ? -lane : lane) : 0);
    const y = node.y + (vertical ? 0 : (Math.random() < 0.5 ? -lane : lane));
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < 500) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.y - y) < 120)) continue;
    const car = makeCar(x, y, vertical ? Math.PI / 2 : 0, { traffic: true });
    car.target = city.nodes[Math.floor(Math.random() * city.nodes.length)];
    cars.push(car);
  }
  return cars;
}

// Traffic: drive toward target node, pick a new one on arrival, pause sometimes.
export function updateTraffic(cars, city, dt, playerPos, scatter) {
  for (const car of cars) {
    if (car.dead) continue;
    if (car.wait > 0) { car.wait -= dt; car.speed *= 0.9; continue; }
    const t = car.target;
    if (!t) { car.target = city.nodes[Math.floor(Math.random() * city.nodes.length)]; continue; }
    const dx = t.x - car.x, dy = t.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30) {
      car.target = city.neighbors(t)[Math.floor(Math.random() * Math.max(1, city.neighbors(t).length))] || city.nodes[0];
      if (Math.random() < 0.12) car.wait = 1 + Math.random() * 2;
      continue;
    }
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    const cruise = 130 + (car.id % 5) * 18;
    // Slow for the car ahead, brake for a scattering pedestrian or the player.
    const ahead = cars.find((o) => o !== car && !o.dead && Math.hypot(o.x - car.x, o.y - car.y) < 70 &&
      Math.abs(Math.atan2(o.y - car.y, o.x - car.x) - car.angle) < 0.6);
    let targetSpeed = ahead ? 0 : cruise;
    if (scatter && playerPos && Math.hypot(playerPos.x - car.x, playerPos.y - car.y) < 90) targetSpeed = 0;
    car.speed += (targetSpeed - car.speed) * Math.min(1, 2 * dt);
    car.brakeLight = targetSpeed < car.speed - 20;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = Math.max(40, Math.min(WORLD.w - 40, car.x));
    car.y = Math.max(40, Math.min(WORLD.h - 40, car.y));
  }
}

// Player car physics: weighty arcade handling with drift on handbrake.
export function updatePlayerCar(car, input, dt) {
  const fwd = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (fwd > 0) car.speed += CAR.accel * dt;
  else if (fwd < 0) car.speed -= (car.speed > 30 ? CAR.brake : CAR.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 220 * dt);
  if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 700 * dt);
  const top = carTopSpeed(car); // garage engine upgrades raise the ceiling
  car.speed = Math.max(-CAR.reverseMax, Math.min(top, car.speed));
  const turnRate = CAR.turn * (1 - Math.min(0.55, Math.abs(car.speed) / top * 0.55));
  car.angle += steer * turnRate * dt * Math.sign(car.speed || 1) * (input.handbrake ? 1.5 : 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(30, Math.min(WORLD.w - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD.h - 30, car.y));
  car.brakeLight = fwd < 0 || input.handbrake;
  return Math.abs(car.speed);
}

export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(40,30,20,0.28)';
  ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 5, car.w, car.h);
  // Body.
  ctx.fillStyle = car.isCop ? '#1d2a3a' : car.color;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 7);
  ctx.fill();
  if (car.isCop) {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-6, -car.h / 2, 12, car.h);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-car.w / 2 + 4, -car.h / 2, 8, car.h);
  }
  // Cabin + windshield.
  ctx.fillStyle = car.isCop ? '#dfe9f2' : 'rgba(20,30,40,0.85)';
  ctx.beginPath(); ctx.roundRect(-8, -car.h / 2 + 4, 16, car.h - 8, 4); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,240,0.9)';
  ctx.fillRect(8, -car.h / 2 + 5, 5, car.h - 10);
  // Engine upgrades show as a rear spoiler + hood scoop — the car visibly changes.
  if ((car.engineLvl || 0) > 0) {
    ctx.fillStyle = '#22262e';
    ctx.fillRect(-car.w / 2 - 4, -car.h / 2 - 2, 4, car.h + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(2, -4, 10, 8);
  }
  // Armour upgrades show as a reinforced bull-bar on the nose.
  if ((car.armorLvl || 0) > 0) {
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(car.w / 2 - 1, -car.h / 2 - 1, 4, car.h + 2);
  }
  // Headlights / taillights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(car.w / 2 - 2, -car.h / 2 + 3, 3, 5);
  ctx.fillRect(car.w / 2 - 2, car.h / 2 - 8, 3, 5);
  ctx.fillStyle = car.brakeLight ? '#ff2d2d' : '#a33';
  ctx.fillRect(-car.w / 2 - 1, -car.h / 2 + 3, 3, 5);
  ctx.fillRect(-car.w / 2 - 1, car.h / 2 - 8, 3, 5);
  if (car.isCop) {
    const blink = Math.floor(performance.now() / 180) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2d2d' : '#2d6bff';
    ctx.beginPath(); ctx.arc(-2, -car.h / 2 - 1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? '#2d6bff' : '#ff2d2d';
    ctx.beginPath(); ctx.arc(4, -car.h / 2 - 1, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Cop light glow on the ground.
  if (car.isCop) {
    const blink = Math.floor(performance.now() / 180) % 2 === 0;
    ctx.fillStyle = blink ? 'rgba(255,45,45,0.18)' : 'rgba(45,107,255,0.18)';
    ctx.beginPath(); ctx.arc(car.x, car.y, 46, 0, Math.PI * 2); ctx.fill();
  }
}
