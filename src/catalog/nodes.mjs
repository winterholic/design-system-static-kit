import {iconNames} from './icons.mjs';

// ---- schema builders (JSON-Schema-compatible subset understood by src/validate.mjs) ----
export const str = (max = 160, min = 1) => ({type: 'string', minLength: min, maxLength: max});
export const en = (...values) => ({type: 'string', enum: values});
export const arr = (items, min = 1, max = 8) => ({type: 'array', items, minItems: min, maxItems: max});
export const int = (minimum, maximum) => ({type: 'integer', minimum, maximum});
export const num = (minimum, maximum) => ({type: 'number', minimum, maximum});
export const obj = (properties, required = Object.keys(properties)) => ({type: 'object', properties, required, additionalProperties: false});

export const mediaKinds = ['photo', 'diagram', 'device', 'map', 'chart', 'video', 'pattern'];
export const ratios = ['16:9', '4:3', '1:1', '3:4', '21:9'];
/** Subject illustrations for `photo` slots (drawn in src/render/motifs.mjs; a test keeps both lists identical). */
export const motifs = ['lamp', 'desklamp', 'floorlamp', 'orb', 'candle', 'mug', 'bottle', 'jar', 'bag', 'chair', 'plant', 'books', 'headphones', 'sneaker', 'watch', 'vase', 'shirt', 'speaker', 'camera', 'laptop', 'coast', 'solar', 'interior', 'building', 'food', 'noodles', 'pancakes', 'bibimbap', 'stew', 'coffee', 'fitness', 'care', 'museum', 'ticket', 'poster', 'package', 'brandmark', 'swatches', 'states', 'grid', 'type'];
export const iconEnum = en(...iconNames);
const href = str(2048);
const action = obj({label: str(40), href, variant: en('primary', 'secondary', 'ghost')});
const idField = {...str(40), pattern: '^[a-z][a-z0-9-]*$'};
const field = obj({
  id: idField, label: str(80), type: en('text', 'email', 'password', 'number', 'tel', 'url', 'date', 'search', 'textarea', 'select', 'checkbox', 'radio', 'switch'),
  placeholder: str(120), options: arr(str(60), 2, 12), help: str(160), requirement: en('required', 'optional'),
}, ['id', 'label', 'type']);
const status = en('진행', '완료', '대기', '보류', '오류');
const listItem = obj({title: str(120), description: str(300), status, meta: str(80), icon: iconEnum}, ['title']);
const state = en('ready', 'loading', 'empty', 'error', 'partial', 'forbidden');

// ---- child groups ----
export const ATOMS = [
  'card', 'metric', 'table', 'list', 'form', 'prose', 'notice', 'actions', 'faq', 'quote', 'feature-list', 'logo-cloud', 'cta', 'tags', 'team',
  'code', 'properties', 'chart', 'progress', 'empty-state', 'skeleton', 'media', 'gallery', 'breadcrumb', 'pagination', 'filter-bar', 'stepper',
  'summary', 'buy-box', 'reviews', 'menu', 'links', 'divider', 'steps', 'timeline', 'calendar', 'chat', 'master-detail', 'kanban', 'reel', 'pricing', 'toc',
];
export const LAYOUTS = ['section', 'grid', 'split', 'aside', 'bento', 'tabs'];
const without = (list, ...drop) => list.filter(x => !drop.includes(x));
export const BLOCKS = [...LAYOUTS, ...ATOMS];
export const PAGE_CHILDREN = ['page-header', 'hero', ...BLOCKS];

