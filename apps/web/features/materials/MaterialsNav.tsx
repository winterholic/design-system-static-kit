import Link from 'next/link';
import {platformReady} from '@/features/platform/platform.server';
import styles from './materials.module.css';

const SECTIONS = [
  {id: 'overview', href: '/materials', label: '개요'},
  {id: 'palettes', href: '/materials/palettes', label: '팔레트'},
  {id: 'color', href: '/materials/color', label: '색 토큰'},
  {id: 'typography', href: '/materials/typography', label: '타이포그래피'},
  {id: 'styles', href: '/materials/styles', label: '표면·모션·상태'},
  {id: 'foundations', href: '/materials/foundations', label: '기초 재료'},
] as const;
export type MaterialsSection = (typeof SECTIONS)[number]['id'];

/** Materials 안의 화면 이동. 상단 메뉴와 겹치지 않게 한 줄짜리 하위 내비게이션으로 둔다. */
export function MaterialsNav({current}: {current: MaterialsSection}) {
  return (
    <nav className={styles.subnav} aria-label="재료 종류">
      {SECTIONS.filter(s => platformReady() || (s.id !== 'palettes' && s.id !== 'styles')).map(s => <Link key={s.id} href={s.href} className={styles.subLink} aria-current={s.id === current ? 'page' : undefined}>{s.label}</Link>)}
    </nav>
  );
}
