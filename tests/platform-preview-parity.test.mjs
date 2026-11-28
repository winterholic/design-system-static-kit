// 사전 생성(scripts/build-catalog-index.mjs)이 보내는 사례 요청이 웹 Explore 가 보내는 요청과 같은지 확인한다.
// 같지 않으면 캐시 키가 달라져 목록 카드가 정적 미리보기를 못 찾는다(그 경우 카드는 동적 SVG 로 내려가 "목록 요청 컴파일 0회"가 깨진다).
import assert from 'node:assert/strict';
import {register} from 'node:module';
import test from 'node:test';
import {canonicalize} from '../apps/web/lib/api/cache.mjs';
import {previewKeyOf} from '../apps/web/lib/api/preview-keys.mjs';
import {caseRequest} from '../scripts/lib/preview-requests.mjs';

// 웹의 순수 TS(assemble-state.ts 는 확장자 없는 상대 import 를 쓴다)를 Studio 단위 시험과 같은 로더로 읽는다.
register('../apps/web/features/studio/node-ts-loader.mjs', import.meta.url);
const {PLATFORM_CASES} = await import('../apps/web/features/platform/cases.ts');
const {readState, requestOf, writeState} = await import('../apps/web/features/platform/assemble-state.ts');

test('Explore 사례 카드가 보내는 요청 = 사전 생성이 만든 요청', () => {
  assert.ok(PLATFORM_CASES.length > 0);
  for (const k of PLATFORM_CASES) {
    // apps/web/app/explore/page.tsx 의 PlatformCases 와 같은 경로
    const state = readState(new URLSearchParams(writeState({...k.state, step: 'swap'}).split('?')[1]));
    const web = requestOf(state);
    assert.equal(canonicalize(web), canonicalize(caseRequest(k)), `${k.id}: 요청이 다르다`);
    assert.equal(previewKeyOf({kind: 'assemble', request: web}), previewKeyOf({kind: 'assemble', request: caseRequest(k)}));
  }
});

test('요청이 하나라도 다르면 키가 달라 다른 요청의 그림이 대신 나오지 않는다', () => {
  const [k] = PLATFORM_CASES;
  const request = caseRequest(k);
  assert.notEqual(previewKeyOf({kind: 'assemble', request: {...request, mode: 'dark'}}), previewKeyOf({kind: 'assemble', request}));
  assert.notEqual(previewKeyOf({kind: 'assemble', request: {...request, content: {title: 'x'}}}), previewKeyOf({kind: 'assemble', request}));
  assert.notEqual(previewKeyOf({kind: 'assemble', request, width: 390}), previewKeyOf({kind: 'assemble', request, width: 1280}));
});
