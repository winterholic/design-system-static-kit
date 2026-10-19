const navBase = `
.kit-header{display:flex;align-items:center;gap:var(--kit-gap);padding:12px 24px;background:var(--kit-surface);border-bottom:1px solid var(--kit-border);min-width:0}
.kit-brand{display:flex;align-items:center;gap:10px;font-weight:700;text-decoration:none;color:var(--kit-text);font-size:18px;min-width:0;font-family:var(--kit-heading)}
.kit-brand-mark{flex:none;display:inline-grid;place-items:center;width:34px;height:34px;background:var(--kit-action);color:var(--kit-onAction);border-radius:var(--kit-r-tag);font-size:16px}
.kit-nav ul{list-style:none;margin:0;padding:0;display:flex;gap:4px;flex-wrap:wrap}
.kit-nav a{display:flex;align-items:center;gap:8px;min-height:var(--kit-control);padding:0 12px;text-decoration:none;font-size:var(--kit-small);color:var(--kit-muted);border-radius:var(--kit-r-control);white-space:nowrap}
.kit-nav a:hover{background:var(--kit-soft);color:var(--kit-link)}.kit-nav a[aria-current=page]{background:var(--kit-soft);color:var(--kit-text);font-weight:600}
.kit-body{min-width:0;display:flex;flex-direction:column;min-height:100vh}
.kit-main{flex:1;min-width:0;width:100%;max-width:var(--kit-max);margin:0 auto;padding:var(--kit-section) 32px;display:flex;flex-direction:column;gap:var(--kit-section)}
.kit-main:focus{outline:none}
[data-page=auth] .kit-main{max-width:min(var(--kit-max),560px);justify-content:center}[data-page=auth] .kit-page-header{align-items:center;text-align:center}[data-page=auth] .kit-page-header h1{max-width:20ch}[data-page=auth] .kit-form{padding:calc(var(--kit-inset) * 1.4)}
[data-page=error] .kit-main{justify-content:center}
.kit-footer{padding:24px 32px;color:var(--kit-muted);font-size:var(--kit-small);border-top:1px solid var(--kit-border);background:var(--kit-surface)}
.kit-footer p+p{margin-top:0}.kit-footer a{color:var(--kit-muted)}.kit-footer-links{list-style:none;display:flex;flex-wrap:wrap;gap:16px;margin:0;padding:0}
.kit-footer nav ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}.kit-footer strong{color:var(--kit-text)}
.kit-mega{position:relative}.kit-mega summary{display:flex;align-items:center;gap:8px;min-height:var(--kit-control);padding:0 12px;font-size:var(--kit-small);color:var(--kit-muted);border-radius:var(--kit-r-control);cursor:pointer;list-style:none;white-space:nowrap}.kit-mega summary::-webkit-details-marker{display:none}.kit-mega summary:hover,.kit-mega[open] summary{background:var(--kit-soft);color:var(--kit-link)}.kit-mega[open] summary .kit-icon:last-child{transform:rotate(180deg)}
.kit-mega-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:40;width:min(560px,92vw);padding:12px;background:var(--kit-surface);border:var(--kit-card-border);border-radius:var(--kit-radius);box-shadow:var(--kit-shadow-hover)}.kit-mega-panel ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.kit-mega-panel a{display:flex;flex-direction:column;gap:2px;padding:10px 12px;min-height:44px;color:var(--kit-text);text-decoration:none;border-radius:calc(var(--kit-radius) * .6);white-space:normal}.kit-mega-panel a:hover{background:var(--kit-soft)}.kit-mega-panel span{font-size:13px;color:var(--kit-muted)}
@media(max-width:1000px){.kit-main{padding-inline:24px}}
@media(max-width:640px){.kit-nav[data-mega] ul{flex-wrap:wrap;overflow:visible}.kit-mega-panel{position:static;width:100%;box-shadow:none}.kit-mega-panel ul{grid-template-columns:1fr}.kit-mega{width:100%}}
@media(max-width:640px){.kit-main{padding:var(--kit-inset) 16px calc(var(--kit-section) * .9);gap:calc(var(--kit-section) * .75)}.kit-header{padding:12px 16px;flex-wrap:wrap;gap:8px}.kit-header>.kit-header-action{order:1;margin-left:auto}.kit-header>.kit-nav{order:2;flex-basis:100%}.kit-nav{max-width:100%}.kit-nav ul{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin;padding-bottom:4px}.kit-brand{font-size:16px}.kit-footer{padding:16px}}
`;

const footers = {
  simple: '.kit-footer{display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;align-items:center}',
  minimal: '.kit-footer{text-align:center;padding-block:16px}',
  columns: '.kit-footer{display:grid;grid-template-columns:2fr 1fr 1fr;gap:var(--kit-gap);padding-block:40px;align-items:start}@media(max-width:720px){.kit-footer{grid-template-columns:1fr}}',
};

