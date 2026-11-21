import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBlueprint, migrateBlueprint, blueprintSchema, nodeSpecs, nodeTypes, TOP_LEVEL_SINCE_FIELDS, ACCEPTED_CATALOG_VERSIONS} from '../src/catalog.mjs';
import {NODE_SPEC_EXTENSIONS, nodeSpecAt, nodeTypesAt, nodeTypeKnown, nodeExtended} from '../src/catalog/node-extensions.mjs';
import {validateBlueprint} from '../src/validate.mjs';
import {compile} from '../src/compiler.mjs';
import {selectContract, renderSelect} from '../src/materials/select.mjs';
import {tableContract, renderDataTable} from '../src/materials/table.mjs';
import {MATERIAL_TYPE_PRESETS, renderRoleTypeCSS, ROLE_TYPE_MAP} from '../src/materials/typography.mjs';
import {resolveColorTokens} from '../src/color-tokens.mjs';
import {catalogRegistry, controlMaterials} from '../src/materials/index.mjs';
import {chartPresetMaterials} from '../src/materials/chart-presets.mjs';
import {HINTS, listMaterials, getMaterial, getColorTokens, getTypePresets, getComponentSpec, getSchema, listCatalog} from '../src/service/index.mjs';
import {applyOp} from '../src/edit/index.mjs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const SELECT = nodeSpecAt('select-control', '2.6.0'), TABLE = nodeSpecAt('data-table', '2.6.0');

/** dashboard 템플릿 문서에 노드를 덧붙인다. 버전은 호출자가 고른다. */
function doc(version, ...nodes) {
  const b = createBlueprint('dashboard-overview');
  b.catalogVersion = version;
  b.tree.children.push(...nodes.map(n => structuredClone(n)));
  return b;
}
const select = (extra = {}) => ({...structuredClone(SELECT.example), ...extra});
const table = (extra = {}) => ({...structuredClone(TABLE.example), ...extra});
const errorsOf = b => validateBlueprint(b).errors;
const codesOf = b => errorsOf(b).map(e => `${e.code} ${e.path}`);

// ---------------------------------------------------------------- 1. Select·Table 노드

test('Select and Table are nodes of the 2.6.0 extension table with examples, and the base catalog does not contain them', () => {
  assert.deepEqual(Object.keys(NODE_SPEC_EXTENSIONS['2.6.0']).sort(), ['chart', 'data-table', 'select-control']);
  for (const type of ['select-control', 'data-table']) {
    assert.ok(!nodeSpecs[type] && !nodeTypes.includes(type), `${type} must stay out of the 2.4.0/2.5.0 base catalog`);
    const spec = nodeSpecAt(type, '2.6.0');
    assert.ok(spec.label && spec.group && spec.example?.type === type, type);
    assert.equal(nodeSpecAt(type, '2.5.0'), undefined);
    assert.equal(nodeSpecAt(type, '2.4.0'), undefined);
    assert.equal(nodeTypeKnown(type, '2.5.0'), false);
    assert.equal(nodeTypeKnown(type, '2.6.0'), true);
    assert.equal(nodeExtended(type, '2.6.0'), true);
  }
  assert.deepEqual(nodeTypesAt('2.5.0'), nodeTypes);
  assert.deepEqual(nodeTypesAt('2.6.0'), [...nodeTypes, 'select-control', 'data-table']);
});

test('node field values are exactly the material contracts (one vocabulary, no second list)', () => {
  const f = SELECT.fields;
  for (const [field, values] of Object.entries(selectContract.variants)) assert.deepEqual(f[field].enum, values, `select ${field}`);
  assert.deepEqual(selectContract.variants.state, f.state.enum);
  const t = TABLE.fields;
  for (const field of ['density', 'responsive', 'state']) assert.deepEqual(t[field].enum, tableContract.variants[field], `table ${field}`);
  assert.deepEqual(tableContract.variants.sortable, [false, true]);
  assert.deepEqual(t.sortable.enum, ['yes', 'no']);
  assert.deepEqual(t.columns.items.properties.hideBelow.enum, ['640px', '800px', '900px']);
});

test('the examples validate and compile in 2.6.0, and the markup is the material renderer output itself', () => {
  for (const type of ['select-control', 'data-table']) {
    const b = doc('2.6.0', nodeSpecAt(type, '2.6.0').example);
    assert.deepEqual(errorsOf(b), [], type);
    compile(b);
  }
  const html = compile(doc('2.6.0', select(), table())).html;
  const expectedSelect = renderSelect({id: 'select-region', label: '지역', options: [{value: 'kr', label: '한국'}, {value: 'jp', label: '일본'}]});
  assert.ok(html.includes(expectedSelect), 'select markup is renderSelect() verbatim');
  const expectedTable = renderDataTable({id: 'table-projects', columns: TABLE.example.columns, rows: TABLE.example.rows});
  assert.ok(html.includes(expectedTable), 'table markup is renderDataTable() verbatim');
  assert.match(html, /<h2 id="block-\d+-title">프로젝트<\/h2>/);
});

