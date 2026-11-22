# 플랫폼 타이포그래피 시스템

플랫폼 경로(ADR 0012 §2)의 타이포 재료와 등록 시스템을 정리한다. 구현은 `src/platform/type.mjs`(결합·검사), `src/platform/data/type-materials.mjs`(서체 짝·역할 체계), `src/platform/data/type-systems.mjs`(시스템 기록·적합성)에 있다.
표는 코드에서 생성한다(`node docs/platform/evidence/type/tables.mjs --write`). 손으로 고치면 `tests/platform-type-evidence.test.mjs`가 어긋남을 잡는다.

## 1. 구조

타이포 시스템 = **서체 짝(facePairing) × 역할 크기 체계(roleScale) × 숫자 정렬(numerals)**. 세 값은 서로 독립이고 id 문자열로 참조한다(계약의 `type-system` 필드).

| 축 | id | 가진 것 | 갖지 않은 것 |
|---|---|---|---|
| 서체 짝 | `face-pairing:*`(또는 구형 `type-preset:*`) | 제목·본문·UI·숫자·코드 스택, 선택 웹폰트 | 크기·행간·자간 |
| 역할 크기 체계 | `role-scale:*`(또는 구형 `type-role-preset:*`) | 역할 9개(display·heading·sub·body·small·label·caption·numeric·code)의 모바일·데스크톱 px, 굵기, 행간, 자간 | 서체 |
| 숫자 정렬 | `tabular` · `proportional` | `--kit-nums` (모두 `lining-nums`) | |

- 2.6.0 컴파일은 역할형 프리셋이 서체까지 덮어써서 서체 축 선택이 사라진다(감사 Q2, 실제 서체 짝 3개). `bindType`은 서체를 서체 짝에서만, 크기·굵기·행간·자간을 역할 체계에서만 가져와 이 덮어쓰기를 하지 않는다.
- 서체 짝과 역할 체계는 시스템 기록과 따로 **다대다**다. 한 서체 짝이 여러 시스템에, 한 시스템이 여러 스타일 맥락에 쓰일 수 있고, 어느 서체 짝이든 어느 역할 체계와도 결합을 시도한다. 한도에 걸리는 결합만 거부한다(§6).
- `type-preset × type-role-preset` 결합은 2.6.0 값을 그대로 낸다(`type-system:tech-erp`). 그 밖의 결합은 역할 9개를 모바일(390px)·데스크톱(1280px) px로 결합하고, 두 폭 사이는 선형 보간(`clamp(모바일px, calc(…), 데스크톱px)`)이다.
- `src/typography.mjs`와 `src/materials/typography.mjs`는 읽기만 한다. 2.6.0 `typeRoles` 출력의 바이트는 `tests/platform-type.test.mjs`가 해시로 고정한다.

### 만드는 변수

플랫폼 경로의 새 시스템은 엔진이 읽는 변수에 더해 역할별 변수를 낸다. `tech-erp`(구형 결합)는 예전 변수 집합 그대로다.

| 변수 | 값 |
|---|---|
| `--kit-heading` · `--kit-font` · `--kit-mono` | 제목·본문·고정폭 스택 |
| `--kit-t-title` `--kit-t-app` `--kit-t-heading` `--kit-t-sub` `--kit-t-body` `--kit-t-small` `--kit-t-label` `--kit-t-caption` `--kit-t-stat` `--kit-t-price` | 역할 크기. title·app은 display, stat·price는 numeric. **app은 엔진 한글 상한 36px로 막는다** |
| `--kit-hw` · `--kit-line` | 제목 굵기, 본문 행간 |
| `--kit-lh-title` `--kit-lh-display` `--kit-lh-heading` `--kit-lh-sub` · `--kit-tr-title` `--kit-tr-display` `--kit-tr-heading` `--kit-tr-sub` `--kit-tr-label` | 행간·자간(엔진 변수) |
| `--kit-case-label` · `--kit-nums` | 라벨 대소문자, 숫자 정렬 |
| `--kit-code-size` · `--kit-code-lh` · `--kit-font-ui` · `--kit-font-num` | 코드 역할 크기·행간, 라벨·캡션용 서체, 숫자용 서체 (새 변수, 현재 엔진 CSS는 읽지 않는다) |
| `--kit-type-<역할>-size` `-weight` `-leading` `-tracking` | 역할 9개의 전체 값(굵기 포함) |

## 2. 등록한 시스템 14개

`type-system:tech-erp`는 구형 조합을 옮긴 기존 기록이고, 나머지 13개가 맥락별로 설계한 시스템이다. id 접두가 용도다: `work-`(업무·대시보드), `doc-`(문서·에디토리얼), `mkt-`(마케팅), `shop-`(커머스), `mobile-`(모바일). 용도마다 2개 이상이다(업무 2·문서 3·마케팅 3·커머스 2·모바일 3). **이미 낸 id는 바꾸지 않는다.** 다른 작업은 이 id를 `prefers`의 대상으로 쓴다.

<!-- type-table:systems -->
| id | 용도 | 페이지 유형 | 서체 짝 | 역할 체계 | 밀도 | 숫자 |
| --- | --- | --- | --- | --- | --- | --- |
| `type-system:doc-essay` | document | article, blog, docs, community | `face-pairing:editorial` | `role-scale:doc-essay` | spacious | proportional |
| `type-system:doc-handbook` | document | docs, article, blog, general | `face-pairing:humanist-system` | `role-scale:doc-handbook` | comfortable | tabular |
| `type-system:doc-newsroom` | document | article, blog, listing, community | `face-pairing:newsroom` | `role-scale:doc-newsroom` | comfortable | tabular |
| `type-system:mkt-atelier` | marketing | landing, portfolio, commerce | `face-pairing:luxe` | `role-scale:mkt-atelier` | spacious | proportional |
| `type-system:mkt-brand` | marketing | landing, portfolio, pricing, general | `face-pairing:geometric` | `role-scale:mkt-brand` | spacious | proportional |
| `type-system:mkt-launch` | marketing | landing, pricing, auth, general | `face-pairing:grotesk` | `role-scale:mkt-launch` | comfortable | tabular |
| `type-system:mobile-app` | mobile | general, auth, form, settings, commerce, community, listing, error | `face-pairing:rounded` | `role-scale:mobile-app` | comfortable | tabular |
| `type-system:mobile-feed` | mobile | community, listing, commerce, general, blog | `face-pairing:humanist` | `role-scale:mobile-feed` | compact | tabular |
| `type-system:mobile-reader` | mobile | article, blog, docs, community | `face-pairing:bookish` | `role-scale:mobile-reader` | spacious | proportional |
| `type-system:shop-boutique` | commerce | commerce, portfolio, landing | `face-pairing:serif` | `role-scale:shop-boutique` | comfortable | proportional |
| `type-system:shop-catalog` | commerce | commerce, listing, pricing | `face-pairing:condensed` | `role-scale:shop-catalog` | compact | tabular |
| `type-system:tech-erp` | work | dashboard, data, listing, settings | `type-preset:tech` | `type-role-preset:erp` | compact | tabular |
| `type-system:work-console` | work | dashboard, data, listing, settings, form | `face-pairing:grotesk-system` | `role-scale:work-console` | compact | tabular |
| `type-system:work-insight` | work | dashboard, data, listing | `face-pairing:geometric-system` | `role-scale:work-insight` | comfortable | tabular |
<!-- /type-table:systems -->

