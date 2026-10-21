import test from 'node:test';
import assert from 'node:assert/strict';
import {TYPE, TYPE_IDS, STACKS, ROLES, RATIO_SHIFT, roleSizes, typeVars, lintType, typographyMarkdown} from '../src/typography.mjs';
import {chunks} from '../src/styles/chunks.mjs';
import {polish, polishCore} from '../src/styles/polish.mjs';
import {coreCSS, tailCSS} from '../src/styles/base.mjs';
import {shellCSS} from '../src/styles/shells.mjs';
import {axes, axisBans, createBlueprint, templateList} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';

const sources = () => {
  const css = [coreCSS, tailCSS, polishCore, ...Object.values(chunks), ...Object.values(polish)];
  for (const shell of axes.shell) for (const footer of axes.footer) css.push(shellCSS({shell, footer}));
  return css;
};

test('typography axis is exactly the preset table, with at least 16 presets', () => {
  assert.deepEqual([...axes.typography].sort(), [...TYPE_IDS].sort());
  assert.ok(TYPE_IDS.length >= 16, 'presets: ' + TYPE_IDS.length);
  for (const id of ['sans', 'serif', 'mono', 'editorial', 'rounded', 'geometric', 'humanist', 'grotesk']) assert.ok(TYPE[id], 'kept preset ' + id);
});

test('every preset is a complete voice: stacks end in a Korean fallback, ratio/tracking/leading stay in range', () => {
  for (const p of Object.values(TYPE)) {
    for (const key of [p.head, p.text]) {
      assert.ok(STACKS[key], `${p.id}: unknown stack ${key}`);
      assert.match(STACKS[key], /Apple SD Gothic Neo|AppleMyungjo|D2Coding/, `${p.id}/${key}: no Korean face`);
      assert.match(STACKS[key], /(sans-serif|serif|monospace)$/, `${p.id}/${key}: no generic family at the end`);
    }
    assert.ok(p.ratio >= 1.2 && p.ratio <= 1.5, `${p.id} ratio ${p.ratio}`);
    assert.ok([16, 17].includes(p.body), `${p.id} body ${p.body}`);
    assert.ok(p.hw % 100 === 0 && p.hw >= -300 && p.hw <= 200, `${p.id} hw ${p.hw}`);
    for (const [role, v] of Object.entries(p.track)) assert.ok(v >= -.05 && v <= .14, `${p.id} track ${role} ${v}`);
    // 한글은 −0.05em 아래로 조이면 뭉친다(docs/typography.md 규칙 1)
    assert.ok(p.track.display >= -.05, `${p.id} display tracking`);
    for (const [role, v] of Object.entries(p.lh)) assert.ok(v >= .98 && v <= 1.9, `${p.id} line height ${role} ${v}`);
    assert.ok(p.lh.display <= p.lh.title + .001 && p.lh.title <= p.lh.heading + .001 && p.lh.heading <= p.lh.sub + .001 && p.lh.sub <= p.lh.body, `${p.id}: leading must loosen as type gets smaller`);
  }
});

test('size roles keep their order under every preset and scale: micro < … < body < sub < heading < title < display', () => {
  for (const id of TYPE_IDS) for (const scale of Object.keys(RATIO_SHIFT)) {
    const z = roleSizes({typography: id, scale}), max = n => z[n].max, min = n => z[n].min;
    const chain = ['micro', 'caption', 'label', 'small', 'ui', 'body', 'sub', 'heading', 'title', 'display'];
    for (let i = 1; i < chain.length; i++) assert.ok(max(chain[i]) > max(chain[i - 1]), `${id}/${scale}: ${chain[i]} ${max(chain[i])} must exceed ${chain[i - 1]} ${max(chain[i - 1])}`);
    // 앱 화면의 제목은 같은 화면의 섹션 머리말(heading-s)보다 크다: 6차 진단 HIER_INVERT
    assert.ok(max('app') > max('heading-s') && min('app') >= min('heading-s') - 1, `${id}/${scale}: app ${max('app')}/${min('app')} vs heading-s ${max('heading-s')}/${min('heading-s')}`);
    // 좁은 화면의 최솟값도 같은 순서를 지킨다(모바일 HIER_INVERT)
    assert.ok(z.sub.max < min('heading') && min('heading') < min('title') && min('title') < min('display') + .001 && z.sub.max < min('app'), `${id}/${scale}: minimums sub ${z.sub.max} < heading ${min('heading')} < title ${min('title')} < display ${min('display')}`);
    assert.ok(z.sub.max < min('heading-s'), `${id}/${scale}: heading-s ${min('heading-s')} must stay above the card title ${z.sub.max}`);
    assert.ok(max('heading') < max('title') && max('title') < max('display') + .001, `${id}/${scale}: heading < title <= display`);
    for (const name of Object.keys(ROLES)) assert.ok(z[name].min <= z[name].max + .001 && z[name].min >= 10, `${id}/${scale}/${name} min ${z[name].min}`);
  }
});

