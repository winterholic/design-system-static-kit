# Chromium 레이아웃 검사 결과

## 실행 정보

- 대상 입력: `docs/evidence/material-platform/assembled/{erp,commerce,saas,analytics}/index.html` 및 각 `styles.css`. 모두 통합 기준 `da7c86486c5f02509e5d80d4061b4aa0d1040a34`의 재료 카탈로그 2.6.0에서 조립했다.
- 측정한 소스 revision: `509fdbc369d5e1ea931ba0209e9e7a5dec0e6e8f` (`feat/representative-layout-fix`). 원시 JSON에도 입력 revision과 소스 revision을 적었다.
- 새 측정: 2026-11-21T17:53:41.284Z (KST 2026-11-22 02:53:41), 설정된 Ttakkari Chromium / HeadlessChrome 157, deviceScaleFactor 1. 화면 폭 390px·1280px, 재현 대조군 S21@320·S06@1440.
- 정본 원시 결과: [report.json](report.json). 현재 캡처는 여덟 대표 화면과 여덟 전체 페이지 PNG이며, `*-390.png` / `*-1280.png`는 새 측정에 해당한다.
- 직전 기준: [report-previous-2026-11-21T172945Z.json](report-previous-2026-11-21T172945Z.json), capturedAt 2026-11-21T17:29:45.405Z. 이후 변경 전 브라우저 재현(17:42:03.548Z)은 대표 화면 오류 29건과 정보 1건, 레거시 오류 2건과 정보 1건을 확인했다. 그 여덟 화면 캡처는 `baseline-2026-11-21T174203Z-*` 파일에 보존했다.
- 사람의 시각 평가는 진행하지 않았다: `미평가`. 검사기는 자동 레이아웃 계측이며 사람 평가를 대신하지 않는다.

## 발견과 조치

| 과거 발견 | 실제 원인과 근거 | 교정 / 현재 결과 |
|---|---|---|
| ERP·분석 상단바 위치 오차와 메뉴 넘침 | 기존 검사기는 페이지 `header` 전체를 상단바로 잡아 메뉴의 넘침과 컨테이너 가장자리를 혼합했다. 상단바 중심으로 잡힌 페이지 타이틀도 제품 셸 바가 아니었다. 새 selector는 `.kit-header`, `[role=banner]`, `[data-layout-bar]`만 대상으로 하며 좌우 경계는 컨테이너 패딩 안쪽에서 잰다. | 대표 화면에서 `BAR_MISALIGNED_X/Y`, `OVERFLOW_X` 모두 0. ERP 모바일 내비(숨김 55px)와 표(134px)는 의도된 수평 스크롤 `info`로 남았다. 임계값은 바꾸지 않았다. |
| 커머스 데스크톱 카드 여섯 장, 각각 7.4px 글자 잘림 | 1280px 캡처에서 6개 상품 카드의 가격/평점 텍스트가 카드 `overflow:hidden` 경계 밖으로 나갔다. 초기 body flex 조정만으로는 재측정에서 해소되지 않아 카드 경계가 직접 클리핑하는 것을 확인했다. | 카탈로그 2.6.0의 상품 카드에만 `overflow:visible`을 적용하고 본문 flex item의 최소 크기를 보장했다. 행 간격이 남아 인접 카드와 겹치지 않으며 Chromium에서 두 폭 모두 `CLIP_TEXT` 0. |
| SaaS 제목 13px, 모바일 인용문 두 건 | 로고 클라우드 제목이 캡션 크기 13px을 상속했다. 인용문은 23.3ch의 두 칸에 놓였지만 짧은 발췌문이며 일반 긴 본문 역할 검사가 부적절했다. | 로고 클라우드 내 제목을 17px 본문 계층으로 올렸다. 인용문 안 문단은 의미 역할 `short`로 검사한다. 두 폭 모두 발견 0. |
| 분석 SVG 라벨 12개, 렌더 9.4px | 선언 11px에 SVG 0.9 배율이 곱해져 역할 하한 10px 미만으로 렌더됐다. | 카탈로그 2.6.0 차트 라벨을 13px로 올렸다(화면 렌더 약 11.7px). 390/1280px 모두 `SMALL_TEXT` 0. |

현재 대표 화면 여덟 측정은 총 오류 0건이다. ERP@390에 의도된 내비·표 `SCROLL_REGION` 정보 2건만 남는다. 레거시 대조군은 S21@320에서 탭·내비 수평 스크롤 정보 2건, 오류 0건이며 S06@1440은 발견 0건이다. S06의 과거 SVG slice 미탐은 별도 검출기 작업이므로 이 작업에서 수정하거나 완료로 간주하지 않았다.

## 고정 입력과 회귀 경계

- 2.4.0·2.5.0 출력 및 고정 예시는 변경하지 않았다. 공통 재료 교정은 `src/styles/material-quality.mjs`에서 2.6.0일 때만 삽입한다.
- 웹 Studio·Components와 컨트롤 노드 8종 배선은 변경하지 않았다.
- 이전 브라우저 결과 JSON·캡처와 현재 결과 JSON·캡처를 함께 보존했다. assembly manifest의 Blueprint·HTML·CSS SHA-256은 `assembly.json`에 갱신했다.
