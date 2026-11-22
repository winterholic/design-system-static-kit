'use client';
import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {useStudio} from '../context';
import type {Intent, PendingAction} from '../model';
import type {ImpactReport} from '../impact';
import type {Diagnostic} from '../types';
import {DiagnosticList} from './Banners';
import {Button, Checkbox, Input, Textarea} from '@/ui';
import styles from '../studio.module.css';

/** 네이티브 <dialog>(showModal): 뒤쪽을 비활성으로 만들고, 초점을 가두고, Esc로 닫는다. 닫으면 열기 전 초점으로 돌려 준다. */
function Modal({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current!;
    const before = document.activeElement as HTMLElement | null;
    if (!el.open) el.showModal();
    return () => { if (before && document.contains(before)) before.focus(); };
  }, []);
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className={styles.dialogBody}>
        <h2 id={titleId} className={styles.dialogTitle}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

function confirmCopy(action: PendingAction, templateLabel: (id: string) => string, resetTarget: string) {
  switch (action.kind) {
    case 'replaceTemplate':
      return {title: '템플릿을 바꿀까요?', body: `수정한 내용이 "${templateLabel(action.template)}" 템플릿의 내용으로 바뀝니다. ${action.keepAppearance ? '테마·팔레트·모드는 유지합니다. ' : '테마도 템플릿 기본값으로 돌아갑니다. '}실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`, ok: '템플릿 바꾸기', cancel: '취소'};
    case 'reset':
      return {title: '초기화할까요?', body: `${resetTarget}의 처음 상태로 돌아갑니다. 수정한 내용은 사라지지만 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.`, ok: '초기화', cancel: '취소'};
    case 'import':
      return {title: '가져온 JSON으로 바꿀까요?', body: '수정한 내용이 가져온 문서로 바뀝니다. 가져온 문서는 출처 템플릿을 알 수 없습니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.', ok: '가져와서 바꾸기', cancel: '취소'};
    case 'shared':
      return {title: '공유 링크의 작업으로 바꿀까요?', body: `이 브라우저에 작업 중인 문서가 있습니다. 링크의 문서 "${String(action.payload.doc.name ?? '이름 없음')}"를 열면 지금 문서가 바뀝니다(실행 취소로 되돌릴 수 있습니다). 내 작업을 유지하면 링크의 내용은 열리지 않습니다.`, ok: '링크의 작업 열기', cancel: '내 작업 유지'};
    case 'start': {
      const r = action.request;
      const parts = Object.entries(r).map(([k, v]) => `${k}=${typeof v === 'string' ? v : Object.entries(v as object).map(([s, o]) => `${s}:${o}`).join(',')}`).join(' ');
      return {title: '작업 중인 문서가 있습니다', body: `주소가 새 시작 상태(${parts || '기본'})를 요청했습니다. 새로 열면 지금 작업 중인 문서가 바뀝니다(실행 취소로 되돌릴 수 있습니다). 이어서 작업하면 요청은 버려집니다.`, ok: '새로 열기 (덮어쓰기)', cancel: '이어서 작업'};
    }
  }
}

function ConfirmDialog({action}: {action: PendingAction}) {
  const api = useStudio();
  const label = (id: string) => api.catalog?.templates.find(t => t.id === id)?.label ?? id;
  const origin = api.state.session.origin;
  const resetTarget = origin ? `템플릿 "${label(origin.template)}"` : '기본 템플릿(대시보드)';
  const copy = confirmCopy(action, label, resetTarget);
  return (
    <Modal title={copy.title} onClose={api.closeDialog}>
      <p>{copy.body}</p>
      <div className="btn-row">
        <Button size="sm" autoFocus onClick={api.closeDialog}>{copy.cancel}</Button>
        <Button size="sm" variant="primary" onClick={() => api.confirmAction(action)}>{copy.ok}</Button>
      </div>
    </Modal>
  );
}

const MODE_NAME: Record<string, string> = {light: '라이트', dark: '다크'};

/** 구 문서를 2.6.0 재료로 올리기 전에 무엇이 바뀌는지 보여 준다. 적용해야 문서가 바뀌고, 취소하면 아무것도 바뀌지 않는다. */
function ImpactDialog({intent, report}: {intent: Intent; report: ImpactReport}) {
  const api = useStudio();
  const colorTotal = report.colorShifts.reduce((n, c) => n + c.changed, 0);
  return (
    <Modal title={report.versionBump ? `문서를 ${report.versionBump.to}로 올리고 ${report.subject}를 적용할까요?` : `${report.subject}를 적용할까요?`} onClose={api.closeDialog}>
      <dl className={styles.impact} data-testid="impact-dialog">
        {report.versionBump ? <div><dt>문서 버전</dt><dd data-testid="impact-version">{report.versionBump.from} → {report.versionBump.to}</dd></div> : null}
        <div><dt>바뀌는 값</dt><dd data-testid="impact-changes">{report.changeCount}곳{report.changed.length ? ` (${[...new Set(report.changed.map(c => c.label))].join(', ')}${report.changeCount > report.changed.length ? ' 외' : ''})` : ''}</dd></div>
        <div><dt>색</dt><dd data-testid="impact-colors">{report.colorShifts.length ? (colorTotal ? report.colorShifts.filter(c => c.changed).map(c => `${MODE_NAME[c.mode] ?? c.mode} 모드 색 ${c.total}개 중 ${c.changed}개 바뀜`).join(' · ') : '색은 그대로입니다.') : '색 변화를 계산하지 못했습니다.'}</dd></div>
        <div><dt>직접 고친 내용</dt><dd data-testid="impact-edits">{report.userEdits}곳 · 사라지는 콘텐츠 {report.contentLoss}개{report.contentLoss === 0 ? ' (글과 구조는 그대로 유지됩니다)' : ''}</dd></div>
      </dl>
      {report.paletteNote ? <p className={styles.muted} data-testid="impact-palette-note">{report.paletteNote}</p> : null}
      <p className={styles.muted}>적용한 뒤에도 실행 취소(Ctrl+Z)로 이전 버전과 색으로 돌아갈 수 있습니다.</p>
      <div className="btn-row">
        <Button size="sm" autoFocus onClick={api.closeDialog}>취소</Button>
        <Button size="sm" variant="primary" onClick={() => api.confirmImpact(intent)}>적용</Button>
      </div>
    </Modal>
  );
}

