import { t } from '../shared/i18n.js';

const SPEED_OF_LIGHT_KM_S = 299792.458;
const MARS_CLOSEST_KM = 54600000;
const MARS_FARTHEST_KM = 401000000;

function oneWayDelaySeconds(distanceKm) {
  return distanceKm / SPEED_OF_LIGHT_KM_S;
}

function formatDelay(seconds) {
  if (seconds < 60) return t('delay.sec', { s: seconds.toFixed(1) });
  if (seconds < 3600) {
    return t('delay.minSec', { m: Math.floor(seconds / 60), s: Math.round(seconds % 60) });
  }
  return t('delay.hourMin', { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60) });
}

function indicator(def) {
  return {
    ...def,
    get label() {
      return t(`ind.${def.key}`);
    },
    get unit() {
      return t(`unit.${def.unitKey}`);
    },
  };
}

export const INDICATORS = [
  indicator({ key: 'hr', unitKey: 'bpm', decimals: 0, green: [50, 100], amber: [45, 120] }),
  indicator({ key: 'spo2', unitKey: 'percent', decimals: 0, green: [95, 100], amber: [90, 100] }),
  indicator({ key: 'temp', unitKey: 'celsius', decimals: 1, green: [36.1, 37.5], amber: [35.5, 38.0] }),
  indicator({ key: 'sys', unitKey: 'mmhg', decimals: 0, green: [90, 129], amber: [80, 139] }),
  indicator({ key: 'dia', unitKey: 'mmhg', decimals: 0, green: [60, 84], amber: [50, 89] }),
  indicator({ key: 'glucose', unitKey: 'mgdl', decimals: 0, green: [70, 110], amber: [60, 125] }),
  indicator({ key: 'sleep', unitKey: 'hours', decimals: 1, green: [7, 9], amber: [5, 10] }),
  indicator({ key: 'mood', unitKey: 'ofFive', decimals: 0, green: [4, 5], amber: [3, 3] }),
];

// Long-term habits and symptoms: tracked and charted for drift, kept out of the readiness score and body map.
export const EXTRA_INDICATORS = [
  indicator({ key: 'fatigue', unitKey: 'ofFive', decimals: 0, green: [1, 2], amber: [3, 3] }),
  indicator({ key: 'exercise', unitKey: 'minutes', decimals: 0, green: [30, 300], amber: [10, 300] }),
];

export const STATUS = {
  green: {
    icon: '✓',
    get label() {
      return t('status.green');
    },
  },
  amber: {
    icon: '⚠',
    get label() {
      return t('status.amber');
    },
  },
  red: {
    icon: '✖',
    get label() {
      return t('status.red');
    },
  },
};

export function statusOf(indicatorDef, value) {
  const [gLo, gHi] = indicatorDef.green;
  const [aLo, aHi] = indicatorDef.amber;
  if (value >= gLo && value <= gHi) return 'green';
  if (value >= aLo && value <= aHi) return 'amber';
  return 'red';
}

export function evaluateAll(values) {
  return Object.fromEntries(INDICATORS.map((ind) => [ind.key, statusOf(ind, values[ind.key])]));
}

export function formatValue(indicatorDef, value) {
  return `${Number(value).toFixed(indicatorDef.decimals)} ${indicatorDef.unit}`;
}

const SPACE_STATION_KM = 420;
const MOON_KM = 384400;

export const ENVIRONMENTS = [
  {
    id: 'station',
    get label() {
      return t('env.station');
    },
    delayLong: false,
  },
  {
    id: 'lunar',
    get label() {
      return t('env.lunar');
    },
    delayLong: false,
  },
  {
    id: 'transit',
    get label() {
      return t('env.transit');
    },
    delayLong: true,
  },
  {
    id: 'mars',
    get label() {
      return t('env.mars');
    },
    delayLong: true,
  },
];

export function getEnvironment(id) {
  return ENVIRONMENTS.find((e) => e.id === id) || ENVIRONMENTS[0];
}

export function delayNote(environmentId) {
  if (environmentId === 'station') {
    return t('delay.near', { d: formatDelay(oneWayDelaySeconds(SPACE_STATION_KM)) });
  }
  if (environmentId === 'lunar') {
    return t('delay.near', { d: formatDelay(oneWayDelaySeconds(MOON_KM)) });
  }
  return t('delay.mars', {
    a: formatDelay(oneWayDelaySeconds(MARS_CLOSEST_KM)),
    b: formatDelay(oneWayDelaySeconds(MARS_FARTHEST_KM)),
  });
}
