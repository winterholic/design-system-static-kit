# R12 공식 출처 보완 — Material 3 · Spectrum · Polaris

조회: 2026-11-16T13:46:00+09:00

Official evidence only for unextracted fields in the existing rule ledger; no verdict/coverage correction.

## 조사 기준

Fetched public GitHub REST tree/commit metadata and raw files by pinned commit; opened current official Shopify developer documentation. Old failed URLs/JS-empty pages from the ledger were not repeated. No search-snippet numerical claim was accepted as data.

## 결과

표기: **확보**는 공식 데이터에서 값/조건을 직접 확인, **부분 확보**는 일부만 확인하고 일반화 불가, **미기재**는 조회한 공식 경로에 해당 일반 규칙이 없음. 각 항목은 원 대장의 관련 규칙 ID를 연결한다.

## Material 3

### 타입 스케일 수치(크기·행간·자간) — 확보

- 기존 규칙: M3-01, M3-02
- 확인값/조건: Material Web latest token Sass: body large 1rem / 1.5rem / 0.03125rem (size/line-height/tracking); body medium 0.875rem / 1.25rem / 0.015625rem; body small 0.75rem / 1rem / 0.025rem. Display large 3.5625rem / 4rem / -0.015625rem; display medium 2.8125rem / 3.25rem / 0rem; display small 2.25rem / 2.75rem / 0rem. Source tokens include headline/title/label roles as well.
- 적용 조건·한계: Sass values as declared by the checked Material Web token snapshot; rem remains rem (no assumed root font conversion); roles are separate semantic type styles.
- 공식 파일: tokens/versions/latest/sass/_md-sys-typescale.scss
- 출처 ID: m3

### 버튼 높이·위계·패딩 — 확보

- 기존 규칙: M3-03
- 확인값/조건: Base button container height 40px. Filled button source also declares 40px but its token is marked deprecated. Component exposes filled, filled-tonal, outlined, elevated, and text button variants; selected token source establishes 40px container but does not by itself establish a universal padding value.
- 적용 조건·한계: Material Web token implementation; variant-specific style tokens apply. Deprecated filled-button token is identified as such.
- 공식 파일: tokens/versions/latest/sass/_md-comp-button.scss; _md-comp-filled-button.scss
- 출처 ID: m3

### 텍스트 필드·폼 간격 수치 — 부분 확보

- 기존 규칙: M3-03
- 확인값/조건: Outlined text field container height token is 56px and is explicitly deprecated because multiline/text-area variants require dynamic height. Internal source defines input, label and supporting-text metrics via type-scale references. No general vertical gap between separate form fields was identified in these checked token files.
- 적용 조건·한계: 56px is a deprecated fixed-height token, not a universal field rendered height; multiline field height is dynamic.
- 공식 파일: tokens/versions/latest/sass/_md-comp-outlined-text-field.scss
- 출처 ID: m3

### 표/리스트 밀도 — 부분 확보

- 기존 규칙: M3-01
- 확인값/조건: List one-line item container 56px, two-line 72px, three-line 88px; list divider 1px. These are list item tokens, not data-table row heights.
- 적용 조건·한계: Material Web list component; three explicit line-count variants. No table density/row-height value is asserted from these list tokens.
- 공식 파일: tokens/versions/latest/sass/_md-comp-list.scss
- 출처 ID: m3

### 카드 구성 — 부분 확보

- 기존 규칙: M3-02
- 확인값/조건: Card component token source exists for elevated/filled/outlined variants; checked token source defines style/component tokens but the task’s broad “card composition” (content slots, spacing/layout recipe) is not a single numeric rule established by those files.
- 적용 조건·한계: Web component card variants; no generalized card content-padding or card composition number claimed.
- 공식 파일: tokens/versions/latest/sass/_md-comp-elevated-card.scss; _md-comp-filled-card.scss; _md-comp-outlined-card.scss
- 출처 ID: m3

### 내비게이션 바·레일·드로어 전환 기준 — 부분 확보

- 기존 규칙: M3-01, M3-02
- 확인값/조건: Navigation bar container token 80px; active indicator 64px wide × 32px high. Official Material 3 adaptive window classes in existing M3-01 are compact <600dp, medium 600–839dp, expanded 840–1199dp, large 1200–1599dp, extra-large ≥1600dp. Component-specific bar/rail/drawer switch thresholds are not derived from the component dimension tokens alone.
- 적용 조건·한계: 80/64/32 are Material Web token dimensions; window classes are Android window-width classes in dp, and should not be conflated with CSS px.
- 공식 파일: tokens/versions/latest/sass/_md-comp-navigation-bar.scss; official Android source already linked by M3-01
- 출처 ID: m3

