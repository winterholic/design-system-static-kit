// §6.2 J(정보 표시) 및 K(미디어·콘텐츠) 16개 목적 패밀리의 Blueprint 왕복과 재료 질의.
// Blueprint를 입력으로 컴파일하면 Core(renderPurposeFamily)가 낸 마크업이 그대로 나오고,
// 같은 입력은 같은 바이트이며, 재료 질의가 같은 재료를 돌려준다.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleDesign, compileBlueprint, validateBlueprint, listPlatformMaterials, getPlatformMaterial, recommendMaterials} from '../src/service/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {INFO_MEDIA_FAMILIES, INFO_MEDIA_RUNTIME_IDS} from '../src/platform/families/info-media.mjs';

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
