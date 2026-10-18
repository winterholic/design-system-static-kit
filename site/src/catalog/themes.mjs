import {paletteRows} from './palette-rows.mjs';

export const themeCategories = {
  work: '업무·제품', brand: '브랜드·마케팅', read: '읽기·문서', life: '생활·서비스', institution: '공공·기관', app: '모바일·앱',
};

// [id, name, category, description, defaults, forbid (single-axis bans), covers (reference archetypes in the peer repo, by id)]
const D = (shell, typography, density, radius, control, elevation, motion, icon, ornament, backdrop, width, scale, weight, footer, mode = 'light') =>
  ({shell, typography, density, radius, control, elevation, motion, icon, ornament, backdrop, width, scale, weight, footer, mode});

const rows = [
  ['workspace', '워크스페이스', 'work', '업무·개발·운영. 빠르게 읽고 판단하는 도구.', D('sidebar', 'sans', 'comfortable', 'soft', 'match', 'outline', 'subtle', 'line', 'geometric', 'plain', 'wide', 'balanced', 'medium', 'simple'), {}, ['fluent', 'semi', 'arco', 'mantine', 'bootstrap', 'tailwind', 'radix']],
  ['ledger', '레저', 'work', '백오피스·ERP. 직각, 고밀도 표, 흔들림 없는 테두리.', D('sidebar', 'sans', 'compact', 'subtle', 'match', 'outline', 'none', 'line-square', 'none', 'plain', 'full', 'tight', 'medium', 'minimal'), {elevation: ['glow', 'lifted'], motion: ['lively'], radius: ['bubble', 'round']}, ['carbon', 'antd', 'lightning', 'canvas', 'graphite']],
  ['console', '콘솔', 'work', '개발·운영 콘솔. 모노 제목, 격자, 어두운 바탕에서 로그와 상태를 읽는다.', D('sidebar', 'mono', 'compact', 'subtle', 'match', 'outline', 'subtle', 'line-square', 'none', 'grid', 'full', 'tight', 'medium', 'minimal', 'dark'), {radius: ['bubble'], ornament: ['organic']}, ['gitlab', 'patternfly', 'primer', 'helios', 'leafygreen']],
  ['aurora', '오로라', 'work', '그라데이션 SaaS. 유리 같은 면과 글로우, 부드러운 곡선.', D('topbar', 'geometric', 'comfortable', 'round', 'pill', 'glow', 'lively', 'duotone', 'organic', 'gradient', 'wide', 'balanced', 'bold', 'columns', 'dark'), {elevation: ['hard']}, ['aurora']],
  ['trust', '트러스트', 'work', '핀테크·보험. 평평한 구역과 알약 버튼으로 신뢰를 전한다.', D('topbar', 'sans', 'comfortable', 'soft', 'pill', 'soft', 'subtle', 'line', 'geometric', 'plain', 'standard', 'balanced', 'bold', 'columns'), {elevation: ['hard']}, ['toss', 'wise']],
  ['insight', '인사이트', 'work', '데이터 분석 대시보드. 레일 내비와 차트·표 중심.', D('rail', 'sans', 'compact', 'soft', 'match', 'soft', 'subtle', 'line', 'none', 'tint', 'full', 'tight', 'medium', 'minimal'), {radius: ['bubble']}, ['spectrum', 'evergreen']],
  ['hub', '허브', 'work', '협업·커뮤니티 도구. 둥근 서체와 채움 아이콘의 친근한 업무.', D('sidebar', 'rounded', 'comfortable', 'round', 'pill', 'soft', 'lively', 'solid', 'dots', 'tint', 'wide', 'balanced', 'medium', 'simple'), {}, ['slack', 'gestalt', 'garden']],
  ['precision', '프리시전', 'work', '데이터·규격·포트폴리오. 구조를 드러내는 절제.', D('sidebar', 'mono', 'compact', 'square', 'square', 'outline', 'none', 'line-square', 'lines', 'grid', 'wide', 'tight', 'medium', 'minimal'), {radius: ['bubble', 'round']}, ['blueprint']],
  ['neon', '네온', 'brand', '어두운 마케팅. 보라에서 시안으로 번지는 글로우.', D('topbar', 'geometric', 'comfortable', 'round', 'pill', 'glow', 'lively', 'duotone', 'geometric', 'gradient', 'wide', 'dramatic', 'bold', 'columns', 'dark'), {mode: ['light'], elevation: ['hard', 'flat']}, ['neon']],
  ['playful', '플레이풀', 'brand', '캔디 팔레트와 알약 버튼. 소비자·캠페인.', D('topbar', 'rounded', 'spacious', 'bubble', 'pill', 'lifted', 'lively', 'solid', 'organic', 'tint', 'standard', 'dramatic', 'bold', 'columns'), {}, ['playful']],
  ['studio', '스튜디오', 'brand', '에이전시·포트폴리오. 큰 제목, 무채 구도, 한 점 강조.', D('minimal', 'grotesk', 'spacious', 'square', 'pill', 'flat', 'subtle', 'line-fine', 'none', 'plain', 'wide', 'dramatic', 'bold', 'minimal'), {elevation: ['glow']}, ['vercel']],
  ['gallery', '갤러리', 'brand', '무채색 갤러리. 카드는 직각, 버튼만 알약.', D('topbar', 'sans', 'spacious', 'square', 'pill', 'flat', 'subtle', 'line-fine', 'none', 'plain', 'wide', 'balanced', 'medium', 'minimal'), {elevation: ['glow', 'hard']}, ['monopo']],
  ['brutalist', '브루탈', 'brand', '굵은 테두리와 오프셋 그림자. 거칠고 정직한 인터페이스.', D('topbar', 'grotesk', 'comfortable', 'square', 'square', 'hard', 'subtle', 'line-bold', 'geometric', 'plain', 'wide', 'dramatic', 'bold', 'columns'), {elevation: ['soft', 'lifted', 'glow', 'flat'], backdrop: ['gradient'], radius: ['round', 'bubble']}, []],
  ['retro', '레트로', 'brand', '70~90년대 인쇄물. 두터운 선, 겹치는 그림자, 따뜻한 색.', D('stacked', 'geometric', 'comfortable', 'subtle', 'square', 'hard', 'lively', 'solid', 'dots', 'tint', 'standard', 'balanced', 'bold', 'columns'), {backdrop: ['gradient']}, []],
  ['signal', '시그널', 'brand', '캠페인·관제·발표. 높은 대비와 분명한 액션.', D('split', 'sans', 'compact', 'square', 'square', 'outline', 'subtle', 'line-bold', 'geometric', 'plain', 'wide', 'dramatic', 'bold', 'simple'), {}, []],
  ['editorial', '에디토리얼', 'read', '출판·리서치·기록. 긴 문장의 읽기 리듬.', D('editorial', 'serif', 'spacious', 'square', 'match', 'flat', 'none', 'line-fine', 'lines', 'plain', 'standard', 'balanced', 'regular', 'simple'), {elevation: ['glow', 'hard']}, ['editorial']],
  ['paper', '페이퍼', 'read', '종이·노트·위키. 따뜻한 지면 위의 절제된 선.', D('editorial', 'editorial', 'spacious', 'subtle', 'match', 'outline', 'none', 'line', 'lines', 'tint', 'narrow', 'balanced', 'regular', 'simple'), {elevation: ['glow', 'hard', 'lifted']}, []],
  ['manual', '매뉴얼', 'read', '레퍼런스 문서. 사이드바, 목차, 코드 블록.', D('sidebar', 'sans', 'comfortable', 'subtle', 'match', 'outline', 'none', 'line', 'none', 'plain', 'wide', 'tight', 'medium', 'simple'), {elevation: ['glow', 'hard'], motion: ['lively']}, []],
  ['journal', '저널', 'read', '블로그·뉴스레터. 인문주의 서체와 넉넉한 행간.', D('centered', 'humanist', 'spacious', 'soft', 'match', 'flat', 'subtle', 'line', 'organic', 'tint', 'narrow', 'balanced', 'regular', 'simple'), {elevation: ['glow', 'hard']}, []],
  ['magazine', '매거진', 'read', '신문 제호형 머리와 극적인 제목, 열 푸터.', D('masthead', 'serif', 'spacious', 'square', 'square', 'flat', 'subtle', 'line-fine', 'lines', 'plain', 'standard', 'dramatic', 'bold', 'columns'), {elevation: ['glow']}, []],
  ['botanical', '보태니컬', 'life', '자연·생활·웰니스. 차분한 정보와 재료감.', D('topbar', 'sans', 'comfortable', 'soft', 'match', 'soft', 'subtle', 'line', 'organic', 'tint', 'standard', 'balanced', 'medium', 'columns'), {elevation: ['hard']}, []],
  ['cloud', '클라우드', 'life', '헬스케어. 구름빛 큰 카드와 알약 버튼, 하늘 그라데이션.', D('topbar', 'rounded', 'spacious', 'bubble', 'pill', 'soft', 'subtle', 'duotone', 'organic', 'gradient', 'standard', 'balanced', 'medium', 'simple'), {elevation: ['hard']}, ['bevel']],
  ['clinic', '클리닉', 'life', '병원·의원. 맑은 청록과 분명한 예약 동선.', D('topbar', 'sans', 'comfortable', 'soft', 'match', 'soft', 'subtle', 'line', 'geometric', 'plain', 'standard', 'balanced', 'medium', 'columns'), {elevation: ['hard', 'glow'], motion: ['lively']}, []],
  ['dining', '다이닝', 'life', '레스토랑·메뉴판. 세리프와 점선 가격 리더.', D('centered', 'serif', 'spacious', 'subtle', 'square', 'flat', 'subtle', 'line-fine', 'lines', 'tint', 'standard', 'balanced', 'regular', 'columns'), {elevation: ['glow', 'hard']}, []],
  ['cafe', '카페', 'life', '카페·베이커리. 커피빛 둥근 카드.', D('topbar', 'humanist', 'comfortable', 'round', 'pill', 'soft', 'subtle', 'solid', 'dots', 'tint', 'standard', 'balanced', 'medium', 'simple'), {elevation: ['hard']}, []],
  ['stay', '스테이', 'life', '여행·숙박. 사진 카드와 큰 둥근 모서리.', D('stacked', 'sans', 'comfortable', 'round', 'pill', 'lifted', 'subtle', 'line', 'organic', 'plain', 'wide', 'balanced', 'medium', 'columns'), {}, ['airbnb']],
  ['commerce', '커머스', 'life', '스토어 운영·상품. 구매 박스와 목록이 중심.', D('stacked', 'sans', 'comfortable', 'soft', 'match', 'outline', 'subtle', 'line', 'none', 'plain', 'wide', 'balanced', 'bold', 'columns'), {}, ['polaris']],
  ['beauty', '뷰티', 'life', '뷰티 브랜드. 세리프 제목, 여백, 톤온톤 색.', D('centered', 'serif', 'spacious', 'soft', 'pill', 'flat', 'subtle', 'line-fine', 'organic', 'tint', 'standard', 'balanced', 'regular', 'columns'), {elevation: ['hard', 'glow']}, []],
  ['realty', '리얼티', 'life', '부동산·매물. 표와 지표가 신뢰를 만든다.', D('stacked', 'sans', 'comfortable', 'subtle', 'match', 'outline', 'subtle', 'line', 'none', 'plain', 'wide', 'balanced', 'medium', 'columns'), {elevation: ['glow']}, []],
  ['atelier', '아틀리에', 'life', '교육·창작·커뮤니티. 친근한 색면과 여유.', D('topbar', 'sans', 'spacious', 'round', 'match', 'soft', 'lively', 'duotone', 'organic', 'tint', 'standard', 'balanced', 'medium', 'simple'), {elevation: ['hard']}, []],
  ['learning', '러닝', 'life', '학습 서비스. 진행 표시와 큰 알약 버튼.', D('topbar', 'rounded', 'comfortable', 'round', 'pill', 'lifted', 'lively', 'solid', 'geometric', 'plain', 'standard', 'balanced', 'bold', 'simple'), {}, []],
  ['civic', '시빅', 'institution', '공공·행정. 고대비, 큰 터치 영역, 장식 없는 정직함.', D('stacked', 'sans', 'spacious', 'subtle', 'match', 'outline', 'none', 'line', 'none', 'plain', 'standard', 'balanced', 'bold', 'columns'), {motion: ['lively'], elevation: ['glow', 'lifted', 'hard'], backdrop: ['gradient', 'grid'], mode: ['auto']}, ['uswds']],
  ['hanji', '한지', 'institution', '문화·전통. 한지색 바탕과 먹색 선, 단청의 한 점.', D('editorial', 'serif', 'spacious', 'subtle', 'square', 'outline', 'subtle', 'line-fine', 'lines', 'tint', 'narrow', 'balanced', 'regular', 'simple'), {elevation: ['glow', 'hard']}, []],
  ['heritage', '헤리티지', 'institution', '박물관·재단. 금빛 포인트와 제호형 머리.', D('masthead', 'serif', 'spacious', 'square', 'square', 'outline', 'subtle', 'line', 'lines', 'plain', 'standard', 'balanced', 'medium', 'columns'), {elevation: ['glow']}, []],
  ['clarity', '클래리티', 'app', '모바일 앱 화면. 하단 탭바와 깨끗한 둥근 카드.', D('dock', 'sans', 'comfortable', 'round', 'match', 'soft', 'subtle', 'line', 'none', 'plain', 'narrow', 'balanced', 'medium', 'minimal'), {elevation: ['hard']}, ['apple', 'm3']],
  ['pocket', '포켓', 'app', '모바일 우선. 큰 터치 타깃, 큰 반경, 민트 계열.', D('dock', 'rounded', 'spacious', 'bubble', 'pill', 'soft', 'lively', 'solid', 'organic', 'tint', 'narrow', 'balanced', 'bold', 'minimal'), {elevation: ['hard']}, ['mobile']],
  ['nocturne', '녹턴', 'app', '미디어·음악. 어두운 면 위의 글로우.', D('topbar', 'sans', 'comfortable', 'round', 'pill', 'glow', 'subtle', 'duotone', 'dots', 'gradient', 'wide', 'balanced', 'medium', 'simple', 'dark'), {mode: ['light'], elevation: ['hard', 'flat']}, []],
  ['sport', '스포츠', 'app', '피트니스·스포츠. 굵은 그로테스크와 강한 대비.', D('stacked', 'grotesk', 'comfortable', 'subtle', 'square', 'lifted', 'lively', 'solid', 'geometric', 'plain', 'wide', 'dramatic', 'bold', 'columns'), {}, []],
  ['solar', '솔라', 'app', '에너지·태양. 밝은 노랑과 파랑, 또렷한 기하.', D('topbar', 'geometric', 'comfortable', 'round', 'pill', 'soft', 'lively', 'duotone', 'geometric', 'tint', 'standard', 'dramatic', 'bold', 'simple'), {elevation: ['hard']}, []],
  ['ocean', '오션', 'app', '여행·해양. 파도의 곡선과 깊은 청색.', D('topbar', 'humanist', 'spacious', 'soft', 'pill', 'soft', 'subtle', 'line', 'organic', 'gradient', 'wide', 'balanced', 'medium', 'columns'), {elevation: ['hard']}, []],
];

export const themes = Object.fromEntries(rows.map(([id, name, category, description, defaults, forbid, covers]) => {
  const own = paletteRows.filter(r => r[0] === id).map(r => r[1]);
  return [id, {id, name, category, description, palettes: own, defaults, forbid, covers}];
}));
