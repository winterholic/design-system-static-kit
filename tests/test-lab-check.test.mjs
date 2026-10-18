import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {checkHtml, EXPECTED_SCRIPT_HASH} from '../scripts/test-lab/check.mjs';

const page = () => { const out = compile(createBlueprint('contact')); return {html: out.html, mode: out.manifest.mode}; };
const good = () => page().html;
const codes = r => r.findings.map(f => f.code);

test('checker passes a real compiled page with proof-of-scan stats', () => {
  const p = page();
  const r = checkHtml(p.html, {mode: p.mode});
  assert.equal(r.pass, true, JSON.stringify(r.findings));
  assert.ok(r.stats.anchorsChecked > 5, 'must actually scan anchors');
  assert.ok(r.stats.idsChecked > 5, 'must actually scan ids');
  assert.ok(r.stats.headingsChecked >= 1, 'must actually scan headings');
  assert.ok(r.stats.inputsChecked >= 1, 'must actually scan inputs');
});

test('checker fails each defect class with its code (negative controls)', () => {
  const p = page();
  const base = p.html;
  const withTable = compile(createBlueprint('admin-table')).html;
  const cases = [
    ['DOC_TYPE', base.replace('<!doctype html>', '')],
    ['HTML_LANG', base.replace('<html lang="ko"', '<html lang="en"')],
    ['DOC_TITLE', base.replace(/<title>[\s\S]*?<\/title>/, '<title>  </title>')],
    ['CSP', base.replace('connect-src \'none\'', 'connect-src *')],
    ['COLOR_SCHEME', base.replace(`<meta name="color-scheme" content="${p.mode === 'auto' ? 'light dark' : p.mode}">`, '<meta name="color-scheme" content="bogus">')],
    ['H1_COUNT', base.replace('<h1', '<h2').replace('</h1>', '</h2>')],
    ['HEADING_SKIP', base.replace('</h1>', '</h1><h3>건너뛴 제목</h3>')],
    ['ANCHOR', base.replace('id="main"', 'id="renamed"')],
    ['DUP_ID', base.replace('id="main"', 'id="dup"').replace('<body>', '<body><p id="dup">x</p>')],
    ['VAGUE_LABEL', base.replace('>본문 바로가기<', '>여기<')],
    ['EMPTY_NAME', base.replace(/<a class="kit-skip" href="#main">[^<]*<\/a>/, '<a class="kit-skip" href="#main">  </a>')],
    ['UNLABELLED', base.replace('<label for="field-name">', '<label>')],
    ['TABLE', withTable.replace('<caption>', '<div class="fake-caption">').replace('</caption>', '</div>')],
    ['SCRIPT_COUNT', base + '<script>evil()</script>'],
    ['INLINE_HANDLER', base.replace('<body>', '<body onclick="x()">')],
    ['EXTERNAL_URL', base.replace('</body>', '<img src="https://example.com/x.png" alt="외부">')],
  ];
  for (const [code, html] of cases) {
    const r = checkHtml(html, {mode: p.mode});
    assert.equal(r.pass, false, code + ' should fail');
    assert.ok(codes(r).includes(code), `${code} not in ` + JSON.stringify(codes(r)));
  }
});

test('checker accepts aria-labelled icon-only controls (pagination)', () => {
  const out = compile(createBlueprint('admin-table'));
  const r = checkHtml(out.html, {mode: out.manifest.mode});
  assert.equal(r.pass, true, JSON.stringify(r.findings));
});

test('checker flags wrong script content', () => {
  const p = page();
  assert.equal(checkHtml(p.html, {mode: p.mode}).pass, true);
  const tampered = p.html.replace(/<script>[\s\S]*<\/script>/, '<script>console.log(1)</script>');
  const r = checkHtml(tampered, {mode: p.mode});
  assert.equal(r.pass, false);
  assert.ok(codes(r).includes('SCRIPT_HASH'));
});

test('checker vague-label set mirrors the validator', async () => {
  const {readFile} = await import('node:fs/promises');
  const src = await readFile(new URL('../src/validate.mjs', import.meta.url), 'utf8');
  for (const w of ['여기', '여기를 클릭', '클릭', '클릭하세요', 'click here', 'here', 'link', '링크', '이곳']) {
    assert.ok(src.includes(`'${w}'`), 'validator missing vague label: ' + w);
  }
});

test('expected script hash matches the real form runtime', async () => {
  const {formRuntime} = await import('../src/render.mjs');
  const {createHash} = await import('node:crypto');
  assert.equal(EXPECTED_SCRIPT_HASH, createHash('sha256').update(formRuntime).digest('hex'));
});
