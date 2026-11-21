import type {CSSProperties} from 'react';
import type {FoundationAxis, IconRow} from './types';
import styles from './materials.module.css';

// 기초 재료의 값 표(Core)를 그대로 그려 보여 준다. 표에 없는 값은 만들지 않는다.
// 깊이·배경 표는 --kit-* 변수를 참조하므로 사이트 토큰으로 바꿔 매단 범위 안에서 그린다.
const SCOPE = {'--kit-border': 'var(--color-line)', '--kit-shade': 'rgb(20 22 26 / 0.18)', '--kit-action': 'var(--color-accent)', '--kit-text': 'var(--color-fg)', '--kit-canvas': 'var(--color-bg)', '--kit-soft': 'var(--color-surface)', '--kit-accentSoft': 'var(--color-surface)'} as CSSProperties;

type Table = Record<string, any>;

/** 값 하나의 작은 그림. 그릴 수 없는 축(셸·푸터 등)은 null이라 설명 글만 보인다. */
export function ValueSample({axis, value, icons}: {axis: FoundationAxis; value: string; icons: IconRow[]}) {
  const table = axis.table as Table | null;
  const t = table?.[value];
  switch (axis.axis) {
    case 'radius': return <span className={styles.vsBox} style={{borderRadius: t}} aria-hidden="true" />;
    case 'elevation': return <span className={styles.vsCard} style={{...SCOPE, border: t.border, boxShadow: t.shadow}} aria-hidden="true" />;
    case 'backdrop': return <span className={styles.vsCard} style={{...SCOPE, background: t}} aria-hidden="true" />;
    case 'width': return <span className={styles.vsTrack} aria-hidden="true"><span className={styles.vsFill} style={{width: `${(t / 1600) * 100}%`}} /></span>;
    case 'weight': return <span className={styles.vsText} style={{fontWeight: t.head}} aria-hidden="true">가나다 Aa</span>;
    case 'motion': return <span className={styles.vsLift} style={{'--dur': t.dur, '--lift': t.lift} as CSSProperties} aria-hidden="true" />;
    case 'density': return (
      <span className={styles.vsStack} aria-hidden="true">
        {['item', 'gap', 'section'].map(k => <span key={k} className={styles.vsBar} style={{width: Math.max(8, t[k] * 2)}} />)}
      </span>
    );
    case 'icon': {
      const paths = icons.find(i => i.id === 'bell')?.paths ?? [];
      return (
        <svg className={styles.vsIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {paths.map((d, i) => <path key={i} d={d} fill={d.endsWith('Z') ? t.fill : 'none'} stroke="currentColor" strokeWidth={t.sw} strokeLinecap={t.cap} strokeLinejoin={t.join} />)}
        </svg>
      );
    }
    default: return null;
  }
}

/** 값 하나를 그림으로 보여 줄 수 있는 축인가. */
export const hasSample = (axis: string) => ['radius', 'elevation', 'backdrop', 'width', 'weight', 'motion', 'density', 'icon'].includes(axis);

/** 값에 붙는 수치(px 등)를 읽기 쉽게 한 줄로 푼다. */
export function valueFacts(axis: FoundationAxis, value: string): string {
  const t = (axis.table as Table | null)?.[value];
  if (t === undefined || t === null) return '';
  switch (axis.axis) {
    case 'radius': return `${t}px`;
    case 'width': return `최대 ${t}px`;
    case 'scale': return `글자 비율 보정 ${t > 0 ? '+' : ''}${t}`;
    case 'weight': return `제목 ${t.head} · 버튼 ${t.btn}`;
    case 'motion': return `지속 ${t.dur} · 들림 ${t.lift}`;
    case 'icon': return `선 ${t.sw}px · 끝 ${t.cap}`;
    case 'density': return `간격 ${t.gap}px · 구역 ${t.section}px · 컨트롤 ${t.control}px`;
    default: return '';
  }
}
