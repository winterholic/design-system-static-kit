import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlatform, bindColor, bindType, requiredVars} from '../src/platform/index.mjs';
import {lintSpacing, spaceVars, TOKEN, SPACE} from '../src/spacing.mjs';
import {colorContrast} from '../src/color-tokens.mjs';
import {
  STYLE_CONTEXTS, STYLE_MATERIALS, checkStyleMaterials, listStyleMaterials, styleMaterialById, rankStyleMaterials, assembleStyleMaterials, renderStyleMaterialSamples,
} from '../src/platform/data/style-contexts.mjs';
import {SURFACES, SURFACE_FACETS, surfaceCSS, renderSurfaceSample} from '../src/platform/data/surfaces.mjs';
import {MOTIONS, MOTION_PATTERNS, motionCSS, renderMotionSample, MOTION_STATES, validateMotion} from '../src/platform/data/motion.mjs';
import {BACKGROUNDS, backgroundCSS, stopColor, renderBackgroundSample, validateBackground} from '../src/platform/data/backgrounds.mjs';
import {MEDIA, mediaCSS, renderMedia} from '../src/platform/data/media.mjs';
import {STATE_PATTERNS, STATE_KINDS, stateCSS, renderState} from '../src/platform/data/states.mjs';
import {SPACING_MATERIALS, spacingCSS, renderSpacingSample} from '../src/platform/data/spacing.mjs';
import {ICON_MATERIALS, iconCSS, renderAreaIcon, validateIconMaterial} from '../src/platform/data/icons.mjs';

const env = createPlatform();
const palette = env.registry.get('palette:static-kit');
const COLORS = ['standard', 'tinted'].flatMap(set => ['light', 'dark'].map(mode => ({set, mode, color: bindColor(palette, env.registry.get(`subtoken-set:${set}`), mode)})));
const typeVars = bindType(env.registry.get('type-system:tech-erp')).vars;
const rootVars = (density, color) => ({...color.vars, '--kit-shade': 'color-mix(in srgb,var(--kit-text) 14%,transparent)', ...typeVars, ...Object.fromEntries(spaceVars(density).split(';').map(d => d.split(':')))});
const declared = css => new Set([...css.matchAll(/(--[A-Za-z0-9-]+):/g)].map(m => m[1]));
const missingVars = (css, root) => requiredVars(css).filter(v => !declared(css).has(v) && !Object.hasOwn(root, v));
const differs = (a, b, keys) => keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

test('every style material kind registers complete presets, and every state has at least two patterns', () => {
  assert.deepEqual(checkStyleMaterials(), []);
  assert.deepEqual(Object.keys(STYLE_MATERIALS), ['surface', 'motion', 'background', 'media', 'state-pattern', 'spacing', 'icon']);
  for (const [kind, list] of Object.entries(STYLE_MATERIALS)) assert.ok(list.length >= 2, `${kind}: ${list.length}`);
  for (const st of STATE_KINDS) assert.ok(STATE_PATTERNS.filter(m => m.state === st).length >= 2, `state ${st}`);
  assert.ok(MOTIONS.length >= 3 && SURFACES.length >= 4 && MEDIA.length >= 4);
  assert.equal(BACKGROUNDS.length, 13, 'every §9.5 background pattern has its own preset (Tinted is a plain tint, Dot Pattern is the dotted one)');
  assert.equal(styleMaterialById('surface:soft-layered').kind, 'surface');
  assert.equal(listStyleMaterials('surface').length, SURFACES.length);
  for (const m of Object.values(STYLE_MATERIALS).flat()) assert.ok(m.source.license === 'internal' && m.id === `${m.kind}:${m.id.split(':')[1]}`);
});

