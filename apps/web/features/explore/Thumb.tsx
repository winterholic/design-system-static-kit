'use client';

import {useEffect, useRef, useState} from 'react';
import styles from './thumb.module.css';

// 컴파일된 화면을 축소해 보여 주는 썸네일. 화면 근처에 올 때만 iframe 을 만들고 멀어지면 지운다.
// 미리 만든 이미지가 없으므로 한 화면에 살아 있는 iframe 은 보이는 몇 개뿐이다(목록은 쪽당 24개로 제한).
const VIEW_W = 1280, VIEW_H = 800;

export function Thumb({src, title, width = VIEW_W, height = VIEW_H}: {src: string; title: string; width?: number; height?: number}) {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / width);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const io = new IntersectionObserver(entries => { for (const e of entries) setLive(e.isIntersecting); }, {rootMargin: '240px 0px'});
    io.observe(el);
    return () => { resize.disconnect(); io.disconnect(); };
  }, [width]);

  return (
    <div ref={box} className={styles.box} style={{aspectRatio: `${width} / ${height}`}} data-live={live && scale > 0}>
      {live && scale > 0 ? (
        <iframe
          src={src}
          title={title}
          tabIndex={-1}
          aria-hidden="true"
          sandbox="allow-scripts"
          className={styles.frame}
          style={{width, height, transform: `scale(${scale})`}}
        />
      ) : null}
    </div>
  );
}
