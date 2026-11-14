export const LEARNED_KEY = 'helios-learned';
export const GAME_KEY = 'helios-game';

export const COLORS = { green: '#2E9E6B', amber: '#E0A020', red: '#D9534F', none: '#B9B2A3' };
export const RANK = { green: 0, amber: 1, red: 2 };

const ALIASES = { ok: 'green', warn: 'amber', warning: 'amber', alert: 'red', critical: 'red' };

export function norm(status) {
  const s = String(status ?? '').trim().toLowerCase();
  const mapped = Object.hasOwn(ALIASES, s) ? ALIASES[s] : s;
  return Object.hasOwn(RANK, mapped) ? mapped : null;
}

export function worst(statuses) {
  let out = null;
  for (const raw of statuses) {
    const s = norm(raw);
    if (s && (out === null || RANK[s] > RANK[out])) out = s;
  }
  return out;
}

export function jget(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function jset(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadLearned() {
  const list = jget(LEARNED_KEY, []);
  return Array.isArray(list) ? list : [];
}
