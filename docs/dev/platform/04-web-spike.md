# 04 웹 뼈대와 Core import 스파이크 결과

작성 2026-11-21, 트랙 D (`next/d-web-shell`). 1차 작성은 `main` `f1d250cf2` 위에서, 2차 갱신은 `next/c-service`(`8543797cf`) 위로 rebase한 뒤 `./service` 기준으로 했다. 실행 환경은 Node v26.9.0, npm 11.19.1, Playwright Chromium (`@playwright/test` 1.64.1)이다. CI와 배포 기준 Node는 22로 고정했으므로 Node 22에서의 결과는 **미실행**이다 (CI `web` job이 처음 돌 때 확인된다).

표시: **확정**은 이 세션에서 명령으로 확인한 것, **확인 필요**는 못 한 것이다.

## 1. 버전 선택 (D7)

| 항목 | 값 | 근거 |
|---|---|---|
| Next.js | 16.4.6 | `npm view next dist-tags`의 `latest`가 16.4.6 (2026-11-21). 공식 문서 `nextjs.org/docs/app/getting-started/installation`(lastUpdated 2026-10-02)이 "Starting with Next.js 16"을 전제로 쓰고 수동 설치를 `next@latest react@latest react-dom@latest`로 안내한다 |
| React / React DOM | 19.3.1 | `npm view react version`. `next@16.4.6`의 peer는 `react ^19.0.0` |
| 최소 Node | 20.9 | 같은 문서의 System requirements. 이 저장소 기준은 22 (`.nvmrc`, `apps/web` engines `22.x`, CI `web` job) |
| TypeScript | 5.9.3 | 문서가 최소 5.1을 요구한다. npm `latest`는 7.0.2지만 Next 16.4 지원 여부를 확인하지 못해 쓰지 않았다 (**확인 필요**) |
| 번들러 | Turbopack (기본) | 문서: "Turbopack is now the default bundler". `next build --webpack`도 성공했다 |
| 렌더링 모드 | 기본(정적 프리렌더 + 동적 세그먼트 3개). `output: 'export'` 아님 | REST·MCP가 `app/api`에 들어올 예정이라 서버가 필요하다. 호환 산출물(`/examples/**` 등)은 Next 렌더링이 아니라 `public/` 정적 파일이다 (D7) |

**도입한 라이브러리는 `next`, `react`, `react-dom`뿐이다** (런타임). 개발용은 `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@playwright/test`(루트와 같은 범위)다. Tailwind·UI 킷·아이콘·애니메이션 라이브러리는 넣지 않았다. 스타일은 전역 CSS 변수(토큰)와 CSS Modules다. 초기 클라이언트 JS는 모든 화면이 Next·React 런타임뿐이며 5절에 크기를 적었다.

## 2. 스파이크 S1~S5 (03-interfaces.md 3.2절)

**2차 갱신(`./service` 기준)**: `next/c-service` 위로 rebase하고 스파이크 전용 exports(`./compiler`, `./catalog`)를 지웠다. 이제 `apps/web`은 `./service`와 `./edit`만 쓴다. S1~S5를 아래 표 그대로 다시 실측했다. 1차(compiler·catalog 진입점) 결과와 달라진 수치는 5절에 같이 적었다.

### 구조 확정

`apps/web`이 루트 패키지를 `"@winterholic/design-system-static-kit": "file:../.."`로 의존성에 둔다. 루트 `package.json`에 `"workspaces": ["apps/*"]`와 `exports`를 더했다. 루트는 워크스페이스 멤버가 아니어도 `node_modules/@winterholic/design-system-static-kit -> ../..` 링크가 만들어졌다 (`npm install`, **확정**). 이 방식으로 03절 3.1의 "확인 필요"가 해소된다.

```
$ ls -la node_modules/@winterholic/
design-system-static-kit -> ../..
static-kit-web -> ../../apps/web
```

