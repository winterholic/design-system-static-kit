import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/catalog.mjs';
import {selectRecipe, recipePicks, recipePickOf, recipeOfTemplate, evaluateRecipe, recipeCheck, recipeBlueprint, recipeCheckKinds, sizeAt} from '../src/recipes.mjs';
import {enumerateCombos, findCombo, comboId, comboBlueprint, recipeCombos, renderCombo, EMPTY_VIEW} from '../src/combos.mjs';

// Design Recipe(docs/recipes.md, ADR 0007): 기존 템플릿·테마·변형 위에서 "권장 조합"을 우선 고르는 데이터 계층과 결정적 선택 경로.
const {recipes, recipeRules} = catalog;
const knownRule = new Set([...recipeRules.map(r => r.id), ...catalog.variantContracts.map(r => r.id), ...catalog.pageRules.map(r => r.id)]);
const ids = Object.keys(recipes);

test('three recipes are small closed data: only known keys, known templates, known rule ids', () => {
  assert.deepEqual(ids, ['saas-landing', 'ops-dashboard', 'content-page']);
  const KEYS = ['label', 'pageTypes', 'purpose', 'content', 'templates', 'layout', 'looks', 'fit', 'emphasis', 'support', 'exempt', 'rules', 'avoid'];
  const owner = new Map();
  for (const [id, r] of Object.entries(recipes)) {
    assert.deepEqual(Object.keys(r), KEYS, id + ' has exactly the contract keys (no free-form fields)');
    assert.ok(r.purpose.length > 10 && r.content.form && r.emphasis.how && r.support.how, id);
    for (const t of r.templates) {
      assert.ok(catalog.templates[t], `${id}: template ${t}`); assert.ok(r.pageTypes.includes(catalog.templates[t].pageType), `${id}: ${t} page type`);
      assert.equal(owner.get(t), undefined, `${t} belongs to one recipe`); owner.set(t, id);
    }
    for (const [slot, order] of Object.entries(r.layout)) { assert.ok(catalog.layoutSlotIds.includes(slot), `${id}: slot ${slot}`); assert.equal(order[0], 'default'); }
    for (const l of r.looks) assert.ok(catalog.concepts[l.concept]?.looks.some(x => x.id === l.look), `${id}: look ${l.concept}/${l.look}`);
    for (const [axis, values] of Object.entries(r.fit)) for (const v of values) assert.ok(catalog.axes[axis]?.includes(v), `${id}: fit ${axis}=${v}`);
    for (const rule of r.rules) assert.ok(knownRule.has(rule), `${id}: unknown rule ${rule}`);
    for (const [t, byRule] of Object.entries(r.exempt)) for (const [rule, why] of Object.entries(byRule)) {
      assert.ok(r.templates.includes(t), `${id}: exempt template ${t} is covered`);
      assert.equal(recipeRules.find(x => x.id === rule)?.mode, 'select', `${id}: only select rules can be exempted (${rule})`);
      assert.ok(r.rules.includes(rule) && why.length > 30, `${id}: ${t}/${rule} exemption names its rule and a real reason`);
    }
    for (const a of r.avoid) {
      assert.ok(knownRule.has(a.rule) && a.why.length > 10, `${id}: avoid ${a.rule}`);
      assert.ok(('slot' in a && 'option' in a) !== ('axis' in a && 'value' in a), `${id}: avoid names a slot option or an axis value`);
    }
  }
  for (const rule of recipeRules) {
    assert.ok(rule.why.length > 20 && rule.source, rule.id);
    if (rule.mode === 'select') assert.ok(recipeCheckKinds.includes(rule.check.kind), rule.id);
    else assert.ok(rule.claim || rule.probe, rule.id + ' measured rules name a claim or a probe code');
  }
  assert.deepEqual(recipeRules.map(r => r.id), ['RC01', 'RC02', 'RC03', 'RC04', 'RC05', 'RC06', 'RC07', 'RC08', 'RC09']);
});

test('selection is deterministic: a fresh module instance returns the same pick and rationale for the same input', async () => {
  const fresh = await import('../src/recipes.mjs?fresh=' + Date.now());
  for (const p of recipePicks()) {
    const again = fresh.selectRecipe({recipe: p.recipeId, templateId: p.templateId});
    assert.deepEqual(again, p, p.templateId);
  }
  for (const r of ids) assert.deepEqual(fresh.selectRecipe({recipe: r}), selectRecipe({recipe: r}));
  assert.throws(() => selectRecipe({recipe: 'nope'}), /Unknown recipe/);
  assert.throws(() => selectRecipe({recipe: 'saas-landing', templateId: 'article'}), /not covered/);
});

