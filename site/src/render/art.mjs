import {num} from './util.mjs';

/** Decorative placeholder art. Everything is drawn from token classes (see styles/nodes.mjs `.kit-art`), never from external images. */
const SIZE = {'16:9': [320, 180], '4:3': [320, 240], '1:1': [320, 320], '3:4': [240, 320], '21:9': [336, 144]};
export const ratioCss = r => r.replace(':', ' / ');

const rect = (x, y, w, h, c, rx = 0, extra = '') => `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${rx ? ` rx="${num(rx)}"` : ''} class="${c}"${extra}/>`;
const circle = (x, y, r, c, extra = '') => `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" class="${c}"${extra}/>`;
const path = (d, c, extra = '') => `<path d="${d}" class="${c}"${extra}/>`;

function patternArt(w, h, ornament) {
  const out = [rect(0, 0, w, h, 'a-bg')];
  if (ornament === 'organic') {
    out.push(path(`M0 ${h * .7}C${w * .2} ${h * .4} ${w * .35} ${h * .95} ${w * .55} ${h * .65}S${w * .85} ${h * .3} ${w} ${h * .55}V${h}H0Z`, 'a-1', ' opacity=".85"'));
    out.push(circle(w * .28, h * .3, h * .2, 'a-2', ' opacity=".9"'), circle(w * .72, h * .26, h * .12, 'a-3', ' opacity=".8"'));
  } else if (ornament === 'lines') {
    for (let i = 0; i < 7; i++) out.push(path(`M0 ${num(h * (.15 + i * .12))}C${w * .25} ${num(h * (.02 + i * .12))} ${w * .5} ${num(h * (.3 + i * .12))} ${w * .75} ${num(h * (.15 + i * .12))}S${w} ${num(h * (.1 + i * .12))} ${w} ${num(h * (.12 + i * .12))}`, 'a-line', ` stroke-width="${i % 3 ? 2 : 4}"`));
  } else if (ornament === 'dots') {
    const step = Math.max(w, h) / 12;
    for (let y = step / 2, r = 0; y < h; y += step, r++) for (let x = step / 2, c = 0; x < w; x += step, c++) out.push(circle(x, y, (r + c) % 5 === 0 ? step * .28 : step * .12, (r + c) % 5 === 0 ? 'a-1' : 'a-4', ' opacity=".7"'));
  } else {
    const s = Math.min(w, h) / 3;
    out.push(rect(w * .08, h * .1, s * 1.6, s * 1.6, 'a-1', 0), circle(w * .62, h * .36, s * .75, 'a-2'), path(`M${w * .45} ${h * .92}L${w * .72} ${h * .5}L${w * .95} ${h * .92}Z`, 'a-3', ' opacity=".85"'), rect(w * .08, h * .72, s * 1.2, s * .3, 'a-4', 0));
  }
  return out.join('');
}

