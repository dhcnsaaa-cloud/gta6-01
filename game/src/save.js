// HALCYON BAY — save.js
// One job: persistence. Money, missions, shells, race best, unlocks — plus
// the v4 systems: current day + clock, per-district heat, and the garage
// (owned cars + upgrades). Old saves without the new fields load with
// sensible defaults, never crash.
const KEY = 'halcyon-bay-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || !s) return null;
    return s;
  } catch {
    return null;
  }
}

// Normalise a raw save (possibly from an older version) into the full shape
// the game reads. Missing fields get defaults — never undefined.
export function normaliseSave(raw) {
  const s = raw || {};
  return {
    money: typeof s.money === 'number' ? s.money : 120,
    missionsDone: Array.isArray(s.missionsDone) ? s.missionsDone : [],
    shells: typeof s.shells === 'number' ? s.shells : 0,
    hasPistol: !!s.hasPistol,
    raceBest: typeof s.raceBest === 'number' ? s.raceBest : 0,
    day: typeof s.day === 'number' && s.day >= 1 && s.day <= 3 ? s.day : 1,
    clockMins: typeof s.clockMins === 'number' ? s.clockMins : 8 * 60,
    heat: (s.heat && typeof s.heat === 'object') ? s.heat : {},
    garage: (s.garage && typeof s.garage === 'object') ? s.garage : null,
    savedAt: s.savedAt || Date.now(),
  };
}

export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      money: state.money,
      missionsDone: [...state.missions.completed],
      shells: state.missions.shells,
      hasPistol: state.combat.hasPistol,
      raceBest: state.missions.race ? state.missions.race.best : state.raceBest,
      day: state.day.day,
      clockMins: Math.floor(state.day.mins),
      heat: state.heat,
      garage: state.garage,
      savedAt: Date.now(),
    }));
  } catch { /* storage full or blocked — the game still plays */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
