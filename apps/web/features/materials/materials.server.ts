import 'server-only';
import {axisChoices, resetDocument} from '@winterholic/design-system-static-kit/edit';
import {listCatalog, queryMaterials} from '@winterholic/design-system-static-kit/service';
import {FOUNDATION_CATEGORIES, categoryRows} from './foundations-exhibit.mjs';
import type {ColorFamily, ColorRow, ColorView, FoundationAxis, IconRow, PresetView, RampView, SeedView, TypeView} from './types';

// Materials 화면이 읽는 값은 모두 Core(재료 레지스트리·색 토큰·타이포그래피 재료)에서 ./service의 queryMaterials로 읽는다. 이 파일은 화면 모양으로 옮길 뿐 값을 정하지 않는다.
// Coolors 팔레트(kind: palette) 427개는 권리 감사 결론(docs/materials/audit.md §3)에 따라 읽지도 내보내지도 않는다.

const memo = <T,>(fn: () => T) => { let v: T | undefined; return () => (v ??= fn()); };

/** queryMaterials 한 보기. 실패하면 화면을 만들 수 없으므로 던진다(빌드가 멈춘다). */
function material<T = any>(view: 'color' | 'typography' | 'foundations'): T {
  const r = queryMaterials({view}) as {ok: boolean; value: T; errors?: {message: string}[]};
  if (!r.ok) throw new Error(`queryMaterials(${view}) 실패: ${r.errors?.[0]?.message}`);
  return r.value;
}

const FAMILY_LABEL: Record<string, string> = {brand: '브랜드', neutral: '중립', auxiliary: '보조', 'status.success': '성공', 'status.warning': '주의', 'status.danger': '오류', 'status.info': '정보'};
const COMPONENT_LABEL: Record<string, string> = {button: '버튼', control: '입력 컨트롤', input: '입력', select: '선택', card: '카드', table: '표', chart: '차트'};
const LAYER_LABEL = {primitive: '기본 색', semantic: '역할 색', state: '상태 색', component: '부품 색'} as const;

const familyLabel = (id: string) => FAMILY_LABEL[id] ?? (id.startsWith('chart.') ? `차트 ${Number(id.slice(6)) + 1}` : id);

/** 램프 키(brand, status.success, chart.2)를 시드 이름과 맞춘다. */
function rampEntries(ramps: Record<string, any>, seeds: Record<string, any>): {id: string; seed: string; steps: Record<string, string>}[] {
  const out: {id: string; seed: string; steps: Record<string, string>}[] = [];
  for (const key of ['brand', 'neutral', 'auxiliary']) out.push({id: key, seed: seeds[key], steps: ramps[key]});
  for (const key of Object.keys(ramps.status)) out.push({id: `status.${key}`, seed: seeds.status[key], steps: ramps.status[key]});
  Object.keys(ramps.chart).forEach(i => out.push({id: `chart.${i}`, seed: seeds.chart[Number(i)], steps: ramps.chart[i]}));
  return out;
}

