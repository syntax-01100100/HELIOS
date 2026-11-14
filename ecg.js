const canvas = document.querySelector('#ecg');
const ctx = canvas.getContext('2d');
const WINDOW_SECONDS = 4;

let time = 0;
let playing = true;
let last = performance.now();
let bpmSource = () => 72;

const gauss = (x, mean, sigma) => Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma));

function beatShape(phase) {
  return (
    0.12 * gauss(phase, 0.16, 0.03) -
    0.12 * gauss(phase, 0.235, 0.012) +
    gauss(phase, 0.26, 0.011) -
    0.25 * gauss(phase, 0.285, 0.012) +
    0.28 * gauss(phase, 0.42, 0.05)
  );
}

function drawGrid(w, h) {
  ctx.strokeStyle = 'rgba(25,227,255,.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += w / 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += h / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = (now - last) / 1000;
  last = now;
  if (playing) time += dt;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  ctx.fillStyle = '#06101f';
  ctx.fillRect(0, 0, w, h);
  drawGrid(w, h);

  const cyclesPerSecond = bpmSource() / 60;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const t = time - ((w - x) / w) * WINDOW_SECONDS;
    const phase = (((t * cyclesPerSecond) % 1) + 1) % 1;
    const y = h * 0.55 - beatShape(phase) * h * 0.4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#19e3ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffd58a';
  ctx.font = '11px monospace';
  ctx.fillText('SIMULATED ECG SIGNAL', 10, 18);
  if (!playing) ctx.fillText('PAUSED', w - 64, 18);
}

export function setBpmSource(fn) {
  bpmSource = fn;
}

export function togglePlay() {
  playing = !playing;
  return playing;
}

requestAnimationFrame(frame);
