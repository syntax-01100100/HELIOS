const TIMEOUT_MS = 8000;
const ALLOWED_PROXY_HOSTS = [
  'visualization.osdr.nasa.gov',
  'osdr.nasa.gov',
  'api.nasa.gov',
];

function needsProxy(url) {
  try {
    const u = new URL(url);
    return ALLOWED_PROXY_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

function getProxyUrl(url) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return url;
  return `${supabaseUrl}/functions/v1/nasa-proxy?url=${encodeURIComponent(url)}`;
}

export async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const targetUrl = needsProxy(url) ? getProxyUrl(url) : url;
  try {
    const resp = await fetch(targetUrl, {
      ...opts,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithSnapshot(url, snapshotPath, opts) {
  try {
    const data = await fetchWithTimeout(url, opts);
    return { data, status: 'live', fetchedAt: new Date().toISOString() };
  } catch (err) {
    try {
      const snapResp = await fetch(snapshotPath);
      if (snapResp.ok) {
        const snap = await snapResp.json();
        return { data: snap, status: 'snapshot', fetchedAt: new Date().toISOString(), error: err.message };
      }
    } catch {}
    return { data: null, status: 'unavailable', fetchedAt: new Date().toISOString(), error: err.message };
  }
}

export function getSessionCache(key, maxAgeMs) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

export const ALLOWED_HOSTS = ALLOWED_PROXY_HOSTS;
