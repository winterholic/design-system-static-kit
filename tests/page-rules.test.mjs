import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as catalog from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

// 페이지 수준 규칙 P01~P04(docs/adr/0006-variant-contracts-and-page-rules.md). 입력은 노드가 아니라 Blueprint에서 유도한 페이지 사실이다.
// 진단 문서 4절 C1·C2·C3·C5의 재현이다. 2.3.0 이전 입력은 출력을 바이트 단위로 유지한다(legacy-2-3-hashes.json).
const evidence = name => JSON.parse(readFileSync(new URL('../docs/evidence/variants/' + name, import.meta.url), 'utf8'));
const walk = (nodes, fn) => { for (const n of nodes ?? []) { fn(n); walk(n.children, fn); } };
const find = (tree, type) => { const out = []; walk(tree, n => { if (n.type === type) out.push(n); }); return out; };
const page = result => result.manifest.design.page;
const tagsOf = (html, cls) => [...html.matchAll(new RegExp('<[a-z]+\\b[^>]*class="' + cls + '(?: [^"]*)?"[^>]*>', 'g'))].map(m => m[0]);
const attr = (tag, name) => new RegExp('\\s' + name + '="([^"]*)"').exec(tag)?.[1] ?? null;
const decisionsOf = (result, rule) => (page(result)?.decisions ?? []).filter(d => d.rule === rule);

test('page rules are a small ordered table over page facts, with the composition version bumped for them', () => {
  assert.equal(catalog.COMPOSITION_VERSION, '1.3.0');
  const rules = catalog.pageRules;
  assert.ok(Array.isArray(rules), 'catalog exports pageRules');
  assert.deepEqual(rules.map(r => r.id), ['P01', 'P02', 'P03', 'P04']);
  for (const r of rules) {
    assert.ok(r.reason.length > 20 && r.claim && r.source && Object.keys(r.when).length && Object.keys(r.set).length, r.id);
    for (const v of Object.values(r.when)) assert.ok(['string', 'boolean'].includes(typeof v) || Array.isArray(v), r.id + ' conditions are plain values, not expressions');
  }
  assert.deepEqual(rules.map(r => r.claim), ['Q13', 'Q06', 'Q10', 'Q07']);
});

test('P02 / Q06: a split or product hero without a visual renders as a text-led centred hero, and says so', () => {
  const b = catalog.createBlueprint('devtool-landing'), before = structuredClone(b);
  assert.equal(find(b.tree.children, 'hero')[0].variant, 'split'); assert.equal(find(b.tree.children, 'hero')[0].visual, undefined);
  const r = compile(b);
  assert.deepEqual(b, before, 'the Blueprint is never rewritten');
  const [d] = decisionsOf(r, 'P02');
  assert.ok(d, 'P02 decision recorded in manifest.design.page');
  assert.equal(d.declared, 'split'); assert.equal(d.applied, 'centered'); assert.match(d.path, /^\$\.tree\.children\[\d+\]$/);
  assert.equal(attr(tagsOf(r.html, 'kit-hero')[0], 'data-variant'), 'centered');
  // 시각 요소가 있는 split 히어로는 그대로다.
  const s = compile(catalog.createBlueprint('saas-landing')), sTag = tagsOf(s.html, 'kit-hero')[0];
  assert.equal(attr(sTag, 'data-variant'), 'split'); assert.equal(attr(sTag, 'data-visual'), 'yes');
  assert.deepEqual(decisionsOf(s, 'P02'), []);
  // 텍스트 중심 형태(statement·cover·centered)는 건드리지 않는다.
  const c = compile(catalog.createBlueprint('agency-home'));
  assert.equal(attr(tagsOf(c.html, 'kit-hero')[0], 'data-variant'), 'cover'); assert.deepEqual(decisionsOf(c, 'P02'), []);
});

test('P02 property: after the rule no hero is rendered split/product without a visual', () => {
  let ruled = 0;
  for (const t of catalog.templateList) {
    const r = compile(catalog.createBlueprint(t.id));
    for (const tag of tagsOf(r.html, 'kit-hero')) if (['split', 'product'].includes(attr(tag, 'data-variant'))) assert.equal(attr(tag, 'data-visual'), 'yes', `${t.id}: a ${attr(tag, 'data-variant')} hero without a visual survived`);
    ruled += decisionsOf(r, 'P02').length;
  }
  assert.equal(ruled, 2, 'devtool-landing and bank-product are the two templates in the catalog');
});

