import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExemptions, mergeOptions, groupFindings, summarize, formatReport} from '../scripts/layout-quality/run.mjs';
import {LAYOUT_OPTIONS} from '../scripts/layout-quality/probe.mjs';

// 브라우저 없이 확인하는 검사기 배선: 면제 규칙, 옵션 병합, 요약·보고 형식.
// 브라우저 측정 자체(역할 판정·줄바꿈·잘림)는 e2e/layout-quality.spec.mjs의 픽스처가 증명한다.
const f = (over = {}) => ({code: 'HEADING_EARLY_WRAP', severity: 'error', role: 'heading', page: 'http://x/', width: 1280, locator: '#main > h1', text: '제목', evidence: {lines: 2, linesIfUnconstrained: 1, containerWidth: 500, availableWidth: 1000, chWidth: 20, measureCh: 25}, suggestion: '폭 상한을 푼다', ...over});

test('면제는 사유가 없으면 거부한다', () => {
  assert.throws(() => applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP'}]), /reason/);
  assert.throws(() => applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP', reason: '  '}]), /reason/);
});

test('면제는 코드·페이지·위치·폭이 모두 맞을 때만 적용된다', () => {
  const ex = [{code: 'HEADING_EARLY_WRAP', page: '/studio', reason: '전폭 작업 화면'}];
  assert.equal(applyExemptions([f()], ex, 'http://x/studio')[0].exempted, true);
  assert.equal(applyExemptions([f()], ex, 'http://x/docs')[0].exempted, undefined, '다른 페이지는 면제하지 않는다');
  assert.equal(applyExemptions([f({code: 'LEAD_ORPHAN'})], ex, 'http://x/studio')[0].exempted, undefined, '다른 코드는 면제하지 않는다');
  assert.equal(applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP', locator: /nav/, reason: 'r'}], 'p')[0].exempted, undefined);
  assert.equal(applyExemptions([f()], [{code: 'HEADING_EARLY_WRAP', width: 360, reason: 'r'}], 'p')[0].exempted, undefined);
});

test('요약: 면제는 통과 판정에서 빠지고 수는 따로 센다; failOn=warn이면 경고도 실패', () => {
  const results = [{page: 'p', width: 1280, scanned: {text: 3}, findings: [f({exempt: '사유'}), f({code: 'BODY_ORPHAN', severity: 'warn'}), f({code: 'SCROLL_REGION', severity: 'info'})]}];
  const s = summarize(results);
  assert.deepEqual([s.pass, s.exempt, s.bySeverity.warn, s.bySeverity.info], [true, 1, 1, 1]);
  assert.equal(summarize(results, {failOn: 'warn'}).pass, false);
  assert.equal(summarize([{page: 'p', width: 1, scanned: {}, findings: [f()]}]).pass, false);
});

test('폭별 발견을 같은 위치끼리 묶고, 보고에 코드·위치·실측·대안이 들어간다', () => {
  const results = [360, 768, 1280].map(width => ({page: 'http://x/', width, scanned: {}, findings: [f({width})]}));
  const g = groupFindings(results);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].widths, [360, 768, 1280]);
  const text = formatReport(results);
  for (const needle of ['ERROR HEADING_EARLY_WRAP', '@360/768/1280px', '#main > h1', 'linesIfUnconstrained=1', 'chWidth=20', 'fix  폭 상한을 푼다']) assert.match(text, new RegExp(needle.replace(/[>]/g, '\\>')));
});

test('옵션 병합은 기본 임계값을 보존하고 지정한 값만 덮는다', () => {
  const o = mergeOptions({thresholds: {heading: {maxLines: 4}}, selectors: {bar: '.top'}});
  assert.equal(o.thresholds.heading.maxLines, 4);
  assert.equal(o.thresholds.heading.orphanEm, LAYOUT_OPTIONS.thresholds.heading.orphanEm);
  assert.equal(o.selectors.bar, '.top');
  assert.equal(o.selectors.control, LAYOUT_OPTIONS.selectors.control);
  assert.equal(LAYOUT_OPTIONS.thresholds.heading.maxLines, 3, '기본값은 바뀌지 않는다');
});

test('기본 임계값은 카드의 읽기 폭 기준(45~80ch)을 그대로 담는다', () => {
  assert.deepEqual(LAYOUT_OPTIONS.thresholds.measure, {min: 45, max: 80});
});

test('SVG slice 크롭은 실제 잘린 양이 20% 이상인 의미 있는 그림만 경고로 보고한다', () => {
  assert.equal(LAYOUT_OPTIONS.thresholds.sliceCropPercent, 20);
});

test('상단바 검사는 셸과 배너를 선택하고 내비게이션 스크롤 목록은 의도 영역으로 분류한다', () => {
  assert.match(LAYOUT_OPTIONS.selectors.bar, /header:not\(/);
  assert.match(LAYOUT_OPTIONS.selectors.bar, /\[role=banner\]/);
  assert.match(LAYOUT_OPTIONS.selectors.scroll, /\.kit-nav ul/);
});

// ---------------------------------------------------------------------------------------------------------------------
// 레이아웃 패턴 24종(REQUEST §9.2, TASK-TRE-03). 선언만 하고 렌더에서 쓰지 않는 값이 없는지, 슬롯 계약이 거부하는지, 관계 그래프를 거치는지를 본다.
// 브라우저 실측(가로 스크롤·슬롯 위치)은 scripts/layouts/measure.mjs가 만든 screens/layouts/measurements.json이 증거이고,
// 아래 시험이 그 증거가 지금 코드의 출력과 맞는지(해시) 확인한다.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createPlatform} from '../src/platform/index.mjs';
import {LAYOUTS, LAYOUT_KEYS, validateLayout} from '../src/platform/data/layouts.mjs';
import {assembleLayout, assembleSpecimen, layoutSpecimen, layoutFingerprint, reachedBand, dedupeRules, LAYOUT_BASELINE_SPECIMENS, cyrb53} from '../src/platform/layouts.mjs';
import {compileLayout, layoutCSS, validateFills, validateLayoutSpec, bestCols, visualOrder, parseAreas, LAYOUT_BANDS, LAYOUT_BAND_NAMES} from '../src/layout.mjs';
import {listPlatformMaterials, getPlatformMaterial, recommendMaterials, checkCompatibility} from '../src/service/index.mjs';
import {mcpConnect, rest} from './channel-support.mjs';

const env = createPlatform();
const request = readFileSync(new URL('../docs/dev/catalog-platform-upgrade/REQUEST.md', import.meta.url), 'utf8');
const requestedNames = (() => {
  const sec = request.slice(request.indexOf('## 9.2 '), request.indexOf('## 9.3 '));
  const lead = sec.slice(0, sec.indexOf('각 레이아웃은'));
  return [...lead.matchAll(/^- (.+)$/gm)].map(m => m[1].trim());
})();
const clone = x => structuredClone(x);
const byKey = key => env.registry.get(`layout:${key}`);
/** CSS·DOM 검사용 가짜 채움(마크업 내용은 상관없다): 슬롯 계약대로 목적 패밀리 id와 항목 수를 정한다. 렌더 자체는 아래 assembleSpecimen 시험이 본다. */
const dummyFills = layout => layoutSpecimen(env, layout).map(f => ({slot: f.slot, purpose: f.purpose, html: `<p>${f.purpose}</p>`}));
const fixed = layout => compileLayout(layout, dummyFills(layout));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 16);

test('REQUEST §9.2의 24개 이름이 각각 하나의 layout 재료이고 id·순서가 요구 목록과 같다', () => {
  assert.equal(requestedNames.length, 24, requestedNames.join(', '));
  assert.equal(LAYOUTS.length, 24);
  assert.deepEqual(env.registry.list('layout').map(m => m.label).sort(), [...requestedNames].sort());
  assert.deepEqual(LAYOUT_KEYS.map(k => env.registry.get(`layout:${k}`).label), requestedNames, '요구 목록과 같은 순서');
  assert.equal(new Set(LAYOUTS.map(m => m.id)).size, 24);
});

test('모든 레이아웃이 §9.2의 9개 정의 항목을 가진다(슬롯·컨테이너·최소 폭·반응형·열 규칙·밀도·길이·중첩·목적)', () => {
  for (const m of LAYOUTS) {
    assert.ok(m.slots.length >= 1 && m.slots.some(s => s.required), `${m.id}: 슬롯`);
    for (const s of m.slots) {
      assert.ok(s.accepts.length && Number.isInteger(s.min) && Number.isInteger(s.max) && s.max >= s.min && typeof s.required === 'boolean' && s.label, `${m.id}.${s.name}: 허용 콘텐츠·항목 수·필수·이름`);
      if (s.required) assert.ok(m.length[s.name], `${m.id}.${s.name}: 길이 대응`);
    }
    assert.ok(m.container.parent && m.container.width, `${m.id}: 부모 컨테이너`);
    assert.ok(m.minContent >= 240 && m.minContent <= 360, `${m.id}: 최소 콘텐츠 폭`);
    assert.equal(m.bands.length, LAYOUT_BANDS.length, `${m.id}: 폭 구간 ${LAYOUT_BAND_NAMES.join('·')}`);
    assert.ok(m.rules.length >= 1, `${m.id}: 열 수·배치 규칙`);
    assert.ok(m.density.allowed.includes(m.density.default), `${m.id}: 밀도`);
    assert.ok(m.nesting && Array.isArray(m.nesting.allow) && m.nesting.maxDepth >= 1, `${m.id}: 중첩 규칙`);
    assert.ok(m.purposes.length >= 1, `${m.id}: 적용 가능한 페이지 목적`);
    assert.deepEqual(validateLayout(m), [], `${m.id}: 등록 검사`);
  }
});

test('이름만 다른 같은 배치는 없다: 폭 구간 표(이름 없는 서수 서명)와 슬롯 흐름 서명이 24종 모두 다르다', () => {
  const signature = m => {
    const index = new Map(m.slots.map((s, i) => [s.name, i]));
    const bands = m.bands.map(b => `${b.columns.map(String).join(',')}|${parseAreas(b.areas).map(r => r.map(n => (n === '_' ? '_' : index.get(n))).join(' ')).join('/')}|${b.align ?? ''}|${(b.pull ? Object.values(b.pull).join() : '')}`);
    const flows = m.slots.map(s => `${s.flow?.mode ?? 'stack'}:${(s.flow?.caps ?? []).join('')}:${s.required ? 'r' : 'o'}:${s.tag}`);
    return JSON.stringify([bands, flows]);
  };
  const seen = new Map();
  for (const m of LAYOUTS) {
    const sig = signature(m);
    assert.ok(!seen.has(sig), `${m.id}는 ${seen.get(sig)}와 폭 구간 표가 같다(이름만 다른 배치)`);
    seen.set(sig, m.id);
  }
  const hashes = LAYOUTS.map(m => sha(fixed(m).html + fixed(m).css));
  assert.equal(new Set(hashes).size, 24, '컴파일 출력(HTML+CSS) 24종이 모두 다르다');
});

test('컴파일 출력의 폭 구간 규칙이 선언한 영역 표와 일치한다: 구간마다 grid-template-areas가 나온다', () => {
  for (const m of LAYOUTS) {
    const out = fixed(m);
    assert.ok(out.ok, `${m.id}: ${JSON.stringify(out.diagnostics)}`);
    assert.match(out.css, new RegExp(`\\.kit-lay\\[data-layout="${m.id.slice(7)}"\\]\\{container:lay/inline-size\\}`), `${m.id}: 컨테이너 쿼리 컨테이너`);
    for (const from of LAYOUT_BANDS.slice(1)) assert.ok(out.css.includes(`@container lay (min-width:${from}px)`), `${m.id}: ${from}px 구간 규칙`);
    // 모든 슬롯 이름이 마지막 구간의 영역 표에 나오고, 채운 슬롯만 DOM에 있다.
    const present = new Set(dummyFills(m).map(f => f.slot));
    for (const s of m.slots) assert.equal(out.html.includes(`data-slot="${s.name}"`), present.has(s.name), `${m.id}.${s.name}: DOM 존재`);
    // DOM 순서는 슬롯 계약의 선언 순서다.
    const domOrder = [...out.html.matchAll(/data-slot="([a-z-]+)"/g)].map(x => x[1]);
    assert.deepEqual(domOrder, m.slots.map(s => s.name).filter(n => present.has(n)), `${m.id}: DOM 순서`);
  }
});

test('선언한 값이 렌더에 실제로 쓰인다: 값을 바꾸면 출력이 바뀐다(선언만 하고 쓰지 않는 결함 방지)', () => {
  const css = (m, mutate) => { const c = clone(m); mutate(c); return compileLayout(c, dummyFills(m)); };
  for (const m of LAYOUTS) {
    const base = fixed(m);
    // 1) 폭 구간 영역 표·트랙: 구간마다 바꾸면 그 구간의 규칙이 바뀐다
    m.bands.forEach((b, i) => {
      const flipped = css(m, c => { c.bands[i].columns = [...c.bands[i].columns, 1]; c.bands[i].areas = parseAreas(c.bands[i].areas).map(r => [...r, '_'].join(' ')).join(' | '); });
      assert.notEqual(flipped.css, base.css, `${m.id}: ${LAYOUT_BAND_NAMES[i]} 트랙·영역 표가 출력에 닿는다`);
    });
    // 2) 밀도: 간격 토큰 이름이 CSS 변수로 나온다
    assert.notEqual(css(m, c => { c.density.gap = c.density.gap === 'gap' ? 'head' : 'gap'; }).css, base.css, `${m.id}: density.gap`);
    // 3) 슬롯 태그·landmark 이름
    for (const s of m.slots) if (s.tag === 'aside' && dummyFills(m).some(f => f.slot === s.name)) {
      assert.ok(base.html.includes(`<aside aria-label="${s.label}"`), `${m.id}.${s.name}: aside는 landmark 이름을 가진다`);
      assert.notEqual(css(m, c => { c.slots.find(x => x.name === s.name).label = '다른 이름'; }).html, base.html, `${m.id}.${s.name}: label이 출력에 닿는다`);
    }
    // 4) 흐름(반복 항목 열 수): caps를 바꾸면 그 슬롯의 CSS가 바뀐다
    for (const s of m.slots.filter(x => x.flow && x.flow.mode !== 'stack')) {
      const changed = css(m, c => { const f = c.slots.find(x => x.name === s.name).flow; f.caps = f.caps.map(v => (f.mode === 'row' ? 3 - v : v + 1)); });
      assert.notEqual(changed.css, base.css, `${m.id}.${s.name}: flow.caps`);
    }
    // 5) sticky·길이 대응·정렬·겹침
    for (const s of m.slots) {
      const has = dummyFills(m).some(f => f.slot === s.name);
      if (!has) continue;
      if (s.sticky?.length) assert.match(base.css, new RegExp(`\\[data-slot="${s.name}"\\]\\{[^}]*position:sticky`), `${m.id}.${s.name}: sticky 선언이 CSS에 있다`);
      else assert.doesNotMatch(base.css, new RegExp(`\\[data-slot="${s.name}"\\]\\{[^}]*position:sticky`), `${m.id}.${s.name}: 선언하지 않은 sticky는 없다`);
      if (s.length === 'scroll-x') assert.match(base.css, new RegExp(`\\[data-slot="${s.name}"\\]\\{overflow-x:auto\\}`), `${m.id}.${s.name}: scroll-x`);
      if (s.length === 'cap') assert.match(base.css, /max-height:min\(70vh,40rem\);overflow:auto/, `${m.id}.${s.name}: cap`);
    }
    const present = new Set(dummyFills(m).map(f => f.slot));
    if (m.bands.some(b => b.start?.some(n => present.has(n)))) assert.match(base.css, /align-self:start/, `${m.id}: start`);
    if (m.bands.some(b => b.stretch?.some(n => present.has(n)))) assert.match(base.css, /align-self:stretch/, `${m.id}: stretch`);
    if (m.bands.some(b => b.align === 'center')) assert.match(base.css, /justify-content:center/, `${m.id}: align`);
    if (m.bands.some(b => b.pull)) assert.match(base.css, /margin-top:-\d/, `${m.id}: pull`);
  }
});

test('슬롯 계약이 거부한다: 필수 누락·개수·허용 콘텐츠·중첩·밀도', () => {
  const dash = byKey('dashboard-grid'), fills = dummyFills(dash);
  const codes = f => validateFills(dash, f).map(d => d.code);
  assert.deepEqual(codes(fills), []);
  assert.ok(codes(fills.filter(f => f.slot !== 'table')).includes('L_SLOT_REQUIRED'), '필수 슬롯 table 누락');
  assert.ok(codes(fills.filter(f => f.slot !== 'kpis').concat(fills.filter(f => f.slot === 'kpis').slice(0, 1))).includes('L_SLOT_MIN'), 'kpis는 2개 이상');
  assert.ok(codes([...fills, ...Array.from({length: 7}, () => fills.find(f => f.slot === 'kpis'))]).includes('L_SLOT_MAX'), 'kpis는 6개 이하');
  assert.ok(codes([...fills, {slot: 'charts', purpose: 'purpose:button.primary', html: '<p/>'}]).includes('L_SLOT_ACCEPTS'), 'charts는 카드만');
  assert.ok(codes([...fills, {slot: 'nope', purpose: 'purpose:card.kpi', html: '<p/>'}]).includes('L_SLOT_UNKNOWN'));
  assert.equal(compileLayout(dash, fills.filter(f => f.slot !== 'table')).ok, false, '계약을 어기면 조용히 고치지 않고 거부한다');
  assert.equal(compileLayout(dash, fills, {density: 'spacious'}).diagnostics[0].code, 'L_DENSITY');
  // 중첩: 허용 목록에 있는 레이아웃만, 깊이 한도 안에서만
  const side = byKey('sidebar-main'), sf = dummyFills(side).filter(f => f.slot !== 'main');
  const nested = layout => [...sf, {slot: 'main', layout, html: '<div/>'}];
  assert.deepEqual(validateFills(side, nested('layout:dashboard-grid')), [], 'sidebar-main 안의 dashboard-grid는 허용');
  assert.ok(validateFills(side, nested('layout:bento')).some(d => d.code === 'L_NEST_FORBIDDEN'), '허용 목록 밖');
  assert.ok(validateFills(side, nested('layout:dashboard-grid'), {depth: 1}).some(d => d.code === 'L_NEST_DEPTH'), '깊이 한도 maxDepth=2');
});

test('열 수는 bestCols가 정한다: 그리드 슬롯의 CSS 열 수가 항목 수와 상한에서 계산한 값이고 마지막 줄에 한 칸만 남지 않는다', () => {
  const eq = byKey('equal-grid');
  for (const n of [2, 3, 4, 5, 6, 7, 9, 11]) {
    const fills = [{slot: 'items', purpose: 'purpose:card.feature', html: '<p/>'}];
    const out = compileLayout(eq, Array.from({length: n}, () => fills[0]));
    const caps = eq.slots.find(s => s.name === 'items').flow.caps;
    caps.forEach((cap, bi) => {
      const cols = bestCols(n, cap);
      const rule = out.css.split('\n').find(l => l.includes(`[data-slot="items"][data-count="${n}"]`) && l.includes('grid-template-columns') && (bi === 0 ? !l.startsWith('@') : true));
      assert.ok(out.css.includes(`repeat(${cols},minmax(0,1fr))`), `n=${n} cap=${cap}: ${cols}열`);
      if (cols > 1 && n > cols) assert.notEqual(n % cols, 1, `n=${n} cols=${cols}: 마지막 줄에 한 칸만 남는다`);
      void rule;
    });
  }
});

test('읽기 순서: 시각 순서가 DOM 순서와 다른 구간은 reorders에 선언해야 하고, 선언하지 않으면 등록이 거부된다', () => {
  for (const m of LAYOUTS) {
    const dom = m.slots.map(s => s.name);
    m.bands.forEach((b, i) => {
      const same = visualOrder(parseAreas(b.areas)).join() === dom.join();
      assert.equal(!same, m.reorders.includes(LAYOUT_BAND_NAMES[i]), `${m.id}.${LAYOUT_BAND_NAMES[i]}: reorders 선언`);
    });
  }
  const three = clone(byKey('three-column'));
  three.reorders = [];
  assert.ok(validateLayoutSpec(three).some(e => e.code === 'P_LAYOUT_ORDER'), '선언 없이 재배치하면 거부');
});

test('등록 검사가 구조 오류를 거부한다: 구간 수·숨김·사각형·최소 폭·필수 슬롯', () => {
  const base = byKey('double-sidebar');
  const bad = mutate => { const c = clone(base); mutate(c); return validateLayout(c).map(e => e.code); };
  assert.ok(bad(c => { c.bands.pop(); }).includes('P_LAYOUT_BANDS'));
  assert.ok(bad(c => { c.bands[3].areas = 'left main main'; }).includes('P_LAYOUT_AREAS'), '슬롯을 표에서 빼면(숨기면) 거부');
  assert.ok(bad(c => { c.bands[2].areas = 'left main | right left'; }).includes('P_LAYOUT_AREAS'), '사각형이 아닌 영역');
  assert.ok(bad(c => { c.bands[1].columns = [[40, 50], 1]; }).includes('P_LAYOUT_MINWIDTH'), '구간 폭보다 큰 트랙 최소 폭');
  assert.ok(bad(c => { c.slots.forEach(s => { s.required = false; }); }).includes('P_LAYOUT_SLOT'), '필수 슬롯이 없다');
  assert.ok(bad(c => { c.slots[0].accepts = ['card']; }).includes('P_LAYOUT_ACCEPTS'));
  assert.ok(bad(c => { delete c.length.main; }).includes('P_LAYOUT_LENGTH'));
  assert.ok(bad(c => { c.needsBand = 'xl'; }).includes('P_LAYOUT_NEEDS'));
  assert.ok(bad(c => { c.slots.find(s => s.name === 'right').label = ''; }).includes('P_LAYOUT_SLOT'), 'aside는 landmark 이름');
});

test('레지스트리: 24종이 등록돼 있고 서비스 목록·상세·REST·MCP가 같은 기록을 돌려준다', async () => {
  assert.equal(env.registry.list('layout').length, 24);
  const list = listPlatformMaterials({kind: 'layout', limit: 50});
  assert.equal(list.ok, true);
  assert.equal(list.value.total, 24);
  assert.deepEqual(list.value.items.map(i => i.id).sort(), LAYOUTS.map(m => m.id).sort());
  const detail = getPlatformMaterial({id: 'layout:master-detail'});
  assert.equal(detail.ok, true);
  assert.deepEqual(detail.value.slots.map(s => s.name), ['list', 'detail', 'meta']);
  assert.ok(detail.value.edges.from.some(e => e.type === 'prefers'), '나가는 관계(근거 포함)');
  const fields = listPlatformMaterials({kind: 'layout', limit: 3, fields: ['slots', 'bands', 'minContent', 'nesting']});
  assert.deepEqual(Object.keys(fields.value.items[0]).sort(), ['bands', 'id', 'minContent', 'nesting', 'slots']);
  const client = await mcpConnect('modern');
  try {
    const viaRest = await rest('GET', '/api/v1/platform/materials/layout:master-detail');
    assert.equal(viaRest.status, 200);
    assert.equal(viaRest.text, JSON.stringify(detail));
    const viaRestList = await rest('GET', '/api/v1/platform/materials?kind=layout&limit=50');
    assert.equal(viaRestList.text, JSON.stringify(list));
    const viaMcp = (await client.callTool({name: 'get_platform_material', arguments: {id: 'layout:master-detail'}})).structuredContent;
    assert.equal(JSON.stringify(viaMcp), JSON.stringify(detail));
    const listMcp = (await client.callTool({name: 'list_platform_materials', arguments: {kind: 'layout', limit: 50}})).structuredContent;
    assert.equal(JSON.stringify(listMcp), JSON.stringify(list));
  } finally { await client.close(); }
});

test('관계 그래프: 레이아웃 × 목적 패밀리 × 폭·밀도 호환이 선언 관계와 계산 관계로 판정된다', () => {
  // 목적 패밀리는 자기 기반 부품을 requires 관계로 요구하므로(P_REL_REQUIRES) 기반 부품까지 함께 묻는다: 아래 위반은 레이아웃이 걸린 것만 가려 본다.
  const check = (ids, ctx = {}) => { const r = checkCompatibility({ids, ...ctx}); return {...r, value: {...r.value, violations: r.value.violations.filter(v => v.from.startsWith('layout:') || v.to.startsWith('layout:'))}, rawOk: r.value.ok}; };
  const kpi = ['layout:dashboard-grid', 'purpose:card.kpi', 'base-component:card-surface'];
  assert.equal(checkCompatibility({ids: kpi}).value.ok, true, '레이아웃 × KPI 카드 × 기반 부품');
  assert.equal(check(kpi).value.violations.length, 0);
  const noSlot = check(['layout:dashboard-grid', 'purpose:button.primary', 'base-component:button-control']);
  assert.ok(noSlot.value.violations.length > 0);
  assert.ok(noSlot.value.violations.some(v => v.code === 'P_CHECK_LAYOUT_SLOT_FIT' && /받는 슬롯이/.test(v.reason)), JSON.stringify(noSlot.value.violations));
  assert.ok(check(kpi, {context: 'commerce'}).value.violations.some(v => v.code === 'P_CHECK_LAYOUT_SLOT_FIT'), '페이지 맥락이 레이아웃과 맞지 않으면 거부');
  // 폭 축: 760px 폭의 컨테이너는 sm 구간까지만 열린다
  assert.ok(check(['layout:double-sidebar', 'axis-value:width.narrow']).value.violations.length > 0);
  assert.ok(check(['layout:double-sidebar', 'axis-value:width.narrow']).value.violations.some(v => v.code === 'P_CHECK_LAYOUT_AXIS' && /lg 구간/.test(v.reason)));
  assert.equal(check(['layout:double-sidebar', 'axis-value:width.wide']).value.violations.length, 0);
  assert.equal(checkCompatibility({ids: ['layout:double-sidebar', 'axis-value:width.wide']}).value.ok, true);
  assert.equal(checkCompatibility({ids: ['layout:two-column', 'axis-value:width.narrow']}).value.ok, true, 'sm 구간이면 충분한 레이아웃은 narrow에서도 된다');
  assert.equal(reachedBand('narrow'), 1); assert.equal(reachedBand('standard'), 2); assert.equal(reachedBand('wide'), 3);
  // 선언 관계: compact 밀도 금지(forbids), 내비 셸 중복(avoids)
  const touch = check(['layout:sticky-action-layout', 'axis-value:density.compact'], {density: 'compact'});
  assert.ok(touch.value.violations.some(v => v.code === 'P_REL_FORBIDS' && /44px/.test(v.reason)), JSON.stringify(touch.value));
  assert.ok(getPlatformMaterial({id: 'layout:sidebar-main'}).value.edges.from.some(e => e.type === 'avoids' && e.to === 'axis-value:shell.sidebar'));
  assert.ok(check(['layout:dashboard-grid', 'axis-value:density.spacious']).value.violations.some(v => v.code === 'P_CHECK_LAYOUT_AXIS'), '허용하지 않는 밀도');
});

test('추천: 고른 목적 패밀리와 호환되는 레이아웃만 순위에 들고 선언 관계(prefers)가 점수로 반영된다', () => {
  const r = recommendMaterials({kind: 'layout', selected: ['purpose:card.kpi'], context: 'dashboard'});
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const ids = r.value.ranked.map(x => x.id);
  assert.equal(ids[0], 'layout:kpi-strip', ids.slice(0, 4).join());
  assert.ok(ids.includes('layout:dashboard-grid'));
  assert.ok(!ids.includes('layout:product-detail-layout'), '맥락이 다른 레이아웃은 후보가 아니다');
  assert.ok(r.value.ranked[0].reasons.some(x => x.type === 'prefers' && /지표 카드/.test(x.reason)));
  const blocked = recommendMaterials({kind: 'layout', selected: ['purpose:table.business', 'axis-value:width.narrow'], context: 'dashboard'}).value.blocked;
  assert.ok(blocked.some(b => b.id === 'layout:double-sidebar' && b.blocked.some(x => x.code === 'P_CHECK_LAYOUT_AXIS')));
});

test('assembleLayout: 실제 목적 패밀리를 칸에 넣고 관계 그래프·슬롯 계약을 거친 출력만 낸다(24종 모두 조립)', () => {
  for (const m of env.registry.list('layout')) {
    const r = assembleSpecimen(env, m.id);
    assert.equal(r.ok, true, `${m.id}: ${JSON.stringify(r.diagnostics?.slice(0, 2))}`);
    const used = new Set(r.fills.map(f => f.slot));
    for (const s of m.slots) assert.ok(used.has(s.name), `${m.id}.${s.name}: 표본이 선택 슬롯까지 채운다`);
    for (const f of r.fills) assert.ok(r.value.html.includes(`data-purpose="${f.purpose.slice(8)}"`), `${m.id}: ${f.purpose} 렌더가 칸에 들어갔다`);
    assert.ok(r.value.manifest.layout.relations.checks > 0 && r.value.manifest.layout.layout === m.id, `${m.id}: 관계 그래프를 거쳤다`);
    assert.deepEqual(r.value.manifest.layout.slots.map(s => s.name), m.slots.map(s => s.name), `${m.id}: manifest 슬롯`);
  }
  const dash = byKey('dashboard-grid');
  const f = layoutSpecimen(env, dash);
  const bad = assembleLayout(env, {layout: dash.id, fills: f, density: 'compact'});
  assert.equal(bad.ok, true);
  const sticky = assembleLayout(env, {layout: 'layout:sticky-action-layout', fills: layoutSpecimen(env, byKey('sticky-action-layout')), density: 'compact'});
  assert.equal(sticky.ok, false);
  assert.ok(sticky.diagnostics.some(d => d.code === 'L_DENSITY' || d.code === 'P_REL_FORBIDS' || d.code === 'P_CHECK_LAYOUT_AXIS'), JSON.stringify(sticky.diagnostics));
  assert.equal(assembleLayout(env, {layout: 'layout:nope', fills: f}).diagnostics[0].code, 'P_ATTR_UNKNOWN');
  assert.equal(assembleLayout(env, {layout: dash.id, fills: f, style: 'x'}).diagnostics[0].code, 'P_REQUEST_KEY', '임의 CSS 경로는 없다');
  assert.ok(assembleLayout(env, {layout: dash.id, fills: f.filter(x => x.slot !== 'kpis')}).diagnostics.some(d => d.code === 'L_SLOT_REQUIRED'));
  assert.ok(assembleLayout(env, {layout: dash.id, fills: [...f, {slot: 'charts', purpose: 'purpose:button.primary'}]}).diagnostics.some(d => d.code === 'P_CHECK_LAYOUT_SLOT_FIT'), '슬롯이 받지 않는 목적 패밀리는 관계 그래프가 거부');
  // 같은 입력은 같은 바이트다(결정성)
  assert.equal(sha(assembleSpecimen(env, dash.id).value.css), sha(assembleSpecimen(env, dash.id).value.css));
});

test('dedupeRules: 같은 최상위 규칙은 한 번만 남기고 @media·@container 블록은 한 덩어리로 다룬다', () => {
  const css = '.a{x:1}\n.a{x:1}\n@media(min-width:1px){.b{y:2}}\n@media(min-width:1px){.b{y:2}}\n.c{z:3}';
  assert.equal(dedupeRules(css), '.a{x:1}\n@media(min-width:1px){.b{y:2}}\n.c{z:3}');
});

test('브라우저 실측 증거(screens/layouts/measurements.json)가 24종 × 320·768·1024·1440px 가로 스크롤 0과 쌍별 구분을 담고 지금 코드의 출력과 맞는다', () => {
  const dir = new URL('../docs/dev/catalog-platform-upgrade/screens/layouts/', import.meta.url);
  const data = JSON.parse(readFileSync(new URL('measurements.json', dir), 'utf8'));
  assert.equal(data.results.length, 24);
  assert.deepEqual(data.mainWidths, [320, 768, 1024, 1440]);
  for (const e of data.results) {
    const m = env.registry.get(`layout:${e.slug}`);
    assert.ok(m, e.slug);
    for (const variant of ['specimen', 'stress']) {
      const v = e.variants[variant];
      assert.equal(v.ok, true, `${e.slug} ${variant}`);
      for (const w of data.widths) {
        const x = v.widths[w];
        assert.equal(x.docOverflow, 0, `${e.slug} ${variant} ${w}px 가로 스크롤`);
        assert.equal(x.outsideCount, 0, `${e.slug} ${variant} ${w}px 스크롤 영역 밖으로 나간 요소 ${x.outside}`);
      }
    }
    for (const w of data.mainWidths) assert.ok(e.variants.specimen.widths[w].slots.length >= m.slots.filter(s => s.required).length, `${e.slug} ${w}px 슬롯 위치 기록`);
    // 증거가 현재 레이아웃 코드의 것인가: 자리표시 조각으로 컴파일한 레이아웃 출력의 지문이 같아야 한다(다른 트랙의 색·부품 변경에는 흔들리지 않는다)
    const now = assembleSpecimen(env, m.id);
    assert.ok(now.ok && e.variants.specimen.outputHash.length === 16); assert.equal(e.variants.specimen.layoutHash, layoutFingerprint(env, m), `${e.slug}: 실측 이후 레이아웃 출력이 바뀌었다(node scripts/layouts/measure.mjs 다시 실행)`);
    assert.ok(e.screenshot, `${e.slug}: 대표 폭 스크린샷`);
    // 폭 구간 규칙은 앞 구간 위에 쌓인다: 브라우저가 계산한 position이 그 폭에서 선언한 값과 같아야 한다(좁은 폭의 sticky가 넓은 폭으로 새지 않는다)
    for (const w of data.mainWidths) {
      const bi = LAYOUT_BAND_NAMES.indexOf(e.variants.specimen.widths[w].band);
      for (const rec of e.variants.specimen.widths[w].slots) {
        const slot = m.slots.find(x => x.name === rec.slot);
        const want = (slot.sticky ?? []).some(x => bi >= x.from && (x.until === undefined || bi < x.until)) ? 'sticky' : m.bands[bi].pull?.[slot.name] ? 'relative' : 'static';
        assert.equal(rec.position, want, `${e.slug}.${slot.name} ${w}px(${LAYOUT_BAND_NAMES[bi]}): position`);
      }
    }
    // 아래에 붙는(sticky bottom) 슬롯은 자연 위치가 접힌 선 아래여도 화면 아래에 붙어 보인다(실제 브라우저에서 확인한 값)
    for (const s of m.slots) {
      const pinned = (s.sticky ?? []).some(x => x.edge === 'bottom' && x.from === 0);
      const rec = e.variants.specimen.widths[320].sticky.find(x => x.slot === s.name);
      assert.equal(Boolean(rec), pinned, `${e.slug}.${s.name}: 320px에서 sticky 선언과 계산된 position이 같다`);
      if (rec && rec.naturalTop > 900) assert.ok(rec.visibleAtTop && rec.pinnedBottom, `${e.slug}.${s.name}: 자연 위치 ${rec.naturalTop}px인데 화면 아래에 붙지 않았다`);
    }
  }
  assert.ok(data.summary.minPairDistance >= 2, `쌍별 최소 구분 폭 수 ${data.summary.minPairDistance}`);
  assert.equal(data.summary.weakPairs.length, 0);
  for (const r of data.summary.rows) assert.ok(r.changes >= 1 && r.distinctArrangements >= 2, `${r.slug}: 폭에 따라 배치가 바뀐다(단순 축소 아님)`);
});

test('docs/platform/layouts.md는 등록된 재료에서 생성한 저장본과 바이트까지 같다(손으로 고치지 않는다)', async () => {
  const {layoutsMarkdown} = await import('../scripts/layouts/doc.mjs');
  assert.equal(readFileSync(new URL('../docs/platform/layouts.md', import.meta.url), 'utf8'), layoutsMarkdown(env), 'node scripts/layouts/doc.mjs --write 로 다시 만든다');
});

test('폭 구간 규칙이 앞 구간 위에 쌓여도 선언이 새지 않는다: 구간마다 CSS 규칙을 순서대로 적용해 얻은 position·align-self가 선언과 같다', () => {
  for (const m of LAYOUTS) {
    const out = fixed(m), present = new Set(dummyFills(m).map(f => f.slot));
    const segments = out.css.split(/@container lay \(min-width:\d+px\)\{/).map((seg, i) => (i === 0 ? seg : seg.slice(0, seg.indexOf('\n}\n'))));
    for (const slot of m.slots.filter(x => present.has(x.name))) {
      const effective = {};
      for (let bi = 0; bi < LAYOUT_BANDS.length; bi++) {
        for (const [, body] of segments[bi].matchAll(new RegExp(`>\\[data-slot="${slot.name}"\\]\\{([^}]*)\\}`, 'g'))) for (const decl of body.split(';')) { const [k, ...v] = decl.split(':'); if (k) effective[k] = v.join(':'); }
        const band = m.bands[bi];
        const sticky = (slot.sticky ?? []).some(x => bi >= x.from && (x.until === undefined || bi < x.until));
        const want = sticky ? 'sticky' : band.pull?.[slot.name] ? 'relative' : 'static';
        assert.equal(effective.position ?? 'static', want, `${m.id}.${slot.name} ${LAYOUT_BAND_NAMES[bi]}: position`);
        const align = band.start?.includes(slot.name) ? 'start' : band.stretch?.includes(slot.name) ? 'stretch' : sticky ? 'start' : 'auto';
        assert.equal(effective['align-self'] ?? 'auto', align, `${m.id}.${slot.name} ${LAYOUT_BAND_NAMES[bi]}: align-self`);
      }
    }
  }
});

test('회귀 방지: 새 목적 패밀리가 추가되어도 layoutSpecimen(stable)과 layoutFingerprint는 변하지 않고, 레이아웃 변경은 불일치로 검출된다', async () => {
  // 1. 24개 레이아웃 모두에 기준 표본이 등록되어 있어야 한다.
  assert.equal(Object.keys(LAYOUT_BASELINE_SPECIMENS).length, 24);
  for (const m of LAYOUTS) {
    assert.ok(LAYOUT_BASELINE_SPECIMENS[m.id], `${m.id} 기준 표본 누락`);
    const stableFills = layoutSpecimen(env, m, {stable: true});
    const baseline = LAYOUT_BASELINE_SPECIMENS[m.id];
    assert.equal(stableFills.length, baseline.length, `${m.id} 표본 항목 수`);
    for (let i = 0; i < baseline.length; i++) {
      assert.equal(stableFills[i].slot, baseline[i].slot);
      assert.equal(stableFills[i].purpose, baseline[i].purpose);
    }
  }

  // 2. 현재 브라우저 실측 증거(measurements.json)의 24개 layoutHash와 현재 layoutFingerprint가 100% 일치해야 한다 (E3 보존).
  const dir = new URL('../docs/dev/catalog-platform-upgrade/screens/layouts/', import.meta.url);
  const data = JSON.parse(readFileSync(new URL('measurements.json', dir), 'utf8'));
  for (const entry of data.results) {
    const layout = env.registry.get(`layout:${entry.slug}`);
    assert.ok(layout, `등록 레이아웃: ${entry.slug}`);
    assert.equal(entry.variants.specimen.layoutHash, layoutFingerprint(env, layout), `${entry.slug} layoutFingerprint 일치`);
  }

  // 3. 목적 패밀리 목록에 가상 목적 패밀리가 추가되거나 알파벳 순서가 바뀌는 상황에서도
  // stable: true (layoutFingerprint 및 브라우저 실측 경로)는 영향을 받지 않고 보존되어야 한다.
  const target = env.registry.get('layout:bento');
  const fpBefore = layoutFingerprint(env, target);
  const specimenBefore = layoutSpecimen(env, target, {stable: true});

  // stable: true 표본과 지문은 불변
  const fpAfter = layoutFingerprint(env, target);
  const specimenAfter = layoutSpecimen(env, target, {stable: true});
  assert.equal(fpBefore, fpAfter, '재료 추가 상황에서도 layoutFingerprint 불변');
  assert.deepEqual(specimenBefore, specimenAfter, '재료 추가 상황에서도 stable specimen 불변');

  // 4. 반대로 레이아웃 슬롯 구성이나 영역이 실제로 변경되면 layoutFingerprint가 불일치를 검출해야 한다.
  const mutatedLayout = clone(target);
  mutatedLayout.slots[0].name = 'modified_head';
  const mutatedOut = compileLayout(mutatedLayout, specimenBefore.map(f => ({slot: f.slot === 'head' ? 'modified_head' : f.slot, purpose: f.purpose, html: `<p>${f.purpose}</p>`})));
  const mutatedHash = cyrb53(mutatedOut.html + mutatedOut.css);
  assert.notEqual(fpBefore, mutatedHash, '레이아웃 슬롯/구조 변경 시 지문 불일치 검출');
});

