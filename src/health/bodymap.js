import { INDICATORS, STATUS, evaluateAll, formatValue } from './ranges.js';
import { COLORS, jset, loadLearned, LEARNED_KEY, norm, worst } from './common.js';
import { loadCheckins, loadEnvironment } from './store.js';
import { GRAVITY, PROCEDURE_STEP, REGIONS, hazardsFor } from './bodymap-content.js';

const INDICATOR_BY_KEY = Object.fromEntries(INDICATORS.map((ind) => [ind.key, ind]));

const SHAPES = {
  brain: '<circle cx="100" cy="38" r="26"/>',
  heart: '<circle cx="87" cy="112" r="13"/>',
  immune: '<path d="M68 86 L50 150 L42 200 L54 204 L62 156 L76 100 Z"/><path d="M132 86 L150 150 L158 200 L146 204 L138 156 L124 100 Z"/>',
  gut: '<path d="M77 146 L123 146 L121 178 L79 178 Z"/>',
  bones: '<path d="M70 178 L99 178 L96 300 L74 300 Z"/><path d="M101 178 L130 178 L126 300 L104 300 Z"/>',
};

const FIGURE = `
  <g class="bm-base" aria-hidden="true">
    <circle cx="100" cy="38" r="26"/>
    <rect x="91" y="60" width="18" height="16" rx="6"/>
    <path d="M68 80 Q100 70 132 80 L140 150 Q142 172 132 180 L68 180 Q58 172 60 150 Z"/>
    <path d="M68 86 L50 150 L42 200 L54 204 L62 156 L76 100 Z"/>
    <path d="M132 86 L150 150 L158 200 L146 204 L138 156 L124 100 Z"/>
    <path d="M70 178 L99 178 L96 300 L74 300 Z"/>
    <path d="M101 178 L130 178 L126 300 L104 300 Z"/>
  </g>`;

function figureMarkup() {
  const regions = REGIONS.map((r) => `
    <g class="bm-region" data-region="${r.id}" role="button" tabindex="0" aria-label="${r.name}">
      ${SHAPES[r.id]}
    </g>`).join('');
  return `
    <svg class="bm-figure" viewBox="0 0 200 320" role="group" aria-label="Front view of the body. Choose a region to learn about it." xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bm-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FBE3C8"/>
          <stop offset="1" stop-color="#EFC39A"/>
        </linearGradient>
        <filter id="bm-shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#1B2A4E" flood-opacity="0.22"/>
        </filter>
      </defs>
      <g filter="url(#bm-shadow)">${FIGURE}</g>
      ${regions}
    </svg>`;
}

function panelTemplate() {
  return `
    <div class="bm-intro">
      <h2>Body Map</h2>
      <p class="muted">Tap a body area to see what it does, your latest linked reading, and what to do. Colours come from your latest check-in.</p>
      <p class="bm-learned" id="bm-learned" role="status"></p>
    </div>
    <div class="bm-layout">
      <div class="bm-figure-card">${figureMarkup()}</div>
      <div class="bm-detail-card" id="bm-detail" aria-live="polite"></div>
    </div>`;
}

function readingsHtml(region, values, statuses) {
  if (region.links.length === 0) {
    return '<p class="muted">No check-in reading is linked to this area.</p>';
  }
  if (!values) {
    return '<p class="muted">No check-in yet. Save a check-in to link your readings here.</p>';
  }
  return `<ul class="bm-readings">${region.links.map((key) => {
    const ind = INDICATOR_BY_KEY[key];
    const s = statuses[key];
    return `<li><span>${ind.label}</span><b>${formatValue(ind, values[key])}</b><span class="chip chip-${s}"><span aria-hidden="true">${STATUS[s].icon}</span> ${STATUS[s].label}</span></li>`;
  }).join('')}</ul>`;
}

function detailHtml(region, ctx) {
  const status = ctx.regionStatus[region.id];
  const chip = status
    ? `<span class="chip chip-${status}"><span aria-hidden="true">${STATUS[status].icon}</span> ${STATUS[status].label}</span>`
    : '<span class="chip chip-none">No data yet</span>';
  const hazards = hazardsFor(region, ctx.environment);
  return `
    <header class="bm-detail-head">
      <h3>${region.name}</h3>
      ${chip}
    </header>
    <p>${region.summary}</p>
    <p class="bm-gravity"><b>Gravity:</b> ${GRAVITY[ctx.environment]}</p>
    ${readingsHtml(region, ctx.values, ctx.statuses)}
    <details class="bm-acc" open>
      <summary>NASA hazards for this area</summary>
      <ul class="bm-hazards">${hazards.map((h) => `<li><b>${h.label}.</b> ${h.text}</li>`).join('')}</ul>
    </details>
    <details class="bm-acc">
      <summary>Why we measure it</summary>
      <p>${region.why}</p>
    </details>
    <details class="bm-acc">
      <summary>What to do</summary>
      <ol>${[...region.steps, PROCEDURE_STEP].map((s) => `<li>${s}</li>`).join('')}</ol>
    </details>
    <details class="bm-acc">
      <summary>When to escalate</summary>
      <p>${region.escalate}</p>
    </details>`;
}

export function mountBodyMap(rootElement) {
  rootElement.innerHTML = panelTemplate();
  const detail = rootElement.querySelector('#bm-detail');
  const learnedNote = rootElement.querySelector('#bm-learned');
  const regionEls = new Map(
    REGIONS.map((r) => [r.id, rootElement.querySelector(`.bm-region[data-region="${r.id}"]`)]),
  );
  let selected = REGIONS[0].id;

  function computeContext() {
    const latest = loadCheckins().at(-1);
    const values = latest ? latest.values : null;
    const statuses = values ? evaluateAll(values) : {};
    const regionStatus = Object.fromEntries(REGIONS.map((r) => [
      r.id,
      values && r.links.length ? worst(r.links.map((k) => statuses[k])) : null,
    ]));
    return { values, statuses, regionStatus, environment: loadEnvironment() };
  }

  function paintRegions(ctx) {
    REGIONS.forEach((r) => {
      const el = regionEls.get(r.id);
      const status = norm(ctx.regionStatus[r.id]);
      const colour = COLORS[status ?? 'none'];
      el.style.color = colour;
      el.querySelectorAll('circle, path').forEach((shape) => {
        shape.setAttribute('fill', colour);
        shape.setAttribute('fill-opacity', status ? '0.72' : '0.5');
      });
      el.classList.toggle('is-lit', status === 'red' || status === 'amber');
      el.classList.toggle('is-selected', r.id === selected);
      el.setAttribute('aria-pressed', String(r.id === selected));
      el.setAttribute('aria-label', `${r.name}: ${status ? STATUS[status].label : 'no data yet'}`);
    });
  }

  function refresh() {
    const ctx = computeContext();
    paintRegions(ctx);
    const region = REGIONS.find((r) => r.id === selected);
    detail.innerHTML = detailHtml(region, ctx);
    const learned = new Set(loadLearned());
    const count = REGIONS.filter((r) => learned.has(r.id)).length;
    learnedNote.textContent = `Learned ${count} of ${REGIONS.length} regions`;
  }

  function select(id) {
    selected = id;
    const learned = new Set(loadLearned());
    if (!learned.has(id)) {
      learned.add(id);
      jset(LEARNED_KEY, [...learned]);
    }
    refresh();
  }

  REGIONS.forEach((r) => {
    const el = regionEls.get(r.id);
    el.addEventListener('click', () => select(r.id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(r.id);
      }
    });
  });

  refresh();
  return { refresh };
}
