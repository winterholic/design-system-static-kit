'use client';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {Field, describedBy, useFieldIds, type FieldChrome} from './Field';
import {cx} from './cx';
import styles from './ui.module.css';

export type SelectOption = {
  value: string;
  label: string;
  /** 고를 수 없다. 화살표 키로는 닿아서 이유를 읽을 수 있고, 누르거나 Enter를 눌러도 값은 바뀌지 않는다. */
  disabled?: boolean;
  /** 고를 수 없는 이유 전문. title로 나온다. */
  reason?: string;
  /** 고를 수 없는 이유 코드. 항목 아래 줄에 짧게 보인다. */
  reasonCode?: string;
  /** 같은 group 값을 가진 항목끼리 제목 아래에 묶는다. 처음 나온 순서를 따른다. */
  group?: string;
  hint?: string;
};

/** 좁은 화면(헤더 메뉴와 같은 720px)에서는 목록이 아래에서 올라오는 시트가 된다. */
const NARROW = '(max-width: 719px)';
const PAGE_STEP = 10;

type Placement = {mode: 'sheet'} | {mode: 'popover'; top?: number; bottom?: number; left: number; width: number; maxHeight: number};

function useNarrow(active: boolean) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const mq = window.matchMedia(NARROW);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [active]);
  return narrow;
}

/**
 * 공용 Select. WAI-ARIA의 select-only combobox 패턴이다: 초점은 항상 버튼에 있고, 목록의 현재 항목은 aria-activedescendant로 알린다.
 * 닫힘: Enter·Space·↑·↓로 열고, 글자를 치면 열면서 그 글자로 시작하는 항목으로 간다.
 * 열림: ↑↓ 이동, Home·End 처음·끝, PageUp·PageDown 열 칸 이동, Enter·Space 선택, Esc 닫기(선택 취소), Tab은 선택 없이 닫고 다음으로 넘어간다.
 * 초점은 열고 닫는 내내 버튼을 떠나지 않으므로 선택하거나 닫은 뒤에도 버튼에 남는다.
 */
