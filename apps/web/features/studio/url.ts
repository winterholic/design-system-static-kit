// /studio URL 계약(docs/dev/platform/05-studio-url.md). 시작 상태 인자는 한 번 소비하고 주소에서 지운다.
import type {Device, Diagnostic, Pane, StartRequest, Tab} from './types';
import {DEVICES, PANES, TABS} from './types';

export type UrlView = {tab: Tab; pane: Pane; device: Device};
export const DEFAULT_VIEW: UrlView = {tab: 'structure', pane: 'split', device: 1280};

const START_KEYS = ['template', 'theme', 'variant', 'palette', 'mode', 'layout', 'axes', 'catalogVersion', 'colorPalette', 'typeRoles', 'profile'] as const;
const PAIR_KEYS: ReadonlySet<string> = new Set(['layout', 'axes']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export type ParsedUrl = {start: StartRequest | null; view: UrlView; problems: Diagnostic[]};

const problem = (path: string, message: string, hint: string): Diagnostic => ({code: 'URL_PARAM', path, message, hint});

/** layout=hero:split,cards:outline → {hero:'split', cards:'outline'}. axes=radius:round,density:compact 도 같은 형식이다. */
function parsePairs(key: 'layout' | 'axes', text: string): {pairs: Record<string, string>} | {problem: Diagnostic} {
  const out: Record<string, string> = {};
  const example = key === 'layout' ? 'layout=hero:split,cards:outline' : 'axes=radius:round,density:compact';
  for (const part of text.split(',')) {
    const [name, value, ...extra] = part.split(':');
    if (!name || !value || extra.length || !ID.test(name) || !ID.test(value)) return {problem: problem(`$url.${key}`, `${key} 값을 읽을 수 없습니다: ${part}`, `${key}=이름:값,이름:값 형식입니다. 예: ${example}`)};
    out[name] = value;
  }
  return {pairs: out};
}

export function parseUrl(search: string): ParsedUrl {
  const q = new URLSearchParams(search);
  const problems: Diagnostic[] = [];
  const start: StartRequest = {};
  for (const key of START_KEYS) {
    const value = q.get(key);
    if (value === null) continue;
    if (key === 'layout' || key === 'axes') {
      const parsed = parsePairs(key, value);
      if ('problem' in parsed) problems.push(parsed.problem);
      else start[key] = parsed.pairs;
    } else if (key === 'catalogVersion' && value !== '2.6.0') problems.push(problem(`$url.${key}`, `시작 문서 버전은 2.6.0만 지정할 수 있습니다: ${value.slice(0, 40)}`, 'catalogVersion=2.6.0을 쓰거나 이 인자를 빼세요.'));
    else if (!ID.test(value)) problems.push(problem(`$url.${key}`, `${key} 값이 올바르지 않습니다: ${value.slice(0, 40)}`, '영문 소문자·숫자·하이픈으로 된 카탈로그 id를 쓰세요.'));
    else (start as Record<string, string>)[key] = value;
  }
  const view: UrlView = {...DEFAULT_VIEW};
  const tab = q.get('tab'), pane = q.get('pane'), device = q.get('device');
  if (tab && (TABS as readonly string[]).includes(tab)) view.tab = tab as Tab;
  if (pane && (PANES as readonly string[]).includes(pane)) view.pane = pane as Pane;
  if (device && (DEVICES as readonly number[]).includes(Number(device))) view.device = Number(device) as Device;
  return {start: Object.keys(start).length || problems.length ? start : null, view, problems};
}

/** 화면 상태 URL. 기본값은 생략해 `/studio`가 가장 짧은 주소가 되게 한다. 시작 상태 인자는 넣지 않는다. */
export function viewUrl(view: UrlView): string {
  const q = new URLSearchParams();
  if (view.tab !== DEFAULT_VIEW.tab) q.set('tab', view.tab);
  if (view.pane !== DEFAULT_VIEW.pane) q.set('pane', view.pane);
  if (view.device !== DEFAULT_VIEW.device) q.set('device', String(view.device));
  const s = q.toString();
  return '/studio' + (s ? '?' + s : '');
}

/** 시작 상태 요청을 URL로 만든다(Explore 등 다른 화면이 같은 형식으로 링크를 만들 때의 기준). */
export function startUrl(request: StartRequest): string {
  const q = new URLSearchParams();
  for (const key of START_KEYS) {
    const v = request[key];
    if (PAIR_KEYS.has(key) && v && typeof v === 'object') q.set(key, Object.entries(v).map(([s, o]) => `${s}:${o}`).join(','));
    else if (typeof v === 'string') q.set(key, v);
  }
  const s = q.toString();
  return '/studio' + (s ? '?' + s : '');
}
