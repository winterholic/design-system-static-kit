# 색 재료(W1)

기준은 [ADR 0012](../adr/0012-assembly-platform.md) §1.1과 [WBS](wbs.md) W1이다. 팔레트(원색)와 서브토큰 세트(역할 분배)를 다대다로 묶고, 결합 결과를 실제 렌더 변수까지 낸다.

- 팔레트는 `src/platform/data/palettes.mjs`, 세트는 `src/platform/data/subtoken-sets.mjs`, 결합은 `src/platform/color.mjs`의 `bindColor`다.
- 이 표의 수는 성과가 아니다. 각 숫자는 계산 관계 `palette-subtoken`이 라이트와 다크 두 모드에서 대비 게이트를 통과한 쌍이다. 쌍은 원색을 섞어 늘린 것이 아니라, 하나의 세트 설계가 여러 팔레트에서 어떻게 달라지는지 확인하려고 둔 것이다.
- 재생성: `node docs/platform/evidence/color/build.mjs`(표 두 개와 스크린샷). 표를 손으로 고치지 않는다. `tests/platform-color-docs.test.mjs`가 같은지 비교한다.

## 1. 팔레트 9개(자체 8개 + static-kit)

| id | 계열 | brand | accent(보조) | neutral | success · warning · danger · info |
|---|---|---|---|---|---|
| `static-kit` | static-kit | `#3157D5` | `#087E8B` | `#596579` | `#18714C` `#946000` `#B83543` `#2A63C9` |
| `slate-neutral` | neutral | `#4B5C74` | `#9A5B3E` | `#5D6878` | `#2E7752` `#8E6200` `#B03A44` `#3A64A8` |
| `sunrise-warm` | warm | `#D2501E` | `#A3294F` | `#6F625A` | `#2F7A4B` `#A86500` `#BE3030` `#2F66B8` |
| `ocean-cool` | cool | `#0D6E8E` | `#6A52C9` | `#576B7E` | `#1F7A5C` `#8F6500` `#B13A4F` `#2B5FB5` |
| `forest-green` | green | `#2E7A52` | `#B07A1F` | `#5A6B5F` | `#2C8340` `#9E6A00` `#B23A3A` `#2D6A9F` |
| `clay-earth` | earth | `#8A6238` | `#56784F` | `#6B6355` | `#3F7A45` `#9A6B08` `#B04032` `#3E6F8C` |
| `graphite-mono` | mono | `#2B2D33` | `#4D4F57` | `#5E5F63` | `#2F7A4F` `#8D6200` `#B23A40` `#37649F` |
| `dusk-violet` | violet | `#6D49B8` | `#C0507A` | `#645F78` | `#2D7A58` `#946000` `#B8384A` `#3E64B5` |
| `magenta-vivid` | vivid | `#D1228F` | `#00A3AD` | `#6A6373` | `#1F8A4C` `#A66A00` `#C42B3C` `#2E6FD0` |

- **권리**: `license: internal`만 쓴다. 시드는 색상 계열(hue·채도)을 먼저 정하고 손으로 고른 값이다. 외부 팔레트 사이트의 값을 옮기지 않았고, `tests/platform-color-palettes.test.mjs`가 Coolors 레거시 카탈로그의 색과 한 개도 겹치지 않는지 검사한다. Coolors 427개는 등록하지 않았고 이 경로로 노출하지도 않는다.
- **계열이 겹치지 않는다**: 한 계열에 팔레트 하나다. 두 팔레트의 brand가 같은 계열로 읽히는 조건(색상각 차 25° 미만이고 채도 차 0.3 미만이며 둘 다 유채색)을 같은 테스트가 막는다.
- **명도 램프**: 모든 시드는 50~950의 11단계 램프로 펼쳐진다. 램프는 2.6.0 엔진의 `colorRamp`가 계산한다. 단계가 올라갈수록 흰색 대비가 단조롭게 커지는 것을 테스트가 확인한다.
- **중립 시드의 명도**: neutral은 static-kit과 비슷한 중간 어두움(HSL 명도 0.38~0.42)으로 골랐다. 시드를 더 밝게 두면 라이트 표면이 하얘지지만, 다크에서 본문 7:1을 맞출 수 없는 세트가 생긴다(사용자 팔레트 시연의 두 번째 줄).

