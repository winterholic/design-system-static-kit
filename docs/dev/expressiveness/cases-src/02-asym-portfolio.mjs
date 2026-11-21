import {bp, act, footer} from '../lib.mjs';
const proj = (n, title, caption, motif, reverse) => ({type: 'split', ratio: reverse ? 'wide-end' : 'wide-start', reverse: reverse ? 'reverse' : 'normal', align: 'center', children: [
  {type: 'media', kind: 'photo', motif, ratio: '4:3', alt: title + ' 외관', caption: n},
  {type: 'prose', title, body: caption},
]});
export default bp({
  name: '서하준 건축사진', theme: 'studio', palette: 'warm-earthy-neutrals', pageType: 'portfolio', mode: 'light',
  axes: {shell: 'topbar', typography: 'grotesk', density: 'spacious', radius: 'square', control: 'square', elevation: 'flat', motion: 'subtle', icon: 'line-fine', ornament: 'none', backdrop: 'plain', width: 'full', scale: 'dramatic', weight: 'medium', footer: 'minimal'},
  nav: [{label: '작업', href: '#work'}], action: {label: '연락', href: '#main'},
  foot: footer('© 2026 서하준'),
  children: [
    {type: 'page-header', title: '서하준 건축사진', description: '서울 · 건축 · 인테리어'},
    {type: 'hero', variant: 'statement', title: '빛이 지나간 자리를 찍습니다', body: '서울 · 건축 사진 · 2014 –', action: act('연락하기')},
    {type: 'media', kind: 'photo', motif: 'building', ratio: '21:9', alt: '오후의 빛이 들어오는 콘크리트 건물', caption: '한강 도서관 · 2025', overlay: '한강 도서관'},
    {type: 'section', title: '작업', anchor: 'work', children: [
      proj('01 · 2025', '한강 도서관', '노출 콘크리트와 오후 세 시의 빛.', 'museum', false),
      proj('02 · 2025', '북촌 주택', '마당을 둘러싼 세 개의 방.', 'interior', true),
      proj('03 · 2024', '성수 공장', '벽돌 틈으로 들어온 아침.', 'building', false),
    ]},
    {type: 'section', title: '아카이브', children: [
      {type: 'gallery', layout: 'masonry', items: [
        {kind: 'photo', motif: 'building', alt: '계단실', caption: '계단실'}, {kind: 'photo', motif: 'interior', alt: '거실', caption: '거실'},
        {kind: 'photo', motif: 'museum', alt: '전시실', caption: '전시실'}, {kind: 'photo', motif: 'coast', alt: '해안 별장', caption: '해안'},
        {type: 'x', kind: 'pattern', alt: '타일 패턴', caption: '타일'},
      ].map(({type, ...r}) => r)},
    ]},
  ],
});
