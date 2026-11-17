// HALCYON BAY — hud.js
// One job: everything the player reads — health, money, wanted stars,
// mission objective, district name, toasts, and the live minimap.
import { WORLD, DISTRICTS } from './config.js';
import { drawStars, hottestDistrict, respondingUnits } from './police.js';
import { missionMarker, currentObjective, fmtTime, MISSION_LIST, reputationFor } from './missions.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    health: el('hud-health'), healthBar: el('hud-healthbar'), money: el('hud-money'),
    stars: el('hud-stars'), objective: el('hud-objective'), district: el('hud-district'),
    toast: el('hud-toast'), banner: el('hud-banner'), hint: el('hud-hint'),
    speed: el('hud-speed'), weapon: el('hud-weapon'), minimap: el('minimap'),
    day: el('hud-day'), mission: el('hud-mission'), rep: el('hud-rep'),
    next: el('hud-next'), units: el('hud-units'),
    ticker: el('hud-ticker'), vehicle: el('hud-vehicle'), heat: el('hud-heat'),
    toastTimer: 0, bannerTimer: 0, unitsText: '',
  };
}

export function showToast(hud, text, secs = 3) {
  hud.toast.textContent = text;
  hud.toast.style.opacity = '1';
  hud.toastTimer = secs;
}

export function showBanner(hud, title, sub, secs = 5) {
  hud.banner.querySelector('.banner-title').textContent = title;
  hud.banner.querySelector('.banner-sub').textContent = sub;
  hud.banner.style.opacity = '1';
  hud.bannerTimer = secs;
}

