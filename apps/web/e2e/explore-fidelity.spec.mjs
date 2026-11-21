import {expect, test} from '@playwright/test';
import {compileBlueprint} from '@winterholic/design-system-static-kit/service';
import {resetDocument} from '@winterholic/design-system-static-kit/edit';

const ref = {template: 'saas-landing', theme: 'aurora', themeVariant: 'clean-saas'};
const made = resetDocument(null, ref);
if (!made.ok) throw new Error(made.errors[0]?.message ?? 'Blueprint 생성 실패');
const expected = compileBlueprint(made.doc, {include: ['html']});
if (!expected.ok) throw new Error(expected.errors[0]?.message ?? 'Blueprint 컴파일 실패');

test('Explore HTML은 Core ./service 컴파일 바이트와 같다', async ({request}) => {
  const response = await request.get('/explore/saas-landing~theme_aurora~variant_clean-saas/render');
  expect(response.status()).toBe(200);
  expect(Buffer.compare(await response.body(), Buffer.from(expected.value.html, 'utf8'))).toBe(0);
});

test('상세 Blueprint 경로는 같은 ./edit 입력을 반환하고 모르는 ID는 404', async ({request}) => {
  const response = await request.get('/explore/saas-landing~theme_aurora~variant_clean-saas/blueprint.json');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(made.doc);
  expect((await request.get('/explore/not-a-design/render')).status()).toBe(404);
  expect((await request.get('/explore/not-a-design/blueprint.json')).status()).toBe(404);
});

test('Studio 링크는 동일한 템플릿·테마·변형을 보존한다', async ({request}) => {
  const response = await request.get('/explore/saas-landing~theme_aurora~variant_clean-saas');
  const html = await response.text();
  expect(response.status()).toBe(200);
  expect(html).toContain('/studio?template=saas-landing&amp;theme=aurora&amp;variant=clean-saas');
});
