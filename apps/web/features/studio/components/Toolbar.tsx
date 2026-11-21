'use client';
import {useState} from 'react';
import {useStudio} from '../context';
import type {Pane} from '../types';
import {useNarrow} from '../useNarrow';
import {Button, Chip, ChipGroup} from '@/ui';
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
      <Button size="sm" onClick={close(() => api.withCore(() => api.openDialog({kind: 'template'})))}>템플릿 바꾸기</Button>
      <Button size="sm" onClick={close(() => api.withCore(() => api.openDialog({kind: 'import'})))}>JSON 가져오기</Button>
      <Button size="sm" disabled={!hasDoc} onClick={close(() => api.requestAction({kind: 'reset'}))}>초기화</Button>
      <Button size="sm" disabled={!hasDoc} onClick={close(api.exportJson)}>JSON 내보내기</Button>
      <Button size="sm" disabled={!hasDoc || !api.core} onClick={close(api.exportHtml)}>HTML 내보내기</Button>
    </>
  );

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="문서 도구">
      <div className={styles.docInfo}>
        <h2 className={styles.docName}>{document_.doc ? String(document_.doc.name) : 'Studio'}</h2>
        {hasDoc ? <p className={styles.docStatus} role="status">{session.modified ? '수정됨' : '수정 없음'}{save ? ` · ${save}` : ''}{session.origin ? '' : ' · 가져온 문서'}</p> : null}
      </div>
      <div className={styles.actions}>
        <Button size="sm" disabled={!session.undo.length} onClick={api.undo} aria-keyshortcuts="Control+Z Meta+Z">실행 취소</Button>
        <Button size="sm" disabled={!session.redo.length} onClick={api.redo} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y">다시 실행</Button>
        {narrow ? (
          <div className={styles.more}>
            <Button size="sm" aria-expanded={more} aria-controls="studio-more" onClick={() => setMore(v => !v)}>더보기</Button>
            {more ? <div id="studio-more" className={styles.moreList}>{secondary}</div> : null}
          </div>
        ) : secondary}
      </div>
      {hasDoc ? (
        <ChipGroup label="화면 배치" className={styles.group}>
          {panes.map(p => (
            <Chip key={p} pressed={effective === p} onClick={() => api.navigate({pane: p}, 'push')}>{PANE_LABEL[p]}</Chip>
          ))}
        </ChipGroup>
      ) : null}
    </div>
  );
}
