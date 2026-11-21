# ADR 0009 · 채널이 함께 쓰는 Core 서비스 계층 하나

- 상태: 채택 · 2026-11-21 (브랜치 `next/c-service`, main 병합 전)
- 배경: Next.js 플랫폼 전환의 Core 단계. 검증·카탈로그 조회·컴파일이 채널마다 따로 있었다(`docs/dev/platform/02-core-map.md` 3.2절, `03-interfaces.md` 1.1절). `site/v1/catalog.json` 투영은 `scripts/build.mjs`, `kit catalog` 요약은 `scripts/kit.mjs`에 따로 있었고, `compile`은 대비 게이트 실패와 내부 예외를 메시지뿐인 `Error`로 던졌고, 검증 오류에는 `hint`가 없었다. Studio, REST API v1, MCP, CLI가 같은 질문에 다른 답을 내면 안 된다.
- 구현: `src/service/`(`index.mjs`, `errors.mjs`, `envelope.mjs`, `versions.mjs`, `validate.mjs`, `compile.mjs`, `query.mjs`, `explain.mjs`), `src/edit/ops.mjs`(hint 표 import로 교체), `scripts/kit.mjs`(검증·컴파일을 서비스 경유)
- 시험: `tests/service-contract.test.mjs`, `service-compile`, `service-explain`, `service-cli`, `core-boundary`

## 결정

### 1. 공개 진입점은 `src/service/index.mjs` 하나다

내보내는 함수는 여섯 개와 하나다.

| 함수 | 하는 일 |
|---|---|
| `listCatalog(q)` | 종류(templates, themes, palettes, components, pageTypes, axes, concepts, recipes, icons, rules, axisBans, layoutSlots) 요약 목록. 필터·검색어·필드 선택·쪽 나누기 |
| `getSchema(q)` | JSON Schema 2020-12. target은 blueprint, component, chrome, diagnostic, edit-ops. `fields`로 최상위 속성 일부만 |
| `getComponentSpec(q)` | 부품 하나의 명세. `fields`로 항목 일부만 |
| `validateBlueprint(bp, opts)` | `src/validate.mjs`를 한 번 거쳐 오류에 hint·규칙 ID·fix를 붙임 |
| `compileBlueprint(bp, opts)` | `src/compiler.mjs`를 한 번 감싸 `{html, css, tokens, manifest, files, sizes}`를 돌려줌 |
| `explainDecisions(subject, opts)` | 컴파일러가 남긴 기록을 읽어 결정·페이지 규칙·축·대비로 정리 |
| `catalogSnapshot()` | `site/v1/catalog.json`과 바이트가 같은 레거시 투영(`scripts/build.mjs`에서 옮김). 기본으로 부르는 함수가 아님 |

`03-interfaces.md` 1.4절 추가 후보 `getRecipePick`, `getLayoutSlots`, `getCombo`, `listAxisOptions`는 이번에 만들지 않았다. `combos` 종류도 `listCatalog`에 넣지 않았다(4,955개를 계산하는 모듈 수준 캐시가 필요해 Studio가 요청할 때 추가한다). `layoutSlots`는 `filter.template`으로 조회한다.

### 2. 결과 봉투와 오류 형식은 하나다

```js
{ok: true,  value, warnings, catalogVersion, contractVersion}
{ok: false, errors, warnings, catalogVersion, contractVersion}
// errors[i], warnings[i] = {code, path, message, hint}  (+ 선택: rule, fix)
```