export const nodeSpecs = {
  page: {label: '페이지', group: 'structure', fields: {}, children: PAGE_CHILDREN, min: 2, max: 24, example: null},
  'page-header': {label: '페이지 제목', group: 'structure', fields: {eyebrow: str(60), title: str(160), description: str(500), align: en('start', 'center'), actions: arr(action, 1, 2), meta: arr(str(40), 1, 4), avatar: str(40), stats: arr(obj({label: str(30), value: str(24)}), 2, 4)}, optional: ['eyebrow', 'description', 'align', 'actions', 'meta', 'avatar', 'stats'],
    example: {type: 'page-header', title: '페이지 제목', description: '한 문장으로 이 화면의 목적을 설명합니다.'}},
  hero: {label: '히어로', group: 'structure', fields: {variant: en('statement', 'split', 'centered', 'cover', 'product'), eyebrow: str(60), title: str(160), body: str(700), action, secondaryAction: action, visual: en('ornament', 'device', 'chart', 'photo', 'video'), motif: en(...motifs), facts: arr(obj({value: str(24), label: str(40)}), 2, 4)}, optional: ['eyebrow', 'action', 'secondaryAction', 'visual', 'motif', 'facts'],
    example: {type: 'hero', variant: 'statement', title: '핵심 약속 한 줄', body: '이 서비스가 누구에게 어떤 변화를 주는지 두 문장으로.'}},
  section: {label: '섹션', group: 'layout', fields: {eyebrow: str(60), title: str(100), description: str(240), surface: en('plain', 'tint', 'inverse'), anchor: {...str(30), pattern: '^[a-z][a-z0-9-]*$'}}, optional: ['eyebrow', 'description', 'surface', 'anchor'], children: without(BLOCKS, 'hero'), min: 1, max: 12,
    example: {type: 'section', title: '섹션 제목', children: [{type: 'prose', title: '본문', body: '섹션 안의 본문입니다.'}]}},
  grid: {label: '그리드', group: 'layout', fields: {columns: en('two', 'three', 'four')}, children: ['card', 'metric', 'list', 'notice', 'quote', 'chart', 'progress', 'media', 'properties'], min: 2, max: 12,
    example: {type: 'grid', columns: 'two', children: [{type: 'metric', label: '지표 A', value: '12'}, {type: 'metric', label: '지표 B', value: '34'}]}},
  split: {label: '2분할', group: 'layout', fields: {reverse: en('normal', 'reverse'), align: en('start', 'center'), ratio: en('even', 'wide-start', 'wide-end')}, optional: ['reverse', 'align', 'ratio'],
    children: without(BLOCKS, 'section', 'split', 'aside', 'bento', 'kanban', 'master-detail', 'calendar', 'toc'), min: 2, max: 2,
    example: {type: 'split', children: [{type: 'prose', title: '설명', body: '왼쪽 설명입니다.'}, {type: 'media', kind: 'photo', ratio: '4:3', alt: '예시 이미지'}]}},
  aside: {label: '본문+보조 영역', group: 'layout', fields: {side: en('start', 'end'), sticky: en('yes', 'no'), size: en('narrow', 'wide'), label: str(60)}, optional: ['sticky', 'size'],
    children: without(BLOCKS, 'split', 'aside', 'bento', 'kanban', 'calendar'), min: 2, max: 2,
    example: {type: 'aside', side: 'end', label: '요약', children: [{type: 'prose', title: '본문', body: '본문입니다.'}, {type: 'properties', title: '속성', items: [{label: '상태', value: '진행'}, {label: '담당', value: '김다선'}]}]}},
  bento: {label: '벤토 격자', group: 'layout', fields: {}, children: ['card', 'metric', 'media', 'quote', 'chart', 'progress'], min: 3, max: 6,
    example: {type: 'bento', children: [{type: 'card', title: '큰 칸', body: '첫 칸은 두 배 크기입니다.'}, {type: 'metric', label: '지표', value: '98%'}, {type: 'media', kind: 'pattern', ratio: '1:1', alt: '장식 패턴'}]}},
  tabs: {label: '탭', group: 'layout', fields: {variant: en('underline', 'pill', 'boxed')}, optional: ['variant'], children: ['tab'], min: 2, max: 6,
    example: {type: 'tabs', children: [{type: 'tab', label: '개요', children: [{type: 'prose', title: '개요', body: '개요 내용'}]}, {type: 'tab', label: '상세', children: [{type: 'prose', title: '상세', body: '상세 내용'}]}]}},
  tab: {label: '탭 패널', group: 'layout', fields: {label: str(40)}, children: without(BLOCKS, 'hero', 'tabs'), min: 1, max: 6, example: null},
  kanban: {label: '칸반', group: 'layout', fields: {}, children: ['lane'], min: 2, max: 5,
    example: {type: 'kanban', children: [{type: 'lane', title: '할 일', children: [{type: 'task', title: '문서 정리'}]}, {type: 'lane', title: '진행 중', children: [{type: 'task', title: '시안 검토', assignee: '김다선'}]}]}},
  lane: {label: '칸반 열', group: 'layout', fields: {title: str(60)}, children: ['task'], min: 0, max: 8, example: null},
  task: {label: '작업 카드', group: 'data', fields: {title: str(120), label: str(30), assignee: str(40), priority: en('높음', '보통', '낮음')}, optional: ['label', 'assignee', 'priority'], example: null},
  timeline: {label: '타임라인', group: 'data', fields: {title: str(100), variant: en('line', 'release', 'rail'), items: arr(obj({time: str(40), date: str(40), title: str(120), description: str(300), status: en('완료', '진행', '예정'), changes: arr(obj({kind: en('신규', '개선', '수정', '제거'), text: str(160)}), 1, 6)}, ['time', 'title']), 2, 12)}, optional: ['variant'],
    example: {type: 'timeline', title: '진행 기록', items: [{time: '10월 1일', title: '시작', status: '완료'}, {time: '10월 18일', title: '검토', status: '진행'}]}},
  steps: {label: '단계 안내', group: 'content', fields: {title: str(100), layout: en('vertical', 'horizontal'), items: arr(obj({title: str(80), description: str(240)}, ['title']), 2, 6)}, optional: ['layout'],
    example: {type: 'steps', title: '시작하는 방법', items: [{title: '가입', description: '이메일로 가입합니다.'}, {title: '설정', description: '프로필을 채웁니다.'}]}},
  reel: {label: '가로 스크롤 줄', group: 'layout', fields: {title: str(100)}, optional: ['title'], children: ['card'], min: 3, max: 10,
    example: {type: 'reel', title: '추천', children: [{type: 'card', title: '하나', body: '첫 번째 카드'}, {type: 'card', title: '둘', body: '두 번째 카드'}, {type: 'card', title: '셋', body: '세 번째 카드'}]}},
  'master-detail': {label: '목록+상세', group: 'data', fields: {title: str(100), items: arr(obj({title: str(100), meta: str(60), preview: str(160), state: en('unread', 'read')}, ['title', 'preview']), 2, 8), selected: int(0, 7), detail: obj({title: str(120), meta: str(80), body: str(1200)}, ['title', 'body'])},
    example: {type: 'master-detail', title: '받은 메시지', items: [{title: '디자인 리뷰', preview: '내일 오후 2시에 만나요.', state: 'unread'}, {title: '배포 안내', preview: '배포가 완료되었습니다.'}], selected: 0, detail: {title: '디자인 리뷰', meta: '김다선 · 오늘', body: '내일 오후 2시에 디자인 리뷰를 진행합니다.'}}},
  chat: {label: '대화', group: 'data', fields: {title: str(100), messages: arr(obj({from: en('me', 'them'), name: str(40), text: str(400), time: str(30)}, ['from', 'name', 'text']), 2, 12)},
    example: {type: 'chat', title: '팀 대화', messages: [{from: 'them', name: '다선', text: '시안 확인했어요.'}, {from: 'me', name: '나', text: '고마워요, 반영할게요.'}]}},
  calendar: {label: '월간 달력', group: 'data', fields: {title: str(100), year: int(2000, 2100), month: int(1, 12), today: int(1, 31), events: arr(obj({day: int(1, 31), title: str(40), time: str(16), tone: en('brand', 'accent', 'success', 'warning')}, ['day', 'title']), 0, 8)}, optional: ['today'],
    example: {type: 'calendar', title: '이번 달 일정', year: 2026, month: 10, events: [{day: 18, title: '디자인 리뷰'}]}},
  card: {label: '카드', group: 'content', fields: {title: str(100), body: str(500), meta: str(80), action, variant: en('basic', 'outline', 'filled', 'media', 'horizontal', 'link'), icon: iconEnum, badge: str(24), visual: en(...mediaKinds), ratio: en(...ratios), motif: en(...motifs), price: str(24), listPrice: str(24), rating: str(4), reviews: str(16), author: str(40)}, optional: ['meta', 'action', 'variant', 'icon', 'badge', 'visual', 'ratio', 'motif', 'price', 'listPrice', 'rating', 'reviews', 'author'],
    example: {type: 'card', title: '카드 제목', body: '카드가 전달할 핵심 한두 문장입니다.'}},
  metric: {label: '지표', group: 'data', fields: {label: str(80), value: str(40), detail: str(160), trend: en('up', 'down', 'flat'), delta: str(30)}, optional: ['detail', 'trend', 'delta'],
    example: {type: 'metric', label: '완료한 작업', value: '84', detail: '지난주보다 12개 더', trend: 'up', delta: '+12'}},
  table: {label: '표', group: 'data', fields: {title: str(100), caption: str(160), columns: arr(str(60), 2, 8), rows: arr(arr(str(200), 2, 8), 0, 40), state, variant: en('plain', 'striped', 'bordered')}, optional: ['state', 'variant'],
    example: {type: 'table', title: '최근 작업', caption: '프로젝트별 최근 변경', columns: ['작업', '상태'], rows: [['조립 규약', '완료'], ['팔레트 검토', '진행']], state: 'ready'}},
  list: {label: '목록', group: 'data', fields: {title: str(100), items: arr(listItem, 0, 12), state, variant: en('divided', 'plain', 'check', 'card')}, optional: ['state', 'variant'],
    example: {type: 'list', title: '다음 확인', items: [{title: '위계 확인', description: '중요한 정보가 먼저 읽히는가?', status: '진행'}], state: 'ready'}},
  form: {label: '폼', group: 'form', fields: {title: str(100), intro: str(200), fields: arr(field, 1, 12), submitLabel: str(40), variant: en('stacked', 'inline', 'two-column')}, optional: ['intro', 'variant'],
    example: {type: 'form', title: '문의하기', fields: [{id: 'email', label: '이메일', type: 'email', placeholder: 'name@example.com'}], submitLabel: '입력 확인'}},
  prose: {label: '본문', group: 'content', fields: {title: str(160), body: str(6000), variant: en('body', 'lead', 'legal')}, optional: ['variant'],
    example: {type: 'prose', title: '본문 제목', body: '첫 문단입니다.\n\n두 번째 문단입니다.'}},
  notice: {label: '알림', group: 'feedback', fields: {title: str(120), body: str(500), tone: en('info', 'success', 'warning', 'danger'), variant: en('inline', 'banner', 'toast')}, optional: ['variant'],
    example: {type: 'notice', tone: 'info', title: '안내', body: '알려드릴 내용입니다.'}},
  actions: {label: '액션 그룹', group: 'content', fields: {items: arr(action, 1, 3), align: en('start', 'center', 'end')}, optional: ['align'],
    example: {type: 'actions', items: [{label: '시작하기', href: '#main', variant: 'primary'}]}},
  faq: {label: '자주 묻는 질문', group: 'content', fields: {title: str(100), items: arr(obj({question: str(160), answer: str(600)}), 2, 10)},
    example: {type: 'faq', title: '자주 묻는 질문', items: [{question: '무료인가요?', answer: '기본 기능은 무료입니다.'}, {question: '데이터는 어디에 저장되나요?', answer: '이 데모는 저장하지 않습니다.'}]}},
  quote: {label: '인용·후기', group: 'content', fields: {quote: str(400), author: str(60), role: str(80)}, optional: ['role'],
    example: {type: 'quote', quote: '규칙이 있어서 오히려 자유로웠어요.', author: '김다선', role: '디자이너'}},
  'feature-list': {label: '기능 목록', group: 'content', fields: {title: str(100), layout: en('grid', 'list'), items: arr(obj({icon: iconEnum, title: str(80), description: str(240)}, ['icon', 'title']), 2, 8)}, optional: ['title', 'layout'],
    example: {type: 'feature-list', title: '핵심 기능', items: [{icon: 'zap', title: '빠른 시작', description: '몇 분이면 충분합니다.'}, {icon: 'shield', title: '안전한 기본값', description: '규칙이 지켜집니다.'}]}},
  'logo-cloud': {label: '고객사 이름 줄', group: 'content', fields: {title: str(100), names: arr(str(30), 3, 8)},
    example: {type: 'logo-cloud', title: '함께하는 팀', names: ['가나다랩', '라마바웍스', '사아자스튜디오']}},
  cta: {label: '행동 유도 띠', group: 'content', fields: {title: str(120), body: str(300), action, secondaryAction: action, tone: en('plain', 'brand', 'inverse')}, optional: ['body', 'secondaryAction', 'tone'],
    example: {type: 'cta', title: '지금 시작해 보세요', action: {label: '시작하기', href: '#main', variant: 'primary'}}},
  tags: {label: '태그 모음', group: 'content', fields: {title: str(60), items: arr(str(24), 2, 16), variant: en('chips', 'badges', 'outline')}, optional: ['title', 'variant'],
    example: {type: 'tags', items: ['디자인', '개발', '기획']}},
  team: {label: '팀 소개', group: 'content', fields: {title: str(100), members: arr(obj({name: str(40), role: str(60), bio: str(200)}, ['name', 'role']), 2, 8)},
    example: {type: 'team', title: '함께 만드는 사람들', members: [{name: '김다선', role: '디자인'}, {name: '이지훈', role: '개발'}]}},
  code: {label: '코드 블록', group: 'content', fields: {label: str(60), language: en('bash', 'js', 'json', 'html', 'css', 'python', 'text'), code: str(3000)},
    example: {type: 'code', label: '설치', language: 'bash', code: 'npm install\nnpm run verify'}},
  properties: {label: '속성 목록', group: 'data', fields: {title: str(100), layout: en('stacked', 'inline'), items: arr(obj({label: str(60), value: str(160)}), 2, 12)}, optional: ['layout'],
    example: {type: 'properties', title: '속성', items: [{label: '상태', value: '진행'}, {label: '담당', value: '김다선'}]}},
  chart: {label: '차트', group: 'data', fields: {title: str(100), caption: str(200), kind: en('bar', 'bars-h', 'line', 'area', 'donut'), unit: str(12), categories: arr(str(16), 2, 8), series: arr(obj({name: str(30), values: arr(num(-1000000, 1000000), 2, 8)}), 1, 3)}, optional: ['unit'],
    example: {type: 'chart', title: '주간 완료', caption: '요일별 완료한 작업 수', kind: 'bar', unit: '개', categories: ['월', '화', '수'], series: [{name: '완료', values: [4, 7, 5]}]}},
  progress: {label: '진행률', group: 'feedback', fields: {label: str(80), value: int(0, 100), detail: str(120), tone: en('brand', 'success', 'warning', 'danger')}, optional: ['detail', 'tone'],
    example: {type: 'progress', label: '업로드', value: 64, detail: '64% 완료'}},
  'empty-state': {label: '상태 화면', group: 'feedback', fields: {kind: en('first-use', 'search', 'filter', 'forbidden', 'offline', 'not-found', 'error', 'success', 'maintenance'), title: str(100), body: str(300), action, icon: iconEnum}, optional: ['action', 'icon'],
    example: {type: 'empty-state', kind: 'first-use', title: '아직 프로젝트가 없어요', body: '첫 프로젝트를 만들어 시작해 보세요.', action: {label: '프로젝트 만들기', href: '#main', variant: 'primary'}}},
  skeleton: {label: '스켈레톤', group: 'feedback', fields: {label: str(60), variant: en('card', 'list', 'table', 'text')},
    example: {type: 'skeleton', label: '목록을 불러오는 중', variant: 'list'}},
  media: {label: '이미지 자리', group: 'media', fields: {kind: en(...mediaKinds), ratio: en(...ratios), alt: str(160), caption: str(160), overlay: str(60), motif: en(...motifs)}, optional: ['caption', 'overlay', 'motif'],
    example: {type: 'media', kind: 'photo', ratio: '16:9', alt: '작업 공간의 전경', caption: '이미지는 자리 표시입니다.'}},
  gallery: {label: '갤러리', group: 'media', fields: {title: str(100), layout: en('grid', 'masonry', 'showcase'), items: arr(obj({kind: en(...mediaKinds), alt: str(160), caption: str(100), motif: en(...motifs)}, ['kind', 'alt']), 3, 12)}, optional: ['title', 'layout'],
    example: {type: 'gallery', title: '작업', items: [{kind: 'photo', alt: '작업 하나'}, {kind: 'diagram', alt: '작업 둘'}, {kind: 'pattern', alt: '작업 셋'}]}},
  breadcrumb: {label: '브레드크럼', group: 'nav', fields: {items: arr(obj({label: str(40), href}, ['label']), 2, 5)},
    example: {type: 'breadcrumb', items: [{label: '홈', href: '#main'}, {label: '현재 화면'}]}},
  pagination: {label: '페이지네이션', group: 'nav', fields: {pages: int(2, 50), current: int(1, 50)},
    example: {type: 'pagination', pages: 8, current: 3}},
  'filter-bar': {label: '검색·필터 바', group: 'nav', fields: {placeholder: str(60), filters: arr(str(20), 2, 8), selected: int(0, 7)},
    example: {type: 'filter-bar', placeholder: '검색', filters: ['전체', '진행', '완료'], selected: 0}},
  stepper: {label: '단계 표시', group: 'nav', fields: {steps: arr(str(30), 2, 6), current: int(1, 6)},
    example: {type: 'stepper', steps: ['정보', '결제', '완료'], current: 1}},
  summary: {label: '주문·요약 박스', group: 'content', fields: {title: str(60), items: arr(obj({label: str(60), value: str(40)}), 1, 8), total: obj({label: str(40), value: str(40)}), action, thumb: obj({motif: en(...motifs), name: str(60), detail: str(80)}, ['motif', 'name'])}, optional: ['action', 'thumb'],
    example: {type: 'summary', title: '주문 요약', items: [{label: '상품', value: '39,000원'}], total: {label: '합계', value: '39,000원'}}},
  'buy-box': {label: '구매 박스', group: 'content', fields: {title: str(100), price: str(40), note: str(160), badge: str(24), options: arr(obj({label: str(40), choices: arr(str(30), 2, 6)}), 1, 3), action, secondaryAction: action}, optional: ['note', 'badge', 'options', 'secondaryAction'],
    example: {type: 'buy-box', title: '상품 이름', price: '39,000원', options: [{label: '용량', choices: ['30ml', '50ml']}], action: {label: '장바구니', href: '#main', variant: 'primary'}}},
  reviews: {label: '리뷰', group: 'content', fields: {title: str(80), score: str(8), count: str(30), items: arr(obj({author: str(40), rating: int(1, 5), text: str(300), date: str(30)}, ['author', 'rating', 'text']), 1, 6)},
    example: {type: 'reviews', title: '리뷰', score: '4.8', count: '리뷰 128개', items: [{author: '김**', rating: 5, text: '촉촉하고 가볍습니다.'}]}},
  menu: {label: '메뉴판', group: 'content', fields: {title: str(80), layout: en('leader', 'grid', 'plain', 'photo'), items: arr(obj({name: str(60), description: str(160), price: str(24), tag: str(20), motif: en(...motifs)}, ['name', 'price']), 2, 12)},
    example: {type: 'menu', title: '커피', layout: 'leader', items: [{name: '아메리카노', price: '4,500'}, {name: '카페라테', price: '5,000'}]}},
  links: {label: '링크 목록', group: 'nav', fields: {title: str(80), items: arr(obj({label: str(60), href, description: str(120)}, ['label', 'href']), 2, 8)},
    example: {type: 'links', title: '관련 문서', items: [{label: '시작하기', href: '#main'}, {label: 'API', href: '#main'}]}},
  divider: {label: '구분선', group: 'content', fields: {label: str(40)}, optional: ['label'], example: {type: 'divider'}},
  pricing: {label: '요금제', group: 'content', fields: {title: str(100)}, optional: ['title'], children: ['plan'], min: 2, max: 4,
    example: {type: 'pricing', title: '요금제', children: [{type: 'plan', name: '무료', price: '0원', features: ['기본 기능', '1개 프로젝트'], action: {label: '시작', href: '#main', variant: 'secondary'}}, {type: 'plan', name: '팀', price: '9,900원', period: '월', features: ['모든 기능', '무제한 프로젝트'], action: {label: '선택', href: '#main', variant: 'primary'}, featured: 'yes'}]}},
  plan: {label: '요금제 항목', group: 'content', fields: {name: str(40), price: str(30), period: str(20), description: str(160), features: arr(str(80), 2, 8), action, featured: en('yes')}, optional: ['period', 'description', 'featured'], example: null},
  toc: {label: '목차(자동)', group: 'nav', fields: {title: str(40)}, optional: ['title'], example: {type: 'toc'}},
};

export const nodeTypes = Object.keys(nodeSpecs);
export const requiredOf = spec => ['type', ...Object.keys(spec.fields).filter(k => !(spec.optional ?? []).includes(k)), ...(spec.children ? ['children'] : [])];

// ---- chrome (navigation/footer content shared by every shell) ----
const megaLink = obj({label: str(30), href, description: str(80)}, ['label', 'href']);
const navItem = obj({label: str(24), href, icon: iconEnum, mega: arr(megaLink, 2, 8), group: str(24), current: en('page')}, ['label', 'href']);
export const chromeSpec = obj({
  nav: arr(navItem, 1, 8), action: obj({label: str(24), href}), brandMark: str(2),
  footerNote: str(120), footerLinks: arr(obj({label: str(30), href}), 1, 8),
}, []);
