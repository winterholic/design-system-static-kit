# 기획 교차 검토 · 타이포그래피 2.3.0

2026-11-16 UTC. 배포 대상 소스: `d09d1d18d43b7dd0b9348b843beec20619820a74`. 기준 소스: `f22b9ae6902c2dad103bb36372bbd531dd40ffe1`.

## 판정 범위

가장 뚜렷하게 확인한 문제는 큰 한글 제목의 과한 음수 자간과 좁은 행간이다. 큰 제목의 간격을 완화하고 신문·문학 프리셋의 라틴 스택을 교체한 공통 교정을 채택한다. 모든 타이포그래피 부조화의 원인이 이것뿐이라고 확정하거나 사용자 체감이 해소됐다고 보증하지 않는다. 서체·크기·굵기를 전체적으로 기각한다는 작업자 표현은 이 표본에서 주원인으로 입증되지 않았다는 뜻으로 한정한다.

기획이 `compare/`의 24장(12개 화면 × 1440·390px)을 모두 직접 열람했다. SaaS·앱 랜딩은 제목의 글자와 줄 사이가 넓어지고, 신문은 숫자와 한글 높이가 고르게 보인다. 폼·업무·글 화면에서는 변화가 작다. 럭셔리 화면은 압축감이 줄지만 확인한 표본에서 제목이 과하게 흩어져 보이지 않아 채택한다. campaign-poster·game-launch의 실제 미감은 이번 기획 검토에 포함하지 않았다. 각 파일은 캡처한 범위의 비교이며 긴 페이지 전체에 대한 육안 검토를 뜻하지 않는다.

`zoom/`의 확대 비교 9장도 모두 직접 열람했다. `saas-landing-1440-title`은 스크롤 중 sticky 헤더가 제목 윗부분을 가린 장면이어서 제목 잘림의 증거로 쓰지 않았다. 스크롤 상단의 `compare/saas-landing-1440`·`390`에서 제목이 온전히 보임을 확인했다.

## 집계 재검산

Python으로 before·after `examples.json`을 직접 읽었다. 각각 170행·170개 고유 화면이며 제목 누락은 없다. 1440px 한글 주제목의 자간 ≤ −0.03em은 58 → 0, 390px은 59 → 0이다. 두 줄 이상 제목의 행간 <1.15는 각각 14 → 0, 15 → 0이다. 이는 선언 수치의 교정이며 미감 점수가 아니다.

`heights.json`은 170개 고유 화면을 포함하고 후측정 가로 넘침은 0이다. 문서 높이 평균 변화는 1440px +0.168%, 390px +0.240%, 최대는 각각 +2.5%, +2.0%다. 12개 대표 화면의 전후 원본은 각 24장, 비교는 24장, 확대 비교는 9장이다.

`node --test tests/typography-refine.test.mjs`를 기획이 실행해 13 pass / 0 fail을 확인했다. 작업자의 `logs/verify.log`와 `logs/e2e.log` 원문에서 verify exit 0·3300파일 재현과 Chromium 51 passed·exit 0을 확인했다. 전체 검사는 동일 소스의 GitHub CI 결과와 함께 판단한다. 별도로 기준 revision의 src만 임시 디렉터리에 git archive로 풀어 컴파일러를 직접 import한 뒤 현재 고정 입력 85개를 양쪽 컴파일러로 실행했다. 기준 출력·고정 hash·현재 출력이 모두 같았다(`INDEPENDENT_BASELINE 85 HASH_MISMATCHES 0`). 임시 디렉터리는 검사 후 제거했다.

## 측정 해석 정정

`tracking-gap.mjs`의 `touching`은 실제 접촉을 세는 함수가 아니라 **글리프 경계 상자 사이 계산 간격이 0.01em 미만인 쌍**의 비율이다. 18%·27%를 실제 글자가 닿거나 겹친 비율로 인용하면 안 된다. 또한 제목에서 공백·구두점을 제거하고 이어 붙인 607음절을 사용하므로 실제 문장에 없는 이웃 쌍도 포함한 자간 민감도 실험이다. 진단 원문의 “닿는 쌍”은 이 대용 지표로 한정해 읽는다. 실제 화면에서 더 읽기 쉬워졌는지는 별도의 육안 판정이다.

