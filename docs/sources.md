# 출처와 채택 범위

조사일 2026-10-18. 원문에서 확인한 사실과 설계 판단을 구분한다.

| 자료 | 확인한 근거 | 이번 저장소의 채택 |
|---|---|---|
| [yehsb123/design-system-kit](https://github.com/yehsb123/design-system-kit) · `a72f5b8e43d39b3fc69bff4acda9f6dd28d27ef1` | **AGPL-3.0**. README, `v1/systems.json`·`layouts.json`·`pages.json`·`icons.json`의 이름·수량·분류와 시스템 JSON의 모서리·버튼·굵기·그림자·아이콘 선·시그니처 값 | 사전 정의 → 조립 철학과 축의 이름·값의 범위·수량만 `docs/evidence/peer-axes.json`에 사실로 기록하고 격차 분석에 사용. **코드·토큰·CSS·문구·아이콘을 복사하지 않음.** 이 저장소는 독립 구현(MIT) |
| [winterholic/winterholic-design-system](https://github.com/winterholic/winterholic-design-system) | winterholic-base의 `04-shape-elevation`(반경 규칙·그림자), `05-motion`(지속·이징·reduced-motion), `07-states-feedback`(상태 목록), `08-accessibility`(대비·포커스·타깃), `09-dark-mode`, `12-page-patterns`(로그인·대시보드·목록·상세·폼·설정·랜딩·온보딩·오류) | 반경·깊이·모션 축의 값, 상태 부품, 페이지 유형 계약의 근거. 소비 제품의 브랜드를 임의로 재정의하지 않음 |
| 로컬 `frontend-design` 스킬, `spacing-layout.md`, `typography-color.md`, `korean-web.md` | 목적에 따른 선택, 획일적 기본값 반박, 간격의 관계, 한국어 행간·`keep-all` | 독립 선택 축, 한글 줄바꿈, 시스템 서체 폴백 |
| 로컬 `biz-design-system` 스킬, `html-report` 스킬 | 원시→의미→컴포넌트 토큰, 타입·셸·스킨의 직교 | 팔레트 원본 보존+의미색 보정, 축 분리, 문서 HTML 구성 |
| [Coolors](https://coolors.co/palettes/trending) | 일반 fetch는 403. 2026-10-18 호스트의 Playwright Chromium으로 렌더된 목록 페이지 41곳(trending·popular·태그별)을 스크롤하며 스워치 hex·페이지 이름·좋아요 수를 읽음. 최초 48개는 `ttakkari_browser` 스냅샷 | 814개 후보 목록을 `docs/evidence/coolors-palettes.json`에 저장하고 그중 160개를 테마에 배정(점수화 후 사람이 검토). 각 팔레트에 원본 URL·관측일·방법 보존. 유행 순위·저작자는 추정하지 않음. 이름·팔레트의 재사용 조건은 확인하지 않음 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) SC 1.4.3, 1.4.11, 2.5.8, 1.1.1, 2.4.4 | 텍스트·비텍스트 대비, 최소 타깃 24px, 대체 텍스트, 링크 목적 | 본문 4.5·7:1, 구조선·포커스·차트 3:1, 타깃 24px 검사, 대체 텍스트 필수, 모호한 링크 라벨 금지 |
| [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) | sandbox 권한 분리 | 미리보기·갤러리 allow-scripts + allow-forms, allow-same-origin 생략. 전송은 CSP로 차단 |

## UI 수준 상향 라운드의 레퍼런스 (2026-10-20)

구도·밀도·타이포·이미지 처리·마이크로 디테일의 원리만 읽었다. 코드·이미지·문구는 가져오지 않았다. 사이트별 읽은 내용은 `docs/ui-level-up.md` 9절.

| 사이트 | 확인한 것 |
|---|---|
| [Linear](https://linear.app), [Pricing](https://linear.app/pricing), [Login](https://linear.app/login) | 디스플레이 서체 수치, 제품 목업 밀도, 로고 줄, 카드 없는 요금 열, 체크 표시 비교표, 최소 로그인 |
| [Vercel](https://vercel.com), [Docs](https://vercel.com/docs), [Blog](https://vercel.com/blog), [Pricing](https://vercel.com/pricing) | 디스플레이 서체, 로고 줄, 문서 카드, 블로그 목록 위계 |
| [Stripe](https://stripe.com), [Blog](https://stripe.com/blog), [Docs](https://docs.stripe.com) | 이미지 비중, 디스플레이 서체(수치) |
| [Aesop](https://www.aesop.com/kr/), [29CM](https://www.29cm.co.kr), [무신사](https://www.musinsa.com), [Apple Store](https://www.apple.com/kr/shop/buy-iphone) | 상품 컷 배경, 카드 정보 순서, 이미지 우선 격자, 타일형 카드 |
| [Toss Tech](https://toss.tech), [Toss](https://toss.im) | 한국어 블로그 목록 위계, 한글 디스플레이 서체 |
| [Tailwind Docs](https://tailwindcss.com/docs/installation), [shadcn/ui Dashboard](https://ui.shadcn.com/examples/dashboard) | 문서 본문 폭과 문단 길이, 대시보드 밀도(수치 중심) |
| [Pentagram](https://www.pentagram.com/work), [GitHub 404](https://github.com/404) | 포트폴리오 격자 구조, 오류 화면의 상태 코드 |
| [Vercel web-interface-guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) | `theme-color` 메타, 탭 하이라이트, 숫자 정렬, reduced-motion 등 점검 규칙 |

## 팔레트 선정 방법

1. 렌더된 목록에서 4~10색 팔레트 814개를 수집했다.
2. 테마마다 목표 프로필(브랜드색 색상 범위, 채도, 평균 명도, 이름 키워드)을 정하고 점수화해 중복 없이 4개씩 자동 배정했다.
3. 사람이 결과를 읽고 어긋난 테마(시빅·트러스트·리얼티·브루탈·한지·스튜디오·헤리티지·클래리티·오션)는 후보를 직접 골랐다. 이 선정은 취향의 근사이며 검증된 미감이 아니다.
4. 브랜드 스워치는 가장 선명한 중간 명도 색을 자동 선택해 행에 명시했다. 기존 18개 팔레트는 이전 값을 유지했다.

## Katalog 조사 범위

사용자가 전달한 '카카오 컨퍼런스 Katalog'의 취지는 사전 정의한 카탈로그를 트리로 조립한다는 것이다. 공개 검색과 공식 if(kakao)26 홈페이지·시간표까지 확인했으나 그 정확한 명칭의 원 발표·코드는 확인하지 못했다. 따라서 **카카오 Katalog의 구현·효과를 검증한 사실로 인용하지 않는다(확인 필요)**. 이번 구조는 사용자가 설명한 철학과 확인한 저장소·스킬에서 독립 설계했다.

## 정본·진행 중 변경의 구분

참조 저장소에 다른 작업의 미커밋 변경이 있었다. 그 변경은 수정·정리·커밋하지 않으며, 문서 근거는 위 커밋의 내용을 기준으로 기록한다. 새 kit가 기존 제품 정본을 대체하거나 기존 디자인시스템을 자동 동기화한 것은 아니다.
