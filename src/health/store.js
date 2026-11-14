const CHECKIN_KEY = 'helios-health-checkins';
const ENV_KEY = 'helios-health-environment';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function dayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function loadCheckins() {
  const list = read(CHECKIN_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function addCheckin(entry) {
  return write(CHECKIN_KEY, [...loadCheckins(), entry]);
}

export const CHECKINS_CHANGED = 'helios:checkins-changed';

export function saveCheckins(list) {
  return write(CHECKIN_KEY, list);
}

export function clearCheckins() {
  try {
    localStorage.removeItem(CHECKIN_KEY);
  } catch {
    return;
  }
}

export function currentStreak(checkins, today = new Date()) {
  const days = new Set(checkins.map((c) => c.date));
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function loadEnvironment() {
  return read(ENV_KEY, 'station');
}

export function saveEnvironment(id) {
  write(ENV_KEY, id);
}
