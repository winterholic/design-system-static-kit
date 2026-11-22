import 'server-only';
import * as service from '@winterholic/design-system-static-kit/service';
import type {AssembleRequest, AssembleValue, Envelope, Material, ProposeValue, PurposeList, RecommendValue} from './types';

// 조립 플랫폼 서비스 함수는 Core 서비스 진입점에서 이름으로 찾는다.
// 웹은 src/platform 을 직접 import 하지 않는다(boundary.check.mjs). 함수가 없을 때 대신 만들어 내는 값도 없다.
const mod = service as unknown as Record<string, ((arg?: any, opts?: any) => any) | undefined>;
const NEEDED = ['assembleDesign', 'assembleComponents', 'listPlatformMaterials', 'getPlatformMaterial', 'recommendMaterials', 'proposeSubtokenSets'] as const;
const WEB_INCLUDE = ['html', 'css', 'tokens', 'manifest', 'blueprint', 'script', 'standalone'] as const;
const missing = () => NEEDED.filter(name => typeof mod[name] !== 'function');

export const platformReady = () => missing().length === 0;
export const missingFunctions = () => missing();
const call = <T>(name: string, arg?: unknown, opts?: unknown): Envelope<T> => {
  const fn = mod[name];
  if (typeof fn !== 'function') return {ok: false, errors: [{code: 'SERVICE_MISSING', path: '$', message: `Core 서비스에 ${name} 함수가 아직 없습니다.`, hint: 'Core 서비스 진입점에 공개되면 연결됩니다.'}]};
  return fn(arg, opts) as Envelope<T>;
};

// Core omits standalone (and other optional payloads) by default. Request the actual service output
// explicitly so previews and downloads return the same document the Core assembled.
export const assembleDesign = (request: AssembleRequest) => call<AssembleValue>('assembleDesign', request, {include: WEB_INCLUDE});
export const assembleComponents = (request: Record<string, unknown>) => call<{css: string; html: string; standalone: string; manifest: Record<string, any>}>('assembleComponents', request);
export const recommend = (q: Record<string, unknown>) => call<RecommendValue>('recommendMaterials', q);
export const proposeSets = (seeds: unknown) => call<ProposeValue>('proposeSubtokenSets', {seeds});

/** Purpose-family definitions share the public family material registry; visual-family records are not coerced into purpose definitions. */
export function purposeFamilies(group?: string): Envelope<PurposeList> {
  const purposes = call<{items: Material[]}>('listPlatformMaterials', {kind: 'purpose-family', limit: 200});
  if (!purposes.ok) return purposes;
  const families = call<{items: Material[]}>('listPlatformMaterials', {kind: 'family', limit: 200});
  if (!families.ok) return families;
  const items: PurposeList['items'] = [];
  for (const row of purposes.value.items) {
    const detail = material(row.id);
    if (!detail) return {ok: false, errors: [{code: 'PURPOSE_FAMILY_DETAIL_MISSING', path: '$.items', message: `목적 패밀리 ${row.id}의 상세 기록을 읽지 못했습니다.`}]};
    items.push(detail as unknown as PurposeList['items'][number]);
  }
  if (!items.length) return {ok: false, errors: [{code: 'PURPOSE_FAMILY_MISSING', path: '$.items', message: 'Core의 purpose-family 재료 목록에 목적 패밀리 정의가 아직 없습니다.'}], warnings: purposes.warnings};
  const visuals = families.value.items.map(row => ({id: row.id.slice('family:'.length), label: row.label}));
  const groups = [...new Set(items.map(item => item.group))];
  return {ok: true, value: {items: group ? items.filter(item => item.group === group) : items, groups, visuals}, warnings: [...purposes.warnings, ...families.warnings]};
}

const cache = new Map<string, Material[]>();
const detailCache = new Map<string, Material>();
export function materials(kind: string): Material[] {
  const hit = cache.get(kind);
  if (hit) return hit;
  const r = call<{items: Material[]}>('listPlatformMaterials', {kind});
  const items = r.ok ? r.value.items : [];
  if (r.ok) cache.set(kind, items);
  return items;
}
// Lists are intentionally summaries; fetch the registered record for seeds, roles, relations and render data.
export function material(id: string): Material | undefined {
  const hit = detailCache.get(id);
  if (hit) return hit;
  const r = call<Material>('getPlatformMaterial', {id});
  if (!r.ok) return undefined;
  detailCache.set(id, r.value);
  return r.value;
}

/** 선택지 시험용 조립: 거부 여부와 이유만 남기고(본문은 버린다) 같은 요청은 서버 프로세스 안에서 한 번만 돌린다. */
const probes = new Map<string, {ok: true} | {ok: false; reason: string}>();
export function probeDesign(request: AssembleRequest): {ok: true} | {ok: false; reason: string} {
  const key = JSON.stringify(request);
  const hit = probes.get(key);
  if (hit) return hit;
  const r = assembleDesign({...request, candidates: 1});
  const out = r.ok ? {ok: true as const} : {ok: false as const, reason: r.errors.map(e => e.message).join(' ')};
  if (probes.size > 400) probes.clear();
  probes.set(key, out);
  return out;
}
