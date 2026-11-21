// S2·S4 스파이크 코어 호출. 공개 진입점 ./service 와 ./edit 만 쓴다(04-web-spike.md).
import {compileBlueprint, listCatalog} from '@winterholic/design-system-static-kit/service';
import {resetDocument} from '@winterholic/design-system-static-kit/edit';

export const SPIKE_TEMPLATE = 'saas-landing';

/** ./edit 으로 템플릿 기본 문서를 만들고 ./service 로 컴파일한다. 실패하면 던진다(스파이크라서). */
export function compileFiles(digest: (text: string) => string): Record<string, string> {
  const doc = resetDocument(null, {template: SPIKE_TEMPLATE});
  if (!doc.ok) throw new Error('resetDocument 실패: ' + JSON.stringify(doc.errors));
  const r = compileBlueprint(doc.doc, {include: ['files'], hash: {algorithm: 'sha256', digest}});
  if (!r.ok) throw new Error('compileBlueprint 실패: ' + JSON.stringify(r.errors));
  return r.value.files as Record<string, string>;
}

export function templateCount(): number {
  const r = listCatalog({kind: 'templates', limit: 1});
  if (!r.ok) throw new Error('listCatalog 실패');
  return r.value.total as number;
}
