# W1–W4 재료 독립 검증

- 검증 기준: `origin/main` **3051031e9c582b13bb085b377e42b11d118ab851** (2026-11-22 fetch 후 고정)
- 범위: W1 색, W2 타이포, W3 시각·목적 패밀리, W4 스타일 맥락. 코드와 테스트는 수정하지 않았다.
- 판정: 구조·토큰·추천의 다수 주장은 코드 실행으로 확인했다. 추천의 쏠림과 접근성 회귀 테스트 공백은 아래에 분리했다. 브라우저 레이아웃 측정은 환경 사전 점검이 차단해 미검증이다.

## 판정 요약

| 영역 | 확인된 주장 | 반증·한계 |
|---|---|---|
| 색 | 9 팔레트 × 7 세트 중 62쌍 통과. 통과한 색 토큰 지도 124개는 모두 다르며 통과 결과에서 대비 위반은 0건. | 구별되는 토큰 지도는 눈에 띄는 화면 차이를 보장하지 않는다. 일부 역할 색은 거의 같다(정량 발견 C1). |
| 타이포 | 14 시스템 모두 결합 성공. 실제 heading/body 스택 쌍 14개와 역할 크기 묶음 14개가 각각 유일. 음성 입력으로 한글 한도 거부를 확인했다. | macOS의 시스템 서체만 쓸 때 코드의 fallback 계산은 한글 서체를 산세리프·명조 두 갈래로만 분류한다(정량 발견 T1). Chromium 실측은 미수행. |
| 패밀리 | 목적 패밀리 32개 모두 렌더 성공하고 그룹별 정규화 마크업 서명이 32종이다. 문서의 그룹별 수량과 일치. 계약이 허용한 모든 시각 패밀리×모드 조립에서 대비·누락 토큰 진단 0건. 6종 그룹에서 2개씩(12개) 마크업 표본을 대조했다. | 브라우저 측정과 키보드 상호작용은 확인하지 못했다. aria·포커스 계약을 회귀시키는 자동 단언도 없다(검증 공백 F1). |
| 스타일 맥락 | 54개 대표 맥락 추천에서 전체 1순위 조합은 49종, 최대 재사용은 2회. 팔레트 9종·세트 7종·타이포 12종·시각 패밀리 4종이 1순위에 한 번 이상 나타났다. | 시각 패밀리 1순위 43/54(79.6%)가 editorial 또는 soft다. 구별되는 조합 수는 넓지만 시각 언어의 집중은 남는다(정량 발견 S1). |

## 정량 발견

### C1. 서로 다른 색 토큰 집합 중 일부 역할은 거의 같은 값

- **심각도:** 사소 · **담당:** W1 색
- **재현:** `node --test tests/platform-color-sets.test.mjs tests/platform-color-palettes.test.mjs tests/platform-color-compat.test.mjs`; 비교 로직은 `bindColor()` 출력의 23개 역할을 대조하고 CIE76 `deltaE`를 계산했다.
- **값 재현:** `node --input-type=module -e 'import{PALETTES}from"./src/platform/data/palettes.mjs";import{SUBTOKEN_SETS}from"./src/platform/data/subtoken-sets.mjs";import{bindColor,deltaE}from"./src/platform/color.mjs";const p=PALETTES.find(x=>x.id==="palette:slate-neutral");const a=bindColor(p,SUBTOKEN_SETS.find(x=>x.id==="subtoken-set:tinted"),"light").roles.canvas;const b=bindColor(p,SUBTOKEN_SETS.find(x=>x.id==="subtoken-set:high-contrast"),"light").roles.canvas;console.log(deltaE(a,b))'`
- **관찰:** `slate-neutral × tinted`와 `slate-neutral × high-contrast`는 light 모드에서 19개 역할 값이 다르지만 `canvas`는 ΔE76 **0.85**다. 같은 팔레트에서 통과하는 세트 쌍 중 변경 역할 수의 최솟값은 5개다. 성공한 124개 `(팔레트, 세트, 모드)`의 변수 지도는 중복 0개다.
- **판정:** “토큰 집합이 서로 다르다”는 참이다. 다만 지도 유일성은 모든 표면·역할이 눈으로 구별된다는 뜻이 아니다. ΔE76은 빠른 근사치이며 화면 전체의 체감 차이를 재는 지표가 아니다.
- **대비:** 직접 결합 행렬 63쌍 중 62쌍 통과. 통과 쌍의 양 모드 보고서에서 최소 대비 미달 0건. 남은 1쌍은 `graphite-mono × commerce-vivid` dark 결합이 계산 게이트에서 거부된다. 알려진 accent 대비 교정 항목 자체는 새 결함으로 다시 세지 않았다.

