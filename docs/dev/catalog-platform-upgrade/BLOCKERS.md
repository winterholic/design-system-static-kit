# 블로커 및 미해결 문제 관리대장 (BLOCKERS.md)

- 상태: 활성 (Phase 0 전수 감사 완료)
- 버전: 1.1.0 (P0-AUDIT 독립 검증 반영. 수치는 `MATERIAL-COVERAGE.json`의 2026-11-28 실측이며 Manifest를 다시 만들면 달라진다)
- 관리 위치: `docs/dev/catalog-platform-upgrade/BLOCKERS.md`
- 상태 구분: `OPEN` (미해결) | `INVESTIGATING` (조사 중) | `RESOLVED` (해결됨)

---

## BLK-001: 카탈로그 목록 iframe 및 동적 렌더링 병목

- **상태**: `OPEN` (Track A / TASK-TRA-01 담당)
- **영향 범위**: `apps/web/app/components/`, `apps/web/app/explore/`, `apps/web/features/explore/Thumb.tsx`
- **증상**:
  - 카탈로그 카드마다 독립적인 `iframe`과 `IntersectionObserver`가 생성됨.
  - 화면 스크롤 시 iframe이 파괴되고 재진입 시 재생성되어 메인 스레드 Long Task 발생 및 모바일 브라우저 크래시 위험.
  - 전시용 카드 목록 요청마다 Core 컴파일이 동적으로 실행되어 서버리스 환경 콜드스타트 및 CPU 낭비 초래.
- **해결 방안**:
  - Track A에서 목록 카드용 경량 정적 SVG/HTML 사전 생성 파이프라인 구축.
  - 목록 페이지 iframe 전면 제거 (0개 달성).
  - 컴포넌트 상세 페이지의 Playground에서만 온디맨드 격리 iframe 허용.

---

## BLK-002: Coolors 427 팔레트의 재배포 권리 미확인 상태

- **상태**: `OPEN` (Track B / TASK-TRB-01 담당)
- **영향 범위**: `src/catalog/palette-rows.mjs`, 색상 카탈로그 전체
- **증상**:
  - 기존 카탈로그의 427개 팔레트는 과거 수집본으로 재배포 라이선스가 확인되지 않음(`source.license: "unverified"`).
  - 신규 플랫폼 공개 카탈로그 및 내보내기 기능에 그대로 노출할 경우 라이선스 침해 우려.
  - **현행 노출(P0-AUDIT 실측)**: `/materials/**`와 REST·MCP(`getMaterial`)는 이 팔레트를 내지 않는다. 그러나 Studio `DesignPanel`의 "모든 팔레트" 목록이 427개를 선택지로 내고, Explore 카드 일부가 이를 쓴다. Manifest에서 이 427개는 `metadata-only`이면서 `studioAssemblable: true`다. 이전 감사 문서의 "비노출"은 사실과 다르다.
- **해결 방안**:
  - DEC-004 정책에 따라 Coolors 팔레트는 플랫폼 레지스트리 등록 차단 및 신규 카탈로그 비노출 처리.
  - Track B에서 상업적 이용 및 재배포가 검증된 10개 계열별 자체 원색 시드 팔레트 200종을 새롭게 구축.
  - Studio 선택지 처리 방식은 Track F·B가 결정하고 DECISIONS.md에 기록(DEC-004 현행 편차).

---

## BLK-003: 서브토큰 세트 부족(7종) 및 색상 역할 분배 단조로움

- **상태**: `OPEN` (Track B / TASK-TRB-02 담당)
- **영향 범위**: `src/platform/data/subtoken-sets.mjs`, 조립 결과의 시각적 다양성
- **증상**:
  - 현재 플랫폼에 등록된 서브토큰 세트가 7종에 불과하여, 팔레트를 바꾸어도 제품 맥락(ERP 고밀도, 핀테크 정밀, 에디토리얼, 럭셔리 등)에 맞는 차별화된 색상 배분이 어려움.
- **해결 방안**:
  - §4.4에 명시된 25종 서브토큰 세트 전수 구현 (18종 신규 설계).
  - 23개 색상 역할별 램프 단계 및 라이트/다크 대비 보정 규칙(RoleRule) 완결.

---

## BLK-004: 필수 컴포넌트 인벤토리 missing 공백 (207개 중 95개 missing)

