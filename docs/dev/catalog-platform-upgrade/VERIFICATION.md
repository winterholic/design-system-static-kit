# 고도화 검증 계획 및 실행 증거 기록 (VERIFICATION.md)

- 상태: 활성 (Phase 0 감사는 P0-AUDIT 독립 검증으로 재작성됨)
- 버전: 1.1.0
- 관리 위치: `docs/dev/catalog-platform-upgrade/VERIFICATION.md`
- 관련: `REQUEST.md §12, §15`, `docs/governance.md`, `CONTRACTS.md §8`

---

## 1. 검증 체계 및 품질 게이트 원칙

1. **완료 선언의 증거 의무**: "완료", "통과", "수정됨"을 선언하기 전에는 반드시 방금 실행한 최신 명령과 1~3줄의 실제 터미널 출력을 제시해야 한다.
2. **RED-GREEN 검증**: 테스트나 검사를 새로 작성하거나 수정할 때는 버그를 심어 실패하는 것을 한 번 본 뒤(RED), 원래 코드로 통과하는 것을 확인해야 한다(GREEN).
3. **기존 테스트 불변**: 기존 테스트(2026-11-28 `npm test` 실측 794개)를 임의로 완화하거나 삭제하지 않는다.
4. **결정론적 동등성**: 동일 입력에 대해 2회 이상 연속 실행했을 때 산출물이 바이트 단위로 일치해야 한다(`shasum` 또는 `cmp`).
5. **자기 확인만으로는 완료 근거가 되지 않는다**: 다른 공급자나 다른 컨텍스트가 코드에서 다시 계산한 결과와 대조한다(§4).

---

## 2. Phase 0 원 감사 기록 (폐기됨)

Phase 0 원 작업(커밋 b70e2a248)의 검증 기록은 다음 이유로 폐기하고 §4로 대체한다.

- 기록된 수치(레코드 1,551건, 요구 충족 109건, 컴포넌트 50건 충족·157건 missing, 차트 29건 전수 충족 등)는 생성기의 하드코딩 fallback과 존재하지 않는 재료 id 매핑에서 나온 값이다(§4.2).
- "17개 필드가 있다"는 검증은 필드 존재만 보았고 값의 진위는 보지 않았다.
- `npm run coverage:materials` 2회 바이트 일치 검증은 유효하지만, 같은 입력에서 같은 거짓을 두 번 낸 것일 수 있어 정확성의 증거가 아니었다.

`node scripts/platform/baseline.mjs --check`(플랫폼 기준선)는 P0-AUDIT에서도 다시 실행했고 일치했다.

```sh
node scripts/platform/baseline.mjs --check
```
```text
BASELINE MATCH docs/evidence/platform/baseline.json
platform assemblable        119610 (of 120420 tried)
platform verified           5793 assembled+checked, 5787 distinct outputs (5793 tried)
(61.0s)
```

---

## 3. 후속 트랙(Track A~G) 검증 의무 및 절차

1. **신규 재료 추가 시 (Track B, C, D, E)**:
   - 해당 재료의 실패하는 계약 테스트 작성 (RED), 구현 후 통과 확인 (GREEN).
   - `npm run coverage:materials` 실행 후 `MATERIAL-COVERAGE.json`에서 그 재료의 `status`와 `blockedBy`를 확인한다. 상태는 코드가 정하며 손으로 올릴 수 없다.
   - 요구 항목을 충족하려고 추가했다면 생성기의 `COVERAGE` 매핑 갱신을 Track G에 요청한다. 변형으로 충족하는 경우 근거 기록의 `variants`에 값이 있어야 생성이 통과한다.
   - `TASK-LEDGER.json`에 완료 커밋과 테스트 파일을 기록한다.
2. **새 웹 화면이나 라우트를 만들 때 (Track F)**: 같은 커밋에서 `buildSurfaces()` 등록을 Track G에 요청한다(CONTRACTS §3 단계 3). 등록하지 않으면 재료는 `catalog-visible`로 올라가지 않는다.
3. **성능 개선 시 (Track A)**: 목록 페이지 iframe 0개를 단위 테스트와 Playwright로 확인하고, Core 컴파일 호출 카운터가 0회인지 확인한다.
4. **웹 페이지 개편 시 (Track F)**: Chromium에서 390px 모바일과 1280px 데스크톱을 검증하고, 카테고리 탭 전환이 캐시된 데이터로 200ms 이내인지 확인한다.
5. **통합 및 릴리스 시 (Track G)**: `npm run verify`와 `npm run coverage:materials:check` 통과, 실제 출력 차이 검사로 D1/D2 결함 재발 방지, 브라우저 E2E 전수 통과를 확인한다.

---

## 4. P0-AUDIT 독립 검증 결과 (2026-11-28)

원 작업은 다른 공급자(Gemini Flash)가 수행했고 완료 증거 일부가 자기 확인뿐이었다. 이번 검증은 생성기가 만든 값을 믿지 않고 코드와 서비스 호출에서 다시 계산해 대조했다. 작업은 `origin/main`(`343c1a795`)에서 만든 worktree(`upgrade/p0-verify`)에서 했다.

### 4.1 발견 결함

| # | 결함 | 증거 |
|---|---|---|
| D-01 | 이전 기준값을 리터럴 fallback(`?? 9`, `?? 85`, `?? 119610`, `?? 5793`, `?? 5787` 등)으로 되돌려 쓰고, 비교표 `status`를 `'match'`로 고정했다. 기준선 파일에서 값이 사라지거나 바뀌어도 표는 그대로 일치로 나온다 | 생성기 1016~1027행, 921~925행 |
| D-02 | 존재하지 않는 재료 id 26개를 매핑해 실재 여부를 확인하지 않고 `missing`으로 만들었다. 예: `layout:stack`·`layout:cluster`(실제 id는 `layout-primitive:stack`), `type-system:modern-saas`·`clean-product` 등 타이포 11개, `component:accordion`·`badge`·`article`, `state-pattern:banner`·`toast`·`empty-card`·`error-card`, `media:media-frame`, `family:outline` | 이전 Manifest에서 id가 `req:`로 시작하지 않는 `missing` 레코드 26건 |
| D-03 | 요구 항목 매핑이 실재하는 재료를 놓쳤다(`component:breadcrumb`, `pagination`, `stepper`, `toc`, `calendar`, `master-detail`, `steps`, `summary`, `buy-box`, `reviews`, `plan`, `team`, `properties`, 입력·선택·탭·피드백 컨트롤의 변형 등) | `requirements[]`의 `coverage`와 §4.4 표(컴포넌트 충족 50→112) |
| D-04 | 차트 29유형을 프리셋 id로 임의로 대응했다. `Pie`→`bar` 프리셋, `Gauge`·`Bullet`·`Box Plot`·`Radar`·`Treemap`→무관한 프리셋. 렌더러가 지원하는 `chartKind`는 14종뿐인데 29유형 전부 충족으로 기록했다 | `chartKind` 분포(14종), 이전 `charts.missing = 0` |
| D-05 | 타이포 시스템 매핑이 의미와 어긋났다(`Humanist`→`work-insight`(분석 보드) 등). 맞는 의미가 있는 것만 남기고 나머지는 missing으로 돌렸다 | §4.4 표(타이포 충족 14→10) |
| D-06 | 재료 종류를 id 접두사로 추정했다. `palette:row-`로 시작하는 id는 하나도 없어(실제 id는 `palette:ocean` 등) 레거시 팔레트 427개가 플랫폼 팔레트 분기로 들어가 정의 경로·렌더러·테스트가 거짓으로 채워졌다 | 접두사 `palette:row-` 일치 0건 |
| D-07 | 테스트 근거를 지어냈다. 이전 레코드의 테스트 참조 1,240건 중 789건(63.6%)이 존재하지 않는 파일(`tests/platform-family.test.mjs`, `tests/platform-pipeline.test.mjs`, `tests/platform-color.test.mjs`, `tests/audit.test.mjs`, `tests/templates.test.mjs`, `tests/themes.test.mjs`)을 가리킨다. 레지스트리 기록에 이미 있는 `quality.evidence`는 쓰지 않았다 | 이전 Manifest 대조 |
| D-08 | 웹·Studio·REST 판정이 상수였다. Studio와 REST·MCP는 missing이 아닌 전 레코드(1,323건)가 true였다(`palette:row-` 예외 조항은 일치하는 id가 없어 한 번도 작동하지 않았다). 카탈로그 노출은 접두사 목록으로 판정했다. 실제로는 `chart-preset`을 렌더하는 웹 라우트가 없는데 노출 true, 아이콘·레이아웃 원형·축은 `/materials/foundations`에 있는데 false, 레거시 팔레트는 `getMaterial`이 거부하는데 REST·MCP true였다 | §4.4 표 |
| D-09 | `supportedVersions`가 상수였다(디자인 레코드 1,084건 전부 `["2.4.0","2.6.0"]`, 레코드의 `since`는 무시) | 이전 Manifest 분포 |
| D-10 | `legacyDuplicateRelation`이 존재하지 않는 id를 가리켰다(`component:button`, `component:chrome-nav`). 실제 대응표는 `src/platform/families/legacy-map.mjs`다 | 이전 Manifest, `LEGACY_VARIANT_MAP` |
| D-11 | 조합 가능 수(119,610)를 팔레트·서브토큰·타이포·컴포넌트·패밀리·레이아웃 모든 종류의 `combinable` 필드에 반복해 넣었다. 재료 수와 나란히 놓여 재료 수로 읽힌다(§2.2 위반). 고유 출력 수도 다른 종류의 값을 끌어왔다(팔레트의 고유 출력 = 색 토큰 집합 수 등) | 이전 `byKind` |
| D-12 | 같은 재료가 두 요구를 충족하면 같은 id의 레코드가 둘 생겼다(`purpose:form.search`, `purpose:navigation.bottom`). O절의 `Bottom Navigation`을 `Mobile Bottom Navigation`으로 이름을 바꿔 적었다. 헤더 주석은 "컴포넌트 198개, 총 328개"인데 코드는 207개, 총 337개였다 | §4.6 |
| D-13 | `$schema`가 존재하지 않는 파일(`./material-coverage.schema.json`, `./task-ledger.schema.json`)을 가리킨다 | 파일 없음 |
| D-14 | 문서 쪽: 인벤토리 220(실제 207), 타이포 역할 16(실제 27), MASTER-PLAN 완료 판정 "34개"가 실제 32개 항목(§16.3 전후 비교와 §16.4 시각 검토 누락), DEC-007의 "assembleDesign만 호출"이 사실과 다름, BLK-002·DEC-004의 "비노출"이 Studio 노출과 충돌, CONTRACTS의 존재하지 않는 id 예시·`compilerVersion`·`generatedAt`(결정론 충돌)·`site/previews`(`check-generated` 충돌)·소유권 충돌(`family.mjs`, `chart-presets.mjs`, `layout.mjs`) 등 | §4.6 |

### 4.2 수정

- `scripts/generate-material-coverage.mjs`를 다시 썼다(manifestVersion 2.0.0). 값은 모두 코드에서 계산한다.
  - 요구 목록과 §2.1 기준표는 REQUEST.md를 읽는다. 매핑 표(`COVERAGE`)가 REQUEST.md에 없는 항목이나 레지스트리에 없는 재료·변형 값을 가리키면 생성이 실패한다.
  - 비교표 `status`는 실측값과 기준값의 비교(`match`/`drift`)다. 숫자 fallback은 없다.
  - 재료 상태는 누적 사다리와 `blockedBy`로 정한다(CONTRACTS §8.2). 렌더·조립은 서비스 함수와 `src/edit`를 재료마다 호출해 본다. 웹 노출은 라우트 파일이 부르는 질의를 같은 인자로 다시 불러 계산하고, 라우트 파일에 그 호출이 실제로 있는지 확인한다(20개 라우트 항목).
  - 테스트 근거는 레지스트리의 `quality.evidence`만 쓰고 파일과 줄이 실제로 있는지 확인한다.
  - 조합 가능 수는 `summary.combinations`로 분리했다. 비싼 값(구형 템플릿 조합 컴파일)만 `baseline.json`에서 읽고 출처와 신선도 검사를 `provenance`에 적는다.
  - `--check` 모드와 `npm run coverage:materials:check`를 추가했다.
- 문서 수정은 §4.6에 정리했다.

### 4.3 남은 한계

- **`assemblable`은 "Studio가 선택지를 제공한다"까지만 본다.** 선택지가 클릭 가능한지는 브라우저로 확인하지 않았다(환경: 이 세션은 브라우저 실행 없음). 라우트 파일의 호출과 서비스 질의로 판정한다.
- **요구 항목 매핑(`COVERAGE`)의 의미 판단은 사람의 판단이다.** 재료 id와 변형 값은 코드와 대조하지만 "이 변형이 그 요구를 충족하는가"는 검증하지 못한다. 대표 예: 콤보박스를 select의 `search=async`로, 스낵바를 `placement=toast`+`action=button`으로, 배지를 태그 모음의 `badges` 변형으로 본 것. 경계가 모호한 항목(Notification Card, Callout, Status Indicator, Key-value Inspector 등)은 충족으로 보지 않았다.
- **`verified`는 두 가지 근거 중 하나다.** 플랫폼 재료는 `assembleDesign`/`assembleComponents` 품질 검사 통과, 카탈로그 재료는 유효한 `quality.evidence` 참조다. 접근성·반응형 전용 테스트를 별도로 요구하지는 않았다(`a11yAndResponsiveTested`는 `a11y`·`responsive` 계약 + 조립 품질 통과 + 근거 존재).
- **프로브는 대표 요청 하나로 본다.** 상태 패턴처럼 화면 내용에 따라 출력이 달라지는 재료는 표 내용으로 그 상태를 일으켜 비교했다(그 방식으로 닿지 않는 `success-*`, `error-banner`는 `no-observable-output`). 다른 내용에서는 닿을 수 있다.
- **`distinctOutputs`는 재료별 출력 해시가 있는 재료만 센다.** 축 값 대부분은 스타일 맥락 조립이 고른 값으로 확인했고 자기 출력이 없어 이 집계에 들어가지 않는다.
- **구형 템플릿 조합(16,808)의 조립·컴파일 수는 `baseline.json`에서 읽는다.** 신선도는 시도 수 재계산과 플랫폼 구간 전체 일치로만 확인했다.
- **`apps/web` 테스트(`npm run verify` 중 웹 워크스페이스 패키지 해석)는 worktree에 `node_modules`를 심볼릭 링크로 이어 실행했다.** 링크는 주 작업 폴더의 설치본이라 워크스페이스 패키지(`@winterholic/design-system-static-kit`)가 이 worktree가 아니라 주 작업 폴더의 `src/`를 가리킨다. 이번 변경은 `src/`를 건드리지 않아 결과는 같지만, `src/`를 바꾸는 후속 작업은 자기 worktree에서 `npm ci`로 설치해 검증해야 한다.
- 이 변경은 Manifest 검사를 `npm run verify`에 넣지 않았다(약 30초 추가). 넣을지는 TASK-TRG-01에서 정하도록 장부에 적었다.

### 4.4 수정 전후 요약 (이전 Manifest는 커밋 b70e2a248, 이후는 이번 생성기가 코드에서 계산한 값)

| 항목 | 이전 | 이후 |
|---|---:|---:|
| 재료 레코드 | 1,551 (중복 id 2, 실재하지 않는 id 26 포함) | 1,321 (레지스트리 전수. 플랫폼 237 + 카탈로그 1,084) |
| 요구 항목 | 337 중 충족 109 / missing 228 | 337 중 충족 167 / missing 170 |
| 컴포넌트 §6.2 | 207 중 충족 50 / missing 157 | 207 중 충족 112(직접 74, 변형 29, 스키마 7, 구성 요소 2) / missing 95 |
| 서브토큰 §4.4 | 25 중 충족 7 | 25 중 충족 7 |
| 타이포 §5.2 | 40 중 충족 14 | 40 중 충족 10 (의미가 어긋난 매핑 4건 제외: `work-insight`, `work-console`, `mobile-reader`, `mobile-feed`. 존재하지 않는 id 11개는 이전에도 missing이었고 지금도 missing) |
| 패밀리 §7 | 12 중 충족 4 | 12 중 충족 3 (`family:bold`를 Elevated Material에 대응시킨 것을 제외. `family:outline`은 존재하지 않는 id) |
| 차트 §9.1 | 29 중 충족 29 | 29 중 충족 16 (`chartKind` 14종) |
| 레이아웃 §9.2 | 24 중 충족 5 | 24 중 충족 19 (이전은 `component:grid`, `component:aside`, `component:hero` 변형, `pattern:*` 같은 실재하는 구형 재료와의 대응을 시도하지 않았다) |
| 상태 분포 | missing 228, metadata-only 427, defined 0, renderable 4, catalog-visible 0, assemblable 79, verified 813 | metadata-only 427, defined 21, renderable 85, catalog-visible 377, assemblable 4, verified 407 (요구 항목 기준 missing 170은 별도) |
| 웹 카탈로그 노출 true | 673 | 856 |
| Studio 선택지 true | 1,323 | 870 |
| REST·MCP true | 1,323 | 876 |
| 비교표 §2.1 | 12행 모두 고정 `match` | 12행 모두 실측 비교로 `match` (기준선 파일이 아니라 레지스트리 개수와 REQUEST.md 표를 비교) |
| 조합 가능 수 | 종류마다 같은 119,610 | `summary.combinations`에 1회(플랫폼 119,610 / 시도 120,420, 검증된 조립 5,793, 고유 출력 5,787). 재료 집계와 분리 |

**판정이 바뀐 재료 수**: 공통 id 1,321건 중 상태가 바뀐 것 559건(42.3%). 이동 내역은 assemblable→verified 72, assemblable→defined 5, assemblable→catalog-visible 2, verified→catalog-visible 373(주로 색 토큰 257과 아이콘 87: 웹에는 있으나 Studio 선택지가 없다), verified→renderable 85(웹 노출 없음: 차트 프리셋 29, 타이포 프리셋 18 등), verified→defined 14, verified→assemblable 4, renderable→catalog-visible 2, renderable→defined 2. 카탈로그 노출 판정이 바뀐 것 1,005건, Studio 판정 451건, REST·MCP 판정 445건. 요구 항목에서는 missing 228→170.

### 4.5 샘플 상태 판정 대조 (재료 유형 27종 × 2개 = 54개)

각 유형에서 첫 번째와 가운데 재료를 골라 이전 판정과 이번 판정을 나란히 놓고, 이번 판정이 어느 코드에서 나왔는지 적었다. 54개 중 42개에서 상태·카탈로그·Studio·REST·MCP 중 하나 이상이 바뀌었다. "카탈로그"는 웹 카탈로그 라우트 렌더 여부, "Studio"는 Studio가 선택지를 제공하는지, "REST·MCP"는 `getMaterial`/`getPlatformMaterial`이 돌려주고 REST·MCP 도구가 있는지다.

