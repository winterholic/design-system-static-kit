/**
 * Foundations 및 상세 전시에 필요한 플랫폼·카탈로그 정의 인벤토리 재내보내기.
 * apps/web 이 Core 내부 data/ 디렉터리를 직접 import 하지 않고 공개 서비스 경계를 거치도록 한다.
 * 모든 공유 인벤토리는 깊은 동결(deepFreeze)되어 소비자의 임의 변경이 Core 결정론이나 컴파일을 해치지 않는다.
 */
import {SPACING_MATERIALS as RAW_SPACING_MATERIALS, SPACING_ROLES as RAW_SPACING_ROLES} from '../platform/data/spacing.mjs';
import {SURFACE_FACETS as RAW_SURFACE_FACETS, SURFACES as RAW_SURFACES, FACET_SHADOW as RAW_FACET_SHADOW} from '../platform/data/surfaces.mjs';
import {RADIUS as RAW_RADIUS, ELEVATION as RAW_ELEVATION} from '../styles/base.mjs';
import {BACKGROUNDS as RAW_BACKGROUNDS} from '../platform/data/backgrounds.mjs';
import {MOTIONS as RAW_MOTIONS, MOTION_PATTERNS as RAW_MOTION_PATTERNS} from '../platform/data/motion.mjs';
import {ICON_MATERIALS as RAW_ICON_MATERIALS} from '../platform/data/icons.mjs';
import {LAYOUTS as RAW_LAYOUTS} from '../platform/data/layouts.mjs';
import {chartPresetMaterials as RAW_chartPresetMaterials} from '../materials/chart-presets.mjs';
import {chunks as RAW_chunks} from '../styles/chunks.mjs';
import {LAYOUT_COMPONENTS as RAW_LAYOUT_COMPONENTS} from '../platform/families/layout.mjs';
import {PATTERNS as RAW_PATTERNS} from '../profiles/data.mjs';

function deepFreeze(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object' || seen.has(obj)) return obj;
  seen.add(obj);
  if (!Object.isFrozen(obj)) Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = obj[key];
    if (val !== null && typeof val === 'object') {
      deepFreeze(val, seen);
    }
  }
  return obj;
}

export const SPACING_MATERIALS = deepFreeze(RAW_SPACING_MATERIALS);
export const SPACING_ROLES = deepFreeze(RAW_SPACING_ROLES);
export const SURFACE_FACETS = deepFreeze(RAW_SURFACE_FACETS);
export const SURFACES = deepFreeze(RAW_SURFACES);
export const FACET_SHADOW = deepFreeze(RAW_FACET_SHADOW);
export const RADIUS = deepFreeze(RAW_RADIUS);
export const ELEVATION = deepFreeze(RAW_ELEVATION);
export const BACKGROUNDS = deepFreeze(RAW_BACKGROUNDS);
export const MOTIONS = deepFreeze(RAW_MOTIONS);
export const MOTION_PATTERNS = deepFreeze(RAW_MOTION_PATTERNS);
export const ICON_MATERIALS = deepFreeze(RAW_ICON_MATERIALS);
export const LAYOUTS = deepFreeze(RAW_LAYOUTS);
export const chartPresetMaterials = deepFreeze(RAW_chartPresetMaterials);
export const chunks = deepFreeze(RAW_chunks);
export const LAYOUT_COMPONENTS = deepFreeze(RAW_LAYOUT_COMPONENTS);
export const PATTERNS = deepFreeze(RAW_PATTERNS);

