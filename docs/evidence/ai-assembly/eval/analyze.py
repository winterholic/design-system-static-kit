#!/usr/bin/env python3
"""2단계(라벨 해제) 분석. 표준 라이브러리만 쓴다.
실행: python3 docs/evidence/ai-assembly/eval/analyze.py  (출력: analysis.json + 표준출력 표)
입력: blind-verdicts.json(1단계에서 고정), ../key.json(해제 후에만 읽음)
승·무·패는 AI 기준이다. 판정 기준은 두 가지를 모두 본다.
  rank : 입력별 순위가 더 좋으면 승, 같으면 무
  score: 6기준 합(6~30)이 더 크면 승, 같으면 무
  margin2: 합 차이가 2점 이상일 때만 승·패(1점 차는 무)
부호 검정: 무 제외, 승 수가 Binomial(n, 0.5)를 따른다는 귀무가설의 양측 정확 검정.
"""
import json, os, itertools
from math import comb
H = os.path.dirname(os.path.abspath(__file__))
bv = json.load(open(os.path.join(H, 'blind-verdicts.json')))
key = json.load(open(os.path.join(H, '..', 'key.json')))['labels']
ARMS = ['default', 'recipe', 'ai']

def sign_p(w, l):
    n = w + l
    if n == 0: return None
    k = min(w, l)
    return min(1.0, 2 * sum(comb(n, i) for i in range(k + 1)) / 2 ** n)

def min_p(n):  # n개 비무승부로 얻을 수 있는 가장 작은 양측 p
    return None if n == 0 else min(1.0, 2 * 0.5 ** n)

def arm_data(ev):
    d = {}
    for num, k in key.items():
        v = bv[ev]['inputs'][k['inputId']]
        d[k['inputId']] = {}
        for lab, arm in k['arms'].items():
            sc = v['scores'][lab]
            d[k['inputId']][arm] = {'label': lab, 'rank': v['rank'][lab], 'total': sum(sc.values()), 'crit': sc}
    return d

def wtl(d, a, b, by):
    w = t = l = 0
    per = {}
    for i, x in d.items():
        if by == 'margin2':  # 합 차이가 2점 미만이면 무(채점 잡음 완충)
            df = x[a]['total'] - x[b]['total']
            r = 0 if abs(df) < 2 else (1 if df > 0 else -1)
        elif by == 'rank':
            r = (x[b]['rank'] > x[a]['rank']) - (x[b]['rank'] < x[a]['rank'])  # a가 더 좋으면 +1
        else:
            r = (x[a]['total'] > x[b]['total']) - (x[a]['total'] < x[b]['total'])
        per[i] = {1: 'W', 0: 'T', -1: 'L'}[r]
        w += r == 1; l += r == -1; t += r == 0
    return {'W': w, 'T': t, 'L': l, 'p_two_sided': sign_p(w, l), 'min_possible_p': min_p(w + l), 'per_input': per}

out = {}
for ev in ('gpt', 'claude'):
    d = arm_data(ev)
    res = {'arm_mean_total_of_30': {}, 'arm_mean_per_criterion': {}, 'arm_mean_rank': {}, 'pairs': {}, 'per_input': {}}
    crits = bv[ev]['criteria']
    crits = [c['key'] if isinstance(c, dict) else c for c in crits]
    for a in ARMS:
        res['arm_mean_total_of_30'][a] = round(sum(d[i][a]['total'] for i in d) / 9, 2)
        res['arm_mean_rank'][a] = round(sum(d[i][a]['rank'] for i in d) / 9, 2)
        res['arm_mean_per_criterion'][a] = {c: round(sum(d[i][a]['crit'][c] for i in d) / 9, 2) for c in crits}
    for a, b in (('ai', 'default'), ('ai', 'recipe'), ('recipe', 'default')):
        res['pairs'][f'{a}_vs_{b}'] = {by: wtl(d, a, b, by) for by in ('rank', 'score', 'margin2')}
    res['paired_total_diff_ai_minus_default'] = {i: d[i]['ai']['total'] - d[i]['default']['total'] for i in d}
    res['paired_total_diff_mean'] = round(sum(res['paired_total_diff_ai_minus_default'].values()) / 9, 2)
    for i in d:
        res['per_input'][i] = {a: {'label': d[i][a]['label'], 'rank': d[i][a]['rank'], 'total': d[i][a]['total']} for a in ARMS}
    out[ev] = res

# 같은 화면(바이트 동일) 쌍: 1단계 평가자가 기록한 identical_screens를 팔로 번역
ident = {}
for num, k in key.items():
    pairs = bv['gpt']['inputs'][k['inputId']]['identical_screens']
    ident[k['inputId']] = [sorted([k['arms'][x], k['arms'][y]]) for x, y in pairs]
out['identical_arm_pairs'] = ident

# 평가자 간 일치: 입력 내 A/B/C 3쌍의 순서 방향(앞·동점·뒤)이 같은 비율
agree = tot = 0
for i in bv['gpt']['inputs']:
    g = bv['gpt']['inputs'][i]['rank']; c = bv['claude']['inputs'][i]['rank']
    for x, y in itertools.combinations('ABC', 2):
        sg = (g[x] < g[y]) - (g[x] > g[y]); sc = (c[x] < c[y]) - (c[x] > c[y])
        agree += sg == sc; tot += 1
out['inter_rater_pair_direction_agreement'] = {'agree': agree, 'of': tot, 'rate': round(agree / tot, 3)}
json.dump(out, open(os.path.join(H, 'analysis.json'), 'w'), ensure_ascii=False, indent=1)

for ev in ('gpt', 'claude'):
    r = out[ev]; print(f'\n## {ev}')
    print('paired diff ai-default', r['paired_total_diff_ai_minus_default'], 'mean', r['paired_total_diff_mean'])
    print('arm mean total/30', r['arm_mean_total_of_30'], 'mean rank', r['arm_mean_rank'])
    for p, v in r['pairs'].items():
        for by in ('rank', 'score', 'margin2'):
            x = v[by]; print(f"{p:18s} {by:5s} W{x['W']} T{x['T']} L{x['L']} p={x['p_two_sided']} (min p {x['min_possible_p']})  {''.join(x['per_input'][i][0] for i in x['per_input'])}")
print('\nidentical arm pairs', ident)
print('inter-rater', out['inter_rater_pair_direction_agreement'])