| 재료 | 상태 이전 → 이후 | 카탈로그 | Studio | REST·MCP | 판정 | 코드 근거 |
|---|---|:---:|:---:|:---:|:---:|---|
| `axis:backdrop` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/foundations/[axis]와 Studio DesignPanel 축 선택이 렌더한다. 이전은 접두사 목록에 axis가 없어 노출 false |
| `axis:motion` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/foundations/[axis]와 Studio DesignPanel 축 선택이 렌더한다. 이전은 접두사 목록에 axis가 없어 노출 false |
| `axis-value:backdrop.gradient` | assemblable → **verified** | X→O | O→O | O→O | 변경 | 값은 /materials/foundations/[axis]에 보이고 조립 결과 Blueprint가 실제로 고른 값이다 |
| `axis-value:radius.square` | assemblable → **verified** | X→O | O→O | O→O | 변경 | 값은 /materials/foundations/[axis]에 보이고 조립 결과 Blueprint가 실제로 고른 값이다 |
| `background:aurora-glow-geometric` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=background가 렌더하고 Studio swap 선택지에 있다. assembleDesign 품질 검사 통과 |
| `background:brand-tint-dots` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=background가 렌더하고 Studio swap 선택지에 있다. assembleDesign 품질 검사 통과 |
| `base-component:button-control` | verified → **verified** | O→O | O→O | O→O | 동일 | id로는 웹에 없고 같은 구현의 계약 `component:*-control`이 /components/[id]에 노출된다(`catalogVia`). Studio는 구형 편집기 부품 삽입으로 닿는다 |
| `base-component:modal-dialog` | verified → **verified** | O→O | O→O | O→O | 동일 | id로는 웹에 없고 같은 구현의 계약 `component:*-control`이 /components/[id]에 노출된다(`catalogVia`). Studio는 구형 편집기 부품 삽입으로 닿는다 |
| `chart-preset:analytics-cohort-scatter` | verified → **renderable** | O→X | O→X | O→O | 변경 | 어느 웹 라우트도 차트 프리셋을 참조하지 않는다(grep 0건). 이전의 노출·Studio true는 오판 |
| `chart-preset:finance-drawdown-area` | verified → **renderable** | O→X | O→X | O→O | 변경 | 어느 웹 라우트도 차트 프리셋을 참조하지 않는다(grep 0건). 이전의 노출·Studio true는 오판 |
| `color-token:component.button.action` | verified → **catalog-visible** | X→O | O→X | O→O | 변경 | /materials/color에는 있으나 Studio 선택지가 없다. 이전의 Studio true는 오판 |
| `color-token:palette.static-kit.chart.2.900` | verified → **catalog-visible** | X→O | O→X | O→O | 변경 | /materials/color에는 있으나 Studio 선택지가 없다. 이전의 Studio true는 오판 |
| `component:actions` | verified → **verified** | X→O | O→O | O→O | 변경 | /components 목록(카탈로그 2.6.0)이 렌더한다. 이전은 `component:*` 노출을 접두사로 추정해 false |
| `component:menu` | verified → **verified** | X→O | O→O | O→O | 변경 | /components 목록(카탈로그 2.6.0)이 렌더한다. 이전은 `component:*` 노출을 접두사로 추정해 false |
| `family:bold` | verified → **verified** | O→O | O→O | O→O | 동일 | 상세 화면 VISUALS 칩과 Studio swap에 있다 |
| `family:quiet` | verified → **verified** | O→O | O→O | O→O | 동일 | 상세 화면 VISUALS 칩과 Studio swap에 있다 |
| `icon:alert-circle` | verified → **catalog-visible** | X→O | O→X | O→O | 변경 | /materials/foundations이 렌더한다(이전 false). Studio 선택지는 없다(이전 true는 오판) |
| `icon:info` | verified → **catalog-visible** | X→O | O→X | O→O | 변경 | /materials/foundations이 렌더한다(이전 false). Studio 선택지는 없다(이전 true는 오판) |
| `layout-primitive:bento` | verified → **catalog-visible** | X→O | O→X | O→O | 변경 | /materials/foundations이 렌더한다(이전 false). Studio 선택지는 없다(이전 true는 오판) |
| `layout-primitive:flow` | verified → **catalog-visible** | X→O | O→X | O→O | 변경 | /materials/foundations이 렌더한다(이전 false). Studio 선택지는 없다(이전 true는 오판) |
| `media:bold-poster` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=media와 Studio swap에 있다 |
| `media:line-soft-frame` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=media와 Studio swap에 있다 |
| `motion:calm` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=motion과 Studio swap에 있다 |
| `motion:snappy` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=motion과 Studio swap에 있다 |
| `page-type:article` | verified → **renderable** | X→X | O→X | O→O | 변경 | 어느 웹 라우트도 렌더하지 않는다. Studio true였던 이전 판정은 오판 |
| `page-type:error` | verified → **renderable** | X→X | O→X | O→O | 변경 | 어느 웹 라우트도 렌더하지 않는다. Studio true였던 이전 판정은 오판 |
| `palette:antique-rose` | metadata-only → **metadata-only** | O→X | O→O | O→X | 변경 | 427개 Coolors 레거시는 웹 카탈로그 비노출(이전 true는 오판), getMaterial이 거부해 REST·MCP 불가(이전 true는 오판), Studio 목록에는 있다(이전 판정은 id 접두사 오류로 이 분기를 타지 못함) |
| `palette:minty-mermaid-magic` | metadata-only → **metadata-only** | O→X | O→O | O→X | 변경 | 427개 Coolors 레거시는 웹 카탈로그 비노출(이전 true는 오판), getMaterial이 거부해 REST·MCP 불가(이전 true는 오판), Studio 목록에는 있다(이전 판정은 id 접두사 오류로 이 분기를 타지 못함) |
| `pattern:admin-settings` | verified → **renderable** | X→X | O→X | O→X | 변경 | 웹 비노출. getMaterial이 거부해 REST·MCP 불가 |
| `pattern:docs-reference` | verified → **renderable** | X→X | O→X | O→X | 변경 | 웹 비노출. getMaterial이 거부해 REST·MCP 불가 |
| `profile:commerce` | verified → **renderable** | X→X | O→X | O→X | 변경 | 웹 비노출. getMaterial이 거부해 REST·MCP 불가 |
| `profile:erp` | verified → **renderable** | X→X | O→X | O→X | 변경 | 웹 비노출. getMaterial이 거부해 REST·MCP 불가 |
| `purpose:button.destructive` | verified → **catalog-visible** | O→O | O→X | O→O | 변경 | /components에 모두 있고 Studio 조립 화면으로 넘어가는 경로는 카드 계열뿐(이전은 전부 Studio true) |
| `purpose:feedback.error` | verified → **catalog-visible** | O→O | O→X | O→O | 변경 | /components에 모두 있고 Studio 조립 화면으로 넘어가는 경로는 카드 계열뿐(이전은 전부 Studio true) |
| `recipe:content-page` | verified → **defined** | X→X | O→X | O→O | 변경 | 단독으로 렌더하는 서비스 진입점이 없어 프로브가 없다(이전 verified는 근거 없는 테스트 참조) |
| `recipe:ops-dashboard` | verified → **defined** | X→X | O→X | O→O | 변경 | 단독으로 렌더하는 서비스 진입점이 없어 프로브가 없다(이전 verified는 근거 없는 테스트 참조) |
| `state-pattern:empty-illustrated` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=state-pattern과 Studio spat 선택지에 있다 |
| `state-pattern:loading-skeleton` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=state-pattern과 Studio spat 선택지에 있다 |
| `style-context:academic` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles에 있고 Studio 방향 단계 또는 "Studio에서 쓰기"로 선택된다 |
| `style-context:kids` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles에 있고 Studio 방향 단계 또는 "Studio에서 쓰기"로 선택된다 |
| `subtoken-set:commerce-vivid` | verified → **verified** | O→O | O→O | O→O | 동일 | /materials/palettes/[paletteId]에 있고 Studio swap에 있다 |
| `subtoken-set:high-contrast` | verified → **verified** | O→O | O→O | O→O | 동일 | /materials/palettes/[paletteId]에 있고 Studio swap에 있다 |
| `surface:glow-glass` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=surface와 Studio swap에 있다 |
| `surface:hard-offset` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/styles?kind=surface와 Studio swap에 있다 |
| `template:about-team` | verified → **verified** | O→O | O→O | O→O | 동일 | /explore가 렌더하고 Studio 시작 화면이 고르게 한다 |
| `template:job-detail` | verified → **verified** | O→O | O→O | O→O | 동일 | /explore가 렌더하고 Studio 시작 화면이 고르게 한다 |
| `theme:academic` | verified → **verified** | O→O | O→O | O→O | 동일 | /explore와 Studio DesignPanel이 쓴다 |
| `theme:kids` | verified → **verified** | O→O | O→O | O→O | 동일 | /explore와 Studio DesignPanel이 쓴다 |
| `type-preset:bookish` | verified → **renderable** | X→X | O→O | O→O | 변경 | 어느 카탈로그 페이지도 렌더하지 않는다. Studio 축 선택지로만 쓰인다 |
| `type-preset:newsroom` | verified → **renderable** | X→X | O→O | O→O | 변경 | 어느 카탈로그 페이지도 렌더하지 않는다. Studio 축 선택지로만 쓰인다 |
| `type-role-preset:dashboard` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/typography이 렌더하고 Studio가 고른다 |
| `type-role-preset:erp` | verified → **verified** | X→O | O→O | O→O | 변경 | /materials/typography이 렌더하고 Studio가 고른다 |
| `type-system:doc-essay` | verified → **verified** | O→O | O→O | O→O | 동일 | /materials/typography의 TypeCompare와 Studio swap에 있다 |
| `type-system:mobile-feed` | verified → **verified** | O→O | O→O | O→O | 동일 | /materials/typography의 TypeCompare와 Studio swap에 있다 |

### 4.6 §6.2 인벤토리와 지시서 A~O 목록 대조 (완료 기준 3)

- 이전 생성기는 항목을 코드에 손으로 옮겨 적었다. 이번에는 REQUEST.md §6.2에서 A~O 소절의 불릿을 읽는다. 항목 수는 A 12, B 14, C 15, D 8, E 14, F 22, G 20, H 9, I 16, J 15, K 12, L 14, M 15, N 11, O 10으로 합계 **207**이다(요구 등록 207과 일치).
- 이전 손 입력본 207개와 비교한 결과, 누락과 추가는 없고 **이름이 다른 항목이 1건**이었다. O-02는 지시서 이름이 `Bottom Navigation`인데 `Mobile Bottom Navigation`으로 적혀 있었다. 지금은 지시서 이름 그대로다.
- 이름이 같은 항목은 4쌍(`Bottom Navigation` E·O, `Master-detail` §6.2 G와 §9.2, `Bento` §6.2 L과 §9.2, `Brutalist` §5.2와 §7). 처리 방식은 CONTRACTS §6.2에 명시했다. 요구 항목은 절과 순번으로 구분하는 별개 항목이고(id가 다르다), 같은 재료가 둘을 충족하면 재료 기록은 하나이며 `requirementIds`가 둘을 모두 가진다. 항목 수는 207(고유 이름 206)이며 `summary.requirements.duplicateNames`에 계산되어 나온다.
- 이전의 같은 id 레코드 중복 2건(`purpose:form.search`, `purpose:navigation.bottom`)은 이 방식으로 해소했다.

### 4.7 CONTRACTS·TASK-LEDGER·MASTER-PLAN·DECISIONS·BLOCKERS 정정 (완료 기준 4)

- **모호한 조항**: ID 형식의 `<kind>`가 네임스페이스와 같지 않은 경우(`purpose` / `purpose-family`), `contexts` 값(조립 목적 id로 오독 가능), `quality.evidence`의 형식(문자열 하나 / 배열), 캐시 키 정규화(`sortObj, trim`이 무엇인지), 미리보기 저장 위치, 소유자 없는 파일의 처리, 같은 이름 요구 항목의 처리.
- **고정 출력 해시 정책과의 충돌**: `site/`가 추적되는 생성물이고 `src/` 변경이 `site/src/`를 바꾼다는 점이 정책에 없었다(`check-generated`가 강제). 미리보기를 `site/previews/*.svg`에 쓰는 조항은 `check-generated`(파일 집합 일치)와 충돌한다. 인덱스 스키마의 `generatedAt`(시각)은 바이트 재현성(§1.1.1)과 충돌한다.
- **존재하지 않는 참조**: CONTRACTS의 `surface:elevated-card`, `motion:gentle`, `chart-preset:kpi-bar-mini`, `subtoken-set:brand-tinted`, `compilerVersion`, `apps/web/components/**`. TASK-LEDGER의 `tests/platform-service.test.mjs`, `tests/platform-color.test.mjs`, `tests/platform-color-subtoken.test.mjs`, `tests/platform-family.test.mjs`, `tests/platform-pipeline.test.mjs`, `src/service/propose-subtoken-sets.mjs`, `scripts/sync-static.mjs`(실제 위치는 `apps/web/scripts/`), `src/platform/families/{input,modal}.mjs`, `apps/web/features/studio/StudioWorkbench.tsx`, `playwright.config.ts`(실제는 `.mjs`), 그리고 이미 `scripts/materials/coverage.mjs` 보고서 검사로 쓰이는 `tests/material-coverage.test.mjs`를 Manifest 검사 테스트로 덮어쓰려던 계획. BLOCKERS의 `Compiler Version`. 장부의 수정·신규 파일을 `modifiedFiles`/`createFiles`로 나눠 모든 파일이 존재 여부와 맞고(수정은 존재, 신규는 부재) 소유 트랙과 일치하거나 `crossTrackFiles`에 허가가 있음을 스크립트로 확인했다.
- **트랙 소유권 충돌**: `src/platform/family.mjs`(CONTRACTS는 D, 장부 TRE-01은 E), `src/materials/chart-presets.mjs`(D의 `src/materials/**`와 E의 차트), `src/layout.mjs`, `src/platform/recommend.mjs`(B 작업이 A 파일 수정), `apps/web/app/api/**`(어느 트랙도 소유 안 함), Track A 작업이 F 소유 웹 파일 수정. 소유권 표를 고치고 교차 트랙 허가 규칙(§6.1)을 추가했다.
- **수치·문구 오류**: 인벤토리 220→207, 타이포 역할 16→27, 완료 판정 34개 목록(32→34), 장부 TRA-03의 근거 없는 "100KB", TRE-02의 "차트 29개 프리셋"(기준은 29유형), TRB-03의 "Chart" 계층(REQUEST는 Data Visualization), TRF-03의 경로(`/color` 등을 `/materials/color` 등으로).

### 4.8 실행 증거

**(1) 2회 연속 실행 바이트 일치**
```sh
npm run coverage:materials && shasum docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json   # 2회
```
```text
Materials: 1321, Requirements: 337, Missing requirements: 170
bb6792c360b8d7757d8e38056bcc2784460eda3f  docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
Materials: 1321, Requirements: 337, Missing requirements: 170
bb6792c360b8d7757d8e38056bcc2784460eda3f  docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
```

**(2) 저장본과 코드의 일치(`--check`)**
```sh
npm run coverage:materials:check
```
```text
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1321 materials, 337 requirements)
```

**(2b) 17개 필드, 7개 상태, 중복 id 전수 확인** (값의 형식까지 본다)
```text
records 1321, missing fields 0, wrong types 0, invalid statuses 0, duplicate ids 0
```
이 검사로 `states`가 일부 레코드에서 배열이 아니라 `Array.prototype.values` 함수로 읽혀 JSON에서 사라지던 생성기 버그를 잡아 고쳤다(목적·시각 패밀리의 `states`는 배열이다).

**(3) 하드코딩 fallback과 고정 `match` 검색**
```sh
grep -nE '\?\? *[0-9]+|status: *.match.' scripts/generate-material-coverage.mjs
```
```text
(출력 없음, exit 1)
```

**(4) 생성기 보호 장치의 RED-GREEN** (임시로 코드를 망가뜨려 확인하고 원복. 커밋에는 들어 있지 않다)
```text
RED  존재하지 않는 재료 id 매핑 → Error: 요구 매핑이 가리키는 재료가 레지스트리에 없습니다: base-component:no-such-control
RED  변형 값 오기          → Error: A/Link Button: component:button-control.variants.appearance에 "linkk"가 없습니다.
RED  저장본 변조 후 --check → MANIFEST DRIFT: ... (exit=1)
GREEN 원복 후 --check       → MANIFEST MATCH ... (exit=0)
```

**(5) 요약 수치**
```sh
jq -c '.summary.requirements|{total,fulfilled,missing,byCoverage}' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
```
```text
{"total":337,"fulfilled":167,"missing":170,"byCoverage":{"direct":124,"variant":34,"schema":7,"part-of":2,"missing":170}}
```

**(6) 전체 검증** (`apps/web` 의존성 패키지는 §4.3의 한계대로 주 작업 폴더 설치본을 심볼릭 링크로 사용)
```sh
npm run verify
```
```text
ℹ tests 794
ℹ pass 794
ℹ fail 0
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.
exit=0
```

---

## 5. P0-PERF 성능 기준선 독립 검증 (커밋 `343c1a795` 대상, 2026-11-28)

원작업은 다른 공급자가 했다. 아래는 별도 맥락에서 코드와 실행으로 다시 확인한 결과다. 측정은 모두 실험실 값이고, `local-prod`는 Vercel 운영 실측이 아니다.

### 5.1 계측 노출 (`/api/dev/perf-counters`)
- `DSK_PERF_METRICS`를 지정하지 않은 `next start`: GET·POST 모두 `HTTP/1.1 404 Not Found`. 코드는 `route.ts`와 `counter.server.ts`가 각각 `=== '1'`을 확인하고, 꺼져 있으면 `recordCompile`이 즉시 반환한다. 동작 변경 없음.
- `DSK_PERF_METRICS=1`: `{"enabled":true,"counters":{...}}` 200.
- Vercel 운영(`dpl_2Qiqt5cLnX1nsRav2CNopf44kr8e`): GET·POST 모두 404.

### 5.2 계측 범위
- 세는 곳: `platform.server`(`assembleDesign`, `assembleComponents`; `component-view.server`·`probeDesign`·페이지·`/platform/render`가 모두 이 두 함수를 거친다), `explore/designs.server`(`renderDesign`), `components/spec.server`(`compileHtml` = `componentView`·`renderComponent`).
- 빠져 있던 곳: `explore/qa/combos.server`의 `renderCombo` → 호출 한 줄 추가.
- 세지 않는 곳(의도): REST·MCP 공개 API(`lib/api`), 브라우저 안의 Studio 컴파일. 라우트 단위로 세면 405·검증 실패까지 세어져 부정확하다.
- 세는 단위는 서비스 호출 1회이며 Blueprint 컴파일 수와 같지 않다.
- Explore `compileCount` 8(390px)의 출처: 서버 렌더의 확인용 `assembleDesign` 6회(`PLATFORM_CASES` 6개, `explore/page.tsx:121`) + 보이는 사례 iframe 2개의 `/platform/render` 2회. 1280px은 6 + 6 = 12. 원본 기준선이 읽은 값이 맞았지만 설명이 없었다.

### 5.3 재측정 대조 (로컬 운영 빌드, 중앙값 3회)
| 항목 | 원 기준선 (390 / 1280) | 재측정 (390 / 1280) | 판정 |
|---|---|---|---|
| Explore DOM | 504 / 512 | 504 / 512 | 일치 |
| Explore iframe(초기) | 2 / 6 | 2 / 6 | 일치 |
| Explore LCP(ms) | 56 / 60 | 48 / 56 | 같은 자릿수 |
| Explore 전송량 | 1.25MB / 1.61MB | 초기 로드 0.24 / 0.38MB, 전체 누적 1.72 / 1.83MB | 원 값은 클릭·스크롤 누적이었다(전체 누적과 같은 자릿수) |
| Explore 스크롤 후 iframe | 미측정 | 동시 최대 5 / 12, 왕복 iframe 로드 64 / 56 | 신규 |
| Color DOM / LCP | 2,689 / 2,690 · 40 / 44 | 2,689 / 2,690 · 40 / 40 | 일치 |
| Components DOM / iframe | 674 / 681 · 2 / 6 | 674 / 681 · 2 / 6 | 일치 |
| Components LCP | 32 / 36 | 32 / 36 | 일치 |

### 5.4 발견 결함과 조치
1. 페이지 항목에 `viewport`가 없었다 → `viewport{id,label,width,height,isMobile}` 추가. 확인: `jq '[.environments[].pages[]|select(.viewport.width==null)]|length'` → `0`.
2. INP 250ms는 측정 산물이었다(비활성 버튼 클릭 2초 시간 초과를 250으로 보정) → Event Timing 관측값만 기록, 클릭 성공 여부 기록.
3. 컴파일 수·전송량이 클릭·스크롤 누적이었다(Typography 7 = 초기 4 + 클릭 3) → 초기 로드, 상호작용 후, 스윕 후로 분리. 전송량은 압축 후 실제 전송 바이트로 변경.
4. TTFB가 Vercel 동적 페이지를 9~10ms로 보고했다(본문 첫 바이트는 약 400ms) → `serverFirstByteMs` 추가.
5. 콜드/웜 값이 서버를 데운 뒤 측정되면 무의미하다(Vercel 콜드 9ms) → 서버 재기동 직후 첫 요청 기준으로 바꾸고 Vercel은 콜드 측정으로 쓰지 않는다고 명시. 로컬 콜드/웜 본문 첫 바이트 279 / 26ms.
6. `--measureVercel` 없이도 Vercel을 측정했다 → 플래그 필요.
7. 카운터가 `renderCombo`를 세지 않았다 → 추가.
8. 병목 판정 문서의 파일:줄 인용이 계측 삽입으로 밀려 있었다(`platform.server.ts` 45-46 → 52-53 등)와 사실 오류(병목 4·5·6·7, 아래 참조) → `PERF-BOTTLENECKS.md` 재작성.

### 5.5 Vercel 배포 식별
- 현재 운영 별칭 = `dpl_2Qiqt5cLnX1nsRav2CNopf44kr8e`(`vercel inspect design-system-static-kit.vercel.app`). GitHub 커밋 상태(`343c1a795`, 2026-11-28T01:11:59Z)의 배포 URL과 같은 ID라 커밋 `343c1a795`로 확인했다. 응답 헤더만으로는 커밋을 알 수 없다(`server: Vercel`, `x-vercel-id: icn1::iad1::...`).
- 원 기준선의 Vercel 측정(01:05:39Z)은 이보다 앞선 배포(`4f34cacad`, 00:53Z)의 값이었다. 이번에 현재 배포로 다시 쟀고 JSON `environments.vercel.identity`에 기록했다.

### 5.6 병목 판정 정정 요약
- 병목 4: 전부 동적이라는 서술은 틀렸다. Explore 대표 디자인과 구조 부품 render는 SSG(`x-vercel-cache: PRERENDER`).
- 병목 5: `/components`는 정적 프리렌더라 운영 요청 시 `componentView` 비용 없음. `next dev` 첫 요청에서 `compileBlueprint` 38회.
- 병목 6: Typography는 3 + 1 = 4회(문서의 4+4 오류).
- 병목 7: 콜드/웜 208ms를 근거로 든 부분 철회. 구조 판정만 유지.
- 병목 2: 저장소에 없는 "CDP 트레이스" 대신 스크롤 왕복 수치로 대체.

### 5.7 실행 증거
```sh
$ (unset DSK_PERF_METRICS; next start -p 4311) && curl -i /api/dev/perf-counters
HTTP/1.1 404 Not Found
$ npm run verify
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.   (EXIT=0)
$ npm --workspace apps/web run typecheck / test:boundary / test:docs
tsc --noEmit (오류 없음) / pass 9 fail 0 / pass 4 fail 0
```
미실행: `apps/web` Playwright e2e(`test:e2e`)는 이번 변경이 측정 스크립트·계측 호출·문서에 한정되어 실행하지 않았다(CI Web 워크플로가 실행). 테스트 코드는 새로 쓰지 않아 RED/GREEN 대상이 없다. 계측 게이트는 환경 변수 유무로 404/200을 모두 실행해 확인했다.

## 6. TASK-TRA-04 Studio 편집 성능 독립 검증 (커밋 `05cd7c875` 대상, 2026-11-28)

원 구현은 다른 공급자가 했고 보고가 "진행 중"으로 끝나 완료 증거가 불완전했다. 아래는 별도 맥락에서 코드와 실행으로 다시 확인한 결과다. 측정은 모두 실험실 값이다. 판정 상태는 `Implemented`이며 사유는 §6.5다.

### 6.1 REQUEST §3.5 항목별 판정

