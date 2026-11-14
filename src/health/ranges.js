const SPEED_OF_LIGHT_KM_S = 299792.458;
const MARS_CLOSEST_KM = 54600000;
const MARS_FARTHEST_KM = 401000000;

function oneWayDelaySeconds(distanceKm) {
  return distanceKm / SPEED_OF_LIGHT_KM_S;
}

function formatDelay(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
  return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}

export const INDICATORS = [
  { key: 'hr', label: 'Resting heart rate', unit: 'BPM', decimals: 0, green: [50, 100], amber: [45, 120] },
  { key: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', decimals: 0, green: [95, 100], amber: [90, 100] },
  { key: 'temp', label: 'Skin temperature', unit: '°C', decimals: 1, green: [36.1, 37.5], amber: [35.5, 38.0] },
  { key: 'sys', label: 'Blood pressure, top number', unit: 'mmHg', decimals: 0, green: [90, 129], amber: [80, 139] },
  { key: 'dia', label: 'Blood pressure, bottom number', unit: 'mmHg', decimals: 0, green: [60, 84], amber: [50, 89] },
  { key: 'glucose', label: 'Blood glucose', unit: 'mg/dL', decimals: 0, green: [70, 110], amber: [60, 125] },
  { key: 'sleep', label: 'Sleep last night', unit: 'hours', decimals: 1, green: [7, 9], amber: [5, 10] },
  { key: 'mood', label: 'Mood', unit: 'of 5', decimals: 0, green: [4, 5], amber: [3, 3] },
];

export const STATUS = {
  green: { icon: '✓', label: 'Within demo range' },
  amber: { icon: '⚠', label: 'Watch closely' },
  red: { icon: '✖', label: 'Act now' },
};

export function statusOf(indicator, value) {
  const [gLo, gHi] = indicator.green;
  const [aLo, aHi] = indicator.amber;
  if (value >= gLo && value <= gHi) return 'green';
  if (value >= aLo && value <= aHi) return 'amber';
  return 'red';
}

export function evaluateAll(values) {
  return Object.fromEntries(INDICATORS.map((ind) => [ind.key, statusOf(ind, values[ind.key])]));
}

export function formatValue(indicator, value) {
  return `${Number(value).toFixed(indicator.decimals)} ${indicator.unit}`;
}

const SPACE_STATION_KM = 420;
const MOON_KM = 384400;

export const ENVIRONMENTS = [
  { id: 'station', label: 'Space station', delayLong: false },
  { id: 'lunar', label: 'Lunar base', delayLong: false },
  { id: 'transit', label: 'Mars transit', delayLong: true },
  { id: 'mars', label: 'Mars surface or rover', delayLong: true },
];

export function getEnvironment(id) {
  return ENVIRONMENTS.find((e) => e.id === id) || ENVIRONMENTS[0];
}

export function delayNote(environmentId) {
  if (environmentId === 'station') return `about ${formatDelay(oneWayDelaySeconds(SPACE_STATION_KM))} one way.`;
  if (environmentId === 'lunar') return `about ${formatDelay(oneWayDelaySeconds(MOON_KM))} one way.`;
  return `${formatDelay(oneWayDelaySeconds(MARS_CLOSEST_KM))} to ${formatDelay(oneWayDelaySeconds(MARS_FARTHEST_KM))} one way, depending on where Mars is.`;
}
