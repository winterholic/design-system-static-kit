/** Versioned compiler policy, not Blueprint options. Conditions refer only to facts derived from validated content.
 * Higher priority wins per field. Conflicting values at the same priority are a catalog authoring error. */
export const COMPOSITION_VERSION = '1.3.0';
export const PAGE_INTENT = {
  dashboard: 'operation', data: 'operation', listing: 'operation', settings: 'operation', community: 'operation',
  auth: 'form', form: 'form', article: 'reading', docs: 'reading', commerce: 'commerce',
  landing: 'marketing', pricing: 'marketing', portfolio: 'marketing', general: 'general', error: 'status',
};
export const compositionRules = [
  {id: 'C01', priority: 10, when: {type: 'page-header'}, set: {role: 'page-heading', titleRole: 'title'}, reason: 'The page title establishes the primary reading level.'},
  {id: 'C02', priority: 20, when: {type: 'page-header', intent: ['operation', 'form', 'commerce']}, set: {titleRole: 'app'}, reason: 'Task pages reserve room for data and controls.'},
  {id: 'C03', priority: 10, when: {type: 'section'}, set: {role: 'section-heading', titleRole: 'heading'}, reason: 'A section groups related content rather than promoting each child.'},
  {id: 'C04', priority: 20, when: {type: 'section', intent: ['operation', 'reading', 'form', 'commerce']}, set: {titleRole: 'heading-s'}, reason: 'Section titles remain subordinate to a task, commerce or reading page title.'},
  {id: 'C05', priority: 30, when: {type: 'section', nested: true}, set: {inset: 'insetS'}, reason: 'Nested surfaces use the existing smaller inset relation S05.'},
  {id: 'C06', priority: 10, when: {type: 'card'}, set: {role: 'feature', titleRole: 'sub', inset: 'inset'}, reason: 'A feature card explains one concept; its title and copy form one group.'},
  {id: 'C07', priority: 30, when: {type: 'card', semantic: 'product'}, set: {role: 'product', titleRole: 'body', inset: 'insetS'}, reason: 'Product identity and price take precedence over a promotional heading.'},
  {id: 'C08', priority: 30, when: {type: 'card', semantic: 'editorial'}, set: {role: 'editorial', titleRole: 'sub'}, reason: 'Author and metadata identify reading content; preserve its editorial hierarchy.'},
  {id: 'C09', priority: 20, when: {type: 'card', semantic: 'feature', intent: 'operation'}, set: {role: 'information', titleRole: 'body-l', inset: 'insetS'}, reason: 'Supporting information does not compete with task page headings.'},
  {id: 'C10', priority: 10, when: {type: 'metric'}, set: {role: 'summary', valueRole: 'stat', valueLeading: 'sub', inset: 'insetS'}, reason: 'Give values and mixed-script glyphs sufficient room before reducing their font; decoration is secondary.'},
  {id: 'C11', priority: 10, when: {type: 'form'}, set: {role: 'form', inset: 'inset', fieldGap: 'head'}, reason: 'Fields form a group; label/help proximity stays smaller than field separation.'},
  {id: 'C12', priority: 20, when: {type: 'form', intent: 'operation'}, set: {role: 'settings'}, reason: 'Settings use the same field grammar as forms, within a task context.'},
  {id: 'C13', priority: 10, when: {type: 'table'}, set: {role: 'table', cellSpace: 'item'}, reason: 'Repeated data rows follow density rather than a fixed cell padding.'},
  {id: 'C14', priority: 10, when: {type: 'list'}, set: {role: 'list', itemSpace: 'item'}, reason: 'List items remain related within their enclosing component.'},
  {id: 'C15', priority: 10, when: {type: 'hero'}, set: {role: 'hero', titleRole: 'display', copyGap: 'head', actionGap: 'gap', frameEdge: 'contained'}, reason: 'Hero copy is one group; the action is the next group. Media fits its content box instead of viewport-based negative bleed.'},
  {id: 'C16', priority: 10, when: {type: 'split'}, set: {role: 'split'}, reason: 'Two columns require room in the containing region, independently of viewport width.'},
  {id: 'C17', priority: 10, when: {type: 'grid'}, set: {role: 'flow'}, reason: 'The existing orphan-free flow owns column selection; content supplies its minimum cell width.'},
  {id: 'C18', priority: 20, when: {type: 'form', intent: 'form'}, set: {inset: 'insetL'}, reason: 'A primary form uses the existing larger inset; a secondary form retains the component inset.'},
  {id: 'C19', priority: 10, when: {type: 'aside'}, set: {role: 'supporting-layout'}, reason: 'Main and supporting content must fit their allocated region before taking two columns.'},
  {id: 'C20', priority: 10, when: {type: 'team'}, set: {role: 'people', inset: 'insetS'}, reason: 'Names, roles and biographies determine the reading capacity of each person cell.'},
  {id: 'C21', priority: 10, when: {type: 'pricing'}, set: {role: 'comparison'}, reason: 'Plan columns reuse orphan-free flow with room for the price and feature list.'},
  {id: 'C22', priority: 10, when: {type: 'plan'}, set: {role: 'offer', inset: 'insetL'}, reason: 'A primary offer groups its identity, price, features and action.'},
  {id: 'C23', priority: 20, when: {type: 'plan', supporting: true}, set: {inset: 'insetS'}, reason: 'An offer in a supporting region uses the smaller existing surface inset.'},
  {id: 'C24', priority: 10, when: {type: 'quote'}, set: {role: 'testimonial', inset: 'inset', textRole: 'quote'}, reason: 'A testimonial fits its own box; attribution remains attached to the quotation.'},
  {id: 'C25', priority: 20, when: {type: 'quote', intent: 'reading'}, set: {role: 'citation', textRole: 'quote-l'}, reason: 'A reading-page citation retains the existing editorial treatment.'},
  {id: 'C26', priority: 10, when: {type: 'chart'}, set: {role: 'visual-data'}, reason: 'Chart and legend share the available box while full values remain in the data table.'},
  {id: 'C27', priority: 10, when: {type: 'calendar'}, set: {role: 'schedule'}, reason: 'The existing calendar container switches to its full-text agenda when cells cannot fit events.'},
  {id: 'C28', priority: 10, when: {type: 'gallery'}, set: {role: 'media-collection'}, reason: 'Media columns and thumbnail placement depend on the gallery region, not the viewport.'},
  {id: 'C29', priority: 10, when: {type: 'timeline'}, set: {role: 'sequence'}, reason: 'Release metadata and descriptions use separate tracks with bounded reading measures.'},
  {id: 'C30', priority: 10, when: {type: 'properties'}, set: {role: 'label-value'}, reason: 'Label and value keep proximity and stack when inline labels would consume the region.'},
  {id: 'C31', priority: 10, when: {type: 'menu'}, set: {role: 'catalogue'}, reason: 'Menu text and prices retain separate roles inside a content-sized cell.'},
  {id: 'C32', priority: 10, when: {type: 'master-detail'}, set: {role: 'selection-detail'}, reason: 'Selection and detail tracks stack inside a narrow allocated region.'},
  {id: 'C33', priority: 10, when: {type: 'cta'}, set: {role: 'next-action'}, reason: 'Copy and action share one group and wrap in their own container.'},
  {id: 'C34', priority: 10, when: {type: 'feature-list'}, set: {role: 'capabilities'}, reason: 'Feature descriptions supply the minimum readable flow cell.'},
  {id: 'C35', priority: 10, when: {type: 'steps'}, set: {role: 'procedure'}, reason: 'Repeated steps reuse the same content-sized flow as other repeated information.'},
];
/** Page-level decision table (composition 1.3.0, catalog 2.4.0+). Same shape and engine as compositionRules, but the facts describe the whole page
 * (hero visual, the section that follows the hero, bento cell mix, repeated pictures) instead of one node. Still a closed table of plain values:
 * no expressions, no consumer input. `claim` is the measured condition in scripts/design-qa/quality-claims.mjs. */
