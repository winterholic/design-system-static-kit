export type View = {concept: string | null; look: string | null; theme: string | null; tv: string | null; pal: string | null; mode: 'light' | 'dark' | null; type: string | null};
export type ComboLite = {id: string; t: number; n: number; ch: number; x?: string; s?: number; r?: {l: string; k: string[]; e: string[]; v?: {concept: string; look: string}}};
export type ComboIndex = {
  catalogVersion: string;
  templates: {id: string; label: string; pageType: string}[];
  pageTypes: {id: string; label: string}[];
  slots: {id: string; label: string; options: {id: string; label: string; count: number}[]}[];
  concepts: {id: string; label: string; templates: string[]; looks: {id: string; label: string}[]}[];
  themes: {id: string; name: string; category: string; variants: {id: string; label: string}[]; palettes: string[]}[];
  categories: {id: string; label: string}[];
  palettes: {id: string; name: string; family: string}[];
  families: {id: string; label: string}[];
  typography: {id: string; label: string}[];
  combos: ComboLite[];
};
export const EMPTY_VIEW: View = {concept: null, look: null, theme: null, tv: null, pal: null, mode: null, type: null};
