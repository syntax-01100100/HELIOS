import { INDICATORS, STATUS, evaluateAll, formatValue, getEnvironment, delayNote } from './ranges.js';
import { guidanceFor, combinedAdvice } from './rules.js';
import { addCheckin, clearCheckins, dayKey, loadCheckins, loadEnvironment } from './store.js';
import { generateSensorReading } from './sensors.js';

const MMOL_TO_MGDL = 18.016;

const MOODS = [
  { value: 1, label: 'Very low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

const BOUNDS = {
  sys: { min: 70, max: 220 },
  dia: { min: 40, max: 140 },
  glucose: { min: 30, max: 400 },
  sleep: { min: 0, max: 16 },
};

function formTemplate() {
  return `
    <form id="ci-form" class="ci-form" novalidate>
      <fieldset class="ci-block">
        <legend>Auto (simulated helmet feed)</legend>
        <div class="ci-grid">
          <label class="field"><span>Heart rate (BPM)</span><input name="hr" readonly></label>
          <label class="field"><span>SpO₂ (%)</span><input name="spo2" readonly></label>
          <label class="field"><span>Skin temperature (°C)</span><input name="temp" readonly></label>
        </div>
        <button type="button" class="btn-ghost" id="ci-refresh">Take a new reading</button>
      </fieldset>

      <fieldset class="ci-block">
        <legend>Manual entry</legend>
        <div class="ci-grid">
          <div class="field">
            <label for="ci-sys">Top blood pressure number (mmHg)</label>
            <input id="ci-sys" name="sys" type="number" inputmode="numeric" step="1">
            <span class="field-err" data-err="sys"></span>
          </div>
          <div class="field">
            <label for="ci-dia">Bottom blood pressure number (mmHg)</label>
            <input id="ci-dia" name="dia" type="number" inputmode="numeric" step="1">
            <span class="field-err" data-err="dia"></span>
          </div>
          <div class="field">
            <span class="field-label" id="ci-glucose-label">Blood glucose</span>
            <div class="unit-toggle" role="group" aria-label="Glucose unit">
              <button type="button" data-unit="mgdl" aria-pressed="true">mg/dL</button>
              <button type="button" data-unit="mmol" aria-pressed="false">mmol/L</button>
            </div>
            <input id="ci-glucose" name="glucose" type="number" inputmode="numeric" step="1" aria-labelledby="ci-glucose-label">
            <span class="field-err" data-err="glucose"></span>
          </div>
          <div class="field">
            <label for="ci-sleep">Hours of sleep last night</label>
            <input id="ci-sleep" name="sleep" type="number" inputmode="decimal" step="0.5">
            <span class="field-err" data-err="sleep"></span>
          </div>
        </div>
        <div class="field">
          <span class="field-label" id="ci-mood-label">How is your mood today?</span>
          <div class="mood-row" role="group" aria-labelledby="ci-mood-label">
            ${MOODS.map((m) => `<button type="button" data-mood="${m.value}" aria-pressed="false"><b>${m.value}</b><span>${m.label}</span></button>`).join('')}
          </div>
          <span class="field-err" data-err="mood"></span>
        </div>
      </fieldset>

      <p class="form-msg" id="ci-msg" role="status"></p>
      <div class="ci-actions">
        <button type="submit" class="btn-primary">Save check-in</button>
        <button type="button" class="btn-ghost" id="ci-clear">Clear my data</button>
      </div>
    </form>
    <section class="results" id="ci-results" aria-live="polite"></section>
  `;
}

function indicatorRow(indicator, value, status) {
  const guide = guidanceFor(indicator.key, status);
  const st = STATUS[status];
  return `
    <details class="ind">
      <summary>
        <span class="chip chip-${status}"><span aria-hidden="true">${st.icon}</span> ${st.label}</span>
        <span class="ind-name">${indicator.label}</span>
        <b class="ind-val">${formatValue(indicator, value)}</b>
      </summary>
      <div class="ind-body">
        <p>${guide.meaning}</p>
        <p class="ind-h">What to do now</p>
        <ol>${guide.doNow.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p><b>How to prevent it:</b> ${guide.prevent}</p>
        <p><b>When to contact the flight surgeon:</b> ${guide.escalate}</p>
        <p class="muted">Demo value, not a NASA limit.</p>
      </div>
    </details>`;
}

function resultsTemplate(values, at) {
  const statuses = evaluateAll(values);
  const combos = combinedAdvice(values);
  const env = getEnvironment(loadEnvironment());
  const time = new Date(at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  return `
    <div class="results-head">
      <h2>Your results</h2>
      <p class="muted">Checked ${time}</p>
    </div>
    ${combos.map((c) => `
      <article class="combo">
        <h3>${c.title}</h3>
        <ol>${c.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p><b>Flight surgeon:</b> ${c.escalate}</p>
      </article>`).join('')}
    <div class="ind-list">
      ${INDICATORS.map((ind) => indicatorRow(ind, values[ind.key], statuses[ind.key])).join('')}
    </div>
    <div class="delay">
      <p><b>One-way signal delay (${env.label}):</b> ${delayNote(env.id)}</p>
      ${env.delayLong ? '<p>On Mars the crew acts on protocol first and reports when the link allows.</p>' : ''}
    </div>
  `;
}

export function mountCheckin(root, onChange) {
  root.innerHTML = formTemplate();
  const form = root.querySelector('#ci-form');
  const results = root.querySelector('#ci-results');
  const msg = root.querySelector('#ci-msg');
  let auto = null;
  let glucoseUnit = 'mgdl';
  let mood = null;

  function fillAuto() {
    auto = generateSensorReading();
    form.elements.hr.value = `${auto.hr}`;
    form.elements.spo2.value = `${auto.spo2}`;
    form.elements.temp.value = auto.temp.toFixed(1);
  }

  function setMood(value) {
    mood = value;
    root.querySelectorAll('[data-mood]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.mood) === value));
    });
  }

  function setUnit(unit) {
    if (unit === glucoseUnit) return;
    const v = Number(form.elements.glucose.value);
    if (form.elements.glucose.value !== '' && Number.isFinite(v)) {
      form.elements.glucose.value = unit === 'mmol'
        ? (v / MMOL_TO_MGDL).toFixed(1)
        : String(Math.round(v * MMOL_TO_MGDL));
    }
    glucoseUnit = unit;
    form.elements.glucose.step = unit === 'mmol' ? '0.1' : '1';
    root.querySelectorAll('[data-unit]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.unit === unit));
    });
  }

  function setError(name, text) {
    root.querySelector(`[data-err="${name}"]`).textContent = text;
    if (name !== 'mood') form.elements[name].setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  function validate() {
    ['sys', 'dia', 'glucose', 'sleep', 'mood'].forEach((n) => setError(n, ''));
    msg.textContent = '';
    let ok = true;
    for (const name of ['sys', 'dia', 'glucose', 'sleep']) {
      const raw = form.elements[name].value.trim();
      const v = name === 'glucose' && glucoseUnit === 'mmol' ? Number(raw) * MMOL_TO_MGDL : Number(raw);
      const b = BOUNDS[name];
      if (raw === '' || !Number.isFinite(v) || v < b.min || v > b.max) {
        const shown = name === 'glucose' && glucoseUnit === 'mmol' ? '1.7 and 22.2 mmol/L' : `${b.min} and ${b.max}`;
        setError(name, `Enter a value between ${shown}.`);
        ok = false;
      }
    }
    if (mood === null) {
      setError('mood', 'Choose how your mood feels today.');
      ok = false;
    }
    return ok;
  }

  function save() {
    if (!auto) {
      msg.textContent = 'The helmet feed has not loaded yet. Take a new reading.';
      return;
    }
    if (!validate()) return;
    const glucoseRaw = Number(form.elements.glucose.value);
    const values = {
      hr: auto.hr,
      spo2: auto.spo2,
      temp: auto.temp,
      sys: Number(form.elements.sys.value),
      dia: Number(form.elements.dia.value),
      glucose: Math.round(glucoseUnit === 'mmol' ? glucoseRaw * MMOL_TO_MGDL : glucoseRaw),
      sleep: Number(form.elements.sleep.value),
      mood,
    };
    const now = new Date();
    const saved = addCheckin({ date: dayKey(now), at: now.toISOString(), values });
    if (!saved) {
      msg.textContent = 'Could not save on this device. Your browser may be blocking storage.';
      return;
    }
    msg.textContent = 'Saved on this device.';
    results.innerHTML = resultsTemplate(values, now.toISOString());
    form.elements.sys.value = '';
    form.elements.dia.value = '';
    form.elements.glucose.value = '';
    form.elements.sleep.value = '';
    setMood(null);
    onChange();
  }

  function refreshResults() {
    const latest = loadCheckins().at(-1);
    results.innerHTML = latest
      ? resultsTemplate(latest.values, latest.at)
      : '<p class="muted">No check-in saved yet. Save one to see your results and guidance.</p>';
  }

  root.querySelector('#ci-refresh').addEventListener('click', fillAuto);
  root.querySelectorAll('[data-unit]').forEach((btn) => btn.addEventListener('click', () => setUnit(btn.dataset.unit)));
  root.querySelectorAll('[data-mood]').forEach((btn) => btn.addEventListener('click', () => setMood(Number(btn.dataset.mood))));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  root.querySelector('#ci-clear').addEventListener('click', () => {
    if (!window.confirm('Delete all check-ins saved on this device?')) return;
    clearCheckins();
    refreshResults();
    msg.textContent = 'Your check-in data was deleted from this device.';
    onChange();
  });

  fillAuto();
  refreshResults();
  return { refreshResults };
}
