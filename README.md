# Design System Static Kit

**미리 정의한 디자인을 코드 규약 안에서 조립하는 도구.** 에이전트는 자유 CSS 대신 허용된 JSON 트리를 작성하고, 컴파일러는 조합·속성·버전·접근성 대비를 검증해 정적 HTML을 만듭니다.

6개 테마 × Coolors 팔레트 후보 3개, 4개 셸, 3개 서체, 3개 밀도, 3개 반경. 노드 13종과 화면 예제 4종(`examples/*.json`)을 조합합니다. 수많은 조합이 곧 좋은 디자인 보증이라는 뜻은 아닙니다. 검토한 범위의 선택과 개정 절차를 코드로 만듭니다.

## 실행

Node.js 22 이상. 런타임 의존성·서버 API·AI 호출·외부 폰트 없이 동작합니다.

```sh
npm run dev
# http://127.0.0.1:4173 — 파일 더블클릭 대신 HTTP로 엽니다.
npm run verify
npm run build
# site/를 GitHub Pages 등 정적 호스팅에 올립니다.
```

시각 조립기에서 테마·후보·리듬을 고르고 트리에 부품을 추가/이동/삭제합니다. 노드 JSON 또는 전체 설계 JSON을 수정할 수 있습니다. 유효 설계만 브라우저에 저장하며 오류 시 마지막 유효 결과를 유지하고 내보내기를 막습니다. HTML 다운로드는 CSS와 고정 데모 런타임을 포함한 한 파일입니다.

## 에이전트 / CI

```sh
npm run kit -- init dashboard my-page.json
npm run kit -- validate my-page.json
npm run kit -- build my-page.json --out artifacts/my-page
npm run kit -- check artifacts/my-page
npm run kit -- catalog
npm run kit -- schema
```

출력: `index.html`, `tokens.css`, `tokens.json`, `blueprint.json`, `manifest.json`. `check`는 입력을 재컴파일해 수동 수정·추가·누락·symlink를 거부합니다. 알 수 없는 속성을 조용히 버리지 않습니다. `style`, `className`, `html`, 임의 토큰 값, 잘못된 부모-자식 조합은 오류입니다.

```json
{
  "version": "1.0", "catalogVersion": "1.0.0", "name": "제품 소개",
  "theme": "botanical", "palette": "forest", "mode": "light",
  "shell": "topbar", "typography": "sans", "density": "comfortable", "radius": "soft",
  "tree": {"type": "page", "children": [
    {"type": "page-header", "title": "작은 선택에서 시작하세요."},
    {"type": "prose", "title": "만드는 이유", "body": "제품의 목적과 사용자를 먼저 정의합니다."}
  ]}
}
```

문법: page / page-header / section / grid / card / metric / table / list / form / prose / hero / notice / actions. `grid`에는 card·metric·list·notice만 들어갑니다. table/list는 loading·empty·error·partial·forbidden을 내장합니다. form은 서버 저장이 없는 **입력 형식 확인 데모**입니다. 상호작용 앱 전체를 생성하는 제품은 아닙니다.

## 정본과 확장

- [설계·기획·수용 기준](docs/plan.html) · [ADR](docs/adr/0001-catalog-compiler.md) · [PMS/WBS](docs/wbs.md)
- [아키텍처와 강제 경계](docs/architecture.md) · [규칙 개정·브랜드 연결](docs/governance.md)
- [출처·라이선스 구분](docs/sources.md) · [검증 기록](docs/verification.md)
- [팔레트 원본 관측](docs/evidence/coolors-palettes.json) · [대비 전수 결과](docs/evidence/contrast.json)

문법 정본은 `src/catalog.mjs`, 공유 API는 `src/compiler.mjs`입니다. JSON Schema에는 구조가, runtime validator에는 교차 필드 규칙이 있습니다. 스키마만 검사하고 통과라고 판단하지 마세요. 배포 산출물은 `site/v1/catalog.json`, `site/v1/blueprint.schema.json`, `site/examples/`입니다.

동료 [design-system-kit](https://github.com/yehsb123/design-system-kit)의 사전 정의 후 조립 철학과 [winterholic-design-system](https://github.com/winterholic/winterholic-design-system)의 정본·토큰·상태 규칙을 참고했습니다. 동료 저장소의 AGPL 코드를 복사하지 않고 MIT로 독립 구현했습니다. Coolors 색상은 원본과 보정값을 나눠 추적합니다. 카카오 Katalog 원 발표의 구현 상세는 미확인입니다.

검사기 자체를 바꾸는 쓰기 권한, 소비 앱의 바깥 CSS, GitHub 보호 브랜치는 컴파일러 밖의 경계입니다. CI 필수 검사와 카탈로그 버전 pinning을 함께 적용하세요. 잘못된 규칙은 반례와 화면 근거로 개정하며, 우회용 자유 스타일 속성을 만들지 않습니다.
