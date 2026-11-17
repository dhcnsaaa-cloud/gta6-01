// HALCYON BAY — config.js
// One job: every tunable constant, palette, district and name in the game.
// Nothing here touches the DOM or the canvas; the other modules read it.
export const WORLD = { w: 3600, h: 2600 };

export const PALETTE = {
  grass: '#7fae5a', grassDry: '#a8bd6a', sand: '#e8d29a', sea: '#2fa8c9',
  seaDeep: '#1d7fa8', road: '#3c3f46', roadEdge: '#2e3036', sidewalk: '#b9b3a4',
  lane: '#e8d44d', crosswalk: '#e8e4d8', plaza: '#c9b18a',
};

export const DISTRICTS = [
  { name: 'DOWNTOWN', x: 900, y: 300, w: 1100, h: 700, note: 'glass towers & the bank' },
  { name: 'MARINA BEACH', x: 2600, y: 300, w: 1000, h: 900, note: 'boardwalk, palms & the pier' },
  { name: 'OLD TOWN', x: 300, y: 1100, w: 900, h: 700, note: 'cafes, murals & the market' },
  { name: 'HARBOR', x: 300, y: 1900, w: 1200, h: 600, note: 'cranes, crates & the docks' },
  { name: 'PALM HILLS', x: 1700, y: 1400, w: 900, h: 900, note: 'villas, safehouse & the view' },
  { name: 'SUNSET STRIP', x: 2000, y: 300, w: 600, h: 1600, note: 'neon, clubs & the race loop' },
];

// Roads: vertical avenues and horizontal streets (grid + coastal curve).
export const ROADS_V = [450, 850, 1250, 1650, 2050, 2450, 2850, 3250];
export const ROADS_H = [450, 850, 1250, 1650, 2050, 2350];
export const ROAD_W = 120;

export const PLAYER = { walkSpeed: 210, runSpeed: 330, radius: 14, maxHealth: 100 };
export const CAR = { accel: 520, brake: 900, maxSpeed: 560, reverseMax: 180, turn: 2.6, radius: 22 };

export const WANTED = {
  decayDelay: 3,      // seconds hidden before stars start falling
  decayInterval: 2.5, // seconds per star lost while hidden
  maxStars: 5,
  copCars: [0, 1, 2, 3, 4, 6], // cop cars per star level
  copFoot: [0, 0, 1, 2, 3, 4],
};

export const MONEY = { start: 120, bustedFine: 150, wastedFee: 100 };

// Three days in Halcyon Bay. The clock starts 08:00 and runs 1 game-minute
// per real second; at 23:00 the city tells Rico to sleep. Sleeping at the
// Palm Hills safehouse advances the day (08:00 next morning, heat halved).
export const DAY = {
  startMins: 8 * 60, endMins: 23 * 60, minsPerSec: 1,
  days: 3,
  missionsPerDay: [4, 4, 4], // Day 1: m1–m4, Day 2: m5–m8, Day 3: m9–m12
};

// Rico's Garage — the player's own garage (Palm Hills, on the 2050/2050
// crossroads). Store stolen cars, switch rides, buy upgrades.
export const GARAGE = {
  name: "RICO'S GARAGE", x: 2050, y: 2050, radius: 110,
  upgrades: {
    engine: { name: 'ENGINE', price: 400, max: 3, desc: '+12% top speed / level' },
    armor: { name: 'ARMOUR', price: 350, max: 3, desc: '+50 car HP / level' },
    paint: { name: 'PAINT', price: 150, max: 5, desc: 'fresh coat, new colour' },
  },
};

export const SAFEHOUSE = { x: 2100, y: 1750, radius: 110 };

// Radio ticker / NPC lines. Dispatch talks when the heat is on; Mara and Old
// Sal talk the rest of the time — and the city remembers finished jobs.
export const TICKER = {
  dispatch: [
    'HPD DISPATCH: all units, suspect vehicle last seen Downtown — air support requested.',
    'HPD DISPATCH: helicopter 2-7 is overhead, spotlight on the suspect. Do not lose visual.',
    'HPD DISPATCH: the Harbor is still hot from last night. Extra patrols on the docks.',
    'HPD DISPATCH: suspect is armed and mobile. Spike strips on the Strip, over.',
  ],
  mara: [
    'MARA: "Rico, the Bay talks. Drive clean and they forget. Drive loud and they remember."',
    'MARA: "Old Sal says the vault crew is watching you now. Don\'t make him regret it."',
    'MARA: "Three days, Rico. That\'s all the window we\'ve got before the heat settles."',
  ],
  sal: [
    'OLD SAL: "A wheelman with a garage is a businessman, kid. A wheelman without one is a thief."',
    'OLD SAL: "I heard about the Harbor Run. The docks still whisper your name, Rico."',
    'OLD SAL: "Sleep, eat, drive. In that order. The city ain\'t going anywhere."',
  ],
};

// Reputation ranks — the most-wanted board on the title / pause screens.
export const REPUTATION = [
  { min: 0, rank: 'NOBODY', line: 'The city hasn\'t noticed Rico Vega yet.' },
  { min: 1, rank: 'SMALL-TIME', line: 'The Bay is starting to learn the name Rico Vega.' },
  { min: 4, rank: 'KNOWN WHEELMAN', line: 'Dispatch knows the car. The docks know the driver.' },
  { min: 8, rank: 'MOST WANTED', line: 'Halcyon PD has a file with Rico\'s name on it.' },
  { min: 12, rank: 'KING OF HALCYON', line: 'The city remembers everything — and it fears him.' },
];

export const CONTROLS = [
  ['W A S D / arrows', 'Move / drive'],
  ['E', 'Enter / exit car'],
  ['F', 'Punch / fire weapon'],
  ['G', 'Switch weapon (fists / pistol)'],
  ['Shift', 'Sprint / handbrake'],
  ['P / Esc', 'Pause'], ['M', 'Mute'], ['Enter', 'Start / confirm'],
  ['B', 'Garage (near Rico\'s Garage)'], ['N', 'Sleep (at the safehouse)'],
];

export const STORY = {
  city: 'Halcyon Bay',
  hero: 'Rico Vega',
  contact: 'Mara Solis',
  fixer: 'Old Sal',
  intro: 'Rico Vega rolls into Halcyon Bay with $120, a borrowed jacket and a debt to Old Sal. One wheelman, one city, one way up.',
};
