import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

type Props = {params: Promise<{componentId: string}>};

export async function generateMetadata({params}: Props) {
  const {componentId} = await params;
  return {title: `부품 ${componentId}`};
}

export default async function ComponentPage({params}: Props) {
  const {componentId} = await params;
  return (
    <PageShell eyebrow="Components" title={componentId} lead="이 부품의 속성과 허용 값이 여기에 표시됩니다.">
      <Link href="/components" className="btn btn-quiet">Components로 돌아가기</Link>
    </PageShell>
  );
}
