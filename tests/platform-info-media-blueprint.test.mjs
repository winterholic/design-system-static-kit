// §6.2 J(정보 표시) 및 K(미디어·콘텐츠) 16개 목적 패밀리의 Blueprint 왕복과 재료 질의.
// Blueprint를 입력으로 컴파일하면 Core(renderPurposeFamily)가 낸 마크업이 그대로 나오고,
// 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleDesign, compileBlueprint, validateBlueprint, listPlatformMaterials, getPlatformMaterial, recommendMaterials} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {INFO_MEDIA_FAMILIES, INFO_MEDIA_RUNTIME_IDS} from '../src/platform/families/info-media.mjs';
import * as edit from '../src/edit/index.mjs';
import {nodeSpecs} from '../src/catalog/nodes.mjs';
import {assembleStyleMaterials} from '../src/platform/style-materials.mjs';

const env = platformEnv();
const VISUAL = 'family:soft';
const kpis = n => Array.from({length: n}, (_, i) => ({label: `지표 ${i + 1}`, value: String(10 + i)}));

const BASE = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '정보미디어', kpis: kpis(2)}}, {include: ['blueprint']}).value.candidates[0].value.blueprint;

function purposeBlueprint(id, {content, variant, props} = {}) {
  const f = getPurposeFamily(id), b = structuredClone(BASE);
  b.materials.purposes = [0, 1].map(i => ({id, visual: VISUAL, uid: `jk-${i}`, variant: variant ?? f.example.variant, props: props ?? f.example.props, content: content ?? f.example.content}));
  const grid = b.tree.children.find(n => n.type === 'grid');
  grid.columns = 'two';
  grid.children = [0, 1].map(i => ({type: 'metric', label: `platform-purpose-${i}`, value: '0'}));
  return b;
}

const compile = b => {
  const r = compileBlueprint(b, {include: ['html', 'css', 'tokens', 'manifest']});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.value;
};

const core = (id, uid, over = {}) => {
  const f = getPurposeFamily(id);
  const r = renderPurposeFamily(env, id, {visual: VISUAL, variant: f.example.variant, props: f.example.props, content: f.example.content, id: uid, ...over});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.html;
};

test('J/K purposes: the Blueprint compiles to the exact markup the Core renders, byte-identically on every run', () => {
  for (const fam of INFO_MEDIA_FAMILIES) {
    const id = fam.id, b = purposeBlueprint(id);
    assert.equal(validateBlueprint(b).ok, true, `${id}: the Blueprint is valid 2.7.0`);
    const first = compile(b), second = compile(structuredClone(b));
    assert.deepEqual(second, first, `${id}: same Blueprint, same bytes`);
    for (const uid of ['jk-0', 'jk-1']) {
      assert.ok(first.html.includes(core(id, uid)), `${id}/${uid}: the page contains the Core markup`);
    }
    assert.deepEqual(first.manifest.platform.materials.purposes.map(p => p.id), [id, id], `${id}: the manifest records the material`);
    const needsRuntime = INFO_MEDIA_RUNTIME_IDS.includes(id);
    assert.equal(first.html.includes('window.__kitInfoMedia'), needsRuntime, `${id}: runtime shipping rule`);
  }
});

test('J/K purposes: content drives the output (changing content alters the compiled HTML)', () => {
  const badgeId = 'purpose:info.status-badge';
  const badgeHtml = compile(purposeBlueprint(badgeId, {content: {label: '새로운 라벨 텍스트'}})).html;
  assert.ok(badgeHtml.includes('새로운 라벨 텍스트'), badgeId);

  const fileId = 'purpose:media.file-preview';
  const fileHtml = compile(purposeBlueprint(fileId, {content: {fileName: '다른문서.pdf', fileSize: '1.5 MB'}})).html;
  assert.ok(fileHtml.includes('다른문서.pdf'), fileId);
});

test('J/K registry query: all 16 materials are queryable via listPlatformMaterials and getPlatformMaterial', () => {
  for (const fam of INFO_MEDIA_FAMILIES) {
    const got = getPlatformMaterial({id: fam.id});
    assert.equal(got.ok, true, fam.id);
    assert.equal(got.value.kind, 'purpose-family');
    assert.ok(got.value.example.content, `${fam.id} has example content`);
    assert.equal(got.value.quality.status, 'implemented');
  }

  const listedInfo = listPlatformMaterials({kind: 'purpose-family', query: 'info', limit: 100});
  assert.equal(listedInfo.ok, true);
  assert.ok(listedInfo.value.items.some(x => x.id === 'purpose:info.status-badge'));
  assert.ok(listedInfo.value.items.some(x => x.id === 'purpose:info.accordion'));

  const listedMedia = listPlatformMaterials({kind: 'purpose-family', query: 'media', limit: 100});
  assert.equal(listedMedia.ok, true);
  assert.ok(listedMedia.value.items.some(x => x.id === 'purpose:media.carousel'));
  assert.ok(listedMedia.value.items.some(x => x.id === 'purpose:media.responsive-image'));
});

