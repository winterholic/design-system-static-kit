'use client';

import {useState} from 'react';
import {Button} from '@/ui';

type Result = {bytes: number; sha256: string; ms: number; error?: string};

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

// S2·S5: ./service(컴파일러·카탈로그 포함)는 버튼을 누를 때만 동적 import 되어 초기 JS 에 들어가지 않는다.
export function SpikeClient({template}: {template: string}) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const t0 = performance.now();
    try {
      const [{compileBlueprint}, {resetDocument}] = await Promise.all([
        import('@winterholic/design-system-static-kit/service'),
        import('@winterholic/design-system-static-kit/edit'),
      ]);
      const doc = resetDocument(null, {template});
      if (!doc.ok) throw new Error('resetDocument: ' + JSON.stringify(doc.errors));
      const r = compileBlueprint(doc.doc, {include: ['html']});
      if (!r.ok) throw new Error('compileBlueprint: ' + JSON.stringify(r.errors));
      const html = r.value.html as string;
      setResult({bytes: new TextEncoder().encode(html).length, sha256: await sha256Hex(html), ms: Math.round(performance.now() - t0)});
    } catch (e) {
      setResult({bytes: 0, sha256: '', ms: 0, error: String(e)});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="primary" onClick={run} disabled={busy}>브라우저에서 컴파일</Button>
      {result ? (
        <dl data-testid="client-result" data-sha256={result.sha256} data-error={result.error ?? ''}>
          <dt>바이트</dt><dd>{result.bytes}</dd>
          <dt>sha256</dt><dd><code>{result.sha256}</code></dd>
          <dt>걸린 시간(ms)</dt><dd>{result.ms}</dd>
          {result.error ? <><dt>오류</dt><dd>{result.error}</dd></> : null}
        </dl>
      ) : null}
    </div>
  );
}
