'use client';

import {useRef, useState} from 'react';
import styles from './detail.module.css';

type Status = 'idle' | 'loading' | 'copied' | 'failed';

/** 본문을 처음 열 때(또는 복사할 때) 한 번만 가져온다. 상세 HTML 에 수십 KB 의 JSON 을 싣지 않는다. */
export function CopyJson({src, label}: {src: string; label: string}) {
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const loading = useRef<Promise<string> | null>(null);

  const load = () => {
    loading.current ??= fetch(src).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text(); }).then(t => { setText(t); return t; });
    return loading.current;
  };

  const copy = async () => {
    setStatus('loading');
    try {
      const body = await load();
      await navigator.clipboard.writeText(body);
      setStatus('copied');
    } catch { setStatus('failed'); }
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <details className={styles.json} onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) void load().catch(() => setStatus('failed')); }}>
      <summary>{label} 보기</summary>
      <div className={styles.jsonBar}>
        <button type="button" className="btn btn-quiet" onClick={copy}>{status === 'copied' ? '복사했습니다' : status === 'failed' ? '복사하지 못했습니다' : '복사'}</button>
        <span className={styles.size}>{text ? `${(new TextEncoder().encode(text).length / 1024).toFixed(1)}KB` : ''}</span>
      </div>
      <pre tabIndex={0} aria-label={label} className={styles.pre}>{text ?? '불러오는 중…'}</pre>
      <p className="visually-hidden" role="status" aria-live="polite">{status === 'copied' ? 'Blueprint JSON을 복사했습니다' : ''}</p>
    </details>
  );
}
