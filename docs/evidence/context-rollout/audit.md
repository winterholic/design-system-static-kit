# 맥락 규약 적용 감사

- 기준 감사 revision: `8c3d37c69047a08b08f70b26edfcc6d177b303d5` (`main`)
- 현재 감사 시점: 위 기준 커밋 이후 작업 트리 변경이 있음. 아래 “후속 구현 상태”가 현재 트리이며, 앞선 표·측정·최소안은 기준 커밋 당시의 스냅샷으로 읽는다.
- 기준 감사 적용 규약: catalog `2.2.0`, composition `1.0.0`; catalog `2.1.0` 출력 보존이 불변 조건. 현재 작업 트리 버전은 후속 구현 절 참조
- 관점: 기존 코드·테스트·생성 raw evidence 읽기. 코드·산출물·배포는 변경하지 않음
- 판정 용어: **직접**은 `compositionRules`의 해당 `type` 규칙이 실행됨, **기존만**은 구조·축·간격·상태·접근성 계약은 있으나 맥락 선택 규칙은 확인되지 않음을 뜻함. **추가 맥락**은 후보이며, 실제 적용 전 부품·폭·콘텐츠 반례로 고정해야 함.

## 요약

현재 맥락 결정표는 55개 카탈로그 부품 중 10개 type(page-header, hero, section, grid, split, card, metric, table, list, form)에 직접 적용된다. `page`와 나머지 44개 부품에는 의미·구조·상태·축·간격의 기존 계약이 있지만 맥락에 따른 역할/공간 선택은 없다. 확대는 `catalog/composition.mjs` 결정표, `composition.mjs`의 제한된 사실 추출, 기존 render/style 연결을 확장하는 편이 가장 작다. 범용 규칙 언어·Blueprint 옵션·런타임 의존성은 필요 근거가 없다.

2.2 경로는 기본 템플릿 생성, 조립기, 단일 갤러리, 조합 갤러리가 `createBlueprint()`를 공유해 이미 같은 버전 선택을 한다. 정적 기본 예시 85개의 현재 `site/examples/*/manifest.json`도 모두 2.2다. 2.1 입력은 명시적 migration 전까지 새 규약을 건너뛴다.

일반 관측 210건은 `MEASURE_SHORT` 166, `ORPHAN_LINE` 30, `MEASURE` 14의 프로브 집계다. 이는 고유 결함 210개가 아니며 회귀 raw JSON은 개별 사례 식별자를 저장하지 않는다. 그래서 메인이 현재 HEAD에서 85개 템플릿과 12개 부품·좁은 컨테이너 fixture를 고정하고 194뷰를 새로 측정했다(`inputs.json`, `before.json`). 이 측정은 finding마다 id·selector·치수·문구를 남기며 22건이다: `MEASURE_SHORT` 2, `ORPHAN_LINE` 7, `MEASURE` 11, `NARROW_COL` 2. 22건 중 실제 수정 후보는 `long-team`의 `NARROW_COL` 2건과 이에 딸린 `MEASURE` 4건(1440px 2건·390px 2건 `p` 중복 기록)이고, 원인은 코드로 특정됐다. 나머지는 의도된 짧은 소개 2건, 표 셀·이름 끝줄 `ORPHAN_LINE` 7건, 목록 `MEASURE` 7건으로 개별 판정이 필요하다. 22건은 210건의 부분집합이라고 볼 수 없다(뷰 집합이 다르다).

## 55개 카탈로그 부품 대조

기존 공통 재사용 기반은 `typography.mjs` 역할/서체 preset, `spacing.mjs` 밀도 tier·S01–S10·lint, `layout.mjs` flow/bestCols, `validate.mjs` 트리·페이지유형·상태 계약, 각 노드의 고정 variant와 renderer다. 표의 마지막 열은 부품별 추가 때 재사용할 기반을 적었다. 새 role·간격 값·자유 CSS 필드는 제안하지 않는다.

