import {compositionRules, compositionCoverage, COMPOSITION_VERSION, PAGE_INTENT, pageRules, PAGE_RULE_LEGACY_VERSIONS, LEGACY_COMPOSITION_VERSION} from './catalog/composition.mjs';
import {bentoPlan} from './layout.mjs';
import {SPACE, TOKEN} from './spacing.mjs';
import {roleSizes} from './typography.mjs';
import {cplOf, vlOf, valueUnits} from './render/util.mjs';
import {deriveTableDesign} from './table-design.mjs';
import {deriveHeaderDesign} from './header-design.mjs';

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

/** Page rules apply to catalog 2.4.0+; older inputs keep their pinned output (docs/evidence/variants/legacy-2-3-hashes.json). */
export const pageRulesApply = b => !PAGE_RULE_LEGACY_VERSIONS.includes(b.catalogVersion);
/** Cells whose content is one short number or bar: beside a 2x2 feature picture they stretch to the picture row and sit mostly empty (Q07). */
const SHORT_CELLS = ['metric', 'progress'];

/**
 * Page-level planning (composition 1.3.0): facts about the whole page go through the same decision-table engine as node rules.
 * Returns {version, facts, decisions, artStart}. Decisions are attached to the affected node's decision (`.page`) so the renderer
 * and compositionAttrs read them; the Blueprint itself is never rewritten.
 */
function planPage(b, byNode) {
  const intent = PAGE_INTENT[b.pageType] ?? 'general', children = b.tree.children ?? [];
  const heroAt = children.findIndex(n => n.type === 'hero'), hero = heroAt >= 0 ? children[heroAt] : null, next = hero ? children[heroAt + 1] : null;
  const heroPath = `$.tree.children[${heroAt}]`, nextPath = `$.tree.children[${heroAt + 1}]`;
  const facts = {
    intent, heroVariant: hero?.variant ?? null, heroVisual: hero ? !!hero.visual : null,
    heroArt: !!hero && ['split', 'product'].includes(hero.variant) && !!hero.visual && hero.visual !== 'ornament',
    // HERO_POSITION fixes the hero as the second child, so the section after it is the third (odd) child and src/styles/shells.mjs never paints it soft by position; only an explicit surface makes it a visible band.
    afterHero: !hero ? null : next?.type === 'section' ? ((next.surface ?? 'plain') === 'plain' ? 'plain-section' : 'banded-section') : next ? 'other' : null,
    bentos: 0,
  };
  const reasonOf = id => pageRules.find(r => r.id === id).reason;
  const decisions = [], page = {version: COMPOSITION_VERSION, facts, decisions, artStart: null};
  const picked = selectDesign(facts, pageRules);
  if (picked.applied.includes('P01')) page.artStart = picked.values.artStart;
  if (picked.applied.includes('P02')) {
    byNode.get(hero).page = {...byNode.get(hero).page, rule: 'P02', heroForm: picked.values.heroForm};
    decisions.push({rule: 'P02', path: heroPath, facts: {heroVariant: facts.heroVariant, heroVisual: false}, declared: hero.variant, applied: picked.values.heroForm, reason: reasonOf('P02')});
  }
  if (picked.applied.includes('P03')) {
    byNode.get(next).page = {...byNode.get(next).page, rule: 'P03', afterHero: picked.values.afterHeroStep};
    decisions.push({rule: 'P03', path: nextPath, facts: {intent, afterHero: facts.afterHero}, applied: picked.values.afterHeroStep, reason: reasonOf('P03')});
  }
  const walkBentos = (nodes, path) => nodes.forEach((n, i) => {
    const at = `${path}.children[${i}]`;
    if (n.type === 'bento') {
      facts.bentos++;
      const plan = bentoPlan(n.children), feature = plan[0].cell === 'feature';
      const shortCells = feature ? n.children.filter((c, k) => k !== plan[0].index && SHORT_CELLS.includes(c.type)).map(c => c.type) : [];
      if (selectDesign({bentoSparse: shortCells.length >= 2}, pageRules).applied.includes('P04')) decisions.push({rule: 'P04', code: 'PAGE_BENTO_SPARSE', path: at, facts: {bentoSparse: true}, shortCells, reason: reasonOf('P04')});
    }
    if (n.children) walkBentos(n.children, at);
  });
  walkBentos(children, '$.tree');
  return page;
}

