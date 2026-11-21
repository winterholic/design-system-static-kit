# Core 표현력 실험 보고서

- 브랜치 `next/f-expressiveness`, 기준 `main` f1d250cf2, 카탈로그 2.4.0
- 범위: 실험과 제안까지. `src/**`는 수정하지 않았다(`git diff main -- src` 비어 있음). 이 문서의 표 일부는 `build-report.mjs`가 `specs.mjs`, `verdicts.mjs`, `cases/results.json`, `negative-probes-results.json`에서 생성한다.
- 시각 판단은 1280px·390px 캡처를 직접 보고 내렸다. 자동 검사 통과(validate·check·가로 넘침 0)는 미감 평가가 아니다. 직접 본 캡처는 15개 사례의 1280px 전부, 390px은 01·12·13이고 나머지 390px은 가로 넘침 측정만 했다(7절).

## 0. 결론

1. 15개 유형을 현재 문법으로 모두 검증·컴파일·`check`까지 통과시켰다. 그러나 원하는 요소 {{TOTAL}}개 중 완전히 구현된 것은 {{OK}}개뿐이고 {{PART}}개는 부분, {{NO}}개는 불가였다.
2. 부족의 대부분은 "무엇이 더 중요한가"를 정하는 수단의 부재다. 비율(히어로·분할), 강조 칸, 풀쿼트 크기, 섹션 여백과 배경 리듬, 전폭 사진이 반복해서 막혔다. 서체·모서리·깊이 같은 기존 축은 대체로 충분했다. 예외는 형광색으로, 라이트 모드에서는 대비 게이트가 어둡게 옮긴다.
3. 작성자 선택 실패가 생각보다 많았다. 첫 시도에서 놓쳐 막힌 것으로 기록했다가 문법 안의 해법을 찾은 것이 7건이다(월/연 전환, 색 블록 둘, 두 트랙 나란히, 점선 메뉴 단 배치, 불규칙 갤러리, 가격 먼저, 어두운 히어로). 2건은 해법이 부분적이다(두 트랙, 갤러리). AI가 카탈로그를 탐색하는 경로(조합 예시·탐침)가 필요하다는 근거다.
4. 강제 규칙 11개(X01~X11) 중 반사실 실험으로 전제가 재현된 것은 X02 하나, 부분 재현은 X01뿐이다. X03·X06·X07은 전제가 재현되지 않았다(5절). 변형 계약 V01~V06은 직접 작성한 Blueprint에는 적용되지 않는다(ADR 0006 호환 정책, 11번 사례로 확인).
5. 제안은 5개로 줄였다(6절). 모두 닫힌 enum 필드이고 자유 CSS가 없다. 색 블록 surface 제안은 `split` 안의 `cta` 둘로 가능함이 확인되어 접었다.
6. 표현력과 별개의 렌더러·계약 결함 5건을 찾았다(4.3절). 제안이 아니라 수정 후보다.

## 1. 방법

| 단계 | 내용 | 파일 |
|---|---|---|
| 정의 | 구조·스타일을 글로 먼저 고정하고 항목마다 "원하는 것" 6개를 적었다 | `specs.mjs` |
| 작성 | 현재 Blueprint 문법만으로 작성. 첫 오류와 수정은 `cases/attempts.log`에 남는다 | `cases-src/*.mjs` → `cases/*.json` |
| 실행 | `kit validate` → `compile` → `kit build` → `kit check` → Chromium 캡처 1280·390 | `run-cases.mjs` |
| 측정 | 눈으로 의심한 항목을 DOM 수치로 확인. `probe-results.json`은 최종 사례 기준이고 초안 수치(grid 카드 384px, 요금제 452px)는 판정 근거 열에 옮겨 적었다 | `probe.mjs` → `probe-results.json` |
| 부정 탐침 | 원하는 것을 쓰려 했을 때 검증기의 답 | `negative-probes.mjs` |
| 반사실 | `axisBans`를 비운 `src` 복사본(`/tmp/expr/nb`, 원본 무수정)으로 금지 조합을 실제로 렌더 | `counterfactual.mjs`, `counterfactual2.mjs` |
| 판정 | 캡처와 수치를 보고 ○·△·✕와 원인을 적음 | `verdicts.mjs` |

원인 분류: A 작성자·AI 선택 실패, B 카탈로그 표현력, C 렌더러, D 자산 부족, E 규약이 막음. 정적 범위 밖 동작(카운트다운 계산 등)은 E로 적었다(`docs/design.md` 13절).

한계: 모든 사진 자리는 일러스트 모티프이므로 "사진 중심" 사례의 시각 품질은 실제 사진일 때와 다르다(D). 사례마다 한 사람이 한 번 작성했고 반복 시도 횟수는 `attempts.log`가 전부다. 사용자 승인이나 미감 보증이 아니다.

