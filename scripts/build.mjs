import {mkdir, writeFile, cp, readdir, rm} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {CATALOG_VERSION, themes, palettes, nodeSpecs, rules, axes, axisDefs, axisBans, pageTypes, templateList, createBlueprint, blueprintSchema, themeCategories, iconNames} from '../src/catalog.mjs';
import {outputFiles, pretty} from './output.mjs';
import {buildGallery} from './gallery.mjs';
const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(root, 'site'));
const REP = {work: 'dashboard-overview', brand: 'saas-landing', read: 'article', life: 'product-landing', institution: 'civic-service', app: 'app-landing'};
export const representative = theme => (templateList.find(t => t.theme === theme.id) ?? templateList.find(t => t.id === REP[theme.category])).id;

// A stale file from an older build must never survive into the generated tree.
if (out.startsWith(root + '/') || out.startsWith('/tmp') || out.includes('static-kit-build-')) await rm(out, {recursive: true, force: true});
await mkdir(out, {recursive: true});
await cp(join(root, 'src'), join(out, 'src'), {recursive: true});
await cp(join(root, 'index.html'), join(out, 'index.html'));
await mkdir(join(out, 'docs'), {recursive: true});
for (const f of (await readdir(join(root, 'docs'))).filter(f => f.endsWith('.html'))) await cp(join(root, 'docs', f), join(out, 'docs', f));
await mkdir(join(out, 'v1'), {recursive: true});
await writeFile(join(out, 'v1/catalog.json'), pretty({version: CATALOG_VERSION, themeCategories, themes, palettes, axes, axisDefs, axisBans: axisBans.map(({id, uses, fix, why, source}) => ({id, uses, fix, why, source})), nodeSpecs, pageTypes, rules, templates: templateList.map(({id, label, pageType, theme}) => ({id, label, pageType, theme})), icons: iconNames}));
await writeFile(join(out, 'v1/blueprint.schema.json'), pretty(blueprintSchema()));
await mkdir(join(out, 'gallery'), {recursive: true});
await writeFile(join(out, 'gallery/index.html'), await buildGallery());
// Every template wearing its own theme is an executable reference, byte-for-byte reproducible from its blueprint.
for (const t of templateList) {
  const path = join(out, 'examples', t.id); await mkdir(path, {recursive: true});
  for (const [file, text] of Object.entries(outputFiles(createBlueprint(t.id)))) await writeFile(join(path, file), text);
}
// One showcase per theme: its representative template in the theme's first palette.
for (const theme of Object.values(themes)) {
  const path = join(out, 'examples/themes', theme.id); await mkdir(path, {recursive: true});
  for (const [file, text] of Object.entries(outputFiles(createBlueprint(representative(theme), theme.id)))) await writeFile(join(path, file), text);
}
await writeFile(join(out, '.nojekyll'), '');
// Test-lab: deterministic wide-combination pages. Built through the same CLI the docs prescribe,
// so `npm run build` and check-generated.mjs always cover it.
{
  const {spawnSync} = await import('node:child_process');
  const lab = join(out, 'test-lab');
  const steps = [
    ['scripts/test-lab/generate.mjs', '--out', lab],
    ['scripts/test-lab/check.mjs', '--out', lab],
    ['scripts/test-lab/index.mjs', '--out', lab],
  ];
  for (const s of steps) {
    const r = spawnSync(process.execPath, s, {cwd: root, encoding: 'utf8'});
    if (r.status !== 0) { console.error(r.stdout?.slice(-2000)); console.error(r.stderr?.slice(-2000)); throw new Error('test-lab build failed: ' + s[0]); }
  }
}
console.log(`BUILT static workbench, gallery, schema/catalog API, ${templateList.length} template examples, ${Object.keys(themes).length} theme showcases, test-lab → ${out}`);
