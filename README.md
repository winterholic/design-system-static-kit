# Design System Static Kit

**미리 정의한 디자인을 코드 규약 안에서 조립하는 도구.** 에이전트와 사람은 자유 CSS 대신 허용된 JSON 트리를 작성하고, 컴파일러는 조합·속성·버전·페이지 유형·접근성 대비를 검증해 정적 HTML을 만듭니다. 프롬프트가 아니라 **코드**가 강제합니다.

| 카탈로그 2.1 | 수량 | | 카탈로그 2.1 | 수량 |
|---|---|---|---|---|
| 템플릿 | 85 (구성 변형 405) | | 부품 | 55종 |
| 테마 | 54 (6분류, 테마 변형 162) | | 페이지 유형 | 16 |
| 팔레트 | 427 (색 계열 11, Coolors 인기 관측) | | 스타일 축 | 15 (모드 포함) |
| 레이아웃 셸 | 10 | | 아이콘 | 87 |
| 규칙 | 20 + 축 조합 금지 11 | | 대비 검사 | 89,670쌍 |

템플릿·테마·팔레트는 서로 독립이라 어느 조합도 고를 수 있고, 템플릿마다 구성 변형(히어로·기능 배열·카드 스타일·구역 리듬 등)이, 테마마다 변형 3개 이상이 얹힙니다.

수많은 조합이 곧 좋은 디자인 보증이라는 뜻은 아닙니다. 검토한 범위의 선택, 접근성의 하한, 개정 절차를 코드로 만듭니다.

## 보기

- **시각 조립기**: `npm run dev` 후 http://127.0.0.1:4173. 미리보기는 휴대폰·태블릿·데스크톱·맞춤 폭을 고정 폭으로 그려 영역에 맞춰 줄이므로 가로로 잘리지 않고, **새 창**과 **전체 화면 모달**로 크게 볼 수 있습니다. 카탈로그 탭에서 템플릿·테마·팔레트·부품의 실제 렌더를 보고 바로 조립을 시작합니다.
- **휴대폰용 단일 파일 갤러리**: `site/gallery/index.html` (컴파일러 포함, 오프라인). 템플릿·테마·부품·축을 열어 보고 테마·팔레트·모드·축을 바로 바꿔 봅니다. 금지 조합은 이유와 함께 거부되고 자동 수정 대안이 나옵니다.
- 설계서 [docs/design.html](docs/design.html) · 팔레트 근거 [docs/palettes.html](docs/palettes.html) · 간격 규칙 [docs/spacing.html](docs/spacing.html)

## 실행

Node.js 22 이상. 런타임 의존성·서버 API·AI 호출·외부 폰트 없이 동작합니다.

```sh
npm run dev        # 조립기 http://127.0.0.1:4173 (HTTP로 열어야 합니다)
npm run verify     # 계약 테스트 → 감사 → 문서 생성 → 사이트 빌드 → 재현 검사
npm run test:browser   # Playwright Chromium (조립기·3폭 오버플로·구조 접근성·키보드·갤러리)
npm run build      # site/ 생성 → GitHub Pages 등 정적 호스팅
```

## 에이전트 / CI

```sh
npm run kit -- templates                       # 85개 템플릿
npm run kit -- themes                          # 54개 테마와 추천 팔레트
npm run kit -- init saas-landing my.json trust # 템플릿 + 테마로 시작
npm run kit -- validate my.json
npm run kit -- build my.json --out artifacts/my-page
npm run kit -- check artifacts/my-page         # 수동 수정·추가·누락·symlink 거부
npm run kit -- migrate old-v1.json new.json    # 1.x → 2.0
```

출력은 `index.html`, `tokens.css`, `tokens.json`, `blueprint.json`, `manifest.json`입니다. 알 수 없는 속성은 조용히 버리지 않고 오류입니다. `style`, `className`, `html`, 임의 토큰 값, 잘못된 부모-자식 조합, 금지된 축 조합은 거부됩니다.

