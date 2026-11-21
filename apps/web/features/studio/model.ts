// Studio 상태는 세 층으로 나눈다(작업 카드 1항).
//   Document      : Blueprint와 그 유효성. src/edit 연산으로만 바뀐다.
//   Editor Session: 선택, Undo/Redo 스택, 마지막 유효 컴파일 결과, 수정 여부, 오류·제안, 출처(origin)
//   View          : 탭, 창 배치, 미리보기 기기·배율·색 보기, 열린 대화상자 (문서·내보내기 결과에 영향이 없다)
// 리듀서는 순수하다. 연산은 (doc, args) → 새 doc 순수 함수라서 호출해도 부작용이 없다. 시간은 액션이 들고 온다.
import {core} from './core';
import {clampPath, nodeAt, pathExists} from './paths';
import {isDisposable} from './protect';
import type {Blueprint, Device, Diagnostic, Node, NodePath, OpResult, Origin, Pane, Picks, PreviewScheme, ScaleMode, StartRequest, Tab} from './types';

// ---------------------------------------------------------------- 상태 타입

export type OpFailure = {id: number; intent: Intent; errors: Diagnostic[]; warnings: Diagnostic[]};
export type Notice = {id: number; level: 'info' | 'warning' | 'error'; text: string; details?: Diagnostic[]};
export type StorageStatus = {status: 'idle' | 'saved' | 'error' | 'unavailable' | 'conflict'; message?: string; savedAt?: string};
export type Recovery = {raw: string; reason: string};

export type PendingAction =
  | {kind: 'replaceTemplate'; template: string; keepAppearance: boolean}
  | {kind: 'reset'}
  | {kind: 'import'; text: string; upgrade: boolean}
  | {kind: 'start'; request: StartRequest};

export type Dialog =
  | {kind: 'template'}
  | {kind: 'import'}
  | {kind: 'confirm'; action: PendingAction}
  | null;

export type Snapshot = {doc: Blueprint; origin: Origin; picked: Picks; selection: NodePath; modified: boolean; baseline: Blueprint | null};
export type HistoryEntry = Snapshot & {coalesceKey?: string; at: number};

export type CompiledPreview = {doc: Blueprint; scheme: PreviewScheme; html: string; warnings: Diagnostic[]};

export type StudioState = {
  phase: 'loading' | 'start' | 'ready';
  document: {doc: Blueprint | null; validity: {ok: boolean; errors: Diagnostic[]; warnings: Diagnostic[]}};
  session: {
    origin: Origin;
    picked: Picks;
    selection: NodePath;
    undo: HistoryEntry[];
    redo: HistoryEntry[];
    modified: boolean;
    baseline: Blueprint | null;
    lastValid: CompiledPreview | null;
    compileErrors: Diagnostic[];
    error: OpFailure | null;
    warnings: Diagnostic[];
    notices: Notice[];
    storage: StorageStatus;
    recovery: Recovery | null;
    seq: number;
  };
  view: {tab: Tab; pane: Pane; device: Device; scaleMode: ScaleMode; scheme: PreviewScheme; dialog: Dialog; focusRequest: {path: NodePath; field: string | null; id: number} | null};
};

export const initialState: StudioState = {
  phase: 'loading',
  document: {doc: null, validity: {ok: false, errors: [], warnings: []}},
  session: {origin: null, picked: {}, selection: [], undo: [], redo: [], modified: false, baseline: null, lastValid: null, compileErrors: [], error: null, warnings: [], notices: [], storage: {status: 'idle'}, recovery: null, seq: 0},
  view: {tab: 'structure', pane: 'split', device: 1280, scaleMode: 'fit', scheme: 'document', dialog: null, focusRequest: null},
};

// ---------------------------------------------------------------- 편집 의도 → Core 연산

