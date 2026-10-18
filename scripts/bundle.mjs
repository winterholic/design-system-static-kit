import {readFile} from 'node:fs/promises';
import {resolve, dirname, relative, join} from 'node:path';

/**
 * Tiny ESM→IIFE bundler for the kit's own modules. It understands exactly the import/export forms this repository
 * uses (single-line static imports, `export const|function|class`, `export {a,b}`, `export {a} from`, `export * from`),
 * so the single-file gallery runs the same compiler as Node without adding a dependency.
 */
const srcRoot = resolve(import.meta.dirname, '../src');

export async function bundleSource(entry = 'compiler.mjs', extraEntries = ['catalog.mjs']) {
  const modules = new Map();
  async function load(id) {
    if (modules.has(id)) return;
    modules.set(id, null);
    const file = join(srcRoot, id);
    let code = await readFile(file, 'utf8');
    const deps = [];
    const dep = spec => {
      if (!spec.startsWith('.')) throw new Error(`Bare import not bundleable in ${id}: ${spec}`);
      const target = relative(srcRoot, resolve(dirname(file), spec));
      deps.push(target);
      return JSON.stringify(target);
    };
    const exportsList = [];
    code = code
      .replace(/^import\s+\{([^}]*)\}\s+from\s+'([^']+)';?[ \t]*$/gm, (_, names, spec) => `const {${names.split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+as\s+/, ': ')).join(', ')}} = __m(${dep(spec)});`)
      .replace(/^export\s+\*\s+from\s+'([^']+)';?[ \t]*$/gm, (_, spec) => `Object.assign(exports, __m(${dep(spec)}));`)
      .replace(/^export\s+\{([^}]*)\}\s+from\s+'([^']+)';?[ \t]*$/gm, (_, names, spec) => `{ const __r = __m(${dep(spec)}); ${names.split(',').map(s => s.trim()).filter(Boolean).map(s => { const [a, b = a] = s.split(/\s+as\s+/); return `exports.${b} = __r.${a};`; }).join(' ')} }`)
      .replace(/^export\s+\{([^}]*)\};?[ \t]*$/gm, (_, names) => { names.split(',').map(s => s.trim()).filter(Boolean).forEach(s => { const [a, b = a] = s.split(/\s+as\s+/); exportsList.push([a, b]); }); return ''; })
      .replace(/^export\s+(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => { exportsList.push([name, name]); return `${kind} ${name}`; });
    if (/^\s*(import|export)\s/m.test(code.replace(/`[^`]*`/gs, ''))) { const m = code.match(/^\s*(import|export)\s.*$/m); throw new Error(`Unsupported module syntax in ${id}: ${m?.[0]}`); }
    if (code.includes('import.meta')) throw new Error(`import.meta in bundled module ${id}`);
    modules.set(id, {code, exportsList});
    for (const d of deps) await load(d);
  }
  for (const id of [entry, ...extraEntries]) await load(id);
  const defs = [...modules.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([id, {code, exportsList}]) =>
    `__defs[${JSON.stringify(id)}] = function (exports, __m) {\n${code}\n${exportsList.map(([a, b]) => `exports.${b} = ${a};`).join('\n')}\n};`);
  return `(function () {
'use strict';
const __defs = {}, __cache = {};
function __m(id) { if (__cache[id]) return __cache[id].exports; const mod = __cache[id] = {exports: {}}; if (!__defs[id]) throw new Error('Missing module ' + id); __defs[id](mod.exports, __m); return mod.exports; }
${defs.join('\n')}
window.StaticKit = Object.assign({}, __m(${JSON.stringify(extraEntries[0])}), __m(${JSON.stringify(entry)}));
})();`;
}