test('every template pick satisfies all select rules, is a recommended combo, and records recipe id plus applied and avoided rule ids', () => {
  const picks = recipePicks();
  assert.equal(picks.length, Object.values(recipes).reduce((n, r) => n + r.templates.length, 0));
  for (const p of picks) {
    // 규칙을 못 지키는 선택은 추천하지 않고 이유(규칙 ID)를 남긴다. hr-people: 페이지 바로 아래 전폭 막대 차트라 브라우저 Q08이 실패한다(종횡 2.13배, RC05).
    const UNSATISFIED = {'hr-people': 'RC05'};
    if (UNSATISFIED[p.templateId]) { assert.equal(p.satisfied, false); assert.deepEqual(p.unmet.map(u => u.rule), [UNSATISFIED[p.templateId]]); assert.equal(findCombo(comboId(p.templateId, p.layout)).recipe, null); continue; }
    assert.equal(p.satisfied, true, `${p.templateId}: ${JSON.stringify(p.unmet)}`);
    assert.deepEqual(p.unmet, []);
    assert.ok(recipes[p.recipeId] && p.applied.length > 0);
    for (const a of p.applied) assert.ok(knownRule.has(a.rule));
    for (const a of p.avoided) assert.ok(knownRule.has(a.rule) && a.why);
    const combo = findCombo(comboId(p.templateId, p.layout));
    assert.ok(combo, p.templateId + ' pick resolves to an existing combo id');
    assert.equal(combo.experimental, null, `${combo.id} is a default-recommended combo`);
    assert.deepEqual(combo.recipe, {id: p.recipeId, view: p.view, rules: p.applied.map(a => a.rule), satisfied: true});
    // 갤러리·조립기가 쓰는 Blueprint 경로와 선택 함수가 평가한 Blueprint가 같아야 추천이 화면에서 지켜진다.
    assert.deepEqual(recipeBlueprint(p.templateId, p.layout, p.view), comboBlueprint(combo, p.view ? {...EMPTY_VIEW, ...p.view} : EMPTY_VIEW), p.templateId);
  }
  assert.equal(recipeCombos().length, picks.length - 1, 'only satisfied picks are marked as recommended');
  assert.equal(recipeOfTemplate('devtool-landing'), 'saas-landing'); assert.equal(recipeOfTemplate('checkout'), null); assert.equal(recipePickOf('checkout'), null);
});

test('the pick changes the default only where the default breaks a rule (S05 devtool-landing: no visual, 34px title)', () => {
  const p = selectRecipe({recipe: 'saas-landing', templateId: 'devtool-landing'});
  assert.deepEqual(p.layout, {hero: 'product'}); assert.deepEqual(p.view, {concept: 'saas', look: 'trust'});
  assert.ok(p.trace.length >= 1 && p.trace.every(t => t.failed.length), 'rejected candidates are traced with the rules they failed');
  assert.ok(p.avoided.some(a => a.rule === 'RC02' && a.what === 'scale=tight'));
  const def = evaluateRecipe('saas-landing', 'devtool-landing');
  const failed = def.failures.map(f => f.rule);
  assert.ok(failed.includes('P02') && failed.includes('RC02'), 'default fails: ' + failed);
  assert.deepEqual(evaluateRecipe('saas-landing', 'devtool-landing', p.layout, p.view).failures, []);
  // 이미 규칙을 지키는 기본 구성은 건드리지 않는다.
  for (const t of ['saas-landing', 'b2b-solution', 'app-landing']) { const q = selectRecipe({recipe: 'saas-landing', templateId: t}); assert.deepEqual([q.layout, q.view], [{}, null], t); }
  // 템플릿을 정하지 않으면 권장 순서의 첫 템플릿.
  assert.equal(selectRecipe({recipe: 'saas-landing'}).templateId, 'saas-landing');
  assert.equal(selectRecipe({recipe: 'ops-dashboard'}).templateId, 'dashboard-overview');
  assert.equal(selectRecipe({recipe: 'content-page'}).templateId, 'article');
});

