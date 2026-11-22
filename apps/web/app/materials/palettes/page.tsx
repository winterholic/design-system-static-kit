import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {Unavailable} from '@/features/platform/Unavailable';
import {materials, platformReady, recommend} from '@/features/platform/platform.server';
import {SEED_ROLES, shortId} from '@/features/platform/labels';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: '팔레트 | Materials', description: '팔레트를 고르면 어울리는 서브토큰 세트를 같은 화면에 나란히 적용해 비교합니다.'};

export default function PalettesPage() {
  const ready = platformReady();
  const palettes = ready ? materials('palette') : [];
  const total = ready ? materials('subtoken-set').length : 0;
  return (
    <PageShell eyebrow="Materials" title="팔레트" lead="팔레트를 고르면 쓸 수 있는 서브토큰 세트가 같은 화면에 나란히 적용됩니다. 대비 검사를 통과하지 못하는 세트는 이유와 함께 따로 보여 줍니다.">
      <MaterialsNav current="palettes" />
      {!ready ? <Unavailable what="팔레트 비교" /> : (
        <>
          <ul className={styles.cards} aria-label="팔레트 목록">
            {palettes.map(p => {
              const fit = recommend({kind: 'subtoken-set', selected: [p.id]});
              const ok = fit.ok ? fit.value.ranked.length : null;
              return (
                <li key={p.id}>
                  <Link href={`/materials/palettes/${shortId(p.id)}`} className={styles.paletteCard}>
                    <span className={styles.swatches} aria-hidden="true">{SEED_ROLES.map(([role]) => p.seeds?.[role] ? <i key={role} style={{background: p.seeds[role]}} /> : null)}</span>
                    <strong>{p.label}</strong>
                    <span className={styles.meta}>{ok === null ? '' : `세트 ${total}개 중 ${ok}개가 어울림`}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <h2 className="section-title">내 색으로 시험하기</h2>
          <p className="prose">원하는 색을 hex 로 넣으면 어떤 세트가 맞고 어떤 세트가 왜 맞지 않는지 보여 줍니다. 입력한 색은 저장하지 않습니다.</p>
          <Link href="/materials/palettes/custom" className={styles.chipLink}>hex 색 넣어 보기</Link>
        </>
      )}
    </PageShell>
  );
}
