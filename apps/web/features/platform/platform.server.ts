import 'server-only';
import * as service from '@winterholic/design-system-static-kit/service';
import type {AssembleRequest, AssembleValue, Envelope, Material, ProposeValue, PurposeList, RecommendValue} from './types';

// 조립 플랫폼 서비스 함수는 Core 서비스 진입점에서 이름으로 찾는다. 아직 공개되지 않았으면(W5-b 대기) 화면은 "연결 대기"를 보인다.
// 웹은 src/platform 을 직접 import 하지 않는다(boundary.check.mjs). 함수가 없을 때 대신 만들어 내는 값도 없다.
const mod = service as unknown as Record<string, ((arg?: any) => any) | undefined>;
const NEEDED = ['assembleDesign', 'listPlatformMaterials', 'recommendMaterials'] as const;
const missing = () => NEEDED.filter(name => typeof mod[name] !== 'function');

export const platformReady = () => missing().length === 0;
export const missingFunctions = () => missing();
const call = <T>(name: string, arg?: unknown): Envelope<T> => {
  const fn = mod[name];
  if (typeof fn !== 'function') return {ok: false, errors: [{code: 'SERVICE_MISSING', path: '$', message: `Core 서비스에 ${name} 함수가 아직 없습니다.`, hint: 'W5-b 공개 뒤에 연결됩니다.'}]};
  return fn(arg) as Envelope<T>;
};

export const assembleDesign = (request: AssembleRequest) => call<AssembleValue>('assembleDesign', request);
export const assembleComponents = (request: Record<string, unknown>) => call<{css: string; html: string; standalone: string; manifest: Record<string, any>}>('assembleComponents', request);
export const recommend = (q: Record<string, unknown>) => call<RecommendValue>('recommendMaterials', q);
export const proposeSets = (seeds: unknown) => call<ProposeValue>('proposeSubtokenSets', {seeds});
export const purposeFamilies = (group?: string) => call<PurposeList>('listPurposeFamilies', group ? {group} : {});

const cache = new Map<string, Material[]>();
export function materials(kind: string): Material[] {
  const hit = cache.get(kind);
  if (hit) return hit;
  const r = call<{items: Material[]}>('listPlatformMaterials', {kind});
  const items = r.ok ? r.value.items : [];
  if (r.ok) cache.set(kind, items);
  return items;
}
export const material = (id: string): Material | undefined => materials(id.split(':')[0]).find(m => m.id === id);

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
