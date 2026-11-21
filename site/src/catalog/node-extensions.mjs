import {nodeSpecs, str, en, arr, num, obj} from './nodes.mjs';

/**
 * 버전별 노드 명세 확장 표. `nodeSpecs`(src/catalog/nodes.mjs)는 2.1.0~2.5.0이 받아들이는 문법이고 snapshot 바이트
 * (site/v1/catalog.json)의 일부라서 여기서 넓히지 않는다. 아직 열리지 않은 카탈로그 버전의 문법은 이 표에만 둔다.
 * 항목의 필드는 같은 이름의 기본 필드를 덮어쓰고, `optional`은 기본 목록을 대체한다.
 * 2.6.0을 여는 작업은 `VERSION_ORDER`·`ACCEPTED_CATALOG_VERSIONS`에 버전을 더하는 것만으로 `nodeSpecAt`이 확장을 돌려준다(ADR 0011).
 */
const N = num(-1000000, 1000000);
export const CHART_BASE_KINDS = Object.freeze([...nodeSpecs.chart.fields.kind.enum]);
export const CHART_EXTENDED_KINDS = Object.freeze(['stacked-bar', 'scatter', 'heatmap', 'sparkline']);

const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };

export const NODE_SPEC_EXTENSIONS = deepFreeze({
  '2.6.0': {
    chart: {
      fields: {
        kind: en(...CHART_BASE_KINDS, ...CHART_EXTENDED_KINDS),
        unit: str(20), xLabel: str(60), yLabel: str(60),
        axis: obj({min: N, max: N, xMin: N, xMax: N, yMin: N, yMax: N, showX: en('yes', 'no'), showY: en('yes', 'no')}, []),
        categories: arr(str(64), 2, 8),
        series: arr(obj({name: str(40), values: arr(N, 2, 8), points: arr(obj({x: N, y: N}), 2, 8)}, ['name']), 1, 3),
      },
      optional: ['unit', 'xLabel', 'yLabel', 'axis', 'categories', 'series'],
    },
  },
});

const parts = version => (typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version) ? version.split('.').map(Number) : null);
/** 의미 있는 버전(x.y.z)끼리만 비교한다. 형식이 틀린 값은 어떤 확장도 켜지 않는다. */
export function versionAtLeast(version, since) {
  const a = parts(version), b = parts(since);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

const extensionsFor = version => Object.entries(NODE_SPEC_EXTENSIONS).filter(([since]) => versionAtLeast(version, since)).sort(([x], [y]) => (versionAtLeast(x, y) ? 1 : -1)).map(([, table]) => table);
/** 그 카탈로그 버전에서 `type` 노드의 확장이 켜지는가. 2.5.0 이하는 항상 false다. */
export const nodeExtended = (type, version) => extensionsFor(version).some(table => Object.hasOwn(table, type));

const cache = new Map();
/** 카탈로그 버전이 받아들이는 노드 명세. 확장이 없으면 `nodeSpecs[type]` 그 객체를 그대로 돌려준다. */
export function nodeSpecAt(type, version) {
  const base = nodeSpecs[type];
  if (!base) return base;
  const tables = extensionsFor(version).filter(table => Object.hasOwn(table, type));
  if (!tables.length) return base;
  const key = `${type}@${tables.length}`;
  if (!cache.has(key)) {
    const merged = tables.reduce((spec, table) => ({...spec, fields: {...spec.fields, ...table[type].fields}, optional: table[type].optional ?? spec.optional}), base);
    cache.set(key, Object.freeze(merged));
  }
  return cache.get(key);
}
