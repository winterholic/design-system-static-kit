// R1 팔레트 권리: Coolors 출처 427개는 권리를 확인하지 못했다(docs/materials/audit.md §3).
// 2.6.0 신규 제품 경로(컴파일·내보내기·REST·MCP·재료 조회)에는 쓰지 않고, 2.4.0·2.5.0 응답은 그대로 둔다.
import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {palettes, createBlueprint, migrateBlueprint} from '../src/catalog.mjs';
import {listCatalog, compileBlueprint, validateBlueprint, explainDecisions, listMaterials, getMaterial} from '../src/service/index.mjs';
import {compile} from '../src/compiler.mjs';
import {rest, resetRateLimit} from './channel-support.mjs';
import {TOOLS, executeTool} from '../apps/web/lib/api/mcp.mjs';

beforeEach(() => resetRateLimit());
const sha = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const pins = JSON.parse(readFileSync(new URL('../docs/evidence/materials/pinned-palette-legacy.json', import.meta.url), 'utf8'));
const FIELDS = ['id', 'name', 'label', 'theme', 'colors', 'brand', 'likes', 'family', 'tone', 'source'];
const allPaletteRows = () => {
  const rows = [];
  for (let cursor; ;) {
    const r = listCatalog({kind: 'palettes', fields: FIELDS, limit: 200, ...(cursor ? {cursor} : {})});
    rows.push(...r.value.items);
    if (!(cursor = r.value.nextCursor)) break;
  }
  return rows;
};
const at260 = (paletteId, extra = {}) => ({...createBlueprint('saas-landing', undefined, paletteId), catalogVersion: '2.6.0', ...extra});
const mcp = (name, args) => executeTool(TOOLS.find(t => t.name === name), args).structuredContent;

test('R1: 2.4.0 palette catalog and 2.4.0/2.5.0 compiled output are byte-identical to the pre-change baseline', () => {
  const rows = allPaletteRows();
  assert.equal(rows.length, pins.catalog.count);
  assert.equal(sha(rows), pins.catalog.sha256);
  for (const version of ['2.4.0', '2.5.0']) {
    for (const id of pins.sample) {
      const b = migrateBlueprint(createBlueprint('saas-landing', undefined, id), version);
      assert.equal(sha(compile(b)), pins.compiled[version][id], `${version} ${id}`);
    }
  }
});

