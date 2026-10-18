#!/usr/bin/env node
import {writeFile} from 'node:fs/promises';
import {createBlueprint,blueprintSchema,themes,palettes,presets} from '../src/catalog.mjs';
import {validateBlueprint} from '../src/compiler.mjs';
import {readBlueprint,writeOutput,checkOutput,pretty} from './output.mjs';
const [command,...args]=process.argv.slice(2);
const usage='Usage: kit catalog | schema | init <dashboard|landing|article|settings> <file.json> | validate <file.json> | build <file.json> --out <directory> | check <directory>';
try{
  if(command==='catalog'&&args.length===0)console.log(pretty({themes,palettes,presets}));
  else if(command==='schema'&&args.length===0)console.log(pretty(blueprintSchema()));
  else if(command==='init'&&args.length===2){await writeFile(args[1],pretty(createBlueprint(args[0])),{flag:'wx'});console.log('Created '+args[1]);}
  else if(command==='validate'&&args.length===1){const r=validateBlueprint(await readBlueprint(args[0]));if(!r.valid)throw new Error(r.errors.map(x=>`${x.path} [${x.code}] ${x.message}`).join('\n'));console.log('VALID '+args[0]);}
  else if(command==='build'&&args.length===3&&args[1]==='--out'){const path=await writeOutput(await readBlueprint(args[0]),args[2]);console.log('BUILT '+path);}
  else if(command==='check'&&args.length===1){await checkOutput(args[0]);console.log('VERIFIED '+args[0]);}
  else throw new Error(usage);
}catch(e){console.error(e.message);process.exitCode=1;}
