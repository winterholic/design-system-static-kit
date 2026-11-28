/**
 * 타이포 재료(타이포 작업 소유): 서체 짝(`face-pairing:*`)과 역할 크기 체계(`role-scale:*`).
 *
 * - 서체 짝은 스택(제목·본문·UI·숫자·코드)과 선택적 웹폰트를 가진다. 크기·행간·자간은 갖지 않는다.
 * - 역할 크기 체계는 역할 9개(display·heading·sub·body·small·label·caption·numeric·code)마다 모바일·데스크톱 px, 굵기, 행간, 자간을 가진다. 서체를 갖지 않는다.
 * - 둘 다 레지스트리 종류가 아니라 이 모듈의 표다. 타이포 시스템 기록(`type-system:*`)이 id 문자열로 참조한다(계약의 type-system 필드는 facePairing·roleScale 문자열이다).
 * - 구형 재료는 값을 베끼지 않고 엔진 표(src/typography.mjs TYPE_R2, src/materials/typography.mjs MATERIAL_TYPE_PRESETS)에서 계산한다. 그래서 2.1~2.6 출력과 값이 어긋날 수 없다.
 */
import {STACKS, TYPE_R2, TYPE_IDS, ROLES, roleSizes} from '../../typography.mjs';
import {MATERIAL_TYPE_PRESETS, clampBounds} from '../../materials/typography.mjs';

export const SERIF_STACKS = Object.freeze(new Set(['iowan', 'georgia', 'charter', 'baskerville', 'didone', 'slab', 'news', 'palatino']));
export const TYPE_27_ROLES = Object.freeze([
  'display-xl', 'display-lg', 'display-md',
  'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6',
  'body-lg', 'body-md', 'body-sm',
  'label-lg', 'label-md', 'label-sm',
  'caption', 'overline', 'button-label', 'input-value',
  'table-header', 'table-cell', 'numeric', 'kpi', 'code',
  'quote', 'navigation', 'badge',
]);
export const SCALE_ROLES = Object.freeze(['display', 'heading', 'sub', 'body', 'small', 'label', 'caption', 'numeric', 'code']);

// ---------- 웹폰트(선택) ----------
/**
 * 웹폰트는 어느 시스템에도 필수가 아니다. 생성되는 페이지는 `default-src 'none'`이라 기본 출력은 시스템 서체만 쓴다(docs/typography.md "서체 조달").
 * 배포가 `font-src 'self'`를 열고 서체 파일을 직접 호스팅할 때만 켠다. 저장소에는 서체 파일을 넣지 않는다.
 * license는 각 프로젝트가 공개한 값이다. 재배포·번들 전에 LICENSE 원문 확인이 필요하다(확인 필요).
 */
export const WEBFONTS = Object.freeze({
  pretendard: Object.freeze({family: 'Pretendard Variable', covers: ['latin', 'hangul'], class: 'sans', license: 'OFL-1.1', source: 'https://github.com/orioncactus/pretendard', file: 'PretendardVariable.woff2', weight: '45 920', unicodeRange: null}),
  // 한글 구간만 받는다. 라틴 글자는 서체 짝의 시스템 세리프(Iowan·Charter 등)가 그대로 그린다.
  notoSerifKr: Object.freeze({family: 'Noto Serif KR', covers: ['hangul'], class: 'serif', license: 'OFL-1.1', source: 'https://github.com/notofonts/noto-cjk', file: 'NotoSerifKR-Variable.woff2', weight: '200 900', unicodeRange: 'U+1100-11FF,U+3130-318F,U+AC00-D7A3'}),
  jetbrainsMono: Object.freeze({family: 'JetBrains Mono', covers: ['latin'], class: 'mono', license: 'OFL-1.1', source: 'https://github.com/JetBrains/JetBrainsMono', file: 'JetBrainsMono-Variable.woff2', weight: '100 800', unicodeRange: 'U+0000-00FF,U+2000-206F'}),
});
/** 로딩 방식. 한글 서체는 부분 집합이 수백 KB라 unicode-range로 쪼개 필요한 조각만 받고, 받기 전에는 `swap`으로 대체 서체를 먼저 그린다. */
export const WEBFONT_LOADING = Object.freeze({strategy: 'self-host', format: 'woff2', display: 'swap', subset: 'unicode-range', preload: 'latin 조각만(한글 조각은 지연 로딩)', csp: "font-src 'self'"});

// ---------- 서체 짝 ----------
/** 서체 짝 하나. head·text·ui·numeric은 STACKS 이름, code는 고정폭 스택. ui는 라벨·캡션, numeric은 숫자 역할의 서체다. */
const face = (id, label, concept, o) => {
  const serifText = SERIF_STACKS.has(o.text);
  return Object.freeze({id: `face-pairing:${id}`, label, concept, ui: o.ui ?? (serifText ? 'system' : o.text), numeric: o.numeric ?? (serifText ? 'system' : o.text), code: 'mono', merges: [], webfonts: [], ...o});
};

