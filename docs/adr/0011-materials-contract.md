# ADR 0011: 재료 계약·레지스트리와 카탈로그 2.6.0 전략

- 상태: 채택 및 확장(계약·레지스트리, 2.6.0 계층 색 토큰)
- 날짜: 2026-11-22
- 관련: ADR 0001, 0009, 0010; `docs/materials/audit.md`

## 결정

엔진이 조립하는 모든 디자인 재료는 `src/materials/contract.mjs`의 공통 기록 하나를 가진다. 종류별 값은 `ext`에 둔다. 재료는 `createRegistry().register()`로 등록할 때 검사되고, 실패한 재료는 등록되지 않는다. 기존 카탈로그는 `src/materials/adapters.mjs`가 읽기 전용으로 옮긴다. `catalogRegistry()`가 그 결과다.

| 파일 | 역할 |
|---|---|
| `src/materials/contract.mjs` | 공통 필드(`FIELDS`), 종류(`BUILTIN_KINDS`, `defineKind`), 분류·맥락·품질·반응형·라이선스 enum, `combinationsOf`, `isCompletePreset`, `defineMaterial` |
| `src/materials/validate.mjs` | `validateMaterial(m, kind)`: 재료 한 장. `validateGraph(byId)`: 의존·부모·자식 참조 |
| `src/materials/registry.mjs` | `register`·`get`·`search`·`filter({kind, category, context, minQuality, preset, tag})`·`counts()`·`check()`·`addKind` |
| `src/materials/adapters.mjs` | 부품 57(노드 55 + Select·Table), 축 15, 서체 프리셋 18, 테마 54, 레거시 팔레트 427, 페이지 유형 16, 템플릿 85, 레시피 3, 배치 원형 6, 아이콘 87, 2.6.0 색 토큰 257, 차트 프리셋 8 |
| `src/materials/index.mjs` | 공개 진입점, `catalogRegistry()` |
| `tests/materials-registry.test.mjs` | 계약·레지스트리·수량·고정 출력 검사 |

세 수량은 따로 센다. **재료 수**는 등록된 기록 수다. **속성 조합 수**는 재료마다 `variants` 값 개수를 곱해 더한 값이다. **완성 프리셋 수**는 프리셋 가능 종류이면서 `preset: true`이고, 모든 속성에 기본값이 있고, 품질이 implemented 이상인 재료 수다. 조합은 프리셋으로 세지 않는다. 부품 종류는 프리셋이 될 수 없고 검증기가 `M_PRESET`으로 거부한다.

품질 주장은 근거와 묶는다. `verified`는 `tests/<파일>:<줄>` 근거가 필요하고, 그 줄이 실제 `test(`인지 테스트가 확인한다. `implemented` 이상은 `render` 진입점이 필요하다. 외부 출처는 URL과 판정 문구가 필요하다.

## 카탈로그 버전 전략

- 첫 단계는 Blueprint 문법·검증·렌더러를 바꾸지 않았고 컴파일 경로(`compiler`, `validate`, `render`, `styles`, `service`, `edit`)는 `src/materials/`를 import하지 않았다. 2.6.0 조립 연결(`docs/materials/audit.md` §7) 뒤의 규칙: 컴파일 경로가 읽는 재료 모듈은 렌더·스타일 코드를 재사용하는 `select`·`table`·`typography` 세 파일뿐이고, 레지스트리·어댑터는 `src/service/materials.mjs`(재료 읽기 질의)만 읽는다. `tests/materials-registry.test.mjs`와 `tests/wire-260.test.mjs`가 import를 검사한다. 그래서 `VERSION_ORDER`, `ACCEPTED_CATALOG_VERSIONS`, `src/service/versions.mjs`도 바꾸지 않았다. 2.1.0~2.5.0 출력은 그대로다. 2.4.0은 `docs/evidence/expression/legacy-2-4-*.json`, 2.5.0은 이번에 고정한 `docs/evidence/materials/pinned-2-5-*.json`(85개 템플릿)으로 확인한다.
- `MATERIAL_CATALOG_VERSION = '2.6.0'`은 이제 활성화된 **opt-in** 버전이다. `colorPalette: 'static-kit'`은 `since: 2.6.0`의 닫힌 필드이며, 기본 생성 버전 `CATALOG_VERSION`은 2.4.0으로 유지한다.
- 2.6.0 색 토큰 구현은 네 층(primitive → semantic → state → component)의 참조 그래프와 자체 시드·명도 램프를 사용한다. CSS 사용처와 라이트·다크·auto 대비 검사는 [색 토큰 읽기 API](../materials/color-tokens.md)에 기록한다.
- 2.5.0 이하 Blueprint가 `colorPalette`를 쓰면 `VERSION_FIELD`로 거부한다. 미등록 팔레트 ID는 스키마의 닫힌 enum에서 거부하며 호출자 색값 입력은 없다.
- `src/catalog/expression.mjs`의 버전 순서와 `ACCEPTED_CATALOG_VERSIONS`, 스키마, 마이그레이션, `atLeast(..., '2.6.0')` CSS·토큰 게이트를 함께 갱신했다. 변경하지 않은 기본 Blueprint와 2.4.0·2.5.0 고정 산출물은 회귀 테스트로 보존한다.
- `checkExpectedVersion`(`src/service/versions.mjs`)은 `ACCEPTED_CATALOG_VERSIONS`를 읽으므로 별도 수정이 필요 없다. 서비스 계약 버전은 응답 모양이 바뀔 때만 올린다.
- 이전 경로: `migrateBlueprint(doc, '2.6.0')` / `kit migrate --to 2.6.0`은 catalogVersion만 올린다(ADR 0010과 같다). 내려 쓰지 않는다. 재료 id로 고른 값은 Blueprint의 기존 축·노드 값으로 풀려 저장된다. 재료 id를 Blueprint에 직접 넣는 문법은 2.6.0에서 따로 결정한다.
- 재료 자체의 버전(`material.version`)은 semver다. 출력이 바뀌면 minor 이상을 올리고, 출력이 바뀌는 변경은 새 카탈로그 버전 게이트 뒤에만 둔다.

