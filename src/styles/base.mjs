import {SPACE, spaceVars} from '../spacing.mjs';
import {VL_BUCKETS} from '../render/util.mjs';
import {TYPE, RATIO_SHIFT, typeVars} from '../typography.mjs';

/** Axis → concrete values. Every key of catalog `axes` has a row here (checked by tests/catalog.test.mjs). */
// Typography (face pairing, scale ratio, tracking, leading, role sizes) lives in src/typography.mjs; the `typography` and `scale` rows are its tables.
export const TYPO = TYPE;
export const SCALE = RATIO_SHIFT;
// `section` = gap between blocks on app/content pages; `band` = vertical padding of a full-bleed section band on marketing pages.
export const DENSITY = SPACE;
export const RADIUS = {square: 0, subtle: 4, soft: 10, round: 18, bubble: 28};
export const WIDTH = {narrow: 760, standard: 1080, wide: 1280, full: 1600};
// Heading weight floor is 600 for sans heads: 500 at display size reads thin against 16px body (measured on article and blog pages). Serif heads may go to 400 (typeVars).
export const WEIGHT = {regular: {head: 600, btn: 500}, medium: {head: 700, btn: 600}, bold: {head: 800, btn: 700}};
export const ICON = {
  'line-fine': {sw: 1.5, cap: 'round', join: 'round', fill: 'none'}, line: {sw: 2, cap: 'round', join: 'round', fill: 'none'},
  'line-bold': {sw: 2.6, cap: 'round', join: 'round', fill: 'none'}, 'line-square': {sw: 2, cap: 'butt', join: 'miter', fill: 'none'},
  solid: {sw: 1.8, cap: 'round', join: 'round', fill: 'color-mix(in srgb,currentColor 58%,transparent)'}, duotone: {sw: 1.8, cap: 'round', join: 'round', fill: 'color-mix(in srgb,currentColor 18%,transparent)'},
};
export const ELEVATION = {
  flat: {border: '1px solid transparent', shadow: 'none', hover: 'none'},
  outline: {border: '1px solid var(--kit-border)', shadow: 'none', hover: 'none'},
  soft: {border: '1px solid var(--kit-border)', shadow: '0 1px 2px var(--kit-shade),0 6px 16px -8px var(--kit-shade)', hover: '0 2px 4px var(--kit-shade),0 12px 24px -10px var(--kit-shade)'},
  lifted: {border: '1px solid transparent', shadow: '0 2px 4px var(--kit-shade),0 16px 32px -12px var(--kit-shade)', hover: '0 4px 8px var(--kit-shade),0 24px 40px -14px var(--kit-shade)'},
  glow: {border: '1px solid color-mix(in srgb,var(--kit-action) 40%,var(--kit-border))', shadow: '0 0 0 1px color-mix(in srgb,var(--kit-action) 18%,transparent),0 8px 32px -8px color-mix(in srgb,var(--kit-action) 50%,transparent)', hover: '0 0 0 1px color-mix(in srgb,var(--kit-action) 40%,transparent),0 12px 40px -6px color-mix(in srgb,var(--kit-action) 65%,transparent)'},
  hard: {border: '2px solid var(--kit-text)', shadow: '4px 4px 0 var(--kit-text)', hover: '6px 6px 0 var(--kit-text)'},
};
export const MOTION = {none: {dur: '0ms', lift: '0px'}, subtle: {dur: '150ms', lift: '-1px'}, lively: {dur: '260ms', lift: '-4px'}};
export const BACKDROP = {
  plain: 'var(--kit-canvas)',
  tint: 'var(--kit-soft)',
  gradient: 'linear-gradient(180deg,var(--kit-canvas) 0%,var(--kit-soft) 55%,var(--kit-accentSoft) 100%) no-repeat,var(--kit-canvas)',
  grid: 'linear-gradient(color-mix(in srgb,var(--kit-border) 45%,transparent) 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,color-mix(in srgb,var(--kit-border) 45%,transparent) 1px,transparent 1px) 0 0/32px 32px,var(--kit-canvas)',
};

