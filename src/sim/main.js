import { tick, snapshot, start, pause, reset, returnToNormal, onChange, currentHr, SCENARIO_LIST } from './engine.js';
import { setSound, setVolume, replay } from './alerts.js';
import { setBpmSource, togglePlay } from './ecg.js';
import { drawSpark } from './charts.js';

const q = (selector) => document.querySelector(selector);
const qa = (selector) => [...document.querySelectorAll(selector)];

const HUD_IDS = { hr: '#mhr', spo2: '#msp', temp: '#mtp', act: '#mac', o2: '#mo2', pr: '#mpr' };
const TREND_COLOR = '#19e3ff';
const STATUS = {
  hr: (v) => (v < 50 || v > 110 ? ['OUT OF RANGE', 'warn'] : ['NORMAL', 'ok']),
  spo2: (v) => (v < 95 ? ['LOW', 'warn'] : ['NORMAL', 'ok']),
  temp: (v) => (v > 37.5 || v < 35.5 ? ['OUT OF RANGE', 'warn'] : ['NORMAL', 'ok']),
};

function render() {
  const { cur, hist } = snapshot();
  const values = { hr: cur.hr, spo2: cur.spo2, temp: cur.temp.toFixed(1), act: cur.act, o2: cur.o2, pr: cur.pr.toFixed(1) };
  Object.entries(HUD_IDS).forEach(([key, selector]) => {
    q(selector).textContent = values[key];
  });
  qa('[data-k]').forEach((el) => {
    el.textContent = values[el.dataset.k];
  });
  q('#ecgbpm').textContent = cur.hr;
  for (const key of ['hr', 'spo2', 'temp']) {
    const [label, tone] = STATUS[key](cur[key]);
    qa(`[data-st="${key}"]`).forEach((el) => {
      el.textContent = label;
      el.className = tone === 'ok' ? 'st-ok' : 'st-warn';
    });
    qa(`[data-trend="${key}"]`).forEach((canvas) => drawSpark(canvas, hist[key], TREND_COLOR));
  }
}

const stat = q('#sstat');
const desc = q('#sdesc');
let selected = null;

qa('[data-s]').forEach((button) => {
  button.onclick = () => {
    selected = button.dataset.s;
    qa('[data-s]').forEach((b) => b.classList.toggle('on', b === button));
    desc.textContent = SCENARIO_LIST.find((s) => s.key === selected).desc;
  };
});

q('#sst').onclick = () => {
  if (!start(selected)) stat.textContent = 'Choose a scenario first.';
};
q('#spz').onclick = pause;
q('#srs').onclick = reset;
q('#snorm').onclick = () => {
  selected = null;
  qa('[data-s]').forEach((b) => b.classList.remove('on'));
  desc.textContent = 'Choose a scenario to see what it demonstrates.';
  returnToNormal();
};

onChange((s) => {
  if (!s.active) stat.textContent = 'Monitoring normal. No scenario running.';
  else if (s.running) stat.textContent = `Running: ${s.name} · ${s.elapsed}s of ${s.dur}s`;
  else if (s.elapsed >= s.dur) stat.textContent = `${s.name}: complete. Press Reset to replay.`;
  else if (s.elapsed === 0) stat.textContent = `Ready: ${s.name}. Press Start.`;
  else stat.textContent = `Paused: ${s.name} at ${s.elapsed}s.`;
});

const ecgPause = q('#ecgp');
ecgPause.onclick = () => {
  ecgPause.textContent = togglePlay() ? 'PAUSE' : 'RESUME';
};
q('#ecgf').onclick = () => q('#ecgbox').requestFullscreen?.();

const sound = q('#snd');
sound.onclick = () => {
  const on = sound.textContent === 'SOUND OFF';
  setSound(on);
  sound.textContent = on ? 'SOUND ON' : 'SOUND OFF';
};
q('#vol').oninput = (e) => setVolume(parseFloat(e.target.value));
q('#rpl').onclick = replay;

setBpmSource(currentHr);
tick();
render();
setInterval(() => {
  tick();
  render();
}, 1000);
