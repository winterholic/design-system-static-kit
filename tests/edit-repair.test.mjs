import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {templates, themes, composeBlueprint, createBlueprint, repairAxes, navConflicts, navLimits, layoutOptionsOf, applyLayout, applyLayoutChecked} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {contentDiff} from '../src/edit/index.mjs';

const ids = Object.keys(templates), themeIds = Object.keys(themes);
const h = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

test('hash preservation: every template × theme and every single layout option compiles to the same bytes as before the lossless layer (4,956 pinned outputs)', () => {
  const out = {};
  for (const id of ids) for (const theme of themeIds) { const b = createBlueprint(id, theme); out[id + '|' + theme] = h(compile(b).html) + h(JSON.stringify(b)); }
  for (const id of ids) for (const s of layoutOptionsOf(id)) for (const o of s.options) { const b = createBlueprint(id, undefined, undefined, {layout: {[s.id]: o.id}}); out[`${id}~${s.id}:${o.id}`] = h(compile(b).html) + h(JSON.stringify(b)); }
  const keys = Object.keys(out).sort();
  assert.equal(keys.length, 4956);
  // 고정 digest는 변경 전 코드(b303f17c1)에서 같은 방식으로 계산했다. 어긋나면 어떤 조합의 출력이 바뀐 것이므로 ADR 0008의 마이그레이션 절차를 따라야 한다.
  assert.equal(createHash('sha256').update(keys.map(k => k + '=' + out[k]).join('\n')).digest('hex'), 'e8032b0e6ee644b4a24219eba376a757a5679472db5e10737f39bce1ac55dc1c');
});

test('legacy repairAxes drop policy is unchanged but no longer silent: composeBlueprint reports what it truncated or removed', () => {
  const count = {NAV_TRUNCATED: 0, NAV_MEGA_DROPPED: 0, NAV_GROUP_DROPPED: 0}, combos = {NAV_GROUP_DROPPED: 0};
  for (const id of ids) for (const theme of themeIds) {
    const {blueprint, report} = composeBlueprint(id, theme);
    const original = templates[id].chrome.nav;
    for (const r of report) if (r.code in count) count[r.code]++;
    if (report.some(r => r.code === 'NAV_GROUP_DROPPED')) combos.NAV_GROUP_DROPPED++;
    const truncated = report.find(r => r.code === 'NAV_TRUNCATED');
    if (truncated) { assert.equal(blueprint.chrome.nav.length + truncated.dropped.length, original.length); assert.deepEqual(truncated.dropped, original.slice(navLimits[blueprint.shell])); assert.equal(truncated.path, '$.chrome.nav'); }
    else assert.equal(blueprint.chrome.nav.length, original.length, `${id}/${theme}: no report means no truncation`);
    const kept = original.slice(0, blueprint.chrome.nav.length);        // 잘려 나간 항목의 mega·group은 NAV_TRUNCATED.dropped가 항목째 담는다
    const removed = (code, key) => report.filter(r => r.code === code).length === kept.filter(n => n[key]).length - blueprint.chrome.nav.filter(n => n[key]).length;
    assert.ok(removed('NAV_MEGA_DROPPED', 'mega') && removed('NAV_GROUP_DROPPED', 'group'), `${id}/${theme}: every deleted mega/group is reported`);
  }
  // 합성 4,590개 중 126개가 내비 항목을, 10개가 드롭다운(mega)을, 그룹 라벨 751개가 132개 조합에서 명시적으로 지워진다(항목이 잘리며 라벨이 같이 사라지는 1개 조합을 더하면 133개). ADR 0008 4절.
  assert.deepEqual([count.NAV_TRUNCATED, count.NAV_MEGA_DROPPED, count.NAV_GROUP_DROPPED, combos.NAV_GROUP_DROPPED], [126, 10, 751, 132], 'the extent of the pinned legacy losses');
  assert.deepEqual(composeBlueprint('saas-landing', 'studio').report.map(r => r.code), ['NAV_TRUNCATED']);
});

test('lossless composition: all 4,590 template × theme combinations keep the full nav, validate, and never delete mega or group', () => {
  let substituted = 0;
  for (const id of ids) for (const theme of themeIds) {
    const {blueprint, report, errors} = composeBlueprint(id, theme, undefined, {lossless: true});
    assert.deepEqual(errors, []);
    assert.deepEqual(blueprint.chrome.nav, templates[id].chrome.nav, `${id}/${theme}`);
    assert.ok(validateBlueprint(blueprint).valid, `${id}/${theme}: ` + JSON.stringify(validateBlueprint(blueprint).errors[0]));
    assert.ok(!report.some(r => /DROPPED|TRUNCATED/.test(r.code)));
    if (report.some(r => r.code === 'SHELL_SUBSTITUTED')) substituted++;
  }
  assert.ok(substituted >= 200, 'shell substitution replaced the cases that used to lose nav data: ' + substituted);
});

