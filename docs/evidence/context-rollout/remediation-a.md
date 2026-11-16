# R14 remediation-a — assigned-width card media and charts

Status: **rendered in the configured browser at 320/390/1440px; card and chart corrections verified.**

## Findings and corrections

### Representative cards

`compile(createBlueprint('blog-index')).html` and `news-home` put `data-design-kind="card"`, `class="kit-card"`, and `data-variant="horizontal"` on the same `<article>`. The earlier selector `[data-design-kind=card] .kit-card[data-variant=horizontal]...` required a descendant `.kit-card`, so it matched zero elements. The corrected selector puts the kind and variant tests on the same article: `[data-design-kind=card][data-variant=horizontal]:has(.kit-card-foot) .kit-card-media`.

Configured-browser measurement confirmed the old selector matches **0** and the corrected selector matches **1** on both representative pages. At 320px, the blog/news cards are 288px wide and media grows from 131.5px to 286px; at 390px, 358px cards grow from 163.8px to 356px. At 1440px, the existing horizontal layout is preserved (blog 696→319.2px media; news 1216→558.4px). The rule remains mobile-only at the existing 560px boundary.

### Cartesian charts

The preceding implementation removed the 340px SVG height cap. Browser measurement confirmed the predicted 1254×836px SVG and a 977.5px dashboard chart figure at 1440px. That used the allocated width but made the chart tall. Restoring the cap alone reintroduced letterboxing: in the same 1254px box, the dashboard plot bbox was 388.2px wide; bank was 439.2px in a 966px box; HR was 388.2px in a 1086px box.

The shared contextual path now keeps the existing 340px cap and emits `preserveAspectRatio="none"` for Cartesian SVGs only. The browser measured the 1440px results as dashboard 1254×340px with a 954.4px plot bbox, bank 966×340px with an 831.8px plot bbox, and HR 1086×340px with an 826.6px plot bbox. Their chart figures are 481.5px, 505.5px, and 505.5px high respectively; dashboard document height is 2258px before and 1700px after (the measurement panel is hidden for this measurement), and the dashboard SVG is no longer 836px high. Stretching the SVG also stretched text horizontally, so the shared chart body now scales only chart text in x according to its own container width. The measured dashboard label box is 9.9×18px after that correction, versus 24.4×18.1px before; it matches the 9.9×18px capped comparison. Computed SVG-label font size remains 11px. The measurement probe hides itself while recording document height, so its receipt UI is not counted as page content. Captures show readable chart labels and a circular donut.

The narrow `docs-reference` aside with an asymmetric three-series horizontal bar chart stayed within its assigned width at all viewports. Its SVG measured 238×158.7px (320px), 308×205.3px (390px), and 250×166.7px (1440px); no document had horizontal overflow. C26 selects `visual-data` semantics; it was not the cause of the plot geometry. The height cap and SVG aspect-ratio behavior are handled by the shared chart output/CSS path.

## Changes

- `src/composition.mjs`: fixes the same-node card selector; restores the 340px contextual chart cap; normalizes Cartesian SVG text against the allocated container width; records why SVG geometry is separate from C26.
- `src/render/chart.mjs`, `src/render/nodes.mjs`: contextual Cartesian chart output sets `preserveAspectRatio="none"`; older 2.1 output remains unchanged and donuts keep their aspect ratio.
- `tests/composition.test.mjs`: exercises actual compiled card markup and rejects the old zero-match selector; checks the bounded Cartesian output, all chart examples, 9 asymmetric values, series distinctions, and data table.
- `docs/evidence/context-rollout/remediation-a/`: contains raw RED/GREEN output, a reusable compiler/probe script, separate before/after/letterbox preview HTML, and 48 browser snapshot receipts. No rule-ledger or other audit files were changed.

No content, chart values, categories, labels, data tables, links, or series were changed. The patch adds no template-specific selector or consumer CSS input. The existing 2.1 complete-output hash contract is retained.

## Verification

RED before the source correction:

```text
node --test tests/composition.test.mjs
# tests 16, pass 13, fail 3
# Card same-node selector, chart cap, and narrow-aside bounded-SVG contracts failed.
```

GREEN after correction:

```text
node --test tests/composition.test.mjs tests/layout.test.mjs
# tests 23, pass 23, fail 0
# Includes all 85 pinned 2.1 complete-output hashes.
git diff --check
# exit 0
```

The configured browser MCP rendered the newly compiled pages over the project's `scripts/serve.mjs` HTTP preview. Measurements and snapshots cover `blog-index`, `news-home`, `dashboard-analytics`, `bank-product`, `hr-people`, and the narrow asymmetric aside at 320, 390, and 1440px. The `cap-*` receipts are a controlled comparison with the 340px cap and default SVG aspect ratio; `before-*` records the prior `max-height:none` interim state; `after-*` records this correction. Each receipt records selector counts, card/media dimensions, SVG and plot boxes, computed/rendered label size, chart height, document height, and horizontal overflow.

Receipt directory: `docs/evidence/context-rollout/remediation-a/receipts/`. Representative browser screenshots are in this Run's outbox: the two cards at 390px, all three chart pages at 1440px, and the aside counterexample at 320px, before and after. A full-page dashboard pair also shows the 1254px SVG and the 340px letterbox control.

## Historical first attempt — retained for provenance

The previous partial report had a 390px card measurement, deployed-page chart snapshots, and the source-derived 836px height prediction. It stated that the post-change browser render was unverified because `browser_navigate(file://...)` returned `Access to "file:" protocol is blocked`. That limitation is superseded by the approved HTTP preview in this follow-up; the old error and status are retained here as history, not as the current result. The earlier Run's outbox is inaccessible in this Run and its files were not re-read.

Full site regeneration, full audit, full test suite, commit, push, and deployment were not run, per scope.

## Preview cleanup

- `mcp__ttakkari_browser__browser_close`: returned “No open tabs.”
- Owned `PORT=4173 node scripts/serve.mjs` process: sent Ctrl-C through its session; process session ended with exit code 130.
