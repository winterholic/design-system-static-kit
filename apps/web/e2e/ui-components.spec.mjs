// 공용 UI 부품(apps/web/ui)의 동작 시험. /dev/ui 에 모아 둔 상태를 키보드·마우스·모바일로 확인한다.
import {expect, test} from '@playwright/test';

const fruit = page => page.locator('#ui-fruit');
const listbox = page => page.getByRole('listbox');

test.beforeEach(async ({page}) => { await page.goto('/dev/ui'); });

test.describe('Select 키보드', () => {
  test('Enter로 열고 ↓로 옮겨 Enter로 고르면 닫히고 초점이 버튼에 남는다', async ({page}) => {
    const trigger = fruit(page);
    await trigger.focus();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(listbox(page)).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-activedescendant', /opt-0$/);
    await page.keyboard.press('ArrowDown');
    await expect(trigger).toHaveAttribute('aria-activedescendant', /opt-1$/);
    await page.keyboard.press('Enter');
    await expect(listbox(page)).toBeHidden();
    await expect(page.getByTestId('fruit-value')).toHaveText('선택값: banana');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('data-value', 'banana');
  });

  test('Space·↓·↑로도 열리고 Esc는 값을 바꾸지 않고 닫는다', async ({page}) => {
    const trigger = fruit(page);
    for (const key of [' ', 'ArrowDown', 'ArrowUp']) {
      await trigger.focus();
      await page.keyboard.press(key);
      await expect(listbox(page), key).toBeVisible();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');
      await expect(listbox(page), `${key} 뒤 Esc`).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('data-value', 'apple');
    }
  });

  test('Home·End·PageDown과 글자 입력(typeahead)으로 옮긴다', async ({page}) => {
    const trigger = page.locator('#ui-many');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    await expect(trigger).toHaveAttribute('aria-activedescendant', /opt-29$/);
    await page.keyboard.press('Home');
    await expect(trigger).toHaveAttribute('aria-activedescendant', /opt-0$/);
    await page.keyboard.press('PageDown');
    await expect(trigger).toHaveAttribute('aria-activedescendant', /opt-10$/);
    await page.keyboard.press('Escape');
    // 닫힌 채로 글자를 치면 열면서 그 글자로 시작하는 항목으로 간다.
    const fruitTrigger = fruit(page);
    await fruitTrigger.focus();
    await page.keyboard.press('d');
    await expect(listbox(page)).toBeVisible();
    await expect(fruitTrigger).toHaveAttribute('aria-activedescendant', /opt-4$/);
    await page.keyboard.press('Enter');
    await expect(fruitTrigger).toHaveAttribute('data-value', 'daikon');
  });

  test('비활성 항목은 화살표로 닿아도 Enter로 고를 수 없고 이유 코드가 보인다', async ({page}) => {
    const trigger = fruit(page);
    await trigger.focus();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expect(trigger).toHaveAttribute('aria-activedescendant', /opt-3$/);
    const carrot = listbox(page).locator('[data-value="carrot"]');
    await expect(carrot).toHaveAttribute('aria-disabled', 'true');
    await expect(carrot).toContainText('SEASON');
    await page.keyboard.press('Enter');
    await expect(listbox(page)).toBeVisible();
    await expect(trigger).toHaveAttribute('data-value', 'apple');
    await carrot.click({force: true}); // aria-disabled 항목은 Playwright가 기다리므로 강제로 누른다
    await expect(listbox(page)).toBeVisible();
    await expect(trigger).toHaveAttribute('data-value', 'apple');
  });

  test('Tab은 선택 없이 닫고 다음 칸으로 간다', async ({page}) => {
    const trigger = fruit(page);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(listbox(page)).toBeHidden();
    await expect(trigger).toHaveAttribute('data-value', 'apple');
    await expect(trigger).not.toBeFocused();
  });
});