test('R1: REST and MCP palette listings keep serving the 2.4.0 catalog and refuse every other catalogVersion', async () => {
  const expected = JSON.parse(JSON.stringify(listCatalog({kind: 'palettes', fields: FIELDS, limit: 200})));
  const fieldsQuery = `kind=palettes&fields=${FIELDS.join(',')}&limit=200`;
  for (const suffix of ['', '&catalogVersion=2.4.0']) {
    const res = await rest('GET', `/api/v1/catalog?${fieldsQuery}${suffix}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, expected, 'REST ' + (suffix || 'default'));
  }
  const viaMcp = mcp('list_design_system', {kind: 'palettes', fields: FIELDS, limit: 200});
  assert.deepEqual(viaMcp, expected, 'MCP default');
  assert.deepEqual(mcp('list_design_system', {kind: 'palettes', fields: FIELDS, limit: 200, catalogVersion: '2.4.0'}), expected, 'MCP 2.4.0');
  for (const version of ['2.5.0', '2.6.0']) {
    const res = await rest('GET', `/api/v1/catalog?${fieldsQuery}&catalogVersion=${version}`);
    assert.equal(res.status, 422, 'REST ' + version);
    assert.equal(res.json.errors[0].code, 'CATALOG_VERSION');
    const m = mcp('list_design_system', {kind: 'palettes', fields: FIELDS, limit: 200, catalogVersion: version});
    assert.equal(m.ok, false);
    assert.equal(m.errors[0].code, 'CATALOG_VERSION');
    for (const text of [res.text, JSON.stringify(m)]) assert.ok(!/coolors\.co|#[0-9A-F]{6}/i.test(text), `no palette data in the ${version} refusal`);
  }
});

test('R1: a 2.6.0 document is painted by the internal palette only, whatever Coolors id or colorPalette it carries', () => {
  const sample = pins.sample.slice(0, 12);
  const reference = compileBlueprint(at260(sample[0], {colorPalette: 'static-kit'}), {include: ['html', 'css', 'tokens', 'manifest']}).value;
  const strip = v => { const {manifest, ...rest} = v; const {palette: _p, blueprint: _b, ...m} = manifest; return {...rest, manifest: m}; };
  for (const id of sample) {
    for (const extra of [{colorPalette: 'static-kit'}, {}]) {
      const r = compileBlueprint(at260(id, extra), {include: ['html', 'css', 'tokens', 'manifest']});
      assert.equal(r.ok, true, id);
      assert.deepEqual(strip(r.value), strip(reference), `${id} ${JSON.stringify(extra)} must not depend on the Coolors palette`);
      assert.equal(r.value.manifest.paletteProvenance.source, 'internal');
      assert.ok(!/coolors\.co/.test(JSON.stringify(r.value)), id);
    }
  }
  // 같은 문서가 2.5.0이면 그 팔레트의 색을 쓴다(호환). 2.6.0과 다른 출력이어야 이 시험이 의미가 있다.
  const legacy = compileBlueprint({...at260(sample[0]), catalogVersion: '2.5.0'}, {include: ['css']}).value.css;
  assert.notEqual(legacy, reference.css);
  assert.ok(palettes[sample[0]].colors.some(c => legacy.toUpperCase().includes(c)));
});

test('R1: REST and MCP compile/validate/explain of 2.6.0 documents carry no Coolors data', async () => {
  const doc = at260('ocean');
  const hex = palettes.ocean.colors;
  const restCompile = await rest('POST', '/api/v1/compile', {body: {blueprint: doc, include: ['html', 'css', 'manifest'], html: 'full'}});
  assert.equal(restCompile.status, 200);
  const mcpCompile = mcp('compile_design', {blueprint: doc, include: ['html', 'css', 'manifest'], html: 'full'});
  assert.equal(mcpCompile.ok, true);
  for (const [label, text] of [['REST', restCompile.text], ['MCP', JSON.stringify(mcpCompile)]]) {
    assert.ok(!/coolors\.co/i.test(text), label + ' url');
    const found = hex.filter(c => text.toUpperCase().includes(c));
    // 내부 팔레트와 우연히 같은 값은 허용하되 팔레트 전체가 실리면 안 된다.
    assert.ok(found.length < hex.length, `${label} must not carry the whole Coolors palette (${found.length}/${hex.length})`);
  }
  assert.equal(JSON.parse(restCompile.text).value.manifest.paletteProvenance.source, 'internal');
  const manifest = compileBlueprint(doc, {include: ['manifest']}).value.manifest;
  assert.equal(validateBlueprint(doc).ok, true);
  const explain = explainDecisions({blueprint: doc, manifest});
  assert.ok(!/coolors\.co/i.test(JSON.stringify(explain)));
});

test('R1: Materials service withholds the 427 rights-unverified palettes (list, kind filter, dependencies, detail)', () => {
  const refused = listMaterials({kind: 'palette'});
  assert.equal(refused.ok, false);
  assert.equal(refused.errors[0].path, '$args.kind');
  const seen = [];
  for (let cursor; ;) {
    const r = listMaterials({limit: 200, fields: ['kind', 'dependencies', 'tags', 'label'], ...(cursor ? {cursor} : {})});
    seen.push(...r.value.items);
    if (!(cursor = r.value.nextCursor)) break;
  }
  assert.ok(seen.length > 600, 'other materials are still listed');
  assert.ok(seen.every(m => m.kind !== 'palette' && !m.id.startsWith('palette:')));
  assert.ok(seen.every(m => m.dependencies.every(d => !d.startsWith('palette:'))));
  const total = listMaterials({limit: 1}).value;
  assert.equal(total.byKind.palette, undefined);
  const detail = getMaterial({id: 'palette:ocean'});
  assert.equal(detail.ok, false);
  assert.equal(detail.errors[0].code, 'UNKNOWN_MATERIAL');
  const theme = getMaterial({id: 'theme:workspace'});
  assert.equal(theme.ok, true);
  assert.ok(theme.value.dependencies.every(d => !d.startsWith('palette:')));
  assert.ok(!/coolors\.co/i.test(JSON.stringify(theme)));
});
