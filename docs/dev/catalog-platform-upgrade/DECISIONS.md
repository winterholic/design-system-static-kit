# 아키텍처 및 거버넌스 결정 기록 (DECISIONS.md)

- 상태: 활성 (Phase 0 전수 감사 완료)
- 버전: 1.1.0 (P0-AUDIT 독립 검증 반영)
- 관리 위치: `docs/dev/catalog-platform-upgrade/DECISIONS.md`
- 관련: `REQUEST.md §1`, `docs/architecture.md`, `docs/governance.md`, `docs/adr/0012-assembly-platform.md`

---

## DEC-001: 결정론적 조립 파이프라인 및 LLM 런타임 배제 원칙

### 맥락
최근 생성형 AI 기반 도구들은 프롬프트를 통해 임의의 HTML과 CSS를 직접 생성하는 방식을 취하지만, 이는 결과물의 시각적 불일치, 회귀 발생, 접근성 미달, 재현 불가능성을 초래한다.

### 결정
1. 동일한 Blueprint, 동일한 재료 버전, 동일한 요청 입력은 언제나 100% 동일한 바이트의 HTML·CSS·Tokens를 생성해야 한다.
2. 컴파일 및 조립 런타임에 LLM을 필수 요소로 포함하지 않는다.
3. 모든 재료, 변형, 호환성, 추천, 상태, 조립 규칙은 정형화된 코드와 구조화된 데이터(`src/platform/`)로 정의한다.
4. CSS escape hatch나 인라인 스타일 생성으로 재료의 결핍을 우회하는 것을 엄격히 금지한다.

---

## DEC-002: 재료의 실질적 완성도 판정 기준

### 맥락
수치 채우기를 위해 enum 값만 등록하거나, 렌더러가 연결되지 않은 JSON 스키마만 추가하고 "구현 완료"로 보고하는 왜곡을 방지해야 한다.

### 결정
다음 항목은 신규 재료 구현(Implemented/Verified)으로 인정하지 않으며, Material Coverage Manifest에서 `missing` 또는 `metadata-only`로 분류한다:
- enum 값만 추가된 정의
- 이름과 설명만 바꾼 동일 재료
- CSS 변수가 선언되었으나 실제 렌더러에서 사용되지 않는 재료
- 렌더러 함수가 연결되지 않은 메타데이터
- 웹 카탈로그에서 탐색하거나 선택할 수 없는 재료
- 실제 출력이 동일한 조합을 독립적인 디자인 종류로 집계하는 행위
- 테스트 통과를 위해 요구 범위를 임의로 축소하는 행위

각 재료는 `정의 -> 렌더 -> 카탈로그 -> 조립 -> 내보내기 -> 검증`의 6단계 수명주기 전체가 연결되어야 한다.

---

## DEC-003: 사전 정의와 사전 렌더링의 분리 (iframe 0개 원칙)

### 맥락
수천 개의 재료를 지원한다고 해서 이를 브라우저의 첫 페이지에 동시에 렌더링하면 브라우저 메모리 고갈과 프레임드랍이 발생한다. 현재 웹 카탈로그는 목록의 카드마다 iframe을 생성하여 성능 저하의 주원인이 되고 있다.

### 결정
1. 재료는 충분히 사전 정의하되, 브라우저에서는 요청된 카테고리의 대표 카드(최대 24개)만 청크 단위로 렌더링한다.
2. 일반 카탈로그 목록 및 카드 그리드에서 활성 iframe 생성을 전면 금지한다 (목표: iframe 0개).
3. 카탈로그 목록 카드는 빌드 시점에 사전 생성된 정적 SVG 또는 컴파일된 경량 HTML 스니펫을 인라인 표시한다.
4. iframe은 컴포넌트 상세 페이지의 인터랙티브 Playground에서만 허용한다.

---

## DEC-004: Coolors 427 팔레트 권리 미확인 격리 및 대체 정책

### 맥락
`src/catalog/palette-rows.mjs`의 427개 팔레트는 과거 수집 자료로 재배포 라이선스가 확인되지 않은 상태(`source.license: "unverified"`)로 기록되어 있다.

### 결정
1. Coolors 427 팔레트를 신규 플랫폼 레지스트리(`src/platform/data/palettes.mjs`)에 등록하거나 신규 공개 카탈로그에 노출하지 않는다.
2. 기존 카탈로그 2.1~2.6 Blueprint 컴파일 호환성을 위해서만 읽기 전용으로 유지한다.
   - **현행 편차(2026-11-28)**: Studio `DesignPanel`의 "모든 팔레트" 목록이 이 427개를 선택지로 낸다. 결정 2와 어긋나지만 이 문서는 선택지에서 뺄지, 권리 결정을 받을지를 정하지 않는다. Track F와 Track B가 정해 새 DEC로 남긴다. 그때까지 Manifest의 `rights-unverified` 기록이 `studioAssemblable: true`로 나오는 것이 편차의 기계적 표지다.
