import type {Blueprint, Diagnostic, PreviewScheme} from './types';
import type {Core} from './core';

export type CompileResult =
  | {ok: true; html: string; warnings: Diagnostic[]}
  | {ok: false; errors: Diagnostic[]};

/**
 * 객체 키를 재귀적으로 정렬하여 결정론적인 JSON 문자열을 생성합니다.
 */
export function canonicalJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson((val as Record<string, unknown>)[k])).join(',') + '}';
}

/**
 * Node.js와 브라우저 양쪽에서 동작하는 결정론적 32자 해시 생성기
 */
function hashHex(str: string): string {
  try {
    // Node.js 환경에서 표준 SHA-256 사용
    const nodeCrypto = typeof process !== 'undefined' && process.versions?.node ? eval('require')('node:crypto') : null;
    if (nodeCrypto?.createHash) {
      return nodeCrypto.createHash('sha256').update(str).digest('hex').slice(0, 32);
    }
  } catch {}

  // 브라우저 환경을 위한 결정론적 해시 계산
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  let h3 = 0x9e3779b9 ^ str.length;
  let h4 = 0x85ebca6b ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).slice(0, 32);
}

/**
 * CONTRACTS.md §5.2 에 따른 캐시 키 계산
 */
export function computeCacheKey(
  compilerVersion: string,
  catalogVersion: string,
  doc: Blueprint,
  mode: string,
  viewportWidth?: number | string
): string {
  const materialIdentifier = `${doc.theme ?? 'none'}@${catalogVersion}`;
  const canonicalRequest = canonicalJson(doc);
  const vp = viewportWidth !== undefined ? String(viewportWidth) : 'default';
  const rawKey = `${compilerVersion}:${catalogVersion}:${materialIdentifier}:${canonicalRequest}:${mode}:${vp}`;
  return hashHex(rawKey);
}

/**
 * LRU 캐시 구현 (크기 상한 및 최근 사용 제거 정책)
 */
export class LRUCache<T> {
  private map: Map<string, T>;
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = Math.max(1, maxSize);
    this.map = new Map();
  }

  get(key: string): T | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
    this.map.set(key, value);
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * 조립 결과와 미리보기가 공유하는 전역 싱글톤 캐시 (상한 100)
 */
export const studioCompileCache = new LRUCache<CompileResult>(100);

export const DEFAULT_COMPILER_VERSION = '2.0.0';

/**
 * 캐시를 적용한 Blueprint 컴파일
 */
export function compileBlueprintWithCache(
  core: Core,
  doc: Blueprint,
  scheme: PreviewScheme,
  opts?: {device?: number; compilerVersion?: string}
): {result: CompileResult; fromCache: boolean; key: string} {
  const compilerVer = opts?.compilerVersion ?? DEFAULT_COMPILER_VERSION;
  const catalogVer = doc.catalogVersion ?? '2.4.0';
  const key = computeCacheKey(compilerVer, catalogVer, doc, scheme, opts?.device);

  const cached = studioCompileCache.get(key);
  if (cached) {
    return {result: cached, fromCache: true, key};
  }

  const source = scheme === 'document' ? doc : {...doc, mode: scheme};
  const r = core.service.compileBlueprint(source, {include: ['html']});
  const result: CompileResult = r.ok
    ? {ok: true, html: (r.value.html as string) ?? '', warnings: r.warnings ?? []}
    : {ok: false, errors: r.errors ?? []};

  studioCompileCache.set(key, result);
  return {result, fromCache: false, key};
}

/**
 * Studio 연속 편집 관리자
 * - 입력 디바운스
 * - 동일 요청 중복 제거
 * - 오래된 비동기 응답 무시 (Monotonic Request ID)
 */
export class StudioCompileManager {
  private core: Core | null;
  private debounceMs: number;
  private timer: NodeJS.Timeout | null = null;
  private currentRequestId = 0;
  private latestDispatchedRequestId = 0;
  private inflightPromises = new Map<string, Promise<CompileResult>>();

  constructor(core: Core | null = null, options?: {debounceMs?: number}) {
    this.core = core;
    this.debounceMs = options?.debounceMs ?? 60;
  }

  setCore(core: Core): void {
    this.core = core;
  }

  /**
   * 컴파일 예약 (디바운스 적용)
   */
  schedule(
    doc: Blueprint,
    scheme: PreviewScheme,
    onResult: (result: CompileResult, meta: {fromCache: boolean; reqId: number}) => void,
    opts?: {device?: number; compilerVersion?: string}
  ): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const reqId = ++this.currentRequestId;
    const compilerVer = opts?.compilerVersion ?? DEFAULT_COMPILER_VERSION;
    const catalogVer = doc.catalogVersion ?? '2.4.0';
    const key = computeCacheKey(compilerVer, catalogVer, doc, scheme, opts?.device);

    const execute = async () => {
      // 캐시 확인
      const cached = studioCompileCache.get(key);
      if (cached) {
        if (reqId >= this.latestDispatchedRequestId) {
          this.latestDispatchedRequestId = reqId;
          onResult(cached, {fromCache: true, reqId});
        }
        return;
      }

      if (!this.core) return;

      // 동일 요청 In-flight 중복 제거
      let promise = this.inflightPromises.get(key);
      if (!promise) {
        promise = (async () => {
          const source = scheme === 'document' ? doc : {...doc, mode: scheme};
          const r = this.core!.service.compileBlueprint(source, {include: ['html']});
          const res: CompileResult = r.ok
            ? {ok: true, html: (r.value.html as string) ?? '', warnings: r.warnings ?? []}
            : {ok: false, errors: r.errors ?? []};
          studioCompileCache.set(key, res);
          return res;
        })();
        this.inflightPromises.set(key, promise);
      }

      try {
        const result = await promise;
        // 최신 응답이 이미 디스패치되었으면 낡은 응답 무시
        if (reqId >= this.latestDispatchedRequestId) {
          this.latestDispatchedRequestId = reqId;
          onResult(result, {fromCache: false, reqId});
        }
      } finally {
        this.inflightPromises.delete(key);
      }
    };

    if (this.debounceMs <= 0) {
      void execute();
    } else {
      this.timer = setTimeout(() => {
        void execute();
      }, this.debounceMs);
    }
  }

  /**
   * 오래된 응답 무시 검증용 커스텀 비동기 작업 실행
   */
  executeCustom(
    customPromise: Promise<CompileResult>,
    onResult: (result: CompileResult, reqId: number) => void
  ): number {
    const reqId = ++this.currentRequestId;
    void customPromise.then(res => {
      if (reqId >= this.latestDispatchedRequestId) {
        this.latestDispatchedRequestId = reqId;
        onResult(res, reqId);
      }
    });
    return reqId;
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
