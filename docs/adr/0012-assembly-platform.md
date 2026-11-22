# ADR 0012: 재료 조립 플랫폼 계약

- 상태: 채택(계약과 스켈레톤). 구현은 [wbs.md](../platform/wbs.md)의 병렬 작업이 이어 받는다. 개정: 0.2.0, 0.3.0, 0.4.0, 0.5.0(§9, 2026-11-22).
- 날짜: 2026-11-22
- 관련: ADR 0001, 0009, 0011; [감사 2026-11](../platform/audit-2026-11.md)
- 번호 메모: 작업 카드는 `0010-assembly-platform.md`를 지시했다. 그러나 0010은 이미 `0010-expression-grammar-2-5.md`가 쓰고 있어 0012로 둔다.

## 배경

감사 결과 최신 조립 경로(`src/profiles/assemble.mjs`)에는 다섯 가지 문제가 있다.

1. 색을 팔레트 하나로 고정한다.
2. 역할형 서체 프리셋이 서체 짝을 덮어써, 실제로 적용되는 서체 짝이 셋뿐이다.
3. 등록된 재료(2.6.0 컨트롤, 차트 프리셋, 레시피) 대부분이 출력에 닿지 않는다.
4. 조합의 유효성은 마지막 Blueprint 검증에서야 드러난다.
5. `intent.components`는 노드를 넣지 않는다.

원인은 구조에 있다. 테마와 프로파일 같은 "값을 한꺼번에 정하는 묶음"이 색, 서체, 모양, 부품 선택을 모두 소유한다. 재료 사이의 관계는 허용 목록과 금지 규칙으로 흩어져 있다.

이 ADR은 플랫폼의 정의를 이렇게 정한다. **미리 구현된 실제 코드 재료를 관계 그래프로 탐색·매칭하고, 규칙 기반 파이프라인으로 조립해 쓸 수 있는 코드로 내보낸다.**

- AI가 HTML이나 CSS를 생성하지 않는다(2026-11-21 결정).
- 등록 수량이나 속성 카테시안 곱을 성과 지표로 쓰지 않는다. 성과는 `scripts/platform/baseline.mjs`의 "실제 조립 가능"과 "검증된 조합"으로 잰다.

## 결정 요약

| 항목 | 결정 | 코드 |
|---|---|---|
| 재료 종류 | style-context, palette, subtoken-set, type-system, base-component, family. 종류마다 같은 KindRegistry 인터페이스 | `src/platform/contract.mjs` `KIND_SPECS`, `src/platform/registry.mjs` |
| 색 | 팔레트(원색)와 서브토큰 세트(역할 분배)를 다대다로 둔다 | `src/platform/color.mjs`, `data/palettes.mjs`, `data/subtoken-sets.mjs` |
| 타이포 | 타이포 시스템 = 서체 짝(구형 18) × 역할 크기 체계(역할형 4) | `src/platform/type.mjs`, `data/type-systems.mjs` |
| 테마 | 스타일 맥락으로 바꾼다. 값을 정하지 않고 추천 순위만 정한다 | `data/style-contexts.mjs` |
| 컴포넌트 | 기반 컴포넌트(동작·구조·접근성·상태)와 디자인 패밀리(시각 언어)로 나눈다 | `src/platform/family.mjs`, `data/base-components.mjs`, `data/families.mjs` |
| 관계 | 선언 관계(edge)와 계산 관계(check)를 둔다 | `src/platform/relations.mjs` |
| 조립 | 7단계 순수 함수 파이프라인. 추천 1순위가 기본 조립값이다 | `src/platform/pipeline.mjs`, `src/platform/recommend.mjs` |
| 공개 | 지금은 내부 모듈이다. 서비스 함수 하나로 공개하고 REST·MCP·Studio가 그 함수를 함께 부른다 | §7 |

## 1. 재료 종류와 레지스트리

모든 플랫폼 재료는 공통 필드(`COMMON_FIELDS`)를 가진다: `id`, `kind`, `version`, `label`, `contexts`, `tags`, `relations`, `quality`, `source`, `reuses`. 종류별 필드는 `KIND_SPECS`에 있다.

- `reuses`는 재사용하는 ADR 0011 재료의 id다(예: `type-preset:tech`, `component:card-surface`). 감사와 이행 추적에 쓴다.
- `source.license`는 `internal`이나 `MIT`만 받는다. 권리를 확인하지 못한 자료는 등록 단계에서 거부한다(`P_LICENSE`). Coolors 팔레트 427개는 이 레지스트리에 들어오지 않는다.
- `quality.status: verified`에는 `tests/<file>.test.mjs:<line>` 근거가 필요하다.

레지스트리는 `createPlatformRegistry()`로 만든다. 전역 상태가 없다. 종류마다 칸이 하나씩 있고, 모든 칸은 같은 인터페이스를 가진다.

```js
reg.kind(k).register(record)   // 검사 실패 시 PlatformError, 레지스트리 불변
reg.kind(k).get(id) / has(id) / list() / filter({context, tag, minQuality})
reg.kind('base-component').implement(id, {contract, render, styles})   // 실제 구현 연결(기록과 계약 id가 같아야 함)
reg.get(id) / reg.list(kind?) / reg.registerAll(records) / reg.check()  // check: 관계 대상·패밀리 구성원·구현 연결
```

