import {expect, test} from '@playwright/test';

// §11 Explore·Studio 재료 선택. 모든 시험은 운영 빌드(next start)의 Chromium 에서 화면을 직접 조작한다.
// 주소가 바뀐 것만으로는 증거로 쓰지 않는다: 결과의 조립 요청(data-request), 실제로 컴파일된 문서의 계산 스타일·DOM 을 함께 본다.
const VIEWPORTS = [{name: '1280px', width: 1280, height: 900}, {name: '390px', width: 390, height: 844}];
const enc = request => Buffer.from(JSON.stringify(request)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const renderUrl = (request, part = 'standalone') => `/platform/render?r=${enc(request)}&part=${part}`;
const keysDiffering = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]));

/** 컴파일된 standalone 문서를 지금 화면 폭으로 열어 계산 스타일과 DOM 구조를 읽는다. */
async function fingerprint(page, request) {
  const doc = await page.context().newPage();
  await doc.setViewportSize(page.viewportSize());
  await doc.goto(renderUrl(request));
  const result = await doc.evaluate(() => {
    const vars = {};
    for (const sheet of document.styleSheets) for (const rule of sheet.cssRules) if (rule.selectorText === ':root') for (const name of rule.style) if (name.startsWith('--')) vars[name] = rule.style.getPropertyValue(name).trim();
    const heading = document.querySelector('h1, h2');
    const card = document.querySelector('.kit-ctl-card');
    return {
      vars, theme: document.documentElement.dataset.theme, text: document.body.innerText,
      structure: [...document.querySelectorAll('body *')].map(el => `${el.tagName}.${el.getAttribute('class') ?? ''}`).join('|'),
      bodyBg: getComputedStyle(document.body).backgroundColor, headingFont: heading && getComputedStyle(heading).fontFamily,
      card: card && (({borderRadius, boxShadow, padding}) => `${borderRadius}/${boxShadow}/${padding}`)(getComputedStyle(card)),
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      markup: document.documentElement.outerHTML,
    };
  });
  await doc.close();
  return result;
}
const varsDiffering = (a, b) => keysDiffering(a.vars, b.vars);