## 2. 서브토큰 세트 7개(기존 2 + 새 5)

세트는 색 역할 23개(배경·표면·글자·경계, 주/보조 액션, 상태색)의 분배 규칙이다. 원색 값을 갖지 않는다.

| id | 설계 의도 | 주 행동 | 보조 행동 | 대비 하한 | contexts |
|---|---|---|---|---|---|
| `standard` | 차분한 제품 UI. 중립 바탕, 브랜드는 액션·링크·초점에만 | brand 700/400 | accent | 글자 7, 나머지 4.5 | any |
| `tinted` | 같은 팔레트에서 브랜드색이 도는 바탕과 경계 | brand 600/300 | accent | 글자 7, 나머지 4.5 | any |
| `editorial-warm` | 따뜻한 에디토리얼. 종이 같은 바탕, 강조 띠와 링크는 보조색, 진한 규칙선 | brand 700/300 | accent 700/300 | 글자 7 | article, blog, docs, landing, portfolio, community, general |
| `commerce-vivid` | 강조색이 선명한 커머스. 주 행동이 보조색, 브랜드는 링크와 보조 행동으로 내려간다 | accent 600/300 | brand 600/300 | 주 행동 5, 글자 7 | commerce, landing, listing, pricing, portfolio, general |
| `premium-dark` | 어두운 배경의 프리미엄. 다크가 주 모드, 한 단계 밝은 표면, 낮은 대비 경계. 주 행동은 중립 램프의 반전 | neutral 900/100 | brand 700/300 | 주 행동 7, 글자 7 | landing, portfolio, commerce, pricing, article, general |
| `high-contrast` | 고대비. 글자 10, 보조 글자·행동·링크·상태색 7, 경계·초점 4.5 | brand 800/300 | accent 800/200 | 글자 10, 행동 7 | 대시보드를 뺀 모든 페이지 유형 |
| `data-dense` | 표·차트 중심. 면은 중립 단계로만 나누고 경계는 진하게, 상태색은 한 단계 어둡게(다크는 밝게) | brand 700/400 | accent | 글자 7 | data, listing, settings |

- 각 세트는 라이트와 다크 역할을 모두 낸다(`modes: ['light', 'dark']`). 다크는 라이트의 반전이 아니라 세트마다 따로 정한 단계다.
- `contexts`에 `dashboard`가 없는 이유는 §7에 있다.

### 2.1 파생 토큰: 상태·상호작용, 컴포넌트 의미, 차트

역할 23개 위에 `bindColor`가 세 가지를 더 낸다. 설계는 `SUBTOKEN_SET_DESIGNS`에 세트별로 있다. 색값이 아니라 "어느 역할에서 가져오는가"와 "얼마나 움직이는가"만 적는다.

| 층 | 내용 | 변수 이름(기존 2.6.0 컴포넌트 CSS가 읽는 이름 그대로) |
|---|---|---|
| 상호작용 상태 | 주·보조 액션 hover·active(라이트는 검정 쪽, 다크는 흰색 쪽으로 세트마다 다른 비율), hover·active 위 글자, 비활성, 초점 | `--kit-action-hover`, `--kit-action-active`, `--kit-onActionHover`, `--kit-accent-hover`, `--kit-accent-active`, `--kit-control-disabled-bg/-fg`, `--kit-focus` |
| 컴포넌트 의미 | `button.primary·secondary`(default·hover·active·focus·disabled), `control`(default·hover·active·error·focus·disabled), `card`, `table`(default·hover·active·error·focus). 구조화한 값은 `bindColor().components`에 있다 | `--kit-control-bg/-fg/-border/-hover-border/-active-border/-error`, `--kit-card-hover/-active`, `--kit-danger-soft`, `--kit-table-head/-hover/-selected`, `--kit-accentSoft/-accentInk` |
| 차트 색 역할 | 범주형 6, 순차 7, 발산 7, 격자선 | `--kit-chart1~6`, `--kit-seq1~7`, `--kit-div1~7`, `--kit-chart-grid` |

**차트 색 역할**(세트마다 `charts` 설계가 다르다)

