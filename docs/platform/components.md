# 컴포넌트 계약과 인벤토리

이 문서는 Track D의 기준 구현과 §6.2 전체 요구 207항목의 분류 기준이다. 현재 조립기에서 확인한 연결과 향후 구현 계획을 구분한다.

## 5계층

| 계층 | 의미 | 예 |
|---|---|---|
| Primitive | 아이콘·텍스트·장식처럼 더 작은 시각/상호작용 원자 | icon, label |
| Base | 재사용 가능한 독립 UI 컨트롤/표면 | Button, Input |
| Purpose | 업무 목적에 맞춘 완성형 단일 컴포넌트 | KPI Card, Search Form |
| Composite | 여러 컴포넌트를 엮은 동작 패턴 | Button Group, Bulk Action Toolbar |
| Page Section | 페이지 의미 구획과 배치 단위 | Dashboard Summary Section |

정의는 `COMPONENT_LAYERS`에 고정한다. 같은 재료의 색·외형·크기·밀도 값은 새 종류가 아니다. `countDistinctComponentTypes()`는 `componentType`을 기준으로 중복을 제거한다. 구조나 동작이 달라 별도 재료가 필요한 경우만 새 `componentType`을 부여한다.

## 계약 스키마

`src/platform/families/contracts.mjs`의 `defineComponentContract()`를 사용한다. 모든 등록 계약은 `validateComponentContracts()`를 통과해야 한다. `unsupported`에는 미지원 축별 `{value, reason}`을 쓴다. 빈 이유는 검증 오류다.

| 필드 | 작성 내용 |
|---|---|
| id, version, layer | 안정 ID, semver, 5계층 중 하나 |
| purpose, contexts, structure, slots | 목적·페이지 맥락·구조·슬롯 |
| props, content | 허용 입력과 콘텐츠 필드/필수 여부 |
| appearance, sizes, density, states, transitions | 외형·크기·밀도·상태와 전이 |
| events, tokens | 이벤트와 실제 참조 토큰 |
| parents, children, forbidden | 조립 호환성과 금지 조합/이유 |
| responsive, accessibility | breakpoint 동작, 역할·키보드·이름·터치 요구 |
| examples, usage | 렌더 가능한 입력 예와 사용 조건 |
| renderer, blueprint, tests | 모듈·export, Blueprint 필드 연결, 회귀 테스트 경로 |
| unsupported | 지원하지 않는 값과 이유 |

## 파일 배치와 등록

- 기존 기반 구현과 연결은 `src/platform/data/base-components.mjs`에 둔다. 재료 렌더러는 `src/materials/<name>.mjs`의 계약·순수 렌더러·스타일을 재사용한다.
- 목적/복합 계열은 `src/platform/families/<family>.mjs`에 정의하고 `definePurposeFamily()`로 렌더·구조를 둔다. 공통 스키마/검증기/초기 액션 계열 기준 구현은 `families/contracts.mjs`에 있다.
- 각 병렬 작업자는 자기 계열 파일과 테스트만 추가한다. 통합 시 담당자가 `families/index.mjs`에서 계열 배열을 한 번 등록한다. index 등록은 통합 단계에서 순차 처리해 병렬 편집 충돌을 없앤다.
- 조립 공개는 `src/service/platform-components.mjs`의 공통 서비스 경로를 사용한다. REST와 MCP는 `apps/web/lib/api/operations.mjs`, `mcp.mjs`의 얇은 스키마만 연결하며 독자 렌더링을 만들지 않는다. Blueprint 경로를 새로 열 때는 서비스 계약과 OpenAPI/MCP 입력 스키마, 왕복 테스트를 함께 추가한다.
- `families/visual.mjs`, `families/legacy-map.mjs`, 서비스 밖 UI는 Track D에서 수정하지 않는다.

## 등록 절차

1. 인벤토리 ID와 분류(독립/변형/복합), 기존 material 재사용 관계를 먼저 기록한다.
2. 실패하는 계약 테스트를 작성하고 RED를 확인한다.
3. 계열 렌더러/조립을 구현하고 최소 진입점 하나에서 실제 HTML을 생성한다.
4. 플랫폼 registry, 서비스 조립, Blueprint(지원할 때), REST/MCP, standalone export의 같은 결과를 검증한다.
5. 계약 검증기에서 전체 registry와 필수 필드를 검사한다. 출력 차이가 생기는 appearance/size/state 테스트를 둔다.
6. 데스크톱·모바일 Chromium 동작과 기존 출력 hash를 확인한 뒤 Material Coverage를 재생성한다.

## 테스트 템플릿

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateComponentContracts, ALL_COMPONENT_CONTRACTS} from '../src/platform/families/contracts.mjs';

test('registered component contracts are complete', () => {
  assert.deepEqual(validateComponentContracts(ALL_COMPONENT_CONTRACTS), []);
});

