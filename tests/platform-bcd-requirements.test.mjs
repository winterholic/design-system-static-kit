import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileBlueprint} from '../src/service/index.mjs';
import * as edit from '../src/edit/index.mjs';
import {getPurposeFamily, renderPurposeFamily} from '../src/platform/families/index.mjs';
import {platformEnv} from '../src/platform/compile.mjs';
import {renderInput, inputExamples} from '../src/materials/input.mjs';
import {renderSelect} from '../src/materials/select.mjs';
import {templates} from '../src/catalog/index.mjs';

/**
 * REQUEST §6.2 B 텍스트 입력(14)·C 선택(15)·D 날짜와 시간(8) 37행이 이름의 뜻대로 렌더되는지 본다.
 * 어느 재료가 어느 행을 맡는지는 MATERIAL-COVERAGE.json의 요구 레코드에서, 행 이름은 REQUEST.md에서 읽는다.
 * 브라우저 동작(키보드·검증 경계·범위 연동)은 e2e/platform-form-interaction.spec.mjs가 본다.
 */
const root = new URL('..', import.meta.url);
const coverage = JSON.parse(readFileSync(new URL('docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', root), 'utf8'));
const request = readFileSync(new URL('docs/dev/catalog-platform-upgrade/REQUEST.md', root), 'utf8');
const names = letter => { const start = request.indexOf(`\n### ${letter}. `), body = request.slice(start + 1, request.indexOf('\n### ', start + 5)); return body.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim()); };
const reqs = coverage.requirements.filter(r => /^req:comp:[bcd]-/.test(r.id)), byName = new Map(reqs.map(r => [r.name, r]));
const env = platformEnv();
const purpose = (id, over = {}) => {
  const family = getPurposeFamily(id), result = renderPurposeFamily(env, id, {visual: 'family:quiet', ...family.example, ...over, content: {...family.example.content, ...(over.content ?? {})}, id: `req-${id.split('.').at(-1)}`});
  assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.errors)}`);
  return result.html;
};
const count = (h, re) => (h.match(re) ?? []).length;
const input = extra => renderInput({id: 'req-input', label: '항목', ...extra});
const select = extra => renderSelect({id: 'req-select', label: '지역', options: [{value: 'a', label: '서울', group: '수도권'}, {value: 'b', label: '부산', group: '영남'}], ...extra});
const calendarPage = () => { const has = n => n?.some(x => x.type === 'calendar' || has(x.children)); const name = Object.keys(templates).find(t => { const m = edit.resetDocument(null, {template: t}); return m.ok && has(m.doc.tree.children); }); return compileBlueprint(edit.resetDocument(null, {template: name}).doc, {include: ['html']}).value.html; };
const labelled = h => { const ids = [...h.matchAll(/<input[^>]* id="([^"]+)"/g)].map(m => m[1]); for (const id of ids) assert.ok(h.includes(`for="${id}"`), `${id} has a label`); return ids.length; };

const MEANING = {
  'Text Input': () => { const h = input({}); assert.match(h, /<input[^>]*type="text"/); labelled(h); },
  Textarea: () => { assert.match(input({kind: 'multiline'}), /<textarea/); },
  'Search Input': () => { const h = purpose('purpose:form.search'); assert.match(h, /type="search"|role="combobox"/); },
  'Password Input': () => { const h = input({kind: 'password'}); assert.match(h, /type="password"/); assert.match(h, /aria-pressed="false"/, 'a reveal toggle'); },
  'Number Input': () => { assert.match(input({kind: 'number'}), /type="number"/); },
  'Currency Input': () => { const h = purpose('purpose:form.currency'); assert.match(h, /type="number"[^>]*min="0"[^>]*step="1"|step="1"[^>]*min="0"/); assert.match(h, /<span class="pf-native-affix-symbol" aria-hidden="true">₩<\/span>/); labelled(h); assert.throws(() => purpose('purpose:form.currency', {content: {min: 10, max: 1}}), /min은 max/); assert.throws(() => purpose('purpose:form.currency', {content: {value: 'abc'}}), /숫자/); },
  'Email Input': () => { assert.match(input({kind: 'email'}), /type="email"/); },
  'Phone Input': () => { const h = purpose('purpose:form.input-kind', {variant: {kind: 'tel'}}); assert.match(h, /type="tel"/); assert.notEqual(h, purpose('purpose:form.input-kind', {variant: {kind: 'url'}})); },
  'URL Input': () => { assert.match(purpose('purpose:form.input-kind', {variant: {kind: 'url'}}), /type="url"/); },
  'OTP Input': () => { const h = purpose('purpose:form.otp'); assert.match(h, /maxlength="6"/); assert.match(h, /minlength="6"/); assert.match(h, /pattern="\[0-9\]\{6\}"/); assert.match(h, /inputmode="numeric"/); assert.match(h, /autocomplete="one-time-code"/); assert.throws(() => purpose('purpose:form.otp', {content: {length: 3}}), /4~8/); },
  'Tag Input': () => { const h = purpose('purpose:form.tags'); assert.match(h, /data-tags-widget/); assert.equal(count(h, /data-tag-value/g), 2); assert.equal(count(h, /data-tag-remove/g), 2); assert.match(h, /data-tags-status role="status" aria-live="polite"/); assert.throws(() => purpose('purpose:form.tags', {content: {tags: ['a', 'A']}}), /중복/); },
  'File Input': () => { const h = purpose('purpose:form.file'); assert.match(h, /type="file"[^>]*accept="image\/\*,\.pdf"|accept="image\/\*,\.pdf"[^>]*type="file"/); assert.match(h, /multiple/); labelled(h); },
  'Drag-and-drop Upload': () => { const h = purpose('purpose:form.upload'); assert.match(h, /data-file-drop/); assert.match(h, /type="file"/); assert.match(h, /data-file-drop-status role="status" aria-live="polite"/, 'a drop area still has the native input, so it works without dragging'); },
  'Input Group': () => { const h = purpose('purpose:form.group'); assert.match(h, /<fieldset|role="group"/); },
  Select: () => { const h = select({}); assert.match(h, /role="combobox"[^>]*aria-expanded="false"/); assert.match(h, /role="listbox"/); },
  'Searchable Select': () => { const h = select({search: 'local'}), plain = select({}); assert.match(h, /role="searchbox"/); assert.doesNotMatch(plain, /role="searchbox"/); },
  Combobox: () => { const h = select({search: 'async'}); assert.match(h, /data-async-search/); assert.match(h, /data-search="async"/); assert.throws(() => select({search: 'async', mode: 'multiple'}), /multiple \+ async/); },
  'Multi-select': () => { const h = select({mode: 'multiple', values: ['a']}); assert.match(h, /aria-multiselectable="true"/); assert.doesNotMatch(select({}), /aria-multiselectable="true"/); },
  'Grouped Select': () => { const h = purpose('purpose:form.grouped-select'); assert.ok(count(h, /role="group"/g) >= 2); assert.match(h, /role="combobox"/); assert.throws(() => purpose('purpose:form.grouped-select', {content: {options: [{value: 'a', label: 'A'}]}}), /두 개 이상/); },
  Radio: () => { const h = purpose('purpose:form.radio'); assert.match(h, /type="radio"/); labelled(h); },
  'Radio Group': () => { const h = purpose('purpose:form.radio-group'); assert.match(h, /<fieldset[^>]*><legend>배송 방법<\/legend>/); assert.equal(count(h, /type="radio"/g), 2); assert.equal(count(h, / name="radio-group"/g), 2, 'one name, so arrows move one selection'); assert.equal(count(h, / checked/g), 1); assert.throws(() => purpose('purpose:form.radio-group', {content: {options: [{value: 'a', label: 'A', checked: true}, {value: 'b', label: 'B', checked: true}]}}), /하나만/); },
  'Radio Card': () => { const h = purpose('purpose:form.radio-card'); assert.match(h, /data-cards="true"/); assert.equal(count(h, /type="radio"/g), 2); assert.notEqual(h, purpose('purpose:form.radio-group')); },
  Checkbox: () => { const h = purpose('purpose:form.checkbox'); assert.match(h, /type="checkbox"/); labelled(h); },
  'Checkbox Group': () => { const h = purpose('purpose:form.checkbox-group'); assert.match(h, /data-checkbox-group/); assert.equal(count(h, /type="checkbox"/g), 2); assert.match(h, /<legend>알림<\/legend>/); },
  Switch: () => { const h = purpose('purpose:form.switch'); assert.match(h, /type="checkbox"[^>]*role="switch"|role="switch"[^>]*type="checkbox"/); labelled(h); },
  Slider: () => { const h = purpose('purpose:form.slider'); assert.match(h, /type="range"/); assert.match(h, /min="0"/); assert.match(h, /max="100"/); assert.throws(() => purpose('purpose:form.slider', {content: {min: 5, max: 5}}), /min < max/); assert.throws(() => purpose('purpose:form.slider', {content: {value: 500}}), /범위 안/); },
  'Range Slider': () => { const h = purpose('purpose:form.range-slider'); assert.equal(count(h, /type="range"/g), 2); assert.match(h, /data-range-edge="low"/); assert.match(h, /data-range-edge="high"/); assert.throws(() => purpose('purpose:form.range-slider', {content: {low: 90, high: 10}}), /low ≤ high/); },
  Rating: () => { const h = purpose('purpose:form.rating'); assert.equal(count(h, /type="radio"/g), 5, 'five real radios, not five text boxes'); assert.equal(count(h, /name="rating"/g), 5); assert.match(h, /value="4"[^>]* checked|checked[^>]*value="4"/); assert.doesNotMatch(h, /type="text"/); },
  'Color Picker': () => { const h = purpose('purpose:form.color'); assert.match(h, /type="color"/); assert.throws(() => purpose('purpose:form.color', {content: {value: 'red'}}), /#RRGGBB/); },
  Calendar: () => { const h = calendarPage(); assert.match(h, /<section[^>]*class="kit-calendar"[^>]*aria-labelledby=/); assert.match(h, /<caption>\d{4}년 \d+월<\/caption>/); assert.equal(count(h.match(/<table>[\s\S]*?<\/table>/g).find(t => t.includes('일</th>')) ?? '', /<th scope="col">/g), 7); },
  'Date Picker': () => { const h = purpose('purpose:form.date', {content: {min: '2026-11-01', max: '2026-11-30'}}); assert.match(h, /type="date"/); assert.match(h, /min="2026-11-01"/); assert.match(h, /max="2026-11-30"/); assert.throws(() => purpose('purpose:form.date', {content: {value: '2026-02-30'}}), /유효한 날짜/); assert.throws(() => purpose('purpose:form.date', {content: {min: '2026-12-01', max: '2026-11-01'}}), /범위/); },
  'Date Range Picker': () => { const h = purpose('purpose:form.date-range'); assert.match(h, /<fieldset[^>]*><legend>기간<\/legend>/); assert.equal(count(h, /type="date"/g), 2); assert.match(h, /data-date-range/); assert.match(h, /data-range-edge="low"/); assert.match(h, /data-range-edge="high"/); assert.throws(() => purpose('purpose:form.date-range', {content: {start: '2026-11-20', end: '2026-11-10'}}), /시작일 ≤ 종료일/); },
  'Time Picker': () => { const h = purpose('purpose:form.time', {content: {min: '09:00', max: '18:00'}}); assert.match(h, /type="time"/); assert.match(h, /min="09:00"/); assert.throws(() => purpose('purpose:form.time', {content: {value: '24:00'}}), /00:00~23:59/); },
  'DateTime Picker': () => { const h = purpose('purpose:form.datetime', {content: {min: '2026-11-01T09:00', max: '2026-11-30T18:00'}}); assert.match(h, /type="datetime-local"/); assert.match(h, /min="2026-11-01T09:00"/); assert.match(h, /max="2026-11-30T18:00"/); assert.throws(() => purpose('purpose:form.datetime', {content: {min: '2026-12-01T00:00', max: '2026-11-01T00:00'}}), /범위/); },
  'Month Picker': () => { const h = purpose('purpose:form.month', {content: {min: '2026-03', max: '2026-09'}}); assert.match(h, /type="month"/); assert.match(h, /min="2026-03"/); assert.throws(() => purpose('purpose:form.month', {content: {value: '2026-13'}}), /YYYY-MM/); },
  'Week Picker': () => { const h = purpose('purpose:form.week'); assert.match(h, /type="week"/); assert.match(h, /value="2026-W48"/); },
  'Schedule Selector': () => { const h = purpose('purpose:form.schedule'); assert.equal(count(h, /type="checkbox"/g), 7); assert.equal(count(h, /type="checkbox"[^>]* checked|checked[^>]*type="checkbox"/g), 3); assert.match(h, /type="time"/); for (const d of ['일', '월', '화', '수', '목', '금', '토']) assert.equal(count(h, new RegExp(`>${d}요일<`, 'g')), 1, `${d}요일 is named once`); assert.equal(count(h, />[일월화수목금토]<\/label>/g), 0, 'no bare one-letter duplicate label'); },
};

test('§6.2 B·C·D names in REQUEST.md equal the coverage requirements (14 + 15 + 8 = 37, direct 28, variant 9)', () => {
  const expected = [...names('B'), ...names('C'), ...names('D')];
  assert.equal(expected.length, 37);
  assert.deepEqual([...reqs.map(r => r.name)].sort(), [...expected].sort());
  assert.equal(reqs.filter(r => r.coverage === 'direct').length, 28);
  assert.equal(reqs.filter(r => r.coverage === 'variant').length, 9);
  assert.equal(reqs.filter(r => ['missing', 'schema'].includes(r.coverage)).length, 0);
  assert.deepEqual(Object.keys(MEANING).sort(), [...expected].sort(), 'every row has a meaning check');
});
for (const name of Object.keys(MEANING)) test(`§6.2 ${name}: the row renders what its name means`, () => { const r = byName.get(name); assert.ok(r && r.materialIds.length >= 1, `${name} is covered`); MEANING[name](); });

test('§6.2 variant rows: each recorded axis value changes the render of the material that carries it', () => {
  const recorded = Object.fromEntries(reqs.filter(r => r.coverage === 'variant').map(r => [r.name, r.variant]));
  assert.deepEqual(recorded, {Textarea: {kind: 'multiline'}, 'Password Input': {kind: 'password'}, 'Number Input': {kind: 'number'}, 'Email Input': {kind: 'email'}, 'Phone Input': {kind: 'tel'}, 'URL Input': {kind: 'url'}, 'Searchable Select': {search: 'local'}, Combobox: {search: 'async'}, 'Multi-select': {mode: 'multiple'}});
  const kinds = ['multiline', 'password', 'number', 'email'].map(kind => input({kind}));
  assert.equal(new Set([input({}), ...kinds]).size, 5);
  assert.equal(new Set([select({}), select({search: 'local'}), select({search: 'async'}), select({mode: 'multiple'})]).size, 4);
});
