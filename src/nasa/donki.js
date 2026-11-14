import { fetchNasaJson, readSnapshotJson, getSessionCache, setSessionCache } from './client.js';

const SAMPLE_PATH = '/data/donki-snapshot.json';
const CACHE_KEY = 'helios_nasa_donki';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FEEDS = { notifications: 'notifications', flares: 'FLR', cmes: 'CME' };
const FEED_GAP_MS = 300;

export function buildDonkiUrl(endpoint) {
  const end = new Date();
  const start = new Date(end.getTime() - SEVEN_DAYS_MS);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return `https://api.nasa.gov/DONKI/${endpoint}?startDate=${startStr}&endDate=${endStr}`;
}

// A feed that fails is null (shown as "--"), never zero. Status is live when at least one feed answered,
// even if every answer is empty.
export async function fetchDonkiData() {
  const cached = getSessionCache(CACHE_KEY);
  if (cached) return { ...cached, status: 'cached' };

  const names = Object.keys(FEEDS);
  const feeds = {};
  const errors = [];
  for (let i = 0; i < names.length; i++) {
    const k = names[i];
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, FEED_GAP_MS));
    try {
      const value = await fetchNasaJson(buildDonkiUrl(FEEDS[k]));
      if (Array.isArray(value)) {
        feeds[k] = value;
      } else {
        feeds[k] = null;
        errors.push(`${FEEDS[k]} unexpected response`);
      }
    } catch (err) {
      feeds[k] = null;
      errors.push(`${FEEDS[k]} ${err.message}`);
    }
  }

  const answered = names.some((k) => feeds[k]);
  const fetchedAt = new Date().toISOString();
  const error = errors.length ? errors.join('; ') : undefined;
  if (answered) {
    const result = {
      data: { notifications: feeds.notifications || [], flares: feeds.flares, cmes: feeds.cmes },
      status: 'live',
      fetchedAt,
      error,
    };
    setSessionCache(CACHE_KEY, result);
    return result;
  }

  try {
    const sample = await readSnapshotJson(SAMPLE_PATH);
    return {
      data: { notifications: sample.notifications || [], flares: null, cmes: null },
      status: 'sample',
      fetchedAt,
      error,
    };
  } catch {
    return { data: null, status: 'unavailable', fetchedAt, error };
  }
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
    const cls = f.classType || f.class || '';
    const c = classifyFlare(cls);
    return c === 'M' || c === 'X';
  });
}

function safeHttpUrl(value) {
  return typeof value === 'string' && /^https:\/\//.test(value) ? value : null;
}

export function getLatestEvents(data) {
  const events = [];
  if (data?.flares) {
    for (const f of data.flares) {
      events.push({
        type: 'Solar Flare',
        class: f.classType || f.class || '—',
        time: f.beginTime || f.peakTime || f.startTime || '—',
        severity: classifyFlare(f.classType || f.class) || '',
        url: safeHttpUrl(f.link),
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
        url: safeHttpUrl(c.link),
      });
    }
  }
  if (data?.notifications && Array.isArray(data.notifications) && !data.flares?.length) {
    for (const n of data.notifications) {
      events.push({
        type: n.messageType || 'Notification',
        class: n.class || n.messageID || '—',
        time: n.messageIssueTime || n.issueTime || '—',
        severity: classifyFlare(n.class) || '',
        url: safeHttpUrl(n.messageURL),
      });
    }
  }
  events.sort((a, b) => (b.time > a.time ? 1 : -1));
  return events.slice(0, 10);
}
