import type {Blueprint, Diagnostic, PreviewScheme} from './types';
import type {Choice, Core, LayoutChoice} from './core';

export type CompileResult =
  | {ok: true; html: string; warnings: Diagnostic[]}
  | {ok: false; errors: Diagnostic[]};

/** 컴파일 한 번. 기본 구현은 Core 서비스의 compileBlueprint이며, 동기든 비동기든 받는다. */
export type CompileFn = (doc: Blueprint, scheme: PreviewScheme) => CompileResult | Promise<CompileResult>;

/** 객체 키를 재귀적으로 사전순 정렬한 JSON(공백 없음). CONTRACTS §5.2의 canonicalRequest다. */
export function canonicalJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalJson).join(',') + ']';
  }
  const record = val as Record<string, unknown>;
  const keys = Object.keys(record).filter(k => record[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(record[k])).join(',') + '}';
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * 브라우저와 Node에서 똑같이 동작하는 동기 SHA-256(16진수). 캐시 키가 환경마다 달라지거나 충돌하면
 * 다른 입력의 컴파일 결과를 돌려주게 되므로, 비암호학적 대체 해시를 쓰지 않는다.
 */
export function sha256Hex(text: string): string {
  const data = new TextEncoder().encode(text);
  const padded = new Uint8Array((((data.length + 9 + 63) >> 6) << 6));
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 0x100000000));
  view.setUint32(padded.length - 4, (data.length * 8) >>> 0);

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return h.map(n => n.toString(16).padStart(8, '0')).join('');
}

/** Blueprint가 고르는 재료 필드와 CONTRACTS §2.1 네임스페이스. 값은 같은 필드라도 카탈로그 버전이 다르면 다른 재료다. */
const MATERIAL_FIELDS: readonly [field: string, namespace: string][] = [
  ['theme', 'theme'], ['palette', 'palette'], ['colorPalette', 'color-palette'], ['typeRoles', 'type-roles'], ['profile', 'profile'],
];

/** CONTRACTS §5.2 materialIds: 요청이 고른 모든 재료의 "id@version"을 사전순 정렬해 ","로 이은 문자열. */
export function materialIdsOf(doc: Blueprint, catalogVersion: string): string {
  return MATERIAL_FIELDS
    .filter(([field]) => typeof doc[field] === 'string' && doc[field] !== '')
    .map(([field, ns]) => `${ns}:${doc[field]}@${catalogVersion}`)
    .sort()
    .join(',');
}

export const catalogVersionOf = (doc: Blueprint): string => (typeof doc.catalogVersion === 'string' ? doc.catalogVersion : 'unversioned');

/**
 * 엔진 버전: CONTRACTS §5.2의 PLATFORM_CONTRACT_VERSION + "/" + CONTRACT_VERSION. 웹은 src/platform을 import할 수 없으므로(boundary.check)
 * 공개 진입점(./service)이 내보내는 두 상수를 읽는다. 어느 쪽이 바뀌어도 모든 키가 바뀐다.
 * 상수를 읽지 못하면 "unknown"으로 두어 정상 버전의 키와 섞이지 않게 한다.
 */
export function engineVersionOf(core: Core | null): string {
  const s = core?.service as {CONTRACT_VERSION?: string; PLATFORM_CONTRACT_VERSION?: string} | undefined;
  return `${s?.PLATFORM_CONTRACT_VERSION ?? 'unknown'}/${s?.CONTRACT_VERSION ?? 'unknown'}`;
}

/**
 * CONTRACTS.md §5.2: SHA256(engineVersion:catalogVersion:materialIds:canonicalRequest:mode:viewport).slice(0, 32)
 * 컴파일 결과는 기기 폭에 의존하지 않으므로 Studio는 viewportWidth를 넘기지 않는다("default").
 */
export function computeCacheKey(
  engineVersion: string,
  catalogVersion: string,
  doc: Blueprint,
  mode: string,
  viewportWidth?: number | string,
): string {
  const vp = viewportWidth !== undefined ? String(viewportWidth) : 'default';
  const raw = `${engineVersion}:${catalogVersion}:${materialIdsOf(doc, catalogVersion)}:${canonicalJson(doc)}:${mode}:${vp}`;
  return sha256Hex(raw).slice(0, 32);
}

/**
 * LRU 캐시 (크기 상한과 최근 미사용 제거). 키에 버전이 들어 있어 만료 시간은 두지 않는다(CONTRACTS §5.3 동적 요청과 같은 정책).
 */
