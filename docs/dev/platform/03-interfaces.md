# 03 인터페이스와 담당 경로 계약 (후속 트랙용 초안)

작성 2026-11-21, 기준 `main` HEAD `b303f17c1`. 이 문서는 정적 HTML 사이트를 Next.js 플랫폼(Explore, Components, Studio, Docs, Integrations, REST API v1, MCP)으로 바꾸는 후속 트랙들이 같은 약속을 보게 하려는 계약 초안이다.

문장마다 지위를 구분한다.

| 표시 | 뜻 |
|---|---|
| **확정** | 이 트랙(A)이 정한 기준이고 근거가 코드나 측정에 있다. 바꾸려면 근거를 대야 한다 |
| **제안** | 합리적이라고 보지만 해당 트랙 담당자가 확인·수정해야 한다 |
| **관찰** | 다른 트랙의 현재 상태를 읽기만 해서 적었다. 그 트랙이 바꿀 수 있다 |
| **확인 필요** | 이 세션에서 검증하지 못했다 |

철학은 이미 정해져 있다. 디자인 규약을 코드·스키마·제약으로 강제하고, Core(`src/`)는 Next.js나 React를 import하지 않으며, 브라우저·CLI·REST·MCP가 같은 Core 검증·컴파일 로직을 쓴다. 이 문서의 모든 항목은 그 세 줄을 지키는 쪽으로 쓴다.

## 1. Core 서비스 함수 계층

### 1.1 왜 필요한가 (**확정**, 근거는 `02-core-map.md`)

- 카탈로그 조회 함수가 없다. `site/v1/catalog.json`의 투영은 `scripts/build.mjs`에, `kit catalog`는 `scripts/kit.mjs`에 따로 있다 (같은 질문, 두 구현).
- `compile`은 검증 실패에만 구조화된 오류(`error.errors`)를 던지고, 대비 게이트 실패와 내부 예외는 메시지뿐인 `Error`다.
- 검증 오류는 `{path, code, message}`로 `hint`가 없다. `AXIS_BAN`의 대안(`axisBans[].fix`)은 메시지 문장 안에만 있다 (`(사용 가능한 대안: elevation=soft)`).
- 축 값이 지금 선택 가능한지 판정하는 `optionState`·`chooseAxis`가 `src/workbench/axes.mjs`(UI 폴더)에 있다. REST·MCP도 같은 질문을 받는다.
- `manifest.design.decisions`는 있지만 사람이나 에이전트가 읽을 설명 형태(`explainDecisions`)가 없다.

### 1.2 위치와 규칙 (**제안**)

- 위치: `src/service/` (새 디렉터리, `index.mjs`가 유일한 공개 진입점). 담당은 4절의 트랙 C다.
- 순수 ES 모듈. `node:*`, DOM, React, Next.js, `import.meta`를 쓰지 않는다. 이 성질은 테스트로 강제한다 (3.4절).
- 입력을 바꾸지 않는다. 반환값은 JSON으로 직렬화할 수 있고 얼리지 않은 새 객체다 (카탈로그 객체는 `freeze`되어 있어 그대로 돌려주면 호출자가 수정하다 예외를 만난다, `catalog/index.mjs:47-48`).
- 같은 입력이면 같은 출력이다. 시간·난수·환경에 의존하지 않는다.
- 모든 결과에 `catalogVersion`을 싣는다 (`CATALOG_VERSION`, 현재 `2.4.0`).
- 기존 `validateBlueprint`(`src/validate.mjs`), `compile`(`src/compiler.mjs`)과 CLI·테스트는 **그대로 둔다.** 서비스 함수는 이를 감싸고 모양만 정리한다. 이름이 같은 `validateBlueprint`의 결과 모양이 다르므로 서비스 쪽은 `import {validateBlueprint} from '.../service'`처럼 경로로 구분하고, 두 함수를 한 파일에서 섞어 import하지 않는다.

### 1.3 공통 타입과 오류 형식 (**확정**: 오류 4필드 / **제안**: 나머지)

```ts
type Diagnostic = {
  code: string      // UPPER_SNAKE. 등록된 코드만 쓴다 (1.5절)
  path: string      // `$`로 시작. 문서 안 위치 `$.tree.children[1].columns`, 요청 인자는 `$args.template`
  message: string   // 무엇이 틀렸는가. 한국어 한 문장의 사실
  hint: string      // 어떻게 고치는가. 한국어 한 문장. 비워 두지 않는다
}
// 선택 확장 필드(있어도 되고 없어도 된다): severity: 'error'|'warning'|'info', rule: string (규칙 ID, 예 'X05'),
//   fix: object (기계가 읽는 대안, 예 {elevation: 'soft'})

type Result<T> =
  | {ok: true,  value: T, warnings: Diagnostic[], catalogVersion: string}
  | {ok: false, errors: Diagnostic[], warnings: Diagnostic[], catalogVersion: string}
```

규칙은 다음과 같다.

