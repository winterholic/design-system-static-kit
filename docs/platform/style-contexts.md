# 스타일 맥락과 기타 재료

- 범위: 테마 54개를 스타일 맥락으로 옮기고, 표면·모션·배경·아이콘/미디어·상태 패턴과 차트 프리셋을 조립 플랫폼 재료로 잇는다. 작업 W4.
- 기준: [ADR 0012](../adr/0012-assembly-platform.md) §3, [WBS](wbs.md) W4, [감사](audit-2026-11.md) §2.3, §2.6.
- 코드: `src/platform/data/style-contexts.mjs`, `charts.mjs`, `surfaces.mjs`, `motion.mjs`, `backgrounds.mjs`, `media.mjs`, `states.mjs`.
- 이 문서의 표는 코드에서 만든다: `node tests/platform-style-doc.mjs --write`. `tests/platform-style-doc.test.mjs`가 표와 코드가 같은지 본다.

## 1. 결과

<!-- generated:counts -->
- 스타일 맥락: 54개(테마 54개 전부, `styleContextFromTheme`으로 등록)
- 선언 관계(스타일 맥락 → 팔레트·서브토큰 세트·타이포 시스템·패밀리): 2366개. prefers 1477, avoids 828, forbids 61
- 관계 대상(main에 등록된 재료): 팔레트 9 · 서브토큰 세트 7 · 타이포 시스템 14 · 패밀리 4
- 스타일 재료 프리셋: surface 5 · motion 4 · background 5 · media 6 · state-pattern 8
- 차트 프리셋 관계: 29개, 형태 14종 × 페이지 유형 16종
<!-- /generated:counts -->

- Coolors 팔레트 427개는 옮기지 않았다. 스타일 맥락 기록에 테마의 `palettes`가 들어가지 않는다(시험이 54개 모두 본다).
- 같은 테마에서 여러 결과가 나오고, 같은 재료가 여러 테마에서 쓰인다. 표면·모션·배경·미디어는 맥락마다 허용된 선택지 수를 3절 세 번째 표에 적었다(예: `2/5`는 5개 중 2개만 금지에 걸리지 않는다).

## 2. 설계

### 2.1 스타일 맥락이 담는 것

스타일 맥락은 값을 정하지 않는다. 추천 순위를 정하고, 금지한 값을 가진 재료를 후보에서 뺀다. 계약(`KIND_SPECS['style-context']`)이 받는 필드는 `axisPreferences`, `forbid`, `mood`와 공통 필드뿐이다. 그래서 요구 정보를 두 곳에 나눠 담았다.

| 요구 정보 | 담는 곳 | 비고 |
|---|---|---|
| 주요 용도 | `STYLE_CONTEXT_DETAILS[테마].use`, `character` | 테마 설명 문장을 둘로 나눈 것 |
| 페이지 유형 맥락 | 기록의 `contexts` + `pageTypeReason` | 테마마다 2개 이상. `pageTypeIds` 안의 값만 |
| 금지 조합 | 기록의 `forbid`(축 값 금지, 모양·바탕·장식·모드 전부) + `forbid.combos`(테마 기본값에서 한 축만 바꿔도 걸리는 축 금지 조합 `axisBans`) | 테마가 이미 금지한 값은 조합 목록에서 뺀다 |
| 간격·반경·그림자·모션 성향 | 기록의 `axisPreferences`(`density`, `radius`, `elevation`, `motion`: 기본값이 첫 선호, 인접 값이 차선) + `tendencies`(px, 그림자 CSS, 시간) | px와 CSS는 `src/spacing.mjs`·`src/styles/base.mjs` 표에서 읽는다 |
| 미디어·아이콘 스타일 | 기록의 `axisPreferences.icon·backdrop·ornament` + `media` | 6가지 아이콘 스타일은 모두 미디어 프리셋이 있다 |
| 레이아웃·내비게이션 선호 | 기록의 `axisPreferences.shell·width·scale` + `layout`(셸 설명, 내비 항목 한도, 메가 메뉴 가능 여부) | 조립 엔진 페이지 단계가 셸·폭·밀도를 선호로 읽는다(ADR 0012 §3) |

모양 외의 축(`density`, `shell`, `width`, `icon`, `backdrop`, `ornament`, `scale`)은 지금 패밀리의 모양에 없으므로 `recommend()`의 패밀리 순위에는 닿지 않는다. 스타일 재료 순위(`rankStyleMaterials`)와 페이지 단계가 읽는다.

### 2.2 관계 도출 규칙

스타일 맥락에서 나가는 관계(`relations`)는 규칙으로 계산한다. 대상은 `data/palettes.mjs`, `subtoken-sets.mjs`, `type-systems.mjs`, `families.mjs`에 **main에 올라온 재료**뿐이다. 다른 작업이 재료를 더하면 이 파일을 고치지 않아도 같은 규칙으로 관계가 늘어난다(`deriveStyleRelations`, 시험이 가짜 재료로 규칙을 직접 본다).

| 대상 | 규칙(priority) | 이유로 남는 근거 |
|---|---|---|
| 팔레트 | **테마별 1·2순위를 id로 정한다**(아래): 1순위 prefers 70, 2순위 30. 정하지 않은 팔레트는 테마 설명의 색 이름에서 읽은 색상각 대역에 브랜드 원색이 들어가면 prefers 15, 60° 넘게 벗어나면 avoids 20, 그 사이는 8. 색감 요구가 없으면 어두운 모드에 어두운 톤 15, 업무·읽기·기관에 중립 계열 15, 선명한 톤은 브랜드·생활·앱에 15(그 밖에는 avoids 10), 나머지 10 | 순위와 팔레트 성격, 색상각(°), 톤 |
| 서브토큰 세트 | **테마별 1·2순위를 id로 정한다**: 1순위 prefers 70, 2순위 30. 그 위에 태그 규칙이 더해진다. `brand-surface`는 바탕이 `tint`·`gradient`면 prefers 30, 밀도 compact면 avoids 15. `neutral-surface`는 바탕이 `plain`·`grid`면 30, 틴트 바탕이면 5. `dark-first`·`dark-surface`는 어두운 기본 모드에 25, 밝은 모드에 avoids 10. `high-contrast`는 기관 분류·signal·civic·school에 25. `editorial`은 읽기 분류에 25, 글·문서 유형이면 10. `commerce`는 커머스 유형에 25. `data`는 데이터 유형+고밀도에 25, 데이터·대시보드 유형이면 15. 규칙이 하나도 닿지 않은 세트는 prefers 5(기본 후보) | 순위와 세트 성격, 테마 바탕·밀도·모드·페이지 유형 |
| 타이포 시스템 | 서체 짝이 테마 서체와 같으면(합쳐진 구형 프리셋 id 포함) prefers 40, 같은 군(산세리프·둥근·세리프·고정폭·디스플레이)이면 15, 세리프↔고정폭이면 avoids 25. 시스템 용도 태그(work·document·marketing·commerce·mobile)는 분류가 기대하는 순서의 첫째면 prefers 25, 차선이면 10, 목록에 없으면 avoids 15 | 서체 짝, 용도 순서 |
| 패밀리 | 모양 세 축을 같으면 2점·인접 값이면 1점·아니면 0점으로 매겨 4점 이상이면 prefers 5×점수, 3점이면 prefers 5, 2점 이하면 avoids 5×(6−점수). 페이지 유형이 겹치지 않으면 avoids 20. 밀도가 같으면 prefers 10, 정반대면 avoids 10. 테마가 금지한 모양이면 forbids 100 | 축별 일치·인접·불일치, 페이지 유형 |

**팔레트·세트의 1·2순위를 id로 정한 이유.** 앵커가 없으면 팔레트 추천이 규칙 점수의 동점을 id 순으로 가른다(`docs/platform/color.md` 7절 5번). 규칙만으로는 54개 중 30개 맥락의 1순위가 동점이었고 선명한 분홍 팔레트가 18개 맥락에서 1순위가 됐다. 테마 설명(용도와 색 이름)을 읽고 사람이 정한 판단을 `STYLE_PICKS`에 두었다. 이제 177개(맥락×페이지 유형)의 팔레트 추천에서 동점이 0건이고, 1순위가 항상 정한 팔레트다. 세트도 같은 방식이고, 후보가 페이지 유형으로 걸러져 1순위 세트가 빠지면 정한 순서에서 남은 첫 세트가 1위다(시험이 센다). 이 판단은 디자인 검토 전이다(확인 필요).

`forbids`는 조합 검사(`checkCombination`)가 요구한 패밀리를 거부하게 하려는 것이다. 추천은 같은 금지를 `P_REL_STYLE_FORBID`로도 막는다(기존 규칙).

### 2.3 계산 관계 `style-mode`

테마가 금지한 모드(`forbid.mode`)를 서브토큰 세트와 결합하지 않는다. 예: neon·nocturne·game은 light 금지, civic은 auto 금지(조립 요청의 mode는 light·dark뿐이라 civic은 실제로 걸리지 않는다).

- 요구하지 않았을 때: 모든 세트가 막혀 `P_SELECT_EMPTY`가 나고 `blocked`에 `P_CHECK_STYLE_MODE`와 이유가 남는다.
- 세트를 요구했을 때: 다른 값으로 바꾸지 않고 `checkCombination`이 `P_CHECK_STYLE_MODE`로 거부한다.

### 2.4 recommend() 보강

`recommend()`는 맥락에 맞는 후보가 하나도 없으면 `ranked`와 `blocked`가 모두 비어 이유를 알 수 없다. `recommendWithReason`이 그 경우에 `P_RECOMMEND_NO_CANDIDATE`와 이유를 붙인다. 순위는 바꾸지 않는다(`recommend.mjs`는 조립 엔진 작업의 파일).

## 3. 테마별 연결표

### 3.1 용도, 페이지 유형, 성향

간격 열의 숫자는 그 밀도의 `gap/section/inset`(px)이다.

