import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBlueprint} from '../../src/catalog.mjs';
import {compile} from '../../src/compiler.mjs';
import {chartPresetMaterials} from '../../src/materials/chart-presets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const blueprint = createBlueprint('dashboard-overview');
blueprint.tree.children.push(...chartPresetMaterials.map(material => structuredClone(material.examples[0])));
const {html} = compile(blueprint);
const output = resolve(root, 'docs/evidence/materials/chart-presets.html');
mkdirSync(dirname(output), {recursive: true});
writeFileSync(output, html.trimEnd() + '\n');
console.log(`Rendered ${chartPresetMaterials.length} chart presets → ${output}`);
