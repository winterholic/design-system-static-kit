import Link from 'next/link';
import {GITHUB_URL, SITE_NAME} from '@/lib/nav';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>{SITE_NAME} · 디자인을 탐색하고, 재료를 조합해, 코드로 가져가는 곳</p>
        <ul className={styles.links}>
          <li><Link href="/docs">Docs</Link></li>
          <li><a href={GITHUB_URL} rel="noopener">GitHub</a></li>
        </ul>
      </div>
    </footer>
  );
}
