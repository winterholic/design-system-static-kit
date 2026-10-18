import {BLUEPRINT_VERSION, CATALOG_VERSION, themes, palettes, axes, styleAxes, axisBans, nodeSpecs, requiredOf, limits, blueprintSchema, pageTypes, navLimits, iconShells} from './catalog.mjs';

const VAGUE_LABELS = new Set(['여기', '여기를 클릭', '클릭', '클릭하세요', 'click here', 'here', 'link', '링크', '이곳']);
const DAYS = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Strict, bounded validator. Deliberately no coercion, defaulting, repair, or unknown-key stripping. */
export function validateBlueprint(input) {
  const errors = [];
  const error = (path, code, message) => { if (errors.length < 80) errors.push({path, code, message}); };
  const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x));
  let bytes;
  try { bytes = new TextEncoder().encode(JSON.stringify(input)).length; } catch { error('$', 'JSON', '순환 참조 또는 JSON으로 표현할 수 없는 입력'); return {valid: false, errors}; }
  if (bytes > limits.bytes) { error('$', 'SIZE', `JSON은 ${limits.bytes}바이트 이하입니다.`); return {valid: false, errors}; }

  function value(v, s, path) {
    if (s.const !== undefined) { if (v !== s.const) error(path, 'CONST', '고정된 값: ' + s.const); return; }
    if (s.type === 'object') {
      if (!plain(v)) { error(path, 'OBJECT', '객체가 필요합니다.'); return; }
      for (const k of Object.keys(v)) if (!Object.hasOwn(s.properties, k)) error(path + '.' + k, 'UNKNOWN_KEY', '허용되지 않은 속성: ' + k);
      for (const k of s.required ?? []) if (!Object.hasOwn(v, k)) error(path + '.' + k, 'REQUIRED', '필수 속성입니다.');
      for (const [k, sub] of Object.entries(s.properties)) if (Object.hasOwn(v, k)) value(v[k], sub, path + '.' + k);
      return;
    }
    if (s.type === 'array') {
      if (!Array.isArray(v)) { error(path, 'ARRAY', '배열이 필요합니다.'); return; }
      if (v.length < s.minItems || v.length > s.maxItems) error(path, 'ARRAY_LENGTH', `항목은 ${s.minItems}~${s.maxItems}개입니다.`);
      v.slice(0, Math.max(s.maxItems, 40)).forEach((x, i) => value(x, s.items, `${path}[${i}]`)); return;
    }
    if (s.enum) { if (!s.enum.includes(v)) error(path, 'ENUM', '허용값: ' + s.enum.join(', ')); return; }
    if (s.type === 'integer' || s.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v) || (s.type === 'integer' && !Number.isInteger(v)) || v < s.minimum || v > s.maximum) error(path, 'NUMBER', `${s.type === 'integer' ? '정수' : '숫자'} ${s.minimum}~${s.maximum}가 필요합니다.`);
      return;
    }
    if (s.type === 'string') {
      if (typeof v !== 'string' || v.trim().length < (s.minLength ?? 0) || v.length > s.maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) error(path, 'STRING', `텍스트 ${s.minLength}~${s.maxLength}자가 필요합니다.`);
      else if (s.pattern && !new RegExp(s.pattern).test(v)) error(path, 'PATTERN', '형식에 맞지 않습니다.');
    }
  }

  if (!plain(input)) { error('$', 'OBJECT', 'Blueprint 객체가 필요합니다.'); return {valid: false, errors}; }
  const top = blueprintSchema();
  // The tree is walked separately: cross-field invariants do not belong in a permissive schema walker.
  const props = {...top.properties}; delete props.tree;
  value(Object.fromEntries(Object.entries(input).filter(([k]) => k !== 'tree')), {type: 'object', properties: props, required: top.required.filter(k => k !== 'tree')}, '$');
  if (input.version !== BLUEPRINT_VERSION) error('$.version', 'VERSION', '지원 Blueprint 버전: ' + BLUEPRINT_VERSION + ' (1.0은 `kit migrate`로 변환)');
  if (input.catalogVersion !== CATALOG_VERSION) error('$.catalogVersion', 'CATALOG_VERSION', '카탈로그를 명시적으로 업그레이드하세요: ' + CATALOG_VERSION);
  const theme = Object.hasOwn(themes, input.theme) ? themes[input.theme] : null;
  if (theme && Object.hasOwn(palettes, input.palette) && !theme.palettes.includes(input.palette)) error('$.palette', 'PALETTE_THEME', '선택한 테마에 속하지 않는 팔레트입니다.');
  const axisOk = ['mode', ...styleAxes].every(k => axes[k].includes(input[k]));
  if (theme) for (const [axis, banned] of Object.entries(theme.forbid)) if (banned.includes(input[axis])) error('$.' + axis, 'THEME_FORBID', `${theme.name} 테마는 ${axis}=${input[axis]}를 금지합니다. 금지 값: ${banned.join(', ')}`);
  if (axisOk) for (const ban of axisBans) if (ban.bad(input)) error('$.' + ban.uses[0], 'AXIS_BAN', `${ban.id} · ${ban.why} (사용 가능한 대안: ${Object.entries(ban.fix).map(([k, v]) => k + '=' + v).join(', ')})`);

  // ---- anchors (needed to judge in-page links) ----
  const anchors = new Set(), anchorCount = {};
  (function collect(n) { if (plain(n) && n.type === 'section' && typeof n.anchor === 'string') anchorCount[n.anchor] = (anchorCount[n.anchor] ?? 0) + 1; if (plain(n) && Array.isArray(n.children)) n.children.forEach(collect); })(input.tree);
  for (const [a, c] of Object.entries(anchorCount)) { anchors.add(a); if (c > 1) error('$.tree', 'ANCHOR_DUPLICATE', `anchor "${a}"가 ${c}번 선언되었습니다.`); }
  const linkProblem = href => {
    if (typeof href !== 'string' || /[\s\\]/.test(href)) return 'URL';
    if (href === '#main') return null;
    if (/^#[a-z][a-z0-9-]*$/.test(href)) return anchors.has(href.slice(1)) ? null : 'ANCHOR_MISSING';
    try { const url = new URL(href); return url.protocol === 'https:' && !url.username && !url.password && !!url.hostname ? null : 'URL'; } catch { return 'URL'; }
  };
  const checkLink = (href, path) => { const p = linkProblem(href); if (p) error(path, p, p === 'ANCHOR_MISSING' ? '같은 페이지에 선언된 section.anchor만 가리킬 수 있습니다.' : 'HTTPS(자격 증명 없음), #main, 선언된 앵커만 허용합니다.'); };
  const checkLabel = (label, path) => { if (typeof label === 'string' && VAGUE_LABELS.has(label.trim().toLowerCase())) error(path, 'LINK_LABEL', '링크·버튼 이름은 목적지를 설명해야 합니다: ' + label); };
  const group = (list, path) => {
    const items = list.filter(plain);
    if (items.filter(x => x.variant === 'primary').length > 1) error(path, 'PRIMARY_ACTION', '주 액션은 그룹당 하나입니다.');
    items.forEach(a => { if (Object.hasOwn(a, 'href')) checkLink(a.href, path); checkLabel(a.label, path); });
  };

  // ---- chrome ----
  if (plain(input.chrome)) {
    const c = input.chrome;
    if (Array.isArray(c.nav)) {
      c.nav.forEach((a, i) => { if (plain(a)) { checkLink(a.href, `$.chrome.nav[${i}].href`); checkLabel(a.label, `$.chrome.nav[${i}].label`); } });
      const limit = navLimits[input.shell];
      if (limit && c.nav.length > limit) error('$.chrome.nav', 'NAV_COUNT', `${input.shell} 셸의 내비 항목은 최대 ${limit}개입니다.`);
      if (iconShells.includes(input.shell) && c.nav.some(a => plain(a) && !a.icon)) error('$.chrome.nav', 'NAV_ICON', `${input.shell} 셸은 모든 내비 항목에 icon이 필요합니다(아이콘+라벨).`);
    }
    if (plain(c.action)) { checkLink(c.action.href, '$.chrome.action.href'); checkLabel(c.action.label, '$.chrome.action.label'); }
    if (Array.isArray(c.footerLinks)) c.footerLinks.forEach((l, i) => { if (plain(l)) checkLink(l.href, `$.chrome.footerLinks[${i}].href`); });
  } else if (iconShells.includes(input.shell)) error('$.chrome', 'NAV_ICON', `${input.shell} 셸은 아이콘이 있는 chrome.nav가 필요합니다.`);
  if (input.footer === 'columns' && !(Array.isArray(input.chrome?.footerLinks) && input.chrome.footerLinks.length)) error('$.chrome.footerLinks', 'FOOTER_LINKS', 'columns 푸터는 footerLinks가 1개 이상 필요합니다.');

  // ---- tree ----
  let count = 0, heroCount = 0;
  const fieldIds = new Set(), types = new Set(), firstSeen = {};
  function node(n, path, parent, depth, ancestors) {
    count++; if (count > limits.nodes) { if (count === limits.nodes + 1) error(path, 'NODE_LIMIT', `최대 ${limits.nodes}노드입니다.`); return; }
    if (depth > limits.depth) { error(path, 'DEPTH', `최대 깊이는 ${limits.depth}입니다.`); return; }
    if (!plain(n)) { error(path, 'OBJECT', '노드 객체가 필요합니다.'); return; }
    if (typeof n.type !== 'string' || !Object.hasOwn(nodeSpecs, n.type)) { error(path + '.type', 'NODE_TYPE', '알 수 없는 부품입니다.'); return; }
    if (parent && !nodeSpecs[parent].children?.includes(n.type)) error(path + '.type', 'CHILD_TYPE', `${parent} 안에 ${n.type}을 넣을 수 없습니다.`);
    types.add(n.type); firstSeen[n.type] ??= path;
    const spec = nodeSpecs[n.type];
    const properties = {type: {const: n.type}, ...spec.fields};
    if (spec.children) properties.children = {type: 'array', items: {}, minItems: spec.min, maxItems: spec.max};
    value(n, {type: 'object', properties, required: requiredOf(spec)}, path);
    checks(n, path, ancestors);
    if (spec.children && Array.isArray(n.children)) for (let i = 0; i < n.children.length && count <= limits.nodes; i++) node(n.children[i], `${path}.children[${i}]`, n.type, depth + 1, [...ancestors, n.type]);
  }
  function checks(n, path, ancestors) {
    const t = n.type, A = Array.isArray;
    if (plain(n.action)) group([n.action], path + '.action');
    if (t === 'page-header' && A(n.actions)) group(n.actions, path + '.actions');
    if (t === 'actions' && A(n.items)) group(n.items, path + '.items');
    if (['hero', 'cta', 'buy-box'].includes(t)) group([n.action, n.secondaryAction].filter(plain), path);
    if (t === 'hero') { heroCount++; if (n.visual && !['split', 'product'].includes(n.variant)) error(path + '.visual', 'HERO_VISUAL', 'visual은 split·product 변형에서만 사용합니다.'); }
    if (t === 'pricing' && A(n.children)) {
      group(n.children.filter(plain).map(p => p.action).filter(plain), path);
      if (n.children.filter(p => plain(p) && p.featured === 'yes').length > 1) error(path, 'FEATURED_PLAN', '추천 요금제는 하나만 둘 수 있습니다.');
    }
    if (t === 'tabs' && ancestors.includes('tabs')) error(path, 'NESTED_TABS', '탭 안에 탭을 중첩할 수 없습니다.');
    if (t === 'links' && A(n.items)) n.items.forEach((l, i) => { if (plain(l)) { checkLink(l.href, `${path}.items[${i}].href`); checkLabel(l.label, `${path}.items[${i}].label`); } });
    if (t === 'breadcrumb' && A(n.items)) {
      n.items.forEach((x, i) => { if (plain(x) && Object.hasOwn(x, 'href')) checkLink(x.href, `${path}.items[${i}].href`); });
      const last = n.items.at(-1); if (plain(last) && Object.hasOwn(last, 'href')) error(`${path}.items[${n.items.length - 1}]`, 'VARIANT_REQUIRES', '마지막 항목은 현재 위치이므로 href를 둘 수 없습니다.');
      n.items.slice(0, -1).forEach((x, i) => { if (plain(x) && !Object.hasOwn(x, 'href')) error(`${path}.items[${i}]`, 'VARIANT_REQUIRES', '마지막이 아닌 항목은 href가 필요합니다.'); });
    }
    if (t === 'card') {
      if (['media', 'horizontal'].includes(n.variant) && !n.visual) error(path + '.visual', 'VARIANT_REQUIRES', `${n.variant} 카드는 visual이 필요합니다.`);
      if (n.visual && !['media', 'horizontal'].includes(n.variant)) error(path + '.visual', 'VARIANT_REQUIRES', 'visual은 media·horizontal 카드에서만 사용합니다.');
      if (n.ratio && !n.visual) error(path + '.ratio', 'VARIANT_REQUIRES', 'ratio는 visual과 함께 사용합니다.');
      if (n.variant === 'link' && !n.action) error(path + '.action', 'VARIANT_REQUIRES', 'link 카드는 action이 필요합니다.');
    }
    if (t === 'metric' && (Object.hasOwn(n, 'trend') !== Object.hasOwn(n, 'delta'))) error(path, 'METRIC_TREND', 'trend와 delta는 함께 있어야 합니다.');
    if (t === 'empty-state' && ['error', 'not-found', 'offline', 'forbidden', 'maintenance'].includes(n.kind) && !n.action) error(path + '.action', 'VARIANT_REQUIRES', `${n.kind} 상태 화면은 다음 행동(action)이 필요합니다.`);
    if (t === 'table' && A(n.rows) && A(n.columns)) {
      n.rows.forEach((row, i) => { if (A(row) && row.length !== n.columns.length) error(`${path}.rows[${i}]`, 'TABLE_WIDTH', '표의 열과 셀 개수가 다릅니다.'); });
      if (['ready', 'partial'].includes(n.state) && n.rows.length === 0) error(path + '.rows', 'STATE_DATA', `${n.state} 상태에는 행이 1개 이상 필요합니다.`);
    }
    if (t === 'list' && A(n.items) && ['ready', 'partial'].includes(n.state) && n.items.length === 0) error(path + '.items', 'STATE_DATA', `${n.state} 상태에는 항목이 1개 이상 필요합니다.`);
    if (t === 'chart' && A(n.series) && A(n.categories)) {
      n.series.forEach((s, i) => { if (plain(s) && A(s.values) && s.values.length !== n.categories.length) error(`${path}.series[${i}].values`, 'CHART_SHAPE', '값의 개수는 categories와 같아야 합니다.'); });
      if (n.kind === 'donut') {
        const v = n.series[0]?.values;
        if (n.series.length !== 1) error(path + '.series', 'CHART_SHAPE', 'donut은 계열 하나만 허용합니다.');
        else if (A(v) && (v.some(x => typeof x !== 'number' || x < 0) || v.reduce((a, b) => a + b, 0) <= 0)) error(path + '.series[0].values', 'CHART_SHAPE', 'donut 값은 0 이상이며 합이 0보다 커야 합니다.');
        if (n.categories.length > 5) error(path + '.categories', 'CHART_SHAPE', 'donut은 범주 5개 이하입니다(그 이상은 막대 차트).');
      }
      if (n.series.length > 1 && n.kind === 'bars-h' && n.series.length > 3) error(path + '.series', 'CHART_SHAPE', '계열은 3개 이하입니다.');
    }
    if (t === 'calendar' && A(n.events) && Number.isInteger(n.year) && Number.isInteger(n.month)) n.events.forEach((ev, i) => { if (plain(ev) && Number.isInteger(ev.day) && ev.day > DAYS(n.year, n.month)) error(`${path}.events[${i}].day`, 'CALENDAR_DAY', `${n.year}년 ${n.month}월에는 ${ev.day}일이 없습니다.`); });
    if (t === 'master-detail' && A(n.items) && Number.isInteger(n.selected) && n.selected >= n.items.length) error(path + '.selected', 'SELECTED_RANGE', 'selected가 items 범위를 벗어났습니다.');
    if (t === 'filter-bar' && A(n.filters) && Number.isInteger(n.selected) && n.selected >= n.filters.length) error(path + '.selected', 'SELECTED_RANGE', 'selected가 filters 범위를 벗어났습니다.');
    if (t === 'stepper' && A(n.steps) && Number.isInteger(n.current) && n.current > n.steps.length) error(path + '.current', 'STEPPER_RANGE', 'current가 steps 범위를 벗어났습니다.');
    if (t === 'pagination' && Number.isInteger(n.pages) && Number.isInteger(n.current) && n.current > n.pages) error(path + '.current', 'PAGINATION_RANGE', 'current가 pages보다 클 수 없습니다.');
    if (t === 'toc' && anchors.size < 2) error(path, 'TOC_EMPTY', '목차는 anchor가 있는 section이 2개 이상 있어야 합니다.');
    if (t === 'form' && A(n.fields)) n.fields.forEach((f, i) => {
      if (!plain(f)) return;
      const p = `${path}.fields[${i}]`;
      if (fieldIds.has(f.id)) error(p + '.id', 'DUPLICATE_ID', '페이지의 필드 id는 중복될 수 없습니다.');
      fieldIds.add(f.id);
      const needs = ['select', 'radio'].includes(f.type);
      if (needs && (!A(f.options) || f.options.length < 2)) error(p + '.options', 'SELECT_OPTIONS', `${f.type}은 선택지 2개 이상이 필요합니다.`);
      if (!needs && Object.hasOwn(f, 'options')) error(p + '.options', 'FIELD_OPTIONS', 'options는 select·radio 전용입니다.');
    });
  }
  if (plain(input.tree) && input.tree.type !== 'page') error('$.tree.type', 'ROOT', '루트는 page여야 합니다.');
  node(input.tree, '$.tree', null, 1, []);

  if (plain(input.tree) && Array.isArray(input.tree.children)) {
    const c = input.tree.children;
    if (c[0]?.type !== 'page-header' || c.filter(n => n?.type === 'page-header').length !== 1) error('$.tree.children', 'PAGE_HEADER', '첫 노드는 page-header이며 페이지에 하나만 있어야 합니다.');
    if (heroCount > 1) error('$.tree', 'SINGLE_HERO', '히어로는 페이지당 하나입니다.');
    c.forEach((n, i) => { if (n?.type === 'hero' && i !== 1) error(`$.tree.children[${i}]`, 'HERO_POSITION', '히어로는 page-header 바로 다음에만 올 수 있습니다.'); });
    const pt = Object.hasOwn(pageTypes, input.pageType) ? pageTypes[input.pageType] : null;
    if (pt) {
      for (const groupOf of pt.require) if (!groupOf.some(x => types.has(x))) error('$.tree', 'PAGE_REQUIRE', `${pt.label} 페이지에는 ${groupOf.join(' · ')} 중 하나 이상이 필요합니다.`);
      for (const x of pt.forbid ?? []) if (types.has(x)) error(firstSeen[x], 'PAGE_FORBID', `${pt.label} 페이지에는 ${x}를 둘 수 없습니다.`);
      if (pt.allow) c.forEach((n, i) => { if (n && !pt.allow.includes(n.type)) error(`$.tree.children[${i}].type`, 'PAGE_ALLOW', `${pt.label} 페이지의 허용 부품: ${pt.allow.join(', ')}`); });
      if (pt.maxChildren && c.length > pt.maxChildren) error('$.tree.children', 'PAGE_MAX', `${pt.label} 페이지는 최상위 노드 ${pt.maxChildren}개 이하입니다.`);
      if (pt.second && c[1]?.type !== pt.second) error('$.tree.children[1]', 'PAGE_SECOND', `${pt.label} 페이지의 두 번째 노드는 ${pt.second}여야 합니다.`);
      if (pt.secondKinds && c[1]?.type === pt.second && !pt.secondKinds.includes(c[1].kind)) error('$.tree.children[1].kind', 'PAGE_SECOND', `허용 kind: ${pt.secondKinds.join(', ')}`);
      if (axes.shell.includes(input.shell) && !pt.shells.includes(input.shell)) error('$.shell', 'PAGE_SHELL', `${pt.label} 페이지의 허용 셸: ${pt.shells.join(', ')}`);
      if (pt.widths && axes.width.includes(input.width) && !pt.widths.includes(input.width)) error('$.width', 'PAGE_WIDTH', `${pt.label} 페이지의 허용 폭: ${pt.widths.join(', ')}`);
    }
  }
  return {valid: errors.length === 0, errors};
}
