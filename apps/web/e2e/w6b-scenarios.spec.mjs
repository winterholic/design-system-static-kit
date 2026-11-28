// W6-b 시나리오 A(팔레트→), B(Card→), C(대시보드 목적→)를 웹에서 끝까지 확인한다. 390폭과 1280폭에서 같은 흐름을 돈다.
// 각 시나리오는 웹이 낸 결과(미리보기·내려받기)가 같은 요청의 Core 서비스 결과와 바이트가 같은지, 사전 구현 재료의 표식이 출력에 있는지 본다.
// 서비스 준비가 빠지면 시나리오가 실패하도록 둔다. 조건부 skip은 두지 않는다.
import {expect, test} from '@playwright/test';
import * as service from '@winterholic/design-system-static-kit/service';
import {pick} from './helpers/select.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {toPreviewSvg} from '../lib/api/preview-svg.mjs';
import {typeRequest} from '../../../scripts/lib/preview-requests.mjs';

const bytes = text => Buffer.from(text, 'utf8');
// 목록·카드의 미리보기는 iframe 이 아니라 <img> 다. 사전 생성이 없는 요청(사용자가 고른 조합)은 /platform/render?...&part=svg 로 컴파일된 SVG 다.
// srcOf 는 그 요청의 standalone 주소(part·w·h 를 뺀 같은 주소)를 돌려주고, SVG 가 같은 요청의 Core 결과에서 나온 것인지는 expectSameBytes 가 함께 본다.
// 시험 영역(interactive)의 iframe 은 그대로 iframe 주소를 돌려준다.
const svgOf = new Map();
const srcOf = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  // 시험 영역의 iframe 은 화면 근처에 올 때 비동기로 만들어지므로 iframe 과 img 중 먼저 생기는 쪽을 본다.
  const media = locator.locator('iframe, img').first();
  await media.waitFor({state: 'attached'});
  if (await media.evaluate(el => el.tagName) === 'IFRAME') return media.getAttribute('src');
  const img = media;
  const url = new URL(await img.getAttribute('src'), 'http://x');
  expect(url.pathname, '선택 시 컴파일되는 미리보기 주소').toBe('/platform/render');
  expect(url.searchParams.get('part')).toBe('svg');
  const size = {width: Number(url.searchParams.get('w')), height: Number(url.searchParams.get('h'))};
  const svgUrl = url.pathname + url.search;
  for (const key of ['part', 'w', 'h']) url.searchParams.delete(key);
  const standalone = url.pathname + url.search;
  svgOf.set(standalone, {svgUrl, size});
  return standalone;
};
const expectSameBytes = async (request, src, expected) => {
  const res = await request.get(src);
  expect(res.status(), src).toBe(200);
  expect(await res.body(), src).toEqual(bytes(expected));
  // 카드에 실제로 쓰인 SVG 도 같은 문서에서 나왔다
  const svg = svgOf.get(src);
  if (svg) {
    const r = await request.get(svg.svgUrl);
    expect(r.status(), svg.svgUrl).toBe(200);
    expect(r.headers()['content-type']).toContain('image/svg+xml');
    expect(await r.text(), svg.svgUrl).toBe(toPreviewSvg(expected, svg.size));
  }
};
const designOf = req => { const r = service.assembleDesign(req, {include: ['html', 'css', 'tokens', 'manifest', 'blueprint', 'script', 'standalone']}); if (!r.ok) throw new Error(r.errors[0].message); return r.value.candidates[0].value; };
const componentsOf = req => { const r = service.assembleComponents(req); if (!r.ok) throw new Error(r.errors[0].message); return r.value; };
const urlState = page => Object.fromEntries(new URL(page.url()).searchParams);

