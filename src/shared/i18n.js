import { BASE_DICT } from './i18n-dict.js';
import { HEALTH_DICT } from './dict/health.js';
import { TRENDS_DICT } from './dict/trends.js';

const DICT = { ...BASE_DICT, ...HEALTH_DICT, ...TRENDS_DICT };

const STORE_KEY = 'sl';
const EVENT = 'helios:lang';

function readStored() {
  try {
    return localStorage.getItem(STORE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

let lang = readStored();

export function getLang() {
  return lang;
}

export function t(key, params) {
  const entry = DICT[key];
  let text = entry?.[lang] ?? entry?.en;
  if (text === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (params) text = text.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
  return text;
}

export function tList(key) {
  const entry = DICT[key];
  const list = entry?.[lang] ?? entry?.en;
  if (!Array.isArray(list)) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing list: ${key}`);
    return [];
  }
  return list;
}

export function translateIn(root) {
  applyDom(root);
}

function applyDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split('|');
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

function applyDocument() {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function setLang(next) {
  lang = next === 'ar' ? 'ar' : 'en';
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* storage unavailable: the choice applies for this page only */
  }
  applyDocument();
  applyDom();
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { lang } }));
}

function bindToggles() {
  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
  });
}

export function initI18n() {
  applyDocument();
  applyDom();
  bindToggles();
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { lang } }));
}
