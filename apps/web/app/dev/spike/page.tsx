import {createHash} from 'node:crypto';
import type {Metadata} from 'next';
import {compileHtml, compileHtmlViaEdit, SPIKE_TEMPLATE} from '@/lib/spike-core';
import {PageShell} from '@/shell/PageShell';
import {SpikeClient} from './SpikeClient';

export const metadata: Metadata = {title: 'Core import 스파이크', robots: {index: false, follow: false}};

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export default function SpikePage() {
  const server = compileHtml();
  const viaEdit = compileHtmlViaEdit();
  const serverSha = sha(server);
  return (
    <PageShell eyebrow="내부" title="Core import 스파이크" lead={`${SPIKE_TEMPLATE} 를 서버와 브라우저에서 컴파일해 같은 바이트인지 확인합니다.`}>
      <h2 className="section-title">서버 컴파일</h2>
      <dl data-testid="server-result" data-sha256={serverSha} data-edit-sha256={viaEdit ? sha(viaEdit) : ''}>
        <dt>바이트</dt><dd>{Buffer.byteLength(server)}</dd>
        <dt>sha256</dt><dd><code>{serverSha}</code></dd>
        <dt>./edit 문서로 컴파일한 sha256</dt><dd><code>{viaEdit ? sha(viaEdit) : '(실패)'}</code></dd>
      </dl>
      <p><a href="/dev/spike/html">서버가 낸 HTML 보기</a></p>
      <h2 className="section-title">브라우저 컴파일</h2>
      <SpikeClient template={SPIKE_TEMPLATE} />
    </PageShell>
  );
}
