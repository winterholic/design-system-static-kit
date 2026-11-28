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

**캐시 키 (CONTRACTS §5.2)**: `SHA256(engineVersion:catalogVersion:materialIds:canonicalRequest:mode:viewport)[:32]`를 시험이 `node:crypto`로 독립 계산해 대조한다. 원 구현은 재료 id가 `theme@catalogVersion`뿐이었고 엔진 버전이 상수 `'2.0.0'`이었으며 브라우저는 비암호학적 해시, Node는 `eval('require')`를 썼다. 편차 하나가 남는다: platform 계약 버전을 공개 진입점에서 얻을 수 없어 엔진 버전은 `compileBlueprint/<service CONTRACT_VERSION>`이다(DEC-009 결정 3).

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
2. 캐시 키 엔진 버전이 §5.2의 platform 계약 버전을 포함하지 않는다(Track A의 공개 진입점 결정 필요).
3. `window.__studio_api`가 운영 빌드에도 노출된다(측정 스크립트가 쓴다). 동작에는 영향이 없으나 범위 밖이라 그대로 두었다.
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
