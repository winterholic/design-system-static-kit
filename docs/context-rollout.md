# 전체 부품·예시 적용 — 2026-11-16

**후속 재감사·composition 1.2 교정은 [remediation-c.md](evidence/context-rollout/remediation-c.md)에 있다.** 아래는 composition 1.1 구현·배포의 역사 기록이다. 새 교정은 카드·차트·표·헤더·암묵 단계와 목적에 맞지 않은 예시 자산을 다루며 전체 시각 관측의 해결이나 미감 승인을 뜻하지 않는다.

최신 반영: source `5d2d1a6a7`, CI `43817797243` 전체 성공 후 composition 1.2.0을 운영 배포했다. deployment `dpl_FtZr3P4PsD7RNC3EXUuZcD9CBzZ5`는 READY이며 운영 107경로의 바이트가 local site와 일치한다. 세부 증거와 남은 한계는 위 후속 문서의 최종 절을 따른다.

기준 `8c3d37c69`의 대표 부품 적용을 catalog 2.2 / composition 1.1로 확장했다. 운영 배포와 코드·빌드 완료는 구별한다. 이 문서의 근거는 `evidence/context-rollout/`에 있다.

## 구현 범위

- 부품 55종: 맥락 결정 25종, 기존 계약 재사용 30종. 정본은 `compositionCoverage`이며, inherited를 새 CSS 구현으로 세지 않는다.
- C19–C35: aside, team, pricing/plan, quote, chart, calendar, gallery, timeline, properties, menu, master-detail, CTA, feature-list, steps.
- 보조 영역 사실을 자손에 전달하고, 반복 항목은 내용별 최소 폭과 실제 gap을 기존 flow에 공급한다. 숫자는 자동 축약하지 않으며 finite budget 초과를 진단한다.
- 85개 기본 예시, 54개 테마 쇼케이스, 조립기, 오프라인 갤러리, 전체 조합이 같은 카탈로그와 컴파일러를 사용한다. 기존 2.1 입력은 출력 경로를 유지한다.

## 실행 증거

| 확인 | 실제 결과 | 근거 |
|---|---|---|
| 전체 검사·빌드 | `npm run verify`: 143 pass / 0 fail | `verify.log` |
| 재현성 | 3,292 generated files byte-for-byte match | `verify.log` |
| 원본 보존 | 85개 2.1 전체 compiler 결과 SHA-256 동일 | `contracts.log`, `tests/composition.test.mjs` |
| 생성본 채택 | 기본 예시 85/85의 manifest가 catalog 2.2 / composition 1.1 | `site/examples/*/manifest.json`, `site/v1/catalog.json` |
| 전체 조합 컴파일 | 4,955/4,955 성공, 새 정책 누락 0 | `all-combos.json` (각 HTML SHA-256 포함) |
| 동일 조건 전후 | 97개 입력 × 1440/390 = 194뷰씩 | `inputs.json`, `before.json`, `after.json` |
| 확장 렌더 | 1,638뷰, 심각 회귀 실패 0 | `regression.json` (프로브와 심각도 기준 유지) |
| 컨테이너 실제 동작 | 할당 영역 이름 `kit compose`, 갤러리 `kit gallery`; 300px 영역의 showcase 4개 썸네일 열, masonry 1열 | `container-behavior.json` |
| 육안 비교 | 팀의 좁은 글 기둥과 갤러리의 잘못된 데스크톱 배치를 동일 폭에서 비교 | `team-{before,after}-{1440,390}.png`, `gallery-{before,after}-1440.png` |

팀 소개글의 실제 폭은 1440px 뷰포트의 보조 영역에서 68→258px, 390px에서 139→316px이다. 320px에서도 본문 246px을 확보했다. 콘텐츠·폰트·테마·축은 같은 입력을 사용했다. 이 비교는 해당 사례의 개선 근거이며 전체 조합의 미감 승인이 아니다.

1차 확장에서 properties의 내부 간격을 4px로 바꾼 뒤 모바일 근접 지적 21건이 발생했다. 기존 2px을 복원하고 같은 194뷰를 다시 측정해 해당 지적 0건을 확인했다(`after-initial.json` → `after.json`). 기존 layout 테스트의 정확한 마크업 기대는 2.1에서 계속 검사하고, 새 2.2의 flow 예산 속성을 별도로 검사한다. 초기 실패 로그는 삭제하지 않았다.

## 일반 시각 관측의 처리

