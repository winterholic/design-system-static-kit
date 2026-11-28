import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {
  PURPOSE_FAMILY_IDS, PURPOSE_FAMILIES, PURPOSE_FIELDS, PURPOSE_GROUPS, getPurposeFamily, validatePurposeFamilies, renderPurposeFamily, assembleFamilies, combinationMatrix,
  checkPurposeCombination, definePurposeFamily, validatePurposeFamily, BASE_MARKERS, VISUAL_LANGUAGES,
} from '../src/platform/families/index.mjs';
import {renderCard} from '../src/materials/card.mjs';

const env = createPlatform();
const VISUALS = env.registry.list('family').map(f => f.id);
const GROUP_COUNTS = {card: 8, button: 12, navigation: 4, form: 5, table: 3, feedback: 5};
const exampleOf = (f, visual) => ({visual, variant: f.example.variant, props: f.example.props, content: f.example.content});

test('purpose family ids are fixed and grouped as the task card lists them (Card 8, Button 7 + A 계열 5, Navigation 4, Form 5, Table 3, Modal/Feedback 5)', () => {
  assert.deepEqual(PURPOSE_FAMILIES.map(f => f.id), PURPOSE_FAMILY_IDS);
  for (const [g, n] of Object.entries(GROUP_COUNTS)) assert.equal(PURPOSE_FAMILIES.filter(f => f.group === g).length, n, g);
  assert.deepEqual([...PURPOSE_GROUPS].sort(), Object.keys(GROUP_COUNTS).sort());
  assert.equal(new Set(PURPOSE_FAMILY_IDS).size, 37);
  assert.equal(getPurposeFamily('purpose:card.kpi').group, 'card');
  assert.equal(getPurposeFamily('purpose:card.nope'), null);
});

test('every purpose family carries all required fields and passes the family contract check', () => {
  assert.deepEqual(validatePurposeFamilies(env), []);
  for (const f of PURPOSE_FAMILIES) {
    for (const k of Object.keys(PURPOSE_FIELDS)) assert.ok(Object.hasOwn(f, k), `${f.id}.${k}`);
    assert.equal(typeof f.render, 'function');
    assert.ok(f.tokens.length > 0 || f.sharedCss === '' || f.css === '', `${f.id} lists the tokens its CSS reads`);
    assert.ok(Object.isFrozen(f));
  }
  // 모양 검사는 실제로 거른다: 필수 필드가 빠지거나 기본값이 허용 밖이면 오류다.
  const f = PURPOSE_FAMILIES[0];
  const broken = definePurposeFamily({...f, id: 'purpose:card.broken', defaults: {...f.defaults, size: 'huge'}, purpose: ' ', render: f.render});
  const codes = validatePurposeFamily(broken).map(e => e.code);
  assert.ok(codes.includes('P_PURPOSE_DEFAULT') && codes.includes('P_PURPOSE_PURPOSE'), codes.join());
  const {entry: _drop, ...noEntry} = f;
  assert.ok(validatePurposeFamily(definePurposeFamily({...noEntry, render: f.render})).some(e => e.path === '$.entry'));
  const ghost = definePurposeFamily({...f, children: [...f.children, 'base-component:ghost']});
  assert.ok(validatePurposeFamily(ghost, {baseIds: env.registry.list('base-component').map(b => b.id)}).some(e => e.code === 'P_PURPOSE_BASE'));
});

test('every purpose family × visual family either renders its example or is rejected with a stated reason, and the rejections are exactly the declared ones', () => {
  const rejected = [];
  for (const row of combinationMatrix(env)) for (const [visual, cell] of Object.entries(row.cells)) {
    if (!cell.ok) { rejected.push(`${row.purpose} × ${visual}`); assert.ok(cell.reasons.every(r => r.message.length > 10 && /^P_PURPOSE_(VISUAL|COMBO)$/.test(r.code)), `${row.purpose} × ${visual}: ${JSON.stringify(cell.reasons)}`); }
    else { const r = renderPurposeFamily(env, row.purpose, exampleOf(getPurposeFamily(row.purpose), visual)); assert.ok(r.ok, `${row.purpose} × ${visual}: ${JSON.stringify(r.errors)}`); }
  }
  assert.deepEqual(rejected.sort(), EXPECTED_REJECTIONS.sort());
});

