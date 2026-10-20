import {test} from 'node:test';
import assert from 'node:assert/strict';
import {templateList, layoutOptionsOf, themes, palettes} from '../src/catalog.mjs';
import {enumerateCombos, findCombo, comboId, renderCombo, facets, filterCombos, shuffled, normalizeView, viewQuery, viewFromQuery, flagsToText, comboTitle, EMPTY_VIEW} from '../src/combos.mjs';

test('combos: the list is exactly the product of every template\'s layout slots (the audit\'s 4,102)', () => {
  const expected = templateList.reduce((sum, t) => sum + layoutOptionsOf(t.id).reduce((n, s) => n * (s.options.length + 1), 1), 0);
  const all = enumerateCombos();
  assert.equal(all.length, expected);
  assert.equal(all.length, 4102, 'catalog 2.1.0 has 4,102 template×layout compositions; update docs/round6.md with the new count if this changes');
  assert.deepEqual(all.map(c => c.n), all.map((_, i) => i + 1));
  assert.equal(new Set(all.map(c => c.id)).size, all.length, 'ids are unique');
  assert.equal(enumerateCombos(), all, 'enumeration is cached');
});

test('combos: ids are stable text and round-trip', () => {
  assert.equal(comboId('saas-landing'), 'saas-landing');
  assert.equal(comboId('saas-landing', {cards: 'outline', hero: 'split'}), 'saas-landing~hero:split~cards:outline', 'slot order is canonical, not insertion order');
  assert.equal(comboId('saas-landing', {hero: 'default'}), 'saas-landing');
  for (const c of enumerateCombos()) assert.equal(findCombo(c.id), c);
  assert.equal(findCombo('nope'), null);
  assert.equal(findCombo(null), null);
  assert.equal(findCombo('saas-landing~hero:nonexistent'), null);
});

test('combos: sameAs only points backwards at a combo of the same template', () => {
  const all = enumerateCombos(), same = all.filter(c => c.sameAs);
  assert.ok(same.length > 0 && same.length < all.length / 10);
  for (const c of same) { const first = all[c.sameAs - 1]; assert.ok(c.sameAs < c.n && first.templateId === c.templateId && !first.sameAs, c.id); }
});

test('combos: every one of the 4,102 compiles and validates in its default view and under rotating theme, variant, palette and mode', () => {
  const themeIds = Object.keys(themes), paletteIds = Object.keys(palettes), failures = [];
  enumerateCombos().forEach((c, i) => {
    const theme = themes[themeIds[(i * 7) % themeIds.length]], variant = theme.variants[i % theme.variants.length];
    const views = [EMPTY_VIEW, {mode: i % 2 ? 'dark' : 'light'}, {theme: theme.id, tv: variant.id, pal: paletteIds[(i * 13) % paletteIds.length], mode: i % 3 ? 'dark' : 'light'}];
    for (const view of views) { const r = renderCombo(c, view); if (!r.ok) failures.push(c.id + ' ' + JSON.stringify(view) + ': ' + r.error); else if (!r.html.startsWith('<!doctype html>')) failures.push(c.id + ' not a document'); }
  });
  assert.deepEqual(failures.slice(0, 5), []);
});

test('combos: the view only changes theme, palette and mode — the layout choice always survives', () => {
  const c = enumerateCombos().find(x => x.changed >= 2), themeB = Object.keys(themes).find(id => id !== themes[c.templateId ? templateList.find(t => t.id === c.templateId).theme : ''].id);
  const base = renderCombo(c), dark = renderCombo(c, {mode: 'dark'}), themed = renderCombo(c, {theme: themeB});
  assert.equal(base.blueprint.mode !== 'dark' ? dark.blueprint.mode : 'dark', 'dark');
  assert.equal(JSON.stringify(base.blueprint.tree), JSON.stringify(dark.blueprint.tree));
  assert.equal(JSON.stringify(base.blueprint.tree), JSON.stringify(themed.blueprint.tree));
  assert.equal(themed.blueprint.theme, themeB);
  assert.notEqual(base.html, themed.html);
});

