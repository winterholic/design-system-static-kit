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
  jumpTo(diagnostic: Diagnostic): boolean;
  dismissError(): void;
  dismissNotice(id: number): void;
  exportJson(): void;
  exportHtml(): void;
  exportRecovery(): void;
  resetStorage(): void;
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