## 2. 사례 정의 (15개)

외부 이미지·문구를 복사하지 않고 구조만 적었다.

{{DEFS}}

## 3. 사례별 결과

### 3.1 실행 결과

{{EXEC}}

산출 파일({{CAPCOUNT}}개 캡처): {{FILES}}

### 3.2 항목별 판정

{{SUMMARY}}

{{TABLES}}

## 4. 원인 분석

### 4.1 원인별 집계

{{CAUSES}}

B(카탈로그)가 가장 많고 C(렌더러)가 그다음이다. A(작성자)는 △·✕ 항목에는 2건뿐이지만, 첫 시도에서 놓쳤다가 ○로 해결한 항목이 {{OKA}}건 더 있어 합치면 7건이다. E(규약)는 소수지만 모두 "스타일을 한 단계 더 밀고 싶을 때" 걸렸다(X06 계열, 밴드 상한, 형광색 대비 게이트).

### 4.2 부정 탐침: 검증기는 무엇이라 답하는가

{{NEG}}

해석:
- `UNKNOWN_KEY`, `ENUM`, `CHILD_TYPE`, `ARRAY_LENGTH`는 문법에 수단이 없다는 뜻이다(B). 같은 오류 코드 아래 "수단이 없음"과 "있지만 금지"가 섞이지 않아 원인 분류가 쉬웠다.
- `AXIS_BAN`, `THEME_FORBID`, `PAGE_FORBID`는 수단은 있고 조합이 막힌 경우다(E).
- N10(요금제 두 개를 탭에 넣고 둘 다 추천)은 통과했다. R13 `FEATURED_PLAN`은 pricing 노드마다 하나이지 페이지당 하나가 아니다. 설계서 8절의 "요금제 추천 하나"는 이 범위를 적지 않았다.
- N31(대조군)은 변경 없이 통과해야 하며 통과했다.

### 4.3 반복 관찰된 결함

표현력 결함(제안으로 이어짐)은 6절에, 아래는 렌더러·계약 결함이다. 각각 재현 사례와 수치가 있다.

| ID | 결함 | 증거 | 사례 |
|---|---|---|---|
| R1 | 히어로 직후 섹션의 머리말이 위쪽 여백 0으로 붙는다. 페이지 `backdrop`이 tint일 때 히어로 아래가 canvas 색으로 끝나 경계가 보이는데 P03은 이를 보지 못한다 | `composition.mjs:39` afterHero 사실에 backdrop이 없다. 측정(최종 사례): 07(backdrop tint)의 다음 섹션 `paddingTop 0px`, 머리말이 섹션 위에서 0px(`probe-results.json`). 03·09(backdrop plain)도 0px이지만 히어로가 canvas로 끝나 경계가 보이지 않는다. 캡처: 07 최종과 반사실 07 변형(`counterfactual/X05-1280.jpg`, `X07-1280.jpg`)에서 히어로 하단 경계에 "프로그램"이 닿는다. 14 초안(히어로 바로 뒤 "모금 현황")에서도 같은 모양을 봤으나 최종 사례는 색 블록 `split`을 끼워 사라졌고 초안 캡처는 남기지 않았다 | 07, 14(초안) |
| R2 | `surface: plain`을 명시해도 짝수 번째 섹션이 자동으로 soft 배경이 칠해진다. 끌 방법이 없다 | `shells.mjs:22`의 `[data-surface=plain]:nth-child(even)`. 측정: 11의 1·3번 섹션 `rgb(46,46,45)`, 10의 1번 `rgb(252,237,240)` | 10, 11 |
| R3 | device 목업을 3:4 `media`로 쓰면 위성 칩이 오른쪽에서 잘리고 높이가 795px까지 커진다 | `svg viewBox 0 0 240 320`, `overflow:hidden`, 캡처 | 13 |
| R4 | `gallery showcase`의 큰 사진이 1:1로 전폭을 채워 약 1180px 높이가 된다 | 캡처 05 | 02(초안), 05 |
| R5 | V04 계열 정렬 불일치(가운데 머리말, 왼쪽 본문)가 직접 작성한 Blueprint에서는 검증을 통과한다. 변형 계약은 템플릿 조립 경로에만 닿는다 | 11의 `철학` 섹션: 머리말 가운데(중심 x 640), 본문 start(왼쪽 x 32), `validate` VALID. ADR 0006 호환 정책 문장 | 11 |

