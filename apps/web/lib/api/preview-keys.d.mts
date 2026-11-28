export const ENGINE_VERSION: string;
export const CATALOG_VERSION: string;
export function platformMaterialIds(request: unknown): string[];
export function designMaterialIds(ref: {template: string; theme?: string; variant?: string; palette?: string; layout?: Record<string, string>}): string[];
export type PreviewTarget =
  | {kind: 'design'; ref: {template: string; theme?: string; variant?: string; palette?: string; mode?: string; layout?: Record<string, string>}; width?: number | null}
  | {kind: 'component'; type: string; version?: string; width?: number | null}
  | {kind: 'assemble'; request: Record<string, any>; width?: number | null}
  | {kind: 'components'; request: Record<string, any>; width?: number | null};
export function previewKeyOf(target: PreviewTarget): string;
