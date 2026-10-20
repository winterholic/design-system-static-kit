import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, palettes, templateList, templates, createBlueprint, layoutSlots, applyLayout, layoutOptionsOf, layoutSlotIds, axes, styleAxes} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {layoutFrame, DEVICES} from '../src/workbench/viewport.mjs';
import {optionState, chooseAxis, AXIS_GROUPS, SHORT, isSegmented} from '../src/workbench/axes.mjs';
import {listPalettes, compactLikes, familyCounts} from '../src/workbench/palette-picker.mjs';

test('layout variants: every offered option changes the template, keeps it valid, and never mutates the source', () => {
  let options = 0;
  for (const t of templateList) {
    const before = JSON.stringify(t.tree), slots = layoutOptionsOf(t.id);
    for (const slot of slots) {
      assert.ok(layoutSlotIds.includes(slot.id) && slot.label && slot.options.length >= 1, t.id + ' ' + slot.id);
      for (const o of slot.options) {
        options++;
        const tree = applyLayout(t.tree, {[slot.id]: o.id});
        assert.notEqual(JSON.stringify(tree), before, `${t.id} ${slot.id}=${o.id} must change something`);
        const b = createBlueprint(t.id, t.theme, undefined, {layout: {[slot.id]: o.id}}), r = validateBlueprint(b);
        assert.ok(r.valid, `${t.id} ${slot.id}=${o.id}: ` + JSON.stringify(r.errors[0]));
      }
    }
    assert.equal(JSON.stringify(t.tree), before, t.id + ' source tree untouched');
  }
  assert.ok(options >= 300, 'at least 300 layout options across templates, got ' + options);
  assert.ok(templateList.filter(t => layoutOptionsOf(t.id).length >= 3).length >= 40, 'most templates offer 3+ choice slots');
});

test('layout variants: choices compose, "default" is a no-op, unknown choices are errors, and the hero swap respects hero rules', () => {
  const t = templates['saas-landing'];
  assert.deepEqual(applyLayout(t.tree, {hero: 'default'}), t.tree);
  assert.throws(() => applyLayout(t.tree, {hero: 'nope'}), /Unknown layout choice/);
  assert.throws(() => applyLayout(t.tree, {nope: 'x'}), /Unknown layout choice/);
  const slots = layoutSlots(t.tree), all = Object.fromEntries(slots.map(s => [s.id, s.options.at(-1).id]));
  const b = createBlueprint('saas-landing', 'trust', undefined, {layout: all}); assert.ok(validateBlueprint(b).valid); compile(b);
  for (const variant of ['statement', 'split', 'centered', 'cover', 'product']) {
    const hero = applyLayout(t.tree, {hero: variant}).find(n => n.type === 'hero');
    assert.ok(hero.variant === variant || t.tree.find(n => n.type === 'hero').variant === variant);
    if (!['split', 'product'].includes(hero.variant)) assert.ok(!('visual' in hero) && !('motif' in hero), variant + ' drops visual-only fields');
    if (!['statement', 'cover', 'centered'].includes(hero.variant)) assert.ok(!('facts' in hero), variant + ' drops facts');
  }
});

test('layout variants: the number of distinct template compositions is large and counted from the data', () => {
  let compositions = 0n;
  for (const t of templateList) { let n = 1n; for (const s of layoutOptionsOf(t.id)) n *= BigInt(s.options.length + 1); compositions += n; }
  assert.ok(compositions > 4000n, String(compositions));
});

test('every template has an own theme that wears it, and 25 templates were added in round 5', () => {
  assert.ok(templateList.length >= 85);
  for (const id of ['b2b-solution', 'devtool-landing', 'wedding-invite', 'sales-dashboard', 'api-reference', 'news-home', 'support-queue', 'recipe-detail']) assert.ok(templates[id], id);
  for (const t of templateList) assert.ok(themes[t.theme], t.id);
});

