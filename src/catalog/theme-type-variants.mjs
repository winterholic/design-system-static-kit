/**
 * 테마마다 어울리는 서체 목소리를 두 가지씩 더 고를 수 있게 한다(테마 변형 `type-<프리셋>`).
 * 변형은 서체 프리셋(src/typography.mjs) 하나만 바꾸고 나머지 축은 테마 기본값을 그대로 둔다. 테마의 기본 서체와 같거나 이미 같은 서체의 변형이 있으면 건너뛴다.
 */
import {TYPE} from '../typography.mjs';

const PAIRS = {
  workspace: ['tech', 'geometric'], ledger: ['tech', 'swiss'], console: ['terminal', 'tech'], aurora: ['sans', 'swiss'], trust: ['humanist', 'newsroom'],
  insight: ['tech', 'swiss'], hub: ['geometric', 'humanist'], precision: ['swiss', 'terminal'], neon: ['poster', 'condensed'], playful: ['poster', 'geometric'],
  studio: ['swiss', 'luxe'], gallery: ['swiss', 'humanist'], brutalist: ['poster', 'mono'], retro: ['slab', 'poster'], signal: ['condensed', 'swiss'],
  editorial: ['newsroom', 'literary'], paper: ['literary', 'bookish'], manual: ['tech', 'humanist'], journal: ['literary', 'serif'], magazine: ['newsroom', 'luxe'],
  botanical: ['humanist', 'literary'], cloud: ['humanist', 'geometric'], clinic: ['humanist', 'rounded'], dining: ['luxe', 'literary'], cafe: ['serif', 'slab'],
  stay: ['serif', 'humanist'], commerce: ['geometric', 'serif'], beauty: ['luxe', 'humanist'], realty: ['serif', 'geometric'], atelier: ['humanist', 'swiss'],
  learning: ['humanist', 'geometric'], civic: ['humanist', 'bookish'], hanji: ['literary', 'bookish'], heritage: ['literary', 'bookish'], clarity: ['rounded', 'humanist'],
  pocket: ['geometric', 'humanist'], nocturne: ['luxe', 'condensed'], sport: ['condensed', 'poster'], solar: ['sans', 'rounded'], ocean: ['geometric', 'serif'],
  enterprise: ['tech', 'humanist'], devtool: ['terminal', 'mono'], luxe: ['literary', 'swiss'], swiss: ['grotesk', 'tech'], colorblock: ['poster', 'rounded'],
  newsroom: ['editorial', 'bookish'], academic: ['literary', 'tech'], wedding: ['luxe', 'literary'], kids: ['rounded', 'poster'], wine: ['luxe', 'literary'],
  garden: ['humanist', 'slab'], school: ['humanist', 'rounded'], bank: ['newsroom', 'humanist'], game: ['poster', 'condensed'],
};

export const typeVariantRows = (themeId, defaultTypography, existing) => (PAIRS[themeId] ?? [])
  .filter(id => TYPE[id] && id !== defaultTypography && !existing.some(v => v.set.typography === id))
  .map(id => ({id: 'type-' + id, label: '서체 ' + TYPE[id].label, description: TYPE[id].concept, set: {typography: id}}));
