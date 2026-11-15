import {compositionRules, COMPOSITION_VERSION, PAGE_INTENT} from './catalog/composition.mjs';
import {SPACE, TOKEN} from './spacing.mjs';
import {roleSizes} from './typography.mjs';
import {cplOf, vlOf} from './render/util.mjs';

/** Small ordered decision table over known facts, deliberately not a general expression/rule language. */
export function selectDesign(facts, rules = compositionRules) {
  const values = {}, sources = {}, applied = [], priorities = {};
  for (const rule of [...rules].sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (!Object.entries(rule.when).every(([k, v]) => Array.isArray(v) ? v.includes(facts[k]) : facts[k] === v)) continue;
    applied.push(rule.id);
    for (const [key, value] of Object.entries(rule.set)) {
      if (priorities[key] === rule.priority && values[key] !== value) throw new Error(`Composition conflict: ${sources[key]} / ${rule.id} set ${key}`);
      values[key] = value; sources[key] = rule.id; priorities[key] = rule.priority;
    }
  }
  return {values, sources, applied};
}

const CELL_BUCKETS = [160, 200, 240, 280, 320, 360, 400, 480];
const cellBucket = needed => CELL_BUCKETS.find(x => x >= needed) ?? CELL_BUCKETS.at(-1);
const semantic = n => n.type === 'card' ? n.price ? 'product' : n.author ? 'editorial' : 'feature' : n.type;

/** Compiler-time facts never claim to measure glyphs or know a runtime width. CSS container queries own those decisions. */
export function planComposition(b) {
  if (b.catalogVersion === '2.1.0') return null;
  const byNode = new WeakMap(), decisions = [], space = SPACE[b.density], sizes = roleSizes(b);
  const visit = (node, path, ancestors = [], siblingCount = 1) => {
    const facts = {type: node.type, semantic: semantic(node), intent: PAGE_INTENT[b.pageType] ?? 'general', nested: ancestors.some(x => x.type === 'section'), parent: ancestors.at(-1)?.type ?? null, siblingCount, titleCpl: cplOf(node.title ?? ''), valueLength: node.type === 'metric' ? vlOf(node.value) : 0, density: b.density, typography: b.typography, theme: b.theme};
    const selected = selectDesign(facts), decision = {path, type: node.type, facts, ...selected};
    byNode.set(node, decision);
    if (selected.applied.length) decisions.push(decision);
    node.children?.forEach((child, i) => visit(child, `${path}.children[${i}]`, [...ancestors, node], node.children.length));
    if (node.type === 'metric') {
      // Reuse the existing script-weighted value and title estimators. This is a conservative width budget, not font measurement.
      const valueTarget = Math.max(sizes.sub.max, sizes.stat.min);
      const valueWidth = facts.valueLength * valueTarget * 1.04;
      const labelWidth = cplOf(node.label) * sizes.small.max;
      decision.minCell = cellBucket(Math.max(valueWidth, labelWidth) + 2 * space.insetS + 2);
      decision.budget = {valueTarget, valueUnits: facts.valueLength, labelCpl: cplOf(node.label), inset: 'insetS', border: 2};
    }
    if (node.type === 'grid') {
      const children = node.children.map(x => byNode.get(x)), summary = node.children.every(x => x.type === 'metric');
      const minimums = children.map(x => x.minCell ?? (x.values.role === 'product' ? 160 : x.values.role === 'editorial' ? 280 : 240));
      decision.flow = {minCell: Math.max(...minimums), gap: summary ? space.item : space.gap, dense: false, span: true, summary, cap: {two: 2, three: 3, four: 4}[node.columns]};
    }
    if (node.type === 'form') {
      const longLabel = node.fields.some(f => cplOf(f.label) > 10);
      decision.container = {minField: longLabel ? 280 : 220, gap: space.head};
    }
    if (node.type === 'split') decision.container = {minWidth: 2 * 320 + space.gap};
    if (node.type === 'hero') decision.container = {minCell: Math.max(320, cellBucket(cplOf(node.title) * Math.min(sizes.display.min, sizes.heading.max) * 1.04))};
  };
  visit(b.tree, '$.tree');
  return {byNode, version: COMPOSITION_VERSION, decisions};
}

/** Only compiler-derived enum/numeric attributes cross into the renderer. No consumer override channel. */
export function compositionAttrs(d) {
  if (!d?.values.role) return '';
  const attrs = [['design-kind', d.type], ['design-role', d.values.role]];
  if (d.flow) attrs.push(['flow-min', d.flow.minCell], ['flow-gap', d.flow.gap]);
  if (d.container?.minField) attrs.push(['field-min', d.container.minField]);
  if (d.type === 'split') attrs.push(['layout-min', d.container.minWidth]);
  if (d.type === 'hero') attrs.push(['hero-min', d.container.minCell]);
  return attrs.map(([k, v]) => ` data-${k}="${v}"`).join('');
}

