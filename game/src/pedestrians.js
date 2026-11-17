// HALCYON BAY — pedestrians.js
// One job: the people of the city. They stroll the sidewalks, chat in pairs,
// scatter from danger, and can be knocked down (which the police notice).
import { WORLD, ROADS_V, ROADS_H } from './config.js';

const SHIRTS = ['#e86a6a', '#6aa8e8', '#e8c33a', '#7ac47a', '#c98ae8', '#e8e4d8', '#4fd9c9', '#d97a3d'];
const SKINS = ['#f2c89b', '#d9a066', '#a06a3d', '#f7d7b0', '#8a5a2e'];

export function spawnPedestrians(city, count, avoid) {
  const peds = [];
  let guard = 0;
  while (peds.length < count && guard++ < count * 30) {
    const vertical = Math.random() < 0.5;
    const road = vertical ? ROADS_V[Math.floor(Math.random() * ROADS_V.length)] : ROADS_H[Math.floor(Math.random() * ROADS_H.length)];
    const along = 100 + Math.random() * (vertical ? WORLD.h - 200 : WORLD.w - 200);
    const side = (Math.random() < 0.5 ? -1 : 1) * (60 + 14 + Math.random() * 20);
    const x = vertical ? road + side : along;
    const y = vertical ? along : road + side;
    if (x > 3300 || city.insideBuilding(x, y)) continue;
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < 350) continue;
    if (peds.some((p) => Math.hypot(p.x - x, p.y - y) < 40)) continue;
    peds.push({
      x, y, angle: Math.random() * Math.PI * 2,
      speed: 34 + Math.random() * 30, shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
      skin: SKINS[Math.floor(Math.random() * SKINS.length)],
      state: 'walk', panic: 0, down: 0, pause: Math.random() * 3, wander: Math.random() * Math.PI * 2,
    });
  }
  return peds;
}

export function updatePedestrians(peds, city, dt, danger) {
  for (const p of peds) {
    if (p.down > 0) { p.down -= dt; continue; }
    // Panic: run away from the danger point. Under the police helicopter's
    // spotlight people run faster — and point up at it.
    if (danger && Math.hypot(danger.x - p.x, danger.y - p.y) < danger.r) {
      p.state = 'panic'; p.panic = 2.5;
      p.fleeFast = !!danger.heli; p.lookingUp = !!danger.heli;
    }
    if (p.panic > 0) {
      p.panic -= dt;
      const a = danger ? Math.atan2(p.y - danger.y, p.x - danger.x) : p.angle;
      p.angle = a;
      p.x += Math.cos(a) * (p.fleeFast ? 235 : 190) * dt;
      p.y += Math.sin(a) * (p.fleeFast ? 235 : 190) * dt;
      if (p.panic <= 0) { p.state = 'walk'; p.fleeFast = false; p.lookingUp = false; }
    } else {
      if (p.pause > 0) { p.pause -= dt; continue; }
      p.wander += (Math.random() - 0.5) * 1.4 * dt;
      p.angle = p.wander;
      const nx = p.x + Math.cos(p.angle) * p.speed * dt;
      const ny = p.y + Math.sin(p.angle) * p.speed * dt;
      const hit = city.collideCircle(nx, ny, 10);
      if (!hit && nx > 60 && nx < 3340 && ny > 60 && ny < WORLD.h - 60) { p.x = nx; p.y = ny; }
      else p.wander += Math.PI / 2;
      if (Math.random() < 0.004) p.pause = 1 + Math.random() * 3;
    }
    p.x = Math.max(50, Math.min(3340, p.x));
    p.y = Math.max(50, Math.min(WORLD.h - 50, p.y));
  }
}

export function drawPedestrian(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.down > 0) {
    ctx.rotate(1.2);
    ctx.fillStyle = p.shirt;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(14, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const bob = p.state === 'panic' ? Math.sin(time * 18) * 2 : Math.sin(time * 8) * 1.2;
  ctx.rotate(p.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(40,30,20,0.25)';
  ctx.beginPath(); ctx.ellipse(1, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Legs.
  ctx.strokeStyle = '#2c2f36'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-3 + bob, 10); ctx.moveTo(3, 4); ctx.lineTo(3 - bob, 10); ctx.stroke();
  // Body + head.
  ctx.fillStyle = p.shirt;
  ctx.beginPath(); ctx.roundRect(-7, -6, 14, 12, 5); ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(0, -11, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(0, -13, 6, Math.PI, Math.PI * 2); ctx.fill();
  // Pointing up at the helicopter when caught in its spotlight.
  if (p.lookingUp) {
    ctx.strokeStyle = p.skin; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(16, -18); ctx.stroke();
  }
  ctx.restore();
}
