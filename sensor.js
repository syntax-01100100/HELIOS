const q = (selector) => document.querySelector(selector);

const FRESH_MS = 5000;
const FIELDS = ['hr', 'spo2', 'temp'];

const input = q('#hwurl');
const button = q('#hwbtn');
const linkStatus = q('#hwstat');
const message = q('#hwmsg');
const lastPacket = q('#hwlast');
const freshness = q('#hwfresh');
const tabTag = q('.modes [data-mode="hw"] em');

let socket = null;
let lastAt = 0;

function setLink(text, tone) {
  linkStatus.textContent = text;
  linkStatus.className = tone;
  tabTag.textContent = text === 'CONNECTED' ? 'Live sensor' : text === 'DISCONNECTED' ? 'Not connected' : text;
}

function showValues(data) {
  for (const field of FIELDS) {
    const value = data[field];
    q(`[data-hw="${field}"]`).textContent = typeof value === 'number' && Number.isFinite(value) ? String(value) : '--';
  }
}

function clearValues() {
  FIELDS.forEach((field) => {
    q(`[data-hw="${field}"]`).textContent = '--';
  });
  lastPacket.textContent = '--';
  freshness.textContent = '--';
}

function fail(text) {
  message.textContent = text;
  setLink('ERROR', 'st-err');
  socket = null;
  button.textContent = 'CONNECT';
  clearValues();
}

function connect() {
  const address = input.value.trim();
  let parsed;
  try {
    parsed = new URL(address);
  } catch {
    message.textContent = 'Enter a valid sensor address, for example ws://192.168.1.20:8080';
    return;
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    message.textContent = 'The address must start with ws:// or wss://';
    return;
  }

  const ws = new WebSocket(address);
  socket = ws;
  setLink('CONNECTING', 'st-warn');
  message.textContent = 'Connecting to the sensor bridge...';
  button.textContent = 'DISCONNECT';

  ws.onopen = () => {
    setLink('CONNECTED', 'st-ok');
    message.textContent = 'Connected. Waiting for the first reading from the sensor.';
  };
  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      message.textContent = 'Received data that is not valid JSON. It was ignored.';
      return;
    }
    if (!data || typeof data !== 'object') return;
    lastAt = Date.now();
    lastPacket.textContent = new Date(lastAt).toLocaleTimeString();
    showValues(data);
    message.textContent = 'Receiving live readings from the sensor.';
  };
  ws.onerror = () => {
    if (socket === ws) fail('Connection error. Check the address and that the sensor bridge is running.');
  };
  ws.onclose = () => {
    if (socket === ws) fail('The sensor connection closed. Press CONNECT to try again.');
  };
}

function disconnect() {
  const ws = socket;
  socket = null;
  ws.close();
  button.textContent = 'CONNECT';
  setLink('DISCONNECTED', 'st-warn');
  message.textContent = 'Disconnected. No readings are shown.';
  clearValues();
}

button.onclick = () => (socket ? disconnect() : connect());

setInterval(() => {
  if (!socket || !lastAt) return;
  const age = Date.now() - lastAt;
  freshness.textContent = age < FRESH_MS ? 'LIVE' : `STALE · ${Math.round(age / 1000)}s since last packet`;
}, 1000);

window.addEventListener('pagehide', () => {
  if (socket) socket.close();
});
