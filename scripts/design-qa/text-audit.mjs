// 글줄·넘침 실측 감사: 템플릿 × 테마 × 폭을 컴파일해 text-probe로 잰다.
// 사용: node scripts/design-qa/text-audit.mjs [--only id,id] [--w 360,390,768,1280] [--themes own|rot3|all] [--verbose] [--json out.json] [--font Name]
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {compile} from '../../src/compiler.mjs';
import {createBlueprint, templateList, themes} from '../../src/catalog.mjs';
import {validateBlueprint} from '../../src/compiler.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };

export function plan({only, mode = 'rot3'} = {}) {
  const ids = Object.keys(themes), out = [];
  for (const [i, t] of templateList.entries()) {
    if (only && !only.includes(t.id)) continue;
    const picks = mode === 'own' ? [t.theme] : mode === 'all' ? ids : [t.theme, ids[(i * 7 + 3) % ids.length], ids[(i * 11 + 17) % ids.length]];
    for (const th of new Set(picks)) out.push({template: t.id, theme: th});
  }
  return out;
}

export async function auditText({items, widths = [360, 390, 768, 1280], font = null, blueprint = x => x} = {}) {
  const br = await chromium.launch(), rows = [];
  for (const it of items) {
    let b; try { b = blueprint(createBlueprint(it.template, it.theme), it); } catch { continue; }
    if (!validateBlueprint(b).valid) continue;
    const html = compile(b).html;
    for (const w of widths) {
      const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
      await page.setContent(html, {waitUntil: 'load'});
      if (font) await page.addStyleTag({content: `*{font-family:'${font}' !important}`});
      const r = await page.evaluate(textProbe, TEXT_PROBE_OPTIONS);
      rows.push({...it, width: w, ...r}); await ctx.close();
    }
  }
  await br.close();
  return rows;
}

export function summarize(rows, {verbose = false} = {}) {
  const byCode = {}, byAt = {};
  for (const r of rows) for (const f of r.findings) { byCode[f.code] = (byCode[f.code] ?? 0) + 1; const k = `${f.code} ${f.at}`; (byAt[k] ??= {n: 0, ex: f.detail, tpl: new Set(), w: new Set()}).n++; byAt[k].tpl.add(r.template); byAt[k].w.add(r.width); }
  const sc = {}; for (const r of rows) for (const [k, v] of Object.entries(r.scanned)) sc[k] = (sc[k] ?? 0) + v;
  const lines = [`TEXT AUDIT pages=${rows.length} ${JSON.stringify(byCode)}`, 'scanned ' + JSON.stringify(sc)];
  for (const [k, v] of Object.entries(byAt).sort((a, b) => b[1].n - a[1].n).slice(0, verbose ? 300 : 50)) lines.push(`${String(v.n).padStart(5)} ${k} | ${v.ex} | w=${[...v.w].join('/')} | ${[...v.tpl].slice(0, 4).join(',')}`);
  return {byCode, lines};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = opt('--only')?.split(','), widths = (opt('--w') ?? '360,390,768,1280').split(',').map(Number);
  const rows = await auditText({items: plan({only, mode: opt('--themes') ?? 'rot3'}), widths, font: opt('--font')});
  console.log(summarize(rows, {verbose: args.includes('--verbose')}).lines.join('\n'));
  if (opt('--json')) await writeFile(opt('--json'), JSON.stringify(rows));
}
