/** Layout corrections for 2.6.0 material output. Older catalog outputs never include this layer. */
export function materialQualityCSS(used) {
  const rules = ['/* 2.6.0 material layout corrections (docs/layout-quality.md) */'];
  if (used.has('card')) rules.push('.kit-card[data-product=yes]{overflow:visible}', '.kit-card[data-product=yes] .kit-card-body{flex:1 0 auto}');
  if (used.has('logo-cloud')) rules.push('.kit-logos :is(h2,h3,h4){font-size:var(--kit-t-body-l);color:var(--kit-text)}');
  if (used.has('chart')) rules.push('.kit-chart :is(.ch-t,.ch-v,.ch-vh){font-size:13px}');
  return rules.join('\n');
}
