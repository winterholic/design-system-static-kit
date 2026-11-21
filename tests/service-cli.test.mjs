import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createBlueprint} from '../src/catalog.mjs';
import {validateBlueprint as coreValidate} from '../src/validate.mjs';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'static-kit-service-cli-'));
after(() => rmSync(dir, {recursive: true, force: true}));
const write = (name, value) => { const p = join(dir, name); writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value)); return p; };
const kit = (args, preload) => spawnSync(process.execPath, [...(preload ? ['--import', pathToFileURL(preload).href] : []), 'scripts/kit.mjs', ...args], {cwd: root, encoding: 'utf8'});

// CLI가 정말 서비스 계층을 거치는지 본다: 서비스 모듈만 가짜로 바꿔 끼우고 CLI가 그 답을 따르는지 확인한다.
const stub = join(dir, 'stub-service.mjs'), preload = join(dir, 'preload.mjs');
writeFileSync(stub, `
export const validateBlueprint = () => ({ok: false, errors: [{path: '$.stub', code: 'FROM_SERVICE', message: 'validate answered by the service'}]});
export const compileBlueprint = () => ({ok: false, errors: [{path: '$.stub', code: 'FROM_SERVICE', message: 'compile answered by the service'}]});
`);
writeFileSync(preload, `import {registerHooks} from 'node:module';
registerHooks({resolve(specifier, context, next) { if (specifier.endsWith('/src/service/index.mjs')) return {url: ${JSON.stringify(pathToFileURL(stub).href)}, shortCircuit: true}; return next(specifier, context); }});`);

test('validate, migrate and build ask the service layer: swapping the service changes what the CLI reports', () => {
  const valid = write('valid.json', createBlueprint('dashboard-overview'));
  const v = kit(['validate', valid], preload); assert.equal(v.status, 1); assert.equal(v.stderr, '$.stub [FROM_SERVICE] validate answered by the service\n');
  const out = join(dir, 'never-built');
  const b = kit(['build', valid, '--out', out], preload); assert.equal(b.status, 1); assert.match(b.stderr, /^Invalid blueprint:\n\$\.stub \[FROM_SERVICE\] compile answered by the service\n$/); assert.equal(existsSync(out), false, 'a refusal from the service builds nothing');
  const v1 = write('v1.json', {version: '1.0', catalogVersion: '1.0.0', name: '예전', theme: 'workspace', palette: 'ocean', mode: 'light', shell: 'sidebar', typography: 'sans', density: 'comfortable', radius: 'soft', tree: {type: 'page', children: [{type: 'page-header', title: '제목'}]}});
  const m = kit(['migrate', v1, join(dir, 'migrated.json')], preload); assert.equal(m.status, 1); assert.match(m.stderr, /FROM_SERVICE/); assert.equal(existsSync(join(dir, 'migrated.json')), false);
  // control: without the stub the same commands succeed, so the failures above came from the stub
  assert.equal(kit(['validate', valid]).status, 0); assert.equal(kit(['build', valid, '--out', out]).status, 0);
});

test('CLI output and exit codes match the validator and compiler messages exactly (the contract before the service existed)', () => {
  const bad = createBlueprint('saas-landing', 'civic'); bad.elevation = 'glow'; bad.mode = 'light'; bad.tree.children[1].style = 'x';
  const file = write('bad.json', bad), lines = coreValidate(bad).errors.map(x => `${x.path} [${x.code}] ${x.message}`).join('\n');
  const v = kit(['validate', file]); assert.equal(v.status, 1); assert.equal(v.stdout, ''); assert.equal(v.stderr, lines + '\n');
  const b = kit(['build', file, '--out', join(dir, 'bad-out')]); assert.equal(b.status, 1); assert.equal(b.stderr, 'Invalid blueprint:\n' + lines + '\n'); assert.equal(existsSync(join(dir, 'bad-out')), false);
  const ok = write('ok.json', createBlueprint('login'));
  const good = kit(['validate', ok]); assert.equal(good.status, 0); assert.equal(good.stdout, `VALID ${ok}\n`); assert.equal(good.stderr, '');
  const built = kit(['build', ok, '--out', join(dir, 'ok-out')]); assert.equal(built.status, 0); assert.equal(built.stdout, `BUILT ${join(dir, 'ok-out')}\n`);
  assert.deepEqual(readdirSync(join(dir, 'ok-out')).sort(), ['blueprint.json', 'index.html', 'manifest.json', 'tokens.css', 'tokens.json']);
  assert.equal(kit(['check', join(dir, 'ok-out')]).status, 0);
  assert.match(readFileSync(join(dir, 'ok-out/manifest.json'), 'utf8'), /"algorithm": "sha256"/);
});
