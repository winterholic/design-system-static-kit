# 디자인 프로파일과 레이아웃 패턴 (2.6.0)

프로파일은 함께 쓸 수 있는 재료·프리셋·밀도를 정하는 닫힌 규칙 묶음이다. AI나 사용자는 프로파일 id, 패턴 id, 프리셋, 내용만 고른다. 디자인은 등록된 재료가 만든다. 정본은 코드와 테스트다.

| 파일 | 역할 |
|---|---|
| `src/profiles/data.mjs` | 프로파일 7개(erp, finance, commerce, saas-landing, editorial, docs, mobile-app), 패턴 11개, 좁은 화면 전략, 규칙 PF01~PF13. import 없는 데이터 |
| `src/profiles/check.mjs` | `checkProfile(blueprint)`: 정적 검사(품질 검사 A). 진단마다 `code`·`path`·`severity`·`reason`·`fix`·`alternatives`·`rule`을 낸다 |
| `src/profiles/registry.mjs` | `designRegistry()`: `catalogRegistry()`에 `profile` 종류, `pattern` 재료 11개, `profile` 재료 7개를 더하고 참조·프로파일 무결성을 검사한다 |
| `src/profiles/assemble.mjs` | `assemble(profileId, intent, content)`: 결정적 조립 |
| `tests/profiles.test.mjs`, `tests/profiles-assemble.test.mjs` | 등록, 오라클 대조(오탐·미탐), 주입 경로 차단, 결정성, snapshot 불변 |

## Blueprint

- `profile`은 `since: 2.6.0`의 닫힌 enum이다. 2.5.0 이하에서 쓰면 `VERSION_FIELD`, 모르는 id는 `ENUM`으로 거부한다. 게이트는 `PROFILE_SINCE_FIELD`(`src/catalog/expression.mjs`)다. 색 토큰 계약이 고정한 `TOP_LEVEL_SINCE_FIELDS`는 건드리지 않았다.
- `profile`이 있으면 검증기(`src/validate.mjs`)가 `checkProfile`을 부른다. 위반은 `PROFILE_*` 오류다. 서비스 응답은 기존 Diagnostic 모양(`code, path, message, hint, rule, fix`)을 지킨다. 근거와 대안 목록은 message 뒤에 붙고 `fix`에는 프로파일 기본값이 담긴다. 심각도·근거·대안을 필드로 따로 받으려면 `checkProfile`을 직접 부른다.
- 프로파일은 제약이고 스타일 출처가 아니다. 같은 Blueprint에서 `profile`을 빼고 컴파일해도 HTML·CSS가 같다(테스트). 프로파일 Blueprint는 `colorPalette: 'static-kit'`이 필요하다(PF08).
- 프로파일 규칙은 카탈로그 `rules`·`expressionRules`에 넣지 않았다. 그래서 `catalogSnapshot()`과 2.4.0·2.5.0 출력이 그대로다. 테스트가 기준 커밋 14914b80d의 snapshot sha256으로 확인한다.

## 외부 공개 경로

패키지 공개 진입점은 `./service`·`./edit`뿐이고 새 export는 두지 않는다. 프로파일은 `./service`로 나간다.

- `assembleBlueprint({profile, intent, content})`: 아래 `assemble`의 봉투판. 성공 `value`는 `{blueprint, decisions, materials}`다. 진단은 기존 Diagnostic 모양이고 근거·대안 목록은 message 뒤, 대안 값은 `fix`에 있다. 던지지 않는다.
- `validateBlueprint(blueprint)`: `profile`이 있는 2.6.0 Blueprint에 프로파일 검사(PF01~PF13)를 함께 적용한다.
- `getSchema({target: 'blueprint'})`: `profile` enum과 `x-since: 2.6.0`.

`src/profiles/` 모듈은 Core 내부 API다(테스트와 서비스가 쓴다).

## 조립

`assemble(profileId, intent, content, {registry})`는 `{ok, blueprint, diagnostics, decisions, materials}`를 돌려준다.

