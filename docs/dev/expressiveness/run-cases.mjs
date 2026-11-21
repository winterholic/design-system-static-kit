// Usage: node docs/dev/expressiveness/run-cases.mjs [caseId ...]
// For each cases-src/<id>.mjs: write cases/<id>.json, validate, compile, build, check (via the real CLI), capture 1280/390 full-page JPEGs.
import {readdir, writeFile, mkdir, rm, appendFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {join, dirname} from 'node:path';
import {chromium} from 'playwright';
import {validateBlueprint, compile} from '../../../src/compiler.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../../..');
const SRC = join(HERE, 'cases-src'), OUT = join(HERE, 'cases'), TMP = '/tmp/expr/out';
const kit = (...args) => execFileSync('node', [join(ROOT, 'scripts/kit.mjs'), ...args], {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const wanted = process.argv.slice(2);
const ids = (await readdir(SRC)).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4)).filter(id => !wanted.length || wanted.includes(id)).sort();
await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const summary = [];
for (const id of ids) {
  const bpl = (await import(pathToFileURL(join(SRC, id + '.mjs')).href + '?t=' + Date.now())).default;
  const file = join(OUT, id + '.json');
  await writeFile(file, JSON.stringify(bpl, null, 2) + '\n');
  const row = {id, validate: null, compile: null, check: null, errors: [], overflow: {}, height: {}};
  const v = validateBlueprint(bpl);
  if (!v.valid) {
    row.validate = 'INVALID'; row.errors = v.errors.map(e => `${e.path} [${e.code}] ${e.message}`);
    await appendFile(join(OUT, 'attempts.log'), `${new Date().toISOString()} ${id} INVALID\n${row.errors.map(e => '  ' + e).join('\n')}\n`);
    summary.push(row); console.log(id, 'INVALID\n  ' + row.errors.join('\n  ')); continue;
  }
  row.validate = kit('validate', file);
  try { compile(bpl); row.compile = 'ok'; } catch (e) { row.compile = 'FAIL ' + e.message.split('\n')[0]; }
  const dir = join(TMP, id); await rm(dir, {recursive: true, force: true});
  try { row.build = kit('build', file, '--out', dir); row.check = kit('check', dir); } catch (e) { row.check = 'FAIL ' + (e.stderr || e.message).split('\n')[0]; }
  await appendFile(join(OUT, 'attempts.log'), `${new Date().toISOString()} ${id} VALID\n`);
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1});
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(join(dir, 'index.html')).href);
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight}));
    row.overflow[w] = m.sw > m.cw ? `overflow ${m.sw}>${m.cw}` : 'none'; row.height[w] = m.h;
    await page.screenshot({path: join(OUT, `${id}-${w}.jpg`), fullPage: true, type: 'jpeg', quality: 72});
    await ctx.close();
  }
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  row.pageDecisions = (manifest.design?.page?.decisions ?? []).map(d => `${d.rule ?? d.id}:${JSON.stringify(d.set ?? d.value ?? '')}`);
  summary.push(row);
  console.log(id, row.validate, '| compile', row.compile, '|', row.check, '| overflow', JSON.stringify(row.overflow), '| h', JSON.stringify(row.height), row.pageDecisions.join(' '));
}
await browser.close();
await writeFile(join(OUT, 'results.json'), JSON.stringify(summary, null, 2) + '\n');
