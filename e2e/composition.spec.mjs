import {test, expect} from '@playwright/test';
import {compile} from '../src/compiler.mjs';
import {contextSamples} from '../scripts/design-qa/context-samples.mjs';
import {contextProbe} from '../scripts/design-qa/context-probe.mjs';
import {createBlueprint} from '../src/catalog.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from '../scripts/design-qa/layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from '../scripts/design-qa/spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from '../scripts/design-qa/text-probe.mjs';

test('context probe detects legacy defects, then contextual policy removes them at identical viewport and content', async ({page}) => {
  const samples = contextSamples();
  for (const [id, width, code] of [['long-summary',390,'SUMMARY_HIERARCHY'],['contained-form',1440,'FIELD_CAPACITY'],['contained-split',1440,'SPLIT_CAPACITY']]) {
    const b = samples.find(x => x.id === id).blueprint;
    await page.setViewportSize({width, height:900});
    await page.setContent(compile({...b,catalogVersion:'2.1.0'}).html);
    expect((await page.evaluate(contextProbe)).findings.map(x=>x.code)).toContain(code);
    await page.setContent(compile(b).html);
    expect((await page.evaluate(contextProbe)).findings, id).toEqual([]);
  }
});

test('commerce hierarchy, mixed-script summary leading and hero frame containment regressions', async ({page}) => {
  for (const [id,theme,width,code] of [['beauty-detail',null,1440,'HIER_INVERT'],['campaign-donate',null,390,'EDGE'],['saas-landing','signal',1440,'OVERFLOW_X']]) {
    await page.setViewportSize({width,height:900});
    await page.setContent(compile(createBlueprint(id,theme??undefined)).html);
    const findings=[...(await page.evaluate(layoutProbe,LAYOUT_OPTIONS)).findings,...(await page.evaluate(spacingProbe,PROBE_OPTIONS)).findings,...(await page.evaluate(textProbe,TEXT_PROBE_OPTIONS)).findings];
    expect(findings.filter(f=>f.code===code),id+'@'+theme).toEqual([]);
  }
});

test('representative contexts keep content, hierarchy, width budgets and accessible controls across viewports', async ({page}) => {
  for (const {id, blueprint} of contextSamples()) for (const width of [1440, 390, 320]) {
    await page.setViewportSize({width,height:900});
    await page.setContent(compile(blueprint).html);
    expect((await page.evaluate(contextProbe)).findings, id+'@'+width).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), id+'@'+width+' overflow').toBe(true);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});
