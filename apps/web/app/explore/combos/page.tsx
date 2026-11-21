import {redirect} from 'next/navigation';

// 이전에 임시로 쓰던 주소. 전체 조합 탐색기는 내부 QA 경로로 옮겼다. 쿼리는 그대로 넘긴다.
type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};

export default async function LegacyCombos({searchParams}: Props) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  redirect(q.size ? `/dev/qa/combos?${q}` : '/dev/qa/combos');
}
