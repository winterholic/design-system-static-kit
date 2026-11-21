/**
 * 카탈로그 2.5.0 표현력 CSS(ADR 0010). 규칙은 사용한 속성값에만 나온다: 렌더된 본문(body)에 해당 표지가 없으면 한 줄도 내지 않는다.
 * 그래서 새 필드를 쓰지 않은 2.5.0 Blueprint도 chunks의 CSS 해시는 그대로이고, 2.4.0 이하는 이 함수를 부르지 않는다(styles/index.mjs).
 * 값은 모두 기존 토큰(--kit-*)과 enum 해석표(HERO_RATIOS, DOMINANT_MIN)에서 온다. 임의 값은 없다.
 * R1(composition.mjs afterHero)·R3(render/mocks.mjs deviceMock fit)·R4(render/nodes.mjs gallery ratioAt)는 렌더러 쪽에서 고치고, 이 파일은 R2·R3의 높이 상한과 EX-1~EX-5를 맡는다.
 */
import {HERO_RATIOS, DOMINANT_MIN} from '../catalog/expression.mjs';
import {SPACE, SPACE_EXT, TOKEN_EXT} from '../spacing.mjs';
import {featuredUsage, featuredCSS} from '../layout.mjs';

const BAND = ':is([data-page=landing],[data-page=pricing],[data-page=portfolio],[data-page=general])';
const NOT_BAND = ':not(:is([data-page=landing],[data-page=pricing],[data-page=portfolio],[data-page=general]))';
const has = (body, marker) => body.includes(marker);

