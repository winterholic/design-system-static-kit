'use client';

import {useRef, useState} from 'react';
import styles from './components.module.css';

/** 변형 선택과 실제 렌더 미리보기. 같은 출처 문서라서 불러온 뒤 내용 높이에 맞춘다. */
export function ComponentPreview({type, label, variants, note}: {type: string; label: string; variants: {id: string; ok: boolean; reason?: string}[]; note?: string}) {
  const [variant, setVariant] = useState<string>(variants.find(v => v.ok)?.id ?? '');
  const [height, setHeight] = useState(420);
  const frame = useRef<HTMLIFrameElement>(null);
  const src = `/components/${type}/render${variant ? `/${variant}` : ''}`;

  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(Math.min(900, Math.max(240, doc.documentElement.scrollHeight)));
  };

  return (
    <div>
      {variants.length ? (
        <div className={styles.variants} role="group" aria-label={`${label} 변형`}>
          {variants.map(v => <button key={v.id} type="button" className={styles.variant} aria-pressed={variant === v.id} disabled={!v.ok} onClick={() => setVariant(v.id)}><code>{v.id}</code></button>)}
        </div>
      ) : null}
      <iframe ref={frame} key={src} src={src} title={`${label}${variant ? ` · ${variant}` : ''} 렌더 결과`} className={styles.frame} style={{height}} onLoad={fit} />
      {variants.some(v => !v.ok) ? <p className={styles.note}>예제 데이터만으로는 만들 수 없는 변형: {variants.filter(v => !v.ok).map(v => `${v.id}(${v.reason})`).join(', ')}</p> : null}
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
