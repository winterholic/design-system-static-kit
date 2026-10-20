/** Page templates: complete, valid blueprints that every theme can wear. Authored as data, validated like any user input. */
import {registerMore} from './templates-more.mjs';
const A = (label, variant = 'primary', href = '#main') => ({label, href, variant});
const head = (title, description, extra = {}) => ({type: 'page-header', title, ...(description ? {description} : {}), ...extra});
const prose = (title, body, variant) => ({type: 'prose', title, body, ...(variant ? {variant} : {})});
const card = (title, body, extra = {}) => ({type: 'card', title, body, ...extra});
const metric = (label, value, detail, trend, delta) => ({type: 'metric', label, value, ...(detail ? {detail} : {}), ...(trend ? {trend, delta} : {})});
const grid = (columns, ...children) => ({type: 'grid', columns, children});
const section = (title, children, extra = {}) => ({type: 'section', title, children, ...extra});
const notice = (tone, title, body, variant) => ({type: 'notice', tone, title, body, ...(variant ? {variant} : {})});
const feat = (icon, title, description) => ({icon, title, description});
const field = (id, label, type, extra = {}) => ({id, label, type, ...extra});
const media = (kind, ratio, alt, caption) => ({type: 'media', kind, ratio, alt, ...(caption ? {caption} : {})});
const nav = (...items) => items.map(([label, icon, href = '#main', group, current]) => ({label, href, icon, ...(group ? {group} : {}), ...(current ? {current: 'page'} : {})}));
const FOOT = ['이용약관', '개인정보', '문의'];
const chrome = (navItems, action, footerNote, footerLinks) => ({nav: navItems, ...(action ? {action: {label: action, href: '#main'}} : {}), ...(footerNote ? {footerNote} : {}), footerLinks: (footerLinks ?? FOOT).map(l => ({label: l, href: '#main'}))});
const NAV_APP = nav(['개요', 'home'], ['프로젝트', 'folder'], ['일정', 'calendar'], ['설정', 'settings']);
const NAV_SITE = nav(['소개', 'info'], ['기능', 'sparkles'], ['요금', 'tag'], ['문의', 'mail']);

const T = [];
const add = (id, label, pageType, theme, name, tree, extra = {}) => T.push({id, label, pageType, theme, name, tree, axes: extra.axes ?? {}, chrome: extra.chrome ?? chrome(NAV_SITE, null, '© 2026 예시 서비스 · 정적 데모', FOOT)});

// ---------- landing ----------
add('saas-landing', 'SaaS 서비스 소개', 'landing', 'trust', '플로우웍스', [
  head('팀의 일이 흐르는 방향을 한눈에', '업무 도구를 하나로 모으고, 중요한 결정에 집중하세요.'),
  {type: 'hero', variant: 'split', eyebrow: '새 버전 2.0 · 자동화 규칙 출시', title: '흩어진 일을\n하나의 흐름으로.', body: '프로젝트, 일정, 문서를 한곳에서 연결합니다. 지난주에 어떤 작업이 밀렸는지, 아침 회의 전에 이미 알고 있게 됩니다.', action: A('14일 무료로 시작', 'primary'), secondaryAction: A('2분 데모 보기', 'secondary'), visual: 'chart'},
  {type: 'logo-cloud', title: '1,200개 팀이 매일 사용합니다', names: ['모아랩', '블루웍스', '다온스튜디오', '한결컴퍼니', '오브제노트']},
  section('팀이 바로 쓰는 핵심 기능', [{type: 'bento', children: [
    card('프로젝트 보드와 일정, 문서가 한 화면에', '카드를 옮기면 일정과 담당자가 같이 바뀝니다. 흩어진 링크를 찾는 시간이 사라져요.', {variant: 'media', visual: 'chart', ratio: '4:3'}),
    metric('주간 완료 작업', '1,284', '지난주보다 18% 많아요', 'up', '+18%'),
    card('반복 작업은 규칙 하나로', '“리뷰가 끝나면 담당자에게 알림”처럼 한 줄로 만듭니다.', {icon: 'zap'}),
    {type: 'quote', quote: '월요일 아침 상태 취합이 사라졌습니다. 그 시간에 고객 인터뷰를 한 건 더 해요.', author: '이지훈', role: '블루웍스 운영 매니저'},
    {type: 'progress', label: '2분기 로드맵 진행률', value: 72, detail: '38개 중 27개 완료', tone: 'brand'},
  ]}], {anchor: 'features', eyebrow: '기능', description: '도입 첫날부터 쓰는 기능만 골랐습니다. 설정은 가볍게, 효과는 오래 가도록.'}),
  section('세 단계면 첫 프로젝트가 돌아갑니다', [{type: 'steps', title: '시작하는 방법', layout: 'horizontal', items: [{title: '템플릿 고르기', description: '제품 개발, 마케팅, 운영 중에서 가까운 것을 고르면 보드가 만들어져요.'}, {title: '팀원 초대하기', description: '이메일 한 줄이면 됩니다. 권한은 기본값이 이미 안전하게 켜져 있어요.'}, {title: '연결하고 쓰기', description: '쓰던 캘린더와 메신저를 연결하면 알림이 한곳으로 모입니다.'}]}], {anchor: 'start'}),
  section('고객의 이야기', [grid('two', {type: 'quote', quote: '도입 한 달 만에 주간 회의가 60분에서 25분으로 줄었어요. 무엇이 막혔는지 화면 하나로 보이니까요.', author: '김다선', role: '모아랩 프로덕트 팀장'}, {type: 'quote', quote: '신규 입사자가 첫날 보드만 보고 일을 이해했습니다. 온보딩 문서를 따로 쓰지 않아도 돼요.', author: '정하늘', role: '다온스튜디오 대표'})], {description: '규모가 다른 세 팀의 도입 후기를 모았습니다.'}),
  section('요금제', [{type: 'pricing', children: [
    {type: 'plan', name: '스타터', price: '0원', description: '개인과 3인 이하 팀이 가볍게 시작해요.', features: ['프로젝트 3개', '팀원 3명', '기본 템플릿 12종', '커뮤니티 지원'], action: A('무료로 시작', 'secondary')},
    {type: 'plan', name: '팀', price: '9,900원', period: '사용자당 월', description: '성장하는 팀을 위한 전체 기능.', features: ['무제한 프로젝트', '자동화 규칙 100개', '우선 이메일 지원', '고급 권한 설정'], action: A('팀으로 시작', 'primary'), featured: 'yes'},
    {type: 'plan', name: '엔터프라이즈', price: '문의', description: '보안과 규모가 중요한 조직.', features: ['SSO · SCIM', '감사 로그 2년 보관', '전담 매니저', '맞춤 계약'], action: A('상담 요청', 'secondary')},
  ]}], {anchor: 'pricing', eyebrow: '요금', description: '연간 결제 시 두 달 무료. 언제든 요금제를 바꿀 수 있어요.'}),
  section('자주 묻는 질문', [{type: 'faq', title: '시작하기 전에', items: [{question: '카드 없이 시작할 수 있나요?', answer: '네. 스타터는 결제 정보 없이 바로 쓰고, 팀 요금제는 14일 동안 무료 체험할 수 있어요.'}, {question: '기존 데이터를 옮길 수 있나요?', answer: 'CSV와 주요 업무 도구의 내보내기 파일을 가져옵니다. 보통 팀 하나당 10분 안에 끝납니다.'}, {question: '언제든 해지할 수 있나요?', answer: '설정에서 한 번에 해지하며 위약금이 없습니다. 남은 기간은 일할 계산해 환불해 드려요.'}]}], {anchor: 'faq'}),
  {type: 'cta', tone: 'brand', title: '다음 주 월요일 회의부터 달라집니다', body: '카드 등록 없이 14일 동안 모든 기능을 써 볼 수 있어요.', action: A('무료로 시작', 'primary'), secondaryAction: A('영업팀과 이야기', 'ghost')},
], {chrome: chrome(nav(['기능', 'sparkles', '#features'], ['요금', 'tag', '#pricing'], ['질문', 'help-circle', '#faq']), '로그인', '© 2026 플로우웍스 · 정적 데모', FOOT)});

add('app-landing', '앱 소개', 'landing', 'pocket', '모아', [
  head('하루를 가볍게 기록하는 앱', '3초 만에 남기고, 한 주를 돌아보세요.'),
  {type: 'hero', variant: 'product', eyebrow: 'iOS · Android', title: '기록은 짧게,\n기억은 길게.', body: '떠오른 생각을 바로 남기고, 주말에 자동으로 정리된 회고를 받아 보세요.', action: A('앱 받기', 'primary'), secondaryAction: A('미리 보기', 'secondary'), visual: 'device'},
  grid('three', metric('다운로드', '30만+', '출시 6개월', 'up', '+8%'), metric('평균 평점', '4.8', '리뷰 1.2만 개'), metric('주간 활성', '68%', '사용자 기준', 'up', '+3%p')),
  section('이렇게 써요', [{type: 'steps', title: '세 단계면 충분합니다', layout: 'horizontal', items: [{title: '남기기', description: '홈 화면 위젯에서 바로 입력합니다.'}, {title: '모아 보기', description: '태그와 날짜로 자동 분류됩니다.'}, {title: '돌아보기', description: '일요일 저녁에 한 주의 요약이 도착합니다.'}]}]),
  section('기능', [{type: 'feature-list', layout: 'list', items: [feat('zap', '위젯 입력', '앱을 열지 않고도 기록합니다.'), feat('lock', '잠금과 암호화', '기록은 기기에서 암호화됩니다.'), feat('cloud', '자동 백업', '기기를 바꿔도 이어집니다.')]}]),
  section('자주 묻는 질문', [{type: 'faq', title: '궁금하신 점', items: [{question: '무료인가요?', answer: '기본 기능은 무료입니다.'}, {question: '오프라인에서도 쓸 수 있나요?', answer: '네. 연결되면 자동으로 동기화합니다.'}]}]),
  {type: 'cta', tone: 'inverse', title: '지금 바로 시작', action: A('앱 받기', 'primary')},
], {axes: {shell: 'topbar', width: 'standard'}, chrome: chrome(nav(['소개', 'info'], ['기능', 'sparkles'], ['질문', 'help-circle']), '앱 받기', '© 2026 모아', FOOT)});

add('product-landing', '제품 소개', 'landing', 'commerce', '무드램프', [
  head('방 안의 빛을 바꾸는 작은 램프', '손바닥만 한 크기에 열두 가지 분위기.'),
  {type: 'hero', variant: 'product', title: '무드램프 미니', body: '충전은 한 번, 사용은 열 시간. 책상 위에서 침대맡까지 어디든.', action: A('39,000원에 담기', 'primary'), secondaryAction: A('스펙 보기', 'ghost'), visual: 'photo', motif: 'orb'},
  section('왜 이 램프인가요', [{type: 'bento', children: [{...media('photo', '1:1', '책상 위에 놓인 램프'), motif: 'lamp', caption: '책상 위에서는 은은한 스탠드로'}, metric('사용 시간', '10시간', '완충 기준'), card('열두 가지 분위기', '따뜻한 노랑부터 차분한 파랑까지 한 번의 터치로 바꿉니다.', {icon: 'sun'}), {type: 'quote', quote: '밤에 책 읽을 때 눈이 편해요.', author: '박서연', role: '구매 고객'}, metric('무게', '180g', '한 손에 쏙')]}], {description: '작은 램프가 방의 분위기를 바꾸는 네 가지 이유.'}),
  section('사양', [{type: 'split', children: [{type: 'properties', title: '제품 정보', items: [{label: '크기', value: '지름 8cm · 높이 12cm'}, {label: '충전', value: 'USB-C · 2시간'}, {label: '방수', value: 'IPX4'}, {label: '보증', value: '1년'}]}, media('diagram', '4:3', '램프 크기를 보여 주는 도면')]}]),
  section('리뷰', [{type: 'reviews', title: '구매 후기', score: '4.8', count: '리뷰 1,204개', items: [{author: '김**', rating: 5, text: '조명이 부드러워서 잠들기 전에 켜 둡니다.', date: '2026.10.02'}, {author: '이**', rating: 4, text: '배터리가 오래가요. 색 전환이 조금 느린 게 아쉬워요.', date: '2026.09.27'}]}]),
  {type: 'cta', title: '오늘 주문하면 모레 도착', action: A('장바구니 담기', 'primary')},
], {chrome: chrome(nav(['제품', 'bag'], ['사양', 'list'], ['후기', 'star'], ['문의', 'mail']), '장바구니', '© 2026 무드램프', FOOT)});

