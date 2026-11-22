# 브라우저 레이아웃 검사기 (B단계)

Static Kit의 품질 검증은 세 단계다. A단계는 정적 계약 검사(카탈로그·validate·`combo-grades`), B단계는 실제 Chromium 렌더링 검사, C단계는 사람의 시각 평가다. 이 문서는 B단계 검사기(`scripts/layout-quality/`)를 설명한다.

B단계는 "줄이 몇 줄이냐"를 모든 글에 같은 잣대로 재지 않는다. 글의 역할을 먼저 정하고, 역할마다 다른 규칙을 적용한다. 줄바꿈이나 여백이 있다는 것만으로는 오류가 아니다. 칸 폭 상한이 줄바꿈을 일으켰는지, 읽는 폭이 무너졌는지, 글자가 잘리는지를 본다.

## 사용

```bash
# 실행 중인 사이트의 여러 페이지를 4개 폭(360·768·1280·1600)에서 검사
npm run layout:check -- --base http://127.0.0.1:4310 --paths '/,/docs' --crawl --json out.json
# 컴파일된 HTML 한 장
npm run layout:check -- --file out/my-page/index.html --widths 390,1280
# 검사기 시험(배선 단위 시험 + 픽스처 e2e)
npm run test:layout
```

라이브러리: `checkPage(page, {widths, exemptions})`, `checkHtml(page, html)`(Blueprint 컴파일 결과를 `setContent`로 열어 잰다), `checkUrls(browser, urls)`, `discoverPaths`, `summarize`, `formatReport`. 브라우저 안에서 도는 측정은 `probe.mjs`의 `layoutProbe` 하나이고, 외부 import 없이 `page.evaluate`로 직렬화된다.

공개 사이트 전체 검사는 `apps/web/e2e/layout-quality.spec.mjs`가 `npm run web:test`에서 돈다. 면제 목록은 `apps/web/e2e/layout-quality.exemptions.mjs`다.

## 발견의 형식

모든 발견은 `{code, severity, role, locator, text, evidence, suggestion}`이다. `severity`는 `error`, `warn`, `info`다. 통과 판정은 `error`(옵션 `failOn: 'warn'`이면 `warn`까지)가 없는 것이다. `scanned`는 점검마다 몇 개를 훑었는지 알려 준다. 0이면 통과가 아니라 대상 없음이다.

`evidence`에는 `lines`(실제 줄 수), `linesIfUnconstrained`(요소·조상의 폭 상한을 풀었을 때 줄 수), `containerWidth`, `availableWidth`(상한을 풀었을 때의 폭), `chWidth`(그 글꼴의 `1ch`), `measureCh`(한 줄 폭을 ch로 환산), `availableCh`, `fontSize`, `boxToAvailable`이 들어간다. 사용 가능한 폭은 추측하지 않고 요소에서 `max-width`·`width`를 임시로 풀어 다시 재서 얻는다. 가운데 정렬된 본문 컨테이너(`.page`)는 풀지 않는다.

## 역할

`data-layout-role="<role>"`로 직접 정할 수 있다(가장 가까운 조상 값을 상속). `data-layout-ignore`가 붙은 서브트리는 점검하지 않는다.

| 역할 | 추론 | 기대 |
|---|---|---|
| heading | `h1`~`h6`, `role=heading` | 폭 상한 때문에 접히지 않는다. 3줄 이내. 끝줄에 단어 하나만 남지 않는다 |
| lead | `.page-lead`·`lead` 클래스, 또는 `h1` 바로 아래 240자 이하 `p` | 제목처럼 칸을 넉넉히 쓴다. 한 줄 110ch 이하. 3줄 이내 |
| desc | `dd` | 짧은 설명은 읽기 폭 상한이 필요 없다. 고정 폭 목록 안에 갇히지 않는다 |
| short | 120자 이하 한 문장 | 45~80ch 읽는 폭 안이면 정상. 그보다 좁은 상한 때문에 불필요하게 접히면 지적 |
| body | 그 밖의 긴 글 | 한 줄 45~80ch이면 줄이 몇 줄이든 지적하지 않는다. 28ch 미만 칸에 3줄 이상, 92ch 초과는 지적 |
| label | `.eyebrow`, `dt`, `figcaption`, 40자 이하 짧은 글 | 폭 상한 때문에 접히면 오류. 좁은 칸의 2줄 캡션은 정상 |
| control | 버튼·탭·메뉴 항목(40자 이하) | 한 줄 |
| value | 가격·지표(`data-layout-role=value`) | 한 줄, 쪼개지 않음 |
| cell | `td`, `th` | 16자 이하 토큰이 중간에서 끊기면 오류 |

