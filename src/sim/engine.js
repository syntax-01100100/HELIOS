import { raise } from './alerts.js';

export const BASE = { hr: 72, spo2: 98, temp: 36.6, act: 'REST', comm: true };

const SCENARIOS = {
  A: {
    name: 'Normal mission operations',
    desc: 'Stable demonstration readings. HELIOS stays in monitoring mode.',
    dur: 12,
    steps: [{ t: 2, alert: ['INFO', null, 'Monitoring normal. All channels within demonstration range.'] }],
  },
  B: {
    name: 'Elevated heart rate',
    desc: 'Heart rate rises, the graph and card highlight, and HELIOS escalates with guidance.',
    dur: 28,
    steps: [
      { t: 2, set: { hr: 118 } },
      { t: 6, alert: ['CAUTION', 'hr', 'Heart rate rising above the demonstration baseline.'] },
      { t: 10, set: { hr: 138 }, alert: ['WARNING', 'hr', 'Heart rate high. Guidance: stop activity, rest and hydrate.'] },
      { t: 22, set: { hr: 76 }, alert: ['INFO', 'hr', 'Heart rate returning to baseline.'] },
    ],
  },
  C: {
    name: 'Reduced SpO2 reading',
    desc: 'Oxygen saturation drops. HELIOS warns and suggests checking the suit supply.',
    dur: 28,
    steps: [
      { t: 2, set: { spo2: 93 } },
      { t: 5, alert: ['CAUTION', 'spo2', 'SpO2 below 95%. Check suit seal and breathing gas supply.'] },
      { t: 10, set: { spo2: 90 }, alert: ['WARNING', 'spo2', 'SpO2 low. Check oxygen supply and rest.'] },
      { t: 22, set: { spo2: 98 }, alert: ['INFO', 'spo2', 'SpO2 returning to baseline.'] },
    ],
  },
  D: {
    name: 'Temperature change',
    desc: 'Skin temperature rises unusually and HELIOS raises an alert.',
    dur: 28,
    steps: [
      { t: 2, set: { temp: 38.0 } },
      { t: 6, alert: ['CAUTION', 'temp', 'Skin temperature unusual. Check suit cooling.'] },
      { t: 12, set: { temp: 38.8 }, alert: ['WARNING', 'temp', 'Skin temperature high. Reduce activity and check cooling.'] },
      { t: 22, set: { temp: 36.6 }, alert: ['INFO', 'temp', 'Skin temperature back to baseline.'] },
    ],
  },
  E: {
    name: 'Movement and inactivity',
    desc: 'Shows how the suit motion sensor (IMU) explains activity and flags long inactivity.',
    dur: 24,
    steps: [
      { t: 2, set: { act: 'INACTIVE 30 MIN' } },
      { t: 5, alert: ['CAUTION', 'act', 'No movement detected for 30 minutes (simulated). Prompting a crew check-in.'] },
      { t: 10, set: { act: 'WALKING', hr: 95 }, alert: ['INFO', 'act', 'IMU shows walking. The higher heart rate is explained by activity.'] },
      { t: 20, set: { act: 'REST', hr: 72 }, alert: ['INFO', 'act', 'Activity back to rest.'] },
    ],
  },
  F: {
    name: 'Communication interruption',
    desc: 'Mission control link drops. Local processing and alerts keep working.',
    dur: 24,
    steps: [
      { t: 2, set: { comm: false } },
      { t: 5, alert: ['CAUTION', null, 'Link to mission control lost. Local processing continues.'] },
      { t: 10, alert: ['INFO', null, 'Offline mode: local alerts remain active on the suit.'] },
      { t: 18, set: { comm: true }, alert: ['INFO', null, 'Link restored. Buffered data syncing.'] },
    ],
  },
  G: {
    name: 'Multiple sensor anomaly',
    desc: 'Several channels become unusual together. HELIOS combines them and escalates priority.',
    dur: 30,
    steps: [
      { t: 2, set: { hr: 128, spo2: 92, temp: 38.0 } },
      { t: 6, alert: ['WARNING', 'hr', 'Heart rate, SpO2 and temperature are all unusual. Combined priority: WARNING. Crew notification ready (simulated).'] },
      { t: 12, set: { hr: 142, spo2: 89, temp: 38.6 }, alert: ['CRITICAL', 'spo2', 'Combined pattern matches a simulated emergency. Emergency assistance notification ready (simulated).'] },
      { t: 25, recover: true, alert: ['INFO', 'hr', 'Readings recovered to baseline.'] },
    ],
  },
};

