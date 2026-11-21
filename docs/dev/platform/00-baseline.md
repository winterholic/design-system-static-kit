# 00 호환성 기준선

측정일 2026-11-21. 대상은 `main` HEAD `b303f17c1`에서 만든 worktree `dsk-wt-next-audit`(브랜치 `next/a-audit`)이다. 이 문서의 숫자는 모두 이 worktree에서 실제로 실행한 결과이며, 원본 로그는 `evidence/verify.log`, `evidence/test-browser.log`에 있다. 실행하지 않은 항목은 `미실행`으로 따로 적었다.

## 1. 실행 환경

| 항목 | 값 |
|---|---|
| Node | v26.9.0 (`package.json` engines는 `>=22`, CI는 Node 22). 이 세션과 CI의 Node 주 버전이 다르다. 26.9.0에서의 결과가 22에서도 같은지는 미실행 |
| Playwright | `@playwright/test` 1.64.1, Chromium headless shell 1248 |
| 의존성 | `npm ci`로 설치. 런타임 의존성 없음, devDependency는 Playwright 하나 |
| 브라우저 테스트 포트 | 4173을 다른 프로세스가 점유하고 있어 `PW_PORT=4199`로 실행했다. `playwright.config.mjs`는 `reuseExistingServer: !process.env.CI`라서 포트가 겹치면 엉뚱한 서버를 시험할 수 있다. 설정에 주석이 있고 `PW_PORT`가 그 대비책이다 |
| git | main은 origin/main보다 8커밋 앞 (`git status -sb`: `main...origin/main [다음 뒤에: 8]`) |

## 2. `npm run verify`

결과는 통과(exit 0), 소요 55.2초다.

`verify`는 `npm test && node scripts/audit.mjs && node scripts/docs.mjs && npm run build && node scripts/check-generated.mjs`다. 단계별 결과는 다음과 같다.

| 단계 | 결과 (로그 원문 발췌) |
|---|---|
| `npm test` (`node --test`, `tests/` 26개 파일) | `ℹ tests 224` / `ℹ pass 224` / `ℹ fail 0` / `ℹ skipped 0` |
| `audit` | `AUDIT: 427 palettes match rendered Coolors evidence ... 854 color modes, 89670 used contrast pairs pass` |
| `audit` (조합 공간) | `MATRIX: 4590 template×theme pages + 1249 palette×mode pages compile`, `VARIANTS: ... 4,955 template×layout compositions`, `RECIPES: 3 recipes, 15 template picks, 14 satisfy every select rule` |
| `docs` | `DOCS: ... written` 4줄. 실행 후 `git status`에 변경 없음 |
| `build` | `BUILT static workbench, gallery, schema/catalog API, 85 template examples, 54 theme showcases, test-lab` |
| `check-generated` | `REPRODUCIBLE: 3304 generated files match a fresh build byte for byte.` |

실행 뒤 `git status --short`는 비어 있었다. 즉 `verify`가 `site/`와 `docs/*.html`을 다시 만들어도 커밋된 파일과 바이트가 같다.

## 3. `npm run test:browser`

결과는 `67 passed`, 실패 0, 건너뜀 0, 소요 5.5분이다. 명령은 `PW_PORT=4199 npm run test:browser`다.

| 스펙 | 통과 수 | 다루는 것 |
|---|---:|---|
| `e2e/combos.spec.mjs` | 13 | 전체 조합 갤러리: 목록, 확대 보기, 필터, 컨셉, 390px 스와이프 |
| `e2e/composition.spec.mjs` | 3 | 맥락 정책 전후 비교 |
| `e2e/context-remediation.spec.mjs` | 3 | 짧은 순서 목록 등 폭 사용 |
| `e2e/lab-pages.spec.mjs` | 3 | test-lab 압박 사례 3폭 검사 |
| `e2e/layout-common.spec.mjs` | 10 | 레이아웃 공통 규약 |
| `e2e/pages.spec.mjs` | 7 | 독립 설계 문서·예시 이식성 |
| `e2e/quality.spec.mjs` | 2 | 품질 프로브 음성 대조 |
| `e2e/recipes.spec.mjs` | 6 | 디자인 레시피 |
| `e2e/rollout.spec.mjs` | 3 | 2.2 롤아웃 |
| `e2e/spacing.spec.mjs` | 3 | 간격 프로브 |
| `e2e/text.spec.mjs` | 2 | 텍스트 계약 |
| `e2e/workbench.spec.mjs` | 12 | 조립기: 테마×팔레트, 변형, 키보드·저장, 엄격 JSON 오류, 축 제어, 전 템플릿×셸, 미리보기 폭, 모달, 폼, 카탈로그 탭 |
| 합계 | 67 | |