add('agency-home', '에이전시 홈', 'portfolio', 'studio', '스튜디오 오로', [
  head('우리는 브랜드가 오래 기억되는 방식을 만듭니다.', '서울 · 아이덴티티, 웹, 모션'),
  {type: 'hero', variant: 'cover', title: '오래 남는\n브랜드를 만든다.', body: '전략에서 제작까지, 작은 팀이 끝까지 함께합니다.', facts: [{value: '48', label: '함께한 브랜드'}, {value: '12년', label: '평균 협업 기간'}, {value: '96%', label: '재의뢰율'}], action: A('프로젝트 문의', 'primary'), secondaryAction: A('작업 보기', 'ghost')},
  section('선별한 작업', [{type: 'gallery', layout: 'masonry', items: [{kind: 'photo', motif: 'coffee', alt: '카페 브랜딩', caption: '오월 커피 · 아이덴티티'}, {kind: 'photo', motif: 'poster', alt: '전시 포스터', caption: '빛의 기록전 · 그래픽'}, {kind: 'device', alt: '앱 화면', caption: '모아 · 핀테크 앱'}, {kind: 'photo', motif: 'grid', alt: '정보 구조', caption: '한빛재단 · 웹'}, {kind: 'video', alt: '모션 영상', caption: '디자인 데이 · 모션'}, {kind: 'photo', motif: 'package', alt: '패키지', caption: '소담 · 패키지'}]}], {anchor: 'work'}),
  section('서비스', [grid('three', card('아이덴티티', '이름, 로고, 시스템까지 하나의 언어로.', {icon: 'sparkles'}), card('웹·앱', '빠르고 접근성 높은 화면을 만듭니다.', {icon: 'globe'}), card('모션', '브랜드가 움직이는 방식을 설계합니다.', {icon: 'play'}))]),
  section('이야기', [{type: 'split', reverse: 'reverse', children: [prose('우리가 일하는 방식', '좋은 결과는 좋은 질문에서 나옵니다. 우리는 먼저 듣고, 작게 만들어 보여 드리고, 함께 다듬습니다.\n\n프로젝트마다 한 명의 책임자가 처음부터 끝까지 함께합니다.'), {...media('photo', '4:3', '작업실에서 회의하는 모습'), motif: 'laptop'}]}]),
  {type: 'cta', tone: 'inverse', title: '다음 프로젝트를 이야기해요', action: A('hello@example.com', 'primary')},
], {chrome: chrome(nav(['작업', 'image', '#work'], ['서비스', 'sparkles'], ['소개', 'users']), '문의', '© 2026 스튜디오 오로', FOOT)});

add('event-landing', '행사 안내', 'landing', 'playful', '디자인 데이 2026', [
  head('올해 가장 즐거운 디자인 하루', '11월 14일 토요일 · 성수 · 오프라인 + 온라인'),
  {type: 'hero', variant: 'centered', eyebrow: '얼리버드 마감 D-7', title: '디자인 데이\n2026', body: '연사 12명, 워크숍 6개, 그리고 하루 종일의 대화.', action: A('티켓 구매', 'primary'), secondaryAction: A('프로그램 보기', 'secondary')},
  grid('three', metric('연사', '12명'), metric('워크숍', '6개'), metric('남은 좌석', '84석', '오늘 기준', 'down', '-16')),
  section('프로그램', [{type: 'timeline', title: '11월 14일', variant: 'rail', items: [{time: '10:00', title: '오프닝', description: '올해의 주제를 소개합니다.', status: '예정'}, {time: '11:00', title: '키노트: 규칙과 자유', description: '정해진 틀 안에서 다양함을 만드는 방법.'}, {time: '14:00', title: '워크숍 세션', description: '관심 주제를 골라 참여합니다.'}, {time: '17:00', title: '네트워킹', description: '가벼운 저녁과 함께합니다.'}]}], {anchor: 'program'}),
  section('연사', [{type: 'team', title: '함께하는 연사', members: [{name: '김다선', role: '디자인 시스템 리드'}, {name: '이지훈', role: '프런트엔드 엔지니어'}, {name: '박서연', role: '모션 디자이너'}, {name: '최민준', role: '리서처'}]}]),
  section('티켓', [{type: 'pricing', children: [{type: 'plan', name: '일반', price: '49,000원', features: ['하루 입장', '점심 포함'], action: A('구매', 'secondary')}, {type: 'plan', name: '얼리버드', price: '39,000원', period: '11/7까지', features: ['하루 입장', '점심 포함', '굿즈 포함'], action: A('구매', 'primary'), featured: 'yes'}]}], {anchor: 'ticket'}),
  {type: 'faq', title: '자주 묻는 질문', items: [{question: '온라인으로도 볼 수 있나요?', answer: '네. 온라인 티켓은 라이브와 다시보기를 제공합니다.'}, {question: '환불은 가능한가요?', answer: '행사 7일 전까지 전액 환불됩니다.'}]},
], {chrome: chrome(nav(['프로그램', 'calendar', '#program'], ['티켓', 'tag', '#ticket'], ['장소', 'map-pin']), '티켓 구매', '© 2026 디자인 데이', FOOT)});

add('waitlist', '대기자 등록', 'landing', 'neon', '오비트', [
  head('곧 열립니다', '가장 먼저 만나보세요.'),
  {type: 'hero', variant: 'centered', eyebrow: '비공개 베타', title: '생각의 속도로\n움직이는 도구', body: '이메일을 남기면 베타 초대를 보내 드립니다.', facts: [{value: '2,418', label: '대기 중인 사람'}, {value: '3주', label: '평균 초대 시간'}, {value: '4.8', label: '베타 만족도'}], action: A('자세히 보기', 'secondary')},
  {type: 'form', title: '베타 대기자 등록', intro: '초대 순서는 등록 순입니다. 데모이므로 입력은 저장되지 않습니다.', variant: 'inline', fields: [field('email', '이메일', 'email', {placeholder: 'name@example.com'}), field('agree', '소식 받기에 동의합니다', 'checkbox', {requirement: 'optional'})], submitLabel: '등록하기'},
  {type: 'feature-list', title: '미리 보는 기능', items: [feat('zap', '즉시 반응', '입력과 동시에 결과가 보입니다.'), feat('cloud', '어디서나', '브라우저만 있으면 됩니다.'), feat('lock', '프라이버시', '기본값은 비공개입니다.')]},
], {axes: {shell: 'minimal'}, chrome: chrome(nav(['소개', 'info']), '로그인', '© 2026 오비트', null)});

add('campaign-donate', '캠페인·후원', 'landing', 'signal', '숲을 지켜요', [
  head('한 그루가 숲이 되도록', '2026 시민 식목 캠페인'),
  {type: 'hero', variant: 'statement', eyebrow: '모금 진행 중', title: '올해 목표, 나무 10,000그루.', body: '지금까지 6,420그루가 심겼습니다. 한 번의 참여가 한 그루가 됩니다.', facts: [{value: '6,420', label: '지금까지 심은 그루'}, {value: '10,000', label: '올해 목표'}, {value: '1,284', label: '함께한 후원자'}], action: A('후원하기', 'primary'), secondaryAction: A('봉사 신청', 'secondary')},
  {type: 'progress', label: '모금 현황', value: 64, detail: '6,420 / 10,000그루', tone: 'brand'},
  grid('three', metric('참여자', '12,480명', '지난달 대비', 'up', '+1,204'), metric('심은 나무', '6,420그루'), metric('숲 면적', '42ha')),
  section('후원금은 이렇게 쓰여요', [{type: 'chart', title: '사용 내역', caption: '후원금 사용 비율', kind: 'donut', unit: '%', categories: ['묘목', '식재 인건비', '관리', '운영'], series: [{name: '비율', values: [48, 27, 18, 7]}]}]),
  {type: 'notice', tone: 'info', title: '투명하게 공개합니다', body: '모든 사용 내역은 분기마다 홈페이지에 공개됩니다.'},
], {chrome: chrome(nav(['소개', 'info'], ['현황', 'chart'], ['후원', 'heart']), '후원하기', '© 2026 숲을 지켜요 · 비영리', FOOT)});

add('learning-course', '강의 소개', 'landing', 'learning', '파이썬 첫걸음', [
  head('코딩이 처음이어도 괜찮아요', '8주 과정 · 하루 20분'),
  {type: 'hero', variant: 'split', eyebrow: '초급 · 온라인', title: '파이썬으로\n첫 프로그램 만들기', body: '짧은 영상과 바로 해 보는 문제로 8주 만에 작은 프로그램을 완성합니다.', action: A('수강 신청', 'primary'), secondaryAction: A('맛보기', 'secondary'), visual: 'photo', motif: 'laptop'},
  {type: 'stepper', steps: ['기초', '반복', '함수', '프로젝트'], current: 2},
  section('커리큘럼', [{type: 'steps', title: '8주 로드맵', items: [{title: '1~2주 · 기초', description: '변수와 조건문을 익힙니다.'}, {title: '3~4주 · 반복', description: '반복문으로 문제를 풀어 봅니다.'}, {title: '5~6주 · 함수', description: '코드를 나누고 재사용합니다.'}, {title: '7~8주 · 프로젝트', description: '나만의 작은 프로그램을 만듭니다.'}]}]),
  section('수강생 후기', [grid('two', {type: 'quote', quote: '매일 20분이라 포기하지 않았어요.', author: '정하늘', role: '수강생'}, {type: 'quote', quote: '문제를 바로 풀어 보니 이해가 빨랐습니다.', author: '한유진', role: '수강생'})]),
  {type: 'cta', tone: 'brand', title: '이번 기수는 11월 3일 시작', action: A('수강 신청', 'primary')},
], {chrome: chrome(nav(['커리큘럼', 'book'], ['후기', 'star'], ['질문', 'help-circle']), '수강 신청', '© 2026 파이썬 첫걸음', FOOT)});

add('fitness-landing', '피트니스', 'landing', 'sport', '리프트 클럽', [
  head('오늘의 한계를 넘는 한 세트', '프리웨이트 · 그룹 클래스 · 1:1 코칭'),
  {type: 'hero', variant: 'split', eyebrow: '첫 달 무료', title: '더 강해질\n시간.', body: '체계적인 프로그램과 코치가 함께합니다. 처음 오셔도 첫 주에는 코치가 운동 순서를 옆에서 잡아 드려요.', action: A('무료 체험', 'primary'), secondaryAction: A('클래스 보기', 'ghost'), visual: 'photo', motif: 'fitness'},
  grid('three', metric('회원', '2,400명'), metric('주간 클래스', '48개'), metric('평균 만족도', '4.9')),
  section('프로그램', [{type: 'reel', title: '이번 주 클래스', children: [card('파워 리프팅', '스쿼트·데드·벤치 기본 3종목에 집중하는 60분', {variant: 'media', visual: 'photo', motif: 'fitness', ratio: '4:3', badge: '인기', meta: '월·수·금 19:00'}), card('HIIT 30', '심박을 끌어올리는 30분 고강도 인터벌', {variant: 'media', visual: 'photo', motif: 'fitness', ratio: '4:3', meta: '화·목 07:00'}), card('모빌리티', '굳은 어깨와 고관절을 풀어 주는 50분', {variant: 'media', visual: 'photo', motif: 'care', ratio: '4:3', meta: '토 10:00'}), card('코어 클래스', '복부와 허리를 단단하게 만드는 40분', {variant: 'media', visual: 'photo', motif: 'plant', ratio: '4:3', meta: '수 20:30'})]}]),
  section('요금', [{type: 'pricing', children: [{type: 'plan', name: '자유 이용', price: '79,000원', period: '월', features: ['헬스장 무제한', '샤워실'], action: A('선택', 'secondary')}, {type: 'plan', name: '클래스 포함', price: '119,000원', period: '월', features: ['헬스장 무제한', '그룹 클래스', '체성분 측정'], action: A('선택', 'primary'), featured: 'yes'}]}]),
], {chrome: chrome(nav(['프로그램', 'zap'], ['요금', 'tag'], ['오시는 길', 'map-pin']), '무료 체험', '© 2026 리프트 클럽', FOOT)});

add('solar-landing', '에너지·태양광', 'landing', 'solar', '선루프', [
  head('우리 집 지붕이 발전소가 됩니다', '설치부터 모니터링까지 한 번에.'),
  {type: 'hero', variant: 'split', title: '전기요금을\n절반으로.', body: '지붕 조건만 알려 주시면 예상 절감액과 설치 비용을 바로 알려 드립니다.', action: A('무료 진단', 'primary'), secondaryAction: A('사례 보기', 'secondary'), visual: 'ornament'},
  grid('three', metric('평균 절감', '48%', '1년 사용 기준', 'down', '-48%'), metric('설치 기간', '2일'), metric('보증', '25년')),
  section('설치 사례', [{type: 'split', children: [{...media('photo', '4:3', '주택 지붕에 설치한 태양광 패널과 정원'), motif: 'solar', caption: '경기 용인 · 3kW 설치'}, prose('연 62만 원을 아낀 단독주택', '남향 지붕 28㎡에 패널 8장을 올렸습니다. 설치 후 첫 겨울 전기요금이 월 평균 9만 원에서 4만 5천 원으로 줄었고, 남는 전기는 한전에 판매해 연 18만 원을 더 돌려받고 있어요.')]}], {description: '실제 설치 현장의 숫자를 그대로 공개합니다.'}),
  section('작동 방식', [{type: 'steps', title: '네 단계로 끝', layout: 'horizontal', items: [{title: '진단', description: '지붕 방향과 면적을 확인합니다.'}, {title: '설계', description: '최적 용량을 제안합니다.'}, {title: '설치', description: '이틀 안에 설치합니다.'}, {title: '모니터링', description: '앱에서 발전량을 확인합니다.'}]}]),
  section('월간 발전량', [{type: 'chart', title: '3kW 설치 예시', caption: '월별 평균 발전량', kind: 'area', unit: 'kWh', categories: ['1월', '2월', '3월', '4월', '5월', '6월'], series: [{name: '발전량', values: [180, 240, 330, 410, 460, 440]}]}]),
  {type: 'cta', title: '10분이면 진단이 끝납니다', action: A('무료 진단', 'primary')},
], {chrome: chrome(nav(['방식', 'zap'], ['발전량', 'chart'], ['문의', 'mail']), '무료 진단', '© 2026 선루프', FOOT)});

