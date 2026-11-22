import test from 'node:test';
import assert from 'node:assert/strict';
import {DOCS_PAGES, DOCS_REDIRECTS, INTEGRATION_PAGES, resolveDocPage, validateDocsLinks} from './lib/docs.mjs';

test('public Docs catalog exposes the required user topics without development diagnostics', () => {
  const slugs = DOCS_PAGES.map(page => page.slug);
  for (const slug of ['getting-started', 'principles', 'blueprint', 'components', 'composition', 'tokens-themes', 'limitations']) {
    assert.ok(slugs.includes(slug), `missing docs page ${slug}`);
  }
  assert.deepEqual(INTEGRATION_PAGES.map(page => page.slug), ['cli', 'rest-api', 'mcp']);
  assert.ok(DOCS_PAGES.every(page => page.title && page.description));
  assert.ok(!slugs.some(slug => /diagnos|experiment|spike|qa/i.test(slug)));
});

test('docs routing resolves only explicit public pages and keeps static HTML outside the app catalog', () => {
  assert.equal(resolveDocPage('guide', 'getting-started').href, '/docs/guide/getting-started');
  assert.equal(resolveDocPage('core', 'blueprint').href, '/docs/core/blueprint');
  assert.equal(resolveDocPage('core', 'getting-started'), null, '가이드 문서를 core 아래에서 열 수 없다');
  assert.equal(resolveDocPage('guide', 'diagnosis-round6'), null);
  assert.equal(resolveDocPage('guide', 'does-not-exist'), null);
  assert.equal(resolveDocPage('core', 'design.html'), null);
});

test('all local links in the Docs catalog resolve to an owned page or existing integration route', () => {
  assert.deepEqual(validateDocsLinks(), []);
});

test('옛 주소(/integrations/*, /docs/<slug>)는 모두 새 Docs 주소로 보존되고 새 주소는 서로 겹치지 않는다', () => {
  const from = DOCS_REDIRECTS.map(r => r.from);
  assert.equal(new Set(from).size, from.length, '같은 옛 주소가 두 번 선언됨');
  for (const old of ['/integrations', '/integrations/cli', '/integrations/rest-api', '/integrations/mcp', '/docs/getting-started', '/docs/blueprint', '/docs/components', '/docs/composition', '/docs/tokens-themes', '/docs/limitations', '/docs/cli', '/docs/rest', '/docs/mcp']) {
    assert.ok(from.includes(old), `${old} 리다이렉트 없음`);
  }
  for (const {from: old, to} of DOCS_REDIRECTS) {
    assert.match(to, /^\/docs\//, `${old} → ${to}`);
    assert.notEqual(old, to);
  }
  // 새 주소로 간 옛 주소가 다시 다른 옛 주소로 이어지는 연쇄가 없어야 한다.
  assert.ok(DOCS_REDIRECTS.every(({to}) => !from.includes(to)));
});
