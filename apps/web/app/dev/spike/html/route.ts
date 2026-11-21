import {compileHtml} from '@/lib/spike-core';

export const dynamic = 'force-static';

// S4: 서버가 컴파일한 HTML 을 그대로 내보낸다. site/examples/saas-landing/index.html 과 바이트가 같아야 한다.
export function GET() {
  return new Response(compileHtml(), {headers: {'content-type': 'text/html; charset=utf-8'}});
}
