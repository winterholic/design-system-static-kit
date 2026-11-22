// 공유 가능한 작업 주소. 문서(Blueprint)와 출처·직접 고른 축·수정 여부를 압축해 주소 해시(#d=)에 담는다(web-ia.md 3.4 "주소와 저장").
// 해시는 서버로 가지 않으므로 백엔드 없이 같은 주소를 다른 브라우저에서 열 수 있다. 문서는 Core(importBlueprint)가 다시 검증한다.
import type {Blueprint, Origin, Picks} from './types';

export type SharePayload = {v: 1; doc: Blueprint; origin: Origin; picked: Picks; modified: boolean};
export type ShareDecoded = {ok: true; payload: SharePayload} | {ok: false; reason: string};
export type ShareEncoded = {ok: true; token: string} | {ok: false; reason: string};

/** 해시에 담을 수 있는 토큰의 길이 상한. 넘으면 주소에 쓰지 않고 JSON 내보내기를 안내한다. */
export const MAX_TOKEN = 60_000;
/** 압축 풀었을 때의 JSON 상한. 악의적으로 작은 토큰이 크게 풀리는 것을 막는다. */
const MAX_JSON = 2_000_000;
const KEY = 'd';

const isRecord = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit: number): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // 쓰기 쪽 오류는 읽기 쪽 오류로 같이 나온다. 여기서 따로 처리하지 않는다.
  void writer.write(bytes as BufferSource).catch(() => {});
  void writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error('too-large'); }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

const hasStreams = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

/** `z.`는 deflate-raw, `j.`는 압축 없는 JSON(압축 스트림이 없는 브라우저용). */
export async function encodeShare(payload: SharePayload): Promise<ShareEncoded> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  let token: string;
  try {
    token = hasStreams() ? 'z.' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw'), MAX_JSON)) : 'j.' + toBase64Url(json);
  } catch (e) {
    return {ok: false, reason: '문서를 링크용으로 압축하지 못했습니다: ' + (e as Error).message};
  }
  if (token.length > MAX_TOKEN) return {ok: false, reason: '문서가 커서 주소에 담을 수 없습니다. JSON 내보내기로 전달하세요.'};
  return {ok: true, token};
}

export async function decodeShare(token: string): Promise<ShareDecoded> {
  const bad = (reason: string): ShareDecoded => ({ok: false, reason});
  if (token.length > MAX_TOKEN) return bad('공유 링크가 너무 깁니다.');
  const kind = token.slice(0, 2), body = token.slice(2);
  if ((kind !== 'z.' && kind !== 'j.') || !/^[A-Za-z0-9_-]*$/.test(body)) return bad('공유 링크의 형식을 알 수 없습니다.');
  let text: string;
  try {
    const bytes = fromBase64Url(body);
    if (kind === 'z.') {
      if (!hasStreams()) return bad('이 브라우저는 압축된 공유 링크를 열 수 없습니다.');
      text = new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw'), MAX_JSON));
    } else text = new TextDecoder().decode(bytes);
  } catch (e) {
    return bad(e instanceof Error && e.message === 'too-large' ? '공유 링크의 내용이 너무 큽니다.' : '공유 링크가 손상되어 읽을 수 없습니다.');
  }
  let data: unknown;
  try { data = JSON.parse(text); } catch { return bad('공유 링크의 내용을 읽을 수 없습니다.'); }
  if (!isRecord(data) || data.v !== 1) return bad('이 Studio가 읽을 수 없는 공유 링크 버전입니다.');
  if (!isRecord(data.doc)) return bad('공유 링크에 문서가 없습니다.');
  const o = data.origin;
  const origin: Origin = isRecord(o) && typeof o.template === 'string' && isRecord(o.layout) && Object.values(o.layout).every(v => typeof v === 'string') && (o.themeVariant === null || typeof o.themeVariant === 'string') && (o.palette === null || typeof o.palette === 'string')
    ? {template: o.template, layout: o.layout as Record<string, string>, themeVariant: (o.themeVariant ?? null) as string | null, palette: (o.palette ?? null) as string | null}
    : null;
  const picked: Picks = isRecord(data.picked) && Object.values(data.picked).every(v => typeof v === 'string') ? (data.picked as Picks) : {};
  return {ok: true, payload: {v: 1, doc: data.doc, origin, picked, modified: data.modified === true}};
}

/** 주소 해시(`#d=...`)에서 토큰을 꺼낸다. 없으면 null. */
export function shareToken(hash: string): string | null {
  if (!hash || hash === '#') return null;
  return new URLSearchParams(hash.replace(/^#/, '')).get(KEY);
}

export const shareHash = (token: string | null) => (token ? `#${KEY}=${token}` : '');