export function axisVars(b) {
  const d = DENSITY[b.density], r = RADIUS[b.radius], el = ELEVATION[b.elevation], mo = MOTION[b.motion], ic = ICON[b.icon], w = WEIGHT[b.weight];
  // "Open" parts (feature items, quotes) draw no box unless the elevation axis is a character choice (lifted, glow, hard).
  const boxed = ['lifted', 'glow', 'hard'].includes(b.elevation);
  const control = b.control === 'pill' ? '999px' : b.control === 'square' ? '0px' : `${r / 2}px`;
  return [
    ...typeVars(b, w.head),
    spaceVars(b.density), `--kit-gutter:32px`,
    // % resolves against the element's containing block, so a full-bleed band pads itself back into the content column.
    `--kit-bleed:max(var(--kit-gutter),calc((100% - var(--kit-max)) / 2 + var(--kit-gutter)))`, `--kit-bleedx:max(var(--kit-gutter),calc((100vw - var(--kit-max)) / 2 + var(--kit-gutter)))`,
    `--kit-radius:${r}px`, `--kit-r-control:${control}`, `--kit-r-field:${b.control === 'pill' ? '12px' : control}`, `--kit-r-tag:${b.control === 'square' ? '0px' : b.control === 'pill' ? '999px' : `${Math.max(r / 2, 4)}px`}`,
    `--kit-open-mr:${boxed ? '0px' : 'var(--kit-radius)'}`, `--kit-zoom:${{none: 0, subtle: .025, lively: .06}[b.motion]}`, `--kit-open-bg:${boxed ? 'var(--kit-surface)' : 'transparent'}`, `--kit-open-border:${boxed ? el.border : '0 solid transparent'}`, `--kit-open-shadow:${boxed ? el.shadow : 'none'}`, `--kit-open-pad:${boxed ? 'var(--kit-inset)' : '0px'}`, `--kit-open-radius:${boxed ? 'var(--kit-radius)' : '0px'}`,
    `--kit-card-border:${el.border}`, `--kit-shadow:${el.shadow}`, `--kit-shadow-hover:${el.hover}`,
    `--kit-dur:${mo.dur}`, `--kit-ease:cubic-bezier(.2,0,0,1)`, `--kit-lift:${mo.lift}`,
    `--kit-bw:${w.btn}`,
    `--kit-max:${WIDTH[b.width]}px`, `--kit-page-bg:${BACKDROP[b.backdrop]}`,
    `--kit-icon-sw:${ic.sw}`, `--kit-icon-cap:${ic.cap}`, `--kit-icon-join:${ic.join}`, `--kit-icon-fill:${ic.fill}`,
  ].join(';') + ';';
}

