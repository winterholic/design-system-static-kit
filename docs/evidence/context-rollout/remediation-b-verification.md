# R14-B 통합 표 규약 브라우저 검증

작성: 2026-11-16 · 판정: **렌더 통합 확인, 분류 결함 1건 보고**

제품 소스, 기존 테스트, 대장은 수정하지 않았다. 현재 컴파일 결과를 기준 site의 동일 Blueprint 예시와 실제 브라우저에서 비교했다. HEAD는 `61d2e5e5c51a58aeb6a7f4ecc2fc6a7337bd6864`; 통합 관련 소스의 SHA-256과 각 입력·출력 지문 및 모든 측정은 [browser-measurements.json](remediation-b-verification/browser-measurements.json)에 보존했다.

## 환경 및 범위

- 기준본은 `site/examples/{id}/index.html`, 입력은 그 옆 `blueprint.json`이다. 현재본은 동일 `createBlueprint(id)`를 `compile()`해 만든 단일 HTML이다. 네 예시에서 저장된 Blueprint와 현재 컴파일 입력의 구조 비교가 모두 `true`였다.
- 미리보기는 프로젝트의 `scripts/serve.mjs`를 소유 실행 핸들에서 포트 4174로 띄워 사용했다. 브라우저는 설정된 `ttakkari_browser` MCP다. 320×800, 390×844, 1440×960 CSS px로 계측했다.
- 과거 기획 Codex 셸의 4173 `curl`은 connection refused였다. 이는 해당 셸의 관측으로만 기록하며 호스트 전체의 상태로 확대하지 않았다. 이번 4174 셸 `curl`은 HTTP 200이었고 브라우저 MCP도 해당 preview URL을 열었다.
- 이전 marker 보고는 `kill -TERM 75843`이 `operation not permitted`였다고 기록한다. 그 기록에는 정확한 엔진/샌드박스 이름이 없고 “command environment”만 있다. 해당 PID에는 이번에도 새 종료 시도를 하지 않았다. 이 사실과 이전 서버 정리 미확인은 분리해 남긴다.
- 이번 서버는 원래 exec 세션 57418에 Ctrl-C를 보내 종료했고, 이어진 4174 확인은 curl exit 7 “Couldn't connect to server”였다. 브라우저 MCP 종료 응답은 “No open tabs”였다. 4173의 이전 PID/서버 상태를 이번 정리 결과로 간주하지 않는다.

## 화면 실측

각 수치는 `table.getBoundingClientRect().width`, 해당 표의 실제 스크롤 영역 `clientWidth/scrollWidth`, 그리고 셀의 실제 너비를 읽었다. 괄호의 스크롤 양은 `scrollWidth - clientWidth`다. 페이지 문서의 `scrollWidth`는 24개 예시×뷰포트 조합 모두 viewport와 같아 페이지 자체의 가로 넘침은 없었다.

| 예시 | 320px · 표 폭 / 스크롤 content÷client (이동량) | 390px · 표 폭 / 스크롤 content÷client (이동량) | 1440px · 표 폭 / 스크롤 content÷client |
|---|---|---|---|
| docs-reference | 292.9→457.8 / 293÷238(55)→458÷238(220) | 308→457.8 / 308÷308(0)→458÷308(150) | 762→762 / 762÷762(0) |
| api-reference | 272.1→451.1 / 272÷238(34)→451÷238(213) | 308→451.1 / 308÷308(0)→451÷308(143) | 762→762 / 762÷762(0) |
| admin-table | 433.1→457.8 / 433÷254(179)→458÷254(204) | 433.1→457.8 / 433÷324(109)→458÷324(134) | 1102→1102 / 1102÷1102(0) |
| sales-dashboard | 352.8→393 / 353÷238(115)→393÷238(155) | 352.8→393 / 353÷308(45)→393÷308(85) | 1086→1086 / 1086÷1086(0) |

- 두 한글 설명 표에서 320px의 마지막 설명 셀은 기준본 4~5줄이 현재본 1~3줄로 바뀌었다. 390px에서도 기준본 docs 설명은 4줄, API 설명은 3줄이었고 현재본의 해당 셀은 1~2줄이었다. 긴 설명은 단어 단위로 읽히고 셀 최소폭은 각각 216px로 실측됐다.
- admin-table의 320px 주문 ID `A-10231`은 기준본 71.3px 셀에서 2줄/normal이었고 현재본 87.6px에서 1줄/nowrap이었다. `39,000원`, `128,000원`은 기준본 computed align `left`에서 현재본 `end`로 바뀌었다.
- 네 예시의 현재 셀 패딩은 실제 computed 값 기준 좌우 12px, 상하 8px이었다. 기준 HTML은 좌우/상하 각각 12px이었다.
- sales-dashboard에서 지정한 대상은 세 번째 표(`예상 금액 상위 5건`)다. 처음 두 표가 월별 요약이라, 전후 모두 이 캡션/규약 표만 측정에 포함했다.