## 후속 재료 작업자가 지킬 것

- 새 재료는 `defineMaterial({...})`로 만들고, 공통 필드를 빼지 않는다. 값이 없으면 null이나 빈 값으로 둔다.
- 새 종류는 `defineKind({id, label, categories, ext, presetCapable})`와 `registry.addKind`로 더한다. `FIELDS`를 바꾸려면 `MATERIAL_CONTRACT_VERSION`을 올리고 이 ADR을 개정한다.
- 미리 만든 종류 중 `color-token`에는 이번에 257개가 등록됐다. `chart-preset`에는 차트 프리셋 8개가 등록됐고 `pattern`에는 레이아웃 패턴 11개가 아래 `designRegistry()`에 등록된다.
- 디자인 프로파일(`profile` 종류)과 레이아웃 패턴(`pattern` 재료 11개)은 `src/profiles/registry.mjs`의 `designRegistry()`에 등록한다. `catalogRegistry()`의 수량은 바꾸지 않는다. Blueprint의 `profile` 필드(2.6.0)와 조립은 [디자인 프로파일](../materials/profiles.md)에 적는다.
- 등록 후 `registry.check()`가 비어야 한다. `catalogRegistry()`는 비지 않으면 예외를 낸다.
- 품질을 `verified`로 올릴 때는 그 재료를 실패시킬 수 있는 테스트의 file:line을 적는다.
- 외부 자료는 새로 수집하지 않는다. 기존 팔레트 판정은 `docs/materials/audit.md` §3을 따른다.

## 결과

재료 1,037개, 속성 조합 764,002개, 완성 프리셋 169개(서체 18 + 역할형 서체 4 + 테마 54 + 템플릿 85 + 차트 8)다. 이 중 색 토큰은 257개이며 실행 시점 값은 `catalogRegistry().counts()`가 정본이다. 기존 공개 계약 `./service`와 `./edit`의 응답은 바뀌지 않았다. 색 토큰은 `./color-tokens`와 `./materials` 읽기 API로 공개한다. `src/materials/`는 Core 경계 검사(`tests/core-boundary.test.mjs`)를 받는다.

## 부록: 타이포그래피 재료와 기존 엔진

역할형 타이포그래피 재료(`type-role-preset` 4종, `src/materials/typography.mjs`)는 `catalogRegistry()`에 서체 프리셋 18종(`type-preset`)과 같이 등록된다. 기존 엔진(`src/typography.mjs`)과 값을 두 벌 들지 않기 위해 아래처럼 나눈다.

| 값 | 어디서 오나 |
|---|---|
| 서체 스택 | `STACKS`만 쓴다. 재료 파일에 서체 문자열이 없다(`tests/material-type.test.mjs`가 검사). 프리셋마다 `engine`으로 `TYPE_R2`(리비전 2) 프리셋 하나를 고른다: erp→tech, dashboard→sans, document→editorial, marketing→geometric. |
| display·heading 자간과 행간, label 자간, body 행간 | 고른 엔진 프리셋의 `track`·`lh` |
| body·label·caption의 최소 px | 엔진의 고정 크기(본문 px, 본문×.8125, 본문×.75). `clamp()`의 최솟값이다. |
| Hangul 한계 | `HANGUL`을 그대로 읽는다: 행간 하한(display 1.2, heading 1.3), 본문 행간 1.55~1.8, label 자간 상한 .06, display·heading 최대 px(80·40), 세리프 한글 굵기 700 |

