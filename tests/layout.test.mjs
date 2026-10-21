import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOW, bestCols, flowColumns, flowOrphans, flowCSS, bentoPlan, isVisualCell, layoutMarkdown, lintLayout, PRIMITIVES} from '../src/layout.mjs';
import {chunks} from '../src/styles/chunks.mjs';
import {polish, polishCore} from '../src/styles/polish.mjs';
import {coreCSS, tailCSS} from '../src/styles/base.mjs';
import {shellCSS} from '../src/styles/shells.mjs';
import {axes} from '../src/catalog.mjs';
import {flowAttrs} from '../src/render/util.mjs';
import {createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

test('no item count from 2 to 12 leaves a single orphan on the last row at any container width (plain, span and dense flows)', () => {
  for (const cap of [2, 3, 4]) for (let n = 2; n <= FLOW.maxItems; n++) {
    for (const [name, opts] of [['plain', {}], ['span', {span: true}], ['dense', {dense: true, span: true}]]) {
      assert.deepEqual(flowOrphans(n, cap, opts), [], `n=${n} cap=${cap} ${name}: ${JSON.stringify(flowColumns(n, cap, opts))}`);
    }
  }
});

test('column counts never exceed the cap or what the container width allows, and never drop a cell below the minimum width', () => {
  for (const cap of [2, 3, 4]) for (let n = 2; n <= FLOW.maxItems; n++) flowColumns(n, cap).forEach((c, i) => {
    assert.ok(c >= 1 && c <= cap && c <= Math.min(n, i + 1), `n=${n} cap=${cap} band=${FLOW.bands[i]} cols=${c}`);
    if (c > 1) assert.ok((FLOW.bands[i] - FLOW.gap * (c - 1)) / c >= FLOW.minCell - 1, `cell too narrow at ${FLOW.bands[i]}px with ${c} columns`);
  });
});

test('bestCols picks full rows first, and the well-known cases are what a designer would choose', () => {
  assert.equal(bestCols(3, 3), 3); assert.equal(bestCols(4, 3), 2); assert.equal(bestCols(4, 4), 4); assert.equal(bestCols(5, 4), 3);
  assert.equal(bestCols(6, 4), 3); assert.equal(bestCols(7, 4), 4); assert.equal(bestCols(3, 2), 1); assert.equal(bestCols(3, 2, {span: true}), 2);
  assert.equal(bestCols(2, 4), 2); assert.equal(bestCols(1, 4), 1);
});

test('generated flow CSS is container-based, covers every count, and renders attributes the CSS can match', () => {
  const css = flowCSS();
  assert.match(css, /container:kit\/inline-size/);
  assert.match(css, /@container kit \(min-width:768px\)/);
  for (const n of [2, 3, 7, 12]) assert.match(css, new RegExp(`\\[data-n="${n}"\\]\\[data-cap="3"\\]`));
  assert.equal(flowAttrs(1), ''); assert.equal(flowAttrs(13), '');
  assert.equal(flowAttrs(3, 3), ' data-flow data-n="3" data-cap="3"');
  assert.equal(flowAttrs(3, 2, 'dense'), ' data-flow data-n="3" data-cap="2" data-dense');
  assert.equal(flowAttrs(5, 3, 'span'), ' data-flow data-n="5" data-cap="3" data-span');
  const page = compile(createBlueprint('saas-landing')).html;
  assert.match(page, /<div class="kit-plans" data-count="3" data-flow data-n="3" data-cap="3">/);
});

test('bento: only cells with a picture grow to 2x2; every row fills the four columns', () => {
  const card = extra => ({type: 'card', title: 't', body: 'b', ...extra}), metric = {type: 'metric', label: 'l', value: '1'}, quote = {type: 'quote', quote: 'q', author: 'a'}, media = {type: 'media', kind: 'photo', ratio: '4:3', alt: 'x'};
  assert.ok(isVisualCell(media) && isVisualCell(card({visual: 'chart'})) && !isVisualCell(card()) && !isVisualCell(metric) && !isVisualCell(quote));
  const span = cell => ({feature: 2, two: 2, one: 1, full: 4})[cell];
  const cases = [[media, metric, quote], [card({visual: 'chart'}), metric, quote, card()], [card({visual: 'chart'}), metric, quote, card(), metric], [media, metric, quote, card(), metric, quote], [card(), metric, quote], [card(), card(), card(), card()], [card(), metric, quote, card(), metric], [card(), metric, quote, card(), metric, quote]];
  for (const children of cases) {
    const plan = bentoPlan(children);
    assert.equal(plan.length, children.length);
    assert.deepEqual([...plan.map(p => p.index)].sort(), children.map((_, i) => i), 'every child placed once');
    const feature = plan.filter(p => p.cell === 'feature');
    assert.ok(feature.length <= 1 && (feature.length === 0 || plan[0].cell === 'feature'), 'the feature cell is first');
    assert.equal(feature.length === 1, children.some(isVisualCell), 'a feature cell exists only when a visual cell does');
    // 4열 격자의 줄 채움: 큰 칸은 2줄을 차지한다(2칸 × 2줄 = 4칸 면적)
    const area = plan.reduce((sum, p) => sum + span(p.cell) * (p.cell === 'feature' ? 2 : 1), 0);
    assert.equal(area % 4, 0, `plan fills whole rows: ${plan.map(p => p.cell).join(',')} area ${area}`);
  }
});

test('docs/layout.md is generated and names every primitive', () => {
  const md = layoutMarkdown();
  for (const p of PRIMITIVES) assert.ok(md.includes(p.name), p.id);
  assert.match(md, /격자 흐름/);
});

test('lintLayout: equal-column grids are declared only by the flow primitive and the listed frames', () => {
  const css = [coreCSS, tailCSS, polishCore, ...Object.values(chunks), ...Object.values(polish), flowCSS()];
  for (const shell of axes.shell) for (const footer of axes.footer) css.push(shellCSS({shell, footer}));
  const bad = [], seen = new Set();
  for (const c of css) for (const v of lintLayout(c)) { const k = v.selector + v.value; if (!seen.has(k)) { seen.add(k); bad.push(v.selector + ' => ' + v.value); } }
  assert.deepEqual(bad, []);
  assert.ok(css.join('').match(/grid-template-columns:repeat\(/g).length > 30, 'proof of scan: repeat() grids are read');
  // negative controls: a part that hand-rolls its own column count is reported
  assert.equal(lintLayout('.kit-newpart ul{grid-template-columns:repeat(3,minmax(0,1fr))}').length, 1);
  assert.equal(lintLayout('.kit-newpart{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}').length, 1);
  assert.equal(lintLayout('.kit-newpart{grid-template-columns:200px 1fr}').length, 0, 'fixed two-track frames are not equal-column grids');
  assert.equal(lintLayout('.kit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}').length, 0);
  assert.equal(lintLayout('[data-flow][data-n="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}').length, 0);
});
