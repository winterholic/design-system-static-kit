/**
 * 통합 계약 검사. 연산이나 변형을 여러 번 거친 최종 문서가 지켜야 할 것을 세 등급으로 나눠 판정한다.
 *
 *   strong     (severity error)    어기면 문서를 받지 않는다. 데이터 보존, 스키마·구조, 접근성(검증기·대비 게이트).
 *   quality    (severity warning)  맥락 품질 규칙. 거부하지 않고 알린다. 변형 결과 계약 V01~V05, 페이지 규칙이 남기는 잔여 문제(PAGE_DUP_VISUAL, PAGE_BENTO_SPARSE).
 *   diagnostic (severity info)     판정이 아니라 관찰. 페이지 규칙이 적용한 결정, 콘텐츠 지문, 축 요약.
 *
 * 연산 하나하나는 검증기를 통과해야 끝난다(ops.mjs). 이 검사는 그 위에서 "시작 문서와 최종 문서"를 비교하므로
 * 연산 사이의 누적 손실이나 변형이 겹쳐 생긴 품질 문제를 본다.
 */
import {validateBlueprint} from '../validate.mjs';
import {compile} from '../compiler.mjs';
import {assessOption} from '../catalog/variant-contracts.mjs';
import {contentFingerprint, contentDiff} from './fingerprint.mjs';
import {OPS} from './ops.mjs';

export const GRADES = Object.freeze({strong: 'error', quality: 'warning', diagnostic: 'info'});

/** 검증기 오류 코드가 속한 강한 계약의 범주. 표에 없는 코드는 schema로 본다. */
const CATEGORY = {
  a11y: ['LINK_LABEL', 'URL', 'ANCHOR_MISSING', 'ANCHOR_DUPLICATE', 'DUPLICATE_ID', 'SELECT_OPTIONS', 'FIELD_OPTIONS', 'NAV_ICON', 'TOC_EMPTY', 'PRIMARY_ACTION'],
  structure: ['PAGE_HEADER', 'PAGE_REQUIRE', 'PAGE_FORBID', 'PAGE_ALLOW', 'PAGE_MAX', 'PAGE_SECOND', 'PAGE_SHELL', 'PAGE_WIDTH', 'SINGLE_HERO', 'HERO_POSITION', 'NESTED_TABS', 'SURFACE_NEST', 'SECTION_DEPTH', 'NAV_COUNT', 'NAV_MEGA', 'NAV_GROUP', 'FOOTER_LINKS', 'AXIS_BAN', 'THEME_FORBID', 'ROOT'],
};
const categoryOf = code => Object.entries(CATEGORY).find(([, codes]) => codes.includes(code))?.[0] ?? 'schema';

/** 페이지 규칙 결정 중 "아직 남은 문제"로 보는 것. 나머지 결정은 규칙이 이미 해결한 사실이라 진단이다. */
const QUALITY_DECISIONS = new Set(['PAGE_DUP_VISUAL', 'PAGE_BENTO_SPARSE']);

const entry = (grade, category, code, path, message, hint, extra = {}) => ({grade, severity: GRADES[grade], category, code, path, message, hint, ...extra});

/**
 * 문서 하나를 검사한다.
 * options.base: 시작 문서. 있으면 "최종 문서가 시작 문서의 콘텐츠를 그대로 가진다"를 강한 계약으로 본다(구성·테마 연산만 거친 경우).
 * options.layout: 적용한 {슬롯: 옵션}. 있으면 base 트리 → 최종 트리를 변형 결과 계약에 대조한다.
 * options.compile: false면 컴파일(대비 게이트·페이지 규칙 진단)을 건너뛴다.
 * 결과: {ok, level: 'pass'|'quality'|'fail', errors, warnings, diagnostics, content}. ok는 errors가 비었다는 뜻이다.
 */
