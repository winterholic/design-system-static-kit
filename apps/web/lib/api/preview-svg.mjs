// Core 가 만든 완성 HTML 문서를 <img> 로 보여 줄 수 있는 SVG(foreignObject) 로 옮긴다.
// 화면을 새로 만들지 않는다: 문서의 요소·속성·CSS 는 그대로이고, XML 로 읽히도록 직렬화만 바꾼다.
//  - SVG 가 <img> 로 쓰이면 XML 로 파싱된다. HTML 의 빈 요소·값 없는 속성·doctype 은 그대로 두면 이미지가 깨진다.
//  - <img> 안의 SVG 는 스크립트와 외부 자원을 쓰지 못한다. Core 문서의 CSP(default-src 'none', img-src data:)가 이미 외부 자원을 막고 있어 모양은 같다.
//  - 목록 카드에 쓰이는 <script>, <meta>, <title>, <link> 는 화면에 영향이 없어 뺀다(문서 원본은 서비스 결과 그대로 둔다).
// 변환이 어려운 입력(짝이 맞지 않는 태그, 모르는 이름 있는 엔티티)은 조용히 넘기지 않고 던진다.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const DROP_ELEMENTS = new Set(['script', 'meta', 'link', 'title']);
const RAW_TEXT = new Set(['script', 'style']);
const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);
const HTML_ENTITIES = {nbsp: '&#160;', copy: '&#169;', reg: '&#174;', middot: '&#183;', hellip: '&#8230;', mdash: '&#8212;', ndash: '&#8211;', times: '&#215;', rarr: '&#8594;', larr: '&#8592;', bull: '&#8226;', laquo: '&#171;', raquo: '&#187;', lsquo: '&#8216;', rsquo: '&#8217;', ldquo: '&#8220;', rdquo: '&#8221;', trade: '&#8482;', euro: '&#8364;', check: '&#10003;'};
const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/** 텍스트·속성 값의 &, <, > 를 XML 로 맞춘다. 이미 올바른 엔티티는 그대로 둔다. */
function escapeValue(raw, attr) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '&') {
      const m = /^&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/.exec(raw.slice(i, i + 40));
      if (!m) { out += '&amp;'; continue; }
      const name = m[1];
      if (name[0] === '#' || XML_ENTITIES.has(name)) out += m[0];
      else if (HTML_ENTITIES[name]) out += HTML_ENTITIES[name];
      else throw new Error(`preview-svg: XML 로 옮길 수 없는 엔티티 &${name};`);
      i += m[0].length - 1;
    } else if (c === '<') out += '&lt;';
    else if (c === '>') out += '&gt;';
    else if (c === '"' && attr) out += '&quot;';
    else out += c;
  }
  return out;
}

function parseAttributes(src, tag) {
  const attrs = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  // HTML 파서는 같은 이름의 속성 중 첫 번째만 쓴다. XML 은 중복을 거부하므로 같은 규칙으로 뒤의 것을 버린다.
  while ((m = re.exec(src))) if (!attrs.some(([n]) => n === m[1])) attrs.push([m[1], m[2] ?? m[3] ?? m[4] ?? '']);
  if (attrs.some(([n]) => !/^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(n))) throw new Error(`preview-svg: <${tag}> 속성 이름을 읽을 수 없습니다.`);
  return attrs;
}

function readTag(html, at) {
  // 속성 값 안의 > 를 건너뛰며 태그 끝을 찾는다.
  let quote = null;
  for (let i = at + 1; i < html.length; i++) {
    const c = html[i];
    if (quote) { if (c === quote) quote = null; } else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
  }
  throw new Error('preview-svg: 닫히지 않은 태그');
}

