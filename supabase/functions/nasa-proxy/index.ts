const ALLOWED_HOSTS = new Set([
  "visualization.osdr.nasa.gov",
  "osdr.nasa.gov",
  "api.nasa.gov",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 20000;
const RETRY_DELAY_MS = 500;
const USER_AGENT = "HELIOS-demo/1.0";
const CACHE_MAX_ENTRIES = 50;

type UpstreamResult =
  | { kind: "ok"; body: string; contentType: string }
  | { kind: "http"; status: number; retryAfter: string | null; snippet: string }
  | { kind: "timeout" }
  | { kind: "network"; message: string };

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

function withKey(target: URL): URL {
  const url = new URL(target.toString());
  if (url.hostname === "api.nasa.gov") {
    url.searchParams.delete("api_key");
    url.searchParams.set("api_key", Deno.env.get("NASA_API_KEY") || "DEMO_KEY");
  }
  return url;
}

async function fetchUpstreamOnce(target: URL): Promise<UpstreamResult> {
  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (upstream.ok) {
      return {
        kind: "ok",
        body: await upstream.text(),
        contentType: upstream.headers.get("Content-Type") || "application/json",
      };
    }
    const text = await upstream.text().catch(() => "");
    return {
      kind: "http",
      status: upstream.status,
      retryAfter: upstream.headers.get("Retry-After"),
      snippet: text.slice(0, 120),
    };
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") return { kind: "timeout" };
    return { kind: "network", message: (err as Error)?.message || "fetch failed" };
  }
}

function isRetryable(result: UpstreamResult): boolean {
  if (result.kind === "timeout") return true;
  return result.kind === "http" && result.status >= 500 && result.status <= 599;
}

async function fetchUpstream(target: URL): Promise<UpstreamResult> {
  const first = await fetchUpstreamOnce(target);
  if (!isRetryable(first)) return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return fetchUpstreamOnce(target);
}

function upstreamFailureResponse(result: UpstreamResult): Response {
  if (result.kind === "timeout") {
    return jsonResponse({ error: "NASA did not answer in time" }, 504);
  }
  if (result.kind === "http" && result.status === 429) {
    const headers: Record<string, string> = {};
    if (result.retryAfter) headers["Retry-After"] = result.retryAfter;
    return jsonResponse({ error: "NASA rate limit", upstreamStatus: 429 }, 429, headers);
  }
  if (result.kind === "http") {
    return jsonResponse(
      {
        error: `NASA returned ${result.status}`,
        upstreamStatus: result.status,
        snippet: result.snippet,
      },
      502,
    );
  }
  return jsonResponse({ error: "could not reach NASA" }, 502);
}

const _memCache = new Map<string, { body: string; contentType: string; expires: number }>();

function getCacheEntry(key: string) {
  return _memCache.get(key);
}

function setCacheEntry(key: string, body: string, contentType: string): void {
  _memCache.set(key, { body, contentType, expires: Date.now() + CACHE_TTL_MS });
  if (_memCache.size > CACHE_MAX_ENTRIES) {
    const oldest = _memCache.keys().next().value;
    if (oldest) _memCache.delete(oldest);
  }
}

const HEALTH_CHECKS = () => {
  const now = new Date();
  const day = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000).toISOString().slice(0, 10);
  const hourAgo = new Date(now.getTime() - 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hhmm = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return [
    {
      source: "DONKI notifications (last 1 day)",
      url: `https://api.nasa.gov/DONKI/notifications?startDate=${day(-1)}&endDate=${day(0)}`,
    },
    {
      source: "RadLab (last 1 hour)",
      url: `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel` +
        `&timestamp%3E%3D${day(0)}T${hhmm(hourAgo)}&timestamp%3C${day(0)}T${hhmm(now)}` +
        `&absorbed_dose_rate&format=json`,
    },
    {
      source: "OSDR search (sleep)",
      url: `https://osdr.nasa.gov/osdr/data/search?q=sleep&size=1`,
    },
  ];
};

async function runHealthCheck(): Promise<Response> {
  const results = [];
  for (const check of HEALTH_CHECKS()) {
    const started = Date.now();
    const result = await fetchUpstreamOnce(withKey(new URL(check.url)));
    results.push({
      source: check.source,
      ok: result.kind === "ok",
      status: result.kind === "ok" ? 200 : result.kind === "http" ? result.status : result.kind === "timeout" ? 504 : 502,
      ms: Date.now() - started,
    });
  }
  return jsonResponse(results, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (url.searchParams.get("health") === "1") {
      return await runHealthCheck();
    }

    const targetParam = url.searchParams.get("url");
    if (!targetParam) {
      return jsonResponse({ error: "Missing 'url' parameter" }, 400);
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(targetParam);
    } catch {
      return jsonResponse({ error: "Invalid URL" }, 400);
    }

    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return jsonResponse({ error: `Host ${targetUrl.hostname} is not allowlisted` }, 403);
    }

    if (targetUrl.hostname === "api.nasa.gov" && !targetUrl.pathname.startsWith("/DONKI/")) {
      return jsonResponse({ error: "Only /DONKI/ endpoints are allowed on api.nasa.gov" }, 403);
    }

    const cacheKey = `nasa-proxy:${targetParam}`;
    const entry = getCacheEntry(cacheKey);
    if (entry && entry.expires > Date.now()) {
      return new Response(entry.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": entry.contentType,
          "X-Cache": "HIT",
          "Cache-Control": `public, max-age=${CACHE_TTL_MS / 1000}`,
        },
      });
    }

    const result = await fetchUpstream(withKey(targetUrl));

    if (result.kind !== "ok") {
      if (entry) {
        return new Response(entry.body, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": entry.contentType,
            "X-Cache": "STALE",
          },
        });
      }
      return upstreamFailureResponse(result);
    }

    setCacheEntry(cacheKey, result.body, result.contentType);

    return new Response(result.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": result.contentType,
        "X-Cache": "MISS",
        "Cache-Control": `public, max-age=${CACHE_TTL_MS / 1000}`,
      },
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error)?.message || "internal error" }, 500);
  }
});
