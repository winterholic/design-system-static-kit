# 페이지 단위 조립 파이프라인(W5-a)

계약 0.3.0. 코드: `src/platform/page.mjs`(단계와 후보), `src/platform/page-content.mjs`(목적·콘텐츠 → 계획), `src/platform/axes.mjs`(기존 규칙 → 관계). 기준은 [ADR 0012](../adr/0012-assembly-platform.md) §5, §6, §9다.

AI가 HTML이나 CSS를 만들지 않는다. 출력의 모든 마크업은 등록된 재료의 구현(구형 노드 렌더러, 기반 컴포넌트 렌더러)에서 나오고, CSS는 구형 스타일시트와 플랫폼 토큰 블록으로 이루어진다. 요청에는 HTML·CSS를 넣을 키가 없다(`P_REQUEST_KEY`).

## 1. 단계

`assemblePage(request, env)`는 요청 하나에 복수 후보를 낸다. `env = createPlatform()`의 결과다.

| 단계 | 하는 일 | 진단 |
|---|---|---|
| 1 `normalizePage` | 목적·콘텐츠 요청 모양 검사(닫힌 키) | `P_REQUEST*`, `P_PAGE_PURPOSE`, `P_ATTR_*` |
| 2 `planPage` | 패턴·슬롯·페이지 축 결정, 콘텐츠·컴포넌트를 슬롯에 배치 | `P_PAGE_CONTENT`·`P_PAGE_OVERFLOW`·`P_PAGE_SLOT`·`P_PAGE_COMPONENT`·`P_PAGE_CHART`·`P_PAGE_PATTERN`, `P_REL_FORBIDS` |
| 3 `exploreCandidates` | 팔레트·세트·타이포·패밀리 조합 탐색 | `P_SELECT_EMPTY`, `P_ATTR_*` |
| 4 `evaluateCandidates` | 관계·계산 관계 평가(축 금지 포함) | `P_REL_*`, `P_CHECK_*` |
| 5 `assembleCandidates` | 코드 조립(노드 트리 → 렌더 → CSS) | `P_RENDER`, `P_ATTR_LOCKED`·`P_ATTR_AXIS`·`P_ATTR_VALUE` |
| 6 `verifyCandidates` | 품질 검사(대비, 변수 누락, 서체 한도, 페이지 검증기) | `P_CHECK_CONTRAST`, `P_TOKEN_MISSING`, `P_PAGE_INVALID` |
| 7 `compareCandidates` | 순위, 추천 이유, 후보 간 차이 | |

단계가 error로 끝나면 `ok: false`, `stage`는 마지막으로 돈 단계다. 후보가 없으면 `blocked`에 막힌 재료와 조합이 코드·이유와 함께 남는다.

## 2. 요청

```js
assemblePage({
  purpose: 'work-dashboard',            // saas-landing | work-dashboard | editorial-docs | commerce (필수)
  pattern?: 'dashboard-grid',           // 목적이 허용하는 패턴. 없으면 콘텐츠 양이 고른다
  shell?, width?, density?, mode?,      // 요청한 축은 바꾸지 않는다. mode는 light|dark
  styleContext?, palette?, subtokenSet?, typeSystem?, families?: [id],
  components?: [{base, family?, props?, content, slot?}],   // 기반 컴포넌트를 슬롯에 놓는다
  content?: {name, nav, title, description, actions, kpis, charts, table, list,
             hero, features, featuresTitle, quotes, faq, cta, lead, sections, notice, products, productsTitle},
  candidates?: 1..8,                    // 기본 3
}, env)
```

요구한 재료(`palette` 등)는 검사해 그대로 쓰고 `decisions[].source: 'intent'`로 남긴다. 요구하지 않은 재료는 추천 순위에서 고른다.

## 3. 데이터 양이 배치를 바꾼다