export type Intent =
  | {kind: 'updateField'; path: NodePath; set?: Record<string, unknown>; unset?: string[]}
  | {kind: 'rename'; name: string}
  | {kind: 'insert'; parent: NodePath; node: Node; index?: number}
  | {kind: 'remove'; path: NodePath}
  | {kind: 'move'; path: NodePath; index: number}
  | {kind: 'setMode'; mode: string}
  | {kind: 'setAxis'; axis: string; value: string; repair?: 'auto'}
  | {kind: 'setPalette'; palette: string}
  | {kind: 'setLayout'; slot: string; option: string; relocate?: boolean}
  | {kind: 'setTheme'; theme: string}
  | {kind: 'setThemeVariant'; variant: string | null; variantSet?: Record<string, string>}
  | {kind: 'replaceTemplate'; template: string; keepAppearance: boolean}
  | {kind: 'reset'; template?: string}
  | {kind: 'import'; text: string; upgrade?: boolean}
  | {kind: 'start'; request: StartRequest};

/** 문서 전체를 새로 세우는 의도. 수정 여부와 기준 문서(baseline)를 새로 잡는다. */
const FRESH = new Set<Intent['kind']>(['replaceTemplate', 'reset', 'import', 'start']);
export const DEFAULT_TEMPLATE = 'dashboard-overview';

export type Context = {doc: Blueprint | null; origin: Origin; picked: Picks; selection: NodePath};
export type Outcome = {res: OpResult; origin: Origin; picked: Picks; selection: NodePath};

const failed = (doc: Blueprint | null, errors: Diagnostic[], warnings: Diagnostic[] = []): OpResult => ({ok: false, doc: doc as Blueprint, changes: [], errors, warnings, content: null});
const childrenOf = (doc: Blueprint | null, parent: NodePath): Node[] => (nodeAt(doc, parent)?.children as Node[] | undefined) ?? [];
const op = (doc: Blueprint | null, name: string, args: Record<string, unknown>) => core().edit.applyOp(doc, name, args);

/** 테마를 바꾼다. 콘텐츠는 setTheme이 지키고, 사용자가 직접 고른 스타일 축은 새 테마가 허용하는 것만 다시 입힌다(WB-02). */
function themeChange(ctx: Context, theme: string, variant: string | null, variantSet: Record<string, string> | undefined, picked: Picks): Outcome {
  const {doc, origin} = ctx;
  const palette = origin && origin.palette === null ? 'theme-default' : 'keep';
  const r1 = op(doc, 'setTheme', {theme, palette, ...(variant ? {variant} : {})});
  if (!r1.ok) return {res: r1, origin, picked, selection: ctx.selection};
  let working = r1.doc;
  const changes = [...r1.changes], warnings = [...r1.warnings];
  const keep: Picks = {}, want = Object.entries(picked).filter(([axis]) => !(variantSet && axis in variantSet));
  if (want.length) {
    const all = op(working, 'setAppearance', {axes: Object.fromEntries(want)});
    if (all.ok) {
      working = all.doc;
      changes.push(...all.changes);
      Object.assign(keep, Object.fromEntries(want));
    } else {
      // 한 축이 새 테마에서 금지면 그 축만 빼고 나머지는 살린다. 뺀 축은 숨기지 않고 경고로 알린다.
      for (const [axis, value] of want) {
        const one = op(working, 'setAppearance', {axes: {[axis]: value}});
        if (one.ok) {
          working = one.doc;
          changes.push(...one.changes);
          keep[axis] = value;
        } else warnings.push({code: 'PICK_DROPPED', path: '$.' + axis, message: `${axis}=${value}는 ${theme} 테마에서 쓸 수 없어 테마 기본값을 씁니다.`, hint: '다른 값을 쓰려면 디자인 탭에서 다시 고르세요.'});
      }
    }
  }
  const nextOrigin = origin ? {...origin, themeVariant: variant, palette: origin.palette} : origin;
  return {res: {ok: true, doc: working, changes, errors: [], warnings, content: r1.content}, origin: nextOrigin, picked: keep, selection: ctx.selection};
}

