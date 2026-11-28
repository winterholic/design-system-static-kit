import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform, MINIMAL_REQUEST, assemblePlatform, COLOR_ROLE_NAMES, definePlatformMaterial} from '../src/platform/index.mjs';
import {bindColor, colorMatrix, deltaE, hueGap} from '../src/platform/color.mjs';
import {SUBTOKEN_SETS, SUBTOKEN_SET_DESIGNS} from '../src/platform/data/subtoken-sets.mjs';
import {PALETTES} from '../src/platform/data/palettes.mjs';
import {colorContrast} from '../src/color-tokens.mjs';

const env = createPlatform();
const palette = id => env.registry.get(`palette:${id}`), set = id => env.registry.get(`subtoken-set:${id}`);
const matrix = colorMatrix(PALETTES, SUBTOKEN_SETS);
const passing = matrix.filter(x => x.ok);
const failing = matrix.filter(x => !x.ok);
const bind = (p, s, mode) => bindColor(env.registry.get(p), env.registry.get(s), mode);
const roleVars = r => Object.fromEntries(COLOR_ROLE_NAMES.map(n => [n, r.roles[n]]));

test('all 25 subtoken sets have concrete role rules, context fields and normalized usage weights', () => {
  assert.ok(SUBTOKEN_SETS.length >= 25);
  const tags = new Set(SUBTOKEN_SETS.flatMap(s => s.tags));
  for (const t of ['calm-product-ui', 'editorial', 'commerce', 'premium', 'high-contrast']) assert.ok(tags.has(t), t);
  assert.deepEqual(SUBTOKEN_SETS.slice(0, 7).map(s => s.id), ['subtoken-set:standard', 'subtoken-set:tinted', 'subtoken-set:editorial-warm', 'subtoken-set:commerce-vivid', 'subtoken-set:premium-dark', 'subtoken-set:high-contrast', 'subtoken-set:data-dense']);
  assert.equal(SUBTOKEN_SETS.length, 25);
  assert.deepEqual(Object.keys(SUBTOKEN_SET_DESIGNS).sort(), SUBTOKEN_SETS.map(s => s.id).sort(), 'every set has a derived design');
  for (const s of SUBTOKEN_SETS) {
    assert.deepEqual(s.modes, ['light', 'dark']);
    assert.deepEqual(Object.keys(s.roles).sort(), [...COLOR_ROLE_NAMES].sort(), `${s.id} covers every color role`);
    assert.ok(s.contexts.length > 0 && s.contexts.every(value => typeof value === 'string'), `${s.id} has concrete recommended contexts`);
    assert.ok(Array.isArray(s.forbiddenContexts), `${s.id} explicitly records forbidden contexts`);
    assert.ok(Object.values(s.weights).every(value => Number.isFinite(value) && value >= 0), `${s.id} has numeric role weights`);
    assert.ok(Math.abs(Object.values(s.weights).reduce((sum, value) => sum + value, 0) - 1) < 1e-9, `${s.id} weights sum to 1`);
    for (const [role, rule] of Object.entries(s.roles)) {
      assert.ok(rule.from ? s.needs.includes(rule.from) : rule.fixed !== undefined || rule.on, `${s.id}.${role} resolves from a seed, fixed value, or foreground rule`);
      if (rule.from) {
        assert.match(rule.light, /^(50|100|200|300|400|500|600|700|800|900|950)$/);
        assert.match(rule.dark, /^(50|100|200|300|400|500|600|700|800|900|950)$/);
      }
      if (typeof rule.min === 'number') assert.ok(rule.min > 0, `${s.id}.${role} has a positive foreground contrast target`);
      if (typeof rule.min === 'object') assert.ok(rule.min.ratio > 0 && rule.min.against.length > 0, `${s.id}.${role} has active contrast constraints`);
    }
  }
});