| 입력 | 규칙 | 근거 기록 |
|---|---|---|
| KPI 개수 | 열 수는 마지막 줄에 한 칸만 남지 않고 빈 칸이 가장 적은 값: 2 이하 2열, 3 → 3열, 4 → 4열, 5·6 → 3열, 7·8 → 4열, 9 → 3열, 10 이상 → 4열. 7개 이상이면 밀도를 compact로(요청하지 않았을 때). 12개 초과는 거부(`P_PAGE_OVERFLOW`), 2개 미만도 거부 | `layout.kpis.columns` |
| 표 행 수 | 10행 이하 plain. 11행 이상 striped와 검색·필터 줄. 20행 초과는 20행씩 쪽으로 나눠 1쪽을 놓고 페이지네이션을 둔다. 쪽 이동 칸이 있는 `erp-workspace`만 가능하고, 차트와 함께면 두 패턴이 모두 맞지 않아 이유를 낸다 | `layout.table.*` |
| 차트 개수 | 1개는 그대로, 2~6개는 격자(2·4개 2열, 3·5·6개 3열). 목록이 함께면 본문+보조 영역. 6개 초과는 거부 | `layout.charts.columns` |
| 기능 카드 수(랜딩) | KPI와 같은 열 규칙. 12개를 넘으면 구역을 나눈다. 패밀리가 있으면 구형 card 대신 `card-surface` 패밀리 구성원으로 놓는다 | `layout.features[n].columns` |
| 섹션 수(문서) | 4개 이하 `editorial-article`, 5개 이상 `docs-reference` | `layout.pattern` |
| 상품 수(커머스) | 열 수 규칙, 한 쪽 12개씩 나눠 1쪽과 페이지네이션 | `layout.products.pages` |

표를 쪽으로 나누면 1쪽 밖의 행은 이 화면에 없다. 그 사실이 `decisions`에 "1쪽(20행)이고 쪽 이동은 페이지네이션이 맡는다"로 남는다. 구형 `table`과 `data-table` 노드가 모두 40행 상한이라 한 노드에 담을 방법이 없다.

## 4. 컴포넌트와 차트가 실제로 들어가는 방식

- `components[].base`의 id 끝(`card-surface`)이 2.6.0 노드 이름이다. 슬롯이 그 노드(또는 그 노드가 `placeLike`로 따르는 부품)를 직접 받거나, 격자를 받으면 격자 칸으로 넣는다. 격자는 2칸 이상이라 컴포넌트 하나만으로는 새 격자를 만들 수 없다(이미 격자가 있는 슬롯을 `slot`으로 고르면 합친다).
- 넣지 못하면 다른 곳에 놓지 않고 이유와 대안 슬롯을 낸다: 없는 슬롯, 받지 않는 슬롯, 놓을 수 없는 컴포넌트, 격자 1칸.
- 노드는 패밀리의 고정 축(`preset`)과 열린 축(`props`)을 합쳐 만든다. 고정 축을 바꾸려는 `props`는 `P_ATTR_LOCKED`, 계약이 금지한 조합은 `P_REL_CONTRACT`다. 렌더된 카드에는 `data-family`가 붙고 패밀리 모양 변수는 그 범위에만 있다.
- 차트: `content.charts[].preset`은 차트 프리셋 29개 중 하나이고 노드는 `resolveChartPreset`이 만든다. 프로파일 경로가 막던 형태 제한과 "기본 차트 위치" 제한이 없어, 프로파일에 적힌 프리셋 7개가 모두 조립된다. `title`·`categories`·`series`·`unit`을 주면 프리셋의 예시 데이터를 덮는다. 프리셋 없이 `kind`·`title`·`categories`·`series`로도 놓는다.

## 5. 후보

- 탐색: 종류별로 추천 순위의 앞쪽(`BEAM`: 팔레트 4, 세트 3, 타이포 3, 패밀리 2)을 곱한다. 한 재료만으로 알 수 있는 막힘(어느 세트와도 대비를 못 맞추는 팔레트, 한글 한도를 넘는 서체 조합)은 빔을 자르기 전에 걸러 `blocked`에 남긴다.
- 평가: 조합마다 관계 그래프에 선택한 재료와 축 값 재료(페이지 축, 패밀리 모양, 서체 짝)를 함께 넣는다. 금지·계산 관계에 걸리면 `blocked`에 `{combination, blocked: [{code, reason, with}]}`로 남는다.
- 점수: 적용된 `prefers`·`avoids` 우선순위 합 + 스타일 맥락의 축 선호 + 타이포 적합성. 순위는 점수 순이되 이미 고른 후보와 같은 재료(팔레트·세트·타이포·패밀리 묶음)를 공유할 때마다 8점씩 깎아 서로 다른 후보가 앞에 오게 한다. 1순위는 항상 최고 점수다. 같으면 앞선 쪽(결정적).
- 후보 하나: `{id, rank, score, adjustedScore, selection, decisions: [{slot, id, source, score, reasons}], relations: {ok, applied, checks}, quality: {ok, contrast, tokens, type, page}, value: {css, html, script, standalone, tokens, manifest}, reasons, fingerprint}`. `value`는 1순위 후보가 `result.value`다.
- 비교: `comparison.against[]`가 1순위와의 차이(바뀐 재료 종류, 점수 차이, 1순위만 가진 근거 3개, 순위 계산에서 깎인 점수)를 문장으로 낸다.
- 결정적이다. 시간·난수·전역 상태가 없고, 정렬은 점수 내림차순 뒤 id 순이다.