test('repairAxes nav policies: "keep" leaves the nav for the validator to reject, "fit" moves to a shell that holds it or leaves it untouched', () => {
  const base = createBlueprint('saas-landing', 'neon');
  const crowded = structuredClone(base); crowded.shell = 'minimal'; crowded.chrome.nav = structuredClone(templates['saas-landing'].chrome.nav);
  const kept = repairAxes(structuredClone(crowded), {nav: 'keep'});
  assert.equal(kept.chrome.nav.length, 3); assert.ok(validateBlueprint(kept).errors.some(e => e.code === 'NAV_COUNT'));
  const report = [], fitted = repairAxes(structuredClone(crowded), {nav: 'fit', report});
  assert.equal(fitted.chrome.nav.length, 3); assert.notEqual(fitted.shell, 'minimal'); assert.equal(navConflicts(fitted).length, 0);
  assert.deepEqual(report.find(r => r.code === 'SHELL_SUBSTITUTED'), {code: 'SHELL_SUBSTITUTED', axis: 'shell', from: 'minimal', to: fitted.shell, rule: 'nav-fit'});
  const hopeless = structuredClone(crowded); hopeless.chrome.nav = Array.from({length: 8}, (_, i) => ({label: '항목' + i, href: '#main', mega: i < 3 ? [{label: 'a', href: '#main'}, {label: 'b', href: '#main'}] : undefined})).map(x => (x.mega ? x : {label: x.label, href: x.href}));
  const stuck = repairAxes(structuredClone(hopeless), {nav: 'fit'});
  assert.deepEqual(stuck.chrome.nav, hopeless.chrome.nav, 'no shell fits 3 dropdown menus; the nav is left whole');
  assert.ok(navConflicts(stuck).some(c => c.code === 'NAV_MEGA' && !c.fixableByShell));
  const axisReport = [], dash = createBlueprint('dashboard-overview');
  const axisOnly = repairAxes({...structuredClone(dash), density: 'compact', shell: 'dock', chrome: {nav: dash.chrome.nav.slice(0, 3).map((n, i) => ({...n, icon: ['home', 'info', 'search'][i]}))}}, {nav: 'keep', report: axisReport});
  assert.equal(axisOnly.density, 'comfortable'); assert.deepEqual(axisReport, [{code: 'AXIS_REPAIRED', axis: 'density', from: 'compact', to: 'comfortable', rule: 'X01'}]);
});

test('hero variants: decoration and content are separate; the legacy template path still drops both (pinned), the checked path never drops content', () => {
  const saas = templates['saas-landing'], agency = templates['agency-home'];
  const legacyReport = [], legacy = applyLayout(saas.tree, {hero: 'centered'}, saas.pageType, {report: legacyReport});
  assert.ok(!('visual' in legacy[1])); assert.deepEqual(legacyReport.map(r => [r.code, r.field, r.kind]), [['DECORATION_DROPPED', 'visual', 'decoration']]);
  const factsReport = [], dropped = applyLayout(agency.tree, {hero: 'split'}, agency.pageType, {report: factsReport});
  assert.ok(!('facts' in dropped[1])); assert.ok(factsReport.some(r => r.code === 'CONTENT_DROPPED' && r.kind === 'content' && r.dropped.length >= 2));
  assert.ok(contentDiff({tree: agency.tree}, {tree: dropped}).missing.length > 0, 'legacy loses facts');
  const checked = applyLayoutChecked(agency.tree, {hero: 'split'}, agency.pageType);
  assert.equal(checked.errors[0].code, 'LAYOUT_WOULD_DROP_CONTENT'); assert.equal(checked.tree[1].facts?.length, agency.tree[1].facts.length, 'refusal returns the input tree');
  const relocated = applyLayoutChecked(agency.tree, {hero: 'split'}, agency.pageType, {contentPolicy: 'relocate'});
  assert.deepEqual(contentDiff({tree: agency.tree}, {tree: relocated.tree}), {missing: [], added: []});
  const deco = applyLayoutChecked(saas.tree, {hero: 'centered'}, saas.pageType);
  assert.deepEqual(deco.errors, []); assert.equal(deco.report[0].kind, 'decoration');
  assert.equal(applyLayoutChecked(saas.tree, {hero: 'nope'}, saas.pageType).errors[0].code, 'LAYOUT_UNKNOWN');
  assert.equal(applyLayoutChecked(saas.tree, {hero: 'split', tabs: 'pill'}, saas.pageType).errors[0].code, 'LAYOUT_NOT_APPLICABLE', 'one refused choice rejects the whole batch');
  const before = JSON.stringify(saas.tree); applyLayoutChecked(saas.tree, {hero: 'cover', cards: 'filled'}, saas.pageType); assert.equal(JSON.stringify(saas.tree), before, 'source tree untouched');
});
