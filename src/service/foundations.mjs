/**
 * Foundations 및 상세 전시에 필요한 플랫폼·카탈로그 정의 인벤토리 재내보내기.
 * apps/web 이 Core 내부 data/ 디렉터리를 직접 import 하지 않고 공개 서비스 경계를 거치도록 한다.
 */
export {SPACING_MATERIALS, SPACING_ROLES} from '../platform/data/spacing.mjs';
export {SURFACE_FACETS, SURFACES, FACET_SHADOW} from '../platform/data/surfaces.mjs';
export {RADIUS, ELEVATION} from '../styles/base.mjs';
export {BACKGROUNDS} from '../platform/data/backgrounds.mjs';
export {MOTIONS, MOTION_PATTERNS} from '../platform/data/motion.mjs';
export {ICON_MATERIALS} from '../platform/data/icons.mjs';
export {LAYOUTS} from '../platform/data/layouts.mjs';
export {chartPresetMaterials} from '../materials/chart-presets.mjs';
export {chunks} from '../styles/chunks.mjs';
export {LAYOUT_COMPONENTS} from '../platform/families/layout.mjs';
export {PATTERNS} from '../profiles/data.mjs';
