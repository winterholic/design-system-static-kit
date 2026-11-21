import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'Docs'};

// 아래 6개는 생성된 정적 문서(/docs/*.html). Docs 트랙이 같은 내용을 /docs/<slug> 로 옮기면 이 목록을 새 경로로 바꾼다.
const GENERATED_DOCS = [
  {file: 'design.html', title: '설계 개요', note: '카탈로그와 컴파일러의 설계'},
  {file: 'layout.html', title: '레이아웃', note: '구성 규칙과 슬롯 변형'},
  {file: 'typography.html', title: '타이포그래피', note: '서체와 글자 위계 규칙'},
  {file: 'spacing.html', title: '간격', note: '간격 단위와 밀도'},
  {file: 'palettes.html', title: '팔레트', note: '팔레트와 대비 검증'},
] as const;

export default function DocsPage() {
  return (
    <PageShell eyebrow="Docs" title="문서" lead="디자인 규약과 도구 사용법을 읽습니다.">
      <ul className="link-list">
        {GENERATED_DOCS.map(d => <li key={d.file}><a href={`/docs/${d.file}`}>{d.title}</a><span>{d.note}</span></li>)}
      </ul>
    </PageShell>
  );
}
