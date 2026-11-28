import {expect, test} from '@playwright/test';
import * as service from '@winterholic/design-system-static-kit/service';
import {SCENARIOS} from '../features/platform/type-scenarios.mjs';

// REQUEST §5.5 타이포그래피 페이지. 운영 빌드의 Chromium 에서 390px·1280px 로 직접 조작한다.
// 증거는 주소가 아니라 계산 스타일, 컴파일된 문서, 화면에 붙은 Core 요청(data-request), 실제로 불러온 폰트다.
const VIEWPORTS = [{name: '1280px', width: 1280, height: 900}, {name: '390px', width: 390, height: 844}];
const enc = request => Buffer.from(JSON.stringify(request)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const renderUrl = (request, part = 'standalone', kind) => `/platform/render?r=${enc(request)}&part=${part}${kind ? `&k=${kind}` : ''}`;

const allTypeSystems = (() => {
  const items = [];
  let cursor;
  do {
    const page = service.listPlatformMaterials({kind: 'type-system', limit: 200, ...(cursor ? {cursor} : {})});
    items.push(...page.value.items);
    cursor = page.value.nextCursor;
  } while (cursor);
  return items.map(item => item.id.slice('type-system:'.length));
})();
/** 시나리오의 같은 콘텐츠를 Core 가 받는 시스템. 시스템마다 허용 맥락이 달라 모든 시나리오를 받는 시스템은 없다. */
const acceptedBy = scenario => allTypeSystems.filter(id => service.assembleDesign({purpose: SCENARIOS[scenario].purpose, content: SCENARIOS[scenario].content, typeSystem: `type-system:${id}`, mode: 'light', candidates: 1}).ok);

const noHorizontalOverflow = async page => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, '가로 넘침이 없어야 한다').toBeLessThanOrEqual(0);
};
const paintedImages = async (page, selector) => {
  const images = page.locator(selector);
  await images.evaluateAll(nodes => nodes.forEach(img => { img.loading = 'eager'; }));
  await expect.poll(() => images.evaluateAll(nodes => nodes.length > 0 && nodes.every(img => img.complete && img.naturalWidth > 0)), {message: `${selector} 그림이 그려져야 한다`}).toBe(true);
};
/** 컴파일된 standalone 문서를 지금 화면 폭으로 열어 읽는다. */
async function compiled(page, request, kind) {
  const doc = await page.context().newPage();
  await doc.setViewportSize(page.viewportSize());
  await doc.goto(renderUrl(request, 'standalone', kind));
  const out = await doc.evaluate(() => {
    const h = document.querySelector('h1, h2'), body = document.body;
    return {headingFont: h && getComputedStyle(h).fontFamily, headingSize: h && getComputedStyle(h).fontSize, bodyFont: getComputedStyle(body).fontFamily, text: body.textContent.replace(/\s+/g, ' ').trim(), markup: document.documentElement.outerHTML};
  });
  await doc.close();
  return out;
}

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});

    test('전체 카탈로그: 41종이 같은 제목·본문으로 서로 다른 서체·크기를 보이고 첫 화면은 24개 이하다', async ({page}) => {
      await page.goto('/materials/typography');
      await expect(page.getByTestId('type-catalog-count')).toContainText('41개 결과');
      const cards = page.getByTestId('type-catalog-grid').locator('> li');
      await expect(cards).toHaveCount(24);
      await noHorizontalOverflow(page);
      expect(await page.locator('iframe').count()).toBe(0);
      expect(await page.locator('[data-testid=type-catalog-grid] img').count(), '카드 목록은 그림을 읽지 않는다(스타일로 그린 견본)').toBe(0);

      const readCards = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=type-catalog-grid] > li')].map(card => {
        const title = card.querySelector('p[class*=typeCardTitle]'), body = title.nextElementSibling, t = getComputedStyle(title), b = getComputedStyle(body);
        return {
          id: card.dataset.system, titleText: title.innerText, bodyText: body.innerText,
          signature: [t.fontFamily, t.fontSize, t.fontWeight, t.lineHeight, t.letterSpacing, b.fontFamily, b.fontSize, b.fontWeight].join(' | '), titleFamily: t.fontFamily,
          facts: Object.fromEntries([...card.querySelectorAll('dl > div')].map(row => [row.querySelector('dt').innerText, row.querySelector('dd').innerText])),
          tags: [...card.querySelectorAll('[class*=typeCardHead] span')].map(span => span.innerText),
        };
      }));
      const rows = await readCards();
      await page.goto('/materials/typography?page=2');
      await expect(cards).toHaveCount(17);
      rows.push(...await readCards());
      expect(rows).toHaveLength(41);
      expect(new Set(rows.map(row => row.id)).size).toBe(41);
      expect(new Set(rows.map(row => row.titleText)).size, '같은 제목 샘플').toBe(1);
      expect(new Set(rows.map(row => row.bodyText)).size, '같은 본문 샘플').toBe(1);
      expect(new Set(rows.map(row => row.signature)).size, '41종의 계산된 서체·크기·굵기·행간·자간 조합이 모두 다르다').toBe(41);
      expect(new Set(rows.map(row => row.titleFamily)).size, '제목 서체 스택이 여러 종류다').toBeGreaterThanOrEqual(10);
      for (const row of rows) {
        for (const key of ['서체 조합', '사용 맥락', '숫자', '라벨']) expect(row.facts[key], `${row.id} ${key}`).toBeTruthy();
        expect(row.tags, `${row.id} 계열·밀도 태그`).toHaveLength(2);
      }
    });

    test('검색·계열 필터·쪽 이동은 주소에 남고 뒤로·앞으로 가기로 복원된다', async ({page}) => {
      await page.goto('/materials/typography');
      const firstId = () => page.getByTestId('type-catalog-grid').locator('> li').first().getAttribute('data-system');
      const first1 = await firstId();
      await page.getByRole('link', {name: '다음'}).click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByTestId('type-catalog-count')).toContainText('2/2쪽');
      const first2 = await firstId();
      expect(first2).not.toBe(first1);
      await page.goBack();
      await expect(page).not.toHaveURL(/page=2/);
      expect(await firstId()).toBe(first1);
      await page.goForward();
      await expect(page).toHaveURL(/page=2/);
      expect(await firstId()).toBe(first2);

      await page.goto('/materials/typography');
      await page.getByRole('searchbox', {name: '검색'}).fill('finance');
      await page.getByRole('combobox', {name: '계열'}).selectOption('finance');
      await page.getByRole('button', {name: '필터 적용'}).click();
      await expect(page).toHaveURL(/q=finance/);
      await expect(page).toHaveURL(/family=finance/);
      const count = await page.getByTestId('type-catalog-count').innerText();
      const shown = await page.getByTestId('type-catalog-grid').locator('> li').count();
      expect(count).toContain(`${shown}개 결과`);
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBeLessThan(41);
      for (const tag of await page.getByTestId('type-catalog-grid').locator('[class*=typeCardHead] span:first-child').allInnerTexts()) expect(tag).toBe('금융');
      await page.reload();
      await expect(page.getByRole('searchbox', {name: '검색'})).toHaveValue('finance');
      await expect(page.getByRole('combobox', {name: '계열'})).toHaveValue('finance');
      expect(await page.getByTestId('type-catalog-grid').locator('> li').count()).toBe(shown);
      await page.goBack();
      await expect(page).not.toHaveURL(/q=finance/);
      await expect(page.getByTestId('type-catalog-count')).toContainText('41개 결과');
      await page.goForward();
      await expect(page.getByTestId('type-catalog-count')).toContainText(`${shown}개 결과`);

      await page.goto('/materials/typography?q=존재하지않는서체');
      await expect(page.getByTestId('type-catalog-count')).toContainText('0개 결과');
      await expect(page.getByText('조건에 맞는 타이포 시스템이 없습니다')).toBeVisible();
    });

    test('상세 Specimen: 27개 역할, 굵기, 다국어, 금융 숫자, 코드가 실제로 그 시스템의 서체로 렌더된다', async ({page}) => {
      await page.goto('/materials/typography?system=work-finance-banking');
      const specimen = page.getByTestId('type-specimen');
      await expect(specimen).toBeVisible();
      await expect(page.getByTestId('type-role-list').locator('[data-role]')).toHaveCount(27);
      const read = await page.evaluate(() => {
        const style = el => getComputedStyle(el);
        const roles = Object.fromEntries([...document.querySelectorAll('[data-role]')].map(li => { const p = li.querySelector('p'), s = style(p); return [li.dataset.role, {text: p.innerText, family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, nums: s.fontVariantNumeric, transform: s.textTransform}]; }));
        const finance = document.querySelector('[data-testid=type-finance]'), code = document.querySelector('[data-testid=type-code] code');
        return {
          roles, nums: style(finance).fontVariantNumeric, codeFamily: style(code).fontFamily,
          weights: [...document.querySelectorAll('[data-testid=type-weights] p')].map(p => ({w: p.dataset.weight, computed: style(p).fontWeight})),
          langs: [...document.querySelectorAll('[data-testid=type-multilingual] p')].map(p => ({lang: p.lang, text: p.innerText})),
          amounts: [...document.querySelectorAll('[data-testid=type-finance] td[data-amount]')].map(td => td.dataset.amount),
        };
      });
      const sizes = new Set(Object.values(read.roles).map(role => role.size));
      expect(sizes.size, '역할마다 크기가 다르다').toBeGreaterThan(8);
      expect(read.roles['display-xl'].text).toContain('디자인 시스템');
      expect(read.roles.numeric.text).toMatch(/₩1,280,000\.50/);
      expect(read.roles.kpi.text).toMatch(/₩128,400,000/);
      expect(read.roles.code.text).toContain('npm run build');
      expect(read.roles.code.family, '코드 역할은 고정폭 서체').toMatch(/mono|Menlo|Consolas|Courier/i);
      expect(read.roles['body-md'].family, '본문 역할은 고정폭이 아니다').not.toMatch(/monospace/i);
      expect(read.roles.overline.transform).toBe('uppercase');
      for (const key of ['numeric', 'kpi', 'table-cell']) expect(read.roles[key].nums, `${key} 숫자 정렬`).toContain('tabular-nums');
      expect(read.nums).toContain('tabular-nums');
      expect(read.codeFamily).toMatch(/mono|Menlo|Consolas|Courier/i);
      expect(read.weights).toHaveLength(8);
      for (const w of read.weights) expect(w.computed).toBe(w.w);
      expect(read.langs.map(l => l.lang)).toEqual(['ko', 'en', 'ja', 'zh']);
      expect(read.langs[2].text).toContain('素早い');
      expect(read.amounts).toEqual(['1,111,111', '8,888,888', '10,000,000', '1,000']);
      await noHorizontalOverflow(page);

      // 비례폭 숫자를 선언한 시스템은 그대로 비례폭으로 렌더된다(숫자 정렬 선언이 화면에 닿는다).
      const proportional = allTypeSystems.find(id => service.getTypographySpecimen({id: `type-system:${id}`}).value.numerals === 'proportional');
      await page.goto(`/materials/typography?system=${proportional}`);
      expect(await page.getByTestId('type-finance').evaluate(el => getComputedStyle(el).fontVariantNumeric)).toContain('proportional-nums');
      expect(await page.locator('[data-role=numeric] p').evaluate(el => getComputedStyle(el).fontVariantNumeric)).toContain('proportional-nums');
    });

    test('상세 Specimen: Core 시험 문구 13개가 모두 나오고 정책(줄바꿈·한 줄 유지·스크롤)대로 렌더되며 넘치지 않는다', async ({page}) => {
      const corpus = service.queryMaterials({view: 'typography'}).value.corpus;
      expect(corpus).toHaveLength(13);
      await page.goto('/materials/typography?system=work-finance-banking');
      const items = page.getByTestId('type-corpus').locator('li[data-sample]');
      await expect(items).toHaveCount(13);
      const read = await items.evaluateAll(nodes => nodes.map(li => { const p = li.querySelector('p'), s = getComputedStyle(p); return {id: li.dataset.sample, text: p.innerText, whiteSpace: s.whiteSpace, family: s.fontFamily, nums: s.fontVariantNumeric, fits: p.scrollWidth <= p.clientWidth + 1, boxFits: li.getBoundingClientRect().right <= innerWidth + 0.5}; }));
      expect(read.map(row => row.id)).toEqual(corpus.map(sample => sample.id));
      expect(read.map(row => row.text)).toEqual(corpus.map(sample => sample.text));
      for (const sample of corpus) {
        const row = read.find(item => item.id === sample.id);
        expect(row.boxFits, `${sample.id} 칸이 화면 안에 있다`).toBe(true);
        if (sample.policy === 'wrap') { expect(row.whiteSpace, sample.id).toBe('normal'); expect(row.fits, `${sample.id}는 줄바꿈으로 칸 안에 들어간다`).toBe(true); }
        if (sample.policy === 'nowrap') expect(row.whiteSpace, sample.id).toBe('nowrap');
        if (sample.policy === 'scroll') expect(row.whiteSpace, sample.id).toBe('pre');
        if (sample.role === 'numeric') expect(row.nums, `${sample.id} 숫자 정렬`).toContain('tabular-nums');
      }
      expect(read.find(row => row.id === 'code').family).toMatch(/mono|Menlo|Consolas|Courier/i);
      await noHorizontalOverflow(page);
    });

    test('상세 Specimen: 버튼·입력·표는 Core 조립 결과이며 내려받는 파일이 Core 가 낸 바이트와 같다', async ({page, request}) => {
      await page.goto('/materials/typography?system=work-insight');
      const controls = page.getByTestId('type-controls');
      await expect(controls.locator('[data-control]')).toHaveCount(3);
      for (const key of ['button', 'input', 'table']) {
        const section = controls.locator(`[data-control=${key}]`);
        const raw = await section.getAttribute('data-request');
        expect(raw, `${key}는 Core 요청이 있다`).toBeTruthy();
        const body = JSON.parse(raw);
        expect(body.typeSystem).toBe('type-system:work-insight');
        const core = service.assembleComponents(body);
        expect(core.ok, JSON.stringify(core.errors)).toBe(true);
        const downloads = {standalone: core.value.standalone, html: core.value.html, css: core.value.css, manifest: JSON.stringify(core.value.manifest, null, 2) + '\n'};
        for (const [part, expected] of Object.entries(downloads)) {
          const link = section.locator(`a[data-part=${part}]`);
          await expect(link).toHaveAttribute('download', '');
          const response = await request.get(await link.getAttribute('href'));
          expect(response.status(), `${key} ${part}`).toBe(200);
          expect(response.headers()['content-disposition']).toContain('attachment');
          // 웹 번들이 인라인 런타임 함수 소스를 압축하므로 standalone 의 <script> 본문만 비교에서 뺀다. 나머지는 한 바이트도 같아야 한다.
          const dropScript = text => part === 'standalone' ? text.replace(/<script>[\s\S]*?<\/script>/g, '<script></script>') : text;
          expect(dropScript(await response.text()), `${key} ${part}는 Core 출력과 같은 바이트(script 본문 제외)`).toBe(dropScript(expected));
        }
      }
      await paintedImages(page, '[data-testid=type-controls] img');
      // 시스템 서체가 실제로 적용된다: 같은 버튼을 다른 시스템으로 조립하면 서체 스택이 다르다.
      const other = JSON.parse(await controls.locator('[data-control=button]').getAttribute('data-request'));
      const a = await compiled(page, other, 'components');
      const b = await compiled(page, {...other, typeSystem: 'type-system:doc-essay', context: 'docs'}, 'components');
      expect(a.bodyFont).not.toBe(b.bodyFont);
    });

    test('상세 Specimen: 허용 맥락이 좁은 시스템도 버튼·입력은 조립되고 못 받는 컨트롤은 Core 이유를 보인다', async ({page}) => {
      await page.goto('/materials/typography?system=doc-essay');
      await expect(page.getByTestId('type-controls').locator('[data-control=button] a[data-part=standalone]')).toHaveAttribute('download', '');
      await expect(page.getByTestId('type-controls').locator('[data-control=input] a[data-part=standalone]')).toHaveAttribute('download', '');
      const note = page.getByTestId('type-controls').locator('[data-control=table] [data-testid=type-control-unavailable]');
      await expect(note).toContainText('Core 조립 제한:');
      expect((await note.innerText()).length, '이유 문구가 비어 있지 않다').toBeGreaterThan(30);
    });

    test('상세 Specimen: 모바일·데스크톱 비교는 폭마다 Core 가 다시 그린 결과다', async ({page}) => {
      await page.goto('/materials/typography?system=work-insight');
      const figures = page.locator('[class*=typeViewportCompare] figure');
      await expect(figures).toHaveCount(2);
      await expect(figures.nth(0).locator('figcaption')).toContainText('390px');
      await expect(figures.nth(1).locator('figcaption')).toContainText('1280px');
      await paintedImages(page, '[class*=typeViewportCompare] img');
      const widths = await figures.locator('img').evaluateAll(nodes => nodes.map(img => ({w: img.getAttribute('width'), h: img.getAttribute('height')})));
      expect(widths).toEqual([{w: '390', h: '844'}, {w: '1280', h: '800'}]);
      // 같은 요청을 390px·1280px 화면에서 열면 제목 크기가 달라진다(역할 크기가 화면 폭에 반응한다).
      const request = {purpose: 'work-dashboard', content: SCENARIOS.erp.content, typeSystem: 'type-system:work-insight', mode: 'light', candidates: 1};
      const sizes = [];
      for (const width of [390, 1280]) {
        const narrow = await page.context().newPage();
        await narrow.setViewportSize({width, height: 900});
        await narrow.goto(renderUrl(request));
        sizes.push(await narrow.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1, h2')).fontSize)));
        await narrow.close();
      }
      expect(sizes[1], '데스크톱 제목이 모바일보다 크다').toBeGreaterThan(sizes[0]);
    });

    test('웹폰트: 켜면 문서에 @font-face 가 붙고 서체를 실제로 불러오며, 끄면 시스템 서체만 쓴다', async ({page}) => {
      await page.goto('/materials/typography?system=work-insight');
      await expect(page.getByTestId('type-fontsource')).toContainText('웹폰트');
      expect(await page.evaluate(() => [...document.fonts].map(font => font.family)), '끈 상태에서는 웹폰트를 선언하지 않는다').toEqual([]);
      const off = await page.locator('[data-role=heading-1] p').evaluate(el => getComputedStyle(el).fontFamily);
      expect(off).not.toContain('Pretendard');

      const fontResponse = page.waitForResponse(response => response.url().includes('/fonts/PretendardGOVVariable.woff2'));
      await page.getByRole('link', {name: '웹폰트 사용'}).click();
      await expect(page).toHaveURL(/webfonts=1/);
      await expect(page.getByTestId('type-fontsource')).toContainText('Pretendard GOV(OFL-1.1)');
      const response = await fontResponse;
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('font/woff2');
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(() => page.evaluate(() => [...document.fonts].filter(font => font.family.includes('Pretendard')).map(font => font.status))).toContain('loaded');
      expect(await page.evaluate(() => document.fonts.check('16px "Pretendard GOV"'))).toBe(true);
      const on = await page.locator('[data-role=heading-1] p').evaluate(el => getComputedStyle(el).fontFamily);
      expect(on.startsWith('"Pretendard GOV"') || on.startsWith('Pretendard GOV')).toBe(true);
      // 웹폰트가 없는 시스템은 켤 수 없다고 말한다.
      await page.goto('/materials/typography?system=work-console&webfonts=1');
      await expect(page.getByTestId('type-fontsource')).toContainText('웹폰트 없이 시스템 서체만');
      expect(await page.evaluate(() => [...document.fonts].length)).toBe(0);
      await noHorizontalOverflow(page);
    });

    test('비교 모드: 최대 4개, 5번째는 거부되고 선택된 시스템만 렌더하며 URL로 복원된다', async ({page}) => {
      const pool = acceptedBy('erp');
      expect(pool.length).toBeGreaterThanOrEqual(5);
      const four = pool.slice(0, 4), fifth = pool[4];
      await page.goto('/materials/typography');
      await expect(page.getByTestId('type-compare')).toContainText('0/4개 선택');
      expect(await page.locator('main img').count(), '선택 전에는 그림이 하나도 없다').toBe(0);
      expect(await page.locator('[data-testid=type-grid] li[data-system]').count()).toBe(0);

      // 카드의 "비교에 추가"로 네 개를 채우고, 다섯 번째 추가는 비활성이다.
      for (const [i, id] of four.entries()) {
        await page.goto(`/materials/typography?scenario=erp&q=${id}${i ? `&with=${four.slice(0, i).join(',')}` : ''}`);
        await page.locator(`li[data-system="${id}"]`).first().getByRole('link', {name: '비교에 추가'}).click();
        await expect(page).toHaveURL(new RegExp(`with=${four.slice(0, i + 1).join('(%2C|,)')}`));
      }
      await page.goto(`/materials/typography?scenario=erp&with=${four.join(',')}`);
      await expect(page.getByTestId('type-compare')).toContainText('4/4개 선택');
      expect(await page.locator('[data-testid=type-grid] li[data-system]').count()).toBe(4);
      await expect(page.locator('li[data-system] >> button:has-text("비교 4/4")').first()).toBeDisabled();
      await expect(page.getByRole('button', {name: /네 개 선택 한도/}).first()).toBeDisabled();
      expect(await page.locator('li[data-system] >> a:has-text("비교에 추가")').count(), '4개가 차면 어떤 카드에도 추가 링크가 없다').toBe(0);

      // 주소에 5개를 직접 넣어도 4개까지만 받는다.
      await page.goto(`/materials/typography?scenario=erp&with=${[...four, fifth].join(',')}`);
      await expect(page.getByTestId('type-compare')).toContainText('4/4개 선택');
      expect(await page.locator('[data-testid=type-grid] li[data-system]').count()).toBe(4);
      expect(await page.locator(`[data-testid=type-grid] li[data-system="${fifth}"]`).count(), '5번째는 렌더되지 않는다').toBe(0);

      // 선택된 것만 렌더: 그림은 정확히 4개(스크롤 전 지연 로딩 해제 후에도)
      await paintedImages(page, '[data-testid=type-grid] img');
      expect(await page.locator('main img').count()).toBe(4);
      expect(await page.locator('iframe').count()).toBe(0);

      // 선택 해제 → 3개, 뒤로 가기 → 4개 복원
      const selectedUrl = page.url();
      await page.getByRole('list', {name: '타이포 시스템 선택'}).getByRole('link', {name: new RegExp(`✓`)}).first().click();
      await expect(page.getByTestId('type-compare')).toContainText('3/4개 선택');
      await page.goBack();
      await expect(page).toHaveURL(selectedUrl);
      await expect(page.getByTestId('type-compare')).toContainText('4/4개 선택');
      await page.reload();
      expect(await page.locator('[data-testid=type-grid] li[data-system]').count()).toBe(4);
      await noHorizontalOverflow(page);
    });

    test('비교 모드: 다섯 가지 같은 콘텐츠로 바꾸면 같은 문장에서 서체만 다르게 렌더된다', async ({page}) => {
      for (const scenario of ['saas', 'erp', 'editorial', 'commerce', 'mobile']) {
        const pool = acceptedBy(scenario);
        expect(pool.length, `${scenario}: Core 가 받는 시스템`).toBeGreaterThanOrEqual(4);
        const four = pool.slice(0, 4);
        await page.goto(`/materials/typography?with=${four.join(',')}&scenario=saas`);
        await page.getByRole('group', {name: '비교할 콘텐츠'}).getByRole('link', {name: SCENARIOS[scenario].label}).click();
        await expect(page).toHaveURL(new RegExp(`scenario=${scenario}`));
        await expect(page.locator('[data-testid=type-grid] li[data-system]')).toHaveCount(4);
        await expect(page.getByTestId('type-compare')).toContainText(SCENARIOS[scenario].label);
        const requests = await page.locator('[data-testid=type-grid] li[data-system]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.dataset.request)));
        for (const request of requests) {
          expect(request.purpose).toBe(SCENARIOS[scenario].purpose);
          expect(request.content).toEqual(SCENARIOS[scenario].content);
        }
        const docs = [];
        for (const request of requests) docs.push(await compiled(page, request));
        expect(new Set(docs.map(doc => doc.text)).size, `${scenario}: 같은 콘텐츠(본문 텍스트가 같다)`).toBe(1);
        expect(new Set(docs.map(doc => doc.headingFont)).size, `${scenario}: 제목 서체가 시스템마다 갈린다`).toBeGreaterThanOrEqual(2);
        expect(new Set(docs.map(doc => doc.markup)).size, `${scenario}: 컴파일 결과가 모두 다르다`).toBe(4);
        await paintedImages(page, '[data-testid=type-grid] img');
      }
      // 폭 전환도 주소에 남는다.
      await page.getByRole('group', {name: '비교 화면 폭'}).getByRole('link', {name: '모바일 390'}).click();
      await expect(page).toHaveURL(/width=390/);
      await expect(page.getByTestId('type-compare')).toContainText('모바일 390');
    });

    test('비교 모드: Core 가 받지 않는 조합은 이유를 보이고 깨진 Studio 링크를 만들지 않는다', async ({page}) => {
      const accepted = acceptedBy('erp').slice(0, 2);
      const rejected = allTypeSystems.filter(id => !acceptedBy('erp').includes(id)).slice(0, 2);
      expect(rejected).toHaveLength(2);
      await page.goto(`/materials/typography?scenario=erp&with=${[...accepted, ...rejected].join(',')}`);
      const cells = page.locator('[data-testid=type-grid] li[data-system]');
      await expect(cells).toHaveCount(4);
      for (const id of rejected) {
        const cell = page.locator(`[data-testid=type-grid] li[data-system="${id}"]`);
        await expect(cell.getByRole('status')).toContainText('Core가 이 조합을 허용하지 않습니다');
        await expect(cell.getByRole('link', {name: '이 시스템으로 Studio 열기'})).toHaveCount(0);
        await expect(cell.locator('img')).toHaveCount(0);
      }
      for (const id of accepted) {
        const cell = page.locator(`[data-testid=type-grid] li[data-system="${id}"]`);
        const href = await cell.getByRole('link', {name: '이 시스템으로 Studio 열기'}).getAttribute('href');
        await cell.getByRole('link', {name: '이 시스템으로 Studio 열기'}).click();
        await expect(page).toHaveURL(new RegExp(`type=${id}`));
        await expect(page.getByTestId('swap-preview')).toBeVisible();
        await expect(page.getByTestId('swap-error')).toHaveCount(0);
        expect(href).toContain('work-dashboard');
        await page.goBack();
      }
    });

    test('비교 모드: 터치 대상은 44px 이상이고 가로로 넘치지 않는다', async ({page}) => {
      const four = acceptedBy('erp').slice(0, 4);
      await page.goto(`/materials/typography?with=${four.join(',')}&scenario=erp&system=work-insight`);
      await expect(page.getByTestId('type-compare')).toBeVisible();
      const small = await page.evaluate(() => [...document.querySelectorAll('[data-testid=type-compare] a, [data-testid=type-compare] button, form[aria-label*=타이포] input, form[aria-label*=타이포] select, form[aria-label*=타이포] button, [data-testid=type-catalog-grid] li a:not(h2 a), [data-testid=type-catalog-grid] button, nav[aria-label*=페이지] a')]
        .map(el => ({name: (el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 24), r: el.getBoundingClientRect()}))
        .filter(({r}) => r.width > 0 && r.height > 0 && r.height < 43.5)
        .map(({name, r}) => `${name} ${Math.round(r.width)}x${Math.round(r.height)}`));
      expect(small, '높이 44px 미만 대상(카드 제목 링크는 같은 곳으로 가는 44px "Specimen 열기" 버튼이 따로 있어 제외)').toEqual([]);
      await noHorizontalOverflow(page);
    });

    test('Studio 연결: 선택한 시스템으로 Studio 를 열면 미리보기와 내보내기에 그 시스템이 반영된다', async ({page, request}) => {
      const docs = {};
      for (const id of ['work-insight', 'work-finance-banking']) {
        await page.goto(`/materials/typography?system=${id}`);
        await page.getByRole('link', {name: '이 시스템으로 Studio 열기'}).first().click();
        await expect(page).toHaveURL(new RegExp(`type=${id}`));
        await expect(page.getByTestId('swap-preview')).toBeVisible();
        await expect(page.getByTestId('swap-error')).toHaveCount(0);
        await expect(page.locator('#s-type')).toHaveAttribute('data-value', id);
        const label = service.getPlatformMaterial({id: `type-system:${id}`}).value.label;
        await expect(page.getByTestId('selection-summary')).toContainText(label);
        const body = JSON.parse(await page.getByTestId('swap-preview').getAttribute('data-request'));
        expect(body.typeSystem).toBe(`type-system:${id}`);
        await paintedImages(page, '[data-testid=swap-preview] img');
        docs[id] = {body, doc: await compiled(page, body)};
        // 내보내기: 같은 요청의 CSS 가 그 시스템의 제목·본문 서체 변수를 담는다.
        await page.getByRole('link', {name: '6. 내보내기'}).click();
        await expect(page).toHaveURL(/step=export/);
        await expect(page.getByTestId('why')).toContainText(`typeSystem: ${label}`);
        await expect(page.getByTestId('why')).toContainText('내가 고른 값');
        const css = (await (await request.get(renderUrl(body, 'css'))).text()).replace(/\s/g, '');
        const roles = service.getTypographySpecimen({id: `type-system:${id}`}).value.roles;
        const missing = Object.entries(roles).filter(([, role]) => !css.includes(role.fontFamily.replace(/\s/g, ''))).map(([key]) => key);
        expect(missing, '내보내는 CSS 가 27개 역할의 서체 스택을 모두 담는다(Specimen 이 보여 준 값과 같다)').toEqual([]);
        await page.getByText(/HTML 본문 보기/).click();
        expect(await page.getByTestId('export-html').innerText()).toContain('<');
      }
      expect(docs['work-insight'].doc.markup, '다른 시스템이면 컴파일 결과가 다르다').not.toBe(docs['work-finance-banking'].doc.markup);
      expect(docs['work-insight'].doc.headingFont).not.toBe(docs['work-finance-banking'].doc.headingFont);
    });
  });
}