3. Track B에서 상업적 이용 및 재배포가 확실한 자체 원색 시드 팔레트 200종을 새롭게 구축하여 신규 공개 라이브러리로 대체한다.

---

## DEC-005: Blueprint 2.7.0 Opt-in 버전 게이트 및 기존 출력 해시 보존 정책

### 맥락
신규 조립 플랫폼 고도화 작업이 기존에 배포된 수많은 Blueprint의 컴파일 결과와 고정 해시를 깨뜨려서는 안 된다.

### 결정
1. 카탈로그 2.1.0 ~ 2.6.0의 Blueprint 문법, 검증 규칙, 컴파일 출력, `site/v1/catalog.json`의 바이트를 변경하지 않는다.
2. 신규 플랫폼 조립 선택(스타일 맥락, 팔레트, 서브토큰, 타이포 시스템, 패밀리)은 카탈로그 버전 `2.7.0`의 최상위 `materials` 필드로만 opt-in한다.
3. 2.6.0 이하 문서에서 `materials` 필드가 사용되면 `VERSION_FIELD` 오류로 거부한다.
4. 기본 생성 카탈로그 버전(`CATALOG_VERSION = 2.4.0`)은 플랫폼 고도화 작업 도중 임의로 승격하지 않는다.

---

## DEC-006: 성과 지표 분리 원칙 (조합 가능 수 vs 실질 재료 수)

### 맥락
속성 카테시안 곱이나 단순 조합 가능 수를 "재료 수"로 과장하여 보고하는 벤치마크 왜곡을 방지한다.

### 결정
1. 등록 수(Registered), 실질적 재료 수(Actual Material), 조합 가능 수(Combinable), 실제 조립 검증 수(Assemblable & Verified), 고유 출력 수(Distinct Outputs)를 명확히 분리하여 집계한다.
2. 조합 가능 수는 "재료 수"로 표현할 수 없으며, 반드시 "조합 가능 조합 수"로 명시한다.
3. 목적 패밀리는 플랫폼 조립 가능 조합(`MATERIAL-COVERAGE.json`의 `summary.combinations.platform.assemblableCombinations`)의 곱 축에 합산하지 않고 `summary.byKind`에서 별도로 집계한다. 숫자는 이 문서에 옮겨 적지 않는다. Manifest가 코드에서 계산한 값만 근거로 쓴다.

---

## DEC-007: 트랙별 엄격한 파일 소유권 분할 및 단일 서비스 진입점 원칙

### 맥락
7개 트랙이 동시에 작업을 진행할 때 동일 파일에 대한 동시 수정으로 인한 충돌 및 분기를 방지한다.

### 결정
1. `CONTRACTS.md` §6의 파일 소유권 매트릭스를 준수한다. 다른 트랙 파일은 §6.1의 교차 트랙 허가(`TASK-LEDGER.json`의 `crossTrackFiles`)가 있을 때만 고친다.
2. REST API, MCP 서버, Next.js 웹 애플리케이션, Studio는 독자적인 컴파일·조립 로직을 갖지 않고, Core 서비스 진입점(`src/service/index.mjs`, ADR 0009)이 공개한 함수와 `src/edit`의 연산만 호출한다. 조립은 `assembleDesign()`·`assembleComponents()`, 카탈로그 읽기는 `listCatalog`·`getMaterial`·`listPlatformMaterials` 등이다. 웹은 `src/platform`을 직접 import하지 않는다(`apps/web/boundary.check.mjs`가 강제).
3. 채널 간 결과의 바이트 일치성은 채널 일관성 테스트(`tests/channel-*.test.mjs`)로 보증한다.

---

## DEC-008: Manifest 수치는 코드에서만 얻는다 (P0-AUDIT)

### 맥락
Phase 0 감사의 Manifest 생성기는 이전 기준값을 `?? 9` 같은 리터럴로 되돌려 쓰고 비교표 `status`를 `match`로 고정했으며, 존재하지 않는 재료 id(예: `layout:stack`, `type-system:modern-saas`) 26개를 매핑해 조용히 `missing`으로 만들었고, 웹·Studio 노출을 id 접두사로 추정했다. 그 결과 수치는 코드의 변화에 반응하지 않았다.

### 결정
1. 수량, 비교표, 노출 여부, 상태는 레지스트리·서비스 호출·라우트 파일에서 생성 시점에 계산한다. 이전 기준값은 REQUEST.md §2.1 표에서 읽는다.
2. 요구 항목 목록은 REQUEST.md에서 읽는다(생성기에 항목 수를 적지 않는다).
3. 매핑이 가리키는 재료 id·변형 값이 레지스트리에 없으면 생성이 실패한다.
4. 계산이 비싼 값만 `docs/evidence/platform/baseline.json`에서 읽고 출처와 신선도를 Manifest에 적는다.
5. 상세 규칙은 `CONTRACTS.md` §8.

---

