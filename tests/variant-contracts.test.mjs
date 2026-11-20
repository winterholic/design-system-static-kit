import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/catalog.mjs';
import {enumerateCombos, findCombo, filterCombos, renderCombo} from '../src/combos.mjs';

// 구성 변형의 결과 계약(docs/adr/0006-variant-contracts-and-page-rules.md). 옵션을 지우지 않고, 결과가 계약을 어기면 "기본 추천에서 제외"만 한다.
// 이 시험은 진단 문서(docs/quality-diagnosis-2026-11-21.md) 4절 B1~B4의 재현이고, 판정 오라클은 구현과 따로 적은 트리 비교다.
const {templateList, templates, applyLayout, layoutOptionsOf} = catalog;
const walk = (nodes, fn) => { for (const n of nodes ?? []) { fn(n); walk(n.children, fn); } };
const find = (tree, type) => { const out = []; walk(tree, n => { if (n.type === type) out.push(n); }); return out; };
const option = (templateId, slot, id) => layoutOptionsOf(templateId).find(s => s.id === slot)?.options.find(o => o.id === id);
const rulesOf = o => (o?.rules ?? []).map(r => r.id);

test('contracts are structured data: each names a measured claim, a closed check kind and why', () => {
  const contracts = catalog.variantContracts;
  assert.ok(Array.isArray(contracts), 'catalog exports variantContracts');
  assert.deepEqual(contracts.map(c => c.id), ['V01', 'V02', 'V03', 'V04', 'V05', 'V06']);
  for (const c of contracts) {
    assert.match(c.id, /^V\d\d$/);
    assert.ok(c.why.length > 20 && c.source && c.check?.kind, c.id);
    assert.ok(catalog.variantCheckKinds.includes(c.check.kind), c.id + ' uses a check kind the engine implements');
    assert.ok(c.slots === '*' || (Array.isArray(c.slots) && c.slots.every(s => catalog.layoutSlotIds.includes(s))), c.id);
    assert.equal(c.effect, 'not-recommended', c.id + ' never deletes an option');
  }
  assert.deepEqual(contracts.filter(c => c.claim).map(c => c.claim), ['Q14', 'Q15', 'Q11', 'Q12']);
});

test('V01 / Q14: a hero change that drops the product visual is not recommended, one that keeps it is', () => {
  const t = templates['saas-landing'];
  assert.ok(find(t.tree, 'hero')[0].visual, 'precondition: S01 hero carries the product visual');
  for (const id of ['statement', 'centered', 'cover']) {
    const o = option('saas-landing', 'hero', id);
    assert.ok(o, id + ' stays selectable (experimental freedom)');
    assert.equal(o.recommended, false, id);
    assert.deepEqual(rulesOf(o), ['V01'], id);
    assert.equal(find(applyLayout(t.tree, {hero: id}, t.pageType), 'hero')[0].visual, undefined, id + ' still renders exactly as before when chosen explicitly');
  }
  assert.equal(option('saas-landing', 'hero', 'product')?.recommended, true);
});

test('V01 property: over every template, an option is flagged exactly when the hero loses a visual it had', () => {
  let checked = 0, flagged = 0;
  for (const t of templateList) {
    const before = find(t.tree, 'hero')[0];
    for (const o of layoutOptionsOf(t.id).find(s => s.id === 'hero')?.options ?? []) {
      const after = find(applyLayout(t.tree, {hero: o.id}, t.pageType), 'hero')[0], lost = !!before.visual && !after.visual;
      assert.equal(rulesOf(o).includes('V01'), lost, `${t.id} hero:${o.id}`);
      checked++; if (lost) flagged++;
    }
  }
  assert.ok(checked >= 80 && flagged >= 30, `${checked} hero options, ${flagged} flagged`);
});

test('V02 / Q15: a card style that leaves a quarter or more of the cards untouched is not recommended', () => {
  const t = templates['saas-landing'], styles = tree => find(tree, 'card').map(c => c.variant ?? 'basic');
  assert.deepEqual(styles(t.tree).sort(), ['basic', 'media'], 'precondition: S04 has one basic and one media card');
  for (const id of ['outline', 'filled']) { const o = option('saas-landing', 'cards', id); assert.ok(o, id); assert.deepEqual(rulesOf(o), ['V02'], id); assert.equal(o.recommended, false); }
  // 바뀐 카드 / 전체 카드 ≥ 0.75이면 통과한다. 오라클은 전후 트리 비교다.
  for (const tp of templateList) for (const o of layoutOptionsOf(tp.id).find(s => s.id === 'cards')?.options ?? []) {
    const a = styles(tp.tree), b = styles(applyLayout(tp.tree, {cards: o.id}, tp.pageType)), ratio = a.filter((v, i) => v !== b[i]).length / a.length;
    assert.equal(rulesOf(o).includes('V02'), ratio < 0.75, `${tp.id} cards:${o.id} ratio ${ratio}`);
  }
});

