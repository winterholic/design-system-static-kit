import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {themes,palettes,createBlueprint,axes,nodeSpecs,blueprintSchema} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
const evidence=JSON.parse(await readFile(new URL('../docs/evidence/coolors-palettes.json',import.meta.url),'utf8'));
const observed=new Set(evidence.palettes.map(p=>p.colors.join('-')));
for(const p of Object.values(palettes))assert.ok(observed.has(p.colors.join('-')),'Palette missing in independent rendered evidence: '+p.id);
let pairs=0,builds=0;const contrast=[];
for(const theme of Object.values(themes))for(const palette of theme.palettes)for(const mode of axes.mode){
  const b=createBlueprint();Object.assign(b,{theme:theme.id,palette,mode});const r=compile(b);builds++;
  for(const pair of r.manifest.contrast){assert.ok(pair.ratio>=pair.minimum,`${palette}/${mode}: ${pair.name}`);pairs++;}
  contrast.push({theme:theme.id,palette,mode,pairs:r.manifest.contrast,provenance:r.manifest.paletteProvenance});
}
// Enumerate axes jointly with every palette; this checks allowed combinations, not visual quality.
let variants=0;
for(const theme of Object.values(themes))for(const palette of theme.palettes)for(const mode of axes.mode)for(const shell of axes.shell)for(const typography of axes.typography)for(const density of axes.density)for(const radius of axes.radius){const b=createBlueprint();Object.assign(b,{theme:theme.id,palette,mode,shell,typography,density,radius});compile(b);variants++;}
await mkdir(new URL('../docs/evidence',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/evidence/contrast.json',import.meta.url),JSON.stringify({catalogVersion:'1.0.0',combinations:builds,pairs,results:contrast},null,2)+'\n');
console.log(`AUDIT: ${Object.keys(palettes).length} palettes match rendered Coolors evidence; ${builds} color modes, ${pairs} used contrast pairs pass; ${variants} axis combinations compile.`);
console.log(`CATALOG: ${Object.keys(themes).length} themes, ${Object.keys(nodeSpecs).length} node types. Input schema generated from the same catalog; cross-field constraints are enforced by the runtime validator.`);
