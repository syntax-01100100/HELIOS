import { dayKey } from './store.js';

const SAMPLE_DAYS = 14;
const DRIFT_DAYS = 8;

export function buildSample(now = new Date()) {
  const entries = [];
  for (let i = SAMPLE_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(8, 0, 0, 0);
    const k = i < DRIFT_DAYS ? (DRIFT_DAYS - i) / DRIFT_DAYS : 0;
    const wave = Math.sin(i * 0.9);
    const values = {
      hr: Math.round(68 + wave * 3 + k * 12),
      spo2: Math.round(97 - Math.abs(Math.cos(i)) * 1.5),
      temp: Number((36.6 + wave * 0.2).toFixed(1)),
      sys: Math.round(118 + wave * 8),
      dia: Math.round(76 + wave * 5),
      glucose: Math.round(92 + Math.cos(i * 0.7) * 8),
      sleep: Number((7.2 + Math.cos(i * 1.3) * 0.5 - k * 1.8).toFixed(1)),
      mood: Math.min(5, Math.max(1, Math.round(3.5 + Math.sin(i * 0.5) * 0.6 - k * 1.8))),
      fatigue: Math.min(5, Math.max(1, Math.round(2 + Math.cos(i * 0.8) * 0.4 + k * 2.2))),
      exercise: Math.max(0, Math.round(50 + Math.cos(i * 1.1) * 10 - k * 40)),
    };
    entries.push({ date: dayKey(d), at: d.toISOString(), sample: true, values });
  }
  return entries;
}
