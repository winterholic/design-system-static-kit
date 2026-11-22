'use client';
import {createContext, useContext} from 'react';
import type {Catalog} from './catalog';
import type {Core} from './core';
import type {Dialog, Intent, PendingAction, StudioState} from './model';
import type {Diagnostic, NodePath, Pane, Tab} from './types';
import type {UrlView} from './url';

export type StudioApi = {
  state: StudioState;
  core: Core | null;
  catalog: Catalog | null;
  /** 문서를 바꾸는 유일한 경로. 모든 변경은 src/edit 연산을 거친다. */
  edit(intent: Intent, coalesce?: string): void;
  select(path: NodePath, focusField?: string | null): void;
  /** 탭·창 배치·기기처럼 주소에 남는 화면 상태. push는 뒤로 가기가 되돌릴 수 있는 이동이다. */
  navigate(patch: Partial<UrlView>, mode: 'push' | 'replace'): void;
  setView(patch: Partial<Pick<StudioState['view'], 'scaleMode' | 'scheme'>>): void;
  undo(): void;
  redo(): void;
  openDialog(dialog: Dialog): void;
  closeDialog(): void;
  /** 수정된 작업이 있으면 확인 대화상자를 거치고, 없으면 바로 실행한다. */
  requestAction(action: PendingAction): void;
  confirmAction(action: PendingAction): void;
  /** 구 문서를 2.6.0 재료로 올리는 변경은 영향 요약을 먼저 보여 주고, 그 밖의 변경은 바로 적용한다. */
  editWithImpact(intent: Intent): void;
  /** 영향 요약 대화상자에서 적용을 눌렀을 때. */
  confirmImpact(intent: Intent): void;
  /** 주소를 클립보드에 복사한다. 작업이 해시에 담겨 있어 같은 주소로 같은 작업을 연다. */
  copyLink(): Promise<void>;
  jumpTo(diagnostic: Diagnostic): boolean;
  dismissError(): void;
  dismissNotice(id: number): void;
  exportJson(): void;
  exportHtml(): void;
  exportRecovery(): void;
  resetStorage(): void;
  /** 다른 탭의 저장 기록과 충돌했을 때: 이 탭의 내용으로 덮어쓴다. */
  overwriteStorage(): void;
  /** 다른 탭의 저장 기록과 충돌했을 때: 저장된 작업을 다시 읽는다. */
  reloadSaved(): void;
  /** 시작 화면에서 코어를 불러오며 동작을 이어 실행한다. */
  withCore(then: (core: Core) => void): void;
  compileCount: number;
};

export const StudioContext = createContext<StudioApi | null>(null);
export function useStudio(): StudioApi {
  const api = useContext(StudioContext);
  if (!api) throw new Error('StudioContext 밖에서 useStudio를 불렀습니다.');
  return api;
}
export type {Pane, Tab};
