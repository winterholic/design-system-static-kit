// 스파이크 전용(03-interfaces.md 3.2절). ./service 가 병합되면 이 파일의 import 를 service 로 바꾸고
// ./compiler, ./catalog 내보내기를 루트 package.json 에서 뺀다. 04-web-spike.md 참고.
import {compile} from '@winterholic/design-system-static-kit/compiler';
import {createBlueprint} from '@winterholic/design-system-static-kit/catalog';
import {resetDocument} from '@winterholic/design-system-static-kit/edit';

export const SPIKE_TEMPLATE = 'saas-landing';

export function compileHtml(): string {
  return compile(createBlueprint(SPIKE_TEMPLATE)).html;
}

/** ./edit 진입점으로 만든 문서가 createBlueprint 와 같은 HTML 을 내는지 확인한다. */
export function compileHtmlViaEdit(): string | null {
  const r = resetDocument(null, {template: SPIKE_TEMPLATE});
  return r.ok ? compile(r.doc).html : null;
}