| 루트 exports | 대상 | 상태 |
|---|---|---|
| `./service` | `./src/service/index.mjs` | 있음 (트랙 C). `compileBlueprint`, `listCatalog` 등 |
| `./edit` | `./src/edit/index.mjs` | 있음 |

`service`에는 Blueprint를 만드는 함수가 없다(`createBlueprint`에 해당하는 것). 스파이크는 `./edit`의 `resetDocument(null, {template})`로 템플릿 기본 문서를 만들고 `./service`의 `compileBlueprint(doc, {include: ['files'], hash})`로 컴파일한다.

`transpilePackages`는 쓰지 않았다. Core가 이미 평범한 ES 모듈(`.mjs`)이라 변환 없이 Turbopack과 webpack 모두 번들했다. `turbopack.root`와 `outputFileTracingRoot`를 저장소 루트로 명시했지만, 이를 지우고 빌드해도 성공했다 (`Compiled successfully`). 경고 억제와 추적 범위를 분명히 하려고 명시를 유지한다.

### 결과 (`./service` 기준)

| ID | 결과 | 실행한 명령과 출력 |
|---|---|---|
| S1 | **통과** | `npm --workspace apps/web run build` → `✓ Compiled successfully`, `✓ Generating static pages ... (16/16)`. 서버 컴포넌트(`app/dev/spike/page.tsx`가 `compileBlueprint`·`listCatalog`·`resetDocument` 사용), 서버 라우트(`app/dev/spike/html/route.ts`), 클라이언트 컴포넌트(`SpikeClient.tsx`의 동적 import)가 모두 빌드된다. 서버 페이지가 `listCatalog({kind: 'templates'})`로 템플릿 85개를 센다 (`data-template-count=85`) |
| S2 | **통과** | 브라우저(Chromium)에서 `typeof Buffer`와 `process.versions.node`가 모두 `undefined`임을 확인한 뒤 버튼으로 `./service`·`./edit`를 불러 컴파일. `data-error=""`, pageerror 0건. `e2e/spike.spec.mjs` › `S2·S4 브라우저` 통과 |
| S3 | **통과** | `node apps/web/scripts/measure-bundles.mjs`. 서버 산출물(`.next/server/**`의 js·html·rsc·body 전부)에서 UI 모듈에만 있는 문자열 4개(`winterholic-static-kit.blueprint.v3`, `.combo-flags`, `.combos.device`, `.device`)가 각각 0건이다. 이 문자열은 `src/workbench.mjs`·`src/combos/app.mjs`에만 있다 (`grep -l`). `src_service_index_mjs` 청크는 서버 번들에 있다 |
| S4 | **통과, 바이트 동일** | 아래 |
| S5 | **통과** | 5절 |

### S4 실측 (반드시 실측)

기준 파일은 `site/examples/saas-landing/`의 5개 파일이다. SHA-256은 테스트가 읽은 파일에서 계산한다 (`e2e/spike.spec.mjs`).

| 경로 | 방법 | 결과 |
|---|---|---|
| 서버 응답 | `GET /dev/spike/html`(서버가 `compileBlueprint(...).value.files['index.html']`을 낸 응답)의 본문 바이트를 파일과 `Buffer.compare` | 0 (동일) |
| 서버 관리 파일 5개 | `compileBlueprint(doc, {include: ['files'], hash: {algorithm: 'sha256', digest}})`의 `blueprint.json`, `index.html`, `manifest.json`, `tokens.css`, `tokens.json` 각각의 SHA-256 (digest는 서버의 `node:crypto`) | 5개 모두 파일과 같음. `manifest.json`의 `integrity`까지 같다 |
| 브라우저 | Chromium에서 `import()`로 `./service`·`./edit`를 불러 `compileBlueprint(doc, {include: ['html']})`, `TextEncoder` 바이트의 `crypto.subtle` SHA-256 | `index.html` SHA-256이 파일과 같음 (`data-sha256`) |

