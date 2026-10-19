/** Axis → concrete values. Every key of catalog `axes` has a row here (checked by tests/catalog.test.mjs). */
export const FONT = {
  sans: 'system-ui,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif',
  serif: '"Iowan Old Style","AppleMyungjo","Noto Serif KR","Batang",Georgia,serif',
  mono: '"SFMono-Regular","Menlo",Consolas,"D2Coding",monospace',
  rounded: 'ui-rounded,"Hiragino Maru Gothic ProN","Arial Rounded MT Bold","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif',
  geometric: '"Avenir Next","Avenir","Century Gothic","Futura","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif',
  humanist: '"Seravek","Gill Sans","Optima","Candara","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif',
  grotesk: '"Helvetica Neue","Arial Nova","Arial","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif',
};
export const TYPO = {
  sans: ['sans', 'sans'], serif: ['sans', 'serif'], mono: ['sans', 'mono'], editorial: ['serif', 'serif'],
  rounded: ['rounded', 'rounded'], geometric: ['geometric', 'geometric'], humanist: ['humanist', 'humanist'], grotesk: ['grotesk', 'grotesk'],
};
export const DENSITY = {compact: {inset: 16, gap: 16, section: 28, control: 40}, comfortable: {inset: 24, gap: 24, section: 40, control: 44}, spacious: {inset: 32, gap: 32, section: 56, control: 48}};
export const RADIUS = {square: 0, subtle: 4, soft: 10, round: 18, bubble: 28};
export const WIDTH = {narrow: 760, standard: 1080, wide: 1280, full: 1600};
export const SCALE = {
  tight: {title: 'clamp(26px,3.2vw,34px)', h2: '22px', h3: '18px'},
  balanced: {title: 'clamp(28px,4vw,44px)', h2: '24px', h3: '20px'},
  dramatic: {title: 'clamp(34px,7.5vw,76px)', h2: '30px', h3: '22px'},
};
export const WEIGHT = {regular: {head: 500, btn: 500}, medium: {head: 650, btn: 600}, bold: {head: 800, btn: 700}};
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
  const d = DENSITY[b.density], r = RADIUS[b.radius], el = ELEVATION[b.elevation], mo = MOTION[b.motion], ic = ICON[b.icon], sc = SCALE[b.scale], w = WEIGHT[b.weight];
  const [head, body] = TYPO[b.typography];
  const control = b.control === 'pill' ? '999px' : b.control === 'square' ? '0px' : `${r / 2}px`;
  return [
    `--kit-font:${FONT[body]}`, `--kit-heading:${FONT[head]}`, `--kit-mono:${FONT.mono}`,
    `--kit-inset:${d.inset}px`, `--kit-gap:${d.gap}px`, `--kit-section:${d.section}px`, `--kit-control:${d.control}px`,
    `--kit-radius:${r}px`, `--kit-r-control:${control}`, `--kit-r-field:${b.control === 'pill' ? '12px' : control}`, `--kit-r-tag:${b.control === 'square' ? '0px' : b.control === 'pill' ? '999px' : `${Math.max(r / 2, 4)}px`}`,
    `--kit-card-border:${el.border}`, `--kit-shadow:${el.shadow}`, `--kit-shadow-hover:${el.hover}`,
    `--kit-dur:${mo.dur}`, `--kit-ease:cubic-bezier(.2,0,0,1)`, `--kit-lift:${mo.lift}`,
    `--kit-title:${sc.title}`, `--kit-h2:${sc.h2}`, `--kit-h3:${sc.h3}`, `--kit-hw:${w.head}`, `--kit-bw:${w.btn}`,
    `--kit-max:${WIDTH[b.width]}px`, `--kit-page-bg:${BACKDROP[b.backdrop]}`,
    `--kit-icon-sw:${ic.sw}`, `--kit-icon-cap:${ic.cap}`, `--kit-icon-join:${ic.join}`, `--kit-icon-fill:${ic.fill}`,
    `--kit-body:16px`, `--kit-small:14px`, `--kit-lead:clamp(17px,1.5vw,19px)`, `--kit-line:1.65`,
  ].join(';') + ';';
}