function startRequest(ctx: Context, request: StartRequest): Outcome {
  const template = request.template ?? DEFAULT_TEMPLATE;
  const r1 = op(ctx.doc, 'resetDocument', {template, theme: request.theme, palette: request.palette, themeVariant: request.variant, layout: request.layout, discard: true});
  const origin: Origin = {template, layout: request.layout ?? {}, themeVariant: request.variant ?? null, palette: request.palette ?? null};
  if (!r1.ok || !request.mode) return {res: r1, origin, picked: {}, selection: []};
  // 모드는 resetDocument 인자가 아니라서 이어서 적용한다. 둘 중 하나라도 거부되면 전체를 적용하지 않는다(원자성).
  const r2 = op(r1.doc, 'setAppearance', {mode: request.mode});
  if (!r2.ok) return {res: failed(ctx.doc, r2.errors, r1.warnings), origin, picked: {}, selection: []};
  return {res: {...r2, changes: [...r1.changes, ...r2.changes], warnings: [...r1.warnings, ...r2.warnings]}, origin, picked: {}, selection: []};
}

/** 한 의도를 Core 연산으로 실행한다. 순수하다: 실패하면 입력 문맥은 어디에도 반영되지 않는다. */
export function perform(ctx: Context, intent: Intent): Outcome {
  const {doc, origin, picked, selection} = ctx;
  const keep = (res: OpResult, patch: Partial<Omit<Outcome, 'res'>> = {}): Outcome => ({res, origin, picked, selection, ...patch});
  switch (intent.kind) {
    case 'updateField':
      return keep(op(doc, 'updateNode', {path: intent.path, ...(intent.set ? {set: intent.set} : {}), ...(intent.unset ? {unset: intent.unset} : {})}));
    case 'rename':
      return keep(op(doc, 'updateNode', {path: '$', set: {name: intent.name}}));
    case 'insert': {
      const index = intent.index ?? childrenOf(doc, intent.parent).length;
      return keep(op(doc, 'insertNode', {parent: intent.parent, node: intent.node, index}), {selection: [...intent.parent, index]});
    }
    case 'remove': {
      const parent = intent.path.slice(0, -1), at = intent.path.at(-1) ?? 0, left = childrenOf(doc, parent).length - 1;
      return keep(op(doc, 'removeNode', {path: intent.path}), {selection: left <= 0 ? parent : [...parent, Math.min(at, left - 1)]});
    }
    case 'move': {
      const parent = intent.path.slice(0, -1);
      return keep(op(doc, 'moveNode', {path: intent.path, to: {parent, index: intent.index}}), {selection: [...parent, intent.index]});
    }
    case 'setMode':
      return keep(op(doc, 'setAppearance', {mode: intent.mode}));
    case 'setAxis': {
      const res = op(doc, 'setAppearance', {axes: {[intent.axis]: intent.value}, ...(intent.repair ? {repair: intent.repair} : {})});
      return keep(res, {picked: res.ok ? {...picked, [intent.axis]: String(res.doc[intent.axis])} : picked});
    }
    case 'setPalette':
      return keep(op(doc, 'setPalette', {palette: intent.palette}), {origin: origin ? {...origin, palette: intent.palette} : origin});
    case 'setLayout': {
      const res = op(doc, 'setLayoutVariant', {slot: intent.slot, option: intent.option, contentPolicy: intent.relocate ? 'relocate' : 'reject'});
      return keep(res, {origin: origin ? {...origin, layout: {...origin.layout, [intent.slot]: intent.option}} : origin});
    }
    case 'setTheme':
      return doc ? themeChange(ctx, intent.theme, null, undefined, picked) : keep(failed(doc, [{code: 'ARGS_INVALID', path: '$', message: '문서가 없습니다.', hint: '먼저 템플릿으로 시작하세요.'}]));
    case 'setThemeVariant':
      return doc ? themeChange(ctx, doc.theme as string, intent.variant, intent.variantSet, picked) : keep(failed(doc, [{code: 'ARGS_INVALID', path: '$', message: '문서가 없습니다.', hint: '먼저 템플릿으로 시작하세요.'}]));
    case 'replaceTemplate': {
      const res = op(doc, 'replaceTemplate', {template: intent.template, keepAppearance: intent.keepAppearance, discard: true});
      const kept = intent.keepAppearance;
      return keep(res, {origin: {template: intent.template, layout: {}, themeVariant: kept ? origin?.themeVariant ?? null : null, palette: kept ? origin?.palette ?? null : null}, picked: kept ? picked : {}, selection: []});
    }
    case 'reset': {
      const template = intent.template ?? origin?.template ?? DEFAULT_TEMPLATE;
      return keep(op(doc, 'resetDocument', {template, discard: true}), {origin: {template, layout: {}, themeVariant: null, palette: null}, picked: {}, selection: []});
    }
    case 'import':
      return keep(op(doc, 'importBlueprint', {blueprint: intent.text, upgrade: intent.upgrade === true, discard: true}), {origin: null, picked: {}, selection: []});
    case 'start':
      return startRequest(ctx, intent.request);
  }
}