재료에만 남는 값과 이유는 다음과 같다.

- 화면 폭에 따른 `clamp()` 기울기, 굵기: 엔진은 모듈러 스케일로 크기를 계산하고 맥락별(ERP·문서·마케팅) 기울기를 갖지 않는다.
- `numeric`·`code` 역할: 엔진에는 같은 이름의 역할이 없다. numeric의 촘촘한 자간은 엔진이 숫자·가격·지표를 한글 자간 규칙에서 빼는 것(`NUMERIC_RULE`)과 같은 이유다.
- 밀도 계수와 좁은 화면 계수: 엔진 서체는 밀도로 크기가 변하지 않는다. 재료의 계수는 display·heading·numeric·code에만 적용한다. body·label·caption은 엔진이 px로 고정한 바닥이라 계수를 1로 둔다. 계수를 곱한 행간은 `max()`·`clamp()`로 엔진의 한글 한계 안에 머무른다.
- 엔진 `ROLES`의 이름(`title`, `app`, `sub`…)은 가져오지 않았다. 재료 역할 7개(display·heading·body·label·caption·numeric·code)는 부품이 쓰는 이름이고 엔진 역할로의 대응은 일대일이 아니다. 대응을 정의하는 일은 Blueprint 연결 단계로 미룬다.

### 컨트롤 크기와 타이포그래피

프리셋마다 `controls`가 크기 4단(compact·small·medium·large)별로 높이·좌우 패딩·간격·라벨 역할·아이콘 크기를 가진다. 크기 이름은 컨트롤 크기이고 프리셋의 `density`(compact·relaxed)와 다르다. 값은 `src/spacing.mjs`의 `SPACE`에서 풀린다: medium 높이는 그 밀도의 `control` 토큰(compact 40, comfortable 44)이고 나머지는 −12·−8·+8px, 좌우 패딩은 `near`·`item`·`inset`·`insetL`이다. `controlViolations(preset)`이 아래를 검사하고 `registerMaterialType`은 위반이 있으면 등록하지 않는다.

- `CT_LINE_BOX` 라벨의 줄 높이(최대 글자 크기 × 밀도 계수를 곱하고 엔진 한계로 묶은 행간) + 위아래 4px씩이 컨트롤 높이를 넘지 않는다.
- `CT_ICON_RATIO`·`CT_ICON_FIT` 아이콘은 라벨 최대 글자 크기의 1~1.5배이고 위아래 4px 여백과 함께 높이 안에 들어간다.
- `CT_ORDER` 크기가 커질 때 높이는 늘고 좌우 패딩·아이콘·라벨 글자는 줄지 않는다.
- `CT_GRID` 높이와 좌우 패딩은 4px 격자다. `CT_MEDIUM` medium 높이는 `SPACE` control 토큰과 같다. `CT_ROLE` 라벨 역할은 label 또는 body다. `CT_MISSING` 네 크기가 모두 있다.

컨트롤 크기는 기존 `.kit-button`(`min-height: var(--kit-control)`, 좌우 24px)을 바꾸지 않는다. 재료는 출력 경로 밖에 있고, 부품 크기 축(sm/md/lg)과의 연결은 Blueprint 컴파일러 단계에서 정한다.

## 부록: 2.6.0 조립 연결(재료를 Blueprint로 고르기)

- Select·Table은 `NODE_SPEC_EXTENSIONS['2.6.0']`의 노드(`select-control`, `data-table`)다. 기본 `nodeSpecs`는 바꾸지 않는다(snapshot 바이트 보존). 노드의 필드 값은 재료 계약과 같아야 하고 `tests/wire-260.test.mjs`가 비교한다.
- 역할형 타이포그래피는 최상위 `typeRoles`(erp·dashboard·document·marketing, `since: 2.6.0`)로 고른다. 위 부록이 미뤘던 엔진 역할 대응은 `ROLE_TYPE_MAP`이다: display→`title`·`app`, heading→`heading`(과 제목 서체·굵기), body→`body`·행간·본문 서체, label·caption→같은 이름, numeric→`stat`·`price`. 값은 `:root`의 `--kit-t-*`를 덮어쓰고 floor 역할(body·label·caption)에는 밀도 계수를 곱하지 않는다.
- 스키마는 기존 `$defs`를 넓히지 않고 `x-extensions['2.6.0']` 주석에 확장 정의를 둔다. 검증기는 같은 확장 표를 `nodeSpecAt(type, catalogVersion)`으로 직접 읽는다.

