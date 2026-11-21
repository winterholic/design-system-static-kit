# 조립 API 제품 맥락 증거

기준 소스 커밋은 `0bdbf96cd6cf3f1c016b9c216e24ce8a2c0346e6`이다. 이 디렉터리의 화면은 공개 서비스 API `assembleBlueprint`와 `compileBlueprint`에서 생성했다. HTML/CSS를 수작업으로 덧대지 않았다.

## 재생성

```sh
node scripts/material-platform-evidence/build.mjs
npm run layout:check -- --file docs/evidence/material-platform/assembled/erp/index.html --widths 390,1280 --json docs/evidence/material-platform/layout/erp.json
```

로컬 CLI의 Chromium이 시작되지 않는 환경에서는 실행 스크립트를 띄워 설정된 Ttakkari browser가 같은 `layoutProbe`를 수행하게 한다. `node scripts/material-platform-evidence/serve.mjs` 실행 후 browser MCP에서 `http://127.0.0.1:4339/scripts/material-platform-evidence/probe.html`을 열면 네 화면을 390px·1280px로 계측해 `layout/report.json`에 저장한다. 화면 캡처는 browser MCP로 각 폭에서 캡처한다. 캡처, 본문 크기, 발견 코드·심각도·경로·측정값·제안은 `layout/`에 보존한다.

## 비교 표본과 선택 재료

| ID | 업무 맥락 | 공개 프로파일 | 패턴 / 템플릿 | 테마 | 타이포 역할 | 폭 |
|---|---|---|---|---|---|---|
| erp | 주문·재고 운영 | `erp` | `erp-workspace` / `admin-table` | `ledger` | `type-role-preset:erp` | `full` |
| commerce | 상품 목록 | `commerce` | `commerce-listing` / `product-listing` | `commerce` | `type-role-preset:marketing` | 프로파일 기본 |
| saas | 제품 소개·가입 | `saas-landing` | `marketing-landing` / `saas-landing` | `trust` | `type-role-preset:marketing` | 프로파일 기본 |
| analytics | 데이터·재무 분석 | `finance` | `dashboard-grid` / `dashboard-overview` | `bank` | `type-role-preset:dashboard` | `wide` |

화면별 전체 재료 선택, 의도, 프로파일 결정, Blueprint/HTML/CSS SHA-256과 바이트 수는 [assembly.json](assembly.json)에 있다. 각 행의 Blueprint, 생성 HTML, 생성 CSS, 컴파일 manifest는 `assembled/<id>/`에 있다. 분석 화면은 `chart-preset:finance-monthly-close`를 선택했다.

## C단계: 사람 평가 기준과 상태

C단계는 브라우저 검사 결과와 별개인 사람의 시각 평가다. 이 기록을 만든 세션은 평가자가 아니므로 네 표본 모두 **미평가**다. 자동 검사 결과를 사람 점수로 대신하지 않는다. 기준과 양식은 [평가 기준](evaluation/rubric.md), [빈 기록 양식](evaluation/record-template.csv)에 있다. 채워진 평가 행은 평가자가 실제로 보고 점수를 매기기 전까지 만들지 않는다.

## 레거시 검사기 대조 표본

- 오탐 후보: S21 `product-detail~tabs:boxed` 320px에서 EDGE가 심각으로 집계됐지만, 해당 탭 목록은 가로 스크롤 영역으로 판정되어 Q17에서 통과했다. 검사는 스크롤 가능성을 위반으로 단정하면 안 된다. 끝 탭이 잘려 보이고 스크롤 단서가 없다는 별도 사용성 관찰도 기록돼 있어, 이는 명확한 오탐 확정이 아니라 오탐 후보와 놓친 사용성 문제의 동시 사례다.
- 미탐: S06 벤토 그림은 SVG `viewBox="0 0 320 320"`, `preserveAspectRatio="xMidYMid slice"`, 렌더 박스 594×328px로 약 45%가 잘렸지만 검사기가 이를 지적하지 않았다. 검사는 SVG 내부 viewBox 밖으로 나온 그림은 찾지만, `slice`로 상자에 맞추며 잘린 의미 콘텐츠는 판단하지 못한다.

이 두 반례는 [2026-11-21 최종 품질 기록](../../quality-final-2026-11-21.md)의 R-10, R-04와 화면·계측 기록을 기준으로 골랐다. `legacy-controls/`의 재생성한 두 입력과 대표 화면 네 개의 B단계 실행 결과는 `layout/`에 있다. 기준 커밋과 실행 환경은 [run.json](layout/run.json)에 기록했다.

## 화면 증거와 검사 결과

[레이아웃 결과 요약](layout/findings.md), 원시 측정 [JSON](layout/report.json), 실행 환경·미실행 CLI 기록 [run.json](layout/run.json)을 확인한다. Chromium 전체 페이지 캡처는 다음과 같다.

| 화면 | 390px | 1280px |
|---|---|---|
| ERP | [캡처](layout/erp-390.png) | [캡처](layout/erp-1280.png) |
| 커머스 | [캡처](layout/commerce-390.png) | [캡처](layout/commerce-1280.png) |
| SaaS | [캡처](layout/saas-390.png) | [캡처](layout/saas-1280.png) |
| 분석 | [캡처](layout/analytics-390.png) | [캡처](layout/analytics-1280.png) |
