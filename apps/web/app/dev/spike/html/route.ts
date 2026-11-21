import {createHash} from 'node:crypto';
import {compileFiles} from '@/lib/spike-core';

export const dynamic = 'force-static';

// S4: 서버가 ./service 로 컴파일한 HTML 을 그대로 내보낸다. site/examples/saas-landing/index.html 과 바이트가 같아야 한다.
export function GET() {
  const files = compileFiles(t => createHash('sha256').update(t).digest('hex'));
  return new Response(files['index.html'], {headers: {'content-type': 'text/html; charset=utf-8'}});
}