const resultRequests = async page => {
  await expect(page.getByTestId('compare-result')).toHaveCount(2);
  const requests = await page.getByTestId('compare-result').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-request')));
  expect(requests.every(Boolean), '두 결과 모두 Core 조립 요청이 있다').toBe(true);
  return requests.map(text => JSON.parse(text));
};
/** 결과 <img> 가 실제로 그려졌다(디코딩 성공, 크기 > 0). */
const expectImagesPainted = async (page, count = 2) => {
  const images = page.locator('[data-testid=compare-result] img');
  await expect(images).toHaveCount(count);
  await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
};
const compareFor = async (page, url, axis, {left, right} = {}) => {
  await page.goto(url);
  await page.getByRole('combobox', {name: '비교할 축'}).selectOption(axis);
  await page.getByRole('button', {name: '조건 적용하고 비교'}).click();
  await expect(page.getByTestId('compare-results')).toHaveAttribute('data-axis', axis);
  if (left) {
    await page.getByRole('combobox', {name: '왼쪽 재료'}).selectOption(left);
    await page.getByRole('combobox', {name: '오른쪽 재료'}).selectOption(right);
    await page.getByRole('button', {name: '조건 적용하고 비교'}).click();
    await expect(page).toHaveURL(new RegExp(`left=${left}`));
  }
};

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}`, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});

    test('Explore 필터 9종은 선택한 값이 주소·select·두 결과의 조립 요청에 모두 남고 결과는 팔레트 한 축만 다르다', async ({page}) => {
      // [필터 이름, 폼 필드 이름, 고르는 값, 요청에서 확인할 키, 기대값, 비교 축]
      const filters = [
        ['페이지 목적', 'purpose', 'commerce', 'purpose', 'commerce', 'palette'],
        ['디자인 맥락', 'style', 'console', 'styleContext', 'style-context:console', 'palette'],
        ['팔레트 계열', 'palette', 'ocean-cool', 'palette', 'palette:ocean-cool', 'set'],
        ['서브토큰 세트', 'set', 'analytics', 'subtokenSet', 'subtoken-set:analytics', 'palette'],
        ['타이포 시스템', 'type', 'work-console', 'typeSystem', 'type-system:work-console', 'palette'],
        ['시각 패밀리', 'family', 'bold', 'families', ['family:bold'], 'palette'],
        ['밀도·간격 토큰', 'density', 'compact', 'density', 'compact', 'palette'],
        ['레이아웃', 'layout', 'dashboard-grid', 'pattern', 'dashboard-grid', 'palette'],
        ['라이트·다크', 'mode', 'dark', 'mode', 'dark', 'palette'],
      ];
      for (const [label, field, value, requestKey, expected, axis] of filters) {
        await page.goto(`/explore/materials?purpose=${['layout', 'style', 'type', 'set', 'family', 'density'].includes(field) ? 'work-dashboard' : 'saas-landing'}&compare=${axis}`);
        await page.getByRole('combobox', {name: label, exact: true}).selectOption(value);
        await page.getByRole('button', {name: '조건 적용하고 비교'}).click();
        await expect(page).toHaveURL(new RegExp(`[?&]${field}=${value}(&|$)`));
        // 해시·주소만이 아니라 폼 값 복원, 두 결과의 조립 요청, 그려진 이미지를 본다.
        await expect(page.getByRole('combobox', {name: label, exact: true}), `${label} 값이 새 화면에서 유지된다`).toHaveValue(value);
        const [left, right] = await resultRequests(page);
        expect(left[requestKey], `${label}가 왼쪽 요청에 실린다`).toEqual(expected);
        expect(right[requestKey], `${label}가 오른쪽 요청에 실린다`).toEqual(expected);
        expect(keysDiffering(left, right), `${label} 필터 뒤에도 두 결과는 ${axis} 한 축만 다르다`).toEqual([axis === 'set' ? 'subtokenSet' : axis]);
        await expectImagesPainted(page);
        await page.reload();
        await expect(page.getByRole('combobox', {name: label, exact: true})).toHaveValue(value);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침 없음').toBe(true);
    });

    test('Explore 필터가 컴파일 결과를 실제로 바꾼다: 라이트·다크는 테마와 배경색, 밀도는 간격 토큰', async ({page}) => {
      await page.goto('/explore/materials?purpose=work-dashboard&compare=palette');
      const [plain] = await resultRequests(page);
      await page.getByRole('combobox', {name: '라이트·다크'}).selectOption('dark');
      await page.getByRole('combobox', {name: '밀도·간격 토큰'}).selectOption('spacious');
      await page.getByRole('button', {name: '조건 적용하고 비교'}).click();
      const [filtered] = await resultRequests(page);
      const before = await fingerprint(page, plain), after = await fingerprint(page, filtered);
      expect(before.theme).toBe('light');
      expect(after.theme).toBe('dark');
      expect(after.bodyBg).not.toBe(before.bodyBg);
      expect(varsDiffering(before, after).length).toBeGreaterThan(0);
    });

    test('Explore 비교 6종은 화면을 조작해 만든 두 결과가 한 축만 다르고 나머지는 같다', async ({page}) => {
      // 같은 레이아웃, 다른 색상
      await compareFor(page, '/explore/materials?purpose=work-dashboard', 'palette', {left: 'clay-earth', right: 'dusk-violet'});
      let [a, b] = await resultRequests(page);
      expect(keysDiffering(a, b)).toEqual(['palette']);
      let [fa, fb] = [await fingerprint(page, a), await fingerprint(page, b)];
      expect(fa.structure, '레이아웃(DOM 구조) 같음').toBe(fb.structure);
      expect(fa.bodyBg, '색상 다름').not.toBe(fb.bodyBg);
      expect(fa.headingFont, '타이포 같음').toBe(fb.headingFont);
      await expectImagesPainted(page);

      // 같은 팔레트, 다른 서브토큰
      await compareFor(page, '/explore/materials?purpose=work-dashboard&palette=ocean-cool', 'set', {left: 'analytics', right: 'corporate'});
      [a, b] = await resultRequests(page);
      expect(keysDiffering(a, b)).toEqual(['subtokenSet']);
      expect(a.palette).toBe('palette:ocean-cool');
      expect(b.palette).toBe('palette:ocean-cool');
      [fa, fb] = [await fingerprint(page, a), await fingerprint(page, b)];
      expect(fa.structure).toBe(fb.structure);
      expect(varsDiffering(fa, fb).length, '서브토큰 값이 다르다').toBeGreaterThan(0);
      expect(fa.headingFont).toBe(fb.headingFont);

      // 같은 콘텐츠, 다른 타이포
      await compareFor(page, '/explore/materials?purpose=work-dashboard', 'type', {left: 'doc-finance-report', right: 'work-console'});
      [a, b] = await resultRequests(page);
      expect(keysDiffering(a, b)).toEqual(['typeSystem']);
      [fa, fb] = [await fingerprint(page, a), await fingerprint(page, b)];
      expect(fa.structure).toBe(fb.structure);
      expect(fa.text, '같은 콘텐츠').toBe(fb.text);
      expect(fa.headingFont, '제목 서체가 다르다').not.toBe(fb.headingFont);
      expect(fa.bodyBg, '색은 같다').toBe(fb.bodyBg);

      // 같은 컴포넌트, 다른 시각 패밀리
      await compareFor(page, '/explore/materials?purpose=work-dashboard', 'family', {left: 'bold', right: 'glass'});
      await expect(page.getByTestId('family-host')).toBeVisible();
      [a, b] = await resultRequests(page);
      expect(keysDiffering(a, b)).toEqual(['families']);
      expect(a.components).toEqual(b.components);
      [fa, fb] = [await fingerprint(page, a), await fingerprint(page, b)];
      expect(fa.structure).toBe(fb.structure);
      expect(fa.card, '같은 카드의 모서리·그림자·여백이 패밀리마다 다르다').not.toBe(fb.card);
      expect(fa.bodyBg).toBe(fb.bodyBg);

      // 같은 제품 목적, 다른 레이아웃
      await compareFor(page, '/explore/materials?purpose=commerce', 'layout', {left: 'commerce-grid', right: 'product-detail-layout'});
      [a, b] = await resultRequests(page);
      expect(keysDiffering(a, b)).toEqual(['pattern']);
      expect(a.purpose).toBe('commerce');
      [fa, fb] = [await fingerprint(page, a), await fingerprint(page, b)];
      expect(fa.structure, '배치가 다르다').not.toBe(fb.structure);
      expect(varsDiffering(fa, fb), '색·서체 토큰은 같다').toEqual([]);

      // 같은 데이터, 다른 시각화
      await compareFor(page, '/explore/materials?purpose=work-dashboard', 'chart', {left: 'marketing-channel-roas', right: 'analytics-traffic-lines'});
      [a, b] = await resultRequests(page);
      expect(keysDiffering(a, b)).toEqual(['content']);
      expect(a.content.charts[0].series).toEqual(b.content.charts[0].series);
      expect(a.content.charts[0].preset).not.toBe(b.content.charts[0].preset);
      [fa, fb] = [await fingerprint(page, a), await fingerprint(page, b)];
      for (const f of [fa, fb]) expect(f.text).toContain('월별 매출');
      expect(fa.structure, '차트 형태가 다르다').not.toBe(fb.structure);
      expect(fa.bodyBg).toBe(fb.bodyBg);
      await expectImagesPainted(page);
      expect(await page.locator('iframe').count(), '목록·비교 결과에 iframe 이 없다').toBe(0);
      for (const f of [fa, fb]) expect(f.overflowX).toBe(false);
    });

    test('Explore 는 선택한 두 결과만 그리고 숨은 패널·조합 전체를 DOM 에 두지 않는다', async ({page}) => {
      for (const axis of ['palette', 'set', 'type', 'surface', 'chart', 'mode']) {
        await compareFor(page, '/explore/materials?purpose=work-dashboard', axis);
        await expect(page.getByTestId('compare-result')).toHaveCount(2);
        expect(await page.locator('main img').count(), `${axis}: 그림은 선택한 두 결과뿐`).toBeLessThanOrEqual(2);
        expect(await page.locator('iframe').count()).toBe(0);
        expect(await page.locator('main [role=tabpanel], main [hidden], main details:not([open]) > *:not(summary)').count(), `${axis}: 숨은 탭·패널 없음`).toBe(0);
        expect(await page.locator('main article').count()).toBe(2);
      }
    });

    test('Explore 처음 화면과 비교 축 변경: 결과가 바로 보이고 이전 축의 왼쪽·오른쪽 값이 새 축을 비우지 않는다', async ({page}) => {
      await page.goto('/explore/materials');
      await expect(page.getByTestId('compare-result')).toHaveCount(2);
      await expect(page.getByRole('combobox', {name: '왼쪽 재료'}).locator('option')).not.toHaveCount(0);
      await expectImagesPainted(page);
      // 팔레트의 left/right 를 남긴 채 비교 축만 시각 패밀리로 바꿔 보낸다.
      await page.getByRole('combobox', {name: '비교할 축'}).selectOption('surface');
      await page.getByRole('button', {name: '조건 적용하고 비교'}).click();
      await expect(page.getByTestId('compare-results')).toHaveAttribute('data-axis', 'surface');
      const [left, right] = await resultRequests(page);
      expect(keysDiffering(left, right)).toEqual(['surface']);
      await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).not.toHaveValue(/clay-earth|dusk-violet/);
    });

    test('Explore 비교 목록은 Core 가 받지 않는 재료를 비활성과 이유로 막고 기본 쌍은 받는 재료로 고른다', async ({page}) => {
      // 업무 대시보드의 레이아웃: 페이지 패턴이 있는 dashboard-grid 만 고를 수 있다.
      await page.goto('/explore/materials?purpose=work-dashboard&compare=layout');
      const options = page.getByRole('combobox', {name: '왼쪽 재료'}).locator('option');
      expect(await options.count()).toBe(24);
      const states = await options.evaluateAll(nodes => nodes.map(n => ({value: n.value, disabled: n.disabled, title: n.title})));
      expect(states.filter(s => !s.disabled).map(s => s.value)).toEqual(['dashboard-grid']);
      expect(states.filter(s => s.disabled).every(s => s.title.length > 5), '비활성에는 모두 이유가 붙는다').toBe(true);
      await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).toHaveValue('dashboard-grid');
      await expect(page.getByTestId('compare-unavailable')).toHaveCount(1);
      // SaaS 랜딩은 받는 레이아웃이 없다: 두 결과 모두 이유가 보인다.
      await page.goto('/explore/materials?purpose=saas-landing&compare=layout');
      await expect(page.getByTestId('compare-unavailable')).toHaveCount(2);
      // 디자인 맥락: 대시보드에 맞지 않는 맥락은 비활성이고 기본 쌍은 둘 다 그려진다.
      await page.goto('/explore/materials?purpose=work-dashboard&compare=style');
      const style = await page.getByRole('combobox', {name: '왼쪽 재료'}).locator('option').evaluateAll(nodes => nodes.filter(n => n.disabled).map(n => n.title));
      expect(style.length).toBeGreaterThan(20);
      await expectImagesPainted(page);
    });

    test('Explore 비교 결과의 Studio 이동은 필터와 고른 재료를 그대로 넘긴다', async ({page}) => {
      await compareFor(page, '/explore/materials?purpose=work-dashboard&set=analytics', 'palette', {left: 'clay-earth', right: 'dusk-violet'});
      await page.locator('[data-testid=compare-result][data-side=right]').getByRole('link', {name: '이 조합을 Studio에서 편집'}).click();
      await expect(page).toHaveURL(/\/studio\/assemble\?.*palette=dusk-violet/);
      await expect(page).toHaveURL(/set=analytics/);
      await expect(page.locator('#s-palette')).toHaveAttribute('data-value', 'dusk-violet');
      await expect(page.locator('#s-set')).toHaveAttribute('data-value', 'analytics');
    });

    test('Studio 선택 10종이 실제 미리보기 출력에 반영된다', async ({page}) => {
      await page.goto('/studio/assemble?purpose=work-dashboard&step=swap');
      const requestNow = async () => JSON.parse(await page.getByTestId('swap-preview').getAttribute('data-request'));
      const choose = async (id, value) => {
        await page.locator(`#${id}`).click();
        await page.locator(`[data-select-popup=${id}] [data-value="${value}"]`).click();
        await expect(page.locator(`#${id}`)).toHaveAttribute('data-value', value);
        await expect(page.getByTestId('swap-preview')).toBeVisible();
      };
      const painted = async () => expect.poll(() => page.locator('[data-testid=swap-preview] img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      let previous = await fingerprint(page, await requestNow());

      // 1 Palette
      await choose('s-palette', 'clay-earth');
      let request = await requestNow();
      expect(request.palette).toBe('palette:clay-earth');
      let current = await fingerprint(page, request);
      expect(current.bodyBg).not.toBe(previous.bodyBg);
      previous = current;
      await painted();
      // 2 Subtoken Set
      await choose('s-set', 'corporate');
      request = await requestNow();
      expect(request.subtokenSet).toBe('subtoken-set:corporate');
      current = await fingerprint(page, request);
      expect(varsDiffering(previous, current).length).toBeGreaterThan(0);
      previous = current;
      // 3 Typography: 서체가 바뀐다
      await page.locator('#s-type').click();
      const typeValue = await page.locator('[data-select-popup=s-type] [role=option]:not([aria-disabled=true])').evaluateAll(nodes => nodes.map(n => n.dataset.value).filter(Boolean));
      await page.keyboard.press('Escape');
      let changedFont = false;
      for (const value of typeValue.slice(0, 6)) {
        await choose('s-type', value);
        request = await requestNow();
        expect(request.typeSystem).toBe(`type-system:${value}`);
        current = await fingerprint(page, request);
        if (current.headingFont !== previous.headingFont) { changedFont = true; break; }
      }
      expect(changedFont, '타이포 선택이 제목 서체에 반영된다').toBe(true);
      previous = current;
      // 5 Layout (페이지 패턴이 있는 재료)
      await choose('s-layout', 'dashboard-grid');
      request = await requestNow();
      expect(request.pattern).toBe('dashboard-grid');
      await expect(page.getByTestId('decisions')).toContainText('layout.pattern: dashboard-grid (내가 고름)');
      // 6 Components + 4 Visual Family (컴포넌트에 입혀진다)
      await choose('s-component', 'card-surface');
      request = await requestNow();
      expect(request.components).toHaveLength(3);
      previous = await fingerprint(page, request);
      await choose('s-family', 'bold');
      const bold = await fingerprint(page, await requestNow());
      await choose('s-family', 'glass');
      request = await requestNow();
      expect(request.families).toEqual(['family:glass']);
      const glass = await fingerprint(page, request);
      expect(bold.card).not.toBe(glass.card);
      expect(bold.structure).toBe(glass.structure);
      previous = glass;
      // 7 Surface, 8 Motion
      await choose('s-surface', 'soft-layered');
      request = await requestNow();
      expect(request.surface).toBe('surface:soft-layered');
      current = await fingerprint(page, request);
      expect(current.markup, '표면 선택이 컴파일된 문서(스타일 포함)를 바꾼다').not.toBe(previous.markup);
      previous = current;
      await choose('s-motion', 'still');
      request = await requestNow();
      expect(request.motion).toBe('motion:still');
      current = await fingerprint(page, request);
      expect(current.markup, '모션 선택이 컴파일된 문서를 바꾼다').not.toBe(previous.markup);
      previous = current;
      // 9 Density
      await choose('s-density', 'compact');
      request = await requestNow();
      expect(request.density).toBe('compact');
      current = await fingerprint(page, request);
      expect(varsDiffering(previous, current).length).toBeGreaterThan(0);
      previous = current;
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침 없음').toBe(true);
      // 10 Content
      await page.getByRole('link', {name: '콘텐츠 수정으로'}).click();
      await expect(page).toHaveURL(/step=content/);
      await page.getByLabel('제목').fill('분기 운영 현황 F3');
      await page.getByRole('button', {name: '콘텐츠 적용'}).click();
      await expect(page).toHaveURL(/c_title=/);
      const contentRequest = JSON.parse(await page.getByTestId('content-preview').getAttribute('data-request'));
      expect(contentRequest.content.title).toBe('분기 운영 현황 F3');
      const final = await fingerprint(page, contentRequest);
      expect(final.text).toContain('분기 운영 현황 F3');
      expect(previous.text).not.toContain('분기 운영 현황 F3');
      // 내보내기에는 같은 선택으로 컴파일된 코드가 담긴다.
      await page.getByRole('link', {name: '내보내기로'}).click();
      await expect(page).toHaveURL(/step=export/);
      await page.getByText(/HTML 본문 보기/).click();
      const code = await page.getByTestId('export-html').innerText();
      expect(code).toContain('분기 운영 현황 F3');
      await expect(page.getByTestId('why')).toContainText('palette');
    });

    test('Studio 는 Core 가 받지 않는 선택을 비활성과 이유로 막고, 막은 선택은 누를 수 없다', async ({page}) => {
      await page.goto('/studio/assemble?purpose=work-dashboard&step=swap');
      await page.locator('#s-set').click();
      const items = await page.locator('[data-select-popup=s-set] [role=option]').evaluateAll(nodes => nodes.map(n => ({value: n.dataset.value, disabled: n.getAttribute('aria-disabled') === 'true', title: n.title})));
      const disabled = items.filter(item => item.disabled);
      expect(disabled.length, '대시보드에 맞지 않는 세트가 막혀 있다').toBeGreaterThan(5);
      expect(disabled.every(item => item.title.length > 5), '막힌 항목에는 모두 이유가 있다').toBe(true);
      const urlBefore = page.url();
      await page.locator(`[data-select-popup=s-set] [data-value="${disabled[0].value}"]`).click({force: true});
      await expect(page.locator('#s-set')).toHaveAttribute('data-value', '');
      expect(page.url()).toBe(urlBefore);
      await expect(page.getByTestId('swap-error')).toHaveCount(0);
      await page.keyboard.press('Escape');
    });

    test('Studio 아이콘 영역은 Core 요청에 필드가 없어 모두 비활성이고 이유를 보여 준다', async ({page}) => {
      await page.goto('/studio/assemble?purpose=work-dashboard&step=swap');
      await page.getByRole('combobox', {name: '아이콘 영역'}).click();
      const options = page.locator('[data-select-popup=s-icon-area] [role=option]');
      expect(await options.count()).toBeGreaterThan(10);
      for (const option of await options.all()) {
        await expect(option).toHaveAttribute('aria-disabled', 'true');
        await expect(option).toHaveAttribute('title', /아이콘 영역 선택 필드가 없어/);
      }
    });

    test('Studio 단계 이동·새로고침·뒤로 가기 뒤에도 선택이 복원된다', async ({page}) => {
      const values = {palette: 'ocean-cool', layout: 'dashboard-grid', component: 'card-surface', density: 'compact', family: 'bold'};
      await page.goto('/studio/assemble?purpose=work-dashboard&step=swap');
      const choose = async (id, value) => {
        await page.locator(`#${id}`).click();
        await page.locator(`[data-select-popup=${id}] [data-value="${value}"]`).click();
        await expect(page.locator(`#${id}`)).toHaveAttribute('data-value', value);
      };
      await choose('s-palette', values.palette);
      await choose('s-layout', values.layout);
      await choose('s-component', values.component);
      await choose('s-density', values.density);
      const expectRestored = async (expected) => {
        for (const [key, id] of [['palette', 's-palette'], ['layout', 's-layout'], ['component', 's-component'], ['density', 's-density'], ['family', 's-family']]) {
          await expect(page.locator(`#${id}`), `${key}`).toHaveAttribute('data-value', expected[key] ?? '');
        }
      };
      await expectRestored({...values, family: undefined});
      // 단계 이동: 콘텐츠 → 내보내기 → 새로고침 → 재료로 돌아오기
      await page.getByRole('link', {name: '5. 콘텐츠'}).click();
      await expect(page).toHaveURL(/step=content/);
      await expect(page.getByRole('heading', {name: '문구를 고쳐 보세요'})).toBeVisible();
      await page.getByRole('link', {name: '6. 내보내기'}).click();
      await expect(page).toHaveURL(/step=export/);
      await expect(page.getByRole('heading', {name: '코드로 가져가기'})).toBeVisible();
      for (const key of ['palette=ocean-cool', 'layout=dashboard-grid', 'component=card-surface', 'density=compact']) await expect(page).toHaveURL(new RegExp(key));
      await page.reload();
      await expect(page.getByRole('heading', {name: '코드로 가져가기'})).toBeVisible();
      await page.getByRole('link', {name: '재료 다시 바꾸기'}).click();
      await expectRestored({...values, family: undefined});
      // 뒤로 가기: 마지막 선택(family)을 하고 뒤로 가면 직전 선택으로 돌아가고 앞으로 가면 다시 적용된다.
      await choose('s-family', values.family);
      await expectRestored(values);
      await page.goBack();
      await expectRestored({...values, family: undefined});
      await page.goForward();
      await expectRestored(values);
      await page.reload();
      await expectRestored(values);
      // 단계 표시줄: 이전 단계로 갔다 와도 같다.
      await page.getByRole('link', {name: '3. 후보 비교'}).click();
      await expect(page.getByTestId('candidates')).toBeVisible();
      await page.getByRole('link', {name: '4. 재료 교체'}).click();
      await expect(page.locator('#s-palette')).toBeVisible();
      await expectRestored(values);
    });

    test('Studio 재료 교체 단계에는 다른 단계의 패널과 닫힌 선택 목록이 DOM 에 없다', async ({page}) => {
      await page.goto('/studio/assemble?purpose=work-dashboard&step=swap');
      await expect(page.locator('#s-palette')).toBeVisible();
      for (const testId of ['candidates', 'export-html', 'direction-grid', 'purpose-grid', 'content-preview']) await expect(page.getByTestId(testId)).toHaveCount(0);
      await expect(page.locator('[role=listbox]')).toHaveCount(0);
      await expect(page.locator('iframe')).toHaveCount(0);
      await page.locator('#s-palette').click();
      await expect(page.locator('[role=listbox]')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.locator('[role=listbox]')).toHaveCount(0);
    });
  });
}

