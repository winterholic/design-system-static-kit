/** Platform spacing and density materials. All values reuse the established 4px scale. */
import {SPACE, TOKEN} from '../../spacing.mjs';
import {definePlatformMaterial} from '../contract.mjs';

/**
 * The nine §9.3 spacing roles. Each role reads one scale token for one CSS property, so a role is a different distance, not a name for the same one.
 * Components opt in with data-spacing-role; no role is applied to a page on its own. Tokens follow docs/spacing.md S01~S09 and are the ones the compiled pages already read.
 */
export const SPACING_ROLES = Object.freeze([
  {id: 'page-margin', label: '페이지 여백', token: 'band', prop: 'padding-block'},
  {id: 'section-gap', label: '섹션 간격', token: 'section', prop: 'gap'},
  {id: 'container-padding', label: '컨테이너 내부 여백', token: 'inset', prop: 'padding'},
  {id: 'component-gap', label: '컴포넌트 내부 간격', token: 'head', prop: 'gap'},
  {id: 'sibling-gap', label: '형제 요소 간격', token: 'gap', prop: 'gap'},
  {id: 'list-gap', label: '목록 간격', token: 'item', prop: 'gap'},
  {id: 'form-gap', label: '폼 간격', token: 'sub', prop: 'gap'},
  {id: 'table-cell', label: '표 셀 간격', token: 'near', prop: 'padding-block'},
  {id: 'icon-text', label: '아이콘과 텍스트 간격', token: 'tight', prop: 'gap'},
].map(Object.freeze));

export const SPACING_MATERIALS = Object.freeze(Object.entries(SPACE).map(([density, tokens]) => definePlatformMaterial({
  id: `spacing:${density}`, kind: 'spacing', label: `${density} spacing`, density, tokens,
  roles: Object.fromEntries(SPACING_ROLES.map(r => [r.id, r.token])),
  contexts: ['any'], tags: ['spacing', density], axes: {density}, uses: {density: [density]},
  reuses: ['axis-value:density.' + density],
  quality: {status: 'verified', evidence: ['tests/platform-style-materials.test.mjs:39']},
})));

export function validateSpacing(m) {
  const errors = [];
  if (!Object.hasOwn(SPACE, m.density)) errors.push({code: 'P_SPACING_DENSITY', path: '$.density', message: `unknown density: ${m.density}`});
  else for (const [key, px] of Object.entries(m.tokens)) {
    if (!Object.hasOwn(SPACE[m.density], key) || SPACE[m.density][key] !== px || !Number.isInteger(px) || px % 4 !== 0) errors.push({code: 'P_SPACING_TOKEN', path: `$.tokens.${key}`, message: `token must match the 4px ${m.density} spacing scale`});
  }
  if (JSON.stringify(Object.keys(m.roles)) !== JSON.stringify(SPACING_ROLES.map(r => r.id))) errors.push({code: 'P_SPACING_ROLES', path: '$.roles', message: 'all nine §9.3 spacing roles are required, in REQUEST order'});
  else {
    for (const [role, key] of Object.entries(m.roles)) if (!Object.hasOwn(m.tokens, key)) errors.push({code: 'P_SPACING_ROLE_TOKEN', path: `$.roles.${role}`, message: `${key} is not a spacing token`});
    if (new Set(Object.values(m.roles)).size !== SPACING_ROLES.length) errors.push({code: 'P_SPACING_ROLE_ALIAS', path: '$.roles', message: 'two roles read the same token, so they would be one distance under two names'});
  }
  return errors;
}

/** Emits the complete spacing contract in the platform compiler output: the density tokens, then one opt-in rule per role. */
export function spacingCSS(m) {
  const name = m.id.slice('spacing:'.length), sel = `[data-density="${name}"]`;
  const vars = Object.entries(m.tokens).map(([key, value]) => `${TOKEN[key]}:${value}px`).join(';');
  const roles = SPACING_ROLES.map(r => `${sel} [data-spacing-role="${r.id}"]{${r.prop}:var(${TOKEN[m.roles[r.id]]})}`);
  const demo = `${sel}.kit-spacing-demo{display:grid;gap:var(--kit-sp-near)}${sel}.kit-spacing-demo [data-spacing-role]{display:flex;flex-wrap:wrap;align-items:flex-start;border:1px dashed var(--kit-rule)}${sel}.kit-spacing-demo [data-spacing-role]>span{background:var(--kit-soft);color:var(--kit-text);padding:var(--kit-sp-tight) var(--kit-sp-near)}`;
  return [`${sel}{${vars}}`, ...roles, demo].join('\n');
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** One box per role. Each box holds two chips so the distance the role sets (gap, or padding around them) can be read off the layout. */
export function renderSpacingSample(m) {
  const name = m.id.slice('spacing:'.length);
  return `<div class="kit-spacing-demo" data-density="${name}">${SPACING_ROLES.map(r => `<div class="kit-spacing-role" data-spacing-role="${r.id}"><span>${escapeHTML(r.label)}</span><span>${m.tokens[m.roles[r.id]]}px</span></div>`).join('')}</div>`;
}
