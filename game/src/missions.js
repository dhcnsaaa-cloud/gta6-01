// HALCYON BAY — missions.js
// One job: story and side work. A 5-mission arc plus a street race, timed
// courier runs and the sun-shell collection, with objectives, timers and
// pass/fail states the HUD reads.
export const MISSION_LIST = [
  {
    id: 'm1', day: 1, title: '1 · FIRST FARE', giver: 'Mara Solis',
    brief: 'Mara needs a package run to the Marina. Meet her at the Old Town plaza, take the parcel, drive it to the pier — no cops, no questions.',
    steps: [
      { text: 'Meet Mara at the Old Town plaza', x: 770, y: 1450, radius: 60 },
      { text: 'Deliver the parcel to the Marina pier', x: 3360, y: 900, radius: 70 },
    ],
    reward: 150, unlock: 'pistol',
  },
  {
    id: 'm2', day: 1, title: '2 · GETAWAY DRIVER', giver: 'Old Sal',
    brief: 'Sal\'s crew lifted a Meridian from the Sunset Strip. Grab it, shake the 3-star heat, and bring it home to the Palm Hills safehouse.',
    steps: [
      { text: 'Steal the Meridian on the Sunset Strip', x: 2050, y: 1050, radius: 70, stealCar: true },
      { text: 'Lose the heat, then reach the safehouse', x: 2100, y: 1750, radius: 80, needClean: true },
    ],
    reward: 400,
  },
  {
    id: 'm3', day: 1, title: '3 · HARBOR RUN', giver: 'Mara Solis',
    brief: 'Three crates at the Harbor hold the heist gear. Collect them all while the dock patrols look the other way. Loud is expensive.',
    steps: [
      { text: 'Collect crate 1/3 at the Harbor', x: 500, y: 2050, radius: 60 },
      { text: 'Collect crate 2/3 at the Harbor', x: 900, y: 2250, radius: 60 },
      { text: 'Collect crate 3/3 at the Harbor', x: 1250, y: 2100, radius: 60 },
    ],
    reward: 500, timeLimit: 240,
  },
  {
    id: 'm4', day: 1, title: '4 · THE BIG SCORE', giver: 'Old Sal',
    brief: 'The Downtown bank vault opens at noon. Hold the lobby for 20 seconds while the alarm screams, then run the cash to the safehouse.',
    steps: [
      { text: 'Reach the Downtown bank', x: 1250, y: 650, radius: 70 },
      { text: 'Hold the lobby — stay inside the ring!', x: 1250, y: 650, radius: 70, hold: 20 },
      { text: 'Escape to the Palm Hills safehouse', x: 2100, y: 1750, radius: 80 },
    ],
    reward: 1200,
  },
  {
    id: 'm5', day: 2, title: '5 · THE LONG CON', giver: 'Mara Solis',
    brief: 'Day 2. The crew needs a clean getaway car — lift the Stallion off the Strip, lose the tail, and park it at Rico\'s Garage. The city is watching now.',
    steps: [
      { text: 'Steal the Stallion on the Sunset Strip', x: 2450, y: 1050, radius: 70, stealCar: true },
      { text: 'Lose the heat, then park it at the garage', x: 2050, y: 2050, radius: 80, needClean: true },
    ],
    reward: 650,
  },
  {
    id: 'm6', day: 2, title: '6 · THE ESCORT', giver: 'Old Sal',
    brief: 'A nervous accountant needs a ride across town and nobody asking questions. Pick him up on the Strip, wait out the drop, deliver him to the Marina.',
    steps: [
      { text: 'Pick up the accountant on the Strip', x: 2050, y: 1650, radius: 70 },
      { text: 'Wait for the drop — stay in the ring', x: 2050, y: 1650, radius: 70, hold: 10 },
      { text: 'Deliver him to the Marina pier', x: 2850, y: 850, radius: 70 },
    ],
    reward: 600,
  },
  {
    id: 'm7', day: 2, title: '7 · MIDNIGHT PHOTOS', giver: 'Mara Solis',
    brief: 'A rival crew photographs every car on the Strip. Steal their camera car from Downtown and bring the evidence to the garage — quietly.',
    steps: [
      { text: 'Steal the camera car in Downtown', x: 1250, y: 450, radius: 70, stealCar: true },
      { text: 'Bring it to Rico\'s Garage', x: 2050, y: 2050, radius: 80 },
    ],
    reward: 700,
  },
  {
    id: 'm8', day: 2, title: '8 · THREE STOPS, ONE NIGHT', giver: 'Old Sal',
    brief: 'Three drops, one night, 180 seconds. Downtown, the Strip, the beach — Sal is timing you, and the Harbor still remembers your name.',
    steps: [
      { text: 'Drop 1/3 — Downtown', x: 850, y: 450, radius: 70 },
      { text: 'Drop 2/3 — Sunset Strip', x: 2450, y: 1250, radius: 70 },
      { text: 'Drop 3/3 — Marina Beach', x: 3250, y: 1650, radius: 70 },
    ],
    reward: 800, timeLimit: 180,
  },
  {
    id: 'm9', day: 3, title: '9 · THE CHASE', giver: 'Old Sal',
    brief: 'Day 3. Lift the Falcon off the Harbor docks with the whole PD already awake — 3 stars from the first second — and outrun them to the Marina.',
    steps: [
      { text: 'Steal the Falcon at the Harbor', x: 450, y: 2050, radius: 70, stealCar: true },
      { text: 'Outrun the heat to the Marina pier', x: 3250, y: 850, radius: 80 },
    ],
    reward: 900, startStars: 3,
  },
  {
    id: 'm10', day: 3, title: '10 · THE INFORMANT', giver: 'Mara Solis',
    brief: 'An informant in Old Town has the vault codes — but only if the handoff stays calm. Meet him, hold the ring for 15 seconds, run the codes to the plaza.',
    steps: [
      { text: 'Meet the informant in Old Town', x: 850, y: 1250, radius: 70 },
      { text: 'Hold the handoff — stay in the ring!', x: 850, y: 1250, radius: 70, hold: 15 },
      { text: 'Deliver the codes to the plaza', x: 770, y: 1450, radius: 70 },
    ],
    reward: 850,
  },
  {
    id: 'm11', day: 3, title: '11 · THE VAULT CREW', giver: 'Old Sal',
    brief: 'The big one needs a crew. Pick up the driver in Downtown and the safecracker on the Strip, then hold the bank lobby while they work the vault.',
    steps: [
      { text: 'Pick up the driver — Downtown', x: 1250, y: 850, radius: 70 },
      { text: 'Pick up the safecracker — Strip', x: 2850, y: 1250, radius: 70 },
      { text: 'Hold the bank lobby — 15 seconds!', x: 1250, y: 650, radius: 70, hold: 15 },
    ],
    reward: 1400,
  },
  {
    id: 'm12', day: 3, title: '12 · KING OF HALCYON', giver: 'Mara Solis',
    brief: 'Finale. Four checkpoints across the whole city, 180 seconds, 4-star heat from the start — and the helicopter is already overhead. Beat the clock and the city is yours.',
    steps: [
      { text: 'Checkpoint 1/4 — Marina Beach', x: 3350, y: 600, radius: 80 },
      { text: 'Checkpoint 2/4 — Harbor cranes', x: 600, y: 2050, radius: 80 },
      { text: 'Checkpoint 3/4 — Downtown towers', x: 1500, y: 500, radius: 80 },
      { text: 'Checkpoint 4/4 — Palm Hills safehouse', x: 2100, y: 1750, radius: 80 },
    ],
    reward: 3000, timeLimit: 180, startStars: 4,
  },
];

