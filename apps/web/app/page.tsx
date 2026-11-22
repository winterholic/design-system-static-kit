import Link from 'next/link';
import {HashRedirect} from './HashRedirect';
import appStyles from './home.module.css';
import {Showcase} from '@/features/home/Showcase';
import {GITHUB_URL} from '@/lib/nav';
import styles from '@/features/home/home.module.css';
import {ButtonLink} from '@/ui';

export default function Home() {
  return (
    <div className="page">
      <HashRedirect />
      <section className={styles.hero}>
        <h1 className="page-title">고르면, 대비 검사를 통과한 HTML이 나오는 디자인 컴파일러</h1>
        <p className="page-lead">테마·팔레트·부품을 카탈로그가 허용한 값에서만 고릅니다. 규칙과 접근성 대비를 검사한 뒤, 같은 입력에서 같은 바이트의 HTML·CSS·토큰을 냅니다.</p>
      </section>

      <Showcase />

      <h2 className="section-title">컴파일 결과 그대로</h2>
      <p className="prose">아래 화면은 이 사이트가 설명하는 컴파일러가 만든 결과물(<code>/examples/saas-landing/</code>)을 그대로 보여 줍니다.</p>
      <div className={appStyles.frame}>
        <iframe src="/examples/saas-landing/" title="saas-landing 템플릿의 컴파일 결과" loading="lazy" tabIndex={-1} className={appStyles.iframe} />
      </div>

      <h2 className="section-title">직접 열어 보기</h2>
      <div className={styles.entries}>
        <div>
          <h3>Explore</h3>
          <p>대표 디자인을 페이지 유형과 테마로 걸러 보고, 구성과 Blueprint를 확인합니다.</p>
          <ButtonLink href="/explore">Explore 둘러보기</ButtonLink>
        </div>
        <div>
          <h3>Studio</h3>
          <p>템플릿에서 시작해 테마·팔레트·구성을 바꾸며 직접 편집합니다.</p>
          <ButtonLink href="/studio" variant="secondary">Studio에서 만들기</ButtonLink>
        </div>
      </div>

      <h2 className="section-title">규약은 설명이 아니라 코드가 지킵니다</h2>
      <dl className={styles.rules}>
        <div><dt>허용된 값만</dt><dd>알 수 없는 속성, <code>style</code>·<code>className</code>, 임의 토큰 값, 잘못된 부모-자식 조합, 금지된 축 조합은 조용히 버려지지 않고 오류로 거부됩니다.</dd></div>
        <div><dt>대비 검사</dt><dd>컴파일할 때 색 조합의 대비를 모두 계산하고, 기준에 못 미치면 결과를 만들지 않습니다.</dd></div>
        <div><dt>맥락 규칙</dt><dd>페이지 유형이 필수·금지 부품을 정하고, 부품의 배치와 크기는 규칙표가 정합니다. 어떤 규칙이 이겼는지는 결과의 기록에 남습니다.</dd></div>
        <div><dt>같은 입력, 같은 출력</dt><dd>시간·난수·환경에 기대지 않아 결과를 바이트 단위로 다시 만들고 비교할 수 있습니다.</dd></div>
      </dl>

      <h2 className="section-title">CLI · REST · MCP로 같은 검증을</h2>
      <div className={styles.use}>
        <pre tabIndex={0} className={styles.code}><code>{`npm run kit -- init saas-landing my.json trust
npm run kit -- validate my.json
npm run kit -- build my.json --out out/my-page`}</code></pre>
        <div>
          <p>CLI, REST API, MCP는 같은 검증·컴파일 함수를 부릅니다. 어느 길로 들어와도 같은 오류와 같은 결과를 받습니다.</p>
          <Link href="/integrations">연동 안내 보기</Link>
        </div>
      </div>

      <h2 className="section-title">시작하기</h2>
      <div className={styles.end}>
        <ButtonLink href="/docs/getting-started">시작 가이드</ButtonLink>
        <ButtonLink href={GITHUB_URL} variant="secondary" external>GitHub</ButtonLink>
      </div>
    </div>
  );
}