```json
{
  "version": "2.0", "catalogVersion": "2.1.0", "name": "제품 소개",
  "theme": "botanical", "palette": "forest", "mode": "auto", "pageType": "article",
  "shell": "topbar", "typography": "sans", "density": "comfortable", "radius": "soft",
  "control": "match", "elevation": "soft", "motion": "subtle", "icon": "line", "ornament": "organic",
  "backdrop": "tint", "width": "standard", "scale": "balanced", "weight": "medium", "footer": "columns",
  "chrome": {"nav": [{"label": "소개", "href": "#main"}], "footerLinks": [{"label": "문의", "href": "#main"}]},
  "tree": {"type": "page", "children": [
    {"type": "page-header", "title": "작은 선택에서 시작하세요."},
    {"type": "prose", "title": "만드는 이유", "body": "제품의 목적과 사용자를 먼저 정의합니다."}
  ]}
}
```

## 무엇을 조립하나

- **축 15개**: 모드(light·dark·auto), 셸 10, 서체 8, 밀도, 모서리 5, 컨트롤 모양, 깊이 6, 모션, 아이콘 6, 장식 5, 배경 4, 폭 4, 타입 스케일, 굵기, 푸터.
- **부품 55종**: 구조(히어로·페이지 제목), 레이아웃(섹션·그리드·2분할·본문+보조·벤토·탭·칸반·가로 줄), 콘텐츠(카드·요금제·FAQ·후기·팀·코드·기능 목록…), 데이터(표·목록·차트 5종·타임라인·달력·대화·목록+상세), 폼(13가지 필드), 피드백(알림 3변형·진행률·상태 화면 9종·스켈레톤), 미디어(이미지 자리 7종·갤러리), 내비(브레드크럼·페이지네이션·필터 바·단계·목차).
- **페이지 유형 16**: 랜딩·대시보드·데이터·목록·협업·문서·글·블로그·커머스·포트폴리오·요금제·폼·설정·인증·오류·일반. 유형마다 필수·금지 부품과 허용 셸·폭이 있습니다.

## 강제 범위

입력 문법·허용 간선·축 조합 금지·테마 금지 값·페이지 유형 계약·링크·데이터 일관성·대비(모든 팔레트×모드×역할)·생성 파일 일치. 카탈로그와 검사기 자체를 고칠 권한, 소비 앱의 바깥 CSS, GitHub 보호 브랜치는 컴파일러 밖의 경계입니다. 잘못된 규칙은 반례와 화면 근거로 개정하며 우회용 자유 스타일 속성을 만들지 않습니다.

## 문서

- [설계서](docs/design.md) · [팔레트 근거](docs/palettes.md) · [아키텍처](docs/architecture.md) · [규칙 개정](docs/governance.md)
- [ADR 0001 카탈로그 컴파일러](docs/adr/0001-catalog-compiler.md) · [ADR 0002 확장 설계](docs/adr/0002-axes-bans-page-types.md) · [ADR 0003 간격 계약](docs/adr/0003-spacing-contract.md) · [간격 규칙](docs/spacing.md) · [4차 템플릿·부품 레벨업](docs/template-system.md)
- [PMS/WBS](docs/wbs.md) · [출처·라이선스](docs/sources.md) · [검증 기록](docs/verification.md)
- 증거: [Coolors 관측 2026-10-18](docs/evidence/coolors-palettes.json) · [Coolors 인기 관측 2026-10-20(좋아요 수)](docs/evidence/coolors-popular-2026-10-20.json) · [대비 전수](docs/evidence/contrast.json) · [커버리지](docs/evidence/coverage.json)
- 보관 기록(배포 사이트에는 싣지 않음): [격차 분석](docs/archive/gap-analysis.md) · [동료 레포 축](docs/evidence/peer-axes.json)

## 출처와 라이선스

동료 [design-system-kit](https://github.com/yehsb123/design-system-kit)(AGPL-3.0)에서는 사전 정의 후 조립한다는 철학과 축의 이름·수량만 대조했고 **코드·토큰·CSS·문구·아이콘은 복사하지 않았습니다**. 이 저장소는 MIT로 독립 구현했습니다. 토큰·상태·접근성 원칙은 [winterholic-design-system](https://github.com/winterholic/winterholic-design-system)을, 색은 [Coolors](https://coolors.co) 렌더 페이지 관측(2026-10-18, 2026-10-20)을 따릅니다. 카카오 Katalog 원 발표의 구현 상세는 **확인 필요**입니다.
