import {mkdir,readFile,writeFile,cp,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {CATALOG_VERSION,themes,palettes,nodeSpecs,rules,axes,createBlueprint,presets,blueprintSchema} from '../src/catalog.mjs';
import {outputFiles,pretty} from './output.mjs';
const root=resolve(import.meta.dirname,'..');
const out=resolve(process.argv[2]??join(root,'site'));
await mkdir(out,{recursive:true});
await cp(join(root,'src'),join(out,'src'),{recursive:true});
await cp(join(root,'index.html'),join(out,'index.html'));
await mkdir(join(out,'docs'),{recursive:true});
await cp(join(root,'docs/plan.html'),join(out,'docs/plan.html'));
await mkdir(join(out,'v1'),{recursive:true});
await writeFile(join(out,'v1/catalog.json'),pretty({version:CATALOG_VERSION,themes,palettes,axes,nodeSpecs,rules}));
await writeFile(join(out,'v1/blueprint.schema.json'),pretty(blueprintSchema()));
for(const preset of Object.keys(presets)){
  const b=createBlueprint(preset);const path=join(out,'examples',preset);await mkdir(path,{recursive:true});
  for(const [file,text] of Object.entries(outputFiles(b)))await writeFile(join(path,file),text);
}
// Curated theme examples are executable references, with each direction's reviewed defaults.
for(const theme of Object.values(themes)){
  const b=createBlueprint(theme.id==='editorial'?'article':theme.id==='botanical'||theme.id==='atelier'?'landing':'dashboard');
  Object.assign(b,{theme:theme.id,palette:theme.palettes[0],...theme.defaults});
  const path=join(out,'examples/themes',theme.id);await mkdir(path,{recursive:true});
  for(const [file,text] of Object.entries(outputFiles(b)))await writeFile(join(path,file),text);
}
await writeFile(join(out,'.nojekyll'),'');
console.log('BUILT static workbench, schema/catalog API, 4 presets, 6 theme examples → '+out);
