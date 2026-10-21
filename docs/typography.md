# 타이포그래피 시스템

> 이 문서는 `src/typography.mjs`에서 생성됩니다(`npm run docs`). 손으로 고치지 않습니다.

서체는 컨셉마다 달라야 한다. 그러나 서체만 바꾸면 비례와 자간이 어긋난다. 그래서 **타이포그래피 프리셋** 하나가 서체 조합, 크기 비율, 제목 굵기, 자간, 행간, 본문 크기를 한 벌로 정한다. 부품은 크기를 고르지 않고 **크기 역할**만 쓴다.

## 프리셋 18종

`scale` 축(촘촘한 제목·균형·극적인 제목)은 비율을 −0.07 · 0 · +0.10 옮긴다. 마지막 열은 균형 스케일에서 섹션 머리말(h2)의 최대 px다.

| id | 이름 | 컨셉 | 제목/본문 서체 | 본문 px | 비율 | 굵기 이동 | 큰 제목 자간(em) | 큰 제목/본문 행간 | h2 px |
|---|---|---|---|---|---|---|---|---|---|
| `sans` | 시스템 산세리프 | 중립·제품. 어디에나 놓이는 기본 목소리. | system / system | 16 | 1.25 | +0 | -0.035 | 1.1 / 1.65 | 20/33/49/64 |
| `serif` | 세리프 제목 + 산세리프 본문 | 읽을거리가 있는 제품. 제목에만 인쇄 감각을 둔다. | iowan / system | 16 | 1.25 | +0 | -0.025 | 1.15 / 1.7 | 20/33/49/64 |
| `mono` | 모노스페이스 제목 | 개발·데이터. 제목이 코드처럼 읽힌다. | mono / system | 16 | 1.2 | +0 | -0.02 | 1.2 / 1.65 | 19/29/40/50 |
| `editorial` | 세리프 제목 + 세리프 본문 | 긴 글. 제목도 본문도 인쇄 서체, 느슨한 행간. | iowan / iowan | 17 | 1.25 | -100 | -0.02 | 1.15 / 1.8 | 21/35/52/68 |
| `rounded` | 둥근 서체 | 친근한 소비자 서비스. 모서리가 둥근 글자. | rounded / rounded | 16 | 1.25 | +0 | -0.025 | 1.15 / 1.7 | 20/33/49/64 |
| `geometric` | 기하학적 산세리프 | 브랜드·마케팅. 원에 가까운 글자와 굵은 제목. | geometric / geometric | 16 | 1.25 | +100 | -0.04 | 1.08 / 1.65 | 20/33/49/64 |
| `humanist` | 인문주의 산세리프 | 따뜻하고 사람 냄새 나는 서비스. 가는 획의 변화. | humanist / humanist | 16 | 1.2 | -100 | -0.015 | 1.2 / 1.75 | 19/29/40/50 |
| `grotesk` | 굵고 좁은 그로테스크 | 직설적인 제목. 큰 제목이 한 덩어리로 박힌다. | grotesk / grotesk | 16 | 1.333 | +100 | -0.045 | 1.02 / 1.6 | 21/40/67/95 |
| `swiss` | 스위스 그리드 | 격자·정렬·위계가 전부인 인쇄. 큰 대비와 대문자 라벨. | grotesk / grotesk | 16 | 1.414 | +100 | -0.05 | 1 / 1.55 | 23/44/72/96 |
| `newsroom` | 신문 지면 | 뉴스·매거진. 굵은 세리프 제목과 촘촘한 본문. | georgia / georgia | 16 | 1.333 | +100 | -0.02 | 1.1 / 1.6 | 21/40/67/95 |
| `literary` | 문학·인문 | 책과 기록. 가는 세리프 제목, 넉넉한 행간, 큰 본문. | baskerville / charter | 17 | 1.2 | -200 | -0.01 | 1.2 / 1.85 | 20/30/42/53 |
| `luxe` | 럭셔리 | 브랜드·웨딩·와인. 고대비 디돈 제목과 넓게 벌린 라벨. | didone / humanist | 16 | 1.414 | -300 | 0 | 1.1 / 1.75 | 23/44/72/96 |
| `poster` | 포스터·캠페인 | 캠페인·행사·게임. 아주 굵고 촘촘한 제목, 큰 비율. | poster / system | 16 | 1.5 | +200 | -0.04 | 0.98 / 1.6 | 24/44/72/96 |
| `slab` | 슬랩·레트로 | 인쇄물 감성. 굵은 슬랩 제목, 따뜻한 본문. | slab / system | 16 | 1.25 | +0 | -0.015 | 1.12 / 1.7 | 20/33/49/64 |
| `tech` | 테크 문서 | 개발자 도구·문서. 촘촘한 비율, 숫자 정렬, 단단한 제목. | system / system | 16 | 1.2 | +0 | -0.03 | 1.12 / 1.6 | 19/29/40/50 |
| `bookish` | 책 본문 | 긴 읽기. 한 서체가 제목과 본문을 모두 맡는다. | charter / charter | 17 | 1.25 | -100 | -0.02 | 1.15 / 1.8 | 21/35/52/68 |
| `terminal` | 터미널 | 콘솔·로그. 제목도 본문도 고정폭. | mono / mono | 16 | 1.2 | +0 | -0.01 | 1.2 / 1.65 | 19/29/40/50 |
| `condensed` | 좁은 제목 | 스포츠·행사. 좁고 굵은 제목으로 한 줄에 많이 담는다. | condensed / system | 16 | 1.333 | +100 | -0.01 | 1 / 1.6 | 21/40/67/95 |