이 스위트가 보증하지 않는 것은 `01-ux-audit.md`의 결함들이다. 조립기 12개 테스트는 있지만 테마 변경 시 편집 내용 보존, JSON 가져오기 후 상태 일치, 모드 보기 전환의 문서 불변성 같은 항목은 검사하지 않는다. 그래서 67개가 모두 통과해도 해당 결함이 존재한다.

## 4. 출력 해시와 재현성 검사 방식

### 4.1 검사 장치 (코드에 있는 것)

| 장치 | 위치 | 하는 일 |
|---|---|---|
| 관리 파일 SHA-256 | `scripts/output.mjs` `outputFiles()` | `blueprint.json`, `index.html`, `tokens.css`, `tokens.json`의 SHA-256을 `manifest.json`의 `integrity.files`에 기록한다. 서명이 아니라 수정 감지용이다 (`docs/architecture.md`) |
| `kit check` | `scripts/output.mjs` `checkOutput()` | manifest를 믿지 않고 `blueprint.json`을 현재 카탈로그로 다시 컴파일해 5개 관리 파일 전체를 문자열 비교한다. 추가·누락·symlink는 거부한다 |
| `check-generated` | `scripts/check-generated.mjs` | 임시 디렉터리에 `scripts/build.mjs`를 다시 돌려 `site/`와 파일 목록, 파일별 바이트를 비교한다. 다르면 `Stale generated file: <path>`로 실패한다 |
| CI 추가 검사 | `.github/workflows/verify.yml` | `npm run verify` 뒤 `git diff --exit-code -- site docs`로 커밋 누락을 잡는다 |
| 과거 버전 출력 고정 | `docs/evidence/context/legacy-hashes.json`, `typography-refine/legacy-2-2-hashes.json`, `layout-refine/legacy-2-3-hashes.json`, `variants/legacy-2-3-hashes.json` | 카탈로그 2.1.0-2.3.0 입력의 출력이 바이트 단위로 바뀌지 않음을 테스트가 대조한다 (`docs/governance.md`) |

### 4.2 이번에 추가로 확인한 것

`check-generated`는 "새 빌드 1회와 커밋된 `site/`"만 비교한다. 빌드가 실행마다 같은 결과를 내는지 따로 보려고 서로 다른 임시 경로에 두 번 빌드해 비교했다.

```
node scripts/build.mjs /tmp/dsk-audit/build-a ; node scripts/build.mjs /tmp/dsk-audit/build-b
diff -rq build-a build-b | wc -l   →  0
```

파일 경로와 파일별 SHA-256을 정렬해 이어 붙인 트리 해시는 세 곳이 모두 같았다.

| 대상 | 파일 수 | 트리 해시 (sha256) |
|---|---:|---|
| 커밋된 `site/` | 3304 | `f82ca6f70cdb69f03ec9807e425d6ec33159d3c57626b7b066a050d3a8e9563c` |
| 새 빌드 A | 3304 | 같음 |
| 새 빌드 B | 3304 | 같음 |

후속 트랙이 호환성을 확인할 때 쓸 부분 트리 해시(앞 16자)도 남긴다. 계산 방식은 위와 같다 (`경로\0파일해시\n`을 경로순으로 이어 SHA-256).

| `site/` 하위 | 파일 수 | 트리 해시 앞 16자 |
|---|---:|---|
| `examples/` (템플릿 85개 × 5파일, `themes/` 제외) | 425 | `eb438ecf14a38c35` |
| `examples/themes/` (테마 54개 × 5파일) | 270 | `8b73787be3b4a7ff` |
| `v1/` (`catalog.json`, `blueprint.schema.json`) | 2 | `0af400ca2df23e24` |
| `docs/` (HTML 6개) | 6 | `a17ac12955545343` |
| `combos/` | 2 | `10b36346a2073dfe` |
| `gallery/` | 1 | `b97e22883f8a8042` |
| `src/` (소스 복사본) | 58 | `b8d623163f717ef1` |
| `test-lab/` | 2538 | `388e4e95e2ae87b7` |

개별 파일 해시(앞 16자): `site/v1/catalog.json` `910e5b7b3f8edea5`, `site/v1/blueprint.schema.json` `1bbb43a48cd1e591`, `site/gallery/index.html` `6360e5aff7cd1abf`, `site/index.html` `cddbf61db5a71611`, `site/examples/saas-landing/index.html` `9e2f1431724d135e`.

**호환성 게이트 제안.** Next.js 전환 중에도 `examples/`(425)와 `examples/themes/`(270), `v1/`(2) 트리 해시가 위 값과 같아야 한다. Core 출력이 바뀌는 변경은 카탈로그 버전을 올리는 정규 경로로만 낸다 (`docs/governance.md` 5번). 해시가 바뀌면 의도한 카탈로그 개정인지부터 확인한다.

