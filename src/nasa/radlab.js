import { fetchWithSnapshot, getSessionCache, setSessionCache } from './client.js';

const SNAPSHOT_PATH = '/data/radlab-iss-dostel-2022-03-01.json';
const CACHE_KEY = 'helios_nasa_radlab';
const CACHE_MAX_AGE = 15 * 60 * 1000;

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
      return { data: snap, status: 'snapshot', fetchedAt: new Date().toISOString() };
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
