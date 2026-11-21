'use client';
import {useEffect, useRef, useState} from 'react';
import {Button, type ButtonVariant} from '@/ui';

/** 클립보드 복사 버튼. 결과는 버튼 글자와 보이지 않는 상태 영역(role=status)으로 함께 알린다. */
export function CopyButton({text, label, doneLabel = '복사했습니다', variant = 'quiet', what}: {text: string; label: string; doneLabel?: string; variant?: ButtonVariant; what?: string}) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState('done'); } catch { setState('failed'); }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1800);
  };
  return (
    <>
      <Button size="sm" variant={variant} onClick={copy} data-copy={text}>{state === 'done' ? doneLabel : state === 'failed' ? '복사하지 못했습니다' : label}</Button>
      <span className="visually-hidden" role="status" aria-live="polite">{state === 'done' ? `${what ?? text} 복사했습니다` : state === 'failed' ? '복사하지 못했습니다' : ''}</span>
    </>
  );
}