add('travel-ocean', '여행 소개', 'landing', 'ocean', '파도소리 여행사', [
  head('바다가 가까운 곳으로', '제주·남해·동해의 작은 마을 여행'),
  {type: 'hero', variant: 'split', eyebrow: '가을 특가', title: '파도 소리로\n하루를 시작해요.', body: '작은 마을에서 천천히 머무는 2박 3일.', action: A('여행 찾기', 'primary'), secondaryAction: A('후기 보기', 'secondary'), visual: 'photo', motif: 'coast'},
  section('인기 여행', [{type: 'grid', columns: 'three', children: [card('제주 서쪽 2박 3일', '일몰과 해안 도로를 따라 걷는 여행', {variant: 'media', visual: 'photo', motif: 'coast', ratio: '4:3', meta: '2박 3일 · 389,000원', action: A('자세히', 'ghost')}), card('남해 독일마을', '고요한 바다 마을의 아침', {variant: 'media', visual: 'photo', motif: 'interior', ratio: '4:3', meta: '2박 3일 · 329,000원', action: A('자세히', 'ghost')}), card('동해 묵호', '바다와 골목 사이를 걷기', {variant: 'media', visual: 'photo', motif: 'building', ratio: '4:3', meta: '1박 2일 · 219,000원', action: A('자세히', 'ghost')})]}]),
  {type: 'feature-list', title: '여행의 방식', items: [feat('leaf', '천천히', '하루 한두 곳만 깊이 봅니다.'), feat('users', '소규모', '최대 8명이 함께합니다.'), feat('shield', '안심 보장', '날씨로 인한 일정 변경은 전액 환불합니다.')]},
], {chrome: chrome(nav(['여행', 'map-pin'], ['후기', 'star'], ['예약', 'calendar']), '예약 확인', '© 2026 파도소리 여행사', FOOT)});

add('museum-home', '박물관·재단', 'landing', 'heritage', '한빛 박물관', [
  head('오래된 것에서 오늘의 이야기를', '상설전 · 기획전 · 교육 프로그램'),
  {type: 'hero', variant: 'statement', eyebrow: '기획전 · 11월 30일까지', title: '빛을 담은 그릇', body: '조선 백자 120점이 만든 한 줄기 빛의 이야기를 만나 보세요.', facts: [{value: '120', label: '전시 백자'}, {value: '11.30', label: '전시 마감'}, {value: '무료', label: '매주 수요일 관람'}], action: A('관람 예약', 'primary'), secondaryAction: A('전시 소개', 'ghost')},
  section('지금 전시', [grid('two', card('빛을 담은 그릇', '조선 백자 120점', {variant: 'horizontal', visual: 'photo', motif: 'vase', ratio: '4:3', meta: '기획전시실 1 · 11/30까지'}), card('도시의 기억', '사진으로 보는 서울 100년', {variant: 'horizontal', visual: 'photo', motif: 'museum', ratio: '4:3', meta: '상설전시실 2'}))]),
  section('관람 안내', [{type: 'properties', title: '운영 정보', layout: 'inline', items: [{label: '관람 시간', value: '화~일 10:00~18:00'}, {label: '휴관일', value: '매주 월요일'}, {label: '관람료', value: '성인 5,000원 · 청소년 무료'}, {label: '위치', value: '서울 종로구 예시로 12'}]}]),
], {chrome: chrome(nav(['전시', 'image'], ['교육', 'graduation'], ['관람 안내', 'info'], ['소장품', 'book']), '관람 예약', '© 2026 한빛 박물관', FOOT)});

add('hanji-journey', '전통 문화 여행', 'landing', 'hanji', '고운길', [
  head('걸음마다 이야기가 있는 길', '전통 마을과 고택을 잇는 3일'),
  {type: 'hero', variant: 'statement', eyebrow: '가을 한정', title: '한옥에서 맞는\n고요한 아침.', body: '고택 숙박과 전통 체험을 하나로 엮은 여행입니다.', facts: [{value: '3박 4일', label: '일정'}, {value: '12명', label: '소규모 출발'}, {value: '4.9', label: '참가자 평점'}], action: A('일정 보기', 'primary')},
  section('여행 일정', [{type: 'timeline', title: '3일의 흐름', items: [{time: '1일차', title: '전주 한옥마을', description: '고택 체크인과 다도 체험.'}, {time: '2일차', title: '안동 하회마을', description: '탈춤 공연과 선비 음식.'}, {time: '3일차', title: '경주 월정교', description: '신라 유적을 걸으며 마무리.'}]}]),
  section('머무는 곳', [grid('two', card('전주 청연재', '마당이 있는 한옥 독채', {meta: '1박 · 2인'}), card('안동 하회고택', '고요한 종가 체험', {meta: '1박 · 4인'}))]),
], {chrome: chrome(nav(['일정', 'calendar'], ['숙소', 'bed'], ['체험', 'sparkles']), '예약', '© 2026 고운길', FOOT)});

add('cafe-home', '카페 홈', 'landing', 'cafe', '오월 커피', [
  head('오늘의 첫 잔을 천천히', '직접 볶은 원두와 매일 구운 빵'),
  {type: 'hero', variant: 'split', eyebrow: '성수 · 08:00~21:00', title: '향이 먼저\n인사하는 곳.', body: '매일 아침 볶은 원두와 갓 구운 빵을 만나 보세요.', action: A('메뉴 보기', 'primary'), secondaryAction: A('오시는 길', 'secondary'), visual: 'photo', motif: 'coffee'},
  section('대표 메뉴', [{type: 'menu', title: '커피', layout: 'grid', items: [{name: '오월 블렌드', description: '고소함과 단맛의 균형', price: '4,800', tag: '시그니처'}, {name: '플랫 화이트', description: '진한 우유 거품', price: '5,500'}, {name: '콜드브루', description: '16시간 저온 추출', price: '5,800'}, {name: '단호박 라떼', description: '계절 한정', price: '6,200', tag: '시즌'}]}]),
  section('공간', [{type: 'gallery', items: [{kind: 'photo', motif: 'interior', alt: '카페 내부 창가 좌석', caption: '창가 좌석'}, {kind: 'photo', motif: 'mug', alt: '바 테이블', caption: '바 테이블'}, {kind: 'photo', motif: 'food', alt: '갓 구운 빵', caption: '오늘의 베이커리'}]}]),
  {type: 'properties', title: '매장 정보', layout: 'inline', items: [{label: '영업 시간', value: '매일 08:00~21:00'}, {label: '주소', value: '서울 성동구 예시로 5'}, {label: '전화', value: '02-000-0000'}]},
], {chrome: chrome(nav(['메뉴', 'coffee'], ['공간', 'image'], ['오시는 길', 'map-pin']), '주문하기', '© 2026 오월 커피', FOOT)});

add('clinic-home', '병원 홈', 'landing', 'clinic', '맑은숨 내과의원', [
  head('편안하게 진료받으세요', '평일 야간진료 · 예약 없이도 가능합니다.'),
  {type: 'hero', variant: 'split', eyebrow: '내과 · 가정의학과', title: '우리 가족의\n건강 주치의.', body: '대기 시간을 줄이고, 충분히 설명해 드립니다.', action: A('진료 예약', 'primary'), secondaryAction: A('전화 문의', 'secondary'), visual: 'photo', motif: 'care'},
  {type: 'properties', title: '진료 안내', layout: 'inline', items: [{label: '평일', value: '09:00~20:00'}, {label: '토요일', value: '09:00~13:00'}, {label: '점심', value: '13:00~14:00'}, {label: '휴진', value: '일요일·공휴일'}]},
  section('진료 과목', [{type: 'feature-list', layout: 'grid', items: [feat('stethoscope', '내과 진료', '감기부터 만성질환 관리까지.'), feat('shield', '건강검진', '국가검진과 맞춤 검진.'), feat('droplet', '수액·주사', '피로 회복과 영양 수액.'), feat('heart', '만성질환', '혈압과 당뇨를 꾸준히 관리합니다.')]}]),
  section('의료진', [{type: 'team', title: '의료진 소개', members: [{name: '김서준 원장', role: '내과 전문의', bio: '순환기·소화기 진료'}, {name: '이하은 원장', role: '가정의학과 전문의', bio: '건강검진·만성질환'}]}]),
  {type: 'notice', tone: 'warning', title: '비급여 항목 안내', body: '비급여 진료비는 접수처에 게시되어 있으며 방문 전 전화로도 안내해 드립니다.'},
], {chrome: chrome(nav(['진료안내', 'clock'], ['진료과목', 'stethoscope'], ['의료진', 'users'], ['오시는 길', 'map-pin']), '진료 예약', '© 2026 맑은숨 내과의원 · 사업자번호 000-00-00000', ['비급여 안내', '개인정보', '오시는 길'])});

// ---------- pricing ----------
add('pricing-page', '요금 비교', 'pricing', 'aurora', '플로우웍스', [
  head('팀에 맞는 요금제를 고르세요', '연간 결제 시 두 달 무료.', {align: 'center'}),
  {type: 'pricing', children: [
    {type: 'plan', name: '스타터', price: '0원', description: '시작은 가볍게.', features: ['프로젝트 3개', '사용자 3명', '기본 템플릿'], action: A('시작하기', 'secondary')},
    {type: 'plan', name: '팀', price: '9,900원', period: '사용자당 월', description: '성장하는 팀.', features: ['무제한 프로젝트', '자동화 규칙', '우선 지원', '고급 권한'], action: A('팀으로 시작', 'primary'), featured: 'yes'},
    {type: 'plan', name: '비즈니스', price: '19,900원', period: '사용자당 월', description: '규모와 보안.', features: ['SSO', '감사 로그', '전용 지원', '맞춤 계약'], action: A('상담 요청', 'secondary')},
  ]},
  section('기능 비교', [{type: 'table', title: '요금제별 기능', caption: '요금제별 포함 기능 비교', variant: 'striped', columns: ['기능', '스타터', '팀', '비즈니스'], rows: [['프로젝트', '3개', '무제한', '무제한'], ['사용자', '3명', '무제한', '무제한'], ['자동화 규칙', '없음', '포함', '포함'], ['SSO', '없음', '없음', '포함'], ['지원', '커뮤니티', '이메일', '전용 매니저']], state: 'ready'}]),
  section('자주 묻는 질문', [{type: 'faq', title: '결제 관련', items: [{question: '언제든 요금제를 바꿀 수 있나요?', answer: '네. 변경 즉시 차액이 정산됩니다.'}, {question: '세금계산서를 받을 수 있나요?', answer: '결제 후 설정에서 발급합니다.'}]}]),
], {chrome: chrome(nav(['기능', 'sparkles'], ['요금', 'tag'], ['문의', 'mail']), '로그인', '© 2026 플로우웍스', FOOT)});

// ---------- dashboard / data ----------
add('dashboard-overview', '프로젝트 현황 대시보드', 'dashboard', 'workspace', '워크스페이스', [
  head('다음 결정을 위한 한눈.', '오늘의 흐름을 읽고, 중요한 일에 집중하세요.', {actions: [A('새 프로젝트', 'primary'), A('내보내기', 'secondary')]}),
  grid('four', metric('진행 중 프로젝트', '12', '이번 주 3개 시작', 'up', '+3'), metric('완료한 작업', '84', '지난주보다', 'up', '+12'), metric('지연', '2', '지난주 5건', 'down', '-3'), metric('다음 마일스톤', '10. 24.', '디자인 리뷰')),
  {type: 'aside', side: 'end', label: '활동 요약', size: 'narrow', children: [
    {type: 'chart', title: '주간 완료 작업', caption: '요일별 완료한 작업 수', kind: 'bar', unit: '개', categories: ['월', '화', '수', '목', '금'], series: [{name: '완료', values: [8, 14, 11, 17, 12]}]},
    {type: 'list', title: '지금 집중할 일', variant: 'card', items: [{title: '모바일 결제 화면 개편', description: '디자인 · 이번 주 금요일까지', status: '진행'}, {title: '사용자 인터뷰 정리', description: '리서치 · 이번 주', status: '대기'}, {title: '2.4 릴리스 점검', description: '개발 · 다음 주 월요일', status: '대기'}], state: 'ready'}]},
  {type: 'table', title: '최근 작업', caption: '프로젝트별 최근 변경과 담당 현황', columns: ['작업', '담당', '상태'], rows: [['결제 화면 리뉴얼', '김다선', '완료'], ['온보딩 문구 검수', '이지훈', '진행'], ['2.4 릴리스 점검', '박서연', '대기'], ['접근성 점검 보고서', '최민준', '진행']], state: 'ready'},
], {chrome: chrome(NAV_APP, '새 프로젝트', '워크스페이스 · 정적 데모', null)});