크기 단계(sub / heading / title / display, 최대 px)는 본문 크기 × 비율의 거듭제곱이다: sub = r¹ · app = r²·⁵ · heading = r³·² · title = r⁵ · display = r⁶·² (상한 24·38·44·72·96px). 예를 들어 `sans`는 촘촘한 제목 19/27/37/45 · 균형 20/33/49/64 · 극적인 제목 22/42/72/96.

### 규칙

1. **한글 자간.** 한글은 같은 크기의 라틴보다 획이 많아 −0.035em 이하로 조이면 뭉친다. 큰 제목도 −0.05em을 넘기지 않는다(`swiss`·`grotesk`·`poster`만 −0.04em 아래).
2. **행간은 역할이 정한다.** 큰 제목일수록 좁게(0.98~1.2), 본문은 1.55~1.85. 문학·책 계열은 1.8 이상.
3. **굵기.** 제목 굵기는 `weight` 축(600·700·800)에 프리셋 이동(−300~+200)을 더해 400~900으로 자른다. 가는 제목(`luxe`·`literary`)은 400까지 내려간다.
4. **숫자.** `swiss`·`newsroom`·`tech`·`terminal`은 지표·표의 숫자를 고정폭(`tabular-nums`)으로 맞춘다.
5. **눈썹글·라벨.** 대문자 변환(`--kit-case-label`)은 프리셋이 정한다.

## 크기 역할(`--kit-t-*`)

