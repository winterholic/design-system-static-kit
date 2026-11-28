import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {familyShapeVars} from '../src/platform/family.mjs';
import {VISUAL_LANGUAGES, VISUAL_KEYS, FAMILY_SCOPE_CSS} from '../src/platform/families/visual.mjs';
import {renderPurposeFamily, assembleFamilies, combinationMatrix, getPurposeFamily} from '../src/platform/families/index.mjs';
import {RADIUS, ELEVATION, MOTION, ICON} from '../src/styles/base.mjs';

const EXPECTED_FAMILIES = [
  {id: 'family:quiet', name: 'Minimal Flat', key: 'quiet'},
  {id: 'family:soft', name: 'Soft Rounded', key: 'soft'},
  {id: 'family:outline-precise', name: 'Outline Precise', key: 'outline-precise'},
  {id: 'family:corporate-formal', name: 'Corporate Formal', key: 'corporate-formal'},
  {id: 'family:dense-enterprise', name: 'Dense Enterprise', key: 'dense-enterprise'},
  {id: 'family:elevated-material', name: 'Elevated Material', key: 'elevated-material'},
  {id: 'family:tonal-layered', name: 'Tonal Layered', key: 'tonal-layered'},
  {id: 'family:editorial', name: 'Editorial', key: 'editorial'},
  {id: 'family:glass', name: 'Glass', key: 'glass'},
  {id: 'family:bold', name: 'Brutalist', key: 'bold'},
  {id: 'family:luxury', name: 'Luxury', key: 'luxury'},
  {id: 'family:expressive', name: 'Expressive', key: 'expressive'},
];

// REQUEST §7이 각 패밀리에 정의하라는 12개 속성
const REQUIRED_TRAIT_KEYS = [
  'corner', 'border', 'shadow', 'surface', 'controlHeight',
  'padding', 'icon', 'buttonEmphasis', 'state', 'cardStructure',
  'navExpression', 'motion',
];

const env = createPlatform();
const families = env.registry.list('family');

/** 대표 화면: 카드·버튼·입력·내비게이션·표·피드백을 한 번에 조립한다. 모든 시각 패밀리가 같은 항목을 렌더한다. */
const SCENE = [
  {purpose: 'purpose:card.kpi', content: {label: '매출', value: '1,000,000', unit: '원', delta: '+12%', deltaDirection: 'up'}},
  {purpose: 'purpose:button.primary', content: {label: '저장', secondaryLabel: '취소'}},
  {purpose: 'purpose:form.search'},
  {purpose: 'purpose:navigation.tabs'},
  {purpose: 'purpose:table.business'},
  {purpose: 'purpose:feedback.confirm'},
];
const assembleScene = (visual, items = SCENE) => {
  const built = items.map((it, i) => ({id: `s${i}`, ...(({purpose, content, variant, props}) => ({purpose, content, variant, props}))(it), visual}));
  return assembleFamilies(env, {context: 'dashboard', mode: 'light', items: built.map(b => ({...b, ...exampleOf(b)}))});
};
function exampleOf(it) {
  const f = getPurposeFamily(it.purpose);
  return {variant: it.variant ?? f.example.variant, props: it.props ?? f.example.props, content: it.content ?? f.example.content};
}

/** 색 변수를 뺀 값의 묶음. 한 묶음에서 하나라도 다르면 그 묶음이 다른 것이다. */
const CATEGORIES = {
  shape: ['--kit-radius'],
  border: ['--pf-border', '--pf-rule', '--pf-focus-w', '--pf-focus-off'],
  shadow: ['--kit-shadow', '--kit-shadow-hover', '--pf-elev-rest', '--pf-elev-float'],
  surface: ['--pf-surface', '--pf-blur'],
  space: ['--kit-inset', '--pf-pad', '--pf-gap', '--pf-cell-pad'],
  size: ['--kit-control'],
  type: ['--kit-bw', '--pf-title-weight', '--pf-label-case', '--pf-label-track', '--pf-stat-scale'],
  icon: ['--kit-icon-sw', '--kit-icon-cap', '--kit-icon-join', '--kit-icon-fill'],
  motion: ['--kit-dur', '--kit-lift'],
};
/**
 * 색 토큰의 이름만 다른 값은 차이로 세지 않는다. 테두리는 굵기, 면은 투명도, 그림자는 오프셋·번짐, 아이콘 채움은 불투명도만 남긴다.
 * (var(--kit-soft)와 var(--kit-surface)는 색이 다를 뿐 형태·간격·표면 구조는 같다.)
 */
