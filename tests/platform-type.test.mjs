import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPlatform, MINIMAL_REQUEST, assemblePlatform, recommend, definePlatformMaterial} from '../src/platform/index.mjs';
import {bindType, hangulViolations, hierarchyViolations, effectiveFaces, splitStack, typeFit, rankTypeSystems, scaleProfile, webfontCSS, webfontPlan, parseSize, FLOORS} from '../src/platform/type.mjs';
import {TYPE_SYSTEMS, TYPE_FIT} from '../src/platform/data/type-systems.mjs';
import {FACE_PAIRINGS, ROLE_SCALES, MODULAR_SCALES, LEGACY_MIGRATION, LEGACY_FACE_OF, WEBFONTS, SCALE_ROLES, PLATFORM_FONTS, resolveRoleScale} from '../src/platform/data/type-materials.mjs';
import {TYPE_ROLES} from '../src/platform/contract.mjs';
import {STACKS, TYPE_R2, TYPE_IDS, HANGUL, roleSizes} from '../src/typography.mjs';
import {MATERIAL_TYPE_PRESETS, renderRoleTypeCSS, roleTypeUsage} from '../src/materials/typography.mjs';
import {createBlueprint, pageTypeIds} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

const env = createPlatform();
const systems = env.registry.list('type-system');
const designed = systems.filter(s => s.id !== 'type-system:tech-erp');
const bound = Object.fromEntries(systems.map(s => [s.id, bindType(s)]));
const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const record = (id, face, scale, numerals = 'tabular') => definePlatformMaterial({id: `type-system:${id}`, kind: 'type-system', label: id, facePairing: face, roleScale: scale, numerals});

// ---------------------------------------------------------------- 1. 등록: 맥락별 완성형 시스템

test('at least ten context systems are registered, and each usage (work, document, marketing, commerce, mobile) has at least two', () => {
  assert.ok(designed.length >= 10, `designed systems: ${designed.length}`);
  for (const usage of ['work', 'document', 'marketing', 'commerce', 'mobile']) assert.ok(designed.filter(s => s.tags.includes(usage)).length >= 2, usage);
  const PREFIX = {work: 'work', document: 'doc', marketing: 'mkt', commerce: 'shop', mobile: 'mobile'};
  for (const s of designed) assert.ok(s.id.startsWith(`type-system:${PREFIX[s.tags[0]]}-`), `${s.id} id prefix follows the usage`);
  assert.ok(env.registry.has('type-system:tech-erp'), 'the legacy record other work depends on is kept');
});

test('every system binds without errors and every role has mobile and desktop sizes', () => {
  for (const s of systems) {
    const b = bound[s.id];
    assert.equal(b.ok, true, `${s.id}: ${JSON.stringify(b.errors)}`);
    for (const names of Object.values(TYPE_ROLES)) for (const n of names) assert.ok(b.vars[n], `${s.id} ${n}`);
  }
  for (const s of designed) {
    const {roles, vars} = bound[s.id];
    assert.deepEqual(Object.keys(roles), SCALE_ROLES, s.id);
    for (const name of SCALE_ROLES) {
      const r = roles[name];
      assert.ok(r.sizePx.mobile > 0 && r.sizePx.desktop >= r.sizePx.mobile - 4, `${s.id}/${name} sizes ${JSON.stringify(r.sizePx)}`);
      assert.ok(r.weight >= 400 && r.lineHeight >= 1 && typeof r.fontFamily === 'string', `${s.id}/${name}`);
      assert.match(r.size, /^(\d+(\.\d+)?px|clamp\(.+\))$/, `${s.id}/${name} fluid size`);
      for (const k of ['size', 'weight', 'leading', 'tracking']) assert.ok(vars[`--kit-type-${name}-${k}`], `${s.id} --kit-type-${name}-${k}`);
    }
    for (const v of ['--kit-t-title', '--kit-t-app', '--kit-t-heading', '--kit-t-body', '--kit-t-caption', '--kit-t-label', '--kit-t-stat', '--kit-t-price', '--kit-code-size', '--kit-code-lh', '--kit-lh-heading', '--kit-tr-heading', '--kit-case-label', '--kit-nums']) assert.ok(vars[v], `${s.id} ${v}`);
    assert.equal(roles.code.fontFamily, STACKS.mono, `${s.id} code role uses the Korean-aware mono stack`);
    assert.equal(vars['--kit-mono'], STACKS.mono);
  }
});

