import {readFile,mkdir,writeFile,readdir,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {compile} from '../src/compiler.mjs';
import {limits} from '../src/catalog.mjs';
export const filenames=['blueprint.json','index.html','manifest.json','tokens.css','tokens.json'];
export const pretty=x=>JSON.stringify(x,null,2)+'\n';
const sha=text=>createHash('sha256').update(text).digest('hex');
export async function readBlueprint(path){
  const stat=await lstat(path);if(stat.size>limits.bytes)throw new Error(`SIZE: ${path} exceeds ${limits.bytes} bytes`);
  return JSON.parse(await readFile(path,'utf8'));
}
export function outputFiles(blueprint){
  const r=compile(blueprint);
  const files={'index.html':r.html,'tokens.css':r.css,'tokens.json':pretty(r.tokens),'blueprint.json':pretty(blueprint)};
  files['manifest.json']=pretty({...r.manifest,integrity:{algorithm:'sha256',files:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,sha(text)]))}});
  return files;
}
export async function checkOutput(directory){
  if((await lstat(directory)).isSymbolicLink())throw new Error('Symbolic output directory rejected');
  const entries=(await readdir(directory)).sort();
  if(JSON.stringify(entries)!==JSON.stringify(filenames))throw new Error('Managed file set mismatch: expected '+filenames.join(', ')+'; found '+entries.join(', '));
  for(const name of filenames){const stat=await lstat(join(directory,name));if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Not a regular managed file: '+name);if(stat.size>2_000_000)throw new Error('Oversized generated file: '+name);}
  const b=await readBlueprint(join(directory,'blueprint.json')),expected=outputFiles(b);
  for(const name of filenames)if(await readFile(join(directory,name),'utf8')!==expected[name])throw new Error('Generated file mismatch: '+name+'; rebuild from blueprint');
  return expected;
}
export async function writeOutput(blueprint,directory){
  // Compile before any side effects, and never repurpose an unmanaged directory.
  const files=outputFiles(blueprint), out=resolve(directory);
  let stat;try{stat=await lstat(out);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(stat){
    if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Refusing non-directory or symbolic output path');
    const names=await readdir(out);
    if(names.length){
      if(names.some(n=>!filenames.includes(n))||!names.includes('manifest.json'))throw new Error('Refusing unmanaged output directory: '+out);
      for(const name of names)if(!(await lstat(join(out,name))).isFile()||(await lstat(join(out,name))).isSymbolicLink())throw new Error('Refusing symbolic or non-file output: '+name);
      const manifest=JSON.parse(await readFile(join(out,'manifest.json'),'utf8'));
      if(!manifest.catalogVersion||manifest.integrity?.algorithm!=='sha256')throw new Error('Refusing unmanaged manifest');
    }
  }
  await mkdir(out,{recursive:true});
  for(const [name,text] of Object.entries(files))await writeFile(join(out,name),text);
  return out;
}
