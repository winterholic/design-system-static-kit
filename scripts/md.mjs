/** Minimal Markdown → standalone HTML for the repository's own docs (headings, lists, tables, code, quotes, inline code/bold/links). */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[./#][^)\s]*)\)/g, (_, t, u) => `<a href="${u}"${u.startsWith('http') ? ' rel="noreferrer noopener"' : ''}>${t}</a>`);
const slug = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

export function mdToHtml(md) {
  const lines = md.split('\n'), out = [];
  let i = 0, open = false, toc = [];
  const closeSection = () => { if (open) { out.push('</section>'); open = false; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) { const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; out.push(`<pre tabindex="0"><code>${esc(code.join('\n'))}</code></pre>`); continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      const level = m[1].length, id = slug(m[2]);
      if (level === 2) { closeSection(); out.push(`<section id="${id}">`); open = true; toc.push([id, m[2]]); }
      out.push(`<h${level}${level > 1 ? ` id="h-${id}"` : ''}>${inline(m[2])}</h${level}>`); i++; continue;
    }
    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? '')) {
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(line); i += 2; const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(head.join(' · '))}"><table><thead><tr>${head.map(h => `<th scope="col">${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    if (/^>\s?/.test(line)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); out.push(`<blockquote>${inline(q.join(' '))}</blockquote>`); continue; }
    if (/^\s*[-*]\s+/.test(line)) { const items = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, '')); out.push(`<ul>${items.map(t => `<li>${inline(t)}</li>`).join('')}</ul>`); continue; }
    if (/^\s*\d+\.\s+/.test(line)) { const items = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, '')); out.push(`<ol>${items.map(t => `<li>${inline(t)}</li>`).join('')}</ol>`); continue; }
    if (!line.trim()) { i++; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||>|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  closeSection();
  return {body: out.join('\n'), toc};
}

const CSS = `:root{--bg:#f7f8fa;--fg:#161c24;--mut:#55606e;--card:#fff;--line:#d9dee5;--brand:#0b5a85;--soft:#e9f2f8;color-scheme:light dark}@media(prefers-color-scheme:dark){:root{--bg:#10151c;--fg:#eef2f6;--mut:#a9b4c2;--card:#18202a;--line:#2d3744;--brand:#6bb8e8;--soft:#1d2a38}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
.skip{position:fixed;top:-60px;left:8px;background:var(--card);padding:10px;z-index:9}.skip:focus{top:8px}header.top{padding:28px 16px 12px;max-width:1040px;margin:0 auto}header.top h1{margin:0;font-size:clamp(26px,5vw,38px);letter-spacing:-.02em;line-height:1.25}header.top p{margin:8px 0 0;color:var(--mut)}
nav.toc{max-width:1040px;margin:0 auto;padding:0 16px 8px;display:flex;flex-wrap:wrap;gap:6px}nav.toc a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;color:var(--fg);text-decoration:none;font-size:13px;background:var(--card);min-height:32px;display:inline-flex;align-items:center}
main{max-width:1040px;margin:0 auto;padding:8px 16px 80px}section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:16px 0}h2{margin:0 0 8px;font-size:22px;letter-spacing:-.01em}h3{margin:20px 0 6px;font-size:17px}h4{margin:14px 0 4px;font-size:15px}p{margin:8px 0}ul,ol{padding-left:22px}li{margin:3px 0}
.table-scroll{overflow-x:auto;margin:12px 0;border:1px solid var(--line);border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px;min-width:560px}th,td{padding:8px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}thead th{background:var(--soft);font-weight:700;position:sticky;top:0}tbody th{font-weight:600}tr:last-child>*{border-bottom:0}
code{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--soft);padding:1px 6px;border-radius:5px}pre{overflow:auto;background:var(--soft);padding:14px;border-radius:10px;font-size:13px}pre code{background:none;padding:0}blockquote{margin:12px 0;padding:8px 14px;border-left:4px solid var(--brand);background:var(--soft);border-radius:0 8px 8px 0}a{color:var(--brand)}a:focus-visible,.table-scroll:focus-visible,pre:focus-visible{outline:3px solid var(--brand);outline-offset:2px}footer{max-width:1040px;margin:0 auto;padding:0 16px 40px;color:var(--mut);font-size:13px}
@media(max-width:640px){section{padding:16px 14px}main{padding-inline:10px}}@media print{nav.toc{display:none}section{break-inside:avoid-page}}`;

export function page({title, subtitle, md, footer}) {
  const {body, toc} = mdToHtml(md);
  return `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body><a class="skip" href="#content">본문으로</a><header class="top"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></header><nav class="toc" aria-label="목차">${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</nav><main id="content">\n${body}\n</main><footer>${esc(footer)}</footer></body></html>\n`;
}
