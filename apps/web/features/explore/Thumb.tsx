import type {PreviewTarget} from '@/lib/api/preview-keys.mjs';
import {LiveThumb} from './LiveThumb';
import {previewRefusal, previewSrc} from './previews.server';
import styles from './thumb.module.css';

const VIEW_W = 1280, VIEW_H = 800;

// 목록·카드 그리드의 미리보기. iframe 도 Observer 도 쓰지 않는 <img> 한 장이다(CONTRACTS §5.1).
//  1) preview 대상이 빌드 시점에 사전 생성돼 있으면 그 정적 SVG(파일명이 캐시 키: immutable 로 서빙한다).
//  2) 없으면(사용자가 고른 샘플·모드·폭 등) 같은 요청을 /platform/render 가 SVG 로 컴파일해 준다. 선택 시점의 컴파일이며 서버 캐시를 거친다.
//  3) 사전 생성 때 Core 가 거부한 조합이면 이유 문구(data-preview="unavailable"). 컴파일하지 않는다.
//  4) 어느 쪽도 없으면 자리만 둔다(data-preview="missing"). 이 경우는 목록에서 시험이 실패하게 한다.
// interactive 는 상세 화면의 시험 영역이다. 그때만 격리 iframe(LiveThumb)을 쓴다.
export function Thumb({src, title, width = VIEW_W, height = VIEW_H, interactive = false, preview}: {
  src: string; title: string; width?: number; height?: number; interactive?: boolean; preview?: PreviewTarget;
}) {
  if (interactive) return <LiveThumb src={src} title={title} width={width} height={height} interactive />;
  const target = preview ? {...preview, width: preview.width ?? width} : null;
  const stat = target ? previewSrc(target) : null;
  const refusal = !stat && target ? previewRefusal(target) : null;
  // 사전 생성 때 Core 가 거부한 조합은 컴파일을 되풀이하지 않고 이유를 보인다(요청하면 오류 문서만 돌아온다).
  if (refusal) return <div className={styles.box} style={{aspectRatio: `${width} / ${height}`}} data-preview="unavailable"><p className={styles.refusal} role="status">{refusal}</p></div>;
  const dynamic = !stat && src.startsWith('/platform/render?') ? `${src}&part=svg&w=${width}&h=${height}` : null;
  const url = stat ?? dynamic;
  return (
    <div className={styles.box} style={{aspectRatio: `${width} / ${height}`, '--w': `${width}px`, '--h': `${height}px`} as React.CSSProperties} data-preview={stat ? 'static' : dynamic ? 'dynamic' : 'missing'}>
      {url ? <img src={url} alt={title} width={width} height={height} loading="lazy" decoding="async" className={styles.image} /> : null}
    </div>
  );
}
