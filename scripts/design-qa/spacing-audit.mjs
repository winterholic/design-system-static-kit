// 간격 실측 감사: 템플릿 61개 × 밀도 3종 × 폭 2종을 컴파일해 spacing-probe로 잰다.
// 사용: node scripts/design-qa/spacing-audit.mjs [--only id,id] [--w 390,1280] [--verbose] [--json out.json]
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {compile} from '../../src/compiler.mjs';
import {createBlueprint, templateList} from '../../src/catalog.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
const only = opt('--only')?.split(','), widths = (opt('--w') ?? '390,1280').split(',').map(Number), verbose = args.includes('--verbose');
const densities = ['compact', 'comfortable', 'spacious'];

export async function auditAll({only: ids, widths: ws = [390, 1280], dens = densities} = {}) {
  const br = await chromium.launch(), rows = [];
  for (const t of templateList.filter(t => !ids || ids.includes(t.id))) for (const density of dens) {
    const b = createBlueprint(t.id); b.density = density;
    let html; try { html = compile(b).html; } catch { continue; }
    for (const w of ws) {
      const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
      await page.setContent(html, {waitUntil: 'load'});
      const r = await page.evaluate(spacingProbe, PROBE_OPTIONS);
      rows.push({id: t.id, density, width: w, ...r}); await ctx.close();
    }
  }
  await br.close();
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await auditAll({only, widths});
  const byCode = {}, byAt = {};
  for (const r of rows) for (const f of r.findings) { byCode[f.code] = (byCode[f.code] ?? 0) + 1; const k = `${f.code} ${f.at}`; (byAt[k] ??= {n: 0, ex: f.detail, tpl: new Set()}).n++; byAt[k].tpl.add(r.id); }
  console.log('SPACING AUDIT pages=' + rows.length, JSON.stringify(byCode));
  const sc = {}; for (const r of rows) for (const [k, v] of Object.entries(r.scanned)) sc[k] = (sc[k] ?? 0) + v;
  console.log('scanned', JSON.stringify(sc));
  for (const [k, v] of Object.entries(byAt).sort((a, b) => b[1].n - a[1].n).slice(0, verbose ? 200 : 40)) console.log(String(v.n).padStart(5), k, '|', v.ex, '|', [...v.tpl].slice(0, 4).join(','));
  if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(rows));
}