for (const width of [390, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({viewport: {width, height: width === 390 ? 844 : 900}});

    test('시나리오 A: 팔레트 → 세트 비교 → 라이트·다크 → 거부 이유 → 추천 → Studio 조립 → 코드', async ({page, request}) => {
      await page.goto('/materials/palettes');
      await page.getByRole('link', {name: /오션 쿨/}).click();
      await expect(page).toHaveURL(/\/materials\/palettes\/ocean-cool$/);

      // 같은 페이지·같은 서체로 세트만 바꾼 비교가 나란히 있다
      const grid = page.getByTestId('set-grid');
      const sets = await grid.locator('li[data-set]').evaluateAll(n => n.map(x => x.dataset.set));
      expect(sets.length).toBeGreaterThanOrEqual(5);
      const lightSrc = await srcOf(grid.locator('li[data-set]').first());
      const first = sets[0];
      const typeSystem = new URL(lightSrc, 'http://x').searchParams.get('r');
      const lightReq = JSON.parse(Buffer.from(typeSystem, 'base64url').toString());
      expect(lightReq).toMatchObject({purpose: 'saas-landing', palette: 'palette:ocean-cool', subtokenSet: `subtoken-set:${first}`, mode: 'light'});
      await expectSameBytes(request, lightSrc, designOf(lightReq).standalone);

      // 다크 전환은 주소가 가지고 같은 세트가 다크 요청으로 다시 그려진다
      await page.getByRole('link', {name: '다크', exact: true}).click();
      await expect(page).toHaveURL(/mode=dark/);
      const darkSrc = await srcOf(page.getByTestId('set-grid').locator('li[data-set]').first());
      const darkReq = JSON.parse(Buffer.from(new URL(darkSrc, 'http://x').searchParams.get('r'), 'base64url').toString());
      expect(darkReq.mode).toBe('dark');
      const darkHtml = designOf(darkReq).standalone;
      await expectSameBytes(request, darkSrc, darkHtml);
      expect(darkHtml).toContain('data-theme="dark"');
      expect(darkHtml).toMatch(/data-motion="/);

      // 어울리는 서체·스타일 맥락 추천에는 이유가 붙는다
      await expect(page.getByRole('heading', {name: '서체(타이포 시스템)'})).toBeVisible();
      const reco = page.locator('ul[class*="recoList"]').first().locator('li').first();
      await expect(reco.locator('span')).not.toBeEmpty();

      // 맞지 않는 팔레트×세트는 거부 이유와 함께 보인다
      await page.goto('/materials/palettes/graphite-mono');
      const rejected = page.getByTestId('rejected-sets').locator('li[data-set="commerce-vivid"]');
      await expect(rejected).toContainText(/COLOR_CONTRAST|대비|4\.5/);

      // 내 색 시험: 후보와 거부 이유, 저장하지 않음
      await page.goto('/materials/palettes/custom');
      await page.getByLabel(/hex 색/).fill('#0D6E8E #8A8F99 #E8A100 #2E8B57 #C0392B #3B6FD6');
      await page.getByRole('button', {name: '세트 후보 보기'}).click();
      await expect(page.getByTestId('seed-result')).toBeVisible();
      await expect(page.getByTestId('seed-rejected').locator('li').first()).toContainText(/7:1|대비|COLOR/);
      expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('0D6E8E');
      await page.getByLabel(/hex 색/).fill('#0D6E8E #8A8F99 #E8A100');
      await page.getByRole('button', {name: '세트 후보 보기'}).click();
      await expect(page).toHaveURL(/seeds=/);
      await expect(page.getByTestId('seed-result').locator('li[data-set]').first()).toBeVisible();
      await expect(page.getByTestId('seed-rejected').locator('li[data-set]').first()).toBeVisible();

      // Studio 조립으로: 고른 재료가 요청에 그대로 넘어간다
      await page.goto('/materials/palettes/ocean-cool?mode=dark');
      await page.getByRole('link', {name: 'Studio에서 쓰기'}).click();
      await expect(page).toHaveURL(/\/studio\/assemble\?/);
      const handed = urlState(page);
      expect(handed).toMatchObject({purpose: 'saas-landing', palette: 'ocean-cool', mode: 'dark', step: 'swap'});
      const preview = page.getByTestId('swap-preview');
      await expect(preview).toBeVisible();
      const handedReq = {purpose: 'saas-landing', candidates: 1, palette: 'palette:ocean-cool', subtokenSet: `subtoken-set:${handed.set}`, typeSystem: `type-system:${handed.type}`, mode: 'dark'};
      await expectSameBytes(request, await srcOf(preview), designOf(handedReq).standalone);

      // 내보내기: 내려받는 코드가 서비스 결과와 같다
      await page.goto(`/studio/assemble?${new URLSearchParams({...handed, step: 'export'})}`);
      const css = await page.getByTestId('downloads').locator('a[data-part="css"]').getAttribute('href');
      const out = designOf(handedReq);
      await expectSameBytes(request, await page.getByTestId('downloads').locator('a[data-part="html"]').getAttribute('href'), out.html);
      await expectSameBytes(request, css, out.css);
      await expectSameBytes(request, await page.getByTestId('downloads').locator('a[data-part="standalone"]').getAttribute('href'), out.standalone);
      const manifestUrl = await page.getByTestId('downloads').locator('a[data-part="manifest"]').getAttribute('href');
      await expectSameBytes(request, manifestUrl, JSON.stringify(out.manifest, null, 2) + '\n');
      const manifest = await request.get(manifestUrl);
      expect(JSON.parse(await manifest.text()).platformContract).toBeTruthy();
      await page.screenshot({path: `test-results/a-${width}.png`, fullPage: true});
    });

    test('시나리오 B: 컴포넌트(가격 카드) → 시각 패밀리·상태·콘텐츠 → 금지 조합 → 코드 → 페이지 조립', async ({page, request}) => {
      // 목적 패밀리 32종은 쪽(24개)으로 나뉜다. 쪽을 넘기며 모두 모으고, 가격 카드는 검색으로 바로 찾는다.
      await page.goto('/components');
      const purposes = new Set();
      for (let n = 1; n < 10; n++) {
        for (const id of await page.locator('li[data-purpose]').evaluateAll(els => els.map(el => el.getAttribute('data-purpose')))) purposes.add(id);
        const next = page.getByRole('navigation', {name: '쪽 이동'}).getByRole('link', {name: '다음'});
        if ((await next.getAttribute('aria-disabled')) === 'true') break;
        await next.click();
        await expect(page).toHaveURL(new RegExp(`page=${n + 1}`));
      }
      expect(purposes.size).toBe(32);
      await page.goto('/components');
      await page.getByRole('searchbox', {name: '검색'}).fill('card.pricing');
      await page.getByRole('button', {name: '찾기'}).click();
      const card = page.getByTestId('purpose-families').locator('li[data-purpose="card.pricing"]');
      await expect(card).toBeVisible();
      await card.getByRole('link').click();
      await expect(page).toHaveURL(/\/components\/purpose\/card\/pricing/);

      // 시각 패밀리 4종 비교
      const compare = page.getByTestId('visual-compare');
      expect(await compare.locator('li[data-visual]').count()).toBe(4);
      const boldSrc = await srcOf(compare.locator('li[data-visual="bold"]'));
      const boldReq = JSON.parse(Buffer.from(new URL(boldSrc, 'http://x').searchParams.get('r'), 'base64url').toString());
      const bold = componentsOf(boldReq);
      await expectSameBytes(request, boldSrc, bold.standalone);
      expect(bold.html).toContain('data-family="bold"');
      expect(bold.html).toContain('data-purpose="card.pricing"');

      // 개별 값은 유효하지만 이 목적 패밀리에서는 금지인 상태는 미리 비활성이고 이유가 보인다
      const states = page.locator('ul[data-axis="p_state"]');
      const selected = states.getByRole('link', {name: /selected/});
      await expect(selected).toHaveAttribute('aria-disabled', 'true');
      await expect(selected).toHaveAttribute('data-reason', /상호작용 중첩|카드 전체를 선택/);
      // 금지 조합이 주소로 들어오면 자동으로 조정하고 그 사실을 알린다
      await page.goto('/components/purpose/card/pricing?p_state=selected&visual=bold');
      await expect(page.getByTestId('auto-adjusted')).toContainText(/자동으로 조정/);
      await expect(page.locator('ul[data-axis="p_state"]').getByRole('link', {name: /default/})).toHaveAttribute('aria-current', 'true');

      // 콘텐츠를 바꾸면 같은 요청이 다시 조립된다
      await page.getByLabel(/^plan/).fill('엔터프라이즈 플랜');
      await page.getByRole('button', {name: '콘텐츠 적용'}).click();
      await expect(page).toHaveURL(/c_plan=/);
      const mainSrc = await srcOf(page.getByTestId('main-preview'));
      const mainReq = JSON.parse(Buffer.from(new URL(mainSrc, 'http://x').searchParams.get('r'), 'base64url').toString());
      const main = componentsOf(mainReq);
      expect(main.html).toContain('엔터프라이즈 플랜');
      await expectSameBytes(request, mainSrc, main.standalone);

      // 데스크톱·모바일 미리보기 전환은 주소가 가진다
      await page.getByRole('link', {name: '모바일 390'}).click();
      await expect(page).toHaveURL(/device=390/);
      await expect(page.getByTestId('main-preview').locator('iframe')).toHaveAttribute('title', /390px/);

      // 코드 내려받기가 서비스 결과와 같다
      const dl = page.getByRole('list', {name: '내려받기'});
      await expectSameBytes(request, await dl.getByRole('link', {name: 'CSS'}).getAttribute('href'), main.css);
      await expectSameBytes(request, await dl.getByRole('link', {name: 'HTML 조각'}).getAttribute('href'), main.html);
      await expectSameBytes(request, await dl.getByRole('link', {name: '완성 HTML 문서'}).getAttribute('href'), main.standalone);
      await expectSameBytes(request, await dl.getByRole('link', {name: 'manifest(JSON)'}).getAttribute('href'), JSON.stringify(main.manifest, null, 2) + '\n');
      await expect(page.getByTestId('code-html')).toContainText('data-family="bold"');

      // 이 컴포넌트로 페이지 조립
      await page.getByTestId('to-assemble').click();
      await expect(page).toHaveURL(/\/studio\/assemble\?/);
      const handed = urlState(page);
      expect(handed).toMatchObject({component: 'card-surface', cvisual: 'bold', purpose: 'saas-landing'});
      const preview = page.getByTestId('candidates').locator('li').first();
      const src = await srcOf(preview);
      const req = JSON.parse(Buffer.from(new URL(src, 'http://x').searchParams.get('r'), 'base64url').toString());
      expect(req.components).toHaveLength(3);
      const page1 = service.assembleDesign({...req, candidates: 4}, {include: ['standalone']});
      expect(page1.ok).toBe(true);
      const html = page1.value.candidates[0].value.standalone;
      expect(html).toContain('data-family="bold"');
      await expectSameBytes(request, src, html);
    });

    test('시나리오 C: 대시보드 목적 → 방향 → 후보(이유·막힘) → 재료 교체 → 콘텐츠 → 내보내기, 덮어쓰기 전 영향', async ({page, request}) => {
      await page.goto('/studio');
      await page.evaluate(() => localStorage.clear());
      await page.goto('/studio');
      await page.getByTestId('start-purposes').getByRole('link', {name: /업무 대시보드/}).click();
      await expect(page).toHaveURL(/purpose=work-dashboard.*step=direction|step=direction.*purpose=work-dashboard/);

      // 디자인 방향: 추천 이유와 함께
      const dirs = page.getByTestId('direction-grid').locator('li[data-style]');
      expect(await dirs.count()).toBeGreaterThanOrEqual(3);
      const usable = dirs.filter({has: page.getByRole('link', {name: '이 방향으로 계속'})}).first();
      await expect(usable.locator('ul[class*="reasons"] li').first()).not.toBeEmpty();
      await usable.getByRole('link', {name: '이 방향으로 계속'}).click();
      await expect(page.getByTestId('step-bar').locator('[aria-current="step"]')).toContainText('후보 비교');

      // 후보 비교: 후보 여러 개, 추천 이유, 품질 검사, 막힌 후보
      const cands = page.getByTestId('candidates').locator('li[data-rank]');
      expect(await cands.count()).toBeGreaterThanOrEqual(3);
      await expect(cands.first().locator('ul[class*="reasons"] li').first()).not.toBeEmpty();
      await expect(cands.first()).toContainText('품질 검사 통과');
      await expect(page.getByTestId('blocked')).toBeVisible();
      const second = cands.nth(1);
      const secondSrc = await srcOf(second);
      const secondReq = JSON.parse(Buffer.from(new URL(secondSrc, 'http://x').searchParams.get('r'), 'base64url').toString());
      const set4 = service.assembleDesign({...secondReq}, {include: ['standalone']});
      await expectSameBytes(request, secondSrc, set4.value.candidates[1].value.standalone);
      await second.getByRole('link', {name: '이 후보로 계속'}).click();
      await expect(page).toHaveURL(/step=swap/);

      // 재료 교체: 화면이 실제로 바뀐다(출력 바이트가 달라진다)
      const before = await srcOf(page.getByTestId('swap-preview'));
      const beforeHtml = await (await request.get(before)).text();
      const state = urlState(page);
      const other = state.palette === 'forest-green' ? 'sunrise-warm' : 'forest-green';
      await pick(page, page.locator('#s-palette'), other);
      await expect(page).toHaveURL(new RegExp(`palette=${other}`));
      const after = await srcOf(page.getByTestId('swap-preview'));
      expect(after).not.toBe(before);
      const afterHtml = await (await request.get(after)).text();
      expect(afterHtml).not.toBe(beforeHtml);
      // 맞지 않는 서체는 고르기 전에 비활성이고 이유가 있다
      await page.locator('#s-type').click();
      const disabled = page.getByRole('listbox').locator('[role="option"][aria-disabled="true"]').first();
      await expect(disabled).toBeVisible();
      await page.keyboard.press('Escape');
      // 뒤로 가기는 직전 재료 선택으로 돌아간다
      await page.getByTestId('undo-step').click();
      await expect(page).toHaveURL(new RegExp(`palette=${state.palette}(&|$)`));

      // 콘텐츠 수정
      await page.getByRole('link', {name: '콘텐츠 수정으로'}).click();
      await page.getByLabel('제목').fill('우리 팀 운영 현황');
      await page.getByRole('button', {name: '콘텐츠 적용'}).click();
      await expect(page).toHaveURL(/c_title=/);
      const contentSrc = await srcOf(page.getByTestId('content-preview'));
      const contentReq = JSON.parse(Buffer.from(new URL(contentSrc, 'http://x').searchParams.get('r'), 'base64url').toString());
      expect(contentReq.content.title).toBe('우리 팀 운영 현황');
      const contentOut = designOf(contentReq);
      expect(contentOut.html).toContain('우리 팀 운영 현황');
      await expectSameBytes(request, contentSrc, contentOut.standalone);

      // 사용자 편집을 덮어쓰기 전에 변경 범위를 보여 준다
      await page.getByTestId('step-bar').getByRole('link', {name: /1\. 페이지 유형/}).click();
      await page.getByTestId('purpose-grid').locator('li[data-purpose="editorial-docs"]').getByRole('link').click();
      const panel = page.getByTestId('impact-panel');
      await expect(panel).toBeVisible();
      await expect(panel.getByTestId('impact-kept')).toContainText(/1곳 중 \d곳/);
      await expect(panel.getByTestId('impact-dropped')).toBeVisible();
      await panel.getByRole('link', {name: '취소'}).click();
      expect(urlState(page).purpose).toBe('work-dashboard');

      // 내보내기: 내려받는 코드가 서비스 결과와 같고 검사 결과를 보인다
      await page.goto(`/studio/assemble?${new URLSearchParams({...urlState(page), step: 'export'})}`);
      await expect(page.getByTestId('checks')).toContainText('통과');
      const exportReq = {...contentReq, candidates: 1};
      const exported = designOf(exportReq);
      await expectSameBytes(request, await page.getByTestId('downloads').locator('a[data-part="standalone"]').getAttribute('href'), exported.standalone);
      await expectSameBytes(request, await page.getByTestId('downloads').locator('a[data-part="css"]').getAttribute('href'), exported.css);
      await expect(page.getByTestId('why').locator('li').first()).toBeVisible();
    });
  });
}