test('2.6.0 pages carry the control CSS and the fixed runtime only when a control is used; other documents are untouched', () => {
  const plain = compile(doc('2.6.0'));
  assert.ok(!plain.css.includes('.kit-select') && !plain.css.includes('.kit-data-table'));
  assert.ok(!plain.html.includes('attachSelect') && !plain.html.includes('attachTable'));
  const withSelect = compile(doc('2.6.0', select()));
  assert.ok(withSelect.css.includes('.kit-select{') && !withSelect.css.includes('.kit-data-table'));
  assert.match(withSelect.html, /function attachSelect\(/);
  assert.ok(!withSelect.html.includes('function attachTable('));
  const withTable = compile(doc('2.6.0', table()));
  assert.ok(withTable.css.includes('.kit-data-table{') && !withTable.css.includes('.kit-select{'));
  assert.match(withTable.html, /function attachTable\(/);
  // 새 노드를 쓰지 않은 2.6.0 문서의 스크립트는 기존 고정 런타임뿐이다.
  const base = createBlueprint('dashboard-overview');
  assert.equal(compile({...base, catalogVersion: '2.6.0'}).html.match(/<script>([\s\S]*)<\/script>/)[1], compile(base).html.match(/<script>([\s\S]*)<\/script>/)[1]);
});

test('2.4.0 and 2.5.0 reject both nodes as not-yet-open parts, and do not list them as children', () => {
  for (const version of ['2.4.0', '2.5.0']) {
    for (const node of [select(), table()]) {
      const found = errorsOf(doc(version, node)).filter(e => e.path.endsWith('.type') && e.path.includes('children[4]'));
      assert.equal(found.length, 1, `${version} ${node.type}`);
      assert.equal(found[0].code, 'VERSION_FIELD');
      assert.match(found[0].message, /2\.6\.0/);
    }
  }
  // 알 수 없는 type은 그대로 NODE_TYPE이다.
  const unknown = errorsOf(doc('2.6.0', {type: 'select-box'}));
  assert.ok(unknown.some(e => e.code === 'NODE_TYPE'));
});

test('children lists: parents that accept form/table also accept the new nodes in 2.6.0 only; grids still do not', () => {
  for (const parent of ['page', 'section', 'split', 'aside', 'tab']) {
    const base = nodeSpecs[parent].children, grown = nodeSpecAt(parent, '2.6.0').children;
    assert.ok(base.includes('form') && base.includes('table'), parent);
    assert.deepEqual(grown, [...base, 'select-control', 'data-table'], parent);
    assert.strictEqual(nodeSpecAt(parent, '2.5.0'), nodeSpecs[parent], `${parent} is the very same base object before 2.6.0`);
  }
  for (const parent of ['grid', 'bento', 'tabs', 'reel', 'kanban']) assert.strictEqual(nodeSpecAt(parent, '2.6.0'), nodeSpecs[parent], parent);
  const inGrid = doc('2.6.0', {type: 'grid', columns: 'two', children: [{type: 'metric', label: 'a', value: '1'}, select()]});
  assert.ok(codesOf(inGrid).some(c => c.startsWith('CHILD_TYPE ')), codesOf(inGrid).join());
  const inSection = doc('2.6.0', {type: 'section', title: '구역', children: [select(), table()]});
  assert.deepEqual(errorsOf(inSection), []);
  compile(inSection);
});

test('a data-table satisfies the page types that ask for a table', () => {
  const b = createBlueprint('dashboard-overview'); b.catalogVersion = '2.6.0'; b.pageType = 'data';
  b.tree.children = [b.tree.children[0], {type: 'prose', title: '설명', body: '표가 아직 없는 데이터 리포트입니다.'}];
  assert.ok(codesOf(b).some(c => c.startsWith('PAGE_REQUIRE')), 'precondition: a data report needs a chart, table or metric: ' + codesOf(b).join());
  b.tree.children.push(table());
  assert.deepEqual(errorsOf(b), []);
});

// ---------------------------------------------------------------- 2. 금지 조합은 구조화 진단으로 거부한다

const FORBIDDEN = [
  // [이름, 노드, 기대 코드, 기대 경로 끝]
  ['multiple + async', select({mode: 'multiple', search: 'async', values: ['kr']}), 'SELECT_COMBO', '.search'],
  ['async without provider', select({search: 'async'}), 'SELECT_COMBO', '.search'],
  ['value with multiple', select({mode: 'multiple', value: 'kr'}), 'SELECT_COMBO', '.value'],
  ['values with single', select({values: ['kr']}), 'SELECT_COMBO', '.values'],
  ['size outside the model', select({size: 'xl'}), 'ENUM', '.size'],
  ['shape outside the model', select({shape: 'round'}), 'ENUM', '.shape'],
  ['menu height outside the model', select({maxMenuHeight: 300}), 'ENUM', '.maxMenuHeight'],
  ['disabled+loading is not a state', select({state: 'disabled loading'}), 'ENUM', '.state'],
  ['unknown extra key', select({className: 'x'}), 'UNKNOWN_KEY', '.className'],
  ['duplicate option value', select({options: [{value: 'a', label: 'A'}, {value: 'a', label: 'B'}]}), 'SELECT_OPTIONS', '.options[1].value'],
  ['comma in option value', select({options: [{value: 'a,b', label: 'A'}, {value: 'c', label: 'C'}]}), 'SELECT_OPTIONS', '.options[0].value'],
  ['selected value not in options', select({value: 'zz'}), 'SELECT_OPTIONS', '.value'],
  ['split groups', select({options: [{value: 'a', label: 'A', group: 'g1'}, {value: 'b', label: 'B', group: 'g2'}, {value: 'c', label: 'C', group: 'g1'}]}), 'SELECT_OPTIONS', '.options[2].group'],
  ['message without error', select({message: '실패'}), 'VARIANT_REQUIRES', '.message'],
  ['one option only', select({options: [{value: 'a', label: 'A'}]}), 'ARRAY_LENGTH', '.options'],
  ['table with one column', table({columns: [{id: 'name', label: '이름'}], rows: [{name: 'a'}]}), 'ARRAY_LENGTH', '.columns'],
  ['table with nine columns', table({columns: Array.from({length: 9}, (_, i) => ({id: 'c' + i, label: 'C' + i})), rows: []}), 'ARRAY_LENGTH', '.columns'],
  ['duplicate column id', table({columns: [{id: 'name', label: 'A'}, {id: 'name', label: 'B'}], rows: [{name: 'x'}]}), 'TABLE_COLUMNS', '.columns[1].id'],
  ['hideBelow with scroll', table({columns: [{id: 'name', label: 'A'}, {id: 'status', label: 'B', hideBelow: '800px'}]}), 'TABLE_COLUMNS', '.columns[1].hideBelow'],
  ['hidden first column', table({responsive: 'priority', columns: [{id: 'name', label: 'A', hideBelow: '800px'}, {id: 'status', label: 'B', hideBelow: '800px'}]}), 'TABLE_COLUMNS', '.columns[0].hideBelow'],
  ['priority with nothing to hide', table({responsive: 'priority'}), 'TABLE_COLUMNS', '.responsive'],
  ['column sortable without table sortable', table({columns: [{id: 'name', label: 'A', sortable: 'yes'}, {id: 'status', label: 'B'}]}), 'TABLE_COLUMNS', '.columns[0].sortable'],
  ['sortable with no sortable column', table({sortable: 'yes', columns: [{id: 'name', label: 'A', sortable: 'no'}, {id: 'status', label: 'B', sortable: 'no'}]}), 'TABLE_COLUMNS', '.sortable'],
  ['hideBelow outside the model', table({responsive: 'priority', columns: [{id: 'name', label: 'A'}, {id: 'status', label: 'B', hideBelow: '700px'}]}), 'ENUM', '.columns[1].hideBelow'],
  ['column id format', table({columns: [{id: 'Name', label: 'A'}, {id: 'status', label: 'B'}]}), 'PATTERN', '.columns[0].id'],
  ['row missing a column', table({rows: [{name: 'x'}]}), 'TABLE_ROWS', '.rows[0].status'],
  ['row with an undefined column', table({rows: [{name: 'x', status: 'y', owner: 'z'}]}), 'TABLE_ROWS', '.rows[0].owner'],
  ['row cell is an object', table({rows: [{name: {a: 1}, status: 'y'}]}), 'ONE_OF', '.rows[0].name'],
  ['row cell is an array', table({rows: [{name: ['x'], status: 'y'}]}), 'ONE_OF', '.rows[0].name'],
  ['duplicate row id', table({rows: [{id: 'r', name: 'a', status: 'b'}, {id: 'r', name: 'c', status: 'd'}]}), 'TABLE_ROWS', '.rows[1].id'],
  ['ready without rows', table({rows: [], state: 'ready'}), 'STATE_DATA', '.rows'],
  ['partial without rows', table({rows: [], state: 'partial'}), 'STATE_DATA', '.rows'],
  ['empty with rows', table({state: 'empty'}), 'TABLE_ROWS', '.rows'],
  ['loading with hidden rows', table({state: 'loading'}), 'TABLE_ROWS', '.rows'],
  ['error with hidden rows', table({state: 'error'}), 'TABLE_ROWS', '.rows'],
  ['message without error', table({message: '실패'}), 'VARIANT_REQUIRES', '.message'],
  ['density outside the model', table({density: 'tight'}), 'ENUM', '.density'],
];

test('forbidden and model-violating combinations are rejected with structured diagnostics (code, path, message, hint)', () => {
  assert.ok(FORBIDDEN.length >= 30);
  for (const [name, node, code, suffix] of FORBIDDEN) {
    const errors = errorsOf(doc('2.6.0', node));
    const hit = errors.find(e => e.code === code && e.path.endsWith(suffix));
    assert.ok(hit, `${name}: expected ${code} at ...${suffix}, got ${JSON.stringify(errors.map(e => `${e.code} ${e.path}`))}`);
    assert.ok(hit.path.startsWith('$.tree.children['), name);
    assert.ok(hit.message.length > 5, name);
    assert.ok(HINTS[code] && HINTS[code].length > 8, `${name}: ${code} has a hint`);
    assert.throws(() => compile(doc('2.6.0', node)), /Invalid blueprint/, `${name} must not compile`);
  }
});

test('the valid neighbours of every forbidden case compile (the rules are not simply rejecting everything)', () => {
  const valid = [
    select({mode: 'multiple', search: 'local', values: ['kr', 'jp']}), select({search: 'local', value: 'jp', size: 'lg', shape: 'pill', maxMenuHeight: 360, requirement: 'required', placeholder: '고르세요'}),
    select({state: 'disabled'}), select({state: 'loading'}), select({state: 'error', message: '옵션을 불러오지 못했습니다.'}),
    select({options: [{value: 'a', label: 'A', group: '1'}, {value: 'b', label: 'B', group: '1', disabled: 'yes'}, {value: 'c', label: 'C', group: '2'}, {value: 'd', label: 'D'}]}),
    table({sortable: 'yes', selectable: 'yes', density: 'compact', columns: [{id: 'name', label: '이름', sortable: 'yes'}, {id: 'count', label: '개수', sortable: 'no'}], rows: [{id: 'r1', name: '가', count: 3}, {id: 'r2', name: '나', count: null}]}),
    table({responsive: 'priority', columns: [{id: 'name', label: '이름'}, {id: 'owner', label: '담당', hideBelow: '640px'}, {id: 'note', label: '메모', hideBelow: '900px'}], rows: [{name: 'a', owner: 'b', note: true}]}),
    table({state: 'empty', rows: []}), table({state: 'loading', rows: []}), table({state: 'error', rows: [], message: '서버 오류'}), table({state: 'partial'}),
  ];
  for (const node of valid) { const b = doc('2.6.0', node); assert.deepEqual(errorsOf(b), [], JSON.stringify(node).slice(0, 80)); compile(b); }
});

test('select ids and table ids must be unique per kind, and the DOM ids carry a prefix that cannot collide with generated ids', () => {
  assert.ok(codesOf(doc('2.6.0', select(), select())).some(c => c.startsWith('DUPLICATE_ID ')));
  assert.ok(codesOf(doc('2.6.0', table(), table())).some(c => c.startsWith('DUPLICATE_ID ')));
  const b = doc('2.6.0', select({id: 'block-1'}), table({id: 'block-1'}));
  assert.deepEqual(errorsOf(b), []);
  const html = compile(b).html;
  assert.ok(html.includes('id="select-block-1"') && html.includes('id="table-block-1"'));
});

test('TABLE_COLUMNS and TABLE_ROWS are really emitted, are in the hint table, and the Table material declares them', () => {
  const source = read('src/validate.mjs');
  for (const code of ['TABLE_COLUMNS', 'TABLE_ROWS', 'SELECT_COMBO']) {
    assert.match(source, new RegExp(`error\\([^)]*'${code}'`), `${code} is emitted by the validator`);
    assert.ok(HINTS[code]?.length > 20, `${code} hint`);
  }
  assert.ok(tableContract && catalogRegistry().get('component:data-table').validation.codes.includes('TABLE_COLUMNS'));
  assert.ok(catalogRegistry().get('component:data-table').validation.codes.includes('TABLE_ROWS'));
  assert.ok(catalogRegistry().get('component:select-control').validation.codes.includes('SELECT_COMBO'));
  const emitted = new Set(FORBIDDEN.map(([, , code]) => code));
  for (const code of ['TABLE_COLUMNS', 'TABLE_ROWS', 'SELECT_COMBO', 'SELECT_OPTIONS', 'STATE_DATA']) assert.ok(emitted.has(code), `${code} is exercised`);
});

// ---------------------------------------------------------------- 3. 역할 타이포·색 토큰

const withVersion = (version, extra) => ({...createBlueprint('saas-landing'), catalogVersion: version, ...extra});

test('typeRoles is a closed 2.6.0 field whose values are exactly the role-typography materials', () => {
  const field = TOP_LEVEL_SINCE_FIELDS.find(f => f.field === 'typeRoles');
  assert.deepEqual(field.values, Object.keys(MATERIAL_TYPE_PRESETS));
  assert.equal(field.since, '2.6.0');
  assert.deepEqual(blueprintSchema().properties.typeRoles.enum, field.values);
  assert.equal(blueprintSchema().properties.typeRoles['x-since'], '2.6.0');
  assert.ok(!blueprintSchema().required.includes('typeRoles'));
  assert.ok(errorsOf(withVersion('2.6.0', {typeRoles: 'newsroom'})).some(e => e.code === 'ENUM' && e.path === '$.typeRoles'));
  for (const version of ['2.4.0', '2.5.0']) assert.ok(errorsOf(withVersion(version, {typeRoles: 'erp'})).some(e => e.code === 'VERSION_FIELD' && e.path === '$.typeRoles'), version);
});

test('the chosen role typography preset changes the compiled CSS variables to that preset\'s values, and nothing else', () => {
  const base = compile(withVersion('2.6.0', {})).css;
  const seen = new Set();
  for (const [id, preset] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    const {css, manifest} = compile(withVersion('2.6.0', {typeRoles: id}));
    const block = css.match(/\/\* Role typography \(catalog 2\.6\.0 typeRoles: [^\n]*\n:root\{([^}]*)\}/);
    assert.ok(block, id);
    const decl = Object.fromEntries(block[1].split(';').map(x => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]));
    // 값은 재료의 역할 표에서 그대로 나온다(밀도 계수는 floor 역할에 곱하지 않는다).
    assert.equal(decl['--kit-t-body'], preset.roles.body.size, `${id} body`);
    assert.equal(decl['--kit-t-label'], preset.roles.label.size);
    assert.equal(decl['--kit-t-caption'], preset.roles.caption.size);
    assert.ok(decl['--kit-t-title'].includes(preset.roles.display.size), `${id} display → title`);
    assert.equal(decl['--kit-t-title'], decl['--kit-t-app']);
    assert.ok(decl['--kit-t-heading'].includes(preset.roles.heading.size), `${id} heading`);
    assert.ok(decl['--kit-t-stat'].includes(preset.roles.numeric.size) && decl['--kit-t-price'] === decl['--kit-t-stat']);
    assert.equal(decl['--kit-heading'], preset.roles.heading.fontFamily);
    assert.equal(decl['--kit-font'], preset.roles.body.fontFamily);
    assert.equal(decl['--kit-hw'], String(preset.roles.heading.weight));
    assert.equal(decl['--kit-tr-title'], `${preset.roles.display.trackingEm}em`);
    assert.ok(css.includes(`@media (max-width:720px){:root{--kit-t-title:`), 'narrow viewports reduce display and heading');
    assert.equal(manifest.typeRoles.preset, id);
    assert.deepEqual(manifest.typeRoles.roles.display.variables, ROLE_TYPE_MAP.display.map(t => `--kit-t-${t}`));
    assert.ok(css.length > base.length && css.includes(renderRoleTypeCSS(id, {fit: /--kit-t-title-raw/.test(css)}).split('\n')[1]));
    seen.add(block[1]);
  }
  assert.equal(seen.size, Object.keys(MATERIAL_TYPE_PRESETS).length, 'every preset produces a different result');
  // 같은 입력은 같은 출력이고, 고르지 않으면 이 블록이 없다.
  assert.equal(compile(withVersion('2.6.0', {typeRoles: 'erp'})).css, compile(withVersion('2.6.0', {typeRoles: 'erp'})).css);
  assert.ok(!base.includes('Role typography'));
  assert.equal(compile(withVersion('2.6.0', {})).manifest.typeRoles, undefined);
});

test('role typography respects the engine fit aliases (layout revision 2) so a narrow box cannot get a larger title back', () => {
  const css = compile(withVersion('2.6.0', {typeRoles: 'marketing'})).css;
  assert.match(css, /--kit-t-title-raw:/);
  assert.match(css, /--kit-t-heading-raw:/);
  const fit = css.indexOf('.kit-page-header{--kit-t-app:min(var(--kit-t-app-raw)');
  assert.ok(fit > css.indexOf('Role typography') && css.indexOf('Role typography') > 0, 'the engine fit rule comes after the preset and keeps min()');
});

test('the colorPalette static-kit token values reach the compiled CSS in light, dark and auto, and 2.5.0 refuses the field', () => {
  for (const mode of ['light', 'dark', 'auto']) {
    const b = {...withVersion('2.6.0', {colorPalette: 'static-kit'}), mode};
    const {css, manifest} = compile(b);
    const resolved = resolveColorTokens({palette: 'static-kit', mode});
    const first = mode === 'auto' ? resolved.modes.light.tokens : resolved.tokens;
    for (const name of ['action', 'surface', 'text', 'focus']) assert.ok(css.includes(`--kit-${name}:${first[name]};`), `${mode} --kit-${name}:${first[name]}`);
    if (mode === 'auto') assert.ok(css.includes(`--kit-action:${resolved.modes.dark.tokens.action};`), 'auto also emits the dark set');
    assert.ok(css.includes('.kit-button:disabled') && css.includes('--kit-action-active'), 'component use sites are emitted');
    assert.equal(manifest.colorTokens.palette, 'static-kit');
    assert.ok(manifest.colorTokens.usedTokens.length > 20);
  }
  const plain = compile(withVersion('2.6.0', {})).css;
  assert.ok(!plain.includes('--kit-action-active') && !plain.includes('.kit-button:disabled'), 'unselected: no color-token CSS');
  assert.ok(errorsOf(withVersion('2.5.0', {colorPalette: 'static-kit'})).some(e => e.code === 'VERSION_FIELD'));
  assert.ok(errorsOf(withVersion('2.6.0', {colorPalette: '#ff0000'})).some(e => e.code === 'ENUM'), 'raw colors are never accepted');
});

test('color tokens and role typography reach Select and Table: the 2.6.0 control CSS reads the variables the palette defines', () => {
  const css = compile(doc('2.6.0', select(), table())).css;
  const defined = new Set([...css.matchAll(/(--kit-[a-z0-9-]+):/g)].map(m => m[1]));
  for (const token of [...selectContract.tokens, ...tableContract.tokens]) assert.ok(defined.has(token), `${token} is defined for the controls`);
  const withColor = compile({...doc('2.6.0', select(), table()), colorPalette: 'static-kit'}).css;
  assert.ok(withColor.includes('tbody tr[aria-selected=true]{background:var(--kit-table-selected)}'));
});

// ---------------------------------------------------------------- 4. 편집 연산이 같은 후보를 낸다

test('applyOp insertNode accepts the extension parts only in 2.6.0 documents', () => {
  const fresh = version => ({...applyOp(null, 'resetDocument', {template: 'dashboard-overview'}).doc, catalogVersion: version});
  for (const [version, expected] of [['2.4.0', false], ['2.5.0', false], ['2.6.0', true]]) {
    for (const node of [SELECT.example, TABLE.example]) {
      const r = applyOp(fresh(version), 'insertNode', {parent: [], node: structuredClone(node)});
      assert.equal(r.ok, expected, `${version} ${node.type}: ${JSON.stringify(r.errors?.map(e => e.code))}`);
      if (!expected) assert.equal(r.errors[0].code, 'VERSION_FIELD');
    }
  }
});

// ---------------------------------------------------------------- 5. 스키마

test('the blueprint schema exposes the 2.6.0 extensions under x-since without changing the 2.4.0/2.5.0 definitions', () => {
  const schema = blueprintSchema(), ext = schema['x-extensions']['2.6.0'];
  assert.equal(ext['x-since'], '2.6.0');
  assert.deepEqual(Object.keys(ext.$defs), ['chart', 'select-control', 'data-table']);
  for (const def of Object.values(ext.$defs)) assert.equal(def['x-since'], '2.6.0');
  // 기본 $defs는 부품 55개 그대로이고 차트는 기존 5형태 그대로다.
  assert.deepEqual(Object.keys(schema.$defs), nodeTypes);
  assert.deepEqual(schema.$defs.chart.properties.kind.enum, ['bar', 'bars-h', 'line', 'area', 'donut']);
  assert.ok(!Object.hasOwn(schema.$defs.chart.properties, 'axis') && !Object.hasOwn(schema.$defs, 'select-control'));
  assert.deepEqual(ext.$defs.chart.properties.kind.enum, nodeSpecAt('chart', '2.6.0').fields.kind.enum);
  assert.ok(ext.$defs.chart.properties.kind.enum.includes('scatter') && ext.$defs.chart.properties.axis);
  assert.deepEqual(ext.children.page, ['select-control', 'data-table']);
  assert.ok(!Object.hasOwn(ext.children, 'grid'));
  // 열거값·필수 필드는 노드 명세와 같다.
  assert.deepEqual(ext.$defs['select-control'].required, ['type', 'id', 'label', 'options']);
  assert.deepEqual(ext.$defs['data-table'].required, ['type', 'id', 'title', 'columns', 'rows']);
  assert.equal(ext.$defs['data-table'].properties.rows.items.additionalProperties.oneOf.length, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(schema)), schema, 'the schema is plain JSON');
});