- `intent` 키: `pattern, theme, density, mode, shell, width, typography, controlSize, components, chartPresets`. `content` 키: `name, nav, slots`. 이 밖의 키(`css`, `style`, `className`, `html` 등)는 `ASSEMBLE_UNSUPPORTED`다.
- 요구한 값이 허용 목록 밖이면 다른 값으로 바꾸지 않는다. `ok:false`, `blueprint:null`과 `alternatives`를 돌려준다. 요구하지 않은 축만 프로파일 기본값으로 정하고 `decisions`에 `source`(profile, theme-forbid, X05 같은 금지 조합 id)를 남긴다.
- 슬롯 내용은 슬롯과 프로파일이 **함께** 허용하는 부품만 받는다(`ASSEMBLE_CONTENT`). 개수와 모르는 슬롯은 `ASSEMBLE_SLOT`이다. 결과는 검증기를 통과해야 `ok:true`다. 통과하지 못하면 `ASSEMBLE_INVALID`와 검증 진단을 함께 준다.
- `chartPresets`는 패턴이 허용한 기본 슬롯 안의 기본 차트 노드에 순서대로 적용한다. 등록 재료의 kind·데이터·축·격자·라벨·범례 등 기존 옵션을 차트 노드로 복사하며, 기본 차트의 제목·설명과 다른 콘텐츠는 유지한다. 프로파일 차트 형태·차트 수 제한과 패턴 슬롯에 적용할 위치가 모두 맞아야 한다. 슬롯을 사용자가 제공한 내용으로 교체해 기본 차트 대상이 사라지거나 프리셋 수가 대상보다 많으면 `ASSEMBLE_CHART_PRESET` 진단으로 거부한다. 사용자 슬롯·차트 데이터는 프리셋으로 덮어쓰지 않는다.
- 프로파일의 `type.rolePreset`은 Blueprint `typeRoles`로 기록한다. `2.6.0` 역할 서체 재료의 CSS와 manifest를 컴파일러가 생성한다. 기존 `typography` 축은 그대로 유지한다.
- 명시적 재료 입력 중 `components`는 프로파일 허용 목록을 검증하는 선택 선언이다. 트리 부품을 자동 추가하지 않으며 실제 부품은 `content.slots`로 전달한다. `controlSize`는 성공 결과의 `materials.controlSize`에 보존되는 선택 메타데이터이고 Blueprint나 컴파일 CSS에는 적용되지 않는다. 컨트롤 부품별 크기 적용 계약은 별도 컴파일러/컨트롤 재료 의존으로 남는다.
- 시간·난수를 읽지 않는다. 같은 입력이면 JSON 바이트가 같다.

## 통합 중 재료

차트 프리셋(`chart-preset:*`), `component:select-control`, `component:data-table`은 id 문자열로만 적는다(`pendingComponents`, `charts.presets`). 레지스트리에 없으면 허용 목록에서 빠지고 `ext.pending`에 남으며, 요구하면 `ASSEMBLE_PENDING`이 난다. 통합 브랜치(8343ff6cb)를 병합한 지금은 모두 등록되어 있어 `pendingMaterials()`가 비어 있다. 테스트는 이 재료를 뺀 레지스트리로 대기 동작을 따로 검사한다.

## Studio 연결점 (apps/web 작업자용, 이 작업에서는 구현하지 않음)

- 적용 가능성: Studio의 Core 판정(`src/edit/applicability.mjs`)은 검증기를 거친다. 그래서 `profile`이 있는 문서에서는 프로파일이 금지한 테마·축·부품 선택지가 `PROFILE_*` 오류로 자동 제외된다. 따로 연결할 코드는 없다.
- 프로파일을 고르는 편집 연산(`setProfile`)은 없다. 새 문서는 `./service`의 `assembleBlueprint`로 만들고 `importBlueprint`로 들여오는 것이 현재 경로다. REST·MCP·CLI 채널에는 아직 연결하지 않았다.
- 패턴 id는 Blueprint에 저장하지 않는다. 조립 결과는 축·노드 값으로만 남는다(ADR 0011과 같은 방식). 편집 후 패턴 슬롯 규칙을 다시 검사하려면 패턴 저장 문법을 따로 정해야 한다.