export const SCENARIO_LIST = Object.entries(SCENARIOS).map(([key, s]) => ({ key, name: s.name, desc: s.desc }));

const cur = { ...BASE };
const target = { ...BASE };
const hist = { hr: [], spo2: [], temp: [] };
const subscribers = [];
const startedAt = Date.now();

let active = null;
let running = false;
let elapsed = 0;
let fired = new Set();

const noise = (amount) => (Math.random() * 2 - 1) * amount;
const pull = (value, goal, rate, jitter) => value + (goal - value) * rate + noise(jitter);

function describe() {
  const scn = active && SCENARIOS[active];
  return { active, running, elapsed, dur: scn ? scn.dur : 0, name: scn ? scn.name : null };
}

function emit() {
  const state = describe();
  subscribers.forEach((fn) => fn(state));
}

function fire(step) {
  if (step.set) Object.assign(target, step.set);
  if (step.recover) Object.assign(target, BASE);
  if (step.alert) raise(...step.alert);
}

function advance() {
  const scn = SCENARIOS[active];
  elapsed += 1;
  scn.steps.forEach((step, i) => {
    if (!fired.has(i) && step.t <= elapsed) {
      fired.add(i);
      fire(step);
    }
  });
  if (elapsed >= scn.dur) {
    running = false;
    raise('INFO', null, `${scn.name} complete. Reset to replay it or choose another scenario.`);
  }
  emit();
}

function restartActive() {
  elapsed = 0;
  fired = new Set();
  Object.assign(target, BASE);
}

export function onChange(fn) {
  subscribers.push(fn);
}

export function currentHr() {
  return cur.hr;
}

export function snapshot() {
  return { cur: { ...cur }, hist: { hr: [...hist.hr], spo2: [...hist.spo2], temp: [...hist.temp] } };
}

export function tick() {
  const t = (Date.now() - startedAt) / 1000;
  if (!active || !running) {
    target.hr = BASE.hr + Math.sin(t * 0.08) * 2.5 + Math.sin(t * 0.03) * 1.5;
    target.spo2 = BASE.spo2 + Math.sin(t * 0.06) * 0.6;
    target.temp = BASE.temp + Math.sin(t * 0.04) * 0.18;
  }
  cur.hr = Math.round(pull(cur.hr, target.hr, 0.35, 1.5));
  cur.spo2 = Math.min(100, Math.round(pull(cur.spo2, target.spo2, 0.35, 0.5)));
  cur.temp = Math.round(pull(cur.temp, target.temp, 0.25, 0.08) * 10) / 10;
  cur.act = target.act;
  cur.comm = target.comm;
  cur.o2 = Math.max(80, 94 - Math.floor((Date.now() - startedAt) / 60000));
  cur.pr = Math.round((29.6 + noise(0.1)) * 10) / 10;
  for (const key of ['hr', 'spo2', 'temp']) {
    hist[key].push(cur[key]);
    if (hist[key].length > 60) hist[key].shift();
  }
  if (active && running) advance();
}

export function start(key) {
  if (key && key !== active) {
    active = key;
    restartActive();
  }
  if (!active) return false;
  if (elapsed >= SCENARIOS[active].dur) restartActive();
  running = true;
  emit();
  return true;
}

export function pause() {
  running = false;
  emit();
}

export function reset() {
  running = false;
  restartActive();
  emit();
}

export function returnToNormal() {
  active = null;
  running = false;
  restartActive();
  raise('INFO', null, 'Returned to normal monitoring. Readings are simulated.');
  emit();
}
