import { INDICATORS, STATUS, formatValue, statusOf } from './ranges.js';
import { COLORS } from './common.js';
import { dayKey, loadCheckins, saveCheckins } from './store.js';

const RANGES = [7, 30];
const SAMPLE_DAYS = 14;
const CHART_H = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 52 };
const DAY_MS = 86400000;
const LINE = '#3F51A8';

function buildSample(now = new Date()) {
  const entries = [];
  for (let i = SAMPLE_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(8, 0, 0, 0);
    const values = {
      hr: Math.round(68 + Math.sin(i * 0.9) * 6),
      spo2: Math.round(97 - Math.abs(Math.cos(i)) * 1.5),
      temp: Number((36.6 + Math.sin(i * 0.9) * 0.3).toFixed(1)),
      sys: Math.round(118 + Math.sin(i * 0.9) * 8),
      dia: Math.round(76 + Math.sin(i * 0.9) * 5),
      glucose: Math.round(92 + Math.cos(i * 0.7) * 8),
      sleep: Number((7.2 + Math.cos(i * 1.3) * 0.8).toFixed(1)),
      mood: Math.min(5, Math.max(1, Math.round(3.5 + Math.sin(i * 0.5) * 1.5))),
    };
    entries.push({ date: dayKey(d), at: d.toISOString(), sample: true, values });
  }
  return entries;
}

function template() {
  return `
    <div class="tr-intro">
      <h2>Trends</h2>
      <p class="muted">See how one reading moves over time. Green, amber and red bands show the demo ranges.</p>
    </div>
    <div class="tr-controls">
      <label class="field">
        <span>Reading</span>
        <select id="tr-metric">${INDICATORS.map((ind) => `<option value="${ind.key}">${ind.label}</option>`).join('')}</select>
      </label>
      <div class="seg" role="group" aria-label="Time range">
        ${RANGES.map((d, i) => `<button type="button" data-days="${d}" aria-pressed="${i === 0}">${d} days</button>`).join('')}
      </div>
    </div>
    <div class="tr-chart">
      <canvas id="tr-canvas" role="img"></canvas>
      <p class="tr-empty" id="tr-empty" hidden></p>
    </div>
    <p class="tr-summary" id="tr-summary" role="status"></p>
    <ul class="tr-key" aria-hidden="true">
      <li><span class="tr-swatch" style="background:${COLORS.green}"></span>Within demo range</li>
      <li><span class="tr-swatch" style="background:${COLORS.amber}"></span>Watch closely</li>
      <li><span class="tr-swatch" style="background:${COLORS.red}"></span>Act now</li>
    </ul>
    <div class="tr-sample">
      <p class="muted" id="tr-sample-note"></p>
      <div class="tr-sample-actions">
        <button type="button" class="btn-ghost" id="tr-load">Load 14 days of sample data (SAMPLE)</button>
        <button type="button" class="btn-ghost" id="tr-remove" hidden>Remove sample data</button>
      </div>
    </div>`;
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
  const xOf = (t) => PAD.left + ((t - start) / (end - start)) * plotW;

  ctx.fillStyle = 'rgba(217, 83, 79, 0.14)';
  ctx.fillRect(PAD.left, PAD.top, plotW, plotH);
  ctx.fillStyle = 'rgba(224, 160, 32, 0.26)';
  ctx.fillRect(PAD.left, yOf(indicator.amber[1]), plotW, yOf(indicator.amber[0]) - yOf(indicator.amber[1]));
  ctx.fillStyle = 'rgba(46, 158, 107, 0.26)';
  ctx.fillRect(PAD.left, yOf(indicator.green[1]), plotW, yOf(indicator.green[0]) - yOf(indicator.green[1]));

  ctx.strokeStyle = '#DCCBAE';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#4F5673';
  ctx.font = '12px system-ui, sans-serif';
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

  ctx.textBaseline = 'top';
  [0, 0.5, 1].forEach((f) => {
    const t = start + (end - start) * f;
    const label = new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
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
  const sampleNote = rootElement.querySelector('#tr-sample-note');
  const removeBtn = rootElement.querySelector('#tr-remove');
  const rangeButtons = [...rootElement.querySelectorAll('[data-days]')];
  let days = RANGES[0];

  function refresh() {
    const now = new Date();
    const indicator = INDICATORS.find((ind) => ind.key === metric.value);
    const checkins = loadCheckins();
    const points = pointsInRange(indicator, checkins, now.getTime() - days * DAY_MS, now.getTime());
    const hasSample = checkins.some((c) => c.sample);

    drawChart(canvas, indicator, points, days, now);
    canvas.setAttribute('aria-label', `${indicator.label} over the last ${days} days, ${points.length} readings`);

    emptyNote.hidden = points.length > 0;
    emptyNote.textContent = checkins.length === 0
      ? 'No check-ins saved yet. Save a check-in or load sample data to see a trend.'
      : `No ${indicator.label.toLowerCase()} readings in the last ${days} days.`;

    const latest = points.at(-1);
    summary.textContent = latest
      ? `${points.length} readings in the last ${days} days. Latest: ${formatValue(indicator, latest.v)}, ${STATUS[statusOf(indicator, latest.v)].label.toLowerCase()}.`
      : '';

    sampleNote.textContent = hasSample
      ? 'Sample readings are included in this chart. They are marked as sample data and do not reflect a real crew member.'
      : 'Sample data is for trying the chart. It is marked SAMPLE and can be removed at any time.';
    removeBtn.hidden = !hasSample;
    rangeButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(Number(btn.dataset.days) === days)));
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

  new ResizeObserver(refresh).observe(canvas.parentElement);
  refresh();
  return { refresh };
}
