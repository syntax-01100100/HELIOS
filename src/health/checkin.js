import { INDICATORS, EXTRA_INDICATORS, STATUS, evaluateAll, formatValue, statusOf, getEnvironment, delayNote } from './ranges.js';
import { guidanceFor, combinedAdvice } from './rules.js';
import { addCheckin, clearCheckins, dayKey, loadCheckins, loadEnvironment } from './store.js';
import { generateSensorReading } from './sensors.js';
import { t, getLang, translateIn } from '../shared/i18n.js';

const MMOL_TO_MGDL = 18.016;

const MOODS = [
  { value: 1, key: 'ci.moodVeryLow' },
  { value: 2, key: 'ci.moodLow' },
  { value: 3, key: 'ci.moodOkay' },
  { value: 4, key: 'ci.moodGood' },
  { value: 5, key: 'ci.moodGreat' },
];

const BOUNDS = {
  sys: { min: 70, max: 220 },
  dia: { min: 40, max: 140 },
  glucose: { min: 30, max: 400 },
  sleep: { min: 0, max: 16 },
};

const LONG_TERM_BOUNDS = {
  exercise: { min: 0, max: 300 },
  fatigue: { min: 1, max: 5 },
};

function formTemplate() {
  return `
    <form id="ci-form" class="ci-form" novalidate>
      <fieldset class="ci-block">
        <legend data-i18n="ci.auto">Auto (simulated helmet feed)</legend>
        <div class="ci-grid">
          <label class="field"><span data-i18n="ci.hr">Heart rate (BPM)</span><input name="hr" readonly></label>
          <label class="field"><span data-i18n="ci.spo2">SpO₂ (%)</span><input name="spo2" readonly></label>
          <label class="field"><span data-i18n="ci.temp">Skin temperature (°C)</span><input name="temp" readonly></label>
        </div>
        <button type="button" class="btn-ghost" id="ci-refresh" data-i18n="ci.newReading">Take a new reading</button>
      </fieldset>

      <fieldset class="ci-block">
        <legend data-i18n="ci.manual">Manual entry</legend>
        <div class="ci-grid">
          <div class="field">
            <label for="ci-sys" data-i18n="ci.sys">Top blood pressure number (mmHg)</label>
            <input id="ci-sys" name="sys" type="number" inputmode="numeric" step="1">
            <span class="field-err" data-err="sys"></span>
          </div>
          <div class="field">
            <label for="ci-dia" data-i18n="ci.dia">Bottom blood pressure number (mmHg)</label>
            <input id="ci-dia" name="dia" type="number" inputmode="numeric" step="1">
            <span class="field-err" data-err="dia"></span>
          </div>
          <div class="field">
            <span class="field-label" id="ci-glucose-label" data-i18n="ci.glucose">Blood glucose</span>
            <div class="unit-toggle" role="group" data-i18n-attr="aria-label|ci.glucoseUnit" aria-label="Glucose unit">
              <button type="button" data-unit="mgdl" aria-pressed="true">mg/dL</button>
              <button type="button" data-unit="mmol" aria-pressed="false">mmol/L</button>
            </div>
            <input id="ci-glucose" name="glucose" type="number" inputmode="numeric" step="1" aria-labelledby="ci-glucose-label">
            <span class="field-err" data-err="glucose"></span>
          </div>
          <div class="field">
            <label for="ci-sleep" data-i18n="ci.sleep">Hours of sleep last night</label>
            <input id="ci-sleep" name="sleep" type="number" inputmode="decimal" step="0.5">
            <span class="field-err" data-err="sleep"></span>
          </div>
        </div>
        <div class="field">
          <span class="field-label" id="ci-mood-label" data-i18n="ci.moodQ">How is your mood today?</span>
          <div class="mood-row" role="group" aria-labelledby="ci-mood-label">
            ${MOODS.map((m) => `<button type="button" data-mood="${m.value}" aria-pressed="false"><b>${m.value}</b><span data-i18n="${m.key}"></span></button>`).join('')}
          </div>
          <span class="field-err" data-err="mood"></span>
        </div>
      </fieldset>

      <fieldset class="ci-block">
        <legend data-i18n="ci.longTerm">Long-term health (optional)</legend>
        <p class="muted" data-i18n="ci.extraNote">Long-term readings are tracked for trends. They do not change your readiness score.</p>
        <div class="ci-grid">
          <div class="field">
            <label for="ci-exercise" data-i18n="ci.exercise">Resistance exercise today (minutes, 0 to 300)</label>
            <input id="ci-exercise" name="exercise" type="number" inputmode="numeric" min="0" max="300" step="1">
            <span class="field-err" data-err="exercise"></span>
          </div>
          <div class="field">
            <label for="ci-fatigue" data-i18n="ci.fatigue">Fatigue (1 = fresh, 5 = exhausted)</label>
            <input id="ci-fatigue" name="fatigue" type="number" inputmode="numeric" min="1" max="5" step="1">
            <span class="field-err" data-err="fatigue"></span>
          </div>
        </div>
      </fieldset>

      <p class="form-msg" id="ci-msg" role="status"></p>
      <div class="ci-actions">
        <button type="submit" class="btn-primary" data-i18n="ci.save">Save check-in</button>
        <button type="button" class="btn-ghost" id="ci-clear" data-i18n="ci.clear">Clear my data</button>
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
        <p class="ind-h">${t('ci.doNow')}</p>
        <ol>${guide.doNow.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p><b>${t('ci.prevent')}</b> ${guide.prevent}</p>
        <p><b>${t('ci.whenContact')}</b> ${guide.escalate}</p>
        <p class="muted">${t('ci.demoValue')}</p>
      </div>
    </details>`;
}

