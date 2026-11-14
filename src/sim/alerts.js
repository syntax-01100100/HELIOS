const LEVELS = {
  ADVISORY: { label: 'ADVISORY', tones: [440, 550] },
  INFO: { label: 'INFORMATION', tones: [660] },
  CAUTION: { label: 'CAUTION', tones: [660, 660] },
  WARNING: { label: 'WARNING', tones: [880, 880, 880] },
  CRITICAL: { label: 'CRITICAL', tones: [1000, 700, 1000, 700] },
};

const banner = document.querySelector('#abn');
const logList = document.querySelector('#alog');
const vibration = document.querySelector('#vib');
const counter = document.querySelector('#malerts');

let audio = null;
let soundOn = false;
let volume = 0.5;
let count = 0;

export function setSound(on) {
  soundOn = on;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!on || !Ctx) return;
  audio = audio || new Ctx();
  if (audio.state === 'suspended') audio.resume();
}

export function setVolume(value) {
  volume = value;
}

function playTone(tones) {
  if (!soundOn || !audio) return;
  const base = audio.currentTime;
  tones.forEach((freq, i) => {
    const start = base + i * 0.2;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume * 0.25, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.14);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

function highlightCard(key) {
  const card = key && document.querySelector(`[data-card="${key}"]`);
  if (!card) return;
  card.classList.add('hl');
  setTimeout(() => card.classList.remove('hl'), 6000);
}

export function raise(levelKey, key, message, source) {
  const level = LEVELS[levelKey] || LEVELS.INFO;
  count += 1;
  counter.textContent = String(count);

  banner.hidden = false;
  banner.dataset.level = levelKey;
  const label = document.createElement('b');
  label.textContent = level.label;
  const text = document.createElement('span');
  text.textContent = message;
  banner.replaceChildren(label, text);

  const item = document.createElement('li');
  const srcTag = source === 'NASA' ? ' · NASA' : '';
  item.textContent = `${new Date().toLocaleTimeString()} · ${level.label} · ${message}${srcTag}`;
  logList.prepend(item);
  while (logList.children.length > 30) logList.lastChild.remove();

  vibration.hidden = false;
  setTimeout(() => {
    vibration.hidden = true;
  }, 2500);
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  playTone(level.tones);
  highlightCard(key);

  if (source === 'NASA') {
    window.dispatchEvent(new CustomEvent('helios:nasa-alert', { detail: { level: levelKey, key, message } }));
  }
}

export function replay() {
  const demo = [
    ['INFO', 'Demo: routine system update.'],
    ['CAUTION', 'Demo: unusual reading requires attention.'],
    ['WARNING', 'Demo: significant simulated abnormality.'],
    ['CRITICAL', 'Demo: simulated emergency scenario.'],
  ];
  demo.forEach(([level, message], i) => {
    setTimeout(() => raise(level, null, message), i * 1400);
  });
}
