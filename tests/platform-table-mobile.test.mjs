import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_FAMILIES} from '../src/platform/families/table.mjs';

test('business tables keep word-wrapped cells readable inside a narrow-screen scroll region', () => {
  const family = TABLE_FAMILIES.find(item => item.id === 'purpose:table.business');
  const css = family.css + family.sharedCss;

  assert.match(css, /@media\s*\(max-width:\s*480px\)/, 'the mobile table rule covers 480px and below');
  assert.match(css, /\.pf-table-business[^{}]*\.kit-table-scroll[^{}]*table\s*\{[^}]*min-width:\s*46rem/, 'the business table scrolls at a readable minimum width');
  assert.match(css, /\.pf-table-business[^{}]*td\[data-column-wrap=words\]\s*\{[^}]*min-width:\s*16rem[^}]*overflow-wrap:\s*normal/, 'long text columns cannot collapse into syllable-wide lines');
});
