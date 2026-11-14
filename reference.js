export const REFERENCE_RANGES = {
  hr: {
    label: 'Heart Rate',
    unit: 'BPM',
    min: 50,
    max: 110,
    demoThreshold: { caution: 110, warning: 130, critical: 150 },
    source: 'DEMO THRESHOLD',
    sourceNote:
      'No public NASA wearable dataset defines a fixed heart-rate alarm limit for all astronauts. Individual baselines are used in practice. NASA-STD-3001 Volume 2 addresses physiological limits but does not publish a single heart-rate alarm number for EVA.',
  },
  spo2: {
    label: 'Blood Oxygen (SpO₂)',
    unit: '%',
    min: 95,
    demoThreshold: { caution: 94, warning: 92, critical: 90 },
    source: 'DEMO THRESHOLD',
    sourceNote:
      'NASA-STD-3001 references oxygen requirements for suit environments but does not publish a single SpO₂ alarm threshold for wearable monitoring. The 95% lower bound is a general clinical convention, not a NASA mission standard.',
  },
  temp: {
    label: 'Skin Temperature',
    unit: '°C',
    min: 35.5,
    max: 37.5,
    demoThreshold: { caution: 37.5, warning: 38.0, critical: 38.5 },
    source: 'DEMO THRESHOLD',
    sourceNote:
      'NASA-STD-3001 Volume 2 defines suit thermal control ranges. These skin-temperature thresholds are demo values for the HELIOS prototype and are not NASA-specified alarm levels.',
  },
  radiation: {
    label: 'ISS Radiation (DosTel absorbed dose rate)',
    unit: 'µGy/h',
    demoThreshold: { advisory: 0.08 },
    source: 'DEMO THRESHOLD',
    sourceNote:
      'The advisory threshold is a configurable demo value, not a NASA radiation limit. NASA career dose limits are defined in NASA-STD-3001 Volume 2 and NCRP Report 132, but short-term absorbed dose rate alarms for EVA are mission-specific.',
  },
};

export function getRange(key) {
  return REFERENCE_RANGES[key] || null;
}

export function getStatus(key, value) {
  const range = REFERENCE_RANGES[key];
  if (!range || !range.demoThreshold) return 'unknown';
  const v = Number(value);
  const t = range.demoThreshold;
  if (t.critical != null && v >= t.critical) return 'critical';
  if (t.warning != null && v >= t.warning) return 'warning';
  if (t.caution != null && v >= t.caution) return 'caution';
  if (t.advisory != null && v >= t.advisory) return 'advisory';
  return 'nominal';
}

export function getSource(key) {
  const range = REFERENCE_RANGES[key];
  return range ? range.source : 'DEMO THRESHOLD';
}
