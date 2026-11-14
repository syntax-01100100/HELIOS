const SNAPSHOT_PATH = '/data/osdr-studies.json';

const PRESETS = [
  { id: 'Inspiration4', query: 'Inspiration4', label: 'Inspiration4' },
  { id: 'cardiovascular', query: 'cardiovascular', label: 'Cardiovascular' },
  { id: 'sleep', query: 'sleep', label: 'Sleep' },
  { id: 'immune', query: 'immune', label: 'Immune' },
  { id: 'bone', query: 'bone', label: 'Bone' },
];

export function getPresets() {
  return PRESETS;
}

export function buildOsdrSearchUrl(query) {
  const base = 'https://osdr.nasa.gov/bio/api/search/';
  return `${base}?q=${encodeURIComponent(query)}&format=json`;
}

export function buildOsdrMetadataUrl(accession) {
  return `https://osdr.nasa.gov/bio/api/metadata/${accession}/?format=json`;
}

export async function searchStudies(query) {
  const url = buildOsdrSearchUrl(query);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return { data, status: 'live', fetchedAt: new Date().toISOString() };
  } catch (err) {
    return await loadSnapshotStudies(query);
  }
}

async function loadSnapshotStudies(query) {
  try {
    const resp = await fetch(SNAPSHOT_PATH);
    if (!resp.ok) throw new Error('snapshot unavailable');
    const snap = await resp.json();
    const q = (query || '').toLowerCase();
    const filtered = (snap.studies || []).filter((s) => {
      if (!q) return true;
      const haystack = [
        s.title,
        s.mission,
        s.organism,
        ...(s.tags || []),
        ...(s.assay_types || []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    return { data: { studies: filtered }, status: 'snapshot', fetchedAt: new Date().toISOString() };
  } catch (err) {
    return { data: null, status: 'unavailable', fetchedAt: new Date().toISOString(), error: err.message };
  }
}

export const ALERT_STUDY_LINKS = [
  {
    alertType: 'Heart Rate',
    reason: 'Inspiration4 crew serum cytokine arrays include cardiac markers. A starting point, not a heart-rate study.',
    tags: ['cardiovascular', 'Inspiration4'],
    links: [
      { accession: 'OSD-575', title: 'SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575' },
    ],
  },
  {
    alertType: 'SpO₂',
    reason: 'No verified OSDR study is linked yet. Search OSDR for oxygen and hypoxia research.',
    tags: [],
    links: [],
  },
  {
    alertType: 'Temperature',
    reason: 'No verified OSDR study is linked yet. Search OSDR for thermal regulation research.',
    tags: [],
    links: [],
  },
  {
    alertType: 'Radiation',
    reason: 'Radiation exposure is a primary NASA HRP risk. This Inspiration4 whole-blood study (genome sequencing, clonal hematopoiesis) is a genomics starting point, not a dosimetry study.',
    tags: ['Inspiration4', 'immune'],
    links: [
      { accession: 'OSD-569', title: 'Whole Blood Measurements from the SpaceX Inspiration4 Mission', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-569' },
    ],
  },
  {
    alertType: 'Sleep / Inactivity',
    reason: 'No verified OSDR study is linked yet. Search OSDR for sleep and circadian research.',
    tags: ['sleep'],
    links: [],
  },
];
