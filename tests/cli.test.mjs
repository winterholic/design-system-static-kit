import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createBlueprint, themes} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {bundleSource} from '../scripts/bundle.mjs';
import {buildGallery} from '../scripts/gallery.mjs';

const dir = mkdtempSync(join(tmpdir(), 'static-kit-test-'));
after(() => rmSync(dir, {recursive: true, force: true}));
const input = join(dir, 'valid.json'); writeFileSync(input, JSON.stringify(createBlueprint('dashboard-overview')));
const cli = (...args) => spawnSync(process.execPath, ['scripts/kit.mjs', ...args], {cwd: resolve(import.meta.dirname, '..'), encoding: 'utf8'});

test('CLI validates and produces portable reproducible managed files', () => {
  assert.equal(cli('validate', input).status, 0);
  const out = join(dir, 'built'); const r = cli('build', input, '--out', out); assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readdirSync(out).sort(), ['blueprint.json', 'index.html', 'manifest.json', 'tokens.css', 'tokens.json']);
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), /<h1/);
  assert.equal(cli('check', out).status, 0);
  const before = readFileSync(join(out, 'manifest.json'), 'utf8'); assert.equal(cli('build', input, '--out', out).status, 0); assert.equal(readFileSync(join(out, 'manifest.json'), 'utf8'), before);
});
test('CLI init, templates, themes and catalog commands work and init refuses to overwrite', () => {
  const file = join(dir, 'init.json'); assert.equal(cli('init', 'login', file, 'civic').status, 0);
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).theme, 'civic'); assert.equal(cli('validate', file).status, 0);
  assert.notEqual(cli('init', 'login', file).status, 0);
  assert.match(cli('templates').stdout, /saas-landing/); assert.match(cli('themes').stdout, /nocturne/);
  assert.equal(JSON.parse(cli('catalog').stdout).counts.themes, Object.keys(themes).length);
});
test('CLI migrate upgrades a v1 blueprint', () => {
  const v1 = join(dir, 'v1.json'), out = join(dir, 'v2.json');
  writeFileSync(v1, JSON.stringify({version: '1.0', catalogVersion: '1.0.0', name: '예전', theme: 'workspace', palette: 'ocean', mode: 'light', shell: 'sidebar', typography: 'sans', density: 'comfortable', radius: 'soft', tree: {type: 'page', children: [{type: 'page-header', title: '제목'}, {type: 'notice', tone: 'info', title: '안내', body: '내용'}]}}));
  assert.notEqual(cli('validate', v1).status, 0); assert.equal(cli('migrate', v1, out).status, 0); assert.equal(cli('validate', out).status, 0);
});
test('checker rejects HTML/CSS edits, missing files and undeclared additions', () => {
  const out = join(dir, 'tamper'); assert.equal(cli('build', input, '--out', out).status, 0);
  for (const name of ['index.html', 'tokens.css', 'tokens.json', 'manifest.json', 'blueprint.json']) {
    const path = join(out, name), original = readFileSync(path, 'utf8'); writeFileSync(path, original + '\n'); const r = cli('check', out); assert.notEqual(r.status, 0); assert.match(r.stderr, new RegExp(name.replace('.', '\\.'))); writeFileSync(path, original);
  }
  writeFileSync(join(out, 'custom.css'), 'body{color:red}'); assert.notEqual(cli('check', out).status, 0); rmSync(join(out, 'custom.css'));
  rmSync(join(out, 'tokens.css')); assert.notEqual(cli('check', out).status, 0);
});
test('invalid build does not touch output and unmanaged directories are refused', () => {
  const bad = join(dir, 'invalid.json'); const b = createBlueprint('dashboard-overview'); b.tree.children[1].style = 'x'; writeFileSync(bad, JSON.stringify(b));
  const out = join(dir, 'never'); const r = cli('build', bad, '--out', out); assert.notEqual(r.status, 0); assert.match(r.stderr, /UNKNOWN_KEY/); assert.throws(() => readdirSync(out));
  const unmanaged = join(dir, 'unmanaged'); mkdirSync(unmanaged); writeFileSync(join(unmanaged, 'precious.txt'), 'keep'); assert.notEqual(cli('build', input, '--out', unmanaged).status, 0); assert.equal(readFileSync(join(unmanaged, 'precious.txt'), 'utf8'), 'keep');
});
test('CLI size cap, syntax errors and unknown commands fail explicitly', () => {
  const huge = join(dir, 'huge.json'); writeFileSync(huge, ' '.repeat(196609)); assert.match(cli('validate', huge).stderr, /SIZE/);
  const bad = join(dir, 'syntax.json'); writeFileSync(bad, '{'); assert.notEqual(cli('validate', bad).status, 0);
  assert.notEqual(cli('wat').status, 0); assert.notEqual(cli('build', input).status, 0);
});
test('checker refuses symbolic links to managed files', () => {
  const out = join(dir, 'symlinks'); assert.equal(cli('build', input, '--out', out).status, 0); const p = join(out, 'tokens.css'), backup = join(dir, 'backup.css'); writeFileSync(backup, readFileSync(p)); rmSync(p); symlinkSync(backup, p); assert.notEqual(cli('check', out).status, 0);
});
test('the single-file gallery bundle runs the very same compiler as Node', async () => {
  const src = await bundleSource();
  const win = {}; new Function('window', src)(win); const K = win.StaticKit;
  for (const id of ['saas-landing', 'dashboard-analytics', 'settings', 'menu-dining', 'not-found']) assert.equal(K.compile(K.createBlueprint(id)).html, compile(createBlueprint(id)).html, id);
  assert.equal(K.compile(K.createBlueprint('login', 'civic', 'bright-summer-mix')).html, compile(createBlueprint('login', 'civic', 'bright-summer-mix')).html);
  const html = await buildGallery(); assert.match(html, /<title>Static Kit 샘플 갤러리<\/title>/); assert.ok(html.length > 250000); assert.equal((html.match(/<\/script>/g) ?? []).length, 2, 'bundle must not close the script early');
});