| 부품 (`nodeSpecs` type) | 현재 적용 여부 | 추가로 필요한 맥락 후보 | 재사용 가능한 기존 계약 |
|---|---|---|---|
| page (`page`) | 기존만: 루트·페이지 구조 | 본문/셸이 제공하는 실제 콘텐츠 폭 전달 | 셸 폭·페이지 유형·spacing |
| 페이지 제목 (`page-header`) | 직접 C01–C02 | 이미 직접 적용. lead 접기와 중복 제목 경계만 유지 | typography 역할, `leadOf`, 페이지 유형 |
| 히어로 (`hero`) | 직접 C15 | 이미 직접 적용. copy·visual 배정폭과 contained edge를 같은 정책으로 유지 | type/spacing/layout lint, hero variant |
| 섹션 (`section`) | 직접 C03–C05 | 이미 직접 적용. 중첩 surface와 섹션 목적 | heading 역할, R20, surface 검사 |
| 그리드 (`grid`) | 직접 C17 | 이미 직접 적용. 자식별 최소 폭 및 item/gap 간격 | `bestCols`, orphan-free flow, spacing tier |
| 2분할 (`split`) | 직접 C16 | 이미 직접 적용. 할당된 컨테이너와 ratio/reverse 보존 | 기존 split 비율·container query |
| 본문+보조 영역 (`aside`) | 기존만 | viewport가 아닌 main/side 실폭, 접힘 시 읽기 순서 | 기존 aside 구조, container query, flow |
| 벤토 격자 (`bento`) | 기존만 | 각 span의 자식 최소폭·큰 칸의 정보량 | 기존 bento span 및 자식의 grid/spacing |
| 탭 (`tabs`) | 기존만 | tab 수·라벨 길이와 tablist 가용폭 | tabs/tab 관계, 키보드·ARIA, overflow 계약 |
| 탭 패널 (`tab`) | 기존만 | 패널 안쪽 콘텐츠폭과 제목/본문 역할 | tab의 기존 부모 계약, 섹션·prose |
| 칸반 (`kanban`) | 기존만 | 열 최소폭, 열 수 및 가로 탐색 범위 | lane/task 트리 제한, 기존 스크롤 컨테이너 |
| 칸반 열 (`lane`) | 기존만 | 제목·카드 수에 따른 열 내부 간격과 최소폭 | kanban 구조, task renderer |
| 작업 카드 (`task`) | 기존만 | 제목·담당자·우선순위의 짧은 정보 위계 | data 필드 enum, 기존 행/카드 스타일 |
| 타임라인 (`timeline`) | 기존만 | 날짜/제목/설명 길이, line·rail·log 변형별 간격 | variant, 상태 enum, spacing tier |
| 단계 안내 (`steps`) | 기존만 | 단계 수·설명 길이와 horizontal/cards 전환 | layout variant, flow 및 기존 가로 스크롤 |
| 가로 스크롤 줄 (`reel`) | 기존만 | 카드 폭·peek 수·간격을 실제 영역에 맞춤 | card variant, scroll-snap 및 spacing |
| 목록+상세 (`master-detail`) | 기존만 | 실제 폭의 목록/상세 배분과 좁은 폭의 순서 | 기존 selected index·data 계약, split 배정폭 |
| 대화 (`chat`) | 기존만 | 발신/수신 묶음, 메시지·시간 길이, 말풍선 최대폭 | 메시지 from enum, 텍스트 줄바꿈 계약 |
| 월간 달력 (`calendar`) | 기존만 | 셀 실제폭, 날짜와 여러 이벤트의 표시량 | 날짜 유효성, grid와 기존 calendar overflow |
| 카드 (`card`) | 직접 C06–C09 | 이미 적용. product/editorial/feature 의미 구분 확장 시에만 근거 추가 | semantic facts, 기존 variant·motif·상품 필드 |
| 지표 (`metric`) | 직접 C10 | 이미 적용. 매우 긴 숫자/단위와 bucket 상한 반례 | `vlOf`/`cplOf`, roleSizes, flow 최소 셀 |
| 표 (`table`) | 직접 C13 | 이미 적용. 실제 폭에서 스크롤과 셀 밀도 | item tier, 열/행 의미, 기존 scroll region |
| 목록 (`list`) | 직접 C14 | 이미 적용. 상태별 밀도나 item 본문 길이 반례 | item tier, R06 상태/데이터 계약 |
| 폼 (`form`) | 직접 C11–C12·C18 | 이미 적용. 220/280 field 예산의 실제 입력·확대 반례 | label 폭 추정, fieldGap·inset tier, full-span 규칙 |
| 본문 (`prose`) | 기존만 | 본문/lead/legal의 목적별 measure와 인접 제목 관계 | typography 역할, 기존 variant, 문단 구조 |
| 알림 (`notice`) | 기존만 | tone·toast/banner 변형별 내용과 액션의 우선순위 | tone/variant, alert/status 의미, spacing |
| 액션 그룹 (`actions`) | 기존만 | 버튼 수·라벨 폭과 그룹 wrapping/정렬 | action 계층·주요 액션 검사, 컨트롤 최소크기 |
| 자주 묻는 질문 (`faq`) | 기존만 | split은 해당 컨테이너가 충분할 때만 선택 | stack/split variant, details의 의미/키보드 |
| 인용·후기 (`quote`) | 기존만 | 인용문 measure와 저자/역할의 부차 위계 | typography·cpl 추정, 인용 semantic markup |
| 기능 목록 (`feature-list`) | 기존만 | grid/list별 항목 최소폭, icon·제목·설명 묶음 | layout enum, 기존 flow와 spacing |
| 고객사 이름 줄 (`logo-cloud`) | 기존만 | 로고명 폭·줄 수에 따른 배치 | 기존 flex wrapping, 고정 logo mark |
| 행동 유도 띠 (`cta`) | 기존만 | copy와 액션 묶음의 실제폭·우선순위 | action 계약, tone, section heading 역할 |
| 태그 모음 (`tags`) | 기존만 | 긴 태그·밀도별 wrap과 행 간격 | chips/badges/outline variant, control spacing |
| 팀 소개 (`team`) | 기존만 | 사진/이름/역할/긴 bio의 폭·정보 위계 | flow 최소 셀, avatar/typography/spacing |
| 코드 블록 (`code`) | 기존만 | 줄 길이·복사 도구와 스크롤 viewport | `pre`의 기존 가로 스크롤·복사 상태 |
| 속성 목록 (`properties`) | 기존만 | label/value 비율에 따른 inline/stacked 가독성 | layout enum, 기존 value wrap 검사 |
| 차트 (`chart`) | 기존만 | chart kind·범례·category label 수와 실폭 | chart data/shape 검증, SVG·대비 계약 |
| 진행률 (`progress`) | 기존만 | label/value/detail의 관계와 좁은 표시폭 | 0–100 범위, progressbar ARIA |
| 상태 화면 (`empty-state`) | 기존만 | error/first-use 등 목적별 제목·설명·액션 묶음 | R06·kind/action 요구, role=status/alert |
| 스켈레톤 (`skeleton`) | 기존만 | target card/list/table의 실제 geometry 일치 | variant와 aria-busy 계약 |
| 이미지 자리 (`media`) | 기존만 | 실제 배정폭, aspect ratio, caption/overlay 경쟁 | ratio/motif/alt 계약, intrinsic media box |
| 갤러리 (`gallery`) | 기존만 | masonry/showcase/grid 각각의 컨테이너 기준 열 | layout enum, media 비율, 기존 flow |
| 브레드크럼 (`breadcrumb`) | 기존만 | 경로 길이·현재 항목과 좁은 폭의 생략/줄바꿈 | nav semantics, current page, 링크 라벨 |
| 페이지네이션 (`pagination`) | 기존만 | 페이지 수·현재 페이지와 컨트롤 폭 | 범위 검증, aria-current/disabled 의미 |
| 검색·필터 바 (`filter-bar`) | 기존만 | 검색창과 필터 칩의 실제폭 배분·wrap | 검색/그룹 semantics, control sizing |
| 단계 표시 (`stepper`) | 기존만 | 단계 수·라벨 길이·current/complete 상태 밀도 | range/current semantics, horizontal overflow |
| 주문·요약 박스 (`summary`) | 기존만 | item/합계 금액 폭·정렬과 thumbnail 배분 | metric 폭 추정 재사용 가능, 통화 값 보존 |
| 구매 박스 (`buy-box`) | 기존만 | 가격·선택지·주요/보조 액션의 우선순위 | card/product 의미, form/control/action 계약 |
| 리뷰 (`reviews`) | 기존만 | score/count와 본문/작성자 묶음의 폭·밀도 | rating 범위·텍스트 role·기존 list spacing |
| 메뉴판 (`menu`) | 기존만 | 항목명·가격·설명/사진 배치와 가격 정렬 | leader/grid/plain/photo variant, cpl 추정 |
| 링크 목록 (`links`) | 기존만 | label/description의 길이와 선택 표면 폭 | URL·링크 라벨 검사, list/flow |
| 구분선 (`divider`) | 기존만 | 양옆 문맥의 section rhythm; 의미 제목처럼 취급하지 않음 | spacing tier와 section nesting lint |
| 요금제 (`pricing`) | 기존만 | plan 수·각 plan 최소폭·실제 컨테이너 열 수 | grid/flow, featured plan 단일성 검사 |
| 요금제 항목 (`plan`) | 기존만 | 가격·기간·feature 목록·추천 강조의 상대 위계 | product/metric typography 재사용, feature list |
| 목차(자동) (`toc`) | 기존만 | 긴 앵커 제목·중첩 단계의 읽기폭과 줄 수 | anchor/TOC 유효성, list/link semantics |

