import {expect, test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('홈과 Explore 필터는 URL에 남고 뒤로 가기·새로고침에서 복원된다', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name: /디자인 컴파일러/})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Explore 둘러보기'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Studio에서 만들기'})).toBeVisible();
  await page.goto('/explore');
  await page.getByLabel('페이지 유형').selectOption({index: 1});
  await expect(page).toHaveURL(/type=/);
  const selected = await page.getByLabel('페이지 유형').inputValue();
  const design = page.locator('a[href^="/explore/"]:not([href="/explore/combos"])').first();
  if (await design.count()) { await design.click(); await page.goBack(); }
  await expect(page.getByLabel('페이지 유형')).toHaveValue(selected);
  await page.reload();
  await expect(page.getByLabel('페이지 유형')).toHaveValue(selected);
  await page.getByRole('button', {name: '초기화'}).click();
  await expect(page).toHaveURL(/\/explore$/);
});

test('Explore 상세는 컴파일 바이트와 Blueprint 및 Studio 계약을 제공하고 존재하지 않는 ID는 404', async ({page, request}) => {
  await page.goto('/explore');
  const card = page.locator('a[href^="/explore/"]:not([href="/explore/combos"])').first();
  const href = await card.getAttribute('href');
  const detail = await request.get(href);
  const html = await request.get(`${href}/render`);
  const blueprint = await request.get(`${href}/blueprint.json`);
  expect(detail.status()).toBe(200);
  expect(html.status()).toBe(200);
  expect(blueprint.status()).toBe(200);
  await page.goto(href);
  await expect(page.getByRole('link', {name: 'Studio에서 열기'})).toHaveAttribute('href', /\/studio\?template=/);
  const studioUrl = new URL(await page.getByRole('link', {name: 'Studio에서 열기'}).getAttribute('href'), 'http://localhost');
  expect(studioUrl.searchParams.get('template')).toBe(href.split('/').at(-1).split('~')[0]);
  await expect(page.getByRole('link', {name: /전체 화면/})).toBeVisible();
  expect((await request.get('/explore/not-a-design')).status()).toBe(404);
});

test('Components는 실제 명세를 보여 주고 잘못된 부품 ID는 404', async ({page, request}) => {
  await page.goto('/components');
  await page.getByRole('link', {name: /hero/}).first().click();
  await expect(page.getByRole('heading', {name: '히어로'})).toBeVisible();
  await expect(page.getByRole('heading', {name: '허용 속성'})).toBeVisible();
  await expect(page.getByRole('heading', {name: '놓을 수 있는 자리'})).toBeVisible();
  await expect(page.getByRole('table').getByRole('row').nth(1)).toBeVisible();
  await expect(page.locator('iframe[title*="렌더 결과"]')).toBeVisible();
  expect((await request.get('/components/not-a-component')).status()).toBe(404);
});

test('내부 조합 탐색기는 유지되고 /combos 는 쿼리를 보존하는 307로 이동한다', async ({page, request}) => {
  const query = 'c=saas-landing&theme=aurora&q=%ED%95%9C%EA%B8%80&exp=1&ps=24&p=2';
  const redirect = await request.get(`/combos/?${query}`, {maxRedirects: 0});
  expect(redirect.status()).toBe(307);
  expect(redirect.headers().location).toBe(`/dev/qa/combos?${query}`);
  const response = await page.goto('/dev/qa/combos');
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', {name: /전체 조합/})).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByLabel('조합 검색')).toBeVisible();
  await expect(page.getByLabel('페이지 유형')).toBeVisible();
  await expect(page.getByLabel('쪽 크기')).toBeVisible();
});

test('QA는 여러 보기의 동일 조합 표시를 보존하고 기록의 보기로 재개방·복사·내보낸다', async ({page}) => {
  const id = 'saas-landing~faq:split';
  const records = [
    {c:id,theme:'aurora',mode:'dark',note:'기존 메모 A',at:'2026-11-20T12:00:00.000Z'},
    {c:id,theme:'console',mode:'light',note:'기존 메모 B',at:'2026-11-20T13:00:00.000Z'},
  ];
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
  });
  await page.goto('/dev/qa/combos');
  await page.evaluate(records => localStorage.setItem('winterholic-static-kit.combo-flags.v1',JSON.stringify(records)),records);
  await page.reload();
  await expect(page.getByLabel(`${id} 메모`).nth(0)).toHaveValue('기존 메모 A');
  await expect(page.getByLabel(`${id} 메모`).nth(1)).toHaveValue('기존 메모 B');
  await page.getByLabel('모드').selectOption('light');
  // 이 조합은 진단 등급이 A가 아니라 실험 구성으로 분류돼 기본 목록에서 숨는다.
  // 상태가 URL 갱신 뒤에 반영되므로 check() 대신 클릭하고 반영을 기다린다.
  await page.getByLabel('실험 구성 포함').click();
  await expect(page.getByLabel('실험 구성 포함')).toBeChecked();
  await page.getByLabel('조합 검색').fill(id);
  await page.getByRole('button',{name:`${id} 이상함 표시`,exact:true}).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.combo-flags.v1')));
  expect(saved).toHaveLength(3);
  expect(saved.slice(0,2)).toEqual(records);
  await page.getByRole('button',{name:'삭제'}).nth(1).click();
  const afterDelete = await page.evaluate(() => JSON.parse(localStorage.getItem('winterholic-static-kit.combo-flags.v1')));
  expect(afterDelete).toEqual([records[0],saved[2]]);
  await page.getByRole('button',{name:'기록 링크 복사'}).first().click();
  await expect.poll(()=>page.evaluate(()=>window.__copied)).toContain('theme=aurora');
  await expect.poll(()=>page.evaluate(()=>window.__copied)).toContain('mode=dark');
  await page.getByRole('button',{name:'텍스트 복사'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__copied)).toContain('기존 메모 A');
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'.txt 내보내기'}).click();
  const download=await downloadEvent, path=await download.path();
  expect(download.suggestedFilename()).toBe('odd-combos.txt');
  expect(await readFile(path,'utf8')).toContain('2026-11-20T12:00:00.000Z');
  await page.getByRole('button',{name:'기록 보기'}).first().click();
  await expect(page).toHaveURL(/theme=aurora.*mode=dark/);
  await expect(page.getByRole('button',{name:'공유 주소 복사'})).toBeVisible();
  await expect(page.getByText(/진단 등급 [ABC]|진단 기록 없음/)).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
});

test('공유 URL의 닫기와 Escape는 필터와 쪽을 유지하고 목록에서 연 상세의 뒤로 가기는 복원한다', async ({page}) => {
  const direct = '/dev/qa/combos?q=saas&ps=24&p=2&exp=1&c=saas-landing&theme=aurora&mode=dark';
  await page.goto(direct);
  await page.getByRole('button',{name:'닫기'}).click();
  await expect(page).toHaveURL(/q=saas.*ps=24.*p=2.*exp=1/);
  await expect(page).not.toHaveURL(/(?:\?|&)c=/);
  await page.goto(direct);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/q=saas.*ps=24.*p=2.*exp=1/);
  await expect(page).not.toHaveURL(/(?:\?|&)c=/);
  const listUrl='/dev/qa/combos?q=saas&ps=24&p=2';
  await page.goto(listUrl);
  await page.locator('ul[class*="grid"] button[class*="card"]').first().click();
  await expect(page).toHaveURL(/(?:\?|&)c=/);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(listUrl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));
});
