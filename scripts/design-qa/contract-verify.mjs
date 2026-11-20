// 변형 결과 계약(V01~V04)의 예측을 실제 브라우저 DOM과 맞춰 본다. 계약은 트리 비교로 위반을 예측하므로(src/catalog/variant-contracts.mjs),
// 예측이 렌더 결과와 어긋나면 계약이 틀린 것이다. 템플릿마다 계약이 닿는 슬롯의 옵션 하나씩을 1440px에서 기본 구성과 나란히 재서 혼동표를 만든다.
// 사용: node scripts/design-qa/contract-verify.mjs [--out docs/evidence/variants/contract-verify.json] [--workers 6]
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {templateList, createBlueprint, layoutOptionsOf} from '../../src/catalog.mjs';
import {compile} from '../../src/compiler.mjs';
import {CLAIMS} from './quality-claims.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const out = opt('--out', null), workers = Number(opt('--workers', 6));
const q = id => CLAIMS.find(c => c.id === id).fn;
const MEASURE = {Q11: q('Q11'), Q12: q('Q12')};

/** 한 페이지에서 네 계약에 필요한 DOM 값을 한꺼번에 잰다. 직렬화되므로 외부 값을 쓰지 않는다. */
const probe = ([kpiSrc, alignSrc]) => {
  const kpi = new Function('return (' + kpiSrc + ')')()(), align = new Function('return (' + alignSrc + ')')()();
  return {heroVisual: !!document.querySelector('.kit-hero-visual'), cards: [...document.querySelectorAll('.kit-card')].map(c => c.dataset.variant ?? 'basic'), kpi, align};
};

const SLOTS = {hero: 'V01', cards: 'V02', columns: 'V03', heads: 'V04', intro: 'V04'};
const jobs = [];
for (const t of templateList) {
  jobs.push({t, slot: null, option: null, layout: {}});
  for (const s of layoutOptionsOf(t.id).filter(s => SLOTS[s.id])) for (const o of s.options) jobs.push({t, slot: s.id, option: o, layout: {[s.id]: o.id}});
}
const measured = new Map();
let next = 0;
const br = await chromium.launch();
const run = async () => {
  const ctx = await br.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
  for (;;) {
    const job = jobs[next++]; if (!job) break;
    await page.setContent(compile(createBlueprint(job.t.id, undefined, undefined, {layout: job.layout})).html, {waitUntil: 'load'});
    measured.set(job.slot ? `${job.t.id}~${job.slot}:${job.option.id}` : job.t.id, await page.evaluate(probe, [MEASURE.Q11.toString(), MEASURE.Q12.toString()]));
  }
  await ctx.close();
};
await Promise.all(Array.from({length: workers}, run));
await br.close();

/** DOM에서 읽은 위반: 기본 구성보다 나빠졌는가. */
const violated = {
  V01: (a, b) => a.heroVisual && !b.heroVisual,
  V02: (a, b) => a.cards.length > 0 && a.cards.length === b.cards.length && a.cards.filter((v, i) => v !== b.cards[i]).length / a.cards.length < 0.75,
  V03: (a, b) => !!b.kpi && b.kpi.items <= 4 && (!a.kpi || b.kpi.rows > a.kpi.rows),
  V04: (a, b) => (b.align?.mismatched ?? 0) > (a.align?.mismatched ?? 0),
};
const matrix = Object.fromEntries(['V01', 'V02', 'V03', 'V04'].map(id => [id, {both: 0, predictedOnly: 0, measuredOnly: 0, neither: 0, predictedOnlyExamples: [], measuredOnlyExamples: []}]));
for (const j of jobs.filter(j => j.slot)) {
  const rule = SLOTS[j.slot], key = `${j.t.id}~${j.slot}:${j.option.id}`, m = matrix[rule];
  const predicted = j.option.rules.some(r => r.id === rule), actual = violated[rule](measured.get(j.t.id), measured.get(key));
  if (predicted && actual) m.both++; else if (predicted) { m.predictedOnly++; m.predictedOnlyExamples.push(key); } else if (actual) { m.measuredOnly++; m.measuredOnlyExamples.push(key); } else m.neither++;
}
for (const [id, m] of Object.entries(matrix)) console.log(id, `predicted∧measured ${m.both} · predicted only ${m.predictedOnly} · measured only ${m.measuredOnly} · neither ${m.neither}`);
for (const [id, m] of Object.entries(matrix)) { if (m.predictedOnly) console.log(id, 'predicted only:', m.predictedOnlyExamples.slice(0, 8).join(', ')); if (m.measuredOnly) console.log(id, 'measured only:', m.measuredOnlyExamples.slice(0, 8).join(', ')); }
if (out) writeFileSync(out, JSON.stringify({date: new Date().toISOString().slice(0, 10), width: 1440, options: jobs.filter(j => j.slot).length, matrix}, null, 1));
