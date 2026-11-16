# 타이포그래피 진단: "패딩은 좋아졌는데 타이포그래피가 안 맞는다"

2026-11-16. 기준 revision `f22b9ae6902c2dad103bb36372bbd531dd40ffe1`(catalog 2.2.0, composition 1.2.0). 개선은 catalog 2.3.0의 타이포그래피 리비전 2다.

측정 환경: 이 Mac Studio의 Chromium 156(Playwright 1.64.1), macOS 시스템 서체. 서체 실사용은 CDP `CSS.getPlatformFontsForNode`로 읽었다. **Windows·Android·Linux와 실기기 iOS는 측정하지 않았다(미검증).** 스택이 거기서는 다음 서체로 내려가므로 서체 짝 결과는 macOS 한정이다. 비율·자간·행간 수치는 서체와 무관하게 CSS 값이다.

재현: `node docs/evidence/typography-refine/measure.mjs --src <repo root> --out <dir> --shots --matrix`(전), 같은 명령을 작업 트리에서 실행(후). 전 측정은 `git worktree add /tmp/dsk-before f22b9ae69`로 기준 소스를 컴파일했다. 집계는 `analyze.mjs`, 비교는 `compare.mjs`·`zoom.mjs`·`heights.mjs`, 자간 실험은 `tracking-gap.mjs`다.

## 요약: 서체 종류인가, 글씨 크기인가

**둘 다 주된 원인이 아니었다. 어긋난 것은 글자의 간격이다.** 라틴 기준으로 정한 자간과 제목 행간을 한글에 그대로 쓴 것이 실측으로 확인되는 원인이다.

| 질문 | 판정 | 핵심 실측 |
|---|---|---|
| 서체 종류(혼용)가 문제인가 | **부분**. 대부분의 짝은 허용 범위, 예외 두 곳만 교정 | 한글 글자 높이 / 라틴 x-height 비율: Apple SD Gothic Neo 자체 1.48, 우리 산세리프 스택 1.45~1.70. 세리프는 Myungjo 자체 1.82에 대해 1.63~1.73이고 Didot 1.94, **Baskerville 2.08**. 숫자: **Georgia는 구식 숫자**(숫자 높이/대문자 0.75, 숫자끼리 편차 0.19em)라 한글 옆에서 가라앉는다 |
| 글씨 크기가 문제인가 | **부분**. 상한만 소폭 낮춤 | 1440px에서 제목/본문 중앙값 2.13배, 390px 1.79배. 3.5배를 넘는 17개는 모두 히어로형 화면(landing·portfolio). 최대 96px은 외부 시스템 범위(KRDS display 60, Fluent 68, Carbon 표현형 92) 안쪽 끝 |
| 자간 | **확인(주원인)** | 한글이 주인 제목 81개 중 **58개가 −0.03em 이하**, 65개가 −0.025em 이하. 굵은 SD Gothic Neo에서 이웃 음절이 닿는 비율: −0.02em 2%, **−0.035em 18%**, −0.05em 27%, 0em 0% |
| 제목 행간 | **확인** | 85개 중 40개가 제목 행간 1.2 미만, 두 줄 제목 14개가 1.15 미만(최저 0.98). 한글 잉크 높이 0.91em 기준으로 1.1이면 줄 사이 흰 띠 0.19em |
| 본문 행간 | **기각** | 범위 1.5~1.85, KRDS 최소 150%를 넘는다. 느슨하다는 외부 근거 없음 |
| 굵기 | **기각**(원인 아님) | 700과 800의 음절 간격 중앙값 0.049 대 0.048em. 900(제목 10개)은 SD Gothic Neo에서 ExtraBold로 내려가 800과 같다 |
| 라벨 자간·대문자 | **기각에 가까운 부분** | 눈썹글 39개 중 한글 33개, 그중 자간 0.05em 초과 4개, 대문자 변환이 걸린 한글 2개. 영향 범위가 작다 |

외부 시스템은 큰 제목 자간을 거의 0으로 둔다. Material 3 display large −0.25px(57px에서 −0.004em), Carbon display −0.64px(92px에서 −0.007em), Fluent 0, Carbon 제목 0. 이 킷의 −0.035~−0.05em은 그 5~10배다. 다만 이 비교는 라틴 서체의 값이고 한글 값으로 복제하지 않았다. 한글에서는 위의 직접 측정(음절 잉크 간격)으로 하한을 정했다.

