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

const MANIFEST = '$args.subject.manifest';
const isStr = x => typeof x === 'string';
const isNum = x => typeof x === 'number' && Number.isFinite(x);
const HINT_MANIFEST = 'compileBlueprint(...).value.manifest를 그대로 넘기세요.';

/**
 * 호출자가 준 manifest를 읽기 전에 모양을 확인한다. 모양이 틀리면 [경로, 이유]를 돌려주고, 아무 것도 읽지 않는다.
 * 컴파일러가 낸 값이라고 믿되, 읽는 필드의 타입은 믿지 않는다(applied가 문자열이면 글자 단위로 쪼개져 없는 규칙이 생긴다).
 */
function manifestProblem(m) {
  if (!isPlain(m)) return [MANIFEST, 'manifest는 컴파일 결과의 manifest 객체여야 합니다.'];
  try { JSON.stringify(m); } catch { return [MANIFEST, 'manifest는 JSON으로 표현할 수 있어야 합니다(순환 참조 없음).']; }
  const need = (path, ok_, why) => (ok_ ? null : [path, why]);
  const optionalPlain = (v, path) => need(path, v === undefined || isPlain(v), '객체여야 합니다.');
  const first = (...checks) => checks.find(Boolean) ?? null;
  const top = first(
    need(`${MANIFEST}.catalogVersion`, isStr(m.catalogVersion), '문자열이어야 합니다.'), need(`${MANIFEST}.theme`, isStr(m.theme), '문자열이어야 합니다.'),
    need(`${MANIFEST}.mode`, isStr(m.mode), '문자열이어야 합니다.'), need(`${MANIFEST}.axes`, isPlain(m.axes), '객체여야 합니다.'),
    need(`${MANIFEST}.contrast`, Array.isArray(m.contrast), '배열이어야 합니다.'),
  );
  if (top) return top;
  for (const [i, p] of m.contrast.entries()) {
    const at = `${MANIFEST}.contrast[${i}]`;
    if (!isPlain(p)) return [at, '객체여야 합니다.'];
    const bad = first(need(`${at}.name`, isStr(p.name), '문자열이어야 합니다.'), need(`${at}.ratio`, isNum(p.ratio), '유한한 숫자여야 합니다.'), need(`${at}.minimum`, isNum(p.minimum) && p.minimum > 0, '0보다 큰 숫자여야 합니다.'));
    if (bad) return bad;
  }
  if (m.design === undefined) return null;
  const d = `${MANIFEST}.design`;
  if (!isPlain(m.design)) return [d, '객체여야 합니다.'];
  const list = (v, path) => need(path, v === undefined || Array.isArray(v), '배열이어야 합니다.');
  const listBad = first(list(m.design.decisions, `${d}.decisions`), list(m.design.inherited, `${d}.inherited`), optionalPlain(m.design.page, `${d}.page`));
  if (listBad) return listBad;
  for (const [i, x] of (m.design.decisions ?? []).entries()) {
    const at = `${d}.decisions[${i}]`;
    if (!isPlain(x)) return [at, '객체여야 합니다.'];
    const bad = first(
      need(`${at}.path`, isStr(x.path), '문자열이어야 합니다.'), need(`${at}.type`, isStr(x.type), '문자열이어야 합니다.'),
      need(`${at}.applied`, Array.isArray(x.applied) && x.applied.every(isStr), '문자열 배열이어야 합니다.'),
      optionalPlain(x.values, `${at}.values`), optionalPlain(x.sources, `${at}.sources`), optionalPlain(x.facts, `${at}.facts`), optionalPlain(x.coverage, `${at}.coverage`),
      need(`${at}.coverage.reason`, x.coverage?.reason === undefined || isStr(x.coverage.reason), '문자열이어야 합니다.'),
    );
    if (bad) return bad;
  }
  for (const [i, x] of (m.design.inherited ?? []).entries()) if (!isPlain(x)) return [`${d}.inherited[${i}]`, '객체여야 합니다.'];
  if (m.design.page) {
    const pg = `${d}.page`;
    const bad = first(optionalPlain(m.design.page.facts, `${pg}.facts`), list(m.design.page.decisions, `${pg}.decisions`));
    if (bad) return bad;
    for (const [i, x] of (m.design.page.decisions ?? []).entries()) {
      const at = `${pg}.decisions[${i}]`;
      if (!isPlain(x)) return [at, '객체여야 합니다.'];
      const badDecision = first(need(`${at}.rule`, isStr(x.rule), '문자열이어야 합니다.'), need(`${at}.path`, x.path === undefined || isStr(x.path), '문자열이어야 합니다.'));
      if (badDecision) return badDecision;
    }
  }
  return null;
}

function checkManifest(m) {
  const problem = manifestProblem(m);
  return problem ? badRequest(problem[0], `manifest의 형식이 맞지 않습니다: ${problem[1]}`, HINT_MANIFEST) : null;
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
    const o = opts === undefined ? {} : opts;
    if (!isPlain(o)) return fail([badRequest('$args.opts', 'opts는 객체여야 합니다.')]);
    const badOpt = checkKeys(o, ['path', 'rule', 'level'], '$args.opts');
    if (badOpt) return fail([badOpt]);
    if (o.path !== undefined && (typeof o.path !== 'string' || !o.path.startsWith('$'))) return fail([badRequest('$args.opts.path', 'path는 "$"로 시작하는 문서 경로여야 합니다.', '예: $.tree.children[1]')]);
    if (o.rule !== undefined && (typeof o.rule !== 'string' || !o.rule)) return fail([badRequest('$args.opts.rule', 'rule은 규칙 ID 문자열이어야 합니다.', '예: C02, P01')]);
    const level = o.level === undefined ? 'summary' : o.level;
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

    const explain = () => {
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
        axis, value, bans: axisBans.filter(b => b.uses.includes(axis)).map(b => b.id), themeForbids: theme && Object.hasOwn(theme.forbid, axis) ? [...theme.forbid[axis]] : [],
      }));
      const value = {decisions, page, axes, contrast: contrastSummary(manifest.contrast)};
      if (level === 'full') value.inherited = design?.inherited ?? [];
      return jsonClone(value);
    };
    // 모양 검사를 통과한 manifest에서 예상 못한 예외가 나도 엔진 문장을 내보내지 않는다.
    if (given[0] === 'manifest') { let out; try { out = explain(); } catch { return fail([badRequest(MANIFEST, 'manifest를 읽는 중 형식 오류를 만났습니다.', HINT_MANIFEST)]); } return ok(out, warnings); }
    return ok(explain(), warnings);
  });
}
