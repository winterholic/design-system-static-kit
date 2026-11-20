# 최종 품질 보고: 카탈로그 2.4.0 독립 재검증 (2026-11-21)

제품 코드는 `0ea13094c`에서 waitlist Recipe 예외까지 반영됐다. 검증을 재개할 때의 main `238d0bcf4`는 이 커밋에 보고서와 QA 스크립트만 추가했다. 브라우저 캡처와 디자인 계측은 `d72d78389`에서 실행했다. 이후 `238d0bcf4`에서 같은 컴파일 입력을 대조해 캡처 표본과 계측 대상의 출력이 같은 것을 확인했다. Playwright 전체 결과는 GitHub Actions에서 확인했다. 실행 환경과 커밋은 4절에 기록했다.

방법의 한계를 먼저 적는다. Chromium 156(`measure-final.json`의 `browser`), macOS 폰트에서만 쟀다. 스크린샷을 직접 본 범위는 3절과 `compare.html`의 "직접 봄" 표시가 전부다. 그 밖의 폭·표본의 변화는 문서 높이, 프로브 지적, 측정 조건(Q), PNG 바이트 일치 여부로만 말한다. "시각적으로 좋아졌다"는 판단은 직접 본 화면에 한정하고, 사람 레이블이 없으므로 모두 내 육안 판단이다.

증거 위치: `docs/evidence/quality-2026-11-21/final/`(스크린샷 136장, `measure-final.json`, `claims-final.json`, `diagnose-final.json`, `sweep-320-768-final.json`, `logs/`). 전후 비교 페이지는 `docs/evidence/quality-2026-11-21/compare.html`.

## 1. 원인 분석

진단(`docs/quality-diagnosis-2026-11-21.md` 6절, 커밋 `a0f28b279`)은 결함의 뿌리를 9개로 묶었다. 이 절은 그 분류가 지금도 맞는지, 그리고 이번 재검증에서 새로 보인 원인을 적는다.

| # | 진단이 지목한 공통 원인 | 이번 재검증에서 확인한 것 | 근거 |
|---|---|---|---|
| 1 | 검증 폭이 1440·390뿐이고 고정 개수 구조 틀이 흐름 불변식 밖 | 320·768 심각 지적 1,173개 조합이 7개로 줄었다(`7`은 아래 5절 R-09·R-10). 히어로 수치 3개 2+1은 Q01 전 폭 통과 | 4.1절 스윕, Q01 |
| 2 | 구성 변형에 결과 계약이 없음 | 렌더는 안 바뀌고 추천에서만 뺐다. 갤러리 기본 목록에서 3,714개 조합이 빠짐 | `enumerateCombos()` 직접 집계: 4,955 중 experimental 3,714, 남음 1,241 |
| 3 | 페이지 수준 규칙 없음 | P01~P04 도입. S05 Q06, S07 Q10, S01 Q13, S06·S01 Q07 통과. 단 부작용이 있다(5절 R-03, R-04) | `claims-final.json` |
| 4 | 타입 하한이 칸 폭과 분리 | S27 320px 제목 3줄→2줄, BIG_NARROW 해소 | Q05, 스크린샷 |
| 5 | 칸 높이 균형 없음 | S12 1440 Q04 142→77px. 768px는 180px 그대로 | Q04 `worstEmpty` |
| 6 | 줄바꿈이 태그 단위 | S29 ORPHAN_LINE 0, 구조 등급 A 23개 상승 | `grades-diff` |
| 7 | 폼 2열이 짝을 모름 | S17 Q09 `loneHalfRows` 1→0 | Q09 |
| 8 | 테마가 셸·폭·스케일을 함께 바꿈 | 손대지 않음(정책 미결) | Q16은 판정 없음(`null`) |
| 9 | 막대 차트 도메인·종횡 왜곡 | 손대지 않음. S15 Q08 실패 그대로 | `claims-final.json` Q08 |

**재검증에서 새로 드러난 원인(진단 문서에 없던 것)**

- **A. 산출물 재생성 누락의 연쇄.** Recipe의 `waitlist` 선택은 V06(`d72d78389`)과 이어진 최신 main의 RC01 예외(`0ea13094c`)로 `hero:product`에서 기본으로 바뀌었다. 그런데 AI 조립 실험 패키지(블루프린트, 해시, 눈가림 평가)는 이전 선택으로 고정돼 있어 `ai-assembly.mjs verify`가 여전히 1/91 불일치를 출력한다(4.5절, 5절 R-01). 선택 로직이 바뀌면 그 선택에 기댄 증거를 다시 만들거나 무효 표시를 하는 단계가 없다.
- **B. 높이 균형이 그림을 자른다.** 4열 벤토 큰 칸의 그림이 작은 칸이 정한 높이를 채우도록 바뀌었고(`bentoFeatureCSS`, `15ad35827`), 그림은 `preserveAspectRatio="xMidYMid slice"`(`src/render/art.mjs:63`)라 상자가 그림 비율에서 멀면 잘린다. 자르는 정도를 보는 검사가 없다(5절 R-04).
- **C. 중복 제거의 대가.** P01이 S01 벤토 큰 칸의 그림을 구체적 제품 화면(`chart`)에서 글자 없는 범용 흐름도(`diagram`)로 바꿔 중복(Q13)은 없앴지만, 1440px에서 이 칸이 크고 성겨졌다(5절 R-03). Q13은 "같은 그림이 두 번 나오지 않음"만 보고 그림이 무엇을 설명하는지는 보지 않는다.

## 2. 수정 내역 (규칙·구현·테스트, 커밋)

`git log 89573577f..HEAD`에서 품질 작업에 해당하는 커밋만 추렸다. 역할은 각 커밋의 `--stat`과 앞선 문서에서 확인했다(내용 전체를 다시 읽지는 않았다).

