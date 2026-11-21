// DOM 측정: 캡처에서 눈으로 의심한 항목을 수치로 확인한다. 출력: probe-results.json
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const OUT = '/tmp/expr/out/', res = {};
const browser = await chromium.launch();
async function open(id, w = 1280) { const ctx = await browser.newContext({viewport: {width: w, height: 800}}); const page = await ctx.newPage(); await page.goto(pathToFileURL(OUT + id + '/index.html').href); return page; }
const css = (page, sel, props) => page.evaluate(([s, p]) => { const el = document.querySelector(s); if (!el) return null; const c = getComputedStyle(el), r = el.getBoundingClientRect(); return {...Object.fromEntries(p.map(k => [k, c[k]])), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY)}; }, [sel, props]);
// 1) 05: 구매 박스 sticky 여부
let page = await open('05-image-product');
res.sticky05 = await page.evaluate(() => [...document.querySelectorAll('[class*=aside] *, .kit-aside *')].filter(e => getComputedStyle(e).position === 'sticky').map(e => e.className));
res.aside05 = await page.evaluate(() => { const a = document.querySelector('.kit-aside'); return a ? {cls: a.className, attrs: [...a.attributes].map(x => x.name + '=' + x.value), kids: [...a.children].map(c => c.className + ' ' + getComputedStyle(c).position + ' w=' + Math.round(c.getBoundingClientRect().width))} : null; });
// 2) P03 직후 섹션 위 여백: 07·14(tint 바탕) 대 01(plain)
for (const id of ['07-event-conference', '14-campaign-poster', '03-dense-dashboard-landing', '09-brutalist-zine']) {
  page = await open(id);
  res['afterHero_' + id] = await page.evaluate(() => { const h = document.querySelector('.kit-hero'); const s = h?.nextElementSibling; if (!s) return null; const c = getComputedStyle(s), b = getComputedStyle(document.body); return {sibling: s.tagName + '.' + s.className, paddingTop: c.paddingTop, background: c.backgroundColor, bodyBg: b.backgroundColor, gapToHero: Math.round(s.getBoundingClientRect().top - h.getBoundingClientRect().bottom), headingTopFromSection: (() => { const t = s.querySelector('h2'); return t ? Math.round(t.getBoundingClientRect().top - s.getBoundingClientRect().top) : null; })()}; });
}
// 3) 히어로 제목 크기와 밴드 여백(밀도별)
for (const id of ['01-magazine', '03-dense-dashboard-landing', '07-event-conference', '09-brutalist-zine', '11-luxe-brand', '14-campaign-poster']) {
  page = await open(id);
  res['sizes_' + id] = await page.evaluate(() => { const h2 = document.querySelector('.kit-hero h2') || document.querySelector('h1'); const sec = [...document.querySelectorAll('.kit-section')][0]; return {heroH2: h2 && getComputedStyle(h2).fontSize, h1: getComputedStyle(document.querySelector('h1')).fontSize, sectionPad: sec && getComputedStyle(sec).paddingTop, heroLine: h2 && getComputedStyle(h2).fontFamily.slice(0, 40)}; });
}
// 4) 11: 가운데 머리말 아래 본문 정렬(V04 현상)
page = await open('11-luxe-brand');
res.align11 = await page.evaluate(() => { const s = [...document.querySelectorAll('.kit-section')].find(x => x.querySelector('.kit-prose')); return s ? {heading: getComputedStyle(s.querySelector('h2')).textAlign, prose: getComputedStyle(s.querySelector('.kit-prose')).textAlign, proseLeft: Math.round(s.querySelector('.kit-prose').getBoundingClientRect().left), headingCenter: Math.round((s.querySelector('h2').getBoundingClientRect().left + s.querySelector('h2').getBoundingClientRect().right) / 2)} : null; });
// 5) 13: device 목업 가장자리 잘림
page = await open('13-app-landing-dark');
res.device13 = await page.evaluate(() => [...document.querySelectorAll('.kit-section .kit-media, .kit-section svg')].slice(0, 2).map(e => { const r = e.getBoundingClientRect(); return {tag: e.tagName, cls: String(e.className.baseVal ?? e.className).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), overflow: getComputedStyle(e).overflow}; }));
res.deviceSvgViewBox13 = await page.evaluate(() => [...document.querySelectorAll('svg')].map(s => s.getAttribute('viewBox')).filter(Boolean).slice(0, 4));
// 6) 04: 추천 플랜이 더 큰가
page = await open('04-pricing-saas');
res.plans04 = await page.evaluate(() => [...document.querySelectorAll('.kit-plan')].map(p => ({featured: p.hasAttribute('data-featured') || /featured/.test(p.className), w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height), top: Math.round(p.getBoundingClientRect().top + scrollY)})));
// 7) 01: 히어로 열 비율과 카드 폭
page = await open('01-magazine');
res.hero01 = await page.evaluate(() => { const h = document.querySelector('.kit-hero'); return {cols: getComputedStyle(h).gridTemplateColumns, copy: Math.round(h.querySelector('.kit-hero-copy').getBoundingClientRect().width), visual: Math.round(h.querySelector('.kit-hero-visual').getBoundingClientRect().width)}; });
res.cards01 = await page.evaluate(() => [...document.querySelectorAll('.kit-card')].map(c => Math.round(c.getBoundingClientRect().width)));
// 8) 02: split 비율
page = await open('02-asym-portfolio');
res.split02 = await page.evaluate(() => [...document.querySelectorAll('.kit-split')].map(s => ({cols: getComputedStyle(s).gridTemplateColumns})));
res.gallery02 = await page.evaluate(() => { const g = document.querySelector('.kit-gallery'); return g ? {layout: g.getAttribute('data-layout'), children: g.children.length, cols: getComputedStyle(g).gridTemplateColumns} : null; });
// 9) 10: 속성 목록의 열 구조
page = await open('10-swiss-type');
res.props10 = await css(page, '.kit-properties', ['display', 'gridTemplateColumns']);
// 10) 06: aside 구조
page = await open('06-docs-reference');
res.aside06 = await css(page, '.kit-aside', ['display', 'gridTemplateColumns']);
// 11) 12: 본문 글자 크기
page = await open('12-news-home');
res.type12 = await page.evaluate(() => ({card: getComputedStyle(document.querySelector('.kit-card p')).fontSize, list: getComputedStyle(document.querySelector('.kit-list li, .kit-list')).fontSize}));
await writeFile('probe-results.json', JSON.stringify(res, null, 2) + '\n');
await browser.close();
console.log(JSON.stringify(res, null, 1));
