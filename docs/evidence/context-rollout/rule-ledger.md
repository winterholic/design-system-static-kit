## 1. 통합 판정

- 원래 규칙 ID 100개와 후속 조사 전의 118개 ID·원판정 이력을 보존했다. 기존 공식 보완자료 19항목에 이어 Fluent 2의 세 직접 주장 ID(FLU-07~09)를 추가해 전체는 121개다.
- 기존 규칙에 주제 ID가 적혀 있다는 사실과 동일 조건의 적용 증거를 구분한다. 보완 JSON의 `rule_ids`는 주제 포인터이고, 판정 연결은 보완 JSON의 `ledger_links`와 이 대장의 claim별 설명을 따른다.
- Material 3 타입스케일은 M3-04다. M3-01 창 크기 클래스의 적용 근거가 아니다. Spectrum 1 CSS 수치와 Spectrum 2 schema 옵션도 별도 버전으로 다룬다. Polaris React 값은 archive의 과거 구현이며 current Web Components의 계약으로 취급하지 않는다.
- 원문 준수, 원칙 재사용, 킷 채택, 실제 코드/화면 결함은 각 rule의 `review.evidence_dimensions`, `kit_evidence`, `visual_candidates`로 분리했다. 실제 화면 관찰과 추정 원인도 분리했다.
- 원본 `rule-source-supplement.*`, 초기 `design-research.json`, composition 1.0 snapshot은 변경하지 않았다. 현재 킷 scope는 catalog 2.2.0 / composition 1.1.0 이다.

## 2. 전체 판정 집계

집계 단위는 원래 100개와 claim-specific 21개를 합친 121개다. search-snippet 단독 주장은 확인된 적용 집계에서 제외한다.

| 판정 | 건수 |
|---|---:|
| applied | 40 |
| partial | 70 |
| conflicting | 1 |
| missing | 6 |
| not-applicable | 4 |
| 합계 | 121 |

### 변경된 원래 판정

| ID | 변경 전 | 변경 후 | 변경 이유 요약 |
|---|---|---|---|
| CAR-01 | applied | partial | Carbon의 전체 간격 값 집합은 킷에 그대로 채택되지 않았다. 출처 값은 160px까지지만 킷은 hairline 예외와 4px 배수 128px까지를 허용한다. 4px 격자 원리는 재사용하므로 완전 적용이 아니라 부분 적용이다. |
| CAR-05 | conflicting | partial | 원문은 모바일·contained 폼의 변형을 명시한다. 킷은 모든 폼의 필드 그룹 뒤에 밀도별 head 간격(12/16/20px)을 둔다. 단독 페이지는 48px 권고에 못 미치지만 예외 맥락도 있어 전면 상충이 아닌 부분 적용이다. |
| CAR-12 | conflicting | partial | Carbon은 모든 행·열에 가로 16px를 요구한다. 킷은 item 토큰을 셀 모든 변에 적용해 compact/comfortable은 12px, spacious는 16px다. 일부 밀도만 일치하므로 부분 적용이다. |
| M3-02 | applied | partial | 원문은 창 크기 클래스를 말하고, 킷 근거는 컴포넌트 container query다. 가용 공간에 따라 적응한다는 원리는 재사용하지만 컨테이너 폭은 창 클래스와 같은 측정값이 아니다. |
| HIG-05 | conflicting | partial | Apple HIG의 pt 크기·행간은 네이티브 플랫폼과 Apple 서체 기준이다. 킷은 자체 서체 스택의 웹 CSS px를 낸다. 수치를 직접 비교하지 않고 여러 줄 제목에 넉넉한 행간을 쓰는 원칙만 부분 재사용으로 판정한다. |
| HIG-07 | conflicting | partial | Dynamic Type은 네이티브 기능이다. 킷은 CSS px와 반응형 clamp를 사용해 페이지 확대에는 대응하지만 웹의 텍스트 전용/시스템 글자크기 매핑은 확인하지 못했다. 네이티브와 직접 상충한다고 단정하지 않고 부분 적용으로 둔다. |
| SPE-06 | applied | partial | 보완 자료에서 Spectrum 1의 2~96px 토큰표를 확인했다. 킷은 hairline 예외와 4px 배수로 128px까지 사용한다. 토큰 스케일 원리는 재사용하지만 전체 수치 집합은 다르므로 부분 적용이다. |
| ANT-03 | applied | partial | Ant Design controlHeight는 16/24/32/40px 변형이다. 킷 control은 density 40/44/48px라 같은 크기 열거가 아니고 40px만 겹친다. 기존의 완전 적용 판정은 과했다. |
| ANT-11 | conflicting | partial | Ant Design은 크기별로 가로·세로 패딩이 다르다(Large 16/16, Middle 12/8, Small 8/8). 킷은 item 토큰을 네 변에 동일 적용해 compact/comfortable은 12/12, spacious는 16/16이다. 일부 축·맥락만 일치한다. |
| ATL-11 | applied | partial | 출처는 제출 버튼을 비활성화하지 말고 검증 안내를 주도록 권한다. 킷 제출 버튼은 활성 상태이며 핸들러가 기본 제출을 막고 reportValidity()를 호출한다. 무효일 때 브라우저 검증 UI를 요청하지만 live status는 비우고, 유효할 때만 상태 문구를 넣으므로 부분 적용이다. |


### Consensus

원래의 topic-based 합의 집계(agree/two-systems 등)는 폐기했다. 조건·단위가 같은 규칙 ID를 직접 연결한 경우에만 합의로 센다. 새 계산의 `consensus`는 각 규칙에 `rule_ids` 참조를 담고, 비교가 성립하지 않는 다수 규칙은 single-system으로 둔다. 같은 주제라는 이유만으로 합의하지 않는다.

### 기존 보완자료 19항목 → 판정 ID

| # | 시스템 / 분야 | 상태 | claim-specific ID | 관계 |
|---:|---|---|---|---|
| 1 | Material 3 / 타입 스케일 수치(크기·행간·자간) | 확보 | M3-04 | direct-claim-new-id |
| 2 | Material 3 / 버튼 높이·위계·패딩 | 확보 | M3-05 | direct-claim-new-id |
| 3 | Material 3 / 텍스트 필드·폼 간격 수치 | 부분 확보 | M3-06 | direct-claim-new-id |
| 4 | Material 3 / 표/리스트 밀도 | 부분 확보 | M3-07 | direct-claim-new-id |
| 5 | Material 3 / 카드 구성 | 부분 확보 | M3-08 | direct-claim-new-id |
| 6 | Material 3 / 내비게이션 바·레일·드로어 전환 기준 | 부분 확보 | M3-09 | direct-claim-new-id |
| 7 | Material 3 / 마진·열·간격 8dp 격자 | 미기재 | M3-10 | checked-path-gap-new-id |
| 8 | Spectrum / 컴포넌트 높이 | 부분 확보 | SPE-10 | direct-claim-new-id |
| 9 | Spectrum / 표 행 높이·패딩 | 부분 확보 | SPE-11 | direct-claim-new-id |
| 10 | Spectrum / 버튼 위계·높이 | 부분 확보 | SPE-12 | direct-claim-new-id |
| 11 | Spectrum / 카드 구성 | 부분 확보 | SPE-13 | direct-claim-new-id |
| 12 | Spectrum / 텍스트 필드 간격 수치 | 부분 확보 | SPE-14 | schema-and-gap-new-id |
| 13 | Spectrum / 그리드 열·거터 수치 | 미기재 | SPE-15 | checked-path-gap-new-id |
| 14 | Spectrum / 간격 토큰 값 표 | 확보 | SPE-06 | direct-claim-existing-id |
| 15 | Polaris / 브레이크포인트 px | 확보 | POL-13 | legacy-platform-new-id |
| 16 | Polaris / 간격·크기 토큰 px | 확보 | POL-14 | legacy-platform-new-id |
| 17 | Polaris / 타입 스케일 | 확보 | POL-15 | legacy-platform-new-id |
| 18 | Polaris / 표 밀도 | 부분 확보 | POL-16 | legacy-platform-new-id |
| 19 | Polaris / 버튼 높이 | 부분 확보 | POL-17 | legacy-platform-new-id |


### Fluent 2 후속 보완 → 판정 ID

| 분야 | 현재 확인 상태 | claim-specific ID | 근거 범위 |
|---|---|---|---|
| 버튼·입력 높이 | 부분 명세 확보 | FLU-07 | Fluent 2 Web React; React Button은 높이를 고정하지 않고 구현에서 파생, Input은 24/32/40px min-height |
| 폼 필드 간격 | 부분 명세 확보; 일반 필드 간격 미기재 | FLU-08 | Field의 label/helper token 간격만 확인; 별도 Field 사이 일반 gap은 확인 경로에 없음 |
| 표 밀도 | 부분 명세 확보 | FLU-09 | React TableCell extra-small/small/medium 24/34/44px; content expansion 조건 명시 |

이 조사는 지정 세 분야의 공식 Web React 경로만 대상으로 했다. 전체 Fluent 문서·플랫폼 전수 조사 완료를 뜻하지 않는다. 상세 URL·commit·단위·조건은 [Fluent 공식 근거 파일](fluent2-source-supplement.json)에 둔다.

### 시스템별 판정

| 시스템 | 전체 | applied | partial | conflicting | missing | not-applicable |
|---|---|---|---|---|---|---|
| Ant Design | 15 | 5 | 7 | 0 | 2 | 1 |
| Apple HIG | 16 | 7 | 8 | 0 | 0 | 1 |
| Atlassian | 14 | 5 | 9 | 0 | 0 | 0 |
| Carbon | 25 | 8 | 14 | 1 | 2 | 0 |
| Fluent 2 | 9 | 3 | 6 | 0 | 0 | 0 |
| Material 3 | 10 | 0 | 9 | 0 | 0 | 1 |
| Polaris | 17 | 7 | 8 | 0 | 2 | 0 |
| Spectrum | 15 | 5 | 9 | 0 | 0 | 1 |

### 분야별 판정

| 분야 | 전체 | applied | partial | conflicting | missing | not-applicable |
|---|---|---|---|---|---|---|
| spacing | 11 | 8 | 3 | 0 | 0 | 0 |
| form | 25 | 8 | 13 | 1 | 3 | 0 |
| table | 15 | 3 | 9 | 0 | 2 | 1 |
| button | 15 | 1 | 12 | 0 | 1 | 1 |
| navigation | 5 | 2 | 3 | 0 | 0 | 0 |
| responsive | 15 | 5 | 8 | 0 | 0 | 2 |
| card | 7 | 3 | 4 | 0 | 0 | 0 |
| typography | 22 | 10 | 12 | 0 | 0 | 0 |
| component-size | 6 | 0 | 6 | 0 | 0 | 0 |

