# W6-a 이후 스크린샷

Chromium, 1280폭(`.d1280.png`)과 390폭(`.m390.png`)의 전체 높이 캡처다. 이전 상태는 `../before/`(1440폭과 390폭)에 있다.
재생성: `next start -p 4421` 뒤 `BASE=http://127.0.0.1:4421 node apps/web/scripts/capture-w6a.mjs`.

| 파일 | 보여 주는 것 | 관련 문제 |
|---|---|---|
| `home` | 제품 가치, 완성 디자인 예시(Core 컴파일 결과), 분위기 칩, 조립 과정, Studio 진입, 핵심 기능. 규약과 CLI는 없음 | H1~H5 |
| `nav-open` (390) | 메뉴 5개, Docs는 마지막 | D1 |
| `explore`, `explore-detail` | 같은 페이지 다른 재료 사례, 사람이 읽는 조립 요약, 접힌 "구성 값 자세히" | E1 |
| `docs`, `docs-guide-principles`, `docs-integrations` | 가이드, Core 레퍼런스, 연동 세 갈래. 홈에서 옮긴 규약과 지원 카탈로그 버전 | D1, D2 |
| `studio-start` | 시작 화면(이번 범위에서는 변경 없음) | |
| `studio-edit-history` | 편집 4회 전후 `history.length`가 같음(화면 왼쪽 아래 표기) | B10, B11 |
| `studio-shared-link-opened` | 저장소가 빈 다른 브라우저에서 같은 주소를 열었을 때의 작업 | B8 |
| `studio-undo-after-reload` | 새로고침 뒤에도 실행 취소가 켜져 있음 | B7 |
| `studio-impact-dialog` | 구 문서에서 역할 타이포를 고르면 뜨는 영향 요약(버전, 바뀌는 값, 색 변화, 콘텐츠 유실 0) | R3, S6 |
| `studio-shared-link-confirm` | 작업이 있는 브라우저에서 공유 링크를 열 때의 확인 | B8 |

Explore 목록의 썸네일은 화면 근처에 올 때만 iframe을 만들기 때문에, 캡처 스크립트가 IntersectionObserver를 항상 보이는 것으로 바꾸고 뷰포트를 문서 높이로 키워 찍는다.
