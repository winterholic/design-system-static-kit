import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {getPurposeFamily, renderPurposeFamily, validatePurposeFamilies} from '../src/platform/families/index.mjs';
import {ALL_COMPONENT_CONTRACTS, validateComponentContracts} from '../src/platform/families/contracts.mjs';
import {attachFormControls, formControlRuntime} from '../src/platform/families/form-controls.mjs';

const env = createPlatform();
const VISUAL = 'family:quiet';
const ids = [
  'purpose:form.currency', 'purpose:form.otp', 'purpose:form.tags', 'purpose:form.file', 'purpose:form.upload',
  'purpose:form.grouped-select', 'purpose:form.radio', 'purpose:form.radio-group', 'purpose:form.radio-card',
  'purpose:form.checkbox', 'purpose:form.checkbox-group', 'purpose:form.switch', 'purpose:form.slider',
  'purpose:form.range-slider', 'purpose:form.rating', 'purpose:form.color', 'purpose:form.date',
  'purpose:form.date-range', 'purpose:form.time', 'purpose:form.datetime', 'purpose:form.month',
  'purpose:form.week', 'purpose:form.schedule',
];
const request = id => {
  const family = getPurposeFamily(id);
  assert.ok(family, `registered family ${id}`);
  const result = renderPurposeFamily(env, id, {visual: VISUAL, id: `test-${id.split('.').at(-1)}`,
    variant: family.example.variant, props: family.example.props, content: family.example.content});
  assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.errors)}`);
  return result.html;
};

test('B/C/D direct controls are registered, have complete contracts, and render usable native controls', () => {
  assert.deepEqual(ids.filter(id => !getPurposeFamily(id)), [], 'every direct item has a purpose material');
  assert.deepEqual(validatePurposeFamilies(env), []);
  assert.deepEqual(validateComponentContracts(ALL_COMPONENT_CONTRACTS), []);
  for (const id of ids) {
    const contract = ALL_COMPONENT_CONTRACTS.find(item => item.id === id);
    const family = getPurposeFamily(id);
    assert.ok(contract, `${id} has a normalized contract`);
    assert.ok(contract.content.label?.required, `${id} names its control`);
    assert.ok(contract.accessibility.keyboard && (contract.accessibility.requirements?.length || contract.accessibility.conditions?.length), `${id} declares a keyboard and ARIA contract`);
    assert.ok(contract.responsive.behavior && contract.tokens.length, `${id} declares responsive behavior and design tokens`);
    assert.ok(family.pairs.length > 0 && family.pairs.every(([foreground, background, ratio, purpose]) => foreground.startsWith('--kit-') && background.startsWith('--kit-') && ratio >= 3 && purpose), `${id} declares contrast-checked token pairs`);
    const html = request(id);
    assert.match(html, /<input|<textarea|<select|<fieldset/, `${id} produces an actual control`);
    assert.ok(html.includes('test-'), `${id} uses the caller's unique id`);
  }
});