`페이지 유형`은 조립 때 거르는 하드 조건이다(`recommend`의 `context` 필터, 요구 시 `P_ATTR_CONTEXT`). 어느 서체 짝이든 `(제목, 본문)` 스택 쌍이 서로 다르다는 것을 테스트가 고정한다.

### 2.1 역할 크기(모바일→데스크톱 px)

<!-- type-table:sizes -->
| 시스템 | display (px) | heading (px) | sub (px) | body (px) | small (px) | label (px) | caption (px) | numeric (px) | code (px) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `doc-essay` | 34→56 | 24→32 | 19→22 | 17→19 | 14→15 | 12→13 | 12→13 | 17→19 | 14→15 |
| `doc-handbook` | 30→44 | 22→28 | 17→19 | 16→17 | 14 | 12→13 | 12 | 16→17 | 14→15 |
| `doc-newsroom` | 30→48 | 22→30 | 18→20 | 16→17 | 13→14 | 12 | 12 | 16→18 | 13→14 |
| `mkt-atelier` | 34→60 | 24→36 | 18→22 | 16→17 | 14 | 12 | 12 | 24→36 | 13→14 |
| `mkt-brand` | 36→72 | 26→40 | 18→22 | 17→19 | 14→15 | 12→13 | 12→13 | 28→44 | 13→14 |
| `mkt-launch` | 34→56 | 24→36 | 17→20 | 16→17 | 14 | 12→13 | 12 | 32→48 | 13→14 |
| `mobile-app` | 28→36 | 22→26 | 18→19 | 17 | 15 | 13 | 12 | 24→28 | 14 |
| `mobile-feed` | 26→32 | 20→24 | 16→17 | 15 | 13 | 12 | 12 | 18→20 | 13 |
| `mobile-reader` | 28→40 | 22→28 | 19→20 | 18 | 15 | 12 | 13 | 18→20 | 14 |
| `shop-boutique` | 32→52 | 24→34 | 18→21 | 16→17 | 14 | 12 | 12 | 22→30 | 13→14 |
| `shop-catalog` | 28→44 | 20→28 | 15→17 | 14→15 | 13 | 12 | 11→12 | 20→26 | 12→13 |
| `tech-erp` | 28→44 | 20→26 | 19 | 16→18 | 14 | 13→14 | 12→13 | 16→22 | - |
| `work-console` | 26→32 | 18→20 | 15→16 | 14 | 13 | 12 | 11 | 16→18 | 12→13 |
| `work-insight` | 28→36 | 20→24 | 16→18 | 15 | 13→14 | 12→13 | 11→12 | 28→44 | 13→14 |
<!-- /type-table:sizes -->

### 2.2 위계·행간·자간 리듬

서체 이름만 다른 시스템이 아니라는 근거다. 열은 위계(본문 대비 제목·숫자 비율), 리듬(행간·자간·굵기), 정보 밀도(800px 높이에 들어가는 본문 줄 수)다. 어느 두 설계 체계든 이 중 7개 차원(본문 대비 display·heading·숫자 비율, 본문 행간, display 자간, 화면당 본문 줄 수, 모바일→데스크톱 display 확대)에서 3개 이상이 의미 있게 다르다는 것을 테스트가 고정한다.

<!-- type-table:rhythm -->
| 시스템 | 본문 굵기/행간 | 제목 굵기 | 제목 행간 | display 행간 | display 자간(em) | heading 자간(em) | 라벨 자간(em) | 본문 대비 display | 본문 대비 숫자 | 본문 줄 수(800px, 데스크톱) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `doc-essay` | 400/1.8 | 600 | 1.35 | 1.25 | -0.01 | -0.005 | 0.06 | 2.95× | 1× | 23.39 |
| `doc-handbook` | 400/1.7 | 650 | 1.3 | 1.2 | -0.02 | -0.015 | 0.03 | 2.59× | 1× | 27.68 |
| `doc-newsroom` | 400/1.6 | 700 | 1.3 | 1.2 | -0.02 | -0.01 | 0.06 | 2.82× | 1.06× | 29.41 |
| `mkt-atelier` | 400/1.8 | 500 | 1.35 | 1.25 | 0 | 0 | 0.06 | 3.53× | 2.12× | 26.14 |
| `mkt-brand` | 400/1.7 | 700 | 1.3 | 1.2 | -0.02 | -0.015 | 0.06 | 3.79× | 2.32× | 24.77 |
| `mkt-launch` | 400/1.65 | 700 | 1.3 | 1.2 | -0.02 | -0.015 | 0.04 | 3.29× | 2.82× | 28.52 |
| `mobile-app` | 400/1.6 | 700 | 1.3 | 1.25 | -0.015 | -0.01 | 0.02 | 2.12× | 1.65× | 29.41 |
| `mobile-feed` | 400/1.55 | 700 | 1.3 | 1.25 | -0.015 | -0.01 | 0.02 | 2.13× | 1.33× | 34.41 |
| `mobile-reader` | 400/1.8 | 700 | 1.35 | 1.3 | -0.015 | -0.01 | 0.04 | 2.22× | 1.11× | 24.69 |
| `shop-boutique` | 400/1.75 | 600 | 1.35 | 1.25 | -0.01 | -0.005 | 0.06 | 3.06× | 1.76× | 26.89 |
| `shop-catalog` | 400/1.55 | 700 | 1.3 | 1.2 | -0.01 | -0.01 | 0.02 | 2.93× | 1.73× | 34.41 |
| `work-console` | 400/1.55 | 650 | 1.3 | 1.2 | -0.02 | -0.01 | 0.02 | 2.29× | 1.29× | 36.87 |
| `work-insight` | 400/1.6 | 700 | 1.3 | 1.2 | -0.02 | -0.015 | 0.03 | 2.4× | 2.93× | 33.33 |
<!-- /type-table:rhythm -->

## 3. 서체 짝, 한글·영문·숫자 혼용 스택, 대체 서체

### 3.1 서체 짝 19개

구형 18개에서 16개를 만들고(§4) 3개를 새로 만들었다(`grotesk-system`·`geometric-system`·`humanist-system`: 구형에 없는 제목×본문 조합).

