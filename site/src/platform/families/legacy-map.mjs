/**
 * 구형 노드 variant → 패밀리 preset 대응표(WBS W3 ③, ADR 0012 §4 "중복 정리").
 * 구형 노드(card, table, tabs, notice, chrome nav)는 2.4.0·2.5.0 호환을 위해 남기고, 새 조립은 2.6.0 컨트롤(기반 컴포넌트)과 패밀리를 쓴다.
 * 각 행: {node, field, value, to: {base?: 기반 컴포넌트 id + props(열린 축 또는 시각 패밀리가 고정하는 축), purpose?: 목적 패밀리 id + variant + props}, note}
 *   to.props      기반 컴포넌트 축. 시각 패밀리가 고정하는 축(appearance·shape)이면 호출자가 정하지 않고 시각 패밀리 선택이 대신한다(`via: 'visual'`).
 *   어휘가 달라 1:1이 아닌 행은 note에 이유를 적는다. 대응할 수 없는 값은 `to: null`과 이유로 남긴다(조용히 가까운 값으로 바꾸지 않는다).
 * tests/platform-family-legacy.test.mjs가 모든 행을 실제 계약과 패밀리 검사에 대 본다.
 *
 * [REQUEST §7 12개 시각 패밀리 및 기존 4개 패밀리 매핑]
 * - Minimal Flat       -> family:quiet (새 ID 없이 기존 ID 확장)
 * - Soft Rounded       -> family:soft (새 ID 없이 기존 ID 확장)
 * - Brutalist          -> family:bold (새 ID 없이 기존 ID 확장)
 * - Editorial          -> family:editorial (새 ID 없이 기존 ID 확장)
 * - Outline Precise    -> family:outline-precise (신규 확충)
 * - Corporate Formal   -> family:corporate-formal (신규 확충)
 * - Dense Enterprise   -> family:dense-enterprise (신규 확충)
 * - Elevated Material  -> family:elevated-material (신규 확충)
 * - Tonal Layered      -> family:tonal-layered (신규 확충)
 * - Glass              -> family:glass (신규 확충)
 * - Luxury             -> family:luxury (신규 확충)
 * - Expressive         -> family:expressive (신규 확충)
 */
const CARD = 'base-component:card-surface', TABS = 'base-component:tabs-control', FB = 'base-component:feedback-message', NAV = 'base-component:navigation-menu';

