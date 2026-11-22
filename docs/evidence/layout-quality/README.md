# 레이아웃 검사기 전후 증거 (feat/layout-quality)

검사기와 규칙은 `docs/layout-quality.md`, 코드는 `scripts/layout-quality/`.

## 파일

| 파일 | 내용 |
|---|---|
| `before/home-before-{360,768,1280,1600}.png` | 수정 전(`origin/feat/material-platform` 빌드) 홈 전체 화면 |
| `after/home-after-{360,768,1280,1600}.png` | 수정 후 홈 전체 화면 |
| `compare-hero-{360,768,1280,1600}.png` | 제목·리드 영역 전후 나란히(왼쪽 before, 오른쪽 after) |
| `before/site-before.json`, `before/site-before-report.txt` | 수정 전 공개 페이지 131쪽 × 4폭 전수 검사 결과(검사기 출력 그대로) |
| `after/site-after.json`, `after/site-after-report.txt` | 수정 후 131쪽 × 4폭 결과와 면제 포함 보고 |
| `after/topbar-{360,1280}-aligned.png` | 상단 바(정렬 검사 통과, 수정 불필요) |

## 수치

수정 전(오류 190, 경고 217, 정보 111)과 수정 후(오류 0, 경고 0, 정보 117, 면제 9)는 같은 검사기·같은 폭·같은 임계값이다. 정보 117건은 가로 스크롤 영역(코드 블록·표)이 실제로 넘치는지 알리는 `SCROLL_REGION`으로, 의도된 동작이라 판정에 쓰지 않는다.

홈 제목·리드·규약 영역의 수정 전 발견(1280px):

- `HEADING_EARLY_WRAP` 제목: 상자 524.6px, 사용 가능 1056px, 2줄. 상한을 풀면 1줄. 원인은 `max-width: 20ch`.
- `LEAD_EARLY_WRAP` 리드: 상자 769.7px(68ch), 사용 가능 1056px, 2줄. 상한을 풀면 1줄. 원인은 `--measure`.
- `DESC_EARLY_WRAP`·`DESC_NARROW_BOX` 규약 설명: 상자 560px, 사용 가능 856px. 원인은 `.rules { max-width: 760px }`.
- `SHORT_TEXT_NARROW_BOX` Explore 소개: 상자 443px(44ch), 사용 가능 504px. 원인은 `.entries p { max-width: 44ch }`.
- 768px에서 `HEADING_NARROW_BOX`(상자 453px / 사용 가능 707px), 360px에서 `HEADING_ORPHAN`(제목 끝줄 "컴파일러" 한 단어).

고친 곳: `apps/web/features/home/home.module.css`(위 세 상한 제거), `apps/web/app/globals.css`(`.page-lead` 상한 제거, 제목 `text-wrap: balance`, 문장 `text-wrap: pretty`), `features/components`·`features/explore` CSS 각 한 줄, 정적 문서 생성기 `scripts/md.mjs`(표 칸 줄바꿈 금지·읽기 폭 75ch·balance/pretty)와 그 산출물 `docs/*.html`, `site/docs/*.html`.

## 정직하게 남은 것

- 상단 바는 공개 페이지에서 정렬돼 있다(세로 중심 편차 0.1px, 좌우 가장자리가 본문과 일치). 고친 것이 없다. `/studio`만 본문이 전폭이라 바의 좌우가 본문과 어긋나는데 Studio는 이 브랜치 범위 밖이라 면제하고 사유를 남겼다.
- 면제 9건(= 3개 항목)과 사유는 `apps/web/e2e/layout-quality.exemptions.mjs`에 있다.
- 줄바꿈이 "의미 단위로 자연스러운지"(예: `금지된 축 / 조합은`)는 검사기가 보지 못한다. C단계 사람 평가의 몫이다.
