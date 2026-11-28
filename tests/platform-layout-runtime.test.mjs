// Chromium command launch is unavailable in this sandbox; execute the shipped runtime with a minimal DOM event harness.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {LAYOUT_RUNTIME} from '../src/platform/families/layout.mjs';

function harness({value = 50, orientation = 'vertical', direction = 'horizontal'} = {}) {
  const listeners = new Map(), events = [], attrs = new Map([
    ['aria-valuenow', String(value)], ['aria-valuemin', '15'], ['aria-valuemax', '85'], ['aria-orientation', orientation],
  ]);
  const first = {style: {}}, second = {style: {}};
  const host = {
    getAttribute(name) { return name === 'data-direction' ? direction : null; },
    getBoundingClientRect() { return {left: 100, top: 200, width: 400, height: 300}; },
    querySelector(selector) { return selector === '.kit-panel-first' ? first : selector === '.kit-panel-second' ? second : null; },
  };
  const handle = {
    getAttribute(name) { return attrs.get(name) ?? null; },
    setAttribute(name, next) { attrs.set(name, String(next)); },
    closest(selector) { return selector === '[data-resizable-handle]' ? this : selector === '[data-component="component:resizable-panel"]' ? host : null; },
    dispatchEvent(event) { events.push(event); return true; },
  };
  const document = {addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) ?? []), callback]); }};
  const window = {};
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; this.bubbles = options.bubbles; } }
  const run = () => runInNewContext(LAYOUT_RUNTIME, {window, document, CustomEvent});
  const press = key => {
    let prevented = false;
    for (const callback of listeners.get('keydown') ?? []) callback({target: handle, key, preventDefault() { prevented = true; }});
    return prevented;
  };
  const pointer = (type, target, coords) => {
    let prevented = false;
    for (const callback of listeners.get(type) ?? []) callback({target, ...coords, preventDefault() { prevented = true; }});
    return prevented;
  };
  return {attrs, events, first, second, handle, host, listeners, run, press, pointer};
}

test('resizable runtime adjusts horizontal panels, clamps bounds, and emits the applied value', () => {
  const h = harness({orientation: 'vertical'});
  h.run();
  assert.equal(h.press('ArrowLeft'), true);
  assert.equal(h.attrs.get('aria-valuenow'), '45');
  assert.equal(h.first.style.flex, '0 0 45%');
  assert.equal(h.second.style.flex, '0 0 55%');
  assert.deepEqual([h.events.at(-1).type, h.events.at(-1).detail.value, h.events.at(-1).bubbles], ['kit-panel-resize', 45, true]);
  h.press('Home');
  h.press('ArrowLeft');
  assert.equal(h.attrs.get('aria-valuenow'), '15');
  h.press('End');
  h.press('ArrowRight');
  assert.equal(h.attrs.get('aria-valuenow'), '85');
});

test('resizable runtime uses vertical keys for horizontal separators and installs only one listener', () => {
  const h = harness({orientation: 'horizontal'});
  h.run();
  h.run();
  assert.equal(h.listeners.get('keydown').length, 1);
  assert.equal(h.press('ArrowUp'), true);
  assert.equal(h.attrs.get('aria-valuenow'), '45');
  assert.equal(h.press('ArrowDown'), true);
  assert.equal(h.attrs.get('aria-valuenow'), '50');
  assert.equal(h.press('ArrowLeft'), false, 'irrelevant keys do not cancel browser behavior');
});

test('resizable runtime tracks pointer movement and clamps panel sizes to the declared bounds', () => {
  const h = harness();
  h.run();
  assert.equal(h.pointer('pointerdown', h.handle, {clientX: 300, clientY: 250, button: 0}), true);
  assert.equal(h.pointer('pointermove', h.handle, {clientX: 440, clientY: 250}), true);
  assert.equal(h.attrs.get('aria-valuenow'), '85');
  assert.equal(h.first.style.flex, '0 0 85%');
  assert.equal(h.second.style.flex, '0 0 15%');
  assert.equal(h.pointer('pointermove', h.handle, {clientX: 120, clientY: 250}), true);
  assert.equal(h.attrs.get('aria-valuenow'), '15');
  assert.equal(h.pointer('pointerup', h.handle, {}), false);
  assert.equal(h.pointer('pointermove', h.handle, {clientX: 300, clientY: 250}), false, 'stopped pointer gestures no longer resize');
});

test('resizable runtime uses the vertical pointer axis for a horizontal separator', () => {
  const h = harness({orientation: 'horizontal', direction: 'vertical'});
  h.run();
  h.pointer('pointerdown', h.handle, {clientX: 120, clientY: 275, button: 0});
  h.pointer('pointermove', h.handle, {clientX: 120, clientY: 395});
  assert.equal(h.attrs.get('aria-valuenow'), '65');
  assert.equal(h.first.style.flex, '0 0 65%');
  assert.equal(h.second.style.flex, '0 0 35%');
});
