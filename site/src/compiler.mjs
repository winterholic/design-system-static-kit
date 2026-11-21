import {CATALOG_VERSION, BLUEPRINT_VERSION, rules, axes, styleAxes} from './catalog.mjs';
import {validateBlueprint} from './validate.mjs';
import {resolveTokens, resolveAll, contrast, serializableContrast} from './tokens.mjs';
import {stylesheet, typeRolesManifest} from './styles.mjs';
import {renderTree, escapeHTML, formRuntime, controlRuntime} from './render.mjs';
import {planComposition, auditPage} from './composition.mjs';
import {typeRev, HANGUL} from './typography.mjs';
import {resolveColorTokens, colorTokenUsage} from './color-tokens.mjs';
export {validateBlueprint, resolveTokens, contrast};

const opposite = m => (m === 'dark' ? 'light' : 'dark');
const usesInverse = tree => /"surface":"inverse"|"tone":"inverse"/.test(JSON.stringify(tree));

export function compile(input) {
  const result = validateBlueprint(input);
  if (!result.valid) { const error = new Error('Invalid blueprint:\n' + result.errors.map(x => `${x.path} [${x.code}] ${x.message}`).join('\n')); error.errors = result.errors; throw error; }
  const b = structuredClone(input);
  const resolved = resolveAll(b), tokens = Object.fromEntries(Object.entries(resolved).map(([m, r]) => [m, r.tokens]));
  const report = Object.entries(resolved).flatMap(([mode, r]) => r.report.map(p => ({mode, ...p})));
  const sets = {...tokens};
  if (usesInverse(b.tree)) {
    sets.inverse = {};
    for (const m of ['light', 'dark']) {
      if (tokens[m]) sets.inverse[m] = tokens[m];
      else { const r = resolveTokens(b, m); sets.inverse[m] = r.tokens; report.push(...r.report.map(p => ({mode: m + ' (inverse)', ...p}))); }
    }
  }
  if (report.some(x => x.ratio < x.minimum)) throw new Error('Contrast gate failed');
  const design = planComposition(b);
  const artLog = {}, body = renderTree(b, design, artLog);
  auditPage(design, artLog.arts);
  const css = stylesheet(b, sets, body, design);
  const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'";
  const scheme = b.mode === 'auto' ? 'light dark' : b.mode;
  // Browser chrome follows the page (Vercel web-interface-guidelines: theme-color matches the page background).
  const themeColor = b.mode === 'auto' ? `<meta name="theme-color" content="${tokens.light.canvas}" media="(prefers-color-scheme: light)"><meta name="theme-color" content="${tokens.dark.canvas}" media="(prefers-color-scheme: dark)">` : `<meta name="theme-color" content="${tokens[b.mode].canvas}">`;
  const html = `<!doctype html>\n<html lang="ko" data-theme="${b.mode}" data-motion="${b.motion}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="color-scheme" content="${scheme}">${themeColor}<meta name="generator" content="Static Kit ${b.catalogVersion}"><title>${escapeHTML(b.name)}</title><style>\n${css}</style><noscript><style>.kit-tabpanel[hidden]{display:block}.kit-tablist{display:none}</style></noscript></head><body>${body}<script>${formRuntime}${controlRuntime(b)}</script></body></html>\n`;
  const primary = resolved[b.mode === 'auto' ? 'light' : b.mode];
  const manifest = {
    blueprintVersion: BLUEPRINT_VERSION, catalogVersion: b.catalogVersion, theme: b.theme, palette: b.palette, mode: b.mode, pageType: b.pageType,
    axes: Object.fromEntries(styleAxes.map(k => [k, b[k]])), rules: rules.map(x => x.id),
    paletteProvenance: primary.provenance, contrast: serializableContrast(report), blueprint: b,
  };
  if (b.colorPalette) {
    const color = resolveColorTokens({palette: b.colorPalette, mode: b.mode});
    manifest.colorTokens = {palette: color.palette, layers: Object.keys(color.layers), references: color.references, contrast: serializableContrast(report.filter(x => !x.mode.includes('inverse'))), materialModules: ['src/color-tokens.mjs','src/materials/adapters.mjs'], usedTokens: colorTokenUsage()};
  }
  const typeRoles = typeRolesManifest(b);
  if (typeRoles) manifest.typeRoles = typeRoles;
  if (design) manifest.design = {version: design.version, decisions: design.decisions, inherited: design.inherited};
  if (design?.chrome) manifest.design.chrome = design.chrome;
  // Page rules (composition 1.3.0, catalog 2.4.0): facts and decisions about the whole page. Absent for 2.1–2.3 inputs, whose output is pinned.
  if (design?.page) manifest.design.page = {version: design.page.version, facts: design.page.facts, decisions: design.page.decisions};
  // Typography revision 2 (catalog 2.3.0): recorded so a consumer can tell which Hangul limits shaped the page. Absent for 2.1/2.2 inputs, whose output is pinned.
  if (design && typeRev(b) === 2) manifest.design.typography = {revision: 2, limits: HANGUL};
  return {html, css, tokens, manifest};
}
