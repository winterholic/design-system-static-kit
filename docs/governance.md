# 규칙 개정과 소비 프로젝트 적용

1. 재현: 어느 Blueprint·카탈로그 버전·상태·뷰포트에서 문제가 있는지 기록한다. 기존 규칙의 의도와 실제 결과를 연결한다.
2. 판단: 기존 변형(variant)·축 값으로 해결되는지 먼저 본다. 표현의 의미가 새로우면 부품을, 시각 변형이면 variant나 축 값을, 함께 쓰면 안 되는 조합이면 금지 조합을, 제품 고유 도메인이면 버전 고정 어댑터를 설계한다.
3. 수정: `src/catalog/`와 필요한 렌더러·CSS 조각만 바꾸고, 정상 fixture와 실패 fixture를 먼저 추가한다. 임시 `style`, `className`, `html` 속성은 만들지 않는다. 새 축 값은 구현표(`src/styles/base.mjs`)와 enum이 함께 있어야 테스트를 통과한다.
4. 검증: `npm run verify`, `npm run test:browser`, 실제 색 쌍, 모바일·키보드·긴 텍스트. 판정한 범위와 미검증을 `docs/verification.md`에 기록한다.
5. 배포: 카탈로그 버전과 CHANGELOG를 함께 올린다. 이전 Blueprint는 자동 변환하지 않는다. `kit migrate`(1.x→2.0처럼 새 필수 필드만 더하는 변환)나 명시적인 catalogVersion 변경과 재검증으로 옮긴다.

카탈로그 2.3.0은 타이포그래피 리비전 2(한글 기준 자간·행간·크기 상한·서체 짝, `docs/typography.md`)를 적용하고 2.1.0·2.2.0 입력은 리비전 1 출력을 바이트 단위로 유지한다(고정 hash: `docs/evidence/context/legacy-hashes.json`, `docs/evidence/typography-refine/legacy-2-2-hashes.json`). composition은 1.2.0 그대로다. 카탈로그 2.2의 호환 창: 2.1.0 입력은 당시 출력 경로를 유지한다. 2.2.0 입력만 composition 1.0.0을 적용한다. `kit migrate`의 2.1→2.2 변환은 catalogVersion만 바꾸고 원본 tree·축을 보존한다. 기존 출력 전체를 변경 전 85개 템플릿 hash와 대조한다. 그 외 지원하지 않는 버전은 계속 거부한다. 상세 규약은 `context-design.md`. 카탈로그 2.4.0은 레이아웃 리비전 2(고정 개수 격자의 흐름 불변식, 칸 폭 연동 제목 크기, 역할 기준 줄바꿈, 폼 필드 짝, 칸 높이 흡수; `docs/layout.md`)를 적용하며, 2.1.0~2.3.0 입력은 출력을 바이트 단위로 유지한다(2.3.0 고정 hash: `docs/evidence/layout-refine/legacy-2-3-hashes.json`). 출력이 바뀌는 규약 수정은 이전 카탈로그 버전의 출력을 고정한 뒤 새 카탈로그 버전으로만 낸다.

같은 카탈로그 2.4.0은 구성 변형 결과 계약(V01~V05)과 페이지 규칙(P01~P04, composition 1.3.0)을 더하고 2.1.0·2.2.0·2.3.0 입력의 출력을 바이트 단위로 유지한다(고정 hash: `docs/evidence/variants/legacy-2-3-hashes.json`, ADR 0006). 새 변형 옵션은 결과 계약에 걸리는지 `scripts/design-qa/contract-verify.mjs`로 DOM과 대조하고, 계약에 걸린 옵션은 지우지 않고 추천에서만 뺀다.

## 팔레트·테마를 추가할 때

- 팔레트는 Coolors 렌더 페이지에서 관측한 것만 쓴다. `docs/evidence/coolors-palettes.json`에 관측 항목을 더하고 `src/catalog/palette-rows.mjs`에 행을 추가한다. 감사가 증거 파일과 대조한다.
- 테마는 분류·설명·기본 축 프로필·금지 값·팔레트 3개 이상이 필요하며 기본 프로필은 다른 테마와 같을 수 없고 모든 금지 조합을 통과해야 한다.
- 모든 팔레트는 모든 모드에서 대비 게이트를 통과해야 컴파일된다. 팔레트의 색을 보정하려면 원색을 바꾸지 말고 토큰 해석 규칙을 개정한다.

## 금지 조합을 추가할 때

`id, uses, bad, why, source, fix`를 모두 적는다. `why`에는 접근성·가독성·구조상의 이유를, `source`에는 출처를 쓴다. 취향만으로 조합을 금지하지 않는다. 감사가 `uses` 선언과 `fix`의 자기 해결을 증명한다.

## 기존 winterholic-design-system과의 관계

이 kit는 새 디자인시스템을 정해진 문법으로 파생하기 위한 독립 조립기다. 기존 앱의 AIP·따까리·stock-gosu 브랜드 정본을 자동 대체하지 않는다. 해당 시스템의 컴포넌트·도메인 토큰을 수입하려면 source commit → 역할 매핑 → 허용 부품 → 대비/상태 검증의 어댑터를 별도로 작성한다. 원본 디자인시스템의 소유 결정이 kit의 일반 기본값보다 우선한다.

## 강제성 운영

CI 필수 검사, 보호 브랜치, CODEOWNERS, 사용 카탈로그 버전 pinning을 소비 저장소에서 설정한다. 이 저장소는 코드와 CI를 제공하며 GitHub 관리 정책을 강제로 설정하지 않는다. 규칙이 틀렸을 때는 규칙의 근거와 반례를 고치는 것이 정규 경로다. 실패 결과를 프롬프트로 덮거나 생성물을 손수 고치는 것은 다음 생성에서 사라진다.

## 후속 확장

React/Vue 어댑터, 모달·토스트 같은 상태 있는 위젯, 기존 제품별 브랜드 수입기, 다중 페이지 링크를 추가할 수 있다. 현재 제공 범위인 정적 부품 55종과 입력 확인 데모를 운영 서비스 전체 기능으로 오인하지 않는다.
