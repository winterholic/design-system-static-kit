import {PageShell} from '@/shell/PageShell';
import {ColorExplorer} from '@/features/materials/ColorExplorer';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {ModeCompare} from '@/features/materials/ModeCompare';
import {colorView} from '@/features/materials/materials.server';
import {studioForColor} from '@/features/materials/studio-link';
import {ButtonLink} from '@/ui';
import styles from '@/features/materials/materials.module.css';

export const metadata = {title: '색 · Materials', description: 'Static Kit 팔레트의 원본 시드, 50–950 램프, 역할·상태·부품 토큰을 검색하고 라이트와 다크로 비교합니다.'};

export default function ColorPage() {
  const view = colorView();
  const allPass = (list: {ratio: number; minimum: number}[]) => list.every(x => x.ratio >= x.minimum);
  return (
    <PageShell eyebrow="Materials · 색" title="Static Kit 색" lead={`원본 시드 ${view.seeds.length}개가 50–950 램프가 되고, 램프가 역할·상태·부품 토큰으로 이어집니다. 모든 값은 이 키트가 직접 정의한 것이며 라이트와 다크를 모두 대비 검사합니다.`}>
      <MaterialsNav current="color" />
      <div className={styles.actions}>
        <ButtonLink href={studioForColor()}>Studio에서 사용하기</ButtonLink>
        <ButtonLink href="#tokens" variant="secondary">토큰 찾기</ButtonLink>
      </div>

      <h2 className="section-title" id="seeds">원본 시드</h2>
      <p className={styles.intro}>모든 색은 아래 시드에서 시작합니다. 시드는 램프의 500 단계와 같은 값입니다.</p>
      <ul className={styles.seeds}>
        {view.seeds.map(s => (
          <li key={s.id} className={styles.seed}>
            <span className={styles.seedChip} style={{background: s.hex}} aria-hidden="true" />
            <p className={styles.seedName}>{s.label}</p>
            <code className={styles.seedHex}>{s.hex}</code>
            <span className={styles.muted} style={{margin: 0}}>{s.usage}</span>
          </li>
        ))}
      </ul>

      <h2 className="section-title" id="ramps">50–950 램프</h2>
      <p className={styles.intro}>각 시드를 11단계로 펼친 기본 색입니다. 테두리가 있는 칸이 시드와 같은 단계입니다.</p>
      <div className={styles.ramps}>
        {view.ramps.map(r => (
          <section key={r.id} aria-labelledby={`ramp-${r.id}`}>
            <div className={styles.rampHead}>
              <h3 className={styles.rampName} id={`ramp-${r.id}`}>{r.label}</h3>
              <span className={styles.rampSeed}>시드 {r.seed}</span>
            </div>
            <ul className={styles.ramp}>
              {r.steps.map(s => (
                <li key={s.step} className={styles.step}>
                  <span className={styles.stepChip} style={{background: s.hex}} data-seed={s.isSeed} aria-hidden="true" />
                  <span className={styles.stepNum}>{s.step}{s.isSeed ? <span className="visually-hidden"> (시드)</span> : null}</span>
                  <code className={styles.stepHex}>{s.hex}</code>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2 className="section-title" id="compare">라이트·다크 비교</h2>
      <p className={styles.intro}>같은 화면 조각을 두 모드의 역할 색으로 그렸습니다. 역할 이름은 같고 값만 바뀝니다.</p>
      <ModeCompare scenes={view.scenes} />
      <details className={styles.contrast}>
        <summary>대비 검사 결과 보기 (라이트 {view.contrast.light.length}개 · 다크 {view.contrast.dark.length}개 항목{allPass(view.contrast.light) && allPass(view.contrast.dark) ? ', 모두 기준 통과' : ''})</summary>
        <div className={styles.tableWrap} data-layout-scroll tabIndex={0} role="region" aria-label="대비 검사 결과 표 (가로로 스크롤)">
          <table className={styles.table}>
            <thead><tr><th scope="col">조합</th><th scope="col">라이트</th><th scope="col">다크</th><th scope="col">기준</th></tr></thead>
            <tbody>
              {view.contrast.light.map((l, i) => (
                <tr key={l.name}><th scope="row">{l.name}</th><td className={styles.num}>{l.ratio.toFixed(2)}</td><td className={styles.num}>{view.contrast.dark[i]?.ratio.toFixed(2)}</td><td className={styles.num}>{l.minimum}:1 이상</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <h2 className="section-title" id="tokens">토큰 찾기</h2>
      <p className={styles.intro}>기본·역할·상태·부품 네 층의 토큰 {view.rows.length}개를 검색하고, 값과 CSS 변수를 복사하거나 CSS·JSON으로 내보냅니다.</p>
      <ColorExplorer rows={view.rows} families={view.families} layers={view.layers} />
    </PageShell>
  );
}