export function checkDocument(doc, {base = null, layout = null, compile: runCompile = true} = {}) {
  const errors = [], warnings = [], diagnostics = [];
  const verdict = validateBlueprint(doc);
  for (const e of verdict.errors) errors.push(entry('strong', categoryOf(e.code), e.code, e.path, e.message, '검증기 오류입니다. 해당 값을 카탈로그가 허용하는 범위로 고치세요.'));
  const content = {after: contentFingerprint(doc)};
  if (base) {
    const diff = contentDiff(base, doc);
    content.before = contentFingerprint(base); content.preserved = !diff.missing.length && !diff.added.length;
    for (const m of diff.missing.slice(0, 20)) errors.push(entry('strong', 'data', 'CONTENT_LOSS', '$.tree', `시작 문서의 콘텐츠가 최종 문서에 없습니다: ${m}`, '변형 순서 중 콘텐츠를 지우거나 바꾼 단계를 찾으세요(연산 결과의 changes·warnings).'));
    for (const m of diff.added.slice(0, 20)) errors.push(entry('strong', 'data', 'CONTENT_DRIFT', '$.tree', `시작 문서에 없던 콘텐츠가 생겼습니다: ${m}`, '모양 연산은 글·데이터를 만들지 않습니다.'));
    if (layout && Array.isArray(base.tree?.children) && Array.isArray(doc.tree?.children)) {
      for (const [slotId, optionId] of Object.entries(layout)) {
        for (const f of assessOption({before: base.tree.children, after: doc.tree.children, slotId, optionId, contentPreserved: content.preserved})) warnings.push(entry('quality', 'variant-contract', 'VARIANT_CONTRACT', '$.layout.' + slotId, `${f.id}: ${f.detail}`, '거부되지 않는 선택입니다. 의도한 것이 아니면 해당 변형을 빼세요.', {ruleId: f.id, claim: f.claim}));
      }
    }
  }
  if (verdict.valid && runCompile) {
    try {
      const {manifest} = compile(doc);
      for (const d of manifest.design?.page?.decisions ?? []) {
        if (QUALITY_DECISIONS.has(d.code)) warnings.push(entry('quality', 'page-rule', d.code, d.path, `${d.rule}: ${d.reason}`, '페이지 규칙이 보고만 하는 문제입니다. 해당 부품 구성을 바꾸면 사라집니다.', {ruleId: d.rule}));
        else diagnostics.push(entry('diagnostic', 'page-rule', d.code ?? d.rule, d.path ?? '$.tree', `${d.rule}: ${d.reason}`, null, {ruleId: d.rule}));
      }
      diagnostics.push(entry('diagnostic', 'composition', 'COMPOSITION', '$', `맥락 결정 ${manifest.design?.decisions?.length ?? 0}개, 대비 쌍 ${manifest.contrast?.length ?? 0}개 통과`, null));
    } catch (e) {
      errors.push(entry('strong', 'a11y', /Contrast/.test(e.message) ? 'CONTRAST' : 'COMPILE_FAILED', '$', e.message.split('\n')[0], '팔레트와 모드를 바꾸거나(setPalette·setAppearance) 컴파일러 이슈로 남기세요.'));
    }
  }
  diagnostics.push(entry('diagnostic', 'content', 'FINGERPRINT', '$', `콘텐츠 ${content.after.count}항목 · ${content.after.hash}`, null));
  return {ok: errors.length === 0, level: errors.length ? 'fail' : warnings.length ? 'quality' : 'pass', errors, warnings, diagnostics, content};
}

/**
 * 연산 열을 차례로 적용한다. 하나라도 실패하면 아무것도 적용하지 않는다(처음 doc을 돌려줌).
 * steps: [{op, args}]. 결과: {ok, doc, results, failedAt, errors}.
 */
export function applySequence(doc, steps) {
  let current = doc; const results = [];
  for (const [i, {op, args}] of steps.entries()) {
    const run = Object.hasOwn(OPS, op) ? OPS[op] : null;
    const r = run ? run(current, args ?? {}) : {ok: false, doc: current, changes: [], errors: [{code: 'UNKNOWN_OP', path: '$op', message: `알 수 없는 연산: ${op}`, hint: '허용 연산은 opNames입니다.'}], warnings: []};
    results.push(r);
    if (!r.ok) return {ok: false, doc, results, failedAt: i, errors: r.errors};
    current = r.doc;
  }
  return {ok: true, doc: current, results, failedAt: null, errors: []};
}

/**
 * 여러 변형을 순차 적용한 최종 Blueprint를 통합 검사한다. 시작 문서와 최종 문서를 비교하고 적용한 구성 변형을 계약에 대조한다.
 * 결과: {ok, applied, final, ...checkDocument}. 연산이 실패하면 ok:false에 errors만 있다(검사는 하지 않음).
 */
export function checkSequence(doc, steps, options = {}) {
  const run = applySequence(doc, steps);
  if (!run.ok) return {ok: false, level: 'fail', applied: false, failedAt: run.failedAt, final: doc, errors: run.errors, warnings: [], diagnostics: [], content: null};
  const layout = {};
  for (const {op, args} of steps) if (op === 'setLayoutVariant') Object.assign(layout, args.choice ?? {[args.slot]: args.option});
  const report = checkDocument(run.doc, {base: doc, layout: Object.keys(layout).length ? layout : null, ...options});
  return {applied: true, failedAt: null, final: run.doc, ...report};
}
