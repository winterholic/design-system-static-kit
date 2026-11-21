# 02 Core 지도 (`src/`)

기준은 `main` HEAD `b303f17c1`의 `src/`다. "Core"는 이 문서에서 **`src/` 중 DOM과 Node 내장 모듈 없이 동작하는 부분**을 뜻한다. 다른 트랙이 `src/edit/`, `repairAxes`, 구성 변형을 고치는 중이라 그 영역은 6절에 관찰 사실만 적었다.

## 1. 한눈에 보는 결론

| 질문 | 답 | 근거 |
|---|---|---|
| Core가 React나 Next.js를 import하는가 | 아니오 | `grep -rlE "from '(react\|next\|react-dom)"  src` → 0개 |
| Core가 Node 내장 모듈(`fs`, `path`, `crypto`)을 쓰는가 | 아니오 | `src/` 전체에서 `from 'node:*'`와 `require(` 0건. `process`는 텍스트 문자열 안의 단어 2건뿐 (`templates.mjs:272`, `templates-more.mjs:227`) |
| Core가 `import.meta`를 쓰는가 | 아니오 | 0건. 소스에 `import.meta`가 있으면 `scripts/bundle.mjs`가 거부한다 (`bundle.mjs`의 `import.meta in bundled module`) |
| Core가 시간·난수에 의존하는가 | 아니오 | 비UI 모듈에 `Math.random`, `Date.now`, `new Date()` 0건. 섞기(`shuffled`)는 시드 기반 mulberry32다 (`combos.mjs:151`) |
| 브라우저에서 이미 실행되는가 | 예 | 조립기와 조합 갤러리가 `src/*.mjs`를 네이티브 ES 모듈로 불러 쓴다. 단일 갤러리는 `compiler.mjs`+`catalog.mjs`를 IIFE로 묶어(792,297바이트) 오프라인으로 돌린다 |
| Node 전용 코드는 어디에 있는가 | `scripts/`에만 | `scripts/output.mjs`(`node:fs`, `node:crypto`, `node:path`), `kit.mjs`, `build.mjs`, `check-generated.mjs`, `serve.mjs` 등 |
| 같은 입력에 같은 출력인가 | 예 | `00-baseline.md` 4절: 서로 다른 경로에 두 번 빌드한 3304개 파일 트리 해시가 같다 |
| 서비스 함수 계층이 있는가 | 없음 | 아래 3절. 카탈로그 조회 JSON은 `scripts/build.mjs`, CLI 요약은 `scripts/kit.mjs`에 흩어져 있고 Core에는 `listCatalog` 같은 함수가 없다 |

## 2. 모듈 지도

"번들"은 브라우저·Edge 번들러에 넣을 수 있는지다. 네 가지로 표시한다. 가능(순수), 가능(큰 데이터), 가능(문자열 속 DOM 코드), 불가(DOM).

### 2.1 컴파일 파이프라인

