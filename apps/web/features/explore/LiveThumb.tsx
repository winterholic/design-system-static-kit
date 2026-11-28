'use client';

import {useEffect, useRef, useState} from 'react';
import styles from './thumb.module.css';

// 상세 화면의 시험 영역(interactive)에만 쓰는 격리 iframe 미리보기(CONTRACTS §5.1). 목록 카드는 쓰지 않는다(Thumb 의 정적 이미지).
// 화면 근처에 올 때만 iframe 을 만들고 멀어지면 지운다.
const VIEW_W = 1280, VIEW_H = 800;

/** interactive: 컴포넌트 시연처럼 안에서 눌러 보게 한다. 아니면 미리보기 전용(포인터·초점을 막는다). */
export function LiveThumb({src, title, width = VIEW_W, height = VIEW_H, interactive = false}: {src: string; title: string; width?: number; height?: number; interactive?: boolean}) {
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
        // key 가 src 이므로 주소가 바뀌면 iframe 요소를 새로 만든다. 열린 iframe 의 src 를 바꾸면 Chromium이 history 항목을 쌓아 뒤로 가기가 무반응이 된다(W6a B10과 같은 원인).
        <iframe
          key={src}
          src={src}
          title={title}
          tabIndex={interactive ? 0 : -1}
          aria-hidden={interactive ? undefined : 'true'}
          sandbox="allow-scripts"
          className={interactive ? `${styles.frame} ${styles.interactive}` : styles.frame}
          style={{width, height, transform: `scale(${scale})`}}
        />
      ) : null}
    </div>
  );
}