// ---------------------------------------------------------------- 액션과 리듀서

export type Action =
  | {type: 'edit'; intent: Intent; at: number; coalesce?: string}
  | {type: 'boot'; state: BootState}
  | {type: 'undo'}
  | {type: 'redo'}
  | {type: 'select'; path: NodePath; focusField?: string | null}
  | {type: 'view'; patch: Partial<Pick<StudioState['view'], 'tab' | 'pane' | 'device' | 'scaleMode' | 'scheme'>>}
  | {type: 'dialog'; dialog: Dialog}
  | {type: 'dismissError'}
  | {type: 'dismissNotice'; id: number}
  | {type: 'compiled'; doc: Blueprint; scheme: PreviewScheme; result: {ok: true; html: string; warnings: Diagnostic[]} | {ok: false; errors: Diagnostic[]}}
  | {type: 'storage'; storage: StorageStatus}
  | {type: 'recovered'; cleared: boolean}
  | {type: 'notice'; level: Notice['level']; text: string; details?: Diagnostic[]};

/** 시작 시 한 번 계산한 상태 조각. 계산은 boot.ts가 하고 리듀서는 그대로 얹는다. */
export type BootState = {
  phase: 'start' | 'ready';
  doc: Blueprint | null; origin: Origin; picked: Picks; selection: NodePath; modified: boolean;
  view: Partial<StudioState['view']>;
  notices: Omit<Notice, 'id'>[];
  recovery: Recovery | null;
  storage: StorageStatus;
};

const snapshot = (s: StudioState): Snapshot => ({doc: s.document.doc as Blueprint, origin: s.session.origin, picked: s.session.picked, selection: s.session.selection, modified: s.session.modified, baseline: s.session.baseline});
const HISTORY_LIMIT = 200;

function validity(doc: Blueprint | null): StudioState['document']['validity'] {
  if (!doc) return {ok: false, errors: [], warnings: []};
  const r = core().service.validateBlueprint(doc);
  return r.ok ? {ok: true, errors: [], warnings: r.warnings} : {ok: false, errors: r.errors, warnings: r.warnings};
}

function withDoc(s: StudioState, snap: Snapshot, extra: Partial<StudioState['session']> = {}): StudioState {
  return {
    ...s,
    document: {doc: snap.doc, validity: validity(snap.doc)},
    session: {...s.session, origin: snap.origin, picked: snap.picked, selection: clampPath(snap.doc, snap.selection), modified: snap.modified, baseline: snap.baseline, error: null, ...extra},
  };
}

function nextNoticeId(s: StudioState) {
  return s.session.seq + 1;
}