export const LEGACY_VARIANT_MAP = Object.freeze([
  // card.variant: basic outline filled media horizontal link
  {node: 'card', field: 'variant', value: 'basic', to: {base: CARD, props: {appearance: 'outline'}, via: 'visual'}, note: '기본 카드는 외곽선 면. quiet의 고정 축과 같다'},
  {node: 'card', field: 'variant', value: 'outline', to: {base: CARD, props: {appearance: 'outline'}, via: 'visual'}, note: 'ADR 0012 §4의 예: card.variant outline → appearance outline'},
  {node: 'card', field: 'variant', value: 'filled', to: {base: CARD, props: {appearance: 'filled'}, via: 'visual'}, note: 'soft가 고정하는 축'},
  {node: 'card', field: 'variant', value: 'media', to: {base: CARD, props: {media: 'top'}}, note: '미디어를 위에 두는 열린 축'},
  {node: 'card', field: 'variant', value: 'horizontal', to: {base: CARD, props: {media: 'start'}}, note: '미디어를 앞에 두는 열린 축(640px 이하에서 세로로 접힌다)'},
  {node: 'card', field: 'variant', value: 'link', to: {base: CARD, props: {behavior: 'link'}}, note: '카드 전체가 하나의 링크 대상(늘린 링크)'},
  // table.variant: plain striped bordered. 2.6.0 data-table에는 외형 축이 없어 목적 패밀리와 시각 패밀리로 나눈다.
  {node: 'table', field: 'variant', value: 'plain', to: {purpose: 'purpose:table.business', variant: {toolbar: 'none'}, props: {sortable: false, selectable: false}}, note: '정렬·선택 없는 업무형 표'},
  {node: 'table', field: 'variant', value: 'striped', to: {purpose: 'purpose:table.dense', variant: {zebra: 'on'}, props: {sortable: false}}, note: '줄무늬는 고밀도 표의 변형 zebra다. 행 패딩이 8px 이하여야 하므로 soft·editorial과는 함께 쓸 수 없다'},
  {node: 'table', field: 'variant', value: 'bordered', to: {purpose: 'purpose:table.business', variant: {toolbar: 'none'}, props: {sortable: false, selectable: false}, via: 'visual'}, note: '테두리 굵기는 시각 패밀리가 정한다(quiet 1px, bold 2px). 표 자체에는 테두리 축이 없다'},
  // tabs.variant: underline pill boxed
  {node: 'tabs', field: 'variant', value: 'underline', to: {base: TABS, props: {appearance: 'underline'}, via: 'visual'}, note: 'quiet·editorial이 고정하는 축'},
  {node: 'tabs', field: 'variant', value: 'pill', to: {base: TABS, props: {appearance: 'pill'}, via: 'visual'}, note: 'soft가 고정하는 축'},
  {node: 'tabs', field: 'variant', value: 'boxed', to: {base: TABS, props: {appearance: 'segmented'}, via: 'visual'}, note: '어휘가 다르다: 구형 boxed는 2.6.0 segmented(붙은 상자 한 줄). bold가 고정하는 축. 세로 방향·스크롤과는 함께 쓸 수 없다(TABS_SEGMENTED_*)'},
  // notice.variant(inline banner toast) + tone(info success warning danger)
  {node: 'notice', field: 'variant', value: 'inline', to: {base: FB, props: {placement: 'inline'}}, note: '문서 흐름 안의 안내'},
  {node: 'notice', field: 'variant', value: 'banner', to: {base: FB, props: {placement: 'banner'}}, note: '화면 폭 전체. 알약 모양(shape pill)과는 함께 쓸 수 없다(FB_BANNER_PILL)'},
  {node: 'notice', field: 'variant', value: 'toast', to: {base: FB, props: {placement: 'toast', dismiss: 'button'}}, note: '떠 있는 알림. 닫기 없이 오래 남으면 안 되므로(FB_TOAST_STUCK) dismiss 또는 autoDismiss가 있어야 한다'},
  {node: 'notice', field: 'tone', value: 'info', to: {base: FB, props: {tone: 'info'}}, note: '같은 이름'},
  {node: 'notice', field: 'tone', value: 'success', to: {base: FB, props: {tone: 'success'}}, note: '같은 이름'},
  {node: 'notice', field: 'tone', value: 'warning', to: {base: FB, props: {tone: 'warning'}}, note: '같은 이름. 확인이 필요하면 purpose:feedback.warning'},
  {node: 'notice', field: 'tone', value: 'danger', to: {base: FB, props: {tone: 'danger'}}, note: '같은 이름. 재시도가 필요하면 purpose:feedback.error'},
  // chrome nav: shell 축(내비 구조)
  {node: 'chrome-nav', field: 'shell', value: 'sidebar', to: {purpose: 'purpose:navigation.sidebar', variant: {}}, note: '왼쪽 고정 사이드바'},
  {node: 'chrome-nav', field: 'shell', value: 'topbar', to: {purpose: 'purpose:navigation.topbar', variant: {}}, note: '상단 가로 내비'},
  {node: 'chrome-nav', field: 'shell', value: 'dock', to: {purpose: 'purpose:navigation.bottom', variant: {}}, note: '모바일 하단 탭바. 구형 X01(compact 밀도와 dock 금지)은 44px 터치 대상 때문이며 패밀리는 항목 높이를 44px 이상으로 고정한다'},
  {node: 'chrome-nav', field: 'shell', value: 'stacked', to: {purpose: 'purpose:navigation.topbar', variant: {}}, note: '유틸리티 줄과 탭 줄 2단은 topbar + tabs 두 패밀리를 쌓아 만든다(한 패밀리가 아니다)'},
  {node: 'chrome-nav', field: 'shell', value: 'rail', to: null, note: '아이콘만 있는 좁은 세로 레일은 이 패밀리 묶음에 없다(sidebar의 compact 변형은 라벨이 있다). 대응 패밀리를 추가하기 전까지 구형 노드를 쓴다'},
  {node: 'chrome-nav', field: 'shell', value: 'editorial', to: null, note: '가운데 정렬 편집 내비는 이 묶음에 없다'},
  {node: 'chrome-nav', field: 'shell', value: 'centered', to: null, note: '가운데 정렬 브랜드와 내비는 이 묶음에 없다'},
  {node: 'chrome-nav', field: 'shell', value: 'split', to: null, note: '넓은 왼쪽 패널과 본문은 페이지 배치(조립 엔진)의 몫이다'},
  {node: 'chrome-nav', field: 'shell', value: 'minimal', to: null, note: '브랜드와 한 액션만: topbar의 actions 변형으로 가깝게 만들 수 있으나 항목이 없는 내비는 계약에 없다'},
  {node: 'chrome-nav', field: 'shell', value: 'masthead', to: null, note: '신문 제호형은 이 묶음에 없다'},
]);
