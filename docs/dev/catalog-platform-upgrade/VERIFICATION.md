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
---

## 20. D2 §6.2 E·H·I 39항목 독립 검증 (원 커밋 `3d0788114`·`e305a7d9d`, 브랜치 `upgrade/d2-verify`, 2026-11-28)

구현 작업자(codex GPT Luna)는 Chromium 권한 오류로 브라우저 시험과 전체 verify를 실행하지 못했다. 이 검증은 Claude(Sonnet 5.5)가 Chromium으로 오버레이·메뉴·내비·피드백을 직접 조작해 확인했고, 결함은 고쳤다.

### 20.1 판정

- 39항목(E 14·H 9·I 16)은 항목 이름의 뜻대로 렌더된다. 의미 시험 `tests/platform-ehi-requirements.test.mjs`가 항목마다 렌더 출력의 구조를 본다. 재료 매핑은 시험이 정하지 않고 MATERIAL-COVERAGE.json의 요구 레코드에서 읽는다.
- 분류는 독립 31 · 변형 8에서 **독립 30 · 변형 9**로 바뀌었다. Inline Error의 매핑이 틀렸기 때문이다(20.2의 M-1).
- 변형 9건은 서로, 그리고 기반과 다른 출력을 낸다. 한 가지 예외는 Underline Tabs로, 밑줄은 Tabs 기본 외형이라 기본 Tabs와 같은 출력이다. 구별되는 것은 pill·segmented와 세로 방향뿐이다. 변형 축 값으로만 구별되는 항목이며 결함으로 보지 않고 시험 주석에 적었다.

### 20.2 발견 결함과 조치

| # | 결함 | 조치 |
|---|---|---|
| D-01 | Command Menu 입력 필터가 동작하지 않았다. 런타임이 `[role=menu]` 안에서 입력을 찾았는데 입력은 `role=dialog` 패널에 있어 `null`을 질의했다. 기존 e2e `platform-ehi-components.spec.mjs`도 이 지점에서 실패했다 | 런타임 재작성. 맞는 항목이 없으면 `role=status` 문구를 쓴다 |
| D-02 | 메뉴 패널과 안쪽 목록이 모두 `role=menu`라 menu가 중첩됐다 | 패널은 역할 없이 두고 안쪽 목록만 menu |
| D-03 | Popover가 화면 전체 반투명 막과 가운데 정렬 대화상자로 열렸다. `aria-modal=false`라고 적고도 시작 요소를 막이 덮었다 | 시작 요소 아래에 붙는 비모달 패널. 막 없음, 포커스·스크롤 가둠 없음, 화면 가장자리에서 안쪽으로 밀리고 아래 공간이 없으면 위로 뒤집힘 |
| D-04 | Dropdown·Command·Context 메뉴가 문서 흐름 안에서 열려 뒤 내용을 밀었다 | 겹쳐 뜨는 패널(absolute) |
| D-05 | Contextual Help: 포커스를 벗어나면 `close()`가 시작 요소로 포커스를 되돌려 Tab으로 나갈 수 없었다. hover 미지원, tooltip 트리거에 `aria-haspopup=dialog`·`aria-expanded`가 붙었다 | focus·hover로 보이고 Escape는 포커스를 옮기지 않고 닫는다. 포인터가 설명 위로 가도 유지. `aria-describedby`만 남김 |
| D-06 | Collapsible Sidebar 루트에 `data-ehi-root`가 없어 한 번 열면 닫을 수도, Escape로 복귀할 수도 없었다 | 루트 표시와 `data-ehi-persist`(바깥 클릭·다른 오버레이가 닫지 않음) |
| D-07 | Navigation Drawer: 링크를 골라도 닫히지 않았고(런타임이 존재하지 않는 `[data-nav-link]`를 찾음), 스크롤 잠금이 남았다 | 모달 안 링크 선택 시 닫고 잠금을 푼다 |
| D-08 | 바깥 클릭으로 닫을 때도 시작 요소로 포커스를 가져와 사용자가 누른 요소의 포커스를 빼앗았다. Tab이 메뉴를 닫지 않았다 | 바깥 클릭은 포커스를 누른 곳에 둔다. Tab은 메뉴를 닫고 다음 요소로 넘긴다 |
| D-09 | 모달 포커스 가둠은 Tab 핸들러뿐이라 포커스가 밖으로 나가면 돌아오지 않았다 | `focusin` 보호를 더했다 |
| D-10 | Loading Overlay가 `position:fixed` 전체 화면 막이라 어디에 두든 페이지 전체를 덮었다 | 영역(`aria-busy`) 안에만 겹치는 absolute 층. 가려진 내용은 `aria-hidden` |
| D-11 | Circular Progress의 숫자가 채움색 위에 직접 놓여 대비가 무너졌다 | 숫자 뒤 표면색 원판(`::before`) |
| D-12 | Status Indicator가 경보 상자 크기(390px에서 116px 높이)로 그려졌고 `.ehi-dot` CSS는 있는데 요소가 없었다 | 점·숨은 톤 문구·라벨을 한 `role=status` live region으로 구성. 경고는 마름모, 오류는 사각 점으로 색 외 단서 |
| D-13 | Callout이 경보(live region)였고 상자가 이중이었다 | `role=note` 정적 문구, 이중 테두리 제거 |
| D-14 | Navigation 링크·메뉴 높이가 36px라 44px 터치 목표 미달 | `.ehi .kit-ctl-nav-link` 44px. 구형 목적 패밀리(topbar·tabs·sidebar·confirm·error·warning·progress)는 640px 이하에서 44px |
| D-15 | 모바일(≤640px)에서 피드백 본문이 세로 flex로 바뀌며 `flex:1 1 12ch`가 높이 기준이 되어 한 줄 문구도 98px이 됐다(기반 `feedback.mjs`) | 기반 CSS는 "기존 컨트롤 출력 바이트 동일" 시험이 고정하므로 건드리지 않고, E·H·I 패밀리 CSS(`ehi.mjs`·`feedback.mjs` 목적 패밀리)에서 바로잡았다 |
| D-16 | 12개 목적 패밀리의 `entry.export`(`renderPopover` 등)가 모듈에 없는 이름이었고, 정의 위치 근거가 `feedback.mjs`·null로 틀렸다. 상태·상호작용 목록은 12개 모두 같은 문구(callout에도 "열기·닫기 aria-expanded")였다 | 이름 있는 함수를 export, 정의 위치를 진입점 모듈에서 읽음, 패밀리별 상태·상호작용 |
| M-1 | Inline Error의 매핑 `purpose:feedback.error`는 화면 위 배너·대화상자의 오류 안내다. Banner·Error State와 같은 자리다 | `base-component:input-control`의 `state: error`(aria-invalid, aria-describedby로 이어진 live 문구)의 변형으로 정정. 분류표 독립 149→148, 변형 36→37 |
| M-2 | Toast·Snackbar 변형 레코드가 `{placement:'toast'}`뿐이라 그대로 렌더하면 `FB_TOAST_STUCK`으로 거부된다 | `dismiss: 'button'`을 변형 값에 포함 |
| T-1 | 기존 시험이 소스 문자열(`ev.key==='Escape'`)을 찾는 방식이었다 | 마크업 단언과 Chromium e2e로 교체. 계약 시험의 `data-tone="info"`(기반 feedback 렌더) 단언은 상태 표시기 구조 변경에 맞춰 같은 안전성(알 수 없는 톤이 출력에 실리지 않음)을 보는 단언으로 바꿨다 |
| T-2 | `tests/platform-type-fonts.test.mjs` 다국어 시험이 `static-kit.local` 요청에 라우트가 없어 DNS 대기로 30초 timeout(원 저장소 `main`에서도 같은 실패) | 서체 요청을 즉시 abort하는 라우트 추가. E·H·I 범위 밖이지만 `npm run verify` 통과에 필요해 최소 변경 |

### 20.3 Chromium 조작 결과 (`e2e/platform-ehi-interaction.spec.mjs`, 390px·1280px)

고치기 전 같은 시험은 12건 이상 실패했고(터치 높이 36, popover 위치 572px, 메뉴 strict-mode 중복, 필터, 도움말 Tab, 원 숫자 배경), 고친 뒤 26/26 통과다(기존 `platform-ehi-components.spec.mjs` 2건 포함).

- 다이얼로그·드로어: 키보드 열기, 포커스가 안으로 이동, Tab·Shift+Tab 순환 유지, `html` overflow 잠금과 휠 스크롤 불변, Escape·배경 클릭·닫기 단추로 닫힘, 포커스 복귀, 잠금 해제, 패널이 화면 안에 머묾.
- 팝오버: 시작 요소 24px 이내 아래, 막 없음, 시작 요소가 눌림, Tab으로 나가도 열려 있음, Escape 복귀, 바깥 클릭은 포커스를 누른 곳에 둠.
- 메뉴 3종: 방향키·Home·End·wrap, 비활성 항목 건너뜀, Tab으로 닫힘, 항목 선택 시 닫고 복귀, 뒤 내용이 밀리지 않음, 필터와 빈 결과 live region, 오른쪽 클릭과 ContextMenu 키.
- 도움말: focus·hover로 보이고 Escape로 닫히며 Tab 후 되돌려 끌지 않음, 오른쪽 가장자리에서도 화면 안.
- 사이드바·드로어 내비: aria-expanded, 링크 선택 시 `aria-current=page` 이동, Escape 복귀.
- 피드백: status 영역 노드가 문구 변경 뒤에도 유지, callout은 정적 note, 진행 값과 그려진 값 일치, 로딩 오버레이는 뷰포트 80% 미만이며 페이지 나머지를 덮지 않음.
- 가로 넘침 없음과 터치 목표 44px는 위 시험이 열린 상태에서 확인한다.

### 20.4 RED/GREEN

원 코드에서 위 e2e가 실패한 것이 RED다. 고친 뒤 통과가 GREEN이다. 시험을 새로 쓴 뒤 런타임 코드에 결함을 심어 시험이 잡는지 따로 확인했다.

| 심은 결함 | 결과 |
|---|---|
| 스크롤 잠금 제거(`overflow=''`) | `html overflow`가 `''`로 실패 |
| Tab 가둠과 `focusin` 보호를 둘 다 제거 | "Tab 1 stays in the dialog" 실패 (Tab 핸들러만 제거하면 `focusin` 보호가 막아 통과한다. 이중 방어라 시험이 한쪽 제거를 놓치는 것이 아니다) |
| 닫을 때 포커스 복귀 제거 | 드로어·드롭다운 시험 2건 실패 |
| 상태 표시기 `aria-live` 제거 | 접근성 시험·의미 시험·계약 시험 3건 실패 |
| Toast 변형을 `{placement:'toast'}`로 되돌림 | 의미 시험 1건 실패 |

### 20.5 남은 한계

- 구형 노드(`component:breadcrumb` 링크 32px, `component:pagination` 40px)와 기반 컴포넌트의 기본 크기 축은 고정 출력 해시 때문에 건드리지 않았다. 1280px에서 구형 목적 패밀리(topbar·tabs·sidebar 링크 36px, confirm·error·warning·progress 버튼 26~32px)는 44px 미만이다. 640px 이하에서만 44px로 올렸다.
- 기반 `base-component:feedback-message` 자체의 ≤640px 세로 본문 높이 문제(D-15)는 기반을 직접 쓰는 곳(Alert·Banner·Toast 단독)에 남는다.
- 성공 상태 패턴(`state-pattern:success-*`)과 `error-banner`는 표 상태 슬롯에 놓이지 않아 `assembleDesign` 표 경로로는 출력에 나타나지 않는다. 해당 항목은 `purpose:feedback.result`로 확인했다.

### 20.6 실행 증거

```sh
$ export PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright
$ npx playwright test e2e/platform-ehi-interaction.spec.mjs e2e/platform-ehi-components.spec.mjs
26 passed (22.3s)
$ node --test tests/platform-ehi-requirements.test.mjs tests/platform-ehi-contract.test.mjs tests/platform-family-a11y.test.mjs tests/platform-family-inventory.test.mjs
ℹ pass 120 / ℹ fail 0
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1480 materials, 406 requirements)
freshness: platformSectionEqualsBaseline=true / legacyAttemptedEqualsBaseline=true / registeredEqualsBaseline=true
$ npm run verify
ℹ tests 1052 / ℹ pass 1052 / ℹ fail 0
REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.
$ npm run test:browser
374 passed, 1 failed (10.9m)   # e2e/platform-families.spec.mjs:12 media 묶음 전부(CLIP_ICON·CLIP_TEXT·OVERFLOW_X)
```

`platform-families.spec.mjs:12`의 실패는 E·H·I 변경과 무관하다. 같은 측정(`measureAll({groups: ['media']})`)이 이 커밋을 올리지 않은 `origin/main`(`898d2da21`)에서도 똑같이 media 묶음 전부를 실패시킨다. 실패는 K 계열(미디어) 소관이라 고치지 않았다. E·H·I 묶음(navigation·overlay·feedback)은 이 시험에서 통과했다.

불변 확인: 위 `npm run verify`의 시험에 레거시 해시(2.1.0), 기본 2.4.0, `site/v1/catalog.json`, 기존 컨트롤 출력 바이트 동일 시험이 포함되어 통과했다. 기반 컴포넌트 CSS(`src/materials/*`)는 이 커밋에서 바뀌지 않았다(첫 시도에서 `feedback.mjs`를 고쳤다가 "기존 컨트롤 출력 바이트 동일" 시험이 실패해 되돌렸다).

## 21. D4 J·K 독립 검증 및 교정 (`upgrade/d4-verify`, 2026-11-28)

### 판정

- e7c4058a3의 §6.2 J·K 27행은 `status`가 아니라 Manifest `coverage` 값으로 셌다. `direct` 21, `variant` 6, `missing` 0, `schema` 0이다. 기존 11종은 5 direct·6 variant이고, 신규 목적 패밀리 16종은 모두 direct다.
- 기존 매핑은 출력까지 확인했다: Badge=`component:tags` badges, Chip=chips, Tag=outline, Filter Chip=`purpose:form.filter` toggle, Divider=`kit-hr`; Image·Video Frame은 각각 photo·video, Media Frame 6개 스타일은 실제 조립 CSS, Gallery·Quote·Rich Text는 각 Blueprint 노드 출력이다. Tag의 기본 chips 출력은 요구 의미와 달라 outline으로 기록했다.
- 신규 목적 패밀리 16종은 계약 정의와 렌더를 대조했다. 모든 variant/prop 값이 출력 마크업에 도달하고, 여러 값 축의 CSS selector도 있으며, Figure 배치·목록 상한·사용자 문자열 이스케이프·중복 ID·runtime 포함 여부를 시험했다. Avatar 이미지 실패 시 이니셜 대체 표시와 Audio Player runtime 연결이 빠져 있어 보완했다.
- Blueprint 경로는 27행 전부 확인했다. 16개 purpose Blueprint 컴파일, 기존 컴포넌트의 `edit.insertNode` 후 컴파일, Filter Chip 실제 토글 마크업, Media Frame 6종 스타일 조립을 행별로 검사한다.
- 파이프라인 기준선의 목적/시각 패밀리 개수는 고정값 대신 현재 등록 목록에서 계산하게 했다. 최신 재산출은 visual 12, purpose 65다. 웹 E2E의 목적 목록 수도 공개 `listPlatformMaterials`의 total과 페이지에서 읽은 ID 집합을 비교한다.
- 미리보기 사전 생성물은 수정된 렌더와 달라 재빌드했다. 이후 사전 렌더 바이트 시험과 `check-generated`가 통과했다. 레이아웃 측정 JSON은 24종 fingerprint 및 가로 스크롤 0 계약과 계속 일치한다.
- 2.1.0 고정 해시, 기본 2.4.0 출력, `site/v1/catalog.json` 바이트 계약은 호환성 시험에서 보존됐다. Material Coverage는 최신 생성 기준과 MATCH다.
- `npm run verify`는 1,007개 중 1,005개 통과했다. 실패 2개는 Chromium 시작 단계의 Mach IPC `bootstrap_check_in ... Permission denied (1100)`다: `tests/platform-layout-resizable.test.mjs`의 “resizable panel: keyboard navigation and min/max constraints work in real Chromium browser”, `tests/platform-type-fonts.test.mjs`의 “4. 브라우저 실측: 390px 및 1280px에서 로딩 성공(양성)과 실패 대체(음성), 다국어 fallback 검증”. `audit`, docs, build, check-generated는 테스트 실패로 verify 체인에서 건너뛰므로 별도 실행해 통과를 확인했다.
- 요청된 D0b 절은 이 문서나 업그레이드 디렉터리에서 찾지 못했다(`rg -n 'D0b|D0B' docs/dev/catalog-platform-upgrade` 0건). 따라서 해당 절의 별도 주장은 검증 근거로 사용하지 않았다.

### 교정

- `J/Tag` 매핑 및 구성 분류를 `component:tags` outline 변형으로 변경하고, 생성된 `docs/platform/components.md` 분류표도 재생성했다.
- Accordion, Avatar Group, Keyboard Shortcut, Metadata Row, Carousel의 선언 배열 경계를 렌더 단계에서 거부하도록 했다. 아바타 이미지 오류 fallback과 Audio Player runtime ID를 연결했다.
- `assembleComponents`가 중복 ID를 거부해 ARIA 참조 ID가 겹치지 않게 했다. info-media 계약 시험에 모든 축의 출력 반영, HTML escape, 배열 제한, runtime, 실제 media CSS, 27행 Blueprint 검사를 더했다.
- 파이프라인 테스트에서 color gate를 임의 오류로 통과시키던 OR 대체 단언을 `P_COLOR_CONTRAST` 진단 단언으로 좁혔다. 목적·시각 패밀리 수 시험은 등록 수를 계산하도록 바꿨다.
- 기준선 `docs/evidence/platform/baseline.json`과 Manifest를 재생성했다. 미리보기 SVG 16개, `site/previews/previews-data.json`, gallery를 새 렌더 출력으로 갱신했다.

### 실행 증거

```text
$ jq '[.requirements[] | select(.section=="§6.2 J" or .section=="§6.2 K") | .coverage] | group_by(.) | map({k:.[0],n:length})' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
direct 21 / variant 6

$ node --test tests/platform-info-media-*.test.mjs tests/platform-pipeline-baseline.test.mjs
ℹ tests 30 / ℹ pass 30 / ℹ fail 0

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1472 materials, 406 requirements)

$ node --test tests/composition.test.mjs tests/materials-registry.test.mjs tests/expression-2-5.test.mjs tests/service-contract.test.mjs
ℹ tests 68 / ℹ pass 68 / ℹ fail 0

$ node --test tests/layout-quality.test.mjs
ℹ tests 26 / ℹ pass 26 / ℹ fail 0

$ npm run verify
ℹ tests 1007 / ℹ pass 1005 / ℹ fail 2
실패 2개 모두 Chromium Mach IPC 권한 오류(위 판정 참조).

$ node scripts/audit.mjs
AUDIT 통과; 4590 template×theme pages + 1249 palette×mode pages compile.

$ node scripts/docs.mjs
DOCS: typography, layout primitives, diagnosis 작성 완료.

$ npm run build
BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases.

$ node scripts/check-generated.mjs
REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.
```

RED→GREEN 근거: 상한 검사는 11개 Avatar Group 항목을 허용했고, 이미지 fallback 시험은 마크업에서 `.pf-avatar-fallback`을 찾지 못했으며, 중복 ID 시험은 조립 성공을 확인했다. 각 시험은 renderer/runtime/service 수정 뒤 통과했다. 27행 Blueprint 추가시험은 Media Frame의 실제 CSS를 확인하도록 고쳤고, 16행 생성 미리보기는 재빌드 후 서비스 출력과 바이트 일치했다.

### 21.1 이전 main 기준 재검증 (2026-11-28)

`origin/main`의 최신 상태(`d43f6963a`에서 작업 시작)를 기반으로 다시 확인했다. 당시 검증 worktree는 7커밋 뒤처져 있어 현재 main을 기준으로 재생성했고, 충돌은 최신 main의 C2·D5·E4 기록과 공개 목록 검사를 보존해 합쳤다. `node_modules`는 디렉터리였고 symlink가 아니었다. Node `v26.9.0`, npm `11.19.1`에서 `npm ci`가 52개 패키지를 설치하고 취약점 0개를 보고했다(웹 패키지는 Node 22.x를 요구해 EBADENGINE 경고가 있었다).