export const coreCSS = `
*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--kit-page-bg);color:var(--kit-text);font-size:var(--kit-t-body);line-height:var(--kit-line);font-family:var(--kit-font);font-variant-numeric:var(--kit-nums);word-break:keep-all;overflow-wrap:break-word;line-break:strict;min-height:100vh}
a{color:var(--kit-link);text-underline-offset:4px}button,input,textarea,select{font:inherit;color:inherit}button{cursor:pointer}button,a,input,textarea,select,summary{touch-action:manipulation}
:focus-visible{outline:3px solid var(--kit-focus);outline-offset:3px}input[type=checkbox],input[type=radio]{margin:0}
h1,h2,h3,h4,h5,h6,p,figure,blockquote,dl,dd,ul,ol{margin:0}ul,ol{padding:0}
h1,h2,h3,h4,h5,h6{font-family:var(--kit-heading);font-weight:var(--kit-hw);line-height:var(--kit-lh-sub);letter-spacing:var(--kit-tr-sub);text-wrap:balance}
:where(p,li,dd,dt,blockquote,figcaption,summary){text-wrap:pretty}.kit-button,.kit-chip,.kit-tag,.kit-badge{text-wrap:balance}
h1{font-size:var(--kit-t-title);max-width:22em;line-height:var(--kit-lh-title);letter-spacing:var(--kit-tr-title)}h2{font-size:var(--kit-t-heading);line-height:var(--kit-lh-heading);letter-spacing:var(--kit-tr-heading)}h3{font-size:var(--kit-t-sub);line-height:var(--kit-lh-sub);letter-spacing:var(--kit-tr-sub)}h4,h5,h6{font-size:var(--kit-t-body-l);line-height:1.4;letter-spacing:var(--kit-tr-sub)}p+p{margin-top:var(--kit-sp-head)}p{text-wrap:pretty}
/* A part's own title is a component heading (h3 step) no matter which outline level it carries; only section heads and heroes use the h2 step. */
:is(.kit-card,.kit-form,.kit-table-wrap,.kit-chart,.kit-list,.kit-summary,.kit-buybox,.kit-props,.kit-links,.kit-calendar,.kit-md-detail,.kit-progress,.kit-reviews,.kit-menu,.kit-plan,.kit-code,.kit-team,.kit-faq,.kit-steps,.kit-timeline,.kit-chat,.kit-lane,.kit-md,.kit-gallery,.kit-reel,.kit-features,.kit-notice,.kit-quote,.kit-metric) :is(h2,h3,h4){font-size:var(--kit-t-sub);line-height:1.3}
body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.kit-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.kit-muted{color:var(--kit-muted);font-size:var(--kit-t-small)}.kit-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:var(--kit-t-label);font-weight:700;letter-spacing:var(--kit-tr-label);text-transform:var(--kit-case-label);color:var(--kit-accentInk)}.kit-eyebrow::before{content:'';width:24px;height:2px;border-radius:2px;background:currentColor;flex:none}.kit-meta{font-size:var(--kit-t-small);color:var(--kit-muted)}.kit-quiet{font-size:var(--kit-t-small);font-weight:600;color:var(--kit-muted);letter-spacing:.02em}
.kit-skip{position:fixed;top:-100px;left:16px;background:var(--kit-surface);color:var(--kit-text);padding:12px;z-index:50;border:2px solid var(--kit-focus)}.kit-skip:focus{top:12px}
.kit-icon{width:1.25em;height:1.25em;flex:none;vertical-align:-.22em}.kit-icon path{fill:none;stroke:currentColor;stroke-width:var(--kit-icon-sw);stroke-linecap:var(--kit-icon-cap);stroke-linejoin:var(--kit-icon-join)}.kit-icon path.c{fill:var(--kit-icon-fill)}.kit-flip{transform:scaleX(-1)}
.kit-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--kit-control);padding:8px 24px;border:1px solid var(--kit-rule);border-radius:var(--kit-r-control);background:var(--kit-surface);color:var(--kit-text);font-weight:var(--kit-bw);font-size:var(--kit-t-ui);line-height:1.3;letter-spacing:-.005em;text-decoration:none;text-align:center;cursor:pointer;transition:background var(--kit-dur) var(--kit-ease),color var(--kit-dur) var(--kit-ease),box-shadow var(--kit-dur) var(--kit-ease),transform var(--kit-dur) var(--kit-ease)}
.kit-button[data-variant=primary]{background:var(--kit-action);color:var(--kit-onAction);border-color:var(--kit-action);box-shadow:0 1px 2px var(--kit-shade)}.kit-button[data-variant=primary]:hover{background:var(--kit-actionHover);color:var(--kit-onActionHover);border-color:var(--kit-actionHover)}.kit-button[data-variant=ghost]{background:transparent;border-color:transparent;color:var(--kit-link);text-decoration:underline;text-underline-offset:4px;padding-inline:4px}.kit-button[data-variant=secondary]:hover{background:var(--kit-soft)}.kit-button:hover{transform:translateY(var(--kit-lift))}
.kit-badge{display:inline-flex;align-items:center;gap:4px;font-size:var(--kit-t-caption);font-weight:600;padding:4px 12px;line-height:1.4;background:var(--kit-soft);color:var(--kit-text);border-radius:var(--kit-r-tag);border:1px solid var(--kit-border);white-space:nowrap}.kit-badge[data-tone=brand]{background:var(--kit-accentSoft)}
.kit-badge[data-dot]::before{content:'';width:7px;height:7px;border-radius:999px;background:var(--kit-muted);flex:none}.kit-badge[data-dot=success]::before{background:var(--kit-success)}.kit-badge[data-dot=info]::before{background:var(--kit-info)}.kit-badge[data-dot=warning]::before{background:var(--kit-warning)}.kit-badge[data-dot=danger]::before{background:var(--kit-danger)}
.kit-card-icon{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:calc(var(--kit-radius) * .6);background:var(--kit-accentSoft);color:var(--kit-accentInk);flex:none}.kit-card-icon .kit-icon{width:24px;height:24px}
.kit-plan,.kit-buybox{container-type:inline-size}.kit-price{font-weight:var(--kit-hw);font-size:var(--kit-t-price);line-height:1.1;font-family:var(--kit-heading);font-size:min(var(--kit-t-price),calc(100cqw * var(--kit-vfit,1)));letter-spacing:-.035em;margin-top:8px;font-variant-numeric:tabular-nums;overflow-wrap:normal}${VL_BUCKETS.map(n => `.kit-price[data-vl="${n}"]{--kit-vfit:${(1 / (1.04 * n)).toFixed(4)}}`).join('')}.kit-price .kit-muted{font-weight:500;font-size:var(--kit-t-small);line-height:1.4;font-family:var(--kit-font);letter-spacing:0;display:inline-block;white-space:nowrap}
.kit-avatar{display:inline-grid;place-items:center;width:36px;height:36px;flex:none;border-radius:999px;background:var(--kit-accent);color:var(--kit-onAccent);font-weight:700;font-size:var(--kit-t-small)}
.kit-card,.kit-metric,.kit-list,.kit-form,.kit-table-wrap,.kit-chart,.kit-summary,.kit-buybox,.kit-plan,.kit-quote,.kit-faq details,.kit-md-list,.kit-md-detail,.kit-code,.kit-progress,.kit-calendar,.kit-reviews,.kit-menu,.kit-props,.kit-links,.kit-team li{background:var(--kit-surface);border:var(--kit-card-border);border-radius:var(--kit-radius);box-shadow:var(--kit-shadow)}
.kit-card,.kit-metric,.kit-list,.kit-form,.kit-table-wrap,.kit-chart,.kit-summary,.kit-buybox,.kit-quote,.kit-md-detail,.kit-progress,.kit-calendar,.kit-reviews,.kit-menu,.kit-props,.kit-links{min-width:0;padding:var(--kit-inset)}
.kit-art .a-bg{fill:var(--kit-soft)}.kit-art .a-1{fill:var(--kit-action)}.kit-art .a-2{fill:var(--kit-accent)}.kit-art .a-3{fill:var(--kit-text)}.kit-art .a-4{fill:var(--kit-muted)}.kit-art .a-5{fill:var(--kit-surface)}.kit-art .a-6{fill:var(--kit-sunken)}.kit-art .a-cv{fill:var(--kit-canvas)}.kit-art .a-ac{fill:var(--kit-accentSoft)}.kit-art .a-gr{fill:var(--kit-success)}.kit-art .a-wm{fill:var(--kit-warning)}.kit-art .a-c1{fill:var(--kit-chart1)}.kit-art .a-c2{fill:var(--kit-chart2)}.kit-art .a-c3{fill:var(--kit-chart3)}.kit-art .a-c4{fill:var(--kit-chart4)}.kit-art .a-c5{fill:var(--kit-chart5)}.kit-art .a-sh{fill:var(--kit-shade)}.kit-art .a-hi{fill:#fff;fill-opacity:.4}
.kit-art :is(.k1,.k2,.k3,.k4,.k5,.k6,.kg,.kw,.kc1,.kc2,.kc3,.kc4,.kc5){fill:none;stroke-linecap:round;stroke-linejoin:round}.kit-art .k1{stroke:var(--kit-action)}.kit-art .k2{stroke:var(--kit-accent)}.kit-art .k3{stroke:var(--kit-text)}.kit-art .k4{stroke:var(--kit-muted)}.kit-art .k5{stroke:var(--kit-surface)}.kit-art .k6{stroke:var(--kit-sunken)}.kit-art .kg{stroke:var(--kit-success)}.kit-art .kw{stroke:var(--kit-warning)}.kit-art .kc1{stroke:var(--kit-chart1)}.kit-art .kc2{stroke:var(--kit-chart2)}.kit-art .kc3{stroke:var(--kit-chart3)}.kit-art .kc4{stroke:var(--kit-chart4)}.kit-art .kc5{stroke:var(--kit-chart5)}
.kit-art .sc{stop-color:var(--kit-canvas)}.kit-art .ss{stop-color:var(--kit-soft)}.kit-art .sa{stop-color:var(--kit-accentSoft)}.kit-art .su{stop-color:var(--kit-sunken)}.kit-art .sx{stop-color:var(--kit-surface)}.kit-art .sk{stop-color:var(--kit-text)}
.kit-art text{font-family:var(--kit-font);letter-spacing:-.01em;word-break:normal;white-space:pre}.kit-art .t1{fill:var(--kit-accentInk)}.kit-art .t3{fill:var(--kit-text)}.kit-art .t4{fill:var(--kit-muted)}.kit-art .t6{fill:var(--kit-surface)}.kit-art .bd{stroke:var(--kit-border);stroke-width:1}.kit-art .bdl{fill:none;stroke:var(--kit-border);stroke-width:1}.kit-art .k4s{fill:none;stroke:var(--kit-muted);stroke-width:1.4}.kit-art .s1{stop-color:var(--kit-action)}.kit-art .ag{stroke:none}
.kit-art .a-line{fill:none;stroke:var(--kit-rule)}
.kit-portrait{display:block;width:100%;height:100%}.kit-portrait .a-ac,.kit-portrait .a-c1,.kit-portrait .a-c3,.kit-portrait .a-c4,.kit-portrait .a-2,.kit-portrait .a-6,.kit-portrait .a-1,.kit-portrait .a-3,.kit-portrait .a-5,.kit-portrait .a-c2,.kit-portrait .a-c5,.kit-portrait .a-4,.kit-portrait .a-sh{stroke:none}.kit-portrait :is(.a-ac){fill:var(--kit-accentSoft)}.kit-portrait .a-c1{fill:var(--kit-chart1)}.kit-portrait .a-c2{fill:var(--kit-chart2)}.kit-portrait .a-c3{fill:var(--kit-chart3)}.kit-portrait .a-c4{fill:var(--kit-chart4)}.kit-portrait .a-c5{fill:var(--kit-chart5)}.kit-portrait .a-1{fill:var(--kit-action)}.kit-portrait .a-2{fill:var(--kit-accent)}.kit-portrait .a-3{fill:var(--kit-text)}.kit-portrait .a-4{fill:var(--kit-muted)}.kit-portrait .a-5{fill:var(--kit-surface)}.kit-portrait .a-6{fill:var(--kit-sunken)}.kit-portrait .a-sh{fill:var(--kit-shade)}
.kit-avatar[data-art]{background:none;padding:0;overflow:hidden}.kit-art .a-s1{fill:none;stroke:var(--kit-action);stroke-linecap:round;stroke-linejoin:round}
.kit-state{padding:var(--kit-inset) 0;color:var(--kit-muted);display:flex;flex-direction:column;gap:8px}.kit-state strong{color:var(--kit-text)}.kit-state[data-state=error] strong{color:var(--kit-danger)}.kit-state[data-state=partial] strong{color:var(--kit-warning)}.kit-state[data-state=loading]::before{content:'';display:block;width:64%;height:12px;background:var(--kit-border);border-radius:6px;animation:kit-pulse 1.2s ease-in-out infinite}
.kit-table-scroll{overflow-x:auto;max-width:100%;position:relative}.kit-actions{display:flex;flex-wrap:wrap;gap:12px}.kit-actions[data-align=center]{justify-content:center}.kit-actions[data-align=end]{justify-content:flex-end}
@keyframes kit-pulse{50%{opacity:.4}}@keyframes kit-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
`;

export const tailCSS = `
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(prefers-contrast:more){:root{--kit-border:var(--kit-rule)}.kit-card,.kit-form,.kit-chart,.kit-table-wrap{border-width:2px}}
@media(forced-colors:active){.kit-button,.kit-card,.kit-form,.kit-field input,.kit-field select,.kit-field textarea{border:1px solid CanvasText}.kit-bar{background:Highlight;forced-color-adjust:none}.kit-tablist [aria-selected=true]{outline:2px solid Highlight}.kit-switch i{border:1px solid CanvasText}}
@media print{.kit-skip,.kit-header{display:none!important}.kit-shell{display:block!important}.kit-main{max-width:none;padding:0}.kit-card,.kit-form,.kit-notice,.kit-chart,.kit-plan{break-inside:avoid}}
`;
