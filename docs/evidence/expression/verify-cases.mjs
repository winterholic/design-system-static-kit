import {readdir, writeFile, mkdir, mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {migrateBlueprint} from '../../..//src/catalog.mjs';
import {validateBlueprint, compile} from '../../../src/compiler.mjs';
import {writeOutput, checkOutput} from '../../../scripts/output.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const source = resolve(root, 'docs/dev/expressiveness/cases-src');
const pageRoot = join(here, 'pages');
const representative = new Set(['05-image-product', '07-event-conference', '11-luxe-brand', '13-app-landing-dark']);
const sha = value => createHash('sha256').update(value).digest('hex');
const scratch = await mkdtemp(join(tmpdir(), `dsk-expression25-${process.pid}-`));
const results = [];

try {
  const files = (await readdir(source)).filter(f => f.endsWith('.mjs')).sort();
  if (files.length !== 15) throw new Error(`expected 15 cases, found ${files.length}`);
  for (const file of files) {
    const id = file.slice(0, -4);
    const imported = await import(pathToFileURL(join(source, file)).href + `?run=${process.pid}`);
    const blueprint = migrateBlueprint(imported.default, '2.5.0');
    const verdict = validateBlueprint(blueprint);
    if (!verdict.valid) throw new Error(`${id}: invalid: ${verdict.errors.map(e => `${e.path} [${e.code}]`).join(', ')}`);
    const output = compile(blueprint);
    const out = join(scratch, id);
    await writeOutput(blueprint, out);
    await checkOutput(out);
    const row = {
      id, catalogVersion: blueprint.catalogVersion, validate: 'VALID', compile: 'ok', outputCheck: 'VERIFIED',
      errors: verdict.errors,
      warnings: verdict.warnings.map(({path, code, severity, contract, message}) => ({path, code, severity, contract, message})),
      hashes: {html: sha(output.html), css: sha(output.css), manifest: sha(JSON.stringify(output.manifest))},
    };
    results.push(row);
    if (representative.has(id)) {
      const dir = join(pageRoot, id);
      await mkdir(dir, {recursive: true});
      for (const name of ['index.html', 'tokens.css', 'tokens.json', 'blueprint.json', 'manifest.json']) await writeFile(join(dir, name), await readFile(join(out, name)));
    }
  }
  const resultFile = join(here, 'cases-2-5-results.json');
  await writeFile(resultFile, JSON.stringify({catalogVersion: '2.5.0', baseline: '53aa1dcc8', count: results.length, cases: results}, null, 2) + '\n');
  console.log(`CASES ${results.length}/${files.length} VALID · compile ok · output check verified`);
  console.log(`WARNINGS ${results.reduce((sum, r) => sum + r.warnings.length, 0)} · errors 0 · representative pages ${representative.size}`);
  console.log(`RESULT ${resultFile}`);
} finally {
  await rm(scratch, {recursive: true, force: true});
}
