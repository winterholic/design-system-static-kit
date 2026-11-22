/** 목적 패밀리 조립·사용자 시드 제안의 Core 경계. 렌더·검사는 등록된 플랫폼 엔진을 재사용한다. */
import {assembleFamilies} from '../platform/families/index.mjs';
import {createPlatform} from '../platform/examples/minimal.mjs';
import {platformEnv} from '../platform/compile.mjs';
import {proposeSubtokenSets as propose} from '../platform/color.mjs';
import {formRuntime, controlRuntime, escapeHTML} from '../render.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';
import {diagnostic, hintFor} from './errors.mjs';

const PROPOSE_KEYS = ['seeds'];
const REQUEST_KEYS = ['context', 'mode', 'density', 'styleContext', 'palette', 'subtokenSet', 'typeSystem', 'seeds', 'items'];
const ITEM_KEYS = ['purpose', 'visual', 'variant', 'props', 'content', 'id'];
const diag = d => diagnostic(d.code, d.path ?? '$', d.message, hintFor(d.code), {severity: d.severity === 'error' ? undefined : d.severity});

/** 사용자 hex는 요청 동안만 사용한다. 레지스트리·파일·캐시에 기록하지 않는다. */
export function proposeSubtokenSets(args) {
  return guard(() => {
    if (!isPlain(args)) return fail([badRequest('$args', '요청은 {seeds} 객체여야 합니다.', '예: {seeds: ["#D2501E", "#6F625A", "#0D6E8E"]}')]);
    const unknown = checkKeys(args, PROPOSE_KEYS, '$args');
    if (unknown) return fail([unknown]);
    if (args.seeds === undefined) return fail([badRequest('$args.seeds', 'hex 시드 배열이 필요합니다.')]);
    const result = propose(args.seeds);
    if (!result.ok) return fail(result.errors.map(e => diag({...e, path: '$args.seeds'})));
    return ok(jsonClone(result));
  });
}

const paletteForSeeds = (seeds, setId) => {
  const proposal = propose(seeds);
  if (!proposal.ok) return {error: proposal.errors.map(e => diag({...e, path: '$.seeds'}))};
  const selected = setId ? proposal.candidates.find(x => x.set === setId) : proposal.candidates[0];
  if (!selected) {
    const rejected = proposal.rejected.find(x => x.set === setId);
    const noUsableSet = !setId && proposal.candidates.length === 0;
    const detail = rejected?.reasons.map(x => `${x.mode}: ${x.message}`).join('; ')
      ?? (noUsableSet ? proposal.rejected.map(x => `${x.set}: ${x.reasons.map(y => `${y.mode}: ${y.message}`).join('; ')}`).join(' | ') : '제안된 서브토큰 세트가 아닙니다.');
    const code = rejected || noUsableSet ? 'P_CHECK_CONTRAST' : 'P_ATTR_UNKNOWN';
    return {error: [diagnostic(code, '$.subtokenSet', `${setId ?? '(기본 세트)'}: ${detail}`, hintFor(code))]};
  }
  const source = platformEnv().registry.get('palette:static-kit');
  return {record: {...source, id: 'palette:user-seeds', label: '요청 시드 팔레트', seeds: proposal.palette.seeds, relations: [], quality: {status: 'implemented', evidence: []}, source: {origin: '요청에 전달된 사용자 색상', license: 'internal'}, reuses: []}, proposal, selectedSet: selected.set};
};

function standalone({mode, css, html, script, manifest}) {
  const title = escapeHTML(manifest.purposeItems.map(x => x.purpose).join(', ') || '목적 패밀리 미리보기');
  return `<!doctype html>\n<html lang="ko" data-theme="${mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'"><meta name="color-scheme" content="${mode}"><meta name="generator" content="Static Kit platform ${manifest.platformContract}"><title>${title}</title><style>\n${css}</style></head><body>${html}<script>${script}</script></body></html>\n`;
}

/**
 * assembleComponents(request) → envelope {css, html, script, standalone, manifest}.
 * request.items는 목적 패밀리 시연을 위해 선택한 시각 언어·변형·props·콘텐츠다.
 * seeds를 주면 그 요청에 한해 palette:user-seeds를 만들고, 제안 통과한 세트만 조립한다.
 */
export function assembleComponents(request) {
  return guard(() => {
    if (!isPlain(request)) return fail([badRequest('$args', '요청은 {context, items} 객체여야 합니다.')]);
    const unknown = checkKeys(request, REQUEST_KEYS, '$args');
    if (unknown) return fail([unknown]);
    if (typeof request.context !== 'string' || !request.context) return fail([badRequest('$args.context', '맥락(context) 문자열이 필요합니다.')]);
    if (!Array.isArray(request.items) || request.items.length < 1 || request.items.length > 8) return fail([badRequest('$args.items', 'items는 목적 패밀리 1~8개의 배열이어야 합니다.')]);
    for (const [i, item] of request.items.entries()) {
      if (!isPlain(item)) return fail([badRequest(`$args.items[${i}]`, '항목은 목적 패밀리 객체여야 합니다.')]);
      const bad = checkKeys(item, ITEM_KEYS, `$args.items[${i}]`);
      if (bad) return fail([bad]);
      if (typeof item.purpose !== 'string' || typeof item.visual !== 'string') return fail([badRequest(`$args.items[${i}]`, 'purpose와 visual id가 필요합니다.')]);
      for (const key of ['variant', 'props', 'content']) if (item[key] !== undefined && !isPlain(item[key])) return fail([badRequest(`$args.items[${i}].${key}`, `${key}는 객체여야 합니다.`)]);
    }
    let env = platformEnv(), palette = request.palette, subtokenSet = request.subtokenSet, userPalette = null;
    if (request.seeds !== undefined) {
      const p = paletteForSeeds(request.seeds, request.subtokenSet);
      if (p.error) return fail(p.error);
      env = createPlatform({records: [p.record]}); palette = p.record.id; subtokenSet = p.selectedSet; userPalette = {id: palette, seeds: p.proposal.palette.seeds};
    }
    const {seeds: _transient, ...assemblyRequest} = request;
    const engine = assembleFamilies(env, {...assemblyRequest, palette, subtokenSet, items: request.items});
    if (!engine.ok) return fail(engine.diagnostics.map(diag));
    const bases = engine.value.manifest.families.bases;
    const script = formRuntime + controlRuntime({catalogVersion: '2.7.0', tree: {type: 'page', children: bases.map(id => ({type: id.slice('base-component:'.length)}))}});
    const purposeItems = request.items.map(item => {
      const family = env.registry.get(item.purpose);
      const defaults = fields => Object.fromEntries(Object.keys(fields).map(key => [key, family.defaults[key]]));
      return {purpose: item.purpose, visual: item.visual, variant: {...defaults(family.variants), ...(item.variant ?? {})}, props: {...defaults(family.props), ...(item.props ?? {})}, content: item.content ?? {}, id: item.id ?? null};
    });
    const manifest = {
      ...engine.value.manifest,
      platformContract: engine.value.manifest.platformContract,
      selection: {...engine.value.manifest.selection, ...(palette ? {palette} : {}), ...(subtokenSet ? {subtokenSet} : {}), context: request.context, mode: request.mode ?? 'light', density: request.density ?? 'comfortable'},
      purposeItems,
    };
    const value = {css: engine.value.css, html: engine.value.html, script, manifest};
    if (userPalette) value.manifest.userPalette = userPalette;
    value.standalone = standalone({...value, mode: manifest.selection.mode});
    return ok(jsonClone(value), engine.diagnostics.map(diag));
  });
}