## 판정 상세

### 1. 혼용 서체: 부분

확인한 것
- 14개 스택 모두 한글은 대체 서체다. 산세리프·고정폭 계열 8개는 Apple SD Gothic Neo, 세리프 계열 6개는 AppleMyungjo가 한글을 맡고 라틴은 앞 서체다. 한글 위주 화면에서 영문·숫자만 다른 서체로 섞이는 것은 구조적으로 맞다(`before/stacks.json`).
- 그러나 짝의 시각 차이는 숫자로 보면 작다. `system`(SF + SD Gothic Neo) 1.57 대 자체 1.48. 라틴이 한글보다 작아 보이는 정도가 가장 큰 것은 Baskerville(2.08)이고 Didot 1.94가 다음이다.
- Georgia는 숫자가 구식이다. 기본 예시에서는 `newsroom` 한 개(news-home)에 해당하고 캡처에서 "2026년 10월 20일", "12km", "3분기"의 숫자가 한글 옆에서 작고 들쭉하다. `lining-nums`를 켜도 Georgia는 54로 그대로라 CSS로 못 고친다.
- 합성 볼드: AppleMyungjo는 `system_profiler SPFontsDataType`에서 스타일이 "일반체" 하나다. 6개 세리프 스택에서 한글 400과 700의 postScript 이름이 같고 라틴은 실제 Bold로 바뀐다. 기본 예시에서 제목 굵기 600 이상이 Myungjo인 것은 article(600)·news-home(900) 2개다. 캡처상 결함으로 보이지는 않는다(육안).
- 기획의 후보 가설 수치(serif 13 · humanist 10 · rounded 7 · editorial 5개)는 기본 Blueprint 기준으로 재현되지 않았다. 85개 기본 예시의 프리셋 분포는 sans 36, rounded 14, humanist 6, terminal 4, luxe 4, tech 5, literary 3, geometric 3, serif 1, editorial 1, newsroom 1, bookish 1, grotesk 2, poster 2, condensed 2다(`before/summary.json`의 `byPreset`). 어떤 집계로 13·10·7·5가 나왔는지 확인 못함.

교정(스택·짝 규칙)
- `georgia` 스택 → `news`(Times New Roman 앞): x-height 비율 1.86으로 Myungjo 1.82에 가장 가깝고 숫자가 라이닝이다.
- `baskerville` → `palatino`: 비율 1.76, 라이닝 숫자.
- 세리프 한글 제목 굵기 상한 700(Myungjo가 합성 볼드 이상은 못 만들므로 라틴만 더 굵어지는 800·900 방지).
- 기존 스택 이름은 그대로 두고(2.1·2.2 호환) 리비전 2가 대체 이름으로 매핑한다.
- 한계: Seravek 600은 Bold로 올라가 한글 SemiBold보다 한 단계 굵다(blog-post). 서체에 중간 굵기가 없어 규칙으로 못 맞췄다. 미교정.

### 2. 자간: 확인

- 85개 중 제목 자간 분포: −0.03em 38개, −0.035em 16개, −0.025em 8개, −0.04em 5개, −0.045em 1개(합계 −0.025 이하 68). 한글이 주인(글자의 50% 이상)인 제목은 81개다.
- `tracking-gap.mjs`: 실제 제목 한글 607음절의 인접 쌍 잉크 간격(em).

| 자간 | 중앙값 간격 | 하위 10% | 닿는 쌍(<0.01em) |
|---|---|---|---|
| +0.02 | 0.103 | 0.061 | 0% |
| 0 | 0.083 | 0.041 | 0% |
| −0.02 | 0.063 | 0.021 | 2% |
| −0.035 | 0.048 | 0.006 | 17~18% |
| −0.05 | 0.033 | −0.009 | 27% |

