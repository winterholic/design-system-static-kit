// Freeze the current compiler output before a policy change for identical-input browser comparisons.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compile} from '../../src/compiler.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('artifacts/rollout-before/',root);
await mkdir(dir,{recursive:true});
const inputs=JSON.parse(await readFile(new URL('docs/evidence/context-rollout/inputs.json',root),'utf8'));
for(const {id,blueprint} of inputs){
 if(!/^[a-z0-9-]+$/.test(id))throw new Error('Invalid fixture id: '+id);
 await writeFile(new URL(id+'.html',dir),compile(blueprint).html,{flag:'wx'});
}
console.log(`Frozen ${inputs.length} pages; open /scripts/design-qa/rollout-harness.html?phase=before, then phase=after after the change.`);
