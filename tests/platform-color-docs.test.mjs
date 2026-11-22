import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {matrixMarkdown, previewMetricsMarkdown, BEGIN, END, METRICS_BEGIN, METRICS_END} from '../docs/platform/evidence/color/matrix.mjs';
import {previewHTML, PREVIEW} from '../docs/platform/evidence/color/build.mjs';
import {PALETTES} from '../src/platform/data/palettes.mjs';
import {SUBTOKEN_SETS} from '../src/platform/data/subtoken-sets.mjs';

const doc = readFileSync(new URL('../docs/platform/color.md', import.meta.url), 'utf8');
const block = (begin, end) => doc.slice(doc.indexOf(begin) + begin.length, doc.indexOf(end)).trim();

test('docs/platform/color.md pass/fail table and preview metrics equal the computed ones (regenerate with docs/platform/evidence/color/build.mjs)', () => {
  assert.equal(block(BEGIN, END), matrixMarkdown());
  assert.equal(block(METRICS_BEGIN, METRICS_END), previewMetricsMarkdown());
});

test('the doc names every palette and set id, and the preview evidence files exist', () => {
  for (const p of PALETTES) assert.ok(doc.includes('`' + p.id.slice('palette:'.length) + '`'), p.id);
  for (const s of SUBTOKEN_SETS) assert.ok(doc.includes('`' + s.id.slice('subtoken-set:'.length) + '`'), s.id);
  for (const name of ['sunrise-warm-4sets-light', 'sunrise-warm-4sets-dark']) {
    for (const ext of ['png', 'html']) assert.ok(statSync(new URL(`../docs/platform/evidence/color/${name}.${ext}`, import.meta.url)).size > 10000, `${name}.${ext}`);
    assert.deepEqual([...readFileSync(new URL(`../docs/platform/evidence/color/${name}.png`, import.meta.url)).subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], 'a PNG');
  }
});

test('the committed preview HTML is what the generator emits now, and it paints one palette with four sets using the same card and buttons', () => {
  for (const [mode, name] of [['light', 'sunrise-warm-4sets-light'], ['dark', 'sunrise-warm-4sets-dark']]) {
    const html = previewHTML([mode]);
    assert.equal(readFileSync(new URL(`../docs/platform/evidence/color/${name}.html`, import.meta.url), 'utf8'), html);
    assert.equal(PREVIEW.sets.length, 4);
    assert.equal(new Set([...html.matchAll(/data-pv="([a-z-]+)-(?:light|dark)"/g)].map(m => m[1])).size, 4, 'four sets');
    const cards = [...html.matchAll(/<article class="kit-ctl-card"[^>]*>/g)].map(m => m[0].replace(/id="[^"]*"/, ''));
    assert.equal(cards.length, 4); assert.equal(new Set(cards).size, 1, 'the card markup is identical in every panel');
    const buttons = [...html.matchAll(/<button class="kit-ctl-button"[^>]*>/g)].map(m => m[0]);
    assert.equal(buttons.length % 4, 0); assert.equal(new Set(buttons).size, buttons.length / 4, 'the same buttons repeat in every panel');
  }
});
