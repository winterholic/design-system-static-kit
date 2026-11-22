import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {Thumb} from '@/features/explore/Thumb';
import {Unavailable} from '@/features/platform/Unavailable';
import {assembleDesign, material, materials, platformReady, probeDesign, recommend} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {writeState} from '@/features/platform/assemble-state';
import {PURPOSES, first, purposeOf, shortId} from '@/features/platform/labels';
import {SAMPLES} from '@/features/platform/samples';
import styles from '@/features/platform/platform.module.css';
import type {Material} from '@/features/platform/types';

const OTHER_KINDS = [
  {id: 'surface', label: '표면', key: 'surface'}, {id: 'motion', label: '모션', key: 'motion'}, {id: 'background', label: '배경', key: 'background'},
  {id: 'media', label: '미디어', key: 'media'}, {id: 'state-pattern', label: '상태 패턴', key: 'states'},
] as const;
const STATE_SLOTS = ['empty', 'loading', 'error', 'success'];

const studioPatch = (purpose: string, kind: string, m: Material) => ({
  purpose, step: 'swap' as const,
  ...(kind === 'state-pattern' ? {spat: `${(m.tags ?? []).find(t => STATE_SLOTS.includes(t)) ?? 'empty'}.${shortId(m.id)}`} : {[kind]: shortId(m.id)}),
});

/** 표면·모션·배경·미디어·상태 패턴 재료를 같은 페이지에 하나씩 적용한 결과. 조립 요청의 해당 키에 재료 id 를 그대로 넣는다. */
function OtherMaterials({purposeId, kind, content, hrefFor}: {purposeId: string; kind: string; content?: Record<string, unknown>; hrefFor: (kind: string) => string}) {
  const spec = OTHER_KINDS.find(k => k.id === kind)!;
  const items = materials(kind);
  const requestFor = (m: Material) => {
    const extra = kind === 'state-pattern' ? {states: {[(m.tags ?? []).find(t => STATE_SLOTS.includes(t)) ?? 'empty']: m.id}} : {[spec.key]: m.id};
    return {purpose: purposeId, ...extra, ...(content ? {content} : {}), candidates: 1};
  };
  return (
    <section id="other" aria-labelledby="other-title" data-testid="other-materials">
      <h2 className="section-title" id="other-title">표면·모션·배경·미디어·상태 패턴</h2>
      <p className="prose">스타일 맥락이 고르는 값을 하나씩 직접 골라 같은 페이지에 적용한 결과입니다. 이 페이지 유형이나 맥락과 맞지 않는 재료는 이유와 함께 보입니다.</p>
      <ul className={styles.chips} aria-label="재료 종류">{OTHER_KINDS.map(k => <li key={k.id}><Link href={hrefFor(k.id)} replace scroll={false} aria-current={k.id === kind ? 'true' : undefined}>{k.label}</Link></li>)}</ul>
      <ul className={styles.grid} data-cols="3" style={{marginTop: 'var(--space-4)'}}>
        {items.map(m => {
          const request = requestFor(m);
          const probe = probeDesign(request as never);
          return (
            <li key={m.id} className={styles.cell} data-material={shortId(m.id)}>
              <h3>{m.label}</h3>
              {probe.ok ? <Thumb src={renderSrc(request as never)} title={`${m.label} 적용`} /> : <p className="note" role="status">{probe.reason}</p>}
              <p className={styles.meta}>맥락 {(m.contexts ?? []).join(', ')}</p>
              {probe.ok ? <Link className={styles.chipLink} href={writeState(studioPatch(purposeId, kind, m))}>Studio에서 쓰기</Link> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const metadata = {title: '표면·모션·상태 | Materials', description: '스타일 맥락을 같은 페이지에 나란히 적용해 표면, 모션, 모서리, 배경의 차이를 실제 화면으로 비교합니다.'};
type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};

export default async function StylesPage({searchParams}: Props) {
  const sp = await searchParams;
  const kindAsked = first(sp.kind);
  const kind = (OTHER_KINDS.find(k => k.id === kindAsked) ?? OTHER_KINDS[0]).id;
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

      <OtherMaterials purposeId={purpose.id} kind={kind} content={content} hrefFor={k => `/materials/styles?${new URLSearchParams({...(purpose.id !== PURPOSES[0].id ? {purpose: purpose.id} : {}), ...(asked.length ? {with: asked.join(',')} : {}), kind: k})}#other`} />
    </PageShell>
  );
}
