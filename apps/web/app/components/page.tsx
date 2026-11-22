import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {componentRows, componentView, groupLabel} from '@/features/components/spec.server';
import styles from '@/features/components/components.module.css';

export const metadata = {title: 'Components'};

export default function ComponentsPage() {
  const rows = componentRows().filter(r => r.type !== 'page');
  const groups = [...new Set(rows.map(r => r.group))];
  return (
    <PageShell eyebrow="Components" title="부품 카탈로그" lead="페이지를 이루는 부품입니다. 각 부품의 렌더 결과와 변형, 받는 속성, 놓을 수 있는 자리를 카탈로그에서 그대로 읽어 보여 줍니다.">
      <div className={styles.groups}>
        {groups.map(group => (
          <section key={group} aria-labelledby={`g-${group}`}>
            <h2 id={`g-${group}`} className={styles.groupTitle}>{groupLabel(group)}</h2>
            <ul className={styles.grid}>
              {rows.filter(r => r.group === group).map(r => {
                const view = componentView(r.type)!;
                return (
                  <li key={r.type} className={styles.card}>
                    <Link href={`/components/${r.type}`} className={styles.link}>
                      {view.example ? <Thumb src={`/components/${r.type}/render`} title={`${r.label} 렌더 결과`} /> : <div className={styles.textOnly} />}
                      <h3 className={styles.title}>{r.label}</h3>
                      <p className={styles.meta}><code>{r.type}</code>{r.since ? ` · ${r.since} · ${view.material?.kind} · ${view.material?.category} · 맥락 ${view.material?.contexts.join(', ')} · 재료 변형 ${view.variantGroups.length}축` : ''}{view.variants.length ? ` · 변형 ${view.variants.length}` : ''}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
