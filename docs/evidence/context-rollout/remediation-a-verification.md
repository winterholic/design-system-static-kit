# R14-A 독립 검증

검증일: 2026-11-16 (Asia/Seoul)
판정: **교정은 실제로 적용됐으나, 1440px 차트에서 SVG의 비등방 확대가 마커 geometry를 왜곡한다.** 카드 규칙과 높이 cap은 효과가 확인됐다. 이 검증은 해당 저장 코드의 사용성 완성이나 미감 승인을 보증하지 않는다.

## 검증 대상과 revision

작업 저장소의 HEAD는 `61d2e5e5c51a58aeb6a7f4ecc2fc6a7337bd6864`였다. 대상 변경은 아직 커밋되지 않아 별도의 target revision SHA는 없다. 아래 SHA-256은 검증 시점의 working-tree 파일 지문이다.

| 파일 | SHA-256 |
|---|---|
| `src/composition.mjs` | `cd4e7bdc33d3fb667d12bee01eae65e253164c3a75457cbabf3c766e6f6764b5` |
| `src/render/chart.mjs` | `56158b95b3c8d7da072f690cf8b40a9ae7f801f933a4952a9a8ce070dd2869a9` |
| `src/render/nodes.mjs` | `ce5d45c08107299103096526bfbcc5338aad73d1dba98c9040400f3bc86bc9fb` |
| `tests/composition.test.mjs` | `590fef9c91a3061e608dd653f60c6e54c277af7b8ff59fb80a34809638aa3c6a` |

기존 diff의 네 파일은 위 네 파일과 일치했다. 그 외 untracked된 rule-ledger·visual-reaudit 파일은 읽거나 수정하지 않았다.

## 기존 48 receipts 대조

`docs/evidence/context-rollout/remediation-a/receipts/`의 YAML 48개에서 JSON 측정 payload 48개를 모두 파싱했다. 파일명 variant별 분포는 `after` 18개(6 입력 × 3 viewport), `before` 18개, `cap` 12개(4 입력 × 3 viewport)다. 각각 viewport, 구 선택자와 교정 선택자 매칭 수, 카드/미디어 상자, 차트 SVG/plot/font 상자, 문서 높이, 가로 overflow 필드가 들어 있다.

그러나 48개 모두 git SHA, source hash, blueprint/input hash, preview URL 필드가 없다. 따라서 receipts만으로는 측정 대상을 현재 저장 코드나 특정 입력 revision에 결속할 수 없다. 이 사유로 이전 수치를 그대로 현 revision의 증거로 간주하지 않았다. 새로 컴파일한 `blog-index` HTML은 보관된 검사 preview와 바이트 동일(61,157 bytes)이었으나, 이 한 입력이 다른 47개 receipts의 revision 귀속을 증명하지 않는다.

독립 브라우저는 프로젝트의 `scripts/serve.mjs` HTTP preview를 열었다. worker 목록은 비어 있었고, configured browser의 기존 탭은 `about:blank` 한 개였다. 390px blog/news, 1440px dashboard, 320px aside 및 509/510px chart-container를 새 preview에서 캡처했다. 페이지별 viewport와 측정 payload는 자동 저장된 browser snapshot에 있다.

## 관측

### 카드: 실제 선택자 교정

`blog-index`와 `news-home` 각각 390px에서 구 선택자는 0개, 동일 노드에 맞춘 선택자는 1개를 찾았다. blog 카드 358×486.9px / 미디어 356×200.3px, news 카드 358×498.3px / 미디어 356×200.3px였다. 둘 다 `overflowX=false`다. 이전 CSS의 560px 이하 미디어 너비 100% 규칙이 할당된 카드 안에서 실제 적용됐다.

### 차트 높이와 510px 경계

1440px `dashboard-analytics`에서 SVG cap은 340px였고 chart figure 높이는 481.5px였다. 큰 Cartesian SVG는 1254×340px, plot bbox 954.4×280.5px; 다른 Cartesian SVG는 602×340px, plot bbox 518.4×280.5px였다. 문서 가로 overflow는 없었다.

차트 본문 폭을 미리보기에서 정확히 509px, 510px로 둔 교정 경계 양쪽에서도 SVG는 각각 509×339.3px, 510×340px로 cap 이내였다. 두 폭 모두 원형 마커의 측정 비율은 1.0이었다. 510px 컨테이너 조건은 그 경계에서 시작되고, 보정 CSS의 `scaleX(510px / 100cqw)`는 510px에서 1배가 된다. 큰 1254px SVG의 텍스트는 CSS 11px, 라벨 상자 비율은 높이 18px 대비 문자열별 자연 폭으로 유지됐다. 이 경계 페이지에서 한 tick label 상자가 SVG의 왼쪽으로 약 5px 벗어났지만, native dashboard 1440 측정에서는 텍스트 상자 clipping probe 결과 0이었다. 경계 측정만으로 브라우저의 실제 paint clipping 여부는 단정하지 않았다.