(SD Gothic Neo 800 기준, 700도 같다.) 코드 주석과 `docs/typography.md` 규칙 1이 "한글은 −0.035em 아래로 조이면 뭉친다"고 적었는데 `sans`의 display·title이 바로 −0.035em였고 `swiss`·`grotesk`·`poster`는 −0.04~−0.05em였다. 규칙과 값이 어긋나 있었다.
- 컴포넌트 CSS가 프리셋을 우회하는 상수도 있었다. 페이지 머리말 h1 −0.03em, CTA h2 −0.035em, 오류 화면 h2 −0.035em, 인용 −0.025em, 신문 제호 −0.03em 등(숫자·가격·로고 제외). 프리셋만 고치면 이들이 남는다.
- 교정: display·title ≥ −0.02em, heading ≥ −0.015em, 카드 제목 ≥ −0.01em. 컴포넌트 상수는 `refineTracking`이 같은 하한으로 정리한다(숫자·가격·로고 규칙 제외).
- 라벨: 한글에는 대문자가 없고 넓은 자간만 남는다. 상한 0.06em(luxe 0.14, poster 0.1, swiss 0.08, condensed 0.08 → 0.06). 영향 범위는 작다(한글 눈썹글 33개 중 4개).

### 3. 크기·비율: 부분

- 1440px 제목 px 최소 22, 중앙값 38, 최대 96. 390px는 21 / 27 / 48. 본문 중앙값 16px(KRDS 최소 16, 기본 17).
- 3.5배 초과 17개: saas-landing, agency-home, event-landing, waitlist, campaign-donate, learning-course, fitness-landing, solar-landing, clinic-home, case-study, not-found, luxury-brand, campaign-poster, wedding-invite, kids-class, bank-product, game-launch. 전부 히어로형이다. 표 ·폼·대시보드·글은 없다.
- 외부 대조(용도·서체가 다르므로 수치를 복제하지 않고 범위로만 쓴다): KRDS display large 60px / heading xlarge 40px(한글 정부 서비스), Fluent display 68px, Material 3 display large 57px, Carbon 표현형 fluid display 54~92px. 96px은 이 범위의 위쪽 끝이고 한글 블록이 em을 채우는 정도(잉크 높이 0.91em 대 라틴 대문자 0.7em)를 고려하면 같은 px에서 더 커 보인다.
- 교정: 비율 ≤ 1.414, display ≤ 80px, title ≤ 64px, heading ≤ 40px, app ≤ 36px. 실효: 최대 제목 96 → 88px(cover 히어로는 display의 1.1배), 3.5배 초과 17 → 16개. **크기 변경의 효과는 작다**. 크기가 주원인이라는 증거는 없고 상한은 안전 여유다.
- 본문 크기(16/17px)는 바꾸지 않았다. 기각.

### 4. 행간·굵기: 제목 확인, 본문·굵기 기각

- 제목: 위 표 참조. Latin 기준 시스템의 제목 행간은 Fluent 1.25~1.35, Carbon 1.19, Material 3 1.12~1.31, KRDS 1.5다. 한글 잉크 높이를 감안한 직접 계산: 행간 1.0 → 줄 사이 띠 0.09em, 1.1 → 0.19em, 1.25 → 0.34em, 1.3 → 0.39em, 1.5 → 0.59em.
- 교정: display ≥ 1.2, title ≥ 1.25, heading ≥ 1.3, 카드 제목 ≥ 1.35. KRDS의 150% 전체 적용은 채택하지 않았다. 80px 히어로에 1.5를 주면 제목이 흩어지므로 위 계산의 띠 0.2~0.4em 구간에서 멈췄다. 이 하한은 외부 수치의 복제가 아니라 측정한 잉크 높이에서 정한 값이다.
- 본문 행간 1.5~1.85에서 7개 화면이 1.75 초과. KRDS 최소 150%를 넘고 느슨함을 불리하게 보는 근거를 찾지 못해 바꾸지 않았다(상한 1.8만 둠, literary 1.85 → 1.8).
- 굵기: 위 요약 참조. 원인 아님.

## 전후 측정(예시 85개, 1440 / 390)

| 지표 | 전 1440 | 후 1440 | 전 390 | 후 390 |
|---|---|---|---|---|
| 한글 제목 자간 ≤ −0.03em | 58 | **0** | 59 | **0** |
| 제목 행간 < 1.2 | 40 | **0** | 40 | **0** |
| 두 줄 제목 중 행간 < 1.15 | 14 | **0** | 15 | **0** |
| 제목 px 최대 / 중앙값 | 96 / 38 | 88 / 36 | 48 / 27 | 48 / 27 |
| 제목÷본문 3.5배 초과 | 17 | 16 | 0 | 0 |
| Myungjo 한글 + 굵기 ≥600 제목 | 2 | 2 | 2 | 2 |
| 문서 높이 평균 변화 | | +0.17% (최대 +2.5%) | | +0.24% (최대 +2%) |
| 가로 넘침 | 0 | 0 | 0 | 0 |