<!-- type-table:faces -->
| id | 제목 / 본문 스택 | UI·숫자 | 합친 구형 | 웹폰트(선택) |
| --- | --- | --- | --- | --- |
| `face-pairing:sans` | system / system | 본문과 같음 | `sans`, `tech` | 없음 |
| `face-pairing:serif` | iowan / system | 본문과 같음 | `serif` | Noto Serif KR |
| `face-pairing:mono` | mono / system | 본문과 같음 | `mono` | 없음 |
| `face-pairing:editorial` | iowan / iowan | system | `editorial` | Noto Serif KR |
| `face-pairing:rounded` | rounded / rounded | 본문과 같음 | `rounded` | 없음 |
| `face-pairing:geometric` | geometric / geometric | 본문과 같음 | `geometric` | Pretendard Variable |
| `face-pairing:humanist` | humanist / humanist | 본문과 같음 | `humanist` | Pretendard Variable |
| `face-pairing:grotesk` | grotesk / grotesk | 본문과 같음 | `grotesk`, `swiss` | Pretendard Variable |
| `face-pairing:newsroom` | news / news | system | `newsroom` | Noto Serif KR |
| `face-pairing:literary` | palatino / charter | system | `literary` | Noto Serif KR |
| `face-pairing:luxe` | didone / humanist | 본문과 같음 | `luxe` | Noto Serif KR |
| `face-pairing:poster` | poster / system | 본문과 같음 | `poster` | 없음 |
| `face-pairing:slab` | slab / system | 본문과 같음 | `slab` | Noto Serif KR |
| `face-pairing:bookish` | charter / charter | system | `bookish` | Noto Serif KR |
| `face-pairing:terminal` | mono / mono | 본문과 같음 | `terminal` | 없음 |
| `face-pairing:condensed` | condensed / system | 본문과 같음 | `condensed` | 없음 |
| `face-pairing:grotesk-system` | grotesk / system | 본문과 같음 | 새로 만듦 | 없음 |
| `face-pairing:geometric-system` | geometric / system | 본문과 같음 | 새로 만듦 | Pretendard Variable |
| `face-pairing:humanist-system` | humanist / system | 본문과 같음 | 새로 만듦 | Pretendard Variable, JetBrains Mono |
<!-- /type-table:faces -->

- **혼용 스택 규칙.** 모든 스택은 라틴 서체가 먼저, 같은 계열(산세리프·세리프·고정폭)의 한글 서체가 뒤, 일반 계열(`sans-serif`·`serif`·`monospace`)이 맨 끝이다. 글리프 단위로 내려가므로 영문·숫자는 앞의 라틴 서체가, 한글은 한글 서체가 그린다. 테스트가 "라틴 서체가 첫 한글 서체보다 앞", "끝은 일반 계열"을 고정한다.
- **숫자.** 세리프 서체의 숫자는 올드스타일이거나 비례폭이라 한글 옆에서 가라앉는다(Georgia 숫자 높이는 대문자의 0.75, `docs/typography.md` 규칙 6). 그래서 본문이 세리프인 서체 짝의 **UI·숫자 서체는 `system`(라이닝 숫자 산세리프)** 이고, 숫자 역할의 `--kit-nums`는 항상 `lining-nums`다. 표·가격처럼 열을 맞추는 시스템은 `tabular-nums`, 읽는 글 속 숫자는 `proportional-nums`다.
- **코드.** 코드 역할은 모든 시스템이 `STACKS.mono`(`SF Mono`·`Menlo`·`Consolas`·한글 `Apple SD Gothic Neo`·`D2Coding` …)를 쓰고, 크기는 본문보다 한 단계 작게(`--kit-code-size`) 두되 행간은 1.55 이상이다(핸드북은 코드가 중요해 14→15px).

### 3.2 실제 대체 서체

macOS 열은 **Chromium에서 측정한 값**(`docs/platform/evidence/type/fonts-macos.json`, `CSS.getPlatformFontsForNode`)과 `effectiveFaces()` 예측이 같다는 것을 테스트가 고정한다. Windows 열은 기본 설치 서체에 대한 **가정**이다(확인 필요, 이 세션에서 측정하지 못했다). Android·Linux도 `PLATFORM_FONTS`에 가정으로 있다.

<!-- type-table:fallbacks -->
| 시스템 | 제목(macOS: 라틴 / 한글) | 본문(macOS: 라틴 / 한글) | 제목(Windows 가정) | 본문(Windows 가정) | 웹폰트 켤 때 앞에 붙는 서체 |
| --- | --- | --- | --- | --- | --- |
| `doc-essay` | Iowan Old Style / AppleMyungjo | Iowan Old Style / AppleMyungjo | Palatino Linotype / Batang | Palatino Linotype / Batang | Noto Serif KR |
| `doc-handbook` | Seravek / Apple SD Gothic Neo | SF Pro / Apple SD Gothic Neo | Candara / Malgun Gothic | Segoe UI / Malgun Gothic | Pretendard Variable, JetBrains Mono |
| `doc-newsroom` | Times New Roman / AppleMyungjo | Times New Roman / AppleMyungjo | Times New Roman / Batang | Times New Roman / Batang | Noto Serif KR |
| `mkt-atelier` | Didot / AppleMyungjo | Seravek / Apple SD Gothic Neo | Bodoni MT / Batang | Candara / Malgun Gothic | Noto Serif KR |
| `mkt-brand` | Avenir Next / Apple SD Gothic Neo | Avenir Next / Apple SD Gothic Neo | Century Gothic / Malgun Gothic | Century Gothic / Malgun Gothic | Pretendard Variable |
| `mkt-launch` | Helvetica Neue / Apple SD Gothic Neo | Helvetica Neue / Apple SD Gothic Neo | Arial / Malgun Gothic | Arial / Malgun Gothic | Pretendard Variable |
| `mobile-app` | Hiragino Maru Gothic ProN / Apple SD Gothic Neo | Hiragino Maru Gothic ProN / Apple SD Gothic Neo | Malgun Gothic / Malgun Gothic | Malgun Gothic / Malgun Gothic | 없음 |
| `mobile-feed` | Seravek / Apple SD Gothic Neo | Seravek / Apple SD Gothic Neo | Candara / Malgun Gothic | Candara / Malgun Gothic | Pretendard Variable |
| `mobile-reader` | Charter / AppleMyungjo | Charter / AppleMyungjo | Sitka Text / Batang | Sitka Text / Batang | Noto Serif KR |
| `shop-boutique` | Iowan Old Style / AppleMyungjo | SF Pro / Apple SD Gothic Neo | Palatino Linotype / Batang | Segoe UI / Malgun Gothic | Noto Serif KR |
| `shop-catalog` | Avenir Next Condensed / Apple SD Gothic Neo | SF Pro / Apple SD Gothic Neo | Arial Narrow / Malgun Gothic | Segoe UI / Malgun Gothic | 없음 |
| `tech-erp` | SF Pro / Apple SD Gothic Neo | SF Pro / Apple SD Gothic Neo | Segoe UI / Malgun Gothic | Segoe UI / Malgun Gothic | 없음 |
| `work-console` | Helvetica Neue / Apple SD Gothic Neo | SF Pro / Apple SD Gothic Neo | Arial / Malgun Gothic | Segoe UI / Malgun Gothic | 없음 |
| `work-insight` | Avenir Next / Apple SD Gothic Neo | SF Pro / Apple SD Gothic Neo | Century Gothic / Malgun Gothic | Segoe UI / Malgun Gothic | Pretendard Variable |
<!-- /type-table:fallbacks -->

알려진 한계:

