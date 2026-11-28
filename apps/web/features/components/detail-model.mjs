export const DETAIL_TABS = Object.freeze([
  {id: 'overview', label: 'Overview'},
  {id: 'variants', label: 'Variants'},
  {id: 'states', label: 'States'},
  {id: 'sizes', label: 'Sizes'},
  {id: 'playground', label: 'Playground'},
  {id: 'tokens', label: 'Tokens'},
  {id: 'code', label: 'Code'},
  {id: 'accessibility', label: 'Accessibility'},
  {id: 'composition', label: 'Composition'},
]);

const AXES = ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'size', 'density', 'appearance', 'state', 'mode', 'content', 'viewport'];
const allowedTabs = new Set(DETAIL_TABS.map(tab => tab.id));

export function buildTabs(view) {
  const material = view?.material;
  const hasVariants = Boolean(view?.variants?.length || view?.variantGroups?.length);
  const hasStates = Boolean(material?.states?.values?.length);
  const hasSizes = Boolean(view?.variantGroups?.some(group => /size/i.test(group.name)) || Object.keys(material?.variants ?? {}).some(name => /size/i.test(name)));
  const hasTokens = Boolean(material?.tokens?.length);
  const hasComposition = Boolean(view?.parents?.length || view?.children?.allowed?.length || view?.related?.length || view?.pageTypes?.requiredBy?.length || view?.pageTypes?.forbiddenIn?.length);
  return DETAIL_TABS.filter(tab => tab.id === 'overview'
    || tab.id === 'variants' && hasVariants
    || tab.id === 'states' && hasStates
    || tab.id === 'sizes' && hasSizes
    || tab.id === 'playground' && Boolean(material)
    || tab.id === 'tokens' && hasTokens
    || tab.id === 'code'
    || tab.id === 'accessibility'
    || tab.id === 'composition' && hasComposition);
}

export function visibleSlice(items, page = 0, pageSize = 4) {
  const size = Math.max(1, Math.floor(pageSize));
  const maxPage = Math.max(0, Math.ceil(items.length / size) - 1);
  const current = Math.min(maxPage, Math.max(0, Math.floor(page)));
  const start = current * size;
  const end = Math.min(items.length, start + size);
  return {items: items.slice(start, end), start, end, total: items.length};
}

export function readDetailUrl(params) {
  const tab = params.get('tab');
  const axes = {};
  for (const axis of AXES) {
    const value = params.get(axis);
    if (value && value.length <= 120) axes[axis] = value;
  }
  return {
    component: params.get('component') || null,
    tab: allowedTabs.has(tab) ? tab : 'overview',
    axes,
  };
}

export function writeDetailUrl(state) {
  const params = new URLSearchParams();
  if (state.component) params.set('component', state.component);
  if (state.tab && state.tab !== 'overview' && allowedTabs.has(state.tab)) params.set('tab', state.tab);
  for (const axis of AXES) {
    const value = state.axes?.[axis];
    if (typeof value === 'string' && value && value.length <= 120) params.set(axis, value);
  }
  return params.toString();
}

export function exportedSources(result) {
  return {
    html: result['index.html'] ?? result.html,
    css: result['tokens.css'] ?? result.css,
    tokens: result['tokens.json'] ?? result.tokens,
    blueprint: result['blueprint.json'] ?? result.blueprint,
  };
}

export function createCompileCache(limit, versions) {
  const capacity = Math.max(1, Math.floor(limit));
  const versionPrefix = `${versions.platform}/${versions.contract}:`;
  const entries = new Map();
  const key = request => versionPrefix + request;
  return {
    key,
    get size() { return entries.size; },
    has(request) { return entries.has(key(request)); },
    get(request) {
      const k = key(request);
      if (!entries.has(k)) return undefined;
      const value = entries.get(k);
      entries.delete(k); entries.set(k, value);
      return value;
    },
    set(request, value) {
      const k = key(request);
      entries.delete(k); entries.set(k, value);
      while (entries.size > capacity) entries.delete(entries.keys().next().value);
    },
  };
}
