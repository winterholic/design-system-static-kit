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
| 차트 | 막대·가로막대·선·면적·도넛 SVG(`src/render/chart.mjs:70`), 모양 검증(`src/validate.mjs:185`; `tests/compiler.test.mjs:86`), 대체 텍스트·데이터 표(`tests/compiler.test.mjs:194`) | 차트 채움 레시피 규칙(`src/catalog/recipes.mjs:17`) | 계열 3·범주 8 한도 안의 kind 5값뿐, 프리셋 없음 | 차트 프리셋 라이브러리(축·범례·단위·주석 묶음), 순차 색 |
| 구역·레시피 | 템플릿 85(`src/catalog/templates.mjs:530`; `tests/catalog.test.mjs:131`), 레시피 3(`src/catalog/recipes.mjs:59`; `tests/recipes.test.mjs:12`), 구성 변형(`src/catalog/variants.mjs:174`; `tests/variants.test.mjs:9`) | 컨셉 17(`src/catalog/concepts.mjs:13`) | — | 레이아웃 패턴(슬롯 단위 구역 조합)을 재료로 고르는 경로 |
| 상호작용·모션·상태 | reduced-motion 차단(`src/styles/base.mjs:94`), 포커스 링(`src/styles/base.mjs:60`), 탭 키보드(`src/render/index.mjs:16`; `tests/compiler.test.mjs:198`) | motion 3값과 이징 1개(`src/styles/base.mjs:28`, `:49`), 칩 토글(`src/render/index.mjs:17`) | elevation `hover` 그림자만 상태 표현 | disabled·loading 버튼, 상태 전이 표, 지속시간·이징 토큰 세트 |

`catalogRegistry()`로 등록한 부품 55개 중 50개가 `verified`다. 이 판정은 예시 한 개가 검증·컴파일된다는 뜻이다(`tests/catalog.test.mjs:116`). 모든 변형 값을 각각 검증했다는 뜻은 아니다. 예시가 없는 page·tab·lane·task·plan은 부모 예시로만 그려지므로 `implemented`로 둔다. 부품 28개는 CSS에서 반응형 전략을 읽을 수 없어 `responsive.strategy: unspecified`다. 그 목록은 `registry.filter({kind: 'component'})` 결과로 확인한다.

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
| Coolors 렌더 목록 2026-10-18 (테마 배정분) | 160 | `docs/evidence/coolors-palettes.json`(관측 814개). 160개 모두 관측 목록에 있다 | **기존 사용 유지, 조건 미확인.** 색 값과 원본 URL, 관측일이 남아 있다. Coolors 이용 조건과 팔레트 이름 재사용 조건은 확인하지 못했다(확인 필요). 외부 재배포 전에 확인한다 |
| Coolors 인기 목록 2026-10-20 (라이브러리) | 267 | `docs/evidence/coolors-popular-2026-10-20.json`(관측 1,288개). 267개 모두 관측 목록에 있다 | 위와 같다. 좋아요 수(77개는 미관측 null)는 출처 표시용이며 품질 근거로 쓰지 않는다 |
| yehsb123/design-system-kit (AGPL-3.0) | 0 | `docs/sources.md` | 축 이름·수량 같은 사실만 기록하고 코드·토큰·CSS는 복사하지 않았다. 유지 |
| winterholic-design-system | 0 | 본인 저장소, 라이선스 미지정 | 구조만 참고 |

모든 팔레트 재료는 `source.license: 'unverified'`와 같은 판정 문구(`PALETTE_SOURCE_VERDICT`, `src/materials/adapters.mjs`)를 가진다. 이 상태는 `tests/materials-registry.test.mjs`가 강제한다. 이번 단계에서 새로 수집하지 않았다. 법률 판단이 아니다.

## 4. 구현 우선순위

1. **계층 색 토큰**(`color-token` 종류): 팔레트 → 램프 → 의미(surface·text·border·action·status·interactive·chart) → 컴포넌트. 2.6.0에서만 켜고 기존 역할 27개는 의미 층 별칭으로 유지한다. 순차·발산 차트 스케일과 상호작용 색(hover·pressed·selected·disabled)을 포함한다.
2. **상태 계약 채우기**: 버튼·필드의 disabled·loading·invalid와 전이 표. 지금 전이가 있는 부품은 tabs·form·filter-bar 셋뿐이다.
3. **Select·Table 심화**: 커스텀 Select(키보드·listbox), 표 정렬·선택·빈/오류 상태와 페이지네이션 연결.
4. **차트 프리셋**(`chart-preset` 종류): kind × 축·범례·단위 묶음을 완성 프리셋으로 등록한다.
5. **서체 시스템**: 숫자 역할과 프리셋별 크기 표를 재료 ext로 노출한다.
6. **레이아웃 패턴**(`pattern` 종류)과 **디자인 프로필**: 템플릿 슬롯을 재료 id로 고르게 한다.
7. **반응형 기록**: `responsive.strategy: unspecified`인 부품 28개를 실제 CSS 근거로 채운다.
8. **모션 토큰**: duration·easing 이름 토큰, 상태 전이와 연결한다.

## 5. 2.6.0 색 토큰 후속 결과 (2026-11-22)

색 토큰은 `src/color-tokens.mjs`의 Static Kit 자체 팔레트만 선택한다. `colorPaletteOptions()` 공개 탐색 결과는 `static-kit` 하나이며, 기존 427개 Coolors 항목은 하위 호환 입력과 기존 테마 참조로 남아 있다. 새 외부 팔레트 수집·공개 탐색은 추가하지 않았다.

팔레트는 brand·neutral·auxiliary·status·chart 시드로부터 50~950 램프를 만들고 primitive → semantic → state → component 참조 그래프로 계산한다. `color-token` 재료 257개가 그래프 토큰과 부품 소비 별칭을 등록한다. Button/Input/Select/Card/Table/Chart 사용 계약, CSS 변수 이름과 기본·hover·active·disabled·error·focus 사용 선택자는 [색 토큰 읽기 API](color-tokens.md)에 기록한다.

라이트·다크 모드에서 본문/보조·링크·상태색과 표면, focus, 버튼 상태, disabled, 차트 대비를 검사한다. `auto`는 두 모드를 모두 검사한다. 팔레트 ID는 닫혀 있으며 색상 문자열은 입력받지 않는다. 2.6.0만 색 토큰 CSS를 출력하고 기본 2.4.0 및 2.4.0·2.5.0 고정 산출물은 그대로 유지한다.
