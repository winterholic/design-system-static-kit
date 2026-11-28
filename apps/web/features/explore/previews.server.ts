import 'server-only';
import data from '../../../../site/previews/previews-data.json';
import {previewKeyOf, type PreviewTarget} from '@/lib/api/preview-keys.mjs';
import type {DesignRef} from './id';

// 빌드 시점에 Core 서비스 출력으로 만들어 둔 대표 미리보기(scripts/build-catalog-index.mjs)를 찾는다.
// 키는 화면이 그리려는 요청 자체에서 만든다(CONTRACTS §5.2). 요청이 다르면 키가 달라 다른 요청의 그림이 나올 수 없고, 없으면 null 이다.
type Item = {kind: string; id: string; path: string};
type Skipped = {kind: string; id: string; key: string | null; reason: string};
const items = data.items as Record<string, Item>;
const skipped = new Map((data.skipped as Skipped[]).filter(s => s.key).map(s => [s.key!, s.reason]));

/** 사전 생성된 정적 SVG 의 주소(파일명이 캐시 키라서 내용이 바뀌면 이름이 바뀐다. 그래서 immutable 로 낸다). */
export function previewSrc(target: PreviewTarget): string | null {
  return items[previewKeyOf(target)]?.path ?? null;
}

/** 사전 생성 때 조립이 거부된 요청이면 그 이유. 이 요청의 미리보기는 만들 수 없으므로 화면은 컴파일을 시도하지 않고 이유를 보인다. */
export function previewRefusal(target: PreviewTarget): string | null {
  return skipped.get(previewKeyOf(target)) ?? null;
}

/**
 * 사전 생성 때 이미 조립해 본 요청이면 다시 조립하지 않고 결과(가능/불가와 이유)를 돌려준다. 처음 보는 요청이면 null.
 * 목록이 선택지마다 조립해 보는 검사(probeDesign)가 목록 요청에서 Core 컴파일을 되풀이하지 않게 한다.
 */
export function pregeneratedProbe(request: Record<string, unknown>): {ok: true} | {ok: false; reason: string} | null {
  const key = previewKeyOf({kind: 'assemble', request, width: 1280});
  if (items[key]) return {ok: true};
  const reason = skipped.get(key);
  return reason === undefined ? null : {ok: false, reason};
}

/** 대표 디자인의 사전 생성 대상. curatedDesignRefs 의 ref 와 같은 필드만 고른다(그 밖의 라벨 필드는 요청이 아니다). */
export function designTarget(d: DesignRef): PreviewTarget {
  const {template, theme, variant, palette, mode, layout} = d;
  return {kind: 'design', ref: {template, ...(theme ? {theme} : {}), ...(variant ? {variant} : {}), ...(palette ? {palette} : {}), ...(mode ? {mode} : {}), ...(layout ? {layout} : {})}};
}