| 단위 | 규칙·구현 | 테스트·증거 | 커밋 |
|---|---|---|---|
| 진단 | 34표본×4폭 측정, Q01~Q17 조건 | `quality-claims.mjs`, `width-sweep.mjs` | `a0f28b279` |
| 구조 등급 재측정 | 2.3.0 A 4,515 · B 440 · C 0, S/V 분리 초안 | `docs/quality-grades-2.3.0.md` | `72857e4b1` |
| 공통 규약(레이아웃 리비전 2, 카탈로그 2.4.0) | 흐름 예산·`FIXED_FRAMES`·`FIT`·`WRAP`·`loneFields`·`STRETCH_ABSORB` | 먼저 실패 시험 `e557f4a50`, 구현 `4956841f0`·`2832aed16`, 증거·재생성 `6ae5c334a` | `e557f4a50` `4956841f0` `2832aed16` `6ae5c334a` |
| 변형 결과 계약·페이지 규칙 | V01~V05, P01~P04(`src/catalog/variant-contracts.mjs`, `composition.mjs`) | `tests/variant-contracts.test.mjs`, `tests/page-rules.test.mjs`, 병합 증거 `3ba35e938` | `84599f05d` `3ba35e938` `fc6d95583` |
| 벤토 높이 균형 | `bentoPlan` 높이 등급 짝 짓기, `bentoFeatureCSS`, `donutFitCSS` | 먼저 실패 시험 `d300cb67e`, 구현 `28398483b`·`4514e2d87`, 정리 `15ad35827` | `d300cb67e` `28398483b` `4514e2d87` `15ad35827` |
| Design Recipe 3종 | `src/catalog/recipes.mjs`, `src/recipes.mjs`, RC01~RC09 | `tests/recipes.test.mjs`, `e2e/recipes.spec.mjs` | `c06be8bed` `2f99f3078` `f67209adf` |
| 콘텐츠 보존 계약 | V06(히어로 변형이 수치를 지우지 않음) | `tests/recipes.test.mjs`(전 템플릿×옵션), `d72d78389` | `d72d78389` |
| waitlist Recipe 예외 | 제품 화면이 없는 waitlist에 RC01 면제를 적용. 선택 결과에 규칙 ID와 사유를 기록 | 기본 HTML과 일치, 히어로 수치 3개 보존. 평가 스크린샷과 점수는 실험 시점에 고정 | `0ea13094c` |
| AI 조립 실험 | 세 팔 비교, 눈가림 패키지, 평가 | `scripts/design-qa/ai-assembly.mjs`, `tests/ai-assembly.test.mjs` | `fee3a2c1d` `ddd0963dd` `b303f17c1` `5638920fa` |

버전 정책: 출력이 바뀌므로 카탈로그를 2.4.0으로 올렸고 2.1.0~2.3.0 입력은 이전 출력을 유지한다(`layoutRev()`, `PAGE_RULE_LEGACY_VERSIONS`). 이 호환은 4.2절에서 독립적으로 다시 확인했다.

이 재검증 단위가 더한 파일(모두 검증 도구와 증거이고 `src/`는 아님): `scripts/design-qa/compat-diff.mjs`(과거 카탈로그 호환 대조), `scripts/design-qa/final-compare.mjs`(전후 비교 페이지 생성), `docs/evidence/quality-2026-11-21/final/`, `compare.html`, 이 문서.

## 3. 전후 비교

before = 2.3.0(`89573577f`, `before/`), final = 2.4.0(`d72d78389`, `final/`). 같은 표본 34개, 같은 도구(`quality-shoot.mjs`), 같은 폭 4개.

### 3.1 수치 전후

| 측정 | before | final | 근거(내가 실행) |
|---|---|---|---|
| 표본 34×4폭 프로브 지적 | 32건 | 16건(MEASURE_SHORT 15, EDGE 1) | `measure-before.json` vs `final/measure-final.json` 직접 집계 |
| 폭 스윕 320·768 심각 지적 조합 | 1,173 (지적 조합 1,197) | 7 (지적 조합 23) | `final/sweep-320-768-final.json`, `SEVERE` 집합으로 집계 |
| 구조 등급 A · B · C | 4,515 · 440 · 0 (2.3.0) | 4,538 · 417 · 0 | `diagnose.mjs`, `grades-diff.mjs` |
| Q01 S07 320px (히어로 수치 열) | `cols 2, orphan true` | `cols 3, orphan false` | `claims-final.json` |
| Q02 S23 320px 넘침 | 36px | 0 | 〃 |
| Q04 S12 1440 / 768 빈 공간 | 210px(42%) / 287px(56%) | 77px(15%) / 180px(35%) | 〃 |
| Q05 S27 320px 제목 | 33px 3줄 | 24.9px 2줄 | 〃 |
| Q06 S05 1440 오른쪽 빈 비율 | 0.50 | 0.29 | 〃 |
| Q07 S06 / S01 1440 최악 빈 비율 | 0.69 / 0.63 | 0.53 / 0.52 | 〃 |
| Q09 S17 반폭 단독 행 | 1 | 0 | 〃 |
| Q10 S07 히어로~다음 제목 | 154 / 223 / 208px | 130 / 119 / 104px | 〃 |
| Q13 S01 중복 큰 그림 | 있음 | 없음 | 〃 |
| 문서 높이 S06 1440 | 3,357 | 3,012 | 측정 JSON |

### 3.2 Q지표 전체(d72 기준; 최신 main에서 재측정하지 못함)

