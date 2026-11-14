import { fetchNasaSource, readSnapshotJson } from './client.js';

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
  return `https://osdr.nasa.gov/osdr/data/search?q=${encodeURIComponent(query)}&size=20`;
}

function toStudy(hit) {
  const s = hit?._source || {};
  const accession = s.Accession || s['Study Identifier'];
  if (!accession) return null;
  const mission = typeof s.Mission === 'string' ? s.Mission : s.Mission?.Name;
  const organism = Array.isArray(s.organism) ? s.organism.join(', ') : s.organism;
  const assay = s['Study Assay Technology Type'];
  return {
    accession,
    title: s['Study Title'] || s['Project Title'] || accession,
    mission: mission || '',
    organism: organism || '',
    assay_types: assay ? [assay] : [],
    url: `https://osdr.nasa.gov/bio/repo/data/studies/${accession}`,
    tags: [],
  };
}

function parseOsdrHits(raw) {
  if (!Array.isArray(raw?.hits?.hits)) throw new Error('unexpected response shape');
  return raw.hits.hits.map(toStudy).filter(Boolean);
}

function filterSnapshot(snap, query) {
  const q = (query || '').toLowerCase();
  return (snap.studies || []).filter((s) => {
    if (!q) return true;
    const haystack = [s.title, s.mission, s.organism, ...(s.tags || []), ...(s.assay_types || [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function searchStudies(query) {
  const q = (query || '').trim();
  return fetchNasaSource({
    cacheKey: `helios_nasa_osdr:${q.toLowerCase()}`,
    url: buildOsdrSearchUrl(q),
    parse: (raw) => ({ studies: parseOsdrHits(raw) }),
    fallback: async () => ({ studies: filterSnapshot(await readSnapshotJson(SNAPSHOT_PATH), q) }),
    fallbackStatus: 'snapshot',
  });
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