AppleMyungjo의 단일 굵기는 이번 macOS 실측 범위다. Windows의 Batang과 Linux의 Nanum Myeongjo 등 다른 fallback의 굵기 수와 동작은 이번에 검증하지 않았다. 소스 주석의 여러 서체가 모두 단일 굵기라는 일반화는 검증 근거로 채택하지 않는다. 상한 700은 이번 릴리스의 보수적인 공통 정책이다.

## 공식 원문 추가 대조

작업자의 요약기 결과에서 확인 필요였던 다음 네 자료를 기획이 web 도구로 직접 열어 본문과 대조했다. 8개 시스템의 이전 조사와 원장은 재사용하며 이번에 8곳 모두를 새로 조사했다고 주장하지 않는다.

- [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html): 본문 최소 16px·기본 17px, 행간 150% 이상, display large 60/44px, heading xlarge 40/28px(PC/모바일), 상위 두 heading 자간 1px을 확인했다. 진단의 heading 40/32/24/19/17/15는 PC 크기 열이다. 모든 크기의 본문이 최소 16px이라는 토큰 표의 뜻은 아니며 작은 보조 역할에는 15·13px도 있다.
- [Material Web 공식 토큰 v0.192](https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-typescale.scss): display large 3.5625rem/4rem, 자간 −0.015625rem, body large 1rem/1.5rem을 확인했다. 57/64px·−0.25px은 루트 16px 환산이다. 이 버전의 값이며 모든 Material 플랫폼의 보편값으로 확장하지 않는다.
- [Fluent 2 Web 타입 램프](https://fluent2.microsoft.design/typography): display 68/92px, large title 40/52px, title 1 32/40px, body 1 14/20px을 확인했다. 플랫폼별 램프를 구분한다.
- [Carbon 타입 세트](https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets): heading-06 42/50px·자간 0, fluid-display-04 92/102px·−0.64px, productive/expressive의 용도 구분을 확인했다. 92px은 해당 display 항목에서 관측한 값이며 반응형 전 구간의 최대값 보증으로 쓰지 않는다. 96px을 외부 범위 “안쪽”으로 표현한 진단 요약은 부정확하다. 96px은 이 비교값 92px보다 크다.

외부 문서의 숫자를 킷의 정답으로 복제하지 않는다. 킷의 자간·행간 하한과 크기 상한은 자체 교정 정책이며 모든 공식 시스템의 수치를 동시에 준수한다는 뜻이 아니다. Toss·Pretendard의 조사 요약은 이번에 원문 대조하지 않았다.

## 남은 품질과 후속 순서

1. 설문과 신문형의 작은 회색 명조 본문은 여전히 가늘게 보인다. 다음 교정에서는 본문 역할과 페이지 목적을 함께 보고 서체·굵기·크기 대안을 비교한다.
2. blog-post의 Seravek Bold와 한글 SemiBold 차이는 남아 있다. 개별 화면 예외 대신 스택별 실제 굵기 매핑을 검토한다.
3. 포스터·게임·럭셔리의 압축감과 가독성 균형은 표현형 프리셋의 후속 비교 대상이다. 이번 자동 수치 개선만으로 미감 향상을 선언하지 않는다.
4. Windows·Android·실기기 iOS, 보조기기 검증은 미실행이다. 시스템 서체에 따른 차이는 여전히 있다.

운영 배포 시도는 Codex 실행 경로에서 `Not authorized`로 실패했다. `deployment-attempt.json`, `deploy-cli.log`가 실패 정본이다. `production-version.json`의 HTTP 200 응답은 여전히 2.2.0이고 `production.json`의 109개 경로 중 104개가 새 로컬 산출물과 다르다. 새 버전 운영 렌더 검증은 미실행이다. 로컬 2.3 조립기와 390px SaaS를 configured browser로 추가 확인했고 `local-browser.json`과 `local-browser/`에 보존했다. 브라우저를 닫았고 로컬 서버는 종료 코드 130을 받았다. 최종 전달과 재개 순서는 `release.md`에 있다.
