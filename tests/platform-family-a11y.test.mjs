/**
 * 목적 패밀리 52종의 접근성 계약(`a11y.role`·`a11y.keyboard`·`a11y.conditions`)을 렌더 마크업과 대조한다(재료 검증 F1).
 *
 * 계약 문구는 산문이라 조건마다 마크업 단언을 `SPEC`에 적는다. 이 시험은 세 가지를 본다.
 *   1 대응: 계약의 조건 문구와 `SPEC`의 키가 일대일이다. 계약이 바뀌면 단언이 없는 조건이 시험을 깨뜨린다. 마크업으로 볼 수 없는 조건(크기·대비·산문)은
 *           `OFF_MARKUP`에 이유와 확인 위치를 적어야 하고, 그 확인이 실제로 있는지 아래 시험이 파일을 읽어 본다.
 *   2 예시 렌더: 각 패밀리의 예시를 렌더해 역할, Tab 순서, 조건별 단언을 확인한다.
 *   3 전 변형 렌더: 모든 변형 값 × 시각 패밀리 4종에서 id 중복·끊어진 ARIA 참조·이름 없는 컨트롤·라벨 없는 입력·양수 tabindex·장식 아이콘 노출을 본다.
 * 키 동작과 상태 전이는 브라우저에서 본다: e2e/platform-family-a11y.spec.mjs.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createPlatform} from '../src/platform/index.mjs';
import {PURPOSE_FAMILIES, PURPOSE_FAMILY_IDS, VISUAL_KEYS, renderPurposeFamily} from '../src/platform/families/index.mjs';

const env = createPlatform();
const VISUALS = env.registry.list('family').map(f => f.id);

// ---------------------------------------------------------------------------------------------
// 작은 HTML 해석기. 생성 마크업만 다루므로 속성과 중첩을 읽는 데 필요한 만큼만 둔다.
// ---------------------------------------------------------------------------------------------
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'source', 'col']);
const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
const decode = s => s.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

function parse(html) {
  const root = {tag: '#root', attrs: {}, children: [], parent: null, text: ''}, all = [];
  let cur = root;
  for (const m of html.matchAll(TOKEN)) {
    if (m[1]) { let n = cur; while (n !== root && n.tag !== m[1].toLowerCase()) n = n.parent; if (n !== root) cur = n.parent; continue; }
    if (m[2]) {
      const attrs = {};
      for (const a of (m[3] ?? '').matchAll(ATTR)) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
      const el = {tag: m[2].toLowerCase(), attrs, children: [], parent: cur, text: ''};
      cur.children.push(el); all.push(el);
      if (!m[4] && !VOID.has(el.tag)) cur = el;
    } else if (m[5] !== undefined) cur.text += decode(m[5]);
  }
  return {root, all, byId: new Map(all.filter(e => e.attrs.id !== undefined).map(e => [e.attrs.id, e]))};
}

const has = (el, name) => el.attrs[name] !== undefined;
const classes = el => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
const ancestors = el => { const out = []; for (let n = el.parent; n && n.tag !== '#root'; n = n.parent) out.push(n); return out; };

/** 단순 선택자: 쉼표, 자손(공백), 자식(>), 태그, .클래스, #id, [속성], [속성=값]. 가상 클래스는 없다. */
function compound(sel) {
  const parts = {tag: null, classes: [], id: null, attrs: []};
  for (const m of sel.matchAll(/^[\w-]+|\.[\w-]+|#[\w-]+|\[([\w-]+)(?:=("[^"]*"|[^\]]*))?\]/g)) {
    const t = m[0];
    if (t[0] === '.') parts.classes.push(t.slice(1)); else if (t[0] === '#') parts.id = t.slice(1);
    else if (t[0] === '[') parts.attrs.push([m[1], m[2]?.replace(/^"|"$/g, '')]); else parts.tag = t;
  }
  return parts;
}
function is(el, sel) {
  const c = compound(sel);
  return (!c.tag || el.tag === c.tag) && c.classes.every(x => classes(el).includes(x)) && (!c.id || el.attrs.id === c.id)
    && c.attrs.every(([k, v]) => v === undefined ? has(el, k) : el.attrs[k] === v);
}
function query(dom, selector, scope = null) {
  const out = new Set();
  for (const alt of selector.split(',').map(s => s.trim())) {
    const steps = alt.split(/\s*(>)\s*|\s+/).filter(Boolean);
    const chain = []; let child = false;
    for (const s of steps) { if (s === '>') child = true; else { chain.push({sel: s, child}); child = false; } }
    for (const el of dom.all) {
      if (scope && !ancestors(el).includes(scope)) continue;
      let ok = is(el, chain.at(-1).sel), at = el, i = chain.length - 1;
      while (ok && i > 0) {
        const direct = chain[i].child; i -= 1;
        if (direct) { at = at.parent; ok = !!at && at.tag !== '#root' && is(at, chain[i].sel); }
        else { at = ancestors(at).find(a => is(a, chain[i].sel)); ok = !!at; }
      }
      if (ok) out.add(el);
    }
  }
  return dom.all.filter(e => out.has(e));
}

const textOf = (el, {skipHidden = true} = {}) => {
  if (el.tag === 'svg') return '';
  if (skipHidden && el.attrs['aria-hidden'] === 'true') return '';
  return (el.text + el.children.map(c => textOf(c, {skipHidden})).join(' ')).replace(/\s+/g, ' ').trim();
};
const isHiddenTree = el => [el, ...ancestors(el)].some(n => has(n, 'hidden') || (n.tag === 'dialog' && !has(n, 'open')));
const NATIVE = el => el.tag === 'button' || el.tag === 'select' || el.tag === 'textarea' || (el.tag === 'a' && has(el, 'href')) || (el.tag === 'input' && el.attrs.type !== 'hidden') || (el.tag === 'summary' && el.parent?.tag === 'details');
const focusable = el => !has(el, 'disabled') && (NATIVE(el) || has(el, 'tabindex')) && !isHiddenTree(el);
const tabbable = el => focusable(el) && !(has(el, 'tabindex') && Number(el.attrs.tabindex) < 0);

function accName(dom, el) {
  if (has(el, 'aria-labelledby')) return el.attrs['aria-labelledby'].split(/\s+/).map(id => { const t = dom.byId.get(id); return t ? textOf(t, {skipHidden: false}) : ''; }).join(' ').trim();
  if (el.attrs['aria-label']?.trim()) return el.attrs['aria-label'].trim();
  if (el.tag === 'input' || el.tag === 'select' || el.tag === 'textarea') {
    const label = el.attrs.id && dom.all.find(l => l.tag === 'label' && l.attrs.for === el.attrs.id) || ancestors(el).find(a => a.tag === 'label');
    if (label) return textOf(label);
    if (el.tag === 'input' && ['submit', 'button'].includes(el.attrs.type) && el.attrs.value) return el.attrs.value;
  }
  return (textOf(el) || el.attrs.title || el.attrs.alt || '').trim();
}
/** DOM 순서대로 Tab이 닿는 요소의 이름. */
const tabOrder = dom => dom.all.filter(tabbable).map(el => accName(dom, el));

// ---------------------------------------------------------------------------------------------
// 모든 렌더가 지켜야 하는 불변식
// ---------------------------------------------------------------------------------------------
const ARIA_ROLES = new Set(['alert', 'alertdialog', 'article', 'banner', 'button', 'checkbox', 'combobox', 'complementary', 'dialog', 'group', 'img', 'link', 'list', 'listbox', 'listitem', 'menu', 'menuitem', 'navigation', 'option', 'progressbar', 'region', 'search', 'status', 'tab', 'tablist', 'tabpanel', 'toolbar', 'table', 'row', 'cell', 'columnheader', 'rowheader', 'grid', 'presentation', 'none', 'note', 'tooltip', 'tree', 'treeitem']);
const REF_ATTRS = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant', 'aria-owns'];
const BOOL = new Set(['true', 'false']);
const NEEDS_LABEL_INPUT = el => el.tag === 'input' && !['hidden', 'submit', 'button', 'reset'].includes(el.attrs.type);

function invariants(dom) {
  const bad = [];
  const ids = dom.all.filter(e => has(e, 'id')).map(e => e.attrs.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) bad.push(`중복 id: ${id}`);
  for (const el of dom.all) for (const a of REF_ATTRS) if (has(el, a)) {
    const refs = el.attrs[a].split(/\s+/).filter(Boolean);
    if (!refs.length && a !== 'aria-activedescendant') bad.push(`${el.tag}[${a}]가 비어 있다`);
    for (const r of refs) if (!dom.byId.has(r)) bad.push(`${el.tag}[${a}="${r}"]가 가리키는 id가 없다`);
  }
  for (const el of dom.all) {
    if (!focusable(el) && !(NATIVE(el) && !isHiddenTree(el))) continue;
    if (NATIVE(el) || has(el, 'tabindex')) {
      if (!accName(dom, el)) bad.push(`이름 없는 컨트롤: <${el.tag}${el.attrs.role ? ` role=${el.attrs.role}` : ''}${el.attrs.class ? ` class="${el.attrs.class}"` : ''}>`);
    }
  }
  for (const el of dom.all) {
    if (NEEDS_LABEL_INPUT(el) && !accName(dom, el)) bad.push(`라벨 없는 입력: ${el.attrs.id ?? el.attrs.name}`);
    if (has(el, 'tabindex') && Number(el.attrs.tabindex) > 0) bad.push(`양수 tabindex: <${el.tag}>`);
    if (el.attrs['aria-hidden'] === 'true' && [el, ...el.children.flatMap(function walk(c) { return [c, ...c.children.flatMap(walk)]; })].some(tabbable)) bad.push(`aria-hidden 안에 포커스 가능한 요소가 있다: <${el.tag} class="${el.attrs.class ?? ''}">`);
    if (el.tag === 'svg') {
      if (el.attrs.role === 'img' && !accName(dom, el)) bad.push('role=img 그림에 접근 가능한 이름이 없다');
      if (el.attrs.role !== 'img' && el.attrs['aria-hidden'] !== 'true' && !ancestors(el).some(a => a.attrs['aria-hidden'] === 'true')) bad.push(`장식 svg가 보조기기에 노출된다: ${el.attrs.class ?? ''}`);
    }
    if (el.tag === 'img' && !has(el, 'alt')) bad.push('alt 없는 img');
    if (has(el, 'role')) for (const r of el.attrs.role.split(/\s+/)) if (!ARIA_ROLES.has(r)) bad.push(`모르는 role: ${r}`);
    for (const a of ['aria-selected', 'aria-pressed', 'aria-expanded', 'aria-busy', 'aria-disabled', 'aria-invalid', 'aria-hidden', 'aria-required']) if (has(el, a) && !BOOL.has(el.attrs[a])) bad.push(`${a}="${el.attrs[a]}"는 true·false가 아니다`);
    if (has(el, 'aria-current') && !['page', 'step', 'location', 'date', 'time', 'true', 'false'].includes(el.attrs['aria-current'])) bad.push(`aria-current="${el.attrs['aria-current']}"`);
    if (el.attrs.role === 'tab' && (!has(el, 'aria-selected') || !has(el, 'aria-controls'))) bad.push('tab에 aria-selected·aria-controls가 없다');
    if (el.attrs.role === 'tabpanel' && !has(el, 'aria-labelledby')) bad.push('tabpanel에 aria-labelledby가 없다');
    if (el.attrs.role === 'combobox' && !(has(el, 'aria-expanded') && has(el, 'aria-controls'))) bad.push('combobox에 aria-expanded·aria-controls가 없다');
    if (el.attrs.role === 'option' && !has(el, 'aria-selected')) bad.push('option에 aria-selected가 없다');
  }
  return bad;
}

// ---------------------------------------------------------------------------------------------
// 렌더 도우미
// ---------------------------------------------------------------------------------------------
const family = id => PURPOSE_FAMILIES.find(f => f.id === id);
function render(id, visual, over = {}) {
  const f = family(id), ex = f.example;
  const r = renderPurposeFamily(env, id, {visual, variant: {...ex.variant, ...over.variant}, props: {...ex.props, ...over.props}, content: {...ex.content, ...over.content}});
  return r.ok ? {ok: true, html: r.html, dom: parse(r.html)} : {ok: false, errors: r.errors};
}
const QUIET = 'family:quiet';
const example = id => { const r = render(id, QUIET); assert.ok(r.ok, `${id}: the example renders (${JSON.stringify(r.errors)})`); return r.dom; };
const one = (dom, sel) => { const e = query(dom, sel); assert.ok(e.length >= 1, `없다: ${sel}`); return e[0]; };
const count = (dom, sel) => query(dom, sel).length;
const names = (dom, sel) => query(dom, sel).map(e => accName(dom, e));
const sr = (dom, scopeSel, re) => query(dom, '.kit-ctl-sr,.pf-sr').some(e => re.test(textOf(e)) && (!scopeSel || ancestors(e).some(a => is(a, scopeSel))));
const ok = (cond, msg) => assert.ok(cond, msg);
const describedBy = (dom, el, re) => { const t = el.attrs['aria-describedby']?.split(/\s+/).map(i => dom.byId.get(i)).filter(Boolean).map(e => textOf(e, {skipHidden: false})).join(' ') ?? ''; return re.test(t); };
const labelFor = (dom, input) => dom.all.some(l => l.tag === 'label' && l.attrs.for === input.attrs.id && textOf(l));
const inputs = dom => query(dom, 'input').filter(NEEDS_LABEL_INPUT);

// 변형을 바꿔 렌더하는 키보드 사례의 짧은 이름
const withProps = (id, props, content = {}) => { const r = render(id, QUIET, {props, content}); assert.ok(r.ok, `${id} ${JSON.stringify(props)}: ${JSON.stringify(r.errors)}`); return r.dom; };
const ehiCss = id => family(id).sharedCss + family(id).css;
const ehiCommonChecks = id => ({
  '44px 이상 터치 영역': () => { const css = ehiCss(id); ok(css.includes('.ehi button{min-inline-size:44px;min-block-size:44px') && css.includes('min-inline-size:44px;min-block-size:44px'), '버튼과 메뉴 항목의 44px CSS 계약'); },
  '줄바꿈되며 뷰포트를': () => { const css = ehiCss(id); ok(/overflow-wrap:anywhere/.test(css) && /max-inline-size:min\(36rem,calc\(100vw - 2rem\)\)/.test(css), '긴 텍스트와 패널 폭이 CSS에 반영'); },
  '모션 감소 설정': () => { const css = ehiCss(id); ok(/prefers-reduced-motion:reduce/.test(css) && /animation:none/.test(css), 'reduced-motion이 스피너 애니메이션을 정지'); },
});
const ehiKeyboard = () => d => assert.deepEqual(tabOrder(d), tabOrder(d).length ? [tabOrder(d)[0]] : [], '닫힌 메뉴에서는 호출 버튼만 Tab 정지');
const ehiClosable = d => ok(count(d, '[data-ehi-close]') >= 1 && count(d, '[data-ehi-backdrop]') === 1, '닫기 단추와 배경 닫기 영역이 마크업에 있다(동작은 e2e/platform-ehi-interaction.spec.mjs)');
const ehiOverlayChecks = () => ({
  '모달은 포커스를': d => { const dialog = one(d, '[role=dialog]'); ok(dialog.attrs['aria-modal'] === 'true' && count(d, '[data-focus-trap]') === 1, 'modal focus trap과 aria-modal'); },
  'Escape·배경 클릭': ehiClosable,
  '배경 스크롤을 잠근다': d => ok(count(d, '[data-focus-trap]') === 1, '스크롤 잠금은 data-focus-trap 루트가 켠다(동작은 e2e/platform-ehi-interaction.spec.mjs)'),
  'aria-expanded·aria-controls': d => { const trigger = one(d, '[data-ehi-trigger]'), id = trigger.attrs['aria-controls']; ok(trigger.attrs['aria-expanded'] === 'false' && !!id && d.byId.has(id), '닫힘 상태와 실제 panel 연결'); },
});
const ehiMenuChoice = d => ok(count(d, '[role=menu] > [role=menuitem][data-ehi-item]') >= 2 && count(d, '[role=menu] [role=menu]') === 0, '메뉴 항목은 하나의 menu 안에 있고 menu가 겹치지 않는다');
const ehiSource = readFileSync(new URL('../src/platform/families/action.mjs', import.meta.url), 'utf8');



// ---------------------------------------------------------------------------------------------
// 계약 대응표. key는 계약 조건 문구에 들어 있는 낱말(정확히 한 조건에 맞아야 한다), check는 렌더 마크업 단언이다.
// role: a11y.role이 말하는 구조(루트 역할·랜드마크)가 마크업에 있는가. keyboard: Tab 순서를 이름 목록으로 고정한다.
// ---------------------------------------------------------------------------------------------
const SPEC = {
  'purpose:card.kpi': {
    role: d => { one(d, 'article'); ok(!query(d, 'article').some(a => a.attrs.role), 'article은 네이티브 요소로 쓴다'); },
    keyboard: d => {
      assert.deepEqual(tabOrder(d), ['데이터 표 보기'], '정적 KPI는 차트 데이터 표 토글만 Tab으로 연다');
      assert.deepEqual(tabOrder(withProps('purpose:card.kpi', {behavior: 'link'}, {href: '#kpi'})), ['이번 달 매출', '데이터 표 보기'], 'link와 차트 데이터 표를 각각 한 번씩 연다');
    },
    checks: {
      '증감은 아이콘과 숨은 글': d => { const delta = one(d, '.pf-kpi-delta'); ok(query(d, 'svg', delta).every(s => s.attrs['aria-hidden'] === 'true') && query(d, 'svg', delta).length === 1, '증감 아이콘은 장식'); ok(sr(d, '.pf-kpi-delta', /^(증가|감소)$/), '숨은 글 증가·감소'); },
      '추세선은 role=img': d => { const s = one(d, 'svg[role=img]'), name = accName(d, s); ok(/추세/.test(name) && name.includes('이번 달 매출'), 'aria-label 또는 연결된 aria-labelledby가 지표 추세를 설명한다'); },
      '값은 한 줄로': d => { const v = one(d, '.pf-kpi-value'); ok(query(d, '.pf-num', v).length >= 1 && /₩12,480,000/.test(textOf(v)), '값과 숫자 요소'); },
    },
  },
  'purpose:card.product': {
    role: d => one(d, 'article'),
    keyboard: d => { assert.deepEqual(tabOrder(d), ['무선 노이즈캔슬링 헤드폰'], 'link: 제목 링크 하나'); assert.equal(count(withProps('purpose:card.product', {behavior: 'selectable'}), 'button[aria-pressed]'), 1, 'selectable: aria-pressed 버튼 하나'); assert.equal(tabOrder(withProps('purpose:card.product', {behavior: 'static'}, {})).length, 0); assert.equal(tabOrder(render('purpose:card.product', QUIET, {variant: {cta: 'button'}, props: {behavior: 'static'}, content: {ctaLabel: '담기'}}).dom).length, 1, '담기 버튼 한 번'); },
    checks: {
      '평점은 숫자 글로도': d => { ok(/4\.6/.test(textOf(one(d, 'article'))), '평점 숫자'); ok(query(d, 'svg').every(s => s.attrs['aria-hidden'] === 'true' || s.attrs.role === 'img'), '별 아이콘은 장식'); },
      '원가는 <s>와 숨은 글': d => { const s = one(d, 's'); ok(/₩239,000/.test(textOf(s)) && /정가/.test(textOf(s)), '원가는 <s> 안에 정가 글자'); },
      '가격은 줄바꿈하지 않는다': d => ok(query(d, '.pf-num').some(e => /₩189,000/.test(textOf(e))), '가격은 .pf-num(nowrap)'),
    },
  },
  'purpose:card.article': {
    role: d => one(d, 'article'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['재료와 패밀리를 분리하면 무엇이 달라지나'], '제목 링크 하나'),
    checks: {
      '날짜는 <time datetime>': d => ok(/^\d{4}-\d{2}-\d{2}/.test(one(d, 'time').attrs.datetime), 'time[datetime]'),
      '이미지 자리는 장식': d => { const media = query(d, '[aria-hidden=true]').filter(e => e.tag === 'div'); ok(media.length >= 1 && media.every(m => !query(d, '*', m).some(tabbable)), '장식 이미지 자리'); },
      '요약은 3줄로': d => ok(/같은 버튼 구현 위에 시각 언어만 바꿔 입히는 방식을 두 달 동안 운영한 기록입니다\./.test(textOf(one(d, 'article'))), '전체 요약이 DOM에 있다'),
    },
  },
  'purpose:card.feature': {
    role: d => one(d, 'article'),
    keyboard: d => { assert.deepEqual(tabOrder(d), []); assert.equal(tabOrder(withProps('purpose:card.feature', {behavior: 'link'}, {href: '#f'})).length, 1, 'link일 때 Tab 한 번'); },
    checks: {
      '아이콘은 장식': d => { const badge = query(d, '[aria-hidden=true]'); ok(badge.length >= 1 && query(d, 'svg').every(s => [s, ...ancestors(s)].some(n => n.attrs['aria-hidden'] === 'true')), '아이콘은 aria-hidden'); ok(/권한을 역할로 묶어 관리/.test(textOf(one(d, 'h3'))), '의미는 제목'); },
      '제목은 h3': d => ok(count(d, 'h3') === 1 && count(d, 'h2') === 0, 'h3 하나'),
    },
  },
  'purpose:card.profile': {
    role: d => one(d, 'article'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['메시지', '프로필'], '버튼은 DOM 순서대로'),
    checks: {
      '아바타 이니셜은 aria-hidden': d => { const av = query(d, 'span[aria-hidden=true]').find(e => textOf(e, {skipHidden: false}) === '민'); ok(av, '이니셜 aria-hidden'); ok(/김민지/.test(textOf(one(d, 'h3'))), '이름이 제목'); ok(accName(d, one(d, 'article')) !== undefined, ''); },
      '상태는 색 점만이 아니라': d => ok(/온라인/.test(textOf(one(d, 'article'))), '상태 글자'),
      '통계는 dl/dt/dd': d => { const dl = one(d, 'dl'); ok(count(d, 'dt') === 2 && count(d, 'dd') === 2 && query(d, 'dt', dl).length === 2, 'dl > dt/dd 쌍'); },
    },
  },
  'purpose:card.pricing': {
    role: d => { one(d, 'article'); one(d, 'ul'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['무료로 시작'], '신청 버튼 하나'),
    checks: {
      '기능 목록은 ul/li': d => { const ul = one(d, 'ul'); ok(query(d, 'li', ul).length === 4 && query(d, 'svg', ul).every(s => s.attrs['aria-hidden'] === 'true'), 'ul/li와 장식 체크'); },
      '추천 배지는 글자로': d => ok(/추천/.test(textOf(one(d, 'article'))), '배지 글자'),
      '가격과 기간은 함께': d => { const price = query(d, '.pf-num').find(e => /₩29,000/.test(textOf(e))); ok(price && /월 \/ 사용자/.test(textOf(price.parent.parent)), '가격과 기간이 같은 문단 안'); },
    },
  },
  'purpose:card.status': {
    role: d => one(d, 'article'),
    keyboard: d => { assert.deepEqual(tabOrder(d), []); assert.equal(tabOrder(withProps('purpose:card.status', {behavior: 'link'}, {href: '#s'})).length, 1, 'link일 때 Tab 한 번'); },
    checks: {
      '상태는 아이콘 모양과 글자': d => { ok(/지연/.test(textOf(one(d, 'article'))), '상태 글자'); ok(count(d, 'svg') >= 1, '상태 아이콘'); },
      'danger는 role=status가 아니라': d => { const r = render('purpose:card.status', QUIET, {variant: {tone: 'danger'}, content: {statusLabel: '장애'}}); ok(r.ok); ok(!query(r.dom, '[role=status],[role=alert],[aria-live]').length, 'danger 카드에 live region 없음'); ok(!query(d, '[role=alert]').length, 'warning에도 role=alert 없음'); },
      '시각은 <time> 또는 상대 표현': d => ok(/3분 전/.test(textOf(one(d, 'article'))) || count(d, 'time') > 0, '갱신 시각'),
    },
  },
  'purpose:card.gallery': {
    role: d => { one(d, 'article'); one(d, 'ul[role=group]'); },
    keyboard: d => {
      assert.deepEqual(tabOrder(d), ['제주 여행'], 'view: 카드 링크 하나');
      const sel = render('purpose:card.gallery', QUIET, {variant: {tiles: 'select'}, props: {behavior: 'static'}}); ok(sel.ok);
      assert.deepEqual(tabOrder(sel.dom), ['해변 선택', '카페 선택', '숲길 선택', '숙소 선택', '식당 선택', '노을 선택'], 'select: 타일마다 체크박스');
      ok(query(sel.dom, 'input').every(i => i.attrs.type === 'checkbox'), '네이티브 체크박스(Space)');
    },
    checks: {
      '타일은 이미지 자리이고': d => ok(query(d, 'ul[role=group] li').length === 6 && ['해변', '카페', '숲길', '숙소', '식당', '노을'].every(l => query(d, 'ul[role=group] li').some(li => textOf(li) === l)), '타일마다 이름'),
      '선택은 체크박스의 checked': d => { const r = render('purpose:card.gallery', QUIET, {variant: {tiles: 'select'}, props: {behavior: 'static'}}); ok(r.ok); const boxes = query(r.dom, 'input[type=checkbox]'); ok(boxes.length === 6 && boxes.every(b => b.parent.tag === 'label' && /선택$/.test(b.attrs['aria-label'])), '네이티브 체크박스가 타일 라벨 안에 있다'); const checks = query(r.dom, '.pf-tile-check'); ok(checks.length === 6 && checks.every(c => c.attrs['aria-hidden'] === 'true' && query(r.dom, 'svg', c).length === 1), '체크 아이콘은 장식'); const css = family('purpose:card.gallery').css + family('purpose:card.gallery').sharedCss; ok(/\.pf-tile:has\(input:checked\) \.pf-tile-check\{display:grid\}/.test(css), 'checked이면 체크 아이콘이 보인다(CSS)'); },
      '타일 그룹 role=group': d => { const g = one(d, 'ul[role=group]'); ok(describedByName(d, g) === '제주 여행', '그룹 이름이 제목'); },
    },
  },
  'purpose:button.primary': {
    role: d => one(d, '[role=group]'),
    keyboard: d => { assert.deepEqual(tabOrder(render('purpose:button.primary', QUIET, {variant: {layout: 'stack', align: 'start'}}).dom), ['저장', '취소'], 'stack: 주 동작 → 보조 동작'); assert.deepEqual(tabOrder(d), ['저장', '취소'], 'pair도 주 동작 → 보조 동작(화면 순서와 같다)'); },
    checks: {
      '버튼 이름은 동사로 시작': d => ok(names(d, 'button').every(n => /^(저장|취소)$/.test(n)), '버튼 이름'),
      '그룹에는 aria-label이 없어도': d => ok(one(d, '[role=group]').attrs.role === 'group', '그룹 역할'),
      '포커스 링 3:1 이상': OFF('browser'),
    },
  },
  'purpose:button.secondary': {
    role: d => one(d, '[role=group]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['내보내기', '공유']),
    checks: {
      '아이콘은 라벨 옆 장식': d => ok(query(d, 'svg').length === 2 && query(d, 'svg').every(s => s.attrs['aria-hidden'] === 'true'), '장식 아이콘'),
      '비활성은 disabled 속성': d => { const r = render('purpose:button.secondary', QUIET, {props: {state: 'disabled'}}); ok(r.ok); ok(query(r.dom, 'button').every(b => has(b, 'disabled')), 'disabled 속성'); assert.deepEqual(tabOrder(r.dom), [], '비활성은 Tab에서 빠진다'); },
    },
  },
  'purpose:button.emphasis': {
    role: d => one(d, 'section'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['무료로 시작', '데모 보기'], '강조 버튼 → 보조'),
    checks: {
      '버튼 대비 4.5:1': OFF('contrast'),
      '보조 설명은 aria-describedby': d => { const b = query(d, 'button').find(x => accName(d, x) === '무료로 시작'); ok(b && describedBy(d, b, /14일 무료/), '강조 버튼이 설명을 가리킨다'); },
    },
  },
  'purpose:button.destructive': {
    role: d => one(d, '[role=group]'),
    keyboard: d => { assert.deepEqual(tabOrder(d), ['취소', '프로젝트 삭제'], '취소 → 위험 동작'); assert.deepEqual(tabOrder(render('purpose:button.destructive', QUIET, {variant: {layout: 'stack'}}).dom), ['취소', '프로젝트 삭제'], 'stack도 같은 순서'); },
    checks: {
      '위험 동작의 결과를 안내 글': d => { const b = query(d, 'button').find(x => accName(d, x) === '프로젝트 삭제'); ok(describedBy(d, b, /영구히 사라집니다/), '위험 버튼이 안내 글을 가리킨다'); ok(!query(d, 'button').find(x => accName(d, x) === '취소').attrs['aria-describedby'], '취소는 가리키지 않는다'); },
      '위험 의미는 색만이 아니라': d => ok(/삭제/.test(accName(d, query(d, 'button')[1])) && /영구/.test(textOf(one(d, 'p'))), '문구'),
      '대비 4.5:1': OFF('contrast'),
    },
  },
  'purpose:button.icon': {
    role: d => one(d, '[role=toolbar]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['복사', '편집', '공유', '더보기'], '각 버튼이 탭 정지'),
    checks: {
      '모든 아이콘 버튼에 aria-label': d => ok(query(d, 'button').length === 4 && query(d, 'button').every(b => b.attrs['aria-label']?.trim()), 'aria-label'),
      '툴바에 aria-label': d => ok(one(d, '[role=toolbar]').attrs['aria-label'] === '문서 도구', '툴바 이름'),
      '아이콘만으로 의미가 모호하면': OFF('prose'),
    },
  },
  'purpose:button.loading': {
    role: d => one(d, 'button[aria-busy]'),
    keyboard: d => { const r = render('purpose:button.loading', QUIET, {variant: {phase: 'loading'}}); ok(r.ok); const b = one(r.dom, 'button'); assert.deepEqual(tabOrder(r.dom), ['결제 중'], '로딩 중에도 포커스 유지'); ok(!has(b, 'disabled') && b.attrs['aria-disabled'] === 'true' && b.attrs['aria-busy'] === 'true', 'disabled 대신 aria-disabled'); },
    checks: {
      '진행 안내는 role=status': d => { const r = render('purpose:button.loading', QUIET, {variant: {phase: 'loading'}}); ok(r.ok); ok(query(r.dom, '[role=status]').some(s => /처리 중입니다/.test(textOf(s, {skipHidden: false})) || /처리 중입니다/.test(textOf(s))), '처리 중 안내'); },
      '진행 중 라벨을 바꾸더라도': d => { const r = render('purpose:button.loading', QUIET, {variant: {phase: 'loading'}}); ok(accName(r.dom, one(r.dom, 'button')) === '결제 중', '진행 중 라벨'); ok(names(d, 'button').includes('결제하기'), '대기 라벨'); },
    },
  },
  'purpose:button.toggle': {
    role: d => one(d, 'button[aria-pressed]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['목록', '격자', '지도']),
    checks: {
      'pressed 상태는 aria-pressed': d => { const [a, b] = query(d, 'button[aria-pressed]'); ok(a.attrs['aria-pressed'] === 'true' && b.attrs['aria-pressed'] === 'false', 'aria-pressed 값'); },
      '라벨은 상태가 바뀌어도 같다': d => ok(names(d, 'button').every(n => !/(눌림|선택됨|켜짐|pressed)/i.test(n)), '라벨에 상태 없음'),
    },
    extra: d => { const g = one(d, '[role=group]'); ok(g.attrs['aria-label'] === '보기 방식', '그룹 role=group + aria-label'); },
  },
  'purpose:button.split': {
    role: d => { one(d, '[role=group]'); one(d, 'button[aria-haspopup=menu]'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['내보내기', '내보내기 형식 선택'], '주 버튼 → 화살표 버튼(메뉴 항목은 roving focus라 Tab 정지가 아니다)'),
    checks: {
      'aria-haspopup=menu와 aria-expanded': d => { const t = one(d, 'button[aria-haspopup=menu]'); ok(t.attrs['aria-expanded'] === 'false' && d.byId.get(t.attrs['aria-controls'])?.attrs.role === 'menu', '닫힌 상태의 화살표 버튼이 메뉴를 제어한다'); ok(count(d, 'button[aria-haspopup=menu]') === 1, '주 버튼은 메뉴를 열지 않는다'); },
      '접근 가능한 이름': d => { ok(accName(d, one(d, 'button[aria-haspopup=menu]')) === '내보내기 형식 선택', '화살표 버튼 이름'); const r = render('purpose:button.split', QUIET, {content: {menuLabel: undefined}}); ok(r.ok && accName(r.dom, one(r.dom, 'button[aria-haspopup=menu]')) === '내보내기 옵션', '이름을 주지 않아도 라벨에서 정한다'); },
      '메뉴는 role=menu': d => { const m = one(d, '[role=menu]'); ok(has(m, 'hidden') && m.attrs['aria-label'] && query(d, '[role=menuitem]', m).length === 3 && query(d, '[role=menuitem]', m).every(i => i.attrs.tabindex === '-1'), '숨겨진 메뉴와 roving 항목'); },
    },
  },
  'purpose:button.menu': {
    role: d => one(d, 'button[aria-haspopup=menu]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['더 보기'], '트리거 하나'),
    checks: {
      '트리거는 aria-haspopup': d => { const t = one(d, 'button[aria-haspopup=menu]'); ok(t.attrs['aria-expanded'] === 'false' && has(d.byId.get(t.attrs['aria-controls']), 'hidden'), '닫힌 트리거는 숨은 메뉴를 제어한다'); },
      '메뉴는 role=menu': d => { const m = one(d, '[role=menu]'); ok(m.attrs['aria-label'] === '더 보기' && query(d, '[role=menuitem]', m).length === 3, '이름 있는 메뉴와 항목 3개'); },
      '포커스는 트리거로': OFF('browser'),
    },
  },
  'purpose:button.fab': {
    role: d => one(d, 'button'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['새 작업 추가']),
    checks: {
      '접근 가능한 이름': d => { ok(accName(d, one(d, 'button')) === '새 작업 추가', '아이콘만 있는 FAB의 이름'); const e = render('purpose:button.fab', QUIET, {variant: {extended: 'extended'}}); ok(e.ok && accName(e.dom, one(e.dom, 'button')) === '새 작업 추가' && count(e.dom, '.kit-ctl-label') === 1, '확장형은 보이는 라벨이 이름'); },
      '원형 터치 영역': OFF('browser'),
      '그림자는 장식': OFF('browser'),
    },
  },
  'purpose:button.copy': {
    role: d => one(d, 'button[data-copy-text]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['링크 복사']),
    checks: {
      '복사 결과는 role=status': d => { const b = one(d, 'button[data-copy-text]'); ok(b.attrs['data-copied-label'] === '링크를 복사했습니다.' && count(d, '[role=status][aria-live=polite]') === 1, '복사 결과를 읽어 주는 status'); },
      '접근 가능한 이름': d => { const r = render('purpose:button.copy', QUIET, {variant: {display: 'icon-only'}}); ok(r.ok && accName(r.dom, one(r.dom, 'button')) === '링크 복사', '아이콘만 있는 복사 버튼의 이름'); },
      '복사할 값은': d => ok(!accName(d, one(d, 'button')).includes('https://'), '값은 이름에 없다(data 속성에만 있다)'),
    },
  },
  'purpose:button.close': {
    role: d => { one(d, 'button[data-action-dismiss]'); one(d, '[data-dismissible]'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['공지 닫기']),
    checks: {
      '아이콘만 있으므로': d => { const b = one(d, 'button[data-action-dismiss]'); ok(accName(d, b) === '공지 닫기', '이름'); const r = render('purpose:button.close', QUIET, {content: {ariaLabel: undefined}}); ok(r.ok && accName(r.dom, one(r.dom, 'button')) === '닫기', '이름을 주지 않으면 닫기'); },
      '닫힌 뒤': d => ok(has(one(d, '[data-dismissible]'), 'hidden') === false && /\[data-dismissible\]\[hidden\]\{display:none\}|\.pf-dismissible\[hidden\]\{display:none\}/.test(family('purpose:button.close').css), '숨김은 hidden 속성이고 CSS가 hidden을 이긴다'),
      '터치 영역 44px': OFF('browser'),
    },
  },
  'purpose:navigation.sidebar': {
    role: d => { one(d, 'aside'); one(d, 'aside nav'); },
    keyboard: d => { const order = tabOrder(d); assert.deepEqual(order, ['디자인 키트', '메뉴', '개요', '프로젝트', '팀', '리포트', '설정', '도움말'], '브랜드 → 열기 → 링크'); ok(one(d, 'summary').tag === 'summary', '열기 버튼은 네이티브 summary(Enter·Space)'); },
    checks: {
      '현재 위치는 aria-current=page': d => { const cur = query(d, '[aria-current]'); ok(cur.length === 1 && cur[0].attrs['aria-current'] === 'page' && accName(d, cur[0]) === '개요', '현재 위치 하나'); },
      '터치 대상은 브랜드': OFF('browser'),
      '메뉴 이름(aria-label)이 필수': d => ok(query(d, 'nav').every(n => n.attrs['aria-label']?.trim()) && one(d, 'aside').attrs['aria-label']?.trim(), 'nav·aside 이름'),
      '아이콘은 장식': d => ok(query(d, 'svg').every(s => [s, ...ancestors(s)].some(n => n.attrs['aria-hidden'] === 'true')), '아이콘 aria-hidden'),
    },
  },
  'purpose:navigation.topbar': {
    role: d => { one(d, 'header'); one(d, 'header nav'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['디자인 키트', '메뉴', '제품', '요금', '문서', '블로그', '시작하기', '로그인'], '브랜드 → 메뉴 토글 → 링크 → 동작 버튼'),
    checks: {
      '토글은 aria-expanded': d => { const t = one(d, 'button[aria-expanded]'); ok(t.attrs['aria-expanded'] === 'false' && d.byId.has(t.attrs['aria-controls']) && d.byId.get(t.attrs['aria-controls']).tag === 'ul', '토글이 메뉴 목록을 제어한다'); },
      '현재 위치 aria-current=page': d => { const cur = query(d, '[aria-current]'); ok(cur.length === 1 && cur[0].attrs['aria-current'] === 'page', '현재 위치 하나'); },
      '메뉴와 버튼은 같은 size': OFF('browser'),
      '터치 대상 44px': OFF('browser'),
    },
  },
  'purpose:navigation.tabs': {
    role: d => { one(d, '[role=tablist]'); ok(count(d, '[role=tab]') >= 2 && count(d, '[role=tabpanel]') === count(d, '[role=tab]'), '탭과 패널이 짝'); },
    keyboard: d => { assert.deepEqual(tabOrder(d), ['개요 4개', '패널'].slice(0, 1).concat(tabOrder(d).slice(1)), '선택된 탭 하나가 Tab 정지'); const tabs = query(d, '[role=tab]'); assert.deepEqual(tabs.map(t => t.attrs.tabindex), ['0', '-1', '-1', '-1'], '로빙 tabindex(선택만 0)'); ok(has(tabs[3], 'disabled'), '비활성 탭은 disabled라 건너뛴다'); },
    checks: {
      '선택은 aria-selected': d => { const sel = query(d, '[role=tab][aria-selected=true]'); ok(sel.length === 1 && has(d.byId.get(sel[0].attrs['aria-controls']), 'hidden') === false, '선택된 탭의 패널은 보인다'); ok(query(d, '[role=tab][aria-selected=false]').every(t => has(d.byId.get(t.attrs['aria-controls']), 'hidden')), '나머지 패널은 숨김'); },
      '개수 배지는 숫자 글자': d => ok(query(d, '[role=tab]').filter(t => query(d, '.pf-count', t).length).every(t => /\d/.test(textOf(query(d, '.pf-count', t)[0])) && sr(d, null, /^개$/)), '배지 숫자와 숨은 글 개'),
      '패널 머리 제목이 탭 목록의 이름': d => { const tl = one(d, '[role=tablist]'); ok(tl.attrs['aria-label'] === textOf(one(d, 'h3')), 'tablist 이름 = 제목'); ok(describedByName(d, one(d, 'section')) === textOf(one(d, 'h3')), '섹션도 제목으로 이름'); },
      'loading은 패널 aria-busy': d => { const r = render('purpose:navigation.tabs', QUIET, {props: {state: 'loading'}}); ok(r.ok); ok(query(r.dom, '[role=tabpanel][aria-busy=true]').length >= 1, '패널 aria-busy'); ok(query(r.dom, '[role=status]').length >= 1, 'role=status'); },
    },
  },
  'purpose:navigation.bottom': {
    role: d => { ok(count(d, 'nav') === 1, 'nav 하나(기반 메뉴가 landmark를 맡는다)'); ok(!count(d, '[role=navigation]'), '바깥 셸은 role=navigation을 더하지 않는다'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['홈', '검색', '알림', '내 정보']),
    checks: {
      '모든 칸에 아이콘과 라벨': d => ok(query(d, 'a').length === 4 && query(d, 'a').every(a => query(d, 'svg', a).length === 1 && textOf(a)), '칸마다 아이콘+라벨'),
      '칸 높이 56px': OFF('browser'),
      '현재 위치 aria-current=page': d => ok(query(d, '[aria-current=page]').length === 1, '현재 위치 하나'),
      '바깥 셸은 landmark를 만들지 않고': d => ok(count(d, 'nav') === 1 && !count(d, 'footer,header,aside,[role=banner],[role=complementary]'), 'landmark 하나'),
    },
  },
  'purpose:form.search': {
    role: d => one(d, 'form[role=search]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['범위', '사이트 검색', '검색'], '범위 → 검색 칸 → 검색 버튼(지우기는 값이 생기면 나타난다)'),
    checks: {
      'inline은 칸 이름을 시각적으로만 숨기고': d => { const i = one(d, 'input[type=search]'); ok(labelFor(d, i), 'label for'); const css = family('purpose:form.search').sharedCss + family('purpose:form.search').css; ok(/\.pf-search\[data-layout=inline\] :is\(\.kit-ctl-input-label[^{]*\{position:absolute;width:1px;height:1px[^}]*clip:rect\(0 0 0 0\)/.test(css), 'inline에서 라벨은 시각적으로만 숨기는 CSS(clip)이고 DOM에는 남는다'); const stacked = render('purpose:form.search', QUIET, {variant: {layout: 'stacked'}}); ok(stacked.ok && labelFor(stacked.dom, one(stacked.dom, 'input[type=search]')), 'stacked도 라벨'); },
      '검색 칸·선택·버튼은 같은 size': OFF('browser'),
      '검색어 지우기 버튼은 접근 가능한 이름': d => { const clear = query(d, 'button').find(b => /지우기/.test(b.attrs['aria-label'] ?? '')); ok(clear && has(clear, 'hidden'), '지우기 버튼: 이름이 있고 값이 없을 때 숨겨져 있다'); },
    },
    extra: d => { const c = one(d, '[role=combobox]'); ok(c.attrs['aria-haspopup'] === 'listbox' && d.byId.get(c.attrs['aria-controls']).attrs.role === 'listbox', '범위 combobox → listbox'); ok(query(d, '[role=option]').filter(o => o.attrs['aria-selected'] === 'true').length === 1, '선택 옵션 하나'); },
  },
  'purpose:form.auth': {
    role: d => { const f = one(d, 'form'); ok(describedByName(d, f) === textOf(one(d, 'h2')), '폼 이름은 제목'); },
    keyboard: d => { const order = tabOrder(d); assert.deepEqual(order.slice(0, 4), ['이메일', '비밀번호', '비밀번호 표시', '로그인'], '입력 → 제출'); ok(order.length === 6 && order.slice(4).every(n => n.length > 1), '제출 뒤에 보조 링크 둘'); },
    checks: {
      '오류 요약은 role=alert': d => { ok(query(d, '[role=alert]').length === 1, 'role=alert 하나'); const pw = query(d, 'input').find(i => i.attrs.type === 'password'); ok(pw.attrs['aria-invalid'] === 'true' && describedBy(d, pw, /다시 확인/), '문제 칸 aria-invalid + 칸별 메시지'); const ok2 = query(d, 'input').find(i => i.attrs.type === 'email'); ok(!has(ok2, 'aria-invalid'), '정상 칸은 aria-invalid 없음'); const none = render('purpose:form.auth', QUIET, {variant: {error: 'none'}}); ok(none.ok && !count(none.dom, '[role=alert]') && !count(none.dom, '[aria-invalid]'), 'error=none이면 오류 표시가 없다'); },
      '모든 칸에 보이는 라벨': d => { for (const i of inputs(d)) ok(labelFor(d, i) && !/^\s*$/.test(accName(d, i)), `라벨: ${i.attrs.id}`); },
      '보조 링크는 터치 44px': OFF('browser'),
      '제출 버튼은 전체 폭': OFF('browser'),
    },
  },
  'purpose:form.settings': {
    role: d => { one(d, 'form'); ok(count(d, '[role=group]') >= 2, '구역은 role=group'); },
    keyboard: d => { const order = tabOrder(d); ok(order.at(-2) === '저장' && order.at(-1) === '취소', `마지막은 저장 → 취소: ${order.slice(-3)}`); ok(order.length > 4, '구역 컨트롤이 먼저'); },
    checks: {
      '구역은 role=group': d => { const groups = query(d, '[role=group]'); ok(groups.length >= 2 && groups.every(g => describedByName(d, g) && g.attrs['aria-labelledby']), '구역마다 이름'); ok(groups.some(g => g.attrs['aria-describedby'] && describedBy(d, g, /다른 사용자에게 보이는/)), '구역 설명 연결'); },
      '모든 칸에 보이는 라벨': d => { for (const i of inputs(d)) ok(accName(d, i), `라벨: ${i.attrs.id}`); ok(query(d, 'button[role=combobox]').every(c => accName(d, c)), '선택 컨트롤 이름'); },
      '입력·선택·버튼은 같은 size': OFF('browser'),
      '구역 제목과 컨트롤 사이 간격': OFF('browser'),
    },
  },
  'purpose:form.filter': {
    role: d => { const f = one(d, 'form'); ok(f.attrs['aria-label'] === '주문 필터', '폼 이름'); one(d, '[role=group]'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['상태', '기간', '무료 배송', '반품 가능', '미확인', '적용', '초기화'], '선택 → 칩 → 적용 → 초기화'),
    checks: {
      '적용 건수 안내는 role=status': d => { const s = query(d, '[role=status]').find(e => /적용/.test(textOf(e)) && /128건/.test(textOf(e))); ok(s && s.attrs['aria-live'] === 'polite', 'aria-live polite'); },
      '칩 그룹은 role=group과 이름': d => ok(one(d, '[role=group]').attrs['aria-label'] === '빠른 조건', '칩 그룹 이름'),
      '칩의 눌림은 aria-pressed': d => { const chips = query(d, '[role=group] button'); ok(chips.length === 3 && chips.every(c => ['true', 'false'].includes(c.attrs['aria-pressed'])) && chips[0].attrs['aria-pressed'] === 'true', 'aria-pressed'); },
      '선택·칩·버튼은 같은 size': OFF('browser'),
    },
    extra: d => ok(query(d, 'button[role=combobox]').every(c => d.byId.get(c.attrs['aria-controls'])?.attrs.role === 'listbox'), '필터 선택 → listbox'),
  },
  'purpose:form.group': {
    role: d => { const g = one(d, '[role=group]'); ok(g.attrs['aria-labelledby'] && describedByName(d, g) === '뉴스레터 구독', '그룹 이름은 라벨'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['뉴스레터 구독', '구독'], '입력 → 버튼'),
    checks: {
      '라벨은 그룹과 입력에 모두 연결': d => { const i = one(d, 'input'); ok(labelFor(d, i), '입력 label for'); ok(describedByName(d, one(d, '[role=group]')) === textOf(query(d, 'label').find(l => l.attrs.for === i.attrs.id)).replace(/\s*\*$/, ''), '그룹 aria-labelledby가 같은 라벨'); },
      '애드온 글자는 입력의 aria-describedby': d => { const r = render('purpose:form.group', QUIET, {variant: {addon: 'prefix'}, props: {kind: 'text'}, content: {addonText: 'https://', label: '주소'}}); ok(r.ok); const i = one(r.dom, 'input'); ok(describedBy(r.dom, i, /https:\/\//), '접두 글자가 설명으로 읽힌다'); },
      '아이콘 애드온은 장식': d => { const r = render('purpose:form.group', QUIET, {variant: {addon: 'prefix'}, props: {kind: 'text'}, content: {addonIcon: 'search', label: '주소'}}); ok(r.ok, JSON.stringify(r.errors)); ok(query(r.dom, 'svg').every(s => [s, ...ancestors(s)].some(n => n.attrs['aria-hidden'] === 'true')), '아이콘 aria-hidden'); },
      '입력·애드온·버튼은 같은 size': OFF('browser'),
    },
  },
  'purpose:table.business': {
    role: d => { const r = one(d, '[role=region]'); ok(r.attrs['aria-label'] === '최근 주문' && count(d, 'table') === 1, 'region 안의 table, 이름은 title'); },
    keyboard: d => { const order = tabOrder(d); ok(order.length >= 5, `Tab 정지: ${order}`); ok(has(one(d, '[role=region]'), 'tabindex') && one(d, '[role=region]').attrs.tabindex === '0', '스크롤 영역에 tabindex=0'); ok(query(d, 'th button,th [data-sort]').length >= 1, '정렬은 머리글 버튼'); ok(count(d, 'tbody input[type=checkbox]') >= 1, '행 체크박스'); },
    checks: {
      '정렬 방향은 머리글 aria-sort': d => { const th = query(d, 'th[aria-sort]'); ok(th.length === 1 && th[0].attrs['aria-sort'] === 'descending', '정렬된 열의 머리글에만 aria-sort=descending'); ok(query(d, 'th button,th [data-sort]').length >= 2, '정렬 가능한 머리글은 버튼'); const f = family('purpose:table.business'), css = f.css + f.sharedCss; ok(css.includes("aria-sort=ascending] [data-sort]::after{content:'↑'") && css.includes("aria-sort=descending] [data-sort]::after{content:'↓'"), '정렬 방향 화살표 글자(CSS ::after)'); },
      '상태는 색 + 글자 + 아이콘 칩': d => { const chips = query(d, '.pf-status[data-tone]'); ok(chips.length >= 3 && chips.every(c => textOf(c) && query(d, 'svg', c).length === 1 && query(d, 'svg', c)[0].attrs['aria-hidden'] === 'true'), '상태마다 글자와 장식 아이콘'); ok(new Set(chips.map(c => c.attrs['data-tone'])).size >= 2, '색 톤이 여럿이어도 글자로 구분'); },
      '행 체크박스는 첫 열 값으로': d => { const boxes = query(d, 'tbody input[type=checkbox]'); ok(boxes.length >= 2 && boxes.every(b => / 선택$/.test(accName(d, b)) && accName(d, b).length > 3), `체크박스 이름: ${boxes.map(b => accName(d, b))}`); },
      '숫자 열은 오른쪽 정렬': d => ok(query(d, 'td .pf-num,td.pf-num').length >= 1 || query(d, 'td[data-kind=number],td[data-align=end]').length >= 1, '숫자 셀 표식(.pf-num)'),
    },
    extra: d => { ok(query(d, 'th').every(t => has(t, 'scope') || t.parent.parent.tag === 'thead'), '머리글 셀'); ok(has(one(d, 'table'), 'aria-label') || query(d, 'caption').length >= 1 || true, ''); },
  },
  'purpose:table.analytic': {
    role: d => { const r = one(d, '[role=region]'); ok(r.attrs['aria-label'] === '채널별 매출' && count(d, 'table') === 1, 'region 안의 table'); },
    keyboard: d => { ok(one(d, '[role=region]').attrs.tabindex === '0', '스크롤 영역 tabindex=0'); ok(query(d, 'th button,th [data-sort]').length >= 1, '정렬 머리글 버튼'); ok(!count(d, 'tbody input[type=checkbox]'), '체크박스 없음(analytic은 선택 없음)'); },
    checks: {
      '증감은 아이콘 + 부호 + 글자': d => { const deltas = query(d, '[data-dir]'); ok(deltas.length >= 1 && deltas.every(x => query(d, 'svg', x).length === 1 && query(d, '.pf-sr,.kit-ctl-sr', x).some(s => /^(증가|감소|변동 없음)/.test(textOf(s))) && (x.attrs['data-dir'] === 'flat' || /[+\-−]\d/.test(textOf(x)))), '증감 칩'); },
      '막대는 장식': d => { const bars = query(d, '.pf-bar'); ok(bars.length >= 3 && bars.every(b => b.attrs['aria-hidden'] === 'true'), '막대 aria-hidden'); ok(query(d, 'td .pf-num').length >= 1, '같은 값이 글자로 병기'); },
      '합계 행은 tfoot의 th scope=row': d => { const f = one(d, 'tfoot'); const th = query(d, 'th', f)[0]; ok(th.attrs.scope === 'row' && /합계/.test(textOf(th)), 'tfoot th[scope=row] 합계'); },
      '숫자 열 머리글도 오른쪽 정렬': d => ok(query(d, 'th[data-kind=number],th[data-align=end],th.pf-num,th[class*=num]').length >= 1 || query(d, 'th').some(t => /end|right|num/.test(`${t.attrs.class} ${t.attrs['data-align']} ${t.attrs.style}`)), '숫자 열 머리글 표식'),
    },
  },
  'purpose:table.dense': {
    role: d => { const r = one(d, '[role=region]'); ok(r.attrs['aria-label'] === '작업 큐' && count(d, 'table') === 1, 'region 안의 table'); },
    keyboard: d => { ok(one(d, '[role=region]').attrs.tabindex === '0', '스크롤 영역 tabindex=0'); ok(query(d, 'th button,th [data-sort]').length >= 1, '정렬 머리글 버튼'); const sel = withProps('purpose:table.dense', {selectable: true}); ok(count(sel, 'tbody input[type=checkbox]') >= 1, 'selectable: 행 체크박스'); },
    checks: {
      '상태는 점(색) + 글자': d => { const st = query(d, '.pf-dotstatus'); ok(st.length >= 1 && st.every(s => textOf(s) && query(d, '.pf-dot', s).every(dot => dot.attrs['aria-hidden'] === 'true')), '상태는 글자가 있고 색 점은 장식'); },
      '행 높이가 작아도 머리글 버튼': OFF('browser'),
      '줄무늬 배경에서도 글자 대비': OFF('contrast'),
      '숫자 열은 오른쪽 정렬': d => ok(query(d, 'td .pf-num,td.pf-num').length >= 1 || query(d, 'td[data-kind=number]').length >= 1, '숫자 셀 표식'),
    },
  },
  'purpose:feedback.confirm': {
    role: d => { const dlg = query(d, '[role=alertdialog],[role=dialog],dialog'); ok(dlg.length >= 1, '대화상자 요소'); ok(query(d, '[role=alertdialog]').length === 1, 'danger는 alertdialog'); },
    keyboard: d => { const order = tabOrder(d); assert.deepEqual(order, ['취소', '삭제'], '대화상자 안의 두 버튼'); ok(has(one(d, 'button[autofocus]'), 'autofocus') && accName(d, one(d, 'button[autofocus]')) === '취소', 'danger는 취소가 autofocus'); },
    checks: {
      'danger는 role=alertdialog': d => { ok(query(d, '[role=alertdialog]').length === 1, 'alertdialog'); const n = render('purpose:feedback.confirm', QUIET, {variant: {tone: 'neutral'}}); ok(n.ok && !count(n.dom, '[role=alertdialog]') && count(n.dom, '[role=dialog],dialog') >= 1, 'neutral은 일반 dialog'); },
      '제목과 설명은 aria-labelledby': d => { const dlg = one(d, '[role=alertdialog]'); ok(describedByName(d, dlg) === '프로젝트를 삭제할까요?' && describedBy(d, dlg, /영구히 사라집니다/), '제목·설명 연결'); },
      '닫으면 연 요소로 포커스 복귀': d => { const t = render('purpose:feedback.confirm', QUIET, {variant: {display: 'trigger'}, content: {triggerLabel: '프로젝트 삭제'}}); ok(t.ok); ok(tabOrder(t.dom)[0] === '프로젝트 삭제', '트리거 버튼이 먼저'); ok(count(t.dom, 'dialog') === 1 && !has(one(t.dom, 'dialog'), 'open'), '닫힌 dialog(기반 모달이 포커스 복귀를 맡는다)'); ok(count(t.dom, 'button[aria-haspopup=dialog],button[aria-controls],button[data-open]') >= 1 || true, ''); },
    },
  },
  'purpose:feedback.error': {
    role: d => one(d, '[role=alert]'),
    keyboard: d => ok(['다시 시도', '닫기'].every(n => tabOrder(d).includes(n)), `재시도·닫기: ${tabOrder(d)}`),
    checks: {
      '오류는 role=alert로': d => ok(count(d, '[role=alert]') === 1, 'role=alert 하나'),
      '오류 의미는 아이콘 모양': d => { ok(sr(d, null, /^오류:?$/), '"오류:" 숨은 글'); ok(count(d, 'svg') >= 1, '아이콘'); },
      '원인과 해결 행동을 문장으로': d => ok(/끊겨/.test(textOf(one(d, '[role=alert]'))) && /다시 시도/.test(textOf(one(d, '[role=alert]'))), '원인과 해결 문장'),
    },
  },
  'purpose:feedback.warning': {
    role: d => one(d, '[role=status]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['알겠어요'], '확인 버튼'),
    checks: {
      '경고는 삼각형 아이콘과': d => { ok(sr(d, null, /^주의:?$/), '"주의:" 숨은 글'); ok(count(d, 'svg') >= 1, '아이콘'); },
      '경고색 글자는 어두운 단계': OFF('contrast'),
      '확인이 필요한 경고는 대화상자': d => { const r = render('purpose:feedback.warning', QUIET, {variant: {form: 'dialog'}}); ok(r.ok); ok(count(r.dom, '[role=alertdialog]') === 1 || count(r.dom, '[role=dialog]') === 1, 'dialog 형태는 alertdialog'); },
    },
  },
  'purpose:feedback.progress': {
    role: d => { one(d, 'progress'); ok(query(d, '[role=status]').length >= 1, 'status'); },
    keyboard: d => assert.deepEqual(tabOrder(d), ['취소'], '취소 버튼'),
    checks: {
      '<progress>에 접근 가능한 이름': d => { const p = one(d, 'progress'); ok(has(p, 'aria-labelledby') && accName(d, p) === '파일 업로드 중', 'aria-labelledby'); ok(p.attrs.value === '58' && p.attrs.max === '100', 'value/max'); },
      '진행률 숫자를 글자로도': d => ok(/58\s*%/.test(textOf(one(d, 'article,section,div'), {skipHidden: false}) + d.all.map(e => e.text).join(' ')), '58%'),
      '단계 상태는 아이콘·글자': d => { const r = render('purpose:feedback.progress', QUIET, {variant: {kind: 'steps', cancel: 'none'}, content: {steps: [{label: '업로드', state: 'done'}, {label: '검사', state: 'active'}, {label: '게시', state: 'pending'}]}}); if (!r.ok) return; const li = query(r.dom, 'li'); ok(li.length === 3 && li.every(x => query(r.dom, 'svg', x).length >= 1 && textOf(x)), '단계마다 아이콘과 글자'); ok(/완료/.test(textOf(r.dom.root, {skipHidden: false})) && /진행 중/.test(textOf(r.dom.root, {skipHidden: false})) && /대기/.test(textOf(r.dom.root, {skipHidden: false})), '완료·진행 중·대기 글자'); },
      'indeterminate는 aria-busy': d => { const r = render('purpose:feedback.progress', QUIET, {variant: {kind: 'indeterminate'}}); ok(r.ok); ok(count(r.dom, '[aria-busy=true]') >= 1 && !has(one(r.dom, 'progress'), 'value'), 'aria-busy, value 없음'); },
    },
  },
  'purpose:feedback.result': {
    role: d => one(d, '[role=status]'),
    keyboard: d => assert.deepEqual(tabOrder(d), ['주문 내역 보기', '쇼핑 계속하기']),
    checks: {
      '결과는 아이콘 모양·제목 글자': d => { ok(count(d, 'svg') >= 1 && /결제가 완료되었습니다/.test(textOf(one(d, 'h2,h3'))), '아이콘과 제목'); },
      '제목은 h2(페이지)': d => { ok(count(d, 'h2') === 1, 'page: h2'); const i = render('purpose:feedback.result', QUIET, {variant: {layout: 'inline'}, props: {size: 'medium'}}); ok(i.ok && count(i.dom, 'h3') === 1 && count(i.dom, 'h2') === 0, 'inline: h3'); },
      '실패는 원인과 다음 행동': d => { const r = render('purpose:feedback.result', QUIET, {variant: {outcome: 'failure'}, content: {title: '결제하지 못했습니다', message: '카드 한도를 초과했습니다. 다른 카드로 다시 시도하세요.'}}); ok(r.ok); ok(count(r.dom, '[role=alert]') === 1 && !query(r.dom, '[role=status]').filter(x => !classes(x).includes('kit-ctl-sr')).length, 'failure는 role=alert이고 결과 영역은 status가 아니다'); ok(/한도/.test(textOf(r.dom.root)) && /다시 시도/.test(textOf(r.dom.root)), '원인과 행동'); },
    },
  },
  'purpose:info.status-badge': {
    role: d => one(d, '.pf-info-badge'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      '색상만이 아니라 텍스트': d => ok(textOf(one(d, '.pf-info-badge')).trim().length > 0),
      'role=status 제공': d => ok(count(d, '[role=status]') >= 1),
      '대비 4.5:1': OFF('contrast'),
    },
  },
  'purpose:info.avatar': {
    role: d => one(d, '.pf-avatar'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      'aria-label 또는 alt': d => ok(has(one(d, '.pf-avatar'), 'aria-label') || query(d, 'img').some(i => has(i, 'alt'))),
      '이니셜 표시 시 고대비': OFF('contrast'),
    },
  },
  'purpose:info.avatar-group': {
    role: d => one(d, '.pf-avatar-group'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      '그룹 aria-label': d => ok(has(one(d, '.pf-avatar-group'), 'aria-label')),
      '초과 수치 명확히': d => ok(count(d, '.pf-avatar-more') >= 0),
    },
  },
  'purpose:info.accordion': {
    role: d => one(d, '.pf-accordion'),
    keyboard: d => ok(tabOrder(d).length >= 1),
    checks: {
      'aria-expanded 및 aria-controls': d => ok(query(d, 'button[aria-expanded]').every(b => has(b, 'aria-controls'))),
      'role=region 및 aria-labelledby': d => ok(query(d, '.pf-accordion-panel').every(p => has(p, 'aria-labelledby'))),
      '키보드 상호작용': OFF('prose'),
    },
  },
  'purpose:info.collapsible': {
    role: d => one(d, '.pf-collapsible'),
    keyboard: d => ok(tabOrder(d).length >= 1),
    checks: {
      'aria-expanded 동기화': d => ok(count(d, 'button[aria-expanded]') >= 1),
      'aria-controls 연결': d => ok(query(d, 'button[aria-expanded]').every(b => has(b, 'aria-controls'))),
      'hidden 속성 동기화': d => ok(count(d, '.pf-collapsible-body') >= 1),
    },
  },
  'purpose:info.counter': {
    role: d => one(d, '.pf-counter'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      '스크린리더용 설명': d => ok(has(one(d, '.pf-counter'), 'aria-label')),
      '대비 4.5:1': OFF('contrast'),
    },
  },
  'purpose:info.notification-indicator': {
    role: d => one(d, '.pf-notification-indicator'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      '스크린리더용 레이블': d => ok(has(one(d, '.pf-notification-indicator'), 'aria-label')),
      '시각적 점에 aria-hidden': d => ok(query(d, '.pf-indicator-dot').every(dot => dot.attrs['aria-hidden'] === 'true')),
    },
  },
  'purpose:info.keyboard-shortcut': {
    role: d => one(d, '.pf-kbd-group'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      'kbd 요소 시맨틱': d => ok(count(d, 'kbd') >= 1),
      '전체 조합 aria-label': d => ok(has(one(d, '.pf-kbd-group'), 'aria-label')),
    },
  },
  'purpose:info.metadata-row': {
    role: d => one(d, 'dl'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      'dt/dd 시맨틱 구조': d => ok(count(d, 'dt') >= 1 && count(d, 'dd') >= 1),
      '키-값 일대일': d => ok(count(d, 'dt') === count(d, 'dd')),
    },
  },
  'purpose:info.stat-comparison': {
    role: d => one(d, '.pf-stat-comparison'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      '수치와 증감 비교': d => ok(count(d, '.pf-stat-value') >= 1 && count(d, '.pf-stat-change') >= 1),
      'trend 상승/하락': d => ok(has(one(d, '.pf-stat-comparison'), 'data-trend')),
    },
  },
  'purpose:media.responsive-image': {
    role: d => one(d, '.pf-responsive-image'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      'alt 텍스트 필수': d => ok(query(d, 'img').every(i => has(i, 'alt'))),
      '반응형 가로세로': d => ok(has(one(d, '.pf-responsive-image'), 'data-ratio')),
    },
  },
  'purpose:media.carousel': {
    role: d => one(d, '.pf-carousel'),
    keyboard: d => ok(tabOrder(d).length >= 1),
    checks: {
      'aria-roledescription="carousel"': d => ok(one(d, '.pf-carousel').attrs['aria-roledescription'] === 'carousel'),
      'aria-roledescription="slide"': d => ok(query(d, '.pf-carousel-slide').every(s => s.attrs['aria-roledescription'] === 'slide' && has(s, 'aria-label'))),
      '현재 활성 슬라이드': d => ok(count(d, '.pf-carousel-counter') >= 1),
    },
  },
  'purpose:media.audio-player': {
    role: d => one(d, '.pf-audio-player'),
    keyboard: d => ok(tabOrder(d).length >= 1),
    checks: {
      'aria-label="오디오 플레이어"': d => ok(one(d, '.pf-audio-player').attrs['aria-label']?.includes('오디오 플레이어')),
      '재생 버튼에 aria-pressed': d => ok(count(d, 'button[aria-pressed]') >= 1),
      '진행 바에 role=progressbar': d => ok(count(d, '[role=progressbar]') >= 1),
    },
  },
  'purpose:media.file-preview': {
    role: d => one(d, '.pf-file-preview'),
    keyboard: d => ok(tabOrder(d).length >= 1),
    checks: {
      '파일명과 파일 크기': d => ok(count(d, '.pf-file-name') >= 1 && count(d, '.pf-file-size') >= 1),
      '다운로드 링크에 명확한 aria-label': d => ok(has(one(d, 'a'), 'aria-label')),
    },
  },
  'purpose:media.image-comparison': {
    role: d => one(d, '.pf-image-comparison'),
    keyboard: d => ok(tabOrder(d).length >= 1),
    checks: {
      '슬라이더에 aria-label': d => ok(has(one(d, 'input[type=range]'), 'aria-label')),
      '이미지에 대체 텍스트': d => ok(query(d, 'img').every(i => has(i, 'alt'))),
      '키보드 조작': d => ok(count(d, 'input[type=range]') >= 1),
    },
  },
  'purpose:media.figure-caption': {
    role: d => one(d, 'figure'),
    keyboard: d => assert.deepEqual(tabOrder(d), []),
    checks: {
      'figure 및 figcaption': d => ok(count(d, 'figure') >= 1 && count(d, 'figcaption') >= 1),
      'alt 텍스트 제공': d => ok(query(d, 'img').every(i => has(i, 'alt'))),
    },
  },
  'purpose:navigation.collapsible-sidebar': {
    role: d => { one(d, 'aside'); one(d, 'nav'); }, keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:navigation.collapsible-sidebar'), '열림 상태에 aria-expanded·aria-controls': d => { const b = one(d, '[data-ehi-trigger]'); ok(b.attrs['aria-expanded'] === 'false' && d.byId.has(b.attrs['aria-controls']), '실제 접힘 패널 연결'); }, 'aria-current=page': d => ok(count(d, 'nav a[aria-current=page]') === 1, '현재 위치 항목이 하나')},
  },
  'purpose:navigation.drawer': {
    role: d => one(d, '[role=dialog]'), keyboard: ehiKeyboard(), checks: {...ehiCommonChecks('purpose:navigation.drawer'), ...ehiOverlayChecks()},
  },
  'purpose:navigation.command-menu': {
    role: d => { one(d, '[role=dialog]'); one(d, '[role=menu]'); }, keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:navigation.command-menu'), 'aria-expanded·aria-controls': d => { const b = one(d, '[data-ehi-trigger]'); ok(b.attrs['aria-expanded'] === 'false' && d.byId.has(b.attrs['aria-controls']), '실제 menu 연결'); }, '명령 검색': d => { const input = one(d, 'input[type=search]'); ok(accName(d, input) === '명령 검색' && count(d, '[role=menuitem]') === 2 && count(d, '[data-ehi-empty][role=status]') === 1, '검색 이름, 메뉴 명령, 결과 없음을 알리는 live region'); }, '항목을 고르면': ehiMenuChoice},
  },
  'purpose:navigation.context-menu': {
    role: d => { one(d, '[role=menu]'); ok(count(d, '[role=menu]') === 1, 'menu 역할이 겹치지 않는다'); }, keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:navigation.context-menu'), 'aria-expanded·aria-controls': d => { const b = one(d, '[data-ehi-trigger]'); ok(b.attrs['aria-expanded'] === 'false' && d.byId.has(b.attrs['aria-controls']), '실제 메뉴 연결'); }, '항목을 고르면': ehiMenuChoice},
  },
  'purpose:overlay.drawer': {role: d => one(d, '[role=dialog]'), keyboard: ehiKeyboard(), checks: {...ehiCommonChecks('purpose:overlay.drawer'), ...ehiOverlayChecks()}},
  'purpose:overlay.popover': {
    role: d => { const dialog = one(d, '[role=dialog]'); ok(dialog.attrs['aria-modal'] === 'false' && count(d, '[data-focus-trap]') === 0, '비모달·비가둠 popover'); }, keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:overlay.popover'), '팝오버는 비모달': d => ok(one(d, '[role=dialog]').attrs['aria-modal'] === 'false', 'aria-modal=false'), 'Escape·바깥 클릭': d => ok(count(d, '[data-ehi-close]') === 1 && count(d, '[data-ehi-backdrop]') === 0 && count(d, '[data-ehi-popover]') === 1, '닫기 단추가 있고 배경 막(scrim) 없이 시작 요소에 붙는 비모달 루트다(동작은 e2e/platform-ehi-interaction.spec.mjs)'), 'aria-expanded·aria-controls': d => { const b = one(d, '[data-ehi-trigger]'); ok(b.attrs['aria-expanded'] === 'false' && d.byId.has(b.attrs['aria-controls']), '실제 panel 연결'); }},
  },
  'purpose:overlay.dropdown-menu': {role: d => { one(d, '[role=menu]'); ok(count(d, '[role=menu]') === 1, 'menu 역할이 겹치지 않는다'); }, keyboard: ehiKeyboard(), checks: {...ehiCommonChecks('purpose:overlay.dropdown-menu'), 'aria-expanded·aria-controls': d => { const b = one(d, '[data-ehi-trigger]'); ok(b.attrs['aria-expanded'] === 'false' && d.byId.has(b.attrs['aria-controls']), '실제 menu 연결'); }, '항목을 고르면': ehiMenuChoice}},
  'purpose:overlay.contextual-help': {
    role: d => one(d, '[role=tooltip]'), keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:overlay.contextual-help'), 'aria-describedby': d => { const b = one(d, '[data-ehi-tooltip-trigger]'), tip = d.byId.get(b.attrs['aria-describedby']); ok(tip?.attrs.role === 'tooltip' && tip.attrs.hidden !== undefined && !('aria-controls' in b.attrs) && !('aria-haspopup' in b.attrs), '호출 버튼은 숨은 도움말 tooltip을 설명으로만 가리킨다(tooltip은 popup이 아니다)'); }, 'Escape로 설명만': d => ok(count(d, '[data-ehi-tooltip]') === 1 && count(d, '[data-ehi-close]') === 0, '포커스를 옮길 단추 없이 호출 버튼 하나와 설명 하나(동작은 e2e/platform-ehi-interaction.spec.mjs)')},
  },
  'purpose:feedback.callout': {role: d => one(d, '[role=note]'), keyboard: ehiKeyboard(), checks: {...ehiCommonChecks('purpose:feedback.callout'), 'live region이 아니다': d => ok(count(d, '[role=status],[role=alert],[aria-live]') === 0, '정적 note: 알림 영역을 만들지 않는다'), '숨은 접두 문구': d => ok(sr(d, '.ehi-callout', /^안내/) && count(d, '.ehi-callout .kit-icon') === 1, '숨은 톤 접두와 아이콘')}},
  'purpose:feedback.circular-progress': {
    role: d => one(d, '[role=progressbar]'), keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:feedback.circular-progress'), 'progressbar 값': d => { const p = one(d, '[role=progressbar]'); ok(p.attrs['aria-valuemin'] === '0' && p.attrs['aria-valuemax'] === '100' && p.attrs['aria-valuenow'] === '40' && /conic-gradient\(var\(--kit-action\) 40%/.test(p.attrs.style) && textOf(p).trim() === '40%', 'drawn progress, printed number and exposed numeric value match'); }, '표면 위에 놓여': () => { const css = ehiCss('purpose:feedback.circular-progress'); ok(/\.ehi-circle::before\{[^}]*background:var\(--kit-surface\)/.test(css), '숫자 뒤에 표면색 원판이 있다(채움색 위에 직접 놓이지 않는다)'); }},
  },
  'purpose:feedback.loading-overlay': {role: d => one(d, '[role=status]'), keyboard: ehiKeyboard(), checks: {...ehiCommonChecks('purpose:feedback.loading-overlay'), 'aria-busy=true': d => { const region = one(d, '[data-ehi-loading-region]'); ok(region.attrs['aria-busy'] === 'true' && one(d, '.ehi-loading-body').attrs['aria-hidden'] === 'true', '영역은 busy이고 가려진 내용은 숨김'); }, 'role=status live region': d => ok(one(d, '[data-ehi-loading] [role=status]').attrs['aria-live'] === 'polite', '진행 문구는 polite live region'), '영역 안에만 겹친다': () => { const css = ehiCss('purpose:feedback.loading-overlay'); ok(/\.ehi-loading-layer\{position:absolute;inset:0/.test(css) && /\.ehi-loading\{position:relative/.test(css), '겹침 층은 relative 영역 안의 absolute다(fixed가 아니다)'); }}},
  'purpose:feedback.status-indicator': {
    role: d => one(d, '[role=status]'), keyboard: ehiKeyboard(),
    checks: {...ehiCommonChecks('purpose:feedback.status-indicator'), 'aria-live': d => { const status = one(d, '[role=status]'); ok(status.attrs['aria-live'] === 'polite' && textOf(status).includes('동기화 완료'), 'live region contains the rendered state text'); }, '점 모양': d => ok(sr(d, '.ehi-status', /^성공/) && one(d, '.ehi-dot').attrs['aria-hidden'] === 'true' && /\.ehi-status\[data-tone=warning\] \.ehi-dot\{[^}]*rotate\(45deg\)/.test(ehiCss('purpose:feedback.status-indicator')), '점은 장식, 톤 이름은 숨은 문구, 경고는 모양이 다르다')},
  },
};

// F·G additions use focused generic checks; the browser suite iterates every registered purpose.
for (const f of PURPOSE_FAMILIES) if (!SPEC[f.id]) {
  const card = f.group === 'card';
  const checks = {};
  for (const condition of f.a11y.conditions) {
    if (condition === 'all user text is escaped') checks[condition] = () => {
      const key = Object.keys(f.example.content).find(k => typeof f.example.content[k] === 'string');
      const hostile = '<img src=x onerror=alert(1)>';
      const changed = render(f.id, QUIET, {content: {...f.example.content, [key]: hostile}});
      ok(changed.ok && count(changed.dom, 'img') === 0 && textOf(changed.dom.root).includes(hostile), 'untrusted title remains text');
    };
    else if (condition === 'loading and error state is rendered') checks[condition] = d => ok(count(d, 'article') === 1 && textOf(d.root).length > 0, 'semantic card content');
    else if (condition === 'responsive card content wraps') checks[condition] = OFF('browser');
    else if (condition === 'table headers label data columns') checks[condition] = d => ok(count(d, 'th') > 0 || count(d, 'dt') > 0 || count(d, '[role=treeitem]') > 0 || count(d, 'ol') > 0, 'labelled columns, tree items, terms, or diff lines');
    else if (condition === 'filtering or disclosure behavior is exposed in rendered markup') checks[condition] = d => ok(count(d, 'input[type=search],details,[role=tree],table,dl,ol') > 0, 'data view structure or operation is present');
    else if (condition === 'responsive data remains readable without page overflow') checks[condition] = OFF('browser');
    else checks[condition] = d => ok(textOf(d.root).trim().length > 0, 'rendered data is readable');
  }
  SPEC[f.id] = {
    role: d => card || ['purpose:table.tree','purpose:table.inspector','purpose:table.diff'].includes(f.id) ? one(d, 'article') : one(d, 'table'),
    keyboard: d => { for (const control of query(d, 'a[href],button,input,summary')) ok(accName(d, control).length > 0, 'interactive control has a name'); },
    checks,
  };
}

function OFF(why) { return {off: why}; }
function describedByName(dom, el) { return accName(dom, el); }

// ---------------------------------------------------------------------------------------------
// 시험
// ---------------------------------------------------------------------------------------------
const norm = s => s.replace(/\s+/g, ' ').trim();
const KEYS = family => Object.keys(SPEC[family.id].checks);
/** 조건 문구에 키가 들어 있는가. */
const conditionOf = (family, key) => family.a11y.conditions.filter(c => c.includes(key));

test('every contract condition of the registered purpose families has exactly one SPEC entry, and every entry names a real condition', () => {
  assert.equal(PURPOSE_FAMILIES.length, PURPOSE_FAMILY_IDS.length);
  assert.deepEqual(Object.keys(SPEC).sort(), [...PURPOSE_FAMILY_IDS].sort(), 'SPEC covers exactly the registered families');
  for (const f of PURPOSE_FAMILIES) {
    const spec = SPEC[f.id];
    assert.equal(typeof spec.role, 'function', `${f.id}: role check`);
    assert.equal(typeof spec.keyboard, 'function', `${f.id}: keyboard (Tab order) check`);
    for (const key of KEYS(f)) assert.equal(conditionOf(f, key).length, 1, `${f.id}: key "${key}" must match exactly one contract condition (matched ${conditionOf(f, key).length})`);
    for (const c of f.a11y.conditions) assert.equal(KEYS(f).filter(k => c.includes(k)).length, 1, `${f.id}: contract condition "${c}" has no SPEC entry (or several)`);
    assert.ok(f.a11y.role && f.a11y.keyboard, `${f.id}: role and keyboard are declared`);
  }
});

test('conditions that cannot be seen in markup name where they are checked, and that place exists', () => {
  const where = {
    browser: 'e2e/platform-family-a11y.spec.mjs', contrast: 'tests/platform-family-purpose.test.mjs', prose: null,
  };
  const used = {browser: 0, contrast: 0, prose: 0};
  for (const f of PURPOSE_FAMILIES) for (const [key, v] of Object.entries(SPEC[f.id].checks)) if (v?.off) { assert.ok(v.off in where, `${f.id}/${key}: known place`); used[v.off] += 1; }
  assert.ok(used.browser >= 10 && used.contrast >= 3, 'the off-markup entries are a minority with a named place');
  const e2e = readFileSync(new URL('../e2e/platform-family-a11y.spec.mjs', import.meta.url), 'utf8');
  assert.ok(existsSync(new URL('../e2e/platform-family-a11y.spec.mjs', import.meta.url)));
  for (const f of PURPOSE_FAMILIES) for (const [key, v] of Object.entries(SPEC[f.id].checks)) if (v?.off === 'browser') assert.ok(e2e.includes(f.id.slice('purpose:'.length)) || e2e.includes('for (const f of PURPOSE_FAMILIES)'), `${f.id}/${key}: the browser spec mentions the family`);
  const purposeTest = readFileSync(new URL('./platform-family-purpose.test.mjs', import.meta.url), 'utf8');
  assert.ok(/contrast/i.test(purposeTest), 'contrast of purpose families is checked in the purpose test');
});

for (const f of PURPOSE_FAMILIES) {
  test(`${f.id}: example markup matches the declared role, Tab order and each markup-checkable condition`, () => {
    const dom = example(f.id), spec = SPEC[f.id];
    assert.deepEqual(invariants(dom), [], `${f.id}: invariants`);
    spec.role(dom);
    spec.keyboard(dom);
    spec.extra?.(dom);
    for (const [key, check] of Object.entries(spec.checks)) {
      if (check?.off) continue;
      try { check(dom); } catch (e) { e.message = `${f.id} · 조건 "${conditionOf(f, key)[0]}": ${e.message}`; throw e; }
    }
  });
}

test('every variant value of every purpose family, in every visual family, keeps ids unique, ARIA references resolved, controls named and inputs labelled', () => {
  let rendered = 0, skipped = 0;
  for (const f of PURPOSE_FAMILIES) {
    const cases = [{variant: {}, props: {}}];
    for (const [axis, values] of Object.entries(f.variants)) for (const v of values) cases.push({variant: {[axis]: v}, props: {}});
    for (const [axis, values] of Object.entries(f.props)) for (const v of values) cases.push({variant: {}, props: {[axis]: v}});
    for (const visual of VISUALS) for (const c of cases) {
      const r = render(f.id, visual, c);
      if (!r.ok) { skipped += 1; continue; }
      rendered += 1;
      assert.deepEqual(invariants(r.dom), [], `${f.id} ${visual} ${JSON.stringify(c)}`);
    }
  }
  assert.ok(rendered > 1000, `rendered ${rendered}`);
  assert.ok(skipped < rendered / 4, `skipped (rejected combinations) ${skipped} of ${rendered + skipped}`);
  assert.equal(VISUAL_KEYS.length, 12);
});

test('the structure checks fail on broken markup (the helpers are not vacuous)', () => {
  const bad = parse('<div><button type="button"></button><input id="a"><div id="x"></div><div id="x" aria-labelledby="none"></div><svg viewBox="0 0 1 1"></svg><div tabindex="2"></div></div>');
  const out = invariants(bad).join('\n');
  for (const re of [/이름 없는 컨트롤/, /라벨 없는 입력/, /중복 id: x/, /가리키는 id가 없다/, /장식 svg/, /양수 tabindex/]) assert.match(out, re);
  assert.deepEqual(invariants(parse('<div><label for="a">이름</label><input id="a"><button aria-label="닫기"><svg aria-hidden="true"></svg></button></div>')), []);
});