test('Studio 에서 Core 가 받는다고 표시한 선택은 모두 실제로 조립된다 (세트·패밀리·표면 전수)', async ({page, request}) => {
  test.setTimeout(240_000);
  for (const purpose of ['work-dashboard', 'saas-landing']) {
    const url = `/studio/assemble?purpose=${purpose}&step=swap`;
    await page.goto(url);
    for (const [id, param] of [['s-set', 'set'], ['s-family', 'family'], ['s-surface', 'surface'], ['s-palette', 'palette'], ['s-layout', 'layout']]) {
      await page.locator(`#${id}`).click();
      const enabled = await page.locator(`[data-select-popup=${id}] [role=option]:not([aria-disabled=true])`).evaluateAll(nodes => nodes.map(n => n.dataset.value).filter(Boolean));
      await page.keyboard.press('Escape');
      if (param !== 'layout') expect(enabled.length, `${purpose} ${param}: 고를 수 있는 값이 있다`).toBeGreaterThan(0);
      for (const value of enabled) {
        const html = await (await request.get(`${url}&${param}=${value}`)).text();
        expect(html.includes('data-testid="swap-error"'), `${purpose} ${param}=${value} 는 활성인데 조립이 거부된다`).toBe(false);
      }
    }
  }
});

test('Studio 에서 충돌하는 주소 상태는 오류와 함께 충돌 선택을 풀고 계속하는 길을 보여 준다', async ({page}) => {
  await page.goto('/studio/assemble?purpose=work-dashboard&step=swap&set=accent-dominant');
  await expect(page.getByTestId('swap-error')).toContainText('accent-dominant');
  await page.getByTestId('swap-repair').click();
  await expect(page).not.toHaveURL(/set=accent-dominant/);
  await expect(page.getByTestId('swap-error')).toHaveCount(0);
  await expect(page.getByTestId('swap-preview')).toBeVisible();
});

test('Explore 재료 비교는 예전 공유 링크(left=palette:… 같은 전체 id)와 비교 축 별칭을 그대로 받는다', async ({page}) => {
  await page.goto('/explore/materials?purpose=work-dashboard&palette=slate-neutral&set=standard&compare=palette&left=palette:ocean-cool&right=palette:forest-green');
  await expect(page.getByRole('heading', {name: '팔레트 계열 비교'})).toBeVisible();
  await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).toHaveValue('ocean-cool');
  await expect(page.getByRole('combobox', {name: '오른쪽 재료'})).toHaveValue('forest-green');
  await page.reload();
  await expect(page.getByRole('combobox', {name: '왼쪽 재료'})).toHaveValue('ocean-cool');
  await page.goto('/explore/materials?purpose=work-dashboard&compare=density&left=compact&right=spacious');
  await expect(page.getByTestId('compare-results')).toHaveAttribute('data-axis', 'spacing');
  await expect(page.getByTestId('compare-result')).toHaveCount(2);
});
