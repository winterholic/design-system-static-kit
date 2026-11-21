# 01 UX 감사 (조립기 · 전체 조합 갤러리 · 단일 파일 갤러리)

측정일 2026-11-21, HEAD `b303f17c1`. 판정 근거는 실제 Chromium(Playwright 1.64.1, headless shell 1248) 조작이거나 코드 줄이다. 추측으로 판정한 항목은 없다. 조작은 모두 새 브라우저 컨텍스트(빈 localStorage)에서 했고, 서버는 이 worktree의 `scripts/serve.mjs`(포트 4201)다.

## 0. 방법과 재현 방법

| 프로브 | 대상 | 원시 결과 |
|---|---|---|
| `probes/workbench-probe.mjs` | `index.html` + `src/workbench.mjs` (W1~W7) | `evidence/workbench-probe.json` |
| `probes/combos-probe.mjs` | `combos/index.html` + `src/combos/app.mjs` (C1~C3) | `evidence/combos-probe.json` |
| `probes/gallery-probe.mjs` | `site/gallery/index.html` (G1~G6) | `evidence/gallery-probe.json` |
| `probes/layout-probe.mjs` | 폭별 좌표 측정 (L1~L4) | `evidence/layout-probe.json` |
| `probes/screens-before.mjs` | 390·768·1280 캡처 | `screens/before/` |

다시 실행하려면 저장소 루트에서 다음을 쓴다.

```sh
PORT=4201 node scripts/serve.mjs &
BASE=http://127.0.0.1:4201/ node docs/dev/platform/probes/workbench-probe.mjs
```

"JSON 가져오기" 입력으로 쓰는 Blueprint는 프로브가 Node에서 `createBlueprint(...)`로 만들어 `#blueprint-editor`에 붙여 넣고 "적용"을 눌렀다. WB-04 재현에서 나온 미처리 예외 말고는 어느 시나리오에서도 콘솔·미처리 오류가 없었다.

## 1. 판정 요약

| ID | 항목 | 판정 | 핵심 근거 |
|---|---|---|---|
| WB-01 | 상태 분산 | **재현됨** | 새로고침 시 선택·필터·탭이 사라지고, 가져오기 후 `sel`과 `blueprint`가 갈라진다 (W1, W5) |
| WB-02 | `useTheme`가 콘텐츠를 잃음 | **재현됨** | 테마 변경 한 번에 편집한 제목, 페이지 이름, 밀도가 모두 기본값으로 돌아간다 (W2) |
| WB-03 | 레이아웃 변경 시 템플릿 children 재적용 | **재현됨** | 구성 변형 칩 한 번에 편집한 제목·지표 이름이 사라진다 (W3) |
| WB-04 | `sel` 선수정 후 commit 실패 | **재현됨 (조건부)** | JSON 가져오기 뒤 템플릿 변경 시 미처리 예외, 화면·파일명이 서로 다른 상태를 가리킨다 (W4). 가져오기 없이는 commit 실패 경로를 찾지 못했다 |
| WB-05 | JSON 가져오기 후 선택 상태 불일치 | **재현됨** | 다른 템플릿을 가져와도 템플릿 선택·구성 변형·레시피·내려받기 이름이 옛 템플릿 기준이고 새로고침 뒤에도 유지된다 (W5) |
| WB-06 | 다크 보기가 문서 모드를 바꿈 | **재현됨** | 보기 버튼이 `blueprint.mode`, 내려받는 JSON, 저장값을 바꾼다. `auto`로는 되돌아가지 못한다 (W6) |
| WB-07 | 카탈로그·조립기 전환이 URL 라우팅이 아님 | **재현됨** | 탭을 눌러도 URL이 안 바뀌고, 한 번 `#catalog`로 들어오면 해시가 남아 새로고침 시 카탈로그가 다시 열린다 (W7) |
| CB-01 | 조합 갤러리 필터 초기화 불완전 | **재현됨** | `실험 구성 포함`, 쪽 크기, 보기 설정(테마·모드)이 남는다 (C1) |
| CB-02 | 조합 갤러리 URL·history | **일부 재현됨** | 확대 보기에서 고른 보기 설정이 닫으면 되돌아간다, 공유 링크 새로고침마다 history가 늘어난다. 확대 보기의 push·뒤로·앞으로, 딥링크, Esc는 정상이다 (C2) |
| WB-08 | 노드 삭제가 검증에서 실패해도 선택이 이동 (추가 발견) | 재현됨 | W4 `removeRequired` |
| WB-09 | 죽은 저장 키 `structure-closed` (추가 발견) | 코드 근거 | `src/workbench.mjs:297`은 읽고, 쓰는 곳이 없다 |
| WB-10 | 390px 상단 메뉴 잘림 (추가 발견) | 재현됨 | 메뉴 폭 847px가 237px 안에서 가로 스크롤 (L2) |
| WB-11 | 1024-1559px에서 구조 패널이 미리보기를 가림 (추가 발견) | 관찰 | 352px를 덮는다. 드로어 의도일 가능성이 높아 결함 판정은 보류 (L1) |
| GL-01 | 단일 갤러리: 고친 축이 테마·템플릿·변형·구성 변경 때 사라짐 (추가 발견) | 재현됨 | G2 |
| GL-02 | 단일 갤러리: 금지 조합에서 JSON과 HTML 내보내기가 서로 다른 상태 (추가 발견) | 재현됨 | G3 |
| GL-03 | 단일 갤러리: 구성 변형을 슬롯 하나만 고를 수 있음 (추가 발견) | 재현됨 | G4 |
| GL-04 | 단일 갤러리: 확대 보기·탭이 history에 없음 (추가 발견) | 재현됨 | G5 |