/** Residual part of P01 after rendering: a large picture whose content is identical to another on the page (chart and device art cannot rotate scenes). */
export function auditPage(plan, arts = []) {
  if (!plan?.page) return plan;
  const groups = new Map();
  for (const a of arts) (groups.get(a.key) ?? groups.set(a.key, []).get(a.key)).push(a);
  const rule = pageRules.find(r => r.id === 'P01');
  for (const g of groups.values()) if (g.length > 1) plan.page.decisions.push({rule: 'P01', code: 'PAGE_DUP_VISUAL', path: '$.tree', facts: {duplicateVisual: true}, places: g.map(a => a.place), kind: g[0].kind, motif: g[0].motif, reason: rule.reason});
  plan.page.facts.duplicateVisualGroups = [...groups.values()].filter(g => g.length > 1).length;
  return plan;
}

const CELL_BUCKETS = [160, 200, 240, 280, 320, 360, 400, 480];
const cellBucket = needed => CELL_BUCKETS.find(x => x >= needed) ?? CELL_BUCKETS.at(-1);
const semantic = n => n.type === 'card' ? n.price ? 'product' : n.author ? 'editorial' : 'feature' : n.type;

/** Compiler-time facts never claim to measure glyphs or know a runtime width. CSS container queries own those decisions. */
export function planComposition(b) {
  if (b.catalogVersion === '2.1.0') return null;
  const byNode = new WeakMap(), decisions = [], inherited = [], space = SPACE[b.density], sizes = roleSizes(b);
  const visit = (node, path, ancestors = [], siblingCount = 1) => {
    const supporting = ancestors.some((a, i) => a.type === 'aside' && a.children[1] === (ancestors[i + 1] ?? node));
    const facts = {type: node.type, semantic: semantic(node), intent: PAGE_INTENT[b.pageType] ?? 'general', nested: ancestors.some(x => x.type === 'section'), supporting, parent: ancestors.at(-1)?.type ?? null, siblingCount, titleCpl: cplOf(node.title ?? ''), valueLength: node.type === 'metric' ? vlOf(node.value) : 0, density: b.density, typography: b.typography, theme: b.theme};
    const coverage = compositionCoverage[node.type];
    if (!coverage) throw new Error('Missing composition coverage: ' + node.type);
    const selected = selectDesign(facts), decision = {path, type: node.type, facts, coverage, ...selected};
    byNode.set(node, decision);
    if (selected.applied.length) decisions.push(decision);
    else inherited.push({path, type: node.type, ...coverage});
    node.children?.forEach((child, i) => visit(child, `${path}.children[${i}]`, [...ancestors, node], node.children.length));
    if (node.type === 'metric') {
      // Reuse the existing script-weighted value and title estimators. This is a conservative width budget, not font measurement.
      const valueTarget = Math.max(sizes.sub.max, sizes.stat.min);
      const valueWidth = facts.valueLength * valueTarget * 1.04;
      const labelWidth = cplOf(node.label) * sizes.small.max;
      decision.minCell = cellBucket(Math.max(valueWidth, labelWidth) + 2 * space.insetS + 2);
      decision.budget = {valueTarget, valueUnits: facts.valueLength, labelCpl: cplOf(node.label), inset: 'insetS', border: 2};
      const required = valueUnits(node.value) * valueTarget * 1.04 + 2 * space.insetS + 2;
      if (required > CELL_BUCKETS.at(-1)) decision.diagnostics = [{code: 'CONTENT_BUDGET_LIMIT', required: Math.ceil(required), maximum: CELL_BUCKETS.at(-1), alternative: 'single-column-summary', reason: 'The finite cell budget is saturated; preserve the value and review the single-column layout or use a table.'}];
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
    if (node.type === 'table') decision.table = deriveTableDesign(node, decision);
    if (node.type === 'split') decision.container = {minWidth: 2 * 320 + space.gap};
    if (node.type === 'hero') decision.container = {minCell: Math.max(320, cellBucket(cplOf(node.title) * Math.min(sizes.display.min, sizes.heading.max) * 1.04))};
    if (node.type === 'aside') decision.container = {sideWidth: node.size === 'wide' ? 380 : 300, minWidth: 320 + (node.size === 'wide' ? 380 : 300) + space.gap};
    if (node.type === 'team') {
      const hasBio = node.members.some(m => m.bio), longRole = node.members.some(m => cplOf(m.role) > 10);
      decision.flow = {minCell: hasBio || longRole ? 280 : 200, gap: space.gap, dense: false, span: true, cap: 4};
    }
    if (node.type === 'pricing') decision.flow = {minCell: 280, gap: space.gap, dense: false, span: true, cap: 3};
    if (['feature-list', 'steps', 'menu'].includes(node.type)) {
      const grid = node.type === 'feature-list' ? node.layout !== 'list' : node.type === 'steps' ? ['horizontal', 'cards'].includes(node.layout) : node.layout === 'grid';
      if (grid) decision.flow = {minCell: node.items.some(x => (x.description?.length ?? 0) > 100) ? 280 : 240, gap: space.gap, dense: false, span: true, cap: node.type === 'steps' && node.layout === 'horizontal' ? 4 : 3};
    }
    if (node.type === 'gallery' && (node.layout ?? 'grid') === 'grid') decision.flow = {minCell: 240, gap: space.gap, dense: false, span: true, cap: 4};
    if (['steps','timeline'].includes(node.type)) {
      const implicit = node.type === 'steps' ? !node.layout : !node.variant;
      const short = node.items.length <= 4 && node.items.every(x => valueUnits(x.title) <= 40 && valueUnits(x.description ?? '') <= 80);
      if (implicit && short) {
        const cpl = Math.max(...node.items.map(x => Math.max(cplOf(x.title),cplOf(x.description ?? ''))));
        decision.sequence = {policy:'sequence-content-1',mode:'adaptive',reason:'An implicit short sequence reuses the existing orphan-free flow; explicit chronology and long narratives retain rows.'};
        decision.flow = {minCell:Math.max(200,cellBucket(cpl*sizes.small.max+space.head)),gap:space.gap,dense:false,span:true,cap:node.type==='timeline'?3:4};
      }
    }
  };
  visit(b.tree, '$.tree');
  const plan = {byNode, version: pageRulesApply(b) ? COMPOSITION_VERSION : LEGACY_COMPOSITION_VERSION, decisions, inherited, chrome: deriveHeaderDesign(b)};
  if (pageRulesApply(b)) plan.page = planPage(b, byNode);
  return plan;
}

/** Only compiler-derived enum/numeric attributes cross into the renderer. No consumer override channel. */
export function compositionAttrs(d) {
  if (!d?.values.role) return '';
  const attrs = [['design-kind', d.type], ['design-role', d.values.role]];
  if (d.flow) attrs.push(['flow-min', d.flow.minCell], ['flow-gap', d.flow.gap]);
  if (d.container?.minField) attrs.push(['field-min', d.container.minField]);
  if (d.type === 'split') attrs.push(['layout-min', d.container.minWidth]);
  if (d.type === 'hero') attrs.push(['hero-min', d.container.minCell]);
  if (d.type === 'aside') attrs.push(['aside-min', d.container.minWidth]);
  if (d.type === 'plan') attrs.push(['supporting', d.facts.supporting]);
  if (d.sequence) attrs.push(['sequence', d.sequence.mode]);
  if (d.page?.heroForm) attrs.push(['hero-form', d.page.heroForm]);
  if (d.page?.afterHero) attrs.push(['after', 'hero']);
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
  if (plan.decisions.some(d => d.type === 'card')) out.push('@media(max-width:560px){[data-design-kind=card][data-variant=horizontal]:has(.kit-card-foot) .kit-card-media{width:100%}}');
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
  if (table) {
    out.push(`[data-design-kind=table] :is(th,td){padding-block:${token('near')};padding-inline:${token(table.values.cellSpace)}}[data-design-kind=table] .kit-table-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain}[data-design-kind=table] table[data-table-min]{table-layout:auto}[data-design-kind=table] [data-column-align=end]{text-align:end}[data-design-kind=table] [data-column-wrap=nowrap]{white-space:nowrap}[data-design-kind=table] [data-column-wrap=words]{white-space:normal;word-break:keep-all;overflow-wrap:break-word}`);
    const tables = plan.decisions.filter(d => d.type === 'table').map(d => d.table);
    for (const width of [...new Set(tables.map(t => t.minimumWidth))].sort((a,b) => a-b)) out.push(`[data-table-min="${width}"]{min-width:${width}px}`);
    for (const width of [...new Set(tables.flatMap(t => t.columns.map(c => c.minWidth)))].sort((a,b) => a-b)) out.push(`[data-design-kind=table] [data-column-min="${width}"]{min-width:${width}px}`);
  }
  const list = plan.decisions.find(d => d.type === 'list');
  if (list) out.push(`[data-design-kind=list] li{padding-block:${token(list.values.itemSpace)}}`);
  // P03: a transparent section right after the hero drops its own band step, because the hero already ends in one. Band pages only (src/styles/shells.mjs BAND).
  if (plan.page?.decisions.some(d => d.rule === 'P03')) out.push(':is([data-page=landing],[data-page=pricing],[data-page=portfolio],[data-page=general]) .kit-main>.kit-section[data-after=hero][data-surface=plain]{padding-top:0}');
  const hero = plan.decisions.find(d => d.type === 'hero');
  if (hero) out.push(`[data-design-kind=hero] .kit-hero-copy>p:not(.kit-eyebrow){margin-block:${token(hero.values.copyGap)} ${token(hero.values.actionGap)}}
.kit-hero[data-design-kind=hero][data-hero-min="${hero.container.minCell}"]{--kit-hero-min:${hero.container.minCell}px}
.kit-hero[data-design-kind=hero][data-visual][data-hero-min][data-variant]{grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--kit-hero-min)),1fr));gap:${token('gap')}}`);
  if (hero?.values.frameEdge === 'contained') out.push('[data-design-kind=hero][data-variant=split] .kit-hero-visual[data-frame]{margin-right:0;border-right:var(--kit-card-border);border-radius:calc(var(--kit-radius) * 1.3)}');
  if (plan.decisions.some(d => d.type === 'team')) out.push(`[data-design-kind=team]>ul{gap:${token('gap')}}[data-design-kind=team]>ul>li{padding:${token('insetS')};gap:${token('item')}}[data-design-kind=team] :is(strong,.kit-muted,p){text-wrap:pretty}`);
  for (const d of plan.decisions.filter(d => d.type === 'plan')) {
    const supporting = d.facts.supporting ? 'true' : 'false';
    out.push(`[data-design-kind=plan][data-supporting="${supporting}"]{padding:${token(d.values.inset)}}`);
  }
  if (plan.decisions.some(d => d.type === 'pricing')) out.push(`[data-design-kind=pricing]>.kit-plans{gap:${token('gap')}}[data-design-kind=pricing] .kit-plan-desc{min-height:0}[data-design-kind=pricing] .kit-plan ul{margin-block:${token('head')} ${token('gap')};padding-top:${token('head')}}`);
  if (plan.decisions.some(d => d.type === 'quote')) out.push(`[data-design-kind=quote][data-design-role=testimonial]{padding:${token('inset')}}[data-design-kind=quote] figcaption{flex-wrap:wrap;gap:${token('item')}}`);
  if (plan.decisions.some(d => d.type === 'chart')) out.push('/* C26 selects visual-data semantics. Cartesian SVGs stretch plot x geometry into the allocated width while the shared 340px height cap bounds tall pages; container-scaled label and marker transforms preserve proportions, and donuts keep their circular geometry. */[data-design-kind=chart] .kit-chart-body{min-width:0;container:chart/inline-size}[data-design-kind=chart] .kit-chart-body>svg{min-width:0;max-width:100%;max-height:340px}[data-design-kind=chart] .kit-chart-body>.kit-chart-plot{min-width:0;max-width:100%;flex:1 1 280px;container:chart-svg/inline-size}[data-design-kind=chart] .kit-chart-body>.kit-chart-plot>svg{display:block;width:100%;max-width:100%;max-height:340px;flex:none}[data-design-kind=chart] .kit-chart-body>.ch-donut{flex-basis:min(200px,100%)}[data-design-kind=chart] .kit-legend{min-width:0;overflow-wrap:anywhere}[data-design-kind=chart] .kit-chart-data{max-width:100%;overflow-x:auto}@container chart (min-width:510px){[data-design-kind=chart] .kit-chart-plot>svg:not(.ch-donut) text{transform-box:fill-box;transform-origin:center;transform:scaleX(calc(510px / 100cqw))}[data-design-kind=chart] .kit-chart-plot>svg:not(.ch-donut) text[text-anchor=end]{transform-origin:right center}[data-design-kind=chart] .kit-chart-plot>svg:not(.ch-donut) text[text-anchor=start]{transform-origin:left center}}@container chart-svg (min-width:510px){[data-design-kind=chart] .kit-chart-plot>svg:not(.ch-donut) .ch-m{transform-box:fill-box;transform-origin:center;transform:scaleX(calc(510px / 100cqw))}}');
  if (plan.decisions.some(d => d.type === 'calendar')) out.push('[data-design-kind=calendar]{min-width:0}[data-design-kind=calendar] .kit-cal-agenda li{flex-wrap:wrap}');
  if (plan.decisions.some(d => d.type === 'timeline')) out.push('[data-design-kind=timeline]{container:kit timeline/inline-size}[data-design-kind=timeline] .kit-changes{font-size:var(--kit-t-small);max-width:42em}[data-design-kind=timeline] .kit-rel-body>p{max-width:42em}@container timeline (max-width:560px){[data-design-kind=timeline]:is([data-variant=release],[data-variant=log])>ol>li{grid-template-columns:1fr}[data-design-kind=timeline] .kit-rel-meta{position:static}}');
  if (plan.decisions.some(d=>d.sequence)) {
    out.push('[data-sequence=adaptive]>ol{display:grid;gap:var(--kit-gap)}[data-sequence=adaptive]>ol>li{min-width:0}[data-design-kind=timeline][data-sequence=adaptive]>ol>li{padding-bottom:0}[data-design-kind=timeline][data-sequence=adaptive]>ol>li:not(:last-child)::before{bottom:calc(-1 * var(--kit-gap))}[data-sequence=adaptive] :is(strong,p){overflow-wrap:break-word}');
    for (const min of [...new Set(plan.decisions.filter(d=>d.type==='timeline'&&d.sequence).map(d=>d.flow.minCell))].sort((a,b)=>a-b)) {
      const gap=plan.decisions.find(d=>d.type==='timeline'&&d.sequence&&d.flow.minCell===min).flow.gap;
      out.push(`@container kit (min-width:${2*min+gap}px){[data-design-kind=timeline][data-sequence=adaptive][data-flow-min="${min}"]>ol>li{grid-template-columns:minmax(0,1fr);padding-bottom:0}[data-design-kind=timeline][data-sequence=adaptive][data-flow-min="${min}"]>ol>li::before{display:none}}`);
    }
  }
  if (plan.decisions.some(d => d.type === 'properties')) out.push('[data-design-kind=properties]{container:properties/inline-size}@container properties (max-width:400px){[data-design-kind=properties][data-layout=inline] dl>div{flex-direction:column;gap:2px}[data-design-kind=properties][data-layout=inline] dt{flex-basis:auto}}');
  if (table || list) out.push('[data-design-kind=table] :is(td,tbody th),[data-design-kind=list] li>div>strong{text-wrap:pretty}');
  if (plan.decisions.some(d => d.type === 'master-detail')) out.push('[data-design-kind=master-detail]{container:detail/inline-size}[data-design-kind=master-detail]>.kit-md-grid{grid-template-columns:1fr}@container detail (min-width:760px){[data-design-kind=master-detail]>.kit-md-grid{grid-template-columns:minmax(220px,1fr) minmax(0,2fr)}}');
  if (plan.decisions.some(d => d.type === 'cta')) out.push('[data-design-kind=cta]{flex-wrap:wrap}[data-design-kind=cta]>div{min-width:0}');
  if (plan.decisions.some(d => d.type === 'gallery')) out.push(`
.kit-gallery[data-design-kind=gallery]{container:kit gallery/inline-size}
.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul{grid-template-columns:1fr;grid-auto-rows:auto}
.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul>li:nth-child(n){grid-column:auto;grid-row:auto}
.kit-gallery[data-design-kind=gallery][data-layout=masonry] .kit-art-box{aspect-ratio:4/3!important}
@container gallery (min-width:480px){.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul{grid-template-columns:repeat(2,minmax(0,1fr))}.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul>li:nth-child(5n+1){grid-column:span 2}}
@container gallery (min-width:760px){.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul{grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:200px}.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul>li:nth-child(n){grid-column:auto;grid-row:auto}.kit-gallery[data-design-kind=gallery][data-layout=masonry]>ul>li:nth-child(6n+1){grid-column:span 2;grid-row:span 2}.kit-gallery[data-design-kind=gallery][data-layout=masonry] .kit-art-box{aspect-ratio:auto!important}}
.kit-gallery[data-design-kind=gallery][data-layout=showcase]>ul{grid-template-columns:repeat(4,minmax(0,1fr))}
.kit-gallery[data-design-kind=gallery][data-layout=showcase]>ul>li:first-child{grid-column:1/-1;grid-row:auto}
.kit-gallery[data-design-kind=gallery][data-layout=showcase]>ul>li:not(:first-child){grid-column:auto}
@container gallery (min-width:560px){.kit-gallery[data-design-kind=gallery][data-layout=showcase]>ul{grid-template-columns:72px minmax(0,1fr)}.kit-gallery[data-design-kind=gallery][data-layout=showcase]>ul>li:first-child{grid-column:2;grid-row:1/span 12}.kit-gallery[data-design-kind=gallery][data-layout=showcase]>ul>li:not(:first-child){grid-column:1}}`);
  for (const d of plan.decisions.filter(d => d.type === 'aside')) out.push(`
.kit-aside[data-design-kind=aside][data-aside-min="${d.container.minWidth}"]{grid-template-columns:1fr;gap:${token('gap')}}
.kit-aside[data-design-kind=aside][data-sticky=yes]>.kit-aside-side{position:static}
@container compose (min-width:${d.container.minWidth}px){.kit-aside[data-design-kind=aside][data-aside-min="${d.container.minWidth}"]{grid-template-columns:minmax(0,1fr) ${d.container.sideWidth}px}.kit-aside[data-design-kind=aside][data-aside-min="${d.container.minWidth}"][data-side=start]{grid-template-columns:${d.container.sideWidth}px minmax(0,1fr)}.kit-aside[data-design-kind=aside][data-aside-min="${d.container.minWidth}"][data-sticky=yes]>.kit-aside-side{position:sticky}.kit-aside[data-design-kind=aside][data-aside-min="${d.container.minWidth}"][data-side=start]>.kit-aside-side{order:0}}`);
  return [...new Set(out)].join('\n');
}
