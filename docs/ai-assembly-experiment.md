# 조립 방식 비교 실험: 기본 자동 조립 · Design Recipe · AI 선택 (카탈로그 2.4.0, 2026-11-21)

목적은 AI의 자유 CSS 생성 능력을 보는 것이 아니다. **같은 디자인시스템킷과 같은 카탈로그를 쓰면서 선택 품질을 얼마나 높일 수 있는가**를 눈가림 평가로 가리기 위한 재현 가능한 입력·결과 패키지를 만든다. 이 문서와 패키지는 **평가를 하지 않는다**. 눈가림 평가는 다른 제공사 평가자가 따로 한다. AI 기반 조립을 제품 기능으로 넣는 일은 이 실험의 범위가 아니고 평가 결과로 따로 정한다.

## 1. 한눈에

| 항목 | 위치 |
|---|---|
| 입력 9개(고정) | `docs/evidence/ai-assembly/inputs.json` |
| 세 팔의 Blueprint 27개 | `docs/evidence/ai-assembly/blueprints/<입력>__<팔>.json` |
| 결정성 해시(Blueprint, 컴파일 HTML), 기준 커밋 | `docs/evidence/ai-assembly/hashes.json` |
| 320·390·768·1440px 스크린샷 108장과 측정 | `docs/evidence/ai-assembly/shots/`, `measure.json` |
| 같은 표(구조 등급·심각 프로브·Q지표·RC) | `docs/evidence/ai-assembly/results.md` |
| AI 팔 시도 로그, 최종 선택 | `docs/evidence/ai-assembly/ai/log.json`, `ai/selections.json`, 본 화면은 `ai/attempts/<입력>/a<n>__w1440·w390__sheet.png` |
| 눈가림 패키지(평가자용) | `docs/evidence/ai-assembly/blind/`(JPEG 108장 + `index.html`) |
| 라벨 대응표(평가자에게 주지 않음) | `docs/evidence/ai-assembly/key.json`(blind 밖) |
| 재현 스크립트 | `scripts/design-qa/ai-assembly.mjs`, 시험 `tests/ai-assembly.test.mjs` |

측정 기준 커밋은 `hashes.json`·`measure.json`의 `originMain`이다(세 팔을 모두 같은 커밋에서 렌더했다).

## 2. 입력

입력은 "페이지 목적과 콘텐츠가 고정된 Blueprint 또는 브리프"다. **콘텐츠는 카탈로그 템플릿의 `tree`·`chrome`**이고 `content.sha256`으로 고정했다(스크립트가 대조한다). **브리프**(목적·청중·톤·주 행동·콘텐츠 사실)는 AI 팔만 읽는다. 브리프에는 해법을 쓰지 않고 콘텐츠 사실만 적었다(예: "제품은 CLI·CI에서 도는 빌드 도구다(소비자 앱이 아님)").

| ID | Recipe 유형 | 템플릿(콘텐츠) | 내용 | Recipe가 기본과 다른가 |
|---|---|---|---|---|
| I01 | SaaS 랜딩 | devtool-landing | 빌드 도구 v3.2 소개 | 다름(`hero:product` + `saas/trust`) |
| I02 | SaaS 랜딩 | waitlist | 비공개 베타 대기자 등록 | 다름(`hero:product`) |
| I03 | SaaS 랜딩 | saas-landing | 팀 업무 SaaS 소개 | **같음** |
| I04 | 업무 대시보드 | sales-dashboard | 4분기 영업 현황 | **같음** |
| I05 | 업무 대시보드 | dashboard-overview | 프로젝트 현황 | **같음** |
| I06 | 업무 대시보드 | hr-people | 채용과 인원 현황 | **같음**(Recipe가 추천하지 않는 사례, `satisfied:false`, RC05) |
| I07 | 콘텐츠 페이지 | article | 디자인 노트 에세이 | **같음** |
| I08 | 콘텐츠 페이지 | docs-reference | API 시작하기 문서 | **같음** |
| I09 | 콘텐츠 페이지 | blog-post | 짧은 블로그 글 | **같음** |

