import {createHash} from 'node:crypto';

// 미리보기·조립 결과의 캐시 키와 서버 메모리 캐시. 규격은 docs/dev/catalog-platform-upgrade/CONTRACTS.md §5.2, §5.3 이다.

/**
 * 객체 키를 재귀적으로 사전순 정렬한 JSON(공백 없음). 문자열 값은 trim 하지 않는다(콘텐츠가 바뀌므로, §5.2).
 * undefined 값은 JSON 과 같이 빠진다.
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalize(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) sorted[key] = sortValue(value[key]);
  }
  return sorted;
}

const need = (name, value) => {
  if (typeof value !== 'string' || !value) throw new Error(`computePreviewCacheKey: ${name} 가 필요합니다(기본값을 두지 않는다. 버전이 어긋난 캐시를 재사용하지 않기 위해서다).`);
  return value;
};

/**
 * §5.2 의 캐시 키: SHA256(engineVersion:catalogVersion:materialIds:canonicalRequest:mode:viewportWidth).slice(0, 32)
 *
 * @param {object} o
 * @param {string} o.engineVersion  PLATFORM_CONTRACT_VERSION + "/" + CONTRACT_VERSION
 * @param {string} o.catalogVersion
 * @param {string[]} [o.materialIds]  요청이 고른 모든 재료의 "id@version". 여기서 사전순 정렬해 ","로 잇는다.
 * @param {unknown} o.request  정규화 전 요청. canonicalize 한다.
 * @param {string} [o.mode]
 * @param {string|number|null} [o.viewportWidth]
 */
export function computePreviewCacheKey({engineVersion, catalogVersion, materialIds = [], request, mode = 'light', viewportWidth} = {}) {
  const raw = [
    need('engineVersion', engineVersion),
    need('catalogVersion', catalogVersion),
    [...materialIds].sort().join(','),
    canonicalize(request ?? {}),
    String(mode),
    viewportWidth === undefined || viewportWidth === null ? 'default' : String(viewportWidth),
  ].join(':');
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/** 값의 대략적인 메모리 크기(문자열 길이 기준). 큰 문서 문자열이 들어 있는 조립 결과의 바이트 상한 계산에 쓴다. */
export function approxBytes(value) {
  if (typeof value === 'string') return value.length * 2;
  if (value === null || typeof value !== 'object') return 8;
  let total = 16;
  for (const v of Array.isArray(value) ? value : Object.values(value)) total += approxBytes(v);
  return total;
}

/**
 * 개수와 바이트 두 가지 상한이 있는 LRU. 가장 오래 쓰지 않은 항목부터 제거한다.
 * 키에 엔진·카탈로그 버전이 들어 있으므로 만료 시각은 두지 않는다(§5.3).
 * @template K, V
 */
export class LruCache {
  /**
   * @param {number} [maxSize=1000] 항목 수 상한
   * @param {{maxBytes?: number, sizeOf?: (value: V) => number}} [options] maxBytes 를 넘으면 오래된 항목부터 지운다
   */
  constructor(maxSize = 1000, {maxBytes = Infinity, sizeOf = approxBytes} = {}) {
    this.maxSize = Math.max(1, maxSize);
    this.maxBytes = maxBytes;
    this.sizeOf = sizeOf;
    this.bytes = 0;
    /** @type {Map<K, {value: V, bytes: number}>} */
    this.map = new Map();
  }

  get size() {
    return this.map.size;
  }

  has(key) {
    return this.map.has(key);
  }

  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key, value) {
    const bytes = this.maxBytes === Infinity ? 0 : this.sizeOf(value);
    // 한 항목이 바이트 상한보다 크면 캐시하지 않는다(다른 항목을 모두 밀어내지 않는다).
    if (bytes > this.maxBytes) { this.delete(key); return this; }
    const old = this.map.get(key);
    if (old) { this.bytes -= old.bytes; this.map.delete(key); }
    this.map.set(key, {value, bytes});
    this.bytes += bytes;
    while (this.map.size > this.maxSize || this.bytes > this.maxBytes) {
      const oldest = this.map.keys().next().value;
      this.bytes -= this.map.get(oldest).bytes;
      this.map.delete(oldest);
    }
    return this;
  }

  delete(key) {
    const old = this.map.get(key);
    if (!old) return false;
    this.bytes -= old.bytes;
    return this.map.delete(key);
  }

  clear() {
    this.map.clear();
    this.bytes = 0;
  }

  keys() {
    return this.map.keys();
  }
}

// 서버 프로세스 안의 캐시. 모두 상한이 있다. 조립 결과(standalone 문서 포함)는 크므로 바이트 상한도 둔다.
const MB = 1024 * 1024;
export const previewCache = new LruCache(1000, {maxBytes: 96 * MB});
export const probeCache = new LruCache(1000);
