/**
 * 레이아웃 패턴 24종(REQUEST §9.2, 계약 0.8.0 `layout` 재료). 레이아웃은 슬롯 계약과 폭 구간(bands)별 배치 표를 가진다.
 *
 * - 슬롯 계약: 이름·필수 여부·허용 콘텐츠(`group:<묶음>`·`purpose:<id>`·`layout:<id>`)·항목 수·순서(선언 순서가 DOM 순서)·흐름(반복 항목의 열 규칙)·길이 대응.
 * - 폭 구간: xs·sm·md·lg(컨테이너 폭 0·560·880·1180px). 구간마다 트랙과 영역 표(`areas`)를 따로 적는다. 좁은 폭은 전체를 줄이는 것이 아니라 슬롯의 자리를 다시 정한다.
 * - 컴파일은 src/layout.mjs(compileLayout), 조립은 src/platform/layouts.mjs(assembleLayout). 이 파일은 데이터와 등록 검사만 둔다.
 * - 칸의 내용은 목적 패밀리(purpose:*) 렌더 결과다. 레이아웃이 칸 안의 부품 CSS를 정하지 않는다.
 *
 * 영역 표 문법: 'a b | c d'는 두 행. `_`는 의도한 여백 칸이다. 트랙: 숫자는 비율(fr), [최소, 최대]는 rem 범위.
 * reorders: 영역 표의 행 우선 읽기 순서가 DOM 순서와 달라지는 구간(포커스 순서와 시각 순서가 어긋날 수 있어 선언해야 한다).
 */
import {definePlatformMaterial, axisValueId} from '../contract.mjs';
import {LAYOUT_BAND_NAMES, validateLayoutSpec} from '../../layout.mjs';

const BLOCK = ['group:card', 'group:table', 'group:form', 'group:feedback'];
const CARD = ['group:card'], NAV = ['group:navigation'], ACT = ['group:button'], FORM = ['group:form'], STATUS = ['group:feedback'];
const SIDE = ['group:card', 'group:feedback'];
const COPY = ['purpose:card.feature', 'purpose:card.article', 'purpose:button.emphasis'];
const MEDIA = ['purpose:card.gallery', 'purpose:card.product'];
const METRIC = ['purpose:card.kpi'];
const TABLE = ['group:table'];

const slot = (name, o = {}) => ({name, required: false, accepts: BLOCK, min: 0, max: 1, tag: 'div', ...o, ...(o.required ? {min: o.min ?? 1} : {})});
const req = (name, o = {}) => slot(name, {...o, required: true});
const grid = caps => ({mode: 'grid', caps});
const band = (columns, areas, o = {}) => ({columns, areas, ...o});

