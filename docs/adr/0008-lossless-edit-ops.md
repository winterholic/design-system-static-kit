# ADR 0008 · 문서 편집은 콘텐츠를 잃지 않는 원자적 연산으로만 한다

- 상태: 채택 · 2026-11-21 (브랜치 `next/b-core-ops`, main 병합 전)
- 배경: Next.js 플랫폼(Studio·REST·MCP) 전환의 Core 안정화 단계. 이전 검토에서 `src/workbench.mjs`의 `useTheme`·`useTemplate`·`useRecipe`가 Blueprint를 `createBlueprint`로 다시 만들어 편집한 콘텐츠를 잃고, 구성 변형이 템플릿 원본 `children`을 다시 적용하는 것으로 의심됐다. 이 문서는 그 문제를 원천 차단하는 연산 계층과, 조사에서 확인한 숨은 삭제 경로의 처리를 기록한다.
- 구현: `src/edit/`(`ops.mjs`, `fingerprint.mjs`, `contracts.mjs`, `index.mjs`), `src/catalog/index.mjs`(`repairAxes`·`composeBlueprint`·`navConflicts`), `src/catalog/variants.mjs`(`applyLayoutChecked`, 히어로 변형)
- 시험: `tests/edit-lossless.test.mjs`, `edit-ops`, `edit-repair`, `edit-contracts`, `edit-portability`

## 결정

### 1. 모든 편집은 `(doc, args)` 순수 함수다

`src/edit/index.mjs`는 React·Next.js·DOM·Node 전용 모듈을 쓰지 않는다. 의존은 `src/catalog`·`src/validate.mjs`·`src/compiler.mjs`의 상대 경로뿐이고 `structuredClone`·`TextEncoder`·`BigInt`만 쓴다(`tests/edit-portability.test.mjs`가 추이적 import 닫힘에 `node:`·패키지·웹 파일이 없음을 검사).

결과는 한 가지 모양이다.

```js
{ok: boolean, doc, changes: [{op, path, before?, after?, from?, to?}], errors: [{code, path, message, hint}], warnings: [{code, path, message, …}], content: {before, after, preserved} | null}
```

- 입력 `doc`은 바꾸지 않는다. 성공하면 **깊게 동결된 새 객체**, 실패하거나 바뀐 것이 없으면(`warnings`에 `NO_CHANGE`) **입력 그 자체**를 돌려준다. 호출자가 `changes`가 비지 않은 결과만 스택에 쌓으면 Undo/Redo가 된다(참조 하나가 스냅샷이다).
- 모든 연산은 `validateBlueprint`로 결과를 검증하고, 통과하지 못하면 어떤 변경도 없이 `errors`만 돌려준다(원자적 거부). 검증기 오류에는 코드별 `hint`가 붙는다(검증기 자체는 바꾸지 않았다).
- 모양 연산(테마·팔레트·모드·구성 변형)은 마무리에서 **콘텐츠 불변 조건**을 확인한다. 어긋나면 `CONTENT_LOSS`로 거부한다. 테마·팔레트·모드는 `name`·`chrome`·`tree`가 글자 그대로 같아야 하고, 구성 변형은 콘텐츠 지문이 같아야 한다.
- `applyOp(doc, name, args)`가 REST·MCP용 진입점이다. 알 수 없는 연산은 `UNKNOWN_OP`이다.

### 2. 연산 API