Recipe가 기본과 같은 조합을 고르는 입력 7개를 숨기지 않고 넣었다. 선택은 `docs/recipes.md` 5.1절과 같고(15개 중 `devtool-landing`, `waitlist`만 다름) 이 9개는 그 15개의 부분집합이다. 템플릿을 고정한 이유: 템플릿이 곧 콘텐츠이므로 팔이 템플릿을 바꾸면 콘텐츠가 바뀐다.

## 3. 팔 정의

| 팔 | 정의 | 만드는 방법 |
|---|---|---|
| 1 기본 자동 조립 (`default`) | `createBlueprint(템플릿 id)`: 템플릿 기본 테마, 구성 변형 없음 | 코드, 결정적 |
| 2 Design Recipe (`recipe`) | `selectRecipe({recipe, templateId})`의 선택을 `recipeBlueprint(템플릿, 구성 변형, look)`로 푼 Blueprint | 코드, 결정적(난수·시간 없음) |
| 3 AI 선택 (`ai`) | AI(이 작업을 한 Claude)가 카탈로그 ID만 골라 렌더하고 1440·390px 스크린샷을 직접 본 뒤 최대 2회 재선택. 최종 선택을 Blueprint로 저장 | 선택은 사람(AI)이 정하고, 저장된 Blueprint는 결정적으로 컴파일 |

## 4. AI 팔 제약과 절차

**고를 수 있는 것**(선택 스키마, `selectionToBlueprint`): `look`{컨셉, look}, `theme`, `themeVariant`, `palette`, `mode`, `typography`, `density`, `scale`, `layout`{슬롯: 옵션}. 모두 카탈로그의 ID다. 목록은 `node scripts/design-qa/ai-assembly.mjs catalog <입력>`이 보여 준다(그 입력의 템플릿에서 유효한 구성 변형 슬롯·옵션과 `!`로 표시한 비추천 옵션, 컨셉 look, 테마 54개, 서체 18개, 밀도·스케일·모드).

**쓰지 않는 것**: 자유 CSS, 임의 클래스, 임의 토큰, 문구 편집, 입력 변경. 스키마 밖 필드는 던지고 없는 ID나 템플릿에 없는 구성 변형도 던진다(`tests/ai-assembly.test.mjs`가 확인). Blueprint에서 템플릿 문구를 바꿀 경로가 없고, 팔마다 트리 문자열 차이(`contentDiff`)를 해시와 함께 기록한다(AI 팔은 추가·삭제 0, 시험이 고정). **템플릿은 고르지 않는다**(템플릿이 콘텐츠이므로). 폭·셸·반경 같은 축은 선택 스키마에 넣지 않았다(테마가 정하는 값이다).

**절차**: 입력마다 `try`로 선택을 렌더(1440·390px)하고, 보기용 시트(1440px는 0.55배로 2조각, 390px는 4조각을 나란히)를 이미지로 직접 보고, 본 문제와 바꾼 이유를 적고, 필요하면 재선택한다(시도는 최대 3회 = 최초 + 재선택 2회). 시도 횟수: I01 2회, I02 3회, I03 2회, I04 2회, I05 1회, I06 2회, I07 1회, I08 1회, I09 1회. 마지막 선택을 `record`로 저장하면 `ai/log.json`(시도별 선택 ID, 본 것, 문제, 바꾼 이유, 개선점, 남은 문제)과 `ai/selections.json`이 만들어진다. `ai/attempts/<입력>/`에는 AI가 실제로 본 시트와 시도별 프로브 요약(`a<n>__report.json`)이 있다.

**AI 팔이 본 개선점**은 `ai/log.json`의 `improvements`와 `remaining`에 입력마다 적었다. 이 문서는 그것을 판정으로 쓰지 않는다.

**하지 않은 것**: 팔 1·2의 스크린샷은 AI 팔 작업 중 보지 않았다(앵커링 방지, 프로브 요약 수치는 시도 보고서에만 있다). 같은 이유로 선택 후에 팔 1·2와 비교해 AI 선택을 고치지 않았다. 아래 한계 1절은 그래도 남는 오염을 적는다.

## 5. 재현