test('the app title never exceeds the engine Hangul cap even when display is larger', () => {
  for (const s of designed) {
    const desktop = +/(\d+(\.\d+)?)px\)?$/.exec(bound[s.id].vars['--kit-t-app'])[1];
    assert.ok(desktop <= HANGUL.caps.app, `${s.id} app ${desktop}px`);
  }
  assert.ok(bound['type-system:mkt-brand'].roles.display.sizePx.desktop > HANGUL.caps.app, 'display itself stays large for heroes');
});

test('stacks mix Hangul, Latin and digits: Latin face first, Korean fallback of the same class last, generic family at the end', () => {
  for (const s of designed) {
    const {vars, roles} = bound[s.id];
    for (const [key, cls] of [['--kit-heading', null], ['--kit-font', null], ['--kit-font-ui', null], ['--kit-font-num', null], ['--kit-mono', 'mono']]) {
      const fams = splitStack(vars[key]), iKo = fams.findIndex(f => /Apple SD Gothic Neo|AppleMyungjo|Noto (Sans|Serif)|Malgun|Batang|D2Coding|Nanum/.test(f));
      assert.ok(iKo > 0, `${s.id} ${key}: a Latin face comes before the first Korean face`);
      assert.match(vars[key], /(sans-serif|serif|monospace)$/, `${s.id} ${key} ends in a generic family`);
    }
    assert.equal(roles.numeric.serif, false, `${s.id}: digits are drawn by a lining-figure sans (old-style Georgia digits sink next to Hangul)`);
    assert.match(vars['--kit-nums'], /lining-nums/, s.id);
    assert.match(vars['--kit-nums'], s.numerals === 'tabular' ? /^tabular-nums/ : /^proportional-nums/, `${s.id} numerals ${s.numerals}`);
  }
});

test('real fallbacks: on macOS and Windows every stack draws Hangul with a stack face of the same class, never the browser default', () => {
  for (const s of designed) for (const key of ['--kit-heading', '--kit-font', '--kit-mono']) {
    const stack = bound[s.id].vars[key], serif = /AppleMyungjo/.test(stack);
    for (const platform of ['macos', 'windows']) {
      const f = effectiveFaces(stack, platform);
      assert.ok(f.latin && f.hangul, `${s.id} ${key} ${platform}`);
      // 고정폭 스택은 Windows에 한글 고정폭 서체가 없어 OS 대체(generic)로 내려간다. 알려진 한계라 문서에 남긴다.
      if (key !== '--kit-mono') { assert.equal(f.hangulVia, 'stack', `${s.id} ${key} on ${platform}: ${JSON.stringify(f)}`); assert.match(f.hangul, serif ? /Myungjo|Batang|Serif/ : /Gothic|Sans/, `${s.id} ${key} ${platform} hangul face class`); }
      else if (platform === 'macos') assert.equal(f.hangulVia, 'stack', `${s.id} mono on macos`);
    }
  }
  assert.deepEqual(effectiveFaces(STACKS.iowan, 'macos'), {latin: 'Iowan Old Style', hangul: 'AppleMyungjo', hangulVia: 'stack'});
  assert.deepEqual(effectiveFaces(STACKS.iowan, 'windows'), {latin: 'Palatino Linotype', hangul: 'Batang', hangulVia: 'stack'});
  assert.equal(effectiveFaces(STACKS.system, 'windows').latin, 'Segoe UI');
  assert.equal(effectiveFaces(STACKS.system, 'macos').hangul, 'Apple SD Gothic Neo');
  assert.equal(PLATFORM_FONTS.macos.basis, 'measured');
  assert.throws(() => effectiveFaces(STACKS.system, 'beos'), RangeError);
});

// ---------------------------------------------------------------- 2. 시스템끼리 실제로 다르다

test('registered systems differ in the real --kit-heading / --kit-font pair and in every scale, not only in face names', () => {
  const pairs = new Map();
  for (const s of systems) {
    const v = bound[s.id].vars, key = `${v['--kit-heading']}\u0000${v['--kit-font']}`;
    assert.ok(!pairs.has(key), `${s.id} repeats the face pair of ${pairs.get(key)}`);
    pairs.set(key, s.id);
  }
  assert.equal(pairs.size, systems.length);
  const sizes = new Set(systems.map(s => ['--kit-t-title', '--kit-t-heading', '--kit-t-sub', '--kit-t-body', '--kit-t-small', '--kit-t-label', '--kit-t-caption', '--kit-t-stat'].map(k => bound[s.id].vars[k]).join('|')));
  assert.equal(sizes.size, systems.length, 'role size tuples are all different');
  const rhythm = new Set(systems.map(s => ['--kit-line', '--kit-lh-heading', '--kit-lh-title', '--kit-tr-title', '--kit-tr-heading', '--kit-tr-label', '--kit-hw'].map(k => bound[s.id].vars[k]).join('|')));
  assert.equal(rhythm.size, systems.length, 'leading, tracking and weight tuples are all different');
});

