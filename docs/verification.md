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

푸시 후 Actions 실행을 확인해 기록한다.