add('dashboard-analytics', '분석 리포트', 'data', 'insight', '인사이트', [
  head('9월 성장 리포트', '지난 30일 기준 · 전체 채널', {actions: [A('기간 변경', 'secondary'), A('PDF로 내보내기', 'ghost')]}),
  grid('four', metric('방문자', '128,400', '전월 대비', 'up', '+12.4%'), metric('가입 전환', '3.8%', '전월 대비', 'up', '+0.4%p'), metric('이탈률', '41%', '전월 대비', 'down', '-2%p'), metric('평균 체류', '4분 12초', '전월 대비', 'flat', '0')),
  grid('two', {type: 'chart', title: '일별 방문자', caption: '최근 7일 방문자 수', kind: 'line', unit: '명', categories: ['월', '화', '수', '목', '금', '토', '일'], series: [{name: '방문자', values: [3200, 4100, 3900, 4600, 5200, 3800, 3100]}]}, {type: 'chart', title: '유입 채널', caption: '채널별 방문자 비율', kind: 'donut', unit: '%', categories: ['검색', '직접', '소셜', '추천'], series: [{name: '비율', values: [46, 28, 16, 10]}]}),
  {type: 'chart', title: '채널별 전환', caption: '채널별 전환율 비교', kind: 'bars-h', unit: '%', categories: ['검색', '직접', '소셜', '추천'], series: [{name: '전환율', values: [4.2, 5.1, 2.1, 3.4]}]},
  {type: 'table', title: '상위 페이지', caption: '방문이 많은 페이지', variant: 'striped', columns: ['페이지', '방문', '전환'], rows: [['/pricing', '18,204', '5.2%'], ['/features', '14,771', '3.1%'], ['/blog/design-rules', '9,402', '1.8%']], state: 'ready'},
], {chrome: chrome(nav(['요약', 'chart'], ['채널', 'globe'], ['페이지', 'file'], ['설정', 'settings']), null, '인사이트 · 정적 데모', null)});

add('admin-table', '관리자 목록', 'listing', 'ledger', '레저', [
  head('주문 관리', '오늘 접수된 주문 128건', {actions: [A('주문 추가', 'primary'), A('내보내기', 'secondary')]}),
  {type: 'filter-bar', placeholder: '주문번호 또는 고객명', filters: ['전체', '결제 완료', '배송 중', '취소'], selected: 0},
  {type: 'table', title: '주문 목록', caption: '최근 주문 목록', variant: 'bordered', columns: ['주문번호', '고객', '금액', '상태', '접수'], rows: [['A-10231', '김다선', '39,000원', '결제 완료', '10:12'], ['A-10230', '이지훈', '128,000원', '배송 중', '09:48'], ['A-10229', '박서연', '56,500원', '결제 완료', '09:30'], ['A-10228', '최민준', '23,000원', '취소', '09:02'], ['A-10227', '정하늘', '71,000원', '배송 중', '08:55']], state: 'ready'},
  {type: 'pagination', pages: 12, current: 1},
], {chrome: chrome(nav(['주문', 'bag'], ['상품', 'tag'], ['고객', 'users'], ['정산', 'dollar'], ['설정', 'settings']), null, '레저 · 정적 데모', null)});

add('project-board', '프로젝트 보드', 'dashboard', 'hub', '허브', [
  head('릴리스 2.4 보드', '다음 릴리스까지 12일 남았습니다. 접근성 점검이 가장 급해요.', {actions: [A('작업 추가', 'primary')]}),
  grid('three', metric('남은 작업', '10개', '24개 중 14개 완료', 'down', '-4'), metric('이번 주 완료', '9개', '지난주보다', 'up', '+3'), metric('지연 위험', '2개', '접근성·결제 검수', 'up', '+1')),
  {type: 'progress', label: '릴리스 진행률', value: 58, detail: '24개 중 14개 완료', tone: 'brand'},
  {type: 'kanban', children: [
    {type: 'lane', title: '할 일', children: [{type: 'task', title: '알림 설정 화면 시안', label: '디자인', assignee: '김다선', priority: '보통'}, {type: 'task', title: '접근성 점검 (스크린리더)', label: 'QA', assignee: '최민준', priority: '높음'}, {type: 'task', title: '릴리스 노트 초안', label: '문서', assignee: '박서연', priority: '낮음'}, {type: 'task', title: '다크 모드 아이콘 정리', label: '디자인', priority: '보통'}]},
    {type: 'lane', title: '진행 중', children: [{type: 'task', title: '대시보드 차트 개선', label: '개발', assignee: '이지훈', priority: '높음'}, {type: 'task', title: '온보딩 문구 검수', label: '문서', assignee: '박서연', priority: '낮음'}, {type: 'task', title: '결제 오류 메시지 정리', label: '개발', assignee: '정하늘', priority: '보통'}]},
    {type: 'lane', title: '검토', children: [{type: 'task', title: '결제 흐름 리팩터링', label: '개발', assignee: '최민준', priority: '높음'}, {type: 'task', title: '검색 필터 개선', label: '개발', assignee: '이지훈', priority: '보통'}]},
    {type: 'lane', title: '완료', children: [{type: 'task', title: '로그인 개선', label: '개발', assignee: '정하늘'}, {type: 'task', title: '메일 템플릿 교체', label: '디자인', assignee: '김다선'}, {type: 'task', title: '알림 권한 안내 문구', label: '문서', assignee: '박서연'}]},
  ]},
], {chrome: chrome(NAV_APP, null, '허브 · 정적 데모', null)});

add('inbox', '메시지함', 'community', 'hub', '허브', [
  head('받은 메시지', '읽지 않은 메시지 2개'),
  {type: 'master-detail', title: '메시지 목록', items: [{title: '디자인 리뷰 일정', meta: '김다선 · 10:20', preview: '내일 오후 2시에 만나요. 시안과 점검 결과를 미리 봐 주세요.', state: 'unread'}, {title: '2.4 배포 안내', meta: '이지훈 · 어제', preview: '배포가 완료되었습니다. 모니터링은 오늘 저녁까지입니다.', state: 'unread'}, {title: '회의록 공유', meta: '박서연 · 월요일', preview: '지난 회의록을 정리했어요. 결정 사항에 표시해 두었습니다.'}, {title: '다음 주 일정 확인', meta: '최민준 · 지난주', preview: '일정 확인 부탁드립니다. 겹치는 회의가 두 건 있어요.'}, {title: '접근성 점검 결과', meta: '정하늘 · 지난주', preview: '스크린리더 점검에서 세 곳의 이름이 비어 있었습니다.'}, {title: '신규 입사자 안내', meta: '한유진 · 10월 12일', preview: '첫 주 일정과 계정 발급 방법을 정리해 두었어요.'}], selected: 0, detail: {title: '디자인 리뷰 일정', meta: '김다선 · 오늘 10:20', body: '안녕하세요. 내일 오후 2시에 디자인 리뷰를 진행하려고 합니다.\n\n준비하실 자료는 현재 시안과 접근성 점검 결과입니다. 참석이 어려우시면 알려 주세요.\n\n회의가 끝나면 결정 사항은 이 스레드에 정리해 두겠습니다.'}},
], {chrome: chrome(NAV_APP, null, '허브 · 정적 데모', null)});

add('team-chat', '팀 대화', 'community', 'hub', '허브', [
  head('#디자인-시스템', '멤버 12명 · 오늘 메시지 24개'),
  {type: 'chat', title: '오늘의 대화', messages: [{from: 'them', name: '김다선', text: '새 팔레트 후보 올렸어요. 한번 봐 주세요.', time: '10:02'}, {from: 'me', name: '나', text: '확인했어요. 두 번째가 대비가 좋네요.', time: '10:05'}, {from: 'them', name: '이지훈', text: '다크 모드에서도 4.5:1 넘는지 확인할게요. 점심 전까지 결과 올릴게요.', time: '10:08'}, {from: 'me', name: '나', text: '좋아요. 결과 공유 부탁해요.', time: '10:09'}, {from: 'them', name: '박서연', text: '버튼 hover 색도 같이 봐 주세요. 지금은 너무 옅어 보여요.', time: '10:14'}, {from: 'them', name: '김다선', text: '네, 오후 회의 전에 같이 정리해서 올릴게요.', time: '10:16'}]},
  {type: 'form', title: '메시지 보내기', variant: 'inline', fields: [field('message', '메시지', 'text', {placeholder: '메시지를 입력하세요'})], submitLabel: '보내기'},
], {chrome: chrome(NAV_APP, null, '허브 · 정적 데모', null)});

add('calendar-view', '월간 일정', 'community', 'workspace', '워크스페이스', [
  head('10월 일정', '이번 달 일정과 다가오는 마감을 한눈에 봅니다.', {actions: [A('일정 추가', 'primary')]}),
  grid('three', metric('이번 달 일정', '8건', '지난달보다 2건 많음', 'up', '+2'), metric('다음 일정', 'D-2', '10월 18일 · 디자인 리뷰'), metric('회의 시간', '12.5시간', '주 평균 3.1시간')),
  {type: 'filter-bar', placeholder: '일정 검색', filters: ['월', '주', '일정 목록'], selected: 0},
  {type: 'calendar', title: '2026년 10월', year: 2026, month: 10, today: 16, events: [{day: 6, title: '스프린트 시작', time: '10:00', tone: 'brand'}, {day: 6, title: '킥오프 점심', time: '12:30', tone: 'success'}, {day: 13, title: '디자인 크리틱', time: '15:00', tone: 'accent'}, {day: 18, title: '디자인 리뷰', time: '14:00', tone: 'accent'}, {day: 21, title: '고객 인터뷰', time: '11:00', tone: 'warning'}, {day: 24, title: '릴리스 점검', time: '11:00', tone: 'brand'}, {day: 29, title: '회고', time: '16:00', tone: 'success'}, {day: 30, title: '월간 보고', time: '10:00', tone: 'warning'}]},
  {type: 'list', title: '다가오는 일정', items: [{title: '디자인 리뷰', description: '10월 18일 · 14:00 · 회의실 B', status: '대기', icon: 'calendar'}, {title: '고객 인터뷰', description: '10월 21일 · 11:00 · 온라인', status: '대기', icon: 'users'}, {title: '릴리스 점검', description: '10월 24일 · 11:00 · 회의실 A', status: '대기', icon: 'check-circle'}], state: 'ready'},
], {chrome: chrome(NAV_APP, null, '워크스페이스 · 정적 데모', null)});

add('audit-log', '감사 로그', 'data', 'console', '콘솔', [
  head('감사 로그', '최근 24시간 · 관리자 활동', {actions: [A('로그 내보내기', 'secondary')]}),
  grid('three', metric('이벤트', '1,284', '최근 24시간'), metric('실패', '7', '전일 대비', 'down', '-3'), metric('고유 사용자', '38')),
  {type: 'timeline', title: '최근 이벤트', variant: 'log', items: [{time: '14:02', title: '권한 변경', description: 'kim.dasun이 팀 역할을 편집자로 변경', status: '완료'}, {time: '13:41', title: '로그인 실패', description: '알 수 없는 IP에서 3회 실패', status: '진행'}, {time: '12:10', title: 'API 키 발급', description: '배포용 키가 발급됨', status: '완료'}]},
  {type: 'code', label: '이벤트 원본', language: 'json', code: '{\n  "event": "role.updated",\n  "actor": "kim.dasun",\n  "target": "team-design",\n  "role": "editor"\n}'},
], {chrome: chrome(nav(['개요', 'home'], ['로그', 'terminal'], ['키', 'lock'], ['설정', 'settings']), null, '콘솔 · 정적 데모', null)});

add('status-page', '서비스 상태', 'data', 'console', '콘솔 상태', [
  head('서비스 상태', '마지막 확인 1분 전'),
  {type: 'notice', tone: 'warning', title: '일부 지연 발생', body: '파일 업로드 서비스에서 지연이 관측되어 조치 중입니다.', variant: 'banner'},
  grid('three', metric('API', '정상', '가동률 99.98%'), metric('웹', '정상', '가동률 99.99%'), metric('업로드', '지연', '가동률 98.2%', 'down', '-1.7%p')),
  {type: 'table', title: '구성 요소', caption: '구성 요소별 상태', columns: ['구성 요소', '상태', '지연'], rows: [['API', '정상', '82ms'], ['웹', '정상', '120ms'], ['업로드', '지연', '1.8s'], ['알림', '정상', '210ms']], state: 'ready'},
  {type: 'timeline', title: '사건 기록', items: [{time: '14:20', title: '업로드 지연 감지', description: '원인 분석 중', status: '진행'}, {time: '09:03', title: '알림 지연 해소', status: '완료'}]},
], {axes: {shell: 'topbar'}, chrome: chrome(nav(['현황', 'chart'], ['기록', 'clock'], ['구독', 'bell']), '알림 구독', '콘솔 · 정적 데모', null)});

add('billing', '결제·구독 관리', 'settings', 'trust', '플로우웍스', [
  head('결제와 청구', '다음 결제일은 11월 19일입니다.', {actions: [A('결제 수단 변경', 'secondary')]}),
  grid('three', metric('이번 달 청구액', '49,500원', '5명 × 9,900원', 'up', '+9,900원'), metric('남은 자동화 규칙', '62개', '100개 중 38개 사용'), metric('다음 결제일', '11. 19.', '카드 ****1234')),
  {type: 'aside', side: 'end', label: '현재 플랜', children: [
    {type: 'table', title: '청구 내역', caption: '최근 3개월 결제 내역', columns: ['날짜', '내용', '금액', '상태'], rows: [['10월 19일', '팀 플랜 · 5명', '49,500원', '결제 완료'], ['9월 19일', '팀 플랜 · 4명', '39,600원', '결제 완료'], ['8월 19일', '팀 플랜 · 4명', '39,600원', '결제 완료']], state: 'ready'},
    {type: 'properties', title: '현재 플랜', items: [{label: '플랜', value: '팀'}, {label: '사용자', value: '5명'}, {label: '결제 수단', value: '신한카드 ****1234'}, {label: '세금계산서', value: '자동 발행'}]}]},
  {type: 'progress', label: '이번 달 저장 공간', value: 64, detail: '100GB 중 64GB 사용', tone: 'brand'},
  {type: 'notice', tone: 'info', title: '세금계산서', body: '결제 다음 날 등록한 이메일로 자동 발송됩니다. 사업자 정보는 설정에서 바꿀 수 있어요.'},
], {chrome: chrome(nav(['개요', 'home'], ['프로젝트', 'folder'], ['청구', 'credit-card'], ['설정', 'settings']), null, '© 2026 플로우웍스', null)});

