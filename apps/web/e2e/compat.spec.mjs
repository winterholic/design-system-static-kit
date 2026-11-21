// 기존 URL 호환 시험 (03-interfaces.md 5.2·5.4절). 상태 코드, Location, 바이트 동일성, noindex.
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {expect, test} from '@playwright/test';

const root = resolve(import.meta.dirname, '../../..');
const site = join(root, 'site');
const publicDir = resolve(import.meta.dirname, '../public');
const siteFile = p => readFileSync(join(site, p));

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}
// 00-baseline.md 4.2절의 계산 방식: `경로\0파일해시\n`을 경로순으로 이어 SHA-256. 경로는 site/ 기준이다.
function treeHash(base, subdir, exclude = () => false) {
  const files = walk(join(base, subdir)).map(f => relative(base, f)).filter(f => !exclude(f)).sort();
  const h = createHash('sha256');
  for (const f of files) h.update(`${f}\0${createHash('sha256').update(readFileSync(join(base, f))).digest('hex')}\n`);
  return {count: files.length, hash: h.digest('hex')};
}

test.describe('옛 /combos/ → 새 경로 308', () => {
  const cases = [
    ['/combos/', '/explore/combos'],
    ['/combos', '/explore/combos'],
    ['/combos/index.html', '/explore/combos'],
  ];
  for (const [from, to] of cases) {
    test(`${from} → ${to}`, async ({request}) => {
      const res = await request.get(from, {maxRedirects: 0});
      expect(res.status()).toBe(308);
      expect(res.headers().location).toBe(to);
    });
  }

  // 00-baseline.md 6.1절의 파라미터를 전부 실어 보내, 값이 하나도 바뀌지 않는지 본다.
  test('쿼리 파라미터 21개와 값을 그대로 보존한다', async ({request}) => {
    const q = new URLSearchParams([
      ['c', 'saas-landing~hero:split,nav:top'], ['concept', 'work'], ['look', 'calm'], ['theme', 'aurora'], ['tv', 'compact-ops'],
      ['pal', 'ocean'], ['type', 'humanist'], ['mode', 'dark'], ['q', '한글 검색어 & 기호=1'], ['pt', 'landing'], ['t', 'saas-landing'],
      ['sl', 'grid:2,list:table'], ['sort', 'shuffle'], ['seed', '42'], ['same', '1'], ['flagged', '1'], ['tall', '1'], ['exp', '1'],
      ['rec', '1'], ['ps', '48'], ['p', '3'],
    ]);
    expect([...q.keys()]).toHaveLength(21);
    const res = await request.get('/combos/?' + q, {maxRedirects: 0});
    expect(res.status()).toBe(308);
    const loc = new URL(res.headers().location, 'http://x');
    expect(loc.pathname).toBe('/explore/combos');
    expect([...loc.searchParams.entries()]).toEqual([...q.entries()]);
  });

  test('리다이렉트를 따라가면 새 화면이 열린다', async ({request}) => {
    const res = await request.get('/combos/?c=saas-landing&theme=aurora');
    expect(res.status()).toBe(200);
    expect(res.url()).toContain('/explore/combos?c=saas-landing&theme=aurora');
  });
});

