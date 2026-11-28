# 고도화 검증 계획 및 실행 증거 기록 (VERIFICATION.md)

- 상태: 활성 (Phase 0 전수 감사 검증 완료)
- 버전: 1.0.0
- 관리 위치: `docs/dev/catalog-platform-upgrade/VERIFICATION.md`
- 관련: `REQUEST.md §12, §15`, `docs/governance.md`

---

## 1. 검증 체계 및 품질 게이트 원칙

1. **완료 선언의 증거 의무**: "완료", "통과", "수정됨"을 선언하기 전에는 반드시 방금 실행한 최신 명령과 1~3줄의 실제 터미널 출력을 제시해야 한다.
2. **RED-GREEN 검증**: 테스트를 새로 작성하거나 수정할 때는 버그를 심어 실패하는 것을 한 번 본 뒤(RED), 원래 코드로 통과하는 것을 확인해야 한다(GREEN).
3. **기존 테스트 불변**: 기존 553개 이상의 단위/계약 테스트를 임의로 완화하거나 삭제하지 않는다.
4. **결정론적 동등성**: 동일 입력에 대해 2회 이상 연속 실행했을 때 산출물이 바이트 단위로 일치해야 한다 (`cmp -l` 또는 해시 일치).

---

## 2. Phase 0 감사 검증 실행 결과 및 증거

Phase 0 전수 감사 작업에 대해 실행된 검증 증거는 다음과 같다.

### 2.1 스크립트 결정론성 검증 (2회 연속 실행 바이트 일치)
`npm run coverage:materials`를 2회 연속 실행하여 생성된 `docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json`의 바이트 단위 일치성을 검증하였다.

```sh
npm run coverage:materials && cp docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json /tmp/cov1.json && npm run coverage:materials && cp docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json /tmp/cov2.json && cmp -l /tmp/cov1.json /tmp/cov2.json && echo "BYTE EQUAL"
```

**실행 출력**:
```text
> @winterholic/design-system-static-kit@2.0.0 coverage:materials
> node scripts/generate-material-coverage.mjs

Material Coverage Manifest successfully generated at /Users/winterholic/development/projects/dsk-up-p0-audit/docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
Total Records: 1551, Total Requirements: 337, Missing Requirements: 228

> @winterholic/design-system-static-kit@2.0.0 coverage:materials
> node scripts/generate-material-coverage.mjs

Material Coverage Manifest successfully generated at /Users/winterholic/development/projects/dsk-up-p0-audit/docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json
Total Records: 1551, Total Requirements: 337, Missing Requirements: 228
BYTE EQUAL
```

### 2.2 17개 필드 전수 확인 및 7개 상태값 검증
생성된 Manifest의 1,551개 모든 재료 레코드가 §2.2의 17개 필드와 7개 유효 상태(`missing`, `metadata-only`, `defined`, `renderable`, `catalog-visible`, `assemblable`, `verified`)를 누락 없이 보유하고 있음을 검증하였다.

**실행 명령**:
```sh
node -e '
import { readFileSync } from "fs";
const data = JSON.parse(readFileSync("docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json", "utf8"));
const requiredFields = ["id", "kind", "supportedVersions", "definitionPath", "rendererConnected", "usesTokensAndCss", "supportedVariantsAndStates", "catalogVisible", "detailPageExists", "studioAssemblable", "restAndMcpAvailable", "blueprintExpressible", "exportReflected", "a11yAndResponsiveTested", "qualityVerdict", "rightsAndLicense", "legacyDuplicateRelation"];
const validStatuses = new Set(["missing", "metadata-only", "defined", "renderable", "catalog-visible", "assemblable", "verified"]);
let missingFields = 0, invalidStatus = 0;
for (const m of data.materials) {
  for (const f of requiredFields) if (m[f] === undefined) missingFields++;
  if (!validStatuses.has(m.status)) invalidStatus++;
}
console.log("Checked 1551 items. Missing fields:", missingFields, "Invalid statuses:", invalidStatus);
'
```

**실행 출력**:
```text
Checked 1551 items. Missing fields: 0 Invalid statuses: 0
```

### 2.3 요약 메트릭 및 요구 항목 현황 (실측값)
- **전체 레코드 수**: 1,551개
- **전체 요구 항목 수**: 337개
  - 충족된 요구 항목 수: 109개 (32.34%)
  - 미구현(Missing) 요구 항목 수: 228개 (67.66%)
- **요구 항목별 세부 상태**:
  - 컴포넌트 인벤토리 (§6.2): 207개 중 50개 충족, 157개 missing
  - 서브토큰 세트 (§4.4): 25개 중 7개 충족, 18개 missing
  - 타이포그래피 시스템 (§5.2): 40개 중 14개 충족, 26개 missing
  - 시각 패밀리 (§7): 12개 중 4개 충족, 8개 missing
  - 차트 프리셋 (§9.1): 29개 중 29개 전수 충족 (0개 missing)
  - 레이아웃 패턴 (§9.2): 24개 중 5개 충족, 19개 missing

