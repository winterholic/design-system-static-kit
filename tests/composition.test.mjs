import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as catalog from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {renderChart} from '../src/render/chart.mjs';
import {contextSamples} from '../scripts/design-qa/context-samples.mjs';
import {selectDesign, compositionCSS, planComposition} from '../src/composition.mjs';
import {flowBreakpoints, bestCols, lintLayout} from '../src/layout.mjs';
import {lintType} from '../src/typography.mjs';
import {roleSizes} from '../src/typography.mjs';
import {lintSpacing} from '../src/spacing.mjs';

test('new catalogs expose versioned, deterministic composition decisions without mutating the blueprint', () => {
  const b = catalog.createBlueprint('dashboard-overview'), original = structuredClone(b);
  assert.equal(b.catalogVersion, '2.3.0');
  const result = compile(b);
  assert.equal(result.manifest.design.version, '1.2.0');
  assert.ok(result.manifest.design.decisions.length > 4);
  for (const d of result.manifest.design.decisions) {
    assert.match(d.path, /^\$\.tree/);
    assert.ok(d.applied.length > 0);
    assert.ok(Object.keys(d.sources).length > 0);
  }
  assert.deepEqual(compile(structuredClone(b)), result);
  assert.deepEqual(b, original);
});

test('all 2.1 templates preserve the original complete compiler output byte for byte', () => {
  const {hashes} = JSON.parse(readFileSync(new URL('../docs/evidence/context/legacy-hashes.json', import.meta.url)));
  // Compatibility is about the exact saved inputs. Current 2.2 preset content
  // can be corrected without pretending that it is the original 2.1 input.
  const {blueprints} = JSON.parse(readFileSync(new URL('../docs/evidence/context/legacy-blueprints.json', import.meta.url)));
  for (const [id, hash] of Object.entries(hashes)) {
    const b = structuredClone(blueprints[id]);
    const actual = createHash('sha256').update(JSON.stringify(compile(b))).digest('hex');
    assert.equal(actual, hash, id);
  }
});

test('long summary content asks the existing flow primitive for more room instead of shrinking the KPI below its label', () => {
  const samples = contextSamples();
  const short = compile(samples.find(x => x.id === 'dashboard-overview').blueprint);
  const long = compile(samples.find(x => x.id === 'long-summary').blueprint);
  const grid = r => r.manifest.design.decisions.find(x => x.type === 'grid');
  assert.ok(grid(long).flow.minCell > grid(short).flow.minCell);
  assert.equal(grid(long).flow.dense, false);
  assert.ok(long.css.includes(`min-width:${2 * grid(long).flow.minCell + grid(long).flow.gap}px`));
  assert.match(long.html, /data-design-role="summary"/);
  assert.match(long.html, /class="kit-layout-region"><div data-design-kind="grid"/);
});

test('mobile horizontal cards with footers release their thumbnail width inside the assigned card', () => {
  for (const id of ['blog-index', 'news-home']) {
    const r = compile(catalog.createBlueprint(id));
    const cards = [...r.html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(([markup]) => markup);
    const targets = cards.filter(markup => /^<article\b[^>]*\bclass="[^"]*\bkit-card\b[^>]*\bdata-variant="horizontal"/.test(markup) && /^<article\b[^>]*\bdata-design-kind="card"/.test(markup));
    assert.ok(targets.length > 0, `${id}: compiled fixture has horizontal cards on a single article node`);
    const oldSelectorMatches = targets.filter(markup => markup.slice(markup.indexOf('>') + 1).includes('class="kit-card"')).length;
    assert.equal(oldSelectorMatches, 0, `${id}: old ancestor/descendant selector does not match its same-node target`);
    const selector = '[data-design-kind=card][data-variant=horizontal]:has(.kit-card-foot) .kit-card-media';
    const matchingCards = targets.filter(markup => markup.includes('class="kit-card-foot"') && markup.includes('class="kit-card-media"'));
    assert.ok(matchingCards.length > 0, `${id}: ${selector} matches ${matchingCards.length} compiled target cards`);
    const rule = /@media\(max-width:560px\)\{[^}]*\[data-design-kind=card\]\[data-variant=horizontal\]:has\(\.kit-card-foot\) \.kit-card-media\{width:100%\}/;
    assert.ok(rule.test(r.css), `${id}: shared mobile correction uses the same-node card selector`);
  }
});

