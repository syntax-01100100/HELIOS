# HELIOS

HELIOS is a Vite web app that shows mission-style health and environment monitoring alongside live and historical NASA data.

## Going live

1. **Set the two Vite variables on your host** (Bolt, Netlify, Vercel, etc.):
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

   Without them the site still builds and runs. NASA calls go directly with the public `DEMO_KEY`, and Buddy Link shows a "not configured" message.
2. **Deploy the `nasa-proxy` edge function** (`supabase/functions/nasa-proxy`). It forwards NASA requests server-side so the NASA key never reaches the browser, and it caches responses in memory for 10 minutes. Check it at `?health=1` on the function URL.
3. **Set the `NASA_API_KEY` secret** on that function. Get a free key at https://api.nasa.gov. Without it the proxy uses `DEMO_KEY`, which is rate-limited.
4. **Buddy Link tables** are created by the migration in `supabase/migrations/`. The NASA proxy keeps responses in memory for 10 minutes and needs no database table.

### Data sources

| Source | Endpoint | Status when working | Shown as |
|---|---|---|---|
| ISS radiation (last 24 h) | `visualization.osdr.nasa.gov/radlab/api/` | Live | LIVE |
| ISS radiation replay (2022-03-01 to 03-02) | same endpoint | Live fetch of real readings | HISTORICAL |
| ISS radiation saved copy | `public/data/radlab-iss-dostel-2022-03-01.json` | Used when the live replay fails | SNAPSHOT |
| Space weather (7 days) | `api.nasa.gov/DONKI/` notifications, FLR, CME | Live | LIVE (or CACHED) |
| Space weather illustrative sample | `public/data/donki-snapshot.json` | Used when all DONKI feeds fail | SAMPLE |
| Omics study search | `osdr.nasa.gov/osdr/data/search?q=<query>&size=20` | Live | LIVE |
| Omics study fallback | `public/data/osdr-studies.json` | Used when the search fails | SNAPSHOT |
| Hazards, NASA-STD-3001, references | nasa.gov pages | Reference only | REFERENCE |

Badges are set per fetch: LIVE means this session got a successful NASA response, CACHED means a session cache hit, and OFFLINE means nothing could be shown.