function ImportDialog() {
  const api = useStudio();
  const [text, setText] = useState('');
  const [upgrade, setUpgrade] = useState(false);
  const [errors, setErrors] = useState<Diagnostic[]>([]);
  const [fileNote, setFileNote] = useState('');

  const apply = () => {
    if (!api.core) return;
    // 먼저 문서 없이 시험해 본다. 거부되면 대화상자에 이유를 보이고 현재 문서는 건드리지 않는다.
    const r = api.core.edit.applyOp(null, 'importBlueprint', {blueprint: text, upgrade});
    if (!r.ok) { setErrors(r.errors); return; }
    setErrors([]);
    api.requestAction({kind: 'import', text, upgrade});
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { setFileNote('파일이 2MB를 넘습니다. Blueprint JSON이 맞는지 확인하세요.'); return; }
    setText(await file.text());
    setFileNote(`${file.name} 파일을 불러왔습니다.`);
    setErrors([]);
  };
  return (
    <Modal title="JSON 가져오기" onClose={api.closeDialog}>
      <p className={styles.muted}>Blueprint JSON을 붙여 넣거나 파일을 고르세요. 검증을 통과해야 문서가 바뀝니다.</p>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="import-file">JSON 파일</label>
        <input id="import-file" type="file" accept="application/json,.json" onChange={e => onFile(e.target.files?.[0])} />
        {fileNote ? <p className={styles.muted} role="status">{fileNote}</p> : null}
      </div>
      <Textarea id="import-text" className={styles.field} mono label="Blueprint JSON" rows={10} value={text} onChange={e => { setText(e.target.value); setErrors([]); }} aria-invalid={errors.length > 0 || undefined} />
      <Checkbox label="옛 카탈로그 버전이면 현재 버전으로 올리기" checked={upgrade} onChange={e => setUpgrade(e.target.checked)} />
      {errors.length ? <div role="alert" data-testid="import-errors"><p className={styles.fieldError}>가져오지 못했습니다. 현재 문서는 그대로입니다.</p><DiagnosticList items={errors} /></div> : null}
      <div className="btn-row">
        <Button size="sm" onClick={api.closeDialog}>취소</Button>
        <Button size="sm" variant="primary" disabled={!text.trim()} onClick={apply}>가져오기</Button>
      </div>
    </Modal>
  );
}

function TemplateDialog() {
  const api = useStudio();
  const {catalog} = api;
  const hasDoc = !!api.state.document.doc;
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string>(api.state.session.origin?.template ?? '');
  const [keepAppearance, setKeep] = useState(true);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const items = (catalog?.templates ?? []).filter(t => words.every(w => `${t.label} ${t.id} ${t.pageType}`.toLowerCase().includes(w)));
  const choose = () => {
    if (!picked) return;
    if (hasDoc) api.requestAction({kind: 'replaceTemplate', template: picked, keepAppearance});
    else { api.edit({kind: 'start', request: {template: picked}}); api.closeDialog(); }
  };
  return (
    <Modal title={hasDoc ? '템플릿 바꾸기' : '템플릿 고르기'} onClose={api.closeDialog}>
      {!catalog ? <p className={styles.muted} role="status">카탈로그를 불러오는 중입니다…</p> : (
        <>
          <Input id="tpl-q" className={styles.field} type="search" label="템플릿 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="이름·id·페이지 유형" />
          <fieldset className={styles.tplList}>
            <legend className="visually-hidden">템플릿 {items.length}개</legend>
            {items.map(t => (
              <label key={t.id} className={styles.tplRow}>
                <input type="radio" name="tpl" value={t.id} checked={picked === t.id} onChange={() => setPicked(t.id)} />
                <span><strong>{t.label}</strong> <span className={styles.muted}>{t.id} · {t.pageType}</span></span>
              </label>
            ))}
            {items.length === 0 ? <p className={styles.muted}>검색 결과가 없습니다.</p> : null}
          </fieldset>
          {hasDoc ? <Checkbox label="지금 테마·팔레트·모드를 유지" checked={keepAppearance} onChange={e => setKeep(e.target.checked)} /> : null}
        </>
      )}
      <div className="btn-row">
        <Button size="sm" onClick={api.closeDialog}>취소</Button>
        <Button size="sm" variant="primary" disabled={!picked || !catalog} onClick={choose}>{hasDoc ? '이 템플릿으로 바꾸기' : '이 템플릿으로 시작'}</Button>
      </div>
    </Modal>
  );
}

export function Dialogs() {
  const {state} = useStudio();
  const d = state.view.dialog;
  if (!d) return null;
  if (d.kind === 'confirm') return <ConfirmDialog action={d.action} />;
  if (d.kind === 'import') return <ImportDialog />;
  if (d.kind === 'impact') return <ImpactDialog intent={d.intent} report={d.report} />;
  return <TemplateDialog />;
}
