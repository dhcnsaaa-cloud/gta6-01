// HALCYON BAY — city.js
// One job: build the city — roads, blocks, buildings, beach, palms, props —
// and answer collision / road queries for the rest of the game.
import { WORLD, ROADS_V, ROADS_H, ROAD_W, PALETTE, DISTRICTS } from './config.js';

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROOF_COLORS = ['#c96a4a', '#d9a05b', '#7d9db5', '#8fae7e', '#b5768a', '#6f8f7b', '#d8cfae', '#5b7d9e'];
const WALL_COLORS = ['#e8dcc8', '#d9c2a3', '#c8d4dc', '#e0b8a0', '#cfd8c2', '#e6d3b3'];
const GLASS = ['#7fc4d8', '#5aa8c4', '#8fd0e0', '#4d94b8'];

export function buildCity(seed = 20261117) {
  const rnd = mulberry(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const props = []; // {x,y,kind:'crate'|'bench'|'hydrant'|'sign',w,h,color}
  const coins = []; // hidden sun-shell collectibles
  const roadSetV = new Set(ROADS_V), roadSetH = new Set(ROADS_H);

  const onRoad = (x, y, pad = ROAD_W / 2 + 6) =>
    ROADS_V.some((rx) => Math.abs(x - rx) < pad) || ROADS_H.some((ry) => Math.abs(y - ry) < pad);

  // Buildings fill every block between roads, kept off the road surface.
  for (let i = 0; i < ROADS_V.length - 1; i++) {
    for (let j = 0; j < ROADS_H.length - 1; j++) {
      const x0 = ROADS_V[i] + ROAD_W / 2 + 14, x1 = ROADS_V[i + 1] - ROAD_W / 2 - 14;
      const y0 = ROADS_H[j] + ROAD_W / 2 + 14, y1 = ROADS_H[j + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // Beach strip: east of x=3300 is sand & sea, no buildings.
      if (x0 > 3300) continue;
      const downtown = x0 > 850 && x0 < 2050 && y0 < 1000;
      const n = downtown ? 2 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const bw = 90 + rnd() * Math.min(150, (x1 - x0) / n - 20);
        const bh = 80 + rnd() * 130;
        const bx = x0 + rnd() * Math.max(1, x1 - x0 - bw);
        const by = y0 + rnd() * Math.max(1, y1 - y0 - bh);
        const tall = downtown && rnd() < 0.55;
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          floors: tall ? 6 + Math.floor(rnd() * 14) : 1 + Math.floor(rnd() * 3),
          roof: ROOF_COLORS[Math.floor(rnd() * ROOF_COLORS.length)],
          wall: WALL_COLORS[Math.floor(rnd() * WALL_COLORS.length)],
          glass: GLASS[Math.floor(rnd() * GLASS.length)],
          tall,
          name: downtown ? 'TOWER' : (rnd() < 0.5 ? 'SHOP' : 'HOUSE'),
        });
      }
      // Street props inside the block.
      const propN = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < propN; k++) {
        const px = x0 + rnd() * (x1 - x0), py = y0 + rnd() * (y1 - y0);
        if (onRoad(px, py, 20)) continue;
        const kind = ['bench', 'hydrant', 'planter'][Math.floor(rnd() * 3)];
        props.push({ x: px, y: py, kind, w: 26, h: 14, color: '#8a6f4d' });
      }
    }
  }

  // Harbor crates (south-west) and market stalls (old town). Crates stay
  // OFF the road surface: a crate dead-centre on a road is a blind wedge
  // a fast car cannot steer around in time (and it wedged the getaway car
  // on the y=2350 leg during play-testing).
  let placed = 0, cguard = 0;
  while (placed < 26 && cguard++ < 200) {
    const px = 380 + rnd() * 900, py = 1980 + rnd() * 420;
    if (onRoad(px, py, 80)) continue;
    props.push({ x: px, y: py, kind: 'crate', w: 34, h: 34, color: ['#b5763a', '#7d9db5', '#8fae7e'][placed % 3] });
    placed++;
  }
  // Palms along the beach boardwalk and Sunset Strip.
  for (let k = 0; k < 46; k++) {
    palms.push({ x: 3310 + rnd() * 130, y: 320 + rnd() * 1900 });
    if (k % 2 === 0) palms.push({ x: 1990 + rnd() * 40, y: 320 + rnd() * 1500 });
  }
  // Lamps at every intersection.
  for (const rx of ROADS_V) for (const ry of ROADS_H) {
    lamps.push({ x: rx + ROAD_W / 2 + 8, y: ry + ROAD_W / 2 + 8 });
    lamps.push({ x: rx - ROAD_W / 2 - 8, y: ry - ROAD_W / 2 - 8 });
  }
  // 12 hidden sun-shells, spread across districts.
  const shellSpots = [
    [520, 520], [950, 1780], [1350, 980], [1750, 550], [2150, 1380], [2550, 950],
    [3050, 1750], [3350, 700], [650, 2150], [1150, 2250], [2350, 2150], [2850, 1350],
  ];
  for (const [x, y] of shellSpots) coins.push({ x, y, taken: false });

  // Road graph: intersections are nodes; traffic drives node to node.
  const nodes = [];
  for (const rx of ROADS_V) for (const ry of ROADS_H) nodes.push({ x: rx, y: ry });
  const neighbors = (n) => {
    const out = [];
    for (const m of nodes) {
      if (m === n) continue;
      if (m.x === n.x && ROADS_H.includes(m.y) && Math.abs(m.y - n.y) <= 460) out.push(m);
      if (m.y === n.y && ROADS_V.includes(m.x) && Math.abs(m.x - n.x) <= 460) out.push(m);
    }
    return out;
  };

  return {
    buildings, palms, lamps, props, coins, nodes, neighbors, onRoad,
    districtAt(x, y) {
      for (const d of DISTRICTS) if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d;
      return x > 3300 ? { name: 'THE BEACH', note: 'sand, surf & the pier' } : { name: 'HALCYON BAY', note: '' };
    },
    // Circle-vs-building/props collision. Returns the push-out vector or null.
    collideCircle(x, y, r) {
      for (const b of buildings) {
        const cx = Math.max(b.x, Math.min(x, b.x + b.w));
        const cy = Math.max(b.y, Math.min(y, b.y + b.h));
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.01;
          return { x: (dx / d) * (r - d), y: (dy / d) * (r - d) };
        }
      }
      for (const p of props) {
        if (p.kind === 'crate') {
          const cx = Math.max(p.x - p.w / 2, Math.min(x, p.x + p.w / 2));
          const cy = Math.max(p.y - p.h / 2, Math.min(y, p.y + p.h / 2));
          const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
          if (d2 < r * r) {
            const d = Math.sqrt(d2) || 0.01;
            return { x: (dx / d) * (r - d), y: (dy / d) * (r - d) };
          }
        }
      }
      return null;
    },
    insideBuilding(x, y) {
      return buildings.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
    },
  };
}

