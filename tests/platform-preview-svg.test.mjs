import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlDocumentToXhtml, toPreviewSvg} from '../apps/web/lib/api/preview-svg.mjs';

const doc = body => `<!doctype html>\n<html lang="ko" data-theme="light"><head><meta charset="utf-8"><title>t</title><style>\n:root{--a:1}.x>.y{color:red}\n</style></head><body>${body}<script>window.x = 1 < 2 && "</div>";</script></body></html>\n`;

test('빈 요소, 값 없는 속성, 중복 속성, 엔티티를 XML 로 맞춘다', () => {
  const out = htmlDocumentToXhtml(doc('<p class="a" class="b" data-flow hidden>1 &lt; 2 &amp; &nbsp;&quot;q&quot;</p><br><input type="text" disabled><img src="data:x" alt="">'));
  assert.ok(out.includes('<p class="a" data-flow="" hidden="">'), out);
  assert.ok(out.includes('1 &lt; 2 &amp; &#160;&quot;q&quot;'));
  assert.ok(out.includes('<br/>') && out.includes('<input type="text" disabled=""/>') && out.includes('<img src="data:x" alt=""/>'));
});

test('doctype·script·meta·title 은 빼고 style 은 CDATA 로 그대로 둔다', () => {
  const out = htmlDocumentToXhtml(doc('<main>x</main>'));
  assert.ok(!/doctype|<script|<meta|<title/i.test(out));
  assert.ok(out.includes('<style><![CDATA[\n:root{--a:1}.x>.y{color:red}\n]]></style>'));
  assert.ok(out.startsWith('<html xmlns="http://www.w3.org/1999/xhtml" lang="ko" data-theme="light">'));
});

test('인라인 SVG 는 SVG 이름공간을 받고, 그 안의 이름은 대소문자를 보존한다', () => {
  const out = htmlDocumentToXhtml(doc('<svg viewBox="0 0 2 2"><linearGradient id="g"><stop offset="0"/></linearGradient><title>icon</title><path d="M0 0"/></svg>'));
  assert.ok(out.includes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><linearGradient id="g"><stop offset="0"/></linearGradient><title>icon</title><path d="M0 0"/></svg>'), out);
});

test('속성 값 안의 > 와 따옴표를 처리한다', () => {
  const out = htmlDocumentToXhtml(doc(`<a href="/x?a=1&b=2" title='say "hi" > bye'>t</a>`));
  assert.ok(out.includes('<a href="/x?a=1&amp;b=2" title="say &quot;hi&quot; &gt; bye">t</a>'), out);
});

test('변환할 수 없는 입력은 조용히 넘기지 않고 던진다', () => {
  assert.throws(() => htmlDocumentToXhtml(doc('<div><span></div>')), /맞지 않습니다/);
  assert.throws(() => htmlDocumentToXhtml(doc('<p>&unknownentity;</p>')), /엔티티/);
  assert.throws(() => htmlDocumentToXhtml('<div>fragment</div>'), /완성 HTML 문서/);
  assert.throws(() => htmlDocumentToXhtml('<html><body><div>'), /닫히지 않은/);
  assert.throws(() => htmlDocumentToXhtml(doc('<div>')), /맞지 않습니다/);
});

test('toPreviewSvg 는 화면 폭 그대로의 foreignObject 를 만든다', () => {
  const svg = toPreviewSvg(doc('<main>x</main>'), {width: 390, height: 640, title: 'a "b" <c>'});
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 640" width="390" height="640" role="img" aria-label="a &quot;b&quot; &lt;c&gt;"><foreignObject x="0" y="0" width="390" height="640"><html xmlns='));
  assert.equal(toPreviewSvg(doc('<main>x</main>')), toPreviewSvg(doc('<main>x</main>')), '같은 입력이면 같은 바이트');
});
