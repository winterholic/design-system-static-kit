'use client';

import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {computeBoot} from './boot';
import {loadCatalog, type Catalog} from './catalog';
import {StudioContext, type StudioApi} from './context';
import {core as getCore, isCoreLoaded, loadCore, type Core} from './core';
import {download, exportBaseName, htmlText, jsonText} from './export';
import {initialState, needsConfirm, reducer, type Action, type Dialog, type Intent, type PendingAction} from './model';
import {parseDiagnosticPath} from './paths';
import {clearSaved, markLegacyImported, readStored, writeSaved} from './storage';
import {DEFAULT_VIEW, parseUrl, viewUrl, type UrlView} from './url';
import type {Diagnostic, NodePath} from './types';
import {Toolbar} from './components/Toolbar';
import {StartScreen} from './components/StartScreen';
import {EditPane} from './components/EditPane';
import {PreviewPane} from './components/PreviewPane';
import {Banners} from './components/Banners';
import {Dialogs} from './components/Dialogs';
import styles from './studio.module.css';

const isTextTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

export function StudioApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [coreReady, setCoreReady] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [compileCount, setCompileCount] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshUrl = useCallback((view: UrlView, mode: 'push' | 'replace') => {
    const next = viewUrl(view);
    if (next === location.pathname + location.search) return;
    if (mode === 'push') history.pushState(null, '', next);
    else history.replaceState(null, '', next);
  }, []);
  const currentView = (): UrlView => ({tab: stateRef.current.view.tab, pane: stateRef.current.view.pane, device: stateRef.current.view.device});

  // ---- 시작: URL과 저장소를 읽는다. 문서가 필요하지 않으면 Core를 불러오지 않는다.
  useEffect(() => {
    const parsed = parseUrl(location.search);
    const stored = readStored();
    const needsCore = stored.kind === 'saved' || stored.kind === 'legacy' || parsed.start !== null || parsed.problems.length > 0;
    const finish = () => {
      const boot = computeBoot(parsed, stored);
      dispatch({type: 'boot', state: boot});
      if (stored.kind === 'legacy') markLegacyImported();
      // 시작 인자는 한 번만 쓴다. 확인 대화상자가 열려 있으면 결정할 때까지 주소를 그대로 둔다.
      if (!boot.view.dialog && (parsed.start || parsed.problems.length || location.search)) history.replaceState(null, '', viewUrl({...DEFAULT_VIEW, ...boot.view} as UrlView));
    };
    if (!needsCore) {
      dispatch({type: 'boot', state: {phase: 'start', doc: null, origin: null, picked: {}, selection: [], modified: false, view: parsed.view, notices: [], recovery: stored.kind === 'corrupt' ? {raw: stored.raw, reason: stored.reason} : null, storage: stored.kind === 'unavailable' ? {status: 'unavailable', message: stored.message} : {status: 'idle'}}});
      return;
    }
    let live = true;
    loadCore().then(() => { if (live) { setCoreReady(true); finish(); } });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (coreReady) setCatalog(loadCatalog(getCore()));
  }, [coreReady]);

  // ---- 뒤로 가기: 주소의 화면 상태만 되돌린다. 문서는 건드리지 않는다.
  useEffect(() => {
    const onPop = () => {
      const {view} = parseUrl(location.search);
      dispatch({type: 'view', patch: view});
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---- 미리보기 컴파일: 편집이 이어지면 마지막 문서만 컴파일한다. 색 보기는 미리보기 사본에만 적용한다(문서 불변).
  const doc = state.document.doc, scheme = state.view.scheme;
  useEffect(() => {
    if (!coreReady || !doc || state.phase !== 'ready') return;
    const timer = setTimeout(() => {
      const source = scheme === 'document' ? doc : {...doc, mode: scheme};
      const r = getCore().service.compileBlueprint(source, {include: ['html']});
      setCompileCount(n => n + 1);
      dispatch({type: 'compiled', doc, scheme, result: r.ok ? {ok: true, html: r.value.html as string, warnings: r.warnings} : {ok: false, errors: r.errors}});
    }, 60);
    return () => clearTimeout(timer);
  }, [coreReady, doc, scheme, state.phase]);

  // ---- 저장: 문서·출처·선택이 바뀌면 잠깐 모아 쓴다. 손상된 저장값이 있으면 사용자가 정할 때까지 덮어쓰지 않는다.
  const blocked = state.session.recovery !== null || state.session.storage.status === 'unavailable';
  const {origin, picked, selection, modified} = state.session;
  const persist = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'ready' || !s.document.doc || s.session.recovery) return;
    const r = writeSaved({doc: s.document.doc, origin: s.session.origin, picked: s.session.picked, selection: s.session.selection, modified: s.session.modified});
    const status = r.ok ? 'saved' : 'error';
    if (s.session.storage.status !== status || (!r.ok && s.session.storage.message !== r.message)) dispatch({type: 'storage', storage: r.ok ? {status: 'saved', savedAt: r.savedAt} : {status: 'error', message: r.message}});
  }, []);
  useEffect(() => {
    if (blocked || state.phase !== 'ready' || !doc) return;
    const timer = setTimeout(persist, 250);
    return () => clearTimeout(timer);
  }, [doc, origin, picked, selection, modified, blocked, state.phase, persist]);
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
  const resetStorage = useCallback(() => {
    dispatch({type: 'recovered', cleared: clearSaved()});
  }, []);

  const api: StudioApi = useMemo(() => ({
    state, core: coreReady ? getCore() : null, catalog, edit,
    select: (path, focusField) => dispatch({type: 'select', path, focusField}),
    navigate, setView: patch => dispatch({type: 'view', patch}), undo, redo,
    openDialog: (dialog: Dialog) => dispatch({type: 'dialog', dialog}), closeDialog, requestAction, confirmAction, jumpTo,
    dismissError: () => dispatch({type: 'dismissError'}), dismissNotice: id => dispatch({type: 'dismissNotice', id}),
    exportJson, exportHtml, exportRecovery, resetStorage, withCore, compileCount,
  }), [state, coreReady, catalog, edit, navigate, undo, redo, closeDialog, requestAction, confirmAction, jumpTo, exportJson, exportHtml, exportRecovery, resetStorage, withCore, compileCount]);

  const {phase, view} = state;
  return (
    <StudioContext.Provider value={api}>
      <div className={styles.studio} data-phase={phase} data-pane={view.pane}>
        {phase === 'loading' ? <p className={styles.loading} role="status">Studio를 여는 중입니다…</p> : (
          <>
            <Toolbar />
            <Banners />
            {phase === 'start' ? <StartScreen /> : (
              <div className={styles.workspace} data-pane={view.pane}>
                <EditPane />
                <PreviewPane />
              </div>
            )}
            <Dialogs />
          </>
        )}
      </div>
    </StudioContext.Provider>
  );
}
