import {bp, act, footer} from '../lib.mjs';
export default bp({
  name: '푸른바다 지킴이', theme: 'colorblock', palette: 'contrast-pop', pageType: 'landing', mode: 'light',
  axes: {shell: 'topbar', typography: 'poster', density: 'comfortable', radius: 'soft', control: 'pill', elevation: 'hard', motion: 'lively', icon: 'line-bold', ornament: 'geometric', backdrop: 'tint', width: 'wide', scale: 'dramatic', weight: 'bold', footer: 'columns'},
  nav: [{label: '현황', href: '#status'}, {label: '이야기', href: '#story'}, {label: '후원', href: '#donate'}], action: {label: '후원하기', href: '#donate'},
  foot: footer('© 2026 푸른바다 지킴이'),
  children: [
    {type: 'page-header', title: '푸른바다 지킴이', description: '바다 쓰레기 줄이기 캠페인'},
    {type: 'hero', variant: 'cover', eyebrow: '2026 해양 캠페인', title: '바다에게\n돌려주자.', body: '올해 안에 해변 100곳을 되살립니다.', facts: [{value: '63곳', label: '정화 완료'}, {value: '12톤', label: '수거한 쓰레기'}, {value: '4,820명', label: '참여자'}], action: act('후원하기', 'primary', '#donate'), secondaryAction: act('이야기 읽기', 'ghost', '#story')},
    {type: 'split', ratio: 'even', align: 'center', children: [
      {type: 'cta', title: '해변 100곳, 지금 63곳', body: '남은 37곳을 함께 되살려 주세요.', action: act('후원하기', 'primary', '#donate'), tone: 'brand'},
      {type: 'cta', title: '쓰레기 12톤을 건졌습니다', body: '4,820명이 손으로 모았습니다.', action: act('이야기 읽기', 'secondary', '#story'), tone: 'inverse'},
    ]},
    {type: 'section', title: '모금 현황', anchor: 'status', children: [
      {type: 'progress', label: '목표 1억 원', value: 68, detail: '6,800만 원 모였습니다', tone: 'brand'},
      {type: 'grid', columns: 'three', children: [{type: 'metric', label: '모금액', value: '6,800만원'}, {type: 'metric', label: '후원자', value: '1,204명'}, {type: 'metric', label: '남은 기간', value: '23일'}]},
    ]},
    {type: 'section', title: '이야기', anchor: 'story', children: [{type: 'timeline', title: '캠페인 기록', variant: 'line', items: [{time: '3월', title: '첫 해변 정화', description: '제주 협재 해변에서 380명이 모였습니다.', status: '완료'}, {time: '7월', title: '50곳 돌파', description: '자원봉사자 4,000명 달성.', status: '완료'}, {time: '11월', title: '63곳 정화', description: '남은 37곳을 위한 마지막 모금.', status: '진행'}]}]},
    {type: 'section', title: '후원하기', anchor: 'donate', children: [{type: 'form', title: '후원 금액', intro: '정기 후원은 언제든 멈출 수 있습니다.', fields: [{id: 'amount', label: '후원 금액', type: 'radio', options: ['10,000원', '30,000원', '50,000원', '직접 입력']}, {id: 'email', label: '이메일', type: 'email'}], submitLabel: '후원 신청', variant: 'stacked'}]},
  ],
});