### T1. 14개 시스템은 구별되지만 macOS 한글 fallback은 두 갈래

- **심각도:** 사소 · **담당:** W2 타이포
- **재현:** `node --test tests/platform-type.test.mjs tests/platform-type-evidence.test.mjs`; `bindType()` 결과 14개와 `effectiveFaces(stack, 'macos')`의 heading/body fallback을 대조했다.
- **관찰:** 14개 중 heading/body 글꼴 스택 쌍은 14종, 역할 크기 변수 묶음도 14종이다. macOS fallback 계산에서는 한글 heading·body가 `Apple SD Gothic Neo` 또는 `AppleMyungjo` 두 이름으로만 귀결된다. 테스트 음성 사례는 세리프 굵기 초과·산세리프 굵기 하한 미달·계층 역전이 `P_CHECK_TYPE_HANGUL` 또는 타이포 오류로 거부되고, 정상 사례는 통과한다.
- **판정:** 서체 스택/수치 재료 14종 주장은 확인. 한국어 글리프의 시각 차이를 14종이라고 세면 과장이다. 시스템 서체에 한글 글꼴 파일을 포함하지 않는 현재 기본 출력의 제한이다.
- **한계:** 위 두 글꼴 수는 저장소의 `effectiveFaces` fallback 모델 결과다. 이 세션에서 Chromium 렌더 픽셀·실제 macOS 폰트 목록은 측정하지 않았다.

### S1. 추천 조합은 다양하지만 시각 패밀리 1순위가 두 스타일에 집중

- **심각도:** 주요 · **담당:** W4 스타일 맥락
- **재현:** `node --test tests/platform-style-contexts.test.mjs`; 각 `STYLE_CONTEXTS`의 첫 페이지 유형·테마 기본 모드로 `recommend()`를 호출해 54개 1순위를 집계했다.
- **집계 재현:** `node --input-type=module -e 'import{createPlatform,recommend}from"./src/platform/index.mjs";import{STYLE_CONTEXTS}from"./src/platform/data/style-contexts.mjs";import{themes}from"./src/catalog/index.mjs";const e=createPlatform(),rows=STYLE_CONTEXTS.map(s=>{const context=s.contexts[0],mode=themes[s.id.slice(14)]?.defaults.mode??"light",picks=Object.fromEntries(["palette","subtoken-set","type-system","family"].map(k=>[k,recommend(e.registry,e.graph,{kind:k,context,mode,styleContext:s.id}).ranked[0]?.id]));return{picks}}),counts=k=>Object.fromEntries([...new Set(rows.map(x=>x.picks[k]))].map(id=>[id,rows.filter(x=>x.picks[k]===id).length]));console.log(JSON.stringify({uniqueTuples:new Set(rows.map(x=>JSON.stringify(x.picks))).size,families:counts("family")}))'`
- **관찰:** 전체 `(palette, subtoken-set, type-system, family)` 1순위 조합은 **49/54**, 같은 조합의 최다 반복은 2회다. 구성별 고유 1순위는 팔레트 9/9, 세트 7/7, 타이포 12/14, 시각 패밀리 4/4다. 그러나 시각 패밀리 빈도는 editorial 23, soft 20, quiet 7, bold 4다. 즉 상위 둘이 **43/54 (79.6%)**를 차지한다.
- **판정:** “모든 맥락이 같은 조합으로 쏠린다”는 반증된다. 조합은 넓게 나뉜다. 다만 목적에 따라 시각 패밀리 선택이 달라지는 폭은 네 종뿐이고 editorial·soft가 강하게 우세하다. 스타일 맥락 수나 복합 조합 수를 시각 패밀리 다양성으로 환산하지 말아야 한다.

### D1. 등록량과 코드에서 구별되는 출력 수

- **심각도:** 확인 사항 · **담당:** 플랫폼 전체
- **재현:** `node scripts/platform/baseline.mjs --check`
- **관찰:** 기준선 출력은 플랫폼 등록 palette 9, subtoken set 7, type system 14, base component 10, visual family 4, style context 54다. 페이지·재료 조합을 실제 `assemblePage`로 확인한 요청 5,160개에서 출력 해시는 **5,154종**이었다. 성공 요청 수와 구별 출력 수의 차이 6은 이 집계 단위에서 출력 중복 6건을 뜻한다. 기준선은 추가로 104,058/104,868개를 관계·색·타입으로 계산 조립 가능하다고 세지만, 이 숫자는 렌더 검증 수가 아니다.
- **판정:** 등록 수량은 고유 출력 수와 동일하지 않다. 이 5,154는 전체 페이지 조립 출력의 고유 해시 수이며 “사람이 보기에 좋은 디자인 5,154종”을 뜻하지 않는다.

