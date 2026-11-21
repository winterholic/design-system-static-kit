// Authoring helpers for the expressiveness experiment. They only build plain Blueprint objects; nothing here extends the grammar.
export const act = (label, variant = 'primary', href = '#main') => ({label, href, variant});
export const footer = (note, labels = ['이용약관', '개인정보', '문의']) => ({footerNote: note, footerLinks: labels.map(label => ({label, href: '#main'}))});
/** Blueprint 2.0 / catalog 2.4.0 envelope. `axes` carries the style axes verbatim; `tree` children go under the page root. */
export function bp({name, theme, palette, pageType, mode = 'light', axes, nav, action, brandMark, foot, children}) {
  return {
    version: '2.0', catalogVersion: '2.4.0', name, theme, palette, mode, pageType, ...axes,
    chrome: {nav, action, ...(brandMark ? {brandMark} : {}), ...foot},
    tree: {type: 'page', children},
  };
}
