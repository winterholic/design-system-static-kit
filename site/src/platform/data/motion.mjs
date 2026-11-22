/**
 * 모션 프리셋(테마·기타 재료 작업 소유). 시간(duration)과 곡선(easing), 그리고 그 값이 어느 상태 전이에 쓰이는지를 한 묶음으로 둔다.
 *
 * - duration은 fast(호버·눌림·포커스)·base(펼침·선택·등장)·slow(화면 전환·퇴장) 세 칸이다. easing은 standard(상태 변화)·enter(등장)·exit(퇴장) 세 곡선이다.
 * - 쓰임(transitions)은 상태 전이마다 어느 속성을 어느 칸으로 움직이는지 적는다. 움직임으로만 알리는 상태는 없다: 모든 전이에는 색·모양 변화가 함께 있다(R-state).
 * - 모든 프리셋은 `prefers-reduced-motion: reduce`에서 전이를 거의 0으로 줄인다(`still`은 처음부터 0).
 * - 기존 축 `motion`(none·subtle·lively, src/styles/base.mjs MOTION)의 변수 `--kit-dur`·`--kit-ease`·`--kit-lift`도 함께 맞춰, 기존 부품 CSS가 같은 값을 읽게 한다.
 */
import {MOTION} from '../../styles/base.mjs';
import {defineStyleMaterial, verifiedBy, validateStyleMaterialShape} from './surfaces.mjs';

export const MOTION_STATES = Object.freeze(['hover', 'press', 'focus', 'select', 'enter', 'exit', 'expand', 'loading', 'success', 'error']);
const bez = (a, b, c, d) => [a, b, c, d];
const use = (state, props, duration, easing) => ({state, props, duration, easing});

const EVIDENCE = ['tests/platform-style-materials.test.mjs:36', 'tests/platform-style-materials.test.mjs:53', 'tests/platform-style-materials.test.mjs:73'];

export const MOTIONS = Object.freeze([
  defineStyleMaterial({
    id: 'motion:calm', kind: 'motion', label: '차분한 전환', contexts: ['any'], tags: ['subtle', 'default'],
    axes: {motion: 'subtle'}, uses: {motion: ['subtle']},
    duration: {fast: 120, base: 160, slow: 240}, easing: {standard: bez(.2, 0, 0, 1), enter: bez(0, 0, .2, 1), exit: bez(.4, 0, 1, 1)}, lift: '-1px', enterY: '4px',
    transitions: [
      use('hover', ['background-color', 'box-shadow', 'transform'], 'fast', 'standard'), use('press', ['transform'], 'fast', 'standard'), use('focus', ['outline-color'], 'fast', 'standard'),
      use('select', ['background-color', 'border-color'], 'base', 'standard'), use('enter', ['opacity', 'transform'], 'base', 'enter'), use('exit', ['opacity'], 'base', 'exit'),
      use('expand', ['grid-template-rows', 'opacity'], 'base', 'standard'), use('loading', ['opacity'], 'slow', 'standard'), use('success', ['opacity', 'transform'], 'base', 'enter'), use('error', ['border-color', 'background-color'], 'base', 'standard'),
    ],
    keyframes: ['enter', 'exit', 'shimmer', 'spin', 'pop'], reuses: ['axis:motion'],
  }),
  defineStyleMaterial({
    id: 'motion:snappy', kind: 'motion', label: '빠른 업무 전환', contexts: ['dashboard', 'data', 'listing', 'settings', 'docs', 'form', 'community'], tags: ['dense', 'work'],
    axes: {motion: 'subtle'}, uses: {motion: ['subtle']},
    duration: {fast: 80, base: 120, slow: 180}, easing: {standard: bez(.3, 0, .1, 1), enter: bez(.1, .9, .2, 1), exit: bez(.5, 0, 1, 1)}, lift: '0px', enterY: '2px',
    transitions: [
      use('hover', ['background-color', 'border-color'], 'fast', 'standard'), use('press', ['background-color'], 'fast', 'standard'), use('focus', ['outline-color'], 'fast', 'standard'),
      use('select', ['background-color'], 'fast', 'standard'), use('enter', ['opacity'], 'base', 'enter'), use('exit', ['opacity'], 'fast', 'exit'),
      use('expand', ['grid-template-rows'], 'base', 'standard'), use('loading', ['opacity'], 'slow', 'standard'), use('success', ['opacity'], 'base', 'enter'), use('error', ['border-color'], 'fast', 'standard'),
    ],
    keyframes: ['enter', 'exit', 'shimmer', 'spin', 'pop'], reuses: ['axis:motion'],
  }),
  defineStyleMaterial({
    id: 'motion:expressive', kind: 'motion', label: '탄력 있는 등장', contexts: ['landing', 'pricing', 'portfolio', 'commerce', 'blog', 'community', 'dashboard', 'listing', 'general'], tags: ['lively', 'brand'],
    axes: {motion: 'lively'}, uses: {motion: ['lively']},
    duration: {fast: 160, base: 260, slow: 420}, easing: {standard: bez(.2, 0, 0, 1), enter: bez(.34, 1.4, .64, 1), exit: bez(.3, 0, .8, .15)}, lift: '-4px', enterY: '12px',
    transitions: [
      use('hover', ['background-color', 'box-shadow', 'transform'], 'fast', 'standard'), use('press', ['transform'], 'fast', 'standard'), use('focus', ['outline-color'], 'fast', 'standard'),
      use('select', ['background-color', 'transform'], 'base', 'enter'), use('enter', ['opacity', 'transform'], 'slow', 'enter'), use('exit', ['opacity', 'transform'], 'base', 'exit'),
      use('expand', ['grid-template-rows', 'opacity'], 'base', 'enter'), use('loading', ['opacity'], 'slow', 'standard'), use('success', ['opacity', 'transform'], 'slow', 'enter'), use('error', ['border-color', 'background-color'], 'base', 'standard'),
    ],
    keyframes: ['enter', 'exit', 'shimmer', 'spin', 'pop'], reuses: ['axis:motion'],
  }),
  defineStyleMaterial({
    id: 'motion:still', kind: 'motion', label: '움직임 없음', contexts: ['any'], tags: ['none', 'civic', 'read', 'a11y'],
    axes: {motion: 'none'}, uses: {motion: ['none']},
    duration: {fast: 0, base: 0, slow: 0}, easing: {standard: bez(0, 0, 1, 1), enter: bez(0, 0, 1, 1), exit: bez(0, 0, 1, 1)}, lift: '0px', enterY: '0px',
    transitions: [
      use('hover', ['background-color'], 'fast', 'standard'), use('press', ['background-color'], 'fast', 'standard'), use('focus', ['outline-color'], 'fast', 'standard'),
      use('select', ['background-color'], 'fast', 'standard'), use('enter', ['opacity'], 'fast', 'enter'), use('exit', ['opacity'], 'fast', 'exit'),
      use('expand', ['grid-template-rows'], 'fast', 'standard'), use('loading', ['opacity'], 'fast', 'standard'), use('success', ['opacity'], 'fast', 'enter'), use('error', ['border-color'], 'fast', 'standard'),
    ],
    keyframes: [], reuses: ['axis:motion'],
  }),
].map(verifiedBy(EVIDENCE)));