/** 구형 18개 → 서체 짝 16개. (제목 스택, 본문 스택)이 같은 프리셋은 한 서체 짝으로 합치고, 차이(비율·숫자 정렬·라벨 대소문자)는 역할 체계로 보낸다. */
const legacyGroups = new Map();
for (const id of TYPE_IDS) { const p = TYPE_R2[id], key = `${p.head}/${p.text}`; (legacyGroups.get(key) ?? legacyGroups.set(key, []).get(key)).push(id); }
const SERIF_UI = {system: 'system'};
const legacyFaces = [...legacyGroups.values()].map(ids => {
  const p = TYPE_R2[ids[0]], serifText = SERIF_STACKS.has(p.text);
  return face(ids[0], p.label, p.concept, {head: p.head, text: p.text, ...(serifText ? {ui: 'system', numeric: 'system'} : {}), merges: ids, webfonts: serifText || SERIF_STACKS.has(p.head) ? ['notoSerifKr'] : []});
});
/** 구형에 없는 짝. 제목 서체와 본문 서체를 새로 맞춘 것이다(서체 이름만 바꾼 것이 아니라 아래 역할 체계가 따로 붙는다). */
const newFaces = [
  face('grotesk-system', '그로테스크 제목 + 시스템 본문', '운영 콘솔. 제목은 Helvetica 계열로 단단하고, 본문은 플랫폼 UI 서체라 표에서 가장 익숙하다.', {head: 'grotesk', text: 'system'}),
  face('geometric-system', '기하학 제목 + 시스템 본문', '분석 보드. 제목에만 원형 글자를 쓰고 숫자·본문은 중립 UI 서체로 둔다.', {head: 'geometric', text: 'system', webfonts: ['pretendard']}),
  face('humanist-system', '인문주의 제목 + 시스템 본문', '기술 문서. 제목은 따뜻하고 본문·코드 주변은 중립이다.', {head: 'humanist', text: 'system', webfonts: ['pretendard', 'jetbrainsMono']}),
  face('baskerville-charter', '바스커빌 제목 + 차터 본문', '고전 에디토리얼. 바스커빌 표제의 우아함과 차터 본문의 안정성.', {head: 'baskerville', text: 'charter'}),
  face('baskerville-system', '바스커빌 제목 + 시스템 본문', '모던 에디토리얼. 전통 세리프 표제와 현대적 시스템 본문의 조화.', {head: 'baskerville', text: 'system'}),
  face('georgia-system', '조지아 제목 + 시스템 본문', '리테일 뱅킹. 화면용으로 설계된 조지아의 가독성과 시스템 본문의 실용성.', {head: 'georgia', text: 'system'}),
  face('charter-system', '차터 제목 + 시스템 본문', '중립 프로덕트. 균형 잡힌 차터 표제와 중립 시스템 본문.', {head: 'charter', text: 'system'}),
  face('slab-humanist', '슬랩 제목 + 인문주의 본문', '개발자 제품. 단단한 슬랩 세리프 표제와 따뜻한 휴머니스트 본문.', {head: 'slab', text: 'humanist'}),
  face('condensed-grotesk', '압축 제목 + 그로테스크 본문', '시스템 모니터. 좁은 공간에 많은 글자를 담는 압축 표제와 단단한 본문.', {head: 'condensed', text: 'grotesk'}),
  face('poster-grotesk', '포스터 제목 + 그로테스크 본문', '표현형 마케팅. 강렬한 임팩트 표제와 정돈된 그로테스크 본문.', {head: 'poster', text: 'grotesk'}),
  face('rounded-system', '라운드 제목 + 시스템 본문', '소프트 프로덕트. 부드러운 라운드 표제와 익숙한 시스템 본문.', {head: 'rounded', text: 'system'}),
  face('didone-system', '디도네 제목 + 시스템 본문', '매거진. 고대비 디도네 표제와 가독성 높은 시스템 본문.', {head: 'didone', text: 'system'}),
  face('news-system', '뉴스 제목 + 시스템 본문', '친근한 모바일. 신문 스타일 표제와 직관적인 시스템 본문.', {head: 'news', text: 'system'}),
  face('palatino-system', '팔라티노 제목 + 시스템 본문', '접근성 모바일. 넉넉한 글자폭의 팔라티노 표제와 시스템 본문.', {head: 'palatino', text: 'system'}),
  face('geometric-grotesk', '기하학 제목 + 그로테스크 본문', '기하학 프로덕트. 원형 기하학 표제와 중립적 그로테스크 본문.', {head: 'geometric', text: 'grotesk'}),
  face('grotesk-humanist', '그로테스크 제목 + 인문주의 본문', '기술 문서. 정돈된 그로테스크 표제와 장문 읽기에 편한 인문주의 본문.', {head: 'grotesk', text: 'humanist'}),
  face('humanist-geometric', '인문주의 제목 + 기하학 본문', '인문주의 프로덕트. 따뜻한 휴머니스트 표제와 모던한 기하학 본문.', {head: 'humanist', text: 'geometric'}),
  face('georgia-charter', '조지아 제목 + 차터 본문', '럭셔리 커머스. 프리미엄 감성의 정통 세리프 조합.', {head: 'georgia', text: 'charter'}),
  face('iowan-humanist', '아이오완 제목 + 인문주의 본문', '학습 플랫폼. 클래식 서명 표제와 학습 집중도를 높이는 인문주의 본문.', {head: 'iowan', text: 'humanist'}),
  face('palatino-palatino', '팔라티노 제목 + 팔라티노 본문', '학술 논문. 일관된 정통 북 세리프 전신 조합.', {head: 'palatino', text: 'palatino'}),
  face('slab-grotesk', '슬랩 제목 + 그로테스크 본문', '인터랙티브 교육. 명확한 블록형 슬랩 표제와 그로테스크 본문.', {head: 'slab', text: 'grotesk'}),
  face('condensed-humanist', '압축 제목 + 인문주의 본문', '레트로. 클래식 헤드라인 압축 표제와 인문주의 본문.', {head: 'condensed', text: 'humanist'}),
  face('didone-charter', '디도네 제목 + 차터 본문', '믹스드 세리프. 우아한 모던 세리프 표제와 튼튼한 올드스타일 본문.', {head: 'didone', text: 'charter'}),
  face('poster-humanist', '포스터 제목 + 인문주의 본문', '산업 유틸리티. 시인성 높은 포스터 표제와 인문주의 본문.', {head: 'poster', text: 'humanist'}),
  face('charter-humanist', '차터 제목 + 인문주의 본문', '금융 터미널. 견고한 차터 표제와 가독성 높은 휴머니스트 본문.', {head: 'charter', text: 'humanist'}),
  face('baskerville-humanist', '바스커빌 제목 + 인문주의 본문', '개발 모니터. 섬세한 바스커빌 표제와 휴머니스트 본문.', {head: 'baskerville', text: 'humanist'}),
  face('georgia-humanist', '조지아 제목 + 인문주의 본문', '브루탈리스트. 굵은 조지아 표제와 휴머니스트 본문.', {head: 'georgia', text: 'humanist'}),
];
const withWebfont = (f, extra) => (extra.length ? Object.freeze({...f, webfonts: [...new Set([...f.webfonts, ...extra])]}) : f);
const EXTRA_WEBFONTS = {geometric: ['pretendard'], grotesk: ['pretendard'], humanist: ['pretendard']};
export const FACE_PAIRINGS = Object.freeze(Object.fromEntries([...legacyFaces.map(f => withWebfont(f, EXTRA_WEBFONTS[f.id.slice('face-pairing:'.length)] ?? [])), ...newFaces].map(f => [f.id, f])));

