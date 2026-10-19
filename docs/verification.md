# 검증 기록 · 카탈로그 2.0 (2026-10-18)

환경을 구분한다. 아래 로컬 검사는 Mac Studio 호스트(macOS, Node v26.9.0, Playwright 1.64.1 + Chromium headless shell 156.0.8078.4)에서 실행했다. 이 호스트에서는 Playwright Chromium이 시작되고 coolors.co 렌더 페이지에도 접근된다. GitHub Actions(Ubuntu/Node 22/Chromium)는 별도 항목이다.

## 테스트가 먼저 잡은 실제 결함

- 브라우저 구조 감사가 템플릿 4개(saas-landing·agency-home·event-landing 등)의 **깨진 앵커**(`#features` → 실제 id는 `s-features`)를 찾아 링크 변환 규칙(`href()`)을 추가했다.
- 작성기 전수 검사가 글로우+라이트(X05) 같은 **축 금지 조합이 모드 전환에서 거부**되는 것을 발견했다. 검사 자체를 "거부되는 조합은 규칙과 함께 거부되는지"로 바꿨다.
- 페이지 유형 계약에서 글·문서에 후기(quote)와 CTA를 금지한 것이 실제 템플릿과 충돌해 금지 목록을 판단 근거에 맞게 좁혔다.
- 푸터 링크가 `.kit-footer ul` 규칙에 덮여 세로로 쌓이는 CSS 결함을 스크린샷으로 발견해 수정했다.
- 교차 플랫폼: 이전 CI에서 대비 비율의 마지막 비트 차이가 문제였다. 이번에는 색 선택 결정에 1e-6 여유를 두어 Math.pow 차이가 토큰 색을 바꾸지 못하게 했고, 번들러의 정렬에서 로케일 의존을 없앴다.

## 현재 로컬 실행 결과

`npm run verify`

```text
ℹ tests 50
ℹ pass 50
ℹ fail 0
AUDIT: 160 palettes match rendered Coolors evidence (814 observed); 320 color modes, 33600 used contrast pairs pass (tightest chart1/canvas 3.00:3 on orange-sunset-sky/light).
CATALOG: 40 themes, 160 palettes, 61 templates, 55 node types (50 examples compile), 16 page types, 11 axis bans.
MATRIX: 2440 template×theme pages + 468 palette×mode pages compile; 450 pairwise tuples cover 4867 allowed axis-value pairs; 4680/4800 palette×mode×shell compile ({"NAV_COUNT":468,"AXIS_BAN":936,"THEME_FORBID":120} rejected before repair).
SPACE: 157,900,457,808 rule-allowed axis×palette combinations (factored count).
DOCS: gap-analysis (38 systems, 38 layouts: 34 full / 4 partial) and design written.
REPRODUCIBLE: 540 generated files match a fresh build byte for byte.
```

이 명령은 계약·CLI → 증거 대조와 전 팔레트 대비 → 부품 예시 → 템플릿×테마 → 쌍별 커버링과 팔레트×모드×셸 전수 → 허용 공간 계수 → 문서 생성 → 사이트 생성 → 새 디렉터리와 바이트 비교를 확인한다. 대비 통과는 WCAG 전체 준수나 모든 조합의 시각 품질을 뜻하지 않는다. "허용 조합 수"는 규칙을 통과하는 조합의 이론적 크기이고, 이 가운데 컴파일해 본 것은 위 항목의 부분집합이다(쌍별 커버링 450개, 템플릿×테마 2,440개, 팔레트×모드 468개, 팔레트×모드×셸 4,680개).

## Chromium 검사

`npm run test:browser` · 14흐름 통과(1.8분). 검사 항목:

