import {test} from '@playwright/test';
import {createBlueprint, migrateBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
const hero = {type: 'hero', variant: 'split', title: '히어로 제목', body: '본문 한 줄', visual: 'photo', motif: 'coast'};
const prose = {type: 'prose', title: '글', body: '본문입니다. 본문입니다.'};
const sec = extra => ({type: 'section', title: '구역', children: [prose], ...extra});
function make(children, patch) {
  const b = migrateBlueprint(createBlueprint('saas-landing'), '2.5.0');
  b.chrome.nav = b.chrome.nav.map(n => ({...n, href: '#main'}));
  b.tree.children = [{type: 'page-header', title: '제목'}, ...children];
  return Object.assign(b, patch);
}
const variants = {
  generalPlain: make([sec({surface: 'plain', space: 'tight'}), sec({surface: 'plain'}), sec({surface: 'plain', space: 'loose'})], {pageType: 'general', density: 'spacious'}),
  generalAuto: make([sec({space: 'tight'}), sec(), sec({space: 'loose'})], {pageType: 'general', density: 'spacious'}),
  landingHero: make([hero, sec({space: 'tight'}), sec(), sec({space: 'loose'})], {pageType: 'landing', density: 'spacious'}),
  landingHeroPlain: make([hero, sec({surface: 'plain', space: 'tight'}), sec({surface: 'plain'}), sec({surface: 'plain', space: 'loose'})], {pageType: 'landing', density: 'spacious'}),
  landingHeroSpacer: make([hero, sec({surface: 'plain'}), sec({surface: 'plain', space: 'tight'}), sec({surface: 'plain'}), sec({surface: 'plain', space: 'loose'})], {pageType: 'landing', density: 'spacious'}),
};
for (const [name, bp] of Object.entries(variants)) {
  test('dbg ' + name, async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    let html;
    try { html = compile(bp).html; } catch (e) { console.log('DBG', name, 'COMPILE FAIL', e.message); return; }
    await page.setContent(html, {waitUntil: 'load'});
    const rows = await page.locator('.kit-main>.kit-section').evaluateAll(els => els.map(e => { const c = getComputedStyle(e); return {space: e.dataset.space ?? '-', surface: e.dataset.surface, h: e.getBoundingClientRect().height, pt: c.paddingTop, pb: c.paddingBottom, mt: c.marginTop, mb: c.marginBottom}; }));
    const vars = await page.evaluate(() => { const c = getComputedStyle(document.documentElement); return {band: c.getPropertyValue('--kit-band'), bandL: c.getPropertyValue('--kit-sp-band-l'), bandM: c.getPropertyValue('--kit-sp-band-m')}; });
    console.log('DBG', name, JSON.stringify(vars), JSON.stringify(rows));
  });
}