- 범주형: 앞자리 팔레트색(`lead`)에서 시작해 그 색상각을 60° 간격으로 돌린 후보에서 CIE76 색차가 가장 멀어지는 색을 골라 6개를 만든다. 세트의 `tone`이 램프 단계를 정한다(standard 600/300, vivid 500/400, soft 400/300, deep 700/400, 라이트/다크). 색차 하한과 면 대비 하한이 게이트다. 앞자리 색이 모두 무채색이면(모노 팔레트) 상태색의 색상각을 앵커로 쓴다.
- 순차: 세트가 정한 램프 자리(brand 또는 accent)의 단계 7개. 라이트는 연한 색에서 진한 색으로, 다크는 어두운 색에서 밝은 색으로 올라간다. 이웃 단계 색차와 최고 단계의 면 대비가 게이트다. 시드가 무채색이면 neutral 램프를 쓴다.
- 발산: 색상각이 60° 이상 벌어진 두 자리(세트가 후보 순서를 정한다)와 neutral 중간값. 양 끝의 면 대비, 중간값과 면의 색차, 이웃 단계 색차가 게이트다.
- 범주형과 발산에는 상태색(success·danger)이 섞일 수 있다. 상태 의미로 읽히면 안 되는 차트는 호출자가 `lead`가 다른 세트를 고른다.

## 3. 통과·실패 쌍

<!-- color-matrix:begin -->
팔레트 9개 × 세트 7개 = 63쌍 중 통과 62쌍, 실패 1쌍. 판정은 계산 관계 `palette-subtoken`(`bindColor`의 라이트·다크 두 모드 모두)이다.

| 팔레트 \ 세트 | standard | tinted | editorial-warm | commerce-vivid | premium-dark | high-contrast | data-dense | 통과한 세트 수 |
|---|---|---|---|---|---|---|---|---|
| static-kit | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| slate-neutral | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| sunrise-warm | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| ocean-cool | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| forest-green | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| clay-earth | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| graphite-mono | 통과 | 통과 | 통과 | **실패** | 통과 | 통과 | 통과 | 6 |
| dusk-violet | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| magenta-vivid | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 | 7 |
| **통과한 팔레트 수** | 9 | 9 | 9 | 8 | 9 | 9 | 9 | |

### 실패한 쌍과 이유

| 팔레트 | 세트 | 모드 | 이유 |
|---|---|---|---|
| graphite-mono | commerce-vivid | dark | `P_COLOR_CONTRAST` no text color reaches 4.5:1 on accent |

### 사용자 팔레트 시연(`proposeSubtokenSets`)

| 입력 | 후보 | 거부(이유 첫 줄) |
|---|---|---|
| 선명한 3색(주황·청록) `#D2501E #6F625A #0D6E8E` | standard, tinted, editorial-warm, commerce-vivid, premium-dark, high-contrast, data-dense | 없음 |
| 밝은 중립 시드를 낀 6색 `#0D6E8E #8A8F99 #E8A100 #2E8B57 #C0392B #3B6FD6` | tinted, data-dense | standard: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)<br>editorial-warm: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)<br>commerce-vivid: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)<br>외 2개 |
| 거의 검정인 3색 `#101010 #181818 #202020` | 없음 | standard: chart-sequential-step vs adjacent ΔE76 0.6125:1 < 6:1<br>tinted: chart-sequential-step vs adjacent ΔE76 0.6125:1 < 6:1<br>editorial-warm: chart-sequential-step vs adjacent ΔE76 0.6125:1 < 6:1<br>외 4개 |
| 연한 파스텔 3색 `#F7F0B0 #F4F4F4 #E9F5C0` | 없음 | standard: chart-diverging-mid vs surface ΔE76 1.3828:1 < 6:1<br>tinted: chart-diverging-mid vs surface ΔE76 1.3828:1 < 6:1<br>editorial-warm: chart-sequential-step vs adjacent ΔE76 5.2533:1 < 6:1, chart-diverging-end vs surface 2.5298:1 < 3:1, chart-diverging-mid vs surface ΔE76 1.3828:1 < 6:1<br>외 4개 |
<!-- color-matrix:end -->

### 3.1 실패 이유 해설