ADR 0011 레지스트리(`catalogRegistry`)는 "무엇이 등록됐는가"를 세는 목록이다. 그대로 둔다. 플랫폼 레지스트리는 "무엇을 무엇과 함께 조립할 수 있는가"를 다룬다. 기존 재료는 id로 참조하고, 구현은 import해서 재사용한다. 복사하지 않는다.

### 1.1 팔레트와 서브토큰 세트(다대다)

- **팔레트**(`palette`)는 원색만 가진다: `seeds: {brand, neutral, accent?, success?, warning?, danger?, info?}`(대문자 `#RRGGBB`). 어떤 원색이 배경이 되고 어떤 원색이 글자가 되는지는 정하지 않는다.
- **서브토큰 세트**(`subtoken-set`)는 역할 분배 설계다. `needs`(쓰는 팔레트 자리), `modes`, `roles`를 가진다. `roles`는 색 역할(`COLOR_ROLES`, 23개)마다 규칙(RoleRule)을 하나씩 둔다. 원색 값은 갖지 않으므로 어떤 팔레트에도 다시 쓸 수 있다.
  - `{from: 자리, light: 단계, dark: 단계, min?: {against: [앞 역할…], ratio}}`: 램프 단계에서 시작해 대비를 맞출 때까지 보정한다.
  - `{on: 역할, min}`: 그 역할 위에 놓이는 글자. 흰색과 neutral 950 중 대비가 맞는 쪽을 쓴다.
  - 키 순서가 곧 계산 순서다. `against`와 `on`은 앞에서 정의한 역할만 가리킨다(`P_SUBTOKEN_ORDER`).
- **결합**: `bindColor(palette, set, mode)`. 램프와 대비 보정은 2.6.0 엔진(`src/color-tokens.mjs`)의 함수를 그대로 쓴다. 계산식을 새로 두지 않는다.
- **호환**: 계산 관계 `palette-subtoken`이 판정한다. 세트의 모든 모드에서 필요한 원색이 있고 대비 게이트를 통과해야 호환이다. 선언 관계 `prefers`로 우선순위를 더한다.
- **CSS 변수 이름**: 색 역할은 기존 컴파일 CSS가 읽는 변수 이름(`--kit-surface`, `--kit-card-hover` 등)으로 낸다. 그래서 기존 부품 CSS를 고치지 않고 재사용한다.
- **이행**:
  - static-kit의 `getMode`는 `subtoken-set:standard`가 같은 원칙으로 옮긴다.
  - 구형 `resolveTokens`의 자동 분배는 이후 `subtoken-set:derived`로 옮길 수 있다. 다만 자체 팔레트에만 쓴다.
- **남은 한계(색 작업)**:
  - RoleRule에는 고정값(예: 흰 표면)이 없다. 그래서 표준 세트의 light 표면이 neutral 50(약 `#E9EAED`)이다.
  - `fixed` 규칙을 더할지는 색 작업이 정한다. 계약을 바꾸면 `PLATFORM_CONTRACT_VERSION`을 올린다.

## 2. 독립 타이포그래피 시스템

**타이포 시스템**(`type-system`)은 `facePairing`(서체 짝)과 `roleScale`(역할 크기 체계)의 곱이다.

| 구성 | 출처 | 소유하는 값 |
|---|---|---|
| 서체 짝 | 구형 서체 프리셋 18개(`type-preset:<id>`, `src/typography.mjs` `TYPE_R2`) | 제목·본문 서체 스택, 비율, 자간, 행간, 숫자 정렬 |
| 역할 크기 체계 | 역할형 프리셋 4개(`type-role-preset:<id>`, `src/materials/typography.mjs`) | 역할별 크기(clamp), 굵기, 행간, 자간, 밀도·좁은 화면 계수 |

- **결정**: 서체는 서체 짝에서만, 크기는 역할 체계에서만 온다. 현재 `renderRoleTypeCSS`는 역할형 프리셋 엔진의 서체로 `--kit-heading`을 덮는다. 그 결과 조립 출력의 서체 짝이 셋으로 줄었다(감사 Q2). 플랫폼의 `bindType`은 이 덮어쓰기를 하지 않는다.
- **한글 한도**: 엔진의 `HANGUL`을 그대로 검사한다. 세리프 한글 서체는 굵기가 한 벌뿐이다. 그래서 서체 짝이 세리프이고 역할 체계의 제목 굵기가 `serifHangulWeightMax`(700)를 넘으면 조합을 거부한다(`P_CHECK_TYPE_HANGUL`). 예: editorial × marketing(display 750).
- **통합 방안**:
  1. 서체 짝 18개와 역할 체계 4개를 그대로 쓴다. 이름 붙인 조합(예: `type-system:tech-erp`)을 완성 프리셋으로 등록한다.
  2. 조합이 가능한지는 계산 관계(한글 한도)와 선언 관계(맥락별 `prefers`·`avoids`)로 정한다. 18×4의 곱을 모두 등록하지 않는다.
  3. 구형 18개가 암묵적으로 가진 모듈러 스케일(비율 × 역할 지수)도 역할 체계 하나로 옮긴다(`role-scale:modular`, 타이포 작업). 그러면 2.4.0 출력과 같은 크기 체계를 플랫폼에서도 고를 수 있다.
  4. 2.6.0 `typeRoles`의 출력은 바꾸지 않는다. 고정 해시가 있기 때문이다. 플랫폼 경로는 새 카탈로그 버전(§7) 뒤에서만 Blueprint에 들어간다.

