import Link from 'next/link';
import {notFound} from 'next/navigation';
import {connection} from 'next/server';
import {ComponentDetailTabs} from '@/features/components/ComponentDetailTabs';
import {componentRows, componentView} from '@/features/components/spec.server';
import styles from '@/features/components/components.module.css';

type Props = {params: Promise<{componentId: string}>};

export function generateStaticParams() {
  return componentRows().map(row => ({componentId: row.type}));
}

export async function generateMetadata({params}: Props) {
  const view = componentView((await params).componentId);
  return {title: view ? `${view.label} 부품` : '부품을 찾을 수 없음'};
}

export default async function ComponentPage({params}: Props) {
  // 탭·선택은 클라이언트가 URL에서 읽는다. 직접 열기에서도 첫 HTML이 URL의 탭을 쓰도록 요청마다 렌더한다.
  await connection();
  const {componentId} = await params;
  const view = componentView(componentId);
  if (!view) notFound();

  return <div className="page">
    <p className={styles.crumb}><Link href="/components">Components</Link> / {view.groupLabel}</p>
    <div className={styles.head}>
      <h1 className="page-title">{view.label}</h1>
      <p className={styles.sub}><code>{view.type}</code></p>
    </div>
    <ComponentDetailTabs view={view} />
  </div>;
}
