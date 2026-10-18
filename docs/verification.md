# 검증 기록 · 2026-10-18

환경을 구분한다. 아래 CLI 검사는 native Codex 명령 샌드박스의 Node v26.9.0에서 실행했다. 브라우저는 configured `ttakkari_browser` 경로다. GitHub Actions의 Ubuntu/Node22/Chromium 검증은 별도로 기록한다.

## 먼저 실패시킨 계약

- `node --test` · 구현 전 23건 중 22실패(미구현), 1건은 빈 팔레트 열거여서 독립 카탈로그 개수 검사와 함께 판정. 이후 실제 카탈로그 전수 검사로 보완.
- `node --test tests/cli.test.mjs` · CLI 구현 전 5실패.
- prototype-like ID 반례를 추가해 `__proto__`에서 TypeError가 나는 것을 재현하고 own-key 검증으로 수정.
- 원색 전체 검증 중 pastel/dark 표면에서 본문7:1 미달을 실제 계산으로 발견하고, 어두운 표면의 원색 혼합 비율을 수정.

## 현재 로컬 실행 결과

`npm run verify`

```text
ℹ tests 30
ℹ pass 30
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

`.github/workflows/verify.yml`과 `e2e/workbench.spec.mjs`에 자동 검사를 등록했다. 실제 GitHub 실행 URL·결과는 실행 후 갱신한다. 아직 등록만으로 통과를 주장하지 않는다.

검사 항목: 36팔레트/모드 실제 computed color, 키보드 radio 포커스/저장 복구, 음성 입력/출력 차단, 노드 추가/이동/삭제·상태 편집·실제 다운로드 내용, 네 가지 예제/셸·긴 한글·390/768/1600px overflow, 폼 로컬 검증과 네트워크 전송 없음, 카탈로그·설계서·standalone 예제.

## 실행 환경에서 발생한 제한과 대안

`npm install --save-dev @playwright/test`의 패키지 캐시 쓰기 단계에서 `/Users/winterholic/.npm/_cacache/tmp` EPERM이 발생했다. 이는 이 Codex 명령 샌드박스의 쓰기 범위 밖 캐시 실패이며 호스트나 npm 서비스 장애 증거가 아니다. 소유권/보안 설정을 바꾸지 않고 허용된 `/private/tmp/static-kit-npm-cache`를 `--cache`로 지정해 설치했고 `added 3 packages`, `0 vulnerabilities`를 받았다. 로컬 shell에서 브라우저를 시작하지 않았다.

## 범위 밖/미확인

실제 Safari/iOS·스크린리더, 전체 3,888조합의 육안 미감, 소비 앱의 바깥 CSS와 비즈니스 데이터 연결, GitHub 보호 브랜치 관리 설정, 카카오 Katalog 원 발표 상세는 미확인이다. 기존 winterholic-design-system 브랜드를 자동 수입/동기화한 기능은 없다.