```text
$ jq '[.requirements[] | select(.section=="§6.2 J" or .section=="§6.2 K") | .coverage] | group_by(.) | map({k:.[0],n:length})' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
direct 21 / variant 6; missing 0 / schema 0 (27행)

$ node scripts/platform/baseline.mjs
platform assemblable 1712172 (of 1744740 tried)
platform verified 68018 assembled+checked; visual 12, purpose 65 registered

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1480 materials, 406 requirements)

$ node --test tests/platform-info-media-*.test.mjs
ℹ tests 26 / ℹ pass 26 / ℹ fail 0

$ node --test tests/layout-quality.test.mjs
ℹ tests 26 / ℹ pass 26 / ℹ fail 0
24종 layoutFingerprint와 320·768·1024·1440px 측정 기록 일치

$ node --test tests/platform-pipeline-baseline.test.mjs (npm run verify 안에서 실행)
✔ the platform section counts what really assembles, not what is registered (525812ms)
✔ the counted assemblable combinations equal a one-by-one evaluation of every combination (411820ms)

$ npm run verify
exit 1: tests/platform-layout-resizable.test.mjs의 "resizable panel: keyboard navigation and min/max constraints work in real Chromium browser"와 tests/platform-type-fonts.test.mjs의 "4. 브라우저 실측: 390px 및 1280px에서 로딩 성공(양성)과 실패 대체(음성), 다국어 fallback 검증"이 Chromium 시작 시 실패
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100), SIGTRAP

$ node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs
AUDIT 통과; DOCS 생성; BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases
REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.

$ git diff --exit-code origin/main -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json
exit 0
```

신규 시험의 음성 대조에서 `.pf-avatar-fallback-red-check`로 클래스명을 깨뜨렸을 때 첫 단언은 부분 문자열만 찾으며 잘못 통과했다. 단언을 정확한 `class="pf-avatar-fallback"` 토큰 검사로 고친 뒤, 같은 변경에서 시험이 실패하는 RED와 원래 class 복구 후 통과하는 GREEN을 확인했다. 그 뒤 전체 info-media 26개가 통과했다. 요청된 별도 D0b 절은 당시 `VERIFICATION.md`에 없었고 REQUEST·DECISIONS·Manifest 검색도 0건이었다.

전체 `npm run verify`는 Chromium 두 시험에서만 환경 오류로 종료되어 audit·docs·build·check-generated는 이어 실행해 확인했다. 실행 엔진은 Codex의 macOS `exec_command`이며, 관측된 오류는 Chromium Mach IPC `Permission denied (1100)`다. 이 오류는 해당 시험 실행 환경의 결과이며 다른 실행 환경의 브라우저 상태를 뜻하지 않는다.

### 21.2 D6 병합 이후 재검증 (`91659ea03`, 2026-11-28)

검증 도중 D6가 main에 반영되어 최신 17커밋을 다시 fetch하고 병합했다. D6 커머스 자료와 성능 측정 파일·원문은 main 버전을 유지했다. D4 작업만 다시 적용한 뒤 baseline, Manifest, 컴포넌트 분류표 및 사이트 사전 생성물을 최신 코드 기준으로 재생성했다.

```text
$ node scripts/platform/baseline.mjs
platform assemblable 1712172 (of 1744740 tried)
platform verified 68018 assembled+checked; visual 12; purpose 65
(553.9s)

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1480 materials, 406 requirements)

$ node --test tests/platform-info-media-*.test.mjs tests/layout-quality.test.mjs
ℹ tests 52 / ℹ pass 52 / ℹ fail 0

$ node --test tests/composition.test.mjs tests/materials-registry.test.mjs tests/expression-2-5.test.mjs tests/service-contract.test.mjs
ℹ tests 68 / ℹ pass 68 / ℹ fail 0
legacy 2.1.0 출력 해시와 기본 생성 버전 2.4.0 시험 포함

$ npm run verify
✔ the platform section counts what really assembles, not what is registered (493399ms)
✔ the counted assemblable combinations equal a one-by-one evaluation of every combination (160585ms)
exit 1: Chromium 실측 2개가 bootstrap_check_in ... Permission denied (1100) / SIGTRAP으로 시작 실패

$ node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs
AUDIT 통과; DOCS 생성; BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases
REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.

$ git diff --exit-code origin/main -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json
exit 0
```

`npm run verify` 안에서 실패한 시험명은 `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser`와 `4. 브라우저 실측: 390px 및 1280px에서 로딩 성공(양성)과 실패 대체(음성), 다국어 fallback 검증`이다. 첫 Chromium 실패의 로컬 환경은 Codex/macOS `exec_command`; 두 시험 모두 Mach IPC `Permission denied (1100)` 후 `SIGTRAP`으로 종료했다. 비브라우저 시험에는 실패가 없었고, `audit`, `docs`, `build`, `check-generated`는 별도 실행으로 확인했다.

E/H/I가 포함된 최신 `origin/main` 반영 후(`db7ed45fc`)에도 §6.2 J·K coverage는 `direct 21 / variant 6 / missing 0 / schema 0`으로 유지되며, 1,480 materials / 406 requirements Manifest의 baseline 신선도 세 플래그가 모두 true다.

E/H/I 통합 main에서는 `npm run verify` 1,052/1,052 통과와 3,836 생성 파일 재현성이 확인됐다(§20.6). 이는 D4 수정 전 통합 기준 결과다. D4 커밋 `51f3ff022e81156bcc14d48d8f9aa7e77d47756b`에 대해 다시 실행한 아래 결과가 D4 최종 verify 판정이다. 별도 `npm run test:browser`는 374 통과·1 실패였고, 유일한 실패는 §20.6에 기록한 기존 `e2e/platform-families.spec.mjs:12` 미디어 측정이다. D4와 무관해 변경하지 않았다.

### 21.3 D4 커밋 최종 검증

```text
$ npm run verify
ℹ tests 1078 / ℹ pass 1073 / ℹ fail 5
exit 1; 다섯 실패 모두 Chromium 시작 시 bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100), SIGTRAP

실패 시험:
- tests/platform-layout-resizable.test.mjs:13 — resizable panel: keyboard navigation and min/max constraints work in real Chromium browser
- tests/platform-layout-resizable.test.mjs:117 — stack: gap and align props change the real layout, including the "gap" step
- tests/platform-layout-resizable.test.mjs:143 — container: width steps cap the real width, full does not, and content is escaped
- tests/platform-layout-resizable.test.mjs:156 — resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility
- tests/platform-type-fonts.test.mjs:136 — 4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다
```

실행 엔진은 Codex/macOS `exec_command`다. Chromium launch 권한 오류 뒤 브라우저를 재시도하지 않았다. 앞 절에서 같은 D4 코드에 대해 `audit`, `docs`, `build`, `check-generated`를 별도 실행해 통과시켰고, 마지막 출력은 `REPRODUCIBLE: 3836 generated files match a fresh build byte for byte.`였다. 즉 D4의 `npm run verify`는 브라우저 의존 5개만 해당 환경에서 시작하지 못했고 비브라우저 시험 1,073개는 통과했다.

## 22. D3 §6.2 F 카드·G 데이터 표시 구현 (2026-11-28)

최신 main(`ffd309d96`) 위에서 D3를 재기반화하고 coverage, baseline, 컴포넌트 분류표, 카탈로그 인덱스 및 미리보기를 다시 생성했다. TASK-TRD-F는 `카드 22항목`, TASK-TRD-G는 실제 요구행 수인 `데이터 표시 20항목`이며 둘 다 `Implemented`다.

### 22.1 구현 및 범위

- Manifest의 F 22행은 direct 19 / variant 3 / missing 0이다. G 20행은 direct 16 / variant 3 / part-of 1 / missing 0이다. G의 `List Item`은 기존 `component:list`의 자식 구조로 존재한다.
- 카드·표시 계열 렌더러와 계약은 loading, empty, error, 내용 이스케이프, 실제 마크업 상태 및 Blueprint 재료를 시험한다. Core·REST·MCP가 재료 조회와 Blueprint 조립에서 같은 출력을 내는 시험도 통과했다.
- KPI 차트 카드는 기존 검증 프리셋 `chart-preset:mobile-sparkline`을 `renderChartPreset`으로 재사용한다. 차트 렌더러 `src/render/chart-presets.mjs`는 바꾸지 않았다.
- `e2e/platform-family-a11y.spec.mjs`에서 정적 가족 수 37을 등록 목록에 따라 검사하도록 바꾸고, 모든 가족의 예시 페이지와 컴포넌트가 390px 및 1280px 폭에서 수평 넘침이 없는지 단언을 추가했다. 최신 등록 수 변경 뒤 문구·제목의 고정 숫자가 낡았고 모든 가족 예시의 작은 화면 overflow가 확인되지 않아 바꿨다. 기존 키보드·포커스·터치 크기·상태 단언은 삭제하거나 완화하지 않았다.
- 최신 main이 전체 카탈로그 버킷을 전체 행 수로 세고 카테고리별 `*-1.json` 페이지로 나누도록 바뀌어, `tests/platform-pregenerate.test.mjs`가 이를 확인하도록 갱신했다. 시험은 24행 페이지 수, 페이지 메타데이터, 페이지 순서와 전체 행을 비교한다.

### 22.2 검증 증거

```text
$ node scripts/platform/baseline.mjs
platform assemblable 1712172 / verified 68018; (401.1s)

$ node --test [F/G 집중 시험·REST/MCP·inventory·pregenerate]
ℹ tests 141 / ℹ pass 141 / ℹ fail 0

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1495 materials, 406 requirements)

$ npm run verify
ℹ tests 1101 / ℹ pass 1096 / ℹ fail 5
비브라우저 시험은 모두 통과. 아래 5개만 Chromium 시작의 Mach IPC Permission denied (1100) / SIGTRAP으로 실패.

$ node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs
AUDIT 통과; DOCS 생성; BUILT static workbench, gallery, schema/catalog API
REPRODUCIBLE: 4738 generated files match a fresh build byte for byte.

$ git diff --exit-code origin/main -- docs/evidence/context/legacy-hashes.json site/v1/catalog.json
exit 0
```

Chromium을 시작하지 못한 시험 이름:

- `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser`
- `stack: gap and align props change the real layout, including the "gap" step`
- `container: width steps cap the real width, full does not, and content is escaped`
- `resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility`
- `4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다`

고정 출력 확인은 기존 legacy-hashes·catalogVersion 시험과 함께 실행한 호환성 테스트 및 `site/v1/catalog.json` 바이트 비교에서 보존됐다. 브라우저 오류는 Codex/macOS `exec_command`에서 관찰된 Mach IPC 시작 거부로, 해당 브라우저 시험은 검증하지 못했다.
그 뒤 E/H/I 통합 최신 main에서 `npm run verify`는 1,052/1,052 통과했고 3,836 생성 파일 재현성도 통과했다(§20.6). 이 결과가 앞선 worktree에서 기록한 Chromium 시작 실패 2건을 대체한다. 별도 `npm run test:browser`는 374 통과·1 실패였고, 유일한 실패는 §20.6에 기록한 기존 `e2e/platform-families.spec.mjs:12` 미디어 측정이다. D4와 무관해 변경하지 않았다.

---

## 23. media(K) 묶음 브라우저 시험 복구 (`e2e/platform-families.spec.mjs:12`, 2026-11-28)

엔진: Claude Sonnet 5.5. D4(Flash 구현, `e7c4058a3`)의 K 묶음이 `npm run test:browser`의 마지막 실패였다. 브라우저를 띄울 수 있는 이 작업자가 원인부터 잡았다.

### 23.1 원인 (재료·규칙까지)

`measureAll({groups: ['media']})`는 media 묶음의 모든 장면·시각 패밀리·모드·폭(마지막 실패 목록 146줄)에서 같은 세 가지를 냈다. 하나는 시각 패밀리 때문에 생기는 것이 아니라 CSS 규칙 두 곳이 원인이다.

| 코드 | 재료 | 규칙 | 원인 |
|---|---|---|---|
| `CLIP_ICON`(2번째 슬라이드 `<img>`), `CLIP_TEXT`(트랙의 "제품 1제품 2"), `OVERFLOW_X`(2번째 슬라이드가 문서 폭 밖) | `purpose:media.carousel` | `.pf-carousel-track{overflow-x:hidden}` | 슬라이드가 `grid-auto-columns:100%`로 가로로 이어지는데 트랙이 스크롤 영역이 아니라 잘라내는 상자였다. 화면 밖 슬라이드가 잘림·넘침으로 측정됐다. 사용자는 단추로만 넘길 수 있었고 손가락 스와이프는 안 됐다 |
| `CLIP_TEXT`(`div.pf-responsive-image`, "멋진 풍경", 20px) | `purpose:media.responsive-image` | `.pf-responsive-image{overflow:hidden}` + `aspect-ratio` 상자 안의 `<p class="pf-image-caption">` | 캡션이 비율 상자 안에 있어서, 이미지가 상자를 채운 뒤 캡션이 상자 밖으로 밀려 잘렸다 |

### 23.2 교정 (`src/platform/families/info-media.mjs`)

- 캐러셀 트랙을 실제 스크롤 영역으로: `overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:none`(막대만 숨김), `data-layout-scroll tabindex="0"`, `:focus-visible` 링. `tabindex=0`은 Chromium이 포커스할 대상이 없는 스크롤 영역을 이미 키보드 정지점으로 만들어, 접근성 순서 시험이 "DOM에 없는 정지점"으로 보았기 때문에 명시했다. 스크롤 이벤트로 `data-current-index`와 `n / m` 카운터를 맞춰 스와이프도 단추와 같은 상태가 된다.
- 반응형 이미지: `<figure class="pf-responsive-figure"><div class="pf-responsive-image">…<img></div><figcaption class="pf-image-caption">`. 캡션이 비율 상자 밖에 놓인다(`.pf-responsive-image` 클래스와 비율 속성은 그대로).
- 시험 임계값·면제·표본은 건드리지 않았다. `PROBE_OPTIONS`, `EXEMPTIONS`, `judge`는 그대로다.

### 23.3 시험

`e2e/platform-families.spec.mjs`에 4건 추가(390px·1280px): 트랙 `overflow-x`가 `auto`이고 스크롤 너비가 넓음, 다음·이전 단추와 `scrollTo`(스와이프)가 모두 카운터를 따라감, 숨은 슬라이드가 문서를 넓히지 않음, 캡션이 비율 상자 아래에 있고 상자 밖 요소임.

RED(결함을 다시 심음):

| 심은 결함 | 결과 |
|---|---|
| 트랙을 `overflow-x:hidden`으로 되돌림 | `measureAll`이 `CLIP_ICON`·`CLIP_TEXT`를 다시 냄, 새 시험 "off-screen slides are scrolled, not clipped" 실패 |
| 캡션을 비율 상자 안으로 되돌림 | `measureAll`이 `CLIP_TEXT`(20px)를 다시 냄, 새 시험 "caption starts below the image box" 실패 |

원래대로 되돌린 뒤 같은 측정은 0건이다.

### 23.4 함께 고친 시험 한 건 (다른 트랙)

`e2e/platform-commerce-components.spec.mjs:22`는 이 작업과 무관하게 `origin/main`(`51f3ff022`)에서 실패했다. D6 이후 Cart Item이 가격을 `component:price-display`로 그려 독립 가격 표시와 합해 2개인데 기대가 1이었다. 기대 수를 2로 고치고 Cart Item 안의 1개를 따로 단언했다. `TASK-TRD-K.crossTrackFiles`에 소유 트랙과 사유를 적었다(CONTRACTS §6.1).

### 23.5 실행 증거

```sh
$ export PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright
$ npx playwright test e2e/platform-families.spec.mjs
18 passed (2.2m)    # 기존 14건 + 추가 4건
```

---

## 24. 검증 조립의 all-pairs 표본 및 210 팔레트 성능 (2026-11-28)

### 24.1 구현과 커버 보장

- `platform-baseline.mjs`는 색 결합과 전체 관계 검사를 통과한 완전한 material tuple에서 결정론적 greedy all-pairs 표본을 만든다. 표본은 모든 허용 factor 값 쌍과 각 후보 값을 포함한다. 선택한 모든 tuple은 기존 `assemblePage()`와 `quality.ok`를 그대로 실행한다.
- `assemblable`의 렌더 없는 전수 수와 계산식은 유지한다. `attempted`는 실제 표본·레이아웃 조립 호출 수, `verified`는 그중 품질 검사 통과 수다. 레이아웃 축 조립과 스타일 재료 구간은 전수 경로다.
- `node --test scripts/platform/platform-baseline-perf.test.mjs`에서 인위적으로 표본 첫 행을 제거하면 테스트가 실패했다(47개 허용 쌍 중 하나 누락: `palette:a × set:a`). 원본 assertion 복구 후 5/5 통과했다.

### 24.2 210종 입력 측정

4092da771의 B1 palette 소스는 이전 main 형식과 호환되지 않아 사용하지 않았다. 대신 main schema의 실제 palette 객체 9개에 고유 ID를 가진 결정론적 palette 201개를 추가한 임시 worktree를 사용했다(등록 210개; 임시 입력만 변경, push하지 않음). 값의 seed는 기존 palette에서 복제했으므로 이 결과는 210개 규모 성능 측정이지 B1의 색상별 호환성 검증은 아니다.

| 패턴 | 전수 허용 조합 | 조립 표본 | 허용 쌍 | 전수/표본 |
|---|---:|---:|---:|---:|
| commerce-listing | 26,138 | 1,890 | 4,103 | 13.83× |
| dashboard-grid | 640,360 | 2,940 | 8,244 | 217.81× |
| docs-reference | 26,880 | 1,680 | 4,104 | 16.00× |
| editorial-article | 45,360 | 2,520 | 5,213 | 18.00× |
| erp-workspace | 367,542 | 2,940 | 7,067 | 125.01× |
| marketing-landing | 477,952 | 3,780 | 7,980 | 126.44× |
| **합계** | **1,584,232** | **15,750** | **36,711** | **100.59×** |

```text
$ time npm run coverage:materials   # 임시 210 palette worktree, 실행 1
Materials: 1696, Requirements: 406, Missing requirements: 54
1836.75s user, 16.05s system, 5:04.24 elapsed

$ time npm run coverage:materials   # 같은 입력, 실행 2
Materials: 1696, Requirements: 406, Missing requirements: 54
2100.67s user, 14.73s system, 3:22.94 elapsed
$ shasum -a 256 docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
88959891810ae5512853075ca2954b99835b80d13e0836f76b81e2009661136f  docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
# 두 실행 전후 SHA 파일 diff exit 0
```

### 24.3 main 일치와 범위 보존

```text
$ time npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1495 materials, 406 requirements)
45.533s elapsed (latest `origin/main` 9ba7fcd79)

$ node --test scripts/platform/platform-baseline-perf.test.mjs
tests 5 / pass 5 / fail 0

$ node scripts/check-generated.mjs
REPRODUCIBLE: 4738 generated files match a fresh build byte for byte.

$ git diff --exit-code origin/main -- docs/evidence/context/legacy-hashes.json site/v1/catalog.json
exit 0
```

baseline 재생성은 `time node scripts/platform/baseline.mjs`로 99.31초에 완료됐고, platform verified는 841/841 quality 통과다. JSON 구조 비교에서 `MATERIAL-COVERAGE.json`과 `baseline.json`은 verified 파생값·설명 외에는 기준 파일과 같았다. 210종 2회 출력 SHA도 같다. DEC-016이 기록한 기존 B1 dashboard-grid 단일 패턴 659.328초는 이번 합성 입력 측정과 구분한다.


## 25. F1 컴포넌트 카탈로그 목록 독립 검증 및 교정 (원 커밋 `59c3cb018`·`ffd309d96`, 브랜치 `upgrade/e4-verify`, 2026-11-28)

구현자는 Chromium을 실행하지 못해 새 Playwright 시험을 미실행으로 남겼다. 이번에 실제 Chromium(`PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright`)에서 돌렸다.

### 25.1 F1 시험 실행

`cd apps/web && npx playwright test e2e/catalog-lists.spec.mjs`: 구현 그대로 9개 모두 통과(`9 passed`). 단, F1이 이 파일에서 **기존의 강한 시험을 지웠다**: 모든 쪽의 ID 집합과 공개 서비스 대조, 쪽 이동 중 서버 컴파일 0 대조, 상세 이동(`/components/hero`) 확인, 분류·검색 URL 복원. 지운 만큼을 아래 새 시험으로 다시 채웠다. 교정 뒤 최종은 `13 passed`다(기존 9 + 새 4).

### 25.2 판정: 빈 차트 탭과 인덱스 범위