## 2. 조립기 (`index.html` + `src/workbench.mjs`)

모든 줄 번호는 `src/workbench.mjs` 기준이다. 공통 원인은 `commit()`(166-179행)이 문서 전체를 받아 통째로 갈아 끼우는 구조이고, 편집·선택·보기 전환이 각각 다른 변수를 먼저 바꾼 뒤 `commit()`을 부른다는 점이다.

### WB-01 상태 분산 — 재현됨

- **재현 단계 (W1)**
  1. 조립기를 연다(1600px).
  2. 구조 트리에서 "그리드"(경로 `1`)를 선택하고, 팔레트 계열 칩과 검색어(`blue`)를 바꾸고, 미리보기 폭을 "태블릿"으로 바꾸고, 카탈로그 탭을 다녀온다.
  3. 밀도 축을 `여유`로 바꿔 한 번 커밋한 뒤 새로고침한다.
- **예상**: 사용자가 작업하던 위치(선택 노드, 필터, 탭)가 URL이나 저장값으로 복원된다. 적어도 문서와 그 문서를 가리키는 선택 정보는 항상 일치한다.
- **실제**: 새로고침 뒤 선택 노드는 루트 "페이지"로, 팔레트 검색어는 빈 값으로 돌아갔다. 폭(`tablet`)과 `{blueprint, sel}`만 남았다. URL은 처음부터 끝까지 `/`였다. 저장 키는 `winterholic-static-kit.device`, `winterholic-static-kit.blueprint.v3` 둘이고 저장되는 `sel`의 키는 `templateId, layout, themeVariant, paletteChosen`뿐이다. 문서와 `sel`이 갈라지는 구체 사례는 WB-04, WB-05다.
- **원인**
  - 상태가 여러 변수에 흩어져 있다. 모듈 변수 `blueprint, compiled, selected, valid, lastDraft`(14행), `sel`(15행), `ui`(16행), `catalogState`·`catalogView`(225-226행), `viewports`(202행).
  - DOM이 상태를 겸한다. 열린 축 그룹은 DOM에서 읽고(116행), 렌더 캐시는 `el._html`(23행), 검색어는 입력 요소 값(287행), 모바일 패널은 `data-panel`(269행), 구조 패널은 `dataset.structure`(160행)다.
  - 저장은 `save()`(41-44행)가 `{blueprint, sel}`만 쓴다. 복원은 `Object.assign(sel, ..., parsed.sel)`(282행)로 `sel`을 문서와 대조하지 않고 그대로 넣는다.
- **수정 방향**: 문서(`blueprint` + 출처 정보)를 하나의 저장소로 두고 선택·필터·탭은 URL(`searchParams`)이나 명시적 UI 상태로 분리한다. `sel`의 값(`templateId`, `layout`, `themeVariant`)은 문서에서 **파생**하거나, 문서와 함께 원자적으로만 바꾼다. 복원 시 검증한다.

### WB-02 `useTheme` 콘텐츠 유실 — 재현됨

- **재현 단계 (W2)**
  1. 페이지 이름을 `내 프로젝트`로 바꾼다.
  2. 트리에서 "페이지 제목"(경로 `0`)을 선택해 노드 JSON의 `title`을 `EDITED-TITLE`로 바꾸고 "노드 적용"을 누른다.
  3. 밀도 축을 `여유`로 바꾼다.
  4. 테마 선택을 `botanical`로 바꾼다.