## DEC-009: Studio 연속 편집 최적화와 컴파일 결과 캐시 (TASK-TRA-04)

### 맥락
Studio는 브라우저 안에서 Blueprint를 컴파일한다. REQUEST §3.5는 입력 디바운스, 중복 제거, 오래된 응답 무시, 변경 없는 영역 재사용, 후보 탐색 축소, 조립·미리보기 결과 공유, 코드 분할, 대형 패널 지연 로딩을 요구하고 "성능 최적화를 위해 검증 자체를 생략하지 않는다"고 못박는다. 원 구현(`05cd7c875`)은 독립 검증에서 아래 결함이 나와 수정했다.

### 결정
1. **컴파일 관리자** (`apps/web/features/studio/compiler.ts`의 `StudioCompileManager`): 75ms 디바운스, 캐시 확인, 같은 키가 컴파일 중이면 그 결과를 함께 쓰는 진행 중 중복 제거, 더 새로운 `schedule`·`cancel`이 있었던 요청의 응답 폐기(요청 번호가 최신일 때만 전달). 컴파일 함수는 주입할 수 있어 동기·비동기 모두 같은 경로로 시험한다.
2. **캐시 키는 CONTRACTS §5.2를 따른다**: `SHA256(engineVersion:catalogVersion:materialIds:canonicalRequest:mode:viewport)`의 앞 32자. 해시는 Node와 브라우저에서 같은 동기 SHA-256 구현이다(원 구현은 브라우저에서 비암호학적 대체 해시를 썼고 Node에서는 `eval('require')`를 썼다. 환경마다 키가 달랐고 충돌하면 다른 입력의 HTML을 돌려줄 수 있었다). 기기 폭은 컴파일 결과에 영향이 없어 키와 의존성에서 뺐다.
3. **엔진 버전의 편차**: §5.2의 `PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION` 중 웹은 `src/platform`을 import할 수 없고(`boundary.check.mjs`) Studio의 `compileBlueprint`는 platform 계약을 거치지 않는다. 공개 진입점이 내보내는 `CONTRACT_VERSION`만 써서 `compileBlueprint/<CONTRACT_VERSION>`을 엔진 버전으로 쓴다. platform 계약 버전을 공개 진입점에 노출할지는 Track A가 정한다.
4. **캐시 상한과 제거**: 크기 상한 100의 LRU. 키에 버전이 있어 만료 시간은 두지 않는다(§5.3 동적 요청). 예외로 끝난 컴파일은 캐시하지 않는다.
5. **공유 범위**: 미리보기와 HTML 내보내기가 한 캐시(`studioCompileCache`)를 쓴다. 조립 화면(`/studio/assemble`)은 서버 컴포넌트라 브라우저 캐시와 인스턴스를 공유할 수 없어, 원 구현의 `cacheCandidates`(서버에서 도는 사실상 죽은 코드이며 검증하지 않은 HTML을 컴파일 키로 저장했다)를 제거했다. 조립에서 Studio로는 기존 시작 요청 경로를 쓴다.
6. **후보 탐색 재사용은 검증을 생략하지 않는다**: 원 구현은 후보 시험을 `theme/colorPalette/catalogVersion` 같은 일부 필드로만 메모했고 존재하지 않는 `doc.axes`·`doc.layout`·`doc.template`을 키로 써서 판정이 낡았다. Core로 확인한 결과 `profile`이 바뀌면 색·타입 후보 판정이, `mode`·스타일 축(typography 포함)이 바뀌면 프로파일 후보 판정이, `colorPalette`가 바뀌면 타입·프로파일 후보와 선택 가능성 판정이 실제로 바뀐다. 그래서 판정 묶음마다 "읽지 않음이 확인된 필드"만 키에서 빼고(`EXPLORATION_IGNORED`) 나머지가 모두 같을 때만 이전 판정을 쓴다. 레거시 `palette`(색 변경)는 모든 판정에, `typeRoles`(타이포 변경)는 선택 가능성·색·프로파일 판정에 영향이 없다. 이 전제는 `compiler.unit.mjs`가 실제 Core로 전수 비교하며, 읽는 필드가 늘면 그 시험이 먼저 깨진다.
7. **지연 로딩**: `EditPane`·`PreviewPane`·`Dialogs`·세 패널은 별도 청크다(`next build` 산출물로 확인). 시작 화면에서만 JS가 줄고(약 -2.5KB), 문서를 열면 청크 수가 늘어 총량은 오히려 늘어난다(`PERFORMANCE-A2.json`). 지연 로딩만 적용하면 디자인 탭 첫 열림이 약 120ms에서 약 400ms로 늘어 INP 목표(200ms)를 넘으므로, 작업대가 열린 뒤 유휴 시 나머지 패널 청크를 미리 받는다.
8. **측정 주장 정정**: 원 기록의 "10회 연속 편집 시 10회→1회"는 이 커밋의 이득이 아니다(원래 코드도 60ms 디바운스로 1회). 같은 스크립트로 전후 코드를 번갈아 잰 값은 `PERFORMANCE-A2.json`의 `abComparison`이다. 원 기록의 "2,592B 감소"는 다른 커밋의 기준선과 비교한 값이고, 같은 조건 전후 값은 -2,476B다. 원 기록의 "32자 MD5 키" 서술은 코드(Node는 SHA-256, 브라우저는 비암호학적 해시)와 맞지 않아 바로잡았다.

