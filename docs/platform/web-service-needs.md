# 웹(W6)이 조립 서비스에 요구하는 함수

W6-b 화면이 Core 서비스 진입점(`@winterholic/design-system-static-kit/service`)에서 이름으로 찾아 쓰는 함수다. 웹은 `src/platform/`을 직접 import하지 않는다. 함수가 없으면 화면은 "조립 서비스 연결 대기"를 보이고(`features/platform/Unavailable.tsx`) 대신 값을 만들지 않는다.

모든 함수는 서비스 봉투 `{ok, value | errors, warnings}`를 쓴다. 공개된 Core 계약은 `docs/platform/pages.md` §8을 따른다. 웹은 `apps/web/features/platform/platform.server.ts`에서 공개 함수만 호출한다.

| 함수 | 입력 | 출력 | 쓰는 화면 | 근거 |
|---|---|---|---|---|
| `assembleDesign(request)` | `pages.md` §2 요청. `surface`·`motion`·`background`·`media`·`states` 포함 | `value: {selected, candidates[], blocked[], comparison, plan, decisions}`. `candidates[].value`는 `{css, html, script, standalone, tokens, manifest}`, `candidates[].reasons`, `quality` | Materials 팔레트·타이포·스타일, Studio 조립, Explore 사례 | `pages.md` §8 |
| `listPlatformMaterials({kind})` | `kind`: `palette`, `subtoken-set`, `type-system`, `family`, `purpose-family`, `style-context`, `axis-value`, `surface`, `motion`, `background`, `media`, `state-pattern` | `value.items[]`: 재료 요약(`id`, `label`, `contexts`, `tags` 등). 상세는 `getPlatformMaterial({id})` | 모든 재료 화면의 목록. Components는 `purpose-family` 32개와 `family` 4개를 별도 조회 | `createPlatform().registry.kind(k).list()` |
| `recommendMaterials({kind, selected, context, mode, fit})` | 추천 요청 | `value: {ranked: [{id, score, reasons[{reason}]}], blocked: [{id, blocked: [{code, reason, with}]}]}` | 세트 호환·거부 이유, 서체·스타일 추천, 교체 선택지 비활성 | `recommend()` |
| `proposeSubtokenSets({seeds})` | hex 3~8개 | `value: {assignments, candidates[{set, label, modes}], rejected[{set, label, reasons[]}]}` | 내 색으로 시험하기 | `proposeSubtokenSets()` |
| `assembleComponents({context, mode, density?, palette?, subtokenSet?, typeSystem?, seeds?, items[]})` | 목적 패밀리 `items: [{purpose, visual, variant, props, content, id?}]` | `value: {css, html, script, standalone, manifest}` | Components 상세와 Studio 전달 시연 | Core 공개 서비스 `assembleComponents()` |

## 현재 웹/Core 경계

- 웹은 `@winterholic/design-system-static-kit/service` 공개 진입점의 `assembleDesign`, `assembleComponents`, `listPlatformMaterials`, `getPlatformMaterial`, `recommendMaterials`, `proposeSubtokenSets`를 사용한다. `platformReady()`는 필요한 공개 함수가 모두 있는지 확인한다.
- Components는 `listPlatformMaterials({kind: "purpose-family", limit: 200})`와 `listPlatformMaterials({kind: "family", limit: 200})`를 분리 호출한다. 요약 레코드의 목적 패밀리 32개는 `getPlatformMaterial({id})`로 상세 조회하며, 네 시각 패밀리는 별도 비교 목록으로 표시한다.
- `assembleComponents`가 목적 패밀리의 HTML·CSS·script·manifest·standalone을 만든다. 웹의 렌더 경로는 요청을 Core에 전달하고 응답 조각을 그대로 반환한다.
- `proposeSubtokenSets({seeds})`가 사용자 hex 후보·거부 이유·light/dark 토큰 값을 제공한다. 입력은 요청 동안만 사용한다. Materials는 Core 제안을 시각 비교하고 선택 결과를 Studio로 넘긴다.
- `assembleDesign` 기본 응답은 선택 출력 조각을 생략할 수 있으므로 웹 어댑터는 `include`에 필요한 항목을 명시해 standalone·html·css·manifest를 요청한다.
- 런타임 함수 본문은 `Function.toString()`으로 만들어진다. Next 번들 실행의 실제 `<script>` 바이트가 Core Node 응답과 다르면 전체 문서 비교에서 `<script>`를 정규화한 값과 원본 바이트 비교를 함께 남긴다. 정규화된 화면 비교는 마크업·CSS·manifest 등 비스크립트 영역만 증명한다.

