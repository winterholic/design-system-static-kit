'use client';

import {useRef} from 'react';
import styles from './thumb.module.css';

const VIEW_W = 1280, VIEW_H = 800;

function getPreviewUrl(src: string): string | null {
  const exploreMatch = src.match(/^\/explore\/([^/]+)\/render$/);
  if (exploreMatch) return `/previews/explore/${exploreMatch[1]}.svg`;
  const compMatch = src.match(/^\/components\/([^/]+)\/render$/);
  if (compMatch) return `/previews/components/${compMatch[1]}.svg`;
  return null;
}

/**
 * Thumb: 대표 미리보기 컴포넌트.
 * 일반 카탈로그 목록(Explore, Components, Typography 등)에서는 사전 생성된 정적 SVG(img)로
 * 인라인 렌더링하여 iframe 0개와 런타임 컴파일 0회를 달성한다 (CONTRACTS.md §5.1).
 * interactive 모드(상세 시험 영역 등)나 정적 자산이 없는 경우에만 격리된 iframe을 렌더링한다.
 */
export function Thumb({
  src,
  title,
  width = VIEW_W,
  height = VIEW_H,
  interactive = false,
  previewUrl,
  staticSvg,
}: {
  src: string;
  title: string;
  width?: number;
  height?: number;
  interactive?: boolean;
  previewUrl?: string;
  staticSvg?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const resolvedPreview = previewUrl ?? getPreviewUrl(src);

  // 대화형 상세 시험 영역이거나 정적 자산이 없는 경우 격리 iframe 허용
  if (interactive || !resolvedPreview) {
    return (
      <div ref={box} className={styles.box} style={{aspectRatio: `${width} / ${height}`}} data-live="true">
        <iframe
          key={src}
          src={src}
          title={title}
          tabIndex={interactive ? 0 : -1}
          aria-hidden={interactive ? undefined : 'true'}
          sandbox="allow-scripts"
          className={interactive ? `${styles.frame} ${styles.interactive}` : styles.frame}
          style={{width, height}}
        />
      </div>
    );
  }

  // 사전 생성 인라인 SVG 제공 시
  if (staticSvg) {
    return (
      <div
        ref={box}
        className={styles.box}
        style={{aspectRatio: `${width} / ${height}`}}
        data-live="true"
        dangerouslySetInnerHTML={{__html: staticSvg}}
      />
    );
  }

  // 일반 카탈로그 목록: 정적 자산(SVG) 렌더링 (iframe 0개, Observer 없음)
  return (
    <div ref={box} className={styles.box} style={{aspectRatio: `${width} / ${height}`}} data-live="true">
      <img
        src={resolvedPreview}
        alt={title}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={styles.image}
      />
    </div>
  );
}