**직접 규칙 범위 확인:** `compositionRules`의 type 집합은 10개다. 페이지 유형(`PAGE_INTENT`)은 결정 문맥으로 쓰이지만, 그 자체가 모든 노드 타입의 적용을 뜻하지 않는다. 표의 “직접”만 맥락 규약 적용으로 센다.

## 85 기본 템플릿 및 catalogVersion 경로

| 생성 경로 | 코드에서 확인한 흐름 | 2.2 전달 판정 |
|---|---|---|
| 카탈로그 기본값 | `src/catalog/index.mjs:createBlueprint()`가 `catalogVersion: CATALOG_VERSION`을 생성. `CATALOG_VERSION`은 `2.2.0`; `migrateBlueprint()`는 2.x 콘텐츠/축을 그대로 두고 명시 호출 때만 버전 변경 | 기본 생성은 2.2, 기존 2.1 보존은 의도된 별도 경로 |
| 정적 85 예시 | `scripts/build.mjs`가 각 `templateList`에 `createBlueprint(t.id)` → `outputFiles()`를 적용해 `site/examples/<id>/` 생성 | 현재 Node 확인에서 85/85 manifest가 2.2 |
| 테마 쇼케이스 | 같은 build가 대표 템플릿과 테마를 `createBlueprint(representative(theme), theme.id)`로 컴파일 | 동일 2.2 기본 경로 |
| 조립기 | `src/workbench.mjs`의 초기화·template/theme 선택·`compose()`가 `createBlueprint()` 사용; preview/commit은 compile | 기본 선택·조합은 2.2 |
| 단일 템플릿 갤러리 | `scripts/gallery.mjs`의 `make`, `thumb`, `openViewer`가 번들 `K.createBlueprint()` → `K.compile()` | 기본 예시·변형 preview 모두 2.2 |
| 전체 조합 갤러리 | `src/combos.mjs:comboBlueprint()`가 `createBlueprint()`에 template/theme/palette/variant/layout/type 전달, `renderCombo()`가 validate 후 compile; `src/combos/app.mjs`는 `CATALOG_VERSION`을 조합 표시/공유에 전달 | 브라우저 즉석 생성도 2.2; 정적 조합 파일을 만들지 않음 |
| CLI 및 test-lab | `scripts/kit.mjs` init와 `scripts/test-lab/generate.mjs`가 `createBlueprint()` 사용 | 2.2 |
| 이전 2.1 Blueprint | compile은 `planComposition()`에서 2.1이면 `null` 반환. migration 전 입력은 2.1 렌더 경로 유지 | 새 정책 제외. 2.1의 기존 계약 보존 |