1. 고정폭 스택은 macOS에서 코드의 한글을 **비례폭** `Apple SD Gothic Neo`로 그린다(macOS에 한글 고정폭 서체가 없다). Windows·Android에서도 한글은 OS 대체 서체로 내려간다. 한글 주석이 코드 격자에 맞지 않을 수 있다.
2. `rounded` 스택은 macOS Chromium에서 라틴이 `Hiragino Maru Gothic ProN`(W4 한 벌)이라 제목 굵기 700이 **한글에만** 적용된다(측정: 제목 라틴 `HiraMaruProN-W4`, 한글 `AppleSDGothicNeo-Bold`). `ui-rounded`는 Safari만 쓴다. `mobile-app`의 제목 위계는 이 때문에 macOS Chromium에서 다른 시스템보다 약하다.
3. 세리프 시스템의 한글(`AppleMyungjo`·`Batang`)은 굵기가 한 벌이다. 그래서 `mkt-atelier`의 굵기 500은 한글에서 구별되지 않고 라틴(Didot)에만 보인다.
4. 같은 macOS에서 산세리프 시스템의 한글은 모두 `Apple SD Gothic Neo`다. 산세리프끼리의 시각 차이는 글자 모양이 아니라 라틴·숫자 서체와 크기·굵기·행간·밀도에서 난다. 한글 글자 모양까지 다양하게 하려면 웹폰트가 필요하다(§3.3).

### 3.3 웹폰트(선택)

웹폰트는 **어느 시스템에도 필수가 아니다**. 생성되는 페이지는 `default-src 'none'`이라 기본 출력(`bindType(ts)`)은 시스템 서체만 쓰고, 웹폰트를 켜면(`bindType(ts, {webfonts: true})`) 서체 짝이 가진 웹폰트가 스택 맨 앞에 붙고 `@font-face`가 함께 나온다. 저장소에는 서체 파일을 넣지 않는다(파일은 배포가 `baseUrl` 아래에 호스팅한다).

| 서체 | 계열 | 덮는 글자 | 라이선스 | 출처 |
|---|---|---|---|---|
| Pretendard Variable | 산세리프 | 한글·라틴 | OFL-1.1 | https://github.com/orioncactus/pretendard |
| Noto Serif KR | 세리프 | 한글(`unicode-range: U+1100-11FF,U+3130-318F,U+AC00-D7A3`만, 라틴은 시스템 세리프 유지) | OFL-1.1 | https://github.com/notofonts/noto-cjk |
| JetBrains Mono | 고정폭 | 라틴 | OFL-1.1 | https://github.com/JetBrains/JetBrainsMono |

- **로딩 방식**: 자체 호스팅 `woff2`, `font-display: swap`(받기 전에는 대체 서체로 먼저 그린다), 한글 서체는 `unicode-range` 조각으로 쪼개 필요한 조각만 받는다, `preload`는 라틴 조각만, 배포는 `font-src 'self'`를 연다.
- **없을 때의 대체**: 위 표의 시스템 스택(서체 짝의 기본 스택)이 그대로 그린다. `webfontPlan(faceId)`가 로딩 방식·서체·대체 스택을 돌려준다.
- **라이선스**: 모두 OFL-1.1(각 프로젝트의 공개 표기)이고, 번들·재배포 전에 LICENSE 원문 확인이 필요하다(확인 필요). 라이선스가 불분명한 서체는 넣지 않았다. 테스트가 모든 웹폰트의 라이선스가 `OFL-1.1`인지 검사한다.
- 서체 대체 시 줄바꿈이 달라지는 정도(`size-adjust` 보정)는 측정하지 않았다(확인 필요).

## 4. 구형 18개 이행과 통합 근거

구형 서체 프리셋 18개(`type-preset:*`)는 **서체 짝**(제목·본문 스택)과 **모듈러 스케일**(본문 px × 비율의 거듭제곱, 굵기 이동, 자간, 행간, 라벨 대소문자, 숫자 정렬)을 한 덩어리로 갖는다. 이 둘을 갈랐다.

- **서체 짝 16개.** `(제목 스택, 본문 스택)`이 같은 프리셋은 한 서체 짝으로 합쳤다: `sans`+`tech`(system/system), `grotesk`+`swiss`(grotesk/grotesk). 서체가 같으므로 별도 짝이 필요 없다. 이 두 쌍의 차이(비율 1.25↔1.2, 1.333↔1.414, 숫자 정렬, 라벨 대문자)는 역할 체계에 남는다.
- **역할 체계 18개**(`role-scale:modular-<id>`). 값은 엔진 `roleSizes`로 계산하므로 2.1~2.5와 어긋날 수 없다(`-tight`·`-dramatic` 접미사는 구형 scale 축). display는 구형 `title`(페이지 제목) 역할이다. 18개 중 16개가 서로 다른 프로파일이고 나머지 두 개는 다른 체계와 같은 값을 반복한다(합치지 않고 id를 유지했다. 구형 id로 되돌아갈 수 있게).
- **역할형 4개**는 `role-scale:erp`·`dashboard`·`document`·`marketing`로 옮겼다. 서체는 가져오지 않는다. **`role-scale:erp`는 새 경로에서 모든 서체 짝과 거부된다**(`P_TYPE_HIERARCHY`): 2.6.0 고정값이 모바일에서 heading 20px, sub 19px로 위계 간격이 1px라 플랫폼 한도(3px)에 걸린다. 값은 2.6.0 출력을 지키려고 고치지 않았다. 구형 결합 그대로 쓰는 `tech-erp`는 영향이 없고, 새 경로의 업무용은 `work-console`·`work-insight`다.

