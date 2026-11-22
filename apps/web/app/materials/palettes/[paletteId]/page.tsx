import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {Thumb} from '@/features/explore/Thumb';
import {ModeSwitch} from '@/features/platform/ModeSwitch';
import {Unavailable} from '@/features/platform/Unavailable';
import {assembleDesign, material, materials, platformReady, recommend} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {writeState} from '@/features/platform/assemble-state';
import {MODE_LABEL, SEED_ROLES, readMode, shortId} from '@/features/platform/labels';
import type {AssembleRequest, Ranked} from '@/features/platform/types';
import styles from '@/features/platform/platform.module.css';

type Props = {params: Promise<{paletteId: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>};
const text = (r: Ranked['reasons']) => r.map(x => x.reason).filter(Boolean) as string[];

export async function generateMetadata({params}: Props) {
  const id = `palette:${(await params).paletteId}`;
  return {title: `${platformReady() ? material(id)?.label ?? '팔레트' : '팔레트'} | Materials`};
}

export default async function PalettePage({params, searchParams}: Props) {
  const {paletteId} = await params;
  const sp = await searchParams;
  if (!platformReady()) return <PageShell eyebrow="Materials" title="팔레트"><MaterialsNav current="palettes" /><Unavailable what="팔레트 비교" /></PageShell>;
  const id = `palette:${paletteId}`;
  const palette = material(id);
  if (!palette) notFound();
  const mode = readMode(sp.mode);
  const sets = materials('subtoken-set');
  const label = (m: string) => materials(m.split(':')[0]).find(x => x.id === m)?.label ?? shortId(m);

  const fit = recommend({kind: 'subtoken-set', selected: [id]});
  const ranked = fit.ok ? fit.value.ranked : [];
  const blocked = fit.ok ? fit.value.blocked : [];
  // 세트마다 같은 페이지·같은 서체로 조립해 색 차이만 보이게 한다. 서체는 이 팔레트와 어울리는 1순위를 한 번 정해 모두에 쓴다.
  const typeFit = recommend({kind: 'type-system', selected: [id], context: 'landing', fit: true});
  const type = typeFit.ok ? typeFit.value.ranked[0]?.id : undefined;
  const requestFor = (setId: string): AssembleRequest => ({purpose: 'saas-landing', palette: id, subtokenSet: setId, ...(type ? {typeSystem: type} : {}), mode, candidates: 1});
  const cells = sets.map(set => {
    const rank = ranked.find(r => r.id === set.id);
    const block = blocked.find(b => b.id === set.id);
    const probe = rank ? assembleDesign(requestFor(set.id)) : null;
    const failed = probe && !probe.ok ? probe.errors.map(e => `${e.code}: ${e.message}`) : null;
    return {set, rank, block, failed};
  });
  const shown = cells.filter(c => c.rank && !c.failed);
  const rejected = cells.filter(c => !c.rank || c.failed);

  const sysFit = recommend({kind: 'type-system', selected: [id], fit: true});
  const styleFit = recommend({kind: 'style-context', selected: [id]});
  const topSet = shown[0]?.set.id;
  const href = (m: string) => `/materials/palettes/${paletteId}?mode=${m}`;

  return (
    <PageShell eyebrow="Materials · 팔레트" title={palette.label} lead="같은 페이지에 서브토큰 세트만 바꿔 적용한 결과입니다. 색 이외의 재료(서체, 구성)는 모두 같습니다.">
      <MaterialsNav current="palettes" />
      <div className={styles.toolbar}>
        <ModeSwitch current={mode} href={href} />
        <span className={styles.meta}>{MODE_LABEL[mode]} 모드 · 세트 {sets.length}개 중 {shown.length}개 적용 가능</span>
        <Link href={writeState({purpose: 'saas-landing', palette: shortId(id), set: topSet ? shortId(topSet) : null, type: type ? shortId(type) : null, mode, step: 'swap'})} className={styles.chipLink}>Studio에서 쓰기</Link>
      </div>
      <ul className={styles.swatches} style={{listStyle: 'none', padding: 0, margin: '0 0 var(--space-5)'}} aria-label="원본 색">
        {SEED_ROLES.map(([role, name]) => palette.seeds?.[role] ? <li key={role} className={styles.hex}><i style={{display: 'inline-block', width: 18, height: 18, borderRadius: 3, background: palette.seeds[role], border: '1px solid rgb(0 0 0 / .12)'}} />{name} {palette.seeds[role]}</li> : null)}
      </ul>

      <h2 className="section-title">서브토큰 세트 비교</h2>
      <ul className={styles.grid} data-cols="3" data-testid="set-grid">
        {shown.map(({set, rank}) => (
          <li key={set.id} className={styles.cell} data-set={shortId(set.id)}>
            <h3>{set.label}</h3>
            <div className={styles.pair}>
              <Thumb src={renderSrc(requestFor(set.id))} title={`${palette.label} × ${set.label} ${MODE_LABEL[mode]} 페이지`} />
              <Thumb src={renderSrc({context: 'landing', mode, palette: id, subtokenSet: set.id, ...(type ? {typeSystem: type} : {}), items: [
                {purpose: 'purpose:card.pricing', visual: 'family:soft', content: {plan: '팀', price: '₩29,000', period: '월 / 사용자', features: ['무제한 프로젝트', '역할 기반 권한'], ctaLabel: '시작하기'}},
              ]}, {kind: 'components'})} title={`${set.label} 카드와 버튼`} width={480} height={640} />
            </div>
            {rank && rank.reasons.length ? <ul className={styles.reasons}>{text(rank.reasons).map(r => <li key={r}>{r}</li>)}</ul> : <p className={styles.meta}>이 팔레트에 대한 추천 근거는 없지만 대비 검사를 통과합니다.</p>}
          </li>
        ))}
      </ul>

      {rejected.length ? (
        <>
          <h2 className="section-title">적용할 수 없는 세트</h2>
          <ul className={styles.rejected} data-testid="rejected-sets">
            {rejected.map(({set, block, failed}) => (
              <li key={set.id} data-set={shortId(set.id)}>
                <strong>{set.label}</strong>
                {(block?.blocked ?? []).map(b => <span key={b.reason}>{b.reason}</span>)}
                {(failed ?? []).map(f => <span key={f}>{f}</span>)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="section-title">어울리는 재료</h2>
      <div className={styles.grid}>
        <section aria-labelledby="reco-type">
          <h3 id="reco-type" className={styles.cell}>서체(타이포 시스템)</h3>
          <ul className={styles.recoList}>
            {(sysFit.ok ? sysFit.value.ranked.slice(0, 3) : []).map(r => <li key={r.id}><Link href={`/materials/typography?with=${shortId(r.id)}`}>{label(r.id)}</Link><span>{text(r.reasons).join(' · ') || '이 팔레트와 충돌하지 않습니다.'}</span></li>)}
          </ul>
        </section>
        <section aria-labelledby="reco-style">
          <h3 id="reco-style" className={styles.cell}>스타일 맥락</h3>
          <ul className={styles.recoList}>
            {(styleFit.ok ? styleFit.value.ranked.slice(0, 3) : []).map(r => <li key={r.id}><Link href={`/materials/styles?with=${shortId(r.id)}`}>{label(r.id)}</Link><span>{text(r.reasons).join(' · ') || '이 팔레트와 충돌하지 않습니다.'}</span></li>)}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
