export function canonicalize(value: unknown): string;

export function computePreviewCacheKey(options: {
  compilerVersion?: string;
  catalogVersion?: string;
  materialId?: string;
  materialVersion?: string;
  request?: unknown;
  canonicalRequestJSON?: string | null;
  mode?: string;
  viewportWidth?: string | number | null;
}): string;

export class LruCache<K = any, V = any> {
  maxSize: number;
  map: Map<K, V>;
  constructor(maxSize?: number);
  readonly size: number;
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): this;
  delete(key: K): boolean;
  clear(): void;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
}

export const previewCache: LruCache<string, any>;
export const probeCache: LruCache<string, any>;
export const materialCache: LruCache<string, any>;
export const specCache: LruCache<string, any>;
