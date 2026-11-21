/** Role typography materials independent of the 2.5.0 compiler path. */
import {defineKind, defineMaterial, materialId} from './contract.mjs';

const sans = 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic",sans-serif';
const serif = 'Georgia,"Times New Roman","AppleMyungjo","Noto Serif KR","Batang",serif';
const mono = 'ui-monospace,"SFMono-Regular",Menlo,Consolas,"D2Coding","Noto Sans Mono CJK KR",monospace';
const role = (size, weight, lineHeight, trackingEm, fontFamily, policy = 'wrap') => ({size, weight, lineHeight, trackingEm, fontFamily, policy});
const common = {
  label: role('clamp(2.4rem,5.5vw,4.5rem)', 750, 1.04, -.035, sans),
  heading: role('clamp(1.75rem,3.1vw,2.75rem)', 700, 1.18, -.025, sans),
  body: role('clamp(1rem,1.1vw,1.125rem)', 400, 1.65, 0, sans),
  labelSmall: role('clamp(.75rem,.82vw,.875rem)', 650, 1.35, .015, sans),
  caption: role('clamp(.6875rem,.75vw,.75rem)', 450, 1.4, .01, sans),
  numeric: role('clamp(1rem,1.25vw,1.375rem)', 650, 1.15, -.02, sans, 'nowrap'),
  code: role('clamp(.8125rem,.9vw,.9375rem)', 450, 1.55, 0, mono, 'scroll'),
};

export const MATERIAL_TYPE_PRESETS = Object.freeze({
  erp: Object.freeze({id: 'erp', label: 'ERP', context: ['dashboard', 'data'], density: 'compact', roles: Object.freeze({
    display: role('clamp(1.75rem,3.6vw,2.75rem)', 700, 1.12, -.025, sans),
    heading: role('clamp(1.25rem,2vw,1.625rem)', 650, 1.25, -.015, sans), body: common.body,
    label: role('clamp(.75rem,.82vw,.8125rem)', 650, 1.3, .02, sans), caption: common.caption,
    numeric: common.numeric, code: common.code,
  })}),
  dashboard: Object.freeze({id: 'dashboard', label: 'Dashboard', context: ['dashboard', 'data'], density: 'compact', roles: Object.freeze({
    display: role('clamp(2rem,4.2vw,3.25rem)', 720, 1.08, -.03, sans), heading: common.heading,
    body: role('clamp(1rem,1.05vw,1.0625rem)', 420, 1.55, 0, sans), label: common.labelSmall,
    caption: common.caption, numeric: role('clamp(1.25rem,2vw,2rem)', 700, 1.08, -.025, sans, 'nowrap'), code: common.code,
  })}),
  document: Object.freeze({id: 'document', label: 'Document', context: ['article', 'docs'], density: 'relaxed', roles: Object.freeze({
    display: role('clamp(2.75rem,6vw,4.5rem)', 650, 1.08, -.035, serif), heading: role('clamp(1.625rem,2.8vw,2.25rem)', 650, 1.22, -.02, serif),
    body: role('clamp(1.0625rem,1.2vw,1.1875rem)', 400, 1.78, .005, serif), label: role('clamp(.75rem,.85vw,.875rem)', 650, 1.35, .035, sans),
    caption: role('clamp(.75rem,.8vw,.8125rem)', 450, 1.5, .01, sans), numeric: role('clamp(1rem,1.2vw,1.25rem)', 600, 1.2, -.015, sans, 'nowrap'), code: common.code,
  })}),
  marketing: Object.freeze({id: 'marketing', label: 'Marketing', context: ['landing', 'pricing'], density: 'relaxed', roles: Object.freeze({
    display: role('clamp(3rem,8vw,6rem)', 750, 1.02, -.045, sans), heading: role('clamp(1.75rem,3.6vw,2.75rem)', 700, 1.12, -.03, sans),
    body: role('clamp(1.0625rem,1.25vw,1.25rem)', 420, 1.65, 0, sans), label: role('clamp(.75rem,.85vw,.875rem)', 700, 1.3, .07, sans),
    caption: common.caption, numeric: role('clamp(1.25rem,2.5vw,2.25rem)', 700, 1.08, -.03, sans, 'nowrap'), code: common.code,
  })}),
});

