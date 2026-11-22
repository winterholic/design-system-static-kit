# 조립 플랫폼 병렬 작업 분할(WBS)

기준은 [ADR 0012](../adr/0012-assembly-platform.md)의 계약과 `src/platform/` 스켈레톤, 근거는 [감사 2026-11](audit-2026-11.md)이다.

작업은 6개다. **같은 파일을 두 작업이 고치지 않는다.** 아래 "소유 파일"에 없는 파일은 읽기만 한다. 소유하지 않은 파일을 바꿔야 하면 그 파일의 소유 작업에 요청한다.

## 공통 규칙

- **불변 조건**
  - 기존 공개 API(`./service`, `./edit`), Blueprint 2.1.0에서 2.6.0까지의 문법과 컴파일 출력, 고정 해시, `site/v1/catalog.json` 바이트를 바꾸지 않는다.
  - 기존 회귀 테스트를 지우거나 약화하지 않는다.
- **권리**: Coolors 팔레트 427개를 신규 노출, 내보내기, 수집하지 않는다. 플랫폼 레지스트리는 `license: internal | MIT`만 받는다.
- **생성 방식**: AI가 HTML이나 CSS를 생성하는 조립을 넣지 않는다. 버전 태그, npm 발행, 정식 릴리스를 하지 않는다.
- **새 재료의 품질 등급**
  - `quality.status: verified`는 그 재료를 실패시킬 수 있는 테스트 줄(`tests/<file>.test.mjs:<line>`)이 있을 때만 붙인다.
  - 새로 쓴 테스트는 버그를 심어 실패하는 것을 한 번 확인한다(RED). 그다음 원래 코드로 통과하는지 확인한다(GREEN).
- **성과 보고**: 등록 수량이나 속성 곱으로 보고하지 않는다. 플랫폼 경로의 "실제 조립 가능 조합"과 "검증된 조합"으로 보고한다. 이 수치는 W5가 `scripts/platform/baseline.mjs`에 플랫폼 구간을 더하면 측정할 수 있다.
  - `registered.family`와 `distinct.families`는 레지스트리의 시각 패밀리 수다. `verifiedFamilies`는 품질 검증된 대표 페이지 선택에 실제 나온 고유 시각 패밀리 수다. `registered.purposeFamily`는 목적 패밀리 레지스트리 수이고, `distinct.purposeFamilies`는 대표 페이지 Blueprint의 `materials.purposes`에 실제 나온 고유 목적 패밀리만 센다. 등록 목적 패밀리 전체를 기본 페이지 사용 수로 해석하지 않는다.
  - 목적 패밀리는 기존 119,610 조립 가능 조합의 곱 축에 추가하지 않는다. 대표 페이지 검증은 기존 색·타이포·시각 패밀리 제약을 그대로 통과해야 한다.
  - 모션 대표 표본은 목적 패턴 × 등록 모션을 한 번 시도하고 light/dark 중 하나라도 통과하면 검증으로 센다. 두 모드가 모두 거부되면 `rejectedCases`에 이유를 기록한다. 2026-11 기준 `motion:expressive`는 `dashboard-grid`, `erp-workspace`에서 X11(`motion.lively × elevation.flat`)로 막혀 19개 중 17개가 검증됐다. X11 규칙은 완화하지 않는다.
- **공통 검증 명령**(모든 작업이 완료 전에 돌린다)

  ```sh
  npm test
  node scripts/platform/baseline.mjs --check
  ```

  - 기존 경로를 건드리지 않았다면 baseline은 `BASELINE MATCH`가 나와야 한다.
  - 다르면 의도한 변경인지 확인한다. 의도한 변경이면 W5에 갱신을 요청한다.
  - `docs/evidence/platform/baseline.json`은 W5만 커밋한다.
- **검사 등록 방식**: 계산 관계(check)는 작업마다 자기 파일의 `*_CHECKS` 배열로 소유한다. `createPlatform`(`src/platform/examples/minimal.mjs`)이 그 배열들을 읽는다. 따라서 새 검사를 더하려고 W5 파일을 고칠 필요가 없다.

## 의존 순서

```text
0단계(완료)  계약·스켈레톤·감사  ── 이 커밋
1단계(병렬)  W1 색 · W2 타이포 · W3 컴포넌트 패밀리 · W4 테마·기타 · W5-a 엔진(페이지 단계·서비스 공개)
2단계        W5-b Blueprint 2.7.0 게이트와 REST·MCP 공개 (W1~W3 각각 1차 완료 후)
3단계        W6 웹 개편 (W5-b의 assembleDesign·재료 질의 함수 공개 후. 화면 설계·목업은 1단계부터 가능)
```

