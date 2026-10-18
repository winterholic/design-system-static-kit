import {e, icon, href} from './util.mjs';
export {navLimits, iconShells} from '../catalog.mjs';

export const DEFAULT_CHROME = {nav: [{label: '개요', href: '#main'}]};

const mega = a => `<details class="kit-mega"><summary>${a.icon ? icon(a.icon) : ''}<span>${e(a.label)}</span>${icon('chevron-down')}</summary><div class="kit-mega-panel"><ul><li><a href="${href(a.href)}"><strong>${e(a.label)} 전체 보기</strong></a></li>${a.mega.map(m => `<li><a href="${href(m.href)}"${m.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}><strong>${e(m.label)}</strong>${m.description ? `<span>${e(m.description)}</span>` : ''}</a></li>`).join('')}</ul></div></details>`;
const link = (a, current) => `<a href="${href(a.href)}"${a.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}${current ? ' aria-current="page"' : ''}>${a.icon ? icon(a.icon) : ''}<span>${e(a.label)}</span></a>`;

export function renderShell(b, body) {
  const chrome = b.chrome ?? DEFAULT_CHROME, items = chrome.nav ?? DEFAULT_CHROME.nav;
  const firstCurrent = items.findIndex(x => x.href === '#main');
  const mark = e(chrome.brandMark ?? [...b.name.trim()][0] ?? 'W');
  const brand = `<a class="kit-brand" href="#main"><span class="kit-brand-mark" aria-hidden="true">${mark}</span><span class="kit-brand-name">${e(b.name)}</span></a>`;
  const nav = `<nav class="kit-nav" aria-label="주요 메뉴"${items.some(a => a.mega) ? ' data-mega' : ''}><ul>${items.map((a, i) => `<li>${a.mega ? mega(a) : link(a, i === firstCurrent)}</li>`).join('')}</ul></nav>`;
  const act = chrome.action ? `<a class="kit-button kit-header-action" data-variant="primary" href="${href(chrome.action.href)}"${chrome.action.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}>${e(chrome.action.label)}</a>` : '';
  const masthead = b.shell === 'masthead' ? '<p class="kit-dateline">정적 데모 · Static Kit</p>' : '';
  const header = `<header class="kit-header">${masthead}${brand}${nav}${act}</header>`;
  const links = chrome.footerLinks ?? [];
  const footerLinks = links.length ? `<ul class="kit-footer-links">${links.map(l => `<li><a href="${href(l.href)}"${l.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}>${e(l.label)}</a></li>`).join('')}</ul>` : '';
  const note = e(chrome.footerNote ?? `${b.name} · Static Kit ${b.catalogVersion}`);
  const footer = b.footer === 'columns'
    ? `<footer class="kit-footer" id="kit-footer"><div><strong>${e(b.name)}</strong><p>${note}</p></div><nav aria-label="바로가기"><strong>바로가기</strong><ul>${items.map(a => `<li><a href="${href(a.href)}">${e(a.label)}</a></li>`).join('')}</ul></nav>${links.length ? `<nav aria-label="안내"><strong>안내</strong>${footerLinks}</nav>` : ''}</footer>`
    : b.footer === 'minimal' ? `<footer class="kit-footer" id="kit-footer"><p>${note}</p></footer>`
      : `<footer class="kit-footer" id="kit-footer"><p>${note}</p>${footerLinks}</footer>`;
  return `<a class="kit-skip" href="#main">본문 바로가기</a><div class="kit-shell" data-shell="${b.shell}" data-footer="${b.footer}">${header}<div class="kit-body"><main class="kit-main" id="main" tabindex="-1">${body}</main>${footer}</div></div>`;
}
