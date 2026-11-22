import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {Thumb} from '@/features/explore/Thumb';
import {Unavailable} from '@/features/platform/Unavailable';
import {assembleDesign, material, materials, platformReady, recommend} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {writeState} from '@/features/platform/assemble-state';
import {PURPOSES, first, purposeOf, shortId} from '@/features/platform/labels';
import {SAMPLES} from '@/features/platform/samples';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: '표면·모션·상태 | Materials', description: '스타일 맥락을 같은 페이지에 나란히 적용해 표면, 모션, 모서리, 배경의 차이를 실제 화면으로 비교합니다.'};
type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};

export default async function StylesPage({searchParams}: Props) {
  const sp = await searchParams;
  if (!platformReady()) return <PageShell eyebrow="Materials" title="표면·모션·상태"><MaterialsNav current="styles" /><Unavailable what="스타일 맥락 비교" /></PageShell>;
  const purpose = purposeOf(first(sp.purpose)) ?? PURPOSES[0];
  const all = materials('style-context');
  const asked = (first(sp.with) ?? '').split(',').filter(x => /^[a-z0-9-]+$/.test(x));
  // 기본 비교 대상: 이 페이지 유형에 맞는 맥락 중 추천 순위 앞쪽 셋
  const ranked = recommend({kind: 'style-context', context: purpose.context});
  const defaults = ranked.ok ? ranked.value.ranked.slice(0, 3).map(r => shortId(r.id)) : [];
  const chosen = (asked.length ? asked : defaults).map(id => material(`style-context:${id}`)).filter((m): m is NonNullable<typeof m> => !!m).slice(0, 4);
  const fitting = all.filter(m => (m.contexts ?? []).includes(purpose.context));
  const q = (patch: {purpose?: string; with?: string[]}) => {
    const p = new URLSearchParams();
    const pu = patch.purpose ?? purpose.id;
    if (pu !== PURPOSES[0].id) p.set('purpose', pu);
    const w = patch.with ?? (asked.length ? asked : []);
    if (w.length) p.set('with', w.join(','));
    const s = p.toString();
    return `/materials/styles${s ? `?${s}` : ''}`;
  };
  const current = chosen.map(m => shortId(m.id));
  const toggle = (id: string) => (current.includes(id) ? current.filter(x => x !== id) : [...current, id].slice(-4));
  const content = purpose.id === 'editorial-docs' ? SAMPLES.doc.content : purpose.id === 'work-dashboard' ? SAMPLES.dash.content : undefined;
  return (
    <PageShell eyebrow="Materials" title="표면·모션·상태" lead="스타일 맥락은 모서리, 그림자, 모션, 배경, 셸의 선호를 한 묶음으로 정합니다. 같은 페이지에 맥락만 바꿔 적용해 차이를 비교하세요.">
      <MaterialsNav current="styles" />
      <div className={styles.toolbar}>
        <div className={styles.seg} role="group" aria-label="페이지 유형">
          {PURPOSES.map(p => <Link key={p.id} href={q({purpose: p.id, with: []})} replace scroll={false} className={styles.segItem} aria-current={p.id === purpose.id ? 'true' : undefined}>{p.label}</Link>)}
        </div>
      </div>
      <p className={styles.meta}>{purpose.label}에 맞는 스타일 맥락 {fitting.length}개 중 최대 4개를 골라 비교합니다.</p>
      <ul className={styles.chips} aria-label="비교할 스타일 맥락">
        {fitting.map(m => <li key={m.id}><Link href={q({with: toggle(shortId(m.id))})} replace scroll={false} aria-current={current.includes(shortId(m.id)) ? 'true' : undefined}>{m.label}</Link></li>)}
      </ul>
      <ul className={styles.grid} data-cols="3" data-testid="style-grid" style={{marginTop: 'var(--space-5)'}}>
        {chosen.map(m => {
          const request = {purpose: purpose.id, styleContext: m.id, ...(content ? {content} : {}), candidates: 1};
          const probe = assembleDesign(request);
          const mood = (m.mood as string[] | undefined) ?? [];
          return (
            <li key={m.id} className={styles.cell} data-style={shortId(m.id)}>
              <h3>{m.label}</h3>
              {probe.ok ? <Thumb src={renderSrc(request)} title={`${m.label} 스타일 맥락의 ${purpose.label}`} /> : <p className="note" role="status">{probe.errors.map(e => e.message).join(' ')}</p>}
              {mood.length ? <p className={styles.meta}>{mood.join(' · ')}</p> : null}
              {probe.ok ? <ul className={styles.reasons}>{(probe.value.decisions ?? []).filter(d => d.source === 'style-context').slice(0, 3).map(d => <li key={d.slot}>{d.slot}: {shortId(String(d.id))}</li>)}</ul> : null}
              {probe.ok ? <Link className={styles.chipLink} href={writeState({purpose: purpose.id, style: shortId(m.id), step: 'compare'})}>Studio에서 쓰기</Link> : null}
            </li>
          );
        })}
      </ul>

      <h2 className="section-title">표면·모션·배경·상태 패턴</h2>
      <p className="prose">표면 5, 모션 4, 배경 5, 미디어 6, 상태 패턴 8개 재료는 스타일 맥락이 고르는 값으로 위 화면에 이미 적용되어 있습니다. 재료 하나만 따로 렌더해 보는 화면은 조립 서비스가 재료 단위 조립을 공개하면 연결됩니다.</p>
      <div className="note" data-testid="style-materials-pending"><p>서비스 대기: 표면·모션·배경·미디어·상태 패턴을 단독 조립하는 함수(<code>assembleStyleMaterials</code>)와 재료 목록이 Core 서비스에 없습니다. 웹은 이 재료의 마크업을 직접 만들지 않습니다.</p></div>
    </PageShell>
  );
}