- **계약 변경**: `src/platform/contract.mjs`를 바꾸는 일(예: W1의 RoleRule `fixed` 규칙, W3의 패밀리 필드 추가)은 W5가 한다. 요청한 작업은 그 변경이 main에 들어간 뒤에 이어 간다.
- **0.x 동안의 버전 규칙**: 계약을 바꿀 때마다 `PLATFORM_CONTRACT_VERSION`을 올리고 ADR 0012를 개정한다.

## W1 색상

| 항목 | 내용 |
|---|---|
| 목표 | 자체 팔레트를 여러 개 만들고, 서브토큰 세트로 다대다 결합한다. 색 다양성을 회복한다(현재 조립 경로는 light·dark 토큰 집합이 각 1개) |
| 소유 파일 | `src/platform/color.mjs`, `src/platform/data/palettes.mjs`, `src/platform/data/subtoken-sets.mjs`, `src/color-tokens.mjs`, `tests/platform-color*.test.mjs`, `tests/color-tokens.test.mjs`(추가만), `docs/platform/color.md` |
| 할 일 | ⓪ ADR 0012 §8 D2의 2.7.0 쪽 해법은 여러 팔레트 × 세트가 있어야 의미가 있다. W5의 `materials.palette` 게이트가 고를 재료를 공급한다. ① 권리가 확인된 자체 팔레트를 추가한다(원색 시드, 출처 기록). ② 서브토큰 세트를 최소 3종으로 늘린다(standard, tinted, 고대비·어두운 표면 등). 각 세트가 2개 이상의 팔레트에서 대비 게이트를 통과해야 한다. ③ RoleRule `fixed`(흰 표면 등)가 필요하면 W5에 계약 변경을 요청한다. ④ 순차·발산 차트 색 역할을 설계한다(감사 2.1 F). ⑤ 구형 `resolveTokens`의 자동 분배를 `subtoken-set:derived`로 옮길지 결정한다. 옮기더라도 자체 팔레트에만 쓴다 |
| 완료 기준 | 팔레트 수 × 세트 수 중 계산 관계 `palette-subtoken`을 통과하는 쌍의 수와 실패 쌍의 이유를 표로 남긴다. 통과 쌍이 서로 다른 토큰 집합을 낸다는 것을 테스트로 고정한다. 기존 `src/color-tokens.mjs`의 static-kit 출력은 바이트 그대로다 |
| 검증 | `node --test tests/platform-color*.test.mjs tests/color-tokens.test.mjs`, 공통 명령 |

## W2 타이포그래피

| 항목 | 내용 |
|---|---|
| 목표 | 서체 짝 × 역할 크기 체계로 된 독립 타이포 시스템을 만든다. 서체 다양성을 회복한다(현재 조립 경로의 실제 서체 짝은 3개) |
| 소유 파일 | `src/platform/type.mjs`, `src/platform/data/type-systems.mjs`, `tests/platform-type*.test.mjs`, `docs/platform/typography.md`. `src/typography.mjs`와 `src/materials/typography.mjs`는 **읽기만** 한다(2.1에서 2.6 출력 고정) |
| 할 일 | ① 구형 18개 프리셋의 모듈러 스케일을 역할 체계 하나(`role-scale:modular`)로 옮긴다. 기록 종류를 새로 둘지는 W5와 정한다. ② 맥락별 이름 붙인 타이포 시스템을 등록한다(업무, 문서, 마케팅, 모바일 각 2개 이상). ③ 서체 짝 × 역할 체계 관계(`prefers`·`avoids`)와 한글 한도 검사를 넓힌다(세리프 굵기, 자간 하한, 행간 하한). ④ 숫자 정렬과 코드 역할을 정리한다 |
| 완료 기준 | 등록한 타이포 시스템끼리 실제 `--kit-heading`·`--kit-font` 쌍이 서로 다르다는 것을 테스트로 고정한다. 한글 한도에 걸리는 조합은 `P_CHECK_TYPE_HANGUL`로 거부한다. 2.6.0 `typeRoles` 출력은 바뀌지 않는다 |
| 검증 | `node --test tests/platform-type*.test.mjs tests/typography.test.mjs tests/material-type.test.mjs`, 공통 명령 |

