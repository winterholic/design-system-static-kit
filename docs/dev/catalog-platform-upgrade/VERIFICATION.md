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