| 항목 | 원 구현 판정 | 근거와 조치 |
|---|---|---|
| 입력 디바운스 | 동작 | 75ms. 단 원래 코드도 60ms 디바운스가 있었다. 전후 모두 "10회 편집 → 컴파일 1회"라서 원 기록의 "10→1" 은 이 커밋의 이득이 아니다(§6.4). |
| 동일 요청 중복 제거 | 동작하지 않음에 가까움 | 컴파일이 동기라 겹칠 수 없는데 시험은 시험 전용 메서드와 모의 Core만 썼다. 컴파일 함수를 주입할 수 있게 해 느린 비동기 컴파일로 `schedule` 경로를 시험한다. |
| 오래된 응답 무시 | 결함 | `reqId >= latestDispatched` 판정이라 더 새 요청이 대기 중일 때 낡은 응답이 통과했다. 시험은 `executeCustom`(운영에서 쓰지 않는 메서드)만 검사했다. 최신 요청 번호일 때만 전달하고 `cancel()`도 진행 중 응답을 무효화한다. DECISIONS 서술(`reqId < currentRequestId` 폐기)과 코드가 달랐다. |
| 변경 없는 영역 재사용 | 결함(검증 생략) | 후보 시험을 `theme/colorPalette/catalogVersion` 일부로만 메모했고 존재하지 않는 `doc.axes/layout/template`을 키로 썼다. 아래 6.2. |
| 색·타이포 변경 시 후보 탐색 제거 | 결함 | 위와 같음. 판정 묶음별 키로 고쳐 팔레트(색) 변경은 모든 판정을, 타이포 역할 변경은 선택 가능성·색·프로파일 판정을 다시 하지 않는다. |
| 조립·미리보기 결과 공유 | 미구현 | 미리보기와 내보내기는 공유한다. 단 기기 폭이 키에 있어 `device≠default`면 공유되지 않았다. 조립 화면은 서버 컴포넌트라 브라우저 캐시와 공유가 불가능하며, 원 구현의 `cacheCandidates`는 서버에서 도는 죽은 코드이고 검증하지 않은 HTML을 컴파일 키로 저장했다. 제거. |
| 코드 분할 | 동작 | `next build`에서 DesignPanel 등이 별도 청크(`material-choices` 문자열이 한 청크에만 있음). 단 이득은 시작 화면뿐(§6.4). |
| 대형 패널 지연 로딩 | 동작, 회귀 있음 | 디자인 탭 첫 열림 약 120ms가 약 400ms로 늘었다(INP 목표 200ms 초과). 유휴 시 사전 로드를 추가해 115~145ms로 되돌렸다. e2e `studio-ux`의 디자인 시험은 지연 로딩된 패널을 기다리지 않아 실패했다(원 보고는 e2e 13종 통과라 했지만 이 시험은 돌지 않았다). 시험에 대기를 추가했다. |

### 6.2 검증 생략 여부와 캐시 규약

**후보 탐색 재사용**: Core(`importBlueprint` 시험, `applicability.mjs`)로 직접 확인한 의존이다.
- `profile`이 바뀌면 색 후보·타입 후보 판정이 바뀐다(예: `profile=docs`).
- `mode=dark`와 스타일 축(typography 포함)이 바뀌면 프로파일 후보 판정이 바뀐다.
- `colorPalette`를 지우면 타입·프로파일 후보 판정과 선택 가능성 판정이 바뀐다.
- 레거시 `palette`(색 변경)는 모든 판정에, `typeRoles`는 선택 가능성·색·프로파일 판정에 영향이 없다.

원 구현의 메모는 이 의존을 무시해 판정이 낡았다(검증 결과를 보여 주는 선택지 비활성 표시가 틀림). 수정: `EXPLORATION_IGNORED`로 판정 묶음마다 "읽지 않음이 확인된 필드"만 키에서 빼고 나머지가 같을 때만 재사용. 시험 `compiler.unit.mjs`가 3개 템플릿(profile erp 허용) × 모든 팔레트·모드·축 값·타입·프로파일·색 재료 변형에서 "키가 같으면 Core 판정이 같다"를 전수 비교한다(재사용 확인 건수 400건 초과를 단언).

**캐시 키 (CONTRACTS §5.2)**: `SHA256(engineVersion:catalogVersion:materialIds:canonicalRequest:mode:viewport)[:32]`를 시험이 `node:crypto`로 독립 계산해 대조한다. 원 구현은 재료 id가 `theme@catalogVersion`뿐이었고 엔진 버전이 상수 `'2.0.0'`이었으며 브라우저는 비암호학적 해시, Node는 `eval('require')`를 썼다. 편차 하나가 남았다: platform 계약 버전을 공개 진입점에서 얻을 수 없어 엔진 버전이 `compileBlueprint/<service CONTRACT_VERSION>`이었다(DEC-009 결정 3). **A3 에서 해소**: 엔진 버전은 `PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION`이다(DEC-013 3항).

**상한과 제거**: LRU 상한 100, 만료 없음(키에 버전), 예외 결과는 캐시하지 않음. 상한 초과 시 최근 미사용 제거를 시험이 확인한다. 항목은 컴파일 HTML(템플릿당 수십 KB)이라 상한 100은 수 MB 수준이다(바이트 상한은 두지 않음).

### 6.3 내보내기 바이트 동일 (완료 기준 3)
같은 Blueprint 340개(템플릿 85개 × {2.4.0 기본, 2.6.0+재료, 다른 팔레트, 다크})를 `05cd7c875` 이전 `htmlText`(`compileBlueprint` 직접 호출, `c239a0fbc`)와 수정본(캐시 미스, 캐시 히트)으로 내보내 sha256을 비교했다. 340/340 동일, 340개 모두 컴파일 성공. 결과 목록의 sha256 `a71ded11aa11830a6aab1428b0cfbd5e148f08666bc987fa1be24777008e28da`. 원 `05cd7c875` 시점 코드로는 따로 돌리지 않았다(미실행). Core 컴파일 코드와 고정 출력 해시(`npm run verify`의 `check-generated`)는 건드리지 않았다.

### 6.4 재측정 (완료 기준 4)
같은 `scripts/perf/measure.mjs`(연속 편집·지연 측정 추가)로 `c239a0fbc` + 계측 훅 5줄(`window.__studio_api/__studio_compile_count`)과 수정본을 번갈아 두 번씩 쟀다. 각 값은 5회 실행 중앙값, 두 회차 값을 `/`로 적는다. `PERFORMANCE-A2.json`의 `abComparison`에 원본이 있다. 로컬 운영 빌드이며 RUM이 아니다.

| 지표 (모바일 390) | 이전 | 이후 | 판정 |
|---|---:|---:|---|
| 10회 연속 편집(15ms 간격) 컴파일 수 | 1 / 1 | 1 / 1 | 원 기록의 "10→1"은 틀림. 원래 코드도 1회 |
| 같은 팔레트 재적용 추가 컴파일 | 1 / 1 | 0 / 0 | 실제 개선 |
| 시작 화면 JS 전송(B) | 183,828 | 181,352 | -2,476B(-1.3%). 원 값 2,592B는 다른 커밋 기준선과의 비교 |
| 데스크톱 1280 JS(B) | 185,111 | 182,635 | -2,476B |
| 문서를 연 뒤 JS 총량(B)·파일 수 | 614,718 · 14 | 622,904 · 20 | +8,186B, +6개 요청. 지연 로딩 이득은 시작 화면에 한정 |
| 디자인 탭 첫 열림(ms) | 121 / 116 | 117 / 115 | 데스크톱 113 / 112 → 145 / 131. 지연 로딩만이면 358 / 401 (사전 로드로 복구) |
| 편집→미리보기 반영, 컴파일 안 한 팔레트(ms) | 275 / 263 | 214 / 283 | 차이 없음(잡음 범위) |
| 편집→미리보기 반영, 재방문(ms) | 278 / 289 | 280 / 297 | 차이 없음. 컴파일이 약 2.4ms라 지연은 렌더와 iframe 로딩이 지배 |
| 탭 전환 지연(ms) | 330 / 320 | 335 / 206 | 잡음이 큼 |
| INP 근사(ms) | 136 / 104 | 120 / 40 | 잡음이 큼 |

데스크톱 1280의 편집 지연도 같은 결론이다. 이 최적화가 상호작용 지연을 줄였다는 근거는 없고, 이 템플릿에서는 컴파일 CPU가 병목이 아니다.

### 6.5 남은 한계 (그래서 `Verified`가 아니라 `Implemented`)
1. 조립(`/studio/assemble`)과 Studio 사이의 결과 공유는 구조상 불가능하다(서버 컴포넌트 vs 브라우저 모듈). 공유가 필요하면 조립 결과를 직렬화해 Studio로 넘기는 설계가 필요하다.
2. ~~캐시 키 엔진 버전이 §5.2의 platform 계약 버전을 포함하지 않는다~~ — A3 에서 해소(공개 진입점 상수 사용, 계약 버전이 바뀌면 키가 바뀌는 시험 `compiler.unit.mjs`).
3. ~~`window.__studio_api`가 운영 빌드에도 노출된다~~ — A3 에서 해소(`DSK_STUDIO_PROBE=1` 빌드에만 포함, `e2e/studio-probe.spec.mjs`).
4. 코드 분할의 크기 이득은 작다(-1.3%). 유지하되 효과가 크다고 말할 수 없다.

### 6.6 실행 증거
```sh
$ npm --workspace apps/web run test:unit
ℹ tests 73  ℹ pass 73  ℹ fail 0          (compiler.unit.mjs 14건 포함, 이전 65건)
$ npm --workspace apps/web run typecheck / test:boundary / test:docs
tsc --noEmit (오류 없음) / pass 9 fail 0 / pass 4 fail 0
$ (cd apps/web && npx playwright test)   # 전체, Studio 시험 포함
231 passed (13.5m)
$ npm run verify
ℹ tests 794  ℹ pass 794  ℹ fail 0
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.   (EXIT=0)
```
시험 RED 확인: `compiler.ts`에 결함 8개를 하나씩 심어 `compiler.unit.mjs`가 실패하는지 보았다(색 후보가 profile을 무시, 오래된 응답 폐기 제거, 키에서 mode 제거, LRU 제거 정지, 디바운스 제거, 진행 중 공유 제거, `cancel`이 응답을 무효화하지 않음, 프로파일 후보가 mode를 무시). 8개 모두 실패했고 원래 코드로 되돌리면 14건 통과한다. 판정 재사용 시험은 개발 중 `colorPalette`를 `choices`의 무시 목록에 넣었을 때도 실제로 실패해(`colorPalette=(none)`에서 판정이 달라짐) 그 필드를 목록에서 뺐다.
미실행: `05cd7c875` 시점 코드 그대로의 내보내기 sha256(비교 기준은 `c239a0fbc`와 수정본), Vercel 운영 측정.
## 7. TASK-TRE-01 시각 패밀리 12종 독립 검증 (원 커밋 `71d8e5974`, 브랜치 `upgrade/e1-families`)

원 구현(Gemini Flash)을 새 맥락에서 다시 검증했다. 결론: 12종은 선언되어 있었으나 렌더가 쓰지 않는 값과 항상 통과하는 시험이 있어 "구현 완료"로 볼 수 없었다. 결함을 고쳤고 수치로 확인했다.

### 7.1 발견 결함과 조치
| # | 결함(원 구현) | 증거 | 조치 |
|---|---|---|---|
| 1 | `traits`(12개 속성)가 어느 렌더도 읽지 않았다. 시험은 `traits[key] !== undefined`만 봤다 | `grep traits src/` → `visual.mjs` 밖 소비처 0 | `traits`를 유일한 원천으로 삼고 `vars`·`metrics`·`recipe`·`shape`·카드 구조·내비 표현을 거기서 계산(`visual.mjs` `define`). `families.mjs`는 shape·카드·내비를 `visual.mjs`에서 읽는다 |
| 2 | `--pf-control-h`, `--pf-glass-blur`, `--pf-cell-pad`, 포커스 링, 상태 표현이 출력 CSS에서 읽히지 않았다. 컨트롤 높이는 12종 모두 같았다 | 출력 CSS의 `var(--pf-control-h` 0건 | `--kit-control`(컨트롤 크기 계산이 읽는 기존 토큰)·`--kit-inset`·`--kit-bw`를 패밀리 범위에서 덮고, `FAMILY_SCOPE_CSS`가 포커스 링 두께·간격, 라벨 글자 형태, 표 셀 여백, 표면 계층 그림자, 유리 블러를 읽는다. 값이 출력에서 읽히는지 시험(Criterion 2b)이 본다 |
| 3 | 66쌍 시험이 존재하지 않는 `--kit-control`을 비교했고, `--pf-surface`의 색 토큰 이름(`var(--kit-soft)` 대 `var(--kit-surface)`)·테두리 색 이름까지 차이로 세어 사실상 항상 통과했다 | 원 시험 `diffs.length >= 1` | 색 토큰 이름을 지우고(테두리=굵기, 면=투명도, 그림자=오프셋·번짐) 쌍마다 값 12개 이상·묶음 6개 이상 차이를 요구. 구성원 고정 축과 버튼 강조 외형도 비교(Criterion 3) |
| 4 | soft·elevated·tonal·glass가 거의 같았다 | 원 값: elevated×tonal 6종 속성(4묶음), soft×elevated 11종, soft×tonal 13종 | 아래 7.2의 설계 변경 |
| 5 | glass의 면은 반투명(75%)인데 `opaqueSurface: true`로 선언했다. 블러 소비처도 없었다 | `metrics`와 `traits.surface` 불일치 | 불투명 여부를 `traits.surface`에서 계산한다. glass는 본문 위 고정 요소(하단 내비)를 거부한다. 면 알파 78%와 블러 14px를 glass 범위 규칙이 읽는다 |
| 6 | 신규 8종은 54개 스타일 맥락 중 어느 곳에서도 1순위가 못 됐다. 원 작업이 분포 시험의 대상을 `FAMILIES`에서 기존 4종(`BASE_FAMILIES`)으로 줄여 가렸다 | `node` 분포 출력: 4종만 1순위 | `FAMILY_PICKS`에 신규 패밀리 1순위 지정(맥락 성격과 이유 포함). 시험은 4종 5곳 이상을 유지하고 12종 모두 1곳 이상을 요구하도록 강화 |
| 7 | `10개 기반 컴포넌트의 고정 축 조합이 모두 고유`라고 했으나 확인하는 시험이 없었다 | 커밋 메시지 | Criterion 3d 추가 |
| 8 | `docs`의 `quality.evidence`가 가리키는 줄(`:29`, `:73`)은 새 시험과 무관 | | 새 시험 줄로 갱신 |

### 7.2 패밀리별 핵심 차이(§7 12개 속성)
핵심 값(`traits`). 컨트롤은 높이 · 가로 여백(px), 링은 포커스 링 두께/간격(px).

| 패밀리 | 모서리 | 테두리 | 그림자·표면 | 컨트롤 | 아이콘 | 버튼 강조 | 링 | 카드·내비 | 모션 |
|---|---|---|---|---|---|---|---|---|---|
| quiet (Minimal Flat) | 10px | 1px | 없음, 불투명 | 36 · 20 | line 2 | solid·outline·ghost | 3/2 | outline 카드, underline 내비 | 150ms |
| soft (Soft Rounded) | 18px | 0 | lifted, 채운 면 | 40 · 28 | duotone | solid·soft·ghost, 알약 | 3/2 | filled 카드, pill 내비 | 150ms |
| bold (Brutalist) | 0 | 2px | 오프셋 4px, 불투명 | 38 · 20 | line-bold 2.6 | solid·outline, 대문자 | 4/2 | elevated 카드 6px 띠, block 내비 | 260ms, -4px |
| editorial | 4px | 규칙선 1px | 없음, 투명 | 36 · 16 | line-fine 1.5 | solid·outline·link, 대문자 | 2/4 | flat 카드, underline | 0ms |
| outline-precise | 4px(컨트롤 0) | 1px 진한 선 | 없음 | 34 · 16 | line-square 직각 끝 | solid·outline·ghost | 2/1 | outline 카드 2px 기준선, block 내비, 분절 탭 | 150ms |
| corporate-formal | 4px | 1px | soft 그림자 | 40 · 24 | line 2 | solid·outline·link | 3/2 | elevated 카드, underline | 150ms |
| dense-enterprise | 4px | 1px | 없음 | 30 · 12, 표 셀 4px | line-fine | solid·outline·ghost | 2/0 | outline 카드, block 내비, 분절 탭 | 0ms |
| elevated-material | 10px | 0 | 놓인 면 얕게, 뜬 면 깊게 | 38 · 20 | solid 채움 | solid·soft·ghost | 3/2 | elevated 카드, pill 내비 | 150ms |
| tonal-layered | 18px | 0 | 없음, 색조 면 | 44 · 20 | solid 채움 | solid·soft·link | 3/2 | filled 카드 4px 띠, block 내비, 분절 탭 | 0ms |
| glass | 18px | 1px 반투명 | lifted, 면 알파 78% + 블러 14px | 40 · 28, 카드 24px | line-fine | solid·outline·ghost | 3/2 | outline 카드, pill 내비 | 150ms |
| luxury | 0 | 1px | 없음 | 44 · 32, 카드 32px | line-fine 1.5 | solid·outline·ghost, 대문자 자간 .12em, 굵기 500 | 2/4 | outline 카드, underline | 150ms |
| expressive | 28px | 1px 강조색 | lifted | 44 · 28 | duotone | solid·soft·ghost, 알약 | 4/3 | elevated 카드 6px 띠, pill 내비 | 260ms, -4px |
glow 그림자는 쓰지 않았다. 밝은 모드에서 X05가 금지한다(`P_REL_FORBIDS`). 처음 expressive에 썼다가 `platform-color-sets` 시험이 잡아 되돌렸다.

### 7.3 쌍별 비색상 CSS 차이(브라우저 실측)
`node scripts/families/differentiation.mjs --min 12`: 같은 장면(버튼·카드·입력·내비·표·피드백, 7장면)을 12개 패밀리로 `assembleFamilies`에서 렌더하고 Chromium computed style에서 색 속성(color, background-color RGB, border-color, outline-color, 그림자 색)을 뺀 값을 요소 순서로 견줬다. 모서리·테두리·윤곽·그림자·면 투명도·블러·간격·크기·글자 형태·모션·아이콘 선·hover/focus 상태를 센다. 전체 66쌍은 `screens/families/differentiation.md`.
- 가장 가까운 쌍: soft × elevated-material, 다른 속성 종류 17, 다른 묶음 6/10, 다른 칸 753.
- 66쌍 전부 속성 종류 17 이상, 묶음 5 이상(최소 quiet × luxury 5, 속성 19), 다른 칸 428 이상.
- 사용자가 지목한 쌍: soft×elevated 17·6, soft×glass 23·7, elevated×glass 25·8, outline-precise×dense-enterprise 23·6, quiet×tonal 26·9, quiet×editorial 32·9, editorial×tonal 28·8(속성 종류·묶음).
- 수정 전(원 구현, 같은 하네스): elevated×tonal 6종·4묶음, soft×elevated 11종·5묶음, soft×tonal 13종, quiet×corporate 14종.
가장 가까운 12쌍:

| 쌍 | 다른 속성 종류 | 다른 묶음(10) | 다른 칸(요소×속성) | 상태 칸 | 장면별(button/card/card-listing/input/nav/table/feedback) |
|---|---:|---:|---:|---:|---|
| soft × elevated-material | 17 | 6 | 753 | 0 | 56 / 74 / 38 / 210 / 160 / 178 / 37 |
| quiet × luxury | 19 | 5 | 817 | 4 | 73 / 84 / 44 / 227 / 155 / 188 / 50 |
| quiet × elevated-material | 21 | 8 | 428 | 2 | 40 / 40 / 23 / 99 / 138 / 64 / 26 |
| quiet × outline-precise | 21 | 8 | 577 | 4 | 50 / 63 / 36 / 201 / 131 / 60 / 40 |
| soft × expressive | 22 | 7 | 508 | 7 | 31 / 46 / 24 / 131 / 85 / 173 / 25 |
| quiet × corporate-formal | 22 | 6 | 562 | 0 | 50 / 76 / 35 / 197 / 107 / 51 / 46 |
| soft × tonal-layered | 23 | 8 | 478 | 5 | 57 / 78 / 33 / 141 / 128 / 28 / 18 |
| soft × glass | 23 | 7 | 529 | 0 | 40 / 40 / 20 / 106 / 119 / 173 / 31 |
| quiet × glass | 23 | 8 | 616 | 2 | 51 / 77 / 35 / 197 / 156 / 62 / 40 |
| outline-precise × dense-enterprise | 23 | 6 | 681 | 5 | 61 / 84 / 38 / 173 / 134 / 162 / 34 |
| elevated-material × tonal-layered | 23 | 7 | 701 | 5 | 59 / 67 / 34 / 188 / 156 / 176 / 26 |
| dense-enterprise × tonal-layered | 24 | 7 | 678 | 4 | 46 / 68 / 30 / 197 / 126 / 180 / 35 |

`npm test`에는 브라우저 없이 도는 정적 판(Criterion 3: 쌍마다 값 12개 이상, 묶음 6개 이상; 최소 dense×quiet 14값, corporate×quiet 6묶음)이 있다.

### 7.4 스크린샷
`node scripts/families/screenshots.mjs`: 같은 화면(상단 내비, 탭, KPI·프로필 카드, 버튼, 검색·필터 입력, 표, 확인 알림)을 12종으로 1100px 폭에 그렸다. 모든 화면에 같은 색 번짐 배경을 깔아 유리 질감이 보이게 했다.
`docs/dev/catalog-platform-upgrade/screens/families/`의 `quiet.png soft.png bold.png editorial.png outline-precise.png corporate-formal.png dense-enterprise.png elevated-material.png tonal-layered.png glass.png luxury.png expressive.png` 12장과 비교 시트 `overview.png`.
육안 확인: 각진 분절 탭(outline-precise)·소형 컨트롤(dense)·밑줄 입력과 규칙선(editorial)·알약형 채움(soft, tonal)·반투명 카드와 번진 배경(glass)·굵은 선과 오프셋 그림자(bold)가 한눈에 구분된다. quiet·corporate-formal은 가장 비슷해 보이며, 4px 대 10px 모서리, 컨트롤 40 대 36px, 은은한 그림자, 텍스트 링크 단계로 구분된다(속성 22종, 6묶음 차이).

### 7.5 호환성·채널
- 기존 4개 ID 유지: `family:quiet|soft|bold|editorial` 등록, 새 ID 없음(Criterion 1).
- 거부 사유: 호환 판정은 관계 그래프와 `checkPurposeCombination`을 거친다. 하단 내비×glass는 `P_PURPOSE_VISUAL`(면 투명), 고밀도 표×{soft, editorial, luxury, tonal-layered}는 셀 여백 12px로 거부한다(Criterion 4b). `forbids`(위반)와 `avoids`(경고)는 구분된다: `checkCompatibility(elevated-material + editorial-warm)` → `ok: true`, `applied: avoids`, glow×밝은 모드 → `P_REL_FORBIDS`.
- REST·MCP·Blueprint·내보내기: `listPlatformMaterials({kind:'family'})` 12건, `assembleComponents`가 12종 모두 성공하고 CSS가 12가지, `platform-service-channels`(REST·MCP·Core 바이트 일치)가 통과.