test('material variation changes rendered output', () => {
  const a = render({appearance: 'solid', size: 'md', state: 'default'});
  const b = render({appearance: 'ghost', size: 'xl', state: 'disabled'});
  assert.notEqual(a, b);
});
```

## A 계열(버튼·액션) 기준 구현

B~O 계열 작업자는 아래 A 구현을 그대로 따른다. 항목마다 등록 재료, Blueprint 사용법, 독립 시연이 한 줄로 이어져야 완료다.

| 요구 | 등록 재료(재료 질의로 조회) | Blueprint 사용 | 독립 시연 `actions` |
|---|---|---|---|
| Button | `base-component:button-control` | 트리 노드 `button-control` | `component:button` |
| Icon Button | `purpose:button.icon` | `materials.purposes` + 표지 노드 | `component:icon-button` |
| Link Button | `base-component:button-control` | 노드 `button-control`, `appearance: link` | `component:link-button` |
| Toggle Button | `purpose:button.toggle` | `materials.purposes` | `component:toggle-button` |
| Split Button | `purpose:button.split` | `materials.purposes` | `component:split-button` |
| Menu Button | `purpose:button.menu` | `materials.purposes` | `component:menu-button` |
| Floating Action Button | `purpose:button.fab` | `materials.purposes` | `component:floating-action-button` |
| Button Group | `component:actions` | 트리 노드 `actions` | `component:button-group` |
| Segmented Control | `base-component:tabs-control` | 노드 `tabs-control`, `appearance: segmented` | `component:segmented-control` |
| Copy Button | `purpose:button.copy` | `materials.purposes` | `component:copy-button` |
| Close Button | `purpose:button.close` | `materials.purposes` | `component:close-button` |
| Loading Action Button | `purpose:button.loading` | `materials.purposes` | `component:loading-action-button` |

- 이 표의 대응은 `ACTION_COMPONENTS[].materialId`와 `blueprint`에 코드로 있고 `tests/platform-family-contract.test.mjs`가 레지스트리 조회와 대조한다. `tests/platform-action-blueprint.test.mjs`가 12항목의 Blueprint 왕복(입력 Blueprint → 컴파일 → Core가 낸 마크업과 같은 출력, 같은 입력은 같은 바이트)과 재료 질의를 본다.
- Blueprint 사용법 `materials.purposes`는 조립 파이프라인(`assemblePage`)이 아니라 Blueprint를 직접 쓰는 경로다. 대시보드·랜딩 등 페이지 패턴의 슬롯은 `button-control`을 받는 칸이 없어 `assembleDesign`의 `components`로 버튼 계열 목적 패밀리를 놓을 수 없다(Track A의 페이지 슬롯 규칙). 이 제약은 해소하지 않았고, 버튼은 `materials.purposes`에 id를 적고 격자의 표지 노드(`metric`, label `platform-purpose-N`)를 두어 쓴다.
- `actions` 입력(`assembleComponents`의 독립 시연)은 시각 패밀리를 고르지 않는 기본 외형이다. 메뉴·복사·닫기·단일 선택의 구조와 런타임은 `src/platform/families/action.mjs`의 같은 조각을 목적 패밀리와 함께 쓴다.
- 런타임(`ACTION_RUNTIME`)은 문서 단위 위임 핸들러 한 벌이다. 메뉴(ArrowDown·방향키·Home·End·Escape, 닫을 때 트리거로 포커스 복귀), 복사(성공·실패 문구는 `role=status`), 닫기(`data-dismissible` 숨김), 단일 선택(`data-action-segmented`)을 맡는다. 이 재료를 쓴 출력에만 붙는다(`actionRuntimeFor`). 쓰지 않은 출력의 바이트는 바뀌지 않는다.
- 메뉴 버튼과 분할 버튼은 항목(`items`, 2~8개)이 필수다. 항목이 없으면 빈 팝업을 그리지 않고 요청 오류(`BAD_REQUEST`) 또는 컴파일 진단으로 거부한다.
- FAB의 화면 모서리 고정과 safe-area는 컴포넌트가 아니라 페이지 배치가 정한다(`unsupported.position`에 이유를 적었다).
- 같은 컴포넌트를 독립 시연 계약(`component:*`)과 목적 패밀리 계약이 모두 설명하므로 계약에 `componentType`을 두고 `countDistinctComponentTypes`가 한 종류로 센다. 등록 계약 75개는 56종이다.

## L 계열(레이아웃) 기준 구현

신규 L 부품 5종은 `assembleComponents({layouts})`의 실제 렌더 경로와 component contract를 가진다. Blueprint 표의 노드는 해당 부품을 대체하지 않는 기존 부품 연결이다. 특히 `split` 노드는 정적 분할만 그리므로 리사이즈 핸들과 키보드 동작은 `component:resizable-panel`의 직접 렌더 경로에서 제공한다.

| 요구 | 현재 재료 또는 직접 렌더 contract | Blueprint 연결 | 독립 시연 `layouts` |
|---|---|---|---|
| Responsive Grid | `layout:equal-grid`, `layout-primitive:flow` | 트리 노드 `grid` | `component:responsive-grid` |
| Center | `layout:centered-hero` | 노드 `hero`, `variant: centered` | `component:center` |
| Sticky Region | `layout:sticky-action-layout` | 트리 노드 `actions` | `component:sticky-region` |
| Scroll Area | `layout:master-detail` | 트리 노드 `master-detail` | `component:scroll-area` |
| Resizable Panel | component contract `component:resizable-panel` (Manifest 재료 없음) | `split` 노드는 정적 분할 호환만 제공 | `component:resizable-panel` |

- Responsive Grid, Center, Sticky Region, Scroll Area는 E3의 동등 레이아웃 출력으로 의미를 확인한다. 재료별 출력은 각각 균등 격자 흐름, 가운데 정렬, 아래 고정 동작, 높이 제한 스크롤이다.
- Resizable Panel은 `role="separator"` 분할 핸들과 키보드 조작(`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown` 5% 조절, `Home` 15%, `End` 85%) 및 min/max 클램프 제약 런타임(`window.__kitLayout`)을 포함하며 `kit-panel-resize` 이벤트를 발생시킨다.
- 현재 Manifest에서 실제 출력 근거가 없는 요구는 Stack, Container, Resizable Panel이다. 앞의 둘은 원시 요소 선택자 설명만 있고 compiled output probe가 실패했다. Resizable Panel은 기존 `component:split`과 `layout:two-column`이 정적 분할이라 리사이즈 기능을 충족하지 않는다. 따라서 이 세 행은 missing으로 둔다. 독립 시연의 다섯 신규 렌더러 상태와 Manifest의 기존 재료 충족 상태는 별개다.
- Track F·G Studio 및 조립 제약: 기존 Studio 조립기(`assembleDesign`)의 페이지 슬롯은 허용된 부품 유형만 받는다. 신규 다섯 렌더러는 `assembleComponents`의 `layouts` 옵션으로 실제 렌더된다. Blueprint 호환 노드는 기존 기본 부품의 출력을 유지한다.

## N 계열(커머스 패턴) 기준 구현

REQUEST §6.2 N의 커머스 패턴 11항목의 등록 재료, Blueprint 사용법, 독립 시연 대응은 아래와 같다.

| 요구 | 등록 재료(재료 질의로 조회) | Blueprint 사용 | 독립 시연 `commerce` |
|---|---|---|---|
| Product Grid | `component:grid` | 트리 노드 `grid` | `component:product-grid` |
| Product Detail Summary | `component:buy-box` | 트리 노드 `buy-box` | `component:buy-box` |
| Product Variant Selector | `component:buy-box` (part-of) | `buy-box` 노드 내 `variants` 필드 | `component:product-variant-selector` |
| Quantity Selector | `base-component:input-control` | 트리 노드 `input-control` (type: number) | `component:quantity-selector` |
| Price Display | `component:buy-box` | 트리 노드 `buy-box` | `component:price-display` |
| Discount Display | `purpose:card.product` | 트리 노드 `card` | `component:discount-display` |
| Cart Item | `component:summary` | 트리 노드 `summary` | `component:cart-item` |
| Cart Summary | `component:summary` | 트리 노드 `summary` | `component:cart-summary` |
| Checkout Summary | `component:summary` | 트리 노드 `summary` | `component:checkout-summary` |
| Order Status | `component:steps` | 트리 노드 `steps` | `component:order-status` |
| Review Summary | `component:reviews` | 트리 노드 `reviews` | `component:review-summary` |

- 이 대응은 `COMMERCE_COMPONENTS[].materialId`와 `blueprint`에 코드로 있으며 `tests/platform-family-contract.test.mjs`가 레지스트리 조회와 대조한다. `tests/platform-commerce-blueprint.test.mjs`가 11항목의 Blueprint 왕복(입력 Blueprint → 컴파일 → Core 마크업과 동일한 바이트 일치)과 단독 렌더를 검증한다.
- `Product Variant Selector`는 독립 컴포넌트가 아닌 `Product Detail Summary(Buy Box)` 내의 part-of 복합 패턴이다. 렌더 시 첫 번째 옵션의 `checked` 속성을 보장하고 라디오 상태 전이를 지원하여 필수 선택 경로를 실질적으로 충족한다.
- 독립 시연(`assembleComponents`의 `commerce` 입력)은 Core, REST(`/api/v1/platform/assemble-components`), MCP(`assemble_components`) 전 채널에서 동일한 스키마와 동일 바이트 출력을 보장한다(`tests/platform-service-commerce-channels.test.mjs`).
- 런타임(`COMMERCE_COMPONENT_RUNTIME`)은 수량 조절기의 증감 버튼 및 입력 경계선 `disabled` 상태 토글, 카트 아이템의 삭제(`data-cart-item-remove`, dismiss 숨김 및 이벤트 발행)를 처리한다. CSS에 `.kit-cart-item[hidden]{display:none!important}`를 두어 display 충돌을 방지한다.
- 커머스 계약 11종 추가로 총 등록 계약은 70개, 고유 `componentType`은 51종으로 집계된다.

## J 계열(정보 표시) 및 K 계열(미디어·콘텐츠) 구현

J(15항목)와 K(12항목)는 플랫폼 공통 컴포넌트 계약(DEC-011, DEC-013)을 따르며, 기존 시스템 재료 11종과 신규 목적 패밀리 16종(총 27항목)으로 구성된다.

### J 계열 (정보 표시 15항목)
- 기존 재료 매핑 5종: Badge(`base-component:badge`), Chip(`purpose:card.feature`), Filter Chip(`purpose:form.search`), Tag(`base-component:badge`), Divider(`base-component:card-surface`).
- 신규 목적 패밀리 10종:
  - `purpose:info.status-badge`: 상태별 시각 배지
  - `purpose:info.avatar`: 단일 사용자 아바타 (이미지, 이니셜, fallback)
  - `purpose:info.avatar-group`: 다중 아바타 그룹 및 초과 카운트 표시
  - `purpose:info.accordion`: 다중 구획 접기/펼치기 및 키보드 탐색 (`INFO_MEDIA_RUNTIME`)
  - `purpose:info.collapsible`: 단일 섹션 토글 패널 (`INFO_MEDIA_RUNTIME`)
  - `purpose:info.counter`: 수치 및 카운터 표시
  - `purpose:info.notification-indicator`: 알림 점 및 카운트 배지
  - `purpose:info.keyboard-shortcut`: 단축키 조합 시각화 (`<kbd>`)
  - `purpose:info.metadata-row`: 라벨-값 메타데이터 행
  - `purpose:info.stat-comparison`: 지표 비교 및 증감 트렌드

### K 계열 (미디어 및 콘텐츠 12항목)
- 기존 재료 매핑 6종: Image(`media:fine-editorial`), Media Frame(`media:fine-editorial`), Gallery(`purpose:card.product`), Video Frame(`media:fine-editorial`), Quote(`purpose:editorial.quote`), Rich Text Content(`purpose:editorial.content`).
- 신규 목적 패밀리 6종:
  - `purpose:media.responsive-image`: 반응형 이미지 (`srcset`, `sizes`)
  - `purpose:media.carousel`: 인터랙티브 슬라이더 및 인디케이터 (`INFO_MEDIA_RUNTIME`)
  - `purpose:media.audio-player`: 시맨틱 오디오 플레이어 UI 및 컨트롤
  - `purpose:media.file-preview`: 파일 형식별 미리보기 및 다운로드 정보
  - `purpose:media.image-comparison`: 전후 비교 슬라이더 및 시각 차이 확인 (`INFO_MEDIA_RUNTIME`)
  - `purpose:media.figure-caption`: 시맨틱 캡션 포함 미디어 피규어 (`<figure>`, `<figcaption>`)

### 런타임 및 접근성 계약
- 인터랙티브 4종(`accordion`, `collapsible`, `carousel`, `image-comparison`)은 `INFO_MEDIA_RUNTIME` 위임 핸들러를 통해 `actionRuntimeFor`에서 동적으로 주입된다.
- WAI-ARIA 명세 준수: `aria-expanded`, `aria-controls`, `role="region"`, `role="group"`, `aria-roledescription="slide"`, `aria-valuenow` 등을 철저히 검증한다.
- 모든 신규 목적 패밀리는 `materials.purposes`를 통해 Blueprint 컴파일 및 왕복 검증을 통과한다.
- Studio 선택지(`blockedBy: no-studio-choice`)는 Track F 소유이므로 카탈로그 노출(`catalog-visible`) 상태로 관리된다.

### 분류 보정(독립 149 · 변형 36 · 복합 22)

분류의 원천은 `src/platform/families/inventory.mjs`이고, 아래 표는 `node docs/platform/evidence/components/build.mjs`가 이 분류와 Manifest에서 만든다. 손으로 고치지 않는다. `tests/platform-family-inventory.test.mjs`가 요구 목록, Manifest, 이 표의 일치를 본다.

처음 분류(독립 151 · 변형 35 · 복합 21)에서 근거가 있는 다섯 행을 고쳤다.

| 행 | 이전 | 현재 | 근거 |
|---|---|---|---|
| Phone Input, URL Input | 독립 재료 | 변형 | 같은 입력 칸의 kind 값이다. Email·Password·Number Input은 변형인데 둘만 독립으로 두면 같은 기준이 갈렸다. |
| KPI Card | 복합 패턴 | 독립 재료 | REQUEST §6.1이 `Card Surface → KPI Card → KPI Grid → Dashboard Summary Section`으로 KPI Card를 목적 컴포넌트 한 칸으로 둔다. |
| Dashboard KPI Grid | 독립 재료 | 복합 패턴 | 같은 예시에서 KPI Grid는 KPI Card를 묶은 패턴이다. 독립 검토가 지적했다. |
| Bulk Action Toolbar | 변형 | 복합 패턴 | REQUEST §6.1이 `Button → Icon Button → Button Group → Bulk Action Toolbar`로 버튼을 묶은 패턴 쪽에 둔다. 현재 Manifest는 표 툴바(`purpose:table.business`)의 변형으로 충족하지만 분류는 요구 문서의 구조를 따른다. |

경계가 모호한 나머지 행(예: Filterable Table, Collapsible Sidebar, List Item)은 바꾸지 않았다. 그 행을 구현하는 계열 작업자가 구조를 보고 정한다.

## §6.2 207항목 분류표

direct는 기반/목적 재료로 바로 충족, variant는 같은 재료의 외형·동작 변형, part-of는 상위 패턴 안의 일부로 표현한다. 복합 구조가 명확한 업무·커머스·모바일 항목은 coverage가 아직 missing이어도 복합 패턴으로 분류했다. 미구현 상태는 그대로 보존했다. coverage와 상태는 Manifest가 있는 그대로다(A 계열은 12/12가 missing이 아니다. 상태가 `catalog-visible`인 항목은 Studio 선택지가 없어 `verified`로 오르지 못한 것이고, `blockedBy: no-studio-choice`다).

<!-- inventory-table:begin -->
집계: 독립 재료 149 · 변형 36 · 복합 패턴 22 = 207개 요구행. 현재 Manifest missing: 54.

| 요구 ID | 이름 | 분류 | 현재 coverage | 상태 | 기존 재료 ID |
|---|---|---|---|---|---|
| `req:comp:a-01-button` | Button | 독립 재료 | direct | verified | base-component:button-control |
| `req:comp:a-02-icon-button` | Icon Button | 변형 | direct | catalog-visible | purpose:button.icon |
| `req:comp:a-03-link-button` | Link Button | 변형 | variant | verified | base-component:button-control |
| `req:comp:a-04-toggle-button` | Toggle Button | 변형 | direct | catalog-visible | purpose:button.toggle |
| `req:comp:a-05-split-button` | Split Button | 복합 패턴 | direct | catalog-visible | purpose:button.split |
| `req:comp:a-06-menu-button` | Menu Button | 복합 패턴 | direct | catalog-visible | purpose:button.menu |
| `req:comp:a-07-floating-action-button` | Floating Action Button | 변형 | direct | catalog-visible | purpose:button.fab |
| `req:comp:a-08-button-group` | Button Group | 복합 패턴 | direct | verified | component:actions |
| `req:comp:a-09-segmented-control` | Segmented Control | 변형 | variant | verified | base-component:tabs-control |
| `req:comp:a-10-copy-button` | Copy Button | 변형 | direct | catalog-visible | purpose:button.copy |
| `req:comp:a-11-close-button` | Close Button | 변형 | direct | catalog-visible | purpose:button.close |
| `req:comp:a-12-loading-action-button` | Loading Action Button | 변형 | direct | catalog-visible | purpose:button.loading |
| `req:comp:b-01-text-input` | Text Input | 독립 재료 | direct | verified | base-component:input-control |
| `req:comp:b-02-textarea` | Textarea | 변형 | variant | verified | base-component:input-control |
| `req:comp:b-03-search-input` | Search Input | 독립 재료 | direct | catalog-visible | purpose:form.search |
| `req:comp:b-04-password-input` | Password Input | 변형 | variant | verified | base-component:input-control |
| `req:comp:b-05-number-input` | Number Input | 변형 | variant | verified | base-component:input-control |
| `req:comp:b-06-currency-input` | Currency Input | 독립 재료 | missing | missing | — |
| `req:comp:b-07-email-input` | Email Input | 변형 | variant | verified | base-component:input-control |
| `req:comp:b-08-phone-input` | Phone Input | 변형 | schema | verified | component:form |
| `req:comp:b-09-url-input` | URL Input | 변형 | schema | verified | component:form |
| `req:comp:b-10-otp-input` | OTP Input | 독립 재료 | missing | missing | — |
| `req:comp:b-11-tag-input` | Tag Input | 독립 재료 | missing | missing | — |
| `req:comp:b-12-file-input` | File Input | 독립 재료 | missing | missing | — |
| `req:comp:b-13-drag-and-drop-upload` | Drag-and-drop Upload | 독립 재료 | missing | missing | — |
| `req:comp:b-14-input-group` | Input Group | 독립 재료 | direct | catalog-visible | purpose:form.group |
| `req:comp:c-01-select` | Select | 독립 재료 | direct | verified | base-component:select-control |
| `req:comp:c-02-searchable-select` | Searchable Select | 변형 | variant | verified | base-component:select-control |
| `req:comp:c-03-combobox` | Combobox | 변형 | variant | verified | base-component:select-control |
| `req:comp:c-04-multi-select` | Multi-select | 변형 | variant | verified | base-component:select-control |
| `req:comp:c-05-grouped-select` | Grouped Select | 독립 재료 | missing | missing | — |
| `req:comp:c-06-radio` | Radio | 독립 재료 | schema | verified | component:form |
| `req:comp:c-07-radio-group` | Radio Group | 독립 재료 | schema | verified | component:form |
| `req:comp:c-08-radio-card` | Radio Card | 독립 재료 | missing | missing | — |
| `req:comp:c-09-checkbox` | Checkbox | 독립 재료 | schema | verified | component:form |
| `req:comp:c-10-checkbox-group` | Checkbox Group | 독립 재료 | missing | missing | — |
| `req:comp:c-11-switch` | Switch | 독립 재료 | schema | verified | component:form |
| `req:comp:c-12-slider` | Slider | 독립 재료 | missing | missing | — |
| `req:comp:c-13-range-slider` | Range Slider | 독립 재료 | missing | missing | — |
| `req:comp:c-14-rating` | Rating | 독립 재료 | missing | missing | — |
| `req:comp:c-15-color-picker` | Color Picker | 독립 재료 | missing | missing | — |
| `req:comp:d-01-calendar` | Calendar | 독립 재료 | direct | verified | component:calendar |
| `req:comp:d-02-date-picker` | Date Picker | 독립 재료 | schema | verified | component:form |
| `req:comp:d-03-date-range-picker` | Date Range Picker | 독립 재료 | missing | missing | — |
| `req:comp:d-04-time-picker` | Time Picker | 독립 재료 | missing | missing | — |
| `req:comp:d-05-datetime-picker` | DateTime Picker | 독립 재료 | missing | missing | — |
| `req:comp:d-06-month-picker` | Month Picker | 독립 재료 | missing | missing | — |
| `req:comp:d-07-week-picker` | Week Picker | 독립 재료 | missing | missing | — |
| `req:comp:d-08-schedule-selector` | Schedule Selector | 독립 재료 | missing | missing | — |
| `req:comp:e-01-navbar` | Navbar | 독립 재료 | direct | verified | base-component:navigation-menu |
| `req:comp:e-02-sidebar` | Sidebar | 독립 재료 | direct | catalog-visible | purpose:navigation.sidebar |
| `req:comp:e-03-collapsible-sidebar` | Collapsible Sidebar | 독립 재료 | direct | catalog-visible | purpose:navigation.collapsible-sidebar |
| `req:comp:e-04-breadcrumb` | Breadcrumb | 독립 재료 | direct | verified | component:breadcrumb |
| `req:comp:e-05-tabs` | Tabs | 독립 재료 | direct | verified | base-component:tabs-control |
| `req:comp:e-06-vertical-tabs` | Vertical Tabs | 변형 | variant | verified | base-component:tabs-control |
| `req:comp:e-07-underline-tabs` | Underline Tabs | 변형 | variant | verified | base-component:tabs-control |
| `req:comp:e-08-stepper` | Stepper | 독립 재료 | direct | verified | component:stepper |
| `req:comp:e-09-pagination` | Pagination | 독립 재료 | direct | verified | component:pagination |
| `req:comp:e-10-bottom-navigation` | Bottom Navigation | 독립 재료 | direct | catalog-visible | purpose:navigation.bottom |
| `req:comp:e-11-navigation-drawer` | Navigation Drawer | 독립 재료 | direct | catalog-visible | purpose:navigation.drawer |
| `req:comp:e-12-table-of-contents` | Table of Contents | 독립 재료 | direct | verified | component:toc |
| `req:comp:e-13-command-menu` | Command Menu | 독립 재료 | direct | catalog-visible | purpose:navigation.command-menu |
| `req:comp:e-14-context-menu` | Context Menu | 독립 재료 | direct | catalog-visible | purpose:navigation.context-menu |
| `req:comp:f-01-basic-card` | Basic Card | 독립 재료 | direct | verified | base-component:card-surface |
| `req:comp:f-02-feature-card` | Feature Card | 독립 재료 | direct | verified | purpose:card.feature |
| `req:comp:f-03-kpi-card` | KPI Card | 독립 재료 | direct | verified | purpose:card.kpi |
| `req:comp:f-04-statistic-card` | Statistic Card | 독립 재료 | direct | verified | component:metric |
| `req:comp:f-05-metric-trend-card` | Metric Trend Card | 변형 | variant | verified | purpose:card.kpi |
| `req:comp:f-06-product-card` | Product Card | 독립 재료 | direct | verified | purpose:card.product |
| `req:comp:f-07-product-comparison-card` | Product Comparison Card | 복합 패턴 | missing | missing | — |
| `req:comp:f-08-profile-card` | Profile Card | 독립 재료 | direct | verified | purpose:card.profile |
| `req:comp:f-09-team-member-card` | Team Member Card | 독립 재료 | direct | verified | component:team |
| `req:comp:f-10-article-card` | Article Card | 독립 재료 | direct | verified | purpose:card.article |
| `req:comp:f-11-media-card` | Media Card | 변형 | variant | verified | component:card |
| `req:comp:f-12-pricing-card` | Pricing Card | 독립 재료 | direct | verified | purpose:card.pricing |
| `req:comp:f-13-plan-card` | Plan Card | 독립 재료 | direct | assemblable | component:plan |
| `req:comp:f-14-notification-card` | Notification Card | 독립 재료 | missing | missing | — |
| `req:comp:f-15-activity-card` | Activity Card | 독립 재료 | missing | missing | — |
| `req:comp:f-16-settings-card` | Settings Card | 변형 | variant | catalog-visible | purpose:form.settings |
| `req:comp:f-17-integration-card` | Integration Card | 독립 재료 | missing | missing | — |
| `req:comp:f-18-review-card` | Review Card | 독립 재료 | missing | missing | — |
| `req:comp:f-19-testimonial-card` | Testimonial Card | 독립 재료 | direct | verified | component:quote |
| `req:comp:f-20-interactive-selection-card` | Interactive Selection Card | 독립 재료 | missing | missing | — |
| `req:comp:f-21-dashboard-widget-card` | Dashboard Widget Card | 복합 패턴 | missing | missing | — |
| `req:comp:f-22-financial-asset-card` | Financial Asset Card | 독립 재료 | missing | missing | — |
| `req:comp:g-01-basic-table` | Basic Table | 독립 재료 | direct | verified | base-component:data-table |
| `req:comp:g-02-data-table` | Data Table | 독립 재료 | direct | catalog-visible | purpose:table.business |
| `req:comp:g-03-sortable-table` | Sortable Table | 변형 | variant | verified | base-component:data-table |
| `req:comp:g-04-filterable-table` | Filterable Table | 독립 재료 | missing | missing | — |
| `req:comp:g-05-selectable-table` | Selectable Table | 변형 | variant | verified | base-component:data-table |
| `req:comp:g-06-expandable-row-table` | Expandable Row Table | 독립 재료 | missing | missing | — |
| `req:comp:g-07-grouped-table` | Grouped Table | 독립 재료 | missing | missing | — |
| `req:comp:g-08-dense-table` | Dense Table | 독립 재료 | direct | catalog-visible | purpose:table.dense |
| `req:comp:g-09-description-list` | Description List | 독립 재료 | direct | verified | component:properties |
| `req:comp:g-10-list` | List | 독립 재료 | direct | verified | component:list |
| `req:comp:g-11-list-item` | List Item | 복합 패턴 | part-of | verified | component:list |
| `req:comp:g-12-tree-view` | Tree View | 독립 재료 | missing | missing | — |
| `req:comp:g-13-kanban` | Kanban | 독립 재료 | direct | verified | component:kanban |
| `req:comp:g-14-timeline` | Timeline | 독립 재료 | direct | verified | component:timeline |
| `req:comp:g-15-activity-feed` | Activity Feed | 변형 | variant | verified | component:timeline |
| `req:comp:g-16-master-detail` | Master-detail | 복합 패턴 | direct | verified | component:master-detail |
| `req:comp:g-17-key-value-inspector` | Key-value Inspector | 복합 패턴 | missing | missing | — |
| `req:comp:g-18-log-viewer` | Log Viewer | 복합 패턴 | missing | missing | — |
| `req:comp:g-19-code-block` | Code Block | 독립 재료 | direct | verified | component:code |
| `req:comp:g-20-diff-viewer` | Diff Viewer | 독립 재료 | missing | missing | — |
| `req:comp:h-01-modal` | Modal | 독립 재료 | direct | verified | base-component:modal-dialog |
| `req:comp:h-02-alert-dialog` | Alert Dialog | 변형 | variant | verified | base-component:modal-dialog |
| `req:comp:h-03-confirmation-dialog` | Confirmation Dialog | 독립 재료 | direct | catalog-visible | purpose:feedback.confirm |
| `req:comp:h-04-drawer` | Drawer | 독립 재료 | direct | catalog-visible | purpose:overlay.drawer |
| `req:comp:h-05-bottom-sheet` | Bottom Sheet | 변형 | variant | verified | base-component:modal-dialog |
| `req:comp:h-06-popover` | Popover | 독립 재료 | direct | catalog-visible | purpose:overlay.popover |
| `req:comp:h-07-tooltip` | Tooltip | 독립 재료 | direct | verified | base-component:tooltip |
| `req:comp:h-08-dropdown-menu` | Dropdown Menu | 독립 재료 | direct | catalog-visible | purpose:overlay.dropdown-menu |
| `req:comp:h-09-contextual-help` | Contextual Help | 독립 재료 | direct | catalog-visible | purpose:overlay.contextual-help |
| `req:comp:i-01-alert` | Alert | 독립 재료 | direct | verified | base-component:feedback-message |
| `req:comp:i-02-banner` | Banner | 변형 | variant | verified | base-component:feedback-message |
| `req:comp:i-03-callout` | Callout | 독립 재료 | direct | catalog-visible | purpose:feedback.callout |
| `req:comp:i-04-toast` | Toast | 변형 | variant | verified | base-component:feedback-message |
| `req:comp:i-05-snackbar` | Snackbar | 변형 | variant | verified | base-component:feedback-message |
| `req:comp:i-06-inline-error` | Inline Error | 독립 재료 | direct | catalog-visible | purpose:feedback.error |
| `req:comp:i-07-empty-state` | Empty State | 독립 재료 | direct | verified | state-pattern:empty-illustrated, state-pattern:empty-inline, component:empty-state |
| `req:comp:i-08-error-state` | Error State | 독립 재료 | direct | verified | state-pattern:error-panel, state-pattern:error-banner |
| `req:comp:i-09-success-state` | Success State | 독립 재료 | direct | catalog-visible | state-pattern:success-confirmation, state-pattern:success-toast, purpose:feedback.result |
| `req:comp:i-10-skeleton` | Skeleton | 독립 재료 | direct | verified | state-pattern:loading-skeleton, component:skeleton |
| `req:comp:i-11-spinner` | Spinner | 독립 재료 | direct | verified | state-pattern:loading-spinner |
| `req:comp:i-12-linear-progress` | Linear Progress | 독립 재료 | direct | verified | purpose:feedback.progress, component:progress |
| `req:comp:i-13-circular-progress` | Circular Progress | 독립 재료 | direct | catalog-visible | purpose:feedback.circular-progress |
| `req:comp:i-14-step-progress` | Step Progress | 변형 | variant | catalog-visible | purpose:feedback.progress |
| `req:comp:i-15-loading-overlay` | Loading Overlay | 독립 재료 | direct | catalog-visible | purpose:feedback.loading-overlay |
| `req:comp:i-16-status-indicator` | Status Indicator | 독립 재료 | direct | catalog-visible | purpose:feedback.status-indicator |
| `req:comp:j-01-badge` | Badge | 변형 | variant | verified | component:tags |
| `req:comp:j-02-status-badge` | Status Badge | 독립 재료 | direct | catalog-visible | purpose:info.status-badge |
| `req:comp:j-03-chip` | Chip | 변형 | variant | verified | component:tags |
| `req:comp:j-04-filter-chip` | Filter Chip | 변형 | variant | catalog-visible | purpose:form.filter |
| `req:comp:j-05-tag` | Tag | 독립 재료 | direct | verified | component:tags |
| `req:comp:j-06-avatar` | Avatar | 독립 재료 | direct | verified | purpose:info.avatar |
| `req:comp:j-07-avatar-group` | Avatar Group | 독립 재료 | direct | verified | purpose:info.avatar-group |
| `req:comp:j-08-accordion` | Accordion | 독립 재료 | direct | verified | purpose:info.accordion |
| `req:comp:j-09-collapsible` | Collapsible | 독립 재료 | direct | catalog-visible | purpose:info.collapsible |
| `req:comp:j-10-divider` | Divider | 독립 재료 | direct | verified | component:divider |
| `req:comp:j-11-counter` | Counter | 독립 재료 | direct | catalog-visible | purpose:info.counter |
| `req:comp:j-12-notification-indicator` | Notification Indicator | 독립 재료 | direct | catalog-visible | purpose:info.notification-indicator |
| `req:comp:j-13-keyboard-shortcut` | Keyboard Shortcut | 독립 재료 | direct | verified | purpose:info.keyboard-shortcut |
| `req:comp:j-14-metadata-row` | Metadata Row | 독립 재료 | direct | verified | purpose:info.metadata-row |
| `req:comp:j-15-stat-comparison` | Stat Comparison | 독립 재료 | direct | verified | purpose:info.stat-comparison |
| `req:comp:k-01-image` | Image | 변형 | variant | verified | component:media |
| `req:comp:k-02-responsive-image` | Responsive Image | 독립 재료 | direct | verified | purpose:media.responsive-image |
| `req:comp:k-03-media-frame` | Media Frame | 독립 재료 | direct | verified | media:bold-poster, media:duotone-round, media:fine-editorial, media:line-soft-frame, media:solid-cover, media:square-tech |
| `req:comp:k-04-gallery` | Gallery | 복합 패턴 | direct | verified | component:gallery |
| `req:comp:k-05-carousel` | Carousel | 복합 패턴 | direct | verified | purpose:media.carousel |
| `req:comp:k-06-video-frame` | Video Frame | 변형 | variant | verified | component:media |
| `req:comp:k-07-audio-player-ui` | Audio Player UI | 독립 재료 | direct | verified | purpose:media.audio-player |
| `req:comp:k-08-file-preview` | File Preview | 독립 재료 | direct | verified | purpose:media.file-preview |
| `req:comp:k-09-image-comparison` | Image Comparison | 복합 패턴 | direct | verified | purpose:media.image-comparison |
| `req:comp:k-10-figure-and-caption` | Figure and Caption | 복합 패턴 | direct | verified | purpose:media.figure-caption |
| `req:comp:k-11-quote` | Quote | 독립 재료 | direct | verified | component:quote |
| `req:comp:k-12-rich-text-content` | Rich Text Content | 독립 재료 | direct | verified | component:prose |
| `req:comp:l-01-stack` | Stack | 독립 재료 | missing | missing | — |
| `req:comp:l-02-cluster` | Cluster | 독립 재료 | direct | catalog-visible | layout-primitive:cluster |
| `req:comp:l-03-grid` | Grid | 독립 재료 | direct | verified | component:grid |
| `req:comp:l-04-responsive-grid` | Responsive Grid | 독립 재료 | direct | catalog-visible | layout:equal-grid, layout-primitive:flow |
| `req:comp:l-05-split` | Split | 독립 재료 | direct | verified | layout-primitive:split, component:split |
| `req:comp:l-06-bento` | Bento | 복합 패턴 | direct | verified | layout-primitive:bento, component:bento |
| `req:comp:l-07-container` | Container | 독립 재료 | missing | missing | — |
| `req:comp:l-08-section` | Section | 독립 재료 | direct | verified | component:section |
| `req:comp:l-09-center` | Center | 독립 재료 | direct | renderable | layout:centered-hero |
| `req:comp:l-10-sidebar-layout` | Sidebar Layout | 복합 패턴 | direct | verified | component:aside |
| `req:comp:l-11-master-detail-layout` | Master-detail Layout | 복합 패턴 | direct | verified | component:master-detail |
| `req:comp:l-12-sticky-region` | Sticky Region | 복합 패턴 | direct | renderable | layout:sticky-action-layout |
| `req:comp:l-13-scroll-area` | Scroll Area | 복합 패턴 | direct | renderable | layout:master-detail |
| `req:comp:l-14-resizable-panel` | Resizable Panel | 복합 패턴 | missing | missing | — |
| `req:comp:m-01-filter-toolbar` | Filter Toolbar | 독립 재료 | direct | catalog-visible | purpose:form.filter |
| `req:comp:m-02-search-toolbar` | Search Toolbar | 독립 재료 | direct | verified | component:filter-bar, purpose:form.search |
| `req:comp:m-03-bulk-action-toolbar` | Bulk Action Toolbar | 복합 패턴 | variant | catalog-visible | purpose:table.business |
| `req:comp:m-04-data-summary` | Data Summary | 독립 재료 | missing | missing | — |
| `req:comp:m-05-dashboard-kpi-grid` | Dashboard KPI Grid | 복합 패턴 | missing | missing | — |
| `req:comp:m-06-approval-panel` | Approval Panel | 독립 재료 | missing | missing | — |
| `req:comp:m-07-audit-log` | Audit Log | 독립 재료 | missing | missing | — |
| `req:comp:m-08-permission-matrix` | Permission Matrix | 독립 재료 | missing | missing | — |
| `req:comp:m-09-status-management` | Status Management | 독립 재료 | missing | missing | — |
| `req:comp:m-10-settings-form` | Settings Form | 독립 재료 | direct | catalog-visible | purpose:form.settings |
| `req:comp:m-11-search-result-list` | Search Result List | 독립 재료 | missing | missing | — |
| `req:comp:m-12-user-management-table` | User Management Table | 독립 재료 | missing | missing | — |
| `req:comp:m-13-task-list` | Task List | 독립 재료 | missing | missing | — |
| `req:comp:m-14-workflow-steps` | Workflow Steps | 독립 재료 | direct | verified | component:steps |
| `req:comp:m-15-comment-thread` | Comment Thread | 독립 재료 | missing | missing | — |
| `req:comp:n-01-product-grid` | Product Grid | 독립 재료 | direct | verified | component:grid |
| `req:comp:n-02-product-detail-summary` | Product Detail Summary | 독립 재료 | direct | verified | component:buy-box |
| `req:comp:n-03-product-variant-selector` | Product Variant Selector | 복합 패턴 | part-of | verified | component:buy-box |
| `req:comp:n-04-quantity-selector` | Quantity Selector | 독립 재료 | direct | verified | base-component:input-control |
| `req:comp:n-05-price-display` | Price Display | 독립 재료 | direct | verified | component:buy-box |
| `req:comp:n-06-discount-display` | Discount Display | 독립 재료 | direct | verified | purpose:card.product |
| `req:comp:n-07-cart-item` | Cart Item | 독립 재료 | direct | verified | component:summary |
| `req:comp:n-08-cart-summary` | Cart Summary | 독립 재료 | direct | verified | component:summary |
| `req:comp:n-09-checkout-summary` | Checkout Summary | 독립 재료 | direct | verified | component:summary |
| `req:comp:n-10-order-status` | Order Status | 독립 재료 | direct | verified | component:steps |
| `req:comp:n-11-review-summary` | Review Summary | 독립 재료 | direct | verified | component:reviews |
| `req:comp:o-01-mobile-header` | Mobile Header | 독립 재료 | direct | catalog-visible | purpose:navigation.topbar |
| `req:comp:o-02-bottom-navigation` | Bottom Navigation | 독립 재료 | direct | catalog-visible | purpose:navigation.bottom |
| `req:comp:o-03-action-sheet` | Action Sheet | 독립 재료 | missing | missing | — |
| `req:comp:o-04-mobile-list-cell` | Mobile List Cell | 독립 재료 | missing | missing | — |
| `req:comp:o-05-mobile-search` | Mobile Search | 독립 재료 | missing | missing | — |
| `req:comp:o-06-mobile-tab-bar` | Mobile Tab Bar | 독립 재료 | missing | missing | — |
| `req:comp:o-07-full-screen-dialog` | Full-screen Dialog | 독립 재료 | missing | missing | — |
| `req:comp:o-08-mobile-filter-panel` | Mobile Filter Panel | 독립 재료 | missing | missing | — |
| `req:comp:o-09-sticky-bottom-action` | Sticky Bottom Action | 독립 재료 | missing | missing | — |
| `req:comp:o-10-safe-area-container` | Safe-area Container | 독립 재료 | missing | missing | — |
<!-- inventory-table:end -->
