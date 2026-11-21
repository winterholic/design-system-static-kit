import {profileErrors} from './profiles/check.mjs';
import {nodeSpecAt, nodeExtended} from './catalog/node-extensions.mjs';
import {FEATURED_COLUMNS, FEATURED_MIN_CHILDREN, NARROW_CELL_OK, PULL_PARENTS, BLEED_RATIOS} from './catalog/expression.mjs';
import {BLUEPRINT_VERSION, CATALOG_VERSION, ACCEPTED_CATALOG_VERSIONS, SINCE_FIELDS, TOP_LEVEL_SINCE_FIELDS, PROFILE_SINCE_FIELD, atLeast, expressionApplies, assessBlueprintContracts, themes, palettes, axes, styleAxes, axisBans, nodeSpecs, requiredOf, limits, blueprintSchema, pageTypes, navLimits, iconShells, megaShells, MEGA_MAX} from './catalog.mjs';

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
  if (!ACCEPTED_CATALOG_VERSIONS.includes(input.catalogVersion)) error('$.catalogVersion', 'CATALOG_VERSION', '지원 카탈로그: ' + ACCEPTED_CATALOG_VERSIONS.join(', ') + ' (명시적 업그레이드: kit migrate)');
  for (const f of TOP_LEVEL_SINCE_FIELDS) if (Object.hasOwn(input, f.field) && !atLeast(input.catalogVersion, f.since)) error(`$.${f.field}`, 'VERSION_FIELD', `${f.field}는 ${f.since}부터 쓸 수 있습니다.`);
  if (Object.hasOwn(input, PROFILE_SINCE_FIELD.field) && !atLeast(input.catalogVersion, PROFILE_SINCE_FIELD.since)) error('$.profile', 'VERSION_FIELD', `profile은 ${PROFILE_SINCE_FIELD.since}부터 쓸 수 있습니다.`);
  // 프로파일 계약(PF01~PF13): 프로파일이 허용하지 않는 부품·프리셋·밀도 조합을 거부한다. 근거와 대안(fix)을 오류에 싣는다.
  else if (PROFILE_SINCE_FIELD.values.includes(input.profile)) for (const e of profileErrors(input)) if (errors.length < 80) errors.push(e);
  const expr = expressionApplies(input), warnings = [];
  const theme = Object.hasOwn(themes, input.theme) ? themes[input.theme] : null;
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
      c.nav.forEach((a, i) => { if (plain(a)) { checkLink(a.href, `$.chrome.nav[${i}].href`); checkLabel(a.label, `$.chrome.nav[${i}].label`); if (Array.isArray(a.mega)) a.mega.forEach((m, j) => { if (plain(m)) { checkLink(m.href, `$.chrome.nav[${i}].mega[${j}].href`); checkLabel(m.label, `$.chrome.nav[${i}].mega[${j}].label`); } }); } });
      const megas = c.nav.filter(a => plain(a) && a.mega);
      if (megas.length && !megaShells.includes(input.shell)) error('$.chrome.nav', 'NAV_MEGA', `드롭다운 메뉴는 ${megaShells.join(', ')} 셸에서만 쓸 수 있습니다.`);
      if (megas.length > MEGA_MAX) error('$.chrome.nav', 'NAV_MEGA', `드롭다운 메뉴는 최대 ${MEGA_MAX}개입니다.`);
      if (c.nav.filter(a => plain(a) && a.current).length > 1) error('$.chrome.nav', 'NAV_GROUP', '현재 위치(current)는 한 항목에만 표시합니다.');
      const grouped = c.nav.filter(a => plain(a) && a.group);
      if (grouped.length && !['sidebar', 'split'].includes(input.shell)) error('$.chrome.nav', 'NAV_GROUP', '내비 그룹 라벨은 sidebar·split 셸에서만 쓸 수 있습니다(세로 목록이 있어야 라벨이 읽힙니다).');
      const seenGroups = []; c.nav.forEach(a => { const g = plain(a) ? a.group ?? '' : ''; if (g && seenGroups.at(-1) !== g && seenGroups.includes(g)) error('$.chrome.nav', 'NAV_GROUP', `그룹 "${g}" 항목은 이어서 놓아야 합니다.`); if (seenGroups.at(-1) !== g) seenGroups.push(g); });
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
  const surfaceStack = [];
  function node(n, path, parent, depth, ancestors) {
    count++; if (count > limits.nodes) { if (count === limits.nodes + 1) error(path, 'NODE_LIMIT', `최대 ${limits.nodes}노드입니다.`); return; }
    if (depth > limits.depth) { error(path, 'DEPTH', `최대 깊이는 ${limits.depth}입니다.`); return; }
    if (!plain(n)) { error(path, 'OBJECT', '노드 객체가 필요합니다.'); return; }
    if (typeof n.type !== 'string' || !Object.hasOwn(nodeSpecs, n.type)) { error(path + '.type', 'NODE_TYPE', '알 수 없는 부품입니다.'); return; }
    if (parent && !nodeSpecs[parent].children?.includes(n.type)) error(path + '.type', 'CHILD_TYPE', `${parent} 안에 ${n.type}을 넣을 수 없습니다.`);
    types.add(n.type); firstSeen[n.type] ??= path;
    const spec = nodeSpecAt(n.type, input.catalogVersion);
    const properties = {type: {const: n.type}, ...spec.fields};
    if (spec.children) properties.children = {type: 'array', items: {}, minItems: spec.min, maxItems: spec.max};
    value(n, {type: 'object', properties, required: requiredOf(spec)}, path);
    checks(n, path, ancestors);
    const surfaced = n.type === 'section' && ['tint', 'inverse'].includes(n.surface);
    if (surfaced) surfaceStack.push(path);
    if (spec.children && Array.isArray(n.children)) for (let i = 0; i < n.children.length && count <= limits.nodes; i++) node(n.children[i], `${path}.children[${i}]`, n.type, depth + 1, [...ancestors, n.type]);
    if (surfaced) surfaceStack.pop();
  }
  /** 2.5.0 필드의 위치·조합 규칙. 필드마다 하나의 오류 코드와 고치는 방법을 메시지에 싣는다. */
  function expressionChecks(n, t, path, parent) {
    if (t === 'hero' && Object.hasOwn(n, 'ratio') && (!n.visual || !['split', 'product'].includes(n.variant))) error(path + '.ratio', 'VARIANT_REQUIRES', 'ratio는 visual이 있는 split·product 히어로에서만 사용합니다(비율을 나눌 시각 칸이 있어야 합니다).');
    if (t === 'split' && ['dominant-start', 'dominant-end'].includes(n.ratio) && A_(n.children)) {
      // 비율은 열의 것이다(wide-start와 같다): reverse이면 첫 자식이 둘째 열에 앉으므로 좁은 칸이 바뀐다.
      const narrow = n.children[(n.ratio === 'dominant-start') !== (n.reverse === 'reverse') ? 1 : 0];
      if (plain(narrow) && !NARROW_CELL_OK.includes(narrow.type)) error(`${path}.ratio`, 'VARIANT_REQUIRES', `${n.ratio}의 좁은 칸(약 30%)에는 ${narrow.type}을 둘 수 없습니다. 좁은 칸에 둘 수 있는 부품: ${NARROW_CELL_OK.join(', ')}.`);
    }
    if (t === 'card' && n.featured === 'yes' && parent !== 'grid') error(path + '.featured', 'FEATURED_CARD', 'featured 카드는 columns가 three·four인 grid 안에서만 쓸 수 있습니다(bento의 큰 칸은 시각 칸에 자동으로 주어집니다).');
    if (t === 'grid' && A_(n.children)) {
      const featured = n.children.map((c, i) => plain(c) && c.type === 'card' && c.featured === 'yes' ? i : -1).filter(i => i >= 0);
      if (featured.length > 1) error(path, 'FEATURED_CARD', '강조 카드는 grid마다 하나만 둘 수 있습니다.');
      if (featured.length) {
        if (!FEATURED_COLUMNS.includes(n.columns)) error(path + '.columns', 'FEATURED_CARD', `강조 카드가 있는 grid는 columns가 ${FEATURED_COLUMNS.join('·')}이어야 합니다(두 칸 폭이 한 줄을 다 쓰지 않도록).`);
        if (n.children.length < FEATURED_MIN_CHILDREN) error(path, 'FEATURED_CARD', `강조 카드가 있는 grid는 자식이 ${FEATURED_MIN_CHILDREN}개 이상이어야 합니다.`);
        if (featured[0] !== 0) error(`${path}.children[${featured[0]}].featured`, 'FEATURED_CARD', '강조 카드는 grid의 첫 칸이어야 합니다(줄 중간에 두 칸 폭이 놓이면 앞 줄에 빈칸이 생깁니다).');
      }
    }
    if (t === 'quote' && n.variant === 'pull' && !PULL_PARENTS.includes(parent)) error(path + '.variant', 'PULL_POSITION', `풀쿼트(pull)는 ${PULL_PARENTS.join(' 또는 ')} 직속에서만 쓸 수 있습니다(칸 안에서는 큰 글자가 칸 폭에 눌립니다).`);
    if (t === 'section' && Object.hasOwn(n, 'space') && parent !== 'page') error(path + '.space', 'SPACE_POSITION', 'space는 페이지 직속 section에서만 쓸 수 있습니다(안쪽 section의 간격은 바깥 section이 정합니다).');
    if (t === 'media' && n.bleed === 'yes') {
      if (parent !== 'page') error(path + '.bleed', 'BLEED_POSITION', 'bleed 미디어는 페이지 직속 자식이어야 합니다(콘텐츠 열 바깥으로 이어지려면 열이 하나뿐인 자리여야 합니다).');
      if (!BLEED_RATIOS.includes(n.ratio)) error(path + '.ratio', 'VARIANT_REQUIRES', `bleed 미디어의 ratio는 ${BLEED_RATIOS.join('·')}만 허용합니다.`);
    }
  }
  const A_ = Array.isArray;
  function checks(n, path, ancestors) {
    const t = n.type, A = Array.isArray, parent = ancestors.at(-1);
    // 2.5.0 표현력 문법(ADR 0010): 출력이 고정된 2.4.0 이하는 문법을 넓히지 않는다. 새 필드·새 enum 값은 거부한다.
    if (!expr) for (const f of SINCE_FIELDS) if (f.node === t && Object.hasOwn(n, f.field) && (!f.values || f.values.includes(n[f.field]))) error(`${path}.${f.field}`, f.values ? 'ENUM' : 'UNKNOWN_KEY', `${t}.${f.field}${f.values ? '=' + n[f.field] : ''}는 카탈로그 2.5.0부터 쓸 수 있습니다(kit migrate <입력> <출력> --to 2.5.0).`);
    if (expr) expressionChecks(n, t, path, parent);
    if (plain(n.action)) group([n.action], path + '.action');
    if (t === 'page-header' && A(n.actions)) group(n.actions, path + '.actions');
    if (t === 'actions' && A(n.items)) group(n.items, path + '.items');
    if (['hero', 'cta', 'buy-box'].includes(t)) group([n.action, n.secondaryAction].filter(plain), path);
    if (t === 'media' && n.motif && n.kind !== 'photo') error(path + '.motif', 'VARIANT_REQUIRES', 'motif는 kind가 photo일 때만 사용합니다.');
    if (t === 'gallery' && A(n.items)) n.items.forEach((x, i) => { if (plain(x) && x.motif && x.kind !== 'photo') error(`${path}.items[${i}].motif`, 'VARIANT_REQUIRES', 'motif는 kind가 photo일 때만 사용합니다.'); });
    if (t === 'hero') { heroCount++; if (n.motif && n.visual !== 'photo') error(path + '.motif', 'VARIANT_REQUIRES', 'motif는 visual이 photo일 때만 사용합니다.'); if (n.visual && !['split', 'product'].includes(n.variant)) error(path + '.visual', 'HERO_VISUAL', 'visual은 split·product 변형에서만 사용합니다.'); if (n.facts && !['statement', 'cover', 'centered'].includes(n.variant)) error(path + '.facts', 'VARIANT_REQUIRES', 'facts는 statement·cover·centered 변형에서만 사용합니다(split·product는 그림이 근거 역할을 합니다).' + (expr ? ' [계약 V06: 히어로 형태가 수치를 지우지 못한다]' : '')); }
    if (t === 'pricing' && A(n.children)) {
      group(n.children.filter(plain).map(p => p.action).filter(plain), path);
      if (n.children.filter(p => plain(p) && p.featured === 'yes').length > 1) error(path, 'FEATURED_PLAN', '추천 요금제는 하나만 둘 수 있습니다.');
    }
    if (t === 'section' && ancestors.filter(x => x === 'section').length >= 2) error(path, 'SECTION_DEPTH', '섹션은 두 단계까지만 중첩합니다(S05). 세 번째 단계는 부품 제목(h3)으로 표현하세요.');
    if (t === 'section' && ['tint', 'inverse'].includes(n.surface) && surfaceStack.length) error(path + '.surface', 'SURFACE_NEST', `색을 입힌 섹션 안에 색을 입힌 섹션을 넣을 수 없습니다(바깥 ${surfaceStack.at(-1)}). 안쪽 여백이 겹쳐 간격이 두 배가 됩니다(S05).`);
    if (t === 'tabs' && ancestors.includes('tabs')) error(path, 'NESTED_TABS', '탭 안에 탭을 중첩할 수 없습니다.');
    if (t === 'links' && A(n.items)) n.items.forEach((l, i) => { if (plain(l)) { checkLink(l.href, `${path}.items[${i}].href`); checkLabel(l.label, `${path}.items[${i}].label`); } });
    if (t === 'breadcrumb' && A(n.items)) {
      n.items.forEach((x, i) => { if (plain(x) && Object.hasOwn(x, 'href')) checkLink(x.href, `${path}.items[${i}].href`); });
      const last = n.items.at(-1); if (plain(last) && Object.hasOwn(last, 'href')) error(`${path}.items[${n.items.length - 1}]`, 'VARIANT_REQUIRES', '마지막 항목은 현재 위치이므로 href를 둘 수 없습니다.');
      n.items.slice(0, -1).forEach((x, i) => { if (plain(x) && !Object.hasOwn(x, 'href')) error(`${path}.items[${i}]`, 'VARIANT_REQUIRES', '마지막이 아닌 항목은 href가 필요합니다.'); });
    }
    if (t === 'card') {
      if (n.motif && n.visual !== 'photo') error(path + '.motif', 'VARIANT_REQUIRES', 'motif는 visual이 photo일 때만 사용합니다.');
      if (Object.hasOwn(n, 'listPrice') && !Object.hasOwn(n, 'price')) error(path + '.listPrice', 'VARIANT_REQUIRES', 'listPrice는 price와 함께 사용합니다.');
      if (Object.hasOwn(n, 'reviews') && !Object.hasOwn(n, 'rating')) error(path + '.reviews', 'VARIANT_REQUIRES', 'reviews는 rating과 함께 사용합니다.');
      if (['media', 'horizontal'].includes(n.variant) && !n.visual) error(path + '.visual', 'VARIANT_REQUIRES', `${n.variant} 카드는 visual이 필요합니다.`);
      if (n.visual && !['media', 'horizontal'].includes(n.variant)) error(path + '.visual', 'VARIANT_REQUIRES', 'visual은 media·horizontal 카드에서만 사용합니다.');
      if (n.ratio && !n.visual) error(path + '.ratio', 'VARIANT_REQUIRES', 'ratio는 visual과 함께 사용합니다.');
      if (n.variant === 'link' && !n.action) error(path + '.action', 'VARIANT_REQUIRES', 'link 카드는 action이 필요합니다.');
    }
    if (t === 'timeline' && A(n.items)) n.items.forEach((x, i) => { if (plain(x) && n.variant !== 'release') for (const k of ['changes', 'date']) if (Object.hasOwn(x, k)) error(`${path}.items[${i}].${k}`, 'VARIANT_REQUIRES', `${k}는 variant가 release일 때만 사용합니다.`); });
    if (t === 'menu' && n.layout === 'photo' && A(n.items)) n.items.forEach((x, i) => { if (plain(x) && !x.motif) error(`${path}.items[${i}].motif`, 'VARIANT_REQUIRES', 'photo 레이아웃의 모든 항목에는 motif가 필요합니다.'); });
    if (t === 'page-header' && Object.hasOwn(n, 'stats') && plain(n) && n.align === 'center') error(path + '.stats', 'VARIANT_REQUIRES', 'stats는 가운데 정렬 제목과 함께 쓰지 않습니다.');
    if (t === 'metric' && (Object.hasOwn(n, 'trend') !== Object.hasOwn(n, 'delta'))) error(path, 'METRIC_TREND', 'trend와 delta는 함께 있어야 합니다.');
    if (t === 'empty-state' && ['error', 'not-found', 'offline', 'forbidden', 'maintenance'].includes(n.kind) && !n.action) error(path + '.action', 'VARIANT_REQUIRES', `${n.kind} 상태 화면은 다음 행동(action)이 필요합니다.`);
    if (t === 'table' && A(n.rows) && A(n.columns)) {
      n.rows.forEach((row, i) => { if (A(row) && row.length !== n.columns.length) error(`${path}.rows[${i}]`, 'TABLE_WIDTH', '표의 열과 셀 개수가 다릅니다.'); });
      if (['ready', 'partial'].includes(n.state) && n.rows.length === 0) error(path + '.rows', 'STATE_DATA', `${n.state} 상태에는 행이 1개 이상 필요합니다.`);
    }
    if (t === 'list' && A(n.items) && ['ready', 'partial'].includes(n.state) && n.items.length === 0) error(path + '.items', 'STATE_DATA', `${n.state} 상태에는 항목이 1개 이상 필요합니다.`);
    if (t === 'chart' && !nodeExtended('chart', input.catalogVersion) && A(n.series) && A(n.categories)) {
      n.series.forEach((s, i) => { if (plain(s) && A(s.values) && s.values.length !== n.categories.length) error(`${path}.series[${i}].values`, 'CHART_SHAPE', '값의 개수는 categories와 같아야 합니다.'); });
      if (n.kind === 'donut') {
        const v = n.series[0]?.values;
        if (n.series.length !== 1) error(path + '.series', 'CHART_SHAPE', 'donut은 계열 하나만 허용합니다.');
        else if (A(v) && (v.some(x => typeof x !== 'number' || x < 0) || v.reduce((a, b) => a + b, 0) <= 0)) error(path + '.series[0].values', 'CHART_SHAPE', 'donut 값은 0 이상이며 합이 0보다 커야 합니다.');
        if (n.categories.length > 5) error(path + '.categories', 'CHART_SHAPE', 'donut은 범주 5개 이하입니다(그 이상은 막대 차트).');
      }
      if (n.series.length > 1 && n.kind === 'bars-h' && n.series.length > 3) error(path + '.series', 'CHART_SHAPE', '계열은 3개 이하입니다.');
    }
    // 새 차트 형태(stacked-bar·scatter·heatmap·sparkline)와 축 필드는 확장 명세가 켜진 카탈로그 버전(node-extensions.mjs)에서만 검사한다.
    if (t === 'chart' && nodeExtended('chart', input.catalogVersion)) {
      const series = A(n.series) ? n.series : [], categories = A(n.categories) ? n.categories : [];
      const pointKind = n.kind === 'scatter';
      if (!series.length) error(path + '.series', 'CHART_SHAPE', '차트 계열이 하나 이상 필요합니다.');
      if (!pointKind && categories.length < 2) error(path + '.categories', 'CHART_SHAPE', '이 차트는 범주 2개 이상이 필요합니다.');
      series.forEach((s, i) => {
        if (!plain(s)) return;
        if (pointKind) {
          if (!A(s.points) || s.points.length < 2) error(`${path}.series[${i}].points`, 'CHART_SHAPE', 'scatter 계열에는 좌표 점이 2개 이상 필요합니다.');
          if (Object.hasOwn(s, 'values')) error(`${path}.series[${i}].values`, 'CHART_SHAPE', 'scatter는 values 대신 x·y points를 사용합니다.');
        } else {
          if (!A(s.values) || s.values.length !== categories.length) error(`${path}.series[${i}].values`, 'CHART_SHAPE', '계열 값의 개수는 categories와 같아야 합니다.');
          if (Object.hasOwn(s, 'points')) error(`${path}.series[${i}].points`, 'CHART_SHAPE', '이 차트는 points를 받지 않습니다.');
        }
      });
      if (n.kind === 'stacked-bar' && (series.length < 2 || series.some(s => A(s.values) && s.values.some(v => v < 0)))) error(path + '.series', 'CHART_SHAPE', 'stacked-bar는 음이 아닌 값의 계열 2개 이상이 필요합니다.');
      if (n.kind === 'heatmap' && series.length < 2) error(path + '.series', 'CHART_SHAPE', 'heatmap은 행 2개 이상이 필요합니다.');
      if (n.kind === 'sparkline' && series.length !== 1) error(path + '.series', 'CHART_SHAPE', 'sparkline은 계열 하나만 허용합니다.');
      if (n.kind === 'donut') {
        const v = series[0]?.values;
        if (series.length !== 1) error(path + '.series', 'CHART_SHAPE', 'donut은 계열 하나만 허용합니다.');
        else if (A(v) && (v.some(x => typeof x !== 'number' || x < 0) || v.reduce((a, b) => a + b, 0) <= 0)) error(path + '.series[0].values', 'CHART_SHAPE', 'donut 값은 0 이상이며 합이 0보다 커야 합니다.');
        if (categories.length > 5) error(path + '.categories', 'CHART_SHAPE', 'donut은 범주 5개 이하입니다(그 이상은 막대 차트).');
      }
      if (n.series?.length > 1 && n.kind === 'bars-h' && n.series.length > 3) error(path + '.series', 'CHART_SHAPE', '계열은 3개 이하입니다.');
      const values = pointKind ? series.flatMap(s => (s.points ?? []).flatMap(p => [p.x, p.y]))
        : n.kind === 'stacked-bar' ? categories.map((_, i) => series.reduce((sum, s) => sum + (s.values?.[i] ?? 0), 0))
          : series.flatMap(s => s.values ?? []);
      if (plain(n.axis)) {
        if (Number.isFinite(n.axis.min) && Number.isFinite(n.axis.max) && n.axis.min >= n.axis.max) error(path + '.axis', 'CHART_AXIS', '축 범위는 min보다 max가 커야 합니다.');
        if (pointKind) {
          const xs = series.flatMap(s => (s.points ?? []).map(p => p.x)), ys = series.flatMap(s => (s.points ?? []).map(p => p.y));
          if (Number.isFinite(n.axis.xMin) && Number.isFinite(n.axis.xMax) && n.axis.xMin >= n.axis.xMax) error(path + '.axis', 'CHART_AXIS', 'X축 범위는 xMin보다 xMax가 커야 합니다.');
          if (Number.isFinite(n.axis.yMin) && Number.isFinite(n.axis.yMax) && n.axis.yMin >= n.axis.yMax) error(path + '.axis', 'CHART_AXIS', 'Y축 범위는 yMin보다 yMax가 커야 합니다.');
          if (Number.isFinite(n.axis.xMin) && xs.some(v => v < n.axis.xMin) || Number.isFinite(n.axis.xMax) && xs.some(v => v > n.axis.xMax)) error(path + '.axis', 'CHART_AXIS', 'X축 범위가 데이터 점을 잘라냅니다.');
          if (Number.isFinite(n.axis.yMin) && ys.some(v => v < n.axis.yMin) || Number.isFinite(n.axis.yMax) && ys.some(v => v > n.axis.yMax)) error(path + '.axis', 'CHART_AXIS', 'Y축 범위가 데이터 점을 잘라냅니다.');
        } else {
          if (Number.isFinite(n.axis.min) && values.some(v => v < n.axis.min)) error(path + '.axis.min', 'CHART_AXIS', '축 최솟값이 데이터보다 커서 값이 잘립니다.');
          if (Number.isFinite(n.axis.max) && values.some(v => v > n.axis.max)) error(path + '.axis.max', 'CHART_AXIS', '축 최댓값이 데이터보다 작아 값이 잘립니다.');
        }
      }
    }
    if (t === 'calendar' && A(n.events) && Number.isInteger(n.year) && Number.isInteger(n.month)) n.events.forEach((ev, i) => { if (plain(ev) && Number.isInteger(ev.day) && ev.day > DAYS(n.year, n.month)) error(`${path}.events[${i}].day`, 'CALENDAR_DAY', `${n.year}년 ${n.month}월에는 ${ev.day}일이 없습니다.`); });
    if (t === 'calendar' && Number.isInteger(n.today) && Number.isInteger(n.year) && Number.isInteger(n.month) && n.today > DAYS(n.year, n.month)) error(path + '.today', 'CALENDAR_DAY', `${n.year}년 ${n.month}월에는 ${n.today}일이 없습니다.`);
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
  // 2.5.0: 직접 작성한 Blueprint에도 변형 결과 계약을 적용한다. 오류 등급(V06)은 노드 검사가 이미 냈고, 여기서는 경고·진단(info)만 모은다. 거부하지 않는다.
  if (expr && plain(input.tree)) for (const w of assessBlueprintContracts(input.tree)) if (w.severity !== 'error') warnings.push({path: w.path, code: w.code, severity: w.severity, contract: w.id, message: `${w.id} · ${w.message}`});
  return {valid: errors.length === 0, errors, warnings};
}
