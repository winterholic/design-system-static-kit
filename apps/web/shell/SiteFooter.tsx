import {GITHUB_URL, SITE_NAME} from '@/lib/nav';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>{SITE_NAME} · 카탈로그 제약으로 디자인을 컴파일하는 도구</p>
        <ul className={styles.links}>
          <li><a href={GITHUB_URL} rel="noopener">GitHub</a></li>
        </ul>
      </div>
    </footer>
  );
}