<!-- type-table:legacy -->
| 구형 프리셋 | 서체 짝 | 역할 체계 | 합침 | 근거 |
| --- | --- | --- | --- | --- |
| `type-preset:sans` | `face-pairing:sans` | `role-scale:modular-sans` | 예(tech와) | 제목·본문 스택이 system/system로 sans·tech가 같다. 서체 짝은 하나로 합치고, 차이(비율·굵기 이동·자간·행간·숫자 정렬·라벨 대소문자)는 역할 체계(modular-sans, modular-tech)에 남긴다 |
| `type-preset:serif` | `face-pairing:serif` | `role-scale:modular-serif` | 아니오 | 스택 iowan/system가 유일하다 |
| `type-preset:mono` | `face-pairing:mono` | `role-scale:modular-mono` | 아니오 | 스택 mono/system가 유일하다 |
| `type-preset:editorial` | `face-pairing:editorial` | `role-scale:modular-editorial` | 아니오 | 스택 iowan/iowan가 유일하다 |
| `type-preset:rounded` | `face-pairing:rounded` | `role-scale:modular-rounded` | 아니오 | 스택 rounded/rounded가 유일하다 |
| `type-preset:geometric` | `face-pairing:geometric` | `role-scale:modular-geometric` | 아니오 | 스택 geometric/geometric가 유일하다 |
| `type-preset:humanist` | `face-pairing:humanist` | `role-scale:modular-humanist` | 아니오 | 스택 humanist/humanist가 유일하다 |
| `type-preset:grotesk` | `face-pairing:grotesk` | `role-scale:modular-grotesk` | 예(swiss와) | 제목·본문 스택이 grotesk/grotesk로 grotesk·swiss가 같다. 서체 짝은 하나로 합치고, 차이(비율·굵기 이동·자간·행간·숫자 정렬·라벨 대소문자)는 역할 체계(modular-grotesk, modular-swiss)에 남긴다 |
| `type-preset:swiss` | `face-pairing:grotesk` | `role-scale:modular-swiss` | 예(grotesk와) | 제목·본문 스택이 grotesk/grotesk로 grotesk·swiss가 같다. 서체 짝은 하나로 합치고, 차이(비율·굵기 이동·자간·행간·숫자 정렬·라벨 대소문자)는 역할 체계(modular-grotesk, modular-swiss)에 남긴다 |
| `type-preset:newsroom` | `face-pairing:newsroom` | `role-scale:modular-newsroom` | 아니오 | 스택 news/news가 유일하다 |
| `type-preset:literary` | `face-pairing:literary` | `role-scale:modular-literary` | 아니오 | 스택 palatino/charter가 유일하다 |
| `type-preset:luxe` | `face-pairing:luxe` | `role-scale:modular-luxe` | 아니오 | 스택 didone/humanist가 유일하다 |
| `type-preset:poster` | `face-pairing:poster` | `role-scale:modular-poster` | 아니오 | 스택 poster/system가 유일하다 |
| `type-preset:slab` | `face-pairing:slab` | `role-scale:modular-slab` | 아니오 | 스택 slab/system가 유일하다 |
| `type-preset:tech` | `face-pairing:sans` | `role-scale:modular-tech` | 예(sans와) | 제목·본문 스택이 system/system로 sans·tech가 같다. 서체 짝은 하나로 합치고, 차이(비율·굵기 이동·자간·행간·숫자 정렬·라벨 대소문자)는 역할 체계(modular-sans, modular-tech)에 남긴다 |
| `type-preset:bookish` | `face-pairing:bookish` | `role-scale:modular-bookish` | 아니오 | 스택 charter/charter가 유일하다 |
| `type-preset:terminal` | `face-pairing:terminal` | `role-scale:modular-terminal` | 아니오 | 스택 mono/mono가 유일하다 |
| `type-preset:condensed` | `face-pairing:condensed` | `role-scale:modular-condensed` | 아니오 | 스택 condensed/system가 유일하다 |
<!-- /type-table:legacy -->

## 5. 용도·밀도 맥락과의 적합성(prefers · avoids)

각 시스템은 `prefers`와 `avoids`를 이유와 함께 가진다. 조건은 `context`(페이지 유형), `density`(compact·comfortable·spacious), `viewport`(mobile·desktop)이고 키끼리 AND, 값 목록은 OR이다. 가중은 0~100이고 `prefers`는 더하고 `avoids`는 뺀다(`src/platform/relations.mjs`의 점수 규칙과 같다).