실행 확인: `node --input-type=module` 카탈로그/manifest 확인 결과 `nodeTypes=55; templateList=85; site/examples=85; manifestsNotCurrent=0; catalog=2.2.0; composition=1.0.0`. 정적 산출물은 현 저장소에 존재하는 85개만 읽었다. 브라우저 UI 재실행은 이번 읽기 중심 감사의 범위에 포함하지 않았다.

## 일반 관측 210건: 원인별 판정

기준 raw는 `docs/evidence/context/regression.json`과 그 harness/probe 원문이다. 1,638뷰의 집계상 `failures=[]`인데 비심각 관측 210개는 별도 `findings` 카운터로 남아 있다. `records`에는 각 뷰의 실패 개수만 있고 개별 일반 finding의 `id`, selector, 문구, 치수는 기록하지 않았다. 그러므로 아래 건수는 발생 관측 수이며 고유 UI 결함 수가 아니다.

| 관측 원인 / 건수 | 원자료에서 확인한 검사 조건 | 변경 후보와 판정 |
|---|---|---|
| 조기 줄바꿈 `MEASURE_SHORT` / 166 | `text-probe`: 본문이 2줄 이상, 글자 크기 대비 폭 27em 미만, 부모에 48px 넘는 여유, 실제 사용 폭 98% 미만인 경우. max-width 때문에 부모 폭을 다 쓰지 않는 사례를 잡음 | 전수 폭 확장은 후보가 아님. 짧은 소개를 의도한 제한 폭은 보존. 개별 장문 본문이 좁은 보조 열에서 반복 검출될 때만 기존 container/flow 배정 확장 후보 |
| 마지막 한 줄 짧음 `ORPHAN_LINE` / 30 | `text-probe`: 2줄 이상 문단/제목에서 마지막 줄이 본문 2.2em(제목 3.2em) 및 최대 줄 폭 34% 아래 | 짧은 문장 끝·한 단어 강조 등은 문안/의도 후보이며 자동 복사 변경 근거가 아님. 재현되는 제목/설명에서 공간 부족이 확인될 경우 기존 최소폭 선택 또는 해당 컴포넌트 배치 후보 |
| 추정 줄당 글자 수 `MEASURE` / 14 | `layout-probe`: 40자 이상 텍스트의 평균 글리프폭 추정이 14–75자 범위를 벗어나고 줄 수 조건을 만족 | 평균폭 추정은 실측 글리프가 아님. 실제 좁은 영역/장문에서만 기존 flow 또는 container 규칙 후보; 일괄 타이포 값 변경은 근거 없음 |

