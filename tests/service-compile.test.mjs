import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {compileBlueprint} from '../src/service/index.mjs';
import {contrastDiagnostics, compileErrors} from '../src/service/compile.mjs';
import {createBlueprint, templateList, themes} from '../src/catalog.mjs';

// scripts/build.mjs의 대표 템플릿 선택과 같은 규칙(그 파일은 import하는 순간 빌드를 시작하므로 옮겨 적었다).
const REP = {work: 'dashboard-overview', brand: 'saas-landing', read: 'article', life: 'product-landing', institution: 'civic-service', app: 'app-landing'};
const representative = theme => (templateList.find(t => t.theme === theme.id) ?? templateList.find(t => t.id === REP[theme.category])).id;
import {outputFiles} from '../scripts/output.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (...p) => readFileSync(resolve(root, 'site', ...p), 'utf8');
const sha256 = {algorithm: 'sha256', digest: text => createHash('sha256').update(text).digest('hex')};

test('HTML from the service is byte-identical to site/examples/<template>/index.html for every template', () => {
  assert.equal(templateList.length, readdirSync(resolve(root, 'site/examples')).filter(n => n !== 'themes').length, 'every template has a built example');
  let checked = 0;
  for (const t of templateList) {
    const r = compileBlueprint(createBlueprint(t.id));
    assert.equal(r.ok, true, `${t.id}: ${JSON.stringify(r.errors)}`);
    assert.equal(r.value.html, read('examples', t.id, 'index.html'), `${t.id} html differs from the built example`);
    assert.equal(r.value.css, read('examples', t.id, 'tokens.css'), `${t.id} css differs`);
    checked++;
  }
  assert.equal(checked, templateList.length); assert.ok(checked >= 85);
});

test('all five managed files from the service equal the CLI build output when the caller injects sha256', () => {
  for (const t of templateList) {
    const bp = createBlueprint(t.id), r = compileBlueprint(bp, {include: ['files'], hash: sha256});
    for (const name of ['index.html', 'tokens.css', 'tokens.json', 'blueprint.json', 'manifest.json']) assert.equal(r.value.files[name], read('examples', t.id, name), `${t.id}/${name}`);
    assert.deepEqual(Object.keys(r.value.files), ['index.html', 'tokens.css', 'tokens.json', 'blueprint.json', 'manifest.json']);
  }
});

test('theme showcases (the other generated tree) are reproduced byte for byte as well', () => {
  for (const theme of Object.values(themes)) {
    const bp = createBlueprint(representative(theme), theme.id), r = compileBlueprint(bp, {include: ['files'], hash: sha256});
    for (const [name, text] of Object.entries(r.value.files)) assert.equal(text, read('examples/themes', theme.id, name), `${theme.id}/${name}`);
  }
});

test('service files equal scripts/output.mjs outputFiles(), the function the CLI writes from', () => {
  for (const id of ['saas-landing', 'login', 'dashboard-overview', 'article']) {
    const bp = createBlueprint(id);
    assert.deepEqual(compileBlueprint(bp, {include: ['files'], hash: sha256}).value.files, outputFiles(bp), id);
  }
});

test('manifest.integrity is filled only when the caller injects a hash function (D6)', () => {
  const bp = createBlueprint('saas-landing');
  const plain = compileBlueprint(bp, {include: ['manifest']});
  assert.equal('integrity' in plain.value.manifest, false);
  const hashed = compileBlueprint(bp, {include: ['manifest', 'files'], hash: sha256});
  const {integrity} = hashed.value.manifest;
  assert.equal(integrity.algorithm, 'sha256'); assert.deepEqual(Object.keys(integrity.files), ['index.html', 'tokens.css', 'tokens.json', 'blueprint.json']);
  for (const [name, digest] of Object.entries(integrity.files)) assert.equal(digest, sha256.digest(hashed.value.files[name]), name);
  // a different function and algorithm label flow through untouched: the service hashes nothing itself
  const calls = []; const fake = compileBlueprint(bp, {include: ['manifest'], hash: {algorithm: 'test-hash', digest: text => { calls.push(text.length); return 'h' + text.length; }}});
  assert.equal(fake.value.manifest.integrity.algorithm, 'test-hash'); assert.equal(fake.value.manifest.integrity.files['index.html'], 'h' + calls[0]); assert.equal(calls.length, 4);
  // without a files request and without a hash, manifest.json is still produced but carries no integrity
  assert.equal(JSON.parse(compileBlueprint(bp, {include: ['files']}).value.files['manifest.json']).integrity, undefined);
});