<!-- generated:contexts-a -->
| 테마 | 이름 | 분류 | 주요 용도 | 페이지 유형 맥락 | 간격(밀도 · gap/section/inset px) | 반경(px) | 깊이(그림자) | 모션 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `workspace` | 워크스페이스 | 업무·제품 | 업무·개발·운영 | dashboard, data, listing, settings — 빠르게 읽고 판단하는 도구 화면 | comfortable · 24/40/24 | soft 10 | outline | subtle 150ms |
| `ledger` | 레저 | 업무·제품 | 백오피스·ERP | dashboard, data, listing, settings, form — 직각 고밀도 표와 입력이 많은 백오피스 | compact · 16/28/16 | subtle 4 | outline | none 0ms |
| `console` | 콘솔 | 업무·제품 | 개발·운영 콘솔 | dashboard, data, docs, settings — 로그·상태를 읽는 개발·운영 콘솔 | compact · 16/28/16 | subtle 4 | outline | subtle 150ms |
| `aurora` | 오로라 | 업무·제품 | 그라데이션 SaaS | landing, pricing, dashboard — 그라데이션 SaaS의 소개·요금·제품 화면 | comfortable · 24/40/24 | round 18 | glow | lively 260ms |
| `trust` | 트러스트 | 업무·제품 | 핀테크·보험 | landing, pricing, dashboard, form — 핀테크·보험의 신뢰 전달과 가입·신청 동선 | comfortable · 24/40/24 | soft 10 | soft | subtle 150ms |
| `insight` | 인사이트 | 업무·제품 | 데이터 분석 대시보드 | dashboard, data, listing — 차트·표 중심의 분석 대시보드 | compact · 16/28/16 | soft 10 | soft | subtle 150ms |
| `hub` | 허브 | 업무·제품 | 협업·커뮤니티 도구 | community, dashboard, listing, settings — 협업·커뮤니티 도구의 목록·대화·설정 | comfortable · 24/40/24 | round 18 | soft | lively 260ms |
| `precision` | 프리시전 | 업무·제품 | 데이터·규격·포트폴리오 | data, docs, portfolio, dashboard — 구조를 드러내는 규격·데이터·포트폴리오 | compact · 16/28/16 | square 0 | outline | none 0ms |
| `neon` | 네온 | 브랜드·마케팅 | 어두운 마케팅 | landing, pricing, portfolio — 어두운 마케팅 화면 | comfortable · 24/40/24 | round 18 | glow | lively 260ms |
| `playful` | 플레이풀 | 브랜드·마케팅 | 캔디 팔레트와 알약 버튼 | landing, commerce, blog — 소비자 캠페인과 상품 소개 | spacious · 32/56/32 | bubble 28 | lifted | lively 260ms |
| `studio` | 스튜디오 | 브랜드·마케팅 | 에이전시·포트폴리오 | portfolio, landing, blog — 큰 제목과 한 점 강조의 에이전시·포트폴리오 | spacious · 32/56/32 | square 0 | flat | subtle 150ms |
| `gallery` | 갤러리 | 브랜드·마케팅 | 무채색 갤러리 | portfolio, blog, listing — 작품을 늘어놓는 무채색 갤러리 | spacious · 32/56/32 | square 0 | flat | subtle 150ms |
| `brutalist` | 브루탈 | 브랜드·마케팅 | 굵은 테두리와 오프셋 그림자 | landing, portfolio, blog — 거칠고 정직한 선언형 화면 | comfortable · 24/40/24 | square 0 | hard | subtle 150ms |
| `retro` | 레트로 | 브랜드·마케팅 | 70~90년대 인쇄물 | landing, blog, commerce — 인쇄물 감성의 브랜드 소개와 상점 | comfortable · 24/40/24 | subtle 4 | hard | lively 260ms |
| `signal` | 시그널 | 브랜드·마케팅 | 캠페인·관제·발표 | landing, dashboard, pricing — 캠페인·관제·발표처럼 대비가 필요한 화면 | compact · 16/28/16 | square 0 | outline | subtle 150ms |
| `editorial` | 에디토리얼 | 읽기·문서 | 출판·리서치·기록 | article, blog, docs — 긴 글을 읽는 출판·리서치 | spacious · 32/56/32 | square 0 | flat | none 0ms |
| `paper` | 페이퍼 | 읽기·문서 | 종이·노트·위키 | docs, article, listing — 노트·위키처럼 지면 위에서 읽고 찾는 화면 | spacious · 32/56/32 | subtle 4 | outline | none 0ms |
| `manual` | 매뉴얼 | 읽기·문서 | 레퍼런스 문서 | docs, article — 목차와 코드 블록이 있는 레퍼런스 문서 | comfortable · 24/40/24 | subtle 4 | outline | none 0ms |
| `journal` | 저널 | 읽기·문서 | 블로그·뉴스레터 | blog, article — 블로그·뉴스레터 | spacious · 32/56/32 | soft 10 | flat | subtle 150ms |
| `magazine` | 매거진 | 읽기·문서 | 신문 제호형 머리와 극적인 제목, 열 푸터. | blog, article, portfolio — 제호형 머리와 극적인 제목의 지면 | spacious · 32/56/32 | square 0 | flat | subtle 150ms |
| `botanical` | 보태니컬 | 생활·서비스 | 자연·생활·웰니스 | commerce, landing, blog — 자연·웰니스 상품과 이야기 | comfortable · 24/40/24 | soft 10 | soft | subtle 150ms |
| `cloud` | 클라우드 | 생활·서비스 | 헬스케어 | landing, form, dashboard — 헬스케어의 예약·기록 화면 | spacious · 32/56/32 | bubble 28 | soft | subtle 150ms |
| `clinic` | 클리닉 | 생활·서비스 | 병원·의원 | landing, form, listing — 병원·의원의 예약 동선 | comfortable · 24/40/24 | soft 10 | soft | subtle 150ms |
| `dining` | 다이닝 | 생활·서비스 | 레스토랑·메뉴판 | commerce, landing, listing — 메뉴판과 예약 | spacious · 32/56/32 | subtle 4 | flat | subtle 150ms |
| `cafe` | 카페 | 생활·서비스 | 카페·베이커리 | commerce, landing, listing — 카페·베이커리의 메뉴와 매장 소개 | comfortable · 24/40/24 | round 18 | soft | subtle 150ms |
| `stay` | 스테이 | 생활·서비스 | 여행·숙박 | listing, commerce, landing — 숙소 사진 카드를 훑고 고르는 화면 | comfortable · 24/40/24 | round 18 | lifted | subtle 150ms |
| `commerce` | 커머스 | 생활·서비스 | 스토어 운영·상품 | commerce, listing, form, dashboard — 스토어 운영과 상품 목록·구매 | comfortable · 24/40/24 | soft 10 | outline | subtle 150ms |
| `beauty` | 뷰티 | 생활·서비스 | 뷰티 브랜드 | commerce, landing, portfolio — 톤온톤 브랜드 소개와 상품 | spacious · 32/56/32 | soft 10 | flat | subtle 150ms |
| `realty` | 리얼티 | 생활·서비스 | 부동산·매물 | listing, commerce, data — 매물 표와 지표 | comfortable · 24/40/24 | subtle 4 | outline | subtle 150ms |
| `atelier` | 아틀리에 | 생활·서비스 | 교육·창작·커뮤니티 | community, landing, listing — 교육·창작 커뮤니티 | spacious · 32/56/32 | round 18 | soft | lively 260ms |
| `learning` | 러닝 | 생활·서비스 | 학습 서비스 | dashboard, listing, form, community — 진행 표시가 있는 학습 서비스 | comfortable · 24/40/24 | round 18 | lifted | lively 260ms |
| `civic` | 시빅 | 공공·기관 | 공공·행정 | form, docs, listing, auth, error — 큰 터치 영역과 고대비의 공공 서비스 | spacious · 32/56/32 | subtle 4 | outline | none 0ms |
| `hanji` | 한지 | 공공·기관 | 문화·전통 | article, portfolio, blog — 문화·전통 콘텐츠 읽기 | spacious · 32/56/32 | subtle 4 | outline | subtle 150ms |
| `heritage` | 헤리티지 | 공공·기관 | 박물관·재단 | portfolio, article, landing — 박물관·재단의 전시와 소개 | spacious · 32/56/32 | square 0 | outline | subtle 150ms |
| `clarity` | 클래리티 | 모바일·앱 | 모바일 앱 화면 | listing, settings, form, auth — 하단 탭바 모바일 앱의 목록·설정·입력 | comfortable · 24/40/24 | round 18 | soft | subtle 150ms |
| `pocket` | 포켓 | 모바일·앱 | 모바일 우선 | listing, form, auth, settings — 큰 터치 타깃의 모바일 우선 화면 | spacious · 32/56/32 | bubble 28 | soft | lively 260ms |
| `nocturne` | 녹턴 | 모바일·앱 | 미디어·음악 | listing, portfolio, landing — 어두운 면 위의 미디어·음악 | comfortable · 24/40/24 | round 18 | glow | subtle 150ms |
| `sport` | 스포츠 | 모바일·앱 | 피트니스·스포츠 | dashboard, listing, commerce — 피트니스·스포츠의 기록과 상품 | comfortable · 24/40/24 | subtle 4 | lifted | lively 260ms |
| `solar` | 솔라 | 모바일·앱 | 에너지·태양 | landing, dashboard, pricing — 에너지 서비스의 소개·요금·현황 | comfortable · 24/40/24 | round 18 | soft | lively 260ms |
| `ocean` | 오션 | 모바일·앱 | 여행·해양 | landing, listing, commerce — 여행·해양 상품 소개 | spacious · 32/56/32 | soft 10 | soft | subtle 150ms |
| `enterprise` | 엔터프라이즈 | 업무·제품 | 기업 포털·인트라넷 | dashboard, data, listing, settings, docs — 낮은 채도의 기업 포털·인트라넷 | comfortable · 24/40/24 | subtle 4 | outline | subtle 150ms |
| `devtool` | 데브툴 | 업무·제품 | 개발자 제품·API 문서 | docs, landing, dashboard, pricing — 코드가 주인공인 개발자 제품과 API 문서 | comfortable · 24/40/24 | soft 10 | outline | subtle 150ms |
| `luxe` | 럭셔리 | 브랜드·마케팅 | 검정과 금빛, 가는 선과 세리프 | landing, commerce, portfolio — 여백으로 가치를 말하는 고급 브랜드 | spacious · 32/56/32 | square 0 | flat | subtle 150ms |
| `swiss` | 스위스 | 브랜드·마케팅 | 격자와 큰 타이포, 무채에 한 점의 강조색 | portfolio, landing, article — 격자와 큰 타이포의 스위스 스타일 | comfortable · 24/40/24 | square 0 | flat | none 0ms |
| `colorblock` | 컬러블록 | 브랜드·마케팅 | 큰 색면과 두꺼운 윤곽 | landing, portfolio, pricing — 큰 색면의 포스터형 캠페인 | comfortable · 24/40/24 | soft 10 | hard | lively 260ms |
| `newsroom` | 뉴스룸 | 읽기·문서 | 매체·뉴스 | article, blog, listing — 촘촘한 머리기사와 구분선 지면 | compact · 16/28/16 | square 0 | flat | none 0ms |
| `academic` | 아카데믹 | 읽기·문서 | 논문·리서치 | article, docs — 좁은 읽기 폭의 논문·리서치 | spacious · 32/56/32 | square 0 | flat | none 0ms |
| `wedding` | 웨딩 | 생활·서비스 | 청첩장·행사 초대 | landing, form, portfolio — 청첩장·행사 초대와 참석 응답 | spacious · 32/56/32 | round 18 | soft | subtle 150ms |
| `kids` | 키즈 | 생활·서비스 | 어린이 서비스 | landing, commerce, listing — 어린이 서비스 | spacious · 32/56/32 | bubble 28 | lifted | lively 260ms |
| `wine` | 와인바 | 생활·서비스 | 와인·바 | commerce, landing, listing — 와인바 메뉴와 예약 | spacious · 32/56/32 | subtle 4 | flat | subtle 150ms |
| `garden` | 가든 | 생활·서비스 | 식물·정원 가게 | commerce, landing, blog — 식물·정원 가게 | comfortable · 24/40/24 | round 18 | soft | subtle 150ms |
| `school` | 스쿨 | 공공·기관 | 학교·교육기관 | docs, listing, form, auth — 학교 안내와 신청 | spacious · 32/56/32 | soft 10 | outline | none 0ms |
| `bank` | 뱅크 | 공공·기관 | 은행·보험 | dashboard, data, form, settings — 숫자가 먼저 읽히는 금융 화면 | comfortable · 24/40/24 | soft 10 | soft | subtle 150ms |
| `game` | 게임 | 모바일·앱 | 게임·e스포츠 | landing, community, listing — 어두운 면 위 빠른 움직임의 게임·e스포츠 | comfortable · 24/40/24 | subtle 4 | glow | lively 260ms |
<!-- /generated:contexts-a -->

