# Next Explore 구현 검증 기록

기준 worktree: `dsk-wt-next-explore`
브랜치: `next/explore`
검증일: 2026-11-21 (Asia/Seoul)

## 빌드와 컴파일 결과

실행:

```text
npm --workspace apps/web run build
```

출력 요약:

```text
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages (929/929)
```

Explore HTML 응답은 Core의 공개 `./service` 컴파일 결과와 바이트 단위로 같고, Blueprint 응답은 `./edit`의 `resetDocument` 결과와 같다. 확인 출력:

```text
compiler_html_bytes=match; blueprint=match; studio_href=match
legacy_status=307; location=/dev/qa/combos?c=saas-landing&theme=aurora&q=%ED%95%9C%EA%B8%80&exp=1&ps=24&p=2
qa_status=200; x_robots=noindex, nofollow; unknown_design=404; unknown_component=404
```

ID 직렬화·Studio 쿼리 확인:

```text
design_id=saas-landing~theme_aurora~variant_clean-saas~hero_split~nav_top
studio_href=/studio?template=saas-landing&theme=aurora&variant=clean-saas&layout=hero:split,nav:top
```

## 웹 화면 확인

구성된 Ttakkari Browser로 프로덕션 빌드 서버를 확인했다. Explore 상세에서 컴파일 프리뷰·Blueprint·Studio 링크, 조합 QA에서 4,955개 조합과 필터·실제 컴파일 미리보기를 확인했다. 모바일 390px와 데스크톱 1280px에서 화면을 캡처했다.

| 화면 | 데스크톱 | 모바일 |
|---|---|---|
| Explore 상세 | `browser/page-2026-11-21T03-12-57-529Z.png` | `browser/page-2026-11-21T03-12-47-022Z.png` |
| 내부 조합 QA | `browser/page-2026-11-21T03-14-41-424Z.png` | `browser/page-2026-11-21T03-14-47-299Z.png` |

브라우저에서 `페이지 유형` 필터를 바꾸면 URL이 `?pt=landing`으로 바뀌고, 조합 선택 시 `c`가 URL에 추가되며 실제 컴파일 페이지가 열렸다. `/dev/qa/combos` 응답은 `X-Robots-Tag: noindex, nofollow`를 보냈다.

Explore에서도 유형을 `landing`으로 고르고 검색어 `오로라`, 정렬 `이름순`을 적용한 뒤 URL을 새로 열어 검색어가 입력란에 복원되고 결과가 1개로 필터링되는 것을 확인했다. URL은 `?q=%EC%98%A4%EB%A1%9C%EB%9D%BC&type=landing&sort=name`이었다. Components의 `hero` 상세에서는 실제 컴파일 미리보기, 5개 변형, 명세 표와 배치 제약을 확인했다.

홈은 실제 빌드 서버에서 열어 컴파일러 소개, Explore·Studio 진입, Showcase의 Explore 링크, 규약 섹션, CLI·REST·MCP 안내, 시작 가이드와 GitHub 링크를 확인했다.

## D 통합 후 재검증

`next/explore-platform`은 `7b69d4772`에서 시작해 Explore 변경 `a56dc90e1`, `6cca7b4d3`, `7a36ec3b7`만 순서대로 적용했다. 통합 중 실제 충돌 4개(Components 상세, Explore 상세, 홈, Next 설정)를 해결했다. Next 설정은 D 기준의 대소문자 경로 구분·갤러리 rewrite·정적 noindex를 보존하면서 `/combos`, `/combos/`, `/combos/index.html`의 임시 도착지를 `/dev/qa/combos`로 맞췄다. Explore 상세의 카탈로그 404, 홈의 Showcase와 D의 컴파일 결과 iframe도 함께 보존했다.

Node 22.23.5에서 다시 검증:

```text
npm ci                                      → added 50 packages, 0 vulnerabilities
node --test tests/qa-combo-flags.test.mjs   → 2 passed
npm --workspace apps/web run test:boundary  → 9 passed
npm --workspace apps/web run build          → Compiled successfully; static pages 932/932
npm --workspace apps/web run typecheck      → tsc --noEmit 통과
WEB_PORT=49381 npm --workspace apps/web run test:e2e -- e2e/compat.spec.mjs e2e/explore-fidelity.spec.mjs
                                             → 45 passed (HTTP request fixture만 사용)
npm --workspace apps/web run test:e2e -- e2e/explore-studio-roundtrip.spec.mjs --list
                                             → CI 브라우저 케이스 1개 발견
```

복합 대표 디자인 `saas-landing~palette_pearl~mode_dark~hero_product`의 HTTP 시험은 `/render` 바이트, `/blueprint.json`의 실제 슬롯·팔레트·모드, 상세 Studio 쿼리, Explore 목록 값을 확인했다. 추가 CI 브라우저 케이스는 실제 Studio 링크 클릭 뒤 JSON·HTML 다운로드와 문서 모드 iframe `srcdoc`을 같은 Explore 산출물과 비교하도록 작성했다. 이 Playwright 브라우저 케이스는 `--list`까지만 확인했으며 실제 자동 실행은 하지 않았다. HTTP 테스트의 `[chromium]` 표시는 Playwright 프로젝트 이름이고 브라우저 실행 증거가 아니다.

별도로 구성된 Ttakkari Browser에서 빌드 서버의 Explore 목록·상세와 홈을 열었다. 목록 카드와 상세에서 `pearl`, `dark`, `hero:product`, Studio 링크 쿼리를 화면으로 확인했고, 홈의 컴파일 결과 iframe도 렌더되는 것을 확인했다. CI 왕복 브라우저 시나리오는 실행하지 않았다. 이 화면 확인 중 `/favicon.ico` 404가 콘솔에 보였으나 이번 작업 범위 밖이라 수정하지 않았다.

## 자동 E2E

추가한 스펙:

- `apps/web/e2e/explore-components-home.spec.mjs`
- `apps/web/e2e/explore-fidelity.spec.mjs`

실행:

```text
WEB_PORT=4311 WEB_REUSE=1 npm --workspace apps/web run test:e2e -- e2e/explore-components-home.spec.mjs
```

결과: 미실행(테스트 케이스 진입 전 브라우저 프로세스 시작 실패). Playwright Chromium headless-shell이 이 실행 환경에서 `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer... Permission denied (1100)` 오류와 `SIGTRAP`으로 종료됐다. 설정된 Ttakkari Browser를 통한 UI 확인 및 위 HTTP·컴파일 계약 검증은 별도로 완료했다. 자동 E2E 통과 여부는 확인되지 않았다.