| 경로 | 역할 | 주요 export | Node 의존 | 번들 |
|---|---|---|---|---|
| `compiler.mjs` | 검증 → 토큰 → CSS → HTML → manifest. 대비 게이트 실패 시 예외 | `compile`, `validateBlueprint`, `resolveTokens`, `contrast` | 없음 | 가능(순수) |
| `validate.mjs` | 엄격·유한 검증기. 보정·기본값·키 제거 없음 | `validateBlueprint` | 없음 (`TextEncoder`, `structuredClone` 사용) | 가능(순수) |
| `tokens.mjs` | 팔레트×모드 → 역할 토큰, 대비 보고서(팔레트×모드당 105쌍) | `resolveTokens`, `resolveAll`, `contrast`, `mix`, `serializableContrast` | 없음 | 가능(순수) |
| `composition.mjs` | 맥락 결정(2.2): 사실 추출, 필드 충돌 판정, 폭 예산, 파생 CSS, 페이지 규칙 감사 | `planComposition`, `selectDesign`, `auditPage`, `compositionAttrs`, `compositionCSS`, `pageRulesApply` | 없음 | 가능(순수) |
| `layout.mjs` | 격자 흐름·벤토 배치 원시 요소와 lint | `flowColumns`, `bestCols`, `flowCSS`, `bentoPlan`, `lintLayout`, `layoutRev`, `layoutMarkdown` 등 | 없음 | 가능(순수) |
| `spacing.mjs` | 간격 계약(S01~S10) | `SPACE`, `TOKEN`, `spaceVars`, `RELATIONS`, `lintSpacing`, `contractCSS`, `spacingMarkdown` | 없음 | 가능(순수) |
| `typography.mjs` | 서체 프리셋 18개, 역할 크기, 한글 한도(리비전 2), lint | `TYPE`, `TYPE_IDS`, `typeRev`, `typeSpec`, `roleSizes`, `typeVars`, `lintType`, `HANGUL` 등 | 없음 | 가능(순수) |
| `header-design.mjs` | 헤더(chrome) 정책 파생 | `deriveHeaderDesign`, `headerDesignCSS` | 없음 | 가능(순수) |
| `table-design.mjs` | 표 열 폭 설계 | `deriveTableDesign` | 없음 | 가능(순수) |
| `render.mjs` → `render/` | 노드 트리 → HTML. `index.mjs`(`renderTree`, `escapeHTML`, `formRuntime`), `nodes`(부품 55), `shell`(셸 10·푸터 3), `chart`(SVG), `art`·`motifs`·`mocks`(미디어 일러스트), `highlight`(코드 색), `util`(아이콘·링크) | `renderTree`, `escapeHTML`, `formRuntime` | 없음 | 가능(문자열 속 DOM 코드). `formRuntime`은 **생성된 페이지에 넣는 브라우저 스크립트 문자열**이고 `document.*`는 그 문자열 안에만 있다 (`render/index.mjs:15-17`) |
| `styles.mjs` → `styles/` | 축 → 값 표(`base`), 셸(`shells`), 부품별 CSS 조각(`chunks`), 다듬기(`polish`), 사용 부품만 조립(`index`) | `stylesheet`, `usedTypes` | 없음 | 가능(순수) |

### 2.2 카탈로그 (정본)

| 경로 | 역할 | 주요 export | Node 의존 | 번들 |
|---|---|---|---|---|
| `catalog.mjs` | `catalog/index.mjs` 재export 한 줄 | (아래) | 없음 | 가능(큰 데이터) |
| `catalog/index.mjs` | 버전·한도, 규칙 20개, JSON Schema 생성, `repairAxes`, `createBlueprint`, 마이그레이션. 임포트 시 `[axes, axisDefs, themes, palettes, icons, nodeSpecs, pageTypes, templates, rules]`를 **깊이 얼린다** (47-48행) | `CATALOG_VERSION`, `SUPPORTED_CATALOG_VERSIONS`, `BLUEPRINT_VERSION`, `limits`, `rules`, `blueprintSchema`, `repairAxes`, `createBlueprint`, `migrateBlueprint`, `migrateV1`, `layoutOptionsOf` + 아래 데이터 | 없음 | 가능(큰 데이터) |
| `catalog/axes.mjs` | 스타일 축 15개, 축 조합 금지 11개, 내비 한도 | `axes`, `axisDefs`, `axisOrder`, `styleAxes`, `axisBans`, `navLimits` | 없음 | 가능 |
| `catalog/themes.mjs`, `theme-palettes.mjs`, `theme-variants.mjs`, `theme-type-variants.mjs` | 테마 54개와 추천 팔레트, 테마 변형 | `themes`, `themeCategories` | 없음 | 가능 |
| `catalog/palettes.mjs`, `palette-rows.mjs` | 팔레트 427개와 계열 | `palettes`, `paletteFamilies` | 없음 | 가능 |
| `catalog/nodes.mjs` | 부품 55종 스키마·예시, 크롬 스키마, 스키마 빌더(`str`, `en`, `obj` ...) | `nodeSpecs`, `nodeTypes`, `requiredOf`, `chromeSpec`, `mediaKinds`, `ratios`, `motifs` | 없음 | 가능 |
| `catalog/pagetypes.mjs` | 페이지 유형 16개 계약 | `pageTypes`, `pageTypeIds` | 없음 | 가능 |
| `catalog/templates.mjs`, `templates-more.mjs` | 템플릿 85개 | `templates`, `templateList` | 없음 | 가능 |
| `catalog/icons.mjs` | 아이콘 87개 | `icons`, `iconNames` | 없음 | 가능 |
| `catalog/variants.mjs`, `variant-contracts.mjs`, `variant-effects.mjs` | 구성 변형 슬롯·결과 계약(V01~V05)·측정된 무변화 옵션 | `layoutSlots`, `assessLayout`, `applyLayout`, `layoutSlotIds`, `variantContracts`, `assessOption` | 없음 | 가능 |
| `catalog/composition.mjs` | 맥락 결정표·페이지 규칙(P01~P04) | `compositionRules`, `pageRules`, `COMPOSITION_VERSION` | 없음 | 가능 |
| `catalog/concepts.mjs` | 컨셉 17개(템플릿과 시각 언어 묶음) | `concepts`, `conceptIds`, `conceptsOfTemplate` | 없음 | 가능 |
| `catalog/recipes.mjs` | 디자인 레시피 3개와 규칙 | `recipes`, `recipeRules`, `recipeIds` | 없음 | 가능 |
| `catalog/coverage.mjs` | 레이아웃·콘텐츠 커버리지 선언 | `layoutCoverage`, `contentCoverage`, `iconAliases` | 없음 | 가능 |