const NO_COLOR = {
  '--pf-border': v => /^(\d+)px/.exec(v)?.[1] ?? '0', '--pf-rule': v => /^(\d+)px/.exec(v)?.[1] ?? '0',
  '--pf-surface': v => (v === 'transparent' ? 'transparent' : /(\d+)%,transparent\)/.exec(v) ? `alpha ${/(\d+)%,transparent\)/.exec(v)[1]}` : 'opaque'),
  '--kit-icon-fill': v => (v === 'none' ? 'none' : /(\d+)%/.exec(v)?.[1] ?? v),
  ...Object.fromEntries(['--kit-shadow', '--kit-shadow-hover', '--pf-elev-rest', '--pf-elev-float'].map(k => [k, v => v.replace(/color-mix\([^)]*\)|var\(--kit-[a-z-]+\)/g, 'C')])),
};
/** 한 패밀리가 출력에 내는 색 아닌 값: 범위 변수와 구성원 고정 축, 버튼 강조 단계별 외형. */
export function appearanceOf(family) {
  const vars = familyShapeVars(family), out = {};
  for (const [cat, names] of Object.entries(CATEGORIES)) for (const n of names) out[`${cat}:${n}`] = (NO_COLOR[n] ?? (v => v))(vars[n] ?? '-');
  for (const [base, m] of Object.entries(family.members)) for (const [axis, v] of Object.entries(m.preset)) out[`variant:${base.slice('base-component:'.length)}.${axis}`] = v;
  for (const [tier, appearance] of Object.entries(VISUAL_LANGUAGES[family.id].recipe)) out[`variant:button.${tier}`] = appearance;
  return out;
}
export function differences(a, b) {
  const x = appearanceOf(a), y = appearanceOf(b), keys = Object.keys(x).filter(k => x[k] !== y[k]);
  return {keys, categories: new Set(keys.map(k => k.split(':')[0]))};
}
const MIN_VALUES = 12, MIN_CATEGORIES = 6;

test('TASK-TRE-01 Criterion 1: exactly 12 visual families registered, legacy 4 mapped and expanded without new IDs', () => {
  const registered = env.registry.list('family');
  assert.equal(registered.length, 12, `Must register exactly 12 families, got ${registered.length}`);

  const registeredIds = new Set(registered.map(f => f.id));
  for (const exp of EXPECTED_FAMILIES) {
    assert.ok(registeredIds.has(exp.id), `Family ${exp.id} (${exp.name}) must be registered`);
    assert.equal(VISUAL_LANGUAGES[exp.id].key, exp.key);
  }
  // 기존 4개 패밀리가 새 ID 없이 유지되는지 확인
  for (const id of ['family:quiet', 'family:soft', 'family:bold', 'family:editorial']) assert.ok(registeredIds.has(id), `${id} keeps its legacy id`);
  assert.equal(VISUAL_KEYS.length, 12, 'VISUAL_KEYS must contain 12 keys');
  assert.deepEqual([...VISUAL_KEYS].sort(), [...new Set(VISUAL_KEYS)].sort());
});

