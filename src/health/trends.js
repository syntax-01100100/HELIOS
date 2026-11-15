import { INDICATORS, EXTRA_INDICATORS, STATUS, formatValue, statusOf } from './ranges.js';
import { COLORS } from './common.js';
import { loadCheckins, saveCheckins } from './store.js';
import { analyzeDrift } from './drift.js';
import { buildSample } from './sample.js';
import { t, getLang, translateIn } from '../shared/i18n.js';

const RANGES = [7, 30];
const CHART_H = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 52 };
const DAY_MS = 86400000;
const LINE = '#3F51A8';
const METRICS = [...INDICATORS, ...EXTRA_INDICATORS];

function template() {
  return `
    <div class="tr-intro">
      <h2 data-i18n="trend.title">Trends</h2>
      <p class="muted" data-i18n="trend.intro">See how one reading moves over time. Green, amber and red bands show the demo ranges.</p>
    </div>
    <div class="tr-controls">
      <label class="field">
        <span data-i18n="trend.reading">Reading</span>
        <select id="tr-metric">${METRICS.map((ind) => `<option value="${ind.key}">${ind.label}</option>`).join('')}</select>
      </label>
      <div class="seg" role="group" data-i18n-attr="aria-label|trend.range" aria-label="Time range">
        ${RANGES.map((d, i) => `<button type="button" data-days="${d}" aria-pressed="${i === 0}">${t('trend.days', { d })}</button>`).join('')}
      </div>
    </div>
    <div class="tr-chart">
      <canvas id="tr-canvas" role="img"></canvas>
      <p class="tr-empty" id="tr-empty" hidden></p>
    </div>
    <p class="tr-summary" id="tr-summary" role="status"></p>
    <ul class="tr-key" aria-hidden="true">
      <li><span class="tr-swatch" style="background:${COLORS.green}"></span><span data-i18n="trend.key.ok">Within demo range</span></li>
      <li><span class="tr-swatch" style="background:${COLORS.amber}"></span><span data-i18n="trend.key.watch">Watch closely</span></li>
      <li><span class="tr-swatch" style="background:${COLORS.red}"></span><span data-i18n="trend.key.act">Act now</span></li>
    </ul>
    <section class="tr-drift" id="tr-drift" aria-live="polite"></section>
    <div class="tr-sample">
      <p class="muted" id="tr-sample-note"></p>
      <div class="tr-sample-actions">
        <button type="button" class="btn-ghost" id="tr-load" data-i18n="trend.loadSample">Load 14 days of sample data (SAMPLE)</button>
        <button type="button" class="btn-ghost" id="tr-remove" data-i18n="trend.removeSample" hidden>Remove sample data</button>
      </div>
    </div>`;
}

function driftAdviceHtml({ key, direction }) {
  return `<li class="drift-item">
      <h4>${t(`ind.${key}`)} · ${direction === 'up' ? '↑' : '↓'}</h4>
      <p>${t(`drift.${key}.${direction}`)}</p>
    </li>`;
}

function driftTemplate(checkins) {
  const { enoughData, flagged } = analyzeDrift(checkins);
  const disclaimer = `<p class="muted">${t('drift.limits')}</p>`;
  if (!enoughData) {
    return `<h3>${t('drift.title')}</h3><p class="muted">${t('drift.notEnough')}</p>${disclaimer}`;
  }
  if (flagged.length === 0) {
    return `<h3>${t('drift.none')}</h3><p class="muted">${t('drift.noneNote')}</p>${disclaimer}`;
  }
  return `<h3>${t('drift.title')}</h3>
    <p>${t('drift.intro')}</p>
    <ul class="drift-list">${flagged.map(driftAdviceHtml).join('')}</ul>
    ${disclaimer}`;
}