1. `code`, `path`, `message`, `hint` 네 필드는 모두 문자열이고 항상 있다. `hint`가 비는 오류는 계약 위반이다. 해결 방법을 모를 때도 `DEFAULT_HINT` 같은 안내(어디를 보면 되는지)를 채운다.
2. `path`는 검증기가 이미 쓰는 표기(`$.tree.children[9].variant`)를 그대로 쓴다. 문서 밖(요청 인자, 알 수 없는 id)은 `$args.<이름>`이다.
3. 검증기의 기존 코드(`UNKNOWN_KEY`, `ENUM`, `AXIS_BAN` 등)는 이름을 바꾸지 않고 `hint`만 보탠다. 코드 이름을 바꾸면 규칙(`rules[].codes`), 문서, 테스트와 어긋난다.
4. `AXIS_BAN`과 `THEME_FORBID`는 대안을 `fix`로 구조화한다. 지금은 메시지 문장에서만 얻을 수 있고 문장 파싱은 깨지기 쉽다 (**제안**).
5. 던지기보다 `ok: false`를 돌려준다. 예상 못한 예외는 `INTERNAL`로 감싸고 스택은 응답에 싣지 않는다.

**기존 코드 현황 (측정)**: 검증기·컴파일러 소스가 쓰는 코드는 59개이고 `rules[].codes`에 등록된 것은 52개다. 등록되지 않은 9개는 `JSON, SIZE, CONST, OBJECT, REQUIRED, ARRAY, PATTERN, NODE_TYPE, ROOT`이고, 등록되어 있지만 소스에 문자열로 없는 2개는 `audit`, `check`(도구 이름)다. 서비스 계층의 코드 목록은 이 불일치를 해소한 하나의 표여야 한다.

**서비스 수준 신규 코드 (제안)**: `UNKNOWN_KIND`, `UNKNOWN_TEMPLATE`, `UNKNOWN_THEME`, `UNKNOWN_PALETTE`, `UNKNOWN_COMPONENT`, `UNKNOWN_AXIS`, `BAD_REQUEST`(인자 형식), `CONTRAST_GATE`(`compile`의 `Contrast gate failed`를 구조화), `UNSUPPORTED_VERSION`, `INTERNAL`.

**전송별 매핑 (제안)**

| 상황 | REST | MCP |
|---|---|---|
| 요청 형식·인자 오류 (`BAD_REQUEST`, `UNKNOWN_*`) | 400 / 알 수 없는 id는 404 | tool 결과 `isError: true`, 본문은 같은 `errors` |
| Blueprint가 규칙 위반 (`ok: false`, 검증기 코드) | 422, 본문 `{ok: false, errors, warnings, catalogVersion}` | `isError: true`, 같은 본문 |
| `INTERNAL` | 500, 본문에 `errors: [{code: 'INTERNAL', ...}]`만 | 같음 |
| 성공 (경고 포함) | 200 | 일반 결과 |

### 1.4 함수 시그니처 (**제안**, 6개는 작업 지시서가 이름을 정했다)

타입은 TypeScript 표기이지만 구현은 JS(JSDoc `@typedef` 병기)다.

```ts
// 1) 카탈로그 목록. 요약만 돌려주고 전체 객체는 getComponentSpec 등으로 받는다.
listCatalog(q: {
  kind: 'templates'|'themes'|'palettes'|'components'|'pageTypes'|'axes'|'concepts'|'recipes'|'icons'|'rules'|'axisBans'|'layoutSlots'|'combos',
  filter?: Record<string, string>,   // 예: {pageType:'landing'}, {category:'work'}, {family:'blue'}, {template:'saas-landing'}(layoutSlots)
  query?: string,                    // 이름·id 부분 일치(공백 구분 AND). 현재 갤러리 filterCombos와 같은 규칙
  limit?: number,                    // 1..200, 기본 50
  cursor?: string                    // 이전 응답의 nextCursor
}): Result<{items: object[], total: number, nextCursor: string|null}>
// 정렬은 카탈로그 선언 순서로 고정한다. 템플릿 요약: {id, label, pageType, theme, layoutSlotCount, recipe}.

catalogSnapshot(): object
// `site/v1/catalog.json`과 바이트가 같은 JSON으로 직렬화되는 레거시 투영. scripts/build.mjs의 투영을 옮긴 것이다.
// 호환 게이트(00-baseline.md 4.2절의 v1/ 트리 해시)가 이 함수를 통과해야 한다.

assembleBlueprint(req: {profile: string, intent?: object, content?: object}): Result<{blueprint: object, decisions: object[], materials: object}>
// 카탈로그 2.6.0 디자인 프로파일로 Blueprint를 조립한다(docs/materials/profiles.md). 지원하지 않는 요구는 다른 값으로 바꾸지 않고 ASSEMBLE_* 오류로 돌려준다.

// 2) 스키마
getSchema(q: {target: 'blueprint'|'component'|'chrome'|'diagnostic'|'edit-ops', type?: string}): Result<object /* JSON Schema 2020-12 */>
// blueprint = blueprintSchema(), component = $defs[type]. 교차 필드 규칙은 스키마가 아니라 런타임 검증기가 판정한다
// (docs/architecture.md). 응답에 `x-runtimeRules: string[]`(규칙 ID와 코드)를 붙여 스키마만으로 충분하다고 오해하지 않게 한다.

// 3) 부품 명세
getComponentSpec(q: {type: string}): Result<{
  type, label, group, fields /* 스키마 */, optional: string[],
  children: {allowed: string[], min: number, max: number} | null,
  example: object | null,
  pageTypes: {requiredBy: string[], forbiddenIn: string[]},   // pageTypes[].require/forbid에서 파생
  rules: string[]                                              // 이 부품에 걸리는 규칙 ID
}>

// 4) 검증
validateBlueprint(blueprint: unknown, opts?: {catalogVersion?: string}): Result<{valid: true}>
// 실패 시 ok:false, errors = validateBlueprint(src/validate.mjs).errors에 hint(와 가능하면 fix)를 붙인 것. 최대 80개(검증기 한도).

// 5) 컴파일
compileBlueprint(blueprint: unknown, opts?: {include?: Array<'html'|'css'|'tokens'|'manifest'>}): Result<{html?, css?, tokens?, manifest?}>
// compile()을 감싼다. 검증 실패는 errors로, 대비 게이트 실패는 CONTRAST_GATE로, 그 밖은 INTERNAL로 돌려준다.
// manifest.integrity(SHA-256)는 포함하지 않는다. 해시 함수 주입이 필요한 일이라 열린 결정 D6이다.

// 6) 의사결정 설명
explainDecisions(subject: {blueprint: object} | {manifest: object}, opts?: {path?: string, rule?: string, level?: 'summary'|'full'}): Result<{
  decisions: Array<{path: string, nodeType: string, rules: string[], winner: object, facts: object, why: string, source: string}>,
  page: {facts: object, decisions: object[]} | null,
  axes: Array<{axis: string, value: string, bans: string[], themeForbids: string[]}>,
  contrast: {minimumBody: number, pairs: number, tightest: object}
}>
// 데이터 원천: manifest.design.decisions[], manifest.design.page, compositionRules, pageRules, rules[], axisBans[], manifest.contrast, paletteProvenance.
// `why`·`source`는 규칙 정의에서 가져온다. 규칙에 사람이 읽을 문장이 없는 경우는 비워 두지 않고 id와 intent를 쓴다.
```

