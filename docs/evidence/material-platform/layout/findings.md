# Chromium 레이아웃 검사 결과

검사 입력은 `assembled/<id>/index.html` 네 개, 폭은 390px와 1280px다. 정본 원시 결과는 [report.json](report.json)이며 각 발견의 code·severity·CSS 경로·텍스트·측정값·대안을 담는다. 화면 캡처는 같은 폭의 `*-390.png`, `*-1280.png` 파일이다. `npm run layout:check` CLI는 command worker Chromium 시작 단계에서 거부됐지만, 설정된 Ttakkari browser에서 동일한 `scripts/layout-quality/probe.mjs`의 `layoutProbe`를 실제 렌더된 화면에 실행해 이 결과를 저장했다.

| 화면 | 폭 | 결과 |
|---|---:|---|
| ERP | 390px | 3 error: 내비 오른쪽 10.7px 넘침, 상단바 오른쪽 경계 26.7px 어긋남, 페이지 헤더 중심 25.6px 어긋남. 표 스크롤 134px은 info. |
| ERP | 1280px | 1 error: 페이지 헤더 중심 8px 어긋남. |
| 커머스 | 390px | 발견 0건; 검사 범위는 86 텍스트, 28 clip 후보, 7 SVG, overflow 1, 상단바 1. |
| 커머스 | 1280px | 6 error: 여섯 카드 모두 높이 방향으로 7.4px 글자 잘림, 카드 상자 각각 281.3×432.5px. |
| SaaS | 390px | 3 error: 제목 13px(하한 16px), 인용문 두 칸에서 23.3ch 폭에 본문 3줄. 제안은 제목 글자 키우기와 본문 칸 넓히기/열 줄이기. |
| SaaS | 1280px | 1 error: 제목 13px(하한 16px). |
| 분석 | 390px | 14 error: 차트 축/값 글자 12개가 렌더 9.4px(선언 11px × SVG 배율 0.9, 하한 10px); 상단바 오른쪽 경계 8.7px 어긋남; 페이지 헤더 중심 22.8px 어긋남. |
| 분석 | 1280px | 1 error: 페이지 헤더 중심 12px 어긋남. |

전체 30건(오류 29, 스크롤 영역 정보 1)이다. 이 표는 재료의 품질 등급이나 사람의 시각 점수가 아니다. 개선을 반영하지 않고 관찰만 보존했다. 대안과 element locator는 원시 결과에 있다.

## 과거 검사기 대조 표본

과거 오탐 후보와 미탐은 README에 명시한 R-10 / R-04 근거를 보존한다. 이 브랜치에서 해당 과거 HTML을 재생성해 다시 재지 않았다. 현재 검사 결과를 과거 재현 결과인 것처럼 합치지 않는다.
