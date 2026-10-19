import {e} from './util.mjs';

/** Small, dependency-free syntax coloring for the `code` part. Output is escaped text wrapped in <span class="tk-*">; colors are audited tokens (see styles: .tk-c/.tk-s/.tk-k/.tk-n). */
const STR = String.raw`'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"`;
const LANGS = {
  js: {c: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`, s: STR + String.raw`|` + '`(?:\\\\.|[^`\\\\])*`', k: String.raw`\b(?:const|let|var|function|return|import|from|export|default|await|async|new|if|else|for|of|in|class|throw|try|catch|true|false|null|undefined)\b`, n: String.raw`\b\d+(?:\.\d+)?\b`},
  json: {key: String.raw`"(?:\\.|[^"\\\n])*"(?=\s*:)`, s: STR, k: String.raw`\b(?:true|false|null)\b`, n: String.raw`-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`},
  bash: {c: String.raw`(?:^|\s)#[^\n]*`, s: STR, k: String.raw`\b(?:npm|npx|pnpm|yarn|git|curl|cd|export|sudo|node|docker|brew|mkdir|cat|echo)\b|(?<=\s)--?[a-zA-Z][\w-]*`, n: String.raw`\b\d+(?:\.\d+)?\b`},
  css: {c: String.raw`\/\*[\s\S]*?\*\/`, s: STR, k: String.raw`[\w-]+(?=\s*:)|@[\w-]+`, n: String.raw`-?\b\d+(?:\.\d+)?(?:px|rem|em|%|vw|vh|ms|s)?\b|#[0-9a-fA-F]{3,8}\b`},
  html: {c: String.raw`<!--[\s\S]*?-->`, s: STR, k: String.raw`<\/?[a-zA-Z][\w-]*|\/?>`, n: ''},
  python: {c: String.raw`#[^\n]*`, s: STR, k: String.raw`\b(?:def|return|import|from|as|if|elif|else|for|in|class|with|lambda|async|await|try|except|raise|True|False|None|print)\b`, n: String.raw`\b\d+(?:\.\d+)?\b`},
};
const CLASS = {c: 'tk-c', s: 'tk-s', key: 'tk-k', k: 'tk-k', n: 'tk-n'};

export function highlight(code, language) {
  const spec = LANGS[language];
  if (!spec) return e(code);
  const parts = Object.entries(spec).filter(([, src]) => src);
  const re = new RegExp(parts.map(([k, src]) => `(?<${k}>${src})`).join('|'), 'gm');
  let out = '', last = 0;
  for (const m of code.matchAll(re)) {
    const key = parts.find(([k]) => m.groups[k] !== undefined)[0], text = m[0];
    // bash comments match the whitespace before '#': keep the whitespace outside the span.
    const lead = key === 'c' && /^\s/.test(text) ? text[0] : '', body = lead ? text.slice(1) : text;
    out += e(code.slice(last, m.index)) + e(lead) + `<span class="${CLASS[key]}">${e(body)}</span>`;
    last = m.index + text.length;
  }
  return out + e(code.slice(last));
}