통과: Q01 전부, Q02, Q03, Q04, Q05, Q06, Q07, Q09, Q10, Q13, Q17. 실패: Q08(S15 1440), Q11(S11), Q12(S30·S32), Q14(S02·S03), Q15(S04). Q16은 판정 없음(`null`). 실패 중 Q11·Q12·Q14·Q15의 변형 표본은 `recommended:false`와 규칙 ID(V01~V04)가 붙은 의도된 반례다. 17개 청구의 `results` 전체가 `after-bento/claims-after-bento.json`과 JSON 단위로 같다(17/17 동일, 차이 0). 즉 V06 이후 Q 수치는 바뀌지 않았다.

### 3.3 육안 비교(직접 봄)

`compare.html`에서 폭 탭으로 전환해 볼 수 있다. 직접 연 것만 적는다.

| 표본·폭 | 본 것 |
|---|---|
| S07 320, 1440 | 히어로 수치가 한 줄 3칸. 수치 아래 간격이 눈에 띄게 줆. 개선으로 본다 |
| S27 320 | 제목 3줄→2줄. 개선. 일러스트 언덕이 사각 상자에서 직선으로 잘리는 모습은 그대로 |
| S05 1440 | 오른쪽 절반이 비던 반쪽 히어로는 가운데형으로 바뀜. 그러나 제목은 34px 그대로이고 시각 요소가 없어 첫 화면의 위계는 약함. 부분 개선 |
| S06 1440 | 벤토가 촘촘해지고 문서가 345px 짧아짐. 그러나 벤토 램프 그림 아래쪽이 잘림(측정으로 확인, 5절 R-04). 개선과 악화가 같이 있음 |
| S01 1440, 390 | 390px: 히어로와 같은 대시보드 중복이 사라짐. 1440px: 벤토 첫 칸이 글자 없는 큰 흐름도로 바뀌어 성김(5절 R-03). 혼합 |
| S12 768 | 도넛은 커졌으나 월별 매출 막대 차트가 작게(축 글자 약 7px) 가운데에 떠 있고 위아래가 크게 빔(5절 R-06) |
| S23 320 | 넘침 없음. 줄마다 가격 위치가 달라 일관성은 약함 |
| S21 320 | 탭 줄 오른쪽 탭("문의" 아이콘, "배송·교환")이 잘려 보임. 가로 스크롤 영역이라 Q17은 통과하지만 잘림 표시는 없음 |

직접 보지 못한 것: S02·S04·S11·S15·S17·S29·S30·S32의 변경된 폭, 그리고 S08~S34 대부분의 나머지 폭. 이들은 문서 높이·프로브·Q·바이트 일치 여부만 근거다.

### 3.4 좋은 화면 회귀(d72 기준, 완성도 높음으로 분류한 7개, 전부 4폭 촬영)

대상: S01, S10, S14, S18, S20, S25, S34(`samples.json`의 `kind: good`). `final/`에 28장을 새로 찍어 `before/`와 PNG 바이트를 비교했다(`cmp`).

| 표본 | 바이트 비교(320 / 390 / 768 / 1440) | 판단 |
|---|---|---|
| S10, S14, S20, S25 | 전부 동일(16장) | 변화 없음 |
| S34 | 320만 다름, 나머지 동일 | 320px 제목 33→32px로 줄고 높이 4px 짧아짐(진단 문서 11.2절과 같은 사실). 악화 아님으로 본다 |
| S18 | 4폭 모두 다름(바이트 56,215→56,126 등 수십 바이트) | 푸터 버전 문구 2.3.0→2.4.0 때문으로 추정. 문서 높이는 같음. 직접 열어 확인하지는 않음(확인 필요) |
| S01 | 4폭 모두 다름 | 의도된 변경(P01 그림 교체, 벤토 균형). 390px는 중복이 사라져 낫지만 1440px 벤토 첫 칸이 성겨 악화 가능성이 있다. 5절 R-03. 악화로 확정하지 않는다 |

따라서 "악화 0"이라고 쓸 수 없다. 7개 중 S01 하나는 혼합(개선과 악화 후보)이며, 나머지 6개는 변화 없음 또는 사실상 같음이다.

## 4. 검증 결과

디자인 계측과 캡처는 `d72d78389`, 최초 재개 검증은 `0ea13094c`, 기획 세션의 직접 확인은 `238d0bcf4` 기준이다. 이번 기준 갱신 후 직접 재실행한 명령은 `origin/main` `238d0bcf46f059f773c3395346ff36129f4c137e`에서 돌렸다. 이 원격 커밋은 요청된 `0ea13094c97dcc9e14e0a95e86b2fae52feeec99`를 포함하고, 그 뒤 두 커밋은 보고서·QA 기록만 변경했다. `0ea13094c` 이후 `src/` 변경은 없으며, `d72d78389..0ea13094c`의 `src/` 변경은 Recipe 선택 로직 두 파일뿐이다. 이번 실행 로그는 `docs/evidence/quality-2026-11-21/final/latest-rerun/`에 남겼다.

### 4.1 명령별 결과

