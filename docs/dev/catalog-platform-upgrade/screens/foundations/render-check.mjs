#!/usr/bin/env node
/**
 * E4 Foundations 재료의 실제 Chromium 렌더 확인(전수 생성 아님: 대표 재료만).
 *   PLAYWRIGHT_BROWSERS_PATH=... node docs/dev/catalog-platform-upgrade/screens/foundations/render-check.mjs [출력 폴더]
 * 계산된 스타일(getComputedStyle)과 실제 레이아웃·전환 진행값을 읽어 단언하고, 대표 스크린샷을 같은 폴더에 쓴다. 단언이 하나라도 실패하면 exit 1.
 */
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPlatform, bindColor, bindType} from '../../../../../src/platform/index.mjs';
import {spaceVars, SPACE, TOKEN} from '../../../../../src/spacing.mjs';
import {SURFACES, SURFACE_FACETS, surfaceCSS, renderSurfaceSample, renderSurfaceFacetSample} from '../../../../../src/platform/data/surfaces.mjs';
import {MOTIONS, MOTION_PATTERNS, motionCSS, renderMotionSample} from '../../../../../src/platform/data/motion.mjs';
import {BACKGROUNDS, backgroundCSS, renderBackgroundSample, validateBackground} from '../../../../../src/platform/data/backgrounds.mjs';
import {SPACING_MATERIALS, SPACING_ROLES, spacingCSS, renderSpacingSample} from '../../../../../src/platform/data/spacing.mjs';
import {ICON_MATERIALS, iconCSS, renderAreaIcon} from '../../../../../src/platform/data/icons.mjs';

const out = resolve(process.argv[2] ?? dirname(fileURLToPath(import.meta.url)));
mkdirSync(out, {recursive: true});
const env = createPlatform();
const color = bindColor(env.registry.get('palette:static-kit'), env.registry.get('subtoken-set:standard'), 'light');
const type = bindType(env.registry.get('type-system:tech-erp')).vars;
const rootVars = {...color.vars, '--kit-shade': 'color-mix(in srgb,var(--kit-text) 14%,transparent)', ...type};
const root = (density = 'comfortable') => `:root{${Object.entries(rootVars).map(([k, v]) => `${k}:${v}`).join(';')};${spaceVars(density)}}*{box-sizing:border-box}body{margin:0;padding:24px;background:var(--kit-canvas);color:var(--kit-text);font:14px/1.4 var(--kit-font-body,system-ui,sans-serif)}h1,h2{margin:0 0 8px}`;
const page = (body, css, density) => `<!doctype html><meta charset="utf-8"><style>${root(density)}${css}</style>${body}`;

const failures = [], notes = [];
const check = (cond, message) => { if (!cond) failures.push(message); };
const report = (name, value) => { notes.push(`${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`); };

const browser = await chromium.launch();
const open = async (html, {reducedMotion = 'no-preference', width = 1100, height = 800} = {}) => {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion, deviceScaleFactor: 1});
  const p = await context.newPage();
  await p.setContent(html);
  return {p, close: () => context.close()};
};