/** 완성 HTML 문서 한 개를 XHTML 문서(<html xmlns>…)로 직렬화한다. */
export function htmlDocumentToXhtml(html) {
  let out = '';
  const stack = [];
  let htmlSeen = false;
  let i = 0;
  const svgDepth = () => stack.filter(e => e.svg).length;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { if (html.slice(i).trim()) out += escapeValue(html.slice(i), false); break; }
    if (lt > i) {
      const text = html.slice(i, lt);
      if (stack.length && !stack.at(-1).drop) out += escapeValue(text, false);
      i = lt;
    }
    if (html.startsWith('<!--', i)) { const end = html.indexOf('-->', i + 4); if (end < 0) throw new Error('preview-svg: 닫히지 않은 주석'); i = end + 3; continue; }
    if (html[i + 1] === '!' || html[i + 1] === '?') { i = html.indexOf('>', i) + 1; continue; }
    const end = readTag(html, i);
    const body = html.slice(i + 1, end);
    i = end + 1;
    if (body[0] === '/') {
      const name = body.slice(1).trim();
      const top = stack.pop();
      const svg = !!top?.svg;
      if (!top || (svg ? top.name !== name : top.name !== name.toLowerCase())) throw new Error(`preview-svg: 닫는 태그 </${name}> 가 열린 태그 <${top?.name}> 와 맞지 않습니다.`);
      if (!top.drop) out += `</${top.name}>`;
      continue;
    }
    const selfClosing = body.endsWith('/');
    const m = /^([A-Za-z][^\s/>]*)([\s\S]*?)\/?$/.exec(body);
    if (!m) throw new Error(`preview-svg: 태그를 읽을 수 없습니다: <${body.slice(0, 40)}`);
    const inSvg = svgDepth() > 0 || m[1].toLowerCase() === 'svg';
    const name = inSvg ? m[1] : m[1].toLowerCase();
    const attrs = parseAttributes(m[2], name);
    const drop = !inSvg && DROP_ELEMENTS.has(name) || stack.some(e => e.drop);
    if (!inSvg && RAW_TEXT.has(name)) {
      const close = html.toLowerCase().indexOf(`</${name}`, i);
      if (close < 0) throw new Error(`preview-svg: 닫히지 않은 <${name}>`);
      const text = html.slice(i, close);
      i = html.indexOf('>', close) + 1;
      if (name === 'style' && !drop) out += `<style>${text.includes(']]>') ? escapeValue(text, false) : `<![CDATA[${text}]]>`}</style>`;
      continue;
    }
    if (!inSvg && name === 'html') { htmlSeen = true; }
    if (!drop) {
      const ownAttrs = attrs.map(([n, v]) => ` ${n}="${escapeValue(v, true)}"`).join('');
      const ns = name === 'html' && !attrs.some(([n]) => n === 'xmlns') ? ` xmlns="${XHTML_NS}"`
        : name === 'svg' && !attrs.some(([n]) => n === 'xmlns') && !stack.some(e => e.svg) ? ` xmlns="${SVG_NS}"` : '';
      if (VOID.has(name) && !inSvg || selfClosing) out += `<${name}${ns}${ownAttrs}/>`;
      else out += `<${name}${ns}${ownAttrs}>`;
    }
    if (!(VOID.has(name) && !inSvg) && !selfClosing) stack.push({name, svg: inSvg, drop});
  }
  if (stack.length) throw new Error(`preview-svg: 닫히지 않은 요소 <${stack.at(-1).name}>`);
  if (!htmlSeen) throw new Error('preview-svg: 완성 HTML 문서(<html>)가 아닙니다.');
  return out;
}

const escapeText = s => String(s).replace(/[<>&"]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'})[c]);

/**
 * 완성 HTML 문서를 width×height 화면으로 잘라 보여 주는 SVG. 안쪽 문서는 width 만큼 넓은 화면에서 배치된다.
 * 이 SVG 를 <img> 에 width 픽셀 크기로 넣고 CSS 로 줄이면 미디어 쿼리가 width 기준으로 평가된다(Thumb 의 .image).
 */
export function toPreviewSvg(htmlDocument, {width = 1280, height = 800, title = '미리보기'} = {}) {
  const doc = htmlDocumentToXhtml(htmlDocument);
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeText(title)}"><foreignObject x="0" y="0" width="${width}" height="${height}">${doc}</foreignObject></svg>\n`;
}
