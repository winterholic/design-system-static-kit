import {test, expect} from '@playwright/test';
import {compile} from '../src/compiler.mjs';
import {createBlueprint} from '../src/catalog.mjs';

test('contextual centered chrome keeps identity and action on one row at phone and desktop widths', async ({page}) => {
  for (const id of ['blog-index','beauty-detail','wine-list','news-home','museum-home']) for (const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.setContent(compile(createBlueprint(id)).html);
    const geometry=await page.evaluate(()=>{
      const r=s=>document.querySelector(s).getBoundingClientRect(),b=r('.kit-brand'),a=r('.kit-header-action');
      return {delta:Math.abs(b.y+b.height/2-a.y-a.height/2),overlap:b.right>a.x+.5,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    expect(geometry.delta,id+'@'+width).toBeLessThanOrEqual(1);
    expect(geometry.overlap,id+'@'+width).toBe(false);
    expect(geometry.overflow,id+'@'+width).toBe(false);
    await expect(page.locator('.kit-header-primary a')).toHaveCount(2);
  }
});

test('tables keep readable content, quantitative alignment, reachable last columns and keyboard focus', async ({page}) => {
  await page.setViewportSize({width:320,height:900});
  for (const id of ['docs-reference','api-reference','admin-table','sales-dashboard']) {
    await page.setContent(compile(createBlueprint(id)).html);
    const result=await page.evaluate(()=>[...document.querySelectorAll('.kit-table-scroll:has(table[data-table-min])')].map(w=>{
      const t=w.querySelector('table'),before=t.textContent;
      w.focus();w.scrollLeft=w.scrollWidth;
      const last=t.querySelector('thead th:last-child').getBoundingClientRect(),region=w.getBoundingClientRect();
      return {last:last.right<=region.right+1&&last.left>=region.left-1,data:before===t.textContent,focus:document.activeElement===w,align:[...t.querySelectorAll('[data-column-align=end]')].every(c=>['end','right'].includes(getComputedStyle(c).textAlign))};
    }));
    expect(result.length,id).toBeGreaterThan(0);
    for(const r of result) expect(r,id).toEqual({last:true,data:true,focus:true,align:true});
  }
});

test('implicit short sequences use available width and explicit chronology stays in rows', async ({page}) => {
  for(const [id,kind] of [['learning-course','steps'],['job-detail','steps'],['hanji-journey','timeline']]) for(const width of [320,1440]) {
    await page.setViewportSize({width,height:900});
    await page.setContent(compile(createBlueprint(id)).html);
    const boxes=await page.locator(`.kit-${kind}>ol>li`).evaluateAll(items=>items.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y}}));
    expect(boxes.length).toBeGreaterThan(1);
    if(width===320) expect(boxes[0].x).toBeCloseTo(boxes[1].x,0);
    else {expect(boxes[0].y).toBeCloseTo(boxes[1].y,0);expect(boxes[1].x).toBeGreaterThan(boxes[0].x);}
  }
  await page.setViewportSize({width:1440,height:900});
  await page.setContent(compile(createBlueprint('game-launch')).html);
  const y=await page.locator('.kit-timeline>ol>li').evaluateAll(items=>items.map(e=>e.getBoundingClientRect().y));
  expect(y[1]).toBeGreaterThan(y[0]);
});
