// 조립 플랫폼 서비스 함수의 입출력 모양(docs/platform/web-service-needs.md). 웹은 이 모양만 가정하고 값은 Core 서비스가 준 것을 그대로 쓴다.
export type Diag = {code: string; path: string; message: string; hint?: string; alternatives?: string[]};
export type Envelope<T> = {ok: true; value: T; warnings: Diag[]} | {ok: false; errors: Diag[]; warnings?: Diag[]; blocked?: Blocked[]; stage?: string};

export type Output = {css: string; html: string; standalone: string; script?: string; tokens: unknown; manifest: Record<string, any>};
export type Decision = {slot: string; id: string; source: 'intent' | 'recommend' | 'content' | 'style-context' | string; score: number; reasons: ({reason?: string; priority?: number} | string)[]};
export type Candidate = {
  id: string; rank: number; score: number; adjustedScore: number;
  selection: Record<string, unknown>; decisions: Decision[]; reasons: string[];
  quality: {ok: boolean} & Record<string, unknown>; value: Output; fingerprint: string;
};
export type Blocked = {id?: string; combination?: unknown; blocked: {code: string; reason: string; with?: string}[]};
export type AssembleValue = {selected: string; candidates: Candidate[]; blocked: Blocked[]; comparison: {against?: {id: string; sentences?: string[]; summary?: string}[]} | null; plan: Record<string, any>; decisions: Decision[]};

/** 조립 요청(docs/platform/pages.md §2). 재료 id는 접두(`palette:`)가 붙은 값이다. */
export type AssembleRequest = {
  purpose: string; pattern?: string; shell?: string; width?: string; density?: string; mode?: 'light' | 'dark';
  styleContext?: string; palette?: string; subtokenSet?: string; typeSystem?: string; families?: string[];
  components?: {base: string; family?: string; props?: Record<string, unknown>; content: Record<string, unknown>; slot?: string}[];
  content?: Record<string, unknown>; candidates?: number;
};

export type Material = {id: string; kind: string; label: string; tags?: string[]; contexts?: string[]; seeds?: Record<string, string>; tone?: string; modes?: string[]; roles?: unknown; relations?: {type: string; to: string; priority: number; reason: string}[]; facePairing?: string; roleScale?: string; quality?: {status: string}; [k: string]: unknown};
export type Ranked = {id: string; score: number; reasons: {reason?: string; priority?: number; type?: string; from?: string}[]};
export type RecommendValue = {kind: string; ranked: Ranked[]; blocked: {id: string; blocked: {code: string; reason: string; with?: string}[]}[]};

export type PurposeFamily = {
  id: string; group: string; label: string; purpose: string; contexts: string[]; children: string[];
  variants: Record<string, string[]>; props: Record<string, string[]>; defaults: Record<string, string>;
  content: Record<string, {required?: boolean; type: string}>; states: string[];
  forbidden: {id: string; when: Record<string, unknown>; why: string}[];
  responsive: {strategy: string; behavior: string}; a11y: {role: string; keyboard: string};
  example: {variant: Record<string, string>; props: Record<string, string>; content: Record<string, unknown>};
};
export type PurposeList = {items: PurposeFamily[]; groups: string[]; visuals: {id: string; label: string}[]};

export type ProposeValue = {
  assignments: {slot: string; seed: string; source: 'user' | 'derived' | string}[]; ignored: unknown[];
  candidates: {set: string; label: string; modes: Record<string, {vars: Record<string, string>}>; margin?: number}[];
  rejected: {set: string; label: string; reasons: {mode?: string; code: string; message: string}[]}[];
};