### 8개 시스템 × 9개 분야 coverage

Coverage의 ID는 해당 분야에 연결된 직접 주장만 뜻하며 적용 판정이나 문서 전수 조사를 뜻하지 않는다. ID가 없는 셀은 근거 수준에 따라 `확인 경로에 수치/규칙 없음`, `초기 확인 필요(현재 미확정)`, `미추출 기록 있음`, `미조사 기록 없음`으로 구분했다. 자세한 경로와 한계는 JSON `unextracted`를 참조한다.

| 시스템 | spacing | form | table | button | navigation | responsive | card | typography | component-size |
|---|---|---|---|---|---|---|---|---|---|
| Ant Design | ANT-01, ANT-02 | ANT-07, ANT-08 | ANT-11, ANT-12, ANT-13 | ANT-09, ANT-10 | 미조사 기록 없음 | ANT-15 | ANT-14 | ANT-04, ANT-05, ANT-06 | ANT-03 |
| Apple HIG | 확인 경로에 수치/규칙 없음 | HIG-09, HIG-10, HIG-11, HIG-12 | HIG-13 | HIG-02, HIG-03 | HIG-14, HIG-15 | HIG-16 | 미조사 기록 없음 | HIG-04, HIG-05, HIG-06, HIG-07, HIG-08 | HIG-01 |
| Atlassian | ATL-01 | ATL-06, ATL-07, ATL-08, ATL-09 | ATL-13 | ATL-10, ATL-11, ATL-12 | 미조사 기록 없음 | ATL-14 | 미조사 기록 없음 | ATL-02, ATL-03, ATL-04, ATL-05 | 확인 경로에 수치/규칙 없음 |
| Carbon | CAR-01, CAR-02 | CAR-03, CAR-04, CAR-05, CAR-06, CAR-07, CAR-08, CAR-09, CAR-10 | CAR-11, CAR-12, CAR-13 | CAR-14, CAR-15, CAR-16, CAR-17 | CAR-18, CAR-19 | CAR-20, CAR-21, CAR-22 | CAR-23 | CAR-24, CAR-25 | 확인 경로에 수치/규칙 없음 |
| Fluent 2 | FLU-01 | FLU-07, FLU-08 | FLU-09 | FLU-07 | 미조사 기록 없음 | FLU-05, FLU-06 | 미조사 기록 없음 | FLU-03, FLU-04 | FLU-02, FLU-07 |
| Material 3 | 확인 경로에 수치/규칙 없음 | M3-06 | M3-07 | M3-05 | M3-09 | M3-01, M3-02, M3-10 | M3-08 | M3-04 | M3-03 |
| Polaris | POL-01, POL-02, POL-14 | POL-09, POL-10 | POL-06, POL-07, POL-08, POL-16 | POL-11, POL-17 | 미조사 기록 없음 | POL-12, POL-13 | POL-03, POL-04, POL-05 | POL-15 | 초기 확인 필요(현재 미확정) |
| Spectrum | SPE-05, SPE-06 | SPE-07, SPE-08, SPE-14 | SPE-11 | SPE-12 | 미조사 기록 없음 | SPE-09, SPE-15 | SPE-13 | SPE-01, SPE-02, SPE-03, SPE-04 | SPE-10 |

### 미확인 범위 분류

- **초기 이력 스냅샷**: 첫 Fluent 미확인 행과 첫 M3/Spectrum/Polaris 확인필요 행은 초기 조사 시점의 기록으로 보존했고 `historical_snapshot: true` 및 현재 supplement entry 연결을 추가했다. Fluent의 세 지정 분야는 현재 Web React 경로 확인을 마쳤다(FLU-07~09). 단, 일반 inter-Field gap은 조회한 경로에 값이 없어 현재도 미기재다.
- **조회 경로에 미기재**: M3 일반 8dp grid; Spectrum 보편 12열 grid; HIG의 일반 spacing/table row/button height; Carbon과 Atlassian의 일부 px 치수; Ant Design의 checked layout page breakpoint px.
- **조회 범위가 좁음**: M3 table은 list tokens만 확인; Spectrum component-size mapping과 일반 form gap; Spectrum 2 help/error 속성의 실제 교체 동작; Fluent 2는 Web React의 지정 컴포넌트 구현만 확인했고 전체 문서·다른 플랫폼은 전수 조사하지 않았다.
- **접근 실패/구형 URL**: 기존 초기 조사에서 기록된 404/JS-render/access paths는 원본 기록을 보존했다. 새 supplement의 pinned GitHub source links는 원문 원본으로 기록했으나, 이 Run의 웹 open에서 GitHub cache miss가 난 링크는 그 사실을 별도 기록하고 source supplement의 재파싱 결과를 사용했다.
- **search-snippet 미확인**: SPE-09 12열 주장. 적용 집계에서 제외. SPE-07은 top/side 및 default top만 Spectrum 2 schema로 확인해 규칙 범위를 좁혔다; SPE-08은 helpText/errorMessage 속성만 확인되며 교체·복귀 동작은 unverified. SPE-09의 12열 주장은 확인되지 않아 적용 집계에서 제외한다.

### 시각 교정 후보

15개를 채우지 않았다. `visual_candidates`에 코드·영향 범위가 확인된 6개만 기록했다. 직접 연결되는 재감사 화면은 각 후보에 열거했고, 원인 코드가 해당 시각 사례를 만들었는지 실행·슬롯 추적하지 않은 경우 가설로 표시했다. 전체 183개 관찰과 캡처는 `visual-reaudit.md`에 보존되어 있다.

## 4. 규칙 대장

