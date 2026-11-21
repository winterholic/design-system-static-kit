# 재료 감사 (1단계, 2026-11-22)

기준: `origin/feat/material-platform` `df15714f8`. 비교 대상: `winterholic-design-system` `4790b28`(ttakkari, merrivoo).
재료 수치의 정본은 `catalogRegistry().counts()`(`src/materials/index.mjs`)다. 이 문서는 판정과 근거만 적는다.

상태 정의(`src/materials/contract.mjs` `QUALITY`):

- **verified**: 구현이 있고, 그 동작을 실패시킬 수 있는 테스트가 있다.
- **implemented**: 렌더러·CSS 구현은 있으나 그 재료만 겨냥한 테스트가 없다.
- **enum-only**: 스키마 값으로는 있으나 구분되는 구현이 얕거나(정적 표시뿐) 상태·변형이 비어 있다.
- **missing**: 없다.

## 1. 10분류 판정

| 분류 | verified | implemented | enum-only | missing |
|---|---|---|---|---|
| 색 | 팔레트 427 × light/dark 역할 토큰 27개와 대비 게이트(`src/tokens.mjs:35`, `:68`; `tests/compiler.test.mjs:42`), auto 모드 두 세트(`tests/compiler.test.mjs:52`) | 상태색 4종 고정 시드(`src/tokens.mjs:62`), 차트 5색(`src/tokens.mjs:64`) | backdrop 축 4값(`src/styles/base.mjs:29`) | 원시 램프(50~950), 계층 토큰(primitive→semantic→component), hover·pressed·selected·disabled 상호작용 색, 순차·발산 차트 스케일 |
| 서체 | 프리셋 18(`src/typography.mjs:39`), 역할 크기 순서(`src/typography.mjs:98`; `tests/typography.test.mjs:41`), 한글 한도(`src/typography.mjs:72`), 원시 크기 금지 lint(`src/typography.mjs:234`; `tests/typography.test.mjs:63`) | scale·weight 축(`src/styles/base.mjs:8`, `:14`) | — | 웹폰트 로딩 계약(시스템 스택만), 숫자 표기 역할(가격·지표) 별도 토큰 |
| 간격·밀도 | 밀도 3 × 간격 사다리, 4px 격자와 근접 순서(`src/spacing.mjs:6`, `:46`; `tests/spacing.test.mjs:17`, `:26`), 섹션 중첩 금지(`tests/spacing.test.mjs:70`) | 2.5.0 구역 간격(`src/catalog/expression.mjs:42`) | — | 부품별 크기(size sm/md/lg) 축 |
| 반경·테두리·그림자 | radius 5·elevation 6 값 표(`src/styles/base.mjs:11`, `:20`; `tests/catalog.test.mjs:93`), 금지 조합 X07(`src/catalog/axes.mjs:39`) | control 축 3값(`src/catalog/axes.mjs:13`) | — | 테두리 폭 토큰, 다크 전용 그림자 |
| 아이콘·미디어 | 아이콘 87(`src/catalog/icons.mjs:6`; `tests/catalog.test.mjs:162`), media 7종·비율 5(`src/catalog/nodes.mjs:12`), 모티프 일러스트(`tests/motifs.test.mjs`) | 장식 ornament 5(`src/render/art.mjs:67`), 인물 이니셜(`src/render/art.mjs:85`) | icon 축 6값(`src/styles/base.mjs:15`)은 선 굵기 변화뿐 | 아바타 부품, 실제 이미지 자산 계약 |
| 레이아웃·내비 | 셸 10·폭 4·푸터 3(`src/catalog/axes.mjs:6`, `:19`, `:22`), 내비 한도(`src/catalog/axes.mjs:47`; `tests/compiler.test.mjs:168`), flow·bento(`src/layout.mjs:7`, `:230`; `tests/layout.test.mjs:13`, `:49`), 페이지 유형 16(`src/catalog/pagetypes.mjs:11`; `tests/compiler.test.mjs:158`) | stack·cluster·container·split 원형(`src/layout.mjs:350`) | breadcrumb·pagination·links 부품은 정적 링크 | 드로어·시트·모달 내비, 경로(Path) |
| 폼·데이터·피드백 | 필드 13종과 id·선택지 계약(`src/catalog/nodes.mjs:20`; `tests/compiler.test.mjs:113`), 데이터 상태 6종(`src/render/util.mjs:25`; `tests/compiler.test.mjs:125`), 표 폭·정렬(`src/table-design.mjs`; `tests/table-design.test.mjs:13`) | 폼 입력 확인 런타임(`src/render/index.mjs:15`) | select는 네이티브 `<select>`(`src/render/nodes.mjs:150`), notice `toast` 변형은 정적 배치, 표 정렬·선택 없음 | 커스텀 Select·Combobox, 날짜 선택, 다이얼로그, 툴팁, 토스트 큐, 배지·칩 독립 부품 |
| 차트 | 기존 막대·가로막대·선·면적·도넛 + 누적 막대·산점도·히트맵·스파크라인 SVG(`src/render/chart.mjs`), 값 형태·축 절단 검증(`src/validate.mjs`; `tests/chart-presets.test.mjs`), 제목·요약·데이터 표(`src/render/chart-legacy.mjs`, `tests/compiler.test.mjs:194`); chart-preset 재료 8개는 실제 컴파일·렌더 검증 | — | chart-preset은 `2.6.0` 재료 접점만 제공하며 공통 Blueprint 문법은 아직 받지 않음 | 캔들·OHLC(별도 O/H/L/C 모델), 순차·발산 토큰 색상 |
| 구역·레시피 | 템플릿 85(`src/catalog/templates.mjs:530`; `tests/catalog.test.mjs:131`), 레시피 3(`src/catalog/recipes.mjs:59`; `tests/recipes.test.mjs:12`), 구성 변형(`src/catalog/variants.mjs:174`; `tests/variants.test.mjs:9`) | 컨셉 17(`src/catalog/concepts.mjs:13`) | — | 레이아웃 패턴(슬롯 단위 구역 조합)을 재료로 고르는 경로 |
| 상호작용·모션·상태 | reduced-motion 차단(`src/styles/base.mjs:94`), 포커스 링(`src/styles/base.mjs:60`), 탭 키보드(`src/render/index.mjs:16`; `tests/compiler.test.mjs:198`) | motion 3값과 이징 1개(`src/styles/base.mjs:28`, `:49`), 칩 토글(`src/render/index.mjs:17`) | elevation `hover` 그림자만 상태 표현 | disabled·loading 버튼, 상태 전이 표, 지속시간·이징 토큰 세트 |

