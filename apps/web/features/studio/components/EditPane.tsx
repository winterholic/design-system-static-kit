'use client';
import {lazy, Suspense, useEffect, useRef} from 'react';
import {useStudio} from '../context';
import type {Tab} from '../types';
import {useNarrow} from '../useNarrow';
import {DiagnosticList} from './Banners';
import {Button} from '@/ui';
import styles from '../studio.module.css';

// 대형 패널(디자인/검증/구조)은 별도 청크로 나눈다. 시작 화면은 문서가 없어 이 청크를 받지 않는다.
const loadStructure = () => import('./StructurePanel').then(m => ({default: m.StructurePanel}));
const loadDesign = () => import('./DesignPanel').then(m => ({default: m.DesignPanel}));
const loadCheck = () => import('./CheckPanel').then(m => ({default: m.CheckPanel}));
const StructurePanel = lazy(loadStructure);
const DesignPanel = lazy(loadDesign);
const CheckPanel = lazy(loadCheck);

/** 작업대가 열린 뒤 한가할 때 나머지 탭의 청크를 미리 받는다. 탭을 처음 열 때 청크 내려받기 때문에 입력이 막히지 않게 한다(측정: PERFORMANCE-A2.json). */
function prefetchPanels() {
  const run = () => { void loadDesign(); void loadCheck(); };
  const idle = (window as unknown as {requestIdleCallback?: (cb: () => void, opts?: {timeout: number}) => number}).requestIdleCallback;
  if (idle) idle(run, {timeout: 1500});
  else setTimeout(run, 200);
}

const TAB_LABEL: Record<Tab, string> = {structure: '구조·내용', design: '디자인', check: '검증'};
const ORDER: Tab[] = ['structure', 'design', 'check'];

/** 마지막으로 실패한 편집. 문서와 선택은 그대로이고, 오류 위치와 해결 방법, 가능한 다음 행동을 보여 준다. */
function OpError() {
  const api = useStudio();
  const err = api.state.session.error;
  if (!err) return null;
  const {intent, errors} = err;
  const first = errors[0];
  const autoFix = intent.kind === 'setAxis' && errors.some(e => e.code === 'AXIS_BAN' || e.code === 'THEME_FORBID');
  const relocate = intent.kind === 'setLayout' && errors.some(e => e.code === 'LAYOUT_WOULD_DROP_CONTENT');
  return (
    <section className={styles.opError} role="alert" aria-labelledby="op-error-title" data-testid="op-error">
      <h3 id="op-error-title" className={styles.bannerTitle}>변경하지 못했습니다. 문서는 그대로입니다</h3>
      <DiagnosticList items={errors} onJump={d => api.jumpTo(d)} />
      <div className="btn-row">
        {autoFix ? <Button size="sm" onClick={() => api.edit({...(intent as Extract<typeof intent, {kind: 'setAxis'}>), repair: 'auto'})}>금지 조합을 자동 보정해 적용</Button> : null}
        {relocate ? <Button size="sm" onClick={() => api.edit({...(intent as Extract<typeof intent, {kind: 'setLayout'}>), relocate: true})}>콘텐츠를 옮기며 적용</Button> : null}
        <Button size="sm" onClick={api.dismissError}>닫기</Button>
      </div>
      <span className="visually-hidden">{first?.code}</span>
    </section>
  );
}

export function EditPane() {
  const api = useStudio();
  const narrow = useNarrow();
  const {view, session, document: doc} = api.state;
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  useEffect(prefetchPanels, []);
  const hidden = narrow ? view.pane === 'preview' : view.pane === 'preview';
  const issues = session.error ? session.error.errors.length : 0;
  const warnings = session.warnings.length + (session.lastValid?.warnings.length ?? 0);

  const onKey = (e: React.KeyboardEvent) => {
    const i = ORDER.indexOf(view.tab);
    const next = e.key === 'ArrowRight' ? ORDER[(i + 1) % ORDER.length] : e.key === 'ArrowLeft' ? ORDER[(i + ORDER.length - 1) % ORDER.length] : e.key === 'Home' ? ORDER[0] : e.key === 'End' ? ORDER[ORDER.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    api.navigate({tab: next}, 'push');
    refs.current[next]?.focus();
  };

  return (
    <section className={styles.editPane} aria-label="편집" hidden={hidden}>
      <div className={styles.tabs} role="tablist" aria-label="편집 영역" onKeyDown={onKey}>
        {ORDER.map(t => (
          <button key={t} ref={el => { refs.current[t] = el; }} type="button" role="tab" id={`tab-${t}`} className={styles.tab} aria-selected={view.tab === t} aria-controls={`panel-${t}`} tabIndex={view.tab === t ? 0 : -1} onClick={() => api.navigate({tab: t}, 'push')}>
            {TAB_LABEL[t]}{t === 'check' && (issues || warnings) ? ` (${issues + warnings})` : ''}
          </button>
        ))}
      </div>
      <OpError />
      {doc.doc ? (
        <div className={styles.panel} role="tabpanel" id={`panel-${view.tab}`} aria-labelledby={`tab-${view.tab}`} tabIndex={-1}>
          <Suspense fallback={<div className={styles.loadingPanel}><p className={styles.muted}>패널을 불러오는 중입니다…</p></div>}>
            {view.tab === 'structure' ? <StructurePanel /> : view.tab === 'design' ? <DesignPanel /> : <CheckPanel />}
          </Suspense>
        </div>
      ) : null}
    </section>
  );
}
