import { fetchRadlabWindow, findPeaks, findSAAEvents, getMaxDoseRate, getAvgDoseRate } from './radlab.js';
import { fetchDonkiData, hasMajorFlare, getLatestEvents } from './donki.js';
import { getPresets, searchStudies, ALERT_STUDY_LINKS } from './osdr.js';
import { HAZARDS } from './hazards.js';
import { getDestinations, oneWayDelaySeconds, roundTripDelaySeconds, formatDelay, interpolateDistance, getNearestDestination } from './signal-delay.js';
import { REFERENCES, NASA_DATA_FIELD_TEXT, buildProvenanceTable } from './provenance.js';
import { REFERENCE_RANGES, getStatus } from '../sim/reference.js';
import { raise } from '../sim/alerts.js';

const RAD_THRESHOLD = 50; // µGy/h, illustrative HELIOS demo threshold (not a NASA limit)
const REPLAY_START = '2022-03-01';
const REPLAY_END = '2022-03-02';
const STATUS_LABEL = { live: 'LIVE', cached: 'CACHED', historical: 'HISTORICAL', snapshot: 'SNAPSHOT', sample: 'SAMPLE', unavailable: 'OFFLINE', reference: 'REFERENCE' };
const STATUS_CLASS = { live: 'nasa-dot-live', cached: 'nasa-dot-live', historical: 'nasa-dot-hist', reference: 'nasa-dot-hist', snapshot: 'nasa-dot-snap', sample: 'nasa-dot-snap', unavailable: 'nasa-dot-off' };

let radChartCanvas = null;
let radResult = null;
let radReplayIdx = 0;
let radReplayTimer = null;
let donkiResult = null;
let osdrResult = null;
let provContainer = null;

function isoDay(offsetDays) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function badge(type) {
  const labels = { real: 'REAL NASA DATA', derived: 'DERIVED', simulated: 'SIMULATED' };
  const cls = type === 'real' ? 'nasa-badge-real' : type === 'derived' ? 'nasa-badge-derived' : 'nasa-badge-sim';
  return `<span class="nasa-badge ${cls}">${labels[type] || type}</span>`;
}

function statusDot(status) {
  return `<span class="nasa-dot ${STATUS_CLASS[status] || 'nasa-dot-off'}">${STATUS_LABEL[status] || 'OFFLINE'}</span>`;
}

function sourceLine(name, result) {
  const label = STATUS_LABEL[result?.status] || 'OFFLINE';
  const time = result?.fetchedAt ? new Date(result.fetchedAt).toLocaleString() : '—';
  let note = '';
  if (result?.error && result.status === 'live') {
    note = `<div class="nasa-err">Live (partial): ${esc(result.error)}</div>`;
  } else if (result?.error) {
    note = `<div class="nasa-err">Live fetch failed: ${esc(result.error)}</div>`;
  }
  return `<div class="nasa-source-label">Source: ${name} · ${label} · fetched ${time}</div>${note}`;
}

function refreshProvenance() {
  if (provContainer) renderProvenanceSection(provContainer);
}

async function loadRadiation() {
  const live = await fetchRadlabWindow(isoDay(-1), isoDay(0), 'live');
  if (live.data) return live;
  const replay = await fetchRadlabWindow(REPLAY_START, REPLAY_END, 'historical');
  return { ...replay, error: live.error };
}

function radPoints() {
  return radResult?.data?.data || [];
}

