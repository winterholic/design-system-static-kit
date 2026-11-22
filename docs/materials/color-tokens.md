# 2.6.0 색 토큰 읽기 API

이 문서는 Static Kit 자체 팔레트를 계산하고 CSS·재료 탐색에 쓰는 닫힌 읽기 계약이다. 색 값을 Blueprint에서 주입하지 않는다.

## 선택과 버전

- 2.6.0 Blueprint는 `colorPalette`를 생략해도 `static-kit`으로 렌더링한다. 명시할 수 있는 값도 `static-kit`이다. 필드는 `since: 2.6.0`이며 허용 ID는 현재 `static-kit` 하나다.
- `catalogVersion`을 2.6.0으로 올리는 것은 `migrateBlueprint(doc, '2.6.0')` 또는 `kit migrate --to 2.6.0`에서 명시적으로 선택한다. 마이그레이션은 버전만 올리고 기존 기본 생성 버전 2.4.0은 바꾸지 않는다.
- `colorPaletteOptions()`는 색 재료 탐색용 목록을 반환한다. Coolors 427개는 기존 Blueprint·테마를 읽는 레거시 호환 입력이고 새 추천 목록에는 포함하지 않는다.
- 임의 색상값, 존재하지 않는 팔레트 ID와 잘못된 내부 참조는 거부한다. Blueprint 오류는 `ENUM` 또는 `VERSION_FIELD`, 해석기 오류는 `COLOR_PALETTE` 또는 `COLOR_REFERENCE`다.

## 계산 결과

```js
import {resolveColorTokens} from './src/color-tokens.mjs'; // 공개 진입점은 ./service·./edit뿐이다. 외부 소비는 ./service 읽기 API로 제공한다.

const light = resolveColorTokens({palette: 'static-kit', mode: 'light'});
const auto = resolveColorTokens({palette: 'static-kit', mode: 'auto'});
```

결과에는 `seeds`, `ramps`, `layers`, `references`, `values`, CSS 변수 맵 `tokens`, 대비 결과 `report`가 있다. `mode`는 `light`, `dark`, `auto` 중 하나다. `auto`는 `modes.light`와 `modes.dark` 결과를 모두 반환한다.

시드 묶음은 `brand`, `neutral`, `auxiliary`, `status`, `chart`다. 각 색 계열은 50·100·200·300·400·500·600·700·800·900·950 단계로 계산한다. Status는 success·warning·danger·info 네 램프이고 chart는 여섯 계열 램프다.

토큰 그래프는 네 층이다.

| 층 | 예 | 쓰임 |
|---|---|---|
| `primitive` | `palette.static-kit.brand.700` | 내부 시드에서 계산한 명도 램프 |
| `semantic` | `semantic.action`, `semantic.surface`, `semantic.chart.0` | 색의 역할과 라이트·다크 모드 선택 |
| `state` | `state.actionHover`, `state.disabledBg`, `state.error` | 상호작용·오류 상태 |
| `component` | `component.button.primary.hover.bg`, `component.control.error.border` | 실제 부품 사용처 |

각 층은 같은 참조 그래프를 사용한다. `references`는 토큰 ID에서 참조 ID로 이어지며 `values`에서 양쪽 ID가 모두 확인된다. `report` 각 항목의 `ratio`는 `minimum` 이상이어야 한다.

## 컴포넌트 소비 계약

`COLOR_COMPONENT_CONTRACT`와 컴파일 결과 `manifest.colorTokens.usedTokens`가 부품, 토큰 ID, CSS 변수 이름, 지원 상태를 함께 제공한다. 등록 재료는 `catalogRegistry().byKind('color-token')`에서 조회할 수 있다. 등록 구현 모듈은 `src/materials/adapters.mjs`이며 토큰 정의·계산은 `src/color-tokens.mjs`다.

| 부품 | 색 상태와 사용 |
|---|---|
| Button | 기본, hover, active, disabled, focus; primary 채움·글자, 비활성, focus |
| Input | 기본, hover, active, disabled, error, focus; 배경·글자·경계·검증 상태 |
| Select | Input과 같은 상태와 변수 계약 |
| Card | 기본, hover, active, error, focus |
| Table | 기본, hover, selected(active), error, focus |
| Chart | 기본; 차트 계열 1~5와 격자선 |

대표 CSS 이름은 `--kit-action`, `--kit-action-hover`, `--kit-action-active`, `--kit-control-disabled-bg`, `--kit-control-error`, `--kit-focus`, `--kit-card-hover`, `--kit-table-selected`, `--kit-chart1`~`--kit-chart5`, `--kit-chart-grid`다. `src/color-tokens.mjs`의 2.6.0 CSS 계약은 이 값들을 실제 `:hover`, `:active`, `:disabled`, `[aria-invalid]`/`:user-invalid`, `:focus-visible`, 표 선택과 차트 격자에 연결한다.

2.6.0 이전 입력에는 새 색 토큰 CSS를 추가하지 않는다. 기존 2.4.0 기본값과 2.4.0·2.5.0 고정 컴파일 해시는 회귀 계약이다.

## 컴파일 반영과 읽기 질의

2.6.0 Blueprint는 `colorTokenCSS()`와 그래프 토큰을 컴파일 CSS에 낸다. 라이트·다크·auto의 `--kit-action`·`--kit-surface`·`--kit-text`·`--kit-focus` 값과 `.kit-button:disabled` 같은 사용처가 `tests/wire-260.test.mjs`로 확인된다. 웹은 `./service`의 `getColorTokens({palette, mode, layer})` 또는 `getColorTokens({blueprint})`로 같은 해석 결과(시드·계층·참조·CSS 변수 맵·대비 보고서·부품별 계약)를 읽는다. 값 문자열은 받지 않는다(`UNKNOWN_COLOR_PALETTE`).