add('team-directory', '구성원 디렉터리', 'listing', 'hub', '허브', [
  head('팀 구성원', '디자인 · 개발 · 운영 12명'),
  {type: 'filter-bar', placeholder: '이름 또는 역할 검색', filters: ['전체', '디자인', '개발', '운영'], selected: 0},
  {type: 'team', title: '구성원', members: [{name: '김다선', role: '디자인 리드', bio: '디자인 시스템'}, {name: '이지훈', role: '프런트엔드', bio: '컴포넌트 라이브러리'}, {name: '박서연', role: '모션 디자이너', bio: '인터랙션'}, {name: '최민준', role: '리서처', bio: '사용성 조사'}, {name: '정하늘', role: '백엔드', bio: 'API'}, {name: '한유진', role: '운영', bio: '고객 지원'}]},
  {type: 'pagination', pages: 2, current: 1},
], {chrome: chrome(NAV_APP, null, '허브 · 정적 데모', null)});

// ---------- docs / article / blog ----------
add('docs-reference', '레퍼런스 문서', 'docs', 'manual', '매뉴얼', [
  head('API 시작하기', '인증 토큰을 만들고 첫 요청을 보내는 데 5분이면 충분합니다.', {eyebrow: '가이드', meta: ['2.4.0', '2026-10-14 갱신', '읽는 시간 5분']}),
  {type: 'aside', side: 'end', label: '이 문서의 목차', sticky: 'yes', children: [
    section('시작하기', [
      section('설치', [prose('요구 사항', 'Node.js 20 이상이 필요합니다. 패키지는 의존성이 없고, 브라우저와 서버에서 같은 코드로 동작합니다.'), {type: 'tabs', variant: 'underline', children: [{type: 'tab', label: 'npm', children: [{type: 'code', label: '터미널', language: 'bash', code: 'npm install @flowworks/sdk'}]}, {type: 'tab', label: 'pnpm', children: [{type: 'code', label: '터미널', language: 'bash', code: 'pnpm add @flowworks/sdk'}]}, {type: 'tab', label: 'yarn', children: [{type: 'code', label: '터미널', language: 'bash', code: 'yarn add @flowworks/sdk'}]}]}], {anchor: 'install'}),
      section('인증', [prose('토큰 만들기', '설정 > 개발자 메뉴에서 토큰을 만들어 환경 변수에 저장하세요. 토큰은 한 번만 보여 드립니다.'), {type: 'notice', tone: 'warning', title: '토큰을 코드에 넣지 마세요', body: '저장소에 올라간 토큰은 즉시 폐기해야 합니다. 노출이 의심되면 설정에서 바로 재발급할 수 있어요.'}], {anchor: 'auth'}),
      section('첫 요청', [prose('프로젝트 목록 불러오기', '아래 코드는 내 워크스페이스의 프로젝트를 최근 수정순으로 가져옵니다.'), {type: 'code', label: 'list-projects.js', language: 'js', code: 'import {Client} from "@flowworks/sdk";\n\nconst client = new Client({token: process.env.FLOW_TOKEN});\nconst {items} = await client.projects.list({limit: 20, sort: "-updatedAt"});\nconsole.log(items.map(p => p.name));'}, {...media('diagram', '16:9', '클라이언트, API 게이트웨이, 프로젝트 서비스로 이어지는 요청 흐름도', '그림 1. 요청은 게이트웨이에서 토큰을 확인한 뒤 프로젝트 서비스로 전달됩니다.')}, {type: 'table', title: '요청 매개변수', caption: 'projects.list 매개변수', columns: ['이름', '타입', '기본값', '설명'], rows: [['limit', '정수', '20', '한 번에 가져올 개수(최대 100)'], ['sort', '문자열', '-updatedAt', '정렬 기준. 앞에 -를 붙이면 내림차순'], ['cursor', '문자열', '없음', '다음 페이지를 가리키는 값']], state: 'ready'}], {anchor: 'first'}),
      section('오류 처리', [{type: 'table', title: '응답 코드', caption: '자주 만나는 응답 코드', columns: ['코드', '의미', '대응'], rows: [['401', '토큰이 없거나 만료됨', '토큰을 다시 발급하세요'], ['429', '요청이 너무 많음', 'Retry-After 헤더만큼 기다린 뒤 재시도'], ['503', '일시적인 서버 점검', '잠시 후 다시 시도하세요']], state: 'ready'}, {type: 'faq', title: '자주 묻는 질문', items: [{question: '요청 한도는 얼마인가요?', answer: '토큰당 분당 600회입니다. 한도를 넘으면 429 응답과 함께 기다려야 할 시간이 헤더로 내려와요.'}, {question: '브라우저에서 바로 호출해도 되나요?', answer: '읽기 전용 토큰에 한해 가능합니다. 쓰기 토큰은 서버에서만 사용하세요.'}]}], {anchor: 'errors'}),
    ]),
    {type: 'toc', title: '이 문서의 목차'}]},
], {chrome: chrome(nav(['소개', 'book', '#main', '시작하기'], ['API 시작하기', 'play', '#main', '시작하기', true], ['인증', 'lock', '#main', '가이드'], ['오류 처리', 'alert-circle', '#main', '가이드'], ['클라이언트', 'code', '#main', '레퍼런스'], ['웹훅', 'zap', '#main', '레퍼런스'], ['변경 기록', 'clock', '#main', '릴리스']), null, '매뉴얼 · 정적 데모', null)});

add('tutorial', '튜토리얼', 'docs', 'manual', '매뉴얼', [
  head('첫 화면 만들기', '15분 안에 Blueprint 하나로 완성합니다.', {eyebrow: '튜토리얼'}),
  {type: 'stepper', steps: ['준비', '작성', '검증', '빌드'], current: 2},
  {type: 'aside', side: 'end', size: 'wide', sticky: 'yes', label: '이 단계의 명령어', children: [
    {type: 'steps', title: '따라 하기', items: [{title: '예제 복사', description: 'examples 폴더에서 가까운 예제를 복사합니다.'}, {title: '값 고르기', description: '테마, 팔레트, 셸을 카탈로그에서 고릅니다.'}, {title: '검증', description: 'validate 명령으로 오류를 확인합니다. 오류 경로와 규칙 ID를 읽고 카탈로그 안의 값으로 고칩니다.'}, {title: '빌드', description: 'build 명령으로 HTML을 만들고 check 명령으로 산출물을 한 번 더 검사합니다.'}]},
    {type: 'code', label: '검증과 빌드', language: 'bash', code: 'npm run kit -- validate my.json\nnpm run kit -- build my.json --out out/my\nnpm run kit -- check out/my'}]},
  {type: 'notice', tone: 'success', title: '여기까지 오셨다면', body: 'out/my/index.html을 브라우저로 열어 확인하세요.'},
], {axes: {shell: 'topbar'}, chrome: chrome(nav(['시작하기', 'book'], ['튜토리얼', 'play'], ['레퍼런스', 'code']), null, '매뉴얼 · 정적 데모', null)});

add('article', '읽는 문서', 'article', 'editorial', '디자인 노트', [
  head('일관성은 같은 모양을 뜻하지 않습니다.', '디자인 노트 · 2026년 10월 18일', {eyebrow: '에세이'}),
  {...media('photo', '21:9', '색 견본과 스케치를 펼친 작업 책상', '색 견본과 스케치를 펼쳐 둔 작업 책상'), motif: 'swatches'},
  prose('선택을 위한 규칙', '규칙은 결정을 대신하는 것이 아니라, 결정에 필요한 맥락을 보존합니다.\n\n모든 화면을 하나의 정답으로 맞추기보다, 서로 다른 목적을 가진 화면이 같은 언어로 이야기하게 합니다.', 'lead'),
  section('조립하는 세 가지 층위', [prose('재료와 역할', '색과 간격은 의미를 가진 토큰으로 연결합니다. 읽는 순서와 관계는 부품의 구조로 표현합니다.'), {type: 'quote', quote: '규칙은 자유를 줄이는 것이 아니라 선택의 비용을 줄입니다.', author: '디자인 노트'}, {type: 'list', title: '다음에 확인할 것', items: [{title: '목적에 맞는 위계', description: '가장 중요한 정보가 먼저 읽히는가?'}, {title: '관련된 것 사이의 거리', description: '한 그룹의 내부 간격이 그룹 사이보다 작은가?'}, {title: '실패했을 때의 경험', description: '현재 상황과 다음 행동을 설명하는가?'}], state: 'ready', variant: 'check'}]),
  {type: 'notice', tone: 'warning', title: '규칙도 틀릴 수 있습니다.', body: '재현 가능한 반례와 근거를 남겨 카탈로그를 개정하세요.'},
], {chrome: chrome(nav(['글', 'file'], ['아카이브', 'folder'], ['소개', 'user']), null, '© 2026 디자인 노트', ['RSS', '문의'])});

add('blog-index', '블로그 목록', 'blog', 'journal', '느린 기록', [
  head('느린 기록', '천천히 쓰고 오래 남기는 글'),
  {type: 'filter-bar', placeholder: '글 검색', filters: ['전체', '디자인 시스템', '접근성', '색', '도구'], selected: 0},
  card('규칙이 자유를 만든다', '처음부터 모든 것이 열려 있으면 결정이 오래 걸립니다. 허용되는 값을 먼저 정하면 그 안에서 더 다양한 선택을 빠르게 할 수 있다는 이야기.', {variant: 'horizontal', visual: 'photo', motif: 'grid', ratio: '4:3', meta: '10월 18일 · 6분', badge: '디자인 시스템', author: '김다선', action: A('읽기', 'ghost')}),
  {type: 'grid', columns: 'three', children: [card('색은 의미를 따른다', '팔레트를 고르기 전에 역할을 먼저 정하는 방법.', {variant: 'media', visual: 'photo', motif: 'swatches', ratio: '16:9', meta: '10월 11일 · 5분', badge: '색', author: '이지훈', action: A('읽기', 'ghost')}), card('상태를 먼저 그린다', '로딩, 빈 화면, 오류가 제품의 완성도를 만듭니다.', {variant: 'media', visual: 'photo', motif: 'states', ratio: '16:9', meta: '10월 4일 · 7분', badge: '인터랙션', author: '박서연', action: A('읽기', 'ghost')}), card('접근성은 기본값', '나중에 붙이지 않고 처음부터 둘 때 드는 비용을 따져 봤어요.', {variant: 'media', visual: 'photo', motif: 'type', ratio: '16:9', meta: '9월 27일 · 4분', badge: '접근성', author: '최민준', action: A('읽기', 'ghost')})]},
  {type: 'tags', title: '주제', items: ['디자인 시스템', '접근성', '타이포그래피', '색', '도구', '회고'], variant: 'chips'},
  {type: 'pagination', pages: 5, current: 1},
], {chrome: chrome(nav(['글', 'file'], ['주제', 'tag'], ['소개', 'user']), '구독', '© 2026 느린 기록', ['RSS', '문의'])});

add('blog-post', '블로그 글', 'article', 'journal', '느린 기록', [
  head('규칙이 자유를 만든다', '10월 18일 · 6분 읽기', {eyebrow: '디자인 시스템'}),
  {...media('photo', '21:9', '책상 위에 펼쳐진 스케치와 색 견본', '색 견본과 스케치를 펼쳐 둔 작업 책상'), motif: 'swatches'},
  prose('왜 규칙부터 정할까', '처음부터 모든 것이 열려 있으면 결정이 오래 걸립니다. 허용되는 값을 먼저 정하면, 그 안에서 훨씬 다양한 선택을 빠르게 할 수 있습니다.\n\n색, 간격, 서체를 의미 있는 이름으로 묶어 두면 다음 화면에서도 같은 판단을 반복하지 않아도 됩니다.'),
  {type: 'quote', quote: '제약은 창의성을 막지 않고 방향을 줍니다.', author: '느린 기록'},
  prose('다음으로', '이 글에서 다룬 규칙은 다음 글에서 실제 화면 예시와 함께 이어집니다.'),
  {type: 'tags', title: '태그', items: ['디자인 시스템', '규칙', '회고'], variant: 'badges'},
], {chrome: chrome(nav(['글', 'file'], ['주제', 'tag'], ['소개', 'user']), '구독', '© 2026 느린 기록', ['RSS', '문의'])});