### 7.6 기존 시험 변경(완화 아님, 공개)
- `tests/platform-family-purpose.test.mjs` `EXPECTED_REJECTIONS`: 기존 4건 유지, 새 3건 추가(`table.dense × luxury·tonal-layered`, `navigation.bottom × glass`). 사유는 7.1 #5, 셀 여백 12px.
- `tests/platform-service-channels.test.mjs`의 work-dashboard 해시: 원 커밋이 한 번 바꾼 값을 다시 갱신. 차이는 출력 CSS의 패밀리 변수와 범위 규칙뿐이다(`diff`로 후보 선택·계획·결정은 동일 확인).
- `tests/platform-style-family-distribution.test.mjs`: 원 커밋이 줄인 대상을 되돌려 12종 모두 1순위 1곳 이상을 요구.
- `docs/platform/style-contexts.md`: `node tests/platform-style-doc.mjs --write`로 재생성.

### 7.7 RED/GREEN
- `--pf-unused-glow` 변수를 한 패밀리에 넣음 → Criterion 2b 실패(`emitted by familyShapeVars but no output CSS reads them`), 되돌리면 통과.
- corporate-formal의 traits를 quiet 복사본으로 바꿈 → Criterion 3 실패(`only 3 differing values`), 되돌리면 통과.
- expressive에 `glow` 사용 → `platform-color-sets` 시험이 `P_REL_FORBIDS`로 실패, `lifted`로 되돌려 통과.

### 7.8 실행 증거(최신 `origin/main` `4d0f8cdbd` 위로 rebase한 뒤)
```sh
$ npm run verify                        (EXIT=0)
ℹ tests 805 / ℹ pass 805 / ℹ fail 0
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1329 materials, 337 requirements)
$ jq '[.requirements[]|select(.id|startswith("req:fam"))]|{total:length, verified:([.[]|select(.status=="verified")]|length)}' MATERIAL-COVERAGE.json
{"total":12,"verified":12}
$ node scripts/families/differentiation.mjs --min 12
pairs=66 minDistinctProps=17 (soft×elevated-material) minCells=428
```
고정 출력: `site/v1/catalog.json`과 `docs/evidence/context/legacy-hashes.json`은 `origin/main`과 diff가 없다. `check-generated`가 재빌드 바이트 일치를 확인했다.
미실행: `apps/web` Playwright e2e와 `typecheck`(Track F 영역, 이번 변경은 `src/`와 문서·스크립트). Vercel 배포 확인.

## 8. Track B2 서브토큰·계층·매칭 독립 검증 (2026-11-28)

판정: **TRB-02와 TRB-03은 Verified. TRB-04의 서비스 경로는 통과했다. 200개 팔레트가 아직 없어 200×25 평가는 미완료이며, 브랜치를 원격에 올리지 않았다.**

### 8.1 세트 값과 차별화 (완료 기준 1)

- `SUBTOKEN_SETS`의 25개 id가 §4.4 목록과 일치한다. 각 세트는 23개 역할 규칙과 light/dark 램프 단계를 정의한다. 브랜드·강조·중립 가중치 합은 1이다.
- 각 세트에는 권장 맥락과 `forbiddenContexts` 배열도 있다. 금지 맥락이 없는 세트도 빈 배열로 명시한다. 상호작용·컴포넌트·차트 설계는 각각 `states`·`components`·`charts`에 둔다.
- 각 규칙은 등록된 원색 자리의 램프 단계, 고정값 또는 대비 기준을 참조한다. 테스트가 필수 역할 누락, 잘못된 램프 단계, 1이 아닌 가중치 합을 거부한다.
- 현재 코드의 9개 팔레트를 대상으로 성공한 쌍의 light/dark 역할 맵을 직접 바인딩해 비교했다. 중복 맵은 없다. 같은 팔레트에서 성공 세트 간 최소 역할 차이는 4개다.

### 8.2 테스트 단언 교정 (완료 기준 2)

- 기존 매칭 테스트는 실패 팔레트·세트 5쌍을 고정하고 있었다. 계산된 실패 행의 오류 코드와 모드, 관계 그래프 결과를 검사하도록 바꿨다.
- 자동 보정 테스트의 `adjustments.length >= 0` 단언은 항상 참이었다. 보고된 초기값을 실제 램프 단계와 대조한다. 조정값은 초기값과 달라야 하며 바인딩 결과와 같아야 한다.
- 신규 역할·맥락 계약 테스트에 RED-GREEN을 수행했다.

```text
RED  node --test --test-name-pattern='all 25 subtoken sets' tests/platform-color-sets.test.mjs
     fail 1 — forbiddenContexts가 null인 세트를 거부
GREEN 같은 명령
     pass 1, fail 0
```

### 8.3 다섯 계층과 컴포넌트 소비 (완료 기준 3)

- `resolveTokenLayers`에 있던 고정 `#000000`·`chart1` 대체값을 제거했다. 2.6.0 resolver는 primitive 143개와 semantic 22개를 읽는다. state는 9개, component는 33개다. data-viz는 8개다. 값이 없으면 오류를 낸다.
- Component Token 검사는 토큰 이름이 코드에 등장하는지만 보던 방식에서 실제 `var(--kit-…)` 참조를 찾도록 바꿨다. 차트 시리즈는 기존 `coreCSS`와 차트 renderer가 소비한다. 플랫폼 결합 테스트도 각 통과 쌍에서 Card/Button 컴포넌트와 상태·차트 토큰을 실제 조립 결과로 확인한다.
- Track A 소유 파일 `src/platform/contract.mjs`에 선택 `forbiddenContexts` 필드를 허용했다. TRB-03의 `crossTrackFiles`에 파일과 소유자, 수정 사유를 기록했다. 추가로 Track A 소유 `src/platform/index.mjs`, 서비스 경로와 평가 스크립트, Track G 소유 스타일 맥락 문서와 생성 evidence도 CONTRACTS §6.1에 따라 TRB-03/04의 `crossTrackFiles`에 개별 기록했다.

### 8.4 기존 색상 호환성 (완료 기준 4)

- 지정 색 테스트와 기존 버전 고정 해시 검사가 통과했다. 2.6.0 static-kit 색상 그래프·CSS·재료·컴파일 출력의 고정 SHA-256은 변하지 않았다.

### 8.5 서비스와 매트릭스 (완료 기준 5)

- `evaluatePaletteSubtokens`와 `proposeSubtokenSets` 서비스 테스트가 실행돼 25개 세트 평가, context/mode 전달, 후보·차단 이유 반환을 확인했다.
- `node scripts/platform/evaluate-color-matrix.mjs`는 9×25, 총 225쌍을 평가했다. 라이트·다크 조합 450개 중 445개가 통과하고 5개가 차단됐다. 두 번 실행한 JSON의 SHA-256은 `06d0f1926e7215a2b95130855b3445024f1578ae`로 같았다. 결정성을 위해 시간과 실행 시간 필드는 뺐다.
- 현재 팔레트 9개는 모두 B2 부모 `c239a0fbc`에 있었다. 하나는 내부 `static-kit`이고 나머지 8개는 저장소 자체 제작 원색이다. B2는 팔레트 데이터 파일을 추가하지 않았다.
- B1 워크트리의 팔레트 구현은 미커밋 상태다. `origin/main`에도 200개는 아직 없다. 따라서 200×25 실행과 200개 출처 확인은 미완료다.
- 평가 스크립트가 다른 Run의 outbox로 결과를 복사하던 하드코딩도 제거했다. 결과는 저장소의 고정 경로에만 쓴다.

### 8.6 생성 미러와 장부 (완료 기준 6, 7)

- `npm run verify`의 `check-generated`가 `src/`에서 빌드한 3,402개 파일과 `site/`를 바이트 단위로 대조했다.
- `npm run coverage:materials:check`는 `MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1347 materials, 337 requirements)`로 통과했다.
- 최종 fetch에서 `origin/main`은 `039ec61713adb697b086955859424742d2684b4c`였고, `git merge-base --is-ancestor origin/main HEAD`가 통과해 그 위로 rebase됐다. B1의 200개 팔레트 커밋은 없었다. B1 워크트리에서 팔레트 데이터와 장부·생성 스크립트가 미커밋 상태임을 확인해 push는 보류했다. 따라서 완료된 것은 최신 main rebase와 coverage 일치 확인이며, 200×25·출처 확인과 push는 미완료다.

### 8.7 전체 검증 (완료 기준 8)

```sh
npm run verify
```
```text
ℹ tests 814
ℹ pass 814
ℹ fail 0
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.
```

실행한 6개 색상 지정 테스트는 `32 pass, 0 fail`이었다. TRB-02와 TRB-03은 독립 검증을 마쳐 장부에서 Verified로 올렸다. TRB-04는 서비스 경로와 현재 팔레트 매트릭스만 확인해 In Progress로 남겼다.

실행 증거(최신 rebase 후): `node scripts/platform/evaluate-color-matrix.mjs && git diff --exit-code docs/platform/evidence/color/subtoken-matrix-summary.json` → `9 palettes × 25 subtoken sets`, summary 생성, `diff` 무출력·exit 0. `npm run coverage:materials:check` → `MANIFEST MATCH ... (1347 materials, 337 requirements)`. `npm run verify` → 814/814 통과, 3,402 생성 파일 재현.

남은 일: B1이 200개 팔레트를 커밋해 `origin/main`에 반영한 뒤 200×25 매트릭스와 200개 출처를 검증한다. 그때 장부·검증 기록을 갱신하고 verify를 재실행한 다음 일반 push한다. 현재 B1 워크트리 변경은 미커밋이므로 이번 브랜치에서는 TRB-04를 `In Progress`로 유지한다.

## 9. TASK-TRE-02 차트 29유형 독립 검증 (원 커밋 `b18314415`·`e208de4ca`, 브랜치 `upgrade/e2-verify`, 2026-11-28)

원 구현(codex GPT Luna)은 브라우저 검수를 하지 않았다. 새 맥락에서 SVG를 직접 비교하고 Chromium으로 29유형을 렌더했다. 결론: 29유형은 모두 서로 다른 실제 SVG를 낸다(이름만 다른 복제는 없다). 다만 확장 15유형은 축·범례·라벨이 그림에 없어 읽을 수 없었고, 입력 거부에 구멍이 있었다. 고친 뒤 `Verified`로 올린다.

### 9.1 판정
| 완료 기준 | 판정 |
|---|---|
| 1. 유형별 실제 SVG, 이름만 다른 복제 없음 | 통과. 같은 데이터를 선·면적, 도넛·파이, 누적·그룹·100% 막대, 선·다중선·계단선, 면적·누적 면적, 캔들·OHLC, 산점도·버블, 막대·가로 막대, 스파크라인·선, 히트맵·달력 히트맵에 넣어 구조 차이를 시험이 읽는다(`tests/chart-presets-distinct.test.mjs`). |
| 2. Chromium 육안·뷰포트 | 구분은 통과, 가독성은 결함 있었음(9.2). 390px·1280px에서 문서 가로 넘침 0, figure 밖 요소 0, 크기 0 SVG 0. |
| 3. 왜곡 방지·입력 거부가 실제 렌더 경로를 지나는가 | 기존 시험은 `validate… .length > 0 \|\| render…가 문자열이 아님`으로 어느 한쪽만 맞아도 통과했고, 오류 코드를 보지 않았다. 광고한 규칙 중 실제로 막지 않는 것이 있었다(9.2). |
| 4. 접근성 표가 데이터와 일치 | 통과(교정 포함). 불릿의 목표값이 표에 없었다. 29유형 전부 표의 숫자가 데이터와 같은 다중집합임을 시험한다. |
| 5. 기존 고정 출력 해시 | 변화 없음. |

### 9.2 발견 결함과 조치
| # | 결함(원 구현) | 증거 | 조치 |
|---|---|---|---|
| 1 | 확장 15유형(그룹·100% 막대, 다중·계단선, 누적 면적, 파이, 버블, 트리맵, 레이더, 게이지, 불릿, 박스, 조합, 달력 히트맵, 진행)에 값 축·범주 라벨·범례·값 표기가 그림에 없음. 호버 title과 접힌 표에만 값이 있음 | 렌더 스크린샷: 파이에 라벨 없음, 박스 플롯에 이름 없음, 달력 히트맵에 요일·주 없음 | `renderExtendedChart`를 다시 씀. 축 눈금·격자·범주 라벨·범례(HTML `kit-legend`)·파이 비율·트리맵 라벨·레이더 축 이름·게이지 눈금 끝 |
| 2 | 조합 차트의 선이 자기 최댓값으로 정규화되고 보조 축이 없음 | 선 최댓값이 막대 최댓값 높이에 붙어 값 비교가 가능한 것처럼 보임 | 오른쪽 보조 축 눈금과 "(선 · 오른쪽 축)" 범례 |
| 3 | 버블 반지름이 `3 + 1.7√크기`라 면적비가 크기비와 다름 | 크기 10:40의 면적비 ≠ 1:4 | 반지름 `16√(크기/최대)`. 면적이 크기에 비례 |
| 4 | 불릿의 55% 회색 구간은 데이터에 없는 장식 | 코드 상수 `.55` | 제거. 0~100 눈금 추가 |
| 5 | 증거 페이지 CSS가 2.6 확장 규칙을 싣지 않음(기준 차트가 레거시 경로) | 스크롤형 캔들·폭포가 170px로 줄어 보임, 축선·13px 글자 규칙 없음 | 기준 차트에 `grid` 옵션을 줘 `data-chart="2.6"` 경로로 이동 |
| 6 | 검증 구멍 7건: 파이 음수(합 100), 단일 계열 형태(파이·트리맵·게이지·불릿·진행)에서 둘째 계열이 조용히 사라짐, 불릿 음수 실적, 다중·계단선의 축 최솟값·최댓값이 데이터를 자름, 누적 면적의 축 최댓값이 개별 값만 비교(합계가 잘림), 레이더 2축 이하, 선형의 중복 범주 | `renderChartPreset`이 문자열을 돌려줌 | `validateChartPresetData`에 규칙 추가. 스키마의 `ordered-categories`는 실제로 순서를 보지 않아 `unique-categories`로 바꾸고, 실제로 막던 `nonnegative`(누적 막대)·`low-le-open-close-le-high`·`totals-match-running-sum`을 광고 목록에 추가. 서로 다른 광고 규칙 23개 전부에 거부 시험이 있음 |
| 7 | 시험이 약함: 서명 개수만 달라도 "구분됨"으로 통과, 값 반영은 `notEqual`뿐 | 비례 오류가 통과 | 시험 6개 추가(아래) |

### 9.3 추가한 시험(RED/GREEN)
`tests/chart-presets-distinct.test.mjs`에 추가: 같은 데이터 쌍의 구조 차이, 값→길이·면적·각도 비례와 눈금 고정, 접근성 표 숫자 일치, 확장 SVG의 축·범례·라벨, 광고 규칙별 거부(코드 지정), 문자열 이스케이프.
결함을 심어 실패를 확인했다(원 코드로 되돌려 통과도 확인).
```
RED M1 그룹 막대 높이 ×0.9            -> 비례·구조 시험 실패
RED M2 표에 value+1                     -> 접근성 표 시험 실패
RED M3 단일 계열 검사 제거              -> 거부 시험 실패
RED M4 파이 음수 허용                   -> 거부 시험 실패
RED M5 버블 반지름 옛 식                -> 비례 시험 실패
RED M6 계단선을 다중선으로 그림         -> 구조 시험 실패
RED M7 선형 축 잘림 검사 제거           -> 거부 시험 실패
RED M8 파이를 중심 없는 호로 그림       -> 비례·구조 시험 실패
RED M9 값 축 라벨 제거                  -> 축·범례 시험 실패
RED M10 누적 면적 축 검사를 개별 값으로 -> 거부 시험 실패
```
비례만 보는 시험은 균일 축소(M1)를 못 잡아서, 막대 꼭대기가 그 값의 눈금선 높이에 있는지도 단언한다.

### 9.4 스크린샷
`docs/dev/catalog-platform-upgrade/screens/charts/` 29유형 × 1280px, 390px(유형별 대표 하나). 재생성: `PLAYWRIGHT_BROWSERS_PATH=… node scripts/materials/chart-forms-browser.mjs --shots docs/dev/catalog-platform-upgrade/screens/charts`. 같은 스크립트가 유형별 SVG 스크린샷의 해시가 29개 모두 다른지, 뷰포트 넘침이 없는지를 종료 코드로 낸다.

### 9.5 호환성
`site/v1/catalog.json`과 `docs/evidence/context/legacy-hashes.json`은 `c269ad506`과 diff가 없다. `renderChartPreset`의 기본 출력(2.6.0 신규 API)만 바뀌었고 2.4.0·2.5.0 출력 경로는 건드리지 않았다. 확장 형태의 SVG와 `data-*` 속성이 늘었다(`data-grid`·`data-labels`·`data-legend`·`data-density`).

### 9.6 남은 한계
- 확장 형태는 `labels`·`grid`·`legend` 옵션 중 일부만 반영한다(값 라벨은 그룹 막대·선·박스·달력, 격자는 축 있는 형태). 프리셋 예시가 값 라벨을 켜지 않아 기본 화면에는 값 숫자가 눈금으로만 보인다.
- 트리맵은 작은 칸의 라벨을 생략하고 범례로 대신한다. 레이더 SVG는 범례와 한 줄에 놓이면 작게 보인다.
- 네이티브 14유형(막대·선 등)의 렌더러는 이번에 바꾸지 않았다. 면적 차트 라벨이 마커와 겹치는 경우가 있다(스크린샷 `area.png`의 -4.5).
- 다크 모드 렌더와 실기기는 확인하지 않았다.

### 9.7 실행 증거
```sh
$ node --test tests/chart-presets.test.mjs tests/chart-presets-distinct.test.mjs tests/chart-presets-forms.test.mjs tests/platform-chart-presets.test.mjs
ℹ pass 48 / ℹ fail 0
$ node scripts/materials/chart-forms-browser.mjs
390px kinds=29 docOverflow=0 distinctSvgImages=29 spills=[] zeroSized=[]
1280px kinds=29 docOverflow=0 distinctSvgImages=29 spills=[] zeroSized=[]
$ npm run verify                         (EXIT=0)
ℹ tests 824 / ℹ pass 824 / ℹ fail 0
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1362 materials, 337 requirements)
$ git diff c269ad506 -- site/v1 docs/evidence/context/legacy-hashes.json   (diff 없음)
```
미실행: `apps/web` Playwright e2e, 배포 확인, 다크 모드.

## 10. TASK-TRE-03 레이아웃 패턴 24종 (브랜치 `upgrade/e3-layouts`)

### 10.1 구현 범위
- 재료: `layout:*` 24종(`src/platform/data/layouts.mjs`, 플랫폼 계약 0.7.0 → 0.8.0). REQUEST §9.2의 이름·순서와 1:1이다.
- 슬롯 계약: 슬롯마다 필수 여부, 허용 콘텐츠(`group:`·`purpose:`·`layout:`), 항목 수, 선언 순서(= DOM 순서), 흐름(grid·columns·row·bento), 길이 대응(wrap·scroll-x·cap), sticky를 가진다. §9.2의 9개 정의 항목(슬롯, 부모 컨테이너, 최소 콘텐츠 폭, 반응형 변화, 열 수·배치 규칙, 밀도, 콘텐츠 길이, 중첩, 적용 목적)은 모든 레이아웃이 가진다.
- 폭별 재배치: 컨테이너 쿼리 구간 xs 0·sm 560·md 880·lg 1180px마다 트랙과 영역 표를 따로 적는다. 숨기는 슬롯은 허용하지 않는다(등록 검사 `P_LAYOUT_AREAS`).
- 컴파일: `compileLayout`(`src/layout.mjs`)은 계약 위반을 거부한다. 조립: `assembleLayout`(`src/platform/layouts.mjs`)이 칸을 목적 패밀리 렌더로 채우고 관계 그래프(`layout-slot-fit`, `layout-axis`, `forbids`, `avoids`)를 거친다.
- 조회: `listPlatformMaterials({kind:'layout'})`·`getPlatformMaterial`·`recommendMaterials`·`checkCompatibility`와 같은 REST·MCP. 서비스 공개 함수는 더하지 않았다.
- 기존 출력: `src/layout.mjs`는 함수와 export를 더했을 뿐 기존 흐름·벤토 출력은 그대로다(BENTO 표 2개에 `export`만 붙임). `site/v1/catalog.json`과 `docs/evidence/context/legacy-hashes.json`은 `git diff` 변화 없음.

### 10.2 구현 중 시험과 실측이 잡은 결함(수정함)
1. `band.pull`(media-hero의 겹침)을 데이터에 선언만 하고 렌더가 쓰지 않았다: 첫 실측에서 media-hero의 겹침이 0이었다. 구현하고 "선언한 값이 렌더에 쓰인다" 시험이 `margin-top:-` 을 요구한다.
2. 좁은 구간의 `sticky`가 넓은 구간으로 새서(구간 규칙은 앞 구간 위에 쌓인다) 설정 화면의 저장 영역이 본문을 덮었다. 스크린샷에서 발견했다. 구간마다 앞 구간 값을 되돌림 값으로 다시 적고, 규칙을 순서대로 적용해 얻은 `position`·`align-self`를 선언과 견주는 시험과, 브라우저가 계산한 `position`을 폭마다 견주는 실측 시험을 더했다.
3. 행 흐름의 `caps` 크기가 출력에 닿지 않았다(2나 3이나 같음): `row`는 1(세로)과 2(가로)만 허용하도록 줄였다. 처음에는 폭을 1/cap으로 나누려 했으나 버튼 묶음이 슬롯보다 넓어 768px에서 넘쳤다(`overflow-wrap:anywhere`가 최소 폭 계산을 0으로 만든다).
4. 표본 항목 5개에서 `bestCols(5, 2)`는 고아를 피해 1열을 고른다: commerce-grid가 한 열로 보였다. 표본을 6개로 바꿨다(알고리즘은 의도대로).
5. 쌍별 비교에서 equal-grid와 kpi-strip이 폭 1개에서만 달랐다: kpi-strip의 열 상한을 2·3·5·6으로 바꿔 구분했다.
6. 긴 콘텐츠 시험이 숫자·가격·아이콘 이름까지 늘려 부품 내부(한 줄 값)가 넘쳤다. 자유 문장 필드(`PROSE_KEYS`)만 늘리도록 좁혔다. 한 줄 값의 최소 폭은 부품 계약(Track D) 몫이다. 이 한계는 숨기지 않는다.

