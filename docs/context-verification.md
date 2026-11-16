# 맥락 조립 검증 — 2026-11-16

**후속 전체 부품·예시 적용의 현재 결과는 [context-rollout.md](context-rollout.md)에 있다.** 아래는 composition 1.0의 최초 구현·검증 기록으로 보존한다.

대상: 기준 `9d40328d65dbc06f4fb686a5672b1b60a36444b7` → 카탈로그 2.2.0 / composition 1.0.0 작업 트리. 실제 명령 출력과 브라우저 원문 JSON을 별도 보관한다. 자동 품질 점수나 사용자의 승인으로 해석하지 않는다.

## 코드·출력 계약

| 확인 | 실행·결과 | 범위 |
|---|---|---|
| 기준 | `npm test`: 124 passed / 0 failed | 변경 전 회귀 기준 |
| 최종 통합 | `npm run verify`: **137 passed / 0 failed** | 단위·CLI·스키마·안전성·카탈로그 예시·bundle 동등성·팔레트 대비·문서 생성·사이트 빌드 |
| 재현성 | `REPRODUCIBLE: 3292 generated files match a fresh build byte for byte.` | 실제 재빌드·관리 산출물 대조 |
| 레거시 | 새 계약 테스트에서 **85개 2.1 템플릿의 전체 compiler 결과 SHA-256 일치** | HTML·CSS·토큰·manifest 포함. 기존 값·노드 필드의 경계 유지 |
| 추가 CSS 계약 | 85 templates × 3 densities = **255 조합, type/spacing/layout lint 0건** | 출력 CSS가 기존 역할·간격·배치 문법 안에 있는지 |
| TDD | 최초 신규 계약 6 fail / 1 legacy pass → 초기 7 pass; 배정폭/hero/commerce 회귀를 실패로 고정한 뒤 최종 신규 13 pass | 기존 테스트 완화 없음. 기존 버전 assertion 하나만 신규 카탈로그 버전 2.2로 갱신 |

동일 입력 전체 결과 동등성, 입력 불변성, 선언형 데이터 직렬화·동결, consumer override 거부, field별 priority와 동순위 충돌, 내용에 따른 flow 최소 폭, 실제 gap 경계, 명시 migration 및 invalid content 미수정도 확인했다.

## 동일 조건 변경 전후

10개 고정 입력 × 1440/390px. SaaS 랜딩, ERP/업무 목록, 데이터 대시보드, 커머스, 콘텐츠, 모바일 가입 폼, 설정, 긴 KPI, 좁은 보조 폼, 좁은 split을 포함한다. 원본 입력의 콘텐츠·테마·팔레트·축은 유지하고 **catalogVersion만 2.1→2.2**로 바꿨다. 전후 스크린샷은 각 20장, 실제 실측은 `evidence/context/{before,after}.json`이다.

| 확인한 개선 | 변경 전 | 변경 후 | 관측 해석 |
|---|---|---|---|
| 긴 KPI, 390px | 카드 173px, 수치 **13.3718px**, 라벨 14px | 카드 358px, 수치 **29px** | 수치가 라벨보다 작아지는 역전을 없앴다. 긴 라벨도 단어 단위로 읽힌다. |
| 긴 KPI, 1440px | 4열, 수치 20.7792/23.0688px | 2열, 수치 **41px** | 내부 fit으로만 축소하던 콘텐츠를 열 선택에 반영했다. |
| 보조 폼, 1440px | 입력 **107px**, 2열 | 입력 **234px**, 1열 | 좁은 content box에서 placeholder와 입력 영역을 확보했다. |
| 보조 split, 1440px | 카드 **126px**, 2열, text 지적 4건 | 카드 **300px**, 1열, 해당 text 지적 0건 | 한글 제목·본문이 가는 기둥처럼 접히던 구조를 해소했다. |

새 context probe는 기준 화면에서 `SUMMARY_HIERARCHY` 1건, `FIELD_CAPACITY` 3건, `SPLIT_CAPACITY` 1건을 검출했고, 동일 조건 20개 변경 후 뷰에서는 0건이었다. 기존 probe가 대체로 0건을 냈던 화면에서도 음성 대조가 실제로 동작한다는 증거다.

실제 캡처에서 확인한 것은 숫자/라벨 위계, 폼의 입력 용량, 카드의 읽기 폭, 페이지 제목·섹션 위계, 기본 표본의 모바일/데스크톱 구성이다. 표본의 육안 비교를 전체 조합의 미감 승인으로 확대하지 않는다.

## 확장 렌더 회귀와 두 번째 교정

기존 `layoutProbe`·`spacingProbe`·`textProbe`와 새 `contextProbe`를 **설정된 브라우저 MCP**에서 직렬화해 실행했다. 새 브라우저를 셸에서 실행하거나 샌드박스 제약을 우회하지 않았다.

- 기존 시드 20261021을 재사용한 245개 조합(85 기본 + 160 구성 변형) × 기본/회전 테마 × 1440/390 = **980뷰**.
- 6개 페이지 유형 × 서체 프리셋 18 × 밀도 3 × 1440/390 = **648뷰**.
- 고정 맥락 10개 × 320px frontier = **10뷰**.
- 총 **1,638뷰**. 생성된 harness는 `node scripts/design-qa/context-regression.mjs`로 재생성한다.