그 밖의 관찰(수정 후보, 근거 약함): 히어로 `visual: device`가 CLI 도구 소개에 수면 앱 화면을 보여 준다(15, D). `code`의 라벨과 언어가 "bash bash"로 겹쳐 나온다(15). 390px에서 4열 기사 카드가 전폭 1열 4개로 쌓여 뉴스형 밀도가 사라진다(12). 추천 요금제는 크기·위치가 같고 테두리와 배지만 다르다(04, 측정 323×409 동일(초안 323×452도 동일)).

## 5. 강제 규칙 분류

분류 기준
- **불변**: 접근성, 데이터 보존, 구조 무결성. 어떤 스타일에서도 풀지 않는다.
- **스타일별 품질**: 특정 값 조합에서 측정 가능한 결함을 막는다. 임계값이 근거여야 하고 근거가 낡으면 갱신한다.
- **취향**: 측정 가능한 결함이 없고 "그렇게 보이면 보기 나쁘다"에 가깝다. 경고·추천이면 충분하고 거부는 과하다.

반사실 실험의 뜻: `axisBans`를 비운 복사본으로 같은 Blueprint에 금지 조합을 적용해 렌더한 뒤 금지의 전제(문구가 말한 결함)를 측정했다(`counterfactual*.mjs`). "재현"은 전제가 측정으로 확인됐다는 뜻이다. 모든 사례에서 `kit validate`는 금지 조합을 거부했다(`realValidatorRejects: true`).

### 5.1 축 조합 금지 X01~X11 (`src/catalog/axes.mjs`)

| ID | 조합 | 분류 | 근거 | 권고 |
|---|---|---|---|---|
| X01 | density compact × shell dock | 스타일별 품질(내부 임계) | CF:X01·`counterfactual2`: dock 390px에서 compact와 comfortable 모두 62px(차이 없음), 1280px에서 compact 40px 대 comfortable 44px. 소스가 인용한 WCAG 2.2 SC 2.5.8의 AA 최소 크기는 24px이고 44px은 별도 기준(SC 2.5.5, AAA)으로 알고 있다(`확인 필요`: 원문 재확인 안 함). 40px도 AA는 통과한다 | 유지하되 근거를 "내부 44px 기준, 데스크톱 폭에서만 해당"으로 고친다. dock은 모바일 셸이므로 실제 영향은 작다 |
| X02 | width narrow × shell sidebar·rail·split | 스타일별 품질(가독성 하한) | 재현됨. `counterfactual2`: narrow에서 본문 열 372px(<480), standard에서 652px. 문구의 "480px 아래"와 일치 | 유지 |
| X03 | width full × shell centered·minimal·editorial·masthead | 취향(근거 약함) | 재현 실패. width full·1920px 화면에서 prose 폭은 wide와 같은 720px(한글 약 52자)이고 `max-width:none`인데도 상한이 걸린다(`counterfactual2` X03). prose 외 부품(목록 설명, 카드 본문)의 줄 길이는 측정하지 않았다(`검증 못함`) | 완화 후보: 02 사례(사진가 포트폴리오)가 이 금지 때문에 minimal+full을 못 썼다(N18). prose 외 부품 줄 길이 측정 뒤 결정 |
| X04 | elevation hard × backdrop gradient | 취향 | 02 기반 반사실 캡처에서 굵은 윤곽이 또렷하고 결함이 보이지 않았다(`counterfactual/X04-1280.jpg`). 문구의 "윤곽"은 주관 판단 | 경고로 전환 후보 |
| X05 | elevation glow × mode light | 스타일별 품질(가시성), 판정 못함 | 반사실 화면(07)에 글로우가 적용된 카드가 첫 화면에 없어 가시성을 판단하지 못했다(`검증 못함`) | 카드가 보이는 화면에서 재측정 |
| X06 | typography mono·terminal × scale dramatic | 스타일별 품질로 적혔으나 전제 미재현 | 37자 영문 제목을 390px에서 렌더: 가로 넘침 0, 제목 38px 두 줄(`counterfactual2` X06). 히어로는 `--kit-fit`로 글자가 컨테이너 폭에 맞춰 줄어든다(`chunks.mjs` hero 규칙). 09 사례가 모노 대문자 거대 제목을 이 금지 때문에 balanced로 내렸다(49.9px) | 완화 후보 |
| X07 | radius bubble × density compact | 스타일별 품질, 전제 미재현 | 07 반사실: compact 카드 안쪽 여백 24px, 반경 28px. 모서리가 내용을 침범하려면 안쪽 여백이 반경×(1−1/√2)≈8px보다 작아야 하는데 24px이다. 문구의 "16px"은 현재 토큰(`SPACE.compact`)과 맞지 않는다. 캡처에서 잘림이 없다 | 근거 문구 갱신 또는 제거 |
| X08 | footer columns × shell minimal·dock | 불변(구조) 후보, 미검증 | 반사실 02(minimal+columns)는 가로 넘침 0이나 푸터를 캡처하지 않았다(`검증 못함`) | 푸터 열이 비는지 재측정 |
| X09 | icon line-fine × density compact | 스타일별 품질, 근거 약함 | 실제 아이콘 18px, 선 굵기 변수 1.5 대 2(`counterfactual2` X09). WCAG 1.4.11은 색 대비 3:1이고 선 굵기를 직접 규정하지 않는다. 색 대비는 이미 R05가 검사한다 | 근거 문구 정정 |
| X10 | backdrop grid × ornament dots | 취향 후보, 판정 못함 | 15 기반 반사실 캡처에 격자는 나오지만 점 장식은 `pattern` 미디어에서만 그려지는데 이 화면에 없어 겹침을 보지 못했다(`검증 못함`) | `pattern` 미디어가 있는 화면으로 재측정 |
| X11 | motion lively × elevation flat | 취향 | 근거는 논리("설명할 깊이가 없다")이고 14 기반 반사실 캡처에서 레이아웃 결함이 없다. 히어로 글자가 흐린 것은 진입 애니메이션(`kit-rise`) 중간 프레임이다 | 경고로 전환 후보 |

