/**
 * 플랫폼 레지스트리(ADR 0012 §1). 재료 종류마다 같은 인터페이스(KindRegistry)를 가진 칸이 하나씩 있다.
 *
 *   const reg = createPlatformRegistry();
 *   reg.kind('palette').register(record)        검사를 통과한 재료만 등록한다(실패하면 PlatformError, 레지스트리는 그대로)
 *   reg.kind('base-component').implement(id, {contract, render, styles})   기반 컴포넌트의 실제 구현을 붙인다
 *   reg.get(id) / reg.has(id) / reg.list(kind?)  종류와 상관없이 id로 찾는다
 *   reg.check()                                  등록이 끝난 뒤 참조 무결성 검사(관계 대상·패밀리 구성원·구현 연결)
 *
 * 레지스트리는 전역 상태가 없다. 같은 입력으로 만든 레지스트리는 같은 순서로 같은 값을 낸다.
 */
import {PLATFORM_KINDS, validatePlatformMaterial} from './contract.mjs';

export class PlatformError extends Error {
  constructor(message, errors) { super(message); this.name = 'PlatformError'; this.errors = errors; }
}

const deepFreeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; };

/**
 * KindRegistry: {kind, register(record), get(id), has(id), list(), filter({context, tag, minQuality}), implement?(id, impl), implementation?(id)}.
 * implement는 base-component 칸에만 있다. 구현은 함수라 얼리지 않고, 기록(데이터)과 따로 둔다.
 */
function createKindRegistry(kind, byId) {
  const own = new Map(), impls = new Map();
  const kr = {
    kind,
    register(record) {
      const errors = record?.kind === kind ? validatePlatformMaterial(record) : [{code: 'P_KIND', path: '$.kind', message: `${kind} 칸에는 ${kind} 재료만 등록합니다`}];
      if (record && byId.has(record.id)) errors.push({code: 'P_DUPLICATE', path: '$.id', message: `이미 등록된 id: ${record.id}`});
      if (errors.length) throw new PlatformError(`platform material rejected: ${record?.id ?? '(no id)'}\n` + errors.map(e => `${e.path} [${e.code}] ${e.message}`).join('\n'), errors);
      const frozen = deepFreeze(structuredClone(record));
      own.set(record.id, frozen); byId.set(record.id, frozen);
      return kr;
    },
    get: id => own.get(id) ?? null,
    has: id => own.has(id),
    list: () => [...own.values()].sort((a, b) => a.id.localeCompare(b.id)),
    filter({context, tag, minQuality} = {}) {
      const order = ['draft', 'implemented', 'verified'], rank = minQuality ? order.indexOf(minQuality) : -1;
      return kr.list().filter(m => (!context || m.contexts.includes('any') || m.contexts.includes(context)) && (!tag || m.tags.includes(tag)) && (rank < 0 || order.indexOf(m.quality.status) >= rank));
    },
  };
  if (kind === 'base-component') {
    /** impl: {contract: defineContract 결과, render(input) → HTML, styles: CSS 문자열}. 기록의 contract id와 같아야 한다. */
    kr.implement = (id, impl) => {
      const record = own.get(id);
      const errors = [];
      if (!record) errors.push({code: 'P_IMPL_UNKNOWN', path: '$.id', message: `등록되지 않은 기반 컴포넌트: ${id}`});
      else if (impl?.contract?.id !== record.contract) errors.push({code: 'P_IMPL_CONTRACT', path: '$.contract', message: `구현 계약 ${impl?.contract?.id}가 기록의 ${record.contract}와 다릅니다`});
      if (typeof impl?.render !== 'function' || typeof impl?.styles !== 'string') errors.push({code: 'P_IMPL_SHAPE', path: '$', message: '구현은 render 함수와 styles 문자열을 가져야 합니다'});
      if (errors.length) throw new PlatformError(`implementation rejected: ${id}`, errors);
      impls.set(id, Object.freeze({...impl}));
      return kr;
    };
    kr.implementation = id => impls.get(id) ?? null;
  }
  return kr;
}

export function createPlatformRegistry() {
  const byId = new Map();
  const kinds = new Map(PLATFORM_KINDS.map(k => [k, createKindRegistry(k, byId)]));
  const reg = {
    kind(k) { const kr = kinds.get(k); if (!kr) throw new PlatformError(`unknown platform kind: ${k}`, [{code: 'P_KIND', path: '$.kind', message: k}]); return kr; },
    kinds: () => [...kinds.keys()],
    get: id => byId.get(id) ?? null,
    has: id => byId.has(id),
    list: kind => (kind ? reg.kind(kind).list() : [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))),
    /** 등록한 기록 전체를 한 번에. 종류 칸은 기록의 kind로 고른다. */
    registerAll(records) { for (const r of records) reg.kind(r?.kind).register(r); return reg; },
    /** 참조 무결성. [{code, path, message}]. 빈 배열이면 통과. */
    check() {
      const out = [];
      for (const m of reg.list()) {
        m.relations.forEach((e, i) => { if (!byId.has(e.to)) out.push({code: 'P_EDGE_DANGLING', path: `${m.id}.relations[${i}].to`, message: `등록되지 않은 대상: ${e.to}`}); });
        if (m.kind === 'family') for (const base of Object.keys(m.members)) {
          if (!byId.has(base)) out.push({code: 'P_FAMILY_BASE', path: `${m.id}.members.${base}`, message: `등록되지 않은 기반 컴포넌트: ${base}`});
          else if (!reg.kind('base-component').implementation(base)) out.push({code: 'P_FAMILY_IMPL', path: `${m.id}.members.${base}`, message: `구현이 붙지 않은 기반 컴포넌트: ${base}`});
        }
        if (m.kind === 'base-component' && !reg.kind('base-component').implementation(m.id)) out.push({code: 'P_IMPL_MISSING', path: m.id, message: '구현(implement)이 없습니다'});
      }
      return out;
    },
  };
  return reg;
}
