/**
 * explainDecisions: 컴파일러가 실제로 남긴 기록만 읽어 돌려준다.
 * 근거는 manifest.design(맥락 결정과 페이지 규칙 이력), manifest.axes·theme(축과 금지 표), manifest.contrast(대비 쌍)뿐이다.
 * 문장(why)은 규칙 정의의 reason이나 manifest가 적은 reason을 그대로 쓰고, 없으면 규칙 ID만 쓴다. 지어낸 설명은 없다.
 */
import {compositionRules, pageRules, themes, axisBans} from '../catalog.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';
import {compileBlueprint} from './compile.mjs';

const LEVELS = ['summary', 'full'];
const byId = table => new Map(table.map(r => [r.id, r]));
const COMPOSITION = byId(compositionRules), PAGE = byId(pageRules);

const underPath = (path, root) => path === root || path.startsWith(root + '.') || path.startsWith(root + '[');

function checkManifest(m) {
  if (!isPlain(m)) return badRequest('$args.subject.manifest', 'manifest는 컴파일 결과의 manifest 객체여야 합니다.', 'compileBlueprint(...).value.manifest를 그대로 넘기세요.');
  for (const [k, ok_] of [['catalogVersion', typeof m.catalogVersion === 'string'], ['theme', typeof m.theme === 'string'], ['axes', isPlain(m.axes)], ['contrast', Array.isArray(m.contrast)]]) {
    if (!ok_) return badRequest(`$args.subject.manifest.${k}`, `manifest.${k}가 없거나 형식이 맞지 않습니다.`, 'compileBlueprint(...).value.manifest를 그대로 넘기세요.');
  }
  return null;
}

/** 규칙 ID마다 규칙 정의의 reason을 모은다. 정의가 없는 ID(간격·배치 계약 이름 등)는 manifest가 적은 coverage.reason으로 대신한다. */
function explainNode(d, level) {
  const rules = [...(d.applied ?? [])];
  const reasons = rules.map(id => COMPOSITION.get(id)?.reason ? `${id}: ${COMPOSITION.get(id).reason}` : null).filter(Boolean);
  const why = reasons.length ? reasons.join(' ') : (d.coverage?.reason ?? (rules.length ? rules.join(', ') : ''));
  const source = rules.length ? rules.map(id => (COMPOSITION.has(id) ? `src/catalog/composition.mjs#${id}` : id)).join(', ') : 'manifest.design.decisions';
  const winner = Object.fromEntries(Object.entries(d.values ?? {}).map(([field, value]) => [field, {value, rule: d.sources?.[field] ?? null}]));
  const out = {path: d.path, nodeType: d.type, rules, winner, why, source};
  if (level === 'full') { out.facts = d.facts ?? {}; out.coverage = d.coverage ?? null; }
  return out;
}

function contrastSummary(contrast) {
  const text = contrast.find(p => p.name === 'text/canvas');
  let tightest = null;
  for (const p of contrast) if (!tightest || p.ratio / p.minimum < tightest.ratio / tightest.minimum) tightest = p;
  return {minimumBody: text?.minimum ?? null, pairs: contrast.length, tightest};
}

/**
 * subject: {blueprint} 또는 {manifest}(둘 중 정확히 하나).
 *   blueprint는 compileBlueprint를 거치므로 컴파일이 실패하면 그 오류를 그대로 돌려준다. manifest는 컴파일러가 낸 것으로 믿고 읽기만 한다.
 * opts.path  이 경로와 그 아래 노드의 결정만(예 "$.tree.children[1]")
 * opts.rule  이 규칙 ID(C##, P##)가 적용된 결정만
 * opts.level 'summary'(기본, facts 생략) | 'full'(facts·coverage·inherited 포함)
 */
export function explainDecisions(subject, opts) {
  return guard(() => {
    if (!isPlain(subject)) return fail([badRequest('$args.subject', 'subject는 {blueprint} 또는 {manifest} 객체여야 합니다.')]);
    const given = ['blueprint', 'manifest'].filter(k => subject[k] !== undefined);
    const badKey = checkKeys(subject, ['blueprint', 'manifest'], '$args.subject');
    if (badKey) return fail([badKey]);
    if (given.length !== 1) return fail([badRequest('$args.subject', 'blueprint와 manifest 중 하나만 넘겨야 합니다.')]);
    const o = opts ?? {};
    if (!isPlain(o)) return fail([badRequest('$args.opts', 'opts는 객체여야 합니다.')]);
    const badOpt = checkKeys(o, ['path', 'rule', 'level'], '$args.opts');
    if (badOpt) return fail([badOpt]);
    if (o.path !== undefined && (typeof o.path !== 'string' || !o.path.startsWith('$'))) return fail([badRequest('$args.opts.path', 'path는 "$"로 시작하는 문서 경로여야 합니다.', '예: $.tree.children[1]')]);
    if (o.rule !== undefined && (typeof o.rule !== 'string' || !o.rule)) return fail([badRequest('$args.opts.rule', 'rule은 규칙 ID 문자열이어야 합니다.', '예: C02, P01')]);
    const level = o.level ?? 'summary';
    if (!LEVELS.includes(level)) return fail([badRequest('$args.opts.level', `level이 올바르지 않습니다: ${String(level)}`, `허용값: ${LEVELS.join(', ')}`)]);

    let manifest, warnings = [];
    if (given[0] === 'blueprint') {
      const compiled = compileBlueprint(subject.blueprint, {include: ['manifest'], html: 'omit'});
      if (!compiled.ok) return compiled;
      manifest = compiled.value.manifest; warnings = compiled.warnings;
    } else {
      const bad = checkManifest(subject.manifest);
      if (bad) return fail([bad]);
      manifest = subject.manifest;
    }

    const keep = d => (o.path === undefined || underPath(d.path ?? '', o.path)) && (o.rule === undefined || (d.applied ?? []).includes(o.rule) || d.rule === o.rule);
    const design = manifest.design ?? null;
    const decisions = (design?.decisions ?? []).filter(keep).map(d => explainNode(d, level));
    const page = design?.page ? {
      facts: design.page.facts,
      decisions: (design.page.decisions ?? []).filter(d => o.path === undefined || underPath(d.path ?? '', o.path)).filter(d => o.rule === undefined || d.rule === o.rule)
        .map(d => ({...d, source: PAGE.get(d.rule)?.source ?? 'manifest.design.page'})),
    } : null;
    const theme = Object.hasOwn(themes, manifest.theme) ? themes[manifest.theme] : null;
    const axisValues = {mode: manifest.mode, ...manifest.axes};
    const axes = Object.entries(axisValues).map(([axis, value]) => ({
      axis, value, bans: axisBans.filter(b => b.uses.includes(axis)).map(b => b.id), themeForbids: [...(theme?.forbid?.[axis] ?? [])],
    }));
    const value = {decisions, page, axes, contrast: contrastSummary(manifest.contrast)};
    if (level === 'full') value.inherited = design?.inherited ?? [];
    return ok(jsonClone(value), warnings);
  });
}
