// 모바일 390폭 가로 넘침과 페이지 길이를 잰다. 넘침 = documentElement.scrollWidth - 390.
import {chromium} from '@playwright/test';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4421';
const paths = ['/', '/materials', '/materials/color', '/materials/typography', '/materials/foundations', '/materials/foundations/radius', '/components', '/components/hero', '/components/button-control', '/explore', '/explore/saas-landing', '/studio', '/studio?template=saas-landing', '/studio?template=saas-landing&pane=preview', '/docs', '/integrations/rest-api', '/integrations/mcp'];
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true});
for (const p of paths) {
  const page = await ctx.newPage();
  await page.goto(BASE + p, {waitUntil: 'networkidle'}); await page.waitForTimeout(500);
  const m = await page.evaluate(() => ({over: document.documentElement.scrollWidth - 390, height: document.documentElement.scrollHeight, h1: document.querySelector('h1')?.textContent?.trim().slice(0, 30) ?? null, smallTargets: [...document.querySelectorAll('a,button,[role=tab]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32) && getComputedStyle(e).visibility !== 'hidden'; }).length}));
  console.log(p.padEnd(46), JSON.stringify(m));
  await page.close();
}
await browser.close();