test('foundation spacing and icon-area materials are first-class registry entries that affect compiled CSS', async () => {
  const {STYLE_MATERIAL_KINDS: kinds} = await import('../src/platform/contract.mjs');
  const {SPACING_MATERIALS, spacingCSS} = await import('../src/platform/data/spacing.mjs');
  const {ICON_MATERIALS, iconCSS} = await import('../src/platform/data/icons.mjs');
  const {styleMaterialsCSS} = await import('../src/platform/style-materials.mjs');
  assert.ok(kinds.includes('spacing') && kinds.includes('icon'));
  assert.deepEqual(SPACING_MATERIALS.map(x => x.id), ['spacing:compact', 'spacing:comfortable', 'spacing:spacious']);
  assert.deepEqual(ICON_MATERIALS.map(x => x.area), ['navigation', 'action', 'editing', 'status', 'communication', 'files', 'media', 'commerce', 'finance', 'analytics', 'developer', 'user', 'settings', 'calendar', 'security', 'accessibility']);
  const env = createPlatform();
  for (const m of [...SPACING_MATERIALS, ...ICON_MATERIALS]) assert.equal(env.registry.get(m.id)?.id, m.id, `${m.id} is in the shared registry`);
  for (const m of SPACING_MATERIALS) assert.ok(spacingCSS(m).includes(`--kit-band:${m.tokens.band}px`));
  for (const m of ICON_MATERIALS) assert.ok(iconCSS(m).includes(`--kit-icon-size:${m.size}px`));
  const compiled = styleMaterialsCSS(env.registry, {spacing: 'spacing:compact', icons: ['icon:area-navigation']});
  assert.match(compiled, /data-density="compact"/);
  assert.match(compiled, /data-icon-area="navigation"/);
  assert.notEqual(spacingCSS(SPACING_MATERIALS[0]), spacingCSS(SPACING_MATERIALS[1]));
  assert.notEqual(iconCSS(ICON_MATERIALS[0]), iconCSS(ICON_MATERIALS[1]));
  assert.match(renderAreaIcon(ICON_MATERIALS[0], {symbol: 'home'}), /aria-hidden="true"/);
  assert.match(renderAreaIcon(ICON_MATERIALS[0], {symbol: 'home', label: '홈'}), /role="img" aria-label="홈"/);
  assert.throws(() => renderAreaIcon(ICON_MATERIALS[0], {symbol: 'credit-card'}), RangeError, 'area membership is enforced at render time');
  assert.match(compiled, /--kit-control:40px/);
  const glass = BACKGROUNDS.find(x => x.id === 'background:frosted-pane');
  assert.match(backgroundCSS(glass), /backdrop-filter:blur\(12px\)/);
  assert.ok(validateBackground({...glass, deco: {...glass.deco, blur: 20}}).some(e => e.code === 'P_BG_BLUR_LIMIT'));
  const {assembleDesign} = await import('../src/service/assemble-design.mjs');
  const page = assembleDesign({purpose: 'work-dashboard', candidates: 1, content: {title: '운영', kpis: [{label: '매출', value: '100'}, {label: '주문', value: '20'}]}}, {include: ['css', 'blueprint']});
  assert.equal(page.ok, true, JSON.stringify(page.errors));
  const candidate = page.value.candidates[0];
  const density = candidate.value.blueprint.density;
  assert.ok(candidate.value.css.includes(`[data-density="${density}"]`));
  assert.ok(candidate.value.css.includes(`--kit-band:${SPACE[density].band}px`));
});

test('presets of one kind are visibly different from each other, not recolored copies', () => {
  const pairs = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));
  for (const [a, b] of pairs(SURFACES)) {
    const cells = l => Object.entries(l.levels).flatMap(([lv, x]) => [`${lv}.radius=${x.radius}`, `${lv}.elevation=${x.elevation}`, `${lv}.fill=${x.fill}`]);
    const ca = cells(a), cb = new Set(cells(b));
    assert.ok(ca.filter(c => !cb.has(c)).length >= 3, `${a.id} vs ${b.id}: at least 3 of 9 level cells differ`);
  }
  assert.equal(SURFACE_FACETS.length, 17);
  for (const [a, b] of pairs(SURFACE_FACETS)) assert.notDeepEqual([a.radius, a.border, a.elevation], [b.radius, b.border, b.elevation], `${a.id} vs ${b.id}`);
  for (const [a, b] of pairs(MOTIONS)) assert.ok(differs(a, b, ['duration', 'easing', 'lift', 'enterY']).length >= 3, `${a.id} vs ${b.id}`);
  for (const [a, b] of pairs(BACKGROUNDS)) assert.ok(differs({...a, deco: a.deco.kind, backdrop: a.axes.backdrop, page: a.page}, {...b, deco: b.deco.kind, backdrop: b.axes.backdrop, page: b.page}, ['deco', 'backdrop', 'page']).length >= 1, `${a.id} vs ${b.id}`);
  for (const [a, b] of pairs(MEDIA)) assert.ok(differs({tile: a.tile.shape, ratio: a.photo.ratio, radius: a.photo.radius, cap: a.caption, icon: a.icon.style}, {tile: b.tile.shape, ratio: b.photo.ratio, radius: b.photo.radius, cap: b.caption, icon: b.icon.style}, ['tile', 'ratio', 'radius', 'cap', 'icon']).length >= 3, `${a.id} vs ${b.id}`);
  for (const [a, b] of pairs(SPACING_MATERIALS)) assert.ok(Object.keys(a.tokens).filter(k => a.tokens[k] !== b.tokens[k]).length >= 3, `${a.id} vs ${b.id}`);
  for (const [a, b] of pairs(ICON_MATERIALS)) assert.ok(a.symbols.filter(name => !b.symbols.includes(name)).length >= 3, `${a.id} vs ${b.id}`);
  assert.equal(new Set(MEDIA.map(m => m.icon.style)).size, MEDIA.length, 'each media preset implements a different icon style');
  for (const st of STATE_KINDS) {
    const two = STATE_PATTERNS.filter(m => m.state === st);
    for (const [a, b] of pairs(two)) assert.ok(a.layout !== b.layout && JSON.stringify(a.parts) !== JSON.stringify(b.parts), `${a.id} vs ${b.id}: layout and parts differ`);
  }
});