export function expressionCSS(b, body, design) {
  const out = ['/* catalog 2.5.0 expression grammar (src/styles/expression.mjs): emitted only for the values this page uses */'];
  const px = fr => `minmax(0,${fr}fr)`;

  // R2: 명시한 plain·flat은 마케팅 페이지의 짝수 번째 자동 면에서 제외된다. 기본(미지정)은 2.4.0과 같다.
  if (has(body, 'data-fill="none"')) out.push(`${BAND} .kit-main>.kit-section[data-fill=none]:nth-child(even){background:none;box-shadow:none}`);

  // R3: 3:4 기기 목업은 폭을 제한해 높이가 폭만큼 커지지 않게 한다(폭 360px이면 높이 480px).
  if (has(body, 'data-art="device"')) out.push('.kit-art-box[data-art=device][data-ratio="3:4"]{max-width:min(100%,360px);margin-inline:auto}.kit-bento .kit-art-box[data-art=device]{max-width:none}');

  // EX-1 hero.ratio: 두 열이 되는 폭부터 켜지고, 좁은 칸이 칸 최소폭 밑으로 줄지 않는 폭(minCell/0.4 + gap)부터만 켠다. 그 아래는 기존 자동 열이다.
  if (/<section[^>]*class="kit-hero"[^>]* data-ratio="/.test(body)) {
    const hero = design?.decisions.find(d => d.type === 'hero'), min = hero?.container.minCell ?? 320, gap = SPACE[b.density].gap, w = Math.ceil(min / 0.4 + gap);
    const rule = (ratio, variant, cols) => `.kit-body .kit-main .kit-hero[data-ratio=${ratio}][data-visual][data-variant=${variant}]{grid-template-columns:${cols}}`;
    const [c, v] = [HERO_RATIOS.copy, HERO_RATIOS.visual];
    out.push(`@container compose (min-width:${w}px){${rule('copy', 'split', `${px(c[0])} ${px(c[1])}`)}${rule('visual', 'split', `${px(v[0])} ${px(v[1])}`)}${rule('copy', 'product', `${px(c[1])} ${px(c[0])}`)}${rule('visual', 'product', `${px(v[1])} ${px(v[0])}`)}}`);
  }

  // EX-1 split.ratio dominant-*: 칸 안 컨테이너 DOMINANT_MIN 이상이면 7:3, 그 아래 split 최소폭 이상이면 wide-*와 같은 3:2, 더 좁으면 기존 한 열.
  if (/class="kit-split"[^>]* data-ratio="dominant-/.test(body)) {
    const split = design?.decisions.find(d => d.type === 'split'), min = split?.container.minWidth ?? 640 + SPACE[b.density].gap;
    const sel = r => `.kit-split[data-design-kind=split][data-ratio=${r}]`;
    out.push(`@container compose (min-width:${min}px){${sel('dominant-start')}{grid-template-columns:${px(3)} ${px(2)}}${sel('dominant-end')}{grid-template-columns:${px(2)} ${px(3)}}}`,
      `@container compose (min-width:${DOMINANT_MIN}px){${sel('dominant-start')}{grid-template-columns:${px(7)} ${px(3)}}${sel('dominant-end')}{grid-template-columns:${px(3)} ${px(7)}}}`);
  }

  // EX-2 card.featured
  const featured = featuredUsage(body);
  if (featured.size) {
    out.push(featuredCSS(featured));
    // 추천 요금제와 같은 이름·같은 문법: 강조 칸은 테두리와 배경으로 앞에 선다.
    out.push('.kit-card[data-featured]{border:2px solid var(--kit-action);box-shadow:var(--kit-shadow-hover)}.kit-card[data-featured] .kit-card-body>h2,.kit-card[data-featured] .kit-card-body>h3,.kit-card[data-featured] .kit-card-body>h4{font-size:var(--kit-t-heading)}');
  }

  // 추천 요금제: 크기·위치가 같고 테두리와 배지만 달랐다(표현력 실험 04). 2.5.0에서는 추천 칸이 위아래로 더 크다.
  if (has(body, 'class="kit-plan" data-featured="yes"')) out.push('.kit-plans:has(>.kit-plan[data-featured]){align-items:center}.kit-plans>.kit-plan[data-featured]{padding-block:calc(var(--kit-sp-inset-l) * 1.5)}');

  // EX-3 quote.variant pull: 상자 없이 큰 글자(quote-l 역할)로. 대비는 기존 text/canvas 쌍이다.
  if (has(body, 'class="kit-quote" data-variant="pull"')) out.push([
    '.kit-body .kit-quote[data-variant=pull]{background:none;border:0;border-radius:0;box-shadow:none;padding:var(--kit-sp-section-s) 0;gap:var(--kit-sp-head)}',
    '.kit-quote[data-variant=pull] blockquote{font-size:var(--kit-t-quote-l);line-height:1.4;max-width:28em;text-wrap:balance}',
    '.kit-quote[data-variant=pull] blockquote::before{font-size:var(--kit-t-display);margin-bottom:0}',
    '.kit-quote[data-variant=pull] figcaption{font-size:var(--kit-t-small)}',
    '@container (max-width:339px){.kit-quote[data-variant=pull] blockquote{font-size:var(--kit-t-quote)}}',
  ].join(''));

  // EX-4 section.space: 마케팅 페이지는 띠 여백(band 계열), 그 밖의 페이지는 구역 사이 여백(section 계열)이다.
  const spaces = ['tight', 'loose'].filter(s => has(body, `data-space="${s}"`));
  if (spaces.length) {
    const d = b.density;
    if (spaces.includes('loose')) out.push(`:root{${TOKEN_EXT.bandL}:${SPACE_EXT[d].bandL}px}`);
    const sec = `.kit-main>.kit-section`;
    // 띠: 위아래 여백 단계. 기본 band(데스크톱)·bandM(모바일)을 한 단계씩 줄이거나 늘린다.
    if (spaces.includes('tight')) out.push(`${BAND} ${sec}[data-space=tight]{padding-block:var(--kit-sp-band-m)}@media(max-width:640px){${BAND} ${sec}[data-space=tight]{padding-block:var(--kit-sp-band-s)}}`);
    if (spaces.includes('loose')) out.push(`${BAND} ${sec}[data-space=loose]{padding-block:var(--kit-sp-band-l)}@media(max-width:640px){${BAND} ${sec}[data-space=loose]{padding-block:var(--kit-band)}}`);
    // 앱 페이지: 행 간격(--kit-section) 위에 얹는다. tight는 행 간격을 거둬 sectionS만 남기고, loose는 sectionL을 더한다. 색을 입힌 구역은 안쪽 여백만 바꾼다.
    if (spaces.includes('tight')) out.push(`${NOT_BAND} ${sec}[data-space=tight][data-surface=plain]{margin-top:calc(var(--kit-section) * -1);padding-top:var(--kit-sp-section-s)}@media(max-width:640px){${NOT_BAND} ${sec}[data-space=tight][data-surface=plain]{margin-top:calc(var(--kit-sp-section-m) * -1)}}${NOT_BAND} ${sec}[data-space=tight]:is([data-surface=tint],[data-surface=inverse]){padding-block:var(--kit-inset)}`);
    if (spaces.includes('loose')) out.push(`${NOT_BAND} ${sec}[data-space=loose][data-surface=plain]{padding-block:var(--kit-sp-section-l)}${NOT_BAND} ${sec}[data-space=loose]:is([data-surface=tint],[data-surface=inverse]){padding-block:var(--kit-sp-section-l)}`);
  }

  // EX-5 media.bleed: 페이지 직속 미디어가 콘텐츠 열 바깥(.kit-main의 full 트랙)까지 이어진다. 뷰포트 기준 음수 여백(100vw)을 쓰지 않는다(C15).
  if (has(body, 'class="kit-media" data-bleed="yes"')) out.push([
    '.kit-main>.kit-media[data-bleed]{grid-column:full}',
    '.kit-media[data-bleed] .kit-art-box{border-radius:0;border-inline-width:0;box-shadow:none;max-height:min(70vh,640px)}',
    '.kit-media[data-bleed] figcaption{padding-inline:var(--kit-bleed)}',
    '@media(max-width:390px){.kit-main>.kit-media[data-bleed]{grid-column:content}.kit-media[data-bleed] .kit-art-box{border-radius:var(--kit-radius);border-inline-width:1px}.kit-media[data-bleed] figcaption{padding-inline:0}}',
  ].join(''));

  return out.length > 1 ? out.join('\n') : '';
}