`catalogRegistry()`로 등록한 부품 55개 중 50개가 `verified`다. 이 판정은 예시 한 개가 검증·컴파일된다는 뜻이다(`tests/catalog.test.mjs:116`). 모든 변형 값을 각각 검증했다는 뜻은 아니다. 예시가 없는 page·tab·lane·task·plan은 부모 예시로만 그려지므로 `implemented`로 둔다. 부품 28개는 CSS에서 반응형 전략을 읽을 수 없어 `responsive.strategy: unspecified`다. 그 목록은 `registry.filter({kind: 'component'})` 결과로 확인한다.

## 1.1 2.6.0 컨트롤 재료 8종

Button, Input, Card, Navigation, Modal, Tabs, Tooltip, Feedback을 개별 재료로 등록했다. 각 재료는 `verified`이며 렌더 진입점과 키보드·상태 동작을 갖는다. 계약은 외형·모양·크기·기능·상태·맥락을 서로 다른 축으로 두고, `CONTROL_SIZES`와 컴포넌트 색 토큰을 공유한다. 금지 조합은 `forbidden`으로 선언하며 모든 조합을 테스트에서 허용 또는 거부한다. 등록 시 알 수 없는 속성도 거부한다.

| 수량 | 값 | 산출 |
|---|---:|---|
| 재료 수 | 1,066 | `catalogRegistry().counts().materials` |
| 속성 조합 수 | 795,799 | `catalogRegistry().counts().attributeCombinations` (금지 조합 포함) |
| 완성 프리셋 수 | 190 | `catalogRegistry().counts().completePresets` |
| 컨트롤 재료 수 | 8 | Button·Input·Card·Navigation·Modal·Tabs·Tooltip·Feedback |
| 컨트롤 속성 조합 | 31,776 | 8개 계약의 전체 조합 합계(금지 포함) |
| 컨트롤 완성 프리셋 | 0 | 이번에 추가한 컨트롤 8종 기준 |