export class LRUCache<T> {
  private map = new Map<string, T>();
  readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = Math.max(1, maxSize);
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
      if (oldest !== undefined) this.map.delete(oldest);
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

/** 미리보기와 HTML 내보내기가 공유하는 컴파일 결과 캐시(상한 100). 서버 컴포넌트와는 인스턴스가 달라 공유되지 않는다. */
export const studioCompileCache = new LRUCache<CompileResult>(100);

/** Core 서비스의 compileBlueprint 호출. 색 보기(scheme)는 미리보기 사본에만 적용하고 문서는 바꾸지 않는다. */
export function coreCompile(core: Core): CompileFn {
  return (doc, scheme) => {
    const source = scheme === 'document' ? doc : {...doc, mode: scheme};
    const r = core.service.compileBlueprint(source, {include: ['html']});
    return r.ok
      ? {ok: true, html: (r.value.html as string) ?? '', warnings: r.warnings ?? []}
      : {ok: false, errors: r.errors ?? []};
  };
}

/** 캐시를 적용한 Blueprint 컴파일(동기). 내보내기가 미리보기와 같은 결과를 재사용한다. */
export function compileBlueprintWithCache(
  core: Core,
  doc: Blueprint,
  scheme: PreviewScheme,
): {result: CompileResult; fromCache: boolean; key: string} {
  const key = computeCacheKey(engineVersionOf(core), catalogVersionOf(doc), doc, scheme);
  const cached = studioCompileCache.get(key);
  if (cached) return {result: cached, fromCache: true, key};
  const result = coreCompile(core)(doc, scheme) as CompileResult;
  studioCompileCache.set(key, result);
  return {result, fromCache: false, key};
}

// ---- 후보 탐색(선택 가능성 판정) 재사용 -------------------------------------------------------------------------------
// 판정은 Core 연산(applyOp 등)이 하며 문서 전체를 읽는다. profile·mode·typeRoles·스타일 축이 바뀌면 결과가 실제로 바뀐다
// (compiler.unit.mjs가 Core로 확인). 그래서 "그 판정이 읽지 않음이 확인된 필드"만 키에서 빼고, 나머지가 모두 같을 때만 이전 결과를 쓴다.
// 판정 자체를 건너뛰는 일은 없다. 읽는 필드가 늘어나면 compiler.unit.mjs의 전수 비교가 먼저 깨진다.

/** Blueprint 최상위의 스타일 축 필드(mode 제외). */
export const STYLE_AXIS_FIELDS = ['shell', 'typography', 'density', 'radius', 'control', 'elevation', 'motion', 'icon', 'ornament', 'backdrop', 'width', 'scale', 'weight', 'footer'] as const;

/** 판정 묶음별로 결과에 영향이 없다고 확인된 필드. 각 trials의 "자기 필드"는 시험마다 덮어쓰므로 항상 뺀다. */
export const EXPLORATION_IGNORED = {
  choices: ['palette', 'typeRoles'],
  colorTrials: ['colorPalette', 'palette', 'typeRoles', 'mode', ...STYLE_AXIS_FIELDS],
  typeTrials: ['typeRoles', 'palette', 'mode', ...STYLE_AXIS_FIELDS],
  profileTrials: ['profile', 'palette', 'typeRoles'],
} as const satisfies Record<string, readonly string[]>;

export type ExplorationGroup = keyof typeof EXPLORATION_IGNORED;

/** 판정 묶음이 읽는 문서 부분의 정규화 문자열. 같으면 판정 결과도 같다. */
export function explorationKey(doc: Blueprint, group: ExplorationGroup): string {
  const ignored: readonly string[] = EXPLORATION_IGNORED[group];
  return canonicalJson(Object.fromEntries(Object.entries(doc).filter(([k]) => !ignored.includes(k))));
}

/** 후보 한 개의 시험 결과. 시험은 Core의 importBlueprint 연산이며 거부 진단을 그대로 담는다. */
export type Trial = {id: string; ok: boolean; errors: Diagnostic[]};

/** 2.6.0 재료 필드(colorPalette·typeRoles·profile)의 후보를 하나씩 문서에 넣어 보고 Core가 받아들이는지 시험한다. withNone은 필드를 지운 시험("없음")을 앞에 붙인다. */
export function candidateTrials(core: Core, doc: Blueprint, field: 'colorPalette' | 'typeRoles' | 'profile', values: string[], withNone: boolean): Trial[] {
  const run = (blueprint: Record<string, unknown>) => core.edit.applyOp(doc, 'importBlueprint', {blueprint, upgrade: true});
  const trial = (id: string, result: ReturnType<typeof run>): Trial => ({id, ok: result.ok, errors: result.ok ? [] : result.errors});
  const none = () => {
    const draft = {...doc, catalogVersion: '2.6.0'} as Record<string, unknown>;
    delete draft[field];
    return trial('', run(draft));
  };
  return [...(withNone ? [none()] : []), ...values.map(id => trial(id, run({...doc, catalogVersion: '2.6.0', [field]: id})))];
}

/** 디자인 탭이 선택지마다 보여 주는 "고를 수 있는가" 판정 묶음(Core src/edit/applicability.mjs). */
export function designChoices(core: Core, doc: Blueprint, themePalette: string, slots: {id: string; options: {id: string}[]}[]) {
  const e = core.edit;
  const byId = (list: Choice[]) => new Map(list.map(c => [String(c.id), c]));  // 변형의 "기본"은 id가 null이라 문자열 'null'로 찾는다
  return {
    themes: byId(e.themeChoices(doc, {palette: themePalette})),
    variants: byId(e.themeVariantChoices(doc, {palette: themePalette})),
    palettes: byId(e.paletteChoices(doc)),
    modes: byId(e.modeChoices(doc)),
    axes: Object.fromEntries(Object.entries(e.axisChoices(doc)).map(([axis, list]) => [axis, byId(list)])),
    layout: Object.fromEntries(Object.entries(e.layoutChoices(doc, slots)).map(([slot, list]: [string, LayoutChoice[]]) => [slot, new Map(list.map(c => [c.id, c]))])),
  };
}

/**
 * Studio 연속 편집 관리자
 * - 입력 디바운스: 마지막 입력 뒤 debounceMs가 지나야 컴파일한다.
 * - 동일 요청 중복 제거: 캐시에 있으면 컴파일하지 않고, 같은 키의 컴파일이 진행 중이면 그 결과를 함께 쓴다.
 * - 오래된 응답 무시: 더 새로운 schedule/cancel이 있었던 요청의 응답은 전달하지 않는다.
 */
export class StudioCompileManager {
  private compile: CompileFn | null;
  private engineVersion: string;
  private readonly debounceMs: number;
  private readonly cache: LRUCache<CompileResult>;
  private readonly onCompile?: () => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private currentRequestId = 0;
  private inflight = new Map<string, Promise<CompileResult>>();

