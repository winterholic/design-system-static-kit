# 조립 엔진·공개 채널 독립 검증

- 검증 기준 SHA: `494989058` (`feat(platform): 페이지 조립을 서비스·REST·MCP로 공개하고 Blueprint 2.7.0 materials를 연다`)
- 기준 전 SHA: `771a8624c`
- 검증 위치: `../dsk-verify-assembly` worktree. main은 시작 시 `494989058`이었고 `git pull --ff-only` 결과 `Already up to date`였다.
- 기준 이후 main의 동시 변경은 이 문서 커밋을 rebase할 때만 반영한다. 아래 실행 결과는 모두 기준 SHA에서 얻었다.
- 브라우저·배포 서버는 다루지 않았다. REST는 실제 API 작업 실행기 `runOperation('assembleDesign', request)`를 in-process로 호출했다. MCP는 `TOOLS`의 `assemble_design` 항목을 `executeTool`로 호출했다. 브라우저 및 외부 HTTP 전송 계층은 미검증이다.
- 보조 스크립트 `scripts/verify-assembly-review.mjs`는 worktree에만 두며 커밋하지 않는다.

## 판정 요약

범위 안에서 W5-a·W5-b 구현을 반증하는 동작은 찾지 못했다. 8개 조립 요청의 서비스·REST·MCP 응답 본문 바이트가 일치했고, 등록 재료의 실제 출력 반영, 후보 다양성, Blueprint 왕복, 입력 거부·이스케이프가 확인됐다. 세부 범위와 미검증 표면은 아래와 같다.

| ID | 주장 | 판정 | 심각도 | 담당 영역 |
|---|---|---|---|---|
| V1 | 서비스·REST·MCP가 같은 조립 결과를 낸다 | 확인 | 결함 없음 | 서비스 계약, REST, MCP |
| V2 | 등록 재료와 콘텐츠 양이 실제 결과를 바꾼다 | 확인 | 결함 없음 | 페이지 계획·렌더, 재료 레지스트리 |
| V3 | 복수 후보와 decisions가 선택을 설명하고 반복 입력은 결정적이다 | 확인 | 결함 없음 | 후보 탐색·비교 |
| V4 | Blueprint 2.7.0은 왕복 컴파일되고 구버전은 materials를 거부한다 | 확인 | 결함 없음 | Blueprint 게이트·컴파일 |
| V5 | 잘못된 입력은 서비스·REST에서 같은 오류를 내고 콘텐츠 HTML은 이스케이프된다 | 확인 | 결함 없음 | 서비스 검증·REST |
| V6 | ≤2.6.0 고정 자료와 카탈로그 스냅샷이 기준 전 상태와 같다 | 확인 | 결함 없음 | 카탈로그 호환성 |
| V7 | 전체 테스트와 플랫폼 기준선 검사가 통과한다 | 확인 | 결함 없음 | 테스트·기준선 |

## 검증 기록

### V1 — 공개 채널 바이트 일치

- 재현: `node scripts/verify-assembly-review.mjs`
- 실행 방식: 목적별 자동 요청을 먼저 서비스·REST·MCP 각각 한 번씩 실행했다. 서비스의 자동 선택 결과에서 palette·subtoken-set·type-system·families·surface·motion·background·media를 추출해 직접 지정 요청을 만들고, 이 요청도 세 경로를 각각 호출했다. 이 반복으로 총 8개 입력 × 3개 경로, 24회 호출했다.
- 단언: 서비스 `ok === true`, REST HTTP 200, MCP `isError === false`와 MCP 봉투 `ok === true`를 확인했다. REST 본문, MCP `content[0].text`, MCP `structuredContent`의 JSON 바이트를 서비스 JSON 바이트와 각각 비교했다. 스크립트는 호출별 검사 실패를 `failures`에 반례 입력과 각 응답의 바이트 수·SHA-256·첫 바이트 차이로 기록하며, 모든 비교를 통과한 행만 `passedRows`에 기록한다. 네 직접 지정 요청은 표의 `직접 지정 재료`에 보인 값으로 실제 호출됐다.