- 작성기: 40테마 × 160팔레트 × 라이트/다크 실제 computed color 대조(320건, 거부되는 조합은 규칙과 함께 거부 확인), 저장·복구, 노드 추가·이동·삭제·상태 편집·실제 다운로드 내용, 금지 조합 거부와 자동 수정, 24개 템플릿과 10개 셸의 넘침, 390/768/1600px 패널, 폼 로컬 검증과 네트워크 전송 없음, 카탈로그 탭(40 테마·55 부품).
- 예제 61개 × 390/768/1280px 가로 넘침 없음과 페이지 오류 없음, 390px에서 구조 감사(언어·랜드마크·h1 하나·제목 단계·이름·라벨·타깃 24px·표 캡션·폼 이름·깨진 앵커). 40개 테마 쇼케이스 390px 넘침 없음.
- 8개 페이지에서 Tab 70회: 모든 포커스 지점에 표시, ARIA 탭 화살표 키.
- auto 모드가 `prefers-color-scheme`을 따름, reduced-motion에서 애니메이션 제거.
- 단일 파일 갤러리: 외부 네트워크 차단 상태에서 390px 휴대폰으로 탐색·열기·테마 변경·X01 거부·자동 수정·부품 열람.

## 환경에서 확인한 사실

- 호스트에서 `npx playwright install chromium`이 성공했고(99MiB) Chromium·WebKit 모두 실행되었다. 샌드박스 제한으로 브라우저를 못 띄운 기록(1.0 시기 Codex 샌드박스)은 이 환경에는 해당하지 않는다.
- coolors.co는 일반 fetch는 403이지만 Playwright로 렌더된 페이지의 텍스트에서 스워치·이름·좋아요 수를 읽을 수 있었다. 이 방식의 재사용 조건은 확인하지 않았다.

## 범위 밖/미확인

- 실제 Safari/iOS, 스크린리더(VoiceOver·NVDA), 실제 고대비·강제 색상 모드: 미실행(Chromium 에뮬레이션만).
- 허용 조합 약 1.6×10^11개 전체의 육안 미감: 미검수. 테마 40개의 기본 프로필 화면과 일부 조합만 스크린샷으로 확인했다.
- 팔레트-테마 배정은 점수화 후 수동 보정한 근사이며 미감 검증이 아니다. Coolors 이름·팔레트의 재사용 조건: 미확인.
- 동료 레포 대응 표는 성격의 환산이다. 브랜드 일치를 뜻하지 않는다.
- 카카오 Katalog 원 발표: 확인 필요.
- GitHub Actions 결과: 아래 "CI" 절(푸시 후 기록).

## CI