브라우저 쪽은 동기 `digest`를 넘기지 않으므로 `manifest.integrity`를 채우지 않고 `index.html`만 비교한다 (D6: 비동기 WebCrypto는 호출자가 `value.files`로 계산). `e2e/spike.spec.mjs` 5개 시험이 모두 통과했다. 기준 대조(RED)로 `public/v1/catalog.json`에 1바이트를 붙이면 바이트 시험과 해시 게이트가 실패함을 확인했다 (7절). 허용되지 않은 진입점(`/compiler`)을 import하면 `next build`의 타입 검사와 `test:boundary`가 모두 실패한다.

## 3. 공통 레이아웃과 토큰

- 상단 내비: `Static Kit / Explore | Components | Docs | Integrations | Studio` (`lib/nav.ts`가 단일 출처, `shell/SiteHeader.tsx`). 내부 설계서·진단·test-lab은 상단에 없다 (`/dev/qa`에서만 연다). 시험이 헤더의 링크 목록이 정확히 6개(`/`와 5개 메뉴)임을 단언한다.
- 720px 미만은 "메뉴" 버튼 뒤로 접는다. 열면 첫 링크로 초점이 가고, Tab·Shift+Tab은 버튼과 메뉴 링크 안에서만 돈다. Esc로 닫으면 초점이 버튼으로 돌아온다. 바깥을 누르거나 링크로 이동하거나 폭이 720px 이상이 되면 닫힌다. 메뉴 링크 높이는 44px 이상이다.
- 푸터: GitHub 링크 `https://github.com/winterholic/design-system-static-kit`.
- 토큰(`app/globals.css`): 색 8개, 글자 위계 6단(12/14/16/18/24/가변 28-40px), 줄 간격 2종, 폭 규칙(`--page-max` 1120px, `--measure` 68ch, `--gutter` 16-32px 가변), 4px 단위 간격 8단, `--tap-min` 44px. 화면은 이 변수만 쓴다. 한글은 `word-break: keep-all`이다.
- 장식: 그라데이션·애니메이션·반복 카드 없음. 홈은 컴파일된 예제(`/examples/saas-landing/`)를 iframe으로 그대로 보여 준다.

캡처: `docs/dev/platform/screens/shell/` (`home-390.png`, `home-390-menu-open.png`, `home-768.png`, `home-1280.png`, `explore-390/768/1280.png`). `node apps/web/scripts/capture-shell.mjs` 실측값:

```
width 390 / 768 / 1280  →  scrollWidth == clientWidth (가로 넘침 0), header 높이 57px
```

## 4. 라우트 골격

| 경로 | 구현 | 비고 |
|---|---|---|
| `/` | `app/page.tsx` | `/#catalog`면 클라이언트에서 `/explore`로 `router.replace` |
| `/explore`, `/explore/[designId]`, `/explore/combos` | 최소 페이지 | `/explore/combos`는 옛 `/combos/` 리다이렉트 도착지. 정적 세그먼트라 `[designId]`보다 먼저 잡힌다 |
| `/components`, `/components/[componentId]` | 최소 페이지 | |
| `/studio` | 최소 페이지 | "준비 중" 문구만 있고 버튼이 없다 |
| `/docs`, `/docs/[...slug]` | 최소 페이지 | `/docs`는 정적 문서 5개로 가는 링크 목록. `/docs/<이름>.html`은 `public/` 정적 파일이 우선한다 |
| `/integrations`, `/integrations/cli`, `/rest-api`, `/mcp` | 최소 페이지 | |
| `/dev/qa` | 내부 QA 진입점 | metadata `robots: noindex`, `X-Robots-Tag`, `robots.txt` |
| `/dev/spike`, `/dev/spike/html` | 스파이크 | service 병합 뒤 삭제 대상 |
| 존재하지 않는 경로 | `app/not-found.tsx` | 404 상태 코드 |

