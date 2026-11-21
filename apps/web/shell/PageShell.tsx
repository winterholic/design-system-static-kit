import type {ReactNode} from 'react';

// 각 화면이 같은 제목 위계와 폭 규칙을 쓰게 하는 껍데기. 기능 트랙은 children만 채운다.
export function PageShell({eyebrow, title, lead, children}: {eyebrow?: string; title: string; lead?: string; children?: ReactNode}) {
  return (
    <div className="page">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {lead ? <p className="page-lead">{lead}</p> : null}
      {children}
    </div>
  );
}
