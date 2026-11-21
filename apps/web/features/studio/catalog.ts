// 카탈로그 조회 모음. Core 로딩이 끝난 뒤에만 부른다. 결과는 한 번 만들어 모듈 안에 둔다(조회는 읽기 전용이다).
import type {Core} from './core';
import type {AxisItem, CatalogItem, ComponentItem, ComponentSpec, LayoutSlot, PaletteItem, ThemeItem} from './types';

export type Catalog = {
  templates: CatalogItem[];
  themes: ThemeItem[];
  palettes: PaletteItem[];
  axes: AxisItem[];
  components: ComponentItem[];
};

function all<T>(core: Core, q: Record<string, unknown>): T[] {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 20; guard++) {
    const r = core.service.listCatalog({...q, limit: 200, ...(cursor ? {cursor} : {})});
    if (!r.ok) throw new Error('listCatalog 실패: ' + r.errors.map(e => e.message).join(' '));
    items.push(...(r.value.items as T[]));
    if (!r.value.nextCursor) break;
    cursor = r.value.nextCursor;
  }
  return items;
}

let cached: Catalog | null = null;
export function loadCatalog(core: Core): Catalog {
  cached ??= {
    templates: all<CatalogItem>(core, {kind: 'templates'}),
    themes: all<ThemeItem>(core, {kind: 'themes', fields: ['id', 'name', 'palettes', 'variants', 'forbid']}),
    palettes: all<PaletteItem>(core, {kind: 'palettes', fields: ['id', 'label']}),
    axes: all<AxisItem>(core, {kind: 'axes', fields: ['axis', 'label', 'values', 'descriptions']}),
    components: all<ComponentItem>(core, {kind: 'components', filter: {catalogVersion: '2.6.0'}, fields: ['type', 'label', 'group', 'childTypes']}),
  };
  return cached;
}

const slotCache = new Map<string, LayoutSlot[]>();
export function layoutSlotsOf(core: Core, template: string): LayoutSlot[] {
  let slots = slotCache.get(template);
  if (!slots) {
    const r = core.service.listCatalog({kind: 'layoutSlots', filter: {template}, fields: ['id', 'label', 'options'], limit: 200});
    slots = r.ok ? (r.value.items as LayoutSlot[]) : [];
    slotCache.set(template, slots);
  }
  return slots;
}

const specCache = new Map<string, ComponentSpec | null>();
export function specOf(core: Core, type: string, catalogVersion?: string): ComponentSpec | null {
  const key = `${type}@${catalogVersion ?? 'default'}`;
  if (!specCache.has(key)) {
    const r = core.service.getComponentSpec({type, ...(catalogVersion ? {catalogVersion} : {})});
    specCache.set(key, r.ok ? r.value : null);
  }
  return specCache.get(key) ?? null;
}