/** 구형 프리셋 id → 서체 짝 id. 합쳐진 것은 대표 id(맨 앞 프리셋)의 서체 짝을 가리킨다. */
export const LEGACY_FACE_OF = Object.freeze(Object.fromEntries([...legacyGroups.values()].flatMap(ids => ids.map(id => [id, `face-pairing:${ids[0]}`]))));

// ---------- 역할 크기 체계 ----------
const ROLE_TUPLE = ['mobile', 'desktop', 'weight', 'lineHeight', 'trackingEm'];
/** [모바일 px, 데스크톱 px, 굵기, 행간, 자간(em)]. label은 대소문자 변환 여부를 다섯째 뒤에 더한다. */
const R = ([m, d, weight, lineHeight, trackingEm, labelCase]) => Object.freeze({sizePx: Object.freeze({mobile: m, desktop: d}), weight, lineHeight, trackingEm, ...(labelCase ? {case: labelCase} : {})});
const scale = (id, label, o) => Object.freeze({id: `role-scale:${id}`, label, density: o.density, concept: o.concept, source: 'designed', roles: Object.freeze(Object.fromEntries(SCALE_ROLES.map(r => [r, R(o[r])])))});

/**
 * 맥락별로 설계한 역할 체계 13개. 서체와 독립이다.
 * 같은 열 순서: display, heading, sub, body, small, label, caption, numeric, code.
 * 구별하는 것은 (1) 본문 대비 제목 비율 (2) 행간·자간 리듬 (3) 화면당 줄 수(정보 밀도) (4) 모바일↔데스크톱 확대 폭이다.
 */