add('changelog', '변경 기록', 'docs', 'manual', 'FlowWorks 문서', [
  head('변경 기록', 'FlowWorks SDK의 버전별 변경입니다. 호환되지 않는 변경은 이전 방법과 함께 적습니다.', {eyebrow: '릴리스 노트', meta: ['2.4.0', '2026-10-14 갱신', '릴리스 3개']}),
  {type: 'timeline', title: '릴리스', variant: 'release', items: [
    {time: '2.4.0', date: '2026-10-14', title: '목록 조회에 커서 페이지네이션', description: '프로젝트와 작업 목록을 끊김 없이 이어서 가져옵니다.', status: '완료', changes: [{kind: '신규', text: 'projects.list에 cursor와 limit(최대 100)을 추가했습니다.'}, {kind: '개선', text: '429 응답에서 Retry-After 값만큼 기다린 뒤 자동으로 다시 시도합니다.'}, {kind: '수정', text: '토큰이 만료된 직후 401이 두 번 보이던 문제를 고쳤습니다.'}]},
    {time: '2.3.0', date: '2026-09-20', title: '웹훅 서명 검증 도우미', description: '받은 웹훅이 우리가 보낸 것인지 한 줄로 확인합니다.', status: '완료', changes: [{kind: '신규', text: 'verifyWebhook(payload, signature, secret) 함수를 추가했습니다.'}, {kind: '개선', text: '오류 메시지에 요청 ID를 포함해 문의할 때 바로 찾을 수 있습니다.'}, {kind: '제거', text: 'Node.js 16 지원을 종료했습니다. Node.js 20 이상을 사용하세요.'}]},
    {time: '2.2.1', date: '2026-09-02', title: '타입 정의 보완', description: 'TypeScript 사용자를 위한 작은 수정입니다.', status: '완료', changes: [{kind: '수정', text: 'Project.members가 선택 값으로 잘못 표시되던 타입을 바로잡았습니다.'}, {kind: '수정', text: 'ESM 환경에서 기본 내보내기가 undefined가 되는 문제를 고쳤습니다.'}]},
  ]},
  {type: 'table', title: '지원 환경', caption: '버전별 지원하는 Node.js와 브라우저', columns: ['버전', 'Node.js', '브라우저', '지원 상태'], rows: [['2.4.x', '20 이상', '최신 2개 버전', '지원 중'], ['2.3.x', '20 이상', '최신 2개 버전', '보안 수정만'], ['2.2.x', '18 이상', '최신 2개 버전', '지원 종료']], state: 'ready'},
], {chrome: chrome(nav(['소개', 'book', '#main', '시작하기'], ['설치', 'download', '#main', '시작하기'], ['API 레퍼런스', 'code', '#main', '레퍼런스'], ['오류 코드', 'alert-circle', '#main', '레퍼런스'], ['변경 기록', 'clock', '#main', '릴리스', true], ['마이그레이션', 'refresh', '#main', '릴리스']), null, 'FlowWorks 문서 · 정적 데모', null)});

add('help-center', '도움말 센터', 'docs', 'clarity', '도움말', [
  head('무엇을 도와드릴까요?', '자주 찾는 질문과 안내를 모았습니다.', {align: 'center'}),
  {type: 'filter-bar', placeholder: '도움말 검색', filters: ['전체', '시작하기', '결제', '계정'], selected: 0},
  {type: 'links', title: '인기 문서', items: [{label: '처음 시작하기', href: '#main', description: '5분 안에 첫 화면 만들기'}, {label: '결제 수단 변경', href: '#main', description: '카드와 계좌 관리'}, {label: '비밀번호 재설정', href: '#main', description: '로그인이 안 될 때'}]},
  {type: 'faq', title: '자주 묻는 질문', items: [{question: '비밀번호를 잊었어요.', answer: '로그인 화면의 ‘비밀번호 재설정’에서 이메일로 링크를 받으세요.'}, {question: '구독을 해지하고 싶어요.', answer: '설정의 결제 메뉴에서 언제든 해지할 수 있습니다.'}, {question: '데이터를 내려받을 수 있나요?', answer: '설정의 데이터 메뉴에서 내보내기를 선택하세요.'}]},
  {type: 'cta', tone: 'brand', title: '원하는 답을 찾지 못하셨나요?', action: A('문의하기', 'primary')},
], {axes: {shell: 'topbar', width: 'standard'}, chrome: chrome(nav(['시작하기', 'play'], ['결제', 'credit-card'], ['계정', 'user'], ['문의', 'message']), null, '도움말 · 정적 데모', null)});

add('policy', '정책 문서', 'article', 'civic', '시빅', [
  head('개인정보 처리방침', '시행일 2026년 10월 18일'),
  {type: 'notice', tone: 'info', title: '요약', body: '필요한 최소한의 정보만 수집하며 목적이 끝나면 지체 없이 파기합니다.'},
  prose('1. 수집하는 정보', '서비스 제공에 필요한 이메일과 이름을 수집합니다.\n\n수집한 정보는 동의 없이 제3자에게 제공하지 않습니다.', 'legal'),
  prose('2. 보관 기간', '회원 탈퇴 시 즉시 파기합니다. 관계 법령에 따라 보관이 필요한 정보는 해당 기간 동안만 분리 보관합니다.', 'legal'),
  prose('3. 이용자의 권리', '언제든 본인의 정보를 조회·정정·삭제할 수 있으며, 처리 정지를 요구할 수 있습니다.', 'legal'),
], {chrome: chrome(nav(['개요', 'info'], ['처리방침', 'shield'], ['문의', 'mail']), null, '© 2026 시빅 서비스', ['이용약관', '문의'])});

add('civic-service', '민원 안내', 'docs', 'civic', '시민 서비스', [
  head('전입신고 안내', '이사 후 14일 이내에 신고해야 합니다.', {eyebrow: '주민 서비스'}),
  {type: 'notice', tone: 'warning', title: '기한 안내', body: '기한을 넘기면 과태료가 부과될 수 있습니다.'},
  {type: 'steps', title: '신청 방법', items: [{title: '준비물 확인', description: '신분증과 임대차계약서를 준비합니다.'}, {title: '온라인 신청', description: '본인 인증 후 신청서를 작성합니다.'}, {title: '처리 확인', description: '처리 결과는 문자로 안내합니다.'}]},
  {type: 'properties', title: '처리 정보', items: [{label: '처리 기간', value: '즉시 처리(영업일 기준)'}, {label: '수수료', value: '없음'}, {label: '담당 부서', value: '주민센터 민원실'}]},
  {type: 'faq', title: '자주 묻는 질문', items: [{question: '대리인이 신청할 수 있나요?', answer: '위임장과 대리인 신분증을 지참하면 가능합니다.'}, {question: '해외에 있는데 신청할 수 있나요?', answer: '국내 거주지가 있어야 온라인 신청이 가능합니다.'}]},
], {chrome: chrome(nav(['민원', 'file'], ['안내', 'info'], ['문의', 'phone']), '민원 신청', '© 2026 시민 서비스 · 대표전화 000-0000', ['개인정보', '접근성 안내'])});

// ---------- commerce ----------
add('product-detail', '상품 상세', 'commerce', 'commerce', '무드램프', [
  head('무드램프 미니', '열두 가지 분위기를 내는 휴대용 램프', {eyebrow: '조명'}),
  {type: 'split', ratio: 'wide-start', align: 'start', children: [{type: 'gallery', layout: 'showcase', items: [{kind: 'photo', motif: 'orb', alt: '램프 정면'}, {kind: 'photo', motif: 'orb', alt: '램프 측면'}, {kind: 'photo', motif: 'orb', alt: '켜 둔 모습'}, {kind: 'photo', motif: 'desklamp', alt: '책상 위에 놓은 모습'}, {kind: 'photo', motif: 'books', alt: '책과 함께 놓은 모습'}]}, {type: 'buy-box', title: '무드램프 미니', price: '39,000원', note: '3만원 이상 무료 배송 · 오늘 주문하면 모레 도착', badge: '베스트', options: [{label: '색상', choices: ['웜 화이트', '라벤더', '민트']}, {label: '충전기', choices: ['포함', '미포함']}], action: A('장바구니 담기', 'primary'), secondaryAction: A('바로 구매', 'secondary')}]},
  {type: 'tabs', variant: 'underline', children: [{type: 'tab', label: '상세 정보', children: [prose('제품 설명', '손바닥만 한 크기에 열두 가지 조명 모드를 담았습니다. 책상 위에서는 은은한 스탠드로, 침대맡에서는 수면등으로 쓰세요. 충전은 USB-C로 두 시간, 사용은 열 시간입니다.'), {type: 'properties', title: '사양', items: [{label: '크기', value: '지름 8cm · 높이 12cm'}, {label: '무게', value: '180g'}, {label: '방수', value: 'IPX4 생활방수'}, {label: '배터리', value: '2,000mAh · 최대 10시간'}]}]}, {type: 'tab', label: '리뷰 1,204', children: [{type: 'reviews', title: '구매 후기', score: '4.8', count: '리뷰 1,204개', items: [{author: '김**', rating: 5, text: '조명이 부드러워서 잠들기 전에 켜 두면 마음이 편해져요. 선물용으로 두 개 더 샀습니다.', date: '2026.10.02'}, {author: '이**', rating: 4, text: '배터리가 오래가요. 색 전환이 조금 느린 게 아쉽지만 가격을 생각하면 만족합니다.', date: '2026.09.27'}]}]}, {type: 'tab', label: '배송·교환', children: [prose('배송 안내', '평일 오후 2시 이전 주문은 당일 출고됩니다. 제주·도서산간은 하루가 더 걸려요.\n\n수령 후 7일 이내 교환·환불이 가능하며 단순 변심은 왕복 배송비가 부과됩니다.')]}]},
], {chrome: chrome(nav(['신상품', 'sparkles'], ['조명', 'sun'], ['이벤트', 'gift'], ['고객센터', 'message']), '장바구니', '© 2026 무드램프', FOOT)});

add('product-listing', '상품 목록', 'commerce', 'commerce', '무드램프', [
  head('조명', '상품 24개 · 오늘 주문하면 모레 도착', {actions: [A('정렬: 인기순', 'secondary')]}),
  {type: 'aside', side: 'start', label: '필터', children: [
    {type: 'grid', columns: 'three', children: [
      card('무드램프 미니', '손바닥만 한 크기에 12가지 분위기', {variant: 'media', visual: 'photo', motif: 'orb', ratio: '1:1', badge: '베스트', meta: '무드램프', price: '39,000원', listPrice: '49,000원', rating: '4.8', reviews: '1,204'}),
      card('데스크 라이트 프로', '각도를 자유롭게 바꾸는 암 조명', {variant: 'media', visual: 'photo', motif: 'desklamp', ratio: '1:1', meta: '노르딕 라이트', price: '59,000원', rating: '4.7', reviews: '382'}),
      card('캔들 워머 램프', '촛불 없이 향을 데우는 따뜻한 빛', {variant: 'media', visual: 'photo', motif: 'candle', ratio: '1:1', badge: '신상', meta: '무드램프', price: '45,000원', rating: '4.6', reviews: '98'}),
      card('클래식 독서등', '눈이 편한 3단계 밝기 조절', {variant: 'media', visual: 'photo', motif: 'lamp', ratio: '1:1', meta: '노르딕 라이트', price: '29,000원', listPrice: '35,000원', rating: '4.9', reviews: '2,310'}),
      card('플로어 램프 하루', '거실 한쪽을 채우는 스탠드 조명', {variant: 'media', visual: 'photo', motif: 'floorlamp', ratio: '1:1', meta: '하루 리빙', price: '129,000원', rating: '4.5', reviews: '211'}),
      card('센서 무드등', '움직임을 감지해 켜지는 야간등', {variant: 'media', visual: 'photo', motif: 'orb', ratio: '1:1', meta: '무드램프', price: '19,000원', listPrice: '24,000원', rating: '4.4', reviews: '640'})]},
    {type: 'form', title: '필터', variant: 'stacked', fields: [field('price', '가격대', 'select', {options: ['전체', '3만원 이하', '3~5만원', '5만원 이상'], requirement: 'optional'}), field('stock', '재고 있는 상품만', 'switch', {requirement: 'optional'}), field('color', '색상', 'radio', {options: ['전체', '화이트', '컬러'], requirement: 'optional'})], submitLabel: '적용'}]},
  {type: 'pagination', pages: 4, current: 1},
], {chrome: chrome([{label: '신상품', href: '#main', icon: 'sparkles'}, {label: '조명', href: '#main', icon: 'sun', mega: [{label: '스탠드', href: '#main', description: '책상과 침대맡을 위한 조명'}, {label: '독서등', href: '#main', description: '눈이 편한 집중 조명'}, {label: '무드등', href: '#main', description: '분위기를 바꾸는 작은 램프'}, {label: '플로어', href: '#main', description: '공간을 채우는 큰 조명'}]}, {label: '이벤트', href: '#main', icon: 'gift'}, {label: '고객센터', href: '#main', icon: 'message'}], '장바구니', '© 2026 무드램프', FOOT)});

add('checkout', '결제', 'commerce', 'commerce', '무드램프', [
  head('결제하기', '배송 정보를 입력하고 결제를 진행하세요.'),
  {type: 'stepper', steps: ['장바구니', '배송 정보', '결제', '완료'], current: 2},
  {type: 'aside', side: 'end', label: '주문 요약', children: [
    {type: 'form', title: '배송 정보', variant: 'two-column', fields: [field('name', '받는 분', 'text'), field('phone', '연락처', 'tel', {placeholder: '010-0000-0000'}), field('address', '주소', 'text'), field('memo', '배송 메모', 'textarea', {requirement: 'optional'}), field('save', '다음에도 이 주소 사용', 'checkbox', {requirement: 'optional'})], submitLabel: '결제 진행'},
    {type: 'summary', title: '주문 요약', thumb: {motif: 'orb', name: '무드램프 미니', detail: '웜 화이트 · 충전기 포함 · 1개'}, items: [{label: '상품 금액', value: '39,000원'}, {label: '배송비', value: '0원'}, {label: '할인', value: '-3,000원'}], total: {label: '총 결제 금액', value: '36,000원'}}]},
], {chrome: chrome(nav(['장바구니', 'cart'], ['주문', 'bag'], ['고객센터', 'message']), null, '© 2026 무드램프', FOOT)});

