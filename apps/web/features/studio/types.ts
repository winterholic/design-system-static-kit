// Studio 상태 모델의 공통 타입. 문서(Blueprint)는 Core가 만든 불변 객체이고 Studio는 읽기만 한다.
export type Blueprint = {[key: string]: any};
export type Node = {type: string; [key: string]: any};
/** 선택 경로. `tree.children`을 따라가는 인덱스 배열이며 []는 페이지 루트다(`src/edit`의 경로 표기와 같다). */
export type NodePath = number[];

export type Diagnostic = {code: string; path: string; message: string; hint: string; fix?: Record<string, string>; rule?: string};
export type OpResult = {ok: boolean; doc: Blueprint; changes: unknown[]; errors: Diagnostic[]; warnings: Diagnostic[]; content: unknown};

/** 템플릿에서 만든 문서의 출처. 가져온 문서는 출처를 알 수 없으므로 null이다(D2). */
export type OriginInfo = {template: string; layout: Record<string, string>; themeVariant: string | null; palette: string | null};
export type Origin = OriginInfo | null;

/** 사용자가 디자인 탭에서 직접 고른 스타일 축. 테마를 바꿔도 새 테마가 허용하는 한 다시 입힌다. */
export type Picks = Record<string, string>;

export type Tab = 'structure' | 'design' | 'check';
export type Pane = 'split' | 'edit' | 'preview';
export type Device = 390 | 768 | 1280;
export type ScaleMode = 'fit' | 'actual';
export type PreviewScheme = 'document' | 'light' | 'dark';

export const TABS: readonly Tab[] = ['structure', 'design', 'check'];
export const PANES: readonly Pane[] = ['split', 'edit', 'preview'];
export const DEVICES: readonly Device[] = [390, 768, 1280];
export const SCHEMES: readonly PreviewScheme[] = ['document', 'light', 'dark'];

export type StartRequest = {template?: string; theme?: string; variant?: string; palette?: string; mode?: string; layout?: Record<string, string>};

export type CatalogItem = {id: string; label: string; pageType: string; theme: string};
export type ThemeVariant = {id: string; label: string; description: string; set: Record<string, string>};
export type ThemeItem = {id: string; name: string; palettes: string[]; variants: ThemeVariant[]; forbid: Record<string, string[]>};
export type LayoutOption = {id: string; label: string; description: string; recommended: boolean};
export type LayoutSlot = {id: string; label: string; options: LayoutOption[]};
export type ComponentItem = {type: string; label: string; group: string; childTypes: string[]};
export type AxisItem = {axis: string; label: string; values: string[]; descriptions: Record<string, string>};
export type PaletteItem = {id: string; label: string};
export type FieldSchema = {type?: string; enum?: unknown[]; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; items?: unknown; properties?: unknown};
export type ComponentSpec = {type: string; label: string; fields: Record<string, FieldSchema>; required: string[]; optional: string[]; children: {allowed: string[]; min: number; max: number} | null; example: Node | null};