- **graphite-mono × commerce-vivid(다크)**: 이 세트는 보조 행동을 brand 램프 300단계로 칠한다. mono의 brand(`#2B2D33`) 300단계는 `#7D7E81`이다. 이 회색 위에서 흰 글자는 4.06:1, 어두운 글자(`#1A1A1B`)는 4.28:1이라 둘 다 4.5:1에 못 미친다. 중간 명도 대역에는 읽을 글자색이 없다는 뜻이다. 또 이 세트의 의도가 "선명한 강조색"인데 mono 팔레트에는 선명한 색이 없다. 그래서 팔레트가 `avoids` 관계(우선순위 40)로 이 세트를 밀어낸다.
- 사용자 팔레트 시연의 거부 이유는 같은 게이트에서 나온 것이다. 밝은 중립 시드는 다크에서 본문 7:1을 맞출 수 없고, 거의 검정인 시드는 순차 램프의 이웃 단계가 구분되지 않으며, 연한 파스텔은 발산 차트의 중간값이 면과 구분되지 않는다(3.3의 accent 보정 뒤로 보조 행동 채움 쪽 실패는 사라졌다).

### 3.2 처음 설계에서 고친 것(정직한 기록)

첫 계산에서는 63쌍 중 다수가 실패했다. 원인은 팔레트가 아니라 설계였다. 아래를 고쳤고, 임계값을 쌍이 통과하도록 낮춘 것이 아니라 설계 결함을 고친 것이다.

- 중립 시드가 너무 밝아서 다크 `text` 7:1을 `cardActive`(neutral 700) 위에서 맞출 수 없었다. 중립 시드를 static-kit 수준의 명도로 내렸다.
- 에디토리얼·커머스의 다크에서 `cardActive`를 보조색 700단계로 칠했더니 보조색이 밝은 팔레트(황토, 청록)에서 글자 7:1이 불가능했다. 800단계로 내렸다.
- 고대비의 `text` 12:1은 `cardActive`(neutral 300) 위에서 불가능했다. 활성 면을 한 단계 어둡게 하고 하한을 10으로 정했다.
- 발산 차트의 중간값이 바탕과 거의 같은 명도라 이웃 단계 명암비가 1.0에 가까웠다. 명암비 대신 색차로 재고, 중간값을 neutral 200(라이트)·700(다크)로 올렸다.
- 표 셀 초점 고리는 안쪽에 그려지므로(`outline-offset:-2px`) 초점색을 카드 면이 아니라 표 머리글·hover·선택 면 위에서 검사한다.

### 3.3 accentInk × accentSoft 대비(페이지 품질 검사가 막던 4쌍)

`accentInk`(= `accent`, 보조색 글자)는 `accentSoft`(= `soft`, 강조 띠) 위에 놓인다. 이전 게이트는 이 쌍을 재지 않았고, 세트가 `accent`를 `surface` 위에서만 보정하거나 아예 보정하지 않았다. 그래서 `bindColor`는 통과하는데 페이지 단계에서 4.5:1 미만으로 막히는 쌍이 4개 있었다. 임계값은 그대로 4.5:1이고, 세트 설계를 고쳤다.

| 쌍 | 고치기 전 | 원인 | 고친 설계 |
|---|---|---|---|
| magenta-vivid × data-dense (라이트) | 4.38 | accent가 `surface`만 보정하고 `soft`(neutral 100)는 안 봄 | `accent`를 `soft`에서도 4.5:1로 보정 |
| magenta-vivid × tinted (라이트) | 4.19 | accent에 보정 없음, `soft`는 brand 100 | 같음 |
| sunrise-warm × tinted (다크) | 3.39 | accent 300단계가 `soft`(brand 800) 위에서 어두움 | 같음 |
| sunrise-warm × commerce-vivid (라이트) | 3.90 | accent가 brand 600이고 `soft`가 보조색 100 | 라이트 단계를 brand 700으로(다크 300 유지) |