test('large roles (above 24px) are owned by a slot; small roles are free', () => {
  for (const [name, role] of Object.entries(ROLES)) {
    const big = roleSizes({typography: 'sans', scale: 'balanced'})[name].max > 24;
    if (big) assert.ok(!role.slots.includes('*') || name === 'sub-l' || name === 'lead' || name === 'prose', `${name} is large but has no slot`);
  }
});

test('the stylesheet sources contain no raw font-size and no font shorthand (lintType finds nothing)', () => {
  const seen = new Set(), bad = [];
  for (const css of sources()) for (const v of lintType(css)) { const k = v.selector + v.reason + v.value; if (!seen.has(k)) { seen.add(k); bad.push(`${v.prop}:${v.value} (${v.reason}) in ${v.selector}`); } }
  assert.deepEqual(bad, []);
  assert.ok(sources().join('').match(/font-size:/g).length > 100, 'proof of scan: font-size declarations are read');
});

test('lintType rejects raw sizes, unknown roles, shorthand, and a large role outside its slot (negative controls)', () => {
  assert.equal(lintType('.kit-card p{font-size:13px}')[0].reason, 'RAW');
  assert.equal(lintType('.kit-card p{font-size:clamp(20px,2vw,26px)}')[0].reason, 'RAW');
  assert.equal(lintType('.kit-card p{font-size:calc(var(--kit-t-body) + 1px)}')[0].reason, 'RAW');
  assert.equal(lintType('.kit-card p{font-size:var(--kit-t-nope)}')[0].reason, 'ROLE');
  assert.equal(lintType('.kit-card p{font:600 16px/1.4 serif}')[0].reason, 'SHORTHAND');
  // 큰 글자는 정해진 자리에서만: 카드 본문에 히어로 제목 크기를 줄 수 없다
  assert.match(lintType('.kit-card p{font-size:var(--kit-t-display)}')[0].reason, /^SLOT display/);
  assert.match(lintType('.kit-bento-cell dd{font-size:var(--kit-t-title)}')[0].reason, /^SLOT title/);
  assert.deepEqual(lintType('.kit-hero h2{font-size:var(--kit-t-display)}'), []);
  assert.deepEqual(lintType('.kit-metric>dd{font-size:min(var(--kit-t-stat),calc(100cqw * var(--kit-vfit,1)))}'), []);
  assert.deepEqual(lintType('.kit-card p{font-size:var(--kit-t-small)}'), []);
});

test('compiled pages emit every role and the preset voice; no page carries a raw size', () => {
  for (const id of ['saas-landing', 'article', 'dashboard-overview']) {
    const css = compile(createBlueprint(id)).css;
    for (const name of Object.keys(ROLES)) assert.match(css, new RegExp(`--kit-t-${name}:`), `${id}: ${name}`);
    assert.deepEqual(lintType(css), []);
    assert.match(css, /--kit-tr-display:-?[\d.]+em/);
    assert.match(css, /--kit-lh-body|--kit-line:[\d.]+/);
  }
});

test('every preset compiles on a template, and the axis bans that mention typography still hold', () => {
  const ban = axisBans.find(x => x.id === 'X06');
  assert.ok(ban.bad({typography: 'terminal', scale: 'dramatic'}) && ban.bad({typography: 'mono', scale: 'dramatic'}), 'fixed-width heads must not be dramatic');
  for (const id of TYPE_IDS) {
    const b = createBlueprint('article'); b.typography = id; if (ban.bad(b)) Object.assign(b, ban.fix);
    const {css} = compile(b);
    const vars = typeVars(b, 700).join(';');
    assert.ok(css.includes(vars.split(';')[0]), id + ' head stack in :root');
  }
});

test('docs/typography.md is generated from the table', () => {
  const md = typographyMarkdown();
  for (const id of TYPE_IDS) assert.ok(md.includes('`' + id + '`'), id);
  assert.match(md, /웹폰트를 쓴다면/);
  assert.ok(templateList.length > 0);
});