- 서비스 함수는 던지지 않는다. 예상하지 못한 예외는 `INTERNAL` 한 줄(메시지 첫 줄만, 스택 없음)로 감싼다. 어떤 입력(순환 참조, BigInt, `null`)에도 던지지 않는 것을 시험한다.
- `contractVersion`(현재 `1.0.0`)은 봉투나 Diagnostic 모양이 바뀔 때 올린다. 카탈로그 버전과 따로 움직인다.
- 네 필드는 항상 비지 않은 문자열이다. `path`는 `$`로 시작한다(문서 안 `$.tree.children[1]`, 요청 인자 `$args.kind`).
- 검증기의 코드는 이름을 바꾸지 않는다. `AXIS_BAN`과 `THEME_FORBID`는 메시지 문장에만 있던 대안을 `fix`(예 `{elevation: 'soft'}`)로도 준다. 값은 카탈로그의 `axisBans[].fix`와 `theme.defaults`에서 읽고 문장을 파싱하지 않는다.
- `opts`와 질의 인자의 알 수 없는 키는 `BAD_REQUEST`다. 오타 하나가 조용히 무시되어 전체 카탈로그가 나가는 일을 막는다.
- 반환값은 JSON으로 직렬화되는 새 객체다. 카탈로그 객체는 `freeze`되어 있어 그대로 내보내지 않는다.

### 3. code → hint 표는 `src/service/errors.mjs`가 소유한다 (D1)

`src/edit/ops.mjs`가 갖고 있던 `HINTS`·`DEFAULT_HINT`·`withHint`를 서비스 모듈로 옮겼고 편집 계층은 그것을 import한다. 표는 한 곳이다(`tests/service-contract.test.mjs`가 편집 계층과 서비스가 같은 코드에 같은 hint를 내는지, `ops.mjs`에 자체 표가 없는지 확인한다).

기존 항목은 글자 그대로 옮겼다. 다음 두 가지가 달라진다.

1. 검증기가 내지만 표에 없던 코드(`JSON, CONST, OBJECT, ARRAY, ROOT, FEATURED_PLAN, NESTED_TABS, TOC_EMPTY, STATE_DATA, TABLE_WIDTH, CHART_SHAPE, CALENDAR_DAY, METRIC_TREND, SELECTED_RANGE, STEPPER_RANGE, PAGINATION_RANGE, SELECT_OPTIONS, FIELD_OPTIONS`)에 전용 hint를 추가했다. 편집 계층은 이 코드를 만나면 이전에는 `DEFAULT_HINT`를, 이제는 전용 hint를 낸다. 코드·경로·메시지, 시험 결과, 성공·실패 판정은 같다. 이 한 줄이 `src/edit` 공개 동작의 유일한 변화다.
2. 서비스 코드(`BAD_REQUEST`, `UNKNOWN_KIND`, `UNKNOWN_TEMPLATE`, `UNKNOWN_THEME`, `UNKNOWN_PALETTE`, `UNKNOWN_COMPONENT`, `UNKNOWN_AXIS`, `CONTRAST_GATE`, `UNSUPPORTED_VERSION`, `INTERNAL`, `OUTPUT_OMITTED`)와 경고 코드(`PAGE_DUP_VISUAL`, `PAGE_BENTO_SPARSE`)를 같은 표에 두었다.

시험이 검증기·컴파일러 소스가 쓰는 모든 코드와 `rules[].codes`(도구 이름 `audit`, `check` 제외)에 hint가 있는지 확인한다. 새 검증 코드를 추가하고 표를 잊으면 시험이 실패한다.

### 4. 컴파일은 실패를 고쳐서 성공시키지 않는다