## 3. 테마를 스타일 맥락으로

**스타일 맥락**(`style-context`)은 값을 정하지 않는다. `axisPreferences`(축별 선호 순서), `forbid`(축별 금지 값), `mood`, `contexts`, 다른 재료로 가는 관계를 가진다. 추천 단계에서 순위와 차단으로만 작용한다.

- **테마에서 옮기는 규칙**(`styleContextFromTheme`):
  - 테마의 축 기본값은 첫 선호가 된다.
  - 단일 축 금지(`forbid`)는 금지로 그대로 옮긴다.
  - 테마의 팔레트 목록(Coolors)은 옮기지 않는다. 색은 팔레트·서브토큰 관계로 고른다.
- **이유**: 테마가 값을 소유하면 테마 하나가 색, 서체, 모양을 한꺼번에 고정한다. 그러면 다양성은 테마 수에 묶인다. 맥락으로 두면 같은 맥락에서 여러 팔레트, 타이포 시스템, 패밀리를 근거와 함께 고를 수 있다.
- **스타일 맥락이 금지한 모양을 가진 패밀리**는 추천에서 빠진다. 다른 값으로 바꾸지 않는다(`P_REL_STYLE_FORBID`, 후보가 없으면 `P_SELECT_EMPTY`).
- **테마 54개 전부의 이행**은 테마·기타 재료 작업(W4)이 맡는다. 테마의 `defaults` 중 서체와 모양 외의 축(셸, 폭, 밀도)은 조립 엔진의 페이지 단계에서 선호로 읽는다.

## 4. 기반 컴포넌트와 디자인 패밀리

| | 기반 컴포넌트(`base-component`) | 디자인 패밀리(`family`) |
|---|---|---|
| 소유 | 동작, DOM 구조, 접근성, 상태 전이, 금지 조합, 렌더러, 기본 CSS | 시각 언어: 구성원별 고정 축, 모양(radius·elevation·motion), 전제 밀도 |
| 출처 | 기존 2.6.0 컨트롤 계약(`defineContract`) + `render*` + `*Styles` | 신규. 여러 기반 컴포넌트를 묶는다 |
| 바꾸는 방법 | 계약 버전을 올린다(ADR 0011) | 패밀리 버전을 올린다. 기반 구현은 건드리지 않는다 |

**패밀리 계약 필드**

- `members`: `{base-component id: {preset, open, needs?}}`
  - `preset`: 패밀리가 고정하는 축 값.
  - `open`: 호출자가 고를 수 있는 축. preset과 겹칠 수 없다.
  - `needs.typeRoles`: 구성원이 읽는 타이포 역할.
  - preset과 open은 기반 계약의 축이어야 한다. preset만으로 금지 조합에 걸리면 안 되고, open 축의 조합 중 허용되는 것이 하나 이상 있어야 한다(`memberErrors`, `memberCombinations`).
- `shape`: `{radius, elevation, motion}`. 값은 `src/styles/base.mjs`의 축 값 표 이름이다. 패밀리는 px나 색을 새로 정하지 않는다.
- `density`, `states`(구성원 전체가 보장하는 상태), 공통 필드.

**그 밖의 규칙**

- **닫힌 쌍**: family와 base-component는 호환 관계가 있어야만 함께 조립한다(`CLOSED_PAIRS`). 호환 근거는 계산 관계 `family-member`다. 그 기반 컴포넌트가 구성원이어야 하고, 고정·열린 축이 계약 안에 있어야 한다.
- **렌더**: `renderMember`가 처리한다. 호출자가 고정 축을 바꾸려 하면 `P_ATTR_LOCKED`로 거부한다. 열린 축 조합이 계약에서 금지되면 `P_REL_CONTRACT`를 낸다. 기반 계약의 대비 쌍(`contract.pairs`)은 결합된 색으로 검사한다(`P_CHECK_CONTRAST`).
- **범위**: 패밀리 모양 변수는 `[data-family="<name>"]` 범위에만 둔다. 한 화면에 패밀리가 여럿 있어도 서로 덮지 않는다.
- **중복 정리(W3)**: 구형 노드(card, table, tabs, notice, chrome nav)와 2.6.0 컨트롤이 짝을 이루는 경우, 2.6.0 컨트롤을 기반 컴포넌트로 삼는다. 구형 노드의 `variant` 값은 패밀리 preset으로 옮긴다(예: `card.variant: outline` → `appearance: outline`). 구형 노드 자체는 2.4.0·2.5.0 호환을 위해 남긴다.

## 5. 관계(edge) 모델

선언 관계는 재료 기록의 `relations`에 둔다. **선언한 재료의 소유자가 관계를 소유한다.** 그래서 공유 관계 파일이 없고, 작업 사이에 파일 충돌도 없다.

```js
{type, to, priority, reason, when?, evidence?}   // from은 선언한 재료 id
```

| type | 뜻 | 평가 |
|---|---|---|
| `requires` | 고르면 상대도 있어야 한다(의존) | 없으면 `P_REL_REQUIRES` |
| `forbids` | 함께 쓸 수 없다. 양방향으로 읽는다 | `P_REL_FORBIDS`. 추천에서는 차단 |
| `prefers` | 함께 쓰면 좋다 | 추천 점수에 +priority |
| `avoids` | 쓸 수 있으나 피한다 | 추천 점수에 −priority |
| `compatible` | 호환을 명시한다 | 닫힌 쌍에서 필요 |