12개 대표 화면(SaaS 랜딩 saas-landing, 업무 admin-table·inbox, 대시보드 dashboard-overview, 커머스 product-detail, 블로그 blog-post, 글 article, 모바일 폼 contact·survey, 앱 랜딩 app-landing, 럭셔리 luxury-brand, 신문 news-home)의 제목·본문 px, 굵기, 자간, 행간, 줄 수, 한글·라틴 face 전후는 [compare-table.md](compare-table.md)에 있다. 프리셋 18종 × 같은 콘텐츠 비교는 `before/preset-matrix.json`, `after/preset-matrix.json`.

## 캡처에서 본 것(직접 열람)

최종 캡처(움직임 줄이기 적용본)에서 직접 연 이미지: `zoom/saas-landing-1440-title`, `zoom/app-landing-390-title`, `zoom/article-390-title`, `zoom/luxury-brand-1440-title`, `zoom/news-home-1440-digits`, `zoom/admin-table-1440-header`, `compare/survey-390`. 최초 캡처본에서는 `compare/saas-landing-1440`, `compare/news-home-1440`, `zoom/news-home-1440-cards`, `zoom/saas-landing-1440-title`을 열었고, 입장 애니메이션이 찍히는 것을 발견해 `prefers-reduced-motion`을 켜고 전부 재생성했다. 나머지 `compare/`의 22장과 `zoom/` 2장은 생성만 하고 열어 보지 않았다(미검토).

- **좋아진 것**: news-home의 날짜·수치 숫자가 한글과 같은 높이로 정리됐다(Georgia 구식 숫자 제거). saas-landing·app-landing의 큰 한글 제목에서 음절이 맞닿던 곳이 벌어지고 두 줄 사이가 넓어졌다.
- **차이가 거의 없는 것**: article 390, admin-table 머리말, survey 390은 자간 −0.025/−0.03 → −0.02, 행간 +0.05라 육안으로 구분이 어렵다. 이 화면들은 개선됐다고 주장하지 않는다.
- **나아지지 않은 것(남은 문제)**: survey(`editorial`)는 제목 굵기 500의 얇은 Myungjo와 15px 회색 본문이 그대로라 읽기 쉽지 않다. 이는 서체의 굵기·크기 한계이고 이번 규칙으로는 바뀌지 않는다. blog-post의 Seravek Bold 대 한글 SemiBold도 그대로다. news-home 본문의 회색 Myungjo 15px 얇음도 그대로다.
- **나빠졌을 가능성이 있는 것**: luxury-brand의 히어로 두 줄 제목 행간이 1.1 → 1.2가 되어 가는 Myungjo 제목의 줄 사이가 벌어졌다. 의도한 변화이고 결함은 아니라고 보지만 럭셔리의 "촘촘한 제목" 성격은 약해졌다. 같은 하한이 campaign-poster·game-launch(0.98 → 1.2)에도 걸려 포스터형의 압축감은 줄었다. 사용자 판단이 필요하다.

## 외부 근거