<!-- type-table:fit -->
| 시스템 | 종류 | 조건(AND, 값은 OR) | 가중 | 이유 |
| --- | --- | --- | --- | --- |
| `doc-essay` | prefers | context=article/blog · density=spacious/comfortable | 60 | 본문 17→19px·행간 1.8 세리프가 긴 글을 읽는 데 맞다 |
| `doc-essay` | prefers | context=docs/community | 15 | 긴 본문 위주 화면에서 읽기 리듬이 안정적이다 |
| `doc-essay` | avoids | density=compact | 40 | 행간 1.8은 컴팩트 밀도의 줄 수 예산을 넘는다 |
| `doc-essay` | avoids | viewport=mobile | 10 | 본문 19px로 커지는 설계라 좁은 화면 기준 시스템(mobile-reader)이 더 맞다 |
| `doc-handbook` | prefers | context=docs · density=comfortable | 55 | 코드(14→15px)가 본문과 어울려 기술 문서의 코드 블록이 읽힌다 |
| `doc-handbook` | prefers | context=article/blog/general | 15 | 제목 위계 4단계가 긴 문서의 구조를 드러낸다 |
| `doc-handbook` | avoids | density=compact | 20 | 행간 1.7 본문은 컴팩트 밀도에서 줄 수를 많이 쓴다 |
| `doc-newsroom` | prefers | context=article/blog · density=comfortable/compact | 50 | 굵은 세리프 표제와 촘촘한 본문(1.6)이 지면을 채우는 읽을거리에 맞다 |
| `doc-newsroom` | prefers | context=listing/community | 20 | 표제와 본문의 대비로 기사 목록을 훑기 쉽다 |
| `doc-newsroom` | avoids | density=spacious | 25 | 촘촘한 본문 리듬이 넉넉한 여백에서는 답답하게 남는다 |
| `doc-newsroom` | avoids | viewport=mobile | 10 | 표제 48px·세리프 700은 좁은 화면에서 줄바꿈이 잦다 |
| `mkt-atelier` | prefers | context=landing/portfolio/commerce · density=spacious | 45 | 굵기 500 표제와 행간 1.8이 절제된 브랜드 인상을 만든다 |
| `mkt-atelier` | prefers | context=portfolio | 20 | 작품·사례 소개에는 가는 표제가 이미지를 가리지 않는다 |
| `mkt-atelier` | avoids | density=compact | 50 | 가는 표제와 넓은 행간은 컴팩트 밀도에서 위계가 흐려진다 |
| `mkt-atelier` | avoids | viewport=mobile | 10 | 고대비 세리프 표제는 작은 크기에서 획이 가늘어 보인다 |
| `mkt-brand` | prefers | context=landing · density=spacious | 60 | 히어로 표제 36→72px가 본문의 4배라 첫 화면의 인상을 정한다 |
| `mkt-brand` | prefers | context=portfolio/pricing/general | 25 | 표제 위계가 3단계로 단순해 한 장짜리 소개에 맞다 |
| `mkt-brand` | avoids | density=compact | 45 | 큰 표제와 컴팩트 밀도는 한 화면에 들어가는 정보를 해친다 |
| `mkt-brand` | avoids | context=pricing | 15 | 가격표 숫자 위계는 제품 출시(mkt-launch)가 더 낫다 |
| `mkt-launch` | prefers | context=landing/pricing · density=comfortable | 55 | 표제 56px·가격 48px·본문 16px 세 단으로 제품 소개와 요금표를 함께 짠다 |
| `mkt-launch` | prefers | context=auth/general | 10 | 소제목 위계가 촘촘해 짧은 안내에도 맞다 |
| `mkt-launch` | avoids | density=compact | 25 | 가격 숫자 48px는 컴팩트 밀도의 카드에 크다 |
| `mkt-launch` | avoids | context=portfolio | 15 | 작품 소개에는 표제가 너무 두껍다 |
| `mobile-app` | prefers | viewport=mobile · context=general/auth/form/settings/commerce | 50 | 본문 17px 고정, 보조 글자 15px 이상이라 손가락 조작 화면에 읽힌다 |
| `mobile-app` | prefers | density=comfortable | 15 | 터치 목표와 본문 리듬이 같은 단위로 맞는다 |
| `mobile-app` | avoids | viewport=desktop | 20 | 데스크톱 확대 폭이 표제 28→36px뿐이라 넓은 화면에서 위계가 약하다 |
| `mobile-app` | avoids | density=compact | 15 | 본문 17px는 컴팩트 밀도의 줄 수 예산에 크다 |
| `mobile-feed` | prefers | viewport=mobile · context=community/listing/commerce | 50 | 본문 15px·행간 1.55로 카드형 피드를 한 화면에 여러 장 담는다 |
| `mobile-feed` | prefers | density=compact | 20 | 숫자 18→20px 정렬이 좋아요·가격 같은 짧은 수치에 맞다 |
| `mobile-feed` | avoids | density=spacious | 25 | 촘촘한 본문 리듬과 넓은 여백이 어긋난다 |
| `mobile-feed` | avoids | viewport=desktop | 15 | 데스크톱에서는 크기 확대가 거의 없어 위계가 평평하다 |
| `mobile-reader` | prefers | viewport=mobile · context=article/blog/docs | 55 | 본문 18px·행간 1.8로 휴대폰 장문이 한 줄 20자 안팎에 읽힌다 |
| `mobile-reader` | avoids | density=compact | 35 | 행간 1.8 본문은 컴팩트 밀도와 어긋난다 |
| `mobile-reader` | avoids | viewport=desktop | 15 | 본문이 18px로 고정이라 넓은 화면에서는 한 줄이 짧게 남는다 |
| `shop-boutique` | prefers | context=commerce/portfolio/landing · density=comfortable/spacious | 55 | 세리프 표제와 행간 1.75 본문이 브랜드 이야기를 담는다 |
| `shop-boutique` | avoids | density=compact | 40 | 세리프 표제와 1.75 행간은 상품 격자의 밀도를 낮춘다 |
| `shop-boutique` | avoids | context=listing | 15 | 목록형 화면에는 상품명 위계가 약하다(shop-catalog가 낫다) |
| `shop-catalog` | prefers | context=commerce/listing · density=compact/comfortable | 55 | 상품명(sub)과 가격(numeric) 위계가 카드 안 정보 밀도를 맡는다 |
| `shop-catalog` | prefers | context=pricing | 15 | 가격 숫자 정렬(tabular)이 요금 비교에 쓸 만하다 |
| `shop-catalog` | avoids | density=spacious | 20 | 좁은 표제(condensed)는 넓은 여백의 브랜드 페이지에서 인상이 약하다 |
| `tech-erp` | prefers | context=dashboard/data/listing/settings · density=compact | 40 | ERP 역할 체계가 컴팩트 표·지표 화면용으로 검증돼 있다 |
| `tech-erp` | avoids | density=spacious | 20 | 컴팩트 리듬이라 넓은 여백과 맞지 않는다 |
| `work-console` | prefers | context=dashboard/data/listing/settings/form · density=compact | 50 | 본문 14px·행간 1.55로 표 한 화면에 가장 많은 행을 담는다 |
| `work-console` | prefers | context=form/settings | 15 | 라벨 12px·본문 14px 단차가 폼 항목 위계를 분명히 한다 |
| `work-console` | avoids | density=spacious | 30 | 촘촘한 본문 리듬과 넓은 여백이 어긋난다 |
| `work-console` | avoids | viewport=mobile | 15 | 본문 14px는 손가락 조작·모바일 읽기에 작다 |
| `work-insight` | prefers | context=dashboard/data · density=compact/comfortable | 50 | KPI 숫자 44px가 본문 15px의 3배라 지표가 먼저 읽힌다 |
| `work-insight` | prefers | context=listing | 10 | 숫자 열 정렬(tabular)이 목록 비교에 쓸 만하다 |
| `work-insight` | avoids | context=listing | 15 | 제목 24px 상한이라 목록 페이지 제목이 약하다 |
| `work-insight` | avoids | density=spacious | 20 | 지표 카드의 여백이 커지면 숫자와 설명이 떨어져 읽힌다 |
<!-- /type-table:fit -->

- 읽는 함수는 `typeFit(id, {context, density, viewport})`와 `rankTypeSystems(registry, ctx)`다. 테스트가 맥락마다 1순위를 고정한다(컴팩트 데스크톱 대시보드→`work-console`, 대시보드 편안한 밀도→`work-insight`, 넓은 밀도 모바일 문서→`mobile-reader`, 랜딩→`mkt-brand`, 가격표→`mkt-launch`, 컴팩트 커머스→`shop-catalog`, 넓은 커머스→`shop-boutique`).
- **계약의 한계(W5에 요청).** 계약의 관계(edge)는 도착이 등록된 재료여야 해서 페이지 유형·밀도·화면 폭을 도착으로 둘 수 없다. 그래서 위 표가 원본이고, 현재 `recommend()`는 이 표를 읽지 않는다(`recommend`는 스타일 맥락 같은 **재료**가 이미 고른 값일 때만 관계 점수를 낸다). 추천에 반영하려면 §8의 요청 1이 필요하다.
- 재료가 도착인 관계는 시스템 기록의 `relations`에 있다: `style-context:workspace`가 `tech-erp`(40)·`work-console`(30)·`work-insight`(25)를 `prefers`한다. 그래서 한 스타일 맥락에 후보가 여럿 매칭되고(`recommend`가 3개를 순위로 돌려준다), 1순위는 W5 최소 예시의 기본값인 `tech-erp`로 유지된다. 하나의 시스템이 여러 스타일 맥락과 매칭되는 쪽은 스타일 맥락 작업이 이 id를 참조해 채운다.

## 6. 한글 한도와 거부

한도에 걸린 결합은 `bindType`이 `errors`에 담고, 파이프라인 4단계(`checkCombination`)가 `P_CHECK_TYPE_HANGUL`로 낸다. 세리프 굵기만 오류 코드가 `P_TYPE_HANGUL_WEIGHT`이고(파이프라인이 `P_CHECK_TYPE_HANGUL`로 옮긴다), 나머지는 처음부터 `P_CHECK_TYPE_HANGUL`이다. 오류에는 `rule`과 `role`이 붙는다.

