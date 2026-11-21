'use client';
import {useState} from 'react';
import {useStudio} from '../context';
import type {Pane} from '../types';
import {useNarrow} from '../useNarrow';
import styles from '../studio.module.css';

const PANE_LABEL: Record<Pane, string> = {split: '나란히', edit: '편집', preview: '미리보기'};

export function Toolbar() {
  const api = useStudio();
  const narrow = useNarrow();
  const [more, setMore] = useState(false);
  const {state} = api;
  const {session, view, document: document_} = state;
  const hasDoc = !!document_.doc;
  const panes: Pane[] = narrow ? ['edit', 'preview'] : ['split', 'edit', 'preview'];
  const effective: Pane = narrow && view.pane === 'split' ? 'edit' : view.pane;
  const close = (fn: () => void) => () => { setMore(false); fn(); };

  const save = session.storage.status === 'saved' ? '브라우저에 저장됨' : session.storage.status === 'error' ? '저장 실패' : session.storage.status === 'unavailable' ? '저장되지 않음' : session.storage.status === 'conflict' ? '저장 중지됨(다른 탭)' : session.recovery ? '저장 중지됨' : '';
  const secondary = (
    <>
      <button type="button" className={styles.tool} onClick={close(() => api.withCore(() => api.openDialog({kind: 'template'})))}>템플릿 바꾸기</button>
      <button type="button" className={styles.tool} onClick={close(() => api.withCore(() => api.openDialog({kind: 'import'})))}>JSON 가져오기</button>
      <button type="button" className={styles.tool} disabled={!hasDoc} onClick={close(() => api.requestAction({kind: 'reset'}))}>초기화</button>
      <button type="button" className={styles.tool} disabled={!hasDoc} onClick={close(api.exportJson)}>JSON 내보내기</button>
      <button type="button" className={styles.tool} disabled={!hasDoc || !api.core} onClick={close(api.exportHtml)}>HTML 내보내기</button>
    </>
  );

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="문서 도구">
      <div className={styles.docInfo}>
        <h2 className={styles.docName}>{document_.doc ? String(document_.doc.name) : 'Studio'}</h2>
        {hasDoc ? <p className={styles.docStatus} role="status">{session.modified ? '수정됨' : '수정 없음'}{save ? ` · ${save}` : ''}{session.origin ? '' : ' · 가져온 문서'}</p> : null}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.tool} disabled={!session.undo.length} onClick={api.undo} aria-keyshortcuts="Control+Z Meta+Z">실행 취소</button>
        <button type="button" className={styles.tool} disabled={!session.redo.length} onClick={api.redo} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y">다시 실행</button>
        {narrow ? (
          <div className={styles.more}>
            <button type="button" className={styles.tool} aria-expanded={more} aria-controls="studio-more" onClick={() => setMore(v => !v)}>더보기</button>
            {more ? <div id="studio-more" className={styles.moreList}>{secondary}</div> : null}
          </div>
        ) : secondary}
      </div>
      {hasDoc ? (
        <div className={styles.group} role="group" aria-label="화면 배치">
          {panes.map(p => (
            <button key={p} type="button" className={styles.seg} aria-pressed={effective === p} onClick={() => api.navigate({pane: p}, 'push')}>{PANE_LABEL[p]}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
