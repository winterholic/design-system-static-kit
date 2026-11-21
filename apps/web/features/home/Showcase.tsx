import Link from 'next/link';
import {Thumb} from '@/features/explore/Thumb';
import {findDesign, type Design} from '@/features/explore/designs.server';
import styles from './home.module.css';

// 홈에 보이는 화면은 모두 컴파일러가 만든 결과다. 템플릿 기본 디자인은 빌드가 만든 정적 산출물(/examples/<id>/)을 그대로 쓴다.
const MAIN = 'saas-landing';
const PHONE = 'cafe-home';
const STRIP = ['dashboard-overview', 'article', 'luxury-brand', 'api-reference'];

function must(id: string): Design {
  const d = findDesign(id);
  if (!d) throw new Error(`홈의 대표 디자인 ${id} 가 Explore 목록에 없습니다.`);
  return d;
}

export function Showcase() {
  const main = must(MAIN), phone = must(PHONE), strip = STRIP.map(must);
  return (
    <>
      <div className={styles.stage}>
        <Link href={`/explore/${main.id}`} className={styles.shot}>
          <Thumb src={`/examples/${main.id}/`} title={`${main.id} 템플릿의 컴파일 결과`} />
          <span className={styles.cap}>{main.label} · {main.themeName}</span>
        </Link>
        <Link href={`/explore/${phone.id}`} className={`${styles.shot} ${styles.phone}`}>
          <Thumb src={`/examples/${phone.id}/`} title={`${phone.id} 템플릿의 모바일 컴파일 결과`} width={390} height={844} />
          <span className={styles.cap}>{phone.label} · {phone.themeName} · 390px</span>
        </Link>
      </div>
      <ul className={styles.strip}>
        {strip.map(d => (
          <li key={d.id}>
            <Link href={`/explore/${d.id}`} className={styles.shot}>
              <Thumb src={`/examples/${d.id}/`} title={`${d.id} 템플릿의 컴파일 결과`} />
              <span className={styles.cap}>{d.label} · {d.themeName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