// ---------------------------------------------------------------- 6. 서비스 읽기 질의

test('listMaterials filters, pages and tells the web where each material is chosen in a Blueprint', () => {
  const total = catalogRegistry().counts().materials;
  const all = listMaterials({limit: 1});
  assert.ok(all.ok && all.value.total === total && all.value.nextCursor === 'o1');
  assert.equal(Object.values(all.value.byKind).reduce((a, b) => a + b, 0), total);
  const charts = listMaterials({kind: 'chart-preset', fields: ['blueprint', 'quality']});
  assert.equal(charts.value.total, chartPresetMaterials.length);
  assert.deepEqual(charts.value.items.map(item => item.id).sort(), chartPresetMaterials.map(material => material.id).sort());
  assert.ok(charts.value.items.every(i => i.blueprint.node === 'chart' && i.blueprint.since === '2.6.0' && i.quality === 'verified'));
  const since = listMaterials({since: '2.6.0', kind: 'component', fields: ['blueprint']});
  const components = [
    {id: 'component:data-table', blueprint: {node: 'data-table', since: '2.6.0'}},
    {id: 'component:select-control', blueprint: {node: 'select-control', since: '2.6.0'}},
    ...controlMaterials.map(({id}) => ({id, blueprint: null})),
  ];
  assert.deepEqual(since.value.items, components.sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(listMaterials({kind: 'type-role-preset', fields: ['blueprint']}).value.items.map(i => i.blueprint.value).sort(), ['dashboard', 'document', 'erp', 'marketing']);
  assert.equal(listMaterials({kind: 'color-token', limit: 1}).value.total, 257);
  assert.equal(listMaterials({query: 'select'}).value.items.some(i => i.id === 'component:select-control'), true);
  // 쪽 나누기는 겹치지 않고 빠지지 않는다.
  const seen = new Set(); let cursor;
  do { const page = listMaterials({kind: 'component', limit: 20, ...(cursor ? {cursor} : {})}); page.value.items.forEach(i => { assert.ok(!seen.has(i.id)); seen.add(i.id); }); cursor = page.value.nextCursor; } while (cursor);
  assert.equal(seen.size, catalogRegistry().counts().byKind.component);
  // 잘못된 인자는 구조화 진단이다.
  for (const [args, path] of [[{kind: 'nope'}, '$args.kind'], [{category: 'nope'}, '$args.category'], [{minQuality: 'great'}, '$args.minQuality'], [{limit: 0}, '$args.limit'], [{cursor: 'x'}, '$args.cursor'], [{fields: ['nope']}, '$args.fields[0]'], [{unknown: 1}, '$args.unknown'], [{preset: 'yes'}, '$args.preset']]) {
    const r = listMaterials(args);
    assert.equal(r.ok, false, JSON.stringify(args));
    assert.equal(r.errors[0].path, path);
    assert.ok(r.errors[0].hint);
  }
  assert.equal(listMaterials('x').ok, false);
});

test('getMaterial returns the full contract and the Blueprint slot, and rejects unknown ids', () => {
  const select = getMaterial({id: 'component:select-control'});
  assert.ok(select.ok);
  assert.deepEqual(select.value.blueprint, {node: 'select-control', since: '2.6.0'});
  assert.deepEqual(select.value.variants.mode, ['single', 'multiple']);
  assert.ok(select.value.validation.codes.includes('SELECT_COMBO'));
  assert.ok(Object.isFrozen(catalogRegistry().get('component:select-control')) && !Object.isFrozen(select.value), 'callers get a copy');
  assert.deepEqual(getMaterial({id: 'type-role-preset:erp'}).value.blueprint, {field: 'typeRoles', value: 'erp', since: '2.6.0'});
  assert.deepEqual(getMaterial({id: 'component:card'}).value.blueprint, {node: 'card', since: null});
  assert.equal(getMaterial({id: 'chart-preset:mobile-sparkline'}).value.blueprint.kind, 'sparkline');
  const missing = getMaterial({id: 'component:nope'});
  assert.equal(missing.ok, false); assert.equal(missing.errors[0].code, 'UNKNOWN_MATERIAL'); assert.ok(HINTS.UNKNOWN_MATERIAL);
  assert.equal(getMaterial({}).ok, false);
  assert.equal(getMaterial({id: 'x', extra: 1}).ok, false);
});

test('getColorTokens resolves the same values the compiler writes, for a mode, a layer or a document', () => {
  const dark = getColorTokens({mode: 'dark'});
  assert.ok(dark.ok);
  assert.equal(dark.value.tokens.action, resolveColorTokens({mode: 'dark'}).tokens.action);
  assert.ok(dark.value.report.every(r => r.ratio >= r.minimum));
  assert.deepEqual(Object.keys(dark.value.layers), ['primitive', 'semantic', 'state', 'component']);
  const semantic = getColorTokens({layer: 'semantic'});
  assert.deepEqual(Object.keys(semantic.value.layers), ['semantic']);
  assert.ok(Object.keys(semantic.value.references).every(id => id.startsWith('semantic.')));
  assert.deepEqual(Object.keys(getColorTokens({mode: 'auto'}).value.modes), ['light', 'dark']);
  assert.ok(getColorTokens({}).value.components.select.states.includes('error'));
  // 문서의 값으로 해석하면 컴파일러가 쓴 값과 같다.
  const b = {...createBlueprint('saas-landing'), catalogVersion: '2.6.0', colorPalette: 'static-kit', mode: 'dark'};
  const fromDoc = getColorTokens({blueprint: b});
  assert.equal(fromDoc.value.mode, 'dark');
  assert.ok(compile(b).css.includes(`--kit-action:${fromDoc.value.tokens.action};`));
  for (const args of [{blueprint: {...b, catalogVersion: '2.5.0'}}, {blueprint: createBlueprint('saas-landing')}]) { const r = getColorTokens(args); assert.equal(r.ok, false); assert.equal(r.errors[0].code, 'VERSION_FIELD'); }
  for (const [args, code] of [[{palette: 'coolors'}, 'UNKNOWN_COLOR_PALETTE'], [{palette: '#ff0000'}, 'UNKNOWN_COLOR_PALETTE'], [{mode: 'sepia'}, 'BAD_REQUEST'], [{layer: 'brand'}, 'BAD_REQUEST'], [{blueprint: b, mode: 'dark'}, 'BAD_REQUEST'], [{blueprint: 'x'}, 'BAD_REQUEST'], [{extra: 1}, 'BAD_REQUEST']]) {
    const r = getColorTokens(args); assert.equal(r.ok, false, JSON.stringify(args).slice(0, 60)); assert.equal(r.errors[0].code, code);
  }
});

test('getTypePresets lists the four role presets, and one preset comes with the CSS the compiler emits', () => {
  const all = getTypePresets();
  assert.ok(all.ok);
  assert.deepEqual(all.value.presets.map(p => p.id), ['erp', 'dashboard', 'document', 'marketing']);
  assert.ok(all.value.presets.every(p => p.css === undefined && p.blueprint.field === 'typeRoles' && p.roles.display && p.controls.medium && p.appliesTo.display.includes('title')));
  const one = getTypePresets({id: 'document'});
  assert.equal(one.value.presets.length, 1);
  assert.equal(one.value.presets[0].css, renderRoleTypeCSS('document'));
  const b = {...createBlueprint('article'), catalogVersion: '2.6.0', typeRoles: 'marketing'};
  assert.equal(getTypePresets({blueprint: b}).value.presets[0].id, 'marketing');
  for (const [args, code] of [[{id: 'newsroom'}, 'UNKNOWN_TYPE_PRESET'], [{blueprint: {...b, typeRoles: 'newsroom'}}, 'UNKNOWN_TYPE_PRESET'], [{blueprint: createBlueprint('article')}, 'VERSION_FIELD'], [{id: 'erp', blueprint: b}, 'BAD_REQUEST'], [{extra: 1}, 'BAD_REQUEST']]) {
    const r = getTypePresets(args); assert.equal(r.ok, false, JSON.stringify(args).slice(0, 60)); assert.equal(r.errors[0].code, code);
  }
});

test('component queries show the 2.6.0 parts only when asked for catalogVersion 2.6.0, and the default answers stay as they were', () => {
  assert.equal(getComponentSpec({type: 'select-control'}).ok, false);
  assert.match(getComponentSpec({type: 'select-control'}).errors[0].hint, /2\.6\.0/);
  const spec = getComponentSpec({type: 'data-table', catalogVersion: '2.6.0'});
  assert.ok(spec.ok);
  assert.deepEqual(spec.value.required, ['type', 'id', 'title', 'columns', 'rows']);
  assert.equal(spec.value.example.type, 'data-table');
  assert.deepEqual(getComponentSpec({type: 'page', catalogVersion: '2.6.0'}).value.children.allowed.slice(-2), ['select-control', 'data-table']);
  assert.ok(!getComponentSpec({type: 'page'}).value.children.allowed.includes('select-control'));
  assert.ok(getComponentSpec({type: 'chart', catalogVersion: '2.6.0'}).value.fields.kind.enum.includes('heatmap'));
  assert.ok(!getComponentSpec({type: 'chart'}).value.fields.kind.enum.includes('heatmap'));
  assert.equal(getComponentSpec({type: 'card', catalogVersion: '2.9.9'}).ok, false);
  const listed = listCatalog({kind: 'components', filter: {catalogVersion: '2.6.0'}, fields: ['since', 'childTypes'], limit: 200});
  assert.equal(listed.value.total, 57);
  assert.deepEqual(listed.value.items.filter(i => i.since).map(i => i.type), ['select-control', 'data-table']);
  assert.equal(listCatalog({kind: 'components'}).value.total, nodeTypes.length);
  assert.equal(listCatalog({kind: 'components', filter: {catalogVersion: '9.9.9'}}).ok, false);
  const schemaDefault = getSchema({target: 'component', type: 'select-control'});
  assert.equal(schemaDefault.ok, false);
  const schemaNew = getSchema({target: 'component', type: 'select-control', catalogVersion: '2.6.0'});
  assert.ok(schemaNew.ok && schemaNew.value.properties.mode.enum.includes('multiple'));
  assert.ok(getSchema({target: 'component', type: 'chart', catalogVersion: '2.6.0'}).value.properties.kind.enum.includes('scatter'));
  assert.ok(!getSchema({target: 'component', type: 'chart'}).value.properties.kind.enum.includes('scatter'));
  assert.equal(getSchema({target: 'blueprint', catalogVersion: '2.6.0'}).ok, false, 'catalogVersion only applies to component schemas');
});

test('the compile path reads only the material render/style modules; the registry is read by the service query file alone', () => {
  const importsOf = f => [...read(f).matchAll(/^\s*import .*from ['"]([^'"]*materials\/[^'"]*)['"]/gm)].map(m => m[1].replace(/^.*materials\//, ''));
  assert.deepEqual(importsOf('src/render/nodes.mjs').sort(), ['select.mjs', 'table.mjs']);
  assert.deepEqual(importsOf('src/styles/index.mjs').sort(), ['select.mjs', 'table.mjs', 'typography.mjs']);
  assert.deepEqual(importsOf('src/render/index.mjs').sort(), ['select.mjs', 'table.mjs']);
  assert.deepEqual(importsOf('src/validate.mjs'), []);
  assert.deepEqual(importsOf('src/service/index.mjs'), []);
  assert.deepEqual(importsOf('src/service/materials.mjs'), ['index.mjs', 'typography.mjs']);
  assert.ok(!/import .*materials\/(index|registry|adapters)/.test(read('src/compiler.mjs') + read('src/edit/applicability.mjs')));
});

test('the package exports stay ./service and ./edit only', () => {
  assert.deepEqual(Object.keys(JSON.parse(read('package.json')).exports), ['./service', './edit']);
  assert.ok(ACCEPTED_CATALOG_VERSIONS.includes('2.6.0'));
  assert.deepEqual(migrateBlueprint(createBlueprint('saas-landing'), '2.6.0').catalogVersion, '2.6.0');
});