기존 1,638뷰의 일반 관측 210건은 개별 원문이 없는 집계였으므로 194뷰를 식별 가능한 finding으로 재측정했다. 이 표본에서 `MEASURE` 11건·`NARROW_COL` 2건이 최종 0건이다. 짧은 섹션 소개의 `MEASURE_SHORT` 2건과 표 셀·이름 끝줄의 `ORPHAN_LINE` 7건은 보존했다. 문구를 고치거나 수치를 지워 지적을 없애지 않았다.

같은 1,638뷰 확장 표본의 새 집계는 `MEASURE_SHORT` 166건과 `ORPHAN_LINE` 26건이다. 이는 반복 테마·서체 관측이며 고유 결함 수가 아니다. 기존의 `MEASURE` 14건은 0건이다. 모든 일반 관측을 수정 완료했다고 주장하지 않는다. 그리드형 섹션 머리말의 의도된 짧은 설명과 남은 끝줄의 시각 평가는 자동 실패 기준과 구별한다.

## 검토와 실행 경계

독립 검토에서 다중 이름 `container` shorthand를 무효로 본 지적은 실제 Chromium 157의 `CSS.supports`와 computed container-name으로 반증됐다. [W3C 문법](https://www.w3.org/TR/css-contain-3/#container-shorthand)은 `container-name`의 식별자 목록을 허용한다. 불필요하게 코드를 수정하지 않았고 분기 동작을 브라우저에서 확인했다. 검토 원문과 정정은 `independent-verification.md`에 남긴다.

설정된 브라우저 MCP에서 갤러리의 팀 소개 viewer를 열어 렌더를 확인했고 해당 로컬 탐색의 콘솔 오류·경고는 0건이었다. 셸 Playwright runner는 기존 Codex 셸 preflight의 OS IPC 제한 때문에 실행하지 않았다. 이후 GitHub [Verify 43785163452](https://github.com/winterholic/design-system-static-kit/actions/runs/43785163452)가 revision `06e5a6a7e900620b2fd8ceda6da638d9d9da01b6`에서 전체 성공했다. `npm run verify`, 생성물 차이 검사와 `npm run test:browser`가 모두 성공했으며 브라우저 단계는 2026-11-16 01:23:56 UTC에 종료됐다. CI 실행과 로컬 셸의 실행 제한은 구분한다. iOS/Android 실기기와 보조기기는 이 환경에 없으며 Chromium 뷰포트 검사로 대체해 통과 처리하지 않는다.

## 운영 배포

초기 Codex 셸의 `vercel whoami --json --non-interactive`는 `loggedIn:false`였고 운영 catalog는 2.1이었다. 사용자의 로그인 복구 알림 후 같은 명령이 `winterholic` 계정을 반환했다. 인증 파일이나 Keychain은 읽지 않았다.

기존 `.qa/deploy/.vercel` 프로젝트 연결을 보존하고 `site/`를 동기화한 뒤 `vercel deploy --prod --yes --archive=tgz`로 배포했다. 운영 별칭 [design-system-static-kit.vercel.app](https://design-system-static-kit.vercel.app/)은 deployment `dpl_GxdapgBsGo6LepmFBtxgL1Jn9rpN`을 가리키며 `vercel inspect` 결과는 `Ready`다. 첫 시도는 동기화 경로 오류로 이전 생성물이 배포됐으나 올바르게 동기화한 배포로 대체했다. 시도 이력은 `deployment.json`에 보존한다.

운영 HTTP 확인에서 catalog 2.2.0 / composition 1.1.0을 확인했다. 기본 예시 85개 manifest, 조립기·갤러리·전체 조합 진입점과 compiler 소스, 6개 대표 유형의 HTML·CSS 등 105개 경로가 로컬 `site/`와 바이트 단위로 일치했다(불일치 0). 경로별 SHA-256은 [deployment.json](evidence/context-rollout/deployment.json)에 있다. 설정된 브라우저로 운영 조립기의 팀 소개 선택과 검증 통과 상태, 전체 조합 4,955개 표시, 390px 갤러리 팀 소개 viewer를 확인했다. 운영 탐색 전체의 콘솔 기록에는 `favicon.ico` 404 한 건이 있었고 애플리케이션 오류와 경고는 없었다. 운영 캡처는 `production-assembler-desktop.png`, `production-gallery-mobile.png`에 보존했다.

앞서 공유한 단일 HTML 갤러리는 오프라인 비교 자료로 유지한다. 운영 배포 확인은 위 배포 ID와 HTTP·브라우저 근거를 사용한다.