test('rendered output: no P_TOKEN_MISSING and no P_CHECK_CONTRAST for any accepted purpose family × visual family × mode', () => {
  let assembled = 0;
  for (const f of PURPOSE_FAMILIES) for (const visual of VISUALS) for (const mode of ['light', 'dark']) {
    if (!checkPurposeCombination(f, exampleOf(f, visual)).ok) continue;
    const context = f.contexts.includes('any') ? 'dashboard' : f.contexts[0];
    const r = assembleFamilies(env, {context, mode, items: [{purpose: f.id, ...exampleOf(f, visual)}]});
    const codes = r.diagnostics.map(d => d.code);
    assert.deepEqual(codes.filter(c => c === 'P_TOKEN_MISSING' || c === 'P_CHECK_CONTRAST'), [], `${f.id} × ${visual} ${mode}: ${r.diagnostics.map(d => d.message)}`);
    assert.equal(r.ok, true, `${f.id} × ${visual} ${mode}: ${JSON.stringify(r.diagnostics)}`);
    assert.ok(r.value.manifest.contrast.families.every(c => c.pairs.every(p => p.ok && p.ratio !== null)), 'every declared pair resolved to a real ratio');
    assembled++;
  }
  assert.equal(assembled, (PURPOSE_FAMILIES.length * VISUALS.length - EXPECTED_REJECTIONS.length) * 2);
});

test('the checks have teeth: a token the CSS reads without a value, and a pair below its minimum, are reported', () => {
  const f = getPurposeFamily('purpose:card.kpi');
  const mutated = {...f, css: f.css + '.x{color:var(--kit-not-a-token)}', pairs: [...f.pairs, ['--kit-muted', '--kit-surface', 21, 'impossible']]};
  const r = assembleFamilies(env, {context: 'dashboard', items: [{purpose: f.id, ...exampleOf(f, 'family:quiet')}]}, {definitions: new Map([[f.id, mutated]])});
  const codes = r.diagnostics.map(d => d.code);
  assert.ok(codes.includes('P_TOKEN_MISSING'), codes.join());
  assert.ok(codes.includes('P_CHECK_CONTRAST'), codes.join());
});

test('individual value validity and combination validity are reported under different codes', () => {
  const kpi = getPurposeFamily('purpose:card.kpi');
  const ok = {visual: 'family:quiet', variant: {layout: 'stacked'}, props: {size: 'medium'}, content: {label: 'a', value: '1'}};
  assert.equal(checkPurposeCombination(kpi, ok).ok, true);
  const individual = [
    [{variant: {layout: 'diagonal'}}, 'P_PURPOSE_VARIANT'], [{variant: {nope: 'x'}}, 'P_PURPOSE_VARIANT'], [{props: {size: 'huge'}}, 'P_PURPOSE_PROP'], [{props: {appearance: 'outline'}}, 'P_PURPOSE_PROP'],
    [{content: {label: 'a'}}, 'P_PURPOSE_CONTENT'], [{content: {label: 'a', value: '1', surprise: 'x'}}, 'P_PURPOSE_CONTENT'], [{visual: 'family:ghost'}, 'P_PURPOSE_VISUAL_UNKNOWN'],
  ];
  for (const [patch, code] of individual) { const r = checkPurposeCombination(kpi, {...ok, ...patch}); assert.equal(r.ok, false); assert.equal(r.errors[0].code, code, JSON.stringify(patch)); }
  // 값은 모두 유효하지만 함께 쓰면 안 되는 조합
  const combo = checkPurposeCombination(kpi, {...ok, variant: {layout: 'inline', trend: 'spark'}});
  assert.equal(combo.ok, false);
  assert.deepEqual(combo.errors.map(e => e.code), ['P_PURPOSE_COMBO']);
  assert.equal(combo.errors[0].id, 'KPI_INLINE_SPARK');
  assert.match(combo.errors[0].message, /추세선/);
  assert.equal(checkPurposeCombination(kpi, {...ok, variant: {layout: 'inline'}}).ok, true, 'each axis alone is valid');
  assert.equal(checkPurposeCombination(kpi, {...ok, variant: {trend: 'spark'}}).ok, true, 'each axis alone is valid');
  const r = renderPurposeFamily(env, kpi.id, {...ok, variant: {layout: 'inline', trend: 'spark'}});
  assert.equal(r.ok, false); assert.equal(r.html, null); assert.equal(r.errors[0].code, 'P_PURPOSE_COMBO');
  // 시각 패밀리 쪽 이유는 측정값으로 계산된다
  const dense = getPurposeFamily('purpose:table.dense');
  const byVisual = Object.fromEntries(VISUALS.map(v => [v, checkPurposeCombination(dense, exampleOf(dense, v))]));
  assert.equal(byVisual['family:quiet'].ok, true); assert.equal(byVisual['family:bold'].ok, true);
  for (const v of ['family:soft', 'family:editorial']) { assert.equal(byVisual[v].ok, false); assert.equal(byVisual[v].errors[0].code, 'P_PURPOSE_VISUAL'); assert.match(byVisual[v].errors[0].message, /셀 상하 패딩 12px/); }
});