동작하지 않는 버튼은 없다. 클릭 요소는 링크와 메뉴 토글, 스파이크의 "브라우저에서 컴파일"뿐이다. `app/api`는 비워 두었다 (트랙 H).

## 5. S5 측정과 번들 크기

`node apps/web/scripts/measure-bundles.mjs` (빌드 직후). 경로별 초기 JS는 프리렌더된 HTML의 `<script src>` 합이다.

| 경로 | JS 파일 | 크기(byte) | gzip | 카탈로그 청크 포함 |
|---|---:|---:|---:|---:|
| `/studio` 등 일반 화면 | 7 | 579,731 | 178,252 | 0 |
| `/` (해시 리다이렉트 포함) | 8 | 580,053 | 178,518 | 0 |
| `/dev/spike` (클릭 전) | 8 | 581,588 | 179,221 | 0 |

`./service`(와 `./edit`)는 `SpikeClient`가 버튼을 눌렀을 때만 `import()`로 불러온다. 별도 청크 두 개다: 27,179 byte(gzip 10,124) + 630,036 byte(gzip 197,348), 합계 657,215 byte(gzip 207,472). 카탈로그 투영 `site/v1/catalog.json`은 783,915 byte다 (`00-baseline.md`는 b303f17c1 시점의 778,937 byte).

1차(compiler·catalog 진입점) 측정은 두 청크 합계 597,534 byte(gzip 186,924)였다. `./service`를 쓰면 약 60KB(gzip 약 20KB) 늘었다. 서비스 계층(오류 힌트 표, 조회·설명 함수)이 더해진 값이다. 초기 JS는 1차와 사실상 같다 (`/dev/spike` 581,387 → 581,588 byte).

`e2e/spike.spec.mjs`의 S5 시험은 `/`, `/explore`, `/studio`, `/dev/spike`를 열어 받은 모든 JS 응답에서 카탈로그 본문에만 있는 식별자(`AXIS_BAN`)를 찾고, 클릭 전에는 0건, 클릭 뒤에는 청크가 내려옴을 단언한다.

**후속 트랙에 주는 사실**: 클라이언트에서 컴파일하는 화면(Studio 미리보기)은 약 207KB(gzip)를 추가로 내려받는다. 이 비용을 쓰지 않으려면 컴파일을 서버(라우트 핸들러·서버 액션)에서 하고 HTML만 받는 구조도 가능하다. 어느 쪽을 쓸지는 Studio 트랙이 정한다. 초기 JS 약 178KB(gzip)는 Next·React 런타임 몫이다.

## 6. 남은 정리

service 병합 뒤 재확인(2차 갱신)은 끝났다. 남은 것은 스파이크 코드 자체의 삭제다.

1. 스파이크가 필요 없어지면 `app/dev/spike/**`, `lib/spike-core.ts`, `e2e/spike.spec.mjs`를 지우고 `/dev/qa` 목록에서 항목을 뺀다. `measure-bundles.mjs`의 S5 단언은 Studio가 컴파일 방식을 정할 때 그 화면 기준으로 옮긴다.
2. 스파이크용 허용 목록은 이미 없다. `boundary.check.mjs`는 `service`·`edit` 외 모든 진입점을 거부한다.

## 7. 기존 URL 호환 (5.2절)

`apps/web/e2e/compat.spec.mjs`가 상태 코드·`Location`·바이트를 검사한다. 정적 산출물은 `scripts/sync-static.mjs`가 커밋된 `site/`에서 `apps/web/public/`로 **복사만** 한다 (`public/`은 `.gitignore`, `npm run build`·`dev` 앞에서 자동 실행). `site/`가 새 빌드와 바이트 동일함은 루트 `verify`(`check-generated`)가 보증한다.

