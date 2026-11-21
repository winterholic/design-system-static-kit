import {bp, act, footer} from '../lib.mjs';
export default bp({
  name: 'Studio Raster', theme: 'swiss', palette: 'coastal', pageType: 'general', mode: 'light',
  axes: {shell: 'minimal', typography: 'swiss', density: 'comfortable', radius: 'square', control: 'square', elevation: 'flat', motion: 'none', icon: 'line', ornament: 'none', backdrop: 'plain', width: 'wide', scale: 'dramatic', weight: 'bold', footer: 'simple'},
  nav: [{label: '원칙', href: '#principles'}], action: {label: '문의', href: '#main'},
  foot: footer('© 2026 Studio Raster'),
  children: [
    {type: 'page-header', title: '격자는 자유의 반대가 아니다', description: 'Studio Raster · 타이포그래피 스튜디오 · 취리히 / 서울', eyebrow: '2026'},
    {type: 'section', title: '네 가지 원칙', anchor: 'principles', surface: 'plain', children: [
      {type: 'properties', title: '원칙', layout: 'inline', items: [{label: '01 격자', value: '모든 요소는 열에 놓인다.'}, {label: '02 위계', value: '크기는 세 단계만 쓴다.'}, {label: '03 정렬', value: '왼쪽 한 축만 쓴다.'}, {label: '04 여백', value: '비어 있는 곳이 문장을 만든다.'}]},
    ]},
    {type: 'section', title: '작업 방식', surface: 'plain', children: [
      {type: 'steps', title: '프로세스', layout: 'horizontal', items: [{title: '관찰', description: '글과 쓰임을 먼저 읽는다.'}, {title: '구조', description: '격자와 위계를 세운다.'}, {title: '조판', description: '서체와 간격을 맞춘다.'}, {title: '검수', description: '인쇄와 화면에서 확인한다.'}]},
    ]},
    {type: 'divider', label: '연락'},
    {type: 'prose', title: 'hello@raster.example', body: '새 프로젝트는 분기마다 두 건만 받습니다.', variant: 'lead'},
  ],
});