**짧은 콘텐츠와 후보 구분:** 20개 고정 입력의 raw before/after에서 `MEASURE_SHORT` 2건은 둘 다 SaaS section description “도입 첫날부터 쓰는 기능만”, “연간 결제 시 두 달 무료”로, 21em/418px 제한 및 1016px 부모 여유로 관측됐다. 같은 문구·치수가 before와 after에 남아 정책 확장으로 바뀌지 않은 것을 확인했다. 짧은 섹션 소개를 보존하는 후보로 분류한다. 210 집계의 나머지는 regression raw에 사례 본문이 없으므로 **개별 판정 미확인**이다. 아래 194뷰 재측정이 같은 시점의 식별 가능한 근거이며, 210건 자체를 개별 판정하는 근거로는 쓰지 않는다. 심각도 완화나 예외 목록을 제안하지 않는다.

### 현재 HEAD 재측정 194뷰 (식별 가능한 22건)

- 입력: `inputs.json` 97개 = 템플릿 85 + 부품·컨테이너 fixture 12(`part-skeleton`, `part-breadcrumb`, `contained-quote|team|pricing|chart|cta|menu|master-detail|gallery-masonry|gallery-showcase`, `long-team`). 모두 `catalogVersion: 2.2.0`.
- 측정: `before.json`은 `revision 8c3d37c69`, `views 194`(템플릿 170 = 85×{1440, 390}, 부품 24 = 12×2), `status DONE`, HeadlessChrome 157, DPR 1. 뷰 단위 `overflow:true`는 0건.
- 실행 확인: `node` 로 records를 집계한 결과 `{ MEASURE_SHORT: 2, ORPHAN_LINE: 7, MEASURE: 11, NARROW_COL: 2 } 22`, `{ template: 170, component: 24 }`.