---

## DEC-010: 사전 생성 미리보기의 위치, 파일 이름, 형식 (TASK-TRA-01~03 독립 검증)

### 맥락
CONTRACTS §5.3 은 미리보기를 `apps/web/public/previews/<CacheKey>.svg`(git 에 넣지 않는 웹 빌드 산출물)로 정했고, 위치를 바꾸려면 TASK-TRA-02 에서 정해 이 문서에 적으라고 했다. 최초 구현(`90ac06060`)은 `site/previews/<종류>/<id>.svg` 로 만들었고 다음 결함이 있었다: SVG 가 XML 로 읽히지 않아 `<img>` 로 열리지 않았고(doctype, 빈 요소, 값 없는 속성), 부품 미리보기가 0개였으며, Explore 의 테마 변형 디자인은 파일 이름이 맞지 않았고, 타이포그래피는 다크·샘플·폭 선택을 무시하고 같은 그림을 보였고, 이름이 캐시 키가 아니라서 immutable 헤더를 줄 수 없었다.

### 결정
1. **위치는 `site/previews/` 로 한다.** `site/` 는 추적되는 생성물이고 `scripts/build.mjs` 가 `scripts/build-catalog-index.mjs` 를 부르므로 `check-generated` 의 파일 집합 검사를 지킨다. 웹은 `sync-static` 으로 `apps/web/public/previews/` 에 복사해 서빙한다(복사본은 git 에 없다). 이 절이 §5.3 의 위치 규정을 대체한다.
2. **파일 이름은 §5.2 의 캐시 키(32자 hex)다.** `/previews/<키>.svg`. 이름이 입력의 해시라서 `Cache-Control: public, max-age=31536000, immutable` 이 안전하다(`apps/web/next.config.mjs`). 키 입력은 엔진 버전(`PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION`, 서비스가 `PLATFORM_CONTRACT_VERSION` 을 읽기 전용으로 내보낸다), 카탈로그 버전, 고른 재료의 `id@version`, 정규화한 요청(문자열을 trim 하지 않는다), 모드, 화면 폭이다. 하나라도 바뀌면 이름이 바뀐다.
3. **화면은 자기가 그릴 요청의 키를 만들어 `previews-data.json` 에 있을 때만 정적 파일을 쓴다.** 요청이 다르면 키가 달라 다른 요청의 그림이 나올 수 없다. 없으면 `/platform/render?...&part=svg` 가 선택 시점에 컴파일하고(서버 LRU), 사전 생성 때 Core 가 거부한 조합이면 컴파일하지 않고 이유를 보인다.
4. **형식은 SVG(foreignObject) 이고 안쪽은 Core 가 만든 완성 HTML 문서를 XHTML 로 직렬화한 것이다**(`apps/web/lib/api/preview-svg.mjs`). 요소·속성·CSS 는 그대로이고 doctype·script·meta·title 만 뺀다. 같은 변환기를 사전 생성과 렌더 라우트가 쓴다. 변환이 어려운 입력은 던진다. Chromium 과 WebKit 에서 같은 문서의 직접 렌더와 `<img>` 렌더가 같은 화면임을 확인했다(WebKit 은 바이트 동일).
5. **대상은 대표만이다.** Explore 대표 디자인(템플릿 기본 + 컨셉 테마 조합, 웹 목록과 같은 함수), 부품 기본 렌더, 플랫폼 사례, 목적 패밀리 기본 예시, 타이포 시스템의 기본 보기(문서 샘플·라이트·1280). 사용자가 고르는 샘플·모드·폭과 Studio 입력은 선택 시 컴파일한다. 대상 목록과 문서를 만드는 절차는 웹 화면이 쓰는 코드(`apps/web/lib/api/preview-recipes.mjs`)를 그대로 쓰고, 어떤 재료를 만들지는 레지스트리와 카탈로그를 읽어 정한다.
6. **`/platform/render` 는 공개 캐시를 허용하지 않는다.** `Cache-Control: private, no-cache` + ETag(같은 키 규격), 같은 입력의 재요청은 304 로 컴파일하지 않는다. 사용자 콘텐츠가 든 결과를 CDN 에 두지 않는다(REQUEST §3.3).
7. 서버 캐시는 항목 수(1,000)와 바이트(조립 결과 96MB) 상한이 있는 LRU 다. 상한 없는 모듈 수준 Map 은 `tests/platform-cache.test.mjs` 가 막는다.
8. 사전 생성기는 웹의 순수 TS 데이터 세 파일(`id.ts`, `cases.ts`, `samples.ts`)을 Node 의 TS 제거로 직접 읽는다. Node 22.18 이상이 필요하다(로컬 26.9 에서 확인, 그 아래 버전은 확인하지 않았다 `확인 필요`).
9. Studio 의 컴파일 결과 캐시(DEC-009)는 엔진 버전으로 `compileBlueprint/<CONTRACT_VERSION>` 만 쓴다. DEC-009 3항이 "platform 계약 버전을 공개 진입점에 노출할지는 Track A가 정한다"고 남겼으므로, 이 결정으로 `PLATFORM_CONTRACT_VERSION` 을 `src/service/index.mjs` 가 읽기 전용 상수로 내보낸다(채널 출력은 바뀌지 않는다). Studio 키가 이를 쓸지는 Track F 가 정한다.
10. **초기 전송량 목표는 새로 만들지 않는다.** TASK-TRA-03 은 목표를 `PERFORMANCE-BASELINE.json` 측정값 기준으로 DECISIONS 에 적으라고 했지만 REQUEST §3.6 에는 KB 수치가 없고, 측정은 로컬 `next start`(정적 파일 비압축)뿐이라 압축 서빙 기준값이 없다. 이번에는 기준선 대비 실측만 `PERF-BOTTLENECKS.md` §5 에 적고(Explore 초기 전송량은 늘었다), 목표 수치는 압축되는 서빙(Vercel)에서 측정한 뒤 정한다.