**필드 규칙**

- `priority`: 0에서 100 사이의 정수.
- `reason`: 반드시 적는다. 진단과 추천 근거에 그대로 나온다.
- `when`: 조건이다. 키는 `mode`, `context`, `density`. 키끼리는 AND, 한 키의 값 목록은 OR로 읽는다. 맥락에 그 키가 없으면 조건부 관계는 적용하지 않는다.

**계산 관계**(`defineCheck({id, kinds: [A, B], reason, run})`)는 값을 계산해야 알 수 있는 호환성이다. 순수 함수여야 한다. 지금 있는 것은 `palette-subtoken`(대비 게이트)와 `family-member`(계약 적합성)다. 실패하면 `P_CHECK_<ID>`를 낸다.

**조회 함수**(`createRelationGraph(registry, {checks})`)

- `edges()`, `from(id, {type, ctx})`, `to(id, …)`, `between(a, b, ctx)`
- `runChecks(a, b, ctx)`
- `score(candidate, selectedIds, ctx)`: 추천용 점수.
- `evaluate(ids, ctx)`: 묶음 전체의 조합 유효성.

**개별 속성 유효성과 조합 유효성의 구분**

- 개별: id가 등록됐는가, 종류가 맞는가, 맥락이 맞는가, 축 값이 계약 안인가. `P_ATTR_*`로 보고한다.
- 조합: 관계와 계산 관계. `P_REL_*`와 `P_CHECK_*`로 보고한다.

**기존 규칙의 이행**(조립 엔진 작업 W5, 0.2.0에서 구현: §9.1)

- 축 금지 X01 등과 테마 forbid는 `forbids`로 옮긴다.
- 프로파일 허용 목록은 스타일 맥락의 선호와 패밀리 `contexts`로 옮긴다.
- 컨트롤 계약 `forbidden`은 기반 컴포넌트 안에 그대로 둔다. 같은 재료 안의 규칙이기 때문이다.

## 6. 조립 파이프라인

각 단계는 `(state, env) → state'` 순수 함수다. error 진단이 생기면 다음 단계로 가지 않는다. 같은 입력은 같은 바이트를 낸다. `env = {registry, graph}`.

| 단계 | 입력 | 출력 | 진단 |
|---|---|---|---|
| 1 `normalizeRequest(request)` | `{context, mode?, density?, styleContext?, palette?, subtokenSet?, typeSystem?, families?, components: [{base, family?, props?, content}]}` | `intent` | `P_REQUEST*`, `P_ATTR_MODE`·`P_ATTR_DENSITY` |
| 2 `resolveStyleContext` | intent | `styleContext` | `P_ATTR_*` |
| 3 `selectMaterials` | intent, styleContext | `selection: {styleContext, palette, subtokenSet, typeSystem, families: {base: family}}`, decisions | `P_ATTR_UNKNOWN`·`P_ATTR_KIND`·`P_ATTR_CONTEXT`, `P_SELECT_EMPTY` |
| 4 `checkCombination` | selection | `relations: {ok, violations, applied, checks}` | `P_REL_*`, `P_CHECK_*` |
| 5 `bindTokens` | selection | `bound: {color, type, families, root}` | `P_COLOR_*` |
| 6 `composeComponents` | intent.components, bound | `items: [{base, family, props, html, contrast}]` | `P_ATTR_LOCKED`·`P_ATTR_AXIS`·`P_ATTR_VALUE`, `P_REL_CONTRACT`, `P_CHECK_CONTRAST`, `P_RENDER` |
| 7 `emit` | 모두 | `output: {css, html, tokens, manifest}` | `P_TOKEN_MISSING`(CSS가 읽는 변수에 값이 없을 때) |

- **실행**: `assemblePlatform(request, env)`는 `{ok, value, diagnostics, decisions, stage}`를 돌려준다. `stage`는 마지막으로 돈 단계이고, 실패하면 그 위치를 가리킨다.
- **3단계의 선택 규칙**:
  - 요구가 있으면 검사한 뒤 그대로 쓴다. 다른 값으로 바꾸지 않는다.
  - 요구가 없으면 `recommend()`의 1순위를 쓴다. 고른 이유(관계, 축 선호)는 `decisions`에 남는다.
  - 고르는 순서는 팔레트 → 서브토큰 세트(팔레트 기준) → 타이포 시스템 → 컴포넌트별 패밀리(서브토큰·타이포 기준)다.
- **추천 시그니처**: `recommend(registry, graph, {kind, context?, mode?, density?, styleContext?, selected?: [id]})`. 반환은 `{kind, ranked: [{id, score, reasons}], blocked: [{id, blocked: [{code, reason, with}]}]}`이고, 동점은 id 순이다.
- **출력**: 지금은 독립 HTML 조각과 CSS다. Blueprint 출력은 §7의 버전 게이트 뒤에 둔다.
- **최소 예시**(`src/platform/examples/minimal.mjs`): 팔레트 1, 서브토큰 세트 2, 타이포 시스템 1, 스타일 맥락 1, Card 패밀리 1로 끝까지 돈다. 기존 Card 구현(`src/materials/card.mjs`)의 계약, 렌더러, CSS를 바이트 그대로 재사용한다. 이를 `tests/platform-minimal.test.mjs`가 검사한다.

