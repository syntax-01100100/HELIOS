export const PROVENANCE_SOURCES = [
  {
    name: 'NASA OSDR RadLab — ISS DosTel',
    url: 'https://visualization.osdr.nasa.gov/radlab/api/',
    purpose: 'ISS absorbed dose rate data for radiation monitoring tile and ground-track map',
    resultKey: 'radlab',
  },
  {
    name: 'NASA DONKI — Space Weather Notifications, Flares and CMEs',
    url: 'https://api.nasa.gov/DONKI/',
    purpose: 'Solar flares, CMEs and space weather events for the DONKI tile and advisory mapping',
    resultKey: 'donki',
  },
  {
    name: 'NASA OSDR — Open Science Data Repository',
    url: 'https://osdr.nasa.gov/osdr/data/search',
    purpose: 'Spaceflight omics studies for the evidence panel and alert-to-study links',
    resultKey: 'osdr',
  },
  {
    name: 'NASA Human Research Program — Hazards',
    url: 'https://www.nasa.gov/hrp/',
    purpose: 'Five hazards of human spaceflight mapped to HELIOS capabilities',
    resultKey: null,
  },
  {
    name: 'NASA-STD-3001 — Space Flight Human-System Standard',
    url: 'https://www.nasa.gov/reference/nasa-std-3001-volume-2/',
    purpose: 'Reference ranges and physiological limits context for thresholds',
    resultKey: null,
  },
  {
    name: 'NASA SUITS — Heads-Up Display Activity',
    url: 'https://www.nasa.gov/stem-content/spacesuits-heads-up-display-activity',
    purpose: 'Reference for helmet HUD concepts in education context',
    resultKey: null,
  },
  {
    name: 'NTRS — Mars Medical System Concept',
    url: 'https://ntrs.nasa.gov/api/citations/20170000500/downloads/20170000500.pdf',
    purpose: '22-minute communication delay and no-evacuation Mars mission context',
    resultKey: null,
  },
];

export const REFERENCES = [
  { name: 'NASA RadLab', url: 'https://visualization.osdr.nasa.gov/radlab/api/' },
  { name: 'NASA OSDR', url: 'https://osdr.nasa.gov' },
  { name: 'NASA DONKI', url: 'https://api.nasa.gov/DONKI/' },
  { name: 'NASA HRP', url: 'https://www.nasa.gov/hrp/' },
  { name: 'NASA-STD-3001', url: 'https://www.nasa.gov/reference/nasa-std-3001-volume-2/' },
  { name: 'NASA SUITS HUD activity', url: 'https://www.nasa.gov/stem-content/spacesuits-heads-up-display-activity' },
  { name: 'NTRS Mars medical report', url: 'https://ntrs.nasa.gov/api/citations/20170000500/downloads/20170000500.pdf' },
  { name: 'three.js', url: 'https://threejs.org' },
  { name: 'MediaPipe', url: 'https://developers.google.com/mediapipe' },
  { name: 'COCO-SSD', url: 'https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd' },
  { name: 'Supabase', url: 'https://supabase.com' },
];

export const NASA_DATA_FIELD_TEXT = `HELIOS uses the following NASA data sources:
1. NASA OSDR RadLab API (visualization.osdr.nasa.gov/radlab/api/) — ISS DosTel absorbed dose rate. Live readings for the last 24 hours; if unavailable, the real 2022-03-01 readings are replayed (5-minute averages).
2. NASA DONKI API (api.nasa.gov/DONKI/) — Space weather notifications, solar flares (FLR) and coronal mass ejections (CME) for the last 7 days. Live when reachable; otherwise clearly labeled illustrative sample entries are shown.
3. NASA OSDR search API (osdr.nasa.gov/osdr/data/search) — Spaceflight omics studies (Inspiration4, cardiovascular, sleep, immune, bone) for the evidence panel. Live search with a short curated fallback list.
4. NASA Human Research Program — Five hazards of human spaceflight mapped to HELIOS capabilities. Reference framework.
5. NASA-STD-3001 — Space Flight Human-System Standard for physiological limits context. Reference standard.
Contains data from NASA. Not endorsed by NASA. No NASA logos or branding used.`;

export function buildProvenanceTable(results) {
  return PROVENANCE_SOURCES.map((src) => {
    const result = src.resultKey ? results[src.resultKey] : null;
    return {
      name: src.name,
      url: src.url,
      purpose: src.purpose,
      status: result ? result.status : 'reference',
      fetchedAt: result?.fetchedAt || null,
    };
  });
}
