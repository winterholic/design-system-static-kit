import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateBlocks, blockOf} from './platform-style-doc.mjs';
import {themes} from '../src/catalog/index.mjs';

const doc = readFileSync(new URL('../docs/platform/style-contexts.md', import.meta.url), 'utf8');

test('the generated tables in docs/platform/style-contexts.md match the data', () => {
  const blocks = generateBlocks();
  assert.ok(Object.keys(blocks).length >= 9);
  for (const [name, text] of Object.entries(blocks)) assert.equal(blockOf(doc, name), text, `block ${name} is stale: run node tests/platform-style-doc.mjs --write`);
});

test('the theme table has one row for each of the 54 themes in every theme table', () => {
  for (const name of ['contexts-a', 'contexts-b', 'contexts-c']) {
    const rows = blockOf(doc, name).split('\n').slice(2);
    assert.equal(rows.length, 54, name);
    for (const id of Object.keys(themes)) assert.ok(rows.some(r => r.startsWith(`| \`${id}\``)), `${name}: ${id}`);
  }
});
