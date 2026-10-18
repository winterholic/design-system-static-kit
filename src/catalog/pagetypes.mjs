/**
 * Page-type contracts. A page type fixes which parts a page must/may contain and which shells and widths it may use.
 * `require` is a list of alternatives: every group needs at least one node type present anywhere in the tree.
 */
const ALL_SHELLS = ['sidebar', 'topbar', 'editorial', 'split', 'rail', 'centered', 'stacked', 'dock', 'minimal', 'masthead'];
const without = (...drop) => ALL_SHELLS.filter(s => !drop.includes(s));
const BUSINESS_FORBID = ['hero', 'pricing', 'cta', 'logo-cloud', 'quote'];
const MARKETING = ['hero', 'pricing', 'logo-cloud'];
const INTERACTIVE_APP = ['kanban', 'master-detail', 'chat', 'calendar'];

export const pageTypes = {
  general: {label: '일반', description: '제약이 가장 느슨한 기본 유형. 전역 규칙만 적용됩니다.', require: [], forbid: [], shells: ALL_SHELLS},
  landing: {label: '랜딩', description: '히어로로 시작해 가치를 전하고 행동을 유도합니다.', require: [['hero']], forbid: [...INTERACTIVE_APP, 'toc', 'filter-bar', 'pagination'], shells: without('rail', 'dock', 'sidebar')},
  dashboard: {label: '대시보드', description: '지표·차트·표·보드 중 하나 이상이 화면의 중심이어야 합니다.', require: [['metric', 'chart', 'table', 'list', 'kanban', 'calendar']], forbid: BUSINESS_FORBID, shells: without('editorial', 'masthead', 'minimal', 'centered')},
  data: {label: '데이터 리포트', description: '수치를 읽는 화면. 차트·표·지표가 있어야 합니다.', require: [['chart', 'table', 'metric']], forbid: BUSINESS_FORBID, shells: without('editorial', 'masthead', 'minimal', 'centered')},
  listing: {label: '목록·탐색', description: '많은 항목을 찾고 거르는 화면.', require: [['table', 'list', 'grid', 'filter-bar', 'reel', 'gallery', 'team']], forbid: ['hero', 'pricing', 'cta'], shells: ALL_SHELLS},
  community: {label: '협업·소통', description: '대화·보드·일정처럼 상호작용하는 작업 화면.', require: [['chat', 'master-detail', 'kanban', 'list', 'calendar']], forbid: ['hero', 'pricing', 'cta', 'logo-cloud'], shells: without('editorial', 'masthead', 'minimal')},
  docs: {label: '문서·레퍼런스', description: '읽고 찾고 따라 하는 문서.', require: [['prose', 'code', 'steps', 'faq', 'properties', 'table', 'timeline']], forbid: [...MARKETING, 'buy-box', 'summary'], shells: without('dock', 'rail', 'minimal')},
  article: {label: '글', description: '긴 글을 읽는 화면. 읽기 폭 이하만 허용합니다.', require: [['prose']], forbid: [...MARKETING, 'kanban', 'master-detail', 'chat', 'calendar', 'buy-box', 'summary', 'menu'], shells: without('rail', 'dock'), widths: ['narrow', 'standard']},
  blog: {label: '블로그 목록', description: '글 카드·목록을 훑는 화면.', require: [['card', 'list', 'reel']], forbid: [...INTERACTIVE_APP, 'pricing', 'buy-box', 'summary'], shells: without('rail', 'dock', 'sidebar'), widths: ['narrow', 'standard', 'wide']},
  commerce: {label: '커머스', description: '상품을 보고 담고 결제하는 화면.', require: [['buy-box', 'grid', 'gallery', 'summary', 'menu', 'reel']], forbid: [...INTERACTIVE_APP, 'code'], shells: without('rail', 'minimal')},
  portfolio: {label: '포트폴리오', description: '작업물을 보여 주는 화면.', require: [['gallery', 'media', 'bento', 'grid', 'reel']], forbid: ['kanban', 'master-detail', 'chat', 'calendar'], shells: ALL_SHELLS},
  pricing: {label: '요금제', description: '플랜을 비교하는 화면.', require: [['pricing']], forbid: INTERACTIVE_APP, shells: without('rail', 'dock', 'sidebar')},
  form: {label: '폼', description: '정보를 입력받는 화면. 입력 폭을 읽기 폭으로 제한합니다.', require: [['form']], forbid: ['hero', 'pricing', 'logo-cloud', ...INTERACTIVE_APP], shells: ALL_SHELLS, widths: ['narrow', 'standard']},
  settings: {label: '설정', description: '값을 확인하고 바꾸는 화면.', require: [['form', 'list', 'properties']], forbid: ['hero', 'pricing', 'quote', 'logo-cloud', 'cta', 'gallery'], shells: without('editorial', 'masthead', 'minimal')},
  auth: {label: '인증', description: '로그인·가입처럼 한 가지 입력에 집중. 폼 하나와 보조 안내만 허용합니다.', require: [['form']], allow: ['page-header', 'form', 'notice', 'actions', 'links', 'divider', 'empty-state'], maxChildren: 4, shells: ['centered', 'minimal', 'split', 'topbar', 'stacked'], widths: ['narrow', 'standard']},
  error: {label: '오류·상태 페이지', description: '404·500·점검 등. 두 번째 노드는 반드시 상태 화면.', require: [['empty-state']], allow: ['page-header', 'empty-state', 'actions', 'links', 'notice'], maxChildren: 4, second: 'empty-state', secondKinds: ['not-found', 'error', 'forbidden', 'offline', 'maintenance'], shells: ALL_SHELLS},
};
export const pageTypeIds = Object.keys(pageTypes);
