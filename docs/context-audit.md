# 맥락 기반 조립 감사 — 2026-11-16

기준 revision: `9d40328d65dbc06f4fb686a5672b1b60a36444b7` (작업 전 clean, `git pull --ff-only`: Already up to date).
기준 단위 테스트: 124 passed, 0 failed. 이 결과는 기능 회귀의 기준이며 시각 품질 판정이 아니다.

## 현재 디자인 결정 경로

`src/catalog/index.mjs`의 폐쇄형 Blueprint 문법 → `validate.mjs`의 형태·허용 간선·페이지 유형·축 금지·안전성 검사 → `tokens.mjs`의 팔레트별 대비 보정 → `render/nodes.mjs`의 의미 마크업 → `styles/index.mjs`의 토큰·축·셸·부품 chunk·polish·flow·spacing contract·tail CSS 순서다. `compiler.mjs`는 원본 입력을 복제하고 결과와 manifest를 만든다. CLI·조립기·단일 HTML 갤러리·전체 조합 갤러리가 같은 컴파일러를 소비한다.

| 영역 | 이미 존재하고 재사용한 것 | 실제 품질의 빈틈 |
|---|---|---|
| 타이포그래피 | `typography.mjs`: 18개 프리셋, 29개 역할, modular ratio, 굵기·자간·행간·한글 fallback, 역할별 최소 위계, lintType | 역할의 크기는 정해져 있어도 콘텐츠가 들어갈 폭을 확보하는 단계가 없다. 값 fit은 공간이 모자라면 라벨보다 작은 숫자를 만들 수 있다. |
| 문자열 폭 | `render/util.mjs`: `cplOf`, `vlOf`가 한글·영문·숫자의 가중치를 달리 계산하고 유한 bucket으로 양자화 | 히어로·지표 내부 fit에 쓰이지만 상위 그리드의 열 선택과 연결되지 않는다. 실제 글리프 측정이 아니며 플랫폼별 서체 차이는 남는다. |
| 간격 | `spacing.mjs`: 밀도별 4px 토큰, S01–S10 관계, 제목/설명/본문 계약, 중첩 표면·깊이 거부, lintSpacing | 내부 관계 체계 자체를 새로 만들 필요가 없다. 모든 표 셀의 16px, 폼 필드 20px처럼 일부 고정 값이 밀도와 분리돼 있다. |
| 컴포넌트 의미 | 상품 가격/평점/작성자/시각자료/featured plan, 상태·액션 계층이 이미 스키마와 renderer에 있다 | 상품은 별도 표현이 있지만 feature·업무 정보 카드의 강조 선택이 암묵적인 CSS 분기다. 결정 출처를 manifest에서 확인할 수 없다. |
| 배치 | `layout.mjs`: 컨테이너 flow·고아 줄 방지·내용 기반 bento; variant `fits`; 일부 section CQ | 기본 flow는 240px/24px, dense는 최소 폭에서 2열이다. 긴 숫자·밀도별 gap을 보지 않는다. form/split/hero의 일부는 viewport breakpoint를 쓴다. |
| 실제 가용 폭 | `:has(>[data-flow])`가 부모를 query container로 만든다 | main은 full/content 트랙을 함께 갖는다. main 1200px, 내부 grid 1136px인 경우 query는 1200px를 읽어 280px 최소 셀을 275px로 만든다. 단순 CQ 존재 여부로 실제 폭 대응을 주장할 수 없다. |
| 검증 | 단위·CLI·계약·bundle 동등성·재현성, layout/text/spacing probes, Playwright와 조합 등급 | 검사가 재는 하한과 시각적 완성도는 다르다. 아래 재현 3종에서 기존 probe 지적 대부분이 0이었다. 기존 조합 등급은 이전 revision의 관측이다. |

## 먼저 해결한 재현 사례

내용·선택한 테마·팔레트·축·뷰포트를 고정했다. 원본은 `evidence/context/inputs.json`, 변경 전 실측은 `before.json`, 85개 레거시 전체 출력 hash는 `legacy-hashes.json`이다. 실측은 이 macOS의 **설정된 브라우저 MCP Chromium 경로**에서 실행했다.

| 재현 | 조건 | 관측 | 원인과 조치 |
|---|---|---|---|
| 긴 KPI | dashboard, 390px, 한글 긴 라벨/큰 통화값 | 숫자 13.3718px, 라벨 14px, 카드 173px | dense 2열을 유지한 채 내부 fit만 축소. 값·라벨 폭 예산을 기존 flow의 최소 셀 폭으로 전달한다. |
| 보조 영역의 폼 | viewport 1440px, aside 300px, two-column | 입력 폭 107px, 긴 placeholder 일부만 보임 | viewport가 넓다는 이유로 2열. form content box가 두 입력 최소 폭과 gap을 수용할 때만 2열을 선택한다. |
| 보조 영역의 split | viewport 1440px, aside 안 section 300px | 카드 폭 126px, 한글 제목·본문이 기둥처럼 잘게 접힘, text probe 4건 | viewport 전환과 가용 폭 불일치. 정확한 할당 영역에서 기존 split 비율을 허용한다. |
| full/content 트랙 | 첫 변경 후 1440px, main 1200px / grid 1136px | 최소 셀 280px 선언에도 275px | 상위 컨테이너 폭을 자식 가용 폭으로 오인. grid/split의 `kit-layout-region`이 정확한 배정 폭을 제공한다. |

위 문제는 기존 허용 값만으로 재현된다. 소비자에게 다른 테마나 임의 CSS를 요구하는 방식은 공통 원인을 해결하지 못한다.

## 변경 책임 경계

새 범용 규칙 언어나 외부 패키지는 추가하지 않는다. 기존 type/spacing/flow를 유지하면서 `catalog/composition.mjs`의 작은 결정표와 `composition.mjs`의 사실 추출·폭 예산·CSS 연결을 추가한다. Blueprint 문법에는 임의 role·CSS·class·토큰·규칙 필드가 늘지 않는다. 카탈로그 작성자의 규칙과 소비자가 선택할 수 있는 입력은 계속 분리된다.

새 의미·출력은 카탈로그 **2.2.0**, 조립 정책 **1.0.0**으로 버전 고정한다. **2.1.0은 레거시 경로를 그대로 사용**한다. 85개 템플릿의 HTML·CSS·토큰·manifest를 포함한 전체 컴파일 결과를 변경 전 SHA-256과 비교한다. 상세 채택·충돌 처리·적용 범위는 `context-design.md`를 따른다.

## 아직 보증하지 않는 것

모든 55개 부품의 미감, 전체 4,955개 조합의 미감, 실제 iOS/Safari·스크린리더·사용자의 승인, 렌더링되지 않은 상태는 보증하지 않는다. 기존 SaaS 두 설명 열의 `MEASURE_SHORT` 2건은 실제 의도한 2열 안내 영역으로 관찰됐으며, 새 결함을 숨기기 위해 검사기에서 제외하지 않는다. 빈 공간이 많은 합성 fixture는 좁은 영역 재현이 목적이며 페이지 전체의 실서비스 배치 사례로 추천하지 않는다.
