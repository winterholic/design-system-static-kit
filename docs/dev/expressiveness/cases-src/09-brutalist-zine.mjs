import {bp, act, footer} from '../lib.mjs';
export default bp({
  name: 'GRIT 프레스', theme: 'brutalist', palette: 'neon-glow-party', pageType: 'portfolio', mode: 'dark',
  axes: {shell: 'topbar', typography: 'terminal', density: 'comfortable', radius: 'square', control: 'square', elevation: 'hard', motion: 'subtle', icon: 'line-bold', ornament: 'geometric', backdrop: 'plain', width: 'wide', scale: 'balanced', weight: 'bold', footer: 'columns'},
  nav: [{label: '책', href: '#books'}, {label: '행사', href: '#main'}, {label: '구독', href: '#main'}], action: {label: '주문', href: '#main'},
  foot: footer('© 2026 GRIT 프레스'),
  children: [
    {type: 'page-header', title: 'GRIT 프레스', description: '독립 출판 · 서울 · 손으로 만든 책'},
    {type: 'hero', variant: 'statement', eyebrow: 'ZINE 07 OUT NOW', title: 'MAKE IT\nUGLY.\nMAKE IT YOURS.', body: '복사기와 풀로 만든 책. 오늘 인쇄한 만큼만 팝니다.', action: act('주문하기'), secondaryAction: act('책 목록', 'secondary')},
    {type: 'section', title: '이번 달 책', anchor: 'books', children: [{type: 'bento', children: [
      {type: 'media', kind: 'photo', motif: 'poster', ratio: '1:1', alt: 'ZINE 07 표지', caption: 'ZINE 07 · 12,000원'},
      {type: 'card', title: '소음 지도', body: '서울 열두 곳의 소리를 받아 적은 책.', badge: '품절 임박', variant: 'filled'},
      {type: 'metric', label: '남은 부수', value: '37'},
      {type: 'quote', quote: '이렇게 못생긴 책이 이렇게 오래 읽힌다.', author: '독자 후기'},
      {type: 'progress', label: '2쇄 예약', value: 64, detail: '64/100', tone: 'warning'},
    ]}]},
    {type: 'section', title: '규칙 없음', children: [{type: 'grid', columns: 'three', children: [
      {type: 'card', title: '01 복사', body: '잉크가 번질수록 좋다.', variant: 'outline'},
      {type: 'card', title: '02 접기', body: '반듯하지 않아도 된다.', variant: 'filled'},
      {type: 'card', title: '03 묶기', body: '스테이플러 두 방.', variant: 'outline'},
    ]}]},
    {type: 'cta', title: '다음 호는 12월', body: '구독자만 먼저 받습니다.', action: act('구독하기'), tone: 'inverse'},
  ],
});
