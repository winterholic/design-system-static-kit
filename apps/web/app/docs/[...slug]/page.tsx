import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';
import {DocContent} from '../DocContent';
import {DOCS_PAGES, resolveDocPage} from '@/lib/docs.mjs';

type Props = {params: Promise<{slug: string[]}>};

export async function generateMetadata({params}: Props) {
  const {slug} = await params;
  const page = resolveDocPage(slug);
  return page ? {title: `${page.title} | Docs`, description: page.description} : {title: '문서를 찾을 수 없음 | Docs'};
}

export function generateStaticParams() {
  return DOCS_PAGES.map(page => ({slug: [page.slug]}));
}

export default async function DocPage({params}: Props) {
  const {slug} = await params;
  const page = resolveDocPage(slug);
  if (!page) notFound();
  return (
    <PageShell eyebrow="Docs" title={page.title} lead={page.description}>
      <DocContent slug={page.slug} />
      <Link href="/docs" className="btn btn-quiet">Docs로 돌아가기</Link>
    </PageShell>
  );
}
