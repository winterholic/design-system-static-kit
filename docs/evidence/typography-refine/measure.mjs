// Typography render measurement. Compiles examples with the kit at --src, renders them in Chromium (setContent, no server)
// and records, per example and viewport: heading/body px, weight, letter-spacing, line-height, line count and the platform
// faces actually used for Hangul and Latin glyphs (CDP CSS.getPlatformFontsForNode).
//   node docs/evidence/typography-refine/measure.mjs --src <repo root> --out <dir> [--shots] [--matrix]
// "before" is produced from a git worktree of the baseline revision; "after" from the working tree.
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {chromium} from '@playwright/test';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const src = path.resolve(arg('src', '.')), out = path.resolve(arg('out', 'docs/evidence/typography-refine/before'));
const shots = process.argv.includes('--shots'), matrix = process.argv.includes('--matrix');
const {createBlueprint, templateList} = await import(pathToFileURL(path.join(src, 'src/catalog.mjs')));
const {compile} = await import(pathToFileURL(path.join(src, 'src/compiler.mjs')));
const {TYPE_IDS, STACKS} = await import(pathToFileURL(path.join(src, 'src/typography.mjs')));

export const SAMPLES = ['saas-landing', 'admin-table', 'inbox', 'dashboard-overview', 'product-detail', 'blog-post', 'article', 'contact', 'survey', 'app-landing', 'luxury-brand', 'news-home'];
const WIDTHS = [1440, 390];
await mkdir(out, {recursive: true});
const browser = await chromium.launch();

/** Runs in the page: samples one element's computed typography. `kind` names the role. */
const MEASURE = () => {
  const hangul = /[ㄱ-ㆎ가-힣]/g, latin = /[A-Za-z0-9]/g;
  const pick = (sel, ok = () => true) => [...document.querySelectorAll(sel)].find(e => e.getClientRects().length && ok(e));
  const sample = (kind, el) => {
    if (!el) return null;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), lhPx = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    const range = document.createRange(); range.selectNodeContents(el);
    const tops = new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top / (lhPx * 0.5))));
    return {kind, tag: el.tagName.toLowerCase(), cls: (el.closest('[class*=kit-]')?.className || '').toString().slice(0, 40), text: text.slice(0, 28), chars: text.length,
      hangulShare: Math.round((text.match(hangul)?.length || 0) / Math.max(1, text.length) * 100) / 100, latinChars: text.match(latin)?.length || 0,
      fontSize: fs, weight: cs.fontWeight, letterSpacingPx: Math.round(ls * 100) / 100, letterSpacingEm: Math.round(ls / fs * 1000) / 1000,
      lineHeightPx: Math.round(lhPx * 10) / 10, lineHeight: Math.round(lhPx / fs * 1000) / 1000, lines: Math.max(1, Math.round(el.getBoundingClientRect().height / lhPx)), width: Math.round(el.getBoundingClientRect().width),
      transform: cs.textTransform, family: cs.fontFamily.split(',').slice(0, 3).join(',').replace(/"/g, '')};
  };
  const main = document.querySelector('main') || document.body;
  const seen = e => e.getClientRects().length && e.getBoundingClientRect().width > 40 && !e.closest('.kit-sr');
  const mark = (name, el) => { if (el) el.dataset.m = name; return el; };
  // The page's visual title: the largest visible h1/h2 (the h1 of a hero page is often visually hidden and the hero's own heading is an h2).
  const heads = [...main.querySelectorAll('h1,h2')].filter(seen).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
  const title = mark('title', heads[0]);
  const sectionHead = mark('h2', [...main.querySelectorAll('h2')].filter(seen).filter(e => e !== title)[0]);
  // Dominant running text: the font size that carries the most characters in p/li/dd/td.
  const runs = [...main.querySelectorAll('p,li,dd,td')].filter(e => e.getClientRects().length && !e.closest('.kit-sr,.kit-eyebrow,button'));
  const weight = new Map(); for (const e of runs) { const t = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); if (t.length < 8) continue; const fs = parseFloat(getComputedStyle(e).fontSize); weight.set(fs, (weight.get(fs) || 0) + t.length); }
  const domSize = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const body = mark('body', runs.find(e => parseFloat(getComputedStyle(e).fontSize) === domSize && e.textContent.trim().length > 12));
  return {
    title: sample('title', title), h2: sample('h2', sectionHead), h3: sample('h3', [...main.querySelectorAll('h3')].find(seen)), body: sample('body', body),
    button: sample('button', [...document.querySelectorAll('.kit-button')].find(seen)), eyebrow: sample('eyebrow', mark('eyebrow', [...document.querySelectorAll('.kit-eyebrow')].find(seen))),
    eyebrows: [...document.querySelectorAll('.kit-eyebrow')].filter(seen).map(e => { const t = e.textContent.trim(), cs = getComputedStyle(e); return {hangul: /[가-힣]/.test(t), ls: Math.round(parseFloat(cs.letterSpacing || 0) / parseFloat(cs.fontSize) * 1000) / 1000, upper: cs.textTransform === 'uppercase'}; }),
    docWidth: document.documentElement.scrollWidth,
  };
};

