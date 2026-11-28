import {NextRequest, NextResponse} from 'next/server';
import {queryMaterials} from '@winterholic/design-system-static-kit/service';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const FONT_ASSET_PATHS: Record<string, string[]> = {
  'PretendardGOVVariable.woff2': [join(process.cwd(), 'apps/web/public/fonts/PretendardGOVVariable.woff2'), join(process.cwd(), 'public/fonts/PretendardGOVVariable.woff2')],
  'NotoSerifKR-Variable.woff2': [join(process.cwd(), 'apps/web/public/fonts/NotoSerifKR-Variable.woff2'), join(process.cwd(), 'public/fonts/NotoSerifKR-Variable.woff2')],
  'JetBrainsMono-Variable.woff2': [join(process.cwd(), 'apps/web/public/fonts/JetBrainsMono-Variable.woff2'), join(process.cwd(), 'public/fonts/JetBrainsMono-Variable.woff2')],
};

export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{file: string}>}
) {
  const {file} = await params;
  const url = new URL(request.url);

  // 음성/실패 시나리오 테스트용 쿼리
  if (url.searchParams.get('fail') === '1' || url.searchParams.get('fail') === 'true') {
    return new NextResponse('Font load failure simulated', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      },
    });
  }

  // 허용된 폰트 파일인지 검증
  const mat = queryMaterials({view: 'typography'}) as any;
  const webfonts = mat.ok ? (mat.value?.webfonts ?? {}) : {};
  const allowed = Object.values(webfonts as Record<string, any>).find(w => w.file === file);
  if (!allowed) {
    return new NextResponse('Not Found', {status: 404});
  }

  // 앱과 함께 배포되는 저장소 자산만 서빙한다. 누락·손상된 파일을 성공 응답으로 위장하지 않는다.
  const candidate = FONT_ASSET_PATHS[file]?.find(existsSync);
  if (!candidate) return new NextResponse('Not Found', {status: 404});
  let fontBuffer: Buffer;
  try {
    fontBuffer = readFileSync(candidate);
  } catch {
    return new NextResponse('Font asset unavailable', {status: 404});
  }
  const digest = createHash('sha256').update(fontBuffer).digest('hex');
  if (fontBuffer.subarray(0, 4).toString('ascii') !== 'wOF2' || digest !== allowed.sha256) {
    return new NextResponse('Font asset integrity check failed', {status: 500});
  }

  return new NextResponse(new Uint8Array(fontBuffer) as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'font/woff2',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': String(fontBuffer.length),
      'X-Font-Version': String(allowed.version ?? '1.0.0'),
      'X-Font-License': String(allowed.license ?? 'OFL-1.1'),
      'X-Font-SHA256': String(allowed.sha256 ?? ''),
    },
  });
}