## W3 컴포넌트 패밀리

| 항목 | 내용 |
|---|---|
| 목표 | 2.6.0 컨트롤 10종을 기반 컴포넌트로 등록하고, 여러 시각 언어의 디자인 패밀리를 만든다 |
| 소유 파일 | `src/platform/family.mjs`, `src/platform/data/base-components.mjs`, `src/platform/data/families.mjs`, `src/materials/{button,input,card,navigation,modal,tabs,tooltip,feedback,select,table,control-kit,control-size}.mjs`, `tests/platform-family*.test.mjs`, `tests/material-components.test.mjs`(추가만), `docs/platform/families.md` |
| 할 일 | ① Button, Input, Navigation, Modal, Tabs, Tooltip, Feedback, Select, Table을 `BASE_COMPONENTS`와 `BASE_IMPLEMENTATIONS`에 등록한다. Select·Table의 계약을 `defineContract` 방식으로 맞추는 일도 포함한다(감사 2.4 E). ② 패밀리를 3개 이상 만든다(예: quiet, soft, bold). 각 패밀리가 기반 컴포넌트를 4개 이상 덮어야 한다. ③ 구형 노드 variant → 패밀리 preset 대응표를 만든다(card, table, tabs, notice, nav). ④ 컴포넌트 사이 의존을 정리한다(Card의 footer actions → Button 구성원 `requires`) |
| 완료 기준 | 패밀리 × 기반 컴포넌트마다 `family-member` 검사를 통과한다. 열린 축의 허용 조합 수를 문서에 남긴다. 각 패밀리로 렌더한 출력에서 `P_TOKEN_MISSING`과 `P_CHECK_CONTRAST`가 0건이다. 기존 컨트롤 출력과 2.6.0 고정 결과는 바이트 그대로다 |
| 검증 | `node --test tests/platform-family*.test.mjs tests/material-components.test.mjs tests/wire-260.test.mjs`, `npm run test:browser`(UI 동작이 바뀐 경우), 공통 명령 |

## W4 테마·기타 재료

| 항목 | 내용 |
|---|---|
| 목표 | 테마 54개를 스타일 맥락으로 옮기고, 차트와 아이콘을 플랫폼 재료로 잇는다 |
| 소유 파일 | `src/platform/data/style-contexts.mjs`, `src/platform/data/charts.mjs`(신규), `src/materials/chart-presets.mjs`, `src/render/chart.mjs`, `src/render/chart-legacy.mjs`, `src/render/chart-presets.mjs`, `tests/platform-style*.test.mjs`, `tests/platform-chart*.test.mjs`, `tests/chart-presets*.test.mjs`(추가만), `docs/platform/style-contexts.md` |
| 할 일 | ① 54개 테마 → `style-context:*`. 각 테마의 페이지 유형 맥락을 정한다. 팔레트(Coolors)는 옮기지 않는다. ② 스타일 맥락 → 팔레트·서브토큰·타이포·패밀리 `prefers` 관계를 정한다(대상 재료는 W1에서 W3의 id를 참조. 대상이 아직 없으면 그 관계는 W1에서 W3이 등록한 뒤에 넣는다). ③ 차트 프리셋 29개의 맥락과 형태 관계를 정리한다(현재 프로파일에 적힌 7개 중 5개는 조립되지 않음). ④ `niceMax` 중복을 정리하되 렌더 출력은 바꾸지 않는다 |
| 완료 기준 | 54개 모두 `styleContextFromTheme`으로 등록된다. 각 스타일 맥락에서 `recommend()`가 결과를 하나 이상 내거나, 막힌 이유를 낸다. 2.4.0에서 2.6.0의 차트 출력 해시는 그대로다 |
| 검증 | `node --test tests/platform-style*.test.mjs tests/platform-chart*.test.mjs tests/chart-presets.test.mjs tests/chart-presets-distinct.test.mjs`, 공통 명령 |

## W5 조립 엔진 + REST/MCP