| 원인 | 건수 | 위치(id · 폭) | 판정 |
|---|---|---|---|
| 좁은 보조 열 안 team 2열 | `NARROW_COL` 2 + `MEASURE` 4 | `long-team` 1440: 본문 `p` 폭 68px(4.9em) 11줄, 줄당 약 6자. 390: 폭 139px 5줄, 줄당 약 12자 | **실제 수정 후보.** 아래 원인 설명 |
| 의도된 짧은 소개 | `MEASURE_SHORT` 2 | `saas-landing` 1440 section 설명 “도입 첫날부터 쓰는 기능만”, “연간 결제 시 두 달 무료”(418px/21em, 부모 1016px) | **보존.** 짧은 문장의 폭 제한이며 폭을 늘릴 근거 없음 |
| 긴 줄 | `MEASURE` 7 | `changelog` 1440 `li` 7건, 줄당 약 85–112자(>75), 폭 936px | 후보. 장문 목록의 줄 길이이며 기존 flow/container 폭 예산으로 다룰 수 있는지 반례 확인 필요 |
| 끝줄 짧음 | `ORPHAN_LINE` 7 | 390: `docs-reference` `td` 2건(끝줄 12·24px), `api-reference` `td` 2건(24px), `hr-people` `strong` 3건(28–34px) | 후보 아님이 우세. 좁은 셀·이름 줄바꿈의 끝줄이며 문안 수정 영역. 표 셀 최소폭이 확인될 때만 table 규칙 후보 |

**`long-team` 원인(코드 확인):** 입력은 `page > aside(side:end) > [prose, team(멤버 2, bio 장문)]`이다. `src/render/nodes.mjs:142`의 team은 `flowAttrs(n, 4, 'dense')`로 dense 흐름을 쓰고, `src/layout.mjs:31-36`의 `flowColumns`는 dense일 때 첫 구간 하한을 `FLOW.denseFloor`로 둔다. 실행 확인: `flowColumns(2,4,{dense:true,span:true})` → `[2,2,2,2]`, 일반 흐름은 `[1,2,2,2]`. 즉 dense 2항목은 컨테이너가 얼마나 좁아도 2열이다. `src/styles/chunks.mjs:37`의 `.kit-aside`는 보조 열을 300px로 고정하므로, 2열이 되면 카드 inset과 56px 아바타를 뺀 본문 칸이 68px로 줄어 11줄이 된다. 390px에서도 같은 dense 하한이 작동한다. `src/composition.mjs:44-45`는 summary 계열만 `dense:false`와 `minCell`을 정하고 team에는 맥락 결정이 없다(표에서 team은 “기존만”).

**기존 계약 재사용:** 새 엔진은 필요 없다. team에 `compositionRules` 항목을 추가해 bio 유무·길이에서 `minCell`을 파생하고 `dense:false`를 내보내면, 기존 flow 속성(`data-flow-min`, `data-flow-gap`)과 `@container kit` 구간 CSS가 컨테이너 폭에 따라 1열로 내린다. 2.1 출력은 `planComposition()`이 `null`을 반환하는 경로라 바뀌지 않는다.

**운영 배포 상태(메인 전달, 이번 감사에서 재확인하지 않음):** Vercel 운영본은 catalog `2.1.0`, template 85/node 55로 네트워크 확인됐다. Codex 셸의 `vercel whoami --json --non-interactive`는 `loggedIn:false`라서 이 셸에서는 배포 권한이 확인되지 않는다. 메인은 아직 production code를 바꾸지 않았다. 따라서 “운영본에 새 규약이 적용됐다”는 주장은 지금 근거가 없다.

`before.json`은 이 보강을 194뷰 범위에서 이미 충족한다(id, scope, 폭, 검사 코드, selector, 줄 수·폭·문구). 210건 범위(1,638뷰)에는 아직 없으므로, 그 범위를 다시 판정하려면 프로브 finding마다 `combo/template id`, theme/variant, viewport, component selector, 원문 텍스트 또는 길이, element/parent 폭, 코드·검사 threshold를 함께 남기는 것이다. 기존 QA evidence 형식을 늘리면 되며, 별도 범용 점수/엔진은 필요하지 않다.

## 기존 테스트·입력 경로 대조와 최소 변경안

관련 계약 위치는 `tests/composition.test.mjs`(2.1 전체 compiler hash, version, 결정성·role, conflict, 기존 lint), `e2e/composition.spec.mjs`(2.1/2.2 probe, page width), `tests/catalog.test.mjs`(템플릿/스키마/노드 검증), `tests/cli.test.mjs`(CLI와 갤러리 bundle), `tests/combos.test.mjs`(조합/버전 공유), `tests/compiler.test.mjs`(manifest/output), `scripts/check-generated.mjs`(site reproducibility)다. 감사에서는 내용을 읽어 입력 경로와 대조했으며 테스트 runner를 실행하지 않았다.

