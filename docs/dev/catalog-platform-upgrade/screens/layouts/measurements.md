# 레이아웃 24종 브라우저 실측

> `node scripts/layouts/measure.mjs`가 생성한다(Chromium, 뷰포트 320·360·480·640·768·1024·1280·1440px). 손으로 고치지 않는다.

가로 스크롤은 표본과 긴 콘텐츠 표본에서 문서 `scrollWidth - 뷰포트`와 스크롤 영역 밖 요소의 오른쪽 이탈을 센다. 슬롯 위치 서명은 열·행 순위와 폭 비율이라 단순 축소는 같은 서명이다.

- 레이아웃 24종 × 폭 8개 × 표본 2종 측정, 가로 스크롤 최대 0px, 스크롤 영역 밖 이탈 요소 0개
- 쌍별 비교 276쌍: 폭 4개 중 서명이 다른 폭의 최소 2개, 2개 미만인 쌍 0개

| 레이아웃 | 가로 스크롤(px) | 이탈 요소 | 구간 | 인접 폭 재배치(320→768→1024→1440) | 서로 다른 배치 수 | 대표 폭 |
|---|---|---|---|---|---|---|
| asymmetric-grid | 0 | 0 | xs→sm→md→lg | 이동 1 · 이동 2 · 이동 2 | 4 | 1024px |
| bento | 0 | 0 | xs→sm→md→lg | 이동 1 · 같음 · 이동 1 | 3 | 1440px |
| centered-hero | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 3 · 이동 3 | 4 | 768px |
| commerce-grid | 0 | 0 | xs→sm→md→lg | 이동 1 · 이동 2 · 이동 2 | 4 | 1024px |
| dashboard-grid | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 3 · 이동 2 | 4 | 1024px |
| documentation-layout | 0 | 0 | xs→sm→md→lg | 같음 · 이동 3 · 이동 3 | 3 | 1440px |
| double-sidebar | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 3 · 이동 3 | 4 | 1440px |
| editorial-layout | 0 | 0 | xs→sm→md→lg | 이동 6 · 이동 6 · 이동 3 | 4 | 1440px |
| equal-grid | 0 | 0 | xs→sm→md→lg | 이동 1 · 이동 1 · 같음 | 3 | 1024px |
| form-layout | 0 | 0 | xs→sm→md→lg | 이동 1 · 이동 4 · 이동 4 | 4 | 1024px |
| kpi-strip | 0 | 0 | xs→sm→md→lg | 이동 1 · 같음 · 이동 2 | 3 | 1024px |
| masonry | 0 | 0 | xs→sm→md→lg | 이동 1 · 이동 1 · 이동 1 | 4 | 1024px |
| master-detail | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 3 · 이동 2 | 4 | 768px |
| media-hero | 0 | 0 | xs→sm→md→lg | 같음 · 같음 · 이동 3 | 2 | 1024px |
| mobile-stack | 0 | 0 | xs→sm→md→lg | 이동 1 · 이동 3 · 이동 3 | 4 | 1024px |
| multi-step-form | 0 | 0 | xs→sm→md→lg | 같음 · 이동 3 · 이동 1 | 3 | 1024px |
| product-detail-layout | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 4 · 이동 4 | 4 | 1024px |
| settings-layout | 0 | 0 | xs→sm→md→lg | 같음 · 이동 4 · 이동 4 | 3 | 1024px |
| sidebar-main | 0 | 0 | xs→sm→md→lg | 이동 2 · 이동 2 · 같음 | 3 | 768px |
| single-column | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 3 · 이동 3 | 4 | 1440px |
| split-hero | 0 | 0 | xs→sm→md→lg | 이동 3 · 이동 3 · 이동 3 | 4 | 1024px |
| sticky-action-layout | 0 | 0 | xs→sm→md→lg | 같음 · 이동 3 · 이동 2 | 3 | 1024px |
| three-column | 0 | 0 | xs→sm→md→lg | 이동 2 · 이동 3 · 이동 3 | 4 | 1024px |
| two-column | 0 | 0 | xs→sm→md→lg | 이동 2 · 같음 · 이동 2 | 3 | 768px |

## 쌍별 구분(서명이 다른 폭 수가 적은 쌍 15개)

| 레이아웃 A | 레이아웃 B | 다른 폭 |
|---|---|---|
| documentation-layout | media-hero | 2 (1024·1440) |
| multi-step-form | settings-layout | 2 (1024·1440) |
| single-column | split-hero | 2 (1024·1440) |
| equal-grid | kpi-strip | 3 (320·768·1440) |
| sticky-action-layout | three-column | 3 (768·1024·1440) |
| asymmetric-grid | bento | 4 (320·768·1024·1440) |
| asymmetric-grid | centered-hero | 4 (320·768·1024·1440) |
| asymmetric-grid | commerce-grid | 4 (320·768·1024·1440) |
| asymmetric-grid | dashboard-grid | 4 (320·768·1024·1440) |
| asymmetric-grid | documentation-layout | 4 (320·768·1024·1440) |
| asymmetric-grid | double-sidebar | 4 (320·768·1024·1440) |
| asymmetric-grid | editorial-layout | 4 (320·768·1024·1440) |
| asymmetric-grid | equal-grid | 4 (320·768·1024·1440) |
| asymmetric-grid | form-layout | 4 (320·768·1024·1440) |
| asymmetric-grid | kpi-strip | 4 (320·768·1024·1440) |
