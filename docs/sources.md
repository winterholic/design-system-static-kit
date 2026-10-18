# 출처와 채택 범위

조사일 2026-10-18. 원문에서 확인한 사실과 설계 판단을 구분한다.

| 자료 | 확인한 근거 | 이번 저장소의 채택 |
|---|---|---|
| [yehsb123/design-system-kit](https://github.com/yehsb123/design-system-kit) · `a72f5b8e43d39b3fc69bff4acda9f6dd28d27ef1` | README 및 `src/library.html`, `src/builder.html`, `src/generator.html`의 모음집·조립기·생성기 분리, 선택을 출력에 연결하는 방식 | 사전 정의 → 조립 철학. **AGPL-3.0 코드를 복사하지 않고** 독립 구현. 토큰·레이아웃 값도 가져오지 않음 |
| [winterholic/winterholic-design-system](https://github.com/winterholic/winterholic-design-system) · `6d4b27cce40c5d73749ec276ef92017d14b94df9` | README, winterholic-base의 `tokens/src/dimension.json`, `typography.json`, `docs/12-page-patterns.md`; ttakkari `docs/00-decision-guide.md` | 토큰 정본 → 생성 산출물; 역할별 타이포, 4px 간격, 카드 내부/외부 거리, 44px 터치 타깃, 읽는 폭720, 컨테이너1280, 상태·대비·거버넌스. 원본 소비 제품의 브랜드를 임의 재정의하지 않음 |
| 로컬 `frontend-design` 스킬 및 `spacing-layout.md`, `typography-color.md`, `korean-web.md` | 목적에 따른 선택, 획일적 기본값 반박, 간격의 관계, 한국어 행간·IME·원자적 역할 | 독립 선택 축, 라벨·필드·그룹 간격, 한글 keep-all과 fallback, 상태 내장 |
| 로컬 `biz-design-system` 스킬 | 원시→의미→컴포넌트 토큰, 접근성 내장, 채택/기여 거버넌스 | 원본 팔레트 보존+의미색 보정, 스키마 정본과 확장 절차 |
| 로컬 `html-report` 스킬 | 타입·셸·스킨의 직교와 기본값 수렴 방지 | 조립기의 방향·구조·밀도 축 분리; 계획서는 design/doc/blueprint로 작성 |
| [Coolors trending](https://coolors.co/palettes/trending) | 일반 웹 fetch 403. 설정된 ttakkari_browser 경로로 실제 렌더된 48개 색상 그룹을 추출하고 그중 18개를 선택. `docs/evidence/coolors-palettes.json`의 관측 수치와 카탈로그 후보를 대조 | 6방향 × 후보3. 원본 hex/원본 팔레트 URL/선정 이유/관측일 저장. light/dark 의미색은 별도로 보정. 후보의 유행순위·저작자를 추정하지 않음 |
| [WCAG 2.2 SC1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [SC1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 실제 명도 대비 기준과 반올림으로 합격시키지 않는 기준 | 본문4.5:1, 구조선/포커스3:1. 계산 결과 그대로 게이트 판정 |
| [MDN iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox) | sandbox 권한 분리 | 미리보기 allow-scripts + 네이티브 폼 검증용 allow-forms, allow-same-origin 생략. 전송은 CSP로 차단. 임의 HTML을 받지 않는 별도 입력 경계 유지 |

## Katalog 조사 범위

사용자가 전달한 ‘카카오 컨퍼런스 Katalog’의 취지는 사전 정의한 카탈로그를 트리로 조립한다는 것이다. 공개 검색에서 `Katalog/kakao`, 한글 카탈로그·디자인시스템을 조사하고, 공식 if(kakao)26 홈페이지 → DAY1/DAY2 시간표까지 확인했으나 그 정확한 명칭의 원 발표·코드는 확인하지 못했다. 따라서 **카카오 Katalog의 구현·효과를 검증한 사실로 인용하지 않는다**. 이번 구조는 사용자가 설명한 철학과 확인한 저장소/스킬에서 독립 설계했다. 정확한 발표가 확보되면 출처 검토 후 확장할 수 있다.

## 정본·진행 중 변경의 구분

참조 저장소에 다른 작업의 미커밋 변경이 있었다. 그 변경은 수정/정리/커밋하지 않으며, 문서 근거는 위 커밋의 내용을 기준으로 기록한다. 새 kit가 기존 제품 정본을 대체하거나 기존 디자인시스템을 자동 동기화한 것은 아니다. 브랜드 어댑터가 필요하면 버전 고정 수입·매핑·대비 재검증 단계를 추가한다.