`node scripts/materials/components-evidence.mjs`가 결정적 증거 페이지 `docs/evidence/materials/components.html`을 생성한다. `e2e/material-components.spec.mjs`는 390px과 1280px에서 동작을 확인하고 Playwright 결과 디렉터리에 섹션별 이미지를 기록한다. 수동 확인 이미지는 `docs/evidence/materials/screenshots/`에 있다. 계약과 조합 테스트는 `tests/material-components.test.mjs`에 있다.

## 2. winterholic-design-system 비교

| 층 | winterholic (ttakkari·merrivoo) | Static Kit | 재사용할 일반 구조 | ttakkari 고유(가져오지 않음) |
|---|---|---|---|---|
| 원시 색 | `tokens/src/palette.json`: 색 계열별 50~950 램프와 단계별 대비 기록(`$extensions.tk.contrast`) | 원색 3~10개 팔레트, 램프 없음 | 램프 생성 + 단계별 대비 기록 | blue·mint 앵커 값 |
| 브랜드·시드 | `brand.json:1`, 시드 13색 고정 | 팔레트의 `brand` 인덱스(`src/catalog/palettes.mjs:53`) | 시드 → 램프 → 의미 토큰 단방향 참조 | Paper·Ink·Mint 의미 |
| 의미 색 | `color.light.json`/`color.dark.json`: surface(`:6`)·text(`:22`)·border(`:41`)·action(`:53`)·status(`:87`)·interactive(`:200`)·chart(`:220`, 범주·순차 `:222`, `:230`) | 역할 27개를 계산(`src/tokens.mjs:59`) | surface·text·border·action·status·interactive·chart 그룹과 라이트·다크 별도 파일 | agent·run·policy·filetype·ink·viewer·highlight·presence(`:96`~`:193`) |
| 대비 검사 | 빌드가 쌍 표(`tokens/build.mjs:81`)로 검사하고 실패 시 중단(`:186`) | 팔레트×모드 105쌍 게이트(`src/tokens.mjs:68`) | 쌍 표를 데이터로 두는 방식 | — |
| 컴포넌트 토큰 | `component.json`: button(`:5`)·input(`:16`)·choice·segmented·tabs·badge·chip·card·callout·tooltip·menu·dialog·sheet·toast 등 37묶음 | 부품 CSS chunk가 `--kit-*` 역할 변수를 직접 씀(`src/styles/chunks.mjs:3`) | 컴포넌트 층 토큰(크기·간격·반경) | message·composer·run·log·approval·artifact·viewer |
| 치수·모양·모션 | `dimension.json` size(`:23`)·breakpoint(`:70`)·radius(`:80`), `motion.json` duration(`:4`)·easing(`:15`) | 축 값 표(`src/styles/base.mjs:11`~`:29`) | breakpoint·duration·easing을 이름 있는 토큰으로 | 실행 상태 맥박 같은 도메인 모션 |
| 컴포넌트 레지스트리 | merrivoo `registry/components.json`: 16개, class·parts·variants·states·tokens·usage·a11y. ttakkari는 문서 마크업 계약(`docs/06-components.md`)과 테스트(`scripts/ttakkari-design-system.test.mjs:179`) | `nodeSpecs`(스키마·예시) + 이번 `src/materials/` | 재료 하나가 variants·states·tokens·a11y를 가진 기계 판독 기록. 레지스트리와 실제 CSS 일치 검사 | — |
| lint | CSS 값은 `var(--tk-*)`만(`tokens/build.mjs:202`), 레이아웃 실수 lint(`:243`) | 간격·서체·레이아웃 lint(`src/spacing.mjs:94`, `src/typography.mjs:234`, `src/layout.mjs:266`) | 이미 같은 방식 | — |

라이선스: winterholic-design-system 패키지는 라이선스를 정하지 않는다(`scripts/ttakkari-design-system.test.mjs:208`). 구조와 방식만 참고하고 값·CSS·문구는 가져오지 않는다.

## 3. 팔레트 출처와 라이선스

| 출처 | 팔레트 수 | 근거 | 판정 |
|---|---|---|---|
| Coolors 렌더 목록 2026-10-18 (테마 배정분) | 160 | `docs/evidence/coolors-palettes.json`(관측 814개). 160개 모두 관측 목록에 있다 | **신규 노출·내보내기·수집에 부적합.** 아래 Coolors 공식 문언과 권리 확인 범위를 적용한다 |
| Coolors 인기 목록 2026-10-20 (라이브러리) | 267 | `docs/evidence/coolors-popular-2026-10-20.json`(관측 1,288개). 267개 모두 관측 목록에 있다 | 같은 제한을 적용한다. 좋아요 수(77개는 미관측 null)는 출처 표시용이다 |
| yehsb123/design-system-kit (AGPL-3.0) | 0 | `docs/sources.md` | 축 이름·수량 같은 사실만 기록하고 코드·토큰·CSS는 복사하지 않았다. 유지 |
| winterholic-design-system | 0 | 본인 저장소, 라이선스 미지정 | 구조만 참고 |