function longTermRows(values) {
  const rows = EXTRA_INDICATORS.filter((ind) => values[ind.key] !== undefined);
  if (rows.length === 0) return '';
  return `<ul class="bm-readings">${rows.map((ind) => {
    const status = statusOf(ind, values[ind.key]);
    return `<li><span>${ind.label}</span><b>${formatValue(ind, values[ind.key])}</b><span class="chip chip-${status}"><span aria-hidden="true">${STATUS[status].icon}</span> ${STATUS[status].label}</span></li>`;
  }).join('')}</ul>`;
}

function resultsTemplate(values, at) {
  const statuses = evaluateAll(values);
  const combos = combinedAdvice(values);
  const env = getEnvironment(loadEnvironment());
  const locale = getLang() === 'ar' ? 'ar-u-nu-latn' : undefined;
  const time = new Date(at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  return `
    <div class="results-head">
      <h2>${t('ci.results')}</h2>
      <p class="muted">${t('ci.checked', { time })}</p>
    </div>
    ${combos.map((c) => `
      <article class="combo">
        <h3>${c.title}</h3>
        <ol>${c.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p><b>${t('ci.flightSurgeon')}</b> ${c.escalate}</p>
      </article>`).join('')}
    <div class="ind-list">
      ${INDICATORS.map((ind) => indicatorRow(ind, values[ind.key], statuses[ind.key])).join('')}
    </div>
    ${longTermRows(values)}
    <div class="delay">
      <p><b>${t('ci.delayOneWay', { env: env.label })}</b> ${delayNote(env.id)}</p>
      ${env.delayLong ? `<p>${t('ci.marsNote')}</p>` : ''}
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
  let msgState = null;

  function setMsg(key, text) {
    msgState = key ? { key, text } : null;
    msg.textContent = key ? t(key) : text ?? '';
  }

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
    ['sys', 'dia', 'glucose', 'sleep', 'mood', 'exercise', 'fatigue'].forEach((n) => setError(n, ''));
    setMsg(null, '');
    let ok = true;
    for (const name of ['sys', 'dia', 'glucose', 'sleep']) {
      const raw = form.elements[name].value.trim();
      const v = name === 'glucose' && glucoseUnit === 'mmol' ? Number(raw) * MMOL_TO_MGDL : Number(raw);
      const b = BOUNDS[name];
      if (raw === '' || !Number.isFinite(v) || v < b.min || v > b.max) {
        const message = name === 'glucose' && glucoseUnit === 'mmol'
          ? t('ci.glucoseRangeErr')
          : t('ci.rangeErr', { min: b.min, max: b.max });
        setError(name, message);
        ok = false;
      }
    }
    if (mood === null) {
      setError('mood', t('ci.moodErr'));
      ok = false;
    }
    for (const name of ['exercise', 'fatigue']) {
      const raw = form.elements[name].value.trim();
      if (raw === '') continue;
      const b = LONG_TERM_BOUNDS[name];
      const v = Number(raw);
      if (!Number.isInteger(v) || v < b.min || v > b.max) {
        setError(name, name === 'exercise' ? t('ci.exerciseErr') : t('ci.fatigueErr'));
        ok = false;
      }
    }
    return ok;
  }

  function save() {
    if (!auto) {
      setMsg('ci.feedNotLoaded');
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
    if (form.elements.exercise.value.trim() !== '') values.exercise = Number(form.elements.exercise.value);
    if (form.elements.fatigue.value.trim() !== '') values.fatigue = Number(form.elements.fatigue.value);
    const now = new Date();
    const saved = addCheckin({ date: dayKey(now), at: now.toISOString(), values });
    if (!saved) {
      setMsg('ci.storageErr');
      return;
    }
    setMsg('ci.saved');
    results.innerHTML = resultsTemplate(values, now.toISOString());
    form.elements.sys.value = '';
    form.elements.dia.value = '';
    form.elements.glucose.value = '';
    form.elements.sleep.value = '';
    form.elements.exercise.value = '';
    form.elements.fatigue.value = '';
    setMood(null);
    onChange();
  }

  function refreshResults() {
    const latest = loadCheckins().at(-1);
    results.innerHTML = latest
      ? resultsTemplate(latest.values, latest.at)
      : `<p class="muted">${t('ci.empty')}</p>`;
  }

  root.querySelector('#ci-refresh').addEventListener('click', fillAuto);
  root.querySelectorAll('[data-unit]').forEach((btn) => btn.addEventListener('click', () => setUnit(btn.dataset.unit)));
  root.querySelectorAll('[data-mood]').forEach((btn) => btn.addEventListener('click', () => setMood(Number(btn.dataset.mood))));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  root.querySelector('#ci-clear').addEventListener('click', () => {
    if (!window.confirm(t('ci.confirmClear'))) return;
    clearCheckins();
    refreshResults();
    setMsg('ci.cleared');
    onChange();
  });

  window.addEventListener('helios:lang', () => {
    translateIn(root);
    if (msgState) msg.textContent = t(msgState.key);
    refreshResults();
  });

  fillAuto();
  refreshResults();
  return { refreshResults };
}