const kinds = {
  photo: (w, h, o) => [rect(0, 0, w, h, 'a-bg'), circle(w * .72, h * .3, h * .13, 'a-2'),
    o === 'geometric' ? path(`M0 ${h * .78}L${w * .3} ${h * .4}L${w * .55} ${h * .75}L${w * .75} ${h * .5}L${w} ${h * .8}V${h}H0Z`, 'a-4', ' opacity=".35"') : path(`M0 ${h * .7}Q${w * .25} ${h * .35} ${w * .5} ${h * .65}T${w} ${h * .6}V${h}H0Z`, 'a-4', ' opacity=".35"'),
    o === 'geometric' ? path(`M0 ${h * .92}L${w * .22} ${h * .62}L${w * .45} ${h * .9}L${w * .7} ${h * .66}L${w} ${h * .92}V${h}H0Z`, 'a-1') : path(`M0 ${h * .86}Q${w * .3} ${h * .55} ${w * .6} ${h * .85}T${w} ${h * .8}V${h}H0Z`, 'a-1')].join(''),
  diagram: (w, h) => [rect(0, 0, w, h, 'a-bg'), rect(w * .06, h * .38, w * .24, h * .24, 'a-5', 6, ' stroke-width="2"'), rect(w * .38, h * .12, w * .24, h * .24, 'a-5', 6, ' stroke-width="2"'), rect(w * .38, h * .64, w * .24, h * .24, 'a-5', 6, ' stroke-width="2"'), rect(w * .7, h * .38, w * .24, h * .24, 'a-1', 6),
    path(`M${w * .3} ${h * .5}H${w * .34}V${h * .24}H${w * .38}M${w * .34} ${h * .5}V${h * .76}H${w * .38}M${w * .62} ${h * .24}H${w * .66}V${h * .5}H${w * .7}M${w * .62} ${h * .76}H${w * .66}V${h * .5}`, 'a-line', ' stroke-width="2"')].join(''),
  device: (w, h) => { const pw = Math.min(w * .42, h * .52), ph = h * .86, x = (w - pw) / 2, y = (h - ph) / 2; return [rect(0, 0, w, h, 'a-bg'), rect(x, y, pw, ph, 'a-3', pw * .14), rect(x + pw * .06, y + ph * .05, pw * .88, ph * .9, 'a-5', pw * .1), rect(x + pw * .14, y + ph * .14, pw * .72, ph * .12, 'a-1', 4), rect(x + pw * .14, y + ph * .32, pw * .72, ph * .08, 'a-6', 3), rect(x + pw * .14, y + ph * .44, pw * .5, ph * .08, 'a-6', 3), rect(x + pw * .14, y + ph * .6, pw * .72, ph * .24, 'a-2', 6, ' opacity=".7"')].join(''); },
  map: (w, h) => [rect(0, 0, w, h, 'a-6'), rect(w * .08, h * .12, w * .26, h * .28, 'a-bg', 4), rect(w * .42, h * .08, w * .2, h * .36, 'a-bg', 4), rect(w * .7, h * .14, w * .22, h * .24, 'a-bg', 4), rect(w * .1, h * .56, w * .3, h * .3, 'a-bg', 4), rect(w * .5, h * .58, w * .4, h * .28, 'a-bg', 4),
    path(`M0 ${h * .48}H${w}M${w * .38} 0V${h}M${w * .66} 0V${h}`, 'a-line', ' stroke-width="6" opacity=".6"'), path(`M${w * .5} ${h * .36}c-${w * .06} 0-${w * .06} -${h * .2} 0 -${h * .2}s${w * .06} ${h * .2} 0 ${h * .2}Z`, 'a-2'), circle(w * .5, h * .2, h * .05, 'a-5')].join(''),
  chart: (w, h) => [rect(0, 0, w, h, 'a-bg'), ...[.35, .55, .42, .75, .62, .9].map((v, i) => rect(w * (.1 + i * .14), h * (.9 - v * .75), w * .09, h * v * .75, i % 2 ? 'a-2' : 'a-1', 3)), path(`M${w * .06} ${h * .9}H${w * .94}`, 'a-line', ' stroke-width="2"')].join(''),
  video: (w, h) => [rect(0, 0, w, h, 'a-3'), circle(w / 2, h / 2, Math.min(w, h) * .16, 'a-5', ' opacity=".95"'), path(`M${w * .475} ${h * .4}L${w * .475} ${h * .6}L${w * .56} ${h * .5}Z`, 'a-1'), rect(w * .06, h * .88, w * .88, 4, 'a-4', 2), rect(w * .06, h * .88, w * .34, 4, 'a-2', 2)].join(''),
  pattern: (w, h, o) => patternArt(w, h, o),
};

export function mediaArt(kind, ratio, ornament, label) {
  const [w, h] = SIZE[ratio];
  return `<svg class="kit-art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}" focusable="false">${kinds[kind](w, h, ornament)}</svg>`;
}

/** Hero/empty-state illustration. `none` draws nothing so layouts collapse cleanly. */
export function ornamentArt(ornament, w = 400, h = 320) {
  if (ornament === 'none') return '';
  return `<svg class="kit-art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${patternArt(w, h, ornament)}</svg>`;
}
