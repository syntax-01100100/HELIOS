import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_DICT } from '../src/shared/i18n-dict.js';
import { HEALTH_DICT } from '../src/shared/dict/health.js';
import { TRENDS_DICT } from '../src/shared/dict/trends.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const DICT = { ...BASE_DICT, ...HEALTH_DICT, ...TRENDS_DICT };
const PAGES = ['index.html', 'health.html'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|html)$/.test(name)) out.push(full);
  }
  return out;
}

const problems = [];
const rel = (p) => relative(root, p);

for (const [key, entry] of Object.entries(DICT)) {
  if (!entry || typeof entry !== 'object') continue;
  if (entry.en === undefined) problems.push(`dict ${key}: missing en`);
  if (entry.ar === undefined) problems.push(`dict ${key}: missing ar`);
}

const sourceFiles = [...walk(join(root, 'src')), ...PAGES.map((p) => join(root, p))];
const usedKeys = new Map();
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) usedKeys.set(m[1], rel(file));
  for (const m of text.matchAll(/data-i18n="([\w.]+)"/g)) usedKeys.set(m[1], rel(file));
  for (const m of text.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(';')) {
      const key = pair.split('|')[1];
      if (key) usedKeys.set(key, rel(file));
    }
  }
  for (const m of text.matchAll(/tList\(\s*['"`]([\w.]+)['"`]/g)) usedKeys.set(m[1], rel(file));
}
for (const [key, file] of usedKeys) {
  if (!DICT[key]) problems.push(`missing key ${key} (used in ${file})`);
}

for (const page of PAGES) {
  const html = readFileSync(join(root, page), 'utf8');
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const elementRe = /<([a-z][a-z0-9]*)\b([^>]*)>([^<]*[A-Za-z][^<]*)</g;
  for (const m of body.matchAll(elementRe)) {
    const [, tag, attrs, text] = m;
    if (['script', 'style', 'title', 'option'].includes(tag)) continue;
    if (/data-i18n/.test(attrs)) continue;
    problems.push(`uncovered text in ${page} <${tag}>: "${text.trim().slice(0, 60)}"`);
  }
}

if (problems.length === 0) {
  console.log('check:i18n passed: no missing keys or uncovered text found.');
} else {
  console.log(`check:i18n found ${problems.length} issue(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}
