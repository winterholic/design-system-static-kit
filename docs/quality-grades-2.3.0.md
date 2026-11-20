# 구조 등급 재측정(카탈로그 2.3.0)과 평가 체계 초안

측정일 2026-11-21(KST), 코드 `89573577f`, 카탈로그 2.3.0. 이 문서는 두 가지만 다룬다. 2026-10-21에 매긴 A/B/C 구조 등급을 현행 코드로 다시 잰 결과, 그리고 구조 품질과 시각적 완성도를 분리하는 평가 체계의 초안이다. 같은 날 만들어지는 실렌더 품질 진단은 별도 문서(`docs/quality-diagnosis-2026-11-21.md`)가 맡고, 이 문서는 그 결과를 쓰지 않았다.

## 1. 먼저 못 박는 것

A/B/C는 **측정 가능한 레이아웃 결함 등급**이다. 미적 완성도 점수가 아니다(`docs/diagnosis-round6.md`의 '한계', `docs/round6-quality.md` §6도 같은 말을 한다). 이 문서는 그 구분을 평가 체계로 굳히는 것이 목적이다. 3절과 4절의 결과는 모두 구조 등급이고, 시각적 완성도에 대해서는 아무것도 말하지 않는다.

## 2. 기존 등급을 만든 측정 경로

| 단계 | 파일 | 역할 |
|---|---|---|
| 실행기 | `scripts/design-qa/diagnose.mjs` | 고유 조합마다 기본 테마와 돌려 쓰는 테마 1개를 1440·390px로 렌더하고 세 프로브의 지적을 모은다 |
| 프로브 | `spacing-probe.mjs`(간격), `text-probe.mjs`(글줄·넘침), `layout-probe.mjs`(배치) | 렌더된 DOM에서 지적 코드를 낸다 |
| 등급 규칙 | `scripts/design-qa/diagnose-meta.mjs` | 심각 코드가 하나라도 있으면 C, 경미한 코드만 있으면 B, 없으면 A |
| 산출 | `scripts/design-qa/grades.mjs` | 등급 파일 `src/combo-grades.mjs`와 증거 JSON을 쓴다 |
| 기존 증거 | `docs/evidence/diagnosis-round6.json` | 2026-10-21, 커밋 `30f48dd47` 기준 4,955개 조합 |
| 일치 시험 | `tests/grades.test.mjs` | 증거의 조합 id 집합이 현재 카탈로그와 같은지, 요약 수치가 같은지 확인 |

기존 등급이 이 경로에서 나왔는지 대조군으로 확인했다. 10월 21일 커밋 `30f48dd47`을 임시 워크트리로 꺼내 같은 실행기를 세 템플릿에 돌렸더니 기존 증거와 같은 등급이 나왔다(changelog 3개 전부 B, api-reference 54개 전부 B, saas-landing A 360 / B 360). 이 확인은 세 템플릿에 한정했고 전수는 아니다.

## 3. 현행 코드 재측정

### 3.1 실행

```
node scripts/design-qa/diagnose.mjs /tmp/diag-2.3.0-c.json --label "2.3.0 89573577f" --workers 8
done 4955 combos 19820 views {"A":4515,"B":440,"C":0}

node scripts/design-qa/grades.mjs /tmp/diag-2.3.0-c.json --write --evidence-only
written 0 experimental combos {"A":4515,"B":440,"C":0}

node scripts/design-qa/grades-diff.mjs /tmp/diag-2.3.0-c.json --json /tmp/grades-diff.json
{"oldDist":{"A":4415,"B":540,"C":0},"newDist":{"A":4515,"B":440,"C":0},"counts":{"up":113,"down":13,"codesAdded":14,"codesRemoved":0,"countOnly":0,"onlyOld":0,"onlyNew":0}}
```

- 조건은 기존과 같다. 조합 4,955개, 렌더 19,820회(조합 × 테마 2 × 1440·390).
- 같은 명령을 세 번 돌렸고 조합별 지적 코드가 세 번 모두 같았다(1·2회와 1·3회 비교, 차이 0개).
- 측정 호스트는 이 Mac Studio(macOS 폰트)다. 6차 문서가 밝힌 대로 Linux CI와 줄바꿈이 다를 수 있다. Linux에서는 재지 않았다(미실행).
- 조합 id 집합은 기존 증거와 같다(`onlyOld` 0, `onlyNew` 0).

