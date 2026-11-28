export function canonicalize(value: unknown): string;

export function computePreviewCacheKey(options: {
  engineVersion: string;
  catalogVersion: string;
  materialIds?: string[];
  request?: unknown;
  mode?: string;
  viewportWidth?: string | number | null;
}): string;

export function approxBytes(value: unknown): number;

export class LruCache<K = any, V = any> {
  maxSize: number;
  maxBytes: number;
  bytes: number;
  constructor(maxSize?: number, options?: {maxBytes?: number; sizeOf?: (value: V) => number});
  readonly size: number;
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): this;
  delete(key: K): boolean;
  clear(): void;
  keys(): IterableIterator<K>;
}

export const previewCache: LruCache<string, any>;
export const probeCache: LruCache<string, any>;
