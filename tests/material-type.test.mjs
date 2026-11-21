import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRegistry} from '../src/materials/registry.mjs';
import {
  MATERIAL_TYPE_PRESETS, MULTILINGUAL_TYPE_CORPUS, registerMaterialType,
  renderMaterialTypeCSS, renderMaterialTypeExample,
} from '../src/materials/typography.mjs';

test('role presets define all seven type roles and explicit responsive density behavior', () => {
  assert.deepEqual(Object.keys(MATERIAL_TYPE_PRESETS).sort(), ['dashboard', 'document', 'erp', 'marketing']);
  for (const [id, preset] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    assert.equal(preset.id, id);
    assert.deepEqual(Object.keys(preset.roles).sort(), ['body', 'caption', 'code', 'display', 'heading', 'label', 'numeric']);
    for (const [role, spec] of Object.entries(preset.roles)) {
      assert.ok(spec.fontFamily.includes('sans-serif') || spec.fontFamily.includes('serif') || spec.fontFamily.includes('monospace'), `${id}/${role} fallback`);
      assert.ok(spec.weight >= 400 && spec.weight <= 800, `${id}/${role} weight`);
      assert.ok(spec.lineHeight >= 1 && spec.lineHeight <= 1.8, `${id}/${role} line height`);
      assert.ok(Number.isFinite(spec.trackingEm), `${id}/${role} tracking`);
      assert.match(spec.size, /clamp\(/, `${id}/${role} fluid size`);
    }
    const css = renderMaterialTypeCSS(id);
    for (const role of Object.keys(preset.roles)) {
      assert.match(css, new RegExp(`--mt-${role}:`));
      assert.ok(css.includes(`font-size:calc(var(--mt-${role}) * var(--mt-density-factor) * var(--mt-viewport-factor))`), `${id}/${role} density and viewport relation`);
    }
    assert.match(css, /@media\s*\(max-width:\s*720px\)/);
    assert.match(css, /data-density="compact"/);
    assert.match(css, /--mt-viewport-factor/);
  }
});

test('multilingual corpus covers requested copy and declares expected wrap or overflow behavior', () => {
  const corpus = MULTILINGUAL_TYPE_CORPUS;
  const corpusText = corpus.map(item => item.text).join('\n');
  assert.deepEqual([...new Set(corpus.map(item => item.role))].sort(), ['body', 'caption', 'code', 'display', 'heading', 'label', 'numeric']);
  for (const sample of ['The quick brown fox jumps over the lazy dog.', '다람쥐 헌 쳇바퀴에 타고파.', 'USD 1,234,567.89', '₩1,234,500', '12.75%', '2026-11-22', 'const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);', '한글한국어무공백긴문자열넘침확인용']) {
    assert.ok(corpusText.includes(sample), `corpus sample: ${sample}`);
  }
  assert.ok(corpus.every(item => item.role && ['wrap', 'nowrap', 'scroll'].includes(item.policy)));
  assert.ok(corpus.some(item => item.text.includes('한글') && item.policy === 'wrap'));
  assert.ok(corpus.some(item => item.text.includes('₩') && item.role === 'numeric'));
});

test('role materials register through the contract with actual fonts, render entry points and verified evidence', () => {
  const registry = createRegistry();
  registerMaterialType(registry);
  const materials = registry.byKind('type-role-preset');
  assert.equal(materials.length, 4);
  assert.deepEqual(registry.check(), []);
  for (const material of materials) {
    assert.equal(material.quality.status, 'verified');
    assert.ok(material.quality.evidence.some(ref => ref.startsWith('tests/material-type.test.mjs:')));
    assert.equal(material.preset, true);
    assert.equal(material.render.export, 'renderMaterialTypeCSS');
    assert.ok(material.ext.fonts.length >= 2);
    assert.deepEqual(Object.keys(material.ext.roles).sort(), ['body', 'caption', 'code', 'display', 'heading', 'label', 'numeric']);
  }
});

test('rendered specimen includes the reusable corpus and all four real CSS presets', () => {
  const html = renderMaterialTypeExample();
  for (const id of Object.keys(MATERIAL_TYPE_PRESETS)) assert.match(html, new RegExp(`data-preset="${id}"`));
  for (const {text} of MULTILINGUAL_TYPE_CORPUS) assert.ok(html.includes(text.replaceAll('&', '&amp;')));
  assert.match(html, /overflow-x:auto/);
  assert.match(html, /word-break:keep-all/);
});

test('checked-in browser specimen is rendered from the same reusable module', () => {
  const html = renderMaterialTypeExample();
  assert.equal(readFileSync(new URL('../docs/materials/typography-corpus.html', import.meta.url), 'utf8'), html);
});
