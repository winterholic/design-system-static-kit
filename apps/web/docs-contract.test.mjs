import test from 'node:test';
import assert from 'node:assert/strict';
import {DOCS_PAGES, resolveDocPage, validateDocsLinks} from './lib/docs.mjs';

test('public Docs catalog exposes the required user topics without development diagnostics', () => {
  const slugs = DOCS_PAGES.map(page => page.slug);
  for (const slug of ['getting-started', 'blueprint', 'components', 'composition', 'tokens-themes', 'cli', 'rest', 'mcp', 'limitations']) {
    assert.ok(slugs.includes(slug), `missing /docs/${slug}`);
  }
  assert.ok(DOCS_PAGES.every(page => page.title && page.description));
  assert.ok(!slugs.some(slug => /diagnos|experiment|spike|qa/i.test(slug)));
});

test('docs routing resolves only explicit public pages and keeps static HTML outside the app catalog', () => {
  assert.equal(resolveDocPage(['getting-started']).slug, 'getting-started');
  assert.equal(resolveDocPage(['diagnosis-round6']), null);
  assert.equal(resolveDocPage(['does-not-exist']), null);
  assert.equal(resolveDocPage(['design.html']), null);
});

test('all local links in the Docs catalog resolve to an owned page or existing integration route', () => {
  assert.deepEqual(validateDocsLinks(), []);
});
