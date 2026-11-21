const VIEW_KEYS = ['concept', 'look', 'theme', 'tv', 'pal', 'type', 'mode'];

export function readFlags(raw) {
  try {
    const records = JSON.parse(raw ?? '[]');
    return Array.isArray(records) ? records.filter(x => x && typeof x.c === 'string').map(x => ({...x})) : [];
  } catch { return []; }
}

export function flagIdentity(flag) {
  return JSON.stringify([flag.c, ...VIEW_KEYS.map(key => flag[key] || '')]);
}

export function toggleFlag(flags, id, view, at = new Date().toISOString()) {
  const candidate = {c: id, ...Object.fromEntries(VIEW_KEYS.map(key => [key, view[key] || null]))};
  const key = flagIdentity(candidate);
  const index = flags.findIndex(flag => flagIdentity(flag) === key);
  if (index >= 0) return flags.filter((_, i) => i !== index);
  return [...flags, {...candidate, note: '', at}];
}

export function updateFlagNote(flags, index, note) {
  return flags.map((flag, i) => i === index ? {...flag, note: note.slice(0, 200)} : flag);
}

export function flagUrl(flag, pathname, search = '') {
  const params = new URLSearchParams(search);
  params.set('c', flag.c);
  for (const key of VIEW_KEYS) flag[key] ? params.set(key, flag[key]) : params.delete(key);
  return `${pathname}?${params}`;
}

export function flagsToText(flags, origin) {
  const lines = [`# 이상함 표시 ${flags.length}건`, ''];
  for (const flag of flags) {
    lines.push(`- ${flag.c}`, `  시각: ${flag.at || '기록 없음'}`);
    if (flag.note) lines.push(`  메모: ${flag.note}`);
    lines.push(`  ${origin}${flagUrl(flag, '/dev/qa/combos')}`, '');
  }
  return lines.join('\n');
}
