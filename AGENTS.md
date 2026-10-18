# Static Kit 작업 계약

## 제품을 조립하는 에이전트

1. `npm run kit -- templates`, `themes`로 선택지를 보고 `site/v1/catalog.json` 또는 `src/catalog/`를 읽는다. 값은 카탈로그에 있는 것만 쓴다.
2. 가까운 템플릿으로 시작한다: `npm run kit -- init <template> my.json [theme]`. 방향 → 테마 → 팔레트 후보 → 셸·서체·밀도·모서리 등 축을 목적에 맞게 고른다. 후보가 같은 디자인만 나오지 않게 팔레트와 축을 번갈아 고른다.
3. `npm run kit -- validate my.json` → `build my.json --out <managed-directory>` → `check <managed-directory>`를 실행한다. 오류의 경로와 규칙 ID(예: `AXIS_BAN X01`, `PAGE_REQUIRE`)를 읽고 카탈로그 안의 대안으로 고친다.
4. 생성 HTML/CSS를 손으로 고치지 않는다. 모르는 속성을 추가하거나 CSS escape hatch를 만들지 않는다. 금지 조합을 우회하려고 다른 값을 흉내 내지 않는다.
5. 규칙이 잘못됐으면 재현 입력과 화면 근거를 남겨 카탈로그 개정으로 처리한다. 임의로 오류를 무시하지 않는다.
6. 1.x 입력은 `kit migrate`로 변환한다.

## 시스템을 개발하는 에이전트

`docs/adr/0001-catalog-compiler.md`, `docs/adr/0002-axes-bans-page-types.md`, `docs/architecture.md`, `docs/governance.md`를 먼저 읽는다. 문법은 `src/catalog/`에서 수정한다. 새 축 값은 구현표(`src/styles/base.mjs`)와 enum을 함께 둔다. 새 금지 조합은 `uses`·`why`·`source`·`fix`를 적는다. 신규 동작은 실패하는 계약 테스트부터 쓴다. UI는 Chromium에서 검사한다(`npm run test:browser`). `npm run verify`를 실행하고 산출물(`site/`, `docs/*.html`, `docs/evidence/`)을 재생성해 함께 커밋한다. 카탈로그/검사기의 권한 우회 방지 한계를 숨기지 않는다. 사용자 승인이나 미감을 보증했다는 기록을 만들지 않는다. 동료 저장소(AGPL-3.0)의 코드·토큰·CSS·문구·아이콘은 복사하지 않는다.
