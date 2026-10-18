#!/usr/bin/env node
/** Test-lab static checker: scans generated HTML without a browser.
 *  Every finding carries a code; every check reports how many elements it scanned
 *  (a check that found nothing to scan must say so — "not found" is not "pass").
 *
 *  Usage: node scripts/test-lab/check.mjs [--out site/test-lab]
 *  Library: checkHtml(html, {mode}) -> {pass, findings, stats}
 */
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {formRuntime} from '../../src/render.mjs';

export const EXPECTED_SCRIPT_HASH = createHash('sha256').update(formRuntime).digest('hex');
const EXPECTED_CSP = 'default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'; connect-src \'none\'';
// Mirrors VAGUE_LABELS in src/validate.mjs (validator rejects these at compile time;
// this scan proves none leaked into output). Sync test: tests/test-lab-check.test.mjs.
const VAGUE = new Set(['여기', '여기를 클릭', '클릭', '클릭하세요', 'click here', 'here', 'link', '링크', '이곳']);
export const SIZE_BUDGET = 200000;

const unescape = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'');
const textOf = inner => unescape(inner.replace(/<[^>]*>/g, '')).trim();
const attrsOf = tag => Object.fromEntries([...tag.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)].map(m => [m[1].toLowerCase(), m[2] ?? '']));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}(?=[\\s>])[^>]*>`, 'gi'))].map(m => m[0]);
const pairs = (html, name) => [...html.matchAll(new RegExp(`<${name}(?=[\\s>])[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi'))].map(m => ({tag: m[0].slice(0, m[0].indexOf('>') + 1), inner: m[1], index: m.index}));

export function checkHtml(html, {mode = 'light'} = {}) {
  const findings = [];
  const find = (code, detail) => { if (findings.filter(f => f.code === code).length < 10) findings.push({code, detail}); };
  const stats = {bytes: Buffer.byteLength(html), anchorsChecked: 0, idsChecked: 0, headingsChecked: 0, inputsChecked: 0, linksChecked: 0, tablesChecked: 0, formsChecked: 0, svgsChecked: 0, imgsChecked: 0, scriptsChecked: 0};

  if (!html.startsWith('<!doctype html>')) find('DOC_TYPE', 'missing doctype');
  const htmlTag = tags(html, 'html')[0] ?? '';
  if (!/lang="ko"/.test(htmlTag)) find('HTML_LANG', 'html lang is not ko');
  if (!/<meta charset="utf-8">/.test(html)) find('META_CHARSET', 'missing utf-8 meta');
  if (!/<meta name="viewport"[^>]*width=device-width/.test(html)) find('META_VIEWPORT', 'missing device-width viewport');
  const title = pairs(html, 'title')[0];
  if (!title || !textOf(title.inner)) find('DOC_TITLE', 'empty document title');
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  if (!csp || csp[1] !== EXPECTED_CSP) find('CSP', 'CSP meta missing or changed');
  const scheme = html.match(/<meta name="color-scheme" content="([^"]*)">/);
  const wantScheme = mode === 'auto' ? 'light dark' : mode;
  if (!scheme || scheme[1] !== wantScheme) find('COLOR_SCHEME', `want ${wantScheme}, got ${scheme?.[1]}`);
  if (!/<meta name="generator" content="Static Kit /.test(html)) find('GENERATOR_META', 'missing generator meta');

  // headings
  const heads = [...html.matchAll(/<(h[1-6])(?=[\s>])[^>]*>([\s\S]*?)<\/\1>/gi)];
  stats.headingsChecked = heads.length;
  const h1s = heads.filter(h => h[1] === 'h1');
  if (h1s.length !== 1) find('H1_COUNT', `h1 count ${h1s.length}`);
  let prev = 0;
  for (const h of heads) {
    const n = +h[1][1];
    if (!textOf(h[2])) find('EMPTY_HEADING', `empty ${h[1]}`);
    if (prev && n > prev + 1) find('HEADING_SKIP', `h${prev}→h${n}: ${textOf(h[2]).slice(0, 30)}`);
    prev = n;
  }

  // ids + anchors
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
  stats.idsChecked = ids.length;
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) find('DUP_ID', 'duplicate ids: ' + [...new Set(dup)].slice(0, 5).join(','));
  const idSet = new Set(ids);
  const labelledby = id => { const m = html.match(new RegExp(`<[^>]* id="${id}"[^>]*>([\\s\\S]*?)(?:<\\/[a-z]+>|\\/>)`, 'i')); return m ? textOf(m[1]) : ''; };
  const accName = (tag, inner) => { const a = attrsOf(tag); return (a['aria-label'] || (a['aria-labelledby'] ? labelledby(a['aria-labelledby']) : '') || textOf(inner)).trim(); };
  const links = pairs(html, 'a');
  stats.linksChecked = links.length;
  for (const l of links) {
    const a = attrsOf(l.tag), name = accName(l.tag, l.inner);
    stats.anchorsChecked += a.href?.startsWith('#') ? 1 : 0;
    if (a.href?.startsWith('#')) {
      const frag = a.href.slice(1);
      if (frag && !idSet.has(frag)) find('ANCHOR', `dangling #${frag}`);
    } else if (a.href) {
      try { const u = new URL(a.href); if (u.protocol !== 'https:' || u.username || u.password) find('EXTERNAL_URL', 'non-https link: ' + a.href.slice(0, 80)); }
      catch { find('EXTERNAL_URL', 'unparseable href: ' + String(a.href).slice(0, 80)); }
    }
    if (!name) find('EMPTY_NAME', 'unnamed link: ' + l.tag.slice(0, 80));
    else if (VAGUE.has(name.toLowerCase())) find('VAGUE_LABEL', 'vague label: ' + name);
  }
  for (const b of pairs(html, 'button')) {
    const name = accName(b.tag, b.inner);
    if (!name) find('EMPTY_NAME', 'unnamed button');
    else if (VAGUE.has(name.toLowerCase())) find('VAGUE_LABEL', 'vague button: ' + name);
  }

  // forms + inputs
  const labelFors = new Set(tags(html, 'label').map(t => attrsOf(t).for).filter(Boolean));
  const labelRegions = [...html.matchAll(/<label(?=[\s>])[^>]*>([\s\S]*?)<\/label>/gi)].map(m => [m.index, m.index + m[0].length]);
  const inLabel = idx => labelRegions.some(([s, e]) => idx > s && idx < e);
  for (const f of pairs(html, 'form')) {
    stats.formsChecked++;
    const a = attrsOf(f.tag);
    if (!a['aria-labelledby'] && !a['aria-label']) find('FORM_NAME', 'form without accessible name');
  }
  for (const m of html.matchAll(/<(input|select|textarea)(?=[\s>])[^>]*>/gi)) {
    if (/type="hidden"/.test(m[0])) continue;
    stats.inputsChecked++;
    const a = attrsOf(m[0]);
    const named = (a.id && labelFors.has(a.id)) || a['aria-label'] || a['aria-labelledby'] || inLabel(m.index);
    if (!named) find('UNLABELLED', 'unlabelled ' + (a.id || a.name || a.type || m[1]));
  }

  // tables, svg, media
  for (const t of pairs(html, 'table')) {
    stats.tablesChecked++;
    if (!/<caption(?=[\s>])/.test(t.tag) && !/<caption(?=[\s>])/.test(t.inner)) find('TABLE', 'table without caption');
    if (!/<th(?=[\s>])/.test(t.inner)) find('TABLE', 'table without headers');
  }
  for (const m of html.matchAll(/<svg(?=[\s>])[^>]*>([\s\S]*?)<\/svg>/gi)) {
    stats.svgsChecked++;
    const a = attrsOf(m[0].slice(0, m[0].indexOf('>') + 1));
    if (a['aria-hidden'] === 'true') continue;
    if (a.role === 'img' && !(a['aria-label'] || /<title(?=[\s>])/.test(m[1]))) find('SVG_NAME', 'unnamed svg[role=img]');
  }
  for (const m of html.matchAll(/<img(?=[\s>])[^>]*>/gi)) {
    stats.imgsChecked++;
    const a = attrsOf(m[0]);
    if (!a.alt?.trim()) find('IMG_ALT', 'img without alt');
    if (a.src && !a.src.startsWith('data:')) find('EXTERNAL_URL', 'non-data img src: ' + a.src.slice(0, 80));
  }

  // scripts + handlers + stray http
  const scripts = pairs(html, 'script');
  stats.scriptsChecked = scripts.length;
  if (scripts.length !== 1) find('SCRIPT_COUNT', `script count ${scripts.length}`);
  else if (createHash('sha256').update(scripts[0].inner).digest('hex') !== EXPECTED_SCRIPT_HASH) find('SCRIPT_HASH', 'unexpected inline script content');
  if (/\son[a-z]+\s*=/i.test(html.replace(/<script>[\s\S]*?<\/script>/, ''))) find('INLINE_HANDLER', 'inline event handler');
  const httpHits = [...html.matchAll(/(src|href)="http:\/\//g)];
  if (httpHits.length) find('EXTERNAL_URL', 'http: URL in ' + httpHits[0][1]);

  if (stats.bytes > SIZE_BUDGET) find('SIZE', `${stats.bytes} bytes over budget ${SIZE_BUDGET}`);
  return {pass: findings.length === 0, findings, stats};
}

/* ---------------- runner ---------------- */

async function main() {
  const raw = process.argv.slice(2);
  const out = raw[raw.indexOf('--out') + 1] ?? resolve(fileURLToPath(new URL('../..', import.meta.url)), 'site/test-lab');
  const t0 = Date.now();
  const manifest = JSON.parse(await readFile(resolve(out, 'manifest.json'), 'utf8'));
  const results = [];
  let fail = 0;
  const totals = {anchors: 0, ids: 0, headings: 0, inputs: 0, links: 0, tables: 0};
  for (const [i, e] of manifest.cases.entries()) {
    const html = await readFile(resolve(out, e.file), 'utf8');
    const r = checkHtml(html, {mode: e.mode});
    if (!r.pass) fail++;
    for (const [k, v] of [['anchors', 'anchorsChecked'], ['ids', 'idsChecked'], ['headings', 'headingsChecked'], ['inputs', 'inputsChecked'], ['links', 'linksChecked'], ['tables', 'tablesChecked']]) totals[k] += r.stats[v];
    results.push({id: e.id, pass: r.pass, findings: r.findings, stats: r.stats});
    if ((i + 1) % 500 === 0) console.log(`  ... ${i + 1}/${manifest.cases.length}`);
  }
  const byCode = {};
  for (const r of results) for (const f of r.findings) { byCode[f.code] ??= {count: 0, cases: []}; byCode[f.code].count++; if (byCode[f.code].cases.length < 10) byCode[f.code].cases.push(r.id); }
  const report = {checker: '1.0.0', seed: manifest.seed, catalogVersion: manifest.catalogVersion,
    summary: {cases: results.length, passed: results.length - fail, failed: fail, scanned: totals}, byCode,
    results: results.sort((a, b) => a.id < b.id ? -1 : 1)};
  await writeFile(resolve(out, 'check-report.json'), JSON.stringify(report, null, 1) + '\n');
  console.log(`CHECK: ${results.length} cases, ${results.length - fail} pass, ${fail} fail, codes=${JSON.stringify(Object.fromEntries(Object.entries(byCode).map(([k, v]) => [k, v.count])))} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (fail) process.exitCode = 1;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) await main();