/** Which platform face renders Hangul / Latin for an element's inherited style (probe spans appended and removed). */
async function facesOf(cdp, page, selectorExpr) {
  const res = {};
  for (const [script, text] of [['hangul', '한글 타이포그래피'], ['latin', 'Typography 2024']]) {
    const mark = await page.evaluate(([sel, text, script]) => {
      const el = eval(sel); if (!el) return false;
      const s = document.createElement('span'); s.dataset.probe = script; s.textContent = text; s.style.cssText = 'letter-spacing:inherit'; el.appendChild(s); el.offsetHeight; return true;
    }, [selectorExpr, text, script]);
    if (!mark) return null;
    const {root} = await cdp.send('DOM.getDocument', {depth: 0});
    const {nodeId} = await cdp.send('DOM.querySelector', {nodeId: root.nodeId, selector: `[data-probe=${script}]`});
    const {fonts} = await cdp.send('CSS.getPlatformFontsForNode', {nodeId});
    res[script] = fonts.map(f => ({face: f.postScriptName, family: f.familyName, glyphs: f.glyphCount}));
    await page.evaluate(() => document.querySelectorAll('[data-probe]').forEach(n => n.remove()));
  }
  return res;
}

const SELECTORS = {title: `document.querySelector('[data-m=title]')`, h2: `document.querySelector('[data-m=h2]')`, body: `document.querySelector('[data-m=body]')`, eyebrow: `document.querySelector('[data-m=eyebrow]')`};

async function measurePage(id, blueprint, width, shotPath) {
  const html = compile(blueprint).html;
  const page = await browser.newPage({viewport: {width, height: shotPath ? (width > 600 ? 1100 : 1500) : (width > 600 ? 900 : 844)}, deviceScaleFactor: width > 600 ? 1 : 2});
  await page.emulateMedia({reducedMotion: 'reduce'}); // the kit's reduced-motion rule drops entrance animations, so captures show the settled page
  await page.setContent(html, {waitUntil: 'load'});
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(50);
  const m = await page.evaluate(MEASURE);
  const cdp = await page.context().newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  m.faces = {};
  for (const [k, sel] of Object.entries(SELECTORS)) m.faces[k] = await facesOf(cdp, page, sel);
  if (shotPath) await page.screenshot({path: shotPath, clip: {x: 0, y: 0, width, height: width > 600 ? 1100 : 1500}});
  await cdp.detach(); await page.close();
  return {id, width, typography: blueprint.typography, scale: blueprint.scale, weightAxis: blueprint.weight, catalogVersion: blueprint.catalogVersion, ...m};
}

const rows = [];
if (shots) await mkdir(path.join(out, 'shots'), {recursive: true});
for (const t of templateList) for (const w of WIDTHS) {
  const b = createBlueprint(t.id);
  rows.push(await measurePage(t.id, b, w, shots && SAMPLES.includes(t.id) ? path.join(out, 'shots', `${t.id}-${w}.png`) : null));
}
await writeFile(path.join(out, 'examples.json'), JSON.stringify(rows, null, 1) + '\n');

// Same content (saas-landing and blog-post), every preset: isolates the typography axis from content.
if (matrix) {
  const mrows = [];
  for (const base of ['saas-landing', 'blog-post']) for (const typography of TYPE_IDS) for (const w of WIDTHS) {
    const b = {...createBlueprint(base), typography};
    mrows.push(await measurePage(`${base}@${typography}`, b, w, null));
  }
  await writeFile(path.join(out, 'preset-matrix.json'), JSON.stringify(mrows, null, 1) + '\n');
}

// Stack-level pairing: for each named stack, the face used for Hangul vs Latin and their relative glyph metrics.
{
  const page = await browser.newPage(); await page.setContent('<canvas id=c></canvas><p id=p></p>');
  const cdp = await page.context().newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const stacks = [];
  const BASE = {'ref:apple-sd-gothic-neo': '"Apple SD Gothic Neo"', 'ref:applemyungjo': '"AppleMyungjo"'};
  for (const [name, stack] of Object.entries({...BASE, ...STACKS})) {
    const metrics = await page.evaluate(stack => {
      const ctx = document.getElementById('c').getContext('2d'); ctx.font = `400 100px ${stack}`;
      const bb = ch => { const m = ctx.measureText(ch); return {asc: Math.round(m.actualBoundingBoxAscent), adv: Math.round(m.width)}; };
      return {xHeight: bb('x').asc, capHeight: bb('H').asc, hangulGlyph: bb('한').asc, hangulAdvance: bb('한').adv, digitAdvance: bb('0').adv, digitHeights: ['0','1','2','3','4','5','6','7','8','9'].map(d => bb(d).asc), lnumHeights: (ctx.fontVariantNumeric = 'lining-nums', ['0','3','4','5','7','9'].map(d => bb(d).asc))};
    }, stack);
    const faces = {};
    for (const weight of [400, 700]) for (const [script, text] of [['hangul', '한글'], ['latin', 'Ag']]) {
      await page.evaluate(([stack, weight, text]) => { const p = document.getElementById('p'); p.style.cssText = `font:${weight} 40px ${stack}`; p.textContent = text; p.offsetHeight; }, [stack, weight, text]);
      const {root} = await cdp.send('DOM.getDocument', {depth: 0}); const {nodeId} = await cdp.send('DOM.querySelector', {nodeId: root.nodeId, selector: '#p'});
      faces[`${script}${weight}`] = (await cdp.send('CSS.getPlatformFontsForNode', {nodeId})).fonts.map(f => f.postScriptName).join('+');
    }
    const dh = metrics.digitHeights; stacks.push({stack: name, ...faces, ...metrics, digitToCap: Math.round(Math.min(...dh) / metrics.capHeight * 100) / 100, digitSpread: Math.max(...dh) - Math.min(...dh), hangulToXHeight: Math.round(metrics.hangulGlyph / metrics.xHeight * 100) / 100});
  }
  await writeFile(path.join(out, 'stacks.json'), JSON.stringify(stacks, null, 1) + '\n');
  await page.close();
}
await browser.close();
console.log(`measured ${rows.length} views -> ${path.relative(process.cwd(), out)}`);
