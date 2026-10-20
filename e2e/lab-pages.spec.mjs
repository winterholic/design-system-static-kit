import {test, expect} from '@playwright/test';
import {readFileSync, mkdirSync} from 'node:fs';
import {themes} from '../src/catalog.mjs';

const manifest = JSON.parse(readFileSync(new URL('../site/test-lab/manifest.json', import.meta.url), 'utf8'));
const byId = new Map(manifest.cases.map(c => [c.id, c]));
const stress = manifest.cases.filter(c => c.set === 'stress');
const longOnes = stress.filter(c => /long|state|dark-/.test(c.id));

/** Same structural audit as pages.spec (landmarks, headings, names, labels, targets, ids, anchors). */
const audit = () => {
  const out = [], vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  if (document.documentElement.lang !== 'ko') out.push('html lang');
  for (const sel of ['main', 'nav', 'footer', 'header']) if (!document.querySelector(sel)) out.push('missing landmark ' + sel);
  const h1s = [...document.querySelectorAll('h1')]; if (h1s.length !== 1) out.push('h1 count ' + h1s.length);
  let prev = 0; for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) { const n = +h.tagName[1]; if (prev && n > prev + 1) out.push(`heading jump h${prev}→h${n}: ${h.textContent.trim().slice(0, 30)}`); prev = n; if (!h.textContent.trim()) out.push('empty heading'); }
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id); if (ids.length !== new Set(ids).size) out.push('duplicate ids');
  for (const el of document.querySelectorAll('a[href],button,summary,[role=tab]')) { if (!vis(el)) continue; const name = (el.getAttribute('aria-label') ?? el.textContent).trim(); if (!name) out.push('unnamed ' + el.outerHTML.slice(0, 60)); }
  for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) { const named = el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'); if (!named) out.push('unlabelled ' + (el.name || el.type)); }
  for (const t of document.querySelectorAll('table')) if (!t.querySelector('caption') || !t.querySelector('th')) out.push('table without caption/headers');
  const anchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(Boolean); for (const a of anchors) if (!document.getElementById(a)) out.push('dangling anchor #' + a);
  return out;
};

test('test-lab stress cases across viewports: no overflow, no page errors, structural a11y clean', async ({page}) => {
  test.setTimeout(420000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const problems = [];
  for (const c of stress) {
    const widths = /long|state|dark-/.test(c.id) ? [360, 390, 768, 1280, 1600] : [390, 1280];
    for (const width of widths) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`/site/test-lab/cases/${c.id}/`);
      const over = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}));
      if (over.sw > over.cw + 1) problems.push(`${c.id}@${width} overflow ${over.sw}>${over.cw}`);
      if (width === 390) for (const p of await page.evaluate(audit)) problems.push(`${c.id}: ${p}`);
    }
  }
  expect(problems).toEqual([]); expect(errors).toEqual([]);
});

test('test-lab matrix sample: every template under two rotating themes renders clean on a phone', async ({page}) => {
  test.setTimeout(420000);
  const themeIds = Object.keys(themes);
  const problems = []; const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const matrix = manifest.cases.filter(c => c.set === 'matrix'), templates = [...new Set(matrix.map(c => c.template))];
  for (const [i, t] of templates.entries()) {
    const own = matrix.filter(c => c.template === t), picks = [own[(i * 3) % own.length], own[(i * 5 + 1) % own.length]].filter((c, k, a) => a.indexOf(c) === k);
    for (const c of picks) {
      const id = c.id;
      await page.setViewportSize({width: 390, height: 844});
      await page.goto(`/site/test-lab/cases/${id}/`);
      const over = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth}));
      if (over.sw > over.cw + 1) problems.push(`${id} overflow ${over.sw}>${over.cw}`);
    }
  }
  expect(problems).toEqual([]); expect(errors).toEqual([]);
});

test('test-lab screenshots: representative and boundary cases at phone and desktop widths', async ({page}) => {
  test.setTimeout(300000);
  mkdirSync('test-results/test-lab', {recursive: true});
  const ids = [...new Set([
    ...manifest.cases.filter(c => c.set === 'matrix').filter((c, i, a) => a.findIndex(x => x.pageType === c.pageType) === i).map(c => c.id),
    'd-long-ko', 'd-long-en', 'd-long-num', 'd-long-en-article',
    'd-state-dashboard-overview-error', 'd-state-admin-table-empty-cleared',
    'd-nearban-glow_dark', 'd-dark-not-found',
  ])].filter(id => byId.has(id));
  expect(ids.length).toBeGreaterThan(16);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const id of ids) for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 900});
    await page.goto(`/site/test-lab/cases/${id}/`);
    await page.screenshot({path: `test-results/test-lab/${id}@${width}.png`});
  }
  expect(errors).toEqual([]);
});
