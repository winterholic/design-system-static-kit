/**
 * 컨셉(주제): 하나의 주제가 여러 템플릿과 여러 시각 언어를 갖는다.
 *  - 이전 구조는 템플릿이 테마를 하나 박아 두었다(1테마-1템플릿). 못생긴 하나가 걸리면 그 주제 전체가 못생겨 보였다.
 *  - 컨셉은 `looks`(테마 + 서체 + 선택적으로 테마 변형·팔레트)를 여러 벌, `templates`를 여러 개 가진다. 어떤 컨셉의 어떤 템플릿도 모든 look으로 입힐 수 있다.
 *  - 템플릿 본문은 주제의 글이라(카페 소개글, 은행 상품) 컨셉에는 그 주제의 글을 가진 템플릿과 어느 주제에나 맞는 일반 템플릿(문의·소개·글·로그인 …)만 넣는다.
 *  - 레이아웃(구성 변형)은 템플릿마다 별도로 고른다(src/catalog/variants.mjs). 컨셉이 고르는 것은 시각 언어뿐이다.
 * 시험(tests/concepts.test.mjs)이 컨셉 × 템플릿 × look 전부가 검증을 통과하는지 확인한다.
 */
const L = (id, label, theme, typography, extra = {}) => ({id, label, theme, typography, ...extra});

const GENERIC = ['contact', 'about-team', 'blog-index', 'blog-post', 'article', 'login', 'signup', 'forgot-password', 'survey', 'help-center'];