**추가 후보 (이번 요구 6개 밖, 제안)**: `listAxisOptions(blueprint, axis)`(= `optionState`를 서비스로 승격: `{value, blocked, reason, conflict, fix}[]`), `getRecipePick(templateId)`, `getLayoutSlots(source)`, `getCombo(id, view)`. Studio가 필요로 할 때 담당 트랙(C)이 요청받아 추가한다.

### 1.5 코드와 hint 표의 단일 출처 (**열린 결정 D1**)

관찰: B 트랙의 `src/edit/ops.mjs`가 검증기 코드별 `HINTS` 표와 `DEFAULT_HINT`, 그리고 `withHint`를 이미 비공개로 갖고 있다 (`{code, path, message, hint}` 형식 그대로). 서비스 계층이 같은 표를 따로 만들면 코드·문구가 갈라진다. 제안은 표를 한 모듈로 올려 두 계층이 import하는 것이다. 어느 모듈이 소유하는지는 B와 C가 정한다 (이 감사는 B의 파일을 수정할 수 없다).

### 1.6 완료 기준 (제안, 트랙 C가 받아들이면 확정)

- `tests/service-*.test.mjs`가 여섯 함수의 성공·실패 사례와 `Diagnostic` 필드 완전성(모든 오류에 비지 않은 `hint`)을 검사한다.
- `catalogSnapshot()`의 직렬화가 현재 `site/v1/catalog.json`과 바이트가 같다 (해시 `910e5b7b3f8edea5…`).
- `compileBlueprint(createBlueprint(id)).value.html`이 `site/examples/<id>/index.html`과 바이트가 같다 (템플릿 85개).
- 경계 테스트(3.4절)가 통과한다.

## 2. 편집 연산 API 형태

이 절은 **관찰 사실과 접점만** 적는다. 연산의 설계와 구현은 B 트랙(`next/b-core-ops`)의 일이고 이 감사는 구현하지 않는다. 관찰은 2026-11-21 11:06의 읽기 전용 확인이다 (커밋 `a8081ecf7`, `86ebd203b`, `docs/adr/0008-lossless-edit-ops.md`, 상태 "채택, main 병합 전"). B가 바꿀 수 있다.

### 2.1 관찰: B가 정한 것

- 모든 편집은 `(doc, args)` 순수 함수이고 결과는 한 가지 모양이다 (ADR 0008 1절).

```js
{ok: boolean, doc, changes: [{op, path, before?, after?, from?, to?}],
 errors: [{code, path, message, hint}], warnings: [{code, path, message, ...}],
 content: {before, after, preserved} | null}
```

