const TIMEOUT_MS = 25000;
const CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const PROXY_HOSTS = ['visualization.osdr.nasa.gov', 'osdr.nasa.gov', 'api.nasa.gov'];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function needsProxy(url) {
  return PROXY_HOSTS.includes(new URL(url).hostname);
}

function getRequestUrl(url) {
  if (!needsProxy(url)) return url;
  if (SUPABASE_URL) return `${SUPABASE_URL}/functions/v1/nasa-proxy?url=${encodeURIComponent(url)}`;
  const direct = new URL(url);
  if (direct.hostname === 'api.nasa.gov' && !direct.searchParams.has('api_key')) {
    direct.searchParams.set('api_key', 'DEMO_KEY');
  }
  return direct.toString();
}

async function failureReason(resp) {
  let body = null;
  try { body = await resp.json(); } catch {}
  if (resp.status === 429) return 'NASA rate limit (shared demo key; set NASA_API_KEY)';
  if (resp.status === 504) return 'NASA did not answer in time';
  if (resp.status === 502 && body?.upstreamStatus) return `NASA returned ${body.upstreamStatus}`;
  if (typeof body?.error === 'string') return body.error;
  return `HTTP ${resp.status}`;
}

export async function fetchNasaJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(getRequestUrl(url), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(await failureReason(resp));
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('incomplete or invalid JSON from NASA');
    }
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('NASA did not answer in time');
    if (err instanceof TypeError) {
      throw new Error(SUPABASE_URL ? 'could not reach the proxy (is it deployed?)' : 'could not reach NASA');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function readSnapshotJson(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`snapshot HTTP ${resp.status}`);
  return resp.json();
}

export function getSessionCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function setSessionCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

// Returns { data, status, fetchedAt, error? }. status is one of:
// live (this session's NASA response), cached (session cache hit), historical or
// snapshot (saved real NASA data after a failed live fetch), unavailable.
export async function fetchNasaSource({ cacheKey, url, parse, liveStatus = 'live', fallback, fallbackStatus = 'snapshot' }) {
  const cached = cacheKey && getSessionCache(cacheKey);
  if (cached) return { ...cached, status: 'cached' };

  try {
    const result = { data: parse(await fetchNasaJson(url)), status: liveStatus, fetchedAt: new Date().toISOString() };
    if (cacheKey) setSessionCache(cacheKey, result);
    return result;
  } catch (err) {
    const error = err.message;
    if (fallback) {
      try {
        return { data: await fallback(), status: fallbackStatus, fetchedAt: new Date().toISOString(), error };
      } catch {}
    }
    return { data: null, status: 'unavailable', fetchedAt: new Date().toISOString(), error };
  }
}
