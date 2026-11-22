// 시작 상태 계산. 저장된 문서, 옛 조립기 키, URL 시작 인자를 한 번에 합쳐 리듀서에 넘길 상태를 만든다.
// 저장 상태는 신뢰하지 않는다: 문서는 Core(importBlueprint)가 다시 검증하고, 실패하면 덮어쓰지 않고 복구 경로를 준다.
import {core} from './core';
import {perform, type BootState} from './model';
import type {Loaded} from './storage';
import {parseSaved} from './storage';
import {isDisposable} from './protect';
import type {ParsedUrl} from './url';
import type {Blueprint, Diagnostic, NodePath, Origin, Picks} from './types';

const summarize = (errors: Diagnostic[]) => errors.slice(0, 3).map(e => `${e.path} ${e.message}`).join(' / ');

export function computeBoot(parsed: ParsedUrl, stored: Loaded): BootState {
  const notices: BootState['notices'] = [];
  let doc: Blueprint | null = null, origin: Origin = null, picked: Picks = {}, selection: NodePath = [], modified = false;
  let recovery: BootState['recovery'] = null, storage: BootState['storage'] = {status: 'idle'};
  let dialog: BootState['view']['dialog'] = null;

  if (stored.kind === 'unavailable') {
    storage = {status: 'unavailable', message: stored.message};
  } else if (stored.kind === 'corrupt') {
    recovery = {raw: stored.raw, reason: stored.reason};
  } else if (stored.kind === 'saved') {
    const p = parseSaved(stored.data);
    if ('error' in p) recovery = {raw: stored.raw, reason: p.error};
    else {
      const r = core().edit.applyOp(null, 'importBlueprint', {blueprint: p.doc});
      if (!r.ok) recovery = {raw: stored.raw, reason: '저장된 문서가 검증을 통과하지 못했습니다: ' + summarize(r.errors)};
      else {
        doc = r.doc; origin = p.origin; picked = p.picked; selection = p.selection; modified = p.modified;
        for (const problem of p.problems) notices.push({level: 'warning', text: problem});
      }
    }
  } else if (stored.kind === 'legacy') {
    const r = core().edit.applyOp(null, 'importBlueprint', {blueprint: stored.blueprint});
    if (r.ok) {
      doc = r.doc; modified = true;
      notices.push({level: 'info', text: '이전 조립기의 작업을 가져왔습니다. 이전 저장값은 지우지 않고 그대로 두었습니다. 가져온 문서는 출처 템플릿을 알 수 없어 템플릿·구성 변형은 쓸 수 없습니다.'});
    } else notices.push({level: 'warning', text: '이전 조립기의 저장값을 가져오지 못했습니다. 이전 저장값은 그대로 남아 있습니다.', details: r.errors});
  }

  if (parsed.problems.length) {
    notices.push({level: 'error', text: 'URL의 시작 상태 인자를 읽지 못해 적용하지 않았습니다.', details: parsed.problems});
  } else if (parsed.start) {
    if (doc && !isDisposable({doc, origin, picked, modified})) {
      // 작업 중인 문서가 있으면 덮어쓰기 전에 묻는다. 확인 전에는 URL 요청을 적용하지 않는다.
      dialog = {kind: 'confirm', action: {kind: 'start', request: parsed.start}};
    } else {
      const out = perform({doc, origin, picked, selection}, {kind: 'start', request: parsed.start});
      if (out.res.ok) {
        doc = out.res.doc; origin = out.origin; picked = out.picked; selection = out.selection; modified = false;
      } else notices.push({level: 'error', text: 'URL로 요청한 시작 상태를 열 수 없어 적용하지 않았습니다.', details: out.res.errors});
    }
  }

  return {phase: doc ? 'ready' : 'start', doc, origin, picked, selection, modified, view: {...parsed.view, dialog}, notices, recovery, storage};
}
