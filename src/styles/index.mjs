import {axisVars, coreCSS, tailCSS} from './base.mjs';
import {shellCSS} from './shells.mjs';
import {chunks} from './chunks.mjs';
import {nodeTypes} from '../catalog.mjs';

const DEPS = {gallery: ['media'], bento: ['media']};
const shade = mode => (mode === 'dark' ? 'rgba(0,0,0,.5)' : 'rgba(16,21,28,.14)');
const tokenDecls = (tokens, mode) => Object.entries(tokens).map(([k, v]) => `--kit-${k}:${v};`).join('') + `--kit-shade:${shade(mode)};`;
const opposite = mode => (mode === 'dark' ? 'light' : 'dark');

export function usedTypes(tree) {
  const used = new Set();
  const walk = n => { used.add(n.type); n.children?.forEach(walk); };
  walk(tree);
  return used;
}

/** sets: {light?: tokens, dark?: tokens, inverse?: {light?, dark?}} — token objects only. */
export function stylesheet(b, sets) {
  const used = usedTypes(b.tree);
  for (const t of [...used]) for (const d of DEPS[t] ?? []) used.add(d);
  const parts = [`/* Generated from catalog ${b.catalogVersion}. Edit the blueprint, then rebuild. */`];
  const auto = b.mode === 'auto';
  const baseMode = auto ? 'light' : b.mode;
  parts.push(`:root{${tokenDecls(sets[baseMode], baseMode)}${axisVars(b)}color-scheme:${auto ? 'light dark' : b.mode};}`);
  if (auto) parts.push(`@media(prefers-color-scheme:dark){:root{${tokenDecls(sets.dark, 'dark')}}}`);
  const inverseSel = '.kit-section[data-surface=inverse]>.kit-section-inner,.kit-cta[data-tone=inverse]';
  if (sets.inverse) {
    const opp = opposite(baseMode);
    parts.push(`${inverseSel}{${tokenDecls(sets.inverse[opp], opp)}}`);
    if (auto) parts.push(`@media(prefers-color-scheme:dark){${inverseSel}{${tokenDecls(sets.inverse.light, 'light')}}}`);
    parts.push('.kit-cta[data-tone=inverse]{background:var(--kit-canvas);color:var(--kit-text);border-color:var(--kit-border)}');
  }
  parts.push(coreCSS.trim());
  parts.push(shellCSS(b).trim());
  for (const type of nodeTypes) if (used.has(type) && chunks[type]) parts.push(chunks[type].trim());
  parts.push(tailCSS.trim());
  return parts.join('\n') + '\n';
}