| # | 명령 | 결과(마지막 출력 줄 또는 요약) | 작업자 보고와 차이 |
|---|---|---|---|
| 1 | 최신 main `npm run verify` | 종료 0. `tests 226 / pass 226 / fail 0 / skipped 0`; 마지막 `REPRODUCIBLE: 3304 generated files match a fresh build byte for byte.` | 최신 커밋에서 직접 재실행 |
| 2 | 최신 main `PW_PORT=4391 npx playwright test` | **67개 전부 실패.** 첫 테스트부터 Chromium headless가 시작 중 `bootstrap_check_in … Permission denied (1100)` 후 `SIGTRAP`. 앱 테스트 결과는 미확인. `tee` 파이프 사용으로 셸 종료 코드는 기록하지 못했고, Playwright 로그의 최종 요약은 `67 failed` | 같은 제품 커밋 `0ea13094c`의 GitHub Actions Ubuntu Chromium에서 전체 67/67 통과 |
| 3 | 최신 main `node scripts/design-qa/diagnose.mjs … --workers 8` 및 3a `grades-diff.mjs` | **미실행.** 앞선 `--help` 호출부터 진단 스크립트가 Chromium을 띄우려다 같은 권한 오류로 종료함. 아래 구조 등급과 등급 차이는 d72 기준 로그 | d72와 `238d0bcf4`의 기본·회전 테마 HTML 9,910개가 모두 동일 |
| 4 | 최신 main `node scripts/design-qa/width-sweep.mjs --out …` | **미실행.** 브라우저 기동 제한 뒤 추가 브라우저 시도는 중단. 이전 d72 결과: 심각 조합 7(320px EDGE 6·NARROW_COL 1, 768px 0), 전체 지적 조합 23 | 스윕의 기본 HTML 4,955개가 모두 동일 |
| 5 | 최신 main `node scripts/design-qa/quality-claims.mjs --phase final` | **미실행.** 브라우저 기동 제한. 이전 d72에서는 17개 청구 결과가 `after-bento`와 같았음 | 42개 Q 대상의 HTML 또는 Blueprint 계측값과 추천 정보가 모두 동일 |
| 6 | 최신 main `node scripts/design-qa/quality-shoot.mjs --phase final` | **미실행.** 기존 136장과 compare는 d72 기준. 원격 main의 Recipe 변경은 기본 조합 캡처 경로와 별개지만, 최신 캡처라고 단정하지 않음 | 34개 캡처 입력의 HTML이 모두 동일. 재촬영은 미실행 |
| 7 | 최신 main `node scripts/design-qa/ai-assembly.mjs verify` | 출력 `불일치: I02/recipe 저장 Blueprint = 코드/선택에서 재생성`, `verify 실패 1/91`. 기획 세션에서 직접 실행한 종료 코드는 1 | 현 main에도 I02 저장 Blueprint(`hero:product`)가 최신 Recipe 선택과 맞지 않음(4.5절) |
| 8 | 최신 main `compat-diff.mjs check` + `control` | `TOTAL inputs 15290 mismatches 0`; 음성 대조 `differ 85/85` | 최신 main에서 직접 재실행 |

### 4.1.1 기준 갱신 후 직접 재실행 (238d0bcf4, 0ea13094c 포함)

아래는 이번 대화에서 해당 SHA를 실행한 결과다. 이전 시도의 수치를 재사용하지 않았다.

| 명령 | 실행 결과·마지막 핵심 출력 | 종료 코드 |
|---|---|---:|
| `npm run verify` | `ℹ tests 226`, `ℹ pass 226`, `ℹ fail 0`, `ℹ skipped 0`; 마지막 `REPRODUCIBLE: 3304 generated files match a fresh build byte for byte.` | 0 |
| `PW_PORT=4391 npx playwright test` | `67 failed`. 첫 실패부터 Chromium 시작 시 `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer … Permission denied (1100)`, 프로세스 `SIGTRAP`; 테스트 본문은 실행되지 않음 | 1 |
| `node scripts/design-qa/diagnose.mjs … --workers 8` | Chromium 시작 실패 전에는 등급 산출 없음. 같은 `Permission denied (1100)` / `SIGTRAP` | 1 |
| `node scripts/design-qa/width-sweep.mjs --widths 320,768 --workers 8` | Chromium 시작 실패 전에는 폭 스윕 수치 없음. 같은 `Permission denied (1100)` / `SIGTRAP` | 1 |
| `node scripts/design-qa/quality-claims.mjs --phase final` | Chromium 시작 실패 전에는 Q 측정값 없음. 같은 `Permission denied (1100)` / `SIGTRAP` | 1 |
| `node scripts/design-qa/ai-assembly.mjs verify` | `불일치: I02/recipe 저장 Blueprint = 코드/선택에서 재생성`; `verify 실패 1/91` | 1 |
| `node scripts/design-qa/compat-diff.mjs check …` + `control …` | `TOTAL inputs 15290 mismatches 0`; `control: same 85 templates labeled 2.4.0 -> differ 85/85` | 0 / 0 |
| `node scripts/design-qa/quality-shoot.mjs --phase final` | 미실행: 앞서 세 개의 독립 계측 명령과 전체 브라우저 시험이 같은 Chromium 시작 제한으로 실패했다. `final/` 캡처는 `d72d78389`에서 나온 기존 136장으로 남아 있으며 최신 재촬영으로 표시하지 않는다 | — |

로그별 SHA는 `latest-rerun/commit.txt`에 있다. `ai-assembly.mjs verify`는 이전 보고 일부에서 종료 코드 0으로 적혔으나 이번 실제 실행은 1이었다. 이 차이는 성공으로 덮지 않고 위 로그와 같이 정정한다. 기준 커밋을 확인하기 전의 `ps -Ao …` 명령은 command worker에서 `operation not permitted`로 거부됐다. 실행 중복 여부는 호스트 자원 스냅샷에서 Playwright 작업이 보이지 않은 것까지만 확인했으며, 전체 프로세스 목록은 검증하지 못했다.

waitlist의 RC01은 제품 화면이 없는 비공개 베타 대기자 등록 페이지에 사유와 함께 면제한다. 독립 검증에서 조립기·갤러리에 이 사유가 빠진 문제를 확인했다(R-22). 이후 추천 메타데이터에 면제 정보를 전달하고 조립기, 갤러리 카드, 확대 보기에 규칙 ID와 사유를 표시했다. `satisfied`는 적용 대상 선택 규칙에 실패가 없음을 뜻한다. 면제 규칙은 지킨 규칙 목록에서 제외한다. 기본·회전 테마 조합의 렌더 출력 9,910개를 `67fd98b70`과 비교해 불일치 0개를 확인했다. 390px의 조립기와 갤러리에서 waitlist 면제 사유를 확인했고, 확대 보기에서는 히어로 수치 세 개가 보인다. devtool-landing에는 RC01이 지킨 규칙으로 표시된다.

