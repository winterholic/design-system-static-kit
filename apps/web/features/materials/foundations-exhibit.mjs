export const FOUNDATION_CATEGORIES = Object.freeze([
  {id: 'spacing', label: 'Spacing', title: '간격', summary: '화면·섹션·컨테이너·부품·목록·폼·표·아이콘 사이의 간격 역할과 4px 토큰입니다.', usage: '각 역할은 해당 간격이 필요한 요소에만 선택적으로 적용합니다.'},
  {id: 'density', label: 'Density', title: '밀도', summary: 'Compact, Comfortable, Spacious의 실제 간격·컨트롤 토큰 묶음입니다.', usage: '업무 표·목록은 Compact, 일반 화면은 Comfortable, 읽기 중심 화면은 Spacious를 선택합니다.'},
  {id: 'radius', label: 'Radius', title: '모서리 반경', summary: '반경 값과 해당 반경을 쓰는 표면 모양을 비교합니다.', usage: '형태 언어에 맞춰 카드·입력·오버레이의 모서리를 선택하고 한 페이지에서 무작정 섞지 않습니다.'},
  {id: 'border', label: 'Border', title: '테두리', summary: '무테·가는 선·표준·강한 선·이중선의 실제 표면 예시입니다.', usage: '강한 경계는 강조가 필요한 곳에, 이중선은 폼과 가격 맥락에 제한합니다.'},
  {id: 'elevation', label: 'Elevation', title: '깊이', summary: '평면부터 오프셋·글로우·인셋까지 실제 그림자와 경계를 비교합니다.', usage: '겹쳐진 레이어에만 깊이를 주어 읽기 순서를 전달합니다.'},
  {id: 'surface', label: 'Surface', title: '표면', summary: '표면 재료별 base·raised·overlay 단계의 반경·깊이·채움 역할입니다.', usage: '카드·패널은 base, 떠 있는 메뉴는 raised, 모달은 overlay 단계를 사용합니다.'},
  {id: 'background', label: 'Background', title: '배경', summary: '단색·틴트·그라데이션·격자 등 Core 배경과 장식 재료입니다.', usage: '장식은 콘텐츠 뒤에 두고 텍스트 대비와 blur 비용을 함께 고려합니다.'},
  {id: 'motion', label: 'Motion', title: '모션', summary: '모션 프리셋과 목적별 전이 패턴, 실제 duration·easing·reduced-motion 정책입니다.', usage: '상태 전이에 필요한 요소만 움직이고 prefers-reduced-motion에서는 이동을 제거하거나 짧은 fade만 남깁니다.'},
  {id: 'icon', label: 'Icon', title: '아이콘', summary: '영역별 Core 아이콘 허용 목록과 실제 24px 원본 아이콘입니다.', usage: '의미 아이콘에는 접근 가능한 이름을 주고 장식 아이콘은 보조기술에서 숨깁니다.'},
  {id: 'layout', label: 'Layout', title: '레이아웃', summary: '반응형 레이아웃 24종과 배치 원형 6종입니다.', usage: '화면을 축소하지 말고 폭 구간별 슬롯 재배치와 각 페이지 목적에 맞는 구조를 선택합니다.', detail: true},
  {id: 'chart', label: 'Chart', title: '차트', summary: 'Core SVG 렌더러가 지원하는 29개 차트 형태와 대표 프리셋입니다.', usage: '축·단위·데이터 형태를 목적에 맞게 고르고 전체 설정과 표 대안은 상세에서 확인합니다.', detail: true},
]);

export function categoryRows(category, data) {
  return FOUNDATION_CATEGORIES.some(item => item.id === category) && Array.isArray(data[category])
    ? data[category]
    : [];
}

const BORDER_DECLARATIONS = Object.freeze({
  none: '0', hairline: '1px solid var(--color-line)', standard: '1px solid var(--color-line)',
  strong: '2px solid var(--color-fg)', double: '3px double var(--color-line)',
});

export function borderDeclaration(kind) {
  return BORDER_DECLARATIONS[kind] ?? '0';
}

export function backgroundDecoration(css = '', blur = 0) {
  const declarations = Object.fromEntries(css.split(';').map(part => {
    const colon = part.indexOf(':');
    return colon < 0 ? null : [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
  }).filter(Boolean));
  return {
    '--deco-background': declarations['background-image'] ?? declarations.background ?? 'none',
    '--deco-size': declarations['background-size'] ?? 'auto',
    '--deco-mask': declarations['mask-image'] ?? 'none',
    '--deco-webkit-mask': declarations['-webkit-mask-image'] ?? declarations['mask-image'] ?? 'none',
    '--deco-opacity': declarations.opacity ?? '1',
    '--deco-blur': blur ? `blur(${blur}px)` : 'none',
  };
}

export function layoutPreviewGrid(item) {
  const band = item.bands?.at(-1);
  if (!band) return {columns: '1fr', template: '"sample"'};
  const columns = band.columns.map(column => Array.isArray(column)
    ? `minmax(0, min(${column[1]}rem, 100%))`
    : `${column}fr`).join(' ');
  const template = band.areas.split('|').map(row => `"${row.trim().split(/\s+/).map(area => area === '_' ? '.' : area).join(' ')}"`).join(' ');
  return {columns, template};
}

export function categoryDefinitionCount(id, data) {
  return (data.rows?.length ?? 0) + (id === 'radius' ? data.facets?.length ?? 0 : 0);
}