| 목적 | 선택 | 직접 지정 재료 | 상태(service / REST / MCP) | 서비스 응답 바이트 | 서비스·REST·MCP SHA-256 |
|---|---|---|---|---:|---|
| saas-landing | 자동 | — | true / 200 / false | 524,785 | `8e836fd3eb4b6ceaa99779d8cd65fa48082610949abe1913152d1bc771d6fdde` |
| saas-landing | 직접 | palette `clay-earth`, set `editorial-warm`, type `mkt-launch`, family `bold`, surface `soft-layered`, motion `calm`, background `plain-canvas`, media `line-soft-frame` | true / 200 / false | 176,539 | `838fc281160945802f8b826cc17df087342e789db862b886c789e9fad5fa79af` |
| work-dashboard | 자동 | — | true / 200 / false | 450,115 | `d8baa00a87e61dfaea6a16c0e9882efa2e7bf6d24991f229b75254294f538556` |
| work-dashboard | 직접 | palette `graphite-mono`, set `high-contrast`, type `work-insight`, surface `hairline-panel`, motion `calm`, background `plain-canvas`, media `line-soft-frame` | true / 200 / false | 152,311 | `38ce89132f71f09ddaaf25db8e518d056d601dd70aa80b94a2caffde476e4e6f` |
| editorial-docs | 자동 | — | true / 200 / false | 371,427 | `1c405759da932f46a42f64e79c2eeb953c736aab7932efecf7829b3818f81160` |
| editorial-docs | 직접 | palette `clay-earth`, set `editorial-warm`, type `doc-essay`, surface `tonal-sheet`, motion `still`, background `plain-canvas`, media `fine-editorial` | true / 200 / false | 125,188 | `e9a119aebcebd9b6217f95c03c3ba2f73ce1e12e475b243ae234c4f8691587c1` |
| commerce | 자동 | — | true / 200 / false | 448,026 | `abc62879bbee890db897089be08f286cf60db361f070604eee0fb39adf990c95` |
| commerce | 직접 | palette `dusk-violet`, set `premium-dark`, type `shop-boutique`, surface `hairline-panel`, motion `calm`, background `plain-canvas`, media `line-soft-frame` | true / 200 / false | 150,291 | `f4f4a35b60a0e85f859a352680595f22075d6f425115c33e6efb70efb6a05e88` |

- 관찰: 재실행 결과 `attempted: 8`, 자동 4건·직접 지정 4건, `passedRows: 8`, `failures: []`였다. 각 행에서 REST 본문, MCP text, MCP structured JSON의 바이트 길이와 SHA-256이 서비스 값과 일치했다.
- 심각도: 없음(주장 확인).
- 담당: `src/service/assemble-design.mjs`, `apps/web/lib/api/operations.mjs`, `apps/web/lib/api/rest.mjs`, `apps/web/lib/api/mcp.mjs`.
- 한계: 실제 HTTP 서버·외부 클라이언트 연결은 검증하지 않았다.

### V2 — 등록 재료·상태·컴포넌트가 출력에 닿음

- 재현: `node scripts/verify-assembly-review.mjs`
- 관찰: 8개 채널 비교 결과 모두 `data-surface`, `data-motion`, `data-bg`, `data-media`를 냈다. 빈 목록에 `state-pattern:empty-inline`을 직접 지정하자 HTML에 `class="kit-state" data-pattern="empty-inline" data-state="empty"`가 나왔다. `purpose:card.kpi` 3개를 요청하면 `data-purpose="card.kpi"`가 3회, 시각 패밀리가 지정된 `data-family` 마커가 렌더됐다. 일반 템플릿 페이지에는 컴포넌트 패밀리가 없을 수 있으며, 패밀리 표식은 패밀리 기반 컴포넌트를 배치한 경우에 확인했다.
- KPI 비교: 3개는 3열·3개 렌더, 8개는 4열·8개 렌더 및 compact 배치였다.
- 표 비교: 5행은 plain·페이지네이션 없음. 50행은 striped·필터 줄·페이지네이션과 첫 페이지 20행을 냈다.
- CSS 비교: 대시보드 요청에서 유효한 `styleContext`(ledger/workspace), palette, subtoken-set, type-system을 각각 바꾸면 CSS SHA-256이 달랐다.
- intent 컴포넌트: `base-component:card-surface` 요청의 id·제목·본문·`data-family`가 실제 출력에 포함됐다.
- 심각도: 없음(주장 확인).
- 담당: `src/platform/page-content.mjs`, `src/platform/page.mjs`, 등록 재료 및 렌더러.