test('changing foundation material values changes compiled CSS', () => {
  const clone = value => structuredClone(value);
  const changedSpace = clone(SPACING_MATERIALS[0]); changedSpace.tokens.band += 4;
  assert.notEqual(spacingCSS(SPACING_MATERIALS[0]), spacingCSS(changedSpace));
  const changedIcon = clone(ICON_MATERIALS[0]); changedIcon.strokeWidth += .5;
  assert.notEqual(iconCSS(ICON_MATERIALS[0]), iconCSS(changedIcon));
  const changedIconSymbols = clone(ICON_MATERIALS[0]); changedIconSymbols.symbols[0] = 'edit';
  assert.notEqual(iconCSS(ICON_MATERIALS[0]), iconCSS(changedIconSymbols));
  const changedSurface = clone(SURFACES[0]); changedSurface.levels.base.radius = 'square';
  assert.notEqual(surfaceCSS(SURFACES[0]), surfaceCSS(changedSurface));
  const changedFacet = clone(SURFACES[0]); changedFacet.facets[0].radius = '8px';
  assert.notEqual(surfaceCSS(SURFACES[0]), surfaceCSS(changedFacet));
  const changedMotion = clone(MOTIONS[0]); changedMotion.duration.fast += 4;
  assert.notEqual(motionCSS(MOTIONS[0]), motionCSS(changedMotion));
  const changedMotionPattern = clone(MOTIONS[0]); changedMotionPattern.patterns[0].delay += 10;
  assert.notEqual(motionCSS(MOTIONS[0]), motionCSS(changedMotionPattern));
  const changedBackground = clone(BACKGROUNDS[0]); changedBackground.page.background = 'var(--kit-soft)';
  assert.notEqual(backgroundCSS(BACKGROUNDS[0]), backgroundCSS(changedBackground));
  const changedMedia = clone(MEDIA[0]); changedMedia.photo.ratio = '1 / 1';
  assert.notEqual(mediaCSS(MEDIA[0]), mediaCSS(changedMedia));
  const state = STATE_PATTERNS.find(x => x.id === 'state-pattern:error-panel');
  const changedState = clone(state); changedState.axes.density = 'spacious';
  assert.notEqual(stateCSS(state), stateCSS(changedState));
  changedState.tone = 'warning';
  assert.notEqual(stateCSS(state), stateCSS(changedState));
});

test('every preset outputs real CSS and markup that passes the spacing contract and reads only variables something defines', () => {
  const tokenSet = new Set(Object.values(TOKEN));
  for (const m of Object.values(STYLE_MATERIALS).flat()) {
    const css = {surface: surfaceCSS, motion: motionCSS, background: backgroundCSS, media: mediaCSS, 'state-pattern': stateCSS, spacing: spacingCSS, icon: iconCSS}[m.kind](m);
    const scope = {surface: 'data-surface', motion: 'data-motion', background: 'data-bg', media: 'data-media', 'state-pattern': 'data-pattern', spacing: 'data-density', icon: 'data-icon-area'}[m.kind];
    const key = m.kind === 'icon' ? m.area : m.id.slice(m.kind.length + 1);
    assert.ok(css.includes(`[${scope}="${key}"]`), `${m.id}: the CSS is scoped to its own [${scope}="${key}"]`);
    assert.ok((css.match(/\{/g) ?? []).length >= 3, `${m.id}: more than a stub rule`);
    assert.deepEqual(lintSpacing(css), [], `${m.id}: padding/margin/gap use the spacing scale only`);
    for (const [, tok] of css.matchAll(/var\((--kit-(?:sp-[a-z-]+|gap|inset|section|band|control))\)/g)) assert.ok(tokenSet.has(tok), `${m.id}: ${tok} is a spacing token`);
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b(?!\s*0%)/, `${m.id}: no hard-coded hex colors`);
    assert.equal(css, {surface: surfaceCSS, motion: motionCSS, background: backgroundCSS, media: mediaCSS, 'state-pattern': stateCSS, spacing: spacingCSS, icon: iconCSS}[m.kind](m), 'deterministic');
  }
  const root = rootVars('comfortable', COLORS[0].color);
  const all = [...SURFACES.map(surfaceCSS), ...MOTIONS.map(motionCSS), ...BACKGROUNDS.map(backgroundCSS), ...MEDIA.map(mediaCSS), ...STATE_PATTERNS.map(stateCSS), ...SPACING_MATERIALS.map(spacingCSS), ...ICON_MATERIALS.map(iconCSS)].join('\n');
  assert.deepEqual(missingVars(all, root), [], 'every variable a preset reads is a color role, a spacing/type token, or defined by a preset');
  assert.match(renderSurfaceSample(SURFACES[0]), /data-surface="hairline-panel"[\s\S]*data-level="base"[\s\S]*data-level="raised"[\s\S]*data-level="overlay"/);
  assert.match(renderBackgroundSample(BACKGROUNDS[1]), /class="kit-deco" aria-hidden="true"/);
  assert.doesNotMatch(renderBackgroundSample(BACKGROUNDS[0]), /kit-deco/, 'a plain background has no decoration element');
  const motionHTML = renderMotionSample(MOTIONS[0]);
  for (const s of MOTION_STATES) assert.match(motionHTML, new RegExp(`data-motion-state="${s}"`));
  for (const p of MOTION_PATTERNS) assert.match(motionHTML, new RegExp(`data-motion-pattern="${p.id}"`));
});