- `doc`은 Blueprint 그 자체다 (`doc.theme`, `doc.palette` 등을 직접 읽는다). 출처 템플릿 같은 별도 필드는 없다.
- 입력 `doc`은 바뀌지 않는다. 성공하면 깊게 동결된 새 객체, 실패하거나 변화가 없으면 입력 그대로다. `changes`가 비지 않은 결과만 스택에 쌓으면 Undo/Redo가 된다.
- 검증기를 통과하지 못하면 어떤 변경도 없이 `errors`만 돌려준다 (원자적 거부). 오류는 `{code, path, message, hint}`이고 검증기 코드를 그대로 통과시키며 `hint`를 보탠다.
- 테마·팔레트·모드·구성 변형은 `name`·`chrome`·`tree`의 글·데이터를 건드리지 못한다. 지문(`contentFingerprint`)이 어긋나면 `CONTENT_LOSS`로 거부한다.
- 연산 11개: `setTheme`, `setPalette`, `setAppearance`, `setLayoutVariant`, `updateNode`, `insertNode`, `removeNode`, `moveNode`, `replaceTemplate`, `importBlueprint`, `resetDocument`. 진입점은 `applyOp(doc, name, args)`이고 알 수 없는 연산은 `UNKNOWN_OP`이다 (REST·MCP용이라고 ADR이 명시).
- 경로 표기는 인덱스 배열(`[1,0]`, Studio 선택 경로와 같은 표기)과 `"$.tree.children[1]"` 문자열을 둘 다 받는다.
- `src/edit/index.mjs`는 React·Next.js·DOM·Node 전용 모듈을 쓰지 않고, `tests/edit-portability.test.mjs`가 추이적 import에 `node:`·패키지·웹 파일이 없음을 검사한다고 ADR이 적었다 (이 감사는 그 테스트를 실행하지 않았다).
- 기본 `repairAxes(b)`는 옛 동작(내비 조용히 절단)을 유지하고 편집 경로만 `nav:'fit'`을 쓴다. 남은 위험으로 옛 호출자(`src/workbench/axes.mjs`, `auto-fix` 버튼)가 여전히 조용히 자른다고 ADR이 적었다.

### 2.2 접점: 이 감사의 결함이 B 연산과 어떻게 대응하는가

| 감사 결함 | 요구되는 성질 | B의 대응 (관찰) |
|---|---|---|
| WB-02 테마 변경이 내용 유실 | 테마 변경은 `tree`·`chrome`·`name`을 건드리지 않는다 | `setTheme` (ADR: 콘텐츠·내비 그대로, `CONTENT_LOSS` 방어선) |
| WB-03 구성 변경이 템플릿 children 재적용 | 현재 트리에 슬롯 변환만 적용 | `setLayoutVariant` ("현재 트리에 적용", 전부 아니면 전무) |
| WB-04 선수정 후 commit 실패 | 성공했을 때만 새 문서로 교체 | 연산이 새 `doc`을 돌려주고 호출자가 교체 (원자적 거부) |
| WB-05 가져오기 후 상태 불일치 | 가져온 문서에는 출처 템플릿이 없음을 표현 | `importBlueprint` (doc에 출처 필드가 없다. 아래 열린 결정 D2) |
| WB-06 다크 보기가 문서를 바꿈 | 보기용 모드는 문서 연산이 아니다 | `setAppearance`는 문서의 `mode`를 바꾸는 연산이다. 보기 전용 전환은 연산이 아니라 UI 상태여야 한다 (**제안**, Studio 트랙 F) |
| WB-08 삭제 실패 시 선택 이동 | 선택 상태는 결과 `ok`에 따라 갱신 | `removeNode`가 `ok:false`를 돌려주므로 Studio가 결과를 보고 선택을 갱신한다 |

### 2.3 Studio·REST·MCP가 같은 연산을 쓰는 전송 형태 (**제안**, B 확인 필요)

연산 호출 모양을 바꾸지 않고 전송에 싣기만 한다.

```
POST /api/v1/edit
{ "document": <Blueprint> | null, "ops": [ {"op": "setTheme", "args": {...}}, ... ] }
→ 200 | 422
{ "ok": boolean, "document": <Blueprint>, "changes": [...], "errors": [...], "warnings": [...], "content": ..., "catalogVersion": "2.4.0" }
```

- `ops` 배열은 B의 `applySequence`/`checkSequence`가 하는 일과 같다. 하나가 실패하면 전체가 실패하고 `document`는 입력 그대로다.
- MCP 도구는 연산 하나가 도구 하나(`edit_setTheme` 등)이거나 `edit`(op 이름 인자) 하나다. 도구 목록은 `opNames`에서 생성해 연산 추가가 자동 반영되게 한다 (**제안**).
- 상태를 서버에 저장하지 않는다. 문서는 요청마다 들어온다 (서버 세션 없음, 이 저장소의 "서버 API 없음" 원칙을 확장하지 않는다).

### 2.4 열린 결정 (B 또는 F 확인 필요)

- **D2**: Studio가 지금 `sel`로 들고 있는 `{templateId, layout, themeVariant, paletteChosen}`을 어디에 둘 것인가. B의 `doc`은 Blueprint뿐이다. 가져온 문서는 출처가 없다. Studio 상태(`origin`)로 문서 밖에 두고, 없을 때(`null`) 템플릿·구성 변형·레시피 UI를 끄는 안을 **제안**한다.
- **D3**: 옛 `repairAxes(b)` 호출자(`src/workbench/axes.mjs`의 `chooseAxis`, `auto-fix`)는 Studio가 새로 쓰이면 쓰이지 않게 된다. 옛 조립기는 호환 기간에 그대로 남는다 (4절 금지 경로).

## 3. Next.js 앱 위치와 Core import 방식