const DIMS = {displayOverBody: .3, headingOverBody: .08, bodyLeading: .04, displayTracking: .004, bodyLines: .8, displayGrowth: .15, numericOverBody: .2};
const vectorOf = scale => { const p = scaleProfile(scale); return {displayOverBody: p.displayOverBody, headingOverBody: p.headingOverBody, bodyLeading: p.bodyLeading, displayTracking: p.displayTracking, bodyLines: p.bodyLinesPer800.desktop, displayGrowth: p.displayGrowth, numericOverBody: p.numericOverBody}; };
/** 두 체계가 의미 있게 다른 차원의 수. 차원: 본문 대비 제목·숫자 비율, 행간, 자간, 화면당 본문 줄 수(정보 밀도), 모바일→데스크톱 확대. */
export const differingDims = (a, b) => { const x = vectorOf(a), y = vectorOf(b); return Object.keys(DIMS).filter(k => Math.abs(x[k] - y[k]) > DIMS[k]).length; };

test('hierarchy, rhythm and information density separate every pair of designed systems (at least 3 of 7 dimensions)', () => {
  for (let i = 0; i < designed.length; i++) for (let j = i + 1; j < designed.length; j++) {
    const a = designed[i], b = designed[j], n = differingDims(ROLE_SCALES[a.roleScale], ROLE_SCALES[b.roleScale]);
    assert.ok(n >= 3, `${a.id} vs ${b.id} differ in only ${n} dimensions`);
  }
  const lines = id => scaleProfile(ROLE_SCALES[systems.find(s => s.id === id).roleScale]).bodyLinesPer800.desktop;
  assert.ok(lines('type-system:work-console') > lines('type-system:doc-essay') * 1.4, 'a console fits at least 1.4x the body lines of an essay in the same height');
  assert.ok(scaleProfile(ROLE_SCALES['role-scale:mkt-brand']).displayOverBody > scaleProfile(ROLE_SCALES['role-scale:work-console']).displayOverBody * 1.5, 'a brand hero headline towers over a console title');
  const growth = id => scaleProfile(ROLE_SCALES[id]).displayGrowth;
  assert.ok(growth('role-scale:mobile-app') < growth('role-scale:mkt-brand') - .5, 'mobile systems grow less from phone to desktop than marketing');
});

test('the difference check rejects a clone: two systems on one scale differ in zero dimensions', () => {
  const s = ROLE_SCALES['role-scale:doc-essay'];
  assert.equal(differingDims(s, s), 0);
  assert.equal(differingDims(s, {...s, roles: {...s.roles, body: {...s.roles.body, lineHeight: s.roles.body.lineHeight + .01}}}), 0, 'a 0.01 leading nudge is not a different rhythm');
});

// ---------------------------------------------------------------- 3. 한글 한도

const rolesOf = id => structuredClone(bound[id].roles);
const rulesOf = (roles, label) => hangulViolations(roles, label).map(v => v.rule);

test('Hangul limits reject each kind of violation with the right rule (negative controls on a clean system)', () => {
  const clean = 'type-system:doc-essay';
  assert.deepEqual(hangulViolations(rolesOf(clean)), []);
  const tweak = (mutate, id = clean) => { const r = rolesOf(id); mutate(r); return rulesOf(r); };
  assert.ok(tweak(r => { r.heading.weight = HANGUL.serifHangulWeightMax + 100; }).includes('serif-weight'), 'serif weight above the single-weight cap');
  assert.ok(tweak(r => { r.display.trackingEm = HANGUL.track.display - .01; }).includes('tracking-floor'), 'display tracking below the floor');
  assert.ok(tweak(r => { r.heading.trackingEm = HANGUL.track.heading - .005; }).includes('tracking-floor'));
  assert.ok(tweak(r => { r.display.lineHeight = HANGUL.leading.display - .05; }).includes('leading-floor'), 'display leading below the floor');
  assert.ok(tweak(r => { r.sub.lineHeight = 1.2; }).includes('leading-floor'));
  assert.ok(tweak(r => { r.body.lineHeight = 1.4; }).includes('body-leading'), 'body leading under the band');
  assert.ok(tweak(r => { r.body.lineHeight = 2; }).includes('body-leading'), 'body leading over the band');
  assert.ok(tweak(r => { r.label.trackingEm = HANGUL.labelMax + .04; }).includes('label-tracking'));
  assert.ok(tweak(r => { r.display.sizePx.desktop = HANGUL.caps.display + 4; }).includes('size-cap'));
  assert.ok(tweak(r => { r.heading.sizePx.desktop = HANGUL.caps.heading + 2; }).includes('size-cap'));
  assert.ok(tweak(r => { r.body.sizePx.mobile = FLOORS.px.body - 1; }).includes('size-floor'));
  assert.ok(tweak(r => { r.caption.lineHeight = 1.2; }).includes('leading-floor'));
  assert.ok(tweak(r => { r.sub.serif = false; r.sub.weight = 500; }).includes('sans-weight-floor'), 'a light sans heading is thinner than the body');
  for (const v of hangulViolations(Object.assign(rolesOf(clean), {heading: {...rolesOf(clean).heading, weight: 800}}))) assert.ok(['P_TYPE_HANGUL_WEIGHT', 'P_CHECK_TYPE_HANGUL'].includes(v.code));
});