| 연산 | args | 보장·정책 |
|---|---|---|
| `setTheme` | `theme`, `palette?`('theme-default'·'keep'·id), `variant?`, `axes?`('theme'·'keep'), `repair?`('auto'·'reject'), `navPolicy?`('fit'·'reject') | 콘텐츠·내비는 그대로. 테마 기본 축을 입힌 뒤 금지 조합을 고치고(`AXIS_REPAIRED`) 내비가 새 셸에 안 놓이면 **내비를 보존하는 셸로 바꾼다**(`SHELL_SUBSTITUTED`). 그런 셸이 없으면 `NAV_NO_SHELL`. 모드는 테마가 금지할 때만 바뀐다(`MODE_CHANGED`) |
| `setPalette` | `palette` | 팔레트 필드만 바뀐다 |
| `setAppearance` | `mode?`, `axes?`, `repair?`('reject' 기본), `navPolicy?` | 사용자가 고른 값은 몰래 바꾸지 않는다. 금지 조합은 대안과 함께 거부하고 `repair:'auto'`일 때만 대안을 적용·보고한다 |
| `setLayoutVariant` | `slot`+`option` 또는 `choice`, `contentPolicy?`('reject'·'relocate') | **현재 트리**에 적용한다(템플릿 원본을 다시 쓰지 않는다). 전부 적용되거나 하나도 적용되지 않는다. 결과 계약 V01~V05 위반은 거부하지 않고 quality 경고(`VARIANT_CONTRACT`) |
| `updateNode` | `path`, `set?`, `unset?` | `type`·`children` 변경 불가. 경로 `$`는 `name`만 |
| `insertNode` | `parent`, `node`, `index?`, `key?`('children') | 어떤 배열 필드(`chrome.nav` 포함)든 삽입 |
| `removeNode` | `path` | 배열 항목만. 사용자의 명시적 삭제 |
| `moveNode` | `path`, `to:{parent,index?,key?}` | 자기·자손으로 이동 불가. 콘텐츠 지문 불변 |
| `replaceTemplate` | `template`, `discard?`, `keepAppearance?`, `theme?`, `contentPolicy?` | 구조를 갈아끼우되 현재 테마·팔레트·모드·축 유지. 콘텐츠를 잃으면 `discard:true` 필요 |
| `importBlueprint` | `blueprint`(객체·JSON 문자열), `upgrade?`, `discard?` | 1.0 변환 시 콘텐츠를 잃으면 `IMPORT_LOSSY`. 옛 catalogVersion은 `upgrade:true`일 때만 올린다 |
| `resetDocument` | `template?`, `theme?`, `palette?`, `themeVariant?`, `typography?`, `layout?`, `discard?` | 손실 없는 합성으로 새 문서를 만든다. `doc`이 `null`이어도 된다 |

경로는 인덱스 배열(`[1,0]`, `tree.children`을 따라감, Studio 선택 경로와 같은 표기) 또는 `"$.tree.children[1]"`·`"$.chrome.nav[0]"` 문자열이다. `__proto__`·`constructor`·`prototype` 키는 거부한다.

### 3. 오류 코드와 해결 방법

모든 오류는 `{code, path, message, hint}`다. 검증기 코드(`UNKNOWN_KEY`, `ENUM`, `NAV_COUNT`, `PAGE_REQUIRE`, `AXIS_BAN`, `THEME_FORBID` 등)는 그대로 통과시키고 `hint`만 보탠다.

| 코드 | 의미 | 해결 |
|---|---|---|
| `ARGS_INVALID`, `UNKNOWN_OP` | args 형식·연산 이름 오류 | 메시지의 예를 따른다 |
| `UNKNOWN_THEME`·`UNKNOWN_THEME_VARIANT`·`UNKNOWN_PALETTE`·`UNKNOWN_TEMPLATE`·`UNKNOWN_AXIS`·`ENUM` | 카탈로그에 없는 값 | hint에 허용 목록 |
| `PATH_INVALID`·`PATH_NOT_FOUND`·`INDEX_RANGE`·`PROTO_KEY` | 경로·인덱스·키 오류 | 경로 표기와 현재 구조 확인 |
| `NODE_TYPE_IMMUTABLE`·`CHILDREN_VIA_OPS` | `updateNode`로 바꿀 수 없는 필드 | 삭제 후 삽입 / insert·remove·move |
| `MOVE_INTO_SELF` | 자기·자손 안으로 이동 | 다른 부모 |
| `LAYOUT_UNKNOWN`·`LAYOUT_NOT_APPLICABLE` | 없는 슬롯·옵션, 또는 현재 트리·페이지 유형에 적용 대상 없음 | hint에 지금 고를 수 있는 구성 |
| `LAYOUT_WOULD_DROP_CONTENT` | 변형이 콘텐츠(히어로 `facts`)를 둘 곳이 없음 | `contentPolicy:'relocate'` 또는 먼저 `updateNode`로 정리 |
| `NAV_NO_SHELL` | 내비(항목 수·mega·group·icon)를 놓을 수 있는 셸이 없음 | 내비를 정리한 뒤 재시도. 페이지 유형이 허용하는 셸만 후보 |
| `DISCARD_REQUIRED` | 교체가 콘텐츠를 잃음 | 의도했다면 `discard:true` |
| `IMPORT_INVALID`·`IMPORT_VERSION`·`IMPORT_LOSSY` | JSON·버전·변환 손실 | 원본을 고쳐 다시 들여온다 |
| `REPAIR_NAV_POLICY` | `repairAxes`의 `nav` 옵션이 `'drop'`·`'fit'`·`'keep'`이 아님(예외의 `error.errors`로 전달, 내비는 건드리지 않음) | 오타를 고친다. 옵션을 생략하면 레거시 `'drop'` |
| `CONTENT_LOSS` | 모양 연산이 콘텐츠를 바꿈(코어 불변 조건 위반, 방어선) | 재현 입력과 함께 이슈. 입력은 바뀌지 않았다 |

