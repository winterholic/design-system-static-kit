'use client';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {Button, Input, Select, type SelectOption} from '@/ui';
import styles from './platform.module.css';

/** 주소 쿼리를 바꾸는 컨트롤. 상태는 주소가 가지므로 새로고침·뒤로 가기·공유에서 같은 화면이 열린다(replace 라서 history 항목이 늘지 않는다). */
function useSetParams() {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  return (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') q.delete(k); else q.set(k, v); }
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, {scroll: false});
  };
}

export function QuerySelect({id, label, param, value, options, placeholder, resets = []}: {id: string; label: string; param: string; value: string; options: SelectOption[]; placeholder?: string; resets?: string[]}) {
  const set = useSetParams();
  return <Select id={id} label={label} value={value} options={options} placeholder={placeholder} onChange={v => set({[param]: v || null, ...Object.fromEntries(resets.map(r => [r, null]))})} />;
}

export type ContentField = {name: string; label: string; value: string; hint?: string};
export function ContentForm({fields}: {fields: ContentField[]}) {
  const set = useSetParams();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(f => [f.name, f.value])));
  const apply = () => set(Object.fromEntries(fields.map(f => [`c_${f.name}`, values[f.name] === f.value ? null : values[f.name]])));
  return (
    <form className={styles.form} onSubmit={e => { e.preventDefault(); apply(); }} aria-label="콘텐츠 수정">
      {fields.map(f => <Input key={f.name} id={`c-${f.name}`} label={f.label} hint={f.hint} value={values[f.name]} onChange={e => setValues(v => ({...v, [f.name]: e.target.value}))} onBlur={apply} />)}
      <div className={styles.formRow}><Button type="submit" size="sm">콘텐츠 적용</Button></div>
    </form>
  );
}
