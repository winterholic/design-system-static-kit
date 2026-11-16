// Full-resolution (2x) crops of the same element before and after, stacked. Baseline compiles from a git worktree of f22b9ae69.
//   node zoom.mjs <baseline repo root>
import {mkdirSync, readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
const root = new URL('../../../', import.meta.url).pathname, base = process.argv[2];
const dir = new URL('.', import.meta.url).pathname + 'zoom/'; mkdirSync(dir, {recursive: true});
const cur = {cat: await import(pathToFileURL(root + 'src/catalog.mjs')), comp: await import(pathToFileURL(root + 'src/compiler.mjs'))};
const old = {cat: await import(pathToFileURL(base + '/src/catalog.mjs')), comp: await import(pathToFileURL(base + '/src/compiler.mjs'))};
// target: JS expression returning the element to crop; pad: extra px around it
const T = [
  {id: 'saas-landing', w: 1440, name: 'title', pick: `[...document.querySelectorAll('h1,h2')].filter(e=>e.getBoundingClientRect().width>40).sort((a,b)=>parseFloat(getComputedStyle(b).fontSize)-parseFloat(getComputedStyle(a).fontSize))[0].parentElement`},
  {id: 'app-landing', w: 390, name: 'title', pick: `[...document.querySelectorAll('h1,h2')].filter(e=>e.getBoundingClientRect().width>40).sort((a,b)=>parseFloat(getComputedStyle(b).fontSize)-parseFloat(getComputedStyle(a).fontSize))[0].parentElement`},
  {id: 'article', w: 390, name: 'title', pick: `document.querySelector('main h1').parentElement`},
  {id: 'article', w: 1440, name: 'title', pick: `document.querySelector('main h1').parentElement`},
  {id: 'luxury-brand', w: 1440, name: 'title', pick: `[...document.querySelectorAll('h1,h2')].filter(e=>e.getBoundingClientRect().width>40).sort((a,b)=>parseFloat(getComputedStyle(b).fontSize)-parseFloat(getComputedStyle(a).fontSize))[0].parentElement`},
  {id: 'news-home', w: 1440, name: 'digits', pick: `[...document.querySelectorAll('main p, main time, main span, main small')].find(e=>/2026년/.test(e.textContent)&&e.children.length<2).closest('div,header,section')`},
  {id: 'news-home', w: 1440, name: 'cards', pick: `document.querySelector('.kit-card').parentElement`},
  {id: 'admin-table', w: 1440, name: 'header', pick: `document.querySelector('main h1').parentElement`},
  {id: 'contact', w: 390, name: 'form-title', pick: `document.querySelector('main h1').parentElement`},
];
const b = await chromium.launch(), page = await b.newPage();
const shot = async (m, id, w, pick) => {
  const bp = m.cat.createBlueprint(id), html = m.comp.compile(bp).html;
  const p = await b.newPage({viewport: {width: w, height: 900}, deviceScaleFactor: 2}); await p.emulateMedia({reducedMotion: 'reduce'}); await p.setContent(html); await p.waitForTimeout(80);
  const box = await p.evaluate(pick => { const e = eval(pick); e.scrollIntoView(); const r = e.getBoundingClientRect(); return {x: Math.max(0, r.x - 8), y: r.y + scrollY - 8, width: Math.min(innerWidth, r.width + 16), height: Math.min(520, r.height + 16)}; }, pick);
  const buf = await p.screenshot({clip: box, fullPage: true}); await p.close(); return buf.toString('base64');
};
for (const t of T) {
  const [a, c] = [await shot(old, t.id, t.w, t.pick), await shot(cur, t.id, t.w, t.pick)];
  await page.setViewportSize({width: 1000, height: 400});
  await page.setContent(`<body style="margin:0;padding:10px;background:#fff;font:600 14px system-ui"><div style="color:#b00">before (2.2.0)</div><img style="display:block;border:1px solid #ddd;max-width:${t.w > 600 ? 1400 : 780}px" src="data:image/png;base64,${a}"><div style="color:#070;margin-top:10px">after (2.3.0)</div><img style="display:block;border:1px solid #ddd;max-width:${t.w > 600 ? 1400 : 780}px" src="data:image/png;base64,${c}">`);
  await page.waitForTimeout(80);
  await page.screenshot({path: dir + `${t.id}-${t.w}-${t.name}.png`, fullPage: true});
}
await b.close(); console.log('zoom crops:', T.length);