### 3.2 금지, 미디어, 레이아웃

<!-- generated:contexts-b -->
| 테마 | 금지(축 값) | 금지 조합(한 축만 바꿔도 걸림) | 아이콘 | 바탕 · 장식 | 셸(내비) | 폭 · 푸터 | 내비 한도 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `workspace` | — | X02(width→narrow) X05(elevation→glow) | line (선 2) | plain · geometric | sidebar: 왼쪽 고정 사이드바 | wide 1280px · simple | 8 |
| `ledger` | elevation: glow·lifted; motion: lively; radius: bubble·round | X01(shell→dock) X02(width→narrow) X03(shell→editorial·centered·minimal·masthead) X09(icon→line-fine) | line-square (선 2) | plain · none | sidebar: 왼쪽 고정 사이드바 | full 1600px · minimal | 8 |
| `console` | radius: bubble; ornament: organic | X01(shell→dock) X02(width→narrow) X03(shell→editorial·centered·minimal·masthead) X06(scale→dramatic) X09(icon→line-fine) X10(ornament→dots) | line-square (선 2) | grid · none | sidebar: 왼쪽 고정 사이드바 | full 1600px · minimal | 8 |
| `aurora` | elevation: hard | X05(mode→light) X08(shell→dock·minimal) X11(elevation→flat) | duotone (선 1.8) | gradient · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `trust` | elevation: hard | X05(elevation→glow) X08(shell→dock·minimal) | line (선 2) | plain · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `insight` | radius: bubble | X01(shell→dock) X02(width→narrow) X03(shell→editorial·centered·minimal·masthead) X05(elevation→glow) X09(icon→line-fine) | line (선 2) | tint · none | rail: 아이콘 레일(좁은 세로 내비) | full 1600px · minimal | 7 |
| `hub` | — | X02(width→narrow) X05(elevation→glow) X10(backdrop→grid) X11(elevation→flat) | solid (선 1.8) | tint · dots | sidebar: 왼쪽 고정 사이드바 | wide 1280px · simple | 8 |
| `precision` | radius: bubble·round | X01(shell→dock) X02(width→narrow) X05(elevation→glow) X06(scale→dramatic) X09(icon→line-fine) X10(ornament→dots) | line-square (선 2) | grid · lines | sidebar: 왼쪽 고정 사이드바 | wide 1280px · minimal | 8 |
| `neon` | mode: light; elevation: hard·flat | X06(typography→mono·terminal) X08(shell→dock·minimal) | duotone (선 1.8) | gradient · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `playful` | — | X05(elevation→glow) X06(typography→mono·terminal) X07(density→compact) X08(shell→dock·minimal) X11(elevation→flat) | solid (선 1.8) | tint · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `studio` | elevation: glow | X03(width→full) X06(typography→mono·terminal) X08(footer→columns) X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | plain · none | minimal: 브랜드와 한 액션만 | wide 1280px · minimal | 2 |
| `gallery` | elevation: glow·hard | X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | plain · none | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · minimal | 6 |
| `brutalist` | elevation: soft·lifted·glow·flat; backdrop: gradient; radius: round·bubble | X06(typography→mono·terminal) X08(shell→dock·minimal) | line-bold (선 2.6) | plain · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `retro` | backdrop: gradient | X05(elevation→glow) X08(shell→dock·minimal) X10(backdrop→grid) X11(elevation→flat) | solid (선 1.8) | tint · dots | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | standard 1080px · columns | 8 |
| `signal` | — | X01(shell→dock) X02(width→narrow) X05(elevation→glow) X06(typography→mono·terminal) X07(radius→bubble) X09(icon→line-fine) | line-bold (선 2.6) | plain · geometric | split: 넓은 왼쪽 패널과 본문 | wide 1280px · simple | 6 |
| `editorial` | elevation: glow·hard | X03(width→full) X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | plain · lines | editorial: 가운데 정렬 편집 내비 (메가 메뉴 가능) | standard 1080px · simple | 5 |
| `paper` | elevation: glow·hard·lifted | X02(shell→sidebar·split·rail) X03(width→full) | line (선 2) | tint · lines | editorial: 가운데 정렬 편집 내비 (메가 메뉴 가능) | narrow 760px · simple | 5 |
| `manual` | elevation: glow·hard; motion: lively | X02(width→narrow) | line (선 2) | plain · none | sidebar: 왼쪽 고정 사이드바 | wide 1280px · simple | 8 |
| `journal` | elevation: glow·hard | X02(shell→sidebar·split·rail) X03(width→full) X11(motion→lively) | line (선 2) | tint · organic | centered: 가운데 정렬 브랜드와 내비 (메가 메뉴 가능) | narrow 760px · simple | 6 |
| `magazine` | elevation: glow | X03(width→full) X06(typography→mono·terminal) X08(shell→dock·minimal) X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | plain · lines | masthead: 신문 제호형 큰 머리 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `botanical` | elevation: hard | X05(elevation→glow) X08(shell→dock·minimal) | line (선 2) | tint · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `cloud` | elevation: hard | X05(elevation→glow) X07(density→compact) | duotone (선 1.8) | gradient · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · simple | 6 |
| `clinic` | elevation: hard·glow; motion: lively | X08(shell→dock·minimal) | line (선 2) | plain · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `dining` | elevation: glow·hard | X03(width→full) X08(shell→dock·minimal) X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | tint · lines | centered: 가운데 정렬 브랜드와 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `cafe` | elevation: hard | X05(elevation→glow) X10(backdrop→grid) | solid (선 1.8) | tint · dots | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · simple | 6 |
| `stay` | — | X05(elevation→glow) X08(shell→dock·minimal) | line (선 2) | plain · organic | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | wide 1280px · columns | 8 |
| `commerce` | — | X05(elevation→glow) X08(shell→dock·minimal) | line (선 2) | plain · none | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | wide 1280px · columns | 8 |
| `beauty` | elevation: hard·glow | X03(width→full) X08(shell→dock·minimal) X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | tint · organic | centered: 가운데 정렬 브랜드와 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `realty` | elevation: glow | X08(shell→dock·minimal) | line (선 2) | plain · none | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | wide 1280px · columns | 8 |
| `atelier` | elevation: hard | X05(elevation→glow) X11(elevation→flat) | duotone (선 1.8) | tint · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · simple | 6 |
| `learning` | — | X05(elevation→glow) X11(elevation→flat) | solid (선 1.8) | plain · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · simple | 6 |
| `civic` | motion: lively; elevation: glow·lifted·hard; backdrop: gradient·grid; mode: auto | X08(shell→dock·minimal) | line (선 2) | plain · none | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | standard 1080px · columns | 8 |
| `hanji` | elevation: glow·hard | X02(shell→sidebar·split·rail) X03(width→full) X09(density→compact) | line-fine (선 1.5) | tint · lines | editorial: 가운데 정렬 편집 내비 (메가 메뉴 가능) | narrow 760px · simple | 5 |
| `heritage` | elevation: glow | X03(width→full) X08(shell→dock·minimal) | line (선 2) | plain · lines | masthead: 신문 제호형 큰 머리 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `clarity` | elevation: hard | X01(density→compact) X02(shell→sidebar·split·rail) X05(elevation→glow) X08(footer→columns) | line (선 2) | plain · none | dock: 모바일 하단 탭바 | narrow 760px · minimal | 5 |
| `pocket` | elevation: hard | X01(density→compact) X02(shell→sidebar·split·rail) X05(elevation→glow) X07(density→compact) X08(footer→columns) X11(elevation→flat) | solid (선 1.8) | tint · organic | dock: 모바일 하단 탭바 | narrow 760px · minimal | 5 |
| `nocturne` | mode: light; elevation: hard·flat | X10(backdrop→grid) | duotone (선 1.8) | gradient · dots | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · simple | 6 |
| `sport` | — | X05(elevation→glow) X06(typography→mono·terminal) X08(shell→dock·minimal) X11(elevation→flat) | solid (선 1.8) | plain · geometric | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | wide 1280px · columns | 8 |
| `solar` | elevation: hard | X05(elevation→glow) X06(typography→mono·terminal) X11(elevation→flat) | duotone (선 1.8) | tint · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · simple | 6 |
| `ocean` | elevation: hard | X05(elevation→glow) X08(shell→dock·minimal) | line (선 2) | gradient · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `enterprise` | elevation: glow·hard; motion: lively; radius: bubble | X02(width→narrow) X08(shell→dock·minimal) | line (선 2) | plain · none | sidebar: 왼쪽 고정 사이드바 | wide 1280px · columns | 8 |
| `devtool` | radius: bubble; ornament: organic | X08(shell→dock·minimal) X10(ornament→dots) | line-square (선 2) | grid · lines | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `luxe` | elevation: glow·hard·lifted; motion: lively | X03(width→full) X06(typography→mono·terminal) X09(density→compact) | line-fine (선 1.5) | plain · lines | centered: 가운데 정렬 브랜드와 내비 (메가 메뉴 가능) | wide 1280px · minimal | 6 |
| `swiss` | elevation: glow·soft·lifted·hard; radius: round·bubble; ornament: organic·dots; backdrop: gradient; motion: lively | X03(width→full) X06(typography→mono·terminal) X08(footer→columns) | line (선 2) | plain · none | minimal: 브랜드와 한 액션만 | wide 1280px · simple | 2 |
| `colorblock` | backdrop: gradient·grid; elevation: glow | X06(typography→mono·terminal) X08(shell→dock·minimal) X11(elevation→flat) | line-bold (선 2.6) | tint · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `newsroom` | elevation: glow·hard·lifted·soft; motion: lively; radius: round·bubble | X01(shell→dock) X03(width→full) X08(shell→dock·minimal) X09(icon→line-fine) | line (선 2) | plain · lines | masthead: 신문 제호형 큰 머리 (메가 메뉴 가능) | wide 1280px · columns | 6 |
| `academic` | elevation: glow·hard·lifted; backdrop: gradient·grid; motion: lively | X02(shell→sidebar·split·rail) X03(width→full) | line (선 2) | plain · none | editorial: 가운데 정렬 편집 내비 (메가 메뉴 가능) | narrow 760px · simple | 5 |
| `wedding` | elevation: hard·glow | X02(shell→sidebar·split·rail) X03(width→full) X09(density→compact) | line-fine (선 1.5) | tint · organic | centered: 가운데 정렬 브랜드와 내비 (메가 메뉴 가능) | narrow 760px · minimal | 6 |
| `kids` | elevation: glow | X06(typography→mono·terminal) X07(density→compact) X08(shell→dock·minimal) X10(backdrop→grid) X11(elevation→flat) | solid (선 1.8) | tint · dots | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `wine` | elevation: glow·hard | X03(width→full) X08(shell→dock·minimal) X09(density→compact) X11(motion→lively) | line-fine (선 1.5) | tint · lines | centered: 가운데 정렬 브랜드와 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `garden` | elevation: hard·glow | X08(shell→dock·minimal) | line (선 2) | tint · organic | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `school` | motion: lively; elevation: glow·hard; backdrop: gradient | X08(shell→dock·minimal) | line (선 2) | plain · none | stacked: 유틸리티 줄과 탭 줄 2단 (메가 메뉴 가능) | standard 1080px · columns | 8 |
| `bank` | elevation: glow·hard; motion: lively; ornament: organic·dots | X08(shell→dock·minimal) | line (선 2) | plain · none | topbar: 상단 가로 내비 (메가 메뉴 가능) | standard 1080px · columns | 6 |
| `game` | mode: light; elevation: hard·flat | X06(typography→mono·terminal) X08(shell→dock·minimal) | line-bold (선 2.6) | gradient · geometric | topbar: 상단 가로 내비 (메가 메뉴 가능) | wide 1280px · columns | 6 |
<!-- /generated:contexts-b -->