- `compileBlueprint`는 `src/compiler.mjs`의 `compile`을 그대로 부른다. 검증 실패는 `error.errors`를 hint 붙인 Diagnostic으로, 대비 게이트 실패(`Contrast gate failed`)는 `CONTRAST_GATE`로, 그 밖은 `INTERNAL`로 돌려준다. 어느 경우에도 입력을 보정하거나 `fix`를 적용하지 않는다(`fix`는 제안일 뿐이다).
- `CONTRAST_GATE`는 컴파일러가 메시지만 던지므로 같은 토큰 계산(`resolveAll`)을 다시 해 기준 미달 쌍을 찾아 적는다. 컴파일러는 바꾸지 않았다. 찾지 못하면 일반 문장 하나를 낸다. 카탈로그의 모든 팔레트가 게이트를 통과하므로(감사 R05) 이 경로는 실제 입력으로 만들 수 없어, 변환 함수를 주입해 시험한다.
- 경고(`warnings`)는 컴파일 성공 뒤 `manifest.design.page.decisions` 중 `PAGE_DUP_VISUAL`, `PAGE_BENTO_SPARSE`만이다(`src/edit/contracts.mjs`의 품질 등급과 같은 기준이며 코드 두 개는 서비스 쪽에 따로 적었다. 편집 계층 수정 범위를 오류표 import로 한정했기 때문이다).
- 크기 제한: `include`(기본 html, css, tokens, manifest. `files`는 CLI 관리 파일 다섯 개), `html`(`full`, `summary`, `omit`), `maxBytes`(본문 텍스트 하나가 넘으면 싣지 않고 `OUTPUT_OMITTED` 경고). 크기는 `value.sizes`에 항상 있다.

### 5. `manifest.integrity`는 호출자가 해시 함수를 넣을 때만 채운다 (D6)

`opts.hash = {algorithm, digest(text) => string}`. 서비스는 해시를 직접 계산하지 않고 알고리즘 이름도 가정하지 않는다. 함수가 없으면 `manifest`에 `integrity` 키 자체가 없다. 함수가 있으면 `index.html`, `tokens.css`, `tokens.json`, `blueprint.json`의 해시를 CLI와 같은 순서·형식으로 넣는다.

- Node는 `node:crypto`의 동기 `createHash`를 감싸 넣는다. 시험이 `sha256`을 넣으면 `files`가 `site/examples/**`의 다섯 파일과 바이트가 같다는 것을 85개 템플릿과 54개 테마 쇼케이스에서 확인한다.
- 브라우저 WebCrypto는 비동기라 이 계약에서는 쓸 수 없다. `digest`가 문자열이 아닌 값(Promise 포함)을 돌려주면 `BAD_REQUEST`로 거부하고 hint가 `value.files`를 호출자가 직접 해시하라고 안내한다. 비동기 주입이 필요해지면 `compileBlueprint`의 동기 계약을 깨지 않는 별도 함수로 다룬다(미결).

### 6. `explainDecisions`는 컴파일러의 기록만 근거로 한다

- 근거는 `manifest.design.decisions`(적용 규칙 `applied`, 필드별 값 `values`, 필드별 승자 `sources`, 사실 `facts`), `manifest.design.page`(페이지 사실과 결정), `manifest.axes`·`theme`(축 값, 이를 제약하는 `axisBans[].id`, 테마 금지값), `manifest.contrast`(쌍 수, 본문 최소값 `text/canvas`, 여유(비율÷기준)가 가장 작은 쌍)뿐이다.
- `why`는 적용된 규칙 정의의 `reason`을 `C02: …` 꼴로 그대로 잇고, 적용 규칙이 없으면 manifest의 `coverage.reason`이다. `source`는 `src/catalog/composition.mjs#C02`, 페이지 규칙은 `pageRules[].source`다. 정의가 없으면 규칙 ID만 쓴다. 시험이 모든 템플릿의 모든 결정에서 `why`가 이 두 출처로만 만들어졌는지 문자열 일치로 확인하고, 손댄 manifest를 넘기면 답이 그것을 따르는지(재계산하지 않는지) 확인한다.
- `{manifest}`를 넘기면 컴파일러가 낸 것으로 믿고 읽기만 한다. 진위는 검증하지 않는다(필수 필드 모양만 검사한다).
- 결정의 의미는 설명하지 않는다. 규칙이 `reason`을 가진 만큼만 말한다. 규칙 이름이 아닌 계약 이름(`S09`, `layout/parent`)은 `inherited`(level `full`)에서 manifest의 문장으로만 나온다.

### 7. 호환 기준과 경계

