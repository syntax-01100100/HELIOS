import { snapshot, currentHr } from '../sim/engine.js';

const q = (s) => document.querySelector(s);

const video = q('#mvv');

let ecgLeftCanvas = null;
let ecgLeftCtx = null;
let ecgBottomCanvas = null;
let ecgBottomCtx = null;
let ecgTime = 0;
let ecgLastFrame = performance.now();
let hudRaf = 0;
let onScreen = false;
let currentMode = 'cam';
let hwValues = { hr: '--', spo2: '--', temp: '--' };
let hwConnected = false;
let detectionData = { count: 0, people: 0, objects: 0, poses: 0, hands: 0, tracks: [], selected: null, fps: 0, models: { object: false, pose: false, hand: false } };
let sceneText = '';
let alertText = '';
let alertLevel = '';
let missionStartTime = Date.now();
let events = [];
let ecgCollapsed = false;
let crewProfile = null;

const ECG_SAMPLES = 120;
const ecgHistory = new Array(ECG_SAMPLES).fill(0.5);

function pushEvent(text) {
  events.unshift({ text, time: new Date().toLocaleTimeString() });
  if (events.length > 4) events.pop();
}

function makeEcgCanvas() {
  const c = document.createElement('canvas');
  c.style.cssText = 'display:block;width:100%;height:100%';
  c.width = 200;
  c.height = 40;
  return c;
}

function ensureEcgCanvases() {
  if (!ecgLeftCanvas) {
    ecgLeftCanvas = makeEcgCanvas();
    ecgLeftCtx = ecgLeftCanvas.getContext('2d');
  }
  if (!ecgBottomCanvas) {
    ecgBottomCanvas = makeEcgCanvas();
    ecgBottomCtx = ecgBottomCanvas.getContext('2d');
  }
}

function gauss(x, mean, sigma) {
  return Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma));
}

function beatShape(phase) {
  return (
    0.12 * gauss(phase, 0.16, 0.03) -
    0.12 * gauss(phase, 0.235, 0.012) +
    gauss(phase, 0.26, 0.011) -
    0.25 * gauss(phase, 0.285, 0.012) +
    0.28 * gauss(phase, 0.42, 0.05)
  );
}