[Actions 39126816403](https://github.com/winterholic/design-system-static-kit/actions/runs/39126816403) · 검증 리비전 `26c13fcc5afc0091998efd7ddd5223b6c1c6862b` · Ubuntu/Node 22/Chromium. 모든 단계 성공: `npm ci`, `npm run verify`(원시 로그의 `# tests 50`, `# pass 50`, `# fail 0`, 대비 33600쌍, `REPRODUCIBLE: 540 generated files`), `git diff --exit-code -- site docs`, `npx playwright install --with-deps chromium`, `npm run test:browser`(`14 passed (2.0m)`). macOS에서 만든 생성물이 Ubuntu 재생성과 바이트 단위로 같았다는 뜻이다. 스크린샷과 보고서는 이 실행의 `browser-evidence` artifact에 보존했다.

## Test Lab · 넓은 조합 실측 (Muse 워커, 2026-10-18 심야)

실행 환경: Mac Studio 호스트가 아닌 Muse 샌드박스(Node v26.9.0). 이 환경에서는 `browser_preflight` 명령이 없어 직접 브라우저 실행이 금지되었고, `ttakkari_browser` MCP도 없었다. 그래서 렌더·육안 영역은 실행하지 않고, 생성·정적검사·재현검증까지만 수행했다. 브라우저 실측은 `e2e/lab-pages.spec.mjs`로 CI에 위임했고, 이 기록 시점에는 CI 실행 전이다. 아래 수치는 이론적 조합 수가 아니라 실제 생성·실제 검사한 결과다.

- 생성: `node scripts/test-lab/generate.mjs` (seed 20261018, mulberry32, 결정적·shard/재시작 가능).
  - matrix 2,440(템플릿 61 × 테마 40 전수, 기존 컴파일 매트릭스를 실제 페이지로 보존) + palette-mode 428(팔레트 160 × light/dark/auto 회전, 12건은 THEME_FORBID로 규칙 거부되어 기록만) + pairwise 441(축 쌍별 커버링, 허용 쌍 4,867 전부 커버) + stress 71(상태 6종·비움 변형·한글/영문 경계값·긴 URL·긴 숫자·오류 페이지 dark·단일축 스위프·금지 경계 허용쌍) = 고유 HTML 3,380개. 바이트 동일 중복 72건은 별도 기록하고 파일로 쓰지 않았다.
  - 거부 입력 14종은 전부 거부되고 기대 코드와 일치했다(STRING·URL·LINK_LABEL·ENUM·AXIS_BAN·DUPLICATE_ID·NESTED_TABS·TABLE_WIDTH·PRIMARY_ACTION·ANCHOR_MISSING·SINGLE_HERO·PALETTE_THEME·UNKNOWN_KEY·STATE_DATA). 규칙 구멍 0건.
  - 축 커버리지: 테마 40·템플릿 61·팔레트 160·모드 3·페이지 유형 16·모든 축 값이 1개 이상 케이스에 등장. uncovered 없음.
  - 재현: `node scripts/test-lab/generate.mjs --verify` → checked 3,452·불일치 0·거부 집합 일치·중복 집합 일치.
- 정적검사: `node scripts/test-lab/check.mjs` → 3,380/3,380 통과. 검사 항목은 문서형식·CSP·color-scheme·h1 단일·제목 단계·앵커 해결·id 유일·이름/라벨(aria 포함)·폼 이름·표 캡션·svg 이름·스크립트 1개+내용 해시·인라인 핸들러·외부 URL·용량. 검사기는 정상/고장 입력 양쪽 대조로 검증했다(`tests/test-lab-check.test.mjs` 6개). 검사 과정에서 검사기 오탐 1건(aria-label 무시)을 찾아 고쳤다.
- 탐색: `site/test-lab/index.html` + `viewer.html` (검색·필터·페이지네이션, 단일 iframe 뷰어, 이전/다음·직접 URL). 산출물은 결정적 재생산을 위해 커밋 SHA·시각을 포함하지 않는다. 커밋·시각은 이 문서와 CI 기록으로 확인한다.
- `npm run verify` 전체 통과(계약 56/56 — 기존 50 + 검사기 6, 감사·문서·빌드, `REPRODUCIBLE: 3925 generated files`).
- 브라우저 검사(`e2e/lab-pages.spec.mjs`: stress 전수 360/390/768/1280/1600 오버플로우·콘솔·구조 감사, 템플릿 × 회전 테마 2종 390px, 대표·경계 24종 × 390/1280 스크린샷 → `test-results/test-lab/`)는 로컬 미실행. CI 결과를 별도로 확인할 것.
- 미검증(여전함): 실제 Safari/iOS·스크린리더, 허용 조합 전체의 육안 미감(3,380 중 육안 0), Coolors 재사용 조건, Katalog 원 발표.

## 시각 품질 개선 라운드 (2026-10-19)

피드백: "테스트 샘플로 나온 디자인 결과물 품질이 너무 심각하다." 구조·검증 체계는 그대로 두고 '보기 좋은 결과'만 올렸다. 모든 수정은 생성기·부품 CSS·렌더·템플릿 데이터에서 했고 생성 HTML은 손대지 않았다. 기준 자료는 winterholic-design-system(`ttakkari/`)의 타이포 스케일·간격 리듬·표면/경계/그림자 위계·컴포넌트 디테일이다. 코드·토큰은 복사하지 않았고 위계 원칙만 참고했다.

**진단**: 예제 27개(대시보드·랜딩·문서·커머스·인증·오류, 라이트/다크, 밀도·라운드 상이) × 390/1280px = 54장을 Chromium으로 찍어 직접 봤다(`scripts/design-qa/shoot.mjs`). 이후 축 극단(hard·glow·dramatic·bubble·pill·solid 아이콘, 셸 6종) test-lab 사례 16개를 추가로 봤다.

| # | 문제 | 원인 | 수정(위치) |
|---|---|---|---|
| 1 | 페이지 제목과 히어로(또는 상태 화면)에 같은 크기의 큰 제목이 연달아 나옴(랜딩·오류·행사 등 다수) | 템플릿이 `page-header`(h1) + `hero`/`empty-state`(h2)를 둘 다 큰 글씨로 렌더 | `render/nodes.mjs` `R.page`가 이웃을 보고 `data-lead` 부여, CSS가 컴팩트 리드로 낮추거나(제목 동일 시) 시각적으로 접음. h1은 DOM에 유지 |
| 2 | 상품 목록 격자가 300px 열에 짜부라져 글자가 세로로 깨짐 | 템플릿의 `aside` 자식 순서가 반대(본문↔보조) | `templates.mjs` product-listing·profile 순서 교정 |
| 3 | 갤러리가 폭을 못 채우고 오른쪽이 빔 | CSS columns 기반 마소너리 | 모자이크 그리드(첫 칸 2×2, 캡션은 이미지 위 칩), 일반 갤러리는 `auto-fit` |
| 4 | 지표 카드: 위쪽 모서리에 깨진 액센트선, 높이 불균등, 모바일에서 1열 전부 차지 | `border-top` + radius | 액센트선 제거, 값·변화 칩·보조문구를 `metric-foot` 한 줄로, 모바일 2열 |
| 5 | 요금제: 가격이 본문 크기, 추천 배지 때문에 카드 간 줄 어긋남 | 가격 스타일이 `buy-box` 청크에만 있었고 배지가 흐름 안에 있음 | 가격 40px 디스플레이, 배지 절대배치, 구분선·체크 칩, 추천 카드 틴트. `.kit-price`를 공용 CSS로 이동 |
| 6 | 기능 목록 아이콘이 맨몸(스타일 없음) | `.kit-card-icon`이 `card` 청크에만 있어 카드 없는 페이지에서 누락 | 공용 CSS로 이동, 기능 항목을 카드화(`list` 레이아웃은 좌 제목/우 설명 행) |
| 7 | 표: 헤더·본문 구분 없음, 상태가 평문, 다크 줄무늬가 탁함, 모바일에서 한글이 낱글자로 쪼개짐 | 단일 스타일, `overflow-wrap:anywhere` | 헤더 면·행 호버, `상태` 열을 점(dot) 배지로(글자색은 감사된 토큰 유지, 점만 색), 줄무늬는 `color-mix(text 4%)`, `break-word` |
| 8 | 섹션 제목과 부품 사이 간격 이중, 중첩 제목이 같은 크기로 쌓임(문서) | 부품마다 `margin-top: gap` | `kit-section-head` 묶음, 직후 부품 margin 0, 중첩 소제목 강등, h4~h6 별도 크기 |
| 9 | 인증 페이지: 제목은 왼쪽, 카드는 가운데, 폼이 넓게 퍼짐 | 페이지 유형별 규칙 없음 | `data-page` 속성 → 인증 560px·가운데 정렬, 오류 페이지 세로 가운데 |
| 10 | `solid` 아이콘에서 원형 안쪽 선이 같은 색이라 덩어리로 보임 | 닫힌 도형 100% 채움 | 채움 58%(안쪽 선이 읽힘) |
| 11 | 모바일 헤더가 3줄(로고·메뉴·버튼 각각). 수정 중 `minimal` 셸 로고가 세로로 깨지는 회귀가 생겨 스크린샷으로 잡아 고침 | flex-wrap 순서 | 브랜드+액션 1줄, 메뉴 2줄, `minimal`·`centered` 보정 |
| 12 | 히어로·CTA·인용·팀·FAQ·로고 줄이 평면적, 고스트 버튼 들여쓰기 | 위계 부족 | 히어로 그라데이션·칩형 eyebrow·리드 글자 크기, CTA·인용·팀 카드·FAQ 폭 정리, 고스트 버튼 패딩 |
| 13 | grid 배경 격자선이 시끄러움 | 선 100% | 45% 투명 |

**반복**: 총 4회(`.qa/before` → `iter1`~`iter4` → `after`). 2회차에서 갤러리·지표 notch·다크 표 헤더(거의 검정)를 다시 고쳤고, 3~4회차에서 모바일 2열·minimal 셸 회귀를 고쳤다. 전/후 나란히 이미지는 outbox `compare/`에 있다.

**검증(2026-10-19, macOS·Node 22, Chromium)**

- `npm run verify` → `ℹ tests 56 / pass 56 / fail 0`, `AUDIT: … 33600 used contrast pairs pass`, `REPRODUCIBLE: 3925 generated files match a fresh build byte for byte.`
- `node scripts/test-lab/generate.mjs --verify` → `VERIFY: checked=3452 mismatches=0 …`
- `node scripts/test-lab/check.mjs` → `CHECK: 3380 cases, 3380 pass, 0 fail`
- `npm run test:browser` → `17 passed`
- `node scripts/design-qa/sweep.mjs`(신규) → 3,380 사례 × 390/1280px `overflow=0`
- 계약 테스트 수는 56개 그대로(테스트 추가·삭제·완화 없음). 카탈로그 밖 값 거부·금지 조합·대비 검사는 손대지 않았다.

**알려진 한계**

- 육안으로 본 것은 대표 표본(예제 27×2 + 극단 사례 16)이다. 3,380 전수 육안이 아니다.
- 히어로·CTA·추천 요금제 그라데이션 위 글자는 양 끝 토큰(soft, accentSoft·surface)이 감사를 통과한 값이라는 근거만 있고 중간 보간 지점 대비를 직접 측정하지는 않았다(확인 필요).
- `상태` 열 점 배지는 열 이름(상태·status·결과)과 낱말 사전에 의존한 휴리스틱이다. 사전에 없는 말은 중립 점으로 나온다.
- `flat` 깊이 + 흰 팔레트 조합은 카드 경계가 사라져 여전히 밋밋하다.
- 타임라인 점, 문서의 중첩 제목 스택, 사이드바 셸의 100vh 배경은 개선 여지가 남았다.
- 실제 Safari/iOS, 스크린리더, 고대비 모드: 미검증(Chromium만).

## 시각 기반 재설계 검증 (2026-10-19)

배경·진단·결정은 `docs/foundation.md`. 여기에는 실행한 검증만 적는다. macOS·Node 22·Chromium.

- `npm run verify` → `ℹ tests 56 / pass 56 / fail 0`, `AUDIT: … 33600 used contrast pairs pass (tightest chart1/canvas 3.00:3 …)`, `REPRODUCIBLE: 3925 generated files match a fresh build byte for byte.`
- `node scripts/test-lab/generate.mjs --verify` → `VERIFY: checked=3452 mismatches=0 skipped-set-match=true dups-match=true`
- `node scripts/test-lab/check.mjs` → `CHECK: 3380 cases, 3380 pass, 0 fail, codes={}`
- `npm run test:browser` → `17 passed (2.0m)`
- `node scripts/design-qa/sweep.mjs` → `SWEEP: 3380 cases × 2 widths, overflow=0`

**불변 조건.** 계약 테스트는 56개 그대로이고 추가·삭제·완화가 없다. 카탈로그 밖 값 거부, 금지 조합 11개, 대비 하한(본문 7:1, 보조 4.5:1, 비텍스트 3:1)은 손대지 않았다. 달라진 것은 토큰 값이다. 중립색(text·muted·border)이 팔레트 시드 색조를 섞게 되어 `docs/evidence/contrast.json`이 재생성됐고, 같은 하한으로 33,600쌍이 모두 통과했다. 전/후 `ratio` 값이 일부 달라지는 것은 의도된 변화다.

**알려진 한계(이번 라운드).**

- 육안 검토는 대표 표본(예제 27×2, 랜딩류 9×2, 극단 사례 16)이다. 3,380 전수 육안이 아니다. 전수로 확인한 것은 가로 넘침(sweep)과 정적 구조 검사다.
- 앱 바탕 틴트(`soft`와 `canvas` 55:45 혼합), 히어로·CTA 방사형 틴트, 밴드 교대 면은 양 끝 토큰이 통과한 값이라는 근거만 있고 중간 보간 지점 대비는 직접 측정하지 않았다(확인 필요).
- Windows·Android 실기기 폰트 렌더링, Safari/iOS, 스크린리더는 미검증.