export const RACE_LOOP = [
  { x: 2050, y: 500 }, { x: 2850, y: 500 }, { x: 2850, y: 1650 },
  { x: 2050, y: 1650 }, { x: 2050, y: 500 },
];

export function createMissions(save) {
  return {
    completed: new Set(save?.missionsDone || []),
    active: null,           // {def, step, holdT, timeLeft, startedAt}
    race: null,             // {cp, startTime, best}
    courier: null,          // {to, timeLeft, pay}
    shells: save?.shells || 0,
    banner: null,           // {text, sub, t}
    nextIndex(day = 3) {
      // First uncompleted mission whose day has arrived. Missions are gated
      // per day: Day 1 m1–m4, Day 2 m5–m8, Day 3 m9–m12.
      for (let i = 0; i < MISSION_LIST.length; i++) {
        if (!this.completed.has(MISSION_LIST[i].id) && (MISSION_LIST[i].day || 1) <= day) return i;
      }
      return -1;
    },
    nextDayLocked(day = 1) {
      // First uncompleted mission still locked behind a later day, if any.
      for (let i = 0; i < MISSION_LIST.length; i++) {
        if (!this.completed.has(MISSION_LIST[i].id) && (MISSION_LIST[i].day || 1) > day) return MISSION_LIST[i];
      }
      return null;
    },
  };
}

export function startMission(m, index) {
  const def = MISSION_LIST[index];
  m.active = { def, step: 0, holdT: 0, timeLeft: def.timeLimit || 0, startedAt: Date.now() };
  m.banner = { text: def.title, sub: `${def.giver}: ${def.brief}`, t: 6 };
  return def;
}