```
node scripts/design-qa/ai-assembly.mjs build     # 세 팔 Blueprint 생성, 해시·기준 커밋 기록 (hashes.json, recipe-picks.json)
node scripts/design-qa/ai-assembly.mjs verify    # default·recipe를 코드로 다시 만들고 ai는 저장 Blueprint를 다시 컴파일해 해시 대조(91개 검사)
node scripts/design-qa/ai-assembly.mjs render    # 320·390·768·1440px 스크린샷과 측정 (shots/, measure.json)
node scripts/design-qa/ai-assembly.mjs results   # results.md(같은 표)
node scripts/design-qa/ai-assembly.mjs blind     # blind/와 key.json (시드 20261121 고정)
node scripts/design-qa/ai-assembly.mjs blind --standalone out.html   # 휴대폰 공유용 단일 HTML(이미지를 줄여 내장)
node --test tests/ai-assembly.test.mjs           # 입력·선택 제약·로그 형식·눈가림 중립 검사(렌더 해시 비의존)
```

- `verify`가 확인하는 것: ① 입력 콘텐츠 해시, ② default·recipe를 코드로 다시 만든 Blueprint가 저장본과 같음, ③ ai 선택에서 다시 푼 Blueprint가 저장본과 같음, ④ 저장 Blueprint의 해시, ⑤ 저장 Blueprint를 컴파일한 HTML의 sha256이 `hashes.json`과 같음. AI 팔은 선택(`ai/selections.json`)이 아니라 저장 Blueprint가 정본이다.
- 같은 머신에서 `render`를 두 번 돌려 PNG 108장의 sha256과 측정값이 모두 같았다(`pngSha256`을 `measure.json`에 기록). 다른 폰트 환경의 일치는 확인하지 못했다.
- **렌더 해시는 렌더러·카탈로그가 바뀌면 달라진다**(다른 작업이 `src/layout.mjs`를 고치면 달라진다). 그래서 해시 검사는 전역 `node --test`가 아니라 `verify`에 둔다. 코드가 바뀌면 `build` → `verify` → `render` → `results` → `blind`를 이 순서로 다시 돌린다. 팔 3의 선택은 다시 하지 않는다(선택 ID는 그대로, 렌더만 바뀐다).
- 포트는 쓰지 않는다(`page.setContent`). 다른 도구와 같이 쓸 때는 `PW_PORT` 환경변수는 필요 없다.

## 6. 측정 기준 커밋과 재렌더

- AI 팔의 시도(선택과 육안 확인)는 origin/main `2f99f3078`(벤토 높이 균형 수정 전)에서 했다.
- 작업 중 origin/main이 `f1eb262d7`(벤토 높이 균형·도넛 링 수정, `src/layout.mjs` 변경 포함)로 올라가 **rebase한 뒤 세 팔을 모두 다시 컴파일·렌더**했다. 저장된 스크린샷, 측정, 해시, 눈가림 패키지는 모두 이 커밋 기준이다(`measure.json`의 `originMain`).
- 따라서 AI가 시도 중에 본 화면(`ai/attempts/`의 시트)과 평가용 스크린샷은 벤토·도넛 영역이 다를 수 있다. AI 선택은 다시 하지 않았다. 재선택을 다시 하면 AI 팔의 조건이 달라진다.
- 렌더와 눈가림 패키지 생성을 마친 뒤, 커밋과 push 직전에 `git fetch`로 origin/main을 다시 확인했고 `f1eb262d7` 그대로였다(변경 없음, 추가 재렌더 불필요). 이 실험 커밋은 파일만 더하고 `src/`를 바꾸지 않아 측정 기준 커밋과 렌더 결과가 같다. 측정 기준은 `results.md` 첫 줄과 `hashes.json`에 있다.

## 7. 결과 표 (사실만, 판정 없음)

`results.md`에 입력 × 팔 27행의 구성 변형, 테마·팔레트·서체·밀도·스케일·셸, 구조 등급(4폭 중 최악)과 경미 지적 코드, 폭별 심각 프로브 지적, 히어로 제목 대 섹션 제목 비(RC02의 브라우저 값), 관련 Q지표(해당 폭만, 값 포함), 이 유형 Recipe의 선택 시 규칙(RC) 중 실패한 것, 폭별 문서 높이를 같은 표로 적었다. 평가 결과가 아니라 측정이다.

이 표를 만들면서 드러난 사실(판정 없음):

