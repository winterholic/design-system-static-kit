// 부품 전수 시트: 모든 부품(변형별)을 한 페이지에 늘어놓고 폭별로 찍는다. 눈으로 어색한 곳을 찾는 도구.
// 사용: node scripts/design-qa/parts-sheet.mjs <outDir> [--theme id] [--w 390,1280] [--chunk 7] [--slice 1500] [--mode dark] [--probe]
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {compile, validateBlueprint} from '../../src/compiler.mjs';
import {createBlueprint, nodeSpecs, nodeTypes, themes} from '../../src/catalog.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';

const [out, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : null; };
const theme = opt('--theme') ?? 'workspace', widths = (opt('--w') ?? '390,1280').split(',').map(Number), chunk = Number(opt('--chunk') ?? 7), slice = Number(opt('--slice') ?? 1500);
await mkdir(out, {recursive: true});

/** 부품 하나의 예시 노드(자식 전용 부품은 부모 예시 안에서 찾는다). */
export function exampleOf(type) {
  const spec = nodeSpecs[type];
  if (spec.example) return structuredClone(spec.example);
  const parent = nodeTypes.find(t => nodeSpecs[t].example && nodeSpecs[t].children?.includes(type));
  return parent ? structuredClone(nodeSpecs[parent].example.children?.find(c => c.type === type) ?? null) : null;
}
export function partItems() {
  const items = [];
  for (const type of nodeSpecs.page.children) {
    if (type === 'page-header') continue;
    const base = exampleOf(type); if (!base) continue;
    const variants = nodeSpecs[type].fields.variant?.enum;
    if (type === 'toc') continue;
    if (variants && type !== 'hero') for (const v of variants) items.push({label: type + ' · ' + v, node: {...structuredClone(base), variant: v, ...(type === 'card' && ['media', 'horizontal'].includes(v) ? {visual: 'photo'} : {}), ...(type === 'card' && v === 'link' ? {action: {label: '자세히 보기', href: '#main', variant: 'secondary'}} : {})}});
    else items.push({label: type, node: base});
  }
  return items;
}
const heroVariants = nodeSpecs.hero.fields.variant.enum;
const pages = [];
const items = partItems().filter(i => !i.label.startsWith('hero'));
for (let i = 0; i < items.length; i += chunk) pages.push({name: 'parts-' + String(i / chunk + 1).padStart(2, '0'), items: items.slice(i, i + chunk)});
for (const v of heroVariants) { const n = {...exampleOf('hero'), variant: v}; pages.push({name: 'hero-' + v, items: [{label: 'hero · ' + v, node: n}]}); }

const br = await chromium.launch(), report = [];
for (const p of pages) {
  const b = createBlueprint('about-team', theme);
  if (opt('--mode')) b.mode = opt('--mode');
  let uid = 0;
  const uniq = n => { if (n.type === 'form') for (const f of n.fields) f.id = f.id + '-' + (++uid); for (const c of n.children ?? []) uniq(c); return n; };
  b.tree = {type: 'page', children: [{type: 'page-header', title: p.name}, ...p.items.flatMap(i => i.label.startsWith('hero') ? [i.node] : [{type: 'divider', label: i.label.slice(0, 40)}, uniq(i.node)])]};
  const v = validateBlueprint(b);
  if (!v.valid) { console.log('INVALID', p.name, JSON.stringify(v.errors.slice(0, 2))); continue; }
  const html = compile(b).html;
  for (const w of widths) {
    const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
    await page.setContent(html, {waitUntil: 'load'});
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, k = 1; y < h; y += slice, k++) await page.screenshot({path: `${out}/${p.name}-${w}-${k}.png`, fullPage: true, clip: {x: 0, y, width: w, height: Math.min(slice, h - y)}});
    if (rest.includes('--probe')) {
      const t = await page.evaluate(textProbe, TEXT_PROBE_OPTIONS), s = await page.evaluate(spacingProbe, PROBE_OPTIONS);
      for (const f of [...t.findings, ...s.findings]) report.push(`${p.name}@${w} ${f.code} ${f.at} ${f.detail}`);
    }
    await ctx.close();
  }
  console.log(p.name, p.items.map(i => i.label).join(' | '));
}
if (report.length) console.log(report.join('\n'));
await br.close();