test('hierarchy checks reject inverted steps on the phone and the desktop', () => {
  const clean = rolesOf('type-system:work-console');
  assert.deepEqual(hierarchyViolations(clean), []);
  const m = structuredClone(clean); m.heading.sizePx.mobile = m.display.sizePx.mobile - 1;
  assert.ok(hierarchyViolations(m).some(v => /mobile: display/.test(v.message)));
  const d = structuredClone(clean); d.sub.sizePx.desktop = d.body.sizePx.desktop;
  assert.ok(hierarchyViolations(d).some(v => /desktop: sub/.test(v.message)));
  const g = structuredClone(clean); g.heading.sizePx.mobile = g.heading.sizePx.desktop + 2;
  assert.ok(hierarchyViolations(g).some(v => /모바일/.test(v.message)));
});

test('a combination that crosses a Hangul limit is rejected as P_CHECK_TYPE_HANGUL through the pipeline, and a clean one is not', () => {
  const withTests = createPlatform({records: [
    record('test-serif-heavy', 'face-pairing:editorial', 'role-scale:modular-grotesk'),
    record('test-sans-light', 'face-pairing:grotesk-system', 'role-scale:modular-luxe'),
    record('test-legacy-heavy', 'type-preset:editorial', 'type-role-preset:marketing'),
    record('test-clean', 'face-pairing:editorial', 'role-scale:doc-essay'),
  ]});
  const run = typeSystem => assemblePlatform({...structuredClone(MINIMAL_REQUEST), styleContext: null, context: 'article', typeSystem, components: []}, withTests);
  for (const id of ['test-serif-heavy', 'test-sans-light', 'test-legacy-heavy']) {
    const r = run(`type-system:${id}`);
    assert.equal(r.ok, false, id);
    assert.ok(r.diagnostics.some(d => d.code === 'P_CHECK_TYPE_HANGUL' && d.path === '$.typeSystem'), `${id}: ${JSON.stringify(r.diagnostics.map(d => d.code))}`);
    assert.equal(r.stage, 'checkCombination', `${id} fails at the combination stage`);
  }
  assert.equal(bindType(record('x', 'face-pairing:editorial', 'role-scale:modular-grotesk')).errors[0].rule, 'serif-weight');
  assert.equal(bindType(record('x', 'face-pairing:grotesk-system', 'role-scale:modular-luxe')).errors[0].rule, 'sans-weight-floor');
  const clean = run('type-system:test-clean');
  assert.ok(!clean.diagnostics.some(d => d.code === 'P_CHECK_TYPE_HANGUL'), JSON.stringify(clean.diagnostics));
});

test('unknown ids and a legacy role preset on a new face pairing are reported, not guessed', () => {
  assert.equal(bindType(record('x', 'face-pairing:nope', 'role-scale:work-console')).errors[0].code, 'P_TYPE_FACE');
  assert.equal(bindType(record('x', 'face-pairing:rounded', 'role-scale:nope')).errors[0].code, 'P_TYPE_SCALE');
  assert.match(bindType(record('x', 'face-pairing:rounded', 'type-role-preset:erp')).errors[0].message, /role-scale:erp/);
  assert.equal(bindType(record('x', 'face-pairing:rounded', 'role-scale:work-console', 'wide')).errors[0].code, 'P_TYPE_NUMERALS');
  assert.equal(bindType(record('x', 'face-pairing:rounded', 'role-scale:work-console')).ok, true, 'a face pairing and a scale from different systems combine (many to many)');
});