요약: 재현 1(X02), 부분 재현 1(X01), 미재현 3(X03·X06·X07), 근거 약함 1(X09), 취향 2(X04·X11), 판정 못함 3(X05·X08·X10).

### 5.2 변형 결과 계약 V01~V06 (`src/catalog/variant-contracts.mjs`)

| ID | 주장 | 분류 | 근거 |
|---|---|---|---|
| V01 | 히어로 형태를 바꾸며 `visual`을 지우지 않는다 | 스타일별 품질 | 장식(visual) 손실이고 사용자 글이 아니다. 소스의 `CONTENT_FIELDS`에 visual이 없다 |
| V02 | 카드 스타일은 카드의 75% 이상을 바꾼다 | 취향 | "일괄"의 기대 문제이고 접근성·데이터와 무관 |
| V03 | 지표 4개 이하는 한 줄 | 스타일별 품질 | 03 사례에서 `grid four`의 한 줄 지표가 첫 화면 아래에서 읽기 좋았다(캡처). 14 사례의 `grid three` 지표 한 줄도 같다 |
| V04 | 가운데 머리말 아래 본문도 가운데 | 스타일별 품질 | 11 사례에서 위반 상태가 실제로 보인다. 단 직접 작성한 Blueprint에서는 검사되지 않는다(R5) |
| V05 | 적용 전후 렌더 지문이 같은 옵션은 추천하지 않는다 | 메타(추천 품질) | 측정 기반 |
| V06 | 히어로 변형이 `facts`를 지우지 않는다 | 불변(데이터 보존) | `CONTENT_FIELDS = {facts}`, `contentPreserved`와 일치(`variant-contracts.mjs`). ADR 0007 4항 |

효과는 모두 `not-recommended`이고 옵션을 지우지 않는다. 변형 계약은 Blueprint 컴파일에 닿지 않는다(ADR 0006 "호환 정책"). 따라서 AI·사람이 직접 쓰는 경로에는 V계약이 하한을 주지 못한다.

### 5.3 그 밖에 사례에서 마주친 강제 규칙

| 규칙 | 분류 | 근거 |
|---|---|---|
| `THEME_FORBID` (테마별 금지 값) | 취향(테마 정체성) | N20~N23. 예: 브루탈은 flat 금지, 럭셔리는 hard 금지, 스위스는 gradient 금지, 녹턴은 light 금지. 테마가 시각 언어를 정의하는 방식이므로 취향이지만 테마 선택으로 우회할 수 있어 해롭지 않다 |
| `PAGE_FORBID`·`PAGE_REQUIRE` (페이지 유형) | 구조 | N24(문서에 히어로), N25(랜딩에 toc). 유형이 구조 의도를 정한다 |
| `REQUIRED` 중 `hero.body`, `card.body`, `prose.title`, `section.title` | 취향·편의(불변 아님) | N13~N15, N17. 접근성이나 데이터 보존 때문이 아니라 빈 요소를 막으려는 규칙이다. 11 사례(한 문장 히어로, 이름·가격만 있는 제품)가 이 때문에 우회(menu plain)했다. 제목 계층은 R03이 이미 구조에서 계산한다 |
| `STRING` 빈 표 셀 | 불변(데이터 보존) | N16. 빈 문자열 대신 "—"를 쓰게 한다(04, 08에서 실제로 마주침) |
| `UNKNOWN_KEY`, `ENUM`, `CHILD_TYPE`, `ARRAY_LENGTH` | 불변(닫힌 문법) | R01·R02. 이 실험의 모든 제안도 이 닫힌 문법 안에서 필드를 더한다 |
| R04 주 액션 하나, R06 상태 데이터, R14 대체 텍스트, R17 앵커 | 불변 | 14 사례의 단일 주 행동, 01·04·13 사례의 `ANCHOR_MISSING`(내비가 선언된 앵커만 가리키게 함) 등 사례에서 오히려 도움이 됐다 |
| `SPACE` 밴드 상한(spacious 104px), S09 순서 | 스타일별 품질 | 11 사례가 150px 이상을 원했으나 불가. S09의 순서 불변(gap<section<band)은 유지하되 단계를 하나 더 두는 것은 제안 EX-4 |