export function compositionCSS(plan) {
  if (!plan) return '';
  const out = [`/* Context composition ${plan.version}: compiler-owned decisions; catalog/composition.mjs */`,
    '.kit-main,.kit-section-inner,.kit-split-cell,.kit-aside-main,.kit-aside-side,.kit-tabpanel,.kit-layout-region{container:kit compose/inline-size}.kit-layout-region{min-width:0}'];
  const token = tier => `var(${TOKEN[tier]})`;
  // Generate once per actual profile, in deterministic order; the finite role/spacing vocabularies stay the source of values.
  const profiles = new Map();
  for (const d of plan.decisions) {
    const key = [d.type, d.values.role, d.values.titleRole, d.values.inset].join('|');
    if (profiles.has(key)) continue; profiles.set(key, d);
    const sel = `[data-design-kind="${d.type}"][data-design-role="${d.values.role}"]`;
    if (d.values.titleRole && d.type === 'page-header') out.push(`${sel}:not([data-lead]) h1{font-size:var(--kit-t-${d.values.titleRole})}`);
    if (d.values.titleRole && d.type === 'section') out.push(`${sel}>.kit-section-inner>.kit-section-head>:is(h2,h3,h4){font-size:var(--kit-t-${d.values.titleRole})}`);
    if (d.type === 'card') {
      out.push(`${sel} .kit-card-body>:is(h2,h3,h4,h5),${sel} .kit-card-body>.kit-stretch>:is(h2,h3,h4,h5){font-size:var(--kit-t-${d.values.titleRole})}`);
      if (d.values.role !== 'product') out.push(`${sel} .kit-card-body{padding:${token(d.values.inset)}}`);
    }
    if (d.type === 'section' && d.values.inset) out.push(`${sel}[data-surface]:not([data-surface=plain]){padding:${token(d.values.inset)}}`);
    if (d.type === 'form') out.push(`${sel}{padding:${token(d.values.inset)}}`);
  }
  if (plan.decisions.some(d => d.type === 'grid')) out.push('[data-design-kind=grid][data-flow-gap]{gap:var(--kit-design-gap)}', ...[...new Set(plan.decisions.filter(d => d.flow).map(d => d.flow.gap))].sort((a,b) => a-b).map(gap => `[data-design-kind=grid][data-flow-gap="${gap}"]{--kit-design-gap:${gap}px}`));
  const metric = plan.decisions.find(d => d.type === 'metric');
  if (metric) out.push(`
.kit-metric[data-design-role=summary]{container:metric/inline-size;padding:${token('insetS')}}
.kit-metric[data-design-role=summary] dt{padding-right:0}
.kit-metric[data-design-role=summary]>dd:nth-of-type(1){font-size:min(var(--kit-t-${metric.values.valueRole}),calc(100cqw * var(--kit-vfit,1)));line-height:var(--kit-lh-${metric.values.valueLeading})}
.kit-metric[data-design-role=summary] .kit-spark{display:none}
@container metric (min-width:240px){.kit-metric[data-design-role=summary] dt{padding-right:68px}.kit-metric[data-design-role=summary] .kit-spark{display:block;right:${token('insetS')};top:${token('insetS')}}}`);
  const form = plan.decisions.find(d => d.type === 'form');
  if (form) {
    out.push(`[data-design-kind=form]{container:form/inline-size}
[data-design-kind=form] .kit-form-fields{gap:${token(form.values.fieldGap)};margin-block:${token(form.values.fieldGap)}}
[data-design-kind=form][data-variant=two-column] .kit-form-fields{grid-template-columns:1fr}
[data-design-kind=form][data-variant=inline] .kit-form-fields{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}`);
    for (const min of [...new Set(plan.decisions.filter(d => d.type === 'form').map(d => d.container.minField))].sort()) {
      const gap = plan.decisions.find(d => d.type === 'form').container.gap;
      out.push(`@container form (min-width:${2 * min + gap}px){[data-design-kind=form][data-field-min="${min}"][data-variant=two-column] .kit-form-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}`);
    }
  }
  if (plan.decisions.some(d => d.type === 'split')) {
    const min = plan.decisions.find(d => d.type === 'split').container.minWidth;
    out.push(`.kit-split[data-design-kind=split]{grid-template-columns:1fr;gap:${token('gap')}}
.kit-split[data-design-kind=split][data-ratio]{grid-template-columns:1fr}
.kit-split[data-design-kind=split][data-reverse=reverse]>:first-child{order:0}
@container compose (min-width:${min}px){.kit-split[data-design-kind=split]{grid-template-columns:repeat(2,minmax(0,1fr))}.kit-split[data-design-kind=split][data-ratio=even]{grid-template-columns:repeat(2,minmax(0,1fr))}.kit-split[data-design-kind=split][data-ratio=wide-start]{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}.kit-split[data-design-kind=split][data-ratio=wide-end]{grid-template-columns:minmax(0,2fr) minmax(0,3fr)}.kit-split[data-design-kind=split][data-reverse=reverse]>:first-child{order:2}}`);
  }
  const table = plan.decisions.find(d => d.type === 'table');
  if (table) out.push(`[data-design-kind=table] :is(th,td){padding:${token(table.values.cellSpace)}}[data-design-kind=table] .kit-table-scroll{overflow-x:auto}`);
  const list = plan.decisions.find(d => d.type === 'list');
  if (list) out.push(`[data-design-kind=list] li{padding-block:${token(list.values.itemSpace)}}`);
  const hero = plan.decisions.find(d => d.type === 'hero');
  if (hero) out.push(`[data-design-kind=hero] .kit-hero-copy>p:not(.kit-eyebrow){margin-block:${token(hero.values.copyGap)} ${token(hero.values.actionGap)}}
.kit-hero[data-design-kind=hero][data-hero-min="${hero.container.minCell}"]{--kit-hero-min:${hero.container.minCell}px}
.kit-hero[data-design-kind=hero][data-visual][data-hero-min][data-variant]{grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--kit-hero-min)),1fr));gap:${token('gap')}}`);
  if (hero?.values.frameEdge === 'contained') out.push('[data-design-kind=hero][data-variant=split] .kit-hero-visual[data-frame]{margin-right:0;border-right:var(--kit-card-border);border-radius:calc(var(--kit-radius) * 1.3)}');
  return out.join('\n');
}
