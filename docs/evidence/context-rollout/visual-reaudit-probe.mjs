// Spot measurements that back the causes named in visual-reaudit.md. Read-only against production.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base = 'https://design-system-static-kit.vercel.app/examples/';
const browser = await chromium.launch();
const out = {};
async function open(name, width) {
  const ctx = await browser.newContext({viewport: {width, height: width === 1440 ? 900 : 844}, isMobile: width === 390});
  const page = await ctx.newPage(); await page.goto(base + name + '/', {waitUntil: 'networkidle'});
  return {page, ctx};
}
const box = `(e)=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left)}}`;
for (const [key, name, width, expr] of [
  ['cardMedia390.blog-index', 'blog-index', 390, `(()=>{const m=document.querySelector('.kit-card[data-variant=horizontal] .kit-card-media');const c=m.closest('.kit-card');const b=${box};return {media:b(m),card:b(c),variant:c.dataset.variant,mediaWidthCss:getComputedStyle(m).width}})()`],
  ['cardMedia390.news-home', 'news-home', 390, `(()=>{const m=document.querySelector('.kit-card[data-variant=horizontal] .kit-card-media');const c=m.closest('.kit-card');const b=${box};return {media:b(m),card:b(c)}})()`],
  ['chart1440.dashboard-analytics', 'dashboard-analytics', 1440, `[...document.querySelectorAll('.kit-chart')].map(f=>{const s=f.querySelector('svg');const b=${box};return {kind:f.dataset.kind,fig:b(f),svg:b(s)}})`],
  ['chart1440.hr-people', 'hr-people', 1440, `[...document.querySelectorAll('.kit-chart')].map(f=>{const s=f.querySelector('svg');const b=${box};return {kind:f.dataset.kind,fig:b(f),svg:b(s)}})`],
  ['timeline1440.hanji-journey', 'hanji-journey', 1440, `[...document.querySelectorAll('.kit-timeline,.kit-steps')].map(f=>{const o=f.querySelector('ol');const b=${box};const last=[...o.querySelectorAll('li > *')].map(x=>x.getBoundingClientRect().right);return {cls:f.className,box:b(f),ol:b(o),contentRight:Math.round(Math.max(...last))}})`],
  ['timeline1440.game-launch', 'game-launch', 1440, `[...document.querySelectorAll('.kit-timeline,.kit-steps')].map(f=>{const o=f.querySelector('ol');const b=${box};const last=[...o.querySelectorAll('li > *')].map(x=>x.getBoundingClientRect().right);return {cls:f.className,box:b(f),ol:b(o),contentRight:Math.round(Math.max(...last))}})`],
  ['timeline1440.learning-course', 'learning-course', 1440, `[...document.querySelectorAll('.kit-timeline,.kit-steps')].map(f=>{const o=f.querySelector('ol');const b=${box};const last=[...o.querySelectorAll('li > *')].map(x=>x.getBoundingClientRect().right);return {cls:f.className,box:b(f),ol:b(o),contentRight:Math.round(Math.max(...last))}})`],
  ['mdDetail1440.inbox', 'inbox', 1440, `(()=>{const b=${box};return {list:b(document.querySelector('.kit-md-list')),detail:b(document.querySelector('.kit-md-detail')),grid:b(document.querySelector('.kit-md-grid'))}})()`],
  ['mdDetail1440.support-queue', 'support-queue', 1440, `(()=>{const b=${box};return {list:b(document.querySelector('.kit-md-list')),detail:b(document.querySelector('.kit-md-detail'))}})()`],
  ['heads1440.about-team', 'about-team', 1440, `[...document.querySelectorAll('h2,h3')].map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize,fw:getComputedStyle(h).fontWeight}))`],
  ['heads1440.case-study', 'case-study', 1440, `[...document.querySelectorAll('h2,h3')].map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize}))`],
  ['heads1440.event-landing', 'event-landing', 1440, `[...document.querySelectorAll('h1,h2,h3')].map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize}))`],
  ['heads1440.audit-log', 'audit-log', 1440, `[...document.querySelectorAll('h1,h2,.kit-metric dd')].slice(0,6).map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize}))`],
  ['heads1440.calendar-view', 'calendar-view', 1440, `[...document.querySelectorAll('h1,h2,.kit-metric dd')].slice(0,6).map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize}))`],
  ['heads1440.menu-dining', 'menu-dining', 1440, `[...document.querySelectorAll('h1,h2,h3')].slice(0,6).map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize}))`],
  ['heads1440.api-reference', 'api-reference', 1440, `[...document.querySelectorAll('h1,h2,h3')].slice(0,6).map(h=>({t:h.textContent.trim().slice(0,14),tag:h.tagName,fs:getComputedStyle(h).fontSize}))`],
  ['font1440.audit-log', 'audit-log', 1440, `(()=>({body:getComputedStyle(document.body).fontFamily.slice(0,120),p:getComputedStyle(document.querySelector('p')).fontFamily.slice(0,120)}))()`],
  ['table390.docs-reference', 'docs-reference', 390, `[...document.querySelectorAll('.kit-table-wrap')].map(w=>{const t=w.querySelector('table');return {wrapW:Math.round(w.getBoundingClientRect().width),tableW:Math.round(t.getBoundingClientRect().width),scrollW:w.scrollWidth,overflowX:getComputedStyle(w).overflowX,cols:t.querySelectorAll('thead th').length}})`],
  ['table390.sales-dashboard', 'sales-dashboard', 390, `[...document.querySelectorAll('.kit-table-wrap')].map(w=>{const t=w.querySelector('table');return {wrapW:Math.round(w.getBoundingClientRect().width),tableW:Math.round(t.getBoundingClientRect().width),scrollW:w.scrollWidth,overflowX:getComputedStyle(w).overflowX,cols:t.querySelectorAll('thead th').length}})`],
  ['table390.property-search', 'property-search', 390, `[...document.querySelectorAll('.kit-table-wrap')].map(w=>{const t=w.querySelector('table');return {wrapW:Math.round(w.getBoundingClientRect().width),tableW:Math.round(t.getBoundingClientRect().width),scrollW:w.scrollWidth,overflowX:getComputedStyle(w).overflowX,cols:t.querySelectorAll('thead th').length}})`],
  ['header390.menu-dining', 'menu-dining', 390, `(()=>{const h=document.querySelector('.kit-header');return {h:Math.round(h.getBoundingClientRect().height),vh:innerHeight}})()`],
  ['header390.blog-index', 'blog-index', 390, `(()=>{const h=document.querySelector('.kit-header');return {h:Math.round(h.getBoundingClientRect().height),vh:innerHeight}})()`],
  ['header390.beauty-detail', 'beauty-detail', 390, `(()=>{const h=document.querySelector('.kit-header');return {h:Math.round(h.getBoundingClientRect().height),vh:innerHeight}})()`],
  ['header390.about-team', 'about-team', 390, `(()=>{const h=document.querySelector('.kit-header');return {h:Math.round(h.getBoundingClientRect().height),vh:innerHeight}})()`],
  ['filter390.product-listing', 'product-listing', 390, `(()=>{const f=document.querySelector('.kit-form');const g=document.querySelector('.kit-card');return {formTop:Math.round(f.getBoundingClientRect().top+scrollY),firstCardTop:Math.round(g.getBoundingClientRect().top+scrollY),docH:document.documentElement.scrollHeight}})()`],
  ['actions1440.forbidden', 'forbidden', 1440, `(()=>{const b=${box};return [...document.querySelectorAll('.kit-main a,.kit-main button')].map(a=>({t:a.textContent.trim().slice(0,8),...b(a),top:Math.round(a.getBoundingClientRect().top)}))})()`],
]) {
  { const {page, ctx} = await open(name, width); try { out[key] = await page.evaluate(expr); } catch (err) { out[key] = {error: String(err).slice(0, 160)}; } await ctx.close(); }
}
await browser.close();
await writeFile(resolve(import.meta.dirname, 'visual-reaudit/probe.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
