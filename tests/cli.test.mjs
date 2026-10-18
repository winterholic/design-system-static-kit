import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createBlueprint} from '../src/catalog.mjs';
const dir=mkdtempSync(join(tmpdir(),'static-kit-test-'));
after(()=>rmSync(dir,{recursive:true,force:true}));
const input=join(dir,'valid.json');writeFileSync(input,JSON.stringify(createBlueprint()));
const cli=(...args)=>spawnSync(process.execPath,['scripts/kit.mjs',...args],{cwd:resolve(import.meta.dirname,'..'),encoding:'utf8'});
test('CLI validates and produces portable reproducible managed files',()=>{
  assert.equal(cli('validate',input).status,0);
  const out=join(dir,'built');const r=cli('build',input,'--out',out);assert.equal(r.status,0,r.stderr);
  assert.deepEqual(readdirSync(out).sort(),['blueprint.json','index.html','manifest.json','tokens.css','tokens.json']);
  assert.match(readFileSync(join(out,'index.html'),'utf8'),/<h1/);
  assert.equal(cli('check',out).status,0);
  const before=readFileSync(join(out,'manifest.json'),'utf8');assert.equal(cli('build',input,'--out',out).status,0);assert.equal(readFileSync(join(out,'manifest.json'),'utf8'),before);
});
test('checker rejects HTML/CSS edits, missing files and undeclared additions',()=>{
  const out=join(dir,'tamper');assert.equal(cli('build',input,'--out',out).status,0);
  for(const name of ['index.html','tokens.css','tokens.json','manifest.json','blueprint.json']){
    const path=join(out,name),original=readFileSync(path,'utf8');writeFileSync(path,original+'\n');const r=cli('check',out);assert.notEqual(r.status,0);assert.match(r.stderr,new RegExp(name.replace('.','\\.')));writeFileSync(path,original);
  }
  writeFileSync(join(out,'custom.css'),'body{color:red}');assert.notEqual(cli('check',out).status,0);rmSync(join(out,'custom.css'));
  rmSync(join(out,'tokens.css'));assert.notEqual(cli('check',out).status,0);
});
test('invalid build does not touch output and unmanaged directories are refused',()=>{
  const bad=join(dir,'invalid.json');const b=createBlueprint();b.tree.children[1].style='x';writeFileSync(bad,JSON.stringify(b));
  const out=join(dir,'never');const r=cli('build',bad,'--out',out);assert.notEqual(r.status,0);assert.match(r.stderr,/UNKNOWN_KEY/);assert.throws(()=>readdirSync(out));
  const unmanaged=join(dir,'unmanaged');mkdirSync(unmanaged);writeFileSync(join(unmanaged,'precious.txt'),'keep');assert.notEqual(cli('build',input,'--out',unmanaged).status,0);assert.equal(readFileSync(join(unmanaged,'precious.txt'),'utf8'),'keep');
});
test('CLI size cap, syntax errors and unknown commands fail explicitly',()=>{
  const huge=join(dir,'huge.json');writeFileSync(huge,' '.repeat(131073));assert.match(cli('validate',huge).stderr,/SIZE/);
  const bad=join(dir,'syntax.json');writeFileSync(bad,'{');assert.notEqual(cli('validate',bad).status,0);
  assert.notEqual(cli('wat').status,0);assert.notEqual(cli('build',input).status,0);
});
test('checker refuses symbolic links to managed files',()=>{
  const out=join(dir,'symlinks');assert.equal(cli('build',input,'--out',out).status,0);const p=join(out,'tokens.css'),backup=join(dir,'backup.css');writeFileSync(backup,readFileSync(p));rmSync(p);symlinkSync(backup,p);assert.notEqual(cli('check',out).status,0);
});