- **차트 탭이 비는 원인:** 분류 계산이 Manifest의 일부 계열만 본 것이 아니라, 인덱스 생성기가 차트 프리셋 44종을 아예 읽지 않았고(플랫폼 레지스트리 종류만 순회), 분류도 §6.2 구역(A~O)만 읽어 §9.1 차트 요구를 `charts`로 보내지 못했다. 차트 탭 0개. 같은 이유로 레이아웃 부품 7종(§6.2 L)과 배치 원형 6종도 빠져 있었다.
- **438개 범위 판정: 틀렸다.** 목록 대상은 화면을 만드는 부품·패턴급 재료다. Manifest 1,480개 전체가 아니라(팔레트 436·색 토큰 257·템플릿 85·테마 54 등은 각자의 재료 페이지 소관) 부품급 종류 9가지다. 그 종류의 Manifest 재료 중 `component:page`(루트, 의도적 제외)를 뺀 57개가 인덱스에 없었다: 차트 프리셋 44, 레이아웃 부품 7, 배치 원형 6. 438 + 57 = 495가 맞는 범위이고, 이후 main의 D3 카드·데이터 패밀리 15종이 더해져 현재 **510개**다.
- **검색은 전체 재료 대상**이라는 요구는 지켜진다(검색 색인 510개 전체). 다만 부품 카테고리에 들지 않는 재료(팔레트 등)는 결과 카드의 분류가 `분류 준비 중`으로 보였다. 검색 결과에 분류를 표시하라는 §8.1에 어긋나므로 재료 종류 이름(`팔레트`, `축 값` 등)을 분류로 보이게 했다.
- **대표 렌더가 없는 카드:** 레이아웃 24·기반 컴포넌트 10·상태 패턴 8·미디어 6·배치 원형 일부는 `사전 생성 미리보기 없음`이었다. 모두 실제 출력으로 사전 생성했다(손으로 만든 그림 없음): 차트 `renderChartPreset`, 레이아웃 `assembleSpecimen`, 레이아웃 부품 `assembleComponents`의 `layouts` 경로, 미디어·상태 패턴은 재료 렌더러+재료 CSS, 기반 컴포넌트는 계약을 공유하는 부품의 렌더, 배치 원형은 그 원형을 쓰는 첫 패턴 템플릿의 컴파일 출력. 캐시 키는 `previewKeyOf`에 `kind: 'material'`을 더해 만들었다. 이제 미리보기가 없는 카드는 단독 예제가 없는 구조 부품 4종(`tab`·`lane`·`task`·`plan`)뿐이다.

### 25.3 17개 카테고리별 카드 수(교정 후 인덱스)

| 카테고리 | 수 | 카테고리 | 수 | 카테고리 | 수 |
|---|---|---|---|---|---|
| 전체 | 510 | 데이터 | 22 | 미디어 | 16 |
| 버튼 | 15 | **차트** | **44(교정 전 0)** | 레이아웃 | 42(교정 전 35) |
| 입력 | 8 | 오버레이 | 7 | 업무 패턴 | 6 |
| 선택 | 2 | 피드백 | 25 | 커머스 | 7 |
| 날짜·시간 | 2 | 정보 표시 | 13 | 모바일 | 2 |
| 내비게이션 | 15 | 카드 | 23 | | |

선택·날짜·시간·모바일·업무 패턴이 적은 것은 분류 오류가 아니다. §6.2 C·D·M·O 구역은 요구 중 충족된 것이 각각 8/15·2/8·5/15·2/10이고, 충족된 요구의 재료가 모두 해당 탭에 있음을 시험이 대조한다(`tests/catalog-index-scope.test.mjs`).

### 25.4 390px·1280px 조작 실측

두 폭에서 같은 흐름을 Chromium으로 조작했다: 검색(`bubble`, 결과 카드에 분류 `차트` 표시, 모든 결과에 분류 표시) → 차트 탭(검색어 해제, URL `category=charts`, 24개) → 다음 쪽(20개) → 시각 패밀리 전환 → 뒤로 가기 세 번(패밀리 → 쪽 → 탭 → 검색어 `bubble` 복원) → 새로고침 → `/components?q=hero`에서 카드 클릭 → 상세 `히어로` → 뒤로 가기로 검색 상태 복원. 모든 단계에서 가로 넘침 0(`scrollWidth - clientWidth ≤ 0`). 터치 목표: 탭 17개·검색 입력·검색 버튼·시각 패밀리 선택·쪽 이동 버튼 모두 높이 44px 이상(작은 요소 없음). 17개 탭을 모두 열어 탭 숫자 = 목록 총수 > 0, 카드 수 = min(24, 총수), iframe 0, 동적 미리보기 0, 깨진 이미지 0(lazy 이미지는 즉시 요청해 디코드까지 확인), 대표 렌더 없는 카드 4개 이하, 탭 순회 중 서버 컴파일 0(`/api/dev/perf-counters`)을 확인했다. 전체 목록은 공개 서비스의 부품·목적 패밀리 상세 경로를 모두 포함하고(쪽당 24개 이하, 중복 없음), 모든 카드의 상세 이동 181개가 HTTP 200이다. 상세 페이지가 없는 차트 프리셋·레이아웃류 카드의 상세 이동은 `/materials`로 간다(TASK-TRF-02 소관).

### 25.5 시험과 RED

추가·수정: `apps/web/e2e/catalog-lists.spec.mjs`(+4), `apps/web/features/components/catalog-model.unit.mjs`(+2, `6 pass`), `tests/catalog-index-scope.test.mjs`(신설 5개: 부품급 재료가 인덱스에서 빠지지 않음, 차트 44종, 17개 탭 비어 있지 않음과 §6.2 구역 일치, 카드 미리보기 파일이 `previews-data.json`에 기록된 실제 출력임, 범위), `tests/platform-pregenerate.test.mjs`(F1이 바꾼 청크 계약 `<카테고리>-<쪽>.json`에 맞춰 쪽당 24개 상한·헤더·초과 청크 없음을 단언하도록 갱신). 처음 쓴 범위 시험의 `1480` 하드코딩은 main이 재료를 늘려 곧 깨져 관계 단언으로 바꿨다.

결함을 심어 실패를 확인했다(원복 후 통과): §9.1 분류 정규식을 바꾸면 단위 시험이 실패하고, 인덱스에서 차트 프리셋을 빼면 범위 시험 4개가 실패한다.

### 25.6 전체 검증

- `npm run verify`(최신 main `d69cbfa25` 위): `tests 1106, pass 1106, fail 0`, 마지막 줄 `REPRODUCIBLE: 4833 generated files match a fresh build byte for byte.`, exit 0. `MATERIAL-COVERAGE.json`은 `node scripts/generate-material-coverage.mjs`로 재생성했고 이 변경으로는 바뀌지 않았다(재료 1,495).
- `npm run test:browser`(루트 Playwright, 최신 main `9ba7fcd79` 위 최종 트리): **411개 중 405 통과, 6 실패**. 6건은 모두 D3 카드·데이터 패밀리(`d69cbfa25`) 시험이다: `platform-card-data.spec.mjs:16`, `platform-families.spec.mjs:13`의 card 묶음(`SMALL_TEXT`), `platform-family-a11y.spec.mjs`의 `purpose:card.kpi` 키보드 순서·포커스 표시·가로 넘침 4건. 이 변경은 `src/`·루트 `e2e/`를 바꾸지 않았다. media 묶음과 commerce·EHI 시험은 그 사이 main에 들어온 다른 작업자의 교정으로 통과한다(rebase 전 측정에서는 9건이 실패했다). 카탈로그 목록 시험은 `apps/web` 쪽이라 이 명령에 들어 있지 않고 위 `13 passed`로 따로 통과했다.

## 26. D7 §6.2 M 업무 패턴 구현 (2026-11-28)

### 26.1 구현 범위

- `TASK-TRD-M`의 15개 요구행 각각을 전용 `purpose:work.*` 복합 재료로 등록했다. 필터/검색 도구 모음, 일괄 작업 도구 모음, 데이터 요약/KPI, 승인 패널, 감사 로그, 권한 표, 상태 관리, 설정 폼, 검색 결과, 사용자 관리 표, 작업 목록, 워크플로 단계, 댓글 스레드를 포함한다.
- 합성 렌더러는 기존 등록 부품을 조합하고 선언된 props를 마크업/CSS에 반영한다. 값 검증·HTML 이스케이프, 금지 URL 및 잘못된 권한 값 거부, 중복 ID 방지, 목적별 런타임 포함을 추가했다. REST·MCP는 동일한 Core assemble 경로를 사용하며 독립 시험에서 세 채널 출력과 질의가 일치한다.
- 모든 항목은 실제 Core 출력 프로브를 통과했다. 커버리지 행은 direct 15, missing 0, schema-only 0이며 `outputHash`, prop 변화 및 invalid-input 거부 근거를 보유한다.
- `e2e/platform-work-patterns.spec.mjs`에 390px/1280px 반응형과 검색·작업 완료 상호작용 시험을 작성했다. 요청된 비브라우저 런타임 하네스는 검색 필터와 완료 집계를 실행해 확인한다.
- 사이트 생성물은 DEC-017에 따라 빌드로 갱신하고, 기준선의 등록 수와 조립 측정은 DEC-018에 따라 다시 생성했다. `site/v1/catalog.json` 및 legacy 해시 입력은 변경하지 않았다.

### 26.2 검증 증거

```text
$ node --test --test-name-pattern='선언 prop' tests/platform-work-patterns-blueprint.test.mjs
RED: 기대 data-layout="stacked", 실제 data-layout="inline" — 고정값 결함을 검출
GREEN: 구현을 복구한 뒤 동일 시험 통과

$ node --test [M 집중 시험 및 등록·인벤토리·접근성·coverage]
ℹ tests 136 / ℹ pass 136 / ℹ fail 0

$ jq '[.requirements[] | select(.section == "§6.2 M") | .coverage] | group_by(.) | map({coverage: .[0], count: length})' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
[{"coverage":"direct","count":15}]
$ jq '[.requirements[] | select(.section == "§6.2 M") | select(.workPatternProbe.ok and .workPatternProbe.inputChanged and .workPatternProbe.invalidRejected and (.workPatternProbe.outputHash|length>0))] | length' docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
15

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1510 materials, 406 requirements)

$ node scripts/platform/baseline.mjs
platform families visual 12; purpose 95 registered
platform assemblable 1712172 / verified 841 sampled assemblies (all-pairs)

$ npm run build && node scripts/check-generated.mjs
BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases, test-lab
REPRODUCIBLE: 5014 generated files match a fresh build byte for byte.

$ node --test --test-skip-pattern='resizable panel: keyboard navigation|stack: gap and align props|container: width steps|resizable panel: pointer drag|4\\. Playwright Chromium 실측'
ℹ tests 1126 / ℹ pass 1126 / ℹ fail 0 / ℹ cancelled 0

$ node docs/platform/evidence/components/build.mjs --check
components.md 분류표가 최신입니다.
$ node --test tests/composition.test.mjs tests/materials-registry.test.mjs tests/expression-2-5.test.mjs
ℹ tests 51 / ℹ pass 51 / ℹ fail 0
$ git diff --exit-code origin/main -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json
exit 0
```

브라우저 실행에서 제외한 기존 시험 이름:

- `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser`
- `stack: gap and align props change the real layout, including the "gap" step`
- `container: width steps cap the real width, full does not, and content is escaped`
- `resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility`
- `4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다`

위 다섯 브라우저 시험 및 신규 `e2e/platform-work-patterns.spec.mjs`는 사용자 지시에 따라 실행하지 않았다. 이후 Claude 브라우저 검증이 남는다. 최초 전체 시험은 기준선 갱신 전 stale 등록 수와 사이트 빌드 동시 실행 때문에 실패/경합이 관찰됐다. 기준선을 재측정하고 사이트 생성이 끝난 뒤 프리렌더 시험 8/8 및 기준선 등록 시험을 따로 통과시킨 다음, 최종 전체 Node 회귀를 실행했다.

## 27. TASK-TRD-BCD 폼 입력·선택·날짜/시간 컨트롤

### 27.1 구현과 계약
- §6.2 B/C/D 37개 행은 inventory 분류를 유지해 28 direct, 9 variant로 연결했다. phone·URL은 input-kind variant다.
- 23개 missing/schema 요구에 실제 목적 패밀리와 2.7 opt-in runtime을 연결했다. 네이티브 input/select/fieldset, token 기반 CSS, 상태·검증·ARIA·키보드·44px 터치 목표를 렌더 출력에서 확인했다.
- Blueprint → 컴파일은 Core 조립 마크업과 바이트 동일·결정적이며 Registry·REST·MCP 채널의 목록과 조립 출력도 동일하다.

### 27.2 최신 검증 (2026-11-28, `origin/main` `f3d2f379d` 기준)
- `npm run coverage:materials:check`: `MANIFEST MATCH` (1,534 materials, 406 requirements). §6.2 B/C/D 37행은 direct 28·variant 9, missing·schema 0.
- B/C/D 집중 계약·Blueprint·채널 시험: 213/213 통과. purpose 목록 계약은 119개 live registry 기준이며 200개 페이지 요청으로 Core·REST·MCP 출력 전체를 비교한다.
- `node scripts/platform/baseline.mjs --check`: `BASELINE MATCH` (119 purpose families). `node docs/platform/evidence/components/build.mjs --check`: 207행 최신. legacy 2.1.0·기본 2.4.0·고정 2.4.0/2.5.0 출력과 `site/v1` 경로는 diff 없음.
- `npm run verify`: 1,163 tests, 1,158 pass, 5 fail. 다섯 건은 모두 Chromium이 `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)` 후 `SIGTRAP`으로 종료된 브라우저 시험이다: `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser`; `stack: gap and align props change the real layout, including the "gap" step`; `container: width steps cap the real width, full does not, and content is escaped`; `resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility`; `4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다`. 비브라우저 실패는 없다.
- verify가 test 단계에서 멈춰 후속 단계를 별도 실행했다: `node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs` 통과, `REPRODUCIBLE: 5305 generated files match a fresh build byte for byte.`
- B/C/D 전용 browser E2E(`e2e/platform-family-a11y.spec.mjs`)는 MachPort 사전 점검 차단으로 미실행이다.

## 28. TASK-TRF-02 컴포넌트 상세 9탭·Playground 독립 브라우저 검증 및 교정 (기준 `565c9f37d`, 교정 커밋 `9ab2412f4` 위에서 측정, 2026-11-28)

구현 기록은 Chromium IPC 권한 오류로 새 E2E를 실행하지 못했다. 이번에는 해당 명령 환경에서 `src/ttakkari/agents/browser_preflight.py`를 먼저 실행해 `permissions_allowed`를 확인한 뒤 Playwright Chromium(`PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright`)으로 운영 빌드(`next start`, `WEB_PORT=4342`)를 390px·1280px 폭에서 실제 조작했다. 이 세션에는 설정된 Ttakkari 브라우저 MCP 도구가 붙어 있지 않아 UI도 같은 Playwright로 조작했다. 수치는 `origin/main` `b957dd40a`에 rebase한 `9ab2412f4` 기준이다. 장부의 1480개와 커밋 안 Manifest 1495개는 다르다. 기준 `565c9f37d`에서는 1495, rebase 뒤 `9ab2412f4`에서는 **1534**(`MANIFEST MATCH ... (1534 materials, 406 requirements)`)가 실측이다.

### 28.1 기존 상세 spec 실행과 결함 재현

`WEB_PORT=4342 npm --workspace apps/web run test:e2e -- component-detail-tabs.spec.mjs`를 구현 그대로 실행하니 **2개 모두 실패**했다(`2 failed`). 두 시험 모두 `page.goBack()` 뒤 탭·선택이 사라졌다. 이 실패는 구현자가 브라우저를 돌리지 못해 가려져 있었다.

### 28.2 발견한 결함과 교정 (모두 F2 변경이 원인)

| # | 증상(재현) | 원인 | 교정 | 회귀 시험 |
|---|---|---|---|---|
| 1 | 탭·선택 변경 직후 뒤로 가기가 이전 문서(`about:blank`)로 빠짐. 화면은 즉시 바뀌고 URL은 약 33ms 뒤에 바뀜 | `setActiveTab` 이후 `router.push`가 비동기. 같은 이유로 `history.pushState` 대체도 Next의 지연 동기화와 경합해 약 절반이 실패 | 탭·선택을 `useSearchParams`에서 파생(URL이 원천), 상태 복원용 `popstate` 수동 처리 제거. 페이지는 `connection()`으로 요청마다 렌더해 직접 열기의 첫 HTML도 URL 탭을 씀 | 기존 2개 spec(`--repeat-each=8`에서 16/16) |
| 2 | **기본 Playground 미리보기가 거부됨**: `카탈로그에 없는 content 변형입니다.` iframe 0개 | button-control의 재료 변형 축 이름이 `content`(text·icon-start…)이고 Playground의 자유 텍스트 "예시 콘텐츠" 키도 `content`라 같은 이름이 Core 변형 검증과 충돌 | 예시 콘텐츠 키를 `exampleText`로 분리(UI·render 라우트·`preview-recipes.mjs`·`detail-model.mjs`) | 새 spec "Playground 기본 선택은 ... 충돌하지 않는다": 수정 전 `toHaveCount(1)` 실패(RED), 수정 후 통과 |
| 3 | 같은 선택에서 미리보기를 켜면 선택마다 세션 히스토리가 2칸씩 늘고(`history.length` 2→4→6) 뒤로 가기가 iframe만 되돌려 spec이 60초 타임아웃 | 같은 `<iframe>`의 `src`를 바꾸면 부모 세션 히스토리에 항목이 생김(결함 2가 가리고 있다가 수정 뒤 드러남) | `key={src}`로 새 iframe을 만든다(선택당 +1) | 기존 spec 2번(수정 전 15초 타임아웃 6/6 실패 → 수정 후 18/18) |
| 4 | **시각 패밀리 선택이 출력에 반영되지 않음**: soft/bold/editorial/dense-enterprise/corporate-formal 렌더 바이트 SHA 모두 `26c4c18e` 동일, 플랫폼 경로(`assembleComponentContext`)가 한 번도 실행되지 않음 | `exportComponent`가 `playground`가 빠진 `rawView`를 렌더 모듈에 넘겨 `view.playground?.base`가 항상 비어 있었음 | `{...raw, playground: playgroundContract(type)}`를 넘김 | 새 spec "시각 패밀리 선택은 실제 출력을 바꾸고 Code는 같은 선택의 내보내기와 같다": 수정 전 `expect(bold).not.toBe(soft)` 실패(RED), 수정 후 통과 |
| 5 | 탭 `aria-controls`가 템플릿이 아닌 리터럴 `panel-${tab.id}`, 방향키 이동·roving tabindex 없음 | JSX 속성에 큰따옴표 문자열을 썼고 키보드 계약이 없었음 | 활성 탭만 `aria-controls={`panel-${id}`}`, `tabIndex` 0/-1, ←/→/Home/End는 포커스만 이동하고 Enter·Space가 연다 | 새 spec "탭은 방향키로 ...": 수정 전 `tabindex` 기대 `"0"`, 실제 `""`로 실패(RED), 수정 후 통과 |

### 28.3 완료 기준 항목별 실측

- **9탭·미지원 탭·DOM 부재(390·1280 동일):** button-control 9탭 전부, data-table은 Sizes 없음(8탭), hero는 Overview·Variants·Code·Accessibility·Composition, page는 Overview·Code·Accessibility·Composition. `/components/page?tab=playground`는 Overview로 돌아가고 Playground 조작이 0개. 모든 탭에서 `[role=tabpanel]`은 1개. iframe은 Overview·Variants·States·Sizes·Playground 1개, Tokens·Code·Accessibility·Composition 0개. 가로 넘침 없음(`scrollWidth == clientWidth`: 390, 1280).
- **Variants/States/Sizes 단일 미리보기:** Variants는 solid>outline>soft>ghost>link를 한 개씩 넘기며 iframe은 항상 1개(link는 아래 비호환 사유로 0개). Sizes compact/small/medium/large에서 버튼 높이 28/32/40/48px, iframe은 항상 1개. States loading·disabled는 iframe 1개와 `disabled=true`, pressed는 사유 표시와 iframe 0개.
- **URL·뒤로 가기:** `?tab=sizes&size=large` 직접 열기는 Sizes와 large `aria-pressed=true`. States→Composition 이동 뒤 뒤로 가기 2회가 States, Sizes(large 유지)를 복원하고 앞으로 가기는 States.
- **11축(예시 콘텐츠 포함) 반영, 계산 스타일 증거(1280 기준, 390도 같은 결과):**
  - 팔레트 static-kit→graphite-mono: 버튼 배경 `rgb(33,59,144)`→`rgb(29,30,35)`.
  - 서브토큰 세트 standard→brutalist-contrast: 배경 `rgb(33,59,144)`→`rgb(41,73,179)`, 본문 배경 `rgb(217,219,224)`→`rgb(233,234,237)`.
  - 시각 패밀리 soft→bold: `data-shape` pill→square, 반경 999px→0px, 굵기 700→800, 패딩 `1px 28px`→`1px 20px`.
  - 타이포 mkt-launch→doc-dev-docs: 글꼴 `Helvetica Neue…`→`Seravek, "Gill Sans"…`, 크기 12.75px→12px.
  - 밀도 comfortable→compact: `.kit-platform` 패딩 24px→16px(spacious 32px). 버튼 자체 높이는 같고 컨테이너 여백이 바뀐다.
  - 모드 light→dark: 배경 `rgb(33,59,144)`→`rgb(107,134,225)`, `data-theme` light→dark.
  - 크기 medium→compact: 높이 40→28px. 외형 solid→outline: 배경 투명, 글자색 반전. 상태 default→loading: `disabled=true`, 폭 80→110px. 예시 콘텐츠 `저장`→`결제하기`: 버튼 텍스트 변경.
  - 뷰포트 1280→390: iframe 폭 1056→390px(페이지 폭 390에서는 컨테이너 358px로 잘려 변화 없음, 물리적 한계).
  - 모든 축에서 선택값이 페이지 URL과 iframe `src`에 들어가고, 미리보기 PNG 해시도 달라졌다. 성공 해시만 달라지는 경우는 증거로 쓰지 않았다.
