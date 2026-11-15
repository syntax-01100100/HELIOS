import { t, tList } from '../shared/i18n.js';

const POINTS = { green: 100, amber: 60, red: 20 };

export function readinessScore(statuses) {
  const list = Object.values(statuses);
  if (list.length === 0) return null;
  return Math.round(list.reduce((sum, s) => sum + POINTS[s], 0) / list.length);
}

const GREEN_DETAIL = { doNow: 'rule.green.doNow', escalate: 'rule.green.escalate' };

const sysDetail = {
  prevent: 'rule.sys.prevent',
  amber: { doNow: 'rule.sys.amber.doNow', escalate: 'rule.sys.amber.escalate' },
  red: { doNow: 'rule.sys.red.doNow', escalate: 'rule.sys.red.escalate' },
};

const GUIDANCE = {
  hr: {
    meaning: 'rule.hr.meaning',
    prevent: 'rule.hr.prevent',
    amber: { doNow: 'rule.hr.amber.doNow', escalate: 'rule.hr.amber.escalate' },
    red: { doNow: 'rule.hr.red.doNow', escalate: 'rule.hr.red.escalate' },
  },
  spo2: {
    meaning: 'rule.spo2.meaning',
    prevent: 'rule.spo2.prevent',
    amber: { doNow: 'rule.spo2.amber.doNow', escalate: 'rule.spo2.amber.escalate' },
    red: { doNow: 'rule.spo2.red.doNow', escalate: 'rule.spo2.red.escalate' },
  },
  temp: {
    meaning: 'rule.temp.meaning',
    prevent: 'rule.temp.prevent',
    amber: { doNow: 'rule.temp.amber.doNow', escalate: 'rule.temp.amber.escalate' },
    red: { doNow: 'rule.temp.red.doNow', escalate: 'rule.sys.red.escalate' },
  },
  sys: { meaning: 'rule.sys.meaning', ...sysDetail },
  dia: { meaning: 'rule.dia.meaning', ...sysDetail },
  glucose: {
    meaning: 'rule.glucose.meaning',
    prevent: 'rule.glucose.prevent',
    amber: { doNow: 'rule.glucose.amber.doNow', escalate: 'rule.glucose.amber.escalate' },
    red: { doNow: 'rule.glucose.red.doNow', escalate: 'rule.sys.red.escalate' },
  },
  sleep: {
    meaning: 'rule.sleep.meaning',
    prevent: 'rule.sleep.prevent',
    amber: { doNow: 'rule.sleep.amber.doNow', escalate: 'rule.sleep.amber.escalate' },
    red: { doNow: 'rule.sleep.red.doNow', escalate: 'rule.sleep.red.escalate' },
  },
  mood: {
    meaning: 'rule.mood.meaning',
    prevent: 'rule.mood.prevent',
    amber: { doNow: 'rule.mood.amber.doNow', escalate: 'rule.mood.amber.escalate' },
    red: { doNow: 'rule.mood.red.doNow', escalate: 'rule.mood.red.escalate' },
  },
};

export function guidanceFor(key, status) {
  const entry = GUIDANCE[key];
  const detail = status === 'green' ? GREEN_DETAIL : entry[status];
  return {
    meaning: t(entry.meaning),
    prevent: t(entry.prevent),
    doNow: tList(detail.doNow),
    escalate: t(detail.escalate),
  };
}

const COMBINED = [
  {
    key: 'combo.fastLow',
    applies: (v) => v.hr > 100 && v.spo2 < 95,
  },
  {
    key: 'combo.warmFast',
    applies: (v) => v.temp > 37.5 && v.hr > 100,
  },
  {
    key: 'combo.shortSleep',
    applies: (v) => v.sleep < 7 && v.mood <= 3,
  },
];

export function combinedAdvice(values) {
  return COMBINED.filter((rule) => rule.applies(values)).map((rule) => ({
    title: t(`${rule.key}.title`),
    steps: tList(`${rule.key}.steps`),
    escalate: t(`${rule.key}.escalate`),
  }));
}