test('TASK-TRE-01 Criterion 2: every family defines the 12 traits of REQUEST §7 and they are the single source of the emitted values', () => {
  for (const f of families) {
    const lang = VISUAL_LANGUAGES[f.id];
    for (const key of REQUIRED_TRAIT_KEYS) assert.ok(lang.traits[key] !== undefined, `${f.id} traits must include ${key}`);
    const vars = familyShapeVars(f);
    // 모서리·그림자·모션은 family.shape가 읽는 값이고, 그 값이 곧 출력 변수다
    assert.equal(f.shape.radius, lang.traits.corner, `${f.id}: shape.radius is the corner trait`);
    assert.equal(f.shape.elevation, lang.traits.shadow, `${f.id}: shape.elevation is the shadow trait`);
    assert.equal(vars['--kit-radius'], `${RADIUS[lang.traits.corner]}px`);
    assert.equal(vars['--kit-shadow-hover'], ELEVATION[lang.traits.shadow].hover);
    assert.equal(vars['--kit-dur'], lang.traits.motion.dur);
    assert.equal(vars['--kit-lift'], MOTION[f.shape.motion].lift);
    assert.equal(vars['--kit-control'], lang.traits.controlHeight, `${f.id}: control height trait is the emitted control size`);
    assert.equal(vars['--pf-border'], lang.traits.border);
    assert.equal(vars['--pf-surface'], lang.traits.surface);
    assert.equal(vars['--pf-pad'], lang.traits.padding);
    assert.equal(vars['--kit-icon-sw'], String(lang.traits.icon.sw));
    assert.equal(lang.traits.icon.sw, ICON[lang.traits.icon.style].sw);
    assert.equal(vars['--pf-focus-w'] + ' solid var(--kit-focus)', lang.traits.state.focusOutline);
    // 카드 구조·내비게이션 표현·버튼 강조는 구성원 고정 축과 목적 패밀리가 읽는 값이다
    assert.deepEqual({appearance: f.members['base-component:card-surface'].preset.appearance, shape: f.members['base-component:card-surface'].preset.shape}, lang.traits.cardStructure);
    assert.deepEqual({appearance: f.members['base-component:navigation-menu'].preset.appearance, shape: f.members['base-component:navigation-menu'].preset.shape}, lang.traits.navExpression);
    assert.deepEqual(lang.recipe, lang.traits.buttonEmphasis);
    // 계산한 측정값은 traits와 어긋나지 않는다(어긋나면 조합 거부가 렌더와 다른 근거를 읽는다)
    assert.equal(lang.metrics.borderW, Number(/^(\d+)px/.exec(lang.traits.border)?.[1] ?? 0));
    assert.equal(lang.metrics.opaqueSurface, !/transparent/.test(lang.traits.surface));
  }
});

