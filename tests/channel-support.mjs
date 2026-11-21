// 채널 시험 공용 도구(시험 파일이 아니라서 node --test 가 직접 실행하지 않는다).
// 같은 서비스를 서비스 직접 호출, CLI, REST, MCP 네 경로로 부르는 어댑터를 만든다.
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {validateBlueprint, compileBlueprint} from '../src/service/index.mjs';
import {OPERATIONS, runOperation} from '../apps/web/lib/api/rest.mjs';
import {createRouteHandler} from '../apps/web/lib/api/mcp.mjs';
import {resetRateLimit} from '../apps/web/lib/api/ratelimit.mjs';

export const root = resolve(import.meta.dirname, '..');
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export {resetRateLimit, OPERATIONS};

export const workdir = () => mkdtempSync(join(tmpdir(), 'static-kit-channel-'));
export const cleanup = dir => rmSync(dir, {recursive: true, force: true});

// ------------------------------------------------------------ REST (Request → Response, 서버 없이 같은 코드 경로)
let ipCounter = 0;
const matchOp = (method, pathname) => {
  for (const op of OPERATIONS) {
    const re = new RegExp('^' + op.path.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '$');
    const m = re.exec(pathname);
    if (m && (op.method === method || method !== 'GET' && method !== 'POST')) return {op, params: m.groups ?? {}};
    if (m && op.method !== method) return {op, params: m.groups ?? {}};
  }
  return null;
};
/** 서버 없이 REST 실행기를 부른다. 매번 다른 호출자 IP 를 써서 호출 제한이 시험끼리 번지지 않게 한다. */
export async function rest(method, path, {body, headers = {}, raw} = {}) {
  const url = new URL(path, 'http://channel.test');
  const found = matchOp(method, url.pathname);
  if (!found) throw new Error('작업 표에 없는 경로: ' + path);
  const h = {'x-forwarded-for': `10.9.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`, ...headers};
  if (body !== undefined || raw !== undefined) h['content-type'] ??= 'application/json';
  const res = await runOperation(found.op.id, new Request(url, {method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body))}), found.params);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 본문 없음(304 등) */ }
  return {status: res.status, headers: res.headers, text, json};
}

// ------------------------------------------------------------ MCP (SDK 클라이언트 → fetch → 같은 핸들러)
const mcpHandler = createRouteHandler();
export const mcpFetch = (url, init) => mcpHandler(new Request(url, init));
/** era: 'modern'(2026-07-28 server/discover) | 'legacy'(2025 initialize). */
export async function mcpConnect(era = 'modern', {ip} = {}) {
  const fetch = (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set('x-forwarded-for', ip ?? `10.8.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`);
    return mcpFetch(url, {...init, headers});
  };
  const client = new Client({name: 'channel-test', version: '1.0.0'}, era === 'modern' ? {versionNegotiation: {mode: {pin: '2026-07-28'}}} : {});
  await client.connect(new StreamableHTTPClientTransport(new URL('http://channel.test/api/mcp'), {fetch}));
  return client;
}

// ------------------------------------------------------------ 채널 어댑터: 검증과 컴파일을 같은 모양으로 낸다
/** @typedef {{ok: boolean, errors: {code: string, path: string, message: string}[]}} Verdict */
const flat = errors => (errors ?? []).map(e => ({code: e.code, path: e.path, message: e.message}));
const verdictOf = env => ({ok: env.ok, errors: env.ok ? [] : flat(env.errors)});

export function cliChannel(dir) {
  let n = 0;
  const kit = args => spawnSync(process.execPath, ['scripts/kit.mjs', ...args], {cwd: root, encoding: 'utf8'});
  const parseLines = text => text.split('\n').filter(Boolean).map(line => { const m = /^(\S+) \[([A-Z0-9_]+)\] (.*)$/.exec(line); return m ? {code: m[2], path: m[1], message: m[3]} : {code: '?', path: '?', message: line}; });
  const write = value => { const file = join(dir, `bp-${++n}.json`); writeFileSync(file, JSON.stringify(value)); return file; };
  return {
    name: 'cli',
    validate(value) {
      const r = kit(['validate', write(value)]);
      return r.status === 0 ? {ok: true, errors: []} : {ok: false, errors: parseLines(r.stderr), raw: r.stderr};
    },
    compile(value) {
      const out = join(dir, `out-${n + 1}`);
      const r = kit(['build', write(value), '--out', out]);
      if (r.status !== 0) return {ok: false, errors: parseLines(r.stderr.replace(/^Invalid blueprint:\n/, '')), raw: r.stderr};
      const html = readFileSync(join(out, 'index.html'), 'utf8'), manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
      return {ok: true, errors: [], htmlSha: sha256(html), integrity: manifest.integrity.files};
    },
  };
}

export const serviceChannel = {
  name: 'service',
  validate: value => verdictOf(validateBlueprint(value)),
  compile(value) {
    const env = compileBlueprint(value, {include: ['html', 'manifest'], hash: {algorithm: 'sha256', digest: sha256}});
    return env.ok ? {ok: true, errors: [], htmlSha: sha256(env.value.html), integrity: env.value.manifest.integrity.files} : verdictOf(env);
  },
};

export const restChannel = {
  name: 'rest',
  async validate(value) { const r = await rest('POST', '/api/v1/validate', {body: {blueprint: value}}); return {...verdictOf(r.json), status: r.status}; },
  async compile(value) {
    const r = await rest('POST', '/api/v1/compile', {body: {blueprint: value, include: ['html', 'manifest']}});
    return r.json.ok ? {ok: true, errors: [], htmlSha: sha256(r.json.value.html), integrity: r.json.value.manifest.integrity.files, status: r.status} : {...verdictOf(r.json), status: r.status};
  },
};

/** MCP 채널. 클라이언트는 호출하는 쪽이 만들어 넘긴다. */
export const mcpChannel = client => ({
  name: 'mcp',
  async validate(value) { const r = await client.callTool({name: 'validate_blueprint', arguments: {blueprint: value}}); return {...verdictOf(r.structuredContent), isError: r.isError}; },
  async compile(value) {
    const r = await client.callTool({name: 'compile_design', arguments: {blueprint: value, include: ['html', 'manifest'], html: 'full'}});
    const env = r.structuredContent;
    return env.ok ? {ok: true, errors: [], htmlSha: sha256(env.value.html), integrity: env.value.manifest.integrity.files, isError: r.isError} : {...verdictOf(env), isError: r.isError};
  },
});

export {existsSync, mkdirSync};
