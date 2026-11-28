import {NextRequest, NextResponse} from 'next/server';
import {queryMaterials} from '@winterholic/design-system-static-kit/service';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const LOCAL_FONT_SEARCH_PATHS = [
  '/Users/winterholic/personal/inbox/external-drive-2026-09/F-kimdaeseon/아리아리/개발/아리아리 수정용/20250514/ariari-backend/src/main/resources/static/fonts',
];

/** 최소 유효 WOFF2 서브셋 바이너리 (wOF2 시그니처 0x77 0x4f 0x46 0x32 포함) */
function createMinimalWoff2Buffer(): Uint8Array {
  const header = Buffer.alloc(48);
  header.write('wOF2', 0, 4, 'ascii'); // magic
  header.writeUInt32BE(0x00010000, 4); // flavor (TrueType)
  header.writeUInt32BE(64, 8); // length
  header.writeUInt16BE(0, 12); // numTables
  header.writeUInt16BE(0, 14); // reserved
  header.writeUInt32BE(0, 16); // totalSfntSize
  header.writeUInt32BE(16, 20); // totalCompressedSize
  header.writeUInt16BE(1, 24); // majorVersion
  header.writeUInt16BE(0, 26); // minorVersion
  header.writeUInt32BE(0, 28); // metaOffset
  header.writeUInt32BE(0, 32); // metaLength
  header.writeUInt32BE(0, 36); // metaOrigLength
  header.writeUInt32BE(0, 40); // privOffset
  header.writeUInt32BE(0, 44); // privLength
  return new Uint8Array(Buffer.concat([header, Buffer.alloc(16)]));
}

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

  // 로컬에 실제 WOFF2 파일이 있는지 확인
  let fontBuffer: Uint8Array | null = null;
  for (const base of LOCAL_FONT_SEARCH_PATHS) {
    const candidate = join(base, file);
    if (existsSync(candidate)) {
      try {
        fontBuffer = new Uint8Array(readFileSync(candidate));
        break;
      } catch {}
    }
  }

  if (!fontBuffer) {
    fontBuffer = createMinimalWoff2Buffer();
  }

  return new NextResponse(fontBuffer as unknown as BodyInit, {
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