- **예상**: 시각 언어(테마)만 바뀌고, 사용자가 쓴 내용과 사용자가 고른 축은 남는다.
- **실제**: 이름은 `워크스페이스`(템플릿 기본)로, 제목 `EDITED-TITLE`은 사라졌고, 밀도는 `comfortable`(테마 기본)로 돌아갔다. 테마 변형 칩(`compact-ops`)도 같다: 테마를 `workspace`로 돌리고 제목을 다시 고친 뒤 칩을 누르면 편집이 사라졌다.
- **원인**: `useTheme`(184행)과 변형 칩 핸들러(237행)는 `commit(compose(sel.templateId, id))`를 부른다. `compose`(181행)는 `createBlueprint(templateId, themeId, ...)`로 **템플릿에서 새 Blueprint를 만든다**. `createBlueprint`(`src/catalog/index.mjs:93-109`)는 이름은 `t.name`, 축은 테마 기본값, `tree`는 `applyLayout(t.tree, ...)`, `chrome`은 템플릿 복사본이다. 팔레트만 `sel.paletteChosen`일 때 보존된다. 기존 문서를 입력으로 받는 경로가 없다.
- **수정 방향**: 테마 변경은 "문서의 시각 축만 교체하는 편집 연산"이어야 하고 `tree`·`chrome`·`name`은 건드리지 않는다. 사용자가 고른 축을 유지할지는 정책을 정한다(이 감사는 정책을 정하지 않는다). 이 연산은 Core 편집 연산(`setTheme`) 몫이며 현재 다른 트랙이 구현 중이다 (`03-interfaces.md` 2절).

### WB-03 레이아웃 변경 시 템플릿 children 재적용 — 재현됨

- **재현 단계 (W3)**
  1. 기본 템플릿(`dashboard-overview`)에서 "페이지 제목"의 `title`을 `EDITED-TITLE`로, "그리드"의 첫 지표 `label`을 `EDITED-METRIC`으로 바꿔 둘 다 적용한다.
  2. "구성 변형"의 `격자 열 수 > 2열` 칩을 누른다.
- **예상**: 그리드 열 수만 바뀌고 두 편집은 남는다.
- **실제**: 두 편집 모두 사라졌다 (`title: false`, `metric: false`). 슬롯과 무관한 "페이지 제목"까지 템플릿 기본값으로 돌아갔다.
- **원인**: 레이아웃 칩 핸들러(239-244행)가 `mutate(next => { next.tree = {type: 'page', children: compose(sel.templateId, blueprint.theme).tree.children}; })`(243행)로 **템플릿에서 만든 트리를 통째로 덮어쓴다**. 변경 대상 슬롯만 적용하는 것이 아니다.
- **수정 방향**: 구성 변형은 현재 문서 `tree`에 슬롯 하나의 변환만 적용하는 연산이어야 한다 (`applyLayout`은 이미 `tree`를 입력으로 받지만 조립기는 템플릿 원본을 넘긴다). 편집 내용이 있는 노드에는 적용할 수 없다면 이유와 함께 거부한다.

### WB-04 `sel` 선수정 후 `commit` 실패 — 재현됨 (조건부)

- **재현 단계 (W4)**
  1. 테마를 `workspace`로, 테마 변형 칩 `compact-ops`를 고른다.
  2. 구조·JSON 패널의 "전체 설계 JSON · 가져오기"에 `createBlueprint('dashboard-overview', 'ledger')`로 만든 JSON을 붙여 넣고 적용한다. (테마가 `ledger`가 되고 변형 칩은 모두 꺼진다.)
  3. 템플릿 선택을 `saas-landing`으로 바꾼다.
  4. "설계 JSON ↓"을 누른다.
- **예상**: 템플릿이 바뀌거나, 바뀌지 않고 이유가 화면에 나온다. 어느 쪽이든 화면과 내려받는 파일이 같은 상태를 가리킨다.
- **실제**: 미처리 예외 `Unknown theme variant: ledger/compact-ops`가 났다. 선택 상자는 `saas-landing`을 보이는데 문서는 여전히 대시보드(`name: 워크스페이스`, `pageType: dashboard`)이고, 현재 조합 요약도 `프로젝트 현황 대시보드 · 레저 · ...`이다. 그런데 내려받는 파일 이름은 `saas-landing-blueprint.json`이다. 즉 `sel.templateId`만 먼저 바뀌었다. 같은 상태에서 구성 변형 칩을 눌러도 같은 예외가 난다.
- **원인**
  - `useTemplate`(183행)은 `sel.templateId = id; sel.layout = {}`를 먼저 쓴 뒤 `commit(compose(...))`를 부른다. `compose`는 `commit`의 `try`(167-178행) **바깥**인 인자 평가 시점에 `createBlueprint`를 부르고, 가져오기 전에 고른 낡은 `sel.themeVariant`(`compact-ops`)를 새 테마에 적용하다 `src/catalog/index.mjs:100`에서 던진다.
  - 레이아웃 칩(242-243행)과 `mutate`(180행)도 같다. `mutate`의 `fn(next)`는 `commit`의 `try` 밖이다.
  - 낡은 `sel.themeVariant`가 생기는 이유는 WB-05다(가져오기가 `sel`을 갱신하지 않는다).