## 진단 코드

| 코드 | 심각도 | 의미 |
|---|---|---|
| `HEADING_EARLY_WRAP` / `LEAD_EARLY_WRAP` / `DESC_EARLY_WRAP` | error | 폭 상한을 풀면 더 적은 줄로 들어가는데 상한 때문에 접힘 |
| `HEADING_NARROW_BOX` / `LEAD_NARROW_BOX` / `DESC_NARROW_BOX` | error | 줄 수는 같지만 상자가 사용 가능한 폭의 75/80/70% 미만 |
| `SHORT_TEXT_NARROW_BOX` | error·warn | 한두 문장이 읽는 폭 하한(45ch)보다 좁은 상한에 접힘 |
| `HEADING_TOO_MANY_LINES`, `LEAD_TOO_MANY_LINES` | error | 칸이 넉넉한데 제목·리드가 3줄 초과 |
| `HEADING_ORPHAN`, `LEAD_ORPHAN` | error | 끝줄이 한 단어이고 한글 4자 미만이며 가장 긴 줄의 1/3 미만 |
| `BODY_ORPHAN` | warn | 본문·설명의 같은 조건 |
| `BODY_NARROW_COLUMN` | error | 한 줄 28ch 미만 칸에 본문 3줄 이상 |
| `BODY_MEASURE_CAPPED`, `BODY_MEASURE_LONG` | warn | 읽는 폭 상한이 45ch 미만(여유 있는데) 또는 92ch 초과 |
| `LABEL_WRAP`, `CONTROL_WRAP`, `VALUE_WRAP` | error | 한 줄이어야 하는 글이 접힘 |
| `CELL_TOKEN_BREAK`, `CELL_NARROW` | error·warn | 표 칸의 짧은 토큰이 끊김 / 칸이 6ch 미만 |
| `TEXT_SPILL` | error | 긴 토큰이 자기 칸 밖으로 나감 |
| `CLIP_TEXT` | error | `overflow:hidden` 칸에서 글이 잘림(line-clamp·말줄임·스크롤은 제외) |
| `CLIP_ICON` | error | 아이콘·이미지·SVG가 상위 요소의 `overflow`에 1.5px 넘게 잘림(장식으로 모서리에 걸친 `aria-hidden`은 제외) |
| `CLIP_SVG` | error | SVG 그림이 자기 `viewBox` 밖으로 나가 잘림(`overflow:visible`이면 제외) |
| `SVG_SLICE_CROP` | warn | 접근 가능한 의미 있는 SVG가 `preserveAspectRatio="… slice"`로 표시 상자 비율을 채우며 viewBox의 한 축 20% 이상을 자름. 잘리는 축·전체 비율·정렬에 따른 시작/끝 쪽 크롭을 보고 |
| `SMALL_TEXT` | error | 역할별 글자 크기 하한 미만. SVG 글자는 `font-size × viewBox 배율`로 실제 렌더 크기를 쟀다(하한 10px) |
| `OVERLAP_SVG_TEXT` | error | 같은 SVG 안의 글(차트 눈금·값 라벨) 두 개가 글상자 면적의 15% 넘게 겹침 |
| `OVERFLOW_X` | error | 문서 또는 요소가 화면 오른쪽 밖으로 나감(가로 스크롤 영역 제외) |
| `TRUNCATED` | warn·error | 말줄임으로 잘린 글(제목·리드는 error) |
| `SCROLL_REGION` | info | 가로로 스크롤되는 영역(코드·표). 의도 확인용 |
| `BAR_MISALIGNED_Y` | error | 상단 바 항목의 세로 중심이 2px, 글자 중심이 2.5px 넘게 어긋남 |
| `BAR_MISALIGNED_X` | error | 상단 바 좌우 가장자리가 본문 컨테이너와 1.5px 넘게 어긋남 |

