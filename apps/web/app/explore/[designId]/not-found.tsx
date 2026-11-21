import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: '디자인을 찾을 수 없음'};

export default function DesignNotFound() {
  return (
    <PageShell eyebrow="404" title="이 디자인을 찾을 수 없습니다" lead="주소의 디자인 ID가 Explore의 대표 목록에 없습니다. 목록에서 다시 고르거나, 직접 만들려면 Studio를 여세요.">
      <div className="btn-row">
        <Link href="/explore" className="btn">Explore 목록</Link>
        <Link href="/studio" className="btn btn-quiet">Studio 열기</Link>
      </div>
    </PageShell>
  );
}
