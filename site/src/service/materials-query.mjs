/**
 * 재료 읽기 전용 질의. 웹(Materials 화면)이 색 토큰·타이포그래피 재료·기초 재료 표를 ./service 진입점으로 읽는다.
 * 값은 src/color-tokens.mjs와 src/materials/*가 정한 그대로 내보내고, 이 파일은 모으고 JSON으로 복사할 뿐 값을 만들거나 바꾸지 않는다.
 *
 *   queryMaterials({view: 'color'})        팔레트 시드·사용처, 50~950 램프, 라이트·다크 CSS 변수 맵·대비 보고, 색 토큰 재료
 *   queryMaterials({view: 'typography'})   역할형 타이포그래피 프리셋(역할·컨트롤 크기), 다국어 코퍼스, 프리셋별 CSS
 *   queryMaterials({view: 'foundations'})  스타일 축 재료(값 표 포함)와 배치 원형
 *
 * 권리 감사(docs/materials/audit.md §3)에 따라 Coolors 팔레트(kind palette)는 어느 보기에도 싣지 않는다.
 */
import {catalogRegistry, MATERIAL_TYPE_PRESETS, MULTILINGUAL_TYPE_CORPUS, CONTROL_SIZES, renderMaterialTypeCSS} from '../materials/index.mjs';
import {STATIC_COLOR_PALETTE, resolveColorTokens, colorTokenUsage} from '../color-tokens.mjs';
import {webfontCSS} from '../platform/type.mjs';
import {WEBFONTS, LEGACY_FACE_OF} from '../platform/data/type-materials.mjs';
import {ok, fail, guard, checkKeys, badRequest, isPlain, jsonClone} from './envelope.mjs';

export const MATERIAL_VIEWS = Object.freeze(['color', 'typography', 'foundations']);

let registry;
const reg = () => (registry ??= catalogRegistry());
const brief = m => ({id: m.id, label: m.label, category: m.category, tokens: m.tokens, dependencies: m.dependencies, states: m.states, ext: m.ext});

const VIEWS = {
  color() {
    const light = resolveColorTokens({palette: 'static-kit', mode: 'light'});
    const dark = resolveColorTokens({palette: 'static-kit', mode: 'dark'});
    return {
      palette: {id: STATIC_COLOR_PALETTE.id, version: STATIC_COLOR_PALETTE.version, seeds: STATIC_COLOR_PALETTE.seeds, usage: STATIC_COLOR_PALETTE.usage},
      ramps: light.ramps,
      tokens: {light: light.tokens, dark: dark.tokens},
      report: {light: light.modes.light.report, dark: dark.modes.dark.report},
      materials: reg().byKind('color-token').map(brief),
      usage: colorTokenUsage(),
    };
  },
  typography() {
    return {
      presets: Object.values(MATERIAL_TYPE_PRESETS),
      corpus: MULTILINGUAL_TYPE_CORPUS,
      controlSizes: Object.keys(CONTROL_SIZES),
      css: Object.fromEntries(Object.keys(MATERIAL_TYPE_PRESETS).map(id => [id, renderMaterialTypeCSS(id)])),
      webfonts: WEBFONTS,
      webfontCss: Object.fromEntries(
        Object.keys(MATERIAL_TYPE_PRESETS).map(id => {
          const face = LEGACY_FACE_OF[MATERIAL_TYPE_PRESETS[id]?.engine] ?? 'face-pairing:sans';
          return [id, webfontCSS(face, {baseUrl: '/fonts'})];
        })
      ),
    };
  },
  foundations() {
    return {
      axes: reg().byKind('axis').map(m => ({...brief(m), values: m.variants.value})),
      layoutPrimitives: reg().byKind('layout-primitive').map(m => ({id: m.id, label: m.label, css: m.ext.css})),
    };
  },
};

/** 재료 보기 하나를 읽는다. 읽기 전용이고 다른 서비스 함수처럼 던지지 않는다. */
export function queryMaterials(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', 'queryMaterials({view: "color"}) 형태로 부릅니다.')]);
    const badKey = checkKeys(q, ['view'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.view !== 'string' || !Object.hasOwn(VIEWS, q.view)) return fail([badRequest('$args.view', `알 수 없는 보기: ${String(q.view)}`, `view는 ${MATERIAL_VIEWS.join(', ')} 중 하나입니다.`)]);
    return ok(jsonClone(VIEWS[q.view]()));
  });
}
