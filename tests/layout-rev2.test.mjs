import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {layoutRev, LEGACY_LAYOUT_VERSIONS, FLOW_FALLBACKS, FIXED_FRAMES, REV1_GRIDS, REV2_EDITS, EQUAL_COLUMNS_OK, lintLayout, refineLayout, loneFields, layoutContractCSS, flowColumns, flowBreakpoints, flowOrphans, FLOW_BUDGETS, FULL_WIDTH_FIELDS} from '../src/layout.mjs';
import {fitCSS, wrapCSS, FIT, FIT_ROLES, WRAP, roleVar} from '../src/typography.mjs';
import {chunks} from '../src/styles/chunks.mjs';
import {polish, polishCore} from '../src/styles/polish.mjs';
import {coreCSS, tailCSS} from '../src/styles/base.mjs';
import {shellCSS} from '../src/styles/shells.mjs';
import {axes, createBlueprint, templateList, nodeSpecs, CATALOG_VERSION, migrateBlueprint, SUPPORTED_CATALOG_VERSIONS} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {SPACE} from '../src/spacing.mjs';

// 레이아웃 리비전 2(카탈로그 2.4.0): 진단 2026-11-21 공통 원인 1·4·5·6·7. 브라우저 실측은 e2e/layout-common.spec.mjs가 맡고, 여기서는 규약과 호환을 단위로 고정한다.
const read = f => JSON.parse(readFileSync(new URL('../docs/evidence/layout-refine/' + f, import.meta.url), 'utf8'));
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const allSource = () => [coreCSS, tailCSS, polishCore, ...Object.values(chunks), ...Object.values(polish), ...axes.shell.map(shell => shellCSS({shell, footer: axes.footer[0]}))].join('\n');

test('layout revision follows the catalog version: 2.1.0-2.3.0 and version-less callers are revision 1, 2.4.0 is revision 2', () => {
  assert.equal(CATALOG_VERSION, '2.4.0');
  for (const v of ['2.1.0', '2.2.0', '2.3.0']) assert.equal(layoutRev({catalogVersion: v}), 1, v);
  assert.equal(layoutRev({}), 1); assert.equal(layoutRev({catalogVersion: '2.4.0'}), 2);
  assert.deepEqual([...LEGACY_LAYOUT_VERSIONS, '2.4.0'], [...SUPPORTED_CATALOG_VERSIONS]);
});

test('catalog 2.3.0 inputs keep their previous output byte for byte (all 85 templates)', () => {
  const {hashes} = read('legacy-2-3-hashes.json'), {blueprints} = read('legacy-2-3-blueprints.json');
  assert.equal(Object.keys(hashes).length, templateList.length);
  for (const [id, hash] of Object.entries(hashes)) {
    const b = structuredClone(blueprints[id]);
    assert.equal(b.catalogVersion, '2.3.0');
    assert.equal(sha(compile(b)), hash, id);
  }
});

