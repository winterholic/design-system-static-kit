import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'Explore'};

export default function ExplorePage() {
  return (
    <PageShell eyebrow="Explore" title="디자인 둘러보기" lead="템플릿과 테마가 만든 결과물을 비교하고, 마음에 드는 것을 Studio에서 이어 편집합니다.">
      <h2 className="section-title">지금 볼 수 있는 것</h2>
      <ul className="link-list">
        <li><Link href="/explore/combos">전체 조합</Link><span>템플릿 × 슬롯 변형 조합을 한 곳에서 비교합니다 (이전 /combos/ 주소가 여기로 옵니다)</span></li>
        <li><a href="/gallery/index.html">오프라인 갤러리</a><span>컴파일러가 들어 있는 단일 HTML 파일. 내려받아 오프라인에서 씁니다</span></li>
        <li><a href="/examples/saas-landing/">saas-landing 예제</a><span>템플릿 기본 출력 하나를 그대로 엽니다</span></li>
      </ul>
    </PageShell>
  );
}