### 3.2 분포

| | 조합 | A | B | C |
|---|---|---|---|---|
| 2026-10-21 (`30f48dd47`) | 4,955 | 4,415 (89.1%) | 540 (10.9%) | 0 |
| 2026-11-21 (2.3.0) | 4,955 | 4,515 (91.1%) | 440 (8.9%) | 0 |

C 등급은 두 시점 모두 0이다. 심각 코드는 한 건도 없다. 따라서 `EXPERIMENTAL`은 계속 비어 있다.

### 3.3 지적 코드별 영향 조합 수

| 코드 | 심각도 | 2026-10-21 | 2026-11-21 |
|---|---|---|---|
| MEASURE_SHORT(좁게 제한된 글줄) | 경미 | 399 | 399 |
| ORPHAN_LINE(끝줄 한두 글자) | 경미 | 138 | 28 |
| MEASURE(한 줄 길이 범위 밖) | 경미 | 3 | 27 |
| 심각 코드 전체 | 심각 | 0 | 0 |

## 4. 기존 등급 대비 바뀐 조합

조합 140개가 바뀌었다. 나머지 4,815개는 등급과 지적 코드가 모두 같다. 전체 조합 ID는 부록에 있다.

| 구분 | 템플릿 | 조합 수 | 변화 | 결함 유형 |
|---|---|---|---|---|
| 상승 | api-reference | 54 | B → A | ORPHAN_LINE 해소 |
| 상승 | docs-reference | 54 | B → A | ORPHAN_LINE 해소 |
| 상승 | changelog | 3 | B → A | MEASURE 해소 |
| 상승 | music-player | 1 | B → A | ORPHAN_LINE 해소 (`music-player~intro:center~data:striped~split:mirror`) |
| 상승 | sales-dashboard | 1 | B → A | ORPHAN_LINE 해소 (`sales-dashboard~data:bordered`) |
| 하락(신규 결함) | saas-landing | 13 | A → B | MEASURE 신규 |
| 신규 결함(등급 유지) | saas-landing | 14 | B → B | MEASURE 추가(기존 MEASURE_SHORT 위에) |

- **상승 113개.** 모두 경미 지적이 사라진 것이다. 상승한 조합이 6개 템플릿에 몰려 있다.
- **하락·신규 결함 27개.** 13개는 A에서 B로, 14개는 B 안에서 MEASURE가 더해졌다. 27개 전부 `saas-landing` + `faq:split` 조합이다. 이 옵션이 든 `saas-landing` 조합 360개 중 27개(7.5%)에서 나온다. 첫 지적은 `p 줄당 약 14자(<14) 4줄 폭 216px @1440 studio`이고 1440px에서 질문 좌우 분할의 한쪽 칸이 좁아 본문이 4줄로 접힌 것이다. 경미 등급이라 갤러리에서 숨기지는 않지만 지적은 사실이다. 고치지 않았고(디자인 규약 코드는 범위 밖) 숨기지도 않았다.
- **심각 코드로 번진 것은 없다.** C로 떨어진 조합이 0개다.

### 4.1 원인 분리: 2.3.0이 바꾼 것이 아니다

예상과 달리 이번 변화는 타이포그래피 리비전 2(2.3.0, `d09d1d18d`)에서 나오지 않았다. 변화가 있는 6개 템플릿을 2.3.0 직전 커밋(`f22b9ae69`, 카탈로그 2.2.0)에서도 재 보았고, 6개 템플릿 모두 2.3.0과 등급이 같았다(`saas-landing` 720개의 MEASURE 27개 포함). 10월 21일 이후의 변화를 커밋 단위로 이분했다.

