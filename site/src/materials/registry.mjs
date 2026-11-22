/**
 * 재료 레지스트리. 등록할 때 계약을 검사하고(통과하지 못하면 등록하지 않는다), id·종류·맥락으로 찾는다.
 * 수량은 셋을 따로 센다: 재료 수, 속성 조합 수, 완성 프리셋 수. 조합은 프리셋으로 세지 않는다.
 */
import {BUILTIN_KINDS, combinationsOf, isCompletePreset, QUALITY, CATEGORIES} from './contract.mjs';
import {validateMaterial, validateGraph} from './validate.mjs';

const deepFreeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; };
const tally = (items, key) => Object.fromEntries([...items.reduce((m, x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));

export class MaterialError extends Error {
  constructor(message, errors) { super(message); this.name = 'MaterialError'; this.errors = errors; }
}

export function createRegistry({kinds = BUILTIN_KINDS} = {}) {
  const kindMap = new Map(), byId = new Map();
  const registry = {
    /** 종류를 더한다. 이미 있는 id는 거부한다(기존 종류의 의미를 바꾸지 않는다). */
    addKind(kind) {
      if (kindMap.has(kind.id)) throw new MaterialError(`kind already registered: ${kind.id}`, [{code: 'M_KIND_DUPLICATE', path: '$.kind', message: kind.id}]);
      kindMap.set(kind.id, kind);
      return registry;
    },
    kind: id => kindMap.get(id) ?? null,
    kinds: () => [...kindMap.values()],

    /** 재료 하나를 검사해 등록한다. 실패하면 MaterialError(errors)이고 레지스트리는 그대로다. */
    register(material) {
      const errors = validateMaterial(material, kindMap.get(material?.kind));
      if (material && byId.has(material.id)) errors.push({code: 'M_DUPLICATE', path: '$.id', message: `이미 등록된 id: ${material.id}`});
      if (errors.length) throw new MaterialError(`material rejected: ${material?.id ?? '(no id)'}\n` + errors.map(e => `${e.path} [${e.code}] ${e.message}`).join('\n'), errors);
      byId.set(material.id, deepFreeze(structuredClone(material)));
      return registry;
    },
    registerAll(list) { for (const m of list) registry.register(m); return registry; },

    get: id => byId.get(id) ?? null,
    has: id => byId.has(id),
    list: () => [...byId.values()],

    /**
     * 조건으로 거른다. 모든 조건은 AND. context는 그 맥락을 명시했거나 any인 재료를 고른다.
     * minQuality: 이 등급 이상만(QUALITY 순서). preset: true면 완성 프리셋만.
     */
    filter({kind, category, context, minQuality, preset, tag} = {}) {
      const rank = minQuality ? QUALITY.indexOf(minQuality) : -1;
      if (minQuality && rank < 0) throw new MaterialError(`unknown quality ${minQuality}`, [{code: 'M_ENUM', path: '$.minQuality', message: minQuality}]);
      if (category && !CATEGORIES.includes(category)) throw new MaterialError(`unknown category ${category}`, [{code: 'M_ENUM', path: '$.category', message: category}]);
      return registry.list().filter(m =>
        (!kind || m.kind === kind) && (!category || m.category === category) &&
        (!context || m.contexts.includes(context) || m.contexts.includes('any')) &&
        (rank < 0 || QUALITY.indexOf(m.quality.status) >= rank) &&
        (preset === undefined || registry.isPreset(m) === preset) && (!tag || m.tags.includes(tag)));
    },
    byKind: kind => registry.filter({kind}),
    byContext: context => registry.filter({context}),

    /** 낱말 검색(id·label·tags, 대소문자 무시, 모든 낱말이 맞아야 함) + filter 조건. 결과는 id 순. */
    search(query = '', criteria = {}) {
      const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
      return registry.filter(criteria)
        .filter(m => { const hay = [m.id, m.label, ...m.tags].join(' ').toLowerCase(); return words.every(w => hay.includes(w)); })
        .sort((a, b) => a.id.localeCompare(b.id));
    },

    isPreset: m => isCompletePreset(m, kindMap.get(m.kind)),
    combinations: m => combinationsOf(m),

    /** 세 수량을 따로 센다. attributeCombinations는 재료별 속성 곱의 합이다(재료 사이의 곱이 아니다). */
    counts() {
      const all = registry.list();
      return {
        materials: all.length,
        attributeCombinations: all.reduce((n, m) => n + combinationsOf(m), 0),
        completePresets: all.filter(registry.isPreset).length,
        byKind: tally(all, m => m.kind), byCategory: tally(all, m => m.category), byQuality: tally(all, m => m.quality.status),
      };
    },

    /** 등록된 재료끼리의 참조 검사. 등록 순서와 무관하게 마지막에 한 번 부른다. */
    check: () => validateGraph(byId),
  };
  for (const k of kinds) registry.addKind(k);
  return registry;
}
