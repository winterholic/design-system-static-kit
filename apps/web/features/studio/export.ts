// 내려받기. 문서는 바꾸지 않고, 내보내는 순간의 문서를 그대로 직렬화하거나 컴파일한다.
import type {Core} from './core';
import type {Blueprint, Diagnostic, Origin} from './types';

export const jsonText = (doc: Blueprint) => JSON.stringify(doc, null, 2) + '\n';

/** 미리보기와 같은 compileBlueprint 호출이다. 미리보기 전용 설정(기기·배율·색 보기)은 넣지 않는다. */
export function htmlText(core: Core, doc: Blueprint): {ok: true; html: string} | {ok: false; errors: Diagnostic[]} {
  const r = core.service.compileBlueprint(doc, {include: ['html']});
  return r.ok ? {ok: true, html: r.value.html as string} : {ok: false, errors: r.errors};
}

export const exportBaseName = (origin: Origin) => origin?.template ?? 'studio-document';

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