### 4.3 재현성의 한계

- 위 검사는 한 머신, 한 Node 버전(26.9.0)에서 한 결과다. Node 22(CI)에서 같은 해시가 나오는지는 미실행이다. CI는 같은 `check-generated`를 Node 22로 돌리므로 CI가 초록이면 그 환경에서도 재현된다고 볼 수 있지만, 이 세션에서 CI 상태는 조회하지 않았다.
- `check-generated`는 `node scripts/build.mjs`를 `spawnSync`로 호출하는 Node 전용 도구다. 브라우저·Edge 런타임에서 같은 해시를 내려면 `outputFiles()`의 `node:crypto`를 WebCrypto 등으로 바꿔야 하며, 이는 `02-core-map.md`에 적었다.

## 5. 현재 배포 설정

| 항목 | 상태 | 근거 |
|---|---|---|
| 배포 단위 | `site/` 디렉터리. `scripts/build.mjs`가 만들고 **저장소에 커밋**한다 (3304개 파일) | `package.json` `build`, `site/` 추적 여부 |
| `site/.nojekyll` | 있음 (`build.mjs`가 항상 생성) | `scripts/build.mjs` |
| Vercel 설정 파일 | 저장소에 `vercel.json` 없음. `.vercel`, `.qa/`는 `.gitignore`에 있음 | `ls`, `.gitignore` |
| Vercel 운영 배포 | **있음.** 운영 별칭은 https://design-system-static-kit.vercel.app. 문서가 배포 이력을 기록한다 (`docs/context-rollout.md` 48-50행, `docs/verification.md` 139-140행, `docs/wbs.md` 72행). 배포는 로컬 `.qa/deploy/.vercel` 연결을 쓰는 **수동** `vercel deploy --prod`이고 CI에 배포 단계가 없다 | 문서 인용, `.github/workflows/verify.yml` |
| 운영 반영 상태 | 운영 `/v1/catalog.json`은 `version 2.3.0`, 로컬 `site/v1/catalog.json`은 `2.4.0`이다. 운영이 main보다 한 단계 뒤처져 있다 | `curl`로 받아 비교 (2026-11-21) |
| GitHub Pages | **꺼져 있음.** `gh api repos/winterholic/design-system-static-kit`의 `has_pages: false`, `/pages` 호출은 HTTP 404. README의 "GitHub Pages 등 정적 호스팅"은 가능성의 서술이지 현재 설정이 아니다 | GitHub API 조회 (2026-11-21) |
| CI | `.github/workflows/verify.yml` 하나. `push`(main), `pull_request`, `workflow_dispatch`에서 `npm ci`, `npm run verify`, `git diff --exit-code -- site docs`, Playwright 설치, `npm run test:browser`를 돌린다. 배포 워크플로 없음 | 파일 확인 |
| 저장소 | `origin` = `https://github.com/winterholic/design-system-static-kit.git` (공개 저장소, `private: false`) | `git remote -v`, API |
| 소스 공개 | `site/src/`(58개 파일)에 컴파일러 소스가 그대로 복사되어 공개된다. 조립기와 갤러리가 브라우저에서 ES 모듈로 불러 쓰기 때문이다 | `build.mjs` `cp(src, out/src)` |

Next.js 전환에서 배포는 새로 결정할 사항이다. 현재 Vercel 프로젝트(`design-system-static-kit`)를 이어 쓸지, 정적 산출물 호환 경로를 어떻게 유지할지는 `03-interfaces.md` 5절에 방침을 적었다. 이 세션에서 Vercel 대시보드나 CLI는 조회하지 않았다 (`미실행: 인증 필요`).

## 6. 기존 공개 URL 목록

기준은 `site/` 트리(= 운영 배포 내용)와 `npm run dev`가 저장소 루트를 그대로 서빙하는 경로다. 아래 경로는 운영 도메인에서 2026-11-21에 HTTP 200을 확인했다 (`/`, `/combos/`, `/combos/render.html`, `/gallery/index.html`, `/v1/catalog.json`, `/v1/blueprint.schema.json`, `/docs/design.html`, `/examples/saas-landing/`, `/src/compiler.mjs`, `/test-lab/`).