## 6. 확장 제안 (5개)

공통 원칙: (1) 닫힌 enum 필드 하나씩, (2) 기존 토큰·역할·간격 값으로만 해석, (3) 검증기가 거부하는 규칙을 함께 정의, (4) 필드를 쓰지 않은 Blueprint의 HTML·CSS 바이트는 변하지 않는다.

해시 공통 사항: `src/styles/index.mjs`는 사용한 노드 타입의 CSS 덩어리를 통째로 붙인다(`chunks[type]`). 덩어리 안에 규칙을 추가하면 그 타입을 쓰는 모든 기존 출력의 CSS 해시가 바뀐다. 2.1~2.3 고정 출력(`PAGE_RULE_LEGACY_VERSIONS`, `LEGACY_LAYOUT_VERSIONS`)을 깨지 않으려면 `flowCSS(flowUsage(body))`처럼 **사용한 속성값만 내는 방식**이어야 한다. ADR 0005는 신규 정책을 `catalogVersion` 변경으로만 채택한다고 정했으므로 모든 제안은 2.5.0에서 켜고 2.4.0 입력은 새 필드를 거부한다(`확인 필요`: 버전별 필드 허용 구현 방식은 구현 단계에서 `validate.mjs`와 맞춘다). `site/v1/catalog.json`·`blueprint.schema.json`과 `docs/*.html`은 모든 제안에서 재생성되어 해시가 바뀐다. 아래 "해시 영향"은 Blueprint 출력(`index.html`·`tokens.css`·`manifest.json`)에 대한 것이다.

관찰 근거 요약

| 제안 | 사례 | 항목 |
|---|---|---|
| EX-1 비율 | 01, 02, 13 | hero-asym, split-70-30, (5:5 고정) |
| EX-2 강조 칸 | 01, 04, 12 | span-feature, plans-3-featured, top-story |
| EX-3 풀쿼트 | 01, 13 | pullquote-big, big-testimonial |
| EX-4 섹션 리듬 | 01, 03, 10, 11, 12 | density-by-zone, compact-landing, bw-red(R2), generous-whitespace |
| EX-5 전폭 미디어 | 02, 05, 11, 14 | hero-fullbleed-image, scene-fullwidth, single-fullwidth-photo |

### EX-1 비율 토큰: `hero.ratio`, `split.ratio` 확장

- **스키마 초안**: `hero.ratio: en('even', 'copy', 'visual')`(기본 even=현재 1.05:0.95), `split.ratio`에 `'dominant-start'`, `'dominant-end'` 추가(약 70:30). 숫자나 임의 비율은 없다.
- **검증 규칙**: `hero.ratio`는 `visual`이 있는 `split`·`product` 히어로에만(`VARIANT_REQUIRES`, `validate.mjs:120`의 기존 HERO_VISUAL 검사 옆). `split.dominant-*`는 자식이 둘이고 좁은 폭(컨테이너 폭 기준)에서 한 열로 접힌다(현재 `data-ratio`와 같은 규칙).
- **6문항**: ① 기존 문법으로 불가능한가: 예. N04 `UNKNOWN_KEY`, 히어로 측정 527:527, split 최대 60:40(710:474). ② 재사용성: 매거진·포트폴리오·앱 소개·상품 상세 등 이미지:글 비중이 정체성인 유형 전반(3개 사례+). ③ 검증기로 강제 가능한가: 예. enum과 조합 조건. ④ 무제한 CSS보다 안전한가: 예. 값 3개가 `grid-template-columns` 세 줄로만 해석된다. ⑤ 하위 호환: 필드 미사용 출력 불변(렌더가 속성을 쓰지 않으면 HTML 동일). 사용 시에만 CSS를 내도록 한다. ⑥ AI가 탐색 가능한가: `blueprintSchema()` enum에 뜻 설명을 달면 된다. 현재 `UNKNOWN_KEY` 응답은 "수단이 없음"과 "있지만 조건 불일치"를 구분하지 못하므로 오류 메시지에 허용 값을 싣는 것이 함께 필요하다.
- **컴포지션 연동**: C16(split 폭 예산)의 최소 칸 폭 계산이 30% 열에서도 성립해야 한다(`composition.mjs`의 `data-aside-min` 계열 확인 필요).
- **영향 파일**: `src/catalog/nodes.mjs`(필드), `src/render/nodes.mjs`(`R.hero`·`R.split` data 속성), `src/styles/chunks.mjs`(hero·split 열 규칙, 사용 게이트), `src/validate.mjs`, `src/catalog/index.mjs`(스키마·버전), `src/composition.mjs`(split 폭 예산), 테스트·문서.
- **해시 영향**: Blueprint 출력은 필드 미사용 시 불변(게이트 전제). 카탈로그 JSON·스키마는 변함.