## 끝 열·포커스·보존

320px 현재본 각 표를 내부 스크롤 최댓값으로 옮겨 확인했다. 네 표 모두 마지막 열의 오른쪽 좌표가 scroll region의 오른쪽 경계와 같고 `lastColumnVisible=true`였다. 스크롤 끝에서도 영역이 `role=region`, `tabIndex=0`이고 activeElement로 남았다. docs-reference 220/220px, api-reference 213/213px, admin-table 204/204px, sales-dashboard 155/155px이다. 각 이동 전후 셀 데이터 배열은 같았으며 12개 전후 렌더 비교에서도 헤더 순서와 행·셀 데이터 배열이 모두 동일했다.

## 소수 반례

- 2열 짧은 표는 compact/comfortable/spacious 각 320px에서 실제 가로 스크롤 양이 0px이었다. 최소폭은 144/144/192px, computed 좌우 패딩은 12/12/16px, 상하 패딩은 모두 8px이었다.
- 전화번호 `010-1234-5678`, 버전 `2.4.0`·`v1.2`, 날짜 `2026-11-16`·`2025-09-01`, 혼합값 `A-001 / 12`·`12개 / N/A`는 모두 왼쪽 정렬이었다. 명확한 `39,000원`·`128,000원`은 오른쪽 정렬이었다.
- **남은 결함:** sales-dashboard의 금액 `4.2억`, `3.1억`, `2.8억`, `1.9억`, `1.4억`은 현재 브라우저에서도 전부 computed align `left`다. 같은 예시의 320px 현재 표, `예상 금액` 열에서 재현된다. 이 값은 원화 금액 축약 표기지만 현재 숫자 판별 규칙이 접미 `억`을 잡지 못한다. 기존 테스트/제품 소스 수정은 이번 범위에서 금지되어 그대로 보고한다.

## 지문·캡처·미실행

측정 영수증은 HEAD와 `table-design.mjs`, `composition.mjs`, `nodes.mjs`, `compiler.mjs`, 통합 테스트, 서버 스크립트 해시를 입력한다. 각 예시별로 raw Blueprint SHA, 현재 compiler input SHA, 기준 site HTML SHA, 현재 생성 HTML SHA, 전·후 URL을 묶었다. 측정마다 viewport, 실측 표/셀 너비, 패딩, 줄 수, 스크롤 폭 및 데이터 비교 결과가 포함된다.

전후 전체 페이지 캡처(390px) 여덟 장과 docs-reference의 실제 끝 열 캡처를 현재 Run outbox에 저장했다. 전체 페이지 전후 쌍은 보고서 첨부 이미지로 공유한다. 브라우저 console에는 표와 무관한 `/favicon.ico` 404 한 건이 관측됐다.

이번에는 관련 검사 33개, 2.1 예시 85개 전체 출력 해시, 전체 빌드 및 site 재생성을 다시 실행하지 않았다. 커밋·푸시·배포도 하지 않았다.

## 실행 흔적

```text
$ PORT=4174 node scripts/serve.mjs
Static Kit http://127.0.0.1:4174

$ curl --fail --silent --show-error -I 'http://127.0.0.1:4174/docs/evidence/context-rollout/remediation-b-verification/preview.html?example=docs-reference&variant=after'
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

$ curl --max-time 2 --fail --silent --show-error -I 'http://127.0.0.1:4174/'
curl: (7) Failed to connect to 127.0.0.1 port 4174 after 0 ms: Couldn't connect to server
```

### 공유 캡처와 미리보기

전후 캡처는 390px 전체 페이지다. docs-reference의 추가 캡처는 가로 스크롤을 끝까지 옮긴 상태다.

- docs-reference: [기준](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-docs-reference-before-390.png>) · [현재](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-docs-reference-after-390.png>) · [끝 열](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-docs-reference-after-scroll-end-390.png>)
- api-reference: [기준](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-api-reference-before-390.png>) · [현재](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-api-reference-after-390.png>)
- admin-table: [기준](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-admin-table-before-390.png>) · [현재](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-admin-table-after-390.png>)
- sales-dashboard: [기준](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-sales-dashboard-before-390.png>) · [현재](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-sales-dashboard-after-390.png>)
- 현재 compiler HTML: [docs-reference](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-preview-docs-reference.html>) · [api-reference](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-preview-api-reference.html>) · [admin-table](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-preview-admin-table.html>) · [sales-dashboard](</Volumes/Backup/ttakkari-data/outbox/7686f768-5223-4435-a1ce-d3aac2fddb50/table-preview-sales-dashboard.html>)