경고(`warnings`)는 `AXIS_REPAIRED`, `SHELL_SUBSTITUTED`, `MODE_CHANGED`, `DECORATION_DROPPED`(grade `decoration`), `CONTENT_RELOCATED`, `CONTENT_REPLACED`, `CATALOG_LEGACY`, `VARIANT_CONTRACT`(grade `quality`), `NO_CHANGE`다.

### 4. 조사 결과와 처리: `repairAxes`의 숨은 삭제

`repairAxes(b)`는 셸이 내비를 못 담을 때 `chrome.nav`를 잘라내고(`navLimits`), 가로 셸이면 `mega`를, 사이드바·split이 아니면 `group` 라벨을 **보고 없이** 지웠다. 템플릿 85개 × 테마 54개 = 4,590개 합성에서 측정한 범위(변경 전 코드):

| 삭제 | 합성 수 | 비고 |
|---|---:|---|
| 내비 항목 절단(`NAV_TRUNCATED`) | 126 | 예: `saas-landing`×`studio`(minimal 셸 2개 한도, 항목 3개). 템플릿 자기 테마에서도 `agency-home`·`case-study` 2개가 잘린다 |
| 드롭다운 삭제(`NAV_MEGA_DROPPED`) | 10 | `product-listing`이 사이드바 테마를 입을 때 |
| 그룹 라벨 삭제(`NAV_GROUP_DROPPED`) | 132 조합, 라벨 751개 | `docs-reference` 등이 가로 셸 테마를 입을 때. 항목 절단과 겹쳐 라벨이 함께 사라지는 1개 조합을 더하면 133 |

처리:

- **편집 경로는 삭제를 하지 않는다.** `repairAxes(b, {nav:'fit'})`는 내비를 그대로 두고 페이지 유형·테마 금지·축 금지·내비 조건(`navConflicts`)을 모두 만족하는 셸 중 선호 순서(topbar, stacked, centered, editorial, masthead, sidebar, split, rail, dock, minimal)로 첫 셸을 고른다. 그런 셸이 없으면 내비를 건드리지 않고 검증기가 `NAV_*`로 거부한다. `composeBlueprint(…, {lossless:true})`가 이 경로로 합성한다. **4,590개 합성 모두** 전체 내비를 보존하고 검증을 통과한다(셸 대체 225건, 거부 0건. `tests/edit-repair.test.mjs`).
- **옛 경로는 기본값으로 남기되 조용하지 않게 했다.** `repairAxes(b)`의 기본 정책 `'drop'`은 동작이 같다. 이유: (a) 이 동작에 고정된 출력(site 예시·test-lab·갤러리·`legacy-hashes`)이 있고 셸 대체는 출력을 바꾼다, (b) 기존 시험(`components4`: "repair drops labels when a theme brings a horizontal shell")이 이 동작을 명세로 고정하고 있다, (c) 호출자 다수(`scripts/audit.mjs`, `scripts/test-lab/generate.mjs`, `src/combos.mjs`, `src/workbench*`)가 이 작업의 쓰기 범위 밖이다. 대신 `repairAxes(b, {report})`와 `composeBlueprint()`가 지운 항목을 구조화된 기록(`NAV_TRUNCATED{dropped}`, `NAV_MEGA_DROPPED`, `NAV_GROUP_DROPPED`, `CONTENT_DROPPED`, `DECORATION_DROPPED`)으로 돌려준다. `createBlueprint`는 `composeBlueprint(…).blueprint`다.
- **남은 위험(숨기지 않는다).** `repairAxes(b)`를 report 없이 부르는 기존 호출자(`src/workbench/axes.mjs`의 축 변경, `auto-fix` 버튼, `scripts/*`)는 여전히 내비를 조용히 자른다. 연산 계층으로 옮기는 것이 후속 과제이며(아래 마이그레이션), 템플릿 자체 데이터(`agency-home`·`case-study`의 내비가 자기 테마 한도를 넘음)는 카탈로그 개정 대상이다.

### 5. 조사 결과와 처리: 히어로 변형의 삭제

`variants.mjs`의 `setHero`는 변형이 허용하지 않는 `visual`·`motif`·`facts`를 지웠다. 검증기가 `visual`을 split·product 밖에서, `facts`를 split·product에서 거부하므로(`HERO_VISUAL`, `VARIANT_REQUIRES`) 문서에 그대로 둘 수 없다. 검증 완화는 하지 않았다. 구분은 다음과 같다.

