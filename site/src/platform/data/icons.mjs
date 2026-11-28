/** Area-level icon materials reference the kit's original internal icon names. */
import {iconNames} from '../../catalog/icons.mjs';
import {icon as renderIcon} from '../../render/icon.mjs';
import {definePlatformMaterial} from '../contract.mjs';

const GROUPS = {
  navigation: ['home', 'menu', 'chevron-right', 'arrow-left'], action: ['plus', 'edit', 'trash', 'download'],
  editing: ['edit', 'copy', 'link', 'check'], status: ['check-circle', 'alert-circle', 'info', 'help-circle'],
  communication: ['mail', 'message', 'phone', 'send'], files: ['file', 'folder', 'upload', 'download'],
  media: ['image', 'camera', 'play', 'music'], commerce: ['cart', 'bag', 'tag', 'gift'],
  finance: ['dollar', 'credit-card', 'trending-up', 'trending-down'], analytics: ['chart', 'grid', 'filter', 'trending-up'],
  developer: ['code', 'terminal', 'globe', 'zap'], user: ['user', 'users', 'heart', 'bookmark'],
  settings: ['settings', 'filter', 'refresh', 'more'], calendar: ['calendar', 'clock', 'chevron-down', 'check'],
  security: ['lock', 'unlock', 'shield', 'eye'], accessibility: ['eye', 'help-circle', 'check', 'user'],
};
export const ICON_MATERIALS = Object.freeze(Object.entries(GROUPS).map(([area, symbols]) => definePlatformMaterial({
  id: `icon:area-${area}`, kind: 'icon', label: `${area} icons`, area, symbols,
  viewBox: '0 0 24 24', size: 24, strokeWidth: 2, alignment: 'optical-center', family: 'original-outline',
  contexts: ['any'], tags: ['icon', area], uses: {iconArea: [area]}, reuses: symbols.map(name => `icon:${name}`),
  source: {origin: 'in-repository-original', license: 'internal'},
  quality: {status: 'verified', evidence: ['tests/platform-style-materials.test.mjs:39']},
})));

export function validateIconMaterial(m) {
  const errors = [];
  if (!/^icon:area-[a-z-]+$/.test(m.id) || m.id !== `icon:area-${m.area}`) errors.push({code: 'P_ICON_ID', path: '$.id', message: 'icon id must match its area'});
  if (m.viewBox !== '0 0 24 24' || m.size !== 24 || m.strokeWidth !== 2 || m.alignment !== 'optical-center' || m.family !== 'original-outline') errors.push({code: 'P_ICON_SYSTEM', path: '$', message: 'icon materials must use the shared 24px original outline system'});
  if (m.symbols.length < 4 || m.symbols.some(name => !iconNames.includes(name))) errors.push({code: 'P_ICON_SYMBOL', path: '$.symbols', message: 'each area needs at least four existing internal icons'});
  return errors;
}

/** Icon materials compile to scoped styling and an explicit, small per-area symbol allowlist. */
export function iconCSS(m) {
  const sel = `[data-icon-area="${m.area}"]`;
  const symbols = m.symbols.map(symbol => `${sel} .kit-icon.icon-symbol-${symbol}{stroke:currentColor}`).join('');
  return `${sel}{--kit-icon-size:${m.size}px;--kit-icon-sw:${m.strokeWidth};--kit-icon-align:${m.alignment}}${sel} .kit-icon{width:var(--kit-icon-size);height:var(--kit-icon-size);vertical-align:middle}${sel} .kit-icon path{fill:none;stroke:currentColor;stroke-width:var(--kit-icon-sw);stroke-linecap:round;stroke-linejoin:round}${symbols}`;
}

/** Renders only a symbol allowed by the selected platform icon area. Informative SVGs receive a labeled wrapper; unlabeled ones stay decorative. */
export function renderAreaIcon(m, {symbol, label} = {}) {
  if (!m.symbols.includes(symbol)) throw new RangeError(`${symbol} is not in ${m.id}`);
  if (label !== undefined && (typeof label !== 'string' || !label.trim())) throw new RangeError('label must be non-empty when supplied');
  const svg = renderIcon(symbol, `icon-symbol-${symbol}`);
  if (label === undefined) return svg;
  return `<span class="kit-icon-area" role="img" aria-label="${String(label).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))}">${svg.replace(' aria-hidden="true"', '')}</span>`;
}
