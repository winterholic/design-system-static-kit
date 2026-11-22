// 브라우저 저장소(03-interfaces.md 5.3절). 새 키는 스키마 버전을 가지고, 옛 조립기 키는 처음 한 번 읽기만 한다.
import type {Work} from './protect';
import type {Blueprint, NodePath, Origin, Picks} from './types';

export const STORAGE_KEY = 'winterholic-static-kit.studio.v1';
export const SCHEMA_VERSION = 1;
export const LEGACY_KEY = 'winterholic-static-kit.blueprint.v3';
// 옛 키를 이미 들여왔는지 기억한다. 사용자가 초기화해도 옛 작업이 다시 살아나지 않게 한다. 옛 키 자체는 지우지 않는다.
export const MIGRATED_KEY = 'winterholic-static-kit.studio.legacy-imported';

/** 저장하는 실행 취소 기록의 한 칸. baseline 은 baselines 표의 번호다(같은 기준 문서를 칸마다 되풀이해 쓰지 않는다). */
export type SavedSnapshot = {doc: Blueprint; origin: Origin; picked: Picks; selection: NodePath; modified: boolean; baseline: number | null; coalesceKey?: string; at: number};
export type SavedHistory = {undo: SavedSnapshot[]; redo: SavedSnapshot[]; baselines: Blueprint[]; baseline: number | null};
/** 메모리의 기록 칸. model.ts 의 HistoryEntry 가 구조적으로 맞는다(순환 import 를 피해 모양만 적는다). */
export type LiveSnapshot = {doc: Blueprint; origin: Origin; picked: Picks; selection: NodePath; modified: boolean; baseline: Blueprint | null; coalesceKey?: string; at: number};
export type LiveHistory = {undo: LiveSnapshot[]; redo: LiveSnapshot[]; baseline: Blueprint | null};

export type Saved = {schema: number; savedAt: string; doc: Blueprint; origin: Origin; picked: Picks; selection: NodePath; modified: boolean; history?: SavedHistory};

/** 새로고침 뒤에도 되돌릴 수 있게 저장하는 최근 단계 수와 크기(문자 수) 상한. 저장소는 도메인당 약 5MB를 다른 작업과 나눠 쓴다. */
export const HISTORY_MAX_ENTRIES = 50;
export const HISTORY_BUDGET = 600_000;
const REDO_MAX_ENTRIES = 20;

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

const sizeCache = new WeakMap<object, number>();
const sizeOf = (x: object) => { let n = sizeCache.get(x); if (n === undefined) { n = JSON.stringify(x).length; sizeCache.set(x, n); } return n; };

/**
 * 메모리의 실행 취소 기록을 저장 모양으로 싼다. 최근 단계부터 채우고 개수·크기 상한을 넘는 오래된 단계는 버린다.
 * 같은 기준 문서(baseline)는 표에 한 번만 넣는다.
 */
export function packHistory(h: LiveHistory): SavedHistory {
  const baselines: Blueprint[] = [];
  const index = new Map<Blueprint, number>();
  const ref = (b: Blueprint | null) => {
    if (!b) return null;
    let i = index.get(b);
    if (i === undefined) { i = baselines.length; baselines.push(b); index.set(b, i); }
    return i;
  };
  let budget = HISTORY_BUDGET;
  const take = (list: LiveSnapshot[], max: number) => {
    const kept: LiveSnapshot[] = [];
    for (let i = list.length - 1; i >= 0 && kept.length < max; i--) {
      const cost = sizeOf(list[i].doc) + 200;
      if (cost > budget) break;
      budget -= cost;
      kept.push(list[i]);
    }
    return kept.reverse();
  };
  const pack = (e: LiveSnapshot): SavedSnapshot => ({doc: e.doc, origin: e.origin, picked: e.picked, selection: e.selection, modified: e.modified, baseline: ref(e.baseline), ...(e.coalesceKey ? {coalesceKey: e.coalesceKey} : {}), at: e.at});
  const undo = take(h.undo, HISTORY_MAX_ENTRIES).map(pack);
  const redo = take(h.redo, REDO_MAX_ENTRIES).map(pack);
  return {undo, redo, baselines, baseline: ref(h.baseline)};
}

export function writeSaved(state: Omit<Saved, 'schema' | 'savedAt' | 'history'>, history?: LiveHistory): WriteResult {
  const s = store();
  if (!s) return {ok: false, message: '이 브라우저는 저장소를 쓸 수 없습니다.'};
  const savedAt = new Date().toISOString();
  const attempt = (withHistory: boolean) => s.setItem(STORAGE_KEY, JSON.stringify({schema: SCHEMA_VERSION, savedAt, ...state, ...(withHistory && history ? {history: packHistory(history)} : {})}));
  try {
    try {
      attempt(true);
    } catch (e) {
      // 기록이 용량을 넘겨 쓰기가 막히면 문서만이라도 저장한다. 되돌리기 기록보다 작업 내용이 먼저다.
      if ((e as Error).name !== 'QuotaExceededError' || !history) throw e;
      attempt(false);
    }
    return {ok: true, savedAt};
  } catch (e) {
    const name = (e as Error).name;
    return {ok: false, message: name === 'QuotaExceededError' ? '저장 공간이 가득 찼습니다.' : '저장하지 못했습니다: ' + (e as Error).message};
  }
}

export type Stored = {savedAt: string | null; work: Work | null};

