// HALCYON BAY — police.js
// One job: the wanted system. Stars rise with crime, police cars and foot
// officers spawn and chase, and the heat cools off when the player hides.
import { WANTED, WORLD } from './config.js';
import { makeCar } from './vehicles.js';

// --- Bay PD roster: callsigns + officers, assigned in spawn order so a
// unit keeps its name while it chases. The helicopter is always HELI 2-7
// (the callsign dispatch already uses on the radio ticker). ---
export const PD_ROSTER = [
  { callsign: 'PELICAN 1', officer: 'R. Doyle' },
  { callsign: 'KESTREL 2', officer: 'T. Marsh' },
  { callsign: 'FALCON 3', officer: 'K. Voss' },
  { callsign: 'OSPREY 4', officer: 'D. Hale' },
  { callsign: 'HERON 5', officer: 'M. Ruiz' },
  { callsign: 'EGRET 6', officer: 'S. Okafor' },
];
export const HELI_CALLSIGN = 'HELI 2-7';

// Nearest responding units for the HUD panel (cars + heli, sorted by
// distance to the player, with per-unit status). Distances in metres:
// 1 world unit ≈ 0.1 m — the same scale as the mph conversion in hud.js
// (1 unit/s ≈ 0.22 mph ≈ 0.098 m/s), so a cop spawned 700 units out reads 70m.
export function respondingUnits(w, player, max = 3) {
  const units = [];
  for (const c of w.copCars) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    units.push({
      callsign: c.callsign || 'PD UNIT', officer: c.officer || '',
      distM: Math.round(d * 0.1), status: d < 460 ? 'PURSUING' : 'EN ROUTE',
    });
  }
  if (w.heli) {
    const d = Math.hypot(w.heli.x - player.x, w.heli.y - player.y);
    units.push({
      callsign: HELI_CALLSIGN, officer: 'AIR',
      distM: Math.round(d * 0.1), status: w.heli.lit ? 'OVERHEAD · LIT' : 'OVERHEAD',
    });
  }
  units.sort((a, b) => a.distM - b.distM);
  return units.slice(0, max);
}

export function createWanted() {
  return {
    stars: 0, hiddenTimer: 0, decayTimer: 0, seenTimer: 0,
    copCars: [], copFoot: [], bustedTimer: 0, heat: 0,
    heli: null, heliDelay: 0, // police helicopter (3+ stars): orbit + spotlight
    unitSeq: 0, // roster rotation: the next spawned unit's callsign index
  };
}

// --- Per-district heat: a district where Rico caused trouble stays hot. ---
// heat is a plain object {DISTRICT_NAME: 0..100}; decay is slow, sleep halves it.
export function addDistrictHeat(heat, districtName, n) {
  if (!districtName) return;
  heat[districtName] = Math.min(100, (heat[districtName] || 0) + n);
}

export function decayDistrictHeat(heat, dt) {
  for (const k of Object.keys(heat)) {
    heat[k] = Math.max(0, heat[k] - dt * 0.35); // ~1 point per 3s
    if (heat[k] <= 0) delete heat[k];
  }
}

export function hottestDistrict(heat) {
  let best = null, bv = 0;
  for (const [k, v] of Object.entries(heat)) if (v > bv) { bv = v; best = k; }
  return best ? { name: best, value: Math.round(bv) } : null;
}

export function addWanted(w, n, reason) {
  w.stars = Math.min(WANTED.maxStars, w.stars + n);
  w.hiddenTimer = 0; w.decayTimer = 0;
  return reason;
}