## 7. Blueprint와 공개 API 버전 정책

1. **기존 출력은 고정한다.**
   - 2.1.0에서 2.6.0까지의 Blueprint 문법, 검증, 컴파일 출력, `site/v1/catalog.json` 바이트, 고정 해시는 바꾸지 않는다.
   - `assembleBlueprint`(프로파일 조립)도 응답 모양과 결과를 그대로 둔다.
2. **플랫폼은 당분간 내부 모듈이다.**
   - `src/platform/`은 패키지 공개 경로(`./service`, `./edit`)가 아니다. `package.json` exports를 바꾸지 않는다.
   - 계약을 바꾸면 `PLATFORM_CONTRACT_VERSION`을 올린다. 0.x 동안은 minor에서도 깨지는 변경을 허용하되, 이 ADR을 함께 개정한다.
3. **공개는 서비스 함수 하나로 한다.**
   - 조립 엔진 작업(W5)이 `src/service/assemble-design.mjs`에 `assembleDesign(request)`을 만든다. 같은 봉투(`{ok, value|errors, warnings, catalogVersion, contractVersion}`)를 쓴다.
   - `./service`의 `index.mjs`에 이름 하나를 더한다(추가만 하는 변경). 서비스 `CONTRACT_VERSION`은 minor를 올린다.
   - REST(`POST /api/v1/assemble`), MCP(`assemble_design` 도구), Studio가 모두 이 함수를 부른다. 채널별 조립 로직은 두지 않는다(ADR 0009).
4. **Blueprint 게이트**:
   - 플랫폼 선택을 Blueprint에 저장할 때는 새 opt-in 카탈로그 버전 `2.7.0`의 최상위 필드 `materials: {styleContext, palette, subtokenSet, typeSystem, families}`로 둔다.
   - 2.6.0 이하에서 이 필드를 쓰면 `VERSION_FIELD`로 거부한다.
   - 기본 생성 버전(`CATALOG_VERSION = 2.4.0`)은 바꾸지 않는다. 승격은 별도 호환 검토로 한다(ADR 0010, 0011과 같은 방식).
5. **기존 프로파일 조립의 이행**: `assembleBlueprint`는 나중에 "프로파일 → 플랫폼 요청" 어댑터가 된다. 그 전환은 결과 바이트가 같다는 고정 테스트가 있을 때만 한다.
6. **금지 사항**: 버전 태그, npm 발행, 정식 릴리스는 이 계약 범위 밖이다.

## 8. 웹 감사가 확인한 Core 결함(2026-11-22)

웹 감사(`docs/platform/web-audit.md` §2, §4, `docs/platform/web-ia.md`)가 Studio와 API에서 재현한 결함 중 원인이 Core에 있는 것은 세 가지다. 이 ADR에서 다시 실행해 확인했다(`assemble('erp')` 결과로 비교).

| ID | 결함 | 원인(파일:줄) | 재현 | 결정 | 소유 |
|---|---|---|---|---|---|
| D1 | 프로필을 바꿔도 컴파일 출력이 같다 | `src/validate.mjs:61`에서 `:63`은 `profile`을 검증에만 쓴다. 컴파일러(`src/compiler.mjs`)와 스타일·렌더는 `b.profile`을 읽지 않고 manifest에도 남기지 않는다 | `profile`만 erp → finance로 바꾸면 HTML·CSS가 바이트까지 같다 | 2.6.0의 `profile`은 "검증 제약"으로 문서화하고 출력은 그대로 둔다(고정 해시). 2.7.0에서는 `materials` 필드가 출력의 유일한 근거다. 선택을 바꾸면 출력이 바뀌어야 하고, 그렇지 않으면 실패하는 테스트로 고정한다. 출력을 바꾸지 않는 필드는 진단과 서비스 설명(`explainDecisions`)에 "출력에 영향 없음"으로 드러낸다 | W5 |
| D2 | 2.6.0 문서에서 테마를 바꾸면 `palette` 값은 바뀌지만 색 토큰은 그대로다 | `src/tokens.mjs:39`에서 `:43`: `colorPalette`가 있으면 `palettes[b.palette]`를 읽지 않는다. 2.6.0의 선택지는 `static-kit` 하나다(`src/color-tokens.mjs:14`) | `theme`·`palette`를 바꿔도 `tokens`가 같다 | 2.7.0에서는 색을 `materials.palette` × `materials.subtokenSet`으로만 정한다. 스타일 맥락(테마)은 팔레트를 소유하지 않는다(§3). 그래서 "필드는 바뀌는데 출력은 그대로"인 상태가 생기지 않는다. 2.6.0 출력은 바꾸지 않되, `colorPalette`가 있을 때 무시되는 `palette`를 경고 진단(`PALETTE_IGNORED`)으로 알린다. 경고 추가가 고정 결과(검증 응답 스냅샷)를 바꾸는지 먼저 확인하고, 바꾼다면 2.7.0 게이트 뒤로 미룬다 | W5(게이트·진단), W1(팔레트·세트 공급) |
| D3 | REST·MCP 조회가 카탈로그 2.4.0만 지원하고, 재료 질의·조립·편집 연산이 API에 없다 | `apps/web/lib/api/versions.mjs:16`에서 `:18`: 조회 요청의 `catalogVersion`이 서버 기본값과 다르면 거부한다. 서비스는 이미 버전별 조회를 받는다(`src/service/query.mjs:56`, `:241`). `apps/web/lib/api/operations.mjs:3`은 `queryMaterials`·`listMaterials`·`getMaterial`·`assembleBlueprint`·`./edit`를 import하지 않는다 | `catalogVersion: "2.6.0"`으로 조회하면 `CATALOG_VERSION` 거부. MCP 도구 6개에 재료·조립·편집 없음 | 채널은 서비스가 받는 버전을 그대로 넘긴다(버전 목록을 채널이 따로 갖지 않는다는 ADR 0009 원칙 유지). 재료 질의(`listMaterials`, `getMaterial`, `queryMaterials`), 조립(`assembleBlueprint`, 이후 `assembleDesign`), 편집 연산(`./edit`의 연산 목록과 적용)을 REST와 MCP에 같은 서비스 함수로 노출한다. 서비스·REST·MCP 결과가 같은 바이트임을 채널 일관성 테스트로 고정한다 | W5 |