| 커밋 | changelog (A/B) | api-reference (A/B) | saas-landing (A/B) |
|---|---|---|---|
| `30f48dd47` 6차 라운드(기준) | 0 / 3 | 0 / 54 | 360 / 360 |
| `9d40328d6` | 0 / 3 | 0 / 54 | 360 / 360 |
| `8c3d37c69` 맥락 기반 조립 | 0 / 3 | 0 / 54 | 360 / 360 |
| `a9247f79c` 예제 전체에 맥락 조립 확장 | 3 / 0 | 0 / 54 | 347 / 373 |
| `5d2d1a6a7` 표·크롬·시퀀스·예제 내용 정리 | 3 / 0 | 54 / 0 | 347 / 373 |
| `f22b9ae69` (2.2.0) 이후 2.3.0 | 3 / 0 | 54 / 0 | 347 / 373 |

- `changelog` 상승과 `saas-landing` 하락은 `a9247f79c`에서 생겼다.
- `api-reference` 상승은 `5d2d1a6a7`에서 생겼다. `docs-reference`, `music-player`, `sales-dashboard`는 이분하지 않았고 `30f48dd47`과 `f22b9ae69` 사이에서 바뀌었다는 것까지만 확인했다. `docs-reference`는 `api-reference`와 같은 방식으로 움직였을 가능성이 높지만 확인 필요.
- 2.3.0 한글 타이포(자간·행간·크기 상한)는 이 구조 등급을 하나도 바꾸지 못했다. 이것은 타이포그래피 개선이 없었다는 뜻이 아니라, **구조 프로브가 한글 자간·행간의 좋고 나쁨을 재지 않는다**는 뜻이다. 5절과 6절의 분리 논거 중 하나다.

### 4.2 지금 남은 B 440개

| 코드 | 조합 수 | 분포 |
|---|---|---|
| MEASURE_SHORT | 399 | saas-landing 360, product-landing 27, b2b-solution 12 |
| MEASURE | 27 | saas-landing 27 (`faq:split`) |
| ORPHAN_LINE | 28 | campaign-donate 17, event-landing 4, checkout 2, hr-people 2, garden-shop 2, calendar-view 1 |

`MEASURE_SHORT`는 조합 399개에서 나오고(한 조합의 지적 건수는 최대 5) 6차 문서의 같은 항목과 숫자가 같다. 고치지 않았다.

### 4.3 산출물과 일치 시험

- `src/combo-grades.mjs`: `GRADES_META`에 `catalogVersion`("2.3.0"), `commit`("89573577f"), `date`("2026-11-21")를 기록하고 요약을 `{"A":4515,"B":440,"C":0}`로 갱신했다. `EXPERIMENTAL`은 `{}`다.
- `docs/evidence/diagnosis-2.3.0.json`: 새 증거(압축형). 6차 기록 `docs/diagnosis-round6.md`, `docs/evidence/diagnosis-round6.json`은 비교 기준으로 그대로 남긴다.
- `scripts/design-qa/diagnose.mjs`: 결과 `meta`에 `catalogVersion`·`commit`을 남기고 날짜를 KST 기준으로 쓴다(전에는 UTC라 0~9시에 하루 전 날짜가 찍혔다). 프로브·임계값·심각도 표는 건드리지 않았다.
- `scripts/design-qa/grades.mjs`: `--evidence-only` 옵션 추가. 6차 문서를 덮어쓰지 않고 새 증거와 등급 파일만 쓴다.
- `scripts/design-qa/grades-diff.mjs`(신규): 기존 증거와 새 측정을 조합 id로 비교해 상승·하락·신규 결함을 낸다.
- `tests/grades.test.mjs`: 증거 파일을 `diagnosis-<카탈로그 버전>.json`에서 읽고, 등급의 카탈로그 버전이 현재 버전과 같은지 확인하는 시험을 더했다. **전에는 카탈로그가 2.3.0이 되어도 조합 id만 같으면 통과했다.** 6차 증거가 2.3.0에서 낡은 채로 시험을 통과한 것이 그 증거다. 이제 카탈로그 버전을 올리면 재측정하기 전까지 시험이 실패한다. 날짜를 `"x"`로 바꾼 임시 변경에서 이 시험이 실패했고(`✖ the grades were measured on the current catalog version`, `fail 1`) 원래대로 돌리면 통과했다(`pass 4`, `fail 0`).

