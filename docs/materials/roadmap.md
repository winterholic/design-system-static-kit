# 재료 확장 로드맵

우선순위는 `docs/materials/audit.md`의 최초 목록을 2026-11-22 기준 구현과 대조해 갱신했다. 검증 범위와 현재 수치는 [범주별 커버리지](coverage.md), 기계 판독 자료는 [coverage.json](../evidence/materials/coverage.json)을 기준으로 한다. P0가 가장 먼저다. `src/`, 렌더러, 웹 앱의 변경은 이 로드맵에 적힌 후속 작업 범위이며 이번 커버리지 작업에서는 수정하지 않았다.

## 이미 연결된 기반

- 계층 색 토큰 257개와 static-kit 팔레트는 `src/color-tokens.mjs`에 연결됨. 기존 Coolors 팔레트 427개는 남아 있지만 별도 권리 허락이 확인되지 않아 새 노출·내보내기·수집은 차단 상태다. 근거: `docs/materials/audit.md` §3·§5.
- 차트 프리셋은 2.6.0 확장 표·렌더러·재료에 연결됨. Select·Table 및 컨트롤 8종도 컴파일 경로에 연결됨. 근거: `docs/materials/audit.md` §6·§7.
- 디자인 프로필 7개와 레이아웃 패턴 11개, 조립 경로가 연결됨. 서체 역할 프리셋도 별도 재료로 연결됨. 근거: `docs/materials/audit.md` §4·§7.

## 후속 작업

