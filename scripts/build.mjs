import {mkdir, readFile, writeFile, cp, readdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {CATALOG_VERSION, themes, palettes, nodeSpecs, rules, axes, axisDefs, axisBans, pageTypes, templateList, createBlueprint, blueprintSchema, themeCategories, iconNames} from '../src/catalog.mjs';
import {outputFiles, pretty} from './output.mjs';
import {buildGallery} from './gallery.mjs';
const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(root, 'site'));
const REP = {work: 'dashboard-overview', brand: 'saas-landing', read: 'article', life: 'product-landing', institution: 'civic-service', app: 'app-landing'};
export const representative = theme => (templateList.find(t => t.theme === theme.id) ?? templateList.find(t => t.id === REP[theme.category])).id;

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
console.log(`BUILT static workbench, gallery, schema/catalog API, ${templateList.length} template examples, ${Object.keys(themes).length} theme showcases → ${out}`);
