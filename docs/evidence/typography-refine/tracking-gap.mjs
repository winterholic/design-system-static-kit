// Objective Hangul "bunching" test: ink gap between adjacent syllables (em) for a face at weight/tracking, and
// the white band between two stacked lines for a line-height.  node tracking-gap.mjs [out.json]
import {writeFileSync, readFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const rows = JSON.parse(readFileSync(new URL('./before/examples.json', import.meta.url)));
const text = [...new Set(rows.filter(r => r.width === 1440 && r.title?.hangulShare > .6).map(r => r.title.text.replace(/[^가-힣]/g, '')))].join('');
const b = await chromium.launch(); const page = await b.newPage(); await page.setContent('<canvas id=c></canvas>');
const res = await page.evaluate(text => {
  const ctx = document.getElementById('c').getContext('2d'), S = 200, chars = [...text];
  const faces = {'SD Gothic Neo': '"Apple SD Gothic Neo"', 'AppleMyungjo': '"AppleMyungjo"'};
  const out = [];
  for (const [fname, fam] of Object.entries(faces)) for (const w of [400, 600, 700, 800]) {
    ctx.font = `${w} ${S}px ${fam}`;
    const m = chars.map(c => { const t = ctx.measureText(c); return {adv: t.width, l: -t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight, asc: t.actualBoundingBoxAscent, desc: t.actualBoundingBoxDescent}; });
    const inkH = Math.max(...m.map(x => x.asc)) + Math.max(...m.map(x => x.desc)), inkAsc = Math.max(...m.map(x => x.asc)), inkDesc = Math.max(...m.map(x => x.desc));
    for (const ls of [0.02, 0, -0.02, -0.035, -0.05]) {
      const gaps = []; for (let i = 0; i < m.length - 1; i++) gaps.push((m[i].adv + ls * S + m[i + 1].l - m[i].r) / S);
      gaps.sort((a, b) => a - b);
      out.push({kind: 'track', face: fname, weight: w, ls, medianGap: +gaps[gaps.length >> 1].toFixed(3), p10Gap: +gaps[Math.floor(gaps.length * .1)].toFixed(3), minGap: +gaps[0].toFixed(3), touching: +(gaps.filter(g => g < .01).length / gaps.length).toFixed(2)});
    }
    for (const lh of [1, 1.1, 1.15, 1.25, 1.3, 1.4, 1.5]) out.push({kind: 'leading', face: fname, weight: w, lh, band: +(lh - inkH / S).toFixed(3), inkHeightEm: +(inkH / S).toFixed(3)});
  }
  return {sampleChars: chars.length, out};
}, text);
await b.close();
writeFileSync(process.argv[2] ?? new URL('./tracking-gap.json', import.meta.url), JSON.stringify(res, null, 1) + '\n');
console.log('chars', res.sampleChars);
console.table(res.out.filter(r => r.kind === 'track' && r.face === 'SD Gothic Neo' && r.weight >= 700 || r.kind === 'track' && r.face === 'AppleMyungjo' && r.weight === 400));
console.table(res.out.filter(r => r.kind === 'leading' && r.weight === 700 && r.face === 'SD Gothic Neo'));
