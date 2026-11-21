// 브라우저 저장소(03-interfaces.md 5.3절). 새 키는 스키마 버전을 가지고, 옛 조립기 키는 처음 한 번 읽기만 한다.
import type {Blueprint, NodePath, Origin, Picks} from './types';

export const STORAGE_KEY = 'winterholic-static-kit.studio.v1';
export const SCHEMA_VERSION = 1;
export const LEGACY_KEY = 'winterholic-static-kit.blueprint.v3';
// 옛 키를 이미 들여왔는지 기억한다. 사용자가 초기화해도 옛 작업이 다시 살아나지 않게 한다. 옛 키 자체는 지우지 않는다.
export const MIGRATED_KEY = 'winterholic-static-kit.studio.legacy-imported';

export type Saved = {schema: number; savedAt: string; doc: Blueprint; origin: Origin; picked: Picks; selection: NodePath; modified: boolean};

export type Loaded =
  | {kind: 'none'}
  | {kind: 'unavailable'; message: string}
  | {kind: 'saved'; raw: string; data: unknown}
  | {kind: 'legacy'; blueprint: unknown}
  | {kind: 'corrupt'; raw: string; reason: string};

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 새 키가 있으면 그것, 없으면 옛 키(아직 들여오지 않았다면)를 읽는다. 읽기만 하고 쓰지 않는다. */
export function readStored(): Loaded {
  const s = store();
  if (!s) return {kind: 'unavailable', message: '이 브라우저는 저장소(localStorage)를 쓸 수 없습니다.'};
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        return {kind: 'saved', raw, data: JSON.parse(raw)};
      } catch (e) {
        return {kind: 'corrupt', raw, reason: 'JSON으로 읽을 수 없습니다: ' + (e as Error).message};
      }
    }
    if (s.getItem(MIGRATED_KEY) === null) {
      const legacy = s.getItem(LEGACY_KEY);
      if (legacy !== null) {
        try {
          const parsed = JSON.parse(legacy);
          // 옛 값은 {blueprint, sel}이다. sel은 문서의 출처가 아니므로 버리고 blueprint만 쓴다(WB-05).
          if (parsed && typeof parsed === 'object' && parsed.blueprint && typeof parsed.blueprint === 'object') return {kind: 'legacy', blueprint: parsed.blueprint};
        } catch {
          // 옛 값이 깨져 있으면 없는 것으로 본다. 새 작업을 막지 않는다.
        }
      }
    }
  } catch (e) {
    return {kind: 'unavailable', message: '저장소를 읽지 못했습니다: ' + (e as Error).message};
  }
  return {kind: 'none'};
}

export type WriteResult = {ok: true; savedAt: string} | {ok: false; message: string};

export function writeSaved(state: Omit<Saved, 'schema' | 'savedAt'>): WriteResult {
  const s = store();
  if (!s) return {ok: false, message: '이 브라우저는 저장소를 쓸 수 없습니다.'};
  const savedAt = new Date().toISOString();
  try {
    s.setItem(STORAGE_KEY, JSON.stringify({schema: SCHEMA_VERSION, savedAt, ...state}));
    return {ok: true, savedAt};
  } catch (e) {
    const name = (e as Error).name;
    return {ok: false, message: name === 'QuotaExceededError' ? '저장 공간이 가득 찼습니다.' : '저장하지 못했습니다: ' + (e as Error).message};
  }
}

export function markLegacyImported() {
  try {
    store()?.setItem(MIGRATED_KEY, '1');
  } catch {
    // 표시를 못 남겨도 새 키에 문서가 저장되면 다시 읽지 않는다.
  }
}

/** 초기화: 새 키만 지운다. 옛 키는 롤백을 위해 남긴다. */
export function clearSaved(): boolean {
  const s = store();
  if (!s) return false;
  try {
    s.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';

export type Parsed = {doc: unknown; origin: Origin; picked: Picks; selection: NodePath; modified: boolean; problems: string[]} | {error: string};

/** 저장된 값의 모양을 확인한다. 문서 자체의 유효성은 Core(importBlueprint)가 판정한다. 나머지 필드는 어긋나면 기본값으로 대체하고 알린다. */
export function parseSaved(data: unknown): Parsed {
  if (!isRecord(data)) return {error: '저장된 값이 객체가 아닙니다.'};
  if (data.schema !== SCHEMA_VERSION) return {error: `저장 형식 버전이 ${String(data.schema)}입니다(이 Studio는 ${SCHEMA_VERSION}만 읽습니다).`};
  if (!isRecord(data.doc)) return {error: '저장된 문서가 없습니다.'};
  const problems: string[] = [];
  let origin: Origin = null;
  if (data.origin !== null && data.origin !== undefined) {
    const o = data.origin;
    if (isRecord(o) && isStr(o.template) && isRecord(o.layout) && Object.values(o.layout).every(isStr) && (o.themeVariant === null || isStr(o.themeVariant)) && (o.palette === null || isStr(o.palette))) {
      origin = {template: o.template, layout: o.layout as Record<string, string>, themeVariant: (o.themeVariant ?? null) as string | null, palette: (o.palette ?? null) as string | null};
    } else problems.push('템플릿 출처 정보를 읽지 못해 "가져온 문서"로 엽니다.');
  }
  const picked: Picks = isRecord(data.picked) && Object.values(data.picked).every(isStr) ? (data.picked as Picks) : {};
  if (data.picked !== undefined && picked !== data.picked) problems.push('직접 고른 스타일 축 정보를 읽지 못했습니다.');
  const selection = Array.isArray(data.selection) && data.selection.every(i => Number.isInteger(i) && (i as number) >= 0) ? (data.selection as NodePath) : [];
  return {doc: data.doc, origin, picked, selection, modified: data.modified === true, problems};
}
