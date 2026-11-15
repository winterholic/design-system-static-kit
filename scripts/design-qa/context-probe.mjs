/** Additional composition observations. Sizes come from the rendered role tokens/profile, never a beauty score.
 * Serialized into the browser just like the existing layout/text/spacing probes. */
export function contextProbe() {
  const findings = [], scanned = {summary: 0, fields: 0, flow: 0, split: 0};
  const num = x => parseFloat(x) || 0, css = x => getComputedStyle(x);
  const visible = e => e.getBoundingClientRect().width > 1 && !e.closest('[hidden],.kit-sr');
  const columns = e => css(e).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
  for (const el of document.querySelectorAll('.kit-metric')) {
    if (!visible(el)) continue; scanned.summary++;
    const value = el.querySelector('dd:not(.kit-metric-foot)'), label = el.querySelector('dt');
    const valueSize = num(css(value).fontSize), labelSize = num(css(label).fontSize);
    if (valueSize <= labelSize) findings.push({code: 'SUMMARY_HIERARCHY', at: label.textContent, actual: valueSize, label: labelSize});
  }
  for (const form of document.querySelectorAll('.kit-form[data-variant=two-column]')) {
    const fields = form.querySelector('.kit-form-fields');
    if (!visible(fields)) continue; scanned.fields++;
    const minimum = Number(form.dataset.fieldMin ?? 220);
    if (columns(fields) > 1) for (const field of fields.children) {
      const width = field.getBoundingClientRect().width;
      if (width + 1 < minimum) findings.push({code: 'FIELD_CAPACITY', at: field.textContent.trim().slice(0,40), actual: width, minimum});
    }
  }
  for (const grid of document.querySelectorAll('.kit-grid[data-flow-min]')) {
    if (!visible(grid)) continue; scanned.flow++;
    if (columns(grid) > 1) for (const child of grid.children) {
      const width = child.getBoundingClientRect().width, minimum = Number(grid.dataset.flowMin);
      if (width + 1 < minimum) findings.push({code: 'FLOW_CAPACITY', actual: width, minimum});
    }
  }
  for (const split of document.querySelectorAll('.kit-split')) {
    if (!visible(split)) continue; scanned.split++;
    const minimum = Number(split.dataset.layoutMin ?? 640 + num(css(split).columnGap));
    if (columns(split) > 1 && split.getBoundingClientRect().width + 1 < minimum) findings.push({code: 'SPLIT_CAPACITY', actual: split.getBoundingClientRect().width, minimum});
  }
  return {findings, scanned};
}