공통 원칙: Blueprint 필드는 "출력을 바꾸는 필드"와 "검증만 하는 필드"를 구분해 스키마 주석(`x-effect: output | validation`)과 manifest에 남긴다. 2.7.0에서 새로 넣는 필드는 모두 출력을 바꾸는 필드여야 한다.

## 결과와 남은 일

- 계약 코드는 `src/platform/`, 테스트는 `tests/platform-contract.test.mjs`와 `tests/platform-minimal.test.mjs`(11개)에 있다. 이 테스트를 포함한 전체 `npm test`(553개)를 통과한다. 기존 회귀 테스트는 고치지 않았다.
- 남은 일과 소유 경계는 [wbs.md](../platform/wbs.md)에 있다.
  - 색: 자체 팔레트 추가, `fixed` 규칙, 순차·발산 차트 색.
  - 타이포: 모듈러 스케일 역할 체계, 18×4 관계.
  - 패밀리: 컨트롤 10종, 구형 중복 정리.
  - 테마: 54개 이행.
  - 엔진: 페이지·슬롯 단계, 서비스·REST·MCP 공개, Blueprint 2.7.0, §8의 D1·D2·D3.
  - 웹: 탐색·조립 UI.

## 9. 개정 기록

계약을 바꿀 때마다 `PLATFORM_CONTRACT_VERSION`을 올리고 이 절에 적는다(0.x 동안은 minor에서도 깨지는 변경을 허용한다). 페이지 파이프라인의 동작은 [pages.md](../platform/pages.md)에 있다.

### 9.1 0.2.0: 축 값 재료, 금지 관계, 페이지 단계(조립 엔진 W5-a)

- **종류 추가**: `axis-value`(필드 `axis`, `value`, id `axis-value:<축>.<값>`). 스타일 축 15개의 모든 값 79개를 `src/platform/axes.mjs`가 등록한다. 셸·폭·밀도 같은 페이지 축 값이 `forbids` 관계의 대상이 되려면 레지스트리에 재료로 있어야 한다(관계 대상은 등록된 재료여야 한다).
- **기존 규칙 이행**:
  - 축 조합 금지 X01~X11은 술어이므로 두 축의 모든 값 쌍에 술어를 돌려 걸리는 쌍마다 `forbids` 관계를 만든다(18쌍). 이유는 기존 `why`에 규칙 id를 붙인 문장이고 `evidence`에 기존 출처를 둔다. 값 쌍마다 술어와 관계가 일치함을 시험이 확인한다.
  - 테마 금지는 그 테마에서 온 스타일 맥락이 축 값 재료로 선언하는 `forbids`다. 테마 원본(`themes[id].forbid`)을 읽는다. 스타일 맥락 기록이 모양 축만 옮겨도 mode·ornament·backdrop 금지가 빠지지 않는다. `createPlatform`이 스타일 맥락을 등록할 때 `withStyleForbids`로 관계를 더한다(멱등).
  - 패밀리 `shape`와 타이포 시스템의 서체 짝(`typography` 축 값)은 `materialAxisIds`로 축 값 재료 id가 되어 같은 관계에 걸린다. `recommend`는 그런 후보를 순위에서 빼고 `P_REL_FORBIDS`와 규칙의 설명을 `blocked`에 남긴다. 스타일 맥락 기록의 `forbid`가 가진 모양 금지는 옛 코드 `P_REL_STYLE_FORBID`로 그대로 보고하고, 같은 사실을 `P_REL_FORBIDS`로 한 번 더 적지 않는다. 기록에 없고 테마 원본에만 있는 금지(ornament·backdrop·mode 등)는 관계로만 보고된다.
  - 단일 페이지 파이프라인(`assemblePlatform`)의 `checkCombination`도 모드·밀도·패밀리 모양·서체 짝을 평가에 넣는다.
- **페이지 파이프라인**: `assemblePage`(`src/platform/page.mjs`). 목적·콘텐츠 → 계획 → 후보 탐색 → 호환 평가 → 코드 조립 → 검증 → 후보 비교의 7단계(§6의 7단계 파이프라인 위에 놓이고 대체하지 않는다). 레이아웃은 구형 템플릿 뼈대와 패턴 슬롯을 재사용하고, 마크업은 구형 노드 렌더러와 기반 컴포넌트 렌더러에서만 나온다.
- 기존 공개 API, Blueprint 2.1~2.6 출력, 고정 해시는 바뀌지 않았다.

