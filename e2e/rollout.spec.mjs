import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {compile} from '../src/compiler.mjs';
import {spacingProbe, PROBE_OPTIONS} from '../scripts/design-qa/spacing-probe.mjs';
const inputs=JSON.parse(readFileSync(new URL('../docs/evidence/context-rollout/inputs.json',import.meta.url)));
const sample=id=>inputs.find(x=>x.id===id).blueprint;
test('long biographies keep readable cells in a desktop aside and on mobile',async({page})=>{
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.setContent(compile(sample('long-team')).html);
  const paragraphs=await page.locator('.kit-team p').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,font:parseFloat(getComputedStyle(e).fontSize)})));
  expect(paragraphs.length).toBeGreaterThan(0);for(const p of paragraphs)expect(p.width/p.font).toBeGreaterThan(14);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
test('property stacking keeps the established proximity on mobile',async({page})=>{
 for(const id of ['museum-home','cafe-home','clinic-home','wedding-invite','recipe-detail','research-paper']){
  await page.setViewportSize({width:390,height:900});await page.setContent(compile(sample(id)).html);
  expect((await page.evaluate(spacingProbe,PROBE_OPTIONS)).findings.filter(f=>f.code==='PROXIMITY'),id).toEqual([]);
 }
});
test('gallery variants use their 300px supporting region at desktop viewport width',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 for(const [id,columns] of [['contained-gallery-masonry',1],['contained-gallery-showcase',4]]){
  await page.setContent(compile(sample(id)).html);
  const layout=await page.locator('.kit-gallery>ul').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
  expect(layout,id).toBe(columns);
  expect(await page.locator('.kit-gallery').evaluate(e=>getComputedStyle(e).containerName)).toBe('kit gallery');
  expect(await page.locator('.kit-layout-region').first().evaluate(e=>getComputedStyle(e).containerName)).toBe('kit compose');
 }
});