// ---- 1. 표면·그림자: 17 facet이 화면에서 서로 다른 계산 스타일을 갖는다
{
  const m = SURFACES[0];
  const html = page(`<h1>Surface facets (${m.id})</h1>${renderSurfaceFacetSample(m)}`, `${surfaceCSS(m)}.kit-facet-demo{padding:16px;background:var(--kit-canvas)}.kit-facet-demo .kit-surface{background:var(--kit-surface)}`);
  const {p, close} = await open(html, {width: 1100, height: 900});
  const looks = await p.$$eval('[data-surface-facet]', els => els.map(e => { const s = getComputedStyle(e); return {id: e.dataset.surfaceFacet, radius: s.borderTopLeftRadius + '/' + s.borderBottomRightRadius, border: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor, shadow: s.boxShadow}; }));
  const distinct = new Set(looks.map(l => `${l.radius}|${l.border}|${l.shadow}`));
  check(looks.length === 17, `facet 요소 ${looks.length}개`);
  check(distinct.size === 17, `화면에서 서로 다른 facet 모양 ${distinct.size}/17`);
  const by = Object.fromEntries(looks.map(l => [l.id, l]));
  check(by['medium-elevation'].shadow !== by['deep-elevation'].shadow, 'medium/deep 그림자가 화면에서 같다');
  const blur = shadow => Math.max(...[...shadow.matchAll(/(-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px/g)].map(x => Number(x[3])));
  const steps = ['subtle-elevation', 'medium-elevation', 'deep-elevation'].map(id => blur(by[id].shadow));
  check(steps[0] < steps[1] && steps[1] < steps[2], `그림자 번짐이 subtle < medium < deep 이어야 한다: ${steps}`);
  check(by['flat-surface'].shadow === 'none', 'flat 그림자');
  check(by.sharp.radius === '0px/0px' && Number.parseFloat(by.pill.radius) >= 999 || by.pill.radius.startsWith('3.35544e'), `sharp/pill 반경 ${by.sharp.radius} ${by.pill.radius}`);
  check(by['double-border'].border.includes('double'), `double 테두리가 화면에 적용되지 않았다: ${by['double-border'].border}`);
  check(by['hard-offset'].shadow.includes('4px 4px 0px'), `hard-offset 그림자: ${by['hard-offset'].shadow}`);
  check(by.inset.shadow.includes('inset'), 'inset 그림자');
  await p.screenshot({path: resolve(out, 'foundations-surface-facets.png'), fullPage: true});
  // REQUEST §9.4: 이중 테두리는 적절한 맥락(form·pricing)에서만 열린다
  await p.setContent(page(`<h1>Double border outside its contexts</h1>${renderSurfaceFacetSample(m, {context: 'dashboard'})}`, `${surfaceCSS(m)}.kit-facet-demo .kit-surface{background:var(--kit-surface)}`));
  const outside = await p.$eval('[data-surface-facet="double-border"]', e => getComputedStyle(e).borderTopStyle);
  check(outside !== 'double', `dashboard 맥락에서 double 테두리가 열렸다: ${outside}`);
  report('surface.double-border', {form: 'double', dashboard: outside});
  report('surface.facets.distinct', `${distinct.size}/17`);
  report('surface.elevation.blur(subtle,medium,deep)', steps);
  await close();
}

// ---- 1b. 표면 프리셋 사이: 같은 마크업에서 base 단계 그림자·반경·테두리가 프리셋마다 다르다
{
  const html = page(`<h1>Surface presets (base level)</h1><div class="row">${SURFACES.map(m => renderSurfaceSample(m).replace('<div class="kit-surface-demo"', `<div class="kit-surface-demo" data-name="${m.id}"`)).join('')}</div>`,
    `${SURFACES.map(surfaceCSS).join('')}.row{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}.kit-surface-demo{display:grid;gap:16px;padding:16px;background:var(--kit-canvas)}`);
  const {p, close} = await open(html, {width: 1400, height: 700});
  const base = await p.$$eval('.kit-surface-demo', demos => demos.map(d => { const s = getComputedStyle(d.querySelector('[data-level="base"]')); return {id: d.dataset.name, shadow: s.boxShadow, radius: s.borderTopLeftRadius, border: s.borderTopWidth + s.borderTopStyle}; }));
  check(new Set(base.map(b => `${b.shadow}|${b.radius}|${b.border}`)).size === SURFACES.length, `표면 프리셋 base 단계 모양이 서로 다르지 않다: ${JSON.stringify(base.map(b => b.id))}`);
  report('surface.presets.base', base.map(b => `${b.id.slice(8)}: r=${b.radius} ${b.border} ${b.shadow === 'none' ? 'no-shadow' : 'shadow'}`));
  await p.screenshot({path: resolve(out, 'foundations-surface-presets.png'), fullPage: true});
  await close();
}

// ---- 2. 모션: prefers-reduced-motion 정책이 계산 스타일과 실제 전환 진행값에 나타난다
{
  const m = MOTIONS.find(x => x.id === 'motion:calm'), mname = m.id.slice('motion:'.length);
  const html = page(`<h1>Motion (${m.id})</h1><div data-motion="${mname}">${renderMotionSample(m).replace(`<ul class="kit-motion-demo" data-motion="${mname}">`, '<ul class="kit-motion-demo">')}<div id="probe-press" data-motion-pattern="press" class="box">press</div><div id="probe-modal" data-motion-pattern="modal-enter" class="box" style="opacity:0;transform:translateY(40px)">modal-enter</div><div id="probe-drawer" data-motion-pattern="drawer-enter" class="box">drawer-enter</div></div>`,
    `${motionCSS(m)}.box{display:inline-block;margin:8px;padding:8px 16px;background:var(--kit-soft);border:1px solid var(--kit-border)}.kit-motion-demo{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;list-style:none;padding:0}.kit-motion-demo li{padding:8px;border:1px solid var(--kit-border)}`);
  const results = {};
  for (const mode of ['no-preference', 'reduce']) {
    const {p, close} = await open(html, {reducedMotion: mode});
    const computed = await p.$$eval('[data-motion-pattern]', els => els.filter(e => e.closest('[data-motion]') && e.id === '' ? true : e.id !== '' || true).map(e => { const s = getComputedStyle(e); return {id: e.dataset.motionPattern, prop: s.transitionProperty, dur: s.transitionDuration, delay: s.transitionDelay}; }));
    // 실제 전환: 끝 값으로 바꾼 뒤 스타일을 강제로 계산시켜 브라우저가 만든 CSSTransition(속성·길이)을 읽는다.
    // 시간에 기대지 않도록 전환을 멈추고 진행 50% 지점의 값을 읽는다(전환이 없으면 이미 끝 값이다).
    const progress = await p.evaluate(() => {
      const press = document.getElementById('probe-press'), modal = document.getElementById('probe-modal'), drawer = document.getElementById('probe-drawer');
      press.style.transform = 'translateX(100px)'; modal.style.opacity = '1'; modal.style.transform = 'translateY(0px)'; drawer.style.transform = 'translateX(100px)';
      for (const el of [press, modal, drawer]) { getComputedStyle(el).transform; getComputedStyle(el).opacity; }
      const running = el => el.getAnimations().filter(a => a instanceof CSSTransition);
      const label = el => running(el).map(a => `${a.transitionProperty}:${a.effect.getComputedTiming().duration}`).sort().join(',');
      const transitions = {press: label(press), modal: label(modal), drawer: label(drawer)};
      for (const el of [press, modal, drawer]) for (const a of running(el)) { a.pause(); a.currentTime = a.effect.getComputedTiming().duration / 2; }
      const x = el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41, y = el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
      return {pressX: x(press), modalOpacity: Number(getComputedStyle(modal).opacity), modalY: y(modal), drawerX: x(drawer), transitions};
    });
    results[mode] = {computed, progress};
    if (mode === 'reduce') await p.screenshot({path: resolve(out, 'foundations-motion-reduced.png'), fullPage: true});
    await close();
  }
  const cp = (mode, id) => results[mode].computed.find(c => c.id === id);
  const dur = s => Number.parseFloat(s) * (s.endsWith('ms') ? 1 : 1000);
  const nopref = results['no-preference'], reduce = results.reduce;
  check(cp('no-preference', 'press').prop === 'transform' && dur(cp('no-preference', 'press').dur) === m.duration.fast, `no-preference press 전환 ${JSON.stringify(cp('no-preference', 'press'))}`);
  check(cp('no-preference', 'modal-enter').prop.includes('opacity') && cp('no-preference', 'modal-enter').prop.includes('transform') && dur(cp('no-preference', 'modal-enter').dur.split(',')[0]) === m.duration.slow, `no-preference modal-enter ${JSON.stringify(cp('no-preference', 'modal-enter'))}`);
  check(cp('reduce', 'press').prop === 'none' && dur(cp('reduce', 'press').dur) === 0, `reduce press는 즉시여야 한다: ${JSON.stringify(cp('reduce', 'press'))}`);
  check(cp('reduce', 'modal-enter').prop === 'opacity' && dur(cp('reduce', 'modal-enter').dur) === m.duration.fast, `reduce modal-enter는 opacity만 남아야 한다: ${JSON.stringify(cp('reduce', 'modal-enter'))}`);
  const t = (r, k) => r.progress.transitions[k];
  check(t(nopref, 'press') === `transform:${m.duration.fast}` && t(nopref, 'drawer') === `transform:${m.duration.slow}` && t(nopref, 'modal') === `opacity:${m.duration.slow},transform:${m.duration.slow}`, `no-preference 실행 중인 전환 ${JSON.stringify(nopref.progress.transitions)}`);
  check(t(reduce, 'press') === '' && t(reduce, 'drawer') === '' && t(reduce, 'modal') === `opacity:${m.duration.fast}`, `reduce 실행 중인 전환: instant는 없고 fade는 opacity만 ${JSON.stringify(reduce.progress.transitions)}`);
  check(nopref.progress.pressX > 0 && nopref.progress.pressX < 100 && nopref.progress.drawerX > 0 && nopref.progress.drawerX < 100 && nopref.progress.modalY > 0 && nopref.progress.modalOpacity > 0 && nopref.progress.modalOpacity < 1, `no-preference: 진행 50% 지점은 시작과 끝 사이여야 한다 ${JSON.stringify(nopref.progress)}`);
  check(reduce.progress.pressX === 100 && reduce.progress.drawerX === 100 && reduce.progress.modalY === 0, `reduce: 이동은 즉시 끝값이어야 한다 ${JSON.stringify(reduce.progress)}`);
  check(reduce.progress.modalOpacity > 0 && reduce.progress.modalOpacity < 1, `reduce modal-enter 불투명도는 전환 지점의 중간값이어야 한다: ${reduce.progress.modalOpacity}`);
  check(MOTION_PATTERNS.length === 15, '패턴 15개');
  report('motion.no-preference.at-50%-of-each-transition', nopref.progress);
  report('motion.reduce.at-50%-of-each-transition', reduce.progress);
  report('motion.computed.reduce(press,modal-enter,drawer-enter)', ['press', 'modal-enter', 'drawer-enter'].map(id => cp('reduce', id)));
}

// ---- 3. 배경: blur 상한(16px)과 읽기 성능, 대표 배경
{
  const frosted = BACKGROUNDS.find(b => b.id === 'background:frosted-pane');
  const unblurred = {...frosted, id: 'background:frosted-unblurred', deco: {...frosted.deco, blur: 0}};
  const cell = b => `<div class="cell">${renderBackgroundSample(b)}</div>`;
  const others = BACKGROUNDS.filter(b => ['background:radial-focus', 'background:blueprint-grid-lines', 'background:soft-tint', 'background:dark-premium'].includes(b.id));
  const html = page(`<h1>Backgrounds</h1><div class="cells" id="pair">${cell(frosted)}${cell(unblurred)}</div><div class="cells">${others.map(cell).join('')}</div>`,
    `${[...BACKGROUNDS, unblurred].map(backgroundCSS).join('')}.cells{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:16px}.kit-bg-demo{min-height:140px}`);
  const {p, close} = await open(html, {width: 1000, height: 800});
  const blurs = await p.$$eval('.kit-deco', els => els.map(e => getComputedStyle(e).backdropFilter));
  const px = blurs.map(b => Number((b.match(/blur\((\d+(?:\.\d+)?)px\)/) ?? [0, 0])[1]));
  check(px.every(v => v <= 16), `blur 상한 16px 초과: ${blurs}`);
  check(px.includes(12), `frosted-pane blur 12px가 계산 스타일에 없다: ${blurs}`);
  check(validateBackground({...frosted, deco: {...frosted.deco, blur: 17}}).some(e => e.code === 'P_BG_BLUR_LIMIT'), '17px blur가 거부되지 않았다');
  // 실제 화면에서 blur가 줄무늬를 뭉갰는지: 글자를 숨긴 같은 영역을 blur 12px와 0px로 찍어 이웃 픽셀 변화량(줄무늬 경계의 날카로움)을 비교
  await p.addStyleTag({content: '.kit-bg-content{visibility:hidden}'});
  const sharp = async index => {
    const buf = await (await p.$$('#pair .cell'))[index].screenshot();
    return p.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      let best = 0;
      for (const y of [Math.floor(img.height * 0.3), Math.floor(img.height * 0.5), Math.floor(img.height * 0.7)]) { const row = g.getImageData(0, y, img.width, 1).data; for (let x = 32; x < row.length - 32; x += 4) best = Math.max(best, Math.abs(row[x] - row[x - 4]) + Math.abs(row[x + 1] - row[x - 3]) + Math.abs(row[x + 2] - row[x - 2])); }
      return best;
    }, buf.toString('base64'));
  };
  const withBlur = await sharp(0), withoutBlur = await sharp(1);
  check(withoutBlur >= 10 && withBlur <= withoutBlur * 0.5, `blur가 화면에 나타나지 않는다(뒤에 또렷한 줄무늬가 있고 blur가 그것을 절반 이하로 뭉개야 한다): 줄무늬 경계 변화량 blur12 ${withBlur} / blur0 ${withoutBlur}`);
  await p.addStyleTag({content: '.kit-bg-content{visibility:visible}'});
  report('background.backdrop-filter(all deco)', blurs.filter(b => b !== 'none'));
  report('background.stripe-edge-step(frosted 12px vs 0px)', {blur12: withBlur, blur0: withoutBlur});
  await p.screenshot({path: resolve(out, 'foundations-background-blur.png'), fullPage: true});
  await close();
}

