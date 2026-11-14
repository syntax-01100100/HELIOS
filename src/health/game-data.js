import { GAME_KEY, jget, jset, loadLearned } from './common.js';
import { currentStreak, dayKey, loadCheckins } from './store.js';

export const HAZARDS = {
  radiation: { label: 'Radiation beam', fact: 'Cosmic radiation is one reason crews have their radiation dose tracked.' },
  isolation: { label: 'Isolation wall', fact: 'Small crews in isolation often report changes in sleep and mood.' },
  distance: { label: 'Signal delay', fact: 'Signal delay means crews plan medical steps before advice can arrive.' },
  gravity: { label: 'Gravity rock', fact: 'Bone density drops in microgravity unless crews exercise every day.' },
  co2: { label: 'CO2 cloud', fact: 'High carbon dioxide makes breathing and heart rate work harder.' },
};

export const HAZARD_ORDER = Object.keys(HAZARDS);

export const SKINS = [
  { minStreak: 0, name: 'Rookie', body: '#FFFFFF', trim: '#9AA5B8' },
  { minStreak: 3, name: 'Mercury', body: '#C0C7D1', trim: '#5E6878' },
  { minStreak: 7, name: 'Apollo', body: '#F4F6F8', trim: '#3F51A8' },
  { minStreak: 14, name: 'Launch', body: '#E8772E', trim: '#7A3412' },
  { minStreak: 30, name: 'Mars', body: '#B5412F', trim: '#5C1E14' },
];

export const PICKUP_KINDS = [
  { key: 'water', label: 'Water', color: '#4DB6E8' },
  { key: 'sleep', label: 'Sleep', color: '#8C9CF0' },
  { key: 'heart', label: 'Heart', color: '#E0607A' },
  { key: 'mood', label: 'Mood', color: '#F2B233' },
];

export const XP_PER_CHECKIN = 50;
export const XP_PER_REGION = 10;

const DEFAULT_PREFS = { retro: false, calm: false, sound: false, crt: false };

export function loadProgress() {
  const saved = jget(GAME_KEY, null);
  return {
    best: Number.isFinite(saved?.best) ? saved.best : 0,
    cleared: Array.isArray(saved?.cleared) ? saved.cleared.filter((k) => HAZARDS[k]) : [],
    prefs: { ...DEFAULT_PREFS, ...(saved?.prefs ?? {}) },
  };
}

export function saveProgress(progress) {
  jset(GAME_KEY, progress);
}

export function skinFor(streak) {
  return SKINS.filter((s) => streak >= s.minStreak).at(-1);
}

export function currentStats(now = new Date()) {
  const real = loadCheckins().filter((c) => !c.sample);
  const streak = currentStreak(real, now);
  const learned = new Set(loadLearned()).size;
  return {
    checkins: real.length,
    streak,
    learned,
    checkedInToday: real.some((c) => c.date === dayKey(now)),
    xp: real.length * XP_PER_CHECKIN + learned * XP_PER_REGION,
    skin: skinFor(streak),
  };
}

export function badgesFor(stats, progress) {
  return [
    { name: 'First Check-in', hint: 'Save your first check-in', earned: stats.checkins >= 1 },
    { name: '3-Day Streak', hint: 'Check in three days in a row', earned: stats.streak >= 3 },
    { name: 'Full Panel', hint: 'Learn all five body regions', earned: stats.learned >= 5 },
    { name: 'Hazard Scholar', hint: 'Pass a wall of every hazard type', earned: HAZARD_ORDER.every((k) => progress.cleared.includes(k)) },
  ];
}