### 2.3 조합·레시피

| 경로 | 역할 | 주요 export | Node 의존 | 번들 |
|---|---|---|---|---|
| `recipes.mjs` | 디자인 레시피 선택 경로(난수·시간·브라우저 없음). 모듈 수준 `Map` 캐시 | `selectRecipe`, `recipePicks`, `recipePickOf`, `recipeOfTemplate`, `evaluateRecipe`, `recipeCheck`, `recipeBlueprint`, `sizeAt` | 없음 | 가능(순수, 캐시 있음) |
| `combos.mjs` | 템플릿 × 구성 변형 조합 4,955개를 그 자리에서 계산, 필터, 렌더 | `enumerateCombos`, `findCombo`, `comboId`, `comboBlueprint`, `renderCombo`, `filterCombos`, `facets`, `viewQuery`, `viewFromQuery`, `normalizeView`, `flagsToText` | 없음. 모듈 수준 캐시(`cache`, `findCombo.index`) | 가능(순수, 캐시 있음) |
| `combo-grades.mjs` | 전수 진단 등급. **생성 파일** (`node scripts/design-qa/grades.mjs`) | `EXPERIMENTAL`, `GRADES_META` | 없음 | 가능 |

### 2.4 UI (Core가 아님)

| 경로 | 역할 | DOM·브라우저 API | 번들 |
|---|---|---|---|
| `workbench.mjs` | 조립기 앱 전체 (상태, 렌더, 이벤트) | `document`, `localStorage`, `matchMedia`, `history` 등 | 불가(DOM) |
| `workbench/catalog-view.mjs` | 조립기 카탈로그 탭 | `IntersectionObserver` 등 | 불가(DOM) |
| `workbench/viewport.mjs` | 미리보기 폭 계산(`layoutFrame`, `DEVICES`는 순수), 마운트·새 창(DOM) | 혼재 | 부분(순수 함수만) |
| `workbench/axes.mjs` | 축 값 선택 가능성 판정(`optionState`), 선택 보정(`chooseAxis`), 축 그룹 | 없음 | 가능(순수). **결정 로직이 UI 폴더에 있다** |
| `workbench/palette-picker.mjs` | 팔레트 목록·필터(`listPalettes`), 카드 HTML | 없음 | 가능(순수). 필터 로직이 UI 폴더에 있다 |
| `combos/app.mjs` | 조합 갤러리 앱 | `document`, `history`, `localStorage` 등 | 불가(DOM) |
| `combos/render.mjs` | `render.html` 진입점 (`document.write`) | `location`, `document` | 불가(DOM) |
| `workbench.css`, `combos.css` | 두 앱 스타일 | - | 정적 자산 |

