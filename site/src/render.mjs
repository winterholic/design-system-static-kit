export const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escapeHTML;
const button=a=>`<a class="kit-button" data-variant="${a.variant}" href="${e(a.href)}"${a.href.startsWith('https:')?' rel="noreferrer noopener"':''}>${e(a.label)}</a>`;
const messages={loading:['불러오는 중입니다.','잠시만 기다려 주세요.'],empty:['아직 항목이 없습니다.','새 항목을 추가하면 여기에 표시됩니다.'],error:['불러오지 못했습니다.','연결 상태를 확인한 후 다시 시도해 주세요.'],partial:['일부 항목만 표시합니다.','나머지 데이터는 현재 사용할 수 없습니다.'],forbidden:['접근 권한이 없습니다.','워크스페이스 관리자에게 권한을 요청하세요.']};
function stateMarkup(state){const m=messages[state];return m?`<div class="kit-state" data-state="${state}" role="${state==='error'?'alert':'status'}"${state==='loading'?' aria-busy="true"':''}><strong>${m[0]}</strong><p>${m[1]}</p></div>`:'';}
export function renderTree(b){
  let seq=0;
  function render(n,depth=2){
    const id='block-'+(++seq), h=Math.min(depth,6);
    const title=text=>`<h${h} id="${id}-title">${e(text)}</h${h}>`;
    switch(n.type){
      case 'page':return n.children.map(x=>render(x,2)).join('\n');
      case 'page-header':return `<header class="kit-page-header"><h1>${e(n.title)}</h1>${n.description?`<p>${e(n.description)}</p>`:''}</header>`;
      case 'section':return `<section class="kit-section" aria-labelledby="${id}-title">${title(n.title)}${n.children.map(x=>render(x,depth+1)).join('')}</section>`;
      case 'grid':return `<div class="kit-grid" data-columns="${n.columns}">${n.children.map(x=>render(x,depth)).join('')}</div>`;
      case 'card':return `<article class="kit-card">${n.meta?`<span class="kit-meta">${e(n.meta)}</span>`:''}${title(n.title)}<p>${e(n.body)}</p>${n.action?button(n.action):''}</article>`;
      case 'metric':return `<dl class="kit-metric"><dt>${e(n.label)}</dt><dd>${e(n.value)}</dd>${n.detail?`<dd class="kit-muted">${e(n.detail)}</dd>`:''}</dl>`;
      case 'hero':return `<section class="kit-hero" data-variant="${n.variant}" aria-labelledby="${id}-title"><div>${title(n.title)}<p>${e(n.body)}</p>${n.action?button(n.action):''}</div>${n.variant==='split'?'<div class="kit-composition" aria-hidden="true"><span></span><span></span><span></span><span></span></div>':''}</section>`;
      case 'notice':return `<aside class="kit-notice" data-tone="${n.tone}"${n.tone==='danger'?' role="alert"':''}><strong>${e(n.title)}</strong><p>${e(n.body)}</p></aside>`;
      case 'prose':return `<section class="kit-prose" aria-labelledby="${id}-title">${title(n.title)}<div>${n.body.split(/\n\n+/).map(p=>`<p>${e(p)}</p>`).join('')}</div></section>`;
      case 'actions':return `<div class="kit-actions">${n.items.map(button).join('')}</div>`;
      case 'list':{const s=n.state??(n.items.length?'ready':'empty');return `<section class="kit-list" aria-labelledby="${id}-title">${title(n.title)}${stateMarkup(s)}${['ready','partial'].includes(s)?`<ul>${n.items.map(x=>`<li><div><strong>${e(x.title)}</strong>${x.description?`<p>${e(x.description)}</p>`:''}</div>${x.status?`<span class="kit-badge">${e(x.status)}</span>`:''}</li>`).join('')}</ul>`:''}</section>`;}
      case 'table':{const s=n.state??(n.rows.length?'ready':'empty');return `<section class="kit-table-wrap" aria-labelledby="${id}-title">${title(n.title)}${stateMarkup(s)}${['ready','partial'].includes(s)?`<div class="kit-table-scroll" tabindex="0" role="region" aria-label="${e(n.caption)}"><table><caption>${e(n.caption)}</caption><thead><tr>${n.columns.map(c=>`<th scope="col">${e(c)}</th>`).join('')}</tr></thead><tbody>${n.rows.map(r=>`<tr>${r.map(c=>`<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}</section>`;}
      case 'form':return `<form class="kit-form" aria-labelledby="${id}-title">${title(n.title)}<p class="kit-muted">데모 · 입력 형식을 확인합니다. 서버에 저장하지 않습니다.</p><div class="kit-form-fields">${n.fields.map(f=>{const fid='field-'+f.id;return `<div class="kit-field"><label for="${fid}">${e(f.label)} <span class="kit-muted">(필수)</span></label>${f.type==='textarea'?`<textarea id="${fid}" name="${e(f.id)}" required maxlength="2000" placeholder="${e(f.placeholder??'')}"></textarea>`:f.type==='select'?`<select id="${fid}" name="${e(f.id)}" required><option value="">선택해 주세요</option>${f.options.map(o=>`<option>${e(o)}</option>`).join('')}</select>`:`<input id="${fid}" name="${e(f.id)}" type="${f.type}" required maxlength="200" placeholder="${e(f.placeholder??'')}">`}</div>`;}).join('')}</div><button class="kit-button" data-variant="primary" type="submit">${e(n.submitLabel)}</button><p class="kit-form-status" role="status" aria-live="polite"></p><noscript>데모 입력 확인은 JavaScript가 필요합니다.</noscript></form>`;
      default:throw new Error('Unreachable renderer: '+n.type);
    }
  }
  const body=render(b.tree);
  const nav=`<nav class="kit-nav" aria-label="페이지 탐색"><a class="kit-brand" href="#main"><span class="kit-brand-mark" aria-hidden="true">W</span>${e(b.name)}</a><div class="kit-nav-links"><a href="#main">개요</a><a href="#kit-footer">페이지 정보</a></div></nav>`;
  return `<a class="kit-skip" href="#main">본문 바로가기</a><div class="kit-shell" data-shell="${b.shell}">${nav}<main class="kit-main" id="main" tabindex="-1">${body}</main><footer class="kit-footer" id="kit-footer">${e(b.name)} · Static Kit ${e(b.catalogVersion)}</footer></div>`;
}
export const formRuntime=`document.querySelectorAll('.kit-form').forEach(function(form){form.addEventListener('submit',function(event){event.preventDefault();if(form.reportValidity()){form.querySelector('[role=status]').textContent='입력 형식을 확인했습니다. 데모이므로 저장하지 않았습니다.';}});});`;
