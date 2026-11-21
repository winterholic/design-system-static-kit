// 사용자 작업 보호 규칙. 확인 대화상자(needsConfirm), 주소의 시작 인자(boot), 자동 저장 덮어쓰기(StudioApp)가 모두 이 한 규칙을 쓴다.
// 규칙 하나: 템플릿에서 만들었고 손대지 않았고 직접 고른 스타일 축이 없는 문서만 "버려도 되는 문서"다. 템플릿과 같은 입력으로 다시 만들 수 있기 때문이다.
// 가져온 문서(origin 없음)는 수정하지 않았어도 다시 만들 수 없으므로 사용자의 작업이다.
import type {Blueprint, Origin, Picks} from './types';

export type Work = {doc: Blueprint | null; origin: Origin; picked: Picks; modified: boolean};

/** 문서가 없거나 템플릿으로 다시 만들 수 있는 문서인가. true면 확인 없이 교체해도 사용자 작업을 잃지 않는다. */
export const isDisposable = (w: Work): boolean => !w.doc || (!w.modified && w.origin !== null && Object.keys(w.picked).length === 0);

/** 저장소에 있는 기록을 이 세션이 덮어써도 되는가. 이 세션이 읽었거나 직접 쓴 기록이면 되고, 다른 곳이 쓴 기록은 버려도 되는 문서일 때만 된다. */
export function mayOverwriteStored(knownSavedAt: string | null, stored: {savedAt: string | null; work: Work | null} | null): boolean {
  if (!stored) return true;
  if (stored.savedAt !== null && stored.savedAt === knownSavedAt) return true;
  return stored.work !== null && isDisposable(stored.work);
}