2026-11-22에 Coolors 공식 문서 두 곳을 확인했다.

- 이용약관의 *Content on Coolors* 절은 예외 목록을 전제로 자체 상업·비상업 작업과 인쇄·디지털 결과물에 팔레트를 쓸 수 있다고 설명한다. 제3자 제공, 단독 또는 묶음 형태의 재배포, 디자인 템플릿 및 템플릿 제작 도구·앱에 포함하는 행위를 제한한다. 파싱·비축·합리적 범위를 넘는 다운로드도 제한 목록에 있다. 페이지 표기 갱신일은 2023-06-14다. [Coolors 이용약관](https://www.coolors.app/terms-of-service)
- 라이선스 요약도 상업·비상업 여부와 관계없이 단독 또는 묶음 재배포를 금지하고, 디자인 템플릿과 템플릿 제작 도구·앱에 팔레트를 넣는 것을 금지한다. 페이지 표기 갱신일은 2023-08-16이다. [Coolors 라이선스](https://www.coolors.app/license)

Static Kit의 팔레트 묶음과 템플릿 제작 기능에 적용할 **별도 권리 허락은 확인되지 않았다**. 427개 모두에 `source.license: 'unverified'`를 유지하고 `src/materials/adapters.mjs`의 `PALETTE_SOURCE_VERDICT`에 신규 노출·내보내기·수집 부적합 판정을 기록한다. `tests/materials-registry.test.mjs`가 수량·출처·판정을 확인한다.

원본 427개와 기존 2.4.0·2.5.0 입력·출력은 호환성을 위해 보존한다. 이번 감사에서는 공식 문언만 확인했고 새 팔레트는 수집하지 않았다. 기존 제품 경로의 조치는 후속 작업으로 남긴다.

## 4. 구현 우선순위

1. **계층 색 토큰**(`color-token` 종류): 팔레트 → 램프 → 의미(surface·text·border·action·status·interactive·chart) → 컴포넌트. 2.6.0에서만 켜고 기존 역할 27개는 의미 층 별칭으로 유지한다. 순차·발산 차트 스케일과 상호작용 색(hover·pressed·selected·disabled)을 포함한다.
2. **상태 계약 채우기**: 버튼·필드의 disabled·loading·invalid와 전이 표. 지금 전이가 있는 부품은 tabs·form·filter-bar 셋뿐이다.
3. **Select·Table 심화**: 커스텀 Select(키보드·listbox), 표 정렬·선택·빈/오류 상태와 페이지네이션 연결.
4. **차트 프리셋**(`chart-preset` 종류): kind × 축·범례·단위 묶음을 완성 프리셋으로 등록한다.
5. **서체 시스템**: 숫자 역할과 프리셋별 크기 표를 재료 ext로 노출한다.
6. **레이아웃 패턴**(`pattern` 종류)과 **디자인 프로필**: 템플릿 슬롯을 재료 id로 고르게 한다. (2026-11-22 구현: 프로파일 7개, 패턴 11개, 정적 검사 PF01~PF13, 조립 `assemble`. [디자인 프로파일](profiles.md))
7. **반응형 기록**: `responsive.strategy: unspecified`인 부품 28개를 실제 CSS 근거로 채운다.
8. **모션 토큰**: duration·easing 이름 토큰, 상태 전이와 연결한다.

## 5. 2.6.0 색 토큰 후속 결과 (2026-11-22)

색 토큰은 `src/color-tokens.mjs`의 Static Kit 자체 팔레트만 선택한다. `colorPaletteOptions()` 공개 탐색 결과는 `static-kit` 하나이며, 기존 427개 Coolors 항목은 하위 호환 입력과 기존 테마 참조로 남아 있다. 새 외부 팔레트 수집·공개 탐색은 추가하지 않았다.

팔레트는 brand·neutral·auxiliary·status·chart 시드로부터 50~950 램프를 만들고 primitive → semantic → state → component 참조 그래프로 계산한다. `color-token` 재료 257개가 그래프 토큰과 부품 소비 별칭을 등록한다. Button/Input/Select/Card/Table/Chart 사용 계약, CSS 변수 이름과 기본·hover·active·disabled·error·focus 사용 선택자는 [색 토큰 읽기 API](color-tokens.md)에 기록한다.

라이트·다크 모드에서 본문/보조·링크·상태색과 표면, focus, 버튼 상태, disabled, 차트 대비를 검사한다. `auto`는 두 모드를 모두 검사한다. 팔레트 ID는 닫혀 있으며 색상 문자열은 입력받지 않는다. 2.6.0만 색 토큰 CSS를 출력하고 기본 2.4.0 및 2.4.0·2.5.0 고정 산출물은 그대로 유지한다.

## 6. 차트 확장의 2.6.0 연결(통합 브랜치 보정)

통합 브랜치에서 차트 작업이 `nodeSpecs.chart`를 직접 넓혀 2.4.0 카탈로그 계약(`site/v1/catalog.json`, 2.4.0·2.5.0 노드 명세)이 바뀌었다. 호환성 위반이므로 `src/catalog/nodes.mjs`의 chart 명세는 되돌렸고 `catalogSnapshot()`은 고정 snapshot 바이트와 같다. 새 형태와 필드는 **버전별 노드 명세 확장 표**로 옮겨 2.6.0 opt-in 게이트(`atLeast(catalogVersion, '2.6.0')`)에 붙였다. `catalogVersion: "2.6.0"`을 고른 Blueprint만 새 형태를 받는다.

| 항목 | 위치 | 상태 |
|---|---|---|
| 확장 표 | `src/catalog/node-extensions.mjs`: `NODE_SPEC_EXTENSIONS['2.6.0'].chart`(kind enum 4개 `stacked-bar`·`scatter`·`heatmap`·`sparkline`, `xLabel`, `yLabel`, `axis`, `series.points`, `unit` 20자, `categories` 64자, 계열 이름 40자). `nodeSpecAt(type, version)`·`nodeExtended(type, version)` | 연결됨 |
| 검증 | `src/validate.mjs`: 노드 명세는 `nodeSpecAt(n.type, input.catalogVersion)`. chart 값 검사는 `nodeExtended('chart', ...)`가 참일 때만 새 규칙(`CHART_SHAPE`·`CHART_AXIS`), 아니면 이전 검사 그대로 | 연결됨. 2.4.0·2.5.0은 새 kind를 `ENUM`, 새 필드를 `UNKNOWN_KEY`로 거부한다(`tests/chart-presets.test.mjs`) |
| 렌더러 | `src/render/chart.mjs`(새 형태), `src/render/chart-legacy.mjs`(기존 5종·확장 필드 없는 입력은 이전 바이트 유지) | 그대로 사용. 2.6.0 Blueprint를 `compile()`하면 새 형태가 렌더된다 |
| 프리셋 재료 | `src/materials/chart-presets.mjs`(8개), `src/render/chart-presets.mjs` | 그대로 사용. 예시는 2.6.0으로 `compile()` 검증 |
| 진단 힌트 | `src/service/errors.mjs`: `CHART_AXIS`, `CHART_VALUE`, `CHART_PRESET` | 있음 |

남은 일(다른 작업자). 1·4·5번은 §7에서 처리했다:

1. `site/v1/blueprint.schema.json`과 `blueprintSchema()`는 아직 기본 chart 명세만 보인다. 2.6.0 문서의 chart 확장을 스키마에 `x-since: 2.6.0`으로 드러낼지 정한다. 드러내면 스키마 파일만 바뀌어야 하고 `catalogSnapshot()`(2.4.0 snapshot)은 `nodeSpecs`만 읽으므로 그대로 둔다.
2. `component:chart` 재료의 `variants`를 읽는 `src/materials/adapters.mjs`는 기존 5종만 보여준다. 새 형태를 재료 목록에 보일지 정한다.
3. `renderChart`는 입력 모양(`axis`·`xLabel`·`yLabel`·새 kind)으로 경로를 고른다. 2.6.0 게이트로 바꿀지 정한다. 바꾸더라도 2.4.0·2.5.0 입력은 `renderLegacyChart`가 이전 바이트를 내야 한다.
4. Select·Table 노드(`select-control`, `data-table`)를 같은 확장 표에 넣고 검증기·렌더러에 연결한다(`docs/materials/select-table.md`의 연결 지점).
5. `TABLE_COLUMNS`·`TABLE_ROWS`는 Table 재료의 `validation.codes`에 적혀 있으나 현재 어디서도 내지 않아 힌트를 더하지 않았다. 내기 시작하는 작업이 힌트 표 항목을 함께 둔다.

## 7. 2.6.0 조립 연결 결과(feat/wire-260)

등록만 되고 Blueprint로 고를 수 없던 재료를 `catalogVersion: "2.6.0"` Blueprint에서 고르고 편집·컴파일하게 이었다. 2.4.0·2.5.0 입력·출력·`site/v1/catalog.json` 바이트·고정 해시는 그대로다(해시 파일을 다시 만들지 않았다).

| 재료 | Blueprint에서 고르는 자리 | 구현 |
|---|---|---|
| Select(`component:select-control`) | 노드 `select-control` | `NODE_SPEC_EXTENSIONS['2.6.0']['select-control']`(필드·example), 검사는 `src/validate.mjs`(`SELECT_OPTIONS`·`SELECT_COMBO`), 렌더는 재료의 `renderSelect`와 `selectStyles`, 런타임은 재료의 `attachSelect` 소스 |
| Table(`component:data-table`) | 노드 `data-table` | 같은 표의 `data-table`, 검사 `TABLE_COLUMNS`·`TABLE_ROWS`·`STATE_DATA`, 렌더 `renderDataTable`·`tableStyles`·`attachTable` |
| 새 차트 형태·8프리셋 | 노드 `chart`(kind 4개·축 필드) | §6의 확장 표 그대로. 프리셋은 `resolveChartPreset`이 chart 노드를 만든다 |
| 역할 타이포 4프리셋(`type-role-preset`) | 최상위 `typeRoles`: erp·dashboard·document·marketing | `renderRoleTypeCSS`가 `:root`의 `--kit-t-title·app·heading·body·label·caption·stat·price`, 제목·본문 서체와 굵기·행간·자간을 프리셋 값으로 덮는다. 좁은 화면(720px 이하)과 레이아웃 리비전 2의 `-raw` 별칭도 맞춘다. manifest에 `typeRoles` 기록 |
| static-kit 색 토큰 257개 | 최상위 `colorPalette: "static-kit"`(이미 연결됨) | 컴파일 CSS 반영을 `tests/wire-260.test.mjs`가 light·dark·auto로 확인 |

결정과 이유:

- **노드를 확장 표에 노드째 둔다.** 기본 `nodeSpecs`·`nodeTypes`에 넣으면 2.4.0 snapshot이 바뀐다. 확장 표 항목에 `label`이 있으면 새 노드이고, `placeLike`가 가리키는 부품(`form`, `table`)을 받는 부모(page·section·split·aside·tab)가 같은 2.6.0 게이트 뒤에서 새 노드도 받는다. grid·bento 등은 받지 않는다. 2.5.0 이하에서 새 노드를 쓰면 `VERSION_FIELD`(올리는 방법을 안내)이고, 아예 모르는 type은 그대로 `NODE_TYPE`이다.
- **Select의 async 검색은 정적 페이지에서 거부한다**(`SELECT_COMBO`). 생성 페이지에는 옵션 provider도 네트워크(`connect-src 'none'`)도 없어 동작하지 않는 검색 상자가 된다. `multiple + async`도 같은 코드다. `disabled + loading/error`는 `state` 한 필드(`ready|loading|error|disabled`)라 표현할 수 없다.
- **표 행은 `{열 id: 값}` 객체다.** 검증기 `value()`에 `additionalProperties: 스키마`·`oneOf`·boolean·null 해석을 더했다(기존 스키마에는 영향이 없다). 셀은 문자열·숫자·불리언·null이고, 보이지 않는 행(`loading`·`error` 상태, `empty`)을 거부해 콘텐츠를 숨기지 않는다.
- **DOM id 접두**: 노드 `id`는 렌더에서 `select-`·`table-` 접두가 붙어 생성 id(`block-N`, `field-*`)와 겹치지 않는다.
- **페이지 유형**: `data-table`은 `table`이 요구·금지되는 규칙에서 `table`과 같게 센다. 허용 목록(`allow`)에는 `table`이 없으면 `data-table`도 없다.
- **컴파일 경로의 재료 import는 `select`·`table`·`typography` 세 파일뿐이다**(렌더·스타일 코드 재사용). 레지스트리·어댑터는 `src/service/materials.mjs`만 읽는다(`tests/materials-registry.test.mjs`, `tests/wire-260.test.mjs`가 검사).
- **스키마(`blueprintSchema()`)**: 기존 `$defs`(55개)와 `properties`는 줄 삭제 없이 그대로이고, `typeRoles` 속성(x-since 2.6.0)과 루트 주석 `x-extensions['2.6.0']`만 더했다. `x-extensions`에는 차트 확장·`select-control`·`data-table`의 전체 정의(각각 `x-since: 2.6.0`)와 새로 받는 자식 목록(`children`)이 있다. 기존 `$defs.chart`를 넓히지 않은 이유는 2.4.0·2.5.0 정의가 바뀌지 않아야 해서다. `site/v1/blueprint.schema.json`이 바뀌어 `apps/web/e2e/compat.spec.mjs`의 v1 고정 해시를 갱신했다(`catalog.json`은 그대로).
- **서비스 읽기 질의**(`./service`로 내보냄, package exports는 그대로): `listMaterials`(종류·분류·맥락·등급·프리셋·since·검색·쪽 나누기, 각 재료가 Blueprint의 어디서 고르는지 `blueprint` 필드), `getMaterial`, `getColorTokens`(팔레트·모드·계층 또는 문서의 값으로 해석), `getTypePresets`(4프리셋과 컴파일 CSS). `getComponentSpec`·`getSchema({target:'component'})`·`listCatalog({kind:'components'})`는 `catalogVersion:"2.6.0"`을 주면 확장 부품과 넓어진 차트를 보인다(기본은 그대로).
- **편집 연산**: `insertNode`는 검증기를 거치므로 그대로 새 노드를 받는다. `insertableParts`·`addPlacements`는 `doc.catalogVersion`으로 후보를 정해 2.6.0 문서에만 확장 부품을 낸다(`partTypesAt(version)`, `partExample(type, version)`). 대조 테스트(`tests/edit-applicability.test.mjs`)는 2.4.0·2.5.0·2.6.0 세 버전의 모든 컨테이너에서 실제 `insertNode` 결과와 후보를 비교한다.

웹(다른 작업자)이 이어야 할 연결점. 이번 작업은 `apps/web`을 바꾸지 않았다.

1. `apps/web/features/studio/components/StructurePanel.tsx:87`의 `api.core?.edit.partExample(type)`은 버전을 넘기지 않아 확장 부품의 기본 노드를 못 얻는다. `partExample(type, doc.catalogVersion)`으로 부르면 된다. `apps/web/features/studio/core.ts:16`의 타입 선언에도 `version?: string`을 더한다. 후보 목록(`addPlacements`)은 이미 버전을 따른다.
2. Studio에 `typeRoles`(역할 타이포) 선택은 `getTypePresets()`, 색 토큰 미리보기는 `getColorTokens({blueprint})`, 재료 화면 목록·상세는 `listMaterials`·`getMaterial`을 쓴다. `updateNode`는 노드 필드만 바꾸므로 `typeRoles`·`colorPalette` 같은 최상위 필드를 바꾸는 편집 연산은 아직 없다(`migrateBlueprint` 또는 문서 교체로만 설정한다).
3. 2.6.0 문서의 Select·Table 미리보기는 컴파일 산출물 안의 고정 런타임으로 동작한다. 앱이 `attachSelect`의 `onOptionsRequest` provider나 `attachTable`의 콜백을 주입하는 경로는 Blueprint 밖의 일이다.

하지 않은 것(이유):

- `renderChart`를 2.6.0 게이트로 바꾸지 않았다(§6의 3번). 입력 모양으로 경로를 고르는 현재 동작이 2.6.0 Blueprint에서 올바르게 동작하고, 게이트를 더 넣으면 `renderLegacyChart`와 이중 분기가 생긴다.
- `component:chart` 재료의 `variants`는 기존 5종 그대로다(§6의 2번). 새 형태는 `chart-preset` 재료와 `getMaterial`의 `blueprint.kind`로 드러난다.
- 표 선택 상태(`selected`)와 페이지네이션은 노드 필드로 열지 않았다(재료의 "미제공" 목록 그대로).
- 표 열 라벨은 콘텐츠 지문(`PRESENTATION_FIELDS`의 `columns`)에서 빠진다. 기존 `table.columns`와 같은 처리이며, 구성 변형 연산이 data-table을 건드리지 않는다.