### 3.3 연결된 재료

관계 열은 `대상 순합`이다(prefers의 priority 합 − avoids의 합). 금지는 `금지`로 적었다. 표면~미디어 열은 그 맥락에서 1순위 프리셋과 `(금지에 걸리지 않은 수/전체 수)`다.

<!-- generated:contexts-c -->
| 테마 | 기본 모드 | 팔레트(순합) | 서브토큰 세트 | 타이포 시스템 | 패밀리 | 표면(선택지 수) | 모션 | 배경 | 미디어 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `workspace` | light | static-kit +70, slate-neutral +30, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +10, magenta-vivid -10 | standard +100, tinted +30, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp +40, work-console +40, work-insight +40, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +40, soft +5, bold -15, editorial +5 | hairline-panel (5/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `ledger` | light | static-kit +10, slate-neutral +70, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +30, dusk-violet +10, magenta-vivid -10 | standard +60, tinted -15, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +95 | tech-erp +40, work-console +40, work-insight +40, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +20, soft -35, bold -25, editorial +15, soft 금지, bold 금지 | hairline-panel (3/5) | still (3/4) | plain-canvas (5/5) | square-tech (4/6) |
| `console` | dark | static-kit +10, slate-neutral +15, sunrise-warm +10, ocean-cool +30, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid -10 | standard +30, tinted -15, editorial-warm +10, commerce-vivid +5, premium-dark +95, high-contrast +5, data-dense +55 | tech-erp +25, work-console +25, work-insight +25, doc-essay -40, doc-handbook -15, doc-newsroom -40, mkt-brand -15, mkt-launch -15, mkt-atelier -40, shop-catalog -15, shop-boutique -40, mobile-app -15, mobile-reader -40, mobile-feed -15 | quiet +25, soft -30, bold -20, editorial +10 | hairline-panel (5/5) | calm (4/4) | blueprint-grid-lines (4/5) | square-tech (5/6) |
| `aurora` | dark | static-kit +8, slate-neutral +8, sunrise-warm -20, ocean-cool +30, forest-green +8, clay-earth -20, graphite-mono -10, dusk-violet +70, magenta-vivid +8 | standard +5, tinted +100, editorial-warm +5, commerce-vivid +5, premium-dark +55, high-contrast +5, data-dense +15 | tech-erp +40, work-console +40, work-insight +65, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet -10, soft +20, bold -10, editorial -30, bold 금지 | glow-glass (4/5) | expressive (4/4) | soft-gradient-organic (5/5) | duotone-round (6/6) |
| `trust` | light | static-kit +70, slate-neutral +15, sunrise-warm -20, ocean-cool +30, forest-green +8, clay-earth -20, graphite-mono -10, dusk-violet +8, magenta-vivid -20 | standard +100, tinted +30, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp +40, work-console +40, work-insight +40, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +35, soft +20, bold -15, editorial -20, bold 금지 | soft-layered (4/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `insight` | light | static-kit +30, slate-neutral +15, sunrise-warm +10, ocean-cool +70, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +10, magenta-vivid -10 | standard +35, tinted +30, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +95 | tech-erp +40, work-console +40, work-insight +40, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +25, soft +10, bold -25, editorial -30 | soft-layered (5/5) | calm (4/4) | brand-tint-dots (5/5) | line-soft-frame (5/6) |
| `hub` | light | static-kit +70, slate-neutral +15, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +30, magenta-vivid -10 | standard +35, tinted +100, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp +25, work-console +25, work-insight +25, doc-essay -15, doc-handbook 0, doc-newsroom -15, mkt-brand -15, mkt-launch -15, mkt-atelier -15, shop-catalog -15, shop-boutique -15, mobile-app +25, mobile-reader -15, mobile-feed 0 | quiet +15, soft +20, bold -10, editorial -30 | soft-layered (5/5) | expressive (4/4) | brand-tint-dots (5/5) | solid-cover (6/6) |
| `precision` | light | static-kit +10, slate-neutral +30, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid -10 | standard +30, tinted -15, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +30, data-dense +95 | tech-erp +25, work-console +25, work-insight +25, doc-essay -40, doc-handbook -15, doc-newsroom -40, mkt-brand -15, mkt-launch -15, mkt-atelier -40, shop-catalog -15, shop-boutique -40, mobile-app -15, mobile-reader -40, mobile-feed -15 | quiet +5, soft -35, bold -20, editorial +10, soft 금지 | hairline-panel (3/5) | still (4/4) | blueprint-grid-lines (5/5) | square-tech (4/6) |
| `neon` | dark | static-kit +15, slate-neutral +15, sunrise-warm -20, ocean-cool +30, forest-green +8, clay-earth -20, graphite-mono -10, dusk-violet +70, magenta-vivid +8 | standard +5, tinted +60, editorial-warm +5, commerce-vivid +5, premium-dark +95, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight +25, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +65, mkt-launch +40, mkt-atelier +25, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet -30, soft +20, bold -10, editorial -30, bold 금지, editorial 금지 | glow-glass (3/5) | expressive (4/4) | aurora-glow-geometric (5/5) | duotone-round (6/6) |
| `playful` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +70 | standard +5, tinted +60, editorial-warm +10, commerce-vivid +95, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook 0, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +25, shop-catalog -15, shop-boutique -15, mobile-app +25, mobile-reader -15, mobile-feed 0 | quiet -45, soft +30, bold -20, editorial -20 | glow-glass (5/5) | expressive (4/4) | brand-tint-dots (5/5) | solid-cover (6/6) |
| `studio` | light | static-kit +10, slate-neutral +5, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid +30 | standard +100, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +30, data-dense +5 | tech-erp 0, work-console +25, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +40, mkt-launch +65, mkt-atelier +25, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet -15, soft -10, bold +5, editorial +30 | hairline-panel (4/5) | calm (4/4) | plain-canvas (5/5) | fine-editorial (6/6) |
| `gallery` | light | static-kit +10, slate-neutral +30, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid +15 | standard +100, tinted +5, editorial-warm +40, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +40, mkt-launch +40, mkt-atelier +25, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +5, soft -10, bold +5, editorial +30, bold 금지 | hairline-panel (3/5) | calm (4/4) | plain-canvas (5/5) | fine-editorial (6/6) |
| `brutalist` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid +15 | standard +60, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +70, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +25, shop-catalog -15, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet -5, soft -20, bold +35, editorial -20, soft 금지, editorial 금지 | hard-offset (1/5) | calm (4/4) | plain-canvas (3/5) | bold-poster (4/6) |
| `retro` | light | static-kit -20, slate-neutral -20, sunrise-warm +70, ocean-cool -20, forest-green -20, clay-earth +30, graphite-mono -10, dusk-violet -20, magenta-vivid +8 | standard +5, tinted +30, editorial-warm +80, commerce-vivid +55, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +25, shop-catalog -15, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet -5, soft -25, bold +35, editorial -20 | hairline-panel (5/5) | expressive (4/4) | brand-tint-dots (3/5) | solid-cover (6/6) |
| `signal` | light | static-kit +10, slate-neutral +5, sunrise-warm +70, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +30, dusk-violet +10, magenta-vivid +15 | standard +30, tinted -15, editorial-warm +5, commerce-vivid +30, premium-dark -10, high-contrast +95, data-dense +15 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +40, mkt-launch +40, mkt-atelier +25, shop-catalog +25, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +20, soft -30, bold +5, editorial -5 | hairline-panel (5/5) | calm (4/4) | plain-canvas (5/5) | bold-poster (6/6) |
| `editorial` | light | static-kit +10, slate-neutral +15, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +30, graphite-mono +70, dusk-violet +10, magenta-vivid -10 | standard +60, tinted +5, editorial-warm +95, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay +40, doc-handbook +25, doc-newsroom +40, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique +25, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet -40, soft -15, bold -20, editorial +35, bold 금지 | hairline-panel (3/5) | still (4/4) | plain-canvas (5/5) | fine-editorial (6/6) |
| `paper` | light | static-kit -20, slate-neutral -20, sunrise-warm +8, ocean-cool -20, forest-green -20, clay-earth +70, graphite-mono +30, dusk-violet -20, magenta-vivid +8 | standard +35, tinted +30, editorial-warm +95, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay +65, doc-handbook +25, doc-newsroom +40, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet +20, soft -15, bold -25, editorial +35, soft 금지, bold 금지 | hairline-panel (2/5) | still (4/4) | brand-tint-dots (5/5) | line-soft-frame (6/6) |
| `manual` | light | static-kit +30, slate-neutral +70, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +10, magenta-vivid -10 | standard +100, tinted +5, editorial-warm +55, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp +25, work-console 0, work-insight 0, doc-essay +25, doc-handbook +25, doc-newsroom +25, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +10, soft -25, bold -15, editorial +25, bold 금지 | hairline-panel (3/5) | still (3/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `journal` | light | static-kit +10, slate-neutral +30, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +70, graphite-mono +15, dusk-violet +10, magenta-vivid -10 | standard +35, tinted +30, editorial-warm +95, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay +25, doc-handbook +65, doc-newsroom +25, mkt-brand -15, mkt-launch -15, mkt-atelier -15, shop-catalog -15, shop-boutique -15, mobile-app 0, mobile-reader -15, mobile-feed +25 | quiet +5, soft +15, bold -25, editorial +30, bold 금지 | tonal-sheet (3/5) | calm (4/4) | brand-tint-dots (5/5) | line-soft-frame (6/6) |
| `magazine` | light | static-kit +10, slate-neutral +15, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid +30 | standard +30, tinted +5, editorial-warm +95, commerce-vivid +5, premium-dark -10, high-contrast +30, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay +40, doc-handbook +25, doc-newsroom +65, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet -15, soft -10, bold +5, editorial +30 | hairline-panel (4/5) | calm (4/4) | plain-canvas (5/5) | fine-editorial (6/6) |
| `botanical` | light | static-kit +8, slate-neutral +8, sunrise-warm -20, ocean-cool +8, forest-green +70, clay-earth +30, graphite-mono -10, dusk-violet -20, magenta-vivid -20 | standard +5, tinted +60, editorial-warm +80, commerce-vivid +25, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +40, shop-boutique +25, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +15, soft +20, bold -15, editorial -20, bold 금지 | soft-layered (4/5) | calm (4/4) | brand-tint-dots (5/5) | line-soft-frame (6/6) |
| `cloud` | light | static-kit +30, slate-neutral +15, sunrise-warm -20, ocean-cool +70, forest-green +8, clay-earth -20, graphite-mono -10, dusk-violet +8, magenta-vivid -20 | standard +35, tinted +100, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook 0, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog +25, shop-boutique +25, mobile-app +25, mobile-reader -15, mobile-feed 0 | quiet +5, soft +30, bold -25, editorial -15, bold 금지 | soft-layered (4/5) | calm (4/4) | soft-gradient-organic (5/5) | duotone-round (6/6) |
| `clinic` | light | static-kit +8, slate-neutral +8, sunrise-warm -20, ocean-cool +70, forest-green +30, clay-earth -20, graphite-mono -10, dusk-violet +8, magenta-vivid -20 | standard +100, tinted +30, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +40, shop-boutique +25, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +35, soft +20, bold -15, editorial -20, bold 금지 | soft-layered (3/5) | calm (3/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `dining` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +10, forest-green +10, clay-earth +70, graphite-mono +5, dusk-violet +10, magenta-vivid +15 | standard +5, tinted +30, editorial-warm +70, commerce-vivid +25, premium-dark +20, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay 0, doc-handbook -15, doc-newsroom 0, mkt-brand +10, mkt-launch +10, mkt-atelier +25, shop-catalog +25, shop-boutique +40, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet +20, soft -10, bold -20, editorial +35, bold 금지 | hairline-panel (3/5) | calm (4/4) | brand-tint-dots (5/5) | fine-editorial (6/6) |
| `cafe` | light | static-kit -20, slate-neutral -20, sunrise-warm +30, ocean-cool -20, forest-green -20, clay-earth +70, graphite-mono -10, dusk-violet -20, magenta-vivid +8 | standard +5, tinted +30, editorial-warm +70, commerce-vivid +55, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook +25, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog +25, shop-boutique +25, mobile-app 0, mobile-reader -15, mobile-feed +25 | quiet +30, soft +25, bold -15, editorial -25, bold 금지 | soft-layered (4/5) | calm (4/4) | brand-tint-dots (5/5) | solid-cover (6/6) |
| `stay` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +70, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +15 | standard +60, tinted +5, editorial-warm +5, commerce-vivid +95, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +40, shop-boutique +25, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +15, soft +30, bold -15, editorial -25 | glow-glass (5/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `commerce` | light | static-kit +30, slate-neutral +5, sunrise-warm +70, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +15 | standard +60, tinted +5, editorial-warm +5, commerce-vivid +95, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +40, shop-boutique +25, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +40, soft +5, bold -15, editorial +5 | hairline-panel (5/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `beauty` | light | static-kit +10, slate-neutral +5, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +70, graphite-mono +5, dusk-violet +10, magenta-vivid +30 | standard +5, tinted +30, editorial-warm +70, commerce-vivid +25, premium-dark +20, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay 0, doc-handbook -15, doc-newsroom 0, mkt-brand +10, mkt-launch +10, mkt-atelier +50, shop-catalog +25, shop-boutique +40, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet +5, soft +15, bold -25, editorial +30, bold 금지 | tonal-sheet (3/5) | calm (4/4) | brand-tint-dots (5/5) | fine-editorial (6/6) |
| `realty` | light | static-kit +30, slate-neutral +70, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +15 | standard +100, tinted +5, editorial-warm +5, commerce-vivid +25, premium-dark -10, high-contrast +5, data-dense +45 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +40, shop-boutique +25, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +35, soft -20, bold -10, editorial +20 | hairline-panel (4/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `atelier` | light | static-kit +10, slate-neutral +5, sunrise-warm +70, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +30, magenta-vivid +15 | standard +5, tinted +100, editorial-warm +5, commerce-vivid +30, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +40, shop-boutique +25, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +5, soft +30, bold -20, editorial -20, bold 금지 | soft-layered (4/5) | expressive (4/4) | brand-tint-dots (5/5) | duotone-round (6/6) |
| `learning` | light | static-kit +70, slate-neutral +5, sunrise-warm +10, ocean-cool +10, forest-green +30, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +15 | standard +100, tinted +30, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook 0, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog +25, shop-boutique +25, mobile-app +25, mobile-reader -15, mobile-feed 0 | quiet -10, soft +25, bold -10, editorial -30 | glow-glass (5/5) | expressive (4/4) | plain-canvas (5/5) | solid-cover (6/6) |
| `civic` | light | static-kit +70, slate-neutral +15, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +30, dusk-violet +10, magenta-vivid -10 | standard +60, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +95, data-dense +5 | tech-erp +25, work-console +25, work-insight +25, doc-essay +25, doc-handbook +25, doc-newsroom +25, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +20, soft -15, bold -25, editorial +35, soft 금지, bold 금지 | hairline-panel (2/5) | still (3/4) | plain-canvas (2/5) | line-soft-frame (6/6) |
| `hanji` | light | static-kit -20, slate-neutral -20, sunrise-warm +8, ocean-cool -20, forest-green -20, clay-earth +70, graphite-mono +30, dusk-violet -20, magenta-vivid -20 | standard +35, tinted +30, editorial-warm +80, commerce-vivid +5, premium-dark -10, high-contrast +25, data-dense +5 | tech-erp +10, work-console +10, work-insight +10, doc-essay +40, doc-handbook +25, doc-newsroom +40, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader +25, mobile-feed -15 | quiet +5, soft -10, bold -20, editorial +30, bold 금지 | hairline-panel (3/5) | calm (4/4) | brand-tint-dots (5/5) | fine-editorial (6/6) |
| `heritage` | light | static-kit -20, slate-neutral -20, sunrise-warm +8, ocean-cool -20, forest-green -20, clay-earth +70, graphite-mono +30, dusk-violet -20, magenta-vivid -20 | standard +30, tinted +5, editorial-warm +80, commerce-vivid +5, premium-dark +20, high-contrast +25, data-dense +5 | tech-erp +10, work-console +10, work-insight +10, doc-essay +40, doc-handbook +25, doc-newsroom +40, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet 0, soft -10, bold +5, editorial +15 | hairline-panel (4/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `clarity` | light | static-kit +70, slate-neutral +30, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +15 | standard +100, tinted +30, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog 0, shop-boutique -15, mobile-app +25, mobile-reader +25, mobile-feed +25 | quiet +30, soft +25, bold -15, editorial -25, bold 금지 | soft-layered (4/5) | calm (4/4) | plain-canvas (5/5) | line-soft-frame (6/6) |
| `pocket` | light | static-kit +8, slate-neutral +8, sunrise-warm -20, ocean-cool +30, forest-green +70, clay-earth -20, graphite-mono -10, dusk-violet -20, magenta-vivid -20 | standard +35, tinted +100, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook 0, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog -15, shop-boutique -15, mobile-app +65, mobile-reader +25, mobile-feed +40 | quiet -20, soft +15, bold -20, editorial -20, bold 금지 | soft-layered (4/5) | expressive (4/4) | brand-tint-dots (5/5) | solid-cover (6/6) |
| `nocturne` | dark | static-kit +10, slate-neutral +5, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +70, magenta-vivid +30 | standard +5, tinted +60, editorial-warm +5, commerce-vivid +5, premium-dark +95, high-contrast +5, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog 0, shop-boutique -15, mobile-app +25, mobile-reader +25, mobile-feed +25 | quiet +15, soft +25, bold -15, editorial -25, bold 금지, editorial 금지 | glow-glass (3/5) | calm (4/4) | aurora-glow-geometric (5/5) | duotone-round (6/6) |
| `sport` | light | static-kit +10, slate-neutral +5, sunrise-warm +70, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +30, dusk-violet +10, magenta-vivid +15 | standard +30, tinted +5, editorial-warm +5, commerce-vivid +95, premium-dark -10, high-contrast +30, data-dense +15 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +10, shop-catalog +25, shop-boutique -15, mobile-app +25, mobile-reader +25, mobile-feed +25 | quiet -10, soft +5, bold +15, editorial -20 | hairline-panel (5/5) | expressive (4/4) | plain-canvas (5/5) | solid-cover (6/6) |
| `solar` | light | static-kit +30, slate-neutral +15, sunrise-warm +70, ocean-cool +8, forest-green -20, clay-earth +8, graphite-mono -10, dusk-violet +8, magenta-vivid -20 | standard +5, tinted +100, editorial-warm +5, commerce-vivid +30, premium-dark -10, high-contrast +5, data-dense +15 | tech-erp 0, work-console 0, work-insight +25, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +50, mkt-launch +25, mkt-atelier +10, shop-catalog 0, shop-boutique -15, mobile-app +25, mobile-reader +25, mobile-feed +25 | quiet +15, soft +20, bold -10, editorial -30, bold 금지 | soft-layered (4/5) | expressive (4/4) | brand-tint-dots (5/5) | duotone-round (6/6) |
| `ocean` | light | static-kit +30, slate-neutral +15, sunrise-warm -20, ocean-cool +70, forest-green +8, clay-earth -20, graphite-mono -10, dusk-violet +8, magenta-vivid -20 | standard +35, tinted +100, editorial-warm +5, commerce-vivid +25, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook +25, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog -15, shop-boutique -15, mobile-app +40, mobile-reader +25, mobile-feed +65 | quiet +25, soft +30, bold -25, editorial -10, bold 금지 | soft-layered (4/5) | calm (4/4) | soft-gradient-organic (5/5) | line-soft-frame (6/6) |
| `enterprise` | light | static-kit +30, slate-neutral +70, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +10, magenta-vivid -10 | standard +100, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +45 | tech-erp +40, work-console +40, work-insight +40, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +35, soft -20, bold -10, editorial +20, bold 금지 | hairline-panel (3/5) | calm (3/4) | plain-canvas (5/5) | line-soft-frame (5/6) |
| `devtool` | auto | static-kit +30, slate-neutral +15, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid -10 | standard +100, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +45 | tech-erp +65, work-console +40, work-insight +40, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +40, soft +5, bold -15, editorial +5 | hairline-panel (5/5) | calm (4/4) | blueprint-grid-lines (4/5) | square-tech (5/6) |
| `luxe` | dark | static-kit -20, slate-neutral -20, sunrise-warm +8, ocean-cool -20, forest-green -20, clay-earth +30, graphite-mono +70, dusk-violet -20, magenta-vivid -20 | standard +30, tinted +5, editorial-warm +30, commerce-vivid +25, premium-dark +95, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay 0, doc-handbook -15, doc-newsroom 0, mkt-brand +25, mkt-launch +25, mkt-atelier +65, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet -15, soft -10, bold +5, editorial +30, soft 금지, bold 금지 | hairline-panel (2/5) | calm (3/4) | plain-canvas (5/5) | fine-editorial (6/6) |
| `swiss` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid +15 | standard +100, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +30, data-dense +5 | tech-erp 0, work-console 0, work-insight 0, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +40, mkt-launch +65, mkt-atelier +25, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet -30, soft -25, bold -10, editorial +25, soft 금지, bold 금지 | tonal-sheet (1/5) | still (3/4) | plain-canvas (2/5) | line-soft-frame (4/6) |
| `colorblock` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +70 | standard +5, tinted +60, editorial-warm +5, commerce-vivid +70, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +25, mkt-launch +25, mkt-atelier +25, shop-catalog -15, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +10, soft -20, bold +30, editorial -25 | hairline-panel (4/5) | expressive (4/4) | brand-tint-dots (2/5) | bold-poster (6/6) |
| `newsroom` | light | static-kit +10, slate-neutral +30, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +70, dusk-violet +10, magenta-vivid -10 | standard +30, tinted -15, editorial-warm +95, commerce-vivid +5, premium-dark -10, high-contrast +30, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay +40, doc-handbook +25, doc-newsroom +65, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet -20, soft -35, bold -20, editorial +15, soft 금지, bold 금지 | tonal-sheet (1/5) | still (3/4) | plain-canvas (5/5) | line-soft-frame (4/6) |
| `academic` | light | static-kit +10, slate-neutral +70, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +30, dusk-violet +10, magenta-vivid -10 | standard +60, tinted +5, editorial-warm +95, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay +40, doc-handbook +25, doc-newsroom +40, mkt-brand -15, mkt-launch -15, mkt-atelier 0, shop-catalog -15, shop-boutique 0, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet -40, soft -15, bold -20, editorial +35, soft 금지, bold 금지 | hairline-panel (2/5) | still (3/4) | plain-canvas (2/5) | line-soft-frame (6/6) |
| `wedding` | light | static-kit +10, slate-neutral +5, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +70, graphite-mono +5, dusk-violet +30, magenta-vivid +15 | standard +5, tinted +60, editorial-warm +70, commerce-vivid +5, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay 0, doc-handbook -15, doc-newsroom 0, mkt-brand +10, mkt-launch +10, mkt-atelier +50, shop-catalog +25, shop-boutique +40, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet 0, soft +35, bold -25, editorial -15, bold 금지 | soft-layered (3/5) | calm (4/4) | brand-tint-dots (5/5) | fine-editorial (6/6) |
| `kids` | light | static-kit +10, slate-neutral +5, sunrise-warm +30, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +5, dusk-violet +10, magenta-vivid +70 | standard +5, tinted +60, editorial-warm +5, commerce-vivid +95, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook 0, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog +25, shop-boutique +25, mobile-app +25, mobile-reader -15, mobile-feed 0 | quiet -25, soft +30, bold -20, editorial -20 | soft-layered (4/5) | expressive (4/4) | brand-tint-dots (5/5) | solid-cover (6/6) |
| `wine` | dark | static-kit -20, slate-neutral -20, sunrise-warm +8, ocean-cool -20, forest-green -20, clay-earth +70, graphite-mono -10, dusk-violet +30, magenta-vivid +8 | standard +5, tinted +30, editorial-warm +30, commerce-vivid +25, premium-dark +95, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay 0, doc-handbook -15, doc-newsroom 0, mkt-brand +10, mkt-launch +10, mkt-atelier +50, shop-catalog +25, shop-boutique +40, mobile-app -15, mobile-reader 0, mobile-feed -15 | quiet +20, soft -10, bold -20, editorial +35, bold 금지 | hairline-panel (3/5) | calm (4/4) | brand-tint-dots (5/5) | fine-editorial (6/6) |
| `garden` | light | static-kit -20, slate-neutral -20, sunrise-warm -20, ocean-cool +8, forest-green +70, clay-earth +30, graphite-mono -10, dusk-violet -20, magenta-vivid -20 | standard +5, tinted +60, editorial-warm +80, commerce-vivid +25, premium-dark -10, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook +25, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog +25, shop-boutique +25, mobile-app 0, mobile-reader -15, mobile-feed +25 | quiet +10, soft +25, bold -15, editorial -25, bold 금지 | soft-layered (3/5) | calm (4/4) | brand-tint-dots (5/5) | line-soft-frame (6/6) |
| `school` | light | static-kit +70, slate-neutral +15, sunrise-warm +10, ocean-cool +10, forest-green +30, clay-earth +10, graphite-mono +15, dusk-violet +10, magenta-vivid -10 | standard +60, tinted +5, editorial-warm +10, commerce-vivid +5, premium-dark -10, high-contrast +95, data-dense +5 | tech-erp +25, work-console +25, work-insight +25, doc-essay +25, doc-handbook +25, doc-newsroom +25, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +25, soft -10, bold -30, editorial +30, bold 금지 | hairline-panel (3/5) | still (3/4) | plain-canvas (3/5) | line-soft-frame (6/6) |
| `bank` | light | static-kit +30, slate-neutral +15, sunrise-warm -20, ocean-cool +70, forest-green +8, clay-earth -20, graphite-mono -10, dusk-violet +8, magenta-vivid -20 | standard +100, tinted +5, editorial-warm +5, commerce-vivid +5, premium-dark -10, high-contrast +25, data-dense +45 | tech-erp +40, work-console +40, work-insight +40, doc-essay +10, doc-handbook +10, doc-newsroom +10, mkt-brand 0, mkt-launch 0, mkt-atelier -15, shop-catalog 0, shop-boutique -15, mobile-app -15, mobile-reader -15, mobile-feed -15 | quiet +35, soft +20, bold -15, editorial -20, bold 금지 | soft-layered (3/5) | calm (3/4) | plain-canvas (3/5) | line-soft-frame (6/6) |
| `game` | dark | static-kit +10, slate-neutral +5, sunrise-warm +10, ocean-cool +10, forest-green +10, clay-earth +10, graphite-mono +15, dusk-violet +70, magenta-vivid +30 | standard +5, tinted +60, editorial-warm +5, commerce-vivid +5, premium-dark +95, high-contrast +5, data-dense +5 | tech-erp -15, work-console -15, work-insight -15, doc-essay -15, doc-handbook -15, doc-newsroom -15, mkt-brand +10, mkt-launch +10, mkt-atelier +10, shop-catalog -15, shop-boutique -15, mobile-app +25, mobile-reader +25, mobile-feed +25 | quiet -10, soft -20, bold +15, editorial -20, bold 금지, editorial 금지 | hairline-panel (3/5) | expressive (4/4) | aurora-glow-geometric (5/5) | bold-poster (6/6) |
<!-- /generated:contexts-c -->

## 4. 기타 재료

표면·모션·배경·미디어·상태 패턴은 **계약의 `PLATFORM_KINDS`에 아직 없는 종류**다. 그래서 레지스트리에 넣지 않고 각 `data/*.mjs`의 데이터와 자체 검사(`validateSurface` 등, `checkStyleMaterials`)로 등록했다. 공통 필드와 관계 모양은 계약의 것을 그대로 쓴다. 종류 추가는 6절에 요청으로 적었다.

- 프리셋 CSS는 `[data-surface|motion|bg|media|pattern="이름"]`에 범위를 둔다. 한 화면에 프리셋이 여럿이어도 서로 덮지 않는다.
- 안쪽 여백은 `src/spacing.mjs`의 토큰만 쓴다. 시험이 `lintSpacing`을 모든 프리셋 CSS에 돌린다.
- 색은 색 역할 변수와 `color-mix`만 쓴다. hex를 적지 않는다. 대비 쌍은 정적 팔레트 × 표준·틴트 세트 × light·dark에서 시험이 잰다.
- 이 시험이 실제로 잡은 결함 두 건: 점 무늬와 오로라 글로우가 너무 진해 muted 글자가 4.5:1 아래로 떨어졌다(각각 4.04, 4.44). 장식 농도를 낮춰 고쳤다.
- 조립: `assembleStyleMaterials({styleContext, context, surface?, motion?, background?, media?, states?})`. 요구가 있으면 검사해 그대로 쓰고(없는 id·종류·페이지 유형 불일치·스타일 금지는 거부), 없으면 순위 1위를 쓴다. 결과의 `css`는 한 번만 붙은 결정적 문자열이다.

<!-- generated:materials -->
**surface** (5개)

| id | 이름 | 단계(반경·깊이·채움) | 쓰는 페이지 유형 |
| --- | --- | --- | --- |
| `surface:hairline-panel` | 헤어라인 패널 | base: subtle·outline·surface / raised: subtle·outline·surface / overlay: soft·soft·surface | any |
| `surface:soft-layered` | 부드러운 겹침 | base: soft·soft·surface / raised: soft·lifted·surface / overlay: round·lifted·surface | any |
| `surface:hard-offset` | 굵은 윤곽과 오프셋 | base: square·hard·surface / raised: square·hard·surface / overlay: square·hard·canvas | landing, portfolio, blog, commerce, pricing, general |
| `surface:glow-glass` | 브랜드 글로우 | base: round·glow·surface / raised: round·glow·surface / overlay: round·glow·surface | landing, pricing, dashboard, portfolio, community, listing |
| `surface:tonal-sheet` | 톤 시트(경계·그림자 없음) | base: soft·flat·soft / raised: soft·flat·surface / overlay: square·outline·surface | any |

**motion** (4개)

| id | 이름 | duration(fast/base/slow ms) | easing(enter) | lift | 쓰는 페이지 유형 |
| --- | --- | --- | --- | --- | --- |
| `motion:calm` | 차분한 전환 | 120/160/240 | (0, 0, 0.2, 1) | -1px | any |
| `motion:snappy` | 빠른 업무 전환 | 80/120/180 | (0.1, 0.9, 0.2, 1) | 0px | dashboard, data, listing, settings, docs, form, community |
| `motion:expressive` | 탄력 있는 등장 | 160/260/420 | (0.34, 1.4, 0.64, 1) | -4px | landing, pricing, portfolio, commerce, blog, community, dashboard, listing, general |
| `motion:still` | 움직임 없음 | 0/0/0 | (0, 0, 1, 1) | 0px | any |

**background** (5개)

| id | 이름 | 바탕 · 장식 | 장식 종류 | 쓰는 페이지 유형 |
| --- | --- | --- | --- | --- |
| `background:plain-canvas` | 단색 바탕 | plain · none | none | any |
| `background:brand-tint-dots` | 브랜드 틴트와 점 무늬 | tint · dots | dots | landing, commerce, blog, community, listing, portfolio, pricing, form, general |
| `background:soft-gradient-organic` | 부드러운 그라데이션과 유기적 형태 | gradient · organic | blobs | landing, pricing, commerce, portfolio, blog, form, general, listing |
| `background:blueprint-grid-lines` | 격자와 선 패턴 | grid · lines | lines | dashboard, data, docs, portfolio, landing, general |
| `background:aurora-glow-geometric` | 오로라 글로우와 기하 도형 | gradient · geometric | rings | landing, pricing, portfolio, dashboard, community, listing, general |

**media** (6개)

| id | 이름 | 아이콘 | 타일 | 사진(비율 · 반경 · 테두리 · 톤) | 캡션 | 쓰는 페이지 유형 |
| --- | --- | --- | --- | --- | --- | --- |
| `media:line-soft-frame` | 선 아이콘과 부드러운 사진틀 | line | rounded/soft | 4 / 3 · soft · hairline · natural | below | any |
| `media:solid-cover` | 채움 아이콘과 커버 사진 | solid | circle/action | 16 / 9 · round · none · natural · 스크림 78% | overlay | landing, commerce, listing, community, blog, portfolio, pricing, dashboard, general |
| `media:fine-editorial` | 가는 선 아이콘과 흑백 지면 사진 | line-fine | none/none | 3 / 2 · square · none · muted | rule | article, blog, docs, portfolio, landing, commerce, listing |
| `media:bold-poster` | 굵은 선 아이콘과 포스터 사진 | line-bold | square/action | 1 / 1 · square · hard · tint | below | landing, portfolio, pricing, commerce, blog, listing, general |
| `media:duotone-round` | 이중톤 아이콘과 둥근 사진 | duotone | circle/soft | 4 / 5 · bubble · none · natural | below | landing, commerce, listing, community, form, dashboard, portfolio, general |
| `media:square-tech` | 각진 아이콘과 기술 문서 도판 | line-square | square/soft | 16 / 10 · subtle · hairline · natural | rule | dashboard, data, docs, listing, settings, landing, general |

**state-pattern** (8개)

| id | 이름 | 상태 | 배치 | 알림 | 부분 | 쓰는 페이지 유형 |
| --- | --- | --- | --- | --- | --- | --- |
| `state-pattern:empty-illustrated` | 일러스트형 빈 화면 | empty | block | status | icon·title·body·action | any |
| `state-pattern:empty-inline` | 한 줄 빈 안내 | empty | inline | status | icon·body·action | dashboard, data, listing, settings, docs, community, general, form |
| `state-pattern:loading-skeleton` | 스켈레톤 불러오기 | loading | block | status | skeleton·body | any |
| `state-pattern:loading-spinner` | 스피너와 진행 문구 | loading | inline | status | spinner·body | any |
| `state-pattern:error-banner` | 한 줄 오류 배너 | error | banner | alert | icon·title·body·action | any |
| `state-pattern:error-panel` | 세부를 펼치는 오류 패널 | error | block | alert | icon·title·body·details·action | any |
| `state-pattern:success-toast` | 닫을 수 있는 성공 토스트 | success | toast | status | icon·title·body·dismiss | any |
| `state-pattern:success-confirmation` | 다음 단계를 안내하는 완료 화면 | success | block | status | icon·title·body·action | form, commerce, settings, auth, landing, listing, general, dashboard |
<!-- /generated:materials -->

상태 패턴을 상태별로 묶으면 다음과 같다.

<!-- generated:state-kinds -->
- empty: `empty-illustrated`, `empty-inline`
- loading: `loading-skeleton`, `loading-spinner`
- error: `error-banner`, `error-panel`
- success: `success-toast`, `success-confirmation`
<!-- /generated:state-kinds -->

## 5. 차트 프리셋 29개

차트 렌더러와 프리셋 데이터는 바꾸지 않았다. 2.4.0~2.6.0 출력 바이트는 시험이 고정한다(프리셋 29개 렌더, 대시보드 컴파일 3종, 구형 축 차트 4종). 바꾼 것은 `niceMax`의 중복 정의 하나다: `src/render/chart.mjs`가 `chart-legacy.mjs`의 같은 함수를 다시 내보낸다.

### 5.1 형태와 맥락의 관계

- 형태 군: 아래 목록. 같은 데이터 유형을 그리는 다른 형태가 대안(`alternatives`)이다(`KIND_DATA_TYPES` 표).
- 형태 × 페이지 유형은 아래 행렬이 정한다. 허용되지 않는 칸은 이유와 함께 `P_CHART_CONTEXT`로 거부한다(예: 히트맵은 열×행 격자 라벨이 필요해 훑는 화면에 두지 않는다). form·auth·error는 입력과 복구에 집중하는 화면이라 모두 거부한다.
- 프리셋의 기본 페이지 유형(`contexts`)은 항상 허용된다(시험).

<!-- generated:form-groups -->
- comparison: bar, bars-h
- composition: stacked-bar, donut, waterfall
- trend: line, area, sparkline
- distribution: histogram, heatmap
- relationship: scatter
- process: funnel
- market: candlestick, ohlc
<!-- /generated:form-groups -->

<!-- generated:chart-matrix -->
| 형태 | general | landing | dashboard | data | listing | community | docs | article | blog | commerce | portfolio | pricing | form | settings | auth | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bar | O | O | O | O | O | O | O | O | O | O | O | O | · | O | · | · |
| bars-h | O | O | O | O | O | O | O | O | O | O | O | O | · | O | · | · |
| line | O | O | O | O | O | O | O | O | O | O | O | O | · | O | · | · |
| area | O | O | O | O | O | O | O | O | O | O | O | O | · | O | · | · |
| donut | O | O | O | O | O | O | O | O | O | O | O | O | · | O | · | · |
| sparkline | O | O | O | O | O | O | · | · | · | O | O | O | · | O | · | · |
| stacked-bar | O | · | O | O | O | O | O | O | O | · | · | · | · | · | · | · |
| heatmap | O | · | O | O | · | · | · | · | · | · | · | · | · | · | · | · |
| scatter | O | · | O | O | · | · | O | O | · | · | · | · | · | · | · | · |
| histogram | O | · | O | O | · | · | O | O | · | · | · | · | · | · | · | · |
| waterfall | O | · | O | O | · | · | O | O | · | · | · | · | · | · | · | · |
| funnel | O | O | O | O | · | · | · | · | · | O | · | O | · | · | · | · |
| candlestick | O | · | O | O | O | · | · | · | · | · | · | · | · | · | · | · |
| ohlc | O | · | O | O | O | · | · | · | · | · | · | · | · | · | · | · |
<!-- /generated:chart-matrix -->

### 5.2 프리셋별 관계

<!-- generated:chart-presets -->
| 프리셋 | 형태(군) | 데이터 유형 | 도메인 | 기본 페이지 유형 | 허용 페이지 유형(수) | 옵션(격자·라벨·범례·밀도·반응형) | 같은 데이터의 다른 형태(대안) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `erp-quarterly-revenue` | stacked-bar (composition) | time | erp | dashboard | 8 | horizontal·values·bottom·comfortable·fit | analytics-growth-bridge, erp-budget-bridge, finance-cashflow-waterfall |
| `finance-monthly-close` | line (trend) | time | finance | dashboard | 13 | both·last·bottom·comfortable·fit | campaign-weekly-growth, finance-drawdown-area, mobile-sparkline |
| `analytics-cohort-scatter` | scatter (relationship) | relationship | analytics | dashboard | 5 | both·none·none·comfortable·fit | — |
| `marketing-channel-share` | donut (composition) | part-to-whole | marketing | dashboard | 13 | none·none·right·comfortable·fit | analytics-growth-bridge, erp-budget-bridge, erp-cost-breakdown |
| `mobile-sparkline` | sparkline (trend) | time | mobile | dashboard | 10 | none·last·none·compact·fit | analytics-traffic-lines, campaign-weekly-growth, finance-drawdown-area |
| `operations-activity-heatmap` | heatmap (distribution) | time | erp | dashboard | 3 | none·none·bottom·comfortable·fit | analytics-growth-bridge, analytics-traffic-lines, campaign-weekly-growth |
| `sales-pipeline-value` | bar (comparison) | process | erp | dashboard | 13 | horizontal·values·none·comfortable·fit | analytics-feature-adoption, erp-inventory-aging, marketing-conversion-funnel |
| `campaign-weekly-growth` | area (trend) | time | marketing | dashboard | 13 | horizontal·extremes·none·comfortable·fit | analytics-traffic-lines, finance-monthly-close, finance-yield-curve |
| `erp-budget-bridge` | waterfall (composition) | category | erp | dashboard | 5 | horizontal·values·bottom·comfortable·fit | erp-cost-breakdown, erp-quarterly-revenue, marketing-channel-share |
| `erp-inventory-aging` | bars-h (comparison) | category | erp | data | 13 | vertical·values·none·comfortable·fit | erp-monthly-closing, marketing-channel-roas, mobile-weekly-activity |
| `erp-cost-breakdown` | stacked-bar (composition) | category | erp | data | 8 | both·none·right·compact·fit | analytics-growth-bridge, erp-budget-bridge, finance-cashflow-waterfall |
| `erp-lead-time-histogram` | histogram (distribution) | distribution | erp | data | 5 | both·none·none·comfortable·fit | — |
| `erp-monthly-closing` | bar (comparison) | time | erp | data | 13 | horizontal·extremes·none·comfortable·scroll | analytics-growth-bridge, analytics-retention-heatmap, analytics-traffic-lines |
| `finance-price-candles` | candlestick (market) | time | finance | dashboard | 4 | horizontal·none·bottom·comfortable·fit | finance-price-ohlc, analytics-growth-bridge, analytics-retention-heatmap |
| `finance-price-ohlc` | ohlc (market) | time | finance | dashboard | 4 | both·none·right·compact·fit | finance-price-candles, mobile-stock-candles, analytics-growth-bridge |
| `finance-cashflow-waterfall` | waterfall (composition) | time | finance | dashboard | 5 | none·values·right·compact·fit | erp-cost-breakdown, erp-quarterly-revenue, analytics-retention-heatmap |
| `finance-yield-curve` | line (trend) | time | finance | dashboard | 13 | none·values·none·comfortable·fit | campaign-weekly-growth, finance-drawdown-area, mobile-sparkline |
| `finance-risk-return-scatter` | scatter (relationship) | relationship | finance | dashboard | 5 | horizontal·none·bottom·comfortable·fit | — |
| `finance-drawdown-area` | area (trend) | time | finance | dashboard | 13 | none·extremes·none·compact·fit | analytics-traffic-lines, finance-monthly-close, finance-yield-curve |
| `analytics-session-histogram` | histogram (distribution) | distribution | analytics | data | 5 | horizontal·values·none·compact·fit | — |
| `analytics-retention-heatmap` | heatmap (distribution) | time | analytics | data | 3 | none·values·bottom·compact·fit | analytics-growth-bridge, analytics-traffic-lines, campaign-weekly-growth |
| `analytics-traffic-lines` | line (trend) | time | analytics | dashboard | 13 | horizontal·none·right·comfortable·fit | campaign-weekly-growth, finance-drawdown-area, mobile-sparkline |
| `analytics-feature-adoption` | bars-h (comparison) | category | analytics | dashboard | 13 | none·values·none·compact·fit | erp-monthly-closing, marketing-channel-roas, mobile-weekly-activity |
| `analytics-growth-bridge` | waterfall (composition) | time | analytics | dashboard | 5 | both·values·bottom·comfortable·scroll | erp-cost-breakdown, erp-quarterly-revenue, analytics-retention-heatmap |
| `marketing-channel-roas` | bar (comparison) | category | marketing | dashboard | 13 | horizontal·none·bottom·comfortable·fit | analytics-feature-adoption, erp-inventory-aging, analytics-growth-bridge |
| `marketing-conversion-funnel` | funnel (process) | process | marketing | dashboard | 6 | none·values·none·comfortable·fit | analytics-feature-adoption, erp-inventory-aging, erp-monthly-closing |
| `mobile-weekly-activity` | bar (comparison) | time | mobile | listing | 13 | none·values·none·compact·fit | analytics-growth-bridge, analytics-retention-heatmap, analytics-traffic-lines |
| `mobile-balance-trend` | line (trend) | time | mobile | listing | 13 | none·last·none·compact·fit | campaign-weekly-growth, finance-drawdown-area, mobile-sparkline |
| `mobile-stock-candles` | candlestick (market) | time | mobile | listing | 4 | none·none·bottom·compact·scroll | finance-price-ohlc, analytics-growth-bridge, analytics-retention-heatmap |
<!-- /generated:chart-presets -->

### 5.3 프로필에 적힌 프리셋의 결과

프로필 7개의 `charts.presets`에 적힌 프리셋은 모두 8건이다. 구형 `assemble()`에서 어느 패턴으로도 조립되지 않는 것이 5개였다. 이 5개는 이제 플랫폼 경로에서 조립되거나, 이유와 대안이 있는 거부가 된다.

- 조립: 프리셋의 페이지 유형 규칙만 적용하면 5개 모두 프로필의 페이지 유형 중 하나 이상에서 조립된다(`assembleChartPreset`).
- 거부: 프로필의 `charts.kinds`까지 적용하면 4개는 `P_CHART_PROFILE_KIND`로 거부된다. 프로필이 자기 목록의 프리셋(stacked-bar, heatmap, donut, sparkline)을 자기 형태 목록에서 빼놓았기 때문이다. 거부에는 프로필이 허용하는 형태의 대안 프리셋이 따라 나온다. `campaign-weekly-growth`(area)는 형태가 허용돼 두 조건 모두 조립된다. 구형 경로에서 막힌 이유는 형태가 아니라 적용할 기본 차트 위치가 없는 것이었다.
- 근본 원인은 프로필 데이터(`src/profiles/data.mjs`)의 불일치다. 이 파일은 고치지 않는다(6절).

<!-- generated:chart-profile -->
| 프로필 | 프리셋 | 형태 | 구형 경로(assemble) | 플랫폼: 페이지 유형 규칙만 | 플랫폼: 프로필 형태 제한까지 | 대안(프로필 형태 안) |
| --- | --- | --- | --- | --- | --- | --- |
| erp | `erp-quarterly-revenue` | stacked-bar | 조립 안 됨 | listing: 조립, dashboard: 조립, data: 조립, settings: 거부(유형) | listing: 거부(형태), dashboard: 거부(형태), data: 거부(형태), settings: 거부(유형) | analytics-traffic-lines, campaign-weekly-growth, erp-monthly-closing |
| erp | `operations-activity-heatmap` | heatmap | 조립 안 됨 | listing: 거부(유형), dashboard: 조립, data: 조립, settings: 거부(유형) | listing: 거부(유형), dashboard: 거부(형태), data: 거부(형태), settings: 거부(유형) | analytics-traffic-lines, campaign-weekly-growth, erp-monthly-closing |
| erp | `sales-pipeline-value` | bar | 조립됨 | listing: 조립, dashboard: 조립, data: 조립, settings: 조립 | listing: 조립, dashboard: 조립, data: 조립, settings: 조립 | analytics-feature-adoption, erp-inventory-aging |
| finance | `finance-monthly-close` | line | 조립됨 | dashboard: 조립, data: 조립, listing: 조립, settings: 조립 | dashboard: 조립, data: 조립, listing: 조립, settings: 조립 | campaign-weekly-growth, finance-drawdown-area, erp-monthly-closing |
| finance | `sales-pipeline-value` | bar | 조립됨 | dashboard: 조립, data: 조립, listing: 조립, settings: 조립 | dashboard: 조립, data: 조립, listing: 조립, settings: 조립 | analytics-feature-adoption, erp-inventory-aging |
| saas-landing | `campaign-weekly-growth` | area | 조립 안 됨 | landing: 조립, pricing: 조립 | landing: 조립, pricing: 조립 | analytics-traffic-lines, finance-monthly-close, finance-yield-curve |
| saas-landing | `marketing-channel-share` | donut | 조립 안 됨 | landing: 조립, pricing: 조립 | landing: 거부(형태), pricing: 거부(형태) | erp-monthly-closing, marketing-channel-roas, mobile-weekly-activity |
| mobile-app | `mobile-sparkline` | sparkline | 조립 안 됨 | listing: 조립, settings: 조립, auth: 거부(유형), form: 거부(유형) | listing: 거부(형태), settings: 거부(형태), auth: 거부(유형), form: 거부(유형) | analytics-traffic-lines, finance-monthly-close, finance-yield-curve |
<!-- /generated:chart-profile -->

### 5.4 차트 색 역할

렌더러는 모든 형태에서 범주형 `--kit-chart1~5`와 투명도 단계만 읽는다. 플랫폼 색 역할 중 형태의 뜻과 맞는 것을 읽게 하는 옵션이 `colorRoles`다(`renderChartPreset(id, data, {colorRoles})`, `assembleChartPreset`의 `colorRoles`). 렌더러 출력의 색 참조만 바꾸고 구조·글·숫자는 그대로다. 기본값은 꺼짐이라 2.4.0~2.6.0 출력은 바이트가 같다(해시 고정 시험).

| 형태 | 바꾸는 것 | 읽는 변수 |
|---|---|---|
| heatmap | 셀·범례의 `chart1` + 투명도 .16~1.00을 7단계로 | `--kit-seq1~7`(작은 값이 1, 큰 값이 7) |
| waterfall | 증가·감소 막대와 범례 칸(합계는 muted 그대로) | 증가 `--kit-div6`, 감소 `--kit-div2`(발산의 양 끝 쪽) |
| donut | 조각·범례 색의 순환을 5색에서 6색으로(여섯째 조각이 `chart1`로 되돌아가지 않는다) | `--kit-chart1~6` |

- `assembleChartPreset`은 `colorRoles`를 생략하면 `tokens`가 그 형태의 변수를 모두 줄 때만 켠다. 변수가 없는 조합은 범주형 색으로 되돌아간다(색이 사라지지 않는다). 시험이 팔레트 9 × 세트 7 × light·dark로 결합되는 125쌍 모두에서 이 규칙과 `missing`에 차트 색 변수가 없음을 본다.
- 아직 연결하지 않은 것: candlestick·ohlc의 상승·하락(발산 양 끝과 뜻이 가깝다), funnel의 단계(순차). 막대 안 글자 대비를 따로 확인한 뒤에 연결해야 해서 두었다(확인 필요). 셀 값 라벨은 표면색 테두리 후광이 있어 읽힌다.
- 발산 양 끝의 의미(증가=`div6`)는 W1 설계에서 높은 쪽 끝이 `div7`인 것을 따랐다. 세트·팔레트에 따라 두 끝 색이 달라 증가·감소를 색으로만 알리지 않는다(막대 방향, 범례 글, 표 값이 함께 간다).

### 5.5 조립 함수

`assembleChartPreset({preset, context, profile?, data?, tokens?})`는 AI가 SVG를 만들지 않는다. 같은 프리셋 렌더러(`renderChartPreset`)의 출력을 그대로 돌려주고, 차트 부품 CSS와 출력이 기본값 없이 읽는 변수 목록(`requires`)을 함께 낸다. `tokens`를 주면 값이 없는 변수를 `missing`으로 알린다. W1이 차트 색(`--kit-chart1~6`, `--kit-seq1~7`, `--kit-div1~7`)을 `bindColor`에 더한 뒤로 색과 간격 변수는 모두 채워진다. 아직 빠진 것은 타이포 변수 `--kit-t-micro` 하나다(`bindType`이 내지 않는다, 6.2절).

## 6. 계약 변경 요청과 남은 일

### 6.1 조립 엔진 작업(W5)에 요청

1. **재료 종류 추가**: `PLATFORM_KINDS`와 `KIND_SPECS`에 `surface`, `motion`, `background`, `media`, `state-pattern`을 더한다. 필드는 `STYLE_MATERIAL_SPECS`(`data/surfaces.mjs`)가 그대로 쓸 수 있다. 등록되면 `to`가 이 재료를 가리키는 관계와 레지스트리 검사(`check`)를 쓸 수 있고, 지금의 `checkStyleMaterials`·`rankStyleMaterials`·`assembleStyleMaterials`는 레지스트리 위로 옮긴다. 옮기기 전까지 이 파일들이 소유한다.
2. **스타일 맥락 필드 확장**: `KIND_SPECS['style-context']`에 `purpose`, `forbidCombos`, `tendencies`, `media`, `layout`을 더하면 `STYLE_CONTEXT_DETAILS`를 기록 안으로 옮길 수 있다.
3. **`recommend()`의 빈 결과 이유**: 맥락 필터로 후보가 0개일 때 `blocked`에 `P_RECOMMEND_NO_CANDIDATE`를 남기게 한다. 지금은 `recommendWithReason`이 감싸고 있다.
4. **페이지 단계**: 스타일 맥락의 `axisPreferences.shell·width·density`와 `layout.navLimit`을 페이지 단계가 읽는다고 ADR 0012 §3이 적었다. 읽는 쪽 구현은 W5의 일이다.

### 6.2 W1·W2·W3 반영 상태

작업 도중 `git fetch`로 확인했고 W1·W2·W3이 main에 올린 뒤 rebase했다. 스타일 맥락의 관계는 그 재료를 규칙으로 읽는다(1절 "관계 대상"의 수). 규칙을 실제 재료에 맞춘 내용은 다음과 같다.

- W1 팔레트·세트의 1·2순위는 id로 정했다(2.2절). 규칙은 W1 서브토큰 세트의 태그(`editorial`, `commerce`, `dark-first`, `high-contrast`, `data` 등)와 팔레트의 톤·색상각을 읽는다. 팔레트 자신이 거는 세트 관계는 W1의 것이고 겹치지 않는다.
- W2 타이포 시스템의 용도 태그와 `face-pairing:*` id(합쳐진 구형 프리셋 `merges`)를 읽는다. W2가 시스템에서 스타일 맥락 `workspace`로 거는 관계(`when` 조건 포함)는 그대로 쓰인다.
- W3 패밀리의 모양·밀도·페이지 유형을 읽는다. 테마가 금지한 모양의 패밀리에는 `forbids`가 생긴다(예: brutalist는 soft·editorial 패밀리, ledger는 soft·bold 패밀리).

아직 남은 일:

| 항목 | 내용 |
|---|---|
| 타이포 변수 | 차트 CSS가 `--kit-t-micro`를 읽는데 `bindType`이 내지 않는다. W2에 요청한다(차트 조립의 `missing`에 남는다) |
| 서체 짝 id | 새 서체 짝 id가 생기면 `FACE_GROUP`(구형 프리셋 id 기준)에 있어야 군 규칙이 적용된다. 없으면 같은 서체 규칙만 적용되고 군 규칙은 건너뛴다 |
| 세트 태그 | W1이 규칙에 없는 태그를 더하면 관계가 안 생기고 기본 후보(prefers 5)가 된다. 규칙 표에 줄을 더한다 |
| 색감 대역 | 테마별 색상각 대역(`SETUP`)은 테마 설명에 적힌 색 이름에서 읽었다. 설명에 없는 테마는 색감 요구가 없다고 본다. 사람 검토는 하지 않았다(확인 필요) |
| 패밀리 용도 | W3 패밀리의 컨트롤 구성(`members`)은 아직 규칙에 쓰지 않는다. 스타일 맥락이 특정 컴포넌트를 선호하는 관계는 없다 |

### 6.3 범위 밖에서 발견한 것(고치지 않음)

- `src/profiles/data.mjs`: 프로필이 `charts.presets`에 적은 프리셋 4개(erp-quarterly-revenue, operations-activity-heatmap, marketing-channel-share, mobile-sparkline)의 형태가 같은 프로필의 `charts.kinds`에 없다. 이 파일은 읽기 전용(고정 출력)이다.
- `docs/platform/audit-2026-11.md` §2.6은 "프로파일에 적힌 7개 중 5개는 조립되지 않는다"고 적었다. 프로필 7개에 적힌 프리셋 항목은 8건(고유 7개)이고, 구형 경로에서 조립되지 않는 고유 프리셋은 5개다(시험이 센다).

## 7. 검증

```sh
node --test tests/platform-style*.test.mjs tests/platform-chart*.test.mjs tests/chart-presets.test.mjs tests/chart-presets-distinct.test.mjs
npm test
node scripts/platform/baseline.mjs --check
```

- `tests/platform-style-contexts.test.mjs`: 54개 이행, 필드, 관계, recommend, 금지 모드 검사.
- `tests/platform-style-materials.test.mjs`: 프리셋 구별성, 실제 CSS(간격 계약·변수), 대비, 마크업 이스케이프, 순위, 조립.
- `tests/platform-chart-presets.test.mjs`: 출력 바이트 고정, 29개 관계, 5개의 결과, 조립·거부, 순위.
- `tests/platform-style-doc.test.mjs`: 이 문서의 생성 표.
- 새 시험은 버그를 심어 실패하는 것을 확인하고(RED) 되돌려 통과하는 것을 확인했다(GREEN).