// Draw the static city. Called every frame (cheap: only the camera window).
export function drawCity(ctx, city, cam) {
  const { x: cx, y: cy, w: cw, h: ch } = cam;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(cx, cy, cw, ch);
  // Dry grass patches.
  ctx.fillStyle = PALETTE.grassDry;
  for (let gx = 0; gx < WORLD.w; gx += 420) for (let gy = 0; gy < WORLD.h; gy += 380) {
    if (((gx + gy) / 60) % 3 < 1) ctx.fillRect(gx + 60, gy + 40, 180, 120);
  }
  // Sea + sand (east edge) and the pier.
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(3400, cy, cw, ch);
  ctx.fillStyle = PALETTE.seaDeep;
  for (let wy = 0; wy < WORLD.h; wy += 90) {
    ctx.fillRect(3440 + ((wy / 90) % 2) * 40, wy, 90, 6);
  }
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(3300, cy, 100, ch);
  ctx.fillStyle = '#b98d5f';
  ctx.fillRect(3280, 900, 160, 14); // pier
  ctx.fillRect(3420, 820, 14, 180);
  // Plaza in Old Town.
  ctx.fillStyle = PALETTE.plaza;
  ctx.fillRect(560, 1300, 420, 300);
  ctx.fillStyle = '#3f8fbf';
  ctx.beginPath(); ctx.arc(770, 1450, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bfe6f5';
  ctx.beginPath(); ctx.arc(770, 1450, 30, 0, Math.PI * 2); ctx.fill();

  // Rico's Garage (Palm Hills, just south of the 2050/2050 crossroads):
  // forecourt + roller doors + sign. The interaction point stays the crossing.
  ctx.fillStyle = '#8d8578';
  ctx.fillRect(1960, 2130, 220, 160);
  ctx.fillStyle = '#4a4640';
  ctx.fillRect(1980, 2140, 180, 110);
  ctx.fillStyle = '#2c2f36';
  for (let d = 0; d < 3; d++) ctx.fillRect(1990 + d * 58, 2160, 46, 80);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(1980, 2122, 180, 16);
  ctx.fillStyle = '#1d1206';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("RICO'S GARAGE", 2070, 2134);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('B — OPEN GARAGE', 2070, 2305);
  // Palm Hills safehouse (2100/1750): villa with a gold roof + sleep marker.
  // The label sits on the 2050 avenue below the villa — clear of the
  // PALM HILLS district label painted at the district centre (2150,1850).
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(2060, 1730, 90, 70);
  ctx.fillStyle = '#d94f3d';
  ctx.beginPath(); ctx.moveTo(2052, 1730); ctx.lineTo(2105, 1692); ctx.lineTo(2158, 1730); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('SAFEHOUSE · N — SLEEP', 2105, 1970);

  // Roads.
  for (const rx of ROADS_V) {
    ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(rx - ROAD_W / 2 - 14, cy, ROAD_W + 28, ch);
    ctx.fillStyle = PALETTE.road; ctx.fillRect(rx - ROAD_W / 2, cy, ROAD_W, ch);
    ctx.fillStyle = PALETTE.lane;
    for (let y = Math.floor(cy / 60) * 60; y < cy + ch; y += 60) ctx.fillRect(rx - 2, y, 4, 30);
  }
  for (const ry of ROADS_H) {
    ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(cx, ry - ROAD_W / 2 - 14, cw, ROAD_W + 28);
    ctx.fillStyle = PALETTE.road; ctx.fillRect(cx, ry - ROAD_W / 2, cw, ROAD_W);
    ctx.fillStyle = PALETTE.lane;
    for (let x = Math.floor(cx / 60) * 60; x < cx + cw; x += 60) ctx.fillRect(x, ry - 2, 30, 4);
  }
  // Crosswalks at intersections.
  ctx.fillStyle = PALETTE.crosswalk;
  for (const rx of ROADS_V) for (const ry of ROADS_H) {
    for (let k = -2; k <= 2; k++) ctx.fillRect(rx + k * 20 - 6, ry - ROAD_W / 2 + 6, 12, 18);
  }
  // District name labels painted on the ground.
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) ctx.fillText(d.name, d.x + d.w / 2, d.y + d.h / 2);

  // Buildings with long warm shadows (sun from the south-west).
  for (const b of city.buildings) {
    if (b.x > cx + cw || b.x + b.w < cx || b.y > cy + ch || b.y + b.h < cy) continue;
    const sh = b.tall ? b.floors * 3 : 10;
    ctx.fillStyle = 'rgba(40,30,20,0.25)';
    ctx.fillRect(b.x + sh, b.y + sh, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = b.glass;
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i + j) % 3 === 0) continue;
      ctx.fillRect(b.x + 10 + i * ((b.w - 20) / cols), b.y + 10 + j * ((b.h - 20) / rows), 10, 8);
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(b.x + b.w / 2 - 3, b.y + b.h / 2 - 3, 6, 6);
    }
  }
  // Props.
  for (const p of city.props) {
    if (p.x < cx || p.x > cx + cw || p.y < cy || p.y > cy + ch) continue;
    ctx.fillStyle = p.color;
    if (p.kind === 'crate') { ctx.fillRect(p.x - 17, p.y - 17, 34, 34); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(p.x - 17, p.y - 17, 34, 34); }
    else if (p.kind === 'bench') ctx.fillRect(p.x - 13, p.y - 7, 26, 14);
    else if (p.kind === 'hydrant') { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = '#5d8a4a'; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill(); }
  }
  // Palms.
  for (const p of city.palms) {
    if (p.x < cx || p.x > cx + cw || p.y < cy || p.y > cy + ch) continue;
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 4, p.y - 18); ctx.stroke();
    ctx.fillStyle = '#3f8f3a';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(p.x + 4 + Math.cos(a) * 12, p.y - 20 + Math.sin(a) * 8, 14, 5, a, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Lamps.
  ctx.fillStyle = '#2c2f36';
  for (const l of city.lamps) {
    if (l.x < cx || l.x > cx + cw || l.y < cy || l.y > cy + ch) continue;
    ctx.beginPath(); ctx.arc(l.x, l.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Sun-shell collectibles (glowing).
  for (const c of city.coins) {
    if (c.taken) continue;
    const pulse = 6 + Math.sin(performance.now() / 300 + c.x) * 2;
    ctx.fillStyle = 'rgba(255,215,0,0.35)';
    ctx.beginPath(); ctx.arc(c.x, c.y, pulse + 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(c.x, c.y, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', c.x, c.y + 4);
  }
}
