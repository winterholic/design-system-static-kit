// Aggregates measure.mjs output into the numbers quoted in diagnosis.md.  node analyze.mjs <dir>
import {readFileSync, writeFileSync} from 'node:fs';
const dir = process.argv[2] ?? 'before';
const rows = JSON.parse(readFileSync(`${dir}/examples.json`)), matrix = JSON.parse(readFileSync(`${dir}/preset-matrix.json`)), stacks = JSON.parse(readFileSync(`${dir}/stacks.json`));
const first = (f, s) => f?.[s]?.[0]?.face ?? '';
const koFace = (f, s) => (f?.[s] ?? []).find(x => /AppleSDGothicNeo|AppleMyungjo|NotoSans|NotoSerif|Nanum|Malgun|Batang/.test(x.face))?.face ?? '';
const syntheticBold = r => r.title && +r.title.weight >= 600 && koFace(r.faces.title, 'hangul') === 'AppleMyungjo';
const mixed = (r, k) => { const ko = koFace(r.faces[k], 'hangul'), la = first(r.faces[k], 'latin'); return !!ko && !!la && !/AppleSDGothicNeo|AppleMyungjo/.test(la); };
const out = {};
for (const w of [1440, 390]) {
  const v = rows.filter(r => r.width === w && r.title);
  const hangulTitles = v.filter(r => r.title.hangulShare >= .5);
  out[w] = {
    views: v.length,
    titlePx: {min: Math.min(...v.map(r => r.title.fontSize)), max: Math.max(...v.map(r => r.title.fontSize)), median: v.map(r => r.title.fontSize).sort((a, b) => a - b)[v.length >> 1]},
    bodyPx: {median: v.filter(r => r.body).map(r => r.body.fontSize).sort((a, b) => a - b)[v.length >> 1]},
    titleToBody: {median: +v.filter(r => r.body).map(r => r.title.fontSize / r.body.fontSize).sort((a, b) => a - b)[v.length >> 1].toFixed(2), over4: v.filter(r => r.body && r.title.fontSize / r.body.fontSize > 4).length, over3_5: v.filter(r => r.body && r.title.fontSize / r.body.fontSize > 3.5).length},
    hangulTitles: hangulTitles.length,
    titleTrackTight: {le_035: hangulTitles.filter(r => r.title.letterSpacingEm <= -.03).length, le_025: hangulTitles.filter(r => r.title.letterSpacingEm <= -.025).length},
    multiLineTitles: v.filter(r => r.title.lines >= 2).length,
    multiLineTightLeading: v.filter(r => r.title.lines >= 2 && r.title.lineHeight < 1.15).length,
    titleLeadingLt12: v.filter(r => r.title.lineHeight < 1.2).length,
    syntheticBoldTitles: v.filter(syntheticBold).length,
    mixedFaceTitle: v.filter(r => mixed(r, 'title')).length, mixedFaceBody: v.filter(r => mixed(r, 'body')).length,
    eyebrowHangulTracked: (() => { const e = v.flatMap(r => r.eyebrows ?? []); return {total: e.length, hangul: e.filter(x => x.hangul).length, hangulTracked_gt_005: e.filter(x => x.hangul && x.ls > .05).length, hangulUpper: e.filter(x => x.hangul && x.upper).length}; })(),
    bodyLeadingGt175: v.filter(r => r.body && r.body.lineHeight > 1.75).length,
  };
}
const byPreset = {};
for (const r of rows.filter(r => r.title)) {
  const p = (byPreset[r.typography] ??= {examples: new Set(), w: {}});
  p.examples.add(r.id);
}
out.byPreset = Object.fromEntries(Object.entries(byPreset).map(([k, v]) => [k, v.examples.size]));
// Preset matrix: same content, every preset.
out.matrix = {};
for (const w of [1440, 390]) out.matrix[w] = matrix.filter(r => r.width === w && r.id.startsWith('saas-landing@')).map(r => ({preset: r.typography, px: r.title.fontSize, weight: r.title.weight, ls: r.title.letterSpacingEm, lh: r.title.lineHeight, lines: r.title.lines, koTitle: koFace(r.faces.title, 'hangul'), laTitle: first(r.faces.title, 'latin').replace(/_wdth.*/, ''), synth: syntheticBold(r), mixedBody: mixed(r, 'body')}));
out.stacks = stacks.map(s => ({stack: s.stack, latin: s.latin400.replace(/_wdth.*/, ''), hangul: s.hangul400, hangul700: s.hangul700, latin700: s.latin700.replace(/_wdth.*/, ''), x: s.xHeight, hangulGlyph: s.hangulGlyph, ratio: s.hangulToXHeight}));
writeFileSync(`${dir}/summary.json`, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({...out, matrix: undefined, stacks: undefined}, null, 1));
console.table(out.matrix[390]); console.table(out.stacks);