export const colorView = memo((): ColorView => {
  const data = material<any>('color');
  const palette = data.palette;

  const seeds: SeedView[] = [
    {id: 'brand', label: familyLabel('brand'), hex: palette.seeds.brand, usage: palette.usage.brand},
    {id: 'neutral', label: familyLabel('neutral'), hex: palette.seeds.neutral, usage: palette.usage.neutral},
    {id: 'auxiliary', label: familyLabel('auxiliary'), hex: palette.seeds.auxiliary, usage: palette.usage.auxiliary},
    ...Object.entries(palette.seeds.status as Record<string, string>).map(([k, hex]) => ({id: `status.${k}`, label: familyLabel(`status.${k}`), hex, usage: palette.usage.status})),
    ...(palette.seeds.chart as string[]).map((hex, i) => ({id: `chart.${i}`, label: familyLabel(`chart.${i}`), hex, usage: palette.usage.chart})),
  ];
  const ramps: RampView[] = rampEntries(data.ramps, palette.seeds).map(r => ({
    id: r.id, label: familyLabel(r.id), seed: r.seed,
    steps: Object.entries(r.steps).map(([step, hex]) => ({step, hex, isSeed: hex.toLowerCase() === r.seed.toLowerCase()})),
  }));

  // 색 토큰 재료를 화면 행으로 옮긴다. 부품 사용처 행(light가 null)은 CSS 변수 이름으로 계산 결과에서 값을 찾는다.
  const usage = new Map<string, {component: string; states: string[]}[]>();
  for (const u of data.usage as {component: string; cssName: string; states: string[]}[]) usage.set(u.cssName, [...(usage.get(u.cssName) ?? []), {component: COMPONENT_LABEL[u.component] ?? u.component, states: u.states}]);
  const valueByCss = (tokens: Record<string, string>, cssName: string) => tokens[cssName.replace(/^--kit-/, '')] ?? null;
  const materials = data.materials as any[];
  const labelOfId = (id: string) => materials.find(m => m.id === id)?.label ?? id.replace('color-token:', '');

  const rows: ColorRow[] = materials.map((m: any): ColorRow => {
    const cssName: string = m.tokens[0];
    const layer = m.ext.layer as ColorRow['layer'];
    const isUsage = m.ext.light === null && m.ext.dark === null;
    const role: string = m.ext.role;
    let family: string;
    let name: string;
    if (layer === 'primitive') {
      const parts = role.replace(/^static-kit\./, '').split('.');
      const step = parts.pop()!;
      family = parts.join('.');
      name = `${familyLabel(family)} ${step}`;
    } else if (layer === 'component') {
      const [component, ...rest] = role.split('.');
      family = component;
      name = `${COMPONENT_LABEL[component] ?? component} · ${rest.join(' ')}`;
    } else { family = layer; name = role; }
    return {
      id: m.id, layer, family, name, cssName,
      light: isUsage ? valueByCss(data.tokens.light, cssName) : m.ext.light,
      dark: isUsage ? valueByCss(data.tokens.dark, cssName) : m.ext.dark,
      refs: m.dependencies.map((d: string) => ({id: d, label: labelOfId(d)})),
      usedBy: usage.get(cssName) ?? [],
      states: isUsage ? m.states.values : [],
      kind: isUsage ? 'usage' : 'token',
    };
  });

  const families: ColorFamily[] = [
    ...ramps.map(r => ({id: r.id, label: r.label, layer: 'primitive' as const})),
    {id: 'semantic', label: '역할 색', layer: 'semantic' as const},
    {id: 'state', label: '상태 색', layer: 'state' as const},
    ...[...new Set((data.usage as {component: string}[]).map(u => u.component))].filter(c => rows.some(r => r.family === c)).map(c => ({id: c, label: COMPONENT_LABEL[c] ?? c, layer: 'component' as const})),
  ];
  // 행이 없는 가족은 선택지로 내놓지 않는다.
  const known = new Set(rows.map(r => r.family));
  const shownFamilies = families.filter(f => known.has(f.id));

  const sceneVars = (tokens: Record<string, string>) => Object.fromEntries(Object.entries(tokens).filter(([k]) => !k.startsWith('palette-') && !k.startsWith('component-')).map(([k, v]) => [`--kit-${k}`, v]));
  const contrast = (report: any[]) => report.map((r: any) => ({name: r.name, ratio: r.ratio, minimum: r.minimum}));

  return {
    palette: {id: palette.id, version: palette.version},
    seeds, ramps, rows, families: shownFamilies,
    layers: (Object.keys(LAYER_LABEL) as (keyof typeof LAYER_LABEL)[]).map(id => ({id, label: LAYER_LABEL[id], count: rows.filter(r => r.layer === id).length})),
    scenes: {light: sceneVars(data.tokens.light), dark: sceneVars(data.tokens.dark)},
    contrast: {light: contrast(data.report.light), dark: contrast(data.report.dark)},
  };
});

// ---------------------------------------------------------------- 타이포그래피

/** clamp(1.75rem,3.6vw,2.75rem) → "28–44px". 계산 결과 문자열을 읽기 쉽게 풀 뿐 값을 새로 정하지 않는다. */
function sizeRange(size: string): string {
  const m = /^clamp\(([\d.]+)rem,[\d.]+vw,([\d.]+)rem\)$/.exec(size);
  if (m) return `${Math.round(+m[1] * 16)}–${Math.round(+m[2] * 16)}px`;
  const px = /^([\d.]+)px$/.exec(size);
  return px ? `${px[1]}px` : size;
}