test.describe('Select 마우스·오류·비활성', () => {
  test('누르면 열리고 항목을 누르면 선택되고, 바깥을 누르면 닫힌다', async ({page}) => {
    const trigger = fruit(page);
    await trigger.click();
    await expect(listbox(page)).toBeVisible();
    await listbox(page).locator('[data-value="blueberry"]').click();
    await expect(trigger).toHaveAttribute('data-value', 'blueberry');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(listbox(page)).toBeVisible();
    await page.getByRole('heading', {name: 'Input'}).click();
    await expect(listbox(page)).toBeHidden();
  });

  test('항목을 묶음 제목 아래에 보이고 선택 항목에 aria-selected가 붙는다', async ({page}) => {
    await fruit(page).click();
    await expect(listbox(page).getByRole('group', {name: '채소'})).toBeVisible();
    await expect(listbox(page).locator('[aria-selected="true"]')).toHaveAttribute('data-value', 'apple');
  });

  test('오류가 있으면 aria-invalid와 오류 문구가 연결되고, 고르면 사라진다', async ({page}) => {
    const trigger = page.locator('#ui-required');
    await expect(trigger).toHaveAttribute('aria-invalid', 'true');
    const describedby = await trigger.getAttribute('aria-describedby');
    await expect(page.locator(`#${describedby}`)).toHaveText('값을 골라야 합니다.');
    await trigger.click();
    await listbox(page).locator('[data-value="apple"]').click();
    await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('값을 골라야 합니다.')).toHaveCount(0);
  });

  test('비활성 Select는 열리지 않는다', async ({page}) => {
    const trigger = page.locator('#ui-disabled');
    await expect(trigger).toBeDisabled();
    await trigger.click({force: true});
    await expect(listbox(page)).toHaveCount(0);
  });

  test('이름 있는 라벨이 combobox에 연결된다', async ({page}) => {
    await expect(page.getByRole('combobox', {name: '과일'})).toBeVisible();
    await expect(page.getByLabel('긴 목록')).toBeVisible();
  });
});

test.describe('Select 모바일', () => {
  test.use({viewport: {width: 390, height: 780}, hasTouch: true});

  test('좁은 화면에서는 아래에서 올라오는 시트로 열리고 항목 높이가 48px 이상이며 닫기로 닫힌다', async ({page}) => {
    const trigger = fruit(page);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.tap();
    const list = listbox(page);
    await expect(list).toBeVisible();
    const sheet = page.locator('[data-select-popup]');
    const box = await sheet.boundingBox();
    expect(box.x).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.y + box.height)).toBe(780);
    const option = list.locator('[data-value="banana"]');
    expect((await option.boundingBox()).height).toBeGreaterThanOrEqual(48);
    await sheet.getByRole('button', {name: '닫기'}).tap();
    await expect(list).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.tap();
    await option.tap();
    await expect(trigger).toHaveAttribute('data-value', 'banana');
  });

  test('긴 목록은 시트 안에서만 스크롤되고 화면 높이를 넘지 않는다', async ({page}) => {
    const trigger = page.locator('#ui-many');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.tap();
    const box = await page.locator('[data-select-popup]').boundingBox();
    expect(box.height).toBeLessThanOrEqual(780 * 0.72 + 1);
    const scrollable = await listbox(page).evaluate(el => el.scrollHeight > el.clientHeight);
    expect(scrollable).toBe(true);
  });
});

test.describe('Input·Button·Chip·Segmented', () => {
  test('입력은 라벨·도움말·오류를 aria로 연결하고 비활성이면 입력할 수 없다', async ({page}) => {
    const name = page.getByLabel('이름');
    await expect(name).toHaveAttribute('aria-describedby', /hint$/);
    await name.fill('홍길동');
    await expect(name).toHaveValue('홍길동');
    const email = page.getByLabel('이메일');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`#${await email.getAttribute('aria-describedby')}`)).toHaveText('이메일 형식이 아닙니다.');
    await expect(page.getByLabel('잠긴 칸')).toBeDisabled();
  });

  test('버튼은 눌리고 비활성 버튼은 눌리지 않으며 칩은 aria-pressed로 켜고 끈다', async ({page}) => {
    await page.getByRole('button', {name: '기본 동작'}).click();
    await expect(page.getByTestId('clicks')).toHaveText('눌린 횟수 1');
    await expect(page.getByRole('button', {name: '비활성', exact: true})).toBeDisabled();
    const chip = page.getByRole('button', {name: '새것'});
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', {name: '품절'})).toBeDisabled();
  });

  test('Segmented는 화살표 키로 옮기며 선택하고 비활성 항목은 건너뛴다', async ({page}) => {
    const light = page.getByRole('radio', {name: '라이트'});
    await light.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', {name: '다크'})).toBeFocused();
    await expect(page.getByTestId('mode-value')).toHaveText('모드: dark');
    await page.keyboard.press('ArrowRight');
    await expect(light).toBeFocused();
    await expect(page.getByTestId('mode-value')).toHaveText('모드: light');
    await expect(page.getByRole('radio', {name: '자동'})).toBeDisabled();
  });
});