최신 브라우저 실패는 macOS command worker의 `PW_PORT=4391 npx playwright test` 단계에서 발생했다. 로그는 Chromium이 포트를 열거나 테스트 코드를 실행하기 전에 `bootstrap_check_in … Permission denied (1100)`로 SIGTRAP 했음을 보인다. 비교 HTML은 설정된 Ttakkari browser로 열어 캡처 구조를 확인했다. 이때 브라우저 콘솔에는 `/favicon.ico` 404 하나가 있었고, 비교 페이지는 로드됐다. 별도로 GitHub Actions의 `npm run test:browser` 전체 로그를 확인했다. `0ea13094c`에서 67개 중 67개 통과, 실패·건너뜀 0이었다. `238d0bcf4`까지 제품 소스, 테스트, 생성 사이트, 패키지와 Playwright 설정에는 차이가 없다. [GitHub Actions Verify 44789298361](https://github.com/winterholic/design-system-static-kit/actions/runs/44789298361)

**계측 입력 대조.** `d72d78389`의 `src/`를 별도로 추출해 `238d0bcf4`와 같은 입력에서 `renderCombo`를 호출했다. 진단과 같은 순서의 기본·회전 테마 HTML 9,910개, 캡처 입력 34개, Q01–Q17의 42개 입력에서 불일치가 없었다. Q의 Blueprint 기반 항목은 반환값을 비교했다. 프로브 및 계측 스크립트는 두 커밋에서 같다. 비교 페이지에서는 34개 표본의 네 폭 모두를 열 수 있고, 전후 이미지 참조 272개를 확인했다.

### 4.1.2 RC01 면제 표시 변경 후 CI

제품 커밋 `9faa8bca4`의 GitHub Actions에서 `npm run verify`는 226개 통과, 실패·건너뜀 0개, 재현 가능한 생성 파일 3,304개를 기록했다. `npm run test:browser`는 Chromium에서 67개 모두 통과했다. 감사 로그에는 `exemptions: waitlist RC01`이 기록됐다. [GitHub Actions Verify 44794103760](https://github.com/winterholic/design-system-static-kit/actions/runs/44794103760)

### 4.2 과거 카탈로그 호환의 독립 확인(완료 기준 2)

고정 해시 파일(`legacy-*-hashes.json`)을 쓰지 않았다. 개선 전 커밋 `89573577f`를 별도 worktree로 꺼내 그 코드로 직접 컴파일한 출력과, 최신 main의 코드가 같은 입력에서 낸 출력을 비교했다(`scripts/design-qa/compat-diff.mjs`).

- 입력 15,290개: 고정 보관된 2.1.0 Blueprint 85 · 2.2.0 Blueprint 85 · 85개 템플릿 기본(개선 전 코드로 생성, 2.3.0) · 조합 4,955(개선 전 코드로 생성, 2.3.0) · 위 두 묶음의 `catalogVersion`을 2.2.0, 2.1.0으로 바꾼 것 각각 85+4,955.
- 비교 대상: `sha256(JSON.stringify(compile(blueprint)))`(출력 전체)와 html·css·manifest 각각. 오류도 문자열까지 대조.
- 결과: `TOTAL inputs 15290 mismatches 0`. 그룹별로 전부 byte-identical(`final/logs/compat-check.log`). 개선 전 코드 쪽 오류는 0건이다.
- 음성 대조: 같은 85개 템플릿 입력의 라벨만 2.4.0으로 바꾸면 85/85가 달라진다(`final/logs/compat-control.log`). 그래서 이 도구가 차이를 못 보는 것은 아니다.
- 한계: 2.1.0·2.2.0 라벨은 "2.3.0 입력에 라벨만 바꾼 것"이 진짜 과거 입력과 완전히 같지는 않다. 진짜 보관 입력은 `pinned-2.1.0`, `pinned-2.2.0` 그룹 85개씩으로 따로 확인했다. 기본 보기 외의 테마·서체 조합은 입력에 넣지 않았다.

### 4.3 평가 체계: S(구조)와 V(시각 완성도)의 현재 상태(완료 기준 5)

- **S(구조 등급)** 은 `diagnose.mjs`가 결정적으로 매긴다. d72 기준 A 4,538 · B 417 · C 0, 폭 스윕 심각 7이다. 이후 버전에서 동일한 브라우저·폰트 조건의 입력 HTML이 같은지 검증했다. Chromium 재계측은 미실행이다. 이 등급은 레이아웃 결함의 유무이지 디자인 완성도가 아니다. d72에서 좋은 화면 S01의 1440px 벤토가 성겨졌는데(R-03) 구조 등급과 프로브는 둘 다 변화가 없고, S06의 그림이 45% 잘렸는데(R-04) 어떤 검사도 지적하지 않았다.
- **V(시각 완성도)** 는 자동 판정이 아니다. `docs/quality-grades-2.3.0.md` 7.1절의 기본값 "미평가"가 지금도 그대로다. 보정용 사람 레이블은 0개다. `eval/human-labels.template.json`에 평가 양식이 있다.
- **현재 측정 가능한 V 후보 지표**: Q04(카드 아래 빈 공간), Q06(텍스트 히어로의 빈 비율), Q07(벤토 칸 빈 비율), Q08(차트 가로 왜곡·채움), Q10(히어로 뒤 간격), Q13(중복 그림). 이것들은 신호 후보이고 사람 판단과의 일치도는 확인되지 않았다. 일치하지 않는다는 반례가 이미 있다: AI 평가에서 I01·I02의 AI 팔은 Q06 실패인데 두 평가자 모두 1위로 매겼다(`eval/report.md` 4절). Q06은 동심원 장식을 시각 요소로 세지 않는 계측 특성이다. 반대로 이번에 본 S06 그림 잘림(45%)과 S12 작은 차트 글자는 지표 후보조차 없다.
- **AI 시각 평가**는 사람 레이블 대비 정확도가 없어 인용할 수 없다(7.4절 원칙). 이 문서는 그 평가 점수를 품질 근거로 쓰지 않았다.

### 4.4 이 재검증의 한계

- 디자인 계측과 캡처에는 macOS Chromium과 시스템 폰트를 썼다. Linux Chromium에서 브라우저 테스트를 실행했다. Safari, 실기기, Linux 전수 디자인 계측은 미확인이다.
- 시험 통과는 디자인 완성도의 증거가 아니다. `d72d78389`와 `0ea13094c` 모두 실행 가능한 환경에서 e2e 67개가 통과했다. macOS 작업자 셸의 `0ea13094c` 실행은 Chromium 시작 권한 오류로 실패했다.
- 스윕과 등급은 기본 테마 한 벌(등급은 회전 테마 1개 추가)이다. 54개 테마 전부는 재지 않았다.

### 4.5 AI 조립 증거의 정합성(실행 결과)

`238d0bcf4`에서 `selectRecipe({recipe:'saas-landing',templateId:'waitlist'})`를 실행했다. `layout:{}`, `satisfied:true`와 사유가 담긴 RC01 면제를 반환했고, 컴파일한 HTML이 기본 조립과 바이트까지 같았다. 히어로 수치는 `2,418`, `3주`, `4.8`이다. 저장된 I02 Recipe Blueprint는 아직 `layout:{hero:"product"}`(`recipe-picks.json`)이라 최신 선택과 다르다. 그래서 `ai-assembly.mjs verify`는 내부적으로 `verify 실패 1/91`을 보고한다. 기획 세션에서 `238d0bcf4`로 직접 실행했을 때 종료 코드는 1이었다. 평가 자료를 담은 `5638920fa`에서는 같은 명령이 91/91 통과했다. 최신 선택은 잘못된 히어로를 피하지만, 저장된 눈가림 평가 화면은 옛 `hero:product`를 가리킨다.

## 5. 잔여 문제

우선순위: P1 = 사용자가 보는 화면의 후퇴 또는 증거 신뢰 문제, P2 = 알려진 미해결 결함, P3 = 경미·정책·확인 필요. "출처" 열이 "신규"이면 이번 재검증에서 새로 찾은 것이다. 재현은 모두 worktree 루트에서 한다.

| ID | 우선순위 | 문제 | 재현 방법 | 담당 코드 | 출처 |
|---|---|---|---|---|---|
| R-01 | P1 | AI 조립 증거가 현 Recipe 선택과 불일치. I02 저장 Blueprint는 `hero:product`지만 현 Recipe는 waitlist 예외로 기본을 고른다. 눈가림 평가는 옛 화면을 평가했다 | `238d0bcf4`에서 `node scripts/design-qa/ai-assembly.mjs verify` → `불일치: I02/recipe`, `verify 실패 1/91`, 종료 1. `5638920fa`에서는 91/91 통과 | `scripts/design-qa/ai-assembly.mjs`(build·render·results·blind 순서), `docs/evidence/ai-assembly/`, `docs/ai-assembly-experiment.md` 3·7·10절, `eval/report.md` | 신규 |
| R-02 | P1 | 사람 레이블이 없어 V(시각 완성도)가 전부 미평가. AI 평가는 사람과의 일치도 미확인이라 게이트·근거로 못 씀 | `docs/evidence/ai-assembly/eval/human-labels.template.json`의 값이 `null`/빈 문자열 | `quality-grades-2.3.0.md` 7.3절 절차, `eval/` | 기지(여러 문서) |
| R-03 | P2 | S01(완성도 높음)의 1440px 벤토 첫 칸이 글자 없는 범용 흐름도로 바뀌어 크고 성김(렌더 1014×761px). 중복(Q13)은 없앴지만 제품 설명력이 약해짐. 악화로 볼지는 사람 확인 필요 | `final/S01__saas-landing__w1440.png`와 `before/`를 비교, `compare.html#S01` | `src/catalog/templates.mjs:29`(벤토 카드 `visual:'diagram'`, P01 결과), `src/layout.mjs` 2열 모드 큰 칸 | 신규(12.3절의 "성긴 흐름도"를 악화 후보로 격상) |
| R-04 | P1 | S06 1440px 벤토 큰 칸의 그림이 `slice`로 약 45% 잘림(viewBox 1:1을 1.81:1 상자에 렌더, 받침 타원이 잘림). before에는 없던 모습. 어떤 검사도 이를 지적하지 않음 | 아래 "R-04 재현" 참고. 시각 확인 `final/S06__product-landing__w1440.png` | `src/layout.mjs` `bentoFeatureCSS`(`15ad35827`), `src/render/art.mjs:63` | 신규 |
| R-05 | P2 | S05 `devtool-landing` 기본 조립의 히어로 제목이 34px로 작고 시각 요소가 없음. Q06은 통과(가운데형)했지만 위계는 약함. 위계 1.6배(RC02)를 채우는 것은 Recipe 조립뿐 | `final/S05__devtool-landing__w1440.png`, `docs/recipes.md` 5.1절 | `src/catalog/composition.mjs` P02, `src/typography.mjs` `display` 스케일, 템플릿 데이터 | 기지, 상태 재확인 |
| R-06 | P2 | S12 768px: 월별 매출 카드의 막대 차트가 작게(축 글자 약 7px) 떠 있고 위아래가 크게 빔. Q04는 비율 조건(35%<38%)으로 통과, 절대값 96px 조건 미충족(180px) | `final/S12__sales-dashboard__w768.png`, Q04 `worstEmpty:180` | `src/layout.mjs` `STRETCH_ABSORB`, `src/render/chart.mjs` | 기지(14.4절)+ 작은 글자는 신규 |
| R-07 | P2 | 차트 값 도메인·가로 늘림(C4): S15 1440 Q08 실패(축 최대 10에 데이터 최대 5.1, 종횡 왜곡 2.46배). `hr-people`은 이 때문에 Recipe가 추천 못 함 | `claims-final.json` Q08 `S15@1440:false` | `src/render/chart.mjs:7,16,77`(`niceMax`, `preserveAspectRatio="none"`) | 기지(진단 C4, 원인 9) |
| R-08 | P2 | 변형 렌더 결함은 고치지 않고 추천에서만 뺐다. S02·S03·S04·S11·S30·S32는 Q14·Q15·Q11·Q12 실패 그대로 열 수 있다(예: V04 2,266개 조합) | `claims-final.json`: `recommended:false`와 V01~V04 | `src/catalog/variants.mjs`(`setHero`, `cardsAs`, `heads:center`), `variant-contracts.mjs` | 기지(ADR 0006 한계) |
| R-09 | P2 | 달력 일정 목록 NARROW_COL(심각 코드): `calendar-view~data:bordered` 320px 62px 칸 | 스윕 JSON `final/sweep-320-768-final.json`에서 해당 id | `src/styles/chunks.mjs` 달력 목록, `scripts/design-qa/text-probe.mjs:94` | 기지 |
| R-10 | P3 | 탭 EDGE 6건(심각 코드, 320px `product-detail~tabs:boxed` 계열 6조합). Q17은 가로 스크롤 영역이라 오탐으로 판정. 그러나 육안으로는 끝 탭이 잘려 보이고 스크롤 표시가 없다(S21 320) | 스윕 JSON, `final/S21__product-detail+tabs-boxed__w320.png` | `src/styles/chunks.mjs:47` `.kit-tablist` | 기지, 사용성 문제는 신규 관찰 |
| R-11 | P3 | MEASURE_SHORT 399개 조합, MEASURE 27개(`saas-landing~faq:split`)는 한 번도 고치지 않음. 표본 프로브 지적 16건 중 15건이 이것 | `measure-final.json`의 S01·S02·S03·S04·S08·S09·S31 1440, S10·S11 768 | 글줄 폭 역할(`src/typography.mjs` max-width), 질문 분할 레이아웃 | 기지 |
| R-12 | P3 | 콘텐츠와 목업 불일치: `setHero`가 시각 요소가 없던 히어로에 넣는 `device` 목업은 범용 휴대폰 화면이다. Recipe가 고른 devtool 페이지에 소비자 앱 목업이 들어간다. 구조 측정은 이를 못 본다 | `docs/evidence/recipes/R1__recipe__w1440.png` | `src/catalog/variants.mjs:24-31` `setHero`, 템플릿 데이터 | 기지(`recipes.md` 6·7절) |
| R-13 | P3 | 테마가 셸·폭·스케일을 함께 바꿔 같은 Blueprint의 구성이 달라짐(S08 벤토 열 2→4, S13 사이드바→상단). 결함 단정 불가, 정책 미결 | Q16 `null`(판정 없음), `claims-final.json` | `src/catalog/themes.mjs`의 `D(...)` 기본값 | 기지(B6) |
| R-14 | P2 | Linux CI 폰트에서의 줄바꿈 미확인. 이 문서의 전수 디자인 계측은 macOS 폰트 기준이다 | 확인 못 함(`미실행`: 이 호스트가 macOS) | 전 렌더 | 기지 |
| R-15 | P3 | 상태 일러스트(언덕)가 상자에서 직선으로 잘림 | `final/S27__offline__w320.png` | 상태 화면 일러스트(`src/render/art.mjs` 계열, 정확한 위치 확인 필요) | 기지(C6) |
| R-16 | P3 | S23 320px에서 같은 메뉴 안 가격 위치가 줄마다 다름(점선 뒤 / 다음 줄 오른쪽) | `final/S23__menu-dining__w320.png` | `src/styles/chunks.mjs:161` `.kit-menu-row` | 신규 |
| R-17 | P3 | 브랜드 이름 ORPHAN_LINE 3건(768px, 196px 사이드바의 "FlowWorks 문서") | 스윕 JSON | 사이드바 폭, `WRAP` | 기지 |
| R-18 | P3 | `FIT` 칸 폭은 근사(`100vw − 2×거터 − 안쪽 여백`), 사이드바가 안 접히는 조합은 확인 못 함 | 확인 필요 | `src/typography.mjs` `FIT` | 기지 |
| R-19 | P3 | RC02(제목 ≥ 섹션 제목×1.6)는 1440px 기준만, 좁은 폭은 1.58배 | `docs/recipes.md` 7절 | `src/recipes.mjs` RC02 | 기지 |
| R-20 | P3 | 문서 정합: `quality-diagnosis-2026-11-21.md`에서 13.1절이 14절 뒤에 놓여 있고, 12.1절의 "3,466개"와 11절 이후 수치가 V06 이후의 3,714개와 섞여 있다(각 문서가 주석으로 일부만 밝힘) | 파일을 열어 절 순서 확인, `enumerateCombos().filter(c=>c.experimental).length` → 3714 | `docs/quality-diagnosis-2026-11-21.md`, `docs/adr/0006-*` | 신규 |
| R-21 | P3 | AI 팔은 입력마다 한 번만 만들어 변동 미측정. 입력 9개로 검정력 약함 | `eval/report.md` 3.3절 | `eval/` | 기지 |
| R-22 | P1 | RC01의 waitlist 면제 사유가 조립기와 갤러리에서 빠졌음 | 대기자 등록 템플릿 선택, 조합 카드 및 확대 보기에서 `RC01 면제`와 사유를 확인. devtool-landing에는 RC01이 계속 적용됨 | `src/recipes.mjs`, `src/combos.mjs`, `src/workbench.mjs`, `src/combos/app.mjs`; `tests/recipes.test.mjs`, `e2e/recipes.spec.mjs` | 표시 수정 |

**R-04 재현(측정)**: 
```
node -e "import('./src/combos.mjs').then(async m=>{const {chromium}=await import('@playwright/test');const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});await p.setContent(m.renderCombo(m.findCombo('product-landing')).html);console.log(await p.evaluate(()=>{const e=document.querySelector('.kit-bento svg'),r=e.getBoundingClientRect();return [e.getAttribute('viewBox'),e.getAttribute('preserveAspectRatio'),Math.round(r.width),Math.round(r.height)]}));await b.close()})"
```
관찰 값: `viewBox "0 0 320 320"`, `preserveAspectRatio "xMidYMid slice"`, 렌더 594×328px(상자 비율 1.81, 그림 비율 1). 잘리는 높이 비율은 `1 − 1/1.81 ≈ 0.45`. 85개 템플릿 기본 구성을 1440·768·390px로 훑었을 때 벤토 SVG는 9개이고 `slice` 잘림이 15%를 넘는 것은 이 1개뿐이다(`product-landing` 1440). 변형 조합까지는 훑지 않았다(확인 필요).

기획에서 S01과 S06의 1440px 전후 PNG를 다시 확인했다. S01의 대형 흐름도는 제품 보드의 구체적 정보를 덜 보여 준다. S06의 조명 받침과 그림자는 이미지 하단에서 잘린다. 두 결과는 위 표의 R-03·R-04에 남겼다.

## 6. AI 조립 비교

`docs/ai-assembly-experiment.md`, `docs/evidence/ai-assembly/eval/report.md`를 읽고 다음을 직접 확인했다. 기획 세션에서 `analyze.py`로 저장된 평가의 점수·부호 검정을 재계산했다.

**결론(보고서 그대로, 직접 검증한 것과 못 한 것 구분)**

- 보고서 결론은 "AI 선택이 기본·Recipe보다 낫다는 유의한 증거 없음, 도입하지 않음"이다. 1차 평가자(GPT 계열) 기준 AI 대 기본 승 4 무 1 패 4(p=1.0), 보조 평가자(Claude) 승 6 무 2 패 1(p=0.125). 저장된 평가를 재계산한 결과와 같다.
- 이 결론은 표본 9개, 비무승부 4~8개라 검정력이 약해서 "차이 없음"이라기보다 "판단 불가에 가깝다"고 읽는 것이 정직하다. 보고서도 3.3절에서 같은 말을 한다.

**이 재검증이 보탠 정합성 문제(R-01)**

- 평가 시점의 I02 Recipe 팔은 `hero:product`(히어로 수치 3개를 지우고 범용 휴대폰 목업을 넣은 화면)였다. 평가에서 이 화면은 GPT 19점으로 27개 화면 중 최저였다. 이후 V06과 최신 main의 RC01 waitlist 예외가 이 선택을 제거해 현재 Recipe는 기본과 같은 화면을 낸다(선택값 직접 확인, 4.5절). 저장 Blueprint와 눈가림 평가 자료는 여전히 갱신되지 않았다.
- 따라서 "Recipe 팔의 I02 평가"는 현재 Recipe의 평가가 아니다. 현재 기준으로 I02의 Recipe 팔을 기본 팔 점수로 대체하면(두 화면이 바이트까지 같으므로 이론상 허용되는 추정이며 재평가는 하지 않았다) GPT Recipe 합 평균은 23.00 → 23.22(=(207−19+21)/9)가 되고, I02에서 AI 대 Recipe는 여전히 AI 승이다. 즉 부호 검정의 방향은 바뀌지 않는다. 다만 이것은 내 산술이고 평가자가 다시 매긴 값이 아니다. 7개 입력이 이미 기본=Recipe였으므로 이제 8개가 되어 Recipe 대 기본 비교는 입력 1개(I01)만 남는다.
- 당시 팔과 점수는 평가 커밋의 기록으로 유지한다. 현재 선택으로 새 비교를 하려면 같은 조건으로 세 팔을 렌더하고 별도로 눈가림 평가해야 한다. 이번 표본에서 우위의 근거가 부족하므로 AI 조립은 도입하지 않는다.

**사람 레이블 없음(R-02)**: 사용자가 요청한 실제 목표(조립 결과의 디자인 완성도)에 대해 AI 평가는 게이트로 쓸 수 없고, 이 재검증에서 육안 비교도 내 한 번의 판단이다. "AI 조립이 더 낫다"도 "Recipe가 더 낫다"도 이 근거로는 주장할 수 없다.

**이 재검증과 AI 평가를 함께 보면**: 구조 지표(등급, 프로브, Q)로는 세 팔이 구분되지 않는데 시각 점수는 최대 4점 벌어진다는 보고서의 관찰(4절)은, 내가 본 S01·S06(구조는 통과, 시각은 혼합)과 같은 방향이다. 구조 지표를 높이는 것이 완성도를 높이는 것과 같지 않다는 사용자의 원칙이 다시 확인된다.
