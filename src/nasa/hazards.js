export const HAZARDS = [
  {
    id: 'radiation',
    title: 'Radiation',
    description:
      'Beyond Earth\'s magnetic shield, astronauts are exposed to galactic cosmic rays and solar particle events, increasing cancer and degenerative disease risk.',
    heliosCapability: 'On-device radiation dose monitoring using NASA OSDR RadLab data; ADVISORY when dose rate exceeds a configurable demo threshold.',
    dataTile: 'RADIATION · ISS DosTel',
    badge: 'REAL NASA DATA',
  },
  {
    id: 'isolation',
    title: 'Isolation & Confinement',
    description:
      'Crews live and work in small spaces for months or years, with limited contact with Earth. Behavioral health and sleep are affected.',
    heliosCapability: 'Sleep and inactivity tracking, multimodal alerts, and Buddy Link crew-to-crew awareness.',
    dataTile: 'SIMULATED vitals + Buddy Link',
    badge: 'SIMULATED',
  },
  {
    id: 'distance',
    title: 'Distance from Earth',
    description:
      'At Mars, one-way communication delay can reach 22 minutes. Real-time medical consultation with Earth is not possible.',
    heliosCapability: 'On-device analysis and alerts process locally, so warnings appear in seconds regardless of signal delay.',
    dataTile: 'Signal-delay calculator (DERIVED)',
    badge: 'DERIVED',
  },
  {
    id: 'gravity',
    title: 'Altered Gravity Fields',
    description:
      'Microgravity causes bone density loss, muscle atrophy and cardiovascular deconditioning. Partial gravity on the Moon and Mars adds further unknowns.',
    heliosCapability: 'Heart rate, SpO₂ and temperature trending with personal baseline comparison flags deconditioning-related changes.',
    dataTile: 'SIMULATED vitals',
    badge: 'SIMULATED',
  },
  {
    id: 'hostile',
    title: 'Hostile / Closed Environments',
    description:
      'The suit is a closed life-support system. A suit leak, CO₂ buildup or thermal failure is immediately life-threatening.',
    heliosCapability: 'Suit telemetry display (O₂, pressure), CO₂ scenario simulation, and immediate multimodal alerts.',
    dataTile: 'SIMULATED suit telemetry',
    badge: 'SIMULATED',
  },
];