### 10.3 브라우저 실측(`node scripts/layouts/measure.mjs`, Chromium)
- 24종 × 8개 폭(320·360·480·640·768·1024·1280·1440) × 표본 2종(정상, 긴 문장): 문서 가로 스크롤 최대 0px, 스크롤 영역 밖으로 나간 요소 0개. 주 폭 4개(320·768·1024·1440)의 슬롯·항목 사각형을 `screens/layouts/measurements.json`에 기록했다.
- 폭별 재배치: 열·행 순위와 폭 비율로 만든 서명이라 단순 축소는 같은 서명이다. 24종 모두 인접 주 폭 사이에 슬롯이 자리를 옮기는 구간이 있고 서로 다른 배치가 2개 이상이다(요약 표는 `measurements.md`). media-hero는 sm→md에서 순위가 같고(겹침이 시작) lg에서 바뀐다: 서로 다른 배치 2개로 가장 적다.
- 쌍별 구분: 276쌍 모두 서명이 다른 주 폭이 2개 이상(최소 2). 이름 없는 서명이므로 이름만 다른 같은 배치는 0이다.
- sticky: 320px에서 아래에 붙는 슬롯은 자연 위치가 접힌 선(900px) 아래여도 화면 아래에 붙어 보인다(`pinnedBottom`).
- 스크린샷은 레이아웃마다 한 장이다(핵심 배치 구간에 처음 들어가는 뷰포트: xs 320·sm 768·md 1024·lg 1440). 전수 이미지는 만들지 않았다.
- 증거의 신선도: 시험이 실측 JSON의 `layoutHash`(칸 내용을 자리표시 조각으로 바꿔 컴파일한 레이아웃 출력의 지문)를 현재 값과 비교한다. 레이아웃 코드·재료가 바뀌었는데 실측을 다시 하지 않으면 실패한다. 다른 트랙의 색·부품 변경에는 흔들리지 않는다(처음에는 페이지 전체 해시를 썼다가 B1·B2 병합으로 깨져 이 지문으로 바꿨다).

### 10.4 RED/GREEN
| 코드를 이렇게 망가뜨리면 | 실패한 시험 | 되돌리면 |
|---|---|---|
| sticky 되돌림 값 제거 | `폭 구간 규칙이 앞 구간 위에 쌓여도…` (`layout:settings-layout.actions md: position`) | 통과 |
| `pull` 선언을 렌더에서 무시 | `선언한 값이 렌더에 실제로 쓰인다…` (`layout:media-hero: pull`) | 통과 |
| 슬롯 허용 콘텐츠 검사 제거 | `슬롯 계약이 거부한다…` (`charts는 카드만`) | 통과 |
| 폭 축 계산 관계를 항상 통과 | `관계 그래프…` | 통과 |

### 10.5 기존 시험 변경(공개)
- `tests/platform-pipeline-contract.test.mjs`: 계약 버전 단언 0.8.0.
- `tests/platform-service-channels.test.mjs`: work-dashboard 채널 해시 `a729…` → `0972…`. 아래 §10.7 독립 재현에서 차이는 `manifest.platformContract`만이 아님을 확인했다. CSS의 계약 버전 주석과 그에 종속된 `fingerprint.output`, `manifest.platform.contract`도 바뀐다.

### 10.6 실행 증거
```sh
$ node --test tests/layout-quality.test.mjs
ℹ tests 25 / ℹ pass 25 / ℹ fail 0
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1386 materials, 337 requirements)
$ npm run verify                       (EXIT=0)
ℹ tests 841 / ℹ pass 841 / ℹ fail 0
REPRODUCIBLE: 3404 generated files match a fresh build byte for byte.
```
Manifest 레이아웃 요구: `{"total":24,"missing":0,"direct":24}`. 24종 모두 `renderable`(`blockedBy: not-in-web-catalog`), REST·MCP 조회 가능, 품질 verified(유효한 시험 참조).
미실행: `apps/web` Playwright e2e와 typecheck(Track F 영역, 이번 변경은 `src/`·문서·스크립트). 웹 카탈로그·Studio 노출은 구현하지 않았다(Track F).

### 10.7 독립 검증 재현 (2026-11-28, `upgrade/e3-verify`)
- 기준: 검증 시작 시 `origin/main` `eb4da1408`. §9.2의 이름·순서 24개와 `layout:*` 24개가 일치한다. 컴파일러는 필수·허용 콘텐츠를 `validateFills`에서 거부 규칙으로 적용하고, 슬롯 선언 순서대로 DOM을 만들며, `flow`와 항목 수를 CSS 규칙으로 출력한다. 테스트에서 필수 누락·허용되지 않은 콘텐츠·순서·폭별 flow cap 변경을 확인했다.
- `measurements.json`: 정상·stress 각각 24×8폭이며 48개 표본 전부 현재 `layoutFingerprint`와 일치. 기록된 전체 폭에서 문서/본문 overflow, 이탈 요소, 겹침은 0. 쌍별 최소 거리 2의 `documentation-layout` / `media-hero`는 1024px에서 내비·목차·본문 2열과 미디어→카피→액션 1열, 1440px에서 문서의 3영역 배치와 미디어 히어로의 좌우 분할로 실제 배치가 다르다. 슬롯 이름 차이만으로 거리가 생긴 쌍이 아니다.
- `two-column.png`(768px)와 `split-hero.png`(1024px)를 열어 해당 대표 폭 배치가 기록된 표본과 맞는지 확인했다. 브라우저 재실측은 요청 지시에 따라 미실행이다. 기존 `measurements.json`의 기록을 코드 지문 및 화면 캡처와 대조했다.
- 쌍별 지표 시험은 데이터에서 계산한 서명을 비교하고, 컴파일 출력 변경 시 fingerprint 일치 시험이 실패한다. `src/layout.mjs`의 grid cap을 임시로 고정한 RED 주입에서 3개 시험이 실패했고, 원복 후 `node --test tests/layout-quality.test.mjs` 25/25 통과.
- 기본 work-dashboard 요청을 0.7.0/0.8.0으로 각각 실행해 JSON을 재귀 비교했다. SHA-256은 `a72907b8…` / `0972f0e2…`; 차이 경로는 각 후보의 `fingerprint.output`, `value.css`(CSS 안의 `platform 0.7.0`/`0.8.0` 주석), `value.manifest.platform.contract`, `value.manifest.platformContract`다. 이에 따라 “`manifest.platformContract` 문자열뿐”이라는 구현자 주장은 정정했다.
- **판정(2026-11-28 사용자 확인):** 위 차이는 2.7.0 opt-in 개발 버전의 계약 상승에 따라 생기는 정상 출력이다. 고정 대상(legacy-hashes 2.1.0, 기본 2.4.0, `site/v1`)은 변하지 않았고, 확인된 결함은 구현자의 차이 주장뿐이다. §10.5와 이 절에서 이를 바로잡았으며 별도 코드 수정은 필요하지 않다.
- 고정 출력 해시 및 `site/v1`, `legacy-hashes.json` 비교는 변경 0건; 전체 2.4.0 기본·2.1.0 legacy 검증은 `npm run verify`에서 통과했다.
- 실행 증거: `npm run coverage:materials:check` → `MANIFEST MATCH … (1386 materials, 337 requirements)`; `node --test tests/platform-service-channels.test.mjs` → 12/12 통과; `npm run verify` → 841/841 통과, `REPRODUCIBLE: 3404 generated files match a fresh build byte for byte.`

## 11. TASK-TRA-01~03 미리보기 사전 생성·목록 iframe 제거·캐시 독립 검증 (원 커밋 `90ac06060`, 브랜치 `upgrade/a1-preview`, 2026-11-28)

원 구현(Gemini Flash)은 보고가 진행 중으로 끝났고 push 하지 못했다. 이 절은 다른 맥락에서 코드와 실측으로 다시 확인한 결과다. 원 커밋 위에 수정 커밋 두 개를 쌓아 최신 `origin/main`(`039ec6171`)에 rebase 했다.

### 11.1 판정 요약
- iframe 제거, 컴파일 0회, 정적 미리보기, 캐시 헤더 분리는 **수정 후** 달성됐다. 원 커밋 그대로는 달성되지 않았다(11.2).
- 미해결: Components 목록의 카드 수(92개), 초기 전송량·DOM 노드 수 증가, 청크 소비자 없음(11.5). 그래서 TASK-TRA-02 만 Verified, TRA-01·03 은 Implemented 로 둔다.

### 11.2 발견 결함과 조치
1. **미리보기 SVG 가 `<img>` 로 열리지 않았다.** 생성기가 완성 HTML 문서를 SVG 에 그대로 넣어 XML 오류였다. `xmllint --noout site/previews/explore/about-team.svg` → `StartTag: invalid element name <!doctype html>`, 플랫폼 사례는 `Specification mandates value for attribute data-flow`. `90ac06060` 의 SVG 126개를 `xmllint` 로 검사하면 109개가 오류였다(Explore 85/85, 플랫폼 사례 5/6, 목적 패밀리 19/31, 타이포 0/4). Explore 목록 전체가 깨진 이미지였다. → Core 문서를 XHTML 로 직렬화하는 변환기(`apps/web/lib/api/preview-svg.mjs`)로 교체. 357개 모두 XML 검사 통과, Chromium 과 WebKit 에서 같은 문서의 직접 렌더와 `<img>` 렌더가 같은 화면이다(WebKit 은 바이트 동일).
2. **부품 미리보기가 0개였다**(`site/previews/components/` 비어 있음). 생성기가 `compileBlueprint(doc, {include: ['html', 'css', 'standalone']})` 를 불렀는데 `standalone` 은 이 함수의 허용 이름이 아니라서 48개 전부가 `include는 허용된 이름의 배열이어야 합니다.` 로 거부됐고, 생성기는 실패를 `continue` 로 삼켰다. 게다가 웹 `/components/<type>/render` 와 다른 절차(다른 노드 제거 없음, 2.6.0 승격 없음)를 따로 구현해 있어서 컴파일이 됐더라도 상세 화면과 다른 그림이었다. → 웹과 같은 절차를 한 모듈(`preview-recipes.mjs`)로 옮겨 웹 화면과 생성기가 함께 쓴다. 60개 생성, 예제 없는 4개는 목록 카드가 텍스트 카드다.
3. **Explore 의 테마 변형 디자인은 미리보기 파일이 없었다.** 웹 목록은 256개 디자인(`agency-home~theme_swiss` 등)인데 생성기는 템플릿 기본 85개만 만들었다. → 웹과 같은 `curatedDesignRefs()` 로 256개.
4. **타이포그래피가 다크·샘플·폭 선택을 무시하고 같은 그림을 보였다.** 비교 샘플 본문도 복사본이 달랐다(`DOC_SAMPLE` 축약). → 화면이 자기 요청의 캐시 키를 만들어 사전 생성 목록에 있을 때만 정적 파일을 쓰고, 아니면 선택 시점에 컴파일한다(iframe 아님).
5. **생성기에 하드코딩이 있었다**: `COMPILER_VERSION='2.0.0'`, `CATALOG_VERSION='2.6.0'`, 사례 6건 복사본, 샘플 복사본. 인덱스는 `generatedAt` 을 싣고(CONTRACTS §4 위반) 부품과 목적 패밀리 2종만 담았다(레지스트리는 13종). → 버전은 코드 상수, 사례·샘플·designId 는 웹의 TS 파일을 직접 읽고, 인덱스는 레지스트리 전 종류에서 만들며 `contentHash` 를 싣는다.
6. **캐시 키가 CONTRACTS §5.2 와 달랐다.** 버전 기본값 하드코딩(`2.0.0`, `2.6.0`), 문자열 trim(계약은 trim 금지), 재료 정렬 없음. 시험(`canonicalize ... trims strings`)이 그 오류를 고정하고 있었다. → 규격 그대로 다시 구현하고 시험은 문서의 식을 독립적으로 다시 써서 비교한다. 서비스가 `PLATFORM_CONTRACT_VERSION` 을 읽기 전용으로 내보낸다.
7. **렌더 라우트가 `custom` 이 없으면 모든 요청에 `public, max-age=31536000, immutable` 을 냈다.** `custom` 을 보내는 곳이 없어 Studio 입력과 사용자 콘텐츠까지 공개 CDN 에 1년 캐시될 수 있었고, 엔진이 바뀌어도 같은 주소가 낡은 결과를 냈다. → 렌더 라우트는 `private, no-cache` + ETag/304. 고정 미리보기는 이름이 캐시 키인 정적 파일이라서만 immutable.
8. **서버 캐시에 바이트 상한이 없었다**(항목 1,000개 × 수백 KB). 렌더 주소의 임의 문자열이 버전 조회 메모를 키울 수 있었다. → 개수+바이트(96MB) 상한 LRU, 메모도 상한.
9. **`probeDesign` 이 목록 요청에서 컴파일했다**(Explore 사례 카드마다, Typography 선택마다. 기준선의 초기 컴파일은 Explore 8~12회, Typography 4회). → 사전 생성 때 조립해 본 요청은 결과(가능/거부 사유)를 목록에서 재사용한다. 거부된 조합 카드는 오류 문서를 요청하지 않고 사유를 보인다.
10. `sync-static.mjs` 가 복사 실패를 `catch {}` 로 삼켰다(미리보기가 빠진 채 배포될 수 있다). → 실패하면 멈춘다.
11. **`TASK-LEDGER.json` 이 낡은 기반으로 통째로 덮여 있었다**(v1.1.0 → v1.0.0, 다른 작업의 항목 삭제). → 최신 main 의 장부를 그대로 두고 TRA-01~03 항목만 고쳤다.
12. `PERF-BOTTLENECKS.md` §5 의 수치(전송량 50~83% 절감 등)에 근거가 없었다(11.1). → 실측으로 다시 썼다.
13. iframe 에 의존한 기존 e2e(`shell`, `w6a-shell-studio`, `w6b-scenarios`)는 구조가 바뀐 부분만 이미지 기준으로 다시 세웠다. 근거는 같거나 강해졌다: 카드의 그림이 지금 서버가 Core 로 컴파일한 문서와 바이트까지 같다. 단언을 지우거나 느슨하게 하지 않았다.

### 11.3 완료 기준 판정
| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| 1 | 사전 생성이 Core 출력에서 나옴, 바이트 일치, 대표만 | 충족 | `tests/platform-pregenerate.test.mjs`(서비스 진입점을 직접 호출해 SVG 바이트 비교, 원본 HTML 해시), `apps/web/e2e/previews-parity.spec.mjs`(운영 서버의 렌더 라우트 출력과 비교). 357개 중 Explore 256·부품 60·패밀리 31·사례 6·타이포 4. 타이포는 시스템당 기본 보기 1개만. 손으로 SVG 한 군데를 고치면 시험이 실패한다(RED). |
| 2 | 캐시 키 §5.2, 고정 immutable, 사용자 입력 비공개, 무제한 Map 없음 | 충족 | `tests/platform-cache.test.mjs`(식 독립 재현, 버전 필수, 상한, 모듈 수준 Map 금지). `curl -sI` 고정: `Cache-Control: public, max-age=31536000, immutable`, 사용자 입력: `cache-control: private, no-cache` + `etag`, 같은 입력 재요청 304. |
| 3 | 운영 빌드 실측: iframe 0, 컴파일 0, 스크롤 왕복 재컴파일 0, 초기 카드 24 이하, 숨긴 탭 없음 | **부분** | iframe·컴파일·재요청·숨긴 탭은 충족(`catalog-lists.spec.mjs`, `PERFORMANCE-A1.json`). 카드 수는 Explore(주 목록 24)와 Typography(1)만 충족, **Components 는 92개로 미충족**(11.5). 목록에 `componentView` 상세 변형 컴파일 없음(컴파일 카운터 0). |
| 4 | 기존 URL·기존 브라우저 시험 유지 | 부분 | 루트 `npm run test:browser`: 272 통과·2 실패, 웹 e2e: 아래 11.4. 실패는 이 작업과 무관한 패밀리 변경에서 온 것(11.5). `e2e/catalog.spec.mjs` 는 저장소와 git 이력에 없다(기록의 실패 흔적은 찾지 못함). |
| 5 | 레지스트리 추가 시 인덱스·미리보기 자동 생성 | 충족 | 인덱스는 `PLATFORM_KINDS` 13종과 부품 카탈로그를 읽어 만들고(종류별 수가 레지스트리와 같음을 시험), 미리보기 대상은 레지스트리·카탈로그에서 정한다. 권리 미확인 팔레트는 인덱스에 없다. 하드코딩된 재료 목록 없음. |
| 6 | crossTrackFiles, Verified/Implemented, VERIFICATION 절 | 충족 | `TASK-LEDGER.json` TRA-01~03, 이 절. |
| 7 | `npm run verify` 통과, 최신 main rebase, push | 11.4 | |

### 11.4 실행 증거
```sh
$ npm run verify                       # rebase 뒤, 마지막 커밋 포함
ℹ tests 865 / ℹ pass 865 / ℹ fail 0
REPRODUCIBLE: 3784 generated files match a fresh build byte for byte.
$ npm --workspace apps/web run typecheck / test:boundary / test:docs
tsc --noEmit (오류 없음) / pass 9 fail 0 / pass 4 fail 0
$ npm run perf -- --url http://127.0.0.1:4291 --out docs/dev/catalog-platform-upgrade/PERFORMANCE-A1.json
Explore/Components/Typography: iframe 0, 컴파일 0(초기·스윕 후), 스윕 iframe 로드 0   (PERF-BOTTLENECKS.md §5 표)
$ curl -sI /previews/<키>.svg ; curl -sI '/platform/render?r=…'
Cache-Control: public, max-age=31536000, immutable ; cache-control: private, no-cache + etag
```
- RED/GREEN: ① 미리보기 SVG 한 곳을 손으로 고치면 `tests/platform-pregenerate.test.mjs` 실패, 원복하면 통과. ② SVG 끝에 `<!doctype html>` 을 붙이면 XML 검사 실패. ③ 모듈 수준 `new Map()` 을 넣으면 `platform-cache.test.mjs` 실패. ④ `caseRequest` 의 후보 수를 바꾸면 `platform-preview-parity.test.mjs` 실패. ⑤ `Thumb` 이 항상 iframe 을 쓰게 바꾸고 렌더 라우트를 `public, immutable` 로 바꾸어 빌드하면 `catalog-lists.spec.mjs` 4건과 Cache-Control 시험이 실패하고, 원복해 다시 빌드하면 모두 통과.
- 웹 e2e 전체(`WEB_REUSE=1 npx playwright test`): 238 통과, 4 실패. 4건은 모두 11.5 의 4번(패밀리 12종 이후 `VISUAL_LABEL` 4종): `a11y.spec` 목적 패밀리 상세 390·1280, `w6b-scenarios` 시나리오 B 390·1280. 이 브랜치의 변경과 무관하다. `catalog-lists.spec` 의 "알려진 미충족" 1건은 의도한 실패(`test.fail`)로 통과 처리된다.
- 루트 `npm run test:browser`(`PW_PORT=4292`): 272 통과, 2 실패(`platform-families.spec.mjs:12` 600초 시간 초과, `platform-family-a11y.spec.mjs:140` topbar 토글 36px). 둘 다 이 브랜치 변경과 무관한 패밀리 쪽 실패다(11.5 의 4번).

### 11.5 남은 문제
1. **Components 목록 카드 92개**(REQUEST §3.4 의 24개 원칙 미충족). 기존 시험(w6b 시나리오 B 등)이 `/components` 한 화면에 목적 패밀리 32개 전부를 전제하고, Components 웹 카탈로그 개편은 Track F 의 일이다. `catalog-lists.spec.mjs` 에 "알려진 미충족"으로 남겨(`test.fail`) 고쳐지면 알려 준다. 브라우저의 지연 로딩 덕분에 초기에 불러오는 미리보기는 25개다.
2. **초기 전송량·DOM 노드 증가**(PERF-BOTTLENECKS.md §5.2). 압축되는 서빙에서의 값은 측정하지 못했다(`확인 필요`).
3. **카테고리 청크(`site/catalog-chunks/*.json`) 소비자가 웹에 없다.** 생성과 정합성은 시험하지만 "탭 전환 시 필요한 청크만 로딩"은 아직 아니다. 이 때문에 TRA-03 은 Implemented 다.
4. **이 작업과 무관한 최신 main 의 실패**(원인 위치만 기록, 고치지 않았다):
   - `e2e/platform-family-a11y.spec.mjs:140` topbar 토글 높이 36px < 44px. 깨끗한 `origin/main`(`039ec6171`) 워크트리에서도 같은 값으로 실패했다.
   - `e2e/platform-families.spec.mjs:12` 600초 시간 초과(패밀리 12종 × 모드 × 폭 전수 측정). 같은 조건의 `origin/main` 에서는 실행하지 않았다(`미실행`).
   - `apps/web/e2e/a11y.spec.mjs` 목적 패밀리 상세 2건, `w6b-scenarios` 시나리오 B 2건: 패밀리가 12종이 되었는데 `apps/web/app/components/purpose/[group]/[name]/page.tsx` 의 `VISUAL_LABEL` 이 4종만 있어 새 8종의 칩 라벨이 비고(link-name 위반), 시험은 4종을 기대한다. 이 파일은 이 브랜치가 건드리지 않았다. 최신 main 에서 웹 빌드로 실행해 확인하지는 못했다(워크트리 빌드 불가, 코드 근거).
5. 사전 생성기가 웹의 TS 파일을 Node 의 TS 제거로 읽는다: Node 22.18 이상 필요(`확인 필요`: 그 아래 버전).
6. Vercel 운영 측정은 하지 않았다.

## 12. Track C main 통합 재검증 (2026-11-28)

최신 `origin/main` `af22b580d010fafa67059d1453535b9884b1cfc6`를 C1 통합 브랜치에 일반 merge했다. TASK-LEDGER는 C1 두 건만 Verified로 반영하고 나머지 42개 task 기록은 최신 main과 일치시켰다. TRE-02와 TRE-03은 Verified다. MATERIAL-COVERAGE와 사전 생성 카탈로그·미리보기는 병합 후 생성기로 다시 만들었다.

29ac 기준 첫 전체 검증에서는 예전 사전 생성 인덱스(타이포 14개)와 현재 레지스트리(41개)가 달라 실패했다. 최신 af22 병합 후 `npm run build`로 인덱스·미리보기를 갱신했고, 미리보기 바이트 일치와 레지스트리 수량 시험이 통과했다.

### 12.1 실행 증거 및 호환성