### V3 — 후보 다양성과 decisions

- 재현: `node scripts/verify-assembly-review.mjs`
- 관찰: 8개 후보 요청에서 8개 후보가 반환됐고 재료 선택 조합도 8종이었다. 각 후보에서 palette·set·type-system·family 선택 id와 `decisions[].id`가 일치했다. 이유 우선순위 합은 기록된 점수와 일치했고, 관계형 이유는 후보 `relations.applied`에 있는 동일한 from/to/type/priority/reason과 대조됐다. 요청한 카드 컴포넌트는 후보 전부에 렌더됐다. 같은 입력을 두 번 서비스 호출한 직렬화 바이트도 같았다.
- 금지 조합 반례: light + `surface:glow-glass`는 `P_REL_FORBIDS`와 X05 설명으로 거부됐고, 서비스·REST 오류 봉투가 같았다.
- 심각도: 없음(주장 확인).
- 담당: `src/platform/page.mjs` 후보 탐색·점수·비교, 관계 그래프.

### V4 — Blueprint 2.7.0

- 재현: `node scripts/verify-assembly-review.mjs`
- 관찰: 8개 결과 후보의 Blueprint를 `compileBlueprint`로 재컴파일했을 때 각각 HTML(standalone)·CSS 바이트와 tokens 객체가 같았다. 2.6.0 Blueprint에 `materials`를 추가해 검증하자 `$.materials`에서 `VERSION_FIELD`로 거부됐다.
- 심각도: 없음(주장 확인).
- 담당: `src/catalog/materials-field.mjs`, `src/platform/compile.mjs`, `src/platform/render.mjs`.

### V5 — 잘못된 입력과 HTML 주입 문자열

- 재현: `node scripts/verify-assembly-review.mjs`
- 관찰: 없는 palette id는 `P_ATTR_UNKNOWN`(`$.palette`), 숫자 surface는 `P_REQUEST`(`$.surface`), KPI 1,000개는 `P_PAGE_OVERFLOW`(`$.content.kpis`)였다. 세 입력 모두 서비스와 REST 오류 봉투가 바이트까지 같았다. `<script>`·`<img onerror>` 문자열은 editorial 콘텐츠로 받아들였지만 HTML 태그로 출력하지 않고 텍스트로 이스케이프했다.
- 심각도: 없음(주장 확인).
- 담당: 서비스 요청 정규화·등록 재료 검사·기존 노드 렌더러, REST 봉투 변환.

### V6 — 구버전 고정 자료·카탈로그

- 재현: `git diff --quiet 771a8624c 494989058 -- site/v1/catalog.json` 및 고정 해시 자료 파일에 대한 동일한 `git diff --quiet`; `npm test`.
- 관찰: `site/v1/catalog.json`은 두 SHA에서 모두 `f420dae285fb9d077dd896073bfa8fe0a7eccc1e1d3e3aca908d993da99261e2`였다. 비교한 legacy·pinned 해시 JSON은 diff가 없었다. 전체 테스트의 2.6.0 이하 호환·고정 출력 검사가 통과했다.
- 심각도: 없음(주장 확인).
- 담당: Blueprint 구버전 호환·고정 fixture.

### V7 — 프로젝트 검증 명령

- 재현: `npm test`
- 관찰: `tests 780`, `pass 780`, `fail 0`.
- 재현: `node scripts/platform/baseline.mjs --check`
- 관찰: `BASELINE MATCH docs/evidence/platform/baseline.json`; 구형 16,360/16,808 조립·컴파일 통과, 플랫폼 119,610 조립 가능, 5,793 조립·검증(고유 출력 5,787). 실행 시간 124.1초.
- 심각도: 없음(주장 확인).
- 담당: 테스트와 플랫폼 기준선 생성기.

## 미검증 범위

- 브라우저 UI 동작·레이아웃·접근성: 사용자 지시대로 실행하지 않음.
- 배포된 HTTP 서버, 인증·프록시·네트워크 전송 경로: 서버를 띄우지 않고 REST 작업 실행기 함수를 직접 호출했으므로 미검증.
- 2.6.0 고정 결과는 저장된 hash 자료의 Git 동일성과 전체 테스트 통과로 확인했다. 브라우저에서 보이는 시각적 동등성은 이 검증 범위에 없다.