export const MULTILINGUAL_TYPE_CORPUS = Object.freeze([
  {id: 'pangram-ko', role: 'body', text: '다람쥐 헌 쳇바퀴에 타고파.', policy: 'wrap'},
  {id: 'pangram-en', role: 'body', text: 'The quick brown fox jumps over the lazy dog.', policy: 'wrap'},
  {id: 'heading-short', role: 'display', text: '현황 요약', policy: 'wrap'},
  {id: 'heading-long', role: 'heading', text: '분기별 매출과 고객 유지율을 한 화면에서 확인하세요', policy: 'wrap'},
  {id: 'label', role: 'label', text: '활성 계정 · 결제 완료', policy: 'wrap'},
  {id: 'mixed-script', role: 'body', text: '이번 분기 Q3 매출은 YoY 18.4% 증가했습니다.', policy: 'wrap'},
  {id: 'unspaced-hangul', role: 'body', text: '한글한국어무공백긴문자열넘침확인용가나다라마바사아자차카타파하', policy: 'wrap'},
  {id: 'date', role: 'numeric', text: '2026-11-22 · 2026년 11월 22일', policy: 'nowrap'},
  {id: 'currency', role: 'numeric', text: '₩1,234,500 · USD 1,234,567.89', policy: 'nowrap'},
  {id: 'percent', role: 'numeric', text: '12.75% · −0.83%', policy: 'nowrap'},
  {id: 'table-number', role: 'numeric', text: '₩98,765,432  |  1,234,567  |  99.95%', policy: 'nowrap'},
  {id: 'code', role: 'code', text: 'const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);', policy: 'scroll'},
  {id: 'symbols', role: 'caption', text: '→ ⇧ ≤ ≥ ± × ÷ • — “한글” & English', policy: 'wrap'},
]);

export function renderMaterialTypeCSS(id) {
  const preset = MATERIAL_TYPE_PRESETS[id];
  if (!preset) throw new RangeError(`unknown material type preset: ${id}`);
  const declarations = Object.entries(preset.roles).flatMap(([name, spec]) => [
    `--mt-${name}:${spec.size}`, `--mt-${name}-weight:${spec.weight}`, `--mt-${name}-leading:${spec.lineHeight}`,
    `--mt-${name}-tracking:${spec.trackingEm}em`, `--mt-${name}-font:${spec.fontFamily}`,
  ]).join(';');
  const rules = Object.entries(preset.roles).map(([name, spec]) =>
    `.mt-role-${name}{font-family:var(--mt-${name}-font);font-size:calc(var(--mt-${name}) * var(--mt-density-factor) * var(--mt-viewport-factor));font-weight:var(--mt-${name}-weight);line-height:calc(var(--mt-${name}-leading) * var(--mt-leading-factor));letter-spacing:var(--mt-${name}-tracking);${spec.policy === 'nowrap' ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' : spec.policy === 'scroll' ? 'white-space:pre;overflow-wrap:normal;' : 'word-break:keep-all;overflow-wrap:anywhere;'}${name === 'numeric' ? 'font-variant-numeric:tabular-nums lining-nums;' : ''}}`
  ).join('\n');
  return `/* ${preset.label}: viewport-fluid role sizes; density changes scale and rhythm. */\n.mt-specimen[data-preset="${id}"]{${declarations};--mt-density-factor:1;--mt-leading-factor:1;--mt-viewport-factor:1;font-variant-numeric:proportional-nums;min-width:0}\n.mt-specimen[data-preset="${id}"][data-density="compact"]{--mt-density-factor:.94;--mt-leading-factor:.94}\n.mt-specimen[data-preset="${id}"][data-density="relaxed"]{--mt-density-factor:1.02;--mt-leading-factor:1.04}\n${rules}\n@media (max-width:720px){.mt-specimen[data-preset="${id}"]{--mt-viewport-factor:.96}.mt-specimen[data-preset="${id}"] .mt-role-display{--mt-viewport-factor:.9}.mt-specimen[data-preset="${id}"] .mt-role-heading{--mt-viewport-factor:.94}}\n.mt-code-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain;padding:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:8px}\n.mt-table{width:100%;table-layout:fixed;border-collapse:collapse}.mt-table td.numeric{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums}\n`;
}

export function registerMaterialType(registry) {
  registry.addKind(defineKind({id: 'type-role-preset', label: '역할형 타이포그래피', categories: ['typography'], presetCapable: true, ext: {roles: 'object', fonts: 'array', density: 'string', wrap: 'object'}}));
  for (const [id, preset] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    const fonts = [...new Set(Object.values(preset.roles).map(r => r.fontFamily))];
    const roles = Object.fromEntries(Object.entries(preset.roles).map(([name, spec]) => [name, {...spec}]));
    registry.register(defineMaterial({
      id: materialId('type-role-preset', id), kind: 'type-role-preset', category: 'typography', label: preset.label,
      since: '2.6.0', contexts: preset.context, render: {module: 'src/materials/typography.mjs', export: 'renderMaterialTypeCSS', key: id},
      defaults: {preset: id}, variants: {preset: [id]}, tokens: Object.keys(preset.roles).map(name => `--mt-${name}`),
      responsive: {strategy: 'fluid', breakpoints: [720], note: 'role sizes use clamp(); display and heading reduce on compact viewports'},
      examples: [{render: 'renderMaterialTypeCSS', key: id}],
      quality: {status: 'verified', evidence: ['tests/material-type.test.mjs:10', 'tests/material-type.test.mjs:45']},
      preset: true, tags: ['role-based', 'multilingual', 'responsive'],
      ext: {roles, fonts, density: preset.density, wrap: {body: 'pretty with Korean-safe overflow fallback', title: 'balanced', numeric: 'nowrap', code: 'horizontal-scroll'}},
    }));
  }
  return registry;
}

