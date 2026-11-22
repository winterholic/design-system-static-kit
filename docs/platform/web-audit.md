# 웹 감사: 현재 apps/web의 사용자 관점 문제

감사일 2026-11-22. 대상은 `main` 771a8624c의 `apps/web`(Next.js 16.4.6)을 로컬에서 `next build` 후 `next start -p 4421`로 띄운 것이다. 배포 사이트(https://design-system-static-kit.vercel.app)는 열어 보지 않았고, 아래 결과는 로컬 빌드 기준이다(확인 필요: 배포본이 같은 커밋인지).

브라우저는 Playwright Chromium이다. Firefox와 WebKit은 돌리지 않았다. 따라서 "뒤로 가기" 항목은 Chromium 동작이다.

코드는 읽기만 했다. 줄 번호는 위 커밋 기준이다. 다른 작업자가 `src/`와 `apps/web`을 바꾸는 중이라 번호가 밀릴 수 있다.

## 0. 재현 자료

| 종류 | 위치 |
|---|---|
| 스크린샷 | `docs/platform/web-audit/before/` (페이지 21개 × 데스크톱 1440, 모바일 390 = 42장, 재현 증거 4장) |
| 캡처 스크립트 | `docs/platform/web-audit/scripts/capture.mjs` |
| Studio 반영 실험 | `scripts/studio-probe.mjs`, `compile-probe.mjs`, `color-probe.mjs`, `repro-shots.mjs` |
| Studio 동작 시험 | `scripts/studio-behavior.mjs`, `history-probe.mjs`, `history-stale-probe.mjs` |
| 모바일 넘침 측정 | `scripts/overflow-probe.mjs` |

스크립트는 `BASE=http://127.0.0.1:4421 node docs/platform/web-audit/scripts/<이름>.mjs`로 돌린다. 서버를 먼저 띄워야 한다.

파일 이름은 `<페이지>.d1440.png`(데스크톱), `<페이지>.m390.png`(모바일)이다. 모든 전체 높이 캡처다.

주의: Explore 목록의 아래쪽 카드가 빈 상자로 찍힌다. 썸네일이 화면 근처에 올 때만 iframe을 만들기 때문이다(`features/explore/Thumb.tsx:22`). 캡처 방식의 한계로 보이며 실제 스크롤 때 채워지는지는 따로 확인하지 않았다(확인 필요).

모바일 390 폭에서 가로 넘침은 측정한 17개 경로 모두 0px이었다(`overflow-probe.mjs`). 레이아웃이 깨지는 문제보다 정보 구조와 반영 결함이 핵심이다.

## 1. 페이지별 문제 목록

심각도는 사용자가 "이 사이트로 디자인을 고르고 조합한다"는 목적을 이루는 데 주는 방해 정도다. 상, 중, 하로 적는다.

### 1.1 Home (`/`, `app/page.tsx`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| H1 | 상 | 첫 화면 메시지가 "디자인 컴파일러"이고 본문이 규약 설명이다. h1과 리드는 "카탈로그가 허용한 값", "대비 검사", "같은 바이트의 HTML"을 말한다. | `app/page.tsx:14-15`, `home.d1440.png` |
| H2 | 상 | 기술 규약 4항과 CLI 명령 블록이 본문 중간을 차지한다. "허용된 값만 / 대비 검사 / 맥락 규칙 / 같은 입력, 같은 출력"과 `npm run kit -- init ...` 코드. | `app/page.tsx:40-57` |
| H3 | 중 | 체험으로 가는 CTA(Explore, Studio)가 쇼케이스와 iframe 아래 두 번째 영역에 있다. 맨 아래 CTA는 "시작 가이드"와 "GitHub"다. | `app/page.tsx:26-38`, `59-63` |
| H4 | 중 | Materials, Components로 가는 진입이 홈 본문에 없다. 상단 메뉴로만 간다. | `app/page.tsx` 전체, `lib/nav.ts:6-13` |
| H5 | 하 | 쇼케이스 6개와 iframe 1개가 코드에 고정되어 있다. 보는 사람이 바꿔 볼 수 없다. | `features/home/Showcase.tsx:7-9`, `app/page.tsx:23` |

### 1.2 Materials 개요 (`/materials`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| M1 | 상 | 개요가 "카드 3장과 건수 요약 + 링크"다. 색 카드는 "시드 13개, 토큰 257개", 타이포 카드는 "네 가지 프리셋", 기초 재료 카드는 "13개 축, 아이콘 87개"로 끝난다. 재료를 고르거나 비교하는 동작이 없다. | `app/materials/page.tsx:19-37`, `materials.d1440.png` |
| M2 | 상 | 재료가 "목록"에 그친다. 색 페이지는 시드, 램프, 토큰 표 순으로 이어지는 읽기용 카탈로그이고 팔레트를 고르는 개념이 없다. 팔레트는 `static-kit` 하나로 고정이다. | `app/materials/color/page.tsx:23-77`, `src/service/materials-query.mjs:23-24`, `features/materials/materials.server.ts:33-35` |
| M3 | 상 | 레지스트리가 가진 것 중 일부만 보인다. ADR 0011에 서체 프리셋 18, 테마 54, 레거시 팔레트 427이 있다. 화면은 타이포 프리셋 4개와 팔레트 1개를 보여 준다. 레거시 팔레트는 권리 감사 때문에 의도적으로 뺐다(`materials.server.ts:7`). | `docs/adr/0011-materials-contract.md`, `app/materials/page.tsx:27` |
| M4 | 하 | 모바일에서 `/materials/foundations`에 높이 32px 미만 링크·버튼이 14개다. | `overflow-probe.mjs` 출력 |

### 1.3 Materials 색 (`/materials/color`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| MC1 | 상 | 팔레트를 골라 서브토큰 세트(역할, 상태, 부품 색)가 어떻게 달라지는지 비교하는 화면이 없다. 라이트·다크 비교(`ModeCompare`)는 같은 팔레트의 두 모드일 뿐이다. | `app/materials/color/page.tsx:58-60`, `features/materials/ModeCompare.tsx` |
| MC2 | 중 | 대비 검사 표와 토큰 257행이 본문 후반을 채운다. 사람이 보는 첫 단위가 토큰 이름과 CSS 변수다. 모바일 페이지 높이 14,172px. | `color/page.tsx:61-77`, `features/materials/ColorExplorer.tsx`, `overflow-probe.mjs` |
| MC3 | 중 | 토큰 행은 서로 참조(`refs`)를 가지지만, 사용자에게는 "어울리는 재료"나 "추천 이유"가 아니라 의존 목록으로만 나온다. | `features/materials/materials.server.ts:77` |

### 1.4 Materials 타이포그래피 (`/materials/typography`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| MT1 | 상 | 프리셋을 한 번에 하나만 본다(`?preset=`). 같은 문장을 네 프리셋으로 나란히 그리는 비교가 없다. 프리셋 간 비교는 크기·굵기 숫자 표다. | `app/materials/typography/page.tsx:26`, `92-109` |
| MT2 | 중 | 사용자가 자기 문구를 넣어 볼 수 없다. 시험 문구 13개는 Core가 정한 고정 목록이다. | `typography/page.tsx:66-75` |
| MT3 | 중 | 서체 엔진은 프리셋에 묶여 있다. 타이포가 팔레트와 독립된 시스템으로 선택되지만 서체 자체는 독립 재료가 아니다. Studio로는 `typeRoles` 하나만 넘어간다. | `features/materials/studio-link.ts:11-12`, `typography/page.tsx:59` |
| MT4 | 하 | 역할 메타(크기·굵기·행간·자간·줄바꿈 정책)가 샘플과 같은 비중으로 나온다. | `typography/page.tsx:55-61` |

### 1.5 Materials 기초 재료 (`/materials/foundations`, `/materials/foundations/[axis]`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| MF1 | 중 | 값 행에서 "쓸 수 없음"의 이유가 진단 코드로만 나온다. `기본 문서에서는 쓸 수 없습니다 · {code}`. 왜 안 되는지, 대신 무엇이 되는지 말이 없다. | `app/materials/foundations/[axis]/page.tsx:44` |
| MF2 | 중 | 축 값을 고르고 Studio로 가는 한 방향만 있다. 값 두 개를 같은 화면에 놓고 비교하는 동작이 없다. | `foundations/page.tsx:26-36`, `[axis]/page.tsx:33-47` |

### 1.6 Components (`/components`, `/components/[id]`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| C1 | 상 | 목록은 부품 64장이 구조 그룹별로 나열된 카드다. 카드 메타 줄이 내부 필드다: `type · 2.6.0 · component · form-data-feedback · 맥락 any · 재료 변형 6축 · 변형 N`. 디자인 패밀리 단위의 묶음과 비교가 없다. 모바일 높이 20,036px. | `app/components/page.tsx:18-30`, `components.d1440.png` |
| C2 | 상 | 상세 페이지의 본문 대부분이 규약이다. 미리보기 아래로 재료 계약, 변형·기본값 표, 적용 토큰(`--kit-*`), 제약 코드(`BTN_LOADING_NO_SLOT` 등), 허용 속성 표, 허용 부모·자식, Blueprint 예제가 이어진다. `button-control`은 1440폭에서 5,546px. | `app/components/[componentId]/page.tsx:47-111`, `components-button-control.d1440.png` |
| C3 | 중 | 반응형(넓게/좁게 375px) 토글과 변형 select는 2.6.0 재료 부품에만 있다. 기존 부품 55개는 variant 칩만 있고 모바일 미리보기가 없다. | `features/components/ComponentPreview.tsx:44-64` |
| C4 | 중 | 상태(hover, pressed, loading, disabled)와 크기를 나란히 보는 화면이 없다. select로 하나씩 바꿔 iframe 하나를 다시 그린다. | `ComponentPreview.tsx:47-54`, `65` |
| C5 | 중 | 금지 조합은 일부만 사전 반영된다. select 옵션별 가능 여부는 다른 축을 기본값으로 둔 채 하나씩 시험 렌더해서 정한다. 두 축을 함께 고른 조합(예 `behavior=toggle` + `state=pressed`는 되지만 `action` + `pressed`는 안 됨)은 고른 뒤 `fetch(src)`가 실패해야 "이 조합은 Core에서 지원하지 않습니다"가 나온다(코드로 추정, 시험 안 함). | `features/components/spec.server.ts:119-122`, `ComponentPreview.tsx:25-35`, `66` |
| C6 | 중 | 코드 내보내기가 Blueprint JSON 복사뿐이다. 선택한 변형의 HTML·CSS 조각을 내려받는 길이 없다. | `[componentId]/page.tsx:107-111`, `features/components/CopyBlock.tsx` |
| C7 | 하 | 단독 렌더가 없는 부품은 `about-team` 템플릿 위에 올려 보여 준다. 미리보기 안에서 부품이 아니라 템플릿이 먼저 보인다. | `spec.server.ts:132`, `components-button-control.d1440.png` |

### 1.7 Explore (`/explore`, `/explore/[designId]`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| E1 | 중 | 카드 메타에 내부 값이 그대로 나온다: `복합 대표 디자인 · 팔레트 pearl · 모드 dark · hero:product`. | `app/explore/page.tsx:44` |
| E2 | 중 | 256개를 24개씩 11쪽으로 나눠 보여 준다. "마음에 드는 디자인을 후보로 모아 비교"하는 동작이 없다. | `app/explore/page.tsx:28`, `list-query.ts`, `explore.d1440.png` |
| E3 | 중 | 상세가 구성 표(템플릿, 테마, 팔레트, 모드, 구성 변형)와 Blueprint JSON이다. 팔레트나 타이포를 바꿔 같은 화면에 다시 그리는 동작이 없고 다음 단계는 "Studio에서 열기" 하나다. | `app/explore/[designId]/page.tsx:52-68`, `42-45` |
| E4 | 하 | 목록의 모든 카드가 살아 있는 iframe(근접 시)이다. 미리 만든 이미지가 없다. | `features/explore/Thumb.tsx:6-8` |

### 1.8 Studio (`/studio`)

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| S1 | 상 | 시작 화면이 "기본 템플릿 / 2.6.0 템플릿 / 템플릿 고르기 / JSON 가져오기 / Design Profile"이다. 페이지 유형과 디자인 방향을 고르는 단계가 없고, "2.6.0"이라는 내부 버전이 버튼 이름이다. | `features/studio/components/StartScreen.tsx:19-28`, `studio-start.d1440.png` |
| S2 | 상 | 재료를 바꿔도 화면이 그대로인 경우가 있다(아래 2절 R1, R2, R3). | 2절 |
| S3 | 상 | 후보 비교가 없다. 문서와 미리보기가 하나이고, 다른 테마·팔레트를 보려면 바꾼 뒤 실행 취소를 눌러야 한다. 디자인 탭은 select 나열이다(스타일 축 select 다수). | `features/studio/components/DesignPanel.tsx:84-134` |
| S4 | 중 | 모바일(390)에서 미리보기가 기본으로 데스크톱 1280 폭을 28%로 축소해 보여 준다. 글자를 읽을 수 없다. | `features/studio/model.ts:62`(`device: 1280`), `PreviewPane.tsx:38-41`, `studio-preview-pane.m390.png` |
| S5 | 중 | 모바일 툴바가 두 줄을 차지한다(실행 취소, 다시 실행, 더보기, 편집, 미리보기). 작업 영역이 작아진다. | `features/studio/components/Toolbar.tsx:39-54`, `studio-doc.m390.png` |
| S6 | 중 | 사용자 편집 덮어쓰기 확인창이 영향을 보여 주지 않는다. 주소의 요청 인자(`template=app-landing`)만 나열한다. 어떤 필드가 바뀌고 어떤 콘텐츠를 잃는지 없다. Core의 `diffDocs`, `contentDiff`는 웹에서 쓰지 않는다. | `features/studio/components/Dialogs.tsx:31-43`, 3절 O1 |
| S7 | 중 | 미리보기는 `sandbox=""` iframe이라 화면을 눌러 요소를 고를 수 없다. 콘텐츠 수정은 구조 트리와 필드 폼으로만 한다. | `features/studio/components/PreviewPane.tsx:72-73` |
| S8 | 중 | 편집할 때마다 브라우저 history 항목이 늘어 뒤로 가기가 무반응으로 쌓인다(3절 B3). | `PreviewPane.tsx:72`(주석은 늘지 않는다고 적음) |
| S9 | 하 | 디자인 탭 문구가 내부 용어를 쓴다: "2.6.0 Materials", "Design Profile", `palette-260-note`. | `DesignPanel.tsx:101`, `122-125` |

### 1.9 Docs, Integrations

| ID | 심각도 | 문제 | 근거 |
|---|---|---|---|
| D1 | 중 | 두 메뉴가 같은 층에 있다. Docs(가이드, Core 레퍼런스)와 Integrations(CLI, REST, MCP)는 모두 개발자용인데 플랫폼 메뉴 6개 중 2개를 차지한다. 디자이너용 흐름(Explore, Materials, Components, Studio)과 구분이 없다. | `lib/nav.ts:6-13` |
| D2 | 하 | `/docs`가 "시작 가이드와 Core 레퍼런스"를 한 목록에 섞는다. | `app/docs/page.tsx:7-19` |

## 2. Studio 반영 결함 재현

방법: 같은 컨트롤을 바꾸고 (a) `localStorage`의 저장 문서 필드와 (b) 미리보기 `srcdoc`의 SHA-256, (c) `/api/v1/compile`이 돌려준 `tokens`와 `html`의 해시를 비교했다. 같은 해시는 출력이 같다는 뜻이다. 음성 대조로 영향이 있는 변경(타이포, 구 문서 팔레트)에서는 해시가 달라지는 것을 같은 스크립트에서 함께 확인했다.

### R1. Design Profile 선택은 문서 필드만 바꾼다

재현 절차:

1. `/studio?template=saas-landing&catalogVersion=2.6.0&tab=design`을 연다.
2. "2.6.0 Materials"의 "Design Profile"에서 `saas-landing`을 고른다.
3. 미리보기가 바뀌었는지 본다.

관찰:

- 저장 문서에 `"profile":"saas-landing"`이 들어간다.
- 미리보기 iframe 캡처의 PNG 해시: before `8a069f1994`, after `8a069f1994`. 동일.
- 같은 문서를 `/api/v1/compile`에 직접 보내도 `html` 해시 `f93245403f`, `css` `ba2f7fc3cc`, `tokens` `bab9108e3e`가 `profile` 유무와 상관없이 같다.
- 같은 문서에서 `typeRoles=erp`를 넣으면 해시가 `3c6bc2103f`로 바뀐다. 측정이 변화를 잡는다는 대조다.

원인 코드:

| 위치 | 내용 |
|---|---|
| `apps/web/features/studio/components/DesignPanel.tsx:131-132` | 프로파일 select의 `onChange`가 `setMaterial` 의도만 보낸다. |
| `apps/web/features/studio/model.ts:228-235` | `setMaterial`은 `importBlueprint`로 `profile` 필드만 문서에 쓴다. 프로파일의 패턴·밀도·축을 문서에 풀어 넣지 않는다. |
| `src/validate.mjs:61-63` | `profile`은 검증(`profileErrors`)에만 쓰인다. |
| `src/compiler.mjs`, `src/tokens.mjs` | `b.profile`을 읽는 줄이 없다. 컴파일 출력에 영향이 없다. |
| `apps/web/features/studio/model.ts:168-172` | 반대로 "Design Profile로 시작"은 `assembleBlueprint`로 문서를 새로 만들어 화면이 바뀐다. 같은 프로파일인데 시작할 때와 도중에 고를 때 결과가 다르다. |

이 화면의 안내문은 "기존 배치와 스타일은 프로파일 선택만으로 바뀌지 않습니다"라고 적는다(`DesignPanel.tsx:124`). 설명은 있지만 선택지가 효과가 있는 것처럼 보인다.

증거: `before/repro-profile-260-before.d1440.png`, `repro-profile-260-after.d1440.png`.

### R2. 2.6.0 문서에서 팔레트와 테마를 바꿔도 색은 그대로다

재현 절차:

1. `/studio?template=saas-landing&catalogVersion=2.6.0&tab=design`을 연다.
2. 테마를 `aurora`로 바꾼다.
3. 저장 문서의 `palette`와 컴파일된 색 토큰을 비교한다.

관찰(`color-probe.mjs`):

| 단계 | 문서 `palette` | 색 토큰 해시 |
|---|---|---|
| 시작(trust) | `serene-blue` | `bab9108e3e` |
| 테마 aurora | `turquoise-harmony` | `bab9108e3e` (동일) |
| 테마 neon | `neon-glow-party` | `cfe2013c28` (neon이 다크 모드를 강제해 모드 때문에 바뀐 값이다) |

문서 메타데이터의 `palette`는 바뀌지만 색은 `static-kit`에서 나온다. 같은 문서에서 `palette`만 `pearl`, `ocean`으로 바꿔 컴파일해도 해시가 같다(`compile-probe.mjs`).

URL로도 같다. `/studio?template=saas-landing&palette=pearl&catalogVersion=2.6.0`은 `palette=pearl`을 문서에 쓰지만 색은 `static-kit`이다.

원인 코드:

| 위치 | 내용 |
|---|---|
| `src/catalog/expression.mjs:18-21` | `colorPaletteOf`가 2.6.0 이상이면 항상 `static-kit`(또는 `colorPalette`)을 돌려준다. |
| `src/tokens.mjs:39-43` | `internal`이 있으면 `b.palette`를 읽기 전에 return한다. |
| `apps/web/features/studio/components/DesignPanel.tsx:100-102` | 2.6.0 문서는 팔레트 select를 숨기고 안내문만 보여 준다. |
| `apps/web/features/studio/model.ts:99-103` | `themeChange`가 `palette: 'theme-default'`로 `setTheme`을 불러 `palette` 필드를 바꾼다. 2.6.0에서는 이 값이 쓰이지 않는다. |
| `apps/web/features/studio/model.ts:175-194` | URL 시작 요청의 `palette`를 그대로 `resetDocument`에 넘기고, 뒤이어 2.6.0으로 올리며 `colorPalette: static-kit`을 덮는다. |

반대로 2.4.0 문서에서는 팔레트가 반영된다. `palette=pearl`로 바꾸면 해시가 `9e2f143172`에서 `ceb9cbedfe`로 바뀐다(`studio-probe.mjs`). 같은 UI인데 문서 버전에 따라 효과가 있고 없다.

### R3. 구 문서에서 타이포 재료를 고르면 조용히 2.6.0으로 올라가고 색이 되돌아간다

재현 절차:

1. `/studio?template=saas-landing&tab=design`을 연다(문서 버전 2.4.0).
2. 팔레트를 `pearl`로 바꾼다.
3. "역할 타이포그래피"에서 `erp`를 고른다.

관찰(`color-probe.mjs` B):

| 단계 | 문서 | 색 토큰 해시 |
|---|---|---|
| 시작 | v2.4.0, `serene-blue` | `3625cedef6` |
| 팔레트 pearl | v2.4.0, `pearl` | `1ba893ceae` |
| 타이포 erp | **v2.6.0**, `colorPalette=static-kit`, `palette`는 여전히 `pearl` | `bab9108e3e` |

문서 버전이 올라가고 팔레트 select가 사라지며 색이 `static-kit`으로 바뀐다. 문서의 `palette`는 `pearl`로 남아 있어 저장 데이터만 보면 pearl을 쓰는 것처럼 보인다. 사용자에게 사전 영향 안내는 없다.

원인 코드: `features/studio/model.ts:228-235`(`setMaterial`이 `catalogVersion: '2.6.0'`, `colorPalette`를 함께 쓴다), `DesignPanel.tsx:46-48`(`trials`가 `catalogVersion: '2.6.0'`으로 시험).

### R4. 정상 동작(비교용)

| 변경 | 결과 |
|---|---|
| 역할 타이포 `erp` ↔ `marketing` | html 해시 변경(`3c6bc2103f` ↔ `25ab8dd7fb`) |
| 문서 색 모드 라이트 → 다크 | html·tokens 해시 변경 |
| 2.4.0 문서에서 테마 변경 | `palette`와 색 토큰이 함께 바뀜(`3625cedef6` → `7a139be80f`) |
| 스타일 축(`radius` 등) | html 해시 변경, 실행 취소로 복구 |

## 3. Studio 동작 시험

시험 스크립트: `studio-behavior.mjs`, `history-probe.mjs`, `history-stale-probe.mjs`. 모두 새 브라우저 컨텍스트에서 돌렸다.

### 3.1 URL 상태, 새로고침, 뒤로 가기

| ID | 시험 | 관찰 | 판정 |
|---|---|---|---|
| B1 | 시작 인자(`?template=saas-landing`) 도착 | 문서를 만든 뒤 주소가 `/studio`로 바뀐다 | 의도대로(`StudioApp.tsx:59`) |
| B2 | 탭 전환 | `/studio?tab=design` 등 push | 정상 |
| B3 | 문서 편집(테마, 축) 후 주소 | 주소 불변. 문서는 주소에 없다 | 공유 불가(B8) |
| B4 | 기기 폭 390 | `device=390` replace(항목 안 늘어남) | 정상 |
| B5 | 미리보기 색 보기(다크로 보기), 맞춤/100% | 주소에 없음. 새로고침하면 "문서 설정대로"로 돌아간다 | 상태 유실(경미) |
| B6 | 새로고침 | 저장 문서, 탭, 기기 폭은 유지. 선택 노드도 저장 | 정상 |
| B7 | 새로고침 후 실행 취소/다시 실행 | 둘 다 비활성. 기록은 메모리에만 있다 | 한계 |
| B8 | 같은 주소(`/studio?tab=design`)를 새 브라우저에서 열기 | 시작 화면(`Studio`, 문서 없음) | 작업을 링크로 공유할 수 없음 |
| B9 | 탭을 `design → check → structure`로 누른 뒤 뒤로 | `tab=check`로 돌아가고 문서는 그대로 | 정상 |
| B10 | 편집 직후 항목 수 | `history.length`가 편집마다 1씩 늘어난다(테마 변경 +1, 축 변경 +1, 다크로 보기 +1, 실행 취소 +1). 탭 전환은 +1 | **결함** |
| B11 | Explore 상세 → Studio → 디자인 탭 → 테마 변경 후 뒤로 3번 | `/studio?tab=design`(변화 없음) → `/studio` → Explore 상세. 첫 번째 뒤로가 무반응 | **결함** |
| B12 | 뒤로 가기가 미리보기만 과거로 되돌리는가 | 되돌리지 않는다. 문서, 미리보기 `srcdoc`, iframe 실제 DOM 길이가 같다(`history-stale-probe.mjs`) | 화면 불일치는 없음 |

B10, B11의 원인으로 보이는 코드: `PreviewPane.tsx:73`이 이미 로드된 iframe의 `srcDoc`을 바꾼다. 같은 줄 위 주석(`72`)은 history를 늘리지 않는다고 적지만 Chromium에서는 늘었다. 원인 확정은 하지 않았다(확인 필요: iframe을 `key`로 새로 만들면 항목이 안 늘어나는지, 다른 브라우저에서도 같은지).

### 3.2 저장과 복구

| ID | 시험 | 관찰 | 판정 |
|---|---|---|---|
| P1 | 편집 후 상태 표시 | `수정됨 · 브라우저에 저장됨` | 정상 |
| P2 | 저장값을 `{broken`으로 손상 후 새로고침 | "저장된 작업을 읽을 수 없어 자동 저장을 멈췄습니다" 배너. 저장값은 지우지 않는다. 원본 JSON 내보내기 버튼 있음 | 정상 |
| P3 | "저장값 초기화" | 저장값 `null`, 시작 화면 | 정상 |
| P4 | 스키마 버전 99로 교체 후 새로고침 | "저장 형식 버전이 99입니다(이 Studio는 1만 읽습니다)." | 정상 |
| P5 | 두 탭이 같은 저장소를 편집 | 오래된 탭에 "다른 탭에서 저장한 작업이 있어 자동 저장을 멈췄습니다" 배너, 저장된 값은 다른 탭의 것(`workspace`) | 정상 |
| P6 | 작업 중 주소가 새 시작 상태를 요청(`?template=app-landing`) | 확인창 "작업 중인 문서가 있습니다". 확인 전에는 적용 안 함 | 보호는 정상. 영향 표시는 없음(S6) |
| P7 | 확인창에 표 또는 목록이 있는가 | 0개. 영향 요약 없음 | **미흡** |

시험하지 않은 것: 저장소 사용 불가(시크릿 모드 등)와 용량 초과(`QuotaExceededError`), 옛 조립기 키 가져오기. 코드(`storage.ts:61-72`, `boot.ts:34-40`)만 읽었다. 미실행: 브라우저 설정 변경이 필요하다.

### 3.3 실행 취소와 다시 실행

| ID | 시험 | 관찰 | 판정 |
|---|---|---|---|
| U1 | 편집 2회(테마 변경, `radius=square`) | 실행 취소 활성, 다시 실행 비활성 | 정상 |
| U2 | 실행 취소 2번 | 테마 `trust`로 복귀, `picked`(직접 고른 축) `{}`로 복귀 | 정상 |
| U3 | `Ctrl+Shift+Z` | 테마 `aurora`로 다시 실행 | 정상 |
| U4 | `Ctrl+Z` | 테마 `trust` | 정상 |
| U5 | 되돌린 상태가 저장되는가 | 저장 문서의 `theme`이 `trust`(화면과 일치) | 정상 |
| U6 | 실행 취소 뒤 새 편집 | 다시 실행 기록이 지워진다 | 일반적 동작 |
| U7 | 새로고침 | 기록 유실(B7) | 한계 |
| U8 | 입력 칸 안의 `Ctrl+Z` | 브라우저 기본 동작에 맡김 | `StudioApp.tsx:135` 코드 확인, 시험 안 함 |

기록 상한은 200단계이고 같은 키의 연속 입력은 2초 안에 한 단계로 합친다(`model.ts:292`, `342`).

## 4. REST, MCP가 노출하는 기능과 Core에서 빠진 기능

### 4.1 REST `/api/v1`

`GET /api/v1/openapi.json`으로 확인한 목록이다.

| 메서드 경로 | 기능 | Core 함수 |
|---|---|---|
| GET `/api/v1/catalog` | 카탈로그 부분 조회(`kind`, `filter`, `query`, `fields`, `limit`, `cursor`) | `listCatalog` |
| GET `/api/v1/themes` | 테마 목록 | `listCatalog(kind=themes)` |
| GET `/api/v1/components` | 부품 목록 | `listCatalog(kind=components)` |
| GET `/api/v1/components/{id}` | 부품 명세 | `getComponentSpec` |
| GET `/api/v1/schema` | JSON Schema(`blueprint`, `component`, `chrome`, `diagnostic`, `edit-ops`) | `getSchema` |
| POST `/api/v1/validate` | Blueprint 검증 | `validateBlueprint` |
| POST `/api/v1/compile` | 컴파일(`html`, `css`, `tokens`, `manifest`, `files`) | `compileBlueprint` |
| POST `/api/v1/explain` | 결정 설명 | `explainDecisions` |
| GET `/api/v1/openapi.json` | 이 문서 | |

`kind`는 `templates, themes, palettes, components, pageTypes, axes, concepts, recipes, icons, rules, axisBans, layoutSlots` 12종이다. 근거: `apps/web/lib/api/operations.mjs:59-134`.

### 4.2 MCP `/api/mcp`

`tools/list`로 확인한 도구 6개다. 모두 읽기 전용이다(`readOnlyHint`).

| 도구 | REST 대응 |
|---|---|
| `list_design_system` | `/catalog` |
| `get_design_schema` | `/schema` |
| `get_component_spec` | `/components/{id}` |
| `validate_blueprint` | `/validate` |
| `compile_design` | `/compile` (기본은 HTML 본문 없이 요약) |
| `explain_design_decisions` | `/explain` |

근거: `apps/web/lib/api/mcp.mjs:30-70`. REST와 MCP의 기능 범위는 같다.

### 4.3 REST와 MCP가 못 하는 것(실측)

| ID | 관찰 | 근거 |
|---|---|---|
| A1 | 조회 계열은 카탈로그 **2.4.0**만 제공한다. `?catalogVersion=2.6.0`은 `CATALOG_VERSION` 오류로 거부된다. | `GET /api/v1/components/button-control?catalogVersion=2.6.0` → `요청한 catalogVersion(2.6.0)과 서버가 조회로 제공하는 값(2.4.0)이 다릅니다`. `apps/web/lib/api/versions.mjs:11-21` |
| A2 | 2.6.0 재료 부품(`button-control`, `select-control` 등)의 명세를 가져올 수 없다. | `GET /api/v1/components/button-control` → `UNKNOWN_COMPONENT` |
| A3 | `filter[catalogVersion]=2.6.0`을 줘도 목록에 2.6.0 부품이 `since`와 함께 나오지 않는다(첫 3건이 `page`, `page-header`, `hero`, `since: null`). | `GET /api/v1/components?filter[catalogVersion]=2.6.0&limit=3` |
| A4 | 반면 compile과 validate는 2.6.0 문서를 처리한다. 읽는 쪽만 막혀 있고 쓰는 쪽은 열려 있어, 에이전트가 2.6.0 재료를 발견할 수 없다. | `compile-probe.mjs`가 2.6.0 문서로 성공 |
| A5 | 재료 계열(`listMaterials`, `getMaterial`, `queryMaterials` 색·타이포·기초)은 REST, MCP 어디에도 없다. | 4.4 |

### 4.4 Core 기능 대비 노출 현황

Core 공개 진입점은 `@winterholic/design-system-static-kit/service`, `/edit`이다(`package.json` exports). 웹 열은 `apps/web` 코드에서 해당 이름을 grep한 결과다.

| Core 기능 | 웹 화면 | REST | MCP | 비고 |
|---|---|---|---|---|
| `listCatalog`, `getSchema`, `getComponentSpec` | 서버 컴포넌트(Explore, Components, Docs) | 예 | 예 | A1~A3 |
| `validateBlueprint`, `compileBlueprint` | Studio | 예 | 예 | |
| `explainDecisions` | **없음** | 예 | 예 | Studio에 "왜 이렇게 됐나" 화면이 없다. `manifest.design.decisions`가 있는데 사용자에게 안 보인다. |
| `queryMaterials` (color, typography, foundations) | Materials 서버 | **없음** | **없음** | |
| `getMaterial` | Studio 부품 시작, Components 서버 | **없음** | **없음** | |
| `getColorTokens`, `getTypePresets` | Studio 디자인 탭 | **없음** | **없음** | |
| `listMaterials` | **없음** | **없음** | **없음** | 재료 레지스트리를 종류·분류·맥락·품질로 거르는 질의가 어디에도 없다. |
| `assembleBlueprint` | Studio 시작("Design Profile로 시작") | **없음** | **없음** | 프로파일 조립이 에이전트에 안 열려 있다. |
| `catalogSnapshot` | Docs, Explore 서버 | **없음** | **없음** | |
| `applyOp`와 편집 연산 11종(`setTheme`, `setPalette`, `setAppearance`, `setLayoutVariant`, `updateNode`, `insertNode`, `removeNode`, `moveNode`, `replaceTemplate`, `importBlueprint`, `resetDocument`) | Studio(브라우저) | **없음** | **없음** | 에이전트는 문서 전체를 다시 써야 한다. 무손실 편집이 REST·MCP에 없다. |
| 선택 가능성 판정(`themeChoices`, `themeVariantChoices`, `paletteChoices`, `modeChoices`, `axisChoices`, `layoutChoices`, `addPlacements`) | Studio 디자인 탭 | **없음** | **없음** | Components의 금지 조합 사전 반영에 쓸 수 있는데 Components는 자체 시험 렌더를 쓴다(C5). |
| `insertableParts`, `partTypesAt` | **없음** | **없음** | **없음** | |
| `diffDocs`, `contentDiff`, `contentFingerprint`, `keepsContent`, `sameContent` | **없음** | **없음** | **없음** | 덮어쓰기 영향 표시(S6)에 필요한 재료가 이미 있다. |
| `checkDocument`, `applySequence`, `checkSequence`, `GRADES` | `/dev/qa/combos`(내부 QA)만 | **없음** | **없음** | 품질 등급(strong, quality, diagnostic)이 사용자 화면에 없다. |
| 조합 탐색(`src/combos.mjs`, `combo-grades.mjs`) | `/dev/qa/combos`(상단 메뉴에 없음) | **없음** | **없음** | `/explore/combos`는 여기로 리다이렉트된다(`app/explore/combos/page.tsx`). |
| 프로파일 데이터(`PROFILES`, `PATTERNS`, `INTENT_KEYS`) | Studio가 프로파일 id만 select | **없음** | **없음** | 프로파일이 무엇을 정하는지(패턴, 밀도, 축) 어디에도 안 보인다. |
| CLI `migrate`, `check`, `init`, `catalog`, `themes`, `templates` | **없음** | **없음** | **없음** | `migrate`(버전 올리기)는 Studio의 JSON 가져오기 `upgrade` 체크박스로만 부분 대응한다. |

2.6.0 조립에 쓰이는 `src/materials/registry.mjs`의 `search`, `filter`, `counts`와 재료 간 `dependencies`, `parent`, `children` 관계는 Materials 화면 어디에서도 질의로 쓰이지 않는다. `ADR 0010 assembly-platform`이 만드는 팔레트-서브토큰, 패밀리, 추천 모델은 아직 없다(이 문서 작성 시점에 `docs/adr/`에 해당 파일이 없다).

## 5. 사용자 관점 요약

| 질문 | 현재 답 |
|---|---|
| 첫 화면에서 무엇을 할 수 있는지 알 수 있나 | 아니오. "컴파일러"를 설명한다(H1, H2). |
| 재료를 골라 비교해 볼 수 있나 | 아니오. 읽는 목록이다(M1, M2, MT1). |
| 부품을 서로 비교하고 코드로 가져갈 수 있나 | 부분적. 변형을 하나씩 보고 JSON을 복사한다(C4, C6). |
| Studio에서 바꾼 것이 화면에 반영되나 | 대체로 예. 프로파일과 2.6.0 팔레트·테마의 색은 아니오(R1~R3). |
| 작업을 잃지 않나 | 새로고침과 손상 복구는 강하다. 다른 사람과 공유하거나 기록을 새로고침 뒤에 되돌릴 수는 없다(B7, B8). |
| 덮어쓰기 전에 영향을 알 수 있나 | 아니오. 인자만 나열한다(S6, P7). |
