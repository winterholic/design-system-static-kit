import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {themes,palettes,createBlueprint} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
const frame=page=>page.frameLocator('#preview-frame');
async function loaded(page){await page.goto('/');await expect(page.locator('#valid-status')).toContainText('검증 통과');await expect(frame(page).locator('h1')).toBeVisible();}
const bodyFits=async locator=>locator.evaluate(el=>({viewport:el.clientWidth,scroll:el.scrollWidth}));
test('selection, all 36 palette modes, real computed semantic colors, keyboard and persistence',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await loaded(page);
  for(const t of Object.values(themes)){
    await page.locator(`label.theme-option:has(input[value=${t.id}])`).click();
    for(const p of t.palettes){
      await page.locator(`label.palette-option:has(input[value=${p}])`).click();
      for(const mode of ['light','dark']){
        if((await page.locator('#mode').getAttribute('aria-pressed'))!==(mode==='dark'?'true':'false'))await page.locator('#mode').click();
        await expect(frame(page).locator('html')).toHaveAttribute('data-theme',mode);
        const actual=await frame(page).locator('body').evaluate(el=>({canvas:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color}));
        const b=createBlueprint();Object.assign(b,{theme:t.id,palette:p,mode});const expected=compile(b).tokens;
        const toRgb=hex=>'rgb('+hex.slice(1).match(/../g).map(x=>parseInt(x,16)).join(', ')+')';
        expect(actual.canvas).toBe(toRgb(expected.canvas));expect(actual.text).toBe(toRgb(expected.text));
        await expect(page.locator('#errors')).toBeHidden();
      }
    }
  }
  await page.locator('input[name=theme][value=workspace]').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name=theme][value=editorial]')).toBeChecked();await expect(page.locator('input[name=theme][value=editorial]')).toBeFocused();
  await page.reload();await expect(page.locator('input[name=theme][value=editorial]')).toBeChecked();
  expect(errors).toEqual([]);
});
test('strict JSON errors block exports, keep valid preview, and recover with valid tree',async({page})=>{
  await loaded(page);const original=await frame(page).locator('h1').textContent();
  await page.locator('#node-editor').fill(JSON.stringify({type:'page',style:'color:red',children:[]}));await page.locator('#apply-node').click();
  await expect(page.locator('#errors')).toContainText('UNKNOWN_KEY');await expect(page.locator('#download-html')).toBeDisabled();await expect(page.locator('#download-json')).toBeDisabled();await expect(frame(page).locator('h1')).toHaveText(original);
  await page.locator('#reset').click();await expect(page.locator('#errors')).toBeHidden();await expect(page.locator('#download-html')).toBeEnabled();
  await page.locator('#add-node').selectOption('notice');await page.locator('#add').click();await expect(frame(page).getByText('알려드립니다.')).toBeVisible();
  await page.locator('#move-up').click();await expect(page.locator('#selected-node')).toHaveText('알림');await page.locator('#remove-node').click();await expect(frame(page).getByText('알려드립니다.')).toHaveCount(0);
  await page.locator('#tree button[data-path="3"]').click();
  const node=JSON.parse(await page.locator('#node-editor').inputValue());node.state='error';await page.locator('#node-editor').fill(JSON.stringify(node));await page.locator('#apply-node').click();await expect(frame(page).getByRole('alert')).toContainText('불러오지 못했습니다.');
  const wait=page.waitForEvent('download');await page.locator('#download-html').click();const file=await wait;const content=await readFile(await file.path(),'utf8');expect(content).toContain('data-state="error"');expect(content).toContain('Content-Security-Policy');
});
test('four presets, four shells, Korean long text and mobile panels do not overflow',async({page})=>{
  await loaded(page);
  for(const preset of ['dashboard','landing','article','settings']){
    await page.locator('#preset').selectOption(preset);
    for(const shell of ['sidebar','topbar','editorial','split']){
      await page.locator('#shell').selectOption(shell);await expect(frame(page).locator('.kit-shell')).toHaveAttribute('data-shell',shell);
      const sizes=await bodyFits(frame(page).locator('body'));expect(sizes.scroll).toBeLessThanOrEqual(sizes.viewport+1);
    }
  }
  await page.locator('.raw-editor summary').click();const b=createBlueprint('landing');b.tree.children[0].title='길어진한글제목과긴영문ReferenceWithoutWhitespace'.repeat(8);b.tree.children[0].title=b.tree.children[0].title.slice(0,150);await page.locator('#blueprint-editor').fill(JSON.stringify(b));await page.locator('#apply-blueprint').click();
  for(const width of [390,768,1600]){
    await page.setViewportSize({width,height:900});
    if(width===390)await page.locator('.mobile-tabs button[data-panel=preview]').click();
    const outer=await bodyFits(page.locator('body')),inner=await bodyFits(frame(page).locator('body'));expect(outer.scroll).toBeLessThanOrEqual(outer.viewport+1);expect(inner.scroll).toBeLessThanOrEqual(inner.viewport+1);
    if(width===390){await page.locator('.mobile-tabs button[data-panel=structure]').click();await expect(page.locator('#node-editor')).toBeVisible();await page.locator('.mobile-tabs button[data-panel=choices]').click();await expect(page.locator('#preset')).toBeVisible();}
    await page.screenshot({path:`test-results/layout-${width}.png`,fullPage:true});
  }
});
test('demo form validates locally and never sends user input over the network',async({page})=>{
  const requests=[];await loaded(page);await page.locator('#preset').selectOption('settings');
  page.on('request',request=>{if(!request.url().startsWith('data:'))requests.push(request.url());});
  const f=frame(page);await f.locator('button[type=submit]').click();await expect(f.locator('.kit-form-status')).toHaveText('');
  await f.locator('#field-name').fill('김다선');await f.locator('#field-email').fill('hello@example.com');await f.locator('#field-role').selectOption({label:'개발'});await f.locator('#field-intro').fill('규칙 안에서 다양한 디자인을 조립합니다.');await f.locator('button[type=submit]').click();await expect(f.locator('.kit-form-status')).toContainText('저장하지 않았습니다');expect(requests).toEqual([]);
});
test('catalog and standalone report routes render, generated examples are portable',async({page})=>{
  await loaded(page);await page.locator('#catalog-tab').click();await expect(page.locator('.catalog-card')).toHaveCount(6);await page.locator('[data-choose-theme=editorial]').click();await expect(page.locator('#shell')).toHaveValue('editorial');
  await page.goto('/site/examples/settings/');await page.locator('#field-name').fill('테스트');await expect(page.locator('h1')).toBeVisible();
  await page.goto('/docs/plan.html');await expect(page.locator('h1')).toContainText('검토한 선택');expect(await page.locator('main section').count()).toBeGreaterThanOrEqual(8);
});
