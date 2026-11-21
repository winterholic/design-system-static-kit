export type FlagRecord = {c: string; concept?: string|null; look?: string|null; theme?: string|null; tv?: string|null; pal?: string|null; type?: string|null; mode?: 'light'|'dark'|null; note?: string; at?: string};
export function readFlags(raw: string|null): FlagRecord[];
export function flagIdentity(flag: Partial<FlagRecord> & {c: string}): string;
export function toggleFlag(flags: FlagRecord[], id: string, view: Partial<FlagRecord>, at?: string): FlagRecord[];
export function updateFlagNote(flags: FlagRecord[], index: number, note: string): FlagRecord[];
export function flagUrl(flag: FlagRecord, pathname: string, search?: string): string;
export function flagsToText(flags: FlagRecord[], origin: string): string;
