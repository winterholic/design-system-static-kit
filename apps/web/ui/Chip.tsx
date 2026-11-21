'use client';
import {useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode} from 'react';
import {cx} from './cx';
import styles from './ui.module.css';

/** 켜고 끄는 필터 칩. 상태는 aria-pressed 하나로만 알린다. */
export function Chip({pressed, className, type = 'button', ...rest}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {pressed: boolean}) {
  return <button type={type} aria-pressed={pressed} className={cx(styles.chip, className)} {...rest} />;
}

/** 칩 묶음. 이름을 가진 group이라 스크린리더가 어떤 필터인지 읽는다. */
export function ChipGroup({label, className, children}: {label: string; className?: string; children: ReactNode}) {
  return <div role="group" aria-label={label} className={cx(styles.chips, className)}>{children}</div>;
}

export type SegmentedOption = {value: string; label: ReactNode; disabled?: boolean; title?: string};

/**
 * 하나만 고르는 짧은 선택(라디오 그룹). 화살표 키로 옮기고 Tab은 묶음 전체에 한 번만 멈춘다.
 * 비활성 항목은 건너뛰지만 title로 이유를 읽을 수 있다.
 */
export function Segmented({label, value, options, onChange, className}: {label: string; value: string; options: SegmentedOption[]; onChange: (value: string) => void; className?: string}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter(i => i >= 0);
  const current = options.findIndex(o => o.value === value);
  const tabStop = current >= 0 && !options[current].disabled ? current : enabled[0];
  const move = (from: number, step: 1 | -1 | 'first' | 'last') => {
    if (!enabled.length) return;
    const at = enabled.indexOf(from);
    const next = step === 'first' ? enabled[0] : step === 'last' ? enabled[enabled.length - 1] : enabled[(at + step + enabled.length) % enabled.length];
    refs.current[next]?.focus();
    onChange(options[next].value);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const map: Record<string, 1 | -1 | 'first' | 'last'> = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last'};
    if (!(e.key in map)) return;
    e.preventDefault();
    move(i, map[e.key]);
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.chips, className)}>
      {options.map((o, i) => (
        <button key={o.value} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={o.value === value} tabIndex={i === tabStop ? 0 : -1}
          className={styles.chip} data-segment={o.value} disabled={o.disabled} title={o.title} onClick={() => onChange(o.value)} onKeyDown={e => onKey(e, i)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