test('face pairing x role scale is many to many: every designed face meets every designed scale and the result is a computed verdict', () => {
  const faces = Object.keys(FACE_PAIRINGS), scales = Object.keys(ROLE_SCALES).filter(id => ROLE_SCALES[id].source === 'designed');
  let ok = 0, rejected = 0;
  for (const f of faces) for (const s of scales) { const b = bindType(record('m', f, s)); b.ok ? ok++ : rejected++; if (!b.ok) assert.ok(b.errors.every(e => ['P_CHECK_TYPE_HANGUL', 'P_TYPE_HANGUL_WEIGHT', 'P_TYPE_HIERARCHY'].includes(e.code)), `${f} × ${s}`); }
  assert.equal(ok + rejected, faces.length * scales.length);
  assert.ok(ok > faces.length * scales.length * .9, 'designed scales stay legal on most faces');
  assert.ok(rejected > 0, 'serif faces reject the 700+ scales, so the check is not vacuous');
});

// ---------------------------------------------------------------- 4. 구형 18개 이행

test('18 legacy presets map onto 16 face pairings and 18 modular scales, and the merges are the identical (head, text) stacks', () => {
  assert.equal(LEGACY_MIGRATION.length, 18);
  assert.deepEqual(LEGACY_MIGRATION.map(m => m.preset), TYPE_IDS.map(id => `type-preset:${id}`));
  const legacyFaces = new Set(LEGACY_MIGRATION.map(m => m.face));
  assert.equal(legacyFaces.size, 16);
  const merged = LEGACY_MIGRATION.filter(m => m.merged);
  assert.deepEqual(merged.map(m => m.preset).sort(), ['type-preset:grotesk', 'type-preset:sans', 'type-preset:swiss', 'type-preset:tech']);
  assert.equal(LEGACY_FACE_OF.tech, LEGACY_FACE_OF.sans);
  assert.equal(LEGACY_FACE_OF.swiss, LEGACY_FACE_OF.grotesk);
  for (const m of LEGACY_MIGRATION) {
    const p = TYPE_R2[m.preset.slice('type-preset:'.length)], f = FACE_PAIRINGS[m.face];
    assert.deepEqual([f.head, f.text], [p.head, p.text], `${m.preset} keeps its stacks`);
    assert.ok(m.reason.length > 10, m.preset);
  }
  const distinctPairs = new Set(Object.values(FACE_PAIRINGS).map(f => `${f.head}/${f.text}`));
  assert.equal(distinctPairs.size, Object.keys(FACE_PAIRINGS).length, 'no two face pairings repeat a (head, text) pair');
});

test('modular scales reproduce the engine sizes of each legacy preset at the three scale axes', () => {
  assert.equal(Object.keys(MODULAR_SCALES).length, 18);
  for (const id of TYPE_IDS) for (const axis of ['tight', 'balanced', 'dramatic']) {
    const scale = resolveRoleScale(`role-scale:modular-${id}${axis === 'balanced' ? '' : `-${axis}`}`), z = roleSizes({typography: id, scale: axis, catalogVersion: '2.3.0'});
    assert.ok(scale, `${id}/${axis}`);
    for (const [role, engine] of [['display', 'title'], ['heading', 'heading'], ['sub', 'sub'], ['body', 'body'], ['numeric', 'stat']]) {
      assert.deepEqual([scale.roles[role].sizePx.desktop, scale.roles[role].sizePx.mobile], [Math.round(z[engine].max * 10) / 10, Math.round(z[engine].min * 10) / 10], `${id}/${axis}/${role}`);
    }
    assert.equal(scale.roles.display.lineHeight, TYPE_R2[id].lh.title, `${id} leading`);
    assert.equal(scale.roles.heading.trackingEm, TYPE_R2[id].track.heading, `${id} tracking`);
  }
  assert.equal(resolveRoleScale('role-scale:modular-nope-tight'), null);
  assert.equal(MODULAR_SCALES['role-scale:modular-swiss'].nums, 'tabular');
  assert.equal(MODULAR_SCALES['role-scale:modular-swiss'].roles.label.case, 'upper');
  const profiles = TYPE_IDS.map(id => scaleProfile(MODULAR_SCALES[`role-scale:modular-${id}`]));
  assert.ok(new Set(profiles.map(p => p.displayOverBody)).size >= 3, 'display/body ratios take several values (the engine caps the large ones)');
  assert.equal(new Set(profiles.map(p => JSON.stringify(p))).size, 16, 'the 18 modular scales are 16 distinct profiles; the other two repeat one (rhythm differences stay in tracking and leading)');
});