| 기존 URL | 새 앱 동작 | 시험 |
|---|---|---|
| `/combos/`, `/combos`, `/combos/index.html` (+쿼리) | **308** → `/explore/combos` + 같은 쿼리 | 상태 308, `Location` 일치. 쿼리 파라미터 21개(`c, concept, look, theme, tv, pal, type, mode, q, pt, t, sl, sort, seed, same, flagged, tall, exp, rec, ps, p`)를 한글·`&`·`=`·`~`·`:`·`,`가 든 값으로 보내 `URLSearchParams` 항목이 순서까지 같음을 확인 |
| `/combos/render.html?c=…` | 유지(정적 파일) | `site/combos/render.html`과 바이트 동일. 이 페이지가 `../src/combos/render.mjs`를 불러 쓰므로 `/src/**`(58개)도 같이 복사한다 |
| `/gallery/index.html` | 정적, 바이트 동일 | `Buffer.compare == 0` |
| `/v1/catalog.json`, `/v1/blueprint.schema.json` | 정적, 바이트 동일, `application/json` | 위와 같음 |
| `/examples/**` 695개 | 정적, 바이트 동일 | 695개 전부 요청해 200과 바이트 동일 |
| `/examples/x/`, `/examples/x`, `/examples/themes/x/` | 리다이렉트 없이 200으로 `index.html` | `maxRedirects: 0`으로 확인 |
| `/docs/*.html` | 정적 유지 | 6개 모두 바이트 동일 |
| `/test-lab/**` | 정적 유지, `X-Robots-Tag: noindex, nofollow`, 상단 내비에 없음, `robots.txt` Disallow | 헤더·robots 시험. `/test-lab/`, `/test-lab/cases/c-294/` 폴더 주소도 200 |
| `/#catalog` | `/`에서 클라이언트 `router.replace('/explore')` | Playwright로 `/studio` → `/#catalog`가 `/explore`가 되고, 뒤로 가기가 `/studio`로 감(history 미적재) |
| 없는 경로 | 404 + not-found 화면 | |

해시 게이트: `site/`의 `examples`(425), `examples/themes`(270), `v1`(2) 트리 해시가 고정값과 같고, `public/`의 복사본이 `site/`와 같다. 계산식은 `apps/web/scripts/tree-hash.mjs` 한 곳이고 호환 시험이 그 함수를 쓴다. 식은 `00-baseline.md` 4.2절에 적었다.

| 하위 | 파일 수 | 고정 해시(앞 16자) | 비고 |
|---|---:|---|---|
| `examples/` (`themes/` 제외) | 425 | `eb438ecf14a38c35` | baseline 값 그대로 |
| `examples/themes/` | 270 | `8b73787be3b4a7ff` | baseline 값 그대로 |
| `v1/` | 2 | `1d39fd97e87c1bc4` | baseline 값 `0af400ca2df23e24`에서 바뀜. b303f17c1 이후 `catalog.json`에 V06 계약이 들어왔다 (`git log b303f17c1..HEAD -- site/v1`: `d72d78389`, `0ea13094c`) |

**정정**: 1차 문서는 `00-baseline.md` 4.2절의 표가 재현되지 않는다고 적었다. 틀린 판단이었다. 원인은 내 계산식이 달랐던 것이다. baseline 식은 (1) 경로를 `site/`가 아니라 해시를 내는 하위 디렉터리 기준으로 적고 (2) 전체 경로 문자열 정렬이 아니라 디렉터리를 깊이 우선으로 내려가며 각 디렉터리 안에서 이름순으로 정렬한다. b303f17c1의 `site/`에서 이 식으로 baseline 표 8개와 전체 `site/` 값이 모두 재현된다(상세는 `00-baseline.md` 4.2절). 1차에 고정했던 `ba7fbfe407f651cd`, `2d0988bbf0beab89`는 잘못된 식의 값이라 폐기했다.

### 알려진 차이와 한계

