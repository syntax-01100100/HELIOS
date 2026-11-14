import { fetchWithSnapshot, getSessionCache, setSessionCache } from './client.js';

const SNAPSHOT_PATH = '/data/radlab-iss-dostel-2022-03-01.json';
const CACHE_KEY = 'helios_nasa_radlab';
const CACHE_MAX_AGE = 15 * 60 * 1000;

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

// Accepts every shape RadLab data can arrive in and returns { metadata?, data: [objects] }:
//  - { columns:[...], index:[...], data:[[...]] }  (RadLab JSON, row arrays)
//  - { metadata, data:[{...}] } or a plain array of objects (saved snapshot)
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

export function buildRadlabUrl(spacecraft, instrument, startDate, endDate) {
  const base = 'https://visualization.osdr.nasa.gov/radlab/api/';
  const params = new URLSearchParams({
    spacecraft: spacecraft || 'ISS',
    instrument: instrument || 'DosTel',
    timestamp: `>=${startDate}T00:00`,
    timestamp2: `<${endDate}T00:00`,
    absorbed_dose_rate: '',
    latitude: '',
    longitude: '',
    altitude: '',
    format: 'json',
  });
  return `${base}?spacecraft=${params.get('spacecraft')}&instrument=${params.get('instrument')}&timestamp${encodeURIComponent('>=')}${startDate}T00:00&timestamp${encodeURIComponent('<')}${endDate}T00:00&absorbed_dose_rate&latitude&longitude&altitude&format=json`;
}

export async function fetchRadlabData(startDate, endDate) {
  const cached = getSessionCache(CACHE_KEY, CACHE_MAX_AGE);
  if (cached) {
    return { ...cached.data, status: 'cached', fetchedAt: new Date(cached.cachedAt).toISOString() };
  }

  const url = buildRadlabUrl('ISS', 'DosTel', startDate, endDate);
  const result = await fetchWithSnapshot(url, SNAPSHOT_PATH);
  result.data = normalizeRadlab(result.data);
  if (result.data.data.length === 0) {
    return await loadRadlabSnapshot();
  }

  if (result.status === 'live' || result.status === 'snapshot') {
    setSessionCache(CACHE_KEY, result);
  }

  return result;
}

export async function loadRadlabSnapshot() {
  try {
    const resp = await fetch(SNAPSHOT_PATH);
    if (resp.ok) {
      const snap = await resp.json();
      return { data: normalizeRadlab(snap), status: 'snapshot', fetchedAt: new Date().toISOString() };
    }
  } catch {}
  return { data: null, status: 'unavailable', fetchedAt: new Date().toISOString() };
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