## DEC-011: 컴포넌트 공통 계약과 계열 등록

### 맥락
§6.2의 207개 요구를 여러 계열 작업자가 병렬로 다루므로 같은 필드·계층·검증 기준과 별도 재료/변형/복합 분류가 필요하다.

### 결정
1. Track D 계약 스키마와 전체 등록 검증은 `src/platform/families/contracts.mjs`에서 제공하며, 기존 기반 10개·목적 32개와 A 계열 정의를 동일 계약 필드로 정규화한다. 지원하지 않는 값에는 이유를 적는다.
2. 각 후속 계열은 `src/platform/families/<family>.mjs`와 전용 테스트를 독립 작성한다. 계열 배열을 `families/index.mjs`에 등록하는 일은 통합자가 한 번에 처리해 병렬 충돌을 줄인다.
3. 색상·외형·크기·밀도 값은 새 종류로 세지 않고 `componentType` 단위로 집계한다. §6.2 요구 행 분류는 독립 재료·변형·복합 패턴 세 가지로 고정한다.
4. A 계열의 Core 조립·REST·MCP 입력 경로는 기존 `assembleComponents` 단일 진입점을 재사용한다. Blueprint 지원은 실제 컴파일 round-trip이 검증된 경우에만 연결 완료로 센다.

---

## DEC-012: A 계열(버튼·액션)의 등록 방식과 Blueprint 왕복

### 맥락
DEC-011이 만든 A 12항목은 `component:*` 계약과 독립 시연(`actions` 입력)이었다. 플랫폼 레지스트리는 id가 `purpose:<group>.<name>` 또는 `<kind>:<name>`이어야 하므로 `component:*`는 재료 질의(`listPlatformMaterials`)에도 Blueprint(`materials`)에도 등록될 수 없었다. 그래서 Manifest에서 A가 7/12에 머물렀고 `blueprint.field: materials.actions`는 실제 스키마에 없는 필드를 가리켰다.

### 결정
1. 새 재료 종류를 만들지 않는다(`PLATFORM_KINDS`는 Track A 소유이고 종류를 더하면 코드·검증·웹 전체가 따라 움직인다). 기존 구현이 있는 7항목은 그 재료를 그대로 쓰고, 구조가 다른 5항목(Split·Menu·FAB·Copy·Close)만 목적 패밀리(`purpose:button.split·menu·fab·copy·close`)로 등록한다. 목적 패밀리는 레지스트리 질의, 시각 패밀리 조합 검사, `materials.purposes` Blueprint 왕복을 이미 가진다.
2. `ACTION_COMPONENTS[].materialId`와 `blueprint`가 항목마다 등록 재료와 Blueprint 사용법을 코드로 적는다. 독립 시연 `actions`는 시각 패밀리를 고르지 않는 기본 외형으로 남기고, 메뉴·복사·닫기·단일 선택의 구조와 런타임은 `src/platform/families/action.mjs` 한 곳에서 둘이 같이 쓴다.
3. 런타임은 목적 패밀리 레코드의 필드가 아니라(레코드 필드는 닫혀 있다) `actionRuntimeFor(ids)`가 쓴 id를 보고 붙인다. `src/platform/render.mjs`와 `assembleComponents`만 이 함수를 부르고, 쓰지 않은 출력의 바이트는 그대로다(기존 고정 해시 영향 없음).
4. 버튼 계열 목적 패밀리는 `assembleDesign`의 `components`로 페이지에 놓이지 않는다(패턴 슬롯에 `button-control`을 받는 칸이 없다). 이 제약은 Track A의 페이지 슬롯 규칙이라 이번 범위에서 풀지 않았다. Blueprint는 `materials.purposes`와 격자의 표지 노드로 직접 쓴다.
5. 분류 원천을 `src/platform/families/inventory.mjs`로 옮기고 문서 표는 생성기(`docs/platform/evidence/components/build.mjs`)가 쓴다. 근거가 있는 다섯 행(Phone·URL Input, KPI Card, Dashboard KPI Grid, Bulk Action Toolbar)을 보정해 149/36/22가 되었다(`docs/platform/components.md`).
6. 변형을 신규 종류로 세지 않는 규칙을 계약에 넣었다: 계약마다 `componentType`을 두고, 같은 컴포넌트를 독립 시연과 목적 패밀리가 모두 설명해도 한 종류로 센다.