export function updateHud(hud, s, dt) {
  hud.health.textContent = `${Math.ceil(s.player.health)} HP`;
  hud.healthBar.style.width = `${Math.max(0, s.player.health)}%`;
  hud.healthBar.style.background = s.player.health > 50 ? '#4ade80' : s.player.health > 25 ? '#facc15' : '#ef4444';
  hud.money.textContent = `$${Math.floor(s.money).toLocaleString('en-US')}`;
  // Stars drawn as text (★) — simple, always readable.
  hud.stars.textContent = '★'.repeat(s.wanted.stars) + '☆'.repeat(5 - s.wanted.stars);
  hud.stars.style.color = s.wanted.stars ? '#ffd700' : 'rgba(255,255,255,0.35)';
  // Day / time chip — wired to the 3-day system.
  if (hud.day) {
    const mins = Math.floor(s.day.mins);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    hud.day.textContent = `DAY ${s.day.day} · ${hh}:${mm}`;
  }
  // Rep chip, under the day chip so the two read as one HUD block:
  // tier name + jobs done / 12. The tiers already exist (reputationFor);
  // the in-game HUD just never showed them.
  if (hud.rep) {
    hud.rep.textContent = `REP · ${reputationFor(s.missions)} · ${s.missions.completed.size}/12 JOBS`;
  }
  // Mission strip (top-centre, large): the depth, visible at a glance.
  // NOTE: the timer is part of the same textContent — setting textContent
  // on the strip would destroy a child <span>, so there is no separate
  // timer element (an earlier version had one and the timer never showed).
  if (hud.mission) {
    const a = s.missions.active;
    if (a) {
      const n = a.def.title.split('·')[0].trim();
      const name = a.def.title.split('·')[1].trim();
      hud.mission.textContent = `MISSION ${n}/12 — ${name} · ${a.def.giver}` +
        (a.timeLeft > 0 ? `   ⏱ ${Math.ceil(a.timeLeft)}s` : '');
    } else {
      const i = s.missions.nextIndex(s.day.day);
      hud.mission.textContent = i >= 0
        ? `NEXT JOB ${MISSION_LIST[i].title.split('·')[0].trim()}/12 — ${MISSION_LIST[i].title.split('·')[1].trim()} · ${MISSION_LIST[i].giver}`
        : 'ALL 12 JOBS DONE — KING OF HALCYON';
    }
  }
  // NEXT mission preview, one small line under the mission strip — only
  // while a mission is active (with no active mission the strip itself
  // already reads NEXT JOB, so showing it too would duplicate the line).
  // The next job after the active one; a later-day job is tagged with its day.
  if (hud.next) {
    if (s.missions.active) {
      const ai = MISSION_LIST.findIndex((d) => d.id === s.missions.active.def.id);
      let ni = -1;
      for (let i = ai + 1; i < MISSION_LIST.length; i++) {
        if (!s.missions.completed.has(MISSION_LIST[i].id)) { ni = i; break; }
      }
      if (ni >= 0) {
        const d = MISSION_LIST[ni];
        const dayTag = (d.day || 1) > s.day.day ? ` · DAY ${d.day}` : '';
        hud.next.textContent = `NEXT ▸ ${d.title.split('·')[0].trim()} · ${d.title.split('·')[1].trim()} — ${d.giver}${dayTag}`;
        hud.next.style.display = '';
      } else hud.next.style.display = 'none';
    } else hud.next.style.display = 'none';
  }
  // Vehicle name + health in the MAIN HUD block (not a corner label).
  if (hud.vehicle) {
    if (s.player.inCar) {
      const c = s.player.car;
      const pct = Math.round((c.hp / c.maxHp) * 100);
      hud.vehicle.textContent = `${c.name.toUpperCase()} · ${pct}%`;
      hud.vehicle.style.color = pct > 50 ? '#ffd700' : '#ef4444';
    } else hud.vehicle.textContent = 'ON FOOT';
  }
  // Hottest district — the city remembers where Rico caused trouble.
  if (hud.heat) {
    const hot = hottestDistrict(s.heat);
    hud.heat.textContent = hot && hot.value >= 15 ? `🔥 ${hot.name} HEAT ${hot.value}` : '';
  }
  // Radio ticker / dialog line.
  if (hud.ticker && s.tickerLine) hud.ticker.textContent = '📻 ' + s.tickerLine;
  // Objective line + distance to the marker, in metres (1 world unit ≈
  // 0.1 m — same scale as the mph conversion). Updates as the player moves.
  const mk = missionMarker(s.missions, s.day.day);
  const mkDist = mk ? ` · ${Math.round(Math.hypot(s.player.x - mk.x, s.player.y - mk.y) * 0.1)}m` : '';
  hud.objective.textContent = '◉ ' + currentObjective(s.missions, s.day.day) + mkDist;
  // District line: name only. The full "NAME — note" line ran ~360px wide
  // on PALM HILLS / SUNSET STRIP / MARINA BEACH and collided with the rep
  // chip under the day chip (the note's tail hid behind the chip). The name
  // alone never reaches the right column; the note's flavour still lives in
  // the world's ground labels.
  hud.district.textContent = s.district.name;
  hud.speed.textContent = s.player.inCar ? `${Math.round(Math.abs(s.player.car.speed) * 0.22)} mph` : '';
  // Weapon line: always visible — on foot AND while driving. The pistol is
  // the payoff of mission 1; hiding it in the car hid the game's own reward
  // from the driving HUD (and from the cover). Compact: one short line.
  hud.weapon.textContent = s.combat.weapon === 'pistol' ? `PISTOL · ${s.combat.ammo} ammo` : 'FISTS';
  hud.weapon.style.display = '';
  // Bay PD response panel: nearest named units + distance + status, under
  // the minimap. Only while wanted — with 0 stars there is nothing to show.
  // Rebuild only when the text changes (distances move every frame).
  if (hud.units) {
    if (s.wanted.stars > 0) {
      const us = respondingUnits(s.wanted, s.player, 3);
      if (us.length) {
        const text = '<div class="units-head">🚔 BAY PD RESPONSE</div>' +
          us.map((u) => `<div class="units-row"><span>${u.callsign}</span><span class="units-off">${u.officer}</span><span>${u.distM}m</span><span class="units-st">${u.status}</span></div>`).join('');
        if (text !== hud.unitsText) { hud.units.innerHTML = text; hud.unitsText = text; }
        hud.units.style.display = '';
      } else hud.units.style.display = 'none';
    } else hud.units.style.display = 'none';
  }
  hud.hint.textContent = s.player.inCar
    ? 'WASD drive · Shift handbrake · E exit car · F horn'
    : 'WASD move · Shift sprint · E enter car · F attack · G weapon';
  if (hud.toastTimer > 0) { hud.toastTimer -= dt; if (hud.toastTimer <= 0) hud.toast.style.opacity = '0'; }
  if (hud.bannerTimer > 0) { hud.bannerTimer -= dt; if (hud.bannerTimer <= 0) hud.banner.style.opacity = '0'; }
  drawMinimap(hud, s);
}