// ---- 4. 간격: 역할마다 실제 레이아웃 거리가 밀도 토큰과 같고 역할별로 다르게 변한다
{
  const measured = {};
  for (const m of SPACING_MATERIALS.filter(x => x.density !== 'comfortable')) {
    const d = m.density;
    const {p, close} = await open(page(`<h1>Spacing roles (${d})</h1>${renderSpacingSample(m)}`, spacingCSS(m), d), {width: 900, height: 700});
    measured[d] = await p.$$eval('[data-spacing-role]', els => els.map(box => {
      const [a, b] = box.children, bb = box.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), s = getComputedStyle(box);
      return {role: box.dataset.spacingRole, gap: rb.left - ra.right, padTop: ra.top - bb.top - 1, padding: Number.parseFloat(s.paddingTop), colGap: Number.parseFloat(s.columnGap) || 0};
    }));
    if (d === 'spacious') await p.screenshot({path: resolve(out, 'foundations-spacing-roles.png'), fullPage: true});
    await close();
  }
  for (const [d, rows] of Object.entries(measured)) for (const r of SPACING_ROLES) {
    const row = rows.find(x => x.role === r.id), want = SPACE[d][r.token];
    const got = r.prop === 'gap' ? row.colGap : r.prop === 'padding' ? row.padding : row.padding;
    check(got === want, `${d} ${r.id}: ${r.prop} ${got}px != ${TOKEN[r.token]} ${want}px`);
  }
  const ratio = role => measured.spacious.find(x => x.role === role), values = id => { const r = SPACING_ROLES.find(x => x.id === id); const take = row => r.prop === 'gap' ? row.colGap : row.padding; return take(ratio(id)) / take(measured.compact.find(x => x.role === id)); };
  const ratios = new Set(SPACING_ROLES.map(r => values(r.id).toFixed(2)));
  check(ratios.size >= 4, `밀도 배율이 역할마다 달라야 한다: ${[...ratios]}`);
  report('spacing.measured(spacious/compact ratio per role)', Object.fromEntries(SPACING_ROLES.map(r => [r.id, Number(values(r.id).toFixed(2))])));
}

