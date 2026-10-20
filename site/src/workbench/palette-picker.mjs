import {palettes, paletteFamilies, themes} from '../catalog.mjs';
import {escapeHTML as e} from '../render.mjs';

export const PAGE = 24;
export const compactLikes = n => n == null ? '' : n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + '만' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + '천' : String(n);

/** 필터에 맞는 팔레트 목록. 이 테마가 추천하는 팔레트가 항상 앞에 오고, 그다음은 좋아요 수 순이다. */
export function listPalettes({themeId, family, query, selected}) {
  const rec = themes[themeId].palettes, recIndex = id => rec.indexOf(id);
  let list = Object.values(palettes);
  if (family === 'recommended') list = rec.map(id => palettes[id]);
  else if (family !== 'all') list = list.filter(p => p.family === family);
  const q = query.trim().toLowerCase();
  if (q) list = list.filter(p => (p.name + ' ' + p.label + ' ' + p.id).toLowerCase().includes(q));
  list = [...list].sort((a, b) => {
    const ra = recIndex(a.id), rb = recIndex(b.id);
    if (ra !== rb) return (ra < 0 ? 1e9 : ra) - (rb < 0 ? 1e9 : rb);
    return (b.likes ?? -1) - (a.likes ?? -1) || a.name.localeCompare(b.name, 'ko');
  });
  // 고른 팔레트가 필터 밖이어도 맨 앞에 붙여 보여 준다.
  if (selected && !list.some(p => p.id === selected)) list = [palettes[selected], ...list];
  return list;
}

export const swatches = p => `<span class="swatches" aria-hidden="true">${p.colors.map(c => `<i style="background:${c}"></i>`).join('')}</span>`;

export function paletteCard(p, {checked, recommended}) {
  const fam = paletteFamilies[p.family];
  return `<label class="palette-option"><input type="radio" name="palette" value="${p.id}"${checked ? ' checked' : ''}><span class="sr-only">${e(p.name)}, ${fam.label}${recommended ? ', 이 테마 추천' : ''}</span>${swatches(p)}<span class="palette-label"><span>${e(p.name)}</span>${checked ? '<span class="palette-check" aria-hidden="true">✓</span>' : ''}</span><span class="palette-meta" aria-hidden="true"><span>${recommended ? '추천' : fam.label}</span>${p.likes ? `<span>♥ ${compactLikes(p.likes)}</span>` : ''}</span></label>`;
}

export function familyChips(active, counts) {
  const items = [['recommended', '추천'], ['all', '전체'], ...Object.entries(paletteFamilies).map(([id, f]) => [id, f.label])];
  return items.map(([id, label]) => `<button type="button" class="chip" data-family="${id}" aria-pressed="${id === active}">${id !== 'recommended' && id !== 'all' ? `<span class="dot" style="background:${paletteFamilies[id].swatch}"></span>` : ''}${e(label)} <small>${counts[id] ?? ''}</small></button>`).join('');
}

export function familyCounts(themeId) {
  const counts = {recommended: themes[themeId].palettes.length, all: Object.keys(palettes).length};
  for (const p of Object.values(palettes)) counts[p.family] = (counts[p.family] ?? 0) + 1;
  return counts;
}