### EX-2 강조 칸: `card.featured`(grid 안), 추천 요금제의 시각 비중

- **스키마 초안**: `card.featured: en('yes')`(`plan.featured`와 같은 이름·값). 허용 위치는 `columns`가 three·four인 `grid`와 `bento`의 첫 칸.
- **검증 규칙**: 한 `grid`에 `featured` 카드는 하나(`FEATURED_CARD`, `FEATURED_PLAN`과 같은 방식, `validate.mjs:123` 인근). 자식이 3개 이상. `bentoPlan`의 첫 칸(큰 칸)과 충돌하지 않게 bento는 첫 칸만 허용.
- **레이아웃 규칙**: 강조 카드는 2열을 차지한다. 열 수 선택(`bestCols`)은 강조 칸을 2칸으로 세어 마지막 줄에 한 칸만 남는 고아가 없게 한다. 좁은 폭(1열)에서는 같은 폭이다. `lintLayout`·`flowOrphans` 시험에 강조 칸 경우를 더한다.
- **6문항**: ① 불가능한가: 예. N03 `UNKNOWN_KEY`. 01에서 grid는 균등 384px 3칸, bento 3칸은 큰 칸이 사진을 얇은 띠로 자른다(R, 캡처). ② 재사용성: 기사 카드, 뉴스 톱, 요금제, 제품 목록. ③ 강제 가능: 예. 하나만 허용, 위치 제한, 시험. ④ 안전성: 열 폭 2칸 하나뿐이고 값이 없다. ⑤ 하위 호환: 필드 미사용 출력 불변. ⑥ 탐색 가능성: `plan.featured`와 같은 이름이라 유추가 쉽다.
- **함께 고칠 렌더러 사항(스키마 아님)**: 추천 요금제가 테두리와 배지뿐이고 크기가 같다(04 측정). 이것은 기존 출력의 CSS를 바꾸므로 카탈로그 2.5.0에서 켜는 별도 결정이다.
- **영향 파일**: `nodes.mjs`, `validate.mjs`, `src/layout.mjs`(`bestCols`·`flowColumns` 가중), `src/styles/chunks.mjs`, `src/render/nodes.mjs`, `tests/layout.test.mjs`.
- **해시 영향**: 필드 미사용 시 불변. `bestCols` 시그니처를 바꾸면 기존 호출 결과가 같음을 시험으로 고정해야 한다.

### EX-3 풀쿼트: `quote.variant`

- **스키마 초안**: `quote.variant: en('box', 'pull')`(기본 box). `pull`은 상자 없이 큰 인용 글자(기존 role `quote-l`, C25가 읽기 페이지에 이미 쓰는 값)로 그린다.
- **검증 규칙**: `pull`은 `section` 직속 또는 페이지 직속에서만(`grid`·`bento`·`aside` 보조 칸 안은 금지). 인용문 길이 상한 이내(현재 400자).
- **6문항**: ① 불가능한가: 예. N07 `UNKNOWN_KEY`. 01·13 캡처에서 인용은 박스형 한 크기. ② 재사용성: 매거진, 사례 연구, 브랜드 소개, 후기 강조. ③ 강제 가능: 예. 위치·길이. ④ 안전성: 새 글자 크기를 만들지 않고 기존 role을 재사용. ⑤ 하위 호환: 필드 미사용 출력 불변, 사용 시에만 CSS. ⑥ 탐색 가능성: 이름이 직관적.
- **영향 파일**: `nodes.mjs`, `render/nodes.mjs`(`R.quote`), `styles/chunks.mjs`, `catalog/composition.mjs`(C24·C25와 충돌 없는지), `validate.mjs`.
- **해시 영향**: 필드 미사용 시 불변. 대비는 기존 text/canvas 쌍과 같아 R05 전수 검사에 새 쌍이 필요 없다.

### EX-4 섹션 리듬: `section.surface: 'flat'`, `section.space`