### 마진·열·간격 8dp 격자 — 미기재

- 기존 규칙: M3-01
- 확인값/조건: The checked Material Web token paths do not state a universal 8dp page-margin / column / spacing grid. No value supplied.
- 적용 조건·한계: Specific component spacing tokens do not establish a universal layout grid.
- 공식 파일: Material Web token snapshot listed above
- 출처 ID: m3

## Spectrum

### 컴포넌트 높이 — 부분 확보

- 기존 규칙: SPE-06, SPE-09
- 확인값/조건: Spectrum CSS (Spectrum 1) token output contains component-height and component-specific size tokens, with desktop/mobile contexts on some tokens. Spectrum 2 component schemas specify size options (e.g. button/text-field s, m, l, xl) but do not expose pixel heights in the checked component schema pages. No single universal component height is stated.
- 적용 조건·한계: Spectrum 1 web CSS tokens and Spectrum 2 schema options are different generations/sources; no cross-generation substitution.
- 공식 파일: tokens/dist/json/tokens.json; docs/markdown/components/button.md; text-field.md
- 출처 ID: spectrum1, spectrum2

### 표 행 높이·패딩 — 부분 확보

- 기존 규칙: SPE-06
- 확인값/조건: Spectrum 1 CSS token data: medium rows compact/regular/spacious = 32/40/48px desktop, 40/50/60px mobile; small = 24/32/40px desktop, 30/40/50px mobile; large = 40/48/56px desktop, 50/60/70px mobile; extra-large = 48/56/64px desktop, 60/70/80px mobile. For medium regular, top-to-text is 11px desktop/14px mobile and bottom-to-text is 12px/15px. Spectrum 2 Table schema independently defines size s/m/l (default m) and density compact/regular/spacious (default regular) but no pixel values.
- 적용 조건·한계: S2 semantic options are numeric-free; CSS output is Spectrum 1 web implementation.
- 공식 파일: docs/markdown/components/table.md; tokens/dist/json/tokens.json
- 출처 ID: spectrum1, spectrum2

### 버튼 위계·높이 — 부분 확보

- 기존 규칙: SPE-06
- 확인값/조건: Spectrum 2 Button schema: variant accent, negative, primary, secondary; default accent; size s/m/l/xl, default m. Spectrum 1 token output includes generic component-height scale: 20/24/32/40/48/56/64px desktop and 26/30/40/50/60/70/80px mobile for height scales 50/75/100/200/300/400/500. The checked token JSON does not give a button-size-to-height mapping, so no exact button height is asserted.
- 적용 조건·한계: S2 schema option/default values are distinct from S1 CSS token measurements; do not map size names across generations without a version-specific lookup.
- 공식 파일: docs/markdown/components/button.md; tokens/dist/json/tokens.json
- 출처 ID: spectrum1, spectrum2

### 카드 구성 — 부분 확보

- 기존 규칙: SPE-06
- 확인값/조건: Spectrum 2 Cards schema lists asset, collection, flex, gallery, horizontal, product variants (default asset). Spectrum 2 layout-component token table includes default card widths: extra-small 120px, small 180px, medium 240px, large 320px, extra-large 400px, and card minimum width 100px. These are width tokens, not a universal card anatomy/padding rule.
- 적용 조건·한계: Variant schema vs web implementation token values remain distinct.
- 공식 파일: docs/markdown/components/cards.md; tokens/dist/json/tokens.json
- 출처 ID: spectrum1, spectrum2

### 텍스트 필드 간격 수치 — 부분 확보

- 기존 규칙: SPE-07, SPE-08
- 확인값/조건: Spectrum 2 Text field schema: labelPosition top/side (default top); sizes s/m/l/xl default m; helpText and errorMessage properties exist. The checked Spectrum 1 token JSON exposes text-field-minimum-width-multiplier=1.5 but no general label/help/field-to-field gap token in the checked text-field-prefixed token names. No numeric general form gap is claimed.
- 적용 조건·한계: Do not assign an undocumented general form gap; component internal token values vary by size and platform context.
- 공식 파일: docs/markdown/components/text-field.md; tokens/dist/json/tokens.json
- 출처 ID: spectrum1, spectrum2

### 그리드 열·거터 수치 — 미기재

- 기존 규칙: SPE-09
- 확인값/조건: Checked Spectrum 2 component and token documentation paths do not establish a universal responsive grid column count/gutter rule for the former Spectrum web page’s claim. Previous search-snippet “12 columns” is not treated as verified evidence.
- 적용 조건·한계: No external search summary value copied into this supplement.
- 공식 파일: docs/markdown/components and docs/markdown/tokens checked
- 출처 ID: spectrum2

