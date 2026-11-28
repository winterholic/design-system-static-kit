import 'server-only';
import * as service from '@winterholic/design-system-static-kit/service';
import type {AssembleRequest, AssembleValue, Envelope, Material, ProposeValue, PurposeList, RecommendValue} from './types';
import {recordCompile} from '@/features/perf/counter.server';
import {LruCache, previewCache, probeCache} from '@/lib/api/cache.mjs';
import {previewKeyOf} from '@/lib/api/preview-keys.mjs';
import {pregeneratedProbe} from '@/features/explore/previews.server';
import {listAllMaterials} from './material-library.mjs';

// 조립 플랫폼 서비스 함수는 Core 서비스 진입점에서 이름으로 찾는다.
// 웹은 src/platform 을 직접 import 하지 않는다(boundary.check.mjs). 함수가 없을 때 대신 만들어 내는 값도 없다.
const mod = service as unknown as Record<string, ((arg?: any, opts?: any) => any) | undefined>;
const NEEDED = ['assembleDesign', 'assembleComponents', 'listPlatformMaterials', 'getPlatformMaterial', 'getTypographySpecimen', 'recommendMaterials', 'proposeSubtokenSets'] as const;
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
// 서버 캐시 키는 사전 생성 미리보기와 같은 규격이다(CONTRACTS §5.2: 엔진·카탈로그 버전 + 고른 재료 + 정규화한 요청 + 모드).
// 서버 메모리에만 두고 항목 수와 바이트 상한이 있다(lib/api/cache.mjs). 사용자가 입력한 콘텐츠가 든 결과를 공개 캐시에 두지 않는다.
export const assembleDesign = (request: AssembleRequest): Envelope<AssembleValue> => {
  const key = previewKeyOf({kind: 'assemble', request: request as Record<string, any>, width: null});
  const hit = previewCache.get(key) as Envelope<AssembleValue> | undefined;
  if (hit) return hit;
  recordCompile('assembleDesign');
  const result = call<AssembleValue>('assembleDesign', request, {include: WEB_INCLUDE});
  if (result.ok) previewCache.set(key, result);
  return result;
};

type ComponentsValue = {css: string; html: string; standalone: string; manifest: Record<string, any>};
export const assembleComponents = (request: Record<string, unknown>): Envelope<ComponentsValue> => {
  const key = previewKeyOf({kind: 'components', request, width: null});
  const hit = previewCache.get(key) as Envelope<ComponentsValue> | undefined;
  if (hit) return hit;
  recordCompile('assembleComponents');
  const result = call<ComponentsValue>('assembleComponents', request);
  if (result.ok) previewCache.set(key, result);
  return result;
};

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

const cache: any = new LruCache(1000);
const detailCache: any = new LruCache(1000);

export function materials(kind: string): Material[] {
  const hit = cache.get(kind);
  if (hit) return hit;
  const items = listAllMaterials(query => call<{items: Material[]; nextCursor: string | null}>('listPlatformMaterials', query), kind);
  if (items.length) cache.set(kind, items);
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

/** Core의 역할 변수를 가진 Specimen 자료. 이 조회는 컴파일하지 않는다. webfonts 를 켜면 서체 짝의 웹폰트를 스택 앞에 붙인 역할과 @font-face 를 함께 준다. */
export function typographySpecimen(id: string, options: {webfonts?: boolean} = {}): any | undefined {
  const r = call<any>('getTypographySpecimen', {id, ...(options.webfonts ? {webfonts: true} : {})});
  return r.ok ? r.value : undefined;
}

export type TypographyControl = {key: 'button' | 'input' | 'table'; label: string; purpose: string; context?: string; request?: Record<string, unknown>; reason?: string};
// 목적 패밀리마다 어울리는 페이지 맥락이 달라(표는 dashboard·data·listing·admin 뿐) 하나의 요청으로 묶으면 대부분의 시스템이 거부된다.
// 컨트롤마다 시스템이 허용하는 맥락을 차례로 시험해 Core 가 받는 첫 요청을 쓰고, 끝내 못 받으면 Core 의 이유를 그대로 낸다.
const CONTROL_SPECS = [
  {key: 'button', label: '버튼', purposes: ['purpose:button.primary']},
  {key: 'input', label: '입력', purposes: ['purpose:form.search', 'purpose:form.filter', 'purpose:form.input-kind']},
  {key: 'table', label: '표', purposes: ['purpose:table.business', 'purpose:table.dense']},
] as const;

/** 버튼·입력·표를 선택한 타이포 시스템으로 Core 에서 조립한 요청과 결과(또는 거부 이유). */
export function typographyControls(typeSystem: string, contexts: string[]): TypographyControl[] {
  return CONTROL_SPECS.map(spec => {
    let reason = '';
    for (const purpose of spec.purposes) {
      const entry = material(purpose) as any;
      if (!entry) continue;
      for (const context of contexts) {
        for (const visual of ['family:quiet', null]) {
          const request = {context, mode: 'light', density: 'comfortable', typeSystem, items: [{purpose, ...(visual ? {visual} : {}), variant: entry.example?.variant, props: entry.example?.props, content: entry.example?.content}]};
          const out = assembleComponents(request);
          if (out.ok) return {key: spec.key, label: spec.label, purpose, context, request};
          reason ||= out.errors.map(e => e.message).join(' ');
        }
      }
    }
    return {key: spec.key, label: spec.label, purpose: spec.purposes[0], reason: reason || 'Core가 이 시스템의 맥락에서 조립하지 못했습니다.'};
  });
}

/** 선택지 시험용 조립: 거부 여부와 이유만 남기고(본문은 버린다) 같은 요청은 서버 프로세스 안의 상한 있는 캐시를 거친다. */
export function probeDesign(request: AssembleRequest): {ok: true} | {ok: false; reason: string} {
  // 사전 생성 때 이미 조립해 본 요청이면 목록 요청에서 다시 컴파일하지 않는다.
  const known = pregeneratedProbe({...request, candidates: 1} as Record<string, unknown>);
  if (known) return known;
  const key = previewKeyOf({kind: 'assemble', request: {...request, candidates: 1} as Record<string, any>, width: null});
  const hit = probeCache.get(key) as {ok: true} | {ok: false; reason: string} | undefined;
  if (hit) return hit;
  const r = assembleDesign({...request, candidates: 1});
  const out = r.ok ? {ok: true as const} : {ok: false as const, reason: r.errors.map(e => e.message).join(' ')};
  probeCache.set(key, out);
  return out;
}
