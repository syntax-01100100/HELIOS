export const HAZARD_LABELS = {
  radiation: 'Radiation',
  isolation: 'Isolation and confinement',
  distance: 'Signal delay and distance',
  gravity: 'Gravity change',
  co2: 'Carbon dioxide build-up',
};

const HAZARD_TEXT = {
  radiation: 'Cosmic rays and solar particles pass through the spacecraft and body.',
  isolation: 'Small crew, closed spaces and time away from home disturb sleep and mood.',
  distance: 'Messages and medical advice take minutes to hours to arrive.',
  gravity: 'Without weight, fluids shift and bone and muscle slowly weaken.',
  co2: 'Stale cabin air raises carbon dioxide, which makes breathing and heart rate work harder.',
};

const NEAR_HAZARD_ORDER = ['radiation', 'isolation', 'gravity', 'co2', 'distance'];
const FAR_HAZARD_ORDER = ['distance', 'radiation', 'isolation', 'gravity', 'co2'];

export const PROCEDURE_STEP = 'Follow your mission medical procedures.';

export const GRAVITY = {
  station: 'Microgravity, close to zero g on the space station.',
  lunar: 'About 0.16 g on the Moon.',
  transit: 'Microgravity during the transit to Mars.',
  mars: 'About 0.38 g on Mars.',
};

export function hazardsFor(region, environmentId) {
  const far = environmentId === 'mars' || environmentId === 'transit';
  const order = far ? FAR_HAZARD_ORDER : NEAR_HAZARD_ORDER;
  return order
    .filter((key) => region.hazards.includes(key))
    .map((key) => ({ key, label: HAZARD_LABELS[key], text: HAZARD_TEXT[key] }));
}

export const REGIONS = [
  {
    id: 'brain',
    name: 'Brain and mind',
    links: ['mood', 'sleep'],
    hazards: ['radiation', 'isolation'],
    summary: 'Your brain sets your focus, decisions and mood. Sleep and mood show how well it is coping.',
    why: 'Poor sleep and low mood often come before mistakes on tasks, so we track both every day.',
    steps: [
      'Protect a regular sleep window of at least seven hours.',
      'Record your mood honestly in the daily check-in and tell a crewmate if it stays low.',
    ],
    escalate: 'Contact the flight surgeon if mood stays very low for more than two days, or if you have thoughts of harming yourself. For immediate danger, use the Emergency button.',
  },
  {
    id: 'heart',
    name: 'Heart and blood flow',
    links: ['hr', 'spo2', 'sys', 'dia'],
    hazards: ['gravity', 'radiation', 'co2'],
    summary: 'Your heart pumps blood to every organ. Heart rate, oxygen and blood pressure show how it is working.',
    why: 'Without gravity, fluid moves toward the head and can change blood pressure and heart rate, so these readings matter most in flight.',
    steps: [
      'Rest for five minutes, seated or lying down, if your heart rate feels high.',
      'Drink water and finish your daily exercise session.',
    ],
    escalate: 'Contact the flight surgeon for chest pain, fainting, or a resting heart rate or blood pressure that stays in the red range.',
  },
  {
    id: 'immune',
    name: 'Immune system and skin',
    links: ['temp'],
    hazards: ['isolation', 'radiation'],
    summary: 'Your immune system fights infection. Skin temperature is an early sign that it is working hard.',
    why: 'A rise in skin temperature can be the first sign of infection, and stress and sleep loss weaken immune defences.',
    steps: [
      'Note any fever, rash or wound that is hot, swollen or spreading.',
      'Keep cuts clean and covered, and wash your hands before eating.',
    ],
    escalate: 'Contact the flight surgeon if your skin temperature is outside the amber range, or a wound becomes red, hot or painful.',
  },
  {
    id: 'gut',
    name: 'Gut and metabolism',
    links: ['glucose'],
    hazards: ['radiation', 'distance'],
    summary: 'Your gut digests food and your body turns it into energy. Blood glucose shows how well that energy is balanced.',
    why: 'Blood glucose that runs too low or too high can cause shakiness, confusion or thirst, and you may need to act before advice arrives.',
    steps: [
      'Eat regular meals with fibre and fluids, and do not skip breakfast.',
      'Check glucose if you feel shaky, sweaty or unusually thirsty.',
    ],
    escalate: 'Contact the flight surgeon if glucose is below 60 or above 125 mg/dL, or if vomiting does not stop.',
  },
  {
    id: 'bones',
    name: 'Bones and muscle',
    links: [],
    hazards: ['gravity', 'radiation'],
    summary: 'Bones and muscles hold you up on Earth. In space they lose strength unless you train them.',
    why: 'No check-in reading is linked here yet. Daily resistance exercise is the main protection against bone and muscle loss.',
    steps: [
      'Complete your daily resistance exercise session.',
      'Eat enough protein and calcium-rich food.',
    ],
    escalate: 'Contact the flight surgeon at once after a fall, or for any bone pain or suspected fracture.',
  },
];
