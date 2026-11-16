# 맥락 규약 독립 검증

- 대상: 현재 작업 트리 (`HEAD 8c3d37c69047a08b08f70b26edfcc6d177b303d5`, catalog 2.2 / composition 1.1 변경 상태)
- 범위: 읽기 전용 소스·컴파일 검증. 브라우저·배포는 메인 담당이므로 실행하지 않음.
- 변경 제한: 이 보고서만 신규 작성. 작업 시작 시 이미 있던 다른 변경 파일은 수정하지 않음.

## 판정 요약

**정정: 확정 결함 판정을 철회한다.** 이전 보고서는 `container` shorthand가 컨테이너 이름 하나만 허용한다고 잘못 판단했다. W3C의 `container-name` 값 문법은 `none | <custom-ident>+`이고, shorthand의 이름 자리는 이 `<'container-name'>` 값을 받으므로 `kit compose`와 `kit gallery`처럼 두 이름을 쓰는 선언은 문법상 유효하다. [CSS Containment Level 3 §4.2](https://www.w3.org/TR/css-contain-3/#container-name), [§4.3](https://www.w3.org/TR/css-contain-3/#container-shorthand), [CSS Conditional Rules Level 5 §5.2–5.3](https://www.w3.org/TR/css-conditional-5/#container-name). 최신 CSS Containment Level 3 Editor’s Draft는 현재 placeholder이며 관련 기능을 Level 2 및 CSS Conditional 5로 옮겼다고 변경 이력에 명시하므로, 문법 판정은 정의를 담은 W3C TR과 CSS Conditional 5를 기준으로 삼았다. [CSS Containment Level 3 Editor’s Draft](https://drafts.csswg.org/css-contain-3/)

메인이 전달한 configured browser 관측(`CSS.supports('container','kit compose/inline-size')=true`, `kit gallery/inline-size=true`, longhand=true)은 이 문법 결론과 일치한다. 지정된 snapshot 파일은 현재 Run outbox에서 찾지 못해 독립적으로 다시 열지는 못했다. 실제 computed name과 조건 분기 적용은 메인이 추가 확인 중이므로 여기서는 검증 완료로 간주하지 않는다. 이 검토에서 남은 것은 **동작 확인 대기**이며 확정 결함이나 관측된 위험으로 분류하지 않는다.

그 외 요청한 예시 컴파일은 계약대로 동작했다. 숫자 길이 40의 KPI는 잘리지 않고 진단이 생성되지만, 가용 폭 상한을 넘는 수치의 실제 화면 넘침 여부는 브라우저 미관측이다.

## 완료 기준별 결과

1. **CSS 선택자·컨테이너와 마크업 연결** — 요소 selector/attribute 연결은 aside, team, pricing/plan, gallery, master-detail에서 컴파일 출력과 맞았다. 이전 결함 주장은 철회한다. `container:kit compose/inline-size` (`src/composition.mjs:91`) 및 `container:kit gallery/inline-size` (`src/composition.mjs:158`)는 각각 shorthand의 복수 `<custom-ident>`를 허용하는 `<container-name>` 문법과 맞고, 메인이 전달한 `CSS.supports` 결과도 true다. `@container compose` (`:132`, `:171`)와 `@container gallery` (`:162–167`)에 이름이 실제로 연결되고 조건 분기가 적용되는지는 computed style·분기 확인이 끝날 때까지 미검증이다. `contained-gallery-masonry` 컴파일은 `<div class="kit-layout-region"><div data-design-kind="aside" ...>`와 gallery의 `data-design-kind` 연결을 보이며 CSS 선언을 출력했다. snapshot 경로 `/Volumes/Backup/ttakkari-data/outbox/71bf19ce-83da-4595-a7e3-04400a03748f/browser/page-2026-11-16T01-11-21-842Z.yml`는 이 Run에서 찾지 못했다.

2. **55개 coverage 분류** — 현재 결정표를 기준으로 contextual 25개(기존 직접 적용 10 + 이번 확장 15), inherited 30개다. 모든 node type이 정확히 한 coverage entry를 가진다. contextual 유형은 결정표에 해당 type 규칙이 실제 존재하며, inherited 유형은 type 규칙이 없어 기존 renderer/style/구조 계약으로 설명되는 분류다. 다만 테스트는 coverage의 `contracts`가 비어 있지 않은지만 확인하고 계약 식별자 각각의 실재 여부를 검증하지 않는다. 따라서 설명용 문자열을 구현 trace로 과대해석하면 안 된다.

3. **2.1 레거시 hash 및 신규 계약** — 두 명령 모두 통과. 기존 2.1 템플릿 전체 컴파일 JSON SHA-256 85개는 저장된 기대값과 일치했다. 신규 composition/layout 계약 26개도 통과했다.

4. **요청한 반례** — 중첩 aside의 `minWidth=652`, `sideWidth=300` 산출 및 래퍼 렌더 확인. team bio는 `minCell=280`, `dense=false`; embedded pricing의 plan은 supporting=true 및 insetS; showcase/masonry는 각각 선언과 query CSS 출력; master-detail은 유효한 `container:detail/inline-size` 및 직접 자식 `.kit-md-grid` selector 출력. 극단 수치 40자에서는 `data-vl` 추정치가 상한 24로 포화되고 required 843px / maximum 480px 진단을 내며 텍스트는 보존한다. aside/gallery computed name과 실제 조건 분기 적용, 숫자 넘침은 여전히 **미검증**이며 관측된 위험으로 판단하지 않는다.

5. **보고서** — 이 파일에서 shorthand 결함 주장을 철회하고 W3C 문법 근거, 메인 제공 관측, 재현하지 못한 snapshot, 남은 미검증 범위를 기록했다.

## 실행 증거

```text
$ node --test tests/composition.test.mjs tests/composition-rollout.test.mjs tests/layout.test.mjs
ℹ tests 26
ℹ pass 26
ℹ fail 0
```

```text
$ node --test --test-name-pattern='all 2.1 templates preserve' tests/composition.test.mjs
✔ all 2.1 templates preserve the original complete compiler output byte for byte
ℹ pass 1
ℹ fail 0
```

```text
$ node --input-type=module  # 입력: contained-gallery-masonry/showcase, contained-pricing, long-team, dashboard-overview에서 40자 KPI로 변형
contained-gallery-masonry: aside minWidth 652; gallery data-design-kind 렌더; container:kit gallery/inline-size 출력
contained-pricing: plan supporting=true, inset=insetS (2개)
long-team: flow minCell=280, dense=false; data-flow-min="280" 렌더
extreme-metric: length=40; required=843, maximum=480, code=CONTENT_BUDGET_LIMIT
coverage: total=55, contextual=25, inherited=30
```

## 미실행 및 한계

- 브라우저 계산 스타일·실제 폭/넘침·캡처: **하지 않음** — 메인의 configured browser 회귀와 충돌하지 않도록 카드 지시대로 브라우저 탭을 다루지 않음.
- 전체 빌드, Vercel 상태/인증, 배포: **하지 않음** — 독립 검증 범위에서 금지/메인 담당.
- 실제 사용자 미감, 보조기술, 다른 브라우저·폰트: **하지 않음** — 이 실행에서 측정하지 않음.
