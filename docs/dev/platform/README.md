# docs/dev/platform

Next.js 플랫폼 전환의 첫 단계(트랙 A, 감사)가 만든 문서와 증거다. 분석만 했고 `src/`와 기존 웹 파일은 수정하지 않았다. 기준은 `main` HEAD `b303f17c1`, 측정일 2026-11-21이다.

| 문서 | 내용 |
|---|---|
| [00-baseline.md](00-baseline.md) | `npm run verify`(224개) · `npm run test:browser`(67개) 결과, 출력 해시·재현성 검사, 배포 설정, 기존 공개 URL |
| [01-ux-audit.md](01-ux-audit.md) | 조립기·조합 갤러리·단일 갤러리를 실제 Chromium으로 조작한 결함 목록과 판정 |
| [02-core-map.md](02-core-map.md) | `src/` 모듈 지도, 공개 함수 시그니처, Node 의존, 번들 가능 여부, CLI |
| [03-interfaces.md](03-interfaces.md) | 서비스 함수 계층, 편집 연산 접점, Next.js 앱 위치, 트랙별 경로, URL 호환 방침 |

| 디렉터리 | 내용 |
|---|---|
| `probes/` | 감사에 쓴 Playwright 프로브. `01-ux-audit.md` 0절의 방법으로 다시 실행할 수 있다 |
| `evidence/` | 프로브 원시 결과(JSON)와 `verify`·`test:browser` 로그 |
| `screens/before/` | 전환 전 화면 캡처 (390·768·1280px, 23장) |
