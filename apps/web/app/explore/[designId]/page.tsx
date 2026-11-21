import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

type Props = {params: Promise<{designId: string}>};

export async function generateMetadata({params}: Props) {
  const {designId} = await params;
  return {title: `디자인 ${designId}`};
}

export default async function DesignPage({params}: Props) {
  const {designId} = await params;
  return (
    <PageShell eyebrow="Explore" title={`디자인 ${designId}`} lead="이 디자인의 미리보기와 설정이 여기에 표시됩니다.">
      <Link href="/explore" className="btn btn-quiet">Explore로 돌아가기</Link>
    </PageShell>
  );
}
