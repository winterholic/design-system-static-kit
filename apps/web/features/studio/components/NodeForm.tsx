'use client';
import {useEffect, useRef, useState} from 'react';
import {specOf} from '../catalog';
import {useStudio} from '../context';
import {nodeAt, parseDiagnosticPath, pathKey} from '../paths';
import type {FieldSchema, NodePath} from '../types';
import styles from '../studio.module.css';

/**
 * 글자 입력은 초안을 로컬에 두고 입력이 멈추거나(700ms) 칸을 벗어나거나 Enter를 누를 때 한 번 반영한다.
 * 그래서 입력 도중 문서가 다시 만들어져도 커서·초점이 초기화되지 않고, 한 번의 입력이 Undo 한 단계가 된다.
 * 연산이 거부되면 문서 값은 그대로이므로 초안(사용자가 쓴 글)은 남겨 두고 오류를 칸 아래에 보인다.
 */
function useDraft(value: string, commit: (next: string) => void) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value), sent = useRef(value), focused = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value), commitRef = useRef(commit);
  valueRef.current = value;
  commitRef.current = commit;

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (draftRef.current !== valueRef.current) { sent.current = draftRef.current; commitRef.current(draftRef.current); }
  };
  useEffect(() => {
    // 문서 값이 우리가 보낸 값이 아니거나 칸이 비활성이면(Undo 등) 초안을 문서 값에 맞춘다.
    if (value !== sent.current || !focused.current) { draftRef.current = value; sent.current = value; setDraft(value); }
  }, [value]);
  useEffect(() => () => { if (timer.current) flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    value: draft,
    onChange: (next: string) => {
      draftRef.current = next; setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    onFocus: () => { focused.current = true; },
    onBlur: () => { focused.current = false; flush(); },
    flush,
  };
}

const FIELD_LABELS: Record<string, string> = {
  title: '제목', body: '본문', eyebrow: '상단 문구', description: '설명', label: '이름', value: '값', detail: '보조 설명', text: '글', name: '이름',
  variant: '변형', action: '주요 버튼', secondaryAction: '보조 버튼', visual: '시각 요소', anchor: '앵커', columns: '열 수', trend: '추세', delta: '증감', names: '이름 목록',
};
const fieldLabel = (name: string) => (FIELD_LABELS[name] ? `${FIELD_LABELS[name]} (${name})` : name);

type FieldProps = {name: string; label: string; schema: FieldSchema; value: unknown; optional: boolean; errors: string[]; onSet: (v: unknown) => void; onUnset: () => void};

function TextField({name, label, schema, value, optional, errors, onSet, onUnset}: FieldProps) {
  const text = typeof value === 'string' ? value : '';
  const draft = useDraft(text, next => (next === '' && optional ? onUnset() : onSet(next)));
  const long = (schema.maxLength ?? 0) > 120;
  const err = errors.length > 0;
  const common = {id: `f-${name}`, 'data-field': name, className: styles.input, value: draft.value, 'aria-invalid': err || undefined, 'aria-describedby': err ? `f-${name}-err` : undefined, onFocus: draft.onFocus, onBlur: draft.onBlur};
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`f-${name}`}>{label}{optional ? '' : ' *'}</label>
      {long
        ? <textarea {...common} rows={4} onChange={e => draft.onChange(e.target.value)} />
        : <input {...common} type="text" onChange={e => draft.onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') draft.flush(); }} />}
      {err ? <p id={`f-${name}-err`} className={styles.fieldError}>{errors.join(' ')}</p> : null}
    </div>
  );
}

function NumberField(p: FieldProps) {
  const text = typeof p.value === 'number' ? String(p.value) : '';
  const draft = useDraft(text, next => (next === '' ? (p.optional ? p.onUnset() : p.onSet(null)) : p.onSet(Number(next))));
  const err = p.errors.length > 0;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`f-${p.name}`}>{p.label}{p.optional ? '' : ' *'}</label>
      <input id={`f-${p.name}`} data-field={p.name} className={styles.input} type="number" value={draft.value} aria-invalid={err || undefined} aria-describedby={err ? `f-${p.name}-err` : undefined}
        onFocus={draft.onFocus} onBlur={draft.onBlur} onChange={e => draft.onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') draft.flush(); }} />
      {err ? <p id={`f-${p.name}-err`} className={styles.fieldError}>{p.errors.join(' ')}</p> : null}
    </div>
  );
}

function EnumField({name, label, schema, value, optional, errors, onSet, onUnset}: FieldProps) {
  const err = errors.length > 0;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`f-${name}`}>{label}{optional ? '' : ' *'}</label>
      <select id={`f-${name}`} data-field={name} className={styles.select} value={typeof value === 'string' ? value : ''} aria-invalid={err || undefined}
        onChange={e => (e.target.value === '' ? onUnset() : onSet(e.target.value))}>
        {optional || typeof value !== 'string' ? <option value="">(없음)</option> : null}
        {(schema.enum ?? []).map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
      </select>
      {err ? <p className={styles.fieldError}>{errors.join(' ')}</p> : null}
    </div>
  );
}