function pointsInRange(indicator, checkins, start, end) {
  return checkins
    .map((c) => ({ t: Date.parse(c.at), v: c.values?.[indicator.key] }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.t >= start && p.t <= end)
    .sort((a, b) => a.t - b.t);
}

function drawChart(canvas, indicator, points, days, now) {
  const cssW = canvas.clientWidth;
  if (cssW === 0) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(CHART_H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, CHART_H);

  const end = now.getTime();
  const start = end - days * DAY_MS;
  const plotW = cssW - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const values = points.map((p) => p.v);
  const dataLo = Math.min(indicator.amber[0], ...values);
  const dataHi = Math.max(indicator.amber[1], ...values);
  const pad = (dataHi - dataLo || 1) * 0.08;
  const lo = dataLo - pad;
  const hi = dataHi + pad;
  const yOf = (v) => PAD.top + ((hi - v) / (hi - lo)) * plotH;
  const xOf = (time) => PAD.left + ((time - start) / (end - start)) * plotW;

  ctx.fillStyle = 'rgba(217, 83, 79, 0.14)';
  ctx.fillRect(PAD.left, PAD.top, plotW, plotH);
  ctx.fillStyle = 'rgba(224, 160, 32, 0.26)';
  ctx.fillRect(PAD.left, yOf(indicator.amber[1]), plotW, yOf(indicator.amber[0]) - yOf(indicator.amber[1]));
  ctx.fillStyle = 'rgba(46, 158, 107, 0.26)';
  ctx.fillRect(PAD.left, yOf(indicator.green[1]), plotW, yOf(indicator.green[0]) - yOf(indicator.green[1]));

  const family = getComputedStyle(canvas).fontFamily;
  ctx.strokeStyle = '#DCCBAE';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#4F5673';
  ctx.font = `12px ${family}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i += 1) {
    const v = lo + ((hi - lo) * i) / 4;
    const y = yOf(v);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();
    ctx.fillText(v.toFixed(indicator.decimals), PAD.left - 8, y);
  }

  const locale = getLang() === 'ar' ? 'ar-u-nu-latn' : undefined;
  ctx.textBaseline = 'top';
  [0, 0.5, 1].forEach((f) => {
    const time = start + (end - start) * f;
    const label = new Date(time).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    ctx.textAlign = f === 0 ? 'left' : f === 1 ? 'right' : 'center';
    ctx.fillText(label, PAD.left + plotW * f, CHART_H - PAD.bottom + 10);
  });

  if (points.length > 1) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xOf(p.t);
      const y = yOf(p.v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(xOf(p.t), yOf(p.v), 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[statusOf(indicator, p.v)];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFBF3';
    ctx.stroke();
  });
}

export function mountTrends(rootElement) {
  rootElement.innerHTML = template();
  const metric = rootElement.querySelector('#tr-metric');
  const canvas = rootElement.querySelector('#tr-canvas');
  const emptyNote = rootElement.querySelector('#tr-empty');
  const summary = rootElement.querySelector('#tr-summary');
  const driftCard = rootElement.querySelector('#tr-drift');
  const sampleNote = rootElement.querySelector('#tr-sample-note');
  const removeBtn = rootElement.querySelector('#tr-remove');
  const rangeButtons = [...rootElement.querySelectorAll('[data-days]')];
  let days = RANGES[0];

  function refresh() {
    const now = new Date();
    const indicator = METRICS.find((ind) => ind.key === metric.value);
    const checkins = loadCheckins();
    const points = pointsInRange(indicator, checkins, now.getTime() - days * DAY_MS, now.getTime());
    const hasSample = checkins.some((c) => c.sample);

    drawChart(canvas, indicator, points, days, now);
    canvas.setAttribute('aria-label', t('trend.aria', { m: indicator.label, d: days, n: points.length }));

    emptyNote.hidden = points.length > 0;
    emptyNote.textContent = checkins.length === 0
      ? t('trend.noCheckins')
      : t('trend.noReadings', { m: indicator.label.toLowerCase(), d: days });

    const latest = points.at(-1);
    summary.textContent = latest
      ? t('trend.summary', {
        n: points.length,
        d: days,
        v: formatValue(indicator, latest.v),
        s: STATUS[statusOf(indicator, latest.v)].label.toLowerCase(),
      })
      : '';

    driftCard.innerHTML = driftTemplate(checkins);
    sampleNote.textContent = hasSample ? t('trend.sampleOn') : t('trend.sampleOff');
    removeBtn.hidden = !hasSample;
    rangeButtons.forEach((btn) => {
      btn.textContent = t('trend.days', { d: btn.dataset.days });
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.days) === days));
    });
  }

  metric.addEventListener('change', refresh);
  rangeButtons.forEach((btn) => btn.addEventListener('click', () => {
    days = Number(btn.dataset.days);
    refresh();
  }));
  rootElement.querySelector('#tr-load').addEventListener('click', () => {
    const kept = loadCheckins().filter((c) => !c.sample);
    saveCheckins([...kept, ...buildSample()]);
    refresh();
  });
  removeBtn.addEventListener('click', () => {
    saveCheckins(loadCheckins().filter((c) => !c.sample));
    refresh();
  });

  window.addEventListener('helios:lang', () => {
    translateIn(rootElement);
    metric.querySelectorAll('option').forEach((opt) => {
      opt.textContent = METRICS.find((ind) => ind.key === opt.value).label;
    });
    refresh();
  });

  new ResizeObserver(refresh).observe(canvas.parentElement);
  refresh();
  return { refresh };
}