- 심각 프로브 지적은 27행 모두 0이다. 구조 등급은 I03·I05가 B(경미 `MEASURE_SHORT`, 세 팔 같음), 나머지는 A다.
- 기본과 Recipe의 컴파일 HTML이 같은 입력은 7개(I03~I09)다. I01·I02는 세 팔이 모두 다르다. AI 팔은 I05·I08처럼 표 모양만 바꾼 경우를 포함해 9개 모두 기본과 HTML이 다르다.
- **`waitlist`(I02)의 Recipe 선택 `hero:product`는 히어로 수치 3개(대기 중인 사람 2,418 · 평균 초대 시간 3주 · 베타 만족도 4.8)를 지운다.** `setHero`가 split·product로 바꾸며 `facts`를 정리하기 때문이다(`contentRemoved`에 기록). `docs/recipes.md`는 이 문구 삭제를 적지 않았다. AI 팔은 이 수치를 지우지 않도록 `hero:statement`를 골랐다.
- I01 AI 팔은 Q06(시각 요소가 없는 히어로는 글줄 오른쪽 빈 영역이 콘텐츠 폭의 45% 미만이어야 통과)에서 × 50%다. `hero:statement`의 동심원 장식(motif)이 Q06의 시각 요소(`.kit-hero-visual`)로 세어지지 않기 때문이다. I02 AI 팔도 같은 이유로 ×(55%). 기본 I02는 ○(32%)다.
- I06 hr-people의 Q08(차트 가로 왜곡)은 기본·Recipe 2.13배, AI(trust 테마) 1.89배로 세 팔 모두 ×다(AI는 줄였으나 1.5배 이하는 아님).
- I01 Recipe의 범용 휴대폰 목업(`device`)은 구조 측정(RC01, Q06 ○)을 통과하지만 빌드 도구와 무관하다(`docs/recipes.md` 6절과 같은 사실). 구조 측정은 이 콘텐츠 적합성을 보지 못한다.

## 8. 눈가림 패키지

- `blind/<입력 번호 01~09>_<라벨 A·B·C>_<폭>.jpg` 108장과 `blind/index.html`. 라벨은 입력마다 세 팔에 시드 `20261121`의 무작위 순열로 줬다. 대응은 `key.json`(blind 밖)에만 있다.
- 평가자가 보는 폴더에는 팔 이름이나 힌트가 없다. 파일명은 번호·라벨·폭뿐이고 `index.html`에는 입력 목적·청중·톤(브리프)만 있다. `tests/ai-assembly.test.mjs`가 폴더 구성과 `index.html`에 팔 이름이 없는지 확인한다.
- `index.html`은 폭 탭(320·390·768·1440)과 입력마다 A·B·C 나란히 보기, 이미지 확대(탭하면 원본) 구조의 단일 HTML이다. 폰 화면에서 직접 확인했다(390px 뷰포트 스크린샷). 이미지는 상대 경로다. 파일 하나로 열 수 있는 사본은 `--standalone`으로 만든다(이미지를 줄여 내장).
- 같은 화면인 팔(I03~I09의 기본=Recipe)은 같은 이미지가 두 라벨에 들어 있다. 숨기지 않았고 평가자는 두 라벨이 같다는 사실을 볼 수 있다(그것이 평가의 한 결과다).
- 스크린샷은 `page.screenshot({fullPage:true})` 전체 높이이고, blind JPEG는 같은 이미지의 JPEG(quality 82)다. 원본 PNG는 `shots/`에 있다.

## 9. 한계

