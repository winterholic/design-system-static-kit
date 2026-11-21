'use client';
import type {InputHTMLAttributes, Ref, TextareaHTMLAttributes} from 'react';
import {Field, describedBy, useFieldIds, type FieldChrome} from './Field';
import {cx} from './cx';
import styles from './ui.module.css';

type InputOwn = FieldChrome & {mono?: boolean; ref?: Ref<HTMLInputElement>};

/** 한 줄 입력. 라벨·도움말·오류를 같은 방식으로 붙인다. 오류는 색이 아니라 굵은 테두리와 문구로도 알린다. */
export function Input({label, hideLabel, hint, error, required, className, mono, id, ref, ...rest}: InputOwn & Omit<InputHTMLAttributes<HTMLInputElement>, 'required'>) {
  const ids = useFieldIds(id);
  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} hint={hint} error={error} required={required} className={className}>
      <input ref={ref} id={ids.id} className={cx(styles.control, mono && styles.mono)} aria-required={required || undefined} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, {hint, error})} {...rest} />
    </Field>
  );
}

export function Textarea({label, hideLabel, hint, error, required, className, mono, id, ref, ...rest}: FieldChrome & {mono?: boolean; ref?: Ref<HTMLTextAreaElement>} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>) {
  const ids = useFieldIds(id);
  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} hint={hint} error={error} required={required} className={className}>
      <textarea ref={ref} id={ids.id} className={cx(styles.control, styles.area, mono && styles.mono)} aria-required={required || undefined} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, {hint, error})} {...rest} />
    </Field>
  );
}

export function Checkbox({label, hint, error, className, id, ...rest}: Omit<FieldChrome, 'hideLabel' | 'required'> & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'required'>) {
  const ids = useFieldIds(id);
  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.check}>
        <input type="checkbox" id={ids.id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, {hint, error})} {...rest} />
        <span>{label}</span>
      </label>
      {hint ? <p id={ids.hintId} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={ids.errorId} className={styles.error}>{error}</p> : null}
    </div>
  );
}