- **조건**: 가져오기 없이 UI 선택만으로 `commit`이 실패하는 경로는 찾지 못했다. `audit`의 `MATRIX: 4590 template×theme pages ... compile`(85×54 전부)과 `VARIANTS: 366 layout options ... (438 pages compile)`가 템플릿×테마와 구성 변형 옵션이 컴파일됨을 보여 (`evidence/verify.log`), 순서 결함은 현재 카탈로그에서는 "잠복"으로 보인다. 검증이 실패할 수 있는 다른 경로(노드 JSON 편집, 노드 삭제)는 WB-08에 적었다. 완전탐색은 하지 않았다.
- **수정 방향**: 모든 편집을 "다음 문서를 만들고, 검증하고, 성공했을 때만 문서와 파생 상태를 함께 교체"하는 한 경로로 모은다. 선수정은 하지 않는다.

### WB-05 JSON 가져오기 후 선택 상태 불일치 — 재현됨

- **재현 단계 (W5)**: 기본 상태에서 `createBlueprint('saas-landing', 'aurora')` JSON을 가져오기에 붙여 적용한다.
- **예상**: 템플릿 선택, 레시피, 구성 변형, 내려받기 이름이 가져온 문서와 일치하거나, 출처 템플릿을 알 수 없다고 표시한다.
- **실제**: 문서는 `플로우웍스`, `aurora`, `landing`인데 템플릿 선택 상자는 `dashboard-overview`, 현재 조합 요약은 `프로젝트 현황 대시보드 · 오로라 · ...`, 구성 변형 슬롯은 대시보드 것(`격자 열 수`, `표·목록`, `좌우 배치`), 레시피 카드도 대시보드 것이다. 내려받기 이름은 `dashboard-overview-blueprint.json`이다. 페이지 유형 설명만 가져온 문서(`랜딩 ...`)를 따른다. **새로고침 뒤에도 같다.** `sel`이 저장되어 그대로 복원된다.
- **원인**: `apply-blueprint` 핸들러(263행)는 `if (commit(next)) selected = []`만 한다. `sel`(15행)을 갱신하지 않는다. 복원 시 검증은 `templates[parsed.sel?.templateId]`가 존재하는지만 본다(282행).
- **수정 방향**: 가져온 Blueprint에서 출처 템플릿은 알 수 없다 (`blueprint.json`에 템플릿 id가 없다, `createBlueprint`가 흔적을 남기지 않는다고 `src/catalog/index.mjs:91`에 적혀 있다). 따라서 `sel`을 "템플릿에서 만든 문서"라는 사실에만 두고, 가져온 문서는 출처 없음(`origin: null`)으로 명시해 템플릿·구성 변형·레시피 UI를 끄거나 "가져온 문서" 상태로 보여야 한다.

### WB-06 다크 보기가 문서 모드를 바꿈 — 재현됨

- **재현 단계 (W6)**
  1. 조립기를 연다(문서 `mode: light`).
  2. 미리보기 위의 `다크 보기` 버튼을 누른다.
  3. "설계 JSON ↓"을 내려받아 열고, 저장값과 미리보기 `data-theme`를 읽는다.
  4. 다시 눌러 되돌린다. 이어서 모드를 `시스템(auto)`로 바꾸고 `다크 보기`, `라이트 보기`를 차례로 누른다.
- **예상**: `다크 보기`는 미리보기를 어둡게 "보는" 일시 전환이고 문서는 바뀌지 않는다. 문서의 `mode`는 별도 "모드" 라디오로만 바뀐다.
- **실제**: `blueprint.mode`가 `dark`가 되었다. 내려받은 JSON의 `mode`도 `dark`, 저장값 `blueprint.mode`도 `dark`, 미리보기 `data-theme`도 `dark`다. 되돌리면 `light`다. `auto` 문서에서 `다크 보기` → `라이트 보기`를 누르면 `dark` → `light`가 되어 **`auto`로는 돌아오지 못한다**. 사용자가 의도하지 않은 문서 변경이다.
- **원인**: `for (const id of ['mode', 'modal-mode']) $(id).addEventListener('click', () => setAxis('mode', blueprint.mode === 'dark' ? 'light' : 'dark'))`(252행). 보기 전환이 편집 연산(`setAxis`→`commit`, 185-191행)을 쓴다. 버튼 문구도 `blueprint.mode`에서 만든다 (101-104행).
- **수정 방향**: 보기용 모드를 UI 상태(`ui.previewMode`)로 분리해 미리보기 컴파일에만 `mode`를 덮어쓰고, 내보내기와 저장은 문서의 `mode`를 쓴다. 문서의 `auto`가 보장하는 두 토큰 세트 검증(R19)은 보기 전환과 무관하다.

