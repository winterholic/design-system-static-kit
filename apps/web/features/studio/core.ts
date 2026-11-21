// Core 진입점은 공개 export(./service, ./edit)뿐이다. 두 모듈은 카탈로그 전체(약 650KB)를 끌고 오므로
// Studio 시작 화면에서는 불러오지 않고, 문서가 필요해지는 첫 순간에 한 번만 동적 import 한다(03-interfaces.md S5).
import type {Blueprint, ComponentSpec, Diagnostic, OpResult} from './types';

export type Envelope<T> = {ok: true; value: T; warnings: Diagnostic[]; catalogVersion: string} | {ok: false; errors: Diagnostic[]; warnings: Diagnostic[]; catalogVersion: string};

/** src/edit/applicability.mjs: 연산 자체로 판정한 선택 가능성. errors는 연산이 거부할 때 내는 진단 그대로다. */
export type Choice = {id: string; ok: boolean; errors: Diagnostic[]};
export type LayoutChoice = Choice & {relocate: boolean};
export type PartChoice = {type: string; label: string; group: string};
export type Placement = {ok: boolean; accepted: PartChoice[]; rejected: {type: string; errors: Diagnostic[]}[]};

export interface Core {
  edit: {
    applyOp(doc: Blueprint | null, name: string, args: Record<string, unknown>): OpResult;
    partExample(type: string, catalogVersion?: string): Record<string, unknown> | null;
    addPlacements(doc: Blueprint, path: number[]): {inside: Placement; after: Placement};
    themeChoices(doc: Blueprint, opts?: {palette?: string}): Choice[];
    themeVariantChoices(doc: Blueprint, opts?: {palette?: string}): Choice[];
    paletteChoices(doc: Blueprint): Choice[];
    modeChoices(doc: Blueprint): Choice[];
    axisChoices(doc: Blueprint): Record<string, Choice[]>;
    layoutChoices(doc: Blueprint, slots: {id: string; options: {id: string}[]}[]): Record<string, LayoutChoice[]>;
  };
  service: {
    compileBlueprint(bp: unknown, opts?: Record<string, unknown>): Envelope<{html?: string; sizes?: unknown}>;
    validateBlueprint(bp: unknown): Envelope<{valid: true}>;
    listCatalog(q: Record<string, unknown>): Envelope<{items: any[]; total: number; nextCursor: string | null}>;
    getComponentSpec(q: {type: string; catalogVersion?: string}): Envelope<ComponentSpec>;
    getSchema(q: {target: 'blueprint'; fields?: string[]}): Envelope<{properties: Record<string, {enum?: string[]}>}>;
    getColorTokens(q?: Record<string, unknown>): Envelope<{options: {id: string; label: string}[]}>;
    getTypePresets(q?: Record<string, unknown>): Envelope<{presets: {id: string; label: string}[]}>;
    assembleBlueprint(q: {profile: string; intent: Record<string, unknown>; content: Record<string, unknown>}): Envelope<{blueprint: Blueprint}>;
  };
}

let loaded: Core | null = null;
let pending: Promise<Core> | null = null;

export function loadCore(): Promise<Core> {
  pending ??= Promise.all([
    import('@winterholic/design-system-static-kit/service'),
    import('@winterholic/design-system-static-kit/edit'),
  ]).then(([service, edit]) => (loaded = {service, edit} as unknown as Core));
  return pending;
}

/** 리듀서처럼 동기 코드가 쓴다. 불러오기 전에 부르면 프로그래밍 오류다. */
export function core(): Core {
  if (!loaded) throw new Error('Core가 아직 불러와지지 않았습니다. loadCore()를 먼저 기다리세요.');
  return loaded;
}
export const isCoreLoaded = () => loaded !== null;
