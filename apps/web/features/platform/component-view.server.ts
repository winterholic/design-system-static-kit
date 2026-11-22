import 'server-only';
import {assembleComponents} from './platform.server';
import type {PurposeFamily} from './types';

// 목적 패밀리 상세의 상태와 선택지 판정. 판정은 Core 서비스에 시험 렌더를 던져 거부 여부와 이유를 받는 것이고, 규칙은 여기 없다.
export type CQ = {
  visual: string; variant: Record<string, string>; props: Record<string, string>; content: Record<string, string>;
  palette: string | null; set: string | null; type: string | null; mode: 'light' | 'dark'; device: 390 | 1280;
};
export const VISUALS = ['quiet', 'soft', 'bold', 'editorial'] as const;
const SAFE = /^[a-z0-9][a-z0-9-]{0,40}$/;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** 요구한 값이 허용 목록에 있을 때만 쓴다. 알 수 없는 값은 기본값으로 읽는다(주소가 임의 값을 서비스에 넘기지 않는다). */
export function readCQ(sp: SP, fam: PurposeFamily): CQ {
  const pickOf = (axes: Record<string, string[]>, prefix: string) => Object.fromEntries(Object.entries(axes).map(([axis, values]) => {
    const asked = one(sp[`${prefix}_${axis}`]);
    return [axis, asked && values.includes(asked) ? asked : fam.defaults[axis] ?? values[0]];
  }));
  const content: Record<string, string> = {};
  for (const [field, spec] of Object.entries(fam.content)) {
    const v = one(sp[`c_${field}`]);
    if ((spec.type === 'string' || spec.type === 'string[]') && v !== null && v.length <= 200) content[field] = v;
  }
  const v = one(sp.visual);
  const pal = one(sp.palette), set = one(sp.set), type = one(sp.type);
  return {
    visual: v && (VISUALS as readonly string[]).includes(v) ? v : 'soft',
    variant: pickOf(fam.variants, 'v'), props: pickOf(fam.props, 'p'), content,
    palette: pal && SAFE.test(pal) ? pal : null, set: set && SAFE.test(set) ? set : null, type: type && SAFE.test(type) ? type : null,
    mode: one(sp.mode) === 'dark' ? 'dark' : 'light', device: one(sp.device) === '390' ? 390 : 1280,
  };
}

export const contextOf = (fam: PurposeFamily) => (fam.contexts[0] === 'any' ? 'general' : fam.contexts[0]);

export function contentOf(fam: PurposeFamily, cq: CQ): Record<string, unknown> {
  const out: Record<string, unknown> = {...fam.example.content};
  for (const [field, text] of Object.entries(cq.content)) out[field] = fam.content[field].type === 'string[]' ? text.split('|').map(x => x.trim()).filter(Boolean) : text;
  return out;
}

export function requestFor(fam: PurposeFamily, cq: CQ, visual = cq.visual) {
  return {
    context: contextOf(fam), mode: cq.mode,
    ...(cq.palette ? {palette: `palette:${cq.palette}`} : {}), ...(cq.set ? {subtokenSet: `subtoken-set:${cq.set}`} : {}), ...(cq.type ? {typeSystem: `type-system:${cq.type}`} : {}),
    items: [{purpose: fam.id, visual: `family:${visual}`, variant: cq.variant, props: cq.props, content: contentOf(fam, cq)}],
  };
}

export type Probe = {ok: true} | {ok: false; reason: string};
export function probe(fam: PurposeFamily, cq: CQ, patch: Partial<CQ> | ((c: CQ) => CQ)): Probe {
  const next = typeof patch === 'function' ? patch(cq) : {...cq, ...patch};
  const r = assembleComponents(requestFor(fam, next));
  return r.ok ? {ok: true} : {ok: false, reason: r.errors.map(e => e.message).join(' ')};
}

/** 현재 선택이 거부되면 허용되는 가장 가까운 선택으로 조정하고, 무엇을 왜 바꿨는지 돌려준다. */
export function adjust(fam: PurposeFamily, cq: CQ): {cq: CQ; notes: string[]} {
  const notes: string[] = [];
  let cur = cq;
  for (let i = 0; i < 6; i++) {
    const r = assembleComponents(requestFor(fam, cur));
    if (r.ok) return {cq: cur, notes};
    const why = r.errors.map(e => e.message).join(' ');
    const tries: [string, CQ][] = [
      ...Object.keys(fam.props).filter(a => cur.props[a] !== fam.defaults[a]).map(a => [`${a}=${cur.props[a]}`, {...cur, props: {...cur.props, [a]: fam.defaults[a]}}] as [string, CQ]),
      ...Object.keys(fam.variants).filter(a => cur.variant[a] !== fam.defaults[a]).map(a => [`${a}=${cur.variant[a]}`, {...cur, variant: {...cur.variant, [a]: fam.defaults[a]}}] as [string, CQ]),
      ...VISUALS.filter(v => v !== cur.visual).map(v => [`시각 패밀리 ${cur.visual}`, {...cur, visual: v}] as [string, CQ]),
    ];
    const hit = tries.find(([, c]) => assembleComponents(requestFor(fam, c)).ok);
    if (!hit) return {cq: cur, notes};
    notes.push(`${hit[0]}는 함께 쓸 수 없어 자동으로 조정했습니다: ${why}`);
    cur = hit[1];
  }
  return {cq: cur, notes};
}

export function cqHref(base: string, fam: PurposeFamily, cq: CQ, patch: Partial<CQ> = {}): string {
  const n = {...cq, ...patch};
  const q = new URLSearchParams();
  if (n.visual !== 'soft') q.set('visual', n.visual);
  for (const a of Object.keys(fam.variants)) if (n.variant[a] !== fam.defaults[a]) q.set(`v_${a}`, n.variant[a]);
  for (const a of Object.keys(fam.props)) if (n.props[a] !== fam.defaults[a]) q.set(`p_${a}`, n.props[a]);
  for (const [f, t] of Object.entries(n.content)) q.set(`c_${f}`, t);
  if (n.palette) q.set('palette', n.palette);
  if (n.set) q.set('set', n.set);
  if (n.type) q.set('type', n.type);
  if (n.mode !== 'light') q.set('mode', n.mode);
  if (n.device !== 1280) q.set('device', String(n.device));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
