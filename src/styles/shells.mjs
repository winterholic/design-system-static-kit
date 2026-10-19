// Marketing page types lay their top-level sections out as full-bleed bands; every other type keeps one content column.
const BAND = ':is([data-page=landing],[data-page=pricing],[data-page=portfolio],[data-page=general])';
const navBase = `
.kit-header{display:flex;align-items:center;gap:var(--kit-gap);padding:16px var(--kit-bleed);background:var(--kit-surface);border-bottom:1px solid var(--kit-border);min-width:0}
.kit-brand{display:flex;align-items:center;gap:8px;font-weight:700;text-decoration:none;color:var(--kit-text);font-size:18px;min-width:0;font-family:var(--kit-heading)}
.kit-brand-mark{flex:none;display:inline-grid;place-items:center;width:34px;height:34px;background:var(--kit-action);color:var(--kit-onAction);border-radius:var(--kit-r-tag);font-size:16px}
.kit-nav ul{list-style:none;margin:0;padding:0;display:flex;gap:4px;flex-wrap:wrap}
.kit-nav a{display:flex;align-items:center;gap:8px;min-height:var(--kit-control);padding:0 12px;text-decoration:none;font-size:var(--kit-small);color:var(--kit-muted);border-radius:var(--kit-r-control);white-space:nowrap}
.kit-nav a:hover{background:var(--kit-soft);color:var(--kit-link)}.kit-nav a[aria-current=page]{background:var(--kit-soft);color:var(--kit-text);font-weight:600}
.kit-body{min-width:0;display:flex;flex-direction:column;min-height:100vh}
.kit-main{--kit-cw:calc(var(--kit-max) - 2 * var(--kit-gutter));flex:1;min-width:0;width:100%;display:grid;grid-template-columns:[full-start] minmax(var(--kit-gutter),1fr) [content-start] minmax(0,var(--kit-cw)) [content-end] minmax(var(--kit-gutter),1fr) [full-end];grid-auto-rows:min-content;align-content:start;row-gap:var(--kit-section);padding-block:var(--kit-section)}
.kit-main>*{grid-column:content;min-width:0}
.kit-main:focus{outline:none}
/* Work screens sit on a tinted canvas so white cards and tables separate from the page without extra borders (plain backdrop only; other backdrops are an explicit choice). */
[data-backdrop=plain]:is([data-page=dashboard],[data-page=data],[data-page=community],[data-page=settings],[data-page=listing]) .kit-body{background:color-mix(in srgb,var(--kit-soft) 55%,var(--kit-canvas))}
[data-page=auth] .kit-main{--kit-cw:min(496px,calc(100% - 2 * var(--kit-gutter)));align-content:center}[data-page=auth] .kit-page-header{align-items:center;text-align:center}[data-page=auth] .kit-page-header h1{max-width:20ch}[data-page=auth] .kit-form{padding:var(--kit-sp-inset-l)}
[data-page=error] .kit-main{align-content:center}
${BAND} .kit-main{row-gap:0;padding-block:var(--kit-sp-section-s)}${BAND} .kit-main:has(>.kit-hero){padding-top:0}${BAND} .kit-main:has(>:last-child:is(.kit-cta,.kit-section,.kit-logos)){padding-bottom:0}${BAND} .kit-main>*{margin-block:var(--kit-sp-section-s)}
${BAND} .kit-main>:is(.kit-hero,.kit-section,.kit-logos,.kit-cta){grid-column:full;margin-block:0;padding-inline:var(--kit-bleed);padding-block:var(--kit-band)}
${BAND} .kit-main>:is(.kit-hero,.kit-section,.kit-cta){border-radius:0}${BAND} .kit-main>:is(.kit-hero,.kit-cta){border-width:0}${BAND} .kit-main>.kit-logos{padding-block:var(--kit-sp-band-s)}
${BAND} .kit-main>.kit-section[data-surface=inverse]{background:var(--kit-canvas)}${BAND} .kit-main>.kit-section[data-surface=plain]:nth-child(even),${BAND} .kit-main>.kit-section[data-surface=tint]{background:var(--kit-soft);box-shadow:inset 0 1px 0 var(--kit-border),inset 0 -1px 0 var(--kit-border)}
.kit-footer{padding:32px var(--kit-bleed);color:var(--kit-muted);font-size:var(--kit-small);border-top:1px solid var(--kit-border);background:var(--kit-surface)}
.kit-footer p+p{margin-top:0}.kit-footer a{color:var(--kit-muted)}.kit-footer-links{list-style:none;display:flex;flex-wrap:wrap;gap:16px;margin:0;padding:0}
.kit-footer nav ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}.kit-footer>div>strong{font-size:17px;font-family:var(--kit-heading);letter-spacing:-.02em}.kit-footer>div>p{margin-top:8px;max-width:34ch;line-height:1.6}.kit-footer strong{color:var(--kit-text)}
.kit-mega{position:relative}.kit-mega summary{display:flex;align-items:center;gap:8px;min-height:var(--kit-control);padding:0 12px;font-size:var(--kit-small);color:var(--kit-muted);border-radius:var(--kit-r-control);cursor:pointer;list-style:none;white-space:nowrap}.kit-mega summary::-webkit-details-marker{display:none}.kit-mega summary:hover,.kit-mega[open] summary{background:var(--kit-soft);color:var(--kit-link)}.kit-mega[open] summary .kit-icon:last-child{transform:rotate(180deg)}
.kit-mega-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:40;width:min(560px,92vw);padding:12px;background:var(--kit-surface);border:var(--kit-card-border);border-radius:var(--kit-radius);box-shadow:var(--kit-shadow-hover)}.kit-mega-panel ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.kit-mega-panel a{display:flex;flex-direction:column;gap:2px;padding:12px 12px;min-height:44px;color:var(--kit-text);text-decoration:none;border-radius:calc(var(--kit-radius) * .6);white-space:normal}.kit-mega-panel a:hover{background:var(--kit-soft)}.kit-mega-panel span{font-size:13px;color:var(--kit-muted)}
@media(max-width:1000px){:root{--kit-gutter:24px}}
@media(max-width:640px){.kit-nav[data-mega] ul{flex-wrap:wrap;overflow:visible}.kit-mega-panel{position:static;width:100%;box-shadow:none}.kit-mega-panel ul{grid-template-columns:1fr}.kit-mega{width:100%}}
@media(max-width:640px){:root{--kit-gutter:16px}.kit-main{padding-block:var(--kit-inset) var(--kit-sp-section-m);row-gap:var(--kit-sp-section-m)}${BAND} .kit-main{row-gap:0;padding-block:var(--kit-sp-section-s)}${BAND} .kit-main>:is(.kit-hero,.kit-section,.kit-logos,.kit-cta){padding-block:var(--kit-sp-band-m)}.kit-header{padding:12px 16px;flex-wrap:wrap;gap:8px}.kit-header>.kit-header-action{order:1;margin-left:auto}.kit-header>.kit-nav{order:2;flex-basis:100%}.kit-nav{max-width:100%}.kit-nav ul{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin;padding-bottom:4px}.kit-brand{font-size:16px}.kit-footer{padding:24px 16px}}
`;