### 2.4 지시서 §2.1 기준표 대비 실측값 대조 결과
| 재료 | 기존 분석 기준 | 현재 실측값 | 판정 | 비고 |
|---|---:|---:|:---:|---|
| 신규 플랫폼 팔레트 | 9 | 9 | 일치 | 원색 시드 자체 팔레트 9종 |
| 서브토큰 세트 | 7 | 7 | 일치 | 역할 분배 세트 7종 (§4.4 25종 대비 18종 미구현) |
| 신규 타이포 시스템 | 14 | 14 | 일치 | 독립 타이포 시스템 14종 (§5.2 40종 대비 26종 미구현) |
| 기존 타이포 프리셋 | 18 | 18 | 일치 | 구형 서체 짝 18종 (고정 출력) |
| 기존 역할형 타이포 프리셋 | 4 | 4 | 일치 | 역할 크기 체계 4종 (고정 출력) |
| 기반 컴포넌트 | 10 | 10 | 일치 | 2.6.0 기반 컨트롤 10종 |
| 목적별 컴포넌트 | 32 | 32 | 일치 | 목적 패밀리 32종 (120종 대비 88종 미구현) |
| 시각 패밀리 | 4 | 4 | 일치 | 시각 패밀리 4종 (§7 12종 대비 8종 미구현) |
| 기존 구조 부품 | 65 | 65 | 일치 | 구형 노드 55종 + 컨트롤 10종 |
| 차트 프리셋 | 29 | 29 | 일치 | 차트 프리셋 29종 |
| 아이콘 | 87 | 87 | 일치 | SVG 아이콘 87종 |
| 템플릿 | 85 | 85 | 일치 | 구형 템플릿 85종 |

### 2.5 플랫폼 기준선 검사 (`scripts/platform/baseline.mjs --check`)
```sh
node scripts/platform/baseline.mjs --check
```

**실행 출력**:
```text
BASELINE MATCH docs/evidence/platform/baseline.json
registered materials        1066 (catalogRegistry), 1084 (designRegistry)
attribute combinations      795799 (registry claim, not assemblable)
implemented materials       400 (derived 257, rights-unverified 427, metadata 0)
render entry points         28
complete presets            208 registered, 208 unique
assemblable combinations    16360/16808 assembled, 16360 unique blueprints
verified combinations       16360 compiled, 16360 distinct outputs
color token sets (assemble) light 1, dark 1; legacy themes light 54
effective face pairs        3
platform assemblable        119610 (of 120420 tried)
platform verified           5793 assembled+checked, 5787 distinct outputs (5793 tried)
platform colors / faces     light 63, dark 62; face pairs 14
platform families           visual 4; purpose 32 registered, 4 verified in page Blueprints
platform motion              17/19 verified; 2 rejected (see X-codes in evidence)
(61.3s)
```

---

## 3. 후속 트랙(Track A~G) 검증 의무 및 절차

1. **신규 재료 추가 시 (Track B, C, D, E)**:
   - 해당 재료의 실패하는 계약 테스트 작성 (RED).
   - 구현 후 통과 확인 (GREEN).
   - `npm run coverage:materials` 실행하여 `MATERIAL-COVERAGE.json`의 상태가 `verified`로 승격되는지 확인.
   - `TASK-LEDGER.json`에 완료 커밋 및 테스트 파일 기록.
2. **성능 개선 시 (Track A)**:
   - 목록 페이지에서 iframe 요소 수가 0개임을 단위 테스트 및 Playwright로 확인.
   - Core 컴파일 호출 카운터가 0회인지 확인.
3. **웹 페이지 개편 시 (Track F)**:
   - Chromium 브라우저에서 390px 모바일 및 1280px 데스크톱 레이아웃 검증.
   - 카테고리 탭 전환 시 캐시된 데이터로 200ms 이내 전환 확인.
4. **통합 및 릴리스 시 (Track G)**:
   - `npm run verify` 전수 통과 확인.
   - 실제 출력 차이 검사(`Actual Output Test`)로 D1/D2 결함 재발 방지 확인.
   - 브라우저 E2E 시나리오 전수 통과 확인.

---

## 4. P0-PERF 성능 기준선 독립 검증 (커밋 `343c1a795` 대상, 2026-11-28)

원작업은 다른 공급자가 했다. 아래는 별도 맥락에서 코드와 실행으로 다시 확인한 결과다. 측정은 모두 실험실 값이고, `local-prod`는 Vercel 운영 실측이 아니다.

### 4.1 계측 노출 (`/api/dev/perf-counters`)
- `DSK_PERF_METRICS`를 지정하지 않은 `next start`: GET·POST 모두 `HTTP/1.1 404 Not Found`. 코드는 `route.ts`와 `counter.server.ts`가 각각 `=== '1'`을 확인하고, 꺼져 있으면 `recordCompile`이 즉시 반환한다. 동작 변경 없음.
- `DSK_PERF_METRICS=1`: `{"enabled":true,"counters":{...}}` 200.
- Vercel 운영(`dpl_2Qiqt5cLnX1nsRav2CNopf44kr8e`): GET·POST 모두 404.