- **스키마 초안**: `surface`에 `'flat'` 추가(자동 띠 칠하기에서 제외, 색은 canvas). `space: en('tight', 'normal', 'loose')`(기본 normal=현재).
- **의미**: `tight`는 기존 `bandM`(마케팅) 또는 `sectionS`(앱), `loose`는 새 토큰 `bandL`(마케팅 84·120·156px, 4px 격자) 또는 `sectionL`(앱, 이미 있음). S09의 순서(gap<section<band)는 `band<bandL`을 더해 유지한다. 구역마다 서로 다른 값을 쓸 수 있다(01 구역별 밀도).
- **검증 규칙**: `flat`은 `plain`처럼 SURFACE_NEST 계산에서 면 없음으로 센다. `space`는 enum뿐이며 숫자 불가. `bandL` 추가는 `tests/spacing.test.mjs`의 순서 시험과 S07 격자 시험을 통과해야 한다.
- **6문항**: ① 불가능한가: 예. N06 `UNKNOWN_KEY`. `plain`을 줘도 짝수 섹션이 칠해짐(R2, `shells.mjs:22`, 측정 `rgb(46,46,45)`), 밴드 상한 104px(`SPACE.spacious.band`). ② 재사용성: 스위스·럭셔리처럼 면을 쓰지 않는 스타일, 뉴스·대시보드형 랜딩의 촘촘함, 브랜드 소개의 여백(5개 사례). ③ 강제 가능: 예. enum, 간격 계약(`lintSpacing`)이 토큰 외 값을 막는다. ④ 안전성: 간격 토큰 사다리 안의 값만 고른다. ⑤ 하위 호환: 필드 미사용 시 불변이 되려면 `spaceVars`가 모든 SPACE 항목을 `:root`에 내므로(`spacing.mjs`) `bandL`은 사용될 때만 변수를 내야 한다. ⑥ 탐색 가능성: `surface` enum 설명에 "flat은 면 없음"을 적는다.
- **영향 파일**: `nodes.mjs`, `validate.mjs`(SURFACE_NEST), `src/spacing.mjs`(`SPACE`, `TOKEN`, 순서 계약), `src/styles/shells.mjs`(22행), `src/styles/chunks.mjs`, `src/layout.mjs`(밴드 사용처), `docs/spacing.md` 생성기.
- **해시 영향**: 위 전제를 지키면 Blueprint 출력 불변. 지키지 않으면 모든 2.4.0 출력의 `tokens.css`가 바뀐다.

### EX-5 전폭 미디어: `media.bleed`

- **스키마 초안**: `media.bleed: en('yes')`. `ratio`는 `'16:9'` 또는 `'21:9'`만 허용.
- **의미**: 페이지 직속 `media`가 `--kit-bleed` 토큰(콘텐츠 열 바깥으로 패딩하는 기존 방식)으로 전폭 띠가 된다. C15가 "뷰포트 기준 음수 여백(100vw)을 피한다"고 정한 원칙을 따라 컨테이너 기준으로 구현한다. 390px 이하에서는 콘텐츠 폭과 같다.
- **검증 규칙**: 페이지 직속 자식일 때만(`BLEED_POSITION`). `alt`는 기존대로 필수. 캡션은 사진 아래 한 줄. 한 페이지에서 `bleed` 미디어는 P01의 장면 순환에 포함된다.
- **6문항**: ① 불가능한가: 예. N28 `UNKNOWN_KEY`, N05 `HERO_VISUAL`(cover 히어로에 visual 불가), 사진은 항상 콘텐츠 폭 안(캡처 02·05·11). ② 재사용성: 포트폴리오, 상품 사용 장면, 브랜드 스토리, 캠페인(4개 사례). ③ 강제 가능: 예. 위치·비율. ④ 안전성: 새 CSS 값이 없고 기존 `--kit-bleed`를 재사용한다. ⑤ 하위 호환: 필드 미사용 시 불변. ⑥ 탐색 가능성: 필드 이름이 의미를 설명한다.
- **영향 파일**: `nodes.mjs`, `validate.mjs`, `render/nodes.mjs`(`R.media`), `styles/chunks.mjs`(media 덩어리), `composition.mjs`(C15·P01 페이지 사실), `tests/composition.test.mjs`.
- **해시 영향**: 필드 미사용 시 불변.

### 접은 제안과 이유