- **비호환:** palette clay-earth × subtoken-set analytics 상태에서 `마젠타 비비드 · 비호환` 옵션이 비활성이고 `title`에 `accentInk vs accentSoft 4.3795:1 < 4.5:1`. 이 조합을 강제 URL(`palette=magenta-vivid&subtokenSet=analytics`)로 열면 선택값은 남지만 iframe 0개와 `렌더되지 않았습니다. Core 검증 결과: ...` 표시. 같은 조합의 `/render`는 404, `/export`는 422(같은 사유). state=pressed(action 버튼)는 `BTN_PRESSED_ACTION`, appearance=link는 `BTN_LINK_SHAPE`로 거부. 계약에 없는 값(`size=huge`, `appearance=neon`, 미등록 palette)은 404.
- **Code = export:** 팔레트·패밀리·모드·크기·외형·밀도·뷰포트·예시 콘텐츠를 바꾼 선택에서 Code의 HTML·CSS·토큰·Blueprint 4개 블록이 페이지가 보낸 `/export` 응답의 `index.html`·`tokens.css`·`tokens.json`·`blueprint.json`과 모두 일치(`true true true true`), 같은 요청을 독립 재호출해도 4개 파일 바이트가 같다. 또 같은 선택의 미리보기 iframe 응답 HTML과 Code의 `index.html`이 바이트 일치(30406바이트).
- **복사·컴파일 증가:** 4개 복사 버튼의 클립보드가 블록 텍스트와 24/24 일치(대기 조건을 `복사했습니다` 버튼 등장·소멸로 고정한 6회×4). 처음 스크립트의 `false` 1건은 `getByText('복사했습니다')`가 이전 버튼 상태와 겹친 스크립트 대기 경합이었다. 컴파일 카운터(`/api/dev/perf-counters`, 처음 보는 선택의 미리보기는 `total=1`로 계측이 비어 있지 않음)는 Code 복사 4회와 Tokens·Accessibility·Composition·Overview 전환 뒤에도 `total=0`(리셋 후), 같은 선택의 Code 진입도 증가 없음.
- **키보드:** Overview에서 →가 Variants로, End가 Composition으로, →가 Overview로 순환하며 포커스가 옮겨지고, Enter로 Variants가 열리며 URL이 `tab=variants`가 된다(`tabindex` 활성 탭만 0).

### 28.4 명령 실행 결과(`9ab2412f4`)

```text
$ npm run web:build
✓ Generating static pages using 17 workers (880/880) in 1467ms   # rebase 후 `9ab2412f4`
$ WEB_PORT=4342 npm --workspace apps/web run test:e2e -- component-detail-tabs.spec.mjs   # 수정 후, --repeat-each=3
15 passed (6.9s)                                                # 시험 5개 × 3회
$ node --test tests/platform-component-context.test.mjs apps/web/features/components/detail-model.unit.mjs apps/web/features/components/detail-export.unit.mjs
ℹ tests 9 / pass 9 / fail 0
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1534 materials, 406 requirements)
$ node scripts/check-generated.mjs
REPRODUCIBLE: 5305 generated files match a fresh build byte for byte.
```

### 28.5 범위 밖 관찰(수정하지 않음)

- 다음 4개 e2e가 실패한다: `explore-components-home.spec.mjs:49·63·98`, `components-studio-roundtrip.spec.mjs:4`. F2 이전의 옛 상세 화면(`허용 속성` 제목, `mode` combobox, `렌더 결과` iframe, `찾기` 버튼)을 기대하는데 `origin/main`의 상세는 그 UI가 없다(`git grep` 결과 해당 문자열이 상세 구현에 없음). 같은 8개 spec 묶음의 나머지 131개는 통과했다. 지시에 따라 단언은 바꾸지 않았고 갱신은 Track G·F의 후속이다. 옛 코드에서 직접 재실행한 대조는 하지 않았다(코드 근거만).
- Variants의 `link` 외형은 기본 family(soft → `shape=pill`)에서 `BTN_LINK_SHAPE`로 거부돼 미리보기가 없다. Core 규칙이 낸 정당한 거부이고 사유는 표시된다.
- Playground의 `shape`·`behavior`·`tone`·`content` 변형 축은 UI 조작 대상이 아니다(11축 목록에 없음).
- 상세 탭 이동과 선택 변경은 여전히 서버에서 페이지 RSC를 다시 요청한다(컴파일 카운터는 증가하지 않는다).

### 28.6 차트 프리셋·레이아웃류 카드의 상세 이동 판정 (최신 main `23e47e5dd` 기준, 2026-11-28)

F1 검증(`34812d226`)이 확인한 대로 `site/catalog-index.json`의 차트 프리셋 44, 레이아웃 24, 레이아웃 부품 7, 배치 원형 6(합 81개)은 `url: '/materials'`다. `/materials`는 팔레트·타이포·스타일 비교 입구일 뿐 이 재료들의 항목이 없다. REQUEST §8.1은 차트·레이아웃을 카테고리로 두고 §8.2는 모든 카드에 "상세 이동"을 요구하므로 **열려야 한다**. 다만 **링크만 틀린 것이 아니라 상세 모델이 받지 못해서** 링크를 고치지 않았다. 실측: 운영 빌드에서 `/components/chart-preset:erp-quarterly-revenue`, `/components/layout:bento`, `/components/stack`, `/components/layout-primitive:stack`은 모두 404, `/components/chart`·`/components/bento`는 200이다(카탈로그 부품 65종만 `generateStaticParams`·`componentView` 대상).

| 종류 | 개수 | 상세 모델에 없는 것 |
|---|---:|---|
| `chart-preset` | 44 | Core 재료 기록(`getMaterial`)은 있다: 변형 `scale`, 토큰 8, a11y, 예시 `chart` 노드, `render.export=renderChartPreset`. 없는 것: `getComponentSpec`(알 수 없는 부품), 상세 라우트의 id 해석, 단독 렌더(`renderChartPreset`은 SVG 조각이라 표준 HTML·차트 CSS 감싸기 필요), 예시 노드 기반 Code 내보내기. States·Sizes·Composition 탭은 데이터가 없어 비노출이 맞다. Playground는 시각 패밀리(기반 구성원 없음)·크기·외형·상태가 불가하고 팔레트·서브토큰·타이포·밀도·모드·뷰포트는 2.7.0 스타일 맥락 경로로 가능해 보이나 미구현·미검증이다. |
| `layout` | 24 | 플랫폼 재료(`getPlatformMaterial`)만 있고 `getMaterial`·`getComponentSpec`이 없다. 변형·상태·토큰 필드가 없고(슬롯·밴드·규칙·관계만), 렌더는 `assembleSpecimen`(표본 조립)이며 Playground 축 입력을 받지 않는다. 필요: 슬롯·관계 중심의 Overview·Composition, 표본 렌더·내보내기 경로. |
| `layout-component` | 7 | `component:stack` 등은 Core 레지스트리에 없고(`getMaterial` 실패), `src/platform/families/layout.mjs`의 `LAYOUT_COMPONENTS`에만 있다. `componentType`(stack, container…)에 해당하는 카탈로그 부품도 없다. 일부는 다른 재료(`layout:equal-grid` 등)와 Blueprint 필드를 가리킨다. 필요: Core 등록 또는 별도 상세 데이터원. |
| `layout-primitive` | 6 | Core 재료는 있으나 변형·상태·토큰·Blueprint가 비어 있다(`render`는 `layoutContractCSS` 키). 9탭 중 Overview·Code·Accessibility 정도만 의미가 있다. |

후속 작업이 필요하다: (1) `/components/[componentId]`가 재료 id(`chart-preset:*`, `layout:*`)를 해석하는 상세 데이터원, (2) 종류별 단독 렌더·내보내기 경로, (3) 데이터가 없는 탭 비노출 규칙 적용, (4) 구현 뒤 카드 `url`을 그 경로로 교체(`scripts/build-catalog-index.mjs` `extraRow`의 `url: '/materials'`와 `urlOf`의 기본값 `/materials`). 이 작업은 소유 트랙(Track A 서비스·Track F 웹·Track G 인덱스 생성)에 걸치므로 §6.1에 따라 TASK-LEDGER에 `crossTrackFiles`를 적고 진행해야 한다. 같은 방식으로 `/materials`로 가는 나머지 종류(기반 컴포넌트 10, 시각 패밀리 12, 서브토큰 세트 25, 아이콘 16, 축 값 79 등)는 REQUEST §8.1의 카테고리 대상 재료인지 별도 판정이 필요하다.
---

## 29. D3 §6.2 F 카드·G 데이터 표시 독립 검증 (원 커밋 `d69cbfa25`, 브랜치 `upgrade/d2-verify`, 2026-11-28)

엔진: Claude Sonnet 5.5. 구현자(GPT Luna)는 Chromium을 띄우지 못해 브라우저 시험을 실행하지 못했고, 구현 직후 `npm run test:browser`는 6건이 실패했다. 이 검증은 Chromium으로 15개 신규 목적 패밀리와 관련 행을 조작해 결함을 찾아 고쳤다.

### 33.1 행별 판정 (F 22행 + G 20행)

`tests/platform-card-data-requirements.test.mjs`가 42행 각각의 렌더 출력이 이름의 뜻을 갖는지 본다. 어느 재료가 어느 행을 맡는지는 MATERIAL-COVERAGE.json의 요구 레코드에서, 행 이름은 REQUEST.md에서 읽는다. 구성은 F 직접 19·변형 3, G 직접 16·변형 3·부분 1로 구현 보고와 같다. 변형 6행(Metric Trend·Media·Settings·Sortable·Selectable·Activity Feed)은 장부가 적은 축 값이 실제로 출력을 바꾸는지 확인한다.

### 33.2 발견 결함과 교정

| # | 행 | 결함 | 교정 |
|---|---|---|---|
| D-01 | Filterable Table | `html.replace('<section class="kit-data-table"', '<section data-table-filterable')`가 `kit-data-table` 클래스를 지웠다. 정렬 연결이 `.kit-data-table`을 찾으므로 헤더 단추를 눌러도 `aria-sort`가 생기지 않았고 표 스타일도 잃었다 | 클래스를 지키고 속성만 더한다 |
| D-02 | Interactive Selection Card | `CARD_SELECTION_RUNTIME`이 기반 카드 런타임이 이미 바꾼 `aria-pressed`를 다시 뒤집었다. 서비스 조립 출력에서 Space·클릭이 아무 일도 하지 않았다(두 번 토글) | 기반이 바꾼 값을 읽어 `data-selected`만 맞춘다 |
| D-03 | Interactive Selection Card | 선택되지 않았는데도 "선택됨" 문구가 보였다 | `data-selected=false`이면 숨김 |
| D-04 | Grouped Table | 그룹 머리글(`th scope=rowgroup`)이 하나의 `tbody`에 여럿 있어 첫 머리글이 모든 그룹의 행을 묶는 것으로 읽혔다 | 그룹마다 `tbody` 하나 |
| D-05 | Review Card | `<p aria-label>`은 이름을 가질 수 없는 역할이라 별점 이름이 전달되지 않았다. 4.5점을 별 5개로 반올림해 채웠다. 인용문에 기본 들여쓰기 | 별은 이름 있는 `role=img`, 숫자는 별도 텍스트, 내림으로 채움, 들여쓰기 제거 |
| D-06 | Notification·Integration Card | 정적 상태 문구에 `role=status`(live region 오용) | 일반 텍스트 |
| D-07 | Comparison·Table titles·Diff | 제목·소제목이 12~15px로 `SMALL_TEXT`(16px 미만) | `max(16px, var(--kit-t-sub))` |
| D-08 | Metric Trend(KPI) | 추세선이 차트 프리셋으로 바뀌며 값 라벨이 8px로 줄고(`SMALL_TEXT`), "데이터 표 보기" summary에 포커스 표시가 없었으며 캡션이 카드 안에 중복 표시됐다 | 값 라벨 없음(`labels:'none'`), summary 44px와 포커스 링, 캡션은 시각적으로만 숨김 |
| D-09 | Tree View | 하위가 있는 항목에 펼침 표시가 없었다 | 닫힘 ▸ 열림 ▾(회전) |
| D-10 | Emphasis(CTA) | `.pf-cta .pf-actions{flex:0 0 auto}`라 좁은 칸(288px)에서 두 버튼이 칸을 64px 넘겼다(D3가 추가한 전체 패밀리 넘침 시험이 처음으로 드러냄) | `flex:0 1 auto;max-inline-size:100%` |
| D-11 | 시험 하네스 | 페이지 조립기(`scripts/families/pages.mjs`)의 런타임 묶음에 정보·미디어, 데이터 표시, 카드 선택 런타임이 없었다. D3의 `platform-card-data.spec.mjs`는 `runtime: true`로 이 동작을 기대하지만 실행되지 않았다 | 세 런타임을 묶음에 추가 |
| D-12 | 시험 | `all purpose families keep the page ... within the viewport`가 `navigation.sidebar`(comfortable 밀도를 받지 않음)에서 조립 실패로 멈췄다. 앞 패밀리에서 먼저 실패해 그 뒤 패밀리는 한 번도 검사되지 않았다 | 받아 주는 첫 밀도로 조립. 모든 패밀리를 계속 검사 |

### 33.3 데이터 표시·카드 조작 (`e2e/platform-card-data-interaction.spec.mjs`, 390px·1280px, 서비스 standalone 출력)

- 선택 카드: Space·Enter·클릭, `aria-pressed`와 `data-selected` 동기, 카드 어디를 눌러도 선택, 초기 selected, disabled, 키보드 포커스 링, 44px.
- 정적 카드 7종: Tab 정지 없음, loading(`aria-busy`+status)·empty(status)·error(alert), 긴 문구 줄바꿈, 가로 넘침 없음, 제목 16px.
- 필터 표: 입력으로 행 줄임, 건수 live region 노드 유지, 빈 결과 문구, 지우면 복원, 입력 칸 44px, 정렬 헤더를 키보드로 눌러 `aria-sort`, 정렬 뒤에도 필터 유지.
- 행 확장 표: Enter·Space로 `aria-expanded` 갱신, 행마다 독립, `aria-controls` 해석, summary 44px.
- 그룹 표: 그룹 머리글 순서와 tbody 분리. 트리: 한 Tab 정지, ArrowRight·Left·Down·Home·End·Enter, 로빙 tabindex, 항목 44px, 펼침 표시.
- 검사기·로그·diff: 매우 긴 값 줄바꿈, 가로 넘침 없음, loading·empty·error 상태.

### 33.4 접근성 E2E 변경 판정 (D3가 바꾼 것)

| 변경 | 판정 |
|---|---|
| `describe('... all 37 purpose families')` → `registered` | 약화 아님. 반복 대상은 원래 `PURPOSE_FAMILIES` 전체이고 제목만 숫자를 적고 있었다. 고정 수를 풀어 새 패밀리가 자동으로 포함된다 |
| 새 시험 `keep the page and their long data within the viewport` | 강화. 다만 위 D-10·D-12 때문에 구현 시점에는 첫 실패에서 멈췄고 이후 패밀리를 실제로는 검사하지 않았다. 고친 뒤 전체 패밀리를 통과한다 |
| 단위 시험(`tests/platform-family-a11y.test.mjs`): 정적 KPI의 Tab 정지 `[]` → `['데이터 표 보기']`, `role=img`의 이름을 `aria-label`뿐 아니라 연결된 `aria-labelledby`도 허용 | 계약 변경에 맞춘 갱신이다. 차트 프리셋이 데이터 표 토글을 가지므로 맞다. 그러나 짝인 브라우저 시험(`platform-family-a11y.spec.mjs:567`)은 0을 그대로 기대해 실패한 채 남았다. 같은 계약(정적 KPI 1, link 2)으로 고쳤다. 이름 허용 확대는 `aria-labelledby`가 접근 가능한 이름인 점에서 타당하다 |
| `EXPECTED_REJECTIONS`에 `purpose:card.selection × editorial·soft·elevated-material·tonal-layered` 추가 | 사유가 있는 거부다. 기반 카드 계약(`CARD_FLAT_SELECTABLE`: flat에는 표면이 없어 선택 테두리가 허공에 뜬다)과 `needs.visual.minBorderW`에서 나온다. 거부를 풀어 보았으나 기반 계약이 막아 되돌렸다 |
| `tests/platform-pregenerate.test.mjs`의 카탈로그 청크 검사(카테고리별 한 파일 → 쪽 나눔 `all-1..N`, `relatedCategories`) | F1(카탈로그 목록 개편)의 구조 변경에 맞춘 것이며 비교 대상(청크 내용이 인덱스 행과 같은지)은 유지된다 |

### 29.5 RED/GREEN

고친 코드에 결함을 다시 심어 시험이 실패하는 것을 확인했고 원복해 통과를 확인했다.

| 심은 결함 | 실패한 시험 |
|---|---|
| 필터 표의 클래스 제거(D-01) | e2e "headers sort with aria-sort", 의미 시험 Filterable Table |
| 선택 런타임을 다시 토글하게(D-02) | e2e "Space and Enter and a click toggle" |
| 그룹 표를 단일 tbody로(D-04) | 의미 시험 Grouped Table |
| 비교 카드 h4 크기 규칙 제거(D-07) | e2e "no text under 16px headings" |
| 데이터 표 summary 포커스 링 제거(D-08) | `platform-family-a11y.spec.mjs`의 `purpose:card.kpi at 390px` 포커스 표시 |
| CTA `flex:0 0 auto` 복원(D-10) | `all purpose families keep the page ... within the viewport` |

### 29.6 남은 한계·범위 밖 발견

- `src/platform/families/index.mjs`를 단독으로 import하면 `PURPOSE_FAMILIES` 초기화 순서 오류가 난다(`3421079e0`에서도 같음). 서비스 진입점으로 불러 오면 문제없어 고치지 않았다.
- Plan Card의 장부 상태는 `assemblable`이다. 노드가 `pricing` 부모를 요구해 단독 컴파일이 안 되기 때문이며 렌더는 템플릿에서 확인했다.

## 30. M 업무 패턴 15행 독립 검증 및 교정 (원 커밋 `041cf5c57`·`f3d2f379d`, 브랜치 `upgrade/e4-verify`, 2026-11-28)

구현자는 새 브라우저 시험을 실행하지 못했다. 실제 Chromium(`PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright`)에서 15행을 행별로 렌더·조작하고 axe로 접근성을 쟀다. **구현 그대로는 구현자 자신의 브라우저 시험 `e2e/platform-work-patterns.spec.mjs`(검색 결과 숨김)가 실패했다**: 행의 `display:flex`가 `hidden` 속성을 덮어 검색해도 행이 사라지지 않았다. 지금까지 GPT 구현에서 반복된 유형(런타임 무동작, 역할 오용, 터치 미달, 숨겨진 상태 영역)이 M에서도 나왔고, 부품 결함 전파(D2·D3 버튼·입력·표)는 아래 표 8·12행에 나온다.

### 30.1 행별 판정과 교정