## 계약과 렌더 마크업 표본

`docs/platform/families.md`의 계약 필드와 `renderPurposeFamily()`의 `family:quiet` 예시 출력을 12개(6개 목적 그룹별 2개) 대조했다. 표는 초기 마크업에 실제로 보인 역할·ARIA·키보드 포커스 가능 신호다. 추가 검사에서 12개 모두 id 중복과 끊어진 `aria-labelledby`·`aria-describedby`·`aria-controls`·`aria-activedescendant` 참조가 0건이었다. **키 동작, 열린 상태 전환, 실제 보조기기 낭독은 브라우저에서 확인하지 않았다.**

| 그룹 / 목적 패밀리 | 계약에서 요구하는 신호 | 초기 마크업에서 확인한 신호 | 대조 |
|---|---|---|---|
| Card / `card.kpi` | 값·레이블의 이름 있는 시각화 | `role=img`, `aria-label`; 정적 비포커스 | 일치 |
| Card / `card.product` | 카드 링크 동작 | 네이티브 `<a>`로 포커스 가능 | 일치 |
| Button / `button.primary` | 주요 동작 버튼, 대기 상태 피드백 | 네이티브 `<button>`, 주변 `role=group`·`role=status` | 일치 |
| Button / `button.destructive` | 파괴적 동작 보조 설명 | 네이티브 `<button>`, `aria-describedby` | 일치 |
| Navigation / `navigation.tabs` | tablist/tab/tabpanel 연결과 키보드 진입점 | 세 역할, `aria-controls`·`aria-selected`, tabindex 있음 | 초기 구조 일치; 화살표 키 미검증 |
| Navigation / `navigation.bottom` | 이름 있는 내비게이션, 현재 위치 | 포커스 가능한 링크, `aria-label`·`aria-current` | 일치 |
| Form / `form.search` | 검색 combobox와 제안 목록 상태 | `search`·`combobox`·`listbox`·`option`, expanded/controls/active-descendant | 초기 구조 일치; 동작 미검증 |
| Form / `form.auth` | 필드 라벨·오류 연결 | 포커스 가능한 네이티브 입력, `aria-labelledby`·`aria-describedby`·`aria-invalid`, `role=alert` | 일치 |
| Table / `table.business` | 이름 있는 region, 정렬 표식, 스크롤 포커스 | `role=region`, `aria-label`, 머리글 `aria-sort`, tabindex | 일치 |
| Table / `table.dense` | 스크롤 영역에 키보드 접근 | `role=region`, `aria-label`, tabindex | 일치 |
| Feedback / `feedback.confirm` | alertdialog, 제목·설명 연결 | `role=alertdialog`, `aria-labelledby`·`aria-describedby`, 포커스 진입 속성 | 초기 구조 일치; 포커스 복귀 미검증 |
| Feedback / `feedback.progress` | 이름 있는 progressbar와 상태 | 네이티브 `<progress>`, `aria-labelledby`, `role=status` | 일치 |

### P1. 목적 패밀리 32종은 실제 마크업 골격이 모두 다름

- **심각도:** 확인 · **담당:** W3 목적 패밀리
- **재현:** `node --test tests/platform-family-purpose.test.mjs` (테스트 `purpose and visual families are independent axes`)
- **관찰:** 32개 목적 패밀리의 `family:quiet` 실제 렌더 결과를 비교했다. 표시 문구와 선택된 동적 속성을 정규화한 뒤에도 그룹별 서명이 Card 8/8, Button 7/7, Navigation 4/4, Form 5/5, Table 3/3, Feedback 5/5로 전부 유일했다. 각 패밀리는 단순 클래스명이나 CSS만 다른 것은 아니다.
- **한계:** 이 서명 검사는 DOM 골격의 차이를 확인한다. 동작 품질·시각적 완성도·접근성 계약 전부가 충족된다는 뜻은 아니다.

**표본 판정:** 12개에서 계약에 적힌 초기 역할·이름·포커스 가능 신호가 실제 HTML에 있었다. 12개에서 수집한 ID 참조 23개는 모두 실제 id를 가리켰고 중복 id는 0개였다. 이는 전체 32개 계약·모든 상태의 완전 일치 증명은 아니며, 문서상 전이(Enter/Space, Escape, focus return)는 실행하지 않았다.

- **표본 재현:** 아래 명령은 12개 패밀리의 기본 예시를 렌더하고 ID 중복·ARIA ID 참조를 검사한다. 출력은 패밀리별 `ok`, `duplicateIds`, `unresolved`다.