const shells = {
  sidebar: `
[data-shell=sidebar]{display:grid;grid-template-columns:240px minmax(0,1fr);align-items:start}
[data-shell=sidebar] .kit-header{position:sticky;top:0;height:100vh;flex-direction:column;align-items:stretch;gap:20px;padding:24px 16px;border-right:1px solid var(--kit-border);border-bottom:0;overflow-y:auto}
[data-shell=sidebar] .kit-nav ul{flex-direction:column;flex-wrap:nowrap}[data-shell=sidebar] .kit-header-action{margin-top:auto}
@media(max-width:1000px){[data-shell=sidebar]{grid-template-columns:196px minmax(0,1fr)}}
@media(max-width:720px){[data-shell=sidebar]{display:block}[data-shell=sidebar] .kit-header{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;border-right:0;border-bottom:1px solid var(--kit-border);padding:12px 16px}[data-shell=sidebar] .kit-nav ul{flex-direction:row;flex-wrap:nowrap;overflow-x:auto}[data-shell=sidebar] .kit-header-action{margin:0}}`,
  topbar: `
[data-shell=topbar] .kit-header{position:sticky;top:0;z-index:20}[data-shell=topbar] .kit-nav{flex:1}[data-shell=topbar] .kit-header-action{margin-left:auto}
@media(max-width:640px){[data-shell=topbar] .kit-header{position:static}}`,
  editorial: `
[data-shell=editorial] .kit-header{max-width:var(--kit-max);margin:0 auto;width:100%;background:transparent;border-bottom:2px solid var(--kit-rule);justify-content:space-between;padding-inline:32px;padding-block:20px}
[data-shell=editorial] .kit-nav{margin-left:auto}[data-shell=editorial] .kit-brand{font-size:22px}[data-shell=editorial] .kit-brand-mark{background:transparent;color:var(--kit-text);border:2px solid var(--kit-text)}[data-shell=editorial] .kit-main{padding-block:calc(var(--kit-section) * 1.2)}
@media(max-width:640px){[data-shell=editorial] .kit-header{padding-inline:16px}}`,
  split: `
[data-shell=split]{display:grid;grid-template-columns:300px minmax(0,1fr);align-items:start}
[data-shell=split] .kit-header{position:sticky;top:0;height:100vh;flex-direction:column;align-items:flex-start;justify-content:center;gap:var(--kit-section);background:var(--kit-soft);border-right:1px solid var(--kit-rule);border-bottom:0;padding:32px 24px}
[data-shell=split] .kit-brand{font-size:24px}[data-shell=split] .kit-nav ul{flex-direction:column;flex-wrap:nowrap}[data-shell=split] .kit-nav{width:100%}
@media(max-width:1000px){[data-shell=split]{grid-template-columns:220px minmax(0,1fr)}}
@media(max-width:720px){[data-shell=split]{display:block}[data-shell=split] .kit-header{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:flex-start;border-right:0;border-bottom:1px solid var(--kit-rule);padding:12px 16px;gap:8px}[data-shell=split] .kit-nav ul{flex-direction:row;flex-wrap:nowrap;overflow-x:auto}[data-shell=split] .kit-brand{font-size:18px}}`,
  rail: `
[data-shell=rail]{display:grid;grid-template-columns:88px minmax(0,1fr);align-items:start}
[data-shell=rail] .kit-header{position:sticky;top:0;height:100vh;flex-direction:column;justify-content:flex-start;align-items:center;gap:16px;padding:16px 8px;border-right:1px solid var(--kit-border);border-bottom:0;overflow-y:auto}
[data-shell=rail] .kit-brand-name{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
[data-shell=rail] .kit-nav ul{flex-direction:column;flex-wrap:nowrap;gap:6px}[data-shell=rail] .kit-nav a{flex-direction:column;gap:2px;padding:8px 6px;font-size:12px;text-align:center;min-width:64px;white-space:normal;word-break:keep-all}[data-shell=rail] .kit-nav .kit-icon{width:24px;height:24px}
[data-shell=rail] .kit-header-action{margin-top:auto;padding-inline:10px;font-size:12px}
@media(max-width:720px){[data-shell=rail]{display:block}[data-shell=rail] .kit-header{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;border-right:0;border-bottom:1px solid var(--kit-border);padding:8px 16px}[data-shell=rail] .kit-nav ul{flex-direction:row;overflow-x:auto}[data-shell=rail] .kit-brand-name{position:static;width:auto;height:auto;clip:auto;clip-path:none}[data-shell=rail] .kit-header-action{margin:0}}`,
  centered: `
[data-shell=centered] .kit-header{flex-direction:column;justify-content:center;gap:12px;padding-block:24px}[data-shell=centered] .kit-header-action{margin-left:0;align-self:center}[data-shell=centered] .kit-brand{font-size:24px}[data-shell=centered] .kit-nav ul{justify-content:center}
@media(max-width:640px){[data-shell=centered] .kit-nav ul{justify-content:flex-start}}`,
  stacked: `
[data-shell=stacked] .kit-header{flex-wrap:wrap;padding-block:12px 0;gap:0 var(--kit-gap)}[data-shell=stacked] .kit-brand{order:1}[data-shell=stacked] .kit-header-action{order:2;margin-left:auto;margin-bottom:12px}
[data-shell=stacked] .kit-nav{order:3;flex-basis:100%;border-top:1px solid var(--kit-border);margin-top:4px}[data-shell=stacked] .kit-nav a{border-radius:0;border-bottom:3px solid transparent}[data-shell=stacked] .kit-nav a[aria-current=page]{background:transparent;border-bottom-color:var(--kit-action)}[data-shell=stacked] .kit-brand{margin-bottom:12px}`,
  dock: `
[data-shell=dock] .kit-header{position:sticky;top:0;z-index:20;justify-content:space-between}[data-shell=dock] .kit-body{padding-bottom:calc(72px + env(safe-area-inset-bottom))}
[data-shell=dock] .kit-nav{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--kit-surface);border-top:1px solid var(--kit-border);padding-bottom:env(safe-area-inset-bottom)}
[data-shell=dock] .kit-nav ul{flex-wrap:nowrap;justify-content:space-around;gap:0}[data-shell=dock] .kit-nav li{flex:1}[data-shell=dock] .kit-nav a{flex-direction:column;justify-content:center;gap:2px;min-height:56px;padding:6px 4px;font-size:12px;border-radius:0}[data-shell=dock] .kit-nav .kit-icon{width:24px;height:24px}
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