| 향후 수정 후보 | 최소 조정 | 합격 기준 |
|---|---|---|
| `src/catalog/composition.mjs` | 기존 제한형 C 규칙에 실제 반례가 있는 부품/의미만 추가. 필요한 사실 조건·priority·기존 role/tier 값만 사용 | 모든 규칙이 도달 가능한 catalog node에 적용되고, 같은 priority의 필드 충돌은 테스트에서 실패 |
| `src/composition.mjs` | 기존 tree 방문에서 필요한 semantic/폭 예산을 파생. viewport·실제 glyph 측정 주장 없이 `cplOf`/`vlOf`, `roleSizes`, `SPACE`, flow/container 재사용 | 같은 입력 결정성·입력 불변성, 산출 예산이 기존 lint를 통과하고 `manifest.design`으로 추적 가능 |
| `src/render/nodes.mjs` | 이미 연결된 `compositionAttrs`/node wrapper에 제한된 compiler 파생 속성만 전달 | 사용자 Blueprint의 임의 override 불가, 의미/DOM 읽기 순서와 2.1 출력 불변 |
| `src/styles/index.mjs` | 기존 `compositionCSS` 끝단 연결을 재사용. 실제 container query가 필요한 타입만 추가 | 선택한 2.2에서만 생성; 기존 type/spacing/layout lint 통과 |
| `tests/composition.test.mjs`, `e2e/composition.spec.mjs` | component coverage 명시, 짧은 콘텐츠 반례와 실제 좁은 영역 반례, 2.1/2.2 대조 유지 | 85개 템플릿 2.1 SHA-256 동일, 2.2 템플릿/조합/대표 경계에서 정책 추적·폭 동작 검증 |
| `scripts/design-qa/context-probe.mjs`, `context-regression.mjs` 및 해당 evidence 출력 | 일반 finding별 식별/치수 기록. 노드 예외 제외로 수치만 줄이지 않음 | 210개 집계의 재현/중복을 식별 가능하게 하고, 의도된 `MEASURE_SHORT` 2건은 계속 관측되는지 확인 |
| `src/catalog/composition.mjs` + `src/composition.mjs` (team) | team 규칙 추가: bio가 있으면 `minCell`을 파생하고 `dense:false`. 보조 열(`aside`) 안에서도 같은 flow 속성만 사용 | `long-team` 1440에서 `NARROW_COL` 0, 본문 칸 폭이 flow `minCell` 이상. 390에서 `MEASURE` <14자 0. 2.1 team 출력은 hash 동일 |

`src/catalog/index.mjs`, `src/compiler.mjs`, `scripts/build.mjs`, `src/combos.mjs`, UI 갤러리 생성기는 기본 version 전달이 이미 `createBlueprint()`/compile 경로를 통해 연결돼 있다. 버전 전달 자체를 위해 수정할 이유는 현재 확인되지 않았다. `site/` 예시 재생성은 구현 시 build 산출 과정이며 소스 수정 목록에 포함하지 않는다.

**최소안:** 기존 catalog/composition 결정표를 콘텐츠 목적·실제 부모 폭의 반례가 확인된 부품까지 확장하고, 기존 역할·간격·flow/container 계약을 그대로 재사용한다. 테스트는 버전 분리, 실제 `createBlueprint` 유입 경로, 재현 가능한 좁은/장문 반례와 2.1 전출력 hash를 고정한다. 새 런타임 패키지, Blueprint 자유 입력, 범용 규칙 언어는 현 감사 근거로 정당화되지 않는다. 미감 향상이나 사용자 승인은 이번 감사에서 측정하지 않았다.

## 감사 범위 제한

