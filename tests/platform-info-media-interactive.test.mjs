// §6.2 J/K 조작 가능한 컴포넌트(Accordion, Collapsible, Carousel, Image Comparison)의
// 계약, 상태 속성(aria-expanded, aria-controls, hidden), 런타임 이벤트 핸들러 계약 검증.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/examples/minimal.mjs';
import {renderPurposeFamily} from '../src/platform/families/index.mjs';
import {INFO_MEDIA_RUNTIME, INFO_MEDIA_RUNTIME_IDS} from '../src/platform/families/info-media.mjs';

const env = createPlatform();

test('interactive: Accordion rendered markup contains required aria and data attributes', () => {
  const rendered = renderPurposeFamily(env, 'purpose:info.accordion', {
    visual: 'family:soft',
    content: {
      items: [
        {title: '질문 1', content: '답변 1', open: false},
        {title: '질문 2', content: '답변 2', open: true},
      ],
    },
  });
  assert.equal(rendered.ok, true);
  const html = rendered.html;

  assert.ok(html.includes('data-accordion'), 'root must have data-accordion');
  assert.ok(html.includes('data-accordion-trigger'), 'trigger must have data-accordion-trigger');
  assert.ok(html.includes('aria-expanded="false"'), 'closed item has aria-expanded=false');
  assert.ok(html.includes('aria-expanded="true"'), 'open item has aria-expanded=true');
  assert.ok(html.includes('aria-controls='), 'trigger has aria-controls');
  assert.ok(html.includes('role="region"'), 'panel has role=region');
  assert.ok(html.includes('hidden'), 'closed panel has hidden attribute');
});

test('interactive: Collapsible rendered markup contains required trigger and body attributes', () => {
  const closed = renderPurposeFamily(env, 'purpose:info.collapsible', {
    visual: 'family:soft',
    content: {triggerLabel: '접힌 상태', content: '내용', open: false},
  });
  assert.equal(closed.ok, true);
  assert.ok(closed.html.includes('data-collapsible'));
  assert.ok(closed.html.includes('data-collapsible-trigger'));
  assert.ok(closed.html.includes('aria-expanded="false"'));
  assert.ok(closed.html.includes('class="pf-collapsible-body" role="region" aria-labelledby="info-collapsible-col-trig" hidden>'));

  const opened = renderPurposeFamily(env, 'purpose:info.collapsible', {
    visual: 'family:soft',
    content: {triggerLabel: '열린 상태', content: '내용', open: true},
  });
  assert.equal(opened.ok, true);
  assert.ok(opened.html.includes('aria-expanded="true"'));
  assert.ok(!opened.html.includes('class="pf-collapsible-body" role="region" aria-labelledby="info-collapsible-col-trig" hidden>'));
});

test('interactive: Carousel rendered markup contains carousel ARIA roles and nav controls', () => {
  const rendered = renderPurposeFamily(env, 'purpose:media.carousel', {
    visual: 'family:soft',
    content: {
      label: '포트폴리오',
      items: [
        {title: '1번', src: '1.jpg', alt: '1'},
        {title: '2번', src: '2.jpg', alt: '2'},
      ],
    },
  });
  assert.equal(rendered.ok, true);
  const html = rendered.html;

  assert.ok(html.includes('aria-roledescription="carousel"'));
  assert.ok(html.includes('aria-roledescription="slide"'));
  assert.ok(html.includes('data-carousel-prev'));
  assert.ok(html.includes('data-carousel-next'));
  assert.ok(html.includes('pf-carousel-counter'));
  assert.ok(html.includes('1 / 2'));
});

test('interactive: Image Comparison rendered markup contains slider and clip container', () => {
  const rendered = renderPurposeFamily(env, 'purpose:media.image-comparison', {
    visual: 'family:soft',
    content: {
      beforeSrc: 'b.jpg',
      afterSrc: 'a.jpg',
      beforeLabel: '이전',
      afterLabel: '이후',
    },
  });
  assert.equal(rendered.ok, true);
  const html = rendered.html;

  assert.ok(html.includes('data-image-comparison'));
  assert.ok(html.includes('data-comp-slider'));
  assert.ok(html.includes('data-comp-clip'));
  assert.ok(html.includes('type="range"'));
  assert.ok(html.includes('clip-path:inset(0 0 0 50%)'));
});

test('interactive: INFO_MEDIA_RUNTIME includes event handlers for all 4 interactive controls', () => {
  assert.ok(INFO_MEDIA_RUNTIME.includes('__kitInfoMedia'), 'defines guard flag');
  assert.ok(INFO_MEDIA_RUNTIME.includes('data-accordion-trigger'), 'handles accordion clicks');
  assert.ok(INFO_MEDIA_RUNTIME.includes('data-collapsible-trigger'), 'handles collapsible clicks');
  assert.ok(INFO_MEDIA_RUNTIME.includes('data-carousel-prev'), 'handles carousel prev/next');
  assert.ok(INFO_MEDIA_RUNTIME.includes('data-comp-slider'), 'handles image comparison slider');
  assert.ok(INFO_MEDIA_RUNTIME.includes('ArrowDown') && INFO_MEDIA_RUNTIME.includes('ArrowUp'), 'accordion keyboard nav');
  assert.ok(INFO_MEDIA_RUNTIME.includes('ArrowLeft') && INFO_MEDIA_RUNTIME.includes('ArrowRight'), 'carousel keyboard nav');

  for (const id of ['purpose:info.accordion', 'purpose:info.collapsible', 'purpose:media.carousel', 'purpose:media.image-comparison']) {
    assert.ok(INFO_MEDIA_RUNTIME_IDS.includes(id), `${id} is in INFO_MEDIA_RUNTIME_IDS`);
  }
});