  constructor(core: Core | null = null, options?: {debounceMs?: number; compile?: CompileFn; engineVersion?: string; cache?: LRUCache<CompileResult>; onCompile?: () => void}) {
    this.compile = options?.compile ?? (core ? coreCompile(core) : null);
    this.engineVersion = options?.engineVersion ?? engineVersionOf(core);
    this.debounceMs = options?.debounceMs ?? 75;
    this.cache = options?.cache ?? studioCompileCache;
    this.onCompile = options?.onCompile;
  }

  setCore(core: Core): void {
    this.compile = coreCompile(core);
    this.engineVersion = engineVersionOf(core);
  }

  /** 컴파일 예약. onResult는 이 요청이 최신일 때만, 캐시나 진행 중 요청을 재사용했으면 fromCache=true로 불린다. */
  schedule(
    doc: Blueprint,
    scheme: PreviewScheme,
    onResult: (result: CompileResult, meta: {fromCache: boolean; reqId: number}) => void,
  ): void {
    this.clearTimer();
    const reqId = ++this.currentRequestId;
    const run = () => { void this.execute(doc, scheme, reqId, onResult); };
    if (this.debounceMs <= 0) run();
    else this.timer = setTimeout(() => { this.timer = null; run(); }, this.debounceMs);
  }

  /** 대기 중인 예약을 취소하고, 이미 시작한 컴파일의 응답도 전달하지 않게 한다. */
  cancel(): void {
    this.clearTimer();
    this.currentRequestId++;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async execute(
    doc: Blueprint,
    scheme: PreviewScheme,
    reqId: number,
    onResult: (result: CompileResult, meta: {fromCache: boolean; reqId: number}) => void,
  ): Promise<void> {
    const compile = this.compile;
    if (!compile) return;
    const key = computeCacheKey(this.engineVersion, catalogVersionOf(doc), doc, scheme);
    const deliver = (result: CompileResult, fromCache: boolean) => {
      if (reqId === this.currentRequestId) onResult(result, {fromCache, reqId});
    };

    const cached = this.cache.get(key);
    if (cached) return deliver(cached, true);

    let pending = this.inflight.get(key);
    const joined = pending !== undefined;
    if (!pending) {
      pending = Promise.resolve()
        .then(() => {
          this.onCompile?.();
          return compile(doc, scheme);
        })
        // 예외로 끝난 결과는 일시적일 수 있어 캐시하지 않는다. 컴파일이 진단으로 거부한 결과는 입력이 같으면 같으므로 캐시한다.
        .then(res => {
          this.cache.set(key, res);
          return res;
        }, (e): CompileResult => ({ok: false, errors: [{code: 'INTERNAL', path: '$', message: `컴파일하지 못했습니다: ${String((e as Error)?.message ?? e).slice(0, 200)}`, hint: '문서를 다시 편집해 보세요.'}]}))
        .finally(() => { this.inflight.delete(key); });
      this.inflight.set(key, pending);
    }
    deliver(await pending, joined);
  }
}
