import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';

type Props = {params: Promise<{slug: string[]}>};

export async function generateMetadata({params}: Props) {
  const {slug} = await params;
  return {title: slug.join(' / ')};
}

export default async function DocPage({params}: Props) {
  const {slug} = await params;
  if (slug.length !== 1 || !['design', 'layout', 'typography', 'spacing', 'palettes'].includes(slug[0])) notFound();
  return (
    <PageShell eyebrow="Docs" title={slug.join(' / ')} lead="이 문서의 본문이 여기에 표시됩니다.">
      <Link href="/docs" className="btn btn-quiet">Docs로 돌아가기</Link>
    </PageShell>
  );
}
