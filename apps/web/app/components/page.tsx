import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {componentRows, componentView, groupLabel} from '@/features/components/spec.server';
import styles from '@/features/components/components.module.css';
import {Unavailable} from '@/features/platform/Unavailable';
import {platformReady, purposeFamilies} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {shortId} from '@/features/platform/labels';

const GROUP_LABEL: Record<string, string> = {card: '카드', button: '버튼', navigation: '내비게이션', form: '입력 양식', table: '표', feedback: '피드백'};

export const metadata = {title: 'Components'};

export default function ComponentsPage() {
  const rows = componentRows().filter(r => r.type !== 'page');
  const groups = [...new Set(rows.map(r => r.group))];
  return (
    <PageShell eyebrow="Components" title="컴포넌트" lead="목적별 컴포넌트를 시각 패밀리로 바꿔 보고, 상태·크기·콘텐츠를 바꾸며 코드로 가져갑니다. 아래에는 페이지를 이루는 구조 부품 카탈로그가 이어집니다.">
      {platformReady() ? <PurposeSection /> : <Unavailable what="목적별 컴포넌트" />}
      <h2 className={styles.groupTitle} style={{marginTop: 'var(--space-8)'}}>페이지 구조 부품</h2>
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

function PurposeSection() {
  const list = purposeFamilies();
  if (!list.ok) return <Unavailable what="목적별 컴포넌트" />;
  return (
    <div className={styles.groups} data-testid="purpose-families">
      {list.value.groups.map(group => (
        <section key={group} aria-labelledby={`pf-${group}`}>
          <h2 id={`pf-${group}`} className={styles.groupTitle}>{GROUP_LABEL[group] ?? group} {list.value.items.filter(f => f.group === group).length}종</h2>
          <ul className={styles.grid}>
            {list.value.items.filter(f => f.group === group).map(f => {
              const request = {context: f.contexts[0] === 'any' ? 'general' : f.contexts[0], mode: 'light', items: [{purpose: f.id, visual: 'family:soft', variant: f.example.variant, props: f.example.props, content: f.example.content}]};
              return (
                <li key={f.id} className={styles.card} data-purpose={shortId(f.id)}>
                  <Link href={`/components/purpose/${group}/${f.id.split('.')[1]}`} className={styles.link}>
                    <Thumb src={renderSrc(request, {kind: 'components'})} title={`${f.label} 미리보기`} width={480} height={360} />
                    <h3 className={styles.title}>{f.label}</h3>
                    <p className={styles.meta}>{f.purpose.split('.')[0]}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
