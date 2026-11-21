/** 픽스처 시험 도구: 케이스(section#id[data-expect])마다 기대한 진단 코드가 나왔는지, 좋은 케이스는 깨끗한지 대조한다.
 *  발견의 locator는 가장 가까운 id 조상에서 시작하므로 `#<case id>`로 케이스에 귀속된다. */
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {checkPage} from './run.mjs';

export const FIXTURE_DIR = resolve(import.meta.dirname, 'fixtures');
export const fixtureUrl = name => pathToFileURL(resolve(FIXTURE_DIR, name)).href;

export async function runFixture(page, name, {widths = [1280], ...opts} = {}) {
  await page.goto(fixtureUrl(name), {waitUntil: 'load'});
  const cases = await page.evaluate(() => [...document.querySelectorAll('[data-expect]')].map(e => ({id: e.id, expect: e.dataset.expect})));
  const results = await checkPage(page, {widths, label: name, ...opts});
  return {cases, results, findings: results.flatMap(r => r.findings)};
}

/** 케이스별 판정. bad: 기대 코드가 error 이상으로 나옴. good: error·warn 없음(info는 허용). */
export function judgeCases(cases, findings) {
  return cases.map(c => {
    const mine = findings.filter(f => f.locator === `#${c.id}` || f.locator.startsWith(`#${c.id} `));
    const codes = [...new Set(mine.map(f => f.code))];
    if (c.expect === 'none') {
      const bad = mine.filter(f => f.severity !== 'info' && !f.exempt);
      return {...c, ok: bad.length === 0, codes, detail: bad.map(f => `${f.code}(${f.severity}) ${JSON.stringify(f.evidence)}`).join(' | ')};
    }
    const want = c.expect.split(',');
    const hit = want.every(code => mine.some(f => f.code === code && f.severity !== 'info'));
    return {...c, ok: hit, codes, detail: hit ? '' : `기대 ${c.expect}, 실제 ${codes.join(',') || '없음'}`};
  });
}