## 5. 구조적 품질 항목별 자동 검사 현황

기준은 이 저장소의 `diagnose.mjs` 프로브(등급에 반영됨)와 `e2e/`·`tests/`·`scripts/audit.mjs`(CI 게이트)다. 등급 열의 "심각/경미"는 `diagnose-meta.mjs`의 `SEVERE` 표를 따른다.

| 항목 | 자동 검사 있음 | 등급 반영 | 없는 것·한계 |
|---|---|---|---|
| 오버플로·잘림 | `OVERFLOW_X`(요소가 화면 오른쪽 밖, 문서 가로 넘침), `CLIP_TEXT`(overflow:hidden 안에서 글이 잘림), `EDGE_VIEW`(화면 가장자리 16px 안의 글자). e2e `pages`·`lab-pages`·`composition`·`combos`가 `scrollWidth` 넘침을 360~1600px에서 확인 | 심각 | 가로 방향이 중심이다. 이미지·SVG·표 셀의 잘림, 세로 방향 잘림은 전용 검사 없음(확인 필요). 히어로 시각 요소의 의도된 번짐은 `bleed`로 뺀다(6차부터 있던 예외) |
| 간격 계약 | `HEAD_GAP`, `PAIR_GAP`, `PROXIMITY`, `EDGE`, `PAD_ASYM`, `HEAD_ORPHAN`(심각), `OFF_SCALE`, `CTRL_PAD`(경미), 배치 쪽 `TIGHT_ROW`(심각), `BAND_ASYM`(경미). e2e `spacing`(시험 제목 기준 템플릿 61개 × 밀도 3 × 폰·데스크톱, 테마 회전. 현재 템플릿 수와 맞는지는 확인 필요) | 있음 | 토큰 단계 안에서의 반복 패턴과 섹션 사이 간격의 흐름(리듬)은 재지 않는다. 측정 폭은 등급이 1440·390 둘뿐이다 |
| 위계 역전 | `HIER_INVERT`(섹션 머리말이 페이지 h1보다 큼, 카드 제목이 섹션 머리말 이상). `tests/typography.test.mjs`가 역할 크기 순서를 18 프리셋 × 3 스케일로 증명 | 심각 | 글자 **크기**만 본다. 굵기·색·대비·위치가 만드는 시각 위계, 본문이 제목보다 눈에 띄는 경우, CTA가 묻히는 경우는 없다 |
| 잘못된 줄바꿈 | `ORPHAN_LINE`(끝줄 한두 글자), `ORPHAN_HEADING`(제목 끝줄 3자 이하), `CTRL_WRAP`·`VALUE_WRAP`(버튼·칩, 지표·가격이 줄바꿈), `NARROW_COL`, `BIG_NARROW`(좁은 칸의 큰 글자), `MEASURE`·`MEASURE_SHORT`(한 줄 길이) | CTRL_WRAP·VALUE_WRAP·NARROW_COL·BIG_NARROW는 심각, 나머지 경미 | 조사 분리, 숫자와 단위 분리, 어절 중간 줄바꿈처럼 한글 규칙 기준의 줄바꿈은 검사하지 않는다(`word-break: keep-all`은 CSS로만 보장, 확인 필요). 줄 수는 렌더된 줄 상자로 센다 |
| 격자·컨테이너 | `GRID_ORPHAN`, `EMPTY_CELL`(심각), `lintLayout`(흐름 밖 `repeat(N,…)` 금지)과 항목 2~12개 마지막 줄 고아 없음 증명(`tests/layout.test.mjs`, audit), e2e `quality`(고정 시드 표본 게이트와 음성 대조 8종) | 있음 | 정렬선은 `aligns`로 **재기만 하고 판정하지 않는다**. 카드 높이 불균형, 열 사이 면적 비율, 컨테이너 안 요소 비율은 판정 없음 |
| 접근성·반응형 | e2e `pages`·`lab-pages`: 이름 없는 버튼·링크·SVG, 라벨 없는 입력, 24px 미만 터치 영역, 표 caption·th, 중복 id, 끊어진 앵커. 키보드 포커스 표시, reduced motion, forced contrast. `audit`: 팔레트·모드 대비 33,600쌍. 폭 360/390/768/1280/1600 | **반영 안 됨** | 등급(A/B/C)에는 접근성·대비가 들어 있지 않고 별도 CI 게이트다. 등급의 반응형은 1440·390 두 폭뿐이다. 200% 확대·320px 리플로, 텍스트 간격 재정의, 포커스 순서, Safari·실기기, 스크린리더는 없음(6차 문서의 미확인 항목과 같다) |

