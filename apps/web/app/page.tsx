import Link from 'next/link';
import {HashRedirect} from './HashRedirect';
import {Thumb} from '@/features/explore/Thumb';
import type {Design} from '@/features/explore/designs.server';
import {homeData} from '@/features/home/home.server';
import styles from '@/features/home/home.module.css';
import {ButtonLink} from '@/ui';

const caption = (d: Design) => `${d.label} · ${d.themeName}${d.variantLabel ? ` · ${d.variantLabel}` : ''}`;

function Shot({design, className = styles.shot, capClass = styles.cap}: {design: Design; className?: string; capClass?: string}) {
  return (
    <Link href={`/explore/${design.id}`} className={className}>
      <Thumb src={`/explore/${design.id}/render`} title={`${design.template} 템플릿의 컴파일 결과: ${caption(design)}`} />
      <span className={capClass}>{caption(design)}</span>
    </Link>
  );
}

export default function Home() {
  const {hero, gallery, samePage, styles: styleRows, counts} = homeData();
  return (
    <div className="page">
      <HashRedirect />
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroText}>
          <h1 className="page-title" id="home-title">마음에 드는 디자인을 고르고, 재료를 바꿔 보고, 코드로 가져가세요.</h1>
          <p className="page-lead">완성된 화면 {counts.designs}개를 둘러보고, 색·글자·부품을 바꿔 가며 나만의 조합을 만든 뒤, 접근성 검사를 통과한 HTML·CSS로 내려받습니다.</p>
          <div className="btn-row">
            <ButtonLink href="/explore">디자인 둘러보기</ButtonLink>
            <ButtonLink href="/studio" variant="secondary">Studio에서 만들기</ButtonLink>
          </div>
        </div>
        <Shot design={hero} className={styles.heroShot} capClass={`${styles.cap} ${styles.heroCap}`} />
      </section>

      <section aria-labelledby="home-start">
        <h2 className="section-title" id="home-start">어디서 시작할까요?</h2>
        <ul className={styles.start}>
          <li><Link href="/explore" className={styles.startCard}><strong>완성된 디자인에서</strong><span>유형 {counts.pageTypes}가지, 열어서 구성 확인</span></Link></li>
          <li><Link href="/materials" className={styles.startCard}><strong>재료부터</strong><span>색·글자·간격 살펴보기</span></Link></li>
          <li><Link href="/components" className={styles.startCard}><strong>부품부터</strong><span>부품 {counts.components}개 미리보기</span></Link></li>
          <li><Link href="/studio" className={styles.startCard}><strong>바로 만들기</strong><span>템플릿에서 직접 편집</span></Link></li>
        </ul>
      </section>

      <section aria-labelledby="home-gallery">
        <h2 className="section-title" id="home-gallery">완성된 디자인 예시</h2>
        <p className={styles.sectionLead}>아래 화면은 모두 이 사이트의 Core가 방금 컴파일한 결과입니다. 열어서 구성을 보고 Studio로 이어 갈 수 있습니다.</p>
        <ul className={styles.gallery}>
          {gallery.map(d => <li key={d.id}><Shot design={d} /></li>)}
        </ul>
      </section>

      <section aria-labelledby="home-styles">
        <h2 className="section-title" id="home-styles">분위기로 둘러보기</h2>
        <p className={styles.sectionLead}>테마 {counts.themes}개가 스타일 묶음으로 나뉘어 있습니다. 하나를 고르면 그 분위기의 디자인만 모아 보여 줍니다.</p>
        <ul className={styles.chips} aria-label="스타일 묶음">
          {styleRows.map(row => <li key={row.id}><Link href={`/explore?style=${encodeURIComponent(row.id)}`}>{row.label}<small>{row.count}</small></Link></li>)}
          <li><Link href="/explore">전체 보기</Link></li>
        </ul>
      </section>

      <section aria-labelledby="home-how">
        <h2 className="section-title" id="home-how">이렇게 조립됩니다</h2>
        <ol className={styles.steps}>
          <li><strong>고른다</strong><span>페이지 유형과 템플릿에서 시작합니다.</span></li>
          <li><strong>재료를 바꾼다</strong><span>테마, 팔레트, 모드, 스타일 축을 바꿔 봅니다. 글과 구조는 그대로입니다.</span></li>
          <li><strong>규칙이 검사한다</strong><span>어울리지 않는 조합은 누르기 전에 막고, 색 대비는 컴파일할 때 확인합니다.</span></li>
          <li><strong>코드를 받는다</strong><span>HTML, CSS, 토큰, Blueprint JSON을 내려받거나 링크로 공유합니다.</span></li>
        </ol>
        <h3 className={styles.subTitle}>같은 페이지, 다른 재료</h3>
        <ul className={styles.variants}>
          {samePage.slice(0, 3).map(d => (
            <li key={d.id}>
              <Shot design={d} />
              <span className={styles.swatches} role="img" aria-label={`팔레트 ${d.paletteName}`}>{d.paletteColors.map(c => <i key={c} style={{background: c}} />)}</span>
              <span className={styles.cap}>팔레트 {d.paletteName} · {d.resolvedMode === 'dark' ? '다크' : d.resolvedMode === 'light' ? '라이트' : '자동'} 모드</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-studio">
        <h2 className="section-title" id="home-studio">Studio에서 직접 만들어 보세요</h2>
        <div className={styles.studio}>
          <div>
            <h3>고르고, 바꾸고, 되돌리고, 공유합니다</h3>
            <p>템플릿에서 시작해 테마·팔레트를 바꾸고 글을 고칩니다. 주소를 복사하면 같은 작업을 다른 브라우저에서도 열 수 있습니다.</p>
            <ButtonLink href="/studio">Studio 열기</ButtonLink>
          </div>
          <ul>
            <li>바꾸기 전에 영향을 보여 주는 확인 창</li>
            <li>새로고침해도 이어지는 실행 취소 기록</li>
            <li>미리보기를 모바일 390·태블릿·데스크톱으로 확인</li>
            <li>HTML과 Blueprint JSON 내보내기</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="home-features">
        <h2 className="section-title" id="home-features">핵심 기능</h2>
        <dl className={styles.features}>
          <div><dt>완성 디자인 {counts.designs}개</dt><dd>템플릿 기본 화면과 어울리는 테마 조합을 모았습니다.</dd></div>
          <div><dt>테마 {counts.themes}개 · 부품 {counts.components}개</dt><dd>허용된 값 안에서만 고르므로 깨지는 조합이 나오지 않습니다.</dd></div>
          <div><dt>접근성 대비 검사</dt><dd>색 조합의 대비를 컴파일할 때 모두 계산하고 기준에 못 미치면 결과를 만들지 않습니다.</dd></div>
          <div><dt>같은 입력, 같은 결과</dt><dd>같은 선택은 항상 같은 코드가 됩니다. 결과를 다시 만들어 비교할 수 있습니다.</dd></div>
          <div><dt>링크로 공유</dt><dd>Studio 주소에 작업이 담겨 다른 사람과 같은 화면을 바로 볼 수 있습니다.</dd></div>
          <div><dt>코드로 가져가기</dt><dd>HTML, CSS, 토큰 파일을 그대로 내려받아 프로젝트에 넣습니다.</dd></div>
        </dl>
      </section>

      <aside className={styles.dev} aria-label="개발자용 안내">
        <p>개발자라면 CLI, REST API, MCP로 같은 검증과 컴파일 결과를 받을 수 있습니다. 규약과 명령어는 Docs에 있습니다.</p>
        <div className="btn-row">
          <ButtonLink href="/docs/integrations" variant="secondary">연동 보기</ButtonLink>
          <ButtonLink href="/docs/guide/getting-started" variant="quiet">시작 가이드</ButtonLink>
        </div>
      </aside>
    </div>
  );
}
