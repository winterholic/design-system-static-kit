import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';
import {ValueSample, valueFacts} from '@/features/materials/FoundationSamples';
import {foundationAxes, iconRows} from '@/features/materials/materials.server';
import {studioForAxis} from '@/features/materials/studio-link';
import {ButtonLink} from '@/ui';
import styles from '@/features/materials/materials.module.css';

type Props = {params: Promise<{axis: string}>};
export const dynamicParams = false;

export function generateStaticParams() {
  return foundationAxes().map(a => ({axis: a.axis}));
}

export async function generateMetadata({params}: Props) {
  const {axis: id} = await params;
  const axis = foundationAxes().find(a => a.axis === id);
  return {title: axis ? `${axis.label} · 기초 재료` : '재료를 찾을 수 없음'};
}

export default async function AxisPage({params}: Props) {
  const {axis: id} = await params;
  const axis = foundationAxes().find(a => a.axis === id);
  if (!axis) notFound();
  const icons = iconRows();
  return (
    <div className="page">
      <p className={styles.crumb}><Link href="/materials">Materials</Link> / <Link href="/materials/foundations">기초 재료</Link></p>
      <h1 className="page-title">{axis.label}</h1>
      <p className="page-lead">값 {axis.values.length}개를 비교하고 마음에 드는 값을 Studio에서 바로 써 보세요. Studio에서 쓸 수 없는 값은 이유 코드와 함께 표시합니다.</p>
      <ul className={styles.valueList}>
        {axis.values.map(v => (
          <li key={v.id} className={styles.valueRow} data-value={v.id}>
            <span className={styles.valueName}>
              <strong>{v.id}</strong>
              <span>{v.description}{valueFacts(axis, v.id) ? ` · ${valueFacts(axis, v.id)}` : ''}</span>
            </span>
            <span className={styles.valueSample}><ValueSample axis={axis} value={v.id} icons={icons} /></span>
            <span className={styles.valueAction}>
              {v.studio.ok
                ? <ButtonLink href={studioForAxis(axis.axis, v.id)} variant="secondary" size="sm">Studio에서 사용하기<span className="visually-hidden"> ({axis.label} {v.id})</span></ButtonLink>
                : <span className={styles.valueNote} data-testid="axis-unavailable">기본 문서에서는 쓸 수 없습니다 · {v.studio.code}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
