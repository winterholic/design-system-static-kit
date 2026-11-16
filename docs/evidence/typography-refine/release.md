# 타이포그래피 개선 · 운영 배포 막힘

> 이 문서는 최초 배포 실패 시점의 보고서입니다. **후속 배포는 2026-11-17 KST에 성공했습니다.** 현재 운영 결과와 증거는 [운영 반영 확인](rollout-2026-11-17/release.md)을 보세요. 아래 실패 이력은 보존합니다.

카탈로그 2.3.0의 코드 개선과 CI 검증은 끝났습니다. **운영 배포는 인증·권한 오류로 막혔습니다.** [운영 사이트](https://design-system-static-kit.vercel.app/)는 HTTP 조회에서 여전히 2.2.0입니다.

이번 표본에서 가장 뚜렷한 문제는 큰 한글 제목의 과한 음수 자간과 좁은 행간이었습니다. 큰 제목의 글자·줄 간격을 완화하고, 한영 숫자 높이가 어긋나는 신문·문학 프리셋의 라틴 서체를 교정했습니다. 크기 상한도 낮췄지만 실제 크기 변화는 작았습니다. 모든 부조화의 원인이 한 가지라고 확정하지는 않습니다.

## 바뀐 공통 규칙

- 큰 제목 자간 하한 −0.02em, 제목 역할별 행간 하한 1.2~1.35.
- display 80px·페이지 제목 64px·섹션 제목 40px 상한. 커버용 파생 역할은 88px까지 사용합니다.
- 신문 Georgia → Times New Roman, 문학 Baskerville → Palatino. 세리프 제목 굵기 상한 700.
- 화면별 CSS 예외와 웹폰트를 추가하지 않았습니다. 2.1·2.2 입력은 기존 출력을 유지하고, 2.3 입력에 새 규칙을 적용합니다.

## 확인한 결과

| 항목 | 1440px | 390px |
|---|---:|---:|
| 한글 주제목 자간 ≤ −0.03em | 58 → 0 | 59 → 0 |
| 두 줄 이상 제목 중 행간 <1.15 | 14 → 0 | 15 → 0 |
| 문서 높이 평균 변화 | +0.168% | +0.240% |
| 후측정 문서 가로 넘침 | 0 | 0 |

85개 예시 × 두 폭 = 170뷰를 전후 측정했고, 기획이 집계를 다시 계산했습니다. 대표 12개 화면의 비교 24장과 확대 9장을 모두 열어 봤습니다. 큰 제목의 답답함과 신문 숫자는 나아졌지만, 폼·업무·본문 화면의 변화는 작습니다. 자동 수치를 미감 점수로 해석하지 않았습니다.

`npm run verify`: 175 pass / 0 fail, 생성 3300파일 바이트 재현. 작업자 Chromium 회귀: 51 passed. 기획 계약 재실행: 13 pass / 0 fail. 별도로 기준 revision과 현재 컴파일러를 직접 대조해 2.2 입력 85개 출력이 모두 같음을 확인했습니다.

[GitHub Verify](https://github.com/winterholic/design-system-static-kit/actions/runs/43888654462)는 소스 `d09d1d18d43b7dd0b9348b843beec20619820a74`에서 success입니다. Codex 실행 환경에서 `vercel deploy --prod --yes --archive=tgz`는 exit 1 / `Not authorized`로 실패했고 새 deployment ID를 받지 못했습니다. `vercel whoami`와 읽기 전용 inspect도 CLI 오류로 실패했습니다. 이 결과를 호스트 전체나 다른 실행 경로의 불가로 일반화하지 않습니다.

운영 109개 경로를 읽기 전용으로 조회했고 로컬 2.3 산출물과 104개가 다릅니다. 운영 카탈로그는 2.2.0이므로 배포 완료로 보고하지 않습니다. 로컬 configured browser에서는 CATALOG 2.3.0, 모바일 SaaS 렌더와 조립기의 SaaS 선택 후 트리 검증 통과를 확인했습니다. 새 버전의 운영 렌더 검증은 미실행입니다.

## 근거와 한계

[KRDS](https://www.krds.go.kr/html/site/style/style_03.html), [Material 공식 타입 토큰](https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-typescale.scss), [Fluent 2](https://fluent2.microsoft.design/typography), [Carbon](https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets)을 원문 대조했습니다. 이전 8개 시스템 원장은 재사용했습니다. 외부 수치를 그대로 복제한 정책은 아닙니다.

설문·신문형의 얇은 명조 본문, blog-post의 한영 굵기 차이는 남아 있습니다. 포스터형은 줄 간격이 넓어져 압축감이 줄어듭니다. Windows·Android·실기기 iOS·보조기기는 미검증입니다. 사용자 체감이 모두 해소됐다고 보증하지 않습니다.

첨부 ZIP에는 진단, 기획 교차 검토와 해석 정정, 측정 원본, 전후 캡처, 비교 24장·확대 9장, 테스트 로그, CI와 배포 실패 영수증이 들어 있습니다. `tracking-gap`의 “touching”은 실제 접촉이 아니라 계산 간격 <0.01em인 대용 지표라는 점을 `review.md`에서 정정했습니다.

## 남은 실행

이 실행 경로의 Vercel 인증 또는 배포 권한을 복구한 뒤, 검증한 소스 d09d1d1의 site를 `.qa/deploy/`에서 배포해야 합니다. 소스가 바뀌지 않으면 기존 CI 결과를 재사용하고, 배포 뒤 새 deployment ID·READY·운영 별칭과 109개 경로 바이트 일치 및 운영 브라우저를 확인합니다. 비밀 토큰은 대화로 보내지 않습니다. 소스와 배포 준비물은 보존했습니다.
