export const PLAYGROUND_KEYS: readonly string[];
export function variantKey(name: string): string;
export function variantNameOf(key: string, material: {variants?: Record<string, unknown>} | null | undefined): string | null;
