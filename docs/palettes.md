# 팔레트 근거

## 1. 무엇을 근거로 골랐나

팔레트는 [Coolors](https://coolors.co/palettes/popular)의 인기 목록에서 가져왔습니다. 2026-10-20에 호스트의 Chromium으로 목록 페이지 73곳(trending·popular·색 계열·분위기 태그별)을 스크롤하며 스워치 hex, 팔레트 제목, **좋아요 수**를 읽었고 중복을 걸러 1,288개를 `docs/evidence/coolors-popular-2026-10-20.json`에 남겼습니다. 앞선 2026-10-18 기록(`docs/evidence/coolors-palettes.json`, 814개 관측)에서 쓴 160개를 더해 라이브러리는 **427개**입니다.

- 인기 순위는 Coolors가 보여 준 좋아요 수일 뿐이며 디자인 품질의 증거가 아닙니다. 순위나 저작자는 추정하지 않았고, 팔레트 이름·색의 재사용 조건은 확인하지 못했습니다(**확인 필요**). 각 팔레트에 원본 URL을 둡니다.
- 일부 페이지에서 제목 줄이 순번으로 읽힌 항목은 파싱 오류로 보고 버렸습니다(56개).

## 2. 어떻게 걸렀나

1. 4~7색, 서로 다른 색 4개 이상, 명도 차이가 있는 팔레트만 후보로 둡니다. 크리스마스·핼러윈 같은 시즌 팔레트는 뺍니다.
2. 계열(11개)은 브랜드 스워치의 색상·채도·명도와 스워치 전체의 퍼짐으로 코드가 계산합니다. 손으로 붙인 이름과 어긋나지 않습니다.
3. 계열별 상한 안에서 좋아요 수가 높은 순으로 채웁니다. **보라-파랑이 대부분을 차지하는 팔레트**(흔한 인디고·바이올렛 그라데이션)와 **네온 무지개**는 상한을 두어 목록이 그 색으로 쏠리지 않게 했습니다. 퍼플 계열은 16개(3.7%)이고 어느 테마의 기본값도 아닙니다(허브·아틀리에·플레이풀·네온·키즈·컬러블록·녹턴·게임·웨딩 제외).
4. 대비는 선정 기준이 아니라 토큰 해석이 보장합니다. 어떤 팔레트든 원색을 필요한 만큼만 어둡게·밝게 옮겨 모든 역할 쌍이 WCAG AA(본문 7:1, 보조 4.5:1, 구조선·포커스·차트 3:1)를 넘게 하고, 전수 결과는 `docs/evidence/contrast.json`입니다(427개 × 2모드 89,670쌍).
5. 테마마다 추천 8개를 정합니다. 테마가 선호하는 계열·명도, 좋아요 수, 이미 다른 테마가 쓴 정도로 점수를 매기고, 점수만으로는 성격과 어긋나는 기본값(분석 대시보드에 파스텔 핑크, 학교에 분홍·시안)은 사람이 화면으로 읽고 고쳤습니다. 이 선정은 취향의 근사이며 미감을 보증하지 않습니다.

## 3. 계열별 수

| 계열 | 수 |
|---|---|
| 뉴트럴 | 23 |
| 어스·베이지 | 58 |
| 레드 | 46 |
| 오렌지 | 37 |
| 옐로 | 26 |
| 그린 | 51 |
| 틸·민트 | 54 |
| 블루 | 55 |
| 퍼플 | 16 |
| 핑크 | 32 |
| 멀티 | 29 |

## 4. 좋아요가 가장 많은 팔레트

| 이름 | 계열 | 좋아요 | 스워치 |
|---|---|---|---|
| [Sunny Beach Day](https://coolors.co/palette/264653-2a9d8f-e9c46a-f4a261-e76f51) | 멀티 | 124,400 | #264653 #2A9D8F #E9C46A #F4A261 #E76F51 |
| [올리브 가든](https://coolors.co/palette/606c38-283618-fefae0-dda15e-bc6c25) | 그린 | 97,400 | #606C38 #283618 #FEFAE0 #DDA15E #BC6C25 |
| [파스텔 드림](https://coolors.co/palette/cdb4db-ffc8dd-ffafcc-bde0fe-a2d2ff) | 퍼플 | 88,000 | #CDB4DB #FFC8DD #FFAFCC #BDE0FE #A2D2FF |
| [Golden Summer Fields](https://coolors.co/palette/ccd5ae-e9edc9-fefae0-faedcd-d4a373) | 어스·베이지 | 84,800 | #CCD5AE #E9EDC9 #FEFAE0 #FAEDCD #D4A373 |
| [Summer Ocean Breeze](https://coolors.co/palette/e63946-f1faee-a8dadc-457b9d-1d3557) | 레드 | 79,100 | #E63946 #F1FAEE #A8DADC #457B9D #1D3557 |
| [Muted Earthy Tones](https://coolors.co/palette/ffcdb2-ffb4a2-e5989b-b5838d-6d6875) | 핑크 | 75,200 | #FFCDB2 #FFB4A2 #E5989B #B5838D #6D6875 |
| [Refreshing Summer Fun](https://coolors.co/palette/8ecae6-219ebc-023047-ffb703-fb8500) | 멀티 | 67,800 | #8ECAE6 #219EBC #023047 #FFB703 #FB8500 |
| [Cozy Neutral Retreat](https://coolors.co/palette/cb997e-ddbea9-ffe8d6-b7b7a4-a5a58d-6b705c) | 어스·베이지 | 65,100 | #CB997E #DDBEA9 #FFE8D6 #B7B7A4 #A5A58D #6B705C |
| [블랙 앤 골드](https://coolors.co/palette/000000-14213d-fca311-e5e5e5-ffffff) | 오렌지 | 54,400 | #000000 #14213D #FCA311 #E5E5E5 #FFFFFF |
| [오션 펄](https://coolors.co/palette/006d77-83c5be-edf6f9-ffddd2-e29578) | 틸·민트 | 52,200 | #006D77 #83C5BE #EDF6F9 #FFDDD2 #E29578 |
| [포레스트](https://coolors.co/palette/dad7cd-a3b18a-588157-3a5a40-344e41) | 그린 | 48,900 | #DAD7CD #A3B18A #588157 #3A5A40 #344E41 |
| [Neutral Harmony Bliss](https://coolors.co/palette/f4f1de-e07a5f-3d405b-81b29a-f2cc8f) | 레드 | 48,100 | #F4F1DE #E07A5F #3D405B #81B29A #F2CC8F |
| [Warm Autumn Glow](https://coolors.co/palette/003049-d62828-f77f00-fcbf49-eae2b7) | 오렌지 | 48,100 | #003049 #D62828 #F77F00 #FCBF49 #EAE2B7 |
| [Sweet Summer Melody](https://coolors.co/palette/f6bd60-f7ede2-f5cac3-84a59d-f28482) | 오렌지 | 46,200 | #F6BD60 #F7EDE2 #F5CAC3 #84A59D #F28482 |
| [Soft Sand](https://coolors.co/palette/edede9-d6ccc2-f5ebe0-e3d5ca-d5bdaf) | 어스·베이지 | 45,700 | #EDEDE9 #D6CCC2 #F5EBE0 #E3D5CA #D5BDAF |
| [라벤더 잉크](https://coolors.co/palette/22223b-4a4e69-9a8c98-c9ada7-f2e9e4) | 블루 | 45,600 | #22223B #4A4E69 #9A8C98 #C9ADA7 #F2E9E4 |
| [피치 딜라이트](https://coolors.co/palette/d8e2dc-ffe5d9-ffcad4-f4acb7-9d8189) | 뉴트럴 | 43,700 | #D8E2DC #FFE5D9 #FFCAD4 #F4ACB7 #9D8189 |
| [오션 블루](https://coolors.co/palette/03045e-023e8a-0077b6-0096c7-00b4d8-48cae4-90e0ef-ade8f4-caf0f8) | 블루 | 41,200 | #03045E #023E8A #0077B6 #0096C7 #00B4D8 #48CAE4 #90E0EF #ADE8F4 #CAF0F8 |
| [Warm Neutrals](https://coolors.co/palette/cb997e-eddcd2-fff1e6-f0efeb-ddbea9-a5a58d-b7b7a4) | 어스·베이지 | 39,800 | #CB997E #EDDCD2 #FFF1E6 #F0EFEB #DDBEA9 #A5A58D #B7B7A4 |
| [버디그리스](https://coolors.co/palette/cad2c5-84a98c-52796f-354f52-2f3e46) | 그린 | 38,200 | #CAD2C5 #84A98C #52796F #354F52 #2F3E46 |
| [Pastel Bliss](https://coolors.co/palette/ffb5a7-fcd5ce-f8edeb-f9dcc4-fec89a) | 오렌지 | 37,500 | #FFB5A7 #FCD5CE #F8EDEB #F9DCC4 #FEC89A |
| [워터멜론 소르베](https://coolors.co/palette/ef476f-ffd166-06d6a0-118ab2-073b4c) | 멀티 | 36,200 | #EF476F #FFD166 #06D6A0 #118AB2 #073B4C |
| [파이어리 오션](https://coolors.co/palette/780000-c1121f-fdf0d5-003049-669bbc) | 레드 | 34,900 | #780000 #C1121F #FDF0D5 #003049 #669BBC |
| [코스털 레드](https://coolors.co/palette/2b2d42-8d99ae-edf2f4-ef233c-d90429) | 레드 | 34,300 | #2B2D42 #8D99AE #EDF2F4 #EF233C #D90429 |

## 5. 테마별 기본 팔레트

| 테마 | 기본 | 추천 수 |
|---|---|---|
| 워크스페이스(`workspace`) | 오션 블루 | 8 |
| 레저(`ledger`) | Dark Slate Whisper | 8 |
| 콘솔(`console`) | Midnight Ocean Depths | 8 |
| 오로라(`aurora`) | Turquoise Harmony | 8 |
| 트러스트(`trust`) | Serene Blue | 8 |
| 인사이트(`insight`) | Deep Blue Sea | 8 |
| 허브(`hub`) | Peachy Blossom Delight | 8 |
| 프리시전(`precision`) | 라이트 스틸 | 8 |
| 네온(`neon`) | Neon Glow Party | 8 |
| 플레이풀(`playful`) | Bright Contrasts | 8 |
| 스튜디오(`studio`) | Soft Whispering Snow | 8 |
| 갤러리(`gallery`) | 피치 딜라이트 | 8 |
| 브루탈(`brutalist`) | Sunset Glow | 8 |
| 레트로(`retro`) | Earthy Neutral Tones | 8 |
| 시그널(`signal`) | 파이어리 오션 | 8 |
| 에디토리얼(`editorial`) | 어스 페이퍼 | 8 |
| 페이퍼(`paper`) | Soft Sand | 8 |
| 매뉴얼(`manual`) | Moonlit Mist | 8 |
| 저널(`journal`) | Soft Serenity | 8 |
| 매거진(`magazine`) | Classic Red Palette | 8 |
| 보태니컬(`botanical`) | 올리브 가든 | 8 |
| 클라우드(`cloud`) | Soft Pastel Shades | 8 |
| 클리닉(`clinic`) | Refreshing Aqua Tones | 8 |
| 다이닝(`dining`) | Cherry Forest Oasis | 8 |
| 카페(`cafe`) | Toasty Cinnamon Latte | 8 |
| 스테이(`stay`) | Summer Sunset | 8 |
| 커머스(`commerce`) | Sweet Summer Melody | 8 |
| 뷰티(`beauty`) | Rosy Blush Gradient | 8 |
| 리얼티(`realty`) | Midnight Ocean Depths | 8 |
| 아틀리에(`atelier`) | Candy Floss Dreams | 8 |
| 러닝(`learning`) | Coral Reef | 8 |
| 시빅(`civic`) | Deep Blue Sea | 8 |
| 한지(`hanji`) | Neutral Harmony Bliss | 8 |
| 헤리티지(`heritage`) | Golden Harvest Glow | 8 |
| 클래리티(`clarity`) | Ocean Breeze | 8 |
| 포켓(`pocket`) | Earthy Green Tones | 8 |
| 녹턴(`nocturne`) | Dark Midnight Shades | 8 |
| 스포츠(`sport`) | Sunrise Glow | 8 |
| 솔라(`solar`) | Sunny Meadow Shades | 8 |
| 오션(`ocean`) | Ocean Serenity | 8 |
| 엔터프라이즈(`enterprise`) | Cotton Candy Skies | 8 |
| 데브툴(`devtool`) | Ocean Blue Adventure | 8 |
| 럭셔리(`luxe`) | 블랙 앤 골드 | 8 |
| 스위스(`swiss`) | 코스털 레드 | 8 |
| 컬러블록(`colorblock`) | Contrast Pop | 8 |
| 뉴스룸(`newsroom`) | Summer Ocean Breeze | 8 |
| 아카데믹(`academic`) | Deep Sea | 8 |
| 웨딩(`wedding`) | Pastel Dreams | 8 |
| 키즈(`kids`) | Bright Bold Colors | 8 |
| 와인바(`wine`) | Crimson Hues | 8 |
| 가든(`garden`) | Serene Nature Tones | 8 |
| 스쿨(`school`) | Azure Skies | 8 |
| 뱅크(`bank`) | 오션 펄 | 8 |
| 게임(`game`) | Midnight Fire | 8 |
