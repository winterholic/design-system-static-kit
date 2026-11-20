# 세 팔 측정 결과 (같은 표)

측정 커밋 origin/main `f1eb262d797008d5d68545071052c036031cca84`, 카탈로그 2.4.0, chromium 156.0.8078.4, darwin. 사실만 적고 우열은 판정하지 않는다. 눈가림 평가는 별도다.

- 등급: 4폭(320·390·768·1440) 중 가장 나쁜 구조 등급(A 지적 0, B 경미한 지적만, C 심각한 지적 있음).
- 심각 프로브 지적: 폭 320/390/768/1440 순서의 건수. 전체 합은 괄호.
- Q지표: 해당 청구가 의미 있는 폭에서만 잰 통과(○)·실패(×)와 핵심 값. —는 그 화면에 요소가 없음.
- RC 실패: 이 유형 Recipe의 선택 시 규칙(RC01~RC06 중 해당)을 Blueprint에 대조해 실패한 규칙(없으면 −). AI 팔은 Recipe 규칙을 지킬 의무가 없다.

| 입력 | 팔 | 구성 변형 | 테마/팔레트/서체/밀도/스케일/셸 | 등급 | 심각 프로브 지적 | 히어로 제목·섹션 제목 비(1440/390) | Q지표 | RC 실패 | 문서 높이 |
|---|---|---|---|---|---|---|---|---|---|
| I01 devtool-landing | 기본 | 기본 | devtool(auto)/ocean-blue-adventure/tech/comfortable/tight/topbar | A | 0/0/0/0 (0) | 1.42/1.38 | Q13@390○(중복 0) Q06@1440○(오른쪽 빈 29%) Q07@1440○(낮은 칸 빈 53%) Q13@1440○(중복 0) | RC01 RC02 RC03 | 4401/4293/3429/2618 |
| I01 devtool-landing | Recipe | hero:product | trust(light)/serene-blue/sans/comfortable/balanced/topbar | A | 0/0/0/0 (0) | 1.94/1.58 | Q13@390○(중복 0) Q06@1440○(오른쪽 빈 18% 시각요소) Q07@1440○(낮은 칸 빈 39%) Q13@1440○(중복 0) | − | 4778/4830/3546/3294 |
| I01 devtool-landing | AI | hero:statement | devtool(dark)/ocean-blue-adventure/tech/comfortable/dramatic/topbar | A | 0/0/0/0 (0) | 2.16/1.63 | Q13@390○(중복 0) Q06@1440×(오른쪽 빈 50%) Q07@1440○(낮은 칸 빈 44%) Q13@1440○(중복 0) | RC01 | 4559/4558/3545/2815 |
| I02 waitlist | 기본 | 기본 | neon(dark)/neon-glow-party/geometric/comfortable/dramatic/minimal | A | 0/0/0/0 (0) | —/— | Q01@320○(3개 3열) Q10@320○(93px) Q01@390○(3개 3열) Q13@390○(중복 0) Q01@768○(3개 3열) Q10@768○(125px) Q01@1440○(3개 3열) Q06@1440○(오른쪽 빈 32%) Q10@1440○(125px) Q13@1440○(중복 0) | RC01 | 1575/1561/1518/1422 |
| I02 waitlist | Recipe | hero:product | neon(dark)/neon-glow-party/geometric/comfortable/dramatic/minimal | A | 0/0/0/0 (0) | —/— | Q13@390○(중복 0) Q06@1440○(오른쪽 빈 20% 시각요소) Q13@1440○(중복 0) | − | 1701/1734/1394/1352 |
| I02 waitlist | AI | hero:statement | aurora(dark)/turquoise-harmony/geometric/comfortable/balanced/topbar | A | 0/0/0/0 (0) | —/— | Q01@320○(3개 3열) Q10@320○(93px) Q01@390○(3개 3열) Q13@390○(중복 0) Q01@768○(3개 3열) Q10@768○(125px) Q01@1440○(3개 3열) Q06@1440×(오른쪽 빈 55%) Q10@1440○(125px) Q13@1440○(중복 0) | RC01 | 1730/1654/1530/1470 |
| I03 saas-landing | 기본 | 기본 | trust(light)/serene-blue/sans/comfortable/balanced/topbar | B (MEASURE_SHORT 1440×2) | 0/0/0/0 (0) | 1.81/1.58 | Q13@390○(중복 0) Q06@1440○(오른쪽 빈 53% 시각요소) Q07@1440○(낮은 칸 빈 52%) Q13@1440○(중복 0) | − | 6635/6398/5043/4817 |
| I03 saas-landing | Recipe | 기본 | trust(light)/serene-blue/sans/comfortable/balanced/topbar | B (MEASURE_SHORT 1440×2) | 0/0/0/0 (0) | 1.81/1.58 | Q13@390○(중복 0) Q06@1440○(오른쪽 빈 53% 시각요소) Q07@1440○(낮은 칸 빈 52%) Q13@1440○(중복 0) | − | 6635/6398/5043/4817 |
| I03 saas-landing | AI | rhythm:banded steps:cards faq:split | trust(light)/serene-blue/sans/comfortable/balanced/topbar | B (MEASURE_SHORT 1440×2) | 0/0/0/0 (0) | 1.81/1.58 | Q13@390○(중복 0) Q06@1440○(오른쪽 빈 53% 시각요소) Q07@1440○(낮은 칸 빈 52%) Q13@1440○(중복 0) | − | 6809/6596/5159/4808 |
| I04 sales-dashboard | 기본 | 기본 | enterprise(light)/cotton-candy-skies/sans/comfortable/balanced/sidebar | A | 0/0/0/0 (0) | —/— | Q04@768○(빈공간 180px/35%) Q04@1440○(빈공간 77px/15%) Q11@1440○(4개 1행) | − | 2937/2734/1941/1800 |
| I04 sales-dashboard | Recipe | 기본 | enterprise(light)/cotton-candy-skies/sans/comfortable/balanced/sidebar | A | 0/0/0/0 (0) | —/— | Q04@768○(빈공간 180px/35%) Q04@1440○(빈공간 77px/15%) Q11@1440○(4개 1행) | − | 2937/2734/1941/1800 |
| I04 sales-dashboard | AI | data:bordered | enterprise(light)/serene-blue/humanist/comfortable/balanced/sidebar | A | 0/0/0/0 (0) | —/— | Q04@768○(빈공간 184px/35%) Q04@1440○(빈공간 77px/15%) Q11@1440○(4개 1행) | − | 2955/2761/1956/1808 |
| I05 dashboard-overview | 기본 | 기본 | workspace(light)/ocean/sans/comfortable/balanced/sidebar | B (MEASURE_SHORT 768×1) | 0/0/0/0 (0) | —/— | Q11@1440○(4개 1행) | − | 2211/1901/1880/1390 |
| I05 dashboard-overview | Recipe | 기본 | workspace(light)/ocean/sans/comfortable/balanced/sidebar | B (MEASURE_SHORT 768×1) | 0/0/0/0 (0) | —/— | Q11@1440○(4개 1행) | − | 2211/1901/1880/1390 |
| I05 dashboard-overview | AI | data:striped | workspace(light)/ocean/sans/comfortable/balanced/sidebar | B (MEASURE_SHORT 768×1) | 0/0/0/0 (0) | —/— | Q11@1440○(4개 1행) | − | 2141/1881/1860/1390 |
| I06 hr-people | 기본 | 기본 | enterprise(light)/cotton-candy-skies/sans/comfortable/balanced/sidebar | A | 0/0/0/0 (0) | —/— | Q08@1440×(채움 74%, 왜곡 2.13배) Q11@1440○(4개 1행) | RC05 | 2185/1987/1691/1581 |
| I06 hr-people | Recipe | 기본 | enterprise(light)/cotton-candy-skies/sans/comfortable/balanced/sidebar | A | 0/0/0/0 (0) | —/— | Q08@1440×(채움 74%, 왜곡 2.13배) Q11@1440○(4개 1행) | RC05 | 2185/1987/1691/1581 |
| I06 hr-people | AI | 기본 | trust(light)/serene-blue/sans/comfortable/balanced/topbar | A | 0/0/0/0 (0) | —/— | Q08@1440×(채움 74%, 왜곡 1.89배) Q11@1440○(4개 1행) | − | 2169/1971/1667/1661 |
| I07 article | 기본 | 기본 | editorial(light)/earth/serif/spacious/balanced/editorial | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/2) | − | 2060/1941/1915/2105 |
| I07 article | Recipe | 기본 | editorial(light)/earth/serif/spacious/balanced/editorial | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/2) | − | 2060/1941/1915/2105 |
| I07 article | AI | 기본 | journal(light)/soft-serenity-3/literary/spacious/balanced/centered | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/2) | − | 2130/2007/2027/2164 |
| I08 docs-reference | 기본 | 기본 | manual(light)/moonlit-mist/tech/comfortable/tight/sidebar | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/2) | − | 2958/2916/2801/2707 |
| I08 docs-reference | Recipe | 기본 | manual(light)/moonlit-mist/tech/comfortable/tight/sidebar | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/2) | − | 2958/2916/2801/2707 |
| I08 docs-reference | AI | data:bordered | manual(light)/moonlit-mist/tech/comfortable/tight/sidebar | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/2) | − | 2960/2918/2803/2709 |
| I09 blog-post | 기본 | 기본 | journal(light)/soft-serenity-3/humanist/spacious/balanced/centered | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/1) | − | 1341/1277/1461/1502 |
| I09 blog-post | Recipe | 기본 | journal(light)/soft-serenity-3/humanist/spacious/balanced/centered | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/1) | − | 1341/1277/1461/1502 |
| I09 blog-post | AI | 기본 | paper(light)/soft-sand/bookish/spacious/balanced/editorial | A | 0/0/0/0 (0) | —/— | Q12@1440○(불일치 0/1) | − | 1625/1513/1529/1581 |

## 심각 프로브 지적 상세(0이 아닌 것만)

없음.

## 팔 사이 같은 화면(HTML 해시 동일)

- I01 devtool-landing: 세 팔 모두 다름
- I02 waitlist: 세 팔 모두 다름
- I03 saas-landing: 기본=Recipe
- I04 sales-dashboard: 기본=Recipe
- I05 dashboard-overview: 기본=Recipe
- I06 hr-people: 기본=Recipe
- I07 article: 기본=Recipe
- I08 docs-reference: 기본=Recipe
- I09 blog-post: 기본=Recipe