| 역할 | 쓰임 | 허용된 자리 |
|---|---|---|
| `--kit-t-micro` | 차트 눈금·아바타 이니셜 | 어디서나 |
| `--kit-t-caption` | 배지·보조 메타·표 머리 | 어디서나 |
| `--kit-t-label` | 눈썹글·도움말·푸터 메타 | 어디서나 |
| `--kit-t-small` | 보조 설명·메타 | 어디서나 |
| `--kit-t-ui` | 버튼·요약 줄 | 어디서나 |
| `--kit-t-body` | 본문 | 어디서나 |
| `--kit-t-body-l` | 강조 본문·h4·요금제 이름 | 어디서나 |
| `--kit-t-prose` | 글 본문(article)·리드 문단 | 어디서나 |
| `--kit-t-lead` | 머리말 설명·히어로 본문 | 어디서나 |
| `--kit-t-sub` | 부품 제목(h3)·카드 제목 | 어디서나 |
| `--kit-t-sub-l` | 큰 카드·타임라인 제목 | 어디서나 |
| `--kit-t-quote` | 인용문(한 칸 이상) | `.kit-quote` |
| `--kit-t-quote-s` | 좁은 칸의 인용문 | `.kit-quote` |
| `--kit-t-quote-l` | 글 안의 인용문(article) | `.kit-quote` |
| `--kit-t-glyph` | 따옴표 장식 글자 | `.kit-quote` |
| `--kit-t-app` | 앱 화면의 제목(h1) | `h1`, `.kit-page-header`, `.kit-profile-id`, `[data-page=` |
| `--kit-t-heading` | 섹션 머리말(h2) | `h2`, `.kit-section-head`, `.kit-empty` |
| `--kit-t-heading-s` | 문서·설정의 섹션 머리말 | `.kit-section-head`, `[data-page=`, `.kit-section` |
| `--kit-t-cta` | CTA 띠의 제목 | `.kit-cta` |
| `--kit-t-stat` | 지표 값 | `.kit-metric` |
| `--kit-t-stat-s` | 프로필 수치·점수 | `.kit-profile-stats`, `.kit-score`, `.kit-metric` |
| `--kit-t-price` | 가격 | `.kit-price` |
| `--kit-t-fact` | 히어로 수치 | `.kit-hero-facts` |
| `--kit-t-logo` | 로고 이름 줄 | `.kit-logos` |
| `--kit-t-title` | 페이지 제목(h1) | `h1`, `.kit-page-header`, `[data-page=` |
| `--kit-t-display` | 히어로 제목 | `.kit-hero` |
| `--kit-t-poster` | 커버 히어로 제목 | `.kit-hero[data-variant=cover]` |
| `--kit-t-mast` | 신문 제호(masthead 브랜드) | `[data-shell=masthead]` |
| `--kit-t-code` | 상태 페이지의 큰 코드(404) | `.kit-empty-code` |

24px을 넘는 역할은 허용된 자리(선택자)에서만 쓸 수 있다. `lintType`이 스타일시트의 모든 `font-size`를 검사해 역할이 아닌 값(RAW), 알 수 없는 역할, 허용되지 않은 자리(SLOT), `font` 약식 선언을 막는다. 카드 안의 지표 값이 히어로 제목 크기로 자라거나, 본문 칸에 제목 크기가 들어가는 일은 CSS 단계에서 만들 수 없다.

## 서체 스택(시스템 서체)

| 스택 | 앞의 서체 |
|---|---|
| `system` | system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Apple SD Gothic Neo … |
| `humanist` | Seravek, Gill Sans, Optima, Candara, Segoe UI … |
| `geometric` | Avenir Next, Avenir, Century Gothic, Futura, Segoe UI … |
| `grotesk` | Helvetica Neue, Arial Nova, Arial, Apple SD Gothic Neo, Noto Sans KR … |
| `rounded` | ui-rounded, SF Pro Rounded, Hiragino Maru Gothic ProN, Arial Rounded MT Bold, Apple SD Gothic Neo … |
| `poster` | Futura, Avenir Next Condensed, Impact, Arial Narrow, Apple SD Gothic Neo … |
| `condensed` | Avenir Next Condensed, Arial Narrow, Roboto Condensed, Helvetica Neue, Apple SD Gothic Neo … |
| `iowan` | Iowan Old Style, Palatino, Palatino Linotype, Book Antiqua, Georgia … |
| `georgia` | Georgia, Times New Roman, Noto Serif, AppleMyungjo, Noto Serif KR … |
| `charter` | Charter, Bitstream Charter, Sitka Text, Cambria, Georgia … |
| `baskerville` | Baskerville, Libre Baskerville, Hoefler Text, Palatino, Georgia … |
| `didone` | Didot, Bodoni 72, Bodoni MT, Playfair Display, Hoefler Text … |
| `slab` | Rockwell, Superclarendon, Roboto Slab, American Typewriter, Georgia … |
| `mono` | SFMono-Regular, SF Mono, Menlo, Consolas, Apple SD Gothic Neo … |

