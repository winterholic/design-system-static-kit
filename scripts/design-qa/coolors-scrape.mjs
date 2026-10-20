// Coolors 인기 팔레트 관측 도구(렌더된 목록 페이지를 스크롤하며 스워치 hex·이름·좋아요 수를 읽는다).
// 사용: node scripts/design-qa/coolors-scrape.mjs <out.json> <tag,tag,...> [--scrolls 14]
// 산출물은 docs/evidence/coolors-popular-2026-10-20.json 같은 증거 파일의 원재료다. 분류·선정은 사람이 읽고 정한다.
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const [out, tagArg, ...rest] = process.argv.slice(2);
const scrolls = Number(rest[rest.indexOf('--scrolls') + 1] || 14);
const tags = tagArg.split(',');
const br = await chromium.launch();
const ctx = await br.newContext({viewport: {width: 1400, height: 1000}, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'});
const parseLikes = s => { const m = /^([\d.]+)\s*([KM]?)$/.exec(s.trim()); if (!m) return null; return Math.round(parseFloat(m[1]) * (m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : 1)); };
const hex = /^[0-9A-F]{6}$/;
const result = {observed: new Date().toISOString().slice(0, 10), method: 'Playwright Chromium on the Mac Studio host rendered coolors.co/palettes/<tag>; swatch hex, palette title and like count read from the rendered page text after infinite-scroll steps', pages: [], palettes: []};
for (const tag of tags) {
  const url = 'https://coolors.co/palettes/' + tag;
  const page = await ctx.newPage();
  try {
    const res = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
    await page.waitForTimeout(2500);
    for (let i = 0; i < scrolls; i++) { await page.mouse.wheel(0, 2400); await page.waitForTimeout(700); }
    const text = await page.evaluate(() => document.body.innerText);
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!hex.test(lines[i])) continue;
      let j = i; const colors = [];
      while (j < lines.length && hex.test(lines[j]) && colors.length < 12) colors.push('#' + lines[j++]);
      const title = lines[j] ?? '', likes = parseLikes(lines[j + 1] ?? '');
      if (colors.length >= 4 && colors.length <= 10 && title && likes != null) { result.palettes.push({colors, page_label: title, likes, source_tag: tag}); count++; }
      i = j;
    }
    result.pages.push({tag, status: res?.status(), found: count});
    console.log(tag, res?.status(), count);
  } catch (e) { result.pages.push({tag, error: String(e).slice(0, 120)}); console.log(tag, 'ERR', String(e).slice(0, 100)); }
  await page.close();
}
await writeFile(out, JSON.stringify(result, null, 1));
await br.close();
console.log('palettes', result.palettes.length);
