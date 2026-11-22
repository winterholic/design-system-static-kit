/**
 * docs/platform/typography.md의 표를 레지스트리·표에서 생성한다. 문서의 `<!-- type-table:<이름> -->` 표시 사이를 이 출력으로 채운다.
 *   node docs/platform/evidence/type/tables.mjs --write    문서를 갱신
 * tests/platform-type-evidence.test.mjs가 문서와 이 출력이 같은지 검사한다(표가 코드와 어긋나지 않게).
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createPlatform} from '../../../../src/platform/examples/minimal.mjs';
import {bindType, effectiveFaces, splitStack, webfontPlan, scaleProfile, FLOORS} from '../../../../src/platform/type.mjs';
import {TYPE_FIT} from '../../../../src/platform/data/type-systems.mjs';
import {FACE_PAIRINGS, ROLE_SCALES, LEGACY_MIGRATION, WEBFONTS, SCALE_ROLES} from '../../../../src/platform/data/type-materials.mjs';
import {definePlatformMaterial} from '../../../../src/platform/contract.mjs';
import {HANGUL} from '../../../../src/typography.mjs';
import {MATERIAL_TYPE_PRESETS} from '../../../../src/materials/typography.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const metrics = JSON.parse(readFileSync(join(here, 'metrics.json'), 'utf8'));
const DOC = join(here, '..', '..', 'typography.md');
const env = createPlatform();
const systems = env.registry.list('type-system');
const short = id => id.slice(id.indexOf(':') + 1);
const row = cells => `| ${cells.join(' | ')} |`;
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const first = stack => splitStack(stack)[0];
const mdc = s => String(s).replaceAll('|', '\\|');
const whenText = w => Object.entries(w).map(([k, v]) => `${k}=${v.join('/')}`).join(' · ') || '조건 없음';
const sys = id => systems.find(s => s.id === id);
const isNew = s => s.id !== 'type-system:tech-erp';
const sizeText = r => (r.sizePx.mobile === r.sizePx.desktop ? `${r.sizePx.desktop}` : `${r.sizePx.mobile}→${r.sizePx.desktop}`);
const scaleOf = s => (s.roleScale.startsWith('role-scale:') ? ROLE_SCALES[s.roleScale] : null);
/** 구형 조합(tech-erp)은 역할 크기를 문자열로 갖는다. 표에는 bindType이 낸 값을 같은 모양으로 읽는다. */
const rolesOf = s => { const b = bindType(s); return Object.fromEntries(SCALE_ROLES.filter(r => b.roles[r]).map(r => [r, {...b.roles[r], sizePx: b.roles[r].sizePx ?? parseLegacy(b.roles[r].size)}])); };
const parseLegacy = size => { const m = /^([\d.]+)px$/.exec(size) ?? null; if (m) return {mobile: +m[1], desktop: +m[1]}; const c = /^clamp\(([\d.]+)rem,[\d.]+vw,([\d.]+)rem\)$/.exec(size); return {mobile: +c[1] * 16, desktop: +c[2] * 16}; };

