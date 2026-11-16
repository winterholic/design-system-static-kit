// Document height and horizontal overflow before/after for all 85 examples.  node heights.mjs <baseline repo root>
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const root = new URL('../../../', import.meta.url).pathname, base = process.argv[2];
const load = async r => ({c: await import(pathToFileURL(r + 'src/catalog.mjs')), k: await import(pathToFileURL(r + 'src/compiler.mjs'))});
const [now, old] = [await load(root), await load(base)];
const b = await chromium.launch(), rows = [];
for (const t of now.c.templateList) for (const w of [1440, 390]) {
  const m = {};
  for (const [name, mod] of [['before', old], ['after', now]]) {
    const p = await b.newPage({viewport: {width: w, height: 900}}); await p.emulateMedia({reducedMotion: 'reduce'});
    await p.setContent(mod.k.compile(mod.c.createBlueprint(t.id)).html); await p.waitForTimeout(30);
    m[name] = await p.evaluate(() => ({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth})); await p.close();
  }
  rows.push({id: t.id, width: w, before: m.before.h, after: m.after.h, delta: m.after.h - m.before.h, pct: +((m.after.h / m.before.h - 1) * 100).toFixed(1), overflowBefore: m.before.w > w, overflowAfter: m.after.w > w});
}
await b.close();
writeFileSync(new URL('./heights.json', import.meta.url), JSON.stringify(rows, null, 1) + '\n');
const by = w => rows.filter(r => r.width === w), avg = a => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
for (const w of [1440, 390]) console.log(w, 'mean %', avg(by(w).map(r => r.pct)), 'max %', Math.max(...by(w).map(r => r.pct)), 'taller>3%', by(w).filter(r => r.pct > 3).map(r => r.id + ':' + r.pct).join(' '), 'shorter', by(w).filter(r => r.pct < 0).length, 'overflow after', by(w).filter(r => r.overflowAfter).length, 'before', by(w).filter(r => r.overflowBefore).length);
