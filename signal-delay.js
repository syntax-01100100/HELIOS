const SPEED_OF_LIGHT_KM_S = 299792.458;

const DESTINATIONS = [
  {
    id: 'moon',
    label: 'Earth → Moon',
    distanceKm: 384400,
    description: 'Mean Earth–Moon distance. Apollo missions experienced about 1.3 seconds one-way delay.',
  },
  {
    id: 'mars-close',
    label: 'Earth → Mars (closest)',
    distanceKm: 54600000,
    description: 'Closest approach, about 54.6 million km. Roughly 3 minutes one way.',
  },
  {
    id: 'mars-far',
    label: 'Earth → Mars (farthest)',
    distanceKm: 401000000,
    description: 'Farthest approach, about 401 million km. Roughly 22 minutes one way.',
  },
];

export function getDestinations() {
  return DESTINATIONS;
}

export function oneWayDelaySeconds(distanceKm) {
  return distanceKm / SPEED_OF_LIGHT_KM_S;
}

export function roundTripDelaySeconds(distanceKm) {
  return (2 * distanceKm) / SPEED_OF_LIGHT_KM_S;
}

export function formatDelay(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
  return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}

export function interpolateDistance(sliderValue) {
  const min = DESTINATIONS[0].distanceKm;
  const max = DESTINATIONS[DESTINATIONS.length - 1].distanceKm;
  const t = Math.max(0, Math.min(1, sliderValue / 100));
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.pow(10, logMin + t * (logMax - logMin));
}

export function getNearestDestination(distanceKm) {
  let nearest = DESTINATIONS[0];
  let minDiff = Infinity;
  for (const d of DESTINATIONS) {
    const diff = Math.abs(d.distanceKm - distanceKm);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = d;
    }
  }
  return nearest;
}