test('bad hash injections are refused with a hint instead of producing a wrong integrity', () => {
  const bp = createBlueprint('login');
  for (const hash of [sha256.digest, {algorithm: 'sha256'}, {digest: sha256.digest}, {algorithm: '', digest: sha256.digest}, 'sha256']) {
    const r = compileBlueprint(bp, {hash}); assert.equal(r.ok, false); assert.equal(r.errors[0].code, 'BAD_REQUEST'); assert.equal(r.errors[0].path, '$args.opts.hash');
  }
  const async = compileBlueprint(bp, {hash: {algorithm: 'sha256', digest: async text => sha256.digest(text)}});
  assert.equal(async.ok, false); assert.equal(async.errors[0].path, '$args.opts.hash.digest'); assert.match(async.errors[0].hint, /동기/);
});

test('size limits: include, html modes and maxBytes shrink the answer and say what they left out', () => {
  const bp = createBlueprint('saas-landing');
  const full = compileBlueprint(bp);
  assert.deepEqual(Object.keys(full.value).sort(), ['css', 'html', 'manifest', 'sizes', 'tokens']);
  assert.equal(full.value.sizes.html, new TextEncoder().encode(full.value.html).length);
  const summary = compileBlueprint(bp, {html: 'summary'});
  assert.equal(summary.value.html, undefined); assert.deepEqual(Object.keys(summary.value.htmlSummary), ['bytes', 'title', 'nodeCount']);
  assert.equal(summary.value.htmlSummary.bytes, full.value.sizes.html); assert.equal(summary.value.htmlSummary.title, bp.name);
  assert.equal(summary.value.htmlSummary.nodeCount, JSON.stringify(bp.tree).match(/"type":/g).length);
  assert.ok(JSON.stringify(summary).length < JSON.stringify(full).length * 0.75);
  const omit = compileBlueprint(bp, {html: 'omit'}); assert.equal(omit.value.html, undefined); assert.equal(omit.value.htmlSummary, undefined);
  const onlyManifest = compileBlueprint(bp, {include: ['manifest']}); assert.deepEqual(Object.keys(onlyManifest.value), ['sizes', 'manifest']);
  assert.deepEqual(Object.keys(compileBlueprint(bp, {include: []}).value), ['sizes']);
  // maxBytes: html over the limit turns into a summary plus a warning, css over the limit is dropped plus a warning
  const capped = compileBlueprint(bp, {maxBytes: 80_000, include: ['html', 'css']});
  assert.equal(capped.value.html, undefined); assert.equal(capped.value.htmlSummary.bytes, full.value.sizes.html); assert.equal(typeof capped.value.css, 'string');
  assert.deepEqual(capped.warnings.filter(w => w.code === 'OUTPUT_OMITTED').map(w => w.path), ['$.html']);
  const tight = compileBlueprint(bp, {maxBytes: 1_000, include: ['html', 'css', 'files']});
  const bytes = text => new TextEncoder().encode(text).length;
  const allFiles = compileBlueprint(bp, {include: ['files']}).value.files;
  const tooBig = Object.keys(allFiles).filter(name => bytes(allFiles[name]) > 1_000);
  assert.ok(tooBig.length >= 3 && tooBig.length < 5, 'precondition: some files fit and some do not');
  assert.deepEqual(tight.warnings.filter(w => w.code === 'OUTPUT_OMITTED').map(w => w.path).sort(), ['$.css', '$.html', ...tooBig.map(n => `$.files['${n}']`)].sort());
  assert.deepEqual(Object.keys(tight.value.files), Object.keys(allFiles).filter(n => !tooBig.includes(n)), 'files within the limit are kept untouched');
  for (const w of tight.warnings) { assert.ok(w.hint); assert.match(w.message, /1000/); }
  assert.equal(compileBlueprint(bp, {maxBytes: 10 ** 9}).warnings.length, 0);
  for (const bad of [0, -1, 1.5, '10']) assert.equal(compileBlueprint(bp, {maxBytes: bad}).errors[0].path, '$args.opts.maxBytes');
  assert.equal(compileBlueprint(bp, {html: 'huge'}).errors[0].path, '$args.opts.html');
});