### 4.2 계측 범위
- 세는 곳: `platform.server`(`assembleDesign`, `assembleComponents`; `component-view.server`·`probeDesign`·페이지·`/platform/render`가 모두 이 두 함수를 거친다), `explore/designs.server`(`renderDesign`), `components/spec.server`(`compileHtml` = `componentView`·`renderComponent`).
- 빠져 있던 곳: `explore/qa/combos.server`의 `renderCombo` → 호출 한 줄 추가.
- 세지 않는 곳(의도): REST·MCP 공개 API(`lib/api`), 브라우저 안의 Studio 컴파일. 라우트 단위로 세면 405·검증 실패까지 세어져 부정확하다.
- 세는 단위는 서비스 호출 1회이며 Blueprint 컴파일 수와 같지 않다.
- Explore `compileCount` 8(390px)의 출처: 서버 렌더의 확인용 `assembleDesign` 6회(`PLATFORM_CASES` 6개, `explore/page.tsx:121`) + 보이는 사례 iframe 2개의 `/platform/render` 2회. 1280px은 6 + 6 = 12. 원본 기준선이 읽은 값이 맞았지만 설명이 없었다.

### 4.3 재측정 대조 (로컬 운영 빌드, 중앙값 3회)
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

### 4.4 발견 결함과 조치
1. 페이지 항목에 `viewport`가 없었다 → `viewport{id,label,width,height,isMobile}` 추가. 확인: `jq '[.environments[].pages[]|select(.viewport.width==null)]|length'` → `0`.
2. INP 250ms는 측정 산물이었다(비활성 버튼 클릭 2초 시간 초과를 250으로 보정) → Event Timing 관측값만 기록, 클릭 성공 여부 기록.
3. 컴파일 수·전송량이 클릭·스크롤 누적이었다(Typography 7 = 초기 4 + 클릭 3) → 초기 로드, 상호작용 후, 스윕 후로 분리. 전송량은 압축 후 실제 전송 바이트로 변경.
4. TTFB가 Vercel 동적 페이지를 9~10ms로 보고했다(본문 첫 바이트는 약 400ms) → `serverFirstByteMs` 추가.
5. 콜드/웜 값이 서버를 데운 뒤 측정되면 무의미하다(Vercel 콜드 9ms) → 서버 재기동 직후 첫 요청 기준으로 바꾸고 Vercel은 콜드 측정으로 쓰지 않는다고 명시. 로컬 콜드/웜 본문 첫 바이트 279 / 26ms.
6. `--measureVercel` 없이도 Vercel을 측정했다 → 플래그 필요.
7. 카운터가 `renderCombo`를 세지 않았다 → 추가.
8. 병목 판정 문서의 파일:줄 인용이 계측 삽입으로 밀려 있었다(`platform.server.ts` 45-46 → 52-53 등)와 사실 오류(병목 4·5·6·7, 아래 참조) → `PERF-BOTTLENECKS.md` 재작성.

### 4.5 Vercel 배포 식별
- 현재 운영 별칭 = `dpl_2Qiqt5cLnX1nsRav2CNopf44kr8e`(`vercel inspect design-system-static-kit.vercel.app`). GitHub 커밋 상태(`343c1a795`, 2026-11-28T01:11:59Z)의 배포 URL과 같은 ID라 커밋 `343c1a795`로 확인했다. 응답 헤더만으로는 커밋을 알 수 없다(`server: Vercel`, `x-vercel-id: icn1::iad1::...`).
- 원 기준선의 Vercel 측정(01:05:39Z)은 이보다 앞선 배포(`4f34cacad`, 00:53Z)의 값이었다. 이번에 현재 배포로 다시 쟀고 JSON `environments.vercel.identity`에 기록했다.

### 4.6 병목 판정 정정 요약
- 병목 4: 전부 동적이라는 서술은 틀렸다. Explore 대표 디자인과 구조 부품 render는 SSG(`x-vercel-cache: PRERENDER`).
- 병목 5: `/components`는 정적 프리렌더라 운영 요청 시 `componentView` 비용 없음. `next dev` 첫 요청에서 `compileBlueprint` 38회.
- 병목 6: Typography는 3 + 1 = 4회(문서의 4+4 오류).
- 병목 7: 콜드/웜 208ms를 근거로 든 부분 철회. 구조 판정만 유지.
- 병목 2: 저장소에 없는 "CDP 트레이스" 대신 스크롤 왕복 수치로 대체.

### 4.7 실행 증거
```sh
$ (unset DSK_PERF_METRICS; next start -p 4311) && curl -i /api/dev/perf-counters
HTTP/1.1 404 Not Found
$ npm run verify
REPRODUCIBLE: 3402 generated files match a fresh build byte for byte.   (EXIT=0)
$ npm --workspace apps/web run typecheck / test:boundary / test:docs
tsc --noEmit (오류 없음) / pass 9 fail 0 / pass 4 fail 0
```
미실행: `apps/web` Playwright e2e(`test:e2e`)는 이번 변경이 측정 스크립트·계측 호출·문서에 한정되어 실행하지 않았다(CI Web 워크플로가 실행). 테스트 코드는 새로 쓰지 않아 RED/GREEN 대상이 없다. 계측 게이트는 환경 변수 유무로 404/200을 모두 실행해 확인했다.