export function currentObjective(m, day = 3) {
  if (m.race) return `STREET RACE — checkpoint ${m.race.cp + 1}/${RACE_LOOP.length} — beat ${fmtTime(m.race.best || 0)}`;
  if (m.courier) return `COURIER — deliver in ${Math.ceil(m.courier.timeLeft)}s for $${m.courier.pay}`;
  if (!m.active) {
    const i = m.nextIndex(day);
    if (i === -1) {
      const locked = m.nextDayLocked(day);
      if (locked) return `Day ${locked.day} jobs unlock after sleep — rest at the Palm Hills safehouse (N)`;
      return 'CITY YOURS — free roam, race, courier or shells';
    }
    return `Next job: ${MISSION_LIST[i].title} — go to the gold marker`;
  }
  const step = m.active.def.steps[m.active.step];
  let s = step.text;
  if (step.hold) s += ` (${Math.ceil(step.hold - m.active.holdT)}s)`;
  if (m.active.timeLeft > 0) s += ` — ${Math.ceil(m.active.timeLeft)}s left`;
  return s;
}

export function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Advance missions. Returns events: {type:'step'|'complete'|'fail'|'reward', ...}
export function updateMissions(m, player, dt, api) {
  const events = [];
  if (m.active) {
    const a = m.active;
    if (a.timeLeft > 0) {
      a.timeLeft -= dt;
      if (a.timeLeft <= 0) { events.push({ type: 'fail', reason: 'Out of time.' }); m.active = null; return events; }
    }
    const step = a.def.steps[a.step];
    const d = Math.hypot(player.x - step.x, player.y - step.y);
    // A steal step only counts if the player stole a car AFTER this mission
    // started (a.stoleCar, set by the carjacking itself) — driving your own
    // car onto the marker must not auto-complete the theft.
    const inCarOk = !step.stealCar || (player.inCar && a.stoleCar);
    if (step.needClean && api.wantedStars > 0) { /* wait for clean */ }
    else if (d < step.radius && inCarOk) {
      if (step.hold) {
        a.holdT += dt;
        if (a.holdT >= step.hold) { a.step++; a.holdT = 0; a.stoleCar = false; events.push({ type: 'step' }); }
      } else {
        a.step++; a.stoleCar = false;
        if (step.stealCar) api.onStealCar && api.onStealCar();
        events.push({ type: 'step' });
      }
    }
    if (a.step >= a.def.steps.length) {
      const def = a.def;
      m.completed.add(def.id);
      m.active = null;
      events.push({ type: 'complete', def, reward: def.reward });
    }
  }
  // Race checkpoints.
  if (m.race) {
    const cp = RACE_LOOP[m.race.cp];
    if (Math.hypot(player.x - cp.x, player.y - cp.y) < 80) {
      m.race.cp++;
      events.push({ type: 'raceCp', cp: m.race.cp });
      if (m.race.cp >= RACE_LOOP.length) {
        const t = Date.now() - m.race.startTime;
        const best = !m.race.best || t < m.race.best;
        if (best) m.race.best = t;
        events.push({ type: 'raceDone', time: t, best });
        m.race = null;
      }
    }
  }
  // Courier timer.
  if (m.courier) {
    m.courier.timeLeft -= dt;
    if (Math.hypot(player.x - m.courier.to.x, player.y - m.courier.to.y) < 70) {
      events.push({ type: 'courierDone', pay: m.courier.pay });
      m.courier = null;
    } else if (m.courier.timeLeft <= 0) {
      events.push({ type: 'courierFail' });
      m.courier = null;
    }
  }
  return events;
}

export function missionMarker(m, day = 3) {
  if (m.active) { const s = m.active.def.steps[m.active.step]; return { x: s.x, y: s.y, color: '#ffd700' }; }
  if (m.race) { const c = RACE_LOOP[m.race.cp]; return { x: c.x, y: c.y, color: '#ff7a2d' }; }
  if (m.courier) return { x: m.courier.to.x, y: m.courier.to.y, color: '#2dd4ff' };
  const i = m.nextIndex(day);
  if (i >= 0) { const s = MISSION_LIST[i].steps[0]; return { x: s.x, y: s.y, color: '#ffd700' }; }
  return null;
}

// "The city remembers": the most recent finished job, named in-fiction on the
// title / pause screens and in NPC ticker lines.
export function memoryLine(m) {
  const done = MISSION_LIST.filter((d) => m.completed.has(d.id));
  if (!done.length) return null;
  const last = done[done.length - 1];
  return `The city remembers ${last.title.split('·')[1].trim()} — ${last.giver} still owes Rico for that one.`;
}

export function reputationFor(m) {
  const n = m.completed.size;
  const ranks = [
    { min: 0, rank: 'NOBODY' }, { min: 1, rank: 'SMALL-TIME' },
    { min: 4, rank: 'KNOWN WHEELMAN' }, { min: 8, rank: 'MOST WANTED' },
    { min: 12, rank: 'KING OF HALCYON' },
  ];
  let r = ranks[0];
  for (const x of ranks) if (n >= x.min) r = x;
  return r.rank;
}