const bezier = b => `cubic-bezier(${b.join(',')})`;
const name = m => m.id.slice('motion:'.length);

/** 모션 프리셋 의미 검사: 세 칸·세 곡선이 모두 있고 곡선은 x가 0~1, 전이는 모든 상태를 덮으며 duration 칸·easing 이름이 있다. */
export function validateMotion(m) {
  const out = validateStyleMaterialShape(m);
  if (out.length) return out;
  const err = (code, path, message) => out.push({code, path, message});
  for (const k of ['fast', 'base', 'slow']) if (!Number.isInteger(m.duration[k]) || m.duration[k] < 0 || m.duration[k] > 1000) err('P_MOTION_DURATION', `$.duration.${k}`, `${k}는 0~1000ms 정수입니다`);
  if (m.duration.fast > m.duration.base || m.duration.base > m.duration.slow) err('P_MOTION_ORDER', '$.duration', 'fast ≤ base ≤ slow 순서여야 합니다');
  for (const k of ['standard', 'enter', 'exit']) {
    const b = m.easing[k];
    if (!Array.isArray(b) || b.length !== 4 || b.some(x => typeof x !== 'number') || b[0] < 0 || b[0] > 1 || b[2] < 0 || b[2] > 1) err('P_MOTION_EASING', `$.easing.${k}`, `${k}는 x가 0~1인 cubic-bezier 숫자 4개입니다`);
  }
  const states = new Set(m.transitions.map(t => t.state));
  for (const s of MOTION_STATES) if (!states.has(s)) err('P_MOTION_STATE', '$.transitions', `상태 전이 ${s}의 쓰임이 없습니다`);
  m.transitions.forEach((t, i) => {
    if (!MOTION_STATES.includes(t.state)) err('P_MOTION_STATE', `$.transitions[${i}].state`, `모르는 상태: ${t.state}`);
    if (!Object.hasOwn(m.duration, t.duration)) err('P_MOTION_USE', `$.transitions[${i}].duration`, `duration 칸은 fast·base·slow입니다: ${t.duration}`);
    if (!Object.hasOwn(m.easing, t.easing)) err('P_MOTION_USE', `$.transitions[${i}].easing`, `easing 이름은 standard·enter·exit입니다: ${t.easing}`);
    if (!t.props?.length) err('P_MOTION_USE', `$.transitions[${i}].props`, '전이에는 움직이는 속성이 하나 이상 필요합니다');
  });
  if (!/^-?\d+px$/.test(m.lift) || !/^\d+px$/.test(m.enterY)) err('P_MOTION_LIFT', '$.lift', 'lift는 -?Npx, enterY는 Npx입니다');
  if (!m.axes.motion || !Object.hasOwn(MOTION, m.axes.motion)) err('P_MOTION_AXIS', '$.axes.motion', `기존 motion 축 값이 아닙니다: ${m.axes.motion}`);
  else {
    // 기존 축과 같은 성격이어야 한다: none은 시간·이동이 모두 0, 그 밖은 base가 0보다 크고 lively만 기존 축의 이동량을 따른다.
    const zero = m.duration.slow === 0;
    if ((m.axes.motion === 'none') !== zero) err('P_MOTION_AXIS', '$.duration', `축 ${m.axes.motion}과 duration이 맞지 않습니다`);
    if (m.axes.motion === 'lively' && m.lift !== MOTION.lively.lift) err('P_MOTION_LIFT', '$.lift', `lively의 lift는 ${MOTION.lively.lift}입니다`);
    if (m.axes.motion === 'none' && m.lift !== MOTION.none.lift) err('P_MOTION_LIFT', '$.lift', `none의 lift는 ${MOTION.none.lift}입니다`);
  }
  return out;
}