test('B/C/D renders preserve independent versus variant selection semantics and escape caller values', () => {
  const currency = renderPurposeFamily(env, 'purpose:form.currency', {visual: VISUAL, id: 'currency-a', content: {label: '금액 <입력>', value: '123.45', currency: '₩" onfocus="x'}});
  assert.equal(currency.ok, true, JSON.stringify(currency.errors));
  assert.match(currency.html, /type="number"/);
  assert.match(currency.html, /금액 &lt;입력&gt;/);
  assert.match(currency.html, /₩&quot; onfocus=&quot;x/);
  const escapedTag = renderPurposeFamily(env, 'purpose:form.tags', {visual: VISUAL, id: 'tags-escape', content: {label: '태그', tags: ['<img src=x onerror=alert(1)>']}});
  assert.equal(escapedTag.ok, true, JSON.stringify(escapedTag.errors));
  assert.match(escapedTag.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(escapedTag.html, /<img src=x/);
  assert.match(escapedTag.html, /name="tags" value="&lt;img src=x onerror=alert\(1\)&gt;"/);
  const multi = renderPurposeFamily(env, 'purpose:form.checkbox-group', {visual: VISUAL, id: 'checks-a', content: {label: '알림', options: [{value: 'mail', label: '메일', checked: true}, {value: 'sms', label: '문자'}]}});
  assert.equal(multi.ok, true, JSON.stringify(multi.errors));
  assert.equal((multi.html.match(/type="checkbox"/g) ?? []).length, 2);
  assert.equal((multi.html.match(/checked/g) ?? []).length, 1, 'a checkbox group supports multiple checked values, without collapsing to one');
  const radio = renderPurposeFamily(env, 'purpose:form.radio-group', {visual: VISUAL, id: 'radio-a', content: {label: '배송', options: [{value: 'normal', label: '일반', checked: true}, {value: 'fast', label: '빠름'}]}});
  assert.equal(radio.ok, true, JSON.stringify(radio.errors));
  assert.equal((radio.html.match(/type="radio"/g) ?? []).length, 2);
  assert.equal((radio.html.match(/checked/g) ?? []).length, 1, 'a radio group permits only one initial choice');
  for (const [id, content] of [
    ['purpose:form.date-range', {label: '기간', start: '2026-01-01', end: '2026-01-31'}],
    ['purpose:form.time', {label: '시각', value: '09:30'}],
    ['purpose:form.datetime', {label: '일시', value: '2026-01-01T09:30'}],
    ['purpose:form.month', {label: '월', value: '2026-01'}],
    ['purpose:form.week', {label: '주', value: '2026-W01'}],
  ]) {
    const rendered = renderPurposeFamily(env, id, {visual: VISUAL, id: 'date-a', content});
    assert.equal(rendered.ok, true, `${id}: ${JSON.stringify(rendered.errors)}`);
    assert.ok(rendered.html.includes('id="date-a-'), `${id} input IDs are namespaced`);
  }
  const otp = request('purpose:form.otp');
  assert.match(otp, /minlength="6" maxlength="6"/);
  assert.match(otp, /pattern="\[0-9\]\{6\}"/);
  for (const kind of ['tel', 'url']) {
    const inputKind = renderPurposeFamily(env, 'purpose:form.input-kind', {visual: VISUAL, id: `input-${kind}`, variant: {kind}, props: {size: 'medium', state: 'default'}, content: {label: kind === 'tel' ? '전화' : '주소', value: kind === 'tel' ? '01012345678' : 'https://example.com'}});
    assert.equal(inputKind.ok, true, JSON.stringify(inputKind.errors));
    assert.match(inputKind.html, new RegExp(`type="${kind}"`));
    assert.match(inputKind.html, new RegExp(`data-kind="${kind}"`));
  }
  const invalid = renderPurposeFamily(env, 'purpose:form.date-range', {visual: VISUAL, id: 'range-a', content: {label: '기간', start: '2026-01-01', end: '2026-01-31'}});
  const inputIds = [...invalid.html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(inputIds).size, inputIds.length, 'composite range inputs have unique IDs');
  const errored = renderPurposeFamily(env, 'purpose:form.currency', {visual: VISUAL, id: 'error-a', props: {size: 'medium', state: 'error'}, content: {label: '금액', message: '금액을 확인하세요', value: '12'}});
  assert.equal(errored.ok, true, JSON.stringify(errored.errors));
  assert.match(errored.html, /aria-invalid="true"/);
  assert.match(errored.html, /aria-describedby="error-a-amount-message"/);
  const disabled = renderPurposeFamily(env, 'purpose:form.currency', {visual: VISUAL, id: 'currency-disabled', props: {size: 'medium', state: 'disabled'}, content: {label: '금액'}});
  assert.equal(disabled.ok, true, JSON.stringify(disabled.errors));
  assert.match(disabled.html, /<input[^>]*disabled/);
  const readonly = renderPurposeFamily(env, 'purpose:form.date', {visual: VISUAL, id: 'date-readonly', props: {size: 'medium', state: 'readonly'}, content: {label: '날짜', value: '2026-01-01'}});
  assert.equal(readonly.ok, true, JSON.stringify(readonly.errors));
  assert.match(readonly.html, /<input[^>]*readonly/);
  const erroredSelect = renderPurposeFamily(env, 'purpose:form.grouped-select', {visual: VISUAL, id: 'select-error', props: {size: 'medium', state: 'error'}, content: {label: '지역', options: [{value: 'seoul', label: '서울', group: '수도권'}, {value: 'busan', label: '부산', group: '영남'}]}});
  assert.equal(erroredSelect.ok, true, JSON.stringify(erroredSelect.errors));
  assert.match(erroredSelect.html, /data-mode="single"/);
  assert.match(erroredSelect.html, /role="combobox" aria-invalid="true"/);
  const requiredTags = renderPurposeFamily(env, 'purpose:form.tags', {visual: VISUAL, id: 'tags-required', content: {label: '태그', required: true}});
  assert.equal(requiredTags.ok, true, JSON.stringify(requiredTags.errors));
  assert.match(requiredTags.html, /data-tags-required="true"/);
  assert.match(requiredTags.html, /aria-required="true"/);
  assert.doesNotMatch(requiredTags.html, /data-tag-input[^>]*required/);
  const requiredChecks = renderPurposeFamily(env, 'purpose:form.checkbox-group', {visual: VISUAL, id: 'checks-required', content: {label: '알림', required: true, options: [{value: 'mail', label: '메일'}, {value: 'sms', label: '문자'}]}});
  assert.equal(requiredChecks.ok, true, JSON.stringify(requiredChecks.errors));
  assert.match(requiredChecks.html, /data-checkbox-group data-required="true"/);
  assert.match(formControlRuntime, /setCustomValidity/);
  assert.match(formControlRuntime, /data-tagsRequired|tagsRequired/);
});

test('B/C/D reject invalid selection counts, dates, ranges and unsafe identifiers instead of silently normalizing', () => {
  const result = (id, content, requestId = 'safe-id') => renderPurposeFamily(env, id, {visual: VISUAL, id: requestId, content});
  assert.equal(result('purpose:form.radio-group', {label: '방식', options: [{value: 'a', label: 'A', checked: true}, {value: 'b', label: 'B', checked: true}]}).ok, false);
  assert.equal(result('purpose:form.range-slider', {label: '범위', min: 0, max: 10, low: 9, high: 3}).ok, false);
  assert.equal(result('purpose:form.date', {label: '날짜', value: 'not-a-date'}).ok, false);
  assert.equal(result('purpose:form.date-range', {label: '기간', start: '2026-02-02', end: '2026-01-01'}).ok, false);
  assert.equal(result('purpose:form.currency', {label: '금액', value: 'NaN'}).ok, false);
  assert.equal(result('purpose:form.time', {label: '시각', value: '99:99'}).ok, false);
  assert.equal(result('purpose:form.datetime', {label: '일시', value: '2026-02-30T99:99'}).ok, false);
  assert.equal(result('purpose:form.currency', {label: '금액'}, 'id" autofocus="true').ok, false);
  assert.equal(result('purpose:form.date', {label: '날짜', value: '2026-01-01'}, 'id" autofocus="true').ok, false);
  assert.equal(result('purpose:form.tags', {label: '태그', tags: ['중복', ' 중복 ']}).ok, false);
});

test('form-control runtime is the same implementation as its browser attach function', () => {
  assert.equal(formControlRuntime, attachFormControls.toString(), 'the exported runtime cannot omit form-control handlers');
  assert.match(formControlRuntime, /data-range-slider/);
  assert.match(formControlRuntime, /data-range-edge/);
});

test('tag and drag-drop inputs render their operable hooks and browser runtime', () => {
  const tagField = request('purpose:form.tags');
  assert.match(tagField, /data-tags-widget/);
  assert.match(tagField, /data-tags-list/);
  assert.match(tagField, /data-tag-input/);
  assert.match(tagField, /type="hidden" name="tags" value="디자인" data-tag-value/);
  assert.match(tagField, /role="status" aria-live="polite"/);
  const dropField = request('purpose:form.upload');
  assert.match(dropField, /data-file-drop/);
  assert.match(dropField, /<input (?=[^>]*type="file")(?=[^>]*multiple)[^>]*>/);
  assert.match(dropField, /data-file-drop-status role="status" aria-live="polite"/);
  assert.match(formControlRuntime, /data-tags-widget/);
  assert.match(formControlRuntime, /data-file-drop/);
  assert.match(formControlRuntime, /dataTransfer\??\.files/);
});
