import 'server-only';
import * as service from '@winterholic/design-system-static-kit/service';

const api = service as unknown as Record<string, (...args: any[]) => any>;
let choicesCache: {id: string; label: string}[] | null = null;

/** 등록된 chart preset 전부. 같은 데이터를 받을 수 있는지는 호출자가 Core 조립으로 시험한다(여기서 형태를 걸러 내지 않는다). */
export function chartPresetChoices(): {id: string; label: string}[] {
  if (choicesCache) return choicesCache;
  const page = api.listMaterials({kind: 'chart-preset', since: '2.6.0', fields: ['id', 'label'], limit: 200});
  if (!page?.ok) return [];
  choicesCache = page.value.items as {id: string; label: string}[];
  return choicesCache;
}