function drawEcgOn(ctx, w, h) {
  const now = performance.now();
  const dt = (now - ecgLastFrame) / 1000;
  if (ctx === ecgLeftCtx) ecgTime += dt;
  ecgLastFrame = now;

  const bpm = currentHr();
  const cyclesPerSec = bpm / 60;
  const phase = (((ecgTime * cyclesPerSec) % 1) + 1) % 1;
  const val = 0.55 - beatShape(phase) * 0.4;
  ecgHistory.push(val);
  if (ecgHistory.length > ECG_SAMPLES) ecgHistory.shift();

  ctx.fillStyle = 'rgba(6,16,31,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(25,227,255,0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += w / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.strokeStyle = '#19e3ff';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < ecgHistory.length; i++) {
    const x = (i / (ECG_SAMPLES - 1)) * w;
    const y = ecgHistory[i] * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawMiniEcg() {
  ensureEcgCanvases();
  if (ecgLeftCtx) drawEcgOn(ecgLeftCtx, ecgLeftCanvas.width, ecgLeftCanvas.height);
  if (ecgBottomCtx) drawEcgOn(ecgBottomCtx, ecgBottomCanvas.width, ecgBottomCanvas.height);
}

function fmtTime() {
  const s = Math.floor((Date.now() - missionStartTime) / 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

function updateOverlays() {
  const snap = snapshot();
  const cur = snap.cur;

  const isHw = currentMode === 'hw';
  const profile = crewProfile;
  const hrVal = isHw ? (hwConnected ? hwValues.hr : '--') : (profile?.current.hr ?? cur.hr);
  const spo2Val = isHw ? (hwConnected ? hwValues.spo2 : '--') : (profile?.current.spo2 ?? cur.spo2);
  const tempVal = isHw ? (hwConnected ? hwValues.temp : '--') : (profile?.current.temp?.toFixed(1) ?? cur.temp.toFixed(1));
  const baseline = profile?.baseline || { hr: 72, spo2: 98, temp: 36.6 };
  const dataLabel = isHw ? (hwConnected ? 'SENSOR' : 'NO SENSOR') : 'SIMULATED';
  const ecgLabel = isHw ? (hwConnected ? 'SENSOR ECG' : 'NO ECG') : 'SIM ECG';

  const tl = q('#hud-top-left');
  if (tl) {
    tl.innerHTML = `<span class="hud-sys">HELIOS</span><span class="hud-mission">${cur.comm ? 'NOMINAL' : 'COMMS LOSS'}</span><span class="hud-time">${fmtTime()}</span><span class="hud-auth">${crewProfile ? 'AUTH:' + crewProfile.callsign : 'NO AUTH'}</span>`;
  }

  const tr = q('#hud-top-right');
  if (tr) {
    const aiStatus = detectionData.count > 0
      ? `${detectionData.people}P ${detectionData.objects}O · ${detectionData.fps}fps`
      : (detectionData.fps > 0 ? `SCAN · ${detectionData.fps}fps` : 'AI OFF');
    const modelBits = [];
    if (detectionData.models.object) modelBits.push('OBJ');
    if (detectionData.models.pose) modelBits.push('POSE');
    if (detectionData.models.hand) modelBits.push('HAND');
    tr.innerHTML = `<span class="hud-ai">AI: ${aiStatus}</span><span class="hud-cam">${video.videoWidth || 0}x${video.videoHeight || 0} · ${modelBits.join('+') || 'STANDBY'}</span>`;
  }

  const lv = q('#hud-left-vitals');
  if (lv) {
    lv.innerHTML = `<div class="hud-sec">VITAL SIGNS <span class="hud-tag">${dataLabel}</span></div>
      <div class="hud-row"><span>HR</span><b>${hrVal}</b><i>BPM</i><small class="hud-base">Δ ${profile && Number.isFinite(Number(hrVal)) ? Math.round(Number(hrVal) - baseline.hr) : '--'}</small></div>
      <div class="hud-row"><span>SpO₂</span><b>${spo2Val}</b><i>%</i><small class="hud-base">base ${profile ? baseline.spo2 : '--'}</small></div>
      <div class="hud-row"><span>SKIN</span><b>${tempVal}</b><i>°C</i><small class="hud-base">base ${profile ? baseline.temp.toFixed(1) : '--'}</small></div>
      <div class="hud-row"><span>ACT</span><b>${cur.act}</b></div>
      <div class="hud-ecg" id="hud-ecg-left"></div>
      <div class="hud-row" style="font-size:7px;color:#8EA3D8">${ecgLabel}</div>
      <div class="hud-row"><span>LINK</span><b class="hud-link">${isHw ? (hwConnected ? 'CONN' : 'OFFLINE') : 'SIM'}</b></div>`;
    const wrap = q('#hud-ecg-left');
    if (wrap && ecgLeftCanvas && ecgLeftCanvas.parentElement !== wrap) {
      wrap.appendChild(ecgLeftCanvas);
    }
  }

  const rv = q('#hud-right-env');
  if (rv) {
    const sel = detectionData.selected;
    rv.innerHTML = `<div class="hud-sec">ENVIRONMENT</div>
      <div class="hud-row"><span>PEOPLE</span><b>${detectionData.people}</b></div>
      <div class="hud-row"><span>OBJECTS</span><b>${detectionData.objects}</b></div>
      <div class="hud-row"><span>POSES</span><b>${detectionData.poses}</b></div>
      <div class="hud-row"><span>HANDS</span><b>${detectionData.hands}</b></div>
      <div class="hud-row"><span>SEL</span><b>${sel ? (sel.class === 'person' ? 'PERSON' : sel.class.toUpperCase()) + ' ID:' + String(sel.id).padStart(2,'0') : 'NONE'}</b></div>
      <div class="hud-row"><span>CONF</span><b>${sel ? (sel.score * 100).toFixed(0) + '%' : '--'}</b></div>
      <div class="hud-row"><span>O₂</span><b>${cur.o2}</b><i>%</i></div>
      <div class="hud-row"><span>PRESS</span><b>${cur.pr.toFixed(1)}</b><i>kPa</i></div>
      ${sel ? `<div class="hud-desc">${sel.class === 'person' ? 'Person' : sel.class} · ${(sel.score * 100).toFixed(0)}% confidence · Visual observation only.</div>` : ''}`;
  }

  const bv = q('#hud-bottom');
  if (bv) {
    const evtHtml = events.slice(0, 3).map((e) => `<div class="hud-evt"><span class="hud-evt-t">${e.time}</span> ${e.text}</div>`).join('');
    bv.innerHTML = `<button class="hud-ecg-toggle" id="hud-ecg-toggle" type="button">${ecgCollapsed ? 'ECG +' : 'ECG −'}</button><div class="hud-ecg-bar${ecgCollapsed ? ' is-collapsed' : ''}" id="hud-ecg-bottom"></div>
      <div class="hud-events">${evtHtml}</div>
      <div class="hud-scene">${sceneText}</div>
      <div class="hud-mode">${currentMode === 'cam' ? 'CAMERA' : currentMode === 'sim' ? 'SIMULATION' : 'HARDWARE'} · ${detectionData.mode ? detectionData.mode.toUpperCase() : 'GENERAL'}</div>
      ${alertText ? `<div class="hud-alert ${alertLevel}">${alertText}</div>` : ''}`;
    const ecgToggle = q('#hud-ecg-toggle');
    if (ecgToggle && !ecgToggle.dataset.bound) {
      ecgToggle.dataset.bound = 'true';
      ecgToggle.addEventListener('click', () => { ecgCollapsed = !ecgCollapsed; });
    }
    const barWrap = q('#hud-ecg-bottom');
    if (barWrap && ecgBottomCanvas && ecgBottomCanvas.parentElement !== barWrap) {
      barWrap.appendChild(ecgBottomCanvas);
    }
  }
}

function loop() {
  hudRaf = requestAnimationFrame(loop);
  if (!onScreen) return;
  drawMiniEcg();
  updateOverlays();
}

export function startHud() {
  if (hudRaf) return;
  onScreen = true;
  ensureEcgCanvases();
  hudRaf = requestAnimationFrame(loop);
}

export function stopHud() {
  onScreen = false;
  cancelAnimationFrame(hudRaf);
  hudRaf = 0;
}

export function setMode(mode) { currentMode = mode; }
export function setHwValues(data) { hwValues = { ...hwValues, ...data }; }
export function setHwConnected(connected) { hwConnected = connected; }
export function setDetectionData(data) { detectionData = { ...detectionData, ...data }; }
export function setCrewProfile(profile) { crewProfile = profile; }
export function setSceneText(text) {
  if (text) sceneText = text;
  else sceneText = '';
}

export function raiseAlert(level, text) {
  alertLevel = level.toLowerCase();
  alertText = text;
  pushEvent(`[${level}] ${text}`);
  setTimeout(() => {
    if (alertText === text) { alertText = ''; alertLevel = ''; }
  }, 5000);
}

export function pushHudEvent(text) { pushEvent(text); }
