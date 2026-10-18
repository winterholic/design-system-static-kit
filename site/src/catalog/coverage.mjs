/**
 * Coverage map against the reference repository's axes (docs/evidence/peer-axes.json, names and counts only).
 * Every `ref` is checked by tests/catalog.test.mjs against the real catalog, so this table cannot drift or overclaim.
 * kind: shell | node | template | axis | combo (several refs). status: full | partial.
 */
export const layoutCoverage = {
  'Holy Grail (양쪽 사이드바 3단)': {kind: 'combo', refs: ['shell:sidebar', 'node:aside'], status: 'full', note: '사이드바 셸 + 본문·보조 영역'},
  'Dashboard (관리자 화면)': {kind: 'template', refs: ['template:dashboard-overview'], status: 'full', note: '사이드바 셸, 지표·차트·표'},
  'Landing Hero (첫 화면 크게)': {kind: 'node', refs: ['node:hero'], status: 'full', note: 'statement·split·centered·cover·product 5변형'},
  'Split (화면 반반)': {kind: 'combo', refs: ['node:split', 'shell:split'], status: 'full', note: '2분할 부품과 분할 셸'},
  'Modular Grid (지그재그 좌우교차)': {kind: 'node', refs: ['node:split'], status: 'full', note: 'reverse 값으로 좌우 교차'},
  'Bento (도시락 칸 나누기)': {kind: 'node', refs: ['node:bento'], status: 'full', note: '3~6칸, 첫 칸 2×2'},
  'List–Detail (목록 + 내용 · 메일함형)': {kind: 'node', refs: ['node:master-detail', 'template:inbox'], status: 'full', note: ''},
  'Magazine (잡지형)': {kind: 'combo', refs: ['shell:masthead', 'template:blog-index'], status: 'full', note: '제호형 머리'},
  'Centered (가운데 한 줄)': {kind: 'shell', refs: ['shell:centered'], status: 'full', note: ''},
  'Stacked (위에서 아래로 쌓기)': {kind: 'combo', refs: ['node:section', 'shell:stacked'], status: 'full', note: '섹션 쌓기와 2단 내비'},
  'Masonry (벽돌 쌓기 · 갤러리)': {kind: 'node', refs: ['node:gallery'], status: 'full', note: 'layout=masonry'},
  'Sticky Sidebar (한쪽 고정 · 구매박스형)': {kind: 'combo', refs: ['node:aside', 'node:buy-box'], status: 'full', note: 'sticky=yes'},
  'Anchor Long Page (앵커 탭 롱페이지)': {kind: 'combo', refs: ['node:section', 'node:toc', 'template:docs-reference'], status: 'full', note: 'section.anchor, 앵커 링크 검증, 자동 목차'},
  'Full-bleed Scroll (풀화면 몰입형)': {kind: 'combo', refs: ['node:hero', 'axis:width'], status: 'partial', note: 'cover 히어로와 full 폭. 스크롤 연동 연출은 정적 범위 밖'},
  'Card Feed (피드형 · SNS)': {kind: 'combo', refs: ['node:grid', 'node:card', 'template:blog-index'], status: 'full', note: ''},
  'Tabbed (탭 전환형)': {kind: 'node', refs: ['node:tabs'], status: 'full', note: 'ARIA 탭 + 화살표 키'},
  'Wizard Steps (단계별 진행)': {kind: 'combo', refs: ['node:stepper', 'template:onboarding-wizard'], status: 'full', note: ''},
  'Pricing Compare (요금제 비교표)': {kind: 'combo', refs: ['node:pricing', 'template:pricing-page'], status: 'full', note: '추천 플랜은 하나만'},
  'Grid Gallery (균일 격자 갤러리)': {kind: 'node', refs: ['node:gallery'], status: 'full', note: 'layout=grid'},
  'Cluster (태그 뭉치)': {kind: 'node', refs: ['node:tags'], status: 'full', note: ''},
  'Switcher (폭 따라 가로세로 전환)': {kind: 'node', refs: ['node:grid', 'node:feature-list'], status: 'full', note: '열 수가 폭에 따라 줄어듦'},
  'Cover (세로 가운데 + 상하 고정)': {kind: 'node', refs: ['node:hero'], status: 'full', note: 'variant=cover'},
  'Reel (가로 스크롤 줄)': {kind: 'node', refs: ['node:reel'], status: 'full', note: '키보드 스크롤 영역'},
  'Imposter (겹쳐 띄우기)': {kind: 'node', refs: ['node:media'], status: 'full', note: 'media.overlay 칩(불투명 면, 대비 검증 대상)'},
  'Frame (비율 고정 틀)': {kind: 'node', refs: ['node:media'], status: 'full', note: '16:9·4:3·1:1·3:4·21:9'},
  'Supporting Pane (본문 + 보조 패널)': {kind: 'node', refs: ['node:aside'], status: 'full', note: ''},
  'Kanban Board (칸반 · 상태별 세로 열)': {kind: 'combo', refs: ['node:kanban', 'template:project-board'], status: 'full', note: ''},
  'Timeline (시간순 세로줄)': {kind: 'node', refs: ['node:timeline'], status: 'full', note: ''},
  'Map + List (지도와 목록 나란히)': {kind: 'combo', refs: ['node:media', 'node:split', 'template:realty-detail'], status: 'partial', note: '지도는 자리 표시 일러스트(kind=map). 실제 지도 타일은 정적 코드 범위 밖'},
  'Chat (대화 · 좌우 교차 말풍선)': {kind: 'combo', refs: ['node:chat', 'template:team-chat'], status: 'full', note: ''},
  'Calendar Grid (달력 격자)': {kind: 'combo', refs: ['node:calendar', 'template:calendar-view'], status: 'full', note: '월 길이·요일 계산, 날짜 검증'},
  'Settings (설정 · 왼쪽 메뉴 + 오른쪽 폼)': {kind: 'template', refs: ['template:settings'], status: 'full', note: '탭 + 폼'},
  'Search Results (검색 결과 · 필터 + 목록)': {kind: 'combo', refs: ['node:filter-bar', 'node:pagination', 'template:product-listing'], status: 'full', note: ''},
  'Mega Menu (대형 메뉴 펼침)': {kind: 'combo', refs: ['shell:topbar', 'template:product-listing'], status: 'full', note: 'chrome.nav[].mega, details 기반(JS 없이 동작), 가로 셸에서 최대 2개'},
  'Menu 2단 (클래식 다이닝 메뉴판)': {kind: 'node', refs: ['node:menu'], status: 'full', note: 'layout=grid'},
  'Menu 점선 리더 (가격 우측 정렬형)': {kind: 'node', refs: ['node:menu'], status: 'full', note: 'layout=leader'},
  'Menu 사진 그리드 (카페·배달 메뉴)': {kind: 'combo', refs: ['node:menu', 'node:gallery', 'template:cafe-home'], status: 'partial', note: '메뉴 격자와 갤러리를 조합. 한 카드 안의 사진은 card variant=media로 대체'},
  'Menu 시그니처 강조 (골든 트라이앵글)': {kind: 'node', refs: ['node:menu'], status: 'partial', note: 'tag 배지로 시그니처 표시. 지면 배치 이론(골든 트라이앵글)은 구현하지 않음'},
};

export const contentCoverage = {
  menu: {template: 'menu-dining'}, 'beauty-detail': {template: 'beauty-detail'}, 'saas-landing': {template: 'saas-landing'}, portfolio: {template: 'portfolio-grid'},
  ecommerce: {template: 'product-detail'}, 'app-landing': {template: 'app-landing'}, clinic: {template: 'clinic-home'}, restaurant: {template: 'cafe-home'}, realestate: {template: 'realty-detail'},
};

/** Peer icon names that differ only by name from ours. */
export const iconAliases = {close: 'x', chevron: 'chevron-right', 'more-h': 'more', pin: 'map-pin', card: 'credit-card', alert: 'alert-triangle'};
