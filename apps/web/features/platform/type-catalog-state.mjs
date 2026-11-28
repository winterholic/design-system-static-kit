export const TYPE_CATALOG_PAGE_SIZE = 24;
export const TYPE_COMPARE_LIMIT = 4;

/** @param {string | null} value @param {Set<string> | null} validIds */
export function normalizeTypeSelection(value, validIds = null) {
  const seen = new Set();
  return String(value ?? '').split(',').filter(Boolean).filter(id => {
    if (!/^[a-z0-9-]+$/.test(id) || seen.has(id) || (validIds && !validIds.has(id))) return false;
    seen.add(id);
    return true;
  }).slice(0, TYPE_COMPARE_LIMIT);
}

export function toggleTypeSelection(selection, id) {
  if (selection.includes(id)) return selection.filter(item => item !== id);
  if (selection.length >= TYPE_COMPARE_LIMIT) return selection;
  return [...selection, id];
}

export function typeCatalogHref(current, patch = {}) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === '' || value == null || (key === 'page' && Number(value) <= 1)) params.delete(key);
    else params.set(key, String(value));
  }
  const query = params.toString();
  return `/materials/typography${query ? `?${query}` : ''}`;
}

export function typeCatalogPage(value, pageCount) {
  const asked = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(asked) ? Math.min(Math.max(asked, 1), Math.max(pageCount, 1)) : 1;
}

export function typeCatalogFamily(item) {
  return item.tags?.find(tag => ['general-product', 'enterprise', 'finance', 'developer', 'marketing', 'editorial', 'commerce', 'mobile', 'education', 'experimental'].includes(tag)) ?? 'general-product';
}