### 간격 토큰 값 표 — 확보

- 기존 규칙: SPE-05, SPE-06
- 확인값/조건: Spectrum 1 CSS token output exact spacing scale: spacing-50=2px, 75=4px, 100=8px, 200=12px, 300=16px, 400=24px, 500=32px, 600=40px, 700=48px, 800=64px, 900=80px, 1000=96px. Spectrum 2 layout-component table separately gives named component-specific desktop/mobile values and marks many entries deprecated/replaced; these are not a universal scale.
- 적용 조건·한계: Keep per-token value/context; many layout/component spacing tokens are deprecated or replaced. Not all are universal spacing scale values.
- 공식 파일: tokens/dist/json/tokens.json; docs/markdown/tokens/layout-component.md
- 출처 ID: spectrum1, spectrum2

## Polaris

### 브레이크포인트 px — 확보

- 기존 규칙: POL-12
- 확인값/조건: Archived Polaris React token values are xs 0px, sm 490px, md 768px, lg 1040px, xl 1440px.
- 적용 조건·한계: Historical React/token system, mobile-first aliases; the current Polaris Web Components documentation is v2.0 latest and is not this archived CSS token package.
- 공식 파일: polaris-tokens/src/themes/base/breakpoints.ts
- 출처 ID: pol-react, pol-web

### 간격·크기 토큰 px — 확보

- 기존 규칙: POL-01, POL-02
- 확인값/조건: Archived React polaris-tokens size scale: 0px, 0.66px, 1, 2, 4, 6, 8, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 30, 32, 36, 40, 48, 64, 80, 96, 112, 128px. Space/height scales select named members of this size map; aliases include button-group-gap=space-200 (8px), card-gap/card-padding=space-400 (16px), table-cell-padding=space-150 (6px).
- 적용 조건·한계: Values are from historical React token source. It is not evidence that current Web Components expose the same CSS token contract.
- 공식 파일: polaris-tokens/src/size.ts; themes/base/space.ts; height.ts
- 출처 ID: pol-react, pol-web

### 타입 스케일 — 확보

- 기존 규칙: POL-12
- 확인값/조건: Archived React font-size tokens resolve through shared size map: 275=11px, 300=12px, 325=13px, 350=14px, 400=16px, 450=18px, 500=20px, 550=22px, 600=24px, 750=30px, 800=32px, 900=36px, 1000=40px. Letter-spacing: densest -0.54px, denser -0.3px, dense -0.2px, normal 0px. Line-height tokens 300/400/500/600/700/800/1000/1200 resolve to same-numbered size-map values 12/16/20/24/28/32/40/48px.
- 적용 조건·한계: Archived React token declarations; type roles and font-weight mapping remain in source; not asserted as current Web Components computed typography.
- 공식 파일: polaris-tokens/src/themes/base/font.ts; size.ts
- 출처 ID: pol-react, pol-web

### 표 밀도 — 부분 확보

- 기존 규칙: POL-06, POL-07
- 확인값/조건: Archived React DataTable CSS: default cells use vertical 8px / horizontal 6px padding (space-200 / space-150); IncreasedTableDensity uses 6px on all sides, with first/last cell horizontal padding still 12px; header cells use 12px top/bottom padding. Numeric cell class is right-aligned. CSS does not fix a universal row height; content/font can affect row box height. Current Web Components Table docs instead state auto table on wide screens/list on narrow screens; density/height px are not specified on that page.
- 적용 조건·한계: React pixel padding is resolved from the referenced scale map. Current web component docs are a separate platform, v2.0 latest.
- 공식 파일: polaris-react/src/components/DataTable/DataTable.module.css; current docs layout-and-structure/table
- 출처 ID: pol-react, pol-web

### 버튼 높이 — 부분 확보

- 기존 규칙: POL-11
- 확인값/조건: Archived React Button CSS size mapping (min-height / vertical padding), mobile base → md-up desktop: micro 28px → 24px with 4px vertical padding; slim and medium 32px → 28px with 6px vertical padding; large 36px → 32px with 6px vertical padding. The mobile breakpoint is md-up=768px from the same archived React token source. Current v2.0 latest Web Components Button docs list variants/tones but no pixel height/padding.
- 적용 조건·한계: Legacy React web implementation vs current app-home Web Components API distinction; do not claim legacy measurements for current component.
- 공식 파일: polaris-react/src/components/Button/Button.module.css; current docs actions/button
- 출처 ID: pol-react, pol-web

## 출처 식별자