export function drawMinimap(hud, s) {
  const cv = hud.minimap;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const sx = W / WORLD.w, sy = H / WORLD.h;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(20,40,30,0.85)';
  ctx.fillRect(0, 0, W, H);
  // Sea + sand.
  ctx.fillStyle = '#2fa8c9'; ctx.fillRect(3400 * sx, 0, W, H);
  ctx.fillStyle = '#e8d29a'; ctx.fillRect(3300 * sx, 0, 100 * sx, H);
  // District heat: hot districts glow red — the city remembers.
  if (s.heat) {
    for (const d of DISTRICTS) {
      const hv = s.heat[d.name] || 0;
      if (hv >= 15) {
        ctx.fillStyle = `rgba(255,60,30,${Math.min(0.5, hv / 200)})`;
        ctx.fillRect(d.x * sx, d.y * sy, d.w * sx, d.h * sy);
      }
    }
  }
  // Garage (green G) + safehouse (gold house) markers.
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('G', 2050 * sx, 2050 * sy);
  ctx.fillStyle = '#ffd700';
  ctx.fillText('⌂', 2100 * sx, 1750 * sy);
  // Roads.
  ctx.strokeStyle = '#9a958a'; ctx.lineWidth = 2;
  for (const rx of [450, 850, 1250, 1650, 2050, 2450, 2850, 3250]) {
    ctx.beginPath(); ctx.moveTo(rx * sx, 0); ctx.lineTo(rx * sx, H); ctx.stroke();
  }
  for (const ry of [450, 850, 1250, 1650, 2050, 2350]) {
    ctx.beginPath(); ctx.moveTo(0, ry * sy); ctx.lineTo(W, ry * sy); ctx.stroke();
  }
  // Buildings (tiny blocks).
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const b of s.city.buildings) ctx.fillRect(b.x * sx, b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
  // Mission marker (pulsing).
  const mk = missionMarker(s.missions, s.day.day);
  if (mk) {
    const pulse = 4 + Math.sin(performance.now() / 250) * 2;
    ctx.fillStyle = mk.color;
    ctx.beginPath(); ctx.arc(mk.x * sx, mk.y * sy, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mk.x * sx, mk.y * sy, pulse + 2, 0, Math.PI * 2); ctx.stroke();
  }
  // Cop cars (blue) and foot officers.
  ctx.fillStyle = '#2d6bff';
  for (const c of s.wanted.copCars) { ctx.beginPath(); ctx.arc(c.x * sx, c.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const o of s.wanted.copFoot) { ctx.beginPath(); ctx.arc(o.x * sx, o.y * sy, 2, 0, Math.PI * 2); ctx.fill(); }
  // Police helicopter — distinct orange marker with a ring.
  if (s.wanted.heli) {
    ctx.strokeStyle = '#ff9a2d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.wanted.heli.x * sx, s.wanted.heli.y * sy, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff9a2d';
    ctx.beginPath(); ctx.arc(s.wanted.heli.x * sx, s.wanted.heli.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Traffic (grey dots).
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const c of s.traffic) { ctx.fillRect(c.x * sx - 1, c.y * sy - 1, 2, 2); }
  // Player (white arrow).
  ctx.save();
  ctx.translate(s.player.x * sx, s.player.y * sy);
  ctx.rotate(s.player.inCar ? s.player.car.angle : s.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  // Border + label.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HALCYON BAY', 6, 12);
}
