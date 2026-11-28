/**
 * A single registered component rendered through the platform pipeline.
 * This is the Core style-context path for the component detail Playground:
 * graph checks, token binding and family rendering are identical to assembleDesign.
 */
import {assemblePlatform} from '../platform/pipeline.mjs';
import {platformEnv} from '../platform/compile.mjs';
import {PLATFORM_CONTRACT_VERSION} from '../platform/contract.mjs';
import {escapeHTML} from '../escape-html.mjs';
import {formRuntime, controlRuntime} from '../render.mjs';
import {badRequest, checkKeys, fail, guard, isPlain, ok, pretty} from './envelope.mjs';
import {diagnostic, hintFor} from './errors.mjs';

const KEYS = ['context', 'base', 'family', 'palette', 'subtokenSet', 'typeSystem', 'mode', 'density', 'viewport', 'props', 'content'];
const diag = d => diagnostic(d.code, d.path ?? '$', d.message, hintFor(d.code), {severity: d.severity === 'error' || d.severity === undefined ? undefined : d.severity});

function standalone({title, mode, css, html, script}) {
  return `<!doctype html>\n<html lang="ko" data-theme="${mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'"><meta name="color-scheme" content="${mode}"><meta name="generator" content="Static Kit platform ${PLATFORM_CONTRACT_VERSION}"><title>${escapeHTML(title)}</title><style>\n${css}</style></head><body>${html}<script>${script}</script></body></html>\n`;
}

/**
 * Assemble one component with the same closed registry, relation graph, bindings and renderer as assembleDesign.
 * `blueprint.json` is the replayable input contract for this pipeline renderer; all four display files come
 * from this call, and the UI's preview and Code tab share the exact file strings.
 */
export function assembleComponentContext(input) {
  return guard(() => {
    if (!isPlain(input)) return fail([badRequest('$args', '요청은 컴포넌트 맥락 객체여야 합니다.')]);
    const unknown = checkKeys(input, KEYS, '$args');
    if (unknown) return fail([unknown]);
    for (const key of ['context', 'base', 'family', 'palette', 'subtokenSet', 'typeSystem']) {
      if (typeof input[key] !== 'string' || !input[key]) return fail([badRequest(`$args.${key}`, `${key} 재료 id가 필요합니다.`)]);
    }
    for (const key of ['props', 'content']) if (input[key] !== undefined && !isPlain(input[key])) return fail([badRequest(`$args.${key}`, `${key}는 객체여야 합니다.`)]);
    const mode = input.mode ?? 'light', density = input.density ?? 'comfortable', viewport = input.viewport ?? 1280;
    if (!['light', 'dark'].includes(mode)) return fail([badRequest('$args.mode', 'mode는 light·dark입니다.')]);
    if (!['compact', 'comfortable', 'spacious'].includes(density)) return fail([badRequest('$args.density', 'density는 compact·comfortable·spacious입니다.')]);
    if (![390, 1280].includes(viewport)) return fail([badRequest('$args.viewport', 'viewport는 390 또는 1280입니다.')]);

    const request = {
      context: input.context, mode, density,
      palette: input.palette, subtokenSet: input.subtokenSet, typeSystem: input.typeSystem,
      components: [{base: input.base, family: input.family, props: input.props ?? {}, content: input.content ?? {}}],
    };
    const assembled = assemblePlatform(request, platformEnv());
    if (!assembled.ok) return fail(assembled.diagnostics.map(diag));
    const {html, css, tokens, manifest} = assembled.value;
    const label = platformEnv().registry.get(input.base)?.label ?? input.base;
    // select 목록·표 정렬 같은 상호작용은 고정 런타임이 맡는다. assembleDesign 의 standalone 과 같은 조합이다.
    const script = formRuntime + controlRuntime({catalogVersion: '2.7.0', tree: {type: 'page', children: [{type: input.base.slice('base-component:'.length)}]}});
    const page = standalone({title: `${label} Playground`, mode, css, html, script});
    const blueprint = {
      schema: 'dsk-component-context/1', context: input.context, base: input.base, family: input.family,
      palette: input.palette, subtokenSet: input.subtokenSet, typeSystem: input.typeSystem,
      mode, density, viewport, props: input.props ?? {}, content: input.content ?? {},
    };
    const files = {
      'index.html': page,
      'tokens.css': css,
      'tokens.json': pretty(tokens),
      'blueprint.json': pretty(blueprint),
      'manifest.json': pretty({...manifest, viewport}),
    };
    return ok({files, html: page, css, tokens, manifest: {...manifest, viewport}, blueprint, standalone: page});
  });
}