export const TABLES = {
  systems: () => table(['id', '용도', '페이지 유형', '서체 짝', '역할 체계', '밀도', '숫자'], systems.map(s => [`\`${s.id}\``, s.tags[0], s.contexts.join(', '), `\`${s.facePairing}\``, `\`${s.roleScale}\``, (ROLE_SCALES[s.roleScale] ?? MATERIAL_TYPE_PRESETS[s.roleScale.replace('type-role-preset:', '')]).density, s.numerals])),

  sizes: () => table(['시스템', ...SCALE_ROLES.map(r => `${r} (px)`)], systems.map(s => { const r = rolesOf(s); return [`\`${short(s.id)}\``, ...SCALE_ROLES.map(n => (r[n] ? sizeText(r[n]) : '-'))]; })),

  rhythm: () => table(['시스템', '본문 굵기/행간', '제목 굵기', '제목 행간', 'display 행간', 'display 자간(em)', 'heading 자간(em)', '라벨 자간(em)', '본문 대비 display', '본문 대비 숫자', '본문 줄 수(800px, 데스크톱)'],
    systems.filter(isNew).map(s => { const sc = ROLE_SCALES[s.roleScale], r = sc.roles, p = scaleProfile(sc); return [`\`${short(s.id)}\``, `${r.body.weight}/${r.body.lineHeight}`, r.heading.weight, r.heading.lineHeight, r.display.lineHeight, r.display.trackingEm, r.heading.trackingEm, r.label.trackingEm, `${p.displayOverBody}×`, `${p.numericOverBody}×`, p.bodyLinesPer800.desktop]; })),

  faces: () => table(['id', '제목 / 본문 스택', 'UI·숫자', '합친 구형', '웹폰트(선택)'], Object.values(FACE_PAIRINGS).map(f => [`\`${f.id}\``, `${f.head} / ${f.text}`, `${f.ui === f.text ? '본문과 같음' : f.ui}${f.numeric === f.ui ? '' : ` / ${f.numeric}`}`, f.merges.length > 1 ? f.merges.map(m => `\`${m}\``).join(', ') : f.merges.length ? `\`${f.merges[0]}\`` : '새로 만듦', f.webfonts.map(k => WEBFONTS[k].family).join(', ') || '없음'])),

  legacy: () => table(['구형 프리셋', '서체 짝', '역할 체계', '합침', '근거'], LEGACY_MIGRATION.map(m => [`\`${m.preset}\``, `\`${m.face}\``, `\`${m.scale}\``, m.merged ? `예(${m.mergedWith.join(', ')}와)` : '아니오', mdc(m.reason)])),

  fit: () => table(['시스템', '종류', '조건(AND, 값은 OR)', '가중', '이유'], systems.flatMap(s => TYPE_FIT[s.id].map(f => [`\`${short(s.id)}\``, f.type, whenText(f.when), f.priority, mdc(f.reason)]))),

  fallbacks: () => table(['시스템', '제목(macOS: 라틴 / 한글)', '본문(macOS: 라틴 / 한글)', '제목(Windows 가정)', '본문(Windows 가정)', '웹폰트 켤 때 앞에 붙는 서체'], systems.map(s => {
    const b = bindType(s), f = k => b.vars[k], mac = k => effectiveFaces(f(k), 'macos'), win = k => effectiveFaces(f(k), 'windows'), plan = webfontPlan(s.facePairing);
    return [`\`${short(s.id)}\``, `${mac('--kit-heading').latin} / ${mac('--kit-heading').hangul}`, `${mac('--kit-font').latin} / ${mac('--kit-font').hangul}`, `${win('--kit-heading').latin} / ${win('--kit-heading').hangul}`, `${win('--kit-font').latin} / ${win('--kit-font').hangul}`, plan ? plan.families.map(w => w.family).join(', ') : '없음'];
  })),

  metrics: () => table(['시스템', '문서 높이 데스크톱/모바일(px)', '대시보드 높이 데스크톱/모바일(px)', '문서 제목 줄 수 데스크톱/모바일', '문서 첫 문단 줄 수 데스크톱/모바일', '가로 넘침'], systems.map(s => {
    const m = metrics[short(s.id)], d = m['doc-desktop'], dm = m['doc-mobile'], b = m['dash-desktop'], bm = m['dash-mobile'];
    return [`\`${short(s.id)}\``, `${d.contentHeight} / ${dm.contentHeight}`, `${b.contentHeight} / ${bm.contentHeight}`, `${d.titleLines} / ${dm.titleLines}`, `${d.bodyLines} / ${dm.bodyLines}`, Object.values(m).some(x => x.overflowX || x.kpiOverflow) ? '있음' : '없음'];
  })),

  rejected: () => {
    const faces = Object.values(FACE_PAIRINGS), groups = [['설계 13', Object.values(ROLE_SCALES).filter(x => x.source === 'designed')], ['구형 역할형 4', Object.values(ROLE_SCALES).filter(x => /^type-role-preset:/.test(x.source))], ['구형 모듈러 18', Object.values(ROLE_SCALES).filter(x => /^role-scale:modular-/.test(x.id))]];
    const rows = [], summary = [];
    for (const [name, scales] of groups) {
      let bad = 0;
      for (const sc of scales) {
        const byRule = new Map();
        for (const f of faces) {
          const b = bindType(definePlatformMaterial({id: 'type-system:m', kind: 'type-system', label: 'm', facePairing: f.id, roleScale: sc.id, numerals: 'tabular'}));
          if (b.ok) continue;
          bad++;
          const rule = b.errors.map(e => e.rule ?? e.code)[0];
          (byRule.get(rule) ?? byRule.set(rule, []).get(rule)).push({f, msg: b.errors[0].message});
        }
        for (const [rule, list] of byRule) rows.push([`\`${sc.id}\``, rule, `${list.length}/${faces.length}`, list.slice(0, 2).map(x => `\`${x.f.id.slice('face-pairing:'.length)}\``).join(', ') + (list.length > 2 ? ' 외' : ''), mdc(list[0].msg.slice(list[0].msg.indexOf(': ') + 2))]);
      }
      summary.push(`${name}개 체계 × ${faces.length}개 서체 짝 = ${scales.length * faces.length}개 중 ${bad}개 거부`);
    }
    return `${summary.map(x => `- ${x}`).join('\n')}\n\n${table(['역할 체계', '걸린 규칙', '거부되는 서체 짝', '예', '첫 사유'], rows)}`;
  },

  hangul: () => table(['규칙(rule)', '대상', '한도', '출처'], [
    ['`serif-weight`', '세리프 서체를 쓰는 모든 역할', `굵기 ≤ ${HANGUL.serifHangulWeightMax}`, '엔진 HANGUL.serifHangulWeightMax(한글 세리프 서체는 굵기 한 벌)'],
    ['`sans-weight-floor`', 'display·heading·sub(산세리프)', `굵기 ≥ ${FLOORS.sansHeadingWeight}`, '엔진 typeVars의 산세리프 제목 바닥(5차 실측)'],
    ['`tracking-floor`', 'display·heading·sub', `자간 ≥ ${HANGUL.track.display} · ${HANGUL.track.heading} · ${HANGUL.track.sub}em`, '엔진 HANGUL.track(음절이 이웃과 닿는 비율 실측)'],
    ['`label-tracking`', 'label', `자간 ≤ ${HANGUL.labelMax}em`, '엔진 HANGUL.labelMax'],
    ['`leading-floor`', 'display·heading·sub', `행간 ≥ ${HANGUL.leading.display} · ${HANGUL.leading.heading} · ${HANGUL.leading.sub}`, '엔진 HANGUL.leading'],
    ['`leading-floor`', 'small·caption·label·code', `행간 ≥ ${FLOORS.leading.small} · ${FLOORS.leading.caption} · ${FLOORS.leading.label} · ${FLOORS.leading.code}`, '플랫폼 추가(한글 잉크 높이 0.91em에 줄 사이 띠 ≥ 0.34em). 확인 필요: 실측 전'],
    ['`body-leading`', 'body', `행간 ${HANGUL.body[0]}~${HANGUL.body[1]}`, '엔진 HANGUL.body'],
    ['`size-cap`', 'display·heading·sub', `크기 ≤ ${HANGUL.caps.display} · ${HANGUL.caps.heading} · 24px(모바일·데스크톱 모두)`, '엔진 HANGUL.caps, ROLES.sub.cap'],
    ['`size-floor`', 'body·small·label·caption·code', `크기 ≥ ${FLOORS.px.body} · ${FLOORS.px.small} · ${FLOORS.px.label} · ${FLOORS.px.caption} · ${FLOORS.px.code}px`, '플랫폼 추가. 확인 필요: 한글 가독성 실측 전'],
    ['(위계) `P_TYPE_HIERARCHY`', 'display > heading > sub > body', `간격 ≥ ${FLOORS.gap.displayOverHeading}px · ${FLOORS.gap.headingOverSub}px, 제목 단은 모바일 ≤ 데스크톱`, '엔진 ROLES.minAfter와 같은 값'],
  ]),
};

/** 마크다운 문서의 표시 구간을 생성 표로 바꾼다. */
export function render(doc) {
  return doc.replace(/<!-- type-table:(\w+) -->[\s\S]*?<!-- \/type-table:\1 -->/g, (_, name) => {
    if (!TABLES[name]) throw new Error(`unknown type-table: ${name}`);
    return `<!-- type-table:${name} -->\n${TABLES[name]()}\n<!-- /type-table:${name} -->`;
  });
}

if (process.argv.includes('--write')) {
  const before = readFileSync(DOC, 'utf8'), after = render(before);
  if (before !== after) writeFileSync(DOC, after);
  console.log(before === after ? 'typography.md already up to date' : 'typography.md updated');
}
