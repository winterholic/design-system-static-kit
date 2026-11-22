import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';
import {DocContent} from './DocContent';
import {DOCS_SECTIONS, DOCS_PAGES, resolveDocPage} from '@/lib/docs.mjs';
import {ButtonLink} from '@/ui';

export type DocParams = {params: Promise<{slug: string}>};

export function docStaticParams(section: string) {
  return DOCS_PAGES.filter(page => page.section === section).map(page => ({slug: page.slug}));
}

export async function docMetadata(section: string, {params}: DocParams) {
  const {slug} = await params;
  const page = resolveDocPage(section, slug);
  return page ? {title: `${page.title} | Docs`, description: page.description} : {title: '문서를 찾을 수 없음 | Docs'};
}

export async function DocArticle({section, params}: {section: string} & DocParams) {
  const {slug} = await params;
  const page = resolveDocPage(section, slug);
  if (!page) notFound();
  const label = DOCS_SECTIONS.find(s => s.id === section)?.title ?? 'Docs';
  return (
    <PageShell eyebrow={`Docs · ${label}`} title={page.title} lead={page.description}>
      <DocContent slug={page.slug} />
      <ButtonLink href="/docs" variant="quiet">Docs로 돌아가기</ButtonLink>
    </PageShell>
  );
}