test('combos: view normalisation drops unknown or inconsistent values and round-trips through the URL', () => {
  assert.deepEqual(normalizeView({theme: 'nope', tv: 'x', pal: 'nope', mode: 'blue'}), {theme: null, tv: null, pal: null, mode: null});
  assert.equal(normalizeView({tv: 'something'}).tv, null, 'a theme variant needs its theme');
  const theme = Object.values(themes).find(t => t.variants.length), pal = Object.keys(palettes)[3];
  const view = {theme: theme.id, tv: theme.variants[0].id, pal, mode: 'dark'};
  assert.deepEqual(viewFromQuery(new URLSearchParams(viewQuery('saas-landing', view))), view);
  assert.equal(viewQuery('saas-landing'), 'c=saas-landing');
});

test('combos: facets count every option, and slot filters partition the list', () => {
  const all = enumerateCombos(), f = facets(all), hero = f.find(x => x.id === 'hero');
  assert.ok(hero.options.length >= 4);
  const byOption = hero.options.map(o => filterCombos({slots: {hero: o.id}}).length);
  assert.deepEqual(byOption, hero.options.map(o => o.count));
  assert.equal(byOption.reduce((a, b) => a + b, 0) + filterCombos({slots: {hero: 'default'}}).length, all.length);
});

test('combos: search, type, template, same-screen and sort filters', () => {
  const all = enumerateCombos();
  assert.equal(filterCombos({}).length, all.length);
  assert.equal(filterCombos({query: '#0001'}).length, 1);
  assert.equal(filterCombos({query: '0001'})[0].n, 1);
  const found = new Set(filterCombos({query: '히어로 가운데'}).map(c => c.id));
  assert.ok(filterCombos({slots: {hero: 'centered'}}).every(c => found.has(c.id)), 'every word may match any slot, so hero=centered combos are a subset of the result');
  assert.ok(found.size < all.length / 2);
  assert.ok(filterCombos({query: 'SAAS-LANDING'}).length > 0, 'case-insensitive id search');
  assert.equal(filterCombos({query: 'zzzz-no-such'}).length, 0);
  assert.ok(filterCombos({pageType: 'landing'}).every(c => c.pageType === 'landing'));
  const one = templateList[0].id; assert.ok(filterCombos({template: one}).every(c => c.templateId === one));
  assert.equal(filterCombos({hideSame: true}).length, all.filter(c => !c.sameAs).length);
  assert.equal(filterCombos({only: new Set([all[5].id, all[9].id])}).length, 2);
  const changed = filterCombos({sort: 'changed'}); assert.ok(changed[0].changed >= changed.at(-1).changed && changed[0].changed >= 4);
  assert.deepEqual(filterCombos({sort: 'shuffle', seed: 7}).map(c => c.n), filterCombos({sort: 'shuffle', seed: 7}).map(c => c.n));
  assert.notDeepEqual(filterCombos({sort: 'shuffle', seed: 7}).slice(0, 20).map(c => c.n), filterCombos({sort: 'shuffle', seed: 8}).slice(0, 20).map(c => c.n));
});

test('combos: shuffled is a permutation and never mutates the input', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], copy = [...src], out = shuffled(src, 3);
  assert.deepEqual(src, copy); assert.deepEqual([...out].sort((a, b) => a - b), src);
});

test('combos: the flag export names the combo, the view, the note and a re-openable URL', () => {
  const c = enumerateCombos().find(x => x.changed >= 2), themeB = Object.keys(themes)[2];
  const text = flagsToText([{c: c.id, theme: themeB, tv: null, pal: null, mode: 'dark', note: '표가 넘침'}, {c: 'gone~x:y'}], {origin: 'https://example.test/', catalogVersion: '2.1.0'});
  assert.match(text, /^# 이상한 조합 2건 \(카탈로그 2\.1\.0\)/);
  assert.ok(text.includes('#' + String(c.n).padStart(4, '0') + ' ' + c.id));
  assert.ok(text.includes(comboTitle(c)) && text.includes('다크') && text.includes('메모: 표가 넘침'));
  assert.ok(text.includes('https://example.test/combos/?c=' + c.id + '&theme=' + themeB + '&mode=dark'));
  assert.ok(text.includes('목록에 없는 id'));
});
