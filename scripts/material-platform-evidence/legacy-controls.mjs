import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {findCombo, renderCombo} from '../../src/combos.mjs';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const OUT = 'docs/evidence/material-platform/legacy-controls';
const SPECS = [
  {id: 'legacy-s21', source: 'S21', combo: 'product-detail~tabs:boxed', width: 320, claim: 'EDGE candidate on a horizontally scrollable tab list'},
  {id: 'legacy-s06', source: 'S06', combo: 'product-landing', width: 1440, claim: '45% square-SVG crop from preserveAspectRatio slice'},
];

export function buildLegacyControlCases() {
  return SPECS.map(spec => {
    const combo = findCombo(spec.combo);
    if (!combo) throw new Error(`Legacy control combo missing: ${spec.combo}`);
    const rendered = renderCombo(combo);
    if (!rendered.ok) throw new Error(`Legacy control render failed: ${spec.combo}`);
    return {...spec, html: rendered.html, blueprint: rendered.blueprint};
  });
}

export async function writeLegacyControls(root = ROOT) {
  const cases = buildLegacyControlCases(), dir = resolve(root, OUT);
  await mkdir(dir, {recursive: true});
  for (const item of cases) await writeFile(resolve(dir, `${item.id}.html`), item.html);
  await writeFile(resolve(dir, 'manifest.json'), JSON.stringify(cases.map(({html, blueprint, ...meta}) => ({...meta, htmlPath: `${OUT}/${meta.id}.html`})), null, 2) + '\n');
  return cases.map(({html, blueprint, ...meta}) => meta);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  for (const row of await writeLegacyControls()) console.log(`${row.id} source=${row.source} combo=${row.combo} width=${row.width}px`);
}
