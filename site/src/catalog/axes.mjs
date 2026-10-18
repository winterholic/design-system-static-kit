/** Style axes. Every value listed here is implemented in src/styles; nothing outside this table can be selected. */
export const axisDefs = {
  mode: {label: '모드', values: {light: '밝은 화면', dark: '어두운 화면', auto: '시스템 설정을 따름(두 세트 모두 대비 검증)'}},
  shell: {label: '셸(내비 구조)', values: {
    sidebar: '왼쪽 고정 사이드바', topbar: '상단 가로 내비', editorial: '가운데 정렬 편집 내비', split: '넓은 왼쪽 패널과 본문',
    rail: '아이콘 레일(좁은 세로 내비)', centered: '가운데 정렬 브랜드와 내비', stacked: '유틸리티 줄과 탭 줄 2단',
    dock: '모바일 하단 탭바', minimal: '브랜드와 한 액션만', masthead: '신문 제호형 큰 머리'}},
  typography: {label: '서체 조합', values: {
    sans: '시스템 산세리프', serif: '세리프 제목 + 산세리프 본문', mono: '모노스페이스 제목', editorial: '세리프 제목 + 세리프 본문',
    rounded: '둥근 서체', geometric: '기하학적 산세리프', humanist: '인문주의 산세리프', grotesk: '굵고 좁은 그로테스크'}},
  density: {label: '밀도', values: {compact: '촘촘함', comfortable: '보통', spacious: '여유로움'}},
  radius: {label: '모서리', values: {square: '직각 0', subtle: '4px', soft: '10px', round: '18px', bubble: '28px'}},
  control: {label: '컨트롤 모양', values: {match: '카드 반경의 절반', pill: '알약', square: '직각'}},
  elevation: {label: '깊이', values: {flat: '테두리·그림자 없음', outline: '1px 테두리', soft: '부드러운 그림자', lifted: '떠 있는 그림자', glow: '브랜드색 글로우', hard: '굵은 테두리와 오프셋 그림자'}},
  motion: {label: '모션', values: {none: '없음', subtle: '150ms 색·그림자 전환', lively: '250ms 이동·등장 연출'}},
  icon: {label: '아이콘 스타일', values: {'line-fine': '가는 선 1.5', line: '보통 선 2', 'line-bold': '굵은 선 2.6', 'line-square': '각진 선 끝 2', solid: '채움', duotone: '선과 옅은 채움'}},
  ornament: {label: '장식', values: {none: '장식 없음', geometric: '기하 도형', organic: '유기적 형태', lines: '선 패턴', dots: '점 패턴'}},
  backdrop: {label: '배경', values: {plain: '단색', tint: '브랜드 틴트', gradient: '부드러운 그라데이션', grid: '옅은 격자'}},
  width: {label: '콘텐츠 폭', values: {narrow: '760px', standard: '1080px', wide: '1280px', full: '1600px'}},
  scale: {label: '타입 스케일', values: {tight: '촘촘한 제목', balanced: '균형', dramatic: '극적인 큰 제목'}},
  weight: {label: '굵기', values: {regular: '제목 500·버튼 500', medium: '제목 650·버튼 600', bold: '제목 800·버튼 700'}},
  footer: {label: '푸터', values: {simple: '한 줄', columns: '브랜드와 링크 열', minimal: '저작 한 줄만'}},
};
export const axisOrder = Object.keys(axisDefs);
export const axes = Object.fromEntries(axisOrder.map(k => [k, Object.keys(axisDefs[k].values)]));
export const styleAxes = axisOrder.filter(k => k !== 'mode');

/**
 * Forbidden axis combinations. `uses` lists every axis the predicate reads; the audit proves that by Proxy,
 * so the combination counter can factor independent axes soundly.
 */