### spacing

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| CAR-01 | 간격 토큰은 2·4·8 배수 13단계(2px~160px)이며 margin/padding 모두에 쓴다 ([출처](https://carbondesignsystem.com/elements/spacing/overview/)) | 모든 UI · 2,4,8,12,16,24,32,40,48,64,80,96,160px | single-system(CAR-01) | **partial** | `src/spacing.mjs:22`, `src/spacing.mjs:34` | Carbon의 전체 간격 값 집합은 킷에 그대로 채택되지 않았다. 출처 값은 160px까지지만 킷은 hairline 예외와 4px 배수 128px까지를 허용한다. 4px 격자 원리는 재사용하므로 완전 적용이 아니라 부분 적용이다. |
| CAR-02 | 브레이크포인트에 따라 토큰 단계를 한두 칸 건너뛰어 간격을 조정한다 ([출처](https://carbondesignsystem.com/elements/spacing/overview/)) | 화면 폭 변화 · 토큰 자체는 고정, 단계만 이동 | single-system(CAR-02) | **applied** | `src/spacing.mjs:7`, `src/styles/shells.mjs:30` | sectionM·bandM 같은 모바일 전용 토큰이 있고 ≤640px 에서 사용한다. |
| FLU-01 | 간격 램프는 4px 기반(2,4,6,8,10,12,16,20,24,28,32,36,40,48,52,56) ([출처](https://fluent2.microsoft.design/layout)) | 기본 · 4px 기반 | single-system(FLU-01) | **applied** | `src/spacing.mjs:22`, `src/spacing.mjs:34` | 4px 격자와 일치(6·10·28·36·52 등 Fluent 중간값은 킷이 의도적으로 금지: S07). |
| SPE-05 | 가까울수록 관계가 강하고 일관된 근접은 같은 그룹을 뜻한다; 레이아웃 간격과 컴포넌트 간격은 다른 스케일 ([출처](https://spectrum.adobe.com/page/spacing/)) | 간격 결정 · 정성 규칙 | single-system(SPE-05) | **applied** | `src/spacing.mjs:30`, `src/spacing.mjs:28`, `src/spacing.mjs:36` | tight<near<item<head<gap<section<band 순서를 시험으로 고정하고 컴포넌트 내부와 구역 간격을 분리한다. |
| SPE-06 | 간격 토큰 spacing-50(2px)~spacing-1000(96px) ([출처](https://spectrum.adobe.com/page/spacing/)) | 토큰 · 2~96px | single-system(SPE-06) | **partial** | `src/spacing.mjs:22` | 보완 자료에서 Spectrum 1의 2~96px 토큰표를 확인했다. 킷은 hairline 예외와 4px 배수로 128px까지 사용한다. 토큰 스케일 원리는 재사용하지만 전체 수치 집합은 다르므로 부분 적용이다. |
| ATL-01 | 8px 기반 토큰(space.050=4, 100=8, 200=16, 300=24, 400=32, 1000=80); 작은 값은 아이콘·입력 내부, 12~24는 컨테이너 패딩, 32~80은 콘텐츠 사이 ([출처](https://atlassian.design/foundations/spacing)) | 기본 · 4/8/16/24/32/80px | single-system(ATL-01) | **applied** | `src/spacing.mjs:7`, `src/spacing.mjs:34` | 킷 토큰이 같은 크기 구간(near 8, gap 16~32, inset 16~32)에 용도별로 대응한다. |
| POL-01 | Shopify admin 은 4px 간격 격자를 기본으로 한다 ([출처](https://shopify.dev/docs/apps/design/layout)) | 앱 레이아웃 · 4px | single-system(POL-01) | **applied** | `src/spacing.mjs:22`, `src/spacing.mjs:34` | S07 4px 격자. |
| POL-02 | 저밀도 화면은 느슨하게, 고밀도는 촘촘하게, 한 페이지에서는 밀도를 일관되게 유지 ([출처](https://shopify.dev/docs/apps/design/layout)) | 밀도 · 정성 규칙 | single-system(POL-02) | **applied** | `src/spacing.mjs:7`, `src/styles/base.mjs:37` | 밀도 축이 페이지당 하나라 일관성이 구조적으로 보장된다. |
| ANT-01 | 간격 기본 단위 8px, 3단계 small 8 / medium 16 / large 24; 가까울수록 한 덩어리 ([출처](https://ant.design/docs/spec/proximity)) | 간격 · 8·16·24px | single-system(ANT-01) | **applied** | `src/spacing.mjs:7`, `src/spacing.mjs:30` | 킷 near 8, head/gap 16~24 등이 같은 구간이고 근접 원칙 S03 이 같다. |
| ANT-02 | 토큰: sizeUnit 4, padding XS8·SM12·16·LG24·XL32 ([출처](https://ant.design/docs/react/customize-theme)) | 토큰 · 4/8/12/16/24/32px | single-system(ANT-02) | **applied** | `src/spacing.mjs:7` | item 12, inset 16~32 로 같은 값이 포함된다. |

### form

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| FLU-08 | Field 세로 라벨·도움말 간격은 spacingVerticalXXS=2px/XS=4px이며 별도 Field 간 일반 gap은 확인 경로에 미기재 ([출처](https://fluent2.microsoft.design/components/web/react/core/field/usage/), [pinned token values](https://github.com/microsoft/fluentui/blob/8522f09fa0ea1128e7020f494116ca457538646b/packages/tokens/src/global/spacings.ts)) | Web React · 2/4px theme spacing tokens; 별도 필드 gap 미기재 | single-system(FLU-08) | **partial** | `src/styles/chunks.mjs:89`, `src/composition.mjs:120` | 킷은 field 내부 gap 8px, 기본 필드 그룹 gap 20px를 둔다. Fluent 구현에서 확인한 것은 Field 내부 token 간격이며 형제 Field 사이 일반 수치는 없다. 범위 불일치만 기록하고 결함으로 단정하지 않는다. |
| CAR-03 | 폼 입력 사이 간격: 전용 페이지 32px, 모달·사이드패널 등 contained 폼 24px 또는 16px; 섹션 사이는 필드 간격보다 8~16px 크게 ([출처](https://carbondesignsystem.com/patterns/forms-pattern/)) | 폼 컨텍스트에 따라 · 32 / 24 / 16px | single-system(CAR-03) | **partial** | `src/composition.mjs:119`, `src/styles/chunks.mjs:89`, `src/spacing.mjs:7` | 컴파일러가 fieldGap=head(comfortable 16px)를 쓰므로 Carbon 의 contained 폼 하한 16px 에는 맞지만, 단독 폼 페이지(intent=form)에도 16px 이라 전용 페이지 권장 32px 에는 못 미친다. 폼 섹션 간격 규칙은 없다. |
| CAR-04 | 라벨은 입력 위(top-aligned)가 기본이며 라벨과 입력은 가깝게 둔다 ([출처](https://carbondesignsystem.com/patterns/forms-pattern/)) | 기본 · 라벨↔입력 간격 수치는 확인 필요(문서에 없음) | same-condition(CAR-04,ATL-06,SPE-07) | **applied** | `src/styles/chunks.mjs:89`, `src/render/nodes.mjs:128` | .kit-field 가 column 으로 label 위, 입력 아래이고 간격은 8px. |
| CAR-05 | 마지막 입력과 버튼(그룹) 사이에 48px 여백을 권장하고 모바일·contained 폼에서는 달라질 수 있다 ([출처](https://carbondesignsystem.com/patterns/forms-pattern/)) | 전용 페이지 폼 · 48px | single-system(CAR-05) | **partial** | `src/composition.mjs:119`, `src/styles/chunks.mjs:89` | 원문은 모바일·contained 폼의 변형을 명시한다. 킷은 모든 폼의 필드 그룹 뒤에 밀도별 head 간격(12/16/20px)을 둔다. 단독 페이지는 48px 권고에 못 미치지만 예외 맥락도 있어 전면 상충이 아닌 부분 적용이다. |
| CAR-06 | 오류는 폼 안에 인라인으로 표시한다. 오류 상태는 빨간 테두리 + 오류 아이콘 + 오류 메시지 ([출처](https://carbondesignsystem.com/components/text-input/usage/)) | 검증 실패 · 테두리 + 아이콘 + 메시지 3요소 | single-system(CAR-06) | **missing** | `src/styles/chunks.mjs:90`, `src/render/nodes.mjs:137`, `src/render/index.mjs:12` | 킷은 :user-invalid 로 테두리·inset 그림자만 바꾼다. 오류 메시지·아이콘 요소는 렌더되지 않고 제출 시 브라우저 기본 말풍선(reportValidity)만 뜬다. |
| CAR-07 | 도움말은 입력 아래에 상시 표시되고 오류·경고가 나오면 도움말을 대체한다 ([출처](https://carbondesignsystem.com/components/text-input/usage/)) | 검증 상태 · 도움말 ↔ 오류 문구 교체 | single-system(CAR-07) | **partial** | `src/render/nodes.mjs:128`, `src/styles/chunks.mjs:91` | 도움말은 입력 아래에 상시 표시(적용)되지만 오류와 교체하는 상태 전환은 없다. |
| CAR-08 | 필수가 다수면 선택 필드에만 (optional) 을, 선택이 다수면 필수에만 (required) 를 표기한다 ([출처](https://carbondesignsystem.com/components/text-input/usage/)) | 필수/선택 표기 · 소수 쪽만 표기 | single-system(CAR-08) | **conflicting** | `src/render/nodes.mjs:128` | 모든 필드 라벨에 (필수) 또는 (선택) 이 붙어 소수만 표기하는 규칙과 다르다. 노이즈가 늘고 라벨이 길어진다. |
| CAR-09 | 라벨은 접근성 예외 승인이 없는 한 필수이다 ([출처](https://carbondesignsystem.com/components/text-input/usage/)) | 모든 입력 · 라벨 100% | single-system(CAR-09) | **applied** | `src/render/nodes.mjs:128` | 모든 필드가 label for= 또는 legend 를 가진다. |
| CAR-10 | 단일 열을 권장하되 논리적으로 묶이는 입력 2~3개는 한 줄에 둘 수 있다 ([출처](https://carbondesignsystem.com/patterns/forms-pattern/)) | 관련 필드 · 한 줄 2~3개 | single-system(CAR-10) | **partial** | `src/styles/chunks.mjs:89`, `src/composition.mjs:124`, `src/styles/chunks.mjs:93` | 기본은 단일 열(max 560px)이고 two-column 변형은 컨테이너 용량이 될 때만 열린다. 그러나 필드 간 연관성은 보지 않고 전체 필드를 2열로 흘리므로 "묶이는 필드만" 조건은 없다. |
| HIG-09 | 플레이스홀더만 두지 않고 별도 라벨을 함께 둔다 ([출처](https://developer.apple.com/design/human-interface-guidelines/text-fields)) | 텍스트 필드 · 라벨+플레이스홀더 | single-system(HIG-09) | **applied** | `src/render/nodes.mjs:128`, `src/styles/chunks.mjs:90` | 모든 필드가 라벨을 갖고 플레이스홀더는 보조다(placeholder 색 muted 4.5:1). |
| HIG-10 | (시스템 간 상충) Apple 은 플레이스홀더 사용을 권장하나 Atlassian 은 쓰지 말라고 한다 ([출처](https://developer.apple.com/design/human-interface-guidelines/text-fields)) | 플레이스홀더 · 상충 | single-system(HIG-10) | **partial** | `src/render/nodes.mjs:128`, `src/styles/chunks.mjs:90` | 킷은 placeholder 속성을 항상 출력(없으면 빈 문자열)하고 라벨을 병행한다. 합의 없는 규칙이므로 부분 적용으로 둔다. |
| HIG-11 | 이메일은 필드 이동 시 검증, 잘못된 입력은 알린다 ([출처](https://developer.apple.com/design/human-interface-guidelines/text-fields)) | 검증 시점 · 필드 이동 시 | single-system(HIG-11) | **partial** | `src/styles/chunks.mjs:90`, `src/render/index.mjs:12` | :user-invalid 가 상호작용 후(대개 blur 후) 테두리를 바꾸므로 시점은 비슷하다. 알림 문구가 없어 사용자가 이유를 알 수 없다(CAR-06 과 같은 원인). |
| HIG-12 | 여러 텍스트 필드는 세로로 쌓고 라벨이 어느 필드 것인지 보이도록 간격을 둔다 ([출처](https://developer.apple.com/design/human-interface-guidelines/text-fields)) | 다중 필드 · 세로 스택 | single-system(HIG-12) | **applied** | `src/styles/chunks.mjs:89`, `src/composition.mjs:119` | 기본 stacked 변형 단일 열, 필드 gap 16~20px, 라벨-입력 8px 로 라벨 귀속이 구분된다. |
| SPE-07 | Spectrum 2 Text field schema supports top/side labelPosition; default is top. ([출처](https://github.com/adobe/spectrum-design-data/blob/6ae966d623508ee4d7031c6bafe93785a8c29468/docs/markdown/components/text-field.md)) | 텍스트 필드 · top/side, default top (Spectrum 2 schema); translation and responsive benefit not claimed from the schema. | same-condition(SPE-07,CAR-04,ATL-06) | **applied** | `src/styles/chunks.mjs:89` | Spectrum 2 schema explicitly has labelPosition top/side with default top. The kit renders labels above fields. No claim is made that the source establishes translation or responsive benefit. |
| SPE-08 | Spectrum 2 Text field schema exposes helpText and errorMessage properties; checked source does not establish that error replaces help text and returns after resolution. ([출처](https://github.com/adobe/spectrum-design-data/blob/6ae966d623508ee4d7031c6bafe93785a8c29468/docs/markdown/components/text-field.md)) | 검증 상태 · helpText/errorMessage properties exist; swap/restore behavior unverified. | single-system(SPE-08) | **partial** | `src/render/nodes.mjs:128`, `src/render/index.mjs:12` | Spectrum 2 schema에서 helpText/errorMessage 속성은 확인했으나 검색 요약의 오류 대체·복귀 동작은 확인되지 않았다. 킷은 도움말을 렌더하지만 필드별 오류 상태 경로는 없어 부분 적용으로 조정했다. |
| ATL-06 | 라벨은 입력 바로 위 왼쪽 정렬이며 항상 보이게 한다 ([출처](https://atlassian.design/components/textfield/usage)) | 텍스트 필드 · 상단 라벨 | same-condition(ATL-06,CAR-04,SPE-07) | **applied** | `src/styles/chunks.mjs:89`, `src/render/nodes.mjs:128` | .kit-field column, label for=. |
| ATL-07 | 플레이스홀더를 쓰지 않고 도움말로 중요한 정보를 전달한다 ([출처](https://atlassian.design/components/textfield/usage)) | 텍스트 필드 · 플레이스홀더 금지 | single-system(ATL-07) | **partial** | `src/render/nodes.mjs:128` | 상충 규칙(Apple 은 허용). 킷은 플레이스홀더를 항상 출력한다(없으면 빈 값). |
| ATL-08 | 사용자 오류 컨테이너에 aria-live=polite 를 둔다 ([출처](https://atlassian.design/components/textfield/usage)) | 오류 안내 · aria-live polite | single-system(ATL-08) | **partial** | `src/render/nodes.mjs:137` | 폼 상태 줄은 role=status aria-live=polite 이지만 필드별 오류 컨테이너와 aria-invalid/aria-describedby 연결은 없다. |
| ATL-09 | 도움말은 설명이 필요한 곳에만 쓴다 ([출처](https://atlassian.design/components/textfield/usage)) | 도움말 · 정성 규칙 | single-system(ATL-09) | **applied** | `src/render/nodes.mjs:128` | help 는 선택 필드(f.help)로만 출력된다. |
| POL-09 | 오류 문구는 구체적으로 쓰고 필드 아래에 스크린리더 안내와 함께 표시한다 ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/text-field)) | 오류 · 필드 아래 메시지 | single-system(POL-09) | **missing** | `src/render/nodes.mjs:137`, `src/render/index.mjs:12` | 오류 메시지 요소 부재(CAR-06). |
| POL-10 | 보조 설명(details)은 필드 아래에 둔다 ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/forms/text-field)) | 도움말 · 필드 아래 | single-system(POL-10) | **applied** | `src/render/nodes.mjs:128`, `src/styles/chunks.mjs:91` | help 가 입력 다음 요소. |
| ANT-07 | 한 영역에서는 위에서 아래 단일 열을 기본으로 하고 다열 배치는 금지(약한 그룹에서 관련 짧은 항목만 한 줄) ([출처](https://ant.design/docs/spec/research-form)) | 폼 · 단일 열 | single-system(ANT-07) | **partial** | `src/styles/chunks.mjs:89`, `src/composition.mjs:124` | CAR-10 와 같음: 용량 기준으로만 2열을 허용하며 관련성 기준은 없다. 시스템 간 해석이 달라(Carbon: 2~3개 허용) 합의 없음. |
| ANT-08 | 설정 항목 <7 무그룹, 7~15 그룹화, >15 탭 분리 ([출처](https://ant.design/docs/spec/research-form)) | 설정 화면 · 7 / 15 | single-system(ANT-08) | **missing** | `src/catalog/nodes.mjs:83` | 폼 필드 최대 12개 한도만 있고 항목 수에 따른 그룹화 판단은 없다. |

### table

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| FLU-09 | TableCell 크기 변형: extra-small 24px, small 34px, medium 44px; 가로 안쪽 여백 8px ([출처](https://github.com/microsoft/fluentui/blob/8522f09fa0ea1128e7020f494116ca457538646b/packages/react-components/react-table/library/src/components/TableCell/useTableCellStyles.styles.ts)) | Web React · CSS cell height/min-height · default medium | single-system(FLU-09) | **partial** | `src/styles/chunks.mjs:82-83` | Fluent는 size별 cell height/min-height를 선언하지만 콘텐츠에 따라 커질 수 있다. 킷 표 셀은 데스크톱 padding 16px·모바일 12px이며 행 높이를 고정하지 않는다. 같은 계약으로 보지 않으며 결함은 주장하지 않는다. |
| CAR-11 | 표 행 높이: xs 24 / sm 32 / md 40 / lg 48 / xl 64px ([출처](https://carbondesignsystem.com/components/data-table/style/)) | 행 크기 선택 · 24·32·40·48·64px | single-system(CAR-11) | **partial** | `src/styles/chunks.mjs:82`, `src/composition.mjs:135` | 실효 셀 패딩 12px + 14px×1.65 행간 ≈ 47px 로 Carbon lg(48)와 같은 구간이다. 그러나 행 크기 선택지(밀도)는 표 전용으로 없고 페이지 밀도 축만 따른다. |
| CAR-12 | 셀 좌우 패딩 16px($spacing-05), 모든 행·열 동일 ([출처](https://carbondesignsystem.com/components/data-table/style/)) | 기본 · 16px | single-system(CAR-12) | **partial** | `src/composition.mjs:135`, `src/styles/chunks.mjs:82` | Carbon은 모든 행·열에 가로 16px를 요구한다. 킷은 item 토큰을 셀 모든 변에 적용해 compact/comfortable은 12px, spacious는 16px다. 일부 밀도만 일치하므로 부분 적용이다. |
| CAR-13 | 열 머리는 14px SemiBold(600), 행 텍스트는 14px Regular ([출처](https://carbondesignsystem.com/components/data-table/style/)) | 표 · 600 / 400 | single-system(CAR-13) | **applied** | `src/styles/chunks.mjs:82` | thead th font-weight 600, 본문 td 는 regular, 폰트 크기 small(14px). |
| HIG-13 | 열 머리는 명사형으로 짧게, 행은 간결하게 두고 멀티컬럼 macOS 표는 교차 행 색을 쓴다 ([출처](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)) | 표 · 정성 규칙 + 교차 행 | single-system(HIG-13) | **applied** | `src/styles/chunks.mjs:83` | striped 변형(교차 행)이 있고 열 머리는 입력 텍스트를 그대로 쓴다(콘텐츠는 사용자 책임). |
| ATL-13 | 열 머리를 쉬운 말로, 캡션·고유 행 레이블로 접근성을 확보한다 ([출처](https://atlassian.design/components/dynamic-table/usage)) | 표 · 정성 규칙 | single-system(ATL-13) | **applied** | `src/render/nodes.mjs:123` | caption, th scope=col/row, 스크롤 영역에 이름 부여. |
| POL-06 | 숫자·통화 열은 오른쪽 정렬 포맷을 쓴다 ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/layout-and-structure/table)) | 표 · numeric/currency 우정렬 | same-condition(POL-06,ANT-12) | **missing** | `src/styles/chunks.mjs:82`, `src/render/nodes.mjs:123` | 표 셀이 전부 text-align:left 이고 숫자 열 감지·정렬이 없다. tabular-nums 만 적용된다. |
| POL-07 | 좁은 화면에서 표를 목록(키-값 쌓기)으로 바꾸고 열 수는 최소화한다 ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/layout-and-structure/table)) | 반응형 표 · 표→목록 | single-system(POL-07) | **partial** | `src/render/nodes.mjs:123`, `src/styles/chunks.mjs:83` | 킷은 표를 유지하고 가로 스크롤 영역으로 처리한다(문서화된 의도). 열 수 상한 검증도 없다. |
| POL-08 | 행당 심각도 신호(배지·아이콘)는 하나로 제한한다 ([출처](https://shopify.dev/docs/apps/design/layout)) | 표 · ≤ 1 | single-system(POL-08) | **partial** | `src/render/nodes.mjs:123` | 배지는 "상태/status" 열에만 자동 적용되고 yes/no 아이콘이 다른 열에서 추가될 수 있다. 행 단위 제한은 없다. |
| ANT-11 | 표 셀 패딩: Large 16·16, Middle 12·8, Small 8·8px; Small 은 모달용 ([출처](https://ant.design/components/table/)) | 표 크기 · 16/12/8px | single-system(ANT-11) | **partial** | `src/composition.mjs:135`, `src/styles/chunks.mjs:82` | Ant Design은 크기별로 가로·세로 패딩이 다르다(Large 16/16, Middle 12/8, Small 8/8). 킷은 item 토큰을 네 변에 동일 적용해 compact/comfortable은 12/12, spacious는 16/16이다. 일부 축·맥락만 일치한다. |
| ANT-12 | 숫자 열은 오른쪽 정렬 예시를 보이며 기본은 왼쪽이다 ([출처](https://ant.design/components/table/)) | 표 · 우정렬 권장 | same-condition(ANT-12,POL-06) | **missing** | `src/styles/chunks.mjs:82` | POL-06 와 동일. |
| ANT-13 | scroll.y 지정 시 헤더 고정 ([출처](https://ant.design/components/table/)) | 세로 스크롤 표 · 조건부 | single-system(ANT-13) | **not-applicable** | `src/styles/chunks.mjs:82` | 킷 표는 세로 스크롤 영역을 만들지 않는 정적 보고서형이라 고정 헤더 조건이 없다. |

### button

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| CAR-14 | 페이지당 primary 버튼은 하나(임시 플로우 예외) ([출처](https://carbondesignsystem.com/components/button/usage/)) | 페이지 · primary ≤ 1 | single-system(CAR-14) | **partial** | `src/validate.mjs:66`, `src/catalog/nodes.mjs:89` | 검증기는 actions 그룹 안의 primary 만 1개로 제한한다. 페이지 헤더 actions, 히어로 action/secondaryAction, CTA 가 서로 다른 그룹이라 페이지 전체 primary 개수는 검증하지 않는다. |
| CAR-15 | primary / secondary / tertiary / ghost 위계, secondary 는 primary 와 짝으로만 쓴다 ([출처](https://carbondesignsystem.com/components/button/usage/)) | 버튼 그룹 · 4단계 | single-system(CAR-15) | **partial** | `src/catalog/nodes.mjs:17`, `src/styles/base.mjs:73` | primary/secondary/ghost 3단계가 있고 크기는 동일하다. tertiary 단계는 없으며 secondary 단독 사용 금지 규칙은 없다. |
| CAR-16 | danger 변형을 primary·tertiary·ghost 로 제공하고 파괴적 동작에 쓴다 ([출처](https://carbondesignsystem.com/components/button/usage/)) | 파괴적 동작 · danger 변형 | single-system(CAR-16) | **missing** | `src/catalog/nodes.mjs:17` | action.variant 가 primary|secondary|ghost 뿐이며 danger 변형이 없다(danger 색 토큰은 tokens.mjs:62 에 있음). |secondary|ghost 뿐이며 danger 변형이 없다(danger 색 토큰은 tokens.mjs:62 에 있음). |secondary|ghost 뿐이며 danger 변형이 없다(danger 색 토큰은 tokens.mjs:62 에 있음). |secondary\|ghost 뿐이며 danger 변형이 없다(danger 색 토큰은 tokens.mjs:62 에 있음). |
| CAR-17 | 전체 페이지 폼은 primary 를 secondary 왼쪽에, 대화상자는 오른쪽에 둔다. 표·대화상자·알림 버튼은 오른쪽 정렬 ([출처](https://carbondesignsystem.com/components/button/usage/)) | 배치 맥락 · 왼쪽/오른쪽 정렬 | single-system(CAR-17) | **partial** | `src/styles/base.mjs:89`, `src/catalog/nodes.mjs:89` | actions.align(start|center|end)로 정렬은 고를 수 있으나 컨텍스트별 순서 규칙은 없다. 시스템 간 순서 규칙이 서로 달라(Ant: 중요 순서, Atlassian: 그룹 방향 끝) 하나로 고정할 근거도 없다. |center|end)로 정렬은 고를 수 있으나 컨텍스트별 순서 규칙은 없다. 시스템 간 순서 규칙이 서로 달라(Ant: 중요 순서, Atlassian: 그룹 방향 끝) 하나로 고정할 근거도 없다. |center|end)로 정렬은 고를 수 있으나 컨텍스트별 순서 규칙은 없다. 시스템 간 순서 규칙이 서로 달라(Ant: 중요 순서, Atlassian: 그룹 방향 끝) 하나로 고정할 근거도 없다. |center\|end)로 정렬은 고를 수 있으나 컨텍스트별 순서 규칙은 없다. 시스템 간 순서 규칙이 서로 달라(Ant: 중요 순서, Atlassian: 그룹 방향 끝) 하나로 고정할 근거도 없다. |
| HIG-02 | 뷰당 눈에 띄는(prominent) 버튼은 1~2개, 선호 선택은 크기가 아니라 스타일로 구분 ([출처](https://developer.apple.com/design/human-interface-guidelines/buttons)) | 뷰 · prominent ≤ 2 | single-system(HIG-02) | **partial** | `src/styles/base.mjs:73`, `src/validate.mjs:66` | 버튼 크기는 변형 간 동일하고 스타일로만 구분한다(적용). 뷰 단위 prominent 개수 제한은 없고 그룹당 1개만 강제한다. |
| HIG-03 | 파괴적 동작에 primary 역할을 주지 않는다 ([출처](https://developer.apple.com/design/human-interface-guidelines/buttons)) | 삭제 등 · 정성 규칙 | single-system(HIG-03) | **not-applicable** | `src/catalog/nodes.mjs:17` | 킷 카탈로그에는 파괴적 동작 노드가 없고 danger 변형 자체가 없어 이 규칙이 작동할 지점이 없다(danger 변형 도입 시 재판정, CAR-16 참조). |
| ATL-10 | 페이지·영역당 primary 는 하나만 ([출처](https://atlassian.design/components/button/usage)) | 영역 · primary ≤ 1 | single-system(ATL-10) | **partial** | `src/validate.mjs:66` | CAR-14 와 같음: 그룹 단위만 검증. |
| ATL-11 | 버튼을 비활성화하기보다 검증 메시지를 보여 준다 ([출처](https://atlassian.design/components/button/usage)) | 제출 버튼 · 비활성 지양 | single-system(ATL-11) | **partial** | `src/render/util.mjs:16`, `src/render/nodes.mjs:137` | 출처는 제출 버튼을 비활성화하지 말고 검증 안내를 주도록 권한다. 킷 제출 버튼은 활성 상태이며 핸들러가 기본 제출을 막고 reportValidity()를 호출한다. 무효일 때 브라우저 검증 UI를 요청하지만 live status는 비우고, 유효할 때만 상태 문구를 넣으므로 부분 적용이다. |
| ATL-12 | 버튼 그룹에서 primary 는 그룹 방향의 끝(오른쪽 정렬이면 맨 오른쪽) ([출처](https://atlassian.design/components/button/usage)) | 그룹 · 방향 끝 | single-system(ATL-12) | **partial** | `src/styles/base.mjs:89` | CAR-17 참조. 시스템 간 상충이라 고정 규칙 없음. |
| POL-11 | primary / secondary / tertiary 단계와 critical tone(되돌리기 어려운 동작 한정, 취소와 짝) ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/actions/button)) | 버튼 · 3단계 + critical | single-system(POL-11) | **partial** | `src/catalog/nodes.mjs:17` | 3단계(primary/secondary/ghost)는 있으나 critical(danger) 변형이 없다(CAR-16). |
| ANT-09 | 버튼 그룹당 primary 는 최대 하나 ([출처](https://ant.design/docs/spec/buttons)) | 버튼 그룹 · ≤ 1 | single-system(ANT-09) | **applied** | `src/validate.mjs:66` | PRIMARY_ACTION 이 그룹당 1개를 강제한다. |
| ANT-10 | 중요한 순서로 놓고 덜 중요한 동작을 오른쪽·아래에 둔다; 위험은 danger ([출처](https://ant.design/docs/spec/buttons)) | 버튼 그룹 · 중요도순 | single-system(ANT-10) | **partial** | `src/catalog/nodes.mjs:89`, `src/catalog/nodes.mjs:17` | 순서는 입력 순서를 그대로 쓰며 danger 변형이 없다. 순서 규칙은 시스템 간 상충. |

### navigation

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| CAR-18 | 왼쪽 패널은 2단계까지만, 3단계는 페이지 탭으로 처리 ([출처](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/)) | 왼쪽 내비 · 최대 2 tier | single-system(CAR-18) | **applied** | `src/styles/shells.mjs:41`, `src/styles/shells.mjs:10` | 내비는 그룹(1단) → 링크이며 3단계 구조가 스키마에 없다. |
| CAR-19 | 보조 내비 항목이 5개를 넘거나 자주 오갈 때 왼쪽 패널을 쓴다 ([출처](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/)) | 내비 선택 · > 5 | single-system(CAR-19) | **partial** | `src/catalog/axes.mjs:47`, `src/validate.mjs:82` | shell 별 항목 상한(topbar 6, centered 6, sidebar 8)이 있지만, 5개 초과 시 sidebar 로 유도하는 규칙은 없다(topbar 에 6개 허용). |
| HIG-14 | 탭은 적을수록 좋고 iPadOS 기본 5개 이하, 아이콘 위·라벨 아래(compact) ([출처](https://developer.apple.com/design/human-interface-guidelines/tab-bars)) | 하단 탭바 · ≤ 5 | single-system(HIG-14) | **applied** | `src/catalog/axes.mjs:47`, `src/styles/shells.mjs:76`, `src/styles/shells.mjs:78` | dock shell 항목 상한 5, 하단 고정 내비, 아이콘+라벨 세로 배치. |
| HIG-15 | 콘텐츠는 safe area 안에 두고 배경은 가장자리까지 확장한다 ([출처](https://developer.apple.com/design/human-interface-guidelines/layout)) | 노치·홈 인디케이터 · 정성 규칙 | single-system(HIG-15) | **partial** | `src/styles/shells.mjs:76`, `src/compiler.mjs:34` | 하단 dock 이 env(safe-area-inset-bottom)를 쓰지만 viewport meta 에 viewport-fit=cover 가 없어 iOS Safari 에서 env() 가 0 일 수 있다(확인 필요: 실기기). 가로 safe-area(left/right)는 처리하지 않는다. |

### responsive

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| CAR-20 | 브레이크포인트 sm 320 / md 672 / lg 1056 / xlg 1312 / max 1584px; 열 4/8/16 ([출처](https://carbondesignsystem.com/elements/2x-grid/overview/)) | 그리드 · 672, 1056, 1312, 1584 | single-system(CAR-20) | **partial** | `src/styles/shells.mjs:30`, `src/styles/shells.mjs:28` | 킷의 주 전환은 640/1000px 로 Carbon 672/1056 에 근접하지만 다른 임계값 8종(480·560·700·720·800·801·900·901)이 섞여 있고 열 수 체계(4/8/16)는 없다. |
| CAR-21 | 그리드 마진: 모바일 0~16px, 데스크톱 16px, max 24px; 칼럼 패딩 16px ([출처](https://carbondesignsystem.com/elements/2x-grid/overview/)) | 그리드 · 16/24px | single-system(CAR-21) | **applied** | `src/styles/base.mjs:43`, `src/styles/shells.mjs:28`, `src/styles/shells.mjs:30` | 킷 gutter 는 32/24/16px(폭에 따라)로 모바일 16px 이 Carbon·Atlassian 과 일치한다. |
| CAR-22 | 그리드 최대 폭 1584px ([출처](https://carbondesignsystem.com/elements/2x-grid/overview/)) | max 브레이크포인트 · 1584px | single-system(CAR-22) | **applied** | `src/styles/base.mjs:12` | WIDTH.full 1600 / wide 1280 / standard 1080 로 시스템 범위(864~1584) 안에 있다. |
| M3-01 | 창 크기 클래스: compact <600dp, medium 600~839dp, expanded 840~1199dp, large 1200~1599dp, extra-large ≥1600dp ([출처](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)) | 너비 기준 레이아웃 결정 · 600 / 840 / 1200 / 1600 | single-system(M3-01) | **partial** | `src/styles/shells.mjs:30`, `src/styles/shells.mjs:28` | 출처는 Android 공식 문서이고 이 문서가 M3 breakpoints 와 같다고 명시한다(m3.material.io 본문은 JS 렌더라 직접 추출하지 못함). 킷 640/1000 은 compact 경계(600)와 비슷하지만 expanded(840)에 해당하는 전환이 없다(720~900 사이에 4개 임계값이 흩어짐). |
| M3-02 | 창 크기 클래스는 기기 종류(isTablet)가 아니라 가용 창 크기로 판단한다 ([출처](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)) | 레이아웃 결정 · 기기 대신 창 | single-system(M3-02) | **partial** | `src/layout.mjs:64`, `src/composition.mjs:91` | 원문은 창 크기 클래스를 말하고, 킷 근거는 컴포넌트 container query다. 가용 공간에 따라 적응한다는 원리는 재사용하지만 컨테이너 폭은 창 클래스와 같은 측정값이 아니다. |
| HIG-16 | 기기·방향이 아니라 가용 size class 로 레이아웃을 결정한다 ([출처](https://developer.apple.com/design/human-interface-guidelines/layout)) | 반응형 · 정성 규칙 | single-system(HIG-16) | **applied** | `src/layout.mjs:64`, `src/composition.mjs:91` | container query 기반 배치. |
| FLU-05 | 브레이크포인트 small 320 / medium 480 / large 640 / x-large 1024 / xx-large 1366 / xxx-large 1920px; 12열 그리드 ([출처](https://fluent2.microsoft.design/layout)) | 앱 창 너비 · 480·640·1024·1366·1920 | single-system(FLU-05) | **partial** | `src/styles/shells.mjs:30`, `src/styles/shells.mjs:28` | 640·1024 근처(640/1000)는 일치하나 12열 그리드와 1366+ 구간이 없고 서로 다른 폭 값 10개가 흩어져 있다. |
| FLU-06 | 사용 가능한 영역에 따라 열과 보이는 정보량을 재배치한다 ([출처](https://fluent2.microsoft.design/layout)) | 리플로우 · 정성 규칙 | single-system(FLU-06) | **applied** | `src/layout.mjs:64`, `src/composition.mjs:132` | container query 와 용량 기반 열 선택. |
| SPE-09 | 12열 유동 그리드에 컴포넌트를 정렬한다 ([출처](https://spectrum.adobe.com/page/responsive-grid), search-snippet) | 레이아웃 영역 · 12열 | single-system(SPE-09) | **partial** | `src/layout.mjs:7`, `src/layout.mjs:17` | 검색 요약에서만 확인(수치 확인 필요). 킷은 12열 그리드가 아니라 컨테이너 폭×항목 수로 최대 4열을 고른다. |
| ATL-14 | 브레이크포인트 xxs 320 / xs 480 / s 768 / m 1024 / l 1440 / xl 1768px; 열 2/6/12; 거터 12/16, 마진 16/32; 고정폭 1296/864 ([출처](https://atlassian.design/foundations/grid)) | 그리드 · 768·1024·1440 | single-system(ATL-14) | **partial** | `src/styles/base.mjs:43`, `src/styles/shells.mjs:28`, `src/styles/shells.mjs:30`, `src/styles/base.mjs:12` | 마진 32→16px 와 최대폭 864~1296 범위는 일치. 열 수 체계와 768/1440 구간은 없다. |
| POL-12 | 단일 열 기본(base), 다열·대시보드는 large 폭 ([출처](https://shopify.dev/docs/apps/design/layout)) | 페이지 · base/large | single-system(POL-12) | **applied** | `src/styles/base.mjs:12` | width 축 4단(760/1080/1280/1600)으로 같은 목적을 가진다. |
| ANT-15 | 24열 그리드, 8 배수 간격, 열 폭만 가변·거터 고정; 대표 해상도 1920/1440/1366/1280 ([출처](https://ant.design/docs/spec/layout)) | 레이아웃 · 24열 | single-system(ANT-15) | **partial** | `src/layout.mjs:7`, `src/styles/base.mjs:12` | 킷은 열 개수 고정 대신 용량 기반 최대 4열이며 거터(gap)는 토큰 고정, 열 폭만 가변인 점은 같다. |

### card

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| CAR-23 | 타일은 컨테이너·텍스트·선택적 인터랙션 요소로 구성되고, 클릭 타일은 컨테이너 전체가 이동한다 ([출처](https://carbondesignsystem.com/components/tile/usage/)) | 카드/타일 · 구성 3요소 | single-system(CAR-23) | **partial** | `src/catalog/nodes.mjs:75`, `src/render/nodes.mjs:120` | 카드 구성은 갖춰졌지만 카드 전체를 클릭 영역으로 만드는 규칙(스트레치 링크)은 변형 link 에서만 부분 구현이다. 확인 필요: 실제 클릭 영역 범위. |
| POL-03 | 인터랙티브 카드는 primary 스타일 액션이 최대 하나 ([출처](https://shopify.dev/docs/apps/design/layout)) | 카드 · ≤ 1 | single-system(POL-03) | **applied** | `src/catalog/nodes.mjs:75` | card.action 이 단일 객체라 구조적으로 1개다. |
| POL-04 | 중첩은 2~3단계까지만 두고 과도한 중첩을 피한다 ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/layout-and-structure/section)) | 섹션 구조 · ≤ 3 | single-system(POL-04) | **applied** | `src/validate.mjs:125` | SECTION_DEPTH 가 3번째 중첩을 막는다. |
| POL-05 | 섹션은 자기 제목을 갖고 제목은 컴포넌트 heading 속성을 쓴다(별도 제목 요소 금지) ([출처](https://shopify.dev/docs/api/app-home/polaris-web-components/layout-and-structure/section)) | 섹션 · 정성 규칙 | single-system(POL-05) | **applied** | `src/render/nodes.mjs:30` | 구역·부품 제목은 renderer 가 단일 함수로 만든다. |
| ANT-14 | 화면 2장 이상 콘텐츠는 카드로 그룹화한다 ([출처](https://ant.design/docs/spec/research-form)) | 긴 폼 · 조건부 카드 그룹 | single-system(ANT-14) | **partial** | `src/styles/base.mjs:80`, `src/composition.mjs:101` | 구역·카드가 표면 단위이고 중첩 여백 규칙(S05)이 있지만 "화면 2장 이상이면 카드로 그룹화" 같은 길이 기준 자동 판단은 없다(블루프린트 작성자가 정한다). |

### typography

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| CAR-24 | 타입 스케일은 12px 에서 시작하는 단계표(12·14·16·18·20·24·28·32·36·42·48·...) ([출처](https://carbondesignsystem.com/elements/typography/overview/)) | 기본 스케일 · 12~92px 17단계 | single-system(CAR-24) | **partial** | `src/typography.mjs:63`, `src/typography.mjs:32` | 킷은 고정표가 아니라 body×ratio^exp 모듈러 스케일이며 11px(micro)~96px 로 범위가 비슷하다. 단계표 방식이 달라 값은 일치하지 않는다. |
| CAR-25 | 디지털에서 Light/Regular/SemiBold 를 쓰고 SemiBold 는 제목용으로 한정 ([출처](https://carbondesignsystem.com/elements/typography/overview/)) | 굵기 · 300/400/600 | single-system(CAR-25) | **applied** | `src/typography.mjs:135` | 산세리프 제목 바닥 600, 본문 regular. |
| HIG-04 | 기본 본문 iOS 17pt / macOS 13pt, 최소 iOS 11pt·visionOS 12pt ([출처](https://developer.apple.com/design/human-interface-guidelines/typography)) | 플랫폼별 · 17pt/11pt | single-system(HIG-04) | **partial** | `src/typography.mjs:32`, `src/typography.mjs:64` | 본문 16~17px 은 일치. 가장 작은 micro 역할이 11px 로 iOS 최소 11pt 와 같지만 visionOS 12·Atlassian 12px 보다 작다. micro 는 차트 눈금·아바타 이니셜에만 쓰도록 slots 로 제한되지는 않는다(slots ANY). |
| HIG-05 | 큰 제목 행간: Large Title 34/41(1.21), Title1 28/34(1.21), Body 17/22(1.29); 3줄 이상에서는 tight leading 을 피한다 ([출처](https://developer.apple.com/design/human-interface-guidelines/typography)) | 큰 제목 · ≈1.2 이상 | single-system(HIG-05) | **partial** | `src/typography.mjs:35`, `src/typography.mjs:43` | Apple HIG의 pt 크기·행간은 네이티브 플랫폼과 Apple 서체 기준이다. 킷은 자체 서체 스택의 웹 CSS px를 낸다. 수치를 직접 비교하지 않고 여러 줄 제목에 넉넉한 행간을 쓰는 원칙만 부분 재사용으로 판정한다. |
| HIG-06 | 얇은 굵기(Ultralight·Thin·Light)를 피하고 Regular 이상을 쓴다 ([출처](https://developer.apple.com/design/human-interface-guidelines/typography)) | 굵기 · ≥400 | single-system(HIG-06) | **applied** | `src/typography.mjs:135` | 제목 굵기 바닥이 산세리프 600, 세리프 400 으로 Light 이하가 나오지 않는다. |
| HIG-07 | Dynamic Type 등 사용자 글자 크기 설정을 따르고 인접 뷰는 세로로 쌓이게 한다 ([출처](https://developer.apple.com/design/human-interface-guidelines/typography)) | 글자 크기 설정 · 정성 규칙 | single-system(HIG-07) | **partial** | `src/typography.mjs:103`, `src/typography.mjs:96`, `src/styles/base.mjs:57` | Dynamic Type은 네이티브 기능이다. 킷은 CSS px와 반응형 clamp를 사용해 페이지 확대에는 대응하지만 웹의 텍스트 전용/시스템 글자크기 매핑은 확인하지 못했다. 네이티브와 직접 상충한다고 단정하지 않고 부분 적용으로 둔다. |
| HIG-08 | 서체 수를 제한한다 ([출처](https://developer.apple.com/design/human-interface-guidelines/typography)) | 서체 구성 · 정성 규칙 | single-system(HIG-08) | **applied** | `src/typography.mjs:32`, `src/typography.mjs:12` | 프리셋당 head/text 두 스택과 mono 한 스택이다. |
| FLU-03 | 웹 타입 램프: Body1 14/20, Subtitle2 16/22, Title3 24/32, Title1 32/40, Large Title 40/52, Display 68/92 ([출처](https://fluent2.microsoft.design/typography)) | 웹/Windows · 행간 1.33~1.43 | single-system(FLU-03) | **partial** | `src/typography.mjs:35`, `src/typography.mjs:32` | 본문 행간은 킷이 1.55~1.85 로 Fluent 1.43 보다 느슨하고 제목·display 는 Fluent 1.25~1.35 보다 조밀하다(HIG-05 참조). 토큰 구조(역할 램프)는 같은 방식이다. |
| FLU-04 | 가장 작은 Caption2 는 10px/14px, Caption1 12px/16px ([출처](https://fluent2.microsoft.design/typography)) | 웹 · 10~12px | single-system(FLU-04) | **applied** | `src/typography.mjs:64`, `src/typography.mjs:65` | micro 11px, caption 12px 로 Fluent 최소(10px) 이상. |
| SPE-01 | 본문 한 줄은 약 70자가 이상적이며 50~120자 범위 ([출처](https://spectrum.adobe.com/foundations/typography/applying-the-type-system)) | 장문 본문 · 50~120자, 이상 ≈70자 | single-system(SPE-01) | **partial** | `src/styles/chunks.mjs:95`, `src/styles/chunks.mjs:5`, `src/styles/polish.mjs:37` | .kit-prose 는 720px 고정이고 ch 가 아닌 px 라 폰트 크기·언어에 따라 글자 수가 달라진다. article 본문 18px 에서 라틴 ≈80자, 16px 에서 ≈90자(추정, 확인 필요: 실측). 한글은 훨씬 적은 글자 수에 같은 폭이다. 리드 설명은 42em·40em 로 em 기반이라 적절. |
| SPE-02 | 본문·컴포넌트·상세·메트릭 스타일을 의미 기능으로 구분한다 ([출처](https://spectrum.adobe.com/foundations/typography/applying-the-type-system)) | 타이포 적용 · 정성 규칙 | single-system(SPE-02) | **applied** | `src/typography.mjs:63`, `src/typography.mjs:156` | ROLES 가 의미 역할 표이고 lintType 이 raw font-size 를 막는다. |
| SPE-03 | 스크립트·플랫폼별 line metrics 를 점검한다 ([출처](https://spectrum.adobe.com/foundations/typography/applying-the-type-system)) | 다국어 · 정성 규칙 | single-system(SPE-03) | **applied** | `src/typography.mjs:7`, `src/typography.mjs:202` | 한글 대체 서체와 한글 자간 상한을 코드·문서로 고정했다. |
| SPE-04 | 표·수치에 tabular figures 를 쓴다(서체 기능) ([출처](https://spectrum.adobe.com/page/typography/)) | 숫자 정렬 · tabular-nums | same-condition(SPE-04,ANT-05) | **applied** | `src/styles/chunks.mjs:82`, `src/styles/polish.mjs:9` | 표·지표·가격에 font-variant-numeric:tabular-nums 가 적용된다. |
| ATL-02 | 줄 길이 60~80자(영문 10~12단어) ([출처](https://atlassian.design/foundations/typography/applying-typography/)) | 장문 본문 · 60~80자 | single-system(ATL-02) | **partial** | `src/styles/chunks.mjs:95`, `src/styles/base.mjs:64` | SPE-01 과 동일: 720px 고정폭이라 글자 수가 폰트 크기에 따라 흔들린다(추정 80~90자). |
| ATL-03 | 긴 글은 16px 이상, 가장 작은 토큰 12px 은 보조 문구 전용 ([출처](https://atlassian.design/foundations/typography/applying-typography/)) | 본문 · 16px / 12px | single-system(ATL-03) | **partial** | `src/typography.mjs:32`, `src/typography.mjs:64`, `src/typography.mjs:65` | 본문 16~17px 로 충족. micro 11px 가 12px 하한을 밑돈다. |
| ATL-04 | 큰 지표 값에는 더 조용한 보조 텍스트를 붙이고 긴 설명에는 metric 스타일을 쓰지 않는다 ([출처](https://atlassian.design/foundations/typography/applying-typography/)) | KPI · 정성 규칙 | single-system(ATL-04) | **applied** | `src/styles/chunks.mjs:80`, `src/composition.mjs:113` | 값은 stat 역할, 라벨 dt 는 small muted, 상세는 muted. |
| ATL-05 | 시맨틱 제목 구조(h1~)를 사용하고 반응형 상대 단위를 쓴다 ([출처](https://atlassian.design/foundations/typography/applying-typography/)) | 마크업 · 정성 규칙 | single-system(ATL-05) | **partial** | `src/render/nodes.mjs:30`, `src/typography.mjs:103` | 제목 구조는 renderer 가 depth 로 계산(적용). 단위는 px 라 "상대 크기" 부분은 미적용(HIG-07). |
| ANT-04 | 기본 14px / 행간 22px(1.57), 폰트 크기 단계는 3~5종으로 통제; 본문 굵기는 400/500 중심 ([출처](https://ant.design/docs/spec/font)) | 기본 · 14px/22px | single-system(ANT-04) | **partial** | `src/typography.mjs:32`, `src/typography.mjs:35`, `src/typography.mjs:63` | 본문 16~17px, 행간 1.55~1.85 로 Ant 1.57 이상. 킷은 역할이 약 30종이라 "3~5종 통제" 와 다른 철학이고 제목 굵기가 600~900 이다. |
| ANT-05 | 수직 정렬이 필요한 숫자에 tabular-nums 를 쓴다 ([출처](https://ant.design/docs/spec/font)) | 숫자 표시 · tabular-nums | same-condition(ANT-05,SPE-04) | **applied** | `src/styles/chunks.mjs:82`, `src/styles/base.mjs:58` | 표·지표·가격 상시 적용. |
| ANT-06 | 본문·보조·비활성 텍스트 색 대비는 7:1 이상을 유지한다 ([출처](https://ant.design/docs/spec/font)) | 텍스트 색 · ≥ 7:1 (본문) | single-system(ANT-06) | **applied** | `src/tokens.mjs:53`, `src/tokens.mjs:54` | text 7:1, muted 4.5:1 을 모든 배경에서 보증(토큰 단계 검증). |

### component-size

| ID | 규칙 | 조건 · 수치/기준 | 합의 | 판정 | 킷 근거(파일:줄) | 판정 근거 |
|---|---|---|---|---|---|---|
| FLU-07 | React Button은 고정 height 없이 크기별 padding·line-height로 높이가 파생되고, Input min-height는 24/32/40px ([Button guidance](https://fluent2.microsoft.design/components/web/react/core/button/usage), [Input guidance](https://fluent2.microsoft.design/components/web/react/core/input/usage/), [pinned React source](https://github.com/microsoft/fluentui/blob/8522f09fa0ea1128e7020f494116ca457538646b/packages/react-components/react-input/library/src/components/Input/useInputStyles.styles.ts), [Web typography](https://fluent2.microsoft.design/typography)) | Web React · CSS px; Button 파생치 small 24/medium 32/large 40px(아이콘 일부 변형 20/38px), Input min-height 24/32/40px | single-system(FLU-07) | **partial** | `src/spacing.mjs:7`, `src/styles/chunks.mjs:86,90` | 구현은 Fluent UI React v9 pinned commit 기준이다. 킷 control은 40/44/48px라 크기별 직접 대응이 아니다. 버튼 값은 구현 CSS에서 계산된 자연 높이이며 가이드 문서의 고정 규격이 아니다. 외부 차이를 제품 결함으로 올리지 않는다. |
| M3-03 | 터치 대상 최소 48×48dp, 대상 간 8dp 이상 간격 ([출처](https://support.google.com/accessibility/android/answer/7101858)) | 터치 UI · 48dp / 8dp | single-system(M3-03) | **partial** | `src/spacing.mjs:7`, `src/styles/shells.mjs:7`, `src/styles/base.mjs:89` | M3 컴포넌트 문서가 아니라 Google Android 접근성 문서에서 확인한 값이다. 킷 control 은 compact 40 / comfortable 44 / spacious 48 이라 compact·comfortable 에서 48에 미달하고, 내비 항목 간격은 4px(shells.mjs:7)로 8에 미달한다. 버튼 그룹은 12px 로 충족. |
| HIG-01 | 버튼 히트 영역은 최소 44×44pt(visionOS 60pt) ([출처](https://developer.apple.com/design/human-interface-guidelines/buttons)) | 모든 대화형 컨트롤 · 44pt | single-system(HIG-01) | **partial** | `src/spacing.mjs:7`, `src/styles/chunks.mjs:146`, `src/styles/chunks.mjs:148`, `src/styles/polish.mjs:33` | control 40/44/48 중 comfortable·spacious 는 충족. compact(40), breadcrumb 링크(32px), pagination(40px), 코드 복사 버튼(32px)은 44에 미달한다. |
| FLU-02 | 터치 대상: iOS·웹 44×44, Android 48×48 ([출처](https://fluent2.microsoft.design/layout)) | 터치 · 44 / 48 | single-system(FLU-02) | **partial** | `src/spacing.mjs:7`, `src/styles/chunks.mjs:146`, `src/styles/chunks.mjs:148` | HIG-01 과 같은 근거로 compact(40)·breadcrumb(32)·pagination(40)이 44 미달이다. |
| ANT-03 | controlHeight 32, LG 40, SM 24, XS 16 ([출처](https://ant.design/docs/react/customize-theme)) | 컨트롤 · 24/32/40 | single-system(ANT-03) | **partial** | `src/spacing.mjs:7` | Ant Design controlHeight는 16/24/32/40px 변형이다. 킷 control은 density 40/44/48px라 같은 크기 열거가 아니고 40px만 겹친다. 기존의 완전 적용 판정은 과했다. |

## 5. 추출하지 못한 항목 (확인 필요, 기억으로 채우지 않음)

| 시스템 | 항목 | 사유 | 시도한 URL | 상태 |
|---|---|---|---|---|
| Material 3 (초기 이력 스냅샷; 현재 M3-04~10 연결) | 타입 스케일 수치(크기·행간·자간); 버튼 높이·위계·패딩; 텍스트 필드·폼 간격; 표/리스트 밀도; 카드 구성; 내비게이션 바·레일·드로어 전환 기준; 마진·열·간격 8dp 격자 | 초기 조사 당시 확인필요 이력을 보존한다. 현재 공식 supplement의 entries 1~7에 후속 연결했으며, 조사 범위 밖은 미기재로 남았다. | https://m3.material.io/styles/typography/type-scale-tokens, https://m3.material.io/components/buttons/guidelines, https://m3.material.io/foundations/layout/understanding-layout/spacing, https://raw.githubusercontent.com/material-components/material-web/main/docs/theming/typography.md, https://raw.githubusercontent.com/material-components/material-web/main/tokens/_md-sys-typescale.scss | 확인 필요 |
| Apple HIG | iOS 여백·간격 수치; 표 행 높이; 버튼 높이 | HIG 문서에 해당 수치가 없다고 응답(행 높이·필드 높이 "not stated"). | lists-and-tables, text-fields, layout | 문서에 없음 |
| Fluent 2 (초기 이력 스냅샷) | 버튼·입력 높이; 폼 간격; 표 밀도; 간격 페이지(fluent2.microsoft.design/spacing 404) | 초기 시점에 layout·typography만 가져온 기록. 이 상태는 현재 진행 상태가 아니다. 현재 FLU-07~09 및 새 supplement가 세 지정 분야를 후속 조사했다. | https://fluent2.microsoft.design/spacing | 역사 스냅샷; 후속 완료(범위 한정) |
| Fluent 2 (현재 조회 경로) | 별도 Field 사이의 일반 수치 간격 | 공식 Field guidance와 pinned Field 스타일은 label/helper token 간격은 두지만 Field 간 일반 gap은 명시하지 않는다. 다른 플랫폼 수치로 대체하지 않았다. | https://fluent2.microsoft.design/components/web/react/core/field/usage/; https://github.com/microsoft/fluentui/blob/8522f09fa0ea1128e7020f494116ca457538646b/packages/react-components/react-field/library/src/components/Field/useFieldStyles.styles.ts | 확인 경로에 값 없음 |
| Spectrum (초기 이력 스냅샷; 현재 SPE-06·10~15 연결) | 컴포넌트 높이; 표 행 높이·패딩; 버튼 위계·높이; 카드 구성; 텍스트 필드 간격 수치; 그리드 열·거터 수치; 간격 토큰 값 표 | 초기 404/개요 및 검색요약 기록을 보존한다. 현재 official supplement의 entries 8~14에 후속 연결했고, SPE-09 검색요약은 계속 미확인으로 제외한다. | https://spectrum.adobe.com/page/text-field/, https://spectrum.adobe.com/page/table/, https://spectrum.adobe.com/page/button/, https://spectrum.adobe.com/page/cards/, https://spectrum.adobe.com/page/field-label/ | 확인 필요 |
| Atlassian | 표 밀도·정렬; 버튼 높이; 본문 행간 수치; 입력 높이 | usage 페이지에 해당 수치 없음(문서가 defer). | dynamic-table/usage, button/usage, applying-typography | 문서에 없음 |
| Polaris (초기 이력 스냅샷; 현재 POL-13~17 연결) | 브레이크포인트 px; 간격·크기 토큰 px; 타입 스케일; 표 밀도; 버튼 높이 | 초기 확인필요 상태를 보존한다. 현재 official supplement의 entries 15~19에 archived React 근거를 후속 연결했고 current Web Components와 분리했다. | polaris-react.shopify.com/design/space, /design/breakpoints, shopify.dev/docs/api/app-home/using-polaris-components(404) | 확인 필요 |
| Ant Design | 버튼 높이(위계 문서에는 없음; controlHeight 토큰만 확인); 그리드 브레이크포인트 px(layout 문서는 대표 해상도만) | spec 문서는 개념 위주. | https://ant.design/docs/spec/buttons, https://ant.design/docs/spec/layout | 문서에 없음 |
| Carbon | 글줄 길이; 본문 행간; 버튼 높이 px; 왼쪽 패널 폭 | 해당 페이지에 명시되지 않음. | typography/overview, button/usage, UI-shell-left-panel/usage | 문서에 없음 |

## 6. 검증과 한계

- 각 규칙의 `extraction` 값: fetched / search-snippet / prior-research-not-refetched. search-snippet 과 prior 는 수치 신뢰도가 낮다.
- Apple HIG 수치는 HIG 데이터 JSON 엔드포인트로 확인했다(웹 페이지는 JS 렌더). 응답 안의 "updated September 9, 2026" 같은 날짜 문구는 도구 요약이며 검증하지 않았다.
- 판정은 코드 읽기 기준이다. 렌더 측정(브라우저)은 하지 않았다. 표 실효 패딩은 `site/examples/admin-table/index.html` 의 컴파일된 CSS 로 확인했다.
- 줄 번호는 2026-11-16 작업 트리 기준이다.


## 5. 공식 보완자료 신규 claim-specific 규칙

기존 규칙의 분야 테이블은 원래 100개 ID를 그대로 보존한다. 아래 21개 규칙은 official source supplement에서 새로 분리한 주장·플랫폼 경계이며, 위 집계는 원래 100개와 함께 센다. FLU-07~09는 아래 Fluent 보완표에 상세 조건을 기록한다.

| ID | 시스템 | 분야 | 범위·주장 | 판정 | 근거/한계 |
|---|---|---|---|---|---|
| M3-04 | Material 3 | typography | Material Web 타입 역할별 크기·행간·자간 토큰은 역할마다 별개이며 checked snapshot에 body/display 등 값이 있다. | **partial** | 공식 수치가 확보되었고 역할 기반 타이포는 있으나 web rem 토큰을 그대로 채택하지 않았다. M3-01 창 크기 규칙 적용 근거로는 사용하지 않는다. |
| M3-05 | Material 3 | button | Material Web base button container height는 40px이고 여러 variant가 있다; filled token은 deprecated이며 universal padding은 확인되지 않았다. | **partial** | 40px은 compact kit control과 겹치지만 전 variant·padding 토큰 채택은 확인되지 않는다. |
| M3-06 | Material 3 | form | Material Web outlined text-field token에는 deprecated 56px container height가 있으나 multiline은 dynamic이며 별도 필드 간 간격은 확인되지 않았다. | **partial** | Deprecated token과 동적 textarea를 구분했다. 일반 폼 간격 수치가 없으므로 임의의 간격으로 보완하지 않는다. |
| M3-07 | Material 3 | table | Material Web list item 높이는 한 줄/두 줄/세 줄에서 다르며 이 값은 data-table row 규칙이 아니다. | **partial** | List와 table을 분리한다. 킷의 list spacing은 이 고정 높이 시리즈를 채택했다고 볼 수 없다. |
| M3-08 | Material 3 | card | Material Web Card tokens define elevated/filled/outlined variants; checked files do not establish universal card padding/anatomy. | **partial** | 카드 부품은 있지만 M3 variants와 동일한 스타일 토큰 또는 anatomy는 확인되지 않는다. |
| M3-09 | Material 3 | navigation | Material Web navigation token geometry: navigation bar 80px; active indicator 64×32px; those numbers do not define bar/rail/drawer switch thresholds. | **partial** | 네비게이션 구조는 있으나 구체 치수는 일치하지 않는다. 전환 기준은 M3-01과 별도다. |
| M3-10 | Material 3 | responsive | 보완 자료에서 확인한 Material Web token paths는 보편적인 8dp 페이지 여백·열·간격 격자를 명시하지 않는다. | **not-applicable** | 확인한 경로에 일반 layout grid가 없다는 범위 한정 기록이다. Material 생태계 전체에 그런 규칙이 없다는 주장은 아니다. |
| SPE-10 | Spectrum | component-size | Spectrum 1 CSS has component-height tokens and Spectrum 2 schemas expose size enums; checked sources do not define a universal size-to-pixel mapping. | **partial** | S1 measurements and S2 semantic size options remain separate; the kit scale is not a demonstrated mapping. |
| SPE-11 | Spectrum | table | Spectrum 1 CSS table rows vary by size, density, and desktop/mobile context; Spectrum 2 defines density options without px. | **partial** | Density is represented in the kit, but exact dimensions and per-generation semantics are not mapped. |
| SPE-12 | Spectrum | button | Spectrum 2 Button has accent/negative/primary/secondary variants and s/m/l/xl sizes; Spectrum 1 generic heights are not mapped to button size. | **partial** | 외부 위계/크기 옵션과 킷 변형은 주제가 비슷할 뿐 구현 계약이 같지 않다. |
| SPE-13 | Spectrum | card | Spectrum 2 card schemas list variants; layout token widths are component-width tokens, not general card padding/anatomy. | **partial** | 카드 구조 유사성을 외부 규칙의 전면 적용으로 간주하지 않는다. |
| SPE-14 | Spectrum | form | Spectrum 2 Text field schema documents top/side label positions, size enums, helpText and errorMessage properties; checked Spectrum 1 field tokens do not establish a general form gap. | **partial** | Schema properties establish capability, not this kit’s error-state path. |
| SPE-15 | Spectrum | responsive | Checked Spectrum 2 component and token docs do not establish a universal responsive grid column/gutter rule; earlier search-snippet “12 columns” is unverified. | **not-applicable** | The old search snippet cannot support applied counts; this row records the checked-path gap only. |
| POL-13 | Polaris | responsive | Archived Polaris React breakpoint aliases are xs 0, sm 490, md 768, lg 1040, xl 1440px. | **partial** | Historical React dimensions are preserved as a separate platform record; do not recast POL-12 as this same current rule. |
| POL-14 | Polaris | spacing | Archived Polaris React size map and space aliases include legacy px values; named tokens include button-group-gap 8px, card-gap/padding 16px, table-cell-padding 6px. | **partial** | Shared numeric values alone do not prove same token adoption. |
| POL-15 | Polaris | typography | Archived Polaris React font, tracking, and line-height tokens resolve via its size map. | **partial** | This is historical source data, not a claim about current Polaris Web Components. |
| POL-16 | Polaris | table | Archived React DataTable CSS has distinct default/increased/header padding and right-aligned numeric cells; current Web Components docs do not specify px density. | **partial** | The archive-only rule does not make POL-06 (current docs) applied. The kit matches neither full set of axis/context values. |
| POL-17 | Polaris | button | Archived React Button CSS maps micro/slim/medium/large to mobile and md-up heights; current Web Components docs give variants/tones without pixel dimensions. | **partial** | Historical React button values are kept separate from current Polaris documentation and from Material 3 button tokens. |
| FLU-07 | Fluent 2 | component-size | Button natural CSS heights are implementation-derived; Input min-height small/medium/large is 24/32/40px. | **partial** | Web React only; button has no fixed height and computed values vary by icon/content. Kit differences are not labeled defects. |
| FLU-08 | Fluent 2 | form | Field label/helper spacing uses theme tokens; general gap between separate Fields is not stated in checked paths. | **partial** | Web React Field only. Token names remain tokens; no inter-Field value is invented. |
| FLU-09 | Fluent 2 | table | TableCell size variants declare 24/34/44px CSS height/min-height for extra-small/small/medium. | **partial** | Rows may expand for content; this is not a universal rendered row-height guarantee. |



### ATL-11 제출 검증 경로

[src/render/nodes.mjs](../../../src/render/nodes.mjs)에서 `novalidate` 폼, native `required` controls, 활성 submit 버튼, 빈 `role=status` live region을 확인했다. [src/render/index.mjs](../../../src/render/index.mjs)의 submit handler는 기본 제출을 막고 `reportValidity()`를 호출한다. 유효하면 status에 데모 문구를 넣고, 무효면 status를 비운다. 따라서 비활성화 대신 브라우저 자체 검증 피드백은 요청되지만, 실패 상태의 별도 live status 문구는 없다. `checkValidity()` 직접 호출은 없었다. Node에서 export된 `formRuntime` 핸들러를 `reportValidity()=true/false` stub으로 실행해 두 상태 분기와 상태 문구를 확인했다. 실제 브라우저 native validation UI는 실행하지 않았다. 판정은 partial이며 정적 링크 disabled 여부만으로 판단하지 않았다.

### 실행한 검증 명령과 출력

명령: Python heredoc으로 JSON 재파싱·참조/집계 검사·Markdown 표 동기화 검사 후, `urllib`로 pinned Microsoft 원문 파일을 다시 가져와 원문 문자열을 대조했다.

```text
PASS JSON parse: 118 prior IDs preserved + FLU-07/08/09; total 121
PASS references, coverage, consensus, system/category totals, 1 search-snippet excluded
PASS Markdown aggregate tables, 8×9 coverage, rule IDs, history labels
PASS pinned Microsoft source text @ 8522f09fa0ea1128e7020f494116ca457538646b (Button/Input/Field/Table/spacing tokens)
LIMIT checked scope is Fluent Web React; no general inter-Field gap; no exhaustive platform/doc audit
```

### 검증 경계

이 Run에서는 JSON 파싱, rule ID/coverage/consensus/source 참조, 집계 동기화, code path 재대조를 수행한다. source supplement의 원본 파일은 읽기 전용 근거로 유지한다. 이 Run에서 GitHub raw source를 다시 다운로드/재검증하지 않은 보완 수치는 supplement의 pinned source metadata 및 기록된 file path에 대한 의존이며, 위 웹 open에서 관측한 GitHub cache miss도 기록했다.