export const pageRules = [
  {id: 'P01', priority: 10, claim: 'Q13', source: 'docs/quality-diagnosis-2026-11-21.md C1', when: {heroArt: true}, set: {artStart: 'after-hero'},
    reason: 'The hero picture is placement 0 of the six-scene rotation, so the first picture in the body takes the next scene instead of repeating it; art that cannot rotate (chart, device) is reported when it repeats.'},
  {id: 'P02', priority: 10, claim: 'Q06', source: 'docs/quality-diagnosis-2026-11-21.md C2', when: {heroVariant: ['split', 'product'], heroVisual: false}, set: {heroForm: 'centered'},
    reason: 'A split or product hero without a visual leaves its second column empty; it reads as a text-led centred hero.'},
  {id: 'P03', priority: 10, claim: 'Q10', source: 'docs/quality-diagnosis-2026-11-21.md C5', when: {intent: ['marketing', 'general'], afterHero: 'plain-section'}, set: {afterHeroStep: 'none'},
    reason: 'The hero fades into the page canvas and already ends in a band step; a transparent section right after it adds a second band step on top (208px of dead space). Where the next section is a visible band (explicit tint or inverse surface) the edge stays and nothing changes.'},
  {id: 'P04', priority: 10, claim: 'Q07', source: 'docs/quality-diagnosis-2026-11-21.md C3', when: {bentoSparse: true}, set: {bentoFill: 'report'},
    reason: 'Short-number cells (metric, progress) next to a 2x2 feature picture stretch to the picture row height and sit mostly empty; the page reports it until the bento row sizing (src/layout.mjs bentoPlan) fits content.'},
];
/** Catalog versions whose output predates the page rules and is pinned byte for byte (docs/evidence/variants/legacy-2-3-hashes.json). */
export const PAGE_RULE_LEGACY_VERSIONS = ['2.1.0', '2.2.0', '2.3.0'];
/** The composition version those legacy inputs were compiled under; it is part of the pinned output (manifest.design.version, stylesheet comment). */
export const LEGACY_COMPOSITION_VERSION = '1.2.0';

