# R14-A marker correction: independent verification

Date: 2026-11-16 (Asia/Seoul)
Decision: **PASS for the marker geometry correction.** The observed 11.7×9.9px circle regression is absent in the current freshly compiled preview at 602px, 700px, the 509/510/511px boundary, and a valid 320px supporting-aside Blueprint. The three marker forms remain centered. The 340px cap, wide plot, donut circle, and chart data/TOC are preserved. No product source or existing contract test was edited in this verification.

A pre-existing edge detail remains: at plot widths 509, 510, and 511px, one tick-label bounding box extends about 5px past the left SVG edge. It stays visible through `overflow:visible`; the document does not overflow horizontally. The label transform is correct for the allocated plot width and is not distorted in the tested split-row case. This boundary label placement is recorded separately from the marker pass.

## Identity and independent inputs

- HEAD: `61d2e5e5c51a58aeb6a7f4ecc2fc6a7337bd6864` (working tree has other in-flight changes).
- Fresh preview builder: `docs/evidence/context-rollout/remediation-a-marker-verification/build-preview.mjs`, SHA-256 `934e0c64d861bd70cd1ef6d85afcafd5fd9b5e3f99c6efdeaba7cc3c21c0a6d8`.
- Dashboard Blueprint input SHA-256: `1771bfe896ca57414e0ef067b3d998101fb8d208c0a1a57ce9dd601994994994`.
- Valid supporting-aside Blueprint input SHA-256: `1f135e7c5436d095d5977000d48d132733cf7072ca33e004185dbfc87470ea5c`.
- Source SHA-256 values were recomputed and matched the current files: `src/composition.mjs` `cf8194033392c401aa10c22f937d8d47d162dde5dc138023ce9e238e13afd392`; `src/render/chart.mjs` `2088bfc9c2dd73201110e8477d565b4b66ff9ed97dc9eec37aca270813e40903`; `src/render/nodes.mjs` `da1686ff21885f4e5922d3db4dce3ed087165b3f57c36fa0807a6ca6a1475f8b`; `tests/composition.test.mjs` `3a425c44afd97c25e59569b82b79abe239df661b78af81be1eeca07e645116cb`.
- Five final-state YAML receipts are in `docs/evidence/context-rollout/remediation-a-marker-verification/receipts/`. Each records source hashes and the current-file match. Historical RED and initial GREEN are identified as prior evidence, not re-labeled as current measurements.
- Current pages were compiled directly from valid Blueprints by the dedicated builder and served at `http://127.0.0.1:4173/docs/evidence/context-rollout/remediation-a-marker-verification/preview/`. The aside case keeps the TOC inside an aside section with the chart as a sibling; the compiled HTML was not relocated.

## Measurements

- **602px allocation with a 700px chart body:** `.kit-chart-body` 700px, `.kit-chart-plot` and SVG 602×340px. Circle 9.92×9.92px, square 9.07×9.07px, diamond 12.47×12.47px; all ratios 1.00 and center error 0px. The 3-series legend wraps below the plot. Text transform `scaleX(0.847176)` equals `510/602`; this distinguishes the actual plot width from the 700px body width, whose ratio would be 0.728571. Text sample `0` bbox is 9.91×18px.
- **700px allocation:** SVG 700×340px; all three marker ratios 1.00 and maximum center error 0px. Text transform `scaleX(0.728571)` equals `510/700`. The same render retained the 340px cap, a separate 1254×340px Cartesian plot, a 200×200px donut (aspect 1), chart tables, and no document horizontal overflow.
- **509/510/511px boundary:** SVG boxes were 509×339.33px, 510×340px, and 511×340px. All marker ratios were 1.00 and center error was 0px. Text scale was 1.000, 1.000, and 0.998043. One label bbox lay roughly 5px left of the SVG at each width; the 509px screenshot shows it rendered, and document width remained 1440px.
- **Valid 320px supporting aside:** chart body and SVG width 238px; SVG height 158.66px. Circle 4.63×4.63px, square 4.23×4.23px, diamond 5.82×5.82px; all ratios 1.00 and center error 0px. The actual aside contains the chart and all 4 TOC links (`#s-install`, `#s-auth`, `#s-first`, `#s-errors`). Its 12 data cells remain, document width is 320px, and horizontal overflow is false.

## Historical RED / initial GREEN / current final

The prior marker note's RED was an HTML preview with the marker CSS rule removed: 11.7×9.9px, ratio 1.18. The initial GREEN recorded ratio 1.00 after that rule was added. Neither is this run's current-source measurement. The five new receipts mark their measurements `final_independent_recheck`, bind them to the fresh inputs and current source hashes, and keep those historical stages separate.

## Narrow verification

```text
node --test --test-name-pattern='context line markers compensate|narrow supporting aside charts' tests/composition.test.mjs
ℹ tests 2 / ℹ pass 2 / ℹ fail 0

node --test --test-name-pattern='all 2.1 templates preserve' tests/composition.test.mjs
ℹ tests 1 / ℹ pass 1 / ℹ fail 0

git diff --check
exit 0
```

The two marker-specific contracts and the narrow 2.1 complete-output hash contract passed. No whole suite, site generation, commit, push, or deployment was run. The previous mobile-card selector result remains as recorded in the earlier independent verification; it was not re-audited because this task's change target was marker geometry.

## Browser evidence and cleanup

Configured browser screenshots were saved to the current Run outbox:

- 602px plot / 700px chart-body legend case: `/Volumes/Backup/ttakkari-data/outbox/7b321811-ac96-484e-b147-7d6d13b1e873/browser/page-2026-11-16T05-23-09-356Z.png`
- 700px chart, cap, donut, and wide plot: `/Volumes/Backup/ttakkari-data/outbox/7b321811-ac96-484e-b147-7d6d13b1e873/browser/page-2026-11-16T05-23-34-597Z.png`
- 509px boundary label: `/Volumes/Backup/ttakkari-data/outbox/7b321811-ac96-484e-b147-7d6d13b1e873/browser/page-2026-11-16T05-23-23-609Z.png`
- valid 320px supporting aside: `/Volumes/Backup/ttakkari-data/outbox/7b321811-ac96-484e-b147-7d6d13b1e873/browser/page-2026-11-16T05-23-23-802Z.png`

The configured browser was closed after evidence capture. The project preview server cleanup was attempted against the process identified by `lsof` as PID 75843; `kill -TERM 75843` returned `operation not permitted` in the command environment. The server may still be listening on 127.0.0.1:4173; it was not retried through another mechanism. `git diff --check` passed.
