/** Chrome is compiler-owned. Consumer shell and action values retain their meaning. */
export function deriveHeaderDesign(b) {
  if (b.catalogVersion === '2.1.0' || !['centered', 'masthead'].includes(b.shell) || !b.chrome?.action) return null;
  return {
    policy: 'chrome-row-1',
    shell: b.shell,
    primary: ['brand', 'action'],
    navigation: 'separate-row',
    wideContainer: 720,
    reason: 'Keep identity and its primary action together; retain the navigation track and centered wide-screen identity.',
  };
}

export function headerDesignCSS(policy) {
  if (!policy) return '';
  const s=`[data-shell=${policy.shell}]`;
  return `/* ${policy.policy}: source observation R13/header, relation S02; actual header content width owns centering. */
${s} .kit-header{container:chrome/inline-size;gap:var(--kit-sp-near)}
${s} .kit-header-primary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:var(--kit-sp-head);width:100%;padding-block:0}
${s} .kit-header-primary>.kit-brand{grid-column:1;grid-row:1;justify-self:start;min-width:0;max-width:100%;padding:0}
${s} .kit-header-primary>.kit-brand .kit-brand-name{min-width:0;overflow-wrap:anywhere}
${s} .kit-header-primary>.kit-header-action{grid-column:2;grid-row:1;position:static;margin:0;align-self:center;justify-self:end;max-width:100%;white-space:normal;overflow-wrap:anywhere}
${s} .kit-header>.kit-nav{width:100%;flex-basis:auto}
${s}[data-shell=centered] .kit-header{padding-block:var(--kit-sp-near)}
@container chrome (min-width:${policy.wideContainer}px){${s} .kit-header-primary{grid-template-columns:minmax(0,1fr) minmax(0,auto) minmax(0,1fr)}${s} .kit-header-primary>.kit-brand{grid-column:2;justify-self:center}${s} .kit-header-primary>.kit-header-action{grid-column:3}}
`;
}