add('order-tracking', '주문 배송 조회', 'commerce', 'commerce', '무드램프', [
  head('주문 배송 조회', '주문번호 A-10231'),
  {type: 'aside', side: 'end', label: '주문 정보', children: [
    {type: 'timeline', title: '배송 현황', items: [{time: '10월 18일 09:12', title: '배송 중', description: '서울 성동 터미널 출발', status: '진행'}, {time: '10월 17일 20:40', title: '상품 출고', description: '물류센터 출고', status: '완료'}, {time: '10월 17일 10:12', title: '결제 완료', status: '완료'}, {time: '10월 19일', title: '도착 예정', status: '예정'}]},
    {type: 'summary', title: '주문 내역', items: [{label: '무드램프 미니', value: '39,000원'}, {label: '배송비', value: '0원'}], total: {label: '합계', value: '39,000원'}}]},
], {chrome: chrome(nav(['주문', 'bag'], ['배송', 'truck'], ['문의', 'message']), null, '© 2026 무드램프', FOOT)});

add('beauty-detail', '뷰티 상세', 'commerce', 'beauty', '르네', [
  head('수분 장벽 크림', '4주 후 97%가 윤광 개선을 경험했어요.', {eyebrow: '스킨케어'}),
  {type: 'split', children: [{...media('photo', '1:1', '크림 제품과 질감 클로즈업'), motif: 'jar'}, {type: 'buy-box', title: '수분 장벽 크림 50ml', price: '38,000원', note: '정기배송 시 10% 할인', options: [{label: '구매 방식', choices: ['1회 구매', '정기배송']}], action: A('장바구니', 'primary')}]},
  grid('three', metric('수분 개선', '97%', '4주 사용 후'), metric('피부 장벽', '+42%', '소비자 테스트'), metric('재구매율', '68%')),
  section('핵심 성분', [{type: 'feature-list', layout: 'grid', items: [feat('droplet', '세라마이드', '무너진 피부 장벽을 채웁니다.'), feat('leaf', '병풀 추출물', '붉은 피부를 진정시킵니다.'), feat('sparkles', '판테놀', '수분을 오래 머금게 합니다.')]}]),
  section('사용법', [{type: 'steps', title: '아침·저녁 3단계', layout: 'horizontal', items: [{title: '세안', description: '미온수로 가볍게 씻습니다.'}, {title: '토너', description: '피부결을 정돈합니다.'}, {title: '크림', description: '콩알 크기를 얼굴 전체에 바릅니다.'}]}]),
  section('리뷰', [{type: 'reviews', title: '포토 리뷰', score: '4.9', count: '리뷰 842개', items: [{author: '윤**', rating: 5, text: '건조한 피부에도 부담이 없어요.', date: '2026.10.05'}, {author: '장**', rating: 5, text: '향이 은은해서 좋아요.', date: '2026.09.30'}]}]),
  {type: 'faq', title: '고지·배송·반품', items: [{question: '전성분이 궁금해요.', answer: '정제수, 글리세린, 세라마이드NP, 판테놀, 병풀추출물 외.'}, {question: '교환·반품은 어떻게 하나요?', answer: '미개봉 제품은 7일 이내 반품할 수 있습니다.'}]},
], {chrome: chrome(nav(['스킨케어', 'sparkles'], ['메이크업', 'heart'], ['세트', 'gift'], ['리뷰', 'star']), '장바구니', '© 2026 르네', FOOT)});

add('menu-dining', '메뉴판', 'commerce', 'dining', '소담 식당', [
  head('저녁 메뉴', '매일 오후 5시부터 10시까지 · 매주 월요일 휴무', {align: 'center', eyebrow: '소담 식당'}),
  {type: 'filter-bar', placeholder: '메뉴 검색', filters: ['전체', '시그니처', '식사', '코스'], selected: 0},
  {type: 'menu', title: '시그니처', layout: 'photo', items: [{name: '한우 갈비찜', description: '24시간 숙성한 갈비와 제철 채소', price: '38,000', tag: '시그니처', motif: 'food'}, {name: '들깨 칼국수', description: '직접 뽑은 면과 들깨 육수', price: '12,000', motif: 'noodles'}, {name: '모둠 전', description: '계절 재료로 부친 전 다섯 가지', price: '18,000', motif: 'pancakes'}]},
  {type: 'menu', title: '식사', layout: 'leader', items: [{name: '된장찌개 정식', description: '두부와 호박, 직접 담근 된장', price: '11,000', motif: 'stew'}, {name: '불고기 정식', description: '달큰한 양념에 재운 소불고기', price: '14,000', motif: 'food'}, {name: '비빔밥', description: '일곱 가지 나물과 고추장', price: '10,000', motif: 'bibimbap'}]},
  {type: 'divider', label: '코스'},
  {type: 'menu', title: '코스 구성', layout: 'grid', items: [{name: '소담 코스', description: '전채 · 메인 · 식사 · 후식', price: '45,000'}, {name: '가족 코스', description: '4인 기준 · 사이드 포함', price: '150,000'}]},
  {type: 'notice', tone: 'info', title: '알레르기·원산지', body: '대두, 밀, 계란, 우유를 사용합니다. 쇠고기는 국내산 한우입니다.'},
], {chrome: chrome(nav(['메뉴', 'utensils'], ['예약', 'calendar'], ['오시는 길', 'map-pin']), '예약하기', '© 2026 소담 식당 · 매주 월요일 휴무', FOOT)});

add('realty-detail', '부동산 매물', 'commerce', 'realty', '집찾기', [
  head('성수동 신축 아파트 84㎡', '매매 12억 5,000만원', {eyebrow: '매물 번호 2026-1018'}),
  {type: 'gallery', layout: 'grid', items: [{kind: 'photo', motif: 'interior', alt: '거실', caption: '거실'}, {kind: 'photo', motif: 'building', alt: '단지 전경', caption: '단지 전경'}, {kind: 'diagram', alt: '평면도', caption: '평면도'}, {kind: 'map', alt: '위치 지도', caption: '위치'}]},
  {type: 'aside', side: 'end', label: '문의', children: [
    {type: 'properties', title: '기본 정보', items: [{label: '전용 면적', value: '84㎡ (25평)'}, {label: '방/욕실', value: '3개 / 2개'}, {label: '층', value: '12층 / 25층'}, {label: '입주 가능', value: '즉시'}, {label: '관리비', value: '월 28만원'}]},
    {type: 'buy-box', title: '방문 상담 예약', price: '12억 5,000만원', note: '실거래가 12억 2,000만원(9월)', action: A('상담 예약', 'primary'), secondaryAction: A('전화 문의', 'secondary')}]},
  section('시세', [{type: 'chart', title: '최근 실거래가', caption: '월별 평균 실거래가(억원)', kind: 'line', unit: '억', categories: ['5월', '6월', '7월', '8월', '9월'], series: [{name: '실거래가', values: [11.6, 11.8, 12.0, 12.1, 12.2]}]}]),
  {type: 'notice', tone: 'warning', title: '중개 정보', body: '중개사 등록번호와 매물 검증 결과는 상담 시 안내해 드립니다.'},
], {chrome: chrome(nav(['매매', 'building'], ['전세', 'home'], ['월세', 'dollar'], ['지도', 'map-pin']), '문의', '© 2026 집찾기 · 중개사무소 등록번호 00000', FOOT)});

add('stay-detail', '숙소 상세', 'commerce', 'stay', '머무름', [
  head('바다가 보이는 독채 스테이', '제주 · 최대 4인 · 침실 2', {eyebrow: '슈퍼호스트'}),
  {type: 'gallery', layout: 'masonry', items: [{kind: 'photo', motif: 'coast', alt: '바다가 보이는 거실', caption: '거실'}, {kind: 'photo', motif: 'interior', alt: '침실', caption: '침실'}, {kind: 'photo', motif: 'plant', alt: '테라스의 화분', caption: '테라스'}]},
  {type: 'aside', side: 'end', label: '예약', children: [
    section('숙소 소개', [prose('이런 곳이에요', '창문 너머로 바다가 펼쳐지는 작은 독채입니다. 아침에는 파도 소리로 일어나고, 저녁에는 테라스에서 노을을 볼 수 있어요.'), {type: 'feature-list', layout: 'grid', items: [feat('bed', '침실 2개', '퀸 베드 2개'), feat('coffee', '주방', '기본 조리도구와 커피머신'), feat('wifi-off', '디지털 디톡스', '와이파이 없이 쉬어가요')]}]),
    {type: 'buy-box', title: '1박 요금', price: '189,000원', note: '2박 이상 10% 할인', options: [{label: '인원', choices: ['2명', '3명', '4명']}], action: A('예약하기', 'primary')}]},
  {type: 'reviews', title: '후기', score: '4.97', count: '후기 312개', items: [{author: '민지', rating: 5, text: '조용하고 깨끗해서 완벽했어요.', date: '2026.10.01'}, {author: '준호', rating: 5, text: '아침 바다가 정말 좋았습니다.', date: '2026.09.20'}]},
], {chrome: chrome(nav(['숙소', 'bed'], ['체험', 'sparkles'], ['지도', 'map-pin']), '예약 확인', '© 2026 머무름', FOOT)});

// ---------- portfolio / general ----------
add('portfolio-grid', '포트폴리오 모음', 'portfolio', 'gallery', '김다선 포트폴리오', [
  head('선별한 작업', '2022–2026 · 아이덴티티, 웹, 모션'),
  {type: 'tags', items: ['전체', '아이덴티티', '웹', '모션', '포스터'], variant: 'outline'},
  {type: 'gallery', layout: 'grid', items: [{kind: 'photo', motif: 'coffee', alt: '카페 브랜딩', caption: '오월 커피 · 아이덴티티'}, {kind: 'photo', motif: 'poster', alt: '전시 포스터', caption: '빛의 기록전 · 포스터'}, {kind: 'device', alt: '앱 화면', caption: '모아 · 핀테크 앱'}, {kind: 'photo', motif: 'grid', alt: '재단 웹사이트 정보 구조', caption: '한빛재단 · 웹'}, {kind: 'video', alt: '모션 영상', caption: '디자인 데이 · 모션'}, {kind: 'photo', motif: 'package', alt: '식품 패키지', caption: '소담 · 패키지'}, {kind: 'photo', motif: 'brandmark', alt: '브랜드 마크 시스템', caption: '리프트 클럽 · 로고'}, {kind: 'photo', motif: 'museum', alt: '박물관 간판', caption: '한빛 박물관 · 사인'}]},
  {type: 'cta', title: '함께 작업해요', body: '새 프로젝트는 매달 두 건만 맡고 있어요. 이야기부터 나눠 봐요.', action: A('연락하기', 'primary')},
], {chrome: chrome(nav(['작업', 'image'], ['소개', 'user'], ['연락', 'mail']), null, '© 2026 김다선', ['Instagram', 'Email'])});

add('case-study', '사례 연구', 'portfolio', 'studio', '스튜디오 오로', [
  head('동네 카페의 브랜드를 다시 쓰다', '아이덴티티 · 웹 · 패키지 · 2026', {eyebrow: '사례 연구'}),
  {...media('photo', '21:9', '카페 매장 전경과 새 간판'), motif: 'coffee', overlay: '8주 프로젝트'},
  grid('three', metric('기간', '8주'), metric('재방문율', '+31%', '리뉴얼 3개월 후', 'up', '+31%'), metric('SNS 언급', '2.4배')),
  {type: 'split', children: [prose('문제', '오래된 간판과 제각각인 메뉴판이 가게의 이야기를 전하지 못하고 있었습니다.'), prose('접근', '손글씨 질감을 살린 로고를 만들고, 메뉴판·컵·웹을 한 시스템으로 묶었습니다.')]},
  {type: 'gallery', title: '결과물', items: [{kind: 'photo', motif: 'mug', alt: '새 로고가 적용된 컵'}, {kind: 'photo', motif: 'poster', alt: '메뉴판 패턴'}, {kind: 'device', alt: '모바일 웹'}]},
  {type: 'quote', quote: '가게의 분위기를 그대로 담아 주셨어요.', author: '사장님', role: '오월 커피'},
], {chrome: chrome(nav(['작업', 'image'], ['서비스', 'sparkles'], ['연락', 'mail']), '문의', '© 2026 스튜디오 오로', FOOT)});

add('about-team', '팀 소개', 'general', 'atelier', '아틀리에 모아', [
  head('함께 배우고 만드는 공간', '2019년부터 여섯 명이 시작했습니다.'),
  {type: 'split', children: [prose('우리 이야기', '작은 동네 공방에서 시작해 이제는 매달 300명이 찾는 배움터가 되었습니다.\n\n정답을 알려 주기보다, 스스로 만들어 보는 경험을 소중히 합니다.', 'lead'), media('photo', '4:3', '공방에서 함께 작업하는 모습')]},
  {type: 'team', title: '함께하는 사람들', members: [{name: '김다선', role: '대표 · 도예', bio: '흙의 감각을 가르칩니다.'}, {name: '이지훈', role: '목공', bio: '나무를 다루는 법.'}, {name: '박서연', role: '염색', bio: '천연 염료 수업.'}]},
  {type: 'timeline', title: '지나온 길', variant: 'rail', items: [{time: '2019', title: '공방 시작', description: '동네 골목의 작은 공방에서 여섯 명이 시작했습니다.', status: '완료'}, {time: '2022', title: '온라인 클래스 오픈', description: '전국 어디서나 도예와 목공을 배울 수 있게 되었습니다.', status: '완료'}, {time: '2026', title: '두 번째 공간', description: '성수동에 더 큰 작업실을 열 준비를 하고 있습니다.', status: '예정'}]},
], {chrome: chrome(nav(['소개', 'info'], ['클래스', 'book'], ['후기', 'star'], ['문의', 'mail']), '클래스 신청', '© 2026 아틀리에 모아', FOOT)});