모든 스택은 같은 색의 한글 서체로 끝난다(산세리프 `Apple SD Gothic Neo`·`Noto Sans KR`·`Malgun Gothic`, 세리프 `AppleMyungjo`·`Noto Serif KR`·`Batang`, 고정폭 `D2Coding`).

## 서체 조달: 왜 웹폰트를 싣지 않았나

생성되는 페이지는 `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:`이고 외부 요청이 하나도 없는 자기완결 문서다(ADR 0001). `@font-face`로 서체를 불러오려면 `font-src`를 열어야 하고, 한글 서체는 가장 가벼운 부분 집합도 수백 KB라 페이지마다 안에 넣기에는 무겁다(조합 갤러리는 한 번에 수십 쪽을 연다). 그래서 이 라운드는 **시스템 서체만으로** 컨셉별 목소리를 만들고, 그 차이를 서체 이름 하나가 아니라 비율·굵기·자간·행간·본문 크기 전체에서 낸다.

한계: 시스템 서체는 기기마다 다르다. 이 표의 앞쪽 서체는 macOS·iOS에서 확인했고, Windows·Android·Linux에서는 스택의 다음 서체로 내려간다(제목의 세리프·디돈·슬랩 느낌이 약해진다). 비율·자간·행간은 어디서나 같다.

### 웹폰트를 쓴다면: 후보와 라이선스(확인 필요)

아래는 이 저장소의 제약이 풀렸을 때(예: 서체를 `site/fonts/`에 두고 `font-src 'self'`를 여는 배포) 쓸 후보다. 라이선스는 각 프로젝트의 공개 문서 기준이며 **재배포 전에 원문 확인이 필요**하다. 이 라운드에서는 어느 것도 저장소에 포함하지 않았다.

| 서체 | 용도 | 라이선스 | 비고 |
|---|---|---|---|
| Pretendard | 한글+라틴 산세리프 | SIL OFL 1.1 | 가변 서체, 동적 부분 집합 배포본이 있다 |
| Noto Sans KR / Noto Serif KR | 한글 산세리프·세리프 | SIL OFL 1.1 | 부분 집합(unicode-range) 분할 배포가 일반적 |
| Nanum Gothic / Myeongjo | 한글 산세리프·명조 | SIL OFL 1.1 | 네이버 배포 |
| IBM Plex Sans KR | 한글 산세리프 | SIL OFL 1.1 | 기술 문서 어조 |
| Gowun Batang / Dodum | 한글 명조·산세리프 | SIL OFL 1.1 | 문학·부드러운 어조 |
| Inter | 라틴 산세리프 | SIL OFL 1.1 | 숫자 정렬 기능 풍부 |

## 강제 지점

| 지점 | 무엇을 막나 | 파일 |
|---|---|---|
| 프리셋 표 | 서체 스택이 한글 대체 서체 없이 끝나는 것, 비율·자간 범위를 벗어난 값 | `tests/typography.test.mjs` |
| 역할 불변식 | sub < heading < title < display 순서가 어떤 프리셋·스케일에서도 뒤집힘 | `tests/typography.test.mjs` |
| CSS 린트 | 역할이 아닌 크기, 자리 밖의 큰 역할, `font` 약식 | `lintType`, `tests/typography.test.mjs` |
| 렌더 실측 | 실제 화면에서 위계가 뒤집히거나 큰 글자가 좁은 칸에 접히는 곳 | `layout-probe.mjs` `HIER_INVERT`·`BIG_NARROW` |