const footers = {
  simple: '.kit-footer{display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;align-items:center}',
  minimal: '.kit-footer{text-align:center;padding-block:16px}',
  columns: '.kit-footer{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(0,1fr) minmax(0,1fr);gap:var(--kit-gap);padding-block:56px;align-items:start}@media(max-width:720px){.kit-footer{grid-template-columns:1fr}}',
};

const shells = {
  sidebar: `
[data-shell=sidebar]{--kit-side:240px;display:grid;grid-template-columns:var(--kit-side) minmax(0,1fr);align-items:start;background:linear-gradient(90deg,var(--kit-surface) var(--kit-side),transparent 0)}
[data-shell=sidebar] .kit-header{position:sticky;top:0;height:100vh;flex-direction:column;align-items:stretch;gap:20px;padding:24px 16px;border-right:1px solid var(--kit-border);border-bottom:0;overflow-y:auto}
[data-shell=sidebar] .kit-nav ul{flex-direction:column;flex-wrap:nowrap}[data-shell=sidebar] .kit-header-action{margin-top:auto}
@media(max-width:1000px){[data-shell=sidebar]{--kit-side:196px}}
@media(max-width:720px){[data-shell=sidebar]{display:block;background:none}[data-shell=sidebar] .kit-header{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;border-right:0;border-bottom:1px solid var(--kit-border);padding:12px 16px}[data-shell=sidebar] .kit-nav ul{flex-direction:row;flex-wrap:nowrap;overflow-x:auto}[data-shell=sidebar] .kit-header-action{margin:0}}`,
  topbar: `
[data-shell=topbar] .kit-header{position:sticky;top:0;z-index:20}[data-shell=topbar] .kit-nav{flex:1}[data-shell=topbar] .kit-header-action{margin-left:auto}
@media(max-width:640px){[data-shell=topbar] .kit-header{position:static}}`,
  editorial: `
[data-shell=editorial] .kit-header{max-width:var(--kit-max);margin:0 auto;width:100%;background:transparent;border-bottom:2px solid var(--kit-rule);justify-content:space-between;padding-inline:32px;padding-block:20px}
[data-shell=editorial] .kit-nav{margin-left:auto}[data-shell=editorial] .kit-brand{font-size:22px}[data-shell=editorial] .kit-brand-mark{background:transparent;color:var(--kit-text);border:2px solid var(--kit-text)}[data-shell=editorial] .kit-main{padding-block:var(--kit-sp-section-l)}
@media(max-width:640px){[data-shell=editorial] .kit-header{padding-inline:16px}}`,
  split: `
[data-shell=split]{--kit-side:300px;display:grid;grid-template-columns:var(--kit-side) minmax(0,1fr);align-items:start;background:linear-gradient(90deg,var(--kit-soft) var(--kit-side),transparent 0)}
[data-shell=split] .kit-header{position:sticky;top:0;height:100vh;flex-direction:column;align-items:flex-start;justify-content:center;gap:var(--kit-section);background:var(--kit-soft);border-right:1px solid var(--kit-rule);border-bottom:0;padding:32px 24px}
[data-shell=split] .kit-brand{font-size:24px}[data-shell=split] .kit-nav ul{flex-direction:column;flex-wrap:nowrap}[data-shell=split] .kit-nav{width:100%}
@media(max-width:1000px){[data-shell=split]{--kit-side:220px}}
@media(max-width:720px){[data-shell=split]{display:block;background:none}[data-shell=split] .kit-header{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:flex-start;border-right:0;border-bottom:1px solid var(--kit-rule);padding:12px 16px;gap:8px}[data-shell=split] .kit-nav ul{flex-direction:row;flex-wrap:nowrap;overflow-x:auto}[data-shell=split] .kit-brand{font-size:18px}}`,
  rail: `
[data-shell=rail]{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:start;background:linear-gradient(90deg,var(--kit-surface) 88px,transparent 0)}
[data-shell=rail] .kit-header{position:sticky;top:0;height:100vh;flex-direction:column;justify-content:flex-start;align-items:center;gap:16px;padding:16px 8px;border-right:1px solid var(--kit-border);border-bottom:0;overflow-y:auto}
[data-shell=rail] .kit-brand-name{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
[data-shell=rail] .kit-nav ul{flex-direction:column;flex-wrap:nowrap;gap:4px}[data-shell=rail] .kit-nav a{flex-direction:column;gap:2px;padding:8px 8px;font-size:12px;text-align:center;min-width:64px;white-space:normal;word-break:keep-all}[data-shell=rail] .kit-nav .kit-icon{width:24px;height:24px}
[data-shell=rail] .kit-header-action{margin-top:auto;padding-inline:12px;font-size:12px}
@media(max-width:720px){[data-shell=rail]{display:block;background:none}[data-shell=rail] .kit-header{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;border-right:0;border-bottom:1px solid var(--kit-border);padding:8px 16px}[data-shell=rail] .kit-nav ul{flex-direction:row;overflow-x:auto}[data-shell=rail] .kit-brand-name{position:static;width:auto;height:auto;clip:auto;clip-path:none}[data-shell=rail] .kit-header-action{margin:0}}`,
  centered: `
[data-shell=centered] .kit-header{flex-direction:column;justify-content:center;gap:12px;padding-block:24px}[data-shell=centered] .kit-header-action{margin-left:0;align-self:center}[data-shell=centered] .kit-brand{font-size:24px}[data-shell=centered] .kit-nav ul{justify-content:center}
@media(min-width:900px){[data-shell=centered] .kit-header{position:relative}[data-shell=centered] .kit-header-action{position:absolute;right:var(--kit-bleed);top:24px;margin:0}}
@media(max-width:640px){[data-shell=centered] .kit-nav ul{justify-content:flex-start}}`,
  stacked: `
[data-shell=stacked] .kit-header{flex-wrap:wrap;padding-block:12px 0;gap:0 var(--kit-gap)}[data-shell=stacked] .kit-brand{order:1}[data-shell=stacked] .kit-header-action{order:2;margin-left:auto;margin-bottom:12px}
[data-shell=stacked] .kit-nav{order:3;flex-basis:100%;border-top:1px solid var(--kit-border);margin-top:4px}[data-shell=stacked] .kit-nav a{border-radius:0;border-bottom:3px solid transparent}[data-shell=stacked] .kit-nav a[aria-current=page]{background:transparent;border-bottom-color:var(--kit-action)}[data-shell=stacked] .kit-brand{margin-bottom:12px}`,
  dock: `
[data-shell=dock] .kit-header{position:sticky;top:0;z-index:20;justify-content:space-between}[data-shell=dock] .kit-body{padding-bottom:calc(72px + env(safe-area-inset-bottom))}
[data-shell=dock] .kit-nav{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--kit-surface);border-top:1px solid var(--kit-border);padding-bottom:env(safe-area-inset-bottom)}
[data-shell=dock] .kit-nav ul{flex-wrap:nowrap;justify-content:space-around;gap:0}[data-shell=dock] .kit-nav li{flex:1}[data-shell=dock] .kit-nav a{flex-direction:column;justify-content:center;gap:2px;min-height:56px;padding:8px 4px;font-size:12px;border-radius:0}[data-shell=dock] .kit-nav .kit-icon{width:24px;height:24px}
@media(min-width:1000px){[data-shell=dock] .kit-body{padding-bottom:0}[data-shell=dock] .kit-header{justify-content:flex-start}[data-shell=dock] .kit-nav{position:static;border:0;background:transparent;padding:0;flex:1}[data-shell=dock] .kit-nav ul{justify-content:flex-start;gap:4px}[data-shell=dock] .kit-nav li{flex:none}[data-shell=dock] .kit-nav a{flex-direction:row;font-size:var(--kit-small);padding:0 12px;min-height:var(--kit-control);border-radius:var(--kit-r-control)}[data-shell=dock] .kit-nav .kit-icon{width:1.25em;height:1.25em}[data-shell=dock] .kit-header-action{margin-left:auto}}`,
  minimal: `
[data-shell=minimal] .kit-header{background:transparent;border-bottom:0;justify-content:space-between;max-width:var(--kit-max);margin:0 auto;width:100%;padding-inline:32px}[data-shell=minimal] .kit-nav{margin-left:auto}[data-shell=minimal] .kit-nav ul{flex-wrap:nowrap}[data-shell=minimal] .kit-footer{background:transparent;border-top:0}
@media(max-width:640px){[data-shell=minimal] .kit-header{padding-inline:16px}[data-shell=minimal] .kit-nav{margin-left:0}}`,
  masthead: `
[data-shell=masthead] .kit-header{flex-direction:column;gap:0;padding:0;background:transparent;border-bottom:0;max-width:var(--kit-max);margin:0 auto;width:100%;padding-inline:32px}
[data-shell=masthead] .kit-dateline{font-size:12px;letter-spacing:.14em;color:var(--kit-muted);width:100%;text-align:center;padding-block:8px;border-bottom:1px solid var(--kit-rule);margin:0}
[data-shell=masthead] .kit-brand{font-size:clamp(28px,6vw,56px);font-weight:var(--kit-hw);letter-spacing:-.03em;padding-block:20px 12px}[data-shell=masthead] .kit-brand-mark{display:none}
[data-shell=masthead] .kit-nav{width:100%;border-block:3px double var(--kit-rule)}[data-shell=masthead] .kit-nav ul{justify-content:center}[data-shell=masthead] .kit-header-action{margin-block:12px}
@media(max-width:640px){[data-shell=masthead] .kit-header{padding-inline:16px}[data-shell=masthead] .kit-nav ul{justify-content:flex-start}}`,
};
export const shellCSS = b => navBase + shells[b.shell] + footers[b.footer];
