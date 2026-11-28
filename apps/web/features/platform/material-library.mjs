// A registry may grow beyond the Core service's page limit. Never hand the UI a silently truncated choice list.
/** @param {(query: {kind: string; limit: number; cursor?: string}) => {ok: boolean; value?: {items: any[]; nextCursor: string | null}}} listPage @param {string} kind @returns {any[]} */
export function listAllMaterials(listPage, kind) {
  const items = [];
  let cursor;
  do {
    const result = listPage({kind, limit: 200, ...(cursor ? {cursor} : {})});
    if (!result?.ok || !Array.isArray(result.value?.items)) return [];
    items.push(...result.value.items);
    cursor = result.value.nextCursor;
  } while (cursor);
  return items;
}

/**
 * Core assembleDesign 의 `pattern` 은 페이지 패턴 id(접두 없음 또는 `pattern:`)만 받는다. layout 재료 중 `reuses` 에 `pattern:*` 가 있는 것만
 * 그 패턴으로 조립된다. 레지스트리와 같은 값이어야 하므로 tests/platform-material-selection.test.mjs 가 이 표를 레지스트리와 대조한다.
 * @type {Readonly<Record<string, string>>}
 */
export const LAYOUT_PAGE_PATTERN = Object.freeze({
  'dashboard-grid': 'dashboard-grid', 'documentation-layout': 'docs-reference', 'editorial-layout': 'editorial-article',
  'commerce-grid': 'commerce-listing', 'product-detail-layout': 'commerce-detail', 'settings-layout': 'admin-settings',
});
/** @param {string} layoutId 짧은 layout 재료 id. 페이지 패턴이 없는 layout 은 id 를 그대로 돌려 Core 가 거부 이유를 말하게 한다. */
export const patternOfLayout = layoutId => LAYOUT_PAGE_PATTERN[layoutId] ?? layoutId;
