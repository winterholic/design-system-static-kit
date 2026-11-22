'use client';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {Button, Input, Select, type SelectOption} from '@/ui';
import {CONTENT_FIELDS} from './assemble-state';
import styles from './platform.module.css';

/** 조립 흐름의 컨트롤. 상태는 모두 주소 쿼리에 있고, 재료 교체는 push 라서 뒤로 가기가 직전 선택으로 되돌린다. */
function useNav() {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  return {
    set(patch: Record<string, string | null>, mode: 'push' | 'replace' = 'push') {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') q.delete(k); else q.set(k, v); }
      const s = q.toString();
      router[mode](s ? `${pathname}?${s}` : pathname, {scroll: false});
    },
    back: () => router.back(),
  };
}

export function SwapSelect({id, label, param, value, options, placeholder}: {id: string; label: string; param: string; value: string; options: SelectOption[]; placeholder?: string}) {
  const nav = useNav();
  return <Select id={id} label={label} value={value} options={options} placeholder={placeholder} onChange={v => nav.set({[param]: v || null})} />;
}

export function BackButton() {
  const nav = useNav();
  return <Button size="sm" onClick={nav.back} data-testid="undo-step">이전 선택으로</Button>;
}

/** 콘텐츠 수정. 적용하면 주소의 c_* 쿼리가 바뀌고 미리보기가 같은 요청으로 다시 조립된다. */
export function AssembleContentForm({values}: {values: Record<string, string>}) {
  const nav = useNav();
  const [draft, setDraft] = useState(values);
  const apply = () => nav.set(Object.fromEntries(CONTENT_FIELDS.map(([f]) => [`c_${f}`, draft[f] ? draft[f] : null])), 'replace');
  return (
    <form className={styles.form} onSubmit={e => { e.preventDefault(); apply(); }} aria-label="콘텐츠 수정">
      {CONTENT_FIELDS.map(([f, label]) => <Input key={f} id={`ac-${f}`} label={label} value={draft[f] ?? ''} onChange={e => setDraft(d => ({...d, [f]: e.target.value}))} />)}
      <div className={styles.formRow}><Button type="submit" variant="primary" size="sm">콘텐츠 적용</Button></div>
    </form>
  );
}
