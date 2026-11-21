import {bp, act, footer} from '../lib.mjs';
export default bp({
  name: '온결 조명', theme: 'commerce', palette: 'warm-earthy-neutrals', pageType: 'commerce', mode: 'light',
  axes: {shell: 'topbar', typography: 'sans', density: 'spacious', radius: 'subtle', control: 'match', elevation: 'flat', motion: 'subtle', icon: 'line-fine', ornament: 'none', backdrop: 'plain', width: 'wide', scale: 'balanced', weight: 'medium', footer: 'simple'},
  nav: [{label: '조명', href: '#main'}, {label: '소재', href: '#specs'}, {label: '후기', href: '#reviews'}], action: {label: '장바구니', href: '#main'},
  foot: footer('© 2026 온결'),
  children: [
    {type: 'page-header', title: '결 테이블 램프', description: '손으로 불어 만든 유리 갓과 참나무 받침'},
    {type: 'aside', side: 'end', sticky: 'yes', size: 'wide', label: '구매', children: [
      {type: 'media', kind: 'photo', motif: 'desklamp', ratio: '1:1', alt: '참나무 받침 위의 유리 갓 테이블 램프', caption: '결 테이블 램프 · 오크'},
      {type: 'buy-box', title: '결 테이블 램프', price: '189,000원', note: '3~5일 이내 출고 · 무료 배송', badge: '신제품', options: [{label: '색', choices: ['오크', '월넛', '화이트']}, {label: '전구', choices: ['전구색', '주백색']}], action: act('장바구니 담기'), secondaryAction: act('선물하기', 'secondary')},
    ]},
    {type: 'section', title: '사진', children: [{type: 'gallery', layout: 'showcase', items: [
      {kind: 'photo', motif: 'desklamp', alt: '램프 정면', caption: '정면'}, {kind: 'photo', motif: 'lamp', alt: '불을 켠 모습', caption: '점등'}, {kind: 'photo', motif: 'floorlamp', alt: '거실에 놓은 모습', caption: '거실'}, {kind: 'photo', motif: 'orb', alt: '유리 갓 확대', caption: '유리 갓'},
    ]}]},
    {type: 'section', title: '소재와 치수', anchor: 'specs', children: [{type: 'properties', title: '사양', layout: 'inline', items: [{label: '갓', value: '수제 유리 · 유백색'}, {label: '받침', value: '참나무 원목 · 오일 마감'}, {label: '크기', value: '지름 18cm · 높이 36cm'}, {label: '무게', value: '1.4kg'}, {label: '전원', value: '코드 2m · 스위치형'}]}]},
    {type: 'section', title: '이렇게 놓여 있어요', children: [{type: 'media', kind: 'photo', motif: 'interior', ratio: '21:9', alt: '창가 책상 위에 놓인 램프', caption: '창가 책상'}]},
    {type: 'section', title: '후기', anchor: 'reviews', children: [{type: 'reviews', title: '구매 후기', score: '4.9', count: '후기 214개', items: [
      {author: '이**', rating: 5, text: '빛이 부드러워서 밤에 책 읽기 좋아요.', date: '10월 12일'},
      {author: '박**', rating: 5, text: '유리 갓의 질감이 사진보다 좋습니다.', date: '10월 3일'},
      {author: '최**', rating: 4, text: '받침이 묵직해 안정적이에요. 포장도 꼼꼼했어요.', date: '9월 28일'},
    ]}]},
  ],
});
