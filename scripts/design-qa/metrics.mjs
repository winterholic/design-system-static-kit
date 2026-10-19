// 페이지의 타이포·밀도 수치를 잰다(진단용). 레퍼런스(외부)와 이 저장소 표본을 같은 기준으로 비교한다.
// 사용: node scripts/design-qa/metrics.mjs <name>=<url> ...  (1280px, JSON 줄 출력)
import {chromium} from '@playwright/test';
const b = await chromium.launch();
for (const a of process.argv.slice(2)) {
  const name = a.slice(0, a.indexOf('=')), url = a.slice(a.indexOf('=') + 1);
  const p = await (await b.newContext({viewport: {width: 1280, height: 800}, locale: 'ko-KR'})).newPage();
  try {
    await p.goto(url, {waitUntil: 'domcontentloaded', timeout: 25000}); await p.waitForTimeout(2000);
    const m = await p.evaluate(() => {
      const cs = el => getComputedStyle(el), px = v => Math.round(parseFloat(v) * 10) / 10;
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs(el).visibility !== 'hidden'; };
      const h1 = [...document.querySelectorAll('h1')].filter(vis).sort((a, b) => px(cs(b).fontSize) - px(cs(a).fontSize))[0];
      const big = [...document.querySelectorAll('h1,h2,[class*=hero] *')].filter(e => vis(e) && e.children.length === 0 && e.textContent.trim()).sort((a, b) => px(cs(b).fontSize) - px(cs(a).fontSize))[0];
      const body = document.body, ps = [...document.querySelectorAll('p')].filter(vis);
      const sizes = new Map(); document.querySelectorAll('body *').forEach(e => { if (!e.children.length && e.textContent.trim() && vis(e)) { const s = px(cs(e).fontSize); sizes.set(s, (sizes.get(s) ?? 0) + 1); } });
      const all = [...document.querySelectorAll('body *')].filter(vis);
      const radii = new Map(), shadows = new Set(); all.forEach(e => { const c = cs(e); if (c.boxShadow !== 'none') shadows.add(c.boxShadow); if (px(c.borderTopLeftRadius) > 0 && px(c.borderTopLeftRadius) < 100) radii.set(px(c.borderTopLeftRadius), (radii.get(px(c.borderTopLeftRadius)) ?? 0) + 1); });
      const colors = new Set(); all.forEach(e => { const c = cs(e); [c.color, c.backgroundColor].forEach(x => { if (x && !/rgba\(0, 0, 0, 0\)/.test(x)) colors.add(x); }); });
      const imgs = [...document.querySelectorAll('img,svg:not(.kit-icon):not([class*=icon]),video,canvas,picture')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 120 && r.height > 80; });
      const area = imgs.reduce((s, e) => { const r = e.getBoundingClientRect(); return s + r.width * r.height; }, 0);
      return {
        h1: h1 ? {size: px(cs(h1).fontSize), weight: cs(h1).fontWeight, ls: cs(h1).letterSpacing, lh: px(cs(h1).lineHeight) ? Math.round(px(cs(h1).lineHeight) / px(cs(h1).fontSize) * 100) / 100 : 'n'} : null,
        maxText: big ? px(cs(big).fontSize) : null,
        bodyPx: px(cs(body).fontSize), bodyLh: cs(body).lineHeight === 'normal' ? 'normal' : Math.round(px(cs(body).lineHeight) / px(cs(body).fontSize) * 100) / 100,
        pLen: ps.length ? Math.round(ps.reduce((s, e) => s + e.textContent.length, 0) / ps.length) : 0,
        fontSizes: sizes.size, radii: radii.size, shadows: shadows.size, colors: colors.size,
        imgBig: imgs.length, imgAreaPct: Math.round(area / (1280 * Math.max(document.documentElement.scrollHeight, 1)) * 1000) / 10,
        pageH: document.documentElement.scrollHeight, tnum: all.some(e => /tabular/.test(cs(e).fontVariantNumeric)),
      };
    });
    console.log(name.padEnd(18), JSON.stringify(m));
  } catch (e) { console.log(name, 'ERR', e.message.slice(0, 80)); }
}
await b.close();
