import {icons} from '../catalog/icons.mjs';

/** Icon markup is style-agnostic; the `icon` axis only changes CSS variables (stroke width, caps, fill). */
export function icon(name, extra = '') {
  const shapes = icons[name];
  if (!shapes) throw new Error('Unknown icon: ' + name);
  return `<svg class="kit-icon${extra ? ' ' + extra : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes.map(d => `<path${d.endsWith('Z') ? ' class="c"' : ''} d="${d}"/>`).join('')}</svg>`;
}