export function Select({label, hideLabel, hint, error, required, className, id, value, options, onChange, placeholder = '고르세요', disabled, ...rest}: FieldChrome & {
  id?: string; value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder?: string; disabled?: boolean; 'data-field'?: string;
}) {
  const ids = useFieldIds(id);
  const listId = `${ids.id}-list`, optId = (i: number) => `${ids.id}-opt-${i}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({text: '', timer: 0 as unknown as ReturnType<typeof setTimeout>});
  const narrow = useNarrow(open);

  const selected = options.findIndex(o => o.value === value);
  const shown = selected >= 0 ? options[selected].label : value !== '' ? value : null;
  const groups = useMemo(() => {
    const out: {name: string | null; items: {option: SelectOption; index: number}[]}[] = [];
    options.forEach((option, index) => {
      const name = option.group ?? null;
      let g = out.find(x => x.name === name);
      if (!g) { g = {name, items: []}; out.push(g); }
      g.items.push({option, index});
    });
    return out;
  }, [options]);

  const firstEnabled = useCallback(() => Math.max(0, options.findIndex(o => !o.disabled)), [options]);
  const openList = useCallback((at?: number) => {
    if (disabled || !options.length) return;
    setActive(at ?? (selected >= 0 ? selected : firstEnabled()));
    setOpen(true);
  }, [disabled, options.length, selected, firstEnabled]);
  const close = useCallback(() => { setOpen(false); clearTimeout(typed.current.timer); typed.current.text = ''; }, []);
  const commit = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    close();
    if (o.value !== value) onChange(o.value);
    triggerRef.current?.focus();
  };

  // 목록 위치. 아래 공간이 모자라면 위로 연다. 스크롤·크기 변화 때 다시 잰다.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      if (window.matchMedia(NARROW).matches) { setPlacement({mode: 'sheet'}); return; }
      const gap = 4, margin = 8, want = 320;
      const below = window.innerHeight - r.bottom - gap - margin, above = r.top - gap - margin;
      const up = below < Math.min(want, 200) && above > below;
      const width = Math.min(Math.max(r.width, 200), window.innerWidth - 2 * margin);
      const left = Math.min(Math.max(r.left, margin), window.innerWidth - width - margin);
      setPlacement({mode: 'popover', left, width, maxHeight: Math.max(120, Math.min(want, up ? above : below)), ...(up ? {bottom: window.innerHeight - r.top + gap} : {top: r.bottom + gap})});
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, narrow]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(optId(active))?.scrollIntoView({block: 'nearest'});
  }, [open, active, placement]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close]);
  useEffect(() => () => clearTimeout(typed.current.timer), []);

  const typeahead = (char: string, from: number) => {
    const t = typed.current;
    clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = setTimeout(() => { t.text = ''; }, 600);
    const same = t.text.split('').every(c => c === t.text[0]);
    const needle = same ? t.text[0] : t.text;
    const order = options.map((_, i) => i);
    const start = same ? from + 1 : from;
    const found = [...order.slice(start), ...order.slice(0, start)].find(i => options[i].label.toLowerCase().startsWith(needle));
    return found;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const hit = typeahead(e.key, selected);
        if (hit !== undefined) { e.preventDefault(); openList(hit); }
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(a => Math.min(last, a + 1)); return;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) { commit(active); return; }
        setActive(a => Math.max(0, a - 1));
        return;
      case 'Home': e.preventDefault(); setActive(0); return;
      case 'End': e.preventDefault(); setActive(last); return;
      case 'PageDown': e.preventDefault(); setActive(a => Math.min(last, a + PAGE_STEP)); return;
      case 'PageUp': e.preventDefault(); setActive(a => Math.max(0, a - PAGE_STEP)); return;
      case 'Enter': case ' ': e.preventDefault(); commit(active); return;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); return;
      case 'Tab': close(); return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const hit = typeahead(e.key, active);
          if (hit !== undefined) { e.preventDefault(); setActive(hit); }
        }
    }
  };

  const style = placement && placement.mode === 'popover'
    ? {left: placement.left, width: placement.width, maxHeight: placement.maxHeight, ...(placement.top !== undefined ? {top: placement.top} : {bottom: placement.bottom})}
    : undefined;
  const sheet = placement?.mode === 'sheet';
  const activeId = open && active >= 0 ? optId(active) : undefined;

  const list = open && placement ? createPortal(
    <>
      {sheet ? <div className={styles.backdrop} aria-hidden="true" onMouseDown={e => e.preventDefault()} onClick={() => { close(); triggerRef.current?.focus(); }} /> : null}
      <div ref={listRef} className={cx(styles.popup, sheet && styles.sheet)} style={style} data-select-popup={ids.id}>
        {sheet ? (
          <div className={styles.sheetHead}>
            <span className={styles.sheetTitle}>{label}</span>
            <button type="button" tabIndex={-1} className={styles.sheetClose} onMouseDown={e => e.preventDefault()} onClick={() => { close(); triggerRef.current?.focus(); }}>닫기</button>
          </div>
        ) : null}
        <div id={listId} role="listbox" aria-labelledby={ids.labelId} className={styles.list}>
          {groups.map((g, gi) => {
            const gid = `${ids.id}-grp-${gi}`;
            const rows = g.items.map(({option: o, index: i}) => (
              <div key={o.value} id={optId(i)} role="option" aria-selected={i === selected} aria-disabled={o.disabled || undefined} data-value={o.value}
                className={cx(styles.option, i === active && styles.activeOption, o.disabled && styles.disabledOption)} title={o.reason}
                onMouseMove={() => active !== i && setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => commit(i)}>
                <span className={styles.optionText}>
                  <span>{o.label}</span>
                  {o.disabled && (o.reasonCode || o.reason) ? <span className={styles.optionSub}>쓸 수 없음{o.reasonCode ? ` · ${o.reasonCode}` : ''}</span> : o.hint ? <span className={styles.optionSub}>{o.hint}</span> : null}
                </span>
                {i === selected ? <span className={styles.tick} aria-hidden="true" /> : null}
              </div>
            ));
            return g.name ? <div key={gid} role="group" aria-labelledby={gid}><div id={gid} className={styles.groupHead}>{g.name}</div>{rows}</div> : <div key={gid} role="presentation">{rows}</div>;
          })}
        </div>
      </div>
    </>, document.body) : null;

  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} hint={hint} error={error} required={required} className={className} labelTag="span">
      <button ref={triggerRef} id={ids.id} type="button" role="combobox" className={cx(styles.control, styles.trigger)} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-labelledby={ids.labelId} aria-activedescendant={activeId}
        aria-required={required || undefined} aria-invalid={error ? true : undefined} aria-describedby={describedBy(ids, {hint, error})}
        data-value={value} data-open={open} {...rest}
        onClick={() => (open ? close() : openList())} onKeyDown={onKeyDown} onKeyUp={e => { if (e.key === ' ') e.preventDefault(); }}
        onBlur={() => { if (open) close(); }}>
        <span className={cx(styles.value, shown === null && styles.placeholder)}>{shown ?? placeholder}</span>
        <span className={styles.caret} aria-hidden="true" />
      </button>
      {list}
    </Field>
  );
}