- 위 표에서 "있음"은 규칙이 있다는 뜻이지 모든 조합에서 통과한다는 뜻이 아니다. 통과 여부는 3절의 결과다.
- 등급은 조합당 기본 테마 + 회전 테마 1개만 쟀다. 테마 54개 전부를 곱한 결과가 아니다.

## 6. 시각적 완성도 기준: 측정 후보와 사람 판단

이 절의 항목은 **구현하지 않았고** 어느 것도 현재 등급이나 게이트에 쓰이지 않는다. DOM·픽셀 측정은 "신호" 후보이고, 사람 판단과 얼마나 맞는지는 7.3절의 절차로 확인하기 전까지 알 수 없다.

| 기준 | 자동화 가능한 DOM 측정 후보 | 자동화 가능한 픽셀 측정 후보 | 사람·스크린샷 판단이 필요한 부분 |
|---|---|---|---|
| 정보 위계 | 요소의 크기·굵기·색 대비를 합친 시각 무게 순위가 DOM 의미 순위(h1 > h2 > 본문)와 같은지. 첫 화면(뷰포트 안)에 주 CTA가 들어오는지, 그 면적·대비 | 블러·다운샘플한 화면의 두드러진 영역(saliency)이 제목·CTA와 겹치는지 | 정말 무엇이 먼저 읽히는지, 중요도 판단이 맞는지, 의도한 강조인지 |
| 레이아웃 균형 | 요소 면적 × 대비로 가중한 좌우·상하 무게중심, 같은 줄 열의 높이 편차, `layout-probe`의 정렬선 수 | 비배경 픽셀 밀도를 격자로 나눈 분포, 좌우 비대칭 지수 | 의도된 비대칭(편집형 구성)과 어긋남의 구분, 시선의 흐름 |
| 시각 일관성 | 페이지 안 고유 값 수(font-size, border-radius, box-shadow, 색), 같은 역할 요소 사이 computed style 분산(카드 모서리·테두리), 팔레트 밖 색 사용 | 색을 양자화한 뒤 지배색 수와 비율 | 톤앤매너가 한 제품처럼 보이는지, 이질적인 장식이 있는지 |
| 여백 리듬 | 섹션 사이 수직 간격 열의 분산·반복성, 토큰 단계 사용 분포, 섹션별 내용 밀도(내용 면적 ÷ 섹션 면적)의 변화 | 행 단위 잉크 비율 프로파일의 자기상관(지나친 단조·불규칙) | 호흡이 편한지, 지루한지, 의도한 밀도 변화인지 |
| 타이포그래피 조화 | 서체 패밀리 수, 크기 비율이 고른 스케일에 맞는지(`typography.mjs`의 불변식이 이미 일부), 줄 길이·행간·자간 범위, `document.fonts`로 실제 폰트가 대체 폰트가 아닌지 | 줄 단위 잉크 밀도의 균일성(글줄 색조) | 제목·본문 서체의 짝, 한글과 라틴 혼식의 어울림, 2.3.0 한글 자간이 실제로 읽기 좋은지 |
| 콘텐츠-시각 요소 적합성 | 미디어 종류와 슬롯 비율 일치, 카드 안 텍스트 양 대비 칸 크기(`EMPTY_CELL`이 일부), 이미지·아이콘의 대체 텍스트 유무, 템플릿과 컨셉 매핑(`concepts.mjs`)이 맞는지 | 시각 요소 영역이 빈 자리표시자 수준인지(정보량이 낮은 영역의 비율) | 그림이 내용을 설명하는지, 장식 과다, 도메인에 어울리는지(카페 페이지에 코드 목업 같은 어긋남) |