test('context charts let the SVG viewBox scale with the allocated width instead of letterboxing at a fixed height', () => {
  for (const id of ['dashboard-analytics', 'bank-product', 'hr-people']) {
    const r = compile(catalog.createBlueprint(id));
    assert.ok(/\[data-design-kind=chart\] \.kit-chart-body>svg\{[^}]*max-height:340px/.test(r.css), `${id}: chart cap remains 340px`);
    assert.ok(/<svg viewBox=\"0 0 360 240\" preserveAspectRatio=\"none\"/.test(r.html), `${id}: cartesian plot fills its bounded SVG box`);
    assert.ok(r.css.includes('container:chart/inline-size') && r.css.includes('transform:scaleX(calc(510px / 100cqw))'), `${id}: chart labels compensate for horizontal SVG stretching`);
    assert.match(r.html, /<details class=\"kit-chart-data\">[\s\S]*?<table>/, id);
  }
});

test('context line markers compensate horizontal SVG stretch while retaining all three series shapes', () => {
  const chart = {kind:'line',title:'마커',caption:'세 형상',categories:['하나','둘','셋'],series:[
    {name:'원',values:[1,3,2]}, {name:'사각',values:[2,1,3]}, {name:'마름모',values:[3,2,1]}
  ]};
  const rendered = renderChart(chart, 'marker-contract', {fillAssignedWidth:true});
  assert.match(rendered, /<div class="kit-chart-plot"><svg/);
  assert.match(rendered, /<circle[^>]*class="ch-m"/);
  assert.match(rendered, /<rect[^>]*class="ch-m"/);
  assert.match(rendered, /<path d="[^"]+" class="ch-m"/);
  const css = compile(catalog.createBlueprint('dashboard-analytics')).css;
  assert.ok(css.includes('.kit-chart-body>.kit-chart-plot{min-width:0;max-width:100%;flex:1 1 280px;container:chart-svg/inline-size}') && /@container chart-svg \(min-width:510px\)\{\[data-design-kind=chart\] \.kit-chart-plot>svg:not\(\.ch-donut\) \.ch-m\{transform-box:fill-box;transform-origin:center;transform:scaleX\(calc\(510px \/ 100cqw\)\)\}\}/.test(css),
    'wide context charts reduce marker x geometry around each marker center');
});

test('narrow supporting aside charts retain asymmetric multi-series data and scale the full SVG width', () => {
  const b = catalog.createBlueprint('docs-reference');
  const findAside = n => {
    if (!n || typeof n !== 'object') return null;
    if (Array.isArray(n)) return n.map(findAside).find(Boolean) ?? null;
    if (n.type === 'aside') return n;
    return Object.values(n).map(findAside).find(Boolean) ?? null;
  };
  const aside = findAside(b.tree);
  assert.ok(aside, 'fixture supplies a narrow supporting region');
  const chart = {type:'chart',title:'비대칭 테스트',caption:'전체 값 유지',kind:'bars-h',categories:['가','나','다'],series:[
    {name:'기본',values:[12,2,7]}, {name:'변형',values:[1,18,3]}, {name:'세 번째',values:[4,6,25]}
  ]};
  aside.children[1] = chart;
  const r = compile(b);
  assert.match(r.css, /\.kit-chart svg\{width:100%/);
  assert.ok(/\[data-design-kind=chart\] \.kit-chart-body>svg\{[^}]*max-height:340px/.test(r.css), 'aside chart retains the bounded SVG height');
  assert.ok(/<svg viewBox=\"0 0 360 240\" preserveAspectRatio=\"none\"/.test(r.html), 'aside cartesian plot fills its bounded SVG box');
  for (const value of chart.series.flatMap(s=>s.values)) assert.ok(r.html.includes(`<td>${value}</td>`), `table retains ${value}`);
  const rendered = renderChart(chart, 'asymmetric');
  for (const value of chart.series.flatMap(s=>s.values)) assert.ok(rendered.includes(`>${value}<`), `SVG/table retain ${value}`);
  for (const i of [1, 2, 3]) assert.ok(rendered.includes(`fill:var(--kit-chart${i})`), `series ${i} retains its visual distinction`);
});

test('semantic card roles override generic presentation but preserve catalog variants', () => {
  const b = catalog.createBlueprint('product-listing');
  const result = compile(b);
  const cards = result.manifest.design.decisions.filter(x => x.type === 'card');
  assert.ok(cards.length > 0);
  assert.ok(cards.every(x => x.values.role === 'product' && x.values.titleRole === 'body'));
  assert.ok(cards.every(x => x.applied.includes('C07')));
});

test('contained forms and splits use declared container rules with traceable decisions', () => {
  for (const id of ['contained-form', 'contained-split']) {
    const b = contextSamples().find(x => x.id === id).blueprint, r = compile(b);
    assert.ok(validateBlueprint(b).valid);
    assert.match(r.css, /container:kit compose\/inline-size/);
    if (id === 'contained-form') {
      assert.match(r.css, /@container form/);
      assert.ok(r.manifest.design.decisions.find(x => x.type === 'form').container.minField >= 220);
    } else assert.match(r.css, /@container compose/);
  }
});

test('catalog upgrade is explicit, lossless and does not repair invalid content', () => {
  assert.equal(typeof catalog.migrateBlueprint, 'function');
  const b = catalog.createBlueprint('signup'); b.catalogVersion = '2.1.0';
  const upgraded = catalog.migrateBlueprint(b);
  assert.equal(upgraded.catalogVersion, '2.3.0');
  assert.deepEqual({...upgraded, catalogVersion: '2.1.0'}, b);
  const invalid = structuredClone(b); invalid.tree.children[1].style = 'padding:0';
  assert.equal(validateBlueprint(catalog.migrateBlueprint(invalid)).valid, false);
  assert.equal(validateBlueprint({...b, catalogVersion: '9.9.9'}).valid, false);
});

test('declarative design rules are serializable and consumer input cannot replace them', () => {
  assert.ok(Array.isArray(catalog.compositionRules));
  assert.deepEqual(JSON.parse(JSON.stringify(catalog.compositionRules)), catalog.compositionRules);
  assert.ok(Object.isFrozen(catalog.compositionRules));
  const b = catalog.createBlueprint('signup'); b.design = {role: 'custom', padding: '100px'};
  assert.equal(validateBlueprint(b).valid, false);
});

test('priority is independent of table order and equal-priority conflicts fail explicitly', () => {
  const rules = [{id:'base',priority:10,when:{type:'card'},set:{role:'feature'}},{id:'specific',priority:20,when:{type:'card',semantic:'product'},set:{role:'product'}}];
  const facts = {type:'card',semantic:'product'};
  assert.deepEqual(selectDesign(facts,rules),selectDesign(facts,[...rules].reverse()));
  assert.equal(selectDesign(facts,rules).sources.role,'specific');
  assert.throws(()=>selectDesign(facts,[...rules,{id:'conflict',priority:20,when:{type:'card'},set:{role:'other'}}]),/Composition conflict/);
});

test('contextual CSS stays inside the existing type, spacing and layout contracts', () => {
  for (const {id,blueprint} of contextSamples()) {
    const r = compile(blueprint);
    assert.deepEqual([...lintType(r.css),...lintSpacing(r.css),...lintLayout(r.css)],[],id);
  }
});

test('content flow breakpoints include the actual chosen gap and allow only fitting columns', () => {
  for (const cell of [160,200,240,280,320,360,400,480]) for (const gap of [12,16,24,32]) {
    const bands = flowBreakpoints(cell,gap);
    for (let n=2;n<=12;n++) for (let i=1;i<4;i++) {
      const cols=bestCols(n,i+1,{span:true});
      assert.ok((bands[i]-(cols-1)*gap)/cols>=cell);
    }
  }
});

test('hero columns are intrinsic to their own content box and carry a content-derived minimum', () => {
  const b = catalog.createBlueprint('saas-landing'), r=compile(b);
  assert.match(r.html,/data-hero-min="\d+"/);
  assert.match(r.css,/\.kit-hero\[data-design-kind=hero\]\[data-visual\].*repeat\(auto-fit,minmax\(min\(100%,var\(--kit-hero-min\)\)/);
  const d=planComposition(b).decisions.find(x=>x.type==='hero');
  assert.ok(d.container.minCell>=320);
});

test('commerce section headings remain subordinate to the compact commerce page title', () => {
  for (const id of ['beauty-detail','realty-detail','stay-detail']) {
    const b=catalog.createBlueprint(id),design=compile(b).manifest.design,sizes=roleSizes(b);
    const page=design.decisions.find(d=>d.type==='page-header');
    for (const section of design.decisions.filter(d=>d.type==='section')) assert.ok(sizes[section.values.titleRole].max<=sizes[page.values.titleRole].max,id);
  }
});

test('summary leading and hero framing carry explicit policies for glyph room and contained media', () => {
  const summary=compile(catalog.createBlueprint('campaign-donate')).manifest.design.decisions.find(d=>d.type==='metric');
  assert.equal(summary.values.valueLeading,'sub');
  const hero=compile(catalog.createBlueprint('saas-landing','signal')).manifest.design.decisions.find(d=>d.type==='hero');
  assert.equal(hero.values.frameEdge,'contained');
});