## DEC-013: Components 목록 쪽 나눔, Studio 캐시 키의 platform 계약 버전, 측정 훅 (TASK-TRA-01, TASK-TRA-04 잔여)

### 맥락
A1 검증은 Components 목록의 DOM 카드 92개(24개 원칙 위반)를, A2 검증은 Studio 캐시 키의 platform 계약 버전 누락과 운영 빌드의 `window.__studio_api` 노출을 남겼다.

### 결정
1. **Components 는 쪽(24개)과 검색·분류로 나눈다. 탭이나 숨김은 쓰지 않는다.** 목적 패밀리 → 구조 부품 순서의 단일 목록을 서버에서 걸러 한 쪽만 카드로 만든다. 분류 값은 `<kind>:<group>`이다(목적 `form`과 부품 `form`처럼 같은 이름이 두 종류에 있다). 상세 주소는 바꾸지 않는다. 라우트가 동적이 되는 대가(LCP 소폭 증가, Vercel 서버 첫 바이트 미측정)는 PERF-BOTTLENECKS §6.2 에 적었다.
2. **기존 시험은 지우지 않고 쪽 나눔에 맞게 고친다.** 한 화면에 부품 링크와 목적 패밀리 32개가 모두 있다는 전제의 단언은 검색으로 찾거나 쪽을 모두 넘겨 32개를 센다(`explore-components-home`, `w6b-scenarios` 시나리오 B 앞부분). 같은 항목 수·같은 링크를 요구한다.
3. **Studio 엔진 버전은 `PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION`이다**(DEC-010 9항의 상수 사용). 어느 쪽이 바뀌어도 모든 Studio 캐시 키가 바뀐다. DEC-009 3항의 편차는 해소됐다.
4. **측정 훅은 빌드 시점 스위치로만 켠다.** `DSK_STUDIO_PROBE=1` 로 빌드한 번들에만 `window.__studio_api`·`__studio_compile_count` 가 들어가고, 운영 빌드는 훅 코드가 번들에서 사라진다. 런타임 스위치(쿼리·localStorage)는 두지 않는다. 사용자가 운영 페이지에서 켤 수 있으면 훅이 노출된 것과 같기 때문이다. 이를 위해 `apps/web/next.config.mjs` 에 `env` 한 줄을 추가했다(§6.1 crossTrackFiles 에 기록).

---

## DEC-014: N 계열(커머스 패턴)의 11항목 계약 및 기존 상품·카트 구조 결합

### 맥락
REQUEST §6.2 N의 커머스 패턴 11종(Product Grid, Product Detail Summary, Product Variant Selector, Quantity Selector, Price Display, Discount Display, Cart Item, Cart Summary, Checkout Summary, Order Status, Review Summary)을 기존 상품·카트 구조와 결합해 실제 출력과 조립 경로를 지원해야 한다. 고유 동작이나 구조가 필요한 재료만 추가하고 불필요한 재료 중복 생성을 방지하며, Core/REST/MCP 전 채널에서 동일한 바이트 출력을 보장해야 한다.

### 결정
1. **고유 동작/구조 중심 재료 매핑 및 기존 기반 재사용**:
   - Product Grid: `component:grid` (독립 렌더러 `kit-product-grid` 지원)
   - Product Detail Summary: `component:buy-box`
   - Product Variant Selector: `component:buy-box`의 part-of 복합 패턴. 첫 번째 옵션 `checked` 보장 및 옵션 선택 상태 지원.
   - Quantity Selector: `base-component:input-control` (독립 렌더러 `kit-quantity-selector`, 증감/경계 disabled 토글 런타임 지원)
   - Price Display: `component:buy-box` (독립 렌더러 `kit-price-display` 지원)
   - Discount Display: `purpose:card.product` (독립 렌더러 `kit-discount-display` 지원)
   - Cart Item: `component:summary` (독립 렌더러 `kit-cart-item`, dismiss 숨김 런타임 및 `.kit-cart-item[hidden]{display:none!important}` 지원)
   - Cart Summary: `component:summary`
   - Checkout Summary: `component:summary`
   - Order Status: `component:steps` (독립 렌더러 `kit-order-status` 지원)
   - Review Summary: `component:reviews`
