import 'server-only';
import {CONTRACT_VERSION, PLATFORM_CONTRACT_VERSION, checkCompatibility, getPlatformMaterial, listPlatformMaterials} from '@winterholic/design-system-static-kit/service';
import {LruCache} from '@/lib/api/cache.mjs';

type Row = {id: string; label: string};
export type PlaygroundOption = {value: string; label: string; ok: boolean; reason?: string};
export type PlaygroundContract = {
  base: string | null;
  defaults: {palette: string; subtokenSet: string; visualFamily: string; typeSystem: string; density: string; mode: string};
  axes: Record<'palette' | 'subtokenSet' | 'visualFamily' | 'typeSystem' | 'density' | 'mode', PlaygroundOption[]>;
};

const cache = new LruCache(64);
const rows = (kind: string): Row[] => {
  const result = listPlatformMaterials({kind, limit: 200, fields: ['id', 'label']}) as {ok: boolean; value?: {items: Row[]}};
  return result.ok ? result.value?.items ?? [] : [];
};

export function playgroundContract(type: string): PlaygroundContract {
  const cached = cache.get(`${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}/${type}`) as PlaygroundContract | undefined;
  if (cached) return cached;
  const baseRows = rows('base-component');
  const base = baseRows.find(item => {
    const record = getPlatformMaterial({id: item.id}) as {ok: boolean; value?: {reuses?: string[]}};
    return record.ok && record.value?.reuses?.includes(`component:${type}`);
  })?.id ?? null;
  const palettes = rows('palette'), sets = rows('subtoken-set'), types = rows('type-system'), families = rows('family');
  const defaults: PlaygroundContract['defaults'] = {
    palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', visualFamily: 'family:soft',
    typeSystem: 'type-system:mkt-launch', density: 'comfortable', mode: 'light',
  };
  const idsFor = (value: PlaygroundContract['defaults']) => [value.palette, value.subtokenSet, value.typeSystem,
    ...(base ? [base, value.visualFamily] : []), `axis-value:mode.${value.mode}`, `axis-value:density.${value.density}`];
  const verdict = (value: PlaygroundContract['defaults']) => {
    const result = checkCompatibility({ids: idsFor(value), context: 'general', mode: value.mode, density: value.density}) as {
      ok: boolean; value?: {ok: boolean; violations: {reason: string}[]}; errors?: {message: string}[];
    };
    return result.ok && result.value ? {ok: result.value.ok, reason: result.value.violations.map(x => x.reason).join(' · ')}
      : {ok: false, reason: result.errors?.map(x => x.message).join(' · ') ?? 'Core 호환성 검사를 실행하지 못했습니다.'};
  };

  if (!verdict(defaults).ok) {
    let colorPair: {palette: string; subtokenSet: string} | null = null;
    outer: for (const palette of palettes) for (const subtokenSet of sets) {
      const candidate = {...defaults, palette: palette.id, subtokenSet: subtokenSet.id};
      if (verdict(candidate).ok) { colorPair = {palette: palette.id, subtokenSet: subtokenSet.id}; break outer; }
    }
    if (colorPair) {
      defaults.palette = colorPair.palette; defaults.subtokenSet = colorPair.subtokenSet;
      const foundType = types.find(item => verdict({...defaults, typeSystem: item.id} as PlaygroundContract['defaults']).ok);
      if (foundType) defaults.typeSystem = foundType.id;
      if (base) {
        const foundFamily = families.find(item => verdict({...defaults, visualFamily: item.id} as PlaygroundContract['defaults']).ok);
        if (foundFamily) defaults.visualFamily = foundFamily.id;
      }
    }
  }

  const options = (items: Row[], axis: keyof PlaygroundContract['defaults']): PlaygroundOption[] => items.map(item => {
    const candidate = {...defaults, [axis]: item.id} as PlaygroundContract['defaults'];
    const result = axis === 'visualFamily' && !base
      ? {ok: false, reason: '이 컴포넌트는 시각 패밀리와 연결된 기반 구성원 계약이 없습니다.'}
      : verdict(candidate);
    return {value: item.id, label: item.label, ok: result.ok, ...(result.reason ? {reason: result.reason} : {})};
  });
  const discrete = (axis: 'mode' | 'density', values: string[]): PlaygroundOption[] => values.map(value => {
    const result = verdict({...defaults, [axis]: value});
    return {value, label: value, ok: result.ok, ...(result.reason ? {reason: result.reason} : {})};
  });
  const result: PlaygroundContract = {
    base, defaults,
    axes: {
      palette: options(palettes, 'palette'), subtokenSet: options(sets, 'subtokenSet'),
      visualFamily: options(families, 'visualFamily'), typeSystem: options(types, 'typeSystem'),
      density: discrete('density', ['compact', 'comfortable', 'spacious']), mode: discrete('mode', ['light', 'dark']),
    },
  };
  cache.set(`${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}/${type}`, result);
  return result;
}

export function playgroundAvailability(type: string, requested: Record<string, unknown>) {
  const contract = playgroundContract(type);
  const selected = {...contract.defaults};
  for (const axis of ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode'] as const) {
    const value = requested[axis];
    if (typeof value === 'string' && (contract.axes[axis] as PlaygroundOption[]).some(option => option.value === value)) selected[axis] = value;
  }
  const rowsByAxis = {
    palette: rows('palette'), subtokenSet: rows('subtoken-set'), visualFamily: rows('family'), typeSystem: rows('type-system'),
  };
  const check = (candidate: typeof selected) => {
    const ids = [candidate.palette, candidate.subtokenSet, candidate.typeSystem, ...(contract.base ? [contract.base, candidate.visualFamily] : []), `axis-value:mode.${candidate.mode}`, `axis-value:density.${candidate.density}`];
    const result = checkCompatibility({ids, context: 'general', mode: candidate.mode, density: candidate.density}) as {ok: boolean; value?: {ok: boolean; violations: {reason: string}[]}; errors?: {message: string}[]};
    return result.ok && result.value ? {ok: result.value.ok, reason: result.value.violations.map(item => item.reason).join(' · ')} : {ok: false, reason: result.errors?.map(item => item.message).join(' · ') ?? 'Core 호환성 검사를 실행하지 못했습니다.'};
  };
  const axes = {} as PlaygroundContract['axes'];
  for (const axis of ['palette', 'subtokenSet', 'visualFamily', 'typeSystem'] as const) {
    axes[axis] = rowsByAxis[axis].map(item => {
      const result = axis === 'visualFamily' && !contract.base ? {ok: false, reason: '이 컴포넌트는 시각 패밀리와 연결된 기반 구성원 계약이 없습니다.'} : check({...selected, [axis]: item.id});
      return {value: item.id, label: item.label, ok: result.ok, ...(result.reason ? {reason: result.reason} : {})};
    });
  }
  for (const axis of ['density', 'mode'] as const) {
    axes[axis] = (axis === 'density' ? ['compact', 'comfortable', 'spacious'] : ['light', 'dark']).map(value => {
      const result = check({...selected, [axis]: value});
      return {value, label: value, ok: result.ok, ...(result.reason ? {reason: result.reason} : {})};
    });
  }
  return {axes};
}
