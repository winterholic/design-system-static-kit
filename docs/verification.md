# 검증 기록 · 2026-10-18

**최종 판정: 초기 구현의 로컬 검증 및 GitHub Actions 전체 통과.** 검증 코드 리비전 `4a10738bf9d28b57724ddfe74d6485a986b56731`. [성공한 CI](https://github.com/winterholic/design-system-static-kit/actions/runs/39120393780).

환경을 구분한다. 아래 CLI 검사는 native Codex 명령 샌드박스의 Node v26.9.0에서 실행했다. 브라우저는 configured `ttakkari_browser` 경로다. GitHub Actions의 Ubuntu/Node22/Chromium 검증은 별도로 기록한다.

## 먼저 실패시킨 계약

- `node --test` · 구현 전 23건 중 22실패(미구현), 1건은 빈 팔레트 열거여서 독립 카탈로그 개수 검사와 함께 판정. 이후 실제 카탈로그 전수 검사로 보완.
- `node --test tests/cli.test.mjs` · CLI 구현 전 5실패.
- prototype-like ID 반례를 추가해 `__proto__`에서 TypeError가 나는 것을 재현하고 own-key 검증으로 수정.
- 원색 전체 검증 중 pastel/dark 표면에서 본문7:1 미달을 실제 계산으로 발견하고, 어두운 표면의 원색 혼합 비율을 수정.

## 현재 로컬 실행 결과

`npm run verify`

```text
ℹ tests 31
ℹ pass 31
ℹ fail 0
AUDIT: 18 palettes match rendered Coolors evidence; 36 color modes, 900 used contrast pairs pass; 3888 axis combinations compile.
REPRODUCIBLE: 63 generated files match a fresh build byte for byte.
```

이 명령은 contract/CLI → Coolors 관측값 대조와 실제 대비 쌍 → 축 조합 컴파일 → site 생성 → 새로운 디렉터리와 바이트 일치를 확인한다. 대비 통과는 WCAG 전체 준수나 모든 조합의 시각 품질을 뜻하지 않는다.

## configured browser 관측

- 실제 작업대 렌더와 1600px bounding snapshot/스크린샷 확인. 지표의 기본 dl/dd margin, 좁은 셸의 브랜드 줄바꿈, 프리뷰 헤더 정렬을 수정.
- 아틀리에 → 피치 딜라이트 → split → dark를 실제 선택. `트리 검증 통과`, 본문 최저4.51:1 표시 확인.
- root 노드 JSON에 `style`을 넣고 적용. `$.tree.style [UNKNOWN_KEY]` 및 빈 트리/페이지 제목 오류 표시, JSON/HTML 다운로드 버튼 disabled, 마지막 유효 미리보기 유지 확인.

## CI 브라우저 게이트

[Actions 39120393780](https://github.com/winterholic/design-system-static-kit/actions/runs/39120393780) · Ubuntu/Node22/Chromium에서 전체 성공. 원시 로그의 `# tests 31`, `# pass 31`, `5 passed (10.5s)`와 생성 일치 검사 성공을 확인했다. 스크린샷과 보고서는 이 실행의 `browser-evidence` artifact로 보존했다.

검사 항목: 36팔레트/모드 실제 computed color, 키보드 radio 포커스/저장 복구, 음성 입력/출력 차단, 노드 추가/이동/삭제·상태 편집·실제 다운로드 내용, 네 가지 예제/셸·긴 한글·390/768/1600px overflow, 폼 로컬 검증과 네트워크 전송 없음, 카탈로그·설계서·standalone 예제.

## 실행 환경에서 발생한 제한과 대안

`npm install --save-dev @playwright/test`의 패키지 캐시 쓰기 단계에서 `/Users/winterholic/.npm/_cacache/tmp` EPERM이 발생했다. 이는 이 Codex 명령 샌드박스의 쓰기 범위 밖 캐시 실패이며 호스트나 npm 서비스 장애 증거가 아니다. 소유권/보안 설정을 바꾸지 않고 허용된 `/private/tmp/static-kit-npm-cache`를 `--cache`로 지정해 설치했고 `added 3 packages`, `0 vulnerabilities`를 받았다. 로컬 shell에서 브라우저를 시작하지 않았다.

## 범위 밖/미확인

실제 Safari/iOS·스크린리더, 전체 3,888조합의 육안 미감, 소비 앱의 바깥 CSS와 비즈니스 데이터 연결, GitHub 보호 브랜치 관리 설정, 카카오 Katalog 원 발표 상세는 미확인이다. 기존 winterholic-design-system 브랜드를 자동 수입/동기화한 기능은 없다.

## 첫 CI에서 확인한 환경 차이

[Actions 39120125451](https://github.com/winterholic/design-system-static-kit/actions/runs/39120125451) · Ubuntu/Node22: npm ci와 contract/CLI/audit/build는 성공, 생성 파일 git diff 단계에서 실패했다. 원시 로그에서 대비 비율의 마지막 부동소수 비트 차이(`5.934475817361694` → `5.934475817361695`)를 확인했다. Chromium 설치/시험은 이 실행에서 건너뛰었다.

대비 판정은 원시 값을 유지하고, manifest/대비 기록의 표시값만 소수8자리에서 **버림**으로 직렬화해 플랫폼 재현성을 확보했다. 반올림으로 미달을 합격시키지 않는다. 회귀 테스트를 먼저 실패시킨 뒤 수정했다.

GH 로그 조회도 Codex 샌드박스에서 기본 `~/.cache/gh` 쓰기 EPERM이 났고, XDG_CACHE_HOME을 허용된 임시 경로로 지정해 실제 실패 로그를 확보했다. GitHub 실행 장애와 로컬 캐시 쓰기 제한을 구분했다.

## 두 번째 CI의 실제 UI 검증

[Actions 39120279715](https://github.com/winterholic/design-system-static-kit/actions/runs/39120279715) · Ubuntu/Node22/Chromium: 플랫폼 간 생성 일치 검사는 통과. 실제 브라우저 5흐름 중 4통과, iframe의 폼 확인 상태 갱신 1실패. standalone 폼은 configured browser에서 입력 후 ‘저장하지 않았습니다’ 피드백을 확인했지만, iframe에서는 sandbox에 allow-forms가 없어 native validation/submit이 막혔다. MDN의 allow-forms 설명과 실행 경로를 대조했다.

iframe에 native 폼 검증용 allow-forms를 추가했다. allow-same-origin은 계속 생략하며, 생성 HTML의 CSP form-action none/connect-src none과 고정 런타임의 preventDefault로 네트워크 전송을 막는다. 후속 Actions 39120393780에서 같은 폼 행동과 실제 요청 없음 검사가 통과했다. configured browser에서도 iframe 안 입력 후 상태 문구 갱신을 별도로 확인했다.

## 최종 수용 결과

| 영역 | 실행 증거 | 결과 |
|---|---|---|
| contract/CLI | native Codex `npm run verify`, CI Node22의 동일 명령 | 31/31 |
| 색상 | 독립 Coolors 관측값 대조, 팔레트별 light/dark 실제 사용색 | 후보18 · 모드36 · 대비900쌍 |
| 조합 | 18×2×4×3×3×3 축 열거 컴파일 | 3,888개 |
| 생성 재현 | 새 디렉터리와 비교 + CI git diff | 63파일 바이트 일치 |
| 실제 브라우저 | Actions Chromium `npm run test:browser` | 5/5 흐름, 10.5초 |
| 반영 | origin main의 검증 리비전 | 4a10738bf9d28b57724ddfe74d6485a986b56731 |

실행 뒤의 문서/WBS 완료 표기 갱신은 코드 변경이 없는 별도 커밋이다. ‘완료’는 위 수용 범위이며, 범위 밖/미확인 항목까지 검사했다는 뜻이 아니다.