- 각 기준에서 DOM·픽셀 후보로 줄일 수 있는 것은 "나쁜 것을 감지"하는 쪽이다. "좋다"를 선언하는 것은 사람 판단이다.
- 후보 중 결정적(같은 입력이면 같은 결과)이고 구조 결함으로 정의할 수 있는 것은 구조 프로브의 새 코드로 옮길 수 있다. 예: 주 CTA가 첫 화면 밖, 지배색 수 초과. 그때부터는 구조 등급이 된다.
- 위계, 균형, 조화처럼 임계값이 취향에 걸리는 것은 신호로만 둔다.

## 7. 평가 체계 초안

### 7.1 두 축을 따로 둔다

| 축 | 이름 | 무엇을 | 누가 매기나 | 값 | 게이트 |
|---|---|---|---|---|---|
| S | 구조 등급 | 5절의 측정 가능한 레이아웃 결함 | `diagnose.mjs`(결정적) | A 그대로 / B 손질 / C 재설계 | 예: C는 갤러리에서 실험으로 숨김, `tests/grades.test.mjs`, `e2e/quality.spec.mjs` |
| V | 시각적 완성도 | 6절의 여섯 기준 | 사람이 스크린샷을 보고(기본), 자동 측정은 참고 신호 | 기준별 양호 / 보통 / 미흡, 안 봤으면 **미평가** | 게이트로 쓰지 않는다 |

- 기본값은 V = **미평가**다. 지금은 모든 조합이 그 상태다. 4,955개 중 사람이 본 것은 대표 화면뿐이다.
- 표기는 `S:A / V:미평가`처럼 두 값을 나란히 쓴다. 한 값으로 합치거나 가중 평균을 내지 않는다.
- 금지하는 표기: "A 등급 = 잘 만든 디자인", "A 비율을 품질 점수로 보고", 구조 등급을 별점·점수로 환산, 구조 점수와 시각 점수의 합산. 6차 문서의 "갤러리 목록의 품질은 A 등급 비율로 본다"는 문장은 구조 결함이 없는 비율이라는 뜻으로만 읽어야 하며, 이 문서 이후에는 그렇게 쓰지 않는다.
- 이유는 두 가지다. 4.1절처럼 한글 타이포 개선이 구조 등급을 전혀 못 움직였다(구조 프로브가 재지 않는 영역이다). 반대로 `saas-landing`의 `MEASURE_SHORT`는 360개 조합에서 나오지만 그것만으로 그 화면이 못생겼다고 할 수 없다.

### 7.2 구조 등급 쪽 보강 우선순위

5절의 "없음"이 곧 후속 후보다. 순서는 제안일 뿐이다.

1. 등급에 접근성·대비·반응형 폭을 넣을지 결정한다. 지금은 CI 게이트와 등급이 따로 논다. 넣는다면 S 축의 하위 열로 둔다(예: `S-레이아웃`, `S-접근성`).
2. 한글 줄바꿈 규칙(조사·단위 분리) 프로브와 가로·세로 잘림 프로브를 더한다.
3. 정렬선(`aligns`)에 판정 규칙을 붙인다. 지금은 측정만 한다.
4. 등급 측정 폭을 360·768·1280으로 넓힌다. 렌더 수가 늘어나므로 비용을 먼저 확인한다(1440·390 두 폭은 이번 실행에서 수 분이었다).

### 7.3 시각 완성도(V) 쪽 절차

1. 층화 표본(템플릿, 테마, 폭)을 뽑아 사람이 기준별로 양호/보통/미흡을 매긴다. 평가자 둘 이상이 겹치게 매기고 일치도를 기록한다. 표본 크기는 이 초안에서 정하지 않았다(확인 필요).
2. 6절의 후보 측정을 같은 표본에 돌려 사람 판정과의 일치도를 본다. 일치하지 않는 후보는 버린다.
3. 일치가 확인된 후보만 "경고 신호"로 리뷰 화면에 띄운다. 구조 결함으로 정의되고 결정적인 것만 7.2절처럼 S 축으로 옮긴다.

