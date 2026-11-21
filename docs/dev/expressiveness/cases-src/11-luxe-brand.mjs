import {bp, act, footer} from '../lib.mjs';
export default bp({
  name: 'Maison Noir', theme: 'luxe', palette: 'gold', pageType: 'landing', mode: 'dark',
  axes: {shell: 'centered', typography: 'luxe', density: 'spacious', radius: 'square', control: 'square', elevation: 'flat', motion: 'subtle', icon: 'line-fine', ornament: 'lines', backdrop: 'plain', width: 'wide', scale: 'dramatic', weight: 'regular', footer: 'minimal'},
  nav: [{label: '철학', href: '#philosophy'}, {label: '향', href: '#scents'}, {label: '뉴스레터', href: '#letter'}], action: {label: '상담', href: '#main'},
  foot: footer('© 2026 Maison Noir'),
  children: [
    {type: 'page-header', title: 'Maison Noir', description: '파리의 향수 하우스'},
    {type: 'hero', variant: 'centered', title: '밤은 가장 오래된 향이다.', body: '파리 · 1987', action: act('컬렉션 보기', 'secondary')},
    {type: 'media', kind: 'photo', motif: 'bottle', ratio: '21:9', alt: '어두운 배경 위의 향수병 한 개'},
    {type: 'section', title: '철학', anchor: 'philosophy', surface: 'plain', align: 'center', children: [
      {type: 'prose', title: '한 해에 세 가지', body: '우리는 한 해에 세 가지 향만 만듭니다.\n\n원료는 수확한 해의 향을 가장 잘 기억하는 것만 고릅니다.\n\n향은 말없이 오래 남아야 합니다.', variant: 'lead'},
    ]},
    {type: 'section', title: '올해의 향', anchor: 'scents', surface: 'plain', children: [{type: 'menu', title: '세 가지 향', layout: 'plain', items: [{name: 'No. 1 Vesper', price: '280,000원'}, {name: 'No. 2 Cendre', price: '280,000원'}, {name: 'No. 3 Lune', price: '320,000원'}]}]},
    {type: 'section', title: '뉴스레터', anchor: 'letter', surface: 'plain', align: 'center', children: [{type: 'form', title: '새 향이 나올 때만 편지를 보냅니다', fields: [{id: 'email', label: '이메일', type: 'email', placeholder: 'name@example.com'}], submitLabel: '구독', variant: 'inline'}]},
  ],
});