- `compileBlueprint(createBlueprint(id)).value.html`이 `site/examples/<id>/index.html`과 바이트가 같다(85개). `catalogSnapshot()`의 직렬화가 `site/v1/catalog.json`과 바이트가 같다.
- Core 경계는 `tests/core-boundary.test.mjs`가 강제한다. UI 모듈 다섯 개(`workbench.mjs`, `workbench/catalog-view.mjs`, `workbench/viewport.mjs`, `combos/app.mjs`, `combos/render.mjs`)를 뺀 `src/**/*.mjs` 전부가 `react`·`next`·`node:*`·패키지를 import하지 않고, 상대 import는 `src` 안의 비UI `.mjs`만 가리킨다. `document`, `window`, `localStorage`, `sessionStorage`, `location`, `history`, `navigator`, `process`, `Buffer`, `require`, `__dirname`, `__filename`, `import.meta`를 쓰지 않는다. 검사는 주석과 문자열·정규식 리터럴의 내용을 비운 코드에만 적용하므로 `formRuntime` 문자열 속 `document.*`는 예외가 된다. 속성 이름(`o.history`)과 객체 키(`{location: 1}`)는 전역이 아니다. 검사기 자체의 시험(위반 예시를 잡고 정당한 예시를 놓아 줌, 모든 import·export 문장을 읽었는지)이 같은 파일에 있다.

### 8. CLI는 검증·컴파일을 서비스에서 거친다

`validate`, `migrate`, `build`가 `src/service`를 부른다. 출력은 예전과 같다(검증 오류는 `path [code] message` 줄, `build`의 검증 실패는 앞에 `Invalid blueprint:` 줄, 대비 게이트는 `Contrast gate failed`). `build`는 서비스로 컴파일해 실패를 먼저 거르고 `scripts/output.mjs`의 `writeOutput`이 디렉터리 안전 규칙대로 쓴다. `writeOutput`은 이 트랙의 쓰기 범위 밖이라 쓰기 경로는 그대로이며 컴파일이 두 번 일어난다(약 10ms). `check`와 `init`, `catalog`, `schema`, `templates`, `themes`는 서비스를 거치지 않는다(`check`는 `output.mjs`의 파일 집합 검사이고, `catalog`·`schema`는 출력이 달라지는 것을 피했다).

예전 CLI(`f1d250cf2`)와 새 CLI를 같은 입력 25건(유효·무효·거대·문법 오류·1.x·2.3.0 문서, `build`·`migrate`·`check`, 알 수 없는 명령)에 돌려 stdout, stderr, 종료 코드가 전부 같음을 확인했다. 알려진 차이 하나: `compile` 안의 예상 못한 예외(`INTERNAL`)는 stderr가 `내부 오류로 컴파일하지 못했습니다: ` 접두어 뒤 원문 첫 줄(최대 200자)이 된다. 유효한 입력으로는 발생하지 않아 시험하지 못했다(종료 코드 1은 같다).

## 열린 것

- `package.json`의 `exports`(`./service`, `./edit`)는 다른 트랙(D)이 소유해 이번에 건드리지 않았다. 그 선언이 들어오면 `./service`는 `src/service/index.mjs`를 가리켜야 한다.
- 브라우저·Next 번들러에서 `src/service`가 도는지는 이번에 실제 번들로 확인하지 않았다(`03-interfaces.md` 스파이크 S1~S5는 D 트랙). 확인한 것은 Node에서의 경계 시험과 `TextEncoder`·`structuredClone`만 쓴다는 정적 확인이다.
- `check`를 서비스로 옮기려면 `scripts/output.mjs`가 파일 집합 검사와 컴파일을 나눠야 한다.
- 서비스는 모듈 수준 캐시(`recipes.mjs`, `combos.mjs`)를 가진 모듈(`recipePicks`, `recipeOfTemplate`)을 부른다. 같은 입력이면 같은 출력이라 결정성은 지키지만 프로세스마다 첫 호출이 느릴 수 있다. `listCatalog({kind: 'templates'})`는 첫 호출에 약 40ms였다(`layoutOptionsOf`를 85번 계산, 한 대·1회 측정).