```sh
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1418 materials, 337 requirements)
$ node --test tests/platform-type-systems-diff.test.mjs tests/platform-type-hangul.test.mjs tests/platform-type-evidence.test.mjs tests/platform-service-channels.test.mjs tests/composition.test.mjs tests/typography-refine.test.mjs tests/expression-2-5.test.mjs tests/color-tokens.test.mjs tests/chart-presets.test.mjs
ℹ tests 99 / ℹ pass 99 / ℹ fail 0
$ node --test tests/platform-pregenerate.test.mjs
ℹ tests 8 / ℹ pass 8 / ℹ fail 0
$ npm run verify
ℹ tests 919 / ℹ pass 919 / ℹ fail 0
REPRODUCIBLE: 3800 generated files match a fresh build byte for byte.
$ git diff --exit-code origin/main -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json
(exit 0, no diff)
```

2.1.0 저장 입력 전체의 컴파일 출력 해시는 `legacy-hashes.json`과 일치한다. 2.4.0의 85개 템플릿 및 15개 수기 사례 컴파일 해시는 고정 기준과 일치하고, 새 Blueprint의 기본 버전도 2.4.0이다.

---

## 13. A3 및 A1 잔여 기준 독립 재검증 (2026-11-28, `upgrade/a3-verify`)

검증 대상은 원격 `main`의 A3 커밋 `7f9c24fca6dd295bd672739d85ae25999fe2dde1`와 후속 `7c1bd947cdc11c30b00e938a4f19589c903f9677`, `382b667bea37bd23901ecefb8a96f3484d2e0531`을 포함한다. 최신 upstream을 병합한 검증 HEAD는 `e4c4baad4469d4230f463683ff94fb406cece4a4`이며, 두 후속 main 커밋은 A3 앱 페이지를 바꾸지 않았다. 실제 구성·증거 오류를 다음과 같이 교정했다.

### 13.1 Components 실제 공개 집합과 페이지 동작

`catalog-lists.spec.mjs`를 보강해 화면의 `data-total` 하나만 믿지 않고, 공개 API가 반환한 ID 집합과 모든 페이지를 비교하도록 했다. API에서 목적 패밀리 37개와 구조 부품 65개를 조회하며 `page` 구조 노드 1개는 목록 카드에서 제외한다. 따라서 현재 공개 카드 집합은 101개(과거 A3 문서의 92개/4쪽 주장은 오래된 카운트)다.

병합 HEAD의 일반 운영 빌드 HTTP 응답을 공개 API와 직접 대조했다 (`2026-11-28T06:51:50Z`).

```text
GET /api/v1/platform/materials?kind=purpose-family&limit=200&fields=id,group → 37
GET /api/v1/catalog?kind=components&catalogVersion=2.6.0&limit=200&fields=type,label,group → 65 (page 제외 64)
/components 페이지별 카드/링크 → 24, 24, 24, 24, 5 (HTTP 200)
공개 API의 101개 ID와 페이지 순회 결과: 완전 일치, 누락 0, 중복 0
iframe 0, 숨김 카드 0; q=hero → /components/hero, 상세 경로 HTTP 200
page=2 복원: 25–48번째 ID 동일; group=purpose:card → 공개 카드 8개
모든 목록·검색·분류 요청 뒤 compileBlueprint=0, assembleDesign=0, assembleComponents=0, total=0
```

화면도 승인된 `ttakkari_browser`에서 현재 로컬 빌드로 열었다. `/components`는 “101개 중 1–24번째”, `/components?page=2`는 “101개 중 25–48번째”로 표시됐고, `?q=hero`는 첫 페이지 밖의 Hero를 보여줬다. HTTP 검사는 전체 페이지 집합을 다루고, MCP 브라우저는 화면·URL 일부를 확인한다.

### 13.2 Studio 캐시와 측정 훅

`npm --workspace apps/web run test:unit`은 80/80 통과했다. 앞선 병합 HEAD `a215e840`에서는 `npm run verify` 932/932가 통과했다. 추가 원격 main `382b667be`에는 real-Chromium 패널 테스트가 포함되어 최신 HEAD에서 전체 verify는 940개 중 939개 통과, 1개 실패했다. 실패는 `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser`의 Chromium Mach-port `Permission denied (1100)` / `SIGTRAP`이며, A3 목록/Studio 코드 실패가 아니다. 독립 실행한 audit·docs·build·생성물 검사는 통과했고 3,802개 파일이 fresh build와 바이트 일치했다. (Node v26.9.0; 저장소의 권장 Node 22와 달라진 환경은 별도로 기록한다.) Studio 캐시 단위시험은 `./service` 공개 진입점의 `PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION`을 읽고, 같은 버전은 컴파일 결과를 재사용하며 platform 또는 service 버전만 바꿔도 키가 달라짐을 확인한다. 기존 디바운스와 같은 요청 공유도 함께 통과했다.

병합 HEAD의 일반 `npm run web:build`는 TypeScript 검사와 정적 페이지 1,102개 생성을 통과했고, `apps/web/.next/static` 39개 파일에서 `__studio_api`, `__studio_compile_count`가 모두 0건이었다. `DSK_STUDIO_PROBE=1 npm run web:build` 별도 빌드도 같은 1,102개 정적 페이지를 생성했고, 39개 중 한 청크에서 두 이름을 모두 찾았다. 그러나 브라우저에서 `window` 값을 읽는 `studio-probe.spec.mjs` 런타임 단언은 이번 환경에서 실행하지 못했다.

`npx playwright test e2e/catalog-lists.spec.mjs --reporter=line`은 Codex nested worker sandbox에서 Chromium 실행 단계가 실패했다. 관찰 오류: `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)`, 뒤이어 `SIGTRAP`; 따라서 해당 Playwright 시험의 10건은 모두 브라우저 미기동으로 실패했다. 같은 실패를 우회해 브라우저를 다시 실행하지 않았다. 브라우저 런타임 훅·스크롤 왕복 네트워크 요청은 미검증이며, 위 HTTP·번들 검사는 대체 가능한 부분만 확인한다.

### 13.3 성능 수치와 provenance 정정

`PERFORMANCE-A1.json`의 측정 시각은 `2026-11-28T04:02:13Z`, `PERFORMANCE-A3.json`은 `04:55:48Z`, probe 데이터는 `04:56:57Z`다. 원 성능 기록의 측정 source SHA는 계속 미기록으로 둔다. 이번 HTTP 검증은 별도로 최신 main 병합 HEAD `e4c4baad4469d4230f463683ff94fb406cece4a4`에서 수행했다. 이 파일들은 실행 source SHA를 저장하지 않았다. A1 branch tip `29ac798d6` 커밋은 `04:31:17Z`, A3 `7f9c24fca`는 `05:34:08Z`이므로 측정 시각만으로 해당 커밋의 실행이었다고 귀속할 수 없다. JSON과 `PERF-BOTTLENECKS.md`에 누락 provenance 및 현재 재검증 범위를 추가했다.

과거 A3 파일에 기록된 Components LCP는 390px 140→172ms, 1280px 124→164ms다. iframe·목록 컴파일은 0으로 유지된다는 것과 LCP 증가를 별개로 기록한다. 승인된 `ttakkari_browser`로 최신 Components 화면에서 101개 중 1–24, `page=2`에서 25–48, `q=hero`에서 Hero 결과와 URL을 확인했다. 그러나 Chromium 기반 e2e 및 브라우저 성능 실측은 Codex nested worker sandbox 권한 오류로 재현하지 못했고 LCP 증가 원인도 확정하지 못했다. 따라서 이 LCP 차이는 역사적 기록값이며, A3 변경의 원인·효과로 주장하지 않는다. Vercel/RUM/운영 첫 바이트는 측정하지 않았고, 운영 실측은 H 단계 소유다.

### 13.4 판정 및 실행 증거

원 A3 구현은 `7f9c24fca6dd295bd672739d85ae25999fe2dde1`(작업자 보고 식별자 `03511ff5`)다. 당시 보고된 `verify 909` 출력은 branch/HEAD 로그 귀속이 확인되지 않아 독립 통과 증거로 쓰지 않는다. C1 선행 main의 기준 출력은 919였으며, A3 이후 정확한 커밋에서 재실행한 증거는 아래와 같다: A3 검증 HEAD `a215e840`에서 932/932 통과, 다음 upstream `382b667be` 병합 HEAD `e4c4baad`에서 940개 중 939개 통과와 Chromium 환경 실패 1개.

독립 검증의 네 추가 교정은 커밋 `ef1ade2007369cc95667f3aad0c37e9bdc3cb59f` 및 증거 갱신 `b7956762dcbc1cee40c56d8cf98d610deb800385`에 기록했고 파일 소유권은 §6.1 표를 갱신했다: (1) `catalog-lists.spec.mjs`가 공개 API ID 전체와 쪽 순회 결과를 비교해 누락·중복을 잡도록 보강, (2) Components 공개 수를 92/4쪽에서 101/5쪽으로 고침, (3) A1/A3 성능 기록의 미기록 source SHA 및 LCP 비인과 범위를 JSON에 명시, (4) TRA-01·03을 Verified로 올리지 않고 남은 기준과 검증 근거를 장부·보고서에 기록.

상류 변경 `382b667bea37bd23901ecefb8a96f3484d2e0531`의 추가 `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser` 하나가 Codex nested worker sandbox에서 Chromium launch 권한 오류로 실패했다. 관측 단계는 browser launch, 오류는 `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)` 다음 `SIGTRAP`이다. 같은 환경에서 `npm run verify` 종료 코드는 1 (940개 중 939 pass), 독립 audit/docs/build/generated 재현성은 종료 코드 0이다. Playwright 목록 시험도 같은 환경 제한으로 실행 불가라 재시도·우회하지 않았다.

- `TASK-TRA-01`은 `Implemented` 유지: 현재 A3 Components 카드 상한·정합성은 통과했지만 A1의 Explore DOM 노드 증가(기준선 504→538)는 “DOM 요소 수 대폭 감소” 기준을 충족하지 못하며, 스크롤 왕복 브라우저 실측을 이번에 반복하지 못했다.
- `TASK-TRA-03`은 `Implemented` 유지: 인덱스·목록은 재현되지만 `catalog-chunks`를 화면에서 필요한 청크만 읽는 소비자가 없고 초기 전송량 절감이 확인되지 않았다.
- `TASK-TRA-04`는 `Implemented` 유지: 캐시 버전 키와 운영 번들 격리는 검증됐으나 조립/Studio 결과 공유 제한은 남고, window hook 런타임 검사는 환경상 미실행이다.
- 원 A3 구현의 문서 판정은 수정했다: 카드 수는 92가 아니라 101, 페이지는 4가 아니라 5다. 원 A3 LCP 전후 수치는 source SHA가 없어 재현·인과 귀속이 되지 않는다.

```sh
$ git rev-parse HEAD && git branch -r --contains 7f9c24fca
e4c4baad4469d4230f463683ff94fb406cece4a4
origin/HEAD -> origin/main; origin/main (382b667be 포함)
$ npm --workspace apps/web run test:unit
ℹ tests 80 / ℹ pass 80 / ℹ fail 0
$ npm run verify
ℹ tests 940 / ℹ pass 939 / ℹ fail 1 (real-Chromium panel test; sandbox launch permission error)
VERIFY_EXIT=1
$ node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs
REPRODUCIBLE: 3802 generated files match a fresh build byte for byte. (EXIT=0)
$ npm run web:build
✓ Compiled successfully; TypeScript passed; generated static pages 1102/1102. (EXIT=0)
$ DSK_STUDIO_PROBE=1 npm run web:build
✓ Compiled successfully; TypeScript passed; generated static pages 1102/1102. (EXIT=0)
$ git diff --exit-code c19b79c4b HEAD -- site/v1 docs/evidence/context/legacy-hashes.json
(exit 0, no diff)
```

미실행: `npm run perf`의 Chromium 기반 390/1280 LCP 재측정, Playwright 목록/Studio 브라우저 시험, 브라우저 안의 window hook 값 직접 읽기. 승인된 MCP 브라우저로 페이지 상태 일부는 확인했으나 window 전역과 네트워크 왕복을 계측할 수 없었다. 390/1280 A3 전후표의 140→172ms / 124→164ms는 저장된 과거 기록일 뿐, 원 SHA가 없어 이번에 재현·대조하지 못했다. 사유는 위 Chromium sandbox 실행 오류. Vercel 성능 측정은 H 단계 소유라 수행하지 않았다.

---

## 14. 시각 패밀리 브라우저 E2E 전체 복구 및 검증 (2026-11-28)

시각 패밀리 12종 확장(`039ec6171`) 및 C1 타이포그래피 통합 이후 발생한 브라우저 E2E 실패들을 원인부터 분석·수정하여, 최신 `origin/main` 기반에서 루트 브라우저 E2E(292개) 및 웹 E2E, 패밀리 차별화 하네스를 전수 통과시켰다.

### 14.1 결함 원인 및 수정 내용

1. **시간 초과 및 병렬화 최적화 (`platform-families.spec.mjs:12`)**:
   - 패밀리 12종 확장(624개 측정 조합)으로 인해 직렬 브라우저 측정 시 600초(10분) 시간 초과 발생.
   - `scripts/families/measure.mjs`의 `measureAll`에 작업 슬롯 기반 병렬 워커 풀(`defaultConcurrency`)을 도입하여 원래 측정 순서와 무결성을 보존하면서 전체 실행 시간을 1.6분 내외로 단축.
2. **모바일 소제목 및 캡션/배지/카운트 `SMALL_TEXT` 해결**:
   - C1 트랙에서 40종 타이포그래피 시스템이 머지되면서 27개 스케일에서 `sub: [15, 17]`, `caption: [11, 11]`이 적용됨.
   - `layoutProbe`는 H2/H3 태그를 heading(하한 16px)으로, value/chip/label을 12px 하한으로 엄격하게 검증하여 수백 건의 `SMALL_TEXT` 오류 발생.
   - `src/platform/families/card.mjs`, `feedback.mjs`, `table.mjs`, `form.mjs`, `navigation.mjs`에서 카드/폼/표/피드백 소제목 H2/H3에 `max(16px, var(--kit-t-sub))`를 보장하고, `.pf-chip`, `.pf-rating`, `.pf-badge`, `.pf-count`, `.pf-bottom .kit-ctl-nav-link`에 `max(12px, var(--kit-t-caption))`를 적용하여 어떤 타이포 시스템이 선택되더라도 레이아웃 품질 불변식을 충족하도록 수정.
3. **로딩 버튼 compare 그리드 컬럼 비대칭 (`button.loading`)**:
   - `family:luxury`에서 대기 버튼과 로딩 버튼의 너비가 5.1px 차이나 `대기·로딩 버튼 폭 차` 실패 발생.
   - CSS Grid의 `grid-auto-columns: 1fr`이 기본적으로 `minmax(auto, 1fr)`로 작동하여 버튼 내부 콘텐츠 크기 차이로 트랙이 비대칭이 되던 원인을 확인하고, `grid-auto-columns: minmax(0, 1fr)`로 명시하여 두 버튼 폭이 136px로 완벽히 일치하도록 수정.
4. **닫기 배너 설명문 `BODY_NARROW_COLUMN` 오판정 (`button.close`)**:
   - `button.close`의 `pf-dismissible > p` 배너 알림 문구에 역할이 지정되지 않아 긴 문장이 `body`로 오판정되어 컬럼 너비 오류가 발생함. `<p data-layout-role="desc">`를 명시하여 짧은 설명문 역할을 확립.
5. **차트 프리셋 360px 모바일 `SMALL_TEXT` (`layout-quality.spec.mjs:105`)**:
   - `chart-presets-evidence.mjs`에서 360px 뷰포트 시 body 24px 패딩으로 인해 SVG 렌더 폭이 264px로 줄어들어 13px 글자가 9.5px(< 10px)로 축소되던 문제를 `@media(max-width:640px){body{padding:16px}}`를 적용해 280px 폭(10.1px)을 확보하여 해결.
6. **페이지네이션 레이스 컨디션 (`e2e/combos.spec.mjs:29`)**:
   - 다음 쪽 버튼 클릭 후 비동기 DOM 갱신 대기 없이 바로 페이지 아이디를 읽어 생기던 카운트 불일치를 `#result-line` 쪽수 텍스트 갱신 대기로 해결.
7. **웹 시나리오 목적 패밀리 수 확장 반영 (`apps/web/e2e/w6b-scenarios.spec.mjs`)**:
   - 목적 패밀리가 32종에서 37종으로 확장된 것에 맞춰 `expect(purposes.size).toBe(37)`로 업데이트.

### 14.2 실행 증거

```sh
$ export PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright PW_PORT=4521
$ npx playwright test e2e/platform-families.spec.mjs
14 passed (1.7m)

$ npx playwright test
292 passed (12.6m)

$ cd apps/web && export WEB_PORT=4612
$ npx playwright test e2e/w6b-scenarios.spec.mjs
9 passed (27.6s)

$ node scripts/families/differentiation.mjs --min 12
pairs=66 minDistinctProps=17 (soft×elevated-material) minCells=428 (exit 0)

$ npm run verify
ℹ tests 919 / ℹ pass 919 / ℹ fail 0
REPRODUCIBLE: 3800 generated files match a fresh build byte for byte.
```

### 14.3 독립 판정 (2026-11-28, `upgrade/family-e2e-verify`)

대상 커밋은 `32c4ec61080ea10340bdfd052b2f5a0264a80563`와 그 자식 `a30e156999c4f5e99f8ed420bb083aa601c1769c`다. 전체 시험 diff(`git diff 32c4ec610^ a30e15699 -- e2e apps/web/e2e tests`)는 세 파일뿐이며 `tests/` 변경은 없다.

| 시험 변경 | 판정 |
|---|---|
| `e2e/platform-family-a11y.spec.mjs`: 모바일 topbar 터치 크기 확인을 기본 패밀리 1종에서 등록된 `VISUALS` 전부로 확장 | 단언·44px 기준 유지, 표본 확대. 완화 아님. |
| `e2e/combos.spec.mjs`: 다음 쪽 이동 뒤 결과 줄의 현재 쪽 표시를 기다림 | 기존 전체 ID 집합·개수 단언을 그대로 두고 비동기 갱신 대기만 추가. 완화 아님. |
| `apps/web/e2e/w6b-scenarios.spec.mjs`: 목적 패밀리 수를 32→37로 고정하고 시각 패밀리 4종 고정을 등록 수 비교로 변경 | `37`은 현재 공개 목록 53종과 불일치하는 하드코딩 결함. 시각 패밀리는 12종 하한, 전체 개수 일치 및 행별 이름 단언을 추가해 강화. 37 고정은 §14.4에서 공개 목록 비교로 교정. |

세 파일을 항목별 비교한 결과 기존 단언 삭제 0, 임계값 완화 0, 표본 축소 0이다. 발견한 약화 후보는 목적 패밀리 수 37 하드코딩 하나다. 교정 직전 대상 커밋의 Core 공개 목록은 53종이었고, 이후 최신 main의 J/K 확장까지 합쳐 현재 목록은 65종이다. 테스트는 수량을 고정하지 않고 모든 공개 페이지를 순회한 ID 집합과 cursor 페이지를 끝까지 읽은 Core 공개 ID 집합을 정확히 비교한다.

모바일 타이포 보정은 패밀리 목적 CSS의 소제목만 `max(16px, var(--kit-t-sub))`, 캡션·배지·카운트 등 작은 텍스트만 `max(12px, var(--kit-t-caption))`로 하한을 둔다. 따라서 작은 sub/caption 값은 가독성 하한까지 올라가며, 그보다 큰 서체 값은 유지된다. 이는 일부 작은 타이포 값의 차이를 좁힐 수 있지만 시각 패밀리의 구조·테두리·면·간격·아이콘·모션 등 차별 축을 제거하지 않는다. loading compare는 `minmax(0, 1fr)` 두 열로 바뀌어 내용의 최소 크기가 열 폭을 비대칭으로 밀지 않게 하며, 폭 하한에는 패밀리별 `--kit-inset`을 반영한다.

닫기 배너 문장은 닫을 수 있는 영역의 설명이므로 `data-layout-role="desc"` 의미 표식은 맞다. 다만 이 표식은 자동 `body` 판정의 3줄·28ch `BODY_NARROW_COLUMN` 검사를 `desc`의 조기 줄바꿈·좁은 상자·고아줄 검사로 바꾼다. 즉 설명 역할에 맞는 다른 규칙이 계속 적용되지만 두 역할의 규칙은 동등하지 않으며, 아주 긴 다문장 문구가 좁은 열에 들어가는 런타임 결함까지 정적으로 배제하지는 않는다. §14.4의 브라우저 미실행 범위에 이를 포함한다.

두 커밋 간 불변 경로 대조에서 `docs/evidence/context/legacy-hashes.json`과 `site/v1/catalog.json`은 차이가 없다. 기본 생성 버전 2.4.0 및 2.1.0 저장 입력 출력 해시의 동작은 §14.4에서 전체 비브라우저 시험 결과로 기록한다.

### 14.4 교정 및 독립 실행 결과

- **교정:** `apps/web/e2e/w6b-scenarios.spec.mjs`의 목적 패밀리 37 하드코딩을 제거했다. 테스트는 Core 공개 목록의 `nextCursor`를 끝까지 따라 ID 전체를 수집하고, 웹 Components 목록의 모든 쪽을 순회한 집합과 정확히 비교한다. 빈 Core 목록은 통과하지 않는다. 시각 패밀리는 기존처럼 Core 등록 수와 화면 칸 수를 비교하고 모든 이름을 확인한다.
- **생성 CSS 확인:** `assembleFamilies` 출력에서 12/12 시각 패밀리의 text floor, loading grid, 닫기 배너 역할 표식을 확인했다. 기존 `tech-erp`·`work-console` 출력 각각에서 27 역할 규칙 27개가 모두 생성되어 54개 역할 규칙을 확인했다. 41개 시스템의 27 역할 스케일/변수 검사는 `platform-type-hangul`·`platform-type-systems-diff` 테스트가 맡는다.
- **coverage:**

```text
$ npm run coverage:materials:check
MANIFEST DRIFT: docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json 이 현재 코드와 다릅니다. npm run coverage:materials 로 다시 만드세요.
```

검사기는 저장 Manifest가 현재 계산 결과와 다르다고 보고했다. `MATERIAL-COVERAGE.json`은 이 작업의 허용 쓰기 범위 밖이라 재생성하지 않았다.

- **브라우저:** 사전 점검은 `blocked`를 반환했고 `mach-register` 및 `mach-lookup`이 denied였다. 따라서 이 세션에서는 `npx playwright test`, `platform-families` 또는 `apps/web/e2e/w6b-scenarios.spec.mjs`를 재실행하지 않았다. 승인된 브라우저 E2E 재검증은 미실행이다.
- **`npm run verify`:** 실제 실행 결과는 §14.5에 기록한다. 이 명령의 `npm test` 안 Chromium 의존 시험은 별도 실행 증거로 권한 오류와 구분한다.

