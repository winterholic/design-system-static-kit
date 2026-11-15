/** Versioned compiler policy, not Blueprint options. Conditions refer only to facts derived from validated content.
 * Higher priority wins per field. Conflicting values at the same priority are a catalog authoring error. */
export const COMPOSITION_VERSION = '1.0.0';
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
];
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
freeze(PAGE_INTENT); freeze(compositionRules);