export const concepts = {
  saas: {label: '제품·SaaS', description: '업무 도구와 소프트웨어 제품. 신뢰감 있는 중립 톤.', templates: ['saas-landing', 'pricing-page', 'app-landing', 'b2b-solution', 'waitlist', 'changelog', 'onboarding-wizard', 'case-study', 'billing', 'settings', ...GENERIC.slice(0, 5)],
    looks: [L('trust', '트러스트', 'trust', 'sans'), L('clean', '정돈된 SaaS', 'aurora', 'geometric', {themeVariant: 'clean-saas'}), L('workspace', '워크스페이스', 'workspace', 'tech')]},
  devtool: {label: '개발자 도구', description: '문서·API·상태 화면. 촘촘한 비율과 고정폭.', templates: ['devtool-landing', 'api-reference', 'docs-reference', 'tutorial', 'changelog', 'status-page', 'audit-log', 'incident-report', 'server-error', 'pricing-page', 'login', 'blog-index', 'article'],
    looks: [L('devtool', '데브툴', 'devtool', 'tech'), L('console', '콘솔', 'console', 'terminal'), L('manual', '매뉴얼', 'manual', 'tech'), L('precision', '프리시전', 'precision', 'swiss')]},
  ops: {label: '업무·운영', description: '대시보드·표·보드. 빠르게 읽고 판단하는 화면.', templates: ['dashboard-overview', 'dashboard-analytics', 'sales-dashboard', 'project-board', 'hr-people', 'admin-table', 'calendar-view', 'inbox', 'team-chat', 'support-queue', 'team-directory', 'settings', 'profile', 'billing', 'job-board', 'job-detail'],
    looks: [L('workspace', '워크스페이스', 'workspace', 'sans'), L('enterprise', '엔터프라이즈', 'enterprise', 'humanist'), L('ledger', '레저', 'ledger', 'tech'), L('hub', '허브', 'hub', 'geometric')]},
  finance: {label: '금융', description: '은행·보험·자산. 숫자가 먼저 읽히는 차분한 화면.', templates: ['bank-product', 'finance-overview', 'billing', 'checkout', 'policy', 'contact', 'login', 'signup', 'onboarding-wizard', 'survey', 'help-center', 'pricing-page'],
    looks: [L('bank', '뱅크', 'bank', 'sans'), L('private', '프라이빗', 'bank', 'newsroom', {themeVariant: 'private-bank'}), L('trust', '트러스트', 'trust', 'humanist')]},
  cafe: {label: '카페·식음', description: '카페·식당·와인바. 따뜻한 서체와 메뉴판.', templates: ['cafe-home', 'menu-dining', 'wine-list', 'recipe-detail', 'event-landing', 'event-schedule', 'garden-shop', 'contact', 'about-team', 'blog-index', 'blog-post'],
    looks: [L('cafe', '카페', 'cafe', 'humanist'), L('bistro', '비스트로', 'dining', 'literary'), L('wine', '와인바', 'wine', 'luxe'), L('garden', '가든', 'garden', 'slab')]},
  commerce: {label: '이커머스·뷰티', description: '상품·결제·뷰티. 사진이 중심이고 가격이 또렷하다.', templates: ['product-landing', 'product-detail', 'product-listing', 'checkout', 'order-tracking', 'beauty-detail', 'garden-shop', 'wine-list', 'contact', 'blog-index', 'login'],
    looks: [L('commerce', '커머스', 'commerce', 'sans'), L('beauty', '뷰티', 'beauty', 'luxe'), L('boutique', '부티크', 'commerce', 'serif', {themeVariant: 'boutique'})]},
  stay: {label: '여행·부동산', description: '숙소·여행·집 구하기. 큰 사진과 안내 글.', templates: ['travel-ocean', 'stay-detail', 'realty-detail', 'property-search', 'event-schedule', 'contact', 'blog-post', 'article', 'checkout'],
    looks: [L('stay', '스테이', 'stay', 'humanist'), L('ocean', '오션', 'ocean', 'geometric'), L('realty', '리얼티', 'realty', 'serif')]},
  health: {label: '건강·운동', description: '병원·운동·웰니스. 안심되는 색과 읽기 쉬운 글.', templates: ['clinic-home', 'fitness-landing', 'calendar-view', 'onboarding-wizard', 'survey', 'help-center', 'contact', 'login', 'signup', 'article', 'blog-index'],
    looks: [L('clinic', '클리닉', 'clinic', 'humanist'), L('cloud', '클라우드', 'cloud', 'rounded'), L('sport', '스포츠', 'sport', 'condensed')]},
  learning: {label: '교육·학교', description: '강의·학교·연구. 또렷한 안내와 긴 글.', templates: ['learning-course', 'course-catalog', 'kids-class', 'onboarding-wizard', 'survey', 'research-paper', 'tutorial', 'help-center', 'event-schedule', 'article', 'contact'],
    looks: [L('learning', '러닝', 'learning', 'humanist'), L('school', '스쿨', 'school', 'rounded'), L('academic', '아카데믹', 'academic', 'literary'), L('kids', '키즈', 'kids', 'rounded')]},
  culture: {label: '문화·전시·기록', description: '박물관·전통·갤러리. 느리고 깊은 글.', templates: ['museum-home', 'hanji-journey', 'portfolio-grid', 'event-landing', 'event-schedule', 'article', 'blog-post', 'about-team', 'policy', 'contact'],
    looks: [L('heritage', '헤리티지', 'heritage', 'literary'), L('hanji', '한지', 'hanji', 'bookish'), L('gallery', '갤러리', 'gallery', 'swiss'), L('atelier', '아틀리에', 'atelier', 'humanist')]},
  editorial: {label: '뉴스·매거진·글', description: '읽을거리. 제목의 위계와 본문의 리듬이 전부다.', templates: ['news-home', 'blog-index', 'blog-post', 'article', 'research-paper', 'recipe-detail', 'policy', 'contact', 'about-team', 'survey'],
    looks: [L('newsroom', '뉴스룸', 'newsroom', 'newsroom'), L('journal', '저널', 'journal', 'literary'), L('magazine', '매거진', 'magazine', 'editorial'), L('paper', '페이퍼', 'paper', 'bookish')]},
  brand: {label: '브랜드·에이전시', description: '포트폴리오·캠페인. 큰 제목과 한 점의 강조.', templates: ['agency-home', 'case-study', 'portfolio-grid', 'luxury-brand', 'campaign-poster', 'about-team', 'contact', 'blog-index', 'pricing-page'],
    looks: [L('studio', '스튜디오', 'studio', 'grotesk'), L('swiss', '스위스', 'swiss', 'swiss'), L('colorblock', '컬러블록', 'colorblock', 'poster'), L('luxe', '럭셔리', 'luxe', 'luxe')]},
  event: {label: '이벤트·웨딩', description: '청첩장·행사·캠페인. 한 번 보고 기억에 남는 화면.', templates: ['wedding-invite', 'event-landing', 'event-schedule', 'campaign-donate', 'contact', 'survey', 'login'],
    looks: [L('wedding', '웨딩', 'wedding', 'luxe'), L('playful', '플레이풀', 'playful', 'poster'), L('signal', '시그널', 'signal', 'condensed')]},
  civic: {label: '공공·비영리', description: '기관·후원·민원. 정직한 안내와 큰 터치 영역.', templates: ['civic-service', 'policy', 'campaign-donate', 'help-center', 'forgot-password', 'forbidden', 'contact', 'survey', 'job-detail', 'article', 'status-page'],
    looks: [L('civic', '시빅', 'civic', 'sans'), L('school', '스쿨', 'school', 'humanist'), L('hanji', '한지', 'hanji', 'bookish')]},
  energy: {label: '에너지·산업', description: '설비·에너지·B2B 제품. 수치와 근거가 먼저 보이는 화면.', templates: ['solar-landing', 'b2b-solution', 'sales-dashboard', 'status-page', 'case-study', 'contact', 'pricing-page', 'help-center', 'about-team', 'blog-index'],
    looks: [L('solar', '솔라', 'solar', 'geometric'), L('enterprise', '엔터프라이즈', 'enterprise', 'tech'), L('insight', '인사이트', 'insight', 'sans')]},
  game: {label: '게임·엔터', description: '게임·음악·e스포츠. 어두운 면 위의 굵은 색.', templates: ['game-launch', 'music-player', 'waitlist', 'event-landing', 'campaign-poster', 'login', 'signup', 'blog-index', 'status-page'],
    looks: [L('game', '게임', 'game', 'poster'), L('neon', '네온', 'neon', 'geometric'), L('nocturne', '녹턴', 'nocturne', 'condensed')]},
  app: {label: '모바일 앱', description: '앱 소개·온보딩·상태 화면. 한 손으로 쓰는 큰 터치 영역.', templates: ['app-landing', 'help-center', 'signup', 'login', 'onboarding-wizard', 'offline', 'not-found', 'music-player', 'profile', 'settings', 'inbox', 'maintenance'],
    looks: [L('clarity', '클래리티', 'clarity', 'rounded'), L('pocket', '포켓', 'pocket', 'geometric'), L('hub', '허브', 'hub', 'humanist')]},
};

export const conceptIds = Object.keys(concepts);
/** 템플릿이 속한 컨셉 id 목록. */
export const conceptsOfTemplate = templateId => conceptIds.filter(id => concepts[id].templates.includes(templateId));
