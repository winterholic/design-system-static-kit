import {e, icon, button, href, initials, stateMarkup, num} from './util.mjs';
import {mediaArt, ornamentArt, ratioCss} from './art.mjs';
import {renderChart} from './chart.mjs';

const PRIMARY_ICON = {info: 'info', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle'};
const EMPTY_ICON = {'first-use': 'sparkles', search: 'search', filter: 'filter', forbidden: 'lock', offline: 'wifi-off', 'not-found': 'map-pin', error: 'alert-circle', success: 'check-circle', maintenance: 'settings'};
const TREND = {up: ['trending-up', '증가'], down: ['trending-down', '감소'], flat: ['minus', '변동 없음']};
const STAR = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const bar = (n, c) => `<span class="kit-bar" style="width:${n}%"${c ? ` data-tone="${c}"` : ''}></span>`;

/** Each renderer: (node, depth, ctx, render) -> html. Heading level = min(depth, 6); only `section` raises depth. */
export function makeRenderer(b) {
  const ctx = {b, seq: 0, anchors: []};
  const collect = n => { if (n.type === 'section' && n.anchor) ctx.anchors.push({anchor: n.anchor, title: n.title}); n.children?.forEach(collect); };
  collect(b.tree);
  const o = b.ornament;
  const R = {};
  const kids = (n, depth) => n.children.map(x => render(x, depth)).join('');
  const heading = (depth, text, id, cls = '') => `<h${Math.min(depth, 6)} id="${id}-title"${cls ? ` class="${cls}"` : ''}>${e(text)}</h${Math.min(depth, 6)}>`;
  const eyebrow = t => t ? `<p class="kit-eyebrow">${e(t)}</p>` : '';
  const actionsRow = items => items?.length ? `<div class="kit-actions">${items.map(button).join('')}</div>` : '';
  const visual = (kind, ratio, label) => kind === 'ornament' ? ornamentArt(o) : mediaArt(kind, ratio, o, label);

  R.page = (n, d) => kids(n, 2);
  R['page-header'] = n => `<header class="kit-page-header" data-align="${n.align ?? 'start'}">${eyebrow(n.eyebrow)}<h1>${e(n.title)}</h1>${n.description ? `<p>${e(n.description)}</p>` : ''}${actionsRow(n.actions)}</header>`;
  R.hero = (n, d, id) => {
    const art = ['split', 'product'].includes(n.variant) && n.visual ? (n.visual === 'ornament' ? ornamentArt(o) : mediaArt(n.visual, n.variant === 'product' ? '4:3' : '4:3', o, '')) : '';
    const decorative = art.replace(' role="img" aria-label=""', ' aria-hidden="true"');
    return `<section class="kit-hero" data-variant="${n.variant}"${decorative ? ' data-visual="yes"' : ''} aria-labelledby="${id}-title"><div class="kit-hero-copy">${eyebrow(n.eyebrow)}${heading(d, n.title, id)}<p>${e(n.body)}</p>${actionsRow([n.action, n.secondaryAction].filter(Boolean))}</div>${decorative ? `<div class="kit-hero-visual">${decorative}</div>` : ''}</section>`;
  };
  R.section = (n, d, id) => `<section class="kit-section" data-surface="${n.surface ?? 'plain'}"${n.anchor ? ` id="s-${n.anchor}"` : ''} aria-labelledby="${id}-title"><div class="kit-section-inner">${eyebrow(n.eyebrow)}${heading(d, n.title, id)}${kids(n, d + 1)}</div></section>`;
  R.grid = (n, d) => `<div class="kit-grid" data-columns="${n.columns}">${kids(n, d)}</div>`;
  R.split = (n, d) => `<div class="kit-split" data-reverse="${n.reverse ?? 'normal'}" data-align="${n.align ?? 'center'}" data-ratio="${n.ratio ?? 'even'}">${n.children.map(x => `<div class="kit-split-cell">${render(x, d)}</div>`).join('')}</div>`;
  R.aside = (n, d) => {
    const main = `<div class="kit-aside-main">${render(n.children[0], d)}</div>`, side = `<aside class="kit-aside-side" aria-label="${e(n.label)}">${render(n.children[1], d)}</aside>`;
    return `<div class="kit-aside" data-side="${n.side}" data-sticky="${n.sticky ?? 'no'}" data-size="${n.size ?? 'narrow'}">${n.side === 'start' ? side + main : main + side}</div>`;
  };
  R.bento = (n, d) => `<div class="kit-bento" data-count="${n.children.length}">${n.children.map(x => `<div class="kit-bento-cell">${render(x, d)}</div>`).join('')}</div>`;
  R.tabs = (n, d, id) => {
    const tabs = n.children.map((t, i) => `<button type="button" role="tab" id="${id}-tab-${i}" aria-controls="${id}-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${e(t.label)}</button>`).join('');
    const panels = n.children.map((t, i) => `<div role="tabpanel" class="kit-tabpanel" id="${id}-panel-${i}" aria-labelledby="${id}-tab-${i}"${i ? ' hidden' : ''} tabindex="0">${kids(t, d)}</div>`).join('');
    return `<div class="kit-tabs" data-variant="${n.variant ?? 'underline'}" data-tabs><div class="kit-tablist" role="tablist" aria-label="${e(n.children.map(t => t.label).join(' · '))}">${tabs}</div>${panels}</div>`;
  };
  R.kanban = (n, d) => `<div class="kit-kanban" role="group" aria-label="칸반 보드" tabindex="0">${n.children.map(x => render(x, d)).join('')}</div>`;
  R.lane = (n, d, id) => `<section class="kit-lane" aria-labelledby="${id}-title"><header>${heading(d, n.title, id)}<span class="kit-count" aria-label="${n.children.length}개">${n.children.length}</span></header>${n.children.length ? `<div class="kit-lane-cards">${kids(n, d + 1)}</div>` : '<p class="kit-muted">비어 있습니다.</p>'}</section>`;
  R.task = n => `<article class="kit-task">${n.label ? `<span class="kit-badge">${e(n.label)}</span>` : ''}<strong>${e(n.title)}</strong><footer>${n.assignee ? `<span class="kit-avatar" aria-hidden="true">${e(initials(n.assignee))}</span><span>${e(n.assignee)}</span>` : ''}${n.priority ? `<span class="kit-priority" data-priority="${n.priority}">${icon(n.priority === '높음' ? 'arrow-up' : n.priority === '낮음' ? 'arrow-down' : 'minus')}${n.priority}</span>` : ''}</footer></article>`;
  R.timeline = (n, d, id) => `<section class="kit-timeline" aria-labelledby="${id}-title">${heading(d, n.title, id)}<ol>${n.items.map(x => `<li${x.status ? ` data-status="${x.status}"` : ''}><span class="kit-dot" aria-hidden="true">${x.status === '완료' ? icon('check') : ''}</span><div><time>${e(x.time)}</time><strong>${e(x.title)}</strong>${x.description ? `<p>${e(x.description)}</p>` : ''}${x.status ? `<span class="kit-badge">${x.status}</span>` : ''}</div></li>`).join('')}</ol></section>`;
  R.steps = (n, d, id) => `<section class="kit-steps" data-layout="${n.layout ?? 'vertical'}" aria-labelledby="${id}-title">${heading(d, n.title, id)}<ol>${n.items.map(x => `<li><strong>${e(x.title)}</strong>${x.description ? `<p>${e(x.description)}</p>` : ''}</li>`).join('')}</ol></section>`;
  R.reel = (n, d, id) => `<section class="kit-reel"${n.title ? ` aria-labelledby="${id}-title"` : ' aria-label="가로로 넘겨 보기"'}>${n.title ? heading(d, n.title, id) : ''}<div class="kit-reel-track" role="region" aria-label="${e(n.title ?? '가로로 넘겨 보기')}" tabindex="0">${n.children.map(x => `<div class="kit-reel-item">${render(x, d + 1)}</div>`).join('')}</div></section>`;
  R['master-detail'] = (n, d, id) => `<section class="kit-md" aria-labelledby="${id}-title">${heading(d, n.title, id)}<div class="kit-md-grid"><ul class="kit-md-list">${n.items.map((x, i) => `<li${i === n.selected ? ' aria-current="true"' : ''} data-state="${x.state ?? 'read'}"><strong>${e(x.title)}</strong>${x.meta ? `<span class="kit-muted">${e(x.meta)}</span>` : ''}<p>${e(x.preview)}</p>${x.state === 'unread' ? '<span class="kit-badge">읽지 않음</span>' : ''}</li>`).join('')}</ul><article class="kit-md-detail"><h${Math.min(d + 1, 6)}>${e(n.detail.title)}</h${Math.min(d + 1, 6)}>${n.detail.meta ? `<p class="kit-muted">${e(n.detail.meta)}</p>` : ''}<div>${n.detail.body.split(/\n\n+/).map(p => `<p>${e(p)}</p>`).join('')}</div></article></div></section>`;
  R.chat = (n, d, id) => `<section class="kit-chat" aria-labelledby="${id}-title">${heading(d, n.title, id)}<ol class="kit-chat-log">${n.messages.map(m => `<li data-from="${m.from}"><span class="kit-avatar" aria-hidden="true">${e(initials(m.name))}</span><div><p class="kit-chat-meta"><strong>${e(m.name)}</strong>${m.time ? ` <time>${e(m.time)}</time>` : ''}</p><p class="kit-bubble">${e(m.text)}</p></div></li>`).join('')}</ol></section>`;
  R.calendar = (n, d, id) => {
    const first = new Date(Date.UTC(n.year, n.month - 1, 1)).getUTCDay(), days = new Date(Date.UTC(n.year, n.month, 0)).getUTCDate();
    const byDay = new Map(); n.events.forEach(ev => byDay.set(ev.day, [...(byDay.get(ev.day) ?? []), ev.title]));
    const cells = []; for (let i = 0; i < first; i++) cells.push('<td class="kit-off"></td>'); for (let day = 1; day <= days; day++) cells.push(`<td${byDay.has(day) ? ' data-event="yes"' : ''}><span class="kit-day">${day}</span>${byDay.has(day) ? `<ul>${byDay.get(day).map(t => `<li>${e(t)}</li>`).join('')}</ul>` : ''}</td>`);
    while (cells.length % 7) cells.push('<td class="kit-off"></td>');
    const rows = []; for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);
    const wd = ['일', '월', '화', '수', '목', '금', '토'];
    return `<section class="kit-calendar" aria-labelledby="${id}-title">${heading(d, n.title, id)}<div class="kit-table-scroll" tabindex="0" role="region" aria-label="${n.year}년 ${n.month}월 달력"><table><caption>${n.year}년 ${n.month}월</caption><thead><tr>${wd.map(w => `<th scope="col">${w}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div></section>`;
  };
  R.card = (n, d, id) => {
    const v = n.variant ?? 'basic';
    const art = n.visual ? `<div class="kit-card-media" style="aspect-ratio:${ratioCss(n.ratio ?? '16:9')}">${mediaArt(n.visual, n.ratio ?? '16:9', o, '').replace(' role="img" aria-label=""', ' aria-hidden="true"')}</div>` : '';
    const link = v === 'link' ? `<a class="kit-stretch" href="${href(n.action.href)}"${n.action.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}>${heading(d, n.title, id)}</a>` : heading(d, n.title, id);
    return `<article class="kit-card" data-variant="${v}">${art}<div class="kit-card-body">${n.icon ? `<span class="kit-card-icon">${icon(n.icon)}</span>` : ''}${n.meta ? `<span class="kit-meta">${e(n.meta)}</span>` : ''}${n.badge ? `<span class="kit-badge" data-tone="brand">${e(n.badge)}</span>` : ''}${link}<p>${e(n.body)}</p>${n.action ? (v === 'link' ? `<span class="kit-link-label" aria-hidden="true">${e(n.action.label)} ${icon('arrow-right')}</span>` : button(n.action)) : ''}</div></article>`;
  };
  R.metric = n => `<dl class="kit-metric"><dt>${e(n.label)}</dt><dd>${e(n.value)}</dd>${n.trend ? `<dd class="kit-trend" data-trend="${n.trend}">${icon(TREND[n.trend][0])}<span class="kit-sr">${TREND[n.trend][1]}</span>${e(n.delta)}</dd>` : ''}${n.detail ? `<dd class="kit-muted">${e(n.detail)}</dd>` : ''}</dl>`;
  R.table = (n, d, id) => { const s = n.state ?? (n.rows.length ? 'ready' : 'empty'); return `<section class="kit-table-wrap" data-variant="${n.variant ?? 'plain'}" aria-labelledby="${id}-title">${heading(d, n.title, id)}${stateMarkup(s)}${['ready', 'partial'].includes(s) ? `<div class="kit-table-scroll" tabindex="0" role="region" aria-label="${e(n.caption)}"><table><caption>${e(n.caption)}</caption><thead><tr>${n.columns.map(c => `<th scope="col">${e(c)}</th>`).join('')}</tr></thead><tbody>${n.rows.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${e(c)}</th>` : `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}</section>`; };
  R.list = (n, d, id) => { const s = n.state ?? (n.items.length ? 'ready' : 'empty'), v = n.variant ?? 'divided'; return `<section class="kit-list" data-variant="${v}" aria-labelledby="${id}-title">${heading(d, n.title, id)}${stateMarkup(s)}${['ready', 'partial'].includes(s) ? `<ul>${n.items.map(x => `<li>${v === 'check' ? `<span class="kit-check" aria-hidden="true">${icon('check')}</span>` : x.icon ? `<span class="kit-li-icon">${icon(x.icon)}</span>` : ''}<div><strong>${e(x.title)}</strong>${x.description ? `<p>${e(x.description)}</p>` : ''}${x.meta ? `<span class="kit-muted">${e(x.meta)}</span>` : ''}</div>${x.status ? `<span class="kit-badge" data-status="${x.status}">${e(x.status)}</span>` : ''}</li>`).join('')}</ul>` : ''}</section>`; };
  R.form = (n, d, id) => {
    const fieldHTML = f => {
      const fid = 'field-' + f.id, req = (f.requirement ?? (['checkbox', 'switch'].includes(f.type) ? 'optional' : 'required')) === 'required', helpId = f.help ? ` aria-describedby="${fid}-help"` : '';
      const tag = req ? '<span class="kit-muted">(필수)</span>' : '<span class="kit-muted">(선택)</span>', R_ = req ? ' required' : '', help = f.help ? `<p class="kit-help" id="${fid}-help">${e(f.help)}</p>` : '';
      if (f.type === 'textarea') return `<div class="kit-field"><label for="${fid}">${e(f.label)} ${tag}</label><textarea id="${fid}" name="${e(f.id)}"${R_} maxlength="2000" placeholder="${e(f.placeholder ?? '')}"${helpId}></textarea>${help}</div>`;
      if (f.type === 'select') return `<div class="kit-field"><label for="${fid}">${e(f.label)} ${tag}</label><select id="${fid}" name="${e(f.id)}"${R_}${helpId}><option value="">선택해 주세요</option>${f.options.map(x => `<option>${e(x)}</option>`).join('')}</select>${help}</div>`;
      if (f.type === 'radio') return `<fieldset class="kit-field kit-choice"><legend>${e(f.label)} ${tag}</legend>${f.options.map((x, i) => `<label class="kit-check-row"><input type="radio" name="${e(f.id)}" value="${e(x)}"${R_ && i === 0 ? ' required' : ''}><span>${e(x)}</span></label>`).join('')}${help}</fieldset>`;
      if (f.type === 'checkbox') return `<div class="kit-field kit-choice"><label class="kit-check-row" for="${fid}"><input type="checkbox" id="${fid}" name="${e(f.id)}"${R_}${helpId}><span>${e(f.label)} ${tag}</span></label>${help}</div>`;
      if (f.type === 'switch') return `<div class="kit-field kit-choice"><label class="kit-switch" for="${fid}"><input type="checkbox" role="switch" id="${fid}" name="${e(f.id)}"${R_}${helpId}><i aria-hidden="true"></i><span>${e(f.label)} ${tag}</span></label>${help}</div>`;
      const ac = f.type === 'password' ? ' autocomplete="current-password"' : f.type === 'email' ? ' autocomplete="email"' : '';
      return `<div class="kit-field"><label for="${fid}">${e(f.label)} ${tag}</label><input id="${fid}" name="${e(f.id)}" type="${f.type}"${R_} maxlength="200" placeholder="${e(f.placeholder ?? '')}"${ac}${helpId}>${help}</div>`;
    };
    return `<form class="kit-form" data-variant="${n.variant ?? 'stacked'}" aria-labelledby="${id}-title" novalidate>${heading(d, n.title, id)}<p class="kit-muted">${e(n.intro ?? '데모 · 입력 형식을 확인합니다. 서버에 저장하지 않습니다.')}</p><div class="kit-form-fields">${n.fields.map(fieldHTML).join('')}</div><button class="kit-button" data-variant="primary" type="submit">${e(n.submitLabel)}</button><p class="kit-form-status" role="status" aria-live="polite"></p><noscript>데모 입력 확인은 JavaScript가 필요합니다.</noscript></form>`;
  };
  R.prose = (n, d, id) => `<section class="kit-prose" data-variant="${n.variant ?? 'body'}" aria-labelledby="${id}-title">${heading(d, n.title, id)}<div>${n.body.split(/\n\n+/).map(p => `<p>${e(p)}</p>`).join('')}</div></section>`;
  R.notice = n => { const v = n.variant ?? 'inline'; return `<aside class="kit-notice" data-tone="${n.tone}" data-variant="${v}"${n.tone === 'danger' ? ' role="alert"' : v === 'toast' ? ' role="status"' : ''} aria-label="${e(n.title)}"><span class="kit-notice-icon">${icon(PRIMARY_ICON[n.tone])}</span><div><strong>${e(n.title)}</strong><p>${e(n.body)}</p></div></aside>`; };
  R.actions = n => `<div class="kit-actions" data-align="${n.align ?? 'start'}">${n.items.map(button).join('')}</div>`;
  R.faq = (n, d, id) => `<section class="kit-faq" aria-labelledby="${id}-title">${heading(d, n.title, id)}<div>${n.items.map(x => `<details><summary>${e(x.question)}${icon('chevron-down')}</summary><p>${e(x.answer)}</p></details>`).join('')}</div></section>`;
  R.quote = n => `<figure class="kit-quote"><blockquote><p>${e(n.quote)}</p></blockquote><figcaption><span class="kit-avatar" aria-hidden="true">${e(initials(n.author))}</span><span><strong>${e(n.author)}</strong>${n.role ? ` <span class="kit-muted">${e(n.role)}</span>` : ''}</span></figcaption></figure>`;
  R['feature-list'] = (n, d, id) => `<section class="kit-features" data-layout="${n.layout ?? 'grid'}"${n.title ? ` aria-labelledby="${id}-title"` : ' aria-label="기능 목록"'}>${n.title ? heading(d, n.title, id) : ''}<ul>${n.items.map(x => `<li><span class="kit-card-icon">${icon(x.icon)}</span><div><strong>${e(x.title)}</strong>${x.description ? `<p>${e(x.description)}</p>` : ''}</div></li>`).join('')}</ul></section>`;
  R['logo-cloud'] = (n, d, id) => `<section class="kit-logos" aria-labelledby="${id}-title">${heading(d, n.title, id, 'kit-quiet')}<ul>${n.names.map(x => `<li>${e(x)}</li>`).join('')}</ul></section>`;
  R.cta = (n, d, id) => `<section class="kit-cta" data-tone="${n.tone ?? 'plain'}" aria-labelledby="${id}-title"><div>${heading(d, n.title, id)}${n.body ? `<p>${e(n.body)}</p>` : ''}</div>${actionsRow([n.action, n.secondaryAction].filter(Boolean))}</section>`;
  R.tags = (n, d, id) => `<section class="kit-tags" data-variant="${n.variant ?? 'chips'}"${n.title ? ` aria-labelledby="${id}-title"` : ' aria-label="태그"'}>${n.title ? heading(d, n.title, id, 'kit-quiet') : ''}<ul>${n.items.map(x => `<li>${e(x)}</li>`).join('')}</ul></section>`;
  R.team = (n, d, id) => `<section class="kit-team" aria-labelledby="${id}-title">${heading(d, n.title, id)}<ul>${n.members.map(m => `<li><span class="kit-avatar" aria-hidden="true">${e(initials(m.name))}</span><div><strong>${e(m.name)}</strong><span class="kit-muted">${e(m.role)}</span>${m.bio ? `<p>${e(m.bio)}</p>` : ''}</div></li>`).join('')}</ul></section>`;
  R.code = n => `<figure class="kit-code"><figcaption>${e(n.label)} <span class="kit-muted">${n.language}</span></figcaption><pre tabindex="0"><code>${e(n.code)}</code></pre></figure>`;
  R.properties = (n, d, id) => `<section class="kit-props" data-layout="${n.layout ?? 'stacked'}" aria-labelledby="${id}-title">${heading(d, n.title, id)}<dl>${n.items.map(x => `<div><dt>${e(x.label)}</dt><dd>${e(x.value)}</dd></div>`).join('')}</dl></section>`;
  R.chart = (n, d, id) => renderChart(n, id);
  R.progress = n => `<div class="kit-progress"><div class="kit-progress-head"><span id="pr-${ctx.seq}">${e(n.label)}</span><strong>${n.value}%</strong></div><div class="kit-track" role="progressbar" aria-labelledby="pr-${ctx.seq}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n.value}"${n.detail ? ` aria-valuetext="${e(n.detail)}"` : ''}>${bar(n.value, n.tone)}</div>${n.detail ? `<p class="kit-muted">${e(n.detail)}</p>` : ''}</div>`;
  R['empty-state'] = (n, d, id) => `<section class="kit-empty" data-kind="${n.kind}"${['error', 'forbidden', 'offline', 'maintenance'].includes(n.kind) ? ' role="alert"' : ' role="status"'} aria-labelledby="${id}-title"><div class="kit-empty-art">${ornamentArt(o, 240, 160) || ''}<span class="kit-empty-icon">${icon(n.icon ?? EMPTY_ICON[n.kind])}</span></div>${heading(d, n.title, id)}<p>${e(n.body)}</p>${n.action ? button(n.action) : ''}</section>`;
  R.skeleton = n => `<div class="kit-skeleton" data-variant="${n.variant}" role="status" aria-busy="true" aria-label="${e(n.label)}">${n.variant === 'card' ? '<i class="sk-img"></i><i></i><i class="sk-short"></i>' : n.variant === 'table' ? '<i></i><i></i><i></i><i></i>' : n.variant === 'list' ? '<i></i><i class="sk-short"></i><i></i><i class="sk-short"></i>' : '<i></i><i></i><i class="sk-short"></i>'}</div>`;
  R.media = n => `<figure class="kit-media"><div class="kit-art-box" style="aspect-ratio:${ratioCss(n.ratio)}">${mediaArt(n.kind, n.ratio, o, e(n.alt))}</div>${n.caption ? `<figcaption>${e(n.caption)}</figcaption>` : ''}</figure>`;
  R.gallery = (n, d, id) => {
    const ratioAt = i => n.layout === 'masonry' ? ['4:3', '3:4', '1:1', '16:9'][i % 4] : '4:3';
    return `<section class="kit-gallery" data-layout="${n.layout ?? 'grid'}"${n.title ? ` aria-labelledby="${id}-title"` : ' aria-label="갤러리"'}>${n.title ? heading(d, n.title, id) : ''}<ul>${n.items.map((x, i) => `<li><figure class="kit-media"><div class="kit-art-box" style="aspect-ratio:${ratioCss(ratioAt(i))}">${mediaArt(x.kind, ratioAt(i), o, e(x.alt))}</div>${x.caption ? `<figcaption>${e(x.caption)}</figcaption>` : ''}</figure></li>`).join('')}</ul></section>`;
  };
  R.breadcrumb = n => `<nav class="kit-breadcrumb" aria-label="현재 위치"><ol>${n.items.map((x, i) => i === n.items.length - 1 ? `<li><span aria-current="page">${e(x.label)}</span></li>` : `<li><a href="${href(x.href ?? '#main')}">${e(x.label)}</a>${icon('chevron-right')}</li>`).join('')}</ol></nav>`;
  R.pagination = n => {
    const pages = []; for (let i = 1; i <= n.pages; i++) if (i === 1 || i === n.pages || Math.abs(i - n.current) <= 1) pages.push(i); else if (pages.at(-1) !== '…') pages.push('…');
    return `<nav class="kit-pagination" aria-label="페이지 이동"><ul><li><a href="#main" aria-label="이전 페이지"${n.current === 1 ? ' aria-disabled="true"' : ''}>${icon('chevron-right', 'kit-flip')}</a></li>${pages.map(p => p === '…' ? '<li><span aria-hidden="true">…</span></li>' : `<li><a href="#main"${p === n.current ? ' aria-current="page"' : ''}>${p}<span class="kit-sr"> 페이지</span></a></li>`).join('')}<li><a href="#main" aria-label="다음 페이지"${n.current === n.pages ? ' aria-disabled="true"' : ''}>${icon('chevron-right')}</a></li></ul></nav>`;
  };
  R['filter-bar'] = n => `<div class="kit-filterbar" role="search"><label class="kit-search">${icon('search')}<span class="kit-sr">검색</span><input type="search" placeholder="${e(n.placeholder)}" maxlength="100"></label><div class="kit-chips" role="group" aria-label="필터">${n.filters.map((f, i) => `<button type="button" aria-pressed="${i === n.selected}">${e(f)}</button>`).join('')}</div></div>`;
  R.stepper = n => `<nav class="kit-stepper" aria-label="진행 단계"><ol>${n.steps.map((s, i) => `<li${i + 1 === n.current ? ' aria-current="step"' : ''} data-done="${i + 1 < n.current}"><span class="kit-step-n" aria-hidden="true">${i + 1 < n.current ? icon('check') : i + 1}</span><span>${e(s)}</span>${i + 1 < n.current ? '<span class="kit-sr"> 완료</span>' : ''}</li>`).join('')}</ol></nav>`;
  R.summary = (n, d, id) => `<section class="kit-summary" aria-labelledby="${id}-title">${heading(d, n.title, id)}<dl>${n.items.map(x => `<div><dt>${e(x.label)}</dt><dd>${e(x.value)}</dd></div>`).join('')}<div class="kit-total"><dt>${e(n.total.label)}</dt><dd>${e(n.total.value)}</dd></div></dl>${n.action ? button(n.action) : ''}</section>`;
  R['buy-box'] = (n, d, id) => `<section class="kit-buybox" aria-labelledby="${id}-title">${n.badge ? `<span class="kit-badge" data-tone="brand">${e(n.badge)}</span>` : ''}${heading(d, n.title, id)}<p class="kit-price">${e(n.price)}</p>${n.note ? `<p class="kit-muted">${e(n.note)}</p>` : ''}${(n.options ?? []).map((opt, oi) => `<fieldset class="kit-options"><legend>${e(opt.label)}</legend>${opt.choices.map((c, ci) => `<label><input type="radio" name="${id}-opt-${oi}" value="${e(c)}"${ci === 0 ? ' checked' : ''}><span>${e(c)}</span></label>`).join('')}</fieldset>`).join('')}${actionsRow([n.action, n.secondaryAction].filter(Boolean))}</section>`;
  R.reviews = (n, d, id) => `<section class="kit-reviews" aria-labelledby="${id}-title">${heading(d, n.title, id)}<p class="kit-score"><strong>${e(n.score)}</strong> <span aria-hidden="true">${STAR(Math.round(Number.parseFloat(n.score)) || 0)}</span> <span class="kit-muted">${e(n.count)}</span></p><ul>${n.items.map(x => `<li><p class="kit-stars" role="img" aria-label="5점 만점에 ${x.rating}점">${STAR(x.rating)}</p><p>${e(x.text)}</p><p class="kit-muted">${e(x.author)}${x.date ? ` · ${e(x.date)}` : ''}</p></li>`).join('')}</ul></section>`;
  R.menu = (n, d, id) => `<section class="kit-menu" data-layout="${n.layout}" aria-labelledby="${id}-title">${heading(d, n.title, id)}<ul>${n.items.map(x => `<li><div class="kit-menu-row"><strong>${e(x.name)}</strong>${n.layout === 'leader' ? '<i class="kit-leader" aria-hidden="true"></i>' : ''}<span class="kit-menu-price">${e(x.price)}</span></div>${x.tag ? `<span class="kit-badge" data-tone="brand">${e(x.tag)}</span>` : ''}${x.description ? `<p class="kit-muted">${e(x.description)}</p>` : ''}</li>`).join('')}</ul></section>`;
  R.links = (n, d, id) => `<section class="kit-links" aria-labelledby="${id}-title">${heading(d, n.title, id)}<ul>${n.items.map(x => `<li><a href="${href(x.href)}"${x.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}>${e(x.label)}${icon('arrow-right')}</a>${x.description ? `<p class="kit-muted">${e(x.description)}</p>` : ''}</li>`).join('')}</ul></section>`;
  R.divider = n => n.label ? `<div class="kit-divider" role="separator"><span>${e(n.label)}</span></div>` : '<hr class="kit-hr">';
  R.pricing = (n, d, id) => `<section class="kit-pricing"${n.title ? ` aria-labelledby="${id}-title"` : ' aria-label="요금제"'}>${n.title ? heading(d, n.title, id) : ''}<div class="kit-plans" data-count="${n.children.length}">${n.children.map(x => render(x, n.title ? d + 1 : d)).join('')}</div></section>`;
  R.plan = (n, d, id) => `<article class="kit-plan"${n.featured ? ' data-featured="yes"' : ''}>${n.featured ? '<span class="kit-badge" data-tone="brand">추천</span>' : ''}${heading(d, n.name, id)}<p class="kit-price">${e(n.price)}${n.period ? ` <span class="kit-muted">/ ${e(n.period)}</span>` : ''}</p>${n.description ? `<p class="kit-muted">${e(n.description)}</p>` : ''}<ul>${n.features.map(f => `<li>${icon('check')}${e(f)}</li>`).join('')}</ul>${button(n.action)}</article>`;
  R.toc = n => `<nav class="kit-toc" aria-label="${e(n.title ?? '목차')}"><strong>${e(n.title ?? '목차')}</strong><ol>${ctx.anchors.map(a => `<li><a href="#s-${a.anchor}">${e(a.title)}</a></li>`).join('')}</ol></nav>`;

  function render(n, depth = 2) {
    const id = 'block-' + (++ctx.seq);
    const fn = R[n.type];
    if (!fn) throw new Error('Unreachable renderer: ' + n.type);
    return fn(n, depth, id);
  }
  return {render, ctx, num};
}