const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function renderMaterialTypeExample() {
  const styles = Object.keys(MATERIAL_TYPE_PRESETS).map(renderMaterialTypeCSS).join('\n');
  const specimens = Object.values(MATERIAL_TYPE_PRESETS).map(preset => {
    const rows = MULTILINGUAL_TYPE_CORPUS.map(sample => `<div class="mt-sample" data-sample="${sample.id}" data-policy="${sample.policy}"><span class="mt-caption">${sample.id} · ${sample.policy}</span><p class="mt-role-${sample.role}">${escapeHTML(sample.text)}</p></div>`).join('\n');
    return `<section class="mt-specimen" data-preset="${preset.id}" data-density="${preset.density}"><h2 class="mt-role-heading">${preset.label} · 역할 타이포그래피</h2><div class="mt-grid">${rows}</div><div class="mt-code-scroll"><code class="mt-role-code">const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);</code></div><table class="mt-table"><thead><tr><th>항목</th><th>합계</th></tr></thead><tbody><tr><td>구독 수익</td><td class="numeric mt-role-numeric">₩1,234,500</td></tr><tr><td>전환율</td><td class="numeric mt-role-numeric">12.75%</td></tr></tbody></table></section>`;
  }).join('\n');
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Material Type · 다국어 코퍼스</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f5f6f8;color:#17191c;font:16px/1.5 ${sans};word-break:keep-all;overflow-wrap:anywhere}.mt-page{max-width:1200px;margin:auto}.mt-page>h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;letter-spacing:-.04em}.mt-specimen{margin:24px 0;padding:clamp(16px,3vw,28px);background:white;border:1px solid #d9dde3;border-radius:12px}.mt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:14px}.mt-sample{min-width:0;padding:14px;border:1px solid #e3e6eb;border-radius:8px}.mt-caption{display:block;margin-bottom:8px;font:600 .7rem/1.4 ${sans};color:#626b78}.mt-role-display{font-family:${sans};font-size:var(--mt-display);font-weight:var(--mt-display-weight);line-height:var(--mt-display-leading);letter-spacing:var(--mt-display-tracking)}.mt-role-heading{font-family:var(--mt-heading-font);font-size:var(--mt-heading);font-weight:var(--mt-heading-weight);line-height:var(--mt-heading-leading);letter-spacing:var(--mt-heading-tracking)}.mt-role-body{font-family:var(--mt-body-font);font-size:var(--mt-body);font-weight:var(--mt-body-weight);line-height:var(--mt-body-leading);letter-spacing:var(--mt-body-tracking)}.mt-role-label{font:var(--mt-label-weight) var(--mt-label) / var(--mt-label-leading) var(--mt-label-font);letter-spacing:var(--mt-label-tracking)}.mt-role-caption{font:var(--mt-caption-weight) var(--mt-caption) / var(--mt-caption-leading) var(--mt-caption-font);letter-spacing:var(--mt-caption-tracking)}.mt-role-numeric{font-family:var(--mt-numeric-font);font-size:var(--mt-numeric);font-weight:var(--mt-numeric-weight);line-height:var(--mt-numeric-leading);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}.mt-role-code{font-family:var(--mt-code-font);font-size:var(--mt-code);line-height:var(--mt-code-leading);white-space:pre}.mt-code-scroll{max-width:100%;overflow-x:auto;padding:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:8px}.mt-table{width:100%;table-layout:fixed;border-collapse:collapse;margin-top:16px}.mt-table td,.mt-table th{padding:10px;border-bottom:1px solid #e3e6eb;text-align:left}.mt-table td.numeric{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums}.mt-sample[data-policy=nowrap] p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-sample[data-policy=scroll] p{white-space:pre;overflow-x:auto}.mt-sample[data-policy=wrap] p{word-break:keep-all;overflow-wrap:anywhere}@media(max-width:720px){body{padding:14px}.mt-specimen{padding:16px}.mt-grid{grid-template-columns:minmax(0,1fr)}}\n${styles}</style><main class="mt-page"><h1>다국어 타이포그래피 코퍼스</h1><p>역할별 크기·굵기·행간·자간·실제 시스템 서체 폴백과 화면 폭·밀도 대응을 확인합니다.</p>${specimens}</main></html>`;
}