<!-- type-table:hangul -->
| 규칙(rule) | 대상 | 한도 | 출처 |
| --- | --- | --- | --- |
| `serif-weight` | 세리프 서체를 쓰는 모든 역할 | 굵기 ≤ 700 | 엔진 HANGUL.serifHangulWeightMax(한글 세리프 서체는 굵기 한 벌) |
| `sans-weight-floor` | display·heading·sub(산세리프) | 굵기 ≥ 600 | 엔진 typeVars의 산세리프 제목 바닥(5차 실측) |
| `tracking-floor` | display·heading·sub | 자간 ≥ -0.02 · -0.015 · -0.01em | 엔진 HANGUL.track(음절이 이웃과 닿는 비율 실측) |
| `label-tracking` | label | 자간 ≤ 0.06em | 엔진 HANGUL.labelMax |
| `leading-floor` | display·heading·sub | 행간 ≥ 1.2 · 1.3 · 1.35 | 엔진 HANGUL.leading |
| `leading-floor` | small·caption·label·code | 행간 ≥ 1.4 · 1.35 · 1.25 · 1.4 | 플랫폼 추가(한글 잉크 높이 0.91em에 줄 사이 띠 ≥ 0.34em). 확인 필요: 실측 전 |
| `body-leading` | body | 행간 1.55~1.8 | 엔진 HANGUL.body |
| `size-cap` | display·heading·sub | 크기 ≤ 80 · 40 · 24px(모바일·데스크톱 모두) | 엔진 HANGUL.caps, ROLES.sub.cap |
| `size-floor` | body·small·label·caption·code | 크기 ≥ 14 · 12 · 12 · 11 · 12px | 플랫폼 추가. 확인 필요: 한글 가독성 실측 전 |
| (위계) `P_TYPE_HIERARCHY` | display > heading > sub > body | 간격 ≥ 4px · 3px, 제목 단은 모바일 ≤ 데스크톱 | 엔진 ROLES.minAfter와 같은 값 |
<!-- /type-table:hangul -->

등록한 시스템 14개는 모두 통과한다. 서체 짝 × 역할 체계를 전부 시도하면 다음처럼 걸린다.

<!-- type-table:rejected -->
- 설계 13개 체계 × 19개 서체 짝 = 247개 중 12개 거부
- 구형 역할형 4개 체계 × 19개 서체 짝 = 76개 중 33개 거부
- 구형 모듈러 18개 체계 × 19개 서체 짝 = 342개 중 59개 거부

| 역할 체계 | 걸린 규칙 | 거부되는 서체 짝 | 예 | 첫 사유 |
| --- | --- | --- | --- | --- |
| `role-scale:mkt-atelier` | sans-weight-floor | 12/19 | `sans`, `mono` 외 | 산세리프 display 굵기 500는 바닥 600 아래라 본문보다 가늘어 보입니다 |
| `role-scale:erp` | P_TYPE_HIERARCHY | 19/19 | `sans`, `serif` 외 | mobile: heading 20px가 sub 19px보다 3px 이상 커야 합니다 |
| `role-scale:dashboard` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 720는 한글 세리프 굵기 상한 700를 넘습니다 |
| `role-scale:marketing` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 750는 한글 세리프 굵기 상한 700를 넘습니다 |
| `role-scale:modular-geometric` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 800는 한글 세리프 굵기 상한 700를 넘습니다 |
| `role-scale:modular-grotesk` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 800는 한글 세리프 굵기 상한 700를 넘습니다 |
| `role-scale:modular-swiss` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 800는 한글 세리프 굵기 상한 700를 넘습니다 |
| `role-scale:modular-literary` | sans-weight-floor | 12/19 | `sans`, `mono` 외 | 산세리프 display 굵기 500는 바닥 600 아래라 본문보다 가늘어 보입니다 |
| `role-scale:modular-luxe` | sans-weight-floor | 12/19 | `sans`, `mono` 외 | 산세리프 display 굵기 400는 바닥 600 아래라 본문보다 가늘어 보입니다 |
| `role-scale:modular-poster` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 900는 한글 세리프 굵기 상한 700를 넘습니다 |
| `role-scale:modular-condensed` | serif-weight | 7/19 | `serif`, `editorial` 외 | 세리프 display 굵기 800는 한글 세리프 굵기 상한 700를 넘습니다 |
<!-- /type-table:rejected -->

구형 결합(`type-preset × type-role-preset`)에도 같은 한도를 적용한다. 위계 검사는 2.6.0 값이 고정이라 구형 결합에는 적용하지 않는다.

## 7. 증거: 같은 문서와 대시보드를 시스템별로 렌더

`docs/platform/evidence/type/`에 시스템 14개 × {한영 혼용 문서, 대시보드} × {데스크톱 1280px, 모바일 390px} = 56장이 있다(`<시스템>-<doc|dash>-<desktop|mobile>.png`). 색·간격 골격은 모두 같고(간격만 체계의 밀도 메타데이터를 따른다), 바뀌는 것은 `bindType`이 낸 `--kit-*` 변수뿐이다. 웹폰트는 끄고 시스템 서체만 썼다. 재현: `node docs/platform/evidence/type/render.mjs`(Chromium, macOS 기준 측정). 측정값은 `metrics.json`, 쓰인 서체는 `fonts-macos.json`이다.

<!-- type-table:metrics -->
| 시스템 | 문서 높이 데스크톱/모바일(px) | 대시보드 높이 데스크톱/모바일(px) | 문서 제목 줄 수 데스크톱/모바일 | 문서 첫 문단 줄 수 데스크톱/모바일 | 가로 넘침 |
| --- | --- | --- | --- | --- | --- |
| `doc-essay` | 1233 / 1505 | 769 / 1208 | 2 / 2 | 2 / 5 | 없음 |
| `doc-handbook` | 888 / 1093 | 607 / 937 | 1 / 2 | 2 / 4 | 없음 |
| `doc-newsroom` | 961 / 1057 | 598 / 914 | 2 / 2 | 2 / 4 | 없음 |
| `mkt-atelier` | 1194 / 1320 | 771 / 1178 | 2 / 2 | 2 / 4 | 없음 |
| `mkt-brand` | 1282 / 1412 | 793 / 1184 | 2 / 2 | 2 / 4 | 없음 |
| `mkt-launch` | 1011 / 1100 | 644 / 906 | 2 / 2 | 2 / 4 | 없음 |
| `mobile-app` | 866 / 1101 | 610 / 990 | 1 / 2 | 2 / 4 | 없음 |
| `mobile-feed` | 705 / 846 | 498 / 727 | 1 / 2 | 2 / 3 | 없음 |
| `mobile-reader` | 1107 / 1550 | 754 / 1278 | 1 / 2 | 2 / 5 | 없음 |
| `shop-boutique` | 1007 / 1154 | 631 / 958 | 2 / 2 | 2 / 4 | 없음 |
| `shop-catalog` | 735 / 820 | 509 / 716 | 1 / 2 | 2 / 3 | 없음 |
| `tech-erp` | 752 / 948 | 514 / 774 | 1 / 2 | 2 / 4 | 없음 |
| `work-console` | 670 / 804 | 480 / 706 | 1 / 2 | 2 / 3 | 없음 |
| `work-insight` | 844 / 1027 | 610 / 854 | 1 / 2 | 2 / 4 | 없음 |
<!-- /type-table:metrics -->

### 7.1 정성 평가

위 스크린샷을 눈으로 보고 쓴 평가다. 수치는 §2.2와 위 표에서 가져왔다.