### 3.1 앱 위치: `apps/web` (**제안**, 권장)

| 대안 | 평가 |
|---|---|
| 저장소 루트에 Next 앱 | 비권장. 루트 `package.json`은 지금 런타임 의존성이 없고 `node --test`, `site/` 생성, `verify`가 걸려 있다. Next·React를 루트에 넣으면 Core "무의존" 성질이 흐려지고 CI의 `git diff --exit-code -- site docs`와 섞인다 |
| **`apps/web` + npm workspaces** | **권장.** 루트는 Core+CLI+문서 패키지로 남는다. 루트 `package.json`에 `"workspaces": ["apps/*"]`만 더한다 (**확인 필요**: 루트가 워크스페이스 멤버가 아니어도 `apps/web`이 루트를 의존성으로 링크할 수 있는지는 3.2절 스파이크에서 확인) |
| `packages/core`로 Core 이동 | 지금은 보류. `src/` 경로가 `scripts/bundle.mjs`(`srcRoot`), `scripts/build.mjs`(`cp src`), 고정 해시 테스트 4종, 문서 생성, CI에 박혀 있고 다른 트랙(B)이 `src/`를 수정 중이다. 병합 충돌과 호환 해시 이동 위험이 크다. 트랙들이 병합된 뒤 별도 결정으로 다룬다 |

`apps/mcp`는 MCP 서버를 Next 라우트가 아닌 별도 프로세스로 둘 때만 만든다 (열린 결정 D5).

### 3.2 Core import 방식 (**제안**, 스파이크로 확정)

선호 순서:

1. **패키지 `exports` 부분 공개**: 루트 `package.json`에 `"exports": {"./service": "./src/service/index.mjs", "./edit": "./src/edit/index.mjs"}`를 두고 `apps/web`이 루트 패키지(`@winterholic/design-system-static-kit`)를 의존성으로 링크해 `import {compileBlueprint} from '@winterholic/design-system-static-kit/service'`로 쓴다. `next.config`의 `transpilePackages`로 변환한다. 공개된 두 진입점 외의 `src/` 내부는 import할 수 없어 경계가 기계적으로 강제된다. (`exports`, `transpilePackages`의 정확한 동작은 이 세션에서 확인하지 않았다. **확인 필요**)
2. **상대 경로 import + `experimental.externalDir`**: 가장 단순하지만 `apps/web` 밖의 소스를 직접 가리켜 경계가 느슨하다. 1이 막히면 대안이다 (**확인 필요**).
3. 복사·동기화(`site/src` 방식): 비권장. 호환 해시를 두 곳에서 지켜야 한다.

**스파이크 수용 기준** (트랙 D가 첫 작업으로 수행, 통과 전에는 구조를 확정하지 않는다):

| ID | 기준 |
|---|---|
| S1 | `next build`가 `apps/web`에서 서비스 계층을 import하는 서버 컴포넌트와 클라이언트 컴포넌트를 모두 빌드한다 |
| S2 | 클라이언트 번들에서 `compileBlueprint(createBlueprint('saas-landing'))`가 Node 폴리필 없이 동작한다 |
| S3 | 서버 라우트 번들에 UI 모듈(`workbench*`, `combos/app.mjs`)이 들어가지 않는다 |
| S4 | S2·서버에서 만든 HTML이 `site/examples/saas-landing/index.html`과 바이트가 같다 |
| S5 | 카탈로그 전체(778,937바이트 투영)가 초기 클라이언트 JS에 들어가지 않는 구조다 (측정: 번들 크기, 현재 미측정) |

### 3.3 Core가 지켜야 할 경계 (**확정** 항목 + **제안** 시험)

- Core는 `src/`에서 UI 모듈을 뺀 부분이다. UI 모듈은 `src/workbench.mjs`, `src/workbench/catalog-view.mjs`, `src/workbench/viewport.mjs`의 DOM 부분, `src/combos/app.mjs`, `src/combos/render.mjs`다 (`02-core-map.md` 2.4절).
- Core의 금지 import: `react`, `react-dom`, `next`, `node:*`, 모든 패키지 이름 import (현재 0건으로 **확정**, 측정은 `02-core-map.md` 1절).
- Core의 금지 전역: `document`, `window`, `localStorage`, `location`, `history`, `process`, `Buffer`, `import.meta`. `render/index.mjs`의 `formRuntime` 문자열 안의 `document.*`는 생성 페이지용 코드라서 예외다.
- **제안**: `tests/core-boundary.test.mjs`가 위 UI 모듈 목록을 제외한 `src/**/*.mjs`를 읽어 금지 import·전역을 검사한다 (B의 `tests/edit-portability.test.mjs`가 `src/edit`에 대해 같은 방식으로 한다고 ADR이 적었으므로 같은 기법을 `src/` 전체로 넓히는 것이다). 기존 테스트는 수정하지 않는다. 신규 파일만 추가한다.
- `apps/web`의 코드는 `src/`의 내부 모듈을 직접 import하지 않고 공개 진입점(`service`, `edit`)만 쓴다. Explore·Studio가 `createBlueprint`를 직접 부르는 일을 막는다 (WB-02의 근원).