add('music-player', '음악 플레이어', 'general', 'nocturne', '녹턴', [
  head('오늘의 믹스', '밤에 어울리는 조용한 곡들'),
  {type: 'split', ratio: 'wide-end', children: [{...media('photo', '1:1', '앨범 커버', '지금 재생 중: 새벽의 끝'), motif: 'type'}, {type: 'list', title: '재생 목록', variant: 'card', items: [{title: '새벽의 끝', description: '03:42', status: '진행', icon: 'music'}, {title: '불 꺼진 도시', description: '04:05', icon: 'music'}, {title: '창가의 비', description: '03:18', icon: 'music'}], state: 'ready'}]},
  {type: 'progress', label: '재생 위치', value: 38, detail: '01:24 / 03:42', tone: 'brand'},
  {type: 'actions', align: 'center', items: [A('이전', 'ghost'), A('재생', 'primary'), A('다음', 'ghost')]},
], {chrome: chrome(nav(['홈', 'home'], ['검색', 'search'], ['보관함', 'bookmark']), null, '녹턴 · 정적 데모', null)});

// ---------- form / settings ----------
add('contact', '문의하기', 'form', 'clinic', '맑은숨', [
  head('문의하기', '영업일 기준 하루 안에 답변드립니다.'),
  {type: 'aside', side: 'end', label: '연락처', size: 'narrow', children: [
    {type: 'form', title: '문의 내용', intro: '데모이므로 입력은 저장되거나 전송되지 않습니다.', fields: [field('name', '이름', 'text', {placeholder: '이름을 입력하세요'}), field('email', '이메일', 'email', {placeholder: 'name@example.com'}), field('topic', '문의 유형', 'select', {options: ['진료 문의', '예약 변경', '기타']}), field('body', '내용', 'textarea', {placeholder: '문의하실 내용을 적어 주세요', help: '개인정보는 적지 않아도 됩니다.'}), field('agree', '개인정보 수집에 동의합니다', 'checkbox')], submitLabel: '입력 확인'},
    {type: 'properties', title: '연락처', items: [{label: '전화', value: '02-000-0000'}, {label: '운영 시간', value: '평일 09:00~18:00'}, {label: '점심시간', value: '13:00~14:00'}, {label: '주소', value: '서울 성동구 예시로 5, 2층'}]}]},
], {chrome: chrome(nav(['진료안내', 'clock'], ['예약', 'calendar'], ['문의', 'mail']), '진료 예약', '© 2026 맑은숨 내과의원', FOOT)});

add('onboarding-wizard', '온보딩 단계', 'form', 'learning', '러닝메이트', [
  head('프로필을 만들어 볼까요?', '두 번째 단계 · 관심사를 알려 주세요.'),
  {type: 'stepper', steps: ['계정', '관심사', '목표', '완료'], current: 2},
  {type: 'form', title: '관심사 선택', fields: [field('level', '현재 수준', 'radio', {options: ['처음이에요', '조금 해 봤어요', '꽤 익숙해요']}), field('topics', '관심 분야', 'select', {options: ['웹', '데이터', '디자인', '모바일']}), field('daily', '매일 알림 받기', 'switch', {requirement: 'optional'})], submitLabel: '다음'},
  {type: 'actions', items: [A('건너뛰기', 'ghost')]},
], {axes: {shell: 'minimal', width: 'narrow'}, chrome: chrome(nav(['도움말', 'help-circle']), null, null, null)});

add('survey', '설문', 'form', 'paper', '의견 듣기', [
  head('서비스 만족도 설문', '3분이면 끝나요. 응답은 익명으로 처리됩니다.'),
  {type: 'progress', label: '진행률', value: 40, detail: '5문항 중 2문항', tone: 'brand'},
  {type: 'form', title: '문항', fields: [field('rate', '전반적인 만족도', 'radio', {options: ['매우 만족', '만족', '보통', '불만족']}), field('feature', '가장 유용한 기능', 'select', {options: ['검색', '알림', '공유', '자동화']}), field('comment', '개선했으면 하는 점', 'textarea', {requirement: 'optional', placeholder: '자유롭게 적어 주세요'})], submitLabel: '다음 문항'},
], {chrome: chrome(nav(['설문', 'file'], ['문의', 'mail']), null, '© 2026 의견 듣기', null)});

add('settings', '설정', 'settings', 'workspace', '워크스페이스', [
  head('작업 환경을 나답게.', '설정은 언제든 바꿀 수 있습니다.'),
  {type: 'tabs', variant: 'pill', children: [
    {type: 'tab', label: '프로필', children: [{type: 'form', title: '프로필 설정', fields: [field('name', '이름', 'text', {placeholder: '이름을 입력하세요'}), field('email', '이메일', 'email', {placeholder: 'name@example.com'}), field('role', '주로 하는 일', 'select', {options: ['디자인', '개발', '기획']}), field('intro', '소개', 'textarea', {placeholder: '어떤 일을 하고 있나요?', requirement: 'optional'})], submitLabel: '입력 확인'}]},
    {type: 'tab', label: '알림', children: [{type: 'form', title: '알림 설정', fields: [field('mail', '이메일 알림', 'switch', {requirement: 'optional'}), field('push', '푸시 알림', 'switch', {requirement: 'optional'}), field('digest', '요약 주기', 'radio', {options: ['매일', '매주', '받지 않음']})], submitLabel: '저장'}]},
    {type: 'tab', label: '보안', children: [{type: 'list', title: '로그인 기록', items: [{title: '맥북 · 서울', description: '오늘 09:12', status: '완료'}, {title: '아이폰 · 서울', description: '어제 21:40', status: '완료'}], state: 'ready'}, {type: 'notice', tone: 'warning', title: '위험 구역', body: '계정 삭제는 되돌릴 수 없습니다.'}]},
  ]},
  {type: 'notice', tone: 'info', title: '이 화면은 데모입니다.', body: '입력 형식만 브라우저에서 확인하며 서버에 저장하지 않습니다.'},
], {chrome: chrome(NAV_APP, null, '워크스페이스 · 정적 데모', null)});

add('profile', '프로필', 'settings', 'hub', '허브', [
  head('김다선', '디자인 시스템팀 리드. 토큰과 컴포넌트가 팀의 공통 언어가 되도록 돕습니다.', {avatar: '김다선', meta: ['서울', '2022년 3월 입사', '한국어 · English'], actions: [A('메시지 보내기', 'primary'), A('프로필 공유', 'secondary')], stats: [{label: '참여 프로젝트', value: '24'}, {label: '작성한 리뷰', value: '318'}, {label: '정리한 토큰', value: '1,240'}, {label: '팔로워', value: '96'}]}),
  {type: 'aside', side: 'end', label: '프로필 정보', size: 'narrow', children: [
    section('활동', [
      {type: 'chart', title: '최근 12주 기여', caption: '주별 리뷰와 병합 횟수', kind: 'area', unit: '건', categories: ['1주', '2주', '3주', '4주', '5주', '6주', '7주', '8주'], series: [{name: '기여', values: [6, 9, 7, 12, 10, 15, 13, 18]}]},
      {type: 'list', title: '최근 활동', variant: 'divided', items: [{title: '팔레트 후보 12개를 추가했어요', description: '오늘 10:02', icon: 'sparkles'}, {title: '접근성 점검을 마쳤어요', description: '어제 · 대비 33,600쌍 통과', icon: 'check-circle'}, {title: '검색 필터 리뷰에 댓글을 남겼어요', description: '월요일', icon: 'message'}], state: 'ready'},
    ]),
    {type: 'properties', title: '정보', items: [{label: '팀', value: '디자인 시스템'}, {label: '역할', value: '리드 디자이너'}, {label: '근무 시간', value: '10:00~19:00 (UTC+9)'}, {label: '이메일', value: 'dasun@example.com'}, {label: '관심사', value: '접근성, 타이포그래피, 모션'}]}]},
  section('참여 중인 프로젝트', [grid('three', card('토큰 이름 체계', '색과 간격 토큰의 이름 규칙을 하나로 통합합니다.', {variant: 'outline', badge: '진행', meta: '4명 · 마감 11월 3일'}), card('접근성 점검 도구', '모든 팔레트와 모드에서 대비를 자동으로 검사합니다.', {variant: 'outline', badge: '완료', meta: '3명 · 10월 18일 완료'}), card('문서 사이트 개편', '예제 코드를 복사하고 바로 실행해 볼 수 있게 합니다.', {variant: 'outline', badge: '검토', meta: '5명 · 마감 11월 20일'}))]),
], {chrome: chrome(NAV_APP, null, '허브 · 정적 데모', null)});

// ---------- auth ----------
const authLinks = (...items) => ({type: 'links', title: '도움이 필요하신가요?', items: items.map(([label, description]) => ({label, href: '#main', description}))});
add('login', '로그인', 'auth', 'trust', '플로우웍스', [
  head('다시 오셨네요', '계정으로 로그인하고 하던 일을 이어서 하세요.'),
  {type: 'form', title: '이메일로 로그인', fields: [field('email', '이메일', 'email', {placeholder: 'name@example.com'}), field('password', '비밀번호', 'password', {help: '8자 이상 · 비밀번호를 잊으셨다면 아래에서 재설정하세요.'})], submitLabel: '로그인'},
  {type: 'divider', label: '또는'},
  {type: 'actions', items: [A('Google 계정으로 계속하기', 'secondary'), A('카카오 계정으로 계속하기', 'secondary'), A('비밀번호를 잊으셨나요?', 'ghost')]},
], {axes: {shell: 'centered', width: 'narrow'}, chrome: chrome(nav(['도움말', 'help-circle']), null, '© 2026 플로우웍스', null)});

add('signup', '회원가입', 'auth', 'clarity', '모아', [
  head('계정을 만들어요', '이메일만 있으면 시작할 수 있어요.'),
  {type: 'form', title: '회원가입', fields: [field('name', '이름', 'text'), field('email', '이메일', 'email', {placeholder: 'name@example.com'}), field('password', '비밀번호', 'password', {help: '8자 이상, 숫자 포함'}), field('terms', '이용약관과 개인정보 처리방침에 동의합니다', 'checkbox')], submitLabel: '가입하기'},
  {type: 'notice', tone: 'info', title: '데모 안내', body: '입력은 저장되거나 전송되지 않습니다.'},
], {axes: {shell: 'minimal', width: 'narrow'}, chrome: chrome(nav(['로그인', 'user']), null, null, null)});

add('forgot-password', '비밀번호 재설정', 'auth', 'civic', '시빅', [
  head('비밀번호 재설정', '가입한 이메일로 재설정 링크를 보내 드립니다.'),
  {type: 'form', title: '이메일 확인', fields: [field('email', '이메일', 'email', {placeholder: 'name@example.com'})], submitLabel: '링크 보내기'},
  {type: 'actions', items: [A('로그인으로 돌아가기', 'ghost')]},
], {axes: {shell: 'stacked', width: 'narrow'}, chrome: chrome(nav(['로그인', 'user'], ['도움말', 'help-circle']), null, '© 2026 시빅 서비스', null)});

// ---------- error / state pages ----------
const errPage = (id, label, theme, name, kind, title, body, action, extra = {}) => add(id, label, 'error', theme, name, [
  head(title, null, {align: 'center'}),
  {type: 'empty-state', kind, title, body, action: A(action, 'primary')},
  {type: 'actions', align: 'center', items: [A('이전 페이지', 'ghost')]},
], {axes: {shell: 'topbar', ...(extra.axes ?? {})}, chrome: chrome(nav(['홈', 'home'], ['도움말', 'help-circle']), null, `© 2026 ${name}`, null)});
errPage('not-found', '404 페이지', 'playful', '플레이', 'not-found', '페이지를 찾을 수 없어요', '주소가 바뀌었거나 삭제되었을 수 있어요. 홈에서 다시 찾아보세요.', '홈으로');
errPage('server-error', '500 오류', 'console', '콘솔', 'error', '문제가 생겼어요', '잠시 후 다시 시도해 주세요. 계속되면 오류 ID와 함께 문의해 주세요.', '다시 시도');
errPage('forbidden', '403 권한 없음', 'civic', '시빅', 'forbidden', '접근 권한이 없어요', '이 페이지를 볼 수 있는 권한이 없습니다. 관리자에게 요청해 주세요.', '권한 요청');
errPage('maintenance', '점검 안내', 'nocturne', '녹턴', 'maintenance', '점검 중이에요', '더 나은 서비스를 위해 오전 2시부터 4시까지 점검합니다.', '상태 확인');
errPage('offline', '오프라인', 'pocket', '모아', 'offline', '인터넷에 연결되지 않았어요', '연결되면 자동으로 다시 시도합니다.', '다시 시도');

registerMore({add, A, head, prose, card, metric, grid, section, notice, feat, field, media, nav, chrome, FOOT});

export const templateList = T;
export const templates = Object.fromEntries(T.map(t => [t.id, t]));
