import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {planComposition} from '../src/composition.mjs';
import {readFileSync} from 'node:fs';
import {lintType} from '../src/typography.mjs';
import {lintSpacing} from '../src/spacing.mjs';
import {lintLayout} from '../src/layout.mjs';

const inputs = JSON.parse(readFileSync(new URL('../docs/evidence/context-rollout/inputs.json', import.meta.url)));
const sample = id => structuredClone(inputs.find(x => x.id === id).blueprint);

test('every catalog component has an explicit contextual or inherited contract and every visited node is traceable', () => {
  assert.deepEqual(Object.keys(catalog.compositionCoverage ?? {}).sort(), [...catalog.nodeTypes].sort());
  for (const coverage of Object.values(catalog.compositionCoverage)) {
    assert.ok(['contextual', 'inherited'].includes(coverage.mode));
    assert.ok(coverage.contracts.length && coverage.reason);
  }
  const seen = new Set();
  for (const {blueprint} of inputs) {
    const plan = planComposition(blueprint);
    const walk = n => {seen.add(n.type);assert.ok(plan.byNode.get(n).coverage, n.type);n.children?.forEach(walk);};
    walk(blueprint.tree);
  }
  assert.equal(seen.size, catalog.nodeTypes.length);
});

test('team biographies request readable cells instead of the mobile dense two-column floor', () => {
  const b = sample('long-team'), r = compile(b);
  const d = r.manifest.design.decisions.find(x => x.type === 'team');
  assert.ok(d?.flow.minCell >= 280);
  assert.equal(d.flow.dense, false);
  assert.match(r.html, /data-design-kind="team"/);
  assert.match(r.html, /<ul[^>]*data-flow-min="(?:280|320|360|400|480)"/);
  assert.match(r.css, /data-design-kind=team[^{}]*>ul[^{}]*\{[^}]*gap:var\(--kit-gap\)/);
});

test('aside layouts and media compositions query the allocated container', () => {
  const r = compile(sample('contained-gallery-masonry'));
  assert.match(r.html, /kit-layout-region"><div data-design-kind="aside"/);
  assert.match(r.css, /@container compose .*kit-aside/);
  assert.match(r.css, /container:kit gallery\/inline-size/);
  assert.match(r.css, /@container gallery /);
  assert.match(compile(sample('contained-gallery-showcase')).css, /@container gallery /);
});

test('pricing inside a supporting region uses a smaller inset while primary pricing keeps its hierarchy', () => {
  const r = compile(sample('contained-pricing'));
  const plans = r.manifest.design.decisions.filter(d => d.type === 'plan');
  assert.ok(plans.length > 0);
  assert.ok(plans.every(d => d.values.inset === 'insetS'));
  assert.ok(plans.every(d => d.facts.supporting === true));
  const main = compile(catalog.createBlueprint('saas-landing')).manifest.design.decisions.filter(d => d.type === 'plan');
  assert.ok(main.every(d => d.values.inset === 'insetL'));
});

test('extreme summary content reports finite budget saturation without truncation or content mutation', () => {
  const b = catalog.createBlueprint('dashboard-overview');
  const find = n => n.type === 'metric' ? n : n.children?.map(find).find(Boolean);
  const metric = find(b.tree); metric.value = '1234567890123456789012345678901234567890';
  const r = compile(b), d = r.manifest.design.decisions.find(d => d.type === 'metric');
  assert.ok(d.diagnostics?.some(x => x.code === 'CONTENT_BUDGET_LIMIT'));
  assert.ok(r.html.includes(metric.value));
  assert.equal(metric.value.length, 40);
});

test('rollout examples compile deterministically within the existing type, spacing and layout vocabularies', () => {
  for (const {id, blueprint} of inputs) {
    const r = compile(blueprint);
    assert.deepEqual([...lintType(r.css), ...lintSpacing(r.css), ...lintLayout(r.css)], [], id);
    assert.deepEqual(compile(structuredClone(blueprint)), r, id);
  }
});
