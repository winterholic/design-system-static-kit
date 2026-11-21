import {createHash} from 'node:crypto';
import type {Metadata} from 'next';
import {compileFiles, SPIKE_TEMPLATE, templateCount} from '@/lib/spike-core';
import {PageShell} from '@/shell/PageShell';
import {SpikeClient} from './SpikeClient';

export const metadata: Metadata = {title: 'Core import 스파이크', robots: {index: false, follow: false}};

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export default function SpikePage() {
  const files = compileFiles(sha);
  const names = Object.keys(files).sort();
  const digests = Object.fromEntries(names.map(n => [n, sha(files[n])]));
  return (
    <PageShell eyebrow="내부" title="Core import 스파이크" lead={`${SPIKE_TEMPLATE} 를 서버와 브라우저에서 ./service 로 컴파일해 같은 바이트인지 확인합니다.`}>
      <h2 className="section-title">서버 컴파일</h2>
      <dl data-testid="server-result" data-sha256={digests['index.html']} data-files={JSON.stringify(digests)} data-template-count={templateCount()}>
        <dt>템플릿 수 (listCatalog)</dt><dd>{templateCount()}</dd>
        {names.map(n => <div key={n}><dt>{n}</dt><dd><code>{digests[n]}</code></dd></div>)}
      </dl>
      <p><a href="/dev/spike/html">서버가 낸 HTML 보기</a></p>
      <h2 className="section-title">브라우저 컴파일</h2>
      <SpikeClient template={SPIKE_TEMPLATE} />
    </PageShell>
  );
}