| 우선순위 | 과제와 완료 방향 | 대상 코드 경로 | 의존성·순서 | 근거와 미완료 범위 |
|---|---|---|---|---|
| **P0** | **팔레트 권리와 제품 경로 정리.** 별도 허가가 확인되기 전 427개 외부 팔레트의 신규 노출·내보내기·수집을 막고, 기존 호환 입력에 대한 제품 내 사용 경로를 점검한다. 자체 팔레트만 신규 선택 경로에 둔다. | `src/materials/adapters.mjs`, `src/materials/palettes.mjs`, `src/color-tokens.mjs`, `src/service/`, `tests/materials-registry.test.mjs` | 권리 근거를 먼저 확정한다. 기존 2.4.0·2.5.0 입력/출력 호환성 테스트를 유지하면서 경로별 게이트를 추가한다. | `docs/materials/audit.md` §3은 427개 모두 `unverified`이며 기존 제품 경로 조치를 후속으로 남긴다. 실제 제품의 접근·내보내기 경로별 범위는 아직 목록화되지 않았다. |
| **P1** | **상태 계약과 동작 검증을 맞춘다.** 의미가 있는 상태 전이만 계약에 적고 disabled·loading·invalid·selected 등의 전이가 렌더 및 정적 런타임과 일치하는지 실패 테스트로 확인한다. 선언 상태 수만으로 동작 검증을 주장하지 않는다. | `src/materials/{button,input,select,table,feedback,tabs}.mjs`, `src/materials/control-kit.mjs`, `src/catalog/node-extensions.mjs`, `src/render/index.mjs`, `tests/material-components.test.mjs`, `tests/wire-260.test.mjs` | P1 계약을 먼저 정하고, 노드 필드 허용 여부를 정한 뒤 렌더와 브라우저 상호작용을 잇는다. 정적 HTML 제약(콜백·네트워크 미지원)은 유지한다. | `docs/materials/audit.md` §1·§7. 현재 커버리지 JSON은 선언값 기준이며 상태 값이 있지만 전이가 없는 재료가 있어도 누락된 상태 계약인지 의도된 표현 상태인지 판별하지 않는다. |
| **P2** | **Select·Table의 상호작용 범위를 보강한다.** Select의 키보드/listbox와 Table 정렬·선택·빈/오류·페이지네이션을 명세하고, 정적 미리보기에서 가능한 상태와 앱 호스트가 제공해야 하는 기능을 분리한다. | `src/materials/select.mjs`, `src/materials/table.mjs`, `src/catalog/node-extensions.mjs`, `src/validate.mjs`, `src/render/index.mjs`, `tests/material-components.test.mjs`, `tests/wire-260.test.mjs` | P1 상태 전이 정의를 선행한다. 호스트 콜백을 필요로 하는 async Select는 별도 런타임 계약 결정 전까지 지원을 주장하지 않는다. | `docs/materials/audit.md` §1·§7: async Select 및 선택·페이지네이션 노드 필드는 현재 미제공이다. |
| **P3** | **반응형 계약의 빈칸을 실제 CSS 근거로 채운다.** 각 재료의 `responsive.strategy`를 `unspecified`에서 실제 값으로 바꾸고 테스트가 CSS 규칙과 전략 간 불일치를 잡게 한다. | `src/materials/adapters.mjs`, 개별 `src/materials/*.mjs`, `src/render/`, `tests/materials-registry.test.mjs`, 브라우저 검증(`scripts/layout-quality/`) | 재료별 소비 CSS와 반응형 동작을 먼저 확인하고 기록한다. 화면별 테스트 폭과 기존 B단계 대표 화면을 연결한다. | 현재 레지스트리에서 28개 재료가 `unspecified`다. ID 목록은 coverage 산출물에서 재현해 확인한다. `docs/materials/audit.md` §1은 이전 감사 당시 같은 결손을 기록했다. |
| **P4** | **독립 재료가 없는 기본 UI 부품을 확장한다.** 날짜 선택기, 토스트 큐, 배지·칩을 각각 필요한 상태·접근성·입력 계약으로 분리해 등록한다. | `src/materials/` 신규 모듈, `src/catalog/node-extensions.mjs`, `src/validate.mjs`, `src/render/`, `tests/material-components.test.mjs`, `tests/wire-260.test.mjs` | P1의 상태 계약과 현재의 Select/Table·컴포넌트 조립 방식을 재사용한다. 동작 모델이 정해진 뒤 2.6.0 opt-in 경로에 연결한다. | `docs/materials/audit.md` §1에서 날짜 선택·토스트 큐·독립 배지/칩을 미구현 범위로 기록한다. |
| **P5** | **차트 의미색과 모션 토큰을 필요한 사용자 흐름에 연결한다.** 순차·발산 차트 색 역할을 정리하고, duration/easing은 상태 전이에서 실제 참조할 때 추가한다. | `src/color-tokens.mjs`, `src/materials/contract.mjs`, `src/styles/base.mjs`, `src/render/chart.mjs`, `tests/color-tokens.test.mjs`, `tests/chart-presets.test.mjs` | P1 상태 전이 정의 뒤 모션 값을 연결한다. 차트 색은 현재 계층 토큰 그래프와 대비 검사 경로를 따른다. | `docs/materials/audit.md` §1·§5: 차트 전용 순차·발산 토큰과 공용 duration/easing 세트가 남아 있다. 캔들/OHLC 렌더·데이터 계약은 현재 연결되어 있다. |
| **P6** | **부품 크기와 웹폰트 로딩을 재료 계약에 노출한다.** size sm/md/lg 값과 사용할 시스템 스택/웹폰트 로딩 방식을 정의하고 실제 CSS 적용을 확인한다. | `src/materials/typography.mjs`, `src/materials/control-size.mjs`, `src/materials/contract.mjs`, `src/styles/base.mjs`, `src/render/`, `tests/material-type.test.mjs` | 기존 `CONTROL_SIZES`와 서체 역할 프리셋을 먼저 참조한다. 외부 Blueprint 필드화는 2.6.0 확장으로 제한한다. | `docs/materials/audit.md` §1은 부품 크기 축과 웹폰트 로딩 계약이 아직 없다고 기록한다. 숫자 통계 역할은 이미 §7에 노출되어 있어 신규 과제로 세지 않는다. |

## 순서 결정 기준

1. 사용·재배포 권리에 관한 불확실성이 남은 팔레트의 제품 경로를 먼저 통제한다.
2. 상태·반응형 같은 공통 계약을 부품별 상호작용 확장보다 먼저 정리한다.
3. 새 UI 종류와 차트 도메인은 기존 재료 계약, 2.6.0 확장 표, 검증·렌더 경로에 이어 붙인다.
4. 각 과제는 변경 전 범주 커버리지 기준값을 보존하고, 완료 후 테스트 근거와 범주별 수치 변화를 갱신한다. 범주별 품질 통과율은 A/B 검사가 실제 분모를 제공할 때만 계산한다.