### 실제 회귀: 1440px line marker 비율

Native dashboard의 602×340px Cartesian line SVG는 `preserveAspectRatio="none"` 상태다. 그 안의 circle marker가 11.7×9.9px(가로세로비 1.2)로 측정되어 원이 수평 타원으로 늘어났다. 509/510px 경계에서는 같은 SVG가 viewBox의 자연 비율로 표시되어 마커가 9.9×9.9px였다. 따라서 wide allocated box에서 커지는 x축 형상과 마커 왜곡은 실제이며, text scale 보정은 marker 형상을 보정하지 않는다.

같은 dashboard의 donut은 200×200px이며 `preserveAspectRatio`를 바꾸지 않아 원형을 유지했다. 1440px native chart의 label은 SVG 영역 밖으로 벗어난 상자가 0개였다. line plot의 x방향 데이터 형상 자체도 넓어진다. 이 검증은 이를 레이아웃 채움 의도와 별도로 geometry 변형으로 기록한다.

### 320px asymmetric aside 반례와 내용 보존

`docs-reference`의 실제 TOC 링크를 유지한 preview aside에 3계열·3범주 chart를 추가해 320px에서 확인했다. chart SVG 238×158.7px, plot bbox 181.1×130.9px, figure 288×361px였고 문서 가로 overflow는 없었다. 생성 전후 `href` 수는 16개로 같고 TOC가 남아 있었다. chart 데이터 표는 9개 숫자 셀 모두 유지(12, 2, 7, 1, 18, 3, 4, 6, 25), bar 도형도 9개, 계열색 토큰 `chart1`, `chart2`, `chart3`와 세 계열 legend가 유지됐다.

첫 probe 구성은 aside의 TOC 자리를 chart로 대체해 링크 4개를 잃는 입력 오류가 있었다. 이를 발견한 뒤 chart를 TOC 옆에 두는 preview로 고쳐 재측정했고, 최종 수치는 링크 16개 보존본에서 얻었다. 이 오류는 저장 소스나 사용자 산출물 변경이 아니며 검증 preview만 교체했다.

## 최소 후속 교정 제안

`preserveAspectRatio="none"`로 넓히는 설계는 유지하더라도, Cartesian SVG의 circle/rect/diamond marker에 x 확대 역보정을 중심점 기준으로 적용해 모양을 유지해야 한다. text만 보정하는 현 상태로는 line chart 계열 마커 비율이 어긋난다. 후속 테스트는 실제 wide container의 세 marker 형상과 line plot의 x형상, 509/510 경계를 함께 고정하는 것이 최소 범위다. 이 작업은 이번 범위(검증 preview와 증거 문서만 수정)에 포함하지 않아 소스를 바꾸지 않았다.

## 실행 증거

- `node docs/evidence/context-rollout/remediation-a/compile-preview.mjs verification-current` → `compiled=6 directory=.../verification-current/`
- Configured browser HTTP preview: `blog-index`/`news-home` 390px 선택자 `0 → 1`; dashboard 1440px SVG cap 340px; aside 320px overflow false; chart body 509/510px 양쪽 측정 완료.
- `node --test tests/composition.test.mjs tests/layout.test.mjs` → `tests 23`, `pass 23`, `fail 0`; 2.1 complete-output hash 계약 포함.
- `git diff --check` → exit 0.

브라우저 screenshot 파일은 이번 Run outbox의 `browser/` 아래에 생성했다. 카드 390px, dashboard native geometry, aside 320px, 509px·510px 경계 캡처가 있다. 전체 suite·전체 생성·배포·커밋은 실행하지 않았다.

## 이전 partial 작업 이력

직전 worker `52834042` / Run `5d4441d1`은 process 종료로 interrupted 됐고, 저장된 source diff와 `remediation-a.md`, RED/GREEN 로그, 48 receipts를 이번 검증 범위에서만 독립 대조했다. 이번 결과는 그 worker의 미완료 보고를 소급 완료 처리하지 않는다. 본 문서는 저장 코드를 수정하지 않았으며, UI 전체 품질이나 미감 승인을 주장하지 않는다.