### WB-07 카탈로그·조립기 전환이 URL 라우팅이 아님 — 재현됨

- **재현 단계 (W7)**
  1. `/`에서 `카탈로그` 탭을 누른다 → URL은 `/`다.
  2. `뒤로` → 앱을 떠나 `about:blank`로 간다.
  3. `/#catalog`를 직접 연다 → 카탈로그가 열린다.
  4. `조립기` 탭을 눌러 돌아온다 → URL은 `/#catalog`로 남아 있다.
  5. 새로고침한다 → 카탈로그가 다시 열린다 (조립기가 아니다).
  6. 카탈로그 안의 하위 탭(템플릿·테마·팔레트·부품) 전환도 URL이 안 바뀐다.
- **예상**: 탭 전환이 history 항목과 URL을 만들어 뒤로 가기와 공유 링크가 동작한다.
- **실제**: 위와 같다. 해시는 처음 로드할 때 한 번 읽을 뿐 쓰지 않는다. 탭을 누른 뒤에도 history 길이는 2(초기 `about:blank` + 앱 한 항목)로 새 항목이 생기지 않았다.
- **원인**: `showPage`(227-232행)는 `hidden`과 `aria-pressed`만 바꾼다. 해시는 `boot()` 끝(302행)에서 한 번 읽는다. `catalogState`(225행)도 URL과 무관하다. 탭 핸들러는 270행.
- **수정 방향**: `/studio`와 `/explore` 같은 실제 경로로 나누고, 카탈로그 하위 탭과 필터는 `searchParams`로 둔다. 기존 `/#catalog`는 `/explore`로 리다이렉트한다 (`03-interfaces.md` 5절).

### WB-08 (추가) 노드 삭제 검증 실패 시 선택이 이동 — 재현됨

- **재현 단계 (W4 `removeRequired`)**: 기본 대시보드에서 표, 본문+보조 영역을 차례로 삭제한 뒤 남은 "그리드"를 삭제한다.
- **예상**: 삭제가 `PAGE_REQUIRE`로 거부되면 문서도 선택도 그대로다.
- **실제**: 오류 상자에 `$.tree [PAGE_REQUIRE] 대시보드 페이지에는 metric · chart · table · list · kanban · calendar 중 하나 이상이 필요합니다.`가 나오고 문서는 유지되지만(트리에 "그리드"가 남아 있다) 선택은 루트 "페이지"로 옮겨졌다.
- **원인**: `remove-node` 핸들러(265행)는 `mutate(...)` 결과와 무관하게 `selected = path.slice(0, -1); renderTree()`를 실행한다. 추가(264행)와 이동(266행)은 `mutate`의 콜백 안에서 `selected`를 먼저 바꾼다. 실패하면 `selected`가 존재하지 않는 경로를 가리킬 수 있고, 다음 `renderTree`가 `selected = []`로 되돌린다(130행).
- **수정 방향**: WB-04와 같다.

### WB-09 (추가) 죽은 저장 키 — 코드 근거

`src/workbench.mjs:297`은 `localStorage.getItem('winterholic-static-kit.structure-closed')`를 읽지만 같은 키를 쓰는 코드가 `src/`, `index.html` 어디에도 없다 (`grep` 결과 297행 한 곳). 구조 패널을 닫은 선택이 저장되지 않으므로 1560px 이상에서는 항상 열린 채로 시작한다. 수정 방향: 저장하거나 키를 없앤다.

### WB-10 (추가) 390px 상단 메뉴 잘림 — 재현됨

`.app-header nav`는 폭 237px, 내용 폭 847px, `overflow-x: auto`다 (L2). 390px에서 `조립기·카탈로그·전체 조합`까지 보이고 `샘플 갤러리`는 경계에서 잘리며(오른쪽 끝 446px > 374px), 나머지 6개 링크는 가로 스크롤해야 보인다. 스크롤 가능하다는 표시가 없다 (`screens/before/workbench-choices-390.png`). 수정 방향: 모바일에서는 주요 3-4개만 두고 나머지는 메뉴로 접는다.

### WB-11 (추가) 1024-1559px에서 구조 패널이 미리보기를 가림 — 관찰