| 경로 | 내용 | 파일 수 | 성격 |
|---|---|---:|---|
| `/` | 시각 조립기 (`index.html` + `src/workbench.mjs`). 해시 `#catalog`로 카탈로그 탭 | 1 | 앱 |
| `/combos/` | 전체 조합 갤러리 (`src/combos/app.mjs`). 쿼리로 상태 복원 | 1 | 앱 |
| `/combos/render.html?c=<id>&...` | 조합 하나를 전체 화면 HTML로 렌더 (`src/combos/render.mjs`). 새 창 열기와 공유에 쓴다 | 1 | 앱 (동적 렌더) |
| `/gallery/index.html` | 컴파일러를 내장한 단일 파일 오프라인 갤러리 (792,297바이트) | 1 | 단일 파일 산출물 |
| `/v1/catalog.json` | 카탈로그 전체 투영 (778,937바이트, 버전·테마·팔레트·축·부품 스펙·템플릿 등) | 1 | **데이터 API** |
| `/v1/blueprint.schema.json` | Blueprint JSON Schema 2020-12 (122,698바이트) | 1 | **데이터 API** |
| `/docs/*.html` | `design`, `diagnosis-round6`, `layout`, `palettes`, `spacing`, `typography` 6개 | 6 | 생성 문서 |
| `/examples/<templateId>/` | 템플릿 85개의 기본 출력: `index.html`, `tokens.css`, `tokens.json`, `blueprint.json`, `manifest.json` | 425 | 결정론적 산출물 |
| `/examples/themes/<themeId>/` | 테마 54개 쇼케이스. 같은 5개 파일 | 270 | 결정론적 산출물 |
| `/test-lab/` | 넓은 조합 시험 페이지 모음 (`index.html`, `viewer.html`, `cases/`, `manifest.json`, `coverage.json`, `check-report.json`) | 2538 | 시험 증거 |
| `/src/**/*.mjs`, `*.css` | 컴파일러·카탈로그 소스 (브라우저가 직접 import) | 58 | 앱 의존. 외부 소비 약속은 없음 |
| `/.nojekyll` | 빈 파일 | 1 | 호스팅 설정 |

`/examples/`의 템플릿 id 85개와 테마 id 54개는 `site/v1/catalog.json`의 `templates[].id`, `themes` 키와 같다.

### 6.1 URL이 담고 있는 상태 계약

**`/combos/` 쿼리 파라미터** (`src/combos/app.mjs` `buildQuery`, 48-72행):
`c`(조합 id, 확대 보기), `concept`, `look`, `theme`, `tv`, `pal`, `type`, `mode`(보기 설정), `q`, `pt`, `t`, `sl`(`슬롯:옵션,...`), `sort`(`template`·`changed`·`shuffle`), `seed`, `same`, `flagged`, `tall`, `exp`, `rec`(`1`), `ps`(24·48·96), `p`(쪽).

**조합 id**: `템플릿id~슬롯:옵션~슬롯:옵션`, 기본 구성은 템플릿 id만 (`src/combos.mjs` `comboId`). 번호(`#0001`)는 카탈로그가 바뀌면 달라지므로 공유·기록에는 id를 쓴다고 코드 주석이 못 박는다.

**`/combos/render.html` 쿼리**: `c`, `theme`, `tv`, `pal`, `mode`, `concept`, `look`, `type`.

**조립기**: 경로는 `/` 하나이고 URL에 설계 상태가 없다. 해시 `#catalog`만 첫 로드 때 읽는다 (`src/workbench.mjs` 302행). 이 점이 `01-ux-audit.md`의 W7이다.

**브라우저 저장소 키** (사용자 데이터라 전환 시 읽어 줘야 한다):

| 키 | 쓰는 곳 | 내용 |
|---|---|---|
| `winterholic-static-kit.blueprint.v3` | 조립기 | `{blueprint, sel}` |
| `winterholic-static-kit.device` | 조립기 | 미리보기 폭 |
| `winterholic-static-kit.structure-closed` | 조립기 | **읽기만 하고 쓰는 곳이 없다** (`src/workbench.mjs` 297행) |
| `winterholic-static-kit.combos.device` | 조합 갤러리 | 확대 보기 폭 |
| `winterholic-static-kit.combo-flags.v1` | 조합 갤러리 | "이상함" 표시 목록. 사용자가 쌓은 데이터 |

## 7. 문서·코드 불일치 (범위 밖 발견, 고치지 않음)

- `README.md` 첫 표는 "카탈로그 2.2"와 그 수량을 적지만 `CATALOG_VERSION`은 `2.4.0`이다. 같은 README의 Blueprint 예시는 `catalogVersion: "2.4.0"`이다.
- `scripts/build.mjs`의 주석은 "4,102개 조합"이라 하고, 실제 조합 수는 4,955다 (`audit` 출력, README).
- `docs/context-rollout.md`는 운영 catalog 2.2.0을 확인했다고 적었고, 이번 조회의 운영은 2.3.0이다. 그 사이 한 번 더 배포된 것이다. 배포 기록 문서가 최신이 아니다.