test('motion presets give every state transition a duration and easing, and respect reduced motion', () => {
  assert.equal(MOTION_PATTERNS.length, 15);
  for (const m of MOTIONS) {
    const css = motionCSS(m);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/, m.id);
    for (const s of MOTION_STATES) assert.match(css, new RegExp(`\\[data-motion-state="${s}"\\]\\{transition:`), `${m.id}: ${s}`);
    assert.match(css, new RegExp(`--kit-m-base:${m.duration.base}ms`));
    assert.match(css, new RegExp(`--kit-lift:${m.lift}`), 'the existing --kit-lift/--kit-dur variables follow the preset');
    for (const p of MOTION_PATTERNS) assert.match(css, new RegExp(`data-motion-pattern="${p.id}"`), `${m.id}: ${p.id} purpose pattern`);
    assert.match(css, /transition-delay:0ms!important/, 'reduced motion clears deliberate entry delays');
  }
  const still = motionCSS(MOTIONS.find(m => m.id === 'motion:still'));
  assert.doesNotMatch(still, /@keyframes|animation:/, 'a still preset never animates');
  assert.match(motionCSS(MOTIONS[2]), /cubic-bezier\(0\.34,1\.4,0\.64,1\)/, 'the expressive enter curve overshoots');
});

test('preset color pairs meet their minimum contrast on the bound palette × subtoken set in light and dark', () => {
  for (const {set, mode, color} of COLORS) {
    assert.ok(color.ok, `${set}/${mode}`);
    for (const m of Object.values(STYLE_MATERIALS).flat()) for (const [fg, bg, min] of m.pairs ?? []) {
      const ratio = colorContrast(color.roles[fg], color.roles[bg]);
      assert.ok(ratio >= min, `${m.id} ${set}/${mode}: ${fg} on ${bg} ${ratio.toFixed(2)} < ${min}`);
    }
    for (const m of BACKGROUNDS) for (const stop of m.stops) for (const [fg, min] of [['text', 4.5], ['muted', 4.5]]) {
      const bg = stopColor(stop, color.roles), ratio = colorContrast(color.roles[fg], bg);
      assert.ok(ratio >= min, `${m.id} ${set}/${mode}: ${fg} on stop ${JSON.stringify(stop)} ${ratio.toFixed(2)}`);
    }
    for (const m of MEDIA.filter(x => x.photo.scrim)) {
      const ratio = colorContrast(color.roles.canvas, stopColor(['text', m.photo.scrim, 'canvas'], color.roles));
      assert.ok(ratio >= 4.5, `${m.id} ${set}/${mode}: caption over the scrim ${ratio.toFixed(2)}`);
    }
  }
});

test('state patterns announce themselves by role, keep text and icon together, and escape input', () => {
  for (const m of STATE_PATTERNS) {
    const html = renderState(m, {title: '<b>제목</b>', body: 'a & b', action: {label: '다시 시도', href: '#retry'}, details: 'REF-<1>'});
    assert.match(html, new RegExp(`role="${m.state === 'error' ? 'alert' : 'status'}"`), m.id);
    assert.match(html, new RegExp(`aria-live="${m.state === 'error' ? 'assertive' : 'polite'}"`));
    assert.equal(/aria-busy="true"/.test(html), m.state === 'loading', `${m.id}: only loading is busy`);
    assert.doesNotMatch(html, /<b>/, 'title is escaped');
    if (m.parts.includes('icon')) assert.match(html, /<svg class="kit-icon"/);
    if (m.state !== 'loading' && m.parts.includes('title')) assert.match(html, /&lt;b&gt;/);
    if (m.state === 'loading') assert.match(html, /class="kit-sr"/, 'a hidden status text accompanies the skeleton/spinner');
    assert.doesNotMatch(html, /<section[^>]*><\/section>/);
  }
  const panel = renderState(STATE_PATTERNS.find(m => m.id === 'state-pattern:error-panel'), {details: 'REF-1'});
  assert.match(panel, /<details><summary>자세히 보기<\/summary><code>REF-1<\/code><\/details>/);
  assert.throws(() => renderState(STATE_PATTERNS[0], {action: {label: 'x', href: 'javascript:alert(1)'}}), RangeError);
  assert.throws(() => renderState(STATE_PATTERNS[0], {level: 9}), RangeError);
  assert.match(renderState(STATE_PATTERNS[0], {level: 2}), /<h2 class="kit-state-title">/);
});

