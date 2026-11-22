'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {Button, Input} from '@/ui';
import styles from './platform.module.css';

/** 시드 색 입력. 값은 주소(?seeds=)에만 담기고 저장되지 않는다. */
export function SeedForm({initial}: {initial: string}) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  return (
    <form className={styles.form} onSubmit={e => { e.preventDefault(); router.replace(`/materials/palettes/custom?seeds=${encodeURIComponent(text.trim())}`, {scroll: false}); }}>
      <Input id="seeds" label="hex 색 (공백이나 쉼표로 구분, 3개에서 8개)" value={text} onChange={e => setText(e.target.value)} placeholder="#D2501E #6F625A #0D6E8E" spellCheck={false} />
      <div className={styles.formRow}><Button type="submit" variant="primary">세트 후보 보기</Button></div>
    </form>
  );
}
