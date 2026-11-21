import type {Metadata} from 'next';
import {Suspense} from 'react';
import {comboIndex} from '@/features/explore/qa/combos.server';
import {ComboExplorer} from '@/features/explore/qa/ComboExplorer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: '전체 조합 QA', robots: {index: false, follow: false}};

export default function CombosQaPage() {
  return <Suspense fallback={<p>조합 탐색기를 불러오는 중입니다.</p>}><ComboExplorer index={comboIndex()} /></Suspense>;
}
