// HALCYON BAY — combat.js
// One job: fighting on foot. Fists and the pistol, melee arcs, bullets,
// knockdowns, and the damage numbers the game shows.
export function createCombat() {
  return {
    weapon: 'fists', hasPistol: false, ammo: 0,
    cooldown: 0, swing: 0, bullets: [], hits: [],
    flash: 0, // muzzle-flash timer — a bright pop at the barrel on every shot
  };
}

// Player attacks. Returns events the main loop turns into sound / wanted.
export function playerAttack(c, player, peds, cops, cars, now) {
  if (c.cooldown > 0) return [];
  const events = [];
  if (c.weapon === 'fists') {
    c.cooldown = 0.45; c.swing = 0.25;
    const reach = 46;
    const hx = player.x + Math.cos(player.angle) * reach;
    const hy = player.y + Math.sin(player.angle) * reach;
    for (const p of peds) {
      if (p.down > 0) continue;
      if (Math.hypot(p.x - hx, p.y - hy) < 30) {
        p.down = 4; p.panic = 0;
        c.hits.push({ x: p.x, y: p.y, text: 'POW!', t: 0.8 });
        events.push({ type: 'hitPed', x: p.x, y: p.y });
      }
    }
    for (const o of cops) {
      if (o.down > 0) continue;
      if (Math.hypot(o.x - hx, o.y - hy) < 32) {
        o.down = 5;
        c.hits.push({ x: o.x, y: o.y, text: 'DOWN!', t: 0.8 });
        events.push({ type: 'hitCop', x: o.x, y: o.y });
      }
    }
  } else if (c.weapon === 'pistol' && c.ammo > 0) {
    c.cooldown = 0.28; c.ammo--;
    c.flash = 0.09; // muzzle flash at the barrel
    c.bullets.push({ x: player.x, y: player.y, angle: player.angle, life: 0.5, speed: 900 });
    events.push({ type: 'shot' });
  }
  return events;
}

export function updateCombat(c, dt, peds, cops, cars, onCrime) {
  c.cooldown = Math.max(0, c.cooldown - dt);
  c.swing = Math.max(0, c.swing - dt);
  c.flash = Math.max(0, c.flash - dt);
  for (const h of c.hits) h.t -= dt;
  c.hits = c.hits.filter((h) => h.t > 0);
  for (const b of c.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    for (const p of peds) {
      if (p.down > 0) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 16) {
        p.down = 5; b.life = 0;
        c.hits.push({ x: p.x, y: p.y, text: 'HIT!', t: 0.8 });
        onCrime && onCrime('hitPed', p.x, p.y);
      }
    }
    for (const o of cops) {
      if (o.down > 0) continue;
      if (Math.hypot(o.x - b.x, o.y - b.y) < 16) {
        o.down = 6; b.life = 0;
        c.hits.push({ x: o.x, y: o.y, text: 'HIT!', t: 0.8 });
        onCrime && onCrime('hitCop', o.x, o.y);
      }
    }
  }
  c.bullets = c.bullets.filter((b) => b.life > 0);
}

export function drawCombat(ctx, c, player) {
  // Swing arc.
  if (c.swing > 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(30, 0, 26, -0.9, 0.9); ctx.stroke();
    ctx.restore();
  }
  // Muzzle flash: a bright starburst at the barrel, plus a faint light pool.
  // It also catches the helicopter spotlight: while lit, the flash reads
  // even brighter against the searchlight wash.
  if (c.flash > 0 && c.weapon === 'pistol') {
    const bx = player.x + Math.cos(player.angle) * 26;
    const by = player.y + Math.sin(player.angle) * 26;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(player.angle);
    ctx.fillStyle = 'rgba(255,220,120,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.moveTo(0, -4); ctx.lineTo(16, 0); ctx.lineTo(0, 4);
    ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  for (const b of c.bullets) {
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 26, b.y - Math.sin(b.angle) * 26);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Floating hit text.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const h of c.hits) {
    ctx.fillStyle = `rgba(255,80,60,${Math.min(1, h.t)})`;
    ctx.fillText(h.text, h.x, h.y - 22);
  }
}