## 4. 트랙별 담당 경로와 금지 경로

트랙 A와 B는 현재 진행 중이거나 끝난 작업이고, C 이후는 **제안**이다 (트랙 이름·분할은 오케스트레이터가 확정). 경로는 쓰기 허용 범위다. 읽기는 모두 허용한다.

| 트랙 | 브랜치 | 쓰기 허용 | 금지 |
|---|---|---|---|
| **A 감사** (이 문서) | `next/a-audit` | `docs/dev/platform/**` | 그 밖 전부 (`src/`, 기존 웹, 기존 테스트 포함) |
| **B Core 편집 연산** (진행 중, **관찰**) | `next/b-core-ops` | `src/edit/**`, `src/catalog/index.mjs`, `src/catalog/variants.mjs`, `tests/edit-*.test.mjs`, `docs/adr/0008-*.md` (관찰한 변경 범위) | `apps/**`, `scripts/**`, 기존 웹 파일. B의 커밋이 `site/**` 재생성을 포함한 것은 `verify`의 일부(생성물)이므로 예외 |
| **C Core 서비스 계층** (제안) | `next/c-service` | `src/service/**`, `tests/service-*.test.mjs`, `tests/core-boundary.test.mjs`, `docs/adr/0009-*.md`, 루트 `package.json`의 `exports` | `src/edit/**`·`src/catalog/**` 수정 (필요하면 B·거버넌스에 요청), `apps/**` |
| **D 웹 뼈대·배포·호환** (제안) | `next/d-web-shell` | `apps/web/package.json`, `apps/web/next.config.*`, `apps/web/app/layout.*`, `apps/web/app/page.*`, 리다이렉트·라우팅 규칙, `apps/web/lib/shared/**`, 루트 `package.json`의 `workspaces`, `.github/workflows/**`의 웹 job, 배포 설정 | `src/**`, 다른 트랙의 `apps/web/app/<기능>/**` |
| **E Explore + Components** (제안) | `next/e-explore` | `apps/web/app/explore/**`, `apps/web/app/components/**`, `apps/web/features/explore/**`, `apps/web/features/components/**`, 신규 e2e | `src/**`, Blueprint를 직접 만들거나 고치는 코드 (서비스·연산만 호출) |
| **F Studio** (제안) | `next/f-studio` | `apps/web/app/studio/**`, `apps/web/features/studio/**` (문서 상태, Undo/Redo, 미리보기, 보기 전용 모드), 신규 e2e | `src/**`, `createBlueprint` 직접 호출 |
| **G Docs** (제안) | `next/g-docs` | `apps/web/app/docs/**`, `apps/web/content/**` | `docs/*.md` 원본과 생성 HTML(`docs/*.html`, `scripts/docs.mjs` 소관), `src/**` |
| **H REST API v1 + MCP** (제안) | `next/h-api` | `apps/web/app/api/**`, `apps/mcp/**`(있다면), OpenAPI 산출 스크립트 | `src/**` (서비스·연산의 얇은 어댑터만), `apps/web/app/<화면>/**` |
| **I Integrations** (제안) | `next/i-integrations` | `apps/web/app/integrations/**`, 연동 안내 콘텐츠 | `src/**`, `apps/web/app/api/**` |

**모든 트랙에 공통인 금지 경로 (**확정**)**

| 경로 | 이유 |
|---|---|
| `site/**` | 생성물이고 `verify`가 재생성한다. 손으로 고치지 않는다 (`AGENTS.md`). 각 트랙은 `npm run verify`가 만든 변경만 커밋한다 |
| `docs/*.html`, `docs/evidence/**`, `src/combo-grades.mjs`, `src/catalog/variant-effects.mjs` | 생성 파일 (파일 머리 주석이 손수정 금지를 명시) |
| `tests/**`, `e2e/**`의 **기존 파일** | 수정·건너뛰기 금지. 새 파일만 추가한다. 기존 테스트가 실패하면 실패 그대로 기록한다 |
| 레거시 정적 앱 (`index.html`, `combos/**`, `src/workbench*`, `src/combos/app.mjs`, `src/combos/render.mjs`, `scripts/gallery.mjs`) | 호환 기간에 해시 게이트와 비교 기준으로 쓰인다 (5절). 결함이 발견돼도(01-ux-audit.md) 새 앱에서 고치고 옛 앱은 건드리지 않는다. 예외는 트랙 D가 합의한 보안·호환 수정뿐이다 |
| 다른 `dsk-wt-*` worktree | 다른 작업자의 작업 공간이다 |

**직렬화가 필요한 공유 파일 (조율 대상)**: `package.json`, `package-lock.json`, `.github/workflows/verify.yml`, `playwright.config.mjs`, `src/catalog/index.mjs`, `README.md`, `AGENTS.md`. 한 번에 한 트랙만 수정한다. 병합 순서 **제안**: B → C → D → (E, F, G, H 병렬) → I. 같은 파일을 두 트랙이 건드려야 하면 먼저 병합되는 쪽이 소유하고 나중 쪽이 rebase한다.

**CI (**제안**)**: 기존 `verify` job은 그대로 둔다 (레거시 정적 사이트와 Core의 통과 기준). 웹용 job은 별도 이름으로 추가하고 `apps/web/**` 변경에만 돌게 한다. 두 job이 모두 통과해야 병합한다.