| M 행 | 결함 | 교정 | 확인 |
|---|---|---|---|
| 1 Filter Toolbar | 필터 버튼의 `aria-pressed`가 클릭해도 바뀌지 않음(런타임 미탑재, 무동작). 텍스트 입력을 품은 묶음이 `role=toolbar`인데 화살표 키 조작이 없음 | 런타임 탑재, 클릭·Enter로 눌림 토글과 `kit-work-filter` 이벤트(검색어·활성 필터). 묶음은 `role=group` | `Filter Toolbar` 시험 |
| 2 Search Toolbar | `div role=search`이고 버튼이 `type=button`이라 Enter도 버튼도 아무 일 없음 | `form role=search`, 제출 버튼 `type=submit`, 제출 시 `kit-work-search` 이벤트와 상태 문구 | `Search Toolbar` 시험 |
| 3 Bulk Action Toolbar | 선택 수·동작 활성 상태가 정적. 사용자 표에서 선택해도 `0개 선택`, 동작은 계속 disabled. `role=toolbar`에 화살표 이동 없음 | 문서의 선택 체크박스를 따라 수·활성 상태 갱신, 동작 클릭 시 `kit-work-bulk-action`, ←→·Home·End 이동 | `Bulk Action Toolbar` 시험 |
| 4 Data Summary | 결함 없음(`dl` 짝 일치) | — | 구조 시험 |
| 5 Dashboard KPI Grid | 결함 없음 | — | 구조 시험 |
| 6 Approval Panel | 결과 영역이 `hidden`이라 숨김 상태에서 글을 넣는 live region(알림 불안정). 결정 뒤 버튼만 disabled 되고 포커스 처리 없음 | 영역을 미리 둔 채 비워 두고(스크린리더 전용 스타일) 글만 채움, 결정 뒤 포커스를 결과 영역으로 이동, 결정 이벤트 | `Approval Panel` 시험 |
| 7 Audit Log | 패턴 루트 `section`과 안쪽 `region`이 같은 이름이라 `landmark-unique` 위반. 표 칸이 한글을 글자 단위로 끊어 모바일에서 `CELL_TOKEN_BREAK` | 안쪽 이름을 `<제목> 표`로 구분(스크롤 영역은 `tabindex=0`), 칸에 `word-break:keep-all` | axe, `platform-families` work 묶음 |
| 8 Permission Matrix | 체크박스 13px(터치 미달), 같은 이유로 표 칸 한글 끊김과 랜드마크 중복 | 체크박스를 44px 라벨 안에 두고 이름 유지, 위와 같은 표 교정 | 44px·axe 시험 |
| 9 Status Management | 저장 버튼이 `type=button`이라 폼이 제출되지 않음(런타임의 submit 처리기가 영영 불리지 않음). 선택 상자 19px, 버튼 28px | 제출 버튼 `type=submit`, 컨트롤 최소 44px | `Settings…` 시험 |
| 10 Settings Form | 같은 이유로 저장·Enter 무동작. 입력 34px | 위와 같음 | 같은 시험 |
| 11 Search Result List | 검색해도 행이 숨겨지지 않음(`display:flex`가 `hidden`을 덮음), 결과 없음 문구도 `hidden` 영역. 링크 높이 25px | `.pf-work [hidden]{display:none}`, 결과 없음 영역을 미리 두고 글만 채움, 링크 44px | 구현자 시험과 `User…·Search…` 시험 |
| 12 User Management Table | 행마다 `role=status`(상태 배지에 live region을 남발하는 역할 오용). 체크박스 13px. 표 칸 끊김·가로 넘침 38px | 배지는 일반 글, 체크박스 44px 라벨, 표를 스크롤 영역 안에 가두고 `min-inline-size:0` | 같은 시험, work 묶음 |
| 13 Task List | 체크박스 레이블 높이 25px | 레이블 44px | 44px 시험 |
| 14 Workflow Steps | 결함 없음(`aria-current=step` 하나) | — | 구조 시험 |
| 15 Comment Thread | 등록 버튼이 `type=button`이라 제출되지 않음. 섹션 이름 중복(`landmark-unique`). 입력 36px, 버튼 28px | `type=submit`, 안쪽 이름을 `<제목> 목록`으로, 44px | 같은 시험, axe |

### 30.2 390px·1280px 실측

15행을 두 폭에서 모두 조작 요소(링크·버튼·입력·선택·텍스트 영역·체크박스 라벨) 높이·폭 44px 이상, 글자 12px 이상, 가로 넘침 0으로 확인했다(`M 15행 390px/1280px` 시험). 교정 전에는 버튼 28px·입력 34px·선택 19px·체크박스 13px·링크 25px가 12행에서 나왔다. axe(`landmark-unique`, `aria-allowed-role`, `label`, `button-name`, `link-name`, `select-name`, `color-contrast`, `scrollable-region-focusable`, `duplicate-id`, `target-size` 등)는 15행 모두 위반 0이고, 시각 패밀리 12종 × 라이트·다크 × 15행 360조합의 `color-contrast`·`target-size`·`aria-allowed-role`·`landmark-unique`도 위반 0이다. `scripts/families` 레이아웃 품질 측정(work 묶음 12패밀리 × 라이트·다크 × 모바일·데스크톱 48쪽)은 교정 전 24쪽이 `CELL_TOKEN_BREAK`/`OVERFLOW_X`로 실패했고 교정 뒤 0쪽 실패다(이 work 묶음 측정은 `e2e/platform-families.spec.mjs`가 돌린다).

### 30.3 시험과 RED

`e2e/platform-work-patterns.spec.mjs`를 2개에서 13개로 늘렸다(기존 2개는 그대로 두었다). 조작 시험은 행마다 새 문서로 열어 런타임이 한 번만 붙게 한다. 결함을 심어 실패를 확인했다(원복 후 13/13): `hidden` 규칙 제거 → 검색 숨김 시험(구현자 시험), 제출 버튼 `type=button` → 검색·설정·상태·댓글 제출 시험, 필터 런타임 미탑재 → 필터 시험, 44px 규칙 제거 → 44px 시험 두 폭, 행 `role=status` → 사용자 표 시험, 안쪽 영역 이름 중복 → axe 시험, 결과 영역 `hidden` → 승인 시험, 일괄 도구 연결 제거 → 일괄 도구 시험. `tests/platform-service-work-patterns-channels.test.mjs`는 런타임 탑재 패턴 목록을 새 동작에 맞춰 세 행(필터·검색·일괄 도구)을 더했다(기대값을 제품 동작에 맞춘 것, 단언 삭제 없음).

교정이 만든 회귀도 기존 시험이 잡았다: 필터·검색 도구 줄에서 입력은 레이블 때문에 키가 커서 버튼이 12px 위로 떠 `platform-family-a11y.spec.mjs`의 '포커스가 화면에서 거꾸로 간다'(Tab 순서) 시험이 실패했고(줄 정렬을 `align-items:flex-end`로 바로잡음), Audit Log의 안쪽 영역에 둔 `tabindex=0`이 기반 표의 스크롤 영역과 같은 위치에 정지를 두 번 만들어 '같은 요소를 두 번 방문' 시험이 실패했다(안쪽 영역의 `tabindex` 제거, 기반 표의 것만 남김). 두 곳 모두 `-g "purpose:work"` 30개가 통과한다.

### 30.4 전체 검증

- `npm run verify`(최신 main `2585cc4e3` 위 최종 트리): `tests 1213, pass 1213, fail 0`, 마지막 줄 `REPRODUCIBLE: 5305 generated files match a fresh build byte for byte.`, exit 0. `MATERIAL-COVERAGE.json`은 `node scripts/generate-material-coverage.mjs`로 재생성했다(재료 1,534).
- `e2e/platform-work-patterns.spec.mjs`: `13 passed`(기존 2 + 새 11). `platform-family-a11y.spec.mjs -g "purpose:work"`: `30 passed`.
- `npm run test:browser`(같은 트리): **540개 중 534 통과, 6 실패. 6건 모두 M 밖이고 `purpose:work` 실패는 0이다.** 실패는 D7 폼 컨트롤(`purpose:form.radio-group`, `purpose:form.radio-card`, `purpose:form.date-range`)의 Tab 순서 시험(390·1280)으로 B/C/D 소관이다. 직전 측정에서 같이 나오던 D3 카드·데이터 6건은 그 사이 main에 들어온 D3 교정(`08bc5b7fe`)으로 풀렸다.
- 기록 사고 하나: 이 절의 첫 push(`1bef72320`)는 로컬 기준 커밋이 낡아 그 사이 main에 올라온 다른 작업자의 변경(D3 교정, Explore·Studio 연결)을 되돌렸다. 바로 알아채고, `2585cc4e3`의 트리에 이 검증의 변경만 다시 얹은 보정 커밋을 이어서 올려 되돌림을 복구했다(강제 push·히스토리 재작성 없음). `1bef72320`을 기준으로 삼은 로컬 작업은 그 사이에 없다고 확인하지 못했다(확인 필요).

## 31. TASK-TRF-07 차트·레이아웃 81종 상세 연결 (2026-11-28)

§28.6에서 보류한 차트 프리셋 44, 레이아웃 24, 레이아웃 부품 7, 배치 원형 6종에 별도 상세 데이터원을 추가했다. `componentRows()`가 이 81개를 정적 라우트 매개변수에 포함하고, `/components/[componentId]`에서 각각 재료 데이터와 실제 Core 렌더 경로를 찾는다. Next 페이지 매개변수의 `%3A` ID는 상세 데이터원에서 정규화한다.

| 종류 | 탭 | Playground 축 | 렌더·내보내기 |
|---|---|---|---|
| 차트 프리셋 44 | Overview, Playground, Tokens, Code, Accessibility | density | 검증 `renderChartPreset` + 생성된 차트 CSS; 2.6.0 chart preset 데이터 내보내기 |
| 레이아웃 24 | Overview, Playground, Code, Composition | density, mode | `assembleSpecimen`의 슬롯 표본 조립 |
| 레이아웃 부품 7 | Overview, Code, Composition | 없음 | `assembleComponents`의 `layouts` 경로 |
| 배치 원형 6 | Overview, Code, Accessibility | 없음 | 원형을 사용하는 카탈로그 패턴 Blueprint 컴파일 |

데이터 없는 States·Sizes·Composition·Tokens·Playground는 종류별로 숨긴다. 탭 패널은 활성 패널 하나만 렌더한다. 차트·레이아웃 동적 출력은 최근 사용 우선 64개 상한 캐시를 쓰고 플랫폼/서비스 계약 버전을 키에 포함한다. 2.1.0·2.4.0 및 `site/v1` 코드는 수정하지 않았다.

검증 증거:

```text
$ node --test apps/web/features/components/material-detail.unit.mjs apps/web/features/components/detail-model.unit.mjs apps/web/features/components/detail-export.unit.mjs
ℹ tests 9 / pass 9 / fail 0
$ node --test --test-skip-pattern='real Chromium browser|real layout|width steps cap|pointer drag|Playwright Chromium 실측'
ℹ tests 1202 / pass 1202 / fail 0 / skipped 0
$ npm run web:build
✓ Generating static pages using 17 workers (961/961)
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1534 materials, 406 requirements)
$ node scripts/check-generated.mjs
REPRODUCIBLE: 5305 generated files match a fresh build byte for byte.
$ node (production next start) fetch of all 81 detail URLs
{"routes":81,"ok":81,"failures":[]}
$ node scripts/build-catalog-index.mjs + 81-card URL comparison
{"expected":81,"matched":81,"missing":0,"wrong":0}
```

앱 브라우저 E2E spec은 실행하지 않았다. 필터를 점검하다 positive `--test-name-pattern`으로 Chromium 하위 테스트 다섯 개를 선택했지만, 모두 Chromium launch 단계에서 Mach IPC `bootstrap_check_in … Permission denied (1100)`로 실패했다. 이후 브라우저 시도를 중단했다. 전체 Node 테스트는 `--test-skip-pattern`으로 다음 다섯 테스트를 제외했다: `resizable panel: keyboard navigation and min/max constraints work in real Chromium browser`; `stack: gap and align props change the real layout, including the gap step`; `container: width steps cap the real width, full does not, and content is escaped`; `resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility`; `4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다`. 새 `apps/web/e2e/component-detail-tabs.spec.mjs`에는 네 종류의 탭 노출과 기본 Preview HTML/Code export 바이트 동일성 확인을 추가했다. 후속 Claude 브라우저 검증 대상이다.

결함 주입 RED: 상세 ID의 percent decoding을 임시 제거하자 URL 인코딩된 `chart-preset%3A...` 조회 단언이 `Cannot read properties of null (reading 'type')`로 실패했다. 디코딩을 복원한 뒤 상세·내보내기 단위 시험은 9/9 통과했다.
---

## 32. D1 §6.2 B 텍스트 입력·C 선택·D 날짜/시간 37행 독립 브라우저 검증 (원 커밋 `632311172`…`b957dd40a`, 브랜치 `upgrade/d1-browser-verify`, 2026-11-28)

엔진: Claude Sonnet 5.5. 지시의 `ttakkari_browser`는 이 세션에 없었고, 지정 preflight(`browser_preflight.py`)는 ttakkari 보호 영역 접근으로 가드가 막아 실행하지 못했다(재시도·우회하지 않음). 프로젝트 Playwright Chromium(`PLAYWRIGHT_BROWSERS_PATH=/Users/winterholic/Library/Caches/ms-playwright`)은 이 세션에서 문제없이 떠서 그 경로로 확인했다. Codex/macOS에서 `MachPortRendezvousServer Permission denied (1100)`로 막혔던 Chromium 의존 시험은 아래 32.5에서 통과한다.

### 32.1 37행 대조
`tests/platform-bcd-requirements.test.mjs`(39건)가 37행 각각의 렌더 출력이 이름의 뜻을 갖는지 본다. 행↔재료는 MATERIAL-COVERAGE.json에서, 행 이름은 REQUEST.md에서 읽는다. 직접 28·변형 9, missing·schema 0, 변형 9건의 축 값(`kind`·`search`·`mode`)이 출력을 실제로 바꾼다. 매핑 교정은 없었다. 다만 다음은 판정으로 남긴다.
- **Combobox(c-03)**는 기반 select의 `search: async` 변형이다. 공급자(`onOptionsRequest`)를 주입하면 로딩·오류·늦은 응답 폐기까지 동작하지만(시험으로 확인), 정적 standalone 출력에는 공급자가 없어 입력해도 목록이 걸러지지 않는다. 정적 사용자에게는 Searchable Select(local)가 입력으로 거르는 쪽이다.
- **Calendar(d-01)**는 `component:calendar` 표시용 월 달력(table 의미 구조)이다. 월 이동·날짜 선택은 없다. 날짜 선택은 Date Picker 이하 네이티브 입력 행이 맡는다.

### 32.2 발견 결함과 교정 (390px·1280px, Chromium)
고치기 전 `e2e/platform-form-interaction.spec.mjs`는 38건 중 24건이 실패했다.

| # | 행 | 결함 | 교정 |
|---|---|---|---|
| D-01 | Rating | `fieldMarkup`에 kind가 안 넘어가 라디오가 아니라 텍스트 입력 5개(20×34)로 그려졌다 | 라디오 5개, 같은 name |
| D-02 | Date Range Picker | 시작일 `max`·종료일 `min`이 렌더 때 값으로 고정되어 사용자가 바꾼 값을 따르지 않았다 | `data-date-range` 런타임이 한계를 옮기고 순서가 뒤집히면 검증 메시지 |
| D-03 | Checkbox Group | 필수 검증 런타임이 `mountControl` 선택자에 없어 마운트되지 않았다. 아무것도 안 골라도 유효 | `src/render/index.mjs` 선택자에 추가 |
| D-04 | 텍스트·날짜·시간·파일·색 입력 전반 | 입력 높이 34px(터치 44px 계약 미달) | 44px |
| D-05 | Radio·Radio Group·Radio Card·Checkbox(+Group)·Switch | 라벨이 컨트롤 위, 컨트롤은 별도 상자 안에 놓였다. 스위치는 큰 체크박스처럼 보였다 | 라벨 옆 한 줄, 줄 전체가 눌림 영역, 스위치는 트랙 모양 |
| D-06 | Schedule Selector | 요일마다 이름이 두 번("월"과 "월요일") 나왔고 접근 가능한 이름은 "월"이었다 | "월요일" 하나 |
| D-07 | Tag Input | 중복 입력도 "새 태그를 입력하세요."로 안내했다 | 중복이면 "X 태그는 이미 있습니다.", 빈 입력은 따로 |
| D-08 | File Input | 키보드 포커스 표시 없음 | 포커스 링 |
| D-09 | DateTime·Month Picker | `min`·`max` 콘텐츠 필드가 없어 경계값을 줄 수 없었다(Date·Time·Week는 있음) | 필드와 범위 검증 추가 |
| D-10 | Searchable Select(local) | 열어도 검색 칸에 포커스가 가지 않아 타이핑이 필터가 되지 않았다(`search` 변수가 async 입력만 가리킴) | local도 검색 칸 포커스. 기반 select 런타임 한 곳(`src/materials/select.mjs`)이며 기존 컨트롤 출력 바이트 시험은 그대로 통과 |
| T-1 | 시험 | `platform-family-a11y.spec.mjs`의 Tab 순회가 네이티브 규칙을 몰랐다. 라디오 그룹은 Tab 정지가 하나인데 모든 라디오를 기대했고, 날짜 입력은 칸마다 Tab을 받는데 한 번만 기대했다. radio-group·radio-card·date-range 6건이 구현 시점부터 실패 | 같은 name 묶음의 정지 하나, 한 컨트롤 안 칸 이동은 한 정지로 센다. 단언(이름·순서·포커스 표시)은 그대로 |

### 32.3 조작 확인 항목 (`e2e/platform-form-interaction.spec.mjs`, 두 폭 41건씩 82건)
24개 패밀리 각각: 가로 넘침 없음, 컨트롤마다 접근 가능한 이름, 터치 44px(체크·라디오는 줄 안쪽 다섯 점을 눌렀을 때 자기 라벨·칸이 받는지까지).
- 텍스트: URL 형식, 통화 min/max/step 경계(0·1000 통과, -1·1001·1.5 거부, 글자 입력 거부), OTP maxlength·pattern(5자리·영문 거부).
- 태그: Enter·쉼표·붙여넣기 추가, 중복·빈 입력 안내, Backspace·삭제 단추(44px), 삭제 뒤 입력 칸 포커스, 제출 값, 필수, 긴 태그 줄바꿈.
- 파일·업로드: 선택기, accept, 드롭 시 허용 형식만 선택·거부 개수 안내, 단일 모드, disabled 무시, `aria-live`.
- 선택: Select 단일·검색·다중(키보드 열기·화살표·Enter·Space·Escape·포커스 복귀·값 제출), 비동기 공급자, 라디오 방향키 한 선택·Tab 정지 하나, 체크박스·스위치 Space, 필수 묶음 검증 메시지·`aria-invalid`, 슬라이더 방향키·Home·End, 범위 슬라이더 교차 방지, 평점 방향키.
- 날짜·시간: date·time·datetime·month·week의 min/max 경계가 네이티브 validity(`rangeUnderflow`·`rangeOverflow`)로 나오고 값이 제출됨, 범위 선택기의 한계 연동과 같은 날 범위, 일정 선택기 요일·시각, 색상.

### 32.4 RED/GREEN
고친 코드에 결함을 다시 심어 시험이 실패하는 것을 확인했고 원복해 통과를 확인했다.
| 심은 결함 | 실패한 시험 |
|---|---|
| Rating kind 제거 | 평점 e2e, 의미 시험 Rating |
| checkbox-group 마운트 선택자 제거 | 체크박스 그룹 e2e |
| date-range 런타임 비활성 | 날짜 범위 e2e |
| 입력 44px 규칙 제거 | `form.date` 터치 시험 |
| local 검색 포커스 제거 | Select e2e |
| 요일 라벨 중복 복원 | 일정 선택기 e2e, 의미 시험 |
| 태그 중복 안내 제거 | 태그 e2e |

### 32.5 Chromium 의존 시험과 실행 증거 (기준 SHA `3871dd0cc` 위에서, 이후 rebase로 `33c1ab813`)
```sh
$ node --test tests/platform-layout-resizable.test.mjs tests/platform-type-fonts.test.mjs
✔ resizable panel: keyboard navigation and min/max constraints work in real Chromium browser
✔ stack: gap and align props change the real layout, including the "gap" step
✔ container: width steps cap the real width, full does not, and content is escaped
✔ resizable panel: pointer drag, 15–85% bounds, no overflow, vertical direction, separator accessibility
✔ 4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다
ℹ tests 12 / ℹ pass 12 / ℹ fail 0
$ npm run verify
ℹ tests 1252 / ℹ pass 1252 / ℹ fail 0
REPRODUCIBLE: 5305 generated files match a fresh build byte for byte.
```
Codex에서 막혔던 다섯 건(위 ✔ 다섯 줄)은 이 환경에서 통과한다. `combos.spec`의 ENOENT 실패 한 건은 같은 `test-results` 폴더를 두 Playwright 프로세스가 동시에 쓴 아티팩트 충돌이었고 단독 재실행은 통과했다.

