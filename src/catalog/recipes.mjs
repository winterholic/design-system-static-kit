/**
 * Design Recipe: 페이지 유형별로 "이미 검증한 권장 조합"을 구조화한 작은 데이터 계층(docs/recipes.md, ADR 0007).
 *
 * 새 테마·템플릿·변형을 만들지 않는다. 레시피는 기존 템플릿 id, 구성 변형 슬롯·옵션, 컨셉 look(테마+서체)을 고르는 선호 순서와,
 * 고른 결과가 지켜야 할 규칙 ID 목록이다. 조합을 금지하거나 지우지 않는다: 레시피가 밀어내는 조합도 조합 id·URL·갤러리·조립기에 그대로 남고
 * 명시적으로 고르면 예전처럼 적용된다(변형 결과 계약 V01~V05와 같은 정책, ADR 0006).
 * 자유 표현식·DSL·소비자 CSS는 없다. 검사 종류(check.kind)는 src/recipes.mjs 한 곳에 닫혀 있다.
 *
 * 규칙 ID: V01~V05(변형 결과 계약, variant-contracts.mjs)와 P01~P04(페이지 규칙, composition.mjs)는 그대로 쓰고, 레시피가 새로 필요로 하는 것만 RC로 더한다.
 */

/**
 * 레시피 규칙. `mode: 'select'`는 선택 함수가 트리·Blueprint·컴파일 결과로 직접 판정하고, `mode: 'measure'`는 선택 시점에 판정할 수 없는
 * 렌더 결과라서 브라우저 측정(scripts/design-qa/recipe-evidence.mjs, e2e/recipes.spec.mjs)이 판정한다.
 * `claim`은 scripts/design-qa/quality-claims.mjs의 측정 조건 id, `source`는 근거 결함이다.
 */
