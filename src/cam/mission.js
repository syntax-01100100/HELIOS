import { setCrewProfile } from './hud.js';

const q = (selector) => document.querySelector(selector);
const box = q('#mvbox');
const auth = q('#mv-auth');
const profileList = q('#mv-auth-profiles');
const authNote = q('#mv-auth-note');
const gesturePanel = q('#mv-gesture');
const assistPanel = q('#mv-assist');
const sosPanel = q('#mv-sos');

const profiles = [
  { id: 'AST-01', callsign: 'AURORA', role: 'COMMANDER', buddy: 'ORBIT-2', baseline: { hr: 64, spo2: 98, temp: 36.5, activity: 'LOW' }, current: { hr: 72, spo2: 98, temp: 36.6 } },
  { id: 'AST-02', callsign: 'ORBIT-2', role: 'FLIGHT ENGINEER', buddy: 'AURORA', baseline: { hr: 70, spo2: 97, temp: 36.7, activity: 'MODERATE' }, current: { hr: 78, spo2: 97, temp: 36.8 } },
  { id: 'AST-03', callsign: 'VEGA', role: 'MISSION SPECIALIST', buddy: 'NOVA-4', baseline: { hr: 60, spo2: 99, temp: 36.4, activity: 'LOW' }, current: { hr: 67, spo2: 99, temp: 36.5 } },
];

let selectedProfile = null;
let sosArmedAt = 0;
let openPalmSince = 0;
let voiceRecognition = null;

function renderProfiles() {
  profileList.innerHTML = profiles.map((profile) => `<button class="mv-profile-btn" type="button" data-profile="${profile.id}">
    <strong>${profile.id} · ${profile.callsign}</strong><em>${profile.role}</em>
    <span>BASE HR ${profile.baseline.hr} · SpO₂ ${profile.baseline.spo2}% · BUDDY ${profile.buddy}</span>
  </button>`).join('');
  profileList.querySelectorAll('[data-profile]').forEach((button) => {
    button.addEventListener('click', () => authenticateProfile(button.dataset.profile, 'DEMO PROFILE'));
  });
}

function showAuthNote(text, error = false) {
  authNote.textContent = text;
  authNote.style.color = error ? '#ff9a8f' : '';
}

function authenticateProfile(profileId, method) {
  const profile = profiles.find((candidate) => candidate.id === profileId);
  if (!profile) return;
  selectedProfile = profile;
  setCrewProfile(profile);
  box.classList.remove('auth-pending');
  box.classList.add('authenticated');
  q('#mv-profile-chip').hidden = false;
  q('#mv-profile-chip span').textContent = `${profile.id} · ${profile.callsign} · ${method}`;
  showAuthNote(`${method} accepted for this demonstration profile.`);
  q('#mvtag').textContent = 'SIMULATED SENSOR DATA · PROFILE AUTHORIZED';
}

async function authenticateWithDevice() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    showAuthNote('Device authentication is unavailable here. Choose a demonstration profile.', true);
    return;
  }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({ publicKey: { challenge, timeout: 5000, userVerification: 'preferred', rpId: location.hostname } });
    authenticateProfile(profiles[0].id, 'DEVICE AUTHENTICATOR');
  } catch {
    showAuthNote('No enrolled HELIOS credential was available. Choose a demonstration profile to continue.', true);
  }
}

function startVoiceDemo() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showAuthNote('Voice commands are not supported by this browser. Choose a demonstration profile.', true);
    return;
  }
  voiceRecognition?.stop();
  voiceRecognition = new Recognition();
  voiceRecognition.lang = 'en-US';
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;
  showAuthNote('Listening for “HELIOS, identify astronaut.” This is a voice-command demo, not biometric proof.');
  voiceRecognition.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase();
    authenticateProfile(text.includes('engineer') ? 'AST-02' : text.includes('specialist') ? 'AST-03' : 'AST-01', 'VOICE COMMAND');
  };
  voiceRecognition.onerror = () => showAuthNote('Voice command was not recognised. Choose a profile or try again.', true);
  voiceRecognition.start();
}

function prepareSos() {
  const now = Date.now();
  if (now - sosArmedAt < 10000) return;
  sosArmedAt = now;
  sosPanel.hidden = false;
  q('#mv-sos-text').textContent = 'A stable open palm was detected. Confirm to send a simulated emergency alert to Buddy Link.';
}

function confirmSos() {
  sosPanel.hidden = true;
  window.dispatchEvent(new CustomEvent('helios:buddy-alert', { detail: { level: 'CRITICAL', message: 'SIMULATED SOS confirmed from HELIOS Mission View.' } }));
  q('#mv-sos-text').textContent = 'SIMULATED SOS CONFIRMED';
  q('#mvtag').textContent = 'SIMULATED SOS · BUDDY LINK NOTIFIED';
  q('#mv-sos').hidden = false;
  if (navigator.vibrate) navigator.vibrate([180, 100, 180]);
}

function updateGesture(data) {
  const gesture = data?.gesture;
  if (!gesture || data.hands === 0) {
    gesturePanel.textContent = 'GESTURE RECOGNITION: ACTIVE · HAND: SEARCHING';
    gesturePanel.classList.remove('active');
    return;
  }
  gesturePanel.textContent = `GESTURE RECOGNITION: ACTIVE · ${gesture.name} · ${gesture.stable ? 'STABLE' : 'ACQUIRING'} · ${Math.round(gesture.confidence * 100)}%`;
  gesturePanel.classList.toggle('active', gesture.stable);
  if (gesture.name === 'OPEN PALM' && gesture.stable) {
    if (!openPalmSince) openPalmSince = Date.now();
    if (Date.now() - openPalmSince > 1200) prepareSos();
  } else {
    openPalmSince = 0;
  }
  if ((gesture.name === 'PINCH' || gesture.name === 'POINTING') && gesture.stable && data.selected) showAssistance(data.selected);
  if (gesture.name === 'FIST' && gesture.stable) assistPanel.hidden = true;
}

function showAssistance(track) {
  assistPanel.hidden = false;
  q('#mv-assist-text').textContent = `Classification: ${track.class.toUpperCase()} · Confidence: ${Math.round(track.score * 100)}% · Tracking: ACTIVE`;
}

window.addEventListener('helios:detections', (event) => updateGesture(event.detail));

q('#mv-webauthn')?.addEventListener('click', authenticateWithDevice);
q('#mv-voice')?.addEventListener('click', startVoiceDemo);
q('#mv-profile-switch')?.addEventListener('click', () => { box.classList.remove('authenticated'); box.classList.add('auth-pending'); });
q('#mv-assist-close')?.addEventListener('click', () => { assistPanel.hidden = true; });
q('#mv-sos-confirm')?.addEventListener('click', confirmSos);
q('#mv-sos-cancel')?.addEventListener('click', () => { sosPanel.hidden = true; });

const authObserver = new MutationObserver(() => {
  if (!box.classList.contains('live')) {
    if (box.classList.contains('authenticated') || !box.classList.contains('auth-pending')) {
      box.classList.remove('authenticated');
      box.classList.add('auth-pending');
    }
    selectedProfile = null;
    setCrewProfile(null);
    q('#mv-profile-chip').hidden = true;
    sosPanel.hidden = true;
    assistPanel.hidden = true;
  }
});
authObserver.observe(box, { attributes: true, attributeFilter: ['class'] });

renderProfiles();
export function getCrewProfile() { return selectedProfile; }
export function resetCrewAccess() { box.classList.remove('authenticated'); box.classList.add('auth-pending'); }
