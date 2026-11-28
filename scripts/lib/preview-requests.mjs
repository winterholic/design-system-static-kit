// 사전 생성이 보내는 요청. 웹 화면이 같은 자리에서 보내는 요청과 같아야 같은 캐시 키가 나온다(tests/platform-pregenerate.test.mjs 가 확인한다).
import {listPlatformMaterials} from '../../src/service/index.mjs';
import {SAMPLES} from '../../apps/web/features/platform/samples.ts';

/** listPlatformMaterials 는 한 번에 200개까지라서 cursor 를 따라 이어 받는다(팔레트가 200종 이상이 되어도 빠지지 않게). */
export function allPlatformMaterials(kind) {
  const out = [];
  for (let cursor; ;) {
    const r = listPlatformMaterials({kind, limit: 200, ...(cursor ? {cursor} : {})});
    if (!r.ok) throw new Error(`listPlatformMaterials(${kind}): ${r.errors[0]?.message}`);
    out.push(...r.value.items);
    if (!r.value.nextCursor) return out;
    cursor = r.value.nextCursor;
  }
}

/** apps/web/features/platform/assemble-state.ts 의 requestOf(state) 가 사례 state 로 만드는 요청 */
export const caseRequest = ({state: s}) => ({
  purpose: s.purpose, candidates: 1,
  ...(s.palette ? {palette: `palette:${s.palette}`} : {}), ...(s.set ? {subtokenSet: `subtoken-set:${s.set}`} : {}),
  ...(s.type ? {typeSystem: `type-system:${s.type}`} : {}), ...(s.family ? {families: [`family:${s.family}`]} : {}),
});

/** apps/web/app/components/page.tsx 의 PurposeSection 이 목적 패밀리 카드에 보내는 요청 */
export const purposeRequest = f => ({
  context: f.contexts[0] === 'any' ? 'general' : f.contexts[0], mode: 'light',
  items: [{purpose: f.id, visual: 'family:soft', variant: f.example.variant, props: f.example.props, content: f.example.content}],
});

/** apps/web/features/platform/TypeCompare.tsx 의 기본 보기(문서 샘플, 라이트) 요청 */
export const typeRequest = typeId => ({purpose: SAMPLES.doc.purpose, content: SAMPLES.doc.content, typeSystem: typeId, mode: 'light', candidates: 1});
