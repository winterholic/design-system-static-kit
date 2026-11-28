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