직접 조회(2026-11-16, WebFetch 요약. 수치는 요약기의 추출이므로 원문 대조 전까지 **확인 필요**).
- KRDS 타이포그래피: https://www.krds.go.kr/html/site/style/style_03.html. Pretendard GOV, 줄 간격 150% 이상, 본문 17px(최소 16px), Display 60/44px, Heading 40/32/24/19/17/15px, 굵기 제목 700·본문 400, 자간 Display·h1·h2 1px, 그 외 0. 한글·영문 구분 없이 같은 값(문서가 구분하지 않음).
- Toss Product Sans 개발기: https://toss.im/tossfeed/article/beginning-of-tps. "숫자와 영문은 국문보다 조금 더 작은 크기로 디자인", 숫자·영문이 얇아 보이지 않게 국문보다 조금 더 두껍게 설계. 한글·라틴 혼용 서체의 x-height·굵기 짝이 별도 설계 대상임을 보여 주는 사례다(서체 자체의 값은 복제하지 않음).
- Material 3 타입 토큰: https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-typescale.scss. display large 57/64, tracking −0.25px, headline large 32/40·medium 28/36·small 24/32, tracking 0, body large 16/24.
- Carbon 타입 세트: https://carbondesignsystem.com/elements/typography/type-sets/. heading-06 42/50, 제목 자간 0, fluid display 54~92px에 −0.64px.
- Fluent 2 타입 램프: https://fluent2.microsoft.design/typography. Display 68/92, Large Title 40/52, Title 1 32/40, Title 3 24/32 Semibold, Body 1 14/20.
- Pretendard 프로젝트: https://github.com/orioncactus/pretendard. Inter·Noto Sans KR·M PLUS 1p 기반, 다국어 혼용에서 별도 시각 보정이 필요 없도록 한 서체(검색 요약, 원문 대조 필요). 한글·라틴을 한 설계로 묶는 서체와 이 킷의 "두 서체 fallback"은 다르다는 점의 근거로만 썼다.
- 재사용(재조사 안 함): `docs/evidence/context-rollout/rule-ledger.md`의 HIG-05(Large Title 34/41 = 1.21), FLU-03, CAR-24·25, SPE-03(스크립트별 line metrics 점검), ATL-03, ANT-04, M3-04, POL-15.
- 못 한 것: Apple HIG 페이지는 요약기가 수치를 주지 않아 원장 값만 썼다. Polaris·Spectrum·Atlassian·Ant는 원장 값을 재사용했고 새로 조회하지 않았다. Toss Design System의 한글 제목 자간·행간 공개 수치는 찾지 못했다(버튼 자간 −0.01em, line-height 1만 검색에서 확인).

외부 수치는 플랫폼·서체·용도가 다르므로 채택한 값(자간 하한 −0.02em, 행간 하한 1.2~1.35, 상한 80/64px)은 위 측정(음절 잉크 간격, 잉크 높이, 한글/x-height 비율, 숫자 높이)에서 정했고 외부 값과의 차이는 위에 적었다.

## 개선 내용과 계약

변경: `src/typography.mjs`(`HANGUL` 한계, `TYPE_R2`, `typeSpec`, `refineTracking`, 스택 `news`·`palatino`), `src/styles/index.mjs`(리비전 2 자간 상수 정리), `src/compiler.mjs`(`manifest.design.typography`), `src/catalog/index.mjs`(2.3.0). 화면별 CSS 예외 추가 없음. Blueprint 스키마·웹폰트·CSP 변경 없음.

계약 테스트 `tests/typography-refine.test.mjs`(13개)가 한글 자간 하한, 라벨 상한, 제목 행간 하한, 크기 상한, 라틴 짝, 세리프 굵기, 상수 자간 정리, 2.1·2.2 출력 고정을 검사한다. RED: 구현 전 8개 전부 실패([logs/contract-red.log](logs/contract-red.log)). 변이 7종으로 실패 확인([logs/contract-mutations.log](logs/contract-mutations.log)). 변이 M7은 구현 중 첫 후측정에서 발견한 회귀(스택 이름을 바꾸자 세리프 굵기 바닥이 400에서 600으로 올라 literary 제목이 굵어짐)를 잡는 테스트이고 이 회귀는 고쳤다.

## 호환 차이

2.1.0·2.2.0 입력은 출력이 바이트 단위로 같다. 2.1.0 85개는 기존 `legacy-hashes.json`, 2.2.0 85개는 이번에 기준 revision에서 새로 고정한 `legacy-2-2-hashes.json`·`legacy-2-2-blueprints.json`과 대조한다(`tests/typography-refine.test.mjs`). `kit migrate`는 catalogVersion만 바꾼다. **같은 입력이 2.3.0으로 올라가면 달라지는 것**: 서체 자간·행간·크기 상한·서체 스택(newsroom·literary)·세리프 제목 굵기, 라벨 자간, 컴포넌트 자간 상수, 그리고 그에 따른 `manifest.design`의 간격 예산(composition은 같은 1.2.0 정책을 쓰되 입력 크기 값이 다르다). 템플릿 내용은 바뀌지 않는다.