| 항목 | 내용 |
|---|---|
| 목표 | 파이프라인을 페이지 단위로 넓히고, 서비스 함수 하나로 공개한다. REST·MCP·Studio가 같은 조립을 쓰게 한다 |
| 소유 파일 | `src/platform/contract.mjs`, `src/platform/registry.mjs`, `src/platform/relations.mjs`, `src/platform/recommend.mjs`, `src/platform/pipeline.mjs`, `src/platform/page.mjs`(신규), `src/platform/page-content.mjs`(신규), `src/platform/axes.mjs`(신규), `src/platform/index.mjs`, `src/platform/examples/**`, `src/service/assemble-design.mjs`(신규), `src/service/index.mjs`(내보내기 한 줄 추가), `src/service/envelope.mjs`(CONTRACT_VERSION), `src/catalog/expression.mjs`·`src/catalog/index.mjs`·`src/validate.mjs`(2.7.0 게이트만), `scripts/platform/**`, `docs/evidence/platform/**`, `tests/platform-contract.test.mjs`, `tests/platform-minimal.test.mjs`, `tests/platform-pipeline*.test.mjs`(`tests/platform-pipeline-fixtures.mjs` 시험 재료 포함), `tests/platform-service*.test.mjs`, `apps/web/lib/api/**`, `apps/web/app/api/**`, `docs/adr/0012-assembly-platform.md`, `docs/platform/audit-*.md`, `docs/platform/wbs.md` |
| 할 일(W5-a, 1단계) | **진행**: ①~④ 완료([pages.md](pages.md), ADR 0012 §9.1). 계약 0.3.0, W1·W2·W4 요청의 처리 결과는 ADR §9.2. ⑨~⑪(웹 감사 결함)은 이 단계에서 하지 않았다. ① 페이지 단계(`page.mjs`): 레이아웃 패턴·슬롯에 컴포넌트를 배치한다. 구형 템플릿 뼈대를 재사용한다. ② 기존 규칙을 관계로 옮긴다(축 금지 X01 등, 테마 forbid → `forbids`). ③ 요청 키로 셸·폭·밀도를 받는다. ④ baseline에 플랫폼 구간을 더한다(실제 조립 가능, 검증된 조합, 고유 색·서체 짝 수) |
| 할 일(W5-a, 웹 감사 결함) | ⑨ **D1**(ADR 0012 §8): 2.6.0 `profile`은 출력에 영향이 없다는 것을 진단·`explainDecisions`·스키마 주석에 드러낸다(출력은 그대로). 2.7.0 `materials` 선택이 바뀌면 출력이 바뀌는지 실패하는 테스트로 고정한다. ⑩ **D2**: 2.6.0 문서에서 `colorPalette` 때문에 무시되는 `palette`에 `PALETTE_IGNORED` 경고를 낸다. 이때 검증 응답 고정 결과가 바뀌면 2.7.0 게이트 뒤로 미룬다. 2.7.0에서는 색을 `materials.palette` × `materials.subtokenSet`으로만 정한다. ⑪ **D3**: `apps/web/lib/api/versions.mjs:16`에서 `:18`의 조회 버전 고정을 풀어 서비스가 받는 버전을 그대로 넘긴다. `listMaterials`·`getMaterial`·`queryMaterials`, `assembleBlueprint`, `./edit` 연산을 REST·MCP에 노출한다(OpenAPI 포함) |
| 할 일(W5-b, 2단계) | **완료**: 계약 0.6.0, 서비스 1.2.0, Blueprint 2.7.0 opt-in(ADR 0012 §9.6). D1~D3 처리. 남은 것: ⑧ `assembleBlueprint`를 플랫폼 어댑터로 옮기는 일은 하지 않았다(고정 테스트가 있을 때만). 원래 항목: ⑤ `assembleDesign(request)` 서비스 함수(같은 봉투). 서비스 `CONTRACT_VERSION`의 minor를 올린다. ⑥ `POST /api/v1/assemble`, MCP `assemble_design`(+OpenAPI). 채널 일관성 테스트(`tests/channel-*.test.mjs` 방식)를 둔다. ⑦ Blueprint 2.7.0 opt-in `materials` 필드와 `VERSION_FIELD` 거부 ⑧ `assembleBlueprint`를 플랫폼 어댑터로 옮기는 일은 기존 결과 바이트가 같다는 고정 테스트가 있을 때만 한다 |
| 완료 기준 | 같은 요청에 대해 서비스, REST, MCP의 결과 바이트가 같다. 2.6.0 이하 고정 해시가 그대로다. D1: 2.7.0에서 `materials` 값만 바꾼 두 문서의 출력이 다르다. D2: 2.6.0 문서의 무시되는 `palette`가 경고로 보인다(또는 2.7.0으로 미룬 이유를 기록). D3: `catalogVersion: "2.6.0"` 조회가 REST·MCP에서 서비스와 같은 결과를 내고, 재료 질의·조립·편집 연산이 두 채널에 있다. 플랫폼 경로의 고유 색 토큰 집합과 서체 짝 수가 기존 경로(1, 3)보다 많다는 것을 baseline이 보인다 |
| 검증 | `node --test tests/platform-*.test.mjs tests/channel-*.test.mjs tests/profiles-assemble.test.mjs`, `npm run web:test`(API 경로를 바꾼 경우), 공통 명령, `node scripts/platform/baseline.mjs`(갱신 후 커밋) |

