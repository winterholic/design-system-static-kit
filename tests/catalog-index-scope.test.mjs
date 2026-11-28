// F1 카탈로그 목록(REQUEST §8.1·§8.2)의 범위 검증: 부품급 재료가 목록에서 빠지지 않고, 17개 탭에 재료가 있으며, 카드마다 사전 생성된 실제 렌더가 있다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createPlatform} from '../src/platform/index.mjs';
import {designRegistry} from '../src/profiles/registry.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {LAYOUT_COMPONENTS} from '../src/platform/families/layout.mjs';
import {CATALOG_CATEGORIES, classifyCatalogMaterial} from '../apps/web/features/components/catalog-model.mjs';

const root = resolve(import.meta.dirname, '..');
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const index = json('site/catalog-index.json');
const coverage = json('docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json');
const byId = new Map(index.materials.map(m => [m.id, m]));
const count = id => index.categories.find(c => c.id === id).itemCount;

// 카탈로그 목록 대상: 화면을 만드는 부품·패턴급 재료. 팔레트·색 토큰·템플릿·테마·타이포 프리셋 등은 각자의 재료 페이지가 맡는다.
const COMPONENT_LIKE = ['component', 'base-component', 'purpose-family', 'layout', 'layout-component', 'layout-primitive', 'chart-preset', 'state-pattern', 'media'];

test('every component-like material of the coverage manifest is in the catalog index (only the page root is exempt)', () => {
  const missing = coverage.materials.filter(m => COMPONENT_LIKE.includes(m.kind) && m.id !== 'component:page' && !byId.has(m.id)).map(m => m.id);
  assert.deepEqual(missing, [], `component-like materials missing from the list: ${missing.slice(0, 8)}`);
  const live = new Set([...createPlatform().registry.kinds().flatMap(k => createPlatform().registry.list(k)).map(r => r.id), ...designRegistry().list().map(r => r.id), ...LAYOUT_COMPONENTS.map(c => c.id)]);
  for (const m of coverage.materials.filter(x => COMPONENT_LIKE.includes(x.kind))) assert.ok(live.has(m.id), `${m.id} is a registered material`);
});

test('charts: all chart presets are listed under the charts tab and classified by the §9.1 requirement', () => {
  const charts = index.materials.filter(m => m.relatedCategories.includes('charts'));
  assert.equal(charts.length, chartPresetMaterials.length);
  assert.deepEqual(charts.map(m => m.id).sort(), chartPresetMaterials.map(m => m.id).sort());
  assert.equal(count('charts'), chartPresetMaterials.length);
  assert.deepEqual(classifyCatalogMaterial({id: 'chart-preset:erp-quarterly-revenue', kind: 'chart-preset', category: 'chart'}, coverage), ['charts']);
  assert.equal(new Set(charts.map(m => json('site/previews/previews-data.json').items[m.previewUrl.slice(10, 42)]?.htmlHash)).size, charts.length, 'each chart card has its own rendered preview');
});

test('all 17 category tabs hold materials, and the tabs agree with the §6.2 sections that have covered requirements', () => {
  assert.equal(index.categories.length, CATALOG_CATEGORIES.length);
  for (const {id} of CATALOG_CATEGORIES) assert.ok(count(id) > 0, `category ${id} is empty although materials are registered`);
  const sectionToCategory = Object.fromEntries('ABCDEFGHIJKLMNO'.split('').map((letter, i) => [letter, CATALOG_CATEGORIES[i + 1 > 8 ? i + 2 : i + 1].id]));
  assert.equal(CATALOG_CATEGORIES.length, 17);
  const reqs = new Map(coverage.requirements.map(r => [r.id, r]));
  for (const [letter] of Object.entries(sectionToCategory)) {
    const ids = new Set(coverage.requirements.filter(r => r.section.startsWith(`§6.2 ${letter}`) && r.coverage !== 'missing').flatMap(r => r.materialIds));
    const target = {A: 'buttons', B: 'inputs', C: 'selection', D: 'date-time', E: 'navigation', F: 'cards', G: 'data', H: 'overlays', I: 'feedback', J: 'information', K: 'media', L: 'layouts', M: 'work-patterns', N: 'commerce', O: 'mobile'}[letter];
    for (const id of ids) assert.ok(byId.get(id)?.relatedCategories.includes(target), `${id} (§6.2 ${letter}) must be under ${target}`);
  }
  assert.ok(reqs.size > 0);
});

test('every categorized card has a pre-generated preview file, except structural parts without a standalone example', () => {
  const previews = json('site/previews/previews-data.json');
  const bare = index.materials.filter(m => m.relatedCategories.length && !m.previewUrl && !Object.keys(m.previewUrlsByFamily).length);
  assert.deepEqual([...new Set(bare.map(m => m.kind))], ['component'], `only legacy parts without example may lack a preview: ${bare.map(m => m.id).join(', ')}`);
  for (const m of index.materials.filter(x => x.previewUrl)) {
    assert.ok(existsSync(join(root, 'site', m.previewUrl)), m.previewUrl);
    assert.ok(Object.values(previews.items).some(item => item.path === m.previewUrl), `${m.id}: the file is recorded in previews-data.json (a real compile output, not a hand-made image)`);
  }
});

test('the index covers the component-like range: 438 was the range before charts, layout parts and primitives were added', () => {
  const total = index.materials.length;
  const nonComponent = index.materials.filter(m => !COMPONENT_LIKE.includes(m.kind)).length;
  assert.equal(total - nonComponent, coverage.materials.filter(m => COMPONENT_LIKE.includes(m.kind) && m.id !== 'component:page').length);
  assert.ok(total > 438, `index has ${total}`);
  assert.ok(coverage.materials.length > total, 'the manifest also holds palettes, tokens, templates and other materials that live on their own pages');
});