test('media markup requires alt text for images and rejects unsafe addresses', () => {
  assert.match(renderMedia(MEDIA[0], {title: '사진', caption: '설명'}), /role="img" aria-label="사진"/);
  assert.match(renderMedia(MEDIA[0], {title: '사진', src: 'https://example.com/a.jpg', alt: '설명'}), /<img src="https:\/\/example\.com\/a\.jpg" alt="설명" loading="lazy">/);
  assert.throws(() => renderMedia(MEDIA[0], {title: '사진', src: 'https://example.com/a.jpg'}), /alt/);
  assert.throws(() => renderMedia(MEDIA[0], {title: '사진', src: 'javascript:alert(1)', alt: 'x'}), /src/);
  assert.throws(() => renderMedia(MEDIA[0], {title: '사진', src: '//evil.example/a.jpg', alt: 'x'}), /src/);
  assert.match(renderMedia(MEDIA[1], {title: '커버', caption: '<i>설명</i>'}), /<figcaption>&lt;i&gt;설명&lt;\/i&gt;<\/figcaption><\/div>/, 'overlay caption sits inside the photo');
});

test('style contexts rank the presets: the same preset is reused by several themes and one theme gets more than one choice', () => {
  for (const sc of STYLE_CONTEXTS) for (const kind of Object.keys(STYLE_MATERIALS)) for (const state of kind === 'state-pattern' ? STATE_KINDS : [undefined]) {
    for (const context of sc.contexts) {
      const r = rankStyleMaterials(sc, {kind, context, state});
      if (r.ranked.length === 0) assert.ok(r.reasons.length > 0 && r.reasons.every(x => x.code && x.id), `${sc.id}/${context}/${kind}/${state}: an empty ranking explains itself`);
    }
  }
  const tops = kind => STYLE_CONTEXTS.map(sc => rankStyleMaterials(sc, {kind}).ranked[0].id);
  for (const kind of ['surface', 'motion', 'background', 'media']) {
    const t = tops(kind);
    assert.ok(new Set(t).size >= 3, `${kind}: top-1 differs across themes (${new Set(t).size})`);
    assert.ok(new Set(t).size < t.length, `${kind}: presets are shared across themes`);
  }
  const multi = STYLE_CONTEXTS.filter(sc => rankStyleMaterials(sc, {kind: 'surface'}).ranked.length >= 2).length;
  assert.ok(multi >= 27, `at least half of the contexts have two or more surface choices (${multi})`);
  const ledger = id => rankStyleMaterials('style-context:ledger', {kind: id});
  assert.equal(ledger('surface').ranked[0].id, 'surface:hairline-panel');
  assert.ok(ledger('surface').blocked.some(b => b.id === 'surface:glow-glass' && b.blocked[0].code === 'P_REL_STYLE_FORBID'), 'ledger bans glow and lifted');
  assert.equal(ledger('motion').ranked[0].id, 'motion:still');
  assert.ok(ledger('motion').blocked.some(b => b.id === 'motion:expressive'), 'ledger bans lively motion');
  assert.deepEqual(rankStyleMaterials('style-context:brutalist', {kind: 'surface'}).ranked.map(r => r.id), ['surface:hard-offset'], 'brutalist bans every other elevation');
  assert.throws(() => rankStyleMaterials('style-context:nope', {kind: 'surface'}), RangeError);
});

test('assembleStyleMaterials picks the top-ranked presets, keeps explicit requests, and refuses banned or unknown ones', () => {
  const run = (patch = {}) => assembleStyleMaterials({styleContext: 'style-context:ledger', context: 'dashboard', ...patch});
  const base = run();
  assert.equal(base.ok, true, JSON.stringify(base.diagnostics));
  assert.deepEqual(base.selection, {surface: 'surface:hairline-panel', motion: 'motion:still', background: base.selection.background, media: base.selection.media, spacing: 'spacing:compact', icons: [], states: base.selection.states});
  assert.deepEqual(Object.keys(base.selection.states), STATE_KINDS);
  assert.ok(base.decisions.every(d => d.source === 'recommend' && d.reasons.length >= 1));
  assert.equal(JSON.stringify(run()), JSON.stringify(base), 'deterministic');
  assert.ok(base.css.includes(surfaceCSS(styleMaterialById(base.selection.surface))) && lintSpacing(base.css).length === 0);
  assert.deepEqual(missingVars(base.css, rootVars('compact', COLORS[0].color)), []);
  assert.match(renderStyleMaterialSamples(base.selection).states.error, /role="alert"/);

  const asked = assembleStyleMaterials({styleContext: 'style-context:ledger', context: 'settings', surface: 'surface:tonal-sheet', states: {empty: 'state-pattern:empty-inline'}});
  assert.equal(asked.ok, true, JSON.stringify(asked.diagnostics));
  assert.deepEqual([asked.selection.surface, asked.selection.states.empty], ['surface:tonal-sheet', 'state-pattern:empty-inline']);
  assert.ok(asked.decisions.find(d => d.slot === 'surface').source === 'request');

  const codes = r => r.diagnostics.map(d => d.code);
  assert.ok(codes(run({surface: 'surface:glow-glass'})).includes('P_REL_STYLE_FORBID'), 'ledger bans glow');
  assert.ok(codes(run({surface: 'surface:nope'})).includes('P_ATTR_UNKNOWN'));
  assert.ok(codes(run({surface: 'motion:calm'})).includes('P_ATTR_KIND'));
  assert.ok(codes(run({states: {empty: 'state-pattern:error-banner'}})).includes('P_ATTR_KIND'), 'a state slot only takes that state');
  assert.ok(codes(assembleStyleMaterials({styleContext: 'style-context:ledger', context: 'landing', motion: 'motion:snappy'})).includes('P_ATTR_CONTEXT'));
  assert.ok(codes(assembleStyleMaterials({styleContext: 'style-context:ledger', context: 'dashboard', css: 'x'})).includes('P_REQUEST_KEY'), 'no free-form CSS path');
  assert.ok(codes(assembleStyleMaterials({styleContext: 'style-context:nope', context: 'dashboard'})).includes('P_ATTR_UNKNOWN'));
  assert.ok(codes(run({states: {idle: 'state-pattern:empty-inline'}})).includes('P_REQUEST_KEY'));
});

