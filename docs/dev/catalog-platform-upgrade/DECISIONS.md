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

## DEC-009: 컴포넌트 공통 계약과 계열 등록

### 맥락
§6.2의 207개 요구를 여러 계열 작업자가 병렬로 다루므로 같은 필드·계층·검증 기준과 별도 재료/변형/복합 분류가 필요하다.

### 결정
1. Track D 계약 스키마와 전체 등록 검증은 `src/platform/families/contracts.mjs`에서 제공하며, 기존 기반 10개·목적 32개와 A 계열 정의를 동일 계약 필드로 정규화한다. 지원하지 않는 값에는 이유를 적는다.
2. 각 후속 계열은 `src/platform/families/<family>.mjs`와 전용 테스트를 독립 작성한다. 계열 배열을 `families/index.mjs`에 등록하는 일은 통합자가 한 번에 처리해 병렬 충돌을 줄인다.
3. 색상·외형·크기·밀도 값은 새 종류로 세지 않고 `componentType` 단위로 집계한다. §6.2 요구 행 분류는 독립 재료·변형·복합 패턴 세 가지로 고정한다.
4. A 계열의 Core 조립·REST·MCP 입력 경로는 기존 `assembleComponents` 단일 진입점을 재사용한다. Blueprint 지원은 실제 컴파일 round-trip이 검증된 경우에만 연결 완료로 센다.