/** 레이아웃 정의. 순서는 REQUEST §9.2 목록 순서와 같다. name은 REQUEST 항목 이름 그대로다. */
const DEFS = [
  {
    key: 'single-column', name: 'Single Column', pattern: '읽기 폭 한 열. 넓은 화면에서 보조 슬롯이 오른쪽 여백으로 이동한다.',
    purposes: ['editorial-docs', 'saas-landing'], contexts: ['article', 'blog', 'docs', 'general'], needsBand: 'lg',
    container: {parent: 'main', width: 'standard', note: '본문 컨테이너(--kit-max) 안에서 가운데 정렬'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [slot('lead', {accepts: COPY, label: '도입'}), req('content', {max: 8, label: '본문'}), slot('aside', {accepts: SIDE, tag: 'aside', label: '곁글', sticky: [{from: 3, edge: 'top'}]})],
    bands: [
      band([1], 'lead | content | aside'),
      band([[0, 40]], 'lead | content | aside', {align: 'center'}),
      band([[0, 44]], 'lead | content | aside', {align: 'center'}),
      band([1, [0, 44], 1], '_ lead _ | _ content aside', {align: 'center', start: ['aside']}),
    ],
    rules: ['한 열의 읽기 폭은 44rem을 넘지 않는다(약 75자).', 'aside는 1180px 이상에서만 오른쪽 여백으로 나가고 그보다 좁으면 본문 아래에 쌓인다.'],
    length: {content: '긴 본문은 줄바꿈하고 높이는 제한하지 않는다.', aside: '곁글이 길면 여백 열 안에서 줄바꿈한다.'},
    nesting: {allow: ['layout:equal-grid', 'layout:two-column'], maxDepth: 2},
    prefers: [['purpose:card.article', 30, '글 카드는 읽기 폭 한 열에서 가장 잘 읽힌다']],
    reuses: ['layout-primitive:flow'],
  },
  {
    key: 'two-column', name: 'Two Column', pattern: '두 슬롯을 나란히 둔다. 좁으면 한 열로 쌓고, 넓으면 주 슬롯이 더 넓어진다.',
    purposes: ['saas-landing', 'work-dashboard', 'editorial-docs', 'commerce'], contexts: ['any'], needsBand: 'sm',
    container: {parent: 'section', width: 'standard', note: '섹션 안쪽 컨테이너'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [req('primary', {max: 6, label: '주'}), req('secondary', {max: 6, label: '보조'})],
    bands: [band([1], 'primary | secondary'), band([1, 1], 'primary secondary'), band([1, 1], 'primary secondary'), band([3, 2], 'primary secondary')],
    rules: ['560px 미만은 한 열이다(주 → 보조).', '1180px 이상에서 열 비율이 3:2로 바뀐다.'],
    length: {primary: '높이 제한 없음. 두 열의 높이가 달라도 늘리지 않는다(위쪽 정렬).', secondary: '위와 같다.'},
    nesting: {allow: ['layout:equal-grid', 'layout:single-column'], maxDepth: 2},
    prefers: [], reuses: ['layout-primitive:split'],
  },
  {
    key: 'three-column', name: 'Three Column', pattern: '본문을 앞에 두는 3분할. 좁으면 본문 → 좌 → 우 순서로 쌓고, 넓어지면 좌·본문·우로 펼친다.',
    purposes: ['work-dashboard', 'editorial-docs'], contexts: ['dashboard', 'community', 'docs', 'general'], needsBand: 'md',
    container: {parent: 'main', width: 'wide', note: '페이지 본문 컨테이너'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [req('center', {max: 6, label: '본문'}), req('left', {max: 4, tag: 'aside', label: '왼쪽 보조', accepts: SIDE.concat(NAV)}), req('right', {max: 4, tag: 'aside', label: '오른쪽 보조', accepts: SIDE})],
    bands: [band([1], 'center | left | right'), band([1, 1], 'center center | left right'), band([1, 2, 1], 'left center right'), band([1, 3, 1], 'left center right')],
    reorders: ['md', 'lg'],
    rules: ['DOM은 본문이 먼저다. 880px 이상에서만 시각 순서가 좌·본문·우가 된다.', '560~879px는 본문이 두 칸을 쓰고 좌·우가 그 아래에 나란히 놓인다.'],
    length: {center: '본문은 줄바꿈한다.', left: '보조 슬롯은 열 안에서 줄바꿈한다.', right: '위와 같다.'},
    nesting: {allow: ['layout:equal-grid', 'layout:single-column'], maxDepth: 2},
    prefers: [], reuses: ['component:grid'],
  },
  {
    key: 'equal-grid', name: 'Equal Grid', pattern: '같은 크기 칸의 격자. 열 수는 컨테이너 폭이 정하고 항목 수가 마지막 줄 한 칸 남음을 막는다.',
    purposes: ['saas-landing', 'work-dashboard', 'commerce'], contexts: ['any'], needsBand: 'md',
    container: {parent: 'section', width: 'wide', note: '섹션 안쪽 컨테이너'}, minContent: 240,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'gap'},
    slots: [slot('head', {accepts: COPY, label: '머리말'}), req('items', {accepts: CARD, min: 2, max: 12, flow: grid([1, 2, 3, 4]), label: '항목'})],
    bands: [band([1], 'head | items'), band([1], 'head | items'), band([1], 'head | items'), band([1], 'head | items')],
    rules: ['열 수 상한은 폭 구간마다 1·2·3·4다.', '실제 열 수는 bestCols(항목 수, 상한)이 정한다: 마지막 줄에 한 칸만 남기지 않는다.'],
    length: {items: '칸 높이는 같은 줄의 가장 긴 칸을 따른다. 칸 안 긴 제목은 줄바꿈한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.feature', 25, '같은 크기 기능 카드를 균등 격자에 둔다'], ['purpose:card.pricing', 15, '요금제 카드는 같은 크기로 비교해야 한다']],
    reuses: ['layout-primitive:flow', 'component:grid'],
  },
  {
    key: 'asymmetric-grid', name: 'Asymmetric Grid', pattern: '큰 칸 하나와 작은 칸 묶음. 폭마다 큰 칸의 비율과 작은 칸의 열 수가 바뀐다.',
    purposes: ['saas-landing', 'editorial-docs'], contexts: ['landing', 'portfolio', 'general'], needsBand: 'md',
    container: {parent: 'section', width: 'wide', note: '섹션 안쪽 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [req('feature', {accepts: CARD, label: '큰 칸'}), req('items', {accepts: CARD, min: 2, max: 4, flow: grid([1, 2, 1, 2]), label: '작은 칸'})],
    bands: [band([1], 'feature | items'), band([1], 'feature | items'), band([3, 2], 'feature items', {stretch: ['feature']}), band([2, 3], 'feature items', {stretch: ['feature']})],
    rules: ['큰 칸은 880px 이상에서 작은 칸 묶음과 나란히 놓이고 높이를 맞춘다(stretch).', '작은 칸의 열 수는 1 → 2 → 1 → 2로 바뀐다: 묶음이 차지하는 폭에 맞춘다.'],
    length: {feature: '큰 칸은 줄 높이를 채운다.', items: '작은 칸은 묶음 안에서 같은 크기다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [], reuses: [],
  },
  {
    key: 'masonry', name: 'Masonry', pattern: '높이가 다른 카드를 열 단위로 채우는 벽돌 배치(CSS 다단). 읽는 순서는 열 위에서 아래다.',
    purposes: ['commerce', 'editorial-docs', 'saas-landing'], contexts: ['community', 'portfolio', 'blog', 'listing', 'general'], needsBand: 'md',
    container: {parent: 'section', width: 'wide', note: '섹션 안쪽 컨테이너'}, minContent: 240,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'gap'},
    slots: [req('items', {accepts: CARD, min: 4, max: 16, flow: {mode: 'columns', caps: [1, 2, 3, 4]}, label: '항목'})],
    bands: [band([1], 'items'), band([1], 'items'), band([1], 'items'), band([1], 'items')],
    rules: ['열은 1·2·3·4개이고 항목은 열 위에서 아래로 채운다(break-inside: avoid).', '줄 정렬이 없으므로 순서가 중요한 목록(순위·단계)에는 쓰지 않는다.'],
    length: {items: '칸 높이는 내용이 정한다. 칸 사이 높이 차이는 허용한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.gallery', 30, '높이가 다른 사진 카드가 벽돌 배치에 어울린다']], reuses: ['component:gallery'],
  },
  {
    key: 'bento', name: 'Bento', pattern: '크기가 다른 칸을 빈틈 없이 맞춘다. 큰 칸은 4열에서 2×2, 좁으면 한 줄이다.',
    purposes: ['saas-landing', 'work-dashboard'], contexts: ['landing', 'dashboard', 'portfolio', 'general'], needsBand: 'lg',
    container: {parent: 'section', width: 'wide', note: '섹션 안쪽 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [slot('head', {accepts: COPY, label: '머리말'}), req('tiles', {accepts: CARD, min: 3, max: 6, flow: {mode: 'bento', caps: [1, 2, 2, 4]}, label: '칸'})],
    bands: [band([1], 'head | tiles'), band([1], 'head | tiles'), band([1], 'head | tiles'), band([1], 'head | tiles')],
    rules: ['칸 크기 표는 src/layout.mjs의 BENTO 표다(3~6칸). 모든 줄이 열을 채운다.', '1180px 이상은 4열이고 큰 칸이 2×2, 880~1179px는 2열, 560px 미만은 1열이다.', '한 칸짜리가 홀수 개이면 2열에서 마지막 칸이 줄 전체를 쓴다.'],
    length: {tiles: '칸 높이는 줄에서 가장 긴 칸을 따른다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.feature', 20, '기능 카드를 크기가 다른 칸으로 보여 준다']], reuses: ['layout-primitive:bento', 'component:bento'],
  },
  {
    key: 'sidebar-main', name: 'Sidebar Main', pattern: '내비게이션 열과 본문. 좁으면 내비가 본문 위에 쌓이고, 넓으면 고정 폭 열이 된다.',
    purposes: ['work-dashboard', 'editorial-docs'], contexts: ['dashboard', 'data', 'docs', 'settings', 'general'], needsBand: 'sm',
    container: {parent: 'page-shell', width: 'full', note: '셸 본문 영역 전체'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'compact', gap: 'gap', itemGap: 'item'},
    slots: [req('sidebar', {accepts: NAV, tag: 'aside', label: '사이드바', sticky: [{from: 1, edge: 'top'}]}), req('main', {max: 8, label: '본문'})],
    bands: [band([1], 'sidebar | main'), band([[12, 15], 1], 'sidebar main', {start: ['sidebar']}), band([[14, 16], 1], 'sidebar main', {start: ['sidebar']}), band([[16, 18], 1], 'sidebar main', {start: ['sidebar']})],
    rules: ['사이드바는 560px 이상에서 12~18rem 열이 되고 스크롤 중에도 위에 붙는다(sticky).', '560px 미만은 사이드바가 본문 위에 쌓인다.'],
    length: {sidebar: '내비 항목이 길면 줄바꿈한다.', main: '본문은 남은 폭을 모두 쓴다.'},
    nesting: {allow: ['layout:dashboard-grid', 'layout:equal-grid', 'layout:two-column', 'layout:kpi-strip'], maxDepth: 2},
    prefers: [['purpose:navigation.sidebar', 40, '사이드바 내비게이션이 이 구조의 목적이다']], reuses: ['component:aside'],
  },
  {
    key: 'double-sidebar', name: 'Double Sidebar', pattern: '왼쪽 내비·본문·오른쪽 보조. 1180px 미만에서는 보조가 본문 아래로 내려간다.',
    purposes: ['work-dashboard', 'editorial-docs'], contexts: ['dashboard', 'community', 'docs', 'general'], needsBand: 'lg',
    container: {parent: 'page-shell', width: 'full', note: '셸 본문 영역 전체'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable'], default: 'compact', gap: 'gap', itemGap: 'item'},
    slots: [req('left', {accepts: NAV, tag: 'aside', label: '왼쪽 내비', sticky: [{from: 2, edge: 'top'}]}), req('main', {max: 8, label: '본문'}), req('right', {accepts: SIDE, max: 4, tag: 'aside', label: '오른쪽 보조'})],
    bands: [band([1], 'left | main | right'), band([1, 2], 'left main | right main', {start: ['left', 'right']}), band([[14, 16], 1], 'left main | left right', {start: ['left', 'right']}), band([[14, 16], 1, [16, 20]], 'left main right', {start: ['left', 'right']})],
    rules: ['1180px 이상에서만 세 열이다. 880~1179px는 왼쪽 열과 본문, 오른쪽 보조가 본문 아래다.', '560~879px는 왼쪽·오른쪽 슬롯이 좁은 열에 쌓이고 본문이 넓은 열이다.'],
    length: {left: '내비는 열 안에서 줄바꿈한다.', main: '본문이 남는 폭을 쓴다.', right: '보조는 열 안에서 줄바꿈한다.'},
    nesting: {allow: ['layout:equal-grid', 'layout:kpi-strip'], maxDepth: 2},
    prefers: [], reuses: [],
  },
  {
    key: 'master-detail', name: 'Master-detail', pattern: '목록과 상세. 좁으면 쌓이고 넓으면 목록이 스크롤 영역이 되며, 가장 넓은 폭에서 메타 열이 생긴다.',
    purposes: ['work-dashboard', 'commerce'], contexts: ['dashboard', 'data', 'community', 'general'], needsBand: 'sm',
    container: {parent: 'page-shell', width: 'full', note: '셸 본문 영역 전체'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable'], default: 'compact', gap: 'gap', itemGap: 'near'},
    slots: [req('list', {accepts: CARD.concat(NAV), min: 2, max: 12, label: '목록', length: 'cap', sticky: [{from: 1, edge: 'top'}]}), req('detail', {max: 4, label: '상세'}), slot('meta', {accepts: SIDE, tag: 'aside', label: '메타'})],
    bands: [band([1], 'list | detail | meta'), band([[16, 20], 1], 'list detail | list meta', {start: ['list']}), band([[18, 22], 1], 'list detail | list meta', {start: ['list']}), band([[20, 26], 1, [14, 18]], 'list detail meta', {start: ['list', 'meta']})],
    rules: ['목록은 560px 이상에서 세로 스크롤 영역(최대 높이 min(70vh, 40rem))이고 위에 붙는다.', '1180px 이상에서만 메타가 상세 오른쪽 열이 된다.'],
    length: {list: '목록 항목이 많아도 영역 높이를 제한하고 안에서 스크롤한다.', detail: '상세는 높이를 제한하지 않는다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.profile', 20, '프로필 카드 목록과 상세 패널의 짝']], reuses: ['component:master-detail'],
  },
  {
    key: 'dashboard-grid', name: 'Dashboard Grid', pattern: '지표 줄·차트 영역·보조·표를 격자에 배치한다. 폭마다 열이 2 → 2 → 3 → 4로 늘어난다.',
    purposes: ['work-dashboard'], contexts: ['dashboard', 'data'], needsBand: 'md',
    container: {parent: 'page-shell', width: 'full', note: '셸 본문 영역 전체'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable'], default: 'compact', gap: 'gap', itemGap: 'item'},
    slots: [req('kpis', {accepts: METRIC, min: 2, max: 6, flow: grid([2, 2, 3, 4]), label: '지표'}), req('charts', {accepts: CARD, max: 3, label: '차트·요약'}), slot('side', {accepts: SIDE, tag: 'aside', label: '알림'}), req('table', {accepts: TABLE, max: 2, length: 'scroll-x', label: '표'})],
    bands: [band([1], 'kpis | charts | side | table'), band([1, 1], 'kpis kpis | charts side | table table'), band([1, 1, 1], 'kpis kpis kpis | charts charts side | table table table'), band([1, 1, 1, 1], 'kpis kpis kpis kpis | charts charts charts side | table table table table')],
    rules: ['지표 줄은 열 수 상한 2·2·3·4에서 마지막 줄에 한 칸만 남기지 않는다.', '880px 이상에서 알림이 차트 오른쪽 열로 올라간다. 표는 항상 전폭이고 가로로 넘치면 표 안에서만 스크롤한다.'],
    length: {kpis: '지표 값이 길어도 칸을 키우지 않는다(줄바꿈).', charts: '차트·요약 칸은 내용 높이다. 같은 줄의 알림이 더 길면 위쪽 정렬을 유지한다.', table: '표는 전폭이고 넘치면 슬롯 안에서 가로 스크롤한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.kpi', 40, '지표 카드가 이 격자의 첫 줄이다'], ['purpose:table.business', 30, '업무 표가 대시보드 아래 영역이다'], ['purpose:table.analytic', 20, '분석 표도 같은 영역을 쓴다']],
    reuses: ['pattern:dashboard-grid'],
  },
  {
    key: 'kpi-strip', name: 'KPI Strip', pattern: '지표를 한 줄로 늘어놓는다. 좁으면 2열, 560px에서 3열, 880px 이상에서 항목 수만큼 한 줄이다.',
    purposes: ['work-dashboard', 'saas-landing'], contexts: ['dashboard', 'data', 'landing', 'general'], needsBand: 'md',
    container: {parent: 'section', width: 'full', note: '섹션 안쪽 컨테이너(전폭 띠)'}, minContent: 240,
    density: {allowed: ['compact', 'comfortable'], default: 'compact', gap: 'item', itemGap: 'item'},
    slots: [slot('lead', {accepts: ['purpose:card.status', 'purpose:card.feature'], label: '띠 제목'}), req('metrics', {accepts: METRIC, min: 2, max: 6, flow: grid([2, 3, 5, 6]), label: '지표'})],
    bands: [band([1], 'lead | metrics'), band([1], 'lead | metrics'), band([1], 'lead | metrics'), band([[10, 12], 1], 'lead metrics', {start: ['lead']})],
    reorders: [],
    rules: ['지표 열 수 상한은 2·3·5·6이다. 항목이 5개 이하이면 880px 이상에서 한 줄이다(bestCols가 마지막 줄 한 칸 남음을 막는다).', '1180px 이상에서 띠 제목이 왼쪽 열이 된다.'],
    length: {metrics: '값 한 줄 + 라벨. 긴 값은 줄바꿈하고 칸 높이를 키운다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.kpi', 50, '지표 카드가 이 띠의 내용이다']], reuses: [],
  },
  {
    key: 'editorial-layout', name: 'Editorial Layout', pattern: '표제·그림·리드·본문·곁글의 편집 배치. 넓은 폭에서 리드·본문·곁글이 3열 읽기 줄을 이룬다.',
    purposes: ['editorial-docs'], contexts: ['article', 'blog', 'docs'], needsBand: 'lg',
    container: {parent: 'main', width: 'wide', note: '본문 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [slot('kicker', {accepts: ['purpose:card.status'], label: '분류'}), req('headline', {accepts: COPY, label: '표제'}), slot('figure', {accepts: MEDIA, label: '대표 그림'}), slot('lede', {accepts: ['purpose:card.article', 'purpose:card.feature'], label: '리드'}),
      req('body', {accepts: ['purpose:card.article'], max: 4, label: '본문'}), slot('aside', {accepts: SIDE, tag: 'aside', label: '곁글', sticky: [{from: 2, edge: 'top'}]})],
    bands: [band([1], 'kicker | headline | figure | lede | body | aside'), band([[0, 40]], 'kicker | headline | figure | lede | body | aside', {align: 'center'}),
      band([1, [14, 18]], 'kicker kicker | headline headline | figure figure | lede lede | body aside', {start: ['aside']}), band([2, 5, 3], 'kicker kicker kicker | headline headline headline | figure figure figure | lede body aside', {start: ['aside']})],
    rules: ['1180px 이상: 표제와 그림은 전폭, 그 아래 리드·본문·곁글이 2:5:3 3열이다.', '880~1179px: 본문과 곁글이 2열이고 리드가 전폭이다.', '본문은 어느 폭에서도 읽기 폭(44rem)을 넘지 않게 열 비율로 제한한다.'],
    length: {headline: '긴 표제는 줄바꿈한다.', body: '본문 길이는 제한하지 않는다.', aside: '곁글이 길면 열 안에서 줄바꿈한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.article', 40, '글 카드가 편집 배치의 본문이다']], reuses: ['pattern:editorial-article'],
  },
  {
    key: 'split-hero', name: 'Split Hero', pattern: '글 영역과 시각 영역을 나눈 히어로. 좁으면 쌓고 넓으면 5:7 두 칸이다.',
    purposes: ['saas-landing', 'commerce'], contexts: ['landing', 'pricing', 'commerce', 'general'], needsBand: 'md',
    container: {parent: 'section', width: 'wide', note: '히어로 섹션 안쪽 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'spacious', gap: 'gap', itemGap: 'item'},
    slots: [req('copy', {accepts: COPY, label: '글'}), slot('actions', {accepts: ACT, max: 2, flow: {mode: 'row', caps: [1, 2, 2, 2]}, label: '행동'}), req('media', {accepts: MEDIA, label: '시각'})],
    bands: [band([1], 'copy | actions | media'), band([[0, 40]], 'copy | actions | media', {align: 'center'}), band([1, 1], 'copy media | actions media', {start: ['copy', 'actions'], stretch: ['media']}), band([5, 7], 'copy media | actions media', {start: ['copy', 'actions'], stretch: ['media']})],
    reorders: ['md', 'lg'],
    rules: ['880px 이상에서 글·행동이 왼쪽 열, 시각이 오른쪽 열이다(열 순서로 읽으면 DOM 순서와 같다).', '행동 버튼은 560px 미만에서 세로로 쌓이고 그 이상은 가로 줄이다.'],
    length: {copy: '글 칸이 길면 높이가 늘고 시각 칸이 같이 늘어난다.', media: '시각 칸은 열 높이를 채운다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:button.emphasis', 30, '강조 배너는 히어로 글 영역에 쓴다']], reuses: ['component:hero'],
  },
  {
    key: 'centered-hero', name: 'Centered Hero', pattern: '가운데 정렬 히어로. 행동 버튼은 좁으면 세로, 넓으면 가로이고 증거 지표는 열이 늘어난다.',
    purposes: ['saas-landing'], contexts: ['landing', 'pricing', 'general'], needsBand: 'sm',
    container: {parent: 'section', width: 'narrow', note: '히어로 섹션 안쪽 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'spacious', gap: 'gap', itemGap: 'item'},
    slots: [req('copy', {accepts: COPY, label: '글'}), slot('actions', {accepts: ACT, max: 2, flow: {mode: 'row', caps: [1, 2, 2, 2]}, label: '행동'}), slot('proof', {accepts: METRIC, min: 2, max: 4, flow: grid([1, 2, 3, 4]), label: '증거 지표'})],
    bands: [band([1], 'copy | actions | proof'), band([[0, 40]], 'copy | actions | proof', {align: 'center'}), band([[0, 48]], 'copy | actions | proof', {align: 'center'}), band([[0, 56]], 'copy | actions | proof', {align: 'center'})],
    rules: ['글·행동·증거는 항상 한 열로 가운데 정렬이고 폭 한도가 40·48·56rem으로 커진다.', '행동은 560px 미만에서 세로, 그 이상은 가로이고 증거 지표 열 상한은 1·2·3·4다.'],
    length: {copy: '글 길이는 제한하지 않는다.', proof: '지표 값은 줄바꿈한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:button.emphasis', 30, '강조 배너는 히어로 글 영역에 쓴다']], reuses: ['component:hero'],
  },
  {
    key: 'media-hero', name: 'Media Hero', pattern: '큰 시각 위에 글 패널이 겹친다. 좁으면 겹치지 않고 쌓는다.',
    purposes: ['saas-landing', 'commerce'], contexts: ['landing', 'portfolio', 'commerce', 'general'], needsBand: 'md',
    container: {parent: 'section', width: 'wide', note: '히어로 섹션 안쪽 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'spacious', gap: 'gap', itemGap: 'item'},
    slots: [req('media', {accepts: MEDIA, label: '시각'}), req('copy', {accepts: COPY, label: '글 패널'}), slot('actions', {accepts: ACT, max: 2, flow: {mode: 'row', caps: [1, 2, 2, 2]}, label: '행동'})],
    bands: [band([1], 'media | copy | actions'), band([1], 'media | copy | actions'), band([1], 'media | copy | actions', {pull: {copy: 5}}), band([1, 4, 1], 'media media media | _ copy _ | _ actions _', {pull: {copy: 8}, align: 'center'})],
    rules: ['글 패널은 880px 이상에서 위로 5rem(880px) 또는 8rem(1180px) 끌어올려 시각의 아래쪽과 겹친다(칸 간격을 빼면 실제 겹침은 약 56px·104px).', '겹친 패널은 불투명한 표면 배경과 안쪽 여백을 가져 글 대비를 시각에 맡기지 않는다.', '560px 미만과 560~879px는 겹치지 않고 시각 → 글 → 행동으로 쌓는다.'],
    length: {media: '시각은 전폭이고 자기 비율로 높이를 만든다.', copy: '패널은 글 길이만큼 늘고 시각을 가리는 높이는 끌어올린 값(5·8rem)으로 제한된다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [], reuses: ['component:hero'],
  },
  {
    key: 'product-detail-layout', name: 'Product Detail Layout', pattern: '갤러리·상품 정보·구매 영역·상세·관련 상품. 넓으면 갤러리가 왼쪽 열을 차지하고 구매 영역이 위에 붙는다.',
    purposes: ['commerce'], contexts: ['commerce'], needsBand: 'md',
    container: {parent: 'main', width: 'wide', note: '본문 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [req('gallery', {accepts: ['purpose:card.gallery', 'purpose:card.product'], label: '갤러리'}), req('info', {accepts: ['purpose:card.product', 'purpose:card.pricing'], label: '상품 정보'}), req('buy', {accepts: ACT.concat(FORM), max: 3, flow: {mode: 'row', caps: [1, 1, 1, 1]}, sticky: [{from: 2, edge: 'top'}], label: '구매'}),
      slot('details', {accepts: SIDE, max: 4, label: '상세'}), slot('related', {accepts: ['purpose:card.product'], min: 2, max: 4, flow: grid([1, 2, 3, 4]), label: '관련 상품'})],
    bands: [band([1], 'gallery | info | buy | details | related'), band([1, 1], 'gallery gallery | info buy | details details | related related', {start: ['info', 'buy']}),
      band([1, 1], 'gallery info | gallery buy | details details | related related', {start: ['info', 'buy']}), band([7, 5], 'gallery info | gallery buy | details details | related related', {start: ['info', 'buy']})],
    rules: ['구매 영역은 880px 이상에서 상세 스크롤 중에도 위에 붙는다(sticky).', '관련 상품 열 상한은 1·2·3·4다. 갤러리 비율은 880px에서 1:1, 1180px에서 7:5다.'],
    length: {gallery: '갤러리는 열 폭에 맞춰 자기 비율로 높이를 만든다.', info: '긴 상품명은 줄바꿈한다.', buy: '구매 버튼은 열 폭을 채운다.', related: '칸은 같은 크기다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.product', 40, '상품 카드가 상세·관련 상품의 내용이다'], ['purpose:card.gallery', 30, '갤러리 카드가 상품 사진 영역이다']], reuses: ['pattern:commerce-detail'],
  },
  {
    key: 'commerce-grid', name: 'Commerce Grid', pattern: '필터·도구줄·상품 격자. 880px 이상에서 필터가 왼쪽 열이 되고 상품은 최대 3열이다.',
    purposes: ['commerce'], contexts: ['commerce', 'listing'], needsBand: 'md',
    container: {parent: 'main', width: 'wide', note: '본문 컨테이너'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'gap'},
    slots: [slot('toolbar', {accepts: FORM.concat(ACT), max: 2, label: '도구줄'}), slot('filters', {accepts: FORM, max: 3, tag: 'aside', label: '필터', sticky: [{from: 2, edge: 'top'}]}), req('products', {accepts: ['purpose:card.product'], min: 2, max: 12, flow: grid([1, 2, 2, 3]), label: '상품'})],
    bands: [band([1], 'toolbar | filters | products'), band([1], 'toolbar | filters | products'), band([[14, 16], 1], 'toolbar toolbar | filters products', {start: ['filters']}), band([[14, 16], 1], 'toolbar toolbar | filters products', {start: ['filters']})],
    rules: ['필터는 880px 이상에서 14~16rem 왼쪽 열이고 위에 붙는다. 그보다 좁으면 상품 위에 쌓인다.', '상품 열 상한은 1·2·2·3이다(필터 열을 뺀 폭 기준). 도구줄은 어느 폭에서도 상품 위 전폭이다.'],
    length: {products: '상품명이 길면 줄바꿈하고 칸 높이는 같은 줄에서 같다.', filters: '필터가 길면 열 안에서 줄바꿈한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.product', 50, '상품 카드가 이 격자의 내용이다'], ['purpose:form.filter', 30, '필터 폼이 왼쪽 열의 내용이다']], reuses: ['pattern:commerce-listing'],
  },
  {
    key: 'settings-layout', name: 'Settings Layout', pattern: '설정 내비게이션·설정 구역·도움말. 좁으면 내비가 위에, 저장 영역이 아래에 붙는다.',
    purposes: ['work-dashboard'], contexts: ['settings', 'form', 'dashboard'], needsBand: 'md',
    container: {parent: 'page-shell', width: 'standard', note: '셸 본문 영역'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'gap'},
    slots: [req('nav', {accepts: NAV, tag: 'aside', label: '설정 내비', sticky: [{from: 2, edge: 'top'}]}), req('sections', {accepts: FORM, max: 8, label: '설정 구역'}), slot('help', {accepts: SIDE, max: 2, tag: 'aside', label: '도움말'}),
      slot('actions', {accepts: ACT, max: 2, flow: {mode: 'row', caps: [2, 2, 2, 2]}, sticky: [{from: 0, until: 2, edge: 'bottom'}], label: '저장'})],
    bands: [band([1], 'nav | sections | help | actions'), band([1], 'nav | sections | help | actions'), band([[14, 16], 1], 'nav sections | nav help | nav actions', {start: ['nav']}), band([[14, 16], [0, 46], [14, 18]], 'nav sections help | nav actions help', {start: ['nav', 'help']})],
    rules: ['저장 영역은 880px 미만에서 화면 아래에 붙고(sticky bottom) 그 이상에서는 설정 구역 아래에 놓인다.', '1180px 이상에서 도움말이 오른쪽 열이 된다. 설정 구역은 46rem을 넘지 않는다.'],
    length: {nav: '설정 내비 항목이 길면 줄바꿈한다.', sections: '구역이 길어도 높이를 제한하지 않는다.', actions: '저장 영역은 항상 보이고 버튼은 줄바꿈하지 않는다(최대 2개).'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:form.settings', 50, '설정 폼이 이 구조의 구역이다'], ['purpose:navigation.tabs', 20, '탭 내비게이션이 설정 구역 이동에 쓰인다']], reuses: ['pattern:admin-settings'],
  },
  {
    key: 'documentation-layout', name: 'Documentation Layout', pattern: '문서 내비·목차·본문. 넓은 폭에서 목차가 오른쪽으로 옮겨가고 본문은 읽기 폭으로 제한된다.',
    purposes: ['editorial-docs'], contexts: ['docs', 'article'], needsBand: 'lg',
    container: {parent: 'page-shell', width: 'wide', note: '셸 본문 영역'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable'], default: 'compact', gap: 'gap', itemGap: 'item'},
    slots: [req('nav', {accepts: NAV, tag: 'aside', label: '문서 내비', sticky: [{from: 2, edge: 'top'}]}), slot('toc', {accepts: NAV, tag: 'aside', label: '목차', sticky: [{from: 3, edge: 'top'}]}), req('content', {accepts: ['purpose:card.article'], max: 8, label: '본문'})],
    bands: [band([1], 'nav | toc | content'), band([1], 'nav | toc | content'), band([[14, 16], 1], 'nav toc | nav content', {start: ['nav', 'toc']}), band([[14, 16], [0, 46], [12, 14]], 'nav content toc', {align: 'center', start: ['nav', 'toc']})],
    reorders: ['lg'],
    rules: ['목차는 1180px 이상에서만 오른쪽 열이고, 그보다 좁으면 본문 앞에 쌓인다(DOM 순서).', '본문은 46rem을 넘지 않는다. 1180px 이상은 내비·본문·목차가 가운데 정렬된다.'],
    length: {nav: '문서 내비 항목이 길면 줄바꿈한다.', content: '긴 코드·표는 본문 안에서 넘치지 않는다(max-width: 100%).', toc: '목차 항목이 길면 줄바꿈한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:card.article', 40, '글 카드가 문서 본문이다'], ['purpose:navigation.sidebar', 30, '사이드바 내비게이션이 문서 트리다']], reuses: ['pattern:docs-reference'],
  },
  {
    key: 'mobile-stack', name: 'Mobile Stack', pattern: '모바일 우선 쌓기. 행동 영역이 화면 아래에 붙고, 넓어지면 머리·본문·행동이 좁은 3열 띠가 된다.',
    purposes: ['commerce', 'work-dashboard'], contexts: ['any'], needsBand: 'md',
    container: {parent: 'main', width: 'narrow', note: '본문 컨테이너'}, minContent: 240,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [slot('header', {accepts: COPY, label: '머리'}), req('content', {max: 8, flow: grid([1, 2, 1, 1]), label: '본문'}), slot('actions', {accepts: ACT, max: 3, flow: {mode: 'row', caps: [1, 2, 1, 1]}, sticky: [{from: 0, until: 2, edge: 'bottom'}], label: '행동'})],
    bands: [band([1], 'header | content | actions'), band([1], 'header | content | actions'), band([[12, 14], [0, 34]], 'header content | header actions', {align: 'center', start: ['header', 'actions']}), band([[14, 16], [0, 36], [18, 22]], 'header content actions', {align: 'center', start: ['header', 'actions']})],
    rules: ['행동 영역은 880px 미만에서 화면 아래에 붙는다(sticky bottom).', '본문은 560~879px에서 2열 타일이고 880px 이상에서는 34~36rem 한 열로 제한된다.', '880~1179px는 머리가 왼쪽 띠, 1180px 이상은 머리·본문·행동이 3열이다.'],
    length: {content: '본문 항목은 한 열에서 길이를 제한하지 않는다.', actions: '행동 영역은 최대 3개이고 좁으면 세로로 쌓인다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [], reuses: ['layout-primitive:stack'],
  },
  {
    key: 'sticky-action-layout', name: 'Sticky Action Layout', pattern: '본문과 요약, 항상 보이는 행동 영역. 좁으면 행동이 화면 아래 바, 넓으면 요약이 오른쪽에 붙는다.',
    purposes: ['commerce', 'work-dashboard'], contexts: ['commerce', 'form', 'settings', 'general'], needsBand: 'md',
    container: {parent: 'main', width: 'wide', note: '본문 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [req('content', {max: 8, label: '본문'}), req('actions', {accepts: ACT, max: 3, flow: {mode: 'row', caps: [2, 2, 2, 2]}, sticky: [{from: 0, edge: 'bottom'}], label: '행동'}), req('summary', {accepts: SIDE, max: 2, tag: 'aside', label: '요약', sticky: [{from: 2, edge: 'top'}]})],
    bands: [band([1], 'content | actions | summary'), band([1], 'content | actions | summary'), band([1, [18, 22]], 'content summary | actions summary', {start: ['summary']}), band([1, [22, 26]], 'content summary | actions summary', {start: ['summary']})],
    reorders: ['md', 'lg'],
    rules: ['행동 영역은 모든 폭에서 위치를 고정한다(sticky bottom): 좁으면 화면 아래 바, 880px 이상은 본문 열 아래 바.', '요약은 880px 이상에서 오른쪽 열이고 위에 붙는다. 그보다 좁으면 행동 영역 뒤에 쌓인다.'],
    length: {actions: '행동 버튼은 최대 3개이고 좁으면 줄바꿈한다. 영역은 항상 보인다.', content: '본문이 길어도 행동 영역은 보인다.', summary: '요약이 길면 열 안에서 줄바꿈한다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:button.primary', 40, '주 행동 버튼이 고정 영역의 내용이다']], reuses: [],
  },
  {
    key: 'form-layout', name: 'Form Layout', pattern: '소개·입력 필드·도움말·제출. 필드는 560px 이상에서 2열이고, 1180px 이상에서 소개와 도움말이 양옆으로 나간다.',
    purposes: ['saas-landing', 'work-dashboard', 'commerce'], contexts: ['form', 'auth', 'settings', 'general'], needsBand: 'md',
    container: {parent: 'main', width: 'standard', note: '본문 컨테이너'}, minContent: 280,
    density: {allowed: ['compact', 'comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [slot('intro', {accepts: COPY, label: '소개'}), req('fields', {accepts: FORM, min: 1, max: 12, flow: grid([1, 2, 2, 2]), label: '입력'}), slot('aside', {accepts: STATUS.concat(['purpose:card.status']), max: 2, tag: 'aside', label: '도움말'}), req('actions', {accepts: ACT, max: 3, flow: {mode: 'row', caps: [1, 2, 2, 2]}, label: '제출'})],
    bands: [band([1], 'intro | fields | aside | actions'), band([1], 'intro | fields | aside | actions'), band([[0, 44]], 'intro | fields | aside | actions', {align: 'center'}), band([[12, 14], [0, 42], [12, 14]], 'intro fields aside | _ actions _', {align: 'center', start: ['intro', 'aside']})],
    rules: ['입력 필드 열 상한은 1·2·2·2이고 마지막 줄에 한 칸만 남기지 않는다(bestCols).', '1180px 이상에서 소개가 왼쪽 열, 도움말이 오른쪽 열이 되고 제출은 입력 아래에 붙는다.'],
    length: {fields: '긴 라벨은 줄바꿈하고 입력 폭은 칸 폭이다.', actions: '제출 버튼은 좁으면 세로로 쌓인다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:form.group', 40, '필드 묶음이 입력 슬롯의 내용이다'], ['purpose:form.auth', 30, '인증 폼도 입력 슬롯에 놓인다']], reuses: ['component:form'],
  },
  {
    key: 'multi-step-form', name: 'Multi-step Form', pattern: '단계 표시줄·현재 단계 패널·요약·이전/다음. 단계 표시줄은 항상 위에, 요약은 넓은 폭에서 오른쪽에 붙는다.',
    purposes: ['commerce', 'work-dashboard', 'saas-landing'], contexts: ['form', 'commerce', 'auth', 'general'], needsBand: 'md',
    container: {parent: 'main', width: 'wide', note: '본문 컨테이너'}, minContent: 280,
    density: {allowed: ['comfortable', 'spacious'], default: 'comfortable', gap: 'gap', itemGap: 'item'},
    slots: [req('steps', {accepts: NAV.concat(['purpose:feedback.progress']), label: '단계 표시줄'}), req('panel', {accepts: FORM, max: 3, label: '현재 단계'}), slot('summary', {accepts: SIDE, max: 2, tag: 'aside', label: '요약', sticky: [{from: 2, edge: 'top'}]}),
      req('actions', {accepts: ACT, max: 3, flow: {mode: 'row', caps: [1, 2, 2, 2]}, sticky: [{from: 0, until: 2, edge: 'bottom'}], label: '이전·다음'})],
    bands: [band([1], 'steps | panel | summary | actions'), band([1], 'steps | panel | summary | actions'), band([1, [14, 18]], 'steps steps | panel summary | actions summary', {start: ['summary']}), band([1, [18, 22]], 'steps steps | panel summary | actions summary', {start: ['summary']})],
    rules: ['단계 표시줄은 모든 폭에서 맨 위 전폭이다.', '이전·다음은 880px 미만에서 화면 아래에 붙고 그 이상에서는 패널 아래에 놓인다.', '요약은 880px 이상에서 오른쪽 열이고 위에 붙는다.'],
    length: {steps: '단계 표시줄은 단계 이름이 길면 줄바꿈한다.', panel: '현재 단계 패널은 높이를 제한하지 않는다.', actions: '버튼은 좁으면 세로로 쌓인다.'},
    nesting: {allow: [], maxDepth: 1},
    prefers: [['purpose:feedback.progress', 40, '진행 표시가 단계 표시줄의 내용이다'], ['purpose:form.group', 30, '필드 묶음이 단계 패널의 내용이다']], reuses: ['component:stepper'],
  },
];

/** `purpose:`·`group:` 접두를 뺀 슬롯이 받는 목적 패밀리 묶음. 관계 그래프의 계산 관계가 이 값을 읽는다. */
export const layoutAccepts = (layout, purposeId) => layout.slots.filter(s => s.accepts.includes(purposeId) || s.accepts.includes(`group:${purposeId.slice('purpose:'.length).split('.')[0]}`)).map(s => s.name);

const idOf = d => `layout:${d.key}`;

/** 관계: 선언한 `prefers`(목적 패밀리), 폭 축의 한계는 계산 관계가 본다. 가로 내비 열이 이미 있는 셸과의 중복은 avoids, 44px 터치 칸이 필요한 고정 행동 영역은 compact와 forbids다. */
const NAV_SHELL_AVOID = new Set(['sidebar-main', 'double-sidebar', 'settings-layout', 'documentation-layout']);
const TOUCH_FIXED = new Set(['mobile-stack', 'sticky-action-layout', 'multi-step-form', 'settings-layout']);

function relationsOf(d) {
  const out = d.prefers.map(([to, priority, reason]) => ({type: 'prefers', to, priority, reason: `${reason}`}));
  if (NAV_SHELL_AVOID.has(d.key)) for (const shell of ['sidebar', 'rail']) out.push({type: 'avoids', to: axisValueId('shell', shell), priority: 40, reason: `이 레이아웃이 자기 내비게이션 열을 가지므로 ${shell} 셸의 224~280px 내비 열과 겹쳐 내비 열이 둘이 된다(X02와 같은 이유)`});
  if (TOUCH_FIXED.has(d.key)) out.push({type: 'forbids', to: axisValueId('density', 'compact'), priority: 100, reason: '화면 아래에 붙는 행동 영역의 버튼은 44px 이상 터치 칸이 필요한데 compact 밀도의 컨트롤 높이는 40px이다', when: {density: ['compact']}, evidence: 'SPACE.compact.control=40 < 44'});
  return out;
}

/** verified 근거: 이 재료를 실패시킬 수 있는 시험의 줄(tests/layout-quality.test.mjs). 값이 렌더에 쓰이는지, 슬롯 계약이 거부하는지, 관계 그래프를 거치는지, 브라우저 실측이 현재 출력과 맞는지를 본다.
 *  시험 파일을 고쳐 줄이 밀리면 coverage:materials:check가 유효하지 않은 근거로 드러낸다. */
export const LAYOUT_EVIDENCE = Object.freeze([
  'tests/layout-quality.test.mjs:149', 'tests/layout-quality.test.mjs:187', 'tests/layout-quality.test.mjs:275', 'tests/layout-quality.test.mjs:311', 'tests/layout-quality.test.mjs:341',
]);

const toRecord = (d, evidence) => definePlatformMaterial({
  id: idOf(d), kind: 'layout', label: d.name, contexts: d.contexts, tags: ['layout', d.key, ...d.purposes],
  pattern: d.pattern, purposes: d.purposes, container: d.container, minContent: d.minContent, minCol: d.minCol ?? 200, density: d.density, slots: d.slots.map(s => (s.accepts === BLOCK ? {...s, accepts: [...s.accepts, ...d.nesting.allow]} : s)), bands: d.bands,
  reorders: d.reorders ?? [], needsBand: d.needsBand, rules: d.rules, length: d.length, nesting: d.nesting,
  relations: relationsOf(d), reuses: d.reuses,
  quality: evidence.length ? {status: 'verified', evidence: [...evidence]} : {status: 'implemented', evidence: []},
});

/** 등록할 레이아웃 재료 24종. evidence: 레이아웃 품질 테스트의 `tests/layout-quality.test.mjs:<줄>` 목록(등록 시 verified 근거). */
export const buildLayouts = (evidence = LAYOUT_EVIDENCE) => DEFS.map(d => toRecord(d, evidence));
export const LAYOUT_KEYS = Object.freeze(DEFS.map(d => d.key));
export const LAYOUTS = Object.freeze(buildLayouts());

/** 등록 때 레지스트리가 부르는 의미 검사(validators.layout). 슬롯·구간·최소 폭·순서 선언의 일관성과 관계 대상의 종류를 본다. */
export function validateLayout(m) {
  const out = validateLayoutSpec(m);
  const err = (code, path, message) => out.push({code, path, message});
  if (!LAYOUT_BAND_NAMES.includes(m.needsBand)) err('P_LAYOUT_NEEDS', '$.needsBand', `needsBand는 ${LAYOUT_BAND_NAMES.join('·')}입니다`);
  for (const k of ['density', 'container', 'length', 'nesting']) if (typeof m[k] !== 'object' || m[k] === null) err('P_LAYOUT_FIELD', `$.${k}`, `${k}는 객체입니다`);
  if (m.density && (!Array.isArray(m.density.allowed) || !m.density.allowed.includes(m.density.default))) err('P_LAYOUT_DENSITY', '$.density', '기본 밀도는 허용 밀도 안에 있어야 합니다');
  for (const s of m.slots) if (!m.length[s.name] && s.required) err('P_LAYOUT_LENGTH', `$.length.${s.name}`, `필수 슬롯 ${s.name}의 콘텐츠 길이 대응이 없습니다`);
  if (!m.rules.length) err('P_LAYOUT_RULES', '$.rules', '열 수·배치 규칙이 비었습니다');
  if (!m.purposes.length) err('P_LAYOUT_PURPOSES', '$.purposes', '적용 가능한 페이지 목적이 비었습니다');
  if (m.nesting && !Array.isArray(m.nesting.allow)) err('P_LAYOUT_NEST', '$.nesting.allow', '중첩 허용 목록은 배열입니다');
  for (const id of m.nesting?.allow ?? []) if (!m.slots.some(s => s.accepts.includes(id))) err('P_LAYOUT_NEST', '$.nesting.allow', `${id}를 받는 슬롯이 없어 중첩 허용이 쓸모없습니다`);
  return out;
}