export const recipeRules = [
  {id: 'RC01', mode: 'select', claim: 'Q14', check: {kind: 'hero-visual', visuals: ['chart', 'device']},
    why: '랜딩의 첫 화면에는 제품이 무엇인지 보여 주는 시각 요소(제품 화면·차트) 1개가 있어야 한다. 없으면 빈 칸이 생기거나 SaaS와 무관한 장식이 그 자리를 채운다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B1·C2'},
  {id: 'RC02', mode: 'select', claim: 'Q06', check: {kind: 'title-hierarchy', ratio: 1.6, width: 1440},
    why: '히어로 제목은 섹션 제목의 1.6배 이상이어야 첫 화면의 위계가 선다. 촘촘한(tight) 스케일은 두 제목 차이를 줄인다(devtool 34px 대 24px).',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 C2, 7절'},
  {id: 'RC03', mode: 'select', claim: null, check: {kind: 'axis-fit'},
    why: '테마·서체·밀도·타입 스케일·셸이 레시피가 적은 범위 안이어야 한다. 테마가 셸을 바꾸면 같은 화면의 구성이 달라진다(진단 B6).',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B6'},
  {id: 'RC04', mode: 'select', claim: 'Q11', check: {kind: 'kpi-one-row', maxItems: 4},
    why: '핵심 지표 4개 이하는 넓은 화면에서 한 줄에 읽혀야 한다. 지표 격자의 열 수가 항목 수보다 적으면 첫 차트가 아래로 밀린다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B3'},
  {id: 'RC05', mode: 'select', claim: 'Q08', check: {kind: 'chart-fill', min: 0.6, soloWidths: ['wide', 'full']},
    why: '막대·선 차트는 데이터 최댓값이 축 최댓값의 60% 이상이어야 하고, 넓은 콘텐츠 폭(wide·full)에서 페이지 바로 아래에 혼자 놓여 가로로 늘어나지 않아야 한다(종횡 왜곡 1.5배 이하). 격자·보조 영역 안의 차트는 칸 폭에 맞아 늘어나지 않는다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 C4'},
  {id: 'RC06', mode: 'select', claim: 'Q12', check: {kind: 'left-axis'},
    why: '글 중심 페이지는 제목·섹션 머리말·본문이 한 정렬선(왼쪽)에 놓인다. 머리말만 가운데면 정렬선이 둘로 갈린다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 B4'},
  {id: 'RC07', mode: 'measure', claim: 'Q04', probe: null,
    why: '같은 행의 차트 카드는 아래가 비지 않아야 한다(빈 공간 96px 미만 또는 38% 미만). 렌더 결과라 브라우저로 잰다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 A4'},
  {id: 'RC08', mode: 'measure', claim: null, probe: 'ORPHAN_LINE',
    why: '제목·본문의 끝줄에 한두 글자만 남지 않는다(줄바꿈 정책). 렌더 결과라 텍스트 프로브가 0건인지로 잰다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 A6'},
  {id: 'RC09', mode: 'measure', claim: 'Q05', probe: 'BIG_NARROW',
    why: '320px에서 페이지 제목이 칸 폭에 비해 커서 3줄 이상이 되지 않는다. 렌더 결과라 레이아웃 프로브 BIG_NARROW가 0건인지로 잰다.',
    source: 'docs/quality-diagnosis-2026-11-21.md 4절 A5'},
];

/**
 * 레시피 3종.
 *  - templates: 권장 템플릿(선호 순서). 입력에 템플릿이 없으면 규칙을 모두 통과하는 첫 템플릿을 고른다.
 *  - layout: {슬롯: [옵션 선호 순서]}. 'default'는 슬롯을 바꾸지 않는 것. 여기 없는 슬롯은 건드리지 않는다.
 *  - looks: 템플릿 기본 테마가 규칙을 못 지킬 때 순서대로 시도하는 기존 컨셉 look. 템플릿 기본 테마가 언제나 먼저다.
 *  - fit: 어울리는 밀도·서체·스케일·셸. 규칙 RC03가 Blueprint 축 값으로 확인한다.
 *  - rules: 선택 결과가 지켜야 하는 규칙 ID. V·P·RC가 섞인다. select 규칙은 선택 함수가, measure 규칙은 브라우저 측정이 본다.
 *  - avoid: 피할 조합과 이유. `slot`·`option`은 구성 변형, `axis`·`value`는 Blueprint 축이다. 모두 `rule`이 그 조합을 왜 피하는지 설명한다
 *    (tests/recipes.test.mjs가 이 규칙이 실제로 그 조합을 걸러 내는지 대조한다).
 */
export const recipes = {
  'saas-landing': {
    label: 'SaaS 랜딩', pageTypes: ['landing'],
    purpose: '제품이 무엇인지 첫 화면에서 보여 주고 가입·문의로 잇는 제품 소개',
    content: {form: '히어로(제품 시각 요소 1개) → 기능 벤토 → 신뢰(로고·후기) → 요금·FAQ → CTA'},
    templates: ['saas-landing', 'b2b-solution', 'app-landing', 'devtool-landing', 'waitlist'],
    layout: {hero: ['default', 'product', 'split']},
    looks: [{concept: 'saas', look: 'trust'}, {concept: 'saas', look: 'workspace'}, {concept: 'saas', look: 'clean'}],
    fit: {density: ['comfortable', 'spacious'], scale: ['balanced', 'dramatic']},
    emphasis: {nodes: ['hero'], how: '히어로 제목은 섹션 제목의 1.6배 이상, 제품 시각 요소 1개, 행동 버튼 1개'},
    support: {nodes: ['bento', 'logo-cloud', 'quote', 'faq'], how: '벤토·신뢰 영역은 히어로와 같은 그림을 반복하지 않고 섹션 머리말과 본문이 한 정렬선'},
    rules: ['RC01', 'RC02', 'RC03', 'V01', 'V04', 'P01', 'P02'],
    avoid: [
      {slot: 'hero', option: 'statement', rule: 'V01', why: '큰 문장 히어로는 제품 시각 요소(visual)를 지운다(B1).'},
      {slot: 'hero', option: 'cover', rule: 'V01', why: '커버 히어로는 제품 시각 요소(visual)를 지운다(B1).'},
      {slot: 'heads', option: 'center', rule: 'V04', why: '섹션 머리말만 가운데로 옮기면 본문은 왼쪽에 남아 정렬선이 둘이 된다(B4).'},
      {axis: 'scale', value: 'tight', rule: 'RC02', why: '촘촘한 스케일은 히어로 제목과 섹션 제목의 차이를 1.6배 아래로 줄인다(C2, devtool 34px 대 24px).'},
    ],
  },
  'ops-dashboard': {
    label: '업무 대시보드', pageTypes: ['dashboard'],
    purpose: '핵심 지표를 한눈에 읽고 차트·표로 이어 판단하는 운영 화면',
    content: {form: 'KPI 한 줄 → 차트 행 → 표·목록'},
    templates: ['dashboard-overview', 'sales-dashboard', 'hr-people', 'finance-overview'],
    layout: {columns: ['default', 'two', 'three', 'four']},
    looks: [{concept: 'ops', look: 'workspace'}, {concept: 'ops', look: 'enterprise'}, {concept: 'ops', look: 'ledger'}],
    fit: {density: ['compact', 'comfortable'], scale: ['tight', 'balanced'], shell: ['sidebar', 'rail', 'topbar']},
    emphasis: {nodes: ['metric', 'chart'], how: 'KPI는 한 줄, 차트 도메인은 데이터로 채운다'},
    support: {nodes: ['table', 'list'], how: '같은 행의 카드는 높이를 맞추고 표·목록은 차트 아래에서 보조한다'},
    rules: ['RC03', 'RC04', 'RC05', 'RC07', 'V03', 'V05'],
    avoid: [
      {slot: 'columns', option: 'two', rule: 'V03', why: 'KPI 4개를 2열로 바꾸면 2행이 되어 첫 차트가 46% 아래로 밀린다(B3).'},
      {axis: 'shell', value: 'minimal', rule: 'RC03', why: '내비가 없는 셸은 대시보드의 화면 이동 구조를 없앤다(테마가 셸을 바꾸는 B6의 예).'},
    ],
  },
  'content-page': {
    label: '콘텐츠 페이지', pageTypes: ['article', 'docs'],
    purpose: '긴 글·문서·레퍼런스를 한 정렬선에서 끝까지 읽게 하는 화면',
    content: {form: '제목 → 본문(문단·소제목·인용·코드) → 보조 정보(목차·알림·표)'},
    templates: ['article', 'blog-post', 'research-paper', 'policy', 'docs-reference', 'tutorial'],
    layout: {intro: ['default', 'center']},
    looks: [{concept: 'editorial', look: 'journal'}, {concept: 'editorial', look: 'paper'}, {concept: 'editorial', look: 'newsroom'}],
    fit: {density: ['comfortable', 'spacious'], typography: ['serif', 'literary', 'bookish', 'editorial', 'humanist', 'sans', 'newsroom', 'tech']},
    emphasis: {nodes: ['page-header', 'prose'], how: '제목과 본문이 한 정렬선, 인용·코드는 본문 폭 안'},
    support: {nodes: ['notice', 'table', 'tags'], how: '알림·표·태그는 본문을 끊지 않는 보조 위치'},
    rules: ['RC03', 'RC06', 'RC08', 'RC09', 'V04'],
    avoid: [
      {slot: 'intro', option: 'center', rule: 'V04', why: '페이지 제목만 가운데로 옮기면 본문 첫 문단은 왼쪽에 남는다(B4).'},
      {axis: 'typography', value: 'condensed', rule: 'RC03', why: '압축 서체는 320px에서 제목이 칸 폭을 넘어 3줄이 된 적이 있다(A5, S28). 지금은 FIT이 막지만 읽기용 목록에는 넣지 않는다.'},
    ],
  },
};

export const recipeIds = Object.keys(recipes);