const DESIGNED = [
  scale('work-console', '운영 콘솔', {density: 'compact', concept: '표·폼 한 화면에 가장 많은 행. 본문 14px, 행간은 한글 하한(1.55)에 붙이고 제목은 작게 억제한다.',
    display: [26, 32, 700, 1.2, -.02], heading: [18, 20, 650, 1.3, -.01], sub: [15, 16, 650, 1.35, 0], body: [14, 14, 400, 1.55, 0], small: [13, 13, 400, 1.4, 0],
    label: [12, 12, 600, 1.3, .02], caption: [11, 11, 450, 1.35, .01], numeric: [16, 18, 600, 1.2, -.01], code: [12, 13, 450, 1.55, 0]}),
  scale('work-insight', '분석 보드', {density: 'comfortable', concept: 'KPI 숫자가 위계의 꼭대기. 숫자 44px와 본문 15px가 3배 가까이 벌어지고, 제목은 24px에서 멈춘다.',
    display: [28, 36, 700, 1.2, -.02], heading: [20, 24, 700, 1.3, -.015], sub: [16, 18, 650, 1.35, -.005], body: [15, 15, 400, 1.6, 0], small: [13, 14, 400, 1.45, 0],
    label: [12, 13, 600, 1.3, .03], caption: [11, 12, 450, 1.4, .01], numeric: [28, 44, 700, 1.15, -.02], code: [13, 14, 450, 1.55, 0]}),
  scale('doc-essay', '에세이', {density: 'spacious', concept: '긴 글. 본문 17→19px, 행간 1.8. 제목은 세리프 600으로 크게 시작하되 자간을 거의 조이지 않는다.',
    display: [34, 56, 600, 1.25, -.01], heading: [24, 32, 600, 1.35, -.005], sub: [19, 22, 600, 1.4, 0], body: [17, 19, 400, 1.8, .005], small: [14, 15, 400, 1.6, 0],
    label: [12, 13, 600, 1.3, .06], caption: [12, 13, 400, 1.5, .01], numeric: [17, 19, 500, 1.3, 0], code: [14, 15, 450, 1.6, 0]}),
  scale('doc-handbook', '핸드북', {density: 'comfortable', concept: '기술 문서. 본문 16→17px 행간 1.7, 코드가 본문보다 한 단계 가깝게 크다(14→15px). 제목 위계는 4단계로 또렷하다.',
    display: [30, 44, 700, 1.2, -.02], heading: [22, 28, 650, 1.3, -.015], sub: [17, 19, 650, 1.35, -.005], body: [16, 17, 400, 1.7, 0], small: [14, 14, 400, 1.55, 0],
    label: [12, 13, 600, 1.3, .03], caption: [12, 12, 450, 1.4, .01], numeric: [16, 17, 500, 1.3, 0], code: [14, 15, 450, 1.6, 0]}),
  scale('doc-newsroom', '신문 지면', {density: 'comfortable', concept: '굵은 세리프 표제와 촘촘한 본문(16→17px, 행간 1.6). 라벨은 넓은 자간 대문자.',
    display: [30, 48, 700, 1.2, -.02], heading: [22, 30, 700, 1.3, -.01], sub: [18, 20, 700, 1.35, 0], body: [16, 17, 400, 1.6, 0], small: [13, 14, 400, 1.45, 0],
    label: [12, 12, 700, 1.3, .06, 'upper'], caption: [12, 12, 400, 1.4, .01], numeric: [16, 18, 700, 1.2, -.01], code: [13, 14, 450, 1.55, 0]}),
  scale('mkt-brand', '브랜드 히어로', {density: 'spacious', concept: '히어로 한 줄이 화면을 지배한다. 표제 36→72px, 본문 17→19px로 본문 대비 4배. 위계는 3단계로 단순하다.',
    display: [36, 72, 700, 1.2, -.02], heading: [26, 40, 700, 1.3, -.015], sub: [18, 22, 650, 1.35, -.005], body: [17, 19, 400, 1.7, 0], small: [14, 15, 400, 1.55, 0],
    label: [12, 13, 700, 1.3, .06, 'upper'], caption: [12, 13, 400, 1.45, .01], numeric: [28, 44, 700, 1.15, -.02], code: [13, 14, 450, 1.55, 0]}),
  scale('mkt-launch', '제품 출시', {density: 'comfortable', concept: '제품 소개와 요금표. 표제 34→56px, 가격 숫자 32→48px가 본문 16px보다 크게 나온다. 소제목 위계가 촘촘하다.',
    display: [34, 56, 700, 1.2, -.02], heading: [24, 36, 700, 1.3, -.015], sub: [17, 20, 650, 1.35, -.005], body: [16, 17, 400, 1.65, 0], small: [14, 14, 400, 1.5, 0],
    label: [12, 13, 650, 1.3, .04], caption: [12, 12, 450, 1.4, .01], numeric: [32, 48, 700, 1.1, -.02], code: [13, 14, 450, 1.55, 0]}),
  scale('mkt-atelier', '아틀리에', {density: 'spacious', concept: '가는 고대비 표제와 넉넉한 행간(본문 1.8). 라벨만 넓게 벌려 대비를 낸다. 굵기 500으로 가볍게 둔다.',
    display: [34, 60, 500, 1.25, 0], heading: [24, 36, 500, 1.35, 0], sub: [18, 22, 500, 1.4, .005], body: [16, 17, 400, 1.8, .01], small: [14, 14, 400, 1.6, 0],
    label: [12, 12, 500, 1.3, .06, 'upper'], caption: [12, 12, 400, 1.5, .02], numeric: [24, 36, 500, 1.2, 0], code: [13, 14, 450, 1.55, 0]}),
  scale('shop-catalog', '쇼핑 카탈로그', {density: 'compact', concept: '상품 카드 안의 정보 밀도. 상품명(sub)과 가격(numeric)이 위계를 맡고 본문 14→15px, 행간 1.55.',
    display: [28, 44, 700, 1.2, -.01], heading: [20, 28, 700, 1.3, -.01], sub: [15, 17, 650, 1.35, 0], body: [14, 15, 400, 1.55, 0], small: [13, 13, 400, 1.45, 0],
    label: [12, 12, 600, 1.3, .02], caption: [11, 12, 450, 1.4, .01], numeric: [20, 26, 700, 1.15, -.01], code: [12, 13, 450, 1.55, 0]}),
  scale('shop-boutique', '부티크 스토리', {density: 'comfortable', concept: '브랜드 이야기를 파는 커머스. 세리프 표제 32→52px, 본문 16→17px 행간 1.75, 가격은 크기를 키우지 않고 굵기 600으로 둔다.',
    display: [32, 52, 600, 1.25, -.01], heading: [24, 34, 600, 1.35, -.005], sub: [18, 21, 600, 1.4, 0], body: [16, 17, 400, 1.75, .005], small: [14, 14, 400, 1.5, 0],
    label: [12, 12, 600, 1.3, .06], caption: [12, 12, 450, 1.45, .02], numeric: [22, 30, 600, 1.2, 0], code: [13, 14, 450, 1.55, 0]}),
  scale('mobile-app', '모바일 앱', {density: 'comfortable', concept: '좁은 화면 기준. 본문 17px 고정, 보조 글자도 15px 아래로 내리지 않는다. 데스크톱 확대는 표제만 28→36px.',
    display: [28, 36, 700, 1.25, -.015], heading: [22, 26, 700, 1.3, -.01], sub: [18, 19, 650, 1.35, 0], body: [17, 17, 400, 1.6, 0], small: [15, 15, 400, 1.45, 0],
    label: [13, 13, 600, 1.3, .02], caption: [12, 12, 450, 1.4, .01], numeric: [24, 28, 700, 1.15, -.01], code: [14, 14, 450, 1.55, 0]}),
  scale('mobile-reader', '모바일 읽기', {density: 'spacious', concept: '휴대폰 장문. 본문 18px 고정, 행간 1.8, 한 줄 20자 안팎. 제목 위계는 3단계로 줄인다.',
    display: [28, 40, 700, 1.3, -.015], heading: [22, 28, 700, 1.35, -.01], sub: [19, 20, 700, 1.4, 0], body: [18, 18, 400, 1.8, 0], small: [15, 15, 400, 1.55, 0],
    label: [12, 12, 600, 1.3, .04], caption: [13, 13, 400, 1.5, .01], numeric: [18, 20, 600, 1.3, 0], code: [14, 14, 450, 1.55, 0]}),
  scale('mobile-feed', '모바일 피드', {density: 'compact', concept: '목록·타임라인. 본문 15px 행간 1.55로 한 화면에 카드 여러 장. 숫자(좋아요·가격)는 18→20px.',
    display: [26, 32, 700, 1.25, -.015], heading: [20, 24, 700, 1.3, -.01], sub: [16, 17, 650, 1.35, 0], body: [15, 15, 400, 1.55, 0], small: [13, 13, 400, 1.4, 0],
    label: [12, 12, 600, 1.3, .02], caption: [12, 12, 450, 1.4, .01], numeric: [18, 20, 650, 1.2, -.01], code: [13, 13, 450, 1.55, 0]}),
  scale('product-neutral', '중립 프로덕트', {density: 'comfortable', concept: '가장 균형 잡힌 중립적 본문과 위계',
    display: [26, 34, 700, 1.22, -0.015], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 22, 600, 1.24, -0.005], code: [12, 13, 450, 1.55, 0]}),
  scale('product-humanist', '인문주의 프로덕트', {density: 'comfortable', concept: '소비자 앱을 위한 친근하고 따뜻한 위계',
    display: [28, 40, 700, 1.24, -0.01], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('product-geometric', '기하학 프로덕트', {density: 'comfortable', concept: '현대적인 SaaS와 기술 제품의 기하학적 리듬',
    display: [28, 42, 700, 1.22, -0.015], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('product-soft', '소프트 프로덕트', {density: 'comfortable', concept: '부드러운 모서리와 어울리는 둥근 리듬',
    display: [30, 44, 700, 1.24, -0.02], heading: [22, 28, 700, 1.32, -0.015], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [20, 24, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('enterprise-formal', '공식 엔터프라이즈', {density: 'compact', concept: '제도적 신뢰도와 절제된 위계의 엔터프라이즈 어드민',
    display: [30, 52, 700, 1.22, -0.015], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.035], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('finance-numeric', '금융 숫자 정밀', {density: 'compact', concept: '수치와 테이블 중심의 금융 거래 위계',
    display: [32, 46, 600, 1.22, -0.01], heading: [24, 30, 600, 1.32, -0.005], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [22, 28, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('finance-terminal', '마켓 터미널', {density: 'compact', concept: '실시간 시세와 다수의 호가를 담는 터미널 위계',
    display: [32, 50, 700, 1.24, -0.02], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('finance-banking', '리테일 뱅킹', {density: 'comfortable', concept: '이체 내역과 계좌 정보를 명확히 구분하는 뱅킹 위계',
    display: [32, 58, 600, 1.22, 0], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('finance-report', '임원 리포트', {density: 'spacious', concept: '자산 관리 및 투자 제안서의 품격 있는 리포트 위계',
    display: [34, 60, 700, 1.22, -0.015], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.045], caption: [11, 11, 450, 1.4, 0.01], numeric: [20, 24, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('dev-console', '코드 콘솔', {density: 'compact', concept: '터미널과 CLI 콘솔의 고정폭 중심 리듬',
    display: [36, 56, 600, 1.22, 0], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('dev-docs', '기술 레퍼런스', {density: 'compact', concept: 'API 명세와 코드 블록이 강조되는 기술 문서',
    display: [36, 62, 700, 1.24, -0.02], heading: [22, 28, 700, 1.32, -0.015], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('dev-product', '개발자 제품', {density: 'comfortable', concept: '클라우드 콘솔 및 협업 도구의 개발자 친화적 위계',
    display: [36, 70, 700, 1.22, -0.02], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.55, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('dev-monitor', '시스템 모니터', {density: 'compact', concept: '모니터링 대시보드와 경보 로그를 위한 고밀도 위계',
    display: [26, 34, 700, 1.22, -0.015], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [20, 26, 700, 1.18, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('mkt-expressive', '표현형 브랜드', {density: 'spacious', concept: '시선을 사로잡는 대담한 포스터 표제',
    display: [26, 36, 700, 1.24, -0.02], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('doc-magazine', '매거진 에디토리얼', {density: 'spacious', concept: '문화 매거진의 고대비 표제와 넉넉한 본문',
    display: [28, 40, 700, 1.24, -0.01], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('doc-modern', '모던 에디토리얼', {density: 'comfortable', concept: '현대적 저널과 칼럼의 유려한 본문 리듬',
    display: [28, 42, 700, 1.22, -0.015], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [20, 24, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('shop-luxury', '럭셔리 커머스', {density: 'spacious', concept: '명품 브랜드의 절제된 가격과 품격 있는 상품 설명',
    display: [30, 44, 700, 1.24, -0.02], heading: [22, 28, 700, 1.32, -0.015], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [22, 28, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('shop-promo', '프로모션 커머스', {density: 'compact', concept: '특가 할인과 긴급 혜택이 돋보이는 프로모션 위계',
    display: [30, 52, 700, 1.22, -0.015], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.035], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('mobile-friendly', '친근한 모바일', {density: 'comfortable', concept: '생활형 모바일 앱의 둥글고 부드러운 터치 위계',
    display: [32, 46, 600, 1.22, -0.01], heading: [24, 30, 600, 1.32, -0.005], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('mobile-accessible', '접근성 모바일', {density: 'spacious', concept: '큰 터치 영역과 넉넉한 행간의 고가독성 모바일',
    display: [32, 50, 700, 1.24, -0.02], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [20, 24, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('edu-learning', '학습 플랫폼', {density: 'comfortable', concept: '학습 진도와 개념 이해를 돕는 친근한 교육 위계',
    display: [32, 58, 600, 1.22, 0], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('edu-academic', '학술 논문', {density: 'comfortable', concept: '대학 학술지 및 심층 연구 보고서의 정통 세리프 위계',
    display: [34, 60, 700, 1.22, -0.015], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.045], caption: [11, 11, 450, 1.4, 0.01], numeric: [22, 28, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('edu-friendly', '인터랙티브 교육', {density: 'comfortable', concept: '퀴즈와 튜토리얼을 위한 시각적 교육 위계',
    display: [36, 56, 600, 1.22, 0], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('exp-retro', '레트로 컴퓨팅', {density: 'comfortable', concept: '초기 개인용 컴퓨터의 향수를 담은 슬랩 세리프 위계',
    display: [36, 62, 700, 1.24, -0.02], heading: [22, 28, 700, 1.32, -0.015], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('exp-brutalist', '브루탈리스트', {density: 'compact', concept: '규격화되지 않은 강한 대비와 압축된 타이포그래피',
    display: [36, 70, 700, 1.22, -0.02], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 14, 400, 1.62, 0], small: [12, 12, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.015], caption: [11, 11, 450, 1.4, 0.01], numeric: [18, 20, 650, 1.22, -0.01], code: [12, 13, 450, 1.55, 0]}),
  scale('exp-industrial', '산업 유틸리티', {density: 'compact', concept: '엔지니어링 장비 매뉴얼과 기술 스펙 시트의 견고한 위계',
    display: [26, 36, 700, 1.24, -0.02], heading: [20, 26, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 15, 400, 1.55, 0], small: [12, 13, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.025], caption: [11, 11, 450, 1.4, 0.01], numeric: [16, 16, 500, 1.28, 0], code: [12, 13, 450, 1.55, 0]}),
  scale('exp-mixed-serif', '믹스드 세리프', {density: 'spacious', concept: '극적 디도네 표제와 고전 세리프 본문의 실험적 결합',
    display: [28, 38, 700, 1.22, -0.015], heading: [18, 22, 650, 1.32, -0.01], sub: [15, 17, 600, 1.36, 0], body: [14, 15, 400, 1.55, 0], small: [12, 13, 400, 1.45, 0], label: [12, 12, 600, 1.3, 0.055], caption: [11, 11, 450, 1.4, 0.01], numeric: [22, 28, 700, 1.16, -0.01], code: [12, 13, 450, 1.55, 0]}),
];

// ---------- 구형 → 역할 체계 ----------
const parsePx = size => {
  const px = /^([\d.]+)px$/.exec(size);
  if (px) return {mobile: +px[1], desktop: +px[1]};
  const b = clampBounds(size);
  return {mobile: b.min, desktop: b.max};
};
const px1 = n => Math.round(n * 10) / 10;

/** 역할형 프리셋 4개(MATERIAL_TYPE_PRESETS) → 역할 체계. sub·small은 프리셋에 없으므로 bindType처럼 엔진 프리셋(preset.engine)에서 만든다. */
function fromRolePreset(id) {
  const preset = MATERIAL_TYPE_PRESETS[id], e = TYPE_R2[preset.engine], r = preset.roles;
  const rr = (spec, extra = {}) => Object.freeze({sizePx: Object.freeze(parsePx(spec.size)), weight: spec.weight, lineHeight: spec.lineHeight, trackingEm: spec.trackingEm, ...extra});
  const sub = Math.min(ROLES.sub.cap, Math.round(e.body * e.ratio)), small = ROLES.small.fixed(e.body);
  return Object.freeze({id: `role-scale:${id}`, label: `${preset.label} (구형 역할형)`, density: preset.density, concept: `구형 역할형 프리셋 ${id}를 옮긴 것. 서체는 가져오지 않는다.`, source: `type-role-preset:${id}`, engine: preset.engine, roles: Object.freeze({
    display: rr(r.display), heading: rr(r.heading), sub: Object.freeze({sizePx: Object.freeze({mobile: sub, desktop: sub}), weight: r.heading.weight, lineHeight: e.lh.sub, trackingEm: e.track.sub}),
    body: rr(r.body), small: Object.freeze({sizePx: Object.freeze({mobile: small, desktop: small}), weight: r.body.weight, lineHeight: e.lh.body, trackingEm: 0}),
    label: rr(r.label), caption: rr(r.caption), numeric: rr(r.numeric), code: rr(r.code),
  })});
}
export const LEGACY_ROLE_SCALES = Object.freeze(Object.fromEntries(Object.keys(MATERIAL_TYPE_PRESETS).map(id => [`role-scale:${id}`, fromRolePreset(id)])));

/**
 * 구형 서체 프리셋 18개가 암묵적으로 가진 모듈러 스케일(본문 px × 비율의 거듭제곱, 굵기 이동, 자간, 행간) → `role-scale:modular-<id>`.
 * 값은 엔진 roleSizes에서 계산한다. 접미사 `-tight`·`-dramatic`은 구형 scale 축(−0.07·+0.10)이다. display는 구형 title(페이지 제목) 역할이다.
 */
export function modularScale(id, axis = 'balanced') {
  const p = TYPE_R2[id];
  if (!p) return null;
  const z = roleSizes({typography: id, scale: axis, catalogVersion: '2.3.0'}), serifHead = SERIF_STACKS.has(p.head);
  const hw = Math.min(serifHead ? 700 : 900, Math.max(serifHead ? 400 : 600, 700 + p.hw));
  const sz = name => Object.freeze({mobile: px1(z[name].min), desktop: px1(z[name].max)});
  const rr = (name, weight, lh, tr, extra = {}) => Object.freeze({sizePx: Object.freeze(sz(name)), weight, lineHeight: lh, trackingEm: tr, ...extra});
  const suffix = axis === 'balanced' ? '' : `-${axis}`;
  return Object.freeze({id: `role-scale:modular-${id}${suffix}`, label: `모듈러 ${p.label}${suffix}`, density: 'comfortable', concept: `구형 ${id}의 모듈러 스케일(본문 ${p.body}px, 비율 ${p.ratio}, scale=${axis})`, source: `type-preset:${id}`, roles: Object.freeze({
    display: rr('title', hw, p.lh.title, p.track.title), heading: rr('heading', hw, p.lh.heading, p.track.heading), sub: rr('sub', hw, p.lh.sub, p.track.sub),
    body: rr('body', 400, p.lh.body, 0), small: rr('small', 400, p.lh.body, 0), label: rr('label', 600, 1.35, p.track.label, {case: p.label_case === 'upper' ? 'upper' : 'none'}),
    caption: rr('caption', 450, 1.4, .01), numeric: rr('stat', 700, 1.15, -.02), code: Object.freeze({sizePx: Object.freeze({mobile: 13, desktop: 15}), weight: 450, lineHeight: 1.55, trackingEm: 0}),
  }), nums: p.nums});
}
/** 18개 모듈러 체계(balanced). 접미사 변형은 modularScale로 얻는다. */
export const MODULAR_SCALES = Object.freeze(Object.fromEntries(TYPE_IDS.map(id => { const s = modularScale(id); return [s.id, s]; })));

export const ROLE_SCALES = Object.freeze({...Object.fromEntries(DESIGNED.map(s => [s.id, s])), ...LEGACY_ROLE_SCALES, ...MODULAR_SCALES});

/** `role-scale:modular-<id>[-tight|-dramatic]`는 표에 없는 변형이어도 계산해서 돌려준다. */
export function resolveRoleScale(id) {
  if (ROLE_SCALES[id]) return ROLE_SCALES[id];
  const m = /^role-scale:modular-([a-z]+)-(tight|dramatic)$/.exec(id ?? '');
  return m ? modularScale(m[1], m[2]) : null;
}

// ---------- 구형 이행 표 ----------
/** 구형 서체 프리셋 18개 → 서체 짝·역할 체계, 합친 근거. docs/platform/typography.md의 "구형 18개 이행" 표가 이 값에서 나온다. */
export const LEGACY_MIGRATION = Object.freeze(TYPE_IDS.map(id => {
  const p = TYPE_R2[id], faceId = LEGACY_FACE_OF[id], group = FACE_PAIRINGS[faceId].merges;
  return Object.freeze({preset: `type-preset:${id}`, face: faceId, scale: `role-scale:modular-${id}`, merged: group.length > 1, mergedWith: group.filter(x => x !== id),
    reason: group.length > 1 ? `제목·본문 스택이 ${p.head}/${p.text}로 ${group.join('·')}가 같다. 서체 짝은 하나로 합치고, 차이(비율·굵기 이동·자간·행간·숫자 정렬·라벨 대소문자)는 역할 체계(${group.map(g => `modular-${g}`).join(', ')})에 남긴다` : `스택 ${p.head}/${p.text}가 유일하다`});
}));

// ---------- 플랫폼별 실제 대체 서체 ----------
/** 한글 글리프를 가진 서체(스택 안의 한글 대체 서체 포함). 소문자. */
export const HANGUL_FAMILIES = Object.freeze(new Set(['apple sd gothic neo', 'applemyungjo', 'noto sans kr', 'noto serif kr', 'noto sans cjk kr', 'noto serif cjk kr', 'malgun gothic', 'nanum gothic', 'nanum myeongjo', 'batang', 'd2coding', 'noto sans mono cjk kr', 'nanum gothic coding', 'pretendard variable']));
/**
 * 플랫폼마다 설치돼 있다고 보는 서체. macos는 Chromium에서 측정해 맞췄다(docs/platform/evidence/type/fonts-macos.json). 나머지는 각 OS 기본 설치 목록에 대한 가정이라 확인 필요다.
 * generics: 스택 끝의 일반 계열(sans-serif·serif·monospace)이 [라틴, 한글]에서 닿는 서체. systemUi: system-ui가 닿는 서체(한글 글리프는 다음 서체로 넘어간다).
 */
export const PLATFORM_FONTS = Object.freeze({
  macos: Object.freeze({basis: 'measured', systemUi: 'SF Pro', appleSystem: true, generics: {'sans-serif': ['Helvetica', 'Apple SD Gothic Neo'], serif: ['Times', 'AppleMyungjo'], monospace: ['Courier', 'Apple SD Gothic Neo']}, installed: Object.freeze(new Set([
    'apple sd gothic neo', 'applemyungjo', 'menlo', 'helvetica neue', 'arial', 'avenir next', 'avenir', 'futura', 'seravek', 'gill sans', 'optima', 'iowan old style', 'palatino', 'palatino linotype',
    'georgia', 'times new roman', 'charter', 'baskerville', 'didot', 'bodoni 72', 'hoefler text', 'rockwell', 'superclarendon', 'american typewriter', 'arial rounded mt bold', 'hiragino maru gothic pron', 'impact', 'arial narrow', 'avenir next condensed', 'book antiqua']))}),
  windows: Object.freeze({basis: 'assumed', systemUi: 'Segoe UI', appleSystem: false, generics: {'sans-serif': ['Arial', 'Malgun Gothic'], serif: ['Times New Roman', 'Batang'], monospace: ['Consolas', 'Malgun Gothic']}, installed: Object.freeze(new Set([
    'segoe ui', 'malgun gothic', 'batang', 'arial', 'georgia', 'times new roman', 'century gothic', 'candara', 'palatino linotype', 'book antiqua', 'cambria', 'consolas', 'impact', 'arial narrow', 'sitka text', 'rockwell', 'bodoni mt', 'hoefler text']))}),
  android: Object.freeze({basis: 'assumed', systemUi: 'Roboto', appleSystem: false, generics: {'sans-serif': ['Roboto', 'Noto Sans CJK KR'], serif: ['Noto Serif', 'Noto Serif CJK KR'], monospace: ['Droid Sans Mono', 'Noto Sans Mono CJK KR']}, installed: Object.freeze(new Set([
    'roboto', 'noto sans cjk kr', 'noto serif cjk kr', 'noto serif', 'noto sans mono cjk kr', 'roboto condensed']))}),
  linux: Object.freeze({basis: 'assumed', systemUi: 'DejaVu Sans', appleSystem: false, generics: {'sans-serif': ['DejaVu Sans', 'Noto Sans CJK KR'], serif: ['DejaVu Serif', 'Noto Serif CJK KR'], monospace: ['DejaVu Sans Mono', 'Noto Sans Mono CJK KR']}, installed: Object.freeze(new Set([
    'noto sans cjk kr', 'noto serif cjk kr', 'noto sans mono cjk kr', 'noto serif', 'nanum gothic', 'nanum myeongjo', 'nanum gothic coding', 'd2coding', 'dejavu sans']))}),
});