// Mature contracts are reused explicitly; primitive components do not need cosmetic overrides.
const inherited = [
  ['page tab', ['layout/parent', 'S09'], 'Structural nodes inherit page and panel rhythm without adding a surface.'],
  ['bento', ['layout/bentoPlan', 'S03'], 'Content-aware bento sizing and container bands already own placement.'],
  ['tabs', ['S02', 'S06', 'runtime/ARIA-tabs'], 'Scrollable tabs retain keyboard navigation and token-sized controls.'],
  ['kanban lane task', ['layout/scroll', 'S01', 'S05'], 'Boards intentionally scroll and use compact nested task surfaces.'],
  ['reel', ['layout/scroll-snap', 'S02'], 'The explicit reel scrolls rather than squeezing card content.'],
  ['chat', ['S01', 'S05', 'type/body'], 'Message identity and copy retain proximity and nested insets.'],
  ['prose', ['type/measure', 'S02'], 'Prose already has a bounded reading measure and semantic type role.'],
  ['notice', ['S01', 'S04', 'state/semantics'], 'Status tone and live-region meaning own notice presentation.'],
  ['actions', ['S03', 'S06'], 'Actions wrap using the existing control size and group gap.'],
  ['faq', ['layout/container-faq', 'S02'], 'FAQ already uses a container breakpoint and native disclosures.'],
  ['logo-cloud', ['type/logo', 'S02', 'layout/wrap'], 'Trust marks wrap with their quiet existing type role.'],
  ['tags', ['S01', 'type/label', 'layout/wrap'], 'Compact labels wrap without creating another heading level.'],
  ['code', ['type/mono', 'layout/scroll', 'S04'], 'Code preserves whitespace in an intentional scroll region.'],
  ['progress', ['S01', 'state/progressbar'], 'The value remains adjacent to its label with progress semantics.'],
  ['empty-state skeleton', ['state/semantics', 'S04'], 'Feedback states retain hierarchy, reduced motion and live regions.'],
  ['media', ['layout/ratio', 'type/caption'], 'The catalogue ratio and caption own media sizing.'],
  ['breadcrumb pagination toc', ['navigation/semantics', 'S01', 'S06'], 'Navigation retains current location, wrapping and control dimensions.'],
  ['filter-bar stepper', ['navigation/scroll', 'S06'], 'Existing intentional overflow preserves readable control and step labels.'],
  ['summary buy-box', ['commerce/hierarchy', 'S01', 'S04'], 'Price, total, options and action already have distinct commerce roles.'],
  ['reviews', ['type/stat-s', 'S01', 'S02'], 'Scores and review copy retain separate summary and reading levels.'],
  ['links divider', ['S01', 'S02'], 'Links and separators preserve grouping and navigation affordances.'],
];
export const compositionCoverage = Object.fromEntries(inherited.flatMap(([types, contracts, reason]) => types.split(' ').map(type => [type, {mode: 'inherited', contracts, reason}])));
for (const rule of compositionRules) if (typeof rule.when.type === 'string') {
  const type = rule.when.type;
  compositionCoverage[type] ??= {mode: 'contextual', contracts: [], reason: 'Compiler-selected roles and container policies extend existing type, spacing and flow contracts.'};
  compositionCoverage[type].contracts.push(rule.id);
}
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
freeze(PAGE_INTENT); freeze(compositionRules); freeze(compositionCoverage); freeze(pageRules); freeze(PAGE_RULE_LEGACY_VERSIONS);