## 33. TASK-TRD-O 모바일 패턴 10행 구현·Manifest 갱신 (rebase 기준 `cd21f6c99`, 구현 `cb59e7560`, 2026-11-29)

### 33.1 O 10행 지원 경로와 분류

push 전 rebase 뒤 `node scripts/generate-material-coverage.mjs`로 Manifest를 다시 만들었다. 전체 406 요구행 중 18행은 O 바깥에서 아직 missing이다. O는 **direct 8, variant 2, schema 0, part-of 0, missing 0**이며 모든 행이 `catalog-visible`이다.

| O 행 | 분류 | 근거 재료와 경로 |
|---|---|---|
| Mobile Header | direct | `purpose:navigation.topbar` |
| Bottom Navigation | direct | `purpose:navigation.bottom`; E와 같은 이름의 요구 행을 유지하며 재료 공유 |
| Action Sheet | direct | `purpose:mobile.action-sheet` |
| Mobile List Cell | direct | `purpose:mobile.list-cell` |
| Mobile Search | variant | `purpose:form.search`, `{layout: "stacked"}` |
| Mobile Tab Bar | variant | `purpose:navigation.bottom`, `{position: "sticky"}`; Bottom Navigation 재료 공유 |
| Full-screen Dialog | direct | `purpose:mobile.full-screen-dialog` |
| Mobile Filter Panel | direct | `purpose:mobile.filter-panel` |
| Sticky Bottom Action | direct | `purpose:mobile.sticky-action` |
| Safe-area Container | direct | `purpose:mobile.safe-area` |

### 33.2 계약 시험과 채널

O 집중 계약은 선언 prop 출력 변화, 문자열 이스케이프, 잘못된 값 거부, Blueprint JSON 왕복, dialog 키보드 동작, Core·REST·MCP 바이트 동일성을 확인했다. 기존 `size` prop 출력을 medium으로 고정해 `declared button size changes its actual output` 단언이 실패하는 RED를 확인하고 원상 복구 후 통과했다. 집중 시험은 146/146, 전체 비브라우저 Node 시험은 최종 rebase 기준 1258/1258 통과했다.

### 33.3 390px·1280px 관측과 미실행

앞선 Ttakkari 브라우저 수동 관측에서 Action Sheet와 Full-screen Dialog는 모달로 열리고 Escape 뒤 트리거에 포커스가 돌아왔다. Filter Panel은 검색 조건에 따라 live status가 `1개 조건 표시`로 바뀌고 Escape로 닫혔다. 검색 입력은 390px·1280px에서 값을 받았다. Safe-area 버튼은 두 폭 모두 44px이며 컨테이너 안에 놓였다. 본문 끝과 Sticky Bottom Action 사이 간격은 390px에서 42px, 1280px에서 54px였다.

`e2e/platform-mobile-patterns.spec.mjs` 자동 Chromium E2E는 **사용자 지시에 따라 미실행**이다. 클릭 뒤 `aria-current` 전환과 Tab/Shift+Tab 포커스 순환은 **확정하지 못했다**. 후속 Claude 독립 브라우저 검증이 남았다. 앞선 Chromium 시작 오류는 Codex에서 `MachPortRendezvousServer: Permission denied (1100)` 및 `SIGTRAP`이었으며 이번 작업에서는 Chromium·Playwright를 재실행하지 않았다.

### 33.4 Manifest·정적 산출물·호환 불변

```text
$ node scripts/generate-material-coverage.mjs
Materials: 1540, Requirements: 406, Missing requirements: 18

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1540 materials, 406 requirements)

$ node docs/platform/evidence/components/build.mjs --check
components.md 분류표가 최신입니다.

$ node scripts/check-generated.mjs
REPRODUCIBLE: 5379 generated files match a fresh build byte for byte.
```

`site/v1/catalog.json`과 `docs/evidence/context/legacy-hashes.json`은 `origin/main` 대비 변경이 없다. 2.1.0 고정 전체 출력 byte-for-byte 시험과 기본 2.4.0 opt-in 비브라우저 시험도 통과했다.


## 34. 옛 상세 UI 기대 e2e 4개의 갱신과 새 UI 결함 교정 (기준 `58d4c11cf`, rebase 후 TASK-TRF-07 반영 main 위, 2026-11-29)

§28.6의 차트·레이아웃 판정은 이후 TASK-TRF-07(§31)이 상세 라우트를 연결해 대체됐다. §28.5가 범위 밖으로 남긴 실패 4개(`explore-components-home.spec.mjs` 49·63·98줄, `components-studio-roundtrip.spec.mjs` 4줄)를 새 상세 UI 기준으로 옮겼다. 각 시험은 구현 그대로 실패(RED)했고, 옮기는 과정에서 새 UI에 같은 기능이 없는 곳을 결함으로 보고 고쳤다.

### 34.1 시험별 의도와 새 UI의 대응

| 시험 | 원래 의도 | 새 UI의 같은 기능 | 단언 변화 |
|---|---|---|---|
| explore-components-home 49 | 목록 검색 → 상세, 허용 속성 표, 놓을 수 있는 자리, 렌더 결과, 없는 ID는 404 | 목록 `검색` 버튼(F1이 `찾기`를 바꿈), Overview의 `허용 속성` 표와 기본 컴파일 iframe, Composition 탭의 `허용 부모`·`허용 자식` | 6개 → 8개(놓을 수 있는 자리를 부모·자식 2개로 나눔) |
| 63 | select-control·data-table 계약: `재료 계약`, `multiple + async`, 토큰, `mode` 변형 축, 좁은 뷰포트, iframe, render 라우트 | Overview(제약과 미지원), Tokens 탭, Playground의 `mode (부품 변형)`·`뷰포트` 390 선택과 단일 미리보기 폭 | 모두 유지, 변형 축 옵션 `single·multiple`·라이트·다크 옵션 `light·dark`·iframe 폭 390px 추가 |
| 98 | 미리보기 안에서 select 키보드 런타임과 표 정렬 런타임 실행 | Playground 미리보기 iframe(`select-control 컴파일 미리보기`) | 단언 동일, 대상 iframe만 교체 |
| components-studio-roundtrip 4 | 변형 축 선택 → Studio 링크 → 미리보기 반영 → 편집 보존 → 내보내기 | Playground의 부품 변형 축 선택(`mode (부품 변형)`·`search`·`maxMenuHeight`)과 `선택한 부품을 Studio에서 열기` 링크 | 단언 동일, 링크 갱신 대기 1개 추가 |

### 34.2 새 UI에 없어서 고친 것 (모두 F2 구현의 결함)

1. **허용 속성 표 없음**: 옛 화면의 모든 속성·제약 표가 Accessibility의 필수 속성 요약으로만 남았다. Overview에 `허용 속성` 표를 복원했다. 같은 이유로 `제약과 미지원`(`forbidden:`/`unsupported:` 태그, 예: `multiple + async`)·반응형·Blueprint 연결과 Composition의 필요/금지 페이지 유형을 되살렸다.
2. **Playground가 10개 중 9개 부품에서 기본 선택부터 거부됨**(실측: button-control만 iframe 1개, 나머지는 `appearance는 family:soft가 filled로 고정합니다`, `Table requires a safe id`, `카탈로그에 없는 state 변형입니다`). 원인은 기본값 변형을 항상 props로 보내 시각 패밀리의 고정 속성을 덮어쓴 것, 예제 `id`를 내용에서 뺀 것, 상태를 재료 상태 목록 첫 값으로 덮어쓴 것이다. 기본값과 다른 변형만 보내고 예제 내용·상태 기준을 고쳤다. 수정 뒤 10개 모두 iframe 1개(`e2e/component-detail-tabs.spec.mjs` 새 시험).
3. **변형 축 선택 불가**: 11축 밖의 부품 변형(shape, behavior, search, maxMenuHeight 등)을 고를 방법이 없었다. Playground에 `부품 변형 축` 그룹을 두고, Variants 탭은 외형 축이 없는 재료(select-control)에서 첫 비크기·비상태 축을 비교하게 했다. States 탭은 렌더 계약에 없는 상태(hover·focus·active)를 비활성+사유로 막는다.
4. **키 충돌**: select-control의 `mode`, data-table의 `density`가 라이트·다크·밀도 축과 같은 이름이라 `라이트·다크` 선택에 `single·multiple`이 나왔다. 겹치는 변형 축만 `variant.` 접두사로 구분한다(`apps/web/lib/api/variant-keys.mjs`). 경로형 `/render/mode~multiple`은 그대로 동작한다.
5. **Studio 링크 없음**: 상세에서 Studio로 가는 링크(`componentAxes`)가 없었다. Playground에 복원했다.
6. **상호작용 런타임 없음**: Playground·Code의 HTML에 `<script>`가 없어 select 목록·표 정렬이 동작하지 않았다(CSP도 `script-src` 없음). `assembleComponentContext`가 `assembleComponents`와 같은 `formRuntime + controlRuntime`을 붙이고 CSP에 `script-src 'unsafe-inline'`을 둔다(미리보기와 Code는 같은 바이트).
7. **360px에서 9개 탭이 화면 밖으로 나감**(`e2e/layout-quality.spec.mjs`가 `/components/<type>` 28곳에서 `#tab-composition` 넘침 검출): 탭 목록을 줄바꿈으로 바꿨다(새 시험: 수정 전 오른쪽 끝 476px, 수정 후 360px 이하).

### 34.3 실행 결과

```text
$ WEB_REUSE=1 WEB_PORT=4342 npm --workspace apps/web run test:e2e -- explore-components-home.spec.mjs components-studio-roundtrip.spec.mjs a11y.spec.mjs perf-budget.spec.mjs shell.spec.mjs catalog-lists.spec.mjs
81 passed (1.4m)
$ npm --workspace apps/web run test:unit            # tests 92 / pass 92
$ node --test tests/platform-component-context.test.mjs apps/web/features/components/detail-model.unit.mjs apps/web/features/components/detail-export.unit.mjs   # tests 9 / pass 9
$ node scripts/check-generated.mjs                  # REPRODUCIBLE: 5305 generated files match a fresh build byte for byte.
$ npm run coverage:materials:check                  # MANIFEST MATCH (1534 materials, 406 requirements)
```

### 34.4 `npm run test:browser`(루트 e2e 전체, `PW_PORT=4399`)와 `apps/web` 전체 e2e의 남은 실패 (F2 상세와 무관)

- 루트 `test:browser`: **476 passed, 15 failed**(11.3분). 15개는 모두 목적 패밀리·플랫폼 페이지다: `platform-card-data.spec.mjs:16`(`.pf-card-selection`의 `data-selected`), `platform-families.spec.mjs:13`(`button.emphasis @1280: component overflow`), `platform-family-a11y.spec.mjs` 12개(card.kpi 포커스 표시 4, form.radio-group·radio-card·date-range Tab 순서 6, work.filter-toolbar 화면 순서 2, 폰 폭 넘침 1, 카드 상호작용 1), `platform-work-patterns.spec.mjs:21`(검색 결과 행 숨김). `src/service` 변경을 걷어낸 상태에서 대표 4개(card-data, work-patterns, radio-group, filter-toolbar)가 같은 실패로 재현됐다. 소관: D3(카드·데이터 §6.2 F·G: card.kpi, 카드 선택, 데이터 패턴), TASK-TRD-BCD(radio·date-range), D7 M(work 패턴), 패밀리 레이아웃(button.emphasis 넘침).
- `apps/web` 전체 e2e: 253 passed, 4 failed, 1 skipped. 이 중 `layout-quality.spec.mjs:10`은 상세 넘침(위 7번)을 고친 뒤 `/components` 카테고리 탭 컨테이너(F1) 넘침만 남았다. `previews-parity.spec.mjs:37`은 `purpose:overlay.contextual-help` 정적 미리보기 불일치, `w6b-scenarios.spec.mjs:130` 2개(390·1280)는 F1 이전 목록 UI(`li[data-purpose]`, `쪽 이동`)를 기대한다. 모두 상세 구현 밖이라 고치지 않았다.
- `npm --workspace apps/web run test:boundary`는 9개 중 1개 실패한다(`preview-recipes.mjs`가 `src/service/component-context.mjs`를 직접 import). F2 이전부터의 구현 결정이다. `service` 진입점으로 재노출하면 공개 번들(`scripts/build.mjs`가 이 파일을 제외)이 깨지고, 진입점을 늘리면 경계 규약(`service`·`edit`만)에 어긋난다. Track A·G의 결정이 필요해 손대지 않았다.

### 34.5 TASK-TRF-07 반영 main(`cd21f6c99`)으로 rebase한 뒤 다시 잰 값

- `component-detail-tabs.spec.mjs`(TRF-07의 차트·레이아웃 시험 포함) + `explore-components-home` + `components-studio-roundtrip` + `catalog-lists` + `a11y` 묶음: 62 passed, 1 failed. 실패 1개는 `explore-components-home.spec.mjs:31`(Explore 상세): `/explore`의 첫 카드가 `/explore/materials`(`18d6338dc`가 추가한 재료 입구)가 돼 `.first()` 선택이 `/render`가 없는 주소를 집는다(404). 상세 구현과 무관해 고치지 않았다.
- `layout-quality.spec.mjs:10`: 상세 페이지(차트·레이아웃 포함) 넘침은 없고 `/components` 카테고리 탭 컨테이너(F1) 넘침만 남았다.
- `npm --workspace apps/web run test:unit` 95/95, 상세·Core 단위 9/9, `check-generated` REPRODUCIBLE(5305), `coverage:materials:check` MANIFEST MATCH(1534), `test:boundary` 8/9(위 §34.4의 기존 1건).

## 35. O §6.2 모바일 패턴 10행 독립 브라우저 검증 (원 커밋 `cb59e7560`·`a1b8c4bd3`·`eb72531f7`, 브랜치 `upgrade/o-browser-verify`, 2026-11-29)

엔진: Claude Sonnet 5.5. 프로젝트 Playwright Chromium(`chromium-1248`)이 이 세션에서 정상으로 떴다. Codex 샌드박스의 `MachPortRendezvousServer Permission denied (1100)`는 재현되지 않았다. 원 저장소에 링크하지 않고 새 worktree(`../dsk-up-o-verify`)에서 `npm ci`로 설치해 검증했다.

### 35.1 10행 판정 (Manifest `req:comp:o-01`…`o-10` 직접 읽기)

`tests/platform-family-mobile.test.mjs`의 새 시험이 Manifest에서 O 10행을 읽어 direct 8·variant 2, 모두 `catalog-visible`, 모든 재료가 렌더되고, variant 2행의 축 값(`layout=stacked`, `position=sticky`)이 같은 축의 다른 값과 다른 출력을 내는지 단언한다. 판정은 실제 렌더를 Chromium에서 열어 본 결과다.

| O 행 | 분류 | 판정 | 근거·발견 |
|---|---|---|---|
| Mobile Header | direct (`navigation.topbar`) | 충족(390px) | 390px에서 44px 토글로 접히고 열기·Escape 닫기·포커스 복귀·펼친 링크 44px 이상. 1280px은 데스크톱 가로 메뉴라 링크 36px(모바일 터치 대상 아님). `sticky` 변형은 결함 D-04로 안 붙었다 |
| Bottom Navigation | direct (`navigation.bottom`) | 충족 | 모든 칸 클릭·Enter 뒤 `aria-current`가 정확히 하나로 옮겨지고 Tab·Shift+Tab이 칸 순서대로 이동. 56px 칸 |
| Action Sheet | direct (`mobile.action-sheet`) | 결함 교정 뒤 충족 | 열기·Esc·트리거 복귀는 처음부터 맞았다. 포커스 가두기가 거짓이었다(D-01). 아래쪽 safe-area 여백 누락(D-05) |
| Mobile List Cell | direct (`mobile.list-cell`) | 결함 교정 뒤 충족 | 제목 블록 아래에 전체 폭 버튼이 놓여 "한 행"이 아니었고 `accessory`·`density` 축이 화면에 아무 차이도 없었다(D-03) |
| Mobile Search | variant (`form.search` `{layout: stacked}`) | 결함 교정 뒤 충족 | 축 값은 출력을 바꾼다(버튼이 아래 줄 전체 폭). 입력 칸 36px·입력 34px로 터치 44px 미달(D-02) |
| Mobile Tab Bar | variant (`navigation.bottom` `{position: sticky}`) | 결함 교정 뒤 충족 | `data-sticky`만 붙고 스크롤해도 붙지 않았다(D-04). 라벨형 링크 내비게이션이며 `role=tablist` 탭이 아니다. 탭 패널 의미는 `navigation.tabs`가 맡는다 |
| Full-screen Dialog | direct (`mobile.full-screen-dialog`) | 충족(포커스 가두기 교정) | 390px에서 viewport 전체(390×844), 1280px에서 중앙 대화상자(계약 문구와 같다). D-01 |
| Mobile Filter Panel | direct (`mobile.filter-panel`) | 결함 교정 뒤 충족 | 검색해도 걸러진 옵션이 계속 보였다(D-06) |
| Sticky Bottom Action | direct (`mobile.sticky-action`) | 결함 교정 뒤 충족 | 래퍼가 가둬 안 붙었고(D-04) 하단 바와 같이 쓰면 가렸으며(D-07) 주요 동작이 soft 외형이었다 |
| Safe-area Container | direct (`mobile.safe-area`) | 충족 | `max(기본 여백, env(safe-area-inset-*))`. 실제 inset>0은 이 세션에서 만들 수 없어 CSS 단언으로만 확인(35.5) |

### 35.2 발견 결함과 교정

고치기 전 `e2e/platform-mobile-patterns.spec.mjs`의 원래 3건은 2건이 실패했고(다음 35.3), 아래 결함은 처음엔 시험이 없어 못 잡았다.

| # | 행 | 결함 | 교정 |
|---|---|---|---|
| D-01 | Action Sheet·Full-screen Dialog·Filter Panel | "native modal dialog가 포커스를 가둔다"는 거짓이었다. Tab 3~4번에 한 번씩 포커스가 문서 body(브라우저 UI)로 나갔다 | 런타임에 Tab keydown 순환(끝↔처음, 다이얼로그 밖이면 첫 칸). Escape 닫힘·트리거 복귀는 원래 맞았다 |
| D-02 | Mobile Search | stacked의 선택 트리거·입력 칸 36px, 입력 34px | stacked에서 칸·버튼 44px(입력 42px+테두리) |
| D-03 | Mobile List Cell | 제목 아래 전체 폭 버튼(56×366)이라 한 행이 아니었고 chevron·none, comfortable·compact가 픽셀까지 같았다 | 제목 블록 옆에 동작 버튼을 두는 한 행, chevron은 `::after` 글리프(none은 없음), compact는 44px 행 |
| D-04 | Mobile Tab Bar·Sticky Bottom Action·Mobile Header(sticky) | 목적 래퍼(`div.pf`)가 부모 크기를 자기 높이로 만들어 `position:sticky`가 스크롤 중 붙지 않았다 | 세 래퍼를 `display:contents`. 같은 컨테이너 안 본문 뒤에서 viewport 아래(844)에 붙는다 |
| D-05 | Action Sheet·Filter Panel | 640px 이하 아래 시트의 아래 여백에 `safe-area-inset-bottom`이 없었다(Full-screen만 있었다) | 시트 규칙에 상하좌우 inset 추가 |
| D-06 | Mobile Filter Panel | 검색어를 쳐도 `hidden` 옵션이 `display:flex`에 져서 화면에 그대로였고 상태 문구("1개 조건 표시")만 바뀌었다 | `label[hidden]{display:none}` |
| D-07 | Sticky Bottom Action + sticky Bottom Navigation | 두 바가 모두 `bottom:0`이라 D-04를 고치면 액션이 하단 바에 가려졌다(액션 746–844, 바 778–844) | 하단 바 높이를 런타임이 `--pf-bottom-bar-h`로 올리고 액션이 그만큼 위로 올라간다(액션 680–778, 바 778–844) |

보조 교정: Sticky Bottom Action의 주요 버튼을 soft에서 solid로 바꿨다(주요 동작이 배경에 묻혔다).

### 35.3 e2e 시험 자체의 결함과 바꾼 시험