test('the four role presets become role scales that keep their sizes and weights, and tech-erp keeps the 2.6.0 values', () => {
  for (const [id, p] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    const s = ROLE_SCALES[`role-scale:${id}`];
    assert.equal(s.source, `type-role-preset:${id}`);
    for (const role of ['display', 'heading', 'body', 'label', 'caption', 'numeric']) {
      assert.deepEqual(s.roles[role].sizePx, parseSize(p.roles[role].size), `${id}/${role} size`);
      assert.deepEqual([s.roles[role].weight, s.roles[role].lineHeight, s.roles[role].trackingEm], [p.roles[role].weight, p.roles[role].lineHeight, p.roles[role].trackingEm], `${id}/${role}`);
    }
  }
  const legacy = bound['type-system:tech-erp'], p = MATERIAL_TYPE_PRESETS.erp, e = TYPE_R2.tech;
  assert.equal(legacy.vars['--kit-heading'], STACKS[e.head]);
  assert.equal(legacy.vars['--kit-font'], STACKS[e.text]);
  assert.equal(legacy.vars['--kit-t-title'], p.roles.display.size);
  assert.equal(legacy.vars['--kit-t-sub'], `${Math.min(24, Math.round(e.body * e.ratio))}px`);
  assert.equal(legacy.vars['--kit-nums'], 'tabular-nums');
  assert.equal(Object.keys(legacy.vars).length, 5 + Object.values(TYPE_ROLES).flat().length + 1, 'the legacy record emits exactly the variables it always did');
});

// ---------------------------------------------------------------- 5. 맥락 적합성

const DENSITIES = ['compact', 'comfortable', 'spacious'], VIEWPORTS = ['mobile', 'desktop'];

test('every system declares prefers and avoids with reasons, on known page types, densities and viewports', () => {
  assert.deepEqual(Object.keys(TYPE_FIT).sort(), systems.map(s => s.id).sort(), 'fit table covers exactly the registered systems');
  for (const [id, rows] of Object.entries(TYPE_FIT)) {
    assert.ok(rows.some(r => r.type === 'prefers') && rows.some(r => r.type === 'avoids'), `${id} has both prefers and avoids`);
    for (const r of rows) {
      assert.ok(['prefers', 'avoids'].includes(r.type) && r.reason.trim().length > 8, `${id} reason`);
      assert.ok(Number.isInteger(r.priority) && r.priority > 0 && r.priority <= 100, `${id} priority`);
      for (const [k, v] of Object.entries(r.when)) {
        assert.ok(['context', 'density', 'viewport'].includes(k) && Array.isArray(v) && v.length, `${id} when.${k}`);
        const known = k === 'context' ? pageTypeIds : k === 'density' ? DENSITIES : VIEWPORTS;
        for (const x of v) assert.ok(known.includes(x), `${id} when.${k}: ${x}`);
      }
    }
    const contexts = env.registry.get(id).contexts;
    assert.ok(contexts.every(c => c === 'any' || pageTypeIds.includes(c)), `${id} contexts are page types`);
    assert.ok(rows.filter(r => r.type === 'prefers' && r.when.context).some(r => r.when.context.some(c => contexts.includes(c))), `${id} prefers at least one context it can be used in`);
  }
});

test('fit ranks by usage, density and viewport and explains why', () => {
  const top = ctx => rankTypeSystems(env.registry, ctx).ranked[0];
  assert.equal(top({context: 'dashboard', density: 'compact', viewport: 'desktop'}).id, 'type-system:work-console', 'compact desktop dashboard: console');
  assert.equal(top({context: 'dashboard', density: 'comfortable', viewport: 'desktop'}).id, 'type-system:work-insight');
  assert.equal(top({context: 'article', density: 'spacious', viewport: 'desktop'}).id, 'type-system:doc-essay');
  assert.equal(top({context: 'article', density: 'spacious', viewport: 'mobile'}).id, 'type-system:mobile-reader');
  assert.equal(top({context: 'landing', density: 'spacious', viewport: 'desktop'}).id, 'type-system:mkt-brand');
  assert.equal(top({context: 'pricing', density: 'comfortable', viewport: 'desktop'}).id, 'type-system:mkt-launch');
  assert.equal(top({context: 'commerce', density: 'compact', viewport: 'desktop'}).id, 'type-system:shop-catalog');
  assert.equal(top({context: 'commerce', density: 'spacious', viewport: 'desktop'}).id, 'type-system:shop-boutique');
  assert.equal(top({context: 'listing', density: 'compact', viewport: 'mobile'}).id, 'type-system:mobile-feed');
  const r = top({context: 'article', density: 'spacious', viewport: 'desktop'});
  assert.ok(r.reasons.every(x => x.reason && ['prefers', 'avoids'].includes(x.type)) && r.reasons.some(x => x.type === 'prefers'));
  const essay = typeFit('type-system:doc-essay', {context: 'dashboard', density: 'compact', viewport: 'mobile'});
  assert.ok(essay.score < 0 && essay.reasons.every(x => x.type === 'avoids' && x.priority < 0), 'a mismatched context only collects avoids');
  assert.equal(typeFit('type-system:doc-essay', {}).score, 0, 'no context, no conditions apply');
  assert.deepEqual(typeFit('type-system:unknown', {context: 'article'}), {id: 'type-system:unknown', score: 0, reasons: []});
  const blocked = rankTypeSystems(env.registry, {context: 'article'}).blocked.map(b => b.id);
  assert.ok(blocked.includes('type-system:work-console') && !blocked.includes('type-system:doc-essay'), 'page-type filter blocks with a reason');
});