### 7.4 AI 시각 평가를 쓴다면

- 시각 모델이 스크린샷을 보고 V 기준을 판정하는 방식은 **후보 중 하나일 뿐 품질 게이트로 쓰지 않는다.**
- 쓰려면 먼저 사람이 검토한 좋음/나쁨 사례 세트가 있어야 한다. 세트는 기준별·템플릿별·폭별로 양쪽이 모두 들어 있어야 한다.
- 같은 세트에서 AI 판정과 사람 판정의 정확도를 보고한다. 정확도, 혼동 행렬(좋음을 나쁨으로 보거나 그 반대), 같은 입력을 반복했을 때 판정이 바뀌는 비율을 함께 적는다. 모델 이름·버전·프롬프트를 고정해 기록한다.
- 사용 범위는 사람이 볼 후보를 추리는 분류(triage)와 보고서 초안까지다. 통과·실패를 가르는 용도는 아니다. 정확도를 보고하지 않은 AI 판정은 문서에 인용하지 않는다.
- 이 저장소에는 아직 사람이 검토한 좋음/나쁨 세트가 없다. 따라서 지금 AI 시각 평가는 쓸 수 없는 상태다.

## 8. 하지 않은 것·한계

- Linux CI 폰트 재측정: 하지 않음(이 호스트가 macOS). 6차 문서와 같은 한계다.
- 구조 등급의 지적 기준, 심각도 표, 프로브 임계값 완화: 하지 않음(범위 밖이며 하지 않기로 한 것).
- `saas-landing` `faq:split`의 MEASURE 27개, `MEASURE_SHORT` 399개의 원인 수정: 하지 않음(디자인 규약 코드는 범위 밖). 보고만 한다.
- `npx playwright test`(e2e)는 이번에 돌리지 않았다. 등급 재측정은 `diagnose.mjs` 경로이고 e2e 품질 게이트는 별개다.
- 2.2.0 시점의 전수 재측정은 하지 않았다. 변화가 있는 6개 템플릿만 2.2.0에서 재고, 나머지 템플릿은 2.3.0이 기존 증거와 같다는 사실로 갈음했다.
- V 축 측정 후보 구현, 사람 레이블 세트 제작: 하지 않음(초안 범위).

## 부록 A. 바뀐 조합 전체

결함 유형 이름과 뜻은 3.3절과 5절을 본다. 표의 숫자는 그 조합을 기본·회전 테마 × 1440·390 네 뷰로 렌더해 잡힌 지적 건수의 합이다.

### 부록 A-1. 상승 113개 (B → A)