test.describe('정적 산출물은 site/와 바이트가 같다', () => {
  const files = [
    'gallery/index.html', 'v1/catalog.json', 'v1/blueprint.schema.json', 'combos/render.html',
    'examples/saas-landing/index.html', 'examples/saas-landing/tokens.css', 'examples/saas-landing/tokens.json',
    'examples/saas-landing/blueprint.json', 'examples/saas-landing/manifest.json',
    'examples/themes/aurora/index.html', 'test-lab/index.html', 'test-lab/viewer.html', 'src/combos/render.mjs',
    ...readdirSync(join(site, 'docs')).filter(f => f.endsWith('.html')).map(f => `docs/${f}`),
  ];
  for (const f of files) {
    test(`/${f}`, async ({request}) => {
      const res = await request.get('/' + f);
      expect(res.status()).toBe(200);
      expect(Buffer.compare(await res.body(), siteFile(f))).toBe(0);
    });
  }

  test('/v1/*.json 은 JSON 으로 제공된다', async ({request}) => {
    for (const f of ['catalog', 'blueprint.schema']) {
      const res = await request.get(`/v1/${f}.json`);
      expect(res.headers()['content-type']).toContain('application/json');
    }
  });

  test('폴더 주소(/examples/x/)는 리다이렉트 없이 index.html 바이트를 낸다', async ({request}) => {
    for (const p of ['/examples/saas-landing/', '/examples/saas-landing', '/examples/themes/aurora/', '/test-lab/', '/test-lab/cases/c-294/']) {
      const res = await request.get(p, {maxRedirects: 0});
      expect(res.status(), p).toBe(200);
      const file = p.replace(/\/$/, '') + '/index.html';
      const expected = file === '/test-lab/index.html' ? siteFile('test-lab/index.html') : siteFile(file.slice(1));
      expect(Buffer.compare(await res.body(), expected), p).toBe(0);
    }
  });

  test('examples 전체(템플릿 85 + 테마 54)가 200과 같은 바이트로 제공된다', async ({request}) => {
    const targets = walk(join(site, 'examples')).map(f => relative(site, f));
    expect(targets).toHaveLength(695);
    const failures = [];
    for (let i = 0; i < targets.length; i += 24) {
      await Promise.all(targets.slice(i, i + 24).map(async f => {
        const res = await request.get('/' + f);
        if (res.status() !== 200 || Buffer.compare(await res.body(), siteFile(f)) !== 0) failures.push(f);
      }));
    }
    expect(failures).toEqual([]);
  });

  test('없는 예제와 파일은 404', async ({request}) => {
    for (const p of ['/examples/not-a-template/', '/examples/saas-landing/nope.css', '/v1/nope.json', '/test-lab/nope.html']) {
      expect((await request.get(p, {maxRedirects: 0})).status(), p).toBe(404);
    }
  });
});

// 의도한 카탈로그 개정이면 값을 갱신하고 이유를 기록한다(00-baseline.md 4.2절). site/ 와 public/ 이 같은지는 따로 본다.
test.describe('해시 게이트 (서버 없이 파일 비교)', () => {
  const parts = [
    // 고정 해시(앞 16자)는 b303f17c1 과 f1d250cf2 에서 같음을 확인한 값이다. v1/ 은 카탈로그 개정마다 바뀌므로 고정하지 않는다.
    // 00-baseline.md 4.2절 표의 값(eb438ecf…, 8b73787b…)은 위 계산식으로 재현되지 않아 04-web-spike.md 에 따로 적었다.
    ['examples', 425, 'ba7fbfe407f651cd'],
    ['examples/themes', 270, '2d0988bbf0beab89'],
    ['v1', 2, null],
  ];
  for (const [sub, count, pinned] of parts) {
    test(`public/${sub} 는 site/${sub} 와 트리 해시가 같다`, () => {
      const excl = sub === 'examples' ? f => f.startsWith('examples/themes/') : () => false;
      const a = treeHash(site, sub, excl), b = treeHash(publicDir, sub, excl);
      expect(a.count).toBe(count);
      expect(b).toEqual(a);
      if (pinned) expect(a.hash.slice(0, 16), '의도한 카탈로그 개정이면 값을 갱신하고 이유를 기록').toBe(pinned);
    });
  }
});

test.describe('noindex와 공개 메뉴', () => {
  test('/test-lab/** 와 /dev/** 는 X-Robots-Tag noindex', async ({request}) => {
    for (const p of ['/test-lab/', '/test-lab/viewer.html', '/test-lab/cases/c-294/', '/dev/qa']) {
      const res = await request.get(p);
      expect(res.headers()['x-robots-tag'], p).toContain('noindex');
    }
  });

  test('공개 화면과 예제에는 noindex 헤더가 없다', async ({request}) => {
    for (const p of ['/', '/explore', '/examples/saas-landing/', '/v1/catalog.json']) {
      expect((await request.get(p)).headers()['x-robots-tag'], p).toBeUndefined();
    }
  });

  test('robots.txt 가 test-lab 과 dev 를 막는다', async ({request}) => {
    const text = await (await request.get('/robots.txt')).text();
    expect(text).toContain('Disallow: /test-lab/');
    expect(text).toContain('Disallow: /dev/');
  });

  test('/dev/qa 는 meta robots noindex', async ({request}) => {
    const html = await (await request.get('/dev/qa')).text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  });
});

test('없는 경로는 not-found 화면과 404', async ({request}) => {
  const res = await request.get('/this/does/not/exist');
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain('이 주소에는 페이지가 없습니다');
});