## 임계값 정책

임계값은 `probe.mjs`의 `LAYOUT_OPTIONS.thresholds` 한 곳에 있다. 페이지를 통과시키려고 낮추지 않는다. 페이지를 고치거나, 사유가 있는 면제를 둔다.

`SVG_SLICE_CROP`의 20% 기준은 화면 상자와 viewBox의 종횡비에서 계산한 **잘린 축의 전체 비율**이다(`slice`가 표시 상자를 채울 때 보이지 않는 viewBox 범위). 이 값은 실제 SVG 경로·주 피사체가 잘린 비율이 아니다. 따라서 명시적인 `slice`는 작성자가 의도했을 수도 있어 오류가 아닌 경고로 제한한다. 경고는 보조기술에 노출된 `role="img"`, `aria-label` 또는 SVG 바로 아래 `<title>`이 있는 SVG에만 낸다. `aria-hidden="true"`와 `data-layout-decor` 표시는 새 경고 대상에서 제외한다. 기존 `.kit-art` 장식 예외는 유지하되, 그중 의미가 노출되고 20% 이상 크롭되는 `kit-art`에 한해 slice 위험을 따로 보고한다. 같은 계열의 viewBox 도형 넘침은 기존처럼 장식 예외로 둔다. 표시 비율이 같거나 `meet`·`none`을 쓰거나, 크롭이 20% 미만이거나, `overflow:visible`이면 이 경고를 내지 않는다.

- 면제는 `{code, page?, locator?, width?, reason}`이고 `reason`이 없으면 검사기가 던진다.
- 요소 단위 면제는 `data-layout-exempt="CODE[,CODE]: 사유"`다. 사유가 없으면 면제하지 않는다.
- 면제된 발견은 통과 판정에서 빠지지만 보고에는 남고 `exempt` 수로 센다.

## 한글과 `ch`

`ch`는 글꼴의 숫자 `0` 폭이다. 이 사이트의 글꼴에서 한글 한 글자는 약 1.6ch 폭이므로 `max-width: 20ch`는 한글 12자 안팎이다. 홈 제목이 이 상한(`max-width: 20ch`) 때문에 한 줄에 들어갈 글이 두 줄로 접혔고(1280px에서 상자 524px, 사용 가능 1056px), 리드(`--measure` 68ch)와 규약 영역(`max-width: 760px`)도 같은 원인으로 폭의 70% 안팎만 썼다. 제목·리드·설명에는 ch 상한을 두지 않고, 문단(`.prose`, `.note`)에만 `--measure`를 둔다. 줄바꿈 모양은 CSS로 `text-wrap: balance`(제목), `pretty`(문장)를 준다.

## 알려진 한계

- Chromium 한 대, 한 글꼴 환경에서만 잰다. 줄 수에 의존하는 픽스처는 글꼴이 다르면 어긋날 수 있다.
- SVG slice 크롭은 viewBox와 표시 상자의 비율로만 추정한다. 실제 그려진 path, 투명 여백, 피사체의 중요도는 해석하지 않으므로 경고가 있어도 잘린 내용이 중요하다는 뜻은 아니다. 특히 제품 일러스트의 의도된 구도는 사람이 확인해야 한다.
- "읽기 좋은 줄바꿈"의 의미(예: `금지된 축 / 조합은`처럼 명사구가 갈라지는지)는 보지 못한다. 줄 수·폭·끝줄·잘림만 잰다. 그 판단은 C단계(사람)의 몫이다.
- `text-wrap: pretty`는 끝줄 고아를 줄이지만 모두 막지 못한다. 360px 좁은 칸의 긴 목록 항목이 남는다(면제 목록 참조).
- iframe 안(컴파일된 예제 미리보기)은 따로 `checkHtml`로 잰다. 바깥 페이지 검사는 iframe 안을 들여다보지 않는다.
- 상단 바 정렬은 `header`/`[role=banner]` 안의 링크·버튼·이미지를 대상으로 하고 본문 컨테이너는 `main > .page`(또는 `[data-layout-page]`)로 찾는다.