export const typeView = memo((): TypeView => {
  const data = material<any>('typography');
  const presets: PresetView[] = (data.presets as any[]).map(p => ({
    id: p.id, label: p.label, density: p.density, context: p.context, engine: p.engine,
    roles: Object.entries(p.roles as Record<string, any>).map(([name, spec]) => ({name, size: sizeRange(spec.size), weight: spec.weight, lineHeight: spec.lineHeight, tracking: spec.trackingEm, policy: spec.policy, fontFamily: String(spec.fontFamily).split(',')[0].replace(/"/g, '')})),
    controls: Object.entries(p.controls as Record<string, any>).map(([size, c]) => ({size, height: c.height, padX: c.padX, gap: c.gap, iconPx: c.iconPx, labelRole: c.labelRole})),
    css: data.css[p.id],
    webfontCss: data.webfontCss?.[p.id] ?? '',
    webfontRoleCss: data.webfontRoleCss?.[p.id] ?? '',
  }));
  return {
    presets,
    corpus: (data.corpus as any[]).map(c => ({id: c.id, role: c.role, text: c.text, policy: c.policy})),
    controlSizes: data.controlSizes as string[],
    studioTemplates: Object.fromEntries(presets.map(p => [p.id, templateFor(p.context[0])])),
    webfonts: data.webfonts,
    webfontCss: data.webfontCss,
  };
});

// ---------------------------------------------------------------- 기초 재료(간격·반경·깊이·모션·아이콘·폭 등)

const foundations = memo(() => material<any>('foundations'));

type AxisRow = {axis: string; label: string; values: string[]; descriptions: Record<string, string>};
const axisRows = memo(() => {
  const r = listCatalog({kind: 'axes', fields: ['axis', 'label', 'values', 'descriptions']} as never) as {ok: boolean; value: {items: AxisRow[]}};
  if (!r.ok) throw new Error('listCatalog(axes) 실패');
  return r.value.items;
});

/** Studio 기본 문서에서 이 축 값이 지금 받아들여지는지. Studio의 선택 가능성 판정(edit.axisChoices)을 그대로 쓴다. */
const studioAxisVerdicts = memo(() => {
  const made = resetDocument(null, {discard: true} as never) as {ok: boolean; doc: unknown};
  if (!made.ok) throw new Error('기본 문서를 만들 수 없습니다');
  return axisChoices(made.doc as never) as Record<string, {id: string; ok: boolean; errors: {code: string}[]}[]>;
});

/** 화면에서 보여 주는 기초 재료 축. 순서는 보는 사람의 질문 순서(간격→모양→깊이→움직임→아이콘→글자→배치)를 따른다. */
const FOUNDATION_ORDER = ['density', 'radius', 'control', 'elevation', 'motion', 'icon', 'weight', 'scale', 'width', 'ornament', 'backdrop', 'shell', 'footer'] as const;
export const foundationAxes = memo((): FoundationAxis[] => {
  const byId = new Map(axisRows().map(a => [a.axis, a]));
  return FOUNDATION_ORDER.flatMap(axis => {
    const row = byId.get(axis);
    const axisMaterial = foundations().axes.find((a: any) => a.id === `axis:${axis}`);
    if (!row || !axisMaterial) return [];
    const verdicts = new Map((studioAxisVerdicts()[axis] ?? []).map(c => [c.id, c]));
    return [{
      axis, label: row.label, category: axisMaterial.category as string, table: axisMaterial.ext.table ?? null,
      values: row.values.map(v => ({id: v, description: row.descriptions[v] ?? '', studio: verdicts.get(v)?.ok === false ? {ok: false as const, code: verdicts.get(v)!.errors[0]?.code ?? '충돌'} : {ok: true as const}})),
    }];
  });
});

export const iconRows = memo((): IconRow[] => {
  const out: IconRow[] = [];
  for (let cursor: string | undefined; ;) {
    const r = listCatalog({kind: 'icons', fields: ['id', 'paths'], limit: 200, ...(cursor ? {cursor} : {})} as never) as {ok: boolean; value: {items: {id: string; paths: string[]}[]; nextCursor: string | null}};
    if (!r.ok) throw new Error('listCatalog(icons) 실패');
    out.push(...r.value.items.map(i => ({id: i.id, paths: i.paths})));
    if (!r.value.nextCursor) return out;
    cursor = r.value.nextCursor;
  }
});

export const layoutPrimitives = memo(() => (foundations().layoutPrimitives as {id: string; label: string; css: string}[]).map(m => ({id: m.id.replace('layout-primitive:', ''), label: m.label, css: m.css})));

/** Selected-category imports split server data/code and cap rendered rows to that category only. */
export async function foundationExhibit(id: string) {
  if (!FOUNDATION_CATEGORIES.some(category => category.id === id)) return null;
  let rows: any[] = [];
  let roles: any[] = [];
  let facets: any[] = [];
  let radius: FoundationAxis | undefined;
  let elevation: FoundationAxis | undefined;
  let radiusTokens: Record<string, number> = {};
  let elevationTokens: Record<string, any> = {};
  let facetShadows: Record<string, string> = {};
  let patterns: any[] = [];
  let icons: IconRow[] = [];
  let chartTokens: Record<string, string> = {};
  let backgroundTokens: Record<string, string> = {};
  let chartCss = '';
  let chartCount = 0;

  if (id === 'spacing' || id === 'density') {
    const {SPACING_MATERIALS, SPACING_ROLES} = await import('../../../../src/platform/data/spacing.mjs');
    rows = [...SPACING_MATERIALS];
    if (id === 'spacing') roles = [...SPACING_ROLES];
  } else if (id === 'radius' || id === 'border' || id === 'elevation' || id === 'surface') {
    const [{SURFACE_FACETS, SURFACES, FACET_SHADOW}, {ELEVATION, RADIUS}] = await Promise.all([
      import('../../../../src/platform/data/surfaces.mjs'), import('../../../../src/styles/base.mjs'),
    ]);
    facets = [...SURFACE_FACETS] as any[];
    radiusTokens = RADIUS;
    elevationTokens = ELEVATION;
    facetShadows = FACET_SHADOW;
    if (id === 'radius') {
      rows = foundationAxes().find(axis => axis.axis === 'radius')?.values ?? [];
      radius = foundationAxes().find(axis => axis.axis === 'radius');
      elevation = foundationAxes().find(axis => axis.axis === 'elevation');
    } else if (id === 'border') {
      rows = [...new Set(facets.map(facet => facet.border))].map(border => ({id: border, border, ...facets.find(facet => facet.border === border)}));
      elevation = foundationAxes().find(axis => axis.axis === 'elevation');
    } else if (id === 'elevation') {
      rows = [...new Set(facets.map(facet => facet.elevation))].map(elevation => ({id: elevation, elevation, ...facets.find(facet => facet.elevation === elevation)}));
      elevation = foundationAxes().find(axis => axis.axis === 'elevation');
    } else {
      rows = [...SURFACES];
    }
  } else if (id === 'background') {
    const {BACKGROUNDS} = await import('../../../../src/platform/data/backgrounds.mjs');
    rows = [...BACKGROUNDS];
    const scene = colorView().scenes.light;
    backgroundTokens = Object.fromEntries(['--kit-canvas', '--kit-soft', '--kit-action', '--kit-accent', '--kit-rule', '--kit-border'].flatMap(key => scene[key] ? [[key, scene[key]]] : []));
  } else if (id === 'motion') {
    const {MOTIONS, MOTION_PATTERNS} = await import('../../../../src/platform/data/motion.mjs');
    rows = [...MOTIONS];
    patterns = [...MOTION_PATTERNS];
  } else if (id === 'icon') {
    const {ICON_MATERIALS} = await import('../../../../src/platform/data/icons.mjs');
    rows = [...ICON_MATERIALS];
    icons = iconRows();
  } else if (id === 'layout') {
    const {LAYOUTS} = await import('../../../../src/platform/data/layouts.mjs');
    rows = [...LAYOUTS, ...layoutPrimitives().map(primitive => ({...primitive, id: `layout-primitive:${primitive.id}`}))];
  } else if (id === 'chart') {
    const [{chartPresetMaterials}, {renderChartPreset}, {chunks}] = await Promise.all([
      import('../../../../src/materials/chart-presets.mjs'), import('../../../../src/render/chart-presets.mjs'), import('../../../../src/styles/chunks.mjs'),
    ]);
    const chartKinds = chartPresetMaterials.filter((preset, index, all) => all.findIndex(candidate => candidate.ext.chartKind === preset.ext.chartKind) === index);
    rows = chartKinds.map(preset => ({
      id: preset.ext.chartKind, label: preset.ext.chartKind, presetId: preset.id, presetLabel: preset.label, svg: renderChartPreset(preset.id),
    }));
    chartCount = rows.length;
    chartTokens = {...colorView().scenes.light, '--kit-t-micro': '13px', '--kit-t-sub': '18px'};
    chartCss = chunks.chart;
  }
  return {
    id,
    rows: categoryRows(id, {[id]: rows}),
    roles, facets, radius, elevation, radiusTokens, elevationTokens, facetShadows, patterns, icons,
    chartCount, chartTokens, chartCss, backgroundTokens,
  };
}

/** 페이지 유형의 첫 템플릿 id. 타이포그래피 프리셋을 어울리는 화면에서 열어 보게 한다. */
function templateFor(pageType: string): string | null {
  const r = listCatalog({kind: 'templates', fields: ['id', 'pageType'], limit: 200} as never) as {ok: boolean; value: {items: {id: string; pageType: string}[]}};
  return r.ok ? r.value.items.find(t => t.pageType === pageType)?.id ?? null : null;
}

/** 개수 요약(개요 화면). 색 토큰·타이포 프리셋·기초 축·아이콘만 센다(Coolors 팔레트는 세지 않는다). */
export const overview = memo(() => ({
  colorTokens: colorView().rows.length, colorSeeds: colorView().seeds.length,
  typePresets: typeView().presets.length, controlSizes: typeView().controlSizes.length, corpus: typeView().corpus.length,
  axes: foundationAxes().length, icons: iconRows().length, layoutPrimitives: layoutPrimitives().length,
}));