test('rules reject what they claim: hero visual, title hierarchy, KPI row, chart fill, left axis, axis fit', () => {
  const fails = (recipe, t, layout = {}, look = null) => evaluateRecipe(recipe, t, layout, look).failures.map(f => f.rule);
  // V01 / RC01: 큰 문장·커버 히어로는 제품 시각 요소를 지운다.
  assert.ok(fails('saas-landing', 'saas-landing', {hero: 'statement'}).includes('V01'));
  assert.ok(fails('saas-landing', 'saas-landing', {hero: 'cover'}).includes('V01'));
  assert.ok(fails('saas-landing', 'devtool-landing').includes('RC01'));
  assert.deepEqual(fails('saas-landing', 'saas-landing', {hero: 'product'}), [], 'a product hero keeps its visual and passes');
  // V04: 머리말만 가운데.
  assert.ok(fails('saas-landing', 'saas-landing', {heads: 'center'}).includes('V04'));
  assert.ok(fails('content-page', 'article', {intro: 'center'}).includes('V04'));
  // V03 / RC04: KPI 4개를 2열로.
  assert.ok(fails('ops-dashboard', 'dashboard-overview', {columns: 'two'}).includes('V03'));
  const kpi = recipeBlueprint('dashboard-overview'); assert.equal(recipeCheck('ops-dashboard', 'RC04', kpi), null);
  const two = structuredClone(kpi); two.tree.children.find(n => n.type === 'grid').columns = 'two';
  assert.match(recipeCheck('ops-dashboard', 'RC04', two), /두 줄/);
  // RC05: 차트 도메인(S15 dashboard-analytics 차트, 막대는 51%).
  assert.ok(fails('ops-dashboard', 'dashboard-analytics').includes('RC05'));
  assert.match(recipeCheck('ops-dashboard', 'RC05', recipeBlueprint('dashboard-analytics')), /일별 방문자.*52%/);
  assert.match(recipeCheck('ops-dashboard', 'RC05', recipeBlueprint('hr-people')), /페이지 바로 아래에 혼자/);
  assert.equal(recipeCheck('ops-dashboard', 'RC05', recipeBlueprint('sales-dashboard')), null, 'charts inside a grid are sized by their cell');
  // RC06: 가운데 정렬 머리말(help-center).
  assert.ok(fails('content-page', 'help-center').includes('RC06'));
  // RC03: 레시피 범위 밖 축.
  const wide = recipeBlueprint('article'); wide.typography = 'condensed';
  assert.match(recipeCheck('content-page', 'RC03', wide), /typography=condensed/);
  // RC02는 1440px에서 잰 비율이다: 기본 devtool(34px 대 24px)은 1.6배 아래, 균형 스케일은 위.
  assert.match(recipeCheck('saas-landing', 'RC02', recipeBlueprint('devtool-landing')), /1\.4\d배/);
  assert.equal(recipeCheck('saas-landing', 'RC02', recipeBlueprint('saas-landing')), null);
  assert.throws(() => recipeCheck('saas-landing', 'RC07', kpi), /Not a select rule/);
});

test('every "avoid" entry really is filtered by its rule (so the stated reason is not decoration)', () => {
  for (const [id, r] of Object.entries(recipes)) {
    for (const a of r.avoid) {
      let hit = false;
      for (const t of r.templates) {
        if (a.slot) { if (evaluateRecipe(id, t, {[a.slot]: a.option}).failures.some(f => f.rule === a.rule && f.detail.startsWith(`${a.slot}:${a.option}`))) hit = true; }
        else { const b = recipeBlueprint(t); b[a.axis] = a.value; if (recipeRules.find(x => x.id === a.rule)?.mode === 'select' && recipeCheck(id, a.rule, b)) hit = true; }
      }
      assert.ok(hit, `${id}: avoid ${a.slot ?? a.axis}:${a.option ?? a.value} (${a.rule}) is not rejected for any covered template`);
    }
  }
});

test('recipes never delete or forbid a combination: all 4,955 combo ids stay, avoided options still apply and compile', () => {
  assert.equal(enumerateCombos().length, 4955);
  assert.equal(catalog.CATALOG_VERSION, '2.4.0');
  for (const id of ['saas-landing~hero:statement', 'saas-landing~heads:center', 'dashboard-overview~columns:two', 'article~intro:center', 'devtool-landing', 'devtool-landing~hero:statement', 'waitlist~hero:product', 'waitlist~hero:split']) {
    const combo = findCombo(id); assert.ok(combo, id);
    const r = renderCombo(combo); assert.ok(r.ok, id + ' ' + r.error);
  }
  // 레시피가 피한 조합은 갤러리 기본 목록에서 빠지지도 않는다(레시피 표시와 계약 표시는 별개): 추천 조합만 표시가 붙는다.
  assert.equal(enumerateCombos().filter(c => c.recipe).length, 14, "the 14 satisfied picks (hr-people is covered but not recommended)");
  assert.equal(findCombo('devtool-landing').recipe, null);
  assert.equal(findCombo('waitlist~hero:product').recipe, null);
  assert.equal(findCombo('devtool-landing~hero:product').recipe.id, 'saas-landing');
});