function renderRadiationChart() {
  if (!radChartCanvas) return;
  const ctx = radChartCanvas.getContext('2d');
  const w = radChartCanvas.width = radChartCanvas.offsetWidth * (devicePixelRatio || 1);
  const h = radChartCanvas.height = 180 * (devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  const points = radPoints();
  if (points.length === 0) {
    ctx.fillStyle = '#5D6580';
    ctx.font = '14px Roboto Condensed';
    ctx.textAlign = 'center';
    ctx.fillText('No radiation data available', w / 2, h / 2);
    return;
  }
  const rates = points.map(p => Number(p.absorbed_dose_rate));
  const maxR = Math.max(...rates, 0.1);
  const minR = Math.min(...rates, 0);
  const range = maxR - minR || 0.01;
  const pad = 40 * (devicePixelRatio || 1);
  const cw = w - pad * 2;
  const ch = h - pad * 2;
  const thresholdY = pad + ch - ((RAD_THRESHOLD - minR) / range) * ch;

  ctx.strokeStyle = 'rgba(232,154,18,.4)';
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(pad, thresholdY);
  ctx.lineTo(w - pad, thresholdY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#E89A12';
  ctx.font = '11px Chakra Petch';
  ctx.textAlign = 'left';
  ctx.fillText('demo advisory ' + RAD_THRESHOLD + ' µGy/h', pad + 4, thresholdY - 4);

  const visibleCount = radReplayIdx > 0 ? Math.min(radReplayIdx, points.length) : points.length;
  ctx.strokeStyle = '#19E3FF';
  ctx.lineWidth = 2 * (devicePixelRatio || 1);
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const x = pad + (i / (points.length - 1)) * cw;
    const y = pad + ch - ((rates[i] - minR) / range) * ch;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(25,227,255,.15)';
  ctx.lineTo(pad + ((visibleCount - 1) / (points.length - 1)) * cw, pad + ch);
  ctx.lineTo(pad, pad + ch);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < visibleCount; i++) {
    if (points[i].saa || rates[i] >= RAD_THRESHOLD) {
      const x = pad + (i / (points.length - 1)) * cw;
      const y = pad + ch - ((rates[i] - minR) / range) * ch;
      ctx.fillStyle = points[i].saa ? '#E89A12' : '#ff6b5e';
      ctx.beginPath();
      ctx.arc(x, y, 3 * (devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#5D6580';
  ctx.font = '10px Chakra Petch';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(points.length / 6));
  for (let i = 0; i < points.length; i += step) {
    const x = pad + (i / (points.length - 1)) * cw;
    const ts = points[i].timestamp || '';
    const hh = ts.split('T')[1] || ts.split(' ')[1] || '';
    ctx.fillText(hh.slice(0, 5), x, h - 8);
  }
  ctx.textAlign = 'right';
  ctx.fillText(maxR.toFixed(2), pad - 4, pad + 10);
  ctx.fillText(minR.toFixed(2), pad - 4, h - pad + 4);
}

function renderRadiationSection(container) {
  const windowLabel = radResult?.status === 'historical' || radResult?.status === 'snapshot'
    ? `replay of real readings for ${REPLAY_START}`
    : 'last 24 hours';
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('real')}
      <h3>ISS Radiation — NASA OSDR RadLab</h3>
      ${statusDot(radResult?.status || 'unavailable')}
    </div>
    <p class="nasa-desc">Absorbed dose rate from the ISS DosTel instrument, ${windowLabel}. If live readings are not available, the 2022-03-01 replay of real readings is shown and labelled. The advisory line is an illustrative HELIOS demo threshold, not a NASA limit.</p>
    <div class="nasa-rad-grid">
      <div class="nasa-rad-chart-wrap">
        <canvas id="nasa-rad-chart"></canvas>
      </div>
      <div class="nasa-rad-stats" id="nasa-rad-stats"></div>
    </div>
    <div class="nasa-rad-controls">
      <button class="xb" id="nasa-rad-replay" type="button">REPLAY 24H</button>
      <button class="xb" id="nasa-rad-refresh" type="button">REFETCH</button>
    </div>
    ${sourceLine('NASA OSDR RadLab', radResult)}
    <p class="nasa-disclaimer">Contains data from NASA. Not endorsed by NASA.</p>
  `;
  radChartCanvas = container.querySelector('#nasa-rad-chart');
  const statsEl = container.querySelector('#nasa-rad-stats');

  if (radPoints().length > 0) {
    const points = radPoints();
    const maxD = getMaxDoseRate(points);
    const avgD = getAvgDoseRate(points);
    const saaEvents = findSAAEvents(points);
    const peaks = findPeaks(points, RAD_THRESHOLD);
    statsEl.innerHTML = `
      <div class="nasa-stat"><b>${maxD ? Number(maxD.absorbed_dose_rate).toFixed(2) : '--'}</b><span>Max dose rate (µGy/h)</span></div>
      <div class="nasa-stat"><b>${avgD ? avgD.toFixed(2) : '--'}</b><span>Average (µGy/h)</span></div>
      <div class="nasa-stat"><b>${saaEvents.length}</b><span>SAA readings (5-min bins)</span></div>
      <div class="nasa-stat"><b>${peaks.length}</b><span>Peaks above threshold</span></div>
    `;

    if (radResult.status === 'live' || radResult.status === 'cached') {
      const highPeak = peaks.find((p) => Number(p.absorbed_dose_rate) >= RAD_THRESHOLD);
      if (highPeak) {
        raise('ADVISORY', 'rad', `ISS radiation: ${Number(highPeak.absorbed_dose_rate).toFixed(2)} µGy/h exceeds demo advisory threshold`, 'NASA');
      }
    }
  } else {
    statsEl.innerHTML = '<p class="nasa-err">Radiation data unavailable. NASA RadLab could not be reached and no saved copy is available.</p>';
  }

  renderRadiationChart();

  container.querySelector('#nasa-rad-replay').addEventListener('click', () => {
    if (radReplayTimer) { clearInterval(radReplayTimer); radReplayTimer = null; }
    radReplayIdx = 0;
    radReplayTimer = setInterval(() => {
      radReplayIdx++;
      renderRadiationChart();
      if (radReplayIdx >= radPoints().length) {
        clearInterval(radReplayTimer);
        radReplayTimer = null;
      }
    }, 200);
  });

  container.querySelector('#nasa-rad-refresh').addEventListener('click', async () => {
    radResult = await loadRadiation();
    radReplayIdx = 0;
    renderRadiationSection(container);
    refreshProvenance();
  });
}

function renderSpaceWeatherSection(container) {
  const d = donkiResult?.data;
  const events = d ? getLatestEvents(d) : [];
  const majorFlare = d ? hasMajorFlare(d.flares) : false;
  const isLive = donkiResult?.status === 'live' || donkiResult?.status === 'cached';
  const quiet = isLive && d?.flares?.length === 0 && d?.cmes?.length === 0;

  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('real')}
      <h3>Space Weather — NASA DONKI</h3>
      ${statusDot(donkiResult?.status || 'unavailable')}
    </div>
    <p class="nasa-desc">Solar flares, coronal mass ejections and space weather notifications from NASA's DONKI API (last 7 days).</p>
    <div class="nasa-sw-grid">
      <div class="nasa-sw-stat ${majorFlare ? 'nasa-sw-alert' : ''}">
        <b>${d?.flares?.length ?? '--'}</b>
        <span>Solar flares (7d)</span>
      </div>
      <div class="nasa-sw-stat">
        <b>${d?.cmes?.length ?? '--'}</b>
        <span>CMEs (7d)</span>
      </div>
      <div class="nasa-sw-stat ${majorFlare ? 'nasa-sw-alert' : ''}">
        <b>${majorFlare ? 'YES' : 'NO'}</b>
        <span>M/X class flare</span>
      </div>
    </div>
    <div class="nasa-sw-events" id="nasa-sw-events"></div>
    <div class="nasa-rad-controls">
      <button class="xb" id="nasa-sw-refresh" type="button">REFETCH</button>
    </div>
    ${sourceLine('NASA DONKI', donkiResult)}
    <p class="nasa-disclaimer">Contains data from NASA. Not endorsed by NASA.</p>
  `;

  const eventsEl = container.querySelector('#nasa-sw-events');
  if (quiet) {
    eventsEl.innerHTML = '<p class="nasa-desc">Live. No flares or CMEs in the last 7 days.</p>';
  } else if (events.length > 0) {
    eventsEl.innerHTML = events.map(e => {
      const sevCls = e.severity === 'X' ? 'nasa-flare-x' : e.severity === 'M' ? 'nasa-flare-m' : e.severity === 'C' ? 'nasa-flare-c' : '';
      const label = `<span class="nasa-event-type">${esc(e.type)}</span><span class="nasa-event-class">${esc(e.class)}</span><span class="nasa-event-time">${esc(e.time)}</span>`;
      const inner = e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener" class="nasa-event-link">${label}</a>` : label;
      return `<div class="nasa-event ${sevCls}">${inner}</div>`;
    }).join('');
  } else {
    eventsEl.innerHTML = '<p class="nasa-err">No space weather events available.</p>';
  }

  container.querySelector('#nasa-sw-refresh').addEventListener('click', async () => {
    donkiResult = await fetchDonkiData();
    renderSpaceWeatherSection(container);
    refreshProvenance();
  });

  if (majorFlare && isLive) {
    raise('ADVISORY', 'spaceweather', 'Major solar flare (M/X class) detected by NASA DONKI', 'NASA');
  }
}

function renderEvidenceSection(container) {
  const presets = getPresets();
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('real')}
      <h3>Evidence Panel — NASA OSDR Studies</h3>
    </div>
    <p class="nasa-desc">Search NASA's Open Science Data Repository for spaceflight omics studies. Preset chips cover key health topics.</p>
    <div class="nasa-presets" id="nasa-presets"></div>
    <div class="nasa-search-row">
      <input type="text" id="nasa-osdr-search" placeholder="Search studies (e.g. cardiovascular, Inspiration4)…">
      <button class="btn" id="nasa-osdr-go" type="button">SEARCH</button>
    </div>
    <div id="nasa-osdr-results" class="nasa-osdr-results"></div>
    <p class="nasa-disclaimer">Contains data from NASA. Not endorsed by NASA.</p>
  `;

  const presetsEl = container.querySelector('#nasa-presets');
  presetsEl.innerHTML = presets.map(p => `<button class="nasa-preset-chip" data-q="${esc(p.query)}">${esc(p.label)}</button>`).join('');

  const resultsEl = container.querySelector('#nasa-osdr-results');

  async function doSearch(query) {
    resultsEl.innerHTML = '<p class="nasa-loading">Searching NASA OSDR…</p>';
    osdrResult = await searchStudies(query);
    refreshProvenance();
    const studies = osdrResult.data?.studies || [];
    const source = sourceLine('NASA OSDR', osdrResult);
    if (osdrResult.status === 'unavailable') {
      resultsEl.innerHTML = `${source}<p class="nasa-err">NASA OSDR could not be reached.</p>`;
      return;
    }
    if (studies.length === 0) {
      resultsEl.innerHTML = `${source}<p class="nasa-err">No studies found for "${esc(query)}".</p>`;
      return;
    }
    resultsEl.innerHTML = source +
      `<p class="nasa-result-count">${studies.length} study/studies found</p>` +
      studies.map(s => `
        <div class="nasa-study-card">
          <div class="nasa-study-head">
            <a href="${esc(s.url)}" target="_blank" rel="noopener"><b>${esc(s.accession)}</b></a>
            ${s.mission ? `<span class="nasa-study-mission">${esc(s.mission)}</span>` : ''}
          </div>
          <h4>${esc(s.title)}</h4>
          <div class="nasa-study-meta">
            <span>Organism: ${esc(s.organism || '—')}</span>
            ${s.assay_types?.length ? `<span>Assays: ${esc(s.assay_types.join(', '))}</span>` : ''}
          </div>
          ${s.tags?.length ? `<div class="nasa-study-tags">${s.tags.map(t => `<span class="nasa-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      `).join('');
  }

  presetsEl.querySelectorAll('.nasa-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => doSearch(chip.dataset.q));
  });

  container.querySelector('#nasa-osdr-go').addEventListener('click', () => {
    const q = container.querySelector('#nasa-osdr-search').value.trim();
    doSearch(q);
  });

  container.querySelector('#nasa-osdr-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      doSearch(q);
    }
  });

  doSearch('Inspiration4');
}