`구조·JSON`을 열면 패널이 `position: absolute`로 352px를 덮는다 (1280px에서 미리보기 폭 886px 중 352px, 1100px·1024px도 같음). 이 구간에서 Esc로 닫도록 한 코드(271행)가 있어 드로어는 의도된 동작으로 보인다. 다만 데스크톱 폭(1280px) 미리보기가 67% 배율로 그려진 채 오른쪽이 가려진다 (`screens/before/workbench-structure-1280.png`). 결함 여부는 제품 결정이라 판정하지 않는다. 768px 이하에서는 패널 대신 모바일 탭이 쓰인다.

## 3. 전체 조합 갤러리 (`combos/index.html` + `src/combos/app.mjs`)

### CB-01 필터 초기화 불완전 — 재현됨

- **재현 단계 (C1)**: 검색어 `히어로`, 페이지 유형, 정렬 `changed`, 쪽 크기 `96`, `같은 화면 숨기기`, `레시피 추천만`, `실험 구성 포함`, `썸네일 길게(페이지 아래까지)`, 컨셉, 구성 변형 슬롯 하나, 보기 설정의 테마와 모드 `다크`를 모두 바꾼 뒤 `필터 초기화`를 누른다.
- **예상**: 모든 필터가 기본값으로 돌아간다. 실제로 사용자는 "필터 초기화"를 첫 화면으로 돌아가는 동작으로 기대한다.
- **실제**: 검색어, 유형, 정렬, 같은 화면, 레시피, 썸네일 길게, 컨셉, 슬롯은 초기화됐다. 아래는 남았다. 결과 줄은 `4,955개 중 4,955개`로, 기본 목록(실험 구성 숨김)이 아니다.

| 남은 값 | 초기화 후 URL | 새로고침 뒤 |
|---|---|---|
| `실험 구성 포함` 켜짐 (`exp=1`) | `?theme=ledger&mode=dark&exp=1&ps=96` | 같음 |
| 쪽 크기 96 (`ps=96`) | 위와 같음 | 같음 |
| 보기 설정 테마 `ledger`, 모드 `dark` | 위와 같음 | 같음 |

- **원인**: `src/combos/app.mjs:371`의 `Object.assign(state, {q:'', pt:'', t:'', slots:{}, sort:'default', same:false, flagged:false, tall:false, rec:false})`에 `exp`와 `size`(`state.size`)가 없다. 보기 설정은 `concept`·`look`만 지운다(`state.view = normalizeView({...state.view, concept: null, look: null})`). `state.exp`가 그대로라 `drawFilters`(92행)가 체크박스를 다시 켠다.
- **판정 보충**: 쪽 번호는 초기화된다 (C1b: `?p=3`에서 초기화하면 1쪽, URL 빈 값). 따라서 "필터 초기화 불완전"의 범위는 `exp`, `size`, 보기 설정(테마·변형·팔레트·서체·모드)이다. 보기 설정을 필터와 같은 버튼으로 지워야 하는지는 제품 결정이지만, `exp`는 필터이므로 명백히 누락이다. 보기 설정은 별도 "보기 초기화" 버튼이 있다(122행).
- **수정 방향**: 초기화 대상을 한 상수(`DEFAULT_STATE`)에서 만들어 `Object.assign`과 `readUrl`이 같은 기본값을 쓰게 한다. 새 필터가 생길 때 누락되지 않도록 시험이 `buildQuery` 키 전체를 순회하게 한다.

### CB-02 URL·history — 일부 재현됨

하위 주장별로 판정한다.

| 주장 | 판정 | 관찰 (프로브 C2*) |
|---|---|---|
| a. 필터·쪽 변경이 history 항목을 만들지 않는다 | 재현됨 (설계 선택으로 보임) | 필터 두 개와 쪽 이동 뒤 history 길이 2 그대로(`pushed: 0`). 뒤로 가기는 필터를 되돌리지 않고 앱을 떠나 `about:blank`로 간다. `replaceState`(74행) 때문이다. 상태는 URL에 남으므로 공유·새로고침은 정상이다. 결함인지는 정책 결정이다 |
| b. 확대 보기 열기·넘기기·뒤로·앞으로·닫기 | 정상 | 열면 항목 1개(`pushState`, 281행), 3번 넘겨도 항목은 늘지 않음(`replaceState`), 뒤로 가기는 확대 보기만 닫고 `p=2`와 필터를 유지, 앞으로 가기는 다시 연다. X 닫기도 같다 |
| c. 공유 링크 딥링크, Esc | 정상 | `?c=saas-landing`으로 들어오면 확대 보기가 열리고, Esc로 닫으면 URL이 `/combos/`로 돌아온다 |
| d. 확대 보기에서 고른 보기 설정이 닫으면 사라진다 | **재현됨 (결함)** | C2e: 갤러리 테마 `console` → 확대 보기에서 `trust`로 변경 (갤러리 선택 상자도 `trust`로 동기화) → `닫기`. 닫은 뒤 갤러리 테마는 `console`, URL `?theme=console`이다. 확대 보기에서 고른 선택이 되돌려진다 |
| e. 공유 링크를 새로고침하면 history 항목이 늘어난다 | **재현됨 (경미)** | C2c: `?c=...`로 진입하면 history 길이 3, 새로고침 뒤 4. C2f: 두 번 새로고침한 뒤 뒤로 가기가 `(목록)`, `(목록)`, `about:blank` 순서로 두 번 목록에 머문다 |