test('every page type has at least two candidate systems, and one theme-style anchor is matched by several systems', () => {
  for (const pt of pageTypeIds) {
    const open = systems.filter(s => s.contexts.includes(pt) || s.contexts.includes('any'));
    if (['dashboard', 'data', 'listing', 'article', 'blog', 'docs', 'landing', 'pricing', 'commerce', 'portfolio', 'community', 'general', 'settings', 'form', 'auth'].includes(pt)) assert.ok(open.length >= 2, `${pt}: ${open.map(s => s.id)}`);
  }
  const rec = recommend(env.registry, env.graph, {kind: 'type-system', context: 'dashboard', mode: 'light', density: 'comfortable', styleContext: 'style-context:workspace'});
  assert.ok(rec.ranked.length >= 3, 'one style context (workspace) matches several type systems');
  assert.equal(rec.ranked[0].id, 'type-system:tech-erp', 'the platform minimal example keeps its default');
  assert.ok(rec.ranked.every(r => r.reasons.every(x => x.reason)), 'every ranked candidate carries its reason');
  assert.deepEqual(rec.ranked.slice(0, 3).map(r => r.id), ['type-system:tech-erp', 'type-system:work-console', 'type-system:work-insight']);
});

// ---------------------------------------------------------------- 6. 웹폰트

test('webfonts are optional, OFL only, with a loading strategy and a system fallback; the default output carries none', () => {
  for (const w of Object.values(WEBFONTS)) assert.equal(w.license, 'OFL-1.1', w.family);
  const withFonts = Object.values(FACE_PAIRINGS).filter(f => f.webfonts.length);
  assert.ok(withFonts.length >= 5);
  for (const f of withFonts) {
    const plan = webfontPlan(f.id);
    assert.equal(plan.required, false, f.id);
    assert.equal(plan.loading.display, 'swap');
    assert.match(plan.loading.csp, /font-src 'self'/);
    assert.match(plan.fallback.body, /(sans-serif|serif)$/, 'the fallback is a real system stack');
    for (const w of plan.families) assert.ok(w.source.startsWith('https://') && w.file.endsWith('.woff2'));
    const css = webfontCSS(f.id, {baseUrl: '/f'});
    assert.match(css, /font-display:swap/);
    assert.equal((css.match(/@font-face/g) ?? []).length, f.webfonts.length);
  }
  assert.equal(webfontPlan('type-preset:tech'), null, 'a face without webfont needs no plan');
  for (const s of designed) assert.doesNotMatch(bound[s.id].vars['--kit-font'] + bound[s.id].vars['--kit-heading'] + bound[s.id].vars['--kit-mono'], /Pretendard|JetBrains/, `${s.id} default stack is system-only`);
  const on = bindType(env.registry.get('type-system:mobile-reader'), {webfonts: true});
  assert.match(on.vars['--kit-font'], /^"Noto Serif KR",/);
  assert.ok(on.vars['--kit-font'].endsWith(bound['type-system:mobile-reader'].vars['--kit-font']), 'the webfont is in front of, not instead of, the system stack');
  assert.match(on.webfontCSS, /unicode-range:[^;]*U\+AC00-D7A3;/, 'the Korean serif webfont only covers Hangul, so Latin stays on the system serif');
  assert.equal(bindType(env.registry.get('type-system:mobile-reader')).webfontCSS, '');
});