/**
 * 지금 저장소에 든 기록의 요약. 기록이 없으면 null이다. 읽을 수 없거나 모양이 어긋난 기록은 work가 null이라 보호 대상으로 다룬다.
 * 자동 저장이 다른 탭이 쓴 작업을 모르고 덮어쓰지 않게, 쓰기 전에 이것으로 확인한다(protect.ts의 mayOverwriteStored).
 */
export function peekSaved(): Stored | null {
  const s = store();
  if (!s) return null;
  let raw: string | null;
  try { raw = s.getItem(STORAGE_KEY); } catch { return null; }
  if (raw === null) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return {savedAt: null, work: null}; }
  const savedAt = isRecord(data) && isStr(data.savedAt) ? data.savedAt : null;
  const parsed = parseSaved(data, {history: false});
  if ('error' in parsed) return {savedAt, work: null};
  return {savedAt, work: {doc: parsed.doc as Blueprint, origin: parsed.origin, picked: parsed.picked, modified: parsed.modified}};
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

export type Parsed = {doc: unknown; origin: Origin; picked: Picks; selection: NodePath; modified: boolean; history: LiveHistory | null; problems: string[]} | {error: string};

/** 저장된 값의 모양을 확인한다. 문서 자체의 유효성은 Core(importBlueprint)가 판정한다. 나머지 필드는 어긋나면 기본값으로 대체하고 알린다. */
export function parseSaved(data: unknown, opts: {history?: boolean} = {}): Parsed {
  if (!isRecord(data)) return {error: '저장된 값이 객체가 아닙니다.'};
  if (data.schema !== SCHEMA_VERSION) return {error: `저장 형식 버전이 ${String(data.schema)}입니다(이 Studio는 ${SCHEMA_VERSION}만 읽습니다).`};
  if (!isRecord(data.doc)) return {error: '저장된 문서가 없습니다.'};
  const problems: string[] = [];
  let origin: Origin = null;
  if (data.origin !== null && data.origin !== undefined) {
    origin = parseOrigin(data.origin);
    if (!origin) problems.push('템플릿 출처 정보를 읽지 못해 "가져온 문서"로 엽니다.');
  }
  const picked: Picks = isRecord(data.picked) && Object.values(data.picked).every(isStr) ? (data.picked as Picks) : {};
  if (data.picked !== undefined && picked !== data.picked) problems.push('직접 고른 스타일 축 정보를 읽지 못했습니다.');
  const selection = Array.isArray(data.selection) && data.selection.every(i => Number.isInteger(i) && (i as number) >= 0) ? (data.selection as NodePath) : [];
  let history: LiveHistory | null = null;
  if (opts.history !== false && data.history !== undefined) {
    history = parseHistory(data.history);
    if (!history) problems.push('저장된 실행 취소 기록을 읽지 못해 기록 없이 엽니다.');
  }
  return {doc: data.doc, origin, picked, selection, modified: data.modified === true, history, problems};
}

function parseOrigin(o: unknown): Origin {
  if (isRecord(o) && isStr(o.template) && isRecord(o.layout) && Object.values(o.layout).every(isStr) && (o.themeVariant === null || isStr(o.themeVariant)) && (o.palette === null || isStr(o.palette))) {
    return {template: o.template, layout: o.layout as Record<string, string>, themeVariant: (o.themeVariant ?? null) as string | null, palette: (o.palette ?? null) as string | null};
  }
  return null;
}

/** 저장된 기록 한 칸이 믿을 수 있는 모양인가. 문서 자체의 유효성은 되돌릴 때 Studio가 다시 검사한다(validity). */
function parseSnapshot(x: unknown, baselines: Blueprint[]): LiveSnapshot | null {
  if (!isRecord(x) || !isRecord(x.doc) || !isRecord(x.picked) || !Object.values(x.picked).every(isStr)) return null;
  if (!Array.isArray(x.selection) || !x.selection.every(i => Number.isInteger(i) && (i as number) >= 0)) return null;
  if (x.origin !== null && parseOrigin(x.origin) === null) return null;
  const b = x.baseline;
  if (b !== null && !(Number.isInteger(b) && (b as number) >= 0 && (b as number) < baselines.length)) return null;
  return {doc: x.doc, origin: x.origin === null ? null : parseOrigin(x.origin), picked: x.picked as Picks, selection: x.selection as NodePath, modified: x.modified === true, baseline: b === null ? null : baselines[b as number], ...(isStr(x.coalesceKey) ? {coalesceKey: x.coalesceKey} : {}), at: typeof x.at === 'number' ? x.at : 0};
}

/** 저장된 기록을 읽는다. 읽을 수 없는 칸이 있으면 그 칸과 그보다 오래된 칸은 버린다(중간이 빠진 기록으로 되돌리지 않는다). */
function parseHistory(raw: unknown): LiveHistory | null {
  if (!isRecord(raw) || !Array.isArray(raw.undo) || !Array.isArray(raw.redo) || !Array.isArray(raw.baselines) || !raw.baselines.every(isRecord)) return null;
  const baselines = raw.baselines as Blueprint[];
  const suffix = (list: unknown[]) => {
    const out: LiveSnapshot[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const e = parseSnapshot(list[i], baselines);
      if (!e) break;
      out.push(e);
    }
    return out.reverse();
  };
  const b = raw.baseline;
  if (b !== null && !(Number.isInteger(b) && (b as number) >= 0 && (b as number) < baselines.length)) return null;
  return {undo: suffix(raw.undo), redo: suffix(raw.redo), baseline: b === null ? null : baselines[b as number]};
}