- **상태**: `OPEN` (Track D / TASK-TRD-01 담당)
- **영향 범위**: `src/materials/`, `src/platform/families/`
- **증상**:
  - P0-AUDIT 실측: §6.2 필수 인벤토리(A~O) 207개 중 지원 경로가 확인된 항목은 112개(직접 74, 변형 29, 구형 노드 스키마 7, 구성 요소 2)이고 95개가 `missing`이다. 변형·스키마 경로는 재료 하나의 값으로 충족하는 것이며 별도 카탈로그 항목이 아니다.
  - 충족한 112개 중 웹 카탈로그와 Studio와 검증까지 닿은 항목(`verified`)은 88개, 웹에는 보이나 Studio 선택지가 없는 항목(`catalog-visible`)은 21개, 그 아래 단계는 3개다. 지원 경로가 있다는 말은 사용자가 끝까지 쓸 수 있다는 말이 아니다.
  - 이전 감사 문서의 "50개 충족, 157개 missing"은 존재하지 않는 재료 id(`component:accordion`, `component:badge`, `component:article`, `state-pattern:banner` 등)와 `layout:stack` 같은 잘못된 접두사 때문에 실재하는 재료를 못 찾은 값이라 폐기한다.
  - 날짜 선택기의 달력 팝업·범위·시간 선택, 모바일 패턴 10개 중 8개, 커머스 패턴 11개 중 6개, 오버레이 9개 중 Drawer·Popover·Dropdown Menu·Contextual Help, 선택 컨트롤의 Slider·Range Slider·Rating·Color Picker 등이 `missing`으로 남아 있다.
- **해결 방안**:
  - Track D에서 우선순위가 높은 핵심 컨트롤(입력군, 선택군, 오버레이군)부터 순차적으로 계약 및 렌더러 구현.
  - 복합 패턴 및 목적별 컴포넌트 120종 레시피 단계적 확충.

---

## BLK-005: 웹 카탈로그의 카테고리 탭 부재 및 단일 롱스크롤 구조

- **상태**: `OPEN` (Track F / TASK-TRF-01 담당)
- **영향 범위**: `apps/web/app/components/page.tsx`
- **증상**:
  - 현재 컴포넌트 페이지가 단일 긴 페이지에 수십 개의 부품을 한꺼번에 나열하여 과도한 스크롤이 필요하고 탐색성이 극히 저하됨.
  - 구형 카탈로그 부품과 신규 목적별 컴포넌트가 혼재되어 사용자 혼란 유발.
- **해결 방안**:
  - 17개 카테고리 탭 도입 및 초기 24개 카드 청크 로딩 구현.
  - 카테고리 탭 전환 시 캐시된 데이터로 200ms 이내 전환 보장.

---

## BLK-006: Vercel 실제 운영 배포 버전 식별 체계 부재

- **상태**: `OPEN` (Track G / TASK-TRG-04 담당)
- **영향 범위**: `apps/web/`, 배포 환경 진단
- **증상**:
  - 현재 웹사이트에서 현재 배포된 Git Commit SHA, Catalog Version, 플랫폼 계약 버전(`PLATFORM_CONTRACT_VERSION`)·서비스 계약 버전(`CONTRACT_VERSION`)을 외부에서 명확히 식별할 수 있는 엔드포인트 부재. (`Compiler Version`이라는 상수는 코드에 없다.)
  - 로컬 환경의 검증 결과와 운영 환경 배포 상태의 일치 여부 확인 어려움.
- **해결 방안**:
  - `apps/web/app/api/version/route.ts` 구현하여 빌드 메타데이터(Git SHA, Catalog Version, 두 계약 버전, Build ID) 노출. `apps/web/app/api/**`는 Track A 소유이므로 TASK-TRG-04는 `crossTrackFiles`로 허가를 받는다.
  - Phase 11에서 Vercel 실제 운영 배포 환경의 정상 동작 실측.

---

## BLK-007: Manifest가 드러낸 연결 단절 (P0-AUDIT 신규)

- **상태**: `OPEN` (트랙별 분담, 아래 표)
- **영향 범위**: `MATERIAL-COVERAGE.json`의 `blockedBy`가 `defined` 이하이거나 `renderable`인 재료
- **증상(2026-11-28 실측, 코드에서 계산)**:
  - 웹 카탈로그에 렌더하는 라우트가 없는 종류: `chart-preset` 29, `type-preset` 18, `page-type` 16, `pattern` 11, `profile` 7, `theme` 중 Explore에 쓰이지 않는 4개. 모두 `renderable`에서 멈춘다.
  - 조립은 되지만 Studio가 고르게 해 주지 않는 목적 패밀리: 32개 중 24개(Studio 조립 화면으로 이어지는 경로가 카드 계열 8개뿐이다).
  - 어느 조립 목적(landing, dashboard, article, commerce)과도 맥락이 맞지 않아 `assembleDesign`으로 한 번도 조립되지 않는 스타일 맥락 5개(`civic`, `clarity`, `gallery`, `pocket`, `school`).
  - 선택해도 출력이 변하지 않는 상태 패턴 3개(`error-banner`, `success-confirmation`, `success-toast`: 표 상태에 해당 상태가 없거나 배치가 맞지 않는다).
  - 레이아웃 원형 2개(`stack`, `container`): 레코드가 적은 선택자(`.kit-card-body`, `data-measure`)가 어느 패턴 템플릿의 컴파일 출력에도 없다.
- **해결 방안**: `CONTRACTS.md` §8.2의 `blockedBy` 표를 따라 푼다. 라우트를 새로 만들면 `scripts/generate-material-coverage.mjs`의 `buildSurfaces()`에 등록한다.