| 필드 | 성격 | 편집 경로 처리 |
|---|---|---|
| `visual`, `motif` | **장식**(그림 종류. 글·데이터가 아니다) | 지우되 `DECORATION_DROPPED`로 값과 함께 기록한다. V01 계약이 quality 경고를 더한다. 되돌리기는 Undo |
| `facts` | **콘텐츠**(값·라벨 글) | 기본은 `LAYOUT_WOULD_DROP_CONTENT`로 거부. `contentPolicy:'relocate'`는 히어로 바로 아래 `grid > metric` 지표 격자로 옮긴다(`facts[].value/label` → `metric.value/label`, 지문 동일, `CONTENT_RELOCATED`) |

"렌더에서만 숨기기"는 쓰지 않았다. 문서에 남기려면 검증기가 해당 필드를 받아야 하는데 그것은 규칙 완화다. 대신 콘텐츠는 문서의 다른 위치로 옮기거나 변형을 거부해 문서 안에 항상 보존한다.

템플릿 합성 경로(`applyLayout`, 레거시)는 같은 삭제를 하되(출력 hash 보존) 이제 `{report}`로 `DECORATION_DROPPED`·`CONTENT_DROPPED`를 보고한다. 측정: 히어로 변형 옵션 51개 조합이 장식 또는 `facts`를 잃는다. 그중 `facts` 손실은 `cover/centered/statement → split/product` 조합이다(`tests/edit-lossless.test.mjs`가 이 옵션 전부를 거부·이동 경로로 증명).

### 6. 통합 계약 검사(`src/edit/contracts.mjs`)

연산·변형을 여러 번 거친 최종 문서를 `checkDocument(doc, {base, layout})`·`checkSequence(doc, steps)`로 검사한다. `applySequence`는 전부 적용되거나 아무것도 적용하지 않는다.

| 등급 | severity | 내용 | 효과 |
|---|---|---|---|
| strong | error | **데이터 보존**(`CONTENT_LOSS`·`CONTENT_DRIFT`), **스키마**(UNKNOWN_KEY·ENUM·REQUIRED 등), **접근성**(LINK_LABEL·URL·ANCHOR_*·DUPLICATE_ID·NAV_ICON, 컴파일 대비 게이트 `CONTRAST`), **필수 구조**(PAGE_*·HERO_*·NAV_*·AXIS_BAN·THEME_FORBID) | `ok:false`, `level:'fail'` |
| quality | warning | 맥락 품질: 변형 결과 계약 V01~V05(ADR 0006)를 시작 트리→최종 트리에 대조, 페이지 규칙이 남기는 잔여 문제(`PAGE_DUP_VISUAL`, `PAGE_BENTO_SPARSE`) | `ok:true`, `level:'quality'` |
| diagnostic | info | 페이지 규칙이 이미 적용한 결정(P02·P03), 맥락 결정 수·대비 쌍 수, 콘텐츠 지문 | 판정 아님 |

ADR 0006의 "계약에 걸려도 거부하지 않고 추천에서만 뺀다"를 그대로 따른다. 강한 계약은 거부하고, 맥락 품질은 거부하지 않는다.

### 7. 콘텐츠 지문(`src/edit/fingerprint.mjs`)

`name`·`chrome`·`tree`의 모든 리프 값을 `필드명=값`으로 모아 정렬한 항목 목록이다(위치·부품 종류 무관, 해시는 FNV-1a 64비트, 보안 목적 아님). 모양 필드(`PRESENTATION_FIELDS`: `type`·`variant`·`layout`·`columns`·`align`·`surface`·`side`·`reverse`·`visual`·`motif`)는 뺀다. 이 밖의 값은 전부 콘텐츠다. 한계: `card.visual`처럼 모양 목록에 든 장식은 지문이 보지 못한다. 테마·팔레트·모드 연산은 `tree` 전체가 글자 그대로 같아야 하므로 이 한계에 걸리지 않고, 구성 변형의 장식 삭제는 경고로 남는다.

## 출력 호환 (카탈로그 2.4.0 그대로)

