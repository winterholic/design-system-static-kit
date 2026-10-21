# 6차 전수 진단: 레이아웃·간격·타이포 품질

> 이 문서는 `node scripts/design-qa/grades.mjs`가 진단 결과(`docs/evidence/diagnosis-round6.json`)에서 만든다. 손으로 고치지 않는다.

## 방법

- **대상.** 템플릿 × 구성 변형 조합 전부(고유 화면만, 같은 화면은 한 번). 조합마다 **기본 테마 + 돌려 쓰는 테마 1개**를 **데스크톱 1440 · 모바일 390**에서 렌더한다(4,955개 조합, 19,820회 렌더). 같은 도구로 6차 이전 코드(3c07dbad)도 쟀다(3,982개 조합, 15,928회 렌더).
- **측정.** 세 프로브를 한 렌더에 모두 돌린다: 4차 간격(`spacing-probe`), 5차 글줄(`text-probe`), 6차 배치(`layout-probe`: EMPTY_CELL 빈 칸, TIGHT_ROW 낮은 줄의 안쪽 여백, MEASURE 한 줄 길이, BIG_NARROW 좁은 칸의 큰 글자, HIER_INVERT 위계 뒤집힘, GRID_ORPHAN 마지막 줄 한 칸, BAND_ASYM 띠 여백 비대칭, EDGE_VIEW 화면 가장자리 글자).
- **등급.** A 그대로(지적 0) · B 손질(경미한 지적만: MEASURE·BAND_ASYM·OFF_SCALE·CTRL_PAD·ORPHAN_LINE 등) · C 재설계(심각한 지적이 한 번이라도: EMPTY_CELL, BIG_NARROW, HIER_INVERT, TIGHT_ROW, GRID_ORPHAN, OVERFLOW_X, CLIP_TEXT, EDGE_VIEW, HEAD_GAP, PROXIMITY, EDGE, PAD_ASYM, PAIR_GAP, CTRL_WRAP, VALUE_WRAP, HEAD_ORPHAN, NARROW_COL).
- **한계.** 이 등급은 측정 가능한 결함의 유무이지 미감의 보증이 아니다. 대표 화면은 따로 눈으로 확인했고(전후 스크린샷), 4,000여 조합 전수를 사람이 보지는 않았다. macOS 폰트로 쟀으며 Linux CI와 달라질 수 있다.

## 등급 분포

| | 조합 수 | A 그대로 | B 손질 | C 재설계 |
|---|---|---|---|---|
| 6차 이전 | 3,982 | 1733 (43.5%) | 269 (6.8%) | 1980 (49.7%) |
| **6차 이후** | 4,955 | 4415 (89.1%) | 540 (10.9%) | 0 (0.0%) |

C 등급 조합은 갤러리에서 **실험**으로 표시하고 기본으로 숨긴다(`src/combo-grades.mjs`). 현재 C 등급은 0개라 숨긴 조합이 없다. 숨기는 쪽이 아니라 원인(벤토·격자·구성 변형의 적용 조건·위계)을 고쳐서 없앴다. 표시·숨김 장치는 합성 데이터로 시험한다(tests/combos.test.mjs).

## 지적 코드별 영향 조합 수

| 코드 | 심각도 | 6차 이전 | 6차 이후 |
|---|---|---|---|
| GRID_ORPHAN | 심각 | 1351 | 0 |
| EMPTY_CELL | 심각 | 840 | 0 |
| MEASURE_SHORT | 경미 | 371 | 399 |
| MEASURE | 경미 | 328 | 3 |
| ORPHAN_LINE | 경미 | 262 | 138 |
| BIG_NARROW | 심각 | 210 | 0 |
| ORPHAN_HEADING | 경미 | 131 | 0 |
| HIER_INVERT | 심각 | 112 | 0 |
| NARROW_COL | 심각 | 47 | 0 |
| TIGHT_ROW | 심각 | 8 | 0 |
| EDGE | 심각 | 2 | 0 |
| CLIP_TEXT | 심각 | 1 | 0 |

## 템플릿별 등급(85개)

기본 구성의 등급과, 그 템플릿의 모든 조합 중 A/B/C 수다. 전/후는 6차 이전/이후.

