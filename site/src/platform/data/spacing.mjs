/** Platform spacing and density materials. All values reuse the established 4px scale. */
import {SPACE, TOKEN} from '../../spacing.mjs';
import {definePlatformMaterial} from '../contract.mjs';

export const SPACING_MATERIALS = Object.freeze(Object.entries(SPACE).map(([density, tokens]) => definePlatformMaterial({
  id: `spacing:${density}`, kind: 'spacing', label: `${density} spacing`, density, tokens,
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
  return errors;
}

/** Emits the complete spacing contract in the platform compiler output. */
export function spacingCSS(m) {
  const name = m.id.slice('spacing:'.length);
  const vars = Object.entries(m.tokens).map(([key, value]) => `${TOKEN[key]}:${value}px`).join(';');
  return `[data-density="${name}"]{${vars}}`;
}