- **쿼리 재인코딩**: Next 리다이렉트는 `Location`의 쿼리를 다시 인코딩한다 (`c=saas-landing~x:y` → `x%3Ay`). 값의 의미는 같지만 문자열은 다르다. 시험은 디코딩한 항목으로 비교한다.
- **끝 슬래시**: `skipTrailingSlashRedirect: true`라서 `/studio`와 `/studio/`가 둘 다 200이다. 옛 정적 호스트가 `/examples/x/`를 200으로 내던 동작을 지키려는 선택이며, 새 화면은 슬래시 없는 주소가 표준이다 (캐노니컬 태그는 아직 없다).
- `/combos/`의 새 도착지 `/explore/combos`는 최소 화면이다. 목록·쿼리 해석은 Explore 트랙 몫이다.
- 옛 조립기(`/` 의 `index.html`)는 새 앱의 `/`가 플랫폼 홈이 되며 대체되었다. `/index.html`을 별도로 연결하지는 않았다 (5.2절 표에 없음).
- `/src/**`는 지원 약속이 없는 경로지만 `/combos/render.html` 때문에 함께 제공한다. 옛 앱 제거 때 함께 내린다.

## 8. Vercel과 CI

- `vercel.json`(루트): `framework: nextjs`, `installCommand: npm ci`, `buildCommand: npm --workspace apps/web run build`, `outputDirectory: apps/web/.next`. **배포하지 않았으므로 이 설정이 Vercel에서 실제로 동작하는지는 확인 필요다.** 특히 Next 프레임워크에서 하위 폴더의 `.next`를 `outputDirectory`로 지정하는 방식은 미검증이다. 실패하면 대안은 Project Settings의 **Root Directory = `apps/web`** + "Include source files outside of the Root Directory" 켜기다 (`src/`, `site/`가 `apps/web` 밖에 있으므로 필요하다. Vercel Monorepos 문서). 이 경우 루트 `vercel.json`은 지우거나 `apps/web/vercel.json`으로 옮긴다.
- Node 고정: `.nvmrc` = 22, `apps/web/package.json` `engines.node` = `22.x`, CI는 `.nvmrc`를 읽는다. 루트 `engines`는 기존 `>=22`로 두었다 (이 Mac의 Node 26에서 `npm install`이 `EBADENGINE` 경고를 내지만 설치는 된다). Vercel의 Node 버전은 `vercel.json`이 아니라 `engines` 또는 프로젝트 설정으로 정해진다 (Vercel 문서).
- 이어 쓸 기존 Vercel 프로젝트의 현재 배포는 `site/`를 수동 `vercel deploy --prod`로 올리는 방식이다 (`00-baseline.md` 5절). 전환(별칭 이동)은 이번 단계에서 하지 않았다.
- CI: `.github/workflows/web.yml`의 `web` job이 `npm ci`, 경계 시험, `next build`, `tsc --noEmit`, Playwright 설치, e2e를 돌린다. 기존 `verify.yml`은 수정하지 않았다. 새 job은 실제 GitHub에서 실행되지 않았다 (YAML 구문은 로컬에서 읽어 `jobs: [web]`임을 확인했다).

## 9. 시험 실행 명령

```sh
npm ci
npm run verify                                   # 루트 게이트(변경 없음)
npm --workspace apps/web run build               # sync-static → next build
npm --workspace apps/web run typecheck
npm --workspace apps/web run test:boundary       # Core import 경계 (node:test, 서버 불필요)
npm --workspace apps/web run test:e2e            # 호환·내비·스파이크 (next start 를 4310 에서 띄움)
node apps/web/scripts/measure-bundles.mjs        # S3·S5
```

`apps/web/boundary.check.mjs`와 `apps/web/e2e/*.spec.mjs`는 루트 `node --test`의 탐색 패턴(`*.test.mjs` 등)에 걸리지 않는다. 루트 `npm test`는 `tests 305 / pass 305 / fail 0` (service 계층 시험 포함)이고 `apps/web` 파일은 하나도 실행하지 않았다 (출력에서 `apps/web` 0건).