### W5-c (0.7.0)

| 항목 | 내용 |
|---|---|
| 목표 | W3 목적 패밀리 32개를 레지스트리·추천·호환성·기본 페이지 슬롯에서 사용한다 |
| 소유 파일 | W5 공통 소유 파일과 `src/catalog/materials-field.mjs`, `tests/service-contract.test.mjs`, `tests/service-expression.test.mjs`, `tests/platform-pipeline-contract.test.mjs` |
| 결정 | `purpose-family` kind, visual metrics/vars/recipe, 기반 부품 requires, X01 조건부 관계, 기본 콘텐츠 승격, boolean·numeric purpose 축의 Blueprint 왕복을 추가한다. REST·MCP 경로와 operation은 0.6.0과 같고 새 kind를 사용한다 |
| 완료 기준 | 32개 목록·상세·추천·호환성이 서비스/REST/MCP에서 일치한다. 페이지 출력이 KPI·표·상품·가격·기사·기능 소개 목적 패밀리를 사용하고, 명시 요청 우선·Blueprint 재컴파일 바이트 동등성이 고정 테스트를 통과한다. 기존 Blueprint ≤2.6.0과 Coolors 노출 제한은 유지한다 |

### W5-d (목적 패밀리 시연·사용자 색 서비스)

| 항목 | 내용 |
|---|---|
| 목표 | W6b가 사용자 hex 시드를 제안·미리보기하고, 목적 패밀리 결과를 그대로 독립 실행 문서로 받을 Core 서비스와 공통 채널을 제공한다 |
| 소유 파일 | W5 공통 소유 파일 중 `src/service/**`, `apps/web/lib/api/**`, `apps/web/app/api/**`, `tests/platform-service*.test.mjs`, `tests/channel-*.test.mjs`, `docs/platform/wbs.md`, `docs/platform/families.md`, `docs/adr/0012-assembly-platform.md`, `docs/evidence/platform/**` |
| 결정 | `proposeSubtokenSets({seeds})`는 순수 제안을 봉투로 돌리고 입력을 저장하지 않는다. `assembleComponents(request)`는 기존 `assembleFamilies` 렌더·진단을 사용해 html·css·script·manifest·standalone을 반환한다. 사용자 팔레트는 요청 안에서만 임시 레지스트리에 둔다. 발견은 `listPlatformMaterials({kind:'purpose-family'})`와 `getPlatformMaterial({id})` 계약을 쓴다. 서비스 봉투는 1.3.0, 플랫폼 재료 계약은 0.7.0을 유지한다 |
| 공개 경로 | REST `POST /api/v1/platform/propose-subtoken-sets`, `POST /api/v1/platform/assemble-components`; MCP `propose_subtoken_sets`, `assemble_components` |
| 완료 기준 | 서비스·REST·MCP 바이트 동등성, 선택 축·상태의 manifest 기록, standalone 안에 같은 html·css·script가 포함됨, 사용자 시드의 무저장, 기존 baseline·Blueprint 고정 출력 유지 |
| 검증 | 사용자 지정 W5-d 검증 명령과 공통 명령. W5-d 조립 조합 수는 바뀌지 않는다. 이후 W5 기준선 후속에서 목적 패밀리 등록·페이지 사용 수를 별도 집계하며 기존 조합 수는 그대로 확인한다 |

### W5 기준선 해석