test('warnings are the compiler\'s own page-rule findings, not invented ones', () => {
  let withWarning = 0;
  for (const t of templateList) {
    const r = compileBlueprint(createBlueprint(t.id), {include: ['manifest']});
    const reported = (r.value.manifest.design?.page?.decisions ?? []).filter(d => ['PAGE_DUP_VISUAL', 'PAGE_BENTO_SPARSE'].includes(d.code));
    assert.deepEqual(r.warnings.map(w => w.code), reported.map(d => d.code), t.id);
    for (const w of r.warnings) { assert.ok(w.hint && w.path.startsWith('$.tree') && /^P\d\d: /.test(w.message) && /^P\d\d$/.test(w.rule)); withWarning++; }
  }
  assert.ok(withWarning >= 1, 'at least one template exercises a warning');
});

test('a failing compile never repairs the content: validation errors come back as errors and nothing is built', () => {
  const bp = createBlueprint('saas-landing'); bp.tree.children[1].style = 'color:red'; bp.elevation = 'glow'; bp.mode = 'light';
  const before = JSON.stringify(bp);
  const r = compileBlueprint(bp, {include: ['html', 'css', 'manifest', 'files']});
  assert.equal(r.ok, false); assert.equal('value' in r, false);
  assert.ok(r.errors.some(e => e.code === 'UNKNOWN_KEY' && e.path === '$.tree.children[1].style'));
  assert.ok(r.errors.some(e => e.code === 'AXIS_BAN' && e.fix?.elevation === 'soft'), 'the fix is offered, not applied');
  assert.equal(JSON.stringify(bp), before, 'input untouched');
  assert.equal(compileBlueprint(null).errors[0].code, 'OBJECT');
});

test('the input blueprint is never modified by a successful compile', () => {
  for (const id of ['saas-landing', 'dashboard-overview', 'pricing-page']) {
    const bp = createBlueprint(id), before = JSON.stringify(bp);
    compileBlueprint(bp, {include: ['html', 'css', 'tokens', 'manifest', 'files'], hash: sha256});
    assert.equal(JSON.stringify(bp), before, id);
  }
});

test('contrast gate failures are structured (CONTRAST_GATE) and a thrown internal error becomes INTERNAL without a stack', () => {
  const bp = createBlueprint('login');
  const failing = {light: {report: [{name: 'text/canvas', ratio: 3.2, minimum: 7}, {name: 'muted/surface', ratio: 5, minimum: 4.5}]}, dark: {report: [{name: 'link/canvas', ratio: 4.4, minimum: 4.5}]}};
  const found = contrastDiagnostics(bp, () => failing);
  assert.deepEqual(found.map(d => d.code), ['CONTRAST_GATE', 'CONTRAST_GATE']); assert.match(found[0].message, /light 모드에서 text\/canvas 대비가 3\.20:1/); assert.match(found[1].message, /dark 모드에서 link\/canvas/);
  for (const d of found) { assert.equal(d.path, '$.palette'); assert.ok(d.hint); }
  const generic = compileErrors(new Error('Contrast gate failed'), bp, () => { throw new Error('boom'); });
  assert.equal(generic[0].code, 'CONTRAST_GATE');
  const internal = compileErrors(new Error('Composition conflict: C01 / C02 set role\n    at stack line'), bp);
  assert.equal(internal[0].code, 'INTERNAL'); assert.doesNotMatch(JSON.stringify(internal), /at stack line/);
  const bad = compileErrors(Object.assign(new Error('Invalid blueprint:\n..'), {errors: [{path: '$.x', code: 'ENUM', message: 'm'}]}), bp);
  assert.deepEqual(bad.map(e => e.code), ['ENUM']); assert.ok(bad[0].hint);
});