### 14.5 실행 영수증 및 남은 확인

worktree `~/development/projects/dsk-up-fame2ev`는 `origin/main`의 `a30e15699`에서 생성했다. 기존 `node_modules` 링크 없이 `npm ci`로 설치했다. 설치 출력은 `added 52 packages`, `found 0 vulnerabilities`였고, 웹 패키지가 요구하는 Node 22.x 대신 Node 26.9.0/npm 11.19.1이라 `EBADENGINE` 경고가 있었다.

Chromium 시험 두 개를 이름 패턴으로 제외한 전체 Node 시험과 `verify`의 후속 단계는 각각 실행했다.

```text
$ node --test --test-skip-pattern='resizable panel: keyboard navigation and min/max constraints work in real Chromium browser|브라우저 실측'
ℹ tests 975
ℹ pass 975
ℹ fail 0
ℹ duration_ms 494411.73475

$ node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs
AUDIT: 427 palettes match rendered Coolors evidence; 89670 used contrast pairs pass.
BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases, test-lab
REPRODUCIBLE: 3819 generated files match a fresh build byte for byte.
```

975개 통과 집계에서는 Chromium 의존 시험 두 개를 제외했으며 제외 시험은 pass로 세지 않았다. 나머지 전체 단위 시험 중 2.1.0 저장 입력 출력 해시와 기본 생성 버전 2.4.0을 확인하는 시험도 통과했다.

```text
$ npm run verify
✖ resizable panel: keyboard navigation and min/max constraints work in real Chromium browser
✖ 4. 브라우저 실측: 390px 및 1280px에서 로딩 성공(양성)과 실패 대체(음성), 다국어 fallback 검증
FATAL: bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)
process exited with signal=SIGTRAP
```

따라서 `npm run verify` 자체는 종료 코드 1이며 `npm test` 단계에서 멈췄다. 실패 두 건은 Chromium Mach-port 권한 오류이고, `audit`, `docs`, `build`, `check-generated` 단계는 위에서 별도 실행해 통과했다. 실제 브라우저 E2E 재실행은 사전 점검에서 차단되어 미실행이다.

불변 기준은 `git diff --exit-code 32c4ec610^ a30e15699 -- docs/evidence/context/legacy-hashes.json site/v1/catalog.json` 종료 코드 0으로 확인했다. 기본 2.4.0 지정과 2.1.0 출력 보존은 위 975개 시험에서 통과했다. `npm run coverage:materials:check`만 저장 Manifest drift로 MATCH가 아니며, 재생성 파일은 허용 쓰기 범위 밖이어서 이번 교정에 포함하지 않았다.

미실행: `npx playwright test`, `npx playwright test e2e/platform-families.spec.mjs`, `apps/web/e2e/w6b-scenarios.spec.mjs` 브라우저 재검증. 사유: browser preflight exit 78 (`mach-register`·`mach-lookup` denied). 별도 범위 A3의 `catalog-lists.spec` 및 운영 빌드 `window.__studio_api` 확인도 이번 작업 범위에서 실행하지 않았다.

### 14.6 최신 main 재확인 및 push 판정 (2026-11-28)

검토 중 `origin/main`이 `e305a7d9d`에서 `5194ed661`로 전진해 해당 커밋을 fast-forward 병합했다. 충돌한 이 문서는 §14 독립 기록과 최신 main의 §15·§16 기록을 모두 보존해 해결했다. 최신 공개 목적 패밀리 목록은 Core API에서 cursor 끝까지 읽어 65개 고유 ID임을 확인했다. 패밀리 CSS 파일은 이 upstream 구간에서 변경되지 않았다.

```text
$ node --check apps/web/e2e/w6b-scenarios.spec.mjs
exit 0
$ node --test tests/platform-family-a11y.test.mjs tests/platform-family-contract.test.mjs tests/platform-family-visual.test.mjs tests/platform-family-inventory.test.mjs
ℹ tests 101 / ℹ pass 101 / ℹ fail 0
$ node --test --test-skip-pattern='resizable panel: keyboard navigation and min/max constraints work in real Chromium browser|Playwright Chromium 실측'
ℹ tests 1005 / ℹ pass 1005 / ℹ fail 0 / ℹ duration_ms 488690.204792
$ npm run coverage:materials:check
MANIFEST DRIFT: docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json 이 현재 코드와 다릅니다.
$ git diff --exit-code 32c4ec610^ HEAD -- docs/evidence/context/legacy-hashes.json site/v1/catalog.json
exit 0 (legacy-hashes 및 site/v1/catalog.json 변경 없음)
```

최신 비브라우저 Node 시험은 1005개가 통과했다. 별도 101개 family/accessibility/visual 시험도 통과했다. 목적 패밀리 37 하드코딩은 공개 목록 전수 비교로 교정했고, 현재 65개에서도 고정 수량 없이 통과한다. `legacy-hashes.json`과 `site/v1/catalog.json` 불변을 두 대상 커밋의 부모부터 최종 작업 HEAD까지 대조했다. 기본 2.4.0 및 2.1.0 저장 출력 해시 시험은 위 전체 비브라우저 시험 집합에서 통과했다.

coverage 검사만 최신 main에서 다시 DRIFT로 바뀌었다. `MATERIAL-COVERAGE.json`은 이번 두 커밋의 수정 파일도 아니고 허용된 작업 쓰기 범위도 아니므로 생성·수정하지 않았다. 앞선 `e305a7d9d` 기준 검사 결과는 MATCH (1472 materials, 406 requirements)였으나, 최신 `5194ed661` 기준의 현재 판정은 DRIFT다.

`npm run verify`는 `a30e15699` 기준으로 실행했으며 `npm test`에서 아래 두 Chromium 시험이 Mach-port 권한 오류로 실패(exit 1)했다. 사전 점검은 exit 78, `mach-register` 및 `mach-lookup` denied였다. 이후 올바른 시험명 패턴으로 Chromium 두 시험을 제외한 전체 비브라우저 시험을 실행해 통과시켰다. 브라우저 E2E·`npm run verify` 재실행은 미실행이며, 이번 환경에서 launch 권한 오류를 관측한 뒤 브라우저를 더 시도하지 않았다. A3의 `catalog-lists.spec` 및 운영 빌드 `window.__studio_api` 확인은 카드의 명시된 범위 밖이라 미실행이다.

```text
$ npm run verify  # a30e15699 기준
✖ resizable panel: keyboard navigation and min/max constraints work in real Chromium browser
✖ 4. 브라우저 실측: 390px 및 1280px에서 로딩 성공(양성)과 실패 대체(음성), 다국어 fallback 검증
FATAL: bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)
process exited with signal=SIGTRAP
```

## 15. C2 / TASK-TRC-03 다국어 웹폰트 독립 검증 (2026-11-28, `upgrade/c2-verify`)

원 커밋 `c53bbe12c`의 웹폰트 자료와 선택형 로딩을 검토했다. 기존 assets는 저장소에 없었고, evidence에는 64-byte mock WOFF2가 성공 응답으로 기록되어 있었다. 기존 “브라우저 실측” 시험은 Playwright Chromium을 실제 실행하려고 했지만 브라우저가 열리지 않아 실측을 수행하지 못했다. 테스트를 `Playwright Chromium 실측`으로 명명하고, 실제 WOFF2 파일·자연 로딩·폰트 상태를 확인하도록 고쳤다. 현 Codex nested worker 실행은 `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)` 뒤 `SIGTRAP`으로 launch 단계에서 종료됐다. 재시도는 하지 않았다.

공식 릴리스 태그와 OFL-1.1 고지문을 각 업스트림 저장소에서 확인하고, 파일 해시를 기록했다. 원본 WOFF2와 함께 각 라이선스 고지 파일을 배포한다. 브라우저 시험에는 CSS face 해시, 역할 CSS 해시 및 WOFF2 해시를 source fingerprint로 기록한다. 저장된 측정은 빌드된 현재 CSS·폰트와의 지문 일치로만 연결된다.

| 서체 | 고정 버전 / 공식 릴리스 | 라이선스 고지 파일 | WOFF2 SHA-256 |
|---|---|---|---|
| Pretendard GOV | 1.3.9 / `v1.3.9` | `PretendardGOV-OFL.txt` | `b097c96ed0bec69724bd07e357e399dde2869846c3b3da839526c8076f4d66b6` |
| Noto Serif KR | 2.001 / `Serif2.001` | `NotoSerifKR-OFL.txt` | `5cb2160fbab99bacfc7aca467e7c2bd9581b475eba0ed86dd30e851b8df85b49` |
| JetBrains Mono | 2.304 / `v2.304` | `JetBrainsMono-OFL.txt` | `d882f8523510ef98b797b882e89b8a84e3fa3cf31a9d4951af3a11e3e1d2a26d` |

```sh
$ node --test --test-name-pattern='모든 WOFF2|모든 공개 WOFF2|선택된 웹폰트 CSS|Materials 서비스|선택적 로딩|Core 입력 결정성|webfonts are optional|2\.6\.0 typeRoles' tests/platform-type-fonts.test.mjs tests/platform-type.test.mjs tests/platform-type-evidence.test.mjs
ℹ tests 9 / ℹ pass 9 / ℹ fail 0
$ node --test --test-name-pattern='2\.1\.0|2\.4\.0|legacy|catalogSnapshot' tests/composition.test.mjs tests/typography-refine.test.mjs tests/expression-2-5.test.mjs tests/service-contract.test.mjs
ℹ tests 11 / ℹ pass 11 / ℹ fail 0
$ shasum -a 256 apps/web/assets/fonts/*.woff2
PretendardGOVVariable.woff2 b097c96e…66b6; NotoSerifKR-Variable.woff2 5cb2160f…5b49; JetBrainsMono-Variable.woff2 d882f852…a26d
$ git diff --exit-code c53bbe12c^ -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json docs/evidence/typography-refine/legacy-2-2-hashes.json docs/evidence/layout-refine/legacy-2-3-hashes.json docs/evidence/variants/legacy-2-3-hashes.json
(exit 0; 고정 산출물 변경 없음)
$ npm run build && node scripts/check-generated.mjs
REPRODUCIBLE: 3819 generated files match a fresh build byte for byte.
$ npm run web:build
✓ TypeScript passed; generated static pages 1102/1102.
```

관련 기능 시험은 결함을 넣었을 때 asset 부재와 역할 CSS 미수출에서 각각 실패(RED)했고, 파일 추가와 실제 역할 CSS 연결 후 통과(GREEN)했다. 기본 `webfonts=0`은 생성 CSS와 페이지 코드에서 웹폰트가 비어 있고, 선택 상태는 해당 페어의 unicode-range 조각만 `@font-face`로 만들며 시스템 스택을 뒤에 둔다. 페이지는 선택된 `webfontRoleCss`를 실제 역할 CSS로 적용한다. 로딩 실패 경로는 `font-display: swap`과 기존 fallback 스택을 유지한다. 미검증 폰트는 `EXCLUDED_OR_UNVERIFIED_FONTS`에 남으며 공개 파일 허용 목록에는 세 개 확인된 서체만 있다.

승인된 Ttakkari browser로 정적 운영 빌드를 확인한 부분 측정: 1280x900 및 390x844에서 기본 문서는 웹폰트 요청 0건, 문서 선택은 Noto Serif KR, 마케팅 선택은 Pretendard GOV를 요청했다. 기록 상태는 `partially-measured`다. JetBrains Mono의 실제 브라우저 요청과 404 로딩 실패 전체 행렬은 미실행이다. 로컬 browser MCP 외 Chromium 재실행은 Codex nested worker sandbox의 관측된 launch 권한 오류 때문에 하지 않았다.

```sh
$ npm run coverage:materials:check MATCH
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1472 materials, 406 requirements)
$ git diff --exit-code site/v1/catalog.json docs/evidence/context/legacy-hashes.json docs/evidence/typography-refine/legacy-2-2-hashes.json docs/evidence/layout-refine/legacy-2-3-hashes.json docs/evidence/variants/legacy-2-3-hashes.json
(exit 0)
$ npm run verify
미실행: 구성에 브라우저 Chromium 시험이 포함되고 같은 환경에서 launch permission denied가 확인되어 재시도하지 않음. 아래에 명시한 구성 시험·생성 검사·빌드만 실행.
```

TASK-TRC-03은 `Implemented`로 유지한다. 브라우저 전체 매트릭스와 `npm run verify`가 아직 통과 증거를 갖지 않아 `Verified`로 올리지 않았다. 공식 태그의 권리 확인, 실제 자산 해시 및 라이선스 동봉, 부분 브라우저 계측은 위와 같이 검증했다.

## 16. D5 §6.2 L 레이아웃 독립 검증 (2026-11-28, `upgrade/d5-verify`)

기준 커밋 `382b667bea37bd23901ecefb8a96f3484d2e0531`을 검토하고, 최신 `origin/main`의 후속 변경을 보존해 `84ae4357a`를 재기반화했다. 구현자가 주장한 14/14 충족은 재료 이름이 아니라 실제 렌더 출력으로 다시 판정했다. Manifest는 렌더 프로브가 통과한 11개만 연결하고 `Stack`, `Container`, `Resizable Panel`은 `missing`으로 남긴다.

| §6.2 L 항목 | Manifest 재료 | 독립 판정 |
|---|---|---|
| Stack | — | missing. `layout-primitive:stack`은 selector 설명만 있고 출력 프로브가 실패한다. |
| Cluster | `layout-primitive:cluster` | catalog-visible, 렌더 출력 프로브 통과 |
| Grid | `component:grid` | verified, 렌더 출력 프로브 통과 |
| Responsive Grid | `layout:equal-grid`, `layout-primitive:flow` | catalog-visible, 두 재료 모두 렌더 프로브 통과 |
| Split | `layout-primitive:split`, `component:split` | verified, 두 재료 모두 렌더 프로브 통과 |
| Bento | `layout-primitive:bento`, `component:bento` | verified, 두 재료 모두 렌더 프로브 통과 |
| Container | — | missing. `layout-primitive:container`는 selector 설명만 있고 출력 프로브가 실패한다. |
| Section | `component:section` | verified, 렌더 출력 프로브 통과 |
| Center | `layout:centered-hero` | renderable, 출력에 중앙 정렬 규칙이 있음 |
| Sidebar Layout | `component:aside` | verified, 렌더 출력 프로브 통과 |
| Master-detail Layout | `component:master-detail` | verified, 렌더 출력 프로브 통과 |
| Sticky Region | `layout:sticky-action-layout` | renderable, 출력에 `position:sticky`와 `bottom:0`이 있음 |
| Scroll Area | `layout:master-detail` | renderable, 출력에 최대 높이와 `overflow:auto`가 있음 |
| Resizable Panel | — | missing. `component:split`과 `layout:two-column`은 정적 분할이라 크기 조절 계약을 충족하지 않는다. |

신규 5개 `component:*` 렌더러는 §6.3~6.4 컴포넌트 계약과 출력이 일치하는지 직접 확인했다. Responsive Grid는 `items`를 반응형 셀로 출력하고, Center·Sticky Region·Scroll Area는 `content`와 `label` fallback을 소비한다. Resizable Panel은 `direction`을 `horizontal|vertical`로 제한하고 유한 숫자 `value`를 15~85로 제한해 두 패널 크기와 `aria-valuenow`에 반영한다. `first/second`와 `left/right` 별칭, label, id도 출력에서 확인했다. 모든 사용자 텍스트는 HTML escape되며, 선언됐지만 읽히지 않는 content 스키마와 props는 제거했다. 런타임은 Resizable Panel이 포함될 때만 결합한다. 중복 id와 잘못된 입력은 Core·REST·MCP 모두 같은 진단을 반환한다.

E3의 네 재사용 레이아웃은 각 이름의 실제 동작으로 검증했다: equal-grid의 grid 흐름과 열 규칙, centered-hero의 중앙 정렬, sticky-action-layout의 하단 고정, master-detail의 제한 높이와 내부 스크롤이 조립 출력에 들어간다. E3 `measurements.json`의 지문 시험도 현재 코드에서 통과했다. 회귀 시험은 안정 표본에 임시 레이아웃 재료를 하나 등록해도 `layoutFingerprint`가 그대로이고, 실제 슬롯/레이아웃 변경은 지문을 바꾸는지 확인한다.

`tests/platform-layout-blueprint.test.mjs`는 14개 Manifest 행을 전수 순회해 모든 covered 재료에 대해 실행된 성공 프로브와 출력 hash를 요구한다. 기존 OR 기대식은 제거했고, 고정 출력 문자열을 재검증 근거로 쓰지 않는다. 직접 렌더러 props, escape, 런타임 포함 조건, 범위 오류, 서비스 채널 입력 일치도 확인했다. 잘못된 값·미사용 props·Manifest 재료·정적 레이아웃 런타임에 결함을 주입한 RED 시험들은 실패했고 수정 후 통과했다. 런타임 간격을 5%에서 10%로 임시 변경했을 때도 `45` 기대값 대신 `40`이 출력되어 1건 실패한 뒤 원복 후 2/2 통과했다.

로컬 Chromium은 Codex nested worker sandbox의 IPC preflight가 `blocked`(Mach register/lookup denied, errno 0)로 끝나 `tests/platform-layout-resizable.test.mjs`는 미실행했다. 설정된 browser MCP에서는 패널 둘과 접근 가능한 separator를 확인하고 방향키 동작을 보냈으나, 그 화면에서 변경된 ARIA 값을 직접 읽었다고 주장하지 않는다. 런타임 스크립트 자체는 Node 이벤트 하네스로 경계 clamp, 두 방향 키, ARIA/flex 갱신, 이벤트 발행, 단일 리스너를 검사했다.

### 16.1 실행 증거와 남은 확인

```sh
$ node --test tests/platform-layout-blueprint.test.mjs tests/platform-service-layout-channels.test.mjs tests/layout-quality.test.mjs tests/platform-family-contract.test.mjs tests/platform-family-inventory.test.mjs tests/platform-layout-runtime.test.mjs
ℹ tests 58 / ℹ pass 58 / ℹ fail 0
$ node --test tests/layout-quality.test.mjs
ℹ tests 26 / ℹ pass 26 / ℹ fail 0
$ node --test tests/platform-layout-runtime.test.mjs
ℹ tests 2 / ℹ pass 2 / ℹ fail 0 (5% step restored after RED)
```

`npm ci`는 이 worktree의 실제 `node_modules`에 설치했다(Node 26.9.0, 저장소 권장 Node 22와 엔진 차이 경고). `npm run coverage:materials:check`와 `npm run coverage:materials`는 전수 생성 중 Codex command 실행에서 각각 종료 코드 143으로 끝났고 출력이 없어 MATCH/DRIFT 판정은 미확인이다. 최신 main의 나머지 Manifest 자료는 보존하고, D5의 세 missing 행과 요구 요약 수치는 직접 갱신했다. 따라서 이 수치 편집은 독립 산술 대조만 통과했으며 생성기 바이트 일치까지 검증한 것은 아니다.

`npm run verify`는 `npm test` 단계에서 종료 코드 1이었다. Resizable Panel 브라우저 시험과 `platform-type-fonts.test.mjs`의 Chromium 시작 로그에서 `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)` 다음 `SIGTRAP`이 관측됐다. 따라서 verify 후속 단계는 자동으로 실행되지 않았다. 같은 revision에서 분리 실행한 `node scripts/audit.mjs`, `node scripts/docs.mjs`, `npm run build`, `node scripts/check-generated.mjs`는 각각 종료 코드 0이며 마지막 출력은 `REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.`다. 브라우저 시험은 IPC 차단으로 미실행이다.

## 17. D5 §6.2 L 3개 미충족 항목 보완 (2026-11-28)

Stack과 Container에 실제 세로 흐름·간격/정렬, 컨테이너 폭 제한 렌더러를 추가했다. Resizable Panel에는 포인터 드래그와 방향키·Home·End 런타임을 연결했다. 전 입력은 허용 값 검사와 HTML escape를 거치며, 핸들 조작은 15~85%에서 제한하고 `aria-valuenow`와 두 패널의 flex 비율을 갱신한다. Resizable Panel 미사용 조립에는 런타임이 들어가지 않는다.

세 컴포넌트는 `assembleComponents({layouts})`에서 Core·REST·MCP에 같은 출력으로 연결했다. JSON 직렬화 후 다시 조립하는 Blueprint 왕복 시험은 Stack·Container·Resizable Panel 세 항목과 결정론적 출력/Manifest 항목을 확인한다. 출력 probe는 각 실제 HTML·CSS를 해시하고 Manifest가 직접 생성됐다.

```sh
$ npm ci
added 52 packages; found 0 vulnerabilities (Node 26.9.0; package engine warning: repository requires Node 22.x)
$ node --test tests/platform-family-contract.test.mjs tests/platform-family-inventory.test.mjs tests/platform-layout-blueprint.test.mjs tests/platform-layout-runtime.test.mjs tests/platform-service-layout-channels.test.mjs tests/layout-quality.test.mjs
ℹ tests 62 / ℹ pass 62 / ℹ fail 0
$ node --test --test-name-pattern='2\.1\.0|2\.4\.0|legacy|catalogSnapshot' tests/composition.test.mjs tests/typography-refine.test.mjs tests/expression-2-5.test.mjs tests/service-contract.test.mjs
ℹ tests 11 / ℹ pass 11 / ℹ fail 0
$ jq '[.requirements[]|select(.section=="§6.2 L" and .coverage=="direct")]|length' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
14
$ jq '[.requirements[]|select(.section=="§6.2 L" and .coverage=="missing")]|length' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
0
$ jq '.materials[]|select(.id=="component:stack" or .id=="component:container" or .id=="component:resizable-panel")|[.id,.evidence.probe.ran,.evidence.probe.ok,.evidence.outputHash]' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
component:container true true c394aa803ef0db71; component:resizable-panel true true 700567984cf40dad; component:stack true true 9b4bd0d1b6e40452
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1479 materials, 406 requirements)
$ npm run build && node scripts/check-generated.mjs
BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases, test-lab
REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.
$ git diff origin/main -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json
(exit 0; 출력 diff 없음)
```

TDD 실행 증거: 포인터 시험을 먼저 쓴 뒤 `node --test tests/platform-layout-runtime.test.mjs`에서 `pass 2 / fail 2`로 포인터 이벤트 미지원 실패를 확인했다. 런타임 구현 후 같은 명령은 `pass 4 / fail 0`이다. 생성 전 Manifest 시험의 3 missing assertion도 재생성 후 통과한다.