test('TASK-TRE-01 Criterion 2b: every value a family emits is read by the assembled output (a declared but unread value is a defect)', () => {
  const emitted = new Set();
  for (const f of families) for (const k of Object.keys(familyShapeVars(f))) emitted.add(k);
  const css = families.map(f => assembleScene(f.id)).map(r => { assert.ok(r.ok, JSON.stringify(r.diagnostics?.slice(0, 2))); return r.value.css; });
  const reads = new Set(css.flatMap(c => [...c.matchAll(/var\((--[A-Za-z0-9-]+)/g)].map(m => m[1])));
  const unread = [...emitted].filter(k => !reads.has(k));
  assert.deepEqual(unread, [], `emitted by familyShapeVars but no output CSS reads them: ${unread.join(', ')}`);
  // 값을 읽는 규칙이 패밀리 범위로 출력에 실려 있다(포커스 링·라벨 글자·표 셀·표면 계층·유리)
  for (const needle of ['outline-width:var(--pf-focus-w)', 'text-transform:var(--pf-label-case)', 'padding-block:var(--pf-cell-pad)', 'box-shadow:var(--pf-elev-rest)', 'box-shadow:var(--pf-elev-float)', 'backdrop-filter:blur(var(--pf-blur,0px))']) {
    assert.ok(FAMILY_SCOPE_CSS.includes(needle), `scope CSS reads ${needle}`);
    assert.ok(css[0].includes(needle), `assembled CSS carries ${needle}`);
  }
});

test('TASK-TRE-01 Criterion 3: every pair of the 12 families differs in more than color (shape, border, shadow, surface, space, size, type, icon, motion, variants)', () => {
  let pairs = 0;
  for (let i = 0; i < families.length; i++) for (let j = i + 1; j < families.length; j++) {
    const d = differences(families[i], families[j]);
    assert.ok(d.keys.length >= MIN_VALUES, `${families[i].id} × ${families[j].id}: only ${d.keys.length} differing values (${d.keys.join(', ')}), need ${MIN_VALUES}`);
    assert.ok(d.categories.size >= MIN_CATEGORIES, `${families[i].id} × ${families[j].id}: differs in only ${[...d.categories].join('/')}`);
    // 색 변수는 비교에 없다: 위 묶음은 어디에도 색 토큰을 담지 않는다
    pairs++;
  }
  assert.equal(pairs, 66, 'all 66 pairs (12 choose 2) are compared');
});

test('TASK-TRE-01 Criterion 3b: the pair check has teeth (a copy of a family and a one-value change are caught, color-token names do not count)', () => {
  const quiet = env.registry.get('family:quiet');
  // 이름만 다른 복제는 차이가 0이다
  assert.equal(differences(quiet, {...quiet, id: 'family:quiet'}).keys.length, 0);
  // 색 토큰의 이름만 다른 면은 차이가 아니다(투명도가 같으면 같은 표면 구조다)
  assert.equal(NO_COLOR['--pf-surface']('var(--kit-soft)'), NO_COLOR['--pf-surface']('var(--kit-surface)'));
  assert.notEqual(NO_COLOR['--pf-surface']('color-mix(in srgb,var(--kit-surface) 78%,transparent)'), NO_COLOR['--pf-surface']('var(--kit-surface)'));
  assert.equal(NO_COLOR['--pf-border']('1px solid var(--kit-text)'), NO_COLOR['--pf-border']('1px solid var(--kit-border)'));
  assert.notEqual(NO_COLOR['--kit-shadow']('4px 4px 0 var(--kit-text)'), NO_COLOR['--kit-shadow']('2px 2px 0 var(--kit-text)'));
  // 가장 가까운 쌍도 한계 아래로 내려가면 실패한다: 한 값만 바꾼 변종은 기준에 못 미친다
  const nearly = {...quiet, shape: {...quiet.shape, radius: 'round'}};
  assert.ok(differences(quiet, nearly).keys.length < MIN_VALUES);
});

test('TASK-TRE-01 Criterion 3c: the same components rendered by different families differ in the output markup, not only in variables', () => {
  const html = Object.fromEntries(families.map(f => [f.id, assembleScene(f.id).value.html]));
  const distinct = new Set(Object.values(html));
  assert.equal(distinct.size, 12, 'twelve families produce twelve different pages');
  // 같은 컴포넌트의 data 속성(외형·모양)이 패밀리마다 다르게 나온다
  const attrs = id => [...html[id].matchAll(/data-(appearance|shape)="([a-z-]+)"/g)].map(m => `${m[1]}=${m[2]}`).sort().join(' ');
  const signatures = new Set(families.map(f => attrs(f.id)));
  assert.ok(signatures.size >= 10, `component appearance/shape markup signatures: ${signatures.size}`);
});

test('TASK-TRE-01 Criterion 3d: each family has a unique fixed-axis signature across the ten base components', () => {
  const seen = new Map();
  for (const f of families) {
    const sig = JSON.stringify(Object.entries(f.members).map(([b, m]) => [b, m.preset]));
    assert.ok(!seen.has(sig), `${f.id} has the same fixed axes as ${seen.get(sig)}`);
    seen.set(sig, f.id);
  }
  assert.equal(seen.size, 12);
});

test('TASK-TRE-01 Criterion 4: relation graph compatibility, distinction between avoids and forbids with reasons', () => {
  for (const f of families) {
    for (const rel of f.relations) {
      assert.ok(['prefers', 'avoids', 'forbids', 'requires', 'compatible'].includes(rel.type), `Valid relation type: ${rel.type}`);
      assert.ok(rel.reason && rel.reason.length >= 5, `Relation from ${f.id} to ${rel.to} must have meaningful reason`);
      if (rel.type === 'forbids') {
        assert.ok(rel.reason.includes('금지') || rel.reason.includes('불가') || rel.reason.includes('충돌') || rel.reason.includes('방지') || rel.reason.includes('위험'),
          `Forbid reason for ${f.id} -> ${rel.to} must be objective: ${rel.reason}`);
      }
    }
  }
});

test('TASK-TRE-01 Criterion 4b: combination rejections come from measured traits and name their reason (glass over fixed bars, 12px rows in dense tables)', () => {
  const matrix = combinationMatrix(env);
  const cell = (purpose, visual) => matrix.find(r => r.purpose === purpose).cells[visual];
  // 반투명 면은 본문 위에 고정되는 내비에 못 쓴다. 불투명 면 패밀리는 쓴다
  assert.equal(cell('purpose:navigation.bottom', 'family:glass').ok, false);
  assert.match(cell('purpose:navigation.bottom', 'family:glass').reasons[0].message, /투명/);
  assert.equal(cell('purpose:navigation.bottom', 'family:quiet').ok, true);
  // 표 셀 위아래 여백이 12px인 패밀리는 고밀도 표를 거부한다
  for (const id of ['family:soft', 'family:editorial', 'family:luxury', 'family:tonal-layered']) {
    assert.equal(cell('purpose:table.dense', id).ok, false, id);
    assert.match(cell('purpose:table.dense', id).reasons[0].message, /패딩|여백/);
  }
  assert.equal(cell('purpose:table.dense', 'family:dense-enterprise').ok, true);
  // 거부 코드는 개별 값이 틀린 경우(P_PURPOSE_VARIANT 등)와 다르다
  assert.ok(cell('purpose:table.dense', 'family:soft').reasons.every(r => /^P_PURPOSE_(VISUAL|COMBO)$/.test(r.code)));
});

test('TASK-TRE-01 Criterion 5: all 12 families render purpose components and assemble into actual output', () => {
  for (const f of families) {
    const res = renderPurposeFamily(env, 'purpose:card.kpi', {
      visual: f.id,
      variant: {layout: 'stacked', trend: 'spark'},
      props: {size: 'medium'},
      content: {label: '매출', value: '1,000,000', unit: '원', delta: '+12%', deltaDirection: 'up'},
    });
    assert.ok(res.ok, `${f.id} must successfully render KPI card: ${JSON.stringify(res.errors)}`);
    assert.ok(res.html.includes('data-ctl="card"'), `${f.id} markup must include card base component`);
    const page = assembleScene(f.id);
    assert.ok(page.ok, `${f.id}: ${JSON.stringify(page.diagnostics?.slice(0, 2))}`);
    assert.ok(page.value.css.includes(`[data-family="${VISUAL_LANGUAGES[f.id].key}"]{`), `${f.id}: the family scope block is in the output CSS`);
  }
});

test('TASK-TRE-01 Criterion 5b: the family-specific effects reach the output (glass blur on translucent faces, tiered shadows only for elevated-material)', () => {
  const glass = assembleScene('family:glass').value.css;
  assert.match(glass, /\[data-family="glass"\]\{[^}]*--pf-blur:14px/);
  assert.match(glass, /--pf-surface:color-mix\(in srgb,var\(--kit-surface\) 78%,transparent\)/);
  const quiet = assembleScene('family:quiet').value.css;
  assert.doesNotMatch(quiet, /--pf-blur:/, 'a family without blur does not emit one');
  const rest = id => /--pf-elev-rest:([^;}]*)/.exec(assembleScene(id).value.css)[1];
  assert.notEqual(rest('family:elevated-material'), ELEVATION.lifted.hover, 'elevated-material rests shallower than it floats');
  assert.equal(rest('family:soft'), ELEVATION.lifted.hover, 'other families keep resting at their own hover elevation');
});
