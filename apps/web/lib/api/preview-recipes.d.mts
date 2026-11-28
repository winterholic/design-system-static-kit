type Row = Record<string, any>;
export type DesignRefLike = {template: string; theme?: string; variant?: string; palette?: string; mode?: string; layout?: Record<string, string>};
export function catalogRows(kind: string, fields: string[], extra?: Row): Row[];
export const THEMED_PER_TEMPLATE: number;
export function curatedDesignRefs(): {ref: DesignRefLike; concept: string | null; curationLabel: string | null}[];
export function buildDesignDocument(ref: DesignRefLike, resetArgs: (ref: any) => unknown): {ok: true; doc: any} | {ok: false; errors: {message: string}[]};
export const COMPONENT_BASE: {template: string; theme: string};
export function isolatedDoc(type: string, example: Row, variant?: string): {doc: unknown} | {error: string};
export function renderComponentView(
  view: {type: string; material: any; example: any; variantIds: string[]},
  variant?: string | Row,
  hooks?: {onCompile?: () => void},
): {ok: true; html: string; mode: 'isolated' | 'template'; template?: string} | {ok: false; reason: string};
