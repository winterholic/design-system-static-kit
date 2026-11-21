/**
 * 콘텐츠 지문. 문서에서 사용자가 쓴 글·데이터 값만 뽑아 위치와 부품 종류와 무관하게 비교한다.
 * 편집 연산이 "내용은 그대로, 모양만 바뀐다"를 지켰는지 증명하는 한 곳의 정의다(테마·팔레트·모드·구성 변형 모두 이 지문이 같아야 한다).
 *
 * 프레임워크·DOM·Node 모듈에 의존하지 않는다. 해시는 해시 라이브러리 없이 계산하는 FNV-1a 64비트다(수정 감지용, 보안 목적 아님).
 */

/**
 * 구성 변형·테마 연산이 바꿀 수 있는 필드(모양). 이름만 보고 어느 부품에서든 지문에서 뺀다.
 * 이 목록 밖의 값은 전부 콘텐츠다: 글, 숫자, 링크, 표 셀, 차트 값, 폼 필드, 히어로 facts, 내비 항목 등.
 * 장식(그림 종류 visual·motif)도 모양에 넣는다. 지워도 문서의 정보는 줄지 않지만 연산은 지울 때 기록을 남긴다.
 */
export const PRESENTATION_FIELDS = Object.freeze(['type', 'variant', 'layout', 'columns', 'align', 'surface', 'side', 'reverse', 'visual', 'motif']);
const PRESENTATION = new Set(PRESENTATION_FIELDS);

const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);

function collect(value, key, out) {
  if (Array.isArray(value)) { for (const x of value) collect(x, key, out); return; }
  if (isObject(value)) { for (const [k, v] of Object.entries(value)) if (!PRESENTATION.has(k)) collect(v, k, out); return; }
  if (value !== undefined && value !== null) out.push(key + '=' + JSON.stringify(value));
}

/** 정렬된 콘텐츠 항목 목록. name, chrome, tree 안의 모든 값이 `필드명=값` 한 줄이다. */
export function contentEntries(doc) {
  const out = [];
  if (!isObject(doc)) return out;
  collect(doc.name, 'name', out);
  collect(doc.chrome, 'chrome', out);
  collect(doc.tree, 'tree', out);
  return out.sort();
}

/** FNV-1a 64비트를 16자리 hex로. */
export function fnv64(text) {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) { h ^= BigInt(text.charCodeAt(i)); h = BigInt.asUintN(64, h * 0x100000001b3n); }
  return h.toString(16).padStart(16, '0');
}

/** {count, hash}: 항목 수와 정렬된 항목 목록의 해시. 같은 콘텐츠면 같고, 항목이 하나라도 줄거나 바뀌면 달라진다. */
export function contentFingerprint(doc) {
  const entries = contentEntries(doc);
  return {count: entries.length, hash: fnv64(entries.join('\n'))};
}

/** 두 문서의 콘텐츠 차이: {missing: after에 없는 항목, added: after에만 있는 항목}(중복은 개수까지 센다). */
export function contentDiff(before, after) {
  const count = new Map();
  for (const e of contentEntries(after)) count.set(e, (count.get(e) ?? 0) + 1);
  const missing = [];
  for (const e of contentEntries(before)) { const n = count.get(e) ?? 0; if (n > 0) count.set(e, n - 1); else missing.push(e); }
  const added = [...count].flatMap(([e, n]) => Array(n).fill(e));
  return {missing, added};
}

/** after가 before의 콘텐츠를 하나도 잃지 않았다(추가는 허용). */
export const keepsContent = (before, after) => contentDiff(before, after).missing.length === 0;
/** 콘텐츠가 정확히 같다(잃지도 늘지도 않음). */
export const sameContent = (before, after) => { const d = contentDiff(before, after); return d.missing.length === 0 && d.added.length === 0; };