export const axisBans = [
  {id: 'X01', fix: {density: 'comfortable'}, uses: ['density', 'shell'], bad: a => a.density === 'compact' && a.shell === 'dock', why: '하단 탭바는 44px 터치 타깃이 필요한데 compact 밀도는 이를 줄입니다.', source: 'WCAG 2.2 SC 2.5.8 / 하단 탭 가이드'},
  {id: 'X02', fix: {width: 'standard'}, uses: ['width', 'shell'], bad: a => a.width === 'narrow' && ['sidebar', 'rail', 'split'].includes(a.shell), why: '760px 폭에 224~280px 내비 열을 더하면 본문이 480px 아래로 줄어듭니다.', source: 'winterholic-base 03-spacing-layout'},
  {id: 'X03', fix: {width: 'wide'}, uses: ['width', 'shell'], bad: a => a.width === 'full' && ['centered', 'minimal', 'editorial', 'masthead'].includes(a.shell), why: '읽기 중심 셸에 1600px 폭을 주면 한 줄이 읽기 한계(약 75자)를 넘습니다.', source: 'winterholic-base 03-spacing-layout'},
  {id: 'X04', fix: {backdrop: 'plain'}, uses: ['elevation', 'backdrop'], bad: a => a.elevation === 'hard' && a.backdrop === 'gradient', why: '굵은 오프셋 그림자는 단색 바탕에서만 윤곽이 분명합니다.', source: 'winterholic-base 04-shape-elevation'},
  {id: 'X05', fix: {elevation: 'soft'}, uses: ['elevation', 'mode'], bad: a => a.elevation === 'glow' && a.mode === 'light', why: '글로우는 밝은 바탕에서 보이지 않아 경계 신호가 사라집니다. dark 또는 auto에서만 허용합니다.', source: 'winterholic-base 09-dark-mode'},
  {id: 'X06', fix: {scale: 'balanced'}, uses: ['typography', 'scale'], bad: a => a.typography === 'mono' && a.scale === 'dramatic', why: '모노스페이스 제목은 큰 크기에서 24ch를 넘어 모바일에서 넘칩니다.', source: 'winterholic-base 02-typography'},
  {id: 'X07', fix: {density: 'comfortable'}, uses: ['radius', 'density'], bad: a => a.radius === 'bubble' && a.density === 'compact', why: '28px 반경은 16px 안쪽 여백을 침범해 내용이 잘립니다.', source: 'winterholic-base 04-shape-elevation(부모 반경 − 패딩)'},
  {id: 'X08', fix: {footer: 'simple'}, uses: ['footer', 'shell'], bad: a => a.footer === 'columns' && ['minimal', 'dock'].includes(a.shell), why: '링크 열 푸터는 내비 구조가 있는 셸에서만 의미가 있습니다.', source: 'ADR 0002'},
  {id: 'X09', fix: {icon: 'line'}, uses: ['icon', 'density'], bad: a => a.icon === 'line-fine' && a.density === 'compact', why: '1.5px 선을 작은 아이콘에 쓰면 3:1 비텍스트 대비를 안정적으로 유지하기 어렵습니다.', source: 'WCAG 2.2 SC 1.4.11'},
  {id: 'X10', fix: {ornament: 'none'}, uses: ['backdrop', 'ornament'], bad: a => a.backdrop === 'grid' && a.ornament === 'dots', why: '격자 위에 점 패턴을 겹치면 시각 소음이 됩니다.', source: 'winterholic-base 04-shape-elevation'},
  {id: 'X11', fix: {motion: 'subtle'}, uses: ['motion', 'elevation'], bad: a => a.motion === 'lively' && a.elevation === 'flat', why: '움직임은 깊이 변화로 설명되어야 하는데 flat에는 변화할 깊이가 없습니다.', source: 'winterholic-base 05-motion'},
];

/** Navigation limits per shell (R12). Lives in the catalog so the renderer, validator and composer share one table. */
export const navLimits = {sidebar: 8, topbar: 6, editorial: 5, split: 6, rail: 7, centered: 6, stacked: 8, dock: 5, minimal: 2, masthead: 6};
export const iconShells = ['rail', 'dock'];
