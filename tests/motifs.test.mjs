import {test} from 'node:test';
import assert from 'node:assert/strict';
import {motifs, createBlueprint, templateList} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {motifNames, motifArt} from '../src/render/motifs.mjs';
import {mediaArt} from '../src/render/art.mjs';

const page = (children, extra = {}) => ({...createBlueprint('portfolio-grid'), pageType: 'general', ...extra, tree: {type: 'page', children: [{type: 'page-header', title: '모티프'}, ...children]}});
const media = (motif, kind = 'photo', ratio = '4:3') => ({type: 'media', kind, ratio, alt: '설명', motif});

test('catalog motif enum and drawn motifs are the same list (no value without a picture, no picture without a value)', () => {
  assert.deepEqual([...motifs].sort(), [...motifNames].sort());
});

test('every motif draws for every ratio from token classes only: no hard-coded colors, no external references', () => {
  for (const m of motifs) for (const r of ['16:9', '4:3', '1:1', '3:4', '21:9']) {
    const svg = mediaArt('photo', r, 'geometric', 'x', 2, {motif: m, id: 'g9'});
    assert.match(svg, /^<svg class="kit-art"/, m);
    assert.ok(svg.length > 400, `${m} ${r} draws something`);
    assert.doesNotMatch(svg, /(fill|stroke|stop-color)="#[0-9a-fA-F]{3,8}"/, `${m} uses a literal color`);
    assert.doesNotMatch(svg, /https?:|<image|href=/, `${m} references an external resource`);
    assert.doesNotMatch(svg, /NaN|undefined/, `${m} ${r} has an invalid number`);
  }
  assert.equal(motifArt('nope', 320, 240, 'g'), null);
});

test('gradient ids stay unique on a page that repeats the same motif', () => {
  const b = page([{type: 'grid', columns: 'three', children: ['lamp', 'lamp', 'lamp'].map(m => media(m))}, {type: 'gallery', items: ['coast', 'coast', 'interior'].map(m => ({kind: 'photo', alt: '풍경', motif: m}))}]);
  const html = compile(b).html;
  const ids = [...html.matchAll(/ id="(g\d+[a-z]?)"/g)].map(x => x[1]);
  assert.ok(ids.length >= 12, 'gradients present: ' + ids.length);
  assert.equal(new Set(ids).size, ids.length, 'duplicate svg ids');
  assert.equal(compile(b).html, html, 'deterministic output');
});

test('motif is only valid on photo slots, and only with catalog values', () => {
  const bad = (node, code, path) => { const r = validateBlueprint(page([node])); assert.ok(r.errors.some(e => e.code === code && (!path || e.path.includes(path))), JSON.stringify(r.errors)); };
  bad(media('lamp', 'chart'), 'VARIANT_REQUIRES', 'motif');
  bad(media('not-a-motif'), 'ENUM', 'motif');
  bad({type: 'gallery', items: [{kind: 'photo', alt: 'a', motif: 'lamp'}, {kind: 'chart', alt: 'b', motif: 'lamp'}, {kind: 'photo', alt: 'c'}]}, 'VARIANT_REQUIRES', 'items[1].motif');
  bad({type: 'card', title: '카드', body: '본문', motif: 'lamp'}, 'VARIANT_REQUIRES', 'motif');
  bad({type: 'card', variant: 'media', visual: 'chart', title: '카드', body: '본문', motif: 'lamp'}, 'VARIANT_REQUIRES', 'motif');
  const hero = createBlueprint('cafe-home'); hero.tree.children[1].visual = 'chart';
  assert.ok(validateBlueprint(hero).errors.some(e => e.code === 'VARIANT_REQUIRES' && e.path.endsWith('.motif')));
});

test('product card fields: listPrice needs price, reviews need rating, discount is computed not authored', () => {
  const card = extra => ({type: 'card', variant: 'media', visual: 'photo', motif: 'lamp', ratio: '1:1', title: '램프', body: '설명', ...extra});
  const bad = (extra, path) => assert.ok(validateBlueprint(page([card(extra)])).errors.some(e => e.code === 'VARIANT_REQUIRES' && e.path.endsWith(path)));
  bad({listPrice: '49,000원'}, '.listPrice');
  bad({reviews: '120'}, '.reviews');
  const html = compile(page([card({price: '39,000원', listPrice: '49,000원', rating: '4.8', reviews: '1,204'})])).html;
  assert.match(html, /kit-discount">20%/);
  assert.match(html, /data-product="yes"/);
  assert.doesNotMatch(compile(page([card({price: '49,000원', listPrice: '39,000원'})])).html, /<span class="kit-discount">/, 'no discount when the list price is lower');
});

test('every template still ships alt text for each picture it draws and a unique id per svg gradient', () => {
  for (const t of templateList) {
    const html = compile(createBlueprint(t.id)).html;
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(x => x[1]);
    assert.equal(new Set(ids).size, ids.length, t.id + ' has duplicate ids');
    for (const svg of html.matchAll(/<svg class="kit-art"[^>]*>/g)) assert.match(svg[0], /aria-label="[^"]+"|aria-hidden="true"/, t.id + ' picture without a name');
  }
});

test('summary thumbnail and gallery showcase render their parts', () => {
  const html = compile(page([{type: 'summary', title: '주문', thumb: {motif: 'mug', name: '머그컵', detail: '화이트 · 1개'}, items: [{label: '상품', value: '1원'}], total: {label: '합계', value: '1원'}}, {type: 'gallery', layout: 'showcase', items: ['mug', 'mug', 'mug'].map(m => ({kind: 'photo', motif: m, alt: '컵'}))}])).html;
  assert.match(html, /kit-summary-line/);
  assert.match(html, /data-layout="showcase" data-count="3"/);
});