`workbench/axes.mjs`의 `optionState`·`chooseAxis`는 Core의 축 금지·테마 금지 판정(`axisBans`, `theme.forbid`, `pageTypes`)과 `repairAxes`를 호출해 "이 값을 고를 수 있는가"를 답한다. 지금은 조립기만 쓰지만 REST·MCP도 같은 질문(허용 값 조회)을 받게 되므로 후속 트랙에서 Core 서비스로 올리는 후보다 (`03-interfaces.md`).

## 3. 공개 함수 시그니처

모든 시그니처는 현재 코드 그대로다 (타입은 JSDoc이 없어 코드와 사용처에서 읽었다).

### 3.1 Blueprint 컴파일·검증

```js
// src/validate.mjs
validateBlueprint(input: unknown): { valid: boolean, errors: Array<{path: string, code: string, message: string}> }
// 입력을 바꾸지 않는다. 오류는 최대 80개. 크기(196,608바이트)·순환 참조·객체 여부를 먼저 본다.

// src/compiler.mjs
compile(input: Blueprint): { html: string, css: string, tokens: {light?: Tokens, dark?: Tokens}, manifest: Manifest }
// 내부에서 validateBlueprint를 먼저 부른다. 입력은 structuredClone하므로 바뀌지 않는다.
// 던지는 것: (1) 검증 실패 → Error('Invalid blueprint:\n...') + error.errors = 위 배열
//           (2) 대비 게이트 실패 → Error('Contrast gate failed')  (구조화된 정보 없음)
//           (3) 그 밖의 내부 예외 → 일반 Error (composition.mjs:16, 92 등)
```

`Manifest`의 키는 `blueprintVersion, catalogVersion, theme, palette, mode, pageType, axes, rules, paletteProvenance, contrast, blueprint, design`이다 (`saas-landing` 실측). `design`은 `{version, decisions, inherited, page, typography}`이고 `decisions`는 노드 경로마다 `{path, type, facts, coverage, ...}`다 (같은 템플릿에서 20건). `contrast`는 `{mode, name, foreground, background, ratio, minimum}` 105건이다.

### 3.2 카탈로그 조회

**조회 전용 함수는 없다.** 카탈로그는 데이터 export를 직접 읽는다 (깊이 얼려 있어 수정할 수 없다).

```js
// src/catalog.mjs (= src/catalog/index.mjs)
themes: Record<id, Theme>            // Theme: {id, name, category, description, palettes[], defaults, forbid, covers, variants[]}
palettes: Record<id, Palette>        // Palette: {id, name, label, theme, colors[], brand, likes, family, tone, source}
templates: Record<id, Template>      // Template: {id, label, pageType, theme, name, tree, axes, chrome}
templateList: Template[]
nodeSpecs: Record<type, NodeSpec>    // NodeSpec: {label, group, fields, optional, example, children?, min?, max?}
pageTypes, axes, axisDefs, axisBans, rules, concepts, recipes, recipeRules, iconNames ...
layoutOptionsOf(templateId: string): Slot[]        // layoutSlots(templates[id].tree, pageType, {templateId})
conceptsOfTemplate(templateId): string[]
blueprintSchema(): JSONSchema                       // 2020-12. 에디터 안내용. 교차 필드 규칙은 런타임 검증기가 판정
```

`site/v1/catalog.json`을 만드는 투영(필드 선택·`themes`의 `covers` 제거·템플릿에 `layoutSlots` 부착)은 **`scripts/build.mjs`의 한 문장**(22행)이고, `kit catalog`의 요약은 `scripts/kit.mjs`의 한 줄(9행)이다. 같은 질문에 대한 답이 두 곳에서 따로 만들어진다.