## 6. 기존 규칙을 관계로 옮긴 결과

| 기존 규칙 | 옮긴 곳 | 확인 |
|---|---|---|
| 축 조합 금지 X01~X11(`axisBans`) | `axis-value` 재료 사이의 `forbids` 관계 18쌍(이유는 기존 `why`, 규칙 id를 앞에 붙임) | `tests/platform-pipeline-forbids.test.mjs`: 모든 값 쌍에서 술어와 관계가 일치 |
| 테마 금지(`themes[id].forbid`) | 그 테마에서 온 스타일 맥락이 축 값 재료로 선언하는 `forbids`. 테마 원본을 읽으므로 mode·ornament·backdrop 금지도 빠지지 않는다 | 54개 테마 전부 |
| 패밀리 모양 금지 | 패밀리의 `shape`가 축 값 재료 id가 되어 같은 관계에 걸린다(`recommend`는 순위에서 빼고 `blocked`에 이유) | X04·X05 시험 |

개별 값이 모두 유효해도 조합이 금지면 `P_REL_FORBIDS`와 규칙의 설명이 나온다. 요구하지 않은 축은 규칙이 허용하는 대안으로 옮기고(예: 요청한 `density: compact`와 테마 기본 `icon: line-fine`이 X09로 충돌하면 `icon`을 `line`으로) 그 이동이 `decisions`에 이유와 함께 남는다. 요구한 값끼리의 충돌은 바꾸지 않고 거부한다.

## 7. 기준선의 플랫폼 구간

`node scripts/platform/baseline.mjs`는 `platform` 구간을 낸다(`scripts/platform/platform-baseline.mjs`).

- **실제 조립 가능 조합**: (패턴 × 셸 × 폭 × 밀도 × 모드) × (팔레트 × 세트 × 타이포 × 패밀리) 중 관계·색·서체 평가를 통과한 수. 렌더 없이 계산한다.
- **검증된 조합**: 실제로 `assemblePage`로 조립해 품질 검사를 통과한 요청 수와 서로 다른 출력 수.
- **고유 색 토큰 집합 수**(light·dark), **고유 서체 짝 수**, **고유 패밀리 수**.

다른 작업자의 재료가 main에 들어오면 다시 측정해 `docs/evidence/platform/baseline.json`을 갱신한다.

## 8. 서비스 함수 초안(W5-b에서 공개)

공개는 다음 단계다. 지금은 내부 모듈이고 이 모양을 초안으로만 둔다.

```js
// src/service/assemble-design.mjs (초안)
assembleDesign(request)  // request는 assemblePage의 요청과 같다
// → {ok, value | errors, warnings, catalogVersion, contractVersion}
//   value: {selected, candidates: [...], blocked: [...], comparison, plan, decisions}
//   candidates[].value는 {css, html, script, standalone, tokens, manifest}. 웹은 이것을 그대로 내보낸다.
```

REST(`POST /api/v1/assemble`)와 MCP(`assemble_design`)는 같은 함수를 부르고, 같은 요청에 같은 바이트를 낸다.

## 9. 알려진 한계

- 구형 노드 렌더러가 만드는 마크업이라 `data-family` 범위는 `card-surface`에만 붙는다. 다른 기반 컴포넌트(Button, Tabs 등)를 슬롯에 놓는 경로는 같은 규칙(`placeLike`)으로 열려 있지만, 후보마다의 렌더 확인은 카드만 했다.
- 목적 패밀리(`src/platform/families`, W3)는 아직 읽지 않는다. 슬롯에 놓는 것은 기반 컴포넌트와 패밀리 구성원이다.
- 표를 쪽으로 나누면 1쪽 밖의 행은 출력에 없다(§3).
- 스타일 맥락은 요청했을 때만 쓴다. 없으면 목적별 템플릿의 테마 기본값이 페이지 축을 정하고 스타일 맥락 선호는 순위에 들어가지 않는다.