function renderHazardMap(container) {
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('derived')}
      <h3>NASA HRP — Five Hazards of Human Spaceflight</h3>
    </div>
    <p class="nasa-desc">NASA's Human Research Program identifies five hazards. Each card shows how HELIOS addresses it and what data source powers that capability.</p>
    <div class="nasa-hazard-grid">
      ${HAZARDS.map(h => {
        const badgeType = h.badge === 'REAL NASA DATA' ? 'real' : h.badge === 'DERIVED' ? 'derived' : 'simulated';
        return `
        <div class="nasa-hazard-card" data-hazard="${h.id}">
          <div class="nasa-hazard-head">
            <h4>${h.title}</h4>
            ${badge(badgeType)}
          </div>
          <p>${h.description}</p>
          <div class="nasa-hazard-cap">
            <b>HELIOS capability:</b> ${h.heliosCapability}
          </div>
          <div class="nasa-hazard-tile">${h.dataTile}</div>
        </div>
      `}).join('')}
    </div>
    <p class="nasa-disclaimer">Contains data from NASA. Not endorsed by NASA.</p>
  `;
}

function renderSignalDelaySection(container) {
  const destinations = getDestinations();
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('derived')}
      <h3>Signal-Delay Calculator</h3>
    </div>
    <p class="nasa-desc">Drag the slider to see how communication delay grows from the Moon to Mars. HELIOS processes alerts on-device, so warnings appear in seconds regardless of distance.</p>
    <div class="nasa-sd-grid">
      <div class="nasa-sd-control">
        <label for="nasa-sd-slider">Distance (log scale: Moon → Mars farthest)</label>
        <input type="range" id="nasa-sd-slider" min="0" max="100" step="0.5" value="0">
        <div class="nasa-sd-readout" id="nasa-sd-readout"></div>
      </div>
      <div class="nasa-sd-destinations" id="nasa-sd-destinations"></div>
    </div>
    <p class="nasa-disclaimer">Derived from NASA reference distances. Not endorsed by NASA.</p>
  `;

  const slider = container.querySelector('#nasa-sd-slider');
  const readout = container.querySelector('#nasa-sd-readout');
  const destEl = container.querySelector('#nasa-sd-destinations');

  destEl.innerHTML = destinations.map(d => `
    <div class="nasa-sd-dest" data-id="${d.id}">
      <b>${d.label}</b>
      <span>${(d.distanceKm / 1e6).toFixed(1)}M km</span>
      <span>One-way: ${formatDelay(oneWayDelaySeconds(d.distanceKm))}</span>
      <span>Round-trip: ${formatDelay(roundTripDelaySeconds(d.distanceKm))}</span>
      <p>${d.description}</p>
    </div>
  `).join('');

  function updateSlider() {
    const val = parseFloat(slider.value);
    const dist = interpolateDistance(val);
    const ow = oneWayDelaySeconds(dist);
    const rt = roundTripDelaySeconds(dist);
    const nearest = getNearestDestination(dist);
    readout.innerHTML = `
      <div class="nasa-sd-distance"><b>${(dist / 1e6).toFixed(2)}M km</b></div>
      <div class="nasa-sd-delay"><span>One-way: <b>${formatDelay(ow)}</b></span><span>Round-trip: <b>${formatDelay(rt)}</b></span></div>
      <div class="nasa-sd-nearest">Nearest: ${nearest.label}</div>
    `;
    destEl.querySelectorAll('.nasa-sd-dest').forEach(el => {
      el.classList.toggle('nasa-sd-active', el.dataset.id === nearest.id);
    });
  }

  slider.addEventListener('input', updateSlider);
  updateSlider();
}

