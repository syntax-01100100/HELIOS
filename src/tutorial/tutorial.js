const STORE_KEY = 'helios_tour_seen_v1';

const STEPS = [
  {
    title: 'Welcome to HELIOS',
    text: 'HELIOS stands for Health Evaluation & Life Intelligence for Orbital Safety. It is a concept helmet system that watches an astronaut’s health and warns them within seconds. This quick tour shows what is on the page. It takes about a minute.',
    note: 'A concept prototype and software simulation. Not a medical device and not flight certified.',
  },
  {
    target: 'ov',
    title: '1 · What is HELIOS?',
    text: 'The system overview. Start here to see what HELIOS is and what it is made of.',
  },
  {
    target: 'diff',
    title: '2 · Why HELIOS',
    text: 'The problem it tackles: far from Earth, help and advice arrive late, and a crew may have no way to be evacuated. This section also compares HELIOS with existing suit and wearable monitoring, using public sources.',
  },
  {
    target: 'tile',
    title: '3 · Explore the module',
    text: 'Look around the HELIOS module itself and see how its parts fit together.',
  },
  {
    target: 'mv',
    title: '4 · First-person simulation',
    text: 'See the helmet view the way a crew member would. Readings stay hidden until you pick a demonstration profile, and no real fingerprint or personal data is used.',
  },
  {
    target: 'sim',
    title: '5 and 6 · Sensing to response, and the emergency scenario',
    text: 'Follow how a reading becomes a decision and a warning. Then watch an unusual physiological reading play out as an emergency scenario.',
  },
  {
    target: 'spec',
    title: '7 · How it works inside',
    text: 'The conceptual architecture, how a heartbeat becomes a warning, a battery runtime estimate and a mission in numbers. All figures here are design targets or illustrations, not test results.',
  },
  {
    target: 'join',
    title: 'Help for every crew member',
    text: 'Emergency assistance, plus Buddy Link, which connects crew members so one can help another when an alert is raised.',
  },
  {
    target: 'vision',
    title: 'Roadmap',
    text: 'Where HELIOS goes next. It is a roadmap, not a finished product: every phase adds real testing before the next begins.',
  },
  {
    target: 'nasa-data-section',
    title: 'NASA Data and Resources',
    text: 'The most important part for checking our sources. Every card has a badge: REAL means data fetched from a NASA API, DERIVED means calculated from NASA reference values. A status dot shows LIVE, HISTORICAL, SNAPSHOT (a saved copy of real data), SAMPLE (illustrative placeholder, not NASA data) or OFFLINE. The radiation chart replays real ISS readings from 2022-03-01, and the page ends with NASA and Canadian Space Agency resources.',
    note: 'Contains data from NASA. Not endorsed by NASA.',
  },
  {
    title: 'You are all set',
    text: 'Use the TOUR button at the bottom left to open this guide again at any time. Press Esc to close it whenever you like.',
  },
];

let root, card, backdrop, launcher, idx = 0, lastFocus = null;

function seen() {
  try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(STORE_KEY, '1'); } catch {}
}
function reduceMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function render() {
  const s = STEPS[idx];
  const last = idx === STEPS.length - 1;
  backdrop.classList.toggle('on', !s.target);
  card.innerHTML = `
    <div class="ht-top">
      <span class="ht-count">${idx + 1} / ${STEPS.length}</span>
      <button class="ht-x" type="button" data-act="close" aria-label="Close tour">×</button>
    </div>
    <h3 id="ht-title">${s.title}</h3>
    <p>${s.text}</p>
    ${s.note ? `<p class="ht-note">${s.note}</p>` : ''}
    <div class="ht-dots" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>
    <div class="ht-btns">
      <button class="xb" type="button" data-act="skip">${last ? '' : 'SKIP'}</button>
      <span class="ht-sp"></span>
      ${idx > 0 ? '<button class="xb" type="button" data-act="back">BACK</button>' : ''}
      <button class="xb ht-next" type="button" data-act="${last ? 'close' : 'next'}">${last ? 'FINISH' : idx === 0 ? 'START TOUR' : 'NEXT'}</button>
    </div>`;
  if (!last) card.querySelector('[data-act="skip"]').style.visibility = 'visible';
  else card.querySelector('[data-act="skip"]').style.display = 'none';
  const t = s.target && document.getElementById(s.target);
  if (t) t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  else if (idx === 0) window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  const primary = card.querySelector('.ht-next');
  if (primary) primary.focus({ preventScroll: true });
}

function open(startAt = 0) {
  idx = startAt;
  lastFocus = document.activeElement;
  root.hidden = false;
  launcher.hidden = true;
  render();
}

function close() {
  markSeen();
  root.hidden = true;
  launcher.hidden = false;
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch {} }
}

function onClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'next' && idx < STEPS.length - 1) { idx++; render(); }
  else if (a === 'back' && idx > 0) { idx--; render(); }
  else if (a === 'skip' || a === 'close') close();
}

function onKey(e) {
  if (root.hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight' && idx < STEPS.length - 1) { idx++; render(); }
  else if (e.key === 'ArrowLeft' && idx > 0) { idx--; render(); }
}

export function initTutorial() {
  if (document.getElementById('helios-tour')) return;

  root = document.createElement('div');
  root.id = 'helios-tour';
  root.hidden = true;
  root.innerHTML = '<div class="ht-backdrop"></div><div class="ht-card" role="dialog" aria-modal="false" aria-labelledby="ht-title"></div>';
  document.body.appendChild(root);
  backdrop = root.querySelector('.ht-backdrop');
  card = root.querySelector('.ht-card');
  card.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);

  launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.id = 'helios-tour-launch';
  launcher.textContent = '? TOUR';
  launcher.setAttribute('aria-label', 'Open website tour');
  launcher.addEventListener('click', () => open(0));
  document.body.appendChild(launcher);

  if (!seen()) {
    const start = () => setTimeout(() => open(0), 1200);
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
  }
}
