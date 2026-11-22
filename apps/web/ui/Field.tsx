import {useId, type ReactNode} from 'react';
import {cx} from './cx';
import styles from './ui.module.css';

/** 라벨·도움말·오류를 한 규칙으로 묶는다. 입력 부품(Input·Textarea·Select·Checkbox)이 모두 같은 id 규칙과 aria 연결을 쓴다. */
export function useFieldIds(idProp?: string) {
  const auto = useId();
  const id = idProp ?? `f${auto.replace(/:/g, '')}`;
  return {id, labelId: `${id}-label`, hintId: `${id}-hint`, errorId: `${id}-error`};
}

export type FieldChrome = {
  label: ReactNode;
  /** 라벨을 화면에서 숨기고 스크린리더에만 남긴다(검색창처럼 자리가 라벨 구실을 할 때). */
  hideLabel?: boolean;
  hint?: ReactNode;
  /** 오류 문구. 있으면 aria-invalid와 aria-describedby가 켜진다. */
  error?: ReactNode;
  required?: boolean;
  className?: string;
};

export function describedBy(ids: ReturnType<typeof useFieldIds>, {hint, error}: Pick<FieldChrome, 'hint' | 'error'>) {
  return [error ? ids.errorId : null, hint ? ids.hintId : null].filter(Boolean).join(' ') || undefined;
}

export function Field({ids, label, hideLabel, hint, error, required, className, htmlFor, labelTag = 'label', children}: FieldChrome & {ids: ReturnType<typeof useFieldIds>; htmlFor?: string; labelTag?: 'label' | 'span'; children: ReactNode}) {
  const Label = labelTag;
  return (
    <div className={cx(styles.field, className)}>
      <Label id={ids.labelId} className={cx(styles.label, hideLabel && 'visually-hidden')} {...(labelTag === 'label' ? {htmlFor: htmlFor ?? ids.id} : {})}>
        {label}{required ? <span className={styles.req} aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {hint ? <p id={ids.hintId} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={ids.errorId} className={styles.error}>{error}</p> : null}
    </div>
  );
}