function renderProvenanceSection(container) {
  provContainer = container;
  const table = buildProvenanceTable({ radlab: radResult, donki: donkiResult, osdr: osdrResult });
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('real')}
      <h3>NASA Data &amp; Provenance</h3>
    </div>
    <p class="nasa-desc">Every NASA data source used by HELIOS, its purpose, fetch status and last-fetched timestamp.</p>
    <div class="nasa-prov-table">
      <table>
        <thead><tr><th>Source</th><th>Purpose</th><th>Status</th><th>Last fetched</th></tr></thead>
        <tbody>
          ${table.map(s => `
            <tr>
              <td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></td>
              <td>${esc(s.purpose)}</td>
              <td>${statusDot(s.status)}</td>
              <td>${s.fetchedAt ? new Date(s.fetchedAt).toLocaleString() : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <h4 class="nasa-ref-head">References</h4>
    <div class="nasa-refs">
      ${REFERENCES.map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener" class="nasa-ref-link">${esc(r.name)}</a>`).join('')}
    </div>
    <h4 class="nasa-ref-head">NASA Data Field (for Space Apps submission)</h4>
    <pre class="nasa-data-field">${esc(NASA_DATA_FIELD_TEXT)}</pre>
    <div class="nasa-badge-legend">
      <h4>Data badge legend</h4>
      <div class="nasa-badge-legend-items">
        ${badge('real')} <span>Live or historical data fetched directly from a NASA API</span>
        ${badge('derived')} <span>Calculated from NASA reference values (e.g. signal delay from distance)</span>
        ${badge('simulated')} <span>Simulated values, not from NASA data</span>
      </div>
    </div>
    <p class="nasa-disclaimer">Contains data from NASA. Not endorsed by NASA.</p>
  `;
}

function renderReferenceRangesSection(container) {
  const keys = Object.keys(REFERENCE_RANGES);
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('simulated')}
      <h3>Reference Ranges &amp; Threshold Sources</h3>
    </div>
    <p class="nasa-desc">Every threshold in HELIOS is labelled with its source. Since no public NASA wearable dataset defines fixed alarm limits, all ranges are marked as demo thresholds.</p>
    <div class="nasa-ref-range-grid">
      ${keys.map(k => {
        const r = REFERENCE_RANGES[k];
        return `
          <div class="nasa-ref-range-card">
            <h4>${r.label}</h4>
            <div class="nasa-ref-range-values">
              ${r.min != null ? `<span>Min: ${r.min}</span>` : ''}
              ${r.max != null ? `<span>Max: ${r.max}</span>` : ''}
              <span>Unit: ${r.unit}</span>
            </div>
            <div class="nasa-ref-thresholds">
              ${Object.entries(r.demoThreshold).map(([k2, v]) => `<span class="nasa-threshold nasa-th-${k2}">${k2}: ${v}</span>`).join('')}
            </div>
            <div class="nasa-ref-source"><b>Source:</b> ${r.source}</div>
            <p class="nasa-ref-note">${r.sourceNote}</p>
          </div>
        `;
      }).join('')}
    </div>
    <p class="nasa-disclaimer">Thresholds are demo values, not NASA mission standards.</p>
  `;
}

