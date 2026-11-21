import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {ValueSample, hasSample} from '@/features/materials/FoundationSamples';
import {foundationAxes, iconRows, layoutPrimitives} from '@/features/materials/materials.server';
import styles from '@/features/materials/materials.module.css';

export const metadata = {title: '기초 재료 · Materials', description: '간격, 모서리, 깊이, 움직임, 아이콘 같은 기초 재료의 값을 비교하고 Studio에서 적용합니다.'};

const GROUPS: {title: string; axes: string[]}[] = [
  {title: '간격과 모양', axes: ['density', 'radius', 'control']},
  {title: '깊이와 움직임', axes: ['elevation', 'motion', 'backdrop', 'ornament']},
  {title: '글자와 아이콘', axes: ['icon', 'weight', 'scale']},
  {title: '배치', axes: ['width', 'shell', 'footer']},
];

export default function FoundationsPage() {
  const axes = foundationAxes();
  const icons = iconRows();
  return (
    <PageShell eyebrow="Materials · 기초 재료" title="간격에서 아이콘까지" lead="모든 화면 부품이 읽는 기초 값입니다. 축마다 값을 나란히 놓고 비교한 뒤 Studio에서 바로 적용해 볼 수 있습니다.">
      <MaterialsNav current="foundations" />
      {GROUPS.map(group => (
        <section key={group.title} aria-labelledby={`g-${group.axes[0]}`}>
          <h2 className="section-title" id={`g-${group.axes[0]}`}>{group.title}</h2>
          <ul className={styles.axisGrid}>
            {group.axes.map(id => axes.find(a => a.axis === id)).filter((a): a is NonNullable<typeof a> => !!a).map(a => (
              <li key={a.axis} className={styles.axisCard}>
                <h3><Link href={`/materials/foundations/${a.axis}`}>{a.label}</Link></h3>
                {hasSample(a.axis)
                  ? <div className={styles.axisStrip}>{a.values.map(v => <span key={v.id} className={styles.stripItem}><ValueSample axis={a} value={v.id} icons={icons} />{v.id}</span>)}</div>
                  : <p className={styles.axisValues}>{a.values.map(v => <span key={v.id}>{v.id}</span>)}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2 className="section-title" id="icons">아이콘 {icons.length}개</h2>
      <p className={styles.intro}>이 키트가 직접 그린 24px 아이콘입니다. 아이콘 스타일 축을 바꾸면 선 굵기와 채움이 함께 바뀝니다.</p>
      <ul className={styles.iconGrid} data-testid="icon-grid">
        {icons.map(i => (
          <li key={i.id} className={styles.iconCell}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{i.paths.map((d, k) => <path key={k} d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}</svg>
            <span>{i.id}</span>
          </li>
        ))}
      </ul>

      <h2 className="section-title" id="primitives">배치 원형</h2>
      <p className={styles.intro}>부품이 놓이는 방식을 정하는 여섯 가지 원형입니다.</p>
      <ul className={styles.primitives}>
        {layoutPrimitives().map((p: {id: string; label: string; css: string}) => <li key={p.id}><strong>{p.label}</strong><code>{p.css}</code></li>)}
      </ul>
    </PageShell>
  );
}
