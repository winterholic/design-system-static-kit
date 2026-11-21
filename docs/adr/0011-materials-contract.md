# ADR 0011: 재료 계약·레지스트리와 카탈로그 2.6.0 전략

- 상태: 채택 및 확장(계약·레지스트리, 2.6.0 계층 색 토큰)
- 날짜: 2026-11-22
- 관련: ADR 0001, 0009, 0010; `docs/materials/audit.md`

## 결정

엔진이 조립하는 모든 디자인 재료는 `src/materials/contract.mjs`의 공통 기록 하나를 가진다. 종류별 값은 `ext`에 둔다. 재료는 `createRegistry().register()`로 등록할 때 검사되고, 실패한 재료는 등록되지 않는다. 기존 카탈로그는 `src/materials/adapters.mjs`가 읽기 전용으로 옮긴다. `catalogRegistry()`가 그 결과다.

| 파일 | 역할 |
|---|---|
| `src/materials/contract.mjs` | 공통 필드(`FIELDS`), 종류(`BUILTIN_KINDS`, `defineKind`), 분류·맥락·품질·반응형·라이선스 enum, `combinationsOf`, `isCompletePreset`, `defineMaterial` |
| `src/materials/validate.mjs` | `validateMaterial(m, kind)`: 재료 한 장. `validateGraph(byId)`: 의존·부모·자식 참조 |
| `src/materials/registry.mjs` | `register`·`get`·`search`·`filter({kind, category, context, minQuality, preset, tag})`·`counts()`·`check()`·`addKind` |
| `src/materials/adapters.mjs` | 부품 55, 축 15, 서체 프리셋 18, 테마 54, 레거시 팔레트 427, 페이지 유형 16, 템플릿 85, 레시피 3, 배치 원형 6, 아이콘 87, 2.6.0 색 토큰 257 |
| `src/materials/index.mjs` | 공개 진입점, `catalogRegistry()` |
| `tests/materials-registry.test.mjs` | 계약·레지스트리·수량·고정 출력 검사 |

세 수량은 따로 센다. **재료 수**는 등록된 기록 수다. **속성 조합 수**는 재료마다 `variants` 값 개수를 곱해 더한 값이다. **완성 프리셋 수**는 프리셋 가능 종류이면서 `preset: true`이고, 모든 속성에 기본값이 있고, 품질이 implemented 이상인 재료 수다. 조합은 프리셋으로 세지 않는다. 부품 종류는 프리셋이 될 수 없고 검증기가 `M_PRESET`으로 거부한다.

품질 주장은 근거와 묶는다. `verified`는 `tests/<파일>:<줄>` 근거가 필요하고, 그 줄이 실제 `test(`인지 테스트가 확인한다. `implemented` 이상은 `render` 진입점이 필요하다. 외부 출처는 URL과 판정 문구가 필요하다.

## 카탈로그 버전 전략

- 이번 단계는 Blueprint 문법·검증·렌더러를 바꾸지 않는다. 컴파일 경로(`compiler`, `validate`, `render`, `styles`, `service`, `edit`)는 `src/materials/`를 import하지 않는다. 그래서 `VERSION_ORDER`, `ACCEPTED_CATALOG_VERSIONS`, `src/service/versions.mjs`도 바꾸지 않았다. 2.1.0~2.5.0 출력은 그대로다. 2.4.0은 `docs/evidence/expression/legacy-2-4-*.json`, 2.5.0은 이번에 고정한 `docs/evidence/materials/pinned-2-5-*.json`(85개 템플릿)으로 확인한다.
- `MATERIAL_CATALOG_VERSION = '2.6.0'`은 이제 활성화된 **opt-in** 버전이다. `colorPalette: 'static-kit'`은 `since: 2.6.0`의 닫힌 필드이며, 기본 생성 버전 `CATALOG_VERSION`은 2.4.0으로 유지한다.
- 2.6.0 색 토큰 구현은 네 층(primitive → semantic → state → component)의 참조 그래프와 자체 시드·명도 램프를 사용한다. CSS 사용처와 라이트·다크·auto 대비 검사는 [색 토큰 읽기 API](../materials/color-tokens.md)에 기록한다.
- 2.5.0 이하 Blueprint가 `colorPalette`를 쓰면 `VERSION_FIELD`로 거부한다. 미등록 팔레트 ID는 스키마의 닫힌 enum에서 거부하며 호출자 색값 입력은 없다.
- `src/catalog/expression.mjs`의 버전 순서와 `ACCEPTED_CATALOG_VERSIONS`, 스키마, 마이그레이션, `atLeast(..., '2.6.0')` CSS·토큰 게이트를 함께 갱신했다. 변경하지 않은 기본 Blueprint와 2.4.0·2.5.0 고정 산출물은 회귀 테스트로 보존한다.
- `checkExpectedVersion`(`src/service/versions.mjs`)은 `ACCEPTED_CATALOG_VERSIONS`를 읽으므로 별도 수정이 필요 없다. 서비스 계약 버전은 응답 모양이 바뀔 때만 올린다.
- 이전 경로: `migrateBlueprint(doc, '2.6.0')` / `kit migrate --to 2.6.0`은 catalogVersion만 올린다(ADR 0010과 같다). 내려 쓰지 않는다. 재료 id로 고른 값은 Blueprint의 기존 축·노드 값으로 풀려 저장된다. 재료 id를 Blueprint에 직접 넣는 문법은 2.6.0에서 따로 결정한다.
- 재료 자체의 버전(`material.version`)은 semver다. 출력이 바뀌면 minor 이상을 올리고, 출력이 바뀌는 변경은 새 카탈로그 버전 게이트 뒤에만 둔다.

## 후속 재료 작업자가 지킬 것

- 새 재료는 `defineMaterial({...})`로 만들고, 공통 필드를 빼지 않는다. 값이 없으면 null이나 빈 값으로 둔다.
- 새 종류는 `defineKind({id, label, categories, ext, presetCapable})`와 `registry.addKind`로 더한다. `FIELDS`를 바꾸려면 `MATERIAL_CONTRACT_VERSION`을 올리고 이 ADR을 개정한다.
- 미리 만든 종류 중 `color-token`에는 이번에 257개가 등록됐다. `chart-preset`, `pattern`은 종류만 있고 재료는 아직 없다.
- 등록 후 `registry.check()`가 비어야 한다. `catalogRegistry()`는 비지 않으면 예외를 낸다.
- 품질을 `verified`로 올릴 때는 그 재료를 실패시킬 수 있는 테스트의 file:line을 적는다.
- 외부 자료는 새로 수집하지 않는다. 기존 팔레트 판정은 `docs/materials/audit.md` §3을 따른다.

## 결과

재료 1,023개, 속성 조합 763,006개, 완성 프리셋 157개(서체 18 + 테마 54 + 템플릿 85)다. 이 중 색 토큰은 257개이며 실행 시점 값은 `catalogRegistry().counts()`가 정본이다. `./service`와 `./edit`의 기존 응답 계약은 바뀌지 않았다. 색 토큰은 `./color-tokens`와 `./materials` 읽기 API로 공개한다.
