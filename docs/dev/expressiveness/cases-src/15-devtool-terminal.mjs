import {bp, act, footer} from '../lib.mjs';
export default bp({
  name: 'kit-cli', theme: 'devtool', palette: 'elegant-midnight', pageType: 'landing', mode: 'dark',
  axes: {shell: 'topbar', typography: 'terminal', density: 'comfortable', radius: 'soft', control: 'match', elevation: 'outline', motion: 'subtle', icon: 'line-square', ornament: 'lines', backdrop: 'grid', width: 'wide', scale: 'balanced', weight: 'medium', footer: 'columns'},
  nav: [{label: '설치', href: '#install'}, {label: '예시', href: '#examples'}, {label: '변경', href: '#changes'}], action: {label: 'GitHub', href: '#main'},
  foot: footer('© 2026 kit-cli'),
  children: [
    {type: 'page-header', title: 'kit-cli', description: '명령줄에서 빌드·검사·배포'},
    {type: 'hero', variant: 'split', eyebrow: 'v2.4 · MIT', title: 'npx kit build', body: '설정 없이 정적 사이트를 만들고 검증합니다.', visual: 'device', action: act('설치 방법'), secondaryAction: act('문서', 'secondary')},
    {type: 'section', title: '설치', anchor: 'install', children: [
      {type: 'split', ratio: 'even', align: 'start', children: [
        {type: 'code', label: '설치', language: 'bash', code: 'npm install -g kit-cli\nkit build ./site'},
        {type: 'code', label: '출력', language: 'text', code: '✓ 42 pages built in 1.2s\n✓ 0 broken links\n✓ contrast 21:1'},
      ]},
    ]},
    {type: 'section', title: '예시', anchor: 'examples', children: [{type: 'tabs', variant: 'boxed', children: [
      {type: 'tab', label: 'bash', children: [{type: 'code', label: 'bash', language: 'bash', code: 'kit check ./dist --strict'}]},
      {type: 'tab', label: 'JS', children: [{type: 'code', label: 'JS', language: 'js', code: "import {build} from 'kit-cli';\nawait build('./site', {out: './dist'});"}]},
      {type: 'tab', label: 'Python', children: [{type: 'code', label: 'Python', language: 'python', code: "import kit\nkit.build('./site', out='./dist')"}]},
    ]}]},
    {type: 'section', title: '숫자', children: [{type: 'grid', columns: 'three', children: [{type: 'metric', label: 'GitHub 별', value: '12.4k'}, {type: 'metric', label: '주간 다운로드', value: '210k'}, {type: 'metric', label: '기여자', value: '87'}]}]},
    {type: 'section', title: '변경 기록', anchor: 'changes', children: [{type: 'timeline', title: '최근 릴리스', variant: 'release', items: [{time: 'v2.4.0', date: '11월 20일', title: '링크 검사 추가', changes: [{kind: '신규', text: 'kit check --links'}]}, {time: 'v2.3.2', date: '11월 2일', title: '캐시 수정', changes: [{kind: '수정', text: '캐시 키 충돌 해결'}]}, {time: 'v2.3.0', date: '10월 15일', title: '병렬 빌드', changes: [{kind: '개선', text: '빌드 속도 2배'}]}]}]},
  ],
});