test('sizeAt resolves the clamp() strings the typography module emits', () => {
  assert.equal(sizeAt('clamp(30px,4vw,64px)', 1440), 57.6);
  assert.equal(sizeAt('clamp(30px,4vw,64px)', 320), 30);
  assert.equal(sizeAt('24px', 1440), 24);
  assert.throws(() => sizeAt('2rem', 1440));
});

// 콘텐츠 보존: 디자인 개선이 사용자 콘텐츠 손실로 이어지면 안 된다(waitlist의 hero:product가 히어로 수치 3개를 지웠다, docs/recipes.md 5.4절).
const TEXT_SKIP = new Set(['type', 'variant', 'visual', 'motif', 'layout', 'columns', 'align', 'surface', 'side', 'reverse', 'kind', 'ratio', 'icon', 'href', 'level', 'tone', 'mode']);
const leaves = (n, out = [], key = '') => { if (Array.isArray(n)) n.forEach(x => leaves(x, out, key)); else if (n && typeof n === 'object') for (const [k, v] of Object.entries(n)) leaves(v, out, k); else if (typeof n === 'string' && !TEXT_SKIP.has(key) && n.trim()) out.push(key + '=' + n); return out; };

test('a recipe pick never drops text content the default assembly had (hero facts, copy)', () => {
  for (const p of recipePicks().filter(x => x.satisfied)) {
    const t = catalog.templates[p.templateId], base = leaves(t.tree), after = leaves(catalog.applyLayout(t.tree, p.layout, t.pageType));
    assert.deepEqual(base.filter(x => !after.includes(x)), [], `${p.templateId} ${JSON.stringify(p.layout)} lost content`);
  }
  // 반례: waitlist의 hero:product는 히어로 수치 3개를 지운다. 레시피는 그 조합을 고르지 않고 추천도 하지 않는다.
  const lost = (() => { const t = catalog.templates.waitlist; return leaves(t.tree).filter(x => !leaves(catalog.applyLayout(t.tree, {hero: 'product'}, t.pageType)).includes(x)); })();
  assert.equal(lost.length, 6, 'hero:product removes the three facts (value + label each)');
  assert.ok(evaluateRecipe('saas-landing', 'waitlist', {hero: 'product'}).failures.some(f => f.rule === 'V06'), 'the contract names the loss');
  // waitlist: 기본이 정당하다(RC01은 제품 화면이 없는 대기자 등록 페이지에 맞지 않아 이 템플릿에서만 면제). Recipe는 기본을 그대로 고르고 면제 사유를 남긴다.
  const w = selectRecipe({recipe: 'saas-landing', templateId: 'waitlist'});
  assert.deepEqual([w.layout, w.view, w.satisfied], [{}, null, true], 'the pick is the default assembly');
  assert.deepEqual(w.exempted.map(x => x.rule), ['RC01']); assert.ok(w.exempted[0].reason.length > 30);
  assert.ok(!w.applied.some(a => a.rule === 'RC01'), 'an exempted rule is not reported as applied');
  assert.equal(findCombo('waitlist').recipe.id, 'saas-landing');
  assert.equal(findCombo('waitlist~hero:product').recipe, null, 'the former pick is no longer the recommendation, and still selectable');
  // 면제는 그 템플릿의 그 규칙에만: 다른 템플릿에서는 같은 규칙이 그대로 걸린다. 면제 없이는 waitlist 기본이 RC01을 어긴다.
  assert.ok(evaluateRecipe('saas-landing', 'devtool-landing').failures.some(f => f.rule === 'RC01'));
  assert.deepEqual(evaluateRecipe('saas-landing', 'waitlist').failures, []);
  assert.match(recipeCheck('saas-landing', 'RC01', recipeBlueprint('waitlist')), /시각 요소가 없음/, 'the rule itself is unchanged');
});

test('V06 is the only text-losing cause among layout options: exactly hero:split and hero:product on the 9 templates with hero facts', () => {
  const losing = new Set();
  for (const t of catalog.templateList) for (const slot of catalog.layoutOptionsOf(t.id)) for (const o of slot.options) {
    const base = leaves(t.tree), after = leaves(catalog.applyLayout(t.tree, {[slot.id]: o.id}, t.pageType));
    const lostSome = base.some(x => !after.includes(x));
    assert.equal(o.rules.some(r => r.id === 'V06'), lostSome, `${t.id} ${slot.id}:${o.id} V06 matches actual text loss`);
    if (lostSome) losing.add(`${slot.id}:${o.id}`);
  }
  assert.deepEqual([...losing].sort(), ['hero:product', 'hero:split']);
  assert.equal(enumerateCombos().length, 4955, 'no combination is deleted');
  assert.equal(enumerateCombos().filter(c => c.rules.some(r => r.rule === 'V06')).length, 768);
});