export function reducer(s: StudioState, a: Action): StudioState {
  switch (a.type) {
    case 'boot': {
      const b = a.state;
      let seq = s.session.seq;
      const notices = b.notices.map(n => ({...n, id: ++seq}));
      const baseline = b.doc && !b.modified ? b.doc : null;
      return {
        ...s,
        phase: b.phase,
        document: {doc: b.doc, validity: validity(b.doc)},
        session: {...s.session, origin: b.origin, picked: b.picked, selection: b.doc ? clampPath(b.doc, b.selection) : [], modified: b.modified, baseline, undo: [], redo: [], notices, recovery: b.recovery, storage: b.storage, seq},
        view: {...s.view, ...b.view},
      };
    }
    case 'edit': {
      if (s.phase === 'loading') return s;
      const out = perform({doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, selection: s.session.selection}, a.intent);
      const {res} = out;
      const seq = s.session.seq + 1;
      if (!res.ok) {
        // 실패하면 문서도 선택도 그대로다. 오류만 기록한다.
        return {...s, session: {...s.session, seq, error: {id: seq, intent: a.intent, errors: res.errors, warnings: res.warnings}}};
      }
      if (!res.changes.length) return {...s, session: {...s.session, seq, error: null}};
      const fresh = FRESH.has(a.intent.kind);
      const prev = s.document.doc ? snapshot(s) : null;
      let undo = s.session.undo;
      const top = undo.at(-1);
      if (prev) {
        if (a.coalesce && top && top.coalesceKey === a.coalesce && a.at - top.at < 2000) undo = [...undo.slice(0, -1), {...top, at: a.at}];
        else undo = [...undo, {...prev, coalesceKey: a.coalesce, at: a.at}].slice(-HISTORY_LIMIT);
      }
      const next: Snapshot = {doc: res.doc, origin: out.origin, picked: out.picked, selection: out.selection, modified: fresh ? false : true, baseline: fresh ? res.doc : s.session.baseline};
      return {...withDoc(s, next, {undo, redo: [], warnings: res.warnings, seq}), phase: 'ready'};
    }
    case 'undo': {
      const entry = s.session.undo.at(-1);
      if (!entry || !s.document.doc) return s;
      const {coalesceKey: _k, at: _a, ...target} = entry;
      const now = snapshot(s);
      return withDoc(s, target, {undo: s.session.undo.slice(0, -1), redo: [...s.session.redo, {...now, at: 0}], warnings: []});
    }
    case 'redo': {
      const entry = s.session.redo.at(-1);
      if (!entry || !s.document.doc) return s;
      const {coalesceKey: _k, at: _a, ...target} = entry;
      const now = snapshot(s);
      return withDoc(s, target, {redo: s.session.redo.slice(0, -1), undo: [...s.session.undo, {...now, at: 0}], warnings: []});
    }
    case 'select': {
      if (!pathExists(s.document.doc, a.path)) return s;
      const id = s.view.focusRequest ? s.view.focusRequest.id + 1 : 1;
      return {
        ...s,
        session: {...s.session, selection: a.path},
        view: a.focusField !== undefined ? {...s.view, focusRequest: {path: a.path, field: a.focusField, id}} : s.view,
      };
    }
    case 'view':
      return {...s, view: {...s.view, ...a.patch}};
    case 'dialog':
      return {...s, view: {...s.view, dialog: a.dialog}};
    case 'dismissError':
      return {...s, session: {...s.session, error: null}};
    case 'dismissNotice':
      return {...s, session: {...s.session, notices: s.session.notices.filter(n => n.id !== a.id)}};
    case 'notice': {
      const id = nextNoticeId(s);
      return {...s, session: {...s.session, seq: id, notices: [...s.session.notices, {id, level: a.level, text: a.text, details: a.details}]}};
    }
    case 'compiled': {
      // 문서가 이미 바뀌었으면(늦게 도착한 결과) 버린다. 마지막 문서의 결과만 반영한다.
      if (a.doc !== s.document.doc || a.scheme !== s.view.scheme) return s;
      if (!a.result.ok) return {...s, session: {...s.session, compileErrors: a.result.errors}};
      const prev = s.session.lastValid;
      const same = prev && prev.html === a.result.html;
      return {...s, session: {...s.session, compileErrors: [], lastValid: same ? {...prev, doc: a.doc, scheme: a.scheme, warnings: a.result.warnings} : {doc: a.doc, scheme: a.scheme, html: a.result.html, warnings: a.result.warnings}}};
    }
    case 'storage':
      return {...s, session: {...s.session, storage: a.storage}};
    case 'recovered':
      if (!a.cleared) {
        const id = nextNoticeId(s);
        return {...s, session: {...s.session, seq: id, notices: [...s.session.notices, {id, level: 'error', text: '손상된 저장값을 초기화하지 못했습니다. 원본을 보존했으니 다시 시도하거나 JSON을 내려받아 두세요.'}]}};
      }
      return {...s, session: {...s.session, recovery: null, storage: {status: 'idle'}}};
  }
}

/** 사용자 작업이 있어 교체 전에 확인이 필요한가. 판정은 protect.ts의 한 규칙이고, 시작 화면(문서 없음)은 확인이 필요 없다. */
export const needsConfirm = (s: StudioState) => s.phase === 'ready' && !isDisposable({doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, modified: s.session.modified});