test('viewport: fixed device widths scale to fit instead of overflowing or clipping', () => {
  const area = {areaWidth: 700, areaHeight: 640};
  const desktop = layoutFrame({device: 'desktop', ...area});
  assert.equal(desktop.frameW, 1280); assert.ok(desktop.scale < 0.55 && desktop.scale > 0.45, 'desktop 1280 shrinks into 700px: ' + desktop.scale);
  assert.ok(desktop.shellW <= area.areaWidth, 'shell fits the area width: ' + desktop.shellW);
  const phone = layoutFrame({device: 'phone', areaWidth: 360, areaHeight: 640});
  assert.equal(phone.frameW, 390); assert.ok(phone.scale < 1 && phone.shellW <= 360);
  const fit = layoutFrame({device: 'fit', ...area});
  assert.equal(fit.scale, 1); assert.ok(fit.shellW <= area.areaWidth);
  const wide = layoutFrame({device: 'desktop', areaWidth: 1800, areaHeight: 900});
  assert.equal(wide.scale, 1, 'never magnifies past 100%'); assert.ok(wide.shellW <= 1800);
  for (const device of Object.keys(DEVICES)) for (const w of [320, 600, 1000, 1600]) { const r = layoutFrame({device, areaWidth: w, areaHeight: 700}); assert.ok(r.shellW <= Math.max(w, 240) + 1, `${device}@${w}`); assert.ok(r.frameH >= 320); }
});

test('axis controls: theme bans block, rule conflicts adjust the other axis, and the chosen value always wins', () => {
  const b = createBlueprint('about-team', 'civic'), t = themes.civic;
  assert.equal(optionState(b, t, 'backdrop', 'gradient').blocked, true, 'civic forbids gradient');
  assert.equal(optionState(b, t, 'backdrop', 'plain').blocked, undefined);
  const dense = chooseAxis({...b, density: 'comfortable', shell: 'topbar'}, 'density', 'compact');
  assert.equal(dense.blueprint.density, 'compact');
  const dock = chooseAxis({...b, density: 'compact', shell: 'topbar'}, 'shell', 'dock');
  assert.equal(dock.blueprint.shell, 'dock'); assert.ok(dock.adjusted.includes('density'), 'X01 moves density');
  assert.ok(optionState({...b, density: 'compact'}, t, 'shell', 'dock').conflict?.id === 'X01');
  // groups list every style axis exactly once
  assert.deepEqual(AXIS_GROUPS.flatMap(g => g.keys).sort(), [...styleAxes].sort());
  for (const k of Object.keys(SHORT)) assert.deepEqual(Object.keys(SHORT[k]).sort(), [...axes[k]].sort(), k);
  assert.ok(isSegmented('density') && !isSegmented('shell'));
});

test('palette picker: recommendations lead, filters narrow, search finds, the selection is always shown', () => {
  const rec = listPalettes({themeId: 'workspace', family: 'recommended', query: '', selected: null});
  assert.deepEqual(rec.map(p => p.id), themes.workspace.palettes);
  const all = listPalettes({themeId: 'workspace', family: 'all', query: '', selected: null});
  assert.equal(all.length, Object.keys(palettes).length); assert.deepEqual(all.slice(0, rec.length).map(p => p.id), rec.map(p => p.id));
  const greens = listPalettes({themeId: 'workspace', family: 'green', query: '', selected: null});
  assert.ok(greens.length >= 8 && greens.every(p => p.family === 'green'));
  const pinned = listPalettes({themeId: 'workspace', family: 'red', query: '', selected: 'forest'});
  assert.equal(pinned[0].id, 'forest', 'selected palette outside the filter stays visible');
  assert.ok(listPalettes({themeId: 'workspace', family: 'all', query: 'ocean', selected: null}).every(p => /ocean/i.test(p.name + p.label + p.id)));
  assert.equal(compactLikes(124400), '12만'); assert.equal(compactLikes(8400), '8.4천'); assert.equal(compactLikes(null), '');
  const counts = familyCounts('workspace'); assert.equal(counts.all, Object.keys(palettes).length);
});

test('calendar renders a compact agenda for narrow containers and stepper labels can collapse', () => {
  const b = createBlueprint('calendar-view'), html = compile(b).html;
  assert.match(html, /class="kit-cal-agenda" aria-hidden="true"/); assert.match(html, /@container \(max-width:560px\)/);
  const s = compile(createBlueprint('onboarding-wizard')).html; assert.match(s, /class="kit-step-label"/);
});