- **m3 — Material 3 / Material Web token source**: [https://github.com/material-components/material-web/tree/37aa14b843dcaeb3a46f898679fa6fcd109b1905/tokens/versions/latest/sass](https://github.com/material-components/material-web/tree/37aa14b843dcaeb3a46f898679fa6fcd109b1905/tokens/versions/latest/sass); 식별자 `material-web main @ 37aa14b843dcaeb3a46f898679fa6fcd109b1905 (latest token snapshot at that commit)`; 플랫폼: Material Web, Sass token source; token values retain source units (rem or px); 조회: 2026-11-16T13:46:00+09:00. 파일: _md-sys-typescale.scss, _md-comp-button.scss, _md-comp-outlined-text-field.scss, _md-comp-list.scss, _md-comp-navigation-bar.scss, _md-comp-navigation-rail.scss, _md-comp-navigation-drawer.scss.
- **spectrum1 — Adobe Spectrum CSS tokens (Spectrum 1 generation)**: [https://github.com/adobe/spectrum-css/blob/70d3660a992a98837d8177d8c25dc5a282e8f361/tokens/dist/json/tokens.json](https://github.com/adobe/spectrum-css/blob/70d3660a992a98837d8177d8c25dc5a282e8f361/tokens/dist/json/tokens.json); 식별자 `spectrum-css main @ 70d3660a992a98837d8177d8c25dc5a282e8f361`; 플랫폼: Web CSS token output; desktop/mobile token contexts where present; 조회: 2026-11-16T13:46:00+09:00. 파일: tokens/dist/json/tokens.json.
- **spectrum2 — Adobe Spectrum 2 / spectrum-design-data**: [https://github.com/adobe/spectrum-design-data/tree/6ae966d623508ee4d7031c6bafe93785a8c29468/docs](https://github.com/adobe/spectrum-design-data/tree/6ae966d623508ee4d7031c6bafe93785a8c29468/docs); 식별자 `spectrum-design-data main @ 6ae966d623508ee4d7031c6bafe93785a8c29468`; 플랫폼: Spectrum 2 design-data schemas and documentation; not assumed equivalent to Spectrum 1 values; 조회: 2026-11-16T13:46:00+09:00. 파일: markdown/components/button.md, markdown/components/text-field.md, markdown/components/table.md, markdown/components/cards.md, markdown/tokens/layout-component.md, markdown/tokens/typography.md.
- **pol-react — Shopify Polaris React + polaris-tokens (archived repository)**: [https://github.com/Shopify/polaris-react-archive/tree/3f7954ae42fabf26d63cee68c23ceebfd7ef0972/polaris-tokens/src](https://github.com/Shopify/polaris-react-archive/tree/3f7954ae42fabf26d63cee68c23ceebfd7ef0972/polaris-tokens/src); 식별자 `polaris-react-archive main @ 3f7954ae42fabf26d63cee68c23ceebfd7ef0972; repository archived/read-only 2026-09-11`; 플랫폼: Historical Polaris React token and CSS implementation; do not treat as current Web Components implementation; 조회: 2026-11-16T13:46:00+09:00. 파일: themes/base/breakpoints.ts, themes/base/space.ts, themes/base/height.ts, themes/base/font.ts, size.ts, ../polaris-react/src/components/Button/Button.module.css, ../polaris-react/src/components/DataTable/DataTable.module.css.
- **pol-web — Shopify Polaris Web Components documentation**: [https://shopify.dev/docs/api/app-home/latest/web-components](https://shopify.dev/docs/api/app-home/latest/web-components); 식별자 `App Home web components documentation v2.0 latest (page-selected version at retrieval)`; 플랫폼: Current Shopify app-home Web Components docs; public component guidance/API, not the archived React CSS/token package; 조회: 2026-11-16T13:46:00+09:00. 파일: actions/button, forms/text-field, layout-and-structure/table, layout-and-structure/section.

## 한계

- Material Web is an implementation/token source for Material 3 on the web; it is not a claim that every M3 platform has identical component rendering.
- Material values preserve source units and deprecated markers; CSS px, Android dp, and rem are not interchanged.
- Spectrum 1 spectrum-css token output and Spectrum 2 spectrum-design-data are separately labelled. S2 schemas often expose options without pixel values.
- Polaris React numeric data is historical and sourced from the now-archived polaris-react-archive repository. Current Shopify app-home Web Components docs are v2.0 latest and frequently specify semantics/responsive behavior without pixel measurements.
- A “미기재” field means the checked official paths did not state the requested generalized rule; it does not claim no such data exists anywhere in the ecosystem.

## 처리 제외

- 원본 `rule-ledger.json` / `.md` 수정 및 전체 판정·coverage 재계산: 하지 않음 (후속 통합 단계).
- `src`, `site`, `tests` 및 다른 작업자 파일 수정: 하지 않음.
- 커밋·푸시·배포: 하지 않음.