- `bindColor`가 `accentInk vs accentSoft`를 4.5:1 게이트로 보고한다(`deriveStates`). 같은 결함이 다시 생기면 `palette-subtoken`이 그 쌍을 거부한다. `tests/platform-color-sets.test.mjs`가 고치기 전 설계로 같은 4쌍이 실패하는 것을 확인한다.
- 고대비 세트는 `accent`를 `soft` 위에서도 7:1로 맞춘다. 이 세트의 하한이 7이라 magenta-vivid × high-contrast(라이트)의 보조색이 조금 어두워졌다. 통과하던 쌍이고 실패로 바뀐 쌍은 없다.
- commerce-vivid는 다크를 건드리지 않는다. 다크에 `soft` 보정을 걸면 graphite-mono × commerce-vivid(다크)의 보조 행동 채움이 밝아져 이 쌍의 실패 이유(3.1)가 사라진다. 이 쌍의 거부는 설계 의도(`avoids`)이므로 유지한다. 라이트 단계 변경은 이 세트를 쓰는 모든 팔레트의 라이트 보조 행동 채움을 한 단계 어둡게 한다(brand 600 → 700).
- 새로 실패한 쌍은 없다. 통과·실패 표는 `build.mjs`가 다시 만들었고 실패 쌍 목록은 그대로다.

## 4. 사용자 팔레트(`proposeSubtokenSets`)

```js
import {proposeSubtokenSets} from './src/platform/color.mjs'; // 내부 모듈. 공개는 W5가 서비스 함수로 감싼 뒤다.
const r = proposeSubtokenSets(['#D2501E', '#6F625A', '#0D6E8E']); // hex 3~6개
// r.candidates: [{set, label, tags, margin, modes: {light: {vars, charts}, dark: {...}}}]
// r.rejected:   [{set, label, reasons: [{mode, code, message}]}]
// r.assignments: [{slot, seed, source: 'user' | 'derived'}], r.ignored: [못 쓴 시드]
```

- 시드 배정 규칙(결정적): 채도가 가장 낮은 시드가 neutral, 남은 시드의 입력 순서로 brand, accent. 세 번째부터는 색상각이 40° 안인 가장 가까운 상태 자리(success·warning·danger·info)에 한 번씩 놓는다. 못 맞춘 상태 자리는 기본값으로 채우고 `source: 'derived'`로 표시한다. 어디에도 못 놓은 시드는 `ignored`로 돌려준다.
- 후보와 거부는 `bindColor`와 같은 경로에서 나온다. 기본 7개 세트 모두에 대해 라이트·다크를 본다.
- 저장·등록·재배포는 하지 않는다. 입력 팔레트에는 권리 정보가 없으므로 레지스트리 등록 대상이 아니고(`license`가 없다), 반환값 `palette`는 얼려 있으며, `color.mjs`에는 파일·네트워크·저장소 접근이 없다(`tests/platform-color-user.test.mjs`가 소스를 검사한다).
- 입력 오류(개수, 형식, 중복)는 던지지 않고 `errors`로 돌려준다: `P_SEEDS_COUNT`, `P_SEEDS_HEX`, `P_SEEDS_DUPLICATE`.

## 5. 대표 조합: sunrise-warm × 세트 4개

같은 카드와 버튼(기존 2.6.0 컨트롤의 렌더러와 CSS)을 팔레트 `sunrise-warm`의 세트 4개로 칠했다. 색은 모두 `bindColor`가 낸 렌더 변수 그대로다. 보조 버튼과 차트 띠만 미리보기용 마크업이다.

- 라이트: [sunrise-warm-4sets-light.png](evidence/color/sunrise-warm-4sets-light.png) · [html](evidence/color/sunrise-warm-4sets-light.html)
- 다크: [sunrise-warm-4sets-dark.png](evidence/color/sunrise-warm-4sets-dark.png) · [html](evidence/color/sunrise-warm-4sets-dark.html)

![light](evidence/color/sunrise-warm-4sets-light.png)

![dark](evidence/color/sunrise-warm-4sets-dark.png)