| 시스템 | 위계 | 리듬 | 평가 |
|---|---|---|---|
| `work-console` | 제목은 32px 상한이고 위계는 크기보다 굵기(650)와 12px 라벨이 가른다 | 행간 1.55, 자간 −0.02em | 문서가 670px로 가장 짧다(에세이의 54%). 표·폼이 한 화면에 가장 많이 들어간다. 첫 화면의 인상은 약하다(의도). 14px 본문은 모바일 손가락 읽기에 작다 |
| `work-insight` | KPI 숫자가 본문의 2.93배로 꼭대기. 제목은 24px에서 멈춘다 | 행간 1.6, 숫자 행간 1.15 | 지표 카드가 먼저 읽힌다. 숫자는 `₩1.28억`처럼 짧은 표기에서만 카드에 든다(`₩128,450,000` 12자는 44px에서 카드를 넘는다는 것을 첫 렌더에서 확인했다) |
| `doc-essay` | 세리프 제목 600, 본문 대비 2.95배. 차분한 한 단 | 본문 19px·행간 1.8 | 문서 1233px로 가장 길고(콘솔의 1.84배) 읽기 리듬이 가장 느슨하다. 표·대시보드에서는 헐겁다(표가 모바일에서 가로 스크롤) |
| `doc-handbook` | 제목 4단계(display 44→h2 28→h3 19→본문 17)가 또렷하다 | 행간 1.7, 코드 14→15px | 코드 블록이 본문과 어울린다. Seravek 제목이 따뜻하고 숫자는 tabular라 표 열이 맞는다 |
| `doc-newsroom` | 굵은 Times 제목 700, 라벨은 대문자(라틴만 변한다) | 본문 1.6으로 에세이보다 짧다(961px) | 지면 같은 촘촘함. 제목 2줄이 모바일에서도 유지된다 |
| `mkt-brand` | display 72px로 본문의 3.79배, 시스템 중 격차가 가장 크다 | 행간 1.7, 모바일 36px로 줄 때 제목이 2줄 | 히어로 한 줄이 화면을 지배한다. 대시보드·표에는 쓰지 않는다(KPI 숫자가 44px로 커진다) |
| `mkt-launch` | display 56px, 숫자 48px(2.82배) | 소제목 위계가 촘촘, 자간 −0.02em | Helvetica Neue 700이 단단하다. 가격 숫자가 제목급으로 읽혀 요금표에 맞다 |
| `mkt-atelier` | 굵기 500, display 60px | 행간 1.8, 자간 0, 라벨 대문자 0.06em | 가는 Didot 제목이 절제된 인상을 낸다. 한글(AppleMyungjo)은 굵기 한 벌이라 굵기 차이가 라틴에만 보인다 |
| `shop-catalog` | 상품명(sub 15→17px, 650)과 가격(20→26px)이 위계를 맡는다 | 행간 1.55 | Avenir Next Condensed 제목이 좁은 카드에 맞다. 데스크톱 문서 735px로 `work-console`(670)·`mobile-feed`(705) 다음이다. 넓은 여백 페이지에는 약하다 |
| `shop-boutique` | Iowan 제목 600, 가격은 크기보다 굵기 600 | 행간 1.75 | 이야기 중심 커머스. 상품 격자에는 헐겁다 |
| `mobile-app` | 본문 17px 고정, display는 28→36px(확대 1.29배)뿐 | 행간 1.6 | 폰에서 가장 읽기 편한 크기 배치. 데스크톱에서는 위계가 평평하다. macOS Chromium에서 라틴 제목이 W4 한 벌이라 한글만 굵다(§3.2) |
| `mobile-reader` | 본문 18px 고정, 제목 3단계 | 행간 1.8 | 모바일 문서 1550px로 가장 길다(첫 문단 5줄). 휴대폰 장문에 맞고 대시보드 표는 헐겁다 |
| `mobile-feed` | 본문 15px, 숫자 18→20px | 행간 1.55 | 데스크톱 문서 705px로 2위, 모바일 문서는 846px(콘솔 804·카탈로그 820보다 길다). 카드형 피드에 맞고 15px 본문은 장문에는 작다 |
| `tech-erp`(구형) | 2.6.0 ERP 값 그대로 | 행간 1.6 | 기준선. 같은 서체 짝(`system/system`)이라 `work-console`보다 라틴 제목의 개성이 없다 |

종합: 서체 짝이 같거나 비슷한 산세리프끼리(`work-console`·`work-insight`·`mobile-feed`·`shop-catalog`)는 글자 모양보다 **문서·대시보드 높이(대시보드 480~610px)와 제목·숫자 크기**로 구별된다. 세리프(`doc-essay`·`doc-newsroom`·`shop-boutique`·`mkt-atelier`)와 마케팅 계열은 글자 모양에서도 확연히 갈린다. 한계는 §3.2의 1~4다.

## 8. 다른 작업에 요청

계약·엔진 파일은 W5 소유라 고치지 않았다.

1. **추천이 적합성 표를 읽게 한다**(`src/platform/recommend.mjs`). `recommend({kind: 'type-system', context, density})`가 후보마다 `typeFit(id, {context, density, viewport})`(`src/platform/type.mjs`)를 점수·이유에 더한다. 반환 모양이 `graph.score`의 `reasons`와 같다. 또는 계약에 페이지 유형·밀도·화면 폭 도착(`context:<유형>` 같은 의사 id)을 허용한다. `EDGE_CONDITION_KEYS`에 `viewport`가 필요하면 함께.
2. **오류 코드 정리**(`src/platform/pipeline.mjs:123`). 현재 `P_TYPE_HANGUL_WEIGHT`만 `P_CHECK_TYPE_HANGUL`로 옮긴다. `P_TYPE_HANGUL_*` 접두 전체를 옮기고 `P_TYPE_HIERARCHY`를 별도 코드로 문서화하면 타이포가 코드를 통일할 수 있다.
3. **재료 종류**. `face-pairing`·`role-scale`은 지금 레지스트리 종류가 아니라 타이포 모듈의 표다(`type-system` 기록의 `facePairing`·`roleScale` 문자열이 참조). 레지스트리 종류로 승격할지(`P_EDGE_DANGLING` 검사·관계 대상 허용) W5와 정한다. TYPE_ROLES에 `code` 역할이 없다(코드는 `--kit-mono`·`--kit-code-size`로 다룬다).
4. **스타일 맥락 작업(W4)**: `style-context:workspace`는 `tech-erp`·`work-console`·`work-insight`가 `prefers`한다(`style-context:workspace`가 등록돼 있어야 한다. 이름이 바뀌면 `P_EDGE_DANGLING`으로 `createPlatform`이 던진다). 나머지 스타일 맥락의 `prefers`는 §2의 id로 건다.
5. **baseline**(`scripts/platform/baseline.mjs`). 플랫폼 경로의 서체 짝 수는 등록 시스템 14개가 서로 다른 `(--kit-heading, --kit-font)` 쌍을 가진다는 것으로 센다(구형 경로 3).

## 9. 검증

```sh
node --test tests/platform-type*.test.mjs tests/typography.test.mjs tests/material-type.test.mjs
npm test
node scripts/platform/baseline.mjs --check
node docs/platform/evidence/type/tables.mjs --write   # 표 갱신
node docs/platform/evidence/type/render.mjs           # 스크린샷·측정 갱신(Chromium, macOS)
```
