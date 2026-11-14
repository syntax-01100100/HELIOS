import {
  HAZARD_ORDER,
  HAZARDS,
  PICKUP_KINDS,
  SKINS,
  XP_PER_CHECKIN,
  XP_PER_REGION,
  badgesFor,
  currentStats,
  loadProgress,
  saveProgress,
} from './game-data.js';
import { HEIGHT, SHIP_X, WIDTH, drawScene } from './game-draw.js';

const STEP = 1 / 60;
const PREFS = [
  ['retro', 'Retro pixel mode'],
  ['calm', 'Calm mode'],
  ['sound', 'Sound'],
  ['crt', 'CRT scanlines'],
];
const MAIN_LABEL = { ready: 'Start flight', playing: 'Pause', paused: 'Resume', over: 'Fly again' };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function template() {
  return `
    <div class="gm-intro">
      <h2>HELIOS FLIGHT</h2>
      <p class="muted">Fly the helmet through five hazard walls. Collect water, sleep, heart and mood pickups to refill energy. Rewards come from check-ins and learning, never from your health numbers.</p>
    </div>
    <div class="gm-layout">
      <div class="gm-play">
        <div class="gm-hud">
          <div><span>Distance</span><b id="gm-dist">0 m</b></div>
          <div><span>Walls passed</span><b id="gm-score">0</b></div>
          <div><span>Shields</span><b id="gm-shields">0</b></div>
        </div>
        <div class="gm-energy">
          <span>Energy</span>
          <div class="gm-bar" aria-hidden="true"><i id="gm-energy-fill"></i></div>
        </div>
        <div class="gm-stage" id="gm-stage">
          <canvas id="gm-canvas" tabindex="0" aria-label="HELIOS FLIGHT. Press Space or tap the game to thrust."></canvas>
          <div class="gm-crt" hidden></div>
          <div class="gm-overlay" id="gm-overlay"></div>
        </div>
        <div class="gm-controls">
          <button type="button" class="btn-primary" id="gm-main">Start flight</button>
          <div class="gm-toggles">
            ${PREFS.map(([key, label]) => `<label class="gm-toggle"><input type="checkbox" data-pref="${key}"><span>${label}</span></label>`).join('')}
          </div>
        </div>
      </div>
      <aside class="gm-side" id="gm-side"></aside>
    </div>`;
}

function overlayHtml(mode, run) {
  if (mode === 'ready') {
    return '<div class="gm-msg"><h3>Ready for launch</h3><p>Tap or press Space to thrust. Keep between the walls.</p></div>';
  }
  if (mode === 'paused') {
    return '<div class="gm-msg"><h3>Paused</h3><p>Tap or press Space to keep flying.</p></div>';
  }
  if (mode === 'over') {
    return `<div class="gm-msg">
      <h3>Crashed</h3>
      <p>${HAZARDS[run.lastHazard].fact}</p>
      <p>${Math.floor(run.distance / 10)} m, ${run.passed} walls passed, ${run.collected} pickups.</p>
      <button type="button" class="btn-primary" data-act="again">Fly again</button>
    </div>`;
  }
  return '';
}

