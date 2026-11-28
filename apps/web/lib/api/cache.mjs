import {createHash} from 'node:crypto';

/**
 * Recursively sorts object keys and trims string values for deterministic comparison and hashing.
 * @param {unknown} value
 * @returns {string} canonical JSON string
 */
export function canonicalize(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' ? value.trim() : value;
  }
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    const val = value[key];
    if (val !== undefined) {
      sorted[key] = sortValue(val);
    }
  }
  return sorted;
}

/**
 * CONTRACTS.md §5.2 결정론적 캐시 키 규격
 * CacheKey = SHA256(
 *   compilerVersion + ":" +
 *   catalogVersion + ":" +
 *   materialId + "@" + materialVersion + ":" +
 *   canonicalRequestJSON + ":" +
 *   mode + ":" +
 *   (viewportWidth ?? "default")
 * ).slice(0, 32)
 *
 * @param {object} [options]
 * @param {string} [options.compilerVersion]
 * @param {string} [options.catalogVersion]
 * @param {string} [options.materialId]
 * @param {string} [options.materialVersion]
 * @param {unknown} [options.request]
 * @param {string|null} [options.canonicalRequestJSON]
 * @param {string} [options.mode]
 * @param {string|number|null} [options.viewportWidth]
 * @returns {string}
 */
export function computePreviewCacheKey(options = {}) {
  const {
    compilerVersion = '2.0.0',
    catalogVersion = '2.6.0',
    materialId = '',
    materialVersion = '1.0.0',
    request = null,
    canonicalRequestJSON = null,
    mode = 'light',
    viewportWidth = 'default',
  } = options;

  const reqStr = canonicalRequestJSON ?? (request ? canonicalize(request) : '{}');
  const matStr = materialId ? `${materialId}@${materialVersion}` : '';
  const vpStr = viewportWidth !== undefined && viewportWidth !== null ? String(viewportWidth) : 'default';

  const raw = [
    String(compilerVersion).trim(),
    String(catalogVersion).trim(),
    matStr.trim(),
    reqStr,
    String(mode).trim(),
    vpStr.trim(),
  ].join(':');

  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * Bounded LRU cache using JavaScript Map insertion ordering.
 * Automatically evicts the least recently accessed item when capacity is reached.
 * @template K, V
 */
export class LruCache {
  /**
   * @param {number} [maxSize=1000]
   */
  constructor(maxSize = 1000) {
    this.maxSize = Math.max(1, maxSize);
    /** @type {Map<K, V>} */
    this.map = new Map();
  }

  get size() {
    return this.map.size;
  }

  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    return this.map.has(key);
  }

  /**
   * @param {K} key
   * @returns {V|undefined}
   */
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    // Refresh position to most recently used
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  /**
   * @param {K} key
   * @param {V} value
   * @returns {this}
   */
  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (first inserted / least recently used)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, value);
    return this;
  }

  /**
   * @param {K} key
   * @returns {boolean}
   */
  delete(key) {
    return this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  keys() {
    return this.map.keys();
  }

  values() {
    return this.map.values();
  }

  entries() {
    return this.map.entries();
  }
}

/** Pre-allocated server LRU caches bounded to 1,000 entries (CONTRACTS.md §5.3) */
export const previewCache = new LruCache(1000);
export const probeCache = new LruCache(1000);
export const materialCache = new LruCache(1000);
export const specCache = new LruCache(1000);