### 9.2 0.3.0: 선택 필드, 고정 규칙, 추천 보강(W1·W2·W4 요청)

요청의 출처는 각 작업의 문서다(`docs/platform/color.md` §7, `typography.md` §8, `style-contexts.md` §6.1).

| 요청 | 결과 |
|---|---|
| W1-1 RoleRule `fixed` | 처리. `{fixed: '#RRGGBB' \| {from, step, mix?: {with, ratio}}, min?}`를 계약이 받는다. 계산은 0.4.0에서 `bindColor`가 한다(§9.4) |
| W1-2 세트 기록 필드 | 처리. `subtoken-set`에 선택 필드 `states`, `components`, `charts`(object). 없으면 결합 엔진의 기본 설계 |
| W1-3 `dashboard` 맥락 시험 | 처리. `tests/platform-minimal.test.mjs`가 세트 순위 전체를 고정하지 않는다(표준이 1순위, 틴트가 그 뒤). 세트의 `contexts` 갱신은 색 작업 몫 |
| W1-4 `index.mjs` 내보내기 | 0.4.0에서 처리(§9.4) |
| W2-1 추천이 적합성 표를 읽는다 | 처리. `recommend({…, fit: true})`가 `typeFit` 점수와 이유를 더한다. 기본은 끈다: `tests/platform-type.test.mjs`가 기존 순위(workspace 1순위 tech-erp)를 고정하고 있어서다. 그 시험의 기대 순위가 옮겨지면 기본을 켠다. 페이지 파이프라인은 켠다 |
| W2-2 오류 코드 | 처리. `P_TYPE_HANGUL_*`는 모두 `P_CHECK_TYPE_HANGUL`, `P_TYPE_HIERARCHY`는 그대로(`typeErrorCode`) |
| W2-3 서체 짝·역할 체계를 종류로 | 승격하지 않는다. 지금 이 둘을 가리키는 관계가 없고 `type-system` 기록의 문자열 참조로 충분하다. 관계 대상이 되어야 하는 요구가 생기면 종류로 올린다 |
| W2-5 기준선의 서체 짝 | 처리. 플랫폼 구간이 결합이 통과한 타이포 시스템의 고유 `(--kit-heading, --kit-font)` 쌍을 센다 |
| W4-1 재료 종류 5개(surface, motion, background, media, state-pattern) | 0.5.0에서 처리(§9.5) |
| W4-2 스타일 맥락 필드 | 처리. 선택 필드 `purpose`(string), `forbidCombos`(array), `tendencies`, `media`, `layout`(object) |
| W4-3 빈 결과 이유 | 처리. 맥락 필터로 후보가 없으면 `recommend`가 `blocked`에 `{id: null, blocked: [{code: 'P_RECOMMEND_NO_CANDIDATE', …}]}`를 남긴다 |
| W4-4 스타일 맥락을 앵커로 쓰는 동작 | 유지 |
| W4-5 페이지 단계가 선호를 읽는다 | 처리. 요청 > 스타일 맥락 `axisPreferences.shell·width·density`(앞 값 우선) > 원본 테마 기본값 > 패턴 기본값. `layout.navLimit`은 내비 항목 수 상한이다 |

필드 문법: 타입 끝의 `?`는 선택 필드다(없어도 null이어도 된다). 이전에는 `?`가 null 허용만 뜻했고 KIND_SPECS에는 쓰이지 않았다.

### 9.3 서비스 공개 초안(W5-b 예고)

`assembleDesign(request)`의 요청은 `assemblePage`와 같고 응답은 같은 봉투 안의 `{selected, candidates, blocked, comparison, plan, decisions}`다(`pages.md` §8). 서비스·REST·MCP 공개, Blueprint 2.7.0 게이트, §8의 D1·D2·D3은 다음 단계이고 이 개정은 그 어느 것도 하지 않았다.

### 9.4 0.4.0: 색 작업(W1)이 main에 들어온 뒤의 요청 1~4

`docs/platform/color.md` §7의 요청 1~4를 처리했다. 색 작업이 끝나서 `color.mjs`와 `subtoken-sets.mjs`의 필요한 줄은 조립 엔진 작업이 고쳤다.

| 요청 | 결과 |
|---|---|
| 1 `fixed` 규칙 | 처리. `bindColor`가 `fixed`를 계산한다: 리터럴이면 그 값, `{from, step}`이면 램프 단계, `mix`가 있으면 그 색과 비율로 섞은 값(`colorMix`). 보정하지 않는다(고정값은 대비에 못 미쳐도 바뀌지 않는다). `min`은 보고만 하고 못 미치면 쌍이 `ok:false`다. **표준 세트 등의 `surface`·`canvas`는 바꾸지 않았다**: 값을 바꾸면 색 토큰 집합 전체와 W1·W4 시험이 고정한 출력이 움직이므로 세트를 갱신하는 일은 색 작업의 결정으로 남긴다. 규칙은 이제 쓸 수 있다 |
| 2 세트 기록 필드 | 처리. `states`(`hover`·`active` 0~1 비율, `control: {border: 역할, min}`), `components`(`table: {head, hover, selected}` 면 역할), `charts`(`categorical`·`sequential`·`diverging`)를 기록 필드로 올렸다. 7개 세트 기록이 `SUBTOKEN_SET_DESIGNS`의 원본 표를 싣고, `bindColor`는 기록에서 읽는다(`designOf`, 없는 부분은 `DEFAULT_DESIGN`). 필드 모양은 `P_SUBTOKEN_DESIGN`으로 검사한다 |
| 3 `dashboard` 맥락 | 처리. 시험을 갱신(0.3.0)했고 `high-contrast`와 `data-dense`의 `contexts`에 `dashboard`를 더했다. 기본 순위는 표준이 1순위이고 틴트 다음이 데이터 밀집 등으로 바뀐다. 이 때문에 스타일 작업의 `sport` 선택 `['commerce-vivid', 'high-contrast']`가 dashboard에서 표준과 동점이 되어(`tests/platform-style-contexts.test.mjs`의 id 순 동점 금지) 두 번째 선택을 `standard`로 바꾸고 `docs/platform/style-contexts.md` 표를 다시 만들었다 |
| 4 내보내기 | 처리. `src/platform/index.mjs`가 `colorMatrix`, `proposeSubtokenSets`, `assignSeeds`, `paletteRamps`, `SUBTOKEN_SET_DESIGNS`, `DEFAULT_DESIGN`, `designOf`를 내보낸다 |