- **기존 출력 hash는 바뀌지 않았다.** 카탈로그 버전·CHANGELOG·Blueprint 규약 변경 없음. 마이그레이션 불필요.
- 증거 1: 변경 전 코드(`b303f17c1`)에서 템플릿 85 × 테마 54(4,590)와 단일 변형 옵션 366개(합 4,956개)를 `createBlueprint`→`compile` 해 `sha256(html)`·`sha256(blueprint JSON)` 앞 16자리를 모은 digest `e8032b0e…dc1c`를 `tests/edit-repair.test.mjs`에 고정했고, 변경 후 같은 값이 나온다.
- 증거 2: `npm run verify`의 `node scripts/check-generated.mjs`가 `REPRODUCIBLE: 3308 generated files match a fresh build byte for byte.`. 재생성된 `site/`에서 달라진 것은 소스를 그대로 싣는 `site/src/**`와 `site/gallery/index.html`(소스 번들)뿐이고 `site/examples/**`·`site/test-lab/**`·`site/v1/**`·`docs/**`는 바이트가 같다.
- 출력이 바뀔 수 있는 변경(레거시 합성 경로의 셸 대체 등)은 하지 않았다. 바꾸려면 이전 출력을 고정한 뒤 새 카탈로그 버전으로만 낸다(`docs/governance.md`).

## 시험으로 증명한 것

- 85 템플릿 × 54 테마 전수(4,590) `setTheme`: `name`·`chrome`·`tree` 글자 단위 동일 또는 구조화된 거부. 테마 변형·팔레트·모드까지 5천 건이 넘는 조합의 콘텐츠 지문 동일.
- 모든 템플릿의 제안된 구성 옵션 전수(300개 이상): 콘텐츠 보존, 또는 `LAYOUT_WOULD_DROP_CONTENT`와 `relocate` 성공. 거부된 옵션은 모두 레거시 경로가 실제로 `facts`를 잃는 조합이다(=시험이 버그를 재현한다).
- 모든 슬롯을 한 번에 적용한 연쇄(첫·마지막 옵션), 테마→팔레트→모드→변형→테마 연쇄에서 사용자가 `updateNode`로 고친 제목이 끝까지 남는다. 연산 없이 `composeBlueprint`로 다시 만들면 사라짐을 같은 시험이 보인다.
- 시험 강도 확인(RED): `setHero`의 `facts` 보호를 끄면 `proof: every offered layout option …`과 통합 검사가 실패했고(`agency-home hero=split`), `setTheme`이 내비 정책 없이 `repairAxes`를 쓰면 4,590개 중 4,359개만 통과하고 `CONTENT_LOSS`가 났다. 원래 코드로 되돌리면 통과한다.

## 마이그레이션 (후속 작업)

1. Studio(React)는 `src/edit`의 연산만 호출하고 결과 `doc`을 히스토리 스택에 쌓는다(`changes`가 비면 쌓지 않음). `useTheme`·`useRecipe`·`useTemplate`·`reset`의 `createBlueprint` 재생성은 각각 `setTheme`·`replaceTemplate`·`resetDocument`로 대체된다. 이 작업은 웹 파일을 건드리지 않았으므로 아직 연결되지 않았다.
2. `repairAxes(b)` 단독 호출(`src/workbench/axes.mjs`, `auto-fix`, `scripts/audit.mjs`, `scripts/test-lab/generate.mjs`, `src/combos.mjs`)은 `setAppearance({repair:'auto'})` 또는 `{nav:'fit'}`로 옮긴다. 옮기면 해당 산출물의 출력이 바뀌므로 그때 카탈로그 버전과 고정 hash를 함께 낸다.
3. 카탈로그 쪽: `agency-home`·`case-study`의 내비를 자기 테마 한도에 맞추거나 템플릿 테마를 바꾸는 개정(출력 변경이므로 새 카탈로그 버전).

## 하지 않은 것과 한계

- 레거시 합성 경로(`createBlueprint`, 기본 `repairAxes`, `applyLayout`)의 삭제 동작은 출력 hash 보존을 위해 유지했다. 보고(report)는 하지만 기본 호출자에게는 여전히 조용하다.
- 컴파일 대비 게이트 실패(`CONTRAST`/`COMPILE_FAILED`)를 `checkDocument`가 강한 계약 오류로 바꾸는 경로는 구현했으나 시험하지 못했다. 모든 팔레트×모드가 감사에서 게이트를 통과하므로 실제 입력으로 실패를 만들 수 없다.
- 브라우저(Chromium)·Studio 연동·`src/workbench*`는 이 작업에서 실행하지 않았다(웹 파일 수정 금지). Core가 DOM·Node 모듈을 쓰지 않음은 정적 검사와 Node 실행으로만 확인했다.
- `contracts.mjs`의 품질 규칙은 기존 V01~V05·페이지 규칙을 재사용한다. 새 품질 규칙을 만들지 않았다. `replaceTemplate`의 `discard` 판단은 콘텐츠 지문 기준이며 템플릿 기본값과 동일한지는 따로 판정하지 않는다.
- 미감·사용자 승인을 보증하지 않는다.
