// 성능 측정 훅(window.__studio_api, window.__studio_compile_count)은 운영 빌드에 노출되지 않는다.
// 훅은 DSK_STUDIO_PROBE=1 로 빌드한 번들에만 들어간다(features/studio/probe.ts). 이 시험은 운영 빌드(변수 없이 빌드)를 전제로 한다.
import {expect, test} from '@playwright/test';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';

const PROBE_BUILD = process.env.DSK_STUDIO_PROBE === '1';
const HOOKS = ['__studio_api', '__studio_compile_count'];

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path));
    else if (/\.(js|html|json|map)$/.test(entry.name) || entry.name === 'page') out.push(path);
  }
  return out;
}

test.describe('운영 빌드', () => {
  test.skip(PROBE_BUILD, '측정용 빌드(DSK_STUDIO_PROBE=1)에서는 훅이 있어야 한다. 아래 측정 빌드 시험이 확인한다.');

  test('Studio를 열고 편집해도 window 에 측정 훅이 생기지 않는다', async ({page}) => {
    await page.goto('/studio?template=dashboard-overview');
    await expect(page.locator('[data-phase="ready"]')).toBeVisible();
    await page.getByRole('treeitem', {name: /페이지 제목/}).click();
    await page.locator('#f-title').fill('훅 확인');
    await page.locator('#f-title').press('Tab');
    await expect(page.getByText('수정됨')).toBeVisible();
    const exposed = await page.evaluate(names => names.filter(n => n in window), HOOKS);
    expect(exposed, '운영 빌드에 노출된 측정 훅').toEqual([]);
  });

  test('브라우저로 내려가는 번들(.next/static)에 훅 이름이 없다', async () => {
    const root = join(import.meta.dirname, '..', '.next', 'static');
    const found = [];
    for (const file of await files(root)) {
      const text = await readFile(file, 'utf8');
      for (const hook of HOOKS) if (text.includes(hook)) found.push(`${hook} in ${file.slice(root.length)}`);
    }
    expect(found).toEqual([]);
  });
});

test.describe('측정 빌드', () => {
  test.skip(!PROBE_BUILD, 'DSK_STUDIO_PROBE=1 로 빌드했을 때만 실행한다.');

  test('훅이 켜지고 컴파일 횟수가 숫자로 읽힌다', async ({page}) => {
    await page.goto('/studio?template=dashboard-overview');
    await page.waitForFunction(() => window.__studio_api !== undefined && typeof window.__studio_compile_count === 'number');
  });
});