구현 직후 `e2e/platform-mobile-patterns.spec.mjs`를 처음 실행했을 때 3건 중 2건이 실패했고, 모두 제품이 아니라 시험의 결함이었다. 바꾼 부분과 원래 확인 내용은 다음과 같다. 기대값은 낮추지 않았다.
- `page.setContent`를 같은 window에 반복해 런타임의 한 번 실행 플래그(`window.__kitMobileDialog`)가 남아 두 번째 패턴(Full-screen Dialog)이 안 열렸다. 같은 저장소의 `platform-card-data-interaction.spec.mjs` 규약대로 `about:blank`를 거치는 `fresh()`로 바꿨다. 원래 확인(열기·Esc·포커스 복귀·Escape 뒤 트리거 포커스)은 그대로다.
- 검색 폼의 `getByRole('button')`이 지우기 버튼과 검색 버튼 2개에 걸려 strict mode로 실패했다. 이름이 `검색`인 제출 버튼을 지정했다(활성화 확인은 그대로).
- Filter Panel에서 `fill('active')`는 사용자에게 보이지 않는 값(`active`)으로 검색했지만 런타임은 화면 라벨(`활성`)로 거른다. 검색어를 `활성`으로 바꾸고, 원래의 "1개 보임·`1개` 상태 문구"에 "없는 조건이면 0개·비우면 2개"를 더했다.
- 다이얼로그의 버튼 높이 44~64px 단언에 hidden인 지우기 버튼(높이 0)이 들어가 있었다. 화면에 보이는 버튼만 세도록 했다(범위 44~64px는 그대로).

### 35.4 회귀 시험과 RED·GREEN

새 e2e 6건(총 9건)과 node 3건을 추가했다. 교정 전 소스(`origin/main`의 `mobile.mjs`·`navigation.mjs`·`form.mjs`)로 되돌리고 e2e를 돌리자 새로 쓰거나 고친 시험 5건이 실패했다.

| 시험 | RED 때 실패 메시지 |
|---|---|
| overlays keep Tab and Shift+Tab inside the dialog | `purpose:mobile.action-sheet Tab #3 left the dialog at 390px` |
| Mobile Search stacked keeps 44px touch targets | `{"tag":"kit-select-trigger","height":36…} under 44px at 390px` |
| Mobile List Cell is one row… | `title block and action are on separate lines at 390px` |
| sticky Bottom Navigation and Sticky Bottom Action stay pinned… | `Mobile Tab Bar (sticky) leaves the viewport at 390px` |
| Action Sheet, Full-screen Dialog and Mobile Filter Panel…(교정한 원 시험) | `toHaveCount(1)`(걸러도 2개 보임) |
| 같은 시험, D-07만 되살림(`body:has` 규칙 무력화) | `sticky action (746.2-844) overlaps the bottom bar (778-844) at scroll 0, 390px` |

node RED: D-05·D-06 단언과 D-04·D-07 단언이 원래 소스에서 `✖` 2건으로 실패하고 교정 소스에서 통과한다. Manifest 10행 시험은 결함 회귀가 아니라 판정 근거라 RED 대상이 아니다(원래 소스에서도 통과).

### 35.5 실측과 한계

390px·1280px 모두에서 가로 넘침 0, 터치 대상 44px 이상(교정 뒤 O 재료 전부, Mobile Header 1280px 제외), Escape 닫기·트리거 포커스 복귀, Tab·Shift+Tab 순환, 하단 바 `aria-current` 전환, 하단 바·액션 겹침 0을 실제 조작으로 확인했다.
- 하지 않음: `env(safe-area-inset-*)`가 0이 아닌 실제 기기(헤드리스 Chromium은 inset을 줄 수 없다). 여백 계산식은 CSS 단언으로만 확인했다.
- 하지 않음: 시트·대화상자의 backdrop 클릭 닫기. 계약에 없는 동작이라 요구하지 않았고 지금은 닫히지 않는다(참고).
- Mobile Header의 1280px 링크 36px은 데스크톱 레이아웃이라 손대지 않았다.
- sticky 바의 하단 바 높이 보정은 런타임(`ResizeObserver`)이 있을 때 정확하다. 런타임이 없으면 56px 기준 CSS 대체값이다.


---

## 36. TASK-TRF-06 Explore 필터·비교 및 Studio 재료 선택 독립 브라우저 검증 및 교정 (원 커밋 `18d6338dc`·`2585cc4e3`, 교정 커밋 위 main 기준, 2026-11-29)

구현 기록은 Codex 샌드박스에서 Chromium을 시작할 수 없어 브라우저 시험이 모두 미실행이었다. 이번에는 새 worktree(`dsk-up-f3v`, `origin/main` `2585cc4e3`에서 분기)에서 `npm ci` 후 운영 빌드(`next build` → `next start`)를 Playwright Chromium으로 390px·1280px 두 폭에서 실제 조작했다. 모든 판정은 주소 해시가 아니라 화면에 붙은 조립 요청(`data-request`), 실제로 컴파일된 standalone 문서의 계산 스타일·DOM 구조, 그려진 `<img>`로 한다.

### 36.1 구현 그대로의 실행 결과

`WEB_PORT=<빈 포트> npm --workspace apps/web run test:e2e -- material-explorer-studio.spec.mjs`를 구현 그대로 실행하니 4개 중 **3개가 실패**했다(`3 failed, 1 passed`).

| 시험 | 실패 원인 | 구분 |
|---|---|---|
| Explore 재료 비교 | `style=work-console`은 등록된 디자인 맥락이 아니다(실제 id는 `console`). 왼쪽·오른쪽 값도 select가 쓰는 짧은 값이 아니라 `palette:ocean-cool` 형태로 기대했다 | 시험 결함 |
| Studio 선택 복원 | `getByLabel('컴포넌트')`가 "컴포넌트 패밀리"와 겹쳐 strict mode 위반. 더 깊게는 `component=data-table`이 같은 카드를 3개 놓는 요청이 되어 Core가 거부하는 조합이다(Studio 선택지에서도 비활성이어야 하는 값). `layout=dashboard-grid`는 D-1 때문에 거부된다 | 시험 결함과 제품 결함(36.2 D-1) |
| 아이콘 영역 | 목적을 고르지 않은 채 `step=swap`을 열어 단계가 `purpose`로 되돌아가 select가 없다 | 시험 결함 |
| 시각화 비교 | 통과했다. 그러나 두 iframe 안은 `include는 허용된 이름의 배열이어야 합니다.`와 `축 최댓값이 데이터보다 작아 값이 잘립니다.`를 돌려주는 HTTP 404였다. 시험은 iframe 개수와 select 값만 봤다 | 제품 결함(D-3), 시험이 결함을 가렸다 |

### 36.2 발견한 제품 결함과 교정

| # | 결함 | 증거 | 교정 |
|---|---|---|---|
| D-1 | Studio·Explore의 레이아웃 선택이 Core 요청에 `pattern: "layout:dashboard-grid"`로 실려 항상 거부된다. Core의 `pattern`은 페이지 패턴 id(`dashboard-grid`)만 받는다. 레이아웃 24개가 모두 비활성이었고, 구현의 단위 시험은 이 틀린 값(`layout:dashboard-grid`)을 정답으로 단언했다 | `assembleDesign({purpose:'work-dashboard', pattern:'layout:dashboard-grid'})` → `work-dashboard 목적은 패턴 layout:dashboard-grid을 쓰지 않습니다`. `pattern:'dashboard-grid'`는 통과 | `patternOfLayout`과 `LAYOUT_PAGE_PATTERN`(레지스트리 `reuses: pattern:*` 6개)로 변환한다. 표가 레지스트리와 같은지 단위 시험이 대조한다. 페이지 패턴이 없는 레이아웃 18개는 이유를 붙여 비활성으로 둔다 |
| D-2 | Explore 필터 중 밀도·셸·폭이 조립 상태에 닿지 않는다. select 값이 `axis-value:density.compact` 전체 id인데 주소 읽기는 짧은 값만 받는다. "간격 토큰" select는 아예 다른 이름(`spacing`)으로 보내져 무시된다. 제출 뒤 select가 비어 돌아온다 | 1280px에서 밀도·셸·폭 필터를 골라 제출 → 결과 요청에 키 없음, select 값 소실 | 값을 짧은 값으로 통일하고 밀도 축을 하나(`density`)로 합쳤다. 예전 공유 링크의 전체 id와 `compare=density`는 그대로 받는다 |
| D-3 | 시각화 비교 미리보기가 둘 다 404. `compileBlueprint`에 `include:['standalone']`을 넘겼는데 허용값이 아니고, 프리셋 예시의 축 범위(`axis.max`)가 공통 표본을 잘라내는 프리셋도 있다. 비교 가능한 프리셋도 44개 중 막대·선·영역 10개로 줄여 두었다 | `GET /explore/chart-preview/marketing-channel-roas` → 404, 본문이 오류 문구 | 별도 라우트(iframe)를 지우고 Core 조립 경로(`assembleDesign`의 `content.charts[{preset,...}]`)로 같은 표본을 두 프리셋에 넣어 `<img>`로 보인다. 프리셋은 44개 전부 선택지에 두고 Core가 거부한 것은 이유와 함께 비활성이다 |
| D-4 | Studio의 서브토큰 세트·시각 패밀리·표면 선택지가 Core 거부를 미리 막지 않는다. 대시보드에서 세트 25개 중 14개, 패밀리 12개 중 2개, 표면 5개 중 1개가 활성인데 고르면 `P_ATTR_CONTEXT` 오류 화면이 된다. 오류 화면은 어느 선택이 충돌 원인인지 알려 주지 않는다 | 구현 그대로 대시보드·랜딩 두 목적에서 활성 옵션을 하나씩 조립해 보니 위 수치만큼 거부 | 모든 선택지를 현재 요청에서 그 축만 바꿔 Core로 시험하고 거부 이유를 붙여 비활성으로 둔다. 요청이 이미 충돌 상태이면 충돌 선택을 풀고 계속하는 링크를 보인다 |
| D-5 | Explore 처음 화면에 결과가 없고(`compare` 없음), 왼쪽·오른쪽 select가 빈 채 나온다. 비교 축을 바꿔 제출하면 이전 축의 값이 새 축에 없어 다시 빈 화면이 된다. 레이아웃 축의 기본 쌍(`asymmetric-grid`, `bento`)은 둘 다 Core가 거부해 결과가 하나도 없었다 | `/explore/materials` → `main img` 0, `left` 옵션 0 | 기본 비교 축을 팔레트로 하고, 왼쪽은 현재 필터 값(없으면 첫 활성), 오른쪽은 다른 활성 값으로 채운다. 이 축에 없는 left·right는 기본으로 대체한다. 비활성 옵션과 이유는 Studio와 같다 |
| D-6 | 시각 패밀리는 배치된 컴포넌트에 입혀지는 재료라 컴포넌트가 없으면 두 결과가 바이트까지 같다(`work-dashboard` 기준 `bold`·`glass`·`quiet`의 standalone이 동일). Explore 시각 패밀리 비교가 구별되지 않는 두 화면을 별개 디자인처럼 보였고 Studio의 패밀리 선택도 미리보기에 반영되지 않았다 | `assembleDesign` 결과 해시가 패밀리와 무관하게 같음, 카드 3개를 놓으면 모서리·그림자·여백이 달라짐 | Explore는 컴포넌트 필터가 없으면 Core가 받는 경우에 한해 두 결과에 같은 카드 3개를 놓고 그 사실을 화면에 적는다. Studio는 컴포넌트 없이 패밀리를 고를 때 안내를 보인다 |

### 36.3 완료 기준 항목별 판정

1. **§11.1 필터 9종과 비교 6종 (390px·1280px).** 필터 9종(페이지 목적, 디자인 맥락, 팔레트 계열, 서브토큰 세트, 타이포 시스템, 시각 패밀리, 밀도, 레이아웃, 라이트·다크)을 화면에서 골라 제출한 뒤 주소·select 복원·두 결과의 조립 요청·그려진 이미지를 함께 확인한다. 비교 6종은 한 축만 다르다.

   | 비교 | 다른 요청 키 | 컴파일 문서에서 확인한 같은 것과 다른 것 |
   |---|---|---|
   | 같은 레이아웃, 다른 색상(팔레트) | `palette` | DOM 구조·제목 서체 같음, `body` 배경색 다름 |
   | 같은 팔레트, 다른 서브토큰 | `subtokenSet` | 구조·서체 같음, `:root` 토큰 값 다름 |
   | 같은 콘텐츠, 다른 타이포 | `typeSystem` | 구조·본문 텍스트·배경색 같음, 제목 `font-family` 다름 |
   | 같은 컴포넌트, 다른 시각 패밀리 | `families` | 구조·배경색 같음, 카드 모서리·그림자·여백 다름 |
   | 같은 제품 목적, 다른 레이아웃 | `pattern` | 색·서체 토큰 같음, DOM 구조 다름 |
   | 같은 데이터, 다른 시각화 | `content`(차트 preset만) | 시리즈 데이터 같음, 차트 DOM 구조 다름 |

   팔레트 계열: 지금 등록된 팔레트 9개는 계열 태그(`family:*`)가 하나씩이라 팔레트 선택과 계열 선택이 같다. 팔레트가 200개로 늘면(Track B) 계열 단위 필터가 따로 필요해진다. 현재는 같은 결과이므로 결함으로 세지 않고 후속으로 남긴다.

2. **§11.2 Studio 선택 10종.** Palette, Subtoken Set, Typography, Visual Family, Layout, Components, Surface, Motion, Density, Content를 UI로 고르고 매번 요청 키, 컴파일 문서의 변화(배경색·토큰·제목 서체·카드 모양·마크업·본문 텍스트)를 확인했다. 내보내기 화면의 코드에도 같은 콘텐츠가 들어간다. 비호환 선택은 비활성과 이유(title)로 막히고 눌러도 값·주소가 바뀌지 않는다. 활성이라고 표시된 옵션 전수(대시보드·랜딩 두 목적의 세트·패밀리·표면·팔레트·레이아웃)가 실제로 조립된다. 단계 이동·새로고침·뒤로/앞으로 가기·단계 표시줄 왕복 뒤 5개 선택(팔레트·레이아웃·컴포넌트·밀도·패밀리)이 복원된다.

3. **아이콘 영역 비활성과 차트 제외가 §11 요구를 줄였는가.**
   - **아이콘 영역:** §11.2의 열 가지 영역에 아이콘은 없다. 따라서 §11.2를 줄인 것은 아니다. 다만 §16.2의 "모든 재료를 Studio에서 지원 범위에 따라 사용 가능"에는 못 미친다. 아이콘 영역 재료 16개는 Core 요청에 대응 필드가 없어 모두 비활성이고 이유가 붙는다(시험으로 고정). 필드 추가는 Track A의 계약 확장이며 이 작업에서 열지 않았다.
   - **차트:** 구현은 "같은 데이터로 비교할 수 없는 차트를 제외"한다고 적었지만 실제로는 막대·선·영역 10개만 남겼고 그마저 미리보기가 모두 404라서 §11.1의 "같은 데이터, 다른 시각화"를 **줄였다**(그리고 동작하지 않았다). 교정 뒤에는 등록된 44개를 모두 선택지에 두고 Core 조립이 같은 표본(4개월 매출 1계열)을 받는 **13개**(막대 4, 가로 막대 2, 선 3, 영역 2, 도넛 1, 스파크라인 1)를 비교한다. 나머지 31개는 Core의 거부 이유와 함께 비활성이다. 이유별로는 Blueprint 차트 `kind` 목록(카탈로그 2.4.0 고정)에 없는 확장 형태가 15개, 다른 데이터 형태가 필요한 것(좌표·OHLC·표본·합계 행·2계열 이상·감소 단계)이 15개, 프리셋 자체 축 범위가 표본을 잘라내는 것이 1개다. 앞의 두 묶음은 같은 데이터로 비교할 수 없다는 타당한 제외이거나 Core 계약 한계다. 확장 형태 15개 중 계단선·트리맵·레이더·진행률 4개는 Core 자체 데이터 계약(`validateChartPresetData`)이 이 표본을 받는 형태인데 조립 경로(`assembleDesign`)가 받지 않는다. 이 한계는 Core·Track A/E의 후속이며 `unresolvedIssues`에 남겼다. 수치는 업무 대시보드 목적 기준이다.

4. **Explore가 선택한 결과만 렌더하는가.** 비교 축 6종을 바꿔 가며 확인했다. `compare-result`는 정확히 둘, `main img` 둘 이하, `iframe` 0, `tabpanel`·`hidden`·닫힌 `details` 0. 조합 전체를 그리는 목록이 없다. Studio 재료 교체 단계에서는 후보 비교·내보내기·콘텐츠 패널과 닫힌 select 목록이 DOM에 없고 select를 열 때만 `listbox` 하나가 생긴다.

5. **브라우저 spec 실행과 회귀 시험.** 아래 36.4.

6. **고정 해시·버전.** `src/catalog/**`, `src/compiler.mjs` 등 고정 출력 영역은 수정하지 않았다. `npm run verify`와 `check-generated`는 36.5.

### 36.4 시험과 RED/GREEN

`apps/web/e2e/material-explorer-studio.spec.mjs`를 4개에서 27개(390px·1280px 각 12개와 폭 무관 3개)로 다시 썼다. 원래 시험이 확인하던 것(Explore 주소 복원, Studio 단계·새로고침 복원, 아이콘 영역 비활성과 이유, 시각화 비교 복원)은 모두 남기되, 틀린 id와 겹치는 label을 바로잡고 주소 대신 요청·컴파일 문서를 단언한다. 기대값을 낮춘 곳은 없다. 단위 시험(`tests/platform-material-selection.test.mjs`)은 틀린 값을 정답으로 박은 단언 3곳을 Core가 받는 값(`dashboard-grid`, `split-hero`)으로 바꾸고, 그 값이 실제 `assembleDesign`을 통과하는지와 예전 표기가 거부되는지, 표가 레지스트리와 같은지, 차트 두 프리셋이 같은 데이터로 조립되는지를 더했다.

고친 코드에 결함을 하나씩 되살려(RED) 시험이 실패하는지 본 뒤 원복해 통과(GREEN)를 확인했다.

| 되살린 결함 | 실패한 시험 |
|---|---|
| D-1 `pattern`에 `layout:` 접두를 다시 붙임 | e2e "Studio 선택 10종", e2e "Explore 필터 9종", 단위 시험 3개 |
| D-2 밀도 필터를 `spacing` 이름으로 되돌림 | e2e "Explore 필터 9종" (밀도 단계에서 주소 단언 실패) |
| D-3 차트 데이터를 요청에 싣지 않음 | e2e "Explore 비교 6종", 단위 시험 "chart comparison" |
| D-4 선택지 Core 시험 제거 | e2e "Core 가 받지 않는 선택을 비활성으로 막고", e2e "활성 선택은 모두 실제로 조립된다"(전수) |
| D-4 충돌 복구 링크 제거 | e2e "충돌하는 주소 상태" |
| D-5 left·right 대체 로직 제거 | e2e "처음 화면과 비교 축 변경", e2e "비교 목록은 Core 가 받지 않는 재료를 비활성" |
| D-5 비활성 이유 제거 | e2e "비교 목록은 Core 가 받지 않는 재료를 비활성" |
| D-6 카드 컴포넌트 보강 제거 | e2e "Explore 비교 6종" (시각 패밀리 단계) |

- `WEB_PORT=<빈 포트> npm --workspace apps/web run test:e2e -- material-explorer-studio.spec.mjs --repeat-each=2`: `54 passed` (두 번 모두 통과, rebase 전후 각 1회).
- 기준선 대조(구현 그대로): `3 failed, 1 passed`.
- 다른 e2e 영향 확인: `a11y`, `w6b-scenarios`, `studio`, `studio-ux`, `w6a-shell-studio`, `explore-studio-roundtrip`, `components-studio-roundtrip`, `security` 묶음 135 passed, 2 failed. 실패 2개는 `w6b-scenarios.spec.mjs:130` 시나리오 B(390px·1280px)이며 `/components` 쪽 이동 목록의 기존 실패다. 이 변경이 건드리지 않은 경로이고 §14·§28의 기록과 같은 계열이다. 기준선을 같은 빌드로 다시 재지는 않았다(범위 밖).
- `npm --workspace apps/web run test:unit` 95/95. `test:boundary` 8/9, 실패 1건은 TRF-07의 `features/components/material-detail.mjs`가 `src/`를 직접 import하는 기존 결함이며 F3 파일은 위반이 없다.

측정한 비용: Studio 재료 교체 화면은 선택지마다 Core 시험을 하므로 같은 입력을 처음 받으면 서버에서 0.5초에서 1.0초가 걸렸다(`curl`, 로컬 운영 빌드). 같은 주소를 다시 받으면 7ms였다(서버 캐시). 목록 요청이 아니라 선택 시점의 컴파일이다.

### 36.5 최종 검증

`origin/main` `81258e09f`에 rebase한 뒤 교정 커밋 위에서 실행했다.