test('J/K Manifest coverage is calculated from coverage and all 27 requirement rows round-trip through their real Blueprint renderer', () => {
  const manifest = JSON.parse(readFileSync(new URL('../docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', import.meta.url), 'utf8'));
  const rows = manifest.requirements.filter(r => r.section === '§6.2 J' || r.section === '§6.2 K');
  assert.equal(rows.length, 27);
  assert.ok(rows.every(r => r.coverage !== 'missing' && r.coverage !== 'schema'), 'coverage field, not status, must show a registered implementation');
  assert.equal(rows.find(r => r.name === 'Tag').coverage, 'variant', 'a tag is the outline tag presentation of the tag collection, not its default chip presentation');

  const legacyExpectations = {
    Badge: ['tags', {variant: 'badges'}, 'data-variant="badges"'],
    Chip: ['tags', {variant: 'chips'}, 'data-variant="chips"'],
    Tag: ['tags', {variant: 'outline'}, 'data-variant="outline"'],
    Divider: ['divider', {}, 'class="kit-hr"'],
    Image: ['media', {kind: 'photo'}, 'class="kit-media"'],
    Gallery: ['gallery', {}, 'class="kit-gallery"'],
    'Video Frame': ['media', {kind: 'video'}, 'class="kit-media"'],
    Quote: ['quote', {}, '<blockquote>'],
    'Rich Text Content': ['prose', {}, 'class="kit-prose"'],
  };
  const legacyBase = edit.resetDocument(null, {template: 'about-team', theme: 'workspace'}).doc;
  for (const row of rows) {
    assert.ok(row.coverage !== 'missing' && row.coverage !== 'schema', `${row.section} ${row.name}`);
    if (row.materialIds.every(id => id.startsWith('purpose:')) && row.name !== 'Filter Chip') {
      for (const id of row.materialIds) {
        const family = getPurposeFamily(id);
        assert.ok(family, `${row.name} points to registered family ${id}`);
        const bp = purposeBlueprint(id);
        assert.equal(validateBlueprint(bp).ok, true, `${row.name}/${id} Blueprint validation`);
        const built = compile(bp);
        assert.ok(built.html.includes(`data-purpose="${id.slice('purpose:'.length)}"`), `${row.name}/${id} compiled output`);
      }
      continue;
    }
    if (row.name === 'Media Frame') {
      for (const id of row.materialIds) {
        const material = env.registry.get(id);
        assert.ok(material, `${row.name} maps to registered media style ${id}`);
        const styleContext = env.registry.list('style-context').find(sc => material.contexts.includes('any') || material.contexts.includes(sc.contexts[0]));
        const context = styleContext.contexts[0];
        const rendered = assembleStyleMaterials(env.registry, {styleContext: styleContext.id, context, media: id});
        assert.equal(rendered.ok, true, `${id} media style assembly: ${JSON.stringify(rendered.diagnostics)}`);
        assert.equal(rendered.selection.media, id);
        assert.match(rendered.css, /\.kit-media-photo\{[^}]*aspect-ratio:/, `${id} contributes a rendered media-frame aspect ratio`);
      }
      continue;
    }
    if (row.name === 'Filter Chip') {
      const f = getPurposeFamily('purpose:form.filter');
      const r = renderPurposeFamily(env, f.id, {visual: VISUAL, variant: {layout: 'bar', chips: 'toggles'}, props: f.example.props, content: f.example.content, id: 'filter-chips'});
      assert.equal(r.ok, true, JSON.stringify(r.errors));
      assert.match(r.html, /class="pf-chips"/);
      assert.equal((r.html.match(/data-behavior="toggle"/g) ?? []).length, f.example.content.chips.length);
      continue;
    }
    const expectation = legacyExpectations[row.name];
    assert.ok(expectation, `${row.name} has an explicit renderer assertion`);
    const [type, overrides, marker] = expectation;
    assert.ok(row.materialIds.includes(`component:${type}`), `${row.name} material id maps to Blueprint node ${type}`);
    const node = {...structuredClone(nodeSpecs[type].example), ...overrides};
    const inserted = edit.insertNode(legacyBase, {parent: [], node});
    assert.equal(inserted.ok, true, `${row.name} node insertion`);
    const built = compileBlueprint(inserted.doc, {include: ['html', 'css', 'manifest']});
    assert.equal(built.ok, true, `${row.name} Blueprint compile: ${JSON.stringify(built.errors)}`);
    assert.ok(built.value.html.includes(marker), `${row.name} renderer output includes ${marker}`);
  }
});
