import {PageShell} from '@/shell/PageShell';
import Link from 'next/link';
import {DOCS_PAGES} from '@/lib/docs.mjs';

export const metadata = {title: 'Docs | 시작 가이드와 Core 레퍼런스'};

const groups = [...new Set(DOCS_PAGES.map(page => page.group))];

export default function DocsPage() {
  return (
    <PageShell eyebrow="Docs" title="시작 가이드와 Core 레퍼런스" lead="예제를 실행하고 Blueprint를 검증한 뒤, Core가 제공하는 스키마와 규칙을 살펴보세요.">
      {groups.map(group => <section key={group} aria-labelledby={`docs-${group}`}>
        <h2 className="section-title" id={`docs-${group}`}>{group}</h2>
        <ul className="link-list">
          {DOCS_PAGES.filter(page => page.group === group).map(page => <li key={page.slug}>
            <Link href={page.href}>{page.title}</Link><span>{page.description}</span>
          </li>)}
        </ul>
      </section>)}
      <p className="note">기존 정적 문서는 <Link href="/docs/design.html">설계 개요</Link>, <Link href="/docs/layout.html">레이아웃</Link>, <Link href="/docs/typography.html">타이포그래피</Link>, <Link href="/docs/spacing.html">간격</Link>, <Link href="/docs/palettes.html">팔레트</Link> 주소로 계속 열 수 있습니다.</p>
    </PageShell>
  );
}