- `platform.registered.family: 4`와 `platform.distinct.families: 4`는 등록된 시각 패밀리 수다. `platform.distinct.verifiedFamilies: 4`는 품질 검증된 페이지 출력에 실제 선택된 고유 시각 패밀리 수다.
- `platform.registered.purposeFamily: 32`는 목적 패밀리 레지스트리 등록량이다. 현재 6개 대표 페이지 패턴에서 `platform.distinct.purposeFamilies.verified: 4`이며 ID는 `purpose:card.feature`, `purpose:card.kpi`, `purpose:card.product`, `purpose:table.business`다. 이 값은 `assemblePage` 품질 검증을 통과한 Blueprint의 `materials.purposes`에서 모은 고유 목적 패밀리다. 독립 부품 미리보기나 등록량 전체를 기본 페이지에서 사용한 수로 세지 않는다.
- `platform.assemblable.assemblable: 119610`은 원래 정의대로 패턴 × 셸 × 폭 × 밀도 × 모드에 팔레트 × 서브토큰 세트 × 타이포 시스템 × 시각 패밀리를 곱하고 관계·색·서체 제약을 평가한 값이다. 목적 패밀리를 곱 축에 추가하지 않는다.
- 모션 대표 검사는 `attempted: 19`, `verified: 17`, `usedInOutput: 17`이다. 빠진 두 표본은 `motion:expressive` × `dashboard-grid`와 `erp-workspace`다. 두 모드 모두 X11 `motion.lively × elevation.flat` 거부 이유를 내며 규칙은 그대로 유지한다.

## W6 웹 개편

| 항목 | 내용 |
|---|---|
| 목표 | 재료를 탐색하고, 관계·추천 근거를 보여 주고, 조립 결과를 코드로 내보내는 화면을 만든다 |
| 소유 파일 | `apps/web/**`에서 `apps/web/lib/api/**`와 `apps/web/app/api/**`(W5 소유)를 뺀 전부 |
| 할 일 | ⓪ 웹 감사 R1·R2(`docs/platform/web-audit.md` §2)는 Core 결함 D1·D2(ADR 0012 §8)가 원인이므로 W5 결과를 기다린다. 웹에서 우회 값을 만들지 않는다. ① Core 서비스 함수만 쓴다. `src/platform/`을 직접 import하지 않는다(`apps/web/boundary.check.mjs` 방식). 재료 탐색은 `listPlatformMaterials`·`getPlatformMaterial`, 페이지 조립은 `assembleDesign`, 목적 패밀리 시연은 `assembleComponents`, 사용자 색 제안은 `proposeSubtokenSets`를 쓴다. ② 추천 순위, 근거(`decisions[].reasons`), 막힌 후보(`blocked`)를 그대로 보여 준다. ③ 내보내기는 서비스가 반환한 html·css·script·manifest·standalone을 그대로 쓴다. 웹에서 CSS를 다시 만들지 않는다. |
| 완료 기준 | 웹의 조립 결과가 같은 요청의 서비스 결과와 바이트가 같다. Chromium에서 390px과 1280px으로 동작을 확인한다 |
| 검증 | `npm run web:test`, `npm run test:browser`, 공통 명령 |

## 파일 소유 겹침 점검

| 경로 | 소유 |
|---|---|
| `src/platform/{contract,registry,relations,recommend,pipeline,page,page-content,axes,index}.mjs`, `src/platform/examples/**` | W5 |
| `src/platform/color.mjs`, `data/palettes.mjs`, `data/subtoken-sets.mjs`, `src/color-tokens.mjs` | W1 |
| `src/platform/type.mjs`, `data/type-systems.mjs` | W2 |
| `src/platform/family.mjs`, `data/base-components.mjs`, `data/families.mjs`, `src/materials/` 컨트롤 모듈 | W3 |
| `src/platform/data/style-contexts.mjs`, `data/charts.mjs`, 차트 렌더·프리셋 모듈 | W4 |
| `src/service/assemble-design.mjs`, `src/service/index.mjs`, `apps/web/lib/api/**`, `apps/web/app/api/**`, `scripts/platform/**`, `docs/evidence/platform/**` | W5 |
| 나머지 `apps/web/**` | W6 |
| `src/typography.mjs`, `src/materials/typography.mjs`, `src/tokens.mjs`, `src/profiles/**`, `src/catalog/**`(2.7.0 게이트 제외), `src/render/**`(차트 제외), `src/styles/**` | 아무도 고치지 않는다(읽기 전용, 고정 출력) |

테스트 파일은 접두로 나눈다: `platform-color*`(W1), `platform-type*`(W2), `platform-family*`(W3), `platform-style*`·`platform-chart*`(W4), `platform-contract`·`platform-minimal`·`platform-pipeline*`·`platform-service*`(W5). 기존 테스트 파일은 위 표에 "추가만"으로 적힌 작업만 새 `test(`를 더할 수 있다.
