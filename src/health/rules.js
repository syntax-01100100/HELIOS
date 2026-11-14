const POINTS = { green: 100, amber: 60, red: 20 };

export function readinessScore(statuses) {
  const list = Object.values(statuses);
  if (list.length === 0) return null;
  return Math.round(list.reduce((sum, s) => sum + POINTS[s], 0) / list.length);
}

const GREEN_DETAIL = {
  doNow: ['No action needed for this reading. Keep your normal routine.'],
  escalate: 'Not needed for this reading.',
};

const GUIDANCE = {
  hr: {
    meaning: 'Heart rate shows how hard your heart is working. It rises with activity, heat, stress and suit or cabin conditions.',
    prevent: 'Warm up before EVA tasks, pace hard work, and keep to the fluid and rest schedule in your protocol.',
    amber: {
      doNow: ['Slow or stop the current activity and rest.', 'Check suit fit, cooling and cabin air.', 'Re-check after a few minutes of rest.'],
      escalate: 'If it stays out of range after rest, report it at your next flight surgeon contact.',
    },
    red: {
      doNow: ['Stop activity now and rest in a safe position.', 'Tell the crew now.', 'Follow your mission emergency protocol if you feel unwell.'],
      escalate: 'Contact the flight surgeon immediately.',
    },
  },
  spo2: {
    meaning: 'Blood oxygen saturation shows how well your blood carries oxygen. A suit leak, low gas supply or poor sensor contact can lower the reading.',
    prevent: 'Check your suit seal and gas supply before each EVA, and keep the sensor snug.',
    amber: {
      doNow: ['Check the suit seal and oxygen supply now.', 'Rest and breathe slowly.', 'Re-check after 5 minutes and reposition the sensor if needed.'],
      escalate: 'Report it at your next flight surgeon contact, sooner if it does not recover.',
    },
    red: {
      doNow: ['Check the suit seal and oxygen supply immediately and stop EVA work.', 'Tell the crew now.', 'Follow your mission emergency protocol.'],
      escalate: 'Contact the flight surgeon immediately.',
    },
  },
  temp: {
    meaning: 'Skin temperature reflects heat from your body and the suit cooling. Warm skin can mean overheating; cold skin can mean the suit is too cool.',
    prevent: 'Check suit cooling before and during tasks, and drink fluids on schedule.',
    amber: {
      doNow: ['Check suit cooling and reduce workload.', 'Drink fluids on your schedule.', 'Move to a cooler area if your protocol allows.'],
      escalate: 'Report it at your next flight surgeon contact if it does not return to range.',
    },
    red: {
      doNow: ['Stop activity and check suit cooling now.', 'Tell the crew now.', 'Follow your mission heat protocol.'],
      escalate: 'Contact the flight surgeon immediately.',
    },
  },
  sys: {
    meaning: 'The top blood pressure number is the pressure when the heart beats. Fluid shifts in space and stress can change it.',
    prevent: 'Rest between tasks, keep hydrated, and change position slowly.',
    amber: {
      doNow: ['Sit or lie down and rest for 10 minutes.', 'Drink fluids on your schedule.', 'Re-check when you have rested.'],
      escalate: 'Report it at your next flight surgeon contact.',
    },
    red: {
      doNow: ['Rest now and avoid exertion.', 'Tell the crew now.', 'Follow your mission medical protocol.'],
      escalate: 'Contact the flight surgeon immediately.',
    },
  },
  dia: {
    meaning: 'The bottom blood pressure number is the pressure between heartbeats. It is read together with the top number.',
    prevent: 'Rest between tasks, keep hydrated, and change position slowly.',
    amber: {
      doNow: ['Sit or lie down and rest for 10 minutes.', 'Drink fluids on your schedule.', 'Re-check when you have rested.'],
      escalate: 'Report it at your next flight surgeon contact.',
    },
    red: {
      doNow: ['Rest now and avoid exertion.', 'Tell the crew now.', 'Follow your mission medical protocol.'],
      escalate: 'Contact the flight surgeon immediately.',
    },
  },
  glucose: {
    meaning: 'Blood glucose is blood sugar, the fuel for muscles and the brain. Skipped meals or hard work can move it out of range.',
    prevent: 'Eat meals on schedule and plan food before demanding tasks.',
    amber: {
      doNow: ['Follow your mission nutrition protocol for a meal or snack.', 'Rest and re-check per protocol.'],
      escalate: 'Report it at your next flight surgeon contact.',
    },
    red: {
      doNow: ['Follow your mission protocol for out-of-range glucose right away. Do not self-treat with medication.', 'Tell the crew now.'],
      escalate: 'Contact the flight surgeon immediately.',
    },
  },
  sleep: {
    meaning: 'Sleep affects alertness, mood and performance. Shifted light and work schedules disrupt sleep in space.',
    prevent: 'Keep a fixed sleep window, dim the lights an hour before bed, and avoid heavy meals late.',
    amber: {
      doNow: ['Protect your next sleep window: dim the lights and keep quiet time.', 'Avoid stimulants late in the day, per protocol.'],
      escalate: 'Mention it at your next flight surgeon contact if it repeats for three nights.',
    },
    red: {
      doNow: ['Tell the crew you need a protected rest period.', 'Keep tasks light until you have rested.'],
      escalate: 'Contact the flight surgeon at the next contact, or sooner if you feel unsafe.',
    },
  },
  mood: {
    meaning: 'Mood reflects stress, isolation and workload. Low mood is common in confinement and is worth sharing early.',
    prevent: 'Keep daily contact with the crew and family, schedule breaks, and use your planned activities.',
    amber: {
      doNow: ['Talk with a crew member about how you feel.', 'Take a planned break or do an activity you enjoy.'],
      escalate: 'Share it at your next scheduled behavioral health contact.',
    },
    red: {
      doNow: ['Tell a crew member now. Do not stay alone with the feeling.', 'Follow your mission behavioral health protocol.'],
      escalate: 'Contact the flight surgeon or behavioral health support now.',
    },
  },
};

export function guidanceFor(key, status) {
  const entry = GUIDANCE[key];
  const detail = status === 'green' ? GREEN_DETAIL : entry[status];
  return { meaning: entry.meaning, prevent: entry.prevent, doNow: detail.doNow, escalate: detail.escalate };
}

const COMBINED = [
  {
    title: 'Fast pulse with low SpO₂',
    applies: (v) => v.hr > 100 && v.spo2 < 95,
    steps: ['Check your suit seal, gas supply and cabin air first.', 'Stop or slow activity and rest in a safe position.', 'Tell the crew now, and follow your mission emergency protocol if you feel unwell.'],
    escalate: 'Contact the flight surgeon immediately if the pattern does not settle.',
  },
  {
    title: 'Warm skin with a fast pulse',
    applies: (v) => v.temp > 37.5 && v.hr > 100,
    steps: ['Check suit cooling and reduce workload now.', 'Drink fluids on your protocol schedule.', 'Re-check heart rate and skin temperature after 10 minutes.'],
    escalate: 'Contact the flight surgeon if the values do not come back into range.',
  },
  {
    title: 'Short sleep with low mood',
    applies: (v) => v.sleep < 7 && v.mood <= 3,
    steps: ['Protect your next sleep window: dim the lights and keep your schedule.', 'Use daylight and routines from your circadian plan.', 'Talk with a crew member about how you feel today.'],
    escalate: 'Share this with the flight surgeon at the next scheduled contact.',
  },
];

export function combinedAdvice(values) {
  return COMBINED.filter((rule) => rule.applies(values));
}