// ---- 5. 아이콘: 같은 격자·굵기, 작은 크기, 접근 이름 구분
{
  const areas = ['navigation', 'finance', 'security', 'accessibility'].map(a => ICON_MATERIALS.find(m => m.area === a));
  const cell = m => `<div data-icon-area="${m.area}"><h2>${m.area}</h2>${m.symbols.map(s => renderAreaIcon(m, {symbol: s})).join(' ')} ${renderAreaIcon(m, {symbol: m.symbols[0], size: 'sm'})} ${renderAreaIcon(m, {symbol: m.symbols[1], label: m.symbols[1]})}</div>`;
  const {p, close} = await open(page(areas.map(cell).join(''), areas.map(iconCSS).join('')), {width: 700, height: 500});
  const info = await p.$$eval('[data-icon-area]', cells => cells.map(c => ({area: c.dataset.iconArea, icons: [...c.querySelectorAll('svg')].map(s => { const path = s.querySelector('path'), cs = getComputedStyle(s); return {w: cs.width, h: cs.height, sw: getComputedStyle(path).strokeWidth, va: cs.verticalAlign, hidden: s.getAttribute('aria-hidden'), sm: s.dataset.iconSize ?? null, labelled: Boolean(s.closest('[role="img"][aria-label]'))}; })})));
  for (const {area, icons} of info) {
    const regular = icons.filter(i => !i.sm), small = icons.filter(i => i.sm);
    check(regular.every(i => i.w === '24px' && i.h === '24px' && i.sw === '2px' && i.va === 'middle'), `${area}: 일반 아이콘 계산 스타일 ${JSON.stringify(regular)}`);
    check(small.length === 1 && small[0].w === '16px' && small[0].h === '16px', `${area}: 작은 아이콘 ${JSON.stringify(small)}`);
    check(icons.filter(i => i.labelled).length === 1 && icons.filter(i => i.hidden === 'true').length === icons.length - 1, `${area}: 접근 이름·장식 구분 ${JSON.stringify(icons.map(i => [i.hidden, i.labelled]))}`);
  }
  report('icon.computed', info.map(i => `${i.area}: ${i.icons[0].w} stroke ${i.icons[0].sw} small ${i.icons.find(x => x.sm)?.w}`));
  await p.screenshot({path: resolve(out, 'foundations-icon-areas.png'), fullPage: true});
  await close();
}

await browser.close();
writeFileSync(resolve(out, 'render-check.out.txt'), `${notes.join('\n')}\n${failures.length ? `FAIL\n${failures.join('\n')}` : 'ALL CHECKS PASSED'}\n`);
console.log(notes.join('\n'));
if (failures.length) { console.error(`FAIL (${failures.length})\n${failures.join('\n')}`); process.exit(1); }
console.log('ALL CHECKS PASSED');