## W6-b가 이미 쓰는 것

- Materials: 팔레트 목록·상세(세트 비교, 거부 이유, 추천), 내 색 시험, 타이포 비교, 스타일·기타 재료 비교.
- Components: 목적 패밀리 목록, 상세(시각 패밀리·변형·상태·콘텐츠·팔레트·세트·서체, 금지 조합 비활성과 자동 조정, 코드 내려받기), 페이지 조립 진입.
- Studio: `/studio/assemble` 여섯 단계(주소가 상태).
- Explore: 플랫폼 조립 사례.
- 미리보기와 내려받기는 `/platform/render`가 요청을 서비스에 그대로 넘기고 `value.standalone|html|css|manifest`를 그대로 돌려준다.

## 공개 서비스 연결 근거

기준 Core `1c36e1cf7`은 `assembleComponents`, `proposeSubtokenSets`와 `purpose-family` 목록 kind를 공개한다. `listPlatformMaterials` 실측 결과는 purpose-family 32개, family 4개다. W6-b 시나리오의 준비 조건 skip은 없으며, A/B/C 검증은 390px와 1280px에서 각 실행한다.
`proposeSubtokenSets`는 같은 3색 및 6색 입력에서 모두 성공 봉투, 통과 후보 2개(light/dark), 거부 후보 5개(대비 이유)를 반환했다. 잘못된 `#12` 입력은 `P_SEEDS_COUNT`로 거부했다.

## 2026-11-23 출력 바이트 비교

로컬 최적화 웹 빌드(Node `v26.9.0`)의 `/platform/render` 응답과 Core `1c36e1cf7`의 같은 입력을 비교했다. 입력은 다음과 같다.

```json
{
  "context": "landing",
  "mode": "light",
  "items": [{
    "purpose": "purpose:card.pricing",
    "visual": "family:bold",
    "variant": {"emphasis": "standard"},
    "props": {"size": "medium", "state": "default"},
    "content": {
      "plan": "팀", "price": "₩29,000", "period": "월 / 사용자",
      "description": "10명 이하 팀을 위한 협업 기능",
      "features": ["무제한 프로젝트", "역할 기반 권한", "변경 이력 90일", "우선 지원"],
      "ctaLabel": "무료로 시작", "badge": "추천"
    }
  }]
}
```

HTML, CSS, manifest는 각각 완전히 일치했다. standalone은 비스크립트 바이트까지 같지만 전체는 다르다. 차이는 출력 경계 `<script>…</script>` 안이며, E2E의 기존 `noScript` 정규화는 이 차이를 가린다.

| 비교 | Core SHA-256 | Web SHA-256 | 바이트 | 결과 |
|---|---|---|---:|---|
| HTML | `c92c331664a4b34a812810e8509cf081dd9b42658116e2092cdf646e2b8cde5d` | 동일 | 2,014 | 완전 일치 |
| CSS | `878dc08d5ff728dedb288a2f1c4f6633e7714a3fe7685eaf738b6cfabe6a06b2` | 동일 | 22,121 | 완전 일치 |
| manifest | `a707a0eb2fd420e5d6697f6308de58c3c417fe68ceee4cc34822661a13e499f9` | 동일 | 16,523 | 완전 일치 |
| standalone 전체 | `260ad23ac56ca9b8bd456c81611bb4bff265db0bd7260dc3a13eb67a2087b75c` | `75db4442fdea67a543f9b898ee5a013ca66db6e0f078722195f43a334725629f` | Core 29,641 / Web 28,950 | 다름; noScript 정규화 후 일치 |
| `<script>` 본문 | `581d95b1565fdeba102f0f2fb2addead3abda74362cc10796be91b295de0010b` | `8feee8f032dec4b0bf7b042a6683f7763ce12cde1d7747d7b650c10ce7d761e7` | Core 4,964 / Web 4,273 | 다름 |

교정 요청: 목적 패밀리 출력의 `script`를 번들된 함수의 `Function.toString()` 결과에 의존하지 않는 안정된 문자열로 제공해 Node Core와 최적화 웹 서버에서 standalone 바이트가 같아지게 해 주세요. 이 항목은 Core 소유이므로 웹 쪽에서는 변경하지 않았다.