// ---------------------------------------------------------------- 7. 파이프라인에서 쓰인다

test('every system assembles through the platform and lands its own values in :root', () => {
  const seen = new Set();
  for (const s of designed) {
    const context = s.contexts[0] === 'any' ? 'general' : s.contexts[0];
    const r = assemblePlatform({...structuredClone(MINIMAL_REQUEST), styleContext: null, context, typeSystem: s.id, components: []}, env);
    assert.equal(r.ok, true, `${s.id}: ${JSON.stringify(r.diagnostics)}`);
    assert.ok(!r.diagnostics.some(d => d.code === 'P_TOKEN_MISSING' || d.code === 'P_CHECK_TYPE_HANGUL'), s.id);
    assert.ok(r.value.css.includes(`--kit-heading:${bound[s.id].vars['--kit-heading']}`) && r.value.css.includes(`--kit-font:${bound[s.id].vars['--kit-font']}`), `${s.id} :root carries the system's own pair`);
    assert.ok(r.value.css.includes(`--kit-t-body:${bound[s.id].vars['--kit-t-body']}`), s.id);
    seen.add(r.value.css.match(/--kit-heading:[^;]*;--kit-font:[^;]*/)?.[0]);
  }
  assert.equal(seen.size, designed.length, 'assembled output shows one distinct face pair per system');
  assert.equal(assemblePlatform({...structuredClone(MINIMAL_REQUEST), context: 'article', typeSystem: 'type-system:work-console', styleContext: null, components: []}, env).diagnostics.some(d => d.code === 'P_ATTR_CONTEXT'), true, 'a page type outside the system contexts is an attribute error');
});

// ---------------------------------------------------------------- 8. 2.6.0 typeRoles는 바뀌지 않는다

/** origin/main(f1bcc2582) 시점에 계산한 값. 타이포 작업이 src/typography.mjs·src/materials/typography.mjs를 건드리면 여기서 실패한다. */
const PINNED_260 = {
  erp: {css: '946d2e8ff08e86c7', fit: '55b5fb6a5d18a1bb', usage: '6222b46aad7cd43b', compiledCss: 'ea56444f283fc32e'},
  dashboard: {css: '0818d987eff20cde', fit: '5a4411062e01bc50', usage: '0314efd5057b8162', compiledCss: '624b424597e246a0'},
  document: {css: 'f4d4431175513487', fit: '7b2d2855751af81f', usage: 'e0056da70d1fc47a', compiledCss: 'c09341c745c40e4f'},
  marketing: {css: '3de809b0dff3751b', fit: '5d7c4c0a0df70737', usage: '34bf51442cf67eeb', compiledCss: '72db91762727bf86'},
};

test('2.6.0 typeRoles output is byte-pinned: role CSS, fit variant, usage manifest and the compiled page', () => {
  assert.deepEqual(Object.keys(MATERIAL_TYPE_PRESETS), Object.keys(PINNED_260));
  for (const [id, want] of Object.entries(PINNED_260)) {
    const compiled = compile({...createBlueprint('saas-landing'), catalogVersion: '2.6.0', typeRoles: id});
    assert.deepEqual({css: hash(renderRoleTypeCSS(id)), fit: hash(renderRoleTypeCSS(id, {fit: true})), usage: hash(roleTypeUsage(id)), compiledCss: hash(compiled.css)}, want, id);
    assert.equal(hash(compiled.manifest.typeRoles), want.usage, `${id} manifest.typeRoles`);
  }
});

test('the 2.6.0 compile still overrides the face pair per role preset (audit Q2), which is why the platform binds faces itself', () => {
  const effective = Object.fromEntries(Object.keys(MATERIAL_TYPE_PRESETS).map(id => {
    const css = compile({...createBlueprint('saas-landing'), catalogVersion: '2.6.0', typeRoles: id, typography: 'mono'}).css;
    const last = re => [...css.matchAll(re)].at(-1)[1];
    return [id, `${last(/--kit-heading:([^;}]*)/g)}|${last(/--kit-font:([^;}]*)/g)}`];
  }));
  assert.equal(new Set(Object.values(effective)).size <= 3, true, 'four role presets, at most three real face pairs, and the mono axis value is ignored');
  assert.ok(!effective.erp.includes(STACKS.mono.split(',')[0]), 'typography:mono does not reach the 2.6.0 output when typeRoles is set');
  assert.ok(new Set(systems.map(s => `${bound[s.id].vars['--kit-heading']}|${bound[s.id].vars['--kit-font']}`)).size === systems.length, 'the platform path keeps all of its pairs apart');
});
