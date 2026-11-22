import Link from 'next/link';
import {MODE_LABEL, type Mode} from './labels';
import styles from './platform.module.css';

/** 라이트·다크 전환. 주소의 mode 쿼리만 바꾼다(새로고침·공유에서 같은 화면). */
export function ModeSwitch({current, href}: {current: Mode; href: (mode: Mode) => string}) {
  return (
    <div className={styles.seg} role="group" aria-label="색 모드">
      {(Object.keys(MODE_LABEL) as Mode[]).map(m => <Link key={m} href={href(m)} replace scroll={false} className={styles.segItem} aria-current={m === current ? 'true' : undefined}>{MODE_LABEL[m]}</Link>)}
    </div>
  );
}
