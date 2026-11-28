import 'server-only';
import * as service from '@winterholic/design-system-static-kit/service';
import * as edit from '@winterholic/design-system-static-kit/edit';
import {chartNodeOf, COMPARABLE_CHART_KINDS} from './chart-compare.mjs';
import type {Material} from './types';

const api = service as unknown as Record<string, (...args: any[]) => any>;
let choicesCache: {id: string; label: string}[] | null = null;

export function chartPresetChoices(): {id: string; label: string}[] {
  if (choicesCache) return choicesCache;
  const page = api.listMaterials({kind: 'chart-preset', since: '2.6.0', fields: ['id', 'label'], limit: 200});
  if (!page?.ok) return [];
  const listed = page.value.items as {id: string; label: string}[];
  const choices = listed.flatMap(item => {
    const detail = api.getMaterial({id: item.id});
    return detail?.ok && COMPARABLE_CHART_KINDS.has(detail.value.ext?.chartKind) ? [{id: item.id, label: item.label}] : [];
  });
  choicesCache = choices;
  return choices;
}

export function chartPresetPreview(id: string): {ok: true; html: string} | {ok: false; reason: string} {
  if (!chartPresetChoices().some(item => item.id === id)) return {ok: false, reason: '이 차트는 현재 같은 데이터 비교에서 지원하는 막대·선·영역 형태가 아닙니다.'};
  const detail = api.getMaterial({id});
  if (!detail?.ok) return {ok: false, reason: 'Core 차트 재료 레지스트리에서 재료를 찾지 못했습니다.'};
  const node = chartNodeOf(detail.value as Material);
  if (!node) return {ok: false, reason: '이 차트 재료의 형태를 비교할 수 없습니다.'};
  const reset = edit.applyOp(null, 'resetDocument', {template: 'dashboard-overview', discard: true});
  if (!reset.ok) return {ok: false, reason: reset.errors.map((error: {message: string}) => error.message).join(' ')};
  const upgraded = edit.applyOp(reset.doc, 'importBlueprint', {blueprint: {...reset.doc, catalogVersion: '2.6.0', colorPalette: 'static-kit'}, upgrade: true, discard: true});
  if (!upgraded.ok) return {ok: false, reason: upgraded.errors.map((error: {message: string}) => error.message).join(' ')};
  const inserted = edit.applyOp(upgraded.doc, 'insertNode', {parent: [], node, index: upgraded.doc.tree.children.length});
  if (!inserted.ok) return {ok: false, reason: inserted.errors.map((error: {message: string}) => error.message).join(' ')};
  const compiled = api.compileBlueprint(inserted.doc, {include: ['standalone']});
  if (!compiled?.ok || typeof compiled.value?.standalone !== 'string') return {ok: false, reason: compiled?.errors?.map((error: {message: string}) => error.message).join(' ') ?? 'Core가 미리보기를 만들지 못했습니다.'};
  return {ok: true, html: compiled.value.standalone};
}
