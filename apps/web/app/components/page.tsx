import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {componentRows, componentSummary, groupLabel, type ComponentSummary} from '@/features/components/spec.server';
import styles from '@/features/components/components.module.css';
import {Unavailable} from '@/features/platform/Unavailable';
import {platformReady, purposeFamilies} from '@/features/platform/platform.server';
import type {PurposeList} from '@/features/platform/types';
import {renderSrc} from '@/features/platform/render-url';
import {shortId} from '@/features/platform/labels';
import {filterItems, groupKey, paginate, readQuery, runsOf, writeQuery, type ComponentsQuery, type ListItem} from '@/features/components/list-query';
import {Button, ButtonLink} from '@/ui';

const GROUP_LABEL: Record<string, string> = {card: '카드', button: '버튼', navigation: '내비게이션', form: '입력 양식', table: '표', feedback: '피드백'};

export const metadata = {title: 'Components'};

type Purpose = PurposeList['items'][number];
type Run = ReturnType<typeof runsOf<Card>>[number];
type PurposeCard = ListItem & {kind: 'purpose'; family: Purpose};
type PartCard = ListItem & {kind: 'part'; type: string; label: string; since?: string; view: ComponentSummary};
type Card = PurposeCard | PartCard;

type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function ComponentsPage({searchParams}: Props) {
  const sp = await searchParams;
  const ready = platformReady();
  const purposes = ready ? purposeFamilies() : null;
  const rows = componentRows().filter(r => r.type !== 'page');

  // 목록 전체(목적 패밀리 → 구조 부품)를 가볍게 만들어 두고, 검색·분류를 건 뒤 한 쪽 분량만 카드로 그린다. 숨은 카드는 DOM 에 만들지 않는다.
  const cards: Card[] = [];
  const purposeGroups: string[] = purposes?.ok ? purposes.value.groups : [];
  if (purposes?.ok) {
    for (const group of purposeGroups) {
      for (const family of purposes.value.items.filter(f => f.group === group)) {
        cards.push({kind: 'purpose', group, id: family.id, family, words: [family.id, family.label, family.purpose, group, GROUP_LABEL[group], family.contexts.join(' ')].filter(Boolean).join(' ')});
      }
    }
  }
  const partGroups = [...new Set(rows.map(r => r.group))];
  for (const group of partGroups) {
    for (const r of rows.filter(x => x.group === group)) {
      const view = componentSummary(r.type);
      if (!view) continue;
      cards.push({kind: 'part', group, id: r.type, type: r.type, label: r.label, since: r.since, view, words: [r.type, r.label, groupLabel(group), group, view.material?.category, view.material?.kind, view.material?.contexts.join(' ')].filter(Boolean).join(' ')});
    }
  }

  const groupOptions = [
    ...purposeGroups.map(g => ({value: groupKey('purpose', g), label: `${GROUP_LABEL[g] ?? g} (목적별)`})),
    ...partGroups.map(g => ({value: groupKey('part', g), label: `${groupLabel(g)} (구조 부품)`})),
  ];
  const query = readQuery({get: name => first(sp[name])}, groupOptions.map(o => o.value));
  const found = filterItems(cards, query);
  const view = paginate(found, query.page);
  const href = (page: number) => { const qs = writeQuery({...query, page}); return qs ? `/components?${qs}` : '/components'; };
  const runs = runsOf(view.items);
  const countIn = (kind: Card['kind'], group: string) => found.filter(c => c.kind === kind && c.group === group).length;
  const active = !!(query.q || query.group);
  const firstPart = runs.findIndex(r => r.kind === 'part');

  return (
    <PageShell eyebrow="Components" title={ready ? '컴포넌트' : '부품 카탈로그'} lead={ready ? '목적별 컴포넌트를 시각 패밀리로 바꿔 보고, 상태·크기·콘텐츠를 바꾸며 코드로 가져갑니다. 아래에는 페이지를 이루는 구조 부품 카탈로그가 이어집니다.' : '페이지를 이루는 부품입니다. 각 부품의 렌더 결과와 변형, 받는 속성, 놓을 수 있는 자리를 카탈로그에서 그대로 읽어 보여 줍니다.'}>
      <form className={styles.bar} role="search" aria-label="컴포넌트 찾기" method="get" action="/components">
        <label className={styles.barField}>
          <span>검색</span>
          <input type="search" name="q" defaultValue={query.q} placeholder="이름, 분류, 종류" autoComplete="off" enterKeyHint="search" maxLength={80} />
        </label>
        <label className={styles.barField}>
          <span>분류</span>
          <select name="group" defaultValue={query.group}>
            <option value="">전체</option>
            {groupOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <Button type="submit" variant="primary">찾기</Button>
        {active ? <ButtonLink href="/components" variant="secondary">초기화</ButtonLink> : null}
        <p className={styles.count} role="status" aria-live="polite" data-testid="components-count" data-total={found.length}>
          {found.length ? `${found.length}개 중 ${view.from}–${view.to}번째` : '0개'}
        </p>
      </form>
      {purposes && !purposes.ok ? <Unavailable what="목적별 컴포넌트" requires={'listPlatformMaterials({kind: "family"}) 목적 패밀리 기록'} /> : null}
      {found.length === 0 ? (
        <div className={styles.empty}>
          <p>조건에 맞는 컴포넌트가 없습니다.</p>
          <ButtonLink href="/components" variant="secondary">필터 초기화</ButtonLink>
        </div>
      ) : null}
      <div className={styles.groups} data-testid="components-list">
        {runs.map((run: Run, index) => {
          if (run.kind === 'purpose') {
            return (
              <section key={`purpose-${run.group}`} aria-labelledby={`pf-${run.group}`} data-testid="purpose-families">
                <h2 id={`pf-${run.group}`} className={styles.groupTitle}>{GROUP_LABEL[run.group] ?? run.group} {countIn('purpose', run.group)}종</h2>
                <ul className={styles.grid}>
                  {(run.items as PurposeCard[]).map(({family: f}) => <PurposeCardView key={f.id} f={f} />)}
                </ul>
              </section>
            );
          }
          return (
            <div key={`part-${run.group}`}>
              {ready && index === firstPart ? <h2 className={styles.groupTitle} style={{marginTop: index === 0 ? 0 : 'var(--space-8)'}}>페이지 구조 부품</h2> : null}
              <section aria-labelledby={`g-${run.group}`}>
                <h2 id={`g-${run.group}`} className={styles.groupTitle}>{groupLabel(run.group)}</h2>
                <ul className={styles.grid}>
                  {(run.items as PartCard[]).map(p => <PartCardView key={p.type} p={p} />)}
                </ul>
              </section>
            </div>
          );
        })}
      </div>
      {view.pages > 1 ? (
        <nav className={styles.pager} aria-label="쪽 이동">
          <Link href={href(view.page - 1)} aria-disabled={view.page === 1} tabIndex={view.page === 1 ? -1 : undefined} rel="prev" prefetch={false}>이전</Link>
          <span>{view.page} / {view.pages}</span>
          <Link href={href(view.page + 1)} aria-disabled={view.page === view.pages} tabIndex={view.page === view.pages ? -1 : undefined} rel="next" prefetch={false}>다음</Link>
        </nav>
      ) : null}
    </PageShell>
  );
}

function PartCardView({p}: {p: PartCard}) {
  const {view} = p;
  return (
    <li className={styles.card}>
      <Link href={`/components/${p.type}`} className={styles.link} prefetch={false}>
        {view.hasExample ? <Thumb src={`/components/${p.type}/render`} preview={{kind: 'component', type: p.type, version: view.material?.version}} title={`${p.label} 렌더 결과`} /> : <div className={styles.textOnly} />}
        <h3 className={styles.title}>{p.label}</h3>
        <p className={styles.meta}><code>{p.type}</code>{p.since ? ` · ${p.since} · ${view.material?.kind} · ${view.material?.category} · 맥락 ${view.material?.contexts.join(', ')} · 재료 변형 ${view.variantGroupCount}축` : ''}{view.variantCount ? ` · 변형 ${view.variantCount}` : ''}</p>
      </Link>
    </li>
  );
}

function PurposeCardView({f}: {f: Purpose}) {
  const request = {context: f.contexts[0] === 'any' ? 'general' : f.contexts[0], mode: 'light', items: [{purpose: f.id, visual: 'family:soft', variant: f.example.variant, props: f.example.props, content: f.example.content}]};
  return (
    <li className={styles.card} data-purpose={shortId(f.id)}>
      <Link href={`/components/purpose/${f.group}/${f.id.split('.')[1]}`} className={styles.link} prefetch={false}>
        <Thumb src={renderSrc(request, {kind: 'components'})} preview={{kind: 'components', request}} title={`${f.label} 미리보기`} width={480} height={360} />
        <h3 className={styles.title}>{f.label}</h3>
        <p className={styles.meta}>{f.purpose.split('.')[0]}</p>
      </Link>
    </li>
  );
}