| 후보 | 이유 |
|---|---|
| 색 블록 surface(`accent`) | 14에서 `split` 안의 `cta` 둘(brand·inverse)로 구현됨(캡처). 색은 두 가지뿐이라는 한계는 남지만 1~2개 사례다 |
| `grid`에 `table` 허용 | 1개 사례(03). 표는 열 폭이 필요해 3열 칸에서 읽기 어렵다. `split`(2칸)이 대안 |
| 12열 열 지정(스위스 인덱스) | 1개 사례(10). 열 지정은 DSL로 번지기 쉽다 |
| 회전·겹침 | 1개 사례(09). 겹침은 가림·초점 접근성 검사를 새로 요구한다 |
| `list` 번호·썸네일, 스토어 버튼 아이콘, 대문자 변환 | 각각 1개 사례(12, 13, 09) |
| 요금제 추천 비중 | 스키마가 아니라 렌더러 수정(EX-2 안의 별도 결정) |
| 필수 필드 완화(`hero.body` 등) | 확장이 아니라 계약 완화. 5.3절에 근거를 두었고 별도 결정이 필요하다 |

## 7. 2.5.0 통합 결과와 남은 확인 범위

- 초안의 변경을 보존하고 main `ce049dd2e`의 서비스 계층과 통합했다. `kit migrate`는 `--to 2.5.0`을 받을 때만 명시적으로 올리며, 새 문서·템플릿·기본 migrate는 2.4.0이다. 근거와 버전 경계는 [ADR 0010](../../adr/0010-expression-grammar-2-5.md)에 기록했다.
- EX-1~EX-5 필드·enum·검증·서비스 진단·`blueprintSchema`, `getSchema`, `getComponentSpec`, 카탈로그 조회 노출을 같은 정의로 맞췄다. 임의 HTML·CSS·className 경로는 추가하지 않았다.
- `docs/evidence/expression/legacy-2-4-hashes.json`의 100개 기준(85 템플릿 + 15 사례)과 대조했다. 2.5.0에서 기본 템플릿 85개는 오류 없이 검증·컴파일되며, 15개 사례는 모두 검증·컴파일·출력 check를 통과했다. 사례별 경고 2건, 오류 0건은 `cases-2-5-results.json`에 보존한다.
- 검증 실행: `node --test tests/expression-2-5.test.mjs`는 20/20 통과, `npm run verify`는 334/334 테스트와 3,318개 생성 파일 byte-check 통과, `node docs/evidence/expression/verify-cases.mjs`는 15/15 통과했다. 서비스 계약 시험도 전체 검증에 포함했다. Playwright 명령은 시도했으나 nested worker sandbox의 Chromium 실행이 `bootstrap_check_in ... Permission denied (1100)`로 중단됐다. UI 전후 확인은 구성된 브라우저 MCP로 따로 수행했다.
- R1~R4 전후 시각 증거는 `docs/evidence/expression/visual/before/`와 `visual/after/`에 둔다. before는 2.4.0 전체 페이지 캡처, after는 대표 사례 05·07·11·13의 390×900 및 1280×900 화면과 문제 부위 크롭이다. R1은 히어로와 다음 구역 사이 간격, R2는 plain 섹션의 불필요한 교차 배경, R3는 3:4 device 칩 잘림/폭, R4는 showcase 주 이미지 비율을 개선했다. 모든 화면을 모든 폭에서 눈으로 본 것은 아니며, 캡처는 단일 headless Chromium 환경이다.
- X03·X06·X07은 측정 조건을 ADR 0010에 제한해 기록하고 유지했다. X03의 prose 외 카드·목록 줄 길이, X06의 긴 한글·다른 셸/브라우저, X07의 다른 부품·패딩·플랫폼은 미확인이다. X05·X08·X10과 사례의 사진은 이번 시각 검증 대상이 아니며, 일러스트 이미지로 실제 사진의 시각 품질을 보증하지 않는다.
- 직접 판정은 단일 평가자의 관찰이며 눈가림 평가가 아니다. 전체 사례의 모든 조합·기기·브라우저를 보증하지 않는다.

## 8. 재현

```
cd docs/dev/expressiveness
node run-cases.mjs                 # 사례 전체: validate, compile, build, check, 캡처
node probe.mjs                     # DOM 측정
node negative-probes.mjs           # 검증기 부정 탐침
node counterfactual.mjs && node counterfactual2.mjs   # /tmp/expr/nb 필요(아래)
node build-report.mjs              # report.md 재생성
cd ../../..
node --test tests/expression-2-5.test.mjs
npm run verify
node docs/evidence/expression/verify-cases.mjs
PW_PORT=41937 npx playwright test e2e/expression-2-5.spec.mjs --project=chromium
```

반사실 실험은 `src`를 `/tmp/expr/nb/src`로 복사하고 `src/catalog/axes.mjs`의 `axisBans`를 `[]`로 바꾼 사본을 쓴다. `node_modules`는 메인 저장소의 것을 worktree에 symlink했고 git은 무시한다.