<!-- color-metrics:begin -->
| 세트 · 모드 | canvas | surface | 주 행동 | 보조 행동 | 글자/surface | 주 행동 글자 | 가장 빠듯한 게이트 |
|---|---|---|---|---|---|---|---|
| editorial-warm · light | `#DEDBD9` | `#ECEAE9` | `#8E3614` | `#6E1C36` | 14.3 | 7.8 | disabledFg vs disabledBg 3.1572/3 |
| editorial-warm · dark | `#1E1B19` | `#272320` | `#E39375` | `#C67B93` | 11.3 | 7.1 | rule vs surface 3.0319/3 |
| commerce-vivid · light | `#DEDBD9` | `#ECEAE9` | `#892242` | `#8E3614` | 14.3 | 8.9 | disabledFg vs disabledBg 3.1572/3 |
| commerce-vivid · dark | `#1E1B19` | `#272320` | `#C77C94` | `#E39375` | 13.0 | 5.5 | action vs surface 5.001/5 |
| premium-dark · light | `#DEDBD9` | `#ECEAE9` | `#272320` | `#8E3614` | 14.3 | 15.6 | link vs cardActive 4.5453/4.5 |
| premium-dark · dark | `#1E1B19` | `#272320` | `#DEDBD9` | `#E39375` | 11.3 | 12.4 | link vs cardActive 4.5003/4.5 |
| high-contrast · light | `#ECEAE9` | `#ECEAE9` | `#6C290F` | `#541529` | 15.6 | 10.7 | text vs cardActive 10.0265/10 |
| high-contrast · dark | `#1E1B19` | `#1E1B19` | `#E39375` | `#D8A4B5` | 14.3 | 7.1 | border vs canvas 4.5196/4.5 |
<!-- color-metrics:end -->

### 5.1 색 역할 분배의 정성 평가

보인 것과 못 한 것을 나눠 적는다. 화면은 Chromium으로 만든 정지 이미지이고, 실제 사용자 평가나 색약 시뮬레이션은 하지 않았다(미실행).

**잘 된 점**

- 같은 팔레트에서 세트가 서로 다른 완성형으로 읽힌다. 에디토리얼은 주황 행동과 베리 보조 행동, 커머스는 주·보조가 뒤집혀 베리 크림슨이 주 행동이고 주황이 보조 행동, 프리미엄은 먹색(다크는 밝은 알약) 행동에 브랜드색이 링크와 보조에만 남고, 고대비는 가장 어두운 행동과 진한 경계다.
- 에디토리얼·커머스·프리미엄의 라이트는 바탕(neutral 100)과 표면(neutral 50)이 갈려 카드가 바탕에서 뜬다. 고대비와 데이터 밀집은 의도적으로 바탕과 표면이 같고 경계로만 나눈다. 처음 설계는 모든 새 세트가 같은 단계라 카드가 평평했고, 스크린샷으로 확인해 고쳤다.
- hover·active·focus·disabled가 네 세트 모두에서 구분된다. 비활성은 처음에 바탕과 같은 단계라 모양이 사라졌고 고쳤다.
- 순차와 발산 띠는 세트마다 램프 출처(brand 또는 accent)와 양 끝 색상각이 다르다. 발산의 중간값이 면에서 보인다.
- 모든 쌍이 대비 게이트 안에서 가장 빠듯한 값도 하한 이상이다(위 표 마지막 열).

**아쉬운 점**

- 라이트 면이 순백이 아니다. `RoleRule`에 고정값이 없어 표면이 neutral 50(약 `#ECEAE9`)이고 바탕은 그보다 회색이다. 따뜻한 팔레트에서는 베이지 회색 느낌이 강하다. §7의 `fixed` 요청이 풀어야 한다.
- 다크에서는 에디토리얼·커머스·고대비의 바탕과 표면이 거의 같은 중립 어둠이고 차이는 행동색과 경계뿐이다. 라이트보다 세트 간 인상 차이가 작다.
- 범주형 차트의 다크 6색은 세트 셋(에디토리얼, 커머스, 프리미엄)이 거의 같은 파스텔이다. 세트 차이가 `tone`과 앞자리 색 정도라 작다. 라이트의 에디토리얼은 분홍 계열 두 개(로즈와 마젠타)가 가까워, 색약이거나 작은 범례에서는 구분이 약하다. 색차 게이트(CIE76 14 이상)는 통과하지만 색각 이상 시뮬레이션은 하지 않았다.
- 프리미엄의 라이트 모드는 에디토리얼과 표면·경계가 거의 같다. 이 세트의 정체성은 다크 모드에 있다.
- 에디토리얼의 보조 행동(베리 700)이 주 행동(주황 700)과 시각 무게가 비슷하다. 보조 행동을 한 단계 약하게 하는 설계는 부품이 보조 행동을 읽기 시작한 뒤(W3)에 다시 본다.