test('P03 / Q10: a transparent section right after a hero on a marketing page drops its band step instead of stacking a second one', () => {
  const r = compile(catalog.createBlueprint('agency-home'));
  const [d] = decisionsOf(r, 'P03'); assert.ok(d, 'P03 decision recorded');
  assert.equal(d.applied, 'none');
  const after = tagsOf(r.html, 'kit-section').filter(t => attr(t, 'data-after') === 'hero');
  assert.equal(after.length, 1); assert.equal(attr(after[0], 'data-surface'), 'plain');
  assert.match(r.html, /kit-hero[\s\S]*?<\/section><section[^>]*data-after="hero"/, 'it is the sibling that follows the hero');
  assert.match(r.css, /\[data-after=hero\]\[data-surface=plain\]\{padding-top:0\}/);
  // 다음 섹션이 색 면(tint)이면 띠 경계가 보이므로 그대로 둔다.
  const b = catalog.createBlueprint('agency-home'), heroAt = b.tree.children.findIndex(n => n.type === 'hero');
  b.tree.children[heroAt + 1].surface = 'tint';
  assert.deepEqual(decisionsOf(compile(b), 'P03'), []);
  // 앱 화면에는 띠 간격이 없으므로 규칙이 닿지 않는다.
  assert.deepEqual(decisionsOf(compile(catalog.createBlueprint('dashboard-overview')), 'P03'), []);
});

test('P01 / Q13: the same large picture twice on one page is reported, and no template in the catalog does it', () => {
  const b = catalog.createBlueprint('saas-landing');
  const bento = find(b.tree.children, 'bento')[0], media = bento.children.find(c => c.type === 'card' && c.variant === 'media');
  media.visual = 'chart'; delete media.motif;
  assert.equal(find(b.tree.children, 'hero')[0].visual, 'chart', 'precondition: hero and bento carry the same art');
  const dup = decisionsOf(compile(b), 'P01');
  assert.equal(dup.length, 1, 'P01 fires on the constructed duplicate');
  assert.deepEqual(dup[0].places, ['hero', 'card']);
  assert.equal(dup[0].code, 'PAGE_DUP_VISUAL');
  const offenders = [];
  for (const t of catalog.templateList) { const r = compile(catalog.createBlueprint(t.id)); assert.ok(page(r), t.id + ' ran the page rules'); if (decisionsOf(r, 'P01').length) offenders.push(t.id); }
  assert.deepEqual(offenders, [], 'template data must not repeat a large picture');
});

test('P04 / Q07: a bento whose small cells are short numbers beside a feature picture is reported as sparse', () => {
  const sparse = decisionsOf(compile(catalog.createBlueprint('product-landing')), 'P04');
  assert.equal(sparse.length, 1, 'product-landing bento: media feature + two metrics');
  assert.equal(sparse[0].code, 'PAGE_BENTO_SPARSE'); assert.deepEqual(sparse[0].shortCells, ['metric', 'metric']);
  const b = catalog.createBlueprint('saas-landing'), bento = find(b.tree.children, 'bento')[0];
  bento.children = bento.children.filter(c => c.type !== 'metric' && c.type !== 'progress');
  assert.deepEqual(decisionsOf(compile(b), 'P04'), [], 'a bento without short-number cells is not reported');
});

test('every page decision names the rule, the path, the facts it read and the reason', () => {
  const r = compile(catalog.createBlueprint('devtool-landing'));
  assert.ok(page(r)); assert.equal(page(r).version, '1.3.0');
  for (const d of page(r).decisions) {
    assert.match(d.rule, /^P0\d$/); assert.ok(d.path.startsWith('$.tree'), d.path); assert.ok(d.reason && d.facts && typeof d.facts === 'object', d.rule);
  }
  assert.ok(page(r).facts && 'heroVariant' in page(r).facts, 'the page facts are kept next to the decisions');
});

test('2.3.0 input: page rules do not run and the complete output is the pinned legacy output', () => {
  const {hashes} = evidence('legacy-2-3-hashes.json'), {blueprints} = evidence('legacy-2-3-blueprints.json');
  assert.equal(Object.keys(hashes).length, catalog.templateList.length);
  for (const [id, hash] of Object.entries(hashes)) {
    const b = structuredClone(blueprints[id]); assert.equal(b.catalogVersion, '2.3.0');
    assert.equal(createHash('sha256').update(JSON.stringify(compile(b))).digest('hex'), hash, id);
  }
  const old = compile(structuredClone(blueprints['devtool-landing']));
  assert.equal(old.manifest.design.page, undefined);
  assert.equal(attr(tagsOf(old.html, 'kit-hero')[0], 'data-variant'), 'split');
  assert.ok(catalog.SUPPORTED_CATALOG_VERSIONS.includes('2.3.0') && catalog.CATALOG_VERSION === '2.4.0');
});

test('kit migrate 2.3 → 2.4 changes catalogVersion only; the tree and axes are kept and page rules apply on the next compile', () => {
  const old = structuredClone(evidence('legacy-2-3-blueprints.json').blueprints['devtool-landing']);
  const next = catalog.migrateBlueprint(old);
  assert.equal(next.catalogVersion, '2.4.0');
  assert.deepEqual({...next, catalogVersion: '2.3.0'}, old);
  assert.equal(decisionsOf(compile(next), 'P02').length, 1);
});