test('purpose and visual families are independent axes: the same purpose differs across visuals, the same visual differs across purposes', () => {
  const html = (id, v) => renderPurposeFamily(env, id, exampleOf(getPurposeFamily(id), v)).html;
  for (const id of ['purpose:card.kpi', 'purpose:card.pricing', 'purpose:button.primary']) {
    const outs = VISUALS.map(v => html(id, v));
    assert.equal(new Set(outs).size, VISUALS.length, `${id} renders differently per visual family`);
    // 구조(태그·클래스 골격)는 같고 시각 언어가 고정한 축만 바뀐다
    const skeleton = s => s.replace(/data-(appearance|shape|family)="[^"]*"/g, '').replace(/id="[^"]*"/g, '');
    assert.equal(new Set(outs.map(skeleton)).size, 1, `${id}: only the visual axes differ`);
  }
  const cards = PURPOSE_FAMILIES.filter(f => f.group === 'card').map(f => html(f.id, 'family:quiet'));
  const skeleton = s => s.replace(/>[^<]*</g, '><').replace(/ (id|href|aria-[a-z]+|value|points|d|aria-label)="[^"]*"/g, '');
  assert.equal(new Set(cards.map(skeleton)).size, cards.length, 'eight card families have eight different markup structures');
  for (const g of PURPOSE_GROUPS) {
    const sk = PURPOSE_FAMILIES.filter(f => f.group === g).map(f => skeleton(html(f.id, 'family:quiet')));
    assert.equal(new Set(sk).size, sk.length, `${g} families do not share one markup structure`);
  }
});

test('the base component is not reimplemented: each family renders only the children it declares, and Card families keep the card shell attributes', () => {
  for (const f of PURPOSE_FAMILIES) for (const visual of VISUALS) {
    if (!checkPurposeCombination(f, exampleOf(f, visual)).ok) continue;
    const r = renderPurposeFamily(env, f.id, exampleOf(f, visual));
    for (const [id, re] of Object.entries(BASE_MARKERS)) {
      if (re.test(r.html)) assert.ok(f.children.includes(id), `${f.id} output contains ${id} but does not declare it`);
    }
    for (const b of r.bases) assert.ok(f.children.includes(b), `${f.id} used undeclared ${b}`);
  }
  const attrNames = html => [...(/<article class="kit-ctl-card[^"]*" data-ctl="card" id="[^"]*" ([^>]*)>/.exec(html)?.[1] ?? '').matchAll(/(data-[a-z]+)=/g)].map(m => m[1]);
  const base = attrNames(renderCard({id: 'x', title: 't'}));
  for (const f of PURPOSE_FAMILIES.filter(x => x.group === 'card')) {
    const own = attrNames(renderPurposeFamily(env, f.id, exampleOf(f, 'family:quiet')).html);
    assert.deepEqual(own.slice(0, base.length), base, `${f.id}: shell attributes keep renderCard's order and names (attachCard and the card CSS read them)`);
  }
});

test('purpose family output is deterministic and escapes content', () => {
  const f = getPurposeFamily('purpose:card.kpi');
  const req = {visual: 'family:soft', variant: {layout: 'stacked'}, props: {size: 'medium'}, content: {label: '<img src=x onerror=alert(1)>', value: '"><script>1</script>'}};
  const a = renderPurposeFamily(env, f.id, req), b = renderPurposeFamily(env, f.id, req);
  assert.equal(a.html, b.html);
  assert.doesNotMatch(a.html, /<img |<script>/);
  assert.match(a.html, /&lt;img/);
  assert.equal(renderPurposeFamily(env, f.id, {...req, id: 'Bad Id'}).errors[0].code, 'P_PURPOSE_ID');
  assert.equal(renderPurposeFamily(env, 'purpose:card.nope', req).errors[0].code, 'P_PURPOSE_UNKNOWN');
});

test('every visual family has visual metrics and no visual family hard-codes color or typeface values', () => {
  assert.deepEqual(Object.keys(VISUAL_LANGUAGES).sort(), [...VISUALS].sort());
  for (const [id, v] of Object.entries(VISUAL_LANGUAGES)) for (const [k, val] of Object.entries(v.vars)) assert.doesNotMatch(val, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, `${id} ${k}`);
  for (const f of PURPOSE_FAMILIES) assert.doesNotMatch(f.sharedCss + f.css, /#[0-9a-fA-F]{3,8}\b(?![^{]*\})|[^-]rgba?\(|hsla?\(|font-family:\s*(?!var\()/, `${f.id} CSS uses only var(--kit-*) for color and font`);
});

const EXPECTED_REJECTIONS = [
  'purpose:table.dense × family:soft', 'purpose:table.dense × family:editorial', 'purpose:navigation.bottom × family:editorial', 'purpose:form.group × family:editorial',
  // 12개 시각 패밀리(REQUEST §7): 표 셀 여백이 12px인 패밀리는 고밀도 표를, 면이 반투명인 패밀리는 본문 위에 고정되는 하단 내비를 거부한다(이유는 visual.mjs metrics가 traits에서 계산)
  'purpose:table.dense × family:luxury', 'purpose:table.dense × family:tonal-layered', 'purpose:navigation.bottom × family:glass',
];