### 3.3 Blueprint 생성·변환

```js
// src/catalog/index.mjs
createBlueprint(templateId = 'dashboard-overview', themeId?: string, paletteId?: string,
                options: {themeVariant?: string, layout?: {[slot]: option}, typography?: string} = {}): Blueprint
// 템플릿에서 새 Blueprint를 만든다. 입력 문서를 받지 않는다. 알 수 없는 템플릿·테마·변형·서체는 Error(메시지만).
// 반환 전에 repairAxes를 통과한다.

repairAxes(b: Blueprint): Blueprint
// 페이지 유형·테마·축 금지가 거부하는 축 값을 각 금지의 fix로 고친다. **입력을 직접 바꾸고 같은 객체를 반환한다.**
// (x === repairAxes(x) 실측) 검증기는 보정하지 않는다. 최대 8회 반복. nav·mega·group 정리 포함.

migrateBlueprint(old: Blueprint): Blueprint     // 2.x는 catalogVersion만 바꾼다. 1.0은 migrateV1.
migrateV1(old): Blueprint
```

### 3.4 구성 변형 (variants)

```js
// src/catalog/variants.mjs
layoutSlots(tree, pageType, ctx = {templateId?, neutral?}): Array<{id, label, options: Array<{id, label, description, recommended: boolean, rules: Array<{id, claim, detail}>}>}>
// 실제로 선택지가 있는 슬롯만. 옵션은 지우지 않고 결과 계약을 어기면 recommended=false.

assessLayout(tree, choice = {}, pageType, ctx = {}): {recommended: boolean, findings: Array<{slot, option, rule, claim, detail}>}
applyLayout(tree, choice = {}, pageType): Tree
// 입력 tree는 복사한다. 알 수 없는 슬롯·옵션은 Error. 적용되지 않는 선택은 조용히 건너뛴다.
layoutSlotIds: string[]
```

### 3.5 레시피 (recipes)

```js
// src/recipes.mjs
selectRecipe({recipe: string, templateId?: string}): { recipeId, templateId, layout, view, satisfied, applied, avoided, unmet, measured, pageRules, trace }
recipePicks(): Pick[]                    // 레시피가 다루는 템플릿마다 하나 (15개)
recipePickOf(templateId): Pick | null
recipeOfTemplate(templateId): string | null
evaluateRecipe(recipeId, templateId, layout = {}, look = null): {failures, passes, pageRules}
recipeCheck(recipeId, ruleId, blueprint): string | null
recipeBlueprint(templateId, layout = {}, look = null): Blueprint
```

난수·시간·브라우저 없음. 같은 입력이면 같은 결과다 (코드 주석). 결과는 모듈 수준 `Map`에 캐시된다.

### 3.6 조합 (combos)

```js
// src/combos.mjs
enumerateCombos(): Combo[]               // 4,955개. 첫 호출 때 계산해 모듈 변수에 캐시
findCombo(id): Combo | null
comboBlueprint(combo, view = EMPTY_VIEW, notes = []): Blueprint
renderCombo(combo, view): {ok: true, html, blueprint, notes} | {ok: false, error, blueprint?, notes?}   // 던지지 않는다
filterCombos(options, list?): Combo[]
viewQuery(id, view): string ; viewFromQuery(URLSearchParams): View ; normalizeView(view): View
```

## 4. 브라우저 번들 가능 여부 (요약)

