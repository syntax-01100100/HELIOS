import { fetchNasaSource, readSnapshotJson } from './client.js';

const SNAPSHOT_PATH = '/data/radlab-iss-dostel-2022-03-01.json';

const MAX_POINTS = 600;
const SAA_BOX = { latMin: -50, latMax: 0, lonMin: -90, lonMax: 40 };

function inSAA(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= SAA_BOX.latMin && lat <= SAA_BOX.latMax && lon >= SAA_BOX.lonMin && lon <= SAA_BOX.lonMax;
}

function toMs(ts) {
  const t = String(ts);
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : t + 'Z');
}

// Accepts RadLab row-array JSON ({columns, data}) and saved snapshots ({data:[objects]} or an array).
// Long series are averaged into 5-minute bins so the chart and replay stay light.
export function normalizeRadlab(raw) {
  let rows = [];
  if (Array.isArray(raw)) rows = raw;
  else if (raw && Array.isArray(raw.columns) && Array.isArray(raw.data)) {
    const cols = raw.columns;
    rows = raw.data.map((r) => Object.fromEntries(cols.map((k, i) => [k, r[i]])));
  } else if (raw && Array.isArray(raw.data)) rows = raw.data;

  rows = rows.filter((r) => r && r.timestamp && Number.isFinite(Number(r.absorbed_dose_rate)));
  const metadata = raw && !Array.isArray(raw) ? raw.metadata : undefined;
  if (rows.length === 0) return { metadata, data: [] };

  const finish = (d) => {
    if (d.saa === undefined && inSAA(Number(d.latitude), Number(d.longitude))) d.saa = true;
    return d;
  };
  if (rows.length <= MAX_POINTS) return { metadata, data: rows.map((r) => finish({ ...r })) };

  const bins = new Map();
  for (const r of rows) {
    const k = Math.floor(toMs(r.timestamp) / 300000);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push(r);
  }
  const avg = (arr, f) => {
    const v = arr.map((x) => Number(x[f])).filter(Number.isFinite);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
  };
  const data = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([k, arr]) =>
    finish({
      timestamp: new Date(k * 300000).toISOString(),
      absorbed_dose_rate: Number(avg(arr, 'absorbed_dose_rate').toFixed(3)),
      latitude: avg(arr, 'latitude'),
      longitude: avg(arr, 'longitude'),
      altitude: avg(arr, 'altitude'),
    }),
  );
  return { metadata, data };
}

// RadLab filters put the operator inside the parameter name, e.g. timestamp>=2022-03-01T00:00
export function buildRadlabUrl(startDate, endDate) {
  const query = [
    'spacecraft=ISS',
    'instrument=DosTel',
    `timestamp${encodeURIComponent('>=')}${startDate}T00:00`,
    `timestamp${encodeURIComponent('<')}${endDate}T00:00`,
    'absorbed_dose_rate',
    'latitude',
    'longitude',
    'altitude',
    'format=json',
  ];
  return `https://visualization.osdr.nasa.gov/radlab/api/?${query.join('&')}`;
}

function parseRadlabWindow(raw, startDate, endDate) {
  const normalized = normalizeRadlab(raw);
  if (normalized.data.length === 0) {
    throw new Error(`no RadLab readings for ${startDate} to ${endDate}`);
  }
  return normalized;
}

// liveStatus is 'live' for the current window and 'historical' for the 2022 replay.
// Only the replay has a saved copy of real data to fall back to.
export function fetchRadlabWindow(startDate, endDate, liveStatus) {
  const isReplay = liveStatus === 'historical';
  return fetchNasaSource({
    cacheKey: `helios_nasa_radlab:${startDate}:${endDate}`,
    url: buildRadlabUrl(startDate, endDate),
    parse: (raw) => parseRadlabWindow(raw, startDate, endDate),
    liveStatus,
    fallback: isReplay
      ? async () => parseRadlabWindow(await readSnapshotJson(SNAPSHOT_PATH), startDate, endDate)
      : undefined,
    fallbackStatus: 'snapshot',
  });
}

export function findPeaks(data, threshold) {
  if (!data || !Array.isArray(data)) return [];
  return data.filter((d) => Number(d.absorbed_dose_rate) >= threshold);
}

export function findSAAEvents(data) {
  if (!data || !Array.isArray(data)) return [];
  return data.filter((d) => d.saa === true);
}

export function getMaxDoseRate(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  return data.reduce((max, d) => {
    const v = Number(d.absorbed_dose_rate);
    return v > (max?.absorbed_dose_rate || 0) ? d : max;
  }, data[0]);
}

export function getAvgDoseRate(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const sum = data.reduce((acc, d) => acc + Number(d.absorbed_dose_rate), 0);
  return sum / data.length;
}
