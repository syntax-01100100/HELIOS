export const DRIFT_KEYS = ['hr', 'sleep', 'mood', 'fatigue', 'exercise', 'spo2', 'temp'];

const RECENT_COUNT = 3;
const MIN_BASELINE = 4;
const BASELINE_MAX = 21;
const Z_THRESHOLD = 1.5;

const MIN_SPREAD = { hr: 2, sleep: 0.5, mood: 0.5, fatigue: 0.5, exercise: 10, spo2: 1, temp: 0.2 };

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs, m) {
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

export function analyzeDrift(checkins) {
  const ordered = checkins
    .filter((c) => Number.isFinite(Date.parse(c.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const flagged = [];
  let enoughData = false;

  for (const key of DRIFT_KEYS) {
    const series = ordered.map((c) => c.values?.[key]).filter((v) => Number.isFinite(v));
    if (series.length < RECENT_COUNT + MIN_BASELINE) continue;
    enoughData = true;
    const recent = series.slice(-RECENT_COUNT);
    const earlier = series.slice(0, -RECENT_COUNT).slice(-BASELINE_MAX);
    const baseMean = mean(earlier);
    const spread = Math.max(stdDev(earlier, baseMean), MIN_SPREAD[key]);
    const recentMean = mean(recent);
    const z = (recentMean - baseMean) / spread;
    if (Math.abs(z) >= Z_THRESHOLD) {
      flagged.push({ key, z, direction: z > 0 ? 'up' : 'down', recentMean, baseMean });
    }
  }

  return { enoughData, flagged };
}
