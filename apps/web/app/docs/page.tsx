import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {DOCS_PAGES, DOCS_SECTIONS, INTEGRATION_PAGES} from '@/lib/docs.mjs';
import styles from './docs.module.css';

export const metadata = {title: 'Docs | 가이드, Core 레퍼런스, 연동'};

export default function DocsPage() {
  return (
    <PageShell eyebrow="Docs" title="가이드, Core 레퍼런스, 연동" lead="디자인을 고르고 조립하는 데는 필요 없지만, 결과를 코드로 가져가거나 자동화할 때 읽는 문서입니다. 규약, 명령어, 진단 코드는 모두 여기에 있습니다.">
      <div className={styles.cards}>
        {DOCS_SECTIONS.map(section => {
          const pages = section.id === 'integrations' ? INTEGRATION_PAGES : DOCS_PAGES.filter(page => page.section === section.id);
          return (
            <section key={section.id} id={section.id} className={styles.card} aria-labelledby={`docs-${section.id}`}>
              <h2 className="section-title" id={`docs-${section.id}`}>{section.title}</h2>
              <p className={styles.lead}>{section.description}</p>
              <ul className="link-list">
                {pages.map(page => <li key={page.href}><Link href={page.href}>{page.title}</Link><span>{page.description}</span></li>)}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="note">기존 정적 문서는 <Link href="/docs/design.html">설계 개요</Link>, <Link href="/docs/layout.html">레이아웃</Link>, <Link href="/docs/typography.html">타이포그래피</Link>, <Link href="/docs/spacing.html">간격</Link>, <Link href="/docs/palettes.html">팔레트</Link> 주소로 계속 열 수 있습니다.</p>
    </PageShell>
  );
}
