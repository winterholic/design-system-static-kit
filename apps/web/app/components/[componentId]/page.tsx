import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ComponentDetailTabs} from '@/features/components/ComponentDetailTabs';
import {componentRows, componentView} from '@/features/components/spec.server';
import styles from '@/features/components/components.module.css';

type Props = {params: Promise<{componentId: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>};

export function generateStaticParams() {
  return componentRows().map(row => ({componentId: row.type}));
}

export async function generateMetadata({params}: Props) {
  const view = componentView((await params).componentId);
  return {title: view ? `${view.label} 부품` : '부품을 찾을 수 없음'};
}

export default async function ComponentPage({params, searchParams}: Props) {
  const {componentId} = await params;
  const query = await searchParams;
  const view = componentView(componentId);
  if (!view) notFound();

  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const requestedTab = first(query.tab) ?? 'overview';
  const initialTab = ['overview', 'variants', 'states', 'sizes', 'playground', 'tokens', 'code', 'accessibility', 'composition'].includes(requestedTab) ? requestedTab : 'overview';
  const initialSelection = Object.fromEntries(view.variantGroups.map(group => {
    const asked = first(query[group.name]);
    const selected = group.values.find(value => String(value) === asked) ?? group.defaultValue;
    return [group.name, selected];
  }));
  if (view.material?.states.values.length) initialSelection.state ??= view.material.states.values[0];
  Object.assign(initialSelection, view.playground.defaults, {viewport: first(query.viewport) === '390' ? '390' : '1280'});
  const textField = Object.entries(view.example ?? {}).find(([key, value]) => !['type', 'id'].includes(key) && typeof value === 'string');
  const requestedContent = first(query.content);
  initialSelection.content = requestedContent && requestedContent.length <= 200 ? requestedContent : String(textField?.[1] ?? '');
  for (const axis of ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode'] as const) {
    const asked = first(query[axis]);
    const option = view.playground.axes[axis].find(item => item.value === asked && item.ok);
    if (option) initialSelection[axis] = option.value;
  }

  return <div className="page">
    <p className={styles.crumb}><Link href="/components">Components</Link> / {view.groupLabel}</p>
    <div className={styles.head}>
      <h1 className="page-title">{view.label}</h1>
      <p className={styles.sub}><code>{view.type}</code></p>
    </div>
    <ComponentDetailTabs view={view} initialTab={initialTab} initialSelection={initialSelection} />
  </div>;
}
