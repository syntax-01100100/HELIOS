import { fetchWithSnapshot, getSessionCache, setSessionCache } from './client.js';

const SNAPSHOT_PATH = '/data/donki-snapshot.json';
const CACHE_KEY = 'helios_nasa_donki';
const CACHE_MAX_AGE = 15 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getApiKey() {
  return import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
}

export function buildDonkiUrl(endpoint) {
  const end = new Date();
  const start = new Date(end.getTime() - SEVEN_DAYS_MS);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return `https://api.nasa.gov/DONKI/${endpoint}?startDate=${startStr}&endDate=${endStr}&api_key=${getApiKey()}`;
}

export async function fetchDonkiData() {
  const cached = getSessionCache(CACHE_KEY, CACHE_MAX_AGE);
  if (cached) {
    return { ...cached.data, status: 'cached', fetchedAt: new Date(cached.cachedAt).toISOString() };
  }

  const notifUrl = buildDonkiUrl('notifications');
  const flrUrl = buildDonkiUrl('FLR');
  const cmeUrl = buildDonkiUrl('CME');

  const [notifRes, flrRes, cmeRes] = await Promise.all([
    fetchWithSnapshot(notifUrl, SNAPSHOT_PATH),
    fetchWithSnapshot(flrUrl, SNAPSHOT_PATH),
    fetchWithSnapshot(cmeUrl, SNAPSHOT_PATH),
  ]);

  const anyLive = notifRes.status === 'live' || flrRes.status === 'live' || cmeRes.status === 'live';
  const status = anyLive ? 'live' : notifRes.status === 'snapshot' ? 'snapshot' : 'unavailable';

  const merged = {
    data: {
      notifications: notifRes.data?.notifications || notifRes.data || [],
      flares: Array.isArray(flrRes.data) ? flrRes.data : [],
      cmes: Array.isArray(cmeRes.data) ? cmeRes.data : [],
    },
    status,
    fetchedAt: new Date().toISOString(),
    errors: [notifRes.error, flrRes.error, cmeRes.error].filter(Boolean),
  };

  if (status === 'live' || status === 'snapshot') {
    setSessionCache(CACHE_KEY, merged);
  }

  return merged;
}

export function classifyFlare(flareClass) {
  if (!flareClass) return null;
  const cls = flareClass.toUpperCase();
  if (cls.startsWith('X')) return 'X';
  if (cls.startsWith('M')) return 'M';
  if (cls.startsWith('C')) return 'C';
  if (cls.startsWith('B')) return 'B';
  if (cls.startsWith('A')) return 'A';
  return null;
}

export function hasMajorFlare(flares) {
  if (!Array.isArray(flares)) return false;
  return flares.some((f) => {
    const cls = f.class || f.flrID || '';
    const c = classifyFlare(cls);
    return c === 'M' || c === 'X';
  });
}

export function getLatestEvents(data) {
  const events = [];
  if (data?.flares) {
    for (const f of data.flares) {
      events.push({
        type: 'Solar Flare',
        class: f.class || f.peakTime || '—',
        time: f.beginTime || f.peakTime || f.startTime || '—',
        severity: classifyFlare(f.class) || '',
      });
    }
  }
  if (data?.cmes) {
    for (const c of data.cmes) {
      events.push({
        type: 'CME',
        class: 'CME',
        time: c.startTime || c.time || '—',
        severity: '',
      });
    }
  }
  if (data?.notifications && Array.isArray(data.notifications) && !data.flares?.length) {
    for (const n of data.notifications) {
      events.push({
        type: n.messageType || 'Notification',
        class: n.class || n.messageID || '—',
        time: n.issueTime || '—',
        severity: classifyFlare(n.class) || '',
      });
    }
  }
  events.sort((a, b) => (b.time > a.time ? 1 : -1));
  return events.slice(0, 10);
}
