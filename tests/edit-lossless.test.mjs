import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, palettes, templates, composeBlueprint, applyLayout, layoutSlots, axes} from '../src/catalog.mjs';
import {validateBlueprint} from '../src/validate.mjs';
import {setTheme, setPalette, setAppearance, setLayoutVariant, updateNode, applySequence, checkSequence, contentFingerprint, contentDiff} from '../src/edit/index.mjs';

/** 템플릿 원본 그대로의 문서(자기 테마). 손실 없는 합성이라 편집 연산의 출발점으로 쓴다. */
const pristine = (id, theme) => composeBlueprint(id, theme, undefined, {lossless: true}).blueprint;
const ids = Object.keys(templates), themeIds = Object.keys(themes);
const snapshot = x => JSON.stringify(x);

test('proof: setTheme keeps name, chrome and tree byte-for-byte for every template × theme, or rejects with a structured error', () => {
  let ok = 0, rejected = 0, substituted = 0;
  for (const id of ids) {
    const doc = pristine(id), before = snapshot(doc);
    for (const theme of themeIds) {
      const r = setTheme(doc, {theme});
      assert.equal(snapshot(doc), before, `${id}→${theme}: input untouched`);
      if (r.ok) {
        ok++;
        assert.deepEqual([r.doc.name, r.doc.chrome, r.doc.tree], [doc.name, doc.chrome, doc.tree], `${id}→${theme}: content identical`);
        assert.equal(r.content.preserved, true);
        assert.ok(validateBlueprint(r.doc).valid, `${id}→${theme}: result validates`);
        if (r.warnings.some(w => w.code === 'SHELL_SUBSTITUTED')) substituted++;
      } else {
        rejected++;
        assert.equal(r.doc, doc, 'a rejection hands back the same doc');
        for (const e of r.errors) assert.ok(e.code && e.path && e.message && e.hint, `${id}→${theme}: ${JSON.stringify(e)}`);
      }
    }
  }
  assert.equal(ok + rejected, ids.length * themeIds.length);
  assert.ok(ok >= 4500, 'almost every combination is accepted, got ' + ok);
  assert.ok(substituted > 100, 'nav-preserving shell substitution is exercised, got ' + substituted);
});

test('proof: theme variants, palettes and modes never change content (representative theme × variant × palette × mode per template)', () => {
  let checks = 0;
  for (const id of ids) {
    const doc = pristine(id), base = contentFingerprint(doc);
    for (const theme of Object.values(themes)) {
      const variants = [null, theme.variants[0]?.id, theme.variants.at(-1)?.id].filter((v, i, a) => a.indexOf(v) === i);
      for (const variant of variants) {
        const themed = setTheme(doc, {theme: theme.id, ...(variant ? {variant} : {})});
        if (!themed.ok) { for (const e of themed.errors) assert.ok(e.hint); continue; }
        for (const palette of [theme.palettes[0], theme.palettes.at(-1)]) {
          const p = setPalette(themed.doc, {palette}); assert.ok(p.ok, `${id} ${theme.id} ${palette}`);
          for (const mode of axes.mode) {
            const m = setAppearance(p.doc, {mode, repair: 'auto'});
            checks++;
            if (!m.ok) { for (const e of m.errors) assert.ok(e.hint); continue; }
            assert.deepEqual(contentFingerprint(m.doc), base, `${id} ${theme.id}/${variant} ${palette} ${mode}`);
            assert.deepEqual([m.doc.name, m.doc.chrome, m.doc.tree], [doc.name, doc.chrome, doc.tree]);
          }
        }
      }
    }
    if (checks > 60000) break;
  }
  assert.ok(checks > 5000, 'combinations checked: ' + checks);
});

test('proof: every offered layout option on every template preserves content, refuses the content-dropping hero swap, or relocates it', () => {
  let applied = 0, refused = 0, relocated = 0, legacyLoss = 0;
  for (const id of ids) {
    const doc = pristine(id), base = contentFingerprint(doc), tree = doc.tree.children;
    for (const slot of layoutSlots(tree, doc.pageType, {templateId: id})) for (const option of slot.options) {
      const r = setLayoutVariant(doc, {slot: slot.id, option: option.id});
      const legacy = {...doc, tree: {type: 'page', children: applyLayout(tree, {[slot.id]: option.id}, doc.pageType)}};
      const legacyLost = contentDiff(doc, legacy).missing.length > 0;
      if (legacyLost) legacyLoss++;
      if (r.ok) {
        applied++;
        assert.deepEqual(contentFingerprint(r.doc), base, `${id} ${slot.id}=${option.id}`);
        assert.equal(legacyLost, false, `${id} ${slot.id}=${option.id}: checked path accepted what the legacy path loses`);
        assert.ok(validateBlueprint(r.doc).valid);
      } else {
        refused++;
        assert.deepEqual(r.errors.map(e => e.code), ['LAYOUT_WOULD_DROP_CONTENT'], `${id} ${slot.id}=${option.id}`);
        assert.equal(legacyLost, true, 'only an option the legacy path would have lossily applied is refused');
        const k = setLayoutVariant(doc, {slot: slot.id, option: option.id, contentPolicy: 'relocate'});
        assert.ok(k.ok, JSON.stringify(k.errors));
        assert.deepEqual(contentFingerprint(k.doc), base, `${id} ${slot.id}=${option.id} relocated`);
        assert.ok(k.warnings.some(w => w.code === 'CONTENT_RELOCATED'));
        relocated++;
      }
    }
  }
  assert.ok(applied >= 300, 'layout options applied: ' + applied);
  assert.ok(refused >= 10 && refused === relocated, `facts swaps refused ${refused}, relocated ${relocated}`);
  assert.ok(legacyLoss >= refused, 'the legacy composition path does drop content for these (the bug this layer prevents): ' + legacyLoss);
});

