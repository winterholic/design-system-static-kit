// 시작 상태 계산. 저장된 문서, 옛 조립기 키, URL 시작 인자를 한 번에 합쳐 리듀서에 넘길 상태를 만든다.
// 저장 상태는 신뢰하지 않는다: 문서는 Core(importBlueprint)가 다시 검증하고, 실패하면 덮어쓰지 않고 복구 경로를 준다.
import {core} from './core';
import {perform, type BootState} from './model';
import type {ShareDecoded} from './share';
import type {Loaded, LiveHistory} from './storage';
import {parseSaved} from './storage';
import {isDisposable} from './protect';
import type {ParsedUrl} from './url';
import type {Blueprint, Diagnostic, NodePath, Origin, Picks} from './types';

const summarize = (errors: Diagnostic[]) => errors.slice(0, 3).map(e => `${e.path} ${e.message}`).join(' / ');

/** 공유 링크(주소 해시)와 같은 문서인가. 두 문서 모두 Core(importBlueprint)를 거친 값이라 키 순서가 같다. */
const sameDoc = (a: Blueprint, b: Blueprint) => JSON.stringify(a) === JSON.stringify(b);

export type BootOptions = {
  /** 주소 해시의 공유 링크를 읽은 결과. 해시가 없으면 null. */
  shared?: ShareDecoded | null;
  /** 새로고침·뒤로 가기로 다시 연 것이면 true. 이때 저장된 작업이 있으면 해시보다 저장된 작업을 쓴다(해시가 한 박자 늦을 수 있다). */
  sameSession?: boolean;
};

export function computeBoot(parsed: ParsedUrl, stored: Loaded, options: BootOptions = {}): BootState {
  const notices: BootState['notices'] = [];
  let doc: Blueprint | null = null, origin: Origin = null, picked: Picks = {}, selection: NodePath = [], modified = false;
  let recovery: BootState['recovery'] = null, storage: BootState['storage'] = {status: 'idle'};
  let dialog: BootState['view']['dialog'] = null;
  let history: LiveHistory | null = null;
  let replaced = false;

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
        if (p.history) history = p.history;
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

  const shared = options.shared;
  if (shared) {
    if (!shared.ok) {
      notices.push({level: 'error', text: `공유 링크를 열지 못했습니다: ${shared.reason}`});
    } else {
      const incoming = shared.payload;
      const r = core().edit.applyOp(null, 'importBlueprint', {blueprint: incoming.doc});
      if (!r.ok) notices.push({level: 'error', text: '공유 링크의 문서가 검증을 통과하지 못해 열지 않았습니다.', details: r.errors});
      else if (doc && options.sameSession) {
        // 새로고침: 저장된 작업(실행 취소 기록 포함)이 같은 세션의 원본이다.
      } else if (doc && sameDoc(doc, r.doc)) {
        // 같은 작업을 가리키는 링크다. 저장된 선택과 기록을 그대로 쓴다.
      } else if (doc && !isDisposable({doc, origin, picked, modified})) {
        // 이 브라우저에 작업 중인 문서가 있으면 덮어쓰기 전에 묻는다. 확인 전에는 링크의 문서를 적용하지 않는다.
        dialog = {kind: 'confirm', action: {kind: 'shared', payload: {...incoming, doc: r.doc}}};
      } else {
        doc = r.doc; origin = incoming.origin; picked = incoming.picked; selection = []; modified = incoming.modified;
        replaced = true;
      }
    }
  }

  if (parsed.problems.length) {
    notices.push({level: 'error', text: 'URL의 시작 상태 인자를 읽지 못해 적용하지 않았습니다.', details: parsed.problems});
  } else if (parsed.start && dialog) {
    notices.push({level: 'warning', text: '공유 링크가 열려 있어 주소의 시작 인자는 적용하지 않았습니다.'});
  } else if (parsed.start) {
    if (doc && !isDisposable({doc, origin, picked, modified})) {
      // 작업 중인 문서가 있으면 덮어쓰기 전에 묻는다. 확인 전에는 URL 요청을 적용하지 않는다.
      dialog = {kind: 'confirm', action: {kind: 'start', request: parsed.start}};
    } else {
      const out = perform({doc, origin, picked, selection}, {kind: 'start', request: parsed.start});
      if (out.res.ok) {
        doc = out.res.doc; origin = out.origin; picked = out.picked; selection = out.selection; modified = false;
        replaced = true;
      } else notices.push({level: 'error', text: 'URL로 요청한 시작 상태를 열 수 없어 적용하지 않았습니다.', details: out.res.errors});
    }
  }

  // 문서를 이 부팅에서 바꿨다면 저장된 기록은 다른 문서의 것이다. 기록을 비우고 새 문서를 기준으로 삼는다.
  const restored = !replaced && history ? {baseline: history.baseline, undo: history.undo, redo: history.redo} : replaced ? {baseline: doc, undo: [], redo: []} : {};
  return {phase: doc ? 'ready' : 'start', doc, origin, picked, selection, modified, ...restored, view: {...parsed.view, dialog}, notices, recovery, storage};
}
