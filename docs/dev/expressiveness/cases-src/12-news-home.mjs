import {bp, act, footer} from '../lib.mjs';
const c = (title, meta, motif) => ({type: 'card', variant: motif ? 'media' : 'basic', ...(motif ? {visual: 'photo', motif, ratio: '4:3'} : {}), title, body: '핵심 내용을 한 줄로 요약합니다.', meta});
export default bp({
  name: '한결일보', theme: 'newsroom', palette: 'summer-ocean-breeze', pageType: 'blog', mode: 'light',
  axes: {shell: 'masthead', typography: 'newsroom', density: 'compact', radius: 'square', control: 'square', elevation: 'flat', motion: 'none', icon: 'line', ornament: 'lines', backdrop: 'plain', width: 'wide', scale: 'tight', weight: 'bold', footer: 'columns'},
  nav: [{label: '정치', href: '#main'}, {label: '경제', href: '#econ'}, {label: '사회', href: '#main'}, {label: '문화', href: '#main'}], action: {label: '구독', href: '#main'},
  foot: footer('© 2026 한결일보'),
  children: [
    {type: 'page-header', title: '오늘의 한결일보', description: '11월 21일 토요일 오전 · 속보 6건'},
    {type: 'aside', side: 'end', size: 'wide', label: '속보', children: [
      {type: 'card', variant: 'media', visual: 'photo', motif: 'building', ratio: '16:9', title: '내년 예산안 국회 통과, 복지 비중 늘어', body: '여야는 밤샘 협상 끝에 합의했다. 복지 분야 증가율은 6.4%로 최근 5년 중 가장 높다.', meta: '정치 · 단독', badge: '톱', author: '김하은 기자'},
      {type: 'list', title: '속보', variant: 'divided', items: [{title: '서울 한파주의보 발령', meta: '08:41'}, {title: '코스피 장 초반 상승', meta: '09:05'}, {title: '고속도로 사고 2건 수습', meta: '09:12'}, {title: '신약 임상 3상 결과 발표', meta: '09:30'}, {title: '프로야구 FA 계약 발표', meta: '09:44'}, {title: '전국 대학 수능 성적 통지', meta: '10:02'}]},
    ]},
    {type: 'section', title: '주요 기사', children: [{type: 'grid', columns: 'four', children: [c('도심 자전거도로 12km 추가', '사회 · 8:32', 'coast'), c('겨울 전력 수급 여유', '경제 · 9:05', 'solar'), c('헌책방이 사라진 자리', '문화 · 9:20', 'books'), c('편의점 도시락의 진화', '소비 · 9:41', 'food')]}]},
    {type: 'section', title: '많이 본 뉴스', anchor: 'econ', children: [{type: 'grid', columns: 'three', children: [
      {type: 'list', title: '정치', variant: 'plain', items: [{title: '예산안 합의 내용 총정리'}, {title: '여야 원내대표 회동'}, {title: '개각 시기 놓고 설왕설래'}]},
      {type: 'list', title: '경제', variant: 'plain', items: [{title: '환율 1,300원대 진입'}, {title: '금리 동결 가능성'}, {title: '배달 수수료 개편안'}]},
      {type: 'list', title: '사회', variant: 'plain', items: [{title: '독감 환자 증가세'}, {title: '대중교통 요금 조정'}, {title: '신규 입주 아파트 현황'}]},
    ]}]},
  ],
});