test('every passing pair renders background, surface, text, border, primary and secondary actions, interaction states, component tokens and chart roles in light and dark', () => {
  assert.ok(passing.length > 30);
  for (const {palette: p, set: s} of passing) for (const mode of ['light', 'dark']) {
    const r = bind(p, s, mode), where = `${p} × ${s} (${mode})`;
    assert.equal(r.ok, true, where);
    for (const n of ['canvas', 'surface', 'text', 'border', 'action', 'onAction', 'accent', 'onAccent', 'focus', 'disabledBg', 'disabledFg']) assert.match(r.roles[n], /^#[0-9A-F]{6}$/, `${where} ${n}`);
    for (const v of ['--kit-action-hover', '--kit-action-active', '--kit-onActionHover', '--kit-accent-hover', '--kit-accent-active', '--kit-control-border', '--kit-control-hover-border', '--kit-control-active-border', '--kit-control-error', '--kit-table-head', '--kit-table-hover', '--kit-table-selected', '--kit-card-hover', '--kit-card-active', '--kit-danger-soft', '--kit-control-disabled-bg', '--kit-control-disabled-fg', '--kit-focus']) assert.match(r.vars[v] ?? '', /^#[0-9A-F]{6}$/, `${where} ${v}`);
    for (const c of ['button.primary.default', 'button.primary.hover', 'button.primary.active', 'button.primary.focus', 'button.primary.disabled', 'button.secondary.default', 'button.secondary.hover', 'control.default', 'control.hover', 'control.active', 'control.error', 'control.focus', 'control.disabled', 'card.default', 'card.hover', 'card.active', 'card.error', 'card.focus', 'table.default', 'table.hover', 'table.active', 'table.error', 'table.focus']) assert.ok(r.components[c], `${where} ${c}`);
    assert.equal(r.charts.categorical.length, 6); assert.equal(r.charts.sequential.length, 7); assert.equal(r.charts.diverging.length, 7);
    for (let i = 1; i <= 6; i++) assert.match(r.vars[`--kit-chart${i}`], /^#[0-9A-F]{6}$/);
    for (let i = 1; i <= 7; i++) { assert.match(r.vars[`--kit-seq${i}`], /^#[0-9A-F]{6}$/); assert.match(r.vars[`--kit-div${i}`], /^#[0-9A-F]{6}$/); }
    assert.ok(r.report.every(x => x.ratio >= x.minimum), where);
    assert.ok(r.report.some(x => x.kind === 'distance') && r.report.some(x => x.role === 'chart-sequential-high'), 'chart gates are part of the report');
  }
});

test('match table: every set and palette has multiple applicable pairs and each rejection carries a computed reason', () => {
  assert.equal(matrix.length, PALETTES.length * SUBTOKEN_SETS.length);
  for (const s of SUBTOKEN_SETS) assert.ok(passing.filter(x => x.set === s.id).length >= 3, `${s.id} passes ${passing.filter(x => x.set === s.id).length} palettes`);
  for (const p of PALETTES) assert.ok(passing.filter(x => x.palette === p.id).length >= 3, `${p.id} matches ${passing.filter(x => x.palette === p.id).length} sets`);
  for (const pair of failing) {
    assert.ok(pair.reasons.length > 0, `${pair.palette} × ${pair.set} has a failure reason`);
    assert.ok(pair.reasons.every(reason => ['P_COLOR_CONTRAST', 'P_COLOR_CHART', 'P_COLOR_SLOT', 'P_COLOR_MODE'].includes(reason.code)));
    assert.ok(pair.reasons.every(reason => ['light', 'dark'].includes(reason.mode)));
  }
  const rejected = failing[0];
  assert.equal(env.graph.evaluate([rejected.palette, rejected.set]).violations[0].code, 'P_CHECK_PALETTE_SUBTOKEN', 'the relation graph agrees with a computed matrix rejection');
  assert.equal(env.graph.evaluate(['palette:ocean-cool', 'subtoken-set:commerce-vivid']).ok, true);
});

test('passing pairs produce different token sets: no two (palette, set, mode) share a token map, and each axis changes the tokens by itself', () => {
  const seen = new Map(), rendered = new Map();
  for (const {palette: p, set: s} of passing) for (const mode of ['light', 'dark']) {
    const result = bind(p, s, mode), key = JSON.stringify(result.vars);
    assert.ok(!seen.has(key), `${p} × ${s} (${mode}) repeats ${seen.get(key)}`);
    seen.set(key, `${p} × ${s} (${mode})`);
    rendered.set(`${p}\u001f${s}\u001f${mode}`, result);
  }
  assert.equal(seen.size, passing.length * 2);
  const get = (p, s, mode) => rendered.get(`${p}\u001f${s}\u001f${mode}`);
  const differing = (a, b) => COLOR_ROLE_NAMES.filter(n => a.roles[n] !== b.roles[n]).length;
  // 같은 팔레트에서 세트를 바꾸면 역할 값이 여럿 바뀐다.
  for (const p of PALETTES) {
    const sets = passing.filter(x => x.palette === p.id).map(x => x.set);
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) for (const mode of ['light', 'dark']) {
      assert.ok(differing(get(p.id, sets[i], mode), get(p.id, sets[j], mode)) >= 4, `${p.id}: ${sets[i]} vs ${sets[j]} (${mode}) differ in too few roles`);
    }
  }
  // 상태색은 팔레트 간 공통 표준 시드를 쓰므로, 팔레트 변경은 핵심 팔레트 역할에서 확인한다.
  for (const s of SUBTOKEN_SETS) {
    const ps = passing.filter(x => x.set === s.id).map(x => x.palette);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = get(ps[i], s.id, 'light'), b = get(ps[j], s.id, 'light');
      assert.ok(['action', 'accent', 'link', 'focus'].some(role => a.roles[role] !== b.roles[role]), `${s.id}: ${ps[i]} vs ${ps[j]} keep every palette-specific role`);
    }
  }
});

test('each set keeps its own design: roles are drawn from different seeds and thresholds, not from one shared table', () => {
  const p = 'palette:ocean-cool';
  const std = bind(p, 'subtoken-set:standard', 'light'), com = bind(p, 'subtoken-set:commerce-vivid', 'light'), hc = bind(p, 'subtoken-set:high-contrast', 'light'), prem = bind(p, 'subtoken-set:premium-dark', 'dark');
  const seeds = palette('ocean-cool').seeds;
  assert.ok(hueGap(com.roles.action, seeds.accent) < 15, 'commerce primary action follows the accent seed');
  assert.ok(hueGap(std.roles.action, seeds.brand) < 15, 'standard primary action follows the brand seed');
  assert.ok(colorContrast(hc.roles.text, hc.roles.canvas) >= 10 && colorContrast(std.roles.text, std.roles.canvas) < 15);
  for (const n of ['muted', 'action', 'link', 'success', 'warning', 'danger', 'info']) assert.ok(colorContrast(hc.roles[n], hc.roles.surface) >= 7, `high contrast ${n} reaches 7:1`);
  assert.ok(colorContrast(hc.roles.border, hc.roles.surface) >= 4.5);
  assert.ok(colorContrast(std.roles.border, std.roles.surface) < 3, 'standard border is a soft divider');
  assert.ok(colorContrast(hc.states.controlBorder, hc.roles.surface) >= 4.5 && colorContrast(std.states.controlBorder, std.roles.surface) >= 3, 'input borders pass non-text contrast in both');
  assert.ok(colorContrast(prem.roles.canvas, '#000000') < 1.5 * colorContrast(std.roles.canvas, '#000000') && deltaE(prem.roles.canvas, '#000000') < 25, 'premium dark canvas is near black');
  assert.notEqual(prem.roles.action, bind(p, 'subtoken-set:standard', 'dark').roles.action);
});

test('interaction states are readable: hover/active fills keep their text contrast, and the focus ring survives table states', () => {
  for (const {palette: p, set: s} of passing) for (const mode of ['light', 'dark']) {
    const r = bind(p, s, mode), onMin = set(s.split(':')[1]).roles.onAction.min;
    for (const k of ['actionHover', 'actionActive']) assert.ok(colorContrast(r.roles.onAction, r.states[k]) >= 4.5 || colorContrast(r.states['on' + k[0].toUpperCase() + k.slice(1)], r.states[k]) >= onMin, `${p} ${s} ${mode} ${k}`);
    for (const k of ['tableHead', 'tableHover', 'tableSelected']) { assert.ok(colorContrast(r.roles.focus, r.states[k]) >= 3, `${p} ${s} ${mode} focus on ${k}`); assert.ok(colorContrast(r.roles.text, r.states[k]) >= 4.5); }
    assert.notEqual(r.states.actionHover, r.roles.action); assert.notEqual(r.states.actionActive, r.states.actionHover);
  }
});

test('chart roles: categorical colors are distinct, sequential steps are monotone, diverging arms use two hues around a neutral middle', () => {
  for (const {palette: p, set: s} of passing) for (const mode of ['light', 'dark']) {
    const r = bind(p, s, mode), where = `${p} × ${s} (${mode})`, c = r.charts, surface = r.roles.surface;
    const design = SUBTOKEN_SET_DESIGNS[s];
    for (let i = 0; i < 6; i++) { assert.ok(colorContrast(c.categorical[i], surface) >= design.charts.categorical.minContrast, `${where} chart${i + 1} vs surface`); for (let j = i + 1; j < 6; j++) assert.ok(deltaE(c.categorical[i], c.categorical[j]) >= design.charts.categorical.minDistinct, `${where} chart${i + 1}/${j + 1}`); }
    const lum = x => colorContrast(x, '#000000');
    const seq = c.sequential.map(lum);
    seq.slice(1).forEach((v, i) => assert.ok(mode === 'dark' ? v > seq[i] : v < seq[i], `${where} sequential step ${i + 1} is monotone`));
    assert.ok(colorContrast(c.sequential.at(-1), surface) >= design.charts.sequential.minContrast);
    const div = c.diverging.map(lum);
    assert.ok(div.slice(0, 4).every((v, i, a) => i === 0 || (mode === 'dark' ? v < a[i - 1] : v > a[i - 1])), `${where} low arm approaches the middle`);
    assert.ok(div.slice(3).every((v, i, a) => i === 0 || (mode === 'dark' ? v > a[i - 1] : v < a[i - 1])), `${where} high arm leaves the middle`);
    assert.ok(hueGap(c.divergingSources ? palette(p.split(':')[1]).seeds[r.charts.divergingSources.low] : c.diverging[0], palette(p.split(':')[1]).seeds[c.divergingSources.high]) >= 60, `${where} diverging hues`);
  }
  // 세트마다 차트 색 역할이 다르다: 순차 램프의 출처 자리와 범주형 톤이 설계에 따라 갈린다.
  const a = bind('palette:sunrise-warm', 'subtoken-set:editorial-warm', 'light'), b = bind('palette:sunrise-warm', 'subtoken-set:standard', 'light');
  assert.equal(a.charts.sequentialSource, 'accent'); assert.equal(b.charts.sequentialSource, 'brand');
  assert.notDeepEqual(a.charts.categorical, b.charts.categorical);
});

test('the gates reject what they are for: missing seeds, mid-tone fills with no readable text, indistinct charts, and extreme seeds', () => {
  const mk = (id, seeds) => definePlatformMaterial({id: `palette:${id}`, kind: 'palette', label: id, tone: 'mid', seeds});
  const base = palette('ocean-cool').seeds;
  const noAccent = bindColor(mk('x', {brand: base.brand, neutral: base.neutral}), set('standard'), 'light');
  assert.deepEqual([noAccent.ok, noAccent.error.code], [false, 'P_COLOR_SLOT']);
  assert.equal(bindColor(palette('ocean-cool'), {...set('standard'), modes: ['light']}, 'dark').error.code, 'P_COLOR_MODE');
  // 같은 색상각의 시드만 있으면 범주형 6색을 구분할 수 없다: 모든 시드가 거의 같은 회색이다.
  const flat = mk('flat', Object.fromEntries(Object.keys(base).map(k => [k, '#777777'])));
  const r = bindColor(flat, set('high-contrast'), 'light');
  assert.equal(r.ok, false);
  assert.ok(r.error.message.length > 0 && ['P_COLOR_CHART', 'P_COLOR_CONTRAST'].includes(r.error.code));
  // 램프 한쪽 끝에 몰린 중립 시드(거의 흰색)로는 라이트 글자 대비를 맞출 수 없는 쌍이 생긴다.
  const pale = mk('pale', {...base, neutral: '#F4F4F4', brand: '#F2E8A0'});
  assert.ok(failing.length < matrix.length && ['standard', 'high-contrast', 'commerce-vivid'].some(s => !bindColor(pale, set(s), 'light').ok || !bindColor(pale, set(s), 'dark').ok), 'a pale palette fails at least one set');
});

test('the pipeline renders the chosen pair: different palette × set choices emit different root tokens, charts included, with no missing variable', () => {
  const run = (patch) => assemblePlatform({...structuredClone(MINIMAL_REQUEST), context: 'listing', ...patch}, env);
  const cases = [
    ['palette:sunrise-warm', 'subtoken-set:commerce-vivid'], ['palette:ocean-cool', 'subtoken-set:commerce-vivid'], ['palette:forest-green', 'subtoken-set:data-dense'],
    ['palette:magenta-vivid', 'subtoken-set:high-contrast'], ['palette:clay-earth', 'subtoken-set:high-contrast'],
  ];
  const roots = new Set();
  for (const [p, s] of cases) for (const mode of ['light', 'dark']) {
    const r = run({palette: p, subtokenSet: s, mode});
    assert.equal(r.ok, true, `${p} × ${s} ${mode}: ${JSON.stringify(r.diagnostics)}`);
    for (const v of ['--kit-action-hover', '--kit-chart1', '--kit-seq4', '--kit-div4', '--kit-table-selected']) assert.ok(r.value.tokens[v], `${v} reaches the emitted root`);
    assert.ok(r.value.css.includes(`--kit-chart1:${r.value.tokens['--kit-chart1']}`));
    assert.equal(r.diagnostics.filter(d => d.code === 'P_TOKEN_MISSING' || d.code === 'P_CHECK_CONTRAST').length, 0);
    roots.add(JSON.stringify(r.value.tokens));
  }
  assert.equal(roots.size, cases.length * 2, 'every pair renders its own token set');
  const bad = run({palette: 'palette:graphite-mono', subtokenSet: 'subtoken-set:commerce-vivid', mode: 'dark'});
  assert.equal(bad.ok, false);
  assert.ok(bad.diagnostics.some(d => d.code === 'P_CHECK_PALETTE_SUBTOKEN'), 'the failing pair is rejected before binding');
});

test('every passing pair assembles real components: no missing variable or contrast failure for Card and, when registered, Button', () => {
  const comps = [{base: 'base-component:card-surface', content: {id: 'c1', title: '카드', body: '본문'}}];
  if (env.registry.has('base-component:button-control')) comps.push({base: 'base-component:button-control', content: {id: 'b1', label: '저장'}});
  let assembled = 0;
  for (const {palette: p, set: s} of passing) for (const mode of ['light', 'dark']) {
    const sc = env.registry.get(s), context = sc.contexts.includes('any') ? 'listing' : sc.contexts[0];
    const r = assemblePlatform({context, mode, palette: p, subtokenSet: s, components: comps}, env);
    assert.deepEqual(r.diagnostics.map(d => d.code), [], `${p} × ${s} (${mode})`);
    assembled++;
  }
  assert.equal(assembled, passing.length * 2);
  const dark = assemblePlatform({context: 'commerce', mode: 'dark', palette: 'palette:graphite-mono', subtokenSet: 'subtoken-set:commerce-vivid', components: comps}, env);
  assert.deepEqual([dark.ok, dark.diagnostics[0].code], [false, 'P_CHECK_PALETTE_SUBTOKEN'], 'the one failing pair is refused with the same reason in the pipeline');
});

test('bindColor gates accentInk on accentSoft at 4.5:1, so a set that leaves that pair unguarded is incompatible', () => {
  const FLOOR = 4.5;
  for (const {palette: p, set: s} of passing) for (const mode of ['light', 'dark']) {
    const r = bind(p, s, mode), row = r.report.find(x => x.role === 'accentInk' && x.against === 'accentSoft');
    assert.ok(row, `${p} × ${s} (${mode}) reports the accentInk × accentSoft pair`);
    assert.equal(row.minimum, FLOOR);
    assert.ok(colorContrast(r.vars['--kit-accentInk'], r.vars['--kit-accentSoft']) >= FLOOR, `${p} × ${s} (${mode})`);
  }
  // 결함 재현: 세트 설계가 accent를 soft 위에서 보정하지 않으면(원 설계) 이 쌍은 게이트에서 막혀야 한다. 하한을 낮추지 않는다.
  const unguarded = {...set('tinted'), roles: {...set('tinted').roles, accent: {from: 'accent', light: '700', dark: '300'}}};
  const bad = bindColor(palette('magenta-vivid'), unguarded, 'light');
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, 'P_COLOR_CONTRAST');
  assert.ok(bad.report.some(x => x.role === 'accentInk' && x.against === 'accentSoft' && x.ratio < x.minimum), bad.error.message);
  // 페이지 단계에서 막히던 4쌍은 세트 설계 수정으로 게이트를 통과한다.
  for (const [p, st, mode] of [['magenta-vivid', 'data-dense', 'light'], ['magenta-vivid', 'tinted', 'light'], ['sunrise-warm', 'commerce-vivid', 'light'], ['sunrise-warm', 'tinted', 'dark']]) {
    const r = bind(`palette:${p}`, `subtoken-set:${st}`, mode);
    assert.equal(r.ok, true, `${p} × ${st} (${mode}): ${r.error?.message}`);
    assert.ok(colorContrast(r.vars['--kit-accentInk'], r.vars['--kit-accentSoft']) >= FLOOR, `${p} × ${st} (${mode})`);
    assert.equal(env.graph.evaluate([`palette:${p}`, `subtoken-set:${st}`]).ok, true, `${p} × ${st}: palette-subtoken relation`);
  }
});