function renderNasaAlertLinks(container) {
  container.innerHTML = `
    <div class="nasa-section-head">
      ${badge('real')}
      <h3>NASA Evidence for Alerts</h3>
    </div>
    <p class="nasa-desc">When HELIOS raises an alert, it links to relevant NASA OSDR studies so the crew can review the evidence behind the warning.</p>
    <div class="nasa-alert-links">
      ${ALERT_STUDY_LINKS.map(a => `
        <div class="nasa-alert-link-card">
          <h4>${a.alertType}</h4>
          <p>${a.reason}</p>
          <div class="nasa-alert-link-studies">
            ${a.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener" class="nasa-study-link">${l.accession}: ${l.title}</a>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <p class="nasa-disclaimer">Contains data from NASA. Not endorsed by NASA.</p>
  `;
}

function setupNasaAlertListener() {
  window.addEventListener('helios:nasa-alert', (e) => {
    const detail = e.detail;
    if (!detail) return;
    const alertBox = document.querySelector('#abn');
    if (alertBox && !alertBox.hidden) {
      const sourceTag = document.createElement('span');
      sourceTag.className = 'nasa-alert-source-tag';
      sourceTag.textContent = 'NASA SOURCE';
      alertBox.appendChild(sourceTag);
    }
  });
}

function setupHudTiles() {
  const hudLeft = document.querySelector('#hud-left-vitals');
  if (!hudLeft) return;
  const radTile = document.createElement('div');
  radTile.className = 'hud-nasa-tile';
  radTile.id = 'hud-nasa-rad';
  radTile.innerHTML = `
    <div class="hud-sec">RADIATION · ISS DosTel</div>
    <div class="hud-row" id="hud-rad-val">— µGy/h</div>
    <div class="hud-row" id="hud-rad-status">OFFLINE</div>
  `;
  hudLeft.appendChild(radTile);

  const swTile = document.createElement('div');
  swTile.className = 'hud-nasa-tile';
  swTile.id = 'hud-nasa-sw';
  swTile.innerHTML = `
    <div class="hud-sec">SPACE WEATHER · DONKI</div>
    <div class="hud-row" id="hud-sw-val">—</div>
    <div class="hud-row" id="hud-sw-status">OFFLINE</div>
  `;
  hudLeft.appendChild(swTile);

  const toggleWrap = document.querySelector('#mv-panel-toggles');
  if (toggleWrap) {
    const radToggle = document.createElement('button');
    radToggle.type = 'button';
    radToggle.className = 'mv-ptoggle';
    radToggle.dataset.panel = 'nasa-rad';
    radToggle.title = 'Radiation';
    radToggle.textContent = 'R';
    radToggle.addEventListener('click', () => {
      radTile.classList.toggle('off');
      radToggle.classList.toggle('mvx-on');
    });
    toggleWrap.appendChild(radToggle);

    const swToggle = document.createElement('button');
    swToggle.type = 'button';
    swToggle.className = 'mv-ptoggle';
    swToggle.dataset.panel = 'nasa-sw';
    swToggle.title = 'Space Weather';
    swToggle.textContent = 'W';
    swToggle.addEventListener('click', () => {
      swTile.classList.toggle('off');
      swToggle.classList.toggle('mvx-on');
    });
    toggleWrap.appendChild(swToggle);
  }

  updateHudTiles();
}

function updateHudTiles() {
  const radValEl = document.querySelector('#hud-rad-val');
  const radStatEl = document.querySelector('#hud-rad-status');
  const swValEl = document.querySelector('#hud-sw-val');
  const swStatEl = document.querySelector('#hud-sw-status');

  if (radValEl && radResult?.data) {
    const maxD = getMaxDoseRate(radPoints());
    if (maxD) {
      const v = Number(maxD.absorbed_dose_rate);
      radValEl.textContent = v.toFixed(2) + ' µGy/h';
      const st = getStatus('radiation', v);
      radStatEl.textContent = STATUS_LABEL[radResult.status] || st.toUpperCase();
      radStatEl.className = 'hud-row hud-rad-' + st;
    }
  }

  if (swValEl && donkiResult?.data) {
    const flares = donkiResult.data.flares;
    if (!Array.isArray(flares)) {
      swValEl.textContent = '—';
      swStatEl.textContent = STATUS_LABEL[donkiResult.status] || 'OFFLINE';
      swStatEl.className = 'hud-row';
    } else {
      const major = hasMajorFlare(flares);
      swValEl.textContent = `${flares.length} flares, ${donkiResult.data.cmes?.length || 0} CMEs`;
      swStatEl.textContent = major ? 'MAJOR FLARE' : 'QUIET';
      swStatEl.className = 'hud-row hud-sw-' + (major ? 'alert' : 'nominal');
    }
  }
}

export async function initNasaUI() {
  const root = document.querySelector('#nasa-data-section');
  if (!root) return;

  root.innerHTML = `
    <div class="w">
      <p class="eyebrow"><span class="dot"></span><span>08 · NASA DATA INTEGRATION</span></p>
      <h2>Real NASA data in HELIOS.</h2>
      <p class="lead">HELIOS integrates live and historical data from NASA's Open Science Data Repository, DONKI space weather API and Human Research Program. Every value is badged by source.</p>
      <div class="nasa-disclaimer-banner">Contains data from NASA. Not endorsed by NASA.</div>
      <div id="nasa-rad-section" class="nasa-panel"></div>
      <div id="nasa-sw-section" class="nasa-panel"></div>
      <div id="nasa-evidence-section" class="nasa-panel"></div>
      <div id="nasa-hazard-section" class="nasa-panel"></div>
      <div id="nasa-signal-delay-section" class="nasa-panel"></div>
      <div id="nasa-alert-links-section" class="nasa-panel"></div>
      <div id="nasa-ref-ranges-section" class="nasa-panel"></div>
      <div id="nasa-provenance-section" class="nasa-panel"></div>
    </div>
  `;

  const radSection = root.querySelector('#nasa-rad-section');
  const swSection = root.querySelector('#nasa-sw-section');
  const evidenceSection = root.querySelector('#nasa-evidence-section');
  const hazardSection = root.querySelector('#nasa-hazard-section');
  const sdSection = root.querySelector('#nasa-signal-delay-section');
  const alertLinksSection = root.querySelector('#nasa-alert-links-section');
  const refRangesSection = root.querySelector('#nasa-ref-ranges-section');
  const provSection = root.querySelector('#nasa-provenance-section');

  radSection.innerHTML = '<p class="nasa-loading">Fetching NASA RadLab data…</p>';
  swSection.innerHTML = '<p class="nasa-loading">Fetching NASA DONKI space weather…</p>';

  radResult = await loadRadiation();
  renderRadiationSection(radSection);

  donkiResult = await fetchDonkiData();
  renderSpaceWeatherSection(swSection);

  renderEvidenceSection(evidenceSection);
  renderHazardMap(hazardSection);
  renderSignalDelaySection(sdSection);
  renderNasaAlertLinks(alertLinksSection);
  renderReferenceRangesSection(refRangesSection);
  renderProvenanceSection(provSection);

  setupNasaAlertListener();
  setupHudTiles();

  if (radReplayTimer) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) renderRadiationChart();
    }).observe(radChartCanvas);
  }
}
