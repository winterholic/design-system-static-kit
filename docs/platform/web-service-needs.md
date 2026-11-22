# 웹(W6)이 조립 서비스에 요구하는 함수

W6-b 화면이 Core 서비스 진입점(`@winterholic/design-system-static-kit/service`)에서 이름으로 찾아 쓰는 함수다. 웹은 `src/platform/`을 직접 import하지 않는다. 함수가 없으면 화면은 "조립 서비스 연결 대기"를 보이고(`features/platform/Unavailable.tsx`) 대신 값을 만들지 않는다.

모든 함수는 서비스 봉투 `{ok, value | errors, warnings}`를 쓴다. 공개된 Core 계약은 `docs/platform/pages.md` §8을 따른다. 웹은 `apps/web/features/platform/platform.server.ts`에서 공개 함수만 호출한다.

| 함수 | 입력 | 출력 | 쓰는 화면 | 근거 |
|---|---|---|---|---|
| `assembleDesign(request)` | `pages.md` §2 요청. `surface`·`motion`·`background`·`media`·`states` 포함 | `value: {selected, candidates[], blocked[], comparison, plan, decisions}`. `candidates[].value`는 `{css, html, script, standalone, tokens, manifest}`, `candidates[].reasons`, `quality` | Materials 팔레트·타이포·스타일, Studio 조립, Explore 사례 | `pages.md` §8 |
| `listPlatformMaterials({kind})` | `kind`: `palette`, `subtoken-set`, `type-system`, `family`, `style-context`, `axis-value`, `surface`, `motion`, `background`, `media`, `state-pattern` | `value.items[]`: 재료 기록(`id`, `label`, `seeds`, `contexts`, `tags`, `relations` 등) | 모든 재료 화면의 목록 | `createPlatform().registry.kind(k).list()` |
| `recommendMaterials({kind, selected, context, mode, fit})` | 추천 요청 | `value: {ranked: [{id, score, reasons[{reason}]}], blocked: [{id, blocked: [{code, reason, with}]}]}` | 세트 호환·거부 이유, 서체·스타일 추천, 교체 선택지 비활성 | `recommend()` |
| `proposeSubtokenSets({seeds})` | hex 3~8개 | `value: {assignments, candidates[{set, label, modes}], rejected[{set, label, reasons[]}]}` | 내 색으로 시험하기 | `proposeSubtokenSets()` |
| `listPurposeFamilies({group})` | 선택 | `value: {items[목적 패밀리 정의], groups, visuals}` | Components 목록·상세 | `src/platform/families` |
| `assembleComponents({context, mode, palette?, subtokenSet?, typeSystem?, items[]})` | 목적 패밀리 `items: [{purpose, visual, variant, props, content}]` | `value: {css, html, standalone, tokens, manifest}` | Components 상세 | `assembleFamilies()` |

## 서비스에 바라는 점

- **`standalone` 문서를 서비스가 낸다**: 목적 패밀리 조립(`assembleFamilies`)은 `{css, html}`만 낸다. 웹은 문서 틀을 만들지 않으므로 `standalone`(`<!doctype html>` 전체)이 필요하다.
- **런타임 스크립트가 번들에 안전해야 한다**: 지금 `value.script`와 `standalone`의 스크립트는 `Function.toString()`으로 만든다. 웹 서버 번들(Next, 압축 켜짐)은 함수 본문을 압축하므로 같은 요청의 출력 글자가 네이티브 Node 실행과 다르다. 스크립트를 문자열 상수로 내면 웹과 서비스의 결과가 바이트까지 같아진다. W6 시험은 현재 `<script>` 안쪽만 비교에서 제외한다.
- **목적 패밀리를 `assembleDesign` 슬롯에 놓기**: `pages.md` §9가 적은 한계다. 지금 Components에서 Studio로 넘어가는 조립은 기반 컴포넌트(card-surface)와 시각 패밀리까지만 간다.
- **목적 패밀리의 상호작용 스크립트**: `assembleFamilies`는 `script`를 내지 않아, 목적 패밀리 시연은 CSS 상태(hover, focus)까지만 동작한다.
- **`axis-value` 선택지의 거부 이유**: 셸·폭·밀도 선택지는 시험 조립으로 거부 여부를 읽는다(서버 프로세스 안에서 캐시). 재료 단위 호환 질의가 있으면 그것으로 바꾼다.

## W6-b가 이미 쓰는 것

- Materials: 팔레트 목록·상세(세트 비교, 거부 이유, 추천), 내 색 시험, 타이포 비교, 스타일·기타 재료 비교.
- Components: 목적 패밀리 목록, 상세(시각 패밀리·변형·상태·콘텐츠·팔레트·세트·서체, 금지 조합 비활성과 자동 조정, 코드 내려받기), 페이지 조립 진입.
- Studio: `/studio/assemble` 여섯 단계(주소가 상태).
- Explore: 플랫폼 조립 사례.
- 미리보기와 내려받기는 `/platform/render`가 요청을 서비스에 그대로 넘기고 `value.standalone|html|css|manifest`를 그대로 돌려준다.

## W6-b 통합 시 공개 여부 확인

현재 `@winterholic/design-system-static-kit/service`에서 웹이 사용할 수 있는 조립 함수는 `assembleDesign`, `listPlatformMaterials`, `getPlatformMaterial`, `recommendMaterials`, `checkCompatibility`, `applyEdit`다. `assembleDesign`은 기본 응답에서 `standalone`을 제외하므로 웹은 `opts.include`에 필요한 출력 조각을 명시한다. 목록도 요약이므로 팔레트 시드·재료 상세는 `getPlatformMaterial({id})`에서 읽는다.

현재 공개되지 않은 함수는 `assembleComponents`, `listPurposeFamilies`, `proposeSubtokenSets`다. `kind: "family"`의 4개 재료는 시각 패밀리이며 목적 패밀리 정의가 아니다. 이 API가 들어오기 전에는 목적 패밀리 조립이나 사용자 hex 시드 제안을 웹에서 흉내 내지 않는다. `w6b-scenarios.spec.mjs`는 이 준비 조건으로 시나리오를 건너뛰지 않으며, 나머지 A/B/C·Explore 검증은 Core API 통합 뒤 실행한다.