| 템플릿 | 기본 구성 전 | 기본 구성 후 | 조합 전 A/B/C | 조합 후 A/B/C | 남은 심각 지적 |
|---|---|---|---|---|---|
| about-team | C | A | 0/0/12 | 12/0/0 | — |
| admin-table | A | A | 4/0/0 | 2/0/0 | — |
| agency-home | A | A | 332/0/388 | 720/0/0 | — |
| api-reference | B | B | 0/108/0 | 0/54/0 | — |
| app-landing | A | A | 40/0/40 | 240/0/0 | — |
| article | A | A | 36/0/0 | 36/0/0 | — |
| audit-log | A | A | 6/0/6 | 3/0/0 | — |
| b2b-solution | A | B | 7/1/32 | 48/12/0 | — |
| bank-product | A | A | 20/0/20 | 60/0/0 | — |
| beauty-detail | C | A | 0/0/64 | 16/0/0 | — |
| billing | A | A | 36/0/36 | 18/0/0 | — |
| blog-index | A | A | 6/0/6 | 6/0/0 | — |
| blog-post | A | A | 4/0/0 | 4/0/0 | — |
| cafe-home | C | A | 57/0/33 | 180/0/0 | — |
| calendar-view | C | A | 0/0/8 | 1/1/0 | — |
| campaign-donate | B | B | 13/17/30 | 13/17/0 | — |
| campaign-poster | C | A | 0/0/120 | 120/0/0 | — |
| case-study | A | A | 12/0/12 | 12/0/0 | — |
| changelog | B | B | 0/6/0 | 0/3/0 | — |
| checkout | A | B | 4/0/0 | 0/2/0 | — |
| civic-service | A | A | 12/0/0 | 6/0/0 | — |
| clinic-home | C | A | 0/0/30 | 60/0/0 | — |
| contact | A | A | 4/0/0 | 4/0/0 | — |
| course-catalog | A | A | 6/0/0 | 3/0/0 | — |
| dashboard-analytics | A | A | 8/0/4 | 4/0/0 | — |
| dashboard-overview | A | A | 24/0/12 | 12/0/0 | — |
| devtool-landing | C | A | 0/0/120 | 60/0/0 | — |
| docs-reference | B | B | 0/108/0 | 0/54/0 | — |
| event-landing | A | A | 60/0/60 | 116/4/0 | — |
| event-schedule | A | A | 12/0/0 | 6/0/0 | — |
| finance-overview | A | A | 12/0/12 | 6/0/0 | — |
| fitness-landing | A | A | 10/0/10 | 20/0/0 | — |
| forbidden | A | A | 1/0/0 | 1/0/0 | — |
| forgot-password | A | A | 2/0/0 | 1/0/0 | — |
| game-launch | A | A | 180/0/0 | 360/0/0 | — |
| garden-shop | B | B | 4/2/0 | 1/2/0 | — |
| hanji-journey | A | A | 90/0/0 | 180/0/0 | — |
| help-center | A | A | 1/0/0 | 1/0/0 | — |
| hr-people | B | B | 0/4/2 | 0/2/0 | — |
| inbox | A | A | 2/0/0 | 1/0/0 | — |
| incident-report | A | A | 18/0/18 | 9/0/0 | — |
| job-board | A | A | 12/0/0 | 6/0/0 | — |
| job-detail | A | A | 16/0/8 | 12/0/0 | — |
| kids-class | C | A | 0/0/40 | 60/0/0 | — |
| learning-course | A | A | 35/0/5 | 120/0/0 | — |
| login | A | A | 2/0/0 | 1/0/0 | — |
| luxury-brand | B | A | 45/13/2 | 120/0/0 | — |
| maintenance | A | A | 1/0/0 | 1/0/0 | — |
| menu-dining | A | A | 10/0/2 | 12/0/0 | — |
| museum-home | A | A | 10/0/0 | 20/0/0 | — |
| music-player | A | A | 8/0/0 | 7/1/0 | — |
| news-home | A | A | 12/0/12 | 12/0/0 | — |
| not-found | A | A | 1/0/0 | 1/0/0 | — |
| offline | A | A | 1/0/0 | 1/0/0 | — |
| onboarding-wizard | A | A | 2/0/0 | 2/0/0 | — |
| order-tracking | A | A | 12/0/0 | 6/0/0 | — |
| policy | A | A | 6/0/0 | 6/0/0 | — |
| portfolio-grid | A | A | 12/0/0 | 12/0/0 | — |
| pricing-page | A | A | 2/0/0 | 8/0/0 | — |
| product-detail | A | A | 26/0/10 | 18/0/0 | — |
| product-landing | C | A | 0/0/360 | 453/27/0 | — |
| product-listing | A | A | 11/0/1 | 6/0/0 | — |
| profile | A | A | 4/0/4 | 4/0/0 | — |
| project-board | A | A | 2/0/2 | 1/0/0 | — |
| property-search | A | A | 8/0/0 | 4/0/0 | — |
| realty-detail | C | A | 0/0/36 | 18/0/0 | — |
| recipe-detail | A | A | 66/0/6 | 72/0/0 | — |
| research-paper | A | A | 36/0/0 | 36/0/0 | — |
| saas-landing | C | B | 0/0/240 | 360/360/0 | — |
| sales-dashboard | B | A | 6/2/4 | 3/1/0 | — |
| server-error | A | A | 1/0/0 | 1/0/0 | — |
| settings | A | A | 36/0/0 | 18/0/0 | — |
| signup | A | A | 6/0/0 | 3/0/0 | — |
| solar-landing | A | A | 69/8/83 | 240/0/0 | — |
| status-page | A | A | 36/0/36 | 18/0/0 | — |
| stay-detail | C | A | 0/0/12 | 6/0/0 | — |
| support-queue | A | A | 2/0/0 | 1/0/0 | — |
| survey | A | A | 2/0/0 | 2/0/0 | — |
| team-chat | A | A | 2/0/0 | 1/0/0 | — |
| team-directory | C | A | 1/0/1 | 1/0/0 | — |
| travel-ocean | C | A | 0/0/20 | 10/0/0 | — |
| tutorial | A | A | 12/0/12 | 12/0/0 | — |
| waitlist | A | A | 9/0/1 | 10/0/0 | — |
| wedding-invite | A | A | 180/0/0 | 360/0/0 | — |
| wine-list | C | A | 8/0/8 | 8/0/0 | — |

