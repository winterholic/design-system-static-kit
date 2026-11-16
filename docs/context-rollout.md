# 전체 부품·예시 적용 — 2026-11-16

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

설정된 브라우저 MCP에서 갤러리의 팀 소개 viewer를 열어 렌더를 확인했고 해당 탐색의 콘솔 오류·경고는 0건이었다. 셸 Playwright runner는 기존 Codex 셸 preflight의 OS IPC 제한 때문에 실행하지 않았다. 새 `e2e/rollout.spec.mjs`는 runner 가능한 CI에서 실제 실행 결과를 별도로 확인해야 한다. iOS/Android 실기기와 보조기기는 이 환경에 없으며 Chromium 뷰포트 검사로 대체해 통과 처리하지 않는다.

## 운영 배포

현재 Codex 셸에서 `/opt/homebrew/bin/vercel whoami --json --non-interactive`는 `loggedIn:false`였다. 운영 `https://design-system-static-kit.vercel.app/v1/catalog.json`은 네트워크 확인 시 catalog 2.1, 템플릿 85, 부품 55였다. 이는 해당 CLI 환경의 인증 상태이며 호스트 전체의 인증 부재를 뜻하지 않는다. 인증 파일이나 Keychain은 읽지 않았다. 인증이 복구되면 같은 프로젝트 링크를 보존한 `.qa/deploy`에서 `vercel deploy --prod --yes --archive=tgz`로 배포하고 운영 API·예시 CSS·갤러리를 확인한다. 새 Vercel 프로젝트를 만들지 않는다.

운영 미반영 동안에는 새 compiler를 내장한 단일 HTML 갤러리를 공유한다. 이 파일은 운영 Vercel 배포 성공의 대체 증거가 아니다.