## 5. 기존 URL 호환 방침

### 5.1 원칙

1. **데이터와 결정론적 산출물은 URL과 바이트를 유지한다.** `/v1/catalog.json`, `/v1/blueprint.schema.json`, `/examples/**`는 소비자가 있을 수 있고 해시로 검증된다 (`00-baseline.md` 4.2절). 카탈로그 버전 개정이 없는 한 바이트가 같아야 한다.
2. **사람이 여는 화면 URL은 리다이렉트로 잇는다.** 쿼리 파라미터를 그대로 보존한다.
3. **동적 API는 새 이름 공간에 둔다.** REST는 `/api/v1/*`. 정적 스냅샷 `/v1/*.json`과 겹치지 않는다. 나중에 `/v1/catalog.json`을 `/api/v1/catalog`로 잇는 것은 바이트와 모양이 보존될 때만이다.
4. **옛 앱은 호환 기간 동안 살아 있다.** 새 앱이 같은 경로를 대체하기 전에 지우지 않는다 (스트랭글러). 전환은 운영 별칭을 새 배포로 옮기는 한 번의 결정이다.

### 5.2 URL별 방침 (**제안**, 트랙 D가 확정)

| 기존 URL | 방침 | 새 위치와 규칙 |
|---|---|---|
| `/` (조립기) | 대체 | 새 앱의 `/studio`. `/`는 플랫폼 첫 화면이 된다. `/#catalog`는 해시가 서버에 전달되지 않으므로 `/`의 클라이언트 코드가 `#catalog`를 읽어 `/explore`로 `router.replace`한다 (WB-07 해소) |
| `/combos`, `/combos/`, `/combos/index.html` + 쿼리 | 임시 307 리다이렉트 | `/dev/qa/combos?<같은 쿼리>`로 한 번 이동한다. 파라미터 `c, concept, look, theme, tv, pal, type, mode, q, pt, t, sl, sort, seed, same, flagged, tall, exp, rec, ps, p`를 모두 보존한다 (`00-baseline.md` 6.1절). `/explore/combos`도 같은 내부 QA 경로로 쿼리를 보존해 임시 307 리다이렉트한다 |
| `/combos/render.html?c=...` | 유지 (같은 경로의 라우트 핸들러) | 래퍼 없는 전체 화면 HTML을 반환한다. 쿼리 `c, theme, tv, pal, mode, concept, look, type` 계약 유지. 새 창 열기·공유 링크가 쓰는 경로다. 현재는 클라이언트가 `document.write`한다. 새 구현은 서버가 `renderCombo`로 만든 HTML을 반환해도 된다. 검증: 샘플 조합 id 20개에서 옛 `renderCombo` 결과와 바이트 비교 |
| `/gallery/index.html` | 유지 (정적 산출물) | 컴파일러를 내장한 오프라인 단일 파일은 "내려받아 쓰는 도구"라서 Next 앱으로 대체하지 않는다. Explore에서 링크한다. 빌드가 계속 생성한다 |
| `/v1/catalog.json`, `/v1/blueprint.schema.json` | 유지 (정적, 바이트 동일) | `catalogSnapshot()`·`blueprintSchema()` 결과를 정적 파일로 낸다. 해시 게이트 대상 |
| `/examples/<templateId>/**` (425), `/examples/themes/<themeId>/**` (270) | 유지 (정적, 바이트 동일) | Next `public/`로 복사하거나 빌드 단계에서 생성. 해시 게이트 대상 (`eb438ecf14a38c35`, `8b73787be3b4a7ff`) |
| `/docs/*.html` (6개) | 유지 후 점진 대체 | Docs 트랙이 같은 내용의 `/docs/<slug>`를 만들면 `.html` → 새 경로로 301. 그 전에는 정적 유지 |
| `/test-lab/**` (2,538개) | **결정 필요** (D4) | 제품 URL이 아니라 시험 증거다. 배포 크기와 빌드 시간을 키운다. 옵션 (a) 그대로 정적 복사 (b) 별도 정적 호스트로 분리 (c) 호환 기간 후 제거. 이 감사는 선택하지 않는다 |
| `/src/**/*.mjs`, `*.css` | 지원 약속 없음 | 현재 운영 사이트가 소스를 그대로 공개한다. 외부가 import하는지는 알 수 없다 (**확인 필요**). 옛 앱 제거 때 공지하고 함께 내린다 |
| `/.nojekyll` | 폐기 가능 | GitHub Pages가 꺼져 있다 (`00-baseline.md` 5절) |

`/studio`의 시작 상태·화면 상태 쿼리, 저장 복원, 편집 상태 및 Studio 전용 검증 연결은 [05-studio-contract.md](./05-studio-contract.md)를 따른다. Explore가 만든 시작 링크는 그 문서의 `template`, `theme`, `variant`, `palette`, `mode`, `layout` 키를 사용한다.

### 5.3 브라우저 저장소

