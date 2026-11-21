import 'server-only';
import {catalogSnapshot, compileBlueprint, listCatalog} from '@winterholic/design-system-static-kit/service';
import {resetDocument, setAppearance} from '@winterholic/design-system-static-kit/edit';
import {formatDesignId, resetArgs, type DesignRef} from './id';

// Explore 가 보여 주는 "대표 디자인" 목록과 그 Blueprint·HTML 을 만드는 서버 전용 모듈.
// Blueprint 는 직접 만들지 않고 ./edit 의 resetDocument·setAppearance 로만 만든다(Studio 와 같은 경로).

/** 템플릿마다 기본 디자인 하나에, 컨셉 look 에서 고른 테마 조합을 최대 이만큼 더한다. */
const THEMED_PER_TEMPLATE = 2;

export type Design = DesignRef & {
  id: string;
  label: string;
  pageType: string;
  pageTypeLabel: string;
  /** 문서가 실제로 쓰는 값(문서를 만든 뒤 읽는다). 템플릿 기본이면 ref 의 theme 은 비어 있다. */
  themeId: string;
  themeName: string;
  styleId: string;
  styleLabel: string;
  variantLabel: string | null;
  paletteId: string;
  paletteName: string;
  paletteColors: string[];
  resolvedMode: string;
  /** 이 조합을 고른 이유(컨셉 이름). 템플릿 기본이면 null */
  concept: string | null;
  /** 한 건의 슬롯·팔레트·모드 왕복 예시를 목록에서 알아볼 이름 */
  curationLabel: string | null;
};

type Rows = Record<string, any>[];
type Page = {ok: boolean; value: {items: Rows; nextCursor: string | null}};
/** listCatalog 는 한 번에 200개까지라서 팔레트(400여 개)는 cursor 를 따라 이어 받는다. */
const rows = (kind: string, fields: string[]): Rows => {
  const out: Rows = [];
  for (let cursor: string | undefined; ;) {
    const r = listCatalog({kind, fields, limit: 200, ...(cursor ? {cursor} : {})} as never) as Page;
    if (!r.ok) throw new Error(`listCatalog(${kind}) 실패`);
    out.push(...r.value.items);
    if (!r.value.nextCursor) return out;
    cursor = r.value.nextCursor;
  }
};

export function buildDocument(ref: DesignRef) {
  const made = resetDocument(null, resetArgs(ref) as never);
  if (!made.ok) return {ok: false as const, errors: made.errors};
  if (!ref.mode) return {ok: true as const, doc: made.doc};
  const moded = setAppearance(made.doc, {mode: ref.mode});
  return moded.ok ? {ok: true as const, doc: moded.doc} : {ok: false as const, errors: moded.errors};
}

/** 문서와 HTML. 실패하면 던진다(대표 목록은 모두 컴파일되는 것만 담는다: e2e 가 전체를 확인한다). */
export function renderDesign(ref: DesignRef) {
  const built = buildDocument(ref);
  if (!built.ok) throw new Error(`${formatDesignId(ref)}: ${built.errors[0]?.message}`);
  const compiled = compileBlueprint(built.doc, {include: ['html']}) as {ok: boolean; value?: {html: string}; errors?: {message: string}[]};
  if (!compiled.ok) throw new Error(`${formatDesignId(ref)}: ${compiled.errors?.[0]?.message}`);
  return {doc: built.doc, html: compiled.value!.html};
}

let cache: Design[] | null = null;

/**
 * 대표 디자인 목록(카탈로그 선언 순서). 템플릿 기본 + 컨셉(제품·SaaS, 카페 등)이 그 템플릿에 권하는 look 의 테마 조합.
 * 같은 템플릿에서 같은 (테마, 변형)은 한 번만 쓰고, 템플릿 기본과 같은 조합은 넣지 않는다.
 * 서체는 Studio 쿼리에 없으므로 look 의 서체는 쓰지 않는다(테마 변형까지만 따른다).
 */
export function curatedDesigns(): Design[] {
  if (cache) return cache;
  const snapshot = catalogSnapshot() as {themeCategories: Record<string, string>};
  const templates = rows('templates', ['id', 'label', 'pageType', 'theme']);
  const pageTypes = Object.fromEntries(rows('pageTypes', ['id', 'label']).map(p => [p.id, p.label]));
  const themes = Object.fromEntries(rows('themes', ['id', 'name', 'category', 'variants']).map(t => [t.id, t]));
  const palettes = Object.fromEntries(rows('palettes', ['id', 'name', 'colors', 'brand']).map(p => [p.id, p]));
  const concepts = rows('concepts', ['id', 'label', 'templates', 'looks']);

  const refs: {ref: DesignRef; concept: string | null; curationLabel: string | null}[] = [];
  for (const t of templates) {
    refs.push({ref: {template: t.id}, concept: null, curationLabel: null});
    const mine = concepts.filter(c => c.templates.includes(t.id));
    const taken = new Set<string>([`${t.theme}|`]);
    let added = 0;
    // 컨셉을 돌아가며 한 look 씩 고른다. 한 컨셉만 쓰면 비슷한 테마가 몰린다.
    for (let round = 0; added < THEMED_PER_TEMPLATE; round++) {
      let progressed = false;
      for (const c of mine) {
        const look = c.looks[round];
        if (!look) continue;
        progressed = true;
        const key = `${look.theme}|${look.themeVariant ?? ''}`;
        if (taken.has(key) || added >= THEMED_PER_TEMPLATE) continue;
        taken.add(key); added++;
        refs.push({ref: {template: t.id, theme: look.theme, ...(look.themeVariant ? {variant: look.themeVariant} : {})}, concept: c.label, curationLabel: null});
      }
      if (!progressed) break;
    }
    if (t.id === 'saas-landing') {
      // 전체 조합을 전개하지 않는다. Studio 왕복에서 지원 슬롯·다른 팔레트·모드가 함께 보이는 한 건만 고정한다.
      refs.push({
        ref: {template: 'saas-landing', palette: 'pearl', mode: 'dark', layout: {hero: 'product'}},
        concept: null,
        curationLabel: '복합 대표 디자인',
      });
    }
  }

  const byTemplate = Object.fromEntries(templates.map(t => [t.id, t]));
  cache = refs.map(({ref, concept, curationLabel}) => {
    const built = buildDocument(ref);
    if (!built.ok) throw new Error(`대표 디자인을 만들지 못했습니다: ${formatDesignId(ref)} ${built.errors[0]?.message}`);
    const doc = built.doc as {theme: string; palette: string; mode: string};
    const t = byTemplate[ref.template], theme = themes[doc.theme], palette = palettes[doc.palette];
    const variant = ref.variant ? theme.variants.find((v: {id: string}) => v.id === ref.variant) : null;
    return {
      ...ref,
      id: formatDesignId(ref),
      label: t.label,
      pageType: t.pageType,
      pageTypeLabel: pageTypes[t.pageType],
      themeId: doc.theme,
      themeName: theme.name,
      styleId: theme.category,
      styleLabel: snapshot.themeCategories[theme.category],
      variantLabel: variant?.label ?? null,
      paletteId: doc.palette,
      paletteName: palette.name,
      paletteColors: (palette.colors as string[]).slice(0, 9),
      resolvedMode: doc.mode,
      concept,
      curationLabel,
    };
  });
  return cache;
}

export const findDesign = (id: string): Design | undefined => curatedDesigns().find(d => d.id === id);
