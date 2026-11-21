'use client';
import {useRef} from 'react';
import {useStudio} from '../context';
import type {Tab} from '../types';
import {useNarrow} from '../useNarrow';
import {DiagnosticList} from './Banners';
import {CheckPanel} from './CheckPanel';
import {DesignPanel} from './DesignPanel';
import {StructurePanel} from './StructurePanel';
import styles from '../studio.module.css';

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
        {autoFix ? <button type="button" className={styles.tool} onClick={() => api.edit({...(intent as Extract<typeof intent, {kind: 'setAxis'}>), repair: 'auto'})}>금지 조합을 자동 보정해 적용</button> : null}
        {relocate ? <button type="button" className={styles.tool} onClick={() => api.edit({...(intent as Extract<typeof intent, {kind: 'setLayout'}>), relocate: true})}>콘텐츠를 옮기며 적용</button> : null}
        <button type="button" className={styles.tool} onClick={api.dismissError}>닫기</button>
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
          {view.tab === 'structure' ? <StructurePanel /> : view.tab === 'design' ? <DesignPanel /> : <CheckPanel />}
        </div>
      ) : null}
    </section>
  );
}