test('비교 선택은 push 상태를 써서 뒤로 가기와 앞으로 가기로 복원한다', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/materials/typography');
  await page.getByRole('link', {name: '비교에 추가'}).first().click();
  await expect(page).toHaveURL(/with=/);
  const selectedUrl = page.url();
  await page.goBack();
  await expect(page).not.toHaveURL(/with=/);
  await page.goForward();
  await expect(page).toHaveURL(selectedUrl);
  await expect(page.getByTestId('type-compare')).toContainText('1/4개 선택');
});

test('Materials 개요에서 타이포그래피 카탈로그로 들어가고 옛 프리셋 주소는 새 Specimen 으로 이어진다', async ({page}) => {
  await page.goto('/materials');
  const card = page.getByRole('heading', {name: '타이포그래피'}).locator('xpath=ancestor::li[1]');
  await expect(card).toContainText('41개 타이포 시스템');
  await expect(card.getByRole('link', {name: '타이포그래피 보기'})).toHaveAttribute('href', '/materials/typography');
  for (const [preset, system] of [['erp', 'tech-erp'], ['document', 'doc-essay'], ['marketing', 'mkt-launch'], ['editorial', 'doc-essay']]) {
    await page.goto(`/materials/typography?preset=${preset}`);
    await expect(page).toHaveURL(new RegExp(`system=${system}`));
    await expect(page.getByTestId('type-specimen')).toBeVisible();
  }
});

