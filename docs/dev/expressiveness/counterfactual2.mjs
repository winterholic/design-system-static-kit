// 반사실 실험 2: 금지의 전제를 직접 재는 표적 측정(기준선과 금지 조합 비교). 결과: counterfactual2-results.json
import {chromium} from 'playwright';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {compile as nb} from '/tmp/expr/nb/src/compiler.mjs';
const load = async id => JSON.parse(await readFile(new URL(`./cases/${id}.json`, import.meta.url), 'utf8'));
const browser = await chromium.launch(); const res = {};
async function measure(name, b, w, fn) {
  await writeFile(`/tmp/expr/cf2-${name}.html`, nb(b).html);
  const ctx = await browser.newContext({viewport: {width: w, height: 900}}); const page = await ctx.newPage();
  await page.goto(pathToFileURL(`/tmp/expr/cf2-${name}.html`).href); await page.waitForTimeout(250);
  const r = await page.evaluate(fn); await ctx.close(); return r;
}
// X01: 하단 탭바(dock) 터치 타깃 높이, compact 대 comfortable
const dock = async d => { const b = await load('05-image-product'); b.shell = 'dock'; b.density = d; b.chrome.nav = b.chrome.nav.map((n, i) => ({...n, icon: ['bag', 'tag', 'star'][i]})); return b; };
for (const d of ['compact', 'comfortable']) for (const w of [390, 1280]) res[`X01 ${d} ${w}`] = await measure('x01', await dock(d), w, () => ({navLinkH: [...document.querySelectorAll('.kit-nav a')].map(a => Math.round(a.getBoundingClientRect().height)), navLinkW: [...document.querySelectorAll('.kit-nav a')].map(a => Math.round(a.getBoundingClientRect().width))}));
// X02: 760 폭 + 사이드바에서 본문 폭
for (const wd of ['narrow', 'standard']) { const b = await load('06-docs-reference'); b.width = wd; res[`X02 ${wd} 1280`] = await measure('x02', b, 1280, () => { const m = document.querySelector('.kit-aside-main'), s = document.querySelector('.kit-aside-side'), nav = document.querySelector('.kit-nav'); const r = e => e && Math.round(e.getBoundingClientRect().width); return {navCol: r(nav), asideMain: r(m), asideSide: r(s), prose: r(document.querySelector('.kit-prose p')), content: r(document.querySelector('.kit-section-inner'))}; }); }
// X03: 1600px 폭 + 읽기 셸에서 본문 한 줄 글자 수(실제 줄 수로 추정)
for (const wd of ['wide', 'full']) { const b = await load('10-swiss-type'); b.shell = 'masthead'; b.width = wd; res[`X03 ${wd} 1920`] = await measure('x03', b, 1920, () => { const p = document.querySelector('.kit-prose p'); const cs = getComputedStyle(p), r = p.getBoundingClientRect(); const ch = (() => { const s = document.createElement('span'); s.textContent = '가나다라마바사아자차'; s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + cs.font; document.body.appendChild(s); const w = s.getBoundingClientRect().width / 10; s.remove(); return w; })(); return {proseW: Math.round(r.width), maxWidth: cs.maxWidth, glyphW: +ch.toFixed(1), hangulPerLine: Math.round(r.width / ch), content: Math.round(document.querySelector('.kit-section-inner, .kit-page-header').getBoundingClientRect().width)}; }); }
// X06: 모노스페이스 + dramatic, 긴 제목이 좁은 화면에서 넘치는가(페이지 제목과 섹션 제목)
for (const sc of ['balanced', 'dramatic']) { const b = await load('06-docs-reference'); b.typography = 'terminal'; b.scale = sc; b.tree.children[0].title = 'Configuration reference for production'; b.tree.children[2] = {...b.tree.children[2], title: 'Configuration reference for production'}; res[`X06 ${sc} 390`] = await measure('x06', b, 390, () => { const de = document.documentElement; const h = [...document.querySelectorAll('h1,h2')].map(e => ({t: e.textContent.slice(0, 18), fs: getComputedStyle(e).fontSize, over: e.scrollWidth > e.clientWidth + 1, right: Math.round(e.getBoundingClientRect().right)})); return {overflowX: de.scrollWidth - de.clientWidth, h}; }); }
// X07: 반경 28 + compact 안쪽 여백(카드·지표 안쪽 여백 대 반경)
for (const [rad, den] of [['bubble', 'compact'], ['round', 'compact'], ['bubble', 'comfortable']]) { const b = await load('07-event-conference'); b.radius = rad; b.density = den; res[`X07 ${rad}/${den}`] = await measure('x07', b, 1280, () => { const e = document.querySelector('.kit-plan, .kit-card, .kit-team-card, .kit-metric') ?? document.querySelector('[class*=plan]'); const c = getComputedStyle(e); return {el: e.className.slice(0, 20), pad: c.paddingLeft + '/' + c.paddingTop, radius: c.borderTopLeftRadius}; }); }
// X09: 가는 선 1.5px 아이콘 대 기본 2px: 실제 CSS 변수와 아이콘 크기
for (const [ic, den] of [['line-fine', 'compact'], ['line', 'compact']]) { const b = await load('06-docs-reference'); b.icon = ic; b.density = den; res[`X09 ${ic}/${den}`] = await measure('x09', b, 1280, () => { const s = document.querySelector('.kit-nav svg'); const r = s.getBoundingClientRect(); return {size: Math.round(r.width), cssVarSw: getComputedStyle(document.body).getPropertyValue('--kit-icon-sw') || getComputedStyle(document.documentElement).getPropertyValue('--kit-icon-sw'), strokeAttr: s.getAttribute('stroke-width'), strokeComputed: getComputedStyle(s).strokeWidth}; }); }
await writeFile(new URL('./counterfactual2-results.json', import.meta.url), JSON.stringify(res, null, 2) + '\n');
await browser.close(); console.log(JSON.stringify(res));
