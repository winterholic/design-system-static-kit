import test from 'node:test';
import assert from 'node:assert/strict';
import {compile} from '../src/compiler.mjs';
import {createBlueprint} from '../src/catalog.mjs';

test('centered and masthead actions share a primary row with the brand and keep navigation separate', () => {
  for (const id of ['blog-index','beauty-detail','wine-list','news-home','museum-home']) {
    const b=createBlueprint(id), before=structuredClone(b), r=compile(b);
    assert.equal(r.manifest.design.chrome?.policy, 'chrome-row-1', id);
    assert.match(r.html, /class="kit-header-primary">[\s\S]*?kit-brand[\s\S]*?kit-header-action[\s\S]*?<\/div><nav class="kit-nav"/, id);
    assert.match(r.css, /container:chrome\/inline-size/);
    assert.match(r.css, /@container chrome \(min-width:720px\)/);
    assert.deepEqual(b,before);
  }
});

test('legacy chrome and other shell structures retain their renderer', () => {
  for (const id of ['blog-index','news-home','dashboard-overview','login']) {
    const b=createBlueprint(id);b.catalogVersion='2.1.0';
    assert.ok(!compile(b).html.includes('kit-header-primary'));
  }
  assert.ok(!compile(createBlueprint('dashboard-overview')).html.includes('kit-header-primary'));
});
