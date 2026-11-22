import Link from 'next/link';
import {Thumb} from '@/features/explore/Thumb';
import {assembleDesign, material, materials} from './platform.server';
import {renderSrc} from './render-url';
import {SAMPLES, type SampleId} from './samples';
import {shortId} from './labels';
import {writeState} from './assemble-state';
import styles from './platform.module.css';

const WIDTHS = [{id: 1280, label: '데스크톱 1280', h: 800}, {id: 390, label: '모바일 390', h: 844}] as const;
export type TypeQuery = {with: string[]; sample: SampleId; width: 390 | 1280; mode: 'light' | 'dark'};

const href = (q: TypeQuery, patch: Partial<TypeQuery>) => {
  const n = {...q, ...patch}, p = new URLSearchParams();
  if (n.with.length) p.set('with', n.with.join(','));
  if (n.sample !== 'doc') p.set('sample', n.sample);
  if (n.width !== 1280) p.set('width', String(n.width));
  if (n.mode !== 'light') p.set('mode', n.mode);
  const s = p.toString();
  return `/materials/typography${s ? `?${s}` : ''}#compare`;
};

/** 타이포 시스템 비교: 같은 한영 혼용 샘플을 시스템마다 조립해 나란히 놓는다. 맥락이 맞지 않는 조합은 Core 가 낸 이유를 보인다. */
export function TypeCompare({query}: {query: TypeQuery}) {
  const all = materials('type-system');
  const chosen = query.with.map(id => material(`type-system:${id}`)).filter((m): m is NonNullable<typeof m> => !!m).slice(0, 4);
  const sample = SAMPLES[query.sample];
  const toggle = (id: string) => query.with.includes(id) ? query.with.filter(x => x !== id) : [...query.with, id].slice(-4);
  const w = WIDTHS.find(x => x.id === query.width)!;
  return (
    <section id="compare" aria-labelledby="type-compare-title" data-testid="type-compare">
      <h2 className="section-title" id="type-compare-title">타이포 시스템 비교</h2>
      <p className="prose">같은 {sample.label} 샘플(한글·영문·숫자·코드 혼용)을 시스템마다 조립합니다. 최대 4개를 골라 나란히 보세요.</p>
      <div className={styles.toolbar}>
        <div className={styles.seg} role="group" aria-label="샘플">
          {(Object.keys(SAMPLES) as SampleId[]).map(s => <Link key={s} href={href(query, {sample: s})} replace scroll={false} className={styles.segItem} aria-current={s === query.sample ? 'true' : undefined}>{SAMPLES[s].label} 샘플</Link>)}
        </div>
        <div className={styles.seg} role="group" aria-label="화면 폭">
          {WIDTHS.map(x => <Link key={x.id} href={href(query, {width: x.id})} replace scroll={false} className={styles.segItem} aria-current={x.id === query.width ? 'true' : undefined}>{x.label}</Link>)}
        </div>
        <div className={styles.seg} role="group" aria-label="색 모드">
          {(['light', 'dark'] as const).map(m => <Link key={m} href={href(query, {mode: m})} replace scroll={false} className={styles.segItem} aria-current={m === query.mode ? 'true' : undefined}>{m === 'dark' ? '다크' : '라이트'}</Link>)}
        </div>
      </div>
      <ul className={styles.chips} aria-label="비교할 시스템">
        {all.map(t => <li key={t.id}><Link href={href(query, {with: toggle(shortId(t.id))})} replace scroll={false} aria-current={query.with.includes(shortId(t.id)) ? 'true' : undefined}>{t.label}</Link></li>)}
      </ul>
      {chosen.length ? (
        <ul className={styles.grid} data-cols={chosen.length > 2 ? '3' : '2'} data-testid="type-grid" style={{marginTop: 'var(--space-5)'}}>
          {chosen.map(t => {
            const request = {purpose: sample.purpose, content: sample.content, typeSystem: t.id, mode: query.mode, candidates: 1};
            const probe = assembleDesign(request);
            return (
              <li key={t.id} className={styles.cell} data-system={shortId(t.id)}>
                <h3>{t.label}</h3>
                {probe.ok
                  ? <Thumb src={renderSrc(request)} title={`${t.label} ${sample.label} 샘플 ${w.label}`} width={w.id} height={w.h} />
                  : <p className="note" role="status">{probe.errors.map(e => e.message).join(' ')}</p>}
                <p className={styles.meta}>맥락: {(t.contexts ?? []).join(', ')}</p>
                {probe.ok ? <Link className={styles.chipLink} href={writeState({purpose: sample.purpose, type: shortId(t.id), mode: query.mode, step: 'swap'})}>Studio에서 쓰기</Link> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="note">비교할 시스템을 위에서 골라 주세요.</p>}
    </section>
  );
}