```sh
node --input-type=module -e 'import{createPlatform}from"./src/platform/index.mjs";import{PURPOSE_FAMILIES,renderPurposeFamily}from"./src/platform/families/index.mjs";const ids=["purpose:card.kpi","purpose:card.product","purpose:button.primary","purpose:button.destructive","purpose:navigation.tabs","purpose:navigation.bottom","purpose:form.search","purpose:form.auth","purpose:table.business","purpose:table.dense","purpose:feedback.confirm","purpose:feedback.progress"],e=createPlatform(),check=id=>{const f=PURPOSE_FAMILIES.find(x=>x.id===id),r=renderPurposeFamily(e,id,{visual:"family:quiet",...f.example}),html=r.html,all=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]),refs=[...html.matchAll(/\baria-(?:labelledby|describedby|controls|activedescendant)="([^"]+)"/g)].flatMap(x=>x[1].split(/\s+/));return{id,ok:r.ok,duplicateIds:all.length-new Set(all).size,unresolved:refs.filter(x=>!all.includes(x))}};console.log(JSON.stringify(ids.map(check)))'
```

## 테스트 강도와 공백

### F1. 목적 패밀리 접근성 계약은 회귀 테스트가 직접 대조하지 않음

- **심각도:** 주요 · **담당:** W3 목적 패밀리
- **재현:** `rg -n 'aria|keyboard|tabindex|focus|role=' tests/platform-family-*.test.mjs`
- **관찰:** 목적 패밀리 테스트는 수량·필드 검증, 모든 허용 조합의 렌더/대비/토큰, 잘못된 입력, 구조 문자열 차이를 확인한다. `aria-*`, role 연결 대상 존재, tabindex, 키 이벤트에 대한 직접 단언은 없다(검색 결과는 테스트의 regex 정규화에 aria 용어가 한 번 나오는 것뿐이다). 위의 12개 표본 대조는 이 자동화 공백을 보완하는 이번 실행의 수동 관측이다.
- **판정:** 이번 표본은 일치했지만, 현재 테스트만으로 `families.md`의 접근성 문구가 이후 렌더에서도 지켜진다고 보장할 수 없다.

### F2. 스타일 맥락 테스트는 추천 배선과 선행 지정값을 검증

- **심각도:** 사소 · **담당:** W4 스타일 맥락
- **재현:** `node --test tests/platform-style-contexts.test.mjs` (특히 STYLE_PICKS와 추천 순위를 대조하는 테스트)
- **관찰:** 테스트는 코드에 선언한 `STYLE_PICKS`가 재료 관계로 연결되고 1순위가 되는지를 고정한다. 이는 id 변경·우선순위 배선 회귀를 잡지만, 각 선택이 해당 스타일의 시각적 목적에 맞는지 독립 기준으로 채점하지 않는다. 파일 주석과 문서도 이 매핑을 사람 검토 전 판단으로 표시한다.
- **판정:** 순위 동작 주장의 근거로는 유효하다. 시각적 적합성·추천 품질의 독립 검증으로 읽으면 안 된다.

## 브라우저 측정 및 알려진 제외 항목

- `node scripts/families/measure.mjs` 미실행. 실행 전 필수 사전 점검은 `status: blocked`, `browser_launched: false`였고 `mach-register`와 `mach-lookup`에 대해 `denied`를 반환했다. 지침에 따라 로컬 Chromium 실행은 시도하지 않았다. 따라서 CSS 계산 스타일, 390/1280px 넘침·간격 측정은 **미검증**이다.
- `--kit-t-micro` 누락, 목적 패밀리의 페이지 조립 연결 여부, 알려진 accentInk/accentSoft 대비 4쌍은 작업 카드에서 이미 진행·인지한 항목이므로 새 발견으로 반복하지 않았다.
- `node_modules`는 깨끗한 worktree에 없어서 `npm ci`로 준비했다. 프로젝트 Node 범위는 `>=22`; 이 환경은 Node 26.9.0이었다.

## 실행 영수증

```text
node --test tests/platform-color-palettes.test.mjs tests/platform-color-sets.test.mjs tests/platform-color-compat.test.mjs
tests 17 · pass 17 · fail 0

node --test tests/platform-type.test.mjs tests/platform-type-evidence.test.mjs
tests 28 · pass 28 · fail 0

node --test tests/platform-family-purpose.test.mjs tests/platform-family-base.test.mjs
tests 16 · pass 16 · fail 0

node --test tests/platform-style-contexts.test.mjs
tests 11 · pass 11 · fail 0

npm test
tests 703 · pass 703 · fail 0

node scripts/platform/baseline.mjs --check
BASELINE MATCH docs/evidence/platform/baseline.json
platform verified 5160 assembled+checked, 5154 distinct outputs

node scripts/families/measure.mjs
미실행: browser_preflight.py → status blocked; browser_launched false
```
