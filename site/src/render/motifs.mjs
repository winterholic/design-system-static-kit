import {num} from './util.mjs';

/**
 * Subject illustrations for image slots. Every shape is drawn from token classes (see coreCSS `.kit-art`), so a motif
 * follows the palette and mode of the page, never loads an external file and never carries text that needs translating.
 * "Studio" motifs are products shot on a backdrop (one object, a contact shadow, a lit wall); "scene" motifs fill the whole frame.
 * Authoring grid for studio motifs: x -50..50, y -44..40, floor at y=40.
 */
const f = num;
const path = (d, c, x = '') => `<path d="${d}" class="${c}"${x ? ' ' + x : ''}/>`;
const rect = (x, y, w, h, c, rx = 0, x2 = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${f(rx)}"` : ''} class="${c}"${x2 ? ' ' + x2 : ''}/>`;
const circ = (x, y, r, c, x2 = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${c}"${x2 ? ' ' + x2 : ''}/>`;
const ell = (x, y, rx, ry, c, x2 = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" class="${c}"${x2 ? ' ' + x2 : ''}/>`;
const line = (x1, y1, x2, y2, c, sw = 2, ex = '') => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" class="${c}" stroke-width="${sw}"${ex ? ' ' + ex : ''}/>`;
const op = o => `fill-opacity="${o}"`;
const LIGHT = 'a-hi', SHADE = 'a-sh';
/** stroke class for a fill class: a-1 -> k1, a-c3 -> kc3 */
const K = c => 'k' + c.slice(2);

/** body/trim tone pairs by variant, so six cards with the same motif still read as different products. */
const TONES = [['a-1', 'a-5'], ['a-2', 'a-3'], ['a-c3', 'a-5'], ['a-c2', 'a-1'], ['a-c4', 'a-3'], ['a-3', 'a-2']];
/** Lowest drawn y of each studio motif (default 40); the studio lowers short objects onto the floor. */
const REST = {laptop: 23, camera: 32, headphones: 30, watch: 42, desklamp: 38, jar: 36, mug: 36, candle: 38, shirt: 38, speaker: 38, sneaker: 30, orb: 38, bag: 38, books: 38, bottle: 38, vase: 38, plant: 40, chair: 40, lamp: 38, floorlamp: 38};

export function studio(w, h, id, v, draw, opt = {}) {
  const s = Math.min(h * .7 / 84, w * .54 / 84) * (opt.fit ?? 1);
  const cx = w / 2, cy = h * .5 + (opt.dy ?? 0) * s, fl = cy + 40 * s, hor = fl - (opt.horizon ?? 9) * s;
  const wall = [['sc', 'ss'], ['sa', 'ss'], ['ss', 'su']][v % 3];
  const [b, t] = TONES[v % TONES.length];
  const defs = `<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="${wall[0]}"/><stop offset="1" class="${wall[1]}"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="su"/><stop offset="1" class="ss"/></linearGradient><radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" class="sx" stop-opacity=".95"/><stop offset="1" class="sx" stop-opacity="0"/></radialGradient></defs>`;
  const out = [defs, `<rect width="${f(w)}" height="${f(h)}" fill="url(#${id}w)"/>`,
    `<circle cx="${f(cx)}" cy="${f(cy - 4 * s)}" r="${f(Math.min(w, h * 1.1) * .46)}" fill="url(#${id}s)"/>`,
    `<rect y="${f(hor)}" width="${f(w)}" height="${f(h - hor + 1)}" fill="url(#${id}f)"/>`, `<path d="M0 ${f(hor)}H${f(w)}" class="k5" stroke-width="1.5" opacity=".8"/>`,
    ell(cx, fl, 34 * s * (opt.shadow ?? 1), 5.6 * s, SHADE, op(.5)), ell(cx, fl, 24 * s * (opt.shadow ?? 1), 3.2 * s, SHADE),
    `<g transform="translate(${f(cx)} ${f(cy + (40 - (opt.rest ?? 40)) * s)}) scale(${f(s)})">${draw({b, t, id, v, g: `url(#${id}s)`})}</g>`];
  return out.join('');
}

const studios = {
  lamp: ({b, g}) => [circ(0, -20, 42, 'a-0', `fill="${g}"`), path('M-22 -6L-36 38H36L22 -6Z', LIGHT, op(.2)), rect(-2.2, -8, 4.4, 46, 'a-3'), ell(0, 38, 16, 3.4, 'a-3'),
    path('M-24 -8L-13 -42H13L24 -8Q0 -1 -24 -8Z', b), path('M3 -42H13L24 -8Q14 -5 3 -6Z', SHADE), ell(0, -42, 13, 2.4, LIGHT), path('M-24 -8Q0 -1 24 -8', 'k5', 'stroke-width="1.5" opacity=".7"')].join(''),
  desklamp: ({b, t}) => [ell(0, 37, 20, 3.6, 'a-3'), rect(-20, 33, 40, 5, 'a-3', 2), path('M-2 34L-18 2L-10 -20', 'k3', 'stroke-width="3.4"'), circ(-18, 2, 3.2, t), circ(-10, -20, 3, t),
    path('M-20 -20L-4 -14L8 -40L-8 -46Z', b, ''), path('M-4 -14L8 -40L2 -42L-8 -18Z', SHADE), path('M-14 -17L-30 14L-4 6Z', LIGHT, op(.22))].join(''),
  floorlamp: ({b}) => [circ(0, -24, 40, 'a-0', 'fill="url(#GL)"'), ell(0, 38, 14, 3, 'a-3'), rect(-12, 34, 24, 4, 'a-3', 2), rect(-1.8, -22, 3.6, 58, 'a-3'),
    path('M-18 -22C-18 -40 -9 -44 0 -44C9 -44 18 -40 18 -22Z', b), path('M2 -43C12 -41 18 -37 18 -22H5Z', SHADE), path('M-18 -22H18', 'k5', 'stroke-width="1.5" opacity=".7"'), path('M-14 -21L-26 38H26L14 -21Z', LIGHT, op(.1))].join(''),
  orb: ({b, g}) => [circ(0, -4, 44, 'a-0', `fill="${g}"`), path('M-18 38C-18 32 -12 28 0 28S18 32 18 38Z', 'a-3'), circ(0, -2, 26, b), path('M8 -26A26 26 0 0 1 10 24A26 26 0 0 0 8 -26Z', SHADE, op(.9)), ell(-7, -12, 9, 13, LIGHT, `${op(.55)} transform="rotate(24 -7 -12)"`), circ(-12, -18, 3.4, LIGHT, op(.9))].join(''),
  candle: ({b, t, g}) => [circ(0, -14, 34, 'a-0', `fill="${g}"`), rect(-16, -6, 32, 44, 'a-5 bd', 6), rect(8, -6, 8, 44, SHADE, 0, op(.9)), path('M-16 6H16', 'k4', 'stroke-width="1" opacity=".35"'), ell(0, -6, 16, 3, t), ell(0, -5, 12.5, 2.2, b),
    rect(-10, 12, 20, 16, b, 3), line(-6, 17, 6, 17, 'k5', 1.6, 'opacity=".9"'), line(-6, 22, 3, 22, 'k5', 1.6, 'opacity=".7"'), rect(-0.9, -17, 1.8, 11, 'a-3'), path('M0 -35C-6 -28 -5 -21 0 -18C5 -21 6 -28 0 -35Z', 'a-wm'), path('M0 -28C-2 -25 -2 -22 0 -20C2 -22 2 -25 0 -28Z', 'a-hi', op(.9))].join(''),
  mug: ({b, t}) => [path('M18 -4C34 -6 38 12 28 22C24 26 20 26 16 25', K(b), 'stroke-width="5"'), path('M-19 -16H19V22C19 32 11 36 0 36S-19 32 -19 22Z', b), path('M7 -16H19V22C19 29 15 33 9 35Z', SHADE), ell(0, -16, 19, 4.4, 'a-5'), ell(0, -15.4, 16, 3.2, t),
    path('M-12 -8V22', 'k5', 'stroke-width="2.4" opacity=".55"'), path('M-4 -26C-9 -31 0 -35 -4 -42', 'k4', 'stroke-width="2" opacity=".5"'), path('M6 -26C1 -32 10 -35 6 -41', 'k4', 'stroke-width="2" opacity=".35"')].join(''),
  bottle: ({b, t}) => [rect(-6, -22, 12, 10, 'a-3', 1.5), path('M-4 -22V-34C-4 -42 4 -42 4 -34V-22Z', 'a-3'), rect(-14, -12, 28, 50, b, 7), rect(5, -12, 9, 50, SHADE, 5), rect(-10, 4, 20, 26, 'a-5', 2.5), rect(-7, 9, 14, 2.4, 'a-3', 1), rect(-7, 15, 10, 2, 'a-4', 1), rect(-7, 20, 12, 2, 'a-4', 1), path('M-10 -6V0', 'k5', 'stroke-width="2.4" opacity=".6"')].join(''),
  jar: ({b, t}) => [rect(-23, -2, 46, 38, 'a-5 bd', 6), rect(9, -2, 14, 38, SHADE, 6), rect(-26, -16, 52, 16, b, 4), rect(10, -16, 16, 16, SHADE, 4), path('M-26 -9H26', 'k5', 'stroke-width="1" opacity=".5"'), rect(-14, 10, 28, 14, t, 3), line(-8, 17, 8, 17, 'k5', 1.6, 'opacity=".85"'), path('M-18 2V8', 'k5', 'stroke-width="2.4" opacity=".7"')].join(''),
  bag: ({b, t}) => [path('M-14 -14C-14 -38 14 -38 14 -14', 'k3', 'stroke-width="3.6"'), path('M-27 -14H27L32 38H-32Z', b), path('M7 -14H27L32 38H7Z', SHADE), path('M-27 -14H27', 'k5', 'stroke-width="1.5" opacity=".6"'), rect(-17, 6, 34, 20, t, 3), line(-10, 16, 10, 16, 'k3', 1.6, 'opacity=".5"'), circ(0, -6, 2.4, 'a-3')].join(''),
  chair: ({b, t}) => [path('M-24 4L-20 -32C-20 -38 -14 -40 -8 -40H8C14 -40 20 -38 20 -32L24 4Z', b), path('M6 -40H8C14 -40 20 -38 20 -32L24 4H6Z', SHADE), path('M-30 4H30C34 4 36 8 36 12V18H-36V12C-36 8 -34 4 -30 4Z', t === 'a-3' ? 'a-4' : t), path('M8 4H30C34 4 36 8 36 12V18H8Z', SHADE), line(-28, 18, -32, 40, 'k3', 3.6), line(28, 18, 32, 40, 'k3', 3.6), line(-14, 18, -15, 38, 'k3', 3, 'opacity=".6"')].join(''),
  plant: ({b}) => [path('M0 10C-18 2 -20 -22 -4 -36C-2 -22 4 -12 0 10Z', 'a-gr'), path('M0 10C16 2 20 -20 6 -34C0 -20 -4 -10 0 10Z', 'a-gr', 'opacity=".78"'), path('M0 12C-24 8 -34 -8 -26 -22C-14 -14 -6 -4 0 12Z', 'a-gr', 'opacity=".9"'), path('M0 12C22 10 34 -4 28 -20C16 -12 6 -2 0 12Z', 'a-gr', 'opacity=".65"'), path('M0 12C-2 -6 0 -22 2 -42', 'k3', 'stroke-width="1.4" opacity=".4"'),
    path('M-18 10H18L13 38C13 40 12 40 10 40H-10C-12 40 -13 40 -13 38Z', b), path('M4 10H18L13 38C13 40 12 40 10 40H4Z', SHADE), rect(-20, 6, 40, 6.4, b, 2.4), rect(4, 6, 16, 6.4, SHADE, 2.4)].join(''),
  books: ({b, t}) => [rect(-34, 22, 68, 16, b, 2), line(-26, 22, -26, 38, 'k5', 1.4, 'opacity=".6"'), line(-22, 22, -22, 38, 'k5', 1.4, 'opacity=".4"'), rect(-30, 6, 60, 16, 'a-c4', 2), line(18, 6, 18, 22, 'k5', 1.4, 'opacity=".6"'), rect(-36, -10, 62, 16, t === 'a-5' ? 'a-2' : t, 2), line(-28, -10, -28, 6, 'k5', 1.4, 'opacity=".6"'), line(-24, -10, -24, 6, 'k5', 1.4, 'opacity=".4"'),
    rect(-22, -20, 32, 10, 'a-5', 2), line(-16, -15, 4, -15, 'k4', 1.4, 'opacity=".6"'), rect(20, 22, 14, 16, SHADE, 2)].join(''),
  headphones: ({b}) => [path('M-30 6C-30 -34 30 -34 30 6', 'k3', 'stroke-width="5.4"'), rect(-38, -2, 18, 32, b, 8), rect(20, -2, 18, 32, b, 8), rect(-22, 2, 6, 24, 'a-3', 3), rect(16, 2, 6, 24, 'a-3', 3), rect(28, -2, 10, 32, SHADE, 8), rect(-29, 6, 4, 14, LIGHT, 2, op(.6))].join(''),
  sneaker: ({b, t}) => [path('M-42 12V-6C-42 -12 -38 -14 -33 -14H-27C-22 -14 -19 -10 -15 -5L-8 -2C2 0 14 3 26 7C36 10 44 11 44 18V22H-42Z', b), path('M-14 -4L-8 -2C2 0 14 3 26 7C36 10 44 11 44 18H10C4 8 -6 0 -14 -4Z', SHADE), path('M-33 -14H-27C-22 -14 -19 -10 -16 -6L-24 -3L-33 -6Z', 'a-3', 'opacity=".55"'), path('M-44 16H44C46 16 47 18 46 22C45 28 42 30 38 30H-38C-42 30 -45 27 -45 23Z', 'a-5'), path('M-44 16H46', 'k4', 'stroke-width="1.2" opacity=".35"'), path('M-44 27H44', 'k4', 'stroke-width="2" opacity=".4"'), path('M-12 -2L-8 -9M-5 0L-1 -7M2 2L6 -5M9 4L13 -3', 'k5', 'stroke-width="2.4"'), path('M-30 6C-20 10 -6 8 6 2', t === 'a-3' ? 'k2' : 'k3', 'stroke-width="3"'), path('M30 8C36 9 40 11 42 14', 'k5', 'stroke-width="1.6" opacity=".6"')].join(''),
  watch: ({b, t}) => [rect(-9, -42, 18, 30, 'a-3', 4), rect(-9, 12, 18, 30, 'a-3', 4), rect(-9, -42, 18, 30, SHADE, 4, op(.0)), circ(0, 0, 25, 'a-4'), circ(0, 0, 23, b), circ(0, 0, 18.4, 'a-5'), circ(0, 0, 18.4, SHADE, op(.35)), path('M0 -13V0L9 5', 'k3', 'stroke-width="2.6"'), circ(0, 0, 2.2, 'a-1'),
    ...[0, 90, 180, 270].map(a => `<path d="M0 -16.6V-14.4" class="k3" stroke-width="1.6" transform="rotate(${a})"/>`), rect(23, -3, 5, 6, 'a-4', 1.4)].join(''),
  vase: ({b, t}) => [path('M-2 -20C-2 -32 -10 -36 -16 -42', 'kg', 'stroke-width="2"'), path('M2 -20C2 -30 10 -34 14 -40', 'kg', 'stroke-width="2"'), path('M0 -20C0 -32 0 -38 -2 -44', 'kg', 'stroke-width="2"'), circ(-16, -43, 5.4, 'a-2'), circ(14, -41, 5, 'a-c4'), circ(-2, -45, 4.6, 'a-1'), circ(-16, -43, 1.8, 'a-wm'),
    path('M-9 -24H9C9 -14 22 -6 22 14C22 28 16 38 0 38S-22 28 -22 14C-22 -6 -9 -14 -9 -24Z', b), path('M3 -24H9C9 -14 22 -6 22 14C22 28 16 38 0 38H3C13 34 14 22 14 10C14 -8 3 -14 3 -24Z', SHADE), ell(0, -24, 9, 2, t), path('M-14 4C-14 -4 -10 -8 -8 -12', 'k5', 'stroke-width="2.4" opacity=".5"')].join(''),
  shirt: ({b, t}) => [path('M-14 -34L-38 -20L-30 -4L-20 -10V38H20V-10L30 -4L38 -20L14 -34C8 -26 -8 -26 -14 -34Z', b), path('M4 -30L14 -34L38 -20L30 -4L20 -10V38H4Z', SHADE), path('M-14 -34C-8 -26 8 -26 14 -34', 'k5', 'stroke-width="2.6" opacity=".7"'), path('M-14 -34C-8 -22 8 -22 14 -34', 'k4', 'stroke-width="1" opacity=".4"'), rect(-9, 8, 18, 12, t, 2, op(.9)), path('M-20 34H20', 'k5', 'stroke-width="1.5" opacity=".55"')].join(''),
  speaker: ({b, t}) => [rect(-22, -38, 44, 76, b, 9), rect(8, -38, 14, 76, SHADE, 9), circ(0, -20, 7, 'a-3'), circ(0, -20, 3, 'a-4'), circ(0, 12, 15.4, 'a-3'), circ(0, 12, 12, 'k5', 'fill="none" stroke-width="1.4" opacity=".5"'), circ(0, 12, 7.4, 'k5', 'fill="none" stroke-width="1.4" opacity=".4"'), circ(0, 12, 3.4, 'a-4'), circ(-4, 8, 3, LIGHT, op(.5)), rect(-6, 31, 12, 2.4, 'a-5', 1.2, 'opacity=".6"')].join(''),
  camera: ({b, t}) => [path('M-30 -10L-24 -22H-6L-2 -16H16L22 -10', 'a-3'), rect(-34, -12, 68, 44, 'a-3', 7), rect(-34, -12, 68, 14, b, 7), rect(-34, -4, 68, 6, b), rect(10, -12, 24, 44, SHADE, 7, op(.5)), circ(-1, 12, 17, 'a-4'), circ(-1, 12, 14.4, 'a-5'), circ(-1, 12, 11, 'a-3'), circ(-1, 12, 6, 'a-1'), circ(-4, 9, 2.4, LIGHT, op(.8)), rect(-27, -19, 8, 6, 'a-4', 1.6), circ(24, -3, 2.2, 'a-wm')].join(''),
  laptop: ({b, t}) => [rect(-31, -34, 62, 42, 'a-3', 4), rect(-28, -31, 56, 36, 'a-5', 2), rect(-28, -31, 56, 36, 'a-ac', 2, op(.9)), rect(-23, -26, 20, 4, b, 1.6), rect(-23, -19, 30, 3, 'a-4', 1.4, 'opacity=".5"'), rect(-23, -13, 24, 3, 'a-4', 1.4, 'opacity=".5"'), rect(10, -26, 14, 26, b, 3, 'opacity=".85"'), rect(-23, -6, 18, 7, 'a-5', 2), path('M-38 10H38L44 20C44 22 43 23 41 23H-41C-43 23 -44 22 -44 20Z', 'a-4'), path('M-38 10H38L44 20H-44Z', 'a-hi', op(.3)), rect(-8, 12, 16, 2.4, 'a-3', 1.2, 'opacity=".4"'), rect(-2, -8, 4, 3, 'a-3', 1.5, 'opacity=".0"')].join(''),
};

/** Quiet backdrop for flat editorial pieces: deeper than the page so white cards keep their edge. */
const wash = (w, h, id) => `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="su"/><stop offset="1" class="ss"/></linearGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}b)"/>`;

/** Whole-frame scenes (no studio backdrop). `s` = unit of the shorter side / 100. */
const sky = (w, h, id, top = 'sa', bot = 'sc') => `<defs><linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="${top}"/><stop offset="1" class="${bot}"/></linearGradient><radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" class="sx" stop-opacity=".95"/><stop offset="1" class="sx" stop-opacity="0"/></radialGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`;

/** Top-down dish on a table: 0 steak plate, 1 noodle bowl, 2 pan-fried platter, 3 bibimbap, 4 stew pot. Token classes only. */
function dish(w, h, id, k) {
  const cx = w * .5, cy = h * .52, r = Math.min(w, h) * .4;
  const base = [`<defs><radialGradient id="${id}k" cx=".5" cy=".45" r=".7"><stop offset="0" class="sc"/><stop offset="1" class="su"/></radialGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`, ell(cx + r * .06, cy + r * .1, r * 1.05, r * 1.05, SHADE, op(.6))];
  const sticks = [0, 1].map(i => path(`M${f(cx + r * (1.05 + i * .1))} ${f(cy + r * .95)}L${f(cx + r * (1.6 + i * .12))} ${f(cy - r * .5)}`, 'k3', `stroke-width="${f(r * .05)}" opacity=".75"`));
  const wedge = (a0, a1, rr, c, o = 1) => { const p = a => `${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`; return path(`M${f(cx)} ${f(cy)}L${p(a0)}A${f(rr)} ${f(rr)} 0 0 1 ${p(a1)}Z`, c, `opacity="${o}"`); };
  if (k === 1) {
    const swirl = [.18, .34, .5, .64].map((q, i) => circ(cx - r * .04, cy + r * .02, r * q, 'kw', `fill="none" stroke-width="${f(r * .07)}" stroke-linecap="round" opacity="${f(.9 - i * .1)}" stroke-dasharray="${f(r * (1.1 + i * .35))} ${f(r * .16)}"`));
    return [...base, circ(cx, cy, r * .96, 'a-3'), circ(cx, cy, r * .88, 'a-5'), circ(cx, cy, r * .72, 'a-wm', 'opacity=".55"'), ...swirl, circ(cx + r * .3, cy - r * .22, r * .2, 'a-5'), circ(cx + r * .3, cy - r * .22, r * .09, 'a-wm'), ...[[-.35, -.32], [-.1, -.5], [.05, .38], [-.4, .22], [.45, .16]].map(([x, y], i) => rect(cx + r * x, cy + r * y, r * .16, r * .05, 'a-gr', r * .025, `transform="rotate(${i * 37} ${f(cx + r * x)} ${f(cy + r * y)})"`)), ...sticks].join('');
  }
  if (k === 2) {
    const discs = [[-.42, -.28], [.0, -.5], [.42, -.26], [-.38, .22], [.04, .02], [.44, .26], [-.02, .52]];
    return [...base, circ(cx, cy, r, 'a-5'), circ(cx, cy, r * .86, 'a-6', 'opacity=".6"'), ...discs.flatMap(([x, y], i) => [circ(cx + r * x, cy + r * y + r * .03, r * .26, SHADE, op(.5)), circ(cx + r * x, cy + r * y, r * .26, i % 2 ? 'a-wm' : 'a-c4'), circ(cx + r * x, cy + r * y, r * .2, 'a-wm', 'opacity=".7"'), circ(cx + r * x - r * .06, cy + r * y - r * .06, r * .06, LIGHT, op(.5))]), circ(cx + r * 1.12, cy + r * .5, r * .26, 'a-3'), circ(cx + r * 1.12, cy + r * .5, r * .18, 'a-c5'), ...sticks].join('');
  }
  if (k === 3) {
    const cols = ['a-gr', 'a-c4', 'a-wm', 'a-2', 'a-gr', 'a-c3'], n = cols.length;
    return [...base, circ(cx, cy, r * .98, 'a-3'), circ(cx, cy, r * .9, 'a-5'), ...cols.map((c, i) => wedge(-Math.PI / 2 + i * 2 * Math.PI / n + .03, -Math.PI / 2 + (i + 1) * 2 * Math.PI / n - .03, r * .8, c, .85)), circ(cx, cy, r * .26, 'a-5'), circ(cx, cy, r * .13, 'a-wm'), circ(cx - r * .04, cy - r * .05, r * .04, LIGHT, op(.6)), ...sticks].join('');
  }
  if (k === 4) {
    return [...base, circ(cx, cy, r * .98, 'a-3'), circ(cx, cy, r * .9, 'a-4'), circ(cx, cy, r * .8, 'a-2', 'opacity=".8"'), circ(cx, cy, r * .8, SHADE, op(.18)), ...[[-.3, -.26], [.1, -.36], [.34, .02], [-.12, .22], [.2, .38]].map(([x, y], i) => rect(cx + r * x, cy + r * y, r * .26, r * .22, 'a-5', r * .04, `transform="rotate(${i * 21} ${f(cx + r * x)} ${f(cy + r * y)})"`)), ...[[-.42, .14], [.46, -.22], [-.06, -.52], [.34, .44]].map(([x, y]) => circ(cx + r * x, cy + r * y, r * .1, 'a-gr')), circ(cx - r * .02, cy + r * .04, r * .08, 'a-wm'), ...sticks].join('');
  }
  return [...base, circ(cx, cy, r, 'a-5'), circ(cx, cy, r * .78, 'a-6'), circ(cx, cy, r * .74, 'a-5'),
    circ(cx - r * .14, cy - r * .06, r * .38, 'a-c4'), circ(cx - r * .14, cy - r * .06, r * .3, 'a-wm', 'opacity=".75"'), circ(cx - r * .2, cy - r * .12, r * .1, LIGHT, op(.6)),
    path(`M${f(cx + r * .08)} ${f(cy + r * .08)}C${f(cx + r * .3)} ${f(cy - r * .28)} ${f(cx + r * .52)} ${f(cy - r * .1)} ${f(cx + r * .4)} ${f(cy + r * .22)}C${f(cx + r * .3)} ${f(cy + r * .4)} ${f(cx + r * .1)} ${f(cy + r * .3)} ${f(cx + r * .08)} ${f(cy + r * .08)}Z`, 'a-gr', 'opacity=".85"'), circ(cx + r * .22, cy + r * .32, r * .13, 'a-2'), circ(cx - r * .3, cy + r * .3, r * .1, 'a-gr', 'opacity=".8"'), ...sticks].join('');
}

const scenes = {
  coast: (w, h, id, v) => {
    const sx = w * [.7, .3, .55][v % 3], sy = h * .3, hz = h * .56;
    return [sky(w, h, id, 'sa', 'sc'), circ(sx, sy, h * .3, 'a-0', `fill="url(#${id}g)"`), circ(sx, sy, h * .1, 'a-wm'), circ(sx - h * .025, sy - h * .025, h * .035, LIGHT, op(.6)),
      path(`M0 ${f(hz)}H${f(w)}V${f(h)}H0Z`, 'a-c3', 'opacity=".55"'), ...[0, 1, 2, 3].map(i => path(`M0 ${f(hz + h * (.08 + i * .1))}Q${f(w * .25)} ${f(hz + h * (.04 + i * .1))} ${f(w * .5)} ${f(hz + h * (.08 + i * .1))}T${f(w)} ${f(hz + h * (.08 + i * .1))}V${f(h)}H0Z`, i % 2 ? 'a-c3' : 'a-1', `opacity="${[.35, .5, .6, .8][i]}"`)),
      path(`M${f(w * .46)} ${f(hz - h * .02)}L${f(w * .46)} ${f(hz - h * .22)}L${f(w * .58)} ${f(hz - h * .04)}Z`, 'a-5'), path(`M${f(w * .44)} ${f(hz - h * .02)}H${f(w * .6)}L${f(w * .57)} ${f(hz + h * .035)}H${f(w * .47)}Z`, 'a-3'),
      path(`M0 ${f(hz)}C${f(w * .08)} ${f(hz - h * .12)} ${f(w * .2)} ${f(hz - h * .14)} ${f(w * .3)} ${f(hz - h * .04)}C${f(w * .34)} ${f(hz - h * .01)} ${f(w * .4)} ${f(hz)} ${f(w * .44)} ${f(hz)}Z`, 'a-4', 'opacity=".5"')].join('');
  },
  solar: (w, h, id, v) => {
    const sx = w * .76, sy = h * .24, rows = [0, 1, 2], cols = [0, 1, 2, 3];
    const panels = rows.flatMap(r => cols.map(c => { const y0 = h * (.52 + r * .13), y1 = y0 + h * .11, tl = w * (.18 + c * .17) - r * w * .03, bl = tl - w * .02, wd = w * (.15 + r * .01); return path(`M${f(tl)} ${f(y0)}H${f(tl + wd - r * w * .004)}L${f(bl + wd + w * .01)} ${f(y1)}H${f(bl)}Z`, 'a-1', 'opacity=".92"') + path(`M${f(tl + wd * .5)} ${f(y0)}L${f(bl + wd * .5 + w * .006)} ${f(y1)}M${f((tl + bl) / 2 + wd * .02)} ${f((y0 + y1) / 2)}H${f((tl + bl) / 2 + wd * .98)}`, 'k5', 'stroke-width="1" opacity=".5"'); }));
    return [sky(w, h, id, 'sa', 'sc'), circ(sx, sy, h * .34, 'a-0', `fill="url(#${id}g)"`), circ(sx, sy, h * .12, 'a-wm'), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${f(sx)} ${f(sy - h * .17)}V${f(sy - h * .22)}" class="kw" stroke-width="2.4" transform="rotate(${i * 45} ${f(sx)} ${f(sy)})"/>`), path(`M0 ${f(h * .5)}H${f(w)}V${f(h)}H0Z`, 'a-gr', 'opacity=".28"'), ...panels, rect(0, h * .94, w, h * .06, 'a-gr', 0, 'opacity=".45"')].join('');
  },
  interior: (w, h, id, v) => {
    const fl = h * .72;
    return [`<defs><linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ss"/><stop offset="1" class="sc"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="su"/><stop offset="1" class="ss"/></linearGradient></defs>`, `<rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`, `<rect y="${f(fl)}" width="${f(w)}" height="${f(h - fl)}" fill="url(#${id}f)"/>`,
      rect(w * .08, h * .12, w * .26, h * .44, 'a-5', 3), rect(w * .1, h * .15, w * .22, h * .38, 'a-ac', 2), line(w * .21, h * .15, w * .21, h * .53, 'k5', 2.4), line(w * .1, h * .34, w * .32, h * .34, 'k5', 2.4), circ(w * .26, h * .27, h * .045, 'a-wm', 'opacity=".8"'),
      rect(w * .42, h * .3, w * .5, h * .12, 'a-3', 3), rect(w * .42, h * .4, w * .5, h * .3, 'a-5', 4), rect(w * .42, h * .5, w * .5, h * .2, 'a-1', 4), rect(w * .43, h * .5, w * .5, h * .045, LIGHT, 0, op(.5)), rect(w * .46, h * .36, w * .17, h * .1, 'a-5', 6), rect(w * .66, h * .36, w * .17, h * .1, 'a-6', 6), rect(w * .44, h * .68, w * .035, h * .06, 'a-3'), rect(w * .885, h * .68, w * .035, h * .06, 'a-3'),
      ell(w * .67, fl + h * .1, w * .34, h * .04, SHADE), path(`M${f(w * .06)} ${f(fl + h * .12)}Q${f(w * .2)} ${f(fl + h * .06)} ${f(w * .34)} ${f(fl + h * .12)}Q${f(w * .2)} ${f(fl + h * .2)} ${f(w * .06)} ${f(fl + h * .12)}Z`, 'a-2', 'opacity=".75"'),
      rect(w * .93, h * .22, w * .03, h * .5, 'a-3'), path(`M${f(w * .88)} ${f(h * .22)}L${f(w * .985)} ${f(h * .22)}L${f(w * .96)} ${f(h * .12)}H${f(w * .91)}Z`, 'a-wm', 'opacity=".9"')].join('');
  },
  building: (w, h, id, v) => {
    const g = h * .88, bs = [[.08, .3, .16, .6, 'a-1'], [.26, .16, .2, .72, 'a-3'], [.5, .34, .16, .54, 'a-2'], [.68, .22, .22, .66, 'a-5']];
    const win = (x, y, bw, bh, tone) => { const out = []; const cols = Math.max(2, Math.floor(bw / (w * .045))), rows = Math.max(3, Math.floor(bh / (h * .09))); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const lit = (r * 3 + c * 5 + v) % 5 === 0; out.push(rect(x + bw * .12 + c * (bw * .76 / cols), y + bh * .08 + r * (bh * .86 / rows), bw * .76 / cols * .62, bh * .86 / rows * .56, lit ? 'a-wm' : tone === 'a-5' ? 'a-ac' : 'a-5', 1, lit ? 'opacity=".95"' : 'opacity=".8"')); } return out.join(''); };
    return [sky(w, h, id, 'sa', 'sc'), circ(w * .84, h * .2, h * .24, 'a-0', `fill="url(#${id}g)"`), circ(w * .84, h * .2, h * .06, 'a-wm', 'opacity=".9"'), ...bs.flatMap(([x, t, bw, bh, c]) => [rect(w * x, h * t, w * bw, g - h * t, c), rect(w * x + w * bw * .72, h * t, w * bw * .28, g - h * t, SHADE), win(w * x, h * t, w * bw, g - h * t, c)]), rect(0, g, w, h - g, 'a-4', 0, 'opacity=".55"'), rect(0, g, w, h * .014, 'a-3', 0, 'opacity=".5"')].join('');
  },
  // Dishes seen from above. `food` keeps the original steak plate; the others are separate catalog motifs so a menu can name the right dish.
  food: (w, h, id) => dish(w, h, id, 0),
  noodles: (w, h, id) => dish(w, h, id, 1),
  pancakes: (w, h, id) => dish(w, h, id, 2),
  bibimbap: (w, h, id) => dish(w, h, id, 3),
  stew: (w, h, id) => dish(w, h, id, 4),
  coffee: (w, h, id, v) => {
    const cx = w * .5, cy = h * .5, r = Math.min(w, h) * .3;
    return [`<defs><radialGradient id="${id}k" cx=".5" cy=".45" r=".75"><stop offset="0" class="ss"/><stop offset="1" class="su"/></radialGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`, ell(cx + r * .1, cy + r * .12, r * 1.34, r * 1.3, SHADE, op(.6)), circ(cx, cy, r * 1.3, 'a-5'), circ(cx, cy, r * 1.08, 'a-6', 'opacity=".5"'), circ(cx, cy, r * .86, 'a-5'), circ(cx, cy, r * .74, 'a-3'), circ(cx, cy, r * .66, 'a-c4', 'opacity=".95"'), path(`M${f(cx - r * .5)} ${f(cy + r * .1)}A${f(r * .55)} ${f(r * .55)} 0 0 1 ${f(cx + r * .2)} ${f(cy - r * .5)}`, 'k5', `stroke-width="${f(r * .06)}" opacity=".6"`),
      path(`M${f(cx + r * .74)} ${f(cy - r * .14)}C${f(cx + r * 1.2)} ${f(cy - r * .18)} ${f(cx + r * 1.2)} ${f(cy + r * .3)} ${f(cx + r * .74)} ${f(cy + r * .26)}`, 'k5', `stroke-width="${f(r * .14)}"`), rect(cx + r * 1.4, cy + r * .1, r * .7, r * .08, 'a-4', r * .04, `transform="rotate(-24 ${f(cx + r * 1.4)} ${f(cy)})"`),
      circ(cx - r * 1.55, cy + r * .5, r * .5, 'a-2', 'opacity=".9"'), circ(cx - r * 1.55, cy + r * .5, r * .5, SHADE, op(.4)), path(`M${f(cx - r * 1.8)} ${f(cy + r * .4)}Q${f(cx - r * 1.55)} ${f(cy + r * .2)} ${f(cx - r * 1.3)} ${f(cy + r * .4)}`, 'k5', `stroke-width="${f(r * .05)}" opacity=".6"`)].join('');
  },
  fitness: (w, h, id, v) => {
    const s = Math.min(w, h * 1.4) / 100, cx = w * .42, cy = h * .62, fl = h * .8;
    return [`<defs><linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc"/><stop offset="1" class="ss"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="su"/><stop offset="1" class="ss"/></linearGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/><rect y="${f(fl)}" width="${f(w)}" height="${f(h - fl)}" fill="url(#${id}f)"/>`, ell(cx, fl + 4 * s, 40 * s, 4.4 * s, SHADE),
      ...[
        // 0: barbell and kettlebell
        [`<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s)}) rotate(-8)">${rect(-30, -2.4, 60, 4.8, 'a-3', 2.4)}${rect(-36, -14, 9, 28, 'a-1', 3)}${rect(-27, -10, 6, 20, 'a-3', 2)}${rect(27, -14, 9, 28, 'a-1', 3)}${rect(21, -10, 6, 20, 'a-3', 2)}${rect(-44, -9, 6, 18, 'a-1', 3)}${rect(38, -9, 6, 18, 'a-1', 3)}${rect(-36, -14, 3, 28, LIGHT, 1.5, op(.4))}${rect(27, -14, 3, 28, LIGHT, 1.5, op(.4))}</g>`,
          circ(w * .8, h * .8 - 8 * s, 13 * s, 'a-2'), path(`M${f(w * .8 - 8 * s)} ${f(h * .8 - 20 * s)}C${f(w * .8 - 8 * s)} ${f(h * .8 - 34 * s)} ${f(w * .8 + 8 * s)} ${f(h * .8 - 34 * s)} ${f(w * .8 + 8 * s)} ${f(h * .8 - 20 * s)}`, 'k3', `stroke-width="${f(4 * s)}"`), circ(w * .8 + 5 * s, h * .8 - 10 * s, 5 * s, SHADE), ell(w * .8, fl + 4 * s, 18 * s, 2.6 * s, SHADE)],
        // 1: rolled yoga mat and water bottle
        [ell(cx, fl + 4 * s, 42 * s, 4.4 * s, SHADE), rect(cx - 36 * s, cy - 6 * s, 72 * s, 26 * s, 'a-gr', 13 * s), rect(cx - 36 * s, cy - 6 * s, 72 * s, 8 * s, LIGHT, 4 * s, 'opacity=".5"'), ell(cx + 36 * s, cy + 7 * s, 8 * s, 13 * s, 'a-1'), circ(cx + 36 * s, cy + 7 * s, 8 * s, 'kg', 'fill="none" stroke-width="' + f(1.6 * s) + '"'), rect(cx - 8 * s, cy - 8 * s, 8 * s, 30 * s, 'a-3', 2 * s),
          rect(w * .8 - 8 * s, h * .8 - 42 * s, 16 * s, 44 * s, 'a-5', 6 * s), rect(w * .8 - 8 * s, h * .8 - 30 * s, 16 * s, 14 * s, 'a-c3'), rect(w * .8 - 5 * s, h * .8 - 50 * s, 10 * s, 8 * s, 'a-3', 2 * s), rect(w * .8 - 6 * s, h * .8 - 40 * s, 3 * s, 36 * s, LIGHT, 1.5 * s, 'opacity=".6"'), ell(w * .8, fl + 4 * s, 14 * s, 2.4 * s, SHADE)],
        // 2: big kettlebell, plates and a jump rope
        [ell(cx, fl + 4 * s, 34 * s, 4 * s, SHADE), circ(cx, cy + 6 * s, 26 * s, 'a-1'), path(`M${f(cx - 15 * s)} ${f(cy - 14 * s)}C${f(cx - 15 * s)} ${f(cy - 42 * s)} ${f(cx + 15 * s)} ${f(cy - 42 * s)} ${f(cx + 15 * s)} ${f(cy - 14 * s)}`, 'k3', `stroke-width="${f(7 * s)}"`), circ(cx + 9 * s, cy + 10 * s, 14 * s, SHADE, op(.25)), circ(cx - 10 * s, cy - 2 * s, 7 * s, LIGHT, 'opacity=".6"'),
          rect(w * .78 - 22 * s, h * .8 - 8 * s, 44 * s, 8 * s, 'a-3', 2 * s), rect(w * .78 - 18 * s, h * .8 - 16 * s, 36 * s, 8 * s, 'a-c4', 2 * s), rect(w * .78 - 14 * s, h * .8 - 24 * s, 28 * s, 8 * s, 'a-2', 2 * s), ell(w * .78, fl + 4 * s, 24 * s, 3 * s, SHADE),
          path(`M${f(w * .08)} ${f(fl + 2 * s)}C${f(w * .2)} ${f(fl - 18 * s)} ${f(w * .3)} ${f(fl + 14 * s)} ${f(w * .4)} ${f(fl)}`, 'k4', `stroke-width="${f(2.4 * s)}" opacity=".8"`)],
      ][v % 3].flat()].join('');
  },
  care: (w, h, id, v) => {
    const cx = w * .5, cy = h * .5, r = Math.min(w, h) * .3;
    return [`<defs><radialGradient id="${id}k" cx=".5" cy=".4" r=".8"><stop offset="0" class="sa"/><stop offset="1" class="sc"/></radialGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`, circ(cx, cy, r * 1.5, 'a-5', 'opacity=".55"'), circ(cx, cy, r * 1.1, 'a-5'), rect(cx - r * .12, cy - r * .6, r * .24, r * 1.2, 'a-1', r * .06), rect(cx - r * .6, cy - r * .12, r * 1.2, r * .24, 'a-1', r * .06),
      path(`M${f(w * .14)} ${f(h * .9)}C${f(w * .1)} ${f(h * .6)} ${f(w * .14)} ${f(h * .42)} ${f(w * .24)} ${f(h * .3)}C${f(w * .3)} ${f(h * .5)} ${f(w * .26)} ${f(h * .7)} ${f(w * .14)} ${f(h * .9)}Z`, 'a-gr', 'opacity=".85"'), path(`M${f(w * .2)} ${f(h * .9)}C${f(w * .26)} ${f(h * .72)} ${f(w * .34)} ${f(h * .64)} ${f(w * .4)} ${f(h * .6)}C${f(w * .38)} ${f(h * .76)} ${f(w * .3)} ${f(h * .86)} ${f(w * .2)} ${f(h * .9)}Z`, 'a-gr', 'opacity=".6"'),
      rect(w * .78, h * .56, w * .08, h * .22, 'a-5', w * .01), rect(w * .78, h * .52, w * .08, h * .05, 'a-2', 2), rect(w * .88, h * .62, w * .06, h * .16, 'a-5', w * .01), rect(w * .88, h * .59, w * .06, h * .04, 'a-1', 2), rect(0, h * .9, w, h * .1, 'a-6', 0, 'opacity=".7"')].join('');
  },
  museum: (w, h, id, v) => {
    const cx = w * .5, base = h * .84, colW = w * .07, top = h * .36, n = 5, span = w * .56, x0 = cx - span / 2;
    return [sky(w, h, id, 'sa', 'sc'), circ(w * .8, h * .22, h * .24, 'a-0', `fill="url(#${id}g)"`), circ(w * .8, h * .22, h * .06, 'a-wm', 'opacity=".9"'),
      path(`M${f(x0 - w * .04)} ${f(top)}L${f(cx)} ${f(h * .14)}L${f(x0 + span + w * .04)} ${f(top)}Z`, 'a-5'), path(`M${f(cx)} ${f(h * .14)}L${f(x0 + span + w * .04)} ${f(top)}H${f(cx)}Z`, SHADE), rect(x0 - w * .04, top, span + w * .08, h * .035, 'a-3'),
      ...Array.from({length: n}, (_, i) => { const x = x0 + i * (span - colW) / (n - 1); return rect(x, top + h * .035, colW, base - top - h * .035, 'a-5') + rect(x + colW * .62, top + h * .035, colW * .38, base - top - h * .035, SHADE) + rect(x - colW * .12, top + h * .035, colW * 1.24, h * .02, 'a-4', 0, 'opacity=".5"'); }),
      rect(x0 - w * .06, base, span + w * .12, h * .035, 'a-5'), rect(x0 - w * .09, base + h * .035, span + w * .18, h * .035, 'a-4', 0, 'opacity=".6"'), rect(0, base + h * .07, w, h, 'a-6', 0, 'opacity=".8"'), circ(cx, h * .26, h * .035, 'a-1')].join('');
  },
  ticket: (w, h, id, v) => {
    const cx = w * .5, cy = h * .5, tw = Math.min(w * .74, h * 1.5), th = tw * .42, x = cx - tw / 2, y = cy - th / 2, notch = th * .12;
    return [`<defs><linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="sa"/><stop offset="1" class="ss"/></linearGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`, ...[0, 1, 2, 3, 4, 5, 6].map(i => circ(w * (.1 + (i * .139) % .82), h * (.14 + ((i * 37) % 7) * .11), h * .022, ['a-1', 'a-2', 'a-c3', 'a-c4', 'a-wm', 'a-1', 'a-2'][i], 'opacity=".85"')), ...[0, 1, 2, 3, 4].map(i => rect(w * (.12 + i * .19), h * (.82 - (i % 2) * .62), h * .05, h * .014, ['a-2', 'a-c3', 'a-1', 'a-c4', 'a-wm'][i], 2, `transform="rotate(${[24, -30, 50, -14, 70][i]} ${f(w * (.12 + i * .19))} ${f(h * .5)})" opacity=".9"`)),
      `<g transform="rotate(-6 ${f(cx)} ${f(cy)})">${path(`M${f(x)} ${f(y)}H${f(x + tw * .72)}a${f(notch)} ${f(notch)} 0 0 0 ${f(notch * 2)} 0H${f(x + tw)}V${f(y + th)}H${f(x + tw * .72 + notch * 2)}a${f(notch)} ${f(notch)} 0 0 0 ${f(-notch * 2)} 0H${f(x)}Z`, 'a-1')}${rect(x + tw * .06, y + th * .16, tw * .38, th * .12, 'a-5', th * .03, 'opacity=".95"')}${rect(x + tw * .06, y + th * .38, tw * .5, th * .08, 'a-5', th * .03, 'opacity=".6"')}${rect(x + tw * .06, y + th * .56, tw * .3, th * .08, 'a-5', th * .03, 'opacity=".6"')}${path(`M${f(x + tw * .735 + notch)} ${f(y + notch * 2.2)}V${f(y + th - notch * 2.2)}`, 'k5', `stroke-width="${f(th * .016)}" stroke-dasharray="${f(th * .04)} ${f(th * .045)}" opacity=".8"`)}${circ(x + tw * .86, cy, th * .14, 'a-5', 'opacity=".95"')}${path(`M${f(x + tw * .86)} ${f(cy - th * .08)}l${f(th * .028)} ${f(th * .06)}h${f(th * .06)}l${f(-th * .05)} ${f(th * .044)}l${f(th * .02)} ${f(th * .07)}l${f(-th * .058)} ${f(-th * .042)}l${f(-th * .058)} ${f(th * .042)}l${f(th * .02)} ${f(-th * .07)}l${f(-th * .05)} ${f(-th * .044)}h${f(th * .06)}Z`, 'a-wm')}</g>`].join('');
  },
  poster: (w, h, id, v) => {
    const pw = Math.min(w * .42, h * .66), ph = pw * 1.36, cx = w * .5;
    const pal = [['a-1', 'a-2', 'a-5'], ['a-2', 'a-3', 'a-5'], ['a-c3', 'a-1', 'a-5']];
    const one = (x, y, d, rot, i) => `<g transform="rotate(${rot} ${f(x + pw / 2)} ${f(y + ph / 2)})">${rect(x + d, y + d * 1.4, pw, ph, SHADE, 2, op(.9))}${rect(x, y, pw, ph, pal[i][2], 2)}${rect(x, y, pw, ph * .62, pal[i][0], 2)}${circ(x + pw * .62, y + ph * .3, pw * .24, pal[i][1])}${rect(x, y + ph * .5, pw, ph * .12, pal[i][1], 0, 'opacity=".55"')}${rect(x + pw * .1, y + ph * .72, pw * .6, ph * .045, 'a-3', 1)}${rect(x + pw * .1, y + ph * .8, pw * .38, ph * .03, 'a-4', 1, 'opacity=".6"')}${rect(x + pw * .1, y + ph * .86, pw * .46, ph * .03, 'a-4', 1, 'opacity=".4"')}</g>`;
    return [wash(w, h, id), circ(w * .5, h * .55, h * .55, 'a-5', 'opacity=".5"'), one(cx - pw * 1.04, h * .5 - ph * .46, 3, -6, 1), one(cx - pw * .08, h * .5 - ph * .56, 4, 4, v % 2 ? 2 : 0)].join('');
  },
  package: (w, h, id, v) => {
    const s = Math.min(w, h * 1.3) / 100, cx = w / 2, cy = h * .54, fl = cy + 30 * s;
    return [`<defs><linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc"/><stop offset="1" class="ss"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="su"/><stop offset="1" class="ss"/></linearGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/><rect y="${f(fl - 4 * s)}" width="${f(w)}" height="${f(h)}" fill="url(#${id}f)"/>`, ell(cx, fl, 40 * s, 5 * s, SHADE),
      `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s)})">${path('M-30 -14L0 -26L30 -14L0 -2Z', 'a-5')}${path('M-30 -14V22L0 34V-2Z', 'a-1')}${path('M0 -2V34L30 22V-14Z', 'a-1')}${path('M0 -2V34L30 22V-14Z', SHADE)}${path('M-30 -14L0 -26L30 -14L0 -2Z', LIGHT, op(.5))}${rect(-22, 8, 16, 3, 'a-5', 1.4)}${rect(-22, 14, 10, 2.4, 'a-5', 1.2, 'opacity=".7"')}${circ(-14, -5.4, 4, 'a-2')}${path('M8 -1L24 -10', 'k5', 'stroke-width="2" opacity=".5"')}</g>`, `<g transform="translate(${f(cx + 36 * s)} ${f(fl - 18 * s)}) scale(${f(s)})">${path('M-12 -20C-12 -26 12 -26 12 -20V16C12 20 8 22 0 22S-12 20 -12 16Z', 'a-2')}${path('M2 -22C10 -22 12 -20 12 -16V16C12 20 8 22 2 22Z', SHADE)}${rect(-8, -8, 16, 14, 'a-5', 2)}</g>`].join('');
  },
  brandmark: (w, h, id, v) => {
    const cell = Math.min(w, h) * .27, gap = cell * .1, x0 = w / 2 - cell * 1.5 - gap, y0 = h / 2 - cell * 1.5 - gap;
    const c = (i, j) => [x0 + i * (cell + gap), y0 + j * (cell + gap)];
    return [wash(w, h, id), ...[[0, 0, 'a-1'], [1, 0, 'a-5'], [2, 0, 'a-3'], [0, 1, 'a-5'], [1, 1, 'a-2'], [2, 1, 'a-5'], [0, 2, 'a-3'], [1, 2, 'a-5'], [2, 2, 'a-c3']].map(([i, j, k]) => { const [x, y] = c(i, j); return rect(x, y, cell, cell, k, cell * .08); }),
      (() => { const [x, y] = c(1, 1); return circ(x + cell / 2, y + cell / 2, cell * .28, 'a-5'); })(), (() => { const [x, y] = c(0, 0); return path(`M${f(x + cell * .2)} ${f(y + cell * .8)}L${f(x + cell * .5)} ${f(y + cell * .2)}L${f(x + cell * .8)} ${f(y + cell * .8)}Z`, 'a-5'); })(), (() => { const [x, y] = c(2, 0); return circ(x + cell * .5, y + cell * .5, cell * .3, 'a-2'); })(), (() => { const [x, y] = c(0, 1); return path(`M${f(x + cell * .2)} ${f(y + cell * .5)}H${f(x + cell * .8)}M${f(x + cell * .5)} ${f(y + cell * .2)}V${f(y + cell * .8)}`, 'k1', `stroke-width="${f(cell * .12)}"`); })(), (() => { const [x, y] = c(2, 2); return rect(x + cell * .22, y + cell * .22, cell * .56, cell * .56, 'a-5', cell * .28); })()].join('');
  },
  swatches: (w, h, id, v) => {
    const n = 5, cw = w * .13, ch = h * .66, gap = w * .02, x0 = w / 2 - (n * cw + (n - 1) * gap) / 2, tones = ['a-c1', 'a-c2', 'a-c3', 'a-c4', 'a-c5'];
    return [wash(w, h, id), ...tones.map((k, i) => { const x = x0 + i * (cw + gap), y = h * .14 + (i % 2) * h * .05; return rect(x, y + h * .015, cw, ch, SHADE, w * .01, op(.8)) + rect(x, y, cw, ch, 'a-5', w * .01) + rect(x, y, cw, ch * .74, k, w * .01) + rect(x, y + ch * .6, cw, ch * .14, k) + rect(x + cw * .14, y + ch * .82, cw * .6, ch * .028, 'a-3', 1) + rect(x + cw * .14, y + ch * .88, cw * .4, ch * .022, 'a-4', 1, 'opacity=".6"') + rect(x, y + ch * .74, cw, ch * .02, SHADE, 0, op(.4)); })].join('');
  },
  states: (w, h, id, v) => {
    const cw = w * .26, ch = h * .6, gap = w * .03, x0 = w / 2 - (3 * cw + 2 * gap) / 2, y = h * .2;
    const shell = (x, k) => rect(x, y + h * .012, cw, ch, SHADE, w * .014, op(.8)) + rect(x, y, cw, ch, 'a-5', w * .014) + rect(x + cw * .1, y + ch * .08, cw * .8, ch * .08, 'a-6', 3);
    return [wash(w, h, id), shell(x0), ...[0, 1, 2].map(i => rect(x0 + cw * .1, y + ch * (.26 + i * .2), cw * (.8 - i * .14), ch * .1, 'a-6', 3)),
      shell(x0 + cw + gap), circ(x0 + cw * 1.5 + gap, y + ch * .5, ch * .17, 'a-ac'), path(`M${f(x0 + cw * 1.5 + gap - ch * .06)} ${f(y + ch * .5)}H${f(x0 + cw * 1.5 + gap + ch * .06)}M${f(x0 + cw * 1.5 + gap)} ${f(y + ch * .44)}V${f(y + ch * .56)}`, 'k1', `stroke-width="${f(ch * .028)}"`), rect(x0 + cw * 1.22 + gap, y + ch * .78, cw * .56, ch * .09, 'a-1', 99),
      shell(x0 + 2 * (cw + gap)), circ(x0 + cw * 2.5 + 2 * gap, y + ch * .46, ch * .17, 'a-c5', 'opacity=".95"'), rect(x0 + cw * 2.5 + 2 * gap - ch * .018, y + ch * .39, ch * .036, ch * .1, 'a-5', 2), circ(x0 + cw * 2.5 + 2 * gap, y + ch * .53, ch * .02, 'a-5'), rect(x0 + cw * 2.2 + 2 * gap, y + ch * .74, cw * .6, ch * .05, 'a-6', 3), rect(x0 + cw * 2.3 + 2 * gap, y + ch * .84, cw * .4, ch * .05, 'a-6', 3)].join('');
  },
  grid: (w, h, id, v) => {
    const u = Math.min(w, h) * .13, cols = 6, rows = 4, x0 = w / 2 - cols * u / 2, y0 = h / 2 - rows * u / 2;
    const blocks = [[0, 0, 2, 2, 'a-1'], [2, 0, 1, 1, 'a-5'], [3, 0, 1, 2, 'a-3'], [4, 0, 2, 1, 'a-2'], [2, 1, 1, 1, 'a-c4'], [4, 1, 1, 1, 'a-5'], [5, 1, 1, 2, 'a-1'], [0, 2, 1, 2, 'a-5'], [1, 2, 2, 1, 'a-2'], [3, 2, 2, 1, 'a-5'], [1, 3, 1, 1, 'a-3'], [2, 3, 2, 1, 'a-5'], [4, 3, 2, 1, 'a-c3']];
    return [wash(w, h, id), ...blocks.map(([c, r, cw, rh, k]) => rect(x0 + c * u + u * .05, y0 + r * u + u * .05, cw * u - u * .1, rh * u - u * .1, k, u * .1)), circ(x0 + u * 1, y0 + u * 1, u * .5, 'a-5'), circ(x0 + u * 4.5, y0 + u * 2.5, u * .35, 'a-3'), path(`M${f(x0 + u * 3.2)} ${f(y0 + u * 1.7)}L${f(x0 + u * 3.5)} ${f(y0 + u * 1.2)}L${f(x0 + u * 3.8)} ${f(y0 + u * 1.7)}Z`, 'a-5')].join('');
  },
  type: (w, h, id, v) => {
    const s = Math.min(w, h * 1.3) / 100, cx = w * .5, cy = h * .5;
    return [`<defs><linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="sa"/><stop offset="1" class="ss"/></linearGradient></defs><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}k)"/>`, `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s)})">${path('M-30 24L-7 -28H7L30 24H18L13 11H-13L-18 24ZM-8.6 1H8.6L0 -18Z', 'a-3', 'fill-rule="evenodd"')}${circ(26, -22, 9, 'a-1')}${rect(-34, 31, 68, 2.6, 'a-3', 1.3, 'opacity=".8"')}${rect(-34, 36, 44, 2.2, 'a-4', 1.1, 'opacity=".5"')}${path('M-36 -28H-22M-36 -23H-27', 'k4', 'stroke-width="2" opacity=".5"')}</g>`].join('');
  },
};

const NAMES = [...Object.keys(studios), ...Object.keys(scenes)];
export const motifNames = NAMES;

/** Returns SVG inner markup for `motif`, or null when it is not a known motif. `id` must be unique on the page. */
/** Window light and a soft vignette over the whole frame: flat vector art reads as a lit room, and a big tile is no longer one object on an empty field. Token classes only. */
const ambient = (w, h, id, v) => {
  const x = [[.52, .76, .18, .4], [.6, .74, .3, .52], [.4, .64, .1, .3]][v % 3];
  return `<defs><radialGradient id="${id}v" cx=".5" cy=".5" r=".78"><stop offset=".5" class="sk" stop-opacity="0"/><stop offset="1" class="sk" stop-opacity=".2"/></radialGradient></defs><path d="M${f(w * x[0])} 0H${f(w * x[1])}L${f(w * x[3])} ${f(h)}H${f(w * x[2])}Z" class="${LIGHT}" opacity=".3"/><path d="M${f(w * (x[1] + .06))} 0H${f(w * (x[1] + .12))}L${f(w * (x[3] + .1))} ${f(h)}H${f(w * (x[3] + .04))}Z" class="${LIGHT}" opacity=".18"/><rect width="${f(w)}" height="${f(h)}" fill="url(#${id}v)"/>`;
};

export function motifArt(motif, w, h, id, v = 0) {
  if (studios[motif]) {
    const fix = x => x.replace('url(#GL)', `url(#${id}s)`);
    const opt = {laptop: {fit: 1.05}, books: {fit: 1.1}, sneaker: {fit: 1.12, shadow: 1.2}, chair: {fit: 1.06}, floorlamp: {fit: 1.1, shadow: .7}, candle: {fit: 1.05}}[motif] ?? {};
    opt.rest = REST[motif];
    return studio(w, h, id, v, c => fix(studios[motif](c)), opt) + ambient(w, h, id, v);
  }
  if (scenes[motif]) return scenes[motif](w, h, id, v) + ambient(w, h, id, v);
  return null;
}
