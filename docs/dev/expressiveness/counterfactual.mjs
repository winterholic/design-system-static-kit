// 반사실 실험: axisBans를 비운 src 복사본(/tmp/expr/nb/src, src/**는 수정하지 않음)으로 금지 조합을 실제로 렌더해 결함이 측정되는지 본다.
// 결함이 측정되면 그 금지는 "막는 것이 맞다", 측정되지 않으면 "취향 또는 근거 약함" 후보다.
import {chromium} from 'playwright';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {compile as compileNB} from '/tmp/expr/nb/src/compiler.mjs';
import {compile as compileREAL, validateBlueprint} from '../../../src/compiler.mjs';
const load = async id => JSON.parse(await readFile(new URL(`./cases/${id}.json`, import.meta.url), 'utf8'));
const tests = [
  {ban: 'X01', base: '05-image-product', set: {shell: 'dock', density: 'compact'}, icons: true},
  {ban: 'X02', base: '06-docs-reference', set: {width: 'narrow'}},
  {ban: 'X03', base: '10-swiss-type', set: {shell: 'masthead', width: 'full'}},
  {ban: 'X04', base: '02-asym-portfolio', set: {elevation: 'hard', backdrop: 'gradient'}},
  {ban: 'X05', base: '07-event-conference', set: {elevation: 'glow'}},
  {ban: 'X06', base: '09-brutalist-zine', set: {scale: 'dramatic'}},
  {ban: 'X06b', base: '15-devtool-terminal', set: {scale: 'dramatic'}},
  {ban: 'X07', base: '07-event-conference', set: {radius: 'bubble', density: 'compact'}},
  {ban: 'X08', base: '02-asym-portfolio', set: {shell: 'minimal', footer: 'columns'}},
  {ban: 'X09', base: '06-docs-reference', set: {icon: 'line-fine', density: 'compact'}},
  {ban: 'X10', base: '15-devtool-terminal', set: {ornament: 'dots'}},
  {ban: 'X11', base: '14-campaign-poster', set: {elevation: 'flat'}},
];
const browser = await chromium.launch(); const out = [];
await mkdir(new URL('./counterfactual/', import.meta.url), {recursive: true});
for (const t of tests) {
  const b = {...(await load(t.base)), ...t.set}; if (t.icons) b.chrome = {...b.chrome, nav: b.chrome.nav.map((n, i) => ({...n, icon: ['bag', 'tag', 'star'][i]}))};
  const rejected = validateBlueprint(b).errors.map(e => e.code + ':' + e.message.slice(0, 20)).filter(x => x.startsWith('AXIS_BAN'));
  let html; try { html = compileNB(b).html; } catch (e) { out.push({...t, error: e.message.split('\n')[0]}); continue; }
  const dir = `/tmp/expr/cf-${t.ban}.html`; await writeFile(dir, html);
  const row = {ban: t.ban, errors: validateBlueprint(b).errors.filter(e => !e.code.startsWith('AXIS_BAN')).map(e => e.code), base: t.base, set: t.set, realValidatorRejects: rejected.length > 0, widths: {}};
  for (const w of [1280, 390]) {
    const ctx = await browser.newContext({viewport: {width: w, height: 900}}); const page = await ctx.newPage();
    await page.goto(pathToFileURL(dir).href); await page.waitForTimeout(300);
    row.widths[w] = await page.evaluate(() => {
      const de = document.documentElement, m = {overflowX: de.scrollWidth - de.clientWidth};
      // 가로로 넘치는 요소(텍스트 잘림 후보)
      m.wide = [...document.querySelectorAll('h1,h2,h3,.kit-hero h2,.kit-card h3')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > de.clientWidth + 1).map(e => e.tagName + ':' + e.textContent.trim().slice(0, 14));
      const nav = [...document.querySelectorAll('.kit-nav a')].map(a => Math.round(a.getBoundingClientRect().height));
      m.navTargetMinH = nav.length ? Math.min(...nav) : null;
      const p = document.querySelector('.kit-prose p, .kit-hero p, p'); if (p) { const r = p.getBoundingClientRect(); m.paraW = Math.round(r.width); m.paraChars = Math.round(r.width / (parseFloat(getComputedStyle(p).fontSize) * 0.55)); }
      const main = document.querySelector('main'); if (main) m.mainW = Math.round(main.getBoundingClientRect().width);
      const card = document.querySelector('.kit-card, .kit-metric'); if (card) { const c = getComputedStyle(card); m.card = {pad: c.paddingLeft, radius: c.borderRadius, shadow: c.boxShadow.slice(0, 50), border: c.borderTopColor + ' ' + c.borderTopWidth}; }
      const ic = document.querySelector('svg.kit-icon, .kit-icon'); if (ic) { const r = ic.getBoundingClientRect(); m.icon = {size: Math.round(r.width), sw: getComputedStyle(ic).strokeWidth || ic.getAttribute('stroke-width')}; }
      return m;
    });
    if (w === 1280 || t.ban.startsWith('X06')) await page.screenshot({path: new URL(`./counterfactual/${t.ban}-${w}.jpg`, import.meta.url).pathname, type: 'jpeg', quality: 70, fullPage: false});
    await ctx.close();
  }
  out.push(row); console.log(t.ban, JSON.stringify(row.widths).slice(0, 400), 'real rejects:', row.realValidatorRejects);
}
await writeFile(new URL('./counterfactual-results.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
await browser.close();