- **가능**: `src/`에서 2.4절 표의 `불가`·`부분` 모듈 5개(`workbench.mjs`, `workbench/catalog-view.mjs`, `workbench/viewport.mjs`의 DOM 부분, `combos/app.mjs`, `combos/render.mjs`)를 뺀 전부. 근거는 (a) Node 내장·`import.meta`·`process` 의존 0건, (b) 조립기·갤러리가 이미 브라우저에서 실행, (c) `scripts/bundle.mjs`가 `compiler.mjs`+`catalog.mjs`와 그 의존 전체를 의존성 없이 IIFE로 묶어 오프라인 갤러리를 만든다.
- **번들러 호환성은 미검증**. Next.js(webpack·Turbopack)로 `src/*.mjs`를 묶어 보지 않았다. 현재 모든 import가 확장자(`.mjs`)를 포함한 상대 경로여서 일반적인 ESM 해석에는 문제가 없을 것으로 보이지만 `확인 필요`다. 후속 트랙의 첫 작업으로 스파이크를 제안한다 (`03-interfaces.md` 3절).
- **크기와 속도 (한 대, Node 26.9.0, 1회 측정, 참고용)**: `compiler.mjs`+`catalog.mjs` 임포트 16ms, `saas-landing` 첫 컴파일 7.6ms, 이후 평균 1.5ms(20회), HTML 출력 96,683바이트, CSS 67,086바이트. 카탈로그 JSON 투영은 778,937바이트, Schema는 122,698바이트다. 카탈로그 전체가 임포트 때 메모리에 올라오므로 클라이언트 번들에 `catalog`를 통째로 넣으면 초기 JS 크기에 큰 영향을 준다. Server Components나 API 쪽에서 투영해 필요한 조각만 보내는 설계가 필요하다 (미측정: 번들 크기).
- **SSR·Edge 주의**: 모듈 수준 캐시(`recipes.mjs`의 `cache`, `combos.mjs`의 `cache`·`findCombo.index`)는 프로세스마다 한 번 만들어진다. 카탈로그 객체는 얼어 있으므로 응답에 싣기 전에 복사하거나 직렬화해야 하고, 얼린 객체를 수정하는 코드는 조용히 실패하거나(비엄격) 예외를 던진다(엄격 모드 ES 모듈).
- **Node 전용 도구가 Core 밖에서 하는 일**: SHA-256 manifest(`scripts/output.mjs`가 `node:crypto` 사용), 디스크 쓰기, `kit check`의 파일 집합 검사. REST·MCP가 같은 `integrity`를 내려면 해시 함수를 주입 가능한 형태로 분리해야 한다 (WebCrypto는 비동기).

## 5. CLI (`scripts/kit.mjs`)

`npm run kit -- <command>` 또는 `node scripts/kit.mjs <command>`. 오류는 stderr에 메시지를 쓰고 종료 코드 1이다. 검증 오류는 `path [code] message` 줄로 출력한다 (JSON 오류 형식이 아니다).

| 명령 | 동작 | 사용하는 Core |
|---|---|---|
| `catalog` | 수량·축·부품 이름 JSON 요약 | `themes`, `palettes`, `templateList`, `nodeTypes`, `nodeSpecs`, `pageTypes`, `axes` |
| `schema` | Blueprint JSON Schema 출력 | `blueprintSchema` |
| `templates` | 템플릿 85개 표 (id, 유형, 테마, 이름) | `templateList` |
| `themes` | 테마 54개와 추천 팔레트 | `themes` |
| `init <template> <file.json> [theme]` | 템플릿(+테마)에서 시작 Blueprint 생성. 파일이 있으면 실패(`wx`) | `createBlueprint` |
| `migrate <blueprint.json> <out.json>` | 1.x 또는 catalog 2.1-2.3 입력을 2.4로 변환하고 검증 | `migrateBlueprint`, `validateBlueprint` |
| `validate <file.json>` | 검증. 성공 `VALID <file>` | `validateBlueprint` |
| `build <file.json> --out <directory>` | 5개 관리 파일 생성 (`index.html`, `tokens.css`, `tokens.json`, `blueprint.json`, `manifest.json`). 관리되지 않는 디렉터리는 거부 | `compile` (`scripts/output.mjs` 경유) |
| `check <directory>` | 재컴파일해 관리 파일 전체 대조. 수정·추가·누락·symlink 거부 | `compile` (`scripts/output.mjs`) |

