'use client';

import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';
import {EMPTY_VIEW, type ComboIndex, type View} from './combos-state';
import styles from './combos.module.css';
import {flagIdentity, flagUrl, flagsToText, readFlags, toggleFlag as toggleFlagRecord, updateFlagNote} from './combos-flags.mjs';

type FlagRecord = {c: string; concept?: string|null; look?: string|null; theme?: string|null; tv?: string|null; pal?: string|null; type?: string|null; mode?: 'light'|'dark'|null; note?: string; at?: string};

const FLAG_KEY = 'winterholic-static-kit.combo-flags.v1';
const DEFAULT_SIZE = 48;

export function ComboExplorer({index}: {index: ComboIndex}) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [flags, setFlags] = useState<FlagRecord[]>([]);
  const viewerOpenedFromList = useRef(false);
  useEffect(() => { setFlags(readFlags(localStorage.getItem(FLAG_KEY)) as FlagRecord[]); }, []);
  useEffect(() => setQuery(params.get('q') ?? ''), [params]);

  const state = {
    q: params.get('q') ?? '', pt: params.get('pt') ?? '', t: params.get('t') ?? '', sort: params.get('sort') ?? 'default',
    page: Math.max(1, Number(params.get('p')) || 1), size: [24,48,96].includes(Number(params.get('ps'))) ? Number(params.get('ps')) : DEFAULT_SIZE,
    sl: params.get('sl') ?? '', same: params.get('same') === '1', flagged: params.get('flagged') === '1', exp: params.get('exp') === '1', rec: params.get('rec') === '1', tall: params.get('tall') === '1',
  };
  const view: View = {concept:params.get('concept'),look:params.get('look'),theme:params.get('theme'),tv:params.get('tv'),pal:params.get('pal'),mode:params.get('mode') === 'light'||params.get('mode') === 'dark' ? params.get('mode') as 'light'|'dark' : null,type:params.get('type')};
  const slots = Object.fromEntries(state.sl.split(',').filter(Boolean).map(s => s.split(':',2))) as Record<string,string>;
  const list = useMemo(() => {
    let rows = index.combos.filter(c => {
      const t = index.templates[c.t];
      if (state.pt && t?.pageType !== state.pt) return false;
      if (state.t && t?.id !== state.t) return false;
      if (state.q && !`${c.id} ${t?.label ?? ''} ${c.x ?? ''} ${c.r?.l ?? ''}`.toLocaleLowerCase().includes(state.q.toLocaleLowerCase())) return false;
      if (state.same && c.s) return false;
      if (state.flagged && !flags.some(flag => flag.c === c.id)) return false;
      if (!state.exp && c.exp) return false;
      if (state.rec && !c.r) return false;
      if (view.concept && c.r?.v?.concept !== view.concept) return false;
      return Object.entries(slots).every(([slot, option]) => option === 'default' ? !c.id.split('~').slice(1).some(part=>part.startsWith(`${slot}:`)) : c.id.includes(`~${slot}:${option}`));
    });
    if (state.sort === 'template') rows = [...rows].sort((a,b) => a.t-b.t || a.n-b.n);
    if (state.sort === 'changed') rows = [...rows].sort((a,b) => b.ch-a.ch || a.n-b.n);
    if (state.sort === 'shuffle') { const seed = Number(params.get('seed')) || 1; rows = [...rows].sort((a,b) => (((a.n*1103515245+seed)>>>0)-((b.n*1103515245+seed)>>>0))); }
    return rows;
  }, [index, state.q,state.pt,state.t,state.sort,state.same,state.flagged,state.exp,state.rec,slots,state.page,state.size,flags,params,view.concept]);
  const pages = Math.max(1,Math.ceil(list.length/state.size));
  const page = Math.min(state.page,pages);
  const shown = list.slice((page-1)*state.size,page*state.size);
  const update = (patch: Record<string,string|null>, push = false) => {
    const next = new URLSearchParams(params.toString());
    for (const [k,v] of Object.entries(patch)) v ? next.set(k,v) : next.delete(k);
    if (!('p' in patch) && ['q','pt','t','sl','sort','same','flagged','exp','rec','concept','look'].some(key => key in patch)) next.delete('p');
    const url = next.size ? `${pathname}?${next}` : pathname;
    (push ? router.push : router.replace)(url,{scroll:false});
  };
  const updateView = (patch: Partial<View>) => { const next = {...view,...patch}; update(Object.fromEntries(Object.entries({concept:next.concept,look:next.look,theme:next.theme,tv:next.tv,pal:next.pal,mode:next.mode,type:next.type}).map(([k,v])=>[k,v])) as Record<string,string|null>); };
  const selected = params.get('c');
  const selectedRow = selected ? index.combos.find(c => c.id === selected) : undefined;
  const renderParams = new URLSearchParams(); if (selectedRow) renderParams.set('c',selectedRow.id);
  for (const k of ['concept','look','theme','tv','pal','type','mode']) { const v=params.get(k); if(v) renderParams.set(k,v); }
  const frameUrl = `/dev/qa/combos/render?${renderParams}`;
  useEffect(() => { if (!selected) viewerOpenedFromList.current = false; }, [selected]);
  const closeViewer = () => {
    if (!selected) return;
    if (viewerOpenedFromList.current) { viewerOpenedFromList.current = false; history.back(); }
    else update({c:null});
  };
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeViewer(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected, params]);
  const persistFlags = (next: FlagRecord[]) => {
    setFlags(next);
    try { localStorage.setItem(FLAG_KEY,JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  };
  const hasFlag = (id: string, raw: Partial<View> = view) => flags.some(flag => flagIdentity(flag) === flagIdentity({c:id,...raw}));
  const toggleFlag = (id: string, raw: Partial<View> = view) => persistFlags(toggleFlagRecord(flags,id,raw) as FlagRecord[]);
  const saveNote = (index: number, note: string) => persistFlags(updateFlagNote(flags,index,note));
  const copyText = (text: string) => navigator.clipboard?.writeText(text);
  const openFlag = (flag: FlagRecord) => {
    viewerOpenedFromList.current = true;
    const next = new URLSearchParams(params.toString());
    next.set('c', flag.c);
    for (const key of ['concept','look','theme','tv','pal','type','mode'] as const) flag[key] ? next.set(key, flag[key]!) : next.delete(key);
    router.push(`${pathname}?${next}`,{scroll:false});
  };
  const downloadFlags = () => {
    const file = new Blob([flagsToText(flags, location.origin)],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(file), anchor = document.createElement('a');
    anchor.href=url; anchor.download='odd-combos.txt'; anchor.click(); URL.revokeObjectURL(url);
  };
  const setSlot = (id: string,value: string) => { const next = {...slots,[id]:value}; if(!value) delete next[id]; update({sl:Object.entries(next).map(([k,v])=>`${k}:${v}`).join(',')||null}); };

  return <div className={styles.page}>
    <header className={styles.head}><div><p className={styles.muted}>내부 QA · 카탈로그 {index.catalogVersion}</p><h1 className={styles.title}>전체 조합 탐색기</h1><p className={styles.muted}>템플릿과 구성 변형 {index.combos.length.toLocaleString()}개를 검색하고 비교합니다.</p></div><a className={styles.button} href="/dev/qa">QA 홈</a></header>
    <section className={styles.filters} aria-label="조합 필터">
      <label className={styles.field}>검색<input aria-label="조합 검색" value={query} onChange={e=>{setQuery(e.target.value);update({q:e.target.value||null});}} placeholder="이름, ID, 규칙" /></label>
      <label className={styles.field}>페이지 유형<select aria-label="페이지 유형" value={state.pt} onChange={e=>update({pt:e.target.value||null,t:null})}><option value="">전체</option>{index.pageTypes.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <label className={styles.field}>템플릿<select aria-label="템플릿" value={state.t} onChange={e=>update({t:e.target.value||null})}><option value="">전체</option>{index.templates.filter(t=>!state.pt||t.pageType===state.pt).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      {index.slots.map(s=><label key={s.id} className={styles.field}>{s.label}<select aria-label={`${s.label} 구성`} value={slots[s.id]??''} onChange={e=>setSlot(s.id,e.target.value)}><option value="">전체</option><option value="default">기본</option>{s.options.map(o=><option key={o.id} value={o.id}>{o.label} ({o.count})</option>)}</select></label>)}
      <label className={styles.field}>정렬<select aria-label="정렬" value={state.sort} onChange={e=>update({sort:e.target.value==='default'?null:e.target.value,seed:e.target.value==='shuffle'?(params.get('seed')??'1'):null})}><option value="default">기본</option><option value="template">템플릿</option><option value="changed">변형 개수</option><option value="shuffle">섞기</option></select></label>
      <label className={styles.field}>쪽 크기<select aria-label="쪽 크기" value={state.size} onChange={e=>update({ps:e.target.value==='48'?null:e.target.value})}><option>24</option><option>48</option><option>96</option></select></label>
      <div className={styles.checks}>{[['same','같은 화면 숨기기',state.same],['flagged','이상함 표시만',state.flagged],['tall','긴 화면',state.tall],['exp','실험 구성 포함',state.exp],['rec','레시피만',state.rec]].map(([key,label,on])=><label key={String(key)}><input type="checkbox" checked={Boolean(on)} onChange={e=>update({[String(key)]:e.target.checked?'1':null})}/>{String(label)}</label>)}</div>
    </section>
    <section className={styles.filters} aria-label="미리보기 보기 설정">
      <label className={styles.field}>컨셉<select aria-label="컨셉" value={view.concept??''} onChange={e=>updateView({concept:e.target.value||null,look:null})}><option value="">전체</option>{index.concepts.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <label className={styles.field}>컨셉 look<select aria-label="컨셉 look" value={view.look??''} disabled={!view.concept} onChange={e=>updateView({look:e.target.value||null})}><option value="">첫 번째 look</option>{index.concepts.find(x=>x.id===view.concept)?.looks.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <label className={styles.field}>테마<select aria-label="테마" value={view.theme??''} onChange={e=>updateView({theme:e.target.value||null,tv:null})}><option value="">템플릿 기본</option>{index.categories.map(({id,label})=><optgroup key={id} label={label}>{index.themes.filter(t=>t.category===id).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}</select></label>
      <label className={styles.field}>변형<select aria-label="테마 변형" value={view.tv??''} onChange={e=>updateView({tv:e.target.value||null})}><option value="">테마 기본</option>{index.themes.find(t=>t.id===view.theme)?.variants.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
      <label className={styles.field}>팔레트<select aria-label="팔레트" value={view.pal??''} onChange={e=>updateView({pal:e.target.value||null})}><option value="">기본</option>{index.palettes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className={styles.field}>서체<select aria-label="서체" value={view.type??''} onChange={e=>updateView({type:e.target.value||null})}><option value="">기본</option>{index.typography.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <label className={styles.field}>모드<select aria-label="모드" value={view.mode??''} onChange={e=>updateView({mode:(e.target.value||null) as View['mode']})}><option value="">기본</option><option value="light">라이트</option><option value="dark">다크</option></select></label>
    </section>
    <div className={styles.toolbar}><strong role="status">{list.length.toLocaleString()}개 · {page}/{pages}쪽</strong><button className={styles.button} onClick={()=>{setQuery('');router.replace(pathname,{scroll:false});}}>초기화</button></div>
    <section className={styles.flagPanel} aria-label="이상함 표시 기록"><div className={styles.flagHeader}><h2>이상함 표시 {flags.length}건</h2><button className={styles.button} onClick={()=>copyText(flagsToText(flags,location.origin))}>텍스트 복사</button><button className={styles.button} onClick={downloadFlags}>.txt 내보내기</button></div>{flags.length ? <ul className={styles.flagList}>{flags.map((flag,i)=><li key={`${flagIdentity(flag)}-${i}`}><div><strong>{flag.c}</strong><small>{['concept','look','theme','tv','pal','type','mode'].filter(k=>flag[k as keyof FlagRecord]).map(k=>`${k}: ${flag[k as keyof FlagRecord]}`).join(' · ') || '기본 보기'} · {flag.at || '시각 없음'}</small><label className={styles.note}>메모<textarea aria-label={`${flag.c} 메모`} value={flag.note??''} maxLength={200} onChange={e=>saveNote(i,e.target.value)} /></label></div><div className={styles.flagActions}><button className={styles.button} onClick={()=>openFlag(flag)}>기록 보기</button><button className={styles.button} onClick={()=>copyText(`${location.origin}${flagUrl(flag,pathname)}`)}>기록 링크 복사</button><button className={styles.button} onClick={()=>toggleFlag(flag.c,flag)}>삭제</button></div></li>)}</ul>:<p className={styles.muted}>아직 표시한 조합이 없습니다.</p>}</section>
    <ul className={`${styles.grid} ${state.tall?styles.tall:''}`}>{shown.map(c=>{const t=index.templates[c.t];const thumbQuery=new URLSearchParams({c:c.id});for(const k of ['concept','look','theme','tv','pal','type','mode']){const v=params.get(k);if(v)thumbQuery.set(k,v)}return <li key={c.id}><button className={styles.card} onClick={()=>{viewerOpenedFromList.current=true;update({c:c.id},true);}}><div className={styles.preview} aria-hidden="true"><iframe src={`/dev/qa/combos/render?${thumbQuery}`} title="" tabIndex={-1} loading="lazy" sandbox="allow-same-origin" /></div><strong>{t?.label??c.id}</strong><small>{c.id} · {c.ch}개 변경{c.r?` · ${c.r.l}`:''}</small></button><button className={styles.button} aria-label={`${c.id} 이상함 표시`} aria-pressed={hasFlag(c.id)} onClick={()=>toggleFlag(c.id)}>{hasFlag(c.id)?'표시됨':'이상함 표시'}</button></li>;})}</ul>
    <nav className={styles.pager} aria-label="쪽 이동"><button className={styles.button} disabled={page<=1} onClick={()=>update({p:String(page-1)})}>이전</button><span>{page} / {pages}</span><button className={styles.button} disabled={page>=pages} onClick={()=>update({p:String(page+1)})}>다음</button></nav>
    {selected && selectedRow ? <aside className={styles.viewer}><div className={styles.viewbar}><strong>{index.templates[selectedRow.t]?.label}</strong><button className={styles.button} onClick={closeViewer}>닫기</button><button className={styles.button} onClick={()=>toggleFlag(selected)}>{hasFlag(selected)?'표시 해제':'이상함 표시'}</button><button className={styles.button} onClick={()=>copyText(selected)}>ID 복사</button><button className={styles.button} onClick={()=>copyText(`${location.origin}${pathname}?${renderParams}`)}>공유 주소 복사</button><a className={styles.button} href={frameUrl} target="_blank" rel="noreferrer">전체 화면</a></div><div className={styles.diagnosis}><strong>{selectedRow.grade ? `진단 등급 ${selectedRow.grade}` : '진단 기록 없음'}</strong>{selectedRow.gradeReasons?.length ? <span>진단 사유: {selectedRow.gradeReasons.join(' · ')}</span> : null}{selectedRow.x ? <span>구성 규칙: {selectedRow.x}</span> : null}{selectedRow.exp ? <span>실험 구성: {selectedRow.grade && selectedRow.grade !== 'A' ? 'A 등급이 아님' : null}{selectedRow.x ? `${selectedRow.grade && selectedRow.grade !== 'A' ? ' · ' : ''}구성 변형 규칙 적용` : ''}</span> : null}</div><iframe className={styles.frame} src={frameUrl} title="조합 컴파일 결과" sandbox="allow-scripts" /></aside> : null}
  </div>;
}