test('migrating 2.3.0 to 2.4.0 changes only the version and the layout output', () => {
  const old = structuredClone(read('legacy-2-3-blueprints.json').blueprints['agency-home']);
  const next = migrateBlueprint(old);
  assert.equal(next.catalogVersion, '2.4.0');
  assert.deepEqual({...next, catalogVersion: '2.3.0'}, old);
  const a = compile(old), b = compile(next);
  assert.doesNotMatch(a.html, /kit-hero-facts" data-flow/, '2.3.0 keeps the hand-written auto-fit facts grid');
  assert.match(b.html, /<dl class="kit-hero-facts" data-flow data-n="3" data-cap="3" data-flow-min="72" data-flow-gap="\d+">/);
  assert.match(a.css, /\.kit-hero-facts\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(96px,1fr\)\)/);
  assert.doesNotMatch(b.css, /\.kit-hero-facts\{[^}]*repeat\(/);
});

test('the grid exception list holds no hero facts and every remaining exception has an executable proof', () => {
  assert.ok(!FIXED_FRAMES.some(f => /hero-facts|menu/.test(f.selector)) && !FLOW_FALLBACKS.some(s => /hero-facts/.test(s)));
  assert.ok(REV1_GRIDS.includes('.kit-hero-facts'));
  const PROOFS = {
    'two-cells': () => { assert.deepEqual([nodeSpecs.split.min, nodeSpecs.split.max], [2, 2], 'a split always has two cells'); },
    'mega-span': () => {
      // 전체 보기 1개 + 하위 2~8개 = 3~9개. 2열에서 홀수면 마지막 칸이 줄 전체를 쓴다(고아 없음).
      assert.match(layoutContractCSS(), /\.kit-mega-panel li:last-child:nth-child\(odd\)\{grid-column:1\/-1\}/);
    },
    'form-pairs': () => {
      for (let n = 1; n <= 9; n++) for (let mask = 0; mask < 1 << Math.min(n, 6); mask++) {
        const fields = Array.from({length: n}, (_, i) => ({type: mask >> i & 1 ? 'textarea' : 'text'})), lone = loneFields(fields);
        // 짝이 없는 반폭 필드가 전폭이 되면, 반폭 필드로 이뤄진 연속 구간은 항상 둘씩 짝을 이룬다.
        let run = 0;
        fields.forEach((f, i) => { const half = !FULL_WIDTH_FIELDS.includes(f.type) && !lone.has(i); if (half) run++; else { assert.equal(run % 2, 0, JSON.stringify(fields)); run = 0; } });
        assert.equal(run % 2, 0, JSON.stringify(fields));
      }
    },
  };
  for (const f of FIXED_FRAMES) { assert.ok(PROOFS[f.proof], `${f.selector} needs a proof`); PROOFS[f.proof](); assert.ok(f.why.length > 10); }
});

test('no stale exception: every listed selector still matches a repeat() grid declaration in the source CSS', () => {
  // 맥락 결정표가 만드는 규칙(히어로·폼 등)은 완성된 스타일시트에서 읽는다.
  const composed = ['saas-landing', 'checkout', 'dashboard-overview'].map(id => compile(createBlueprint(id)).css).join('\n');
  const decls = [...(allSource() + composed).matchAll(/([^{}]+)\{([^{}]*grid-template-columns:repeat\([^{}]*)\}/g)].map(m => m[1].replace(/\s+/g, ' '));
  for (const s of EQUAL_COLUMNS_OK) assert.ok(decls.some(d => d.includes(s)), `stale exception ${s}`);
});

test('lintLayout strict: the finished revision 2 stylesheet declares no repeat() grid outside flows and proven frames', () => {
  const css = [coreCSS, tailCSS, polishCore, ...Object.values(chunks), ...Object.values(polish)].map(refineLayout);
  for (const shell of axes.shell) css.push(shellCSS({shell, footer: axes.footer[0]}));
  const bad = css.flatMap(c => lintLayout(c, {strict: true}).map(v => v.selector + ' => ' + v.value));
  assert.deepEqual([...new Set(bad)], []);
  // negative controls: strict reports the revision 1 leftovers that the non-strict (raw source) lint tolerates
  const raw = allSource();
  assert.ok(lintLayout(raw, {strict: true}).some(v => /kit-hero-facts/.test(v.selector)), 'strict lint sees the legacy hero facts grid');
  assert.deepEqual(lintLayout(raw), []);
  assert.equal(lintLayout('.kit-hero-facts{grid-template-columns:repeat(auto-fit,minmax(96px,1fr))}', {strict: true}).length, 1);
});

test('every revision 2 CSS edit finds its source fragment exactly once in the full source', () => {
  const src = allSource();
  for (const [from, to] of REV2_EDITS) { assert.equal(src.split(from).length - 1, 1, from); assert.notEqual(from, to); }
  assert.equal(refineLayout('.x{}'), '.x{}');
});

test('flow budgets keep the orphan-free rule at their own breakpoints for 2 to 4 items', () => {
  for (const [name, {minCell}] of Object.entries(FLOW_BUDGETS)) for (const gap of [SPACE.compact.gap, SPACE.spacious.gap]) {
    const bands = flowBreakpoints(minCell, gap);
    for (const cap of [2, 3, 4]) for (let n = 2; n <= 4; n++) {
      assert.deepEqual(flowOrphans(n, cap), [], `${name} n=${n} cap=${cap}`);
      flowColumns(n, cap).forEach((c, i) => { if (c > 1) assert.ok((bands[i] - gap * (c - 1)) / c >= minCell - 1, `${name} ${c} columns at ${bands[i]}px`); });
    }
  }
  // 진단 A1: 3개 수치가 2열 + 1칸이 되는 폭이 없다. 3열이 안 들어가면 한 열이다.
  assert.deepEqual(flowColumns(3, 3), [1, 1, 3, 3]);
});

test('hero facts, photo menu, profile stats and radio choices become flows only in revision 2', () => {
  const html = id => compile(createBlueprint(id)).html;
  assert.match(html('menu-dining'), /<ul data-flow data-n="3" data-cap="3" data-flow-min="200" data-flow-gap="\d+"><li data-thumb/);
  assert.match(html('profile'), /<dl class="kit-profile-stats" data-flow data-n="4" data-cap="4" data-flow-min="120"/);
  const legacy = structuredClone(read('legacy-2-3-blueprints.json').blueprints['menu-dining']);
  assert.doesNotMatch(compile(legacy).html, /data-flow-min="200"/);
});

test('2-column form: a half-width field without a partner takes the full row; paired fields and full-width types are untouched', () => {
  const T = type => ({type}), t = T('text');
  assert.deepEqual([...loneFields([t, t, T('textarea')])], []);
  assert.deepEqual([...loneFields([t, t, t])], [2]);
  assert.deepEqual([...loneFields([t, T('textarea'), t, t])], [0]);
  assert.deepEqual([...loneFields([T('select'), T('radio'), t])], [0, 2]);
  assert.deepEqual([...loneFields([])], []);
  const b = createBlueprint('checkout');
  const form = (function find(ns) { for (const n of ns) { if (n.type === 'form') return n; const r = n.children && find(n.children); if (r) return r; } })(b.tree.children);
  form.variant = 'two-column';
  const lone = loneFields(form.fields), html = compile(b).html;
  assert.ok(lone.size > 0, 'checkout has a lone half-width field to prove the rule on');
  assert.equal((html.match(/data-span="full"/g) ?? []).length, lone.size);
  assert.match(layoutContractCSS(), /\.kit-form\[data-variant=two-column\] \.kit-field\[data-span=full\]\{grid-column:1\/-1\}/);
  const old = structuredClone(read('legacy-2-3-blueprints.json').blueprints.checkout); 
  assert.doesNotMatch(compile(old).html, /data-span="full"/);
});

test('type roles fit their column: boxes cap the role at column / 9em, and only revision 2 carries the -raw aliases', () => {
  const css = compile(createBlueprint('offline')).css, legacy = compile(structuredClone(read('legacy-2-3-blueprints.json').blueprints.offline)).css;
  assert.match(css, /\.kit-empty\{--kit-t-app:min\(var\(--kit-t-app-raw\),calc\(\(100vw - 2 \* var\(--kit-gutter\) - 2 \* var\(--kit-inset\)\) \/ 9\)\);--kit-t-heading:min\(/);
  assert.match(css, /--kit-t-title-raw:clamp\(/);
  assert.doesNotMatch(legacy, /-raw:|calc\(\(100vw - 2 \* var\(--kit-gutter\)/);
  assert.deepEqual(FIT.boxes.map(b => [b.box, b.em]), [['.kit-empty', 9], ['.kit-page-header', 9], ['.kit-quote', 12]]);
  assert.match(fitCSS(), /\.kit-quote\{--kit-t-quote:min\(var\(--kit-t-quote-raw\),calc\(\(100vw - 2 \* var\(--kit-gutter\) - 2 \* var\(--kit-open-pad\)\) \/ 12\)\)/);
  assert.match(fitCSS(), /\.kit-page-header\{--kit-t-app:min\(var\(--kit-t-app-raw\),calc\(\(100vw - 2 \* var\(--kit-gutter\) - 0px\) \/ 9\)\)/);
  // 순환 참조가 없다: 역할 값은 자기 자신이 아니라 -raw 별칭을 읽는다
  for (const r of FIT_ROLES) assert.ok(!new RegExp(`${roleVar(r)}:min\\(var\\(${roleVar(r)}\\)`).test(fitCSS()), r);
});

test('wrap policy follows the role: title-like strong and brand names balance, prose stays pretty, revision 1 is untouched', () => {
  assert.equal(wrapCSS(), ':where(strong,.kit-brand-name){text-wrap:balance}');
  assert.ok(WRAP.pretty.includes('p') && WRAP.balance.includes('strong'));
  assert.match(compile(createBlueprint('hr-people')).css, /:where\(strong,\.kit-brand-name\)\{text-wrap:balance\}/);
  assert.doesNotMatch(compile(structuredClone(read('legacy-2-3-blueprints.json').blueprints['hr-people'])).css, /:where\(strong,\.kit-brand-name\)/);
});

test('cards that share a grid row absorb extra height in the body, not below it (revision 2 contract CSS)', () => {
  const css = compile(createBlueprint('sales-dashboard')).css;
  assert.match(css, /\[data-flow\]>\.kit-chart \.kit-chart-body\{flex:1 1 auto;align-content:center\}\[data-flow\]>\.kit-chart \.kit-chart-data\{margin-top:auto\}/);
});