Chromium 시험 `tests/platform-layout-resizable.test.mjs`는 미실행이다. Codex command sandbox에서 browser preflight가 `status=blocked`, Mach register 및 launch-services Mach lookup `denied`(errno 0), 종료 코드 78을 반환해 브라우저를 실행하지 않았고 재시도하지 않았다. 브라우저 동작을 대체 확인한 비브라우저 시험은 `tests/platform-layout-runtime.test.mjs`의 포인터·키보드 하네스 4/4다.

TASK-TRD-L은 `Implemented`로 기록했다. 전체 §6.2 L의 생성 Manifest coverage는 direct 14/14이며 각 행 재료에 성공 출력 probe와 hash가 있다.

## 18. TASK-TRE-04 Foundations 재료(§9.3~§9.7 69항목) 독립 검증 및 A3 브라우저 잔여 확인 (2026-11-28, `upgrade/e4-verify`)

검증 대상은 `origin/main`의 `3421079e0`(구현 `994b64bd9`, 미러 `2c4babd48`)이다. 구현 보고(69항목 missing 0, 재료 시험 13/13)는 맞았지만 **missing 0은 요구가 어떤 재료 이름에 연결됐다는 뜻일 뿐, 그 값이 화면에 나타난다는 뜻이 아니었다.** 코드를 읽고 브라우저로 렌더해 다음을 찾아 고쳤다. 실행 환경은 Node v26.9.0, Playwright Chromium(`PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright`)이다.

### 18.1 판정: 구현이 놓친 결함

| # | 결함 | 어떻게 드러났나 |
|---|---|---|
| 1 | 17개 표면 facet이 화면에서 **서로 다르지 않았다.** facet 규칙 `[data-surface] [data-surface-facet]`(명시도 0,2,0)이 `.kit-surface[data-level]` 단계 규칙(0,3,0)에 가려, 단계 표면 위에서는 반경·테두리·그림자가 전부 단계 값이 됐다 | Chromium 계산 스타일에서 서로 다른 모양이 1/17. 기존 시험은 CSS 문자열 대조만 해서 통과했다 |
| 2 | `subtle`과 `hairline-border`가 컴파일 결과 동일(4px·1px 헤어라인·그림자 없음), `medium-elevation`과 `deep-elevation`이 같은 그림자(`lifted`)이고 반경만 달랐다 | facet별 컴파일 선언 쌍 비교 |
| 3 | 모션 패턴 `slide`와 `modal-enter`가 같은 전환(속성 집합·길이·곡선·지연 동일), `toast-enter`는 `popover-enter`와 지연만 달랐다 | 패턴별 컴파일 전환 비교 |
| 4 | `reducedMotion` 필드가 15개 모두 상수 `none`이고 CSS가 읽지 않았다(일괄 `*{transition-duration:.01ms}`만 있었다) | 값을 바꿔도 컴파일 CSS가 변하지 않음(잎 값 변이 검사) |
| 5 | Frosted Glass의 `blur(12px)`가 **화면에 아무 변화도 내지 못했다.** 뒤에 매끄러운 그라데이션만 있어 흐려질 대상이 없다 | blur 12px와 0px의 스크린샷 줄무늬 경계 변화량 비교 |
| 6 | Tinted와 Dot Pattern이 한 재료(`background:brand-tint-dots`)에 연결됐다. 단색 틴트 재료가 없었다 | 장부의 요구→재료 연결 |
| 7 | 간격 9개 요구(페이지 여백~아이콘과 텍스트 간격)가 구분 없이 `spacing:comfortable` 하나에 연결됐고, 재료에 역할 개념이 없었다. 표면 17·모션 15개 요구도 재료 하나(`hairline-panel`, `calm`)에 연결됐다 | 장부 `materialIds` |
| 8 | 아이콘 `viewBox`·`family`가 선언만 있고 어디서도 읽히지 않았고, `--kit-icon-align` 변수는 선언만 되고 읽는 규칙이 없었다. 작은 크기 가독성 규칙이 없었다 | 잎 값 변이 검사, CSS 대조 |
| 9 | 간격 밀도 3종은 장부 상태가 `metadata-only/no-definition`, 아이콘 영역 16종은 `defined/no-render-probe`였다. 69항목 중 25항목이 그 상태 | `MATERIAL-COVERAGE.json` |

구현 보고와 달리 맞았던 것: 69항목이 REQUEST §9.3~§9.7 문장에서 생성되고(`foundations` 9·17·12·15·16), 아이콘이 `src/catalog/icons.mjs`를 바꾸지 않았으며(`git diff origin/main -- src/catalog/icons.mjs` 빈 출력), 간격 값이 4px 격자와 기존 `SPACE` 토큰을 쓴다.

### 18.2 교정

- 표면: facet 규칙을 `:is([data-surface-facet],.kit-surface[data-level][data-surface-facet])`로 올려 단계 표면 위에서도 이기게 했다. `subtle`은 테두리 없는 4px, `deep-elevation`은 `FACET_SHADOW.deep`(`ELEVATION` 표는 건드리지 않아 2.1~2.4 출력 불변)로 바꿔 17개가 모두 다른 모양이 되고 그림자 번짐이 subtle 16 < medium 32 < deep 64가 된다. facet 샘플 `renderSurfaceFacetSample`을 추가했다(이중 테두리는 form·pricing 맥락 래퍼 안에서만 열린다).
- 모션: `modal-enter`·`drawer-enter`를 `slow`, `toast-enter`를 `base`로 올려 15개가 서로 다른 전환이 된다. `reducedMotion`은 `instant`(전환 제거)와 `fade`(opacity만 짧게, transform 제거)로 바꾸고 패턴마다 reduce 규칙을 컴파일한다(일괄 규칙보다 명시도가 높다). 등록 검사는 `fade`가 opacity를 움직이는 패턴만 허용한다.
- 배경: Tinted용 `background:soft-tint`를 추가해 12개 항목에 재료 13종이 대응한다. Frosted의 바탕에 또렷한 줄무늬를 깔아 blur가 화면에서 보인다(대비 stops에도 반영).
- 간격: `SPACING_ROLES` 9개를 서로 다른 토큰 9개(band·section·inset·head·gap·item·sub·near·tight)에 묶고 `[data-spacing-role]` opt-in 규칙으로 컴파일한다. 두 역할이 같은 토큰을 읽으면 등록이 거부된다. 토큰은 모두 현재 컴파일된 페이지 CSS가 읽는 것이다.
- 아이콘: `renderAreaIcon`이 viewBox를 대조하고 `data-icon-family`·`data-icon-size`를 찍으며 CSS 선택자가 family를 읽는다. `--kit-icon-align`을 `vertical-align`이 읽는다. `minSize` 16px와 그 크기에서 선 굵기 1.25px 이상 검사를 추가했다.
- 장부: 요구에 `part`(`role:*`·`facet:*`·`pattern:*`)를 달아 요구 문장 하나가 재료의 부분 하나에 대응하게 했고, 간격·아이콘 영역에 정의 경로와 `assembleStyleMaterials` 프로브를 연결했다. 69항목 상태는 `metadata-only/defined` 25 → `renderable` 25(웹 카탈로그에 아직 없음)로 정직하게 올랐고 나머지 44는 `verified`다.

### 18.3 시험과 RED

`tests/platform-style-materials.test.mjs`에 시험 5개를 더해 18개다(기존 13). 하드코딩 기대값 대신 컴파일 결과의 성질을 본다: facet 17개 쌍별 다른 반경·테두리·그림자, 그림자 번짐 순서, 15개 전환 레시피 쌍별 차이와 정책별 reduce 규칙, 역할 토큰 9개 서로 다름·밀도 배율이 역할마다 다름·역할 토큰이 컴파일된 모든 템플릿 CSS에서 읽힘, 아이콘 viewBox·family·크기, 장부의 부분·재료 대응. 기존 시험에서 항상 참인 단언은 찾지 못했다. 약한 단언 3건을 고쳤다: (1) facet 쌍 비교가 원시 필드 `[radius,border,elevation]`만 봐서 결함 1·2를 놓쳤고 컴파일 결과 비교로 바꿨다. (2) 순위 시험의 유일한 OR 단언 `ranked.length > 0 || reasons.length > 0`을 '비어 있으면 사유가 있고 사유마다 code·id가 있다'는 함의로 바꿨다. (3) 프리셋 CSS를 `css.length > 80`으로만 보던 단언을 '자기 범위 선택자(`[data-surface=...]` 등)를 포함하고 규칙이 3개 이상'으로 바꿨다.

결함을 심어 실패를 확인했다(원복 후 18/18 통과):

| 심은 결함 | 실패한 시험 |
|---|---|
| deep-elevation에 medium 그림자 | facet 17종, 프리셋 차이 |
| subtle을 hairline-border와 같게 | facet 17종, 프리셋 차이 |
| modal-enter를 slide와 같게 | 모션 패턴 15종 |
| reduce 정책 규칙을 CSS에서 제거 | 모션 패턴 15종 |
| 패턴 정책을 전부 `instant`(상수)로 | 모션 패턴 15종 |
| 간격 두 역할이 같은 토큰 | 등록 거부(시험 파일 로드 실패) |
| 아이콘 정렬 변수 미사용 / viewBox 미대조 | 아이콘 값이 출력에 닿음 |
| 장부에서 Tinted를 Dot Pattern 재료에 연결 | 장부 대응 시험 |
| facet 명시도를 낮춤 | facet 17종(시험) + Chromium 확인(2/17) |
| reduce 정책 규칙 제거, fade에서 transform 유지, frosted를 매끄러운 바탕으로, blur 24px | Chromium 확인 4건 모두 실패(blur 24px는 등록 단계에서 거부) |

### 18.4 Chromium 렌더 확인(`screens/foundations/render-check.mjs`, 대표 재료만)

계산 스타일과 실제 `CSSTransition`을 읽고(시간 표본이 아니라 전환을 멈춰 50% 지점 값을 읽는다) 스크린샷 6장을 같은 폴더에 둔다. 출력 전문은 `render-check.out.txt`다. 요약:

- 표면: facet 17/17 서로 다름, 그림자 번짐 16/32/64, `double-border`는 form 맥락에서 `double`, dashboard 맥락에서는 열리지 않음. 표면 프리셋 5종의 base 단계 모양이 모두 다름.
- 모션(calm): `prefers-reduced-motion: no-preference`에서 press `transform:120ms`, modal-enter `opacity·transform:240ms`, drawer-enter `transform:240ms`가 실제로 걸리고 50% 지점 값이 시작·끝 사이(pressX 87.8, drawerX 83.9, modalY 6.4)다. `reduce`에서는 press·drawer가 전환 없이 즉시 끝 값(100)이고 modal-enter는 `opacity:120ms`만 남아 transform이 즉시 끝 값(0)이며 opacity는 0.5다.
- 배경: 모든 `.kit-deco`의 `backdrop-filter`는 `blur(12px)` 하나(상한 16px 이하), 17px는 등록 거부. 줄무늬 경계 변화량 blur12 = 2, blur0 = 21로 화면에서 실제로 흐려진다.
- 간격: 역할 9개의 실제 레이아웃 거리가 `SPACE` 토큰과 같고(compact·spacious), spacious/compact 배율이 역할마다 다르다(1.0·1.33·1.67·1.86·2.0).
- 아이콘: 영역 4종 계산 스타일 24px·stroke 2px·`vertical-align:middle`, 작은 크기 16px, 장식은 `aria-hidden`, 이름이 있는 것은 `role="img" aria-label`.

### 18.5 A3 브라우저 잔여 2건

1. `cd apps/web && npx playwright test e2e/catalog-lists.spec.mjs`: **10개 중 9개 통과, 1개 실패.** Explore·Components·Typography 목록의 24카드 상한, iframe 0, 컴파일 0회, 정적 미리보기 디코드는 통과했다. 실패한 시험(`catalog-lists.spec.mjs:174`)은 `/components/hero`의 `h1`이 `Hero`를 포함해야 한다고 단언하지만 화면은 한국어 라벨 `히어로`를 낸다(`src/catalog/nodes.mjs`의 `label`). 단언만 `히어로`로 바꾼 임시 사본으로 같은 시험을 돌리면 통과하므로 제품 결함이 아니라 `ef1ade200`이 넣은 시험의 기대값 오류다. A3는 확인만 하는 범위라 고치지 않았다. 수정안: 단언을 `toContainText('히어로')`(또는 `/히어로|Hero/`)로 바꾼다.
2. 운영 빌드(`npm run web:build` 후 `next start`)에서 Studio 편집 후 `typeof window.__studio_api`는 `undefined`, `__studio_compile_count`도 `undefined`, `'__studio_api' in window`는 `false`다(`e2e/studio-probe.spec.mjs` 운영 시험 2개 통과: window 훅 없음, `.next/static` 번들에 훅 문자열 없음). `DSK_STUDIO_PROBE=1` 빌드에서는 `typeof window.__studio_api`가 `object`, `__studio_compile_count`는 `number`(값 2)로 존재한다.

### 18.6 불변 조건과 전체 검증

- `src/catalog/icons.mjs`·`src/catalog`·`src/render`·`src/styles`·`src/spacing.mjs`·`site/v1`·`docs/evidence/context/legacy-hashes.json`: 검증 대상 `3421079e0`에서 `git diff origin/main` 빈 출력(교정 커밋도 이 경로를 건드리지 않았다). legacy 2.1.0 해시와 기본 2.4.0 출력 시험(`tests/composition.test.mjs`, `tests/platform-color-compat.test.mjs`) 22/22 통과.
- `npm run coverage:materials:check`: `MANIFEST MATCH`(최신 main `e901afcc5` 위로 rebase한 뒤 재생성한 `MATERIAL-COVERAGE.json` 기준, 재료 1480·요구 406·missing 요구 69는 §9.3~§9.7이 아닌 구성요소 요구).
- `npm run verify`(최신 main `e901afcc5` 위로 rebase한 최종 트리): `npm test` **1015개 중 1014 통과, 1 실패**. 실패는 `tests/platform-type-fonts.test.mjs` 4번 시험의 `page.setContent: Timeout 30000ms exceeded`다. 이 시험의 마지막 구간(289~299줄 근처, 일본어 fallback 표본)은 앞 구간과 달리 `page.route('http://static-kit.local/**')`를 걸지 않고 그 주소를 요청한다. 이 호스트에서는 그 이름이 풀리지만(curl `dns=0.01s`) 연결이 응답하지 않아 `load` 대기가 30초를 넘긴다. 저장소 코드 없이 Chromium에 같은 `<link>`만 넣어도 8초 타임아웃으로 재현된다. E4 변경과 무관한 C2 시험의 환경 의존 결함이고 쓰기 범위 밖이라 고치지 않았다(수정안: 마지막 구간에도 같은 라우트를 건다). 같은 시험은 교정 전 `3421079e0` 위에서도 같은 이유로 실패했다. 따라서 `npm run verify`의 `npm test` 단계는 이 1건 때문에 exit 1이다. 이후 단계는 따로 실행해 통과했다: `audit` exit 0, `docs` exit 0, `build` exit 0, `check-generated` `REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.`
- 루트 브라우저 시험 `npx playwright test`(교정 직후, rebase 전): 325개 중 324 통과, 1 실패. 실패는 `e2e/platform-families.spec.mjs:12`의 `media dashboard/comfortable family:quiet light mobile: CLIP_ICON,CLIP_TEXT,CLIP_TEXT,OVERFLOW_X`를 비롯한 media 묶음 측정이다(D4 정보·미디어 패밀리의 레이아웃 품질). 교정 전 `3421079e0`을 새로 `npm ci`한 작업 트리에서 같은 측정(`measureAll({groups: ['media'], modes: ['light']})`)을 돌려도 같은 코드(`CLIP_ICON,CLIP_TEXT,CLIP_TEXT,OVERFLOW_X`)로 실패하고, 최신 main 위의 교정본에서도 동일하다. E4가 만든 실패가 아니며 D4 소관이다.

## 19. 시험 결함 2건 교정, `npm run verify` 전체 통과, D5b(Stack·Container·Resizable Panel) 독립 검증 (2026-11-28, `upgrade/e4-verify`)

### 19.1 시험 결함 2건(§18.5·§18.6에서 넘어온 것)

1. `apps/web/e2e/catalog-lists.spec.mjs:174`: `h1`이 `Hero`를 포함해야 한다는 단언을 화면 라벨 `히어로`(`src/catalog/nodes.mjs`)에 맞췄다. 단언 삭제·완화 없음. `cd apps/web && npx playwright test e2e/catalog-lists.spec.mjs` → `10 passed`.
2. `tests/platform-type-fonts.test.mjs` 4번 시험: 마지막 구간(일본어 fallback 표본)에 앞 구간과 같은 `static-kit.local` 라우트를 걸어 실제 WOFF2는 파일에서, 그 밖은 404로 답하게 했다. 앞 두 구간의 `route.continue()`(실제 네트워크로 나감)도 404 응답으로 바꿨다. 컨텍스트에 `static-kit.local` 밖으로 나가는 요청을 막고 기록하는 라우트를 두고 `outbound`가 빈 배열임을 단언한다(외부 호스트 연결 0). 이전에는 이 호스트에서 `load` 대기가 30초를 넘겨 실패했고, 지금은 `node --test tests/platform-type-fonts.test.mjs` → `tests 7, pass 7, fail 0`(4번 시험 1.6초).
3. C2 잔여 실측 기록(`docs/platform/evidence/type/font-loading-evidence.json`, `status: measured`, 1280px·390px): 양성 경로에서 `work-insight`는 Pretendard GOV, `doc-essay`는 Noto Serif KR, `doc-handbook`은 Pretendard GOV와 **JetBrains Mono**가 모두 `loaded: true`다. 음성 경로(WOFF2 404)는 서체당 실패 요청이 1건(handbook은 2건), 가로 넘침 없음, CSS 시스템 스택 fallback이 유지된다. 다국어 표본(일본어·원화·코드·한자)은 두 뷰포트에서 모두 렌더되고 넘침이 없다.

### 19.2 D5b 판정: 이름만 맞고 출력이 없는 유형을 의심하고 Chromium으로 실측했다

props가 렌더 출력에 반영되는지, 계산 스타일과 실제 레이아웃으로 확인했다. 아래 3건이 결함이었다.

| 부품 | 결함 | 실측 |
|---|---|---|
| Stack | `gap="gap"`이 존재하지 않는 `--kit-sp-gap`을 읽어 gap이 `normal`(0px). 선언한 4단계 중 하나가 출력에 없었다 | 간격 4종 중 `gap`만 0px(나머지 4·8·12px). 토큰은 `--kit-gap`(24px) |
| Resizable Panel(가로) | 핸들이 8px를 차지해 두 패널 합이 100%+8px. 둘째 패널이 호스트 밖으로 7px 밀려 `overflow:hidden`에 잘림 | `scrollWidth 1006 > clientWidth 998`, 둘째 패널 오른쪽 1007 > 호스트 1000 |
| Resizable Panel(세로) | 호스트 높이가 정해지지 않아 퍼센트 flex-basis가 동작하지 않음. `aria-valuenow`만 바뀌고 레이아웃은 그대로 | 값 30·85에도 두 패널 높이가 50·50px로 고정 |

교정(`src/platform/families/layout.mjs`, Track D 소유 파일, `site/src` 미러는 빌드가 재생성): Stack `gap`을 `var(--kit-gap)`으로, 핸들을 폭 0 flex 항목으로 바꾸고 8px 막대·잡는 영역은 `::before`로 경계 위에 겹쳐 그림(두 패널 합이 정확히 100%), 세로 호스트에 `block-size:20rem`, `aria-controls`로 첫 패널을 가리킴(`id`가 있을 때). 인라인 `flex:0 0 N%` 값과 기존 키보드 시험의 단언은 바꾸지 않았다.

문제 없던 것: Stack `align`(start·center·stretch 12조합), Stack 입력 검증(알 수 없는 gap·align은 `BAD_REQUEST`), Container `width` 4단계(640·1024·1280px 상한과 `full`이 페이지 폭을 채움, 가운데 정렬), 내용 이스케이프, 포인터 드래그(30%로 끌면 값과 폭이 함께 변함, 끝까지 끌어도 15·85에서 멈춤, 놓은 뒤에는 따라가지 않음), 키보드 조절, separator 접근성(`role="separator"`, 이름, `aria-valuemin/max/now`, 방향별 `aria-orientation`, `tabindex=0`, 방향이 다른 화살표는 무시), 런타임 제외(패널이 있는 페이지에만 `__kitLayout`이 들어가고 Stack·Container·Center만 있는 페이지와 `layouts`가 없는 페이지에는 없음). 참고: Container의 `standard`는 64rem(1024px)이라 Blueprint `width` 축의 standard(1080px)와 값이 다르다. 이름 충돌은 아니나 같은 값으로 맞출지는 결정하지 않았다.

### 19.3 시험과 RED

`tests/platform-layout-resizable.test.mjs`에 실제 Chromium 시험 4개를 더해 5개다: Stack 12조합의 실측 간격·정렬, Container 폭 4단계, 포인터 드래그·15~85% 경계·넘침 없음·세로 방향(포인터와 End 키)·separator 접근성, 런타임 제외. 비율 비교는 허용 오차 0.01이다(처음 작성 때 `±2`를 비율에 잘못 써서 세로 시험이 거짓 통과했고, 결함을 심어 보고 발견해 고쳤다).

결함을 심어 실패를 확인했다(원복 후 5/5 통과): Stack gap 토큰 오타, 핸들이 다시 8px 차지, 세로 높이 미정, 포인터 clamp 제거, `aria-controls` 제거, 런타임 항상 포함, Container narrow 폭 오류. 일곱 건 모두 해당 시험이 실패했다.

### 19.4 전체 검증

- `npm run verify`(최신 main `898d2da21` 위 최종 트리): `npm test` `tests 1021, pass 1021, fail 0`, `audit`·`docs`·`build`·`check-generated` 통과, 마지막 줄 `REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.`, exit 0.
- `MATERIAL-COVERAGE.json`은 손으로 병합하지 않고 `node scripts/generate-material-coverage.mjs`로 재생성했다.
- `src/catalog`·`src/render`·`src/styles`·`site/v1`·`legacy-hashes` 변경 없음(2.1.0 고정 해시와 기본 2.4.0 출력 시험은 위 1019개에 포함).
