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

const CACHE_TTL_SECONDS = 600;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetParam = url.searchParams.get("url");
    if (!targetParam) {
      return new Response(
        JSON.stringify({ error: "Missing 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(targetParam);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return new Response(
        JSON.stringify({ error: `Host ${targetUrl.hostname} is not allowlisted` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cacheKey = `nasa-proxy:${targetParam}`;
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": cached.contentType || "application/json",
          "X-Cache": "HIT",
          "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
    }

    const upstream = await fetch(targetUrl.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = upstream.headers.get("Content-Type") || "application/json";
    const body = await upstream.text();

    await setCachedResponse(cacheKey, body, contentType);

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "X-Cache": "MISS",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

const _memCache = new Map<string, { body: string; contentType: string; expires: number }>();

async function getCachedResponse(key: string): Promise<{ body: string; contentType: string } | null> {
  const entry = _memCache.get(key);
  if (entry && entry.expires > Date.now()) {
    return { body: entry.body, contentType: entry.contentType };
  }
  if (entry) _memCache.delete(key);
  return null;
}

async function setCachedResponse(key: string, body: string, contentType: string): Promise<void> {
  _memCache.set(key, {
    body,
    contentType,
    expires: Date.now() + CACHE_TTL_SECONDS * 1000,
  });
  if (_memCache.size > 50) {
    const oldest = _memCache.keys().next().value;
    if (oldest) _memCache.delete(oldest);
  }
}
