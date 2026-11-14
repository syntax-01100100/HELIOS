import '../shared/chrome.js';
import './health.css';
import { mountCheckin } from './checkin.js';
import { mountBodyMap } from './bodymap.js';
import { mountTrends } from './trends.js';
import { mountGame } from './game.js';
import { ENVIRONMENTS, delayNote, evaluateAll } from './ranges.js';
import { readinessScore } from './rules.js';
import { dayKey, currentStreak, loadCheckins, loadEnvironment, saveEnvironment } from './store.js';

const TAB_IDS = ['checkin', 'body', 'trends', 'game'];
const tabButtons = [...document.querySelectorAll('[data-tab]')];
const envSelect = document.querySelector('#env');
const envNote = document.querySelector('#s-env-note');
const emOpen = document.querySelector('#em-open');
const emDialog = document.querySelector('#em-dialog');

function currentTab() {
  const id = location.hash.slice(1);
  return TAB_IDS.includes(id) ? id : 'checkin';
}

function showTab(id) {
  tabButtons.forEach((btn) => {
    const on = btn.dataset.tab === id;
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  TAB_IDS.forEach((t) => {
    document.getElementById(`panel-${t}`).hidden = t !== id;
  });
}

function renderStrip() {
  const checkins = loadCheckins();
  const latest = checkins.at(-1);
  const score = latest ? readinessScore(evaluateAll(latest.values)) : null;
  document.querySelector('#s-ready').textContent = score ?? '--';
  document.querySelector('#s-ready-note').textContent = latest
    ? 'Based on your latest check-in'
    : 'Save a check-in to see your score';
  document.querySelector('#s-streak').textContent = String(currentStreak(checkins));
  const doneToday = checkins.some((c) => c.date === dayKey());
  document.querySelector('#s-due').textContent = doneToday ? 'Tomorrow' : 'Due now';
  envNote.textContent = `Signal delay: ${delayNote(envSelect.value)}`;
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    location.hash = btn.dataset.tab;
  });
});

window.addEventListener('hashchange', () => {
  showTab(currentTab());
  refreshAll();
});

ENVIRONMENTS.forEach((env) => {
  envSelect.add(new Option(env.label, env.id));
});
envSelect.value = loadEnvironment();
envSelect.addEventListener('change', () => {
  saveEnvironment(envSelect.value);
  checkin.refreshResults();
  refreshAll();
});

emOpen.addEventListener('click', () => emDialog.showModal());

const checkin = mountCheckin(document.querySelector('#panel-checkin'), () => refreshAll());
const body = mountBodyMap(document.querySelector('#panel-body'));
const trends = mountTrends(document.querySelector('#panel-trends'));
const game = mountGame(document.querySelector('#panel-game'));

function refreshAll() {
  renderStrip();
  body.refresh();
  trends.refresh();
  game.refresh();
}

renderStrip();
showTab(currentTab());
