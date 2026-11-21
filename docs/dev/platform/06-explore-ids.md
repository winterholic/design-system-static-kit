# Explore 디자인 ID와 Studio 링크 계약

기준 브랜치 `next/explore`. 구현은 `apps/web/features/explore/id.ts`이며 목록, 상세, 렌더·Blueprint 경로, Studio 링크가 모두 이 함수를 공유한다. ID의 값은 카탈로그 정의와 `./edit`의 문서 생성 인자에서 온다.

## ID 형식

디자인 ID는 템플릿 ID에서 시작한다. 선택값은 `~`로 구분하며, 단일 축은 `키_값`, 구성 슬롯은 `슬롯_옵션` 형식이다.

```text
<template>[~theme_<theme>][~variant_<variant>][~palette_<palette>][~mode_<mode>][~<slot>_<option>...]
```

정준 순서는 `theme`, `variant`, `palette`, `mode`, 구성 슬롯이다. 슬롯은 참조 객체에 들어온 순서를 따르며, 같은 ID 안에서 키는 한 번만 쓴다. 키와 값은 소문자 ASCII 영문·숫자와 내부 하이픈만 허용한다. `variant`는 `theme`과 함께 쓴다. 구문 파서는 카탈로그 존재 여부를 확인하지 않으며, 실제 탐색은 `curatedDesigns()`에 있는 ID만 유효하게 취급한다.

예:

```text
saas-landing
saas-landing~theme_aurora~variant_clean-saas
dashboard-overview~theme_console~mode_dark
```

템플릿 ID 뒤의 `~`와 `_`는 경로 안에 그대로 둔다. ID는 쿼리 문자열이 아니므로 `%` 인코딩을 직접 붙이지 않는다. 개별 값에 대시를 쓰는 방식으로 구분자 충돌을 막는다.

## Studio URL

`studioHref(ref)`는 `/studio`에 다음 매개변수를 만든다.

| 키 | 의미 | 직렬화 |
|---|---|---|
| `template` | 시작 템플릿 ID | 항상 |
| `theme` | 테마 ID | 선택 시 |
| `variant` | 테마 변형 ID | 선택 시 |
| `palette` | 팔레트 ID | 선택 시 |
| `mode` | 표시 모드 | 선택 시 |
| `layout` | 슬롯과 옵션 | `slot:option,slot:option` |

쿼리 키·값은 `URLSearchParams`로 인코딩한다. `layout`의 콜론과 쉼표는 사람이 읽기 좋게 URL에서 유지한다. 비어 있는 선택은 주소에 기록하지 않는다. Studio는 이 값을 `resetDocument` 인자로 받아 같은 Blueprint를 만들고, `mode`는 문서를 만든 뒤 `setAppearance`로 적용한다. 페이지는 Blueprint를 직접 조립하지 않는다.

## 화면·컴파일 계약

- `/explore/<id>`는 목록에서 선택된 카탈로그 ID만 열고, ID가 없으면 HTTP 404를 낸다.
- `/explore/<id>/render`는 상세 미리보기·목록 썸네일·새 창이 공유하는 경로다. 응답 본문은 `compileBlueprint(doc, {include:['html']}).value.html`과 바이트가 같아야 한다.
- `/explore/<id>/blueprint.json`은 같은 `buildDocument(ref)` 결과를 JSON으로 반환한다.
- Studio 링크는 상세 ID에서 파싱한 선택값을 유지한다. 기본 템플릿이면 템플릿만 넘기고, 테마·변형·팔레트·모드·구성 슬롯이 있으면 해당 선택도 넘긴다.
- 목록·상세 폭 선택은 `device=mobile|desktop` 쿼리에 둔다. 기본 데스크톱은 `device`를 생략한다. 미리보기는 1280px 또는 390px 기준으로 컴파일된 문서를 축소해 보여 준다.

구현 계약은 `apps/web/e2e/explore-components-home.spec.mjs`와 `apps/web/e2e/explore-fidelity.spec.mjs`에서 라우트 상태, HTTP 바이트, Studio 쿼리를 확인한다.
