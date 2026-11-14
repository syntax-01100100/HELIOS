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
    reason: 'Cardiovascular deconditioning occurs during long-duration spaceflight.',
    tags: ['cardiovascular', 'Inspiration4'],
    links: [
      { accession: 'OSD-259', title: 'Inspiration4 crew multi-omics', url: 'https://osdr.nasa.gov/bio/studies/osd-259/' },
      { accession: 'OSD-154', title: 'Multi-omics of Expedition 43-46 crew', url: 'https://osdr.nasa.gov/bio/studies/osd-154/' },
    ],
  },
  {
    alertType: 'SpO₂',
    reason: 'Oxygen saturation changes are studied in the context of suit atmosphere and hypoxia research.',
    tags: ['cardiovascular'],
    links: [
      { accession: 'OSD-154', title: 'Multi-omics of Expedition 43-46 crew', url: 'https://osdr.nasa.gov/bio/studies/osd-154/' },
    ],
  },
  {
    alertType: 'Temperature',
    reason: 'Thermal regulation in space is studied under suit and habitat thermal control research.',
    tags: ['cardiovascular'],
    links: [
      { accession: 'OSD-154', title: 'Multi-omics of Expedition 43-46 crew', url: 'https://osdr.nasa.gov/bio/studies/osd-154/' },
    ],
  },
  {
    alertType: 'Radiation',
    reason: 'Radiation exposure and its effects on astronaut health are a primary NASA HRP risk.',
    tags: ['cardiovascular', 'immune', 'bone'],
    links: [
      { accession: 'OSD-379', title: 'Spaceflight effects on immune cell function', url: 'https://osdr.nasa.gov/bio/studies/osd-379/' },
      { accession: 'OSD-232', title: 'Bone and muscle transcriptomics in spaceflight', url: 'https://osdr.nasa.gov/bio/studies/osd-232/' },
    ],
  },
  {
    alertType: 'Sleep / Inactivity',
    reason: 'Sleep and circadian disruption are well-documented in long-duration spaceflight.',
    tags: ['sleep'],
    links: [
      { accession: 'OSD-438', title: 'Sleep and circadian rhythm in long-duration spaceflight', url: 'https://osdr.nasa.gov/bio/studies/osd-438/' },
    ],
  },
];