## 구성 변형 옵션별(슬롯:옵션)

옵션이 든 조합 중 C 등급 비율. 6차 이전과 이후를 비교한다(조합 수가 줄어든 옵션은 적용 조건이 좁아진 것이다).

| 옵션 | 조합 전 | C 전 | 조합 후 | C 후 |
|---|---|---|---|---|
| cards:filled | 558 | 73.8% | 764 | 0.0% |
| cards:outline | 558 | 74.4% | 764 | 0.0% |
| columns:four | 8 | 12.5% | 4 | 0.0% |
| columns:three | 22 | 100.0% | 0 | — |
| columns:two | 920 | 96.7% | 15 | 0.0% |
| data:bordered | 319 | 35.1% | 195 | 0.0% |
| data:striped | 222 | 19.8% | 118 | 0.0% |
| faq:split | 0 | — | 484 | 0.0% |
| features:grid | 360 | 100.0% | 0 | — |
| gallery:grid | 396 | 40.9% | 528 | 0.0% |
| gallery:masonry | 146 | 19.2% | 240 | 0.0% |
| gallery:showcase | 358 | 41.9% | 436 | 0.0% |
| heads:center | 0 | — | 2154 | 0.0% |
| hero:centered | 504 | 62.9% | 772 | 0.0% |
| hero:cover | 374 | 66.6% | 630 | 0.0% |
| hero:product | 478 | 51.9% | 726 | 0.0% |
| hero:split | 398 | 49.7% | 552 | 0.0% |
| hero:statement | 510 | 57.6% | 800 | 0.0% |
| intro:center | 1977 | 49.9% | 2287 | 0.0% |
| menu:grid | 7 | 85.7% | 5 | 0.0% |
| menu:leader | 37 | 5.4% | 65 | 0.0% |
| menu:plain | 37 | 2.7% | 65 | 0.0% |
| notice:banner | 218 | 23.4% | 145 | 0.0% |
| notice:toast | 254 | 27.2% | 154 | 0.0% |
| order:proof-first | 208 | 74.0% | 344 | 0.0% |
| rhythm:banded | 1052 | 58.7% | 1628 | 0.0% |
| split:mirror | 976 | 55.1% | 926 | 0.0% |
| steps:cards | 0 | — | 500 | 0.0% |
| steps:horizontal | 86 | 36.0% | 91 | 0.0% |
| steps:vertical | 332 | 77.7% | 468 | 0.0% |
| tabs:boxed | 96 | 3.1% | 48 | 0.0% |
| tabs:pill | 84 | 3.6% | 42 | 0.0% |
| tabs:underline | 12 | 0.0% | 6 | 0.0% |
| tags:badges | 26 | 30.8% | 16 | 0.0% |
| tags:outline | 46 | 15.2% | 42 | 0.0% |
| timeline:line | 124 | 25.8% | 170 | 0.0% |
| timeline:log | 226 | 15.9% | 354 | 0.0% |
| timeline:rail | 134 | 14.9% | 192 | 0.0% |
