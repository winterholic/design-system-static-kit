import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes} from '../src/catalog/index.mjs';
import {createPlatform} from '../src/platform/index.mjs';
import {STYLE_CONTEXTS, STYLE_FAMILY_PICKS} from '../src/platform/data/style-contexts.mjs';
import {familyRanking, familyDistribution} from './platform-style-doc.mjs';

const env = createPlatform();
const rows = familyRanking(env);
const BASE_FAMILIES = ['family:quiet', 'family:soft', 'family:bold', 'family:editorial'];
const MAX_SHARE = 0.5, MIN_COUNT = 5;

test('one visual family does not take more than half of the 54 first-place picks, and every visual family is first for some contexts', () => {
  assert.equal(rows.length, 54);
  const dist = familyDistribution(rows);
  for (const d of dist) assert.ok(d.share <= MAX_SHARE, `${d.family} is first for ${d.count}/54 contexts (${(d.share * 100).toFixed(1)}%), over ${MAX_SHARE * 100}%: ${d.themes.join(', ')}`);
  for (const id of BASE_FAMILIES) assert.ok((dist.find(d => d.family === id)?.count ?? 0) >= MIN_COUNT, `${id} is first for fewer than ${MIN_COUNT} contexts`);
  const base = ['family:editorial', 'family:soft'];
  assert.ok(rows.filter(r => base.includes(r.first)).length <= 43 - 4, 'editorial+soft stays clearly below the 43/54 the material review found');
});

test('the first-place family follows the theme character and is the declared pick with its reason on the relation', () => {
  for (const r of rows) {
    const sc = STYLE_CONTEXTS.find(s => s.id === `style-context:${r.theme}`);
    assert.equal(r.first, STYLE_FAMILY_PICKS[r.theme], `${r.theme}: recommend() puts the declared family first`);
    const edge = sc.relations.find(e => e.to === r.first && e.type === 'prefers' && e.priority === 100);
    assert.ok(edge && edge.reason.length > 20 && edge.reason.includes('시각 패밀리'), `${r.theme}: the selection reason is on the relation`);
    assert.ok(!sc.relations.some(e => e.to === r.first && e.type === 'forbids'), `${r.theme}: the pick is not forbidden by the theme`);
  }
  const first = Object.fromEntries(rows.map(r => [r.theme, r.first]));
  // 업무·데이터: quiet이 후보인 첫 페이지 유형(dashboard·data·listing·settings)이면 quiet
  for (const r of rows) if (themes[r.theme].category === 'work' && ['dashboard', 'data', 'listing', 'settings'].includes(r.context)) assert.equal(r.first, 'family:quiet', `${r.theme}: work/data context first page ${r.context}`);
  // 읽기·문서: 면 없는 editorial
  for (const r of rows) if (themes[r.theme].category === 'read') assert.equal(r.first, 'family:editorial', `${r.theme}: reading context`);
  // 강한 브랜드·캠페인: bold
  for (const id of ['brutalist', 'retro', 'signal', 'colorblock', 'studio']) assert.equal(first[id], 'family:bold', `${id}: strong brand/campaign`);
  // 친근·둥근 브랜드: soft
  for (const id of ['playful', 'kids', 'wedding', 'cafe', 'clinic']) assert.equal(first[id], 'family:soft', `${id}: friendly rounded brand`);
});
