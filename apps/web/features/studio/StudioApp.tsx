'use client';

import {lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {computeBoot} from './boot';
import {analyzeImpact, needsImpact} from './impact';
import {loadCatalog, type Catalog} from './catalog';
import {StudioContext, type StudioApi} from './context';
import {core as getCore, isCoreLoaded, loadCore, type Core} from './core';
import {download, exportBaseName, htmlText, jsonText} from './export';
import {initialState, needsConfirm, reducer, type Action, type Dialog, type Intent, type PendingAction} from './model';
import {parseDiagnosticPath} from './paths';
import {mayOverwriteStored} from './protect';
import {decodeShare, encodeShare, shareHash, shareToken, type ShareDecoded} from './share';
import {clearSaved, markLegacyImported, peekSaved, readStored, writeSaved} from './storage';
import {DEFAULT_VIEW, parseUrl, viewUrl, type UrlView} from './url';
import type {Diagnostic, NodePath} from './types';
import {Toolbar} from './components/Toolbar';
import {StartScreen} from './components/StartScreen';
import {Banners} from './components/Banners';
import {StudioCompileManager} from './compiler';
import styles from './studio.module.css';

// 편집하지 않는 대형 패널 및 다이얼로그 지연 로딩 (초기 JS 전송량 절감)
const EditPane = lazy(() => import('./components/EditPane').then(m => ({default: m.EditPane})));
const PreviewPane = lazy(() => import('./components/PreviewPane').then(m => ({default: m.PreviewPane})));
const Dialogs = lazy(() => import('./components/Dialogs').then(m => ({default: m.Dialogs})));

const OWN_TOKENS_KEY = 'winterholic-static-kit.studio.own-share-tokens';
/** 토큰의 짧은 지문(길이와 32비트 해시). 같은 토큰인지 가르는 데만 쓴다. */
const tokenId = (token: string) => {
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = ((h * 33) ^ token.charCodeAt(i)) >>> 0;
  return `${token.length}.${h.toString(36)}`;
};

const isTextTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** assembleEnabled: 조립 서비스가 공개되어 /studio/assemble 이 동작할 때만 시작 화면에 조립 진입을 보인다. */
export function StudioApp({assembleEnabled = false}: {assembleEnabled?: boolean}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [coreReady, setCoreReady] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [compileCount, setCompileCount] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  // 이 세션이 마지막으로 읽었거나 쓴 저장 기록의 시각. 이것과 다른 기록이 저장소에 있으면 다른 탭이 쓴 것이다.
  const knownSavedAt = useRef<string | null>(null);
  // 마지막으로 저장한 상태. 바뀐 것이 없으면 다시 쓰지 않는다(화면을 떠날 때마다 오래된 상태로 덮어쓰는 일을 막는다).
  const lastWritten = useRef<{doc: unknown; origin: unknown; picked: unknown; selection: unknown; modified: boolean; undo: unknown; redo: unknown; baseline: unknown} | null>(null);
  // 이 세션이 주소에 쓴(또는 처음 받은) 해시 토큰들. 뒤로 가기·앞으로 가기로 생기는 해시 변경과 새 링크를 구별한다.
  // 주소 항목을 오가는 것도 fragment 이동이라 popstate 와 hashchange 가 같이 오므로 이벤트 종류로는 가를 수 없다.
  // 토큰 전체를 들고 있지 않고 지문만 둔다. 새로고침 뒤에도 옛 주소 항목으로 돌아갈 수 있어 sessionStorage 에 같이 남긴다.
  const ownTokens = useRef<string[] | null>(null);
  const loadOwn = () => {
    if (ownTokens.current) return ownTokens.current;
    try { ownTokens.current = JSON.parse(sessionStorage.getItem(OWN_TOKENS_KEY) ?? '[]'); } catch { ownTokens.current = []; }
    if (!Array.isArray(ownTokens.current)) ownTokens.current = [];
    return ownTokens.current;
  };
  const rememberToken = useCallback((token: string | null) => {
    if (!token) return;
    const list = loadOwn(), id = tokenId(token);
    if (list.includes(id)) return;
    ownTokens.current = [...list.slice(-79), id];
    try { sessionStorage.setItem(OWN_TOKENS_KEY, JSON.stringify(ownTokens.current)); } catch { /* 저장소를 못 써도 이번 탭의 메모리 목록은 쓴다 */ }
  }, []);
  // 뒤로 가기로 옛 주소 항목에 돌아오면 그 항목의 해시는 옛 문서의 것이다. 이 값이 바뀌면 현재 문서로 해시를 다시 쓴다.
  const [urlTick, setUrlTick] = useState(0);

  // 문서가 담긴 해시(#d=)는 화면 상태를 바꿀 때도 지우지 않는다. 주소가 곧 작업이다.
  const refreshUrl = useCallback((view: UrlView, mode: 'push' | 'replace') => {
    const next = viewUrl(view) + location.hash;
    if (next === location.pathname + location.search + location.hash) return;
    if (mode === 'push') history.pushState(null, '', next);
    else history.replaceState(null, '', next);
  }, []);
  const currentView = (): UrlView => ({tab: stateRef.current.view.tab, pane: stateRef.current.view.pane, device: stateRef.current.view.device});

  // ---- 시작: URL과 저장소를 읽는다. 문서가 필요하지 않으면 Core를 불러오지 않는다.
  useEffect(() => {
    const parsed = parseUrl(location.search);
    const stored = readStored();
    const token = shareToken(location.hash);
    // 새로고침·뒤로 가기로 다시 연 것이면 저장된 작업이 이 세션의 원본이다. 링크를 새로 연 것(navigate)과 구분한다.
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const sameSession = nav?.type === 'reload' || nav?.type === 'back_forward';
    const needsCore = stored.kind === 'saved' || stored.kind === 'legacy' || parsed.start !== null || parsed.problems.length > 0 || token !== null;
    const finish = (shared: ShareDecoded | null) => {
      const boot = computeBoot(parsed, stored, {shared, sameSession});
      if (stored.kind === 'saved') knownSavedAt.current = (stored.data as {savedAt?: string} | null)?.savedAt ?? null;
      dispatch({type: 'boot', state: boot});
      if (stored.kind === 'legacy') markLegacyImported();
      // 시작 인자는 한 번만 쓴다. 확인 대화상자가 열려 있으면 결정할 때까지 주소를 그대로 둔다.
      // 링크의 해시는 읽기에 성공했을 때만 남긴다. 확인 대화상자가 열려 있으면 결정 전까지 그대로 둔다. 문서가 정해지면 아래의 주소 동기화가 해시를 다시 쓴다.
      const keepHash = shared && shared.ok ? location.hash : '';
      // 링크를 열지 말지 묻는 중이면 그 링크는 내 작업의 주소가 아니다. 결정해서 문서가 정해진 뒤의 해시부터 기억한다.
      if (shared && shared.ok && !(boot.view.dialog?.kind === 'confirm' && boot.view.dialog.action.kind === 'shared')) rememberToken(token);
      if (!boot.view.dialog && (parsed.start || parsed.problems.length || location.search || (location.hash && !keepHash))) history.replaceState(null, '', viewUrl({...DEFAULT_VIEW, ...boot.view} as UrlView) + keepHash);
    };
    if (!needsCore) {
      dispatch({type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: parsed.view, notices: [], recovery: stored.kind === 'corrupt' ? {raw: stored.raw, reason: stored.reason} : null, storage: stored.kind === 'unavailable' ? {status: 'unavailable', message: stored.message} : {status: 'idle'}}});
      return;
    }
    let live = true;
    Promise.all([loadCore(), token ? decodeShare(token) : Promise.resolve(null)]).then(([, shared]) => { if (live) { setCoreReady(true); finish(shared); } });
    return () => { live = false; };
  }, [rememberToken]);

  useEffect(() => {
    if (coreReady) setCatalog(loadCatalog(getCore()));
  }, [coreReady]);

  // ---- 뒤로 가기: 주소의 화면 상태만 되돌린다. 문서는 건드리지 않는다.
  // 옛 주소 항목의 해시는 옛 문서의 것이다. 되돌아간 뒤에는 현재 문서로 해시를 다시 쓴다.
  useEffect(() => {
    const onPop = () => {
      const {view} = parseUrl(location.search);
      dispatch({type: 'view', patch: view});
      setUrlTick(n => n + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---- 미리보기 컴파일: 편집이 이어지면 마지막 문서만 디바운스해 컴파일한다.
  // 같은 정규화 입력은 캐시를 재사용해 중복 컴파일을 방지하고, 오래된 지연 응답은 무시한다.
  const compileManagerRef = useRef<StudioCompileManager | null>(null);
  if (!compileManagerRef.current) {
    compileManagerRef.current = new StudioCompileManager(null, {debounceMs: 75});
  }

  useEffect(() => {
    if (coreReady) compileManagerRef.current?.setCore(getCore());
  }, [coreReady]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as {__studio_compile_count: number}).__studio_compile_count = compileCount;
    }
  }, [compileCount]);

  const doc = state.document.doc, scheme = state.view.scheme;
  useEffect(() => {
    if (!coreReady || !doc || state.phase !== 'ready') return;
    compileManagerRef.current?.schedule(doc, scheme, (result, meta) => {
      if (!meta.fromCache) setCompileCount(n => n + 1);
      dispatch({type: 'compiled', doc, scheme, result});
    }, {device: state.view.device});
    return () => {
      compileManagerRef.current?.cancel();
    };
  }, [coreReady, doc, scheme, state.phase, state.view.device]);

  // ---- 저장: 문서·출처·선택이 바뀌면 잠깐 모아 쓴다. 손상된 저장값이 있으면 사용자가 정할 때까지 덮어쓰지 않는다.
  // 다른 탭이 저장한 작업이 저장소에 있으면(버려도 되는 문서가 아니면) 덮어쓰지 않고 멈춘 뒤 사용자가 고르게 한다.
  const blocked = state.session.recovery !== null || state.session.storage.status === 'unavailable' || state.session.storage.status === 'conflict';
  const {origin, picked, selection, modified, undo: undoStack, redo: redoStack, baseline} = state.session;
  const persist = useCallback((force = false) => {
    const s = stateRef.current;
    if (s.phase !== 'ready' || !s.document.doc || s.session.recovery) return;
    if (!force && s.session.storage.status === 'conflict') return;
    const now = {doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, selection: s.session.selection, modified: s.session.modified, undo: s.session.undo, redo: s.session.redo, baseline: s.session.baseline};
    const last = lastWritten.current;
    if (!force && last && last.doc === now.doc && last.origin === now.origin && last.picked === now.picked && last.selection === now.selection && last.modified === now.modified && last.undo === now.undo && last.redo === now.redo && last.baseline === now.baseline) return;
    if (!force && !mayOverwriteStored(knownSavedAt.current, peekSaved())) {
      dispatch({type: 'storage', storage: {status: 'conflict', message: '다른 탭에서 이 문서를 저장했습니다. 이 탭의 내용으로 덮어쓰면 그 탭의 작업이 사라집니다.'}});
      return;
    }
    // 실행 취소 기록도 함께 저장한다. 새로고침 뒤에도 되돌릴 수 있다(web-audit B7).
    const r = writeSaved({doc: now.doc, origin: now.origin, picked: now.picked, selection: now.selection, modified: now.modified}, {undo: now.undo, redo: now.redo, baseline: now.baseline});
    if (r.ok) { knownSavedAt.current = r.savedAt; lastWritten.current = now; }
    const status = r.ok ? 'saved' : 'error';
    if (s.session.storage.status !== status || (!r.ok && s.session.storage.message !== r.message)) dispatch({type: 'storage', storage: r.ok ? {status: 'saved', savedAt: r.savedAt} : {status: 'error', message: r.message}});
  }, []);
  useEffect(() => {
    if (blocked || state.phase !== 'ready' || !doc) return;
    const timer = setTimeout(() => persist(), 250);
    return () => clearTimeout(timer);
  }, [doc, origin, picked, selection, modified, undoStack, redoStack, baseline, blocked, state.phase, persist]);

  // ---- 주소 동기화: 문서가 바뀌면 주소 해시(#d=)를 현재 문서로 다시 쓴다. replace 라서 history 항목이 늘지 않고,
  // 주소를 복사하면 다른 브라우저에서도 같은 작업이 열린다. 링크를 열지 말지 묻는 동안에는 링크의 해시를 그대로 둔다.
  const dialog = state.view.dialog;
  const pendingShared = dialog?.kind === 'confirm' && dialog.action.kind === 'shared';
  useEffect(() => {
    if (state.phase !== 'ready' || !doc || pendingShared) return;
    let live = true;
    const timer = setTimeout(async () => {
      const r = await encodeShare({v: 1, doc, origin, picked, modified});
      if (!live) return;
      const next = location.pathname + location.search + (r.ok ? shareHash(r.token) : '');
      if (r.ok) rememberToken(r.token);
      if (next !== location.pathname + location.search + location.hash) history.replaceState(null, '', next);
      dispatch({type: 'shareUrl', ok: r.ok, reason: r.ok ? undefined : r.reason});
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [doc, origin, picked, modified, state.phase, pendingShared, dialog, urlTick, rememberToken]);
  useEffect(() => {
    const flush = () => persist();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
  }, [persist]);

  const undo = useCallback(() => dispatch({type: 'undo'}), []);
  const redo = useCallback(() => dispatch({type: 'redo'}), []);

  // ---- 단축키: 입력 칸 안에서는 브라우저의 글자 단위 실행 취소를 그대로 둔다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || isTextTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const edit = useCallback((intent: Intent, coalesce?: string) => dispatch({type: 'edit', intent, at: Date.now(), coalesce}), []);

  // 구 문서를 2.6.0 재료로 올리는 변경은 적용 전에 영향 요약을 보여 준다(web-audit R3). 나머지 변경은 그대로 적용한다.
  const editWithImpact = useCallback((intent: Intent) => {
    const s = stateRef.current;
    if (isCoreLoaded() && needsImpact(intent, s.document.doc)) {
      const report = analyzeImpact(getCore(), {doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, selection: s.session.selection, baseline: s.session.baseline}, intent);
      if (report) { dispatch({type: 'dialog', dialog: {kind: 'impact', intent, report}}); return; }
    }
    edit(intent);
  }, [edit]);
  const confirmImpact = useCallback((intent: Intent) => {
    edit(intent);
    dispatch({type: 'dialog', dialog: null});
  }, [edit]);

  const copyLink = useCallback(async () => {
    const s = stateRef.current;
    // 복사 순간의 작업으로 주소를 새로 만든다(자동 동기화가 한 박자 늦어도 링크는 정확하다).
    let hasHash = location.hash.length > 0;
    if (s.document.doc) {
      const r = await encodeShare({v: 1, doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, modified: s.session.modified});
      const next = location.pathname + location.search + (r.ok ? shareHash(r.token) : '');
      if (r.ok) rememberToken(r.token);
      if (next !== location.pathname + location.search + location.hash) history.replaceState(null, '', next);
      hasHash = r.ok;
    }
    const done = (ok: boolean) => dispatch({type: 'notice', level: ok ? 'info' : 'warning', text: ok ? (hasHash ? '링크를 복사했습니다. 이 주소를 열면 같은 작업이 열립니다.' : '링크를 복사했습니다. 문서가 커서 주소에 담기지 않아 화면 설정만 공유됩니다. 작업은 JSON 내보내기로 전달하세요.') : '링크를 복사하지 못했습니다. 주소창의 주소를 직접 복사하세요.'});
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(location.href).then(() => done(true), () => done(false));
    else done(false);
  }, [rememberToken]);

  const closeDialog = useCallback(() => {
    const d = stateRef.current.view.dialog;
    dispatch({type: 'dialog', dialog: null});
    // 주소의 시작 인자는 결정이 끝난 뒤에 지운다.
    if (d?.kind === 'confirm' && d.action.kind === 'start') history.replaceState(null, '', viewUrl(currentView()));
  }, []);

  const confirmAction = useCallback((action: PendingAction) => {
    const intent: Intent = action.kind === 'replaceTemplate' ? {kind: 'replaceTemplate', template: action.template, keepAppearance: action.keepAppearance}
      : action.kind === 'reset' ? {kind: 'reset'}
      : action.kind === 'import' ? {kind: 'import', text: action.text, upgrade: action.upgrade}
      : action.kind === 'shared' ? {kind: 'openShared', payload: action.payload}
      : {kind: 'start', request: action.request};
    // 문서가 없는 시작 화면에서는 교체·초기화가 곧 "시작"이다.
    const s = stateRef.current;
    const effective: Intent = !s.document.doc && (intent.kind === 'replaceTemplate') ? {kind: 'start', request: {template: intent.template}} : intent;
    edit(effective);
    closeDialog();
  }, [edit, closeDialog]);

  const requestAction = useCallback((action: PendingAction) => {
    if (needsConfirm(stateRef.current)) dispatch({type: 'dialog', dialog: {kind: 'confirm', action}});
    else confirmAction(action);
  }, [confirmAction]);

  // ---- 열려 있는 Studio 탭의 주소 해시를 다른 링크로 바꾸면(링크를 붙여 넣어 Enter) 새로고침 없이 hashchange 만 일어난다.
  // 이때도 링크로 연 것과 같다: 작업 중인 문서가 있으면 묻고, 없으면 바로 연다. 뒤로 가기가 만든 변경과 우리가 쓴 해시는 걸러 낸다.
  useEffect(() => {
    const onHash = async () => {
      const token = shareToken(location.hash);
      // 이 세션이 쓴 해시로 돌아온 것(뒤로·앞으로 가기)은 새 링크가 아니다.
      if (!token || loadOwn().includes(tokenId(token))) return;
      const decoded = await decodeShare(token);
      if (!decoded.ok) { dispatch({type: 'notice', level: 'error', text: `공유 링크를 열지 못했습니다: ${decoded.reason}`}); return; }
      const s = stateRef.current;
      const mine = s.document.doc;
      await loadCore().then(() => setCoreReady(true));
      const probe = getCore().edit.applyOp(null, 'importBlueprint', {blueprint: decoded.payload.doc});
      if (!probe.ok) { dispatch({type: 'notice', level: 'error', text: '공유 링크의 문서가 검증을 통과하지 못해 열지 않았습니다.', details: probe.errors}); return; }
      if (mine && JSON.stringify(mine) === JSON.stringify(probe.doc)) return;
      requestAction({kind: 'shared', payload: {...decoded.payload, doc: probe.doc}});
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [requestAction]);

  const navigate = useCallback((patch: Partial<UrlView>, mode: 'push' | 'replace') => {
    dispatch({type: 'view', patch});
    refreshUrl({...currentView(), ...patch}, mode);
  }, [refreshUrl]);

  const jumpTo = useCallback((d: Diagnostic) => {
    const target = parseDiagnosticPath(d.path);
    if (!target || !stateRef.current.document.doc) return false;
    navigate({tab: 'structure'}, 'push');
    dispatch({type: 'select', path: target.path as NodePath, focusField: target.field});
    return true;
  }, [navigate]);

  const withCore = useCallback((then: (c: Core) => void) => {
    loadCore().then(c => { setCoreReady(true); then(c); });
  }, []);

  const exportJson = useCallback(() => {
    const s = stateRef.current;
    if (s.document.doc) download(`${exportBaseName(s.session.origin)}-blueprint.json`, jsonText(s.document.doc), 'application/json');
  }, []);
  const exportHtml = useCallback(() => {
    const s = stateRef.current;
    if (!s.document.doc || !isCoreLoaded()) return;
    const r = htmlText(getCore(), s.document.doc);
    if (r.ok) download(`${exportBaseName(s.session.origin)}.html`, r.html, 'text/html');
    else dispatch({type: 'notice', level: 'error', text: 'HTML로 내보낼 수 없습니다. 문서는 그대로입니다.', details: r.errors});
  }, []);
  const exportRecovery = useCallback(() => {
    const raw = stateRef.current.session.recovery?.raw;
    if (raw !== undefined) download('studio-recovered-raw.json', raw, 'application/json');
  }, []);
  const overwriteStorage = useCallback(() => persist(true), [persist]);
  const reloadSaved = useCallback(() => location.reload(), []);
  const resetStorage = useCallback(() => {
    dispatch({type: 'recovered', cleared: clearSaved()});
  }, []);

  const api: StudioApi = useMemo(() => ({
    state, core: coreReady ? getCore() : null, catalog, edit,
    select: (path, focusField) => dispatch({type: 'select', path, focusField}),
    navigate, setView: patch => dispatch({type: 'view', patch}), undo, redo,
    openDialog: (dialog: Dialog) => dispatch({type: 'dialog', dialog}), closeDialog, requestAction, confirmAction, jumpTo,
    dismissError: () => dispatch({type: 'dismissError'}), dismissNotice: id => dispatch({type: 'dismissNotice', id}),
    editWithImpact, confirmImpact, copyLink,
    exportJson, exportHtml, exportRecovery, resetStorage, overwriteStorage, reloadSaved, withCore, compileCount,
  }), [state, coreReady, catalog, edit, navigate, undo, redo, closeDialog, requestAction, confirmAction, editWithImpact, confirmImpact, copyLink, jumpTo, exportJson, exportHtml, exportRecovery, resetStorage, overwriteStorage, reloadSaved, withCore, compileCount]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as {__studio_api?: StudioApi}).__studio_api = api;
    }
  }, [api]);

  const {phase, view} = state;
  return (
    <StudioContext.Provider value={api}>
      <div className={styles.studio} data-phase={phase} data-pane={view.pane} data-compile-count={compileCount} data-testid="studio-root">
        {phase === 'loading' ? <p className={styles.loading} role="status">Studio를 여는 중입니다…</p> : (
          <>
            <Toolbar />
            <Banners />
            {phase === 'start' ? <StartScreen assembleEnabled={assembleEnabled} /> : (
              <Suspense fallback={<div className={styles.loadingPanel}><p className={styles.muted}>작업대를 불러오는 중입니다…</p></div>}>
                <div className={styles.workspace} data-pane={view.pane}>
                  <EditPane />
                  <PreviewPane />
                </div>
              </Suspense>
            )}
            <Suspense fallback={null}>
              <Dialogs />
            </Suspense>
          </>
        )}
      </div>
    </StudioContext.Provider>
  );
}