1. **AI 팔의 오염**: 선택을 한 Claude는 같은 세션에서 `docs/recipes.md`, `ADR 0007`, `quality-diagnosis` 5·6·12·13절을 읽었다. R1(devtool)·R3(waitlist)의 Recipe 결과와 범용 목업 문제를 이미 알고 있었다. 팔 1·2 스크린샷은 보지 않았지만 이 지식은 AI 선택에 영향을 줬을 수 있다. I01·I02에서 `hero:product`를 쓰지 않은 선택에 가장 의심스럽다.
2. **AI 팔은 한 번만 만들었다**: 같은 입력에 대한 AI 선택의 변동(재현성)은 측정하지 못했다. 평가는 이 한 번의 선택을 AI의 대표값으로 읽게 된다.
3. **보는 방식의 한계**: 1440px는 0.55배 축소 시트, 390px는 세로 4조각 시트로 봤다. 320·768px는 AI가 보지 않았다. 작은 글자와 색 대비는 육안으로 정밀하게 보지 못했다(프로브 값에 의존).
4. **AI 팔의 시도는 `2f99f3078`에서, 평가용 렌더는 `f1eb262d7`에서** 이뤄졌다(6절).
5. **선택지 범위**: 템플릿(=콘텐츠)은 고정이고 폭·셸·반경 등은 테마가 정한다. 팔 사이 차이는 {구성 변형, look·테마·변형, 팔레트, 서체, 밀도, 스케일, 모드}에 한정된다. 카탈로그의 구성 변형이 없는 템플릿(I03의 벤토 배열 등)은 AI가 해결할 수단이 없었다.
6. **표본**: 입력 9개, 그중 7개는 기본과 Recipe가 같다. 기본 대 Recipe의 차이를 말하려면 입력 2개뿐이다. 유형별 3개는 하한이다.
7. **구조 측정은 콘텐츠 적합성을 못 본다**(위 7절). 심각 프로브 지적 0, 등급 A는 보기 좋음이 아니다.
8. Chromium(`chromium 156`)·macOS 폰트만 측정했다. Linux CI의 줄바꿈은 확인하지 못했다. `devtool` 테마의 기본 모드 `auto`는 헤드리스 Chromium에서 라이트로 렌더되고, AI 팔은 `mode:dark`를 명시했다. 사용자의 시스템 설정에 따라 기본 팔은 다르게 보일 수 있다.
9. **평가를 하지 않았다.** 표의 수치와 AI 로그의 개선점은 평가용 입력이지 결론이 아니다. AI 기반 조립의 제품 도입 여부는 눈가림 평가 결과로 따로 정한다.

## 10. 눈가림 평가 결과 (2026-11-21)

상세는 `docs/evidence/ai-assembly/eval/report.md`. 위 9절 항목 9("평가를 하지 않았다")는 이 절 이전 시점의 기술이다.

- **결론: AI 선택이 기본·Recipe보다 낫다는 유의한 증거는 없다(차이 없음).** 1차 평가자(GPT 계열) 기준 AI 대 기본 승 4 무 1 패 4, AI 대 Recipe 승 3 무 2 패 4, 부호 검정 양측 p=1.0. 보조 평가자(Claude)는 AI 쪽으로 승 6 무 2 패 1(p=0.125)이지만 유의하지 않다. 평균 합(30점 만점)은 기본 23.00, Recipe 23.00, AI 23.67(GPT)이다.
- **표본이 9개라 검정력이 약하다.** 비무승부가 4개 이하이면 어떤 방향이든 p 하한이 0.125여서 유의해질 수 없다. 기본과 Recipe는 7개 입력에서 같은 화면이라 Recipe 비교는 입력 2개뿐이다.
- **구조 지표와 시각 점수가 어긋난다.** 구조 등급은 입력 안에서 세 팔이 같은데 시각 점수는 최대 4점 벌어진다. I02 Recipe는 구조가 깨끗한데 두 평가자 모두 꼴찌, I01·I02 AI는 Q06 ×인데 1위다(보고서 4절).
- **권고: 지금은 AI 기반 조립을 제품 기능으로 도입하지 않는다.** 유의하지 않으면 도입하지 않는다는 원칙에 따른다.
- **이 평가는 AI 평가이고 품질 게이트로 쓸 수 없다.** 사람이 검토한 좋음/나쁨 레이블과 비교해 정확도를 확인하기 전에는 인용하지 않는다. 사람 레이블 양식은 `eval/human-labels.template.json`이다. 보조 평가자 Claude는 생성자와 같은 제공사라 판정에는 쓰지 않았다. 1차 평가 모델 이름은 배정 기록(`gpt-6-luna`)과 파일(`gpt-6.2-sol`)이 다르다.
- 순서: `blind-verdicts.json`을 커밋 `ddd0963dd`에서 고정한 뒤 `key.json`을 열었다. 재현은 `python3 docs/evidence/ai-assembly/eval/analyze.py`.
