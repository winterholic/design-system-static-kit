import {createBlueprint} from '../../src/catalog.mjs';

export const CONTEXT_SAMPLES = ['saas-landing', 'admin-table', 'dashboard-overview', 'product-listing', 'article', 'signup', 'settings'];

export function contextSamples() {
  const samples = CONTEXT_SAMPLES.map(id => ({id, blueprint: createBlueprint(id)}));
  const summary = createBlueprint('dashboard-overview');
  const metrics = summary.tree.children.find(n => n.type === 'grid').children;
  metrics[0].label = '이번 분기 해외 사업부 누적 매출';
  metrics[0].value = '₩123,456,789,000';
  metrics[1].label = 'Average monthly recurring revenue';
  metrics[1].value = '$12,345,678.90';
  samples.push({id: 'long-summary', blueprint: summary});
  const contained = createBlueprint('about-team');
  contained.pageType = 'general';
  const form = structuredClone(createBlueprint('signup').tree.children.find(n => n.type === 'form'));
  form.variant = 'two-column';
  contained.tree.children = [{type: 'page-header', title: '팀의 소식을 받으세요'}, {type: 'aside', side: 'end', label: '가입 신청', children: [{type: 'notice', tone: 'info', title: '구독 안내', body: '팀의 작업과 행사 소식을 이메일로 보내드립니다.'}, form]}];
  samples.push({id: 'contained-form', blueprint: contained});
  const split = structuredClone(contained);
  split.tree.children[1].children[1] = {type: 'section', title: '작업 원칙', children: [{type: 'split', children: [{type: 'card', title: '콘텐츠의 의미를 먼저 읽습니다', body: '좁은 영역에서도 제목과 설명을 자연스럽게 읽을 수 있어야 합니다.'}, {type: 'card', title: '실제 공간을 따릅니다', body: '뷰포트가 넓더라도 부모 컨테이너는 좁을 수 있습니다.'}]}]};
  samples.push({id: 'contained-split', blueprint: split});
  return samples;
}