첫 확장 실행은 **17뷰 실패**였다(`regression-initial.json`). 템플릿별 제외 없이 세 공통 원인을 교정했다.

1. 커머스는 app 크기의 h1을 사용하지만 section은 큰 heading을 유지해 위계가 뒤집혔다. C04의 페이지 목적 집합에 commerce를 포함했다.
2. 큰 숫자/한글 단위의 실제 글리프가 1.1 행간 아래로 내려와 compact inset의 실측 여백이 9px이었다. C10이 기존 sub 행간을 선택하게 했다.
3. intrinsic hero와 기존 viewport 기준 음수 bleed가 함께 적용되어 일부 테마에서 시각자료가 80px 화면 밖으로 나갔다. C15가 contained frame을 선택하게 했다.

최종 재실행: **PASS 1638, failed views 0**. 심각도 집합과 context 검사 기준을 완화하지 않았다. 실제 환경은 `HeadlessChrome/157.0.0.0`, macOS 브라우저 경로, DPR 1이다. raw JSON의 `scanned`는 각 프로브가 실제로 무엇을 검사했는지도 남긴다.

**일반 지적은 남아 있다:** `MEASURE_SHORT` 166건, `ORPHAN_LINE` 30건, `MEASURE` 14건. 합계 **210개 관측**은 중복 화면·테마에서 반복될 수 있으며 고유 결함 수가 아니다. 심각한 레이아웃 회귀 하한을 통과한 것이지 전체 진단 0건이 아니다. 실제 미감과 장문 읽기 품질의 후속 입력으로 보존한다. 과적합 제외 목록을 추가하지 않았다.

## 실제 조립 경로 smoke

최종 `site/`에서 브라우저 MCP로 수행했다.

- 조립기 CATALOG 2.2.0, SaaS 템플릿 → signal 테마 선택 후 `● 트리 검증 통과`; 전체 화면 모달에 컴파일된 iframe과 폭 선택 표시, 닫기 동작.
- 전체 조합 `/site/combos/?exp=1`: `전체 4,955개 중 4,955개 · 1 / 104쪽`; SaaS 필터 후 `720개 · 1 / 15쪽`.
- 단일 파일 갤러리: SaaS 카드 → viewer → 설정 → signal 테마 선택; `SaaS 서비스 소개 · 시그널`과 컴파일된 iframe 확인.
- 최종 비교 표본 캡처 시 콘솔 오류·경고 0. 외부 공식 문서의 네트워크 오류와 제품 콘솔을 섞지 않았다.

모든 기존 UI 상호작용을 새로 전수 실행했다는 주장은 하지 않는다. 키보드 전체 여정·접근성 보조기기 검사는 아래 미검증에 포함한다.

## 실행하지 않은 검증과 한계

**`npm run test:browser` Playwright runner: 미실행.** 이 Codex 셸 안에서 지정된 `browser_preflight.py`는 exit 78, `mach-register` 및 LaunchServices/CoreServices `mach-lookup` denied를 반환했다. 따라서 셸 Chromium launch를 시도하지 않았다. 이는 해당 셸의 실행 제약이며 호스트 브라우저 장애가 아니다. 설정된 브라우저 MCP는 실제 동작해 위 렌더·smoke를 수행했다. 새 `e2e/composition.spec.mjs`는 runner를 사용할 수 있는 환경의 회귀 계약이며, 여기서 runner 통과라고 보고하지 않는다.

Safari/iOS·Android 실기기, Linux 실제 fallback 폰트, 전체 키보드/스크린리더 여정, 전체 4,955개 조합의 새 미감 평가·등급 재산출, 실제 서비스 사용자 평가는 미검증이다. 기존 `combo-grades.mjs`의 2026-10-21 등급은 이번 revision의 새 미감 증거가 아니다.

## 후속 우선순위

| 우선순위 | 작업 | 완료 기준 |
|---|---|---|
| P1 | 일반 지적 210개를 원인별로 묶어 장문·고아 줄·읽기 폭을 육안 비교 | 동일 원인 사례와 반례를 함께 고정, 기존 지적을 숨기지 않음 |
| P1 | 최대 길이 통화/단위·혼합 언어·텍스트 확대와 finite bucket 상한 | 불가능한 용량은 진단과 카탈로그 대안으로 표시, 숫자를 조용히 축약하지 않음 |
| P1 | runner 사용 가능한 CI에서 기존/신규 Playwright suite와 Linux 폰트 실행 | 실행 명령·revision·실패 수를 기록 |
| P2 | quote/chart/pricing/calendar/team/navigation 등 미적용 부품과 aside/gallery의 container 분기 | 같은 맥락 데이터·역할을 재사용하며 부품별 예외 CSS 누적을 피함 |
| P2 | 전체 조합 새 등급·대표 극단 조합 시각 리뷰 | 기존 등급 날짜·대상 revision을 분리 |
| P2 | 실제 6개 서비스 콘텐츠와 디바이스·보조기기 평가 | 과업별 읽기·입력·탐색 문제와 사용자 판단을 기록 |
