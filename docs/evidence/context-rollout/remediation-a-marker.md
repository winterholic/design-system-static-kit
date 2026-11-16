# R14-A marker geometry correction

**Scope:** Correct the line chart's circle, square, and diamond marker distortion in the shared chart path. This is a follow-up to R14-A, not completion of the broader R14 work.

## Root cause

The contextual Cartesian chart path uses `preserveAspectRatio="none"` so a capped SVG fills its allocated width. At a 602×340px SVG, the viewBox's horizontal and vertical scale factors differ. Text already receives a horizontal compensation, but the three `.ch-m` marker shapes did not. An independent render measured the circle at 11.7×9.9px (ratio 1.18); a new actual-SVG probe measured all three marker types at ratio 1.18. Their centers remained on the SVG data coordinates, so the regression was shape-only.

## Correction

- The shared contextual Cartesian renderer wraps its SVG in `.kit-chart-plot`, which uses the same flex allocation as the old SVG. That wrapper is an inline-size query container, so marker scaling reads the actual allocated SVG width even when a legend shares the chart row.
- At 510px and above, the shared chart CSS applies `scaleX(calc(510px / 100cqw))` to `.ch-m` around each marker's own center. The existing 340px height cap, full-width plot allocation, text rules, and donut geometry remain in place.
- No template-specific selectors, free consumer CSS, runtime libraries, data removal, label hiding, or source chart value changes were added. Preview-only fixtures add series to exercise all three shapes.

## RED → GREEN evidence

| Render | SVG / available width | Circle | Square | Diamond | Center error |
|---|---:|---:|---:|---:|---:|
| RED | 602×340 / 602px | 1.18 | 1.18 | 1.18 | 0px |
| GREEN | 602×340 / 602px | 1.00 | 1.00 | 1.00 | 0px |
| GREEN | 700×340 / 700px | 1.00 | 1.00 | 1.00 | 0px |

At the 509/510/511px SVG width boundary, heights were 339.33/340/340px and all three marker ratios were 1.00 with 0px center error. One text bounding box extends outside the SVG box at each of those narrow boundary widths; the SVG has `overflow:visible`, and the document had no horizontal overflow. The 509px browser capture shows that tick label visibly rendered outside the SVG bounds. At 602px the text bounding boxes were within the SVG.

The 320px aside counterexample retained its table of contents and data. Its chart area was 238×197.05px, the SVG was 238×158.66px, all three marker ratios were 1.00, and document width stayed 320px (no horizontal overflow). A screenshot and the browser accessibility snapshot still show the aside navigation.

The 340px cap and width use were rechecked in the same render: the line fixture measured 602×340px and 700×340px at wider allocated widths; a separate Cartesian SVG filled 1274px at 340px high and reached 1502px at a 1920px viewport. Those latter charts contain no marker fixture, so their evidence is width/cap only. The donut remained 200×200px with aspect ratio 1. The chart/data table stayed present. The dashboard document measured 1735px high in the marker probes (the probe panel is included); no horizontal overflow.

The first implementation experiment put `container-type` on the SVG itself. Browser render showed it reduced the SVG height to 150px, violating the height cap; that experiment was discarded. The shipped wrapper gives the query container the SVG's allocated width without changing the SVG's own sizing. A later 880px wrapper cap was also caught against the wide-plot criterion and changed to `max-width:100%`; the final render measured the wide SVG at 1274px.

Receipts bind each probe to HEAD, source SHA-256, blueprint/input SHA-256, HTTP preview URL, viewport, and chart width under [`remediation-a-marker/receipts`](remediation-a-marker/receipts/). The previous 48 receipts were not retroactively changed.

### Captures

- RED, 602px three-shape distortion: `/Volumes/Backup/ttakkari-data/outbox/2d006348-bb3a-4f53-a1f1-65d01ae64850/browser/page-2026-11-16T05-04-20-283Z.png`
- GREEN, 602px markers plus 1274px chart and 200px donut: `/Volumes/Backup/ttakkari-data/outbox/2d006348-bb3a-4f53-a1f1-65d01ae64850/browser/page-2026-11-16T05-06-08-529Z.png`
- GREEN, 700px three-shape line plot and 1502px wide chart: `/Volumes/Backup/ttakkari-data/outbox/2d006348-bb3a-4f53-a1f1-65d01ae64850/browser/page-2026-11-16T05-09-20-810Z.png`
- GREEN, 509px boundary with visible tick label: `/Volumes/Backup/ttakkari-data/outbox/2d006348-bb3a-4f53-a1f1-65d01ae64850/browser/page-2026-11-16T05-10-23-637Z.png`
- GREEN, 320px aside counterexample: `/Volumes/Backup/ttakkari-data/outbox/2d006348-bb3a-4f53-a1f1-65d01ae64850/browser/page-2026-11-16T05-06-24-438Z.png`

## Verification

```text
node --test tests/composition.test.mjs tests/layout.test.mjs
tests 24, pass 24, fail 0
Includes all 85 pinned 2.1 complete-output hashes.

git diff --check
exit 0
```

Whole R14 still has the previously recorded table, header, sequence, and content-asset shared causes, plus integration regression/deployment work. Those remain outside this marker-only correction.
