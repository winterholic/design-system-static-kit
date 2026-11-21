// 공용 Select(role=combobox 버튼 + listbox) 조작 도우미. 네이티브 <select>의 selectOption·option 열거를 대신한다.
import {expect} from '@playwright/test';

/** 목록을 열고 항목 상태를 읽은 뒤 Esc로 닫는다. 열려 있던 목록은 그대로 두지 않는다. */
export async function optionStates(page, trigger) {
  await trigger.click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  const states = await list.getByRole('option').evaluateAll(nodes => nodes.map(n => ({value: n.dataset.value, label: n.textContent.trim(), disabled: n.getAttribute('aria-disabled') === 'true', selected: n.getAttribute('aria-selected') === 'true'})));
  await trigger.press('Escape');
  await expect(list).toBeHidden();
  return states;
}

/** 값으로 항목을 눌러 고른다. 비활성 항목이면 던진다(고를 수 없는 것을 골랐다고 믿지 않도록). skipDisabled면 목록만 닫고 false를 돌려준다. */
export async function pick(page, trigger, value, {skipDisabled = false} = {}) {
  await trigger.click();
  const option = page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`);
  await expect(option).toBeVisible();
  if ((await option.getAttribute('aria-disabled')) === 'true') {
    if (!skipDisabled) throw new Error(`비활성 항목은 고를 수 없다: ${value}`);
    await trigger.press('Escape');
    return false;
  }
  await option.click();
  await expect(page.getByRole('listbox')).toBeHidden();
  return true;
}

export const valueOf = trigger => trigger.getAttribute('data-value');
