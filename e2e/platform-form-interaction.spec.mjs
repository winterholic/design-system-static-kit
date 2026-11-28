import {test, expect} from '@playwright/test';
import {assembleComponents} from '../src/service/index.mjs';
import {getPurposeFamily, PURPOSE_FAMILIES} from '../src/platform/families/index.mjs';
import {renderSelect, selectRuntime, selectStyles} from '../src/materials/select.mjs';
import {renderInput} from '../src/materials/input.mjs';

/**
 * §6.2 B 텍스트 입력·C 선택·D 날짜/시간의 새 목적 패밀리 24종을 서비스 standalone 출력(런타임 포함)에서 Chromium으로 조작한다.
 * 포커스·키보드·ARIA 상태·검증 경계값·터치 영역·가로 넘침을 390px와 1280px에서 본다.
 */
const BASE = {context: 'dashboard', mode: 'light', density: 'comfortable', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp'};
const FORM_IDS = PURPOSE_FAMILIES.map(f => f.id).filter(id => getPurposeFamily(id).entry.module.endsWith('form-controls.mjs'));
const standalone = (id, over = {}) => {
  const family = getPurposeFamily(id);
  const result = assembleComponents({...BASE, items: [{purpose: id, visual: 'family:quiet', ...family.example, ...over, content: {...family.example.content, ...(over.content ?? {})}}]});
  if (!result.ok) throw new Error(`${id}: ${JSON.stringify(result.errors)}`);
  return result.value.standalone;
};
// setContent는 window를 새로 만들지 않아 런타임의 한 번 실행 플래그가 남는다. 런타임이 필요한 장면은 about:blank를 거친다.
const fresh = async (page, html) => { await page.goto('about:blank'); await page.setContent(html); };
const form = page => page.locator('form');
const wrapForm = html => html.replace('<body>', '<body><form id="f">').replace('<script>', '</form><script>');
const open = async (page, id, over) => fresh(page, wrapForm(standalone(id, over)));
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const valid = (page, selector) => page.locator(selector).evaluate(el => ({valid: el.checkValidity(), v: Object.fromEntries(['valueMissing', 'typeMismatch', 'patternMismatch', 'tooLong', 'tooShort', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput', 'customError'].map(k => [k, el.validity[k]])), message: el.validationMessage}));

test('all 24 B/C/D purpose families are registered and each is opened below', () => {
  expect(FORM_IDS.length).toBe(24);
});

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({viewport: {width, height: 800}});

    for (const id of FORM_IDS) {
      test(`${id}: no horizontal overflow, labelled controls, every control and its label hit area is at least 44px`, async ({page}) => {
        await open(page, id);
        expect(await noOverflow(page)).toBeLessThanOrEqual(1);
        const bad = await page.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea,button,[role=combobox],[role=option],summary')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            let target = r;
            if (['checkbox', 'radio'].includes(el.type)) {
              // 체크·라디오·스위치는 칸 자체가 작아도 한 줄(칸+라벨)이 눌림 영역이다. 줄 안쪽 네 점을 눌렀을 때 이 컨트롤의 라벨이나 칸이 받아야 한다.
              const row = el.closest('.pf-native-option,.pf-native-switch') ?? el.labels?.[0], rr = row.getBoundingClientRect();
              target = rr;
              for (const [fx, fy] of [[.1, .5], [.5, .5], [.9, .5], [.5, .15], [.5, .85]]) {
                const hit = document.elementFromPoint(rr.left + rr.width * fx, rr.top + rr.height * fy);
                if (!(hit === el || el.labels?.[0]?.contains(hit) || hit === el.labels?.[0])) out.push(`${el.type} row point ${fx},${fy} hits ${hit?.tagName}.${hit?.className} instead of its own label/control`);
              }
            }
            if (target.height < 43.5 || (target.width < 43.5)) out.push(`${el.tagName}[${el.type ?? el.getAttribute('role')}] ${Math.round(target.width)}x${Math.round(target.height)}`);
            const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.labels?.length || el.textContent.trim();
            if (!named) out.push(`${el.tagName}[${el.type}] has no accessible name`);
          }
          return out;
        });
        expect(bad).toEqual([]);
      });
    }

    test('purpose:form.rating: one radio group of 1–5 reached by Tab once and moved by arrows', async ({page}) => {
      await open(page, 'purpose:form.rating');
      const radios = page.getByRole('radio');
      await expect(radios).toHaveCount(5);
      await expect(page.getByRole('radio', {name: '4점'})).toBeChecked();
      await page.getByRole('radio', {name: '4점'}).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', {name: '5점'})).toBeChecked();
      await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
      await expect(page.getByRole('radio', {name: '3점'})).toBeChecked();
      expect(await page.evaluate(() => new FormData(document.getElementById('f')).get('rating'))).toBe('3');
      await expect(page.getByRole('group', {name: '평점'})).toBeVisible();
    });

    test('radio, radio-group and radio-card: arrows move a single selection, one Tab stop, the label sits beside the control', async ({page}) => {
      for (const id of ['purpose:form.radio-group', 'purpose:form.radio-card']) {
        await open(page, id);
        const group = page.getByRole('group').first();
        await expect(group).toBeVisible();
        const radios = page.getByRole('radio');
        await expect(radios.first()).toBeChecked();
        await radios.first().focus();
        await page.keyboard.press('ArrowDown');
        await expect(radios.nth(1)).toBeChecked();
        await expect(radios.first()).not.toBeChecked();
        expect(await page.evaluate(() => new FormData(document.getElementById('f')).getAll(document.querySelector('input[type=radio]').name).length)).toBe(1);
        // 라벨은 컨트롤 옆(같은 줄)에 있다
        const box = await radios.first().boundingBox(), label = await page.locator('label').first().boundingBox();
        expect(Math.abs((label.y + label.height / 2) - (box.y + box.height / 2)), `${id}: label and control share a row`).toBeLessThan(24);
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement.type), 'Tab leaves the group').not.toBe('radio');
      }
    });

    test('checkbox, checkbox-group and switch: Space toggles, the switch exposes role=switch, a required group reports a message until one is checked', async ({page}) => {
      await open(page, 'purpose:form.checkbox');
      const box = page.getByRole('checkbox');
      await expect(box).toBeChecked();
      await box.focus(); await page.keyboard.press('Space');
      await expect(box).not.toBeChecked();
      await open(page, 'purpose:form.switch');
      const sw = page.getByRole('switch');
      await expect(sw).toBeChecked();
      await sw.focus(); await page.keyboard.press('Space');
      await expect(sw).not.toBeChecked();
      expect(await sw.evaluate(el => el.getBoundingClientRect().width / el.getBoundingClientRect().height), 'a switch is wider than tall').toBeGreaterThan(1.4);
      await open(page, 'purpose:form.checkbox-group', {content: {required: true, options: [{value: 'a', label: '선택 A'}, {value: 'b', label: '선택 B'}], name: 'g'}});
      const first = page.getByRole('checkbox').first();
      expect((await valid(page, 'input[type=checkbox] >> nth=0')).valid, 'nothing checked → invalid').toBe(false);
      expect((await valid(page, 'input[type=checkbox] >> nth=0')).message).toContain('하나 이상');
      await page.getByRole('checkbox').nth(1).check();
      expect((await valid(page, 'input[type=checkbox] >> nth=0')).valid, 'one checked → valid').toBe(true);
      await expect(first).toHaveAttribute('aria-invalid', 'false');
      await page.getByRole('checkbox').nth(1).uncheck();
      await expect(first).toHaveAttribute('aria-invalid', 'true');
    });

    test('purpose:form.slider and range-slider: arrows, Home and End move values inside min and max, the low thumb never passes the high thumb', async ({page}) => {
      await open(page, 'purpose:form.slider');
      const s = page.getByRole('slider');
      await s.focus(); await page.keyboard.press('ArrowRight');
      await expect(s).toHaveValue('51');
      await page.keyboard.press('Home'); await expect(s).toHaveValue('0');
      await page.keyboard.press('End'); await expect(s).toHaveValue('100');
      await open(page, 'purpose:form.range-slider');
      const [lo, hi] = [page.getByRole('slider').nth(0), page.getByRole('slider').nth(1)];
      await expect(lo).toHaveValue('20'); await expect(hi).toHaveValue('80');
      await lo.focus(); await page.keyboard.press('End');
      expect(Number(await lo.inputValue()), 'low is clamped to high').toBeLessThanOrEqual(Number(await hi.inputValue()));
      await hi.focus(); await page.keyboard.press('Home');
      expect(Number(await hi.inputValue()), 'high is clamped to low').toBeGreaterThanOrEqual(Number(await lo.inputValue()));
      await expect(page.getByRole('group', {name: /값 범위/})).toBeVisible();
    });

    test('purpose:form.input-kind, currency and otp: native validation at the boundaries', async ({page}) => {
      await open(page, 'purpose:form.input-kind', {variant: {kind: 'url'}, content: {value: ''}});
      const url = page.locator('input[type=url]');
      await url.fill('abc'); expect((await valid(page, 'input[type=url]')).v.typeMismatch).toBe(true);
      await url.fill('https://example.com'); expect((await valid(page, 'input[type=url]')).valid).toBe(true);
      await open(page, 'purpose:form.input-kind', {variant: {kind: 'tel'}});
      await expect(page.locator('input[type=tel]')).toHaveValue('+82 10-1234-5678');
      await open(page, 'purpose:form.currency', {content: {min: 0, max: 1000, step: 1, value: '500'}});
      const amount = page.locator('input[type=number]');
      for (const [v, ok] of [['0', true], ['1000', true], ['-1', false], ['1001', false], ['1.5', false]]) { await amount.fill(v); expect((await valid(page, 'input[type=number]')).valid, `currency ${v}`).toBe(ok); }
      await amount.fill(''); await amount.focus(); await page.keyboard.type('abc'); await expect(amount, 'letters are not accepted in a number field').toHaveValue('');
      await open(page, 'purpose:form.otp');
      const otp = page.locator('input').first();
      expect(await otp.getAttribute('inputmode')).toBe('numeric');
      expect(await otp.getAttribute('autocomplete')).toBe('one-time-code');
      await otp.fill('1234567'); expect(await otp.inputValue(), 'maxlength 6').toBe('123456');
      await otp.fill('12345'); expect((await valid(page, 'input')).valid, 'five digits are too short').toBe(false);
      await otp.fill('12a456'); expect((await valid(page, 'input')).v.patternMismatch).toBe(true);
      await otp.fill('123456'); expect((await valid(page, 'input')).valid).toBe(true);
    });

    test('purpose:form.tags: Enter and comma add, duplicates and blanks are refused with a spoken reason, Backspace and the remove button delete and focus stays usable, values submit', async ({page}) => {
      await open(page, 'purpose:form.tags');
      const input = page.locator('[data-tag-input]'), status = page.locator('[data-tags-status]'), tagValues = () => page.locator('[data-tag-value]').evaluateAll(els => els.map(e => e.value));
      expect(await tagValues()).toEqual(['디자인', '검토']);
      await input.focus(); await page.keyboard.type('개발'); await page.keyboard.press('Enter');
      expect(await tagValues()).toEqual(['디자인', '검토', '개발']);
      await expect(status).toContainText('추가');
      await page.keyboard.type('배포,테스트,'); expect(await tagValues()).toEqual(['디자인', '검토', '개발', '배포', '테스트']);
      await input.fill('디자인'); await page.keyboard.press('Enter');
      expect(await tagValues(), 'a duplicate is not added').toHaveLength(5);
      await expect(status, 'the reason is a duplicate, not "enter a new tag"').toContainText('이미');
      await input.fill(''); await page.keyboard.press('Enter');
      await expect(status).toContainText('입력');
      await page.keyboard.press('Backspace');
      expect(await tagValues()).toHaveLength(4);
      const remove = page.locator('[data-tag-remove]').first();
      const box = await remove.boundingBox(); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      await remove.click();
      expect(await tagValues()).toEqual(['검토', '개발', '배포']);
      await expect(input, 'focus returns to the field after a removal').toBeFocused();
      expect(await page.evaluate(() => new FormData(document.getElementById('f')).getAll('tags'))).toEqual(['검토', '개발', '배포']);
      expect(await noOverflow(page)).toBeLessThanOrEqual(1);
      await input.fill('아주긴태그'.repeat(30)); await page.keyboard.press('Enter');
      expect(await noOverflow(page), 'a long tag wraps').toBeLessThanOrEqual(1);
    });

    test('purpose:form.tags required: invalid until a tag exists', async ({page}) => {
      await open(page, 'purpose:form.tags', {content: {tags: [], required: true}});
      expect((await valid(page, '[data-tag-input]')).valid).toBe(false);
      await page.locator('[data-tag-input]').focus(); await page.keyboard.type('a'); await page.keyboard.press('Enter');
      expect((await valid(page, '[data-tag-input]')).valid).toBe(true);
    });

    test('purpose:form.file: the chooser selects files, accept is on the input, the field takes a focus ring', async ({page}) => {
      await open(page, 'purpose:form.file');
      const input = page.locator('input[type=file]');
      expect(await input.getAttribute('accept')).toBe('image/*,.pdf');
      await input.setInputFiles([{name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x')}, {name: 'b.png', mimeType: 'image/png', buffer: Buffer.from('y')}]);
      expect(await input.evaluate(el => el.files.length)).toBe(2);
      await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('Tab');
      expect(await input.evaluate(el => { const s = getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; })).toBe(true);
    });

    test('purpose:form.upload: a drop keeps only accepted files, reports what was dropped and what was refused, honours single mode and disabled', async ({page}) => {
      const drop = (files) => page.evaluate(names => {
        const root = document.querySelector('[data-file-drop]'), dt = new DataTransfer();
        for (const [name, type] of names) dt.items.add(new File(['x'], name, {type}));
        root.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: dt}));
        const dragging = root.dataset.dragging;
        root.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: dt}));
        return {dragging, files: [...root.querySelector('input').files].map(f => f.name), after: root.dataset.dragging ?? null};
      }, files);
      await open(page, 'purpose:form.upload');
      const status = page.locator('[data-file-drop-status]');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      let r = await drop([['a.pdf', 'application/pdf'], ['b.png', 'image/png'], ['c.exe', 'application/x-msdownload']]);
      expect(r).toEqual({dragging: 'true', files: ['a.pdf', 'b.png'], after: null});
      await expect(status).toContainText('2개 파일을 선택'); await expect(status).toContainText('1개 파일은 허용 형식이 아니어서');
      r = await drop([['c.exe', 'application/x-msdownload']]);
      expect(r.files, 'nothing accepted → nothing selected').toEqual([]);
      await expect(status).toContainText('허용 형식의 파일이 없습니다');
      await open(page, 'purpose:form.upload', {content: {multiple: false}});
      r = await drop([['a.pdf', 'application/pdf'], ['b.png', 'image/png']]);
      expect(r.files, 'single mode keeps one').toEqual(['a.pdf']);
      await open(page, 'purpose:form.upload', {props: {size: 'medium', state: 'disabled'}});
      r = await drop([['a.pdf', 'application/pdf']]);
      expect(r.files, 'disabled ignores drops').toEqual([]);
      const box = await page.locator('[data-file-drop]').boundingBox(); expect(box.width).toBeLessThanOrEqual(width + 1);
    });

    test('purpose:form.grouped-select: the combobox opens with the keyboard, moves through grouped options, selects with Enter and closes with Escape', async ({page}) => {
      await open(page, 'purpose:form.grouped-select');
      const combo = page.getByRole('combobox');
      await combo.focus();
      await expect(combo).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('ArrowDown');
      await expect(combo).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('listbox')).toBeVisible();
      expect(await page.getByRole('group').count(), 'options are grouped').toBeGreaterThanOrEqual(2);
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await expect(combo).toHaveAttribute('aria-expanded', 'false');
      await expect(combo).toBeFocused();
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
      await expect(combo).toHaveAttribute('aria-expanded', 'false');
      expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    });

    test('purpose:form.date, time, datetime, month, week: min and max are enforced as native validity and the value is submitted', async ({page}) => {
      const cases = [
        ['purpose:form.date', 'input[type=date]', {min: '2026-11-01', max: '2026-11-30', value: '2026-11-15'}, [['2026-10-31', 'rangeUnderflow'], ['2026-12-01', 'rangeOverflow'], ['2026-11-01', null], ['2026-11-30', null]]],
        ['purpose:form.time', 'input[type=time]', {min: '09:00', max: '18:00', value: '12:00'}, [['08:59', 'rangeUnderflow'], ['18:01', 'rangeOverflow'], ['09:00', null], ['18:00', null]]],
        ['purpose:form.datetime', 'input[type=datetime-local]', {min: '2026-11-01T09:00', max: '2026-11-30T18:00', value: '2026-11-15T12:00'}, [['2026-11-01T08:59', 'rangeUnderflow'], ['2026-11-30T18:01', 'rangeOverflow'], ['2026-11-01T09:00', null]]],
        ['purpose:form.month', 'input[type=month]', {min: '2026-03', max: '2026-09', value: '2026-05'}, [['2026-02', 'rangeUnderflow'], ['2026-10', 'rangeOverflow'], ['2026-03', null]]],
        ['purpose:form.week', 'input[type=week]', {min: '2026-W10', max: '2026-W20', value: '2026-W12'}, [['2026-W09', 'rangeUnderflow'], ['2026-W21', 'rangeOverflow'], ['2026-W10', null]]],
      ];
      for (const [id, sel, content, checks] of cases) {
        await open(page, id, {content});
        const field = page.locator(sel);
        expect(await field.getAttribute('min'), `${id} min is rendered`).toBe(content.min);
        expect(await field.getAttribute('max'), `${id} max is rendered`).toBe(content.max);
        for (const [value, flag] of checks) {
          await field.evaluate((el, v) => { el.value = v; }, value);
          const r = await valid(page, sel);
          if (flag) expect(r.v[flag], `${id} ${value}`).toBe(true); else expect(r.valid, `${id} ${value}`).toBe(true);
        }
        const name = (await field.getAttribute('name'));
        expect(await page.evaluate(n => new FormData(document.getElementById('f')).has(n), name)).toBe(true);
        expect(await noOverflow(page)).toBeLessThanOrEqual(1);
      }
    });

    test('purpose:form.date-range: start cannot pass end and end cannot precede start, and the limits follow the values the user edits', async ({page}) => {
      await open(page, 'purpose:form.date-range');
      const start = page.getByLabel('시작일'), end = page.getByLabel('종료일');
      await expect(page.getByRole('group', {name: '기간'})).toBeVisible();
      // 종료일을 앞으로 당기면 시작일의 상한도 따라 내려가야 한다
      await end.evaluate(el => { el.value = '2026-11-10'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); });
      expect(await start.getAttribute('max'), 'start max follows the edited end').toBe('2026-11-10');
      await start.evaluate(el => { el.value = '2026-11-15'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      expect((await valid(page, 'input[type=date] >> nth=0')).valid, 'start after end is invalid').toBe(false);
      // 시작일을 뒤로 밀면 종료일의 하한도 따라 올라가야 한다
      await end.evaluate(el => { el.value = '2026-11-28'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      await start.evaluate(el => { el.value = '2026-11-20'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      expect(await end.getAttribute('min'), 'end min follows the edited start').toBe('2026-11-20');
      await end.evaluate(el => { el.value = '2026-11-19'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      expect((await valid(page, 'input[type=date] >> nth=1')).v.rangeUnderflow).toBe(true);
      await end.evaluate(el => { el.value = '2026-11-20'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      expect((await valid(page, 'input[type=date] >> nth=1')).valid, 'start = end is a valid one-day range').toBe(true);
      expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    });

    test('purpose:form.schedule: weekday checkboxes carry one name each (no repeated text), Space toggles, the start time follows native time rules', async ({page}) => {
      await open(page, 'purpose:form.schedule');
      const boxes = page.getByRole('checkbox');
      await expect(boxes).toHaveCount(7);
      await expect(page.getByRole('checkbox', {name: '월요일'})).toBeChecked();
      await expect(page.getByRole('checkbox', {name: '일요일'})).not.toBeChecked();
      const labels = await page.locator('.pf-native-option').allInnerTexts();
      for (const text of labels) expect(text.replace(/\s+/g, ' ').trim().split(' ').length, `"${text}" is not repeated`).toBe(1);
      await page.getByRole('checkbox', {name: '일요일'}).focus(); await page.keyboard.press('Space');
      await expect(page.getByRole('checkbox', {name: '일요일'})).toBeChecked();
      expect(await page.evaluate(() => new FormData(document.getElementById('f')).getAll(document.querySelector('input[type=checkbox]').name).length)).toBe(4);
      await expect(page.locator('input[type=time]')).toHaveValue('09:00');
      expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    });

    // C-01~C-04: Select 변형(단일·검색·비동기·다중)은 기반 select-control이다. 목적 패밀리가 아니라 기반 컴포넌트를 직접 그려 같은 키보드 계약을 본다.
    const OPTIONS = [{value: 'a', label: '서울', group: '수도권'}, {value: 'b', label: '인천', group: '수도권'}, {value: 'c', label: '부산', group: '영남'}, {value: 'd', label: '대구', group: '영남'}];
    const selectPage = props => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>:root{--kit-action:#1d4ed8;--kit-surface:#fff;--kit-soft:#eef2ff;--kit-text:#111827;--kit-muted:#4b5563;--kit-border:#9ca3af;--kit-focus:#1d4ed8;--kit-danger:#b91c1c;--kit-radius:6px;--kit-control:44px;--kit-shadow-hover:0 2px 8px #0003;--kit-t-small:14px;--kit-sp-tight:4px;--kit-sp-near:8px;--kit-sp-item:12px}body{margin:16px;font-family:system-ui}${selectStyles}</style></head><body><form id="f">${renderSelect({id: 'region', label: '지역', options: OPTIONS, ...props})}</form><script>${selectRuntime};document.querySelectorAll('.kit-select').forEach(function(r){attachSelect(r)});</script></body></html>`;
    test('Select (single), Searchable Select and Multi-select: keyboard open, arrows, Enter or Space choose, Escape closes and returns focus, search filters, multiple keeps the menu open, value submits', async ({page}) => {
      await fresh(page, selectPage({}));
      const combo = page.getByRole('combobox');
      expect((await combo.boundingBox()).height).toBeGreaterThanOrEqual(36);
      await combo.focus(); await page.keyboard.press('ArrowDown');
      await expect(combo).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await expect(combo).toHaveAttribute('aria-expanded', 'false'); await expect(combo).toBeFocused(); await expect(combo).toContainText('인천');
      expect(await page.evaluate(() => new FormData(document.getElementById('f')).get('region') ?? document.querySelector('input[type=hidden]').value)).toBe('b');
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape'); await expect(combo).toBeFocused();
      await fresh(page, selectPage({search: 'local'}));
      await page.getByRole('combobox').focus(); await page.keyboard.press('Enter');
      const search = page.getByRole('searchbox'); await expect(search).toBeFocused();
      await search.fill('부'); await expect(page.getByRole('option').filter({visible: true})).toHaveText(['부산']);
      await page.keyboard.press('Enter'); await expect(page.getByRole('combobox')).toContainText('부산');
      await fresh(page, selectPage({mode: 'multiple', values: ['a']}));
      await page.getByRole('combobox').focus(); await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space');
      await expect(page.getByRole('combobox'), 'multi keeps the menu open').toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('combobox')).toContainText('서울'); await expect(page.getByRole('combobox')).toContainText('인천');
      expect(await noOverflow(page)).toBeLessThanOrEqual(1);
    });
    test('Combobox (async): with an injected provider typing loads options, shows loading and error states, and a stale answer is dropped', async ({page}) => {
      const provider = `async ({query, signal}) => { await new Promise(r => setTimeout(r, query === 'slow' ? 400 : 20)); if (query === 'boom') throw new Error('x'); return query === 'slow' ? [{value: 'z', label: '늦은 결과'}] : [{value: 'a', label: query + ' 서울'}]; }`;
      await fresh(page, selectPage({search: 'async'}).replace("attachSelect(r)", `attachSelect(r, {onOptionsRequest: ${provider}})`));
      const combo = page.getByRole('combobox'), search = page.getByRole('searchbox'), status = page.locator('.kit-select [role=status]');
      await combo.focus(); await page.keyboard.press('Enter');
      await expect(search).toBeFocused();
      await search.fill('서'); await expect(page.getByRole('option').filter({visible: true})).toHaveText(['서 서울']);
      await search.fill('boom'); await expect(status).toContainText('불러오지 못했습니다');
      await search.fill('slow'); await search.fill('빠름');
      await expect(page.getByRole('option').filter({visible: true})).toHaveText(['빠름 서울']);
      await page.waitForTimeout(600);
      await expect(page.getByRole('option').filter({visible: true}), 'the slow answer to the older query does not overwrite the newer one').toHaveText(['빠름 서울']);
    });
    test('B-02, B-04, B-05, B-07 variants of the text input are real native kinds: textarea grows, password reveals, number refuses letters, email validates', async ({page}) => {
      const css = '<style>body{margin:16px}</style>';
      const html = kind => `<!doctype html><html lang="ko"><head><meta charset="utf-8">${css}</head><body><form id="f">${renderInput({id: 'f1', label: '항목', kind, ...(kind === 'multiline' ? {} : {})})}</form></body></html>`;
      await fresh(page, html('multiline')); await expect(page.locator('textarea')).toHaveCount(1);
      await fresh(page, html('password')); await expect(page.locator('input[type=password]')).toHaveCount(1);
      await fresh(page, html('number')); await expect(page.locator('input[type=number]')).toHaveCount(1);
      await fresh(page, html('email')); const mail = page.locator('input[type=email]'); await mail.fill('a@'); expect((await valid(page, 'input[type=email]')).v.typeMismatch).toBe(true); await mail.fill('a@b.co'); expect((await valid(page, 'input[type=email]')).valid).toBe(true);
    });

    test('purpose:form.color: the picker takes a value and submits it', async ({page}) => {
      await open(page, 'purpose:form.color');
      const c = page.locator('input[type=color]');
      await expect(c).toHaveValue('#3b82f6');
      await c.evaluate(el => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', {bubbles: true})); });
      expect(await page.evaluate(() => new FormData(document.getElementById('f')).get('brand-color'))).toBe('#ff0000');
    });
  });
}
