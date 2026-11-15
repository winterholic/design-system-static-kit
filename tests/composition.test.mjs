import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as catalog from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {contextSamples} from '../scripts/design-qa/context-samples.mjs';
import {selectDesign, compositionCSS, planComposition} from '../src/composition.mjs';
import {flowBreakpoints, bestCols, lintLayout} from '../src/layout.mjs';
import {lintType} from '../src/typography.mjs';
import {roleSizes} from '../src/typography.mjs';
import {lintSpacing} from '../src/spacing.mjs';

test('new catalogs expose versioned, deterministic composition decisions without mutating the blueprint', () => {
  const b = catalog.createBlueprint('dashboard-overview'), original = structuredClone(b);
  assert.equal(b.catalogVersion, '2.2.0');
  const result = compile(b);
  assert.equal(result.manifest.design.version, '1.0.0');
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
  for (const [id, hash] of Object.entries(hashes)) {
    const b = catalog.createBlueprint(id); b.catalogVersion = '2.1.0';
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
  assert.equal(upgraded.catalogVersion, '2.2.0');
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