CLI가 없는 것: 편집 연산(테마·팔레트·노드 편집), 구성 변형 목록·적용, 레시피 선택, 의사결정 설명(`manifest.design`) 조회, 조합 조회. 이 기능들은 Core에 함수가 있어도 CLI에서 쓸 수 없다 (CLI는 `kit.mjs`가 `catalog.mjs`·`compiler.mjs`만 import한다).

그 밖의 `npm` 스크립트: `test`(`node --test`), `audit`, `docs`, `build`, `dev`(`scripts/serve.mjs`, 기본 포트 4173), `verify`, `test:browser`, `test:lab`, `test:lab-verify`.

## 6. 다른 트랙이 진행 중인 영역 (관찰 사실만)

`dsk-wt-next-core`(브랜치 `next/b-core-ops`)가 Core 무손실 편집 연산을 구현 중이다. 이 감사는 그 worktree를 **읽기(`git log`, `git diff`, `ls`, `grep`, 파일 읽기)로만** 봤고 수정하지 않았다. 두 번 관찰했고 상태가 달랐다.

| 관찰 시각 (2026-11-21) | 상태 |
|---|---|
| 약 10:55 | 커밋 없음. 작업 트리에 `src/catalog/index.mjs`, `src/catalog/variants.mjs` 수정과 새 디렉터리 `src/edit/` (`contracts.mjs`, `fingerprint.mjs`, `index.mjs`, `ops.mjs`) |
| 11:06 | 커밋 2개: `a8081ecf7 core: lossless atomic edit ops, non-silent repairAxes nav policies, checked hero variants`, `86ebd203b site: regenerate source mirror and gallery bundle for src/edit (example outputs unchanged)`. 19개 파일 변경(+2,550/-77). `docs/adr/0008-lossless-edit-ops.md`(상태 "채택, main 병합 전")와 `tests/edit-*.test.mjs` 5개가 추가됨 |

그 브랜치는 main에 병합되지 않았으므로 이 문서의 `src/` 설명은 **main(`b303f17c1`) 기준**이다. 병합 후 달라지는 것으로 확인된 점은 다음이다.

- `src/catalog/index.mjs`가 `applyLayoutChecked`를 import·export하고 `repairAxes`, `composeBlueprint`, `navConflicts`가 바뀌거나 추가된다. 3.3절의 `repairAxes` 설명(입력을 바꾸고 같은 객체를 반환, 내비를 조용히 자름)은 main 기준이다. ADR 0008은 기본 정책을 `'drop'`으로 유지해 옛 호출자의 동작을 그대로 두고, 편집 경로만 `nav:'fit'`을 쓴다고 적었다.
- `src/edit/index.mjs`가 내보내는 이름: `OPS`, `opNames`, `applyOp`, `setTheme`, `setPalette`, `setAppearance`, `setLayoutVariant`, `updateNode`, `insertNode`, `removeNode`, `moveNode`, `replaceTemplate`, `importBlueprint`, `resetDocument`, `parsePath`, `pathString`, `diffDocs`, `contentEntries`, `contentFingerprint`, `contentDiff`, `keepsContent`, `sameContent`, `PRESENTATION_FIELDS`, `checkDocument`, `applySequence`, `checkSequence`, `GRADES`.
- 그 브랜치의 커밋된 `site/examples/`(425), `site/examples/themes/`(270), `site/v1/`(2)의 트리 해시를 같은 방식으로 계산하니 `00-baseline.md` 4.2절 값과 같았다(`eb438ecf14a38c35`, `8b73787be3b4a7ff`, `0af400ca2df23e24`). 커밋 메시지의 "example outputs unchanged"와 일치한다. 이 계산은 해당 worktree의 파일을 읽기만 했고 그쪽 테스트는 실행하지 않았다 (`미실행: 다른 트랙의 verify`).

설계 의견은 적지 않는다. 접점은 `03-interfaces.md` 2절에 있다.