test('41개 시스템 전수: 모든 Specimen 이 버튼·입력을 조립하고, 못 받는 것은 이유를 보이며, Studio 링크는 깨지지 않는다', async ({page, request}) => {
  test.setTimeout(420_000);
  expect(allTypeSystems).toHaveLength(41);
  const brokenStudio = [], missingReason = [], noButtonInput = [], noDetail = [];
  for (const id of allTypeSystems) {
    const html = await (await request.get(`/materials/typography?system=${id}`)).text();
    for (const key of ['button', 'input']) if (!new RegExp(`data-control="${key}"[^>]*data-request=`).test(html)) noButtonInput.push(`${id}:${key}`);
    for (const match of html.replace(/<!-- -->/g, '').matchAll(/data-testid="type-control-unavailable">Core 조립 제한: ([^<]*)</g)) if (match[1].trim().length < 10) missingReason.push(id);
    const studio = html.match(/href="(\/studio\/assemble[^"]*)"[^>]*>이 시스템으로 Studio 열기/);
    if (studio) {
      const studioHtml = await (await request.get(studio[1].replace(/&amp;/g, '&'))).text();
      if (studioHtml.includes('data-testid="swap-error"') || studioHtml.includes('data-testid="swap-preview"') === false) brokenStudio.push(id);
    } else {
      // 링크가 없으면 이유가 있어야 하고, 네 가지 페이지 목적을 정말 모두 거부해야 한다.
      expect(html, `${id}: Studio 링크가 없으면 이유가 보인다`).toContain('data-testid="type-studio-unavailable"');
      noDetail.push(id);
    }
  }
  expect(noButtonInput, '버튼·입력이 조립되지 않은 시스템').toEqual([]);
  expect(missingReason, '이유 없는 조립 제한').toEqual([]);
  expect(brokenStudio, 'Studio 에서 오류가 나는 링크').toEqual([]);
  for (const id of noDetail) {
    const accepted = ['saas', 'erp', 'editorial', 'commerce'].filter(key => acceptedBy(key).includes(id));
    expect(accepted, `${id}: 링크를 숨긴 시스템은 어느 시나리오도 받지 않는다`).toEqual([]);
  }
});

test('360px: 비교 도구줄(콘텐츠 5종·폭)과 Specimen 의 코드 견본이 화면 밖으로 넘치지 않는다', async ({page}) => {
  await page.setViewportSize({width: 360, height: 800});
  const four = acceptedBy('erp').slice(0, 4);
  for (const url of ['/materials/typography', `/materials/typography?system=work-insight&with=${four.join(',')}&scenario=erp`, '/materials/typography?system=doc-essay']) {
    await page.goto(url);
    await noHorizontalOverflow(page);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('[class*=seg] a, [data-testid=type-code] code')].filter(el => el.getBoundingClientRect().right > innerWidth + 0.5).map(el => el.innerText.slice(0, 16)));
    expect(clipped, '화면 밖으로 나간 요소').toEqual([]);
  }
});
