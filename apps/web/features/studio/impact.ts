// 적용 전 영향 요약(web-ia.md "사용자 편집 덮어쓰기 전 영향 표시"). 변경을 순수 함수 perform 으로 미리 계산해 두고,
// Core 의 diffDocs·contentDiff·compileBlueprint 결과로 무엇이 바뀌는지 보여 준다. 판정은 Core가 하고 여기서 새로 만들지 않는다.
import type {Core} from './core';
import {perform, type Context, type Intent} from './model';
import type {Blueprint} from './types';

export type ColorShift = {mode: string; changed: number; total: number};
export type ImpactReport = {
  /** 사람이 읽는 변경 이름. 대화상자 제목에 쓴다. */
  subject: string;
  versionBump: {from: string; to: string} | null;
  /** 바뀌는 문서 필드(최대 8개)와 전체 개수 */
  changed: {path: string; label: string}[];
  changeCount: number;
  colorShifts: ColorShift[];
  /** 지금 문서가 기준 문서(처음 열었을 때)와 달라진 곳의 수. 0이면 손댄 곳이 없다. */
  userEdits: number;
  /** 적용 뒤 사라지는 콘텐츠 항목 수 */
  contentLoss: number;
  /** 이 문서의 팔레트 선택이 색에 더는 쓰이지 않을 때의 설명 */
  paletteNote: string | null;
};

const FIELD_LABEL: Record<string, string> = {
  catalogVersion: '문서 버전', colorPalette: '색 재료', typeRoles: '역할 타이포그래피', profile: 'Design Profile',
};
const SUBJECT: Record<string, string> = {colorPalette: '색 재료', typeRoles: '역할 타이포그래피', profile: 'Design Profile'};

/** 구 문서(2.6.0 미만)를 2.6.0 재료 필드로 올리는 변경인가. 이때만 확인이 필요하다. */
export function needsImpact(intent: Intent, doc: Blueprint | null): boolean {
  if (!doc || doc.catalogVersion === '2.6.0') return false;
  return intent.kind === 'upgrade260' || intent.kind === 'setMaterial';
}

const labelOf = (path: string) => {
  const top = path.replace(/^\$\./, '').split(/[.[]/)[0];
  return FIELD_LABEL[top] ?? path;
};

function colorShifts(core: Core, before: Blueprint, after: Blueprint): ColorShift[] {
  const a = core.service.compileBlueprint(before, {include: ['tokens']});
  const b = core.service.compileBlueprint(after, {include: ['tokens']});
  if (!a.ok || !b.ok || !a.value.tokens || !b.value.tokens) return [];
  const out: ColorShift[] = [];
  for (const mode of new Set([...Object.keys(a.value.tokens), ...Object.keys(b.value.tokens)])) {
    const x = a.value.tokens[mode] ?? {}, y = b.value.tokens[mode] ?? {};
    const names = new Set([...Object.keys(x), ...Object.keys(y)]);
    let changed = 0;
    for (const name of names) if (x[name] !== y[name]) changed++;
    out.push({mode, changed, total: names.size});
  }
  return out;
}

/** 변경을 미리 계산해 영향 요약을 만든다. 변경이 거부되면 null(그대로 적용을 시도해 오류를 보여 준다). */
export function analyzeImpact(core: Core, ctx: Context & {baseline: Blueprint | null}, intent: Intent): ImpactReport | null {
  const before = ctx.doc;
  if (!before) return null;
  const out = perform(ctx, intent);
  if (!out.res.ok) return null;
  const after = out.res.doc;
  const diff = core.edit.diffDocs(before, after);
  const shifts = colorShifts(core, before, after);
  const from = String(before.catalogVersion), to = String(after.catalogVersion);
  const touched = shifts.some(s => s.changed > 0);
  const own = typeof before.palette === 'string' ? before.palette : null;
  return {
    subject: intent.kind === 'setMaterial' ? SUBJECT[intent.field] ?? '재료' : '2.6.0 재료',
    versionBump: from !== to ? {from, to} : null,
    changed: diff.slice(0, 8).map(d => ({path: d.path, label: labelOf(d.path)})),
    changeCount: diff.length,
    colorShifts: shifts,
    userEdits: ctx.baseline ? core.edit.diffDocs(ctx.baseline, before).length : 0,
    contentLoss: core.edit.contentDiff(before, after).missing.length,
    paletteNote: touched && own && typeof after.colorPalette === 'string' ? `이 문서의 팔레트 선택(${own})은 2.6.0 문서에서 색에 쓰이지 않고, 내부 색 재료(${after.colorPalette})에서 색이 정해집니다.` : null,
  };
}