- `docs/context-audit.md`와 `docs/context-verification.md`는 작업 기준을 `9d40328... → 2.2.0`으로 서술하며 이 감사 HEAD는 그 변경 커밋 `8c3d37c...`다. 회귀 raw는 1,638뷰/0 failure 집계를 보유하지만 빌드 revision 메타를 자체 포함하지 않는다. 따라서 수치의 보고 근거는 기존 증거 문서이며, 이번에는 브라우저에서 다시 실행했다고 주장하지 않는다.
- 현재 `site/examples` 85 manifest의 버전 확인은 수행했다. 전체 4,955 조합의 브라우저 동작, 새 시각 진단, 사용자 평가/승인은 수행하지 않았다.
- 194뷰 측정은 메인이 `configured browser`로 수행한 결과를 `before.json`에서 읽었다. 이 감사는 브라우저를 다시 실행하지 않았고, `inputs.json`/`before.json` 값은 `node`로 집계한 것이다. Vercel 운영 catalog 2.1.0과 `loggedIn:false`는 메인의 전달값이며 직접 확인하지 않았다.
- 작업 트리에 `tests/composition-rollout.test.mjs`와 `contract-red.log`(5 fail/1 pass)가 있다. 메인이 작성 중인 계약 RED로 보이며, 이번 감사는 내용 일부를 참고만 하고 수정·실행하지 않았다. 해당 RED가 올바른 이유로 실패하는지는 검증하지 않았다.
- 작업 위치 밖 기록·보호 파일·다른 Run outbox는 읽지 않았다.

## 후속 구현 상태 (기준 감사와 분리)

이 절은 기준 감사의 관측·판정을 소급해 바꾸지 않고, 전달받은 공통 구현을 현재 작업 트리에서 확인한 상태다. 현재 `HEAD`는 여전히 기준 `8c3d37c69047a08b08f70b26edfcc6d177b303d5`; 구현은 미커밋 작업 트리에 있다. 따라서 이 절의 결과를 기준 커밋의 코드 상태나 운영 배포 상태로 읽으면 안 된다.

| 확인 항목 | 현재 작업 트리 상태 |
|---|---|
| 카탈로그 적용 범위 | `src/catalog/composition.mjs`의 `compositionCoverage`가 55개 부품 전체를 contextual/inherited로 명시한다. 기준 표의 “10개 직접, 나머지 기존만”은 C01–C18 시점의 기준 분류다. |
| 규칙·버전 | 규칙 C19–C35가 추가되어 `COMPOSITION_VERSION`은 `1.1.0`이다. 현재 구현은 aside/team/pricing/plan/quote/chart/calendar/gallery/timeline/properties/menu/master-detail/cta/feature-list/steps 등 기존 역할·spacing·flow·container 계약을 조합한다. |
| 컴파일·렌더 경로 | `src/composition.mjs`는 coverage 누락을 오류로 처리하고 각 방문 노드의 적용/상속 분류를 추적한다. `src/render/nodes.mjs`, `src/render/util.mjs`, `src/compiler.mjs`, `scripts/build.mjs`가 해당 파생 속성·manifest를 전달한다. |
| 19개 composition 계약 | `contracts.log`의 실행 출력은 `tests 19`, `pass 19`, `fail 0`이다. 개별 계약은 55개 coverage 추적, team bio 최소 셀, 할당 컨테이너, supporting pricing, 콘텐츠 예산 진단, 기존 vocab 안의 결정성 등을 포함한다. |
| 85개 레거시 출력 | 보존된 테스트 출력에서 `all 2.1 templates preserve the original complete compiler output byte for byte`가 통과했다. 즉 확인 범위는 2.1 템플릿 85개 전체 compiler output의 byte 단위 동일성이다. |
| 전체 Node 테스트 로그 | `unit-tests.log`는 `tests 143`, `pass 142`, `fail 1`이다. 실패는 `generated flow CSS is container-based, covers every count, and renders attributes the CSS can match`로, 현재 flow CSS 계약과 기존 테스트 기대의 불일치다. 이 감사에서는 테스트나 구현을 수정하지 않았고, 실패 원인을 더 추적하지 않았다. |
| 운영·배포 | 이 변경은 작업 트리 상태로만 확인했다. 이 절에서는 배포 또는 운영 사이트 반영을 주장하지 않는다. |

**해석:** 기준 감사의 55행 표·85 템플릿 경로·194뷰 및 210건 판정은 `8c3d37c`의 코드와 당시 저장된 증거에 대한 감사로 보존한다. 현 트리에는 composition 계약 범위가 확장되어 기준 문서의 최소 변경안은 이미 구현된 상태지만, 후속 구현의 브라우저 재측정은 이 감사에서 하지 않았다. 이전 194뷰의 `long-team` 결과를 현 구현의 통과 증거로 재사용하지 않는다. 미감 향상·사용자 승인·배포 반영은 측정/확인되지 않았다.
