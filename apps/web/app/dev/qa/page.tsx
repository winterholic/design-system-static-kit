import type {Metadata} from 'next';
import {PageShell} from '@/shell/PageShell';

// 내부 QA 진입점. 공개 메뉴에 두지 않고 검색 대상에서 뺀다(metadata + X-Robots-Tag + robots.txt).
export const metadata: Metadata = {title: 'QA', robots: {index: false, follow: false}};

const INTERNAL = [
  {href: '/test-lab/', title: 'Test Lab', note: '넓은 조합 시험 페이지 모음 (정적, noindex)'},
  {href: '/docs/diagnosis-round6.html', title: '진단 라운드 6', note: '내부 진단 문서 (정적)'},
  {href: '/gallery/index.html', title: '오프라인 갤러리', note: '컴파일러 내장 단일 파일'},
  {href: '/combos/render.html?c=saas-landing', title: '조합 렌더', note: '옛 render.html 계약 확인용'},
  {href: '/dev/ui', title: 'UI 부품', note: '공용 Select·Input·Button·Chip 상태 모음 (e2e가 쓰는 내부 화면)'},
  {href: '/dev/spike/', title: 'Core import 스파이크', note: 'S1~S5 재확인 (docs/dev/platform/04-web-spike.md)'},
] as const;

export default function QaPage() {
  return (
    <PageShell eyebrow="내부" title="QA 진입점" lead="공개 메뉴에 없는 내부 화면과 시험 증거로 가는 길입니다.">
      <ul className="link-list">
        {INTERNAL.map(i => <li key={i.href}><a href={i.href}>{i.title}</a><span>{i.note}</span></li>)}
      </ul>
    </PageShell>
  );
}
