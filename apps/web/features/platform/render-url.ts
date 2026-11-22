// 서버가 그리는 미리보기 iframe 의 주소. 요청 JSON 을 base64url 로 담아 /platform/render 가 같은 요청을 서비스에 그대로 넘긴다.
import type {AssembleRequest} from './types';

export type RenderKind = 'design' | 'components';
const utf8 = (s: string) => new TextEncoder().encode(s);

export function encodeRequest(request: unknown): string {
  const bytes = utf8(JSON.stringify(request));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeRequest(token: string): unknown {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (token.length % 4)) % 4);
  const bin = atob(padded);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
}
export const MAX_REQUEST_TOKEN = 6000;

/** kind=design 이면 요청의 candidates 중 index 번째 후보의 standalone 문서를, components 이면 assembleComponents 결과를 낸다. */
export function renderSrc(request: AssembleRequest | Record<string, unknown>, opts: {kind?: RenderKind; index?: number; part?: 'standalone' | 'html' | 'css' | 'manifest'; download?: boolean} = {}): string {
  const q = new URLSearchParams({r: encodeRequest(request)});
  if (opts.kind && opts.kind !== 'design') q.set('k', opts.kind);
  if (opts.index) q.set('i', String(opts.index));
  if (opts.part) q.set('part', opts.part);
  if (opts.download) q.set('download', '1');
  return `/platform/render?${q}`;
}
