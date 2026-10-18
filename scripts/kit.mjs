#!/usr/bin/env node
import {writeFile, readFile} from 'node:fs/promises';
import {createBlueprint, migrateV1, blueprintSchema, themes, palettes, templateList, nodeTypes, nodeSpecs, pageTypes, axes} from '../src/catalog.mjs';
import {validateBlueprint} from '../src/compiler.mjs';
import {readBlueprint, writeOutput, checkOutput, pretty} from './output.mjs';
const [command, ...args] = process.argv.slice(2);
const usage = 'Usage: kit catalog | schema | templates | themes | init <template> <file.json> [theme] | migrate <v1.json> <out.json> | validate <file.json> | build <file.json> --out <directory> | check <directory>';
try {
  if (command === 'catalog' && args.length === 0) console.log(pretty({counts: {themes: Object.keys(themes).length, palettes: Object.keys(palettes).length, templates: templateList.length, nodeTypes: nodeTypes.length, pageTypes: Object.keys(pageTypes).length}, axes, nodes: Object.fromEntries(nodeTypes.map(t => [t, nodeSpecs[t].label]))}));
  else if (command === 'schema' && args.length === 0) console.log(pretty(blueprintSchema()));
  else if (command === 'templates' && args.length === 0) console.log(templateList.map(t => `${t.id.padEnd(22)} ${t.pageType.padEnd(10)} ${t.theme.padEnd(11)} ${t.label}`).join('\n'));
  else if (command === 'themes' && args.length === 0) console.log(Object.values(themes).map(t => `${t.id.padEnd(11)} ${t.category.padEnd(12)} ${t.palettes.join(', ')}`).join('\n'));
  else if (command === 'init' && (args.length === 2 || args.length === 3)) { await writeFile(args[1], pretty(createBlueprint(args[0], args[2])), {flag: 'wx'}); console.log('Created ' + args[1]); }
  else if (command === 'migrate' && args.length === 2) { const b = migrateV1(await readBlueprint(args[0])); const r = validateBlueprint(b); if (!r.valid) throw new Error(r.errors.map(x => `${x.path} [${x.code}] ${x.message}`).join('\n')); await writeFile(args[1], pretty(b), {flag: 'wx'}); console.log('Migrated ' + args[0] + ' → ' + args[1]); }
  else if (command === 'validate' && args.length === 1) { const r = validateBlueprint(await readBlueprint(args[0])); if (!r.valid) throw new Error(r.errors.map(x => `${x.path} [${x.code}] ${x.message}`).join('\n')); console.log('VALID ' + args[0]); }
  else if (command === 'build' && args.length === 3 && args[1] === '--out') { const path = await writeOutput(await readBlueprint(args[0]), args[2]); console.log('BUILT ' + path); }
  else if (command === 'check' && args.length === 1) { await checkOutput(args[0]); console.log('VERIFIED ' + args[0]); }
  else throw new Error(usage);
} catch (e) { console.error(e.message); process.exitCode = 1; }