export function updateWanted(w, dt, player, inCar, city) {
  const wantCars = WANTED.copCars[w.stars] || 0;
  const wantFoot = WANTED.copFoot[w.stars] || 0;
  // Spawn cop cars at road points behind the player.
  while (w.copCars.length < wantCars) {
    const a = Math.random() * Math.PI * 2;
    const x = Math.max(120, Math.min(WORLD.w - 120, player.x + Math.cos(a) * 700));
    const y = Math.max(120, Math.min(WORLD.h - 120, player.y + Math.sin(a) * 700));
    const car = makeCar(x, y, 0, { isCop: true });
    car.speed = 200;
    // Name the unit from the roster (spawn order) so the HUD panel can show
    // a callsign + officer instead of an anonymous blue dot.
    const roster = PD_ROSTER[w.unitSeq % PD_ROSTER.length];
    w.unitSeq++;
    car.callsign = roster.callsign;
    car.officer = roster.officer;
    w.copCars.push(car);
  }
  while (w.copFoot.length < wantFoot) {
    const a = Math.random() * Math.PI * 2;
    w.copFoot.push({
      x: player.x + Math.cos(a) * 260, y: player.y + Math.sin(a) * 260,
      angle: 0, speed: 185, state: 'chase', shirt: '#1d2a3a', skin: '#f2c89b',
      down: 0, panic: 0, pause: 0, wander: 0, arrest: 0,
    });
  }
  // Chase: cop cars steer at the player and try to ram; they are faster at high stars.
  // But never as fast as the player's top speed (560): a clean getaway at
  // full throttle must be able to open the gap and lose them, or the heat
  // could never cool off and needClean missions would soft-lock.
  const copSpeed = 270 + w.stars * 30;
  for (const car of w.copCars) {
    const dx = player.x - car.x, dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const target = dist > 60 ? copSpeed : copSpeed * 0.4;
    car.speed += (target - car.speed) * Math.min(1, 1.5 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ram the player's car.
    if (dist < 55 && inCar) {
      player.rammed = (player.rammed || 0) + dt;
    }
  }
  // Foot officers chase on foot and try to arrest (stand close for 3s).
  for (const o of w.copFoot) {
    if (o.down > 0) { o.down -= dt; continue; }
    const dx = player.x - o.x, dy = player.y - o.y;
    const dist = Math.hypot(dx, dy);
    if (inCar) {
      // Officers keep their distance from a speeding car, but block on foot.
      o.angle = Math.atan2(dy, dx);
      if (dist > 120) { o.x += Math.cos(o.angle) * o.speed * dt; o.y += Math.sin(o.angle) * o.speed * dt; }
      o.arrest = 0;
    } else if (dist < 34) {
      o.arrest += dt;
      if (o.arrest > 3) w.bustedTimer = 1; // busted
    } else {
      o.arrest = 0;
      o.angle = Math.atan2(dy, dx);
      o.x += Math.cos(o.angle) * o.speed * dt;
      o.y += Math.sin(o.angle) * o.speed * dt;
    }
  }
  // --- Helicopter (3+ stars): circles above the player, spotlight tracks
  // him. It pressures, never insta-busts: it only keeps him "seen" while
  // the light is on him, and it leaves the moment stars drop below 3.
  if (w.stars >= 3) {
    if (!w.heli) {
      w.heliDelay += dt;
      if (w.heliDelay > 1.5) {
        w.heli = { angle: Math.random() * Math.PI * 2, x: player.x, y: player.y, spotX: player.x, spotY: player.y, fade: 0, callsign: HELI_CALLSIGN };
      }
    }
    if (w.heli) {
      const h = w.heli;
      h.fade = Math.min(1, h.fade + dt * 2);
      h.angle += dt * 0.55;
      const ox = Math.cos(h.angle) * 270, oy = Math.sin(h.angle) * 270;
      h.x = player.x + ox; h.y = player.y + oy;
      // Spotlight ground point chases the player, lagging a little.
      h.spotX += (player.x - h.spotX) * Math.min(1, 1.6 * dt);
      h.spotY += (player.y - h.spotY) * Math.min(1, 1.6 * dt);
      // Caught in the light: the heat never cools off while lit — but only
      // while the light can actually hold him. At full speed the spotlight
      // lags too far behind to pin him down, so a fast getaway breaks the
      // lock (otherwise 3+ stars could never cool off: every turn lets the
      // light catch up and resets the hidden timer forever).
      const playerSpeed = inCar && player.car ? Math.abs(player.car.speed) : 0;
      if (Math.hypot(player.x - h.spotX, player.y - h.spotY) < 95 && playerSpeed < 300) {
        w.hiddenTimer = 0;
        h.lit = true;
      } else h.lit = false;
    }
  } else {
    w.heliDelay = 0;
    if (w.heli) { w.heli.fade -= dt * 2; if (w.heli.fade <= 0) w.heli = null; }
  }
  // Visibility: any cop within 420 and roughly in the open counts as "seen".
  const seen = w.copCars.some((c) => Math.hypot(c.x - player.x, c.y - player.y) < 460) ||
    w.copFoot.some((o) => Math.hypot(o.x - player.x, o.y - player.y) < 300) ||
    (w.heli && w.heli.lit);
  if (seen) { w.hiddenTimer = 0; w.seenTimer += dt; }
  else {
    w.hiddenTimer += dt;
    if (w.hiddenTimer > WANTED.decayDelay && w.stars > 0) {
      w.decayTimer += dt;
      if (w.decayTimer >= WANTED.decayInterval) {
        w.decayTimer = 0; w.stars -= 1;
      }
    }
  }
  // Despawn far cops when the heat is gone.
  if (w.stars === 0) {
    w.copCars = w.copCars.filter((c) => Math.hypot(c.x - player.x, c.y - player.y) < 500);
    w.copFoot = w.copFoot.filter((o) => Math.hypot(o.x - player.x, o.y - player.y) < 300);
  }
  return seen;
}

export function drawStars(ctx, stars, x, y, size = 22) {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  for (let i = 0; i < WANTED.maxStars; i++) {
    ctx.fillStyle = i < stars ? '#ffd700' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('★', x + i * (size + 2), y);
  }
}

// Draw the police helicopter: ground shadow, searchlight cone sweeping to
// the tracked ground point, and the airframe floating above it (fake
// altitude via a vertical offset). The spotlight pool on the ground is the
// part the player actually feels.
export function drawHelicopter(ctx, w, time) {
  const h = w.heli;
  if (!h || h.fade <= 0) return;
  const a = h.fade;
  ctx.save();
  ctx.globalAlpha = a;
  // Spotlight cone on the ground: from the heli's ground position to the pool.
  const grad = ctx.createLinearGradient(h.x, h.y, h.spotX, h.spotY);
  grad.addColorStop(0, 'rgba(255,240,170,0.10)');
  grad.addColorStop(1, 'rgba(255,240,170,0.34)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(h.x, h.y);
  ctx.lineTo(h.spotX - 55, h.spotY - 30);
  ctx.lineTo(h.spotX + 55, h.spotY + 30);
  ctx.closePath();
  ctx.fill();
  // The lit pool itself.
  ctx.fillStyle = 'rgba(255,244,180,0.30)';
  ctx.beginPath(); ctx.ellipse(h.spotX, h.spotY, 95, 62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,210,0.35)';
  ctx.beginPath(); ctx.ellipse(h.spotX, h.spotY, 55, 36, 0, 0, Math.PI * 2); ctx.fill();
  // Ground shadow of the airframe — big and dark, with a pale rim, so the
  // helicopter reads from above even at a glance on the contact sheet.
  ctx.fillStyle = 'rgba(15,15,15,0.42)';
  ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 54, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 54, 20, 0, 0, Math.PI * 2); ctx.stroke();
  // Airframe, drawn above its shadow (fake altitude), scaled up ~1.7x with
  // a heavy dark outline so it is unmistakable at a glance.
  const hx = h.x - 26, hy = h.y - 96;
  const rotor = time * 22;
  ctx.translate(hx, hy);
  ctx.rotate(Math.sin(time * 0.8) * 0.06);
  ctx.scale(1.7, 1.7);
  const OUTLINE = '#0a0f16';
  // Rotor blur: a translucent disc plus the spinning blade line.
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.beginPath(); ctx.ellipse(0, -14, 52, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor) * -46, -14 + Math.sin(rotor) * 5);
  ctx.lineTo(Math.cos(rotor) * 46, -14 - Math.sin(rotor) * 5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(rotor + Math.PI / 2) * -46, -14 + Math.sin(rotor + Math.PI / 2) * 5);
  ctx.lineTo(Math.cos(rotor + Math.PI / 2) * 46, -14 - Math.sin(rotor + Math.PI / 2) * 5);
  ctx.stroke();
  // Tail boom + tail fin, outlined.
  ctx.fillStyle = '#1d2a3a';
  ctx.fillRect(-34, -4, 34, 8);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.strokeRect(-34, -4, 34, 8);
  ctx.fillStyle = '#1d2a3a';
  ctx.fillRect(-38, -14, 6, 14);
  ctx.strokeRect(-38, -14, 6, 14);
  // Bright tail stripe (HPD yellow) so the boom reads against dark roofs.
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-34, -4, 12, 8);
  // Body, outlined.
  ctx.fillStyle = '#24344a';
  ctx.beginPath(); ctx.roundRect(-16, -12, 34, 24, 10); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(-16, -12, 34, 24, 10); ctx.stroke();
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(-2, -12, 10, 24);
  // Cockpit glass.
  ctx.fillStyle = '#9fd4e8';
  ctx.beginPath(); ctx.roundRect(8, -9, 10, 18, 5); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(8, -9, 10, 18, 5); ctx.stroke();
  // Searchlight pod under the nose.
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(6, 13, 4, 0, Math.PI * 2); ctx.fill();
  // Mast.
  ctx.fillStyle = '#111';
  ctx.fillRect(-2, -18, 4, 8);
  // Blinking red beacon.
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath(); ctx.arc(-16, -14, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