test('every style context assembles its presets with CSS that no variable is missing from', () => {
  for (const sc of STYLE_CONTEXTS) for (const context of sc.contexts) {
    const r = assembleStyleMaterials({styleContext: sc.id, context});
    assert.equal(r.ok, true, `${sc.id}/${context}: ${JSON.stringify(r.diagnostics).slice(0, 300)}`);
    const density = sc.axisPreferences.density[0], mode = sc.axisPreferences.density && ['dark'].includes(sc.tags.find(t => t.startsWith('mode-'))?.slice(5)) ? 'dark' : 'light';
    const color = COLORS.find(c => c.set === 'standard' && c.mode === mode).color;
    assert.deepEqual(missingVars(r.css, rootVars(density, color)), [], `${sc.id}/${context}`);
    assert.deepEqual(lintSpacing(r.css), [], `${sc.id}/${context}`);
  }
});

test('the evidence lines of the verified style materials point at test() lines', () => {
  const cache = new Map();
  for (const m of [...Object.values(STYLE_MATERIALS).flat(), ...STYLE_CONTEXTS].filter(x => x.quality.status === 'verified')) for (const ref of m.quality.evidence) {
    const [file, line] = ref.split(':');
    if (!cache.has(file)) cache.set(file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n'));
    assert.match(cache.get(file)[Number(line) - 1] ?? '', /^test\(/, `${m.id}: ${ref}`);
  }
});

const facetRules = css => Object.fromEntries([...css.matchAll(/:is\(\[data-surface-facet="([^"]+)"\],[^{]*\)\{border-radius:([^;]+);border:([^;]+);box-shadow:([^;]+);padding:/g)].map(m => [m[1], {radius: m[2], border: m[3], shadow: m[4]}]));
const shadowBlur = shadow => Math.max(...[...shadow.matchAll(/(?:-?\d+(?:px)?\s+){2}(\d+)px/g)].map(m => Number(m[1])));

test('the 17 surface facets compile to 17 different looks, and elevation steps differ by shadow rather than by name', () => {
  const rules = facetRules(surfaceCSS(SURFACES[0]));
  assert.equal(Object.keys(rules).length, SURFACE_FACETS.length, 'every facet is compiled');
  const seen = new Map();
  for (const [id, r] of Object.entries(rules)) {
    const key = JSON.stringify(r);
    assert.ok(!seen.has(key), `${id} compiles to the same radius, border and shadow as ${seen.get(key)}`);
    seen.set(key, id);
  }
  assert.ok(new Set(['sharp', 'subtle', 'rounded', 'large-rounded', 'pill', 'mixed-radius'].map(id => rules[id].radius)).size === 6, 'the six radius facets have six radii');
  assert.ok(new Set(['hairline-border', 'standard-border', 'strong-border', 'double-border'].map(id => rules[id].border)).size === 4, 'the four border facets have four borders');
  const steps = ['flat-surface', 'subtle-elevation', 'medium-elevation', 'deep-elevation'].map(id => rules[id]);
  assert.equal(new Set(steps.map(r => r.shadow)).size, 4, 'flat, subtle, medium and deep elevation have four shadows');
  assert.ok(shadowBlur(steps[1].shadow) < shadowBlur(steps[2].shadow) && shadowBlur(steps[2].shadow) < shadowBlur(steps[3].shadow), 'shadow blur grows from subtle to medium to deep');
  assert.equal(steps[0].shadow, 'none');
  assert.match(rules.glow.shadow, /color-mix/);
  assert.match(rules.inset.shadow, /^inset /);
  assert.match(rules['hard-offset'].shadow, /^\d+px \d+px 0 /);
  for (const m of SURFACES) assert.deepEqual(facetRules(surfaceCSS(m)), rules, `${m.id} shares the facet primitives`);
  const duplicate = clone => { const c = structuredClone(SURFACES[0]); c.facets = c.facets.map(f => f.id === 'deep-elevation' ? {...f, elevation: 'lifted', radius: '10px'} : f); return c; };
  assert.equal(facetRules(surfaceCSS(duplicate()))['deep-elevation'].shadow, facetRules(surfaceCSS(SURFACES[0]))['medium-elevation'].shadow, 'a regression that gives deep the medium shadow is visible to this check');
});

test('the 15 motion patterns are 15 different recipes, and each one compiles its own reduced-motion policy', () => {
  const recipe = (m, p) => JSON.stringify([[...p.properties].sort(), m.duration[p.duration], p.easing === 'standard' ? m.easing.standard : m.easing[p.easing], p.delay]);
  for (const m of MOTIONS.filter(x => x.id !== 'motion:still')) {
    const seen = new Map();
    for (const p of m.patterns) {
      assert.ok(!seen.has(recipe(m, p)), `${m.id}: ${p.id} is the same recipe as ${seen.get(recipe(m, p))}`);
      seen.set(recipe(m, p), p.id);
    }
  }
  for (const m of MOTIONS) {
    const css = motionCSS(m), reduce = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
    for (const p of m.patterns) {
      const rule = reduce.match(new RegExp(`\\[data-motion-pattern="${p.id}"\\]\\{transition:([^}]+)\\}`))?.[1];
      assert.ok(rule, `${m.id}: ${p.id} has a reduced-motion rule`);
      if (p.reducedMotion === 'fade') assert.equal(rule, 'opacity var(--kit-m-fast) linear 0ms!important', `${p.id} keeps only an opacity cue`);
      else assert.equal(rule, 'none!important', `${p.id} is instant`);
    }
  }
  const policies = new Set(MOTION_PATTERNS.map(p => p.reducedMotion));
  assert.deepEqual([...policies].sort(), ['fade', 'instant'], 'both policies are used, so the field is a decision and not a constant');
  for (const p of MOTION_PATTERNS) assert.ok(p.reducedMotion !== 'fade' || p.properties.includes('opacity'), `${p.id}: fade needs opacity`);
  const flipped = structuredClone(MOTIONS[0]); flipped.patterns[0].reducedMotion = 'fade';
  assert.notEqual(motionCSS(MOTIONS[0]), motionCSS(flipped), 'the policy is consumed by the compiled CSS');
  const bad = structuredClone(MOTIONS[0]); bad.patterns.find(p => p.id === 'press').reducedMotion = 'fade';
  assert.ok(validateMotion(bad).some(e => e.code === 'P_MOTION_PATTERN_REDUCE'), 'fade without opacity is rejected');
});

test('the nine spacing roles read nine different tokens, vary by role instead of by one multiplier, and those tokens are read by compiled pages', async () => {
  const {SPACING_ROLES, validateSpacing} = await import('../src/platform/data/spacing.mjs');
  const {compileBlueprint} = await import('../src/service/index.mjs');
  const edit = await import('../src/edit/index.mjs');
  const {templates} = await import('../src/catalog/index.mjs');
  assert.equal(SPACING_ROLES.length, 9);
  assert.equal(new Set(SPACING_ROLES.map(r => r.token)).size, 9, 'no two roles share a token');
  for (const m of SPACING_MATERIALS) {
    assert.deepEqual(validateSpacing(m), [], m.id);
    for (const r of SPACING_ROLES) assert.ok(spacingCSS(m).includes(`[data-spacing-role="${r.id}"]{${r.prop}:var(${TOKEN[r.token]})}`), `${m.id}: ${r.id} rule`);
  }
  const px = (density, role) => SPACE[density][SPACING_ROLES.find(r => r.id === role).token];
  const ratios = new Set(SPACING_ROLES.map(r => (px('spacious', r.id) / px('compact', r.id)).toFixed(3)));
  assert.ok(ratios.size >= 4, `density is not one multiplier: ${[...ratios]}`);
  for (const r of SPACING_ROLES) assert.ok(px('compact', r.id) <= px('comfortable', r.id) && px('comfortable', r.id) <= px('spacious', r.id), `${r.id} never shrinks as density loosens`);
  const aliased = structuredClone(SPACING_MATERIALS[0]); aliased.roles['list-gap'] = aliased.roles['form-gap'];
  assert.ok(validateSpacing(aliased).some(e => e.code === 'P_SPACING_ROLE_ALIAS'), 'two roles on one token are rejected');
  const swapped = structuredClone(SPACING_MATERIALS[0]); swapped.roles['page-margin'] = 'near';
  assert.notEqual(spacingCSS(SPACING_MATERIALS[0]), spacingCSS(swapped), 'a role mapping is consumed by the compiled CSS');

  let css = '';
  for (const t of Object.keys(templates)) { const made = edit.resetDocument(null, {template: t}); const r = made.ok && compileBlueprint(made.doc, {include: ['css']}); if (r?.ok) css += r.value.css.replace(/[^{}]*data-spacing-role[^{}]*\{[^}]*\}/g, ''); }
  for (const r of SPACING_ROLES) assert.ok(css.includes(`var(${TOKEN[r.token]})`), `${r.id}: no compiled page reads ${TOKEN[r.token]} outside the role rules`);
  assert.match(renderSpacingSample(SPACING_MATERIALS[1]), /data-density="comfortable"[\s\S]*data-spacing-role="icon-text"/);
});

test('icon-area values are drawn: the grid, family, small size and alignment all reach the output', () => {
  const m = ICON_MATERIALS[0];
  const css = iconCSS(m);
  assert.match(css, /vertical-align:var\(--kit-icon-align\)/, 'the alignment variable is read');
  assert.match(css, /--kit-icon-align:middle/);
  assert.match(css, /\[data-icon-size="sm"\]\{width:var\(--kit-icon-min\);height:var\(--kit-icon-min\)\}/);
  assert.ok(m.strokeWidth * m.minSize / m.size >= 1.25, 'a stroke still reads as a line at the smallest size');
  const svg = renderAreaIcon(m, {symbol: 'home', size: 'sm'});
  assert.match(svg, /<svg data-icon-family="original-outline" data-icon-size="sm" class="kit-icon icon-symbol-home" viewBox="0 0 24 24"/);
  assert.match(css, /data-icon-family="original-outline"/, 'the rules only style svgs of this family');
  assert.throws(() => renderAreaIcon({...m, viewBox: '0 0 20 20'}, {symbol: 'home'}), RangeError, 'an icon not drawn on the material grid is refused');
  assert.throws(() => renderAreaIcon(m, {symbol: 'home', size: 'lg'}), RangeError);
  const familyChanged = {...structuredClone(m), family: 'other-outline'};
  assert.notEqual(iconCSS(m), iconCSS(familyChanged), 'the family is consumed by the CSS selector');
  assert.ok(validateIconMaterial({...structuredClone(m), minSize: 12}).some(e => e.code === 'P_ICON_SMALL'));
  assert.ok(validateIconMaterial({...structuredClone(m), strokeWidth: 1}).some(e => e.code === 'P_ICON_SYSTEM' || e.code === 'P_ICON_SMALL'));
  for (const area of ICON_MATERIALS) assert.deepEqual(validateIconMaterial(area), [], area.id);
});

test('the coverage ledger maps all 69 foundation requirements to a real part of a real material, one part each', async () => {
  const {SPACING_ROLES} = await import('../src/platform/data/spacing.mjs');
  const ledger = JSON.parse(readFileSync(new URL('../docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', import.meta.url), 'utf8'));
  const reqs = ledger.requirements.filter(q => q.id.startsWith('req:foundation:'));
  assert.equal(reqs.length, 69);
  const kindOf = q => q.id.split(':')[2];
  const counts = Object.fromEntries(['spacing', 'surface', 'background', 'motion', 'icon'].map(k => [k, reqs.filter(q => kindOf(q) === k).length]));
  assert.deepEqual(counts, {spacing: 9, surface: 17, background: 12, motion: 15, icon: 16});
  const known = {spacing: SPACING_ROLES.map(r => `role:${r.id}`), surface: SURFACE_FACETS.map(f => `facet:${f.id}`), motion: MOTION_PATTERNS.map(p => `pattern:${p.id}`)};
  const materialIds = new Set(ledger.materials.map(x => x.id));
  for (const q of reqs) {
    assert.equal(q.coverage, 'direct', q.id);
    assert.ok(q.materialIds.length === 1 && materialIds.has(q.materialIds[0]), `${q.id} points at a registered material`);
    assert.ok(!q.status.includes('missing') && q.status !== 'metadata-only', `${q.id} is ${q.status}`);
  }
  for (const kind of ['spacing', 'surface', 'motion']) {
    const parts = reqs.filter(q => kindOf(q) === kind).map(q => q.part);
    assert.deepEqual(parts, known[kind], `${kind}: requirement order and parts match the material`);
  }
  const names = kind => reqs.filter(q => kindOf(q) === kind).map(q => q.name);
  assert.deepEqual(names('spacing'), SPACING_ROLES.map(r => r.label), 'the REQUEST sentences are the role labels');
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  assert.deepEqual(names('surface').map(slug), SURFACE_FACETS.map(f => f.id));
  assert.deepEqual(names('motion').map(slug), MOTION_PATTERNS.map(p => p.id));
  assert.deepEqual(reqs.filter(q => kindOf(q) === 'icon').map(q => q.materialIds[0]), ICON_MATERIALS.map(x => x.id), 'every icon area has its own material, in REQUEST order');
  const backgrounds = reqs.filter(q => kindOf(q) === 'background');
  assert.equal(new Set(backgrounds.map(q => q.materialIds[0])).size, backgrounds.length, 'no background material stands for two requirements');
  for (const id of ['spacing:comfortable', ...ICON_MATERIALS.map(x => x.id)]) {
    const record = ledger.materials.find(x => x.id === id);
    assert.ok(record.definitionPath && record.status !== 'metadata-only' && record.status !== 'defined', `${id} is ${record.status} (${record.blockedBy})`);
  }
});
