// 조립 흐름의 상태 = 조립 요청의 짧은 표기. 주소(쿼리)와 요청(재료 id 접두)을 오간다. Materials·Components 의 "Studio에서 쓰기" 가 같은 표기를 쓴다.
import type {AssembleRequest} from './types';
import {PURPOSES} from './labels';

export type AssembleState = {
  purpose: string | null; style: string | null; palette: string | null; set: string | null; type: string | null; family: string | null;
  mode: 'light' | 'dark' | null; step: Step;
  /** Components 에서 넘어온 기반 컴포넌트(짧은 id)와 시각 패밀리, 카드 제목. 페이지 슬롯에 3개로 놓는다(격자는 2칸 이상). */
  component: string | null; cvisual: string | null; ctitle: string | null;
  shell: string | null; width: string | null; density: string | null; device: 390 | 1280;
  /** 표면·모션·배경·미디어 재료(짧은 id)와 상태 패턴(`슬롯.짧은id`). 스타일 맥락이 고르는 값을 직접 정한다. */
  surface: string | null; motion: string | null; background: string | null; media: string | null; spat: string | null;
  /** 사용자가 고친 콘텐츠(이름·제목·소개). 요청의 content 로 들어간다. */
  content: Record<string, string>;
  /** 다른 페이지 유형으로 바꾸기 전 확인을 기다리는 값 */
  pending: string | null;
};
export const CONTENT_FIELDS = [['name', '서비스 이름'], ['title', '제목'], ['lead', '소개 문장']] as const;
export const STEPS = ['purpose', 'direction', 'compare', 'swap', 'content', 'export'] as const;
export type Step = (typeof STEPS)[number];
export const STEP_LABEL: Record<Step, string> = {purpose: '페이지 유형', direction: '디자인 방향', compare: '후보 비교', swap: '재료 교체', content: '콘텐츠', export: '내보내기'};

const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const pick = (q: URLSearchParams, key: string) => { const v = q.get(key); return v && ID.test(v) ? v : null; };

export function readState(q: URLSearchParams): AssembleState {
  const purpose = pick(q, 'purpose');
  const step = q.get('step') as Step | null;
  const mode = q.get('mode');
  return {
    purpose: PURPOSES.some(p => p.id === purpose) ? purpose : null,
    style: pick(q, 'style'), palette: pick(q, 'palette'), set: pick(q, 'set'), type: pick(q, 'type'), family: pick(q, 'family'),
    mode: mode === 'dark' || mode === 'light' ? mode : null,
    surface: pick(q, 'surface'), motion: pick(q, 'motion'), background: pick(q, 'background'), media: pick(q, 'media'),
    spat: /^(empty|loading|error|success)\.[a-z0-9-]{1,40}$/.test(q.get('spat') ?? '') ? q.get('spat') : null,
    shell: pick(q, 'shell'), width: pick(q, 'width'), density: pick(q, 'density'), device: q.get('device') === '390' ? 390 : 1280,
    content: Object.fromEntries(CONTENT_FIELDS.flatMap(([f]) => { const v = q.get(`c_${f}`); return v && v.length <= 200 ? [[f, v]] : []; })),
    pending: PURPOSES.some(p => p.id === q.get('pending')) ? q.get('pending') : null,
    component: pick(q, 'component'), cvisual: pick(q, 'cvisual'), ctitle: (q.get('ctitle') ?? '').slice(0, 40) || null,
    step: step && (STEPS as readonly string[]).includes(step) ? step : 'purpose',
  };
}

export function writeState(state: Partial<AssembleState>): string {
  const q = new URLSearchParams();
  for (const key of ['purpose', 'style', 'palette', 'set', 'type', 'family', 'mode', 'component', 'cvisual', 'ctitle', 'shell', 'width', 'density', 'pending', 'surface', 'motion', 'background', 'media', 'spat'] as const) if (state[key]) q.set(key, state[key]!);
  if (state.device === 390) q.set('device', '390');
  for (const [f, v] of Object.entries(state.content ?? {})) q.set(`c_${f}`, v);
  if (state.step && state.step !== 'purpose') q.set('step', state.step);
  const s = q.toString();
  return '/studio/assemble' + (s ? `?${s}` : '');
}

/** 요청에 쓰는 재료 id(접두 붙임). */
export function requestOf(state: AssembleState, candidates = 1): AssembleRequest | null {
  const content = contentRequest(state.purpose, state.content);
  if (!state.purpose) return null;
  return {
    purpose: state.purpose, candidates,
    ...(state.style ? {styleContext: `style-context:${state.style}`} : {}),
    ...(state.palette ? {palette: `palette:${state.palette}`} : {}),
    ...(state.set ? {subtokenSet: `subtoken-set:${state.set}`} : {}),
    ...(state.type ? {typeSystem: `type-system:${state.type}`} : {}),
    ...(state.family ? {families: [`family:${state.family}`]} : {}),
    ...(state.mode ? {mode: state.mode} : {}),
    ...(state.surface ? {surface: `surface:${state.surface}`} : {}), ...(state.motion ? {motion: `motion:${state.motion}`} : {}),
    ...(state.background ? {background: `background:${state.background}`} : {}), ...(state.media ? {media: `media:${state.media}`} : {}),
    ...(state.spat ? {states: {[state.spat.split('.')[0]]: `state-pattern:${state.spat.slice(state.spat.indexOf('.') + 1)}`}} : {}),
    ...(state.shell ? {shell: state.shell} : {}), ...(state.width ? {width: state.width} : {}), ...(state.density ? {density: state.density} : {}),
    ...(state.component ? {components: [1, 2, 3].map(n => ({base: `base-component:${state.component}`, ...(state.cvisual ? {family: `family:${state.cvisual}`} : {}), content: {id: `c${n}`, title: `${state.ctitle ?? '카드'} ${n}`, body: `${state.ctitle ?? '카드'} ${n} 내용`}}))} : {}),
    ...(content && Object.keys(content).length ? {content} : {}),
  };
}

/** 편집한 문구를 조립 요청의 content 로 옮긴다. 소개 문장은 문서·에디토리얼 유형이 lead, 나머지는 description 이다. */
export function contentRequest(purpose: string | null, edited: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (edited.name) out.name = edited.name;
  if (edited.title) out.title = edited.title;
  if (edited.lead) out[purpose === 'editorial-docs' ? 'lead' : 'description'] = edited.lead;
  return out;
}