test.describe('Explore 플랫폼 조립 사례', () => {
  test('네 가지 페이지 유형이 서로 다른 재료로 조립되어 Studio 로 이어진다', async ({page, request}) => {
    await page.goto('/explore');
    const cases = page.getByTestId('platform-cases').locator('li[data-case]');
    expect(await cases.count()).toBeGreaterThanOrEqual(4);
    const purposes = new Set();
    const palettes = new Set();
    for (const li of await cases.all()) {
      const href = await li.getByRole('link').getAttribute('href');
      const q = new URL(href, 'http://x').searchParams;
      purposes.add(q.get('purpose'));
      palettes.add(q.get('palette'));
    }
    expect([...purposes].sort()).toEqual(['commerce', 'editorial-docs', 'saas-landing', 'work-dashboard']);
    expect(palettes.size).toBeGreaterThanOrEqual(5);
    await cases.first().getByRole('link').click();
    await expect(page).toHaveURL(/\/studio\/assemble\?.*step=swap/);
    await expect(page.getByTestId('swap-preview')).toBeVisible();
    const src = await srcOf(page.getByTestId('swap-preview'));
    expect((await request.get(src)).status()).toBe(200);
  });
});

test.describe('Materials: 기타 재료와 타이포 비교', () => {
  test('타이포 시스템 비교는 같은 샘플을 시스템마다 조립하고 맥락이 맞지 않으면 이유를 보인다', async ({page, request}) => {
    await page.goto('/materials/typography?with=doc-essay,work-console&sample=doc');
    const grid = page.getByTestId('type-grid');
    await expect(grid.locator('li[data-system="doc-essay"] iframe, li[data-system="doc-essay"]').first()).toBeVisible();
    // 기본 보기(문서 샘플·라이트·1280)는 빌드 시점에 Core 출력으로 만든 정적 파일이다. 그 파일은 같은 요청의 서비스 결과와 바이트가 같다.
    const box = grid.locator('li[data-system="doc-essay"] [data-preview]');
    await expect(box).toHaveAttribute('data-preview', 'static');
    const staticSrc = await box.locator('img').getAttribute('src');
    const req = typeRequest('type-system:doc-essay');
    expect(req.content.title).toContain('Getting Started');
    const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '../../../site/previews/previews-data.json'), 'utf8'));
    const item = manifest.items[staticSrc.replace(/^\/previews\/|\.svg$/g, '')];
    expect(item.id).toBe('type-system:doc-essay');
    expect(await (await request.get(staticSrc)).text()).toBe(toPreviewSvg(designOf(req).standalone, {width: 1280, height: 800, title: item.title}));
    await expect(grid.locator('li[data-system="work-console"]')).toContainText(/맥락용이 아닙니다|맥락/);
    await page.getByRole('link', {name: '모바일 390'}).click();
    await expect(page).toHaveURL(/width=390/);
    await page.getByRole('link', {name: '대시보드 샘플'}).click();
    await expect(page).toHaveURL(/sample=dash/);
  });

  test('표면·모션·배경·미디어·상태 패턴 재료는 실제 렌더로 보이고 안 맞는 것은 이유를 보인다', async ({page, request}) => {
    await page.goto('/materials/styles?kind=surface');
    const other = page.getByTestId('other-materials');
    expect(await other.locator('li[data-material]').count()).toBe(5);
    const first = other.locator('li[data-material]:not(:has(.note))').first();
    const src = await srcOf(first);
    const req = JSON.parse(Buffer.from(new URL(src, 'http://x').searchParams.get('r'), 'base64url').toString());
    expect(req.surface).toMatch(/^surface:/);
    const html = designOf(req).standalone;
    await expectSameBytes(request, src, html);
    expect(html).toMatch(/data-surface="/);
    await page.goto('/materials/styles?kind=state-pattern');
    expect(await page.getByTestId('other-materials').locator('li[data-material]').count()).toBe(8);
    await page.goto('/materials/styles?kind=background&purpose=commerce');
    await expect(page.getByTestId('other-materials').getByText(/commerce 맥락용이 아닙니다/).first()).toBeVisible();
  });
});