/** 키프레임 정의: 등장·퇴장·스켈레톤 반짝임·회전·성공 팝. 값은 프리셋 변수(--kit-m-*)를 읽으므로 한 번만 내면 된다. */
export const MOTION_KEYFRAMES = Object.freeze({
  enter: '@keyframes kit-m-enter{from{opacity:0;transform:translateY(var(--kit-m-enter-y))}to{opacity:1;transform:none}}',
  exit: '@keyframes kit-m-exit{from{opacity:1;transform:none}to{opacity:0;transform:translateY(var(--kit-m-enter-y))}}',
  shimmer: '@keyframes kit-m-shimmer{from{background-position:100% 0}to{background-position:-100% 0}}',
  spin: '@keyframes kit-m-spin{to{transform:rotate(1turn)}}',
  pop: '@keyframes kit-m-pop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}',
});

/** 모션 프리셋 CSS. `[data-motion="<이름>"]`에 변수를 두고, 상태별 전이 규칙은 `data-motion-state`를 가진 요소와 기존 부품 선택자에 건다. */
export function motionCSS(m, {keyframes = true} = {}) {
  const sel = `[data-motion="${name(m)}"]`, d = k => `${m.duration[k]}ms`;
  const vars = `${sel}{--kit-m-fast:${d('fast')};--kit-m-base:${d('base')};--kit-m-slow:${d('slow')};--kit-m-ease:${bezier(m.easing.standard)};--kit-m-ease-enter:${bezier(m.easing.enter)};--kit-m-ease-exit:${bezier(m.easing.exit)};--kit-m-enter-y:${m.enterY};--kit-dur:${d('base')};--kit-ease:${bezier(m.easing.standard)};--kit-lift:${m.lift}}`;
  const trans = m.transitions.map(t => `${sel} [data-motion-state="${t.state}"]{transition:${t.props.map(p => `${p} var(--kit-m-${t.duration}) var(--kit-m-ease${t.easing === 'standard' ? '' : '-' + t.easing})`).join(',')}}`);
  const anim = m.keyframes.length ? [
    `${sel} [data-motion-state="enter"][data-entering]{animation:kit-m-enter var(--kit-m-slow) var(--kit-m-ease-enter) both}`,
    `${sel} [data-motion-state="exit"][data-leaving]{animation:kit-m-exit var(--kit-m-base) var(--kit-m-ease-exit) both}`,
    `${sel} [data-motion-state="success"][data-entering]{animation:kit-m-pop var(--kit-m-base) var(--kit-m-ease-enter) both}`,
    `${sel} [data-skeleton]{background-size:200% 100%;animation:kit-m-shimmer 1.4s linear infinite}`,
    `${sel} [data-spinner]{animation:kit-m-spin 900ms linear infinite}`,
  ] : [];
  const reduce = `@media (prefers-reduced-motion:reduce){${sel} *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`;
  const frames = keyframes ? m.keyframes.map(k => MOTION_KEYFRAMES[k]) : [];
  return [...frames, vars, ...trans, ...anim, reduce].join('\n');
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** 모션 프리셋 마크업: 상태 전이마다 그 상태를 보여 주는 칸. 움직이지 않아도 상태 이름과 모양으로 읽힌다. */
export function renderMotionSample(m) {
  return `<ul class="kit-motion-demo" data-motion="${name(m)}">${m.transitions.map(t => `<li data-motion-state="${t.state}"><span>${escapeHTML(t.state)}</span> <small>${escapeHTML(t.props.join(', '))} · ${m.duration[t.duration]}ms</small></li>`).join('')}</ul>`;
}
