import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint, templates, repairAxes} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {highlight} from '../src/render/highlight.mjs';
import {formRuntime} from '../src/render.mjs';

const codes = b => validateBlueprint(b).errors.map(e => e.code);
const withTree = (id, edit) => { const b = createBlueprint(id); edit(b); return b; };

test('nav group labels: vertical shells only, contiguous, one current page', () => {
  const grouped = () => createBlueprint('docs-reference');
  assert.equal(grouped().shell, 'sidebar');
  assert.deepEqual(codes(grouped()), []);
  const horizontal = grouped(); horizontal.shell = 'topbar';
  assert.ok(codes(horizontal).includes('NAV_GROUP'), 'topbar cannot show group labels');
  assert.equal(codes(repairAxes(horizontal)).includes('NAV_GROUP'), false, 'repair drops labels when a theme brings a horizontal shell');
  const split = grouped(); split.chrome.nav[3].group = '시작하기';
  assert.ok(codes(split).includes('NAV_GROUP'), 'a group that comes back later is rejected');
  const two = grouped(); two.chrome.nav[0].current = 'page';
  assert.ok(codes(two).includes('NAV_GROUP'), 'two current pages');
  const html = compile(grouped()).html;
  assert.match(html, /<p class="kit-nav-title" id="nav-g-0">시작하기<\/p><ul aria-labelledby="nav-g-0">/);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(html, /<a href="#main" aria-current="page"><svg[^>]*>[^]*?<\/svg><span>API 시작하기<\/span>/);
});

test('code blocks ship a copy button, a status region and colored tokens; the runtime handles the click', () => {
  const html = compile(createBlueprint('docs-reference')).html;
  assert.match(html, /<button class="kit-copy" type="button" data-copy aria-label="[^"]+ 코드 복사">/);
  assert.match(html, /data-copy-status/);
  assert.match(html, /<span class="tk-k">import<\/span>/);
  assert.ok(formRuntime.includes("[data-copy]") && formRuntime.includes('navigator.clipboard') && formRuntime.includes('execCommand'));
  assert.equal(highlight('<b onclick="x">&</b>', 'html').includes('<b onclick'), false, 'markup in code is escaped');
  assert.match(highlight('{"a": 1, "b": "t"}', 'json'), /<span class="tk-k">&quot;a&quot;<\/span>: <span class="tk-n">1<\/span>.*<span class="tk-s">&quot;t&quot;<\/span>/);
  assert.equal(highlight('plain', 'text'), 'plain');
});

test('hero facts live in the copy column of statement/cover/centered heroes and are rejected elsewhere', () => {
  for (const id of ['campaign-donate', 'museum-home', 'hanji-journey', 'agency-home']) {
    const html = compile(createBlueprint(id)).html;
    assert.match(html, /<div class="kit-hero-copy" data-cpl="\d+">[^]*<dl class="kit-hero-facts">[^]*<\/dl><\/div><div class="kit-hero-deco" aria-hidden="true">/, id);
  }
  const split = withTree('saas-landing', b => { const hero = b.tree.children.find(n => n.type === 'hero'); hero.facts = [{value: '1', label: 'a'}, {value: '2', label: 'b'}]; });
  assert.ok(codes(split).includes('VARIANT_REQUIRES'));
  const one = withTree('campaign-donate', b => { b.tree.children.find(n => n.type === 'hero').facts = [{value: '1', label: 'a'}]; });
  assert.ok(codes(one).includes('ARRAY_LENGTH'), 'facts need 2-4 entries');
});

test('profile header, release timeline, photo menu and calendar tones render their parts', () => {
  const profile = compile(createBlueprint('profile')).html;
  assert.match(profile, /data-profile="yes"[^]*kit-profile-banner[^]*kit-avatar-xl[^]*kit-profile-stats/);
  const changelog = compile(createBlueprint('changelog')).html;
  assert.match(changelog, /data-variant="release"[^]*kit-rel-ver[^]*<ul class="kit-changes"><li data-kind="신규">/);
  assert.ok(codes(withTree('changelog', b => { b.tree.children[1].variant = 'line'; })).includes('VARIANT_REQUIRES'), 'changes need variant=release');
  const menu = compile(createBlueprint('menu-dining')).html;
  assert.match(menu, /data-layout="photo"[^]*kit-menu-thumb/);
  assert.ok(codes(withTree('menu-dining', b => { delete b.tree.children.find(n => n.type === 'menu' && n.layout === 'photo').items[0].motif; })).includes('VARIANT_REQUIRES'), 'photo layout needs a motif on every item');
  const cal = compile(createBlueprint('calendar-view')).html;
  assert.match(cal, /<span class="kit-day" aria-current="date">16/);
  assert.match(cal, /<li data-tone="warning"><time>11:00<\/time>/);
  assert.equal(codes(withTree('calendar-view', b => { b.tree.children.find(n => n.type === 'calendar').today = 31; })).includes('CALENDAR_DAY'), false, 'October has 31 days, so 31 is fine');
  assert.ok(codes(withTree('calendar-view', b => { const c = b.tree.children.find(n => n.type === 'calendar'); c.month = 9; c.today = 31; c.events = []; })).includes('CALENDAR_DAY'), 'September has no 31st');
});

test('survey radios become selectable tiles, rail timelines run across, tutorial pairs steps with the command', () => {
  assert.match(compile(createBlueprint('survey')).css, /\.kit-choice:has\(input\[type=radio\]\)\{display:grid/);
  const about = compile(createBlueprint('about-team')).html;
  assert.match(about, /data-variant="rail"/);
  const tutorial = createBlueprint('tutorial');
  assert.deepEqual(codes(tutorial), []);
  assert.ok(tutorial.tree.children.some(n => n.type === 'aside' && n.children.map(c => c.type).join() === 'steps,code'));
});

test('every template still passes after the part upgrades (no template lost its page-type contract)', () => {
  for (const t of Object.values(templates)) assert.deepEqual(codes(createBlueprint(t.id)), [], t.id);
});
