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

## 자동 E2E

추가한 스펙:

- `apps/web/e2e/explore-components-home.spec.mjs`
- `apps/web/e2e/explore-fidelity.spec.mjs`

실행:

```text
WEB_PORT=4311 WEB_REUSE=1 npm --workspace apps/web run test:e2e -- e2e/explore-components-home.spec.mjs
```

결과: 미실행(테스트 케이스 진입 전 브라우저 프로세스 시작 실패). Playwright Chromium headless-shell이 이 실행 환경에서 `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer... Permission denied (1100)` 오류와 `SIGTRAP`으로 종료됐다. 설정된 Ttakkari Browser를 통한 UI 확인 및 위 HTTP·컴파일 계약 검증은 별도로 완료했다. 자동 E2E 통과 여부는 확인되지 않았다.