- **d의 원인**: 확대 보기에서 보기 설정을 바꾸면 `viewChanged()`(159-163행)가 `writeUrl()`로 **현재(확대 보기) 항목**의 URL만 `replaceState`한다. 닫기는 `history.back()`(300행)이라 목록 항목으로 돌아가고, `popstate` 핸들러(384-385행)가 `readUrl()`로 목록 항목의 옛 URL에서 `state.view`를 다시 읽는다. 코드 주석은 "갤러리와 확대 보기가 같은 상태를 공유"한다고 말하지만(112행) 닫을 때 공유가 깨진다.
- **e의 원인**: 부팅이 `state.open = null; writeUrl()`로 현재 항목의 URL을 목록 URL로 바꾼 뒤 `openViewer(first)`가 새 항목을 `pushState`한다(409-410행, 281행). 공유 링크 항목이 목록 항목으로 바뀌고 확대 보기 항목이 하나 더 쌓인다.
- **수정 방향**: 보기 설정은 "열려 있는 동안만의 상태"가 아니라 갤러리 상태이므로 `popstate`가 확대 보기만 닫도록 하고, `state.view`를 항목 URL에서 읽지 않거나(확대 보기 전용 파라미터와 분리) 닫기를 `history.back()` 대신 `replaceState`로 처리한다. 정책(a)은 Next.js의 `router.replace`/`push` 선택으로 명시한다.

### 정상으로 확인한 동작 (CB 범위)

- 390px 가로 넘침 없음 (`overflowX: 0`, C3). 모든 시나리오에서 콘솔·미처리 오류 없음.
- 쪽 번호는 필터 초기화 때 1로 돌아간다 (C1b).

## 4. 단일 파일 갤러리 (`site/gallery/index.html`, 생성기 `scripts/gallery.mjs`)

### GL-01 고친 축이 사라짐 — 재현됨

- **재현 단계 (G2)**: 첫 템플릿을 열고(390px) 설정에서 밀도를 `compact`로 바꾼 뒤 각각 테마, 테마 변형, 템플릿을 바꾼다 (각 변경 전에 밀도를 다시 고친다).
- **예상**: 테마·템플릿을 바꿔도 사용자가 고른 축은 남는다.
- **실제**: 세 경우 모두 밀도가 `comfortable`로 돌아갔다.
- **원인**: 세 핸들러가 `make(...)`(`scripts/gallery.mjs:31`)로 `createBlueprint`를 다시 불러 문서를 새로 만든다 (`:113-116`). `applyAxis`(`:100`)로 고친 `bp[k]`는 보존되지 않는다. WB-02와 같은 뿌리다.
- **수정 방향**: WB-02와 같다. 갤러리도 같은 편집 연산을 써야 한다.

### GL-02 금지 조합에서 JSON과 HTML 내보내기가 어긋남 — 재현됨

- **재현 단계 (G3)**: `스타일 축` 탭에서 `elevation`의 `glow`를 누른다 (`saas-landing`, trust 테마, 라이트에서 X05 금지).
- **예상**: 오류가 보이는 동안 내보내기는 같은 상태를 내거나 막힌다.
- **실제**: 오류 상자에 `$.elevation [AXIS_BAN] X05 · ... (사용 가능한 대안: elevation=soft)`가 보인다. 미리보기는 마지막 유효 화면이다. `JSON` 내려받기는 `elevation: "glow"`인 **금지 조합 Blueprint**를 내보내고, `HTML` 내려받기는 마지막 유효 화면(`glow` 문자열 없음)을 내보낸다. 조립기는 오류일 때 내려받기 버튼을 끈다(38행). 단일 갤러리는 끄지 않는다.
- **원인**: `show(b)`(`:83`)는 오류 시 `lastHtml`을 갱신하지 않고, `#dl`(`:119`)은 `lastHtml`을, `#dlj`(`:120`)는 `bp`를 내려받는다.
- **수정 방향**: 오류 중에는 두 버튼 모두 비활성화한다. 한 상태에서 파일 둘을 만든다.