2. **단독 렌더러 및 단일 조립 경로 (`commerce` 채널 확장)**:
   `src/platform/families/commerce.mjs`에 `renderCommerceComponent`를 구현하고, A 계열의 `actions`와 대칭으로 `assembleComponents`에 `commerce` 필드를 도입하여 Core, REST(`/api/v1/platform/assemble-components`), MCP(`assemble_components`)에서 동일 바이트 출력과 진단을 지원한다.
3. **계약 수량 및 고유 컴포넌트 타입 집계**:
   11종 계약(`COMMERCE_CONTRACTS`)을 `ALL_COMPONENT_CONTRACTS`에 병합하여 총 계약 수 70개, 고유 componentType 51종(기존 42종에서 9종 추가: `product-grid`, `buy-box`, `quantity-selector`, `price-display`, `discount-display`, `cart-item`, `summary`, `order-status`, `reviews`)으로 확장한다.
4. **Product Variant Selector part-of 필수 선택 보장**:
   Product Variant Selector는 독립 컴포넌트가 아니라 Buy Box 내의 복합 패턴(part-of)으로 동작하며, 런타임 및 HTML 렌더 시 첫 번째 옵션의 `checked` 속성을 보장하여 필수 선택 상태를 결손 없이 지원한다.
5. **Studio 및 페이지 조립 제약**:
   standalone 컴포넌트는 `assembleComponents`의 `commerce` 슬롯으로 독립 시연·내보내기를 지원한다. 이 결정은 Studio 선택이나 전체 페이지 조립(`assembleDesign`) 연결을 뜻하지 않는다. 그 연결은 별도 Track F/G 작업이다.

### 독립 재검증 (2026-11-28)

- 원 구현 `7c1bd947c`의 전용 시험은 Blueprint 표본 7종과 단독 렌더 표본 4종이었다. 기존 `TASK-TRD-N`의 `Verified` 표기는 철회하고 11종 각각의 독립 검증 증거로 다시 판정한다.
- Price Display는 필수 `price`를 요구하며 `label`만 전달하면 Core·REST·MCP 모두 같은 오류 봉투를 낸다. 각 렌더러의 계약에 실제로 쓰는 입력, 상태, 이벤트, 토큰, 키보드/ARIA 요구와 미지원 상태·기능을 개별 기록한다.
- 11개 ID 각각에서 선언된 기존 재료를 조회하고, 그 재료가 지원하는 legacy Blueprint 경로와 독립 `commerce` 렌더/export 경로를 시험한다. 두 경로의 기능 범위는 동일하다고 간주하지 않는다.

| 항목 | 재사용 Blueprint 경로 | N 독립 렌더·assembleComponents 지원 | 남은 제약 |
|---|---|---|---|
| Product Grid | `component:grid` | 상품 카드·열·간격 | loading/empty/error 화면 없음 |
| Product Detail Summary | `component:buy-box` | 제목·가격·옵션·구매 문구 | 재고 상태·구매 처리는 백엔드 연결 없음 |
| Product Variant Selector | `component:buy-box` part-of | 네이티브 라디오, 첫 값 선택 | 옵션 재고·비활성화 없음 |
| Quantity Selector | `base-component:input-control` | 값·min/max/step, 증감·경계·disabled/readonly | legacy Blueprint input-control에는 min/max/step·증감 버튼 필드가 없음 |
| Price Display | `component:buy-box` 안 가격 | 필수 가격·정가·단위·sold-out | 숫자 통화 계산 없음 |
| Discount Display | `purpose:card.product` 배지 | 전달된 할인율·금액·배지 | 가격에서 할인 자동 계산 없음 |
| Cart Item | `component:summary` 요약 행 | 수량 조절·삭제 이벤트 | legacy summary에 항목별 삭제·수량 조절이 없고 서버 장바구니 변경도 없음 |
| Cart Summary | `component:summary` | 항목·합계 표시 | 배송비·세금·할인 계산 없음 |
| Checkout Summary | `component:summary` | 항목·합계·결제 버튼 표시 | 결제 제출 없음 |
| Order Status | `component:steps` | 전달된 상태·단계 표시 | 실시간 배송 조회 없음 |
| Review Summary | `component:reviews` | 점수·리뷰 목록 표시 | 리뷰 집계·작성 없음 |

