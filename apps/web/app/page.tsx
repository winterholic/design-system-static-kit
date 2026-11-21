import Link from 'next/link';
import {HashRedirect} from './HashRedirect';
import styles from './home.module.css';

export default function Home() {
  return (
    <div className="page">
      <HashRedirect />
      <p className="eyebrow">디자인 컴파일러</p>
      <h1 className="page-title">고르면, 검증된 HTML이 나옵니다</h1>
      <p className="page-lead">
        테마·팔레트·축을 카탈로그가 허용한 값에서만 고릅니다. 대비와 구성 규칙을 통과한 HTML, CSS, 토큰이 같은 입력에서 같은 바이트로 나옵니다.
      </p>
      <div className={`btn-row ${styles.actions}`}>
        <Link href="/explore" className="btn">Explore 둘러보기</Link>
        <Link href="/studio" className="btn btn-quiet">Studio에서 만들기</Link>
      </div>
      <h2 className="section-title">컴파일 결과 그대로</h2>
      <p className="prose">아래 화면은 이 사이트가 설명하는 컴파일러가 만든 결과물(<code>/examples/saas-landing/</code>)을 그대로 보여 줍니다.</p>
      <div className={styles.frame}>
        <iframe src="/examples/saas-landing/" title="saas-landing 템플릿의 컴파일 결과" loading="lazy" className={styles.iframe} />
      </div>
    </div>
  );
}
