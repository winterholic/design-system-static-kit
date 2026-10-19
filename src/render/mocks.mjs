import {num} from './util.mjs';

/**
 * Product-UI mockups for hero and card slots. They carry a few real numbers and Korean labels so they read as a working
 * product rather than a wireframe; everything else is bars. Colors come from token classes (see coreCSS `.kit-art`).
 */
const f = num;
const rect = (x, y, w, h, c, rx = 0, ex = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${f(rx)}"` : ''} class="${c}"${ex ? ' ' + ex : ''}/>`;
const circ = (x, y, r, c, ex = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${c}"${ex ? ' ' + ex : ''}/>`;
const path = (d, c, ex = '') => `<path d="${d}" class="${c}"${ex ? ' ' + ex : ''}/>`;
const text = (x, y, t, size, c, weight = 600, anchor = '') => `<text x="${f(x)}" y="${f(y)}" class="${c}" font-size="${size}" font-weight="${weight}"${anchor ? ` text-anchor="${anchor}"` : ''}>${t}</text>`;
const bar = (x, y, w, c = 'a-6', h = 3.6) => rect(x, y, w, h, c, h / 2);
/** Catmull-Rom through points, as a cubic Bezier path. */
const smooth = pts => pts.map((p, i) => {
  if (!i) return `M${f(p[0])} ${f(p[1])}`;
  const a = pts[i - 2] ?? pts[i - 1], b = pts[i - 1], c = p, d = pts[i + 1] ?? p;
  return `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (d[0] - b[0]) / 6)} ${f(c[1] - (d[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
}).join('');
const card = (x, y, w, h, r = 5) => rect(x, y + 1.4, w, h, 'a-sh', r) + rect(x, y, w, h, 'a-5 bd', r);

export function chartMock(w, h, id) {
  const defs = `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s1" stop-opacity=".32"/><stop offset="1" class="s1" stop-opacity="0"/></linearGradient></defs>`;
  const pts = [[78, 178], [92, 168], [106, 172], [120, 156], [134, 160], [148, 142], [162, 148], [176, 130], [190, 134], [206, 120]];
  const pts2 = [[78, 182], [92, 180], [106, 178], [120, 174], [134, 176], [148, 168], [162, 170], [176, 162], [190, 164], [206, 158]];
  const d = smooth(pts);
  const out = [defs, rect(0, 0, w, h, 'a-5'), rect(0, 0, 58, h, 'a-bg'), path('M58 0V240', 'bdl')];
  out.push(circ(16, 16, 6, 'a-1'), rect(8.6, 12.4, 3, 3, 'a-5', 1), bar(26, 13.4, 22, 'a-3', 4.2));
  ['개요', '프로젝트', '일정', '리포트', '멤버', '설정'].forEach((t, i) => {
    const y = 38 + i * 19;
    if (i === 1) out.push(rect(6, y - 6, 46, 16, 'a-ac', 5));
    out.push(rect(12, y - 2.4, 7.4, 7.4, i === 1 ? 'a-1' : 'a-4', 2, i === 1 ? '' : 'opacity=".5"'), text(24, y + 3.6, t, 5.8, i === 1 ? 't3' : 't4', i === 1 ? 700 : 600));
  });
  out.push(circ(15, 223, 6, 'a-2'), bar(26, 218.6, 24, 'a-3', 3.4), bar(26, 224.6, 16, 'a-6', 3));
  // top bar
  out.push(path('M58 29H320', 'bdl'), rect(70, 8, 92, 13, 'a-6', 6.5), circ(79, 14.5, 3, 'k4s'), bar(86, 13, 30, 'a-4', 3), circ(272, 14.5, 7, 'a-6'), circ(274, 12.6, 1.8, 'a-2'), circ(296, 14.5, 7.4, 'a-2'));
  out.push(text(70, 47, '프로젝트 현황', 9.4, 't3', 800), rect(255, 37, 52, 13, 'a-1', 6.5), text(281, 45.6, '+ 새 작업', 5.6, 't6', 700, 'middle'));
  // KPI row
  [['활성 사용자', '12.8k', '+8.2%', 'a-gr'], ['작업 완료율', '94%', '+3.1%', 'a-gr'], ['평균 응답', '1.2초', '-0.4초', 'a-gr']].forEach(([l, v, tr], i) => {
    const x = 70 + i * 79;
    out.push(card(x, 58, 73, 46), text(x + 8, 71, l, 5.4, 't4'), text(x + 8, 88, v, 14, 't3', 800), rect(x + 8, 92, 28, 7.6, 'a-ac', 3.8), text(x + 22, 97.7, tr, 4.8, 't1', 700, 'middle'));
    out.push(path(`M${x + 46} 94 L${x + 51} 90 L${x + 56} 92 L${x + 61} 86 L${x + 66} 84`, 'k1', 'stroke-width="1.6" fill="none"'));
  });
  // chart card
  out.push(card(70, 112, 150, 100), text(78, 125, '주간 방문자', 6.6, 't3', 700), text(78, 133.4, '지난 7일, 전체 채널', 4.6, 't4'), rect(164, 119, 48, 11, 'a-6', 5.5), text(188, 126.7, '7일', 5, 't3', 700, 'middle'));
  [140, 152, 164, 176, 188].forEach(y => out.push(path(`M78 ${y + 10}H212`, 'bdl', 'opacity=".7"')));
  out.push(path(smooth(pts2), 'k4', 'stroke-width="1.4" stroke-dasharray="3 3" opacity=".6" fill="none"'));
  out.push(path(d + 'V198H78Z', 'ag', `fill="url(#${id}a)"`), path(d, 'a-s1', 'stroke-width="2.2"'));
  out.push(circ(176, 130, 3.4, 'a-5', 'stroke-width="1.8"'), circ(176, 130, 3.4, 'a-s1', 'fill="none" stroke-width="1.8"'), path('M176 134V198', 'k1', 'stroke-width=".8" stroke-dasharray="2 2" opacity=".5" fill="none"'));
  out.push(rect(158, 113, 36, 14, 'a-3', 4), text(176, 122.2, '1,284명', 5.6, 't6', 700, 'middle'), path('M173 127L176 130L179 127Z', 'a-3'));
  ['월', '화', '수', '목', '금', '토', '일'].forEach((t, i) => out.push(text(81 + i * 21.6, 206, t, 4.6, 't4', 600, 'middle')));
  // activity card
  out.push(card(228, 112, 84, 100), text(236, 125, '최근 활동', 6.4, 't3', 700));
  [['a-1', 28, '조립 규약 정리'], ['a-2', 22, '팔레트 후보 검토'], ['a-c3', 26, '릴리스 노트'], ['a-c4', 20, '접근성 점검']].forEach(([c, wv, t], i) => {
    const y = 135 + i * 17;
    out.push(circ(241, y + 6, 5.6, c), text(251, y + 4.6, t, 5, 't3', 700), bar(251, y + 8.4, wv + 14, 'a-6', 2.6), circ(303, y + 6, 2.2, i === 1 ? 'a-wm' : 'a-gr'));
  });
  // floating toast
  out.push(rect(176, 188 + 2, 134, 36, 'a-sh', 9, 'fill-opacity=".6"'), rect(174, 186, 134, 36, 'a-5 bd', 9), circ(190, 204, 7.4, 'a-gr'), path('M186.4 204L189 206.6L194 201.4', 'k5', 'stroke-width="1.8" fill="none"'), text(203, 202.6, '배포가 완료됐어요', 6.2, 't3', 700), text(203, 211.4, '방금 전 · 3개 환경에 반영', 4.8, 't4'), rect(278, 197, 24, 11, 'a-6', 5.5), text(290, 204.6, '보기', 4.8, 't3', 700, 'middle'));
  return out.join('');
}

export function deviceMock(w, h, id) {
  const pw = 100, ph = 208, x = (w - pw) / 2, y = (h - ph) / 2 + 2, cx = x + pw / 2;
  const out = [`<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="sa"/><stop offset="1" class="ss"/></linearGradient></defs>`, rect(0, 0, w, h, 'a-bg', 0, `fill="url(#${id}g)"`), circ(cx, h / 2, 104, 'a-5', 'opacity=".5"')];
  // side cards behind the phone
  out.push(card(18, 64, 74, 54, 8), text(28, 80, '이번 주 평균', 5.2, 't4'), text(28, 96, '4.6시간', 11.4, 't3', 800), path('M28 108L38 102L48 105L58 97L68 99L80 90', 'k1', 'stroke-width="1.8" fill="none"'));
  out.push(card(232, 128, 72, 56, 8), circ(250, 148, 8, 'a-ac'), path('M246 148L249 151L254.4 145', 'k1', 'stroke-width="1.8" fill="none"'), text(264, 147, '연속 12일', 5.6, 't3', 700), text(264, 155, '목표 달성 중', 4.6, 't4'), bar(242, 170, 52, 'a-6', 3.4), bar(242, 170, 36, 'a-1', 3.4));
  // phone
  out.push(rect(x - 3, y - 3, pw + 6, ph + 6, 'a-sh', 17, 'fill-opacity=".7"'), rect(x - 2, y - 2, pw + 4, ph + 4, 'a-3', 16), rect(x, y, pw, ph, 'a-5', 14));
  out.push(rect(cx - 15, y + 5, 30, 8, 'a-3', 4), text(x + 12, y + 12, '9:41', 5, 't3', 700), rect(x + pw - 28, y + 8, 14, 5, 'a-3', 1.6, 'opacity=".8"'), circ(x + pw - 9, y + 10.6, 2.2, 'a-3'));
  out.push(text(x + 10, y + 32, '오늘의 기록', 9, 't3', 800), text(x + 10, y + 42, '10월 19일 월요일', 5, 't4'));
  // ring
  const rx = cx, ry = y + 84, rr = 25, circum = 2 * Math.PI * rr;
  out.push(rect(x + 8, y + 52, pw - 16, 66, 'a-ac', 9), circ(rx, ry - 4 + 4, rr, 'k6', 'fill="none" stroke-width="7"'), `<circle cx="${f(rx)}" cy="${f(ry)}" r="${rr}" class="k1" stroke-width="7" stroke-dasharray="${f(circum * .72)} ${f(circum)}" transform="rotate(-90 ${f(rx)} ${f(ry)})" fill="none"/>`, text(rx, ry + 2.6, '72%', 11, 't3', 800, 'middle'), text(rx, ry + 10.6, '달성', 4.6, 't4', 600, 'middle'));
  // list
  [['아침 스트레칭', 'a-gr', 1], ['물 2리터 마시기', 'a-gr', 1], ['독서 30분', 'a-6', 0]].forEach(([t, c, done], i) => {
    const yy = y + 126 + i * 21;
    out.push(rect(x + 8, yy, pw - 16, 17, 'a-bg', 6), circ(x + 18, yy + 8.5, 5, done ? 'a-gr' : 'a-5 bd'), done ? path(`M${f(x + 15.6)} ${f(yy + 8.6)}L${f(x + 17.6)} ${f(yy + 10.6)}L${f(x + 21)} ${f(yy + 6.6)}`, 'k5', 'stroke-width="1.5" fill="none"') : '', text(x + 28, yy + 10.4, t, 5.4, done ? 't4' : 't3', 700));
  });
  out.push(rect(x + 14, y + ph - 14, pw - 28, 4, 'a-3', 2, 'opacity=".85"'));
  // floating chip
  out.push(rect(206, 52 + 2, 94, 30, 'a-sh', 10, 'fill-opacity=".6"'), rect(204, 50, 94, 30, 'a-5 bd', 10), circ(218, 65, 7, 'a-2'), text(229, 63.6, '회고가 도착했어요', 5.4, 't3', 700), text(229, 71.6, '지난 한 주 12개 기록', 4.6, 't4'));
  return out.join('');
}
