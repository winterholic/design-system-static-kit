'use client';

import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {Chip, ChipGroup} from '@/ui';
import styles from './preview.module.css';

// 미리보기 폭. 실제 폭으로 그린 뒤 가용 폭에 맞춰 줄이므로 미디어 쿼리가 실제 휴대폰·데스크톱처럼 동작한다.
const DEVICES = {desktop: {label: '데스크톱', width: 1280}, mobile: {label: '모바일', width: 390}} as const;
type Device = keyof typeof DEVICES;

export function PreviewFrame({src, title}: {src: string; title: string}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // 선택한 폭은 쿼리(device)에 두어 새로고침·공유에서 복원한다. 보기 전환은 탐색이 아니므로 replace 한다.
  const device: Device = params.get('device') === 'mobile' ? 'mobile' : 'desktop';
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const virtual = DEVICES[device].width;
  const scale = width ? Math.min(1, width / virtual) : 0;
  const stageHeight = device === 'mobile' ? 780 : 760;
  const set = (next: Device) => {
    const q = new URLSearchParams(params.toString());
    if (next === 'desktop') q.delete('device'); else q.set('device', next);
    router.replace(q.size ? `${pathname}?${q}` : pathname, {scroll: false});
  };

  return (
    <div>
      <ChipGroup label="미리보기 폭" className={styles.toolbar}>
        {(Object.keys(DEVICES) as Device[]).map(id => (
          <Chip key={id} pressed={device === id} onClick={() => set(id)}>
            {DEVICES[id].label} <span className={styles.px}>{DEVICES[id].width}px</span>
          </Chip>
        ))}
      </ChipGroup>
      <div ref={stage} className={styles.stage} style={{height: stageHeight * (scale || 1)}} data-device={device}>
        {scale ? (
          <div className={styles.slot} style={{width: virtual * scale, height: stageHeight * scale}}>
            <iframe src={src} title={title} className={styles.frame} style={{width: virtual, height: stageHeight, transform: `scale(${scale})`}} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