export function mountGame(rootElement) {
  rootElement.innerHTML = template();
  const canvas = rootElement.querySelector('#gm-canvas');
  const stage = rootElement.querySelector('#gm-stage');
  const overlay = rootElement.querySelector('#gm-overlay');
  const mainBtn = rootElement.querySelector('#gm-main');
  const side = rootElement.querySelector('#gm-side');
  const crt = rootElement.querySelector('.gm-crt');
  const distEl = rootElement.querySelector('#gm-dist');
  const scoreEl = rootElement.querySelector('#gm-score');
  const shieldsEl = rootElement.querySelector('#gm-shields');
  const energyFill = rootElement.querySelector('#gm-energy-fill');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let progress = loadProgress();
  let stats = currentStats();
  let mode = 'ready';
  let run = newRun();
  let acc = 0;
  let last = 0;
  let raf = 0;
  let onScreen = true;
  let audio = null;

  function tuning() {
    return progress.prefs.calm
      ? { gravity: 700, flap: -260, gap: 170, speed: 110, drain: 3 }
      : { gravity: 900, flap: -340, gap: 140, speed: 150, drain: 5 };
  }

  function newRun() {
    return {
      ship: { y: HEIGHT / 2, vy: 0, thrustT: 0, invuln: 0 },
      shields: 1 + (stats.checkedInToday ? 1 : 0),
      energy: 100,
      obstacles: [],
      pickups: [],
      spawned: 0,
      pickupCount: 0,
      lastGapY: HEIGHT / 2,
      distance: 0,
      passed: 0,
      collected: 0,
      hitFlash: 0,
      lastHazard: 'gravity',
    };
  }

  function beep(freq, duration) {
    if (!progress.prefs.sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.value = 0.05;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    } catch {
      return;
    }
  }

  function spawn(tu) {
    const lastWall = run.obstacles.at(-1);
    if (lastWall && lastWall.x > WIDTH - 170) return;
    const lo = tu.gap / 2 + 30;
    const gapY = clamp(run.lastGapY + (Math.random() * 2 - 1) * 90, lo, HEIGHT - lo);
    run.lastGapY = gapY;
    const hazard = HAZARD_ORDER[run.spawned % HAZARD_ORDER.length];
    run.spawned += 1;
    const wall = { x: WIDTH + 20, w: 46, gapY, gap: tu.gap, hazard, passed: false };
    run.obstacles.push(wall);
    if (run.spawned % 3 === 0) {
      run.pickups.push({
        x: wall.x + 150,
        y: gapY,
        kind: run.pickupCount % PICKUP_KINDS.length,
        taken: false,
        phase: Math.random() * 6,
      });
      run.pickupCount += 1;
    }
  }

  function creditHazard(hazard) {
    if (progress.cleared.includes(hazard)) return;
    progress.cleared.push(hazard);
    saveProgress(progress);
  }

  function endRun(hazard) {
    run.lastHazard = hazard;
    mode = 'over';
    progress.best = Math.max(progress.best, Math.floor(run.distance / 10));
    saveProgress(progress);
    beep(140, 0.35);
    showOverlay();
    renderSide();
  }

  function takeHit(hazard, safeY) {
    if (run.shields <= 0) {
      endRun(hazard);
      return false;
    }
    run.shields -= 1;
    run.lastHazard = hazard;
    run.ship.y = safeY;
    run.ship.vy = 0;
    run.ship.invuln = 0.9;
    run.hitFlash = 0.35;
    beep(220, 0.15);
    return true;
  }

  function checkBounds() {
    const { ship } = run;
    if (ship.y - 10 >= 0 && ship.y + 10 <= HEIGHT) return true;
    const safeY = clamp(ship.y, 10, HEIGHT - 10);
    if (ship.invuln > 0) {
      ship.y = safeY;
      ship.vy = 0;
      return true;
    }
    return takeHit('gravity', safeY);
  }

  function checkWalls() {
    const { ship } = run;
    for (const wall of run.obstacles) {
      const overlaps = wall.x < SHIP_X + 11 && wall.x + wall.w > SHIP_X - 11;
      if (!overlaps) continue;
      const top = wall.gapY - wall.gap / 2;
      const bottom = wall.gapY + wall.gap / 2;
      const inside = ship.y - 9 >= top && ship.y + 9 <= bottom;
      if (!inside && ship.invuln <= 0) {
        if (!takeHit(wall.hazard, clamp(ship.y, top + 9, bottom - 9))) return false;
      }
    }
    for (const wall of run.obstacles) {
      if (!wall.passed && wall.x + wall.w < SHIP_X - 11) {
        wall.passed = true;
        run.passed += 1;
        creditHazard(wall.hazard);
      }
    }
    return true;
  }

  function collectPickups() {
    for (const p of run.pickups) {
      if (!p.taken && Math.hypot(p.x - SHIP_X, p.y - run.ship.y) < 22) {
        p.taken = true;
        run.energy = Math.min(100, run.energy + 25);
        run.collected += 1;
        beep(880, 0.08);
      }
    }
  }

  function step(dt) {
    const tu = tuning();
    const r = run;
    r.ship.vy += tu.gravity * (r.energy <= 0 ? 1.4 : 1) * dt;
    r.ship.y += r.ship.vy * dt;
    r.ship.thrustT = Math.max(0, r.ship.thrustT - dt);
    r.ship.invuln = Math.max(0, r.ship.invuln - dt);
    r.hitFlash = Math.max(0, r.hitFlash - dt * 2);
    r.energy = Math.max(0, r.energy - tu.drain * dt);
    const speed = tu.speed + Math.min(70, r.distance / 1200);
    r.distance += speed * dt;
    r.obstacles.forEach((w) => { w.x -= speed * dt; });
    r.pickups.forEach((p) => { p.x -= speed * dt; });
    r.obstacles = r.obstacles.filter((w) => w.x + w.w > -10);
    r.pickups = r.pickups.filter((p) => !p.taken && p.x > -20);
    spawn(tu);
    if (!checkBounds()) return;
    if (!checkWalls()) return;
    collectPickups();
  }

  function flap() {
    run.ship.vy = tuning().flap;
    run.ship.thrustT = 0.12;
    beep(520, 0.05);
  }

  function showOverlay() {
    overlay.innerHTML = overlayHtml(mode, run);
    overlay.hidden = mode === 'playing';
    mainBtn.textContent = MAIN_LABEL[mode];
  }

  function begin() {
    stats = currentStats();
    run = newRun();
    mode = 'playing';
    acc = 0;
    showOverlay();
    ensureLoop();
  }

  function resume() {
    mode = 'playing';
    acc = 0;
    showOverlay();
  }

  function pause() {
    if (mode !== 'playing') return;
    mode = 'paused';
    showOverlay();
  }

  function tap() {
    if (mode === 'ready') {
      begin();
      flap();
    } else if (mode === 'playing') {
      flap();
    } else if (mode === 'paused') {
      resume();
    }
  }

  function updateHud() {
    distEl.textContent = `${Math.floor(run.distance / 10)} m`;
    scoreEl.textContent = String(run.passed);
    shieldsEl.textContent = String(run.shields);
    energyFill.style.width = `${Math.round(run.energy)}%`;
    energyFill.classList.toggle('is-low', run.energy <= 25);
  }

  function render() {
    drawScene(ctx, run, {
      retro: progress.prefs.retro,
      reduce: reduceMotion,
      skin: stats.skin,
      t: performance.now() / 1000,
    });
    updateHud();
  }

  function frame(ts) {
    raf = 0;
    const dt = Math.min((ts - last) / 1000, 0.1);
    last = ts;
    if (mode === 'playing') {
      acc += dt;
      while (acc >= STEP && mode === 'playing') {
        step(STEP);
        acc -= STEP;
      }
    } else {
      acc = 0;
    }
    render();
    ensureLoop();
  }

  function ensureLoop() {
    if (raf || !onScreen || document.visibilityState !== 'visible') return;
    raf = requestAnimationFrame(frame);
  }

  function applyPrefs() {
    const retro = progress.prefs.retro;
    const scale = retro ? 0.5 : (window.devicePixelRatio || 1);
    canvas.width = Math.round(WIDTH * scale);
    canvas.height = Math.round(HEIGHT * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    stage.classList.toggle('is-retro', retro);
    crt.hidden = !progress.prefs.crt;
  }

  function renderSide() {
    const { skin, streak, xp } = stats;
    const next = SKINS.find((s) => s.minStreak > streak);
    const badges = badgesFor(stats, progress);
    side.innerHTML = `
      <div class="gm-card">
        <p class="gm-skin-line"><span class="gm-swatch" style="background:${skin.body};box-shadow:inset 0 0 0 3px ${skin.trim}"></span><b>${skin.name}</b> skin</p>
        <p class="muted">${next ? `Next skin: ${next.name} at a ${next.minStreak}-day check-in streak.` : 'Top skin unlocked.'}</p>
        <dl class="gm-dl">
          <div><dt>XP</dt><dd>${xp}</dd></div>
          <div><dt>Best distance</dt><dd>${progress.best} m</dd></div>
          <div><dt>Streak</dt><dd>${streak} days</dd></div>
        </dl>
        <p class="muted gm-note">${XP_PER_CHECKIN} XP per check-in and ${XP_PER_REGION} XP per body region learned. Health numbers never earn XP.</p>
      </div>
      <div class="gm-card">
        <h3>Badges</h3>
        <ul class="gm-badges">
          ${badges.map((b) => `<li class="${b.earned ? 'is-earned' : ''}"><b>${b.name}</b><span>${b.earned ? 'Earned' : b.hint}</span></li>`).join('')}
        </ul>
      </div>`;
  }

  mainBtn.addEventListener('click', () => {
    if (mode === 'playing') pause();
    else if (mode === 'paused') resume();
    else begin();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="again"]')) begin();
  });
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    tap();
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
    e.preventDefault();
    if (!e.repeat) tap();
  });
  rootElement.querySelectorAll('[data-pref]').forEach((input) => {
    const key = input.dataset.pref;
    input.checked = Boolean(progress.prefs[key]);
    input.addEventListener('change', () => {
      progress.prefs[key] = input.checked;
      saveProgress(progress);
      applyPrefs();
      if (key === 'sound' && input.checked) beep(660, 0.12);
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') pause();
    ensureLoop();
  });
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (!onScreen) pause();
    ensureLoop();
  }).observe(stage);

  function refresh() {
    stats = currentStats();
    progress = loadProgress();
    if (mode === 'ready') run = newRun();
    renderSide();
    updateHud();
  }

  applyPrefs();
  renderSide();
  showOverlay();
  updateHud();
  ensureLoop();
  return { refresh };
}