| 조합 ID | 구분 | 등급 | 2026-10-21 지적(조합 내 횟수) | 2026-11-21 지적 |
|---|---|---|---|---|
| `api-reference` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:bordered` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:bordered~notice:banner` | 상승 | B → A | ORPHAN_LINE 7 | — |
| `api-reference~data:bordered~notice:toast` | 상승 | B → A | ORPHAN_LINE 7 | — |
| `api-reference~data:bordered~split:mirror` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~split:mirror~notice:banner` | 상승 | B → A | ORPHAN_LINE 10 | — |
| `api-reference~data:bordered~split:mirror~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~split:mirror~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~split:mirror~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~split:mirror~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~split:mirror~tabs:pill` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~split:mirror~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 7 | — |
| `api-reference~data:bordered~split:mirror~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~tabs:pill` | 상승 | B → A | ORPHAN_LINE 5 | — |
| `api-reference~data:bordered~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:bordered~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:striped` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~data:striped~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:striped~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:striped~split:mirror` | 상승 | B → A | ORPHAN_LINE 8 | — |
| `api-reference~data:striped~split:mirror~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:striped~split:mirror~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~data:striped~split:mirror~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:striped~split:mirror~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 5 | — |
| `api-reference~data:striped~split:mirror~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 5 | — |
| `api-reference~data:striped~split:mirror~tabs:pill` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~data:striped~split:mirror~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~data:striped~split:mirror~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:striped~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:striped~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 5 | — |
| `api-reference~data:striped~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:striped~tabs:pill` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~data:striped~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~data:striped~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~notice:banner` | 상승 | B → A | ORPHAN_LINE 5 | — |
| `api-reference~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~split:mirror` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~split:mirror~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~split:mirror~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~split:mirror~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~split:mirror~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~split:mirror~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~split:mirror~tabs:pill` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~split:mirror~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~split:mirror~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `api-reference~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~tabs:pill` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `api-reference~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 6 | — |
| `api-reference~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `changelog` | 상승 | B → A | MEASURE 14 | — |
| `changelog~data:bordered` | 상승 | B → A | MEASURE 13 | — |
| `changelog~data:striped` | 상승 | B → A | MEASURE 13 | — |
| `docs-reference` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~split:mirror` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~split:mirror~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~split:mirror~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~split:mirror~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~split:mirror~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~split:mirror~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~split:mirror~tabs:pill` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~split:mirror~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~split:mirror~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~tabs:pill` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:bordered~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:bordered~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~split:mirror` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~split:mirror~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~split:mirror~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~split:mirror~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~split:mirror~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~split:mirror~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~split:mirror~tabs:pill` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~split:mirror~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~split:mirror~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~tabs:pill` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~data:striped~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~data:striped~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~split:mirror` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~split:mirror~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~split:mirror~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~split:mirror~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~split:mirror~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~split:mirror~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~split:mirror~tabs:pill` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~split:mirror~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~split:mirror~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~tabs:boxed` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~tabs:boxed~notice:banner` | 상승 | B → A | ORPHAN_LINE 3 | — |
| `docs-reference~tabs:boxed~notice:toast` | 상승 | B → A | ORPHAN_LINE 5 | — |
| `docs-reference~tabs:pill` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~tabs:pill~notice:banner` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `docs-reference~tabs:pill~notice:toast` | 상승 | B → A | ORPHAN_LINE 4 | — |
| `music-player~intro:center~data:striped~split:mirror` | 상승 | B → A | ORPHAN_LINE 1 | — |
| `sales-dashboard~data:bordered` | 상승 | B → A | ORPHAN_LINE 1 | — |

### 부록 A-2. 하락 13개 (A → B, 신규 결함)

| 조합 ID | 구분 | 등급 | 2026-10-21 지적(조합 내 횟수) | 2026-11-21 지적 |
|---|---|---|---|---|
| `saas-landing~cards:filled~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:centered~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:centered~intro:center~cards:outline~rhythm:banded~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:centered~intro:center~rhythm:banded~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:cover~cards:outline~rhythm:banded~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:cover~intro:center~cards:filled~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:cover~rhythm:banded~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:product~cards:outline~rhythm:banded~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:product~intro:center~cards:filled~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:product~rhythm:banded~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:statement~cards:filled~steps:vertical~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~hero:statement~intro:center~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |
| `saas-landing~intro:center~heads:center~faq:split` | 하락·신규 결함 | A → B | — | MEASURE 1 |

### 부록 A-3. 등급 유지, 지적 종류 추가 14개 (B → B, 신규 결함)

| 조합 ID | 구분 | 등급 | 2026-10-21 지적(조합 내 횟수) | 2026-11-21 지적 |
|---|---|---|---|---|
| `saas-landing~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE 1, MEASURE_SHORT 3 |
| `saas-landing~hero:centered~cards:filled~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:centered~cards:outline~rhythm:banded~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:cover~intro:center~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:cover~intro:center~rhythm:banded~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:product~intro:center~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:product~intro:center~rhythm:banded~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:statement~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:statement~intro:center~cards:filled~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:statement~intro:center~cards:outline~rhythm:banded~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~hero:statement~rhythm:banded~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~intro:center~cards:filled~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~intro:center~cards:outline~rhythm:banded~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
| `saas-landing~rhythm:banded~steps:cards~faq:split` | 신규 결함 | B → B | MEASURE_SHORT 3 | MEASURE_SHORT 3, MEASURE 1 |