test('V03 / Q11: a column count that wraps a short KPI row is not recommended; other grids are not affected', () => {
  for (const [id, expected] of [['dashboard-overview', ['V03']], ['hr-people', ['V03']], ['dashboard-analytics', ['V03']]]) {
    const o = option(id, 'columns', 'two'); assert.ok(o, id); assert.deepEqual(rulesOf(o), expected, id); assert.equal(o.recommended, false);
  }
  const wrapsKpi = (tree) => find(tree, 'grid').some(g => g.children.length <= 4 && g.children.every(c => c.type === 'metric') && g.children.length > {two: 2, three: 3, four: 4}[g.columns]);
  let flagged = 0;
  for (const tp of templateList) for (const o of layoutOptionsOf(tp.id).find(s => s.id === 'columns')?.options ?? []) {
    assert.equal(rulesOf(o).includes('V03'), wrapsKpi(applyLayout(tp.tree, {columns: o.id}, tp.pageType)), `${tp.id} columns:${o.id}`);
    if (rulesOf(o).includes('V03')) flagged++;
  }
  assert.ok(flagged >= 3, 'at least the three dashboards are flagged, got ' + flagged);
});

test('V04 / Q12: a centred heading over left-aligned content is not recommended; a centred heading over centred content is', () => {
  for (const [id, slot, opt] of [['saas-landing', 'heads', 'center'], ['article', 'intro', 'center']]) {
    const o = option(id, slot, opt); assert.ok(o, `${id} ${slot}:${opt}`); assert.deepEqual(rulesOf(o), ['V04'], id); assert.equal(o.recommended, false);
  }
  // 반례: 본문이 스스로 가운데 정렬인 부품(로고 줄)만 든 섹션은 머리말을 가운데로 바꿔도 정렬축이 하나다.
  const tree = [
    {type: 'page-header', title: '로고 모음'},
    {type: 'section', title: '함께하는 팀', children: [{type: 'logo-cloud', names: ['가', '나', '다']}]},
    {type: 'section', title: '함께하는 곳', children: [{type: 'logo-cloud', names: ['라', '마', '바']}]},
  ];
  const heads = catalog.layoutSlots(tree, 'landing').find(s => s.id === 'heads');
  assert.ok(heads, 'heads slot opens on the counter-example');
  assert.equal(heads.options[0].recommended, true);
  assert.deepEqual(heads.options[0].rules, []);
});

test('V05: an option measured to leave the rendered page unchanged is not recommended (neutral)', () => {
  const key = 'saas-landing~rhythm:banded';
  const neutral = {[key]: {widths: [1440, 390]}};
  const withMeasure = catalog.layoutSlots(templates['saas-landing'].tree, 'landing', {templateId: 'saas-landing', neutral});
  const o = withMeasure.find(s => s.id === 'rhythm').options.find(x => x.id === 'banded');
  assert.deepEqual(rulesOf(o), ['V05']); assert.equal(o.recommended, false);
  const without = catalog.layoutSlots(templates['saas-landing'].tree, 'landing', {templateId: 'saas-landing', neutral: {}});
  assert.equal(without.find(s => s.id === 'rhythm').options.find(x => x.id === 'banded').recommended, true);
  // 측정 데이터는 현재 카탈로그의 옵션만 가리켜야 한다(낡은 항목이 남지 않게).
  for (const k of Object.keys(catalog.neutralOptions ?? {})) {
    const [tpl, slot, opt] = k.split(/~|:/);
    assert.ok(option(tpl, slot, opt), 'stale neutral entry ' + k);
  }
  assert.ok(catalog.neutralOptions && catalog.neutralMeta?.date, 'the generated measurement file is wired in');
});

test('assessLayout explains a combination: which rule, which slot, which claim', () => {
  const t = templates['saas-landing'];
  const a = catalog.assessLayout(t.tree, {hero: 'statement', cards: 'filled', heads: 'center'}, t.pageType, {templateId: 'saas-landing'});
  assert.equal(a.recommended, false);
  assert.deepEqual(a.findings.map(f => `${f.slot}:${f.option}=${f.rule}/${f.claim}`).sort(), ['cards:filled=V02/Q15', 'heads:center=V04/Q12', 'hero:statement=V01/Q14']);
  for (const f of a.findings) assert.ok(f.detail && typeof f.detail === 'string', f.rule);
  assert.equal(catalog.assessLayout(t.tree, {hero: 'product'}, t.pageType, {templateId: 'saas-landing'}).recommended, true);
  assert.equal(catalog.assessLayout(t.tree, {}, t.pageType).recommended, true, 'the template default is always recommended');
});

test('combos keep every id (nothing is deleted) and carry the rule ids that moved them out of the default list', () => {
  const all = enumerateCombos();
  const c = findCombo('saas-landing~hero:statement');
  assert.ok(c, 'S02 still resolves');
  assert.match(c.experimental ?? '', /V01/);
  assert.deepEqual(c.rules?.map(r => `${r.slot}:${r.option}=${r.rule}`), ['hero:statement=V01']);
  assert.equal(findCombo('saas-landing~hero:product')?.experimental ?? null, null);
  assert.equal(findCombo('saas-landing')?.experimental ?? null, null);
  const hidden = filterCombos({experimental: false}, all);
  assert.ok(!hidden.some(x => x.id === c.id), 'default list hides it');
  assert.ok(filterCombos({experimental: true}, all).some(x => x.id === c.id), 'but it can be shown');
  assert.equal(findCombo('saas-landing~hero:statement~cards:filled').rules.length, 2, 'rules from each picked option are collected');
  // 템플릿 기본 구성은 어떤 계약에도 걸리지 않는다.
  assert.deepEqual(all.filter(x => !x.changed && x.experimental).map(x => x.id), []);
  assert.equal(renderCombo(c).ok, true, 'a flagged combination still renders');
});
