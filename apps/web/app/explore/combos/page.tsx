import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: '전체 조합'};

// 옛 /combos/?쿼리 가 308 로 오는 자리. 쿼리 해석과 목록은 Explore 트랙이 채운다.
export default function CombosPage() {
  return (
    <PageShell eyebrow="Explore" title="전체 조합" lead="템플릿과 슬롯 변형을 조합한 결과를 비교하는 화면입니다.">
      <p className="note">전체 조합 목록은 이 화면으로 옮겨 오는 중입니다. 그동안 조합 하나는 <code>/combos/render.html?c=조합id</code> 주소로 전체 화면에서 열 수 있습니다.</p>
      <p><Link href="/explore">Explore로 돌아가기</Link></p>
    </PageShell>
  );
}
