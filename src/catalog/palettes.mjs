import {paletteRows} from './palette-rows.mjs';

export const palettes = Object.fromEntries(paletteRows.map(([theme, id, name, slug, brand, label]) => [id, {
  id,
  name,
  label,
  theme,
  colors: slug.split('-').map(x => '#' + x.toUpperCase()),
  brand,
  source: {
    url: 'https://coolors.co/palette/' + slug.toLowerCase(),
    discovery: 'https://coolors.co/palettes/popular',
    observed: '2026-10-18',
    method: 'rendered Coolors palette listing (Playwright Chromium / ttakkari_browser), swatches read from page text',
    evidence: 'docs/evidence/coolors-palettes.json',
  },
}]));
