import {catalogRegistry, createRegistry, defineMaterial} from '../src/materials/index.mjs';

/** 통합 중 재료(차트 프리셋·Select·데이터 테이블)를 뺀 기본 레지스트리. 기준 브랜치에 그 재료가 이미 있어도 "대기" 동작을 같은 조건에서 검사한다. */
export const INTEGRATING = id => id.startsWith('chart-preset:') || id === 'component:select-control' || id === 'component:data-table';
export function catalogWithoutIntegrating() {
  const full = catalogRegistry(), r = createRegistry({kinds: full.kinds()});
  for (const m of full.list()) if (!INTEGRATING(m.id)) r.register(structuredClone(m));
  return r;
}
export const fakeChartPreset = id => defineMaterial({id, kind: 'chart-preset', category: 'chart', label: 'fake', since: '2.6.0', render: {module: 'src/render/chart.mjs', export: 'renderChart'}, quality: {status: 'implemented', evidence: []}, ext: {chartKind: 'bar', series: {}, axes: null}});
