// Materials 화면 데이터 모양. 서버(materials.server.ts)가 Core에서 읽어 만들고, 클라이언트 부품은 이것만 받는다.
export type ColorLayer = 'primitive' | 'semantic' | 'state' | 'component';
export type ColorRow = {
  id: string; layer: ColorLayer; family: string; name: string; cssName: string;
  light: string | null; dark: string | null;
  refs: {id: string; label: string}[]; usedBy: {component: string; states: string[]}[]; states: string[];
  /** token: 그래프의 값 자체, usage: 부품이 읽는 CSS 변수 이름 */
  kind: 'token' | 'usage';
};
export type ColorFamily = {id: string; label: string; layer: ColorLayer};
export type SeedView = {id: string; label: string; hex: string; usage: string};
export type RampView = {id: string; label: string; seed: string; steps: {step: string; hex: string; isSeed: boolean}[]};
export type ColorView = {
  palette: {id: string; version: string};
  seeds: SeedView[]; ramps: RampView[]; rows: ColorRow[]; families: ColorFamily[];
  layers: {id: ColorLayer; label: string; count: number}[];
  scenes: {light: Record<string, string>; dark: Record<string, string>};
  contrast: {light: {name: string; ratio: number; minimum: number}[]; dark: {name: string; ratio: number; minimum: number}[]};
};

export type RoleView = {name: string; size: string; weight: number; lineHeight: number; tracking: number; policy: string; fontFamily: string};
export type ControlView = {size: string; height: number; padX: number; gap: number; iconPx: number; labelRole: string};
export type PresetView = {id: string; label: string; density: string; context: string[]; engine: string; roles: RoleView[]; controls: ControlView[]; css: string};
export type TypeView = {presets: PresetView[]; corpus: {id: string; role: string; text: string; policy: string}[]; controlSizes: string[]; studioTemplates: Record<string, string | null>};

export type FoundationAxis = {
  axis: string; label: string; category: string; table: unknown;
  values: {id: string; description: string; studio: {ok: true} | {ok: false; code: string}}[];
};
export type IconRow = {id: string; paths: string[]};