| 키 | 방침 |
|---|---|
| `winterholic-static-kit.combo-flags.v1` | 그대로 읽고 쓴다. 같은 키·같은 모양을 유지해야 사용자가 쌓은 "이상함" 표시가 이어진다 |
| `winterholic-static-kit.blueprint.v3` (`{blueprint, sel}`) | Studio가 첫 로드 때 한 번 읽어 `blueprint`만 `importBlueprint`로 들여온다. `sel`은 가져온 문서의 출처가 아니므로 무시한다 (WB-05의 이유). 이후 새 키로 저장하고 옛 키는 지우지 않는다 (롤백 가능) |
| `winterholic-static-kit.device`, `.combos.device` | 그대로 읽거나 새 키로 한 번 복사한다 |
| `winterholic-static-kit.structure-closed` | 쓰는 곳이 없던 죽은 키다 (WB-09). 이어받지 않는다 |

### 5.4 호환 시험 (**제안**)

| 시험 | 내용 |
|---|---|
| 해시 게이트 | `examples/` 425 · `examples/themes/` 270 · `v1/` 2의 트리 해시가 `00-baseline.md` 4.2절 값과 같다. 의도한 카탈로그 개정이면 값을 갱신하고 이유를 기록한다 |
| 리다이렉트 표 시험 | 세 `/combos` 경로 각각 307 및 쿼리 전체 보존, `/explore/combos` 임시 별칭의 307 및 쿼리 보존과 최종 200을 검사한다 |
| `render.html` 동치 | 샘플 조합 id 20개에서 옛 `renderCombo` 결과와 새 라우트 응답이 바이트가 같다 |
| 옛 앱 유지 | main에서 `npm run verify`와 `npm run test:browser`가 호환 기간 동안 계속 통과한다 (현재 224개와 67개, `00-baseline.md` 2-3절) |

## 6. 열린 결정 목록

| ID | 질문 | 소유 | 이 감사의 의견 |
|---|---|---|---|
| D1 | `code → hint` 표를 어느 모듈이 소유하는가 | B·C | 한 모듈로 올려 두 계층이 import (1.5절) |
| D2 | Studio의 `sel`(출처·구성·변형·팔레트 선택 여부)을 어디에 두는가 | F·B | 문서 밖 `origin` 상태, 가져오기는 `null` |
| D3 | 옛 `repairAxes(b)` 호출자의 조용한 내비 절단은 옛 앱에서만 남는가 | B·D | 옛 앱은 건드리지 않고 새 앱만 연산 계층 사용 |
| D4 | `/test-lab/**` 처리 | 오너 | 결정 보류 |
| D5 | MCP를 Next 라우트로 둘지 별도 프로세스(`apps/mcp`)로 둘지 | H | **관찰: `next/api-mcp`에서 Next Route Handler `/api/mcp`를 선택했다.** 단일 Streamable HTTP 엔드포인트이며 상태를 서버에 저장하지 않는다. 외부 프로세스 분리는 선택하지 않았다. 자세한 근거·한계는 `07-api-mcp.md` 참조. |
| D6 | `manifest.integrity`(SHA-256)를 서비스가 내는가, 호출자가 해시 함수를 주입하는가 | C | Node는 동기 `createHash`, 브라우저 WebCrypto는 비동기라 주입식이 필요. 이번 서비스 계약에서는 제외 |
| D7 | Next.js 버전, React 버전, 렌더링 모드(SSG·ISR·동적) | D | 이 감사는 정하지 않았다. 호환 산출물(`/examples/**`)은 정적이어야 한다 |
| D8 | 배포 대상 (현재 Vercel 프로젝트 `design-system-static-kit`를 이어 쓰는가) | 오너·D | `00-baseline.md` 5절. 운영 배포가 main보다 한 단계 뒤처져 있다(2.3.0 대 2.4.0) |

## 7. H/I 구현 관찰 (2026-11-21)

브랜치 `next/api-mcp`에서 REST v1 작업 표, OpenAPI 생성기, Streamable HTTP MCP Route Handler와 Integrations 사용 안내를 구현했다. 이는 아직 이 문서 기준선에 합쳐지지 않은 브랜치 관찰이다.

- 구현 의존성은 Next.js 16.4.6, MCP TypeScript SDK `@modelcontextprotocol/server`·`client` 2.4.0, `mcp-handler` 2.4.0, Zod 4.6.7이다. `apps/web` workspace에 둬 루트 Core의 런타임 의존성은 유지하지 않는다.
- REST와 MCP 어댑터 모두 `@winterholic/design-system-static-kit/service`의 여섯 함수를 호출한다. REST OpenAPI 3.1은 작업 표와 서비스 스키마로 생성한다.
- `app/api/mcp/route.ts`는 Next의 기본 Node.js Route Handler이며 `maxDuration=30`을 선언한다. 자체 MCP 처리 상한은 10초다. 호출 제한 상태는 인스턴스 메모리라 서버리스 전체 제한은 아니다.
- 정확한 상태 코드·봉투·크기·캐시·요청 제한 계약과 공식 SDK/Next 배포 근거는 `07-api-mcp.md`에 있다. 빌드와 채널 시험은 별도 실행 결과로 확인한다.
- Vercel의 실제 프로젝트 연결이나 운영 배포 상태는 이 구현으로 확정하지 않는다. D8은 그대로 열어 둔다.
