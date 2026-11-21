'use client';

import {useState} from 'react';
import styles from './components.module.css';

export function CopyBlock({text, label}: {text: string; label: string}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState('copied'); } catch { setState('failed'); }
    setTimeout(() => setState('idle'), 2000);
  };
  return (
    <div className={styles.block}>
      <pre tabIndex={0} aria-label={label} className={styles.pre}>{text}</pre>
      <button type="button" className="btn btn-quiet" onClick={copy}>{state === 'copied' ? '복사했습니다' : state === 'failed' ? '복사하지 못했습니다' : '복사'}</button>
      <span className="visually-hidden" role="status" aria-live="polite">{state === 'copied' ? `${label}을 복사했습니다` : ''}</span>
    </div>
  );
}
