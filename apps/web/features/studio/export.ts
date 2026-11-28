// 내려받기. 문서는 바꾸지 않고, 내보내는 순간의 문서를 그대로 직렬화하거나 컴파일한다.
import type {Core} from './core';
import type {Blueprint, Diagnostic, Origin} from './types';
import {compileBlueprintWithCache} from './compiler';

export const jsonText = (doc: Blueprint) => JSON.stringify(doc, null, 2) + '\n';

/** 미리보기와 같은 compileBlueprint 호출이며 미리보기와 같은 캐시를 쓴다. 미리보기 전용 설정(기기·배율·색 보기)은 넣지 않는다. */
export function htmlText(core: Core, doc: Blueprint): {ok: true; html: string} | {ok: false; errors: Diagnostic[]} {
  const {result} = compileBlueprintWithCache(core, doc, 'document');
  return result.ok ? {ok: true, html: result.html} : {ok: false, errors: result.errors};
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
