import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {colorView, overview, typeView} from '@/features/materials/materials.server';
import {studioForColor} from '@/features/materials/studio-link';
import {ButtonLink} from '@/ui';
import styles from '@/features/materials/materials.module.css';
import {materials, platformReady} from '@/features/platform/platform.server';
import {SEED_ROLES} from '@/features/platform/labels';

export const metadata = {title: 'Materials', description: '색, 타이포그래피, 간격·반경·깊이 같은 기초 재료를 한곳에서 찾아보고 Studio에서 바로 씁니다.'};

export default function MaterialsPage() {
  const count = overview();
  const color = colorView();
  const type = typeView();
  return (
    <PageShell eyebrow="Materials" title="디자인을 이루는 재료 둘러보기" lead="화면은 코드로 정의한 재료만으로 조립됩니다. 색과 글자, 간격과 모서리 같은 기초 재료를 직접 확인하고, 마음에 드는 것을 Studio에서 바로 써 보세요.">
      <MaterialsNav current="overview" />
      {platformReady() ? (
        <ul className={`${styles.cards} ${styles.cardsWide}`} data-testid="platform-materials">
          <li className={styles.card}>
            <h2>팔레트와 서브토큰 세트</h2>
            <p>팔레트 {materials('palette').length}개와 세트 {materials('subtoken-set').length}개를 나란히 비교하고, 내 색도 시험합니다.</p>
            <div className={styles.strip} aria-hidden="true">{materials('palette').map(p => <span key={p.id} className={styles.stripChip} style={{background: p.seeds?.[SEED_ROLES[0][0]]}} />)}</div>
            <div className={styles.cardLink}><ButtonLink href="/materials/palettes">팔레트 비교하기</ButtonLink></div>
          </li>
          <li className={styles.card}>
            <h2>타이포 시스템</h2>
            <p>시스템 {materials('type-system').length}개를 같은 샘플로 나란히 놓고 모바일·데스크톱 크기로 봅니다.</p>
            <div className={styles.cardLink}><ButtonLink href="/materials/typography">글자 비교하기</ButtonLink></div>
          </li>
          <li className={styles.card}>
            <h2>스타일 맥락</h2>
            <p>표면·모션·배경을 묶은 스타일 맥락 {materials('style-context').length}개를 같은 페이지에 적용해 비교합니다.</p>
            <div className={styles.cardLink}><ButtonLink href="/materials/styles">스타일 비교하기</ButtonLink></div>
          </li>
        </ul>
      ) : null}
      <ul className={styles.cards}>
        <li className={styles.card}>
          <h2>색 토큰</h2>
          <p>원본 시드 {count.colorSeeds}개에서 계산한 50–950 램프와 역할·상태·부품 토큰 {count.colorTokens}개를 라이트와 다크로 비교합니다.</p>
          <div className={styles.strip} aria-hidden="true">{color.seeds.map(s => <span key={s.id} className={styles.stripChip} style={{background: s.hex}} />)}</div>
          <div className={styles.cardLink}><ButtonLink href="/materials/color" variant="secondary">색 보기</ButtonLink></div>
        </li>
        <li className={styles.card}>
          <h2>타이포그래피</h2>
          <p>{type.presets.map(p => p.label).join(' · ')} 네 가지 프리셋의 역할별 글자 스타일과 {count.corpus}개 시험 문구, 컨트롤 크기 {count.controlSizes}단계입니다.</p>
          <p className={styles.cardMeta}>한글과 영문, 숫자, 코드가 섞여도 줄바꿈이 무너지지 않는지 봅니다.</p>
          <div className={styles.cardLink}><ButtonLink href="/materials/typography" variant="secondary">타이포그래피 보기</ButtonLink></div>
        </li>
        <li className={styles.card}>
          <h2>기초 재료</h2>
          <p>간격, 모서리, 깊이, 움직임, 아이콘 같은 {count.axes}개 축과 아이콘 {count.icons}개, 배치 원형 {count.layoutPrimitives}개입니다.</p>
          <p className={styles.cardMeta}>축마다 값을 비교하고 Studio에서 적용할 수 있는지 미리 알려 줍니다.</p>
          <div className={styles.cardLink}><ButtonLink href="/materials/foundations" variant="secondary">기초 재료 보기</ButtonLink></div>
        </li>
      </ul>

      <h2 className="section-title">찾고, 확인하고, 만들어 보기</h2>
      <ol className={styles.flow}>
        <li><strong>찾기</strong><span>검색하고 필터로 좁힙니다.</span></li>
        <li><strong>확인하기</strong><span>실제 렌더링과 라이트·다크를 비교합니다.</span></li>
        <li><strong>가져가기</strong><span>토큰을 복사하거나 CSS·JSON으로 내보냅니다.</span></li>
        <li><strong>만들어 보기</strong><span>Studio에서 사용하기로 문서에 적용합니다.</span></li>
      </ol>
      <p className={styles.intro} style={{marginTop: 'var(--space-5)'}}>
        바로 시작하려면 <Link href={studioForColor()}>Static Kit 색을 켠 채로 Studio 열기</Link>를 눌러 보세요.
      </p>
    </PageShell>
  );
}