### 9.5 0.5.0: 스타일 재료 5종을 레지스트리로(W4 요청 1~4)

`docs/platform/style-contexts.md` §6.1의 요청을 처리했다. 요청 2·3·4는 0.3.0에서 이미 처리했고(§9.2) 이번에 같은 요청의 나머지인 1을 하면서 4(페이지 단계가 스타일 맥락을 읽는다)를 재료의 사용까지 넓혔다.

| 요청 | 결과 |
|---|---|
| 1 재료 종류 5개 | 처리. `PLATFORM_KINDS`에 `surface`, `motion`, `background`, `media`, `state-pattern`을 더하고 `KIND_SPECS`에 스타일 작업의 필드 명세를 그대로 옮겼다. `createPlatform`이 5종 재료 전부를 레지스트리에 등록한다. 종류별 의미 검사(반경·깊이 이름, 상태·배치 이름 등)는 `createPlatformRegistry({validators})`로 등록할 때 돈다 |
| 1 검사·순위·조립을 레지스트리 위로 | 처리. `src/platform/style-materials.mjs`의 `checkStyleMaterials(registry)`, `rankStyleMaterials(registry, styleContext, request)`, `assembleStyleMaterials(registry, request)`가 구현이다. 순위는 `recommend`를 부른다: 스타일 맥락의 축 선호(배경은 backdrop 가중 ×2), 쓰는 값(`uses`) 금지, 축 금지(X01 등)가 한 곳에서 계산된다. 데이터 파일의 같은 이름 함수는 이 구현을 부르는 감싸개이고 시그니처와 결과가 같다 |
| 2 스타일 맥락 필드 | 0.3.0에서 처리(선택 필드 `purpose`, `forbidCombos`, `tendencies`, `media`, `layout`) |
| 3 빈 결과 이유 | 0.3.0에서 처리(`P_RECOMMEND_NO_CANDIDATE`). 스타일 재료 순위도 같은 문장을 쓴다 |
| 4 페이지 단계가 읽는다 | 0.3.0에서 `axisPreferences.shell·width·density`와 `layout.navLimit`을 읽게 했고, 0.5.0에서 **스타일 재료가 실제 페이지 출력에 닿게 했다**(아래) |

**페이지 출력에 닿는 방식**(`assemblePage`, `docs/platform/pages.md` §10):

- 한 요청에 표면·모션·배경·미디어를 하나씩 고른다(요청한 id는 검사해 그대로 쓰고, 없으면 추천 순위에 페이지 축과 같은 축 값을 구현하는 재료를 앞세운다). 모든 후보가 같은 선택을 쓴다.
- 표면은 구형 부품이 읽는 변수(`--kit-radius`, `--kit-card-border`, `--kit-shadow`, `--kit-shadow-hover`)를 `[data-surface]` 범위에서 바꾼다. 모션·배경·미디어는 각자의 CSS를 쇼 셸 범위로 붙이고(배경은 장식 요소 포함, 미디어는 아이콘 선 굵기와 모양), 셸에 `data-surface`·`data-motion`·`data-bg`·`data-media`를 단다.
- 상태 패턴은 요소로 들어간다: 표·목록·차트의 `state`(empty·loading·error, 데이터가 비면 empty)는 그 자리를 상태 패턴으로 바꾸고, `content.status`는 페이지 머리 바로 아래(랜딩은 히어로 뒤)에 안내를 둔다. 자리에 맞는 배치(자리: block·inline, 안내: banner·toast·block)에서 고르며 쓰인 패턴의 CSS만 나간다.
- 선택한 재료의 대비 쌍을 결합된 색으로 검사하고(`quality.contrast`), 재료가 읽는 변수가 정의되어 있는지(`P_TOKEN_MISSING`)도 후보마다 본다. 선택한 재료의 축 값은 관계 평가에 들어가 표면 × 배경 같은 조합이 축 금지(X04 등)에 걸린다.
- 상태 패턴의 `axes.density`는 어울리는 밀도의 힌트라 축 금지를 걸지 않는다(순위에서만 읽는다).
- 기준선의 플랫폼 구간이 재료마다 그 재료를 명시한 요청을 실제로 조립해, 검증된 재료가 출력에 나타나는지 센다(`distinct.styleMaterials`).