### GL-03 구성 변형을 슬롯 하나만 고를 수 있음 — 재현됨

`구성 변형`이 단일 `<select>`이고 값이 `슬롯:옵션` 하나다 (G4: 슬롯 7개 그룹 중 `hero:product`를 고르고 `intro:center`를 고르면 앞 선택이 해제된다). 조립기와 조합 갤러리는 여러 슬롯을 함께 고른다. 원인은 `lay`가 `[슬롯, 옵션]` 배열 하나인 점(`scripts/gallery.mjs:30`, `:31`, `:116`)이다. 수정 방향: `{슬롯: 옵션}` 맵으로 바꾼다.

### GL-04 확대 보기·탭이 history에 없음 — 재현됨

(G5) 확대 보기를 열고 `뒤로`를 누르면 갤러리를 떠나 `about:blank`로 간다. URL은 탭·확대 보기와 무관하게 불변이고 history 길이는 2로 그대로다. 조합 갤러리는 같은 상황에서 `pushState`로 확대 보기만 닫는다. 휴대폰에서 뒤로 가기는 확대 보기를 닫는 자연스러운 동작인데 이 갤러리는 페이지를 나간다. 원인은 `openViewer`(`:101`)와 닫기 핸들러(`:110`)가 history를 쓰지 않는 점이다. 단일 파일·오프라인이라는 제약 때문에 의도했을 수 있으나 `file://`에서도 `history.pushState`는 같은 문서 안에서 동작한다 (미검증, `확인 필요`).

### 정상으로 확인한 동작 (GL 범위)

- 390px 가로 넘침 없음, 템플릿 카드 85개 렌더, 콘솔 오류 없음 (G1).
- 키보드로 카드를 열고 Esc로 닫으면 포커스가 같은 카드(인덱스 2)로 돌아온다 (G6).

## 5. 캡처 (`screens/before/`)

390·768·1280px, 뷰포트 크기(스크롤 없는 첫 화면), 23장이다. 파일명은 `<화면>-<폭>.png`다.

| 화면 | 390 | 768 | 1280 |
|---|---|---|---|
| 조립기 선택 패널 | `workbench-choices-390.png` | `workbench-choices-768.png` | `workbench-choices-1280.png` |
| 조립기 미리보기 | `workbench-preview-390.png` | `workbench-preview-768.png` | (선택·미리보기·구조가 한 화면) |
| 조립기 구조·JSON | `workbench-structure-390.png` | `workbench-structure-768.png` | `workbench-structure-1280.png` |
| 조립기 카탈로그 | `workbench-catalog-390.png` | `workbench-catalog-768.png` | `workbench-catalog-1280.png` |
| 조합 갤러리 목록 | `combos-list-390.png` | `combos-list-768.png` | `combos-list-1280.png` |
| 조합 갤러리 확대 보기 | `combos-viewer-390.png` | `combos-viewer-768.png` | `combos-viewer-1280.png` |
| 단일 갤러리 목록 | `gallery-templates-390.png` | `gallery-templates-768.png` | `gallery-templates-1280.png` |
| 단일 갤러리 확대 보기 | `gallery-viewer-390.png` | `gallery-viewer-768.png` | `gallery-viewer-1280.png` |

`workbench-preview-1280.png`는 없다. 1280px에서는 선택·미리보기가 한 화면(`workbench-choices-1280.png`)에 있다. 찍은 사진을 직접 열어 본 것은 `workbench-preview-390`, `workbench-structure-1280`, `combos-viewer-390` 세 장이다. 나머지는 파일 생성과 크기만 확인했고 눈으로 검토하지 않았다.

## 6. 범위와 한계

- 접근성 감사(스크린 리더, 대비)는 이 문서의 범위가 아니다. 기존 e2e가 구조 접근성을 검사한다 (`00-baseline.md` 3절).
- 터치 대상 높이는 40px 안팎이 다수다(L4). WCAG 2.2 최소 목표 크기(24px)는 넘으므로 결함으로 올리지 않았다. 44px 기준은 이 저장소 문서에서 약속을 찾지 못해 판정하지 않았다.
- 조립기의 노드 JSON 편집기, 팔레트 선택기, 미리보기 새 창(`window.open`), 전체 화면 모달은 이 감사에서 결함을 찾으려 조작하지 않았다. 기존 e2e 12개가 다룬다.
- 실기기(iOS Safari, Android Chrome) 조작은 하지 않았다. 390px는 Chromium 뷰포트 에뮬레이션이다 (`미실행: 실기기 없음`).
