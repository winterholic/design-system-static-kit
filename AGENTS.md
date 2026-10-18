# Static Kit 작업 계약

## 제품을 조립하는 에이전트

1. `site/v1/catalog.json`과 `site/v1/blueprint.schema.json` 또는 `src/catalog.mjs`를 읽는다.
2. 가까운 `examples/*.json`을 복사해 Blueprint만 편집한다. 방향→후보를 고른 뒤 셸·밀도·서체·반경을 목적에 맞게 고른다.
3. `npm run kit -- validate <input.json>` → `build <input.json> --out <managed-directory>` → `check <managed-directory>`를 실행한다.
4. 생성 HTML/CSS를 손으로 고치지 않는다. 모르는 속성을 추가하거나 CSS escape hatch를 만들지 않는다.
5. 규칙이 잘못됐으면 재현 입력과 화면 근거를 남겨 카탈로그 개정으로 처리한다. 임의로 오류를 무시하지 않는다.

## 시스템을 개발하는 에이전트

`docs/adr/0001-catalog-compiler.md`, `docs/architecture.md`, `docs/governance.md`를 먼저 읽는다. 문법은 catalog 한 곳에서 수정한다. 신규 동작은 실패하는 계약 테스트부터 쓴다. UI는 configured browser에서 검사하고, 로컬 브라우저 실행은 환경 정책을 따른다. `npm run verify`를 실행하고 산출물을 재생성한다. 카탈로그/검사기의 권한 우회 방지 한계를 숨기지 않는다. 사용자 승인이나 미감을 보증했다는 기록을 만들지 않는다.