- N 단독 기능의 실제 조립 경로는 `assembleComponents({commerce})`다. Studio 선택과 `assembleDesign`의 페이지 슬롯 배치는 미완료이며 이번 범위에서 선행 구현하지 않는다.
- 재검증에서 11/11 항목이 정확한 재료 ID 질의, 해당 재료의 legacy Blueprint 컴파일 경로, `assembleComponents` HTML/CSS/런타임/standalone export, 입력 변화 반영 및 잘못된 입력 거부를 통과했다. 34개 N 집중 검증도 통과했고, 최신 origin/main 병합 후 Manifest는 1,480개 재료·406개 요구(69개 missing)로 재생성되어 check에서 일치했다. 기존 고정 출력 해시 및 결정론 시험은 전체 테스트 중 통과했다.
- MCP 브라우저에서 390px·1280px 출력을 확인했다. 수량 키보드 조작과 min/max 경계, 옵션 선택, 카트 제거 이벤트를 확인하고 6개 신규 출력을 보았다. 전체 `npm run verify`는 최신 origin/main d43f6963a 병합 후 1,021개 중 1,020개 통과, 1개 실패(exit 1)다. 실패는 upstream `tests/platform-type-fonts.test.mjs` 4번 Playwright 시험의 `page.setContent` 30초 초과이며, 깨끗한 origin/main f5a77c7a8에서도 같은 오류로 재현되어 N 고유 실패가 아니다. 이전 병합 시점에 보였던 `platform-layout-resizable` 실패는 Codex sandbox의 Chromium Mach IPC 권한 거부(1100)였고 이 세션에서는 통과했다. EHI 병합 직후의 collapsible-sidebar coverage 불일치는 D5 병합 후 해소됐다.

---

## DEC-015: J(정보 표시 15항목) 및 K(미디어·콘텐츠 12항목) 공통 컴포넌트 계약과 목적 패밀리 등록

### 맥락
REQUEST §6.2의 J 정보 표시(15항목)와 K 미디어 및 콘텐츠(12항목)는 플랫폼 공통 컴포넌트 계약(DEC-011)을 따르며, 기존 시스템에 이미 렌더러가 구현되어 있는 항목(Badge, Chip, Filter Chip, Tag, Divider, Image, Media Frame, Gallery, Video Frame, Quote, Rich Text Content 등 총 11종)과 고유한 구조·동작이 필요한 신규 목적 패밀리 16종(J 10종, K 6종)으로 분류된다. E4 소유의 Foundations 미디어 축(`media:*`), 아이콘, CSS 토큰 정의 및 2.1.0/2.4.0 기존 고정 해시를 건드리지 않고 공통 계약을 체결해야 한다.

### 결정
1. **신규 목적 패밀리 16종 등록**:
   - J 정보 표시 10종: `purpose:info.status-badge`, `purpose:info.avatar`, `purpose:info.avatar-group`, `purpose:info.accordion`, `purpose:info.collapsible`, `purpose:info.counter`, `purpose:info.notification-indicator`, `purpose:info.keyboard-shortcut`, `purpose:info.metadata-row`, `purpose:info.stat-comparison`.
   - K 미디어/콘텐츠 6종: `purpose:media.responsive-image`, `purpose:media.carousel`, `purpose:media.audio-player`, `purpose:media.file-preview`, `purpose:media.image-comparison`, `purpose:media.figure-caption`.
   - 플랫폼 목적 패밀리 등록량이 37종에서 53종으로 확장되었다.
2. **기존 구현 재사용 및 중복 금지**:
   - 기존 구현이 존재하는 J 5항목(Badge, Chip, Filter Chip, Tag, Divider)과 K 6항목(Image, Media Frame, Gallery, Video Frame, Quote, Rich Text Content)은 기존 `base-component` 및 `purpose:*`를 매핑하고 불필요한 중복 재료를 생성하지 않는다.
3. **인터랙티브 런타임 및 접근성**:
   - 상태 전이와 상호작용이 필요한 4개 컴포넌트(`accordion`, `collapsible`, `carousel`, `image-comparison`)는 `INFO_MEDIA_RUNTIME`과 `INFO_MEDIA_RUNTIME_IDS`를 통해 `actionRuntimeFor`에 연결된다.
   - 키보드 내비게이션(Enter/Space 토글, ArrowRight/ArrowLeft 캐러셀 슬라이드 및 비교 슬라이더 조절)과 ARIA 표준(`aria-expanded`, `aria-controls`, `aria-roledescription`, `aria-valuenow`, `role="region"`, `role="group"`)을 준수한다.
   - 사용하지 않는 페이지 출력에서는 런타임 JS가 주입되지 않아 무거운 부하를 초래하지 않는다.
4. **카탈로그 노출 및 Studio 선택 제약**:
   - 16개 신규 목적 패밀리는 레지스트리 질의 및 카탈로그 탐색에 노출(`catalog-visible`)되나, Studio UI 선택지는 Track F 소유이므로 `blockedBy: no-studio-choice`를 명시한다.
5. **불변 조건 및 결정론적 컴파일 보존**:
   - 기존 Blueprint 2.1.0 고정 해시, 2.4.0 기본 출력, `site/v1/catalog.json` 컴파일 계약을 100% 보존하며, 결정론적 조립 원칙(DEC-001)과 서비스 단일 진입점 원칙(DEC-007)을 준수한다.