test('proof: several layout variants applied in a row keep content and stay valid (all slots at once, first and last option)', () => {
  let chains = 0;
  for (const id of ids) {
    const doc = pristine(id), base = contentFingerprint(doc);
    for (const pick of [o => o[0], o => o.at(-1)]) {
      const choice = Object.fromEntries(layoutSlots(doc.tree.children, doc.pageType).map(s => [s.id, pick(s.options).id]));
      if (!Object.keys(choice).length) continue;
      const r = setLayoutVariant(doc, {choice, contentPolicy: 'relocate'});
      chains++;
      if (!r.ok) { assert.ok(r.errors.every(e => e.hint), id + JSON.stringify(r.errors)); continue; }
      assert.deepEqual(contentFingerprint(r.doc), base, `${id} ${JSON.stringify(choice)}`);
    }
  }
  assert.ok(chains >= 120, 'chains: ' + chains);
});

test('proof: theme → palette → mode → layout → theme sequence keeps every user edit (the useTheme/useTemplate regression)', () => {
  for (const id of ['saas-landing', 'dashboard-overview', 'article', 'docs-reference', 'agency-home', 'product-listing']) {
    const start = pristine(id);
    const marker = '사용자가 고친 제목 ' + id;
    const edited = updateNode(start, {path: [0], set: {title: marker}});
    assert.ok(edited.ok, id + JSON.stringify(edited.errors));
    const steps = [
      {op: 'setTheme', args: {theme: 'console'}},
      {op: 'setPalette', args: {palette: themes.aurora.palettes[0]}},
      {op: 'setAppearance', args: {mode: 'dark', repair: 'auto'}},
      {op: 'setLayoutVariant', args: {slot: 'cards', option: 'outline'}},
      {op: 'setTheme', args: {theme: 'civic'}},
      {op: 'setTheme', args: {theme: start.theme}},
    ];
    const run = applySequence(edited.doc, steps.filter(s => s.op !== 'setLayoutVariant' || layoutSlots(edited.doc.tree.children, edited.doc.pageType).some(x => x.id === 'cards')));
    assert.ok(run.ok, id + JSON.stringify(run.errors));
    assert.equal(run.doc.tree.children[0].title, marker, id + ': the edit survived every step');
    assert.equal(contentDiff(edited.doc, run.doc).missing.length, 0);
    // 옛 경로: 연산 없이 테마를 바꾸며 Blueprint를 다시 합성하면 편집이 사라진다.
    const regenerated = composeBlueprint(id, 'console').blueprint;
    assert.ok(!JSON.stringify(regenerated).includes(marker));
  }
});

test('integrated check: a long variant sequence on every template ends valid, content-identical and compile-clean (strong contracts)', () => {
  let checked = 0;
  for (const id of ids) {
    const doc = pristine(id), layouts = layoutSlots(doc.tree.children, doc.pageType);
    const steps = [{op: 'setTheme', args: {theme: 'studio', variant: themes.studio.variants[0]?.id}}, {op: 'setPalette', args: {palette: themes.studio.palettes[1]}}, {op: 'setAppearance', args: {mode: 'auto', repair: 'auto'}}];
    for (const s of layouts.slice(0, 3)) steps.push({op: 'setLayoutVariant', args: {slot: s.id, option: s.options[0].id, contentPolicy: 'relocate'}});
    const r = checkSequence(doc, steps);
    if (!r.applied) { assert.ok(r.errors.every(e => e.hint), id + JSON.stringify(r.errors)); continue; }
    checked++;
    assert.deepEqual(r.errors, [], id + ' ' + JSON.stringify(r.errors[0]));
    assert.equal(r.content.preserved, true, id);
    assert.ok(['pass', 'quality'].includes(r.level), id);
  }
  assert.ok(checked >= 80, 'sequences checked: ' + checked);
});