export const coreCSS = `
*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--kit-page-bg);color:var(--kit-text);font:var(--kit-body)/var(--kit-line) var(--kit-font);word-break:keep-all;overflow-wrap:anywhere;line-break:strict;min-height:100vh}
a{color:var(--kit-link);text-underline-offset:4px}button,input,textarea,select{font:inherit;color:inherit}button{cursor:pointer}button,a,input,textarea,select,summary{touch-action:manipulation}
:focus-visible{outline:3px solid var(--kit-focus);outline-offset:3px}
h1,h2,h3,h4,h5,h6,p,figure,blockquote,dl,dd,ul,ol{margin:0}ul,ol{padding:0}
h1,h2,h3,h4,h5,h6{font-family:var(--kit-heading);font-weight:var(--kit-hw);line-height:1.3;letter-spacing:-.02em;text-wrap:balance}
h1{font-size:var(--kit-title);max-width:24ch;line-height:1.18;letter-spacing:-.03em}h2{font-size:var(--kit-h2);line-height:1.25;letter-spacing:-.025em}h3{font-size:var(--kit-h3);line-height:1.3}h4,h5,h6{font-size:calc(var(--kit-body) + 1px);line-height:1.4;letter-spacing:-.01em}p+p{margin-top:var(--kit-gap)}
body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.kit-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.kit-muted{color:var(--kit-muted);font-size:var(--kit-small)}.kit-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--kit-accentInk)}.kit-eyebrow::before{content:'';width:20px;height:2px;border-radius:2px;background:currentColor;flex:none}.kit-meta{font-size:var(--kit-small);color:var(--kit-muted)}.kit-quiet{font-size:var(--kit-small);font-weight:600;color:var(--kit-muted);letter-spacing:.02em}
.kit-skip{position:fixed;top:-100px;left:16px;background:var(--kit-surface);color:var(--kit-text);padding:12px;z-index:50;border:2px solid var(--kit-focus)}.kit-skip:focus{top:12px}
.kit-icon{width:1.25em;height:1.25em;flex:none;vertical-align:-.22em}.kit-icon path{fill:none;stroke:currentColor;stroke-width:var(--kit-icon-sw);stroke-linecap:var(--kit-icon-cap);stroke-linejoin:var(--kit-icon-join)}.kit-icon path.c{fill:var(--kit-icon-fill)}.kit-flip{transform:scaleX(-1)}
.kit-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--kit-control);padding:8px 22px;border:1px solid var(--kit-rule);border-radius:var(--kit-r-control);background:var(--kit-surface);color:var(--kit-text);font-weight:var(--kit-bw);font-size:15px;line-height:1.3;letter-spacing:-.01em;text-decoration:none;text-align:center;cursor:pointer;transition:background var(--kit-dur) var(--kit-ease),color var(--kit-dur) var(--kit-ease),box-shadow var(--kit-dur) var(--kit-ease),transform var(--kit-dur) var(--kit-ease)}
.kit-button[data-variant=primary]{background:var(--kit-action);color:var(--kit-onAction);border-color:var(--kit-action);box-shadow:0 1px 2px var(--kit-shade)}.kit-button[data-variant=primary]:hover{background:var(--kit-actionHover);color:var(--kit-onActionHover);border-color:var(--kit-actionHover)}.kit-button[data-variant=ghost]{background:transparent;border-color:transparent;color:var(--kit-link);text-decoration:underline;text-underline-offset:4px;padding-inline:4px}.kit-button[data-variant=secondary]:hover{background:var(--kit-soft)}.kit-button:hover{transform:translateY(var(--kit-lift))}
.kit-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 10px;line-height:1.4;background:var(--kit-soft);color:var(--kit-text);border-radius:var(--kit-r-tag);border:1px solid var(--kit-border);white-space:nowrap}.kit-badge[data-tone=brand]{background:var(--kit-accentSoft)}
.kit-badge[data-dot]::before{content:'';width:7px;height:7px;border-radius:999px;background:var(--kit-muted);flex:none}.kit-badge[data-dot=success]::before{background:var(--kit-success)}.kit-badge[data-dot=info]::before{background:var(--kit-info)}.kit-badge[data-dot=warning]::before{background:var(--kit-warning)}.kit-badge[data-dot=danger]::before{background:var(--kit-danger)}
.kit-card-icon{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:calc(var(--kit-radius) * .6);background:var(--kit-accentSoft);color:var(--kit-accentInk);flex:none}.kit-card-icon .kit-icon{width:24px;height:24px}
.kit-price{font:var(--kit-hw) clamp(30px,3.4vw,40px)/1.1 var(--kit-heading);letter-spacing:-.035em;margin-top:10px;font-variant-numeric:tabular-nums}.kit-price .kit-muted{font:500 var(--kit-small)/1.4 var(--kit-font);letter-spacing:0}
.kit-avatar{display:inline-grid;place-items:center;width:36px;height:36px;flex:none;border-radius:999px;background:var(--kit-accent);color:var(--kit-onAccent);font-weight:700;font-size:14px}
.kit-card,.kit-metric,.kit-list,.kit-form,.kit-table-wrap,.kit-chart,.kit-summary,.kit-buybox,.kit-plan,.kit-quote,.kit-faq details,.kit-md-list,.kit-md-detail,.kit-code,.kit-progress,.kit-calendar,.kit-reviews,.kit-menu,.kit-props,.kit-links,.kit-team li{background:var(--kit-surface);border:var(--kit-card-border);border-radius:var(--kit-radius);box-shadow:var(--kit-shadow)}
.kit-card,.kit-metric,.kit-list,.kit-form,.kit-table-wrap,.kit-chart,.kit-summary,.kit-buybox,.kit-quote,.kit-md-detail,.kit-progress,.kit-calendar,.kit-reviews,.kit-menu,.kit-props,.kit-links{min-width:0;padding:var(--kit-inset)}
.kit-art .a-bg{fill:var(--kit-soft)}.kit-art .a-1{fill:var(--kit-action)}.kit-art .a-2{fill:var(--kit-accent)}.kit-art .a-3{fill:var(--kit-text)}.kit-art .a-4{fill:var(--kit-muted)}.kit-art .a-5{fill:var(--kit-surface)}.kit-art .a-6{fill:var(--kit-sunken)}.kit-art .a-line{fill:none;stroke:var(--kit-rule)}
.kit-state{padding:var(--kit-inset) 0;color:var(--kit-muted);display:flex;flex-direction:column;gap:8px}.kit-state strong{color:var(--kit-text)}.kit-state[data-state=error] strong{color:var(--kit-danger)}.kit-state[data-state=partial] strong{color:var(--kit-warning)}.kit-state[data-state=loading]::before{content:'';display:block;width:64%;height:12px;background:var(--kit-border);border-radius:6px;animation:kit-pulse 1.2s ease-in-out infinite}
.kit-table-scroll{overflow-x:auto;max-width:100%}.kit-actions{display:flex;flex-wrap:wrap;gap:12px}.kit-actions[data-align=center]{justify-content:center}.kit-actions[data-align=end]{justify-content:flex-end}
@keyframes kit-pulse{50%{opacity:.4}}@keyframes kit-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
`;

export const tailCSS = `
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(prefers-contrast:more){:root{--kit-border:var(--kit-rule)}.kit-card,.kit-form,.kit-chart,.kit-table-wrap{border-width:2px}}
@media(forced-colors:active){.kit-button,.kit-card,.kit-form,.kit-field input,.kit-field select,.kit-field textarea{border:1px solid CanvasText}.kit-bar{background:Highlight;forced-color-adjust:none}.kit-tablist [aria-selected=true]{outline:2px solid Highlight}.kit-switch i{border:1px solid CanvasText}}
@media print{.kit-skip,.kit-header{display:none!important}.kit-shell{display:block!important}.kit-main{max-width:none;padding:0}.kit-card,.kit-form,.kit-notice,.kit-chart,.kit-plan{break-inside:avoid}}
`;