## 6. 결정: `resolveTokens`를 `subtoken-set:derived`로 옮기지 않는다(WBS ⑤)

- 구형 `resolveTokens`(`src/tokens.mjs`)는 Coolors 레거시 팔레트의 5색 배열에서 역할을 자동 분배한다. 입력이 권리 미확인 자료이고, 플랫폼 레지스트리는 `internal`·`MIT`만 받는다.
- 자동 분배 결과는 팔레트마다 달라 "하나의 세트 설계를 여러 팔레트에 재사용한다"는 원칙과 맞지 않는다. 지금은 설계가 분명한 세트 7개가 있다.
- 자체 팔레트에만 쓴다는 조건을 맞추려면 입력을 자체 시드 7자리로 바꿔야 하고, 그러면 `standard`와 같은 분배가 된다. 옮겨서 얻는 것이 없어 옮기지 않았다. 필요해지면 `variant()`로 세트를 하나 더하면 된다.

## 7. 제약과 W5에 요청

> 1~4는 계약 0.4.0(조립 엔진 작업)에서 처리했다. 결과는 [ADR 0012 §9.4](../adr/0012-assembly-platform.md). `fixed`는 계산까지 되지만 세트의 `surface`·`canvas`는 그대로다.

1. **`fixed` 규칙**(WBS ③): 흰 표면 같은 고정값이 없어 라이트 표면이 neutral 50이다. `RoleRule`에 `{fixed: '#FFFFFF' | 램프 자리 + 혼합비}` 같은 규칙을 더해 달라. 더하면 각 세트의 `surface`·`canvas`를 갱신하고 계약 버전을 올린다.
2. **세트 기록 필드**: 상태·상호작용, 컴포넌트 의미, 차트 설계(`SUBTOKEN_SET_DESIGNS`)를 `subtoken-set` 기록의 필드로 올려 달라(`KIND_SPECS`에 `states`, `charts` 등). 지금은 `bindColor`가 세트 id로 같은 파일의 설계를 찾는다. 시험용으로 등록한 세트는 `DEFAULT_DESIGN`을 쓴다.
3. **`dashboard` 컨텍스트**: 새 세트의 `contexts`에는 `dashboard`가 없다. `tests/platform-minimal.test.mjs`(W5 소유)가 dashboard·light·static-kit에서 세트 추천 순위를 `[standard, tinted]`로, no-accent 팔레트에서 후보 0개로 고정하기 때문이다. 시험을 갱신한 뒤 `high-contrast`와 `data-dense`에 `dashboard`를 더하면 된다(`subtoken-sets.mjs` 주석).
4. **`src/platform/index.mjs` 내보내기**: `colorMatrix`, `proposeSubtokenSets`, `assignSeeds`, `paletteRamps`와 `SUBTOKEN_SET_DESIGNS`를 내보내 달라. 지금은 `src/platform/color.mjs`에서 직접 가져온다.
5. **기본 팔레트 추천**: 팔레트가 여럿이 되면 앵커가 없을 때 추천이 id 순이 된다(`clay-earth`가 1순위). 최소 예시 시험이 static-kit을 기대해 `palette:static-kit`에 `style-context:workspace`로 가는 `prefers`(우선순위 15)를 더했다. 스타일 맥락 쪽 관계는 W4가 팔레트·세트 id로 정한다.
6. **차트·보조 행동을 읽는 부품**: `--kit-seq*`, `--kit-div*`, `--kit-accent-hover` 등을 읽는 부품은 아직 없다. 미리보기에서는 미리보기용 마크업으로 보였다. W3·W4가 부품에서 읽을 때 변수 이름을 그대로 쓰면 된다.

## 8. 검증

```sh
node --test tests/platform-color*.test.mjs tests/color-tokens.test.mjs
npm test
node scripts/platform/baseline.mjs --check
node docs/platform/evidence/color/build.mjs   # 표와 스크린샷 재생성
```

기존 `src/color-tokens.mjs`는 내보내기 한 줄(`colorMix`)만 더했다. static-kit의 해석 결과(light·dark·auto), CSS, 재료 목록, 2.6.0 컴파일 출력은 작업 전 main(`f1bcc2582`)과 해시가 같다(`tests/color-tokens.test.mjs` 마지막 테스트, `tests/platform-color-compat.test.mjs`).