| 명령 | 결과 |
|---|---|
| `npm run typecheck --workspace apps/web` | 오류 없음 |
| `npm run web:build` | `Compiled successfully` |
| `node --test tests/platform-material-selection.test.mjs tests/platform-material-library.test.mjs` | `tests 8, pass 8, fail 0` |
| `WEB_PORT=<빈 포트> npm --workspace apps/web run test:e2e -- material-explorer-studio.spec.mjs --repeat-each=2` | `54 passed` |
| `npm run verify` | exit 0. `tests 1268, pass 1268, fail 0, skipped 0`, 마지막 줄 `REPRODUCIBLE: 5379 generated files match a fresh build byte for byte.` |
| `npm run coverage:materials:check` | `MANIFEST MATCH ... (1540 materials, 406 requirements)` (생성 규칙이 읽는 재료 레지스트리를 바꾸지 않아 Manifest 재생성 결과가 같다. 손으로 병합하지 않았다) |
| `node scripts/check-generated.mjs` | `REPRODUCIBLE: 5379 generated files match a fresh build byte for byte.` |

`npm run verify`의 단위 시험에 2.1.0~2.3.0 레이아웃 개정, 2.4.0·2.5.0 컴파일 출력의 기준선 바이트 동일, 2.4.0→2.6.0 차트 출력 고정 해시가 들어 있고 모두 통과했다. 이 변경은 `src/`·`site/`를 건드리지 않았다(`git diff HEAD~2 -- src site` 비어 있음). 2.1.0 고정 해시, 기본 2.4.0, `site/v1`은 바뀌지 않았다.

### 36.6 남은 한계·범위 밖 발견

- Studio에서 실제로 고를 수 있는 재료의 폭은 Core `assembleDesign` 계약이 정한다. 컴포넌트는 10개 중 `card-surface`(2~3개 배치)만 어느 목적에서도 조립되고 나머지 9개는 Core 이유와 함께 비활성이다. 레이아웃은 24개 중 페이지 패턴이 있는 6개만 선택할 수 있고 업무 대시보드는 `dashboard-grid` 하나, SaaS 랜딩은 0개다. 이 때문에 "같은 제품 목적, 다른 레이아웃" 비교가 실제로 두 결과를 내는 목적은 에디토리얼·커머스뿐이다. 선택지는 전부 보이고 이유가 붙지만, §16.2의 "모든 재료를 사용 가능"은 Track A·D·E의 Core 계약 확장 전까지 충족되지 않는다.
- 팔레트는 9개만 등록되어 있다(Track B 진행 중). 팔레트가 늘면 계열 단위 필터가 필요하다.
- 아이콘 영역 필드, 확장 차트 형태 15개의 조립은 Core 계약 확장이 필요하다.
- D1 폼 Tab 순서와 D7 업무 패턴 셀 토큰 브라우저 실패는 다른 작업자의 몫이라 건드리지 않았다. F3 변경과 겹치지 않는다.
- `boundary.check.mjs`의 기존 실패 1건과 `w6b-scenarios` 시나리오 B 기존 실패 2건은 F3 범위 밖이다.

## 37. TASK-TRF-07 차트·레이아웃 81종 상세 독립 브라우저 검증 및 교정 (원 커밋 `a6a111f27`, 기준 `53e866c5d`, 2026-11-29)

구현 기록은 Chromium 시작 실패(Mach IPC 1100)로 새 E2E를 실행하지 못했다. 이번에는 `browser_preflight.py`가 `permissions_allowed`를 낸 명령 환경에서 운영 빌드(`next start`, `WEB_PORT=4342`)를 Playwright Chromium으로 390px·1280px 조작했다. 이 세션에는 Ttakkari 브라우저 MCP 도구가 붙어 있지 않아 같은 Playwright를 썼다.

### 37.1 구현 그대로의 시험과 관측

- 구현자의 새 시험(`component-detail-tabs.spec.mjs` "차트·레이아웃 재료는 종류별 탭만 보이고 기본 미리보기와 Code HTML이 같다")은 실행하자 통과했다.
- 목록 카드 클릭 진입: 차트 프리셋 2(`erp-quarterly-revenue`, `analytics-cohort-scatter`), 레이아웃 2(`bento`, `centered-hero`), 레이아웃 부품 2(`component:stack`, `component:resizable-panel`), 배치 원형 2(`cluster`, `flow`)를 검색 결과 카드(`a[href="/components/<id>"]`) 클릭으로 열었다. 8개 모두 미리보기 요소 13개 이상·svg 또는 텍스트 있음, 미리보기 안 가로 넘침 0. 스크린샷으로 stack(표본 버튼·두 항목), resizable-panel(패널 1·2)이 비어 있지 않음을 확인했다.

### 37.2 발견한 결함과 교정

| # | 증상(재현) | 원인 | 교정 | 회귀 시험(RED→GREEN) |
|---|---|---|---|---|
| 1 | 390px에서 **Code 탭이 문서를 346px 넘침**(button-control·hero 등 모든 부품 공통, F2 이래) | `.detailPanel` grid의 자식이 코드 블록의 최소 내용 폭(736px)으로 늘어남 | `grid-template-columns: minmax(0, 1fr)`, `.block`에 `min-width: 0; width: 100%` | E2E "390px에서 Code 탭의 긴 코드 블록은 문서를 넘치지 않고…": 수정 전 `Received 346`, 수정 후 통과 |
| 2 | 레이아웃 24개 중 20개가 받지 않는 밀도(예: bento의 compact)를 고를 수 있고 선택 뒤에야 `layout:bento는 compact 밀도를 받지 않습니다(허용: comfortable·spacious)` | 상세 모델이 밀도 옵션을 전부 `ok: true`로 만듦 | 재료의 `density.allowed`로 옵션을 비활성화하고 Core와 같은 사유를 `title`로 보임 | 단위 시험(수정 전 실패) + E2E "레이아웃 Playground는 받지 않는 밀도를…" |
| 3 | donut 차트(`marketing-channel-share`)는 Playground의 밀도 축이 어떤 값도 출력을 바꾸지 못함(compact·spacious는 Core 거부, comfortable은 기본값). 요구 "어떤 축도 출력을 바꾸지 않으면 결함" | 모든 차트에 밀도 축을 고정으로 염 | Core가 렌더하는 밀도가 2개 이상일 때만 축·Playground 탭을 연다 | 단위 시험 "chart presets expose the density axis only when…"(수정 전 실패) + E2E 탭 집합에 donut 추가 |
| 4 | **배치 원형 6개**의 Accessibility 탭이 `등록된 규칙이 없습니다`·`등록된 역할 설명이 없습니다`·`등록된 키보드 계약이 없습니다`뿐(데이터 없는 탭이 노출됨) | 탭을 종류별로 고정 | 접근성 규칙·역할·키보드 중 하나라도 있을 때만 연다(6개 모두 비어 Overview·Code만) | 단위 시험 "exposed tabs carry real data…"(수정 전 실패) |
| 5 | 레이아웃 부품 `stack`·`container`·`resizable-panel`의 Composition 탭이 `허용 자식 · 0~0개`와 `관련 목적 컴포넌트 component:stack component:stack`(자기 자신 2번)뿐 | 관계를 `[materialId, blueprint 노드]`로 만들 때 둘이 자기 자신이라 중복 | 자기 자신 제외·중복 제거 뒤 관계가 없으면 탭을 열지 않음(나머지 4개는 `layout:equal-grid` 등 실제 관계로 유지) | 같은 단위 시험 + 탭 집합 E2E |
| 6 | 레이아웃의 슬롯(`head (0–1)`, `tiles (3–6)`)이 `관련 목적 컴포넌트`에, `허용 자식`이 `0~4개`(타입 수)로 표시되고 `필요한 슬롯`은 `필요 슬롯 없음` | 슬롯을 `related` 필드로 보내고 자식 범위를 타입 개수로 계산 | 슬롯은 `필요한 슬롯`, 자식 범위는 슬롯 min·max 합(bento 3~7개) | 같은 단위 시험 |

탭 집합 변경에 따라 구현자의 기대 `component:stack = [Overview, Code, Composition]`, `layout-primitive:stack = [Overview, Code, Accessibility]`를 단위·E2E 양쪽에서 위 데이터 기준(`[Overview, Code]`)으로 바꿨다. 낮춘 것이 아니라 빈 탭 비노출 요구로 더 엄격해진 것이다. 대신 `component:responsive-grid`(Composition 유지)와 donut·배치 원형의 숨김 단언을 추가했다.

### 37.3 완료 기준 실측

- **렌더·넘침(81개 전수, 390·1280, 탭마다):** 162번 방문(81×2)에서 페이지 가로 넘침 0, `tabpanel` 항상 1개, Overview·Playground iframe 정확히 1개, Code 코드 블록 4개, 미리보기 요소 8개 미만 또는 높이 40px 미만 0건, 미리보기 안 가로 넘침 0, Tokens·Accessibility·Composition의 거의 빈 탭 0, 접근성 전부 placeholder 0 → `visited 162 problems 0`(수정 전에는 Code 넘침과 빈 탭이 검출됐다).
- **Playground 축:** chart 2개의 밀도 compact, layout 2개의 밀도·모드 변경마다 iframe HTML 바이트와 미리보기 PNG 해시가 달라졌고 `data-density`·패딩·배경(`rgb(235,234,232)`→`rgb(29,27,23)`)·`data-theme`가 바뀐다. 전수: 차트 44개 × 허용 밀도와 레이아웃 24개 × 밀도 × 모드의 렌더 233조합 모두 서로 다른 바이트이고 받지 않는 값은 404와 사유다. 어떤 축도 출력을 바꾸지 못하는 재료는 donut 1개였고 위 3번으로 교정했다.
- **Preview = Code = /export:** 8개 재료 × 2폭 = 16회 모두 미리보기 iframe 응답 HTML이 Code의 `index.html`과 바이트 일치, Code 4블록이 페이지가 보낸 `/export` 응답 4파일과 일치, 독립 재호출도 일치, 복사 4버튼 클립보드 일치.
- **URL·뒤로·앞으로(16회):** 직접 열기(`?tab=playground&density=spacious&mode=dark`)가 선택을 복원하고, 탭 이동 → 뒤로 → 뒤로가 Playground 선택(밀도·모드)을 유지하며 앞으로가 Code를 복원했다(Playground가 없는 재료는 Overview).

### 37.4 명령 실행 결과(기준 `53e866c5d` 위)

```text
$ WEB_REUSE=1 WEB_PORT=4342 npm --workspace apps/web run test:e2e -- component-detail-tabs.spec.mjs explore-components-home.spec.mjs components-studio-roundtrip.spec.mjs
19 passed, 1 failed     # 실패 1개: explore-components-home.spec.mjs:31(/explore 첫 카드가 /explore/materials), 상세와 무관해 §34.5에 기록
$ node --test tests/platform-component-context.test.mjs apps/web/features/components/{detail-model,detail-export,material-detail}.unit.mjs
ℹ tests 15 / pass 15 / fail 0
$ npm --workspace apps/web run test:unit   # tests 98 / pass 98
$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1540 materials, 406 requirements)
$ node scripts/check-generated.mjs
REPRODUCIBLE: 5379 generated files match a fresh build byte for byte.
```

`git diff 53e866c5d..HEAD`는 `apps/web/**`와 문서만 바꾼다. `site/`, `src/catalog`, `src/compiler.mjs`, `docs/evidence/context/legacy-hashes.json`은 변경 0(2.1.0 고정 해시·기본 2.4.0·`site/v1` 불변).

## 38. TASK-TRF-04 — 타이포그래피 카탈로그·Specimen·비교·Studio 연결

### 36.1 구현 및 계약

- 41개 시스템을 24개씩 페이지로 나누고 검색·계열·페이지·비교 선택을 URL query로 복원한다. 비교 선택은 최대 4개이며 브라우저 뒤로/앞으로 이동이 링크 내비게이션으로 상태를 되살린다. 카탈로그 목록에서는 Core 상세 컴파일을 호출하지 않고 선택된 비교 시스템만 미리보기로 조립한다.
- 상세는 Core `bindType` 결과의 27개 역할, 굵기, 한·영·일 텍스트, 숫자·금융, 코드 샘플을 표시한다. 버튼·입력·표 패널은 Core `assembleComponents`의 실제 HTML/CSS/manifest를 사용하고 내보내기 링크를 제공한다. 폭 비교는 390px·1280px 입력으로 Core가 각각 컴파일한 결과다.
- `getTypographySpecimen`은 서비스의 읽기 전용 조회 API로만 노출된다. 선택 타이포 시스템 Studio 링크는 목적 및 시스템을 URL로 전달하고, Studio Blueprint 조립 시험에서 선택된 `materials.typeSystem` 및 내보내기 CSS가 달라짐을 확인한다.
- 구형 `preset=erp|document|marketing|editorial` 경로는 새 Specimen 선택으로 연결한다. Materials 개요의 오래된 네 프리셋 카드를 제거했다. `/materials` Foundations 영역은 수정하지 않았다.
- 고정 기준: Core 2.1.0 해시와 `site/v1` 산출물 불변, 기본 버전 2.4.0.

### 36.2 Node 및 웹 검증

- `node --test --test-skip-pattern='real Chromium browser|real layout|width steps cap|pointer drag|Playwright Chromium 실측'`: 전체 Node 시험 1,266개 통과, 실패·건너뜀 0.
- `node --test tests/platform-type-presentation.test.mjs`: 3개 시험 통과. 41개 시스템×27 역할 데이터, 잘못된 입력 거부, 실제 Core 컴포넌트 조립 및 번들 출력 확인.
- `node --test apps/web/features/platform/type-catalog-state.unit.mjs`: 3개 시험 통과. 페이지 크기 24, URL 필터, 4개 상한 및 5번째 선택 거부 확인.
- `node --experimental-strip-types --experimental-loader ./apps/web/features/studio/node-ts-loader.mjs --test tests/studio-type-system-link.unit.mjs`: Studio 연결 1개 시험 통과. 선택 시스템의 Blueprint와 내보내기 결과 반영 확인.
- `npm run typecheck --workspace apps/web`: 통과.
- `npm run web:build`: 통과; Next.js가 962개 정적 페이지를 생성하고 `/materials/typography`, `/studio/assemble` 경로를 포함한다.
- `npm run coverage:materials:check`: `MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1540 materials, 406 requirements)`.
- `node scripts/check-generated.mjs`: `REPRODUCIBLE: 5379 generated files match a fresh build byte for byte.`
- Chromium E2E 명세는 `apps/web/e2e/typography-catalog.spec.mjs`에 390px·1280px 카탈로그·상세·비교·뒤로/앞으로 상태 검증을 작성했다. 하지 않음: 이 Codex 세션에서는 사용자 요청에 따라 Chromium 실행을 생략했으며, Claude 독립 검증이 남아 있다.

## 39. TASK-TRF-08 Foundations 11개 하위 카테고리 전시 페이지 (기준 `9df203a55` (rebase 후), 2026-11-29)

`/materials/foundations?category=<id>`에서 선택 범주만 서버 렌더한다. 범주 링크는 URL에 선택을 담아 브라우저 뒤로 가기가 이전 선택을 복원한다. 11개 범주 링크는 항상 보이지만 숨긴 범주의 콘텐츠 패널은 DOM에 넣지 않는다. 카테고리 데이터는 Core 소스의 재료 수량 상한(Spacing 3, surface 5, background 13, motion 4+패턴 15, icon 영역 16, layout 24+원형 6, chart 형태 29)을 유지하고 무제한 캐시를 두지 않는다.

### 39.1 범주 정의·예시·토큰·사용 조건

- **Spacing·Density**: Core `SPACING_ROLES` 9개 역할과 Compact·Comfortable·Spacious 3개 밀도별 토큰을 모두 표시한다. 간격 표본은 역할 토큰의 실제 px 값을 사용한다.
- **Radius·Border·Elevation**: Core 반경 축과 표면 패싯 17개, 테두리 5종, 깊이 8종을 전시한다. 샘플의 반경·테두리·그림자는 Core의 반경·깊이 표 및 패싯 정의에서 읽는다.
- **Surface·Background**: 표면 5개 재료의 base·raised·overlay 값과 배경 13개 재료의 Core 색 역할·장식 정의를 보여 준다.
- **Motion**: Core 모션 4종과 목적 패턴 15종의 속성·duration·easing·delay·reducedMotion을 표로 낸다. hover/focus 동작이 있고 `prefers-reduced-motion: reduce`에서는 변형과 전이를 제거한다.
- **Icon**: 16개 영역의 Core 허용 아이콘과 실제 내부 SVG 경로를 전시한다. 재료의 출처·라이선스(in-repository-original / internal), viewBox·stroke·정렬·최소 크기 및 의미/장식 아이콘 사용 조건을 표시한다.
- **Layout·Chart**: Core 레이아웃 24종·배치 원형 6종과 Chart SVG 지원 형태 29종의 예시를 보이고, 각각 TASK-TRF-07 상세 경로로 연결한다. 차트는 Core 렌더러 CSS와 Core 라이트 색 토큰으로 표시한다.

### 39.2 시험 및 빌드

```text
$ node --test apps/web/features/materials/foundations-exhibit.unit.mjs
ℹ tests 3 / ℹ pass 3 / ℹ fail 0
(§9.8 범주 순서, 선택된 범주의 데이터 격리, Core 재료 인벤토리 수량)

$ node --test --test-skip-pattern='real Chromium browser|real layout|width steps cap|pointer drag|Playwright Chromium 실측'
ℹ tests 1266 / ℹ pass 1266 / ℹ fail 0

$ npm run typecheck --workspace apps/web
> tsc --noEmit
(통과)

$ npm run web:build
✓ Compiled successfully; ✓ Generating static pages (962/962)
ƒ /materials/foundations (URL category query로 서버 렌더)

$ npm run coverage:materials:check
MANIFEST MATCH docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json (1540 materials, 406 requirements)

$ node scripts/check-generated.mjs
REPRODUCIBLE: 5379 generated files match a fresh build byte for byte.
```

### 39.3 독립 Chromium 1차 검증과 교정

Claude Playwright 검증은 390px·1280px에서 주소 복원·단일 패널·터치 크기·Motion·Icon·상세 링크를 확인했고 다음 결함을 찾았다: Border 5개 중 4개가 CSS 변수 치환 오류로 `0px none`; Background 13개 중 장식 재료 8개가 Core `accent`·`rule`, `background-image`, mask, opacity 및 frosted blur를 샘플에 연결하지 않음; Chart 텍스트 기본 16px로 퍼널 값이 SVG 오른쪽에서 잘리고 `overflow:hidden`으로 Core의 visible 영역이 가려지며 데이터 표 CSS가 숨김; Layout 24개 일부가 같은 등분 슬롯 상자로 보임; Radius 개수 표기가 facets 17개를 빼고 5로 표시됨; Motion duration/easing이 JSON 텍스트로 나옴. E2E 명세는 브라우저 계산값 `0.12s`에 `ms`를 요구해 실패했다.

교정: 테두리를 유효 CSS 값으로 직접 매핑, Background decoration의 shorthand/image·size·mask·opacity·blur와 Core 색 토큰을 실제 pseudo-element에 전달, 차트에 Core 소형 타이포(13px)와 visible overflow·펼칠 수 있는 데이터 표를 복구, Layout은 Core wide band의 columns/areas를 그리며 배치 원형별 구조 샘플을 분리, Radius를 22개로 세고 Motion 값을 사람 읽을 수 있는 값으로 펼쳤다. E2E에는 위 동작 회귀 단언을 추가하고 계산된 시간 단위를 반영했다.

단위 시험 `node --test apps/web/features/materials/foundations-exhibit.unit.mjs`는 새 helper export가 없고 blur 보존이 빠진 상태에서 예상 실패(RED)를 확인한 뒤 구현 후 `tests 5 / pass 5 / fail 0`으로 통과했다. 새 Claude 독립 브라우저 재검증은 코드 반영 후 별도 실행 예정이므로 아직 Verified로 올리지 않는다.

`apps/web/e2e/foundations-categories.spec.mjs`에는 390px·1280px URL/뒤로 가기, 단일 패널, 터치 링크 크기·가로 넘침, 11개 정의, Core 차트 SVG, Motion reduced-motion, Icon 권리, 상세 링크를 확인하는 명세를 작성했다. **Chromium 실행은 하지 않음**: 작업 지시가 Codex Chromium 재시도를 금지하고 Claude 독립 브라우저 검증을 지정했다. 따라서 실제 브라우저 동작과 픽셀 실측은 검증 대기다.

새 Track F 항목 `TASK-TRF-08`을 장부에 추가했다. 내비게이션 공통 컴포넌트는 수정하지 않았다. `git diff --exit-code origin/main -- site/v1/catalog.json docs/evidence/context/legacy-hashes.json`은 rebase 후 최신 origin/main 기준으로 불변 파일 비교와 push 직전 diff stat을 다시 수행한다.