function BoolField({name, label, value, errors, onSet}: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.checkLabel}>
        <input type="checkbox" data-field={name} checked={value === true} onChange={e => onSet(e.target.checked)} /> {label}
      </label>
      {errors.length ? <p className={styles.fieldError}>{errors.join(' ')}</p> : null}
    </div>
  );
}

// 객체·배열 필드는 JSON으로 고친다. 형식이 틀리면 연산을 부르지 않고 칸 아래에 알린다. 내용 규칙은 Core 검증이 판정한다.
function JsonField({name, label, value, optional, errors, onSet, onUnset}: FieldProps) {
  const pretty = value === undefined ? '' : JSON.stringify(value, null, 2);
  const [text, setText] = useState(pretty);
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => { setText(pretty); setLocal(null); }, [pretty]);
  const apply = () => {
    if (text.trim() === '') { if (optional) { onUnset(); setLocal(null); } else setLocal('비울 수 없는 필드입니다.'); return; }
    try { onSet(JSON.parse(text)); setLocal(null); } catch (e) { setLocal('JSON 형식이 올바르지 않습니다: ' + (e as Error).message); }
  };
  const all = local ? [local, ...errors] : errors;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`f-${name}`}>{label} (JSON){optional ? '' : ' *'}</label>
      <textarea id={`f-${name}`} data-field={name} className={`${styles.input} ${styles.mono}`} rows={5} value={text} aria-invalid={all.length > 0 || undefined} onChange={e => setText(e.target.value)} onBlur={apply} />
      {all.length ? <p className={styles.fieldError}>{all.join(' ')}</p> : null}
    </div>
  );
}

export function NodeForm({path}: {path: NodePath}) {
  const api = useStudio();
  const {document: d, session, view} = api.state;
  const node = nodeAt(d.doc, path);
  const rootRef = useRef<HTMLDivElement>(null);
  const spec = node && path.length && api.core ? specOf(api.core, node.type) : null;

  // 오류 목록에서 이동해 왔다면 해당 필드에 초점을 둔다.
  const req = view.focusRequest;
  useEffect(() => {
    if (req?.field && pathKey(req.path) === pathKey(path)) rootRef.current?.querySelector<HTMLElement>(`[data-field="${req.field}"]`)?.focus();
  }, [req?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null;
  const fieldErrors = (field: string) => (session.error?.errors ?? []).filter(e => {
    const t = parseDiagnosticPath(e.path);
    return t && pathKey(t.path as NodePath) === pathKey(path) && t.field === field;
  }).map(e => `${e.message} ${e.hint}`);
  const key = path.length ? `update:${path.join('.')}` : 'rename';

  if (!path.length) {
    return (
      <div ref={rootRef} className={styles.form}>
        <h3 className={styles.panelTitle}>페이지</h3>
        <TextField name="name" label="문서 이름" schema={{type: 'string', maxLength: 80}} value={d.doc!.name} optional={false} errors={(session.error?.errors ?? []).filter(e => e.path === '$.name').map(e => `${e.message} ${e.hint}`)}
          onSet={v => api.edit({kind: 'rename', name: String(v)}, 'rename')} onUnset={() => undefined} />
        <p className={styles.muted}>문서 이름은 내보내기 JSON과 HTML 제목에 쓰입니다. 페이지 아래 부품을 고르면 그 내용을 고칠 수 있습니다.</p>
      </div>
    );
  }
  if (!spec) return <p className={styles.muted}>이 부품의 명세를 불러오는 중입니다…</p>;
  const names = Object.keys(spec.fields).filter(k => k !== 'type' && k !== 'children');
  const required = new Set(spec.required);
  const ordered = [...names.filter(k => required.has(k)), ...names.filter(k => !required.has(k))];

  return (
    <div ref={rootRef} className={styles.form}>
      <h3 className={styles.panelTitle}>{spec.label} 내용</h3>
      {ordered.map(name => {
        const schema = spec.fields[name];
        const props: FieldProps = {
          name, label: fieldLabel(name), schema, value: node[name], optional: !required.has(name), errors: fieldErrors(name),
          onSet: v => api.edit({kind: 'updateField', path, set: {[name]: v}}, `${key}:${name}`),
          onUnset: () => api.edit({kind: 'updateField', path, unset: [name]}, `${key}:${name}`),
        };
        if (Array.isArray(schema.enum)) return <EnumField key={name} {...props} />;
        if (schema.type === 'string') return <TextField key={name} {...props} />;
        if (schema.type === 'number' || schema.type === 'integer') return <NumberField key={name} {...props} />;
        if (schema.type === 'boolean') return <BoolField key={name} {...props} />;
        return <JsonField key={name} {...props} />;
      })}
    </div>
  );
}
