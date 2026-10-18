import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),temporary=await mkdtemp(join(tmpdir(),'static-kit-build-'));
async function files(dir,prefix=''){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=prefix+e.name;if(e.isDirectory())result.push(...await files(join(dir,e.name),path+'/'));else result.push(path);}return result.sort();}
try{
  const r=spawnSync(process.execPath,['scripts/build.mjs',temporary],{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);
  const expected=await files(temporary),actual=await files(join(root,'site'));
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Generated site file set mismatch');
  for(const path of expected)if(!(await readFile(join(temporary,path))).equals(await readFile(join(root,'site',path))))throw new Error('Stale generated file: '+path);
  console.log(`REPRODUCIBLE: ${expected.length} generated files match a fresh build byte for byte.`);
}catch(e){console.error(e.message);process.exitCode=1;}finally{await rm(temporary,{recursive:true,force:true});}
